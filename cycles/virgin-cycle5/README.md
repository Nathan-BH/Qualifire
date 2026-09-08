# virgin-cycle5 — Root-doc cleanup, then product/design/website review

**Status:** Part 1 (root-doc cleanup) done and landed. Part 2 (product/ docs, `design/`,
website review) is planning only — reviews + briefs written, nothing executed yet, per
Nathan's request ("make briefs for all these tasks").

## Part 1 — Root-doc cleanup (done, landed)

Cleaned up the 7 top-level markdown files (CLAUDE.md, GLOSSARY.md, HOW-THE-APP-IS-BUILT.md,
IDEAS.md, OPEN-ITEMS.md, README.md, STATE.md) against two problems found during a chat audit
that preceded this cycle: plain staleness (facts that drifted since virgin-cycle2/3/4 landed)
and "main-branch leftover" (content that was never actually written for `virgin` — GLOSSARY.md
and HOW-THE-APP-IS-BUILT.md were literally the pre-branch-cut `main` files, dated a week before
`virgin` existed). See `CONTEXT.md` for the full framing, `BRIEF-root-docs-cleanup.md` and
`BRIEF-fixes-round2.md` for the exact anchored edits and rulings. Ran fully autonomously
(Nathan away) — every ambiguity was ruled on by a fresh Fable pass using precedent rather than
escalated, per his instruction.

| Item | Outcome |
|---|---|
| GLOSSARY.md | Rewritten from scratch, virgin-native |
| HOW-THE-APP-IS-BUILT.md | Rewritten from scratch, virgin-native |
| STATE.md | 13+ anchored edits: test count, vocabulary section, multi-sport note, build7 outcome, cycle-history footer |
| OPEN-ITEMS.md | Rewritten: cycles 1-4 reconciled, main-backlog carryover cut |
| README.md | `data/` tree, `cycles/`, `briefs/` (legacy) added; briefs date corrected |
| `data/strava_export-20260814.zip` | Moved to `safe_to_delete/` |
| `data/README.md` | Found to be main-branch leftover during inspection — rewritten |
| `app/README.md` | 1-line fix |
| CLAUDE.md, IDEAS.md | No changes (confirmed clean / Nathan's own file) |

Two inspection passes (fresh-context Fable each time) found and closed 7 substantive issues
plus 7 single-character text corruptions introduced during the fix commit itself.

## Part 2 — product/, design/, and the website (planning only)

Nathan asked for the same kind of audit extended to `product/` (design/spec docs), the
`design/` folder (SVG screen mockups), and the website — which turned out not to exist on
`virgin` at all (it's `marketing/` on `main`, never carried over at the branch cut). Three
things landed as direct actions (small, mechanical, no judgment calls); everything else is
a review + a brief for a future cycle to execute, per Nathan's ask.

**Direct actions taken:**
- Brought `marketing/` over from `main` unchanged (commit `0fb4a1c`) — it exists on `virgin`
  now so it can be planned against. Content itself untouched (still pre-virgin framing).
- Dropped the "uncommitted" flags in STATE.md/OPEN-ITEMS.md now that Nathan committed the
  virgin-cycle4 tail himself as `09a0aa0` while this session was running (commit `eb2e2da`).

**Reviews + briefs written (no execution — these are for a future cycle):**

| Domain | Review | Brief | Status after round 2 (2026-09-08) |
|---|---|---|---|
| `product/` docs | `REVIEW-product-docs.md` | `BRIEF-product-docs-cleanup.md` (11 doc WPs P0-P10, non-doc WPs NW-1..5) | **All execution-ready** — doc WPs (P0-P10) and NW-1/2/5 (NW-1 unblocked 2026-09-08 via `QUESTIONS-FOR-NATHAN2.md`; run NW-1 as its own code dispatch, separate from the doc-only WP-P0-P10 commit). NW-3/4 remain conditional. |
| `marketing/` (website) | `REVIEW-website.md` | `BRIEF-website-improvement-plan.md` (positioning ruled, hero ruled, no-regrets fixes, HYPERFRAMES rescoped) | (a) ruled (Option 2, "Same road. New meaning."), (b)/(c) execution-ready. (d) rescoped to a plan-only restructure, explicitly not a priority. |
| `design/` | `REVIEW-design-folder.md` | `BRIEF-design-folder-plan.md` (D0-D6, D5.0 added) | D0-D4/D6 execution-ready. D5.0 (comparison collages) execution-ready, added per Nathan's Q8 answer; D5 itself (the actual pick) still waits on him seeing them. |

**`QUESTIONS-FOR-NATHAN.md`** collects every open question across all three briefs that needed
an answer before execution (8 questions: a code-ruling reconfirmation, the website's
positioning, the hero line, HYPERFRAMES disposition, and the two parallel unresolved palette
explorations, plus a couple of small parked-or-drop calls). **Answered 2026-09-08** — all three
briefs below have been updated to match. One answer (Q1, the colour-model ruling) opened a real
technical fork that needed a second pass rather than a straight brief edit:
**`QUESTIONS-FOR-NATHAN2.md`** was written, answered, and applied 2026-09-08 — NW-1's colour
model is now finalized (reference ride: neutral, ranked, not scored) and every brief is
execution-ready. One `[ASSUMPTION]` logged in NW-1 itself (a literal reading of Nathan's answer
vs. the mechanically simplest one) — flagged for the executor to re-check, not a blocker.

**Headline findings worth reading even before picking a brief up:**

- **A real bug, not just doc drift:** STATE.md's ground rule says D-045 removed the "fewer
  than 5 rides stays neutral" noise floor, but `MIN_HISTORY = 5` still gates every colour and
  rank in code (`colourModel.ts`, `towerSource.ts`, `rideDetailModel.ts`). A stranger using the
  blank-seed Preview sees no colours at all for their first 5 rides on a route — this
  contradicts the "hand it to someone else" goal. Logged as NW-1 in the product-docs brief;
  needs Nathan to reconfirm the ruling before it's coded.
- **`design/canonical/`'s generator script would crash if run today** — it imports
  `app/assets/routes/routes.json` (renamed to `ways.json`) and `ResultScreen.tsx` (no longer
  exists, replaced by the RESULTS tab work). Regenerating the screen mockups isn't a
  push-button re-run right now; the script needs fixing first (D0 in the design brief).
- **The website's "Try it live" link is dead** (`../demos/mockup.html` doesn't exist on
  `virgin`), and two other claims are wrong regardless of any positioning decision: it
  describes "E-major earcons" that were never built (the app vibrates instead), and its
  timing-tower mockup shows a "Reference lap / REF" concept that doesn't match how reference
  rides actually work on this branch. These are no-regrets fixes, independent of the bigger
  personal-vs-shareable positioning question.
- **Two open palette decisions, never closed:** `design/drafts/` (SVG mockup palettes) and
  `product/brand/palettes/` (brand board palettes) both did the exploration and passed their
  own checks, but nothing records which one (if any) Nathan chose. Both briefs surface this
  as a decision only Nathan can make — nothing here decides it for him.
- **A dangling reference confirmed real this time** (unlike the false-alarm CONCEPT.md one
  from Part 1): `product/README.md` lists `BACKLOG.md`, `DECISIONS.md`, and a `superseded/`
  folder as "live" — all deleted from `virgin` at the branch cut (commit `44e24f1`) and exist
  only on `main`. Every `D-0xx`/`B-xx` id cited across product/ docs is a key into those
  now-absent files.

## Proposed execution order (2026-09-08, all three briefs, all now execution-ready)

Not a strict must-follow, but this is the order that minimises rework and gets the highest-value
fix (the colour model, NW-1) landed before anything downstream references its old behaviour.

**Wave 1 — independent, no cross-dependencies, safe to run in any order or in parallel:**
1. `BRIEF-product-docs-cleanup.md` WP-P0…P10 (product/ doc edits) — one dispatch, one commit.
2. `BRIEF-website-improvement-plan.md` (c) — the 9 no-regrets fixes. Independent of positioning.
3. `BRIEF-design-folder-plan.md` D0 — generator repair. Unblocks D1–D4.
4. `BRIEF-design-folder-plan.md` D5.0 — comparison collages. Independent of D0; hand to Nathan
   as soon as it lands so he can look while everything else keeps moving.

**Wave 2 — the one real app-code change, isolated so a code review is never mixed with a doc diff:**
5. `BRIEF-product-docs-cleanup.md` NW-1 — colour model (`MIN_HISTORY` 5→1). Own dispatch, own
   commit, full 560-test run plus the new n=0/1/2/10 cases. Do this before item 6 below and
   before website (b) / HYPERFRAMES — several downstream doc and copy passages read differently
   once this has actually landed, and doing it late means rewriting them twice.
6. Small follow-up (anticipated in NW-1's own scope): strike the "not yet in code" sentences
   WP-P0-P10 added to CONCEPT.md, DATA-MODEL.md §9 and COLD-START's disposition, now that they're
   true. Bundle into NW-1's commit or right after — a few sentences, not its own dispatch.

**Wave 3 — depends on Wave 1/2 landing:**
7. `BRIEF-website-improvement-plan.md` (b) — the Option 2 copy changes. Sequenced after (c) per
   the brief's own plan, and after NW-1 so the cold-start / noise-floor language can state the
   real (now fixed) behaviour instead of a caveat that needs a second pass.
8. `BRIEF-design-folder-plan.md` D1 — RESULTS mockups (needs D0).
9. `BRIEF-design-folder-plan.md` D2 — re-transcribe changed screens (needs D0; can run alongside
   D1, both only depend on D0).
10. `BRIEF-product-docs-cleanup.md` NW-2 — OPEN-ITEMS.md additions. Small, slots in anywhere here.

**Wave 4 — Nathan's own call, not a dispatch:**
11. `BRIEF-design-folder-plan.md` D5 — the actual palette pick, once he's seen D5.0's collages.

**Wave 5 — deferrable / explicitly lower priority, do when there's slack:**
12. Design D3 — optional extra mockups (catalog_detail, gate_adjust, SETTINGS→SPORTS).
13. Design D4 — optional empty-state mockups.
14. Design D6 — housekeeping; best after D0–D2 so the README rewrite describes what's actually true.
15. `BRIEF-product-docs-cleanup.md` NW-5 — launch-animation options HTML deck. Nathan wants to
    browse ideas, not urgent, not blocking.
16. NW-3 — `design/` currency check. Largely covered by D0–D2 already re-verifying the tree;
    treat as a final confirmation pass rather than fresh work.
17. NW-4 — DATA-MODEL.md refresh, only if WP-P3's own D6 grep (inside WP-P0-P10) turns up a gap.
18. `BRIEF-website-improvement-plan.md` (d) — the HYPERFRAMES-PLAN.md restructure. Explicitly
    not a priority (Nathan's own words); do last, and after NW-1 has landed since ideas 4 and 7
    both cite the colour model directly.

## Commits

1. `eeab73f` — root-doc cleanup (round 1)
2. `210abdd` — fix round: parity claim, Lock entry, data/README.md rewrite, commit-status flags
3. `9497f66` — fix 7 single-character corruptions the round-2 commit introduced
4. `3d8dfb3` — cycle README + token-usage readout (Part 1 close-out)
5. `0fb4a1c` — bring `marketing/` over from `main`, unchanged
6. `eb2e2da` — drop stale "uncommitted" flags now that `09a0aa0` landed
7. (this commit) — add Part 2 reviews + briefs (`REVIEW-*.md`, `BRIEF-*.md`), update this README + TOKEN-USAGE.md

## Known follow-ups

- **Push blocked.** `git push origin virgin` failed from this device (`403` from this
  machine's proxy — network restriction, not a repo/auth problem). Commits are local on
  `virgin`, ahead of `origin/virgin`. Push manually when convenient.
- **Everything in Part 2 is a brief, not a fix.** Nothing under `product/`, `design/`, or
  `marketing/` (besides the unchanged copy-over) has been edited. Pick a brief, or ask for one
  to be executed, when ready.
- **`scripts/OTA-TROUBLESHOOTING.md`** shows as modified in the working tree (not by this
  cycle) — left untouched, looks like Nathan's own in-progress edit for the still-open
  "record build7's fingerprint" item.

## Verification (Part 1 only — Part 2 made no code changes)

- `cd app && node --experimental-strip-types tests/run.ts` → 560 tests, 557 pass, 0 fail, 3 skip
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0
