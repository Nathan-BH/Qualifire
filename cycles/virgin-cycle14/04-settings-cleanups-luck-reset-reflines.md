# 04 — SETTINGS: drop "Luck factor", rename "Reset to virgin" → "Reset app", "Reference lines" → "Reference rides"

**Source: Nathan, ideas #5 + #6 + #7 (tester feedback; tester not named).** #5: remove the
"luck factor" setting (no implementation idea for it yet). #6: "Reset to virgin" → "Reset app"
('virgin' was only the internal name of the clean build; confusing to users). #7: in DATA,
"reference lines" should maybe read "reference rides".

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (settings.tsx at 667 lines, pre-01/03).
Executor: Sonnet, cold, this file only. Small task: one row + one field removed, ~12 strings.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor below was read from the tree on 2026-09-26. If a quoted
  line is not where the brief says (allow line drift if briefs 01/03 ran first — see the last
  section — but the quoted text must match exactly), **stop and report the mismatch verbatim**
  (file, line, expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete files — `safe_to_delete/`.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `Nathan/`,
  or any `cycles/virgin-cycle1..13/` doc. `GLOSSARY.md` has no standing owner and IS edited here (change A9).

## Goal

SETTINGS → SCORING shows only "Rankings"; scoring is raw wall-clock for everyone, with no
user-facing switch. SETTINGS → DATA reads "Places & routes", "Reference rides", "Reset app"; no
user-visible text says "virgin" or "reference line" anywhere in the app.

## Context (what the code actually does today)

**#5 "Luck factor" is not a dead setting.** It is the raw/moving *timing mode* switch, relabelled
in virgin-cycle7 (`9900e92`, STATE.md cycle-7 line, GLOSSARY.md:90-94). `settings.tsx:595-599`:
`<Row label="Luck factor" …>` with `Seg` options `[['raw', 'luck'], ['moving', 'off']]` writing
`Settings.timing: TimingMode` (interface line 47, `DEFAULTS.timing: DEFAULT_TIMING` line 65,
`DEFAULT_TIMING = 'raw'`). Consumers: `SettingsProvider` pushes it into `store/timing.ts`'s
module register (`setTimingMode(s.timing)`, line 96); every verdict (tier colours, ranks, tower,
PB, printed times, self-dot purple) reads that register through `scoredS()` — 14 modules under
`app/src`. Three screens list the field as a memo dependency so verdicts recompute on a flip:
`RecordScreen.tsx:891,920`, `RidesScreen.tsx:168`, `RideDetailScreen.tsx:198`. Nothing else
in `app/` is named luck/chance/variance/handicap (grep -i: only `timing.ts:4` and
`selfrace_suite.ts:467` prose). **Neutral behaviour after removal:** the register stays at
`DEFAULT_TIMING` (`'raw'`), i.e. the STATE.md ground rule "raw wall-clock, luck counts" —
identical to today's default. `store/timing.ts`, `scoredS()`, both stored clocks (`rawS`/`movingS`,
`store/derive.ts`) and `tests/timing_suite.ts` (drives `setTimingMode` directly) all stay:
moving-time becomes code-only, not deleted, so the idea can come back. Persisted `settings.json`
files still carrying `"timing"` are scrubbed on load, following the `delete … redLight`
precedent at line 102. No test asserts any settings label (`grep -rn "Luck factor\|Reset to
virgin\|Reference lines" app/tests` → nothing).

**#6 "virgin" in user-visible copy — exactly four places**, all `settings.tsx`: row label 635,
alert title 301, the sports-file warning 517, plus the row's own `sep` doc comment 170
(internal, leave). Everything else matching `virgin` under `app/src`/`app/tests` is comments,
identifiers or test names — untouched. **Reset behaviour, per code (`performReset`, 253-277):**
reads `<documents>/qualifire/settings.json` (the THEME file, `themeContext.tsx:14`) → moves the
whole storage root `<documents>/qualifire/` to `qualifire.reset-<stamp>` → writes the theme
file back → re-inits sports, catalog, refs, ride history, free rides against the empty root.
The app `Settings` object lives at `<documents>/settings.json` (line 76), outside the root, so
it is never moved. So the copy "Your settings and theme stay" (302) is **accurate in code**;
brief 01's out-of-scope observation ("theme mode does not actually survive a reset") missed the
read-back at 257/261 — report-only, no copy change needed for that. What the copy does omit:
`sports.json` is under the root too (`sports.ts:41`), so **sports are reset as well** — the row
hint (636) and alert body (302) never say so; fixed below.

**#7 vocabulary.** The rider-facing name for the concept is **"reference ride"**: GLOSSARY.md:65
defines it ("The ride a way's official line and gates are built from"), `CatalogDetailScreen.tsx:332,336`
prints "reference ride", `RideDetailScreen.tsx:260,399,577` and `routeNamingCard.tsx:93-101`
say "reference" / "this ride becomes its reference". "reference line" survives in user copy
only at `settings.tsx:619-620` and `GateAdjustScreen.tsx:62,105`. `refs.user.json` (`USER_REFS_FILE`,
`live/userRefs.ts:31`) holds the *lines* derived from reference rides, so the new hint keeps
that honest. Default taken (Nathan said "maybe"): rename — the app already says "reference ride"
everywhere the rider meets the idea, and "line" is an internal term.

## Changes

### A. `app/src/ui/settings.tsx` (all anchors pre-01/03; match on text)

A1. Line 25, exactly `import { DEFAULT_TIMING, setTimingMode, type TimingMode } from '../store/timing';`
→ remove the line (no remaining user after A2-A4).

A2. Lines 44-47 (doc comment starting `  /** Which clock scores a ride (STATE.md ground rule): 'raw' = wall clock,`
through `  timing: TimingMode;`) → remove all four.

A3. Line 65, exactly `  timing: DEFAULT_TIMING,` → remove.

A4. Lines 92-97: the four-line comment starting `  // Sync, not an effect: RecordScreen/RidesScreen/RideDetailScreen memoise`,
the call `  setTimingMode(s.timing);` and the blank line 97 → remove all six (line 91 stays blank).

A5. Line 102, exactly `        delete (saved as Record<string, unknown>).redLight; // virgin-cycle7: setting retired; scrub old files`
→ keep, and insert directly after it:
`        delete (saved as Record<string, unknown>).timing; // virgin-cycle14 #5: "Luck factor" row retired; scoring is raw-only, scrub old files`

A6. Lines 592-600: from `            virgin-cycle7 (Nathan, QUESTIONS.md Q2): row relabelled "Luck factor" —`
through the row's closing `        </Row>` (the one right before `        <Row label="Rankings"`) → replace with one comment line
so the Cycle-024 comment (588-591) closes cleanly:
`            virgin-cycle14 #5 (Nathan): the "Luck factor" raw/moving row that sat above this one is gone — scoring is raw wall-clock only; store/timing.ts's register stays at DEFAULT_TIMING. */}`
Line 591 must end `unchanged).` before this line, exactly as today. SCORING then holds "Rankings" alone.

A7. Reset copy (#6):
- 301 `    'Reset to virgin?',` → `    'Reset app?',`
- 302: replace ` and every result will be moved out of the app.` with `, every sport and every result will be moved out of the app.` (rest of the template literal unchanged).
- 276 `This build is back at its first launch. Close Qualifire fully and reopen it` → `Qualifire is back at its first launch. Close it fully and reopen it` (rest unchanged).
- 517 `Reset to virgin or fix the file (debug export) to recover.` → `Reset the app (DATA → Reset app) or fix the file (debug export) to recover.`
- 635 `label="Reset to virgin"` → `label="Reset app"`.
- 636 hint → `hint="Moves every ride, result, sport, place, route and way aside and starts the app over from its first launch. Settings and theme are kept."`
Both alerts' second step (`'Really reset?'` / `'This cannot be undone from inside the app.'`), `'Reset done'`, `'Reset failed'` and the moved-aside messages stay as they are — none says "virgin" and all match the code.

A8. Reference rides (#7): 619 `label="Reference lines"` → `label="Reference rides"`;
620 hint → `hint="Share refs.user.json — the line of each way, built from its reference ride. Per-ride GPX+ export lives on RIDES."`

A9. `GLOSSARY.md:90-94` (the **Luck factor** entry): replace the five lines with
`**Luck factor (retired virgin-cycle14, Nathan #5).** Was SETTINGS → SCORING's raw/moving switch (cycle7 rename of "Timing"). Gone from the screen: every score is raw wall-clock time from gate to gate — a stop is your luck, same as a real race. Moving time is still computed and stored (`movingS`) but nothing user-facing reads it; `store/timing.ts`'s register stays at `raw`.`

### B. Other files

B1. `app/src/ui/RecordScreen.tsx:891` `    [live.sectors, live.track, settings.sectorColours, settings.timing],` → drop `, settings.timing`.
Lines 917-919 (comment `    // settings.timing: same reason sectorColours above depends on it — a` … `(R7); the loader's cache re-reads lapS, so this re-run is cheap.`) → remove;
920 `  }, [live.track, live.mode, settings.selfDots, settings.timing]);` → drop `, settings.timing`.

B2. `app/src/ui/RideDetailScreen.tsx:198` `    [request.rideId, request.startedAtMs, tick, s.timing],` → drop `, s.timing`. `s` is still used (444, 445, 469) — keep line 127.

B3. `app/src/ui/RidesScreen.tsx:168` `    [rides, resultsTick, s.timing, pickLabels],` → drop `s.timing, `. `s` then has no other use: remove line 30 `  const { s } = useSettings();` and line 23 `import { useSettings } from './settings';` (only occurrence).

B4. `app/src/ui/GateAdjustScreen.tsx:62` `The reference line and ride recordings are kept.` → `The reference ride and all ride recordings are kept.`;
105 `it has no reference line or gate set on file.` → `it has no reference ride or gate set on file.`

B5. `app/src/store/timing.ts:7-8` comment `ONE module-level register, set by SettingsProvider (ui/settings.tsx) the` / `same way setEarconsEnabled() is, read by every verdict through scoredS():`
→ `ONE module-level register — since virgin-cycle14 (#5) nothing in the app sets it (the` / `SETTINGS row is gone; tests do), read by every verdict through scoredS():`. Comment only.

## Verification (executor runs all; report the actual numbers)

```
cd app && grep -rn "Luck factor\|'luck'\|settings\.timing\|s\.timing\|setTimingMode(s\." src App.tsx     # expect: no output
cd app && grep -rn "virgin" src/ui/settings.tsx | grep -v "virgin-cycle"                                   # expect: only the line-170 doc comment
cd app && grep -rn "eference line" src/ui                                                                  # expect: no output
cd app && grep -n "Reset app\|Reference rides\|delete (saved as Record<string, unknown>).timing" src/ui/settings.tsx   # 3 labels/titles + 1 scrub line
cd app && node --experimental-strip-types tests/run.ts      # 0 FAIL
cd app && ./node_modules/.bin/tsc --noEmit                   # clean, exit 0 — the real proof that no `timing` reader survived
GIT_OPTIONAL_LOCKS=0 git diff --stat                          # settings.tsx, RecordScreen.tsx, RideDetailScreen.tsx, RidesScreen.tsx, GateAdjustScreen.tsx, store/timing.ts, GLOSSARY.md
```

Baseline (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip — no test touches these
strings or the provider, so the counts must be unchanged (`timing_suite.ts` keeps passing: it
imports `store/timing.ts` directly). If `tsc` blows the call budget, retry once with a longer
timeout, then report — never substitute a syntax-only check silently.

## On-device checklist (Nathan, after OTA — not the executor)

1. SETTINGS → SCORING shows only "Rankings". DATA shows "Places & routes", "Reference rides", "Reset app" with the "?" hints reading as above.
2. A ride with a stop in it shows the same time/colour on RIDES, ride detail and RESULTS as under the old "luck" default (raw). If your phone had "off" set: times and ranks revert to wall-clock after relaunch — expected.
3. DATA → Reset app: first alert titled "Reset app?", counts + "every sport and every result"; after "Reset", "Reset done" says "Qualifire is back at its first launch". Relaunch: blank RECORD, no sports, **theme still the one you had** (confirms the read-back at 257/261 — the on-device evidence brief 01's observation lacked).
4. ROUTES → a way → edit gates: the confirm reads "The reference ride and all ride recordings are kept."

## Out of scope

- Deleting moving-time computation (`movingS`, `store/timing.ts`, `timing_suite.ts`) — kept on purpose.
- Renaming identifiers, files, tests, comments that say "virgin"/"reference line", branch names, the `virgin` EAS profile, `cycles/…` history.
- `STATE.md` / `OPEN-ITEMS.md` — coordinator's. Recommended lines for the coordinator: STATE.md:243 "moving-time is opt-in via SETTINGS → Timing" → "moving-time has no user switch since virgin-cycle14 (#5); `store/timing.ts` register stays raw"; STATE.md:340-342 cycle-7 note gets "(row removed virgin-cycle14)"; OPEN-ITEMS.md:74 and brief 03's checklist step 1 "Reset to virgin" → "Reset app".
- The alert's "moved out of the app" phrasing (data goes to `<documents>/qualifire.reset-<stamp>`, still app-private) — accurate enough, unchanged.

## Open questions / assumptions (logged, not blocking)

- **#5 is the timing switch, not an unbuilt idea.** Nathan's "no implementation idea yet" may mean he did not recognise the cycle-7 rename. Default: remove the row as asked, keep the mechanism code-only. If he instead wants the switch kept under its old name "Timing" (raw / moving), A1-A6 + B1-B3 + B5 + A9 are dropped and only the label/options at 595-598 change — say so before executing if that is the wish.
- **#7 rename done** (Nathan said "maybe"). GateAdjustScreen's two "reference line" strings (B4) included so the term does not merely move rooms; drop B4 if Nathan wants DATA only.
- Alert/hint now name **sports** as reset — the code has done that since WP-1; treated as a copy correction inside #6's scope.
- Tester not named in the source; recorded as such.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only, no dependency or native change, ships to the
Preview APK via `scripts/publish-preview.cmd` (EAS Update) — no numbered build, no reinstall;
nothing changes until built + published. Removing the setting drops the `timing` key silently
on next load: a phone that had "off" (moving) selected reverts to raw wall-clock scoring with
no notice. Only Nathan's own phone has a build (STATE.md: no tester has received one), stored
results keep both clocks, and raw is the documented default — so this is a visible-but-harmless
change, not data loss.

## Execution order / interaction with briefs 01 and 03 (all three edit `settings.tsx`)

Every anchor in all three briefs is a quoted line: **match on text, never on line numbers.**
Overlaps: 01 adds interface/DEFAULTS/import/load lines near 26, 55, 67, 102 and ~12 lines in
APPEARANCE (552-553) plus a `TimeRow` after 159 (~+40 total); 03 moves `<SportsSection …/>`
above the ON THE BIKE header (renamed WHILE RECORDING) — nothing this brief touches moves
(517 is inside the `SportsSection` *component*, which stays at 331; the SCORING and DATA cards
stay below it either way). This brief removes ~22 lines above 600 and edits DATA/alerts.
**Recommended order: 03 → 04 → 01**, one executor session, each report before Inspect. 03 is
two line moves; 04 is deletions that shrink the file; 01 is the largest, purely additive, and
its anchors (quoted lines at 26/55/67/102/159/552) all survive 03 and 04 — whereas running 01
first shifts every anchor in 03 and 04 by ~+40 and its `delete … redLight` neighbourhood would
then carry two new lines (01's and A5's), both of which anchor on the untouched redLight line,
so either order there is safe as long as the executor anchors on that text. Tell 01's executor
to expect the `timing` field/import already gone and one extra `delete` line after redLight.
