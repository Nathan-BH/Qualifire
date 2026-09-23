# teaser — audio brief

**Visual source:** `../../silent-studio/teaser/rounds/v6/teaser_v6.mp4` (47.6 s)
**Filled in by Nathan on:** *(not yet filled in)*   **Status:** draft
**Current soundtrack round:** none — the scene is silent; soundv3 was withdrawn in cycle 17 (silent renders live in silent-studio); the last audio round on disk is soundv2 (synthesised, reference only)

Claude fills the first three columns from the composition's timeline and from what
`soundtrack.py` currently plays. Nathan writes in the last column — plain words, references
welcome ("like the Mario Kart star", "a single soft click", "nothing"). Leave a cell blank to
mean "your call". Write `silence` to mean exactly that.

Rows below are the sections of the current v6 cut sheet (`../../silent-studio/teaser/rounds/v6/concat.txt`
and `../../silent-studio/teaser/rounds/v6/FEEDBACK.md`) — five back-to-back scene renders, not six; `colours`
was dropped from the cut as of v5 and does not appear here (see `../../silent-studio/teaser/README.md`'s v5
section). Each row's "Sounds like now" mirrors that scene's own current soundtrack round, offset to the
section's start time in this composition (see `../soundtrack.py`'s per-section comments).

## Beats

| # | Time (s) | What happens on screen | Sounds like now (Claude) | What I want here (Nathan) |
|---|---|---|---|---|
| 0 | 0.0–6.5 | Section 1: brandmark/opening (`opening_v3.mp4`, unchanged) | Mirrors brandmark/opening/soundv2: pitch-sweep ring draw, whoosh, two-beat brand stinger (low boom + bright chime) at 2.95/3.35 | |
| 1 | 6.5–20.5 | Section 2: start-ride (`start-ride_v4.mp4`, unchanged) | Faint trailing tail from the opening chord, then silence → click at 9.7s (button press) → riser → driving C-G-Am-F loop at 155bpm from 11.8s | |
| 2 | 20.5–32.8 | Section 3: gates-saving (`gates-saving_v5.mp4`, new gate-draw visual, same 12.3s internal timing) | Whoosh under the zoom-out, Cmaj9 pad hold, then start-ride's loop boosted 165→210bpm with green/yellow/purple gate chimes, Cmaj resolve at 32.2s | |
| 3 | 32.8–43.6 | Section 4: ranking (`ranking_v5.mp4`, new "Today climbs the tower", 10.8s) | Quiet Cmaj9 hold, droplet crescendo (36.0–38.05s) timed to the climb, Purple chime + pad landing at 38.2s, settling into Cmaj resolve | |
| 4 | 43.6–47.6 | Section 5: brandmark/closing (`closing_v3.mp4`, new tight reveal, 4.0s) | Full two-beat brand-stinger reprise (low boom at 43.6s, bright chime at 43.95s) + sustained pad to the end | |

## Whole-scene direction (Nathan)

- **Mood in three words:**
- **Tempo / energy:** (calm · steady · driving · accelerating — or a bpm if you know it)
- **Density:** (sparse · medium · full — how much should be playing at once)
- **Must be silent at:** (timestamps or beats; "none")
- **Reference tracks / sounds:** (anything — a game, a film, a brand sting, a song)
- **Continuity with other scenes:** (e.g. "same loop as start-ride, faster" / "no need")
- **Anything else:**

## How this file is used

1. Claude pre-fills the table when a visual round is approved (or when this file is first
   created for an existing scene), including the "Sounds like now" column if a soundtrack
   already exists.
2. Nathan edits the last column and the whole-scene lines, sets Status to
   `ready for soundv1` (or `revised for soundvM`).
3. Claude edits `soundtrack.py` to match, produces the next `soundvN/`, and in that round's
   `FEEDBACK.md` says per beat what was done with each request.
4. Round-by-round feedback still goes in `soundvN/FEEDBACK.md`; this file only changes when
   the *direction* changes. If a visual re-render changes timings, Claude updates the Time
   column and notes it here.
