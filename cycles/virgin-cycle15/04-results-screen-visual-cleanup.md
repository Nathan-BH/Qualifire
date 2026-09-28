# 04 — RESULTS plot + Timing Tower clean-up: uniform dots, fixed x-slots, no legend, ink times, one tier-coloured TODAY bar

**Source: Nathan, 2026-09-26 (same session as briefs 01-03), three messages about the
post-ride screens, treated as one ask.** His words:

> "the post-ride 'rides saved' screen is super ugly. I dont like that each time from P1-P10 is
> coloured in either purple, green or yellow, it is too much colour. I would just keep it grey or
> black. I think the only colour we can add is the vertical line which is front of 'today's' ride
> in the appropriate colour based on result (currently it looks default yellow to me, but that one
> could be updated based on standing)?"

> "the scatterplot is also visually not really appealing. lets use consistent big same dot size
> for all points instead of variable size. lets clip it visually for consistency; i see now on the
> tenth ride demo it looks nicely scattered and linear in time, but for the second demo ride for
> example the first and second dot or on opposite sides of the scatterplot. Instead have fixed
> 'x-axis' positions for dots based on the timeline. So if you have only two dots they are close
> to eachother 'as if there were 10 other dots taking up the rightmost space' does that make sense
> for you?"

> "also remove from the scatterplot the explanatory text about colour meaning ... all the ai
> clutter needs to go from the app"

And, correcting the first draft of this brief, later the same day:

> "the purple/green/yellow you're seeing isn't on the P1-P10 rows [ResultsDetailScreen board]...
> is not true, or is at least not true in the demo. After the tenth ride demo the post ride
> screen has the end times coloured in every colour."

## Correction note (read before anything else)

The first draft of this brief (2026-09-26, earlier the same day) got the first quote wrong. It
decided the purple / green / yellow Nathan was seeing were the **scatterplot dots** above the
RESULTS tab's P1-P10 board, and it repurposed that board's tap-to-select left border
(`ResultsDetailScreen.tsx`, `selectedRideId` / `borderLeftColor: t.accent`) as the
"today's ride" indicator. Both were wrong, and Nathan caught it: the coloured times are on the
**Timing Tower** (`app/src/ui/tower.tsx`), the ranking board that plays after **every** real
ride ends (and in the demo and the preview, which reuse the same component). Its past rows'
TIME text is tier-coloured, its TODAY row's TIME is tier-coloured, and its TODAY row carries a
4 px left bar that is hardcoded to the theme accent (yellow) regardless of how today's ride
scored — exactly the "vertical line ... default yellow" of his sentence. Two digests had missed
this component; a third found it. The RESULTS tab's board rows carry no tier colour and its
selection border is an unrelated mechanism (highlights whichever dot you tap on the plot). This
draft therefore: (a) targets `tower.tsx` for the colour ask, (b) leaves `ResultsDetailScreen.tsx`'s
selection border **completely untouched**, (c) keeps the scatterplot sub-goals (dot size, fixed
x-slots, legend removal), which were correctly read from the second and third quotes.

**Status: brief only, parked. Nothing below is in the app.** Rewritten 2026-09-26 by the Plan
tier (Fable) from three Haiku digests plus anchor checks against the working tree (branch
`virgin`, HEAD `c3e92ef` — same tree as briefs 02, 03 and 05; executor confirms with
`git log -1`). Executor: Sonnet, cold, this file only. Fourth brief of `virgin-cycle15`.
Independent of briefs 01, 02, 03 and 05 at the file level: this one edits `resultsPlotModel.ts`,
`resultsPlot.tsx`, `tower.tsx`, three lines of `ResultsDetailScreen.tsx`, three lines of
`DemoScreen.tsx` and one test file. It does **not** edit `RecordScreen.tsx` — but note that the
Tower it changes is rendered from `RecordScreen.tsx:1127` in the `'ending'` phase, immediately
above the region brief 05 rewrites (1147-1157, the naming card that appears after the tower has
played). No shared lines; any order. Brief 03 works in `DemoScreen.tsx` — this brief touches
only the three legend lines there (Files to touch, item 5).

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-26. If a quoted
  line is not where the brief says, or a name/signature/constant differs, **stop and report the
  mismatch verbatim** (file, line, what you expected, what you found). Never guess, never
  patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `safe_to_delete/` is the bin.
- No new dependency, native or JS. Everything is RN core.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  briefs 01/02/03/05 of this cycle, or anything under `cycles/virgin-cycle14/` (history).
- **Do not touch `app/src/ui/colourModel.ts`** (`tierFor`, `WINDOW_N` / `WINDOW_PREV` are shared
  with the live colour engine and `ghostsFor()`), **`app/src/ui/towerModel.ts`** (the tower's
  ranking + tier computation — already produces everything this brief needs),
  **`app/src/ui/resultsListModel.ts`** (the RESULTS board), **`app/src/ui/RecordScreen.tsx`**,
  **`app/src/ui/preview/PreviewScreen.tsx`**, or anything under `app/src/store/`. This brief
  changes how the plot and the tower are *drawn*. It changes no ranking, no tier rule, no
  window, no stored data.
- **Do not touch `ResultsDetailScreen.tsx`'s `selectedRideId` state, `HistoryRowView`, or its
  `borderLeftColor: t.accent`.** That is the plot-tap highlight, not what Nathan is talking
  about (Correction note). The only edit in that file is deleting the legend line (item 4).
- **`toneFor()` and `PlotPoint.tone` stay in `resultsPlotModel.ts`.** The dots stop *showing*
  the tone, but the model is pure, tested (`resultsmodel_suite.ts` 241-259) and the header
  comment's "tones survive rankings-off" statement stays true. Deleting the tone from the model
  is a separate chore, not this brief.

## Goal

Two screens, five sub-goals, one executor, one pass:

**Timing Tower** (`tower.tsx` — plays after every real ride, and in the demo/preview):

1. **All TIME text in ink.** Every row's time — past rows and the TODAY row alike — renders in
   the same colour the row's position already uses (`t.textDim` on past rows, `t.text` on the
   TODAY row). No purple / green / yellow / grey times. The "colours the TIME only —
   position/gap/date stay ink" rule (tower.tsx:50) becomes "everything stays ink".
2. **The TODAY bar takes today's tier.** The 4 px bar on the left of the TODAY row — today
   always the theme accent (yellow) — is coloured by today's own already-computed tier:
   purple = best of the ranking pool, green = faster than the pool's average, yellow = slower,
   ink when there is too little history to judge, grey when today has no time. Label "TODAY",
   1.5× row height, larger fonts, fade-in, climb animation: all unchanged. Only the bar's
   colour source changes, from a theme constant to `r.tier`.

**RESULTS scatterplot** (`resultsPlot.tsx` / `resultsPlotModel.ts`, also reused as the demo's
end-of-ride "AS ON THE RESULTS TAB" preview):

3. **One dot size, one colour.** Every dot is `POINT_R` (5) and the theme text colour. No
   bigger "fastest" dot. See D4 and Q4 for why the colour goes too.
4. **Fixed x-slots.** The x-axis is a fixed grid of `PLOT_N` slots. The rides in the window fill
   the **rightmost** slots, evenly spaced, newest at the right edge — regardless of the real
   time gaps between them. Two rides = two dots one slot apart at the right; a full window =
   `PLOT_N` dots spanning the axis. The x-axis date labels shrink to at most two (oldest and
   newest ride in the window).
5. **No legend.** The "purple = fastest of these · green / yellow = faster / slower than their
   average" line disappears from both places it is rendered (RESULTS detail and the demo
   preview).

## Current state (verified 2026-09-26 against the tree)

### The Timing Tower — `app/src/ui/tower.tsx`

- Imports (37-43): `Animated, Easing, StyleSheet, Text, View` from RN; `type Tier` and
  `PURPLE_INK, YELLOW_TIER` from `./chips`; `TOWER_MAX_VISIBLE` from `./towerModel.ts`;
  `PaddockTheme, colors, radius` from `./theme`; `useTheme` from `./themeContext`.
- `:46-52` `TowerRowModel`: `pos`, `time`, `tier: Tier` with the doc comment at `:50`
  `/** colours the TIME only — position/gap/date stay ink (§3b) */`, then `gap`, … (`pb`,
  `today`, `ghost`, `date` further down — grep).
- `:71` `const PAST_H = 38;` `:72` `const TODAY_ROW_H = 56; // ~1.5× — today's row doubles as the board headline`.
- `:77-90`:

  ```ts
  function timeColor(tier: Tier, t: PaddockTheme): string {
    switch (tier) {
      case 'purple':
        return colors.purple;
      case 'green':
        return colors.green;
      case 'est':
        return colors.grey; // NO TIME — grey is no-data only, and this is no data
      case 'yellow':
        return YELLOW_TIER;
      default:
        return t.text; // neutral stays ink, never highlighted (D-022)
    }
  }
  ```

- **TODAY row**, `:189-214` (inside `rows.map((r, i) => { if (r.today) { … } … })`):
  - `:196` `<Animated.View style={[s.accentBar, { opacity: arrive }]} />` — the bar.
  - `:197` position `{ color: t.text }`.
  - `:200` `<Text style={[s.time, s.timeToday, { color: reveal && !landed ? t.text : timeColor(r.tier, t) }]}>` — **today's time is tier-coloured** once the climb has landed.
  - `:202` `{r.pb ? <Text style={{ color: colors.purple }}> ●</Text> : null}` — PB marker,
    fixed purple.
  - `:204` gap `{ color: t.textDim }`; `:206-208` the `TODAY` label, `{ color: t.text, opacity: arrive }`.
- **Past rows**, `:232-247`:
  - `:237` position `{ color: t.textDim }`.
  - `:238` `<Text style={[s.time, { color: timeColor(r.tier, t) }]}>` — **past times are tier-coloured**.
  - `:240` PB marker, same fixed `colors.purple`.
  - `:242` gap `t.textDim`; `:243` date `t.textDim`.
- **Styles** (`s = useMemo(() => makeStyles(t) …)` — grep for the exact line), `:273-278`:

  ```ts
      accentBar: {
        width: 4,
        alignSelf: 'stretch',
        marginVertical: 6,
        borderRadius: 2,
        backgroundColor: t.accent, // identity chrome — which row is YOU — never a tier
      },
  ```

  `t.accent` is `colors.neutral` (`#F5C542`) in **both** themes (`theme.ts:73` light, `:87`
  dark; `colors.neutral` at `theme.ts:19` "flat tier / accent — warm, never grey"). So the bar is
  always the same yellow as a `'yellow'`-tier time — which is why Nathan reads it as "default
  yellow". `PURPLE_INK` is imported at `:40`; grep its uses before touching imports.
- `:279-282` `pos` 15 px / `posToday` 17 px; `time` 19 px / `timeToday` 40 px — unchanged.
- **Who renders it.** `RecordScreen.tsx:48` import, `:1127-1134` `<TimingTower model={reveal.model} justFinished reveal climbMs=… startDelayMs=… onPlayed=… />`
  inside the `'ending'` phase when `reveal !== null` (real rides — production, not demo-only).
  `DemoScreen.tsx:106` import, `:446` render (the tenth-ride demo Nathan is describing).
  `app/src/ui/preview/PreviewScreen.tsx:306` and `:317`. `rankingRevealModel.ts` mentions it
  in a comment only. All three screens get the change for free; none is edited.
- **Where the tier comes from (read-only).** `app/src/ui/towerModel.ts:84`
  `tier: tierFor(e.value, values.filter((_, j) => j !== i))` — each past row judged against
  the pool minus itself; `:92` `tier: tierFor(todayLapS, values)` — today judged against the
  whole pool. `app/src/ui/colourModel.ts:168-174` `tierFor(value, history)`: `null` → `'est'`;
  history shorter than `MIN_HISTORY` → `'neutral'`; `value < best` → `'purple'`;
  `value < mean` → `'green'`; else `'yellow'`. **`r.tier` is therefore already computed for the
  TODAY row; the bar just ignores it.** Suite: `app/tests/towermodel_suite.ts` — untouched.

### The window size — N

- `app/src/ui/colourModel.ts:29` `export const WINDOW_N = 10;` and `:36`
  `export const WINDOW_PREV = WINDOW_N - 1;` → **9**.
- `app/src/ui/resultsPlotModel.ts:15` `import { WINDOW_PREV, fmt } from './colourModel.ts';`
  and `:20` `export const PLOT_N = WINDOW_PREV;` → the plot window is **`PLOT_N` = 9 rides**,
  applied at `:89-95` `plotWindow()` (`.filter(ranks)` → sort ascending by `startedAtMs` →
  `.slice(-PLOT_N)`).
- So the plot can never show more than 9 dots, while the RESULTS board lists up to 10 rows
  (P1-P10, `WINDOW_N`). See Decisions D2 and Open questions Q2.

### The scatterplot model — `app/src/ui/resultsPlotModel.ts` (268 lines)

- Header comment lines 1-11 describes the plot as "laid out in time (x)". Lines 20-34 are the
  exported constants; `:33` `export const POINT_R = 4;` `:34` `export const FASTEST_R = 5;`
- `:39` `export type PointTone = 'fastest' | 'faster' | 'slower';` `:41-48` `PlotPoint`
  (`rideId, startedAtMs, timeS, x, y, tone`). `:58` `PlotModel` (has `xTicks`, `windowN`).
- `:121-128` `toneFor(times, meanS)` — one `'fastest'` (first equal), then `'faster'` if below
  mean, else `'slower'`. **Unchanged.**
- `:130-134`:

  ```ts
  function xAt(ms: number, tOldest: number, tNewest: number, plotW: number): number {
    const denom = tNewest - tOldest;
    if (denom === 0) return plotW - PAD_R;
    return PAD_L + ((ms - tOldest) / denom) * (plotW - PAD_L - PAD_R);
  }
  ```

- `:136-138` `yAt()` — **unchanged, out of scope.**
- `:208-233` `mondayLabel()` and `buildXTicks(tOldest, tNewest, plotW)`: Monday ticks when
  the span is under `WEEKLY_TICKS_UNDER_DAYS` (45) days, else month boundaries, thinned to
  `MAX_X_TICKS` (6), with a two-tick fallback (`towerDate(tOldest)` / `towerDate(tNewest)`)
  when there are no candidates. All positions go through `xAt`. Helpers `mondaysInRange`,
  `monthBoundariesInRange`, `keepEveryNth`, `monthLabel`, `MONTHS`, `DAY_MS` sit between
  lines ~35 and ~207 (not all line-checked — grep them).
- `:239-268` `buildPlotModel(results, plotW)`: window → `times` → `fitDomain` → `toneFor` →
  `tOldest`/`tNewest` → `points` via `xAt` (`:258`) → `meanY`, `yTicks`, `xTicks` (`:266`
  `buildXTicks(tOldest, tNewest, plotW)`).

### The scatterplot component — `app/src/ui/resultsPlot.tsx`

- `:31-33` imports `buildPlotModel, GUTTER_W, PLOT_H, POINT_R, FASTEST_R, type PointTone`
  from the model; `:34` `YELLOW_TIER` from `./tierColour.ts`; `:37` `colors` from `./theme.ts`.
- `:48-52`:

  ```ts
  function toneColour(tone: PointTone): string {
    if (tone === 'fastest') return colors.purple;
    if (tone === 'faster') return colors.green;
    return YELLOW_TIER;
  }
  ```

- `:46` `const RING_R = 8;` — the selection ring (`borderColor: t.text`, around lines 160-171)
  drawn around the selected point. **Unchanged.**
- `:173-193` the dots:

  ```tsx
  {model.points.map((p) => {
    const r = p.tone === 'fastest' ? FASTEST_R : POINT_R;        // 174
    ...
            backgroundColor: toneColour(p.tone),                  // 188
  ```

- `:21` header comment mentions "tones" surviving rankings-off — still true after this brief
  (the model still computes them; the component no longer draws them).

### The RESULTS detail screen — `app/src/ui/ResultsDetailScreen.tsx` (legend line only)

- `:88-91`:

  ```tsx
  <Text style={[st.h2, { color: t.textDim }]}>{windowCaption(windowN)}</Text>
  <Text style={[styles.hint, { color: t.textDim }]}>
    purple = fastest of these · green / yellow = faster / slower than their average
  </Text>
  ```

- Everything else in this file — `selectedRideId` (`:48`), `selectedBoardRow` (`:69-72`),
  `HistoryRowView` (`:150+`) and its `borderLeftWidth: 3, borderLeftColor: t.accent`
  tap-highlight, the PB purple dot (`:154-155` per digest) — is **not part of this brief**
  (Correction note). The board rows' text colours are already neutral.

### The demo preview — `app/src/ui/DemoScreen.tsx` (legend line only)

- `:494-504`: after `revealDone`, an `<Text style={styles.h2}>` caption, then `:499-501`

  ```tsx
  <Text style={[styles.sub, { marginBottom: 10 }]}>
    purple = fastest of these · green / yellow = faster / slower than their average
  </Text>
  ```

  then `<ResultsPlot results={plotResults} selectedRideId={plotSel} …`. The demo's
  `<TimingTower …>` at `:446` is a different block, untouched (it picks up the tower change
  through the component).

### Tests

- `app/tests/resultsmodel_suite.ts` (registered in `tests/run.ts`) imports
  `plotWindow, fitDomain, toneFor, buildPlotModel, mean, …` (`:33`). Relevant tests:
  `:182` and `:200` (plotWindow), `:241`/`:251`/`:256` (toneFor — keep), `:263`
  "buildPlotModel — pixel positions proportional to time, tone extremes, meanY between them"
  (asserts `q0.x === PAD_L`, `q3.x === 300 - PAD_R`, `q1.x ≈ 104`, `q2.x ≈ 196` for 4 points at
  `plotW = 300` — **this encodes the old time-proportional rule and must be rewritten**), and
  `:293-294` single point at `plotW - PAD_R` and `'fastest'` (**stays true** under slots).
- `app/tests/demo_suite.ts` also imports from `resultsPlotModel` — grep it for `.x`, `xTicks`,
  `FASTEST_R` before you start (see Verification).
- `app/tests/towermodel_suite.ts` covers the tower's ranking/tier model. The component itself
  (`tower.tsx`) has no test and gets none — the change is two colour expressions.
- Baseline (STATE.md lines 65-66, 2026-09-26, as quoted by brief 02): **676 tests, 673 pass,
  0 fail, 3 skip.** If another brief of this cycle landed before you, the count is higher;
  record the count you see before you touch anything.

## Decisions (do not reopen)

- **D1 — The colour Nathan means is the Timing Tower's TIME text; the fix is in `tower.tsx`.**
  (Replaces the first draft's D1, which pointed at the scatterplot dots and the RESULTS board —
  see Correction note.) Past rows' times (`:238`) and today's time (`:200`) both go through
  `timeColor(r.tier, t)`; both become ink. "Grey or black" in his words = the ink the rest of
  each row already uses: `t.textDim` on past rows (matching their position/gap/date), `t.text`
  on the TODAY row (matching its position and label). `colors.grey` is not used — it is the
  no-data colour (theme.ts:15) and would make the times look like missing data.
- **D2 — Today's time goes ink too, not only the past rows.** Nathan: "the only colour we can
  add is the vertical line". A 40 px purple time next to a purple bar is two colour statements
  for one fact; the bar is the one he asked for. The TODAY row still reads as the headline
  through its size, weight and label.
- **D3 — The bar's colour is `timeColor(r.tier, t)`, nothing new.** Same function, same colour
  map as the times used to have, so purple / green / yellow on the bar mean exactly what they
  meant on the time, and the demo/preview stay consistent with real rides. `'neutral'` (too
  little history to judge — `MIN_HISTORY`) → `t.text`: the bar is still there as identity
  chrome, in ink, just not claiming a standing. `'est'` (NO TIME today) → `colors.grey`. The
  stylesheet's `backgroundColor: t.accent` on `accentBar` is removed (not left as a fallback
  that never applies) and its comment is rewritten — it *is* a tier now. `t.accent` must not
  remain anywhere in `tower.tsx`'s `accentBar` (grep).
- **D4 — Scatterplot dots: colour `t.text`, radius `POINT_R = 5`, `FASTEST_R` removed.** Size is
  Nathan's explicit ask ("consistent big same dot size"). Colour: the legend goes (sub-goal 5),
  which would leave a three-colour code with no key, and his "too much colour" applies to the
  screen as a whole; the first draft's neutral-dot choice is kept on those grounds, no longer on
  the (wrong) claim that the dots were the colour he meant. The theme text colour is black on
  the light theme and light on dark (the y-tick and avg labels stay `t.textDim`, so the dots
  read as the data and the axis as the furniture). The ring stays `t.text` too — a border-only
  halo of radius 8 around a radius-5 dot, visibly a ring. If he wants the dots to keep their
  colour, that is a one-line revert at `resultsPlot.tsx:188` (Q4).
- **D5 — N = `PLOT_N` (= `WINDOW_PREV` = 9), never a literal.** The grid has exactly as many
  slots as the window can hold dots; a 10-slot grid would leave the leftmost slot permanently
  empty. The plot's 9-vs-board's-10 mismatch is pre-existing, shared with `ghostsFor()`, and out
  of scope here (Q2). No `9` or `10` literal anywhere in the new code or tests — derive from
  `PLOT_N`.
- **D6 — Right-anchored slots: newest ride at the right edge, always.** Window of `n` rides
  occupies slots `PLOT_N - n … PLOT_N - 1`; slot `k` sits at
  `PAD_L + k / (PLOT_N - 1) * (plotW - PAD_L - PAD_R)`. So `n = 1` lands at `plotW - PAD_R`
  (same as today's single-point rule), `n = PLOT_N` spans `PAD_L … plotW - PAD_R`, and the
  newest ride's dot never moves as history accumulates. Nathan's sentence can also be read as
  left-anchored (real dots at the left, imaginary ones filling the right); right-anchored is
  chosen because the newest ride — the one the screen is about — then has a fixed home.
  Flipping is a one-line change in `slotIndex()` (Q1).
- **D7 — x-axis date labels: at most two, at the oldest and newest occupied slot; the oldest
  is dropped when the two would sit closer than `X_TICK_MIN_GAP_PX`.** Monday / month-boundary
  ticks are meaningless once x is a slot index (a Monday between two adjacent slots has no
  pixel). The dates are also all on the board rows just below. Weekly/monthly tick code goes
  (D8). `n = 1` → one label.
- **D8 — Dead x-tick helpers are removed, not left behind.** After D7, `buildXTicks`,
  `mondaysInRange`, `monthBoundariesInRange`, `keepEveryNth`, `mondayLabel`, `monthLabel`,
  `MONTHS`, `DAY_MS`, `MAX_X_TICKS`, `WEEKLY_TICKS_UNDER_DAYS` have no caller inside the model.
  Remove each one **only if** `grep -rn <name> app/src app/tests` shows no reference outside
  `resultsPlotModel.ts`. Any that is referenced elsewhere stays exported and untouched — report
  which. `LABEL_COLLISION_PX` is used by the y-ticks: leave it.
- **D9 — `toneColour` in `resultsPlot.tsx` is removed, with its now-unused imports.** After D4
  it has no caller. (The first draft exported it for the RESULTS board's bar; that sub-goal is
  gone.) Remove `YELLOW_TIER` (`:34`) and `colors` (`:37`) imports only if the grep in
  Verification shows no other use in the file; `type PointTone` likewise.
- **D10 — Legend removal is the whole of sub-goal 5.** The `windowCaption` line above the plot
  and the demo's `demoPlotCaption` line stay. If `styles.hint` in `ResultsDetailScreen.tsx`'s
  `makeStyles` has no other user after the removal, remove it too; `styles.sub` in
  `DemoScreen.tsx` is shared — leave it.
- **D11 — No new model export for the tower, no new prop.** `r.tier` is already on every row
  (`TowerRowModel.tier`), including today's. The whole tower change is inside `tower.tsx`.

## Files to touch

### 1. `app/src/ui/tower.tsx` — ink times, tier-coloured TODAY bar

- `:50` doc comment on `tier` → `/** colours the TODAY row's accent bar only — every text cell, the time included, stays ink (virgin-cycle15 brief 04) */`.
- `:196` → `<Animated.View style={[s.accentBar, { backgroundColor: timeColor(r.tier, t), opacity: arrive }]} />`.
- `:200` → `<Text style={[s.time, s.timeToday, { color: t.text }]}>` (the
  `reveal && !landed ? … :` ternary collapses — both branches were `t.text` or a colour, now
  both are `t.text`).
- `:238` → `<Text style={[s.time, { color: t.textDim }]}>`.
- `:202` and `:240` PB markers: **unchanged** (Q3).
- `:277` → delete the `backgroundColor: t.accent, // identity chrome …` line from `accentBar`;
  add above the `accentBar:` key a one-line comment
  `// colour set per row: today's tier via timeColor() (brief 04) — was a fixed t.accent`.
- `timeColor` (`:77-90`): body unchanged; update the `default:` comment if you like
  (`// neutral: ink — too little history to judge`). It now has exactly one call site
  (`:196`). Its `'est'` → `colors.grey` branch is reachable only if a NO-TIME today row
  reaches this render path — leave it.
- Imports: after the edits, grep `YELLOW_TIER`, `PURPLE_INK`, `colors` in the file. `colors` is
  still used (`timeColor`, PB markers). `YELLOW_TIER` is still used (`timeColor`). If
  `PURPLE_INK` has no use, it was already unused before you — leave it, report it, do not
  clean up beyond the brief.

### 2. `app/src/ui/resultsPlotModel.ts` — slots, tick trim

- `:33-34`: `POINT_R = 5`; delete `FASTEST_R` (after the grep in Verification step 1 shows its
  only users are `:34`, `resultsPlot.tsx:32` and `:174`).
- Add after the constants: `export const X_TICK_MIN_GAP_PX = 84;` with a one-line comment
  (`X_TICK_LABEL_W` in the component is 80; two centred labels need at least that plus a hair).
- Replace `xAt` (`:130-134`) with two pure functions, both exported (the tests use them):

  ```ts
  /** D6: slot k of a PLOT_N-slot grid, k = 0 leftmost. PLOT_N === 1 is not a
   * real configuration (WINDOW_N is 10) but must not divide by zero. */
  export function xAtSlot(k: number, plotW: number): number {
    if (PLOT_N <= 1) return plotW - PAD_R;
    return PAD_L + (k / (PLOT_N - 1)) * (plotW - PAD_L - PAD_R);
  }
  /** D6: the i-th of n window rides (chronological, 0 = oldest) fills the
   * rightmost n slots. */
  export function slotIndex(i: number, n: number): number {
    return PLOT_N - n + i;
  }
  ```

- In `buildPlotModel`: `x: xAtSlot(slotIndex(i, windowN), plotW)`. `tOldest`/`tNewest` are
  then only needed for the ticks — if `buildSlotXTicks` uses `startedAtMs` from the points
  instead, drop them; whichever leaves no unused local (`tsc` will tell you).
- Replace `buildXTicks` (D7) with:

  ```ts
  function buildSlotXTicks(points: PlotPoint[]): PlotTick[] {
    const newest = points[points.length - 1];
    const oldest = points[0];
    const ticks: PlotTick[] = [{ at: newest.x, label: towerDate(newest.startedAtMs) }];
    if (points.length > 1 && newest.x - oldest.x >= X_TICK_MIN_GAP_PX) {
      ticks.unshift({ at: oldest.x, label: towerDate(oldest.startedAtMs) });
    }
    return ticks;
  }
  ```

  called after `points` is built: `const xTicks = buildSlotXTicks(points);`. `towerDate` is
  already imported (`:16`).
- Remove the dead helpers per D8 (grep first). Update the header comment (`:1-11`): x is now
  "the ride's slot in a fixed PLOT_N grid, newest at the right", not "laid out in time".
- **No `toneById`, no `newestInWindow`** — the first draft added these for the RESULTS board's
  bar; that sub-goal is gone. `toneFor` and `PlotPoint.tone` stay as they are.

### 3. `app/src/ui/resultsPlot.tsx` — one size, one colour, drop the colour map

- `:32` import: drop `FASTEST_R`.
- `:48-52` `toneColour`: delete (D9). Then grep `YELLOW_TIER`, `colors`, `PointTone` in the
  file; drop each import that has no remaining use.
- `:174` `const r = POINT_R;` `:188` `backgroundColor: t.text`. Nothing else in the map
  changes.
- `:21` header comment: adjust the sentence about tones ("tones are still computed by the
  model; the dots are drawn neutral — virgin-cycle15 brief 04").

### 4. `app/src/ui/ResultsDetailScreen.tsx` — legend out, nothing else

- `:89-91`: delete the `<Text style={[styles.hint …]}>…</Text>` block (D10). Then grep
  `styles.hint` in the file; if the only remaining occurrence is the `hint:` entry in
  `makeStyles`, delete that entry.
- **No other edit in this file.** `selectedRideId`, `HistoryRowView`, `borderLeftColor: t.accent`
  and the imports stay byte-identical (Correction note). `git diff --stat` for this file must
  show only the removed lines (plus the `hint:` style if removed).

### 5. `app/src/ui/DemoScreen.tsx` — legend out

- `:499-501`: delete the three-line `<Text style={[styles.sub, { marginBottom: 10 }]}>` block
  only. The `h2` caption above and `<ResultsPlot …>` below stay byte-identical. If the
  `marginBottom: 10` was carrying the gap between caption and plot, add `marginBottom: 10` to
  the caption's style array instead — check on the emulator/screenshot if in doubt; do not
  restructure. The `<TimingTower …>` at `:446` is not touched.

### 6. `app/tests/resultsmodel_suite.ts` — rewrite one, add three

- Extend the `:33` import with `xAtSlot, slotIndex, PLOT_N, X_TICK_MIN_GAP_PX` (and
  `PAD_L`/`PAD_R` if not already there).
- **Rewrite `:263`** ("pixel positions proportional to time …") → "buildPlotModel — x is the
  slot, newest at the right, gaps independent of time". Same four rides `q0..q3`, `plotW = 300`,
  expected `x` for `q_i` = `xAtSlot(slotIndex(i, 4), 300)`; assert `q3.x === 300 - PAD_R`
  (`1e-9`), `q0.x === xAtSlot(PLOT_N - 4, 300)`, and equal spacing
  `q1.x - q0.x === q2.x - q1.x === q3.x - q2.x` (`1e-6`). Keep the tone-extremes and meanY
  assertions of that test as they are. (For the record at `PLOT_N = 9`: 184.5, 219, 253.5, 288 —
  but assert via the functions, not these literals.)
- **Keep `:293-294`** unchanged.
- **Add**:
  1. "two rides one slot apart whatever their time gap": build two models from two rides 1 day
     apart and two rides 200 days apart (same `plotW`); assert both have
     `x[1] - x[0] === xAtSlot(1, plotW) - xAtSlot(0, plotW)` and `x[1] === plotW - PAD_R`.
  2. "full window spans PAD_L … plotW - PAD_R": `PLOT_N` ranked rides → `points[0].x === PAD_L`,
     `points[PLOT_N - 1].x === plotW - PAD_R`, `points.length === PLOT_N`.
  3. "xTicks: one label for n=1, one for n=2 at 300px, two for a full window": n=1 → 1 tick at
     `plotW - PAD_R`; n=2 at `plotW = 300` → 1 tick (gap `34.5 < X_TICK_MIN_GAP_PX`); n=PLOT_N →
     2 ticks at `PAD_L` and `plotW - PAD_R`, labels `towerDate(oldest)` / `towerDate(newest)`.
- Fixtures: reuse whatever helper `:182` / `:263` use to build ranked `RideResult`s; do not
  add a new fixture file.

## Verification

Run from the repo root. Record every count.

1. Before touching anything:

   ```
   grep -rn "FASTEST_R" app/src app/tests                 # expect exactly 3 hits: model:34, plot:32, plot:174
   grep -rn "purple = fastest" app/src                    # expect exactly 2 hits: ResultsDetailScreen ~90, DemoScreen ~500
   grep -n -E "\.x\b|xTicks|FASTEST_R|MAX_X_TICKS|WEEKLY_TICKS" app/tests/demo_suite.ts   # if any hit asserts an x pixel or a removed name, STOP and report before editing
   grep -n "timeColor\|t.accent" app/src/ui/tower.tsx    # expect: timeColor def ~77, calls at ~200 and ~238; t.accent exactly once, ~277 (accentBar)
   grep -rn "TimingTower" app/src --include=*.tsx        # expect renders in RecordScreen, DemoScreen, preview/PreviewScreen only
   cd app && node --experimental-strip-types tests/run.ts | tail -3   # record baseline
   ```

   Any count other than the expected one → stop, report.
2. After editing:

   ```
   cd app && npm run typecheck                            # 0 errors (unused locals will surface removed-helper leftovers)
   cd app && node --experimental-strip-types tests/run.ts     # 0 FAIL; count = baseline + 3
   grep -rn "FASTEST_R\|purple = fastest" app/src app/tests   # 0 hits
   grep -n "timeColor" app/src/ui/tower.tsx                   # exactly 2: the definition and the accentBar call at ~196
   grep -n "t.accent" app/src/ui/tower.tsx                    # 0 hits
   grep -rn "toneColour" app/src                              # 0 hits
   grep -n "t.accent\|selectedRideId" app/src/ui/ResultsDetailScreen.tsx   # unchanged from before (record both counts before and after; they must match)
   grep -rn -E "\b(9|10)\b" app/src/ui/resultsPlotModel.ts    # any hit must be pre-existing (e.g. TICK_STEPS_S), none in new code
   git status --short                                         # exactly: M tower.tsx, M resultsPlotModel.ts, M resultsPlot.tsx, M ResultsDetailScreen.tsx, M DemoScreen.tsx, M resultsmodel_suite.ts
   ```

3. Report: baseline and final test counts, the D8 helper list (removed / kept-because-referenced),
   the two `tower.tsx` colour lines as they now read, the `ResultsDetailScreen.tsx` diff stat,
   and the demo_suite grep result.

## On-device checklist (Nathan, after a build or OTA carrying this)

**Timing Tower — real ride:**

1. Ride a way with 3+ previous rides, STOP. The tower plays. Every past row's time is the same
   dim ink as its P#, gap and date — no purple / green / yellow times.
2. Today's row: time in plain ink (same as the "TODAY" label), big as before. The 4 px bar on
   its left is purple if today beat every ride in the pool, green if faster than the pool's
   average, yellow if slower. It is no longer yellow by default.
3. Ride a way with 0-1 previous rides: today's bar is plain ink (nothing to judge against yet),
   not yellow.
4. Dark theme: times readable, bar visible in all four states.

**Timing Tower — demo:** 5. Run the demo to the tenth ride. The post-ride tower shows all
times in ink; only today's bar is coloured, by today's standing in the demo pool. (The second-ride
demo: bar in ink or coloured depending on the demo's history — either way, no coloured times.)

**RESULTS scatterplot:**

6. RESULTS for a way with **2** ranked rides: two dots, same size, same (black / white) colour,
   one slot apart at the right edge; one date label under the right dot.
7. Same way after **9+** rides: dots span the axis left to right, evenly spaced, two date labels.
8. Tap a dot: the ring appears on it and the board row highlights exactly as before this brief
   (that mechanism is untouched).
9. No "purple = fastest of these …" text on RESULTS or on the demo's end-of-ride preview.
10. Demo end-of-ride preview: same neutral dots, same slot spacing (2nd-ride demo: two dots
    close together at the right; 10th-ride demo: full axis).
11. If the black dots on light feel too heavy → tell us, the fallback is the dim text colour
    (D4), a one-token change. If he'd rather keep coloured dots → Q4, one line.
12. The small purple ● after an all-time-PB time (tower and RESULTS board) is still there — Q3
    if he wants it gone too.

## Out of scope

- `ResultsDetailScreen.tsx`'s selection state, `HistoryRowView`, its `borderLeftColor: t.accent`
  border and the PB dot (Correction note; the first draft's "default selection on today's ride
  + tone-coloured bar" sub-goal is withdrawn entirely).
- `towerModel.ts`, `colourModel.ts` (`tierFor`, `MIN_HISTORY`, `WINDOW_N`), `tierColour.ts`,
  the live-engine tier colours, `ghostsFor()`.
- The tower's animation (climb, arrive, step-down), its clip lines, `todaySub`, heights, fonts.
- `RecordScreen.tsx` and `preview/PreviewScreen.tsx` — they render the tower and get the change
  through the component; not edited.
- `yAt()`, the y-domain, y-ticks, the average line and its label.
- The plot window size (`PLOT_N` = 9 vs the board's 10 rows — Q2).
- The board rows' content, `resultsListModel.ts`, row tap → ride detail.
- The demo's selection (`plotSel`) and anything else in `DemoScreen.tsx` beyond the three
  legend lines (brief 03 is in that file — do not touch its region).
- Rankings-off (`s.tower`) behaviour: unchanged (tones are still computed; the caption logic at
  `ResultsDetailScreen.tsx:69-72` is untouched).

## What this changes on Nathan's phone

Nothing until it is executed, inspected, and shipped in a build or an EAS Update to "Qualifire
Preview". After that: the post-ride Timing Tower (real rides, demo and preview) shows every time
in ink and colours only the bar beside TODAY, by today's standing; the RESULTS scatterplot and
the demo's end-of-ride plot show uniform neutral dots on a fixed 9-slot grid with newest at the
right; the colour legend is gone. No stored data, ranking, tier rule, window or colour engine
changes — reinstalling or resetting is not needed.

## Open questions (for Nathan, not the executor)

- **Q1 — Right- or left-anchored slots?** Implemented right-anchored (D6: newest ride always at
  the right edge; two rides = the two rightmost slots). His sentence "as if there were 10 other
  dots taking up the rightmost space" could also mean the opposite (real dots at the left,
  future rides fill rightwards). If he wants that, `slotIndex` returns `i` — one line, and
  test 6.1's `x[1] === plotW - PAD_R` becomes `x[0] === PAD_L`.
- **Q2 — 9 dots vs 10 rows.** The plot window is `PLOT_N = WINDOW_PREV = 9` (shared with the
  live ghosts), the RESULTS board shows `WINDOW_N = 10`, and the tower shows up to
  `TOWER_MAX_VISIBLE`. Pre-existing; not touched. Does he want the plot to show 10 so the dots
  and the P1-P10 rows count the same? Separate brief if yes (it touches `colourModel.ts`
  consumers).
- **Q3 — The PB ● marker.** A small fixed-purple dot after an all-time-best time, on the tower
  (both row kinds) and on the RESULTS board. Kept: it is a marker, not "the time coloured", and
  he has not mentioned it. If "too much colour" includes it, it is two deletions in `tower.tsx`
  (`:202`, `:240`) and one in `ResultsDetailScreen.tsx`.
- **Q4 — Dot colour.** Neutral `t.text` per D4 (black on light; `t.textDim` grey is the
  alternative). His plot asks were size, slots and the legend — he did not say the dots' colour
  must go; it goes because the legend goes and a keyless colour code is clutter. If he'd rather
  keep purple / green / yellow dots (without the legend), restore the colour map at
  `resultsPlot.tsx:188` — one function, one line.
- **Q5 — Bar when there is nothing to judge against.** With fewer than `MIN_HISTORY` past rides
  today's tier is `'neutral'` and the bar is ink (D3). Alternative: keep it yellow in that case,
  as now. Chosen ink so that yellow always means "slower than average", never "unknown".
- **Q6 — Demo and preview inherit the change.** They render the same `TimingTower`, so the
  tenth-ride demo he is describing shows ink times and a tier-coloured bar too. Assumed wanted
  (it is where he saw the problem); flagged in case the demo should stay as a "full colour"
  showcase — then the component needs a prop, a small follow-up.

## Ruling 2026-09-28 (Plan tier, Fable — executor escalation on two tests §6 never named)

**Replace the two calendar-tick tests with one span-independence test; remove `MAX_X_TICKS`.**

§6 rewrote `:263` and added three tests but never mentioned two further tests at the end of
`resultsmodel_suite.ts` that asserted the OLD tick builder's output — "monthly for 200 days,
weekly for 20 days, end-labelled under 7 days" (month/`dd Mon` label regexes) and "9 rides
spanning ~1 year … 'Jan 26' present". Both failed after D7/D8, correctly: the behaviour they
pin was removed on purpose and is not coming back. The Sonnet executor stopped rather than
guess — the right call.

- Their assertions are dead, but their fixtures (200-day, 20-day, 2-day, ~1-year spans, via
  `ridesOverDays` and the hand-built year) cover exactly what the three §6 tests don't — those
  use millisecond-apart rides — so they were folded into one replacement test:
  "xTicks ignore the calendar: … all label the occupied end slots with towerDate()". For each
  span it asserts the tick count (2, 2, 1, 2 at `plotW = 300`), the newest tick at `newest.x`
  labelled `towerDate(newest)`, the oldest (when present) at `oldest.x` labelled
  `towerDate(oldest)`, and the two at least `X_TICK_MIN_GAP_PX` apart. `ridesOverDays` stays.
- `MAX_X_TICKS` (6) was kept by the executor because D8 says "remove only if unreferenced" and
  these two tests referenced it. With them gone it has zero callers in `app/src` and
  `app/tests`, so D8's own rule now says it goes — removed from the model and the suite's import.
- Result: `737 tests: 734 pass, 0 fail, 3 skip` (was 738 / 733 / 2 fail before the fix:
  −2 tests +1), `tsc --noEmit` exit 0. Not committed — lands with the rest of brief 04.
