# virgin-cycle5 — Root-doc cleanup

**Status:** Done, landed on `virgin` (3 commits). **Not yet pushed to `origin/virgin`** — see Known follow-ups.

## What this cycle did

Cleaned up the 7 top-level markdown files (CLAUDE.md, GLOSSARY.md, HOW-THE-APP-IS-BUILT.md,
IDEAS.md, OPEN-ITEMS.md, README.md, STATE.md) against two problems found during a chat audit
that preceded this cycle: plain staleness (facts that drifted since virgin-cycle2/3/4 landed)
and "main-branch leftover" (content that was never actually written for `virgin` — GLOSSARY.md
and HOW-THE-APP-IS-BUILT.md were literally the pre-branch-cut `main` files, dated a week before
`virgin` existed, and referenced a mockup file, old cycle numbers, and a "team" of named agent
roles that don't exist on this branch). See `CONTEXT.md` for the full framing.

Ran fully autonomously (Nathan away) — every ambiguity was ruled on by a fresh Fable pass using
precedent rather than escalated, per his instruction. See `BRIEF-root-docs-cleanup.md` and
`BRIEF-fixes-round2.md` for the exact anchored edits and rulings.

## Result

| Item | Outcome |
|---|---|
| GLOSSARY.md | Rewritten from scratch, virgin-native (way/route inversion fixed, mockup/team/old-cycle references dropped, Sport/Results/Timing-mode/Reset-to-virgin/Preview/legacy-virgin added) |
| HOW-THE-APP-IS-BUILT.md | Rewritten from scratch, virgin-native (current tab list/shapes, mockup paragraph dropped, engine-parity claim honestly hedged) |
| STATE.md | 13+ anchored edits: test count, vocabulary section, multi-sport note, build7 outcome, cycle-history footer |
| OPEN-ITEMS.md | Rewritten: cycles 1-4 reconciled, main-backlog carryover cut (WP-G shipped-seed item, stale battery-A/B question, Nathan's-own-catalog triage) |
| README.md | `data/` tree, `cycles/`, `briefs/` (legacy) added; briefs date corrected |
| `data/strava_export-20260814.zip` | Moved to `safe_to_delete/` — the one physical main-branch artifact actually on this branch |
| `data/README.md` | Found to be main-branch leftover during inspection (described a 624-ride archive/analysis pipeline/Navigation-Engineer role none of which exist here) — rewritten |
| `app/README.md` | 1-line fix (stale section reference) |
| CLAUDE.md, IDEAS.md | No changes (confirmed clean / Nathan's own file, per convention) |

Two inspection passes (fresh-context Fable each time) found and closed 7 substantive issues
plus 7 single-character text corruptions introduced during the fix commit itself — all now
fixed and independently re-verified.

## Known follow-ups (left for Nathan / a future cycle — not blocking, all logged)

- **Push blocked.** `git push origin virgin` failed from this device (`403 from proxy` —
  network restriction on this machine's connection to GitHub, not a repo/auth problem). All
  three commits are local on `virgin`, 3 ahead of `origin/virgin`. Push manually when convenient
  (e.g. GitHub Desktop or a native terminal, per the git-lock note in CLAUDE.md rule 7).
- **Concurrent session left untouched.** While this cycle ran, a separate in-progress session
  was mid-flight on the seed-default flip (`app/src/store/seed.ts` → `'empty'` by default,
  `dev-virgin.*` retirement, new `tests/seedmode_pin.ts`, `cycles/virgin-cycle4/*` doc updates)
  — still uncommitted as of this cycle's last commit. This cycle deliberately did not touch,
  stage, or commit any of those files; STATE.md and OPEN-ITEMS.md now explicitly flag that work
  as "landed in the working tree, uncommitted" with a tracked Housekeeping item, so it won't be
  silently lost, but someone still needs to commit it.
- **`product/` docs likely have the same leftover pattern.** `product/DATA-MODEL.md` and
  similar predate the WP-3 vocabulary inversion and the WP-1 sport field — flagged during the
  audit as the next candidate if this cleanup is worth extending one level down.
- **`design/` currency unverified** against the ROUTES/RESULTS tab work from cycle2/3 — not
  checked in this cycle.

## Commits

1. `eeab73f` — root-doc cleanup (round 1)
2. `210abdd` — fix round: parity claim, Lock entry, data/README.md rewrite, commit-status flags (round 2, addressing the round-1 Inspect findings)
3. `9497f66` — fix the 7 single-character corruptions the round-2 commit introduced (found by the final Inspect pass)

## Verification (confirmed independently at every inspection pass, most recently after commit `9497f66`)

- `cd app && node --experimental-strip-types tests/run.ts` → 560 tests, 557 pass, 0 fail, 3 skip
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0
