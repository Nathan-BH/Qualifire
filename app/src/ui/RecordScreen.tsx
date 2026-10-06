/**
 * Phase-1 recording screen. [UNTESTED ON DEVICE]
 * Big Start/Stop, live fix counter + elapsed time, permission/GPS problem
 * states, relaunch recovery, battery-optimisation warning.
 * Cycle 007 (live v2, Nathan 2026-08-15): while recording, the LIVE surface
 * (LAYOUT §2/§2a) renders from the real liveEngine feed through the shared
 * pane — big ticking LAP clock (rate-1 timebase anchored at recording start),
 * sector flashes masking it at each gate, sector blocks with frozen times,
 * LAP result terminal at the final-gate handover. The tower-position chip
 * renders ONLY when a tower source exists — B-28 UNBUILT, so the stub
 * returns null and nothing extra appears (see live/towerSource.ts).
 * No benchmark store yet → every clean sector/lap is NEUTRAL, deltas blank.
 * Cycle 020 (Nathan 2026-08-19): race mode is a full-height column — map on
 * top (≈half the screen), clock, sectors, status, PAUSE→RESUME/END at the
 * bottom.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  ActiveSession,
  RideSummary,
  TrackerStatus,
  dropStaleSession,
  ensurePermissions,
  getRecoveryState,
  getStatus,
  noteButtonPress,
  refreshPositionIfPermitted,
  refreshPositionOnce,
  startTracking,
  stopTracking,
  subscribe,
  type StartContext,
} from '../location';
import { liveEngine, type LiveEngineState } from '../live/engine';
import { LiveSectorPane, realTimebase, viewModelFromEngine } from './liveView';
import { LaunchAnimation } from './launchAnimation';
import { effectiveFromId, endingSlotFor, interruptedRideAction, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, wayHintForPick, type RecordPhase } from './recordFlow';
import { nextPollDelayMs, restartsBudget } from '../location/positionRetryPolicy';
import { useTabNav } from './tabNav';
import WayMapView from './wayMapView';
import { metresBetween } from './wayMapGeo';
import { appendTrailPoint, type TrailPoint } from './trailModel';
import { initialRiderDotState, riderDotStep, type RiderDotState } from './riderDotModel';
import { useSettings } from './settings';
import { chipColors, tierLineColour, type Tier } from './chips';
import { ALL_YELLOW, liveSectorColours } from './sectorTrailModel.ts';
import { ghostsFor, liveTierFor, sectorValues } from './colourModel';
import { loadSelfTracks, selfDotsAt, selfLivePosition, type SelfDot, type SelfTrack } from './selfRaceModel.ts';
import { TimingTower } from './tower';
import {
  buildRankingReveal,
  REVEAL_HOLD_MS,
  REVEAL_START_DELAY_MS,
  type RankingReveal,
} from './rankingRevealModel.ts';
import { dropRecorded, rememberRide, replaceRecorded } from './lastRide';
import {
  applyEndpointChoices, findWayWithSpecs, type EndpointChoices, type RouteCreationDraft, type RouteNames,
} from '../store/routeCreation';
import { hasSpecs, specPickRows, specVocabulary } from '../store/waySpecs';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
// WP-H (§4.9/§4.11): the create-way bodies live in store/wayFromRide.ts now,
// shared with the ride detail's retroactive offer; this screen keeps only
// state + Alerts + phase/animation choreography.
import {
  createRouteFromDraft,
  draftRouteFromRide,
  existingLandmarkLabel,
  existingRouteProps,
  readRideFixes,
  saveAdjustedGates,
  type GateAdjustDraft,
} from '../store/routeFromRide';
import { GateAdjustCard } from './gateAdjustCard';
import { RouteNamingCard } from './routeNamingCard';
import { deleteRide } from '../storage';
import { getStoredResult, removeStoredResult } from '../store/resultsStore';
import { markRideFree } from '../store/freeRides';
import { whenStoresReady } from '../store/bootstrap';
import { currentCatalog } from '../store/catalogStore';
import { gateSetFor, landmarkAt } from '../store/catalog';
import { effectiveRideSportId, scopeCatalog, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';
import { afterSportSwitch } from '../store/sportSwitch';
import { activeCatalog, activeSportId, currentSports, saveSports } from '../store/sportStore';
import { defaultEndpoints, wayLabelIn, wayVariantLabel, sortWaysForDisplay } from '../store/defaultWay';
import { landmarkUsageCounts, sortLandmarksByUsage } from '../store/landmarkUsage';
import { placeOptions } from '../store/placeSearch';
import type { Way } from '../store/types';
import { PaddockTheme, colors, radius } from './theme';
import { useTheme } from './themeContext';

/** virgin-cycle16 05 (Nathan 2026-09-28): pressing RECORD/START with the
 * phone's location toggle off no longer adds a banner at the top of the
 * screen (off-screen once the form is scrolled to the button). The yellow
 * button's own sub-label shows this text instead, holds GPS_FLASH_HOLD_MS,
 * fades out over GPS_FLASH_FADE_MS and the normal caption returns. Every
 * further press with GPS still off restarts the flash. virgin-cycle20 08: the
 * same flash now carries the permission and no-sport messages with their own
 * holds (see below). */
const GPS_OFF_MSG = 'Location (GPS) is turned off';
const GPS_FLASH_HOLD_MS = 2000;
const GPS_FLASH_FADE_MS = 400;
/** virgin-cycle20 brief 08 (Nathan, clutter review Q4/Q5): the two permission
 * banners and the inline first-sport form are gone; these flash in the same
 * slot, the same way, each with its own hold (Q5: permissions 5 s; Q4: the
 * no-sport message shows 1 s, then RECORD hands over to SETTINGS). */
const PERM_DENIED_MSG = 'Location permission not granted';
const PERM_FOREGROUND_ONLY_MSG = 'Allow location all the time';
const PERM_FLASH_HOLD_MS = 5000;
const NO_SPORT_MSG = 'No sport configured yet';
const NO_SPORT_FLASH_HOLD_MS = 1000;
/** virgin-cycle21 04 (Nathan 2026-10-04): the one trace of an interrupted ride (app killed,
 * phone reset, battery dead) — never resumed, never scored, filed free. Flashed once in the
 * RECORD sub-label on the mount that saved it. */
const INTERRUPTED_MSG = 'Interrupted · saved as free activity';
const INTERRUPTED_FLASH_HOLD_MS = 5000;

/** Stationary detection (B-51, RecordScreen-owned): the live ribbon dims and
 * releases its zoom-bar lock while genuinely moving is not the same as at a
 * red light or a junction — a light is not a finish, but the map should
 * still look paused rather than a fully-live ribbon that just happens not
 * to be moving right now. [ASSUMPTION — tune on device: 10 m / 6 s were
 * picked to ignore GPS jitter without lagging a real stop, not measured
 * against a real ride yet.] */
const STOPPED_AFTER_MS = 6000;
const MOVE_EPS_M = 10;

/** WP-B: a UI-only pseudo-landmark ("new" — Nathan's 2026-08-20 notes: "go
 * from work>>new for example, or from new>>home"), never a catalog entry —
 * the catalog validator would rightly reject a coordinate-less place. */
const NEW_ID = '~new';
/** virgin-cycle22 07: the one expo-keep-awake tag this screen holds while a ride
 * runs. A single word on purpose: the ui-strings scanner reads a hyphenated
 * literal as rider prose. */
const KEEP_AWAKE_TAG = 'QualifireRide';
/** virgin-cycle20 08: the silent interrupted-recording finaliser runs once per JS launch. */
let recoveryAutoSaveStarted = false;

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/** §8a default: the most-ridden recent route on the way — most ghost rides in
 * the recent window (ghostsFor = last WINDOW_N ranked rides, ascending by
 * startedAtMs), tie -> the one ridden most recently, tie -> catalog order. */
function defaultWayFor(ways: Way[]): Way | null {
  let best: Way | null = null;
  let bestN = -1;
  let bestLast = -Infinity;
  for (const r of ways) {
    const g = ghostsFor(r.id);
    const n = g.length;
    const last = n > 0 ? g[n - 1].startedAtMs : -Infinity;
    if (n > bestN || (n === bestN && last > bestLast)) {
      best = r; bestN = n; bestLast = last;
    }
  }
  return best;
}

export default function RecordScreen({
  onFullscreenChange,
}: {
  onFullscreenChange?: (fs: boolean) => void;
}) {
  const { t, mode, toggleMode } = useTheme();
  const { s: settings } = useSettings();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);
  // Cycle 024 (WP-A2): the three-phase RECORD flow (Nathan 2026-08-19) —
  // setup (pick from/to/route, press RECORD) -> armed (route+location shown,
  // nothing started) -> running (START pressed; today's recording column).
  // `ending` is transient: END pressed, ride saved, reversed launch mark
  // playing. `phase` is authoritative for rendering; the sync effect below
  // only ever pushes it TOWARD 'running' when a real session appears out
  // from under it (relaunch recovery) — every other transition is an
  // explicit user action (see recordFlow.ts's canTransition table).
  const [phase, setPhase] = useState<RecordPhase>('setup');
  // 'fwd' while the RECORD-press launch mark plays (setup, pre-'armed');
  // 'rev' while the END-press reversed mark plays ('ending'). Folded into
  // the fullscreen report below so the OVERLAY itself is never seen with the
  // tab bar still showing, even for the brief moment before phase flips.
  // 'fwd' = the mark at ride START (onDone arms), 'rev' = the mark at ride END
  // (onDone clears the board, returns to setup, opens the ride). Both play the
  // SAME forward draw since cycle15 brief 15 (Nathan 2026-09-27); 'rev' is a
  // historical name from cycle 024 WP-A2, when the end mark undrew itself.
  const [showAnim, setShowAnim] = useState<'fwd' | 'rev' | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  // Mirror for onEnd's [] useCallback closure (it must read the CURRENT
  // session, same reason pickedRouteRef mirrors pickedRoute below).
  const sessionRef = useRef<ActiveSession | null>(null);
  sessionRef.current = session;
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<RideSummary | null>(null);
  // OPEN-ITEMS item 2 (WP-F: any finished ride, not just those without a reference):
  // the STOP-step naming offer for endpoints that match no existing way, or
  // that diverge >MATCHED_ENDPOINT_SLACK_M from the ride's own matched route
  // (null = no offer). While non-null the 'ending' phase shows the naming
  // card and holds the reversed launch mark. Brief 05: a quiet offer
  // (namingOfferMode) does NOT hold the reversed mark unless expanded — see
  // namingExpanded.
  const [naming, setNaming] = useState<RouteCreationDraft | null>(null);
  // Mirror for the [] useCallback closures below, same reason as sessionRef.
  const namingRef = useRef<RouteCreationDraft | null>(null);
  namingRef.current = naming;
  // virgin-cycle15 brief 05: a 'quiet' offer (namingOfferMode — the ride was
  // scored as an existing way of a route you have) shows only a one-line
  // "not <way>?" link and lets the screen proceed by itself; tapping the
  // link sets this, which (1) renders the full RouteNamingCard and (2) makes
  // the post-reveal hold below keep the screen up instead of playing the
  // reversed mark. Ref for the [] timeout closure, same reason as namingRef.
  // Inspect 2026-09-28: the link is shown BEFORE revealDone (tower climb +
  // hold) — see endingSlotFor; inside the revealDone slot it was unreachable.
  const [namingExpanded, setNamingExpanded] = useState(false);
  const namingExpandedRef = useRef(false);
  namingExpandedRef.current = namingExpanded;
  // OPEN-ITEMS item 3 (Part B): the seeded-gates adjustment step, shown by
  // 'ending' after a CREATE WAY whose reference line + gate seed were built
  // (naming is cleared first — the two cards are never up together). Its
  // exit handlers are what start the reversed mark then.
  const [adjust, setAdjust] = useState<GateAdjustDraft | null>(null);
  const adjustRef = useRef<GateAdjustDraft | null>(null);
  adjustRef.current = adjust;
  /** WP-H: the finished ride's identity, carried from onEnd to the reversed
   * mark's onDone (a [] closure) so the handoff can open the ride detail for
   * THIS ride instead of the retired RESULT tab. */
  const endedRef = useRef<{ rideId: string; startedAtMs: number; durationS: number | null; sportId: string | null } | null>(null);
  // virgin-cycle18 brief 06: the from/to the RECORD tab showed when START was
  // pressed — landmark ids, null for 'new' — so the naming card can list them
  // first as "picked at START". Set in onStart, read in 'ending'; never
  // persisted (the sidecar's pick event already logs it).
  const ridePickRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null });
  // virgin-cycle11 ranking reveal — built in onEnd AFTER rememberRide (R5), shown by
  // the 'ending' render; null = no reveal (R4), screen behaves exactly as before.
  const [reveal, setReveal] = useState<RankingReveal | null>(null);
  const [revealDone, setRevealDone] = useState(true);
  // What the 'ending' screen does once the reveal has played: mount the card, or start
  // the reverse mark. A ref, not a closure over `naming` — the tower's onPlayed fires
  // from an animation callback captured at mount (same reason endedRef exists).
  const postRevealRef = useRef<'card' | 'rev'>('rev');
  const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState<LiveEngineState>(liveEngine.getState());
  // PAUSE → RESUME | END (Cycle 020, Nathan 2026-08-19): an accidental-stop
  // guard, NOT a real pause — the recording service and lap clock keep
  // running underneath (D-042: raw time is the truth; no engine or location
  // changes happen here).
  const [pauseMenu, setPauseMenu] = useState(false);
  // Start flow (§21): where from, where to. Detected-or-picked. The §8a pick is
  // the ride's one reference from START (virgin-cycle21): the picked way is the
  // only one this ride can ever score against — see live/engine.ts's file header.
  // B-39 (empty-seed install path): the runtime catalog — shipped seed plus
  // this phone's own additions (store/catalogStore.ts) — read per render,
  // never captured at import: it can be empty at boot and grow later.
  // WP-1: sport-scoped view (activeCatalog()) — identity when zero sports
  // exist (§3.4), so this line changes nothing on a phone that hasn't
  // created a sport yet. `sportSwitchTick` forces a re-render right after a
  // same-screen sport switch (C1) so this re-reads the freshly-saved active
  // sport in the SAME render pass, not one frame later.
  const [, setSportSwitchTick] = useState(0);
  const CATALOG = activeCatalog();
  // Q4: zero sports blocks the whole setup flow (the C0 block further down)
  // and onRecord (belt-and-braces guard below, which reads the live store) —
  // a ride cannot start without a sport for it to belong to.
  const noSport = currentSports().sports.length === 0;
  // B-39: data-driven, never literal ids — the first two offerable catalog
  // landmarks (today's seed: home, work), or the 'new' pseudo-landmark when
  // the catalog has none, so a blank install opens on new>>new: the free
  // ride, which needs no catalog at all.
  const [from, setFrom] = useState(() => defaultEndpoints(activeCatalog()).from ?? NEW_ID);
  const [to, setTo] = useState(() => defaultEndpoints(activeCatalog()).to ?? NEW_ID);
  // notes5 N5: true once the rider has tapped a START pill this ride. Reset
  // when a ride ends or is discarded — never on armed→setup cancel, which
  // must keep the rider's choice.
  const [fromExplicit, setFromExplicit] = useState(false);
  const pickFrom = (id: string) => { setFrom(id); setFromExplicit(true); };
  // WP-1 (C1): tapping a sport pill sets the global active sport, then
  // resets from/to to the newly-scoped catalog's own defaults and clears any
  // way pick — a pick from the OTHER sport must never survive a switch.
  // saveSports() updates the in-memory sport list synchronously (before its
  // own await), so activeCatalog() below already reflects the new sport by
  // the time this function returns; the tick bump forces the re-render.
  const pickSport = (id: string) => {
    const next = setActiveSport(currentSports(), id);
    if (Array.isArray(next)) return; // unknown id — defensive, unreachable from the row itself
    void saveSports(next);
    const reset = afterSportSwitch(activeCatalog());
    setFrom(reset.from ?? NEW_ID);
    setFromExplicit(false);
    setTo(reset.to ?? NEW_ID);
    setWayPick(reset.wayPick);
    setSportSwitchTick((v) => v + 1);
  };
  // §8a route pick (Nathan 2026-08-16, re-confirmed 2026-08-18): only asked
  // when the way has >1 ratified route. Stored WITH its wayId so a pick can
  // never leak onto a different way when START / GOING TO change — a stale
  // pair silently falls back to the §8a default. The ride's one
  // reference (virgin-cycle21): the engine scores this way or nothing — it never
  // reassigns the ride to the road actually ridden.
  const [wayPick, setWayPick] = useState<{ routeId: string; wayId: string } | null>(null);
  // The pick frozen at START — the LIVE map's route line (virgin-cycle21: the only one it ever draws). Frozen
  // because `fromId` can drift mid-ride in auto mode (detected landmark goes
  // null once you leave the disc) while nothing has been tapped (N5), which
  // would silently change `way`.
  const [rideWayHint, setRideWayHint] = useState<string | null>(null);
  // WP-J (breadcrumb trail): the rider's own ridden line, accumulated from
  // the live fix feed below (min-distance decimated — trailModel.ts) and
  // passed to the RUNNING map only (setup/armed never draw it — nothing
  // recorded yet). Reset at START, at a discard fold-back, and before the
  // 'ending' phase flip at END, so a new ride never inherits the last one's
  // line.
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);

  // Live status from the location layer.
  useEffect(() => subscribe(setStatus), []);

  // WP-D Piece B: a quiet position read on mount, so a returning user sees
  // the rider dot on the setup map without pressing RECORD first —
  // refreshPositionIfPermitted CHECKS permission + services and never
  // triggers an OS prompt or the Play Services dialog just from opening this tab.
  // virgin-cycle20 brief 11 (Nathan, 2026-10-02): and it keeps trying. The read
  // used to run exactly once per mount; with location off at that moment the
  // failure was swallowed and the DETECTED START pill stayed dead until a tab
  // switch or a restart. Now: (1) again whenever the app returns to the
  // foreground (Settings → enable → back), with the poll budget restarted;
  // (2) a bounded quiet poll while this screen is in setup/armed and no
  // position is known — positionRetryPolicy.ts owns the schedule (2-5 s steps,
  // 60 s budget, ≤ maxReadsPerBudget() reads); (3) RECORD press restarts the
  // budget (onRecord). The poll stops through the status subscription above
  // (any fix, from any source) or when the phase leaves setup/armed or the
  // screen unmounts (tab switch — App.tsx renders tabs conditionally). The
  // quick-settings shade never backgrounds the app, which is why (1) alone
  // is not enough. Non-prompting by construction: nothing here can request
  // a permission. [UNTESTED ON DEVICE]
  useEffect(() => { void refreshPositionIfPermitted(); }, []);
  const [pollEpoch, setPollEpoch] = useState(0); // bump = restart the poll budget
  const noFix = status.lastLat === null || status.lastLon === null;
  useEffect(() => {
    // virgin-cycle20 brief 12 (Opus inspection of 11): no listener at all while
    // running/ending — the ride feed owns lastLat/lastLon/lastFixMs and a
    // foreground quiet read would overwrite them mid-ride (the poll below
    // already stops outside setup/armed; this closes the one remaining path).
    if (phase === 'running' || phase === 'ending') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void refreshPositionIfPermitted();
      if (restartsBudget('app-active')) setPollEpoch((e) => e + 1);
    });
    return () => sub.remove();
  }, [phase]);
  useEffect(() => {
    if (!noFix) return;
    if (phase !== 'setup' && phase !== 'armed') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAtMs = Date.now();
    let attempt = 0;
    const schedule = () => {
      const delay = nextPollDelayMs({ phase, hasFix: false, elapsedMs: Date.now() - startedAtMs, attempt });
      if (delay === null) return;
      timer = setTimeout(() => {
        timer = null;
        if (cancelled) return;
        attempt += 1;
        void refreshPositionIfPermitted().then((outcome) => {
          if (cancelled || outcome === 'fixed') return; // 'fixed' → status update → noFix flips → cleanup
          schedule();
        });
      }, delay);
    };
    schedule();
    return () => { cancelled = true; if (timer !== null) clearTimeout(timer); };
  }, [phase, noFix, pollEpoch]);

  // Live sector state from the engine (display-only, derived; D-023).
  useEffect(() => liveEngine.subscribe(setLive), []);

  // Stationary detection for the live map ribbon (B-51): track the last fix
  // and the last time a fix actually moved >= MOVE_EPS_M (same equirectangular
  // estimate the map itself uses for its bearing jitter guard — metresBetween
  // is shared from routeMapGeo.ts so the two "did it move" checks never drift
  // apart).
  const lastMovedRef = useRef<number | null>(null);
  const lastFixRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (status.lastLat === null || status.lastLon === null) return;
    const lat = status.lastLat, lon = status.lastLon;
    const prev = lastFixRef.current;
    if (prev === null || metresBetween(prev.lat, prev.lon, lat, lon) >= MOVE_EPS_M) {
      lastMovedRef.current = Date.now();
      lastFixRef.current = { lat, lon };
    }
  }, [status.lastLat, status.lastLon]);

  // WP-J: accumulate the breadcrumb trail from the live fix feed. Bails on no
  // session (nothing recording), no fix, or a fix that predates this ride's
  // startedAtMs — the same stale-cached-fix rule fixFlags.ts's `preStart`
  // uses for the raw JSONL, applied here to the in-memory buffer for the same
  // reason (a replayed pre-START fix must not draw a phantom leg of trail).
  useEffect(() => {
    if (!session) return;
    if (status.lastLat === null || status.lastLon === null) return;
    if (status.lastFixMs === null || status.lastFixMs < session.startedAtMs) return;
    setTrail((prev) => appendTrailPoint(prev, status.lastLat as number, status.lastLon as number));
  }, [status.lastLat, status.lastLon, status.lastFixMs, session]);

  // virgin-cycle20 brief 02: where the live rider dot is DRAWN — softly
  // snapped to the display candidate's reference line (engine's read-only
  // riderSnap mirror) via the pure rule in riderDotModel.ts. Raw fix whenever
  // the engine has nothing to project (no display candidate yet, empty
  // window). Display only: the trail, the stationary rule, hasFix and the raw
  // JSONL above all keep reading status.lastLat/lastLon.
  const riderDotStateRef = useRef<RiderDotState>(initialRiderDotState());
  const [riderDot, setRiderDot] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (status.lastLat === null || status.lastLon === null) {
      setRiderDot(null);
      return;
    }
    const r = riderDotStep(riderDotStateRef.current, status.lastLat, status.lastLon, live.riderSnap);
    riderDotStateRef.current = r.state;
    setRiderDot({ lat: r.lat, lon: r.lon });
  }, [status.lastLat, status.lastLon, live.riderSnap]);

  // virgin-cycle22 04: the final-gate handover (1.1 s, LAP_HANDOVER_MS) is timed by LiveSectorPane
  // itself now — nothing to sequence here.

  // 1 s clock while recording.
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  // Recovery on mount: a ride marker exists. Only a UI remount of a still-running
  // ride continues; anything else is an interrupted ride (virgin-cycle21 04).
  useEffect(() => {
    (async () => {
      const rec = await getRecoveryState();
      if (!rec) return;
      if (rec.tracking && rec.restoration === 'remount') {
        // The process never died (UI remount only): nothing was interrupted, the ride
        // keeps running. RecordScreen state is fresh, so the route line is restored from
        // the session's pick (virgin-cycle21 04; the old relaunch path lost it —
        // INSPECTION MAJOR).
        setSession(rec.session);
        setRideWayHint(wayHintForPick(currentCatalog().ways, rec.session.pickId ?? null));
        // WP-J §3 Step 4.4 (recovery hydration): replay the ride's own raw
        // fixes (the only record, D-023) through appendTrailPoint so the
        // trail doesn't restart empty after a relaunch mid-ride. Skips
        // preStart/warmup-flagged fixes, same exclusion the derived
        // consumers (engine feed, export stats) already apply. Seeds via a
        // functional update, folding the replay onto whatever the live feed
        // has already accumulated since mount, rather than overwriting it —
        // guards the race between this async read and fixes landing live.
        const rideId = rec.session.rideId;
        void readRideFixes(rideId, createExpoFsAdapter()).then((fixes) => {
          if (fixes === null) return;
          let replayed: readonly TrailPoint[] = [];
          for (const f of fixes) {
            if (f.preStart || f.warmup) continue;
            replayed = appendTrailPoint(replayed, f.lat, f.lon);
          }
          setTrail((live) => {
            let merged = replayed;
            for (const p of live) merged = appendTrailPoint(merged, p.lat, p.lon);
            return merged;
          });
        });
      } else {
        // virgin-cycle21 04 (Nathan 2026-10-04): an interrupted ride (the process died —
        // app killed, phone reset, battery dead — or the service died) is never resumed
        // and never scored. What was recorded is finalised and FILED FREE (no result, the
        // free mark keeps ACTIVITIES' backfill from matching it to a way); under
        // INTERRUPTED_MIN_FIXES it is discarded. One line flashes in the RECORD
        // sub-label. A marker whose ride file is gone is dropped; any other failure
        // leaves it for the next launch.
        if (recoveryAutoSaveStarted) return;
        recoveryAutoSaveStarted = true;
        try {
          // virgin-cycle20 brief 12 (Opus inspection of 08, B1): wait for App.tsx's
          // store chain (sports -> catalog -> refs -> free rides -> ride history)
          // before finalising. markRideFree() before initFreeRidePersistence()
          // armed the store was dropped (`fs === null`) or overwrote the cache
          // before its read landed, so the interrupted recording could later be
          // backfilled and ranked against an official way; effectiveRideSportId()
          // was null before sports.json loaded. The marker stays on disk until
          // this resolves, so a kill mid-wait just retries next launch.
          await whenStoresReady();
          const sum = await stopTracking();
          if (sum && interruptedRideAction(sum.nFixes) === 'discard') {
            // Too short to be an activity: nothing kept, nothing said.
            try {
              await deleteRide(sum.rideId);
            } catch {
              // Could not delete: file it free so it can never be matched to a way.
              markRideFree(sum.rideId, rec.session.startedAtMs, Math.max(0, (sum.endMs - sum.startMs) / 1000),
                effectiveRideSportId(rec.session.sportId, currentSports()));
            }
            setLastSummary(null);
            return;
          }
          if (sum) {
            markRideFree(
              sum.rideId,
              rec.session.startedAtMs,
              Math.max(0, (sum.endMs - sum.startMs) / 1000),
              effectiveRideSportId(rec.session.sportId, currentSports()),
            );
            flashSub(INTERRUPTED_MSG, INTERRUPTED_FLASH_HOLD_MS);
          }
          setLastSummary(sum);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('endRide: unknown')) {
            await dropStaleSession().catch(() => {});
          } else {
            console.warn('[record] interrupted activity not finalised this launch:', msg);
          }
        }
      }
    })();
  }, []);

  // Cycle 024 (WP-A2): phase sync — only ever pushes TOWARD 'running' when a
  // real session appears without an explicit phase change of our own (the
  // relaunch-recovery branch above calls setSession directly). The reverse
  // (session becoming null) is NEVER auto-handled here: onEnd sets 'ending'
  // itself before clearing the session, and a stop-failure resets to 'setup'
  // itself in its own catch block — see recordFlow.ts's canTransition table.
  useEffect(() => {
    if (session != null && phase !== 'running' && phase !== 'ending') {
      setPhase('running');
    }
  }, [session, phase]);

  // Report fullscreen (armed/running/ending, OR either launch mark playing —
  // the overlay itself must never be seen with the tab bar still showing,
  // including the instant before RECORD's mark resolves to 'armed').
  useEffect(() => {
    onFullscreenChange?.(isFullscreen(phase) || showAnim != null);
    // Cleanup: on unmount (e.g. Shell hides the tab bar for 'record', which
    // unmounts RecordScreen itself when tab flips before this effect's next
    // run) explicitly report false so the footer doesn't stay hidden after
    // the ride ends and focus moves elsewhere (WP-A2 fix B1).
    return () => onFullscreenChange?.(false);
  }, [phase, showAnim, onFullscreenChange]);

  // virgin-cycle22 07 (Nathan 2026-10-05, tester feedback): keep the screen on
  // while a ride is RUNNING and only then — not in setup/armed/ending, not on
  // any other tab (Shell mounts one screen at a time, App.tsx: RecordScreen is
  // unmounted there, and this cleanup runs), not after STOP/discard/a failed
  // stop that lost the session (phase leaves 'running'). A red light is still
  // phase 'running' (only the map's liveState flips to 'stopped') and keeps it.
  // Relaunch recovery re-enters 'running' through the session-sync effect
  // above and re-acquires it; a killed process never holds it (the flag dies
  // with the window). No AppState handling: Android FLAG_KEEP_SCREEN_ON is a
  // property of OUR window and is inert while the app is in the background.
  // Promise.resolve() wraps both calls so a void-returning build of the module
  // can never throw on `.catch`.
  useEffect(() => {
    if (phase !== 'running') return;
    void Promise.resolve(activateKeepAwakeAsync(KEEP_AWAKE_TAG)).catch(() => {});
    return () => {
      void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
    };
  }, [phase]);

  // Hardware back (Cycle 024, WP-A2): registered here so it runs BEFORE
  // Shell's own handler (RN calls the most-recently-mounted listener first —
  // RecordScreen, a child of Shell, always mounts after it). armed -> setup;
  // running/ending swallow the press entirely (no accidental background/exit
  // mid-flow — the OS home button still works, recording survives via the
  // foreground service); setup falls through to Shell's default (other tab
  // -> record, or app backgrounds from record).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'armed') {
        setPhase('setup');
        return true;
      }
      if (phase === 'running' || phase === 'ending') {
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase]);

  // virgin-cycle16 05 / virgin-cycle20 08: transient message in the yellow
  // button's sub-label (RECORD in setup, START when armed) or, while running,
  // in the status slot under the sector pane. Imperative rather than an
  // effect because Nathan wants it to re-fire on EVERY press. holdMs is per
  // message (GPS-off 2 s, permissions 5 s, no-sport 1 s).
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSportNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSub = useCallback((msg: string, holdMs: number = GPS_FLASH_HOLD_MS) => {
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    flashOpacity.stopAnimation();
    flashOpacity.setValue(1);
    setFlashMsg(msg);
    flashTimer.current = setTimeout(() => {
      flashTimer.current = null;
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: GPS_FLASH_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return; // a newer press stopped this fade — it owns the state now
        setFlashMsg(null);
      });
    }, holdMs);
  }, [flashOpacity]);
  useEffect(() => () => {
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    if (noSportNavTimer.current !== null) clearTimeout(noSportNavTimer.current);
    flashOpacity.stopAnimation();
  }, []);
  // virgin-cycle20 08 (Q4): RECORD with zero sports — say so for a second,
  // then hand over to SETTINGS (its SPORTS card adds the first sport).
  const onNoSport = useCallback(() => {
    flashSub(NO_SPORT_MSG, NO_SPORT_FLASH_HOLD_MS);
    if (noSportNavTimer.current !== null) clearTimeout(noSportNavTimer.current);
    noSportNavTimer.current = setTimeout(() => {
      noSportNavTimer.current = null;
      tabNav.go('settings');
    }, NO_SPORT_FLASH_HOLD_MS);
  }, [flashSub, tabNav]);
  // Sub-label of either yellow button: the flash while flashing (animated
  // opacity replaces startSub's static 0.75), the caption otherwise; nothing
  // at all for an empty caption (START carries only its word).
  const yellowSub = (caption: string) => {
    if (flashMsg === null && caption === '') return null;
    return (
      <Animated.Text style={[styles.bigBtnSub, styles.startSub, flashMsg !== null ? { opacity: flashOpacity } : null]}>
        {flashMsg ?? caption}
      </Animated.Text>
    );
  };

  const onRecord = useCallback(async () => {
    // Q4 belt-and-braces: the setup flow is not rendered while zero sports
    // exist, but the guard makes the invariant explicit. Reads the live store
    // (not a render-time flag).
    if (currentSports().sports.length === 0) return;
    setBusy(true);
    try {
      // virgin-cycle20 brief 11: a RECORD press restarts the quiet-read budget
      // (the GPS-off flash → rider enables location → the pill lights up by
      // itself). The post-permission refreshPositionOnce() below is unchanged.
      if (restartsBudget('record-press')) setPollEpoch((e) => e + 1);
      // Permissions move up to RECORD (armed press) so the OS dialogs happen
      // at the kerb, not on the bike — START (below) re-checks, idempotently.
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        // virgin-cycle16 05 / cycle20 08: message in the button, never a banner
        if (outcome === 'denied') flashSub(PERM_DENIED_MSG, PERM_FLASH_HOLD_MS); else flashSub(GPS_OFF_MSG);
        return; // stay in setup
      }
      // Display-only, best-effort: improves the armed screen's map/location
      // before any ride is open (no fix is recorded — no ride exists yet).
      void refreshPositionOnce();
      setShowAnim('fwd');
    } catch (e) {
      Alert.alert('Could not check permissions', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [flashSub]);

  const onStart = useCallback(async () => {
    setBusy(true);
    setLastSummary(null);
    // A fresh ride must not inherit the previous one's "last moved" clock —
    // otherwise the map could read stationary for a moment at the very start.
    lastMovedRef.current = null;
    lastFixRef.current = null;
    // virgin-cycle20 brief 02: a fresh ride starts un-glued.
    riderDotStateRef.current = initialRiderDotState();
    setRiderDot(null);
    // WP-J: a fresh ride must not inherit the previous one's trail either.
    setTrail([]);
    setPauseMenu(false);
    try {
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        if (outcome === 'denied') flashSub(PERM_DENIED_MSG, PERM_FLASH_HOLD_MS); else flashSub(GPS_OFF_MSG); // virgin-cycle16 05 / cycle20 08
        return;
      }
      // virgin-cycle20 08 (Q5b): recording proceeds; the running screen's
      // status slot flashes the ask (START itself is gone the next frame).
      if (outcome === 'foreground-only') flashSub(PERM_FOREGROUND_ONLY_MSG, PERM_FLASH_HOLD_MS);
      // WP-1: RECORD's setup phase refuses to render the START flow at all
      // while zero sports exist (Q4, the C0 card), so this is unreachable in
      // practice — the null check is belt-and-braces, matching engine.ts's
      // own honest-typing note on the [] fallback below.
      const sportId = activeSportId();
      if (sportId === null) return; // unreachable in practice (see comment above); no dialog (virgin-cycle20 08)
      // virgin-cycle16 01 (Nathan 2026-09-28): 'new' at either end is an
      // ordinary first ride, not a free ride — it starts exactly like a known
      // pair with no route yet (wayPick null, sport-scoped candidates). What
      // it becomes is decided AFTER the ride, on the ride-detail overlay.
      setRideWayHint(pickedWayRef.current?.refLineId ?? null);
      // WP-1 (C3): belt-and-braces engine scoping — the hard pick already
      // restricts scoring to one way, but this keeps the recovery path's
      // session.wayIds honest.
      const s: ActiveSession = await startTracking({
        wayPick: pickedWayRef.current?.id ?? null,
        wayIds: [...(wayIdsOfSport(currentCatalog(), sportId, currentSports()) ?? [])],
        startContext: startContextRef.current ?? undefined,
        sportId,
      });
      const ctx = startContextRef.current;
      ridePickRef.current = {
        from: ctx && ctx.from !== NEW_ID ? ctx.from : null,
        to: ctx && ctx.to !== NEW_ID ? ctx.to : null,
      };
      setSession(s);
    } catch (e) {
      Alert.alert('Could not start tracking', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [flashSub]);

  const onEnd = useCallback(async () => {
    setBusy(true);
    try {
      // Cycle 024 (WP-D2): settle a route BEFORE handing the ride to Result —
      // finalize() unmatches a pick that never fired a gate (virgin-cycle21); it
      // must run before rememberRide, which reads the CURRENT state, not what
      // stopTracking returns.
      liveEngine.finalize();
      // Cycle 024 (WP-A1): a real session hands its rideId/startedAtMs through
      // so the finished ride gets a persistent store entry, not just an
      // in-session session:-id one (B-28's other half).
      const s = sessionRef.current;
      // WP-H: capture the finished ride's identity for the post-STOP handoff
      // to the ride detail — set here (still in scope) rather than at the
      // 'ending' phase flip below, mirroring how `s` itself is read here.
      endedRef.current = s
        ? { rideId: s.rideId, startedAtMs: s.startedAtMs, durationS: null, sportId: effectiveRideSportId(s.sportId, currentSports()) }
        : null;
      const finalState = liveEngine.getState();
      // An unmatched ride has track===null/lap===null, so rememberRide() harmlessly
      // clears `last` — desired: Result must not show a stale route ride as
      // "the ride you just finished" when the ride has no reference.
      rememberRide(finalState, s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : undefined);
      // virgin-cycle11 ranking reveal: built HERE, right after rememberRide has
      // already stored today's ride — buildRankingReveal's own default window
      // (ghostsFor WITH exclusion, R5) depends on that ordering.
      const nextReveal = s ? buildRankingReveal(finalState, s.rideId, s.startedAtMs) : null;
      const sum = await stopTracking();
      setLastSummary(sum);
      // virgin-cycle18 brief 04: the ride's wall-clock length, for a free-ride
      // record written from the naming card (onNamingFree) — same value the
      // ride detail's own "Save as free ride" takes from RideMeta.
      if (endedRef.current && sum) endedRef.current = { ...endedRef.current, durationS: Math.max(0, (sum.endMs - sum.startMs) / 1000) };
      // Retroactive way creation (OPEN-ITEMS item 2, extended by WP-F): a
      // finished ride may be ride 1 on a brand-new way — compute the naming
      // offer BEFORE the phase flip so 'ending' can show it. WP-F: the offer
      // is about the ride's ENDPOINT PAIR, not the engine's route verdict —
      // a ride the engine (soft/late/partially) matched can still end
      // somewhere no way of yours goes. finalState.track is handed over only
      // so draftWayCreation can refuse to mint a "new place" a few tens of
      // metres outside the matched way's own landmark (latelock_20260805:
      // 75 m past home's disc). WP-G: an existing way in this direction is no
      // longer a null-offer either — it comes back with existingWayId set (a
      // second Route on that Way). Null (no offer) now covers: short rides,
      // read failures.
      // WP-1 (C4): the ride's OWN sport (stamped at START), not whatever
      // the global active sport happens to be now — a sport switch made
      // from SETTINGS mid-ride must not retag the naming offer.
      const draft = s
        ? await draftRouteFromRide(s.rideId, s.startedAtMs, finalState.track, createExpoFsAdapter(), s.sportId ?? activeSportId())
        : null;
      // virgin-cycle18 brief 04 (decision 3): no reference AND nothing to
      // offer (no draft: unreadable / too short) — no card will ask, so the
      // ride is filed free right here. A ride with a reference already has a stored
      // result from rememberRide above; a draftable ride gets the card.
      if (s && finalState.track === null && draft === null) {
        const e = endedRef.current;
        if (e) markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
      }
      // Cycle 024 (WP-A2, Nathan 2026-08-19): "at the end when you press
      // stop it would be nice to show the animation again — but reversed."
      // session clears and phase flips to 'ending' TOGETHER, after the ride
      // is safely saved — the reversed mark then plays over the (now
      // session-less) screen; its onDone below is what actually lands on
      // Result.
      setSession(null);
      setPauseMenu(false);
      // WP-J: clear the trail before handing the screen to 'ending' — the
      // just-finished ride's line must not bleed into the next one's setup/
      // armed maps (which don't draw a trail anyway, but the state should
      // read empty the moment this ride is over).
      setTrail([]);
      // notes5 N5: a finished ride's explicit FROM tap must not carry into
      // the next ride's setup — the next setup gets a fresh suggestion.
      setFromExplicit(false);
      // virgin-cycle15 06 (D3): these five are ride-scoped by their own
      // comments above ("frozen at START", "the
      // LIVE map's route line") and none feeds the post-ride setup suggestion (unlike
      // from/to, deliberately left alone — D4). Reset here, at ride end, not
      // at the next ride's START, so any future consumer that reads them
      // between rides (results, ride-detail hand-off, a future "last ride"
      // panel) sees them cleared too — WP-H's own identity capture already
      // ran above, from `s`/`sessionRef`, not from these.
      setWayPick(null);
      pickedWayRef.current = null;
      setRideWayHint(null);
      setReveal(nextReveal);
      setRevealDone(nextReveal === null);
      // Brief 05: a quiet offer (namingOfferMode) is treated as no offer here —
      // the ride is already saved as the scored way, so the screen proceeds by
      // itself; only a full-card offer holds.
      postRevealRef.current = namingOfferMode(draft) === 'card' ? 'card' : 'rev';
      setPhase('ending');
      setNamingExpanded(false); // a fresh ride never starts expanded
      setNaming(draft);
      // No reveal: the end mark plays at once, exactly as before. With a reveal it
      // waits for onRevealPlayed (below).
      if (namingOfferMode(draft) !== 'card' && nextReveal === null) setShowAnim('rev');
    } catch (e) {
      Alert.alert('Could not stop cleanly', e instanceof Error ? e.message : String(e));
      // No navigation, no animation — stay exactly where the ride actually
      // is: still 'running' if the session survived the failed stop, else
      // fall back to 'setup' (mirrors sessionRef, not the stale `session`
      // closure — same reason onStart/onEnd read it throughout this file).
      setPhase(sessionRef.current ? 'running' : 'setup');
    } finally {
      setBusy(false);
    }
  }, []);

  // virgin-cycle11: the tower's climb-complete callback (fires once the
  // arrival fade finishes). Holds the landed board on screen for
  // REVEAL_HOLD_MS before whatever the 'ending' screen would have done
  // anyway (the card, or — with no card due — the reverse mark).
  const onRevealPlayed = useCallback(() => {
    // Inspect 2026-09-28: the rider already tapped "not <way>?" during the
    // climb — nothing to hold for, the card is due the moment the tower lands.
    if (namingExpandedRef.current) {
      setRevealDone(true);
      return;
    }
    revealHoldRef.current = setTimeout(() => {
      revealHoldRef.current = null;
      setRevealDone(true);
      // Brief 05: postRevealRef's 'rev' baseline (decided in onEnd) is
      // overridden if the rider tapped "not <way>?" during the hold —
      // namingExpandedRef is the live escape hatch the frozen baseline can't see.
      if (postRevealRef.current === 'rev' && !namingExpandedRef.current) setShowAnim('rev');
    }, REVEAL_HOLD_MS);
  }, []);

  // brief 05 follow-up (Inspect 2026-09-28): the "not <way>?" tap. Expands the
  // offer and, if the post-landing hold is running, ends it now — the card
  // shows at once and the cleared timer can never start the end mark later.
  // During the climb (no timer yet) onRevealPlayed above handles the landing.
  const onNotThisWay = useCallback(() => {
    setNamingExpanded(true);
    if (revealHoldRef.current) {
      clearTimeout(revealHoldRef.current);
      revealHoldRef.current = null;
      setRevealDone(true);
    }
  }, []);

  // OPEN-ITEMS item 2 — the naming card's two exits. Skip loses nothing: the
  // ride was already saved (rememberRide/raw JSONL) before
  // the card existed, and the next unmatched ride offers again.
  const onNamingSkip = useCallback(() => {
    setNaming(null);
    setShowAnim('rev');
  }, []);

  // virgin-cycle18 brief 04: SAVE AS FREE RIDE on the naming card. Files the
  // label from the ended session's identity (endedRef, set in onEnd), then
  // proceeds exactly as skip did — the post-stop detail opens on the FREE
  // RIDE card. The ride was saved before the card existed; this only says
  // where it lives.
  const onNamingFree = useCallback(() => {
    const e = endedRef.current;
    if (e) {
      // virgin-cycle18 06b (one home): this card can offer SAVE AS FREE RIDE on
      // a ride the engine scored (WP-F, or `not <way>?` + an endpoint changed
      // onto a pair with no route). Its stored result would be a second home —
      // drop it, store and window, before filing the free record. The free
      // record keeps the settle/boot backfill from re-deriving it.
      if (getStoredResult(e.rideId) !== null) {
        void removeStoredResult(e.rideId);
        dropRecorded(e.rideId);
      }
      markRideFree(e.rideId, e.startedAtMs, e.durationS, e.sportId);
    }
    setNaming(null);
    setShowAnim('rev');
  }, []);

  const onNamingSave = useCallback(async (names: RouteNames, choices: EndpointChoices) => {
    const drafted = namingRef.current;
    if (!drafted) return;
    // virgin-cycle18 brief 05: the rider may have pointed an endpoint at an
    // existing place on the card — the draft that is built is the one with
    // those choices applied (pure; identity when both are 'proposed').
    // 06b (Inspect finding 3): the draft is scoped to the RIDE's sport
    // (draftRouteFromRide) — a choice must be resolved in that same catalog,
    // not the global active sport's.
    const rideCatalog = scopeCatalog(currentCatalog(), drafted.sportId, currentSports());
    const draft = applyEndpointChoices(rideCatalog, drafted, choices);
    // WP-G: belt to the card's own braces — the card already disables ADD
    // ROUTE on a duplicate, but the pick could have gone stale between
    // renders (another ride landed the same specs in the meantime).
    if (draft.existingRouteId && findWayWithSpecs(rideCatalog, draft.existingRouteId, names.specs ?? [])) {
      // virgin-cycle20 08: race only (the card already disables ADD ROUTE on a duplicate) — fail silently
      return;
    }
    setBusy(true);
    try {
      // OPEN-ITEMS item 3 (Part A): build the route's real reference line
      // from the ride that is becoming its reference — null on ANY failure
      // => the way saves exactly as before (unresolvable refLineId). Part B:
      // with a real line the v1 gate set is born fully seeded. Both live in
      // store/wayFromRide.ts's createWayFromDraft (WP-H §4.9).
      const out = await createRouteFromDraft(draft, names, createExpoFsAdapter());
      if (!out.ok) {
        // saveUserCatalog refused (the MERGED catalog would not validate)
        // and changed nothing — surface WHY, keep the card up; SKIP remains.
        Alert.alert('Could not create the route', out.errors.join('\n'));
        return;
      }
      setNaming(null);
      // virgin-cycle18 brief 04: createRouteFromDraft stored the founding
      // ride's own result (§5) — mirror it so a second ride in this session
      // already races it (brief 02's "Nathan's call 2").
      const founding = getStoredResult(draft.rideId);
      if (founding) replaceRecorded(founding);
      else dropRecorded(draft.rideId); // brief 06: no result any more (a stale one on another way was dropped) — leave the window too
      if (out.adjust) {
        // SETUP-UX §4: offer tap-then-nudge before the end mark plays;
        // the card's exits (onAdjustKeep/onAdjustSave) start the animation.
        setAdjust(out.adjust);
      } else {
        setShowAnim('rev');
      }
    } catch (e) {
      Alert.alert('Could not create the route', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // OPEN-ITEMS item 3 (Part B) — the adjust card's two exits. KEEP costs
  // nothing: the seeded v1 set was already saved by CREATE WAY. SAVE with
  // moved gates mints VERSION 2 through the existing addGateSet ("a gate
  // move mints a new version; history is never deleted" — store/catalog.ts).
  const onAdjustKeep = useCallback(() => {
    setAdjust(null);
    setShowAnim('rev');
  }, []);

  const onAdjustSave = useCallback(async (chainageM: number[]) => {
    const a = adjustRef.current;
    if (!a) return;
    setBusy(true);
    try {
      // unmoved gates come back { ok:true, moved:false } with no write —
      // the same exit as before (store/wayFromRide.ts, WP-H §4.9).
      const out = await saveAdjustedGates(a, chainageM, createExpoFsAdapter());
      if (!out.ok) {
        // refused — surface WHY, keep the card up; KEEP remains available.
        Alert.alert('Could not save the gates', out.errors.join('\n'));
        return;
      }
      setAdjust(null);
      // virgin-cycle18 brief 04: the v2 re-time of the reference is what the
      // next ride races — mirror it (replaceRecorded drops it if it no longer
      // ranks). referenceRetimed:false = saveAdjustedGates REMOVED the v1
      // result: drop the in-session copy too (Inspect follow-up 2026-09-30),
      // or the next ride this session would race a dot timed at the old gates.
      const refRideId = a.wayId.startsWith('way:') ? a.wayId.slice('way:'.length) : a.wayId;
      const refRide = getStoredResult(refRideId);
      if (refRide) replaceRecorded(refRide);
      else dropRecorded(refRideId);
      setShowAnim('rev');
    } catch (e) {
      Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // Discard (Cycle 025, Nathan 2026-08-26): end WITHOUT saving. Reuses the
  // RIDES-tab deletion path verbatim (deleteRide + removeStoredResult +
  // dropRecorded — RidesScreen.onDelete) so there is exactly ONE deletion
  // mechanism. A discarded ride is REALLY deleted, not hidden ("I only delete
  // rides that I genuinely did not do or should not count"). stopTracking()
  // must run first: deleteRide refuses while the ride is in storage's live
  // set, and endRide (inside stopTracking) is what clears it.
  const onDiscard = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    Alert.alert(
      'Discard activity?',
      'This stops recording and permanently removes the raw trace. Nothing is saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await stopTracking();
            } catch (e) {
              // Mirror onEnd's failure stance: stay where the ride really is.
              Alert.alert('Could not stop cleanly', e instanceof Error ? e.message : String(e));
              setPhase(sessionRef.current ? 'running' : 'setup');
              setBusy(false);
              return;
            }
            // Tracking is stopped. No rememberRide, no
            // 'ending' phase, no reversed mark, no Result handoff — nothing
            // was kept, so fold straight to the setup phase (running -> setup is
            // legal: recordFlow.ts). Result's "last ride" intentionally still
            // shows the previous finished ride, never the discarded one.
            setSession(null);
            setPauseMenu(false);
            setLastSummary(null);
            // WP-J: discard folds straight to the setup phase — the trail dies
            // with the ride, same as everything else nothing was kept.
            setTrail([]);
            // notes5 N5: same reset as onEnd — a discarded ride's explicit
            // FROM tap must not carry into the next ride's setup.
            setFromExplicit(false);
            // virgin-cycle15 06 (D3): same ride-scoped reset as onEnd, and
            // for the same reason — a discarded ride is a ride ending too.
            setWayPick(null);
            pickedWayRef.current = null;
            setRideWayHint(null);
            setPhase('setup');
            try {
              await deleteRide(s.rideId);
              // Defensive mirrors of RidesScreen.onDelete: no result sidecar
              // or in-session entry is written on this path (rememberRide was
              // skipped), but never risk leaving one orphaned.
              await removeStoredResult(s.rideId);
              dropRecorded(s.rideId);
            } catch (e) {
              Alert.alert(
                'Could not discard',
                `${e instanceof Error ? e.message : String(e)}\nThe activity was ended and kept instead — you can delete it from ACTIVITIES.`,
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, []);

  const recording = session != null;
  const hasFix = status.lastLat !== null && status.lastLon !== null;
  const stationary = recording && hasFix && lastMovedRef.current !== null
    && (now - lastMovedRef.current) > STOPPED_AFTER_MS;

  // virgin-cycle20 brief 08 (Nathan, clutter review): the rotating status
  // slot is gone. virgin-cycle22 02 (Nathan 2026-10-05): the last status text
  // (the fix-is-fresh label) is gone too — the slot below only carries the
  // 5 s permission flash (flashMsg) and is otherwise empty. The engine's route
  // logic is untouched; it is simply not narrated here any more.
  // Cycle-2 WP-A: reference line vs live trail, mutually exclusive — see
  // recordFlow.ts liveMapOverlayFor. Derived per render (no effect/state):
  // virgin-cycle21: the overlay is the START pick, frozen — never what the engine
  // decides, so no way you did not pick is ever drawn.
  const mapOverlay = liveMapOverlayFor({ wayHint: rideWayHint });

  // Colour comes from the ghost history of the ride's reference (the START pick)
  // only: with no reference there is nothing honest to compare against, so everything stays
  // neutral (D-025). Sector index 0 means "the whole lap". The rule itself is
  // colourModel.liveTierFor (headless-tested); the current ride is excluded by
  // id so the lap chip cannot change colour between the FINISH gate and the
  // 'ending' screen — onEnd's rememberRide() stores today's ride while this
  // tree is still rendering (B-44 for the live screen).
  //
  // virgin-cycle20 brief 07 (Nathan, 2026-10-02): the lap chip (index 0) shows its
  // REAL tier the instant it lands — purple / green / yellow against the same
  // window the tower reveals after STOP, so the two always agree. This reverts
  // cycle11 R1's 'neutral' override on the lap chip exactly as R1 offered; the
  // rank NUMBER is still revealed after STOP by the tower only (posChip stays null).
  const tierOf = (sectorIndex: number, timeS: number | null): Tier =>
    liveTierFor(live.track, sectorIndex, timeS, session?.rideId);

  // NOTE: the gate buzz is NOT fired here. src/location/index.ts owns it —
  // it sees every fire even with the screen off, and two buzzers meant the
  // rider felt each gate twice (cycle 009). This screen only sets the flag.

  // WP-K (phase 2): sector spans on the live map — the segment BETWEEN gates,
  // never the tick (Nathan: "they are gates"). Same comparison window tierOf()
  // uses (sectorValues on the reference, [] without one — D-025), the
  // store's own sectorHistory predicate (clean AND interrupted sectors on the
  // scored clock, virgin-cycle20 brief 10 — no longer clean-only), painted
  // through tierLineColour (the map-line source of truth, never
  // chipColors().text). OFF passes ALL_YELLOW, not undefined: the sector-spans
  // source has to be mounted from the same render as the route line whatever
  // the setting, or a mid-ride flip would mount it above the rider dot
  // (routeMapView.tsx mount-order rule). No leadColour here (brief §3.7).
  const sectorColours = useMemo(
    () => (settings.sectorColours
      ? liveSectorColours(
        live.sectors,
        (i) => (live.track === null ? [] : sectorValues(live.track, i)),
        tierLineColour,
      )
      : ALL_YELLOW),
    [live.sectors, live.track, settings.sectorColours],
  );


  // cycle15 brief 14 (Nathan 2026-09-27): most-used places first, ties keep
  // catalog order. Counted on demand from stored results (no cache); only
  // worth doing while the START / GOING TO pill rows are on screen.
  const startableUnsorted = CATALOG.landmarks.filter((l) => l.offerAtStart);
  const startable = phase === 'setup'
    ? sortLandmarksByUsage(startableUnsorted, landmarkUsageCounts(CATALOG))
    : startableUnsorted;

  // DETECTED start: the real one, from the last fix through the catalog. Null
  // when the phone is nowhere known -- it used to claim "home" regardless
  // (cycle 009).
  const detected = status.lastLat !== null && status.lastLon !== null
    ? landmarkAt(CATALOG, { lat: status.lastLat, lon: status.lastLon }, Date.now())
    : null;
  // notes5 N5: the detected landmark is a SUGGESTION — it stands in for
  // `from` only while nothing has been tapped this ride (fromExplicit false).
  // A tap sticks even if detection later changes or goes null.
  // recordFlow.ts's effectiveFromId owns the pure rule so it is tested
  // without RN.
  const fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit });

  // The way the rider picked, and the routes on it -- so the ghost count is
  // THIS way's, not always Morning's.
  const route = CATALOG.routes.find(
    (w) => w.startLandmarkId === fromId && w.endLandmarkId === to,
  );
  const routeWays = route ? sortWaysForDisplay(CATALOG.ways.filter((r) => r.routeId === route.id)) : [];
  const ghostCount = routeWays.reduce((n, r) => n + ghostsFor(r.id).length, 0);
  const pickedWay: Way | null = route
    ? (wayPick && wayPick.routeId === route.id
        ? (routeWays.find((r) => r.id === wayPick.wayId) ?? defaultWayFor(routeWays))
        : defaultWayFor(routeWays))
    : null;
  // N9 (2026-09-02, GPX+ pick/lock-change logging): was the pick rendered
  // above an explicit RECORD-tab tap, or the silent §8a default? A 'new'
  // endpoint (no `route`, hence no `way`) or a way with no pickable route
  // both say 'none' — there is nothing a rider could have tapped.
  const pickSource: StartContext['pickSource'] = !pickedWay
    ? 'none'
    : wayPick !== null && wayPick.routeId === route?.id && routeWays.some((r) => r.id === wayPick.wayId)
      ? 'picked'
      : 'default';
  // Mirror for onStart's [] useCallback closure (it must read the CURRENT pick).
  const pickedWayRef = useRef<Way | null>(null);
  pickedWayRef.current = pickedWay;

  // virgin-cycle20 06 (Nathan 2026-10-01, START-gate lag): the selfs belong to the
  // way that is ON SCREEN, not to the engine — during a ride the engine's
  // reference (virgin-cycle21: the START pick, fixed at START and never
  // switched, so nothing reloads at START or mid-ride), on the setup/armed screen the pick
  // itself. So the window is read from disk while the rider is still choosing /
  // arming, and is already on the map (parked at the START gate) when START is
  // pressed. Reload triggers: another way picked, a gate-set edit (new cache
  // keys), or the window itself changing — a ride just saved joins ghostsFor()'s
  // slice the moment rememberRide stores it. ghostsFor is a filter over the
  // in-memory results (ghostCount above already calls it per render).
  const selfWayId = live.track ?? pickedWay?.id ?? null;
  const selfGateSetVersion = selfWayId === null ? 1 : (gateSetFor(currentCatalog(), selfWayId)?.version ?? 1);
  const selfWindowKey = selfWayId === null ? '' : ghostsFor(selfWayId).map((r) => r.rideId).join(',');
  const [selfTracks, setSelfTracks] = useState<SelfTrack[]>([]);
  useEffect(() => {
    if (selfWayId === null || !settings.selfDots) {
      setSelfTracks([]);
      return;
    }
    let cancelled = false;
    void loadSelfTracks(selfWayId, selfGateSetVersion, createExpoFsAdapter()).then((tracks) => {
      if (!cancelled) setSelfTracks(tracks);
    });
    return () => { cancelled = true; };
  }, [selfWayId, selfGateSetVersion, selfWindowKey, settings.selfDots]);

  // Tick: 250 ms while running (not 10 Hz — the rider dot itself only moves
  // per GPS fix; four frames a second is smooth enough for a 5 px dot and
  // keeps the map re-render cheap). Skipped entirely when there is nothing
  // to animate. live.startGateT is a plain number|null, so this effect only
  // restarts the interval when it actually changes (gate-0 fire), not
  // on every fix.
  const [selfDots, setSelfDots] = useState<SelfDot[]>([]);
  useEffect(() => {
    if (phase !== 'running' || selfTracks.length === 0) {
      setSelfDots([]);
      return;
    }
    const tick = () => {
      const elapsedMs = live.startGateT === null ? null : Date.now() - live.startGateT * 1000;
      setSelfDots(selfDotsAt(selfTracks, elapsedMs));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, selfTracks, live.startGateT]);

  // virgin-cycle11: the reveal's post-landing hold timer must not fire into
  // an unmounted screen.
  useEffect(() => () => {
    if (revealHoldRef.current) clearTimeout(revealHoldRef.current);
  }, []);

  // follow-up (live PX, R10): 'P4' among the selfs on the map, by chainage —
  // null before START, once the lap lands (the rank is the tower's after
  // STOP, cycle11 R1), off the route, or with self dots off.
  const livePos = useMemo(() => {
    if (!settings.selfDots || live.startGateT === null || live.lap !== null) return null;
    const p = selfLivePosition(selfDots, live.chainageM);
    return p === null ? null : `P${p}`;
  }, [selfDots, live.chainageM, live.startGateT, live.lap, settings.selfDots]);

  // Cycle 024 (WP-A2): the armed screen's readytag line names from/to by
  // their catalog label (mirrors the mockup's `lm()` helper), not their id.
  // WP-B: NEW_ID is a UI pseudo-landmark, not a catalog entry — labelled
  // 'new' rather than falling through to the raw '~new' id.
  const landmarkLabel = (id: string): string =>
    id === NEW_ID ? 'new' : (CATALOG.landmarks.find((l) => l.id === id)?.label ?? id);
  // N9: mirror for onStart's [] useCallback closure (it must read the
  // CURRENT RECORD-tab state at the instant START is pressed) — same reason
  // pickedWayRef mirrors above.
  const startContextRef = useRef<StartContext | null>(null);
  startContextRef.current = {
    from: fromId, to, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(to), pickSource,
  };

  // Cycle 024 (WP-A2): 'armed' — the RACE screen, ready but not started
  // (Nathan 2026-08-19: "the selected route should be shown with your
  // location and everything set but not started"). Records nothing, starts
  // nothing (D-042 untouched — the clock anchor is still startTracking()'s
  // startedAtMs, set only when START below is pressed).
  if (phase === 'armed') {
    return (
      <View style={styles.raceColumn}>
        <Text style={styles.trackLine}>
          {landmarkLabel(fromId)} → {landmarkLabel(to)}
          {route && pickedWay ? ` · ${wayVariantLabel(pickedWay.id, route, pickedWay.specs)}` : ''}
        </Text>
        <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
          <WayMapView
            wayId={pickedWay?.refLineId ?? null}
            lat={status.lastLat}
            lon={status.lastLon}
            zoom={1}
            variant="live"
            liveState="prestart"
            fill
          />
        </View>
        <Pressable
          style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
          disabled={busy}
          onPress={onStart}
        >
          <Text style={[styles.bigBtnText, styles.startText]}>START</Text>
          {yellowSub('')}
        </Pressable>
        <Pressable style={styles.cancelBar} onPress={() => setPhase('setup')}>
          <Text style={styles.cancelBarText}>‹ cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Cycle 024 (WP-A2): 'ending' — the ride is already saved (onEnd ran
  // rememberRide()/stopTracking() before setting this phase); the reversed
  // launch mark plays on top (below) before folding back to 'setup' and
  // handing off to Result. No PAUSE/END here — the ride is already over.
  if (phase === 'ending') {
    const endingSlot = endingSlotFor({
      revealDone, adjust: adjust !== null, offer: namingOfferMode(naming), namingExpanded,
    });
    return (
      <View style={styles.raceColumn}>
        {/* virgin-cycle11: tower + card can exceed one screen on a small
            phone — the idle screen's own ScrollView-plus-absolute-overlay
            pattern, mirrored here. The end-of-ride LaunchAnimation stays an
            absolute-fill sibling below, outside the scroll. */}
        <ScrollView
          style={{ flex: 1, alignSelf: 'stretch' }}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.trackLine}>
            {reveal !== null
              ? 'Activity saved.' // virgin-cycle11 R2: the tower's TODAY row is the headline
              : lastSummary ? `Activity saved · ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}` : 'Activity saved.'}
          </Text>
          {reveal !== null && (
            <TimingTower
              model={reveal.model}
              justFinished
              reveal
              climbMs={reveal.climbMs}
              startDelayMs={REVEAL_START_DELAY_MS}
              onPlayed={onRevealPlayed}
            />
          )}
          {/* Inspect 2026-09-28: which one thing sits under the tower is a pure
              rule (recordFlow.ts endingSlotFor) — the "not <way>?" link is only
              reachable BEFORE the reveal lands; inside the revealDone slot it
              rendered in the same tick as the end mark and was never tappable. */}
          {endingSlot === 'adjust' && adjust !== null ? (
            <GateAdjustCard
              wayId={adjust.wayId}
              refLine={adjust.ref}
              refLengthM={adjust.refLengthM}
              initialChainageM={adjust.chainageM}
              busy={busy}
              onKeep={onAdjustKeep}
              onSave={onAdjustSave}
            />
          ) : endingSlot === 'card' && naming !== null ? (
            <RouteNamingCard
              startExistingLabel={existingLandmarkLabel(naming.start)}
              endExistingLabel={existingLandmarkLabel(naming.end)}
              loop={naming.loop}
              busy={busy}
              matchedWayLabel={naming.matchedWayId ? wayLabelIn(currentCatalog(), naming.matchedWayId) : null}
              existingRoute={naming.existingRouteId ? existingRouteProps(naming.existingRouteId) : null}
              vocabulary={specVocabulary(activeCatalog().ways)}
              places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}
              startProposedId={naming.start.kind === 'existing' ? naming.start.landmarkId : null}
              endProposedId={naming.end.kind === 'existing' ? naming.end.landmarkId : null}
              startPickedId={ridePickRef.current.from}
              endPickedId={ridePickRef.current.to}
              routeForPair={(ch) => {
                const d = applyEndpointChoices(scopeCatalog(currentCatalog(), naming.sportId, currentSports()), naming, ch);
                return d.existingRouteId ? existingRouteProps(d.existingRouteId) : null;
              }}
              onSave={onNamingSave}
              onSkip={onNamingSkip}
              onSaveFree={onNamingFree}
            />
          ) : endingSlot === 'link' && naming !== null && naming.matchedWayId ? (
            /* brief 05: quiet offer — the ride is already saved as the scored
               way; this one dim line is the whole correction affordance. Shown
               through the tower climb + hold; tapping holds the screen. */
            <Pressable
              style={styles.notThisWayBtn}
              disabled={busy || showAnim !== null}
              onPress={onNotThisWay}
              accessibilityLabel="This activity was a different way"
            >
              <Text style={styles.notThisWayText}>{`not ${wayLabelIn(currentCatalog(), naming.matchedWayId)}?`}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        {showAnim === 'rev' && (
          <LaunchAnimation
            onDone={() => {
              setShowAnim(null);
              setReveal(null); // a board must never survive into the next ride's 'ending'
              setNaming(null); // brief 05: a quiet offer rides through the mark un-cleared
              setNamingExpanded(false);
              setPhase('setup');
              // WP-H: post-STOP now opens the ride detail overlay instead of
              // the retired RESULT tab. No session id (should not happen for
              // a real ride) simply leaves the screen on RECORD setup.
              const ended = endedRef.current;
              endedRef.current = null;
              if (ended) {
                tabNav.openRide({ rideId: ended.rideId, source: 'post-stop', startedAtMs: ended.startedAtMs });
              }
            }}
          />
        )}
      </View>
    );
  }

  // Cycle 020 (Nathan 2026-08-19): while recording, do not use the centred
  // idle ScrollView — a full-height column instead, so the map/clock/status/
  // PAUSE fill the tab edge to edge (no centring, no blank bands). The idle
  // screen (below) is unchanged.
  if (phase === 'running') {
    // Defensive only: the sync effect above never sets 'running' without a
    // real session, so this is unreachable in practice — but session.
    // startedAtMs below needs the null-narrow either way.
    if (!session) return null;
    return (
      <View style={styles.raceColumn}>
        {/* The live map, big, at the top (Cycle 020) — was a slim ribbon below
            the clock/strip; Nathan's ruling overrules B-51's "subordinate
            ribbon" layout for race mode. flex:1 keeps the rest pinned
            to the bottom. */}
        <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
          <WayMapView
            wayId={mapOverlay.wayId}
            lat={riderDot?.lat ?? status.lastLat}
            lon={riderDot?.lon ?? status.lastLon}
            zoom={4}
            gateColours={undefined}
            sectorColours={sectorColours}
            trail={mapOverlay.showTrail ? trail : undefined}
            selfs={settings.selfDots ? selfDots : undefined}
            variant="live"
            liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
            fill
          />
        </View>
        {/* LIVE surface v2 (LAYOUT §2/§2a) — real engine feed, real clock:
            rate-1 timebase anchored at recording start (whole-ride elapsed,
            per Nathan's lap-clock ruling). virgin-cycle11 R1: posChip is
            always null — the rank is revealed after STOP by the timing
            tower, never announced here. virgin-cycle22 04: at the finish the
            LAP time flashes like a sector, then this clock runs on until STOP. */}
        <LiveSectorPane
          vm={viewModelFromEngine(
            live,
            realTimebase(session.startedAtMs),
            null, // virgin-cycle11 R1: the rank is revealed after STOP by the tower, never here
            tierOf, // brief 07: real lap tier at the line (cycle11 R1 revert)
            livePos,
          )}
        />
        {/* virgin-cycle20 08 / virgin-cycle22 02: one quiet slot — the 5 s flash
            of the foreground-only permission ask (Q5b) or nothing. Storage
            errors stay permanent below. */}
        <Animated.Text style={[styles.trackLine, flashMsg !== null ? { opacity: flashOpacity } : null]}>
          {flashMsg ?? ''}
        </Animated.Text>
        {status.storageErrors > 0 && (
          <Text style={styles.warn}>
            {status.storageErrors} storage errors
          </Text>
        )}
        {/* PAUSE → RESUME | END (Cycle 020): a safety catch, not a real pause
            — the recording service and lap clock keep running underneath
            (D-042). Amber, no red (D-013). Cycle 025 (Nathan 2026-08-26): the
            expanded menu also carries a quiet third action, Discard ride,
            which reuses the RIDES-tab deletion path verbatim (see onDiscard
            below) — a discarded ride is really deleted, never hidden. */}
        {!pauseMenu ? (
          <Pressable
            style={[styles.stopSlim, busy && styles.busy]}
            disabled={busy}
            onPress={() => { noteButtonPress('pause'); setPauseMenu(true); }}
          >
            <Text style={styles.stopSlimText}>PAUSE</Text>
          </Pressable>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Pressable
                style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
                disabled={busy}
                onPress={() => { noteButtonPress('resume'); setPauseMenu(false); }}
              >
                <Text style={styles.stopSlimText} numberOfLines={1}>RESUME</Text>
              </Pressable>
              <Pressable
                style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
                disabled={busy}
                onPress={onEnd}
              >
                <Text style={styles.stopSlimText} numberOfLines={1}>END</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.discardBar, busy && styles.busy]}
              disabled={busy}
              onPress={onDiscard}
            >
              <Text style={styles.discardBarText}>Discard activity</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // 'setup' (default phase). Wrapped in a plain flex:1 View (not returned
  // bare) so the forward launch-mark overlay (Cycle 024, WP-A2) can sit
  // alongside the ScrollView as an absolute-fill sibling — it styles itself
  // absolute inset 0 with zIndex 1000, so it covers the tab area too.
  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Theme toggle — settings-lite; hidden while recording (inert surface). */}
      <Pressable style={styles.modePill} onPress={toggleMode}>
        <Text style={styles.modePillText}>{mode === 'daylight' ? '☾ night' : '☀ day'}</Text>
      </Pressable>

      {/* Idle readout */}
      <View style={styles.readout}>
        {/* virgin-cycle16 06 (Nathan 2026-09-28): the drawn Q mark that used to
            sit above the word is retired — the word alone heads the tab and
            the freed height went to the map below (200 → 330). */}
        <Text style={styles.appTitle}>Qualifire</Text>
        {/* B-51: at the rack, before START — real pannable streets, the
            candidate route (whichever way/route is picked so far). WP-D
            (2026-09-02): when nothing is picked yet — or the pick is a
            user-created route with no drawable asset (WP-P's "HomeWork") —
            RouteMapView now renders rider-only (real tiles + the dot, no
            route line) instead of a blank space; it no longer falls back to
            drawing some other route from the asset manifest. Cycle-2 WP-A
            removed the catalog-wide defaultRouteId() fallback in
            routeMapView.tsx, so a null pick draws rider-only even once the
            catalog holds drawable routes. */}
        <View style={{ alignSelf: 'stretch' }}>
          <WayMapView
            wayId={pickedWay?.refLineId ?? null}
            lat={status.lastLat}
            lon={status.lastLon}
            zoom={1}
            showRider
            variant="live"
            liveState="prestart"
            height={330}
          />
        </View>
        {/* Q4 (WP-1): zero sports blocks the whole setup flow — a ride
            cannot start without a sport for it to belong to. No onboarding
            screen. virgin-cycle20 08: no inline form — RECORD flashes and
            hands over to SETTINGS. */}
        {noSport ? null : (
          <>
            {/* Q3 (WP-1): the sport row shows only with 2+ sports AND the
                SETTINGS toggle on — hidden by construction below that. */}
            {showSportPillRow(currentSports().sports.length, settings.showSportPillOnRecord) ? (
              <View style={styles.startFlow}>
                <Text style={styles.flowLabel}>SPORT</Text>
                <View style={styles.pillRow}>
                  {currentSports().sports.map((sp) => (
                    <Pressable key={sp.id} onPress={() => pickSport(sp.id)}
                      style={[styles.pill, activeSportId() === sp.id && styles.pillOn]}>
                      <Text style={[styles.pillText, activeSportId() === sp.id && styles.pillTextOn]}>
                        {sp.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.startFlow}>
              <Text style={styles.flowLabel}>
                {settings.startMode === 'auto'
                  ? (fromId === detected?.id
                      ? 'DETECTED START'
                      : detected
                        ? 'STARTING FROM'
                        : 'START NOT DETECTED')
                  : 'STARTING FROM'}
              </Text>
              <View style={styles.pillRow}>
                {startable.map((l) => (
                  <Pressable key={l.id} onPress={() => pickFrom(l.id)}
                    style={[styles.pill, fromId === l.id && styles.pillOn]}>
                    <Text style={[styles.pillText, fromId === l.id && styles.pillTextOn]}>
                      {l.label}{detected?.id === l.id ? ' ✓' : ''}
                    </Text>
                  </Pressable>
                ))}
                {/* WP-B: 'new' — unknown origin (Nathan: "go from
                    work>>new"), i.e. the first ride from/to this landmark. Not a
                    catalog landmark, so it is added here rather than to `startable`. */}
                <Pressable key={NEW_ID} onPress={() => pickFrom(NEW_ID)}
                  style={[styles.pill, fromId === NEW_ID && styles.pillOn]}>
                  <Text style={[styles.pillText, fromId === NEW_ID && styles.pillTextOn]}>new</Text>
                </Pressable>
              </View>
              <Text style={styles.flowLabel}>GOING TO</Text>
              <View style={styles.pillRow}>
                {startable.filter((l) => l.id !== fromId).map((l) => (
                  <Pressable key={l.id} onPress={() => setTo(l.id)}
                    style={[styles.pill, to === l.id && styles.pillOn]}>
                    <Text style={[styles.pillText, to === l.id && styles.pillTextOn]}>{l.label}</Text>
                  </Pressable>
                ))}
                {/* WP-B: 'new' — unknown destination (e.g. new>>home), i.e. the
                    first ride from/to this landmark. */}
                <Pressable key={NEW_ID} onPress={() => setTo(NEW_ID)}
                  style={[styles.pill, to === NEW_ID && styles.pillOn]}>
                  <Text style={[styles.pillText, to === NEW_ID && styles.pillTextOn]}>new</Text>
                </Pressable>
              </View>
              {/* A 'new' endpoint never resolves a route, so this is hidden by construction. */}
              {route && routeWays.length > 1 ? (
                <>
                  <Text style={styles.flowLabel}>WHICH WAY TODAY?</Text>
                  {hasSpecs(routeWays)
                    ? specPickRows(routeWays, pickedWay?.id ?? null, defaultWayFor).map((row) => (
                        <View key={row.depth} style={styles.pillRow}>
                          {row.options.map((o) => (
                            <Pressable key={`${row.depth}:${o.label}`} onPress={() => setWayPick({ routeId: route.id, wayId: o.way.id })}
                              style={[styles.pill, o.on && styles.pillOn]}>
                              <Text style={[styles.pillText, o.on && styles.pillTextOn]}>{o.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ))
                    : (
                      <View style={styles.pillRow}>
                        {routeWays.map((r) => (
                          <Pressable key={r.id} onPress={() => setWayPick({ routeId: route.id, wayId: r.id })}
                            style={[styles.pill, pickedWay?.id === r.id && styles.pillOn]}>
                            <Text style={[styles.pillText, pickedWay?.id === r.id && styles.pillTextOn]}>
                              {wayVariantLabel(r.id, route, r.specs)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                </>
              ) : null}
            </View>
            {lastSummary ? (
              <Text style={styles.sub}>
                Activity saved · {fmtElapsed(lastSummary.endMs - lastSummary.startMs)}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {/* RECORD — arms the ride (Cycle 024, WP-A2, Nathan 2026-08-19): plays
          the launch mark, then the RACE screen is ready but not moving until
          START is pressed there. Amber, no red (D-013) — see WP-A2's
          NEEDS-NATHAN #1 for the red option. Q4 (WP-1): while zero sports
          exist the button flashes "No sport configured yet" for a second and
          switches to SETTINGS (recordFlow.recordPressAction). virgin-cycle14 brief 07 (Nathan #10): the caption
          under RECORD is the slogan now, not the arming hint. */}
      <Pressable
        style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
        disabled={busy}
        onPress={() => {
          const action = recordPressAction({ sportCount: currentSports().sports.length });
          if (action === 'arm') void onRecord();
          else onNoSport();
        }}
      >
        {/* Record-dot glyph (mockup: red slab + white dot; D-013 "NO RED
            ANYWHERE" forbids the red, so this ships as a charcoal dot on the
            existing accent-yellow slab — t.onAccent inherited from the
            parent Text, same colour the RECORD label itself uses. */}
        <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
        {yellowSub('same activity · new meaning')}
      </Pressable>

    </ScrollView>
    {showAnim === 'fwd' && (
      <LaunchAnimation
        onDone={() => {
          setShowAnim(null);
          setPhase('armed');
        }}
      />
    )}
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  scroll: { flex: 1 },
  // WP-M (Nathan Q5, 2026-09-03: "tight and grows"): the setup form starts at
  // the top and grows downward as the catalog fills — no vertical centring,
  // no blank band above the title. Pills are already flush-left + wrapping
  // (startFlow stretches; pillRow's default justifyContent is flex-start).
  // alignItems stays 'center': it governs only the problem-state texts here
  // (readout and RECORD both alignSelf: 'stretch'). Tall content still scrolls.
  content: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start',
    padding: 20, paddingBottom: 36, gap: 22,
  },
  modePill: {
    position: 'absolute',
    top: 14,
    right: 16,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modePillText: { color: t.text2, fontSize: 12 },
  // Cycle 020 (Nathan 2026-08-19): race mode's full-height column — no
  // centring, no blank bands; fills the tab area edge to edge.
  raceColumn: {
    flex: 1, alignSelf: 'stretch', backgroundColor: t.race.bg,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, gap: 8,
  },
  // Cycle 024 (WP-A2): armed screen's cancel affordance — a slim
  // amber-bordered bar, deliberately quieter than START (mockup's own armed
  // screen has no back button at all; this is an app-only addition so the
  // rider is never stuck armed with only START to press).
  cancelBar: {
    alignSelf: 'stretch',
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBarText: { color: colors.amber, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  readout: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  appTitle: {
    color: t.text,
    fontSize: 19,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 4,
  },
  // Race readout: colours follow the theme's race surface. The ticking lap
  // clock IS the elapsed display now (LAYOUT §2 v2) — no second clock.
  readoutLive: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  trackLine: {
    color: t.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
  },
  sub: { color: t.text2, fontSize: 15, textAlign: 'center' },
  startFlow: { alignSelf: 'stretch', gap: 4, marginTop: 6 },
  flowLabel: { color: t.textDim, fontSize: 11, letterSpacing: 2, marginTop: 8 },
  // virgin-cycle15 brief 05: the routeNamingCard.tsx 235-236 skipBtn/skipText
  // values — the smallest secondary control on this screen already, reused
  // so the new affordance reads as a footnote and nothing new is designed.
  notThisWayBtn: { paddingVertical: 10, alignItems: 'center' },
  notThisWayText: { color: t.textDim, fontSize: 13 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1, borderColor: t.cardBorder, borderRadius: radius.pill,
    paddingHorizontal: 11, paddingVertical: 4,
  },
  pillOn: { borderColor: t.accent },
  pillText: { color: t.textDim, fontSize: 12.5 },
  pillTextOn: { color: t.accentText },
  warn: { color: colors.amber, fontSize: 14, textAlign: 'center' },
  bigBtn: {
    alignSelf: 'stretch',
    height: 150,
    borderRadius: radius.big,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Idle START is the gate slash as a button. Recording = slim amber bar (§24).
  startYellow: { backgroundColor: t.accent, borderColor: t.accent },
  stopSlim: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: t.race.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  // flexShrink + numberOfLines at the call sites: a stopSlim button's content
  // can now never push past its flex:1 width, whatever future copy does
  // (2026-08-25 screenshot: "ESUME back to the rid" off both screen edges).
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
  // Discard = the quiet third action under RESUME | END: dim border + dim text
  // (RidesScreen's own Delete affordance tone), never amber, never red (D-013).
  discardBar: {
    alignSelf: 'stretch',
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 9,
  },
  discardBarText: { color: t.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  busy: { opacity: 0.5 },
  bigBtnText: { color: t.text, fontSize: 40, fontWeight: '800', letterSpacing: 5 },
  startText: { color: t.onAccent },
  stopBtnText: { color: colors.amber },
  bigBtnSub: { color: t.textDim, fontSize: 12, letterSpacing: 1 },
  startSub: { color: t.onAccent, opacity: 0.75 },
});
