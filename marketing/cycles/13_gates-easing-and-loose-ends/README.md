# Cycle 13 — gates-saving ride easing, colours polish, loose ends

**Status (2026-09-20): briefed, nothing executed.** Nathan: "make a new cycle in
marketing/cycles for now make some briefs and also add a questionsfornathan file if you
have any questions." No topic was given, so this cycle picks up the real open threads
already sitting in the marketing tree (from a Digest pass over `silent-studio/`,
`audio-studio/` and cycles 09–12) and turns them into Sonnet-executable briefs. Per the
standing rule, nothing stopped to ask a question — every judgment call is either ruled
on below or logged with a default in `questionsfornathan.md`. Every row in the table is
"briefed, not executed"; no `index.html` has been touched, no render has been run.

## What this cycle covers

| # | Item | Brief | Status |
|---|---|---|---|
| 1 | `gates-saving` v7's `RIDE_WARP` pacing is piecewise-**linear**: the rider's speed jumps at every gate, worst at gate 1 (leg 1 runs ~3x the old pace, then slams to ~half of that). Both round-7 FEEDBACK.md files carry "a real easing curve … is the natural follow-up." Replace the linear lerp with a monotone cubic through the *same* anchors. | `BRIEF-gates-warp-easing.md` | **superseded by cycle 14** (`14_ride-loop-surge-and-salamander/BRIEF-gates-surge-pacing.md` moves the gates and the times, so these anchors no longer exist) — Nathan, 2026-09-20, cycle 14 Q5: "cycle13 should not be followed"; do not execute |
| 2 | `colours` v4's two deferred cosmetic calls (cycle 11): the "avg" label sits outside the card's right edge, and the dashed avg line pokes ~10px past the card's right border. Bring both inside. | `BRIEF-colours-cosmetic-polish.md` | briefed, not executed |
| 3 | Loose ends that need no brief: the cycle's render commands (placeholders until 1 and 2 land), and the carried-over housekeeping the Digest surfaced — `all-renders/` on both sides still holds `gates-saving` **v6** although v7 (+ sound v8) is the current pick. | `COMMANDS.md` | collected, not run (Nathan's PC steps) |
| — | Open questions across 1–3, each with the default the briefs assume | `questionsfornathan.md` | open, 2026-09-20 |

**Not in this cycle (existing threads, deliberately left where they are):** the
`colours` and `teaser` soundtracks (`soundv1`/`soundv2`) still lag their silent rounds
(`v4`/`v8`) — a pre-existing audio-studio gap, not re-planned here; the teaser assembly
still doesn't include `colours/`; cycle 08 item 5 (`regen.ps1`, `BRIEF-audio-regen-local.md`)
is still written-not-executed in its own folder; cycle 09's one open check on the
website v2 (Nathan opens `marketing/website/index.html` in a real browser) is a
Nathan-only manual step, already documented in `09_website-v2-content-edits/OPEN-ITEMS.md`.

## Rulings made in this cycle (so nobody re-litigates them)

1. **The `RIDE_WARP` anchors are law; only the curve between them changes.** The whole
   reason `RIDE_WARP` exists is that the rider crosses each gate at the melody's own E5
   onset (5.32 / 7.18 / 9.05 s, verified against `soundtrack_v8.wav` to ~20 ms in round 7).
   The replacement interpolant passes through every anchor exactly, so gate-crossing
   times, sector-recolour times and the audio mux are all unchanged.
2. **Interpolant = monotone cubic Hermite with PCHIP (Fritsch–Butland) tangents**,
   endpoints on their one-sided secants. Concretely specified in the brief, ~15 lines of
   vanilla JS, no library. Chosen over Catmull–Rom / natural cubic (neither is
   guaranteed monotone with these very unequal slopes — a natural spline through these
   anchors would overshoot and could make the rider reverse) and over a hand-tuned
   power-ease per leg (continuity at the joins would then have to be tuned by eye).
   Verified numerically at Plan time: dt/df > 0 everywhere (min 1.92), every one of the
   240 tween steps has positive duration (min 8.0 ms), anchors reproduce exactly.
3. **What easing can and cannot fix.** The first leg's *average* pace (24 % of the route
   in 0.52 s) is fixed by the anchor, i.e. by the music; no curve through the same
   points can slow it. This cycle removes the *discontinuity* (speed 0.46 → 0.21
   route/s instantaneously at gate 1 becomes a smooth glide through 0.35). If Nathan
   wants leg 1 genuinely slower, that is a `RIDE_T0` / anchor change and a new audio
   round — logged as Q1, not briefed.
4. **The fix lives inside `warpTime(f)` only.** Both the rider tweening (`ride()`) and the
   sector recolour (`GATES.forEach`) call it; neither call site is touched, so they
   cannot drift apart again (round 7's "secondary fix" was exactly that desync).
5. **Colours: label comes inside the card, knocked out on the line.** The v4 layout
   (line exits the card, label outboard) reads as a pointer only if it is clean, and
   cycle 11 flagged both halves as possibly-glitch. Ruling: the dashed line stops flush
   with the inside of the card's right border; the label sits *on* the line, left of the
   time-number column, with a `--card`-coloured background so the dashes break around
   it. Exact pixel values and the derivation are in the brief; the "keep it outboard but
   clean" alternative is logged as Q4 with the one-line CSS that would do it instead.
6. **Digest correction — the "owed" start-ride v4 / brandmark/opening v3 renders exist.**
   The Digest read the FEEDBACK.md status lines ("not rendered yet — device_bash was
   unreachable this session"); on disk, `start-ride/rounds/v4/start-ride_v4.mp4` (8.4 MB)
   and `brandmark/opening/rounds/v3/opening_v3.mp4` (201 KB) are both dated 2026-09-10,
   both are mirrored in `silent-studio/all-renders/` and both have with-sound versions in
   `audio-studio/all-renders/`; cycle 08's regression table already lists them as the
   on-disk reference rounds. So nothing is owed to render — only the two status lines
   are stale. That is a coordinator chore (two lines, under the ~10-line threshold), not
   a brief, and not a Nathan step; `COMMANDS.md` says so rather than telling Nathan to
   re-render.

## Implementation order and why

1. **`BRIEF-colours-cosmetic-polish.md` first** — two CSS declarations, no logic, fully
   independent of item 1. If only one thing gets executed soon, this is the cheaper one
   and it closes cycle 11's last open note.
2. **`BRIEF-gates-warp-easing.md` second** — one function replaced, still small, but it is
   the one with math to verify and a new round (`rounds/v8/`) to document. Its Inspect
   pass should re-run the numeric checks in the brief's §6 itself, not trust the
   executor's numbers.
3. **Renders (Nathan's PC)** after each brief lands — `COMMANDS.md` §2 and §3. Order
   between them doesn't matter; they are different compositions.
4. **Housekeeping (`COMMANDS.md` §1)** any time — it does not depend on 1–3, and should
   happen *before* the gates-saving v8 render so `all-renders/` isn't skipped twice.

## What shipped (this folder)

| File | What it is | Executed? |
|---|---|---|
| `README.md` | This file. | — |
| `BRIEF-gates-warp-easing.md` | Ruling + Sonnet-executable brief: replace the linear lerp in `warpTime(f)` with a monotone cubic Hermite (PCHIP tangents) through the unchanged `RIDE_WARP` anchors; the exact code, the precomputed tangents/values to check against, the v8 round docs, verification without a render. | no |
| `BRIEF-colours-cosmetic-polish.md` | Sonnet-executable brief: two CSS edits in `colours/index.html` (`#avg` right edge, `#avg-label` position/knockout) with the pixel derivation so the delta can be sanity-checked before a render. | no |
| `questionsfornathan.md` | Four questions, each with the default the briefs assume if unanswered, plus three informational doc-staleness notes for the coordinator. | open |
| `COMMANDS.md` | Every copy-paste command for this cycle in one place: carried-over `all-renders/` housekeeping, the note that start-ride v4 / opening v3 need no render, and placeholder render/copy/mux sections for items 1 and 2. | not run |

No file outside this folder has been modified by this pass.

## Model-tier readout

| Tier | Model | Mandate | Outcome |
|---|---|---|---|
| Digest | Haiku | read-pass over `silent-studio/gates-saving/index.html` (RIDE_WARP mechanism), both round-7 FEEDBACK.md files, `render.ps1`, composition/round status across `silent-studio/` and `audio-studio/`, cycles 09–12 tails | Digest delivered. One correction found at Plan time by direct disk check: the start-ride v4 / opening v3 renders it reported as owed exist (ruling 6). |
| Plan | Fable | pick the cycle's scope from the open threads, rule on the easing method and the colours layout, write the five files in this folder | Five files written in full. Rulings 1–6 above. Easing math verified numerically at Plan time (node, 100k-point derivative scan + 240-step duration scan). |
| Execute | Sonnet | — | not dispatched. **Plan: written, not yet executed.** |
| Inspect | Fable/Opus (fresh) | — | not dispatched; due after each brief is executed, per the briefs' verification sections. |

## After execution (coordinator follow-ups)

- Write this cycle's `OPEN-ITEMS.md` pointing at `COMMANDS.md` §2/§3 for the render
  steps (don't duplicate the command blocks).
- Fix the three doc-staleness nits in `questionsfornathan.md` "Informational" directly
  (each is one or two lines; no brief).
- Update the two `README.md` round tables (`gates-saving`, `colours`) once the renders
  exist, and both `all-renders/` folders per `silent-studio/structure.md`'s checklist.
