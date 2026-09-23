# tunetank-piano-logo — do Muscriptor and Klangio agree?

Source: `tunetank-piano-logo-484286.mp3`, **8.44 s** (`ffprobe`) — a short piano
logo/sting, not one of the longer pieces this folder has handled before. Transcribed two
ways, same as `../interstellar/`: `muscriptor.kyutai.org` → `.mid`, `piano2notes.klang.io`
→ `.pdf`.

## Short answer

They agree on the one thing that matters most for "is this piece in tune with itself":
**both independently land on D major** (Kyutai's MIDI contains a real F#4; Klangio's PDF is
engraved with a 2-sharp key signature, F# and C#). They disagree hard on **how much of the
piece each one actually captured**, and there's a real **octave disagreement** in the
tail. Neither disagreement is a reading mistake on my end — see the bug fix below for the
one that was.

| | Muscriptor (.mid) | Klangio (PDF) |
|---|---|---|
| notes | 24 | 19 noteheads |
| time covered | **3.25 s of 8.44 s** (38%) | no timing in the PDF, but tempo *is* marked (108 BPM) and it's one unbroken system — most likely the whole clip |
| key | D major (F#4 present) | D major (2-sharp key signature: F#, C#) — **matches** |
| velocities | flat 100, every note (Kyutai's signature — see `../ratpac/round-05-kyutai-alignment/`) | n/a, PDF has no dynamics either |
| register | tops out at D6/G5/F#5 | reaches up to D7/A6/B5 — **an octave or more higher in the tail** |

## The PDF-reading tool had two real bugs on this piece specifically

`../../tools/extract_klangio_pdf.py` was built on pieces with **no key signature**
(ratpac, interstellar — confirmed: "key signature: none" in round 4). This is the first
piece here with one, and that exposed two things the tool never had to handle:

1. **It only parses `Tj` (single-string glyph show), never `TJ` (kerned array show).**
   LilyPond draws a clef immediately followed by an accidental as one kerned `TJ` run when
   they're close together — which is exactly how a key-signature sharp sits right next to
   a clef. On this PDF that swallowed the **entire bass clef**: `[(\t)-205.007(\b)]TJ` is
   `clefs.F` (code 9) + `accidentals.sharp` (code 8) in one call. Missing it meant the tool
   fell back to defaulting the bass staff to treble — every bass note came out roughly an
   octave-plus too high, the same class of bug already logged twice in
   `../ratpac/round-04-klangio-score/NOTES.md` and `../interstellar/NOTES.md`, just a new
   trigger for it.
2. **It never applied key signatures at all** — the tool's own docstring assumes "no
   accidentals" and checks that assumption by looking for accidental *glyphs* existing in
   the font subset, but a key-signature sharp is drawn with that exact same
   `accidentals.sharp` glyph, at the start of the staff. The tool saw 3-4 sharp glyphs, but
   had no logic to turn "there's a sharp glyph before the first note, at the F line" into
   "every F in this piece is F#." Every `F` notehead was being read as F natural.

**Fixed, scoped to this project only:** `extract_klangio_pdf_patched.py` in this folder —
same geometry approach, plus (a) parses `TJ` arrays as well as `Tj`, (b) infers a missing
clef from its sibling staff on a 2-staff grand staff as a safety net, (c) reads any
accidental glyph positioned before the first notehead on a staff as a key-signature entry
and applies it to every notehead of that pitch letter. Confirms: **2 sharps, F and C, on
both staves = D major**, and every `F4`/`F3` in the score is really **F#4**/**F#3**.

**Not promoted to the shared tool yet.** Re-running the patched version against the two
already-validated PDFs (ratpac, interstellar — both key-signature-free, so the new logic
shouldn't touch them) changed their note counts (ratpac 53→57, interstellar 48→53) — the
`TJ` parsing is picking up *something* extra on both that I haven't root-caused, and since
those two pieces' original counts are the ones already cross-checked against their MIDI
files and found correct, I'm not overwriting `tools/extract_klangio_pdf.py` on unverified
ground. If another key-signature piece shows up, that's the trigger to actually dig into
the `TJ` over-count and fix the shared tool properly.

## Where they agree

Reading order, PDF (corrected pitches) vs. MIDI (chronological), both start with the same
gesture — a low, F#-carrying chord:

    PDF:   B5   A6+D6+D7+F#4   A5   D7+F#4   G5   A3 …
    MIDI:  D3+A3+D4+F#4+D6 (0.65s)  D5(0.97)  A5(1.13)  D5(1.30)  A5(1.46)  G4+G5+D6(1.62) …

- **F#4 in the opening chord, independently, in both.** That's the strongest cross-check
  available here — two unrelated models both heard the same non-white-key note at the
  same structural position.
- **The overall shape matches**: a chord/cluster low down, then a fast rising figure
  through the A5/G5/D-register area. Klangio's `A6+D6+D7+F#4` opening cluster is very
  plausibly the same low-chord-plus-spray gesture MIDI spreads out over real time
  (0.65-1.62s) — the PDF has no rhythm to confirm it, but the *pitch content* (an F# under
  a stack of D's) lines up.
- **A3 appears in both**, as a bass note under the later part of the figure (PDF, in the
  second half of its reading order; MIDI has no literal A3, but does have A3 in the
  opening chord at 0.65s — see caveat below).

## Where they disagree, and why

**1. Coverage — smaller than it first looked.** Kyutai's MIDI stops dead at **3.25 s** of
the **8.44 s** clip, which reads as a big gap on its own. **The waveform analysis
(`WAVEFORM-NOTES.md`) walks this back:** the file is only meaningfully audible out to
**5.95 s** — not 8.44 s — and past ~3.5 s what's left is decay (the RMS envelope falling
off smoothly, the spectrogram's bands fading rather than refreshing), not new note
attacks. So Kyutai most likely captured the real onsets and stopped because there weren't
any more, rather than losing the thread on a hard passage. Klangio's PDF is still a single
unbroken system with a real tempo marking (108 BPM, vs. Kyutai's generic 120 BPM
default — round 2's standing rule is that's "not the real tempo"), so it may still cover
more of the piece than the MIDI's 24 notes — but its 19 noteheads is *fewer* than the
MIDI's note count, which doesn't obviously support "Klangio caught a bunch of extra
content Kyutai missed" either. Call this one open rather than settled.

**2. Register/octave in the tail.** Klangio's back half is dominated by a single repeated
high note, **D7** (5 of its last 8 noteheads), with F#3/A3 underneath. Kyutai's own tail —
its last three note-pairs, 2.60-3.25s — is a **D5+D6** octave-doubled tremolo, a full
octave (or more) lower than Klangio's D7. Both sources are internally consistent (Klangio
keeps returning to exactly D7, Kyutai keeps returning to exactly D5+D6), so this isn't
noise in either reading — it's a genuine register disagreement between the two models on
the same fast repeated-note figure, the kind of thing round 2 already flagged as an open
risk ("verified which octave convention... against one real note in the app" was never
done for this project). Given Kyutai's known tendency (round 5) to model held notes and
sustain cleanly rather than track fast repeated attacks, and given this is exactly the
kind of bright tremolo passage where a pitch tracker can lock onto a harmonic instead of
the fundamental, I'd lean toward the **PDF's D7 being the less reliable of the two** here
— but that's a judgement call, not a settled fact. Only listening to the mp3 against both
readings (or a third transcriber) would settle it.

**3. No usable rhythm from the PDF, no dynamics from either.** Both already-documented
limitations apply unchanged: Klangio's beams are drawn as filled paths, not glyphs, so
duration can't be recovered from this PDF (round 4); Kyutai reports every note at velocity
100, so neither source says anything about how hard any of this is meant to be played.

**4. A3 in the MIDI is a near-zero-length event.** The `find_split_notes.py` pass flags 9
same-pitch/near-zero-gap pairs (D4, D5x2, A5x2, D6x2) in this file. Per round 5's standing
rule, **the rejoin-split-notes fix is for Basic Pitch's specific bug and is off for
Kyutai** — these are re-struck chord/tremolo entries, not one note cut in two (same
reasoning as round 5's C3/A3/E4 re-triggers). Nothing here looks like the Basic Pitch
artifact pattern.

## Files

- `sources/` — the three originals (mp3, Kyutai `.mid`, Klangio `.pdf`), untouched
- `waveform_tunetank-piano-logo-484286.png` + `WAVEFORM-NOTES.md` — waveform + spectrogram
  of the source mp3 (same format as `../tunetank-ride/waveform_*.png`), and the
  audible-window finding that revised the coverage-gap read above
- `make_waveform.py` — the script that made the waveform figure (stdlib `wave` + numpy +
  matplotlib, decode via `ffmpeg` first)
- `tunetank_qdf.pdf` — `qpdf --qdf` output of the Klangio PDF, so the extraction can be
  re-run without regenerating it
- `extract_klangio_pdf_patched.py` — this project's patched reader (TJ-array parsing +
  key-signature application + grand-staff clef inference); not yet folded into
  `../../tools/extract_klangio_pdf.py`, see "two real bugs" above
- `kyutai_notes.json` — the MIDI's 24 notes as data (`parse_midi.py --json`)
- `klangio_notes_corrected.json` — the PDF's 19 noteheads, corrected pitches, as data

## Open

- Which octave is right in the tail (D7 vs D5+D6) is unresolved — needs an ear on the
  actual mp3, not just the two transcriptions.
- The `TJ`-parsing over-count on ratpac/interstellar (53→57, 48→53 noteheads) needs
  root-causing before the fix in `extract_klangio_pdf_patched.py` gets promoted to the
  shared tool.
- Whether Klangio's 19 noteheads cover more of the piece than Kyutai's 24 notes (e.g. past
  3.25 s) is still open — the waveform rules out "a lot more audible content exists past
  3.25 s that either source could have caught," but doesn't say which of the two, if
  either, better covers the ~3.25-5.95 s decay region specifically.
- No onset-level (attack-by-attack) check against the raw audio was done — the waveform
  analysis confirms the *timing envelope* (attacks cluster before ~3.5 s, decay after) but
  a proper onset detector cross-checked note-by-note against both transcriptions would be
  the next step if this piece needs to be pinned down further.
