# 08 — DEMO: the RESULTS scatterplot at the end of every demo ride

**Source: Nathan, idea #11 (tester feedback; tester not named).** "Could we add it at the end
of each type of demo ride so I can see how it would look?" — "it" = the RESULTS-tab
scatterplot (WP-2 Phase C, `cycles/virgin-cycle3/WP-2-results-tab.md`, Q&A of 2026-09-05),
which is built and wired but Nathan has never seen: his phone has no real ride history on
any way yet.

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (HEAD `4e808c4`, `app/` clean).
Executor: Sonnet, cold, this file only. Medium task: two `src/ui` files edited, one suite
extended, no new file.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-09-26. If a quoted line
  is not where the brief says, or a name/signature differs, **stop and report the mismatch
  verbatim** (file, line, expected, found). Never guess, never patch around it, never rule on
  it yourself. Match on the QUOTED TEXT, not the line number — brief 06 shifts
  `DemoScreen.tsx` by +1 above line 44 and −8 below line 495 (see Interaction).
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. JS-only, ships OTA.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  `GLOSSARY.md`, or any `cycles/virgin-cycle1..13/` doc.
- **The real RESULTS screen is untouched:** `resultsPlot.tsx`, `resultsPlotModel.ts`,
  `resultsListModel.ts`, `ResultsDetailScreen.tsx` are read, never edited. The plot is REUSED
  through its props — no fork, no copy of any plot code.
- **The demo still writes nothing.** No import from `app/src/store/**` in `DemoScreen.tsx`
  (house rule, `demoModel.ts:31-33`); no `resultsStore`, no `storedResultsForWay`, no fs.
- DEMO speed untouched: `DemoScreen.tsx:104 const RATE = 25;` / `:105 const TICK_MS = 33;`.

## Goal

Every demo mode's 'ending' screen (after STOP, the screen with "Ride saved" / the tower /
the naming card) ends with the real `ResultsPlot` — the same component the RESULTS detail
draws — fed the demo's own synthetic history plus the lap just ridden as the newest dot:

| mode | dots | today's dot | what Nathan sees |
| --- | --- | --- | --- |
| FIRST RIDE | 1 | purple (only ride) | what a way's RESULTS looks like after ride 1 |
| SECOND RIDE | 2 | purple (836 < 842); the prior yellow | ride 2: purple/yellow only, as the real rule |
| TENTH RIDE | 9 (priors 2-9 + today) | green, P3 of 10 | the full 9-dot plot: 1 purple, 4 green, 4 yellow, dotted avg 14:04 |

Header `LAST n RIDES · AS ON THE RESULTS TAB`, the real screen's hint line, the plot with
today's dot pre-selected (ring + caption `<date> · 13:56 · P3 of 10`), then `demo only ·
nothing saved`. Placed at the BOTTOM of the ending scroll, after the card, gated on the
reveal having finished — the tower's climb and the card's buttons are exactly as they are.

## Context (all anchors from the 2026-09-26 tree)

### The plot is pure props — feedable without any storage

`app/src/ui/resultsPlot.tsx` (271 lines), the component, lines 54-64:

```tsx
export default function ResultsPlot({
  results, selectedRideId, selectedPosLabel, onSelect, onOpenRide,
}: {
  results: RideResult[];
  selectedRideId: string | null;
  /** `P3 of 27` — computed by the screen from its own board data; empty
   * while rankings are off (§3.9). The plot never formats this itself. */
  selectedPosLabel: string;
  onSelect: (rideId: string | null) => void;
  onOpenRide: (rideId: string, startedAtMs: number) => void;
}) {
```

Its only context read is `useTheme()` (line 65, `./themeContext.tsx` — `DemoScreen.tsx:94`
already uses the same hook, so the ending screen is inside that provider). No settings, no
store, no `WayMapView`, no tabNav, no way id. Fixed height: `PLOT_H = 220`
(`resultsPlotModel.ts:23`) plus a 16 px x-axis row and a caption row; the frame is a
`t.card`/`t.cardBorder` box (line 99), `marginBottom: 8`. It measures its own width with
`onLayout` (69-72) and renders `<View style={{ height: PLOT_H }} />` until measured (101-102).

`app/src/ui/resultsPlotModel.ts` (269 lines): `buildPlotModel(results: RideResult[], plotW)`
(239). Inputs per result: `startedAtMs` (x), `scoredS(r.lap)` (y — `store/timing.ts:36`:
`movingS` in moving mode, else `rawS ?? movingS`), and `ranks(r)` (`store/results.ts:92`:
quality not estimated/missed, not tripwire-demoted, not ignored, `scoredS !== null`). Window =
`plotWindow()` (89-95): ranked, ascending `startedAtMs`, `.slice(-PLOT_N)` with
`PLOT_N = WINDOW_PREV = 9` (20). Tones (121-128): the minimum time is `'fastest'` (purple;
ties → oldest), else `'faster'`/`'slower'` than the window mean. One point: `xAt` returns
`plotW - PAD_R` when `tNewest === tOldest` (130-134), the domain is floored to
`max(30 s, 5 % of the median)` and padded (100-115), and `buildXTicks` (214-232) falls back
to two same-pixel date ticks that the component dedups (94-96). So <2 points do NOT throw
and are not "empty" — `empty` is `'no-ranked'` only for zero ranked results (242-246), which
renders `no ranked rides yet` (103-106). **This is the real component's own behaviour for a
way with 1 ride; the demo shows exactly that, no special case.**

The real screen does NOT pre-select the just-ridden ride: `ResultsDetailScreen.tsx:44`
`useState<string | null>(null)`; the ring (`resultsPlot.tsx:157-172`) and caption (218-235)
appear on tap. It builds `selectedPosLabel` (69-74) as `P<pos> of <total>` from
`buildHistoryBoard(results, best)` (`resultsListModel.ts:98`, pure over the results array via
`store/results.ts`'s `tower()` — a sort of a filtered copy, no store read) and blanks it when
`s.tower` (SETTINGS rankings) is off. Header/hint above the plot, lines 88-91:

```tsx
      <Text style={[st.h2, { color: t.textDim }]}>{windowCaption(windowN)}</Text>
      <Text style={[styles.hint, { color: t.textDim }]}>
        purple = fastest of these · green / yellow = faster / slower than their average
      </Text>
```

with `windowCaption(n)` = `LAST ${n} ${n === 1 ? 'RIDE' : 'RIDES'}` (`resultsListModel.ts:144-146`).

### The demo already has the history in the plot's input shape

`app/src/ui/demoModel.ts` (314 lines). `DEMO_HISTORY` (48-53) pins nine laps per sector;
per-lap sums, columns 1..9, are `840, 830, 853, 844, 848, 835, 845, 865, 842` (line 59). Today's scripted lap is 836
(`DEMO_SECS`, 56; `buildDemoScript().lap`). `DEMO_PRIOR_LAPS` (65) = `{ first: 0, second: 1,
tenth: WINDOW_PREV }` — the LAST n columns are what a mode "has ridden before".
`DEMO_PRIOR_DAYS_AGO` (68) = `[16, 14, 13, 9, 8, 7, 6, 2, 1]` days before `nowMs`.
`DEMO_TODAY_RIDE_ID = 'demo:today'` (70).

**`demoPriorResults(priorLaps, nowMs): RideResult[]` (198-210) already returns the store's
`RideResult` shape** (ids `demo:prior-<col>`, `wayId: DEMO_WAY_ID`, `source: 'app'`,
`lap: { rawS: lapS, movingS: lapS, quality: 'clean' }`, `sectors: []`, `derivedBy`) — built for
`buildDemoReveal` (252-262), which passes it to the real `buildRankingReveal`. Every one of
them passes `ranks()`; `rawS === movingS`, so the plot is identical in raw and moving timing.
What is missing for the plot is only **today's lap as a `RideResult`** — the reveal builds it
inline as a `{ track, lap }` literal (259), never as a result. `nowMs` dates everything: the
reveal is built in `enterEnding` with `Date.now()` (`DemoScreen.tsx:220`).

Arithmetic the tests pin (verified 2026-09-26 by running the real `buildPlotModel` /
`buildHistoryBoard` headless over `demoPriorResults` + a hand-built today row — tones
`fsfsfssff`, mean 844.222…, `P3 of 10`, last x = `plotW - PAD_R`; TENTH, plot window = priors 2-9 + today, 9 of the 10 results — the
real `slice(-9)` drops the oldest, exactly as a real 10th ride's RESULTS would):
times `830, 853, 844, 848, 835, 845, 865, 842, 836`, sum 7598, mean 844.22; fastest = 830
(`demo:prior-2`, purple); faster = 844, 835, 842, 836 (4 green, today included); slower =
853, 848, 845, 865 (4 yellow). Today's all-time position 3 of 10 (830, 835 ahead) — the same
`P3 of 10` the tower lands on (`demoModel.ts` header). SECOND: `842, 836` → today purple,
prior yellow, mean 839, `P1 of 2`. FIRST: `836` alone → purple, `P1 of 1`.

### The ending screen today

`app/src/ui/DemoScreen.tsx` (557 lines). Ending phase, lines 408-468:

| line | current code |
| --- | --- |
| 408 | `  if (phase === 'ending') {` |
| 410 | `      <View style={styles.raceColumn}>` |
| 411-416 | `<ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ gap: 8, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>` |
| 417-419 | `Ride saved.` (reveal modes) / `` `Ride saved — ${demoFmtMS(clockS)}.` `` (first) |
| 420-423 | `{reveal !== null && (<TimingTower model={reveal.model} justFinished reveal … onPlayed={onRevealPlayed} />)}` |
| 424 | `          {revealDone ? (` |
| 425-426 | `savedLine !== null ? (<Text style={styles.trackLine}>{savedLine}</Text>` |
| 427-436 | `: adjust !== null ? (<GateAdjustCard … />` (FIRST's step 2) |
| 437-448 | `: mode === 'first' ? (<RouteNamingCard … both endpoints unknown … />` |
| 449-462 | `: (<RouteNamingCard … WP-G "new way on this route" … />)` |
| 463 | `          ) : null}` |
| 464 | `        </ScrollView>` |
| 465 | `        {showAnim === 'rev' && <LaunchAnimation reverse onDone={exitToIdle} />}` |
| 466-468 | `      </View>` / `    );` / `  }` |

Per mode: FIRST — no tower (`reveal === null`, `revealDone` true at once, `enterEnding`
222): naming card → SAVE → gate card → KEEP/SAVE GATES → saved line for
`DEMO_SAVED_HOLD_MS` (1800 ms) → reverse launch → idle; SKIP leaves at once. SECOND/TENTH —
tower climbs (`REVEAL_START_DELAY_MS`, `onPlayed` → `REVEAL_HOLD_MS` → `revealDone`), then the
WP-G card → ADD WAY → saved line 1800 ms → idle; SKIP leaves at once. The tower is
`TODAY_ROW_H 56 + 38 per past row` (`tower.tsx:71-72`): ~400 px in TENTH, so the card is
already near or below the fold on a small phone; the ScrollView handles it. Everything
sits on `styles.raceColumn` (`t.race.bg`, paddingHorizontal 12, 530-533); `styles.h2` (513)
and `styles.sub` (514) exist for the idle chooser; `styles.trackLine` (534-542) is the
uppercase dim status line.

`enterEnding`, lines 217-224:

```ts
  const enterEnding = useCallback(() => {
    clearTimer();
    setRunning(false);
    const next = buildDemoReveal(mode, Date.now());
    setReveal(next);
    setRevealDone(next === null);
    setPhase('ending');
  }, [mode]);
```

`exitToIdle` 226-244 resets every piece of ending state (`setReveal(null)` 239,
`setRevealDone(true)` 240, … `setPhase('idle')` 243); `start` 252-282 resets the run
(`setSavedLine(null)` 258 … `setPhase('running')` 262). State block: line 149
`  const [reveal, setReveal] = useState<RankingReveal | null>(null);`, 150
`  const [revealDone, setRevealDone] = useState(true);`, 151 `revealHoldRef`.
Imports from `./demoModel.ts`, lines 58-83 (alphabetical: `buildDemoReveal, buildDemoScript,
demoAddedWayLine, demoChainage, demoFmtMS, demoGateAdjustDraft, demoLiveViewModel,
demoRunEndS, demoSavedLine, demoSectorColours, demoSelfTracks, demoStopOutcome,
DEMO_FAKE_SAVE_MS, DEMO_PRIOR_LAPS, DEMO_ROUTE_END, DEMO_ROUTE_LABEL, DEMO_ROUTE_START,
DEMO_SAVED_HOLD_MS, DEMO_SPEC_VOCABULARY,` then the types). `DEMO_TODAY_RIDE_ID` is NOT
imported today. Component imports use no extension (`./tower`, `./liveView`, `./chips`);
model imports use `.ts`. `useSettings` gives `settings` (122); `settings.tower` exists
(`settings.tsx:31`, default true, the SETTINGS rankings switch at 602).

`tests/demo_suite.ts` (585 lines): JSON hook then dynamic imports; the `demoModel.ts`
destructure is lines 33-40, ending `} = await import('../src/ui/demoModel.ts');`; last
dynamic import line 45 `const { MIN_TRACK_LENGTH_M } = await import('../src/store/routeCreation.ts');`;
40 `test(` calls; the file ends with the `'demoModel: the line names the outcome (R4)'` test
(571-585). Registered in `tests/run.ts:46` — nothing to register. `tests/resultsmodel_suite.ts`
shows the same hook works for `resultsPlotModel.ts` (dynamic import, line 33-35).

## Decisions (already made — do not reopen)

1. **Same component, same data path.** `ResultsPlot` gets `results = demoPriorResults(n, nowMs)
   + today's lap as a RideResult`; `buildPlotModel` does the rest. No plot code is copied or
   adapted; `resultsPlot.tsx` / `resultsPlotModel.ts` are not edited.
2. **Honest per mode — DEMO_HISTORY is NOT extended.** FIRST shows 1 dot, SECOND 2, TENTH 9.
   The dot count is `DEMO_PRIOR_LAPS[mode] + 1`, the same rule that already drives the tower
   rows, the self dots and the sector tiers seconds earlier on the same run; nine dots after
   "a stranger's first ride" would contradict the "Ride saved" line with no tower above it.
   TENTH is already the full 9-dot plot Nathan asked to see, and the 1- and 2-dot renders are
   what every tester's RESULTS tab will look like after their first and second real rides —
   also never seen. If Nathan wants nine dots in every mode, it is one argument
   (`demoPlotResults(mode, …)` → pass `'tenth'`), logged under Open questions.
3. **Placement: bottom of the ending scroll, after the card, shown once `revealDone`.** The
   tower's climb stays uncluttered (today's tone would otherwise give the verdict away
   before the row lands), the naming/gate card and its buttons stay exactly where testers
   learned them, and "at the end of each demo ride" is taken literally. On TENTH it is one
   or two swipes down; the checklist says so. The block is one JSX sibling — moving it above
   the card is a cut-and-paste if Nathan prefers (Open questions).
4. **Today's dot pre-selected** (`selectedRideId` starts as `DEMO_TODAY_RIDE_ID`): ring +
   caption (`<weekday dd Mon> · 13:56 · P3 of 10 · open ›`) visible without a tap, so the
   selection feature is previewed too; tapping other dots / empty space works as on the real
   screen. The real screen starts unselected — a deliberate demo-only difference, stated in
   the brief and in the code comment. `open ›` is a no-op in the demo (no ride exists).
5. **Position label mirrors the real screen:** `settings.tower ? demoPlotPosLabel(...) : ''`,
   computed by the real `buildHistoryBoard` over the same results, so `P3 of 10` is the
   tower's own landing position, not a second arithmetic.
6. **One timestamp for the whole ending:** `enterEnding` reads `Date.now()` once and both the
   reveal and the plot are dated from it (state `endedAtMs`), so tower dates and plot dates
   agree. The plot data is a `useMemo` off `[mode, endedAtMs]` — no `RideResult` type import
   in `DemoScreen.tsx`, nothing rebuilt per render.
7. **Pure functions in `demoModel.ts`** (no new file): `demoTodayResult`, `demoPlotResults`,
   `demoPlotPosLabel`, `demoPlotCaption`. Tests in `tests/demo_suite.ts`.

## Changes

Order: A (`demoModel.ts`) → B (`DemoScreen.tsx`) → C (`demo_suite.ts`). B's anchors assume
brief 06 has NOT landed; if it has, every `DemoScreen.tsx` line from 44 on is +1 (and from
496 on −7) — match the quoted text.

### A. `app/src/ui/demoModel.ts` (314 lines) — four pure functions

**A1. Imports.** After line 30
`import { seedGateChainages } from '../store/gateSeeding.ts';   // pure, import-free (brief D R5)`
insert:

```ts
import { buildHistoryBoard, windowCaption } from './resultsListModel.ts';   // pure over a results array (brief 08)
import { plotWindow } from './resultsPlotModel.ts';                          // the real plot's own window rule (brief 08)
```

(`resultsListModel.ts` imports `store/results.ts`'s `tower`, `store/defaultWay.ts` and
`towerModel.ts`/`colourModel.ts` — all pure at import time; `demo_suite.ts` already loads
`colourModel.ts` under the JSON hook, and `resultsmodel_suite.ts` loads both of these the same
way. No cycle: neither imports `demoModel.ts`.)

**A2. The functions.** Insert directly after `buildDemoReveal` — i.e. after line 262 `}`
(the line closing the function that starts at 252 `export function buildDemoReveal(`) and
before line 264 `/** R6: the known route SECOND/TENTH RIDE are on — …`:

```ts
/** virgin-cycle14 brief 08 (Nathan #11): today's scripted lap as a RideResult — the same
 *  shape/fields as demoPriorResults' rows (rawS === movingS, 'clean', DEMO_WAY_ID), id
 *  DEMO_TODAY_RIDE_ID, dated `nowMs`. Never stored; only ever handed to pure builders. */
export function demoTodayResult(nowMs: number, script: DemoScript = buildDemoScript()): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: 2,
    rideId: DEMO_TODAY_RIDE_ID,
    startedAtMs: nowMs,
    wayId: DEMO_WAY_ID,
    source: 'app',
    lap: { rawS: script.lap, movingS: script.lap, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 },
  };
}

/** brief 08: what the RESULTS tab would hold for this way after the demo lap — the mode's
 *  priors (the LAST DEMO_PRIOR_LAPS[mode] columns, oldest first, same ids/dates as the tower
 *  and the self dots) plus today, newest. Feed this straight to ResultsPlot's `results`:
 *  its own plotWindow() keeps the last PLOT_N ranked (TENTH: priors 2-9 + today, 9 dots;
 *  SECOND: 2; FIRST: 1 — the real component's own <2-point rendering, no special case). */
export function demoPlotResults(
  mode: DemoMode, nowMs: number, script: DemoScript = buildDemoScript(),
): RideResult[] {
  return [...demoPriorResults(DEMO_PRIOR_LAPS[mode], nowMs), demoTodayResult(nowMs, script)];
}

/** brief 08: the plot caption's position segment, exactly as ResultsDetailScreen.tsx builds
 *  it (`P<pos> of <total>` from the real buildHistoryBoard over the same results; PB marker
 *  irrelevant here, so allTimeBestS is null). '' for no selection, an unknown id, or an
 *  unranked row — the screen blanks it itself when SETTINGS rankings are off. */
export function demoPlotPosLabel(results: readonly RideResult[], rideId: string | null): string {
  if (rideId === null) return '';
  const board = buildHistoryBoard([...results], null);
  const row = board.rows.find((r) => r.rideId === rideId);
  return row !== undefined && row.pos !== null ? `P${row.pos} of ${board.total}` : '';
}

/** brief 08: the real screen's header over the same window — 'LAST 9 RIDES' / 'LAST 1 RIDE'. */
export function demoPlotCaption(results: readonly RideResult[]): string {
  return windowCaption(plotWindow([...results]).length);
}
```

`buildDemoScript`, `DemoScript`, `DEMO_PRIOR_LAPS`, `DEMO_TODAY_RIDE_ID`, `DEMO_WAY_ID`,
`demoPriorResults`, `RideResult` (type, line 23) are all already in scope in this file.
`buildHistoryBoard`/`plotWindow` take a mutable `RideResult[]` — hence the spread copies.

**A3. Header comment.** Line 17 is
` * colours on the scripted lap in `DEMO_SECS`, on every build, forever.` and line 18 is
` */`. Insert directly above line 18:

```ts
 *
 * virgin-cycle14 brief 08 (Nathan #11): the same pinned laps also feed the RESULTS
 * scatterplot at the end of every demo ride — demoPlotResults / demoPlotPosLabel /
 * demoPlotCaption hand the real ResultsPlot the store's own shapes, nothing stored.
```

Net for A: A1 +2, A2 ~+45, A3 +4 — the executor reports the real `wc -l`.

### B. `app/src/ui/DemoScreen.tsx` (557 lines) — wire the plot into the ending

**B1. Imports.** In the `./demoModel.ts` import (58-83) add, in alphabetical position:
`demoPlotCaption,` and `demoPlotPosLabel,` and `demoPlotResults,` after line 65
`  demoLiveViewModel,` (before `  demoRunEndS,`), and `  DEMO_TODAY_RIDE_ID,` after line 77
`  DEMO_SPEC_VOCABULARY,` (before `  type DemoGateAdjustDraft,`). After line 89
`import { RouteNamingCard } from './routeNamingCard';` insert
`import ResultsPlot from './resultsPlot';` (component import, extension-less like its
neighbours; default export).

**B2. State.** After line 151
`  const revealHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);` insert:

```ts
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
```

**B3. `enterEnding`.** Lines 220-223 are exactly

```ts
    const next = buildDemoReveal(mode, Date.now());
    setReveal(next);
    setRevealDone(next === null);
    setPhase('ending');
```

→

```ts
    const now = Date.now();
    const next = buildDemoReveal(mode, now);
    setReveal(next);
    setRevealDone(next === null);
    setEndedAtMs(now);            // brief 08: dates the plot (same instant as the reveal)
    setPlotSel(DEMO_TODAY_RIDE_ID);
    setPhase('ending');
```

**B4. Resets.** In `exitToIdle`, directly after line 240 `    setRevealDone(true);` insert
`    setEndedAtMs(null);` (the `setPlotSel` reset in B3 covers the next run). Nothing in
`start` needs changing (`endedAtMs` is null until the run ends).

**B5. The block.** In the ending JSX, directly after line 463 `          ) : null}` (the
close of `{revealDone ? (` … ) and before line 464 `        </ScrollView>`, insert:

```tsx
          {/* virgin-cycle14 brief 08 (Nathan #11): the RESULTS tab's scatterplot — the real
              ResultsPlot over this mode's synthetic priors + today's lap (demoPlotResults),
              exactly what the RESULTS detail would draw for this way after this ride. Shown
              once the reveal is done (the climb keeps its suspense), after the card (its
              buttons stay put). Nothing here is read from or written to storage. */}
          {revealDone && plotResults !== null ? (
            <View>
              <Text style={[styles.h2, { marginTop: 8 }]}>
                {demoPlotCaption(plotResults)} · AS ON THE RESULTS TAB
              </Text>
              <Text style={[styles.sub, { marginBottom: 10 }]}>
                purple = fastest of these · green / yellow = faster / slower than their average
              </Text>
              <ResultsPlot
                results={plotResults}
                selectedRideId={plotSel}
                selectedPosLabel={settings.tower ? demoPlotPosLabel(plotResults, plotSel) : ''}
                onSelect={setPlotSel}
                onOpenRide={() => { /* demo: there is no ride to open */ }}
              />
              <Text style={styles.trackLine}>demo only · nothing saved</Text>
            </View>
          ) : null}
```

The hint sentence is the real screen's literal (`ResultsDetailScreen.tsx:90`), copied by
value like every other cross-screen string in this file. `styles.h2` / `styles.sub` /
`styles.trackLine` are the existing DemoScreen styles (513, 514, 534) — no new style.
`revealDone` is true at once for FIRST (no reveal), so its plot sits under the naming card
from the first frame of the ending.

**B6. Header comment.** Lines 52-53 are exactly
` * route" variant — FIRST RIDE still mounts the both-endpoints-unknown card` /
` * straight away. Every SAVE/ADD WAY here is theatre: nothing is written.` and line 54 is
` */`. Insert directly above line 54:

```ts
 *
 * virgin-cycle14 brief 08 (Nathan #11): every mode's ending screen closes with the real
 * RESULTS-tab scatterplot (`ResultsPlot`) over this mode's synthetic priors plus today's
 * lap (`demoPlotResults`) — a preview of a screen no phone has real data for yet. Same
 * component, same tones, same caption; today's dot pre-selected; nothing stored.
```

### C. `app/tests/demo_suite.ts` (585 lines) — the plot cases

**C1. Imports.** In the destructure 33-40, add `demoTodayResult, demoPlotResults,
demoPlotPosLabel, demoPlotCaption, DEMO_TODAY_RIDE_ID,` on a new line before line 40
`} = await import('../src/ui/demoModel.ts');`. After line 45
`const { MIN_TRACK_LENGTH_M } = await import('../src/store/routeCreation.ts');` add
`const { buildPlotModel, plotWindow, PLOT_N, PAD_R } = await import('../src/ui/resultsPlotModel.ts');`.

**C2. Cases**, appended at the end of the file (after line 585), all `test('demoModel: plot — …')`,
`T = 2_000_000_000_000`, `W = 300` (plot width):

1. `demoTodayResult(T)`: `rideId === DEMO_TODAY_RIDE_ID`, `startedAtMs === T`,
   `lap.rawS === 836 && lap.movingS === 836`, `lap.quality === 'clean'`, `wayId === DEMO_WAY_ID`,
   `source === 'app'`, `sectors.length === 0`; with `buildDemoScript([1, 1, 1, 1])` → `rawS === 4`.
2. `demoPlotResults(mode, T)` for each of `'first' | 'second' | 'tenth'`: length
   `DEMO_PRIOR_LAPS[mode] + 1`; last element's id is `DEMO_TODAY_RIDE_ID`; the first
   `DEMO_PRIOR_LAPS[mode]` elements `JSON.stringify`-equal `demoPriorResults(DEMO_PRIOR_LAPS[mode], T)`;
   `startedAtMs` strictly ascending; `plotWindow(results).length === Math.min(results.length, PLOT_N)`
   (every row ranks).
3. TENTH window: `plotWindow(demoPlotResults('tenth', T))` has 9 entries, first id
   `'demo:prior-2'`, last `DEMO_TODAY_RIDE_ID` (the real slice(-9) drops the oldest).
4. TENTH model: `m = buildPlotModel(demoPlotResults('tenth', T), W)`: `m.empty === 'none'`,
   `m.points.length === 9`, `m.points[8].rideId === DEMO_TODAY_RIDE_ID` and `.tone === 'green'`,
   exactly one `'fastest'` and it is `'demo:prior-2'` (timeS 830), `'slower'` count 4,
   `Math.abs(m.meanS - 7598 / 9) < 1e-6`, `m.points[8].x === W - PAD_R`, `m.meanY` finite,
   every `x` within `[0, W]` and every `y` within `[0, m.plotH]`.
5. SECOND model: 2 points; today `'fastest'`, `'demo:prior-9'` `'slower'`; `meanS === 839`.
6. FIRST model: 1 point, `tone === 'fastest'`, `empty === 'none'`, `x === W - PAD_R`,
   `meanS === 836`, `yTicks.length >= 1`, `xTicks.length >= 1` (the component dedups them) —
   the real component's own one-ride rendering, no throw.
7. `demoPlotPosLabel`: tenth + today → `'P3 of 10'`; tenth + `'demo:prior-2'` → `'P1 of 10'`;
   second + today → `'P1 of 2'`; first + today → `'P1 of 1'`; `'nope'` → `''`; `null` → `''`.
8. `demoPlotCaption`: tenth `'LAST 9 RIDES'`, second `'LAST 2 RIDES'`, first `'LAST 1 RIDE'`.
9. No throw: `buildPlotModel(demoPlotResults(mode, T), 0)` for all three modes (the
   component's pre-layout width) returns `points.length === Math.min(n, PLOT_N)`; and
   `demoPlotResults('tenth', T, buildDemoScript([100, 100, 100, 100]))` → today's tone
   `'fastest'` (400 beats every prior) and `demoPlotPosLabel(..) === 'P1 of 10'`.

Assertion messages carry the actual values, as the rest of the suite does.

## Verification (executor runs all; report the actual numbers)

```
cd app && node --experimental-strip-types tests/run.ts      # BEFORE editing: record the baseline
cd app && node --experimental-strip-types tests/run.ts      # after: 0 FAIL, count = baseline + 9
cd app && ./node_modules/.bin/tsc --noEmit                   # clean, exit 0
cd app && grep -n "from '../store/" src/ui/DemoScreen.tsx    # expect: no output (house rule)
cd app && grep -c "ResultsPlot" src/ui/DemoScreen.tsx        # 3 (import, comment, JSX) — ≥ 2
cd app && grep -n "demoPlotResults\|demoPlotPosLabel\|demoPlotCaption\|demoTodayResult" src/ui/demoModel.ts | wc -l   # ≥ 6
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/demoModel.ts app/src/ui/DemoScreen.tsx app/tests/demo_suite.ts   # exactly these three
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/resultsPlot.tsx app/src/ui/resultsPlotModel.ts app/src/ui/ResultsDetailScreen.tsx app/src/ui/resultsListModel.ts   # no output
```

Baseline at writing (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip — other
parked cycle14 briefs may have moved it, hence the before-run. `tests/virginmanifest_suite.ts:286-288`
reads `DemoScreen.tsx` as text (no `ways.json`, no `'Morning'`) — B adds neither. If `tsc`
blows the call budget on this mount, retry once with a longer timeout, then report — never
substitute a syntax-only check without saying so.

## On-device checklist (Nathan, after OTA — not the executor; each in DAY and NIGHT theme)

1. **TENTH RIDE** → let it run → STOP after the line (or wait for the auto-STOP). The tower
   climbs as before; the plot is NOT visible during the climb. After the hold, the ADD WAY
   card appears as before; scroll down: `LAST 9 RIDES · AS ON THE RESULTS TAB`, the hint,
   the plot: 9 dots on a card-coloured frame, dates on the x-axis (Mondays, `dd Mon`),
   `m:ss` ticks on the y-axis, `avg 14:04` on the dotted line, faster = higher. Leftmost
   dot bigger and purple (13:50); today's dot rightmost, green, ringed; caption reads
   `<today's weekday dd Mon> · 13:56 · P3 of 10` with `open ›`. Then `DEMO ONLY · NOTHING SAVED`.
2. Tap a yellow dot: ring moves, caption shows its date/time/`P<n> of 10`; tap empty plot
   space: `tap a point for that ride`. `open ›` does nothing (expected, demo).
3. ADD WAY / SKIP still work; nothing about the card moved. After ADD WAY the saved line
   replaces the card and the plot follows it for ~2 s, then the reverse launch as before.
4. **SECOND RIDE**: two dots — the prior (yellow, 14:02, ~1 day left of today) and today
   (purple, 13:56, ringed, `P1 of 2`). Caption `LAST 2 RIDES`.
5. **FIRST RIDE**: under the naming card, `LAST 1 RIDE`, one purple dot at the right edge with
   the dotted average through it and one date label; `P1 of 1`. It stays through the gate
   card and the saved line. SKIP on the card leaves as before.
6. SETTINGS → rankings switch off (the `tower` toggle): the caption loses its `P… of …`
   segment; dots unchanged. Back on: segment returns.
7. [Corrected 2026-09-26: brief 04 removed the Luck factor toggle from SETTINGS in this
   same cycle, so there is no longer a switch to test here.] Timing is raw-only now;
   the plot is unaffected either way since synthetic laps have rawS = movingS.
8. Small phone: nothing overlaps; the plot is reached by scrolling; the STOP screen and the
   idle chooser are unchanged. Both themes: frame, dots, labels readable on the race
   background (the frame is the card colour, as on the RESULTS tab).
9. Real RESULTS tab: unchanged (empty board on a blank install).

## Out of scope

- The real RESULTS screen / plot / model — no edit, no prop added (the `open ›` no-op is
  accepted rather than adding an optional prop to `resultsPlot.tsx`).
- Real-data plumbing: no store reads, no result written, no way created — the demo saves nothing.
- DEMO speed (`RATE`/`TICK_MS`), modes, run screen, self dots, gate card, reveal timings.
- Extending `DEMO_HISTORY` or `DEMO_PRIOR_LAPS` (decision 2).
- A way-name line above the plot (the card / saved line just above already names the route).
- `STATE.md` / `OPEN-ITEMS.md` / this folder's `README.md` — the coordinator's.

## Interaction with briefs 01-07 (order: 06 first, then 08)

- **06** edits `DemoScreen.tsx`: replaces the idle line 474 (`Nothing is recorded.`), removes
  the mode subtext 496-503, and inserts one header line above line 44. None of that touches
  the ending view, `enterEnding`, the state block or the imports, so the two briefs are
  textually independent — but 06 shifts line numbers (+1 from 44, −7 from 496). Run 06 first,
  then 08 matching on quoted text; if 08 runs first, 06's anchors move by 08's inserts
  instead. Either order, match text, never numbers.
- **02** copies DEMO styles by value into its own `ReplayScreen.tsx` and does not touch
  `DemoScreen.tsx` / `demoModel.ts` / `demo_suite.ts`. Independent. (No plot in the replay —
  its brief keeps the rank on the detail screen underneath.)
- **05** edits `wayMapView.tsx` (the demo's map gets the "i" button for free); **07** edits
  `RecordScreen.tsx`; 01/03/04 edit `settings.tsx`. No overlap with 08's three files.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only (two `src/ui` edits, one suite; no
`package.json` change), so it ships to the Preview APK over EAS Update via
`scripts/publish-preview.cmd` — no numbered build, no reinstall. Nothing changes on the
phone until it is built and published. The only visible change is the plot block at the
bottom of the DEMO ending screen; the DEMO tab is labelled "not part of the final app"
(brief 06's line), so this is a preview surface for Nathan and testers, not a shipped
feature — the real RESULTS tab draws the very same component from real rides.

## Open questions / assumptions (logged, not blocking)

- **Nine dots in every mode?** Default: honest per mode (decision 2). If Nathan wants the
  full plot after FIRST/SECOND too, change B2's `demoPlotResults(mode, endedAtMs)` to
  `demoPlotResults('tenth', endedAtMs)` — one token; the tower/self dots above stay honest.
- **Above or below the card?** Default: below (decision 3). Moving the B5 block above line
  424's `{revealDone ? (` is a cut-and-paste; the tower would then be followed by ~300 px of
  plot before the card — visible without scrolling on TENTH, card pushed down.
- **Pre-selected today's dot** differs from the real screen's blank start (decision 4). To
  match the real screen instead: `useState<string | null>(null)` in B2 and drop the
  `setPlotSel(DEMO_TODAY_RIDE_ID)` line in B3.
- **`open ›` is dead in the demo.** Hiding it would need an optional `onOpenRide` in
  `resultsPlot.tsx` (out of scope by rule). Nathan's call whether that small real-component
  change is wanted later.
- **Today's `startedAtMs = end-of-ride instant`** (same as the reveal), not minus the lap —
  invisible at the plot's day scale.
- **Tester not named** in the source; recorded as such.

---

Design preview of the expected result (day + night, all three modes), with the code that made it:
`design/results-scatterplot-demo-preview/` (see its README for what is real vs drawn).
