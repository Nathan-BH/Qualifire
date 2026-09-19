# BRIEF A — DEMO tab: RUN DEMO RIDE goes full-screen, mirrors the race screen, ends like a ride

**Written 2026-09-19 UTC (Plan tier, fable). Brief 1 of 3 for the DEMO tab overhaul —
build order A → B → C.** This brief lands first; `BRIEF-demo-tenth-ride-reveal.md` (B) and
`BRIEF-demo-self-dots.md` (C) both extend the file shapes this brief creates and must not
start until this one is committed.

Nathan's ask, unedited (two messages, 2026-09-19): *"1) i want to have a proper view of what
this would look like so i want to be able to see this on the DEMO tab? For that i want some
updates made to the DEMO tab 2) i want that when you press 'RUN DEMO RIDE' it takes you full
screen to a representation of how the current race screen is. With everything properly
sized; instead of now having it crammed because of the FIRST RIDE&SECOND RIDE options + the
tab banner below. This way i can test for all types of test rides how it would look like
visually + test the post ride animation — for the FIRST RIDE, it should show me the post ride
screen for saving the routes and let me fill it in +save (just for show, does not actually
save anything but useful for testing it ourt) — for SECOND RIDE or TENTH RIDE option, let me
see the end ranking animation like it would normally be 3) add a third DEMO option which is
TENTH ride, so i can see the ranking tower animation properly. 4) i also think for the SECOND
RIDE/ TENTH RIDE demos i want to see the self dots racing alongside so i can see how that
works visually as well. make briefd for each task in the same cycle folder and implement it
all"*

Items 1 and 2 are one change (2 is the concrete spec of 1) and are this brief, together with
the FIRST RIDE ending. Item 3 (TENTH RIDE + the ranking reveal for SECOND/TENTH) is brief B.
Item 4 (self dots) is brief C.

Anchors below were read from the live `virgin` working tree at HEAD `411aba9` on
2026-09-19, via `cycles/virgin-cycle11/DIGEST-demo-tab-overhaul.md` plus direct re-reads of
`ui/DemoScreen.tsx` (241 lines), `ui/demoModel.ts` (73), `App.tsx`, `ui/RecordScreen.tsx`
(running/ending blocks + styles), `ui/routeNamingCard.tsx`, `ui/launchAnimation.tsx`,
`ui/liveView.tsx`, `ui/sectorTrailModel.ts`, `tests/demo_suite.ts`, `tests/run.ts`. **Where the
digest's line numbers and the tree disagreed (the digest's DemoScreen numbering is off by
~15–25 lines), the tree's numbers are used here.** The executor records `git rev-parse HEAD`
and `git status --short` at start and re-reads every anchored line before touching it.
Executor: Sonnet, stop-on-ambiguity — any anchor that does not match, any call this brief
leaves open, any place where a component's props or the React tree turn out to be shaped
differently than described here: STOP, report the file, the line, and what is actually
there. Never guess, never rule on it from the coordinator's chat — it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — Full-screen is the sixth instance of "screen owns intent, Shell owns chrome"

`App.tsx` already hides the tab bar in five cases (`tabBarHidden`, `App.tsx:172–173`): the
RECORD tab while `RecordScreen` reports itself fullscreen (`recFullscreen`, set through the
`onFullscreenChange` prop, `App.tsx:208`), and the four mount-swapped overlays (ride detail,
gate editor, catalog detail, results detail). DEMO gets **exactly RecordScreen's mechanism,
not the overlay one**: `DemoScreen` takes an optional `onFullscreenChange?: (fs: boolean) =>
void` prop and reports `true` whenever it is not on its idle chooser; Shell keeps a
`demoFullscreen` bit and adds `(tab === 'demo' && demoFullscreen)` to `tabBarHidden`. No
`tabNav` method, no request object, no new overlay screen — the demo run is a *phase of the
DEMO tab*, like a recording is a phase of the RECORD tab. Why not `openX`/`closeX`: those
overlays render *over any tab* and are addressed from elsewhere; nothing outside the DEMO tab
ever opens the demo run. Same reasoning WP-A2 used for RECORD.

Hardware back while full-screen: DemoScreen registers its own `BackHandler` listener (as
`RecordScreen.tsx:434–447` does — a screen's listener is mounted after Shell's and therefore
runs first) and treats back exactly like the STOP button (R4): skip to idle before the line,
end the ride after it. It never falls through to Shell while the demo is not idle.

### R2 — The idle DEMO screen becomes a chooser; the run mirrors the real running column

Nathan's complaint is that the map and pane are "crammed" between the pill row and the tab
bar. Ruling: **the inline map and pane leave the idle screen entirely.** Idle = header
("DEMO RIDE" / "Nothing is recorded."), the mode pills, one short line describing what the
selected mode will show, and RUN DEMO RIDE. The map lives only in the run.

The run renders the same column the real 'running' phase does (`RecordScreen.tsx:1191–1315`),
with the same styles copied by value (`raceColumn`, `trackLine`, `stopSlim`, `stopSlimText`,
`stopSlimSub` — `RecordScreen.tsx:1554–1557, 1611–1618, 1670–1686`; copy, do not import —
those are `makeStyles`-local and RecordScreen is on the do-not-touch list):

1. **Map, top, `flex: 1, minHeight: 220`** — `WayMapView` with `variant="live"`, `fill`,
   `zoom={4}`, `liveState` `'moving'` while the clock runs and `'finished'` once it stops
   (R3). Not `variant="browse"` any more: the point is to see the locked, course-up race crop
   the rider sees. Course-up bearing comes from successive `lat`/`lon` props
   (`wayMapView.tsx:400–423`), which the scripted dot provides. `settings.liveMap` off → the
   same `<View style={{ flex: 1 }} />` spacer as the real screen.
2. **`LiveSectorPane`** with the demo's hand-built view model (R5), `showLap`.
3. **Status line** (`trackLine` style): SECOND RIDE `'demo · nothing is recorded'`; FIRST RIDE
   the existing `FIRST_RIDE_STATUS` text. One static line — the real screen's 6-second
   rotating status has nothing to rotate here.
4. **STOP** (R4) in the slot the real screen gives PAUSE, `stopSlim` look (amber border).

Sector-span colours on the map, sector-strip colours, self dots (brief C) and the live map
itself all follow the **same SETTINGS toggles the real screen reads**: `settings.liveMap`
(already), and now `settings.sectorColours` — ON passes the demo's earned-span array, OFF
passes `ALL_YELLOW` (`sectorTrailModel.ts:41`, the empty-but-truthy array the real screen
passes so the sector-spans source still mounts under the rider dot, `RecordScreen.tsx:879–890`).
Reason: Nathan's words are "a representation of how the current race screen is"; since
virgin-cycle9 that screen ships with map colouring OFF, and a demo that forces it on would
show him a screen no rider gets. The strip keeps its colours either way, so the tier verdicts
are still visible. If he wants the demo to force map colours on, it is the one ternary in
Task 3 step 6 (named in `QUESTIONSFORNATHAN.md`).

### R3 — The scripted ride does not stop at the line; it rolls out, then auto-STOPs

Today the demo clock freezes the instant `next >= script.lap` (`DemoScreen.tsx:117–122`). A
real ride does not: the rider crosses the FINISH gate, the lap chip appears, and they roll on
until they actually press STOP — which is exactly the moment cycle11 moved the reveal to.
Ruling: the sim clock keeps running past the lap for `DEMO_ROLL_OUT_S = 60` simulated seconds
(≈ 2.4 real seconds at 25×; a constant in `demoModel.ts`), long enough to read the neutral lap
chip and — brief C — for every slower self to finish; then the run **auto-STOPs** into the
'ending' phase (R6). Nathan can press STOP himself at any point after the final gate and get
the same ending; the auto-stop only makes the whole demo hands-free, RUN → reveal → back.
The rider dot itself stays parked at FINISH during the roll-out (`positionAtTime` clamps at
the last gate, `wayMapMath.ts` — confirm by reading; if it does not clamp, STOP and report).

### R4 — STOP before the line skips; STOP after the line ends the ride

One button, `stopSlim` look, text `STOP`. Sub-label before the final gate: `skips the demo ·
nothing is recorded`; after it: `end the demo ride`. Behaviour:

- `gatesDone < 4` → **skip**: clear the timer, reset every piece of run state, back to idle.
  No ending ceremony — an aborted demo has nothing to show, and this is the "get me out"
  affordance the full-screen mode needs.
- `gatesDone >= 4` → **end**: the 'ending' phase (R6), identical to what the auto-STOP does.

No PAUSE/RESUME/Discard menu: those exist for a real recording that keeps running underneath
(D-042); a demo has nothing to protect. The pure rule (`demoStopOutcome`) lives in
`demoModel.ts` so it is tested headless (Task 5).

### R5 — The lap chip is neutral before STOP, exactly as the real screen since virgin-cycle11

`DemoScreen.tsx:151–153` still builds the lap chip with `tierOf(0, script.lap)` — the tier
colour at the final gate. That is the pre-cycle11 behaviour; the real screen now passes
`tierOfLive`, which maps sector index 0 (the whole lap) to `'neutral'` (cycle11 R1,
`RecordScreen.tsx` under `tierOf`), so the rank is never spoiled before STOP. Nathan wants to
"test the post ride animation" here, so the demo must show the same sequence: **lap chip
`tier: 'neutral'` at the final gate; the tier appears only in the ending's reveal (brief B)**.
Sectors keep their tiers (they are sector verdicts, cycle9's own design). `posChip: null`
stays. The view model moves into `demoModel.ts` as a pure function so this rule is a test,
not a comment (Task 2).

### R6 — The 'ending' phase: "Ride saved." + what the real screen would show next

On STOP-after-the-line (or the auto-STOP) the run column is replaced by an ending column
mirroring `RecordScreen.tsx:1111–1183`: a `ScrollView` column (`raceColumn`), a `trackLine`
headline, then the card, with the reversed `LaunchAnimation` as an absolute-fill sibling for
the exit. In this brief:

- **FIRST RIDE** → headline `Ride saved — <m:ss>.` (the sim clock at STOP — the real line
  prints the whole-recording elapsed and there is no reveal on ride 1, cycle11 R4), then the
  real `RouteNamingCard` (R7) mounted immediately.
- **SECOND RIDE** → headline `Ride saved.` and a slim `DONE` bar (`stopSlim` look, sub `back
  to the demo`). This is a placeholder shape only: brief B mounts the `TimingTower` above it
  and delays the bar until the reveal has played, mirroring the real screen's "card beneath
  the board after the hold".
- Exit from either: the reversed `LaunchAnimation` plays (same component, same `reverse`
  prop, `RecordScreen.tsx:1160–1181`), and its `onDone` returns the tab to idle (which also
  reports `onFullscreenChange(false)` through the effect, bringing the tab bar back). The
  real app opens the ride detail here; the demo has no ride, so it ends at the chooser.

### R7 — FIRST RIDE's naming card: the cold-start variant, and SAVE is theatre

The card is the real `RouteNamingCard` (`ui/routeNamingCard.tsx:27–56`), dumb by design ("it
owns only the two text inputs and the spec segments"), fed the **both-endpoints-unknown**
case — the one a stranger's very first ride produces and the only one FIRST RIDE claims to
be ("no known route here"):

```
startExistingLabel={null} endExistingLabel={null} loop={false} busy={busy}
matchedWayLabel={null} existingRoute={null} vocabulary={[]}
onSave={onDemoNamingSave} onSkip={onDemoNamingSkip}
```

- **SKIP** → reverse mark → idle. (Real: `setNaming(null); setShowAnim('rev')`,
  `RecordScreen.tsx` `onNamingSkip`.)
- **SAVE** → `busy` true for `DEMO_FAKE_SAVE_MS = 600` (the card's button dims exactly as a
  real save does), then the card is replaced by one confirmation line in the `trackLine`
  style — `demoSavedLine(names)` = `` `${start} → ${end} created · demo only, nothing saved` ``
  — held for `DEMO_SAVED_HOLD_MS = 1800`, then the reverse mark → idle. **Nothing is
  written**: no `createRouteFromDraft`, no `saveUserCatalog`, no store import of any kind in
  `DemoScreen.tsx` — the file header's rule ("Nothing here writes to storage and nothing here
  is a ride") stands and Task 3 ends with a grep proving it.
- Not built here: the real save's continuation into the gate-adjust card (`out.adjust`) —
  it needs a real `RefLine`; logged for Nathan in `QUESTIONSFORNATHAN.md`.

### R8 — Naming

`DemoPhase = 'idle' | 'running' | 'ending'` (state within the DEMO tab, never a `RecordPhase`);
`DEMO_ROLL_OUT_S`, `demoRunEndS`, `demoStopOutcome`, `demoLiveViewModel`, `demoSavedLine`,
`DEMO_FAKE_SAVE_MS`, `DEMO_SAVED_HOLD_MS` in `demoModel.ts`; `demoFullscreen` /
`setDemoFullscreen` in `App.tsx`. The demo's fake ride id for today stays `'demo:first-ride'`
/ `DEMO_WAY_ID` as today; brief B adds `DEMO_TODAY_RIDE_ID`.

### R9 — Docs in the same commit

`STATE.md` (Known-stubs DEMO bullet, "Where the app actually is", cycle pointer, test line),
`GLOSSARY.md` (new **DEMO tab** entry), `OPEN-ITEMS.md` (on-device look). Small anchored
edits, same commit as the code (cycle6 R8 / cycle11 R8).

### R10 — Out of scope (do not build, do not ask)

TENTH RIDE, the timing tower / ranking reveal in the demo, `RankingReveal` or `RideResult`
synthesis (brief B); self dots, `SelfTrack` synthesis, `livePos` (brief C); a gate-adjust
card in the demo; a forward launch mark on RUN (the demo has no 'armed' phase); PAUSE /
RESUME / Discard; a rotating status line; any change to `RecordScreen.tsx`, `liveView.tsx`,
`routeNamingCard.tsx`, `wayMapView.tsx`, `tower.tsx`, `launchAnimation.tsx`, `tabNav.tsx`,
`app/src/store/**`, `app/core/**`; the PNG rung; `demoWayFixture.ts`'s geometry.

---

## 1. Rules

- Touch only: `app/App.tsx` (one state line, one `tabBarHidden` term, one prop on the
  `<DemoScreen />` mount — nothing else), `app/src/ui/DemoScreen.tsx`,
  `app/src/ui/demoModel.ts`, `app/tests/demo_suite.ts`, `STATE.md`, `GLOSSARY.md`,
  `OPEN-ITEMS.md`, and this cycle folder.
- Never edit `IDEAS.md`, `CLAUDE.md`, `Nathan/`, anything under `cycles/virgin-cycle1..10/`,
  `app/core/`, `app/src/store/**`, `app/src/ui/RecordScreen.tsx`, `app/src/ui/liveView.tsx`,
  `app/src/ui/routeNamingCard.tsx`, `app/src/ui/wayMapView.tsx`, `app/src/ui/tower.tsx`,
  `app/src/ui/rankingRevealModel.ts`, `app/src/ui/selfRaceModel.ts`,
  `app/src/ui/launchAnimation.tsx`, `app/src/ui/tabNav.tsx`, `app/src/ui/demoWayFixture.ts`,
  `app/tests/run.ts` (the demo suite is already registered at line 46). If a task below seems
  to need one of these, STOP and report why.
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name, never `-A`/`.`.
  Every git command with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- `git status --short` at start: untracked `cycles/virgin-cycle11/DIGEST-demo-tab-overhaul.md`,
  the three `BRIEF-demo-*.md` files and `QUESTIONSFORNATHAN.md` are expected. Any
  *modification* already present in a file this brief touches → STOP and report it.
- `demoModel.ts` stays the house pattern (its own header, `sectorTrailModel.ts` /
  `towerModel.ts`): **pure, no React, no expo, no react-native imports**, headless-testable,
  `import type` for anything from a `.tsx` (`towerModel.ts:22–23` is the precedent for
  importing a `.tsx` type into a pure module).
- `DemoScreen.tsx` must not import anything from `app/src/store/**` or `app/src/storage/**`.
  Task 3 ends with the grep.
- Stop-on-ambiguity applies to every "confirm" step below. Report verbatim.
- Nothing is done because it compiles. Each task ends with the check that proves it.

Confirm these before Task 1 and quote them in the report:

1. `app/App.tsx:72` is `const [recFullscreen, setRecFullscreen] = useState(false);`;
   `:172–173` is `const tabBarHidden = (tab === 'record' && recFullscreen)` / `|| rideDetail
   !== null || gateAdjust !== null || catalogDetail !== null || resultsDetail !== null;`;
   `:208` mounts `<RecordScreen onFullscreenChange={setRecFullscreen} />` and `:213` mounts
   `<DemoScreen />`.
2. `app/src/ui/DemoScreen.tsx:64` is `export default function DemoScreen() {`; `:105–126` is
   `start()` with the `if (next >= script.lap)` freeze at `:117`; `:145–161` builds `vm`
   with `lap: gatesDone >= 4 ? { tier: tierOf(0, script.lap), … }` at `:151–153`; `:169–216`
   is the `ScrollView` return with the pill row at `:174–187` and the RUN button at
   `:211–213`.
3. `app/src/ui/RecordScreen.tsx:417–425` is the `onFullscreenChange?.(isFullscreen(phase) ||
   showAnim != null)` effect with the `return () => onFullscreenChange?.(false)` cleanup;
   `:434–447` is the `BackHandler.addEventListener('hardwareBackPress', …)` effect.
4. `app/src/ui/sectorTrailModel.ts:41` is `export const ALL_YELLOW: (string | null)[] = [];`.
5. `app/src/ui/routeNamingCard.tsx:27–56` is `RouteNamingCardProps` with exactly the ten
   fields quoted in R7 (`startExistingLabel`, `endExistingLabel`, `loop`, `busy`,
   `matchedWayLabel?`, `existingRoute?`, `vocabulary?`, `onSave`, `onSkip`), and
   `store/routeCreation.ts:292` is `export interface RouteNames { start: string; end: string;
   specs?: readonly string[] }`.
6. `app/src/ui/launchAnimation.tsx:55` is `export function LaunchAnimation({ onDone, reverse =
   false }: …)` and the component positions itself absolute-fill (the comment at
   `RecordScreen.tsx:1317–1320` says "absolute inset 0 with zIndex 1000" — confirm in
   `launchAnimation.tsx`'s own styles).

Any mismatch → STOP.

---

## 2. Task 1 — `App.tsx`: the `demoFullscreen` bit (three lines)

1. Under `recFullscreen` (`:72`, keep its comment), add:
   ```ts
   // virgin-cycle11 (DEMO overhaul, brief A): DemoScreen reports the same way while a
   // scripted ride runs or ends — sixth instance of "screen owns intent, Shell owns chrome".
   const [demoFullscreen, setDemoFullscreen] = useState(false);
   ```
2. `tabBarHidden` (`:172`): `(tab === 'record' && recFullscreen) || (tab === 'demo' &&
   demoFullscreen)` — the rest of the expression unchanged. Extend the comment above it
   (`:168–171`) with one clause naming the demo.
3. `:213`: `<DemoScreen onFullscreenChange={setDemoFullscreen} />`.

Nothing else in `App.tsx`. Shell's own `hardwareBackPress` handler (`:104–…`) is untouched:
DemoScreen's listener (Task 3 step 7) runs first and returns `true` while not idle.

Check: `git diff app/App.tsx` shows exactly three hunks (state, `tabBarHidden`, mount);
`tsc` will be checked after Task 3 (the prop does not exist yet).

## 3. Task 2 — `demoModel.ts`: the run rules and the pure view model

Re-read the whole file (73 lines) first. Add, keeping every existing export byte-identical:

```ts
import type { LiveViewModel } from './liveView.tsx';   // type-only, house precedent towerModel.ts:22-23
import type { Tier } from './chips.tsx';
import type { RouteNames } from '../store/routeCreation.ts';  // type-only

/** Where the DEMO tab is: the chooser, the full-screen scripted ride, or the post-STOP
 *  screen. State within the DEMO tab — never a RecordPhase. */
export type DemoPhase = 'idle' | 'running' | 'ending';

/** R3: simulated seconds the clock keeps running past the lap before the run auto-STOPs
 *  (~2.4 real s at RATE 25). Long enough to read the neutral lap chip; brief C also needs
 *  every slower self to reach its finish inside it. */
export const DEMO_ROLL_OUT_S = 60;
/** sim second at which the run auto-STOPs (R3). */
export function demoRunEndS(script: DemoScript): number { return script.lap + DEMO_ROLL_OUT_S; }

/** R4: what the STOP button (and hardware back) does. */
export type DemoStopOutcome = 'skip' | 'ending';
export function demoStopOutcome(gatesDone: number, sectorCount: number = DEMO_SECS.length): DemoStopOutcome {
  return gatesDone >= sectorCount ? 'ending' : 'skip';
}

/** R7: theatre timings for the fake save. */
export const DEMO_FAKE_SAVE_MS = 600;
export const DEMO_SAVED_HOLD_MS = 1800;
export function demoSavedLine(names: RouteNames): string {
  return `${names.start.trim()} → ${names.end.trim()} created · demo only, nothing saved`;
}

/** m:ss — lifted verbatim from DemoScreen.tsx's local fmtMS (Task 3 deletes that copy). */
export function demoFmtMS(s: number): string;

/**
 * The hand-built LiveViewModel the demo feeds to LiveSectorPane — the same pane the Record
 * screen draws, so what the demo shows IS what the rider sees. R5: the lap chip is
 * 'neutral' once the lap lands (cycle11 R1 — the tier is the rank in disguise and is
 * revealed after STOP by the tower, brief B); sectors keep their tiers; posChip null.
 * `nowMs` anchors the frozen timebase (Date.now() on the screen; fixed in tests).
 * `livePos` is brief C's; default null renders nothing.
 */
export function demoLiveViewModel(
  script: DemoScript, clockS: number, nowMs: number, livePos: string | null = null,
): LiveViewModel;
```

`demoLiveViewModel` is `DemoScreen.tsx:145–161` moved verbatim except: `lap.tier` is the
literal `'neutral'` (not `tierOf(0, …)`), `clock.anchorRealMs` is `nowMs`, `gatesDone` is
computed inside from `script.gateAt` the way `:77` does, and `demoTier(i, v) as Tier` replaces
the screen's local `tierOf`. Include `livePos` in the returned object (the field is optional
on `LiveViewModel`, `liveView.tsx:111`).

Check: `cd app && ./node_modules/.bin/tsc --noEmit` clean; `grep -n "from 'react" app/src/ui/demoModel.ts`
prints nothing.

## 4. Task 3 — `DemoScreen.tsx`: phases, the full-screen run, the ending

Re-read the whole file first (241 lines). Rewrite the component body; keep the file header
(update its first paragraph to say the demo now runs full-screen and ends like a ride —
one added paragraph, do not rewrite the history in it).

1. **Signature.** `export default function DemoScreen({ onFullscreenChange }: {
   onFullscreenChange?: (fs: boolean) => void }) {` — the same prop shape RecordScreen takes
   (`RecordScreen.tsx:141–143`).

2. **State.** Keep `mode`, `running`, `clockS`, `trail`, `timer`, `prevGates`. Add:
   ```ts
   const [phase, setPhase] = useState<DemoPhase>('idle');
   const [showAnim, setShowAnim] = useState<'rev' | null>(null);
   const [busy, setBusy] = useState(false);                          // R7 fake save
   const [saved, setSaved] = useState<RouteNames | null>(null);      // R7 confirmation line
   const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```
   `running` stays the "clock is ticking" flag (it goes false during the frozen tail of the
   run and in 'ending'); `phase` is what the screen renders.

3. **Fullscreen report** — the RecordScreen effect verbatim, with the demo's condition:
   ```ts
   useEffect(() => {
     onFullscreenChange?.(phase !== 'idle' || showAnim != null);
     return () => onFullscreenChange?.(false);
   }, [phase, showAnim, onFullscreenChange]);
   ```

4. **Run loop.** `start()` becomes: reset (`prevGates`, `clockS`, `trail`, `saved`, `busy`),
   `setPhase('running')`, `setRunning(true)`, and the interval now ends at
   `demoRunEndS(script)` instead of `script.lap`:
   ```ts
   const endS = demoRunEndS(script);
   timer.current = setInterval(() => {
     const next = ((Date.now() - startedAtMs) / 1000) * RATE;
     if (next >= endS) { clearTimer(); setRunning(false); setClockS(endS); enterEnding(); return; }
     setClockS(next);
   }, TICK_MS);
   ```
   where `clearTimer()` is the existing `if (timer.current) clearInterval(...)` pair and
   `enterEnding()` / `exitToIdle()` are `useCallback`s:
   - `enterEnding`: `clearTimer(); setRunning(false); setPhase('ending');` (brief B adds the
     reveal build here — leave a one-line comment marking the spot).
   - `exitToIdle`: `clearTimer(); if (holdRef.current) clearTimeout(holdRef.current);
     holdRef.current = null; setRunning(false); setClockS(0); prevGates.current = 0;
     setTrail([]); setSaved(null); setBusy(false); setShowAnim(null); setPhase('idle');`
   - `onStop`: `demoStopOutcome(gatesDone) === 'ending' ? enterEnding() : exitToIdle()` (R4).
   The unmount cleanup effect (`:92`) also clears `holdRef`.
   `switchMode` (`:130–138`) is only reachable from idle now; keep it, it is harmless.

5. **Trail / buzz effects.** Unchanged, except the buzz condition reads `mode !== 'first'`
   (brief B adds a third non-first mode; write it that way now so B does not touch it).

6. **View model + map colours.**
   ```ts
   const vm = demoLiveViewModel(script, clockS, Date.now());
   const sectorColours = settings.sectorColours
     ? demoSectorColours(script, gatesDone, tierLineColour)
     : ALL_YELLOW;                                   // R2: same toggle as the real screen
   ```
   Import `ALL_YELLOW` from `'./sectorTrailModel.ts'` (same import line RecordScreen uses,
   `RecordScreen.tsx:45`). Delete the local `fmtMS` and `tierOf` (both now in `demoModel.ts`).

7. **Hardware back** — RecordScreen's pattern (`:434–447`):
   ```ts
   useEffect(() => {
     const sub = BackHandler.addEventListener('hardwareBackPress', () => {
       if (phase === 'idle') return false;          // Shell handles it (other tab → RECORD)
       if (phase === 'running') { onStop(); return true; }
       exitToIdle(); return true;                   // ending: leave without the ceremony
     });
     return () => sub.remove();
   }, [phase, onStop, exitToIdle]);
   ```

8. **Render — `phase === 'running'`** (mirror of `RecordScreen.tsx:1196–1315`, minus what R10
   excludes):
   ```tsx
   <View style={styles.raceColumn}>
     {settings.liveMap ? (
       <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
         {mode === 'first' ? (
           <WayMapView wayId={DEMO_FIRST_RIDE_ID} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
             zoom={4} trail={trail} variant="live" liveState={running ? 'moving' : 'finished'} fill />
         ) : (
           <WayMapView wayId={DEMO_WAY_ID} asset={DEMO_WAY_ASSET} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
             zoom={4} sectorColours={sectorColours} leadColour={colors.grey}
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
       <Text style={styles.stopSlimSub}>{demoStopOutcome(gatesDone) === 'ending' ? 'end the demo ride' : 'skips the demo · nothing is recorded'}</Text>
     </Pressable>
   </View>
   ```
   The FIRST RIDE mode has no pane (today's `:204–208` rule, kept): its slot shows the
   existing status text plus the clock. The demo's two maps stay the two it has today
   (`:193–199`), re-variant-ed to `live` + `fill`; the trail prop stays FIRST RIDE-only, the
   asset stays SECOND RIDE-only.

9. **Render — `phase === 'ending'`** (mirror of `RecordScreen.tsx:1111–1183`):
   ```tsx
   <View style={styles.raceColumn}>
     <ScrollView style={{ flex: 1, alignSelf: 'stretch' }}
       contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
       keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
       <Text style={styles.trackLine}>
         {mode === 'first' ? `Ride saved — ${demoFmtMS(clockS)}.` : 'Ride saved.'}
       </Text>
       {/* brief B mounts the TimingTower here for second/tenth and gates the block below on revealDone */}
       {mode === 'first' ? (
         saved !== null
           ? <Text style={styles.trackLine}>{demoSavedLine(saved)}</Text>
           : <RouteNamingCard startExistingLabel={null} endExistingLabel={null} loop={false} busy={busy}
               matchedWayLabel={null} existingRoute={null} vocabulary={[]}
               onSave={onDemoNamingSave} onSkip={onDemoNamingSkip} />
       ) : (
         <Pressable style={styles.stopSlim} onPress={() => setShowAnim('rev')}>
           <Text style={styles.stopSlimText}>DONE</Text>
           <Text style={styles.stopSlimSub}>back to the demo</Text>
         </Pressable>
       )}
     </ScrollView>
     {showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}
   </View>
   ```
   with
   ```ts
   const onDemoNamingSkip = useCallback(() => setShowAnim('rev'), []);
   const onDemoNamingSave = useCallback((names: RouteNames) => {
     setBusy(true);
     holdRef.current = setTimeout(() => {
       setBusy(false); setSaved(names);
       holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
     }, DEMO_FAKE_SAVE_MS);
   }, []);
   ```
   `RouteNamingCard` is a named import from `'./routeNamingCard'`; `LaunchAnimation` from
   `'./launchAnimation'`; `RouteNames` is `import type` from `'../store/routeCreation'` —
   a **type** import only (the grep in the check below must still pass; if the extension
   style makes this awkward, `RouteNames` can be re-exported as a type from `demoModel.ts`).

10. **Render — `phase === 'idle'`**: the existing `ScrollView` (`:170–215`) minus the map
    block (`:189–201`) and the pane block (`:203–209`); in their place one `styles.sub` line:
    FIRST RIDE → `'A stranger's first ride: no route, no gates, a trail growing behind the
    dot — then the card that names the route.'`; SECOND RIDE → `'Your second ride of a
    route: the line, the gates, the sector strip — then how it ranked.'` The RUN button
    stays (`disabled={running}` can go — idle never runs).

11. **Styles.** Add to `makeStyles`, copied by value from `RecordScreen.tsx:1554–1557,
    1611–1618, 1670–1686`: `raceColumn`, `trackLine`, `stopSlim`, `stopSlimText`,
    `stopSlimSub`. Report the exact copied values.

Checks: `tsc` clean. `grep -nE "from '\.\./(store|storage)/" app/src/ui/DemoScreen.tsx`
prints only the `import type { RouteNames }` line (or nothing, if re-exported via
`demoModel.ts`); `grep -n "Vibration\|BackHandler" app/src/ui/DemoScreen.tsx` shows both
imported from `react-native`. Read the running-phase JSX once more against
`RecordScreen.tsx:1196–1250` and confirm the order map → pane → status → STOP.

## 5. Task 4 — Confirm the map behaves under `variant="live"` with an `asset`

Read `wayMapView.tsx:355–425` (variant/liveState/bearing block) and the `asset` prop's
handling. Confirm and report: (a) `variant="live"` + `liveState="moving"` with an `asset`
prop and no catalog entry for `wayId` renders the asset's line/gates (the browse rung
already does, `DemoScreen.tsx:194`); (b) `fill` takes precedence over `height`
(`wayMapView.tsx:219`); (c) the rider-only path (`DEMO_FIRST_RIDE_ID`, no asset) still
renders under `variant="live"`. If any of the three is not true by reading, STOP — falling
back to `variant="browse"` is a Fable call, not yours.

## 6. Task 5 — Tests: extend `app/tests/demo_suite.ts`

Same file, same preamble (dynamic import after the JSON hook, `:16–33`). Add to the
destructured import: `demoRunEndS, DEMO_ROLL_OUT_S, demoStopOutcome, demoLiveViewModel,
demoSavedLine, demoFmtMS`. Cases, named so a failure reads as a sentence:

- **The run rolls out past the lap, then ends.** `demoRunEndS(buildDemoScript()) === 836 +
  DEMO_ROLL_OUT_S`, and `DEMO_ROLL_OUT_S >= 30` (brief C's slowest self finishes 29 s after
  the rider — pin the floor now).
- **STOP skips before the line, ends after it.** `demoStopOutcome(0..3) === 'skip'`,
  `demoStopOutcome(4) === 'ending'`.
- **The lap chip is neutral at the line (R5).** `demoLiveViewModel(script, 835, T)` → `lap ===
  null`; `(script, 836, T)` → `lap.tier === 'neutral'`, `lap.time === '13:56'`,
  `posChip === null`, `livePos === null`; `(script, 900, T)` (the roll-out) → same lap.
- **The strip is the pinned fixture.** At `clockS = 836` the four strip tiers are
  `purple, green, yellow, green` with `time` `'3:05','3:27','3:57','3:27'`; at `clockS =
  400` slots 1–2 have tiers and times, slots 3–4 are `'none'` with `time` undefined and
  slot 3 `current: true`.
- **Timebase anchor is the demo clock.** `demoLiveViewModel(script, 100, 5000).clock` equals
  `{ anchorRealMs: 5000, anchorClockMs: 100000, rate: 1, running: false }`.
- **The fake-save line.** `demoSavedLine({ start: ' Home ', end: 'Work' })` ===
  `'Home → Work created · demo only, nothing saved'`.

Zero FAIL on the whole suite. The screen itself (`.tsx`, React) is not unit-tested by the
house pattern; Inspect reads it.

## 7. Task 6 — Docs (same commit as the code)

Re-read each target first.

- `STATE.md`
  - Known stubs, the bullet beginning "DEMO replays its own frozen fixture": append
    "**Since virgin-cycle11 (brief A) RUN DEMO RIDE goes full-screen** — the DEMO tab's
    idle screen is a chooser; the run mirrors the real running column (map / pane / status /
    STOP, `variant="live"`, same `liveMap` / `sectorColours` toggles) and ends on a 'Ride
    saved' screen: FIRST RIDE shows the real `RouteNamingCard` whose SAVE is theatre
    (`demoSavedLine`, nothing written); SECOND RIDE's ending is brief B's. Lap chip neutral
    before STOP, as the real screen since cycle11 (R5). `App.tsx`'s `demoFullscreen` is the
    sixth 'screen owns intent, Shell owns chrome' bit."
  - "Where the app actually is", the `app/tests/` count in the Code bullet: refresh to the
    numbers the suite prints after Task 5.
  - "Cycle history", the `virgin-cycle11` line: append "; DEMO tab overhaul, brief A
    (`BRIEF-demo-fullscreen-run.md`)".
- `GLOSSARY.md`: add, alphabetically (between **Dev client vs. build** and **Earcon**, or
  wherever the D's fall — read the order first): "**DEMO tab.** A scripted ride replayed at
  25× so you can see, from the couch, what a ride looks like on the RECORD screen and what
  happens after STOP. Nothing it shows is recorded. Two modes: FIRST RIDE (a stranger's
  first ride and the naming card) and SECOND RIDE (a known route, the sector strip)." —
  brief B rewrites this entry to three modes; write it as two here.
- `OPEN-ITEMS.md`, under "The virgin-prototype path, in order", add item 7: "**virgin-cycle11
  DEMO overhaul — on-device look (phone only).** DEMO tab → FIRST RIDE → RUN: expect the tab
  bar to vanish, the map filling the top half course-up, the yellow trail, the status line,
  STOP; ~34 s later the roll-out and the 'Ride saved — m:ss.' screen with the naming card;
  type two names → SAVE dims the button ~0.6 s → one confirmation line → the reverse mark →
  back to the chooser with the tab bar. STOP before the line → straight back. SECOND RIDE →
  the sector strip and neutral lap chip at the line; ending per brief B. Hardware back
  behaves like STOP." Also append to item 6 (the reveal's on-device look): "The DEMO tab
  (SECOND / TENTH RIDE, brief B) now previews the same reveal without riding — a preview of
  the animation, not a substitute for the real-ride check."

---

## 8. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; record totals before
   (run once on the untouched tree; STATE.md's baseline is 600 / 597 / 0 / 3 from
   2026-09-19) and after.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0. Not bare `npx tsc`.
3. `git diff --stat`: only the files in §1. Anything else → STOP.
4. Commit by name (`git add app/App.tsx app/src/ui/DemoScreen.tsx app/src/ui/demoModel.ts
   app/tests/demo_suite.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`).
   Message:

```
virgin-cycle11: DEMO tab — RUN DEMO RIDE goes full-screen and ends like a ride (brief A)

The DEMO tab's idle screen is now a chooser (pills + RUN); the run itself
takes the whole screen — App.tsx's tabBarHidden gains a demoFullscreen bit,
reported by DemoScreen through the same onFullscreenChange prop RecordScreen
uses — and mirrors the real running column: live-variant map on top, the
LiveSectorPane, a status line, STOP. The scripted clock rolls out 60 sim-s
past the lap and auto-STOPs into an 'ending' screen; STOP before the line
skips back to the chooser. Lap chip is neutral at the line, as the real
screen since the ranking reveal. FIRST RIDE's ending mounts the real
RouteNamingCard (both endpoints unknown); SAVE is theatre — busy, one
confirmation line, the reverse launch mark — nothing is written. Pure
rules + the hand-built view model moved into demoModel.ts with tests.
STATE/GLOSSARY/OPEN-ITEMS updated. RecordScreen, store, WayMapView untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403 from the proxy, cycle5/6/11 precedent) —
say so, do not retry more than once.

---

## 9. Report back

In this order, verbatim where asked:

1. HEAD at start, `git status --short` at start, the commit hash at end.
2. The six §1 anchor confirmations, quoted as found.
3. Task 3: the final `start()` interval body, `onStop` / `enterEnding` / `exitToIdle`, the
   fullscreen effect and the back handler, as committed; the copied style values (step 11);
   the output of the two greps.
4. Task 4's three confirmations about `variant="live"` + `asset`.
5. Test totals before/after; `tsc` result.
6. **A plain-language walk-through of what Nathan will see** for FIRST RIDE and SECOND RIDE
   from tapping RUN to being back on the chooser, with timings (34 s ride, 2.4 s roll-out,
   0.6 s fake save, 1.8 s confirmation), so he can react before opening the app.
7. Tokens used (this tier); the tier | model | tokens | outcome row.
8. Every STOP you hit and did not resolve (there should be none you resolved yourself).
