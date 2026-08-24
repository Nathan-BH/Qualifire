/** Storage engine. Pure — no expo, no Node imports; all I/O via FsAdapter.
 *
 * Layout under the storage root:
 *   rides/<rideId>.jsonl   — append-only raw trace (header, fixes, end)
 *   index.json             — rebuildable listing cache
 *
 * The JSONL is the source of truth; endRide/listRides derive meta from the
 * fixes actually on disk, and the index is regenerated whenever it is missing
 * or unreadable.
 */
import type { FsAdapter } from './fsAdapter.ts';
import type { Fix, IndexEntry, RideEvent, RideIndex, RideMeta } from './types.ts';
import { decodeRideFile, deriveMeta, encodeEnd, encodeFix, encodeHeader, healTornTail } from './jsonl.ts';
import { decodeIndex, emptyIndex, encodeIndex, removeEntry, upsertEntry } from './rideIndex.ts';
import { buildGpx } from './gpxExport.ts';
import { encodeEvent, decodeEventsFile } from './eventsJsonl.ts';
import { buildGpxPlus, type RefLookup } from './gpxPlusExport.ts';

const RIDES_DIR = 'rides';
const INDEX_FILE = 'index.json';

export interface RideStorage {
  /** WP-B fix B2: `mode` (default 'route' when omitted) is recorded on the
   * index entry so a completed free ride never gets silently backfilled as a
   * route result on a later boot (D-025) — see lastRide.ts's initRideHistory
   * and RidesScreen.tsx's mirrored filter. */
  startRide(mode?: 'route' | 'free'): Promise<string>;
  appendFix(rideId: string, fix: Fix): Promise<void>;
  endRide(rideId: string): Promise<RideMeta>;
  listRides(): Promise<RideMeta[]>;
  exportGpx(rideId: string): Promise<string>;
  /** Appends one diagnostics event to the ride's sidecar (rides/<rideId>.events.jsonl).
   * The raw ride file is untouched (D-023). Never required for a ride to be valid. */
  appendEvent(rideId: string, ev: RideEvent): Promise<void>;
  /** GPX 1.1 + <extensions> diagnostics (GPX+). Standard exportGpx stays byte-identical. */
  exportGpxPlus(rideId: string): Promise<string>;
  /** Permanently removes a ride (file + index entry). Refuses while recording. */
  deleteRide(rideId: string): Promise<void>;
}

export interface StorageOptions {
  /** epoch ms clock; injectable for tests */
  now?: () => number;
  /** 4-char id suffix; injectable for tests */
  randomSuffix?: () => string;
  /** WP-G Part 4: reference-polyline lookup for GPX+ routeFidelity. Injected
   * (never statically imported here) because the real one (live/refs.ts)
   * pulls in a bare JSON import Node's ESM loader can't handle without a
   * loader hook — see gpxPlusExport.ts's RefLookup doc comment. Omitted (as
   * every test but the routeFidelity-specific ones does) => that block is
   * simply never emitted; storage/index.ts supplies the real one on-device. */
  refFor?: RefLookup;
}

function pad(n: number, w: number): string {
  return String(n).padStart(w, '0');
}

/** Human-sortable, local-time rideId: YYYYMMDD-HHMMSS-xxxx */
function makeRideId(startedAtMs: number, suffix: string): string {
  const d = new Date(startedAtMs);
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}` +
    `-${pad(d.getHours(), 2)}${pad(d.getMinutes(), 2)}${pad(d.getSeconds(), 2)}` +
    `-${suffix}`
  );
}

function rideFile(rideId: string): string {
  return `${RIDES_DIR}/${rideId}.jsonl`;
}

function eventsFile(rideId: string): string {
  return `${RIDES_DIR}/${rideId}.events.jsonl`;
}

export function createStorage(fs: FsAdapter, opts: StorageOptions = {}): RideStorage {
  const now = opts.now ?? (() => Date.now());
  const randomSuffix =
    opts.randomSuffix ??
    (() => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0'));
  const refFor = opts.refFor;

  /** fast-path memory of rides seen live this process; disk stays authoritative */
  const live = new Set<string>();
  const endedThisProcess = new Set<string>();
  /** F-2: per-ride append chain. appendFix calls can arrive CONCURRENTLY (a
   * burst of queued location events after a mid-ride JS relaunch invokes the
   * background task once per event, without waiting for the previous call).
   * Unserialized, every call takes the slow `!live.has` read-back branch below
   * and the appends land in promise-resolution order, not call order — the
   * real ride 20260815-0024 got a 17-line scrambled block exactly this way.
   * Chaining guarantees file order == call order; the JSONL format itself is
   * untouched (D-023). */
  const appendTail = new Map<string, Promise<void>>();
  /** Same F-2 serialization discipline for the events sidecar, plus the
   * torn-tail-healed "have we seen this ride's sidecar live yet" memory. */
  const eventsTail = new Map<string, Promise<void>>();
  const eventsLive = new Set<string>();

  async function loadIndex(): Promise<RideIndex> {
    const text = await fs.readText(INDEX_FILE);
    if (text !== null) {
      const decoded = decodeIndex(text);
      if (decoded !== null) return decoded;
    }
    return rebuildIndex();
  }

  /** Rebuilds index.json by scanning ride files — recovery path for a lost/corrupt index. */
  async function rebuildIndex(): Promise<RideIndex> {
    let index = emptyIndex();
    for (const name of await fs.listDir(RIDES_DIR)) {
      if (!name.endsWith('.jsonl')) continue;
      if (name.endsWith('.events.jsonl')) continue;
      const rideId = name.slice(0, -'.jsonl'.length);
      const text = await fs.readText(`${RIDES_DIR}/${name}`);
      if (text === null) continue;
      const decoded = decodeRideFile(text);
      const meta = deriveMeta(decoded, rideId);
      index = upsertEntry(index, {
        rideId: meta.rideId,
        file: name,
        startMs: meta.startMs,
        endMs: decoded.end !== null ? meta.endMs : null,
        nFixes: meta.nFixes,
        status: decoded.end !== null ? 'ended' : 'recording',
      });
    }
    await fs.writeText(INDEX_FILE, encodeIndex(index));
    return index;
  }

  async function saveEntry(entry: IndexEntry): Promise<void> {
    const index = await loadIndex();
    await fs.writeText(INDEX_FILE, encodeIndex(upsertEntry(index, entry)));
  }

  return {
    async startRide(mode) {
      await fs.ensureDir(RIDES_DIR);
      const startedAtMs = now();
      const rideId = makeRideId(startedAtMs, randomSuffix());
      await fs.writeText(rideFile(rideId), encodeHeader(rideId, startedAtMs));
      await saveEntry({
        rideId,
        file: `${rideId}.jsonl`,
        startMs: startedAtMs,
        endMs: null,
        nFixes: 0,
        status: 'recording',
        mode,
      });
      live.add(rideId);
      return rideId;
    },

    async appendFix(rideId, fix) {
      const doAppend = async (): Promise<void> => {
        if (endedThisProcess.has(rideId)) {
          throw new Error(`appendFix: ride ${rideId} already ended`);
        }
        if (!live.has(rideId)) {
          const text = await fs.readText(rideFile(rideId));
          if (text === null) {
            throw new Error(`appendFix: unknown ride ${rideId}`);
          }
          // F-1: a mid-write kill leaves a torn tail with no trailing '\n'. Heal it
          // before resuming appends so the new record starts its own line instead
          // of gluing onto the fragment (which lost the first post-crash record).
          const heal = healTornTail(text);
          if (heal !== '') await fs.appendText(rideFile(rideId), heal);
          live.add(rideId);
        }
        if (
          !Number.isFinite(fix.lat) ||
          !Number.isFinite(fix.lon) ||
          !Number.isFinite(fix.tUnixMs)
        ) {
          throw new Error(`appendFix: non-finite lat/lon/tUnixMs for ride ${rideId}`);
        }
        // One line per fix, flushed immediately: a kill loses at most this line.
        await fs.appendText(rideFile(rideId), encodeFix(fix));
      };
      // F-2 serializer: run strictly after the previous append for this ride.
      // A rejected link must not poison the chain (the caller still sees it).
      const prev = appendTail.get(rideId) ?? Promise.resolve();
      const run = prev.then(doAppend, doAppend);
      appendTail.set(
        rideId,
        run.catch(() => {}),
      );
      return run;
    },

    async endRide(rideId) {
      // Drain any in-flight appends first so the end record lands last (F-2).
      await (appendTail.get(rideId) ?? Promise.resolve());
      appendTail.delete(rideId);
      const text = await fs.readText(rideFile(rideId));
      if (text === null) throw new Error(`endRide: unknown ride ${rideId}`);
      const decoded = decodeRideFile(text);
      const meta = deriveMeta(decoded, rideId);
      if (decoded.end === null) {
        // healTornTail: isolate any torn tail (F-1) so the end record parses.
        await fs.appendText(rideFile(rideId), healTornTail(text) + encodeEnd(now(), meta.nFixes));
      } // else: idempotent — already ended (e.g. app restarted), report honestly
      // WP-B fix B2: this re-save fully reconstructs the entry, so the mode
      // set at startRide time must be carried forward explicitly here or it
      // silently drops on every ended ride (mode is not derivable from the
      // raw JSONL alone — D-023 — so it must come from the existing entry).
      const existingMode = (await loadIndex()).rides.find((r) => r.rideId === rideId)?.mode;
      await saveEntry({
        rideId,
        file: `${rideId}.jsonl`,
        startMs: meta.startMs,
        endMs: meta.endMs,
        nFixes: meta.nFixes,
        status: 'ended',
        mode: existingMode,
      });
      live.delete(rideId);
      endedThisProcess.add(rideId);
      return meta;
    },

    async listRides() {
      const index = await loadIndex();
      const out: RideMeta[] = [];
      for (const entry of index.rides) {
        if (entry.status === 'ended' && entry.endMs !== null) {
          out.push({
            rideId: entry.rideId,
            startMs: entry.startMs,
            endMs: entry.endMs,
            nFixes: entry.nFixes,
          });
        } else {
          // recording or crashed mid-ride: derive honest numbers from the file
          const text = await fs.readText(`${RIDES_DIR}/${entry.file}`);
          if (text === null) continue;
          out.push(deriveMeta(decodeRideFile(text), entry.rideId));
        }
      }
      out.sort((a, b) => a.startMs - b.startMs || (a.rideId < b.rideId ? -1 : 1));
      return out;
    },

    async exportGpx(rideId) {
      const text = await fs.readText(rideFile(rideId));
      if (text === null) throw new Error(`exportGpx: unknown ride ${rideId}`);
      return buildGpx(decodeRideFile(text), rideId);
    },

    async appendEvent(rideId, ev) {
      const doAppend = async (): Promise<void> => {
        if (!Number.isFinite(ev.tUnixMs)) {
          throw new Error(`appendEvent: non-finite tUnixMs for ride ${rideId}`);
        }
        if (!eventsLive.has(rideId)) {
          const text = await fs.readText(eventsFile(rideId));
          // F-1-style healing for the sidecar: isolate a torn tail onto its
          // own line before resuming appends (mirrors the ride file's
          // healTornTail discipline). The file may not exist yet — that's
          // fine, appendText creates it per the FsAdapter contract.
          const heal = healTornTail(text);
          if (heal !== '') await fs.appendText(eventsFile(rideId), heal);
          eventsLive.add(rideId);
        }
        await fs.appendText(eventsFile(rideId), encodeEvent(ev));
      };
      // Same F-2 serializer as appendFix: no ride-existence check and no
      // ended-ride check — diagnostics writes must never be refused (an
      // 'end' button event legitimately arrives around endRide time).
      const prev = eventsTail.get(rideId) ?? Promise.resolve();
      const run = prev.then(doAppend, doAppend);
      eventsTail.set(
        rideId,
        run.catch(() => {}),
      );
      return run;
    },

    async exportGpxPlus(rideId) {
      const text = await fs.readText(rideFile(rideId));
      if (text === null) throw new Error(`exportGpxPlus: unknown ride ${rideId}`);
      const evText = await fs.readText(eventsFile(rideId));
      return buildGpxPlus(
        decodeRideFile(text),
        evText === null ? null : decodeEventsFile(evText),
        rideId,
        refFor,
      );
    },

    async deleteRide(rideId) {
      if (live.has(rideId)) {
        throw new Error(`deleteRide: ride ${rideId} is still recording — stop it first`);
      }
      await fs.deleteFile(rideFile(rideId));
      await fs.deleteFile(eventsFile(rideId));
      const index = await loadIndex();
      await fs.writeText(INDEX_FILE, encodeIndex(removeEntry(index, rideId)));
      endedThisProcess.delete(rideId);
      eventsLive.delete(rideId);
      eventsTail.delete(rideId);
    },
  };
}
