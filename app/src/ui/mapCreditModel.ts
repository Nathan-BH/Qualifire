/**
 * Map attribution strings — the ONE place the credit wording lives.
 * virgin-cycle14 brief 05 (Nathan #8): the always-visible credit pill on
 * every map became a corner "i" button (wayMapView.tsx `Credit`); the
 * wording itself is a licence obligation (OpenStreetMap / OpenMapTiles /
 * OpenFreeMap on the tile rung — the PNG rung and its satellite-imagery credit were
 * retired in virgin-cycle22 05)
 * and must never be shortened or dropped. Pure and RN-free so
 * tests/mapcredit_suite.ts can lock it headless.
 */
export type MapRung = 'maplibre';
export type CreditRow = { source: string; role: string };
export type MapCredit = { label: string; rows: readonly CreditRow[] };

/** Tile rung: OpenFreeMap tiles, OpenMapTiles schema, OSM data. */
export const MAPLIBRE_CREDIT = 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap';

/** How long the opened credit card stays up before hiding itself. */
export const CREDIT_AUTO_HIDE_MS = 8000;

const CREDITS: Record<MapRung, MapCredit> = {
  maplibre: {
    label: MAPLIBRE_CREDIT,
    rows: [
      { source: 'OpenFreeMap', role: 'tiles' },
      { source: '© OpenMapTiles', role: 'schema' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ],
  },
};

export function creditFor(rung: MapRung): MapCredit {
  return CREDITS[rung];
}
