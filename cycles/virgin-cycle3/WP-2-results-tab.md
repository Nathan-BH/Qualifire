**Status: BRIEF WRITTEN, NOT YET EXECUTED.** Three phases, strictly sequential (A → B → C): A is pure models + tests, B is the tab, the list screen, the Shell wiring and the detail screen with map + ranked board, C is the scatterplot component and its wiring into B's detail screen. Each phase is its own Sonnet Execute dispatch with its own acceptance list.
**Open item:** new ask, Nathan 2026-09-05, two messages ("re-introduce the results tab … each way by its full name … ranked from most to less used … pressing the way opens … openmap preview … ranking tower with all the rides … below it a scatterplot … x chronological, y full ride time … dotted line with the average … scrollable left-right … how much standard deviation … or slowest and fastest ± buffer?" / "this scatterplot is directly inspired by strava"). Size: **medium-large** — two new pure model modules + tests (A, small-medium); one new tab, one new list screen, one new detail screen, Shell/tabNav plumbing (B, medium); one hand-rolled plot component (C, medium). Not in `OPEN-ITEMS.md` yet — the coordinator adds it under the "virgin-cycle3" block when this brief is accepted.
**Written by:** Plan tier (Fable) — a structural call (sixth tab vs. sub-view, unbounded ranking vs. `STATE.md`'s window rule, native chart dependency vs. hand-rolled) plus an explicitly research-backed axis-scaling decision; not a fix the coordinator should rule on.
**Verified against the device tree 2026-09-05 (evening).** Every `file:line` below was read on the device. `App.tsx` and `settings.tsx` are also touched by WP-1 (§9 collision notes) — re-grep every anchor before editing.
**WP-1 interplay:** this feature must be **sport-scoped once WP-1 lands** — the RESULTS list reads `activeCatalog()` instead of `currentCatalog()` (one identifier; §4 B2 marks the line). Nothing else here depends on WP-1; WP-2 Phase A/B/C can land before or after it.

---

# WP-2 — RESULTS tab: per-route history, all-time ranked board, Strava-style time scatterplot

## 1. What it is

SETTINGS still carries a "Rankings" switch (`settings.tsx:353`), but since WP-H dropped the RESULT tab the only place a ranking is visible is the "ON THIS ROUTE" block inside a single ride's detail (`RideDetailScreen.tsx:81-120`) — the last 10 on that route, seen through the lens of one ride. There is no place to *browse* how a route has been going. Nathan wants that place back as a top-level tab, and wants it to be fun: a list of every route he actually rides, most-ridden first, each named in full; tap one and get the map, the whole ranked history, and a time-over-date scatterplot with an average line, scrollable back through time.

### 1.1 What Strava actually does (research, 2026-09-05)

Nathan's design is a near-direct transplant of Strava's **"My Results"** segment view, so the official help article settles most of the shape questions ([My Segment Results — Strava Help Center](https://support.strava.com/hc/en-us/articles/216917447-My-Segment-Results)):

- There is a graph of segment efforts over time: *"The x-axis represents the date of an effort, and the y-axis represents an effort's time."* Time increases **upward** — the PR is the lowest dot.
- *"Your PR will be represented as a gold dot."* Every other effort is a plain dot; there is no average or trend line.
- *"Scroll up and down the efforts list or right and left on the graph to see more efforts."* — a fixed-height chart you pan horizontally through time, with a list underneath.
- The list under the graph *"lists your segment efforts in ascending order by segment time"* (fastest first, i.e. an all-time ranking of your own efforts), and *"Tap any date from the efforts list to be taken to that activity page."*
- Arriving from an activity, on mobile *"a red line will represent the activity's effort"* — one highlighted effort.

The help article says nothing about how the y-axis is fitted; Strava's "Effort Comparison" ([Strava Help Center](https://support.strava.com/en-us/articles/15402094-effort-comparison)) is a different chart (time-gap vs. distance along the segment, web only) and is not what Nathan means. Nothing found describes a standard-deviation window on that chart, and Strava's pan-through-time model only works with a **fixed** y-axis: if the axis re-fitted to whatever is in view, points would jump vertically while you pan and an average line would move with them. So the axis-scaling decision (§3.3) is ours to make; what we take from Strava is: date-x / time-y with time upward, PR singled out by colour, fixed axis, horizontal pan, ranked list underneath, tap-through to the ride.

### 1.2 Vocabulary: Nathan's "way" here is the code's *route*

Nathan: *"show each way by its full name … FromToSpecification1Specification2 … each individual way is separate."* In this codebase the thing that carries specs and has its own results is the **route** (a way's variant; `Route.specs`, `RideResult.routeId`); the full name he describes is exactly `routeLabelIn(catalog, routeId)` (`defaultRoute.ts:73-79`: `"Home → Work · fast · via park"`). So the RESULTS list is **one row per route**, and everything on the detail screen (board, plot, PB) is per route — which is also the only level at which results, PBs and the tier model exist. Nothing here needs a way-level aggregate.

## 2. Current state (re-verified)

| Thing | Where | Fact |
|---|---|---|
| Tab set | `tabNav.tsx:18` `Tab = 'record'\|'rides'\|'routes'\|'settings'\|'demo'`; `App.tsx:202` renders `['record','rides','routes','settings','demo']` | Old RESULT **was a top-level tab**, at slot 4: `git show 0bb025d^:app/App.tsx:144` = `['record','rides','routes','result','settings','demo']`. WP-H removed it. |
| Tab bar | `App.tsx:195-212, 248-262` | horizontal `ScrollView`, tabs `minWidth: 92`, comment: *"Five tabs (WP-H dropped RESULT) still scroll sideways rather than shrinking — Nathan, 2026-08-16, on the original six."* Six tabs is the sanctioned original shape. |
| Overlay pattern | `App.tsx:64-82` (state), `:96-119` (back handler order gateAdjust → rideDetail → catalogDetail → tab → default), `:154-155` (`tabBarHidden`), `:167-177` (`nav` object), `:184-192` (mount-swap ternary) | four instances of "screen owns intent, Shell owns chrome"; `CatalogDetailScreen.tsx` is the newest and the template (`:40-141`: `request` prop, per-render `currentCatalog()`, `useMemo` model, `null` model ⇒ `useEffect` closes, top bar `‹ BACK` / title / caption, body, bottom `BACK TO ROUTES` button) |
| Ride detail source | `tabNav.tsx:29-33` `RideDetailRequest.source: 'post-stop'\|'rides'\|'routes'`; `RideDetailScreen.tsx:359` `primaryLabel` ternary (fallback `'BACK TO RIDES'`) | only consumer of `source` — safe to extend |
| Rankings switch | `settings.tsx:28,43` `tower: boolean` default true; `:353-355` Row "Rankings", hint *"Show where each ride placed against your others on that route."*; `RideDetailScreen.tsx:420` `showRanking={s.tower}` → `PbDetail` (`:83-120`) hides the ranking **rows** when off, keeps the caption ("last N on this route") and the PB sectors | the switch hides position claims; it never hides a screen |
| Ranking pool | `colourModel.ts:29-36` `WINDOW_N=10`, `WINDOW_PREV=9`; `rankingPoolFor()` `:84-95`; `STATE.md:99-100` *"The ranking window is the 9 most recent previous rides plus the current one — never a global ranking, never 'of 11'."* | pool for **judging a ride** (tier colours, "P_n of 10") — origin is the cycle-025 "P10 of 11 vs P9" bug and cycle-009 frozen-window bug (`colourModel.ts:25-36`) |
| Unbounded ranker | `results.ts:108-131` `tower(results: RideResult[]): TowerRow[]` — sorts by `scoredS`, 1-based positions, appends `ranks()`-failing laps with `position: null`; `ranks()` `:92-97` excludes estimated/missed, tripwire-demoted, `ignoredFromRanking` | already exists, already tested, takes any array — no cap |
| Tower component | `tower.tsx:56-58,76-107` `TimingTower`: `MAX_VISIBLE=8`, pre-scroll around TODAY, slot-in animation, `clippedBelow` | built for the post-ride board; with no `today` row it shows the first 8 and clips — **not** an "all rides" list |
| Results store | `resultsStore.ts:210-223` `storedResults()`, `storedResultsForRoute(routeId)` (ascending `startedAtMs`), `getStoredResult()`; `RideResult` `types.ts:102-125` (`startedAtMs`, `routeId`, `source`, `lap{rawS,movingS,quality}`, `tripwireDemoted?`, `ignoredFromRanking?`) | `CatalogDetailScreen.tsx:69` already uses `storedResultsForRoute(routeId).length` as "results on file" |
| Time helpers | `timing.ts:36` `scoredS(lap)` (wall-clock or moving per setting); `colourModel.ts:152` `allTimeBestLapS(routeId)`, `:168` `fmt(s)` → `m:ss`; `towerModel.ts:31` `towerDate(ms)` → `Tue 05 Aug`; `rideHistoryModel.ts:51` `dateTimeLabel(ms)` | reuse, do not re-implement |
| Map preview | `CatalogDetailScreen.tsx:322` `<RouteMapView variant="browse" routeId={r.refLineId} lat={null} lon={null} zoom={1} height={260} showRider={false} />`; `RideDetailScreen.tsx:383-395` same with `sectorColours` | `routeId` prop takes the **`refLineId`**, not the catalog route id |
| Charting | `package.json:12-22`: Expo 56, RN 0.85.3, MapLibre — no svg, no chart lib, no reanimated/gesture-handler | `README-dev.md:34`: *"any other new native module, THAT will force a rebuild"* (EAS dev-client build). `react-native-svg` is a native module. |
| Dashed borders | `chips.tsx:71,102,128` `borderStyle: 'dashed'` on full-bordered Views | precedent exists only for full borders; a single dotted edge is unreliable on Android |
| Layout measure | `routeMapView.tsx:933,963` `onLayout` pattern; `GateAdjustScreen.tsx:34` `useWindowDimensions` | use `onLayout` for the plot viewport |
| Test conventions | `tests/catalogdetail_suite.ts:1-40` — pure model, inline hand-built fixtures, `assert`/`test` from `tests/lib.ts`; suites registered in `tests/run.ts:9-38` | new suites follow this |

## 3. The design decisions

### 3.1 A sixth top-level tab, `'results'`, in RESULT's old slot

Nathan said "re-introduce the results tab", the old RESULT *was* a top-level tab, and the bar's sideways-scroll behaviour was ruled by him **for six tabs**. Folding it into RIDES (a segmented header there) was considered and rejected: RIDES is a chronological log of individual rides — including free rides that belong to no route — and its rows open a *ride*; RESULTS is a per-route view whose rows open a *route*. Different subject, different sort, different detail. Merging them would make RIDES carry two mental models. **Decision:** `Tab` gains `'results'`; `App.tsx:202` array becomes `['record','rides','routes','results','settings','demo']` — the exact old order (`0bb025d^`). The label renders as the raw string `results`, like every other tab.

### 3.2 The `STATE.md` window rule does not govern this screen — but the screen must not *look* like it breaks it

The rule (`STATE.md:99-100`) exists to make a **verdict** honest: a ride's tier colours and its "P_n of 10" line are judged against a fixed, recent, same-size field, so the purple bar can move and so "of 11" can never appear. That is a *scoring* rule, born from two concrete bugs in the scoring pool (`colourModel.ts:25-36`). RESULTS makes no verdict: it lists what happened, fastest first, over the rider's whole record — the same thing Strava's efforts list does and the thing Nathan explicitly asked for ("ranking tower with all the rides").

**Decision: the RESULTS board lists ALL stored rides on the route, fastest first, with all-time positions 1..N — and it never colours a time by tier.** Concretely:

- Positions are all-time (`tower()` from `results.ts`, unbounded, exactly as Nathan asked). The caption above the board says so in words: `ALL 27 RIDES · fastest first`. A position on this board is a *fact about the list*, not a verdict about a ride, and the caption makes the framing explicit so it cannot be confused with the ride detail's "P3 of 10" (which stays exactly as it is — that is the scoring pool's claim and the window rule still owns it).
- **No green/yellow/purple tier colours on the board's times.** A tier is a judgement against the 9-window that ride was judged in; re-judging 27 rides against each other would be a *new* global scoring model, which is precisely what the rule forbids. Times are ink (`t.text`). The only colour is the all-time PB marker ● (D-007, `allTimeBestLapS`) — that is already an all-time claim everywhere in the app.
- Rides `ranks()` excludes (rider-ignored, tripwire-demoted) sit at the bottom under a dim `not ranked` sub-caption with their time and no position — present, honest, uncounted. Estimated/missed laps ("NO TIME") are listed there too, time shown as `NO TIME`.
- `STATE.md` needs a one-clause amendment when this lands (coordinator's file): *"…never a global ranking, never 'of 11' — for scoring and the ride detail's rank line. The RESULTS tab's all-time list is a history view, not a scoring pool, and shows no tier colours."* Nathan asked for exactly this list, so this is a wording fix, not a product change; flagged in §10 Q1 so he can veto.

The `TimingTower` component is **not** reused: its anatomy (TODAY row, slot-in, 8-row clip, pre-scroll) is the post-ride board's. A new plain `HistoryBoard` renders all rows inside the page's own `ScrollView` (no nested scroll), reusing the tower's row proportions (`PAST_H` 38 px, `P# · time · gap · date`) and `towerDate()`.

### 3.3 Y-axis scaling: not standard deviation; fixed all-time fit, Tukey fence for slow outliers, minimum span, never a hidden point

Nathan's own question. Candidates and why they fall:

- **Mean ± k·SD.** With 2–5 rides SD is noise (two rides give SD = half their difference; three rides can give a window that clips the third). With many rides a fat-tailed history (one puncture, one headwind day) inflates SD and the ordinary rides compress into a band; a thin history clips real outliers off the top. Either failure is one Nathan named. Rejected.
- **Visible-window min/max ± buffer.** Re-fits as you pan → points and the average line move vertically while scrolling, and two identical times in different months sit at different heights. Breaks the "pan through time" model (§1.1). Rejected.
- **All-time min/max ± buffer.** Stable, honest, simple — and one 48-minute ride on a 20-minute route squashes two years of 19–22-minute rides into a 10-pixel band. Fails "not too much whitespace". Rejected as-is.
- **All-time fit on the *core* of the data, with off-scale markers for the few slow outliers.** Stable axis (fixed across the pan), no compression from one bad day, and no point is ever *absent* — an outlier is drawn as a hollow marker pinned to the top edge with an up-caret, so it is visible and tappable, just not scaled to. **Chosen.**

The algorithm, pure and unit-tested (`resultsPlotModel.ts`, §4 A2):

1. **Plotted set** P = stored results on the route with a real time: `lap.quality ∉ {estimated, missed}` and `scoredS(lap) !== null`. Each point: `{rideId, tMs: startedAtMs, timeS, ranked: ranks(r), pb}`. Estimated/missed laps are not points (they have no time — D-028); they still appear on the board as `NO TIME`.
2. **Fit set** F = times of ranked points; if F is empty, F = times of all points; if still empty → empty state (§4 C3).
3. **Slow fence** (only when |F| ≥ 8 — below that every ride is core): `hi = Q3 + 1.5·IQR` of F (Tukey; quartiles by linear interpolation). Core = F ≤ hi. Points with `timeS > hi` are **off-scale** (`offScale: true`). No fast fence, ever: a PB is the most interesting point on the chart and is never an outlier.
4. **Average** = arithmetic mean of F when ranked points exist (null otherwise). Mean, not median: the tier model already judges against *the average of rides on record* (`STATE.md:97-98`), so the dotted line and the tier model agree on what "average" means; a ride the rider has marked "Ignore in ranking" is already out of F, which is the existing remedy for a run that should not drag the average.
5. **Domain**: `lo = min(core ∪ {mean})`, `hiC = max(core ∪ {mean})`, `span = hiC − lo`. **Minimum span** `minSpan = max(30 s, 0.05 · median(F))` — three rides within 4 s of each other must not fill the plot with 4 seconds of drama; expand symmetrically about the midpoint to `minSpan` when `span < minSpan`. Then **pad 10 %** of the (possibly expanded) span on each side: `yMin = lo − 0.1·span`, `yMax = hiC + 0.1·span`.
6. **Pixel mapping**: `y(timeS) = plotH − (timeS − yMin) / (yMax − yMin) · plotH` — time increases upward, PB at the bottom (Strava's orientation). Off-scale points are drawn at `y = OFF_SCALE_Y = 6` regardless of value.
7. **Y ticks**: step chosen from `[5,10,15,20,30,60,120,300,600,900]` s as the smallest that yields ≤ 5 ticks across `[yMin, yMax]`; ticks at multiples of the step inside the domain; labels via `fmt()`. The average label (`avg m:ss`) sits in the same gutter at `y(mean)`; any tick label within 12 px of it is dropped (label collision handled in the model, not the component).

What this does over time: month 1 (three rides) — no fence, span floored to 30 s or 5 %, one dotted line, three dots, no whitespace problem. Year 2 (120 rides, two punctures) — the axis is fitted to the 118 ordinary rides, the two punctures are carets on the top edge, the average is honest, panning never moves anything vertically.

### 3.4 X-axis: real time, fixed density, newest at the right edge, pan by native horizontal scroll

- x is **proportional to time** (Nathan: "chronological time"; Strava: date). Not ordinal-per-ride: evenly spaced dots would hide the gaps that make a history readable (a month off shows as a month of space).
- **Density is a constant `PX_PER_DAY = 24`.** Two rides on the same route 8 h apart are 8 px apart (points r = 4 — touching, not stacked); a week is 168 px, a year ≈ 8.8 k px ≈ 22 phone widths — a couple of fast flicks. No zoom in this WP.
- **Right-anchored**: `contentW = max(viewportW, spanDays·PX_PER_DAY + PAD_L + PAD_R)` (`PAD_L = PAD_R = 16`); `x(t) = contentW − PAD_R − (tNewest − t)/DAY · PX_PER_DAY`. The newest ride is always at the right edge, whatever the span; a sparse route with two rides a year apart is two dots at the two ends of a scrollable strip, which is the truth.
- **Initial scroll position = right end** (newest). Do it with `scrollRef.current?.scrollToEnd({ animated: false })` from `onContentSizeChange` (not the `contentOffset` prop — platform-uneven).
- **X ticks**: month boundaries inside `[tOldest − PAD, tNewest]`, labelled `Sep`; the first tick of the strip and every January carry the year (`Jan 26`). When the whole span is under 45 days, weekly ticks on Mondays labelled `dd Mon` instead. Tick lines are hairlines in `t.cardBorder`, labels `t.textDim` 11 px, drawn inside the scroll content so they pan with the points.
- The **y gutter (44 px, labels + avg label) and the dotted average line are outside the horizontal `ScrollView`**, overlaid at fixed y — one View regardless of content width, and the axis visibly stays put while the strip pans.

### 3.5 Hand-rolled with plain Views — no `react-native-svg`

`react-native-svg` is the ecosystem's natural pick and would be the recommendation in a fresh project. Here it is a **native module**, and `README-dev.md:34` is explicit that any new native module forces an EAS dev-client rebuild on Nathan's phone (and the Preview APK) — a real cost that this WP would be the only reason for. The shape inventory is trivial: filled circles, hollow circles, a horizontal dotted line, hairline ticks, text — every one a `View` with `borderRadius`/`borderWidth`, absolutely positioned from a pure layout model. No curves, no paths, no gradients. A route with 300 rides is 300 small Views inside a `ScrollView` — well within RN's comfort, and the vertical page scroll is unaffected.

- **Dotted average line**: a `flexDirection: 'row'`, `overflow: 'hidden'` View of width `plotW` filled with `ceil(plotW / 6)` 2×2 px `borderRadius: 1` Views spaced 4 px — robust on both platforms. Do **not** rely on `borderStyle: 'dotted'` on a single edge (Android draws it inconsistently; the repo's `chips.tsx` precedent is full borders only).
- **Points**: ranked = filled `t.text`, r 4; **PB** = filled `colors.purple`, r 5 (Strava's gold dot, in this app's PB colour — purple is already "all-time best" everywhere); not-ranked (rider-ignored / tripwire) = hollow, 1.5 px `t.textDim` border, r 4; **off-scale** = the point's own style pinned at `OFF_SCALE_Y` with a 9 px `▲` `Text` in `t.textDim` just right of it; **selected** = an extra 2 px ring in `t.accent` (r 8) around the point — accent is identity chrome, never a tier, exactly like the tower's TODAY bar.
- **Tap**: every point is a `Pressable` with `hitSlop: 8`. Tapping selects it (state in the detail screen, not the plot): the point gets the accent ring, the matching board row gets the tower's accent left bar, and a one-line **caption** appears directly under the plot: `Tue 05 Aug · 21:34 · P3 of 27 · open ›` (`not ranked` instead of `P_ of _` for hollow points; `off scale · ` prefix for pinned ones). Tapping the caption opens the ride (`tabNav.openRide({ rideId, source: 'results', startedAtMs })`). Tapping a board row opens the ride directly (Strava: "tap any date … to be taken to that activity"). Tapping empty plot space clears the selection. This is in scope: it is ~30 lines and it is what makes the plot more than a picture.
- **Sparse data**: 1 ride → one dot at the right edge, the dotted line through it, `minSpan` gives it a readable axis, caption row shows nothing until tapped; the board caption reads `ALL 1 RIDE · fastest first`. 0 plottable rides but some `NO TIME` rides → plot area shows the dim line `no timed rides yet` at plot height 120 (not 220); board still lists them. 0 rides at all cannot happen — the list only offers routes with ≥ 1 stored result (§3.6) — but the detail must survive it anyway (a ride deleted from the ride detail that was opened from here): same `no rides on file` line, map still shown.

### 3.6 The list: routes with ≥ 1 stored result, most-ridden first

- Rows = every route in the catalog with `storedResultsForRoute(id).length ≥ 1`, sorted by that count **descending**, ties by most recent `startedAtMs` descending, then by label. Row: full label (`routeLabelIn`), right-aligned `N rides` (`1 ride`), second dim line `best m:ss · last Tue 05 Aug` (`allTimeBestLapS`, last result's date). Tap → `tabNav.openResults({ routeId })`.
- **Routes with zero rides are not rows.** RESULTS is about what you have been completing; unridden routes belong to ROUTES. A dim footer line states the count so nothing feels hidden: `4 more routes with no rides yet — see ROUTES` (omitted when 0).
- Empty state (no route has any result): one dim paragraph, `no results yet — finish a ride on a route and it shows up here`, no button (the empty-state pass is OPEN-ITEMS item 4's job).
- Header line above the list: `RESULTS` in `st.h2` style like RIDES/ROUTES. Once WP-1 lands, the sport badge line WP-1 B2 adds to ROUTES/RIDES goes here too (WP-1's executor adds it there when it lands second; if WP-2 lands second, WP-2's executor adds it here — §9).
- Archive ghosts (`shippedResults()`, Nathan's dev build only) are not `storedResults()` and will not appear. Correct for virgin (there are none); on the dev build the seeded ways show only rides recorded on the phone. Not a defect.

### 3.7 The Rankings switch: RESULTS respects it exactly the way the ride detail does

The switch's hint is *"Show where each ride placed against your others on that route"* and its effect today is to hide **position rows**, never a screen (`PbDetail`). Hiding a whole tab from a SCORING switch would be bizarre and undiscoverable. **Decision:** the tab is always present. On the detail, when `s.tower` is off the board collapses exactly like `PbDetail`: the caption stays (`ALL 27 RIDES · rankings off in SETTINGS`), the rows are not rendered. The plot is a time series making no placement claim and is unaffected. The list's `best m:ss` is an all-time PB fact (shown everywhere regardless of the switch) and stays. The hint text at `settings.tsx:353` becomes *"Show where each ride placed against your others on that route — in the ride detail and on RESULTS."* (one string).

### 3.8 Screen structure of the detail (top to bottom)

Top bar (`‹ BACK` · `RESULTS` · caption `27 rides`) → route full name (`st.h1`-sized, `t.text`) → `RouteMapView variant="browse"` (`routeId={route.refLineId}`, `height={260}`, `showRider={false}`, no sector colours — this is a route, not a ride) → section `HISTORY` with the scatterplot (Phase C; Phase B renders the section header and a 220 px placeholder card reading `plot lands in Phase C` — removed in C) and its caption row → section `ALL N RIDES · fastest first` with the board → bottom `BACK TO RESULTS` button. Nathan's order was map → tower → plot; the plot is placed **above** the board because the board is unbounded in height (27+ rows) and the plot is the thing you came to look at — put the fixed-height element first so it is always on the first screen. This is a deliberate deviation; §10 Q2.

## 4. The fix — Phase A: pure models + tests (no UI)

**A1. New `src/ui/resultsListModel.ts`** (pure; imports only `types.ts`, `defaultRoute.ts`, `timing.ts`, `results.ts`, `towerModel.ts`'s `towerDate`, `colourModel.ts`'s `fmt`):
- `interface ResultsListRow { routeId: string; label: string; rides: number; bestLabel: string | null; lastLabel: string | null }`
- `interface ResultsListModel { rows: ResultsListRow[]; unriddenRoutes: number }`
- `buildResultsList(catalog: Catalog, resultsFor: (routeId: string) => RideResult[], bestS: (routeId: string) => number | null): ResultsListModel` — §3.6 sort; `bestLabel = bestS !== null ? fmt(bestS) : null`; `lastLabel = towerDate(max startedAtMs)`.
- `interface HistoryRow { rideId: string; startedAtMs: number; pos: number | null; timeLabel: string; gapLabel: string; dateLabel: string; pb: boolean; noTime: boolean }`
- `interface HistoryBoardModel { rows: HistoryRow[]; ranked: number; total: number }`
- `buildHistoryBoard(results: RideResult[], allTimeBestS: number | null): HistoryBoardModel` — `tower(results)` from `results.ts:108` for order and positions; `gapLabel` `'—'` for pos 1, `+Xs` (whole seconds, like `towerModel.ts:104`) for others, `''` for unranked; `pb` on the FIRST row whose time equals `allTimeBestS` (towerModel's rule); `noTime` when `timeS` is null or quality estimated/missed → `timeLabel 'NO TIME'`; `dateLabel = towerDate(startedAtMs)`. Unranked rows keep `tower()`'s order (after ranked, input order).

**A2. New `src/ui/resultsPlotModel.ts`** (pure; imports `types.ts`, `timing.ts`, `results.ts`, `colourModel.ts`'s `fmt`):
- Constants exported: `PX_PER_DAY = 24`, `PAD_L = 16`, `PAD_R = 16`, `PLOT_H = 220`, `GUTTER_W = 44`, `OFF_SCALE_Y = 6`, `MIN_SPAN_S = 30`, `MIN_SPAN_FRAC = 0.05`, `PAD_FRAC = 0.10`, `FENCE_MIN_N = 8`, `TICK_STEPS_S = [5,10,15,20,30,60,120,300,600,900]`, `MAX_Y_TICKS = 5`, `WEEKLY_TICKS_UNDER_DAYS = 45`, `LABEL_COLLISION_PX = 12`.
- `interface PlotPoint { rideId: string; startedAtMs: number; timeS: number; x: number; y: number; ranked: boolean; pb: boolean; offScale: boolean }`
- `interface PlotTick { at: number; label: string | null }` (y: `at` in px from the top; x: `at` in px from the left of the content)
- `interface PlotModel { points: PlotPoint[]; contentW: number; plotH: number; yMin: number; yMax: number; meanS: number | null; meanY: number | null; yTicks: PlotTick[]; xTicks: PlotTick[]; empty: 'none' | 'no-timed' }`
- `fitDomain(rankedTimes: number[], fallbackTimes: number[]): { yMin, yMax, meanS, fenceHi: number | null }` — §3.3 steps 2–5, exported separately so the tests can pin it without pixels.
- `buildPlotModel(results: RideResult[], viewportW: number, allTimeBestS: number | null, nowMs: number): PlotModel` — §3.3 + §3.4 in full. `nowMs` is unused by the layout (the right edge is the newest ride, not now) but is threaded for the tick-label year rule's "current year" only if the executor finds it needed; otherwise drop the parameter — either is fine, say which in the report.
- `quantile(sorted: number[], q: number): number` (linear interpolation) and `mean`, `median` — small, exported for tests.

**A3. Tests — new `tests/resultsmodel_suite.ts`**, registered in `tests/run.ts` after `catalogdetail_suite.ts`. Inline fixtures in the style of `catalogdetail_suite.ts:15-40` (a `Catalog` with three routes, hand-built `RideResult`s via a `mk(rideId, startedAtMs, rawS, quality?, extra?)` helper).
1. `buildResultsList`: route with 5 rides before route with 2; a route with 0 results is absent and counted in `unriddenRoutes`; tie on count broken by most recent ride; labels come from `routeLabelIn`; `bestLabel` null when `bestS` returns null.
2. `buildHistoryBoard`: 4 ranked + 1 ignored + 1 estimated → positions 1..4, ignored and estimated after them with `pos null`; estimated has `timeLabel 'NO TIME'`, `noTime true`; ignored keeps its time; `gapLabel` `'—'` then `+Xs`; `pb` on exactly one row (the first equal to `allTimeBestS`); `ranked 4`, `total 6`.
3. `fitDomain`: (a) one time 1200 → span floored to `max(30, 60)=60`, domain `[1200−30−6, 1200+30+6]`; (b) three times within 4 s → floor applies; (c) 12 times 1150–1260 plus one 2900 → `fenceHi` finite, 2900 > fence, domain top < 2900; (d) 5 times with one huge value → **no** fence (n < 8), domain includes it; (e) mean always inside `[yMin, yMax]`; (f) empty ranked, non-empty fallback → fits fallback, `meanS null`.
4. `buildPlotModel` pixels: newest point `x === contentW − PAD_R`; two rides 1 day apart differ in `x` by `PX_PER_DAY`; `contentW === viewportW` when the span is shorter than the viewport; the PB point has `pb true` and `y` is the largest (lowest on screen) among ranked points; an off-scale point has `y === OFF_SCALE_Y` and `offScale true`; `yTicks.length ≤ MAX_Y_TICKS`; a tick within `LABEL_COLLISION_PX` of `meanY` has `label null`; `xTicks` are monthly for a 200-day span and weekly (Mondays) for a 20-day span; `empty === 'no-timed'` when every result is estimated.
5. `quantile` on `[1,2,3,4]`: q=0.25 → 1.75, q=0.75 → 3.25 (linear interpolation pinned so the fence is reproducible).

## 5. The fix — Phase B: tab, list screen, Shell wiring, detail screen with map + board

**B1. `tabNav.tsx`.** `Tab` (`:18`) gains `'results'`. New `export interface ResultsDetailRequest { routeId: string }`. `RideDetailRequest.source` (`:30`) gains `'results'`; extend its doc comment: *'results' → back to the RESULTS route detail underneath*. `TabNav` gains `openResults(req: ResultsDetailRequest): void` / `closeResults(): void` with doc comments in the WP-K style. Update the header comment's list of overlay setters.

**B2. New `src/ui/ResultsScreen.tsx`** — the tab. Structure copied from `RidesScreen.tsx`'s outer shape (page `ScrollView`, `st.h2` header). Per render: `const CATALOG = currentCatalog(); // WP-1: becomes activeCatalog() once WP-1 Phase A lands` (this exact comment, so the WP-1 executor can grep it). Model: `buildResultsList(CATALOG, storedResultsForRoute, allTimeBestLapS)` in a `useMemo` keyed on a local tick (bump on mount — the results store can change under the screen after a backfill on RIDES; a remount re-reads anyway because tabs mount-swap). Rows are `Pressable` → `tabNav.openResults({ routeId })`. Footer/empty per §3.6. Card/row styling: reuse `RidesScreen`'s row look (border, `t.card`, `radius`) — copy, don't import, per the repo's "chrome copied, not imported" convention (`CatalogDetailScreen.tsx:3-5`).

**B3. New `src/ui/ResultsDetailScreen.tsx`** — the overlay, modelled line-for-line on `CatalogDetailScreen.tsx:40-141`: `{ request }: { request: ResultsDetailRequest }`, `useTheme`, `useTabNav`, `useSettings` (for `s.tower`), per-render `currentCatalog()`, `route = CATALOG.routes.find(...)`; `route === undefined` ⇒ `useEffect` → `tabNav.closeResults()` and render `null` (§3.4 of WP-K, same wording). `results = storedResultsForRoute(request.routeId)`, `best = allTimeBestLapS(request.routeId)`, `board = buildHistoryBoard(results, best)`. Layout per §3.8; the HISTORY section renders the 220 px placeholder card in this phase. `HistoryBoard` is a local component in this file: caption row (`ALL {total} RIDES · fastest first` / `ALL 1 RIDE …` / when `!s.tower`: `ALL {total} RIDES · rankings off in SETTINGS`), then (only when `s.tower`) one 38 px row per `HistoryRow`: `pos` (`P3`, or `—` for unranked) · `dateLabel` (flex 1, `t.textDim`) · `timeLabel` (`t.text`, tabular, `NO TIME` in `colors.grey`) with ● in `colors.purple` when `pb` · `gapLabel` (`t.textDim`). Between the last ranked and the first unranked row a dim `not ranked` sub-caption. Row `Pressable` → `tabNav.openRide({ rideId, source: 'results', startedAtMs })`. A `selectedRideId: string | null` state exists already in this phase (rows get the accent left bar when selected) so Phase C only wires the plot to it. Bottom button `BACK TO RESULTS` → `tabNav.closeResults()`.

**B4. `App.tsx` Shell.** State `const [resultsDetail, setResultsDetail] = useState<ResultsDetailRequest | null>(null);` after `catalogDetail` (`:82`) with a WP-2 comment in the WP-K style ("fifth instance … sits UNDER rideDetail: the board opens rides, so their BACK lands on it"). Back handler (`:96-119`): insert `if (resultsDetail !== null) { setResultsDetail(null); return true; }` after the `catalogDetail` branch; add `resultsDetail` to the deps array. `tabBarHidden` (`:154-155`): `|| resultsDetail !== null`. `nav` (`:167-177`): `openResults: setResultsDetail, closeResults: () => setResultsDetail(null)`. Mount-swap ternary (`:184-192`): after the `catalogDetail` line, `: resultsDetail !== null ? <ResultsDetailScreen request={resultsDetail} />`, and `: tab === 'results' ? <ResultsScreen />` after the `routes` line. Tab array (`:202`): `['record','rides','routes','results','settings','demo']`; update the "Five tabs" comment to "Six tabs (RESULTS back, WP-2 cycle 3)". Imports for the two new screens.

**B5. `RideDetailScreen.tsx:359`** `primaryLabel`: add `request.source === 'results' ? 'BACK TO RESULTS'` before the fallback. `tabNav.closeRide()` already lands on whatever is underneath — nothing else changes.

**B6. `settings.tsx:353`** hint string per §3.7. (WP-1 B1 inserts a SPORTS section above DATA at `:357`; this is a one-string edit two lines above it — trivially rebased in either order.)

**B7. Tests.** No new suite in B (UI); `tsc --noEmit` is the check. If the executor extracts any non-trivial pure helper (e.g. the caption wording), it goes into `resultsListModel.ts` with a test appended to `resultsmodel_suite.ts`.

## 6. The fix — Phase C: the scatterplot component and its wiring

**C1. New `src/ui/resultsPlot.tsx`** — `export function ResultsPlot({ results, allTimeBestS, selectedRideId, onSelect, onOpen }: {...})`. Owns: `viewportW` via `onLayout` on its outer View (pattern `routeMapView.tsx:933-963`; render nothing but the sized container until `viewportW > 0`), `useMemo(() => buildPlotModel(results, viewportW, allTimeBestS, Date.now()), [results, viewportW, allTimeBestS])`, a horizontal `ScrollView` ref with `scrollToEnd({ animated: false })` in `onContentSizeChange` **once per model change** (a ref flag; not on every size event, or a selection re-render would yank the strip back to the end). Layout: outer row = fixed left gutter (`GUTTER_W`, y tick labels at `tick.at`, avg label `avg m:ss` at `meanY` in `t.textDim` 11 px semibold) + plot area (`flex: 1`, `height: PLOT_H`, `overflow: 'hidden'`, hairline `t.cardBorder` left/bottom border) containing: the horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`, content `width: contentW`, `height: PLOT_H`) with x tick hairlines + labels and the points (each an absolutely positioned `Pressable` at `x − r, y − r`, size `2r`, `hitSlop: 8`, styles per §3.5); **outside** the ScrollView, absolutely positioned at `top: meanY − 1`, the dotted average line View (§3.5) — it must not scroll. A `Pressable` filling the plot area behind the points calls `onSelect(null)`. Under the plot, the caption row (`st.hint` size, 22 px tall, reserved even when empty so the layout does not jump): text per §3.5 + `open ›` in `t.accentText`; `Pressable` → `onOpen(rideId, startedAtMs)`. Below-x-axis labels live inside the scroll content at `PLOT_H − 14`. `empty === 'no-timed'` ⇒ the 120 px dim line instead of the plot.

**C2. `ResultsDetailScreen.tsx`** — replace the Phase-B placeholder with `<ResultsPlot results={results} allTimeBestS={best} selectedRideId={selectedRideId} onSelect={setSelectedRideId} onOpen={(rideId, startedAtMs) => tabNav.openRide({ rideId, source: 'results', startedAtMs })} />`. The board rows already highlight the selected ride (B3). Tapping a board row keeps opening the ride directly (not selecting) — one gesture, one meaning per surface.

**C3. Tests.** Layout is fully pinned by `resultsmodel_suite.ts` (Phase A); the component is Views over a tested model. If the executor moves any arithmetic into the component, stop (§9) — it belongs in the model.

## 7. Acceptance criteria

Phase A
1. `resultsmodel_suite.ts` passes all tests in A3; total FAIL 0; no existing test changed.
2. `fitDomain([1200], [1200])` → `yMin ≈ 1164`, `yMax ≈ 1236` (span floored to 60, padded 10 %); `fitDomain(12 core + 2900 outlier)` → `yMax < 2900`, `fenceHi` finite; `fitDomain(5 values incl. outlier)` → `fenceHi === null`, outlier inside the domain.
3. `buildPlotModel`: newest point at `contentW − PAD_R`; off-scale point at `OFF_SCALE_Y`; y-tick count ≤ 5; a colliding tick label is `null`.
4. `tsc --noEmit` clean.

Phase B
5. Tab bar shows six tabs in the order `record rides routes results settings demo`; RESULTS lists only routes with ≥ 1 stored result, most-ridden first, full names via `routeLabelIn`; footer counts unridden routes; empty state text present when no results exist.
6. Tapping a row opens the detail: `‹ BACK`, route name, browse map of the route's `refLineId`, HISTORY placeholder, `ALL N RIDES · fastest first` board with all-time positions, PB ● on one row, unranked/`NO TIME` rows at the bottom under `not ranked`, `BACK TO RESULTS`. Tab bar hidden while open. System back closes it.
7. Tapping a board row opens the ride detail with primary button `BACK TO RESULTS`; pressing it (or system back) lands on the same route detail, re-read (a ride deleted there disappears from the board).
8. Rankings off in SETTINGS: the board shows only the caption `… · rankings off in SETTINGS`; the list's `best m:ss` and the map are unaffected; the tab is still there. Settings hint text updated.
9. Opening a RESULTS detail for a route id that no longer exists in the catalog closes it immediately without a crash (the `null` guard, WP-K §3.4 pattern) — verified by code reading or by a throwaway request with a bogus id in the dev build; the executor states which.
10. `tsc --noEmit` clean; test total unchanged from Phase A.

Phase C
11. The detail's HISTORY section shows the plot: y gutter with ≤ 5 tick labels and `avg m:ss`; dotted average line does not move when the strip is panned; the strip opens scrolled to the newest ride at the right edge; month (or weekly) tick labels pan with the points.
12. One ride on a route: one dot at the right edge, dotted line through it, readable axis (≥ 30 s span). A route with an outlier (dev build: mark a ride's time by riding the route slowly, or use a fixture): the outlier is a pinned ▲ marker at the top, the rest of the points fill the plot.
13. Tap a point: accent ring, matching board row highlighted, caption `Tue 05 Aug · 21:34 · P3 of 27 · open ›`; tap the caption → ride detail with `BACK TO RESULTS`; tap empty plot → selection cleared. Hollow points for rider-ignored rides; PB dot purple.
14. Nothing new in `package.json`; no native rebuild needed (Nathan's dev client picks it up over the air).
15. `node --experimental-strip-types tests/run.ts`: 0 FAIL; `tsc --noEmit`: exit 0 — after each phase.

## 8. Verification

```
cd app && node --experimental-strip-types tests/run.ts      # zero FAIL; report the new total
cd app && ./node_modules/.bin/tsc --noEmit                    # clean, exit 0 (never bare `npx tsc` on this mount)
```
On-device (Nathan, after Phase C): criteria 5–8 and 11–14 are the checklist. No rebuild: JS-only change.

## 9. Stop-on-ambiguity and collision notes

If any anchor in this brief does not match the file, or any call below is undecided, **STOP and report verbatim** — do not guess, do not rule on it from the coordinator's chat; the coordinator forwards it to a fresh Fable Plan pass. Specifically:

- **`App.tsx` is shared with WP-1** (A4 touches the boot chain at `:135-137`; WP-2 B4 touches `:64-82, :96-119, :154-155, :167-177, :184-192, :202`). Disjoint regions; whichever lands second re-greps every line number. **`settings.tsx`** likewise (WP-1 B1 inserts SPORTS above DATA at `:357`; WP-2 B6 edits one string at `:353`). **`RidesScreen.tsx`** is not touched by WP-2.
- **Sport scoping**: if WP-1 Phase A has landed when B2 is executed, use `activeCatalog()` and drop the marker comment; if not, `currentCatalog()` with the marker. If it is unclear whether it has landed (no `sportStore.ts` but a `sports.ts`?), stop.
- `RouteMapView`'s `routeId` prop takes the **`refLineId`** (`CatalogDetailScreen.tsx:322`). If a route's `refLineId` does not resolve (`refFor` throws — `CatalogDetailScreen.tsx:52-60`), render the map anyway: `routeMapView.tsx:145` already swallows it. If it does not, stop.
- `tower()` (`results.ts:108`) returns `timeS: scoredS(r.lap) ?? r.lap.rawS` for unranked rows — an estimated lap therefore *has* a number there. `buildHistoryBoard` must use `lap.quality` to decide `NO TIME`, not `timeS === null`. If `tower()`'s shape differs from `results.ts:108-131` as quoted in §2, stop.
- If `scrollToEnd` in `onContentSizeChange` visibly fights the user's pan (strip snapping back), the once-per-model ref flag in C1 is the fix; if it still misbehaves, stop and report — do not switch to the `contentOffset` prop on your own.
- If a single-edge `borderStyle: 'dotted'` is tempting: no — §3.5's dot-row is the ruling.
- No arithmetic (domain, pixel positions, tick placement, collision) in `resultsPlot.tsx` — it lives in `resultsPlotModel.ts` and is tested. If something *needs* the component (it shouldn't), stop.
- No tier colours on the board or the plot. If an executor finds an existing helper that would colour these times "for consistency", do not use it — §3.2.
- Executor's report must state the test total before/after and the exact files touched (`CLAUDE.md` rule 3).

## 10. Open questions for Nathan (also appended to `QUESTIONS-FOR-NATHAN.md`) — none block Phase A

- **Q1 — the all-time board vs `STATE.md:99-100`.** The board lists ALL rides fastest-first with positions 1..N (your ask), and shows no tier colours; the ride detail's "P3 of 10" and all scoring stay on the 9+1 window. `STATE.md` gets the one-clause scoping amendment in §3.2. Veto if you'd rather the board also stopped at the last 10.
- **Q2 — plot above board.** You listed map → tower → plot; the brief puts the plot above the board because the board grows without bound. Fine, or keep your order?
- **Q3 — time increases upward** (Strava's orientation; PB is the lowest dot) and the dotted line is the **mean** (what the tier model already uses), not the median. Both are decided; say so if you want either flipped.
