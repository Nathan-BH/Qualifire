# tunetank-emotional-classical: MVSEP stems, waveform analysis (2026-09-24)

This analysis covers the stems of `tunetank-emotional-classical-484234.mp3`, the cycle-16 ride bed.
The same source file is analysed in
`../../piano/projects/tunetank-ride/WAVEFORM-NOTES.md`; this note continues that analysis
stem by stem.

Stems were made by Nathan on mvsep.com on 2026-09-23 (free tier, MP3 320 kbps), with two models:

| model | files (in `sources/`) |
|---|---|
| MVSep Strings | `strings-model_strings.mp3`, `strings-model_other.mp3` |
| BS-Roformer 6-stem ("fuller analysis") | `6stem_vocals / drums / bass / guitar / piano / other.mp3`, plus `6stem_instrum.mp3` (= everything except vocals) |
| reference | `original.mp3`, a copy of `piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3` |

Tools: `analyze_stems.py` in this folder produces the numbers, the verbatim output in
`analysis_output.txt`, and `figures/stems_overview.png`. The per-stem
`figures/waveform_*.png` are made with `../../piano/projects/tunetank/make_waveform.py`
(same format as the tunetank-ride figure):

    ffmpeg -y -v error -i sources/<stem>.mp3 -ar 44100 -ac 2 <tmp>.wav
    python3 ../../piano/projects/tunetank/make_waveform.py <tmp>.wav <stem>.mp3 figures/waveform_<stem>.png

Everything was run on Nathan's PC (device VM). The cloud sandbox has no ffmpeg input for these files.

## Short answer

The track is four layers: **sustained strings, five struck piano chords, light percussion,
and bass**. There are no vocals and no guitar (both stems sit at about −100 dBFS, i.e. empty). The
strings-model split is clean, and the two stems add back up to the original to within
−36.7 dB.

**The strings stop at 11.1 s.** The whole "decrescendo" analysed in the tunetank-ride notes
is not a fade of the ensemble. It is **the fifth piano chord ringing out** (plus a drums/other
reverb tail). The strings stem is gone by 11.9 s (below −60 dBFS).

## Level and energy per stem

(Stereo, aligned to the original; full table in `analysis_output.txt`.)

| stem | RMS dBFS | share of original energy | correlation with original |
|---|---|---|---|
| original | −11.16 | 100 % | 1 |
| **strings-model: strings** | −16.60 | 28.6 % | 0.79 |
| strings-model: other | −14.73 | 44.0 % | 0.87 |
| 6-stem: other | −14.47 | 46.7 % | 0.84 |
| 6-stem: piano | −19.75 | 13.9 % | 0.52 |
| 6-stem: drums | −20.68 | 11.2 % | 0.46 |
| 6-stem: bass | −26.49 | 2.9 % | 0.42 |
| 6-stem: vocals / guitar | ≈ −110 / −102 | 0 % | — (empty) |

Reconstruction residual (original minus the sum of the stems): strings + other **−36.7 dB**,
the six 6-stem parts **−29.1 dB**. Both models are consistent; the strings model loses less.
The energy shares add up to less than 100 % because the stems are not orthogonal. The
residual is the real check.

## Timeline (from `figures/stems_overview.png`, 10 ms envelope onsets)

| file time | what happens | which stem |
|---|---|---|
| 0.00–1.26 s | swell/riser into the downbeat (−27 dBFS) | strings-model: *other*; 6-stem: drums + other. **Not** strings |
| **1.24–1.26 s** | downbeat: strings enter and piano chord 1 is struck | strings, piano |
| 1.26–11.1 s | strings sustain at an even level (−14 to −16 dBFS per 2 s window, no arc) | strings |
| **1.24 / 3.70 / 6.15 / 8.60 / 11.05 s** | the five piano chords, **exactly every 2.45 s**; each decays about 20 dB before the next one | 6-stem: piano |
| 1.7–10.7 s | about 19 small percussion hits, getting denser and louder toward 9.5–10.7 s | 6-stem: drums |
| 1.26–11.1 s | bass follows the chords, cut at 11.1 s | 6-stem: bass |
| 11.05 s | chord 5: the last event in the piece | piano |
| 11.1–11.9 s | strings release (−40 dBFS at 11.55, below −60 at 11.88) | strings |
| 11.1–15.05 s | the "decrescendo" = piano chord 5 ringing plus reverb tail | piano, other, drums |

## What it means for the ride (cycle 16, `ride/ride_tunetank.py`)

Map the piano chords onto the combined clock (file time + placement):

| | chord 1 | chord 2 | chord 3 | chord 4 | chord 5 |
|---|---|---|---|---|---|
| ride 1 (`T1` = 3.80) | 5.04 | 7.50 | 9.95 | 12.40 | 14.85 |
| ride 2 (`T2` = 16.54) | 17.78 | 20.24 | 22.69 | 25.14 | (27.59, after the 26.3 end) |
| E5 gate pulses | 17.80 | 19.81 | 21.65 | 23.51 | 25.38 |

In ride 2, the track's piano plays every **2.45 s** and your E5 pulses come every **~1.86 s**.
Only the first pair coincide (by design). After that, the E5 pulses land 0.43 s before chord 2,
1.04 s before chord 3 (0.82 s after chord 3 for pulse 4) and 0.24 s after chord 4. That puts two
piano layers on two different grids. **A strings-only (or strings + bass + drums, no piano) bed
for ride 2 removes that clash cleanly**, and this split makes it possible.

Consequences to decide on, not done here:

- **Strings-only has no tail.** It ends at 11.9 s of file time (ride 2: about 28.4 s, after the
  26.3 s end, so this doesn't matter for ride 2). In ride 1 it would end at about 15.7 s, and ride 1's
  current fade-out *is* the piano tail. So swap the bed for ride 2 only, or keep the original
  for ride 1.
- **Strings-only also loses the 0–1.26 s swell**, which sits in *other*. In ride 2 the placement
  starts the file at 16.54 so the swell leads into the 17.78 downbeat. Without it, the strings
  just start at 17.80. A middle option is `original − 6stem_piano`, i.e. strings-model *strings* +
  6-stem *drums* + *bass*. That keeps the percussion and the swell and drops only the piano.
- Level: strings alone are about 5.4 dB quieter (RMS) than the original, so `GAIN_BED` would need
  about +5 dB for the same bed loudness, or keep 0.45 and let the E5 pulses sit more forward.

## What it sounds like, read from the stems (added 2026-09-24)

This description comes from the waveforms, the envelopes and the chord read below, without
listening. Nathan read it and agreed.

**Form.** A slow, steady cinematic cue that plays one gesture five times, with no build-up and no
melodic climax:

- **Opening:** a short swell of about 1 s (probably a reverse cymbal or riser) leads into a
  downbeat at 1.26 s.
- **Body:** strings enter on that downbeat and hold one even, sustained layer for 10 s.
- **Piano:** above the strings it strikes a chord every 2.45 s and lets each one decay about
  20 dB before the next. The pacing is spacious and patient, like a slow heartbeat. That is about
  98 BPM if each chord is one 4/4 bar.
- **Percussion:** soft, getting denser and louder toward 9.5–10.7 s. It is the only layer that
  builds, a gentle push into the last chord.
- **Ending:** strings and bass drop out together at 11.1 s. The last piano chord rings alone for
  about 4 s into silence. The piece closes on an exposed, fading piano chord, not an ensemble fade:
  a quiet, lingering ending.

**Character.** Reflective and bittersweet more than dramatic. The chords are a minor-starting
four-chord loop that returns to minor (next section).

## Harmony: chord read (`chroma_stems.py` → `chroma_output.txt`)

Pitch-class (chroma) energy per chord segment, computed separately on three stems. They
agree on every chord, and the bass stem gives an unambiguous root each time:

| chord | time (file s) | piano | strings | bass root | chord |
|---|---|---|---|---|---|
| 1 | 1.24 | E A C | A E C | A | **A minor** |
| 2 | 3.70 | F C A | F A C | F | **F major** |
| 3 | 6.15 | E G C | C G E | C | **C major** |
| 4 | 8.60 | G D B | G B D | G | **G major** |
| 5 | 11.05 | E A C | (strings gone) | (bass gone) | **A minor**, piano only |

- **Progression: Am – F – C – G – Am**, i.e. vi – IV – I – V in C major (or i – VI – III – VII
  in A minor). This is the familiar "emotional/epic" four-chord loop. Starting and ending on the
  minor chord gives the bittersweet colour.
- **Key:** Krumhansl estimate on the whole body gives C major 0.94. A minor ties with F major at
  0.73, but A minor is the same notes as C major (relative minor), and the piece begins and ends
  on Am. Best description: **A minor / C major, all white keys, no accidentals.**
- **Voicing:** the piano's strongest pitch class on the Am chords is E (the fifth, on top), and
  on C it is E and G nearly equal. Octave and register are not measured here (chroma folds
  octaves).

**For the ride:** the Salamander E5 gate pulses (`ride_master.py`) are an **E**, which belongs to
Am and C and is a passing tone against F and G. In ride 2 the pulses fall across chords 1–4
(see the clash table above), so some land on F or G. A pitch-level reason, on top of the rhythm
one, to remove the track's piano under ride 2, or to pick the pulse pitch per chord if it stays.

Caveat: the chord names are inferred from spectral energy on lossy stems. Three independent stems
agreeing makes them solid, but they are not a transcription. The Klangio/Muscriptor route in
`../../piano/projects/tunetank/` would be the cross-check if exact voicings are ever needed.

## Empty stems: vocals and guitar (added 2026-09-24)

| stem | RMS | peak |
|---|---|---|
| 6stem_vocals | −111.7 dBFS | 0.0001 (≈ −80 dBFS) |
| 6stem_guitar | −102.3 dBFS | 0.0001 (≈ −80 dBFS) |
| 6stem_bass (quietest real stem, for scale) | −26.5 dBFS | 0.22 |

Both files are silent: 75–85 dB below the quietest real stem, below what an MP3 at this level
meaningfully carries. Their correlations with the original (0.18 / 0.14) come from leakage at
noise level. The guitar's −25 ms alignment lag in `analysis_output.txt` is the correlator fitting
noise, not a real offset. An empty stem means the model assigned nothing to that label; it does not
prove there is no plucked sound. A soft harp or pizzicato part would more likely land in
*other* or *piano*. The strings split (strings + other rebuild the original to −36.7 dB, with other
following the swell and piano tail) shows no separate plucked line. "No vocals" is certain; "no
guitar" is a well-supported inference. Check by ear: `strings-model_other.mp3`, 3–10 s.

## Caveats

- These are lossy stems of a lossy source (MP3 320 kbps from an MP3 256 kbps original). Listen to
  the strings stem soloed before using it. Artifacts that stand out soloed mostly disappear at bed gain.
- Onset times are from 10 ms RMS jumps, accurate to about ±10 ms, which is enough for the
  frame-level (33 ms) alignment used in the ride.
