# Inspect report — tier colours (brief 11-brief-tier-colours.md, "brief 02")

Inspector: INSPECT tier, fresh-context Opus, 2026-10-08. Every check below was rerun by me; the executor report was not trusted.

## Verdict: PASS WITH NOTES

Safe to ship OTA (JS only)? **Yes** — no hunk under app/modules, app.json, app.config.js, package.json, eas.json.

## 1. Tests and tsc (rerun)
- `cd app && node --experimental-strip-types tests/run.ts` → exit 0, **955 tests: 952 pass, 0 fail, 3 skip** (the 3 skips are the pre-existing python parity oracles). `grep -c ^FAIL` = 0.
- Rider-facing text guard: `ui-strings: scanned 73 files, 435 strings, 0 banners` ; `PASS ui-strings: live tree: every visible string is allowlisted and within budget` ; `PASS ui-strings: allowlist: header and entry hygiene`.
- `cd app && ./node_modules/.bin/tsc --noEmit` → **exit 0**, no output.
- `git diff -- app/tests/ui-strings.allow.json` → **empty** (no entry added/edited/removed).

## 2. Diff review (backups == HEAD for all five files, verified with cmp)
- `git status --short`: M theme.ts, tierColour.ts, wayMapStyle.ts, wayMapView.tsx, ridedetail_suite.ts; plus `M product/proposals/README.md`, `?? product/proposals/watch.md`, `?? cycles/virgin-cycle27/` — the latter three were already present in `exec-backup-tier-colours/status-before.txt`, i.e. not the executor's.
- theme.ts: tierHex {#C364FF, #007A00, #8C6900} + tierTextNight = tierHex inserted before `colors`; colors.purple/green → aliases; neutral stays '#F5C542' (comment only); purpleDeep '#65008C' → '#8946B3'. Exactly brief §3.1.
- purpleDeep #8946B3: **prescribed by the brief** (§3.1), not an executor invention. 0.7 × C3/64/FF = 136.5/70/178.5 → 89/46/B3 (rounds .5 up; matches ±1). `grep purpleDeep src tests` → referenced nowhere outside theme.ts. Not a tier colour; no visible effect.
- tierColour.ts: matches §3.2. Leftover: `colors` is still imported at tierColour.ts:10 but no longer used (dead import; tsc has no noUnusedLocals).
- wayMapStyle.ts: comment only (hex + hue ~283 → ~277). wayMapView.tsx: one comment line inside the JSX block comment (:864), no `//` — correct inside `{/* */}`.
- ridedetail_suite.ts: matches §4. Deviations checked:
  - `as string` casts (:268) are on the two `!== colors.neutral` comparisons only — needed because tierHex/colors are `as const` literal types (TS2367). Runtime semantics unchanged. Not a type hole in app code.
  - `fileURLToPath(new URL(...).href)` (:303): reads the right file (the test passes and would see any hex — the regex strips only comments). Fine.

### Does the new test assert what it claims? Mutation check (on a copy in $HOME/mut27, never the repo)
| Mutation of tierHex | Tier-related FAILs |
|---|---|
| green '#007A00' → '#00D000' (old value) | 2 (contrast: green on day card 2.10 < 2.8; green flash on day race 2.10) |
| green '#007A00' → '#008A00' (arbitrary drift) | **0** |
| yellow '#8C6900' → '#F5C542' (back to brand) | 3 (day card contrast 1.62; tierLineColour test `!== colors.neutral`; day race flash) |
(The copy also produced 6 environment-only FAILs from missing .easignore/package-lock in the copy; ignored.)
Conclusion: the suite guards "line == text == colors alias == tierHex", "yellow tier ≠ brand yellow", and a 2.8 floor; it does **not** pin Nathan's three exact hexes (every comparison is against tierHex itself). An unrelated edit to tierHex would pass silently. Acceptable given "values stay easily tweakable", but noted.

## 2b. Every consumer of the tier tokens (grep over app/src)
Nathan's belief "green and purple appear nowhere else except sector times / total time" is **not accurate**. Counterexamples (all are tier uses, all now take the new hexes — none is a non-tier use that changed unintentionally):
- Live strip sector bar + sector label (race ground): chips.tsx:73-76 (`StripSlot`, via tierLineColour) ← liveView.tsx.
- Live clock flash at gates/finish: liveView.tsx:244 (tierTextColour).
- Timing tower time column: tower.tsx:82-95 (colors.purple / colors.green / YELLOW_TIER); PB dot "●": tower.tsx:208, :246 (colors.purple); ceremony row background: tower.tsx:299 (colors.purple, PURPLE_INK text — contrast 6.16:1 now vs 2.82:1 before, an improvement). Mounted in RecordScreen.tsx:51 and DemoScreen.tsx:124.
- Map: sector spans (wayMapView.tsx:876) fed by tierLineColour in RecordScreen.tsx:1125, DemoScreen.tsx:583, rideDetailModel.ts:106 (ride detail + activity card + replay); self-racing ghost dots `self-dot` circle-color (wayMapView.tsx:972-975, tierLineColour).
- Cards: activityCard.tsx:68 (hero), :109 (sector chips); RideDetailScreen.tsx:84, :480 (lap), :557 (sector rows).
- chipColors (chips.tsx:36-52): only consumer is preview/PreviewScreen.tsx (:422, :482), which is not imported anywhere (unmounted). PreviewScreen.tsx:414-415, 804, 810, 862 also use colors.purple/green — unmounted, no phone effect.
- No non-tier consumer of colors.purple / colors.green exists (gate ticks are white — `gateColours={undefined}` RecordScreen.tsx:1424; rider dot riderBlue; notification and lock-screen native modules carry no tier hex — notification uses `Notification.COLOR_DEFAULT`, QualifireRideNotificationModule.kt:142).

## 3. Brand yellow #F5C542 — unchanged where required
- theme.ts:38 `neutral: '#F5C542'`; daylight.accent / night.accent / night.accentText = colors.neutral (runtime-printed: #F5C542 ×3); daylight.accentText #B98A0A unchanged.
- Route-core base line wayMapView.tsx:813 and :827 `colors.neutral`; gate field fill/line/circle :885/:888/:893 `colors.neutral`.
- MAP tab: catalogMapView.tsx has no tier tokens (its header :15 "lines are the brand yellow").
- resultsPlot.tsx:190 newest dot `t.accent` (brand) — untouched.
- Yellow tier resolves to #8C6900 on every path: tierLineColour('yellow') (map spans, strip, self dots), tierTextColour('yellow', day|night) (cards, flash, ride detail, activity card), YELLOW_TIER (tower, chips). Unearned/OFF case: ALL_YELLOW = [] (sectorTrailModel.ts:41) → every span `rgba(0,0,0,0)` (wayMapView.tsx:876) → brand base line shows; toggle OFF is pixel-identical to before.

## 4. Effective hex (printed by running the real functions from a scratch script in $HOME, outside the repo)
| element | day | night | target | ok |
|---|---|---|---|---|
| tierLineColour purple / green / yellow | #C364FF / #007A00 / #8C6900 | same (theme-less) | same | yes |
| tierLineColour neutral / est / none | null / null / null | null | null | yes |
| tierTextColour purple | #C364FF | #C364FF | #C364FF | yes |
| tierTextColour green | #007A00 | #007A00 | #007A00 | yes |
| tierTextColour yellow | #8C6900 | #8C6900 | #8C6900 | yes |
| tierTextColour neutral | #B98A0A | #F5C542 | accentText | yes |
| tierTextColour est / none | #8A8577 | #9a978f | textDim | yes |
| colors.purple / green / neutral | #C364FF / #007A00 / #F5C542 | — | — | yes |
| YELLOW_TIER | #8C6900 | — | #8C6900 | yes |

## 5. Contrast (recomputed, WCAG)
| tier | day card #FFFFFF | night card #212127 | day race.bg #FFFFFF | night race.bg #0A0A0A | day race.card #F5F1E6 | night race.card #141414 |
|---|---|---|---|---|---|---|
| purple #C364FF | 3.19 | 5.02 | 3.19 | 6.21 | **2.82** | 5.78 |
| green #007A00 | 5.55 | **2.89** | 5.55 | 3.57 | 4.92 | 3.32 |
| yellow #8C6900 | 5.08 | 3.15 | 5.08 | 3.90 | 4.50 | 3.63 |
Matches the executor's matrix. The 2.8 floor is applied **narrowly**: only inside the two `for tier of ['purple','green','yellow']` loops (ridedetail_suite.ts:258 card, :289 race ground), each with the dated "preview floor ... was 4.5" note. Verdict-less tiers keep `>= 3.0`; the `!== t.text` asserts are kept. No other colour's accessibility assertion was weakened. The removed asserts (night purple ≠ #9000C8, day green ≠ #00D000) only guarded the old values.
Note: the race.card ground (#F5F1E6, used by race-mode cards) is not in any test; purple sits at 2.82:1 there, a hair above the floor.

## 6. Stale artefacts (not edited)
- app/tests/ridedetail_suite.ts:254 test title still says "scored tiers >= 4.5".
- app/tests/ridedetail_suite.ts:~285 comment "Night: brand green/yellow, readable purple tint. Day: brand purple, deep green/gold." — now false.
- app/src/ui/tierColour.ts:~53 "do NOT use tierLineColour for text: ... its yellow fails on a light card" — no longer true (#8C6900 is 5.08:1 on white). Also the dead `colors` import at :10.
- app/src/ui/wayMapView.tsx:855-862 note still says an earned-yellow sector is `colors.neutral` and "visually silent"; the appended :864 line contradicts it (as the brief intended) — reads confusingly.
- app/tests/waymapstyle_suite.ts:7-8 comment `#00D000` / `#9000C8 (hue ~283)` (brief said leave).
- Test fixtures app/tests/waymapgeo_suite.ts:341-347, feedmodel_suite.ts:46 use old hexes as opaque data — harmless.
- STATE.md:256, :381 and OPEN-ITEMS.md:268 describe the old palette historically (dated entries — fine, but STATE has no line for the new palette yet; coordinator's job).
- GLOSSARY.md:52 "Yellow — the app's neutral, default colour" — conceptually still fine but no longer the brand yellow.
- design/canonical: no #00D000 / #9000C8 hits.

## 7. Scope
Only the five briefed files changed by the executor; allow-list untouched; `git log -1` = a7834cd (cycle26 commit, pre-existing) — no commit; no push/publish evidence.

## 8. Hunt for missed hexes
- `grep -rnE "#[0-9A-Fa-f]{6}" app/src` (code, not comments) outside theme.ts: only CASING '#14120C', PURPLE_INK '#120521', rider dot whites, and grey styles in the unmounted PreviewScreen. No #00D000/#9000C8/#C364FF/#007A00/#8C6900 literal anywhere outside theme.ts except two comments (wayMapStyle.ts:13, wayMapView.tsx:864).
- Native modules (qualifire-ride-notification, qualifire-lock-screen): no tier or brand hex; notification colour is COLOR_DEFAULT with setColorized(false).

## Findings
BLOCKING: none.

SHOULD-FIX
1. ridedetail_suite.ts:254 title still says ">= 4.5" while the assertion is 2.8 — a misleading pass line in the suite output. Fix: retitle.
2. tierColour.ts:~53 doc claims tierLineColour's yellow fails on a light card (no longer true) and :10 imports `colors` unused. Fix: drop the clause and the import.

NOTE
3. No test pins Nathan's three hexes; drift to any other value that clears 2.8:1 passes silently (mutation '#008A00' → 0 fails). If the picks are meant to be locked after the phone check, add one exact-value assert.
4. Nathan's "green/purple only on sector/total times" is not accurate: they also colour the live strip bars + labels, the gate/finish clock flash, the timing tower (times, PB ●, purple ceremony row), the self-racing ghost dots on the map, and the sector map spans (toggle ON). All are tier uses; none is a non-tier element.
5. Day race.card (#F5F1E6) purple 2.82:1 is untested and right at the floor; night card green 2.89:1 is the weakest text pairing in a tested ground.
6. Stale comments listed in §6 (wayMapView 855-864 note now self-contradicting; ridedetail :285 comment; waymapstyle_suite comment).
7. The D-030 palette firewall (wayMapStyle.ts) covers only green/purple hues; the yellow tier is now its own colour (#8C6900, hue ~45) distinct from the brand line, so an ochre/tan basemap feature could now be mistaken for a yellow-tier span. Not in scope; flag for the phone check.
