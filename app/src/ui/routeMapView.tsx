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
 *
 * B-51 (per-surface contract, 2026-08-17): the same map now serves TWO
 * personalities, picked by `variant`/`liveState`/`showRider` —
 *  - a locked LIVE ribbon while actually riding (moving/stopped): labels
 *    stripped, course-up bearing — exactly today's behaviour, D-006 "no
 *    controls while moving" (relaxed for map GESTURES by Nathan 2026-08-19,
 *    Cycle 020 — see below);
 *  - a free BROWSE map everywhere else (before start, at the finish, and on
 *    the Routes/Result screens): pan/zoom/rotate-off gestures on, zoom bar
 *    visible, labels on, bearing 0 (or held, at the finish).
 * `stopped` (a red light) additionally dims the frame — a light is not a
 * finish, the map must not loosen, but it should look paused rather than
 * "still fully live and just not moving".
 *
 * Cycle 020 (Nathan 2026-08-19): the race-mode map must be draggable and
 * zoomable like the RECORD tab's preview map. Pan/pinch-zoom gestures and
 * the zoom bar are now on unconditionally (D-006 relaxed for gestures only —
 * labels/dimming/course-up above are untouched); dragging or pinching flips
 * `mode` to 'free' so a new GPS fix never yanks the camera back, and a `fill`
 * prop lets the map fill its parent instead of taking a fixed height.
 */
import { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import manifest from '../../assets/routes/routes.json';
import { cropFor, offRouteM, projectToPixel, type RouteAsset } from './routeMapMath.ts';
import {
  bearingBetween, gatesFeatureCollection, metresBetween, riderFeature, routeBounds, routeLineFeature,
} from './routeMapGeo.ts';
import { patchMapStyle } from './routeMapStyle.ts';
import { colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';
import type { CameraStop } from '@maplibre/maplibre-react-native';

/** Shape of the MapLibre `onRegionWillChange` event we actually read.
 * Typed structurally rather than importing `ViewStateChangeEvent` (Cycle
 * 020: no node_modules in this sandbox to confirm the root-level re-export
 * resolves; this is the brief's documented fallback — narrow but correct
 * for what we use). */
type RegionWillChangeEvent = { nativeEvent: { userInteraction: boolean } };

// Lazy native-module load, at module scope: the dev client installed before
// build 4 has no MapLibre native module, so a bare `import` would crash the
// whole bundle. `require` inside a try/catch fails soft instead — this file
// then falls back to the PNG rung, and Fast Refresh keeps working, never a
// red screen. Build 4 (the dev-client rebuild, 2026-08-17) makes ML real;
// once it's on the phone this try/catch (and the PNG rung) can eventually
// retire.
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

/** MapLibre styles used for the tile rung, one per theme mode (Nathan
 * 2026-08-18): dark basemap at night (yellow line on black is the brand),
 * OpenFreeMap positron (light grey) in daylight. Fetched and runtime-patched
 * (labels + palette firewall, routeMapStyle.ts) — see MapLibreRouteMap. */
const MAP_STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';
const MAP_STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron';

/** Course-up bearing holds until a fix has actually moved this far — cheap
 * jitter guard against a GPS fix wobbling the heading while stationary. */
const BEARING_MIN_MOVE_M = 8;

type RouteMapVariant = 'live' | 'browse';
type LiveMapState = 'prestart' | 'moving' | 'stopped' | 'finished';

type RouteMapProps = {
  /** null before the route locks — the map then just shows the candidate */
  routeId: string | null;
  lat: number | null;
  lon: number | null;
  /** 1 = whole route, 4 = tight live crop */
  zoom?: number;
  height?: number;
  /** fill the parent instead of a fixed height — race mode (Cycle 020,
   * Nathan 2026-08-19). Takes precedence over `height` when true. */
  fill?: boolean;
  /** colour per crossed gate, index 0 = START. Gates ahead stay dark; a gate
   * only takes a colour once its sector has actually been scored. */
  gateColours?: (string | null)[];
  /** 'live' (default) = the recording ribbon; 'browse' = a free-standing
   * pannable map with no live semantics (Routes list, Result "view trace"). */
  variant?: RouteMapVariant;
  /** Only meaningful for variant 'live'. Default 'moving' — today's locked
   * ribbon. 'prestart'/'finished' unlock the map like 'browse' does;
   * 'stopped' keeps it locked but dims it (a red light is not a finish). */
  liveState?: LiveMapState;
  /** Default true. false skips the rider dot/source and the waiting-for-GPS
   * badge — browse surfaces have no rider by contract. */
  showRider?: boolean;
};

export default function RouteMapView(props: RouteMapProps) {
  const [mapFailed, setMapFailed] = useState(false);
  if (ML === null || mapFailed) return <PngRouteMap {...props} />;
  return <MapLibreRouteMap {...props} maplibre={ML} onMapFailed={() => setMapFailed(true)} />;
}

// --------------------------------------------------------------- attribution

/** Shared by both rungs (design contract C): the credit becomes a Pressable
 * that opens a "Map data sources" sheet — except while the live ribbon is
 * actually locked (moving/stopped), where it stays a flat, non-interactive
 * label so it never reads as one more control on the D-006 no-controls
 * surface. */
function Credit(props: { rung: 'maplibre' | 'png'; interactive: boolean }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const label = props.rung === 'maplibre'
    ? 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap'
    : ATTRIBUTION;
  const rows = props.rung === 'maplibre'
    ? [
      { source: 'OpenFreeMap', role: 'tiles' },
      { source: '© OpenMapTiles', role: 'schema' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ]
    : [
      { source: 'Esri, HERE, Garmin', role: 'imagery' },
      { source: '© OpenStreetMap contributors', role: 'data' },
    ];
  return (
    <>
      <Pressable
        disabled={!props.interactive}
        onPress={() => setOpen(true)}
        style={st.credit}
        hitSlop={4}
      >
        <Text style={st.creditText} numberOfLines={1}>{label}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.sheetBackdrop} onPress={() => setOpen(false)}>
          <View style={[st.sheetCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[st.sheetTitle, { color: t.text }]}>Map data sources</Text>
            {rows.map((r) => (
              <Text key={r.source} style={[st.sheetRow, { color: t.text2 }]}>
                {r.source} — {r.role}
              </Text>
            ))}
            <Pressable style={st.sheetClose} onPress={() => setOpen(false)}>
              <Text style={[st.sheetCloseText, { color: t.accentText }]}>CLOSE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------- MapLibre rung

function MapLibreRouteMap(props: RouteMapProps & {
  maplibre: NonNullable<typeof ML>;
  onMapFailed: () => void;
}) {
  const { maplibre: M, onMapFailed } = props;
  const { t, mode: themeMode } = useTheme();
  const styleUrl = themeMode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY;
  const id = props.routeId ?? 'Morning';
  const asset = ASSETS[id];
  const h = props.height ?? 190;

  const variant = props.variant ?? 'live';
  const liveState = props.liveState ?? 'moving';
  const showRider = props.showRider ?? true;

  // Behaviour matrix (design contract A). "unlocked" = free browse gestures,
  // labels on, zoom bar visible: browse surfaces, the pre-start map, and the
  // finished ribbon (released back to browse). Everything else (moving,
  // stopped) is today's locked, label-free, control-free ribbon — D-006.
  const unlocked = variant === 'browse' || liveState === 'prestart' || liveState === 'finished';
  const dimmed = variant === 'live' && liveState === 'stopped';
  const interactiveCredit = !(variant === 'live' && (liveState === 'moving' || liveState === 'stopped'));

  const initialMode: 'follow' | 'fit' = variant === 'browse' || liveState === 'prestart'
    ? 'fit'
    : liveState === 'finished'
      ? 'follow' // released back to the zoom bar, not re-fit to the whole route
      : (props.zoom ?? 4) <= 1 ? 'fit' : 'follow';
  const [mode, setMode] = useState<'follow' | 'fit' | 'free'>(initialMode);
  // Cycle 020 (Nathan 2026-08-19): a red light flips liveState
  // moving<->stopped without the ride actually changing phase — collapsing
  // both onto the same key keeps the mode-reset effect below from snapping a
  // dragged ('free') map back to follow every time the rider stops/starts.
  const phaseKey = liveState === 'stopped' ? 'moving' : liveState;
  useEffect(() => {
    setMode(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.zoom, variant, phaseKey, props.routeId]);

  const [camZoom, setCamZoom] = useState(16);

  // Course-up bearing: holds the last value until a new fix has moved
  // BEARING_MIN_MOVE_M from the previous one (jitter guard). Only updates
  // while actually moving/stopped — 'finished' therefore HOLDS the last
  // course-up value rather than resetting (design contract A).
  const [bearing, setBearing] = useState(0);
  const prevFixRef = useRef<{ lat: number; lon: number } | null>(null);
  const bearingLive = variant === 'live' && (liveState === 'moving' || liveState === 'stopped');
  useEffect(() => {
    if (!bearingLive) return;
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
  }, [props.lat, props.lon, bearingLive]);
  // browse/prestart always face north; finished holds whatever `bearing` last
  // was (bearingLive stopped updating it); moving/stopped read it live.
  const effectiveBearing = variant === 'browse' || liveState === 'prestart' ? 0 : bearing;

  // Runtime style patch (design contract B): fetch the online style once,
  // memoize BOTH a labels-on and a labels-off copy. A fetch/parse failure
  // falls back to the plain styleUrl (day/night pick) — the online, unpatched style —
  // exactly as before B-51; that is not a map failure (onMapFailed is only
  // for the Map component's own onDidFailLoadingMap).
  const [patchedStyles, setPatchedStyles] = useState<{ labelsOn: unknown; labelsOff: unknown } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(styleUrl);
        const json: unknown = await res.json();
        if (cancelled) return;
        setPatchedStyles({
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        });
      } catch {
        // acceptable rung — plain online style, unpatched (see comment above)
      }
    })();
    return () => { cancelled = true; };
  }, [styleUrl]);
  const hideLabels = !unlocked;
  const mapStyle = patchedStyles
    ? (hideLabels ? patchedStyles.labelsOff : patchedStyles.labelsOn)
    : styleUrl;

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

  // 'free' (Cycle 020, after a user drag/pinch): no center/zoom/bounds/bearing
  // at all, so a new GPS fix never yanks the camera back under the rider.
  const cameraProps: Partial<CameraStop> = mode === 'free'
    ? {}
    : mode === 'fit' && boundsTuple
      ? {
        bounds: boundsTuple,
        bearing: 0,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
      }
      : { center: centre, zoom: camZoom, bearing: effectiveBearing, pitch: 0, duration: 500 };

  return (
    <View style={[
      st.frame,
      props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
      { backgroundColor: t.race.bg, borderColor: t.cardBorder },
      dimmed && st.dimmedFrame,
    ]}>
      {/* mapStyle is `unknown` on purpose — routeMapStyle.ts stays decoupled
          from MapLibre's own types (headless-testable). `as never` is the
          narrowest legal escape hatch through that boundary. */}
      <M.Map
        mapStyle={mapStyle as never}
        style={{ flex: 1 }}
        onDidFailLoadingMap={onMapFailed}
        // Cycle 020 (Nathan 2026-08-19): D-006 "no controls while moving" is
        // relaxed for map GESTURES — the race-mode map must be draggable and
        // zoomable like the RECORD tab's preview map. Labels stay hidden and
        // the ribbon stays dimmed while moving/stopped (hideLabels/dimmed
        // above, unchanged); only pan/zoom gestures and the zoom bar open up.
        onRegionWillChange={(e: RegionWillChangeEvent) => {
          if (e?.nativeEvent?.userInteraction) setMode('free');
        }}
        attribution={false}
        logo={false}
        compass={false}
        dragPan={true}
        touchZoom={true}
        doubleTapZoom={true}
        doubleTapHoldZoom={true}
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
        {showRider && here ? (
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
      {/* Cycle 020: the zoom bar is always visible now, not gated on
          `unlocked` — the race-mode ribbon is draggable/zoomable too. */}
      <View style={st.zoomBar}>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { setCamZoom((z) => Math.min(18, z + 1)); setMode('follow'); }}>
          <Text style={[st.zoomText, { color: t.text }]}>+</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { setCamZoom((z) => Math.max(11, z - 1)); setMode('follow'); }}>
          <Text style={[st.zoomText, { color: t.text }]}>−</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setMode('fit')}>
          <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
        </Pressable>
        {showRider ? (
          <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
            onPress={() => setMode('follow')}>
            <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>
          </Pressable>
        ) : null}
      </View>
      <Credit rung="maplibre" interactive={interactiveCredit} />
      {off ? (
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>OFF ROUTE</Text>
      ) : null}
      {showRider && !here ? (
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

  const variant = props.variant ?? 'live';
  const liveState = props.liveState ?? 'moving';
  const showRider = props.showRider ?? true;
  // B-51: this rung is not rebuilt for the full behaviour matrix — it only
  // honours showRider, the stopped-dim and the non-interactive credit while
  // the live ribbon is locked (zoom bar always shown since cycle 020).
  const locked = variant === 'live' && (liveState === 'moving' || liveState === 'stopped');
  const dimmed = variant === 'live' && liveState === 'stopped';
  const interactiveCredit = !locked;

  if (!asset) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };

  const here = showRider && props.lat !== null && props.lon !== null
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
      style={[
        st.frame,
        props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
        { backgroundColor: t.race.bg, borderColor: t.cardBorder },
        dimmed && st.dimmedFrame,
      ]}>
      {crop ? (
        <>
          {!imgFailed && img ? (
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
      {/* Cycle 020: the zoom bar is always visible now, not gated on
          `locked` — the race-mode ribbon is draggable/zoomable too. */}
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
      {!imgFailed && img ? <Credit rung="png" interactive={interactiveCredit} /> : null}
      {off ? (
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>OFF ROUTE</Text>
      ) : null}
      {showRider && here === null ? (
        <Text style={[st.badge, { color: t.textDim, backgroundColor: t.race.card }]}>waiting for GPS</Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  // "stopped" (a red light): tight and dim, not loosened — a light is not a
  // finish (design contract A).
  dimmedFrame: { opacity: 0.4 },
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, overflow: 'hidden',
  },
  creditText: { fontSize: 8.5, color: '#2B2B2B' },
  badge: {
    position: 'absolute', bottom: 6, left: 6, fontSize: 10.5, letterSpacing: 1.2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheetCard: {
    borderRadius: radius.card, borderWidth: 1, padding: 18, gap: 8, minWidth: 240, maxWidth: '90%',
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  sheetRow: { fontSize: 13 },
  sheetClose: { marginTop: 10, alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6 },
  sheetCloseText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 1.5 },
});
