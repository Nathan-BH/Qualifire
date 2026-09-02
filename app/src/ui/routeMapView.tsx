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
 * the rider is off the drawn route the dot INVERTS (WP-E: white fill/blue
 * stroke on MapLibre, the PNG rung's analogous swap) and says so — updated
 * from this file's original grey-out, which read as "lost" rather than
 * "off-route but still tracked".
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
 *
 * WP-D (2026-09-02): a THIRD personality, "rider-only" — when there is no
 * route asset to draw (nothing picked yet, a virgin/empty catalog, or a
 * route-mode ride that never locked onto a bundled route) a live surface
 * (`showRider`) still renders real basemap tiles + the rider's blue dot,
 * instead of returning null. A browse surface (no rider) with no asset still
 * renders nothing — there is nothing useful to show on Routes/Result without
 * either a route or a rider. The camera then has no route bounds to fall
 * back on either: `cameraTargetFor()` (routeMapGeo.ts) follows the live fix
 * when there is one, else sits with no target at all — never the old
 * hardcoded Leuven literal, which was a real-world place unrelated to the
 * rider.
 *
 * WP-J (2026-09-02): a `trail` prop draws the rider's own ridden line — a
 * casing+core polyline styled like the route line, built from RecordScreen's
 * decimated fix buffer (trailModel.ts) — behind the rider dot. Always
 * mounted (possibly empty) on the MapLibre rung only; the PNG rung has no
 * equivalent. This is also the natural fallback on a user-created route with
 * no drawable asset (the WP-D rider-only case above): basemap + dot + trail,
 * until WP-C can draw the route itself.
 *
 * WP-C (2026-09-02): both rungs now resolve `id -> RouteAsset` through ONE
 * function (`assetFor`/`assetDeps`, wiring routeAssetRuntime.ts's pure
 * resolver): the bundled manifest FIRST, a runtime-built asset from the
 * route's ref + gate chainages SECOND — the same seed-wins order as
 * live/refs.ts's refFor()/store/catalog.ts's mergeCatalogs(). A route born
 * on the phone (RECORD save/naming flow) is therefore drawable the moment
 * its ref + gate set exist, on every rung, without a bundled PNG or manifest
 * entry.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import manifest from '../../assets/routes/routes.json';
import { cropFor, gateTickPx, offRouteM, projectToPixel, type RouteAsset } from './routeMapMath.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { defaultMapRouteId } from '../store/defaultRoute.ts';
import { refFor } from '../live/refs.ts';
import { allRouteAssets, resolveRouteAsset, type RouteAssetDeps } from './routeAssetRuntime.ts';
import {
  allGatesBounds, allGatesFeatureCollection, bearingBetween, cameraTargetFor,
  gateTicksFeatureCollection, metresBetween, nearestOnPath, riderFeature, routeBounds, routeLineFeature,
  sectorSpansFeatureCollection,
} from './routeMapGeo.ts';
import { trailLineFeature, type TrailPoint } from './trailModel.ts';
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
/** live/refs.ts's refFor() throws on an unknown track rather than returning
 * null (userRefs.ts's own fallback inside it already returns null there) —
 * swallow to null here so routeAssetRuntime's injected-deps contract can
 * report "no ref" uniformly, without a try/catch at every call site. */
const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };
function assetDeps(): RouteAssetDeps {
  return { manifest: ASSETS, catalog: currentCatalog(), refFor: safeRefFor };
}
/** WP-C: resolves an id to a RouteAsset — bundled manifest first, a
 * runtime-built asset from the route's ref + gate chainages second. null
 * when neither exists (unknown id, or a user route with no ref/gate set
 * yet). */
function assetFor(id: string | null): RouteAsset | null {
  return id === null ? null : resolveRouteAsset(id, assetDeps());
}
/** Fallback when no route is known yet (candidate not picked/locked): the
 * first CATALOG route with a drawable asset (B-39, empty-seed install path)
 * — not the manifest's first key, which in a virgin build (empty catalog,
 * manifest still bundled) would draw a shipped route the rider does not
 * have. Null => both rungs render nothing. Resolved per render: the runtime
 * catalog can grow after boot (store/catalogStore.ts). WP-C: "drawable" now
 * includes a runtime-built user-route asset, not just the bundled manifest. */
function defaultRouteId(): string | null {
  return defaultMapRouteId(currentCatalog(), (ref) => assetFor(ref) !== null);
}
const IMAGES: Record<string, number> = {
  Morning: require('../../assets/routes/Morning.png'),
  EveningA: require('../../assets/routes/EveningA.png'),
  EveningB: require('../../assets/routes/EveningB.png'),
};

/** Beyond this the rider is drawn as off-route rather than on the line. */
const OFF_ROUTE_M = 120;

/** D-031 light-basemap palette — must match 08_build_route_assets.py.
 * GROUND_FILL (the old gate-circle unscored fill, '#E8E4DA') is gone with
 * WP-E — the PNG rung's unscored ticks use CASING instead (see gate tick
 * rendering below). */
const CASING = '#14120C';

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
  /** WP-sector-coloured-trail P1 (ruled 2026-08-26): GATE-indexed sector
   * verdict colours — index i colours the SECTOR ending at gate i (the line
   * span between gates i-1 and i); index 0 (START) is ignored. When present
   * (the Result "view trace" map only, for now — the live map is Phase 2)
   * the MapLibre rung overlays one coloured span per earned sector on top of
   * the base line. The PNG rung cannot honour it (the line is baked into the
   * image) — accepted rung degradation, same as WP-E's dotted-ahead. */
  sectorColours?: (string | null)[];
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
  /** WP-B free-ride map: draws every gate of every route in `gateRouteIds`
   * (or the full catalog when omitted/null) instead of one route's line +
   * gates — no route line, no per-route OFF ROUTE badge (there is no single
   * route to be off), camera FIT fits all the gates instead of one route's
   * bounds. `routeId` is ignored on this rung. */
  gatesOnly?: boolean;
  /** gatesOnly only: which gate a fix has crossed, `{routeId, gateIndex}` —
   * mirrors LiveEngineState.freeCrossings. Gets `colors.neutral`, the same
   * "crossed" convention gateColours uses elsewhere. */
  crossedGates?: { routeId: string; gateIndex: number }[];
  /** gatesOnly only: restricts which routes' gates are drawn/fit — the WP-B
   * coordinator addendum's directional filter (store/catalog.ts's
   * freeRideRouteIds()). undefined/null = every catalog route (the
   * deliberately-unfiltered both-ends-unknown free ride). */
  gateRouteIds?: string[] | null;
  /** WP-J (breadcrumb trail): the rider's own ridden line, decimated GPS
   * fixes accumulated by RecordScreen (trailModel.ts). Rendered behind the
   * rider dot, casing+core styled the same as the route line. Only the
   * MapLibre rung draws it — the PNG rung has no equivalent (see file
   * header's rung notes) and is unaffected. */
  trail?: readonly TrailPoint[];
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
  const gatesOnly = props.gatesOnly ?? false;
  const id = props.routeId ?? defaultRouteId();
  const asset = !gatesOnly ? assetFor(id) ?? undefined : undefined;
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

  // Reverted 2026-08-24 (Nathan, live device feedback on WP-E): the
  // dotted-ahead/solid-behind split below used to call routeSplitFeatures()
  // and paint the 'ahead' segment with a MapLibre line-dasharray. On-device
  // that rendered as oversized yellow/black blobs whose size changed with
  // zoom level (a real MapLibre dasharray quirk, not a one-off) rather than
  // a clean dotted line — and since routeSplitFeatures treats "no rider yet"
  // and "off-route" as a whole-route 'ahead' feature, the broken dashing was
  // showing on the entire route before a GPS fix arrived (prestart), not
  // just as a rare edge case. Back to a single solid line, full stop — the
  // plain routeLineFeature() this app drew before WP-E's split existed.
  // routeSplitFeatures() itself is untouched in routeMapGeo.ts (still
  // exported, still tested) in case a future attempt at this wants it; this
  // file just no longer calls it. Self-contained (does not read the
  // `here`/`off` consts below, which are declared after the early-return
  // guard) so this hook keeps a stable call order regardless of
  // gatesOnly/asset on any render — Rules of Hooks: it must run
  // unconditionally, before the guard below.
  const routeFC = useMemo(() => {
    if (gatesOnly || !asset) return null;
    const feature = routeLineFeature(asset);
    return feature ? { type: 'FeatureCollection' as const, features: [feature] } : null;
  }, [asset, gatesOnly]);

  // WP-J (breadcrumb trail): always mounted, possibly-empty FeatureCollection
  // — computed unconditionally, same Rules-of-Hooks reason as routeFC above
  // (this hook must run before the riderOnly guard below on every render).
  // "Always mounted, not conditional" matters: maplibre-react-native adds
  // layers in MOUNT order, not JSX order, so a conditionally-mounted trail
  // source would mount AFTER the rider source and paint over the dot. An
  // always-mounted source (empty features when there's nothing to draw yet)
  // mounts at map-mount time, in JSX order, avoiding that z-stacking bug.
  const trailFC = useMemo(() => {
    const tail = props.lat !== null && props.lon !== null ? { lat: props.lat, lon: props.lon } : null;
    const f = props.trail && props.trail.length > 0 ? trailLineFeature(props.trail, tail) : null;
    return { type: 'FeatureCollection' as const, features: f ? [f] : [] };
  }, [props.trail, props.lat, props.lon]);

  // WP-D: gatesOnly has no single route asset to bail out on (unchanged). A
  // live surface (showRider) with no asset is now "rider-only" — real tiles
  // + the dot, no route line/ticks — instead of blank; a browse surface (no
  // rider) with no asset still has nothing useful to show and stays null.
  const riderOnly = !gatesOnly && !asset;
  if (riderOnly && !showRider) return null;

  const here = props.lat !== null && props.lon !== null;
  // D-025: off-route reads from the TRUE fix, same call the PNG rung makes.
  // gatesOnly / riderOnly: no single route to be off (the OFF ROUTE badge
  // below is suppressed the same way — there is nothing honest to measure
  // against).
  const off = !gatesOnly && here && asset
    ? offRouteM(asset, props.lat as number, props.lon as number) > OFF_ROUTE_M
    : false;

  // gatesOnly (WP-B, postdates this WP's brief): still one gate-rings circle
  // layer, drawing every route's gates at once via allGatesFeatureCollection
  // — a per-route tick heading doesn't generalize cleanly across a mixed
  // multi-route field, so this rung is deliberately left as circles rather
  // than guessing at a multi-route tick design (flagged in the handoff
  // notes). The single-route rung below gets the WP-E tick treatment.
  // WP-C: the gates-only field must also include user routes' (runtime-built)
  // gates — allRouteAssets() enumerates the whole catalog through the same
  // resolver assetFor() uses, seed routes included (manifest wins on those
  // by identity). Only built when gatesOnly is actually true.
  const drawable = gatesOnly ? allRouteAssets(assetDeps()) : ASSETS;
  const gatesFC = gatesOnly
    ? allGatesFeatureCollection(drawable, props.crossedGates, colors.neutral, props.gateRouteIds)
    : null;
  const gateTicksFC = !gatesOnly && asset ? gateTicksFeatureCollection(asset, props.gateColours) : null;
  // WP-sector-coloured-trail P1: null unless the caller supplied sector
  // colours AND the asset can honestly be split (path + matching gateIdx —
  // sectorSpansFeatureCollection's own null rule); the plain base line
  // alone then remains, exactly as today.
  const sectorSpansFC = !gatesOnly && asset && props.sectorColours
    ? sectorSpansFeatureCollection(asset, props.sectorColours)
    : null;
  const bounds = gatesOnly ? allGatesBounds(drawable, props.gateRouteIds) : asset ? routeBounds(asset) : null;

  // WP-D §3.1c: the camera-target rule itself lives in routeMapGeo.ts
  // (headlessly testable) — this is just wiring the live inputs through.
  // 'free' (Cycle 020, after a user drag/pinch) is handled inside
  // cameraTargetFor: no center/zoom/bounds/bearing at all, so a new GPS fix
  // never yanks the camera back under the rider.
  const cameraProps: Partial<CameraStop> = cameraTargetFor({
    mode,
    here: here ? { lat: props.lat as number, lon: props.lon as number } : null,
    bounds,
    zoom: camZoom,
    bearing: effectiveBearing,
  });

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
      {/* Cycle 023 fix 1 (day-mode style-swap race): `mapStyle` changing on a
          day<->night theme flip is a PROP update, and the native MapLibre view
          does not reliably tear down and reapply a whole style on a bare prop
          change — it can end up holding a half-applied style (day mode
          rendering broken until some unrelated remount). Keying the element
          on styleUrl forces React to unmount/remount the native view itself
          whenever the underlying style URL changes, guaranteeing a full
          reload rather than a partial one. Rendering-layer only: `mode` /
          `camZoom` / `bearing` etc. all live in this component, above this
          element, and are untouched by remounting the child. */}
      <M.Map
        key={styleUrl}
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
        {/* Reverted 2026-08-24: one solid line, casing beneath a yellow
            core, the whole route — see the routeFC comment above for why
            the dotted-ahead split was pulled back out. */}
        {routeFC ? (
          <M.GeoJSONSource key="route" id="route" data={routeFC}>
            <M.Layer id="route-casing" type="line"
              paint={{ 'line-color': CASING, 'line-width': 7 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
            <M.Layer id="route-core" type="line"
              paint={{ 'line-color': colors.neutral, 'line-width': 4 }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          </M.GeoJSONSource>
        ) : null}
        {/* WP-sector-coloured-trail P1 (ruled 2026-08-26): each sector's
            stretch of the line painted in the colour that sector earned,
            drawn OVER the base core — width 6 inside the width-7 casing,
            deliberately bolder than the width-4 core for the same reason
            WP-E's earned ticks are bolder: an earned-yellow sector
            (colors.neutral) must never be pixel-identical to an unscored
            stretch (D-013/D-030). Unearned sectors paint transparent, so the
            base yellow core shows through. Solid lines + the same
            data-driven ['has','colour'] expression family as the gate-ticks
            layer below — NO line-dasharray (the 2026-08-24 device-only
            dasharray bug class) and no line-gradient. Key === id per the
            cycle-025 frozen-id rule in the comment below. */}
        {sectorSpansFC ? (
          <M.GeoJSONSource key="sector-spans" id="sector-spans" data={sectorSpansFC}>
            <M.Layer id="sector-spans-core" type="line"
              paint={{
                'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
                'line-width': 6,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          </M.GeoJSONSource>
        ) : null}
        {/* WP-J (breadcrumb trail): the rider's own ridden line, casing+core
            styled exactly like the route line above (same CASING/colors.neutral,
            same widths). Always mounted (see trailFC comment above for why —
            mount-order z-stacking, not JSX order) — an empty FeatureCollection
            when there's no trail yet, so this source claims its mount slot
            ahead of the rider dot on every render regardless of `trail`. */}
        <M.GeoJSONSource key="trail" id="trail" data={trailFC}>
          <M.Layer id="trail-casing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 7 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          <M.Layer id="trail-core" type="line"
            paint={{ 'line-color': colors.neutral, 'line-width': 4 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        {/* Cycle 025: every source carries key === id. MapLibre freezes a child's
            `id` on first render (useFrozenId) and throws "`id` cannot be changed"
            if the same mounted element later gets a different id. The ternary
            below swaps id="gates" <-> id="gate-ticks" at ONE React position when
            RecordScreen's gatesOnly (live.mode === 'free') flips while the map is
            mounted — proven at free-ride END (engine.stop() resets mode to 'route'
            and emits before RecordScreen leaves phase 'running'), killing the whole
            map tree on new-landmark rides. Distinct keys make React unmount/remount
            the source (and its layers) instead of rebinding the id. Sources only:
            <M.Map>'s own key={styleUrl} (cycle 023) is left alone — a whole-map
            remount here would pay B-71's camera-state cost for nothing. */}
        {gatesOnly ? (
          <M.GeoJSONSource key="gates" id="gates" data={gatesFC!}>
            <M.Layer id="gate-rings" type="circle" paint={{
              'circle-radius': 6,
              'circle-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
              'circle-stroke-color': CASING,
              'circle-stroke-width': 2,
            }} />
          </M.GeoJSONSource>
        ) : gateTicksFC ? (
          // WP-E: circles replaced with a short tick perpendicular to the
          // route. Reverted 2026-08-24 (Nathan, live device feedback): the
          // unscored fallback used to be t.textDim (a dim theme-aware grey)
          // which read as almost invisible on device — now every tick gets
          // the same casing+core treatment as the route line itself
          // (gate-ticks-casing: a black outline, drawn first/underneath;
          // gate-ticks: a yellow core, colors.neutral, same as the route
          // line's own colour) until the sector is scored.
          // Opus verification catch (2026-08-24, same pass): colors.neutral
          // IS the yellow tier's colour (chips.tsx's YELLOW_TIER), so a gate
          // genuinely scored to the ordinary/yellow tier would otherwise be
          // pixel-identical to an unscored gate — a real D-013/D-030 honesty
          // regression, not just a style nit (a route with no scored history
          // must never look like a scored ordinary lap; chips.tsx makes the
          // same call for 'neutral'). Unscored ticks stay yellow (Nathan
          // asked for that, and the casing alone already fixes the
          // visibility complaint) but thinner and slightly translucent, so a
          // genuinely-earned tier colour (full width, full opacity — any
          // tier, yellow included) still reads as visibly different/bolder.
          // WP-N: line-cap round on both layers, matching the route line
          // itself (which was already round) — was 'butt' on these two.
          <M.GeoJSONSource key="gate-ticks" id="gate-ticks" data={gateTicksFC}>
            <M.Layer id="gate-ticks-casing" type="line"
              paint={{ 'line-color': CASING, 'line-width': 5 }}
              layout={{ 'line-cap': 'round' }} />
            <M.Layer id="gate-ticks" type="line" paint={{
              'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.neutral],
              'line-width': ['case', ['has', 'colour'], 3, 2],
              'line-opacity': ['case', ['has', 'colour'], 1, 0.6],
            }} layout={{ 'line-cap': 'round' }} />
          </M.GeoJSONSource>
        ) : null}
        {showRider && here ? (
          <M.GeoJSONSource key="rider" id="rider" data={riderFeature(props.lat as number, props.lon as number)}>
            {/* WP-E: the rider dot no longer shares colors.neutral with the
                route line (a yellow dot on a yellow line is poor contrast) —
                on-route is solid riderBlue/white, off-route is inverted
                (hollow white/riderBlue ring), same convention on both
                rungs. */}
            <M.Layer id="rider-dot" type="circle" paint={{
              'circle-radius': 7,
              'circle-color': off ? '#FFFFFF' : colors.riderBlue,
              'circle-stroke-color': off ? colors.riderBlue : '#FFFFFF',
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
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>
          {'OFF ROUTE · >120 m from the route line'}
        </Text>
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
  const id = props.routeId ?? defaultRouteId();
  const asset = assetFor(id) ?? undefined;
  const img = id !== null ? IMAGES[id] : undefined;
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

  // WP-B: this rung is a single pre-rendered PNG per route (see the file
  // header) — it cannot honestly draw a 20-route (or filtered-but-still-
  // multi-route) gate field. Say so plainly rather than drawing one route's
  // PNG and pretending it is the whole gates-only picture. The phone runs
  // MapLibre since build 4, so this degraded frame is the fallback rung's
  // fallback — reachable only when the native module truly is not there.
  const gatesOnly = props.gatesOnly ?? false;
  if (gatesOnly) {
    return (
      <View style={[
        st.frame,
        props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
        { backgroundColor: t.race.bg, borderColor: t.cardBorder },
        dimmed && st.dimmedFrame,
      ]}>
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>
          gates map needs the tile map
        </Text>
        <Credit rung="png" interactive={interactiveCredit} />
      </View>
    );
  }

  // WP-D §3.3: mirror the gatesOnly degraded frame above instead of
  // returning null, for a live surface (showRider) with no route asset —
  // this rung genuinely cannot draw a basemap without a per-route PNG (no
  // tiles, no path to project the dot onto), so there is nothing to show but
  // the frame + a message. Browse surfaces (no rider) still render nothing —
  // same rule as the MapLibre rung's `riderOnly` guard. No Credit: no image
  // was drawn, so there is no imagery source to attribute.
  if (!asset) {
    if (!showRider) return null;
    return (
      <View style={[
        st.frame,
        props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
        { backgroundColor: t.race.bg, borderColor: t.cardBorder },
        dimmed && st.dimmedFrame,
      ]}>
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>
          map needs the tile map
        </Text>
      </View>
    );
  }

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

  // WP-E dotted-ahead, PNG rung: the route line is BAKED into the PNG, so
  // there is no way to split it — accepted rung degradation. In the
  // imgFailed segment fallback ONLY, dim the segments from the rider's
  // nearest-on-path point onward (opacity 0.4) as the poor man's dotted-
  // ahead, mirroring the MapLibre rung's earned-position rule: only when
  // live/active and genuinely on-route (never invent a "behind" claim off-
  // route or when browsing/finished — same honesty rule as routeSplitFeatures).
  const routeActive = variant === 'live' && liveState !== 'finished';
  const splitSeg = imgFailed && routeActive && !off && asset.path
    && props.lat !== null && props.lon !== null
    ? nearestOnPath(asset.path, props.lat, props.lon)?.seg ?? null
    : null;

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
              // WP-E poor-man's dotted-ahead: segments from the rider's
              // nearest-on-path point onward read as "suggestion" too, same
              // as the MapLibre rung's dashed ahead-line.
              const dimmed = splitSeg !== null && i >= splitSeg;
              return (
                <View key={i} style={{
                  position: 'absolute', left: x0, top: y0 - 1.5,
                  width: len, height: 3, backgroundColor: colors.neutral,
                  opacity: dimmed ? 0.4 : 1,
                  transform: [{ translateX: 0 }, { rotate: `${ang}deg` }],
                  transformOrigin: 'left center',
                }} />
              );
            })
          )}
          {/* WP-E: circles replaced with a rotated tick bar perpendicular to
              the route (gateTickPx), same reasoning as the MapLibre rung —
              though this PNG is a light basemap in both themes (D-031) so
              the dim-neutral colour here is CASING (near-black), not
              t.textDim. len is clamped to >=10px so a tick stays visible
              even at zoom 1 (whole-route FIT). */}
          {asset.gates.map((g, i) => {
            const col = props.gateColours?.[i] ?? null;
            const tick = gateTickPx(asset, i);
            const x0 = tick.x0 * crop.scale + crop.translateX;
            const y0 = tick.y0 * crop.scale + crop.translateY;
            const x1 = tick.x1 * crop.scale + crop.translateX;
            const y1 = tick.y1 * crop.scale + crop.translateY;
            const len = Math.max(Math.hypot(x1 - x0, y1 - y0), 10);
            const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
            return (
              <View key={g.name} style={{
                position: 'absolute', left: x0, top: y0 - 1.5,
                width: len, height: 3,
                backgroundColor: col ?? CASING,
                transform: [{ translateX: 0 }, { rotate: `${ang}deg` }],
                transformOrigin: 'left center',
              }} />
            );
          })}
          {here ? (
            <View style={[st.dot, {
              left: here.px * crop.scale + crop.translateX - 7,
              top: here.py * crop.scale + crop.translateY - 7,
              backgroundColor: off ? '#FFFFFF' : colors.riderBlue,
              borderColor: off ? colors.riderBlue : '#FFFFFF',
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
        <Text style={[st.badge, { color: colors.amber, backgroundColor: t.race.card }]}>
          {'OFF ROUTE · >120 m from the route line'}
        </Text>
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
  // WP-E: gate ticks are drawn as inline-styled bars (rotation/length vary
  // per gate) rather than a shared style — st.gate (the old fixed 12x12
  // circle) is gone.
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: 14, borderWidth: 2 },
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
