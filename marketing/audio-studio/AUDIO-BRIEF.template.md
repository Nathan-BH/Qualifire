# <scene> — audio brief

**Visual source:** `../../silent-studio/<scene>/rounds/vN/<scene>_vN.mp4` (<duration> s)
**Filled in by Nathan on:** <date>   **Status:** draft | ready for soundv1 | revised for soundvM
**Current soundtrack round:** none | soundvM (`soundvM/FEEDBACK.md`)

Claude fills the first three columns from the composition's timeline and from what
`soundtrack.py` currently plays. Nathan writes in the last column — plain words, references
welcome ("like the Mario Kart star", "a single soft click", "nothing"). Leave a cell blank to
mean "your call". Write `silence` to mean exactly that.

## Beats

| # | Time (s) | What happens on screen | Sounds like now (Claude) | What I want here (Nathan) |
|---|---|---|---|---|
| 0 | 0.0–1.0 | | | |

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
