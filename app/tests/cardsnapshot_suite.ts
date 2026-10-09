/**
 * virgin-cycle29 02 — the snapshot probe: key/file name, Mercator camera maths, style builder (all pure),
 * the layer-parity pin against wayMapView.tsx, and source pins on the probe wiring.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  cardSnapshotStyle, fitZoomFor, paddedBoundsFor, snapshotFileName, snapshotKey, SNAPSHOT_TIMEOUT_MS, withTimeout, type SnapshotKeyInput,
} from '../src/ui/cardSnapshotModel.ts';
import { cardLayerSpecs } from '../src/ui/wayMapLayers.ts';

const src = (...p: string[]) => fs.readFileSync(path.join(TESTS_DIR, '..', ...p), 'utf8');

const base: SnapshotKeyInput = {
  variant: 'route', rideId: 'r1', wayId: 'w1', gateSetVersion: 2, styleUrl: 'https://s/dark', sectorColoursOn: true,
  sectorColours: ['#a', null, '#c'], trailPoints: 0, widthDp: 400, heightDp: 150, density: 2.5,
};

test('virgin-cycle29 02: snapshotKey changes with every field, ignores colours when the toggle is off, is stable', () => {
  const k = snapshotKey(base);
  assert(k === snapshotKey({ ...base }), 'stable for equal input');
  const variants: Partial<SnapshotKeyInput>[] = [
    { variant: 'plain' }, { rideId: 'r2' }, { wayId: null }, { gateSetVersion: 3 }, { styleUrl: 'https://s/light' },
    { sectorColoursOn: false }, { sectorColours: ['#a', null, '#d'] }, { trailPoints: 9 }, { widthDp: 401 },
    { heightDp: 151 }, { density: 3 },
  ];
  for (const v of variants) assert(snapshotKey({ ...base, ...v }) !== k, `field ${Object.keys(v)[0]} must change the key`);
  const off = snapshotKey({ ...base, sectorColoursOn: false, sectorColours: ['#x'] });
  assert(off === snapshotKey({ ...base, sectorColoursOn: false, sectorColours: [] }), 'colours ignored when off');
  assert(k.startsWith('snap|v1|route|r1|w1|2|'), `key shape: ${k}`);
});

test('virgin-cycle29 02: snapshotFileName is two 8-hex hashes, differs for keys one char apart', () => {
  const a = snapshotFileName(snapshotKey(base));
  const b = snapshotFileName(snapshotKey({ ...base, rideId: 'r2' }));
  assert(/^[0-9a-f]{8}-[0-9a-f]{8}\.png$/.test(a), `shape: ${a}`);
  assert(a !== b, 'one char apart differs');
  assert(a === snapshotFileName(snapshotKey(base)), 'deterministic');
});

// Hand value (independent of the module): zoom-0 world px (512 world) dx = dLon/360*512; dy = y(minLat)-y(maxLat)
// with y(lat) = (0.5 - ln(tan(pi/4 + lat/2)) / (2 pi)) * 512; zoom = log2(min((w-2p)/dx, (h-2p)/dy)).
const BOX = { minLon: 4.6, minLat: 50.9, maxLon: 4.6142, maxLat: 50.9045 };
test('virgin-cycle29 02: fitZoomFor matches the hand-computed MapLibre fit, widens with padding, square box is height-limited', () => {
  const z = fitZoomFor(BOX, 400, 150, 20);
  assert(Math.abs(z - 13.40397) < 0.01, `zoom ${z}, want 13.40397 (height-limited: (150-40)/dy)`);
  const z40 = fitZoomFor(BOX, 400, 150, 40);
  assert(Math.abs(z40 - 12.75190) < 0.01, `pad 40: ${z40}, want 12.75190`);
  assert(z40 < z, 'wider pad, lower zoom');
  const sq = { minLon: 4.6, minLat: 50.9, maxLon: 4.61, maxLat: 50.9 + 0.01 * Math.cos((50.9 * Math.PI) / 180) };
  const zs = fitZoomFor(sq, 400, 150, 20);
  assert(Math.abs(zs - 12.91697) < 0.01, `square box: ${zs}, want 12.91697`);
  assert(Math.abs(fitZoomFor(sq, 4000, 150, 20) - zs) < 1e-9, 'a wider slot changes nothing: height-limited');
  assert(fitZoomFor(sq, 400, 1500, 20) > zs + 1, 'a taller slot lets it zoom in: it was height-limited');
  const wide = { minLon: 4.6, minLat: 50.9, maxLon: 4.63, maxLat: 50.901 };
  assert(Math.abs(fitZoomFor(wide, 400, 150, 20) - 13.04260) < 0.01, 'width-limited box');
});

const mercPx = (lon: number, lat: number, z: number) => {
  const size = 512 * Math.pow(2, z);
  const p = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * size, y: (0.5 - Math.log(Math.tan(Math.PI / 4 + p / 2)) / (2 * Math.PI)) * size };
};
test('virgin-cycle29 02: paddedBoundsFor contains the box and spans the slot exactly on the limiting axis', () => {
  for (const [box, limit] of [[BOX, 'h'], [{ minLon: 4.6, minLat: 50.9, maxLon: 4.63, maxLat: 50.901 }, 'w']] as const) {
    const [w, s, e, n] = paddedBoundsFor(box, 400, 150, 20);
    assert(w <= box.minLon && s <= box.minLat && e >= box.maxLon && n >= box.maxLat, 'contains the input box');
    const z = fitZoomFor(box, 400, 150, 20);
    const a = mercPx(w, n, z), b = mercPx(e, s, z);
    if (limit === 'w') assert(Math.abs(b.x - a.x - 400) < 0.5, `width px ${b.x - a.x}, want 400`);
    else assert(Math.abs(b.y - a.y - 150) < 0.5, `height px ${b.y - a.y}, want 150`);
    assert(b.x - a.x <= 400.5 && b.y - a.y <= 150.5, 'never larger than the slot');
  }
  const [w2, , e2] = paddedBoundsFor({ minLon: 4.6, minLat: 50.9, maxLon: 4.6, maxLat: 50.9 }, 400, 150, 20);
  assert(Number.isFinite(w2) && e2 > w2, 'a degenerate box is widened, not NaN');
});

test('virgin-cycle29 02: cardSnapshotStyle deep-copies, appends 4 sources and the 7 card layers last, empties null collections', () => {
  const input = { version: 8, glyphs: 'g://{fontstack}', sprite: 's://sprite', sources: { ofm: { type: 'vector', url: 'u' } }, layers: [{ id: 'bg', type: 'background' }, { id: 'lbl', type: 'symbol', source: 'ofm' }] };
  const before = JSON.stringify(input);
  const fc = { type: 'FeatureCollection' as const, features: [{ k: 1 }] };
  const out = cardSnapshotStyle(input, { route: fc, trail: { type: 'FeatureCollection', features: [] }, spans: null, ticks: null }) as typeof input & { sources: Record<string, { data?: { features: unknown[] } }> };
  assert(JSON.stringify(input) === before, 'input untouched');
  assert(out.glyphs === input.glyphs && out.sprite === input.sprite, 'glyphs / sprite unchanged');
  assert(out.sources.ofm !== undefined && Object.keys(out.sources).join() === 'ofm,route,trail,sector-spans,gate-ticks', `sources: ${Object.keys(out.sources)}`);
  assert(out.sources.route.data!.features.length === 1 && out.sources['sector-spans'].data!.features.length === 0 && out.sources['gate-ticks'].data!.features.length === 0, 'null collections become empty ones');
  const specs = cardLayerSpecs();
  assert(specs.length === 7, 'seven card layers');
  assert(JSON.stringify(out.layers.slice(-7)) === JSON.stringify(specs), 'the last 7 layers are cardLayerSpecs() in order');
  assert(out.layers.length === 9 && out.layers[0].id === 'bg' && out.layers[1].id === 'lbl', 'basemap layers keep their place below');
  for (const l of specs) assert(l.source in out.sources, `${l.id} source exists`);
});

test('virgin-cycle29 02: the extracted layer specs match the layers wayMapView mounts, in order, and the view uses the constants', () => {
  const view = src('src', 'ui', 'wayMapView.tsx');
  const ids = [...view.matchAll(/<M\.Layer id="(route-casing|route-core|trail-casing|trail-core|sector-spans-core|gate-ticks-casing|gate-ticks)"/g)].map((m) => m[1]);
  assert(ids.join() === cardLayerSpecs().map((l) => l.id).join(), `view layers ${ids.join()}`);
  for (const c of ['ROUTE_CASING_PAINT', 'ROUTE_CORE_PAINT', 'TRAIL_CASING_PAINT', 'TRAIL_CORE_PAINT', 'SECTOR_SPANS_PAINT', 'GATE_TICKS_CASING_PAINT', 'GATE_TICKS_PAINT']) {
    assert(view.includes(`paint={${c}}`), `${c} used by the view`);
  }
  assert(!view.includes("'line-width': 7") && !view.includes("'line-width': 5"), 'no inline casing widths left in the view');
});

test('virgin-cycle29 02: probe wiring pins (image only under snapshotUri, long-press title, queue gates, one expo-file-system importer)', () => {
  const card = src('src', 'ui', 'activityCard.tsx');
  assert((card.match(/<Image\b/g) ?? []).length === 1 && card.includes("typeof props.snapshotUri === 'string' ? ("), 'one <Image, only under snapshotUri');
  assert((card.match(/<Credit rung="maplibre" locked=\{false\} \/>/g) ?? []).length === 1 && card.indexOf('<Credit') > card.indexOf('<Image'), 'the licence credit is drawn over the picture (inspect-02 M2)');
  const rides = src('src', 'ui', 'RidesScreen.tsx');
  assert(/onLongPress=\{\(\) => setProbe\(/.test(rides) && rides.includes('delayLongPress={600}'), 'long-press on the title');
  assert(rides.includes('snapshotUri={index === 0 ? probeUri : null}'), 'only card 0 gets the picture');
  const lits = [...rides.matchAll(/console\.(?:log|warn)\(([^)]*)\)/g)].map((m) => m[1]);
  assert(lits.every((l) => [...l.matchAll(/'([^']*)'/g)].every((m) => !m[1].includes(' '))), 'no two-word literal in the probe logging');
  const q = src('src', 'ui', 'cardSnapshotQueue.ts');
  assert(q.includes("if (!idle) throw new Error('gated')") && q.includes('getStatus().session === null') && q.includes('cachedPatchedStyles('), 'both gates present');
  assert((q.match(/createImage\(/g) ?? []).length === 1 && q.includes('chain.then(') && q.includes('withTimeout(ML.StaticMapImageManager.createImage(') && q.includes('SNAPSHOT_TIMEOUT_MS)'), 'one createImage, serialised, under the M1 timeout');
  assert(src('src', 'storage', 'expoFsAdapter.ts').includes('.move('), 'adapter moves the file');
  for (const f of ['wayMapLayers.ts', 'cardSnapshotModel.ts', 'cardSnapshotQueue.ts']) assert(!src('src', 'ui', f).includes('expo-file-system'), `${f} must not import expo-file-system`);
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes("from 'expo-file-system'")) hits.push(p);
    }
  };
  walk(path.join(TESTS_DIR, '..', 'src', 'storage'));
  assert(hits.length === 1 && hits[0].endsWith('expoFsAdapter.ts'), `expo-file-system importers under storage/: ${hits.join(', ')}`);
});

test('virgin-cycle29 02 (inspect M1): withTimeout rejects a hung promise with "timeout", passes settled ones through, drops a late result', async () => {
  const t0 = Date.now();
  let msg = '';
  await withTimeout(new Promise<string>(() => {}), 30).catch((e: unknown) => { msg = (e as Error).message; });
  assert(msg === 'timeout', `hung promise: got "${msg}"`);
  assert(Date.now() - t0 >= 25, 'rejects after the deadline, not before');
  assert((await withTimeout(Promise.resolve('ok'), 1000)) === 'ok', 'a resolved promise passes through');
  let rej = '';
  await withTimeout(Promise.reject(new Error('boom')), 1000).catch((e: unknown) => { rej = (e as Error).message; });
  assert(rej === 'boom', 'a rejection passes through unchanged');
  let late: (v: string) => void = () => {};
  const r = withTimeout(new Promise<string>((res) => { late = res; }), 10);
  await r.catch(() => undefined);
  late('late');
  await new Promise((res) => setTimeout(res, 5));
  let settled = '';
  await r.then((v) => { settled = v; }, () => { settled = 'rejected'; });
  assert(settled === 'rejected', 'a result arriving after the deadline is dropped');
  assert(SNAPSHOT_TIMEOUT_MS >= 5000 && SNAPSHOT_TIMEOUT_MS <= 15000, 'timeout is seconds, not ms or minutes');
});
