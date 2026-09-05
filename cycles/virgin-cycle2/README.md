# virgin-cycle2 — README (start here, especially in a fresh chat)

**Goal of this cycle:** turn Nathan's testing rounds from 2026-09-03 and 2026-09-04
(`data/activities/TEST in virgin-app rides/qualifire-20260903/` and `-20260904/`) plus a
curated slice of `OPEN-ITEMS.md`'s "Parked" section into a bulk of execution-ready
work-package briefs, so Nathan can pick through them and dispatch Execute passes whenever
he's ready — per his own framing: "Later i can execute all briefs when i have a bulk of
work-packages in the cycle." **Nothing in this cycle has been executed yet** — every WP below
is a brief only, and every one has also been through a fresh-context Inspect pass checking
its claims against the real repo (see each WP's own "Inspect findings" section, appended
2026-09-04). See `CONTEXT.md` for the full framing.

**Note:** a second round of testing notes (`qualifire-20260904-notes.md`) arrived partway
through this cycle being built, and one of the Inspect passes independently surfaced a second
occurrence of WP-B's bug on a route created that same evening. Both are folded in below —
WP-I through WP-L are the 2026-09-04 round; WP-B's brief has an update section flagging the
newer route to use instead of the one that's since been deleted.

## Status at a glance (updated 2026-09-05 — WP-E/F/G/D landed in the first execution session; WP-A/B/I/M landed in the second)

| WP | What | Size | Status | Brief |
|---|---|---|---|---|
| A | RECORD-screen route-match & yellow-trail visibility (2026-09-03 review issues #1+#2, Nathan's exact 3-state spec) | small-medium | **DONE — landed 2026-09-05, commit `064b6e2`.** `?? defaultRouteId()` fallback removed from both map rungs; new `liveMapOverlayFor()` makes the reference line and live trail mutually exclusive by construction. | `WP-A-record-route-match-trail-visibility.md` |
| B | Gate placement scale bug on newly-created routes (2026-09-03 review issue #3) | small-medium | **DONE — landed 2026-09-05, commit `495b3f8`.** Fixes/metadata now derive from chronological (`tUnixMs`) order, not on-disk write order. Part C (prevention) deferred. On-device GPX+ check against WorkHomeWet/281e still needed. | `WP-B-gate-placement-scale-bug.md` |
| C | Raw-time scoring default — implementation half of an already-settled STATE.md rule | medium | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** `rawS` already stored (no schema change); 27 real call sites re-verified across 9 files. Two mechanical tsc-strictness gaps found and documented for Execute to close. Land after WP-E (both touch the same `RecordScreen.tsx` region). | `WP-C-raw-time-scoring-default.md` |
| D | GPS re-acquisition teleport-guard hole (≤245m hops slip through uncounted) | small | **DONE — landed 2026-09-05, commit `2fe0ede`.** Discounts by *cause* (`wasOnRoute`) instead of jump size; `core/src/live.ts` untouched. | `WP-D-gps-teleport-guard-hole.md` |
| E | Retire per-tier gate-tick colour (`gateColours`) — Nathan's "gates should not change colour" rule | chore | **DONE — landed 2026-09-05, commit `d7e925b`.** `gateColours` useMemo + override removed; gate-buzz NOTE preserved. | `WP-E-gate-tick-colour-retire.md` |
| F | Dedupe `lineColourFor`/`tierLineColour` (rideDetailModel.ts hand-copies chips.tsx) | chore | **DONE — landed 2026-09-05, commit `644cb04`.** New `app/src/ui/tierColour.ts`; `chips.tsx` re-exports, `rideDetailModel.ts` imports the real function. | `WP-F-linecolour-dedupe.md` |
| G | Way-creation polish — loop-copy wording + regression tests for two under-covered branches | chore | **DONE — landed 2026-09-05, commit `eaab0a4`.** G1: loop copy names an existing landmark when applicable. G2: two new regression tests (WP-G 9/10). | `WP-G-waycreation-polish.md` |
| H | ~~Gate-adjust pad button label overflow~~ | — | **SUPERSEDED — folded into WP-J.** Its overflow/sizing analysis was correct but incomplete (missed a 5th row child); WP-J owns the whole card redesign now. Do not execute this brief separately. | `WP-H-gate-adjust-pad-overflow.md` |
| I | Edit gates on an EXISTING (already-saved) route from ROUTES — today only whole-route delete exists | small-medium | **DONE — landed 2026-09-05, commit `0b45803`.** `editRouteGates()` reuses `promoteRideToReference`'s reset-not-remap convention; reference line untouched, only gates move. Also fixed a nested-Pressable footgun on the way card. Needs Nathan's on-device look for UI acceptance criteria. WP-K (not yet executed) still needs the `RoutesScreen.tsx` ordering table before it lands. | `WP-I-edit-existing-route-gates.md` |
| J | Gate-adjust card redesign — real zoomable OpenMap, long-press-to-repeat nudge, start/finish gates adjustable (2026-09-04 notes) | medium-large | **BRIEF WRITTEN.** Swaps the card's custom-drawn line for a real `RouteMapView` (browse variant); adds `onLongPress`/repeat-nudge to the pad; unlocks start/finish gates (`chainageM` already holds them, just needed UI selectability); absorbs WP-H's overflow fix by moving the chainage readout above the button row instead of squeezed between two button pairs. | `WP-J-gate-adjust-card-redesign.md` |
| K | ROUTES tab: tapping a place or way opens a dedicated detail screen (mirrors cycle1's RIDES-tab pattern) | medium | **BRIEF WRITTEN.** New `CatalogDetailScreen.tsx` (one screen, `kind: 'place'|'way'` discriminator) mirrors `RideDetailScreen.tsx`'s mount-swap pattern (no navigation library needed, matches this app's existing approach). Flags and resolves its own collision with WP-I (both touch `RoutesScreen.tsx`) via an explicit ordering table. | `WP-K-routes-tab-detail-screens.md` |
| L | Remove "AI clutter text" — verbose explanatory strings across ROUTES/RIDES/DEMO; SETTINGS gets a tap-to-reveal "?" instead of always-on grey explanations | medium | **BRIEF WRITTEN.** Part A: 8 specific string edits across 4 files (Nathan's 4 named examples + 4 more from a sweep, each flagged by confidence level). Part B: `settings.tsx`'s shared row component gains a per-row `?` toggle, no new Modal (reuses the app's existing lightweight-disclosure idiom). | `WP-L-remove-ai-clutter-text.md` |
| M | Two-finger map rotation + compass-reset button on every non-race map render (Nathan's own Q3 design spec, 2026-09-05) | small-medium | **DONE — landed 2026-09-05, commit `6c3d6ab`.** `touchRotate` on for browse/prestart/finished; held `userBearing` composes into `cameraTargetFor()`; new compass button resets to north. Needs Nathan's on-device feel-check. | `WP-M-map-two-finger-rotation.md` |

**Read next:** `CONTEXT.md` for the full framing, then `QUESTIONS-FOR-NATHAN.md` — all three
questions are now answered: Q1 confirms which route to use for WP-B's on-device check (and
notes a possible app-switching contributing cause, folded into WP-B), Q2 ratifies WP-I's
re-timing design as final (no follow-on needed), and Q3 is Nathan's own full design spec for
WP-M, the map-rotation feature below.

**2026-09-05 — first execution session: WP-E → WP-F → WP-G → WP-D, all landed.** Nathan
picked the four smallest/lowest-risk briefs for a fast first pass. All four Executed in
parallel (confirmed disjoint target files first), verified together, and committed as four
separate commits: `d7e925b` (WP-E), `644cb04` (WP-F), `eaab0a4` (WP-G), `2fe0ede` (WP-D).
Combined result: 7 files changed + 1 new file, 165 insertions / 89 deletions; test suite went
468→472 (WP-G +2, WP-D +2), 0 fail, 3 skip throughout; `tsc --noEmit` clean before and after.
No file overlaps, no regressions. See each WP's own status line for its own detail, and
`TOKEN-USAGE.md` for the four Execute dispatches' token/tool-call figures.

**2026-09-05 — second execution session: WP-A, WP-B, WP-I, WP-M.** Ran in two disjoint-file
waves (WP-A+WP-B, then WP-I+WP-M — WP-A/WP-M both touch `routeMapView.tsx` and WP-B/WP-I both
touch `wayFromRide.ts`, so those two pairs could not run concurrently with each other). Landed
as four commits: `064b6e2` (WP-A), `495b3f8` (WP-B), `0b45803` (WP-I), `6c3d6ab` (WP-M). WP-B's
Execute pass hit a real ambiguity (a pre-existing test fixture with physically-impossible
overlapping timestamps) and correctly stopped rather than guessing; a fresh Fable ruling
determined the fixture was wrong, not the new code, and the fix was applied directly (a
~10-line mechanical test correction). Combined: 12 files changed across the two waves; test
suite went 483→495 (12 new tests), 0 fail, 3 skip throughout; `tsc --noEmit` clean throughout.
WP-B (on-device GPX check) and WP-I/WP-M (on-device UI/feel checks) still want Nathan's own
eyes on the phone — see each brief's status line.

## How to resume this cycle (in this chat or a fresh one)

1. Read this README, then `CONTEXT.md`, then `QUESTIONS-FOR-NATHAN.md`.
2. Pick any WP except H (superseded). Most are independent; the one real dependency is
   **WP-I and WP-K both edit `RoutesScreen.tsx`** — WP-K's brief has an explicit ordering
   table for whichever lands first, read it before executing either. WP-J is a natural
   "land before WP-I" candidate since WP-I's gate-adjust-card reuse gets simpler once WP-J's
   redesigned card exists (not required — WP-I works against today's card too, just says so).
3. Dispatch a Sonnet **Execute** agent against that WP's brief file, exactly as written —
   including its "Inspect findings" section, which may have corrected the original design.
   Remaining WPs and their file footprints (check before parallelizing — WP-A/M shared
   `routeMapView.tsx`, WP-B/I shared `wayFromRide.ts`, both already landed as sequential
   waves): WP-C (`RecordScreen.tsx` region — land after WP-A/E, both touched it), WP-J
   (`RoutesScreen.tsx`, `gateAdjustCard.tsx` — land after WP-I, both touch the same files),
   WP-K (`RoutesScreen.tsx` — see its own ordering table against WP-I, now landed), WP-L
   (scattered small string edits, low collision risk).
4. Run the verification commands the brief specifies (test suite + `tsc --noEmit`).
5. Commit the changed files straight to the device so Nathan can build/test same-day. Land
   one WP, let him test, then move to the next — same discipline cycle1 established.
6. Update this README's status table and the relevant WP file's status line as work lands.
7. If Execute hits a genuine ambiguity, don't guess — forward it to a fresh Fable Plan pass
   and, if it's a real open product question, log it in `QUESTIONS-FOR-NATHAN.md`.

## Process notes worth reading before executing anything

- **WP-B and WP-D** both went through real investigation before their fix was decided — WP-B's
  digest couldn't tell whether the gate bug was code or just a winding real route (Plan settled
  it by comparing the raw GPX against the stored reference line); WP-D's obvious-looking
  "make the threshold time-aware" idea was built, measured against the real corpus, and
  rejected before the brief's actual fix (discount by cause, not size) was written.
- **Every WP was Inspected** by a fresh-context Fable pass with no memory of how the brief was
  written — see each WP's own "Inspect findings" section (or, for WP-G, a full correction
  applied directly) for what was checked and what got fixed. `INSPECT-REPORT-ABD.md` and
  `INSPECT-REPORT-CEFGH.md` in this folder are the original two Inspect passes' full reports
  (the third Inspect-driven fix, WP-G's G2 rewrite, is folded into WP-G's own file directly
  rather than a separate report, since it needed a rewrite rather than just a findings note).
- **WP-I, WP-K, and WP-L all touch `RoutesScreen.tsx`.** WP-K's brief owns the ordering logic
  for WP-I; WP-L's edits (deleting two footer strings) are lower-risk and shouldn't conflict
  with either, but re-verify anchors regardless — standard practice per every brief's own
  stop-on-ambiguity clause.

## What's deliberately not in this cycle

See `CONTEXT.md`'s "What this cycle covers vs. deliberately left out" section — the contrast
bug (looks already resolved), the free-ride new>>new design (resolved by Nathan's own note,
folded into WP-A), and everything in `OPEN-ITEMS.md` needing Nathan's own on-device look or
taste call. Two-finger map rotation was an open question as of 2026-09-04 — Nathan answered
it with a full design spec on 2026-09-05, now built as **WP-M**, so it's no longer an
exception to this list.
