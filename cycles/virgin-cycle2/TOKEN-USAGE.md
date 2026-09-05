# virgin-cycle2 — token/tool-call reference

Running tally for this cycle's dispatches. Approximate — from each subagent's own reported
usage. Planning dispatches (Digest/Plan/Inspect) are from the 2026-09-04 session; the four
Execute dispatches below are from the first execution session, 2026-09-05.

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

**Planning subtotal (Digest/Plan/Inspect dispatches only): ~1.96M tokens across 15 dispatches**
(2 Digest + 9 Plan + 3 Inspect + 1 Plan-correction), plus 7 coordinator-direct chore
briefs/corrections (no separate token report — folded into that session's own cost).

**Execute subtotal (2026-09-05 session): ~371.7k tokens across 4 dispatches** (WP-E + WP-F +
WP-G + WP-D, run in parallel — confirmed disjoint target files first), plus 1 coordinator-direct
verify+commit pass (no separate token report).

**Cycle running total so far: ~2.33M tokens across 19 subagent dispatches** (15 planning + 4
Execute), plus 8 coordinator-direct chore passes. Four of thirteen WPs (E, F, G, D) are now
DONE and landed on the device; the remaining nine (A, B, C, I, J, K, L, M — H superseded) stay
BRIEF WRITTEN for a future Execute session.
