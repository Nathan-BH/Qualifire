/**
 * virgin-cycle29 02: the way card's line layers as plain style-spec objects. Pure (no react, no native).
 * wayMapView.tsx mounts these same objects as <M.Layer>s; cardSnapshotModel.ts appends
 * cardLayerSpecs() to a basemap style so the headless snapshotter draws the identical stack.
 * Bump SNAPSHOT_SCHEMA (cardSnapshotModel.ts) whenever a paint here changes.
 */
import { colors } from './theme.ts';
import { FAINT_OPACITY } from './wayMapGeo.ts';

/** D-031 light-basemap palette — must match 08_build_route_assets.py. */
export const CASING = '#14120C';
export const ROUND_LINE = { 'line-join': 'round', 'line-cap': 'round' } as const;
export const ROUND_CAP = { 'line-cap': 'round' } as const;
export const FAINT_OPACITY_EXPR = ['case', ['has', 'faint'], FAINT_OPACITY, 1] as const;
// `as never` on the expression-bearing paints: same escape hatch as `mapStyle as never` in wayMapView.tsx (pure module, no MapLibre types). Shapes are pinned by cardsnapshot_suite / the inspector's byte diff.
export const ROUTE_CASING_PAINT = { 'line-color': CASING, 'line-width': 7, 'line-opacity': FAINT_OPACITY_EXPR } as never;
export const ROUTE_CORE_PAINT = { 'line-color': colors.neutral, 'line-width': 4, 'line-opacity': FAINT_OPACITY_EXPR } as never;
export const TRAIL_CASING_PAINT = { 'line-color': CASING, 'line-width': 7 } as const;
export const TRAIL_CORE_PAINT = { 'line-color': colors.neutral, 'line-width': 4 } as const;
export const SECTOR_SPANS_PAINT = {
  'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
  'line-width': 4,
  'line-opacity': FAINT_OPACITY_EXPR,
} as never;
export const GATE_TICKS_CASING_PAINT = { 'line-color': CASING, 'line-width': 5, 'line-opacity': FAINT_OPACITY_EXPR } as never;
export const GATE_TICKS_PAINT = {
  'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.white],
  'line-width': ['case', ['has', 'colour'], 3, 2],
  'line-opacity': FAINT_OPACITY_EXPR,
} as never;

export interface CardLayerSpec { id: string; type: 'line'; source: string; paint: object; layout: object }

/** The card's layer stack, in MOUNT order (= paint order), as style-spec layer objects. */
export function cardLayerSpecs(): CardLayerSpec[] {
  return [
    { id: 'route-casing', type: 'line', source: 'route', paint: ROUTE_CASING_PAINT, layout: ROUND_LINE },
    { id: 'route-core', type: 'line', source: 'route', paint: ROUTE_CORE_PAINT, layout: ROUND_LINE },
    { id: 'trail-casing', type: 'line', source: 'trail', paint: TRAIL_CASING_PAINT, layout: ROUND_LINE },
    { id: 'trail-core', type: 'line', source: 'trail', paint: TRAIL_CORE_PAINT, layout: ROUND_LINE },
    { id: 'sector-spans-core', type: 'line', source: 'sector-spans', paint: SECTOR_SPANS_PAINT, layout: ROUND_LINE },
    { id: 'gate-ticks-casing', type: 'line', source: 'gate-ticks', paint: GATE_TICKS_CASING_PAINT, layout: ROUND_CAP },
    { id: 'gate-ticks', type: 'line', source: 'gate-ticks', paint: GATE_TICKS_PAINT, layout: ROUND_CAP },
  ];
}
