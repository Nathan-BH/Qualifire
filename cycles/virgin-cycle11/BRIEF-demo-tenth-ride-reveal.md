# BRIEF B — DEMO tab: TENTH RIDE, the whole-board ranking reveal after the demo's STOP, and the card beneath it

**Revised 2026-09-19 after Nathan's `QUESTIONSFORNATHAN.md` answers — see items 1, 4, 6, 8.**
The original (written the same day, pre-A) is superseded in place; nothing of it had been
executed. What changed: the tower now shows the WHOLE ranking pool (item 1 — a real-screen
change to `tower.tsx`/`towerModel.ts`, ruled below); after the reveal's hold SECOND/TENTH
RIDE mount the real `RouteNamingCard` in its WP-G "new way on this route" variant instead of a
placeholder DONE bar (item 8); the map-colour / settings-reactivity ruling is written down
(item 4); brief A's `STATE.md` regression is repaired here (§6). Items 2, 3, 5 are confirmed
and kept as designed.

**Written 2026-09-19 UTC (Plan tier, fable). Brief 2 of 4 for the DEMO tab overhaul — build
order A → B → C → D (D may run before C, never before B).** Depends on
`BRIEF-demo-fullscreen-run.md` (A) being committed — it is: `8df1119` (subject "DEMO tab —
RUN DEMO RIDE goes full-screen and ends like a ride (brief A)"). This brief edits the
`DemoPhase` / `enterEnding` / 'ending'-render shapes A created and the `demoLiveViewModel` A
moved into `demoModel.ts`. `BRIEF-demo-self-dots.md` (C) depends on the nine-column fixture
and the `'tenth'` mode this brief adds; `BRIEF-demo-gate-adjust.md` (D) depends on the
`savedLine` state and the `revealDone` gating this brief introduces in the ending render.

Nathan's ask (his items 2 and 3, unedited): *"for SECOND RIDE or TENTH RIDE option, let me
see the end ranking animation like it would normally be"* — *"3) add a third DEMO option
which is TENTH ride, so i can see the ranking tower animation properly."* And his answers of
2026-09-19 (`QUESTIONSFORNATHAN.md`): item 1 *"I would show all 10 rows if possible like I
have it in the render. And the 'today' ride, should displace the 10 so it gets kicked off the
ranking so we always stay with 10 rides … If 10 rides cannot fit, you can always make the
window scrollable"*; item 8 *"yes add everything for show to get the real experience"*; item
4 *"Keep the colours just in the strips. remove it from the map; but have the demo switch
together with the real app settings, if the toggle changes, the demo should update
accordingly; same for the 'selfs' racing"*.

Anchors were read from the live `virgin` tree at HEAD `8df1119` on 2026-09-19:
`ui/DemoScreen.tsx` (417 lines), `ui/demoModel.ts` (141), `ui/tower.tsx` (297),
`ui/towerModel.ts`, `ui/rankingRevealModel.ts` (98), `ui/colourModel.ts` (`WINDOW_N = 10`
`:29`, `WINDOW_PREV = WINDOW_N - 1` `:36`, `ghostsFor` `.slice(-WINDOW_PREV)` `:78`),
`ui/routeNamingCard.tsx` (238), `ui/settings.tsx` (`SettingsProvider` `:88–123`,
`useSettings` `:125`), `ui/preview/data.ts` (`TOWER_ORDINARY`, 19 rows, `:346–367`),
`store/types.ts`, `tests/rankingreveal_suite.ts`, `tests/towermodel_suite.ts`,
`tests/demo_suite.ts`, `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`. Executor: Sonnet,
stop-on-ambiguity — any anchor mismatch, any call this brief leaves open, any place where
the data turns out shaped differently: STOP and report file, line, and what is actually
there. Never guess; it goes to a fresh Fable.

---

## 0. Rulings (the part Nathan should read)

### R1 — The demo's reveal is the real `buildRankingReveal`, fed a synthetic window (unchanged)

`buildRankingReveal`'s `window` and `allTimeBestS` parameters are **injectable**
(`rankingRevealModel.ts:71–77`; the store reads are only the *defaults*, and a default
parameter expression is never evaluated when the argument is passed). The tower model comes
from `buildTowerModel(window, todayS, false, startedAtMs, allTimeBestS)` (`towerModel.ts`),
pure, over plain `RideResult` values. So the demo builds nine synthetic `RideResult`s from
its own pinned fixture and calls the real thing:

```ts
buildRankingReveal(
  { track: DEMO_WAY_ID, lap: { rawS: script.lap, stoppedS: 0, movingS: script.lap, estimated: false } },
  DEMO_TODAY_RIDE_ID, nowMs, demoPriorResults(priorLaps, nowMs), allTimeBest,
)
```

Every ranking, tier, gap, PB ● and `climbMs` Nathan sees is computed by the same code that
computes it after a real ride. `TimingTower` is mounted with the same props the real
'ending' screen passes (`justFinished`, `reveal`, `climbMs={reveal.climbMs}`,
`startDelayMs={REVEAL_START_DELAY_MS}`, `onPlayed`) and the same `REVEAL_HOLD_MS` hold —
constants imported from `rankingRevealModel.ts`, never copied. `rawS === movingS` on every
synthetic result, so `scoredS` gives the same number in both timing modes. Re-confirmed
after items 1 and 8: neither touches the builder — item 1 is a tower *rendering* cap, item 8
is what mounts *after* the hold.

### R2 — Three modes, each mode's history depth is honest, and TENTH is exactly the pool (confirmed, item 3)

`DemoMode = 'first' | 'second' | 'tenth'`. `DEMO_HISTORY` grows from six to **nine** laps per
sector, and a mode uses the **last `DEMO_PRIOR_LAPS[mode]` columns** — `first: 0`, `second:
1`, `tenth: WINDOW_PREV` (= 9, imported from `colourModel.ts`, never a literal) — mirroring
`ghostsFor`'s `.slice(-WINDOW_PREV)`. The same slice feeds the sector strip tiers, the map
spans, the tower window and (brief C) the self dots.

**Nathan's "the today ride should displace the 10 … so we always stay with 10 rides"**
(item 1) is a description of the real app's existing window rule, not new behaviour: the
pool is the judged ride plus its `WINDOW_PREV` most recent others, never more than
`WINDOW_N` (`colourModel.ts:89–101`, D-045 ruling 2); an eleventh ride pushes the oldest out
of the window. The demo's TENTH RIDE is that pool exactly — nine priors + today = `WINDOW_N`
rows — so there is nothing to displace in a fixture; the test in Task 4 pins
`buildDemoReveal('tenth').of === WINDOW_N` so the demo board and the rule can never drift
apart. (A tenth pinned prior that the window would drop was considered and rejected: it
would show nothing on screen and only prove `ghostsFor`, which `colourModel`'s own tests
already do.)

SECOND RIDE stays the honest ride-2 (one prior lap, two-row board, purple/yellow sectors —
`tierFor` at n = 1 cannot say green). Nathan, item 3: *"No this is correct."* TENTH RIDE is the
default pill.

### R3 — The nine laps, and where today lands (confirmed, item 2)

Existing six columns kept verbatim; three appended. Column = one prior lap, S1..S4 rows:

```
S1: [190, 195, 188, 200, 192, 197, 194, 198, 191]   best 188, mean 193.9
S2: [210, 205, 215, 208, 212, 206, 211, 216, 209]   best 205, mean 210.2
S3: [230, 225, 235, 228, 232, 226, 229, 238, 233]   best 225, mean 230.7
S4: [210, 205, 215, 208, 212, 206, 211, 213, 209]   best 205, mean 209.9
lap: 840  830  853  844  848  835  845  865  842    best 830, mean 844.7
```

Today stays `DEMO_SECS = [185, 207, 237, 207]`, lap 836. The executor re-verifies in Task 4's
tests, not by trusting this table:

- **TENTH RIDE (9 priors):** S1 purple, S2 green, S3 yellow, S4 green. Lap 836: **P3 of
  10** (behind 830 and 835), tier **green**, gap `+6s`, `rowsPassed 7`, `climbMs 2000`. The
  P1 row (830) carries the PB ●.
- **SECOND RIDE (1 prior = column 9, `[191, 209, 233, 209]` = 842):** S1 purple, S2 purple,
  S3 yellow, S4 purple. Lap 836: **P1 of 2**, tier **purple**, `rowsPassed 1`, `climbMs 800`;
  today's row carries the PB ● (R4).

Nathan, item 2: *"Lets just have one P3, good enough for a visual confirmation."* Kept.

Dates: prior lap *k* (1-based, oldest first) started `DEMO_PRIOR_DAYS_AGO[k-1]` days before
`nowMs`, `DEMO_PRIOR_DAYS_AGO = [16, 14, 13, 9, 8, 7, 6, 2, 1]`.

### R4 — `allTimeBestS` = the best of the priors *and today* (unchanged)

`buildRankingReveal`'s real default `allTimeBestLapS(track)` *does* see today's stored lap
(cycle11 R5). The demo passes `Math.min(...priorLaps, script.lap)` for the same reason.

### R5 — The tower shows the whole ranking pool: `MAX_VISIBLE` becomes `WINDOW_N` — a real-screen change, on Nathan's ruling (item 1)

**Before:** `tower.tsx:65` `const MAX_VISIBLE = 8; // rows without scroll [ASSUMPTION §3b — PO's
window call]` — an assumption that has been waiting for the PO's call since B-28. With 10 rows
and today at index 2 the pre-scroll (`:136–139`) shows rows 1–8, clips 9–10, and today climbs
from the eighth visible slot passing five rows while `climbMs` is scaled for the seven it
really passes — the cycle11 Inspect note.

**Nathan's call:** all 10 rows, like his render. **Ruling: the cap is raised for every
consumer, not just the demo.** Two reasons. (1) The whole point of the demo since brief A R2
is "a representation of how the current race screen is"; a demo board with ten rows over a
real board with eight would be exactly the dishonesty R2 refused for map colours. (2) The
question Nathan answered was framed on the real screen ("Left exactly as the real app does
it so you can see it. Keep as is / show all 10 rows …") — he chose the real-screen option.
Mechanism:

- `towerModel.ts` (pure, already imports from `colourModel.ts`) exports
  `TOWER_MAX_VISIBLE = WINDOW_N` with a comment naming this ruling. It lives beside the
  window rule it must equal so a headless test can pin it (`tests/towermodel_suite.ts`).
- `tower.tsx` imports it (`import { TOWER_MAX_VISIBLE } from './towerModel.ts'` — a value
  import; `towerModel.ts`'s import of `tower.tsx` is `import type`, erased at compile, so no
  runtime cycle) and its local `MAX_VISIBLE` becomes an alias of it. **The pre-scroll and
  `⋮ N more below` / `⋮ P1–Pn above` logic stays untouched** as a guard for a model larger
  than the pool — the Preview screen's scripted 19-row `TOWER_ORDINARY` (`preview/data.ts:346`)
  still clips, now at 10 rows (start 3, rows P4–P13). Nothing else in `tower.tsx` changes:
  not `climbMsFor`, not `STEP_W`, not the row heights.
- **Fit on the phone:** 9 × 38 + 56 = 398 px of rows plus the headline. Both hosts of the
  reveal — `RecordScreen.tsx`'s 'ending' (`:1116–1120`) and A's demo 'ending'
  (`DemoScreen.tsx:300–305`) — are already a `ScrollView` column, which is Nathan's own
  fallback ("make the window scrollable"). The tower itself stays a plain `View`: a nested
  vertical `ScrollView` around `Animated` rows would fight the host scroll and the climb.
  The rows are never clipped by the tower any more; on a very short screen the board's
  bottom scrolls, and today's row starts its climb from wherever row 10 sits — which is what
  a real 10-ride board does too.
- **Consequence for the real app, stated plainly:** every 'ending' board with ≤ 10 rides now
  shows every ride. Since the pool is capped at `WINDOW_N` (R2), the clip lines can no longer
  appear on a real board at all; they remain for the Preview screen and as a guard.

With that, TENTH RIDE's climb passes all seven rows it is timed for. The old R5's "left
as-is so Nathan can see it" is withdrawn — he has seen it and ruled.

### R6 — The 'ending' sequence for SECOND / TENTH RIDE mirrors the real one, card included (item 8)

`enterEnding()` (A) additionally builds the reveal (`buildDemoReveal(mode, Date.now())`) and
sets `revealDone = reveal === null`. The 'ending' render shows, in order: headline `Ride
saved.` (the tower's TODAY row is the headline, cycle11 R2), the `TimingTower` in reveal
mode, and — **only after `onPlayed` + `REVEAL_HOLD_MS`** — **the real `RouteNamingCard`**, in
the slot the real screen gives it (`RecordScreen.tsx:1139–1162`: `revealDone ? adjust ?
GateAdjustCard : naming ? RouteNamingCard : null`). No DONE bar any more (A's placeholder,
`DemoScreen.tsx:327–330`, goes).

**Which card, honestly.** A real second/tenth ride that follows the known way exactly gets
**no card**: `draftRouteCreation` returns null, `postRevealRef` is `'rev'`, and the reverse
mark plays straight after the hold (`RecordScreen.tsx:600–605, 618–626`). The card the
question described and Nathan said yes to is WP-G's **"new way on this route"** variant —
what the real screen shows when the engine *scored* the ride against a way (so the strip
and the tower are real) but the route-drafting found the ride did not follow any of the
route's known ways: `existingRoute` set *and* `matchedWayLabel` set, title `New way on
Home → Work`, sub-copy *"Scored as Home → Work. Was this a different way? Add what made it
different …"*, ≥ 1 specification required, button `ADD WAY`, skip `no — it was Home → Work`
(`routeNamingCard.tsx:88–94, 139, 201, 205–207`). That is a real screen a real rider sees,
and it is the one with something to fill in — so it is what the demo shows, in both SECOND
and TENTH RIDE. Endpoints are fixed text by the variant's own design (the route exists), so
the demo names them: `DEMO_ROUTE_LABEL = 'Home → Work'` — this is *not* the item-6 pre-fill
Nathan objected to (that was FIRST RIDE's two inputs, which are and stay blank; see R7).

Props (exact — `routeNamingCard.tsx:27–48`):

```tsx
<RouteNamingCard
  startExistingLabel={DEMO_ROUTE_START} endExistingLabel={DEMO_ROUTE_END} loop={false} busy={busy}
  matchedWayLabel={DEMO_ROUTE_LABEL}
  existingRoute={{ label: DEMO_ROUTE_LABEL, knownSpecLists: [[]] }}   // the plain way is the one ridden
  vocabulary={DEMO_SPEC_VOCABULARY}                                   // ['Dry', 'Wet', 'Fast'] — chips for show
  onSave={onDemoAddWaySave} onSkip={onDemoNamingSkip}
/>
```

`knownSpecLists: [[]]` = the route's one existing way has no specs, so any typed spec list is
non-duplicate and `ADD WAY` enables once ≥ 1 spec is committed (`:69–70`); the three
vocabulary chips render through the real `specSuggestions` (`store/waySpecs.ts:94–125`, "then
every other value in the vocabulary").

- **SKIP** → reverse mark → idle (A's `onDemoNamingSkip`).
- **ADD WAY** → `busy` for `DEMO_FAKE_SAVE_MS`, then the card is replaced by one confirmation
  line — `demoAddedWayLine(DEMO_ROUTE_LABEL, names.specs)` = `` `Home → Work · Dry added as a new
  way · demo only, nothing saved` `` — held `DEMO_SAVED_HOLD_MS`, then the reverse mark → idle.
  Nothing is written (A's grep still passes).

To carry both lines (A's FIRST RIDE `demoSavedLine`, this one, and brief D's), A's `saved:
RouteNames | null` becomes **`savedLine: string | null`** — the text itself; the handlers
build it with the pure functions. FIRST RIDE's behaviour is byte-identical.

The reveal hold timer is a ref cleared on exit and on unmount, as `revealHoldRef` is in
`RecordScreen.tsx`.

### R7 — Map colours and live settings (item 4); FIRST RIDE's card (item 6) — confirmations, one verification task, no rewiring

**Item 4, read for intent.** The question offered two options: keep the demo map on the
real `sectorColours` toggle (A's R2, default OFF since cycle9 — strips coloured, map plain),
or force the colours on. Nathan: *"Keep the colours just in the strips. remove it from the
map; but have the demo switch together with the real app settings, if the toggle changes,
the demo should update accordingly; same for the 'selfs' racing, the settings toggle changes
should be reflected in the demo."* Ruling: **the first sentence describes the default state
(toggle OFF → colours in the strip only, plain map — i.e. "don't force them on", the old
always-coloured demo is what "remove it from the map" is relative to), and the rest is the
requirement: the demo follows the toggles, live.** The alternative reading — the demo map
never colours regardless of the toggle — would make "if the toggle changes, the demo should
update accordingly" vacuous for `sectorColours`, and breaks the parallel he draws with the
`selfDots` toggle (whose whole effect is on the demo map). So A's wiring
(`DemoScreen.tsx:252–254`: `settings.sectorColours ? demoSectorColours(...) : ALL_YELLOW`) is
**correct in substance and stays**. If Nathan did mean "never on the demo map", it is one
line (`ALL_YELLOW` unconditionally) — recorded in `QUESTIONSFORNATHAN.md`.

**Live-reactivity, verified by reading.** `useSettings()` is a context (`settings.tsx:71,
125`); the provider's `value` is re-memoised on every change (`:119–122`), so every consumer
re-renders with the new value. `DemoScreen.tsx` reads `settings.liveMap` (`:269`),
`settings.sectorColours` (`:252`) and `settings.earcons` (`:121`, inside an effect with it in
deps) at **render/effect level — never inside `start()`'s interval closure (`:195–205`) or a
`[]` `useCallback`**. Nothing caches a setting at run-start. Brief C must keep `selfDots` the
same way (its own R4/Task 2 say so). Task 3 below is the executor's check of this fact after
the edits, and adds the one thing that could go stale: `enterEnding`'s `mode` dependency.

What Nathan will actually do: while the demo runs full-screen the tab bar is hidden, so a
toggle cannot be flipped *mid-run*; he flips it in SETTINGS and comes back to DEMO. Switching
tabs unmounts `DemoScreen` (`App.tsx:210–217` renders one screen per tab), so the next RUN
reads the current value by construction. Both routes to "the demo follows the toggle" hold;
neither needs code.

**Item 6, confirmed against `8df1119`.** The FIRST RIDE card mounts with
`startExistingLabel={null} endExistingLabel={null}` (`DemoScreen.tsx:314–324`) → two blank
`TextInput`s (`routeNamingCard.tsx:52–53` `useState('')`, placeholders "e.g. Home" / "e.g.
Work"); `demoSavedLine(names)` echoes **what he typed** (`demoModel.ts:101–103`). Nothing is
pre-written; nothing is saved. Nathan's *"let me fill it in, but just dont save it after I
save it"* is what A built. No task.

### R8 — Naming

`DEMO_TODAY_RIDE_ID = 'demo:today'`; `DEMO_PRIOR_LAPS`, `DEMO_PRIOR_DAYS_AGO`,
`DEMO_ROUTE_START = 'Home'`, `DEMO_ROUTE_END = 'Work'`, `DEMO_ROUTE_LABEL`,
`DEMO_SPEC_VOCABULARY`, `demoHistoryFor`, `demoPriorResults`, `demoPriorLapSeconds`,
`buildDemoReveal`, `demoAddedWayLine` in `demoModel.ts`; `TOWER_MAX_VISIBLE` in
`towerModel.ts`; `reveal` / `revealDone` / `revealHoldRef` / `savedLine` in `DemoScreen.tsx`.
Pill text `TENTH RIDE`.

### R9 — Docs in the same commit, including the repair of brief A's `STATE.md` regression

Brief A's commit `8df1119` **regressed `STATE.md`**: the test line went from "600 tests, 597
pass … verified 2026-09-19" back to "560 tests, 557 pass … 2026-09-08" (the tree has 607/604
today), the sentence "**Not yet seen on the phone** — a headless container can't render the
real climb; see `OPEN-ITEMS.md` item 6" was deleted instead of appended to, and A's own
Known-stubs text and cycle-history pointer were never added (`git show 8df1119 -- STATE.md`).
`GLOSSARY.md` and `OPEN-ITEMS.md` landed correctly. Task 5 repairs all of it in this commit
and the report names it as a finding for Inspect.

### R10 — Out of scope (do not build, do not ask)

Self dots and `livePos` (brief C); the gate-adjust card (brief D); any change to `tower.tsx`
beyond R5's import + alias + comment; `rankingRevealModel.ts`, `colourModel.ts`,
`routeNamingCard.tsx`, `RecordScreen.tsx`, `app/src/store/**`; a haptic at landing; an
all-white past-row variant; a settings toggle for the demo; a demo of the no-card path.

---

## 1. Rules

- Touch only: `app/src/ui/demoModel.ts`, `app/src/ui/DemoScreen.tsx`, `app/src/ui/tower.tsx`
  (R5 only), `app/src/ui/towerModel.ts` (one export), `app/tests/demo_suite.ts`,
  `app/tests/towermodel_suite.ts` (one test), `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md`, this
  cycle folder.
- Never edit `App.tsx`, `IDEAS.md`, `CLAUDE.md`, `Nathan/`, `cycles/virgin-cycle1..10/`,
  `app/core/`, `app/src/store/**`, `app/src/ui/RecordScreen.tsx`,
  `app/src/ui/rankingRevealModel.ts`, `app/src/ui/colourModel.ts`, `app/src/ui/selfRaceModel.ts`,
  `app/src/ui/wayMapView.tsx`, `app/src/ui/liveView.tsx`, `app/src/ui/routeNamingCard.tsx`,
  `app/src/ui/demoWayFixture.ts`, `app/src/ui/preview/**`, `app/tests/run.ts`,
  `app/tests/rankingreveal_suite.ts`. If a task seems to need one → STOP and report why.
- Never delete. `mv` to `safe_to_delete/` only. `git add <path>` by name. Every git command
  with `GIT_OPTIONAL_LOCKS=0`; a stray `.git/*.lock` gets `mv`'d aside.
- `git status --short` at start: clean apart from this cycle folder (the revised
  `BRIEF-demo-tenth-ride-reveal.md`, `BRIEF-demo-self-dots.md`, `QUESTIONSFORNATHAN.md` and the
  new `BRIEF-demo-gate-adjust.md` are expected there, uncommitted, unless the coordinator
  committed them first — either is fine; §7's `git add cycles/virgin-cycle11/` carries them).
  Any *modification* under `app/`, `STATE.md`, `GLOSSARY.md`, `OPEN-ITEMS.md` → STOP. HEAD must
  be `8df1119` (or a later commit whose subject you quote — if anything after `8df1119`
  touched `DemoScreen.tsx`, `demoModel.ts` or `tower.tsx`, STOP).
- `demoModel.ts` stays pure (no react / expo / react-native imports). It may import
  `buildRankingReveal` and the `REVEAL_*` / `CLIMB_*` values from `./rankingRevealModel.ts`
  (pure), `WINDOW_N` / `WINDOW_PREV` from `./colourModel.ts` (already imported from), types from
  `../store/types.ts` (type-only) and `DEMO_WAY_ID` from `./demoWayFixture.ts` (pure data).
- `DemoScreen.tsx` still imports nothing from `app/src/store/**` at value level (A's grep).
- Stop-on-ambiguity on every "confirm" step. Nothing is done because it compiles.

Confirm before Task 1 and quote in the report:

1. `app/src/ui/rankingRevealModel.ts:71–77` is the `buildRankingReveal(st, rideId,
   startedAtMs, window = …, allTimeBestS = …)` signature with both defaults, and `:78–82`
   are the four null guards ending in `if (window.length === 0) return null;`.
2. `app/src/ui/towerModel.ts` imports `{ fmt, tierFor, type UiTier } from './colourModel.ts'`
   and `import type { TowerModel, TowerRowModel } from './tower.tsx'` (type-only — R5's
   no-cycle argument rests on this); `buildTowerModel` reads only `r.lap`, `r.startedAtMs`,
   `r.source` from each `RideResult`.
3. `app/src/ui/tower.tsx:65` is `const MAX_VISIBLE = 8; // rows without scroll [ASSUMPTION §3b —
   PO's window call]`; `MAX_VISIBLE` is used at `:136, :137, :138, :140` and nowhere else;
   `:33–38` are its six imports and none is from `./towerModel.ts`.
4. `app/src/ui/colourModel.ts:29` is `export const WINDOW_N = 10;` and `:36` is `export const
   WINDOW_PREV = WINDOW_N - 1;`.
5. `app/tests/rankingreveal_suite.ts:34–47` is the `ride(movingS, startedAtMs, rideId,
   source)` helper with `lap: { rawS: movingS, movingS, quality: 'clean' }`, `sectors: []`,
   `derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: 1 }`.
6. `app/src/ui/DemoScreen.tsx` at `8df1119`: `:99` `useState<DemoMode>('second')`; `:108`
   `const [saved, setSaved] = useState<RouteNames | null>(null);`; `:152–157` `enterEnding`
   as a `useCallback(…, [])` with the comment `// brief B: build the ranking reveal here for
   second/tenth.`; `:252–254` the `sectorColours` ternary; `:257–264` `onDemoNamingSave`;
   `:297–336` the 'ending' render with the `{/* brief B mounts the TimingTower here … */}`
   comment at `:309`, `saved !== null ? <Text …>{demoSavedLine(saved)}</Text> : <RouteNamingCard
   …/>` at `:311–325`, and the DONE `Pressable` at `:327–330`.
7. `app/src/ui/demoModel.ts` at `8df1119`: `:26` `export type DemoMode = 'first' | 'second';`;
   `:36–41` `DEMO_HISTORY` with six columns; `:50–51` `DEMO_LAP_HISTORY`; `:64–67`
   `demoTier(i, value)`; `:73–83` `demoSectorColours(script, gatesDone, paint)`; `:101–103`
   `demoSavedLine(names)`; `:120–122` `demoLiveViewModel(script, clockS, nowMs, livePos = null)`.
8. `app/src/ui/routeNamingCard.tsx:27–48` is `RouteNamingCardProps` with `existingRoute?: {
   label: string; knownSpecLists: string[][] } | null` and `vocabulary?: string[]`; `:69–70`
   are `duplicate` / `complete`; `:199` calls `props.onSave({ start: startName, end: endName,
   specs: effectiveSpecs })`.

Any mismatch → STOP.

---

## 2. Task 1 — `towerModel.ts` + `tower.tsx`: the cap is the pool (R5)

1. `towerModel.ts`: extend the colourModel import to `{ WINDOW_N, fmt, tierFor, type UiTier }`
   and add, above `towerDate`:
   ```ts
   /** Rows the timing tower shows without clipping. Equals WINDOW_N because the ranking pool
    *  is at most WINDOW_N rides (colourModel.ts, D-045) and Nathan ruled (2026-09-19,
    *  cycles/virgin-cycle11/QUESTIONSFORNATHAN.md item 1) that the board shows the whole pool —
    *  no ranked ride is ever cut off. tower.tsx's pre-scroll/clip logic stays as a guard for a
    *  model larger than the pool (the Preview screen's scripted 19-row scenario). Replaces
    *  tower.tsx's `MAX_VISIBLE = 8 [ASSUMPTION §3b — PO's window call]`; the PO has called it. */
   export const TOWER_MAX_VISIBLE = WINDOW_N;
   ```
2. `tower.tsx`: add `import { TOWER_MAX_VISIBLE } from './towerModel.ts';` after the `chips`
   imports; replace `:65` with
   `const MAX_VISIBLE = TOWER_MAX_VISIBLE; // the whole ranking pool — Nathan 2026-09-19, see towerModel.ts`
   Leave `:136–141` exactly as they are. In the header comment, after the `reveal` paragraph,
   add one sentence: "virgin-cycle11 brief B: the visible cap is `TOWER_MAX_VISIBLE`
   (= `WINDOW_N`, towerModel.ts) — a real board is never clipped; the clip lines remain for
   oversize scripted models."
3. `tests/towermodel_suite.ts`: add `TOWER_MAX_VISIBLE` to the dynamic import and `const {
   WINDOW_N } = await import('../src/ui/colourModel.ts')`; one test — **the tower shows the
   whole ranking pool**: `TOWER_MAX_VISIBLE === WINDOW_N && TOWER_MAX_VISIBLE >= 10`.

Check: `cd app && ./node_modules/.bin/tsc --noEmit` exit 0; `grep -n "MAX_VISIBLE" app/src/ui/tower.tsx`
shows the alias line plus the same four uses; `grep -n "from './tower" app/src/ui/towerModel.ts`
shows only `import type`; the whole suite passes (the Preview's data is not under test, but
`tsc` covers it).

## 3. Task 2 — `demoModel.ts`: nine columns, mode depth, synthetic results, the reveal, the card's data

1. `export type DemoMode = 'first' | 'second' | 'tenth';`
2. `DEMO_HISTORY` → the nine columns of R3 (append three values per row; update the per-row
   best/mean comments and the header's "pins six laps per sector").
3. Add (import `WINDOW_PREV` from `./colourModel.ts` alongside `tierFor`):
   ```ts
   /** R2: how many of the pinned laps a mode "has ridden before" — the LAST n columns of
    *  DEMO_HISTORY, mirroring ghostsFor's slice(-WINDOW_PREV). first: 0 (ride 1 races nobody
    *  and gets no reveal), second: 1, tenth: WINDOW_PREV — so TENTH RIDE's board is exactly
    *  the real pool, WINDOW_N rows (Nathan, item 1: "we always stay with 10 rides"). */
   export const DEMO_PRIOR_LAPS: Readonly<Record<DemoMode, number>> = { first: 0, second: 1, tenth: WINDOW_PREV };
   /** Days before `nowMs` each prior lap (oldest first) was ridden — a plausible fortnight. */
   export const DEMO_PRIOR_DAYS_AGO: readonly number[] = [16, 14, 13, 9, 8, 7, 6, 2, 1];
   export const DEMO_TODAY_RIDE_ID = 'demo:today';

   /** The last `priorLaps` columns of DEMO_HISTORY, per sector. 0 → four empty rows. */
   export function demoHistoryFor(priorLaps: number): readonly (readonly number[])[];
   /** Per-lap sums of those columns (the lap's own comparison window). */
   export function demoPriorLapSeconds(priorLaps: number): number[];
   ```
   and re-plumb: `demoTier(i, value, priorLaps = DEMO_HISTORY[0].length)`,
   `demoSectorColours(script, gatesDone, paint, priorLaps = DEMO_HISTORY[0].length)`,
   `demoLiveViewModel(script, clockS, nowMs, livePos = null, priorLaps = DEMO_HISTORY[0].length)`
   — each passing `priorLaps` down; `DEMO_LAP_HISTORY` becomes `demoPriorLapSeconds(9)` or is
   removed. Defaults keep every existing call and test meaning "against all of them".
4. Synthetic window + reveal:
   ```ts
   import type { RideResult } from '../store/types.ts';
   import { buildRankingReveal, type RankingReveal } from './rankingRevealModel.ts';
   import { DEMO_WAY_ID } from './demoWayFixture.ts';

   /** R1: the last `priorLaps` pinned laps as RideResults — the shape buildTowerModel reads
    *  (lap, startedAtMs, source). Oldest first; rideId 'demo:prior-<k>' with k the 1-based
    *  column index in DEMO_HISTORY, so brief C's SelfTracks can share the ids. */
   export function demoPriorResults(priorLaps: number, nowMs: number): RideResult[];
   /** R1/R4: the real reveal builder over the synthetic window. null for 'first'. */
   export function buildDemoReveal(mode: DemoMode, nowMs: number, script: DemoScript = buildDemoScript()): RankingReveal | null;
   ```
   `demoPriorResults` literal per result, copying `rankingreveal_suite.ts`'s `ride()` shape:
   `kind: 'rideResult'`, `schemaVersion: 2`, `rideId`, `startedAtMs: nowMs -
   DEMO_PRIOR_DAYS_AGO[col] * 86_400_000`, `wayId: DEMO_WAY_ID`, `source: 'app'`, `lap: { rawS:
   lapS, movingS: lapS, quality: 'clean' }`, `sectors: []`, `derivedBy: { engineVersion: 'demo',
   gateSetVersion: 1, resultSchemaVersion: 2 }`. `buildDemoReveal` is R1's call with
   `allTimeBest = Math.min(...demoPriorLapSeconds(n), script.lap)` and `priorLaps =
   DEMO_PRIOR_LAPS[mode]`.
5. The card's data and line (R6):
   ```ts
   /** R6: the known route SECOND/TENTH RIDE are on — fixed text on the WP-G card by that
    *  variant's own design (the route exists). Not the item-6 pre-fill: FIRST RIDE's inputs stay blank. */
   export const DEMO_ROUTE_START = 'Home';
   export const DEMO_ROUTE_END = 'Work';
   export const DEMO_ROUTE_LABEL = `${DEMO_ROUTE_START} → ${DEMO_ROUTE_END}`;
   /** Spec chips for show — a virgin catalog has no vocabulary; the real card would show none. */
   export const DEMO_SPEC_VOCABULARY: readonly string[] = ['Dry', 'Wet', 'Fast'];
   /** The confirmation line after the WP-G card's ADD WAY. Mirrors wayLabelIn's `base · spec · spec`. */
   export function demoAddedWayLine(routeLabel: string, specs: readonly string[] | undefined): string {
     const s = (specs ?? []).map((x) => x.trim()).filter((x) => x.length > 0);
     return `${routeLabel}${s.length ? ` · ${s.join(' · ')}` : ''} added as a new way · demo only, nothing saved`;
   }
   ```

Check: `tsc` clean; `grep -nE "from 'react|expo" app/src/ui/demoModel.ts` prints nothing;
the existing `demo_suite.ts` still passes unchanged before Task 4 touches it (if any existing
demo test fails here, STOP: the nine columns have moved a mean across a threshold and R3's
table is wrong).

## 4. Task 3 — `DemoScreen.tsx`: the third pill, the reveal, the card after the hold, `savedLine`

Anchor against `8df1119`'s file (§1 item 6).

1. **Imports.** `TimingTower` from `'./tower'`; `REVEAL_HOLD_MS, REVEAL_START_DELAY_MS, type
   RankingReveal` from `'./rankingRevealModel.ts'`; `buildDemoReveal, DEMO_PRIOR_LAPS,
   DEMO_ROUTE_START, DEMO_ROUTE_END, DEMO_ROUTE_LABEL, DEMO_SPEC_VOCABULARY, demoAddedWayLine`
   added to the `demoModel.ts` import.
2. **Default mode** `useState<DemoMode>('tenth')` (R2). **Pill row**: a third pill `TENTH
   RIDE` after SECOND RIDE, same styles, `flex: 1` kept (if the text wraps at phone width,
   `fontSize: 12` on `pillText` is the allowed adjustment; report it). Idle description for
   tenth: `'Your tenth ride: nine earlier rides to beat — the full timing tower climbs after
   STOP, then the card.'`; second becomes `'Your second ride of a route: the line, the gates,
   the sector strip — then how it ranked, and the card.'`.
3. **State.** Rename A's `saved` → `const [savedLine, setSavedLine] = useState<string | null>(null);`
   (every `setSaved` / `saved` use follows). Add:
   ```ts
   const [reveal, setReveal] = useState<RankingReveal | null>(null);
   const [revealDone, setRevealDone] = useState(true);
   const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   ```
   Cleared (timer) in `exitToIdle` and the unmount effect; `setReveal(null)` and
   `setRevealDone(true)` in `exitToIdle`.
4. **`enterEnding`** at A's comment:
   ```ts
   const next = buildDemoReveal(mode, Date.now());
   setReveal(next);
   setRevealDone(next === null);
   ```
   before `setPhase('ending')`, and **`mode` goes into the callback's deps** — a stale
   `'second'` closure building a two-row board for TENTH RIDE is exactly the bug to avoid.
   `onStop` already depends on `enterEnding`, so it follows.
5. **`onRevealPlayed`** — `RecordScreen.tsx`'s shape minus the card/rev branch:
   ```ts
   const onRevealPlayed = useCallback(() => {
     revealHoldRef.current = setTimeout(() => { revealHoldRef.current = null; setRevealDone(true); }, REVEAL_HOLD_MS);
   }, []);
   ```
6. **Handlers.** A's `onDemoNamingSave` sets `setSavedLine(demoSavedLine(names))` where it set
   `setSaved(names)`. Add the WP-G card's save, same theatre:
   ```ts
   const onDemoAddWaySave = useCallback((names: RouteNames) => {
     setBusy(true);
     holdRef.current = setTimeout(() => {
       setBusy(false);
       setSavedLine(demoAddedWayLine(DEMO_ROUTE_LABEL, names.specs));
       holdRef.current = setTimeout(() => { holdRef.current = null; setShowAnim('rev'); }, DEMO_SAVED_HOLD_MS);
     }, DEMO_FAKE_SAVE_MS);
   }, []);
   ```
7. **Ending render.** Replace A's comment line (`:309`) with
   ```tsx
   {reveal !== null && (
     <TimingTower model={reveal.model} justFinished reveal climbMs={reveal.climbMs}
       startDelayMs={REVEAL_START_DELAY_MS} onPlayed={onRevealPlayed} />
   )}
   ```
   and replace A's `mode === 'first' ? (…) : (<DONE bar>)` block (`:310–331`) with:
   ```tsx
   {revealDone ? (
     savedLine !== null ? (
       <Text style={styles.trackLine}>{savedLine}</Text>
     ) : mode === 'first' ? (
       <RouteNamingCard startExistingLabel={null} endExistingLabel={null} loop={false} busy={busy}
         matchedWayLabel={null} existingRoute={null} vocabulary={[]}
         onSave={onDemoNamingSave} onSkip={onDemoNamingSkip} />
     ) : (
       <RouteNamingCard startExistingLabel={DEMO_ROUTE_START} endExistingLabel={DEMO_ROUTE_END} loop={false} busy={busy}
         matchedWayLabel={DEMO_ROUTE_LABEL}
         existingRoute={{ label: DEMO_ROUTE_LABEL, knownSpecLists: [[]] }}
         vocabulary={[...DEMO_SPEC_VOCABULARY]}
         onSave={onDemoAddWaySave} onSkip={onDemoNamingSkip} />
     )
   ) : null}
   ```
   (brief D inserts its `adjust !== null ? <GateAdjustCard/> :` branch between `savedLine` and
   `mode === 'first'` — leave a one-line comment marking the spot.) The headline: `reveal !==
   null ? 'Ride saved.' : \`Ride saved — ${demoFmtMS(clockS)}.\`` (the reveal, not the mode,
   decides — same expression as the real screen). `justFinished` is the constant `true`.
   The `existingRoute` object literal is rebuilt each render; the card only reads it, so no
   memo is needed — but if `tsc` complains about `readonly string[]` vs `string[]` on
   `vocabulary`, the spread above is the fix, not a cast.
8. **Depth plumbing.** Every `demoTier` / `demoSectorColours` / `demoLiveViewModel` call in the
   screen passes `DEMO_PRIOR_LAPS[mode]` (R2). The buzz condition is already `mode !== 'first'`.
9. **Header comment.** Update the file header's brief-A paragraph: three modes, the tower,
   the card after the hold (one paragraph, do not rewrite history).

Checks: `tsc` clean. Read the ending JSX top to bottom and confirm the order headline →
tower → (after hold) line / card. Confirm `reveal` is rebuilt on every `enterEnding` and
nulled in `exitToIdle`. **R7 check:** `grep -n "settings\." app/src/ui/DemoScreen.tsx` — every
hit must be in render-level code or in an effect whose deps list it; none inside `start()`'s
`setInterval` callback or a `[]`-dependency `useCallback`. Quote the grep. A's grep
(`grep -nE "from '\.\./(store|storage)/" app/src/ui/DemoScreen.tsx`) still prints nothing.

## 5. Task 4 — Tests: extend `app/tests/demo_suite.ts`

Add to the dynamic import: `DEMO_PRIOR_LAPS, DEMO_PRIOR_DAYS_AGO, DEMO_TODAY_RIDE_ID,
DEMO_ROUTE_LABEL, demoHistoryFor, demoPriorLapSeconds, demoPriorResults, buildDemoReveal,
demoAddedWayLine`; also `const { WINDOW_N, WINDOW_PREV } = await import('../src/ui/colourModel.ts')`,
`const { CLIMB_MAX_MS, climbMsFor } = await import('../src/ui/rankingRevealModel.ts')`, `const
{ TOWER_MAX_VISIBLE, towerDate } = await import('../src/ui/towerModel.ts')`. Cases, named so a
failure reads as a sentence:

- **Nine pinned laps per sector, four sectors, nine dates.** Every `DEMO_HISTORY` row has
  length 9 and `=== DEMO_PRIOR_LAPS.tenth === WINDOW_PREV`; `DEMO_PRIOR_DAYS_AGO.length === 9`,
  strictly decreasing.
- **Lap seconds are the column sums.** `demoPriorLapSeconds(9)` deep-equals `[840, 830, 853,
  844, 848, 835, 845, 865, 842]`; `demoPriorLapSeconds(1)` equals `[842]`; `demoHistoryFor(1)`
  is `[[191],[209],[233],[209]]`; `demoHistoryFor(0)` is four empty rows.
- **TENTH RIDE keeps the three-colour pin.** `demoTier(1..4, DEMO_SECS[i], 9)` → `purple,
  green, yellow, green`; `demoTier(0, 836, 9) === 'green'`. Keep the old default-arg assertions.
- **SECOND RIDE is purple/yellow only.** `demoTier(1..4, DEMO_SECS[i], 1)` → `purple, purple,
  yellow, purple`; `demoTier(0, 836, 1) === 'purple'`; no `i` yields `'green'` at depth 1.
- **FIRST RIDE is neutral everywhere.** `demoTier(i, DEMO_SECS[i-1], 0) === 'neutral'` for
  `i` 1..4 and `demoTier(0, 836, 0) === 'neutral'`.
- **Synthetic results have the store's shape.** `demoPriorResults(9, T)`: length 9, ids
  `demo:prior-1 … demo:prior-9`, every `source === 'app'`, `wayId === DEMO_WAY_ID`, `lap.rawS
  === lap.movingS`, `startedAtMs` strictly increasing and `=== T - DEMO_PRIOR_DAYS_AGO[k] *
  86_400_000`; `demoPriorResults(1, T)` is exactly the last one.
- **No reveal on ride 1.** `buildDemoReveal('first', T) === null`.
- **SECOND RIDE: P1 of 2, purple, one row climbed, today is the PB.** `pos 1, of 2, tier
  'purple', rowsPassed 1, climbMs 800`; today `pb === true`, `time '13:56'`, `gap '—'`; the
  other row `time '14:02'`, `gap '+6s'`.
- **TENTH RIDE: P3 of 10, green, seven rows climbed, P1 is the PB.** `pos 3, tier 'green',
  rowsPassed 7, climbMs === climbMsFor(7) === 2000 < CLIMB_MAX_MS`; rows ascending by parsed
  time; exactly one `today`; `rows[0].time === '13:50'` with `pb === true`; today's `gap ===
  '+6s'`, `pb === false`.
- **TENTH RIDE's board is the whole pool, and the tower shows all of it (R2/R5).** `r.of ===
  WINDOW_N`, `r.model.rows.length === WINDOW_N`, `r.model.rows.length <= TOWER_MAX_VISIBLE`,
  `rows[9].time === '14:25'` (the slowest prior is on the board, not clipped).
- **Dates are the priors' dates.** `r.model.rows.find(x => x.time === '13:50').date ===
  towerDate(T - 14 * 86_400_000)`.
- **The ADD WAY line.** `demoAddedWayLine(DEMO_ROUTE_LABEL, ['Dry', ' Left '])` ===
  `'Home → Work · Dry · Left added as a new way · demo only, nothing saved'`;
  `demoAddedWayLine(DEMO_ROUTE_LABEL, [])` === `'Home → Work added as a new way · demo only, nothing saved'`.

Zero FAIL on the whole suite.

## 6. Task 5 — Docs (same commit as the code), including the `STATE.md` repair (R9)

Re-read each target first; `git show 8df1119 -- STATE.md` shows the regression to undo.

- `STATE.md`
  - "Where the app actually is", Code bullet, the test line: replace the regressed
    "**560 tests, 557 pass, 0 fail, 3 skip**. … Both verified 2026-09-08." with the numbers
    the suite prints after Task 4 and "Both verified 2026-09-19 (virgin-cycle11)".
  - "Ranking reveal is built" bullet: after "…locks all of it headless." restore and extend:
    "**Not yet seen on the phone** — a headless container can't render the real climb; see
    `OPEN-ITEMS.md` item 6. Since brief B the DEMO tab (SECOND / TENTH RIDE) plays the same
    reveal over a synthetic board, so the animation can be eyeballed without riding — the
    real-ride check still stands. **The tower shows the whole pool** (`TOWER_MAX_VISIBLE =
    WINDOW_N`, `towerModel.ts`; Nathan 2026-09-19) — a real board is never clipped."
  - Known-stubs DEMO bullet ("DEMO replays its own frozen fixture …"): append A's text that
    never landed — "**Since virgin-cycle11 (brief A) RUN DEMO RIDE goes full-screen** — the
    DEMO tab's idle screen is a chooser; the run mirrors the real running column (map / pane
    / status / STOP, `variant="live"`, same `liveMap` / `sectorColours` toggles, read live) and
    ends on a 'Ride saved' screen: FIRST RIDE shows the real `RouteNamingCard` whose SAVE is
    theatre (nothing written). `App.tsx`'s `demoFullscreen` is the sixth 'screen owns intent,
    Shell owns chrome' bit." — then B's: "**Brief B:** a third mode, TENTH RIDE (default),
    nine pinned prior laps; SECOND RIDE is an honest ride 2 (one prior lap, purple/yellow
    only). After the demo's STOP, SECOND/TENTH mount the real `TimingTower` with a board
    built by the real `buildRankingReveal` over synthetic `RideResult`s (`buildDemoReveal`)
    — same window rule, constants and hold as the real 'ending' — then the real
    `RouteNamingCard` in its WP-G 'new way on this route' variant, whose ADD WAY is theatre
    too. Today lands P1 of 2 (purple) / P3 of 10 (green)."
  - "Cycle history", the `virgin-cycle11` line: append "; DEMO tab overhaul — brief A
    (`BRIEF-demo-fullscreen-run.md`), brief B (`BRIEF-demo-tenth-ride-reveal.md`)".
- `GLOSSARY.md` **DEMO tab** entry: "Two modes: …" → "Three modes: FIRST RIDE (a stranger's
  first ride and the naming card), SECOND RIDE (one prior ride — a two-row tower) and TENTH
  RIDE (nine prior rides — the full ten-row tower climb). After the climb, the card a real
  ride would get."
- `OPEN-ITEMS.md` item 7: replace "ending per brief B" with "SECOND RIDE / TENTH RIDE →
  after the roll-out: 'Ride saved.', the tower with today parked at the bottom in plain ink
  (all 10 rows on TENTH), ~0.5 s later the climb (0.8 s for SECOND, 2.0 s for TENTH), rows
  stepping down one by one, the hard colour + P<n> cut, ~1.5 s hold, then the 'New way on
  Home → Work' card beneath; add a spec → ADD WAY dims ~0.6 s → one confirmation line →
  the reverse mark. SETTINGS → sector colours ON/OFF, then DEMO → RUN: the map spans follow
  the toggle, the strip is coloured either way." Item 6: append "The board now shows every
  ride in the pool (up to 10) — check a 10-ride way fits your screen without scrolling before
  the card appears."

---

## 7. Verify, then commit

1. `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; totals before
   (607 / 604 / 0 / 3 at briefing) and after.
2. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
3. `git diff --stat`: only §1 files.
4. Commit by name (`git add app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx
   app/src/ui/tower.tsx app/src/ui/towerModel.ts app/tests/demo_suite.ts
   app/tests/towermodel_suite.ts STATE.md GLOSSARY.md OPEN-ITEMS.md cycles/virgin-cycle11/`).
   Message:

```
virgin-cycle11: DEMO tab — TENTH RIDE, the whole-board reveal, the card beneath it (brief B)

Third demo mode, TENTH RIDE (now the default): the pinned history grows to
nine laps per sector and each mode judges today against the LAST n of them
(first 0, second 1, tenth WINDOW_PREV) — ghostsFor's slice rule — so SECOND
RIDE is an honest ride 2 (purple/yellow, two rows) and the three-colour
showcase moves to TENTH, whose board is exactly the WINDOW_N pool. After the
demo's STOP, SECOND/TENTH mount the real TimingTower in reveal mode over a
board built by the real buildRankingReveal with an injected synthetic
RideResult window (no store), then — after the hold — the real
RouteNamingCard in its WP-G "new way on this route" variant; ADD WAY is
theatre, one line, nothing written. Today lands P1 of 2 purple / P3 of 10
green, climbing all seven rows it is timed for: on Nathan's ruling
(QUESTIONSFORNATHAN item 1) the tower's visible cap is now TOWER_MAX_VISIBLE
= WINDOW_N (towerModel.ts), so a real board is never clipped either; the
clip logic stays as a guard. Repairs brief A's STATE.md regression (test
line, the "not yet seen on the phone" sentence, the DEMO bullet). Tests pin
every number. rankingRevealModel, RecordScreen, routeNamingCard untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ssts3UN9gbxYxTjHH8sEWW
```

Push is expected to fail from this device (403, cycle5/6/11 precedent) — say so, one retry
at most.

---

## 8. Report back

1. HEAD at start (must be `8df1119` or a quoted later subject), `git status --short`, the
   commit hash at end.
2. The eight §1 anchor confirmations, quoted.
3. Task 1: the `tower.tsx` diff in full (it must be import + alias + one comment sentence).
4. Task 2: the final `DEMO_HISTORY` literal and `buildDemoReveal` body as committed.
5. Task 3: `enterEnding` (with its deps) and the ending JSX as committed; the R7 `settings.`
   grep output; whether `pillText` needed the size change.
6. Test totals before/after; `tsc`.
7. **Plain-language walk-through for Nathan:** SECOND RIDE and TENTH RIDE from RUN to the
   reverse mark, with the numbers (P1 of 2 purple, 0.8 s climb; P3 of 10 green, 2.0 s climb,
   all 10 rows, +6s gap, where the PB ● sits), what the card says and what ADD WAY does; and
   one sentence on what changes on the REAL ending screen (whole pool visible).
8. The `STATE.md` repair, before/after lines — flag it as an Inspect finding on `8df1119`.
9. Tokens (this tier); the tier | model | tokens | outcome row.
10. Every STOP you hit and did not resolve.
