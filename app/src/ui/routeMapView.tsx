/**
 * The live route map (B-50, Nathan 2026-08-17). MapLibre + real tiles is the
 * primary rung now; the pre-rendered PNG compositor (the original "faked
 * live map" — no native module, no tiles, no network) is the fallback rung
 * for whenever the native module isn't there or the map fails to load. A
 * third rung — the ridden line drawn as segments — lives inside the PNG
 * rung itself (`imgFailed`) for when even the bundled image is unavailable.
 *
 * Honesty (D-025): on EVERY rung, the rider is placed from the TRUE
 * position — projectToPixel() for the PNG rung, the raw lat/lon for the
 * MapLibre rung — never from chainage along the reference. Chainage would
 * pin it to the drawn line and make a detour look like a perfect lap. When
 * the rider is off the drawn route the dot goes grey (PNG) / theme-dim
 * (MapLibre) and says so.
 */
import { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import manifest from '../../assets/routes/routes.json';
import { cropFor, offRouteM, projectToPixel, type RouteAsset } from './routeMapMath.ts';
import {
  bearingBetween, gatesFeatureCollection, riderFeature, routeBounds, routeLineFeature,
} from './routeMapGeo.ts';
import { colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';
import type { CameraStop } from '@maplibre/maplibre-react-native';

// Lazy native-module load, at module scope: the installed build-4 dev
// client has no MapLibre native module, so a bare `import` would crash the
// whole bundle. `require` inside a try/catch fails soft instead — this file
// then falls back to the PNG rung, and Fast Refresh keeps working, never a
// red screen. Build 5 makes ML real; once it's on every phone this whole
// try/catch (and the PNG rung it guards) can eventually retire.
let ML: typeof import('@maplibre/maplibre-react-native') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ML = require('@maplibre/maplibre-react-native');
} catch {
  ML = null;
}

const ASSETS = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes;
const IMAGES: Record<string, number> = {
  Morning: require('../../assets/routes/Morning.png'),
  EveningA: require('../../assets/routes/EveningA.png'),
  EveningB: require('../../assets/routes/EveningB.png'),
};

/** Beyond this the rider is drawn as off-route rather than on the line. */
const OFF_ROUTE_M = 120;

/** D-031 light-basemap palette — must match 08_build_route_assets.py. */
const CASING = '#14120C';
const GROUND_FILL = '#E8E4DA';

/** MapLibre style used for the tile rung — stock dark, deliberately
 * unpatched. Palette-firewall style patching is B-51 work; do not attempt
 * it here. */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

/** Course-up bearing holds until a fix has actually moved this far — cheap
 * jitter guard against a GPS fix wobbling the heading while stationary. */
const BEARING_MIN_MOVE_M = 8;

type RouteMapProps = {
  /** null before the route locks — the map then just shows the candidate */
  routeId: string | null;
  lat: number | null;
  lon: number | null;
  /** 1 = whole route, 4 = tight live crop */
  zoom?: number;
  height?: number;
  /** colour per crossed gate, index 0 = START. Gates ahead stay dark; a gate
   * only takes a colour once its sector has actually been scored. */
  gateColours?: (string | null)[];
};

export default function RouteMapView(props: RouteMapProps) {
  const [mapFailed, setMapFailed] = useState(false);
  if (ML === null || mapFailed) return <PngRouteMap {...props} />;
  return <MapLibreRouteMap {...props} maplibre={ML} onMapFailed={() => setMapFailed(true)} />;
}

// -------------------------------------------------------------- MapLibre rung

/** Cheap equirectangular distance estimate, good enough at bike-ride scale
 * to decide "did the fix actually move" — not a substitute for a real
 * geodesic when correctness at range matters (see routeMapGeo's
 * bearingBetween for the great-circle bearing itself). */
function metresBetween(lat0: number, lon0: number, lat1: number, lon1: number): number {
  const R = 6378137;
  const rad = Math.PI / 180;
  const dLat = (lat1 - lat0) * rad;
  const dLon = (lon1 - lon0) * rad;
  const x = dLon * Math.cos(((lat0 + lat1) / 2) * rad);
  return Math.hypot(x, dLat) * R;
}

function MapLibreRouteMap(props: RouteMapProps & {
  maplibre: NonNullable<typeof ML>;
  onMapFailed: () => void;
}) {
  const { maplibre: M, onMapFailed } = props;
  const { t } = useTheme();
  const id = props.routeId ?? 'Morning';
  const asset = ASSETS[id];
  const h = props.height ?? 190;

  // Two camera modes: 'fit' shows the whole route, 'follow' tracks the
  // rider. Same re-derive-on-prop-change pattern the PNG rung used for its
  // zoom state.
  const [mode, setMode] = useState<'follow' | 'fit'>((props.zoom ?? 4) <= 1 ? 'fit' : 'follow');
  useEffect(() => {
    setMode((props.zoom ?? 4) <= 1 ? 'fit' : 'follow');
  }, [props.zoom]);

  const [camZoom, setCamZoom] = useState(16);

  // Course-up bearing: holds the last value until a new fix has moved
  // BEARING_MIN_MOVE_M from the previous one (jitter guard).
  const [bearing, setBearing] = useState(0);
  const prevFixRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (props.lat === null || props.lon === null) return;
    const lat = props.lat, lon = props.lon;
    const prev = prevFixRef.current;
    if (prev === null) {
      prevFixRef.current = { lat, lon };
      return;
    }
    if (metresBetween(prev.lat, prev.lon, lat, lon) >= BEARING_MIN_MOVE_M) {
      setBearing(bearingBetween(prev.lat, prev.lon, lat, lon));
      prevFixRef.current = { lat, lon };
    }
  }, [props.lat, props.lon]);

  if (!asset) return null;

  const here = props.lat !== null && props.lon !== null;
  // D-025: off-route reads from the TRUE fix, same call the PNG rung makes.
  const off = here ? offRouteM(asset, props.lat as number, props.lon as number) > OFF_ROUTE_M : false;

  const routeLine = routeLineFeature(asset);
  const gatesFC = gatesFeatureCollection(asset, props.gateColours);
  const bounds = routeBounds(asset);
  const boundsTuple: [number, number, number, number] | null = bounds
    ? [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]
    : null;

  const centre: [number, number] = here
    ? [props.lon as number, props.lat as number]
    : bounds
      ? [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2]
      : [asset.gates[0].lon, asset.gates[0].lat];

  const cameraProps: Partial<CameraStop> = mode === 'fit' && boundsTuple
    ? {
      bounds: boundsTuple,
      bearing: 0,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
    }
    : { center: centre, zoom: camZoom, bearing, pitch: 0, duration: 500 };

  return (
    <View style={[st.frame, { height: h, backgroundColor: t.race.bg, borderColor: t.cardBorder }]}>
      <M.Map
        mapStyle={MAP_STYLE}
        style={{ flex: 1 }}
        onDidFailLoadingMap={onMapFailed}
        attribution={false}
        logo={false}
        compass={false}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}
      >
        <M.Camera {...cameraProps} />
        {routeLine ? (
          <M.GeoJSONSource id="route" data={routeLine}>
            <M.Layer id="route-casing" type="line"
              paint={{ 'line-color': CASING, 'line-width': 7 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
            <M.Layer id="route-core" type="line"
              paint={{ 'line-color': colors.neutral, 'line-width': 4 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          </M.GeoJSONSource>
        ) : null}
        <M.GeoJSONSource id="gates" data={gatesFC}>
          <M.Layer id="gate-rings" type="circle" paint={{
            'circle-radius': 6,
            'circle-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
            'circle-stroke-color': CASING,
            'circle-stroke-width': 2,
          }} />
        </M.GeoJSONSource>
        {here ? (
          <M.GeoJSONSource id="rider" data={riderFeature(props.lat as number, props.lon as number)}>
            <M.Layer id="rider-dot" type="circle" paint={{
              'circle-radius': 7,
              'circle-color': off ? t.textDim : colors.neutral,
              'circle-stroke-color': CASING,
              'circle-stroke-width': 2,
            }} />
          </M.GeoJSONSource>
        ) : null}
      </M.Map>
      <View style={st.zoomBar}>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { setCamZoom((z) => Math.min(18, z + 1)); setMode('follow'); }}>
          <Text style={[st.zoomText, { color: t.text }]}>+</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setCamZoom((z) => Math.max(11, z - 1))}>
          <Text style={[st.zoomText, { color: t.text }]}>−</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setMode('fit')}>
          <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
        </Pressable>
      </View>
      <Text style={st.credit} numberOfLines={1}>
        OpenFreeMap © OpenMapTiles Data from OpenStreetMap
      </Text>
      {off ? (
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>OFF ROUTE</Text>
      ) : null}
      {!here ? (
        <Text style={[st.badge, { color: t.textDim, backgroundColor: t.race.card }]}>waiting for GPS</Text>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ PNG rung

/**
 * Required by the tile licence, and it is drawn HERE rather than baked into
 * the PNG on purpose: the live screen crops the asset at zoom 4, so a baked
 * corner would be off-screen exactly when the map is being used.
 */
const ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors';

function PngRouteMap(props: RouteMapProps) {
  const { t } = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Zoom is the rider's, not the app's: +/- step it, FIT drops back to the
  // whole route. Defaults to the tight live crop the ride screen asks for.
  const [zoom, setZoom] = useState(props.zoom ?? 4);
  // If the bundled PNG fails to load (Metro asset cache, a mid-run rewrite),
  // say so and draw the route from `path` instead of showing black.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setZoom(props.zoom ?? 4); }, [props.zoom]);
  const id = props.routeId ?? 'Morning';
  const asset = ASSETS[id];
  const img = IMAGES[id];
  const h = props.height ?? 190;

  if (!asset || !img) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  const here = props.lat !== null && props.lon !== null
    ? projectToPixel(asset, props.lat, props.lon)
    : null;
  const off = here && props.lat !== null && props.lon !== null
    ? offRouteM(asset, props.lat, props.lon) > OFF_ROUTE_M
    : false;

  const crop = box.w > 0
    ? cropFor(asset, here ?? { px: asset.w / 2, py: asset.h / 2 }, box.w, box.h, zoom)
    : null;

  return (
    <View onLayout={onLayout}
      style={[st.frame, { height: h, backgroundColor: t.race.bg, borderColor: t.cardBorder }]}>
      {crop ? (
        <>
          {!imgFailed ? (
            <Image source={img}
              onError={() => setImgFailed(true)}
              style={{
                position: 'absolute',
                width: asset.w * crop.scale,
                height: asset.h * crop.scale,
                left: crop.translateX,
                top: crop.translateY,
              }}
              resizeMode="stretch" />
          ) : (
            // Fallback: the ridden line as short segments. Coarser than the
            // PNG (no context rides) but never a blank screen.
            (asset.path ?? []).slice(0, -1).map((p0, i) => {
              const p1 = (asset.path ?? [])[i + 1];
              const a0 = projectToPixel(asset, p0[0], p0[1]);
              const a1 = projectToPixel(asset, p1[0], p1[1]);
              const x0 = a0.px * crop.scale + crop.translateX;
              const y0 = a0.py * crop.scale + crop.translateY;
              const x1 = a1.px * crop.scale + crop.translateX;
              const y1 = a1.py * crop.scale + crop.translateY;
              const len = Math.hypot(x1 - x0, y1 - y0);
              const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
              return (
                <View key={i} style={{
                  position: 'absolute', left: x0, top: y0 - 1.5,
                  width: len, height: 3, backgroundColor: colors.neutral,
                  transform: [{ translateX: 0 }, { rotate: `${ang}deg` }],
                  transformOrigin: 'left center',
                }} />
              );
            })
          )}
          {asset.gates.map((g, i) => {
            const col = props.gateColours?.[i] ?? null;
            return (
              <View key={g.name} style={[st.gate, {
                left: g.px * crop.scale + crop.translateX - 6,
                top: g.py * crop.scale + crop.translateY - 6,
                // D-031: the asset is a light real map in BOTH themes, so the
                // ring is dark. A white ring vanished into beige.
                backgroundColor: col ?? GROUND_FILL,
                borderColor: CASING,
              }]} />
            );
          })}
          {here ? (
            <View style={[st.dot, {
              left: here.px * crop.scale + crop.translateX - 7,
              top: here.py * crop.scale + crop.translateY - 7,
              backgroundColor: off ? t.textDim : colors.neutral,
              borderColor: CASING,
            }]} />
          ) : null}
        </>
      ) : null}
      <View style={st.zoomBar}>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setZoom((z) => Math.min(12, z * 1.6))}>
          <Text style={[st.zoomText, { color: t.text }]}>+</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setZoom((z) => Math.max(1, z / 1.6))}>
          <Text style={[st.zoomText, { color: t.text }]}>−</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setZoom(1)}>
          <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
        </Pressable>
      </View>
      {imgFailed ? (
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card, left: undefined, right: 6, bottom: 6 }]}>
          MAP IMAGE FAILED — drawing the line
        </Text>
      ) : null}
      {!imgFailed ? (
        <Text style={st.credit} numberOfLines={1}>{ATTRIBUTION}</Text>
      ) : null}
      {off ? (
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>OFF ROUTE</Text>
      ) : null}
      {here === null ? (
        <Text style={[st.badge, { color: t.textDim, backgroundColor: t.race.card }]}>waiting for GPS</Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  gate: { position: 'absolute', width: 12, height: 12, borderRadius: 12, borderWidth: 2 },
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 14, borderWidth: 2, borderColor: '#fff' },
  zoomBar: { position: 'absolute', right: 6, top: 6, gap: 5 },
  zoomBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomText: { fontSize: 17, fontWeight: '700' },
  // Deliberately NOT a palette colour: a credit that used a tier colour would
  // read as a signal.
  credit: {
    position: 'absolute', right: 6, bottom: 6, maxWidth: '80%',
    fontSize: 8.5, color: '#2B2B2B', backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  badge: {
    position: 'absolute', bottom: 6, left: 6, fontSize: 10.5, letterSpacing: 1.2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
});
