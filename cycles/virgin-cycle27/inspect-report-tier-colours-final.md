# Inspect report — brief 02 FINAL (tier colours: #7B3FA8 / #007A00 / brand #F5C542)

Inspector: fresh-context Opus, 2026-10-09. Report `exec-report-tier-colours-final.md` not trusted; everything below rerun on the working tree.

## Verdict: **PASS WITH NOTES** (no BLOCKER, no MAJOR). Safe to ship OTA (JS only): **yes** — no hunk under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.

## Checks rerun
- `node --experimental-strip-types tests/run.ts` → **957 tests: 954 pass, 0 fail, 3 skip** (baseline 956/953/0/3; +1 = the new white-ink test).
- `./node_modules/.bin/tsc --noEmit` → **exit 0**, empty output (`safe_to_delete/insp-tsc-tier.log`).
- `git diff -- app/tests/ui-strings.allow.json` → **empty** (no added / edited / removed entries).
- Nothing committed: HEAD still `a7834cd` (2026-10-08); all changes unstaged.

## Scope (`git diff --stat`)
`app/src/ui/chips.tsx`, `theme.ts`, `tierColour.ts`, `wayMapStyle.ts` (comment only), `wayMapView.tsx` (comment only, +1 line), `app/tests/ridedetail_suite.ts` — exactly the brief's §5.3 list. `product/proposals/README.md` (+1 line, `watch.md` idea) and untracked `product/proposals/watch.md` are NOT brief-02 work (brief §1 names them as not the executor's). `tower.tsx`, `PreviewScreen.tsx`, `settings.tsx`, `colourModel.ts`, `sectorTrailModel.ts`, `catalogMapView.tsx`: no diff.

## Brief requirements, item by item
- `theme.ts`: `BRAND_YELLOW = '#F5C542'`; `tierHex = { purple: '#7B3FA8', green: '#007A00', yellow: BRAND_YELLOW } as const` — EXACT. `colors.purple/green` alias `tierHex`; `colors.neutral = BRAND_YELLOW` ⇒ `colors.neutral === tierHex.yellow` (also asserted in suite). `purpleDeep '#562C76'` — recomputed 0.7×(7B,3F,A8) = 86.1/44.1/117.6 → 56/2C/76 (B within ±1). Day `accentText` still `'#B98A0A'` (`theme.ts:97`; brief cited :93 — line shift only), night `accentText: colors.neutral`.
- `tierTextNight`: **zero hits** anywhere in `src/ui`, `src/ui/preview`, the suite.
- `tierColour.ts`: imports only `tierHex, type PaddockTheme`; `tierTextColour` has no `dark`/`p` lines, scored cases return `tierHex.*`, `neutral` → `t.accentText`, default → `t.textDim`; `tierLineColour` reads `tierHex`; legacy names alias the palette; no hex literal in code (suite greps it).
- `chips.tsx:30` `export const PURPLE_INK = colors.white;` — `colors` is a VALUE import (`chips.tsx:10 import { PaddockTheme, colors } from './theme'`). `tower.tsx:45/305-307` and `PreviewScreen.tsx:25/481` unedited and follow the constant ⇒ white ink on the purple fill in both themes (6.73:1).
- `wayMapStyle.ts:13-14` comment `#7B3FA8, hue ~274`; firewall band 263–303 (`:27-28`) unchanged; computed hue of `#7B3FA8` = 274.3° — inside.
- `wayMapView.tsx:864` single plain-text line inside the JSX block comment; the old "no longer true … (#B98A0A)" line is gone.
- Suite: `ACCEPTED_LOW_CONTRAST` table with per-line reason (hex on ground = real ratio, yellow lines quote Nathan) and a dated header ("virgin-cycle27 02 FINAL (Nathan 2026-10-09)"); `assertScoredContrast` used in the card and race.bg tests; yellow = brand asserts inverted as specified; pin test `#7B3FA8 / #007A00 / #F5C542`; single-source test + the `tierHex.yellow === colors.neutral` assert; new white-ink test appended. Note: the per-entry comments carry reasons; the date is on the table header, not on each line (acceptable reading of "dated").

## Grep §5.4 (`C364FF|B98A0A|8C6900|9000C8|00D000|120521|tierTextNight`)
- `theme.ts:22-23` — historical "Earlier trials, all dropped" doc-comment line (allowed).
- `theme.ts:97` — `accentText: '#B98A0A'` day accent, untouched by ruling (§6) — NOT a tier colour.
- `chips.tsx:28` — doc comment.
- `ridedetail_suite.ts:335,338` — test title / the "literal is gone" assert.
No old tier hex in code.

## Grep §5.5 (`PURPLE_INK`)
Definition `chips.tsx:30`, use `chips.tsx:42`; `tower.tsx:45,305,306,307`; `PreviewScreen.tsx:25,481`; comments `sectorTrailModel.ts:13`, `tierColour.ts:23,51,58`; tests `recordflow_suite.ts:504`, `ridedetail_suite.ts:18,269,335,337,340`. No new site.

## Contrast matrix (recomputed from the real `tierTextColour`, scratch `safe_to_delete/insp-contrast.ts`)
| tier | day card #FFF | day race.bg #FFF | day race.card #F5F1E6 | night card #212127 | night race.bg #0A0A0A | night race.card #141414 |
|---|---|---|---|---|---|---|
| purple #7B3FA8 | 6.73 | 6.73 | 5.97 | **2.38** | **2.94** | **2.74** |
| green #007A00 | 5.55 | 5.55 | 4.92 | **2.89** | **3.57** | **3.32** |
| yellow #F5C542 | **1.62** | **1.62** | **1.44** | 9.87 | 12.21 | 11.36 |

White on purple fill 6.73; old ink #120521 on purple 2.92. Every card / race.bg pair below 4.5 is an `ACCEPTED_LOW_CONTRAST` key and each pinned value is <= the real ratio (2.35≤2.378, 2.90≤2.940, 2.85≤2.885, 3.55≤3.567, 1.60≤1.622 ×2).

## Mutate-check (by reasoning)
- Revert `PURPLE_INK` to `'#120521'` → new test fails on `includes('export const PURPLE_INK = colors.white;')` and on `!includes("'#120521'")`.
- Revert `tierHex.purple` to `#C364FF` → pin test fails; contrast test also fails (night card has no exemption ceiling issue but day pin breaks).
- Drift purple to a darker hex → `purple/night/card` falls below 2.35 → fails with the "drifted" message. Tests are not vacuous.

## Findings (severity-ranked)
1. **MINOR** — stale doc comments, `tierColour.ts:23` and `:51`: still say purple's `.text` is "PURPLE_INK, the near-black ink" (`:51` also "unreadable (1.23:1) on the dark card"). PURPLE_INK is now white. The warning (never use chip ink for card text) is still correct; only the description is stale. Fix: "PURPLE_INK, the ink for a filled purple chip (white since cycle27 FINAL)". Comment-only, not in the brief's edit list — so not an executor fault.
2. **MINOR / note** — untested ground `race.card`: day yellow 1.44, night purple 2.74, night green 3.32. Brief §6 flagged only day yellow there; night purple/green on `race.card` are equally low and inside the accepted trial, but no test covers that ground. Only matters if text is drawn on `race.card`.
3. **NOTE** — `tower.tsx:208,246` PB dot `●` in `colors.purple` on the card: 2.38:1 at night. Same accepted trial; no change needed.
4. **NOTE** — `product/proposals/README.md` + `watch.md` are in the tree uncommitted but belong to other work (brief 04 note), not this brief.
5. **NOTE (ruled, §6)** — day card: a yellow TIER time is `#F5C542` while a no-verdict (neutral) chip is `#B98A0A`. Per brief, left for Nathan.

No BLOCKER. No MAJOR.
