# 03 — One tier TEXT colour helper for the activity detail: big lap time, SECTORS times, ON THIS WAY today row (readable in both themes)

**Source: Nathan, 2026-10-05 (dark mode is the reference; day mode must be adjusted properly).** On
the ACTIVITIES ride detail the SECTORS list colours each row with `chipColors(sec.tier, t).text`; for a
purple sector that is `PURPLE_INK` (#120521), the near-black ink meant for text ON a filled purple chip
— unreadable on the dark card (contrast 1.23:1). The big lap time at the top uses a screen-local
`tierColour()` and reads fine in dark mode, but in day mode its yellow tier is `colors.neutral` on a
white card (1.62:1). The ON THIS WAY "today" row is `t.accentText` whatever the ride's result. Decision:
ONE shared, pure, theme-aware tier-text-colour helper, used by all three; the sector label stays white,
only the time is coloured, avg stays dim; the today row takes THIS ride's lap tier colour. Contrast was
computed (WCAG 2.x relative luminance), not eyeballed — table in §0. Written by the Plan tier (Fable)
on 2026-10-05. Nothing is executed yet.

**Plan-tier fix (Fable, 2026-10-06), after the executor's stop:** step 3d's replacement comment used to
contain the word `chipColors`, which step 1b's test and step 3g / Verification forbid anywhere in
`RideDetailScreen.tsx`. The comment now says "the chip palette's .text" instead; nothing else changed.
Rule for this file: the word `chipColors` must not appear in RideDetailScreen.tsx at all, comments included
(the tierColour.ts doc comment in step 2 may name it: that file is not grepped). Step 3g's grep expectation
was also corrected (it returns 0 hits, not the `tierTextColour(` lines).

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.

**Run order:** after 01 and 02 (all three edit `RideDetailScreen.tsx` and `recordflow_suite.ts`). This
brief is INDEPENDENT of 02's label change (it never reads `sec.label` content, only colours it) — if 02
was skipped, nothing here changes; just re-check the anchors by content.

## 0. What the code does today (verified 2026-10-05) and the contrast numbers

- `app/src/ui/RideDetailScreen.tsx:71-79` — local `function tierColour(tier: UiTier, t: PaddockTheme)`:
  purple -> `colors.purple` (#9000C8), green -> `colors.green` (#00D000), yellow -> `colors.neutral`
  (#F5C542), neutral -> `t.accentText`, default (est) -> `t.textDim`. Used ONCE, :487 (the big lap time
  `st.big`, 34 px / 800).
- `:516-525` SECTORS rows: `const col = chipColors(sec.tier, t).text;` then `secPos` (label) and
  `secTime` both `{ color: col }`, `secAvg` `t.textDim`. `chipColors` import :33 (`from './chips.tsx'`),
  used nowhere else in the file.
- `:97-119` `PbDetail({ wayId, lastRideId, t })`: rows from `buildPbDetail(rankingPoolFor(wayId,
  lastRideId), lastRideId)` (rideHistoryModel.ts:295-311: `{ posLabel, dateLabel ('today' or a date),
  timeLabel, gapLabel, today }` — no tier). Cells: `pbPos` `t.text`; date `row.today ? t.accentText :
  t.textDim`; `pbNum` time `t.text`; `pbNum` gap `t.textDim`. Mounted at :530-534 with `wayId`,
  `lastRideId={request.rideId}`, `t`. The ride's own lap tier is `model.lapTier` (rideDetailModel.ts:127:
  `ignored ? 'neutral' : tierFor(lapS, hist)`; `'neutral'` for kind free/none, :111).
- `app/src/ui/tierColour.ts` (38 lines): `YELLOW_TIER = colors.neutral`, `tierLineColour(tier): string |
  null` — the MAP LINE colour, with the doc comment on why `chipColors().text` must never paint a line.
  Imports `type { Tier } from './chips.tsx'` and `colors` from theme.ts. Re-exported by chips.tsx:23.
- `app/src/ui/theme.ts`: `PaddockTheme { bg, card, cardBorder, text, textDim, text2, accent, accentText,
  onAccent, statusBar: 'light' | 'dark', race }`. `daylight` (:66-78): card #FFFFFF, text #201F24,
  textDim #8A8577, accentText #B98A0A, statusBar 'dark'. `night` (:80-92): card #212127, text #F4F2EC,
  textDim #9a978f, accentText #F5C542, statusBar 'light'. `colors.purple` #9000C8, `colors.green`
  #00D000, `colors.neutral` #F5C542. `PURPLE_INK` = '#120521' (chips.tsx:25).
- `chipColors` (chips.tsx:34-51) is used by `LiveBigChip`/`LiveLapChip` (flash + lap chip) and by
  `preview/` — NOT touched.

**Contrast ratios (WCAG, text colour vs the card it sits on; AA normal text = 4.5, large/bold = 3.0):**

| tier | today (night card #212127) | today (day card #FFFFFF) | NEW night | NEW day |
|---|---|---|---|---|
| purple, SECTORS (`chipColors.text` = PURPLE_INK) | **1.23** | 19.64 | — | — |
| purple, big lap (`colors.purple`) | **2.30** | 6.95 | `#C364FF` **5.02** | `colors.purple` #9000C8 **6.95** |
| green (`colors.green`) | 7.64 | **2.10** | `colors.green` **7.64** | `#007A00` **5.55** |
| yellow (`colors.neutral`) | 9.87 | **1.62** | `YELLOW_TIER` #F5C542 **9.87** | `#8C6900` **5.08** |
| neutral (`t.accentText`, unchanged) | 9.87 | 3.13 | 9.87 | 3.13 (theme token, not changed here) |
| est / none (`t.textDim`, unchanged) | 5.49 | 3.68 | 5.49 | 3.68 |

Script used (rerun it to check, Node or Python; the inspector should): relative luminance per sRGB
channel `c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`, `L = .2126R+.7152G+.0722B`, ratio
`(Lmax+.05)/(Lmin+.05)`. The new day colours were chosen as the lightest shade of the brand hue that
passes 4.5 on BOTH the paddock card (#FFFFFF) and the day race card (#F5F1E6: purple 6.16, green 4.92,
yellow 4.50); the night purple is the darkest tint that passes 4.5 on both #212127 and the night race
card #141414 (5.78). Map lines keep `colors.purple` etc. — they are lines on a basemap, not text.

## Scope / non-scope

IN: `app/src/ui/tierColour.ts` (new exported helper + 3 constants + doc comment), `app/src/ui/RideDetailScreen.tsx`
(big lap, SECTORS rows, PbDetail), `app/tests/ridedetail_suite.ts` (helper tests), `app/tests/recordflow_suite.ts`
(source test). No new rider-facing string; `ui-strings.allow.json` untouched.
OUT: `chips.tsx` (`chipColors`, `LiveBigChip`, `LiveLapChip`, `StripSlot`, `PURPLE_INK` — zero change),
`tierLineColour` and every map/sector-span colour (`sectorTrailModel.ts`, `wayMapView.tsx`,
`DemoScreen.tsx`, `RecordScreen.tsx` colour wiring), `theme.ts` (no token change — `accentText` day
3.13 is pre-existing and used across the app; flagged, not fixed), `rideHistoryModel.ts`
(`buildPbDetail` keeps its shape — see decisions), `rideDetailModel.ts`, RidesScreen/ResultsScreen rows
(they do not colour times by tier), `core/`, storage.

## Target invariants

1. `tierTextColour(tier, t)` in `tierColour.ts` is pure, total over `Tier` ('none' | 'neutral' |
   'yellow' | 'green' | 'purple' | 'est'), returns a `#rrggbb` string, never `PURPLE_INK`, never `null`;
   theme-aware via `t.statusBar === 'light'` (= dark ground) — the only PaddockTheme field that says
   which ground the card is.
2. RideDetailScreen has NO `chipColors` import/call and NO local `tierColour` function; the big lap time,
   every SECTORS time and the ON THIS WAY today row all go through `tierTextColour`.
3. SECTORS row: label (`secPos`) `t.text`; time (`secTime`) `tierTextColour(sec.tier, t)`; avg `t.textDim`.
   Missed (`'– did not traverse –'`) and estimated (`~m:ss`) rows have tier `'est'` -> time in `t.textDim`
   (dim, no verdict), label white like every other row; their text is produced by the model and unchanged.
4. ON THIS WAY: `posLabel` `t.text` (all rows); non-today rows unchanged (date `t.textDim`, time `t.text`,
   gap `t.textDim`); the today row's DATE ('today') and TIME cells take `tierTextColour(todayTier, t)`
   where `todayTier = model.lapTier`; its gap stays `t.textDim`.
5. `tierLineColour` output is byte-identical (pinned by a test); no chip renders differently.

## Steps (anchors by quoted content; line numbers are current-tree approximations)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (record). Baseline after 01+02: expect
**851 tests / 848 pass / 0 fail / 3 skip**, tsc exit 0 (foreground, `timeout_ms: 180000`). If 02 was not
run: 849/846/0/3; if neither: 848/845/0/3 — deltas below are relative.

**Step 1 — tests first (failed-before).**
a. `app/tests/ridedetail_suite.ts`: add to the static imports (top, next to `import { colors } from
   '../src/ui/theme.ts';`): `import { daylight, night } from '../src/ui/theme.ts';` (merge into the
   existing theme import) and `import { tierTextColour, tierLineColour, YELLOW_TIER } from
   '../src/ui/tierColour.ts';`. Do NOT import `PURPLE_INK` from chips.tsx (JSX, not loadable headless):
   put `const PURPLE_INK = '#120521'; // chips.tsx:25, mirrored — chips.tsx is JSX and not loadable here`
   in the test file. Then append:
```ts
// ===================================================== tierTextColour (virgin-cycle22 03)
function relLum(hex: string): number {
  const c = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
}
function contrast(a: string, b: string): number {
  const [x, y] = [relLum(a), relLum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const TIERS = ['none', 'neutral', 'yellow', 'green', 'purple', 'est'] as const;

test('virgin-cycle22 03: tierTextColour — a #rrggbb for every tier in both themes, never the chip ink, never a map-line API', () => {
  for (const t of [night, daylight]) {
    for (const tier of TIERS) {
      const c = tierTextColour(tier, t);
      assert(/^#[0-9A-Fa-f]{6}$/.test(c), `${tier}/${t.statusBar}: not a #rrggbb: ${c}`);
      assert(c.toUpperCase() !== PURPLE_INK.toUpperCase(), `${tier}/${t.statusBar}: PURPLE_INK is text ON a chip, never text on a card`);
    }
  }
});

test('virgin-cycle22 03: tierTextColour — WCAG contrast on the card: scored tiers >= 4.5, verdict-less >= 3.0, both themes (computed, not eyeballed)', () => {
  for (const t of [night, daylight]) {
    for (const tier of ['purple', 'green', 'yellow'] as const) {
      const r = contrast(tierTextColour(tier, t), t.card);
      assert(r >= 4.5, `${tier} on ${t.statusBar === 'light' ? 'night' : 'day'} card ${t.card}: ${r.toFixed(2)} < 4.5`);
    }
    for (const tier of ['neutral', 'est', 'none'] as const) {
      const r = contrast(tierTextColour(tier, t), t.card);
      assert(r >= 3.0, `${tier} on ${t.card}: ${r.toFixed(2)} < 3.0`);
    }
  }
  // The two failures this brief fixes must stay fixed: dark purple text is not the brand fill, day yellow text is not the brand yellow.
  assert(tierTextColour('purple', night) !== colors.purple, 'night purple text is a readable tint, not #9000C8 (2.30:1 on the card)');
  assert(tierTextColour('yellow', daylight) !== colors.neutral, 'day yellow text is not #F5C542 (1.62:1 on white)');
  assert(tierTextColour('green', daylight) !== colors.green, 'day green text is not #00D000 (2.10:1 on white)');
});

test('virgin-cycle22 03: tierTextColour — dark theme keeps the brand green and yellow; neutral/est follow the theme tokens', () => {
  assert(tierTextColour('green', night) === colors.green, 'night green = colors.green');
  assert(tierTextColour('yellow', night) === YELLOW_TIER, 'night yellow = YELLOW_TIER');
  assert(tierTextColour('purple', daylight) === colors.purple, 'day purple = colors.purple (6.95:1 on white)');
  for (const t of [night, daylight]) {
    assert(tierTextColour('neutral', t) === t.accentText, 'neutral = accentText (no verdict yet, as the chips do)');
    assert(tierTextColour('est', t) === t.textDim && tierTextColour('none', t) === t.textDim, 'est/none = textDim');
  }
});

test('virgin-cycle22 03: tierLineColour is untouched — map lines keep the brand colours, null for verdict-less tiers', () => {
  assert(tierLineColour('purple') === colors.purple && tierLineColour('green') === colors.green && tierLineColour('yellow') === YELLOW_TIER, 'line colours');
  assert(tierLineColour('neutral') === null && tierLineColour('est') === null && tierLineColour('none') === null, 'no line colour without a verdict');
});
```
b. `app/tests/recordflow_suite.ts`, append at the end:
```ts
test('virgin-cycle22 03: RideDetailScreen colours text through tierTextColour only — no chipColors().text on a card, label white, time coloured, today row = lap tier', () => {
  const det = fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'RideDetailScreen.tsx'), 'utf8');
  assert(!det.includes('chipColors'), 'chipColors (chip palette: purple text = PURPLE_INK) must not colour text on a card');
  assert(!det.includes("from './chips.tsx'"), 'no chips import left');
  assert(!/function tierColour\(/.test(det), 'the screen-local tierColour is gone (one shared helper)');
  assert(det.includes("import { tierTextColour } from './tierColour.ts';"), 'imports the shared helper');
  assert((det.match(/tierTextColour\(/g) ?? []).length >= 3, 'big lap + SECTORS time + today row all use it');
  assert(det.includes('[styles.secPos, { color: t.text }]'), 'SECTORS label is plain white');
  assert(det.includes('[styles.secTime, { color: tierTextColour(sec.tier, t) }]'), 'SECTORS time is tier-coloured');
  assert(det.includes('[styles.secAvg, { color: t.textDim }]'), 'SECTORS avg stays dim');
  assert(det.includes('todayTier={model.lapTier}'), 'PbDetail receives this ride\'s lap tier');
  assert(det.includes('const todayColour = tierTextColour(todayTier, t);'), 'today row colour comes from the helper');
  assert(!det.includes('row.today ? t.accentText'), 'the today row is no longer accentText');
});
```
c. Run the suite: the tierTextColour tests fail to LOAD (`tierTextColour` is not exported -> the whole
   ridedetail_suite import fails; `tests/run.ts` reports the suite error) and the recordflow test FAILS.
   Record the exact output. (If run.ts aborts the whole run on a suite load error, that line is your
   failed-before evidence; the counts are reported after step 5.)

**Step 2 — `app/src/ui/tierColour.ts`.** Change the import line `import { colors } from './theme.ts';` to
`import { colors, type PaddockTheme } from './theme.ts';`. Append at the end of the file:
```ts
/** Night-theme purple for TEXT on a card. `colors.purple` (#9000C8) is the chip FILL / map-line
 * purple and reads 2.30:1 on the night card (#212127) — fine as a filled chip, too dark as 13 px
 * text. This tint is 5.02:1 on the card and 5.78:1 on the night race card. */
export const PURPLE_TEXT_NIGHT = '#C364FF';
/** Day-theme green for TEXT on a card: `colors.green` (#00D000) is 2.10:1 on white; this is 5.55:1
 * on the day card and 4.92:1 on the day race card (#F5F1E6). */
export const GREEN_TEXT_DAY = '#007A00';
/** Day-theme yellow for TEXT on a card: `colors.neutral` (#F5C542) is 1.62:1 on white, the theme's
 * own `accentText` (#B98A0A) only 3.13:1; this is 5.08:1 on the day card, 4.50:1 on the race card. */
export const YELLOW_TEXT_DAY = '#8C6900';

/**
 * virgin-cycle22 03 (Nathan 2026-10-05): the colour a tier gives to TEXT drawn on a card — the big
 * lap time, a sector time, the "today" row of ON THIS WAY. ONE helper so the lap time and the sector
 * list can never disagree. Do NOT use `chipColors(tier, t).text` for text on a card: that palette is
 * for text drawn ON a chip of that tier — purple's `.text` is PURPLE_INK, the near-black ink for a
 * filled purple chip, which is unreadable (1.23:1) on the dark card (the 2026-10-05 SECTORS bug, the
 * text twin of the 2026-09-02 map-line bug above). And do NOT use `tierLineColour` for text: it is
 * the map-line palette, returns null without a verdict, and its yellow fails on a light card.
 *
 * Theme-aware (dark ground = `t.statusBar === 'light'`, the one PaddockTheme field that says which
 * ground the card is): the night card keeps the brand green/yellow and takes a lighter purple; the
 * day card keeps the brand purple and takes deeper green/yellow. Every value passes WCAG 4.5:1 on its
 * card (ridedetail_suite computes it). 'neutral' (no verdict yet) = `t.accentText` as the chips do;
 * 'est' / 'none' = `t.textDim` (dim, no verdict). Never null, never PURPLE_INK.
 */
export function tierTextColour(tier: Tier, t: PaddockTheme): string {
  const dark = t.statusBar === 'light';
  switch (tier) {
    case 'purple': return dark ? PURPLE_TEXT_NIGHT : colors.purple;
    case 'green': return dark ? colors.green : GREEN_TEXT_DAY;
    case 'yellow': return dark ? YELLOW_TIER : YELLOW_TEXT_DAY;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}
```
Also extend the file header comment (:1-7) with one line: ` * virgin-cycle22 03: also home of tierTextColour
(text on a card) — see its doc comment.` Do not change `tierLineColour` or `YELLOW_TIER`.

**Step 3 — `RideDetailScreen.tsx`.**
a. Imports: delete `import { chipColors } from './chips.tsx';` (:33). Add `import { tierTextColour } from
   './tierColour.ts';` right after the `sectorTrailModel.ts` import (:41). Keep `type UiTier` in the
   colourModel import (:35-37): it is used by the new `PbDetail` prop (step 3e). Keep `PaddockTheme,
   colors, radius` (still used: `PaddockTheme` by PbDetail/makeStyles, `colors.grey` by `leadColour`).
b. Delete the local `function tierColour(tier: UiTier, t: PaddockTheme): string { ... }` (:71-79).
c. Big lap (:487): `tierColour(model.lapTier, t)` -> `tierTextColour(model.lapTier, t)`.
d. SECTORS (:516-525): replace the map body with
```tsx
            {model.sectorRows.map((sec) => (
              // virgin-cycle22 03: label plain, only the TIME carries the tier colour (same
              // layout as ON THIS WAY below); avg stays dim. tierTextColour, never the
              // chip palette's .text (purple's is the chip ink, unreadable on the card).
              <View key={sec.index} style={styles.secRow}>
                <Text style={[styles.secPos, { color: t.text }]}>{sec.label}</Text>
                <Text style={[styles.secTime, { color: tierTextColour(sec.tier, t) }]}>{sec.timeLabel}</Text>
                <Text style={[styles.secAvg, { color: t.textDim }]}>{sec.avgLabel}</Text>
              </View>
            ))}
```
e. `PbDetail` (:97-119): signature -> `function PbDetail(props: { wayId: string; lastRideId: string | null;
   todayTier: UiTier; t: PaddockTheme })` (`UiTier` is a subset of chips' `Tier`, so it is assignable to
   `tierTextColour`'s parameter; no chips import needed). Destructure `todayTier`; add
   `const todayColour = tierTextColour(todayTier, t);`
   after `const detail = ...`. Update the doc comment (:93-96) with one line: ` * virgin-cycle22 03: the
   today row is coloured with THIS ride's lap tier (date + time cells), not accentText.` Row cells:
```tsx
              <Text style={[st.pbPos, { color: t.text }]}>{row.posLabel}</Text>
              <Text style={{ flex: 1, color: row.today ? todayColour : t.textDim, fontSize: 13 }}>
                {row.dateLabel}
              </Text>
              <Text style={[st.pbNum, { color: row.today ? todayColour : t.text }]}>{row.timeLabel}</Text>
              <Text style={[st.pbNum, { color: t.textDim }]}>{row.gapLabel}</Text>
```
f. Mount (:530-534): add `todayTier={model.lapTier}` between `lastRideId={request.rideId}` and `t={t}`.
g. `grep -n "chipColors\|tierColour(" app/src/ui/RideDetailScreen.tsx` -> 0 hits (`tierTextColour(` does not
   contain `tierColour(`); `grep -c "tierTextColour(" app/src/ui/RideDetailScreen.tsx` -> 3 or more;
   `grep -n "UiTier" app/src/ui/RideDetailScreen.tsx` -> the import and the PbDetail prop only.

**Step 4 — nothing else.** Do not touch chips.tsx, theme.ts, rideHistoryModel.ts, wayMapView.tsx.

**Step 5 — run everything.** Tests: **856 tests / 853 pass / 0 fail / 3 skip** (delta +5 vs post-02:
4 in ridedetail_suite, 1 in recordflow_suite). tsc exit 0. `git diff --stat`: exactly `tierColour.ts`,
`RideDetailScreen.tsx`, `ridedetail_suite.ts`, `recordflow_suite.ts` beyond the pre-existing modifications.

## Failed-before procedure (never git stash)
Step 1c records it. To re-prove the contrast test bites: `cp app/src/ui/tierColour.ts
safe_to_delete/tierColour.c22-03.bak`, temporarily make `case 'purple': return colors.purple;` for both
themes, run (the contrast test FAILS on night: 2.30 < 4.5), restore with `cp` and `cmp`.

## Verification (the inspector reruns all of it)
- Tests 0 FAIL with counts; tsc exit 0.
- Recompute the contrast table in §0 with your own script (any language) from the hexes in
  `tierColour.ts` and `theme.ts`; every NEW cell must match to 2 decimals.
- `grep -n "chipColors" app/src/ui/RideDetailScreen.tsx` -> 0; `grep -n "tierTextColour" app/src/ui/*.ts*`
  -> tierColour.ts (definition) and RideDetailScreen.tsx only.
- `git diff app/src/ui/chips.tsx app/src/ui/theme.ts app/src/ui/sectorTrailModel.ts` -> no hunks from
  this brief (chips.tsx may carry brief 02's glyph removal only).
- Behavioural read-through: RidesScreen/ResultsScreen never used `chipColors().text` or `tierColour`
  (grep) — unchanged.

## Added visible text
None. No string changes; `ui-strings.allow.json` untouched (state this in the report).

## What changes on the phone / what does not
Changes (after OTA publish): ACTIVITIES > a ride on a way — dark mode: the SECTORS list shows S1..S4 in
white, each time in its tier colour (purple now a readable light purple instead of near-black; green,
yellow as before), avg dim; the big lap time in purple is the same light purple; the ON THIS WAY
"today" row's date and time take the ride's result colour (purple/green/yellow; yellow-ish `accentText`
when there is no verdict yet, as today). Day mode: the big lap time and sector times are readable
(deep gold instead of pale yellow, dark green instead of neon green, brand purple as before).
Does NOT change: the map and its sector colours (`tierLineColour`), the live flash and lap chips, the
strip bars, RIDES list rows, RESULTS board, any text, any stored data, the Settings toggles.

## Out of scope (do not do)
- Fixing `daylight.accentText` (3.13:1) in theme.ts — a theme-wide token; flagged for Nathan.
- Adding a `tier` to `buildPbDetail` rows (see decisions) or colouring non-today rows.
- Any chip (`chipColors`, `LiveBigChip`, `LiveLapChip`) or map-line colour.
- IDEAS.md, STATE.md, OPEN-ITEMS.md, other briefs.

## Decisions taken by the Plan tier (logged, not asked)
1. **Today row cells:** DATE ('today') and TIME take the tier colour; position stays white, gap stays
   dim. Nathan: "the current today has a colour which ideally should be in the correct colour of the
   ride result" — today the date cell is the coloured one; colouring the time as well mirrors the
   SECTORS rule (the number carries the verdict). Two coloured cells, not the whole row.
2. **Source of the today tier = `model.lapTier`** (passed as a prop), not a new field on `buildPbDetail`
   rows: the model already computes the authoritative verdict for this ride (incl. `ignored` ->
   neutral); recomputing it inside `buildPbDetail` would be a second path that could disagree with the
   big lap time. So no model change and no model test; the brief's "pure model change" is not needed.
3. **Dark-ground detection = `t.statusBar === 'light'`** rather than parsing `t.card`'s luminance or
   adding a `mode` field to `PaddockTheme` (theme.ts is out of scope; statusBar is already the
   theme's own light/dark declaration).
4. **Night purple text changes from `colors.purple` to `#C364FF`** although Nathan said the big lap
   "reads fine" in dark mode: measured, #9000C8 is 2.30:1 on the night card — below even the 3.0 bar
   for large text — and the 13 px sector times need 4.5. One helper = one purple per theme; the
   alternative (keep the brand fill purple for the big number only) would mean two purples. If Nathan
   dislikes the tint on the phone, the constant is one line.
5. **'neutral' stays `t.accentText`** (day 3.13:1): it is not a tier verdict, the chips use the same
   token, and `accentText` is a theme-wide token outside this brief. Reported, not changed.
6. **'est' rows:** time in `t.textDim` (not `colors.grey` #6f6e6a as `chipColors('est').text` gave):
   the big lap already used textDim for est; textDim is 5.49/3.68 on the cards vs grey's lower
   contrast; the dashed/`~`/'– did not traverse –' semantics are carried by the model's text, unchanged.
   The label of such a row is white like every other row (one rule for the left column).
7. Tests live in `ridedetail_suite.ts` (static import of `tierColour.ts` is safe: it only imports
   theme.ts at runtime; its chips import is type-only) and `recordflow_suite.ts` (source check);
   `PURPLE_INK` is mirrored as a literal in the test because chips.tsx is JSX.
