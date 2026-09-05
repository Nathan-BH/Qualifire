# virgin-cycle2 — token/tool-call reference

Running tally for this cycle's dispatches (2026-09-04 session, planning-only — no Execute
dispatches this cycle, see README). Approximate — from each subagent's own reported usage.

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

**Subtotal (subagent dispatches only): ~1.96M tokens across 15 dispatches** (2 Digest + 9 Plan
+ 3 Inspect + 1 Plan-correction), plus 7 coordinator-direct chore briefs/corrections (no
separate token report — folded into this session's own cost).

**No Execute-tier dispatches this cycle** — nothing has landed on the device. When Nathan
picks a WP to actually build, that's a fresh Execute (Sonnet) dispatch against that brief.
