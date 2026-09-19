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
 * shared-render-path rule): a scripted ride replayed at 25x. Nothing here
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
 * The idle screen (below) is a plain chooser — pills, one description line,
 * RUN — and the map/pane only appear once a run starts. The run itself takes
 * over the whole tab (`onFullscreenChange`, the same mechanism RecordScreen
 * uses) and mirrors RecordScreen's real running column: live-variant map on
 * top, the shared LiveSectorPane, a status line, STOP. The scripted clock
 * rolls past the lap by `DEMO_ROLL_OUT_S` sim-seconds and then auto-STOPs
 * into an 'ending' screen. Lap chip is neutral before STOP, exactly as the
 * real screen since the ranking reveal. FIRST RIDE's SAVE now continues into
 * the real `GateAdjustCard` on a reference line built from the demo path
 * (brief D); KEEP/SAVE GATES are theatre too, nothing is written.
 *
 * virgin-cycle11 brief B: a third mode, TENTH RIDE (now the default) —
 * SECOND RIDE is an honest ride 2 (one prior lap, purple/yellow only);
 * TENTH RIDE judges today against the last WINDOW_PREV pinned laps, the
 * real app's whole ranking pool. After STOP, SECOND/TENTH mount the real
 * `TimingTower` in reveal mode over a board built by the real
 * `buildRankingReveal` (an injected synthetic window, no store reads) and,
 * after the hold, the real `RouteNamingCard` in its WP-G "new way on this
 * route" variant — FIRST RIDE still mounts the both-endpoints-unknown card
 * straight away. Every SAVE/ADD WAY here is theatre: nothing is written.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { tierLineColour } from './chips';
import {
  buildDemoReveal,
  buildDemoScript,
  demoAddedWayLine,
  demoChainage,
  demoFmtMS,
  demoGateAdjustDraft,
  demoLiveViewModel,
  demoRunEndS,
  demoSavedLine,
  demoSectorColours,
  demoSelfTracks,
  demoStopOutcome,
  DEMO_FAKE_SAVE_MS,
  DEMO_PRIOR_LAPS,
  DEMO_ROLL_OUT_S,
  DEMO_ROUTE_END,
  DEMO_ROUTE_LABEL,
  DEMO_ROUTE_START,
  DEMO_SAVED_HOLD_MS,
  DEMO_SPEC_VOCABULARY,
  type DemoGateAdjustDraft,
  type DemoGatesOutcome,
  type DemoMode,
  type DemoPhase,
  type RouteNames,
} from './demoModel.ts';
import { DEMO_WAY_ASSET, DEMO_WAY_ID } from './demoWayFixture.ts';
import { GateAdjustCard } from './gateAdjustCard';
import { LaunchAnimation } from './launchAnimation';
import { LiveSectorPane } from './liveView';
import { REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type RankingReveal } from './rankingRevealModel.ts';
import { RouteNamingCard } from './routeNamingCard';
import { selfDotsAt, selfLivePosition } from './selfRaceModel.ts';
import { ALL_YELLOW } from './sectorTrailModel.ts';
import { useSettings } from './settings';
import { colors, PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';
import { TimingTower } from './tower';
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';
import WayMapView from './wayMapView';
import { positionAtTime } from './wayMapMath';

// WP-E: the scripted lap is DemoScreen's own frozen fixture
// (demoRouteFixture.ts), not a manifest or catalog route — it renders
// identically on every build, virgin included, and never touches the
// bundled route manifest.
const RATE = 25;              // a ~14-minute commute plays in ~34 s
const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so RATE is exact

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
  // virgin-cycle11 (brief A): which screen of the DEMO tab is showing.
  const [phase, setPhase] = useState<DemoPhase>('idle');
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
    const next = buildDemoReveal(mode, Date.now());
    setReveal(next);
    setRevealDone(next === null);
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
    setAdjust(null);
    setPendingNames(null);
    setPhase('idle');
  }, []);

  // R4: STOP before the line skips back to idle; STOP after it ends the ride.
  const onStop = useCallback(() => {
    if (demoStopOutcome(gatesDone) === 'ending') enterEnding();
    else exitToIdle();
  }, [gatesDone, enterEnding, exitToIdle]);

  const start = () => {
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
    // Simulated seconds = real elapsed × RATE, read off the wall clock each
    // tick — the tick only sets how OFTEN the dot redraws, never how fast
    // simulated time advances (setInterval drift cannot slow the ride).
    const startedAtMs = Date.now();
    // R3: the clock keeps running DEMO_ROLL_OUT_S past the lap (long enough
    // to read the neutral lap chip) and then auto-STOPs into 'ending'.
    const endS = demoRunEndS(script);
    timer.current = setInterval(() => {
      const next = ((Date.now() - startedAtMs) / 1000) * RATE;
      if (next >= endS) {
        clearTimer();
        setRunning(false);
        setClockS(endS);
        enterEnding();
        return;
      }
      setClockS(next);
    }, TICK_MS);
  };

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
  // while the reverse launch mark is still playing on the way out of it —
  // same shape as RecordScreen's own effect.
  useEffect(() => {
    onFullscreenChange?.(phase !== 'idle' || showAnim != null);
    return () => onFullscreenChange?.(false);
  }, [phase, showAnim, onFullscreenChange]);

  // Hardware back — RecordScreen's pattern: idle falls through to Shell
  // (other tab → RECORD); running treats back like STOP; ending leaves
  // without the reverse-mark ceremony.
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
  const onRevealPlayed = useCallback(() => {
    revealHoldRef.current = setTimeout(() => { revealHoldRef.current = null; setRevealDone(true); }, REVEAL_HOLD_MS);
  }, []);

  if (phase === 'running') {
    return (
      <View style={styles.raceColumn}>
        {settings.liveMap ? (
          <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
            {mode === 'first' ? (
              <WayMapView wayId={DEMO_FIRST_RIDE_ID} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
                zoom={4} trail={trail} variant="live" liveState={running ? 'moving' : 'finished'} fill />
            ) : (
              <WayMapView wayId={DEMO_WAY_ID} asset={DEMO_WAY_ASSET} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
                zoom={4} sectorColours={sectorColours} leadColour={colors.grey}
                selfs={showSelfs ? selfDots : undefined}
                variant="live" liveState={running ? 'moving' : 'finished'} fill />
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {mode === 'first'
          ? <Text style={styles.trackLine}>{FIRST_RIDE_STATUS} · {demoFmtMS(clockS)}</Text>
          : <LiveSectorPane vm={vm} showLap />}
        <Text style={styles.trackLine}>demo · nothing is recorded</Text>
        <Pressable style={styles.stopSlim} onPress={onStop}>
          <Text style={styles.stopSlimText}>STOP</Text>
          <Text style={styles.stopSlimSub}>
            {demoStopOutcome(gatesDone) === 'ending' ? 'end the demo ride' : 'skips the demo · nothing is recorded'}
          </Text>
        </Pressable>
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
            {reveal !== null ? 'Ride saved.' : `Ride saved — ${demoFmtMS(clockS)}.`}
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
              />
            ) : (
              // R6: SECOND/TENTH RIDE's after-reveal card — WP-G "new way on this route".
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
              />
            )
          ) : null}
        </ScrollView>
        {showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}
      </View>
    );
  }

  // phase === 'idle': the chooser. The map/pane live only in the run (R2).
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h2}>DEMO RIDE</Text>
      <Text style={styles.sub}>Nothing is recorded.</Text>

      <View style={styles.pillRow}>
        <Pressable
          style={[styles.pill, mode === 'first' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('first')}
        >
          <Text style={[styles.pillText, mode === 'first' && styles.pillTextSelected]}>FIRST RIDE</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'second' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('second')}
        >
          <Text style={[styles.pillText, mode === 'second' && styles.pillTextSelected]}>SECOND RIDE</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'tenth' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('tenth')}
        >
          <Text style={[styles.pillText, mode === 'tenth' && styles.pillTextSelected]}>TENTH RIDE</Text>
        </Pressable>
      </View>

      <Text style={styles.sub}>
        {mode === 'first'
          ? "A stranger's first ride: no route, no gates, a trail growing behind the dot — then the card that names the route."
          : mode === 'second'
          ? 'Your second ride of a route: the line, the gates, the sector strip — then how it ranked, and the card.'
          : 'Your tenth ride: nine earlier rides to beat — the full timing tower climbs after STOP, then the card.'}
      </Text>

      <Pressable style={styles.btn} onPress={start}>
        <Text style={styles.btnText}>RUN DEMO RIDE</Text>
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
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
  stopSlimSub: { color: t.textDim, fontSize: 11, letterSpacing: 1 },
});
