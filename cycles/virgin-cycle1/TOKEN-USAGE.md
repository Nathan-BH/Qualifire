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
| Execute — WP-C (drawable user-created routes — biggest lever, largest WP) | Execute | Sonnet | ~261.1k | 89 | Landed fully: 345 tests/342 pass/0 fail/3 skip (+12) |
| Inspect — WP-C fresh inspection | Inspect | Fable (fresh context) | ~197.1k | 69 | PASS — highest-scrutiny pass of the session; found a stronger validation (drawn gates rescore to ≤7e-7 m) and one doc-overclaim (manifest-match is Morning-specific, not general), no blocking defects |
| Coordinator direct doc-wording fix (README + WP-C status, per inspection note above) | Chore | — (coordinator, no subagent, wording only) | — | — | Fixed and committed directly, no dispatch |
| Execute — WP-Q (delete routes/ways/landmarks + reset-to-virgin — destructive, both Parts A+B) | Execute | Sonnet | ~338.4k | 111 | Landed fully: 357 tests/354 pass/0 fail/3 skip claimed (+12) |
| Inspect — WP-Q fresh inspection | Inspect | Fable (fresh context) | ~209.5k | 58 | PASS — highest-scrutiny pass of the cycle (destructive operation); hand-traced cascade rules against a scratch catalog, independently confirmed `moveSync` exists in the installed library, corrected the test count to 358/355 (executor's 357/354 was a stale-baseline slip), found 1 minor non-blocking wording defect |
| Coordinator direct fixes (conditional reset-failure message + 3 doc test-count corrections) | Chore | — (coordinator, no subagent, <10 lines) | — | — | Fixed and committed directly, no dispatch |

| Execute — WP-F (post-stop reference offer for any ride) | Execute | Sonnet | ~228.3k | — (not captured before compaction) | Landed fully: 366 tests/363 pass/0 fail/3 skip claimed (+8), incl. a real-fixture regression pin |
| Inspect — WP-F fresh inspection | Inspect | Fable (fresh context) | ~107.5k | 27 | PASS — no blocking defects; 3 minor non-blocking notes (2 stale/orphaned doc comments, 1 pre-existing loop-branch copy gap, 1 test could gain a counterfactual assert); independently reconfirmed test count and — device shell having come back up mid-inspection — a real `tsc --noEmit` run (exit 0) for the first time this stretch |
| Coordinator direct fixes (3 stale/orphaned comments in wayCreation.ts/RecordScreen.tsx; tsc-status doc correction across WP-D/J/O/C/Q/F sections of README.md now that tsc genuinely ran clean; WP-F README row + brief status line updated with inspection verdict) | Chore | — (coordinator, no subagent) | — | — | Fixed and committed directly, no dispatch |
| Coordinator git catch-up (device_bash came back up this stretch — committed everything that had only ever been written to the device filesystem: WP-F's doc/comment fixes as `67c9b96`, then the two WP-F executor files that were never committed at all, `wayNamingCard.tsx`+`waycreation_suite.ts`, as `ecef45c`) | Chore | — (coordinator, no subagent) | — | — | 2 commits landed on `virgin` branch; working tree confirmed clean after |

**Subtotal this stretch: ~3.10M tokens across 17 subagent dispatches** (6 fixes were direct
coordinator edits, not dispatches). **Running cycle total: roughly 4.60M tokens across 29
subagent dispatches.** Landed this stretch: WP-D, WP-N (bundled), WP-J, WP-O (both phases),
WP-C, WP-Q (both parts), WP-P (fixed via WP-D), WP-F. WP-C landing unblocks WP-H's map half,
WP-I's map half, and all of WP-K's map-side scope (their README rows still need updating to
drop "blocked on C"). Briefed but not yet executed: WP-B, WP-L (both ready, no re-planning
needed). Nathan answered Q1/Q2/Q4/Q5/Q6/Q7 in `QUESTIONS-FOR-NATHAN.md` — those answers
unblock WP-E/G/H/I/K/M, but those five still only have short stub files, not execution-ready
briefs, so a Digest+Plan pass is needed before any of them can be executed. Deferred pending
Nathan's call on which (if any) to re-plan next, given session-token-budget pacing.

**Note on git:** `device_bash` came back up partway through the WP-F inspection, after being
down for the entire rest of this stretch (WP-D through the start of WP-F's execution). Every
WP up to and including WP-Q had only ever been written straight to the device filesystem via
the stage/edit/commit-file workaround — none of it was in git. That gap is now closed: all of
it (WP-D/N/J/O/C/Q, plus WP-F) is committed on the `virgin` branch as of this update, working
tree clean. `.git` in this repo has a recurring quirk worth knowing about — commands leave a
stale `index.lock`/`HEAD.lock` that git itself cannot unlink (delete is blocked in the mounted
folder), so every git invocation needs the lock renamed out of the way first (`mv .git/index.lock
_to_delete/...` — a same-filesystem rename works even though delete doesn't) or the next git
command fails with "Unable to create index.lock: File exists".
