/**
 * QA — virgin-cycle14 brief 05: map credit wording. The pill became an "i"
 * button; the WORDING is a licence obligation and must not drift. Headless,
 * pure (mapCreditModel.ts has no RN import).
 */
import { assert, test } from './lib.ts';
import { creditFor, MAPLIBRE_CREDIT, PNG_CREDIT, CREDIT_AUTO_HIDE_MS } from '../src/ui/mapCreditModel.ts';

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

test('mapcredit: PNG-rung wording is byte-identical and still credits OpenStreetMap contributors', () => {
  const c = creditFor('png');
  assert(c.label === 'Esri, HERE, Garmin, © OpenStreetMap contributors', `label drifted: ${c.label}`);
  assert(c.label === PNG_CREDIT, 'creditFor("png").label must be PNG_CREDIT');
  assert(c.rows.some((r) => r.source === '© OpenStreetMap contributors' && r.role === 'data'), 'OSM data row missing');
  assert(c.rows.some((r) => r.source === 'Esri, HERE, Garmin' && r.role === 'imagery'), 'imagery row missing');
});

test('mapcredit: auto-hide is long enough to read three rows and short enough to self-heal on the bike', () => {
  assert(CREDIT_AUTO_HIDE_MS >= 5000 && CREDIT_AUTO_HIDE_MS <= 15000, `CREDIT_AUTO_HIDE_MS out of band: ${CREDIT_AUTO_HIDE_MS}`);
});
