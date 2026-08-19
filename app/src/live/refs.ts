/**
 * Runtime reference polylines for the four tracks (Morning / EveningA /
 * EveningB / MorningB), loaded from the SAME parity-anchored data the
 * headless QA suite replays against: app/tests/fixtures/refs.json. Three of
 * the four (Morning/EveningA/EveningB) are built by tests/build_fixtures.ts
 * from medoid rides, verified against core/PARITY.md at build time.
 * MorningB's ref is a single-ride reference built by
 * tests/build_track_ref.ts (cycle 020, Nathan 2026-08-19: route 5 reversed —
 * the archive has no repeated-ride variant for it). Importing refs.json
 * directly — rather than keeping a copy under src/ — means the phone and the
 * test suite can never disagree about where the track is. We READ that file
 * only; tests/ stays QA-owned.
 *
 * Size note: refs.json is ~100 KB of numbers; Metro bundles it once. Fine.
 */
import refsJson from '../../tests/fixtures/refs.json';
import type { RefLine, TrackId } from '../../core/src/index.ts';

export const TRACK_IDS: readonly TrackId[] = ['Morning', 'EveningA', 'EveningB', 'MorningB'];

const cache = new Map<TrackId, RefLine>();

export function refFor(track: TrackId): RefLine {
  const hit = cache.get(track);
  if (hit) return hit;
  const r = refsJson.tracks[track];
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
