# WP — Sector-coloured route trail: paint the line behind you in the colours the sectors earned (cycle 025)

**Status: PROPOSAL ONLY. Every item below is labelled UNBUILT — nothing has been implemented,
and no app code was touched in producing it.** Prepared 2026-08-25 from the notes3 review,
which verified against the app code (`Nathan/Nathan's_notes3_review.md`, closing italics,
line 141).

**Confidence:** that this is new — HIGH (review §2, line 27: "No, but it's close to the grain
of what's there"; nothing colours the line per sector today; no matching item in
`product/BACKLOG.md` B-01–B-152, re-checked for this brief). Feasibility — HIGH per the
review's technical argument. **Size: small-to-medium**, deliberately split so the cheap half
lands first.

## The idea, in Nathan's words (2026-08-22, notes3)

Colour the sectors behind you instead of (or beside) the gates — when sector 1 comes back
purple, the gate-1→gate-2 stretch of the line turns purple; at the end of the lap the whole
route is painted in your sector colours. Reviewed in `Nathan/Nathan's_notes3_review.md` §2
(lines 24–37): "you're right that it's the more honest visual — sectors are the scored and
coloured unit; the gate is just the boundary." Technical grain (line 28): the engine knows each
gate's position along the route line, so the behind-line can be split at sector boundaries and
each span painted with the already-computed sector colour. Free-ride mode is unaffected (its
map is gates-only, no line).

## Proposals — all UNBUILT

**P1 — UNBUILT — Build it on the Result / VIEW TRACE map first.** (Small.) The review's own
recommendation (lines 35, 37): the finished-ride map has no live-rendering or battery concern —
"if you want a cheap first taste of the idea, that's the place to build it first." The VIEW
TRACE view already draws the route with today's gate colours (B-57, DONE cycle 016); P1
re-expresses that as sector-coloured line spans. Acceptance: a finished ride's trace shows each
sector's stretch in that sector's earned colour, both themes.

**P2 — UNBUILT — Then the live map, additive to the gate ticks, with a mandatory on-device
both-themes check.** (Small-to-medium.) Three cautions from the review carried as
requirements (lines 30–33):
1. **On-device verification is mandatory, not optional** — the route line has already produced
   one real device-only rendering bug (the dotted-ahead `line-dasharray` revert, 2026-08-24
   hotfix; see STATE.md "Maps" section). Multi-segment coloured line layers are the same class.
2. **Ruled 2026-08-26 (supersedes "additive first, replace maybe later"):** keep the gate
   ticks as markers — they also mark gates *ahead*, which a behind-only trail can't — but
   render them in a neutral/static style: gates no longer carry verdict colours anywhere.
   All sector verdict colour lives on the line spans. (Nathan: "they are gates" — they mark
   boundaries, they don't score.)
3. **No permanent settings toggle by default:** the review's lean (line 33) is trial both
   looks on-device, then hard-pick, keeping settings from accumulating — this is a pure
   rendering preference, nothing about scoring or storage changes.

## Adjacent idea — noted, deliberately NOT folded in

The 2026-08-24 notes proposed colouring the *ridden track* behind the rider (yellow
behind-trail — `qualifire-20260824-review.md`, notes point 3, line 90). That is a sibling, not
the same feature: it draws where you actually went (works on free rides, no route needed),
while this WP colours the *route line* by sector verdict. Neither is tracked in
`product/BACKLOG.md` as of the 2026-08-24 snapshot (stop-on-ambiguity: checked B-01–B-152; if
the behind-trail was filed elsewhere, cite that instead). The behind-trail also carries its own
sequencing note from the 24th ("lands after the crash fix, not instead of it" — see
`WP-maplibre-frozen-id-crash.md` in this folder). Recommendation: the Designer reads both ideas
together when picking up P2 — they compete for the same visual channel (line colour on the live
map) and should be designed as one decision even if only one ships. The behind-trail gets no WP
of its own here because it came from the 24th's review (outside this pass's four source
documents) and its natural home is the same design pass as P2.

## Already tracked nearby — cite, don't duplicate

- **B-57** (DONE) — the VIEW TRACE surface P1 builds on.
- Cycle 024 WP-E + B-141/B-145/B-146/B-147 — the gate-tick rendering and its standing
  on-device visual checks; P2 rides the same check discipline.
- **B-66** — mockup regen obligation if a shipped design change results.
- `WP-live-ghost-position.md` (this folder) — different feature, same screen; if both are
  scheduled in one cycle, one Designer pass should own the combined race-screen picture.

## NEEDS-NATHAN

1. ~~Additive, replacement, or trial-then-pick?~~ — **RULED 2026-08-26: sector segments carry
   the colour; gates stop changing colour.** Nathan: "the gates should not change colours like
   they do now because it does not make sense, they are gates. Just the sector segments
   changing colour is enough." Read as: gate ticks remain as neutral, static gate markers
   (they still mark boundaries and upcoming gates), and ALL verdict colouring moves to the
   sector line spans — on the Result/VIEW TRACE map (P1) and, later, the live map (P2).
   No trial-then-pick, no permanent toggle.

## What this document is not

Not a backlog edit, not a decision, not an implementation. An explicitly UNBUILT proposal set
per `process/CYCLE.md`.
