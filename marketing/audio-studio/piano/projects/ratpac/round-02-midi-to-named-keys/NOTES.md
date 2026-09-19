# Round 2 - MIDI to named keys

**Problem.** The phone piano app has its keys labelled A0 (left) to F5 (right). What is
needed is the letter+number to press, not notation. Every online MIDI viewer tried
(midiviewer.io, Midiano, Pianotify) draws falling bars against an *unlabelled* keyboard -
useless if you cannot already read a keyboard. The practice tools that do show note names
(Visual Piano, Piano Note Visualizer) are built around a connected MIDI keyboard, not a
file you load.

So: built one. `../../named-keys.html` (published as the "Named Keys" artifact).

## Source chain

    freesound_community-22-musica-ambiente-67854.mp3
      -> basicpitch.spotify.com
      -> basic_pitch_transcription.mid          <- sources/

## What the MIDI contains (raw, before cleanup)

| | |
|---|---|
| notes | 116 |
| length | 43.22 s |
| range | C2 (36) - A5 (81) |
| header tempo | 120 BPM, 480 ticks/quarter (Basic Pitch default, not the real tempo) |
| accidentals | **none - every note is a white key** |

Two notes sit above the phone keyboard's top F5: **G5 (79)** at 32.92 s and **A5 (81)**
at 18.51 s. The tool flags them and offers to fold them down an octave.

## Octave-labelling trap

Standard MIDI calls middle C **C4** (note 60). Plenty of phone apps and Yamaha gear call
it **C3**. An A0-to-F5 keyboard is 57 keys and suggests the standard convention, but that
must be checked against one real note in the app before trusting 60 rows of output. The
tool has a "Middle C is" dropdown that shifts every label at once.

## Reusable

- `../../tools/parse_midi.py` - pure-stdlib SMF parser, no mido/pretty_midi. Written because
  the cloud sandbox has no PyPI access, so it has to run on the PC too.
- `../../named-keys.html` - loads any .mid, labelled keyboard + falling roll + press list.
