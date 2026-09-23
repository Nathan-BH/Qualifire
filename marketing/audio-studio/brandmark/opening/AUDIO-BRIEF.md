# brandmark/opening — audio brief

**Visual source:** `../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4` (6.5 s)
**Filled in by Nathan on:** *(not yet filled in)*   **Status:** draft
**Current soundtrack round:** soundv3 (`soundv3/FEEDBACK.md`)

Claude fills the first three columns from the composition's timeline and from what
`soundtrack.py` currently plays. Nathan writes in the last column — plain words, references
welcome ("like the Mario Kart star", "a single soft click", "nothing"). Leave a cell blank to
mean "your call". Write `silence` to mean exactly that.

## Beats

| # | Time (s) | What happens on screen | Sounds like now (Claude) | What I want here (Nathan) |
|---|---|---|---|---|
| 0 | 0.0–1.3 | Ring draws on clockwise | Tunetank piano logo track from t=0: near-silent head, opening D-major chord at 0.67 s halfway through the draw, arpeggio rising from 1.0 s | |
| 1 | 1.3–1.8 | Yellow slash/gate fades in | Arpeggio's last rising steps (1.48) and a G-chord (1.64) as the gate lands | |
| 2 | 1.8–2.15 | Mark holds fully drawn | Chord ringing | |
| 3 | 2.15–2.8 | Mark fades out completely; brief empty black frame | Re-strike at 2.13 as the mark starts to fade; D5+D6 tremolo rings through the empty frame | |
| 4 | 2.95–3.75 | "QUALIFIRE" wordmark fades in | Piece's penultimate re-strike at 2.93 (22 ms before the wordmark) | |
| 5 | 3.35–4.05 | Tagline "Same road. New meaning." fades in, overlapping the wordmark | Piece's last re-strike at 3.25 (97 ms before the tagline) | |
| 6 | 4.05–5.5 | Hold on wordmark + tagline | Decay only (no new attacks): −21 dBFS at 3.75 s falling to −37 at 5.5 | |
| 7 | 5.5–6.5 | Fade to black | Decay −37 → −44 dBFS under the fade; 0.5 s fade to a true zero at 6.5 (the file itself runs to 8.44 s, silent past ~6) | |

*Direction change 2026-09-23 (cycle 16): Nathan supplied the whole soundtrack — the Tunetank piano logo track
(`../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`), started with
the video, nothing synthesised kept. Every "Sounds like now" cell updated; times
unchanged (the visual is still v3). Cycle 15's planned logo-reveal-sample round for this
scene was cancelled and never ran; closing gets a silent round in this cycle.*

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
