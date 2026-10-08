# virgin-cycle26 — Home-to-Home tours and self-overlapping routes

**Created:** 2026-10-07
**Status:** briefs 01,02,05,06,03,04 executed in the working tree (uncommitted, not published). Final Opus inspect PASS WITH NOTES. 954 tests, 951 pass, 0 fail, 3 skip; tsc 0. Awaiting Nathan on-device check.

## Tier rule for this cycle (Nathan, 2026-10-07)
Haiku / Sonnet only for digesting and note keeping. Fable does the planning at night, off peak.
Nothing is executed until Fable has written briefs and Nathan has seen them.

## The question
Qualifire is built around A-to-B routes (start landmark -> end landmark, e.g. home -> station).
How should it work for people who do not go A-to-B:
1. Runners on a tour from Home to Home (loop / out-and-back, start and end are the same place).
2. A tour that overlaps itself, e.g. you run out of your street, loop around, and come back the
   same way, so the first and last portions cover the same ground, possibly for a big share of it.

## Files
- `00-nathan-ideas.md` — Nathan's words, verbatim-ish, plus open questions. Nathan's to steer.
- `01-loop-and-overlap-digest.md` — what the code does today with loops / same start+end / overlap (Haiku digest).
- `NOTES.md` — running notes and brainstorm log (append only).

## Plan landed (Fable, 2026-10-07 night / 2026-10-08 00:xx local)
- `05-plan.md` — the design. Nathan's rulings applied: no warnings ever; `loop` pill in GOING TO (the ONE new string); pass-aware vertex pick in core (`passVertex`) so loops cannot FINISH at t = 0 and the offline projector (results, selfs, replay) sees the same pass as the live ride; gate seeding slides off retraced ground and stops are located in ride order; the map draws the pass the rider is not on at 0.3 opacity (LIVE / DEMO / REPLAY, one `progressM` prop) and the editor tap cycles stacked gates.
- Briefs: `06-brief-01-record-picker-loop.md`, `06-brief-02-engine-pass-aware.md`, `06-brief-03-gates-retraced-ground.md`, `06-brief-04-map-pass-display.md`. Order and parallelism: `EXECUTION-ORDER.md`. Rules: `EXECUTOR-RULES.md`, `INSPECTOR-RULES.md`.
- `superseded-2026-10-07-first-plan/` — the interrupted first Fable pass (03-plan + 04-briefs), kept for the record, NOT to be executed; its engine design is carried into brief 02 with re-verified arithmetic.
- Open for Nathan (plan §9): Q1 demo fixture with a retraced street? Q2 opacity 0.3 / 240 m tuning? Q3 pill word `loop`?
- Nothing executed yet; nothing committed.
