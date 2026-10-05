# virgin-cycle22 — eight briefs planned 2026-10-05 (items 1-3, 5-7 + SECTORS/ON THIS WAY colours + live/DEMO/REPLAY flash); item 4 no change

Source: Nathan, 2026-10-04/05. Haiku digests D1-D7 were written 2026-10-04/05 (unverified by Inspect); the Plan tier (Fable)
re-verified every anchor it used against the tree on 2026-10-05 and wrote briefs 01-03 (§ Briefs below). **Nothing is executed
yet**; nothing is on the phone until the briefs are executed, Opus-inspected and published (COMMANDS.md).

## Items (each digest = one future brief)
| # | Item | Digest | Brief | Note |
|---|------|--------|-------|------|
| 1 | ACTIVITIES ride-detail map overlay wrong on a self-overlapping route (roundabout x2, 100 m retraced); ROUTES tab fine | D6, D1 (CORRECTION section; its hypothesis 6 is superseded), D4, D5 | 01 | EXPLAINED in D6: ACTIVITIES draws the cleaned reference AND the raw ridden trail, both yellow; they part at bends/roundabout. Needs a design decision (options A-D in D6). |
| 2 | Live gate flash: timer should flash only the sector time in tier colour, no box, no sector label | D2 | — (02 removes the glyph only) | purple is a filled box, green outlined, yellow text-only (chips.tsx:38 chipColors). Digest says the sector-colours toggle does not affect it; Nathan sees differences between toggle states, so verify |
| 3 | Sector strip ‖ glyph | D3 | 02 | answered: marks a sector with >= 1.0 s stopped time (flag 'interrupted'). Decision for Nathan: keep, restyle, or explain in UI |
| 4 | Live trace vs saved line: no gap handling, no accuracy/outlier filter on live trail, 5-fix smoothing independent of speed | D4, D5 | none (no change) | product decision: how far to support vehicles faster than a bike |
| 5 | Retire the PNG fallback map rung entirely (empty basemap + local layers when offline, like Google Maps / Waze) | I5, D9 | **05** | Nathan 2026-10-05 22:50. Open design questions in I5 (style-load failure behaviour, bundled PNG fate, credits, strings). |
| 6 | Merge the map's FIT and ME buttons into ONE toggle that shows the action the next tap performs (saves 35 pt of bar height) | D10 | **06** | Nathan 2026-10-05 22:58. Spec fixed in the section below. |
| 7 | Keep the screen on (no dimming/lock) on the RECORD screen while a ride is running | I7, D11 | **07** | Nathan 2026-10-05 23:07, from tester feedback. Needs a native module -> new build, not OTA. |

## File naming in this folder
- Layout: the main folder holds only README, rules, COMMANDS and the BRIEFS (`NN-name.md`). All digests (`D…`) and intake notes (`I…`) live in `digests/`.
- `D<n>-…` = a Haiku DIGEST (factual, line-anchored), numbered in the order written, NOT by item number. Existing: D1-D8 belong to items 1-4 (see the Digest column above).
- `I<item>-…` = an INTAKE note for item <item>: Nathan's decision, facts the coordinator checked, open questions for the Plan tier. Not a digest, not unverified-by-Inspect code analysis.
- Next digests to be written get the next free numbers: item 5 -> D9, item 6 -> D10 (item 7 needs none or D11). Briefs (written by Fable) are `NN-name.md` in the order planned (01-03 already exist; they do NOT map 1:1 to item numbers, e.g. 03 is a tier-text-colour brief). New briefs for items 5-7 take the next free NN.

## Rules
IDEAS.md untouched. Any new rider-facing string -> ui-strings.allow.json entry with reason (CLAUDE.md #9). Plan tier
must be `model: "fable"`; Execute = Sonnet; Inspect = fresh Opus (EXECUTOR-RULES.md / INSPECTOR-RULES.md copied from cycle 21).

## Clarification from Nathan (2026-10-04, item 2)
"Sector time in tier colour on the timer digits" = the SAME 2.5 s replacement behaviour as today: the flash REPLACES the
running timer in its slot (never drawn over the moving digits) with the frozen sector time in the tier colour, then the
running timer returns in its default colour. The only change: no box/outline/fill and no sector label.

## Decision from Nathan (2026-10-04, item 3)
Remove the ‖ "interrupted" glyph from the sector-strip labels (liveView.tsx:172). Keep the underlying `interrupted` flag and
INTERRUPTED_STOP_S in the data/scoring (scoredS()); only the rider-facing glyph goes. Plan tier: check tests + ui-strings.allow.json
for the glyph, and whether any other screen shows it.

## Data for item 1 (Nathan, 2026-10-04)
Useful inputs: (a) screenshots of the SAME ride on ACTIVITIES and on ROUTES at the same zoom; (b) "Export app" JSON from settings
(catalog + reference lines only, no rides; app/src/ui/settings.tsx:262); (c) the ride's GPX+ (already in data/activities/TEST in virgin-app rides/).

## Decision from Nathan (2026-10-04 21:42)
Wait for Fable to plan; keep the digests as they are for now (no Opus planning).

## Decisions from Nathan (2026-10-05) — for the Plan tier
1. **Item 1: ONE yellow line on ACTIVITIES ride detail = the reference** (sector colours, gates and ROUTES all live on it). No second ridden-trail line. Caveat taken by coordinator: a ride with NO reference (free ride / unmatched / interrupted ride saved as free, virgin-cycle21 04) has nothing else to show, so it keeps the ridden trail. Plan tier: confirm this against code and name every layer touched.
2. **Item 2: investigate properly.** Nathan CONFIRMED on 2026-10-05 that the live gate flash looks different between sectorColours toggle states, contradicting digest D2. Haiku digest D7 re-investigates; the Plan must resolve the contradiction before designing the flash change (target: sector time only, tier colour, no box, no sector label).
3. **Item 3: REMOVE the sector-strip ‖ pause glyph** (rider should not be concerned with it; no purpose). ALSO remove the "GPS live" label from the race (RECORD live) screen. Both are rider-facing string removals: update app/tests/ui-strings.allow.json (entries must go with the code, CLAUDE.md rule 9). Keep `interrupted` flag in core/timing untouched unless something else reads it (core is parity-proven; do not edit core/).
4. **Item 4: NO change for now.** Nathan finds the bus reference line smooth on the ROUTES tab; no gap handling / outlier filter / speed-aware smoothing this cycle. Revisit only if a real ride shows a problem.

## Decision from Nathan (2026-10-05 22:50) — item 5
Added to this cycle: retire the PNG fallback rung of the route map entirely. Context, verified facts and the open questions for the Plan tier are in
digests/I5-png-fallback-retire-intake.md. Nothing is digested, planned or executed yet; same flow as the other items (Haiku digest -> Fable plan -> Sonnet execute -> Opus inspect).

## Decision from Nathan (2026-10-05 22:58) — item 6: single FIT/ME toggle
Nathan agreed with every risk point below; they are part of the spec, not open questions. Code today (app/src/ui/wayMapView.tsx ~897-932, MapLibre rung zoom bar):
separate FIT button (`setMode('fit')`) and ME button (`setMode('follow')`, only when `showRider`); `+`/`−` call `setMode('follow')`; a drag/pinch calls `setMode('free')`.
1. **ONE button replaces FIT + ME, labelled with the ACTION the next tap performs, never the current state.** Mode `follow` -> label "FIT" (tap -> `setMode('fit')`).
   Mode `fit` OR `free` (after a manual pan/pinch/rotate) -> label "ME" (tap -> `setMode('follow')`).
2. `+` and `−` still set `follow`, so right after a zoom tap the label becomes "FIT". Intended.
3. **Browse surfaces (no rider, `showRider` false): keep a plain FIT button, no toggle** (there is no ME to toggle to). Net saving only applies on live surfaces.
4. **Race (moving/stopped) is the risk case:** a label that changes under a moving thumb. Do not weaken the rule; the Plan must name the behaviour with no GPS fix yet
   (ME with no fix) and the course-up/bearing interaction, and the acceptance check includes a real ride on the phone, not only headless tests.
5. No new rider-facing strings expected: "FIT" and "ME" already exist in app/tests/ui-strings.allow.json; Plan confirms the entries stay valid and that
   `accessibilityLabel`s (if any) are updated. Leave the compass `↑` button and its `rotateEnabled` rule untouched.
6. PNG rung: it has its own FIT button; item 5 retires that rung, so item 6 targets the MapLibre rung only (sequence with item 5 in the Plan, don't edit the PNG bar).
7. Nathan-visible check: screenshot/preview of the bar in all three states (follow, fit, free) before it is called done (CLAUDE.md rule 3).

## Status per item (Plan tier, 2026-10-05)
| # | Item | Status |
|---|------|--------|
| 1 | ACTIVITIES doubled yellow line | **PLANNED -> brief 01.** D6 confirmed in code: the route card draws the reference (`route` layer) AND the ridden trail (`trail` layer, same style). Brief 01 drops the trail on the route card only. |
| 2 | Live gate flash redesign (sector time only, tier colour, no box, no label) | **RESOLVED -> PLANNED -> briefs 04 + 08.** D8 (Opus, 2026-10-05): no code path from the toggle to the flash; what Nathan saw (bare yellow time / filled purple box / green outline + `S#`) is the per-tier chip grammar of `chipColors` + the label row. Nathan 2026-10-05: "it lacked consistency, that's the fix i want; encode proper behavior and i will run a proper test with immediate note taking." Brief 04: the flash = the clock digits in the tier TEXT colour (brief 03 helper), no box/label/delta/PB dot, same for every tier, both themes, toggle-independent (pinned by a test); Nathan 23:41: the FINISH flashes only the lap time the same way, then the clock runs again (lap chip + rank chip removed). Brief 08: DEMO and REPLAY flash too (they never did, D8). Brief 02 only removes the ‖ glyph from the flash label. |
| 3 | Sector ‖ pause glyph + "GPS live" | **PLANNED -> brief 02.** Glyph removed from the live strip, the flash and the post-race SECTORS list; "GPS live" removed (allow-list entry goes with it); `interrupted` flag/scoring untouched. |
| 4 | Live trace vs saved line (gap handling, outlier filter, speed-aware smoothing) | **NO CHANGE** (Nathan 2026-10-05). Revisit only if a real ride shows a problem. |
| 5 | Retire the PNG fallback map rung | **PLANNED -> brief 05** (Fable, 2026-10-05). MapLibre is the only rung; style-load failure falls back to a bundled background-only style so route/gates/trail/rider still draw (Google Maps / Waze offline look); `map unavailable` badge when the native module is missing; Esri/HERE/Garmin credit goes; PNG files/metro redirect untouched (follow-up). OTA-safe. |
| 6 | FIT + ME -> one action-labelled toggle | **PLANNED -> brief 06** (after 05). Pure `fitMeNextMode` rule in wayMapGeo.ts; label follows `mode` only (not the GPS fix); browse keeps plain FIT; HTML mock + phone check. No new string. OTA-safe. |
| 7 | Keep the screen on while a ride runs | **PLANNED -> brief 07**. Effect on `phase === 'running'` (red light included) in RecordScreen; RecordScreen unmounts on every tab change (App.tsx), so release is guaranteed. **Finding:** `expo-keep-awake` 56.0.3 is already installed (dependency of `expo`) and already autolinked into build 8 -> expected OTA-safe, NOT a new build; Nathan's `publish-preview.ps1 -DryRun` fingerprint check is the proof, build8.ps1 the fallback. No settings switch this cycle. |
| new | SECTORS / ON THIS WAY tier text colours (purple unreadable in dark mode; day mode yellow/green unreadable) | **PLANNED -> brief 03.** One shared `tierTextColour` helper; contrast computed for both themes (table in the brief). |

## Briefs
| # | file | what | files (main) | OTA? |
|---|------|------|--------------|------|
| 01 | `01-activities-single-reference-line.md` | ACTIVITIES route card: one yellow line = the reference; no-reference cards keep the ridden trail; fixes read skipped for route rides | `ui/RideDetailScreen.tsx`, `tests/recordflow_suite.ts` | JS only |
| 02 | `02-remove-pause-glyph-and-gps-live.md` | remove ‖ (strip, flash, SECTORS list) and "GPS live"; `glyph` prop removed; allow-list entry removed; flag + scoring untouched | `ui/liveView.tsx`, `ui/chips.tsx` (glyph only), `ui/rideHistoryModel.ts`, `ui/RecordScreen.tsx`, `ui/preview/PreviewScreen.tsx` (1 line), `tests/ui-strings.allow.json`, `tests/recordflow_suite.ts`, `tests/ridehistory_suite.ts` | JS only |
| 03 | `03-tier-text-colour-consistency.md` | shared theme-aware `tierTextColour` for the big lap, SECTORS times (label white, time coloured) and the ON THIS WAY today row (= this ride's lap tier); WCAG-checked in both themes | `ui/tierColour.ts`, `ui/RideDetailScreen.tsx`, `tests/ridedetail_suite.ts`, `tests/recordflow_suite.ts` | JS only |
| 04 | `04-live-flash-time-only.md` | item 2: live gate flash AND finish flash = time only in the clock's typography, coloured by `tierTextColour`; `LiveBigChip`/`LiveLapChip`/`PosChip` + models removed (-> `LiveFlash`/`FlashModel { tier, time }`); the pane owns the 1.1 s handover (`LAP_HANDOVER_MS`), lap flash 2.5 s then the clock runs again; `showLap` removed everywhere; toggle-independence pinned; chips.tsx "LAP" allow-list entry removed | `ui/liveView.tsx`, `ui/chips.tsx`, `ui/RecordScreen.tsx` (3 deletions), `ui/DemoScreen.tsx` + `ui/ReplayScreen.tsx` (1 token each), `ui/demoModel.ts` + `ui/replayModel.ts` (lap `delta` dropped), `ui/preview/PreviewScreen.tsx` (2 literals), `tests/ui-strings.allow.json` (-1), `tests/recordflow_suite.ts`, `tests/ridedetail_suite.ts`, `tests/replay_suite.ts` | JS only |
| 05 | `05-retire-png-fallback-rung.md` | PNG rung retired; offline = `offlineMapStyle` background + local layers; `map unavailable` when no native module; style fetch retries 5/15/45 s; Esri credit removed; 3 allow-list entries out (legacyCount 32), 1 in | `ui/wayMapView.tsx`, `ui/wayMapStyle.ts`, `ui/mapCreditModel.ts`, `tests/waymap_suite.ts`, `tests/waymapstyle_suite.ts`, `tests/mapcredit_suite.ts`, `tests/virginmanifest_suite.ts`, `tests/ui-strings.allow.json` | JS only |
| 06 | `06-fit-me-single-toggle.md` | one FIT/ME toggle (label = next action) on the MapLibre bar; `fitMeNextMode` pure rule; browse = plain FIT; `06-fit-me-preview.html` mock | `ui/wayMapGeo.ts`, `ui/wayMapView.tsx`, `tests/waymapgeo_suite.ts`, `tests/waymap_suite.ts` | JS only (after 05) |
| 07 | `07-keep-screen-awake-while-riding.md` | screen on while `phase === 'running'` on RECORD (expo-keep-awake, effect + cleanup); dependency declared in package.json/lock root; COMMANDS.md § 3 | `ui/RecordScreen.tsx`, `package.json`, `package-lock.json`, `tests/recordflow_suite.ts`, `COMMANDS.md` | expected OTA-safe (module already in build 8) — dry-run fingerprint check decides |
| 08 | `08-demo-and-replay-flash.md` | DEMO + REPLAY flash like the real ride through the same `FlashModel`: sector flash per crossed gate (demo: fixed script + `demoTier`; replay: the ride's own `sectorRows`), lap flash in the REAL lap tier (R5 neutral retired), then the clock; `DEMO_ROLL_OUT_S` 60 -> 125; demo clock mechanism unchanged | `ui/demoModel.ts`, `ui/DemoScreen.tsx` (comments), `ui/replayModel.ts`, `ui/ReplayScreen.tsx`, `tests/demo_suite.ts`, `tests/replay_suite.ts`, `tests/recordflow_suite.ts` | JS only |

Run order: **01 -> 02 -> 03 -> 04 (flash) -> 05 -> 06 -> 07 -> 08 (DEMO/REPLAY flash)**, one executor at a
time (01-03 touch `RideDetailScreen.tsx` and `recordflow_suite.ts`; 02, 04 and 07 touch `RecordScreen.tsx`; 06
anchors on the single zoom bar 05 leaves; anchors are by content). 03 is independent of 02's label change.
**04 DEPENDS on 02 (glyph already gone from `LiveBigChip`/`BigChipModel`) and on 03 (`tierTextColour` + the
contrast helpers in `ridedetail_suite.ts`); 08 DEPENDS on 04** — each stops if its dependency is missing.
Expected test counts: baseline 848/845/0/3 (re-measured 2026-10-05 by the Plan tier, tsc exit 0 in ~80 s)
-> 849 after 01 -> 851 after 02 -> 856 after 03 -> **859 after 04** -> 860 after 05 -> 862 after 06 -> 863
after 07 -> **866 after 08** (0 fail, 3 skip throughout; each brief states its own delta relative to what
the executor measures). Each brief has its own failed-before step, verification list and phone-impact
section. All JS only (OTA via COMMANDS.md); 07's `expo-keep-awake` is already in build 8 — its dry-run
fingerprint check decides. No new rider-facing string in any brief; 02 removes one allow-list entry ("GPS
live"), 04 removes one (chips.tsx "LAP", with `LiveLapChip`), 05 removes three and adds one (see 05); 08
touches none.

**Numbering note (flash side, 2026-10-05 ~22:00):** two Plan sessions wrote in parallel. The flash brief
keeps **04** (announced first here); items 5-7 are **05/06/07** (renumbered by the other session, see its
note below); the DEMO/REPLAY flash companion is **08**. A superseded first draft of the flash brief (lap
chip kept) is in `safe_to_delete/04-live-flash-time-only.v1-superseded.md`; a transient `07-live-flash…`
file name no longer exists.

**Flash palette (Nathan 2026-10-05 23:41, answer 3): the planner's default stands** — night purple text
#C364FF, day green #007A00 / yellow #8C6900 / purple #9000C8, neutral = the theme's `accentText` (day
3.13:1 left alone), est/none = `textDim`. Each is ONE constant in `app/src/ui/tierColour.ts`
(`PURPLE_TEXT_NIGHT`, `GREEN_TEXT_DAY`, `YELLOW_TEXT_DAY`) or a theme token; change the line if a colour
displeases on the phone — no further colour work is planned.

## Decision from Nathan (2026-10-05 23:07) — item 7: keep the screen on while riding
Source: tester feedback ("like watching a YouTube video, the screen should not switch off if I don't touch it"). Details in digests/I7-keep-screen-awake-intake.md.
Nathan agreed: ONLY on the RECORD screen, and ONLY while a ride is running. Not on other tabs, not while armed/prestart.

## Briefs written (Fable, 2026-10-05) — items 5-7
| item | brief | one line |
|---|---|---|
| 5 | `05-retire-png-fallback-rung.md` | PNG rung gone; offline = empty basemap (bundled background-only style) + route/gates/trail/rider; `map unavailable` when the native module is missing; Esri/HERE/Garmin credit gone; PNG files + metro redirect left alone (follow-up). |
| 6 | `06-fit-me-single-toggle.md` | ONE FIT/ME button labelled with the next tap's action (`fitMeNextMode`, pure, tested); label never depends on the GPS fix; browse keeps plain FIT; HTML mock for Nathan + real-ride check. |
| 7 | `07-keep-screen-awake-while-riding.md` | `activateKeepAwakeAsync`/`deactivateKeepAwake` in one effect on `phase === 'running'`; RecordScreen unmounts on every tab change, so the cleanup covers every exit; no settings switch, no AppState code. |

**Numbering (final, checked 2026-10-06 after the parallel sessions stopped):** briefs are 01-08, one number each, no duplicates: 01 ACTIVITIES line, 02 pause glyph + GPS live, 03 tier text colour, 04 live/finish flash, **05 retire PNG rung (item 5), 06 FIT/ME toggle (item 6), 07 keep screen awake (item 7)**, 08 DEMO/REPLAY flash. File names, `# NN` titles and `virgin-cycle22 NN` test names all match. (History: items 5-7 were first drafted as 04/05/06, then moved to 05/06/07 when the flash brief kept 04.)

**Execution order:** 01 -> 02 -> 03 -> 04 (flash; depends on 02 + 03) -> **05 -> 06** (06 anchors on the single zoom bar
05 leaves) -> 07 (independent of the map briefs; touches RecordScreen.tsx like 02 and 04, so after them). One executor at
a time. Expected counts: 859 after 04 (per the flash brief) -> 860 after 05 -> 862 after 06 -> 863 after 07 (0 fail,
3 skip throughout); each brief states its own delta (+1, +2, +1) relative to what the executor measures. Then **08** (DEMO/REPLAY flash, depends on 04) -> 866.

**Build vs OTA:** 05 and 06 are JS-only (05 removes three `require()`d PNGs from the JS bundle — assets ship with
the OTA, not the fingerprint). 07 was expected to need a new build, but `expo-keep-awake` 56.0.3 is ALREADY in
node_modules (a dependency of `expo`) and ALREADY autolinked (`expo-modules-autolinking resolve -p android` lists
it among the 26 modules), and `@expo/fingerprint` hashes the autolinked module dirs + package.json scripts, not the
dependency list — so declaring it should not move the fingerprint. **Nathan's `publish-preview.ps1 -DryRun` is the
authoritative check (COMMANDS.md § 3); if it reports drift, build8.ps1 is the fallback.** Until the dry run says
so, do not promise Nathan an OTA.

**Open for the coordinator (not blocking):** (a) STATE.md:85 "Maps:" clause for 05/06 and a RECORD line for 07;
(b) follow-up chore: drop the three PNG rows from `metro.seedRedirect.js`/`seedstubs_suite.ts` and move
`app/assets/ways/*.png` to `safe_to_delete/`; (c) `tests/virginmanifest_suite.ts`'s static guard filters on the old
filename `ui/routeMapView.tsx` and its comment stripper eats the file up to the first inline `{/* */}`, so its
offender check passes vacuously — unrelated to these briefs, worth its own chore; (d) a keep-awake settings switch
only if battery complaints come in.
