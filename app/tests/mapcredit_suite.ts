/**
 * QA — virgin-cycle14 brief 05: map credit wording. The pill became an "i"
 * button; the WORDING is a licence obligation and must not drift. Headless,
 * pure (mapCreditModel.ts has no RN import).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import { creditFor, MAPLIBRE_CREDIT, CREDIT_AUTO_HIDE_MS } from '../src/ui/mapCreditModel.ts';

test('mapcredit: tile-rung wording is byte-identical to the pre-brief-05 credit line and names all three projects', () => {
  const c = creditFor('maplibre');
  assert(c.label === 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap', `label drifted: ${c.label}`);
  assert(c.label === MAPLIBRE_CREDIT, 'creditFor("maplibre").label must be MAPLIBRE_CREDIT');
  const sources = c.rows.map((r) => r.source);
  assert(sources.includes('OpenFreeMap'), 'OpenFreeMap row missing');
  assert(sources.includes('© OpenMapTiles'), 'OpenMapTiles row missing');
  assert(sources.includes('© OpenStreetMap contributors'), 'OSM contributors row missing');
  assert(c.rows.every((r) => r.role.length > 0), 'every row carries a role');
});

test('mapcredit: one rung only — the Esri/HERE/Garmin imagery credit went with the PNG rung (virgin-cycle22 05)', () => {
  const src = fs.readFileSync(path.join(TESTS_DIR, '..', 'src', 'ui', 'mapCreditModel.ts'), 'utf8');
  for (const gone of ['Esri', 'HERE', 'Garmin', 'PNG_CREDIT', "'png'"]) {
    assert(!src.includes(gone), `${gone} must be gone from mapCreditModel.ts: nothing displays that imagery any more`);
  }
  assert(src.includes("export type MapRung = 'maplibre';"), 'MapRung is the single tile rung');
});

test('mapcredit: auto-hide is long enough to read three rows and short enough to self-heal on the bike', () => {
  assert(CREDIT_AUTO_HIDE_MS >= 5000 && CREDIT_AUTO_HIDE_MS <= 15000, `CREDIT_AUTO_HIDE_MS out of band: ${CREDIT_AUTO_HIDE_MS}`);
});
