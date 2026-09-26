# virgin-cycle14 — all 8 briefs landed (2026-09-26)

Nathan fed ideas one at a time in chat; each became a brief file in this folder
(`NN-short-name.md`). All eight are now implemented, verified by test suite + `tsc` after
every brief and by one fresh-context Opus Inspect pass at the end. Nothing has been checked
on a phone yet — see "On-device, still needed" below.

## Brief index

| # | file | idea | source | status |
| --- | --- | --- | --- | --- |
| 01 | `01-auto-day-night-theme.md` | Settings option: day interval (e.g. 09:00-19:00), app auto-switches day/night theme | testuser LBH | **landed** |
| 02 | `02-post-ride-replay.md` | Post-ride live replay of any recorded ride (DEMO-style race view), default 10x speed | testuser LBH | **landed** |
| 03 | `03-settings-group-order-and-naming.md` | SPORTS group moves to 2nd place under APPEARANCE; "ON THE BIKE" renamed WHILE RECORDING | Nathan (tester feedback) | **landed** |
| 04 | `04-settings-cleanups-luck-reset-reflines.md` | Remove "luck factor" setting; "Reset to virgin" -> "Reset app"; "reference lines" -> "reference rides" | Nathan (tester feedback) | **landed** |
| 05 | `05-map-credits-info-button.md` | Fold OpenFreeMap credits into a small "i" button in a map corner | Nathan (tester feedback) | **landed** |
| 06 | `06-demo-tab-text-cleanup.md` | DEMO tab: drop ride-type subtext; new "not part of the final app" caveat line | Nathan (tester feedback) | **landed** |
| 07 | `07-record-button-slogan.md` | RECORD button: "arms the ride..." -> "same ride · new meaning" | Nathan (tester feedback) | **landed** |
| 08 | `08-demo-results-scatterplot.md` | Show the RESULTS scatterplot at the end of each DEMO ride type | Nathan (tester feedback) | **landed** |

## How it was run (coordinator's plan, token-efficient per Nathan's ask)

Order followed this folder's own "Suggested execution order" note, confirmed by a Haiku
Digest pass over all 8 briefs first:

1. **Chores, done directly by the coordinator (no subagent — each was a handful of
   mechanical, self-contained text/line edits with exact anchors already given):**
   03 (settings reorder + rename) → 07 (RECORD slogan) → 06 (DEMO text cleanup).
2. **Sonnet Execute batch A:** 04 then 01, both on `settings.tsx` (04 landed after 03 for
   the same anchor-safety reason the brief itself states).
3. **Sonnet Execute batch B:** 05 then 02 (map credits before replay, so replay's map
   inherits the new "i" button).
4. **Sonnet Execute batch C:** 08 (after chore 06, which it depends on).
5. **One fresh-context Opus Inspect pass** over the whole cumulative diff, instead of one
   per brief — each Execute batch already reran the affected brief's own test+tsc
   verification as it went, so the marginal safety of inspecting after every single brief
   was judged not worth the extra token cost; Opus still independently reran everything
   from scratch rather than trusting any executor's report.

Executor batches ran strictly in sequence, not in parallel, because four of the eight
briefs (01, 02, 05, 08) each append a new test-suite import to the shared `app/tests/run.ts`
— running them concurrently would have risked one batch's append clobbering another's.

## Test counts, brief by brief (cumulative)

| stage | tests | pass | fail | skip |
| --- | --- | --- | --- | --- |
| baseline (before this cycle) | 638 | 635 | 0 | 3 |
| after chores 03+07+06 | 638 | 635 | 0 | 3 |
| after batch A (04, 01) | 647 | 644 | 0 | 3 |
| after batch B (05, 02) | 667 | 664 | 0 | 3 |
| after batch C (08) | 676 | 673 | 0 | 3 |
| Opus Inspect's own independent rerun | 676 | 673 | 0 | 3 |

`tsc --noEmit` was clean (exit 0) after every single stage above, independently confirmed
again by Inspect.

## Inspect verdict: PASS with notes — no blocking defects

Full fresh-context Opus pass re-read all 8 briefs, re-ran every brief's own verification
block, read the actual landed logic (not just the tests), and specifically re-checked three
items the executors themselves flagged as non-blocking judgment calls:

1. **Brief 04's "reference line" → "reference rides" rename is incomplete by design, not
   by accident.** Three user-facing strings still say "reference line":
   `RideDetailScreen.tsx:407` (an Alert) and `catalogDeleteActions.ts:65,79`. Inspect
   confirmed "line" is actually the more correct word in all three (renaming to "ride"
   would make a delete-confirmation alert self-contradictory). Brief 04's stated goal ("no
   user-visible text says reference line") isn't fully met — **Nathan's call** whether to
   reword these three, and to what.
2. **Brief 02's dropped `settings.timing` dependency is correct.** `Settings.timing` no
   longer exists (retired by brief 04, which ran just before/alongside this); the effect
   never read it; no stale-closure risk. Confirmed on all three points Inspect checked.
3. **Brief 08's test assertion `'faster'` (not `'green'`) is correct**, verified directly
   against `resultsPlotModel.ts`'s actual `PointTone` type — the brief's own test spec had
   a wording slip (green is a display colour, not a tone value).

Minor items found, none blocking, all left as-is (see Inspect's full report if needed):
- Brief 01's on-device checklist step 6 had a wrong expected result (corrected in the brief
  file directly, 2026-09-26 — see that file).
- Replay's rider dot freezes ~0.5 real-seconds (at 10×) before the replay auto-pauses, from
  the brief's own two constants (`REPLAY_ROLL_OUT_S` vs `REPLAY_EDGE_PAD_MS`) — cosmetic.
- Replay's "no replay available" message names one specific cause but fires for a couple of
  others too (missing ride file, unknown way) — the message can name the wrong reason.
- A few nitpicks: an unused `toggleMode` import in `settings.tsx`; replay's speed pill reads
  `10x` (ASCII) where the brief's own text used `×`; RESTART renders as a second full-width
  button rather than the small pill the brief describes; two other checklist files still
  said "Reset to virgin" / "Luck factor" post-rename (corrected directly, 2026-09-26, in
  `03-...md`, `07-...md`, `08-...md`).
- Inspect also noticed **unrelated, unrouted-through-this-session uncommitted changes** under
  `marketing/cycles/21_*` and `marketing/silent-studio/teaser-full/*` (a separate marketing
  session's work, mid-cycle). Not part of this cycle — left untouched, not committed by this
  cycle's commit, flagged here so it isn't mistaken for cycle14 scope.

## On-device, still needed (Nathan, after the next OTA publish)

Nothing above has been seen on a phone. Each brief's own "On-device checklist" section is
the authoritative per-feature list; in short: auto day/night schedule across a real
boundary (brief 01), the replay screen end-to-end especially on a small phone at 10×/25×
(brief 02), the SETTINGS reorder/rename (brief 03), the removed Luck-factor row + renamed
Reset/reference-rides copy (brief 04), the map "i" button in both themes on every map
surface (brief 05), the DEMO idle screen's new caveat line (brief 06), the RECORD button's
new slogan (brief 07), and the DEMO scatterplot in FIRST/SECOND/TENTH mode (brief 08).

## Ships as

JS-only across all 8 briefs — no new native dependency, no `app.json`/`eas.json` change —
so this whole cycle ships to the Preview APK via `scripts/publish-preview.cmd` (EAS Update),
no numbered build, no reinstall.
