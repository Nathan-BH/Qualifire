# 08 — REPLAY screen redesign: bigger map, one speed dial, a scrub bar, icon play/pause

**Source: Nathan, 2026-09-27 (first time he opened the REPLAY screen).** His words: "it is also
my first time looking at the replay screen and it is not good at all in my opinion: 1) the map is
super small because of the extra buttons and the timer is quite big but is not a priority since
you are not riding anymore. here are some fixes that i can already see implemented, more will
probably follow soon 2) i think the replay speed buttons take too much space as three buttons,
it can be just a small circle button instead that has all the speeds in it, so you click the
same button repeatedly to switch options which helps win screen space 3) i dont like to only
have play restart buttons. Instead it would be better to just have an horizontal slider; which
you can move your finger on in left/right to move forward or back in the replay. And how much
the finger slide moves the actual replay is determined by what replay speed you have chosen? so
you can change between small and big movements depending on if you're in 5x or 25x? does that
make sense? 4) with these features the map will already be bigger as there is more space. I am
not sure what to do with the timer yet but it can definetly be smaller 5) we still need a play
button though to start the replay whenever you want after scrolling the scrollbar for example so
do not remove it but it can definitely be smaller like a right facing rectangle like most play
buttons look like; and pause can be two vertical bars how it is commonly designed?"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-27 by the Plan
tier (Fable) from a Haiku digest plus one anchor check against the working tree (branch
`virgin`; cycle15 briefs 01-07 all parked/unexecuted). Executor: Sonnet, cold, this file only.
Eighth brief of `virgin-cycle15`. **Overlaps brief 07 (`07-replay-position-drift.md`) on
`ReplayScreen.tsx` / `replayModel.ts`** — if 07 lands first, re-verify every line anchor below
before editing (stop-on-ambiguity covers it); if this one lands first, 07's executor does the
same. Independent of 01-06. Nathan said "more will probably follow soon" about this screen:
this brief covers his five points and nothing speculative — a follow-up brief (09+) is the
place for the status line, the timer's final form, and anything he adds after seeing this.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-27. If a quoted
  line is not where the brief says, or a name/signature differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- **No new dependency, native or JS.** `package.json` has no icon library, no
  `react-native-svg`, no `react-native-gesture-handler`, no `reanimated` (checked 2026-09-27).
  Everything here is RN core: `View`, `Text`, `Pressable`, `PanResponder`, `StyleSheet`.
  Do not add any of the above; icons are drawn with plain `View`s (decision 6).
- **Replay-only.** `LiveSectorPane` / the clock in `app/src/ui/liveView.tsx` are shared with
  `RecordScreen.tsx` (line 1234), `DemoScreen.tsx` (line 421) and `preview/PreviewScreen.tsx`
  (line 274). The only permitted change to `liveView.tsx` is the optional prop in decision 7,
  defaulting to today's value so those three callers render pixel-identical. If threading that
  prop needs anything more than the described edit (e.g. the clock `Text` at line 228 is not
  rendered from inside `LiveSectorPane`), **stop** — do not restyle the live clock.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  briefs `01`-`07` of this folder, or anything under `cycles/virgin-cycle14/` (history).
- Do not touch `RecordScreen.tsx`, `DemoScreen.tsx`, `PreviewScreen.tsx` (read
  `PreviewScreen.tsx` 660-ff for the `PanResponder` pattern only), the map component, the
  replay storage/rows, or `buildReplayRider` / `riderPositionAt` / `replayClockS` bodies.

## Goal

The REPLAY screen becomes: **map (most of the screen) → smaller clock pane → one 44 dp control
row → back**. The control row is, left to right: a **round speed dial** showing the current
rate (`10×`) that steps 5 → 10 → 25 → 5 on each tap; a **scrub bar** that fills with progress
and that you drag left/right to move the replay back/forward, with the drag's reach set by the
selected speed (5× = fine, 25× = coarse); and a **square play/pause button** with a
right-pointing triangle (paused) or two vertical bars (playing). The three speed pills, the
56 dp PLAY/PAUSE text button and the 56 dp RESTART text button are gone; the map's existing
`flex: 1` absorbs the freed height (about 150 dp) with no map-side code. Restart survives as a
long-press on the play/pause button and as "play when finished" (decision 5).

## Current state (verified 2026-09-27 against the tree)

`app/src/ui/ReplayScreen.tsx` unless stated.

- Header comment line 6 still describes the old chrome: `LiveSectorPane, a status line, and
  PAUSE/PLAY, RESTART, a speed pill` — update it (files section).
- Line 16: `import { LiveSectorPane } from './liveView.tsx';` (note the `.tsx` extension — keep).
- `vm` (a `LiveViewModel`) is built at 131-139 via `replayLiveViewModel()` / `replayTimebase(anchor)`.
- `isOver` at line 146: `clockS >= endS`. `endS` is in scope there (ride end in clock seconds).
- `togglePlay` 148-158: playing → pause (freezes `clockS`); paused & !over → resume;
  paused & over → seek to 0 and play.
- `restart` 160-164: `setClockS(0)` + `setAnchor({ ..., clockS: 0, ..., playing: true })`.
- `setRate(r)` 166-168: `setAnchor({ clockS, realMs: Date.now(), rate: r, playing: anchor.playing })`.
- Column layout 199-244 inside `raceColumn` (styles 250-253: `flex: 1, paddingHorizontal: 12,
  paddingTop: 8, paddingBottom: 10, gap: 8`), top to bottom:
  - 199 map container `<View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>`;
    215 fallback sibling, also `flex: 1`, when the map is disabled.
  - 218 `{vm ? <LiveSectorPane vm={vm} showLap /> : null}` — **the timer lives in here**, not
    in ReplayScreen.
  - 220 status line, style `trackLine` (~15 px, `marginTop: 10`).
  - 222-232 speed pill row: `<View style={styles.pillRow}>` mapping `REPLAY_RATES` to a
    `Pressable` each (`styles.pill` + `pillSelected` / `pillOutline`), `onPress={() => setRate(r)}`.
  - 234-238 play/pause `Pressable`, style `stopSlim`, label `PAUSE` / `PLAY` / `REPLAY AGAIN`.
  - 239-241 restart `Pressable`, style `stopSlim`, label `RESTART`, `onPress={restart}`.
  - 242-244 back button (~15 px, `marginTop: 4`).
- Styles 263-282: `pillRow` (row, `gap: 8`, `marginTop: 4`), `pill` (`flex: 1`,
  `borderRadius: radius.btn`, `paddingVertical: 10`, `borderWidth: 2`), `pillSelected`
  (`backgroundColor: t.accent`), `pillOutline` (transparent), `stopSlim` (271-282: `height: 56`,
  amber border, `backgroundColor: t.race.card`, row, `gap: 12`).
- `app/src/ui/replayModel.ts`: 23-24 `REPLAY_RATES = [5, 10, 25]`, `REPLAY_RATE_DEFAULT = 10`;
  90-93 `replayClockS(a, nowMs)` (playing: `clockS + ((nowMs - realMs) / 1000) * rate`; paused:
  frozen `clockS`); 101-103 `riderPositionAt(rider, clockS)` interpolates at any `clockS`.
  **Seeking already exists**: set `clockS` and a paused anchor and every derived value (position,
  elapsed, gates done, `vm`) follows on the next render. No seek function is needed.
- `app/src/ui/liveView.tsx`: line 228 the clock `Text`,
  `style={[clockStyles.clock, { color: tb ? t.text : t.textDim }]}`, rendering
  `fmtClock(clockMsAt(tb, Date.now()))`, ticking every 100 ms; 234-236
  `clockStyles = StyleSheet.create({ clock: { fontSize: 92, ...` (weight 800, centred); 249
  `export function LiveSectorPane({ vm, showLap = true }: { vm: LiveViewModel; showLap?: boolean })`.
  The clock component is **not exported**; it is rendered from inside `LiveSectorPane`. No
  size prop exists today.
- Drag pattern to copy: `GateHandle` in `app/src/ui/preview/PreviewScreen.tsx` line 660
  (`PanResponder` imported at line 15 from `react-native`): `onStartShouldSetPanResponder` /
  `onMoveShouldSetPanResponder` → `true`; `onPanResponderGrant` snapshots the start value into a
  ref; `onPanResponderMove: (_e, gs) => ...gs.dx...`; latest props read through a `propsRef`
  because the responder is created once in a `useRef`. Nothing else in `app/src/ui/` uses drag.
- Tests: `app/tests/replay_suite.ts` — pure-model tests only (constants band at line 92,
  `buildReplayRider` at 100, gate bracketing at 132, START-never-reached at 145). No UI /
  interaction harness exists anywhere in the app (no jest, no testing-library in
  `package.json`), so gesture wiring can only be checked on the phone.

## Decisions (do not reopen)

1. **Layout order stays map → clock pane → status line → control row → back.** The status
   line (220) is kept where it is (Nathan did not mention it; it is ~25 dp). Only its
   `marginTop: 10` is dropped (the column's `gap: 8` already separates it). The map keeps
   `flex: 1, minHeight: 220` unchanged — the ~150 dp the removed chrome frees flows into it
   automatically.
2. **One control row, 44 dp tall, `flexDirection: 'row', alignItems: 'center', gap: 10`:**
   `[speed dial 44×44] [scrub bar, flex: 1] [play/pause 44×44]`. 44 dp is the smallest
   comfortable touch target; both buttons get `hitSlop={8}`.
3. **Speed dial = one round button, no menu.** 44×44, `borderRadius: 22`, `borderWidth: 2`,
   border and text colour `t.accent`, background `t.race.card`, label `${rate}×` (U+00D7,
   `fontSize: 15`, `fontWeight: '800'`). Tap → `setRate(nextReplayRate(anchor.rate))`, where
   `nextReplayRate` is a new pure function in `replayModel.ts`: index of the current rate in
   `REPLAY_RATES` plus one, modulo length; a rate not in the list returns `REPLAY_RATES[0]`.
   Cycling wraps 5 → 10 → 25 → 5. Cycling does **not** change play/pause state (`setRate`
   already preserves `anchor.playing`). `accessibilityLabel="replay speed"`.
4. **Scrub bar is a relative jog, not an absolute seek, and its reach scales with the rate.**
   Touching the bar never jumps to the touch point (a jump would make the rate irrelevant,
   which is the opposite of what Nathan asked). Dragging moves the replay by
   `deltaS = dx * rate * SCRUB_S_PER_DP_PER_RATE`, with `SCRUB_S_PER_DP_PER_RATE = 0.4`
   (new exported constant in `replayModel.ts`, plus the pure `scrubDeltaS(dx, rate)` and
   `clampClockS(v, endS)` → `[0, endS]`). Reasoning: the bar is ~240 dp wide on a 360 dp
   phone (360 − 24 padding − 2×44 buttons − 2×10 gaps), so one full-width swipe moves the
   replay by `240 × 0.4 × rate` ride-seconds = **96 s of watching at that speed** — 8 min of
   ride at 5×, 16 min at 10×, 40 min at 25× (a whole commute in one swipe at 25×, a fine
   ±1 min nudge with a thumb-width at 5×). Per-dp, not per-bar-width, so the feel is the
   same on every phone and the function is testable without layout. Sign: drag right =
   forward. Result is clamped to `[0, endS]`.
   Gesture lifecycle: `onPanResponderGrant` → snapshot `startS = replayClockS(anchor, Date.now())`
   and **pause** (`setClockS(startS)`; `setAnchor({ clockS: startS, realMs: Date.now(), rate,
   playing: false })`); `onPanResponderMove` → `next = clampClockS(startS + scrubDeltaS(gs.dx,
   rate), endS)`; `setClockS(next)`; `setAnchor({ clockS: next, realMs: Date.now(), rate,
   playing: false })`; release → nothing (stays paused — Nathan: "we still need a play button to
   start the replay ... after scrolling the scrollbar"). The responder reads `anchor`, `endS`,
   `setClockS`, `setAnchor` through a `useRef` updated every render (the `propsRef` pattern),
   never from the closure it was created in. A tap with no movement changes nothing.
   Visual: a 6 dp track (`borderRadius: 3`, `t.race.card`-ish dim fill) with the elapsed part
   filled `t.accent` (`width: \`${100 * clamp(clockS / endS, 0, 1)}%\``) and a 16 dp knob circle
   at the boundary; the touch area is the full 44 dp height. When `endS <= 0` or `vm` is null the
   bar renders empty and the responder is not attached.
5. **RESTART button removed; restart lives in two places that already exist.** (a) The
   play/pause button's `isOver` branch of `togglePlay` already seeks to 0 and plays — that is
   "replay again after it finished". (b) **Long-press on the play/pause button = `restart`**
   (`onLongPress={restart}` on the same `Pressable`, default 500 ms delay) — one gesture to go
   back to 0 and play from anywhere mid-replay, which a 5× scrub alone would not give on a long
   ride. Scrubbing left to 0 remains the third path. Nathan did not ask for RESTART to go;
   this is the Plan tier's call from "I dont like to only have play restart buttons" plus his
   ask for space — logged in Open questions 1, reversible by adding a third 44 dp button.
6. **Icons are plain `View`s, no library, no font glyph.** Play = right-pointing triangle
   built with the border trick (`width: 0, height: 0, borderTopWidth: 10, borderBottomWidth: 10,
   borderLeftWidth: 17, borderTopColor: 'transparent', borderBottomColor: 'transparent',
   borderLeftColor: t.text, marginLeft: 3` for optical centring). Pause = two `View`s
   `4 × 18` dp, `gap: 4`, `backgroundColor: t.text`, `borderRadius: 1`. Put both in a tiny new
   file `app/src/ui/replayIcons.tsx` exporting `PlayIcon` / `PauseIcon` (props: `color`). The
   `isOver` state shows the **play triangle** (pressing it restarts, per decision 5a); the fully
   filled scrub bar is the "finished" cue. No `↻` glyph — its rendering across Android fonts
   is unverified and the executor cannot check it (Open question 2).
7. **Timer shrinks via one optional prop, replay-only.** Add `clockSize?: number` to
   `LiveSectorPane`'s props (line 249), threaded to the clock component and applied as
   `[clockStyles.clock, clockSize != null ? { fontSize: clockSize } : null, { color: ... }]` on
   the `Text` at 228. **Default = undefined → today's 92 px** so RecordScreen, DemoScreen and
   PreviewScreen render unchanged. `ReplayScreen` passes `clockSize={56}` (about 60 % — clearly
   smaller, still readable at arm's length; Nathan said "not sure what to do with the timer yet",
   so this is the minimal move and the number is one literal). `clockStyles.clock` itself is not
   edited. If the clock component's signature makes a single new prop insufficient, stop.
8. **Play/pause button** = 44×44, `borderRadius: radius.btn`, `borderWidth: 2`, border colour
   the same amber token `stopSlim` uses today (read it from 271-282, do not invent one),
   `backgroundColor: t.race.card`, centred icon. `accessibilityLabel` = `'pause'` / `'play'`.
   `onPress={togglePlay}` unchanged, `onLongPress={restart}` added.
9. **Removed styles are removed, not left dead:** `pillRow`, `pill`, `pillSelected`,
   `pillOutline`, `stopSlim` go, replaced by `ctlRow`, `dial`, `dialText`, `scrubWrap`,
   `scrubTrack`, `scrubFill`, `scrubKnob`, `ctlBtn`. If `stopSlim` is referenced anywhere else in
   the file, stop.

## Files to touch

1. **`app/src/ui/replayModel.ts`** — add, next to `REPLAY_RATES` (23-24):
   - `export const SCRUB_S_PER_DP_PER_RATE = 0.4;`
   - `export function nextReplayRate(rate: number): number` (decision 3).
   - `export function scrubDeltaS(dx: number, rate: number): number` → `dx * rate * SCRUB_S_PER_DP_PER_RATE`.
   - `export function clampClockS(v: number, endS: number): number` → `Math.min(Math.max(v, 0), Math.max(endS, 0))`.
   Doc-comment each with the reach table from decision 4. No other change to this file.
2. **`app/src/ui/replayIcons.tsx`** (new, ~40 lines) — `PlayIcon({ color })`, `PauseIcon({ color })`
   per decision 6. Pure `View`s, `StyleSheet`, no props beyond `color`.
3. **`app/src/ui/liveView.tsx`** — decision 7 only: `clockSize?: number` on `LiveSectorPane`
   (249), passed to the clock component, applied on the `Text` at 228. Three-line diff. Nothing
   else in this file.
4. **`app/src/ui/ReplayScreen.tsx`**:
   - Line 6 comment → "LiveSectorPane, a status line, and one control row: speed dial, scrub
     bar, play/pause (long-press = restart)".
   - Imports: add `PanResponder` to the `react-native` import; import `PlayIcon, PauseIcon`
     from `./replayIcons`; import `nextReplayRate, scrubDeltaS, clampClockS` from `./replayModel`.
   - Add `cycleRate = () => setRate(nextReplayRate(anchor.rate))` next to `setRate` (166-168).
   - Add the scrub responder after `restart` (160-164): a `useRef` holding
     `{ anchor, endS, setClockS, setAnchor }` refreshed each render, and
     `useRef(PanResponder.create({...})).current` per decision 4's lifecycle. Keep `startS` in a
     ref set on grant.
   - Line 218: `<LiveSectorPane vm={vm} showLap clockSize={56} />`.
   - Line 220: status line stays; remove `marginTop: 10` from `trackLine`.
   - Replace 222-241 (pill row + play + restart) with the single control row:
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
       <Pressable style={styles.ctlBtn} hitSlop={8} onPress={togglePlay} onLongPress={restart}
         accessibilityLabel={anchor.playing ? 'pause' : 'play'}>
         {anchor.playing ? <PauseIcon color={t.text} /> : <PlayIcon color={t.text} />}
       </Pressable>
     </View>
     ```
     with `progressPct = endS > 0 ? 100 * Math.min(Math.max(clockS / endS, 0), 1) : 0` and
     `scrubEnabled = !!vm && endS > 0`. The knob is absolutely positioned with
     `marginLeft: -8` (half its 16 dp) so it sits centred on the boundary.
   - Line 242-244 back button unchanged.
   - Styles: delete `pillRow`/`pill`/`pillSelected`/`pillOutline`/`stopSlim` (263-282); add
     `ctlRow`, `dial`, `dialText`, `scrubWrap` (`flex: 1, height: 44, justifyContent: 'center'`),
     `scrubTrack` (`height: 6, borderRadius: 3, overflow: 'hidden'`), `scrubFill`
     (`height: '100%', backgroundColor: t.accent`), `scrubKnob` (`position: 'absolute', width: 16,
     height: 16, borderRadius: 8, backgroundColor: t.accent, marginLeft: -8`), `ctlBtn`
     (decision 8). Reuse the amber border token from the old `stopSlim` verbatim.
5. **`app/tests/replay_suite.ts`** — append, in the existing style of that file, tests for the
   three pure functions:
   - `nextReplayRate`: 5→10, 10→25, 25→5 (wraps), `nextReplayRate(7) === REPLAY_RATES[0]`.
   - `scrubDeltaS`: `scrubDeltaS(0, 25) === 0`; `scrubDeltaS(240, 5) === 480` (8 min);
     `scrubDeltaS(240, 25) === 2400` (40 min); `scrubDeltaS(-100, 10) === -400` (sign);
     ratio `scrubDeltaS(x, 25) / scrubDeltaS(x, 5) === 5`.
   - `clampClockS`: `(-5, 100) → 0`, `(150, 100) → 100`, `(42, 100) → 42`, `(42, 0) → 0`.
   Keep the constants band test at line 92 passing (no constant changed).

## Verification plan

- `tsc --noEmit` clean (the repo's usual gate; run it the way the preflight in
  `scripts/publish-preview.*` does).
- Run `app/tests/replay_suite.ts` with the same runner the other suites in `app/tests` use
  (see `app/package.json` scripts / this folder's README; stop if the command is not obvious).
  All pre-existing tests plus the new ones green.
- `grep -n "stopSlim\|pillRow\|pillSelected\|RESTART\|REPLAY AGAIN" app/src/ui/ReplayScreen.tsx`
  → no matches.
- `grep -rn "clockSize" app/src` → exactly the `liveView.tsx` prop/usage lines and the one
  `ReplayScreen.tsx` call site; `RecordScreen.tsx`, `DemoScreen.tsx`, `PreviewScreen.tsx` do
  **not** appear. `grep -n "fontSize: 92" app/src/ui/liveView.tsx` still matches line ~236.
- `git diff --stat` shows exactly: `replayModel.ts`, `replayIcons.tsx` (new), `liveView.tsx`
  (≤ 4 lines changed), `ReplayScreen.tsx`, `replay_suite.ts`. Anything else → stop.
- **Honest limit:** there is no UI/interaction test infrastructure in the app, so the
  `PanResponder` wiring, the pause-on-grant behaviour, the long-press restart, the icon
  rendering and the actual freed map height are verified only on the phone (checklist below).
  The tests cover the maths (rate cycling, drag → seconds, clamping), not the gesture.

## On-device checklist (Nathan, Preview APK after EAS Update)

1. Open a finished ride's REPLAY. Map is visibly taller than before; below it: smaller clock,
   status line, one row of dial / bar / play button, back. No PAUSE/RESTART text buttons, no
   three speed pills.
2. Tap the dial: `10×` → `25×` → `5×` → `10×`; playback speed follows; playing state unchanged.
3. Press play (triangle) → icon becomes two bars, replay runs, bar fills left → right, knob
   follows. Press again → triangle, everything freezes.
4. While playing, drag the bar: replay pauses on touch, the rider/clock/bar move with the
   finger; right = forward, left = back; releasing leaves it paused. Press play to resume
   from there.
5. At `5×` a full-width swipe moves ~8 min; at `25×` ~40 min (whole commute). Drag left past
   the start pins at 0:00; drag right past the end pins at the end.
6. Let it run to the end: bar full, triangle shows. Tap → restarts from 0:00 and plays.
7. Mid-replay, long-press the play/pause button (~½ s) → jumps to 0:00 and plays.
8. Open the live RECORD screen and the DEMO: their clocks are the same size as before.
9. Rotate / another ride length: the row stays one line, nothing clipped.

## Out of scope

- The status line's content and whether it stays (Nathan hasn't spoken to it) — follow-up brief.
- The timer's final form beyond "smaller" (`clockSize={56}` is one literal to retune).
- Absolute tap-to-seek on the bar, time tooltips while scrubbing, haptics, gate markers on the
  bar, a `↻` finished icon — all candidates for the follow-up Nathan announced.
- Brief 07's position-drift fix (same files; see the overlap note at the top).
- Any change to RecordScreen / DemoScreen / PreviewScreen, the map, storage, `REPLAY_RATES`
  values, or `REPLAY_RATE_DEFAULT`.
- iOS (no iOS build; everything used is cross-platform RN core anyway).
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only (four files edited, one small UI
file added, no new dependency, no `app.json`/`eas.json` change), so it ships to the Preview APK
over EAS Update via `scripts/publish-preview.cmd` — no new numbered build, no reinstall.
Visible only on the REPLAY screen: bigger map, smaller clock, a round `10×` speed dial, a
draggable progress bar, a small triangle/two-bars play-pause button (long-press = restart).
The live RECORD and DEMO screens look exactly as they do today.

## Open questions / assumptions (logged, not blocking)

1. **RESTART removed** (decision 5): Nathan said "I dont like to only have play restart
   buttons" and asked for space, but never said "remove restart". Long-press restart is not
   discoverable without being told; if he wants it visible, a third 44 dp button with a small
   `↺` or "0:00" label fits the row (`ctlRow` gains one child).
2. **Finished state shows the play triangle**, not a distinct replay icon (decision 6). If a
   visible "again" cue matters, a `↻` `Text` glyph is a one-line swap — untested on his
   phone's fonts, which is why it is not the default.
3. **Scrub sensitivity constant** `0.4 s/dp/rate` is the Plan tier's estimate from a 240 dp
   bar. If the bar feels too fast/slow it is one number; if Nathan wants a full-width swipe to
   always equal the whole ride regardless of speed, that is a different (rate-independent)
   model and contradicts point 3 of his message, so it was not chosen.
4. **Scrub always leaves the replay paused** (decision 4). Auto-resuming when it was playing
   before the drag is a two-line change (`wasPlaying` ref) but contradicts his "then press play".
5. **Clock 56 px** is a guess at "smaller"; he said he is "not sure what to do with the timer
   yet". Retune the literal, or drop `showLap`, in the follow-up.
6. **Status line kept** — untouched except its top margin. If the follow-up drops or shrinks it,
   the map gains another ~25 dp.
