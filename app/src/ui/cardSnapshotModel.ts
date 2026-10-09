/**
 * virgin-cycle29 02: pure model for a way card drawn as a picture by the headless MapLibre snapshotter —
 * the cache key, the file name, the camera maths and the style builder. No react, no native, no fs.
 * Bump SNAPSHOT_SCHEMA whenever wayMapLayers.ts paints or this builder change.
 */
import type { LonLatBoundsBox } from './wayMapGeo.ts';
import { cardLayerSpecs } from './wayMapLayers.ts';

export const SNAPSHOT_SCHEMA = 'v1';

export interface SnapshotKeyInput {
  variant: 'route' | 'plain';
  rideId: string;
  wayId: string | null;
  gateSetVersion: number | null;
  styleUrl: string;
  sectorColoursOn: boolean;
  sectorColours: readonly (string | null)[];
  trailPoints: number;
  widthDp: number;
  heightDp: number;
  density: number;
}

export function snapshotKey(i: SnapshotKeyInput): string {
  const colours = i.sectorColoursOn ? i.sectorColours.map((c) => c ?? '').join(',') : 'off';
  return `snap|${SNAPSHOT_SCHEMA}|${i.variant}|${i.rideId}|${i.wayId ?? '-'}|${i.gateSetVersion ?? 0}|${i.styleUrl}|${colours}|${i.trailPoints}|${i.widthDp}x${i.heightDp}|${i.density}`;
}

function fnv1a32hex(s: string): string {
  let h = 0x811c9dc5;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Two 32-bit FNV-1a hashes (forward and reversed key); no crypto import. */
export function snapshotFileName(key: string): string {
  return `${fnv1a32hex(key)}-${fnv1a32hex(key.split('').reverse().join(''))}.png`;
}

// ---- Web-Mercator camera maths (512 px world at zoom 0, like MapLibre GL) ----
const TILE = 512;
const MAX_LAT = 85.0511287798;
const MAX_ZOOM = 22;

const worldX = (lon: number, size: number) => ((lon + 180) / 360) * size;
const worldY = (lat: number, size: number) => {
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return (0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)) * size;
};
const lonAt = (x: number, size: number) => (x / size) * 360 - 180;
const latAt = (y: number, size: number) => {
  const n = Math.PI * (1 - (2 * y) / size);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
};

/** A degenerate axis (zero extent) is widened to 1 m so the maths stays finite. */
function nonDegenerate(b: LonLatBoundsBox): LonLatBoundsBox {
  let { minLon, minLat, maxLon, maxLat } = b;
  const midLat = (minLat + maxLat) / 2;
  if (maxLon - minLon <= 0) {
    const d = 0.5 / (111320 * Math.max(0.01, Math.cos((midLat * Math.PI) / 180)));
    minLon -= d; maxLon += d;
  }
  if (maxLat - minLat <= 0) {
    const d = 0.5 / 110540;
    minLat -= d; maxLat += d;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** MapLibre fitBounds zoom: the padded box fits; zoom = log2(min((w-2p)/dx, (h-2p)/dy)), dx/dy in zoom-0 world px. */
export function fitZoomFor(b: LonLatBoundsBox, widthDp: number, heightDp: number, padDp: number): number {
  const n = nonDegenerate(b);
  const dx = worldX(n.maxLon, TILE) - worldX(n.minLon, TILE);
  const dy = worldY(n.minLat, TILE) - worldY(n.maxLat, TILE);
  const scale = Math.min((widthDp - 2 * padDp) / dx, (heightDp - 2 * padDp) / dy);
  const z = Math.log2(scale);
  return Math.max(0, Math.min(MAX_ZOOM, z));
}

/** The box MapSnapshotter.withRegion must receive (it has no padding) so the ORIGINAL box lands where the live fit puts it. */
export function paddedBoundsFor(b: LonLatBoundsBox, widthDp: number, heightDp: number, padDp: number): [number, number, number, number] {
  const n = nonDegenerate(b);
  const z = fitZoomFor(n, widthDp, heightDp, padDp);
  const size = TILE * Math.pow(2, z);
  const west = lonAt(worldX(n.minLon, size) - padDp, size);
  const east = lonAt(worldX(n.maxLon, size) + padDp, size);
  const north = latAt(worldY(n.maxLat, size) - padDp, size);
  const south = latAt(worldY(n.minLat, size) + padDp, size);
  return [west, south, east, north];
}

// ---- style builder ----
export interface DrawFeatureCollection { type: 'FeatureCollection'; features: unknown[] }
export interface CardDraw {
  route: DrawFeatureCollection | null;
  trail: DrawFeatureCollection;
  spans: DrawFeatureCollection | null;
  ticks: DrawFeatureCollection | null;
}

const emptyFc = (): DrawFeatureCollection => ({ type: 'FeatureCollection', features: [] });

/** The labels-on patched basemap + the card's four sources and seven layers (appended last = painted above every basemap layer). */
export function cardSnapshotStyle(patchedLabelsOn: unknown, draw: CardDraw): unknown {
  const style = JSON.parse(JSON.stringify(patchedLabelsOn)) as { sources?: Record<string, unknown>; layers?: unknown[] };
  style.sources = {
    ...(style.sources ?? {}),
    route: { type: 'geojson', data: draw.route ?? emptyFc() },
    trail: { type: 'geojson', data: draw.trail },
    'sector-spans': { type: 'geojson', data: draw.spans ?? emptyFc() },
    'gate-ticks': { type: 'geojson', data: draw.ticks ?? emptyFc() },
  };
  style.layers = [...(style.layers ?? []), ...cardLayerSpecs()];
  return style;
}

/** inspect-02 M1: Android's MLRNStaticMapModule never rejects on a snapshotter error (it only logs), so a request
 * must time out in JS or the one-at-a-time queue hangs forever. Long enough for a cold first make (glyph/sprite
 * fetch over the network), short enough that Nathan sees `[snap] failed … timeout` instead of "nothing happens". */
export const SNAPSHOT_TIMEOUT_MS = 10000;

/** Settles like `p`, or rejects with Error('timeout') after `ms`. A late result from `p` is dropped (nothing awaits it). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e: unknown) => { clearTimeout(id); reject(e); });
  });
}
