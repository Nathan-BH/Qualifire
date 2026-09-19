# Round 4 - getting the notes out of the Klangio PDF

Klangio's free tier gives a **PDF only** - no MIDI, no MusicXML. So the question was
whether the notes could be recovered from the PDF itself.

## Yes, and cleanly - because it is a LilyPond engraving

    pdfinfo  -> Creator: LilyPond 2.24.4
    pdffonts -> Emmentaler-18, Emmentaler-20  (the LilyPond music font)

That means noteheads are **font glyphs placed at exact coordinates**, not pixels. Pitch is
recoverable as pure geometry - no OCR:

1. Staff lines are long horizontal strokes in the content stream. Group them into fives.
   Line spacing here is 4.98 pt, so a half-space (one diatonic step) is 2.49 pt.
2. The font's `/Differences` array maps character codes to real glyph names -
   `0 -> noteheads.s2`, `3 -> noteheads.s1`, `7 -> noteheads.s0`, `10 -> clefs.G`,
   `9 -> clefs.F`. No guessing what a code means.
3. The clef glyph on each staff sets the reference: treble bottom line = E4,
   bass bottom line = G2.
4. Notehead height above the bottom line, in half-spaces, gives the diatonic degree.

`../tools/extract_klangio_pdf.py` does all of this.

### Two gotchas found the hard way

- Glyphs are drawn as **both** hex strings `<00>Tj` **and** literal strings `(\n)Tj`.
  Parsing only one form silently loses the other - the clefs are in the literal form
  (`clefs.G` is code 10, which is a newline byte), so a hex-only parser finds no clefs
  and maps the bass staff as treble.
- The tempo marking contains a real quarter-note glyph. It reads as a phantom **B5** at
  bar 1 unless excluded by position (above the top staff, before the first barline).

## What the score says

| | |
|---|---|
| bars | 15 (2 systems: bars 1-7, bars 8-15) |
| tempo | 111 BPM, 4/4 |
| noteheads | 53 |
| range | A3 - G5 |
| key signature | **none** |
| accidental glyphs in the font subset | **none** |

That last line is the most useful fact in this whole folder: the `/CharSet` in the
FontDescriptor lists every glyph the PDF actually uses, and there is not a single
accidental among them. **The piece is entirely white keys.** The Basic Pitch MIDI agrees
independently - all 116 of its notes are naturals.

Opening in reading order: **E4  E4  A4  G4  D4  D4  C4  A4  G4 ...** - which matches the
rejoined Basic Pitch list from round 3.

## What could NOT be recovered: rhythm

Beams are drawn as filled **paths**, not font glyphs, so a beamed eighth is
indistinguishable from a plain quarter by glyph inspection alone. A duration pass built
that way produces bars summing to 5.0, 2.5, 3.75 beats instead of 4 - i.e. wrong. Do not
trust any timing derived from this PDF.

## Verdict

The free PDF is a **cross-check on pitch**, not a replacement source:

- it covers 15 bars = **32.4 s** of the 43.2 s audio, so roughly the last 10 seconds are
  missing entirely;
- its treble/bass split is arbitrary - the bass staff carries notes on three and four
  ledger lines, in the same register as the treble, so it is not a two-hands division;
- it has no usable timing.

Use the rejoined Basic Pitch MIDI for what to play and when. Use this PDF to confirm the
pitches and, above all, to confirm there are no black keys.

## Files

- `klangio_score.png` - the rendered page, for reading by eye
- `klangio_score_notes.json` - every notehead: system, x, clef, MIDI number, name
