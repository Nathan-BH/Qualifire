/**
 * The ride the Result tab shows (cycle 008).
 *
 * Deliberately tiny and in-memory: STOP hands the finished live state here, the
 * Result tab reads it. It is DISPLAY state, not a record — the raw JSONL on
 * disk remains the only truth (D-023), and a proper Result screen will one day
 * read a RideResult derived from that file rather than this hand-off.
 *
 * Until a ride finishes in this session, `get()` returns null and Result falls
 * back to showing a ghost, clearly labelled as such. Never invent a lap.
 */
import type { LiveEngineState } from '../live/engine.ts';
import type { RideResult } from '../store/types.ts';
import { RESULT_SCHEMA_VERSION } from '../store/types.ts';

export interface FinishedRide {
  routeId: string;
  atMs: number;
  lapMovingS: number | null;
  lapRawS: number | null;
  estimated: boolean;
  sectors: { index: number; movingS: number | null; rawS: number; quality: string }[];
}

let last: FinishedRide | null = null;
const recorded: RideResult[] = [];

/** Rides finished in THIS session, shaped as store results so the colour
 * window can include them (cycle 009: the window used to be frozen). Still
 * memory-only — the raw JSONL on disk remains the record (D-023). */
export function recordedResults(): RideResult[] {
  return recorded;
}

export function rememberRide(st: LiveEngineState): void {
  // An aborted ride must CLEAR the previous one, never leave a stale board
  // captioned "the ride you just finished" (cycle 009).
  if (st.track === null || st.lap === null) {
    last = null;
    return;
  }
  last = {
    routeId: st.track,
    atMs: Date.now(),
    lapMovingS: st.lap.movingS,
    lapRawS: st.lap.rawS,
    estimated: st.lap.estimated,
    sectors: st.sectors.map((s, i) => {
      if (s.kind !== 'done') {
        return { index: i + 1, movingS: null, rawS: 0, quality: 'missed' };
      }
      return {
        index: i + 1,
        movingS: s.estimated ? null : (s.movingS ?? null),
        rawS: s.rawS,
        quality: s.estimated ? 'estimated' : s.interrupted ? 'interrupted' : 'clean',
      };
    }),
  };
  pushRecorded(last);
}

export function getLastRide(): FinishedRide | null {
  return last;
}

/** Push the finished ride into the comparison window. Only a lap with a real
 * moving time joins: an estimated or gate-missing ride is not a benchmark. */
function pushRecorded(f: FinishedRide): void {
  if (f.estimated || f.lapMovingS === null) return;
  recorded.push({
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId: `session:${f.atMs}`,
    startedAtMs: f.atMs,
    routeId: f.routeId,
    source: 'app',
    lap: { rawS: f.lapRawS ?? f.lapMovingS, movingS: f.lapMovingS, quality: 'clean' },
    sectors: f.sectors.map((s) => ({
      index: s.index,
      fromChainageM: 0,
      toChainageM: 0,
      rawS: s.rawS,
      movingS: s.movingS,
      quality: (s.quality === 'clean' || s.quality === 'interrupted'
        ? s.quality
        : s.quality === 'estimated' ? 'estimated' : 'missed'),
    })),
    derivedBy: { engineVersion: 'live', gateSetVersion: 1, resultSchemaVersion: RESULT_SCHEMA_VERSION },
  });
}

export function clearLastRide(): void {
  last = null;
}

/** Test-only: empties `recorded` and clears `last` so the headless suite can
 * start each case from a clean slate without leaking state between tests. */
export function resetRecordedForTests(): void {
  recorded.length = 0;
  last = null;
}
