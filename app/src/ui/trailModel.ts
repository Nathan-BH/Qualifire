/**
 * WP-J (breadcrumb trail, 2026-09-02): pure model for the rider's own ridden
 * line while recording — a min-distance-decimated buffer of the recorded GPS
 * fixes, turned into a GeoJSON LineString for the MapLibre rung. No
 * react-native, no maplibre imports — headless-testable, same discipline as
 * routeMapGeo.ts (which this module borrows metresBetween/GeoFeature/
 * GeoPosition/LineStringGeometry from).
 *
 * Rendering only — no data-model/storage change (D-023): the raw ride JSONL
 * stays the only record. `trail` lives as RecordScreen component state,
 * rebuilt from the live fix feed (and, on relaunch recovery, replayed from
 * the ride's own file — see RecordScreen.tsx).
 */
import { metresBetween, type GeoFeature, type GeoPosition, type LineStringGeometry } from './routeMapGeo.ts';

export interface TrailPoint { lat: number; lon: number }

/** [ASSUMPTION — tune on device]: the minimum distance between kept trail
 * vertices. core/src/geo.ts's resample/cumdist (arc-length on planar XY) are
 * built for pre-decimated reference lines (12-57 m spacing) — overkill for an
 * incremental live trail; a simple min-distance-between-kept-points rule is
 * the right shape here (WP-J §2.3). */
export const TRAIL_MIN_STEP_M = 5;
/** ~20 km of trail at the minimum step; oldest points are dropped first
 * (FIFO) once the cap is reached — otherwise every accepted fix would re-ship
 * the whole growing line across the bridge. */
export const TRAIL_MAX_POINTS = 4000;

/**
 * Appends (lat, lon) to `trail` iff it's at least `minStepM` from the last
 * kept point (the first point is always accepted). Returns the SAME array
 * reference when the fix is rejected, so callers using this inside
 * `setState` never trigger a re-render/useMemo churn for a fix that changed
 * nothing. Non-finite input is ignored (returns `trail` unchanged). At the
 * cap, the oldest point is dropped before the new one is pushed — order is
 * preserved, oldest-first.
 */
export function appendTrailPoint(
  trail: readonly TrailPoint[],
  lat: number,
  lon: number,
  minStepM: number = TRAIL_MIN_STEP_M,
  maxPoints: number = TRAIL_MAX_POINTS,
): readonly TrailPoint[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return trail;
  const last = trail.length > 0 ? trail[trail.length - 1] : null;
  if (last !== null && metresBetween(last.lat, last.lon, lat, lon) < minStepM) return trail;
  const next = trail.length >= maxPoints ? trail.slice(trail.length - maxPoints + 1) : trail.slice();
  next.push({ lat, lon });
  return next;
}

/**
 * The trail as a GeoJSON LineString ([lon,lat] per vertex, same swap
 * discipline as routeMapGeo.ts), with `tail` (the live fix) appended as the
 * final vertex when given and it differs from the last kept trail point —
 * so the drawn line always reaches exactly to the rider dot without waiting
 * for the next 5 m-decimated point. Null when fewer than 2 vertices would
 * result (nothing to draw a line with) — mirrors routeLineFeature's own
 * null rule.
 */
export function trailLineFeature(
  trail: readonly TrailPoint[],
  tail?: TrailPoint | null,
): GeoFeature<LineStringGeometry> | null {
  const coords: GeoPosition[] = trail.map((p) => [p.lon, p.lat] as GeoPosition);
  if (tail) {
    const last = trail.length > 0 ? trail[trail.length - 1] : null;
    if (last === null || last.lat !== tail.lat || last.lon !== tail.lon) {
      coords.push([tail.lon, tail.lat] as GeoPosition);
    }
  }
  if (coords.length < 2) return null;
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}
