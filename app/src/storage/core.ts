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
import type { Fix, IndexEntry, RideIndex, RideMeta } from './types.ts';
import { decodeRideFile, deriveMeta, encodeEnd, encodeFix, encodeHeader, healTornTail } from './jsonl.ts';
import { decodeIndex, emptyIndex, encodeIndex, removeEntry, upsertEntry } from './rideIndex.ts';
import { buildGpx } from './gpxExport.ts';

const RIDES_DIR = 'rides';
const INDEX_FILE = 'index.json';

export interface RideStorage {
  startRide(): Promise<string>;
  appendFix(rideId: string, fix: Fix): Promise<void>;
  endRide(rideId: string): Promise<RideMeta>;
  listRides(): Promise<RideMeta[]>;
  exportGpx(rideId: string): Promise<string>;
  /** Permanently removes a ride (file + index entry). Refuses while recording. */
  deleteRide(rideId: string): Promise<void>;
}

export interface StorageOptions {
  /** epoch ms clock; injectable for tests */
  now?: () => number;
  /** 4-char id suffix; injectable for tests */
  randomSuffix?: () => string;
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

export function createStorage(fs: FsAdapter, opts: StorageOptions = {}): RideStorage {
  const now = opts.now ?? (() => Date.now());
  const randomSuffix =
    opts.randomSuffix ??
    (() => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0'));

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
    async startRide() {
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
      await saveEntry({
        rideId,
        file: `${rideId}.jsonl`,
        startMs: meta.startMs,
        endMs: meta.endMs,
        nFixes: meta.nFixes,
        status: 'ended',
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

    async deleteRide(rideId) {
      if (live.has(rideId)) {
        throw new Error(`deleteRide: ride ${rideId} is still recording — stop it first`);
      }
      await fs.deleteFile(rideFile(rideId));
      const index = await loadIndex();
      await fs.writeText(INDEX_FILE, encodeIndex(removeEntry(index, rideId)));
      endedThisProcess.delete(rideId);
    },
  };
}
