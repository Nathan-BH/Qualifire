# 07 — DEMO running-phase controls: REPLAY's control row, exactly (dial · scrub · play/pause)

**Source: Nathan, 2026-09-28.** First: "i just realized the replay screen redesign ideas
should of course be applied to the current DEMO screens as well to reduce the big buttons
size and have an easier interface!" Then, after seeing the first version of this brief
(dial + skip + stop, no scrub bar), the same day: "actually also include the slider like the
replay screen has; and instead of a skip button, only continue to the next animation when
the slider gets all the way to the end, whether manually or by the play button taking it to
the end. This way we win even more space by removing a button" — "this also makes the stop
button unnecessary, we can have exactly the play/pause button of the replay screen; so
basically both screens will be identical i believe!?"

**This file supersedes the first version of brief 07 entirely** (dial · skip · stop, no
scrub). Nothing of that version was executed.

**Status: brief only, parked. Nothing below is in the app.** Rewritten 2026-09-28 by the
Plan tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`; `app/src/ui/DemoScreen.tsx` and `app/src/ui/demoModel.ts` have no
uncommitted changes). Executor: Sonnet, cold, this file only. Brief 07 of `virgin-cycle16`.
**Independent of briefs 01–06 and 08** (none of them touches `DemoScreen.tsx` —
`grep -ln DemoScreen cycles/virgin-cycle16/0*.md` → only this file — so this can land before,
between or after them). **This brief touches exactly one file: `app/src/ui/DemoScreen.tsx`.**

**Line numbers below are against HEAD `2c21265`.** No other cycle16 brief edits this file,
so they should be exact; the **quoted content** is still the anchor. Stop only when the
quoted content itself is not found or reads differently.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  block is not in the file, or a name/signature/style key differs from what is quoted,
  **stop and report the mismatch verbatim** (file, line, what you expected, what you found).
  Never guess, never patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` (repo root) is the bin (`mv`, never
  `rm`), and **never call `device_request_delete_permission`**, for any reason.
- No new dependency. `PanResponder` comes from `react-native` (already used by
  `ReplayScreen.tsx`). No icon library, no font glyph — every glyph is a plain `View`, the
  rule `app/src/ui/replayIcons.tsx` states in its header.
- **REPLAY is read-only reference material. Do not edit `app/src/ui/ReplayScreen.tsx`,
  `app/src/ui/replayIcons.tsx`, `app/src/ui/replayModel.ts`, or any REPLAY style, string or
  behaviour.** Do not import from any of the three either (Decision 9 explains why). Do not
  extract a shared control-row / scrub / dial / icon component: Demo keeps its own JSX,
  its own two tiny glyph components and its own `makeStyles` block, following the same
  pattern by value.
- Do not touch `app/src/ui/demoModel.ts` (`DemoClockAnchor` keeps its three fields — pause
  state is the screen's, Decision 2; `DEMO_RATES`, `reanchorDemo`, `skipDemoAnchor`,
  `demoRunEndS` stay as they are), `app/src/ui/liveView.tsx` (`clockSize` is an existing
  optional prop, `liveView.tsx:256-257`), `app/src/ui/theme.ts`, `app/src/ui/wayMapView.tsx`,
  any test file, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md`
  brief in this folder, or anything under `cycles/virgin-cycle15/`.
- **Do not touch the idle chooser** (`phase === 'idle'`, lines 592–623: FIRST / SECOND /
  TENTH RIDE pills + RUN DEMO RIDE). It shares the `pill*` styles with the running-phase
  speed pills this brief removes — those styles **stay** (Current state, "shared styles").
- **Do not touch `onStop` (lines 293–297) or the hardware-back effect (lines 385–397).**
  Their only change is that the STOP button no longer calls `onStop`; the back button still
  does, and that is now the only way to abandon a run (Decision 6).
- **No test is edited or added by this brief.** `DemoScreen.tsx` is not rendered by any
  suite; the one suite that reads its source (`app/tests/virginmanifest_suite.ts:286-288`)
  only asserts the strings `ways.json` and `'Morning'` are absent — neither appears in
  anything this brief adds. The scrub arithmetic is two one-liners local to the screen
  (Decision 4); a model-level home with tests is open question 1.

## Goal

The DEMO running screen's bottom chrome — three full-width speed pills (5x / 15x / 25x)
stacked above two 56 dp full-width buttons (SKIP ▸ RESULTS, STOP with a sub-line) —
becomes **REPLAY's control row, literally**: `[round speed dial 44] [scrub bar, flex: 1]
[play/pause 44]`, `gap: 10`. The dial cycles 5 → 15 → 25 → 5 on tap. The scrub bar is
REPLAY's relative jog (drag right = forward, delta scaled by the rate, clamped to the run's
end); its first touch pauses the run, exactly as REPLAY. The play/pause button pauses and
resumes the scripted clock; long-press restarts from 0. **There is no skip and no stop
button.** The run ends into the 'ending' screen (reveal, naming card, RESULTS-style plot) in
exactly two ways: the clock reaches the end by playing (unchanged), or the scrub knob is
released at the right edge of the bar (this brief). Abandoning a run is the hardware back
button, unchanged (`onStop`). The lap clock above shrinks from 92 to 56 like REPLAY's.
Everything freed flows into the map, which is already `flex: 1`. The idle chooser and the
ending screen are untouched.

## Current state (verified 2026-09-28 against the tree)

### REPLAY, the reference pattern (read-only)

**`app/src/ui/ReplayScreen.tsx`**

- Line 11: `import { BackHandler, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';`
- Lines 45–48: the anchor is React state carrying the play flag —
  `useState<ReplayAnchor>({ clockS: 0, realMs: Date.now(), rate: REPLAY_RATE_DEFAULT, playing: false })`,
  and `const [clockS, setClockS] = useState(0);`. Lines 82–99: a `useEffect` on
  `[anchor, rider]` runs the `setInterval` only while `anchor.playing`; at `next >= endS` it
  sets `clockS = endS` and `playing: false` — **REPLAY's timeline stops at its end and
  stays on screen**; nothing else happens.
- Lines 150–166, the play/pause state machine this brief mirrors:

  ```tsx
    function togglePlay() {
      const now = Date.now();
      if (anchor.playing) {
        setAnchor({ clockS, realMs: now, rate: anchor.rate, playing: false });
      } else if (isOver) {
        setClockS(0);
        setAnchor({ clockS: 0, realMs: now, rate: anchor.rate, playing: true });
      } else {
        setAnchor({ clockS, realMs: now, rate: anchor.rate, playing: true });
      }
    }

    function restart() {
      const now = Date.now();
      setClockS(0);
      setAnchor({ clockS: 0, realMs: now, rate: anchor.rate, playing: true });
    }
  ```

  (`isOver = clockS >= endS`, line 148.) Line 168–170 `setRate` re-anchors at now keeping
  `playing`; 172–174 `cycleRate() { setRate(nextReplayRate(anchor.rate)); }`.
- Lines 176–200, the scrub bar: a `PanResponder` created once in a `useRef`, reading the
  latest render through `scrubRef.current = { anchor, endS, setClockS, setAnchor }`.
  `onPanResponderGrant` reads the clock, stores it in `startS`, sets `clockS` and an anchor
  with `playing: false` (**the first touch pauses**). `onPanResponderMove` sets
  `next = clampClockS(startS.current + scrubDeltaS(gs.dx, p.anchor.rate), p.endS)` into both
  `clockS` and the (paused) anchor. **No release/terminate handler; the run stays paused
  after the finger lifts** — PLAY resumes it.
- Line 246: the map gets `liveState={anchor.playing ? 'moving' : 'finished'}` — paused
  REPLAY shows the map in its unlocked 'finished' personality.
- Line 254: `{vm ? <LiveSectorPane vm={vm} showLap clockSize={56} /> : null}`
- Line 228: `const progressPct = endS > 0 ? 100 * Math.min(Math.max(clockS / endS, 0), 1) : 0;`
- Lines 258–277, the control row:

  ```tsx
        <View style={styles.ctlRow}>
          <Pressable style={styles.dial} hitSlop={8} onPress={cycleRate} accessibilityLabel="replay speed">
            <Text style={styles.dialText}>{anchor.rate}×</Text>
          </Pressable>
          <View style={styles.scrubWrap} {...(scrubEnabled ? pan.panHandlers : {})}>
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
            accessibilityLabel={anchor.playing ? 'pause' : 'play'}
          >
            {anchor.playing ? <PauseIcon color={t.text} /> : <PlayIcon color={t.text} />}
          </Pressable>
        </View>
  ```

- Styles, lines 298–329 (copied by value in Edit H below): `ctlRow`, `dial`, `dialText`,
  `scrubWrap: { flex: 1, height: 44, justifyContent: 'center' }`,
  `scrubTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.race.card }`,
  `scrubFill: { height: '100%', backgroundColor: t.accent }`,
  `scrubKnob: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: t.accent, marginLeft: -8 }`,
  `ctlBtn`.

**`app/src/ui/replayModel.ts`** (read-only; values copied, never imported)

- Line 28: `export const SCRUB_S_PER_DP_PER_RATE = 0.4;` — its doc (25–27): "On a ~240 dp
  bar this makes one full-width swipe move rate*96 ride-seconds".
- Lines 38–40: `scrubDeltaS(dx, rate) { return dx * rate * SCRUB_S_PER_DP_PER_RATE; }`
- Lines 42–44: `clampClockS(v, endS) { return Math.min(Math.max(v, 0), Math.max(endS, 0)); }`

**`app/src/ui/replayIcons.tsx`** (read-only): `PlayIcon` = one `View`, border-trick
triangle (`borderTopWidth: 10, borderBottomWidth: 10, borderLeftWidth: 17`, transparent
top/bottom, `marginLeft: 3`); `PauseIcon` = `pauseWrap: { flexDirection: 'row', gap: 4 }`
holding two `bar: { width: 4, height: 18, borderRadius: 1 }`. Module-level
`StyleSheet.create` placed *below* the two components.

### `app/src/ui/demoModel.ts` (read-only for this brief)

- Line 130: `export function demoRunEndS(script: DemoScript): number { return script.lap + DEMO_ROLL_OUT_S; }`
  (`DEMO_ROLL_OUT_S = 60`, line 128; `DEMO_SECS = [185, 207, 237, 207]` line 62, so the
  run is ≈ 896 sim-seconds long).
- Lines 370–372: `DEMO_RATES = [5, 15, 25] as const`, `type DemoRate`, `DEMO_RATE_DEFAULT = 25`.
- Line 378: `export interface DemoClockAnchor { simS: number; wallMs: number; rate: DemoRate }`
  — **no `playing` field** (unlike REPLAY's `ReplayAnchor`). The anchor is a ref in the
  screen, not state; the tick is an imperative `setInterval` started in `start()`.
- Lines 380–382: `demoSimSAt(anchor, nowMs) = anchor.simS + max(0, nowMs - wallMs)/1000 * rate`.
- Lines 384–387: `reanchorDemo(anchor, nowMs, rate)` — same rate → the same object back;
  otherwise `{ simS: demoSimSAt(anchor, nowMs), wallMs: nowMs, rate }`. **It reads the wall
  clock** — which is why it must not be used on a paused anchor (Decision 2).
- Lines 390–392: `skipDemoAnchor(anchor, nowMs, endS)` → `{ simS: endS, wallMs: nowMs, rate }`.

### `app/src/ui/DemoScreen.tsx`

- Line 39 (header comment): ` * top, the shared LiveSectorPane, a status line, STOP. The scripted clock`
- Line 63: `import { BackHandler, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';`
  — no `PanResponder` (`grep -n PanResponder app/src/ui/DemoScreen.tsx` → no hits).
- Lines 65–101: the `demoModel.ts` import block; it already brings in `demoRunEndS` (78),
  `demoSimSAt` (83), `reanchorDemo` (85), `skipDemoAnchor` (86), `DEMO_RATES` (89),
  `type DemoClockAnchor` (98), `type DemoRate` (103). Nothing is added to it.
- Line 117: `import { positionAtTime } from './wayMapMath';` — the last import. Line 118 is
  blank, line 119 starts `// WP-E: the scripted lap is DemoScreen's own frozen fixture`.
- Line 126: `const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so the rate is exact`
- Line 147: `const { t } = useTheme();` · line 149: `const styles = useMemo(() => makeStyles(t), [t]);`
- **Line 151: `  const [running, setRunning] = useState(false);`** — set `true` in
  `start()` (310), `false` in `enterEnding` (262), `exitToIdle` (278), the tick's end
  branch (325), `onSkip` (358), `switchMode` (371). Read in exactly two places: the map's
  `liveState={running ? 'moving' : 'finished'}` (464, 469) and the gate-buzz guard (226).
  **That is precisely the pair of uses REPLAY's `anchor.playing` has** (map personality +
  side effects), so `running` becomes the play flag (Decision 2) — no new state.
- Line 154: `const timer = useRef<ReturnType<typeof setInterval> | null>(null);`
- Lines 155–160: the brief-03 comment + `const [rate, setRate] = useState<DemoRate>(demoSessionRate);`
  + `const anchorRef = useRef<DemoClockAnchor>({ simS: 0, wallMs: 0, rate: demoSessionRate });`
- **Line 161: `  const skippingRef = useRef(false);`** — set `false` in `start()` (317),
  `true` in `onSkip` (354), read in `onSkip`'s guard (353). No other use.
- Line 172: `const [phase, setPhase] = useState<DemoPhase>('idle');`
- Line 201: `const script = useMemo(() => buildDemoScript(), []);`
- Line 204: `const gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length;`
- Lines 222–232: the gate-buzz effect — buzzes only when `running && gatesDone > prevGates.current`.
- Lines 234–238: the unmount cleanup effect (`clearInterval(timer.current)` etc.) — untouched.
- Lines 245–249: FIRST RIDE's trail effect appends a point on every `clockS` change.
- Lines 251–254: `const clearTimer = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };`
- Lines 260–270: `enterEnding` (`useCallback`, deps `[mode]`) — `clearTimer(); setRunning(false);
  … setPhase('ending');`. Lines 272–291: `exitToIdle`. Untouched.
- **Lines 293–297, `onStop` — untouched:**

  ```tsx
    // R4: STOP before the line skips back to idle; STOP after it ends the ride.
    const onStop = useCallback(() => {
      if (demoStopOutcome(gatesDone) === 'ending') enterEnding();
      else exitToIdle();
    }, [gatesDone, enterEnding, exitToIdle]);
  ```

  Called from exactly two places today: the hardware-back effect (392) and the STOP button
  (500). After this brief: the back effect only.
- Line 299 is blank. **Lines 300–363 are the region Edit E replaces wholesale** — `start()`,
  `onPickRate`, `onSkip`, with their comments. Quoted in full:

  ```tsx
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
      // Simulated seconds = real elapsed × rate, read off the wall clock anchor
      // each tick — the tick only sets how OFTEN the dot redraws, never how
      // fast simulated time advances (setInterval drift cannot slow the ride).
      // virgin-cycle15 brief 03: the rate chosen before/while a previous ride
      // persists for the session (decision 2) — only simS and wallMs reset.
      anchorRef.current = { simS: 0, wallMs: Date.now(), rate: anchorRef.current.rate };
      skippingRef.current = false;
      // R3: the clock keeps running DEMO_ROLL_OUT_S past the lap (long enough
      // to read the neutral lap chip) and then auto-STOPs into 'ending'.
      const endS = demoRunEndS(script);
      timer.current = setInterval(() => {
        const next = demoSimSAt(anchorRef.current, Date.now());
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

    // virgin-cycle15 brief 03: re-anchor the clock at "now" with the new rate
    // (decision 3) — the simulated clock stays continuous, only its slope
    // changes. reanchorDemo is a no-op on the already-active pill.
    const onPickRate = useCallback((r: DemoRate) => {
      anchorRef.current = reanchorDemo(anchorRef.current, Date.now(), r);
      demoSessionRate = r;
      setRate(r);
    }, []);

    // virgin-cycle15 brief 03 (+ fix-up): SKIP ▸ RESULTS — end the demo ride
    // through the same completion path the auto-stop uses and land on this
    // tab's own 'ending' screen (reveal, naming card, the RESULTS-style plot),
    // exactly the state a ride left to play out reaches. It does NOT switch to
    // the real RESULTS tab: the demo writes no ride, so that tab has nothing
    // of ours to show, and App.tsx would unmount this screen (losing the
    // ending state) on the way. Branch (a) per brief 03 decision 4: the tick
    // is a pure function of simS, so re-anchoring simS to the natural end and
    // mirroring the auto-stop check below is the whole skip.
    const onSkip = useCallback(() => {
      if (phase !== 'running' || skippingRef.current) return;
      skippingRef.current = true;
      const endS = demoRunEndS(script);
      anchorRef.current = skipDemoAnchor(anchorRef.current, Date.now(), endS);
      clearTimer();
      setRunning(false);
      setClockS(endS);
      enterEnding();
      // skippingRef stays true until the next start() — by the time this
      // returns, phase is no longer 'running' and the SKIP button is gone.
    }, [phase, script, enterEnding]);
  ```

  Line 364 is blank; line 365 starts `  // Switching mode stops any run in progress and resets every piece of`.
  **Note the tick's end branch is inlined, not a call to `onSkip`** — `onSkip`'s
  `phase !== 'running'` guard would read the *stale* `'idle'` closure captured when
  `start()` created the interval. The rewrite keeps that property (Decision 3: the shared
  end helper has no `phase` guard).
- Lines 385–397, the hardware-back effect — **untouched**:
  `if (phase === 'running') { onStop(); return true; }` (392), deps `[phase, onStop, exitToIdle]` (397).
- Line 403: `const vm = demoLiveViewModel(script, clockS, Date.now(), livePos, DEMO_PRIOR_LAPS[mode]);`
  — `demoModel.ts:348` builds its timebase with `rate: 1, running: false`, i.e. the pane's
  lap clock **does not self-tick**; it re-renders from `clockS` each tick. A paused
  `clockS` is therefore a frozen clock with no further change.
- **Lines 457–459:** `  if (phase === 'running') {` / `    return (` / `      <View style={styles.raceColumn}>`.
- **The map container, lines 460–474:** `{settings.liveMap ? (` → `<View style={{ flex: 1,
  minHeight: 220, alignSelf: 'stretch' }}>` holding the `WayMapView` (with
  `liveState={running ? 'moving' : 'finished'}` at 464 and 469) → `) : ( <View style={{
  flex: 1 }} /> )}`. Inside `<View style={styles.raceColumn}>` (459), where `raceColumn`
  (644) is `flex: 1, alignSelf: 'stretch', … paddingTop: 8, paddingBottom: 10, gap: 8`.
  **So the map is a plain `flex: 1` child of a `flex: 1` column: any height the chrome
  below gives up goes to the map with no further change.** Not edited.
- **Timer, line 477:** `          : <LiveSectorPane vm={vm} showLap />}` (no `clockSize`;
  `liveView.tsx:218-231` falls back to the 92 default when the prop is absent).
- Line 478: `        <Text style={styles.trackLine}>demo · nothing is recorded</Text>`
- **The controls, lines 479–506** (everything between line 478 and the `</View>` that closes
  `raceColumn` at 507):

  ```tsx
          {/* virgin-cycle15 brief 03: speed pills (DEMO_RATES, not REPLAY's) +
              SKIP ▸ RESULTS, which jumps to this tab's own ending screen (the
              post-ride reveal + RESULTS-style plot) without waiting a demo lap
              out. Running phase only. */}
          <View style={styles.demoCtl}>
            <View style={styles.pillRow}>
              {DEMO_RATES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.pill, r === rate ? styles.pillSelected : styles.pillOutline]}
                  onPress={() => onPickRate(r)}
                  accessibilityLabel={`Demo speed ${r}x`}
                >
                  <Text style={r === rate ? styles.pillTextSelected : styles.pillText}>{r}x</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.stopSlim} onPress={onSkip} accessibilityLabel="Skip to results">
              <Text style={styles.stopSlimText}>SKIP ▸ RESULTS</Text>
            </Pressable>
          </View>
          <Pressable style={styles.stopSlim} onPress={onStop}>
            <Text style={styles.stopSlimText}>STOP</Text>
            <Text style={styles.stopSlimSub}>
              {demoStopOutcome(gatesDone) === 'ending' ? 'end the demo ride' : 'skips the demo · nothing is recorded'}
            </Text>
          </Pressable>
        </View>
      );
    }
  ```

- **Shared styles — `pill*` are NOT Demo-running-only.** `styles.pillRow` / `pill` /
  `pillSelected` / `pillOutline` / `pillText` / `pillTextSelected` are also used by the idle
  chooser at lines 598–615 (FIRST / SECOND / TENTH RIDE). After this brief they have those
  six uses and must stay. `stopSlim` / `stopSlimText` / `stopSlimSub` / `demoCtl` are used
  **only** at 483–502 and go with them (`grep -n "stopSlim\|demoCtl"` → 483, 496, 497,
  500, 501, 502 and the four style keys 657/669/670/673 — nothing else).
- `demoStopOutcome` (import line 81) is also used at line 295 inside `onStop`; dropping the
  STOP button leaves it used. `gatesDone` (204) stays used (buzz effect, sector colours,
  `onStop`). `DEMO_RATES` stays used (`cycleRate`, Edit E). `demoSimSAt`, `reanchorDemo`,
  `skipDemoAnchor`, `demoRunEndS` stay used (Edit E).
- **The name `onSkip` also appears as a prop** at lines 549 and 562 (`onSkip={onDemoNamingSkip}`,
  the naming card's own prop) — those are not this brief's `onSkip` and are untouched;
  verification greps below are written to avoid them.
- **Styles, lines 657–673** (end of `makeStyles`; line 674 is `});`):

  ```tsx
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
    // virgin-cycle15 brief 03: wraps the DEMO speed pills + SKIP ▸ RESULTS,
    // running phase only.
    demoCtl: { gap: 8, marginTop: 8 },
  });
  ```

- `colors`, `radius`, `PaddockTheme` are already imported (line 112). `t.text` exists
  (`theme.ts:51`), `t.accent` (54), `t.race.card` (63). `StyleSheet` is already imported (63).
- Height today, below the "demo · nothing is recorded" line: column gap 8 + `demoCtl`
  marginTop 8 + `pillRow` marginTop 12 + pill ≈ 40 + gap 8 + SKIP 56 + column gap 8 +
  STOP 56 ≈ **196 dp**. After: column gap 8 + row 44 = **52 dp**. Plus the clock's 92 → 56
  drop (~40 dp of line height). **≈ 180 dp goes to the map** — approximate (pill height
  depends on font metrics), the same order as REPLAY's ~150.

## Decisions (pre-resolved — do not re-open)

1. **Speed control = REPLAY's dial, cycling `DEMO_RATES` with wrap-around (5 → 15 → 25 → 5),
   through the existing `onPickRate`.** A `cycleRate` `useCallback` computes
   `DEMO_RATES[(DEMO_RATES.indexOf(rate) + 1) % DEMO_RATES.length]`. Label `{rate}×`
   (multiplication sign, as REPLAY); the accessibility label keeps the ASCII `x`. Unchanged
   from the first version of this brief.
2. **Pause state = the existing `running` flag + the existing `timer` ref; `DemoClockAnchor`
   is not extended.** REPLAY keeps `playing` inside its anchor because its anchor is React
   state driving a `useEffect` tick. Demo's anchor is a ref and its tick is imperative, and
   Demo already has the two things REPLAY's `playing` exists for: `running` (render side —
   map `liveState`, gate buzz; exactly REPLAY's `anchor.playing` uses) and `timer.current`
   (imperative side — "is the clock advancing"; always `null` exactly when `running` is
   `false`, see Current state line 151). So: **paused ⇔ `timer.current === null` while
   `phase === 'running'`**; the button glyph renders from `running`. No new `useState`, no
   model change. **Invariant while paused: `anchorRef.current.simS` IS the demo clock and
   `wallMs` is meaningless.** Everything that moves the clock while paused (scrub, rate
   change) writes `simS` and leaves the tick alone; resume re-stamps `wallMs = Date.now()`.
   Consequence: `onPickRate` must not call `reanchorDemo` on a paused anchor (it reads the
   wall clock and would add the paused wall-time × new rate to the clock) — while paused it
   only swaps `rate`.
3. **One completion path, `endRun`, no `phase` guard, guarded by `endedRef` instead.** The
   old `onSkip` (`skipDemoAnchor` → `clearTimer` → `setRunning(false)` → `setClockS(endS)`
   → `enterEnding()`) is kept as the shared helper, renamed `endRun`, its `phase !== 'running'`
   guard dropped (it would read a stale closure from the tick — Current state, the note
   under lines 300–363) and `skippingRef` renamed `endedRef`. The tick's inlined end branch
   becomes a call to `endRun()`; the scrub bar's release-at-the-end calls it too. `endedRef`
   is what makes the tick-vs-release race harmless (whichever runs second returns at once);
   `start()` re-arms it. `restart()` does not need to — in the running phase it is always
   `false` (the only `true`-setter leaves the phase).
4. **Scrub bar = REPLAY's mechanics on the demo's anchor, by value.** `PanResponder` created
   once in a `useRef`, latest closures through a `scrubRef`. Grant: `pauseRun()` (Decision
   2's freeze) and remember the frozen clock as the drag origin. Move:
   `next = clampDemoClockS(origin + gs.dx * rate * DEMO_SCRUB_S_PER_DP_PER_RATE, endS)`,
   written to `anchorRef.current.simS` and `clockS`. **The gain constant and the clamp are
   local to `DemoScreen.tsx`** (`DEMO_SCRUB_S_PER_DP_PER_RATE = 0.4`, same value as
   `replayModel.SCRUB_S_PER_DP_PER_RATE`; `clampDemoClockS` = `Math.min(Math.max(v, 0), endS)`)
   because this brief must not import from REPLAY (Decision 9) and must not edit
   `demoModel.ts` (rules). A `demoModel.ts` home + test is open question 1. The run stays
   paused after the finger lifts, as REPLAY — PLAY resumes.
5. **Reaching the end of the bar ends the run on release, not mid-drag.** Nathan: "only
   continue to the next animation when the slider gets all the way to the end". Demo adds
   `onPanResponderRelease` and `onPanResponderTerminate` (REPLAY has neither — REPLAY's
   end is inert): if the frozen clock is `>= endS` when the finger lifts → `endRun()`. Not
   on move, because `endRun` unmounts the running JSX (the responder's own view) and because
   release lets a rider who overshot drag back before committing. Terminate is handled the
   same way so a gesture the system steals at the right edge still ends the run rather than
   leaving it paused at `endS`.
6. **STOP button removed; abandoning a run is the hardware back button, unchanged.**
   `onStop` (its `demoStopOutcome` rule: ending after enough gates, chooser otherwise) and
   the back effect that calls it are not edited. Nathan's reasoning: back + reaching the end
   (by play or by scrub) covers every exit. There is no on-screen way to abandon a run
   without reaching its end; open question 3 records that as the one behaviour lost.
7. **PLAY / PAUSE = REPLAY's `togglePlay`, minus its `isOver` branch; long-press = REPLAY's
   `restart()`.** `togglePlay`: if ticking → `pauseRun()`; else re-stamp `wallMs`,
   `setRunning(true)`, `startTick()`. REPLAY's third branch (over → restart from 0) has no
   Demo equivalent: reaching `endS` always leaves the running phase, so a paused Demo run is
   never "over". `restart()`: anchor `{ simS: 0, wallMs: now, rate }`, `prevGates = 0`,
   `setTrail([])` (FIRST RIDE's trail, as `start()` does), `setClockS(0)`, `setRunning(true)`,
   `startTick()`. It keeps the map mounted (`runSeq` is for the idle → running remount bug
   only, line 162–170's comment). Both are plain functions in the component body, as
   REPLAY's — not `useCallback`s; only the scrub responder needs the ref indirection.
8. **`startTick()` is split out of `start()`** so `start`, `togglePlay` (resume) and
   `restart` share the one interval body. `start()` keeps everything else it does today,
   including its per-run resets, `runSeq`, and the session-rate comment.
9. **Glyphs drawn locally, not imported.** `PlayIcon` / `PauseIcon` equivalents
   (`DemoPlayIcon`, `DemoPauseIcon`) live in `DemoScreen.tsx` at module scope with their
   own `iconStyles`, the same literals as `replayIcons.tsx`. One file, REPLAY read-only, no
   shared component (rules). Glyph colour `t.text`, as REPLAY.
10. **Layout is REPLAY's `ctlRow` verbatim:** `[dial 44] [scrubWrap flex: 1] [ctlBtn 44]`,
    `gap: 10`, `hitSlop={8}` on both buttons. The scrub bar has no accessibility label (REPLAY
    has none). `progressPct` computed as REPLAY does (`endS` is always > 0 here, so the guard
    is dropped).
11. **The STOP sub-line goes** ('end the demo ride' / 'skips the demo · nothing is
    recorded'); the "demo · nothing is recorded" status line directly above already carries
    the part that matters.
12. **Timer `clockSize={56}`**, the same literal REPLAY passes. FIRST RIDE renders a
    `trackLine` instead of the pane (476) — untouched.
13. **Tokens unchanged:** dial border/text `t.accent`, scrub fill/knob `t.accent`, track
    `t.race.card`, button border `colors.amber`, backgrounds `t.race.card`, glyphs `t.text`.
14. **The freed height needs no layout edit** (Current state, map container). Not touched.
15. **Style removals:** `stopSlim`, `stopSlimText`, `stopSlimSub`, `demoCtl` (+ comment).
    `pill*` stay (idle chooser). Additions: `ctlRow`, `dial`, `dialText`, `scrubWrap`,
    `scrubTrack`, `scrubFill`, `scrubKnob`, `ctlBtn` — REPLAY's eight, by value.
16. **Gate buzz while scrubbing: none.** The buzz effect is guarded by `running`, which is
    `false` from the first touch — scrubbing across five gates does not buzz five times;
    the next gate crossed *after* PLAY does. That falls out of Decision 2, no extra code.

## Files to touch

### 1. `app/src/ui/DemoScreen.tsx`

**Edit A — header comment, line 39.**

```
 * top, the shared LiveSectorPane, a status line, STOP. The scripted clock
```

→

```
 * top, the shared LiveSectorPane, a status line, REPLAY's control row (speed
 * dial · scrub bar · play/pause — virgin-cycle16 brief 07). The scripted clock
```

**Edit B — `PanResponder` import, line 63.**

```tsx
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
```

→

```tsx
import { BackHandler, PanResponder, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
```

**Edit C — the two glyphs.** Directly after line 117 `import { positionAtTime } from
'./wayMapMath';` and its blank line 118, and before line 119 `// WP-E: the scripted lap is
DemoScreen's own frozen fixture`, insert (keep one blank line on each side):

```tsx
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
```

(`iconStyles` is declared below the components that use it, exactly as `replayIcons.tsx`
does; it is only read at render time, after module evaluation, so this is not a TDZ issue.)

**Edit D — scrub constants, after line 126.** Directly after

```tsx
const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so the rate is exact
```

insert:

```tsx
// virgin-cycle16 07: scrub-bar gain, dp → sim-seconds per unit rate — the
// same value as replayModel.SCRUB_S_PER_DP_PER_RATE (cycle15 brief 08
// decision 4), by value: this file never imports from REPLAY. On a ~240 dp
// bar one full-width swipe moves rate × 96 sim-seconds (8 min at 5x, 40 min
// at 25x) against a run of about 15 min (demoRunEndS).
const DEMO_SCRUB_S_PER_DP_PER_RATE = 0.4;
/** Clamp a demo clock value to [0, endS] (replayModel.clampClockS, by value). */
const clampDemoClockS = (v: number, endS: number): number => Math.min(Math.max(v, 0), endS);
```

**Edit E — `endedRef`, line 161.**

```tsx
  const skippingRef = useRef(false);
```

→

```tsx
  // virgin-cycle16 07: endRun's once-only latch (tick vs scrub-release race).
  const endedRef = useRef(false);
```

**Edit F — the run's clock machinery, lines 300–363.** Replace the whole region quoted in
Current state — from `  const start = () => {` (300) through `  }, [phase, script, enterEnding]);`
(363, the end of `onSkip`) — with:

```tsx
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
```

Line 364 (blank) and 365 `  // Switching mode stops any run in progress and resets every piece of`
stay. Nothing above line 300 or below 363 changes in this edit — in particular `onStop`
(293–297) and `enterEnding` / `exitToIdle` are untouched.

(`DEMO_RATES` is `readonly [5, 15, 25]`, so `DEMO_RATES[number]` is `DemoRate` and
`onPickRate`'s parameter type is satisfied without a cast. `{ ...anchorRef.current, rate: r }`
is a `DemoClockAnchor`. `gs` is React Native's `PanResponderGestureState`; only `dx` is
read. `setClockS` is a state setter and `anchorRef` a ref — both stable, safe inside the
once-created responder.)

**Edit G — `progressPct`, lines 457–458.**

```tsx
  if (phase === 'running') {
    return (
```

→

```tsx
  if (phase === 'running') {
    const progressPct = 100 * Math.min(Math.max(clockS / endS, 0), 1);
    return (
```

**Edit H — timer, line 477.**

```tsx
          : <LiveSectorPane vm={vm} showLap />}
```

→

```tsx
          : <LiveSectorPane vm={vm} showLap clockSize={56} />}
```

**Edit I — the control row, lines 479–506.** Replace the whole block quoted in Current
state — from the `{/* virgin-cycle15 brief 03: speed pills` comment (479) through the
`</Pressable>` that closes STOP (506) — with:

```tsx
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
```

Line 507 `      </View>` (closing `raceColumn`), 508 `    );` and 509 `  }` stay. Lines
459–478 (the column, map container, pane/trackLine, status line) are untouched apart from
Edit H.

**Edit J — styles, lines 657–673.** Replace the block quoted in Current state (from
`  stopSlim: {` through `  demoCtl: { gap: 8, marginTop: 8 },`) with:

```tsx
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
```

Line 674 `});` stays. `pillRow` … `pillTextSelected` (lines 629–636) are **not** touched.

That is the whole brief: one file, ten edits (A–J).

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL (nothing here is
under test; the run is the regression guard, and `virginmanifest_suite` re-reads
`DemoScreen.tsx`; `demo_suite` re-checks the untouched `demoModel.ts` anchor functions).
`./node_modules/.bin/tsc --noEmit` → exit 0. Likely complaints, if any:

- `onPickRate(DEMO_RATES[(i + 1) % DEMO_RATES.length])` rejected ("not assignable to
  parameter of type 'DemoRate'") — report verbatim and stop, do not cast.
- `{ ...anchorRef.current, rate: r }` rejected — report verbatim, do not cast.
- `gs` implicitly `any` — report verbatim; do not annotate by guessing a type name.
- `demoStopOutcome`, `gatesDone`, `Text`, `skipDemoAnchor`, `reanchorDemo`, `demoSimSAt`,
  `demoRunEndS`, `DEMO_RATES` reported unused — they are all still used. Report, don't remove.

Then, in `app/src/ui/DemoScreen.tsx`:

- `grep -n "stopSlim\|demoCtl\|skippingRef" app/src/ui/DemoScreen.tsx` → **no hits**.
- `grep -n "const onSkip\|onPress={onSkip}\|onPress={onStop}" app/src/ui/DemoScreen.tsx` → **no hits**
  (the two `onSkip={onDemoNamingSkip}` props at ~549/562 are a different `onSkip` and
  are expected to remain).
- `grep -n "onStop" app/src/ui/DemoScreen.tsx` → exactly **three** hits: its `const onStop =`
  definition, the back-handler call `{ onStop(); return true; }`, and the effect deps
  `[phase, onStop, exitToIdle]`.
- `grep -n "DEMO_RATES.map" app/src/ui/DemoScreen.tsx` → **no hits** (pills gone from the
  running phase).
- `grep -n "styles\.pill" app/src/ui/DemoScreen.tsx` → exactly **six** hits, all inside the
  idle chooser (each line number > 600 after the insertions).
- `grep -n "clockSize={56}" app/src/ui/DemoScreen.tsx` → exactly **one** hit.
- `grep -n "endedRef" app/src/ui/DemoScreen.tsx` → exactly **four** hits (declaration, the
  guard and the set in `endRun`, the reset in `start`).
- `grep -n "endRun" app/src/ui/DemoScreen.tsx` → exactly **seven** hits: the `const endRun`
  definition, the call in `startTick`, the `useRef({ pauseRun, endRun, endS })` line, the
  `scrubRef.current = { … }` line, the release call, the terminate call — plus comment
  mentions; count the code hits only.
- `grep -n "pauseRun" app/src/ui/DemoScreen.tsx` → code hits: definition, `togglePlay`,
  the two `scrubRef` lines, the grant call = **five** (plus comments).
- `grep -n "startTick" app/src/ui/DemoScreen.tsx` → code hits: definition, `start`,
  `togglePlay`, `restart` = **four** (plus comments).
- `grep -n "PanResponder" app/src/ui/DemoScreen.tsx` → exactly **two** hits (import, `create`).
- `grep -n "DEMO_SCRUB_S_PER_DP_PER_RATE\|clampDemoClockS" app/src/ui/DemoScreen.tsx` →
  **four** hits (two definitions, two uses in the move handler).
- `grep -n "cycleRate" app/src/ui/DemoScreen.tsx` → exactly **two** hits (definition, the dial).
- `grep -n "DemoPlayIcon\|DemoPauseIcon" app/src/ui/DemoScreen.tsx` → **four** hits (two
  definitions, two uses).
- `grep -n "styles\.ctlRow\|styles\.dial\b\|styles\.dialText\|styles\.scrub\|styles\.ctlBtn" app/src/ui/DemoScreen.tsx`
  → **eight** hits (ctlRow 1, dial 1, dialText 1, scrubWrap/Track/Fill/Knob 4, ctlBtn 1).
- `grep -n "demoRunEndS(" app/src/ui/DemoScreen.tsx` → exactly **one** hit (`const endS =`).
- `grep -n "ways.json\|'Morning'" app/src/ui/DemoScreen.tsx` → **no hits** (the
  `virginmanifest_suite` assertions).
- `grep -n "from './replayIcons\|from './replayModel\|from './ReplayScreen" app/src/ui/DemoScreen.tsx`
  → **no hits** (nothing imported from REPLAY).
- `GIT_OPTIONAL_LOCKS=0 git diff --stat` → exactly one file changed.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/ReplayScreen.tsx app/src/ui/replayIcons.tsx app/src/ui/replayModel.ts app/src/ui/demoModel.ts`
  → **empty** (REPLAY and the demo model untouched).

## On-device checklist (Nathan, after publish)

1. DEMO tab, TENTH RIDE, RUN DEMO RIDE. Under the map: the lap clock is visibly smaller
   (REPLAY-sized), then "demo · nothing is recorded", then **one row that looks exactly
   like REPLAY's**: a round yellow-ring button reading **25×** on the left, a thin track
   with a yellow fill and knob creeping right, and an amber-ring square button with a
   pause glyph (‖) on the right. No pills, no SKIP, no STOP. The map is clearly taller than
   before (roughly the height of the two old buttons plus the pill row).
2. Tap the round button: 25× → 5× → 15× → 25× → … The dot's speed follows each tap with
   no jump, pause or restart (exactly as the pills did). The next run starts at the last
   rate picked (session rate kept, as before).
3. Tap ‖: the dot, the lap clock and the knob freeze; the glyph becomes ▶; the map unlocks
   (pan/zoom, as REPLAY paused). Tap the dial while paused: the rate label changes, the
   clock does not move. Tap ▶: everything resumes from where it froze at the new rate — no
   jump forward for the time spent paused.
4. Drag the knob while playing: the run pauses on touch (glyph → ▶) and the clock follows
   the finger — right = forward, left = back; the dot, sector colours, self dots and the
   pane's gate rows follow the clock, and the sectors already crossed re-colour as the
   clock passes their gates again. Lift the finger anywhere before the right edge: still
   paused, knob where left; ▶ resumes from there. No gate buzz while scrubbing (buzz
   resumes on the first gate crossed after ▶).
5. Drag the knob all the way to the right edge and lift: lands on the ending screen
   (reveal, naming card, RESULTS-style plot) — the same place SKIP ▸ RESULTS went. Drag to
   the edge, drag back a little, lift: still running-paused, not ended.
6. Let a run play out to its natural end: ending screen as before.
7. Long-press ▶/‖: the clock goes back to 0:00 and plays, same rate; the map stays where it
   is (no reload flash).
8. Hardware back during a run (playing or paused): same behaviour as the old STOP button —
   ending screen once enough gates are passed, straight back to the chooser otherwise.
9. SECOND RIDE and FIRST RIDE: same row. FIRST RIDE shows its status/clock text line
   instead of the pane; its dot trail grows while playing, and long-press restart clears it.
10. Idle chooser: FIRST / SECOND / TENTH RIDE pills and RUN DEMO RIDE look exactly as before.
11. REPLAY screen: unchanged.
12. Night and day themes: the ▶ / ‖ glyphs are readable on the card background in both
    (same ink `t.text` REPLAY's use); dial text, fill and knob are yellow on both.

## Out of scope

- Extracting a shared control-row, scrub, dial or icon component used by both REPLAY and DEMO.
- Any change to REPLAY (screen, icons, model, styles) or to `demoModel.ts` (open question 1).
- An on-screen STOP / abandon control (Decision 6; open question 3).
- The idle chooser's pills, the ending screen, the `GateAdjustCard` / `RouteNamingCard`
  flows, FIRST RIDE's status line, the trail's behaviour when scrubbed backwards (open
  question 4).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships to the Preview APK over
EAS Update via `scripts/publish-preview.cmd` — no new numbered build. Visible, on the DEMO
tab while a demo ride runs: the three speed pills and the two big SKIP ▸ RESULTS / STOP
buttons are replaced by REPLAY's control row — a round speed dial that cycles 5× / 15× /
25× on tap, a scrub bar you can drag (first touch pauses), and a play/pause button with
long-press restart. The demo can now be paused, resumed, scrubbed and restarted; it ends
into the results screen when the clock reaches the end, whether by playing or by dragging
the knob to the right edge. The lap clock is smaller and the map gets roughly 180 dp
taller. The hardware back button still abandons a run as STOP did. The chooser screen, the
ending screen and the REPLAY screen look and behave exactly as today.

## Open questions / assumptions (logged, not blocking)

1. **Scrub arithmetic lives inline in the screen** (Decision 4): `DEMO_SCRUB_S_PER_DP_PER_RATE`
   and `clampDemoClockS` are module-level literals in `DemoScreen.tsx`, and the rate cycling
   is three lines in `cycleRate`. The REPLAY-faithful placement is `demoModel.ts`
   (`demoScrubDeltaS`, `clampDemoClockS`, `nextDemoRate`) with `demo_suite` tests, but that
   is a second file and a test — a follow-up chore if the coordinator wants symmetry.
2. **Scrub gain** is REPLAY's 0.4 by value. The demo run is ≈ 896 sim-seconds; a full-width
   swipe moves ≈ 480 s at 5× (about half the run), ≈ 1440 s at 15× and ≈ 2400 s at 25×
   (both more than the whole run) — coarse at 25×. Nathan tunes on device; one literal.
3. **No on-screen way to abandon a run before its end** (Decision 6). The hardware back
   button keeps `onStop`'s rule. If Nathan finds himself wanting an escape on screen, the
   cheapest is REPLAY's own `‹ BACK` text line under the row (`ReplayScreen.tsx:278-280`)
   calling `onStop` — one `Pressable`, no new style beyond REPLAY's `backText`.
4. **FIRST RIDE's trail under scrubbing.** The trail effect appends a point on every
   `clockS` change, so scrubbing backwards draws the trail back over itself (visually a
   thicker line, no gap). Restart clears it (Decision 7). Not worth a trail-model change for
   a demo; noted.
5. **Pausing inside the ≤ 33 ms window past `endS`** parks the clock at exactly `endS`
   (pauseRun's clamp) with the knob at the right edge and ▶ showing; ▶ (or a scrub
   touch-and-release) then ends the run. Self-healing, no special case.
6. **`onPanResponderTerminate` ends the run at the edge** like release does (Decision 5). If
   a stolen gesture at the right edge should instead leave the run paused at `endS`, drop
   that one handler.
7. **≈180 dp to the map** is arithmetic from style literals, not a measurement.
