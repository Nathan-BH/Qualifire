# Brief 2 (FINAL, rewrite 2026-10-09) — Tier colours: ONE palette for both themes — purple `#7B3FA8`, green `#007A00`, yellow = BRAND `#F5C542`

Rewritten by the Plan tier (Fable) 2026-10-09 ~22:40 UTC from Nathan's FINAL colour ruling (`00-nathan-ideas.md`, "#### 2 — FINAL colour ruling (2026-10-09 00:24)") and the three earlier 2026-10-09 rulings above it; every anchor re-read in the working tree (suite baseline at rewrite time: **`956 tests: 953 pass, 0 fail, 3 skip`**, tsc clean). This file REPLACES the 2026-10-08 brief entirely (the old brief's values `#C364FF` / `#8C6900` / `#B98A0A` are dead). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md` first. **Status: APPROVED — Nathan asked (2026-10-09 00:24) that all briefs be executed now. Runs FIRST in the cycle order (`10-plan.md` §15).**

## 0. Rules

- **STOP-ON-AMBIGUITY** (EXECUTOR-RULES: "any anchor mismatch, undecided call, or check failing for a reason the brief did not anticipate -> STOP and report verbatim. Never guess"). Report file: `cycles/virgin-cycle27/12-brief-02-executor-report.md`, section `## STOPPED`.
- **Nathan's FINAL ruling (2026-10-09 00:24, verbatim in `00-nathan-ideas.md`):** "for the next try i think i want to keep both the day mode green and purple for the dark mode as well ... #007A00 green and #7B3FA8 purple". Plus 00:11: "i confirm the app yellow is better than the intermediate one" ⇒ yellow tier = BRAND yellow `#F5C542`, both themes. ⇒ **ONE palette, both themes, map line AND text: purple `#7B3FA8`, green `#007A00`, yellow `#F5C542`.** No per-theme table. Nathan accepted the low night contrast (purple 2.38:1, green 2.89:1 on the night card) and the low day yellow (1.62:1 on the white card) as an on-device trial — these are RULED, not open.
- **Rider-facing text: ZERO strings.** `git diff -- app/tests/ui-strings.allow.json` must be empty.
- No new hex anywhere except `theme.ts` (the palette + `BRAND_YELLOW`) and the one test file. Never delete (`mv` to `safe_to_delete/`); no git add/commit/push; no EAS build / OTA publish; no edits outside §3/§4; `GIT_OPTIONAL_LOCKS=0`; strip-only TS (no `enum`, no parameter properties).
- Sector-colours SETTING default stays `false` (`settings.tsx` `sectorColours: false`) — do not touch `settings.tsx`.

## 1. What the working tree holds NOW (uncommitted, from the 2026-10-08 execution + two coordinator chores) — keep / replace

`git status --short` shows ` M app/src/ui/theme.ts`, ` M app/src/ui/tierColour.ts`, ` M app/src/ui/wayMapStyle.ts`, ` M app/src/ui/wayMapView.tsx`, ` M app/tests/ridedetail_suite.ts` (plus `product/proposals/*` and `cycles/virgin-cycle27/` which are not yours). Run `GIT_OPTIONAL_LOCKS=0 git diff -- app/src/ui/theme.ts app/src/ui/tierColour.ts app/src/ui/wayMapStyle.ts app/src/ui/wayMapView.tsx app/tests/ridedetail_suite.ts` first and confirm it matches this description; if it does not, STOP.

| file | state now | action |
|---|---|---|
| `theme.ts` `:11-28` | doc comment + `export const tierHex = { purple: '#C364FF', green: '#007A00', yellow: '#B98A0A' } as const;` + `export const tierTextNight = tierHex;` | **KEEP the structure, REPLACE values + comment** (§3.1). `tierTextNight` is REMOVED (one palette, no night table). |
| `theme.ts` `:35-38` | `purple: tierHex.purple`, `purpleDeep: '#8946B3'`, `green: tierHex.green`, `neutral: '#F5C542'` | keep the aliases; `purpleDeep` → `#562C76`; `neutral` → `BRAND_YELLOW` (§3.1). |
| `tierColour.ts` | imports `tierHex, tierTextNight`; `YELLOW_TIER = tierHex.yellow`; `tierLineColour` reads `tierHex`; legacy names `PURPLE_TEXT_NIGHT` / `GREEN_TEXT_DAY` / `YELLOW_TEXT_DAY` alias the palette; `tierTextColour` has `const dark = …; const p = dark ? tierTextNight : tierHex;` | **KEEP** everything except: drop `tierTextNight` from the import and the `dark`/`p` lines (§3.2); fix the two comments. |
| `wayMapStyle.ts` `:13-14` | comment `colors.green (#007A00, hue 120) and colors.purple (#C364FF, hue ~277)` | comment only: `#C364FF, hue ~277` → `#7B3FA8, hue ~274` (§3.3). |
| `wayMapView.tsx` `:864` | one plain-text line inside the JSX block comment: `virgin-cycle27 02: no longer true -- YELLOW_TIER is its own token (#B98A0A).` | **REPLACE** that one line (§3.3) — the original note ("an earned-yellow sector is now visually silent against an unscored one") is TRUE again under the final ruling. |
| `tests/ridedetail_suite.ts` `:16`, `:254-314` | import `tierHex`; contrast test with 2.8 floor; "EXACTLY Nathan's picks" pin (`#C364FF / #007A00 / #B98A0A`); "ONE palette" test; `tierLineColour` test; flash test with 2.8 floor; single-source test | **KEEP** the file's shape; rewrite the pins and the contrast rule exactly as §4 says. |

Everything else in those diffs (e.g. `exec-backup-tier-colours/`, the executor's `as string` casts, `fileURLToPath(...)` in the single-source test) stays.

## 2. Verified anchors (2026-10-09 ~22:30 UTC, working tree)

- `app/src/ui/theme.ts:11-22` the `tierHex` doc comment; `:23-27` `export const tierHex = { … } as const;`; `:28` `export const tierTextNight = tierHex; // split into its own object if night ever differs`; `:30` `export const colors = {`; `:35` `purple: tierHex.purple, …`; `:36` `purpleDeep: '#8946B3', …`; `:37` `green: tierHex.green, …`; `:38` `neutral: '#F5C542', // BRAND yellow / accent — warm, never grey; NOT the yellow tier since virgin-cycle27 02 (tierHex.yellow)`; `:93` `daylight.accentText: '#B98A0A'` (UNTOUCHED — see §6); `:98`/`:104`/`:105` `accent: colors.neutral` / `accentText: colors.neutral` (night).
- `app/src/ui/tierColour.ts:10` `import { tierHex, tierTextNight, type PaddockTheme } from './theme.ts';` `:12-15` `YELLOW_TIER` doc + `export const YELLOW_TIER = tierHex.yellow;` `:31` comment `virgin-cycle27 02: the three hexes are tierHex (theme.ts), shared with tierTextColour.` `:42-45` the legacy exports; `:56-60` the doc paragraph starting ` * virgin-cycle27 02 (Nathan 2026-10-08): the same three hexes as the map line (tierHex) in both themes — Nathan's picks, to be judged on the phone; `tierTextNight` is the one place to split night later.`; `:61-71` `tierTextColour` with `const dark = t.statusBar === 'light';` / `const p = dark ? tierTextNight : tierHex;` / `case 'purple': return p.purple;` etc.
- `app/src/ui/chips.tsx:26` `export const PURPLE_INK = '#120521';` `:38` `return { bg: colors.purple, border: colors.purple, text: PURPLE_INK }; // map lines: use tierLineColour(), never .text`. `colors` is imported in this file (check the import line; it is used at `:38`/`:40`).
- `app/src/ui/tower.tsx:45` `import { PURPLE_INK, YELLOW_TIER } from './chips';` `:299` `backgroundColor: colors.purple,` `:305-307` `cerLbl`/`cerTime`/`cerToday` `color: PURPLE_INK` — follow the constant, NO edit.
- `app/src/ui/preview/PreviewScreen.tsx:25` `import { PURPLE_INK, chipColors } from '../chips';` `:481` `? { bg: colors.purple, border: colors.purple, text: PURPLE_INK, dashed: false }` — unmounted screen; follows the constant, NO edit.
- `app/tests/ridedetail_suite.ts:18` `const PURPLE_INK = '#120521'; // chips.tsx:25, mirrored — chips.tsx is JSX and not loadable here`; `:249` the assert `c.toUpperCase() !== PURPLE_INK.toUpperCase()`.
- `app/tests/recordflow_suite.ts:504` only checks the string `'chipColors'` — unaffected.
- Contrast facts (WCAG, computed 2026-10-09; the inspector recomputes): on the day card `#FFFFFF` / night card `#212127` / day race.bg `#FFFFFF` / night race.bg `#0A0A0A`: purple `#7B3FA8` **6.73 / 2.38 / 6.73 / 2.94**; green `#007A00` **5.55 / 2.89 / 5.55 / 3.57**; yellow `#F5C542` **1.62 / 9.87 / 1.62 / 12.21**. Ink on a filled purple chip: `#120521` on `#7B3FA8` = **2.92:1** (unreadable), white `#FFFFFF` on `#7B3FA8` = **6.73:1** ⇒ white ink.

## 3. Edits

### 3.1 `src/ui/theme.ts`

Replace lines `:11-28` (from `/** virgin-cycle27 brief 02 …` through `export const tierTextNight = tierHex; …`) with EXACTLY:

```ts
/** The brand yellow — buttons, the ridden reference line, the MAP/ROUTES tab lines,
 * night accent text, AND (since the virgin-cycle27 FINAL ruling, Nathan 2026-10-09)
 * the yellow TIER. One literal, two names: `colors.neutral` and `tierHex.yellow`. */
export const BRAND_YELLOW = '#F5C542';

/** virgin-cycle27 brief 02, FINAL (Nathan 2026-10-09 00:24): THE tier palette — the
 * three colours a scored sector / lap paints, for the MAP LINE and for TEXT on a card,
 * in BOTH themes (Nathan: "keep both the day mode green and purple for the dark mode
 * as well"; "the app yellow is better than the intermediate one"). Change a value here
 * and every surface follows: tierColour.ts, tower.tsx, chips.tsx, the live strip, the
 * gate flash, the sector-coloured trail, the ghost dots, PreviewScreen.
 * Earlier trials, all dropped: purple #9000C8 / #C364FF, green #00D000, yellow #8C6900
 * / #B98A0A. A yellow sector on the map is therefore the SAME hex as the un-scored base
 * line again (wayMapView.tsx's note) — Nathan's call.
 * Contrast (WCAG, computed 2026-10-09) on the day / night card: purple 6.73 / 2.38,
 * green 5.55 / 2.89, yellow 1.62 / 9.87 — the three low values are an on-device trial
 * Nathan accepted; ridedetail_suite lists them as explicit, dated exemptions. */
export const tierHex = {
  purple: '#7B3FA8',
  green: '#007A00',
  yellow: BRAND_YELLOW,
} as const;
```

Then inside `colors`:
- `:36` → `purpleDeep: '#562C76', // darker purple (channels x0.7 of \`purple\`) — unreferenced today; keep in step with \`purple\`` (0.7 × 7B/3F/A8 = 85.4/44.1/117.6 → 55/2C/76 hex; recompute yourself — a difference of more than ±1 per channel → STOP and report both).
- `:38` → `neutral: BRAND_YELLOW, // BRAND yellow / accent — warm, never grey; ALSO the yellow tier (tierHex.yellow) since the cycle27 FINAL ruling`.
- `:35`, `:37` (the `purple` / `green` aliases) unchanged.

### 3.2 `src/ui/tierColour.ts`

- `:10` → `import { tierHex, type PaddockTheme } from './theme.ts';`
- `:12-15` replace the `YELLOW_TIER` doc with:
```ts
/** The yellow TIER (an ordinary time, below the recent average). virgin-cycle27 02 FINAL
 * (Nathan 2026-10-09): the BRAND yellow again (tierHex.yellow === colors.neutral) — in F1
 * yellow is the DEFAULT colour of a lap time, not a warning (D-013). */
export const YELLOW_TIER = tierHex.yellow;
```
- `:42-45`: comment → `/** virgin-cycle27 02: kept as named exports for the tests; all three read the one palette (no per-theme values since the FINAL ruling). */`; `export const PURPLE_TEXT_NIGHT = tierHex.purple;` (was `tierTextNight.purple`); the other two unchanged.
- `:56-57` the doc paragraph: replace the sentence ` * virgin-cycle27 02 (Nathan 2026-10-08): the same three hexes as the map line (tierHex) in both themes — Nathan's picks, to be judged on the phone; \`tierTextNight\` is the one place to split night later.` with ` * virgin-cycle27 02 FINAL (Nathan 2026-10-09): the same three hexes as the map line (tierHex) in BOTH themes — one palette, no night table; the low night contrast is an accepted on-device trial.`
- `tierTextColour` body: delete the two lines `const dark = t.statusBar === 'light';` and `const p = dark ? tierTextNight : tierHex;`; the three cases become `case 'purple': return tierHex.purple; case 'green': return tierHex.green; case 'yellow': return tierHex.yellow;`. `'neutral'` → `t.accentText` and `default` → `t.textDim` unchanged. (`t` is still used by those two cases — do not remove the parameter.)

### 3.3 Comments only
- `src/ui/wayMapStyle.ts:13-14`: `colors.purple (#C364FF, hue\n *     ~277)` → `colors.purple (#7B3FA8, hue\n *     ~274)`. Hue of `#7B3FA8` is ~274°, inside the [263,303] firewall band — no logic change.
- `src/ui/wayMapView.tsx:864` the line `            virgin-cycle27 02: no longer true -- YELLOW_TIER is its own token (#B98A0A).` → `            virgin-cycle27 02 FINAL (Nathan 2026-10-09): true again -- the yellow tier IS the brand yellow (tierHex.yellow === colors.neutral), by his ruling.` Find it by content (it sits inside a `{/* … */}` JSX comment; keep it as plain text, no `//`).

### 3.4 `src/ui/chips.tsx:26` — white ink on the filled purple chip (BOTH themes)

`export const PURPLE_INK = '#120521';` →
```ts
/** Ink for text ON a filled purple chip / the purple ceremony row (tower.tsx). virgin-cycle27 02
 * FINAL (Nathan 2026-10-09): the final purple #7B3FA8 is dark, so the ink is WHITE (6.73:1; the old
 * near-black #120521 would be 2.92:1). Same in both themes — the chip fill is theme-less. Never
 * use this for text on a card (tierTextColour). */
export const PURPLE_INK = colors.white;
```
`colors.white` is `'#FFFFFF'` (`theme.ts:39`). The constant's NAME stays so `tower.tsx:45/305-307`, `PreviewScreen.tsx:25/481` and `recordflow_suite.ts:504` need no edit. Verify `colors` is a VALUE import in `chips.tsx` (it is used at `:38`); if it is type-only, STOP.

### 3.5 Nothing else
Do not touch `tower.tsx`, `PreviewScreen.tsx`, `colourModel.ts`, `sectorTrailModel.ts`, `settings.tsx`, `wayMapStyle.ts` logic, `catalogMapView.tsx`, the launcher icon, `design/`, `marketing/`, `ui-strings.allow.json`.

## 4. Tests — `tests/ridedetail_suite.ts`

- `:16` → `import { colors, daylight, night, tierHex, type PaddockTheme } from '../src/ui/theme.ts';`
- `:18` → `const PURPLE_INK = '#FFFFFF'; // chips.tsx PURPLE_INK (= colors.white since cycle27 FINAL), mirrored — chips.tsx is JSX and not loadable here`. The assert at `:249` stays as is (card text is never pure white: night `t.text` is `#F4F2EC`).
- Add, directly after the `TIERS` constant (`:242`), the exemption table:
```ts
/** virgin-cycle27 02 FINAL (Nathan 2026-10-09): scored-tier text must clear WCAG 4.5:1 on its ground
 * EXCEPT the pairs Nathan accepted as an on-device trial after seeing them. Each exemption pins the
 * ratio it had when accepted (rounded DOWN to 0.05) so a silent drift still fails. Key: tier/theme/ground.
 * Remove a line here only when Nathan changes the palette or revokes the trial. */
const ACCEPTED_LOW_CONTRAST: Record<string, number> = {
  'purple/night/card': 2.35, // #7B3FA8 on #212127 = 2.38
  'purple/night/race.bg': 2.90, // on #0A0A0A = 2.94
  'green/night/card': 2.85, // #007A00 on #212127 = 2.89
  'green/night/race.bg': 3.55, // on #0A0A0A = 3.57
  'yellow/day/card': 1.60, // brand #F5C542 on #FFFFFF = 1.62 — Nathan: "the app yellow is better"
  'yellow/day/race.bg': 1.60, // on #FFFFFF = 1.62
};
const themeName = (t: PaddockTheme) => (t.statusBar === 'light' ? 'night' : 'day');
function assertScoredContrast(tier: 'purple' | 'green' | 'yellow', t: PaddockTheme, ground: 'card' | 'race.bg'): void {
  const bg = ground === 'card' ? t.card : t.race.bg;
  const r = contrast(tierTextColour(tier, t), bg);
  const key = `${tier}/${themeName(t)}/${ground}`;
  const floor = ACCEPTED_LOW_CONTRAST[key] ?? 4.5;
  assert(r >= floor, `${key} ${bg}: ${r.toFixed(2)} < ${floor}${floor < 4.5 ? ' (accepted trial value drifted — palette changed?)' : ''}`);
}
```
- `:254-266` the contrast test: title → `'virgin-cycle22 03 → cycle27 FINAL: tierTextColour — WCAG contrast on the card: scored tiers >= 4.5 except the dated ACCEPTED_LOW_CONTRAST exemptions; verdict-less >= 3.0, both themes'`; the inner `for (const tier of ['purple','green','yellow'] as const)` loop body becomes `assertScoredContrast(tier, t, 'card');` (delete the local `r`/`assert`). Keep the `>= 3.0` loop. Replace the trailing comment + assert (`// virgin-cycle27 02: day yellow text is never the BRAND yellow …` / `assert((tierTextColour('yellow', daylight) as string) !== colors.neutral && …`) with:
```ts
  // virgin-cycle27 02 FINAL (Nathan 2026-10-09): the yellow tier IS the brand yellow again, in both themes — inverted from the 2026-10-08 brief.
  assert(tierTextColour('yellow', daylight) === colors.neutral && tierTextColour('yellow', night) === colors.neutral && YELLOW_TIER === colors.neutral, 'yellow tier = brand yellow');
```
- `:269-276` the pin test: title → `'virgin-cycle27 02 FINAL: the tier palette is EXACTLY Nathan\'s picks — #7B3FA8 / #007A00 / #F5C542 (one palette, both themes; change here on purpose)'`; every `'#C364FF'` → `'#7B3FA8'`, every `'#B98A0A'` → `'#F5C542'` (three asserts: `tierHex`, text hexes per theme, line hexes). Keep `colors.neutral === '#F5C542'`.
- `:278-285` "ONE palette" test: unchanged (it already asserts both themes = `tierHex`, legacy aliases).
- `:287-290` `tierLineColour` test: `&& tierLineColour('yellow') !== colors.neutral` → `&& tierLineColour('yellow') === colors.neutral` (message `'line colours (yellow = brand)'`).
- `:292-307` flash test: delete the stale comment line `// Night: brand green/yellow, readable purple tint. Day: brand purple, deep green/gold. …` (replace by `// cycle27 FINAL: one palette both themes; the low night values are listed exemptions.`); the inner scored loop body becomes `assertScoredContrast(tier, t, 'race.bg');`. Keep the `>= 3.0` and `!== t.text` asserts.
- `:309-314` single-source test: unchanged, plus one more assert: `assert(tierHex.yellow === colors.neutral, 'tierHex.yellow and colors.neutral are the one BRAND_YELLOW literal');`.
- **New test** (append after the single-source test):
```ts
test('virgin-cycle27 02 FINAL: filled purple chips take WHITE ink in both themes (chips.tsx PURPLE_INK = colors.white) — #120521 would be 2.92:1 on #7B3FA8', () => {
  const chips = nodeFs.readFileSync(fileURLToPath(new URL('../src/ui/chips.tsx', import.meta.url).href), 'utf8');
  assert(chips.includes('export const PURPLE_INK = colors.white;'), 'PURPLE_INK is colors.white');
  assert(!chips.includes("'#120521'"), 'the near-black ink literal is gone');
  assert(contrast('#FFFFFF', tierHex.purple) >= 4.5, `white on the purple fill: ${contrast('#FFFFFF', tierHex.purple).toFixed(2)}`);
  assert(contrast(PURPLE_INK, tierHex.purple) >= 4.5, 'the mirrored ink constant clears 4.5 on the fill');
});
```
(A file READ of `chips.tsx`, not an import — the suite cannot load JSX.)
- `tests/waymapstyle_suite.ts:7-10` is a comment only — leave it.

## 5. Acceptance

1. Baseline first (record it; 956/953/0/3 at brief time). After: **+1 test (957), 0 FAIL**. `waymapstyle_suite`, `waymapgeo_suite`, `feedmodel_suite`, `live_colour_suite`, `recordflow_suite` pass unedited.
2. `cd app && ./node_modules/.bin/tsc --noEmit` exit 0 (timeout_ms 180000, tee to `cycles/virgin-cycle27/12-brief-02-tsc.log`; an empty log = timed out, rerun). Note: `tierHex.yellow === colors.neutral` compares two `as const` literal types that are the SAME literal (`BRAND_YELLOW`), so no TS2367 is expected; if tsc complains about a comparison, cast `as string` as the 2026-10-08 executor did, and say so.
3. `git diff --stat`: `src/ui/theme.ts`, `src/ui/tierColour.ts`, `src/ui/chips.tsx`, `src/ui/wayMapStyle.ts` (comment), `src/ui/wayMapView.tsx` (comment), `tests/ridedetail_suite.ts`. Nothing else. Allow-list diff EMPTY.
4. `grep -n "C364FF\|B98A0A\|8C6900\|9000C8\|00D000\|120521\|tierTextNight" src/ui/*.ts src/ui/*.tsx src/ui/preview/*.tsx tests/ridedetail_suite.ts` → only `theme.ts:93` (`accentText: '#B98A0A'`, untouched day accent), the historical line in `theme.ts`'s new doc comment, and comment lines (`chips.tsx` doc, the test title). `tierTextNight` must have ZERO hits. Report each hit.
5. `grep -rn "PURPLE_INK" src tests --include=*.ts --include=*.tsx` → the definition, `tower.tsx` (import + 3 styles), `PreviewScreen.tsx` (import + 1 use), comments, the test lines. No new site.
6. Print in the report the contrast matrix the real functions produce (scratch script under `safe_to_delete/`, never in the suite): 3 tiers × {day card, night card, day race.bg, night race.bg} + white-on-purple.

## 6. Known, ruled, flagged (for the inspector and the readout — NOT to be "fixed")

- **Low contrast is accepted by Nathan as an on-device trial:** night card purple 2.38:1, green 2.89:1; day card yellow 1.62:1 (plus day race.card `#F5F1E6` yellow 1.44:1, untested ground). The suite now documents each as a dated exemption that FAILS if the value drifts (§4). The 2026-10-08 "2.8 preview floor" is gone; the 4.5 rule is back for every pair not listed.
- **Day `accentText` stays `#B98A0A`** (`theme.ts:93`): it is the day theme's yellow-as-TEXT for 'neutral' (no verdict yet) chips and other accent text, not a tier colour, and Nathan's rulings spoke only of the yellow TIER. Consequence on the day card: a yellow TIER time is brand `#F5C542`, a no-verdict chip is `#B98A0A`. Flag in the readout; a one-line change (`accentText: colors.neutral`) if he wants one day yellow — NOT in this brief.
- A yellow sector span on the map equals the base line colour (the pre-cycle27 state) — Nathan's choice.
- The D-030 basemap firewall bands (green hue 120, purple hue ~274) still cover both scored hues.

## 7. What this changes on Nathan's phone (JS-only, OTA)

Every sector time, total time, timing-tower row, live strip bar, gate/finish flash, ghost dot and sector-coloured map span is `#7B3FA8` / `#007A00` / `#F5C542` in day AND night; purple filled chips and the purple ceremony row carry white text. Yellow sectors on the map look like the base line (sector colours toggle must be ON in Settings to see map colours at all; default OFF). NOT changed: buttons, reference line, MAP/ROUTES tab lines, launcher icon, gate ticks, rider dot, DEMO geometry, day accent text.

## 8. Rollback
`tierHex` back to the previous three values and `PURPLE_INK` back to `'#120521'`; restore the test pins. One-value tweaks later: edit `tierHex` only (and the pin test).

## 9. Report
`12-brief-02-executor-report.md`: files; counts before/after; tsc; allow-list diff (empty); contrast matrix; every grep hit from §5.4/5.5; any STOP verbatim. OPEN-ITEMS line for the coordinator: "Tier palette FINAL (cycle27 brief 02): #7B3FA8 / #007A00 / brand #F5C542, one palette both themes, white chip ink — Nathan judges on the phone (sector colours ON, day + night); exemption table ACCEPTED_LOW_CONTRAST in ridedetail_suite; day accentText #B98A0A left as is."
