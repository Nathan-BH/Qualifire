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

## Status at a glance (updated 2026-09-05 — Nathan answered all 3 questions; WP-M added from his Q3 answer)

| WP | What | Size | Status | Brief |
|---|---|---|---|---|
| A | RECORD-screen route-match & yellow-trail visibility (2026-09-03 review issues #1+#2, Nathan's exact 3-state spec) | small-medium | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** Root cause: `routeMapView.tsx`'s `?? defaultRouteId()` fallback silently substitutes "first drawable catalog route." Fix drops that fallback for the live map, adds one pure `liveMapOverlayFor()` helper making the reference line and the live trail mutually exclusive by construction. | `WP-A-record-route-match-trail-visibility.md` |
| B | Gate placement scale bug on newly-created routes (2026-09-03 review issue #3) | small-medium | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** Genuine defect, confirmed twice over: fixes read in on-disk write order, not chronological order. Original example route deleted by Nathan since — **a second route from his 2026-09-04 evening ride ("WorkHomeWet") hit the same bug and is the current live example**, see the brief's update section and `QUESTIONS-FOR-NATHAN.md` Q1. | `WP-B-gate-placement-scale-bug.md` |
| C | Raw-time scoring default — implementation half of an already-settled STATE.md rule | medium | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** `rawS` already stored (no schema change); 27 real call sites re-verified across 9 files. Two mechanical tsc-strictness gaps found and documented for Execute to close. Land after WP-E (both touch the same `RecordScreen.tsx` region). | `WP-C-raw-time-scoring-default.md` |
| D | GPS re-acquisition teleport-guard hole (≤245m hops slip through uncounted) | small | **BRIEF WRITTEN, Inspect: PASS.** Plan measured and rejected a naive time-based threshold (fails on real corpus data); landed on discounting by *cause* (was the candidate off-route just before this fix?) instead of jump size. Corpus-safety re-verified independently by Inspect. | `WP-D-gps-teleport-guard-hole.md` |
| E | Retire per-tier gate-tick colour (`gateColours`) — Nathan's "gates should not change colour" rule | chore | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** One-line change + dead-code removal. Inspect corrected the exact deletion range (769-787 only — the original range would have deleted an unrelated comment). | `WP-E-gate-tick-colour-retire.md` |
| F | Dedupe `lineColourFor`/`tierLineColour` (rideDetailModel.ts hand-copies chips.tsx) | chore | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** Extraction into a new pure `tierColour.ts` module. The brief's one open question (are the two tier types compatible?) is now resolved: yes, no cast needed. | `WP-F-linecolour-dedupe.md` |
| G | Way-creation polish — loop-copy wording + regression tests for two under-covered branches | chore | **BRIEF WRITTEN (G2 corrected 2026-09-04 by a fresh Fable pass after Inspect found the original test spec targeted the wrong branch).** G1 (copy fix) unchanged; G2 now specifies two genuinely-uncovered test cases, verified against the real 882-line test file. | `WP-G-waycreation-polish.md` |
| H | ~~Gate-adjust pad button label overflow~~ | — | **SUPERSEDED — folded into WP-J.** Its overflow/sizing analysis was correct but incomplete (missed a 5th row child); WP-J owns the whole card redesign now. Do not execute this brief separately. | `WP-H-gate-adjust-pad-overflow.md` |
| I | Edit gates on an EXISTING (already-saved) route from ROUTES — today only whole-route delete exists | small-medium | **BRIEF WRITTEN.** Reuses cycle1's `promoteRideToReference` pattern (new gate-set version, results cleared, one-step warning) but keeps the existing reference line — only the gate positions move, no new ride involved. One product question drafted for Nathan (Q2: does "starting over" mean re-timed, or gone for good). Coordinates with WP-K on shared `RoutesScreen.tsx` edits — see WP-K's §3.6 ordering table. **Its one open product question (re-time vs. discard old rides) is now resolved — Nathan confirmed re-timing (Q2).** | `WP-I-edit-existing-route-gates.md` |
| J | Gate-adjust card redesign — real zoomable OpenMap, long-press-to-repeat nudge, start/finish gates adjustable (2026-09-04 notes) | medium-large | **BRIEF WRITTEN.** Swaps the card's custom-drawn line for a real `RouteMapView` (browse variant); adds `onLongPress`/repeat-nudge to the pad; unlocks start/finish gates (`chainageM` already holds them, just needed UI selectability); absorbs WP-H's overflow fix by moving the chainage readout above the button row instead of squeezed between two button pairs. | `WP-J-gate-adjust-card-redesign.md` |
| K | ROUTES tab: tapping a place or way opens a dedicated detail screen (mirrors cycle1's RIDES-tab pattern) | medium | **BRIEF WRITTEN.** New `CatalogDetailScreen.tsx` (one screen, `kind: 'place'|'way'` discriminator) mirrors `RideDetailScreen.tsx`'s mount-swap pattern (no navigation library needed, matches this app's existing approach). Flags and resolves its own collision with WP-I (both touch `RoutesScreen.tsx`) via an explicit ordering table. | `WP-K-routes-tab-detail-screens.md` |
| L | Remove "AI clutter text" — verbose explanatory strings across ROUTES/RIDES/DEMO; SETTINGS gets a tap-to-reveal "?" instead of always-on grey explanations | medium | **BRIEF WRITTEN.** Part A: 8 specific string edits across 4 files (Nathan's 4 named examples + 4 more from a sweep, each flagged by confidence level). Part B: `settings.tsx`'s shared row component gains a per-row `?` toggle, no new Modal (reuses the app's existing lightweight-disclosure idiom). | `WP-L-remove-ai-clutter-text.md` |
| M | Two-finger map rotation + compass-reset button on every non-race map render (Nathan's own Q3 design spec, 2026-09-05) | small-medium | **BRIEF WRITTEN, Inspect: PASS WITH FINDINGS.** `touchRotate` flips on for browse + prestart + finished (race/moving/stopped unchanged); a held `userBearing` composes with the existing `cameraTargetFor()` so `+`/`−`/`FIT`/`ME` don't silently snap rotation away; new compass button resets to north. Inspect found the prestart→moving reset needed to be more defensive (same map instance is reused across START, not remounted) — corrected in the brief. | `WP-M-map-two-finger-rotation.md` |

**Read next:** `CONTEXT.md` for the full framing, then `QUESTIONS-FOR-NATHAN.md` — all three
questions are now answered: Q1 confirms which route to use for WP-B's on-device check (and
notes a possible app-switching contributing cause, folded into WP-B), Q2 ratifies WP-I's
re-timing design as final (no follow-on needed), and Q3 is Nathan's own full design spec for
WP-M, the map-rotation feature below.

## How to resume this cycle (in this chat or a fresh one)

1. Read this README, then `CONTEXT.md`, then `QUESTIONS-FOR-NATHAN.md`.
2. Pick any WP except H (superseded). Most are independent; the one real dependency is
   **WP-I and WP-K both edit `RoutesScreen.tsx`** — WP-K's brief has an explicit ordering
   table for whichever lands first, read it before executing either. WP-J is a natural
   "land before WP-I" candidate since WP-I's gate-adjust-card reuse gets simpler once WP-J's
   redesigned card exists (not required — WP-I works against today's card too, just says so).
3. Dispatch a Sonnet **Execute** agent against that WP's brief file, exactly as written —
   including its "Inspect findings" section, which may have corrected the original design.
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
