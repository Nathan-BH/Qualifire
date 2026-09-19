# Interstellar (Easy Piano Tutorial) — do Muscriptor and Klangio agree?

Sources, all from the same YouTube "Interstellar (Easy Piano Tutorial)" video:
`Interstellar_(Easy_Piano_Tutorial).wav` (audioforges youtube-to-wav), transcribed two
ways — `muscriptor.kyutai.org` -> `.mid`, `piano2notes.klang.io` -> `.pdf`.

## Yes — once a bug in this folder's own PDF-reading tool was found and fixed

Running `tools/extract_klangio_pdf.py` (built in round 4 for the earlier ambient piece)
on this PDF at first reported a much narrower, wrong-looking pitch range and NO clef
glyphs detected at all — every staff silently defaulted to treble. Cause: the script's
`ENC` codepoint->glyph table was hardcoded from round 4's PDF's font subset. Font
subsetting assigns codes per file, based on which glyphs that score actually uses — this
PDF's font maps code 3 to `clefs.F` and code 4 to `clefs.G`, where round 4's PDF had them
at 9 and 10. The old table silently misread the real clef glyphs as `noteheads.s1` /
`flags.d3`, so every staff fell back to treble, and any note actually on the bass staff
came out an octave-plus too high (`D4`/`E4`/`F4` in a first pass, where the true notes
are `F2`/`G2`/`A2`).

**Fixed:** `extract_klangio_pdf.py` now reads each font's own `/Differences` array out of
its `/Encoding` object instead of trusting a table from a different PDF, falling back to
the old table only if that lookup fails. Regression-tested against round 4's original
PDF — identical reading order, and its printed "range" line (a separate bug: string-
sorted, not pitch-sorted) is now correct too. Amendment logged in
`../ratpac/round-04-klangio-score/NOTES.md`.

## What the two sources say, after the fix

| | Muscriptor (.mid) | Klangio (PDF) |
|---|---|---|
| notes | 63 | 44 noteheads |
| bass register | F2, G2, A2 | F2, G2, A2 — matches |
| melody register | A4, B4, C5, D5, E5 | A4, B4, C5, D5, E5 — matches |
| accidentals | none (no sharp/flat in any note name) | none (font's /CharSet has no accidentals.* glyph) |

Reading in order, both sources describe the same piece: a held bass note (F2, then G2,
then A2, then G2) under a melody that keeps returning to E5 —
`{F2,A4} E5 A4 E5 {G2,B4} E5 B4 E5 {A2,C5} E5 C5 E5 {G2,D5} E5 D5 E5`, then a fast
repeated G2+D5 pulse. The PDF shows some of these chords twice in a row where the MIDI
shows one longer note — expected, already documented in round 4: LilyPond ties/durations
don't survive this glyph-geometry read, so a tied note can print as two noteheads.
Pitch: full agreement. Rhythm: PDF not usable for it, as before — use the MIDI.

## An open discrepancy worth flagging: the MIDI's own clock runs long

`ffprobe` on the WAV: **15.01 s**. `parse_midi.py` on the MIDI: notes running to
**19.86 s** — about a third longer than the actual recording. This isn't a pitch
disagreement (still checks out against the PDF) — looks like Kyutai's tempo estimate for
this file doesn't match the recording's real tempo, so its note *timeline* drifts vs.
real seconds even though the *notes* are right. Scale MIDI times by
`15.01 / 19.86 ≈ 0.756` before trusting any of them as real seconds, or re-derive timing
from the WAV directly. See `../../../../cycles/12_interstellar-piano-audio-idea/` for why
this matters for what Nathan wants to build next.

## Files

- `sources/` — the three originals + `Interstellar_qdf.pdf` (qpdf --qdf output, kept so
  the extraction can be re-run without regenerating it)
- `interstellar_klangio_notes.json` — every notehead the fixed tool read: system, x,
  clef, MIDI number, name (`--json` output)

## Update (2026-09-19) — the "drift" was wrong; the tail is a hallucination

Nathan's hunch was right and simpler than the scaling theory above. Re-checked with the
real WAV length in hand (15.01 s, `ffprobe`, reconfirmed):

- The last *melodic* note in the Kyutai MIDI (E5 at raw t=14.51 s, duration 0.53 s) ends
  at **15.04 s** — matches the real recording's length almost exactly. So the MIDI's
  clock is **not** drifting at all through the real content; it is 1:1 with real seconds.
- Everything from **raw t=15.05 s onward** (the ~20x alternating G2/D5 pulse, ~4.8 s,
  ~40 of the file's 63 notes) has nothing in the recording to correspond to — the WAV
  simply ends where the real melody does.
- **The Klangio PDF agrees: no pulse.** Its 44 noteheads / 34 reading-order groups cover
  only the main phrase and end cleanly — no repeated-tremolo equivalent anywhere in it.
  Two independently-built transcriptions both stop at the same place; only Kyutai
  additionally hallucinated a fast repeated tail past the end of the audio.

**Conclusion: drop everything from t >= ~15.0 s. No scaling needed — use the raw MIDI
timestamps as real seconds directly for the first ~15 s.** Superseded the
"scale by 0.756" note above; kept for the record of how the reasoning changed.

## Render lengths this piece might sit under (2026-09-19)

- `silent-studio/all-renders/start-ride_v4.mp4` — **14.0 s**. The clean phrase (through
  the melody note ending at 15.04 s) barely overruns this — 7 of the 8 E5 pulses land
  inside it (0.92-10.68 s), the 8th (14.51 s) is right at the edge.
- `silent-studio/all-renders/gates-saving_v6.mp4` — **12.3 s**. 6 of the 8 E5 pulses land
  inside it (0.92-10.68 s); the 7th (12.50 s) is ~0.2 s past the end.


## Update (2026-09-19) — one MIDI note the PDF doesn't back up; Klangio is now the pitch tie-breaker

Nathan flagged a synthesized note around t=10s as wrong and asked that the Klangio PDF be
treated as the absolute reference for pitch from here on (it has no usable timing of its
own — see above — so timing still comes from the MIDI's clock).

Re-walked the **entire** melody line against the PDF's reading order, note for note, not
just the flagged spot. Stripped each PDF group down to its treble member and collapsed
consecutive repeats (tied notes reprint as duplicate noteheads — established above), which
gives: `A4 E5 A4 E5 B4 E5 B4 E5 C5 E5 C5 E5 D5 E5 D5 E5` — 16 notes.

The raw Kyutai MIDI's melody has a 17th note the PDF doesn't: **D5 at raw t=9.97s,
duration 0.05s** — a grace-note-length blip sitting between the C5 at 7.88s and the C5 at
10.06s, with nothing at that position in the PDF at all. Every other one of the MIDI's 16
real melody notes matches the PDF's sequence exactly, in order, pitch for pitch. A 0.05s
note is also short enough to be a plausible decoder artifact on its own (same family as
the degenerate sub-10ms notes seen elsewhere from Kyutai).

**Fix:** dropped the D5(9.97, 0.05) grace note from `soundtrack.py`'s `MELODY` and
`VOICE_A` lists. Bass (F2/G2/A2/G2) was already checked against the PDF's bass-clef
readings above and needed no change. Regenerated `bass_only.wav`, `melody_only.wav`,
`voice_a.wav`, `voice_e5.wav` from the corrected lists.

**Standing rule going forward:** where Klangio (PDF) and Muscriptor (MIDI) disagree on
*pitch*, Klangio wins — it's the independently-built, glyph-exact source. Muscriptor
(MIDI) still owns *timing*, since Klangio's PDF read has no reliable durations.


## Update (2026-09-19) — clean MIDI export + why our synth sounds worse than midiviewer.io/klang.io

**Clean MIDI file.** `interstellar_corrected.mid` (new, this folder) — built straight
from `soundtrack.py`'s own corrected `BASS`/`MELODY` lists (pure-Python SMF writer,
`write_midi.py`, no external deps), not a re-export of the raw Kyutai file. 20 notes,
ends at 15.04s, no post-15s hallucinated tail. This is the "ground truth" file for this
piece from here on — pass it to any tool (midiviewer.io included) instead of the
original Kyutai `.mid` in `sources/`.

**Why our synthesized piano sounds worse than those two reference tools.** Checked what
they actually do: both midiviewer.io-style web MIDI players and Klang.io's own preview
play back **real recorded piano samples** (specifically most of this ecosystem — e.g.
Tone.js's Piano library, the tool underneath html-midi-player — uses **Salamander Grand
Piano**: a real Yamaha C5 multi-sampled every minor third across all 88 keys at 16
velocity layers, CC-BY licensed). Our `synth.py` `pluck()`/`pad()` is Karplus-Strong
physical modelling from scratch — categorically a different, more synthetic-sounding
technique, however tuned.

**Tried to fetch the actual Salamander samples — blocked.** This session's network
allowlist only reaches npm/PyPI registries; `raw.githubusercontent.com`, `unpkg.com`
and `cdn.jsdelivr.net` (where these sample packs are hosted) are all blocked by the
proxy (403). Nathan's own PC shell has the same restriction (documented already, see
APPROACH.md's scipy note).

**What worked instead:** the cloud sandbox already has `libfluidsynth3` and a real
(if modest — MuseScore-era "TimGM6mb", ~6MB) General MIDI soundfont on disk, i.e. the
same sample-playback approach, just a smaller/older sample set than Salamander. Wrote a
small ctypes wrapper (`/tmp` scratch, cloud-side only, not checked in yet) to render our
note lists through its Acoustic Grand Piano patch instead of `pluck()`/`pad()`, rebuilt
the same start-ride and gates-saving mixes with it, and sent Nathan both as an A/B trial
against the current soundv6 procedural-synth mixes. Not yet adopted anywhere — waiting
on his listen. If he wants the closer-to-premium Salamander quality specifically, the
samples would need to reach us some other way (he downloads and shares the pack, or
another registry we can already reach turns up bundling them).


## Update (2026-09-19) — FluidSynth adopted as production; rolled out further

Nathan heard the A/B trial and approved it: "fluidsynth is already a step so i would
roll with it." Adopted:

- **This piece's own audio**: `bass_only.wav`, `melody_only.wav`, `voice_a.wav`,
  `voice_e5.wav`, `gate_chimes_12.3s.wav` in this folder are now FluidSynth renders
  (overwriting the pluck()/pad() versions) — see `fluid_soundtrack.py` (documents how,
  must be run in the Cowork cloud session, not Nathan's PC shell — libfluidsynth isn't
  installed there and that shell can't reach a registry to install it either, checked
  same date). `start-ride/soundv7` and `gates-saving/soundv7` are the same mixes as
  soundv6, rebuilt from these.
- **`named-keys.html`'s own "Play" preview** — was a from-scratch oscillator ping,
  now real piano samples (same FluidSynth render, 30 notes embedded as base64 mp3,
  nearest-sample + pitch-shift for anything in between). See `piano/README.md`.

**Path to real Salamander quality, if wanted later:** `get_salamander_samples.ps1`
(this folder) downloads the actual Salamander Grand Piano set — the same one
midiviewer.io/Klang.io use — from Nathan's own machine (outside Cowork's shells,
which both hit a 403 on that host). Run it there; if it works, tell Claude and a
sample-based renderer mirroring `fluid_render.py`'s API can be written against the
real files instead of the GM soundfont substitute.
