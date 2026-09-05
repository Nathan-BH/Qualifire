# virgin-cycle2 — token/tool-call reference

Running tally for this cycle's dispatches. Approximate — from each subagent's own reported
usage. Planning dispatches (Digest/Plan/Inspect) are from the 2026-09-04 session; Execute dispatches from all three
execution sessions on 2026-09-05 are included below.

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| Digest — record/route-match/gate-seeding code | Digest | Haiku | ~92.6k | 58 | Factual digest feeding WP-A/WP-B |
| Digest — scoring/colour/misc code | Digest | Haiku | ~72.2k | 51 | Factual digest feeding WP-C..H |
| Plan — WP-A (record route-match/trail-visibility) | Plan | Fable | ~105.1k | 25 | Brief written |
| Plan — WP-B (gate placement scale bug) | Plan | Fable | ~164.5k | 50 | Brief written; root cause confirmed as a real defect via raw-GPX cross-check |
| Plan — WP-C (raw-time scoring default) | Plan | Fable | ~139.3k | 21 | Brief written; re-counted call sites 4→27, found `rawS` already stored |
| Plan — WP-D (GPS teleport-guard hole) | Plan | Fable | ~117.9k | 19 | Brief written; measured and rejected the obvious fix before landing the real one |
| Coordinator direct — WP-E (gate-tick colour retire) | Chore | — (coordinator, no subagent) | — | ~4 | Brief written directly |
| Coordinator direct — WP-F (lineColourFor dedupe) | Chore | — (coordinator, no subagent) | — | ~3 | Brief written directly |
| Coordinator direct — WP-G (way-creation polish, v1) | Chore | — (coordinator, no subagent) | — | ~3 | Brief written directly; G2 later found wrong by Inspect, corrected below |
| Coordinator direct — WP-H (gate-adjust pad overflow, v1) | Chore | — (coordinator, no subagent) | — | ~2 | Brief written directly; later superseded by WP-J |
| Inspect — fresh-context check of WP-A, WP-B, WP-D | Inspect | Fable (fresh context) | ~171.8k | 44 | WP-A PASS WITH FINDINGS, WP-B PASS WITH FINDINGS (found a 2nd live occurrence of the bug), WP-D PASS |
| Inspect — fresh-context check of WP-C, WP-E, WP-F, WP-G, WP-H | Inspect | Fable (fresh context) | ~169.8k | 45 | All PASS WITH FINDINGS; WP-G's G2 flagged as needing a re-derivation |
| Coordinator direct — apply Inspect corrections to WP-A/B/C/D/E/F | Chore | — (coordinator, no subagent) | — | ~8 | Appended "Inspect findings" sections to 6 briefs; retargeted WP-B's example route |
| Plan — WP-G correction (G2 re-derivation) | Plan | Fable | ~95.9k | 10 | G2 rewritten: original tests targeted the wrong branch / duplicated existing coverage; 2 new genuinely-uncovered cases specified instead |
| Plan — WP-I (edit gates on an existing route) | Plan | Fable | ~158.9k | 29 | Brief written; reuses cycle1's `promoteRideToReference` pattern |
| Plan — WP-J (gate-adjust card redesign) | Plan | Fable | ~152.3k | 33 | Brief written; absorbs WP-H, supersedes it |
| Plan — WP-K (ROUTES-tab detail screens) | Plan | Fable | ~162.0k | 32 | Brief written; found and resolved its own collision with WP-I |
| Plan — WP-L (remove AI-clutter text) | Plan | Fable | ~107.0k | 17 | Brief written; 8 confirmed edits + a SETTINGS "?" disclosure redesign |
| Coordinator direct — QUESTIONS-FOR-NATHAN.md, README.md, CONTEXT.md, TOKEN-USAGE.md | Chore | — (coordinator, no subagent) | — | — | Cycle bookkeeping/finalization |
| Plan — WP-M (two-finger map rotation + compass button) | Plan | Fable | ~125.2k | 27 | Brief written from Nathan's own Q3 design spec |
| Inspect — fresh-context check of WP-M | Inspect | Fable (fresh context) | ~116.8k | 34 | PASS WITH FINDINGS — found the prestart→moving reset was load-bearing, not belt-and-braces (same map instance reused across START) |
| Coordinator direct — process Nathan's 3 answers (patch WP-I/WP-B, rewrite README/CONTEXT/TOKEN-USAGE/QUESTIONS) | Chore | — (coordinator, no subagent) | — | ~10 | Q1 folded into WP-B, Q2 resolved WP-I's open question, Q3 → WP-M |
| Execute — WP-E (retire gate-tick colour) | Execute | Sonnet | ~68.6k | 16 | Landed `d7e925b`: removed `gateColours` useMemo + override, preserved gate-buzz NOTE |
| Execute — WP-F (linecolour dedupe) | Execute | Sonnet | ~97.2k | 22 | Landed `644cb04`: new `tierColour.ts`, `chips.tsx` re-exports, `rideDetailModel.ts` uses the real function |
| Execute — WP-G (way-creation polish) | Execute | Sonnet | ~88.7k | 26 | Landed `eaab0a4`: G1 copy fix + G2's two re-derived regression tests, non-duplication double-checked against the real file |
| Execute — WP-D (GPS teleport-guard hole) | Execute | Sonnet | ~117.2k | 43 | Landed `2fe0ede`: `wasOnRoute` capture + widened discount condition, self-resolved one transient ambiguity in the doc-comment rewrite (reported, not guessed) |
| Coordinator direct — verify + commit WP-E/F/G/D, update briefs/README/TOKEN-USAGE | Chore | — (coordinator, no subagent) | — | ~15 | Combined verification (472 tests, 469 pass, 0 fail, 3 skip; tsc clean), 4 separate commits, status lines + README table + this file updated |
| Execute — WP-A (RECORD route-match/trail-visibility) | Execute | Sonnet | ~112.3k | 46 | Landed `064b6e2`: removed the `?? defaultRouteId()` fallback, added `liveMapOverlayFor()` |
| Execute — WP-B (gate placement scale bug) | Execute | Sonnet | ~189.8k | 76 | Landed `495b3f8` (A1-A5); correctly stopped on a test-fixture ambiguity rather than guessing |
| Plan — adjudicate WP-B's test-fixture ambiguity | Plan | Fable (fresh context) | ~79.9k | 10 | Ruled the fixture's overlapping timestamps were the defect, not the new chronological-sort code; specified the exact fixture fix |
| Coordinator direct — apply WP-B's fixture fix, verify, commit WP-A+WP-B, update briefs | Chore | — (coordinator, no subagent) | — | ~20 | ~10-line mechanical fix per the ruling; 483 tests, 480 pass, 0 fail, 3 skip; 2 commits |
| Execute — WP-I (edit gates on an existing route) | Execute | Sonnet | ~152.6k | 48 | Landed `0b45803`: `editRouteGates()`/`gateEditDraftFor()`, ROUTES wiring, nested-Pressable fix |
| Execute — WP-M (two-finger map rotation + compass reset) | Execute | Sonnet | ~122.1k | 41 | Landed `6c3d6ab`: `rotateEnabledFor()`, held `userBearing`, compass button, Inspect-tier guard applied |
| Coordinator direct — verify + commit WP-I/WP-M, update briefs/README/TOKEN-USAGE | Chore | — (coordinator, no subagent) | — | ~15 | Combined verification (495 tests, 492 pass, 0 fail, 3 skip; tsc clean), 2 commits, status lines + README table + this file updated |

**Planning subtotal (Digest/Plan/Inspect dispatches only): ~1.96M tokens across 15 dispatches**
(2 Digest + 9 Plan + 3 Inspect + 1 Plan-correction), plus 7 coordinator-direct chore
briefs/corrections (no separate token report — folded into that session's own cost).

**Execute subtotal, first session (WP-E/F/G/D): ~371.7k tokens across 4 dispatches** (run in
parallel — confirmed disjoint target files first), plus 1 coordinator-direct verify+commit pass.

**Execute subtotal, second session (WP-A/B/I/M): ~576.8k tokens across 4 Execute dispatches**
(two disjoint-file waves: WP-A+WP-B, then WP-I+WP-M) **+ ~79.9k for 1 Plan-tier ambiguity
ruling** (WP-B's test-fixture ambiguity — correctly stopped on by Execute rather than guessed
past), plus 2 coordinator-direct verify+commit passes.

| Plan — WP-J extended scope (real-map redesign applied to ROUTES-tab gate editing, Nathan's follow-up instruction) | Plan | Fable | ~190.6k | — | Brief appended: new `GateAdjustRequest`/full-screen `GateAdjustScreen.tsx` design, Shell wiring as a third overlay |
| Execute — WP-J (gate-adjust card redesign, extended scope) | Execute | Sonnet | ~246.0k | 78 | Landed `4524122`: real-map card + 5-chip selector + hold-to-repeat pad; new `GateAdjustScreen.tsx`; retired `gateAdjustMapModel.ts` |
| Coordinator direct — verify + commit WP-J | Chore | — (coordinator, no subagent) | — | ~15 | 484 tests, 481 pass, 0 fail, 3 skip; tsc clean; 1 commit |
| Execute — WP-C (raw-time scoring default) | Execute | Sonnet | ~288.6k | 113 | Landed `ed0a5fe`: new `timing.ts`, 27 call sites rewired to `scoredS()`, SETTINGS Timing row; adapted to WP-A/WP-E's prior edits to `RecordScreen.tsx` |
| Coordinator direct — verify + commit WP-C | Chore | — (coordinator, no subagent) | — | ~12 | 494 tests, 491 pass, 0 fail, 3 skip; tsc clean; 1 commit |
| Plan — WP-K reconciliation against landed WP-J | Plan | Fable | ~158.8k | — | Brief's planned relocation of WP-I's inline code was obsolete (WP-J already replaced it); rewrote Part B as a one-line `openGateAdjust` wire-up, specified the 4-overlay Shell stacking order |
| Execute — WP-K (ROUTES-tab detail screens) | Execute | Sonnet | ~283.3k | 75 | Landed `1a3e99c`: new `CatalogDetailScreen.tsx`/`catalogDetailModel.ts`/`catalogDeleteActions.ts`; `RoutesScreen.tsx` slimmed 282→113 lines |
| Coordinator direct — verify + commit WP-K | Chore | — (coordinator, no subagent) | — | ~14 | 506 tests, 503 pass, 0 fail, 3 skip; tsc clean; 1 commit |
| Coordinator direct — re-anchor WP-L's brief (footer-string drift from WP-J) before Execute | Chore | — (coordinator, no subagent) | — | ~5 | Corrected anchor #2's quoted string to match WP-J's landed copy; all other anchors verified verbatim by grep first |
| Execute — WP-L (remove AI-clutter text) | Execute | Sonnet | ~107.0k | 30 | Landed `f3b47cd`: 8 string edits across 5 files, SETTINGS "?" disclosure applied to all 11 rows (incl. WP-C's new Timing row, copy untouched) |
| Coordinator direct — verify + commit WP-L, update briefs/README/TOKEN-USAGE | Chore | — (coordinator, no subagent) | — | ~15 | 506 tests, 503 pass, 0 fail, 3 skip (unchanged); tsc clean; 1 commit |

**Execute subtotal, third session (WP-J extended/C/K/L): ~924.9k tokens across 4 Execute
dispatches** (fully sequential — WP-J→WP-C→WP-K→WP-L, forced by real file overlaps) **+
~349.4k for 2 Plan-tier reconciliation passes** (WP-J's extended-scope design, WP-K's
reconciliation against landed WP-J), plus 4 coordinator-direct verify+commit passes and 1
coordinator-direct brief re-anchor.

**Cycle running total: ~4.25M tokens across 30 subagent dispatches** (17 planning + 12
Execute + 1 Plan-tier ruling), plus 15 coordinator-direct chore passes. **All thirteen original
WPs are now DONE or superseded** (H → J) — the virgin-cycle2 backlog is closed. On-device
checks (WP-B's GPX+ cross-check; WP-I/M/J/K/L's UI/gesture/navigation/interaction feel) remain
outstanding and are Nathan's to do on the phone.
