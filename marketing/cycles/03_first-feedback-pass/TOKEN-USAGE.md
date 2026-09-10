# Token usage — cycle 03 (2026-09-10)

Per-dispatch token/tool-call/duration figures from the model-tier pipeline, as reported by
each subagent's own usage block. The six Execute-tier dispatches ran in parallel, so their
summed duration (below) is not wall-clock time — actual wall-clock for that batch was ~3.4
minutes (the longest of the six).

| Tier | Model | Mandate | Tokens | Tool calls | Duration |
|---|---|---|---:|---:|---:|
| Digest | Haiku | Condense all context files + full content of the 3 map HTML files into a factual report | 118,483 | 45 | 4m 13s |
| Plan | Fable | Execution order, shared-asset risk call, map-bug diagnosis, 7 self-contained briefs | 174,555 | 18 | 12m 04s |
| Execute | Sonnet | map-scroll-fix — native MapLibre route layers in both preview tools | 73,352 | 22 | 1m 43s |
| Execute | Sonnet | ranking_v3 — caption text + duration edit | 72,206 | 23 | 1m 46s |
| Execute | Sonnet | gates-saving_v3 — caption position + text edit | 72,899 | 23 | 2m 14s |
| Execute | Sonnet | opening_v2 — new composition split out + spacing fix | 85,493 | 33 | 3m 01s |
| Execute | Sonnet | colours_v2 — 9-point rewrite + latent-bug fix | 88,812 | 18 | 3m 22s |
| Execute | Sonnet | start-ride_v3 — cursor, uniform tint, camera-follow | 90,729 | 27 | 3m 21s |
| Inspect | Fable (fresh) | Adversarial re-derivation of all 6 landed edits against the files on disk | 164,826 | 27 | 10m 17s |
| Chore | Sonnet (coordinator, direct) | Fixed the inspector's 1 real defect + 3 doc nits; wrote cycle-03 README/OPEN-ITEMS/this file | not separately metered | — | — |
| Execute | — | teaser_v4 | not run | — | — | — |

**Total subagent tokens: 941,355** across 9 dispatches (Digest ×1, Plan ×1, Execute ×6, Inspect ×1).
Coordinator-level tokens (dispatch prompts, reading results, direct fixes, this bookkeeping)
are not separately metered by the harness and are not included above.

teaser_v4 was not dispatched — its precondition (all five new renders existing on disk) was
never met this session, so there was nothing for an Execute-tier subagent to do. It will add
one more Execute-tier row once run, plus a final Inspect-tier row if the pipeline is repeated
for the assembly step.
