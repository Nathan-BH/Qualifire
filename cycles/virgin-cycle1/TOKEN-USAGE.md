# virgin-cycle1 — token/tool-call reference

Running tally for this cycle's dispatches so far (2026-09-02 session). Approximate — from each
subagent's own reported usage. Kept for the record, same convention as `main`'s
`cycles/cycle-025-briefs/TOKEN-USAGE.md`; not something Nathan needs to read unless curious
about cost.

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| WP-A round 1 (3-piece brief) | Execute | Sonnet | ~large (pre-dated this table; see WP-A file) | — | Landed, then Round 2 stop |
| WP-A round 1 follow-on (cycle024 test + comments) | Plan → Execute | Fable → Sonnet | ~124k + ~71k | 32 + 15 | Landed |
| WP-A Inspect pass | Inspect | Fable (fresh context) | ~151k | 40 | PASS-WITH-CONCERNS → Round 3 |
| WP-A round 3 ruling (completion-evidence guard) | Plan | Fable | ~171k | 33 | Ruling produced |
| WP-A round 3 execute | Execute | Sonnet | ~93k | 45 | Landed, committed to device |
| WP-B brief (GPX+ pick/lock logging) | Plan | Fable | ~219k | 43 | Brief only, not executed |
| WP-C brief (drawable user routes) | Plan | Fable | ~186k | 35 | Brief only, not executed |
| WP-D brief (rider-only map) | Plan | Fable | ~133k | 27 | Brief only, not executed |
| WP-J brief (breadcrumb trail) | Plan | Fable | ~148k | 21 | Brief only, not executed |
| WP-L brief (start auto-detect) | Plan | Fable | ~91k | 20 | Brief only, not executed |
| WP-F brief (post-stop reference offer) | Plan | Fable | ~119k | 32 | Brief only, not executed |

**Subtotal through the above: roughly 1.5M tokens across 12 subagent dispatches**, plus the
coordinating session's own tool calls (device staging, file reads, cycle-folder authoring).
Session usage was reported at 63% when Nathan paused the cycle for the evening — factor that
in when deciding how many Execute passes to run in one sitting next time; landing one or two
WPs and letting Nathan test same-day beats planning everything and executing nothing.

## Continued session (2026-09-02 evening → 2026-09-03) — WP-D, WP-J, WP-O landed; WP-P, WP-Q briefed

`device_bash` (shell on Nathan's PC) was down for this entire stretch — every Plan/Digest read
via `device_stage_files` and every Execute/doc-update wrote back via `device_stage_files` +
`SendUserFile` + `device_commit_files`, never git. Test-suite verification ran for real in the
cloud container (Node, no `node_modules` needed since `tests/run.ts` is pure) rather than being
left unconfirmed.

| Dispatch | Tier | Model | Tokens (reported) | Tool calls | Outcome |
|---|---|---|---|---|---|
| Digest — DEMO tab / gates / sectors / WP convention | Digest | Haiku | ~100.7k | 42 | Factual digest feeding WP-O/WP-P |
| Digest — live map on Record/Start/Race + "HomeWork" blank-map bug | Digest | Haiku | ~111.7k | 28 | Factual digest feeding WP-O/WP-P |
| Plan — WP-O (demo tab modes) + WP-P (live-map root cause) | Plan | Fable | ~146.2k | 38 | Both briefs written; landed on disk, not yet executed |
| Execute — WP-D (rider-only map, bundled WP-N) | Execute | Sonnet | ~225.9k | 94 | Landed: 312 tests/309 pass/0 fail/3 skip (+7) |
| Inspect — WP-D fresh inspection | Inspect | Fable (fresh context) | ~157.9k | 45 | PASS — 2 minor non-blocking notes, no defects |
| Digest — catalog storage / delete-reset / gate-render mechanism | Digest | Haiku | ~99.3k | 33 | Factual digest feeding WP-Q; found black-circles issue is already WP-E/Q6 |
| Plan — WP-Q (delete routes/ways/landmarks + reset-to-virgin) | Plan | Fable | ~203.2k | 55 | Brief written; landed on disk, not yet executed |
| Execute — WP-J (breadcrumb trail) | Execute | Sonnet | ~232.5k | 89 | Landed: 326 tests/323 pass/0 fail/3 skip (+14) |
| Inspect — WP-J fresh inspection | Inspect | Fable (fresh context) | ~144.3k | 32 | PASS-WITH-ONE-DEFECT — stale pre-START position could seed trail point 0 |
| Coordinator direct fix (1-line guard fix for the above defect) | Chore | — (coordinator, no subagent, <10 lines) | — | — | Fixed and committed directly, no dispatch |
| Execute — WP-O (demo tab: both modes, both phases) | Execute | Sonnet | ~204.5k | 79 | Landed: 333 tests/330 pass/0 fail/3 skip (+7) |
| Inspect — WP-O fresh inspection | Inspect | Fable (fresh context) | ~132.4k | 34 | PASS — 3 trivial doc-drift notes, no functional defects |

**Subtotal this stretch: ~1.76M tokens across 11 subagent dispatches** (the WP-J fix was a
direct coordinator edit, not a dispatch). **Running cycle total: roughly 3.26M tokens across
23 subagent dispatches.** Landed this stretch: WP-D, WP-N (bundled), WP-J, WP-O (both phases),
WP-P (fixed via WP-D). Briefed but not yet executed: WP-P's own doc (root-cause record), WP-Q.
Nathan answered Q1/Q2/Q4/Q5/Q6/Q7 in `QUESTIONS-FOR-NATHAN.md` during this stretch — those
answers unblock WP-E/G/H/I/K/M, but those five still only have short stub files, not
execution-ready briefs, so a Plan pass is needed before any of them can be executed.
