/**
 * Pure GeoJSON builders for the MapLibre route map (B-50). No react-native,
 * no maplibre imports here — headless-testable, same discipline as
 * routeMapMath.ts.
 *
 * CRITICAL: RouteAsset stores `path` and gate lat/lon as [lat, lon] (and
 * lat, lon fields) — GeoJSON coordinates are [lon, lat]. Every function here
 * does that swap; get it backwards and the route silently draws in the
 * Gulf of Guinea.
 */
import type { RouteAsset } from './routeMapMath.ts';

// Minimal local GeoJSON shapes — the app's tsconfig (expo/tsconfig.base)
// does not pull in @types/geojson globals by default in this file's
// resolution, so these are defined locally rather than adding a dependency.
export interface GeoPosition extends Array<number> {
  0: number; // lon
  1: number; // lat
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: GeoPosition[];
}

export interface PointGeometry {
  type: 'Point';
  coordinates: GeoPosition;
}

export interface GeoFeature<G, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoFeatureCollection<G, P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoFeature<G, P>[];
}

/** The ridden line, or null if the asset has no path (or too short to draw). */
export function routeLineFeature(a: RouteAsset): GeoFeature<LineStringGeometry> | null {
  if (!a.path || a.path.length < 2) return null;
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: a.path.map(([lat, lon]) => [lon, lat]),
    },
    properties: {},
  };
}

export interface GateProperties {
  name: string;
  colour?: string;
}

/**
 * One point per gate. `colour` is OMITTED (not set to null) when the gate has
 * no colour yet, so the ['has','colour'] paint expression can distinguish
 * "not scored" from "scored transparent".
 */
export function gatesFeatureCollection(
  a: RouteAsset, gateColours?: (string | null)[],
): GeoFeatureCollection<PointGeometry, GateProperties> {
  return {
    type: 'FeatureCollection',
    features: a.gates.map((g, i) => {
      // B-50 hardening: an empty string is "no colour yet", same as null —
      // without this a stray '' (e.g. a defensive `?? ''` upstream) would
      // set the paint expression's ['has','colour'] true with nothing to draw.
      const raw = gateColours?.[i] ?? null;
      const colour = raw === '' ? null : raw;
      const properties: GateProperties = colour !== null
        ? { name: g.name, colour }
        : { name: g.name };
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [g.lon, g.lat] },
        properties,
      };
    }),
  };
}

export function riderFeature(lat: number, lon: number): GeoFeature<PointGeometry> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {},
  };
}

export interface LonLatBoundsBox { minLon: number; minLat: number; maxLon: number; maxLat: number }

/** Bounding box over `path` if present, else over the gates. Null only if
 * both are absent/empty. */
export function routeBounds(a: RouteAsset): LonLatBoundsBox | null {
  const points: [number, number][] = a.path && a.path.length > 0
    ? a.path.map(([lat, lon]) => [lon, lat])
    : a.gates.map((g) => [g.lon, g.lat]);
  if (points.length === 0) return null;
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** Cheap equirectangular distance estimate (metres), good enough at
 * bike-ride scale to decide "did the fix actually move" — not a substitute
 * for a real geodesic when correctness at range matters (see bearingBetween
 * for the great-circle bearing itself). Shared by routeMapView's course-up
 * jitter guard and RecordScreen's stationary detection (B-51) so the two
 * "did it move" checks never drift apart. */
export function metresBetween(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const R = 6378137;
  const rad = Math.PI / 180;
  const dLat = (lat1 - lat0) * rad;
  const dLon = (lon1 - lon0) * rad;
  const x = dLon * Math.cos(((lat0 + lat1) / 2) * rad);
  return Math.hypot(x, dLat) * R;
}

/** Initial great-circle bearing from (lat0,lon0) to (lat1,lon1), degrees,
 * 0 = north, 90 = east, range [0, 360). */
export function bearingBetween(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const rad = Math.PI / 180;
  const phi0 = lat0 * rad;
  const phi1 = lat1 * rad;
  const dLambda = (lon1 - lon0) * rad;
  const y = Math.sin(dLambda) * Math.cos(phi1);
  const x = Math.cos(phi0) * Math.sin(phi1) - Math.sin(phi0) * Math.cos(phi1) * Math.cos(dLambda);
  const theta = Math.atan2(y, x) / rad;
  return (theta + 360) % 360;
}
