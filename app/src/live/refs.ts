/**
 * Runtime reference polylines, loaded from the SAME parity-anchored data the
 * headless QA suite replays against: app/tests/fixtures/refs.json. The three
 * medoid tracks (Morning/EveningA/EveningB) are built by
 * tests/build_fixtures.ts from medoid rides, verified against
 * core/PARITY.md at build time. Every other track (cycle 020's MorningB
 * onward) is a single-ride reference built by tests/build_track_ref.ts.
 * Importing refs.json directly — rather than keeping a copy under src/ —
 * means the phone and the test suite can never disagree about where a track
 * is. We READ that file only; tests/ stays QA-owned.
 *
 * Cycle 024 (WP-D2): TrackId widened to `string` (core/src/types.ts) so this
 * covers all 20 ratified catalog routes, not just the four legacy commute
 * tracks — engine.ts itself now sources its candidates from tracks.ts's
 * catalogTrackSpecs(), which calls refFor() for every catalog route.
 *
 * Size note: refs.json is ~600 KB of numbers (20 tracks); Metro bundles it
 * once. Fine.
 */
import refsJson from '../../tests/fixtures/refs.json';
import type { RefLine, TrackId } from '../../core/src/index.ts';

type RawRef = { rx: number[]; ry: number[]; ch: number[]; lat0: number; lon0: number };
const rawTracks = refsJson.tracks as unknown as Record<string, RawRef>;

/** Every track id known to refs.json — after WP-D1 this is exactly the
 * catalog's 20 ratified routes (every route.refLineId === route.id). Kept
 * for compatibility; nothing in the app sources candidates from this list
 * any more (that's tracks.ts's catalogTrackSpecs()). */
export const TRACK_IDS: readonly TrackId[] = Object.keys(rawTracks);

const cache = new Map<TrackId, RefLine>();

export function refFor(track: TrackId): RefLine {
  const hit = cache.get(track);
  if (hit) return hit;
  const r = rawTracks[track];
  if (!r) throw new Error(`refFor: unknown track "${track}"`);
  const ch = Float64Array.from(r.ch);
  const ref: RefLine = {
    rx: Float64Array.from(r.rx),
    ry: Float64Array.from(r.ry),
    ch,
    lat0: r.lat0,
    lon0: r.lon0,
    length: ch[ch.length - 1],
  };
  cache.set(track, ref);
  return ref;
}
