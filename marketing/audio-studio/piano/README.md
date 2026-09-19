# piano

Working folder for the "learn to play it from letter+number labels" thread.
Started 2026-09-17, under `marketing/audio-studio/`.

**Standing constraint that shapes everything here:** the phone piano app has its keys
labelled **A0 (left) to F5 (right)**. The deliverable is always the letter+number to press,
never notation.

## Layout

    README.md                       this file
    named-keys.html                 the live tool (published as the "Named Keys" artifact)
    sources/                        the original audio, MIDI and PDF
    tools/                          standalone scripts, pure stdlib, run anywhere
    round-01-ratpac-reference/      can AI reproduce a logo sting? + the SnipSound shape read
    round-02-midi-to-named-keys/    mp3 -> Basic Pitch -> MIDI -> labelled keys
    round-03-split-note-diagnosis/  why two transcribers disagreed, and the fix
    round-04-klangio-score/         pulling pitches out of a PDF-only export
    round-05-kyutai-alignment/      a cleaner free transcriber, now the default

Rounds are chronological. Each has a `NOTES.md` that stands on its own.

## The tool

`named-keys.html` opens with this transcription already loaded. It shows:

- a keyboard from A0 to F5 with **every key labelled**, black keys included
- a falling roll where each block carries its own note name
- a **press-by-press list**: time, keys to press together, how long to hold.
  Click a row to hear it and jump there. "Copy as text" exports the lot.

Controls worth knowing:

| control | why |
|---|---|
| **Transcription** | Kyutai (default) or Basic Pitch, both built in - see round 5 |
| **Rejoin split notes** | repairs Basic Pitch cutting held notes in two. On for Basic Pitch, **off** for Kyutai, where zero-gap repeats are real chord entries |
| **Hide faint notes** (off) | drops <0.25 s + <vel 55 events, and anything under 0.05 s |
| **Middle C is** | switch to C3 if the phone app uses Yamaha-style labelling |
| **Fold into range** | drops notes above F5 by an octave so they are reachable |
| **Keyboard** | A0-F5 phone / full 88 / 49-key / fit this file |

Falling notes carry their key name in a chip the whole way down, so the next press is
readable well before it lands.

It takes any .mid, not just this one.

### Shortcuts

Also listed at the foot of the page itself, so there is nothing to memorise.

| key | action |
|---|---|
| `Space` | play / pause |
| `R` | restart |
| `->` `<-` | nudge 0.25 s forward / back - fine scrubbing, works while playing |
| `Shift+->` `Shift+<-` | next / previous press: pauses, jumps there, plays it |
| `Up` `Down` | speed +/- 5% |
| `0` | back to full speed |
| `S` | switch transcription |
| `K` | cycle keyboard range |
| `C` | cycle what middle C is called |
| `M` | rejoin split notes |
| `H` | hide faint notes |
| `O` | fold out-of-range notes in |
| `T` | switch theme |

Shift-arrow stepping is the practice mode - walk press by press at your own pace, with
each one sounded as you land on it.

## Current state of the piece

`freesound_community-22-musica-ambiente-67854.mp3`, slow ambient piano, 43.2 s.

Best transcription is **Kyutai Muscriptor**: **37 presses, 50 notes**, no cleanup needed.

- The piece is a five-note motif, **E4 A4 G4 D4 C4**, stated four times, with A minor
  (C3 E3 A3) and D minor (D3 F3 A3) arriving underneath in the second half.
- **Every note is a white key.** Confirmed three ways: no accidental in the Basic Pitch
  MIDI, none in the Kyutai MIDI, and no accidental glyph in the Klangio score's font subset.
- **One note out of reach:** A5 at 18.5 s (press 19), above the phone keyboard's top F5.
- Playable list: `round-05-kyutai-alignment/presses_kyutai.txt`.
  Basic Pitch's older list is kept at `round-03-split-note-diagnosis/presses_rejoined.txt`.

## Open

- Coverage differs by source: Basic Pitch 43.2 s (all of it), Kyutai 39.6 s, Klangio PDF
  32.4 s. Only the fade tail is missing from Kyutai, and it is one quiet A4.
- Kyutai reports no dynamics - every velocity is exactly 100 - so nothing here knows how
  hard to play anything.
- Never verified which octave convention the phone app actually uses. One note, checked
  by ear against the app, settles it.

## Tools

    python3 tools/parse_midi.py <file.mid>              # MIDI -> note list
    python3 tools/find_split_notes.py <file.mid>        # transcription artifact report
    qpdf --qdf --object-streams=disable in.pdf out.pdf
    python3 tools/extract_klangio_pdf.py out.pdf        # LilyPond PDF -> pitches

All three are pure stdlib on purpose - the cloud sandbox has no PyPI access, so anything
that needs to run has to run on the PC too.
