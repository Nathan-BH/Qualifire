# Cycle 01 — first slate

## Goal
Build the brand teaser, get Nathan's feedback, then build the rest of the slate's cheap/unblocked ideas.

## Delivered
- **teaser** (idea 2, "Reframed") — revised per feedback; composition source is done, but its render at `hyperframes/teaser/renders/teaser_2026-09-09_09-14-01.mp4` predates the revision and needs a fresh render (see Open items below).
- **gate** (idea 1, "The Gate") — built at `hyperframes/gate/`; not yet rendered.
- **purple** (idea 4, "Why purple is rare") — built at `hyperframes/purple/`; not yet rendered.
- **tour** (idea 3, "Qualifire, a tour") — built at `hyperframes/tour/`, restructured; not yet rendered.

## Feedback
Full record in `IDEAS-AND-FEEDBACK.md`. Summary of what drove this cycle's changes:
- Teaser: the mark shrinking to a corner badge and growing back read as unnecessary motion — "better to fade it out and just let the name + tagline fill its place" / "just fade it in instead of bringing it from the corner".
- Teaser: the preview console repeated `gsap_exit_missing_hard_kill` StaticGuard errors on 3 elements — a real contract bug, not cosmetic, fixed via the `.inner`-wrapper + hard-kill pattern (now used as the default for every new composition too).
- Idea 3 ("a tour"): the original site-scroll-cut-sequence approach was dropped in favor of a 6-beat abstract narrative built from the app's own mechanics (route draw, gates, ranking, tower) rather than literally filming the website.
- Idea 3, hero beat: "Lets just have the yellow start button because it is universally understandable" — no kicker text, no explanatory paragraph.
- Idea 3: colour/tier explanation, sport choice, and day/night mode were deliberately left out of this video — idea 4 already covers colour — and Nathan's "seems fair?" was treated as agreement to that split.
- Idea 7 ("P2 of your last 10") was retired as a standalone piece and folded into idea 3's ranking-reveal and tower-fill beats instead.
- Idea 4 ("Why purple is rare") was built exactly as originally spec'd; Nathan asked to see it before judging, so it's still awaiting his feedback.

## Changes made
- **Teaser fade-transitions fix:** mark now fades out in place at 2s (no shrink-to-corner) and fades back in centered for the endcard at 10.6s (no travel).
- **Hard-kill bug fix:** every clip in the teaser (and, from the start, in gate/purple/tour) wraps its content in a `.inner` div; every exit fade ends exactly at the clip boundary followed by a `tl.set` hard kill, clearing the 3 `gsap_exit_missing_hard_kill` StaticGuard errors.
- **Idea 3 restructure:** rebuilt from a site-tour cut sequence into the 6-beat abstract narrative described above.
- **Idea 7 retirement:** folded into idea 3's beats 4 (ranking reveal) and 5 (tower fill); no standalone composition.

## Superseded
- `marketing/HYPERFRAMES-PLAN.md` → moved to `marketing/PLAN.md` (edited this cycle).
- `marketing/HYPERFRAMES-IDEAS-DETAILED.md` → moved to `marketing/cycles/01_first-slate/IDEAS-AND-FEEDBACK.md` (untouched).
- `marketing/VIDEO-EDITING-GUIDE.md` → moved to `marketing/guides/VIDEO-EDITING-GUIDE.md` (untouched).
- No renders were superseded this cycle — no new renders landed to supersede the existing teaser render (see Open items).

## Open items
Rendering could not be completed this session — `device_bash` (the bridge to Nathan's PC) was unreachable for the whole run, so `teaser` needs a fresh render and `gate`/`purple`/`tour` have never been rendered. Exact commands and the two related stale-duplicate files are logged in `OPEN-ITEMS.md`.

## Next
Cycle 02 starts once Nathan reviews all four renders (teaser's revision, plus gate/purple/tour for the first time) — which first requires the pending render pass above.

## Superseded by the per-composition round scheme (2026-09-09, later same session)
All four renders landed later this same day, and feedback tracking moved to
a finer-grained scheme: each composition now has its own
`hyperframes/<comp>/rounds/v1/FEEDBACK.md` (render copy + a detailed,
timestamped description + a place for Nathan's notes), indexed from that
composition's own README. This cycle folder is kept as the historical
record of what round 1 actually delivered and why — see the top-level
`marketing/README.md` for where feedback lives going forward.
