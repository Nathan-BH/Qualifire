# Round 3 - why two transcribers disagreed (and why the press list was wrong)

**Trigger.** Klangio's piano2notes gave the opening as **E4, A4, G4** with G4 alone.
The Basic Pitch output gave **E4, A4, then G4 *together with* A4**.

## First: MIDI is not the ambiguous part

A MIDI file is note-on/note-off with tick timestamps. Any reader should produce the same
notes from the same file. The only real variables are the tempo map (ticks -> seconds)
and - this one is the reader's own choice, not the format's - how many milliseconds apart
two notes can start and still count as "pressed together".

The two results were never two readings of one file. Klangio was handed the **mp3** and
ran its own audio-to-MIDI model. Different model, different output from the same audio.
Basic Pitch is general-purpose and instrument-agnostic; Klangio's is piano-specific.

## But the specific discrepancy was a real bug

    A4   starts 1.10   lasts 0.56   ->  ends 1.66
    A4   starts 1.66   lasts 1.15   ->  ends 2.81

Gap: **zero**. That is not A4 struck twice. It is one held A4 that Basic Pitch **cut in
half** - its pitch confidence dipped mid-note (decay, pedal, reverb) so it closed the note
and opened a new one. Klangio kept it whole, which is why at 1.65 s the only *new* press
is G4: the A4 is still ringing from half a second earlier.

`../tools/find_split_notes.py` finds **27 of these** in this file.

The press list then compounded it: notes starting within 0.13 s were grouped as one press,
so the second half of the split A4 landed next to G4 and printed as "press G4 and A4
together" - re-striking a key already being held.

## Fix

`named-keys.html` gained a **Rejoin split notes** toggle (default on): same-pitch notes
separated by less than 0.25 s are merged into one.

| | before | after |
|---|---|---|
| notes | 116 | 89 |
| presses | 70 | 60 |
| opening | E4, A4, G4+A4 | **E4, A4, G4** |

Now matches Klangio. `presses_rejoined.txt` is the corrected list.

Also added, off by default: **Hide faint notes** - drops events under 0.25 s and under
velocity 55 (17 of them), which are mostly reverb tails heard as new notes.

## Rule of thumb

For solo piano, trust Klangio over Basic Pitch - it is purpose-built and does not fragment
held notes. Basic Pitch is fine but always run the split-note check on its output first.
