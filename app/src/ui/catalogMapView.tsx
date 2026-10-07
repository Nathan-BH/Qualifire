/**
 * virgin-cycle24 brief 03 (Nathan 2026-10-06): the MAP tab's map — a full-bleed
 * MapLibre view of the rider's catalog with three levels (OVERVIEW, PLACE focus,
 * ROUTE focus). A SIBLING of `WayMapView`, not a mode of it (D1): that file is
 * mount-order-sensitive live-ribbon code, so this one reuses its pure helpers
 * (`wayMapStyle.ts`, `wayMapGeo.ts`, `wayAssetRuntime.ts`) and copies only the
 * style-fetch wiring. The pure decisions (which pin, which line, which way is
 * usual, which stretches differ) live in `catalogMapModel.ts`; this file only
 * turns that model into GeoJSON and layers.
 *
 * Dimming is data-driven paint (D8): every feature carries `opacity` (and lines
 * `width`), so a focus change never remounts a source. All sources are always
 * mounted, in JSX order = paint order: lines, ways, gates, pins.
 *
 * The map is never a tier-colour surface (D-030): lines are the brand yellow,
 * differing stretches ink, gates the white-on-casing tick.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import manifest from '../../assets/ways/ways.json';
import type { WayAsset } from './wayMapMath.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { SEED_MODE, bundledForSeedMode } from '../store/seed.ts';
import { refFor } from '../live/refs.ts';
import { resolveWayAsset, type WayAssetDeps } from './wayAssetRuntime.ts';
import { cameraTargetFor, gateHalfLenM, gateTicksFeatureCollection } from './wayMapGeo.ts';
import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';
import {
  differingStretches, type LatLon, type OverviewModel, type PlaceFocusModel, type RouteFocusModel,
} from './catalogMapModel.ts';
import { colors } from './theme.ts';
import { useTheme } from './themeContext.tsx';
import { Credit } from './wayMapView.tsx';
import type { CameraRef, CameraStop } from '@maplibre/maplibre-react-native';

let ML: typeof import('@maplibre/maplibre-react-native') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ML = require('@maplibre/maplibre-react-native');
} catch {
  ML = null;
}

/** Same manifest/asset resolution WayMapView uses (copied, module-private there). */
const ASSETS: Record<string, WayAsset> = bundledForSeedMode(
  SEED_MODE, (manifest as unknown as { ways: Record<string, WayAsset> }).ways,
);
const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };
function assetDeps(): WayAssetDeps {
  return { manifest: ASSETS, catalog: currentCatalog(), refFor: safeRefFor };
}
export function catalogAssetFor(id: string | null): WayAsset | null {
  return id === null ? null : resolveWayAsset(id, assetDeps());
}

const CASING = '#14120C';
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };
const MAP_STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';
const MAP_STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron';
const STYLE_RETRY_MS: readonly number[] = [5000, 15000, 45000];

// D10: every opacity/width in one place; Nathan tunes these on the device.
const LINE_OVERVIEW = { opacity: 0.55, width: 4 };
const LINE_GHOST = { opacity: 0.12, width: 4 };
const LINE_CONNECTED = { opacity: 0.95, width: 4 };
const LINE_HIGHLIGHT = { opacity: 1.0, width: 6 };
const WAY_HIGHLIGHT = { opacity: 1.0, width: 5 };
const WAY_USUAL = { opacity: 0.55, width: 4 };
const WAY_DIFF = { opacity: 0.85, width: 3 };
const PIN_FADED = 0.3;
const PIN_RADIUS = 6;
const PIN_RADIUS_FOCUS = 8;

export type CatalogMapFocus =
  | { level: 'overview' }
  | { level: 'place'; placeId: string; highlightRouteId: string | null }
  | { level: 'route'; routeId: string; highlightWayId: string | null };

export interface CatalogMapViewProps {
  overview: OverviewModel;
  focus: CatalogMapFocus;
  place: PlaceFocusModel | null;
  route: RouteFocusModel | null;
  gateAsset: WayAsset | null;
  sheetOpen: boolean;
  onPressPin: (placeId: string) => void;
  onPressLine: (routeId: string) => void;
  onPressEmpty: () => void;
}

type RegionWillChangeEvent = { nativeEvent: { userInteraction: boolean } };
type RegionDidChangeEvent = { nativeEvent: { userInteraction: boolean; bearing: number; zoom: number } };
type FeaturePressEvent = {
  nativeEvent: { features?: { properties?: Record<string, unknown> | null }[] };
  stopPropagation?: () => void;
};

const lonLat = (path: LatLon[]): [number, number][] => path.map(([lat, lon]) => [lon, lat]);
const lineFeature = (path: LatLon[], properties: Record<string, unknown>) => ({
  type: 'Feature' as const,
  geometry: { type: 'LineString' as const, coordinates: lonLat(path) },
  properties,
});

export default function CatalogMapView(props: CatalogMapViewProps) {
  if (ML === null) return <View style={st.frame} />;
  return <CatalogMapInner {...props} maplibre={ML} />;
}

function CatalogMapInner(props: CatalogMapViewProps & { maplibre: NonNullable<typeof ML> }) {
  const { maplibre: M, overview, focus, place, route } = props;
  const { t, mode: themeMode } = useTheme();
  const styleUrl = themeMode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY;

  // Style fetch + retry (copied from WayMapView, labels on: this is a browse surface).
  const [patchedStyles, setPatchedStyles] = useState<{ url: string; labelsOn: unknown; labelsOff: unknown } | null>(null);
  const [styleFailed, setStyleFailed] = useState(false);
  const styleLoadedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setStyleFailed(false);
    styleLoadedRef.current = false;
    const attempt = async (n: number) => {
      try {
        const res = await fetch(styleUrl);
        const json: unknown = await res.json();
        if (cancelled) return;
        setPatchedStyles({
          url: styleUrl,
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        });
      } catch {
        if (cancelled || n >= STYLE_RETRY_MS.length) return;
        timer = setTimeout(() => { timer = null; void attempt(n + 1); }, STYLE_RETRY_MS[n]);
      }
    };
    void attempt(0);
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [styleUrl]);
  const { style: mapStyle, key: mapStyleKey } = mapStyleFor({
    styleUrl,
    patched: patchedStyles?.url === styleUrl ? patchedStyles : null,
    styleFailed,
    hideLabels: false,
    offline: offlineMapStyle(t.race.bg),
  });

  // Camera (D13): 'fit' on every level change and style remount, 'free' after a gesture.
  const [mode, setMode] = useState<'fit' | 'free'>('fit');
  const [liveZoom, setLiveZoom] = useState<number | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const focusKey = JSON.stringify(focus);
  useEffect(() => {
    setMode('fit');
  }, [focusKey, mapStyleKey]);
  const bounds = route?.bounds ?? place?.bounds ?? overview.bounds;
  const cameraProps: Partial<CameraStop> = {
    ...cameraTargetFor({ mode, here: null, bounds, zoom: 14, bearing: 0 }),
    ...(mode === 'fit' && bounds
      ? { padding: { top: 48, right: 48, bottom: props.sheetOpen ? 300 : 48, left: 48 } }
      : {}),
  };

  // Which way is highlighted in route focus, and its path (the base for differing stretches).
  const highlightWayId = focus.level === 'route' && route ? (focus.highlightWayId ?? route.usualWayId) : null;

  const linesFC = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: overview.lines.map((l) => {
      let v = LINE_OVERVIEW;
      if (focus.level === 'place' && place) {
        const connected = l.routeIds.some((id) => place.connectedRouteIds.includes(id));
        const highlighted = connected && focus.highlightRouteId !== null && l.routeIds.includes(focus.highlightRouteId);
        v = highlighted ? LINE_HIGHLIGHT : connected ? LINE_CONNECTED : LINE_GHOST;
      } else if (focus.level === 'route') {
        v = l.routeIds.includes(focus.routeId) ? { opacity: 0, width: LINE_GHOST.width } : LINE_GHOST;
      }
      return lineFeature(l.path, { routeId: l.routeId, key: l.key, opacity: v.opacity, width: v.width });
    }),
  }), [overview, focus, place]);

  const waysFC = useMemo(() => {
    if (focus.level !== 'route' || !route || highlightWayId === null) return EMPTY_FC;
    const base = route.ways.find((w) => w.wayId === highlightWayId)?.path ?? null;
    const features: ReturnType<typeof lineFeature>[] = [];
    for (const w of route.ways) {
      if (!w.path || w.path.length < 2) continue;
      if (w.wayId === highlightWayId) {
        features.push(lineFeature(w.path, { opacity: WAY_HIGHLIGHT.opacity, width: WAY_HIGHLIGHT.width, colour: colors.neutral }));
      } else if (w.wayId === route.usualWayId) {
        features.push(lineFeature(w.path, { opacity: WAY_USUAL.opacity, width: WAY_USUAL.width, colour: colors.neutral }));
      } else {
        const stretches = base ? differingStretches(base, w.path) : [w.path];
        for (const s of stretches) {
          features.push(lineFeature(s, { opacity: WAY_DIFF.opacity, width: WAY_DIFF.width, colour: t.text }));
        }
      }
    }
    return { type: 'FeatureCollection' as const, features };
  }, [focus, route, highlightWayId, t.text]);

  const gatesFC = props.gateAsset
    ? gateTicksFeatureCollection(props.gateAsset, undefined, gateHalfLenM(props.gateAsset.gates[0]?.lat ?? 0, liveZoom ?? 14))
    : EMPTY_FC;

  const pinsFC = useMemo(() => {
    const routeEnds = route ? new Set(routeEndpointIds(route.routeId)) : null;
    return {
      type: 'FeatureCollection' as const,
      features: overview.pins.map((p) => {
        let opacity = 1;
        let r = PIN_RADIUS;
        if (focus.level === 'place' && place) {
          if (p.id === place.place.id) r = PIN_RADIUS_FOCUS;
          else if (!place.neighbourIds.includes(p.id)) opacity = PIN_FADED;
        } else if (focus.level === 'route' && routeEnds) {
          if (!routeEnds.has(p.id)) opacity = PIN_FADED;
        }
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] as [number, number] },
          properties: { placeId: p.id, label: p.label, opacity, radius: r },
        };
      }),
    };
  }, [overview, focus, place, route]);

  const zoomBy = (d: number) => {
    setMode('free');
    cameraRef.current?.zoomTo(Math.max(3, Math.min(18, (liveZoom ?? 14) + d)), { duration: 300 });
  };

  return (
    <View style={st.frame}>
      <M.Map
        key={mapStyleKey}
        mapStyle={mapStyle as never}
        style={{ flex: 1 }}
        onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; }}
        onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
        onRegionWillChange={(e: RegionWillChangeEvent) => {
          if (e?.nativeEvent?.userInteraction) setMode('free');
        }}
        onRegionDidChange={(e: RegionDidChangeEvent) => {
          const z = e?.nativeEvent?.zoom;
          if (typeof z === 'number') setLiveZoom(z);
        }}
        onPress={() => props.onPressEmpty()}
        attribution={false}
        logo={false}
        compass={false}
        dragPan
        touchZoom
        doubleTapZoom
        doubleTapHoldZoom
        touchRotate={false}
        touchPitch={false}
      >
        <M.Camera ref={cameraRef} {...cameraProps} />
        {/* No casing on the overview lines (D10): overlapping corridors darken by transparency. */}
        <M.GeoJSONSource
          key="catalogLines"
          id="catalogLines"
          data={linesFC as never}
          onPress={(e: FeaturePressEvent) => {
            const id = e.nativeEvent.features?.[0]?.properties?.routeId;
            if (typeof id !== 'string') return;
            e.stopPropagation?.();
            props.onPressLine(id);
          }}
        >
          <M.Layer id="catalogLinesCore" type="line"
            paint={{ 'line-color': colors.neutral, 'line-opacity': ['get', 'opacity'], 'line-width': ['get', 'width'] }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        <M.GeoJSONSource key="catalogWays" id="catalogWays" data={waysFC as never}>
          <M.Layer id="catalogWaysCasing" type="line"
            paint={{ 'line-color': CASING, 'line-width': ['+', ['get', 'width'], 3], 'line-opacity': ['get', 'opacity'] }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          <M.Layer id="catalogWaysCore" type="line"
            paint={{ 'line-color': ['get', 'colour'], 'line-opacity': ['get', 'opacity'], 'line-width': ['get', 'width'] }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        <M.GeoJSONSource key="catalogGates" id="catalogGates" data={gatesFC as never}>
          <M.Layer id="catalogGatesCasing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 5 }}
            layout={{ 'line-cap': 'round' }} />
          <M.Layer id="catalogGatesCore" type="line" paint={{
            'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.white],
            'line-width': ['case', ['has', 'colour'], 3, 2],
            'line-opacity': 1,
          }} layout={{ 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        <M.GeoJSONSource
          key="catalogPins"
          id="catalogPins"
          data={pinsFC as never}
          hitbox={{ top: 24, right: 24, bottom: 24, left: 24 }}
          onPress={(e: FeaturePressEvent) => {
            const id = e.nativeEvent.features?.[0]?.properties?.placeId;
            if (typeof id !== 'string') return;
            e.stopPropagation?.();
            props.onPressPin(id);
          }}
        >
          <M.Layer id="catalogPinsDot" type="circle" paint={{
            'circle-radius': ['get', 'radius'],
            'circle-color': colors.neutral,
            'circle-opacity': ['get', 'opacity'],
            'circle-stroke-color': CASING,
            'circle-stroke-width': 1.5,
            'circle-stroke-opacity': ['get', 'opacity'],
          }} />
          <M.Layer id="catalogPinsLabel" type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 12,
              'text-anchor': 'top',
              'text-offset': [0, 0.9],
              'text-allow-overlap': false,
            }}
            paint={{
              'text-color': t.text,
              'text-halo-color': t.bg,
              'text-halo-width': 1.5,
              'text-opacity': ['get', 'opacity'],
            }} />
        </M.GeoJSONSource>
      </M.Map>
      <View style={st.zoomBar}>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => zoomBy(1)}>
          <Text style={[st.zoomText, { color: t.text }]}>+</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => zoomBy(-1)}>
          <Text style={[st.zoomText, { color: t.text }]}>−</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setMode('fit')}>
          <Text style={[st.zoomText, { color: t.textDim }]}>⤢</Text>
        </Pressable>
      </View>
      <Credit rung="maplibre" locked={false} />
    </View>
  );
}

/** The two endpoint place ids of the focused route (route focus fades every other pin). */
function routeEndpointIds(routeId: string): string[] {
  const r = currentCatalog().routes.find((x) => x.id === routeId);
  return r ? [r.startLandmarkId, r.endLandmarkId] : [];
}

const st = StyleSheet.create({
  frame: { flex: 1, alignSelf: 'stretch' },
  zoomBar: { position: 'absolute', right: 6, top: 6, gap: 5 },
  zoomBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomText: { fontSize: 17, fontWeight: '700' },
});
