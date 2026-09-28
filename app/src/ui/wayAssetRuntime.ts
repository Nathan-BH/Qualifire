/**
 * Runtime RouteAsset for routes with no entry in assets/ways/routes.json
 * (WP-C). Builds the SAME RouteAsset shape the Python renderer writes: a
 * [lat,lon] path at the reference's own 5 m spacing (capped — RUNTIME_PATH_MAX_VERTICES), gates resolved from chainage onto that line, a
 * gateIdx per gate, and a Web-Mercator fit into the renderer's 900x1400 /
 * 60px-pad frame — so the PNG rung's projectToPixel/cropFor/gateTickPx work
 * unchanged; image is '' (the same no-PNG convention 17 of the 20 seed
 * routes already use).
 *
 * Resolution order mirrors live/refs.ts refFor(): bundled manifest FIRST,
 * runtime build SECOND. Pure — manifest, catalog and ref lookup are
 * injected; routeMapView.tsx wires the real ones.
 */
import type { RefLine } from '../../core/src/index.ts';
import { interp1, xyToLatLon } from '../../core/src/index.ts';
import { gateSetFor } from '../store/catalog.ts';
import type { Catalog } from '../store/types.ts';
import { gateName } from './gateAdjustModel.ts';
import { projectToPixel, type WayAsset, type WayGate } from './wayMapMath.ts';

export const RUNTIME_ASSET_W = 900;
export const RUNTIME_ASSET_H = 1400;
export const RUNTIME_ASSET_PAD_PX = 60;
/** virgin-cycle15 07 (replay drift, 2026-09-28): the drawn path keeps EVERY vertex of the
 * reference line (5 m apart — core/src/reference.ts resamples at 5 m) up to this cap; only
 * a way longer than ~cap x 5 m (~20 km) is thinned, by the smallest integer stride that
 * fits. Was a ~180-vertex target (30-38 m spacing, mirroring the seed manifest's Python
 * renderer — cycle1 WP-C risk 5: "one constant to change if Nathan dislikes it on device"),
 * which cut every bend tighter than ~35 m straight across: measured 7-10 m off the
 * reference at a 5-20 m-radius corner apex (tests/replay_drift_suite.ts), an order of
 * magnitude more than the replay dot's own <=1.6 m chord error. 4000 = trailModel.ts's
 * TRAIL_MAX_POINTS, a vertex count the MapLibre rung already draws live. */
export const RUNTIME_PATH_MAX_VERTICES = 4000;
const DEDUPE_M = 0.5;

const mercX = (lon: number): number => (lon * Math.PI) / 180;
const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));

export function pointAtChainage(ref: RefLine, s: number): [number, number] {
  return xyToLatLon(interp1(s, ref.ch, ref.rx), interp1(s, ref.ch, ref.ry), ref.lat0, ref.lon0);
}

export function buildRuntimeWayAsset(
  ref: RefLine, gateChainageM: readonly number[], sourceRide = '',
): WayAsset {
  const n = ref.ch.length;
  const stride = Math.max(1, Math.ceil((n - 1) / RUNTIME_PATH_MAX_VERTICES));
  interface Cand { s: number; ll: [number, number]; gate: number | null }
  const vertex = (i: number): Cand =>
    ({ s: ref.ch[i], ll: xyToLatLon(ref.rx[i], ref.ry[i], ref.lat0, ref.lon0), gate: null });
  const cands: Cand[] = [];
  for (let i = 0; i < n; i += stride) cands.push(vertex(i));
  if ((n - 1) % stride !== 0) cands.push(vertex(n - 1));
  gateChainageM.forEach((s, gi) => {
    const sc = Math.min(Math.max(s, 0), ref.length);
    cands.push({ s: sc, ll: pointAtChainage(ref, sc), gate: gi });
  });
  cands.sort((a, b) => a.s - b.s || (a.gate === null ? 1 : 0) - (b.gate === null ? 1 : 0));
  const path: [number, number][] = [];
  const gateIdx: number[] = gateChainageM.map(() => -1);
  let lastS = -Infinity;
  let lastWasGate = false;
  for (const c of cands) {
    const near = c.s - lastS < DEDUPE_M;
    if (near && c.gate === null) continue;
    if (near && c.gate !== null && !lastWasGate) {
      path[path.length - 1] = c.ll;
      gateIdx[c.gate] = path.length - 1;
      lastWasGate = true; lastS = c.s;
      continue;
    }
    path.push(c.ll);
    if (c.gate !== null) gateIdx[c.gate] = path.length - 1;
    lastWasGate = c.gate !== null; lastS = c.s;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [lat, lon] of path) {
    const x = mercX(lon), y = mercY(lat);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const dx = Math.max(maxX - minX, 1e-12);
  const dy = Math.max(maxY - minY, 1e-12);
  const scale = Math.min(
    (RUNTIME_ASSET_W - 2 * RUNTIME_ASSET_PAD_PX) / dx,
    (RUNTIME_ASSET_H - 2 * RUNTIME_ASSET_PAD_PX) / dy,
  );
  const asset: WayAsset = {
    image: '', path, gateIdx,
    w: RUNTIME_ASSET_W, h: RUNTIME_ASSET_H,
    x0: minX, y1: maxY, scale,
    offx: (RUNTIME_ASSET_W - dx * scale) / 2,
    offy: (RUNTIME_ASSET_H - dy * scale) / 2,
    gates: [], sourceRide,
  };
  asset.gates = gateIdx.map((pi, i): WayGate => {
    const [lat, lon] = path[pi];
    const { px, py } = projectToPixel(asset, lat, lon);
    return { name: gateName(i, gateIdx.length), lat, lon, px, py };
  });
  return asset;
}

export interface WayAssetDeps {
  manifest: Record<string, WayAsset>;
  catalog: Catalog;
  refFor: (refLineId: string) => RefLine | null;
}

interface CacheEntry { ref: RefLine; gateKey: string; asset: WayAsset }
let cache = new Map<string, CacheEntry>();

export function resolveWayAsset(id: string, deps: WayAssetDeps): WayAsset | null {
  const bundled = deps.manifest[id];
  if (bundled !== undefined) return bundled;
  const way = deps.catalog.ways.find((r) => r.id === id || r.refLineId === id);
  if (!way) return null;
  const ref = deps.refFor(way.refLineId);
  if (ref === null) return null;
  const gateSet = gateSetFor(deps.catalog, way.id, way.gateSetVersion);
  if (!gateSet || gateSet.chainageM.length < 2) return null;
  const gateKey = `${gateSet.version}|${gateSet.chainageM.join(',')}`;
  const hit = cache.get(id);
  if (hit && hit.ref === ref && hit.gateKey === gateKey) return hit.asset;
  const asset = buildRuntimeWayAsset(
    ref, gateSet.chainageM, way.referenceRideId ? `ride:${way.referenceRideId}` : 'runtime',
  );
  cache.set(id, { ref, gateKey, asset });
  return asset;
}

export function allWayAssets(deps: WayAssetDeps): Record<string, WayAsset> {
  const out: Record<string, WayAsset> = {};
  for (const r of deps.catalog.ways) {
    const a = resolveWayAsset(r.id, deps);
    if (a) out[r.id] = a;
  }
  return out;
}

export function resetWayAssetCacheForTests(): void { cache = new Map(); }
