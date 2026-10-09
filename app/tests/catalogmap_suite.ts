/** virgin-cycle24 brief 03: the MAP tab's pure model (src/ui/catalogMapModel.ts)
 * plus a few source pins on the wiring. The model's import chain is JSON-free,
 * so no loader hook is needed (same as waymapgeo_suite.ts). */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import { emptyCatalog } from '../src/store/catalog.ts';
import type { Catalog, Landmark, Route, Way } from '../src/store/types.ts';
import { metresBetween, nearestOnPath, placeBounds, type LonLatBoundsBox } from '../src/ui/wayMapGeo.ts';
import {
  boundsOfPoints, differingStretches, overviewModel, pairKey, placeFocusModel, routeFocusModel, usualWayId,
  type CatalogMapDeps, type LatLon,
} from '../src/ui/catalogMapModel.ts';

const lm = (id: string, label: string, lat: number, lon: number): Landmark => ({
  id, label, lat, lon, radiusM: 100, activeFromMs: 0, activeUntilMs: null, offerAtStart: true,
});
const route = (id: string, a: string, b: string, wayIds: string[], loopDiscriminator?: string): Route => ({
  id, startLandmarkId: a, endLandmarkId: b, wayIds, ...(loopDiscriminator ? { loopDiscriminator } : {}),
});
const way = (id: string, routeId: string, specs?: string[]): Way => ({
  id, routeId, refLineId: `ref-${id}`, gateSetVersion: 1, seeded: false, ...(specs ? { specs } : {}),
});

const H = lm('H', 'Home', 50.88, 4.70);
const W = lm('W', 'Work', 50.90, 4.72);
const P = lm('P', 'Park', 50.87, 4.75);
const Q = lm('Q', 'Quiet', 51.00, 4.70);

function straight(a: Landmark, b: Landmark, n = 20): LatLon[] {
  const out: LatLon[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    out.push([a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f]);
  }
  return out;
}
const P1 = straight(H, W);
// w2 = w1 with a lateral bump (about 70 m perpendicular) on vertices 8-11
const P2: LatLon[] = P1.map(([la, lo], i) => (i >= 8 && i <= 11 ? [la + 0.0012, lo] as LatLon : [la, lo] as LatLon));
const P3: LatLon[] = [...P1].reverse();
const P5: LatLon[] = (() => {
  const out: LatLon[] = [];
  for (let i = 0; i < 10; i++) out.push([H.lat, H.lon + (i / 9) * 0.0043]);
  for (let i = 0; i < 10; i++) out.push([H.lat, H.lon + 0.0043 - (i / 9) * 0.0043]);
  return out;
})();

function fixture(over: { paths?: Record<string, LatLon[] | null>; rides?: Record<string, number> } = {}): CatalogMapDeps {
  const catalog: Catalog = {
    ...emptyCatalog(),
    landmarks: [H, W, P, Q],
    routes: [
      route('rHW', 'H', 'W', ['w1', 'w2']),
      route('rWH', 'W', 'H', ['w3']),
      route('rHP', 'H', 'P', ['w4']),
      route('rLoop', 'H', 'H', ['w5'], 'x'),
    ],
    ways: [way('w1', 'rHW', ['Dry']), way('w2', 'rHW'), way('w3', 'rWH'), way('w4', 'rHP'), way('w5', 'rLoop')],
  };
  const paths: Record<string, LatLon[] | null> = { w1: P1, w2: P2, w3: P3, w4: null, w5: P5, ...(over.paths ?? {}) };
  const rides: Record<string, number> = { w1: 3, w2: 5, w3: 1, w4: 0, w5: 2, ...(over.rides ?? {}) };
  return { catalog, pathFor: (id) => paths[id] ?? null, ridesFor: (id) => rides[id] ?? 0 };
}

const encloses = (b: LonLatBoundsBox | null, p: { lat: number; lon: number }): boolean =>
  b !== null && p.lon >= b.minLon && p.lon <= b.maxLon && p.lat >= b.minLat && p.lat <= b.maxLat;

test('catalogmap: usualWayId is the most-ridden way, ties go to wayIds order, no path needed', () => {
  const d = fixture();
  assert(usualWayId(d.catalog, 'rHW', d.ridesFor) === 'w2', 'most rides should win');
  const tie = fixture({ rides: { w1: 4, w2: 4 } });
  assert(usualWayId(tie.catalog, 'rHW', tie.ridesFor) === 'w1', 'a tie should go to the first way');
  assert(usualWayId(d.catalog, 'rHP', d.ridesFor) === 'w4', 'a way without a path is still the usual way');
  assert(usualWayId(d.catalog, 'nope', d.ridesFor) === null, 'unknown route should give null');
});

test('catalogmap: pairKey merges A to B with B to A, a loop is its own key', () => {
  const d = fixture();
  const r = (id: string) => d.catalog.routes.find((x) => x.id === id)!;
  assert(pairKey(r('rHW')) === pairKey(r('rWH')), 'H to W and W to H should share a key');
  assert(pairKey(r('rLoop')) === 'rLoop', 'a loop is keyed by its route id');
  assert(pairKey(r('rHP')) !== pairKey(r('rHW')), 'H to P is not H to W');
});

test('catalogmap: overview has every pin and one line per pair', () => {
  const o = overviewModel(fixture());
  assert(o.pins.map((p) => p.id).join() === 'H,W,P,Q', `pins: ${o.pins.map((p) => p.id).join()}`);
  assert(o.pins[0].label === 'Home', 'pin label');
  assert(o.lines.length === 2, `want 2 lines (pair + loop), got ${o.lines.length}`);
  const hw = o.lines.find((l) => l.key === pairKey(fixture().catalog.routes[0]))!;
  assert(hw.routeId === 'rHW' && hw.routeIds.join() === 'rHW,rWH', `ids: ${hw.routeId} ${hw.routeIds.join()}`);
  assert(hw.wayId === 'w2' && hw.placeIds.join() === 'H,W', `way/places: ${hw.wayId} ${hw.placeIds.join()}`);
  assert(hw.path === P2, 'the usual way path is drawn');
  const loop = o.lines.find((l) => l.routeId === 'rLoop');
  assert(loop !== undefined && loop.wayId === 'w5', 'the loop is drawn from w5');
  assert(!o.lines.some((l) => l.routeIds.includes('rHP')), 'no line for a route with no drawable path');
  for (const p of o.pins) assert(encloses(o.bounds, p), `bounds miss ${p.id}`);
});

test('catalogmap: overview falls back to the twin route when the primary has no path', () => {
  const d = fixture({ paths: { w1: null, w2: null } });
  const hw = overviewModel(d).lines.find((l) => l.routeIds.includes('rHW'))!;
  assert(hw.routeId === 'rHW' && hw.wayId === 'w3' && hw.path === P3, `fallback: ${hw.routeId} ${hw.wayId}`);
  const none = fixture({ paths: { w1: null, w2: null, w3: null } });
  assert(!overviewModel(none).lines.some((l) => l.routeIds.includes('rHW')), 'no line when neither direction is drawable');
});

test('catalogmap: overview of an empty or place-only catalog', () => {
  const empty: CatalogMapDeps = { catalog: emptyCatalog(), pathFor: () => null, ridesFor: () => 0 };
  const o = overviewModel(empty);
  assert(o.pins.length === 0 && o.lines.length === 0 && o.bounds === null, 'empty catalog should be bare');
  const one: CatalogMapDeps = { ...empty, catalog: { ...emptyCatalog(), landmarks: [H] } };
  const o1 = overviewModel(one);
  const pb = placeBounds(H.lat, H.lon, H.radiusM);
  assert(o1.pins.length === 1 && o1.lines.length === 0, 'one pin, no lines');
  assert(JSON.stringify(o1.bounds) === JSON.stringify(pb), 'a lone place fits placeBounds');
});

test('catalogmap: place focus lists routes out of, into and looping at the place', () => {
  const m = placeFocusModel('H', fixture())!;
  assert(m.neighbourIds.join() === 'W,P', `neighbours: ${m.neighbourIds.join()}`);
  assert(m.connectedRouteIds.join() === 'rHW,rWH,rHP,rLoop', `connected: ${m.connectedRouteIds.join()}`);
  assert(m.rows.map((r) => r.routeId).join() === 'rHW,rHP,rWH,rLoop', `rows: ${m.rows.map((r) => r.routeId).join()}`);
  assert(m.rows.map((r) => r.direction).join() === 'from,from,to,loop', 'directions');
  assert(m.rows[0].label === 'Home → Work', `label: ${m.rows[0].label}`);
  assert(m.rows[0].rides === 8 && m.rows[0].wayCount === 2, `rides/ways: ${m.rows[0].rides}/${m.rows[0].wayCount}`);
  for (const p of [H, W, P]) assert(encloses(m.bounds, p), `bounds miss ${p.id}`);
});

test('catalogmap: place focus on a place without routes, and on an unknown place', () => {
  const d = fixture();
  const q = placeFocusModel('Q', d)!;
  assert(q.rows.length === 0 && q.neighbourIds.length === 0 && q.connectedRouteIds.length === 0, 'Q has no routes');
  assert(JSON.stringify(q.bounds) === JSON.stringify(placeBounds(Q.lat, Q.lon, Q.radiusM)), 'Q fits placeBounds');
  assert(placeFocusModel('nope', d) === null, 'unknown place gives null');
});

test('catalogmap: route focus lists the usual way first and fits every drawn path', () => {
  const d = fixture();
  const m = routeFocusModel('rHW', d)!;
  assert(m.usualWayId === 'w2' && m.label === 'Home → Work', `usual/label: ${m.usualWayId} ${m.label}`);
  assert(m.ways.map((w) => w.wayId).join() === 'w2,w1', `order: ${m.ways.map((w) => w.wayId).join()}`);
  assert(m.ways[0].usual && !m.ways[1].usual, 'usual flag');
  assert(m.ways[1].label === 'Dry', `w1 label: ${m.ways[1].label}`);
  assert(typeof m.ways[0].label === 'string' && m.ways[0].label.length > 0, 'w2 label is non-empty');
  assert(m.ways[0].rides === 5 && m.ways[1].rides === 3, 'rides');
  for (const [la, lo] of [...P1, ...P2]) assert(encloses(m.bounds, { lat: la, lon: lo }), 'bounds miss a vertex');
});

test('catalogmap: route focus with no drawable way, and an unknown route', () => {
  const d = fixture();
  const m = routeFocusModel('rHP', d)!;
  assert(m.ways.length === 1 && m.ways[0].path === null && m.bounds === null, 'rHP has one undrawable way');
  assert(routeFocusModel('nope', d) === null, 'unknown route gives null');
});

test('catalogmap: differingStretches of identical geometry is nothing', () => {
  assert(differingStretches(P1, P1).length === 0, 'identical paths differ nowhere');
});

test('catalogmap: differingStretches returns the bump with one anchor vertex each side', () => {
  const s = differingStretches(P1, P2);
  assert(s.length === 1, `want 1 stretch, got ${s.length}`);
  const st = s[0];
  assert(st.length === 6, `bump of 4 plus 2 anchors, got ${st.length}`);
  const first = st[0], last = st[st.length - 1];
  assert((nearestOnPath(P1, first[0], first[1])?.distM ?? 999) <= 30, 'first vertex is on the base way');
  assert((nearestOnPath(P1, last[0], last[1])?.distM ?? 999) <= 30, 'last vertex is on the base way');
  assert(st.slice(1, 5).every((v, i) => v === P2[8 + i]), 'the four bumped vertices are inside');
});

test('catalogmap: differingStretches edge cases (short base, far away, guard)', () => {
  const one: LatLon[] = [[50.88, 4.70]];
  assert(differingStretches(one, P2).length === 1 && differingStretches(one, P2)[0] === P2, 'short base returns other');
  assert(differingStretches(one, one).length === 0, 'both short returns nothing');
  const far: LatLon[] = P1.map(([la, lo]) => [la, lo + 0.007] as LatLon);
  const f = differingStretches(P1, far);
  assert(f.length === 1 && f[0].length === far.length, 'a far-away way is one whole stretch');
  const big: LatLon[] = Array.from({ length: 2500 }, (_, i) => [50 + i * 1e-5, 4] as LatLon);
  const big2: LatLon[] = Array.from({ length: 2500 }, (_, i) => [50 + i * 1e-5, 4.001] as LatLon);
  const t0 = Date.now();
  const g = differingStretches(big, big2);
  assert(g.length === 1 && g[0] === big2, 'guard returns the whole other way');
  assert(Date.now() - t0 < 500, 'guard path is quick');
});

test('catalogmap: boundsOfPoints pads, widens to the minimum span, and is null for nothing', () => {
  assert(boundsOfPoints([]) === null, 'no points gives null');
  const close = boundsOfPoints([{ lat: 50.88, lon: 4.70 }, { lat: 50.8809, lon: 4.7014 }])!;
  const cLat = (close.minLat + close.maxLat) / 2;
  const h = metresBetween(close.minLat, close.minLon, close.minLat, close.maxLon);
  const v = metresBetween(close.minLat, close.minLon, close.maxLat, close.minLon);
  assert(h >= 799 && v >= 799, `min span: ${h.toFixed(0)} x ${v.toFixed(0)} m at lat ${cLat}`);
  const wide = boundsOfPoints([{ lat: 50.80, lon: 4.60 }, { lat: 50.84, lon: 4.68 }])!;
  const padLat = 0.04 * 0.15;
  assert(Math.abs((50.80 - wide.minLat) - padLat) < padLat * 0.01, 'padded 15 percent on the south side');
  assert(Math.abs((wide.maxLon - 4.68) - 0.08 * 0.15) < 0.08 * 0.15 * 0.01, 'padded 15 percent on the east side');
});

const src = (...p: string[]) => fs.readFileSync(path.join(TESTS_DIR, '..', ...p), 'utf8');

test('catalogmap: every drawn overview line has at least two vertices and a primary route in its pair', () => {
  for (const l of overviewModel(fixture()).lines) {
    assert(l.path.length >= 2, `line ${l.key} has ${l.path.length} vertices`);
    assert(l.routeIds.includes(l.routeId), `line ${l.key} primary is not in its pair`);
  }
});

test('catalogmap: every route focus row has a non-empty label', () => {
  const d = fixture();
  for (const r of d.catalog.routes) {
    for (const w of routeFocusModel(r.id, d)!.ways) assert(w.label.length > 0, `${r.id}/${w.wayId} has no label`);
  }
});

test('catalogmap: the tab label is routes (virgin-cycle27 07)', () => {
  assert(src('App.tsx').includes("routes: 'routes'"), "App.tsx tab label is not routes: 'routes'");
  assert(!src('App.tsx').includes("routes: 'map'"), 'old label gone');
});

test('catalogmap: RoutesScreen renders the map and the old places list is gone', () => {
  const rs = src('src', 'ui', 'RoutesScreen.tsx');
  assert(rs.includes('<CatalogMapView'), 'RoutesScreen does not render CatalogMapView');
  assert(!rs.includes('YOUR PLACES'), 'RoutesScreen still has YOUR PLACES');
});

test('catalogmap: pin labels keep the font stack the OpenFreeMap styles carry', () => {
  assert(src('src', 'ui', 'catalogMapView.tsx').includes("'text-font': ['Noto Sans Regular']"), 'pin labels lost their font stack');
});

test('catalogmap: source taps stop at the map so a pin tap is not an empty tap', () => {
  assert(src('src', 'ui', 'catalogMapView.tsx').includes('stopPropagation'), 'source taps no longer stop at the map');
});

test('catalogmap: the credit control is exported for the sibling map', () => {
  assert(src('src', 'ui', 'wayMapView.tsx').includes('export function Credit('), 'Credit is not exported');
});


// ------------------------------------------------ virgin-cycle26 brief 05
test('virgin-cycle26 05: MAP titles a loop route "<Place> loop" in the place focus rows and as the route focus label', () => {
  const d = fixture();
  const place = placeFocusModel('H', d)!;
  const loopRow = place.rows.find((r) => r.routeId === 'rLoop')!;
  assert(loopRow.label === 'Home loop', `place focus loop row: ${loopRow.label}`);
  assert(place.rows.find((r) => r.routeId === 'rWH')!.label === 'Work → Home', 'a pair row is unchanged');
  const focus = routeFocusModel('rLoop', d)!;
  assert(focus.label === 'Home loop', `route focus label: ${focus.label}`);
  assert(!focus.label.includes('→'), 'no arrow in a loop title');
});

test('virgin-cycle27 08+09: the MAP tab map has +, −, one FIT/ME toggle, rotation on, a rider dot mounted last, and never prompts', () => {
  const cm = src('src', 'ui', 'catalogMapView.tsx');
  assert(!cm.includes('touchRotate={false}'), 'rotate no longer forced off');
  assert(!cm.includes('⤢'), 'the ⤢ glyph is gone');
  assert(cm.includes("const fitMeNext = fitMeNextMode(mode, props.here !== null);") && (cm.match(/>FIT</g) ?? []).length === 1 && (cm.match(/>ME</g) ?? []).length === 1, 'one coupled toggle, literal labels');
  assert(cm.includes("useState<'fit' | 'free' | 'follow'>('fit')") && cm.includes("here: mode === 'follow' ? props.here : null") && cm.includes('bearing: liveBearing'), 'ME centres on the rider without touching the bearing; FIT pins north via the fit rule');
  const riderAt = cm.indexOf('id="rider"'); const mapEnd = cm.indexOf('</M.Map>'); const pinsAt = cm.indexOf('id="catalogPins"');
  assert(riderAt > pinsAt && riderAt < mapEnd, 'rider source is the LAST source (dot on top)');
  assert(cm.includes("'circle-color': colors.riderBlue"), 'riderBlue, never a tier colour');
  for (const forbidden of ['ensurePermissions', 'requestForegroundPermissionsAsync', 'refreshPositionOnce']) assert(!cm.includes(forbidden), `${forbidden} must not be on the MAP tab`);
  const rs = src('src', 'ui', 'RoutesScreen.tsx');
  assert(rs.includes("import { getStatus, lastKnownPositionIfPermitted, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';"), 'RoutesScreen reads the shared store + the OS last-known position');
  assert(rs.includes('void lastKnownPositionIfPermitted().then(') && rs.includes('void refreshPositionIfPermitted();') && rs.includes('here={here}') && rs.includes('onMe={() => { void refreshPositionIfPermitted(); }}'), 'last-known once on open, one quiet fresh read on open, one per ME tap');
  assert(rs.includes("? { lat: status.lastLat, lon: status.lastLon } : lastKnown"), 'order: live store fix first, OS last-known second (ruling 8.1)');
  assert(!rs.includes('ensurePermissions') && !rs.includes('requestForegroundPermissionsAsync'), 'never prompts');
  // ruling 8.2: activity card / detail / editor maps never get a dot or a ME button
  for (const f of ['activityCard.tsx', 'RideDetailScreen.tsx', 'gateAdjustCard.tsx']) {
    const s = src('src', 'ui', f);
    for (const el of s.match(/<WayMapView[\s\S]*?\/>/g) ?? []) assert(/showRider=\{false\}/.test(el) && /lat=\{null\}/.test(el), `${f}: no rider dot on an activity map`);
  }
});
