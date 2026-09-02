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

**Total this cycle so far: roughly 1.5M tokens across 12 subagent dispatches**, plus the
coordinating session's own tool calls (device staging, file reads, cycle-folder authoring).
Session usage was reported at 63% when Nathan paused the cycle for the evening — factor that
in when deciding how many Execute passes to run in one sitting next time; landing one or two
WPs and letting Nathan test same-day beats planning everything and executing nothing.
