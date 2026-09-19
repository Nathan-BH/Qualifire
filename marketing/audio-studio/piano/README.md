# piano

Working folder for turning a piece of piano audio into "which labelled key to press, and
when" for the phone piano app. One subfolder per piece under `projects/`; shared,
piece-agnostic tooling stays here at the root.

**Standing constraint that shapes everything here:** the phone piano app has its keys
labelled **A0 (left) to F5 (right)**. The deliverable is always the letter+number to
press, never notation.

## Layout

    README.md              this file
    named-keys.html        the live tool (published as the "Named Keys" artifact) — takes any .mid
    tools/                 standalone scripts, pure stdlib, run anywhere (see below)
    projects/
      ratpac/               round-by-round build of the transcription pipeline itself, on
                            an ambient freesound.org piano loop — read this first if new
                            here, it's where every method below was worked out
      interstellar/         Interstellar's "Time" theme, from a YouTube easy-piano
                            tutorial, cross-checked two ways

## The tool

`named-keys.html` opens with a transcription loaded. It shows a keyboard from A0 to F5
with every key labelled (black keys included), a falling roll where each block carries
its own note name, and a press-by-press list (time, keys to press together, how long to
hold — click a row to hear it and jump there, "Copy as text" exports the lot). It takes
any `.mid` via "Open a .mid file".

Controls worth knowing:

| control | why |
|---|---|
| **Transcription** | Kyutai (default) or Basic Pitch, both built in — see `projects/ratpac/round-05-kyutai-alignment` |
| **Rejoin split notes** | repairs Basic Pitch cutting held notes in two. On for Basic Pitch, **off** for Kyutai, where zero-gap repeats are real chord entries |
| **Hide faint notes** (off) | drops <0.25 s + <vel 55 events, and anything under 0.05 s |
| **Middle C is** | switch to C3 if the phone app uses Yamaha-style labelling |
| **Fold into range** | drops notes above F5 by an octave so they are reachable |
| **Keyboard** | A0-F5 phone / full 88 / 49-key / fit this file |

**Play uses real piano samples (2026-09-19).** 30 notes (minor-third spaced, A0-C8),
FluidSynth-rendered from a bundled GM soundfont and embedded as base64 mp3 directly in
the HTML — any note in between gets the nearest sample pitch-shifted (never more than
~1.5 semitones, inaudible on a piano). Was a from-scratch oscillator ping before; see
`projects/interstellar/NOTES.md`'s 2026-09-19 update for why that changed. Falls back
to the old oscillator tone for the brief moment before a sample finishes decoding.
Room to go closer to real Salamander Grand Piano quality later — see that same NOTES.md
entry and `projects/interstellar/get_salamander_samples.ps1`.
This tool is also published as a Cowork Artifact ("Named Keys") — found on
2026-09-20 that it was still serving the pre-upgrade (2026-09-17) version with the old
oscillator ping, because editing the local file here never touches a separately
published copy. Republished it from this exact file the same day, so it now matches.
**Rule going forward: any edit to `named-keys.html` needs a matching artifact
republish, or the published link silently goes stale again** — they are two different
deployments of the same code, not one thing.

**Update (2026-09-20):** swapped the embedded samples again — `named-keys.html`'s
`PIANO_SAMPLES` now holds 29 real Salamander Grand Piano recordings (not the FluidSynth
GM-soundfont render described above), downloaded via `get_salamander_samples.ps1` from
Nathan's own PC (Cowork's shells can't reach the host it needs). `A0` isn't in that
sample mirror (confirmed on a repeat run, not a network fluke) — the bottom three keys
(A0/A#0/B0) fall back to `C1` pitch-shifted down 3 semitones instead of the usual ~1.5.
**Open issue:** Nathan still hears the old sound locally after hard-refreshing, closing
all tabs, and switching browsers — under investigation, see
`projects/interstellar/NOTES.md`'s 2026-09-20 update. The published Cowork "Named Keys"
artifact has *not* been republished from this version yet, so on top of the rule above
it is now two upgrades behind the local file (still FluidSynth, not Salamander).

### Shortcuts

Also listed at the foot of the page itself, so there is nothing to memorise.

| key | action |
|---|---|
| `Space` | play / pause |
| `R` | restart |
| `->` `<-` | nudge 0.25 s forward / back — fine scrubbing, works while playing |
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

Shift-arrow stepping is the practice mode — walk press by press at your own pace, with
each one sounded as you land on it.

## Tools

Pure stdlib on purpose — the cloud sandbox has no PyPI access, so anything that needs to
run has to run on the PC too.

    python3 tools/parse_midi.py <file.mid>              # MIDI -> note list
    python3 tools/find_split_notes.py <file.mid>        # transcription artifact report
    qpdf --qdf --object-streams=disable in.pdf out.pdf
    python3 tools/extract_klangio_pdf.py out.pdf        # LilyPond PDF -> pitches

`extract_klangio_pdf.py` reads each PDF's own font-subset encoding rather than a
hardcoded table — see `projects/ratpac/round-04-klangio-score/NOTES.md`'s 2026-09-19
amendment for why that matters before ever hardcoding a codepoint table like `ENC` again.

## Projects

- **`projects/ratpac/`** — the original piece. Read its own README for the piece's
  current state; the five `round-0N-*` folders are the chronological log of how the
  transcription approach above was worked out (why Kyutai over Basic Pitch, how pitch
  gets read out of a PDF with no MIDI export, the octave-labelling trap, etc.) — still
  the reference for *why* the tools work the way they do, even on a different piece.
- **`projects/interstellar/`** — Interstellar's "Time" theme, transcribed two ways as a
  cross-check. See its `NOTES.md`.
