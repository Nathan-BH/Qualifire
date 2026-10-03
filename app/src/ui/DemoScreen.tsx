/**
 * Demo tab (WP-O, 2026-09-02): TWO scripted demo modes, so Nathan can see
 * from the couch the two things a real commute only shows once a day.
 *
 * - SECOND RIDE (default): the full reference line + neutral gate ticks are
 *   there from the start; as the dot passes each gate, the sector segment
 *   just completed paints its earned tier colour. Gate ticks never change
 *   colour (Nathan's 2026-09-01 ruling) — the map is given only the earned
 *   SECTOR span colours; the gate-tick colouring prop is never built here.
 * - FIRST RIDE: basemap + moving dot + a yellow trail growing behind it, no
 *   route, no gates, no sector strip — exactly what a stranger's very first
 *   ride looks like. Needs a non-null, no-manifest-entry route id
 *   (`DEMO_FIRST_RIDE_ID`) so `RouteMapView` takes WP-D's rider-only path;
 *   the id is kept non-null (rather than `null`) so the fake id stays a
 *   stable, recognisably-not-a-catalog-route `key`/zoom-reset id for this
 *   mode (cycle-2 WP-A: `null` would now also render rider-only, since
 *   routeMapView.tsx no longer has any catalog-wide fallback to avoid).
 *
 * Both modes drive the SAME pane as the Record screen (§17's
 * shared-render-path rule): a scripted ride replayed at 25x by default (5x/15x/25x on
 * pills since virgin-cycle15 brief 03). Nothing here
 * writes to storage and nothing here is a ride — the Rides tab and the
 * Result tab never see it.
 *
 * Why the demo owns its own tier history: on a virgin build the archive ghost
 * set is always empty (B-39), so `tierFor`'s D-008 floor is never cleared and
 * every sector would render 'neutral'. `demoModel.ts` is self-contained — its
 * own pinned `DEMO_HISTORY`/`DEMO_SECS`, no archive lookups of any kind — so
 * the demo shows real tier colours on every build, virgin included.
 *
 * WP-E: SECOND RIDE's line/gates come from `demoRouteFixture.ts` via the
 * map's `asset` prop, not from the bundled manifest.
 *
 * virgin-cycle11 (DEMO overhaul, brief A): RUN DEMO RIDE now goes full-screen.
 * The idle screen (below) is a plain chooser — one caveat line, pills, RUN —
 * and the map/pane only appear once a run starts. The run itself takes
 * over the whole tab (`onFullscreenChange`, the same mechanism RecordScreen
 * uses) and mirrors RecordScreen's real running column: live-variant map on
 * top, the shared LiveSectorPane, a status line, REPLAY's control row (speed
 * dial · scrub bar · play/pause — virgin-cycle16 brief 07). The scripted clock
 * rolls past the lap by `DEMO_ROLL_OUT_S` sim-seconds and then auto-STOPs
 * into an 'ending' screen. Lap chip is neutral before the run ends, exactly as the
 * real screen since the ranking reveal. FIRST RIDE's SAVE now continues into
 * the real `GateAdjustCard` on a reference line built from the demo path
 * (brief D); KEEP/SAVE GATES are theatre too, nothing is written.
 * virgin-cycle14 brief 06 (Nathan #9): mode subtext removed, caveat line reworded.
 *
 * virgin-cycle11 brief B: a third mode, TENTH RIDE (now the default) —
 * SECOND RIDE is an honest ride 2 (one prior lap, purple/yellow only);
 * TENTH RIDE judges today against the last WINDOW_PREV pinned laps, the
 * real app's whole ranking pool. Once the run ends, SECOND/TENTH mount the real
 * `TimingTower` in reveal mode over a board built by the real
 * `buildRankingReveal` (an injected synthetic window, no store reads) and,
 * after the hold, the real `RouteNamingCard` in its WP-G "new way on this
 * route" variant — FIRST RIDE still mounts the both-endpoints-unknown card
 * straight away. Every SAVE/ADD WAY here is theatre: nothing is written.
 * virgin-cycle17 brief 02 (Nathan 2026-09-29): TENTH RIDE no longer mounts that
 * card by itself — a tenth ride is on a route the rider chose on RECORD long ago,
 * so it ends as the real screen does since cycle15 brief 05: a dim `not Home →
 * Work?` link through the tower's climb + hold, then the end mark with no tap;
 * the WP-G card opens only from the link (`demoPostReveal`, `postRevealRef`,
 * `namingExpanded` — RecordScreen's own names, by value). SECOND RIDE keeps the
 * card after the hold: the one ending with something to fill in.
 *
 * virgin-cycle14 brief 08 (Nathan #11): every mode's ending screen closes with the real
 * RESULTS-tab scatterplot (`ResultsPlot`) over this mode's synthetic priors plus today's
 * lap (`demoPlotResults`) — a preview of a screen no phone has real data for yet. Same
 * component, same tones, same caption; today's dot pre-selected; nothing stored.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PanResponder, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { tierLineColour } from './chips';
import {
  buildDemoReveal,
  buildDemoScript,
  demoAddedWayLine,
  demoChainage,
  demoFmtMS,
  demoGateAdjustDraft,
  demoLiveViewModel,
  demoPlotCaption,
  demoPlotPosLabel,
  demoPlotResults,
  demoPostReveal,
  demoRunEndS,
  demoSavedLine,
  demoSectorColours,
  demoSelfTracks,
  demoSimSAt,
  demoStopOutcome,
  reanchorDemo,
  skipDemoAnchor,
  DEMO_FAKE_SAVE_MS,
  DEMO_PRIOR_LAPS,
  DEMO_RATES,
  DEMO_RATE_DEFAULT,
  DEMO_ROUTE_END,
  DEMO_ROUTE_LABEL,
  DEMO_ROUTE_START,
  DEMO_SAVED_HOLD_MS,
  DEMO_SPEC_VOCABULARY,
  DEMO_TODAY_RIDE_ID,
  type DemoClockAnchor,
  type DemoGateAdjustDraft,
  type DemoGatesOutcome,
  type DemoMode,
  type DemoPhase,
  type DemoPostReveal,
  type DemoRate,
  type RouteNames,
} from './demoModel.ts';
import { DEMO_WAY_ASSET, DEMO_WAY_ID } from './demoWayFixture.ts';
import { GateAdjustCard } from './gateAdjustCard';
import { LaunchAnimation } from './launchAnimation';
import { LiveSectorPane } from './liveView';
import { REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type RankingReveal } from './rankingRevealModel.ts';
import { RouteNamingCard } from './routeNamingCard';
import ResultsPlot from './resultsPlot';
import { selfDotsAt, selfLivePosition } from './selfRaceModel.ts';
import { ALL_YELLOW } from './sectorTrailModel.ts';
import { useSettings } from './settings';
import { colors, PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';
import { TimingTower } from './tower';
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';
import WayMapView from './wayMapView';
import { positionAtTime } from './wayMapMath';

// virgin-cycle16 07 (Nathan 2026-09-28): the running-phase controls are
// REPLAY's control row (cycle15 brief 08) — speed dial, scrub bar,
// play/pause — with the play/pause glyphs drawn from plain Views exactly as
// replayIcons.tsx draws them (no icon library, no font glyph). Kept local to
// this file: REPLAY is the reference pattern only; nothing there is shared,
// imported or edited.
/** Play: a right-pointing triangle (border trick). Props: color only. */
function DemoPlayIcon({ color }: { color: string }) {
  return <View style={[iconStyles.triangle, { borderLeftColor: color }]} />;
}
/** Pause: two bars. Props: color only. */
function DemoPauseIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.pauseWrap}>
      <View style={[iconStyles.bar, { backgroundColor: color }]} />
      <View style={[iconStyles.bar, { backgroundColor: color }]} />
    </View>
  );
}
const iconStyles = StyleSheet.create({
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseWrap: { flexDirection: 'row', gap: 4 },
  bar: { width: 4, height: 18, borderRadius: 1 },
});

// WP-E: the scripted lap is DemoScreen's own frozen fixture
// (demoRouteFixture.ts), not a manifest or catalog route — it renders
// identically on every build, virgin included, and never touches the
// bundled route manifest.
// virgin-cycle15 brief 03: the fixed 25x RATE became a movable clock anchor
// (demoModel.reanchorDemo) so the speed dial can change speed mid-ride
// with no jump/pause/restart — see anchorRef below.
const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so the rate is exact
// virgin-cycle16 07: scrub-bar gain, dp → sim-seconds per unit rate — the
// same value as replayModel.SCRUB_S_PER_DP_PER_RATE (cycle15 brief 08
// decision 4), by value: this file never imports from REPLAY. On a ~240 dp
// bar one full-width swipe moves rate × 96 sim-seconds (8 min at 5x, 40 min
// at 25x) against a run of about 15 min (demoRunEndS).
const DEMO_SCRUB_S_PER_DP_PER_RATE = 0.4;
/** Clamp a demo clock value to [0, endS] (replayModel.clampClockS, by value). */
const clampDemoClockS = (v: number, endS: number): number => Math.min(Math.max(v, 0), endS);
// virgin-cycle15 brief 03 fix-up: the picked speed lives for the app session,
// not the mount — App.tsx renders one tab at a time, so leaving DEMO unmounts
// this screen; without this the pick fell back to 25x on every tab hop.
// Module scope, never stored (decision 2 of brief 03: no settings key).
let demoSessionRate: DemoRate = DEMO_RATE_DEFAULT;

// FIRST RIDE mode: a deliberately non-null id with NO manifest entry, so
// RouteMapView's `asset` lookup misses and WP-D's rider-only path (basemap +
// dot, no route layers) renders. Kept non-null (rather than `null`) so this
// mode is recognisably not a catalog route and stays a stable `key`/
// zoom-reset id; `null` would now also render rider-only (cycle-2 WP-A
// removed routeMapView.tsx's catalog-wide `defaultRouteId()` fallback).
const DEMO_FIRST_RIDE_ID = 'demo:first-ride';
const FIRST_RIDE_STATUS = 'writing history · no known route here';

const ASSET = DEMO_WAY_ASSET;

export default function DemoScreen({ onFullscreenChange }: {
  onFullscreenChange?: (fs: boolean) => void;
}) {
  const { t } = useTheme();
  const { s: settings } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [mode, setMode] = useState<DemoMode>('tenth');
  const [running, setRunning] = useState(false);
  const [clockS, setClockS] = useState(0);
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // virgin-cycle15 brief 03: playback speed is a movable clock anchor, not a
  // constant — see demoModel.reanchorDemo. `rate` is the rendered dial label,
  // anchorRef is what the tick reads (the tick is a timer callback and must
  // not close over a stale render).
  const [rate, setRate] = useState<DemoRate>(demoSessionRate);
  const anchorRef = useRef<DemoClockAnchor>({ simS: 0, wallMs: 0, rate: demoSessionRate });
  // virgin-cycle16 07: endRun's once-only latch (tick vs scrub-release race).
  const endedRef = useRef(false);
  // Nathan (2026-09-19): after a full run -> ending -> end-mark -> idle -> re-run
  // cycle, the map sometimes came back with no route line/gate ticks (route asset drawn
  // fine on a fresh mount, so this is a native map-view lifecycle issue across a mount
  // that survived a much longer unmount than STOP-before-the-line's immediate one, not a
  // data bug — the underlying pure builders were re-checked head-to-head across two
  // consecutive "runs" and produce identical output both times). `runSeq` forces a truly
  // fresh WayMapView (and its native view/GL layers) on every RUN DEMO RIDE press, so no
  // stale layer state can survive from the previous mount into this one.
  const runSeq = useRef(0);
  // virgin-cycle11 (brief A): which screen of the DEMO tab is showing.
  const [phase, setPhase] = useState<DemoPhase>('idle');
  // Inspect fix (virgin-cycle17 brief 02 follow-up): DEMO, unlike RecordScreen, allows
  // hardware back during the ending screen, so the tower's onPlayed can still fire after
  // exitToIdle unmounts it (RN detaches the Animated value, which completes the callback
  // with finished:false rather than dropping it) — onRevealPlayed checks this ref, not
  // `phase` itself, since it's read inside a setTimeout closure that must see the latest
  // value, not the one captured at scheduling time.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  // 'rev' = the end-of-run mark (onDone = exitToIdle). It plays the SAME forward
  // draw as boot/ride-start since virgin-cycle17 brief 01 (Nathan 2026-09-29),
  // mirroring cycle15 brief 15 on RecordScreen; 'rev' is a historical name from
  // cycle 024 WP-A2, when the end mark undrew itself.
  const [showAnim, setShowAnim] = useState<'rev' | null>(null);
  const [busy, setBusy] = useState(false);                          // R7 fake save
  const [savedLine, setSavedLine] = useState<string | null>(null);  // R6/R7 confirmation line
  const [adjust, setAdjust] = useState<DemoGateAdjustDraft | null>(null);   // brief D: the gate card's draft
  const [pendingNames, setPendingNames] = useState<RouteNames | null>(null); // typed on card 1, echoed after card 2
  const pendingNamesRef = useRef<RouteNames | null>(null);
  pendingNamesRef.current = pendingNames;
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // virgin-cycle11 (brief B, R1/R6): the ranking reveal board (SECOND/TENTH only).
  const [reveal, setReveal] = useState<RankingReveal | null>(null);
  const [revealDone, setRevealDone] = useState(true);
  const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // virgin-cycle17 brief 02: what the ending screen does once the reveal has played —
  // mount the WP-G card, or start the end mark (demoPostReveal, set in enterEnding).
  // A ref, not a closure over `mode` — the tower's onPlayed fires from an animation
  // callback captured at mount, exactly RecordScreen.tsx's postRevealRef.
  const postRevealRef = useRef<DemoPostReveal>('card');
  // TENTH RIDE's quiet offer: tapping the `not Home → Work?` link sets this, which
  // (1) renders the WP-G card and (2) makes the post-reveal hold keep the screen up
  // instead of playing the end mark. Ref for the [] timeout closure, as above.
  const [namingExpanded, setNamingExpanded] = useState(false);
  const namingExpandedRef = useRef(false);
  namingExpandedRef.current = namingExpanded;
  // virgin-cycle14 brief 08 (Nathan #11): the RESULTS scatterplot on the ending screen.
  // `endedAtMs` is the one Date.now() enterEnding took — reveal and plot share it, so tower
  // dates and plot dates agree. Today's dot starts SELECTED (ring + caption without a tap —
  // a demo-only nicety; the real ResultsDetailScreen starts with nothing selected).
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [plotSel, setPlotSel] = useState<string | null>(DEMO_TODAY_RIDE_ID);
  const plotResults = useMemo(
    () => (endedAtMs === null ? null : demoPlotResults(mode, endedAtMs)),
    [mode, endedAtMs],
  );

  // The scripted ride: today's fixed lap (demoModel.ts's pinned fixture).
  const script = useMemo(() => buildDemoScript(), []);

  // virgin-cycle11 brief C: synthetic selfs for this mode's priors, built once per mode
  // (the absolute epoch only dates them; every position is relative to startMs).
  const builtAtMs = useRef(Date.now()).current;
  const selfTracks = useMemo(() => demoSelfTracks(DEMO_PRIOR_LAPS[mode], builtAtMs), [mode, builtAtMs]);

  const gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length;

  // virgin-cycle11 brief C (R3/R4/R5): elapsedMs from the demo clock (START crossing is
  // t = 0, R3); selfDots derived from it; showSelfs reads the self-dots toggle LIVE at
  // render level (never cached in start()'s interval closure or a []-deps callback — R4,
  // Nathan item 4); livePos mirrors RecordScreen.tsx's own selfLivePosition rule (null
  // before START, once the lap lands, or with self dots off).
  const elapsedMs = clockS > 0 ? clockS * 1000 : null;
  const selfDots = useMemo(() => selfDotsAt(selfTracks, elapsedMs), [selfTracks, elapsedMs]);
  const showSelfs = settings.selfDots && mode !== 'first';
  const livePos = showSelfs && elapsedMs !== null && gatesDone < script.secs.length
    ? (() => {
        const p = selfLivePosition(selfDots, demoChainage(script.gateAt, clockS));
        return p === null ? null : `P${p}`;
      })()
    : null;

  // One buzz per gate, exactly as on the bike (D-019) — SECOND RIDE only.
  // A first ride has no gates to cross, so there is nothing to buzz for.
  const prevGates = useRef(0);
  useEffect(() => {
    if (gatesDone !== prevGates.current) {
      if (mode !== 'first' && running && settings.earcons && gatesDone > prevGates.current) {
        // virgin-cycle7 (Nathan, QUESTIONS.md Q3): same double-buzz as the real tracker.
        Vibration.vibrate([0, 100, 70, 100]);
      }
      prevGates.current = gatesDone;
    }
  }, [gatesDone, running, settings.earcons, mode]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (holdRef.current) clearTimeout(holdRef.current);
    if (revealHoldRef.current) clearTimeout(revealHoldRef.current);
  }, []);

  // dot position: along the REAL ridden line (cycle 009) — same geometry for
  // both modes. FIRST RIDE hides the route, not the road: a first ride still
  // happens on a real road, the app just doesn't know it yet.
  const pos = positionAtTime(ASSET, script.gateAt, clockS);

  // FIRST RIDE only: grow the trail behind the dot as the clock advances.
  useEffect(() => {
    if (mode !== 'first' || !pos) return;
    setTrail((prev) => appendTrailPoint(prev, pos.lat, pos.lon));
  }, [clockS, mode, pos]);

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  // virgin-cycle11 (brief A, R6): STOP-after-the-line (and the auto-STOP)
  // land here. brief B (R1/R6): build the ranking reveal here for second/tenth
  // — a stale 'second' closure building a two-row board for TENTH RIDE is
  // exactly the bug `mode` in the deps avoids.
  const enterEnding = useCallback(() => {
    clearTimer();
    setRunning(false);
    const now = Date.now();
    const next = buildDemoReveal(mode, now);
    setReveal(next);
    setRevealDone(next === null);
    postRevealRef.current = demoPostReveal(mode);   // brief 02: TENTH → 'rev', else 'card'
    setEndedAtMs(now);            // brief 08: dates the plot (same instant as the reveal)
    setPlotSel(DEMO_TODAY_RIDE_ID);
    setPhase('ending');
  }, [mode]);

  const exitToIdle = useCallback(() => {
    clearTimer();
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = null;
    if (revealHoldRef.current) clearTimeout(revealHoldRef.current);
    revealHoldRef.current = null;
    setRunning(false);
    setClockS(0);
    prevGates.current = 0;
    setTrail([]);
    setSavedLine(null);
    setBusy(false);
    setShowAnim(null);
    setReveal(null);
    setRevealDone(true);
    setEndedAtMs(null);
    setAdjust(null);
    setPendingNames(null);
    setNamingExpanded(false);
    postRevealRef.current = 'card'; // Inspect fix: belt-and-braces against the guard above
    setPhase('idle');
  }, []);

  // R4: STOP before the line skips back to idle; STOP after it ends the ride.
  const onStop = useCallback(() => {
    if (demoStopOutcome(gatesDone) === 'ending') enterEnding();
    else exitToIdle();
  }, [gatesDone, enterEnding, exitToIdle]);

  const endS = demoRunEndS(script);

  // virgin-cycle16 07: the ONE completion path — freeze the clock at the
  // natural end and land on this tab's own 'ending' screen (reveal, naming
  // card, the RESULTS-style plot), exactly the state a ride left to play out
  // reaches. Reached by the tick (the ride played out) or by the scrub bar
  // released at its right edge (Nathan 2026-09-28: the bar reaching the end
  // IS the old SKIP ▸ RESULTS) — never by a button. It does NOT switch to the
  // real RESULTS tab: the demo writes no ride, and App.tsx would unmount this
  // screen on the way (cycle15 brief 03). No `phase` guard here on purpose:
  // the tick captures this closure inside start(), one render before `phase`
  // reads 'running'. endedRef makes the tick-vs-release race run it once;
  // start() re-arms it.
  const endRun = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    anchorRef.current = skipDemoAnchor(anchorRef.current, Date.now(), endS);
    clearTimer();
    setRunning(false);
    setClockS(endS);
    enterEnding();
  }, [endS, enterEnding]);

  // PAUSE (the button, or the scrub bar's first touch): read the clock once,
  // stop the tick, freeze the anchor there. Invariant from here until the next
  // startTick(): while paused, anchorRef.current.simS IS the demo clock and
  // wallMs is meaningless — whatever moves the clock while paused (scrub,
  // speed change) writes simS and leaves the tick alone; resuming re-stamps
  // wallMs. Already paused → a no-op read. Clamped so a read that lands in
  // the ≤ TICK_MS window past endS parks at endS (the next PLAY ends the run).
  const pauseRun = () => {
    const simS = timer.current
      ? Math.min(demoSimSAt(anchorRef.current, Date.now()), endS)
      : anchorRef.current.simS;
    clearTimer();
    setRunning(false);
    anchorRef.current = { simS, wallMs: Date.now(), rate: anchorRef.current.rate };
    setClockS(simS);
  };

  // The tick, shared by start(), PLAY (resume) and long-press restart.
  // Simulated seconds = real elapsed × rate, read off the wall clock anchor
  // each tick — the tick only sets how OFTEN the dot redraws, never how
  // fast simulated time advances (setInterval drift cannot slow the ride).
  // R3: the clock keeps running DEMO_ROLL_OUT_S past the lap (long enough
  // to read the neutral lap chip) and then ends the run into 'ending'.
  const startTick = () => {
    clearTimer();
    timer.current = setInterval(() => {
      const next = demoSimSAt(anchorRef.current, Date.now());
      if (next >= endS) { endRun(); return; }
      setClockS(next);
    }, TICK_MS);
  };

  const start = () => {
    runSeq.current += 1;
    clearTimer();
    prevGates.current = 0;
    setClockS(0);
    setTrail([]);
    setSavedLine(null);
    setBusy(false);
    setAdjust(null);
    setPendingNames(null);
    setPhase('running');
    setRunning(true);
    // virgin-cycle15 brief 03: the rate chosen before/while a previous ride
    // persists for the session (decision 2) — only simS and wallMs reset.
    anchorRef.current = { simS: 0, wallMs: Date.now(), rate: anchorRef.current.rate };
    endedRef.current = false;
    startTick();
  };

  // virgin-cycle16 07: PLAY / PAUSE — REPLAY's togglePlay on the demo's
  // anchor. `timer.current` is the imperative truth ("is the clock
  // advancing"), `running` its rendered twin (map liveState, gate buzz, the
  // glyph). REPLAY's third branch (over → restart from 0) has no equivalent:
  // reaching endS always leaves the running phase, so a paused run is never
  // "over".
  function togglePlay() {
    if (timer.current) { pauseRun(); return; }
    anchorRef.current = { simS: anchorRef.current.simS, wallMs: Date.now(), rate: anchorRef.current.rate };
    setRunning(true);
    startTick();
  }

  // Long-press = restart from 0, playing, same rate — REPLAY's restart().
  // Clears FIRST RIDE's trail as start() does; keeps the map mounted (runSeq
  // is for the idle → running remount only).
  function restart() {
    anchorRef.current = { simS: 0, wallMs: Date.now(), rate: anchorRef.current.rate };
    prevGates.current = 0;
    setTrail([]);
    setClockS(0);
    setRunning(true);
    startTick();
  }

  // virgin-cycle15 brief 03: re-anchor the clock at "now" with the new rate
  // (decision 3) — the simulated clock stays continuous, only its slope
  // changes. virgin-cycle16 07: while paused the anchor is frozen (pauseRun's
  // invariant), so only the rate swaps — reanchorDemo reads the wall clock and
  // would add the paused wall-time × rate back into the clock.
  const onPickRate = useCallback((r: DemoRate) => {
    anchorRef.current = timer.current
      ? reanchorDemo(anchorRef.current, Date.now(), r)
      : { ...anchorRef.current, rate: r };
    demoSessionRate = r;
    setRate(r);
  }, []);

  // virgin-cycle16 07: one speed dial instead of three pills — each tap moves
  // to the next DEMO_RATES entry and wraps (5 → 15 → 25 → 5), the same shape
  // as replayModel.nextReplayRate. Goes through onPickRate so the clock
  // re-anchors exactly as a pill tap did.
  const cycleRate = useCallback(() => {
    const i = DEMO_RATES.indexOf(rate);
    onPickRate(DEMO_RATES[(i + 1) % DEMO_RATES.length]);
  }, [rate, onPickRate]);

  // virgin-cycle16 07: the scrub bar — REPLAY's mechanics (cycle15 brief 08
  // decision 4: a relative jog, dx × rate × gain, clamped to [0, endS]) on
  // the demo's own anchor. First touch pauses, as REPLAY, and the run stays
  // paused after the finger lifts (PLAY resumes). Releasing with the knob at
  // the right edge ends the run (Nathan 2026-09-28) — on release, not mid-
  // drag, so an overshoot can be dragged back, and because endRun unmounts
  // this very view. The responder is created once and reads the latest
  // render's closures through scrubRef; anchorRef/setClockS are stable.
  const scrubRef = useRef({ pauseRun, endRun, endS });
  scrubRef.current = { pauseRun, endRun, endS };
  const scrubStartS = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scrubRef.current.pauseRun();
        scrubStartS.current = anchorRef.current.simS;
      },
      onPanResponderMove: (_e, gs) => {
        const a = anchorRef.current;
        const next = clampDemoClockS(
          scrubStartS.current + gs.dx * a.rate * DEMO_SCRUB_S_PER_DP_PER_RATE,
          scrubRef.current.endS,
        );
        anchorRef.current = { simS: next, wallMs: Date.now(), rate: a.rate };
        setClockS(next);
      },
      onPanResponderRelease: () => {
        if (anchorRef.current.simS >= scrubRef.current.endS) scrubRef.current.endRun();
      },
      onPanResponderTerminate: () => {
        if (anchorRef.current.simS >= scrubRef.current.endS) scrubRef.current.endRun();
      },
    }),
  ).current;

  // Switching mode stops any run in progress and resets every piece of
  // scripted state — the three modes never share a run. Only reachable from
  // idle now (the pills live only on the chooser screen).
  const switchMode = (m: DemoMode) => {
    if (m === mode) return;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setRunning(false);
    setClockS(0);
    prevGates.current = 0;
    setTrail([]);
    setMode(m);
  };

  // virgin-cycle11 (brief A): report fullscreen for every phase but idle, or
  // while the end mark is still playing on the way out of it —
  // same shape as RecordScreen's own effect.
  useEffect(() => {
    onFullscreenChange?.(phase !== 'idle' || showAnim != null);
    return () => onFullscreenChange?.(false);
  }, [phase, showAnim, onFullscreenChange]);

  // Hardware back — RecordScreen's pattern: idle falls through to Shell
  // (other tab → RECORD); running treats back as ending the run; ending leaves
  // without the end-mark ceremony.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'idle') return false;
      if (phase === 'running') { onStop(); return true; }
      exitToIdle();
      return true;
    });
    return () => sub.remove();
  }, [phase, onStop, exitToIdle]);

  // View model built by hand — the demo has no engine, but it feeds the very
  // same pane, so what you see here is what the Record screen would draw.
  // Used by SECOND/TENTH RIDE only. R5: the lap chip stays neutral until STOP.
  // Depth (R2): judged against the LAST DEMO_PRIOR_LAPS[mode] pinned laps.
  const vm = demoLiveViewModel(script, clockS, Date.now(), livePos, DEMO_PRIOR_LAPS[mode]);

  // SECOND/TENTH RIDE only: gate-indexed sector verdict colours for the map's
  // sector-span prop. Gate ticks themselves are never coloured — that is the
  // point of this mode (Nathan's 2026-09-01 ruling) — so no gate-tick colour
  // array is built or passed here at all. R2: same settings.sectorColours
  // toggle the real screen reads — OFF passes ALL_YELLOW, same as RecordScreen.
  const sectorColours = settings.sectorColours
    ? demoSectorColours(script, gatesDone, tierLineColour, DEMO_PRIOR_LAPS[mode])
    : ALL_YELLOW;

  const onDemoNamingSkip = useCallback(() => setShowAnim('rev'), []);
  const onDemoNamingSave = useCallback((names: RouteNames) => {
    setBusy(true);
    holdRef.current = setTimeout(() => {
      holdRef.current = null;
      setBusy(false);
      const draft = demoGateAdjustDraft(Date.now());
      if (draft === null) {
        // belt-and-braces: no line could be built — A's behaviour, the line at once
        setSavedLine(demoSavedLine(names));
        holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
        return;
      }
      setPendingNames(names);
      setAdjust(draft);           // R1 step 2: the gate card, no line yet — as the real screen
    }, DEMO_FAKE_SAVE_MS);
  }, []);
  // brief D: the gate card's exits — busy theatre on SAVE only, then one line names the outcome.
  const finishWithLine = useCallback((gates: DemoGatesOutcome) => {
    setAdjust(null);
    setSavedLine(demoSavedLine(pendingNamesRef.current ?? { start: '', end: '' }, gates));
    holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
  }, []);
  const onDemoAdjustKeep = useCallback(() => finishWithLine('kept'), [finishWithLine]);
  const onDemoAdjustSave = useCallback((_chainageM: number[]) => {
    setBusy(true);                                        // the button dims as a real save does
    holdRef.current = setTimeout(() => { holdRef.current = null; setBusy(false); finishWithLine('adjusted'); }, DEMO_FAKE_SAVE_MS);
  }, [finishWithLine]);
  // R6: the WP-G "new way on this route" card's ADD WAY — same theatre.
  const onDemoAddWaySave = useCallback((names: RouteNames) => {
    setBusy(true);
    holdRef.current = setTimeout(() => {
      setBusy(false);
      setSavedLine(demoAddedWayLine(DEMO_ROUTE_LABEL, names.specs));
      holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
    }, DEMO_FAKE_SAVE_MS);
  }, []);
  // R6: the reveal's hold timer — after onPlayed, the card/line appears
  // REVEAL_HOLD_MS later, exactly RecordScreen.tsx's revealHoldRef.
  // virgin-cycle17 brief 02: with postRevealRef 'rev' (TENTH RIDE) the end mark starts
  // instead of the card, unless the link was tapped — namingExpandedRef is the live
  // escape hatch the frozen baseline can't see (RecordScreen.tsx's onRevealPlayed, by value).
  const onRevealPlayed = useCallback(() => {
    // Inspect fix: the tower may fire this after we've already left the ending screen
    // (hardware back unmounts it mid-animation) — stale, ignore it.
    if (phaseRef.current !== 'ending') return;
    // The link was tapped during the climb — nothing to hold for, the card is due now.
    if (namingExpandedRef.current) {
      setRevealDone(true);
      return;
    }
    revealHoldRef.current = setTimeout(() => {
      revealHoldRef.current = null;
      // Inspect fix: re-check — back could have been pressed during the hold itself.
      if (phaseRef.current !== 'ending') return;
      setRevealDone(true);
      if (postRevealRef.current === 'rev' && !namingExpandedRef.current) setShowAnim('rev');
    }, REVEAL_HOLD_MS);
  }, []);
  // brief 02: the `not Home → Work?` tap. Expands the offer and, if the post-landing hold
  // is running, ends it now — the card shows at once and the cleared timer can never start
  // the end mark later. During the climb (no timer yet) onRevealPlayed handles the landing.
  const onNotThisWay = useCallback(() => {
    setNamingExpanded(true);
    if (revealHoldRef.current) {
      clearTimeout(revealHoldRef.current);
      revealHoldRef.current = null;
      setRevealDone(true);
    }
  }, []);

  if (phase === 'running') {
    const progressPct = 100 * Math.min(Math.max(clockS / endS, 0), 1);
    return (
      <View style={styles.raceColumn}>
        <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
          {mode === 'first' ? (
            <WayMapView key={`first-${runSeq.current}`} wayId={DEMO_FIRST_RIDE_ID} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
              zoom={4} trail={trail} variant="live" liveState={running ? 'moving' : 'finished'} fill />
          ) : (
            <WayMapView key={`${mode}-${runSeq.current}`} wayId={DEMO_WAY_ID} asset={DEMO_WAY_ASSET} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
              zoom={4} sectorColours={sectorColours} leadColour={colors.grey}
              selfs={showSelfs ? selfDots : undefined}
              variant="live" liveState={running ? 'moving' : 'finished'} fill />
          )}
        </View>
        {mode === 'first'
          ? <Text style={styles.trackLine}>{FIRST_RIDE_STATUS} · {demoFmtMS(clockS)}</Text>
          : <LiveSectorPane vm={vm} showLap clockSize={56} />}
        <Text style={styles.trackLine}>demo · nothing is recorded</Text>
        {/* virgin-cycle16 07 (Nathan 2026-09-28): REPLAY's control row, exactly —
            speed dial (taps cycle DEMO_RATES), the scrub bar, play/pause with
            long-press restart. No SKIP, no STOP: the run ends when the clock
            reaches the end, by playing or by the scrub knob released at the
            right edge; abandoning a run is the hardware back button (onStop),
            as before. Running phase only. */}
        <View style={styles.ctlRow}>
          <Pressable style={styles.dial} hitSlop={8} onPress={cycleRate} accessibilityLabel={`Demo speed ${rate}x`}>
            <Text style={styles.dialText}>{rate}×</Text>
          </Pressable>
          <View style={styles.scrubWrap} {...pan.panHandlers}>
            <View style={styles.scrubTrack}>
              <View style={[styles.scrubFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={[styles.scrubKnob, { left: `${progressPct}%` }]} />
          </View>
          <Pressable
            style={styles.ctlBtn}
            hitSlop={8}
            onPress={togglePlay}
            onLongPress={restart}
            accessibilityLabel={running ? 'pause' : 'play'}
          >
            {running ? <DemoPauseIcon color={t.text} /> : <DemoPlayIcon color={t.text} />}
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'ending') {
    return (
      <View style={styles.raceColumn}>
        <ScrollView
          style={{ flex: 1, alignSelf: 'stretch' }}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.trackLine}>
            {reveal !== null ? 'Activity saved.' : `Activity saved — ${demoFmtMS(clockS)}.`}
          </Text>
          {reveal !== null && (
            <TimingTower model={reveal.model} justFinished reveal climbMs={reveal.climbMs}
              startDelayMs={REVEAL_START_DELAY_MS} onPlayed={onRevealPlayed} />
          )}
          {revealDone ? (
            savedLine !== null ? (
              <Text style={styles.trackLine}>{savedLine}</Text>
            ) : adjust !== null ? (
              <GateAdjustCard
                wayId={DEMO_FIRST_RIDE_ID}
                refLine={adjust.ref}
                refLengthM={adjust.refLengthM}
                initialChainageM={adjust.chainageM}
                busy={busy}
                onKeep={onDemoAdjustKeep}
                onSave={onDemoAdjustSave}
              />
            ) : mode === 'first' ? (
              <RouteNamingCard
                startExistingLabel={null}
                endExistingLabel={null}
                loop={false}
                busy={busy}
                matchedWayLabel={null}
                existingRoute={null}
                vocabulary={[]}
                onSave={onDemoNamingSave}
                onSkip={onDemoNamingSkip}
                onSaveFree={onDemoNamingSkip}
              />
            ) : mode === 'tenth' && !namingExpanded ? null : (
              // R6: SECOND RIDE's after-reveal card — WP-G "new way on this route". Brief 02:
              // TENTH RIDE reaches it only through the `not Home → Work?` link (namingExpanded).
              <RouteNamingCard
                startExistingLabel={DEMO_ROUTE_START}
                endExistingLabel={DEMO_ROUTE_END}
                loop={false}
                busy={busy}
                matchedWayLabel={DEMO_ROUTE_LABEL}
                existingRoute={{ label: DEMO_ROUTE_LABEL, knownSpecLists: [[]] }}
                vocabulary={[...DEMO_SPEC_VOCABULARY]}
                onSave={onDemoAddWaySave}
                onSkip={onDemoNamingSkip}
                onSaveFree={onDemoNamingSkip}
              />
            )
          ) : mode === 'tenth' && !namingExpanded ? (
            /* brief 02: TENTH RIDE's quiet offer — the ride is already "saved" as the
               scored way; this one dim line is the whole correction affordance. Shown
               through the tower climb + hold (before revealDone — recordFlow.ts
               endingSlotFor's 'link' slot, by value); tapping holds the screen. */
            <Pressable
              style={styles.notThisWayBtn}
              disabled={busy || showAnim !== null}
              onPress={onNotThisWay}
              accessibilityLabel="This activity was a different way"
            >
              <Text style={styles.notThisWayText}>{`not ${DEMO_ROUTE_LABEL}?`}</Text>
            </Pressable>
          ) : null}
          {/* virgin-cycle14 brief 08 (Nathan #11): the RESULTS tab's scatterplot — the real
              ResultsPlot over this mode's synthetic priors + today's lap (demoPlotResults),
              exactly what the RESULTS detail would draw for this way after this ride. Shown
              once the reveal is done (the climb keeps its suspense), after the card (its
              buttons stay put). Nothing here is read from or written to storage. */}
          {revealDone && plotResults !== null ? (
            <View>
              <Text style={[styles.h2, { marginTop: 8, marginBottom: 10 }]}>
                {demoPlotCaption(plotResults)} · AS ON THE RESULTS TAB
              </Text>
              <ResultsPlot
                results={plotResults}
                selectedRideId={plotSel}
                selectedPosLabel={demoPlotPosLabel(plotResults, plotSel)}
                onSelect={setPlotSel}
                onOpenRide={() => { /* demo: there is no ride to open */ }}
              />
              <Text style={styles.trackLine}>demo only · nothing saved</Text>
            </View>
          ) : null}
        </ScrollView>
        {showAnim === 'rev' && <LaunchAnimation onDone={exitToIdle} />}
      </View>
    );
  }

  // phase === 'idle': the chooser. The map/pane live only in the run (R2).
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h2}>DEMO ACTIVITY</Text>
      <Text style={styles.sub}>Not part of the final app · use only for testing features.</Text>

      <View style={styles.pillRow}>
        <Pressable
          style={[styles.pill, mode === 'first' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('first')}
        >
          <Text style={[styles.pillText, mode === 'first' && styles.pillTextSelected]}>FIRST</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'second' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('second')}
        >
          <Text style={[styles.pillText, mode === 'second' && styles.pillTextSelected]}>SECOND</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'tenth' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('tenth')}
        >
          <Text style={[styles.pillText, mode === 'tenth' && styles.pillTextSelected]}>TENTH</Text>
        </Pressable>
      </View>

      <Pressable style={styles.btn} onPress={start}>
        <Text style={styles.btnText}>RUN DEMO ACTIVITY</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  h2: { color: t.textDim, fontSize: 12, letterSpacing: 2 },
  sub: { color: t.textDim, fontSize: 12.5, marginTop: 6 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    flex: 1, borderRadius: radius.btn, paddingVertical: 10, borderWidth: 2, alignItems: 'center',
  },
  pillSelected: { backgroundColor: t.accent, borderColor: t.accent },
  pillOutline: { backgroundColor: 'transparent', borderColor: t.race.border },
  pillText: { color: t.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  pillTextSelected: { color: t.onAccent },
  btn: {
    marginTop: 16, alignSelf: 'stretch', borderRadius: radius.btn, paddingVertical: 14,
    backgroundColor: t.accent, alignItems: 'center',
  },
  btnText: { color: t.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  // Copied by value from RecordScreen.tsx (virgin-cycle11 brief A, Task 3 step 11) —
  // the run/ending columns mirror RecordScreen's own race surface exactly.
  raceColumn: {
    flex: 1, alignSelf: 'stretch', backgroundColor: t.race.bg,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, gap: 8,
  },
  trackLine: {
    color: t.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
  },
  // brief 02: the quiet offer's link — RecordScreen.tsx notThisWayBtn/notThisWayText, by value.
  notThisWayBtn: { paddingVertical: 10, alignItems: 'center' },
  notThisWayText: { color: t.textDim, fontSize: 13 },
  // virgin-cycle16 07: REPLAY's control-row vocabulary (ReplayScreen.tsx
  // ctlRow/dial/dialText/scrub*/ctlBtn), by value — same sizes, same tokens.
  ctlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: t.accent,
    backgroundColor: t.race.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: { color: t.accent, fontSize: 15, fontWeight: '800' },
  scrubWrap: { flex: 1, height: 44, justifyContent: 'center' },
  scrubTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.race.card },
  scrubFill: { height: '100%', backgroundColor: t.accent },
  scrubKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: t.accent,
    marginLeft: -8,
  },
  ctlBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: t.race.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
