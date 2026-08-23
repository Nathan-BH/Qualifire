/**
 * The persistent per-ride results store (cycle 024, WP-A1 — B-28's other
 * half). One derived `RideResult` per REAL rideId, under the storage root,
 * sibling of `rides/`:
 *
 *   results/index.json        ResultsIndex (store/results.ts helpers; rebuildable)
 *   results/<rideId>.json     one RideResult, pretty-printed JSON + trailing \n
 *   results/unmatched.json    { schemaVersion, entries: [{ rideId, engineVersion }] }
 *
 * D-023 posture, same as storage/core.ts and lastRide.ts's old cache: every
 * read here is tolerant (a missing/corrupt file degrades to empty/rebuilt,
 * never throws) and every write is best-effort (a failed write is swallowed —
 * recording the ride is worth more than the sidecar). The raw `rides/*.jsonl`
 * is never read by anything in this module except backfillMissingResults,
 * and even there only ever READ, never rewritten.
 *
 * Two ways a result gets here:
 *  - the live path (lastRide.ts's rememberRide) calls saveResult() directly
 *    with a RideResult built from the engine's own already-locked state;
 *  - backfillMissingResults() derives one from raw JSONL for any ended ride
 *    that has neither a stored result nor an unmatched marker at the current
 *    BACKFILL_ENGINE_VERSION — the migration path for rides recorded before
 *    this store existed, and the recovery path for anything that failed to
 *    lock live.
 *
 * Backfill acceptance is quality AND corridor-coverage (see
 * MIN_CORRIDOR_COVERAGE below) — the brief's original "quality alone" rule was
 * measurably wrong; the amendment and its evidence are documented there.
 *
 * Candidate source for backfill: catalogTrackSpecs() (live/tracks.ts), the
 * SAME {id, ref, gates} triples the live engine locks candidates against —
 * not core/src/gates.ts's gateChainages()/PROPOSED_GATES, which cycle 024
 * (WP-D2) left covering only the four legacy commute tracks. catalogTrackSpecs()
 * already resolves every ratified catalog route (WP-D1) and defensively skips
 * anything unresolvable, so backfill automatically covers whatever the
 * catalog covers as routes are added — the forward-compat property this
 * module needs, through the mechanism that actually exists today.
 */
import catalogJson from './catalog.seed.json';
import { gateSetFor } from './catalog.ts';
import { deriveRideResult } from './derive.ts';
import { emptyResultsIndex, rebuildIndex, removeResult, upsertResult } from './results.ts';
import type { Catalog, ResultsIndex, RideResult } from './types.ts';
import { catalogTrackSpecs } from '../live/tracks.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeRideFile } from '../storage/jsonl.ts';
import { CORRIDOR_M, crossTime, projectRideOffline, toXY, type RefLine } from '../../core/src/index.ts';

const CATALOG = catalogJson as unknown as Catalog;

export const RESULTS_DIR = 'results';
export const RESULTS_INDEX_FILE = 'results/index.json';
export const UNMATCHED_FILE = 'results/unmatched.json';
/** Mirrors tests/build_seed.ts's ENGINE_VERSION — the same pipeline, same
 * label, so a seed-built result and a backfill-derived one are never treated
 * as coming from different engines when they did not. */
export const BACKFILL_ENGINE_VERSION = 'core-2026-08-15';

const UNMATCHED_SCHEMA_VERSION = 1;

interface UnmatchedEntry {
  rideId: string;
  engineVersion: string;
}

function isNonNullObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Structural guard for one stored result: every field every downstream
 * consumer (ghostsFor/ranks/sectorValues/tower) actually reads must be
 * present and of the right shape, or the entry is dropped. Moved here
 * verbatim from lastRide.ts's old isValidCachedResult (B-40). */
export function isValidRideResult(v: unknown): v is RideResult {
  if (!isNonNullObject(v)) return false;
  if (v.kind !== 'rideResult') return false;
  if (typeof v.rideId !== 'string') return false;
  if (typeof v.startedAtMs !== 'number' || !Number.isFinite(v.startedAtMs)) return false;
  if (!(v.routeId === null || typeof v.routeId === 'string')) return false;
  const lap = v.lap;
  if (!isNonNullObject(lap)) return false;
  if (typeof lap.rawS !== 'number') return false;
  if (!(lap.movingS === null || typeof lap.movingS === 'number')) return false;
  if (typeof lap.quality !== 'string') return false;
  if (!Array.isArray(v.sectors)) return false;
  for (const s of v.sectors) {
    if (!isNonNullObject(s) || typeof s.index !== 'number') return false;
  }
  return true;
}

function isValidUnmatchedEntry(v: unknown): v is UnmatchedEntry {
  return isNonNullObject(v) && typeof v.rideId === 'string' && typeof v.engineVersion === 'string';
}

// ---------------------------------------------------------------- module state

let armedFs: FsAdapter | null = null;
const store = new Map<string, RideResult>();
let index: ResultsIndex = emptyResultsIndex();
let unmatched: UnmatchedEntry[] = [];
/** Serializes every write against this module's files, last-write-wins,
 * mirroring lastRide.ts's old writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function encodeResult(r: RideResult): string {
  return JSON.stringify(r, null, 1) + '\n';
}

function encodeIndexFile(i: ResultsIndex): string {
  return JSON.stringify(i, null, 1) + '\n';
}

function encodeUnmatchedFile(entries: UnmatchedEntry[]): string {
  return JSON.stringify({ schemaVersion: UNMATCHED_SCHEMA_VERSION, entries }, null, 1) + '\n';
}

/** Enqueues a write behind whatever is already pending, swallows any fs
 * error (no-throw to callers — the sidecar is a convenience, D-023), and
 * resolves once THIS write has settled (so a direct `await saveResult(...)`
 * observes completion, while flushResultWrites() lets a fire-and-forget
 * caller — rememberRide, backfill's own no-throw wrapper — settle later). */
function enqueueWrite(fn: (fs: FsAdapter) => Promise<void>): Promise<void> {
  const fs = armedFs;
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fn(fs);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

// ---------------------------------------------------------------- init / read

/** Rehydrates the store from disk. Never throws: a missing or corrupt
 * results/index.json falls back to a directory scan; a corrupt individual
 * results/<rideId>.json is dropped while its siblings still load (D-023 —
 * the store is derived, a bad file degrades to absent, never fatal). Returns
 * the loaded results (ascending startedAtMs, same as storedResults()). */
export async function initResultsStore(fs: FsAdapter): Promise<RideResult[]> {
  armedFs = fs;
  store.clear();
  index = emptyResultsIndex();
  unmatched = [];

  try {
    const uText = await fs.readText(UNMATCHED_FILE);
    if (uText !== null) {
      const parsed = JSON.parse(uText) as unknown;
      if (isNonNullObject(parsed) && Array.isArray(parsed.entries)) {
        unmatched = parsed.entries.filter(isValidUnmatchedEntry);
      }
    }
  } catch { /* corrupt unmatched.json -> treat as empty (D-023) */ }

  let rideIds: string[] | null = null;
  try {
    const iText = await fs.readText(RESULTS_INDEX_FILE);
    if (iText !== null) {
      const parsed = JSON.parse(iText) as unknown;
      if (isNonNullObject(parsed) && Array.isArray(parsed.entries)) {
        rideIds = parsed.entries
          .map((e) => (isNonNullObject(e) && typeof e.rideId === 'string' ? e.rideId : null))
          .filter((id): id is string => id !== null);
      }
    }
  } catch { /* corrupt index.json -> fall through to a directory rebuild */ }

  // index.json was missing or unreadable — rebuild the rideId list by
  // scanning the directory (mirrors storage/core.ts's own rebuildIndex()
  // recovery path), and self-heal the file once the store is known.
  const neededDirScan = rideIds === null;
  if (neededDirScan) {
    try {
      const names = await fs.listDir(RESULTS_DIR);
      rideIds = names
        .filter((n) => n.endsWith('.json') && n !== 'index.json' && n !== 'unmatched.json')
        .map((n) => n.slice(0, -'.json'.length));
    } catch {
      rideIds = [];
    }
  }

  for (const rideId of rideIds ?? []) {
    try {
      const text = await fs.readText(`${RESULTS_DIR}/${rideId}.json`);
      if (text === null) continue;
      const parsed = JSON.parse(text) as unknown;
      if (!isValidRideResult(parsed)) continue;
      store.set(parsed.rideId, parsed);
    } catch { /* one corrupt result file must not take its siblings down */ }
  }

  // The index is always rebuildable from the results actually on disk — this
  // also self-heals a stale/corrupt index.json (D-023's own store_suite-wide
  // invariant: rebuildIndex(results) === the trusted index).
  index = rebuildIndex(storedResults());
  if (neededDirScan) {
    // Best-effort persist of the rebuilt index (mirrors storage/core.ts's
    // rebuildIndex()); never throws, never blocks the caller. Only when the
    // on-disk index actually needed repairing — a healthy boot does not
    // rewrite a file that was already correct.
    void enqueueWrite(async (f) => {
      await f.ensureDir(RESULTS_DIR);
      await f.writeText(RESULTS_INDEX_FILE, encodeIndexFile(index));
    });
  }

  return storedResults();
}

export function storedResults(): RideResult[] {
  return [...store.values()].sort((a, b) => a.startedAtMs - b.startedAtMs);
}

export function getStoredResult(rideId: string): RideResult | null {
  return store.get(rideId) ?? null;
}

// ---------------------------------------------------------------- write

/** Validates, writes results/<rideId>.json, upserts results/index.json, and
 * updates the in-memory map. No-throw to callers: an invalid RideResult is
 * silently skipped, and any fs failure is swallowed (recording the ride is
 * worth more than the sidecar surviving). */
export async function saveResult(r: RideResult): Promise<void> {
  if (!isValidRideResult(r)) return;
  store.set(r.rideId, r);
  index = upsertResult(index, r);
  const rideText = encodeResult(r);
  const indexText = encodeIndexFile(index);
  await enqueueWrite(async (fs) => {
    await fs.ensureDir(RESULTS_DIR);
    await fs.writeText(`${RESULTS_DIR}/${r.rideId}.json`, rideText);
    await fs.writeText(RESULTS_INDEX_FILE, indexText);
  });
}

/** Deletes a ride's stored result (file + index entry + memory). Called when
 * the raw ride itself is deleted (RidesScreen). Deleting an on-device derived
 * cache entry is allowed — the never-delete rule is for repo files. */
export async function removeStoredResult(rideId: string): Promise<void> {
  store.delete(rideId);
  index = removeResult(index, rideId);
  const indexText = encodeIndexFile(index);
  await enqueueWrite(async (fs) => {
    await fs.deleteFile(`${RESULTS_DIR}/${rideId}.json`);
    await fs.writeText(RESULTS_INDEX_FILE, indexText);
  });
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushResultWrites(): Promise<void> {
  return writeTail;
}

// ---------------------------------------------------------------- backfill

/** One candidate route's offline projection of the ride, computed once and
 * shared by the plausibility gate and the tie-break. */
interface Projected {
  s: Float64Array;
  xtd: Float64Array;
}

function projectAgainst(lat: number[], lon: number[], ref: RefLine): Projected {
  const { x, y } = toXY(lat, lon, ref.lat0, ref.lon0);
  return projectRideOffline(x, y, ref);
}

function meanAbsXtd(p: Projected): number {
  const { xtd } = p;
  if (xtd.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < xtd.length; i++) sum += Math.abs(xtd[i]);
  return sum / xtd.length;
}

/** Width of one chainage bin in the coverage measure. 100 m is well above the
 * archive's worst fix spacing on the bike (~13 m at 6.5 m/s with 2 s fixes),
 * so a genuine ride fills every bin, and well below the shortest catalog
 * route's gate span (WorkChurchA, 1657 m => 17 bins), so the measure still has
 * resolution on the short routes. */
export const COVERAGE_BIN_M = 100;

/**
 * Minimum fraction of a candidate's scored distance that must be corroborated
 * by fixes actually inside its corridor.
 *
 * WHY THIS EXISTS (WP-A1 acceptance-rule amendment, adversarial review
 * 2026-08-23). The brief pre-resolved backfill acceptance as "routeId non-null
 * AND lap quality clean|interrupted", on the premise that "core's off-corridor
 * exclusion already encodes whether the road was actually ridden". Measured
 * against the real archive, that premise is false, and the reason is a
 * LIVE/OFFLINE asymmetry, not a corridor-rule bug:
 *
 *  - projectRideOffline() re-acquires GLOBALLY and non-monotonically: after
 *    >=5 consecutive off-corridor fixes it jumps chainage to the nearest
 *    vertex anywhere on the line (projection.ts L109-118). LiveProjector does
 *    the same thing FORWARD-only and distance-bounded (live.ts D-016(a)).
 *  - crossTime() then reads that single-fix chainage jump as an upward
 *    crossing of EVERY gate it leapt over, all interpolated inside the same
 *    inter-fix interval (timing.ts L22-27). GateDetector, live, marks exactly
 *    this shape 'estimated' (EST_JUMP_M = 100 m, live.ts L157) and D-028 then
 *    keeps it out of every benchmark. Offline has no such marker — derive.ts
 *    never infers 'estimated' (documented, deliberate).
 *  - the sectors so manufactured span ~0 s, so sectorTimes()'s off-corridor
 *    scan finds no fix inside [tA,tB] to fail on, and flags them 'clean'.
 *
 * Measured on tests/fixtures/detour_eveningb.json (a real EveningB ride that
 * detoured): chainage jumps 0 -> 5112 m in one fix, four of EveningA's five
 * gates fire within 1.5 s of each other, and the ride is accepted as a CLEAN
 * 60.2 s lap on a 5,225 m route — 87 m/s. It would rank, and it would become
 * the all-time best on EveningA forever.
 *
 * WHY COVERAGE, AND NOT MEAN |xtd|. Mean |xtd| over the ride (the shape first
 * proposed) does not separate. Measured over a 125-ride sample of data/
 * activities/ (every 5th of 625 real GPX rides, 66 of which matched something):
 * a GENUINE Morning lap scores mean |xtd| 4164 m — the rider carried on for
 * miles after the finish gate — while the spurious EveningA match above scores
 * 1316 m. Any mean-|xtd| threshold that rejects the fake also rejects real
 * history. Coverage asks the question that actually matters — did the ride
 * TRAVEL this road? — and is immune to whatever the rider did before the start
 * gate or after the finish gate, because it only looks inside the lap window.
 *
 * THRESHOLD. Over that sample the matched candidates split into two
 * populations with NOTHING in between: 31 spurious jump-matches cover <= 0.393
 * of their gate span (the fake EveningA covers 0.075 — it only really rode the
 * last 440 m of shared road), and all 35 genuine laps cover >= 0.963 (1.000
 * unless a recording gap eats a bin or two). 0.5 sits inside that empty band
 * with margin on both sides, and reads plainly: MORE THAN HALF the distance
 * you are about to be timed over has to
 * be distance you were measurably on. It is deliberately the permissive
 * end of the band, because the two failure costs are not symmetric — a false
 * reject leaves the ride visibly unmatched and is retried whenever
 * BACKFILL_ENGINE_VERSION moves, while a false accept silently and permanently
 * poisons a route's PB.
 */
export const MIN_CORRIDOR_COVERAGE = 0.5;

/**
 * Fraction of [gates[0], gates[N]] covered by in-corridor fixes inside the
 * ride's own lap window. Bins the scored distance, marks each bin that holds
 * at least one fix whose |xtd| is inside the corridor and whose timestamp is
 * between the first and last gate crossing, and returns marked/total.
 *
 * A ride that genuinely rode the road marks every bin. A ride that only
 * touched the road for one stretch and had the rest handed to it by a
 * chainage jump marks only the stretch it actually rode.
 */
function corridorCoverage(
  t: ArrayLike<number>, p: Projected, gates: number[],
): number {
  const g0 = gates[0];
  const gN = gates[gates.length - 1];
  const span = gN - g0;
  if (!(span > 0)) return 0;
  const tA = crossTime(t, p.s, g0);
  const tB = crossTime(t, p.s, gN);
  // No lap at all — derive() will already have called this 'missed'; the gate
  // is a no-op here, but 0 keeps it honest if the caller order ever changes.
  if (tA === null || tB === null) return 0;
  const nBins = Math.max(1, Math.ceil(span / COVERAGE_BIN_M));
  const seen = new Uint8Array(nBins);
  for (let i = 0; i < t.length; i++) {
    const ti = t[i] as number;
    if (ti < tA || ti > tB) continue;
    if (Math.abs(p.xtd[i]) > CORRIDOR_M) continue;
    const bin = Math.floor((p.s[i] - g0) / COVERAGE_BIN_M);
    if (bin >= 0 && bin < nBins) seen[bin] = 1;
  }
  let hit = 0;
  for (let k = 0; k < nBins; k++) hit += seen[k];
  return hit / nBins;
}

async function appendUnmatched(rideId: string): Promise<void> {
  unmatched = [
    ...unmatched.filter((u) => !(u.rideId === rideId && u.engineVersion === BACKFILL_ENGINE_VERSION)),
    { rideId, engineVersion: BACKFILL_ENGINE_VERSION },
  ];
  const text = encodeUnmatchedFile(unmatched);
  await enqueueWrite(async (fs) => {
    await fs.ensureDir(RESULTS_DIR);
    await fs.writeText(UNMATCHED_FILE, text);
  });
}

/** Offline migration/recovery: derives a RideResult from raw JSONL for every
 * rideId that has neither a stored result nor an unmatched marker at
 * BACKFILL_ENGINE_VERSION. Sequential, awaited one at a time; never throws —
 * a single ride's failure (corrupt file, thrown adapter) is swallowed and the
 * loop moves on.
 *
 * Candidate loop (route matching). A candidate is accepted iff BOTH:
 *  (a) derive yields a non-null routeId with lap quality 'clean' or
 *      'interrupted' — the brief's original rule; and
 *  (b) corridorCoverage() >= MIN_CORRIDOR_COVERAGE — the ride actually
 *      travelled the road it is about to be timed over.
 * (b) is the 2026-08-23 amendment to the brief's pre-resolved rule: (a) alone
 * accepts jump-manufactured laps, measurably, on this repo's own archive. The
 * full root cause and the threshold's evidence are on MIN_CORRIDOR_COVERAGE.
 * Zero accepted -> unmatched marker. Two or more -> tie-break by smallest mean
 * |xtd| over the ride, computed only for the tied candidates. */
export async function backfillMissingResults(fs: FsAdapter, rideIds: string[]): Promise<void> {
  const specs = catalogTrackSpecs();
  for (const rideId of rideIds) {
    if (store.has(rideId)) continue;
    if (unmatched.some((u) => u.rideId === rideId && u.engineVersion === BACKFILL_ENGINE_VERSION)) continue;
    try {
      const text = await fs.readText(`rides/${rideId}.jsonl`);
      if (text === null) continue;
      const decoded = decodeRideFile(text);
      if (decoded.fixes.length < 2) continue; // nothing derivable; no marker (D-023: cheap to retry)

      const t = decoded.fixes.map((f) => f.tUnixMs / 1000); // epoch seconds (derive.ts convention)
      const lat = decoded.fixes.map((f) => f.lat);
      const lon = decoded.fixes.map((f) => f.lon);

      const accepted: { result: RideResult; proj: Projected }[] = [];
      for (const spec of specs) {
        const gateSetVersion = gateSetFor(CATALOG, spec.id)?.version ?? 1;
        const result = deriveRideResult({
          rideId,
          t, lat, lon,
          ref: spec.ref,
          gates: spec.gates,
          routeId: spec.id,
          gateSetVersion,
          engineVersion: BACKFILL_ENGINE_VERSION,
          source: 'app',
        });
        if (result.routeId === null) continue;
        if (result.lap.quality !== 'clean' && result.lap.quality !== 'interrupted') continue;
        // Only the quality-passing candidates pay for a projection — one per
        // accepted-so-far route, not one per catalog route per ride.
        const proj = projectAgainst(lat, lon, spec.ref);
        if (corridorCoverage(t, proj, spec.gates) < MIN_CORRIDOR_COVERAGE) continue;
        accepted.push({ result, proj });
      }

      if (accepted.length === 0) {
        await appendUnmatched(rideId);
      } else if (accepted.length === 1) {
        await saveResult(accepted[0].result);
      } else {
        let best = accepted[0];
        let bestXtd = meanAbsXtd(best.proj);
        for (let i = 1; i < accepted.length; i++) {
          const m = meanAbsXtd(accepted[i].proj);
          if (m < bestXtd) { best = accepted[i]; bestXtd = m; }
        }
        await saveResult(best.result);
      }
    } catch { /* one ride's failure must not stop the rest of the backfill */ }
  }
}

/** Test-only: clears all in-memory state and disarms persistence, mirroring
 * lastRide.ts's resetRecordedForTests. */
export function resetResultsStoreForTests(): void {
  armedFs = null;
  store.clear();
  index = emptyResultsIndex();
  unmatched = [];
  writeTail = Promise.resolve();
}
