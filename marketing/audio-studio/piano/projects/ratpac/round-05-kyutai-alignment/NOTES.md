# Round 5 - Kyutai Muscriptor, and why it is so much simpler

Tried `muscriptor.kyutai.org` as a free alternative to Klangio's paid tier. It returns a
real **.mid**, not a PDF. The result is dramatically cleaner than Basic Pitch, and the app
now defaults to it.

    sources/freesound_community-22-musica-ambiente-67854.mid   <- Kyutai output

## Side by side

| | Basic Pitch | Kyutai Muscriptor |
|---|---|---|
| notes | 116 | **51** |
| presses | 60 (after rejoining) | **37** |
| length covered | 43.2 s (all of it) | 39.6 s |
| velocities present | 38-104 | **100, every single note** |
| same-pitch zero-gap pairs | 27 | 3 |
| short + quiet artifacts | 17 | **0** |
| longest held note | 3.97 s | **6.22 s** |
| range | C2 - A5 | C3 - A5 |

## Why the difference - two different kinds of model

**Basic Pitch is frame-based.** It estimates pitch activity per time frame and thresholds
that into notes. Everything that looks like energy at a pitch becomes a note, so:

- overtones become notes (the phantom **G5** at 32.92 s, 0.16 s, velocity 46);
- sub-octave errors become notes (**C2** twice, both ~0.16 s at velocity 43-44);
- reverb tails become notes (17 events under 0.25 s and velocity 55);
- and a sustained tone whose confidence dips mid-note gets **split in two** (27 times -
  this is the round 3 bug).

**Kyutai emits note events directly,** with sustain modelled, so a held note stays one
note and a chord comes out as one block. The giveaway that it is a different class of
model entirely: **every velocity is exactly 100.** It is not estimating dynamics at all -
it outputs pitch, onset and duration, nothing else.

That has a practical consequence: the "Hide faint notes" filter worked on Basic Pitch
precisely *because* its artifacts all sat at the low end of the velocity range. On a
flat-velocity file that filter has nothing to bite on. Only the duration half of it still
applies.

## The rejoin toggle must be OFF for Kyutai

Kyutai has 3 same-pitch pairs with a near-zero gap - but unlike Basic Pitch's, **all three
are real**:

    C3  25.90 +3.67 -> ends 29.57 | next C3 starts 29.57   <- re-struck as part of the Am chord
    A3  29.57 +5.09 -> ends 34.66 | next A3 starts 34.66   <- re-struck as part of the Dm chord
    E4   4.33 +6.22 -> ends 10.55 | next E4 starts 10.67   <- motif restarting

Rejoining them would swallow two chord entries. So **the rejoin default is now tied to the
source**: on for Basic Pitch, off for Kyutai. It was a repair for one model's specific
failure mode, never a general cleanup.

## What the clean transcription reveals

With the noise gone the piece is obvious - a five-note motif, **E4 A4 G4 D4 C4**, stated
four times, with chords arriving underneath in the second half:

    0.4 s   motif           (alone)
    4.3 s   motif           (over a held E4 and C4)
    10.7 s  motif in octaves, doubled a fifth/sixth above (E5, C5, D5)
    23.2 s  motif           (alone again)
    29.6 s  motif over C3 E3 A3     <- A minor
    34.7 s  motif over D3 F3 A3     <- D minor

Nothing in the Basic Pitch output made that legible.

## Caveats

- Kyutai stops at **39.6 s**; the audio runs to 43.2 s. The last few seconds are a fade
  tail it did not transcribe. Basic Pitch is the only source that covers all of it - and
  what it has there is a single quiet A4, so nothing is really lost.
- Its final note, C3 at 39.58 s, lasts **0.009 s** - a degenerate decoding artifact. The
  app's artifact filter now drops anything under 0.05 s regardless of velocity, and
  `presses_kyutai.txt` excludes it.
- **One note is out of reach:** A5 at 18.5 s, above the phone keyboard's top F5. It is
  press 19. Fold it down an octave or skip it.
- Still all white keys. Three independent transcribers now agree on that, and on the
  opening motif.

## Ranking, for this kind of material

1. **Kyutai Muscriptor** - free, returns MIDI, cleanest note-level output. Start here.
2. **Klangio piano2notes** - good model, but the free tier gives a PDF with no timing and
   stops at 32.4 s (round 4).
3. **Basic Pitch** - free and covers the full length, but needs the split-note repair and
   the artifact filter before it is usable.

## Files

- `presses_kyutai.txt` - the playable key list, 37 presses
- `kyutai_notes.json` - notes and presses as data
