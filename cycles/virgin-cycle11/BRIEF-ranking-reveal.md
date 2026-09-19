# BRIEF — Ranking reveal: the timing tower climbs after STOP

**Written 2026-09-19 UTC (Plan tier, fable).** Nathan's ask, unedited: *"i really like the
animation we have at marketing/silent-studio/ranking/rounds/v7 and i think it should look
something like that in-app as well. Instead of at the end of the ride already say 'P7 out of
10' with the time for example, i would wait until the user actually stops the ride, and then
show a ranking animation to get the emotional payoff of seeing the time climb through the
rankings."*

Anchors below were read from the live `virgin` working tree at HEAD `e7e61f7` on
2026-09-19, via `cycles/virgin-cycle11/DIGEST-ranking-reveal.md` plus surgical re-reads of
`ui/tower.tsx`, `ui/towerModel.ts`, `ui/liveView.tsx`, `ui/RecordScreen.tsx`,
`ui/lastRide.ts`, `ui/colourModel.ts`, `ui/chips.tsx`, `ui/theme.ts`, `live/towerSource.ts`,
`store/timing.ts`, `store/results.ts`, `store/routeCreation.ts`, `tests/run.ts`,
`tests/towermodel_suite.ts`, `tests/live_colour_suite.ts`, `GLOSSARY.md`, `STATE.md`.
Where the digest's line numbers and the tree disagreed, the tree's numbers are used here
(e.g. `LiveSectorPane` is at 1165–1173, not 1152). **The executor records `git rev-parse
HEAD` and `git status --short` at start and re-reads every anchored line before touching
it.** Executor: Sonnet, stop-on-ambiguity — any anchor that does not match, any call this
brief leaves open, any place where the data or the React tree turns out to be shaped
differently than described here: STOP, report the file, the line, and what is actually
there. Never guess, never rule on it from the coordinator's chat — it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — Before STOP: the lap TIME stays, the RANK and the TIER wait

Today, the moment the final gate fires (still riding, before STOP), `LiveSectorPane` shows
the terminal `LiveLapChip` (time, tier-coloured purple/green/yellow) **plus** a static
`PosChip` "P7 of 10" from `getLiveTowerPosition(live)` (`RecordScreen.tsx:1169`,
`liveView.tsx:278–286`). After this brief:

- **The lap time still appears at the final gate.** The rider has just crossed the line and
  wants the number; they may still roll a few hundred metres to where they actually stop.
  Nathan objected to the *rank* being announced early, not the time ("with the time" in his
  own words describes what is shown today, not what he wants kept).
- **The `PosChip` no longer renders before STOP.** `RecordScreen.tsx` passes `null` as the
  `posChip` argument (the documented "render nothing" value, `liveView.tsx:107`).
- **The lap chip renders with tier `'neutral'` before STOP** — the same "no verdict yet"
  look a way's very first ride gets today (`chipColors('neutral')`, `chips.tsx:34–52`: no
  border, text in the theme's accent — the app's structural yellow in race/night mode,
  a darker gold in daylight). Reason: a purple lap chip *is* the rank announcement ("you
  beat every ride in the window"), a green one says "above average" — leaving the tier on
  would spoil exactly the reveal Nathan is asking for. The reference animation's whole
  design is white-until-landing (v7 `FEEDBACK.md`); the in-app equivalent is neutral-
  until-STOP. Sector bars (S1–S4 strip) and the last-sector flash keep their live colours:
  they are sector verdicts, already Nathan's own cycle9 design, and they do not tell you
  the lap's rank.
- `livePos` ("P4" among the self dots, context row, cycle6 follow-up R10) is untouched. It
  is a live race fact that goes null the moment the lap lands (`RecordScreen.tsx:902–908`),
  not a final verdict.

If Nathan wants the tier back on the pre-STOP lap chip after seeing it, it is a one-line
revert (Task 4 step 2 names the line).

### R2 — After STOP: the existing `TimingTower` plays the reveal on the 'ending' screen

The board is the existing `TimingTower` (`ui/tower.tsx`) fed by the existing pure builder
`buildTowerModel` (`ui/towerModel.ts:50`). It already has the motion Nathan is pointing at
(today enters at the bottom, climbs to its rank, rows it passes step down, arrival chrome
fades in) — it has just never been mounted with real data. No second ranking mechanism,
no new board component: the same rank/window facts that colour every sector and place every
lap. **If two surfaces ever disagree on which rides you are racing, that is a bug by
definition** (cycle6 R2) — the reveal board is one more such surface, so it reuses the
window, not a copy of it.

Where it mounts: the `'ending'` phase render block (`RecordScreen.tsx:1064–1110`), directly
under the "Ride saved" line and **above** the naming / gate-adjust card. Sequence after
the STOP tap, when a reveal exists (R4):

1. Screen flips to 'ending' as today. The tower renders with today's row parked at the
   bottom, plain ink, **no position number, no gap** — just the time (the reference row is
   "Today · 17:08.9", nothing else).
2. After a short settle (`REVEAL_START_DELAY_MS`, 500 ms — the rider's eyes are coming down
   from the STOP button), today climbs to its rank; each row it passes steps down as it goes
   by (R3).
3. **At the landing instant, a hard cut** (state flip, never a fade): the time takes its
   tier colour, `P<n>` and the gap to P1 appear. Then the existing 200 ms arrival fade of the
   accent bar + TODAY label plays, unchanged.
4. The board holds (`REVEAL_HOLD_MS`, 1500 ms). Then whatever the 'ending' screen would
   have done anyway happens: the naming card (or gate-adjust card) mounts **beneath** the
   now-static tower, or — with no card due — the reversed launch mark plays and the ride
   detail opens exactly as today (`tabNav.openRide`, `RecordScreen.tsx:1106`).

The naming card is the common case, not the exception: `draftRouteCreation`
(`store/routeCreation.ts:188`) returns a non-null draft for a ride between two known
landmarks that a way already links (WP-G's "second Route on that Way" offer), so on a
normal ride of an existing way the card *does* show. Hence the ordering: tower first, card
after the reveal has played. Because tower + card may exceed one screen on a small phone,
the 'ending' content column becomes a `ScrollView` (mirroring the idle screen's own
ScrollView-plus-absolute-overlay pattern at `RecordScreen.tsx:1246–1256`); the reversed
`LaunchAnimation` stays an absolute-fill sibling. Nothing about the card's behaviour, its
exits, or `openRide` changes.

The "Ride saved — 19:02." line above the tower currently prints the whole-recording elapsed
(`lastSummary.endMs - startMs`), which is a different number from the lap. When a reveal is
shown, that line reads just `Ride saved.` — the tower's TODAY row is the headline (LAYOUT
§3.1, quoted in `PreviewScreen.tsx:315–316`). Without a reveal the line is unchanged.

### R3 — What changes inside `TimingTower` (extend, don't fork)

Three additive, optional props, every default preserving today's behaviour byte-for-byte
for the Preview screen (its only current consumer, `PreviewScreen.tsx:306–320`):

- `reveal?: boolean` (default `false`). When on and `justFinished`:
  - today's row renders **time in plain ink (`t.text`), position cell and gap cell empty**
    until landed; at landing a `landed` state flips and the row renders exactly as it does
    today (tier-coloured time, `P<n>`, gap). Hard cut — the flip is a React state change at
    the climb's completion callback, never an animated colour.
  - **passed rows step down one at a time** as today goes by, instead of as one block.
    Today's block-shift (`belowShift`, `tower.tsx:144`) moves every passed row in lockstep;
    the reference (`ranking/index.html:277–282`) bumps each row the moment Today's top is
    half a slot below that row's top. Same rule here, on the same `travel` value, per row
    (Task 2 has the formula). Under `reveal === false` the lockstep block is kept.
- `climbMs?: number` (default the existing `SLOT_IN_MS = 700`). The reference climbs for
  2.2 s over eight rows; 700 ms is the broadcast-snappy default that suits a demo. The reveal
  passes a duration that scales with how far today actually travels (R5).
- `startDelayMs?: number` (default `0`) — the `delay` option on the travel timing.

Also fixed while in this file: `timeColor()` (`tower.tsx:63–74`) has **no `'yellow'`
case**, so a yellow-tier lap renders as ink on the board — the same class of bug cycle9's
Inspect caught in the sector strip (yellow rendered invisible). Add
`case 'yellow': return YELLOW_TIER;` (re-exported from `./chips`, `chips.tsx:23`). Without
it, a yellow reveal would flip white → white, a non-event. `'neutral'` stays ink (D-022,
that comment is right); only the earned tier gets the colour. This also colours yellow rows
in the Preview demo's board, which is the correct rendering everywhere else in the app
(`LiveLapChip` already paints yellow as `YELLOW_TIER`).

Past rows keep their existing per-row tier colours (each past lap judged against the other
rows, `towerModel.ts:75`). The reference video's other nine rows are all white; the app's
board has coloured them since B-28 and that is a board-design call, not this cycle's.
**Named alternative for Nathan:** if the coloured field dilutes the flip, mapping past rows
to `'neutral'` in the reveal builder (one line in `rankingRevealModel.ts`) gives the
all-white reference look — say so after seeing it, do not pre-build it.

### R4 — When there is NO reveal: ride 1, estimated laps, free rides

`buildRankingReveal()` (Task 1) returns `null`, and the 'ending' screen then behaves
**exactly as today** (plain "Ride saved — m:ss." line, card or reverse mark, ride detail),
when any of these holds:

- free ride / no way locked (`track === null`), no lap (`lap === null`), an estimated lap
  (`lap.estimated`, D-028: estimated never ranks), or no real scored time
  (`scoredS(lap) === null` — the `movingS === null` marker, honoured in both timing modes,
  `store/timing.ts:36–40`);
- no session identity (`sessionRef.current === null`) — nothing to exclude by, nothing to
  open afterwards either;
- **the comparison window is empty: `ghostsFor(wayId, rideId).length === 0`.** This is
  ride 1 of a way (the reference ride) and any way whose only history is unrankable. A
  one-row board climbing zero rows to "P1 of 1" is an animation of nothing — STATE.md's
  own rule: the reference ride "gets no colour verdict on the day it's ridden — it earns a
  rank once stored, but nothing to compare against yet". The stored ride still shows its
  rank in RIDES and RESULTS; only the *ceremony* is withheld. Note this deliberately
  differs from `getLiveTowerPosition` (`towerSource.ts:37–46`), which returns "P1 of 1"
  for a first lap because a static *fact* needs no priors; an *animation* of a rank climb
  does. Both stay true; they answer different questions.

Ride 2 (window of one) **does** get the reveal: two rows, today lands P1 or P2, flips
purple or yellow (`tierFor` at n = 1 can only be those two, `colourModel.ts:150–164`) —
the same ramp cycle6 gives the self dots (ride k races k − 1).

### R5 — The window, the exclusion trap, and the numbers

- **Window = `ghostsFor(wayId, rideId)` from `colourModel.ts:77–79`, unchanged**, called
  *with* today's `rideId` as `excludeRideId`. Reason (this is the trap): `onEnd` calls
  `rememberRide()` (`RecordScreen.tsx:534`) *before* the phase flip, and `rememberRide` →
  `pushRecorded` (`lastRide.ts:133`, `211–226`) synchronously appends today's result to the
  in-memory pool that `rankedFor` reads (`colourModel.ts:64–68`). So by the time the
  'ending' screen exists, `ghostsFor(wayId)` *without* exclusion already contains today —
  the board would show today's time twice and drop the oldest real ride. `ghostsFor`'s
  own doc comment names this case ("minus the judged ride when it is already stored —
  B-44's exclusion survives"). `getLiveTowerPosition` has no exclusion because it runs
  live, pre-storage — which is exactly why it is *not* reused for the reveal (its tests in
  `live_colour_suite.ts:180–204, 347–355` stay untouched).
- Board = `buildTowerModel(window, scoredS(lap), false, startedAtMs, allTimeBestLapS(wayId))`
  (`towerModel.ts:50–56`). `allTimeBestLapS` *does* see today's stored lap — correct: if
  today is the new all-time best, today's row earns the PB ●.
- `of` = `rows.length` = window + 1 ≤ `WINDOW_N` (10). "Never of 11" (STATE.md Scoring) is
  a test in Task 5.
- Climb duration (a starting point, R6): `climbMsFor(rowsPassed) = clamp(600 + 200 ×
  rowsPassed, 600, 2200)`, `rowsPassed` = rows below today in the full model. Eight rows →
  2.2 s (the reference); one row → 800 ms; zero → 600 ms (arrival fade only — zero travel
  is never an animation of failure, `tower.tsx` header). Easing stays the tower's
  `Easing.out(Easing.cubic)` (the reference's `power2.out` is one degree gentler; not worth
  a second constant until Nathan has seen it).

### R6 — Visual constants are a starting point, not a spec

`REVEAL_START_DELAY_MS = 500`, `REVEAL_HOLD_MS = 1500`, the climb formula, the 6 %-of-travel
step width per passed row, ink-then-tier, empty pos/gap until landing, past rows coloured:
all of it is for Nathan to eyeball on the phone and adjust. The Report Back must describe
the result precisely enough for him to ask for changes (§7 item 7). Do not spend tokens
polishing before he has seen it. All five constants live in one place
(`rankingRevealModel.ts`), exported, so the next round is a constants edit.

### R7 — Naming

The feature is the **ranking reveal**; the board is the **timing tower** (LAYOUT §3b's own
name for `TimingTower`). New file `app/src/ui/rankingRevealModel.ts`, new suite
`app/tests/rankingreveal_suite.ts`, RecordScreen state `reveal` / `revealDone`. Not
"tower reveal", not "podium", not "ceremony" (`ceremony` is already the tower's REFERENCE
SET frame prop, `tower.tsx:84–85`). GLOSSARY.md's current **Tower** entry describes the
live sector strip, which is not what the codebase calls the tower — Task 6 corrects it.

### R8 — Docs in the same commit

`STATE.md` (Scoring bullet, live-screen ground rule, "Where the app actually is", cycle
pointer), `GLOSSARY.md` (Tower corrected, Ranking reveal added), `OPEN-ITEMS.md` (on-device
check + tuning list). Small anchored edits, same commit as the code (cycle6 R8), so the docs
never describe an unbuilt feature or omit a built one.

### R9 — Out of scope (do not build, do not ask)

A settings toggle for the reveal; a haptic or earcon at landing (the reference's green chime
has no in-app analogue yet — a follow-up if Nathan wants it); reduced-motion handling for
the tower; per-row sequential stepping under `reveal === false` (Preview keeps its block
shift); an all-white past-row variant (R3's named alternative — wait for Nathan); any change
to RIDES/RESULTS static `P<n>` displays (`RidesScreen.tsx:~155`,
`ResultsDetailScreen.tsx:~73/170`); `getLiveTowerPosition` and its tests; the self dots,
`selfRaceModel.ts`, `WayMapView`; the sector strip / `colourModel.ts` / `results.ts` /
`towerModel.ts` semantics; DEMO tab; `app/core/`; the marketing renders.

---

## 1. Rules

- Touch only: `app/src/ui/tower.tsx` (additive props + the yellow case), the new
  `app/src/ui/rankingRevealModel.ts`, `app/src/ui/RecordScreen.tsx` (wiring), the new
  `app/tests/rankingreveal_suite.ts`, `app/tests/run.ts` (one registration line),
  `app/src/live/towerSource.ts` (doc comment only, Task 4 step 4), `STATE.md`,
  `GLOSSARY.md`, `OPEN-ITEMS.md`.
- Never edit `IDEAS.md`, `CLAUDE.md`, `Nathan/`, anything under `cycles/virgin-cycle1..10/`,
  `app/core/`, `app/src/ui/towerModel.ts`, `app/src/ui/colourModel.ts`,
  `app/src/store/**`, `app/src/ui/liveView.tsx`, `app/src/ui/chips.tsx`,
  `app/src/ui/preview/**`, `app/src/ui/selfRaceModel.ts`, `app/src/ui/wayMapView.tsx`,
  `marketing/**`. If a task below seems to need one of these, STOP and report why.
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name, never `-A`/`.`.
  Every git command with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- `git status --short` at start: untracked `cycles/virgin-cycle11/` and
  `marketing/audio-studio/piano/` are expected. Any *modification* already present in a file
  this brief touches → STOP and report it before writing anything.
- The new module follows the house pattern of `towerModel.ts` / `selfRaceModel.ts`: **pure,
  no React, no expo, no react-native imports**, headless-testable, `.ts`/`.tsx` extensions on
  imports as its neighbours use them (`towerModel.ts:22–26`), `import type` for anything
  from a `.tsx`.
- Every additive prop is optional with a documented default; nothing that exists today
  changes behaviour when the new thing is absent (the Preview screen must render
  identically except for yellow rows, R3).
- Stop-on-ambiguity applies to every "confirm" step below. Report verbatim.
- Nothing is done because it compiles. Each task ends with the check that proves it.

Confirm these before Task 1 and quote them in the report:

1. `app/src/ui/colourModel.ts:77–79` is `ghostsFor(wayId, excludeRideId?)` filtering
   `r.rideId !== excludeRideId` then `.slice(-WINDOW_PREV)`.
2. `app/src/ui/lastRide.ts:133` calls `pushRecorded(last, meta, sectors, derivedBy)` inside
   `rememberRide`, and `pushRecorded` (`211–226`) pushes onto the module-level `recorded`
   array that `recordedResults()` (`51–53`) returns and `rankedFor` (`colourModel.ts:64–68`)
   reads.
3. `app/src/ui/tower.tsx:63–74` `timeColor` has cases `purple`, `green`, `est`, default —
   and no `yellow`.
4. `app/src/ui/RecordScreen.tsx:1165–1173` is the `<LiveSectorPane vm={viewModelFromEngine(
   live, realTimebase(session.startedAtMs), getLiveTowerPosition(live), tierOf, livePos)}
   showLap={showLap} />` call, and `1064` opens `if (phase === 'ending') {`.
5. `app/src/ui/RecordScreen.tsx:580–584` is `setPhase('ending'); setNaming(draft);` followed
   by `if (draft === null) setShowAnim('rev');`, and `531–535` sets `endedRef.current`,
   `finalState = liveEngine.getState()`, then `rememberRide(finalState, …)`.

Any mismatch → STOP.

---

## 2. Task 1 — `app/src/ui/rankingRevealModel.ts` (pure model)

Create the module with this public surface (names binding; internals yours). File header
doc-comment: what it is (the provider seam between the finished live state and
`TimingTower` for the post-STOP reveal), R4's null cases, R5's exclusion trap, and that
every constant is a starting point (R6).

```ts
import type { LiveEngineState } from '../live/engine.ts';   // exported at engine.ts:297
import type { RideResult } from '../store/types.ts';
import type { Tier } from './chips.tsx';
import type { TowerModel } from './tower.tsx';
import { buildTowerModel } from './towerModel.ts';
import { allTimeBestLapS, ghostsFor } from './colourModel.ts';
import { scoredS } from '../store/timing.ts';

/** Settle time between the 'ending' screen appearing and the climb starting. */
export const REVEAL_START_DELAY_MS = 500;
/** How long the landed board holds before the naming card / reverse mark. */
export const REVEAL_HOLD_MS = 1500;
export const CLIMB_MIN_MS = 600;
export const CLIMB_PER_ROW_MS = 200;
export const CLIMB_MAX_MS = 2200;

export interface RankingReveal {
  model: TowerModel;      // today's row in place, from buildTowerModel — never hand-built
  pos: number;            // today's 1-based rank in the pool
  of: number;             // pool size = window + 1, <= WINDOW_N
  tier: Tier;             // today's earned tier (what the flip lands on)
  rowsPassed: number;     // rows below today in the full model
  climbMs: number;        // climbMsFor(rowsPassed)
}

/** clamp(CLIMB_MIN_MS + CLIMB_PER_ROW_MS * rowsPassed, CLIMB_MIN_MS, CLIMB_MAX_MS) */
export function climbMsFor(rowsPassed: number): number;

/**
 * null (no reveal, R4) when: st.track === null, st.lap === null, st.lap.estimated,
 * scoredS(st.lap) === null, or the window is empty. Otherwise the board for
 * `window` + today. `window` and `allTimeBestS` are injectable for headless tests and
 * default to the store reads — ghostsFor(st.track, rideId) WITH the exclusion (R5).
 */
export function buildRankingReveal(
  st: Pick<LiveEngineState, 'track' | 'lap'>,
  rideId: string,
  startedAtMs: number,
  window: RideResult[] = st.track === null ? [] : ghostsFor(st.track, rideId),
  allTimeBestS: number | null = st.track === null ? null : allTimeBestLapS(st.track),
): RankingReveal | null;
```

Implementation notes: `pos`/`tier` come from the `today` row of `model.rows` (find by
`r.today`); `rowsPassed = model.rows.length - 1 - todayIdx`; `of = model.rows.length`. Do
not re-sort, re-rank or re-tier anything — `buildTowerModel` is the only place that does
that. If `model.rows` somehow has no `today` row or a `pos === null` today (cannot happen
after the estimated/null guards — belt-and-braces), return `null`, never a partial reveal.

Check: `cd app && ./node_modules/.bin/tsc --noEmit` clean; the module imports nothing from
react/react-native (grep it).

## 3. Task 2 — `TimingTower`: `reveal`, `climbMs`, `startDelayMs` (+ yellow)

In `app/src/ui/tower.tsx`, re-read 24–29 (imports), 56–61 (constants), 63–74 (`timeColor`),
76–95 (signature + refs), 97–111 (pre-scroll, `belowDist`), 113–128 (effect), 143–144
(interpolations), 146–199 (render) first.

1. **Yellow.** Add `YELLOW_TIER` to the `./chips` import (it is re-exported there, alongside
   the existing `PURPLE_INK` import at 27) and `case 'yellow': return YELLOW_TIER;` to
   `timeColor` above the `default`. Leave the D-022 comment on `default` as is.

2. **Props.** Extend the signature (after `ceremony`, before `onPlayed`):
   ```ts
   /** virgin-cycle11 ranking reveal: today rides up in plain ink with no P/gap, passed
    *  rows step down one at a time, and pos + gap + tier colour appear as a HARD CUT at
    *  the landing instant (never a fade — same rule as the sector strip). Only
    *  meaningful with `justFinished`. Default false = the Preview's original slot-in. */
   reveal?: boolean;
   /** travel duration; default SLOT_IN_MS. The reveal passes climbMsFor(). */
   climbMs?: number;
   /** delay before travel starts; default 0. */
   startDelayMs?: number;
   ```
   with defaults `reveal = false, climbMs = SLOT_IN_MS, startDelayMs = 0`.

3. **Landed state.** `const [landed, setLanded] = useState(!(justFinished && reveal));` —
   set at *first render* (a `true` initial value would flash the landed row for a frame,
   which is exactly the spoiler this brief exists to remove). Add a `mounted` ref
   (`useRef(true)` + cleanup effect setting it false) so the completion callback never sets
   state on an unmounted tower.

4. **Effect.** Replace the single `Animated.sequence([...]).start(onPlayed)` (113–128) with
   the same two steps split at the landing instant so the flip can happen between them:
   ```ts
   Animated.timing(travel, {
     toValue: 0, duration: climbMs, delay: startDelayMs,
     easing: Easing.out(Easing.cubic), useNativeDriver: true,
   }).start(() => {
     if (!mounted.current) return;
     setLanded(true); // the hard cut: pos, gap, tier colour appear this frame
     Animated.timing(arrive, { toValue: 1, duration: ARRIVE_MS, useNativeDriver: true })
       .start(() => onPlayed?.());
   });
   ```
   Guard (`!justFinished || played.current || todayIdx < 0`), `played.current = true`,
   `travel.setValue(1)`, `arrive.setValue(0)` and the `[justFinished]` deps stay exactly as
   they are. With the defaults (`reveal` false, `climbMs` 700, delay 0) this is the same
   choreography as before — travel, then arrive — the Preview's slot-in is unchanged.

5. **Today row (152–176).** Three expressions become landing-aware:
   - pos text: `reveal && !landed ? '' : r.pos !== null ? \`P${r.pos}\` : '—'`
   - time colour: `reveal && !landed ? t.text : timeColor(r.tier, t)` (the PB ● stays as
     is — it is a fact about the time, not a verdict; if Nathan wants it held back too it
     is the same expression);
   - gap text: `reveal && !landed ? '' : r.gap`.
   The cells keep their fixed widths (`pos` 40, `timeToday` 160, `gap` flex) so nothing
   reflows at the flip.

6. **Passed rows step one at a time (178–197).** Today's `todayShift` interpolation is
   unchanged. For each passed row compute `k = i - todayIdx` (1 = the row directly under
   today's final slot, `m = rows.length - 1 - todayIdx` = the bottom-most). When
   `reveal && belowDist > 0`:
   ```ts
   const STEP_W = 0.06;                       // width of one step, as a fraction of travel
   const vk = Math.min(1 - STEP_W, Math.max(0, ((k - 0.5) * PAST_H) / belowDist));
   const shift = travel.interpolate({
     inputRange: [0, vk, vk + STEP_W, 1],
     outputRange: [0, 0, -todayBlockH, -todayBlockH],
   });
   ```
   Derivation: `travel` runs 1 → 0; today's top sits `travel × belowDist` below its final
   slot; a passed row, before it steps, sits `todayBlockH` above its final slot, i.e. its
   top is at `(k − 1) × PAST_H` below today's final top. The reference bumps a row when
   Today's top is half a slot below that row's top → `travel × belowDist = (k − 0.5) ×
   PAST_H`. Below `vk` (today has passed) the row is at its final place (0); above `vk +
   STEP_W` it is still lifted (`−todayBlockH`). The bottom row (`k = m`) has `vk ≈ 1 −
   0.5/m` and steps almost at once; the top one (`k = 1`) steps when today is nearly home.
   Otherwise (no reveal) keep `belowShift` exactly as today. `inputRange` must be
   non-decreasing — the clamps above guarantee it; if React Native rejects it at runtime
   on the device (Report Back), STOP.

7. Doc-comment: add one paragraph to the file header (1–23) describing the reveal mode
   and that it is the real app's first provider (`RecordScreen.tsx` 'ending' phase,
   virgin-cycle11), replacing the "B-28 UNBUILT … the REAL app has no provider" sentence
   with the truth.

Check: `tsc` clean; `PreviewScreen.tsx` untouched and still compiles against the widened
signature; read the three expressions in step 5 back and confirm each has the `reveal &&
!landed` guard so the non-reveal path is byte-identical in output.

## 4. Task 3 — `RecordScreen.tsx`: state, `onEnd`, the 'ending' render

Re-read 36–48 (imports), 151–191 (state), 519–598 (`onEnd`), 600–670 (card exits),
822–827 (`tierOf`), 1064–1110 ('ending' render), 1165–1173 (`LiveSectorPane`), 1246–1256
(idle ScrollView + overlay pattern), 1482–1485 (`raceColumn`) first.

1. **Imports.** `import { TimingTower } from './tower';` and
   `import { buildRankingReveal, REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type RankingReveal }
   from './rankingRevealModel.ts';` (extension style: match line 48's `./selfRaceModel.ts`).
   Remove `import { getLiveTowerPosition } from '../live/towerSource';` (36) once step 5
   has removed its only use.

2. **State**, beside `endedRef` (190):
   ```ts
   // virgin-cycle11 ranking reveal — built in onEnd AFTER rememberRide (R5), shown by
   // the 'ending' render; null = no reveal (R4), screen behaves exactly as before.
   const [reveal, setReveal] = useState<RankingReveal | null>(null);
   const [revealDone, setRevealDone] = useState(true);
   // What the 'ending' screen does once the reveal has played: mount the card, or start
   // the reverse mark. A ref, not a closure over `naming` — the tower's onPlayed fires
   // from an animation callback captured at mount (same reason endedRef exists).
   const postRevealRef = useRef<'card' | 'rev'>('rev');
   const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```
   Clear the hold timer on unmount with a dedicated effect placed next to the self-dots
   tick effect (the one whose cleanup is `return () => clearInterval(id);` near 899):
   `useEffect(() => () => { if (revealHoldRef.current) clearTimeout(revealHoldRef.current); }, []);`

3. **`onEnd`.** After `rememberRide(finalState, …)` (534) and before `stopTracking()`:
   ```ts
   const nextReveal = s ? buildRankingReveal(finalState, s.rideId, s.startedAtMs) : null;
   ```
   Then at 580–584 replace
   ```ts
   setPhase('ending');
   setNaming(draft);
   if (draft === null) setShowAnim('rev');
   ```
   with
   ```ts
   setReveal(nextReveal);
   setRevealDone(nextReveal === null);
   postRevealRef.current = draft === null ? 'rev' : 'card';
   setPhase('ending');
   setNaming(draft);
   // No reveal: the reverse mark plays at once, exactly as before. With a reveal it
   // waits for onRevealPlayed (below).
   if (draft === null && nextReveal === null) setShowAnim('rev');
   ```
   Keep the surrounding comments. The `catch` path is unchanged (it never reached the flip).

4. **`onRevealPlayed`** (a `useCallback([])` beside the card exits):
   ```ts
   const onRevealPlayed = useCallback(() => {
     revealHoldRef.current = setTimeout(() => {
       revealHoldRef.current = null;
       setRevealDone(true);
       if (postRevealRef.current === 'rev') setShowAnim('rev');
     }, REVEAL_HOLD_MS);
   }, []);
   ```

5. **Running phase (1165–1173).** Two edits, each one line:
   - `getLiveTowerPosition(live), // real position once the lap lands` →
     `null, // virgin-cycle11 R1: the rank is revealed after STOP by the tower, never here`
   - `tierOf,` → `tierOfLive,` where, directly under `tierOf` (827):
     ```ts
     // virgin-cycle11 R1: sector index 0 is "the whole lap" (liveView.tsx:197–198). Its
     // tier is the rank announcement in disguise — a purple lap chip says P1 — so the
     // live pane shows the lap as 'neutral' (no verdict yet) and the tower reveals the
     // tier after STOP. Sectors and the flash keep their live colours.
     const tierOfLive = (sectorIndex: number, timeS: number | null): Tier =>
       sectorIndex === 0 ? 'neutral' : tierOf(sectorIndex, timeS);
     ```
     Confirm first that `tierOf`'s other callers (the WP-K sector-spans memo near 834+)
     are unaffected — they call `tierOf`, not `tierOfLive`. Also update the stale JSX
     comment above the pane (1160–1164, "posChip is null until the B-28 … store exists") to
     say what is now true. Revert-line for Nathan: `tierOfLive` → `tierOf`.

6. **'ending' render (1064–1110).** Target shape (keep every existing prop/handler on the
   cards and the `LaunchAnimation` verbatim; only the wrapping and the two insertions are
   new):
   ```tsx
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
             {reveal !== null
               ? 'Ride saved.' // the tower's TODAY row is the headline (R2)
               : lastSummary ? `Ride saved — ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}.` : 'Ride saved.'}
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
           {revealDone ? (
             adjust !== null ? ( <GateAdjustCard … unchanged … /> )
             : naming !== null ? ( <RouteNamingCard … unchanged … /> )
             : null
           ) : null}
         </ScrollView>
         {showAnim === 'rev' && ( <LaunchAnimation reverse onDone={…unchanged…} /> )}
       </View>
     );
   }
   ```
   The `<View style={{ flex: 1 }} />` spacer (1093) goes — the ScrollView takes the flex.
   In the `LaunchAnimation` `onDone` add `setReveal(null);` next to `setShowAnim(null)` so a
   board never survives into the next ride's 'ending'. `raceColumn` (1482) already has
   `gap: 8` and `alignSelf: 'stretch'`; the tower's own style is `alignSelf: 'stretch'`
   (`tower.tsx:203`), so it fills the column width. Confirm `LaunchAnimation` positions
   itself absolutely (`launchAnimation.tsx`; the 1246–1249 comment says "absolute inset 0
   with zIndex 1000") — if it does not, STOP.

   `justFinished` is passed as a constant `true` for the life of the 'ending' phase: the
   tower's `travel`/`arrive` initial values are read at construction, and the `played` ref
   makes it play exactly once. Do not gate it on any state that could be false at the
   first 'ending' render.

7. `RecordPhase` (`recordFlow.ts`) is not changed — 'ending' is still one phase; the
   reveal is state within it.

Check: `tsc` clean. Read `onEnd` top to bottom once more and confirm the order
`finalize → endedRef → getState → rememberRide → buildRankingReveal → stopTracking → …
→ setReveal/setRevealDone/postRevealRef → setPhase('ending') → setNaming → rev-if-neither`.

## 5. Task 4 — Doc comments that would otherwise lie

1. `app/src/live/towerSource.ts:30–35` doc block: append a sentence — "virgin-cycle11: the
   live pane no longer passes this to `LiveSectorPane` (RecordScreen passes null); the rank
   is revealed after STOP by the timing tower (`ui/rankingRevealModel.ts`, which uses
   `ghostsFor(way, rideId)` *with* exclusion because the ride is stored by then). Kept as
   the canonical 'a position needs no priors' rule and for `live_colour_suite.ts`." No code
   change in that file.
2. `liveView.tsx` is on the do-not-touch list; its header's "(B-28 UNBUILT on the real
   screen)" wording about the `PosChip` stays stale by one cycle — note it in the report as
   a one-line follow-up, do not edit.

## 6. Task 5 — Tests: `app/tests/rankingreveal_suite.ts`

Register it in `app/tests/run.ts` directly after `import './selfrace_suite.ts';` (49). Copy
`towermodel_suite.ts`'s preamble (1–26: `registerHooks` JSON loader, `assert`/`test` from
`./lib.ts`, dynamic `await import`) and its `ride()` literal helper (28–40), adding a
`source: 'app'` default and a `rideId` parameter. Import `buildRankingReveal`, `climbMsFor`
and the `CLIMB_*` constants from `../src/ui/rankingRevealModel.ts`; `ghostsFor`, `WINDOW_N`,
`fmt` from `../src/ui/colourModel.ts`; `rememberRide`, `resetRecordedForTests` from
`../src/ui/lastRide.ts`. Reuse `live_colour_suite.ts:44–52`'s `stateWith()` shape for a
finished `LiveEngineState` literal (copy it; do not import across suites unless the house
already does — check). Cases, each named so a failure reads as a sentence:

- **No reveal without a way, a lap, or a real time.** `track: null` → null; `lap: null` →
  null; `lap.estimated: true` → null; `lap.movingS: null` (rawS 700) → null in raw mode
  too (`scoredS` marker, R4).
- **Ride 1 gets no reveal.** Injected `window = []` → null (the reference-ride rule).
- **Ride 2 gets a two-row reveal, purple or yellow, never green.** Window of one (600 s);
  today 580 → `pos 1, of 2, tier 'purple', rowsPassed 1, climbMs 800`; today 620 →
  `pos 2, of 2, tier 'yellow', rowsPassed 0, climbMs 600`.
- **Full window: of is 10, never 11.** Injected window of nine → `of === 10`; today fastest
  → `pos 1, rowsPassed 9, climbMs === CLIMB_MAX_MS`; today slowest → `pos 10, rowsPassed 0`.
  Assert `of <= WINDOW_N` in every case above.
- **The board is `buildTowerModel`'s, not a hand-built one.** For the nine-row case, the
  `today` row's `pos` equals `reveal.pos`, `model.rows.length === reveal.of`, rows are
  ascending by time, and exactly one row has `today: true`.
- **Self-exclusion after `rememberRide` (the R5 trap — mirror `live_colour_suite.ts:347–355`).**
  `resetRecordedForTests()`; pick the seeded way that test uses (`'EveningA'`, ten previous
  rides in the shipped seed the headless suite pins) and a distinctive lap (e.g. rawS =
  movingS = 601 → `fmt` gives `'10:01'`; confirm no seed row on that way prints the same);
  `before = ghostsFor(way).length` (expect 9); `rememberRide(stateWith({ track: way, lap:
  {…601…} }), { rideId: 'test:reveal-today', startedAtMs })`; then
  `buildRankingReveal(state, 'test:reveal-today', startedAtMs)` **with default arguments**
  (the real store path). Assert: `of === before + 1 === 10`; exactly ONE row prints
  `'10:01'`; `ghostsFor(way, 'test:reveal-today').every(r => r.rideId !== 'test:reveal-today')`.
  Then `resetRecordedForTests()`. If the seeded way or its count differs from what
  `live_colour_suite` asserts today (`:307–308` pins EveningA at 10 ranked seed rides),
  STOP — don't pick another way silently. Two things to know going in: (a) `rememberRide`
  *with* `meta` also calls `resultsStore.saveResult()`; headless, with no armed fs adapter,
  that is an in-memory no-op that swallows its own errors (`resultsStore.ts:122–130`,
  `234–245`) — confirm by reading, and if a later suite in `run.ts` order turns out to see
  the leaked in-memory entry, STOP; (b) use the finished-state helper shape from
  `live_colour_suite.ts:229–235` (real `'done'` sectors), not the bare `stateWith`, so the
  stored result is the honest clean shape.
- **`climbMsFor`.** 0 → 600, 1 → 800, 8 → 2200, 20 → 2200 (clamped), and it equals the
  constants arithmetic (`CLIMB_MIN_MS + CLIMB_PER_ROW_MS * n` inside the range).
- **`allTimeBestS` reaches the PB ●.** Nine-row window where today equals the injected
  `allTimeBestS` → today's row `pb === true` and no other row has it.

Zero FAIL on the whole suite, not just this file. The tower component itself (`.tsx`,
React) is not unit-tested by the house pattern; Inspect reads it.

## 7. Task 6 — Docs (same commit as the code)

Small anchored edits; re-read each target line first.

- `STATE.md`
  - Scoring bullet (the one ending "never a global ranking, never 'of 11'"): append
    "**Since virgin-cycle11 the rank is revealed after STOP, not at the final gate:** the
    timing tower (`ui/tower.tsx`, real data via `ui/rankingRevealModel.ts`) climbs today's
    row from the bottom to its place in the same ≤ 9-plus-today window and flips it to its
    tier colour on landing; before STOP the lap chip shows the time only (neutral, no
    P-chip). Ride 1 and estimated laps get no reveal — plain 'Ride saved'."
  - Live-screen ground rule (the "**The live ride screen shows a real map**" bullet): append
    "**Since virgin-cycle11:** no rank and no lap tier before STOP (R1); the ranking reveal
    plays on the 'ending' screen, above the naming card."
  - "Where the app actually is": one new bullet "**Ranking reveal is built (virgin-cycle11)**"
    naming the three files, the constants' home, and R4's null cases.
  - "Cycle history": `cycles/virgin-cycle11/README.md` pointer line (the README itself is
    the coordinator's to write when the cycle closes — do not create it).
- `GLOSSARY.md:55–56` — replace the **Tower** entry: "**Tower (timing tower).** The ranked
  column of your recent laps on a way — the last nine plus today, fastest first — that
  appears when you stop the ride. Today's row climbs from the bottom to its place and takes
  its colour the instant it lands: the *ranking reveal*. (The thin bars under the live lap
  clock are the *sector strip*, not the tower.)" Add, alphabetically, "**Ranking reveal.**
  The moment after STOP when the tower shows where today's lap landed — held back until you
  actually stop so the rank is a payoff, not a spoiler. A way's very first ride has nothing
  to climb past and gets 'Ride saved' instead."
- `OPEN-ITEMS.md` — under "The virgin-prototype path, in order", add item 6:
  "**virgin-cycle11 ranking reveal — on-device look (phone only).** Ride a way with ≥ 1
  prior ride; at STOP expect: lap time in neutral (no P, no colour) at the final gate; on
  STOP the tower with today parked at the bottom in plain ink; ~0.5 s later the climb; rows
  step down one by one; a hard colour + P<n> cut at landing; ~1.5 s hold; then the naming
  card beneath (Skip → reverse mark → ride detail). Ride 1 of a new way: no tower. Tune:
  `REVEAL_START_DELAY_MS`, `REVEAL_HOLD_MS`, `CLIMB_*` (`ui/rankingRevealModel.ts`),
  `STEP_W` (`ui/tower.tsx`), past rows coloured vs all-white (R3), lap-chip tier before
  STOP (R1)." Under Parked: "reduced-motion / haptic at landing for the reveal (R9)".

---

## 8. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; record the totals
   before (run it once at start, on the untouched tree) and after — the new suite adds
   cases; report the delta. STATE.md's last recorded baseline is 560 / 557 / 0 / 3 but is
   from cycle5; the true "before" is whatever the untouched tree prints today.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0. Not bare `npx tsc` (mount budget).
3. Re-read `git diff --stat`: only the files in §1 Rules. Anything else → STOP.
4. Commit by name (`git add app/src/ui/tower.tsx app/src/ui/rankingRevealModel.ts
   app/src/ui/RecordScreen.tsx app/src/live/towerSource.ts app/tests/rankingreveal_suite.ts
   app/tests/run.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`). Message:

```
virgin-cycle11: ranking reveal — the timing tower climbs after STOP

The rank is no longer announced at the final gate. Before STOP the live pane
shows the lap time only (neutral, no PosChip); on STOP the 'ending' screen
mounts the existing TimingTower with real data for the first time — the same
<= 9-plus-today window (colourModel.ghostsFor, with today excluded because
rememberRide has already stored it) through buildTowerModel — and today's row
climbs from the bottom in plain ink, passed rows stepping down one by one,
then hard-cuts to its tier colour + P<n> on landing (reference: marketing
ranking v7). Ride 1, estimated laps and free rides get no reveal. Additive
TimingTower props (reveal, climbMs, startDelayMs) + the missing yellow case
in timeColor; new pure rankingRevealModel.ts + tests; STATE/GLOSSARY/
OPEN-ITEMS updated. Preview, self dots, sector strip, RIDES/RESULTS untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403 from the proxy, cycle5/cycle6 precedent) —
say so, do not retry more than once.

---

## 9. Report back

In this order, verbatim where asked:

1. HEAD at start, `git status --short` at start, and the commit hash at end.
2. The five §1 anchor confirmations, quoted as found.
3. Task 2: the final `timeColor` switch, the effect block, and the passed-row interpolation
   as committed (verbatim — Inspect will check the formula and the `reveal && !landed`
   guards against this brief).
4. Task 3: the `onEnd` order as committed (the arrow list from Task 3's check), the
   `tierOfLive` lines, and whether `LaunchAnimation` was confirmed absolute-fill.
5. Task 5: which seeded way and lap value the self-exclusion test used, and `before`/`of`
   as printed.
6. Test totals before/after; `tsc` result.
7. **A plain-language description of what the reveal looks like with the R5/R6 defaults**
   — for a P2-of-10 finish and for a P2-of-2 finish — so Nathan can react before riding:
   what shows at the final gate, what the 'ending' screen shows in its first frame, how long
   the climb takes, what happens at landing, what appears after the hold. Include the
   OPEN-ITEMS on-device checklist.
8. Tokens used (this tier); the tier | model | tokens | outcome row for the coordinator's
   table.
9. Every STOP you hit and did not resolve (there should be none you resolved yourself),
   and the one noted follow-up (the stale `liveView.tsx` header wording, Task 4 step 2).
