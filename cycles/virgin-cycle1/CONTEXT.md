# virgin-cycle1 — CONTEXT

## What "virgin build" means

A from-scratch install path (empty catalog: no landmarks, no ways, no routes) meant to let a
stranger use Qualifire with no seeded data — as opposed to `main`, which carries Nathan's own
624-ride archive. Nathan is dogfooding the virgin build himself, day by day, as its first
real user, and reporting back what breaks or feels wrong. This cycle is the response to his
first two rides (2026-09-01) plus the still-relevant backlog from an older notes file
(`Nathan/Nathan's_notes5/Nathan's_notes5.md`, 26/29 Aug) that predates the virgin branch.

Nathan's own priority ruling (2026-09-01): **"this is an actual goal that is a top priority
... let's just focus first on making a good working app before adding extra stuff."** Audio/
TTS (item 17) is explicitly parked until the virgin path itself is solid.

## Primary source documents (read these, don't just trust this folder's summaries)

- `data/activities/TEST in virgin-app rides/qualifire-20260901/qualifire-20260901-review.md`
  — the full review: ride-by-ride analysis, the notes5 fold-in table (N1-N9), the 17-item
  implementation plan with N/T tags, sizes, file pointers, and 8 open questions. **This is
  the plan; this cycle folder is status + briefs on top of it, not a replacement for it.**
- `Nathan/Nathan's_notes5/Nathan's_notes5.md` — raw older notes, partially superseded, cross-
  referenced from the review above.
- `STATE.md` / `OPEN-ITEMS.md` (repo root) — the project's actual single source of truth for
  current app behaviour and open tracked items; this cycle's items are either new (**N**) or
  reference an existing tracked item (**T**) per the review's tagging.
- `process/CONVENTIONS.md` / `CLAUDE.md` (repo root) — the model-tier pipeline this cycle
  follows (Digest → Plan/Fable → Execute/Sonnet → Inspect/fresh-Fable), honesty rules, file
  ownership, and (as of 2026-09-02) the standing convention for collecting open questions in
  a `QUESTIONS-FOR-NATHAN.md` file — see `process/CONVENTIONS.md`'s "Escalating to Nathan"
  section, modelled on `main`'s `cycles/cycle-025-briefs/QUESTIONS-FOR-NATHAN.md`.

## Nathan's two mid-review corrections (already folded into the review doc, restated here since they're easy to miss)

1. The ride-2 bug's fix target is **"recognize as unmatched/virgin and handle it like ride
   1,"** not "make the reverse direction lock." Work→Home and Home→Work are different Ways
   and should never lock against each other. He separately asked for a UX touch: while a
   ride is running and nothing is recognized, the rotating status line should fold in
   something like "writing history" so the rider knows they're laying down a new route for
   the first time (this became WP-A piece 3).
2. Notes5's audio/TTS idea (item 17) is deprioritized — it would need a new build regardless,
   and the priority is a good working app before extra features.

## What actually happened this session (2026-09-02) — for whoever resumes

- **`device_bash` (the shell bridge to Nathan's PC) was down the entire session** — every
  call failed with "Workspace unavailable." `device_stage_files`/`device_list_dir`/
  `device_commit_files` (file transfer, not a shell) kept working throughout. **Check whether
  this is still true before assuming it is** — it may have recovered.
- Because of that, all code work happened in a **cloud-side git mirror**: the full `app/`
  tree was staged from the device into the cloud sandbox and copied into a git repo at (in
  that session's container) `/home/claude/qualifire-mirror/app/`. That path is **ephemeral to
  that session's container** — a fresh chat/session will need to re-stage the device's `app/`
  tree into its own mirror before it can Execute anything (or, if `device_bash` is back up by
  then, work directly on the device — much simpler, prefer that if available).
- **`tsc --noEmit` could not be run anywhere this session.** The cloud sandbox has zero
  package-registry access (npm/pip both 403), so no `node_modules` could ever be installed
  there; `device_bash` (which would run it against the device's real `node_modules`) was
  down. Every WP-A commit shipped with only the headless test suite (`node
  --experimental-strip-types tests/run.ts`, which needs no `node_modules`) verified — **`tsc
  --noEmit` on WP-A's changes has never actually been run.** Nathan: if `device_bash` is still
  down for you, you can run it yourself —
  ```
  cd "C:\Users\natha\Claude personal projects\Qualifire\app"
  node --experimental-strip-types tests/run.ts
  .\node_modules\.bin\tsc --noEmit
  ```
  and paste the output back into whichever chat is running this cycle.
- WP-A went through three rounds before landing: an initial fix (`anchored` guard) turned out
  to over-exclude legitimate finishes (caught by a fresh-context Inspect pass, not shipped),
  replaced by a narrower "corridor-verified advance before FINISH" guard (the version that
  actually landed). This is normal pipeline behaviour (Inspect exists to catch exactly this)
  and is recorded in full in `WP-A-ride2-hardpick-writinghistory.md` — read it before assuming
  WP-A's design is simpler than it is; there are real edge cases (see engine.ts's own comments
  at the `finalize()` guard).
- Six Plan-tier (Fable) briefs were produced in parallel for independent, unblocked work
  packages (B, C, D, F, J, L) — each one verified its own claims against the actual mirror
  code rather than trusting the review doc's line numbers, since WP-A's Execute passes were
  landing concurrently and shifting some line numbers in `engine.ts`/`RecordScreen.tsx`. Each
  brief says explicitly which files it needs re-verified before executing.

## The model-tier pipeline (restated briefly — full version in `process/CONVENTIONS.md`)

Digest (Haiku, condenses files) → Plan (Fable, designs the fix + writes a self-contained
brief) → Execute (Sonnet, implements the brief alone, stop-on-ambiguity) → Inspect (fresh-
context Fable, adversarial re-check). A brief is the interface between tiers — it must be
self-contained since models share no memory across dispatches. Chores under ~10 mechanical
lines skip the pipeline entirely (WP-N qualifies). Every dispatch gets narrated; every task
ends with a tier/model/tokens/outcome table (see `TOKEN-USAGE.md` for this cycle's running
total).

## Ground rules that constrain every brief in this folder

- **Never delete** — move to `safe_to_delete/`, use `mv` not `rm`.
- **`IDEAS.md` and `Nathan/` are read-only** to any agent.
- Raw ride recordings are append-only.
- Verification, every time code lands: `cd app && node --experimental-strip-types
  tests/run.ts` (zero FAIL) and `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0).
- A change is "done" only when there's a checkable artifact — a test that flipped from FAIL
  to PASS, a file that exists, something Nathan has actually seen/tested. Not an agent's
  say-so.
