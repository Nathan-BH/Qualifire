# Cycle 11 — colours v4: the real ranking tower hosts the Today climb

**Status (2026-09-16): source landed, inspected, not yet rendered.**

## What this cycle covers

Feedback on cycle 10's `colours_v3.mp4`: "The animation is good but the layout is
not what i had in mind. I wanted to use the 'actual ranking tower' from
ranking_v7.mp4. With the dates and times associated. And that the 'today' ride,
is the one that goes through the three positions like the current colours_v3.mp4
does." Confirmed with Nathan before building: keep v3's climb/colour-change
mechanic, but replace the generic placeholder tower with `ranking/`'s actual
tower — real card chrome, header, numerals, and all ten real date/time rows —
and make the "Today" row the one performing the three-stage climb.

Landed as `colours/rounds/v4`: card/header/numerals/row markup and CSS ported
verbatim from `ranking/index.html` (read-only reference, itself untouched). The
ten static rows show ranking's real dates/times unchanged. "Today" enters hidden
below row 10 and climbs to rank 7 at t=4.0s (lands 4.7s, flips to #F5C542), rank 3
at t=9.0s (lands 9.7s, #00D000), rank 1 at t=14.0s (lands 14.9s, #9000C8) — same
beat timings/rise durations/flip-on-landing mechanic as v3. Today's displayed
time swaps (stacked spans, opacity toggle, not text mutation) at each beat's
departure to a value chosen to land correctly against its new real neighbours:
18:01.3 (rank 7, between 26 Aug 17:55.4 and 24 Aug 18:07.1), 17:19.4 (rank 3,
between Sat 17:15.0 and 3 Sep 17:24.6), 16:58.2 (rank 1, faster than Mon's
previous-best 17:02.8). The dashed "avg" marker stays between slots 5/6 (the
real ten-ride mean, 17:52.7, genuinely falls there); its label now sits just
outside the card's right edge since real row content fills the width a label
used to sit in. Caption band, timing, and 19.0s duration are byte-identical to
v3. No map/route/rider/start-button content was ported.

## Implementation order and why

Ran the full model-tier protocol (a real design revision, not a mechanical fix):

1. **Plan (Fable).** Given both full files (colours/v3 and ranking/, already in
   context from cycle 10 — no fresh Digest needed) plus Nathan's feedback and the
   coordinator's confirmed restatement of it, designed the merged v4: resolved
   card/header verbatim-reuse, computed the three concrete "Today" times against
   real neighbouring times, chose `top`-tween displacement (matching what v3
   already did), recomputed the avg-marker position for the new row geometry,
   and wrote a fully concrete executor brief with an occupancy table.
2. **Execute (Sonnet).** Landed the brief, created `rounds/v4/`, appended a v4
   README row. Ran its own verification (leftover-markup grep, caption-band
   diff against the v3 backup, node --check, hand-traced occupancy, ranking-
   untouched check).
3. **Inspect (Fable, fresh context).** Independently re-derived the full GSAP
   timeline and occupancy at every checkpoint (hand-simulated GSAP's easing
   since the CDN wasn't reachable to actually run it), re-diffed the caption
   band and the ten real rows against `ranking/index.html` byte-for-byte,
   independently verified Today's three times actually fit their new
   neighbours at each landing (recomputing from its own occupancy trace, not
   trusting the brief's claim), checked the avg-label coordinate space by
   hand, and confirmed `ranking/` untouched via git. **Verdict: CONFIRMED** —
   no code/animation defects. Found two documentation inaccuracies in
   `rounds/v4/FEEDBACK.md` (a false claim that displacement changed from `y`-
   to `top`-tweens — it didn't, v3 already used `top`; and "ten rows" where
   only nine survive after 12 Aug drops off).
4. **Two doc nits, fixed directly by the coordinator (no subagent).** Both
   corrected in `FEEDBACK.md`, under the ~10-line chore threshold.

## What shipped

| File | What it is |
|---|---|
| `silent-studio/colours/index.html` | Live v4 source. Real ranking-tower chrome/rows/dates/times host the three-stage Today climb. Caption band byte-identical to v3. |
| `silent-studio/colours/rounds/v4/index_v4-source.html` | Frozen snapshot, identical to the live file. |
| `silent-studio/colours/rounds/v4/FEEDBACK.md` | Round doc: Nathan's v3 feedback, what changed, what to check, corrected per the inspector. |
| `silent-studio/colours/README.md` | v4 row added; v1-v3 rows untouched. |

`silent-studio/ranking/index.html` was not modified — confirmed via git status/diff and independently re-checked by the inspector.

## Model-tier readout

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Plan | Fable | Design the real-tower + three-climb merge from the two full files already in hand; write a concrete executor brief | 95,368 | Brief complete: card/header verbatim reuse, three Today times computed against real neighbours, occupancy table, avg-marker recompute. |
| Execute | Sonnet | Land the brief on `colours/index.html`, create rounds/v4, update README, stop-on-ambiguity | 111,757 | Landed; all of its own checks passed; one expected open note (avg-label placement) logged for Nathan's eye on render. |
| Inspect | Fable (fresh context) | Independently re-derive the full timeline/occupancy, re-diff rows against ranking/ and captions against v3, verify Today's times against real neighbours from scratch | 118,365 | **Verdict: CONFIRMED.** Two FEEDBACK.md doc inaccuracies found (false "y->top tween" change claim; "ten rows" instead of nine surviving). |
| (chore) | Coordinator, no subagent | Fixed both FEEDBACK.md inaccuracies | — | Fixed directly, verified by grep. |

## After Nathan reviews (not done here)

See `OPEN-ITEMS.md` for the render command and the one open cosmetic call
(avg-label placement, and the dashed line poking slightly past the card's right
border) — worth a glance on the actual render, not fixed pre-emptively since
it's a judgment call on how it reads visually.
