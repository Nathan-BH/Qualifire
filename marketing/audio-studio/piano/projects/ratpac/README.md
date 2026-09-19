# ratpac — ambient freesound.org loop

The first piece worked in `piano/`, and where the whole transcription approach (rounds 1
through 5) was built. Started 2026-09-17.

## Layout

    README.md                       this file
    sources/                        the original audio, MIDI and PDF
    round-01-ratpac-reference/      can AI reproduce a logo sting? + the SnipSound shape read
    round-02-midi-to-named-keys/    mp3 -> Basic Pitch -> MIDI -> labelled keys
    round-03-split-note-diagnosis/  why two transcribers disagreed, and the fix
    round-04-klangio-score/         pulling pitches out of a PDF-only export
    round-05-kyutai-alignment/      a cleaner free transcriber, now the default

Rounds are chronological. Each has a `NOTES.md` that stands on its own. Shared tooling
(`tools/`, `named-keys.html`) lives at the `piano/` root — see `../../README.md` — so
every round's own `../tools/...` / `../named-keys.html` references now read
`../../tools/...` / `../../named-keys.html` from inside a round folder.

## Current state of the piece

`freesound_community-22-musica-ambiente-67854.mp3`, slow ambient piano, 43.2 s.

Best transcription is **Kyutai Muscriptor**: **37 presses, 50 notes**, no cleanup needed.

- The piece is a five-note motif, **E4 A4 G4 D4 C4**, stated four times, with A minor
  (C3 E3 A3) and D minor (D3 F3 A3) arriving underneath in the second half.
- **Every note is a white key.** Confirmed three ways: no accidental in the Basic Pitch
  MIDI, none in the Kyutai MIDI, and no accidental glyph in the Klangio score's font
  subset.
- **One note out of reach:** A5 at 18.5 s (press 19), above the phone keyboard's top F5.
- Playable list: `round-05-kyutai-alignment/presses_kyutai.txt`.
  Basic Pitch's older list is kept at `round-03-split-note-diagnosis/presses_rejoined.txt`.

## Open

- Coverage differs by source: Basic Pitch 43.2 s (all of it), Kyutai 39.6 s, Klangio PDF
  32.4 s. Only the fade tail is missing from Kyutai, and it is one quiet A4.
- Kyutai reports no dynamics — every velocity is exactly 100 — so nothing here knows how
  hard to play anything.
- Never verified which octave convention the phone app actually uses. One note, checked
  by ear against the app, settles it.


## Note (2026-09-19) — checked against the FluidSynth piano-realism update

Nathan asked whether this project's own files/renders needed the same
sample-based-piano update as interstellar (see `../interstellar/NOTES.md`). Checked:
this folder is transcription/analysis only (rounds 1-5) -- no `soundtrack.py`, no
synthesized audio ever came out of it. Nothing to update here. If this piece is ever
turned into an actual soundtrack, use `../../fluid_render.py` from the start rather
than `synth.py`'s pluck()/pad().
