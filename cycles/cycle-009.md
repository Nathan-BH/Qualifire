# Cycle 009 — 2026-08-16/17

Trigger: Nathan asked for the team to be run as actual subagents, for build 4 to be prepared to completion, and for IDEAS §27 (beta-tester agents) to be implemented. Four agents ran in parallel: Race Engineer + QA (review), a four-persona Beta Tester panel, Mobile Dev (build 4), and Designer/Data (route-map context layer).

This is the first cycle where the review found more than it built. That is the point of it.

## What the agents delivered

**Route map has context (Designer/Data).** The pre-rendered route was a yellow line on black, unreadable as a map. It now carries ~60 of Nathan's own archived rides underneath it in dim grey, plus the ratified landmarks as rings at their true radii. Honest by construction: everything drawn is real recorded data, there is no street layer offline. Verified in pixels — the street network around work, the long east-west road, the cluster at home.

Two real causes were found, only one of which I had guessed:
- **Not the re-parsing.** The archive spans lat 44.4–50.9, lon 4.36–26.1 (rides across Europe), so out-of-area traces projected *tens of millions* of pixels off-canvas and Pillow rasterised toward them. Fixed with per-segment Liang-Barsky clipping and a bbox relevance filter on `activity-index.csv`.
- **A radius bug of mine:** landmark rings drawn as `radiusM * scale` — metres times pixels-per-radian — a 108-million-pixel ellipse. Now `m * scale / (R·cos lat)`, the exact inverse of `metresPerPixel()` in the TS runtime.

Runtime 4.3 s. `routes.json` byte-identical, so the cross-language pixel test still holds.

**Build 4 ready (Mobile Dev).** `scripts/build4.ps1` — one wrapper doing toolchain, tsc, tests, native-slate, preview-variant, icon and route-asset checks, then the build. ASCII, CRLF, UTF-8 BOM, `Invoke-Native` judging by exit code only. Plus `BUILD-4-RUNBOOK.md` stating what the build changes on the phone and what it does not — the cycle-008 lesson, applied. Verdict: GREEN, no blockers.

**Beta-tester panel exists (IDEAS §27).** `process/BETA-TESTERS.md`: four personas, how the panel is re-run cheaply each cycle, and the standard it is judged by — does it surface something a normal cycle would not. It did.

## Findings — and every one of them is a real defect

Merged from the Race Engineer/QA review and the beta panel, ranked by harm:

1. **`fmt()` printed impossible times** — minutes split before rounding, so 599.7 s rendered "9:60" and 69.7 s "1:010", on ~15 numbers per Result screen. **FIXED**, with a regression test over every seed value at both precisions.
2. **The colour window is frozen.** `colourModel.ts` reads the whole of `results.seed.json` and never calls `windowByDays`/`windowLastN`. Nathan's own recorded rides never enter it, so Monday's PB does not raise the purple bar and Tuesday can be slower and purple again.
3. **Double buzz, and the toggle cannot stop it.** The location layer vibrates unconditionally at every gate fire; RecordScreen adds a second buzz gated on the setting. Haptics are the only working feedback channel and it is wrong in both switch positions.
4. **Two screens disagree about D-028.** Result ranks estimated laps that the live screen correctly refuses.
5. **`ghostsFor` bypasses `ranks()`** — it filters on `movingS !== null` only, ignoring `lap.quality` and `tripwireDemoted`, so the first demoted seed silently enters the purple bar and the position field. Zero demoted seeds today, which is why tests pass.
6. **Interrupted sectors pollute the mean.** `sectorValues` admits them: EveningA S1 has best 174.9 s against mean 226.7 s, so a sector 26% off the best reads GREEN.
7. **Position chip has no noise floor** — `tierFor` needs 5 rides, the chip needs 1, so a single ghost yields "P1".
8. **Raw ranked against moving.** `towerSource` and the lap chip both use `movingS ?? rawS`, so a stopped-time-inflated lap gets a real rank and colour.
9. **Start flow is inert** — `from`/`to` are read by nothing, "DETECTED START" is hardcoded `home`, the ghost count is always Morning's.
10. **`lastRide` is volatile** — one in-memory variable, and `rememberRide` early-returns on an aborted ride *without clearing*, so a stale ride keeps the caption "the ride you just finished".
11. **Record-keeping drift** — D-030 exists only in `cycles/cycle-008.md`; `DECISIONS.md` ends at D-029 and `STATE.md` still says the colour model is unratified.

## Note on the panel's value

Two of the findings above (3 and 10) came only from walking the app as a user; four (2, 5, 6, 8) came only from reading the timing path. Neither review would have found the other's. That is the argument for keeping both, and for keeping them cheap.

---

## Fixes — all eleven closed

| # | Defect | Fix |
|---|---|---|
| 1 | `fmt()` printed "9:60" / "1:010" | Round before splitting minutes, as `fmtSec` already did. Regression test over every seed value at both precisions. |
| 2 | Colour window frozen | `ghostsFor` now merges archive ghosts with rides recorded this session, orders them, keeps the last **N=10**. A personal best now raises the purple bar. |
| 3 | Double buzz, toggle powerless | ONE buzzer, in `src/location/index.ts` — it sees every gate fire even with the screen off. `setEarconsEnabled()` is pushed from Settings; RecordScreen's duplicate is deleted. |
| 4 | Result ranked estimated laps | Both screens now obey D-028: an estimated lap shows "NO TIME", and the tower is hidden rather than ranking it. |
| 5 | `ghostsFor` bypassed `ranks()` | It calls the store's own `ranks()`, so quality and `tripwireDemoted` are honoured — one history, one filter. |
| 6 | Interrupted sectors polluted the mean | `sectorValues` is CLEAN ONLY. Interrupted laps still rank; they no longer define what "average" means. |
| 7 | Chip had no noise floor | `MIN_HISTORY = 5` is shared by `tierFor` and the position chip. Below it: no colour, no rank. |
| 8 | Raw ranked against moving | Both the chip and the lap use moving time or nothing. No `movingS ?? rawS` fallback anywhere a comparison happens. |
| 9 | Start flow inert and untrue | DETECTED START comes from the last GPS fix through `landmarkAt()` and says so when it cannot detect; the ghost count follows the SELECTED pair via the catalog's ways, not always Morning. |
| 10 | `lastRide` stale on abort | An aborted ride clears it. Finished rides also join the comparison window — but only with a real moving time. |
| 11 | D-030 undocumented | Written into `product/DECISIONS.md` as a full decision superseding D-007/D-008's tiers; `STATE.md` header updated. |

**Also this pass:** the position chip now reads "P4 of 10" — a position without its field size is half a fact. The demo dot follows the **real ridden line** (`positionAtTime` walks the route polyline by arc length) instead of cutting straight between gates; the assets gained a decimated `path` and `gateIdx` for it, leaving the transform and gate pixels byte-identical.

**Tests: 94, 91 pass / 0 fail / 3 skip.** `tsc` clean.

## Process

`process/CONVENTIONS.md` gains a standing rule: the mockup is regenerated in the same pass as any shipped design change. Cycle 009 applied it — six-tab scrolling footer, demo tab reduced to one ride, colour-model row replaced by a statement of D-030.
