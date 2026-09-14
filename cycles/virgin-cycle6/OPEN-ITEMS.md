# Cycle virgin-cycle6 — open items (post-run review)

## 1. Blocker

`device_bash` (a real shell on your PC) was unreachable for the whole session — same
"Plan9 drive shares" / Sept-8-Windows-update outage as other recent cycles. The fallback
tools (`device_list_dir` / `device_stage_files` / `device_commit_files`) read and wrote every
file this cycle needed, including brand-new files, and that's how all three briefs got
built. What they **cannot** do is run `tsc`, run the test suite, run `git`, or run PowerShell.

**Consequence: nothing in this cycle is committed.** All the code and doc changes below are
sitting on disk, unstaged, on your PC right now. The block below is what you run, in order,
to verify and commit them.

## 2. Script to run (one block, in order)

Open PowerShell at the repo root and close anything with `app/` files open (VS Code, an Expo
dev server) so nothing locks a file mid-edit.

```powershell
cd "C:\Users\natha\Claude personal projects\Qualifire"

# Step 0 — prior-art check that never got to run this session (BRIEF-live-self-racing.md
# Task 0). It's a read-only git-grep against the `main` branch; if it turns up an existing
# ghost/self/replay implementation there, stop and flag it back before trusting the rest of
# this — porting would have been cheaper than what got built, and that call needs a Plan pass.
$env:GIT_OPTIONAL_LOCKS = "0"
git grep -n -i -E "ghost dot|self dot|selfs|race (against|your)|replay.*dot" main -- app/src app/core product IDEAS.md
git show main:product/BACKLOG.md   | Select-String -Pattern "ghost|self|replay|race"
git show main:product/DECISIONS.md | Select-String -Pattern "ghost|self|replay|race"
git grep -n -i -E "ghost|self|replay|race" virgin -- app/src app/core/src IDEAS.md

# Step 1 — verify. Expect: 586 tests, 583 pass, 0 fail, 3 skip; tsc prints nothing and exits 0.
cd app
node --experimental-strip-types tests/run.ts
./node_modules/.bin/tsc --noEmit
$LASTEXITCODE
cd ..

# Step 2 — sanity-check what changed before staging it.
git status --short

# Step 3 — commit by name (never -A/.). One commit for the whole cycle: base feature +
# both Inspect passes' fixes + the Q1-Q3 follow-up + gates-white (gates-white and the
# self-dot layer landed in the same file, wayMapView.tsx, so they can't be split into two
# commits without hand-editing — see judgment call #1 below).
git add app/src/ui/selfRaceModel.ts app/src/store/derive.ts app/src/live/engine.ts `
        app/src/ui/wayMapView.tsx app/src/ui/liveView.tsx app/src/ui/RecordScreen.tsx `
        app/src/ui/settings.tsx app/src/ui/theme.ts `
        app/tests/selfrace_suite.ts app/tests/run.ts app/tests/live_colour_suite.ts `
        STATE.md GLOSSARY.md OPEN-ITEMS.md `
        cycles/virgin-cycle6/README.md cycles/virgin-cycle6/QUESTIONS.md `
        cycles/virgin-cycle6/OPEN-ITEMS.md `
        cycles/virgin-cycle6/BRIEF-self-racing-followup.md cycles/virgin-cycle6/BRIEF-gates-white.md `
        cycles/virgin-cycle6/COMMIT-MSG-live-self-racing.txt
git commit -F cycles/virgin-cycle6/COMMIT-MSG-live-self-racing.txt
git log -1 --stat
```

If a `.git\index.lock` shows up mid-run: `Move-Item .git\index.lock ".git\index_lock_stale_$([int](Get-Date -UFormat %s))"` and retry — never delete it. Push is expected to fail
(403 from the proxy, seen on prior cycles); that's fine, don't retry more than once.

The commit message is already written to `cycles/virgin-cycle6/COMMIT-MSG-live-self-racing.txt`
so `git commit -F` just uses it — nothing to type. If `git status --short` shows anything
outside the list above, stop and say what it is rather than adding it blind.

## 2a. On-device checklist (once it's on your phone)

From `OPEN-ITEMS.md`'s Task 8 (unchanged by the follow-up, colours/positions added):

1. Blank install (or SETTINGS → DATA → Reset to virgin). Name a sport, ride a short loop,
   name the endpoints at STOP → way created, ride 1 = reference. **Expect: no self dots at
   any point of ride 1.**
2. Ride 2. **Expect: one purple dot**, parked at the START gate until you cross it, then
   moving; finishes where you finished last time; a `P1` or `P2` appears under the map once
   you cross START.
3. Ride 3. **Expect: two dots** — one purple, the other green or yellow depending on the
   window's mean (see judgment call #2). Confirm the purple one is the faster of the two
   (RESULTS tab ranks them).
4. Keep going as convenient; at ride 11 **expect nine dots, never ten**.
5. Toggle `selfDots` off mid-ride → dots (and the P-number) vanish next frame; on → back
   within a second.
6. Two dots overlapping: the faster one should render on top (`circle-sort-key`) — confirm
   this actually looks right; see judgment call #3, this is the one thing that couldn't be
   rendered and checked this session.
7. By eye: is a yellow dot legible sitting on the yellow route line (dark casing stroke was
   added specifically for this)? Is the white gate tick legible against the daylight
   (light-grey positron) basemap?

## 3. Judgment calls for your review

1. **Gates-white and self-racing share one file (`wayMapView.tsx`), so they're one commit,
   not two.** The original gates-white brief asked for its own commit; that's only possible
   with a partial-file `git add -p`, which is more error-prone than one combined commit with
   a message that says plainly what's gates-white and what's self-racing (which it does).
2. **Green/yellow self-dot split is by the window's arithmetic mean, not a fixed rank band
   or the median.** You asked whether P1 is always purple and P2–5/P6–9 always green/yellow —
   no: P1 is always purple, but the green/yellow line falls at the mean lap time of the
   loaded selfs, so the count on each side moves with how spread out your times are (one
   slow outlier pulls more dots green; one freak-fast day pushes more yellow). This is
   deliberate — it's the exact same rule the app already uses to colour every sector and lap
   chip elsewhere, reused rather than inventing a second convention. Full detail and the math
   argument for why full-window vs. "you vs. the other 8" give the same answer are in
   `QUESTIONS.md`'s Q1 ruling.
3. **Stacking direction (P1-on-top vs. P9-on-top) is implemented as P1-on-top and could not be
   rendered to confirm.** MapLibre's `circle-sort-key` is the right mechanism (verified against
   the installed style-spec types, and it's a real per-feature z-order control, not reliance on
   array order) — but nobody in this session could actually see two dots overlap on a map.
   If it reads backwards on your phone, it's a one-token flip (`100 - rank` → `rank`).
4. **Live position `P4` counts selfs still physically ahead of you on the route (by chainage),
   not by lap-time gap.** It updates continuously as you ride rather than jumping only at
   gates, which matches what the dots on the map are already showing you. It hands over to
   the existing "P3 of 10" chip the moment your own lap finishes.
5. **Gate ticks: only the unscored fallback colour changed (neutral yellow → white); the
   opacity was also bumped to full (was 0.6, a translucency that existed only to distinguish
   an unscored tick from a genuinely yellow-tier one — that distinction is now moot, see #6).
   The PNG map rung and the free-ride "gates only" circle view were deliberately left
   unchanged** (white would be invisible on the PNG rung's light frame; the free-ride circles
   are a different "crossed/not crossed" indicator, not a tier marker) — flagged, not fixed.
6. **The gate-tick `colour` GeoJSON channel (for a future per-gate score colour) was kept,
   not deleted**, even though nothing supplies it today and your own rule (`STATE.md`, cycle2
   WP-E) retired gate tier-colouring back on 2026-09-05. Deleting that dead branch and the
   `gateColours` prop entirely is a small separate chore if you'd rather clean it up now
   rather than leave it as an inert stub.

## 4. Not done / not in scope this cycle

- No render, no on-device run, no git write of any kind — see Blocker. Everything above is
  source on disk, verified by test suite + strict tsc in a separate sandbox (not your PC) and
  by hand-tracing/mutation-testing the new logic — not by actually running the app.
- DEMO-tab selfs, a GPS simulator, an off-screen ahead/behind edge indicator, per-self
  labels, selfs on the ride-detail (post-ride) map, free-mode selfs, anything on the PNG
  rung, renaming `ghostsFor` — all explicitly out of scope per the briefs' Rulings, not
  overlooked.
- Root `STATE.md`/`GLOSSARY.md` are already updated as part of this cycle's own scope (not
  deferred, unlike the marketing-cycle precedent this file's format borrows from).

## 5. Fresh-context inspection: what it caught, before either brief reached you

Per the project's model-tier protocol, two separate fresh-context Fable passes (no memory of
the planning/execution conversation) checked the landed code by reading it and, where a
working sandbox allowed, by actually running the suite and `tsc` and mutation-testing the new
logic (not just skimming) — `device_bash` being down meant nothing on your own PC could be
exercised automatically, so this was the strongest verification available this session short
of you running it yourself.

**Pass 1 (base feature, `BRIEF-live-self-racing.md`) found and fixed 4 real defects:**
1. Neutral self dots used a static near-white colour (`colors.ink`) that would have been
   effectively invisible on the daylight basemap — changed to the theme-aware `t.text`.
2. A caching bug: a self's cached lap time didn't re-read after flipping SETTINGS → Timing
   between raw/moving, so the purple ("best") dot could disagree with the colour model —
   fixed, with a regression test that fails on the old code and passes on the new.
3. The matching gap on the screen side: `RecordScreen.tsx`'s self-loading effect didn't
   depend on the timing setting either — added.
4. A test for fix-decimation was passing by a 7.5×10⁻⁸ m floating-point coincidence rather
   than by design — widened the test's margin so it's deterministic.

It also confirmed the R1–R9 rulings (time units, gate-crossing replay logic, mount order, the
window/ranking reuse, naming) were implemented correctly by tracing the arithmetic by hand
and, separately, by actually running the test suite (572→573 tests) and a strict `tsc` pass
in its own sandbox.

**Pass 2 (follow-up, `BRIEF-self-racing-followup.md`) found zero production-code defects** —
only two test-coverage gaps, which it closed itself (both under Nathan's ~10-line chore
threshold, no separate round needed):
1. The loader's chainage-to-fix alignment test only checked that a chainage value existed on
   each kept fix, not that it was the *right* one — a reversed or off-by-one array would have
   passed. Verified by mutation (both bad versions did pass the old test) that the actual
   production loader is correctly aligned, then strengthened the test to check each fix's
   chainage against an independently-derived value.
2. The live-position test's boundary case (`>` vs `>=` when a self is exactly level with the
   rider) was untested — added a level-self case.

Both passes independently verified the tier-colour rule, the rank/stacking logic, the
chainage plumbing, and every UI null-safety branch by hand and, for pass 2, by running the
full 586-test suite and a strict `tsc` pass for real. Neither treated the two on-device-only
questions (stacking direction, colour-legibility) as resolvable without a phone — both are
carried forward as judgment calls above, not silently decided.

## 6. Tier readout (this cycle)

| Tier | Model | Tokens (subagent-reported) | Outcome |
|---|---|---|---|
| Execute — gates-white (attempt 1) | Sonnet | 104,079 | Correctly stopped on ambiguity; no edits made |
| Execute — live-self-racing (base) | Sonnet | 77,362 | Built; committed to disk (not git) |
| Plan/re-plan — gates-white escalation | Fable | 120,025 | Root-caused the stop condition (retired tier-colour channel) → corrected, execution-ready change |
| Inspect — live-self-racing (base) | Fable | 256,863 | 4 real defects found and fixed |
| Plan — self-racing follow-up (Q1–Q3) | Fable | 196,384 | Investigated tier convention, MapLibre stacking, chainage plumbing, pause semantics → execution-ready follow-up brief |
| Chore — gates-white (corrected version) | Sonnet (coordinator, direct) | — (~30 lines, no subagent) | Applied directly per the ~10-line chore rule |
| Execute — self-racing follow-up | Sonnet | 224,379 | Built; committed to disk (not git) |
| Inspect — self-racing follow-up (attempt 1) | Fable | 227,787 | Cut off by a session rate limit mid-pass; no findings lost (redone from scratch) |
| Inspect — self-racing follow-up (attempt 2, complete) | Fable | 247,377 | 0 production defects; 2 test-coverage gaps closed; full suite + strict tsc run for real in sandbox |

**Total this cycle:** ~1.45M subagent tokens across 9 dispatches (2 Sonnet execute attempts
on gates-white — one stopped, one chore done directly instead; 2 Sonnet execute on
self-racing; 4 Fable Plan/Inspect passes, one of which needed a retry after a rate limit).
