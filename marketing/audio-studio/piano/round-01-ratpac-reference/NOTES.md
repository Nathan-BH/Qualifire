# Round 1 - the RatPac logo sting as a reference

**Question:** is there a written repository of soundtracks that an AI could read back?

**Answer:** no, not in the form that would help.

- Transcription archives (midifiles24, mfiles, VGMusic) hold note-level transcriptions of
  full themes. Studio logo stings are essentially never transcribed - too short, and their
  character lives in timbre and mix, which notation does not carry.
- Cue-sheet databases (CueDB, BMI/ASCAP) are rights metadata only: title, composer,
  duration. No musical content.
- Current generative tools (Suno, Udio) take a **text style description**, not notation,
  and block prompts that name a real artist or track.

## What the SnipSound export is good for

`ratpac_snipsound.json` carries loudness-over-time, a key estimate and a tempo estimate.
That is a **shape**, not the music - no melody, harmony, timbre or instrumentation. It
cannot reconstruct the cue, which is the correct outcome; what it can do is describe how
the piece *moves* so something original can be built to the same design.

### The shape read off the energy timeline

| phase | what happens |
|---|---|
| 0-3 s | statement at ~-21 dB, falls away to -35 dB (quietest point in the piece) |
| ~3.9 s | impact back to -20 dB, decays again to -32 dB |
| ~6.9 s | second impact - and this one **holds**, a plateau at -20 to -23 dB for six seconds |
| 12.8 s on | collapse: -26 -> -44 -> -65 dB in under two seconds. Hard cut, short tail, not a fade |

The mechanism is two false starts that each die back, then a third hit that stays and
becomes the body. That is reusable without copying anything.

**Crest factor:** -18.6 LUFS integrated against a -4.7 dBFS peak is ~14 dB of dynamic
range. Master a generated piece loud and the whole effect is gone.

**Trust levels:** key (Bb minor, conf 0.65) is plausible but soft. The 128 BPM should be
discarded - three sparse impacts give autocorrelation almost nothing to lock onto, and the
impacts sit ~3.0 s apart, which is not a clean 128 grid.

### Style prompt derived from the above

> Cinematic studio logo sting, 16 seconds, B-flat minor, no vocals, no drums. Opens on a
> low sustained drone, falls to near-silence. Single deep brass-and-sub impact with long
> reverb tail, decays back. Second impact at the two-thirds point opens into a sustained
> held chord with rising string tension. Abrupt cut to silence at the end, short tail only.
> Wide dynamic range, cinematic, dark, not compressed.

Match the *shape*, not the notes: if the result does not dip to near-silence before each
hit, it has missed the point. Re-export any candidate through SnipSound and diff its
energy timeline against the table above.
