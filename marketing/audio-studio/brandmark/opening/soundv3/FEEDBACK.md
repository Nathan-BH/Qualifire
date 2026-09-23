# brandmark/opening — soundv3

**Render:** `opening_v3_with_sound_v3.mp4` — the same picked render (`opening_v3.mp4`,
unchanged) with this round's soundtrack muxed on.
**Also here:** `soundtrack_v3.wav` (stereo)
**Script that made it:** `../soundtrack.py` (rewritten this round — it no longer uses
`../../synth.py`)
**Source video:** `../../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4`
(6.5 s, 1920x1080, no audio — unchanged)
**Source audio:** `../../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`
(8.44 s, stereo; analysis in that folder)
**Built:** 2026-09-23
**Previous round:** `../soundv2/FEEDBACK.md`

## What this is

Nathan, 2026-09-23: "use the tunetank-piano-logo-484286.mp3 for the [opening] render. If
applied correctly which I think is just starting the two at the same time it is an exact
perfect match. The audio file runs a bit longer but at that point it is already silent."

In words: the recording is the whole soundtrack. File t = 0 sits on video t = 0 — no
offset, no trim — exactly as Nathan lined it up by hand. Nothing synthesised is kept, for
three reasons: (1) Nathan called the recording an exact perfect match for the whole
animation, so it is the composition, not a layer on the old one; (2) a produced, wide-stereo,
D-major piano recording plus a mono synthesised sweep/sub-hit in C would clash in key and
in character; (3) the synthesised bed went through `synth.finish()` and scipy, which
Nathan's PC does not have, so keeping any of it would make the build impossible there.

Gain is 0.85. The file is brickwall-limited at a stereo peak of 0.9997 (-0.00 dBFS; the
-0.58 dBFS in the piano project's `WAVEFORM-NOTES.md` is the mono average and understates
it), and the audio-studio ceiling is -1 dBFS (0.891), so unity fails it. 0.85 puts the
master peak at 0.8497 (-1.41 dBFS); 0.89 is the maximum.

A 0.5 s linear fade over the last 0.5 s (6.0-6.5) guarantees the last sample is a true 0:
the file is still at -43 dBFS there, the picture has been black since 6.3 s, and a hard cut
would leave a click of about -39 dBFS. Nothing Nathan heard is changed by it.

What "starting the two at the same time" lands on, beat by beat:

| video beat | at | the track at that moment |
|---|---|---|
| ring starts drawing | 0.00 | file's near-silent head (−53 dBFS over 0.0–0.3) |
| ring ≈ halfway | 0.65 | **opening chord at 0.668** |
| ring completes → slash fades in | 1.30–1.80 | arpeggio's last rising steps (1.477) and the G-chord (1.636) |
| mark starts to fade out | 2.15 | re-strike at **2.125** (25 ms early) |
| mark gone, empty frame | 2.60–2.95 | D5+D6 tremolo ringing |
| **wordmark tween** | **2.95** | **re-strike at 2.928 — 22 ms early** (the wordmark's first visible frame is frame 89 = 2.967 s, so the note leads the first drawn pixel by 39 ms, under the ≈45 ms audio-lead threshold) |
| **tagline tween** | **3.35** | **last re-strike at 3.253 — 97 ms early** (first visible frame 3.367 s; a soft 0.7 s power2.out fade, so its "moment" is diffuse — this is what Nathan heard by hand and called a perfect match) |
| hold | 3.55–5.50 | decay only: −21 dBFS at 3.75 → −37 at 5.5 |
| fade to black | 5.50–6.30 | −37 → −44 dBFS |
| black, hard end | 6.30–6.50 | −44 → −52 dBFS, faded to a true 0 by this brief |

Cycle 15's planned round for this scene (the real logo-reveal sample on the two text
beats, bed kept) was cancelled by Nathan on 2026-09-23 and never ran — cycle 16
README §B / Q7.

**Licence:** per Nathan, 2026-09-23 — free, usable without copyright issues.

## What changed since v2
- Every synthesised element (ring-draw sweep, gate swoosh, C2 pads, sub_hit + chime
  stinger, C3/G3 pad, trailing plucks) -> gone.
- The Tunetank piano logo track plays from t = 0.
- Stereo out (v2 was mono).
- `soundtrack.py` no longer imports `synth.py` or scipy and now builds on Nathan's PC.
- soundv2 is reproducible from git and kept on disk as the earlier round.

## Numbers
`python3 soundtrack.py`:
```
track: 372096 frames (8.4376 s), stereo peak 0.9997 (-0.00 dBFS)
wrote soundv3/soundtrack_v3.wav: 6.5000 s, 2 ch, peak 0.8497 (-1.41 dBFS), last sample 0.000000
```
Check script (run from `marketing/audio-studio/brandmark/`):
```
ch=2 sr=44100 frames=286650 (6.5000 s) peak=0.8497 (-1.41 dBFS) at 1.1912 s, last frame |x|=0.000000
onsets (s): [0.668, 1.477, 1.636, 2.125, 2.928, 3.253]
first attack 0.668 ; before wordmark 2.928 (-0.022) ; before tagline 3.253 (-0.097)
50 ms RMS at 0.65/1.30/2.15/2.95/3.35/5.10/5.50/5.95/6.30/6.45 s: -13.6 / -14.6 / -17.1 / -15.3 / -19.9 / -34.8 / -38.8 / -43.9 / -60.9 / -79.5
window RMS: 0.0-0.3 -53.1 | 5.5-6.3 -43.0 | 6.3-6.5 -64.3 dBFS
  format ch=2 sr=44100 -> PASS
  frames == 286650 (6.5 s) -> PASS
  peak in [0.80, 0.891] (-1 dBFS ceiling) -> PASS
  last frame is 0 -> PASS
  first attack 0.66-0.68 s (file t=0 on video t=0) -> PASS
  re-strike 0.00-0.04 s before the wordmark (2.95) -> PASS
  re-strike 0.08-0.12 s before the tagline (3.35) -> PASS
  head 0.0-0.3 s under -40 dBFS -> PASS
  fade-to-black window 5.5-6.3 s under -30 dBFS -> PASS
ALL PASS
```
`ffprobe` of the mux:
```
stream|codec_name=h264|codec_type=video
stream|codec_name=aac|codec_type=audio|channels=2
format|duration=6.500000
```

## What to listen for
- The two final re-strikes on the wordmark (22 ms early) and the tagline (97 ms early):
  glued, or does the tagline one read early?
- Level: the opening chord at about -10 dBFS RMS is the loudest thing in any scene so far.
  Right for a brand opening, or bring `GAIN` down (Q9)?
- The first 0.65 s: the ring starts drawing to a near-silent head. Fine, or does the ring
  want a sound of its own again? (That would be a layer on top of a track Nathan called
  complete — Q8, answered "nothing kept".)
- Closing goes silent this cycle (`closing/soundv3`, `BRIEF-retire-synth-renders.md`) while
  opening is this piano. Does closing want something to match later? (An option listed
  there, not decided.)

## Nathan's feedback
<!-- write your notes below -->
