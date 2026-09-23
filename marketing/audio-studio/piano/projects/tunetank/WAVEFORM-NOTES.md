# tunetank-piano-logo-484286.mp3 — waveform analysis

Source copy: `sources/tunetank-piano-logo-484286.mp3`
Visualization: `waveform_tunetank-piano-logo-484286.png` (top: waveform + 20ms RMS envelope; bottom: spectrogram, 0-5kHz)
Made with `make_waveform.py` (stdlib `wave` + numpy + matplotlib, same "no scipy/librosa"
constraint as `../../tools/parse_midi.py` — decode via `ffmpeg -i … -ar 44100 -ac 2` first,
this script just reads the resulting WAV).

- Duration: 8.438 s
- Sample rate: 44100 Hz, source is stereo (analyzed as mono average)
- Peak amplitude: 0.9359 (-0.58 dBFS)
- Overall RMS level: -18.20 dBFS
- Audible window (signal > noise floor + 6dB): **0.34 s to 5.95 s** — the file has ~2.5 s
  of near-silence at the tail (5.95-8.44 s) that neither transcriber put a single note in

## This changes the "coverage gap" finding in `NOTES.md`

Kyutai's MIDI stops at 3.25 s, which `NOTES.md` originally flagged as covering only 38% of
the clip and read as Kyutai likely losing track of a fast passage. The waveform doesn't
support that framing as strongly as it first looked:

- The two loudest, sharpest attacks (visible as the two tallest spikes in the waveform,
  ~0.65 s and ~1.2 s) line up with the MIDI's opening chord (0.65 s) and the start of its
  arpeggio figure — real onsets, both sources agree they're there.
- After roughly 3.5 s, the waveform and spectrogram show **decay, not new attacks**: the
  RMS envelope falls off smoothly and the spectrogram's harmonic bands fade rather than
  refreshing — no new vertical onset transients appear. That's consistent with previously
  struck notes ringing out (piano sustain/pedal + room reverb), not new content Kyutai
  missed.
- The file is only meaningfully audible out to **5.95 s**, not the full 8.44 s — so even
  the "Klangio might cover the whole clip" side of the comparison was working with too
  generous an estimate of how much there is to cover. Real musical content (attacks) is
  concentrated in roughly the first 3-4 s; the rest is tail.

**Revised read:** Kyutai's 3.25 s cutoff is much more defensible than `NOTES.md` gave it
credit for — it looks like it captured the actual note onsets and stopped once there
weren't any more, rather than giving up mid-passage. The open question from before (does
Klangio's PDF actually cover more of the piece?) is still unresolved either way — its PDF
has fewer noteheads than the MIDI has notes (19 vs 24), which doesn't support it having
substantially more content either. Worth updating the "Open" list in `NOTES.md` to reflect
this rather than treating the coverage gap as the headline disagreement.
