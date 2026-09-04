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
import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActiveSession,
  PermissionOutcome,
  RideSummary,
  TrackerStatus,
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
import { getLiveTowerPosition } from '../live/towerSource';
import { LiveSectorPane, realTimebase, viewModelFromEngine } from './liveView';
import { LaunchAnimation } from './launchAnimation';
import { effectiveFromId, isFullscreen, statusItemsFor, type RecordPhase } from './recordFlow';
import { useTabNav } from './tabNav';
import RouteMapView from './routeMapView';
import { metresBetween } from './routeMapGeo';
import { appendTrailPoint, type TrailPoint } from './trailModel';
import { useSettings } from './settings';
import { chipColors, tierLineColour, type Tier } from './chips';
import { ALL_YELLOW, liveSectorColours } from './sectorTrailModel.ts';
import { fmt, ghostsFor, lapValues, sectorValues, tierFor } from './colourModel';
import { dropRecorded, rememberRide } from './lastRide';
import { rememberFreeRide } from '../store/freeRides';
import { findRouteWithSpecs, type WayCreationDraft, type WayNames } from '../store/wayCreation';
import { hasSpecs, specPickRows, specVocabulary } from '../store/routeSpecs';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
// WP-H (§4.9/§4.11): the create-way bodies live in store/wayFromRide.ts now,
// shared with the ride detail's retroactive offer; this screen keeps only
// state + Alerts + phase/animation choreography.
import {
  createWayFromDraft,
  draftWayFromRide,
  existingLandmarkLabel,
  existingWayProps,
  readRideFixes,
  saveAdjustedGates,
  type GateAdjustDraft,
} from '../store/wayFromRide';
import { GateAdjustCard } from './gateAdjustCard';
import { WayNamingCard } from './wayNamingCard';
import { deleteRide } from '../storage';
import { removeStoredResult } from '../store/resultsStore';
import { currentCatalog } from '../store/catalogStore';
import { freeRideRouteIds, landmarkAt } from '../store/catalog';
import { defaultEndpoints, routeLabelIn, routeVariantLabel, sortRoutesForDisplay } from '../store/defaultRoute';
import type { Route } from '../store/types';
import { PaddockTheme, colors, radius } from './theme';
import { useTheme } from './themeContext';

/** How long a newly-changed status line holds the rotating slot (IDEAS §24).
 * [ASSUMPTION — tune on device: long enough to survive a glance delay, short
 * enough that the carousel is not effectively disabled.] */
const PIN_MS = 20000;

/** Piece 3 (Nathan 2026-09-01, ride 2): fixes fed before "detecting route…"
 * gives way to "writing history" when no candidate has anchored at its own
 * start. A candidate that IS going to anchor does so on its first on-corridor
 * fix within ANCHOR_M of its start, so a few fixes of grace only avoids a
 * flash on the very first tick. [ASSUMPTION — tune on device.] */
const WRITING_HISTORY_AFTER_FIXES = 5;

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
function defaultRouteFor(routes: Route[]): Route | null {
  let best: Route | null = null;
  let bestN = -1;
  let bestLast = -Infinity;
  for (const r of routes) {
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
  const [showAnim, setShowAnim] = useState<'fwd' | 'rev' | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  // Mirror for onEnd's [] useCallback closure (it must read the CURRENT
  // session, same reason pickedRouteRef mirrors pickedRoute below).
  const sessionRef = useRef<ActiveSession | null>(null);
  sessionRef.current = session;
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  const [now, setNow] = useState(Date.now());
  const [problem, setProblem] = useState<PermissionOutcome | null>(null);
  const [recovered, setRecovered] = useState(false);
  // Cycle 025 (P5): which kind of restoration the banner is reporting —
  // set from getRecoveryState().restoration, the single shared predicate.
  const [recoveredKind, setRecoveredKind] = useState<'relaunch' | 'remount'>('relaunch');
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<RideSummary | null>(null);
  // OPEN-ITEMS item 2 (WP-F: any finished ride, not just unlocked ones):
  // the STOP-step naming offer for endpoints that match no existing way, or
  // that diverge >MATCHED_ENDPOINT_SLACK_M from the ride's own matched route
  // (null = no offer). While non-null the 'ending' phase shows the naming
  // card and holds the reversed launch mark.
  const [naming, setNaming] = useState<WayCreationDraft | null>(null);
  // Mirror for the [] useCallback closures below, same reason as sessionRef.
  const namingRef = useRef<WayCreationDraft | null>(null);
  namingRef.current = naming;
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
  const endedRef = useRef<{ rideId: string; startedAtMs: number } | null>(null);
  const [live, setLive] = useState<LiveEngineState>(liveEngine.getState());
  const [showLap, setShowLap] = useState(false);
  const [held, setHeld] = useState(false); // manual red-light hold (§18)
  // PAUSE → RESUME | END (Cycle 020, Nathan 2026-08-19): an accidental-stop
  // guard, NOT a real pause — the recording service and lap clock keep
  // running underneath (D-042: raw time is the truth; no engine or location
  // changes happen here).
  const [pauseMenu, setPauseMenu] = useState(false);
  // Start flow (§21): where from, where to. Detected-or-picked. The §8a route
  // pick is a HARD lock (Nathan 2026-08-29): the picked route is the only one
  // this ride can ever score against — see live/engine.ts's file header.
  // B-39 (empty-seed install path): the runtime catalog — shipped seed plus
  // this phone's own additions (store/catalogStore.ts) — read per render,
  // never captured at import: it can be empty at boot and grow later.
  const CATALOG = currentCatalog();
  // B-39: data-driven, never literal ids — the first two offerable catalog
  // landmarks (today's seed: home, work), or the 'new' pseudo-landmark when
  // the catalog has none, so a blank install opens on new>>new: the free
  // ride, which needs no catalog at all.
  const [from, setFrom] = useState(() => defaultEndpoints(currentCatalog()).from ?? NEW_ID);
  const [to, setTo] = useState(() => defaultEndpoints(currentCatalog()).to ?? NEW_ID);
  // notes5 N5: true once the rider has tapped a START pill this ride. Reset
  // when a ride ends or is discarded — never on armed→setup cancel, which
  // must keep the rider's choice.
  const [fromExplicit, setFromExplicit] = useState(false);
  const pickFrom = (id: string) => { setFrom(id); setFromExplicit(true); };
  // §8a route pick (Nathan 2026-08-16, re-confirmed 2026-08-18): only asked
  // when the way has >1 ratified route. Stored WITH its wayId so a pick can
  // never leak onto a different way when START / GOING TO change — a stale
  // pair silently falls back to the §8a default. A hard lock (Nathan
  // 2026-08-29): the engine scores this route or nothing — it never
  // reassigns the ride to the road actually ridden.
  const [routePick, setRoutePick] = useState<{ wayId: string; routeId: string } | null>(null);
  // The pick frozen at START — the pre-lock candidate for the LIVE map. Frozen
  // because `fromId` can drift mid-ride in auto mode (detected landmark goes
  // null once you leave the disc) while nothing has been tapped (N5), which
  // would silently change `way`.
  const [rideRouteHint, setRideRouteHint] = useState<string | null>(null);
  // WP-B: the directional route-id filter (coordinator addendum) frozen at
  // START, same reason rideRouteHint is frozen — the gates-only map during
  // the ride must show the SAME filtered set the engine was actually started
  // with, not whatever from/to happen to read on the (unmounted) setup form.
  const [rideFreeRouteIds, setRideFreeRouteIds] = useState<string[] | null>(null);
  // WP-J (breadcrumb trail): the rider's own ridden line, accumulated from
  // the live fix feed below (min-distance decimated — trailModel.ts) and
  // passed to the RUNNING map only (setup/armed never draw it — nothing
  // recorded yet). Reset at START, at a discard fold-back, and before the
  // 'ending' phase flip at END, so a new ride never inherits the last one's
  // line.
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);

  // Live status from the location layer.
  useEffect(() => subscribe(setStatus), []);

  // WP-D Piece B: a non-prompting position refresh on mount, so a returning
  // user sees the rider dot on the setup map without pressing RECORD first —
  // refreshPositionIfPermitted() checks permission before asking for a fix
  // and never triggers an OS prompt just from opening this tab.
  // [UNTESTED ON DEVICE]
  useEffect(() => { void refreshPositionIfPermitted(); }, []);

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

  // LAYOUT §2a: the lap chip appears ~1.1 s after the final gate, with the
  // lap earcon — never simultaneously with the sector chip.
  const lapScored = live.lap !== null;
  useEffect(() => {
    if (!lapScored) {
      setShowLap(false);
      return;
    }
    const id = setTimeout(() => setShowLap(true), 1100);
    return () => clearTimeout(id);
  }, [lapScored]);

  // 1 s clock while recording.
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  // Relaunch recovery: ride marker on disk from a previous launch?
  useEffect(() => {
    (async () => {
      const rec = await getRecoveryState();
      if (!rec) return;
      if (rec.tracking) {
        // Service survived; keep recording, resume the UI. Banner kind comes
        // from the SAME predicate that logged the sidecar record (P5) —
        // banner and counter can no longer disagree.
        setSession(rec.session);
        setRecoveredKind(rec.restoration);
        setRecovered(true);
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
        // Service died (OS kill / battery saver). Offer to finalise.
        Alert.alert(
          'Unfinished ride found',
          'The app was closed while a ride was recording and tracking has stopped. Save what was captured?',
          [
            {
              text: 'Save ride',
              onPress: async () => {
                const sum = await stopTracking();
                setLastSummary(sum);
              },
            },
            { text: 'Discard for now', style: 'cancel' },
          ],
        );
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

  const onRecord = useCallback(async () => {
    setBusy(true);
    try {
      // Permissions move up to RECORD (armed press) so the OS dialogs happen
      // at the kerb, not on the bike — START (below) re-checks, idempotently.
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return; // stay in setup
      }
      setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
      // Display-only, best-effort: improves the armed screen's map/location
      // before any ride is open (no fix is recorded — no ride exists yet).
      void refreshPositionOnce();
      setShowAnim('fwd');
    } catch (e) {
      Alert.alert('Could not check permissions', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onStart = useCallback(async () => {
    setBusy(true);
    setLastSummary(null);
    // A fresh ride must not inherit the previous one's "last moved" clock —
    // otherwise the map could read stationary for a moment at the very start.
    lastMovedRef.current = null;
    lastFixRef.current = null;
    // WP-J: a fresh ride must not inherit the previous one's trail either.
    setTrail([]);
    setPauseMenu(false);
    try {
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return;
      }
      setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
      let s: ActiveSession;
      if (freeRideRef.current) {
        // WP-B: free ride — no route pick, gates-only map, the directional
        // filter (coordinator addendum) frozen for the whole ride.
        setRideRouteHint(null);
        setRideFreeRouteIds(freeRouteIdsRef.current);
        s = await startTracking({
          routePick: null, mode: 'free', routeIds: freeRouteIdsRef.current,
          startContext: startContextRef.current ?? undefined,
        });
      } else {
        setRideRouteHint(pickedRouteRef.current?.refLineId ?? null);
        setRideFreeRouteIds(null);
        s = await startTracking({
          routePick: pickedRouteRef.current?.id ?? null,
          startContext: startContextRef.current ?? undefined,
        });
      }
      setRecovered(false);
      setSession(s);
    } catch (e) {
      Alert.alert('Could not start tracking', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onEnd = useCallback(async () => {
    setBusy(true);
    try {
      // Cycle 024 (WP-D2): settle a route BEFORE handing the ride to Result —
      // a still-soft or never-locked ride otherwise misses the finalize()
      // recovery that stopTracking() below runs too late for rememberRide's
      // purposes (it reads the CURRENT state, not what stopTracking returns).
      liveEngine.finalize(); // no-op in free mode (WP-B) — see engine.ts's file header
      // Cycle 024 (WP-A1): a real session hands its rideId/startedAtMs through
      // so the finished ride gets a persistent store entry, not just an
      // in-session session:-id one (B-28's other half).
      const s = sessionRef.current;
      // WP-H: capture the finished ride's identity for the post-STOP handoff
      // to the ride detail — set here (still in scope) rather than at the
      // 'ending' phase flip below, mirroring how `s` itself is read here.
      endedRef.current = s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : null;
      const finalState = liveEngine.getState();
      // A free ride has track===null/lap===null, so rememberRide() harmlessly
      // clears `last` — desired: Result must not show a stale route ride as
      // "the ride you just finished" under a free ride (WP-B section 4).
      rememberRide(finalState, s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : undefined);
      // M1 fix: pass the ride's real startedAtMs (same value rememberRide got
      // above) so a free-ride record's start time isn't Date.now() at STOP.
      rememberFreeRide(finalState, s ? { startedAtMs: s.startedAtMs } : undefined); // WP-B: no-op unless this actually was a free ride with >=1 crossing
      const sum = await stopTracking();
      setLastSummary(sum);
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
      const draft = s ? await draftWayFromRide(s.rideId, s.startedAtMs, finalState.track, createExpoFsAdapter()) : null;
      // Cycle 024 (WP-A2, Nathan 2026-08-19): "at the end when you press
      // stop it would be nice to show the animation again — but reversed."
      // session clears and phase flips to 'ending' TOGETHER, after the ride
      // is safely saved — the reversed mark then plays over the (now
      // session-less) screen; its onDone below is what actually lands on
      // Result.
      setSession(null);
      setRecovered(false);
      setPauseMenu(false);
      // WP-J: clear the trail before handing the screen to 'ending' — the
      // just-finished ride's line must not bleed into the next one's setup/
      // armed maps (which don't draw a trail anyway, but the state should
      // read empty the moment this ride is over).
      setTrail([]);
      // notes5 N5: a finished ride's explicit FROM tap must not carry into
      // the next ride's setup — the next setup gets a fresh suggestion.
      setFromExplicit(false);
      setPhase('ending');
      setNaming(draft);
      // The reversed mark waits for the naming card (its close handlers
      // below start it); with no offer it plays at once, exactly as before.
      if (draft === null) setShowAnim('rev');
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

  // OPEN-ITEMS item 2 — the naming card's two exits. Skip loses nothing: the
  // ride was already saved (rememberRide/rememberFreeRide/raw JSONL) before
  // the card existed, and the next unmatched ride offers again.
  const onNamingSkip = useCallback(() => {
    setNaming(null);
    setShowAnim('rev');
  }, []);

  const onNamingSave = useCallback(async (names: WayNames) => {
    const draft = namingRef.current;
    if (!draft) return;
    // WP-G: belt to the card's own braces — the card already disables ADD
    // ROUTE on a duplicate, but the pick could have gone stale between
    // renders (another ride landed the same specs in the meantime).
    if (draft.existingWayId && findRouteWithSpecs(currentCatalog(), draft.existingWayId, names.specs ?? [])) {
      Alert.alert('That route already exists', 'Pick it on RECORD next time instead of adding it again.');
      return;
    }
    setBusy(true);
    try {
      // OPEN-ITEMS item 3 (Part A): build the route's real reference line
      // from the ride that is becoming its reference — null on ANY failure
      // => the way saves exactly as before (unresolvable refLineId). Part B:
      // with a real line the v1 gate set is born fully seeded. Both live in
      // store/wayFromRide.ts's createWayFromDraft (WP-H §4.9).
      const out = await createWayFromDraft(draft, names, createExpoFsAdapter());
      if (!out.ok) {
        // saveUserCatalog refused (the MERGED catalog would not validate)
        // and changed nothing — surface WHY, keep the card up; SKIP remains.
        Alert.alert('Could not create the way', out.errors.join('\n'));
        return;
      }
      setNaming(null);
      if (out.adjust) {
        // SETUP-UX §4: offer tap-then-nudge before the reversed mark plays;
        // the card's exits (onAdjustKeep/onAdjustSave) start the animation.
        setAdjust(out.adjust);
      } else {
        setShowAnim('rev');
      }
    } catch (e) {
      Alert.alert('Could not create the way', e instanceof Error ? e.message : String(e));
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
      const out = await saveAdjustedGates(a, chainageM);
      if (!out.ok) {
        // refused — surface WHY, keep the card up; KEEP remains available.
        Alert.alert('Could not save the gates', out.errors.join('\n'));
        return;
      }
      setAdjust(null);
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
      'Discard ride?',
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
            // Tracking is stopped. No rememberRide/rememberFreeRide, no
            // 'ending' phase, no reversed mark, no Result handoff — nothing
            // was kept, so fold straight back to setup (running -> setup is
            // legal: recordFlow.ts). Result's "last ride" intentionally still
            // shows the previous finished ride, never the discarded one.
            setSession(null);
            setRecovered(false);
            setPauseMenu(false);
            setLastSummary(null);
            // WP-J: discard folds straight back to setup — the trail dies
            // with the ride, same as everything else nothing was kept.
            setTrail([]);
            // notes5 N5: same reset as onEnd — a discarded ride's explicit
            // FROM tap must not carry into the next ride's setup.
            setFromExplicit(false);
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
                `${e instanceof Error ? e.message : String(e)}\nThe ride was ended and kept instead — you can delete it from RIDES.`,
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
  const lastFixAgeS =
    status.lastFixMs != null ? Math.round((now - status.lastFixMs) / 1000) : null;

  // Rotating status slot (IDEAS §24): route / GPS state share one line,
  // advancing every 6 s (Cycle 024, WP-A2: the raw fixes count is gone — see
  // statusItemsFor). GPS trouble jumps the queue via ordering only — content
  // stays honest, nothing is hidden, just time-multiplexed.
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setStatusIdx((i) => i + 1), 6000);
    return () => clearInterval(id);
  }, [recording]);
  const gpsTrouble = status.lastFixMs == null || (lastFixAgeS != null && lastFixAgeS > 5);
  const gpsLine =
    status.lastFixMs == null
      ? 'waiting for first GPS fix…'
      : lastFixAgeS != null && lastFixAgeS > 5
        ? `last fix ${lastFixAgeS}s ago — GPS struggling?`
        : 'GPS live';
  const routeLocked = live.phase === 'locked' || live.phase === 'finished';
  // "Writing history" (Nathan 2026-09-01, ride 2): a few fixes in and no
  // candidate has anchored at its own start => nothing known is being
  // recognised so far — say so instead of "detecting route…" for the whole
  // ride. A "so far" indicator, not a verdict: a later lock replaces it.
  const writingHistory = live.mode !== 'free' && !routeLocked
    && live.fixesFed >= WRITING_HISTORY_AFTER_FIXES && !live.anyAnchored;
  // Cycle 024 (WP-D2): a soft lock is displayed and scored, but it is not yet
  // corridor-confirmed — say so. Verified/finalized keep today's wording.
  // Before the soft lock, under a pick, nothing is being *detected* (hard
  // pick, Nathan 2026-08-29: the engine waits for the pick's own 400 m) —
  // name the pick and say so, never imply another route might be found.
  // WP-B: a free ride never locks (phase stays 'detecting' the whole ride) —
  // say so plainly rather than showing "detecting route…" forever.
  const routeLine = live.mode === 'free'
    ? 'free ride · gates only'
    : routeLocked
      ? live.lockKind === 'soft'
        ? `${live.track ? routeLabelIn(CATALOG, live.track) : ''} · route locked (your pick) · verifying${live.onRoute ? '' : ' · off route'}`
        : `${live.track ? routeLabelIn(CATALOG, live.track) : ''} · route locked${live.onRoute ? '' : ' · off route'}`
      : writingHistory
        ? (rideRouteHint ? `writing history · not on ${routeLabelIn(CATALOG, rideRouteHint)} yet` : 'writing history · no known route here')
        : rideRouteHint ? `${routeLabelIn(CATALOG, rideRouteHint)} · your pick · confirming…` : 'detecting route…';
  // Cycle 024 (WP-A2, Nathan 2026-08-19): "I don't know what 'fixes' are" —
  // the raw count is gone from every user-facing status line; it still lives
  // in the GPX+ sidecar for diagnostics. recordFlow.ts owns the pure rule so
  // it is tested without RN.
  const statusItems = statusItemsFor({ gpsTrouble, gpsLine, routeLine });

  // A line that CHANGES claims the slot for PIN_MS instead of waiting its turn.
  // Without this the carousel can rotate the route lock away ~2 s after it
  // fires — and the lock (~400 m in) is the one line the rider is told to
  // look for. Rotation resumes when the pin expires; nothing is hidden either
  // way, and the pin only ever *delays* the other items.
  const [pinned, setPinned] = useState<'route' | 'gps' | null>(null);
  useEffect(() => {
    if (!recording || !routeLocked) return;
    setPinned('route');
    const id = setTimeout(() => setPinned(null), PIN_MS);
    return () => clearTimeout(id);
  }, [recording, routeLocked, live.track]);
  useEffect(() => {
    if (!recording || !gpsTrouble) return;
    setPinned('gps'); // trouble outranks the lock — it is the actionable one
    const id = setTimeout(() => setPinned(null), PIN_MS);
    return () => clearTimeout(id);
  }, [recording, gpsTrouble]);
  const statusLine =
    pinned === 'gps' ? gpsLine : pinned === 'route' ? routeLine : statusItems[statusIdx % statusItems.length];

  // Colour comes from the ghost history for the LOCKED route only: before the
  // lock there is nothing honest to compare against, so everything stays
  // neutral (D-025). Sector index 0 means "the whole lap".
  const tierOf = (sectorIndex: number, movingS: number | null): Tier => {
    if (live.track === null || movingS === null) return 'neutral';
    const history = sectorIndex === 0 ? lapValues(live.track) : sectorValues(live.track, sectorIndex);
    const tier = tierFor(movingS, history);
    return tier === 'est' ? 'est' : (tier as Tier);
  };

  // NOTE: the gate buzz is NOT fired here. src/location/index.ts owns it —
  // it sees every fire even with the screen off, and two buzzers meant the
  // rider felt each gate twice (cycle 009). This screen only sets the flag.

  // Gate markers on the map take the colour their sector earned, once scored.
  // Purple is the one tier chipColors().text gets wrong for a MAP marker:
  // purple's .text is PURPLE_INK, the near-black ink for text drawn ON a
  // purple-filled chip, not the tier's actual colour — near-invisible on the
  // map (same bug class as the 2026-09-02 DEMO-tab/ResultScreen map-line fix,
  // chips.tsx's tierLineColour()). Every OTHER tier's .text is already the
  // right marker colour here (grey for 'est', theme accent for 'neutral'), so
  // only purple is overridden rather than swapping in tierLineColour() wholesale.
  const gateColours = useMemo(() => {
    const out: (string | null)[] = [null];
    for (let i = 0; i < live.sectors.length; i++) {
      const sec = live.sectors[i];
      if (sec.kind !== 'done') { out.push(null); continue; }
      const tier = sec.estimated ? 'est' : tierOf(i + 1, sec.movingS ?? null);
      out.push(tier === 'purple' ? colors.purple : chipColors(tier, t).text);
    }
    return out;
  }, [live.sectors, live.track, t]);

  // WP-K (phase 2): sector spans on the live map — the segment BETWEEN gates,
  // never the tick (Nathan: "they are gates"). Same comparison window tierOf()
  // uses (sectorValues on the LOCKED track, [] before the lock — D-025), the
  // same clean-only predicate the stored ride will carry as quality 'clean',
  // painted through tierLineColour (the map-line source of truth, never
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

  const startable = CATALOG.landmarks.filter((l) => l.offerAtStart);

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

  // WP-B: 'new' at either end means free ride. Since WP-L, an explicit tap
  // of 'new' for FROM sticks the same as any other explicit pick (via
  // fromExplicit/pickFrom below) — auto start-mode only lets a real
  // DETECTED landmark override FROM when nothing was explicitly tapped.
  const freeRide = fromId === NEW_ID || to === NEW_ID;
  // Coordinator addendum (2026-08-24): with exactly one end known, restrict
  // to the ways that actually run that direction; both ends unknown (or, in
  // principle, both known — not reachable when freeRide is true) => null =
  // unfiltered, the brief's original full-catalog behaviour.
  const freeRouteIds: string[] | null = freeRide
    ? freeRideRouteIds(CATALOG, fromId === NEW_ID ? null : fromId, to === NEW_ID ? null : to)
    : null;

  // The way the rider picked, and the routes on it -- so the ghost count is
  // THIS way's, not always Morning's.
  const way = CATALOG.ways.find(
    (w) => w.startLandmarkId === fromId && w.endLandmarkId === to,
  );
  const wayRoutes = way ? sortRoutesForDisplay(CATALOG.routes.filter((r) => r.wayId === way.id)) : [];
  const ghostCount = wayRoutes.reduce((n, r) => n + ghostsFor(r.id).length, 0);
  const pickedRoute: Route | null = way
    ? (routePick && routePick.wayId === way.id
        ? (wayRoutes.find((r) => r.id === routePick.routeId) ?? defaultRouteFor(wayRoutes))
        : defaultRouteFor(wayRoutes))
    : null;
  // N9 (2026-09-02, GPX+ pick/lock-change logging): was the pick rendered
  // above an explicit RECORD-tab tap, or the silent §8a default? A free ride
  // (no `way`) or a way with no pickable route both say 'none' — there is
  // nothing a rider could have tapped.
  const pickSource: StartContext['pickSource'] = freeRide || !pickedRoute
    ? 'none'
    : routePick !== null && routePick.wayId === way?.id && wayRoutes.some((r) => r.id === routePick.routeId)
      ? 'picked'
      : 'default';
  // Mirror for onStart's [] useCallback closure (it must read the CURRENT pick).
  const pickedRouteRef = useRef<Route | null>(null);
  pickedRouteRef.current = pickedRoute;
  // Mirrors for onStart's [] useCallback closure, same reason as pickedRouteRef.
  const freeRideRef = useRef(false);
  freeRideRef.current = freeRide;
  const freeRouteIdsRef = useRef<string[] | null>(null);
  freeRouteIdsRef.current = freeRouteIds;

  // Cycle 024 (WP-A2): the armed screen's readytag line names from/to by
  // their catalog label (mirrors the mockup's `lm()` helper), not their id.
  // WP-B: NEW_ID is a UI pseudo-landmark, not a catalog entry — labelled
  // 'new' rather than falling through to the raw '~new' id.
  const landmarkLabel = (id: string): string =>
    id === NEW_ID ? 'new' : (CATALOG.landmarks.find((l) => l.id === id)?.label ?? id);
  // N9: mirror for onStart's [] useCallback closure (it must read the
  // CURRENT RECORD-tab state at the instant START is pressed) — same reason
  // pickedRouteRef/freeRideRef/freeRouteIdsRef mirror above.
  const startContextRef = useRef<StartContext | null>(null);
  startContextRef.current = {
    from: fromId, to, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(to), pickSource,
  };

  // Shared between both branches below — unchanged position/behaviour, just
  // no longer duplicated between an idle ScrollView and a recording column.
  const problemStates = (
    <>
      {problem === 'services-off' && (
        <Text style={styles.warn}>
          Location (GPS) is turned off on this phone. Enable it in quick settings, then press
          Start again.
        </Text>
      )}
      {problem === 'denied' && (
        <View style={styles.warnBox}>
          <Text style={styles.warn}>
            Location permission was denied — Qualifire cannot track without it.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.linkBtnText}>Open app settings</Text>
          </Pressable>
        </View>
      )}
      {problem === 'foreground-only' && (
        <View style={styles.warnBox}>
          <Text style={styles.warn}>
            Background location ("Allow all the time") not granted. Tracking works only while the
            app is open with the screen on. Grant it in settings for pocket recording.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.linkBtnText}>Open app settings</Text>
          </Pressable>
        </View>
      )}
    </>
  );

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
          {way && pickedRoute ? ` · ${routeVariantLabel(pickedRoute.id, way, pickedRoute.specs)}` : ''} · ready — not started
        </Text>
        {problemStates}
        {settings.liveMap ? (
          <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
            <RouteMapView
              routeId={pickedRoute?.refLineId ?? null}
              lat={status.lastLat}
              lon={status.lastLon}
              zoom={1}
              variant="live"
              liveState="prestart"
              fill
            />
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
          disabled={busy}
          onPress={onStart}
        >
          <Text style={[styles.bigBtnText, styles.startText]}>START</Text>
          <Text style={[styles.bigBtnSub, styles.startSub]}>the clock runs from here</Text>
        </Pressable>
        <Pressable style={styles.cancelBar} onPress={() => setPhase('setup')}>
          <Text style={styles.cancelBarText}>‹ cancel — back to setup</Text>
        </Pressable>
      </View>
    );
  }

  // Cycle 024 (WP-A2): 'ending' — the ride is already saved (onEnd ran
  // rememberRide()/stopTracking() before setting this phase); the reversed
  // launch mark plays on top (below) before folding back to 'setup' and
  // handing off to Result. No PAUSE/END here — the ride is already over.
  if (phase === 'ending') {
    return (
      <View style={styles.raceColumn}>
        <Text style={styles.trackLine}>
          {lastSummary ? `Ride saved — ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}.` : 'Ride saved.'}
        </Text>
        {adjust !== null ? (
          <GateAdjustCard
            refLine={adjust.ref}
            refLengthM={adjust.refLengthM}
            initialChainageM={adjust.chainageM}
            busy={busy}
            onKeep={onAdjustKeep}
            onSave={onAdjustSave}
          />
        ) : naming !== null ? (
          <WayNamingCard
            startExistingLabel={existingLandmarkLabel(naming.start)}
            endExistingLabel={existingLandmarkLabel(naming.end)}
            loop={naming.loop}
            busy={busy}
            matchedRouteLabel={naming.matchedRouteId ? routeLabelIn(currentCatalog(), naming.matchedRouteId) : null}
            existingWay={naming.existingWayId ? existingWayProps(naming.existingWayId) : null}
            vocabulary={specVocabulary(currentCatalog().routes)}
            onSave={onNamingSave}
            onSkip={onNamingSkip}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        {showAnim === 'rev' && (
          <LaunchAnimation
            reverse
            onDone={() => {
              setShowAnim(null);
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
        {problemStates}
        {recovered && (
          <Text style={styles.recovered}>
            {recoveredKind === 'relaunch'
              ? 'Recovered after relaunch — still recording. Nothing was lost on disk.'
              : 'Recording continued in the background — nothing was lost on disk.'}
          </Text>
        )}
        {/* The live map, big, at the top (Cycle 020) — was a slim ribbon below
            the clock/strip; Nathan's ruling overrules B-51's "subordinate
            ribbon" layout for race mode. flex:1 spacer keeps the rest pinned
            to the bottom even when the map is switched off. */}
        {settings.liveMap ? (
          <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
            <RouteMapView
              routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}
              lat={status.lastLat}
              lon={status.lastLon}
              zoom={4}
              gateColours={gateColours}
              sectorColours={sectorColours}
              gatesOnly={live.mode === 'free'}
              crossedGates={live.freeCrossings}
              gateRouteIds={rideFreeRouteIds}
              trail={trail}
              variant="live"
              liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
              fill
            />
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {/* LIVE surface v2 (LAYOUT §2/§2a) — real engine feed, real clock:
            rate-1 timebase anchored at recording start (whole-ride elapsed,
            per Nathan's lap-clock ruling). posChip is null until the B-28
            benchmark/ride-history store exists — no chip renders, never a
            fake rank. */}
        <LiveSectorPane
          vm={viewModelFromEngine(
            live,
            realTimebase(session.startedAtMs),
            getLiveTowerPosition(live), // real position once the lap lands
            tierOf,
          )}
          showLap={showLap}
        />
        {/* One rotating status slot (IDEAS §24, 2026-08-16): route / GPS cycle
            every 6 s instead of stacking two lines (Cycle 024, WP-A2: the raw
            fixes count is gone — see statusItemsFor). Warnings (storage
            errors) stay permanent below — never rotated away. */}
        <Text style={styles.trackLine}>{statusLine}</Text>
        {/* WP-B: free-ride sector list — most recent first, plain ink (no
            tier colours: D-013, a free ride has no comparable history by
            construction), plus a running crossing counter. */}
        {live.mode === 'free' && (
          <View style={styles.freeSectorBox}>
            <ScrollView style={{ maxHeight: 120 }}>
              {[...live.freeSectors].reverse().map((sec, i) => (
                <Text key={i} style={styles.freeSectorRow}>
                  {routeLabelIn(CATALOG, sec.routeId)} S{sec.index} — {fmt(sec.rawS, 1)}
                </Text>
              ))}
            </ScrollView>
            <Text style={styles.counter}>{live.freeCrossings.length} gates crossed</Text>
          </View>
        )}
        {settings.redLight === 'button' && (
          <Pressable
            style={[styles.redFlag, held && { opacity: 0.6 }]}
            onPress={() => setHeld((h) => !h)}
          >
            <Text style={styles.redFlagText}>
              {held ? 'GO - RELEASE CLOCK' : 'RED LIGHT - HOLD CLOCK'}
            </Text>
            <Text style={styles.stopSlimSub}>
              self-reported stop - the measured clock keeps its own truth
            </Text>
          </Pressable>
        )}
        {status.storageErrors > 0 && (
          <Text style={styles.warn}>
            {status.storageErrors} storage errors — last: {status.lastError}
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
            <Text style={styles.stopSlimSub}>recording continues · resume or end</Text>
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
              <Text style={styles.discardBarText}>Discard ride</Text>
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
    >
      {/* Theme toggle — settings-lite; hidden while recording (inert surface). */}
      <Pressable style={styles.modePill} onPress={toggleMode}>
        <Text style={styles.modePillText}>{mode === 'daylight' ? '☾ night' : '☀ day'}</Text>
      </Pressable>
      {problemStates}

      {/* Idle readout */}
      <View style={styles.readout}>
        {/* The mark, measured off product/brand/logos/qualifire_logo_1_gate_q.png
            rather than eyeballed: on a 512 canvas the ring is 309 px across
            with a 34 px stroke, and the slash is a 238 px diagonal 36 px thick
            whose bbox starts at the ring's centre — a Q's tail, not a bar
            through the whole mark. Scaled here to a 122 px wrap. */}
        <View style={styles.logoWrap}>
          <View style={styles.logoRing} />
          <View style={styles.logoSlash} />
        </View>
        <Text style={styles.appTitle}>Qualifire</Text>
        {/* B-51: at the rack, before START — real pannable streets, the
            candidate route (whichever way/route is picked so far). WP-D
            (2026-09-02): when nothing is picked yet — or the pick is a
            user-created route with no drawable asset (WP-P's "HomeWork") —
            RouteMapView now renders rider-only (real tiles + the dot, no
            route line) instead of a blank space; it no longer falls back to
            drawing some other route from the asset manifest. */}
        {settings.liveMap ? (
          <View style={{ alignSelf: 'stretch' }}>
            <RouteMapView
              routeId={pickedRoute?.refLineId ?? null}
              lat={status.lastLat}
              lon={status.lastLon}
              zoom={1}
              showRider
              variant="live"
              liveState="prestart"
              height={200}
            />
          </View>
        ) : null}
        <View style={styles.startFlow}>
          <Text style={styles.flowLabel}>
            {settings.startMode === 'auto'
              ? (fromId === detected?.id
                  ? 'DETECTED START'
                  : detected
                    ? 'STARTING FROM'
                    : 'START NOT DETECTED — PICK ONE')
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
            {/* WP-B: 'new' — free ride, unknown origin (Nathan: "go from
                work>>new"). Not a catalog landmark, so it is added here
                rather than to `startable`. */}
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
            {/* WP-B: 'new' — free ride, unknown destination (e.g. new>>home). */}
            <Pressable key={NEW_ID} onPress={() => setTo(NEW_ID)}
              style={[styles.pill, to === NEW_ID && styles.pillOn]}>
              <Text style={[styles.pillText, to === NEW_ID && styles.pillTextOn]}>new</Text>
            </Pressable>
          </View>
          {/* WP-B: freeRide never has a `way` (NEW_ID matches no catalog
              landmark), so this is already hidden by construction; !freeRide
              is stated explicitly too — belt and braces, per the brief. */}
          {!freeRide && way && wayRoutes.length > 1 ? (
            <>
              <Text style={styles.flowLabel}>WHICH ROUTE TODAY?</Text>
              {hasSpecs(wayRoutes)
                ? specPickRows(wayRoutes, pickedRoute?.id ?? null, defaultRouteFor).map((row) => (
                    <View key={row.depth} style={styles.pillRow}>
                      {row.options.map((o) => (
                        <Pressable key={`${row.depth}:${o.label}`} onPress={() => setRoutePick({ wayId: way.id, routeId: o.route.id })}
                          style={[styles.pill, o.on && styles.pillOn]}>
                          <Text style={[styles.pillText, o.on && styles.pillTextOn]}>{o.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ))
                : (
                  <View style={styles.pillRow}>
                    {wayRoutes.map((r) => (
                      <Pressable key={r.id} onPress={() => setRoutePick({ wayId: way.id, routeId: r.id })}
                        style={[styles.pill, pickedRoute?.id === r.id && styles.pillOn]}>
                        <Text style={[styles.pillText, pickedRoute?.id === r.id && styles.pillTextOn]}>
                          {routeVariantLabel(r.id, way, r.specs)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              <Text style={styles.sub}>
                what you pick stays locked until the end — ride a different road and this ride will not be scored as that road (§8a)
              </Text>
            </>
          ) : null}
        </View>
        {lastSummary ? (
          <Text style={styles.sub}>
            Ride saved — {fmtElapsed(lastSummary.endMs - lastSummary.startMs)}. Find it in Rides.
          </Text>
        ) : (
          <Text style={styles.sub}>Ready to record.</Text>
        )}
      </View>

      {/* RECORD — arms the ride (Cycle 024, WP-A2, Nathan 2026-08-19): plays
          the launch mark, then the RACE screen is ready but not moving until
          START is pressed there. Amber, no red (D-013) — see WP-A2's
          NEEDS-NATHAN #1 for the red option. */}
      <Pressable
        style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
        disabled={busy}
        onPress={onRecord}
      >
        {/* Record-dot glyph (mockup: red slab + white dot; D-013 "NO RED
            ANYWHERE" forbids the red, so this ships as a charcoal dot on the
            existing accent-yellow slab — t.onAccent inherited from the
            parent Text, same colour the RECORD label itself uses. */}
        <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
        <Text style={[styles.bigBtnSub, styles.startSub]}>
          arms the ride · nothing starts yet
        </Text>
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
  // no blank band above the logo. Pills are already flush-left + wrapping
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
  // Cycle 024 (WP-A2): armed screen's "back to setup" affordance — a slim
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
  // Logo mark, drawn: ink ring, yellow gate slash crossing it (BRAND P4).
  logoWrap: { width: 122, height: 122, marginBottom: 10 },
  // ring: 309/512 of the canvas, 34/512 stroke, centred (101..410 of 512)
  logoRing: {
    position: 'absolute',
    left: 24,   // 101/512 * 122
    top: 22,    //  91/512 * 122
    width: 74,  // 309/512 * 122
    height: 74,
    borderRadius: 37,
    borderWidth: 8, // 34/512 * 122
    borderColor: t.text,
  },
  // slash: 238/512 long, 36/512 thick, running from the ring centre down-right.
  // Rotating about the centre, so left/top place its MIDPOINT at the midpoint
  // of the reference bbox (269..437, 259..427 of 512).
  logoSlash: {
    position: 'absolute',
    left: 56,   // midpoint x 353/512*122 = 84, minus half the 57 px length
    top: 78,    // midpoint y 343/512*122 = 82, minus half the 9 px thickness
    width: 57,  // 238/512 * 122
    height: 9,  //  36/512 * 122
    borderRadius: 5,
    backgroundColor: t.accent,
    transform: [{ rotate: '45deg' }],
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
  counter: {
    color: t.textDim,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  // WP-B: free-ride sector list — plain ink throughout (D-013: no tier
  // colours, a free ride has no comparable history by construction).
  freeSectorBox: { alignSelf: 'stretch', marginTop: 6, gap: 4 },
  freeSectorRow: {
    color: t.text2,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
  },
  sub: { color: t.text2, fontSize: 15, textAlign: 'center' },
  startFlow: { alignSelf: 'stretch', gap: 4, marginTop: 6 },
  flowLabel: { color: t.textDim, fontSize: 11, letterSpacing: 2, marginTop: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1, borderColor: t.cardBorder, borderRadius: radius.pill,
    paddingHorizontal: 11, paddingVertical: 4,
  },
  pillOn: { borderColor: t.accent },
  pillText: { color: t.textDim, fontSize: 12.5 },
  pillTextOn: { color: t.accentText },
  recovered: { color: colors.amber, fontSize: 13, textAlign: 'center' },
  warn: { color: colors.amber, fontSize: 14, textAlign: 'center' },
  warnBox: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.card,
    padding: 14,
  },
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
  // Amber, never red (D-013) even though it is a "red light" button.
  redFlag: {
    alignSelf: 'stretch',
    marginTop: 10,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 2,
  },
  redFlagText: { color: colors.amber, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  // flexShrink + numberOfLines at the call sites: a stopSlim button's content
  // can now never push past its flex:1 width, whatever future copy does
  // (2026-08-25 screenshot: "ESUME back to the rid" off both screen edges).
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
  stopSlimSub: { color: t.textDim, fontSize: 11, letterSpacing: 1 },
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
  linkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
  },
  linkBtnText: { color: t.text2, fontSize: 13 },
});
