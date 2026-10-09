/**
 * The live route map (B-50, Nathan 2026-08-17): MapLibre + real tiles. The
 * pre-rendered PNG compositor that used to be the fallback rung (and its
 * draw-the-line-as-segments sub-rung) was retired in virgin-cycle22 05 (Nathan
 * 2026-10-05): offline the map now behaves like Google Maps / Waze — the style
 * falls back to a bundled background-only style (wayMapStyle.ts
 * offlineMapStyle) and the route line, gates, trail and rider dot still draw
 * on it; a missing native module shows one `map unavailable` badge. Mentions
 * of "the PNG rung" further down this file are history, kept as written.
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
 *    the Routes/Result screens): pan/zoom/rotate gestures on (WP-M: two-finger
 *    rotation everywhere except moving/stopped; FIT resets north (virgin-cycle27 08)), zoom bar
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
 *
 * WP-E (2026-09-03): on an empty-seed build `ASSETS` and `IMAGES` are `{}`
 * (store/seed.ts `bundledForSeedMode`), so the resolver's "manifest FIRST"
 * step finds nothing and only routes made on the phone are drawable;
 * DemoScreen supplies its own fixture through the `asset` prop.
 *
 * WP-M (2026-09-05, Nathan Q3): two-finger rotation is on on every map except
 * the actual race ribbon (`rotateEnabledFor()`, routeMapGeo.ts — mirrors the
 * `unlocked` matrix: browse/prestart/finished, not moving/stopped). A held
 * `userBearing` state, read back from `onRegionDidChange`, composes with the
 * existing `effectiveBearing`/course-up rule downstream in `cameraTargetFor`
 * so it is not lost on `+`/`−`/FIT/ME or a mode reset. FIT in the
 * zoom bar (virgin-cycle27 08; was a compass button) resets it to
 * north-up via an imperative `cameraRef.setStop({ bearing: 0 })` (the
 * declarative push is a no-op once a drag has flipped `mode` to 'free').
 * PNG rung untouched — a cropped bitmap cannot rotate.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import manifest from '../../assets/ways/ways.json';
import { offWayM, type WayAsset } from './wayMapMath.ts';
import { nextGateOnTap } from './gateAdjustModel.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { SEED_MODE, bundledForSeedMode } from '../store/seed.ts';
import { refFor } from '../live/refs.ts';
import { resolveWayAsset, type WayAssetDeps } from './wayAssetRuntime.ts';
import {
  bearingBetween, cameraTargetFor, fitMeNextMode,
  gateHalfLenM, gateTicksFeatureCollection, metresBetween, riderFeature, rotateEnabledFor, wayBounds,
  sectorSpansFeatureCollection, trailBounds, placeFeatureCollection, placeBounds,
  buildPassModel, faintVertices, gateFaint, routeRunsFeatureCollection, FAINT_OPACITY,
} from './wayMapGeo.ts';
import { trailLineFeature, type TrailPoint } from './trailModel.ts';
import { selfsFeatureCollection, type SelfDot } from './selfRaceModel.ts';
import { tierLineColour } from './tierColour.ts';
import { mapStyleFor, offlineMapStyle, patchMapStyle } from './wayMapStyle.ts';
import { cachedPatchedStyles, rememberPatchedStyles } from './mapStyleCache.ts';
import { MapCover, useMapCover } from './mapCover.tsx';
import { colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';
import { CREDIT_AUTO_HIDE_MS, creditFor, type MapRung } from './mapCreditModel.ts';
import type { CameraRef, CameraStop } from '@maplibre/maplibre-react-native';

/** Shape of the MapLibre `onRegionWillChange` event we actually read.
 * Typed structurally rather than importing `ViewStateChangeEvent` (Cycle
 * 020: no node_modules in this sandbox to confirm the root-level re-export
 * resolves; this is the brief's documented fallback — narrow but correct
 * for what we use). */
type RegionWillChangeEvent = { nativeEvent: { userInteraction: boolean } };
/** WP-M: `onRegionDidChange` fires once when a gesture/animation ENDS and
 * carries the full ViewState; we read `bearing`, guarded by the same
 * `userInteraction` check (our own camera pushes must not be read back as
 * rider intent). `zoom` is read unconditionally (cycle virgin-cycle10):
 * fired for BOTH gesture and programmatic camera moves (e.g. a 'fit'
 * push), so it is the only place that observes the map's true rendered
 * zoom — the local `camZoom` state only reflects the +/- follow-zoom
 * control and is never updated by MapLibre's own bounds-fit zoom
 * calculation. Field name confirmed against the installed
 * @maplibre/maplibre-react-native (11.3.6) type
 * `ViewStateChangeEvent = ViewState & { animated; userInteraction }`,
 * where `ViewState = { center; zoom; bearing; pitch; bounds }` — `zoom`
 * sits alongside the `bearing` field this handler already reads from
 * the same event. */
type RegionDidChangeEvent = { nativeEvent: { userInteraction: boolean; bearing: number; zoom: number } };
/** WP-J (gate-adjust card): the shape of a GeoJSONSource press event we
 * actually read. Typed structurally (not importing MapLibre's own
 * `PressEventWithFeatures`) — under `strict: true`, `properties` must be
 * typed as possibly-null to match GeoJSON.Feature.properties. */
type GatePressEvent = { nativeEvent: { features?: { properties?: Record<string, unknown> | null }[] } };

// Lazy native-module load, at module scope: the dev client installed before
// build 4 has no MapLibre native module, so a bare `import` would crash the
// whole bundle. `require` inside a try/catch fails soft instead — this file
// then renders one `map unavailable` badge (virgin-cycle22 05; the PNG rung
// that used to take over is retired), and Fast Refresh keeps working, never a
// red screen. Build 4 (the dev-client rebuild, 2026-08-17) made ML real on
// every build since; this try/catch is the last guard for an old dev client.
let ML: typeof import('@maplibre/maplibre-react-native') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ML = require('@maplibre/maplibre-react-native');
} catch {
  ML = null;
}

/** WP-E: the bundled manifest — `{}` on an empty-seed (virgin) build, so
 * resolveRouteAsset()/allRouteAssets() (via assetDeps()) and every other
 * reader see no shipped route at all. Policy lives in store/seed.ts. */
const ASSETS: Record<string, WayAsset> = bundledForSeedMode(
  SEED_MODE, (manifest as unknown as { ways: Record<string, WayAsset> }).ways,
);
/** live/refs.ts's refFor() throws on an unknown track rather than returning
 * null (userRefs.ts's own fallback inside it already returns null there) —
 * swallow to null here so routeAssetRuntime's injected-deps contract can
 * report "no ref" uniformly, without a try/catch at every call site. */
const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };
function assetDeps(): WayAssetDeps {
  return { manifest: ASSETS, catalog: currentCatalog(), refFor: safeRefFor };
}
/** WP-C: resolves an id to a RouteAsset — bundled manifest first, a
 * runtime-built asset from the route's ref + gate chainages second. null
 * when neither exists (unknown id, or a user route with no ref/gate set
 * yet). */
function assetFor(id: string | null): WayAsset | null {
  return id === null ? null : resolveWayAsset(id, assetDeps());
}
/** Beyond this the rider is drawn as off-route rather than on the line. */
const OFF_WAY_M = 120;

/** D-031 light-basemap palette — must match 08_build_route_assets.py.
 * GROUND_FILL (the old gate-circle unscored fill, '#E8E4DA') is gone with
 * WP-E — the PNG rung's unscored ticks use CASING instead (see gate tick
 * rendering below). */
const CASING = '#14120C';
/** virgin-cycle21 03: the empty collection every always-mounted source falls back to
 * (MapLibre paints sources in MOUNT order, so every source except the rider is
 * mounted from the first render and the rider dot always paints last). */
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

/** MapLibre styles used for the tile rung, one per theme mode (Nathan
 * 2026-08-18): dark basemap at night (yellow line on black is the brand),
 * OpenFreeMap positron (light grey) in daylight. Fetched and runtime-patched
 * (labels + palette firewall, routeMapStyle.ts) — see MapLibreRouteMap. */
const MAP_STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';
const MAP_STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron';

/** Course-up bearing holds until a fix has actually moved this far — cheap
 * jitter guard against a GPS fix wobbling the heading while stationary. */
const BEARING_MIN_MOVE_M = 8;

/** virgin-cycle22 05: the style fetch retries while this map is mounted, so a
 * map opened with no signal picks the real (patched) style up when the
 * connection returns. Three attempts after the first, then it stops; a
 * remount (next tab visit, next ride) starts over. */
const STYLE_RETRY_MS: readonly number[] = [5000, 15000, 45000];

type WayMapVariant = 'live' | 'browse';
type LiveMapState = 'prestart' | 'moving' | 'stopped' | 'finished';
/** virgin-cycle23 brief 01: how much of the map a finger may move.
 * 'full' (default) = today's behaviour on every existing surface.
 * 'twoFinger' = one finger does nothing on the map, two fingers pinch-zoom (a
 * pinch also pans); no double-tap zoom, no rotation, no zoom bar. Built for the
 * feed card (brief 02); the feed now uses 'readonly' (brief 04, Nathan
 * 2026-10-07) and no surface passes 'twoFinger' today — the code path stays.
 * 'readonly' = a picture: no gesture at all, the native view takes NO touches
 * (pointerEvents none on its wrapper) so everything falls through to the parent.
 * The ONE place the feed picks between the last two is CARD_MAP_GESTURES in
 * activityCard.tsx (brief 02). */
export type WayMapGestures = 'full' | 'twoFinger' | 'readonly';

type WayMapProps = {
  /** The route whose line/ticks to draw. null = NO route line: a live surface renders
   * rider-only (WP-D), a browse surface renders trail-only (WP-H). There is no
   * catalog-wide fallback any more (cycle-2 WP-A, Nathan 2026-09-04: a null pick must
   * never draw "whichever route happens to be first in the catalog"). */
  wayId: string | null;
  /** WP-E: a caller-OWNED drawable. When set, both rungs draw THIS asset and
   * skip the id -> asset lookup entirely — neither the bundled manifest nor
   * the runtime resolver is consulted, and `routeId` is used only as the
   * zoom-reset/PNG key. Only DemoScreen passes it (its scripted fixture is
   * not a catalog route and must never be resolvable as one). */
  asset?: WayAsset;
  lat: number | null;
  lon: number | null;
  /** 1 = whole route, 4 = tight live crop */
  zoom?: number;
  height?: number;
  /** fill the parent instead of a fixed height — race mode (Cycle 020,
   * Nathan 2026-08-19). Takes precedence over `height` when true. */
  fill?: boolean;
  /** virgin-cycle23 brief 04: no border, no corner radius (the feed card's
   * edge-to-edge map, like the MAP tab). Default false = the bordered rounded
   * frame every other surface has. Height/fill behave exactly as without it. */
  bleed?: boolean;
  /** colour per crossed gate, index 0 = START. Gates ahead stay dark; a gate
   * only takes a colour once its sector has actually been scored. */
  gateColours?: (string | null)[];
  /** WP-sector-coloured-trail P1 (ruled 2026-08-26): GATE-indexed sector
   * verdict colours — index i colours the SECTOR ending at gate i (the line
   * span between gates i-1 and i); index 0 (START) is ignored. When present
   * the MapLibre rung overlays one coloured span per earned sector on top of
   * the base line. The PNG rung cannot honour it (the line is baked into the
   * image) — accepted rung degradation, same as WP-E's dotted-ahead.
   * WP-K: also passed by the live rung (RecordScreen) and the ride-detail
   * screen; see sectorTrailModel.ts for the builders and the ALL_YELLOW
   * convention. */
  sectorColours?: (string | null)[];
  /** Colour for the untimed lead-in (start -> first gate) and lead-out
   * (last gate -> end) stretches. Only honoured when `sectorColours` is also
   * given (a plain browse/first-ride map draws no spans at all). Callers pass
   * the theme's NO-DATA grey: these stretches are never a sector, so they are
   * not "unearned yet" like a transparent sector span — they are permanently
   * non-scorable. Kept as a plain string so this file stays the only place
   * that knows about the map layers, not the theme. */
  leadColour?: string;
  /** 'live' (default) = the recording ribbon; 'browse' = a free-standing
   * pannable map with no live semantics (Routes list, Result "view trace"). */
  variant?: WayMapVariant;
  /** Only meaningful for variant 'live'. Default 'moving' — today's locked
   * ribbon. 'prestart'/'finished' unlock the map like 'browse' does;
   * 'stopped' keeps it locked but dims it (a red light is not a finish). */
  liveState?: LiveMapState;
  /** Default true. false skips the rider dot/source and the waiting-for-GPS
   * badge — browse surfaces have no rider by contract. */
  showRider?: boolean;
  /** virgin-cycle15 brief 12 (Nathan 2026-09-27): a PLACE surface — the
   * ROUTES-tab place detail. Draws one yellow disc of `radiusM` real metres
   * (the landmark's arrival radius, catalog.ts landmarkAt) at lat/lon, an
   * outline and a centre dot; no route line, no gates, no rider. Camera fits
   * the disc. Only meaningful with `wayId` null. MapLibre rung only; the PNG
   * rung shows a degraded frame. */
  place?: { lat: number; lon: number; radiusM: number } | null;
  /** WP-J (breadcrumb trail): the rider's own ridden line, decimated GPS
   * fixes accumulated by RecordScreen (trailModel.ts). Rendered behind the
   * rider dot, casing+core styled the same as the route line. Only the
   * MapLibre rung draws it — the PNG rung has no equivalent (see file
   * header's rung notes) and is unaffected. */
  trail?: readonly TrailPoint[];
  /** virgin-cycle15 07 (replay drift): the ride's OWN recorded fixes, drawn as one thin
   * riderBlue line BENEATH the route line (mount order: this source is the first child
   * after the camera, so route/trail/spans/gates/selfs/rider all paint over it). It shows
   * only where the ride left the reference by more than the route casing's half-width —
   * and the replay dot always sits on it, because riderPositionAt interpolates between
   * these very fixes. riderBlue on purpose: the dot's own hue, readable on both basemaps
   * (a t.textDim line "read as nothing" on the night basemap — see the gate-ticks note
   * below), not a tier colour (D-030). MapLibre rung only; the PNG rung ignores it (same
   * accepted degradation as `trail`/`selfs`). Only ReplayScreen passes it. */
  rideTrace?: readonly TrailPoint[];
  /** virgin-cycle6: past rides of this way replayed as dots (selfRaceModel.ts).
   * Drawn by the MapLibre rung only, BELOW the rider dot (mount order).
   * undefined/[] = the source still mounts, empty. The PNG rung ignores it
   * (accepted degradation, same as sectorColours). */
  selfs?: readonly SelfDot[];
  /** WP-J (gate-adjust card, 2026-09-05): gate selection on a browse map.
   * `selected` is the gate index to ring (null = none); `onPress` fires with
   * the tapped gate's index (MapLibre rung only — the PNG rung has no
   * per-feature hit test, the card's chip row covers selection there).
   * Selection is UI state, not a verdict: the ring is riderBlue, never a
   * tier colour (D-013/D-030). */
  gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };
  /** virgin-cycle26 brief 04 (Nathan 2026-10-08): the rider's progress in
   * metres along the drawn path — the live engine's forward-only chainage
   * (RecordScreen), the recorded chainage (ReplayScreen) or progressAtTime
   * (DemoScreen). When set, the copy of a retraced stretch (and its gates and
   * sector spans) that the rider is NOT on draws at FAINT_OPACITY until the
   * rider is within FADE_NEAR_M of it (wayMapGeo.ts faintVertices). Absent or
   * null = today's drawing. MapLibre rung only. */
  progressM?: number | null;
  /** virgin-cycle23 brief 01: see WayMapGestures. Default 'full'. */
  gestures?: WayMapGestures;
};

export default function WayMapView(props: WayMapProps) {
  const { t } = useTheme();
  if (ML === null) {
    // virgin-cycle22 05: no native module = no map renderer at all (the PNG
    // rung that used to take over is retired). One honest badge, nothing drawn.
    const h = props.height ?? 190;
    return (
      <View style={[
        props.bleed ? st.frameBleed : st.frame,
        props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h },
        { backgroundColor: t.race.bg, borderColor: t.cardBorder },
      ]}>
        <Text style={[st.badge, { color: t.textDim, backgroundColor: t.race.card }]}>map unavailable</Text>
      </View>
    );
  }
  return <MapLibreWayMap {...props} maplibre={ML} />;
}

// --------------------------------------------------------------- attribution

/** virgin-cycle14 brief 05 (Nathan #8, tester
 * feedback): the credit is a small round "i" in the bottom-right corner,
 * not a line of text across the map. Tapping it opens the "Map data
 * sources" card in-frame (no Modal, no backdrop — nothing may eat map
 * gestures, cycle 020); the card closes on a tap of "i" or of itself, or
 * by itself after CREDIT_AUTO_HIDE_MS. Interactive on every surface — an
 * inert "i" is a broken control — and merely dimmed while the live ribbon
 * is locked, the same relaxation D-006 already made for the zoom bar. The
 * wording (mapCreditModel.ts) is a licence obligation and is never
 * shortened; MapLibre's own attribution control is off on <M.Map>, so this
 * overlay is the only credit on the tile rung. Never a tier colour: a
 * credit in purple/green/yellow would read as a signal. */
export function Credit(props: { rung: MapRung; locked: boolean }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const { label, rows } = creditFor(props.rung);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), CREDIT_AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [open]);
  return (
    <>
      {open ? (
        <Pressable
          style={[st.creditCard, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close map data sources"
        >
          <Text style={[st.creditTitle, { color: t.text }]}>Map data sources</Text>
          {rows.map((r) => (
            <Text key={r.source} style={[st.creditRow, { color: t.text2 }]}>
              {r.source} — {r.role}
            </Text>
          ))}
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          st.creditBtn,
          { backgroundColor: t.race.card, borderColor: t.cardBorder },
          props.locked && st.creditBtnLocked,
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Map data sources: ${label}`}
      >
        <Text style={[st.creditBtnText, { color: t.textDim }]}>i</Text>
      </Pressable>
    </>
  );
}

// -------------------------------------------------------------- MapLibre rung

function MapLibreWayMap(props: WayMapProps & { maplibre: NonNullable<typeof ML> }) {
  const { maplibre: M } = props;
  const { t, mode: themeMode } = useTheme();
  const styleUrl = themeMode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY;
  const id = props.wayId;
  const asset = props.asset ?? assetFor(id) ?? undefined;
  const h = props.height ?? 190;

  const variant = props.variant ?? 'live';
  const liveState = props.liveState ?? 'moving';
  const showRider = props.showRider ?? true;
  const gestures: WayMapGestures = props.gestures ?? 'full';
  const oneFingerOn = gestures === 'full';          // dragPan, double-tap zooms, rotation, zoom bar
  const pinchOn = gestures !== 'readonly';           // touchZoom (a pinch also pans)

  // Behaviour matrix (design contract A). "unlocked" = free browse gestures,
  // labels on, zoom bar visible: browse surfaces, the pre-start map, and the
  // finished ribbon (released back to browse). Everything else (moving,
  // stopped) is today's locked, label-free, control-free ribbon — D-006.
  const unlocked = variant === 'browse' || liveState === 'prestart' || liveState === 'finished';
  // WP-M: deliberately NOT `= unlocked` — the two rules happen to match today
  // (both are "released back to browse"), but keeping them as separate calls
  // means the scope of gesture rotation can diverge later (e.g. if the
  // `finished` judgment call in the brief gets overruled) without a hidden
  // coupling to the labels/zoom-bar matrix above.
  const rotateEnabled = rotateEnabledFor(variant, liveState) && oneFingerOn;
  const dimmed = variant === 'live' && liveState === 'stopped';
  const creditLocked = variant === 'live' && (liveState === 'moving' || liveState === 'stopped');

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
  }, [props.zoom, variant, phaseKey, props.wayId]);

  const [camZoom, setCamZoom] = useState(16);
  // Cycle virgin-cycle10: the map's actual current zoom, read back from
  // onRegionDidChange below (fires on 'fit' pushes too, unlike camZoom
  // which only tracks the +/- follow control). null until the map has
  // reported a region change at least once; gateHalfLenM below falls
  // back to camZoom (the existing follow-zoom default) until then.
  const [liveZoom, setLiveZoom] = useState<number | null>(null);

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

  // WP-M: the bearing the rider turned the map to with two fingers, read
  // back from onRegionDidChange (below). null = no rotation intent yet — the
  // camera keeps using effectiveBearing as today. A number = hold THIS
  // bearing on every camera push (+/-/FIT/ME/mode resets) until FIT (virgin-cycle27 08)
  // sets it back to 0. Per map instance, never persisted (one mount
  // of one map; RECORD's prestart and running phases are different mounts,
  // ROUTES renders one map per card, and an app-restart-persisted rotation
  // would surprise on the next ride).
  const [userBearing, setUserBearing] = useState<number | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  // Belt-and-braces guard #1: today no mount goes rotate-on -> rotate-off
  // (prestart and running are different <RouteMapView> mounts in
  // RecordScreen), but if that ever changes a stale user bearing must not
  // override the live course-up.
  useEffect(() => { if (!rotateEnabled) setUserBearing(null); }, [rotateEnabled]);
  // Belt-and-braces guard #2 (Inspect findings, load-bearing not cosmetic):
  // RecordScreen's `armed` and `running` branches place <RouteMapView> at the
  // same child index of an identical <View style={styles.raceColumn}>, so
  // React REUSES the same component instance across the prestart->moving
  // transition (pressing START does not remount the map) — the effect above
  // fires but only on the NEXT render, leaving a one-render window where the
  // camera could animate back from a held rotation before it does. Passing
  // `rotateEnabled ? userBearing : null` straight into cameraTargetFor below
  // closes that window immediately, not on the following render.
  const resetNorth = () => {
    setUserBearing(0); // sticky "north-up, and stay there" intent — see
    // routeMapGeo.ts's cameraTargetFor doc for why 0-not-null on a finished
    // map (which holds a course-up effectiveBearing, not 0).
    try {
      cameraRef.current?.setStop({ bearing: 0, duration: 400, easing: 'ease' });
    } catch {
      // map not initialised yet — the declarative push below will apply
      // userBearing=0 on the next render instead.
    }
  };

  // Runtime style patch (design contract B): fetch the online style once,
  // memoize BOTH a labels-on and a labels-off copy. Until it arrives (or if
  // it never does) the native view is handed the plain styleUrl and loads it
  // itself — from MapLibre's own cache when offline, which is why a region
  // seen before stays detailed with no signal.
  // virgin-cycle22 05 (Nathan 2026-10-05, PNG rung retired): if the NATIVE
  // load fails too (onDidFailLoadingMap before any onDidFinishLoadingStyle —
  // first open with no signal, nothing cached) the view keeps running on
  // offlineMapStyle(): an empty basemap in the frame colour on which every
  // local source below (route, gates, trail, spans, selfs, rider) still draws.
  // The fetch retries (STYLE_RETRY_MS) so the real style takes over when the
  // connection returns; patchedStyles always wins once set. Each change of
  // the chosen style remounts the native view (mapStyleFor, virgin-cycle22 09).
  // virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): start on the copies
  // this session already fetched for this URL (mapStyleCache.ts), so a remounted map opens
  // directly on the patched rung — one native start instead of url -> patched.
  const [patchedStyles, setPatchedStyles] = useState<{ url: string; labelsOn: unknown; labelsOff: unknown } | null>(() => cachedPatchedStyles(styleUrl));
  const [styleFailed, setStyleFailed] = useState(false);
  const styleLoadedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setStyleFailed(false);
    styleLoadedRef.current = false;
    const cached = cachedPatchedStyles(styleUrl);
    if (cached !== null) {
      setPatchedStyles(cached);
      return undefined;
    }
    const attempt = async (n: number) => {
      try {
        const res = await fetch(styleUrl);
        const json: unknown = await res.json();
        if (cancelled) return;
        setPatchedStyles(rememberPatchedStyles({
          url: styleUrl,
          labelsOn: patchMapStyle(json, { hideLabels: false }),
          labelsOff: patchMapStyle(json, { hideLabels: true }),
        }));
      } catch {
        // offline or the server is down: native keeps whatever it has; retry.
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
  const hideLabels = !unlocked;
  // virgin-cycle22 09 (Nathan 2026-10-06): the style AND the <M.Map> key come
  // from one pure call — see mapStyleFor's doc. A mounted native view must
  // never be handed a different mapStyle prop: on Android that re-adds the
  // sources in HashMap order (gates under the line, spans over the dot) or,
  // if the first style is still loading, drops the queued layers (no line at
  // all) — exactly the RECORD cold-start picture. Keyed, every rung change
  // (url -> patched, labels on <-> off at START/finish, url -> offline ->
  // patched) remounts the native view and a fresh mount adds the children in
  // JSX order, like every screen that was already right.
  const { style: mapStyle, key: mapStyleKey } = mapStyleFor({
    styleUrl,
    // A patched style belongs to the theme URL it was fetched for: after a day/night flip the old
    // one must not be used, or the new fetch would swap the style in place on the mounted view.
    patched: patchedStyles?.url === styleUrl ? patchedStyles : null,
    styleFailed,
    hideLabels,
    offline: offlineMapStyle(t.race.bg),
  });
  // A remount is a new camera: in 'free' mode cameraTargetFor pushes nothing
  // and the fresh view would open on MapLibre's world default, so every key
  // change restarts from initialMode (the phase/zoom/way effect above already
  // does this for START and the finish; this covers the fetch arriving).
  useEffect(() => {
    setMode(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleKey]);
  // virgin-cycle27 12: a cover in the frame colour sits over the native view from every (re)mount
  // until the style has loaded and a frame has fully rendered (mapCover.tsx / mapCoverModel.ts);
  // never when the style failed (the offline fallback stays visible). Keyed on mapStyleKey so a
  // native remount gets a fresh opaque cover. Hook order: above the asset guard below, like the
  // other hooks here.
  const cover = useMapCover(mapStyleKey, styleFailed);

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
  // asset on any render — Rules of Hooks: it must run
  // unconditionally, before the guard below.
  // virgin-cycle26 brief 04: pass model once per asset; faint flags at most
  // every 10 m of progress; the route FC splits into runs only when something
  // is faint (otherwise it is today's single feature). All three hooks run
  // unconditionally (Rules of Hooks — see the comment above).
  const progressKey = props.progressM === null || props.progressM === undefined ? null : Math.round(props.progressM / 10);
  const passModel = useMemo(() => (asset ? buildPassModel(asset) : null), [asset]);
  const faintVerts = useMemo(
    () => (passModel && progressKey !== null ? faintVertices(passModel, progressKey * 10) : null),
    [passModel, progressKey],
  );
  const wayFC = useMemo(() => (asset ? routeRunsFeatureCollection(asset, faintVerts) : null), [asset, faintVerts]);

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

  // virgin-cycle15 07: always-mounted, possibly-empty (same mount-order reasoning as
  // trailFC). No `tail` — a full trace must not get a straight leg from its last fix back
  // to the current dot.
  const rideTraceFC = useMemo(() => {
    const f = props.rideTrace && props.rideTrace.length > 1 ? trailLineFeature(props.rideTrace) : null;
    return { type: 'FeatureCollection' as const, features: f ? [f] : [] };
  }, [props.rideTrace]);

  // virgin-cycle6 (self racing): always-mounted, possibly-empty
  // FeatureCollection — same Rules-of-Hooks / mount-order reasoning as
  // trailFC above (must run before the riderOnly guard below, and must not
  // be conditional on props.selfs or its source would mount AFTER the rider
  // source and paint over the dot — see the comment block above trailFC).
  const selfsFC = useMemo(() => {
    return selfsFeatureCollection(props.selfs ?? []);
  }, [props.selfs]);

  // WP-J (gate-adjust card): the selected gate's ring — always-mounted when
  // gateSelect is given (empty when nothing is selected) so it takes a mount
  // slot ABOVE the gate-ticks source (mount order, see trailFC's comment
  // above). Computed unconditionally, same Rules-of-Hooks reason as
  // routeFC/trailFC (must run before the riderOnly guard below).
  const gateSelectedFC = useMemo(() => {
    const sel = props.gateSelect?.selected ?? null;
    const g = sel !== null && asset ? asset.gates[sel] : undefined;
    return {
      type: 'FeatureCollection' as const,
      features: g ? [riderFeature(g.lat, g.lon)] : [],
    };
  }, [asset, props.gateSelect?.selected]);

  // A live surface (showRider) with no asset is "rider-only" — real tiles
  // + the dot, no route line/ticks — instead of blank; a browse surface (no
  // rider) with no asset still has nothing useful to show and stays null.
  // WP-H: a browse surface with a ridden TRAIL but no asset (the ride-detail
  // trace view for an unmatched ride) is not "nothing to show" either.
  const hasTrail = !!props.trail && props.trail.length > 1;
  // virgin-cycle15 brief 12: a PLACE surface (props.place) is drawable
  // content just like an asset/trail — it must survive this early return
  // even with no asset, no rider and no trail.
  const place = props.place ?? null;
  const riderOnly = !asset;
  if (riderOnly && !showRider && !hasTrail && !place) return null;

  const here = props.lat !== null && props.lon !== null;
  // D-025: off-route reads from the TRUE fix, same call the PNG rung makes.
  // riderOnly: no single route to be off (the OFF ROUTE badge below is
  // suppressed the same way — there is nothing honest to measure against).
  const off = here && asset
    ? offWayM(asset, props.lat as number, props.lon as number) > OFF_WAY_M
    : false;

  // Cycle virgin-cycle10: halfLenM is now zoom-aware (gateHalfLenM) instead
  // of the function's fixed 15 m default, so a tick stays a visible line
  // (not a collapsed dot) at whole-ride 'fit' zoom levels — see
  // gateHalfLenM's doc comment in wayMapGeo.ts for the root cause. Not
  // wrapped in useMemo: this line runs after the `riderOnly` early return
  // above, so a hook here would break the Rules of Hooks; kept as the
  // existing unmemoized-per-render pattern (cheap, one tick per gate).
  const gateHalfLen = asset ? gateHalfLenM(asset.gates[0]?.lat ?? 0, liveZoom ?? camZoom) : 15;
  const faintGates = asset && faintVerts ? gateFaint(asset, faintVerts) : undefined;
  const gateTicksFC = asset
    ? gateTicksFeatureCollection(asset, props.gateColours, gateHalfLen, faintGates)
    : null;
  // WP-sector-coloured-trail P1: null unless the caller supplied sector
  // colours AND the asset can honestly be split (path + matching gateIdx —
  // sectorSpansFeatureCollection's own null rule); the plain base line
  // alone then remains, exactly as today.
  const sectorSpansFC = asset && props.sectorColours
    ? sectorSpansFeatureCollection(asset, props.sectorColours, props.leadColour, faintGates)
    : null;
  // virgin-cycle15 brief 12: the place disc. Pure builder, one 64-point
  // ring — cheap enough per render, and a hook here would sit after the
  // riderOnly early return above (Rules of Hooks), same reasoning as the
  // other unmemoized builders in this block.
  const placeFC = place ? placeFeatureCollection(place.lat, place.lon, place.radiusM) : null;
  const bounds = asset ? wayBounds(asset)
    : place ? placeBounds(place.lat, place.lon, place.radiusM)
    : hasTrail ? trailBounds(props.trail!) : null;

  // virgin-cycle22 06: what the ONE FIT/ME button does on its next tap (and
  // therefore reads) — see fitMeNextMode's doc. Not a hook (sits after the
  // riderOnly early return above).
  const fitMeNext = fitMeNextMode(mode, showRider);

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
    // WP-M: gated on rotateEnabled here too (not just via the effect above)
    // so a stale held bearing can never leak into a push on this same
    // render — see the Inspect-findings guard #2 comment above.
    userBearing: rotateEnabled ? userBearing : null,
  });

  return (
    <View style={[
      props.bleed ? st.frameBleed : st.frame,
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
          on mapStyleKey (virgin-cycle22 09: the style rung + the URL) forces
          React to unmount/remount the native view itself whenever the chosen
          style changes — URL, fetched copy, labels on/off, offline fallback —
          guaranteeing a full reload rather than a partial one. Rendering-layer only: `mode` /
          `camZoom` / `bearing` etc. all live in this component, above this
          element, and are untouched by remounting the child. */}
      <View style={st.mapFill} pointerEvents={gestures === 'readonly' ? 'none' : 'auto'}>
      <M.Map
        key={mapStyleKey}
        mapStyle={mapStyle as never}
        style={{ flex: 1 }}
        onDidFinishLoadingStyle={() => { styleLoadedRef.current = true; cover.onStyleLoaded(); }}
        onDidFinishRenderingFrameFully={cover.onFrameFully}
        onDidFailLoadingMap={() => { if (!styleLoadedRef.current) setStyleFailed(true); }}
        // Cycle 020 (Nathan 2026-08-19): D-006 "no controls while moving" is
        // relaxed for map GESTURES — the race-mode map must be draggable and
        // zoomable like the RECORD tab's preview map. Labels stay hidden and
        // the ribbon stays dimmed while moving/stopped (hideLabels/dimmed
        // above, unchanged); only pan/zoom gestures and the zoom bar open up.
        onRegionWillChange={(e: RegionWillChangeEvent) => {
          if (e?.nativeEvent?.userInteraction) setMode('free');
        }}
        // WP-M: read the rider's two-finger rotation back once the gesture
        // ends. Gated on rotateEnabled — while racing, touchRotate is false
        // but a one-finger PAN still ends with userInteraction: true and
        // bearing === the current course-up value; capturing that would
        // freeze the ribbon's heading (see routeMapGeo.ts's rotateEnabledFor
        // doc). Gated on userInteraction so our own camera pushes (course-up
        // updates, +/-, FIT) are never read back as rider intent.
        onRegionDidChange={(e: RegionDidChangeEvent) => {
          // Cycle virgin-cycle10: zoom is captured unconditionally (not
          // gated on rotateEnabled/userInteraction like bearing below) so
          // a programmatic 'fit' zoom-out is seen too, not just rider
          // gestures.
          const z = e?.nativeEvent?.zoom;
          if (typeof z === 'number') setLiveZoom(z);
          if (!rotateEnabled) return;
          if (!e?.nativeEvent?.userInteraction) return;
          setUserBearing(e.nativeEvent.bearing);
        }}
        attribution={false}
        logo={false}
        compass={false}
        dragPan={oneFingerOn}
        touchZoom={pinchOn}
        doubleTapZoom={oneFingerOn}
        doubleTapHoldZoom={oneFingerOn}
        // WP-M: was a literal `false` always — see rotateEnabledFor
        // (routeMapGeo.ts) for the scope rule (browse/prestart/finished on,
        // moving/stopped off).
        touchRotate={rotateEnabled}
        touchPitch={false}
      >
        <M.Camera ref={cameraRef} {...cameraProps} />
        {/* virgin-cycle15 07: the ride's own trace, first source after the camera so it
            mounts beneath everything else (every later source, route included, is always mounted
            after it — virgin-cycle21 03). key === id per the cycle-025 rule. */}
        <M.GeoJSONSource key="ride-trace" id="ride-trace" data={rideTraceFC}>
          <M.Layer id="ride-trace-core" type="line"
            paint={{ 'line-color': colors.riderBlue, 'line-width': 2, 'line-opacity': 0.85 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        {/* Reverted 2026-08-24: one solid line, casing beneath a yellow
            core, the whole route — see the routeFC comment above for why
            the dotted-ahead split was pulled back out. virgin-cycle21 03: always
            mounted (empty collection when there is no way) like every source
            below except the rider — the rider dot must be the LAST mounted. */}
        <M.GeoJSONSource key="route" id="route" data={wayFC ?? EMPTY_FC}>
          <M.Layer id="route-casing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 7, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
          <M.Layer id="route-core" type="line"
            paint={{ 'line-color': colors.neutral, 'line-width': 4, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
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
        {/* WP-sector-coloured-trail P1 (ruled 2026-08-26), moved below the trail
            source by WP-K phase 2: the WP-J trail's width-7 casing + width-4 core
            fully covered a width-6 span wherever the rider's breadcrumb coincided
            with the route line (always, near enough, on the live map), so live
            sector colours were invisible; spans now paint over the trail — once a
            sector is scored its verdict outranks the breadcrumb on that stretch,
            and the trail still shows beside the line wherever the rider actually
            deviated. This also matters off the live map: WP-H's ride-detail
            screen passes the ride's own recorded fixes as `trail` into a
            variant="browse" map, so the same casing-hides-span problem existed
            there too whenever the breadcrumb tracked the route line.
            virgin-cycle21 03: always mounted (empty collection when there are
            no sector colours), in this slot after route and trail, so a
            late-resolving asset can never put the yellow route core on top of
            the spans, and the rider source stays the last one mounted. Live
            callers still pass a truthy sectorColours (sectorTrailModel's
            ALL_YELLOW when the setting is off) so the spans are populated
            from their first render.
            Each sector's stretch of the line painted in the colour that sector
            earned, drawn OVER the base core at the SAME width-4 as the core
            (cycle9, 2026-09-16 -- Nathan: noticed the line visibly thickening
            on sector completion on the DEMO tab, "not a feature I asked for",
            asked for it removed). Through cycle8 this layer was deliberately
            bolder (width 6 inside the width-7 casing) than the width-4 core,
            for the same reason WP-E's earned ticks were bolder: an
            earned-yellow sector (colors.neutral) is the exact same hex as the
            base yellow core, so at equal width a yellow-tier verdict could be
            pixel-identical to an unscored stretch (D-013/D-030). That
            corner case is REOPENED by this change and not otherwise
            mitigated here -- purple/green sectors stay clearly visible
            (different hue from the base line), only a yellow-tier sector is
            now visually silent against an unscored one. Flagged, not fixed;
            Nathan's call given the whole cycle's direction is less colour
            emphasis, not more.
            virgin-cycle27 02 FINAL (Nathan 2026-10-09): true again -- the yellow tier IS the brand yellow (tierHex.yellow === colors.neutral), by his ruling.
            Unearned sectors paint transparent, so the base yellow core shows
            through. Solid lines + the same data-driven ['has','colour']
            expression family as the gate-ticks layer below — NO line-dasharray
            (the 2026-08-24 device-only dasharray bug class) and no line-gradient.
            Key === id per the cycle-025 frozen-id rule in the comment below.
            The lead-in/lead-out features (properties.lead) always carry a
            colour, so they never fall through to the base line — they are
            grey by design, not "not yet run". */}
        <M.GeoJSONSource key="sector-spans" id="sector-spans" data={sectorSpansFC ?? EMPTY_FC}>
          <M.Layer id="sector-spans-core" type="line"
            paint={{
              'line-color': ['case', ['has', 'colour'], ['get', 'colour'], 'rgba(0,0,0,0)'],
              'line-width': 4,
              'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1],
            }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        <M.GeoJSONSource key="place" id="place" data={placeFC ?? EMPTY_FC}>
          <M.Layer id="place-disc-fill" type="fill"
            filter={['==', ['get', 'part'], 'disc']}
            paint={{ 'fill-color': colors.neutral, 'fill-opacity': 0.18 }} />
          <M.Layer id="place-disc-line" type="line"
            filter={['==', ['get', 'part'], 'disc']}
            paint={{ 'line-color': colors.neutral, 'line-width': 2, 'line-opacity': 0.9 }} />
          <M.Layer id="place-centre" type="circle"
            filter={['==', ['get', 'part'], 'centre']}
            paint={{
              'circle-radius': 4,
              'circle-color': colors.neutral,
              'circle-stroke-color': CASING,
              'circle-stroke-width': 1.5,
            }} />
        </M.GeoJSONSource>
        {/* virgin-cycle21 03: gate ticks always mounted (empty collection when
            there is no asset). WP-E: circles replaced with a short tick perpendicular to the
            route (gateTicksFeatureCollection). Casing+core like the route
            line so a tick is never invisible on the night basemap (Nathan
            2026-08-24 device feedback — the earlier t.textDim fallback read
            as nothing).
            Gates-white (Nathan 2026-09-14, matching the marketing
            gates-saving render: yellow line, white gate across): the core
            is colors.white, a structural-marker colour that is not a tier
            colour. Gate ticks never change colour (STATE.md; cycle2 WP-E
            retired the tier-coloured tick 2026-09-05), so the old
            D-013/D-030 concern — an unscored yellow tick being
            pixel-identical to an earned yellow-tier tick — no longer arises
            and the thin/translucent fallback it justified is gone (opacity
            1). The ['has','colour'] branch is kept only because the
            gateColours prop still exists; no caller supplies it.
            WP-N: line-cap round on both layers, matching the route line
            itself (which was already round) — was 'butt' on these two. */}
        <M.GeoJSONSource
          key="gate-ticks"
          id="gate-ticks"
          data={gateTicksFC ?? EMPTY_FC}
          onPress={props.gateSelect ? (e: GatePressEvent) => {
            // virgin-cycle26 brief 04: every feature under the tap, not just
            // the first — stacked gates on retraced ground cycle on each tap.
            const hits = (e.nativeEvent.features ?? []).map((f) => {
              const name = String(f.properties?.name ?? '');
              return asset ? asset.gates.findIndex((g) => g.name === name) : -1;
            });
            const idx = nextGateOnTap(hits, props.gateSelect!.selected);
            if (idx !== null) props.gateSelect!.onPress(idx);
          } : undefined}
          hitbox={props.gateSelect ? { top: 24, right: 24, bottom: 24, left: 24 } : undefined}
        >
          <M.Layer id="gate-ticks-casing" type="line"
            paint={{ 'line-color': CASING, 'line-width': 5, 'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1] }}
            layout={{ 'line-cap': 'round' }} />
          <M.Layer id="gate-ticks" type="line" paint={{
            'line-color': ['case', ['has', 'colour'], ['get', 'colour'], colors.white],
            'line-width': ['case', ['has', 'colour'], 3, 2],
            'line-opacity': ['case', ['has', 'faint'], FAINT_OPACITY, 1],
          }} layout={{ 'line-cap': 'round' }} />
        </M.GeoJSONSource>
        {/* WP-J (gate-adjust card): the selected-gate ring, always mounted
            (virgin-cycle21 03: empty collection when gateSelect is absent or
            nothing is selected) so its mount slot is stable — see
            gateSelectedFC's comment above. riderBlue is deliberately NOT the yellow
            line/tick colour and not a tier colour; there is no rider on
            this surface (showRider={false} on the card's map), so it
            cannot be misread as the rider dot. */}
        <M.GeoJSONSource key="gate-selected" id="gate-selected" data={props.gateSelect ? gateSelectedFC : EMPTY_FC}>
          <M.Layer id="gate-selected-ring" type="circle" paint={{
            'circle-radius': 15,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': colors.riderBlue,
            'circle-stroke-width': 3,
          }} />
        </M.GeoJSONSource>
        {/* virgin-cycle6 (self racing): always-mounted, possibly-empty source
            (selfsFC — see its comment above) so it claims its mount slot
            BELOW the rider dot (mount order, same z-stacking rule as
            trailFC/gateSelectedFC above) whether or not props.selfs is
            given. NOT conditional on props.selfs — a conditionally-mounted
            source here would mount AFTER the rider source and paint over
            it. follow-up: layout `circle-sort-key` (R5‴, from the feature's
            `sortKey = 100 - rank`) stacks P1 above P2 ... P9 within this one
            layer — the rider still paints above every self via mount order
            alone (untouched). */}
        <M.GeoJSONSource key="selfs" id="selfs" data={selfsFC}>
          <M.Layer id="self-dot" type="circle"
            layout={{ 'circle-sort-key': ['get', 'sortKey'] }}
            paint={{
              'circle-radius': 6,
              // R5′: the app's one tier rule, tokens from tierColour.ts (never chipColors().text).
              'circle-color': ['match', ['get', 'tier'],
                'purple', tierLineColour('purple') as string,
                'green', tierLineColour('green') as string,
                tierLineColour('yellow') as string],
              // R5″: state-only opacity; every self sits under the rider's 0.85.
              'circle-opacity': ['case', ['==', ['get', 'state'], 'finished'], 0.35, 0.7],
              'circle-stroke-color': CASING,
              'circle-stroke-width': 1.5,
              'circle-stroke-opacity': ['case', ['==', ['get', 'state'], 'finished'], 0.35, 0.7],
            }} />
        </M.GeoJSONSource>
        {showRider && here ? (
          <M.GeoJSONSource key="rider" id="rider" data={riderFeature(props.lat as number, props.lon as number)}>
            {/* WP-E: the rider dot no longer shares colors.neutral with the
                route line (a yellow dot on a yellow line is poor contrast) —
                on-route is solid riderBlue/white, off-route is inverted
                (hollow white/riderBlue ring), same convention on both
                rungs. */}
            <M.Layer id="rider-dot" type="circle" paint={{
              'circle-radius': 7,
              'circle-opacity': 0.85,
              'circle-color': off ? '#FFFFFF' : colors.riderBlue,
              'circle-stroke-color': off ? colors.riderBlue : '#FFFFFF',
              'circle-stroke-width': 2,
            }} />
          </M.GeoJSONSource>
        ) : null}
      </M.Map>
      </View>
      {/* virgin-cycle27 12: themed cover over the native view, under every control (JSX order). */}
      <MapCover cover={cover} color={t.race.bg} />
      {/* Cycle 020: the zoom bar is always visible now, not gated on
          `unlocked` — the race-mode ribbon is draggable/zoomable too. */}
      {oneFingerOn ? (
      <View style={st.zoomBar}>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { setCamZoom((z) => Math.min(18, z + 1)); setMode('follow'); }}>
          <Text style={[st.zoomText, { color: t.text }]}>+</Text>
        </Pressable>
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { setCamZoom((z) => Math.max(11, z - 1)); setMode('follow'); }}>
          <Text style={[st.zoomText, { color: t.text }]}>−</Text>
        </Pressable>
        {/* virgin-cycle22 06 (Nathan 2026-10-05): ONE button where FIT and ME
            were, labelled with the ACTION the next tap performs, never the
            current state (fitMeNextMode): follow -> "FIT", fit/free -> "ME";
            +/− above still set follow, so right after a zoom tap it reads FIT.
            Browse surfaces (no rider) always read FIT. Two literal <Text>
            branches on purpose: the ui-strings scanner only sees JSX text, so
            the existing "FIT"/"ME" allow-list entries stay valid.
            virgin-cycle27 08 (Nathan 2026-10-08): FIT also resets north — it calls
            resetNorth() (sticky userBearing 0, the old up-arrow) before fitting, so the
            up-arrow button is retired; ME never touches the bearing. */}
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { if (fitMeNext === 'fit' && rotateEnabled) resetNorth(); setMode(fitMeNext); }}>
          {fitMeNext === 'fit'
            ? <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
            : <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>}
        </Pressable>
      </View>
      ) : null}
      <Credit rung="maplibre" locked={creditLocked} />
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

const st = StyleSheet.create({
  frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  frameBleed: { alignSelf: 'stretch', overflow: 'hidden' },
  mapFill: { flex: 1, alignSelf: 'stretch' },
  // "stopped" (a red light): tight and dim, not loosened — a light is not a
  // finish (design contract A).
  dimmedFrame: { opacity: 0.4 },
  zoomBar: { position: 'absolute', right: 6, top: 6, gap: 5 },
  zoomBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomText: { fontSize: 17, fontWeight: '700' },
  // virgin-cycle14 brief 05: the "i" credit button + its in-frame card. Theme
  // tokens at the call site; deliberately NOT a palette colour — a credit
  // that used a tier colour would read as a signal.
  creditBtn: {
    position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  creditBtnLocked: { opacity: 0.6 },
  creditBtnText: { fontSize: 12, fontWeight: '700', fontStyle: 'italic', lineHeight: 14 },
  creditCard: {
    position: 'absolute', right: 6, bottom: 32, maxWidth: '85%', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8, gap: 2,
  },
  creditTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  creditRow: { fontSize: 11 },
  badge: {
    position: 'absolute', bottom: 6, left: 6, fontSize: 10.5, letterSpacing: 1.2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
});
