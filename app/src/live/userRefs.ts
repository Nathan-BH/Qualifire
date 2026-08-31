/**
 * User-built reference lines (OPEN-ITEMS item 3, save-flow package, Part A).
 *
 * live/refs.ts reads a Metro-BUNDLED refs.json — read-only at runtime, so a
 * route born on the phone (retroactive way creation) can never get its
 * reference line there. This module is the runtime half: it builds a RefLine
 * from the reference ride's own recorded fixes (the EXACT single-ride recipe
 * tests/build_track_ref.ts uses: flag-filter -> stationary-run collapse ->
 * meanOrigin -> buildReference -> mm-round + recompute chainage), keeps an
 * in-memory registry, and persists to refs.user.json under the storage root
 * (sibling of catalog.user.json). refFor() (live/refs.ts) falls back to this
 * registry, bundled tracks winning any id collision — the same seed-wins rule
 * as store/catalog.ts's mergeCatalogs.
 *
 * Posture: user refs are DERIVED data — rebuildable in principle from
 * rides/<rideId>.jsonl + Route.referenceRideId, both kept forever. So reads
 * are tolerant (missing => nothing built yet; undecodable => warn, empty
 * registry, file untouched by init) and writes are best-effort and
 * serialized (catalogStore.ts's writeTail shape). saveUserRef never throws.
 *
 * Pure — no expo, no react-native, no bundled-JSON imports; the QA suite
 * runs this headless against createMemoryFsAdapter.
 */
import type { RefLine, RidePoints } from '../../core/src/index.ts';
import {
  buildReference, collapseStationaryRuns, cumdist, meanOrigin, nearestOnSegments,
} from '../../core/src/index.ts';
import { MIN_TRACK_LENGTH_M } from '../store/wayCreation.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const USER_REFS_FILE = 'refs.user.json';
export const USER_REFS_SCHEMA_VERSION = 1;

interface RawUserRef { rx: number[]; ry: number[]; ch: number[]; lat0: number; lon0: number }
interface UserRefsFile { schemaVersion: number; tracks: Record<string, RawUserRef> }

/** What buildRefFromRideFixes needs from a fix — matches storage FixRecord. */
export interface RefFixInput {
  lat: number;
  lon: number;
  ele?: number;
  tUnixMs: number;
  preStart?: boolean;
  warmup?: boolean;
}

export interface BuiltRideRef {
  ref: RefLine;
  /** Chainage (m on `ref`) of each >=20 s stationary run's centroid — the
   * reference ride's own stops. Part B's gate-snap input: with no OSM
   * traffic-signal source wired in, the rider's own observed stops are the
   * honest zero-network proxy for "a light or junction is probably here". */
  stopChainageM: number[];
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Build a route's reference line from its reference ride's raw fixes.
 * Returns null (build refused, caller proceeds without a ref) when fewer
 * than 2 usable fixes remain after flag-filtering, when the line has <2
 * vertices, or when its length is under MIN_TRACK_LENGTH_M — the same floor
 * as the naming offer itself.
 */
export function buildRefFromRideFixes(fixes: readonly RefFixInput[]): BuiltRideRef | null {
  const used = fixes.filter((f) => !f.preStart && !f.warmup);
  if (used.length < 2) return null;
  const ride: RidePoints = {
    name: '',
    t: Float64Array.from(used, (f) => f.tUnixMs / 1000),
    lat: Float64Array.from(used, (f) => f.lat),
    lon: Float64Array.from(used, (f) => f.lon),
    ele: Float64Array.from(used, (f) => f.ele ?? 0),
  };
  const collapsed = collapseStationaryRuns(ride);
  if (collapsed.ride.lat.length < 2) return null;
  const { lat0, lon0 } = meanOrigin([collapsed.ride]);
  const raw = buildReference(collapsed.ride, lat0, lon0);
  if (raw.rx.length < 2) return null;
  // Same rounding discipline as tests/build_track_ref.ts's roundRef(): rx/ry
  // to mm, chainage RECOMPUTED from the rounded coords then rounded to 1e-6 —
  // what is stored is exactly what replay uses.
  const rx = Float64Array.from(raw.rx, (v) => round(v, 3));
  const ry = Float64Array.from(raw.ry, (v) => round(v, 3));
  const ch = Float64Array.from(cumdist(rx, ry), (v) => round(v, 6));
  const length = ch[ch.length - 1];
  if (length < MIN_TRACK_LENGTH_M) return null;
  const ref: RefLine = { rx, ry, ch, lat0, lon0, length };
  const nseg = ch.length - 1;
  const clat = Math.cos((lat0 * Math.PI) / 180) * 111320;
  const stopChainageM = collapsed.runs.map((r) => {
    const px = (r.lon - lon0) * clat;
    const py = (r.lat - lat0) * 110540;
    return nearestOnSegments(px, py, ref, 0, nseg).s;
  });
  return { ref, stopChainageM };
}

let registry = new Map<string, RefLine>();
let armedFs: FsAdapter | null = null;
let writeTail: Promise<void> = Promise.resolve();

/** The user-built ref for a track id, or null. Synchronous — refFor's seam. */
export function userRefFor(id: string): RefLine | null {
  return registry.get(id) ?? null;
}

function decodeUserRefs(text: string): UserRefsFile | null {
  try {
    const f = JSON.parse(text) as UserRefsFile;
    if (!f || typeof f.tracks !== 'object' || f.tracks === null) return null;
    return f;
  } catch {
    return null;
  }
}

function toRefLine(r: RawUserRef): RefLine | null {
  if (!Array.isArray(r.rx) || !Array.isArray(r.ry) || !Array.isArray(r.ch)) return null;
  if (r.rx.length < 2 || r.rx.length !== r.ry.length || r.rx.length !== r.ch.length) return null;
  const ch = Float64Array.from(r.ch);
  return {
    rx: Float64Array.from(r.rx),
    ry: Float64Array.from(r.ry),
    ch,
    lat0: r.lat0,
    lon0: r.lon0,
    length: ch[ch.length - 1],
  };
}

function encodeRegistry(): string {
  const tracks: Record<string, RawUserRef> = {};
  for (const [id, ref] of registry) {
    tracks[id] = {
      rx: Array.from(ref.rx), ry: Array.from(ref.ry), ch: Array.from(ref.ch),
      lat0: ref.lat0, lon0: ref.lon0,
    };
  }
  return JSON.stringify({ schemaVersion: USER_REFS_SCHEMA_VERSION, tracks }) + '\n';
}

/** Loads refs.user.json into the registry. Never throws; a missing file is
 * "nothing built yet", an undecodable one is ignored for the session (warn)
 * and left untouched. Returns how many refs loaded. */
export async function initUserRefs(fs: FsAdapter): Promise<number> {
  armedFs = fs;
  registry = new Map();
  try {
    const text = await fs.readText(USER_REFS_FILE);
    if (text === null) return 0;
    const decoded = decodeUserRefs(text);
    if (decoded === null) {
      console.warn(`initUserRefs: ${USER_REFS_FILE} is not a refs file — ignored for this session`);
      return 0;
    }
    for (const [id, raw] of Object.entries(decoded.tracks)) {
      const ref = toRefLine(raw);
      if (ref) registry.set(id, ref);
    }
    return registry.size;
  } catch {
    return 0;
  }
}

/** Registers the ref in memory AT ONCE (refFor resolves it from this line
 * on), then best-effort persists the whole registry. Never throws; a failed
 * write degrades to "unresolvable again next boot" — today's behaviour. */
export function saveUserRef(id: string, ref: RefLine): Promise<void> {
  registry.set(id, ref);
  const fs = armedFs;
  const text = encodeRegistry();
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fs.writeText(USER_REFS_FILE, text);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushUserRefWrites(): Promise<void> {
  return writeTail;
}

/** Test-only: clears the registry and disarms persistence. */
export function resetUserRefsForTests(): void {
  registry = new Map();
  armedFs = null;
  writeTail = Promise.resolve();
}
