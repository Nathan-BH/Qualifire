# builds/ — one folder per build, why it happened and what changed

`build{N}/` holds the *story* behind each numbered EAS build: why it was needed, what
it actually changed on the phone, and any explanations worth keeping for later
reference (e.g. a Q&A when Nathan needed something clarified). This is **not** the
build runbook — `BUILD-N-RUNBOOK.md` at repo root covers how-to-run instructions for
the *current* build only, and gets superseded/archived to `safe_to_delete/` once the
next build replaces it. This folder is the persistent why/what record and is never
pruned that way.

Started 2026-08-27 with build 6, then backfilled for build 3/4/5 from
`safe_to_delete/BUILD-3-RUNBOOK.md`, `safe_to_delete/BUILD-4-RUNBOOK.pre-cycle015.md`,
the current root `BUILD-4-RUNBOOK.md`, `scripts/build5.ps1`, `cycles/cycle-008.md` and
`cycles/cycle-015.md`, and `product/DECISIONS.md` (D-026, D-041, D-043) — retrieved
2026-08-27 specifically because Nathan hadn't emptied `safe_to_delete/` yet. Build 1/2
predate this project's cycle-record convention closely enough that no equivalent
source material was found; not backfilled.
