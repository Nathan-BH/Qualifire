"""Build a Salamander-sampled piano remake of b-piano's 5-chord progression.

v2 -- v1 fired all 29 noteheads the Klangio PDF draws as separate sequential attacks
(spread across ~10s), which sounded like 10+ notes woven together. That was wrong:
1. The tool this project already trusts for these PDFs says so explicitly in its own
   docstring -- "durations: do not trust them" -- because LilyPond beams are filled
   paths, not glyphs, so LilyPond's engraver spaces noteheads by *notated* duration,
   not by real time. A tied/slurred half-note melodic run across a bar looks like a
   slow arpeggio on paper; it is not evidence of a slow arpeggio in the recording.
2. WAVEFORM-NOTES.md and chroma_output.txt (both already in this folder, both built
   straight from the audio, not the PDF) independently agree: **5 discrete chord
   attacks**, exactly 2.45s apart, each decaying ~20dB before the next. That is what
   Nathan actually hears.
3. The PDF's one genuinely unambiguous, trustworthy read is the chord-symbol line
   above the staff (Am F C G Am) -- LilyPond text glyphs, not a geometry guess. The
   29 individual noteheads underneath are the PDF's noisiest part (an OMR spreading a
   struck/pedalled chord's harmonics and passing tones into "extra" noteheads); notes.json
   still has them for reference, but this build no longer plays them one by one.

So: 5 clean block chords, one strike per label, at the audio-verified onset times,
each ringing for one bar (~2.45s) before the next. Voicing is a plain root-position
triad (bass root doubled up an octave, treble root+3rd+5th) in the register the score
itself establishes (bass ~C2-F2, treble ~C4-E4) -- not literally copied off individual
noteheads, since those don't agree with each other closely enough to trust (e.g. no F
notehead appears anywhere in the score, even in the bar labelled "F").
"""
import sys
sys.path.insert(0, "../..")
import salamander_render

ONSETS = [1.24, 3.70, 6.15, 8.60, 11.05]  # from chroma_output.txt / WAVEFORM-NOTES.md

CHORDS = [
    ("Am", [45, 57, 60, 64]),  # A2 A3 C4 E4
    ("F",  [41, 53, 57, 60]),  # F2 F3 A3 C4
    ("C",  [36, 48, 64, 67]),  # C2 C3 E4 G4
    ("G",  [43, 55, 59, 62]),  # G2 G3 B3 D4
    ("Am", [45, 57, 60, 64]),  # A2 A3 C4 E4
]

events = []
for i, (name, midis) in enumerate(CHORDS):
    start = ONSETS[i]
    dur = (ONSETS[i + 1] - start) if i + 1 < len(ONSETS) else 4.0
    print(f"  t={start:6.3f}s  dur={dur:5.3f}s  {name:3s} midis={midis}")
    for m in midis:
        events.append((m, start, dur))

audio, sr = salamander_render.render(events, dur_s=ONSETS[-1] + 5.0, velocity=100, gain=0.55)
salamander_render.write_wav("b-piano_salamander_remake.wav", audio, sr)
print("wrote b-piano_salamander_remake.wav")
