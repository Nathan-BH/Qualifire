# 08 — RESULTS scatterplot: newest dot in brand yellow, lighter dots by day, no "avg" label, last date label no longer clipped

**Source: Nathan, 2026-09-28**, looking at the RESULTS-detail scatterplot (and its copy at
the end of a demo ride). His words:

1. "i think the 'todays' dot can be our brand colour yellow, while the other dots keep the
   same colour. I also see that in day mode the scatterplots has black dots which is way
   too strong, it should be lighter?"
2. "also just the dotted line to show average is fine, remove the 'avg + time' that is on
   the left of it entirely."
3. "i also see on demo example that on the left Mon 14 Sep is visible but the Mon 28 Sep is
   cut off on the right because of the border of the rounded square in which it sits in so
   thats something to fix as well"

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-28 by the Plan
tier (Fable) from a Haiku digest plus anchor checks against the working tree (branch
`virgin`, HEAD `2c21265`). Executor: Sonnet, cold, this file only. Brief 08 of
`virgin-cycle16`. **Independent of briefs 01–07** — none of them mentions
`resultsPlot.tsx` (`grep -ln resultsPlot cycles/virgin-cycle16/*.md` → only this file), so
this can land before, between or after them. **This brief touches exactly one file:
`app/src/ui/resultsPlot.tsx`.** No model change, no test change.

**Line numbers below are against HEAD `2c21265`.** The quoted content is the anchor; the
line number is a hint. Stop only when the quoted content itself is not found or reads
differently.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-28. If a quoted
  block is not in the file, or a name/signature/style key differs from what is quoted,
  **stop and report the mismatch verbatim** (file, line, what you expected, what you found).
  Never guess, never patch around it, never rule on it yourself.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside (`mv .git/index.lock .git/index_lock_stale_$(date +%s)`),
  never deleted. Never delete anything — `_to_delete/` (repo root) is the bin (`mv`, never
  `rm`), and **never call `device_request_delete_permission`**, for any reason.
- **The working tree already carries unrelated staged/modified files under `marketing/`**
  (audio-studio renames and additions, seen in `git status` on 2026-09-28). Leave them
  exactly as they are: never `git add -A`, never stage, unstage or touch anything outside
  `app/src/ui/resultsPlot.tsx`.
- No new dependency, no new import. Everything used below is already imported in the file.
- Do not touch `app/src/ui/resultsPlotModel.ts` (`PAD_L`/`PAD_R`, `xAtSlot`,
  `buildSlotXTicks`, `buildYTicks`, `toneFor` all stay exactly as they are),
  `app/src/ui/theme.ts`, `app/src/ui/themeContext.tsx`, `app/src/ui/ResultsDetailScreen.tsx`,
  `app/src/ui/DemoScreen.tsx`, `app/src/ui/demoModel.ts`, any test file, `STATE.md`,
  `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`, any other `NN-*.md` brief in this folder, or
  anything under `cycles/virgin-cycle15/`.
- **No test is edited or added by this brief.** `resultsPlot.tsx` is a render-only
  component; `tests/run.ts` runs pure modules only and no suite imports it
  (`grep -rn "resultsPlot\.tsx\|from './resultsPlot'\|resultsPlot'" app/tests` → no hits —
  check it and report if that has changed. `app/tests/resultsmodel_suite.ts` imports
  `resultsPlotModel.ts`, which this brief does not touch.)

## Goal

Four visible changes on the RESULTS-detail scatterplot (and on the same component drawn at
the end of a demo ride), nothing else:

1. The **newest ride's dot** (rightmost slot — the ride Nathan just finished when he lands
   on this screen; `demo:today` in the demo) is **brand yellow, `t.accent`**. Every other
   dot is **`t.textDim`** — a mid grey instead of today's near-black ink in day mode.
2. The **"avg 42:07" text** in the y-axis gutter is gone. The **dotted average line
   stays** exactly as it is.
3. The **rightmost x-axis date label** ("Mon 28 Sep") is fully visible inside the card: it
   no longer runs 28 px past the plot area's right edge into the card's padding and border.
   The leftmost label is unchanged (it already fits).
4. The selection ring, taps, the caption row, y-tick labels: unchanged.

## Current state (verified 2026-09-28 against the tree)

### `app/src/ui/resultsPlot.tsx` (267 lines)

- Lines 23–27, header comment, end:

  ```ts
   * Rankings-off (SETTINGS s.tower) leaves the plot itself untouched — tones
   * are pure time comparisons, not a rank — the switch only drops the
   * position segment from the selection caption below (the screen passes an
   * empty `selectedPosLabel` in that case). Tones are still computed by the
   * model; the dots are drawn neutral (virgin-cycle15 brief 04).
   */
  ```

- Lines 34–36 import `buildPlotModel, GUTTER_W, PLOT_H, POINT_R` from `./resultsPlotModel.ts`
  (nothing else — `PAD_R` is NOT imported, and this brief does not import it).
- Line 37 `import { fmt } from './colourModel.ts';` — `fmt` is used at line 129 (the avg
  label, going) **and at line 224** (the caption, staying). The import stays.
- Lines 42–48, the constants:

  ```ts
  const DASH_W = 2;
  const DASH_GAP = 4;
  const X_AXIS_H = 16;
  const Y_TICK_LABEL_W = 36;
  const AVG_LABEL_W = 44; // avg label needs more room than a bare tick ("avg 42:07" vs "42:07")
  const X_TICK_LABEL_W = 80;
  const RING_R = 8;
  ```

  `AVG_LABEL_W` is used in exactly one other place, line 126 (`grep -n AVG_LABEL_W` → 46,
  126). Safe to remove with the label.
- Line 70 `const plotW = Math.max(0, boxW - GUTTER_W);` — `plotW` is in scope for the whole
  render, including the x-axis row.
- **Avg label, lines 121–131**, inside the y-axis gutter `View` (line 106):

  ```tsx
              {model.meanY !== null && model.meanS !== null ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.avgLabel,
                    { color: t.textDim, top: model.meanY - 7, width: AVG_LABEL_W },
                  ]}
                >
                  {`avg ${fmt(model.meanS)}`}
                </Text>
              ) : null}
  ```

  Line 132 `</View>` closes the gutter. The dash row (lines 142–152, `styles.dashRow`,
  `styles.dash`, `backgroundColor: t.textDim`) is a separate element in the plot-area
  `View` and is **not touched**.
- **Selection ring, line 164:** `borderColor: t.text,` — not touched (Decisions 4).
- **Dots, lines 169–189:**

  ```tsx
              {model.points.map((p) => {
                const r = POINT_R;
                return (
                  <Pressable
                    key={p.rideId}
                    hitSlop={8}
                    onPress={() => onSelect(p.rideId)}
                    style={[
                      styles.point,
                      {
                        left: p.x - r,
                        top: p.y - r,
                        width: r * 2,
                        height: r * 2,
                        borderRadius: r,
                        backgroundColor: t.text,
                      },
                    ]}
                  />
                );
              })}
  ```

- **X-axis row, lines 194–210:**

  ```tsx
        {boxW > 0 && model.empty === 'none' ? (
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: GUTTER_W }} />
            <View style={{ width: plotW, height: X_AXIS_H }}>
              {xTicksToRender.map((tick, i) => (
                <Text
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${tick.at}-${i}`}
                  numberOfLines={1}
                  style={[styles.xTickLabel, { color: t.textDim, left: tick.at - X_TICK_LABEL_W / 2 }]}
                >
                  {tick.label}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
  ```

- Styles, lines 236–255 (`const makeStyles = (t: PaddockTheme) => StyleSheet.create({`):
  - 237–243 `frame: { borderWidth: 1, borderRadius: radius.card, paddingTop: 12, paddingHorizontal: 8, marginBottom: 8, },` — not touched.
  - 246 `avgLabel: { position: 'absolute', fontSize: 10, fontWeight: '600', textAlign: 'right' },`
  - 247–249:

    ```ts
    xTickLabel: {
      position: 'absolute', top: 0, fontSize: 10, width: X_TICK_LABEL_W, textAlign: 'center',
    },
    ```

### `app/src/ui/resultsPlotModel.ts` (read-only, explains the clipping — not edited)

- Line 22–23 `export const PAD_L = 12;` `export const PAD_R = 12;`; line 25 `GUTTER_W = 44`;
  line 32 `POINT_R = 5`; line 33 `X_TICK_MIN_GAP_PX = 84`.
- Lines 128–131: `xAtSlot(k, plotW)` = `PAD_L + (k / (PLOT_N - 1)) * (plotW - PAD_L - PAD_R)`
  — x is a **slot index** (newest ride in the last slot, `PLOT_N = WINDOW_PREV = 9`), not
  time. So the newest point is always at `x = plotW - 12` and, with a full window, the
  oldest at `x = 12`.
- Lines 166–174 `buildSlotXTicks`: at most two ticks — `{ at: newest.x, label: towerDate(newest.startedAtMs) }`
  and, if the two are ≥ 84 px apart, `{ at: oldest.x, … }` in front of it. Both label the
  rides themselves (there is no "today"/"now" tick).
- Lines 85–91 `plotWindow`: the window is sorted ascending `startedAtMs` and sliced to the
  last `PLOT_N`, so **`model.points[model.points.length - 1]` is always the newest ride**
  (lines 197–204 map `window` in order). `PlotPoint` (37–44) carries `rideId`,
  `startedAtMs`, `timeS`, `x`, `y`, `tone`.

**Why the right label is clipped and the left one isn't (the numbers):** a label is an
80 px box centred on its tick (`left: tick.at - 40`). The newest tick sits at
`plotW - 12`, so its box spans `[plotW - 52, plotW + 28]` — **28 px past the plot area's
right edge**, which is 20 px past the card's 8 px `paddingHorizontal` and 19 px past its
1 px border: the tail of "Mon 28 Sep" is outside the card. The oldest tick sits at 12, so
its box spans `[-28, 52]` — 28 px into the **44 px gutter spacer** to its left
(`<View style={{ width: GUTTER_W }} />`, empty on the axis row), with 16 px to spare and
still well inside the card. That asymmetry (empty gutter on the left, nothing on the
right) is exactly what Nathan sees. The rounded corner is not the cutter — the axis row
sits mid-card, above the caption row — the card edge is; the corner is just how he
describes the card.

**No "ride just finished" signal exists** to identify today's dot precisely:
`ResultsDetailRequest` is `{ wayId: string }` only (`tabNav.tsx:55–57`), the screen builds
`results` from `storedResultsForWay(request.wayId)` (`ResultsDetailScreen.tsx:58`) and
passes the plot only `results`, `selectedRideId`, `selectedPosLabel` and two callbacks.
The demo passes `demoPlotResults(...)` = priors + `demo:today` (`demoModel.ts:292–296`),
whose newest is that today lap. So "today's dot" has to be derived inside the plot from
`model.points` — Decisions 1.

`themeContext.tsx:14` exports `ThemeMode = 'daylight' | 'night'` and `useTheme()` returns
`{ t, mode, … }` — a theme-conditional colour would be one destructure away. Not used
(Decisions 3).

## Decisions (pre-resolved — do not re-open)

1. **"Today's dot" = the newest ride in the window = `model.points[model.points.length - 1]`.**
   Not a calendar-date check. Reasons: (a) it is the ride Nathan has just finished whenever
   he lands on this screen from a ride, and it is `demo:today` in the demo — both match what
   he is looking at; (b) a literal same-day rule would make the yellow dot vanish the next
   morning and leave the plot with no highlighted dot on any day without a ride, so the
   same data would look different from one day to the next; (c) the plot already speaks
   this language — "newest at the right edge" (header, model) — and the newest dot is the
   one the "LAST N RIDES" caption counts up to. The rule is one comparison on an index the
   model already guarantees (window sorted ascending `startedAtMs`); no new field on
   `PlotPoint`, no model edit. Logged as assumption 1.
2. **Colours: newest dot `t.accent`, all other dots `t.textDim`.** `t.accent` is the brand
   yellow `#F5C542` in both themes. `t.textDim` is `#8A8577` (day) / `#9a978f` (night) —
   the same token the dash row and both tick-label sets in this component already use, so
   the plot's furniture becomes one grey and the only colour on it is the yellow dot.
   **This is NOT the three-tone rank colouring** (`PointTone` purple/green/yellow) that
   virgin-cycle15 brief 04 retired with the legend — that removal stands; `p.tone` is still
   computed by the model and still not read here. Yellow encodes exactly one thing,
   "newest", which needs no legend: it is the dot on the right.
3. **Night mode changes too (`#F4F2EC` → `#9a978f`), accepted.** Nathan only complained
   about day mode, but a theme-conditional (`mode === 'night' ? t.text : t.textDim`) would
   be a second colour rule for the same dots, and near-white dots next to a yellow dot on
   the night card give the yellow less contrast than grey dots do. One token, both themes;
   if night reads too faint on the phone the one-token fallback is `t.text2`
   (`#6D6759` / `#b5b3ac`, between ink and dim in both themes) — assumption 2.
4. **The selection ring stays `t.text`.** It is a tap affordance drawn around whichever dot
   is selected, not a data encoding; a near-black (day) / near-white (night) ring around a
   yellow or grey dot is exactly the "this one is selected" contrast wanted. Line 164 is
   not edited.
5. **The avg label goes; the y-tick collision rule stays.** `buildYTicks` blanks any y-tick
   label within `LABEL_COLLISION_PX` (12 px) of the mean line — that rule existed so the
   tick would not collide with the avg label, which is now gone, so that tick could in
   principle get its label back. That is a model + test change
   (`resultsmodel_suite.ts:453–454` asserts the null label) and Nathan asked only to remove
   the text, so it is out of scope — assumption 3.
6. **X-axis clipping: option (2), render-only clamp in `resultsPlot.tsx`, right side only.**
   A tick label's `left` is clamped so the 80 px box never ends past `plotW`
   (`left ≤ plotW - X_TICK_LABEL_W`), and a clamped label is drawn `textAlign: 'right'` so
   its text hugs the tick instead of drifting 28 px to the left of it inside a centred box.
   Concretely, for the newest tick at `plotW - 12`: box `[plotW - 80, plotW]`, text
   right-aligned with its right edge flush with the plot area's right edge, i.e. 12 px
   right of the dot's centre (7 px past the dot's right shoulder) and 8 px inside the
   card's padding — "Mon 28 Sep" (≈ 55 px at 10 pt) then spans roughly
   `[tick - 43, tick + 12]`, clearly the last dot's label and fully inside the card.
   The left side is deliberately **not** clamped: the oldest label's 28 px overhang lands
   in the empty 44 px gutter spacer and is the "Mon 14 Sep is visible" Nathan is happy
   with; clamping it would shift that label 28 px to the right, off its dot. Why not
   option (1), `PAD_R` in the model: fitting a centred 80 px box needs `PAD_R = 40`, which
   moves every slot (28 px less plot width, all nine dots re-spaced), asymmetric to
   `PAD_L = 12`, touches a tested pure module for what is a label-box problem. Why not
   option (3), `overflow: 'visible'`: the label would still run past the card's padding
   and over its border, and on Android a rounded-corner card's child clipping is not
   something to rely on either way. The clamp is arithmetic on the component's own label
   width against the width it already measured — layout, not model arithmetic — consistent
   with the existing `tick.at - X_TICK_LABEL_W / 2` on the same line.
7. **Header comment updated** (one sentence) so the file explains its own colours.

## Files to touch

### 1. `app/src/ui/resultsPlot.tsx`

**Edit A — header comment, lines 26–27.**

```ts
 * empty `selectedPosLabel` in that case). Tones are still computed by the
 * model; the dots are drawn neutral (virgin-cycle15 brief 04).
 */
```

→

```ts
 * empty `selectedPosLabel` in that case). Tones are still computed by the
 * model; the dots are NOT tone-coloured (virgin-cycle15 brief 04 retired the
 * three-tone code with its legend). virgin-cycle16 brief 08: the newest
 * ride's dot (last point, rightmost slot) is the brand yellow `t.accent`,
 * every other dot is `t.textDim` — the same grey as the ticks and the
 * average line — so the only colour on the plot marks "this ride".
 */
```

**Edit B — constants, line 46.** Delete the line

```ts
const AVG_LABEL_W = 44; // avg label needs more room than a bare tick ("avg 42:07" vs "42:07")
```

so `const Y_TICK_LABEL_W = 36;` is directly followed by `const X_TICK_LABEL_W = 80;`.

**Edit C — remove the avg label, lines 121–131.** Delete the eleven lines

```tsx
              {model.meanY !== null && model.meanS !== null ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.avgLabel,
                    { color: t.textDim, top: model.meanY - 7, width: AVG_LABEL_W },
                  ]}
                >
                  {`avg ${fmt(model.meanS)}`}
                </Text>
              ) : null}
```

so the `))}` that closes `model.yTicks.map` (line 120) is directly followed by `</View>`
(the gutter's close, line 132). The dash row at 142–152 is not touched. `fmt` stays
imported (still used by the caption at line 224).

**Edit D — dot colours, lines 169–170 and 184.**

```tsx
              {model.points.map((p) => {
                const r = POINT_R;
```

→

```tsx
              {model.points.map((p, i) => {
                const r = POINT_R;
                // virgin-cycle16 brief 08: the newest ride (the window is
                // ascending startedAtMs, so the last point) is the brand
                // yellow; the rest are the plot's own grey (Decisions 1–3).
                const newest = i === model.points.length - 1;
```

and, inside the same `style` object,

```tsx
                        backgroundColor: t.text,
```

→

```tsx
                        backgroundColor: newest ? t.accent : t.textDim,
```

`left`, `top`, `width`, `height`, `borderRadius`, `key`, `hitSlop`, `onPress` and the
selection ring above (line 164 `borderColor: t.text,`) are untouched.

**Edit E — x-axis label clamp, lines 198–207.**

```tsx
            {xTicksToRender.map((tick, i) => (
              <Text
                // eslint-disable-next-line react/no-array-index-key
                key={`${tick.at}-${i}`}
                numberOfLines={1}
                style={[styles.xTickLabel, { color: t.textDim, left: tick.at - X_TICK_LABEL_W / 2 }]}
              >
                {tick.label}
              </Text>
            ))}
```

→

```tsx
            {xTicksToRender.map((tick, i) => {
              // virgin-cycle16 brief 08: a label is an 80px box centred on its
              // tick; the newest tick sits PAD_R (12px) from the plot's right
              // edge, so a centred box ran 28px past it, out of the card. Clamp
              // the box inside the plot width and right-align a clamped label so
              // its text hugs the tick. The left is not clamped: the oldest
              // label's overhang lands in the empty gutter spacer and fits.
              const centred = tick.at - X_TICK_LABEL_W / 2;
              const maxLeft = plotW - X_TICK_LABEL_W;
              const atEnd = centred > maxLeft;
              return (
                <Text
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${tick.at}-${i}`}
                  numberOfLines={1}
                  style={[
                    styles.xTickLabel,
                    atEnd ? styles.xTickLabelEnd : null,
                    { color: t.textDim, left: atEnd ? maxLeft : centred },
                  ]}
                >
                  {tick.label}
                </Text>
              );
            })}
```

(The wrapping `<View style={{ width: plotW, height: X_AXIS_H }}>` and the gutter spacer
before it are unchanged.)

**Edit F — styles, lines 246–249.**

```ts
  avgLabel: { position: 'absolute', fontSize: 10, fontWeight: '600', textAlign: 'right' },
  xTickLabel: {
    position: 'absolute', top: 0, fontSize: 10, width: X_TICK_LABEL_W, textAlign: 'center',
  },
```

→

```ts
  xTickLabel: {
    position: 'absolute', top: 0, fontSize: 10, width: X_TICK_LABEL_W, textAlign: 'center',
  },
  xTickLabelEnd: { textAlign: 'right' },
```

(`avgLabel` deleted, `xTickLabelEnd` added after `xTickLabel`; `yTickLabel`, `dashRow`,
`dash`, `point`, `selectionRing`, `frame` untouched.)

That is the whole brief: one file, six edits.

## Verification

From `app/`: `node --experimental-strip-types tests/run.ts` → zero FAIL (the component is
not under test; the run is the regression guard — `resultsmodel_suite.ts` must still pass
untouched, which it will because `resultsPlotModel.ts` is not edited).
`./node_modules/.bin/tsc --noEmit` → exit 0. Two possible complaints and what to do:

- If `tsc` flags `fmt` as unused: it is still used by the caption (`fmt(selectedPoint.timeS)`)
  — report, don't remove; something else went wrong.
- If `tsc` rejects `null` inside the style array: the file's other arrays don't use `null`
  today, but RN's `StyleProp` accepts it (brief 05 uses the same shape in
  `RecordScreen.tsx`). Report the exact error verbatim and stop — do not cast.

Then, in `app/src/ui/resultsPlot.tsx`:

- `grep -n "AVG_LABEL_W\|avgLabel\|avg \${" app/src/ui/resultsPlot.tsx` → **no hits**.
- `grep -n "meanS" app/src/ui/resultsPlot.tsx` → **no hits** (the label was the only reader;
  `meanY` is still read by the dash row and that is fine).
- `grep -n "backgroundColor: t.text," app/src/ui/resultsPlot.tsx` → **no hits**.
- `grep -n "newest ? t.accent : t.textDim" app/src/ui/resultsPlot.tsx` → exactly **one** hit.
- `grep -n "t\.accent[^T]" app/src/ui/resultsPlot.tsx` → exactly **one** hit (the dot; the
  caption's `t.accentText` at the old line 229 is excluded by the pattern and stays).
- `grep -n "borderColor: t.text," app/src/ui/resultsPlot.tsx` → exactly **one** hit (the
  ring, unchanged).
- `grep -n "xTickLabelEnd" app/src/ui/resultsPlot.tsx` → exactly **two** hits (the style
  and its use).
- `grep -n "maxLeft\|atEnd" app/src/ui/resultsPlot.tsx` → the two `const`s plus the two
  uses in the style array — five hits on four lines (`atEnd ? styles…` and
  `left: atEnd ? maxLeft : centred` are on different lines).
- `grep -n "styles.dashRow\|styles.dash," app/src/ui/resultsPlot.tsx` → one hit each,
  unchanged (the dotted line).
- `grep -n "^import { fmt }" app/src/ui/resultsPlot.tsx` → one hit.
- `GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/` → exactly one file,
  `app/src/ui/resultsPlot.tsx`. (`git diff --stat` without the path also lists the
  pre-existing `marketing/` changes — those are not yours; do not touch them.)

## On-device checklist (Nathan, after publish)

1. RESULTS tab → a way with several ranked rides. **Day mode:** the dots are mid grey
   (same grey as the date labels and the dotted line), not black; the rightmost dot is
   brand yellow. **Night mode:** same — grey dots, one yellow dot on the right.
2. There is no "avg 42:07" text in the left gutter. The dotted average line still runs
   across the plot at the same height. The y-axis time labels are unchanged.
3. The date under the rightmost dot (e.g. "Mon 28 Sep") is fully readable, ending just
   inside the card's edge. The date under the leftmost dot is exactly where it was.
4. Tap the yellow dot: the ring appears around it as before (dark ring in day, light ring
   at night), the caption shows its date · time · position, "open ›" works. Tap a grey dot:
   same. Tap empty plot space: selection clears.
5. Demo ride to the end: the plot under the result card shows today's demo lap as the
   yellow dot on the right, priors grey, "Mon 28 Sep" (today's date) fully visible.
6. A way with only one or two ranked rides: one dot (yellow) or two (grey + yellow), with
   one or two date labels, none cut off.

## Out of scope

- Any change to `resultsPlotModel.ts`: `PAD_L`/`PAD_R`, slot layout, `buildSlotXTicks`,
  the y-tick collision blanking near the mean line (assumption 3), `toneFor`.
- Restoring tone-based dot colouring, a legend, a size difference for the newest dot,
  or an outline on the yellow dot.
- A theme-conditional dot colour (Decisions 3).
- The selection ring colour or radius; the caption row; `HistoryBoard` below the plot.
- `STATE.md`, `OPEN-ITEMS.md`, this folder's `README.md` — the coordinator's.

## What this changes on Nathan's phone

Nothing yet — this is a parked brief. Once executed: JS-only, ships to the Preview APK over
EAS Update via `scripts/publish-preview.cmd` — no new numbered build. Visible: on the
RESULTS-detail scatterplot and the demo's copy of it, the newest ride's dot is brand yellow
and every other dot is the plot's grey (lighter than today's black in day mode, slightly
dimmer than today's near-white at night); the "avg 42:07" text is gone while the dotted
line stays; the date under the rightmost dot is no longer cut off by the card edge.
Nothing else on the screen changes and nothing stored changes.

## Open questions / assumptions (logged, not blocking)

1. **"Today's dot" = newest ride, not literally today** (Decisions 1). If Nathan meant the
   yellow to appear only on the day of the ride, the one-line alternative is
   `const newest = towerDate(p.startedAtMs) === towerDate(Date.now())` — but see (b) in
   Decisions 1 for why the newest-ride reading was preferred; his call after seeing it.
2. **Night-mode dots also go grey** (Decisions 3) — not asked for, accepted for one rule
   in both themes. Fallback if too faint at night: `t.text2` instead of `t.textDim` at the
   single `backgroundColor` line (one token, still not theme-conditional).
3. **A y-tick label within 12 px of the mean line stays blank** even though the avg label
   it was avoiding is gone (Decisions 5) — a possible follow-up in `buildYTicks` +
   `resultsmodel_suite.ts:453–454`, not this brief.
4. **A right-aligned end label sits ~15 px left-of-centre of its dot** (text right edge
   12 px past the dot's centre, text ≈ 55 px wide). Chosen over a centred-in-clamped-box
   label, which would sit ~28 px left of the dot. If Nathan wants it tighter, the knob is
   `maxLeft` (e.g. `plotW - X_TICK_LABEL_W + 4` shifts it 4 px right; anything past
   `+ 8` re-enters the card border).
5. **`plotW < X_TICK_LABEL_W` (a plot narrower than 80 px)** makes `maxLeft` negative and
   the clamp meaningless; no real phone width gets there (`plotW` ≈ 250–330 px), same
   standing as `xAtSlot`'s `PLOT_N <= 1` guard.
