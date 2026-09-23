# BRIEF — brandmark/opening: the Tunetank piano logo track as the whole soundtrack (soundv3)

**Status: ready to execute (2026-09-23, Plan tier, Fable; revised the same day after
Nathan's answers Q6–Q9 in `questionsfornathan.md` — target confirmed, nothing kept from
the synthesised round, `GAIN = 0.85` confirmed as the default, and cycle 15 cancelled
entirely so the round-number collision below is gone).** Sonnet-executable: one
whole-file replacement of `marketing/audio-studio/brandmark/opening/soundtrack.py`, one
build, one mux, round docs. **Runs on Nathan's PC through `device_bash`** (the project is
mounted at `$HOME/mnt/Qualifire`), not in the cloud sandbox: the mp3, ffmpeg and the
silent render are there and the WAV/mp4 outputs must land there. Nathan's PC shell has
python3 + numpy + ffmpeg and **no scipy** — the new `soundtrack.py` needs neither scipy
nor `synth.py`, and every command below was dry-run on it at Plan time from a scratch
mirror (`$HOME/scratch16/`; nothing in the repo was executed or written). Stop-on-ambiguity
applies: the one anchor is the current file, quoted in full in §3 with its sha256 and
mtime. Self-contained: independent of this folder's other brief
(`BRIEF-tunetank-ride-soundtrack.md`, a different composition) — execute in any order
relative to it. **This brief covers `brandmark/opening` only. `brandmark/closing` is not
touched by it** (§1.3: the track does not fit it); closing gets a **silent round**
(`closing/soundv3`) from this folder's `BRIEF-retire-synth-renders.md`, because Nathan dropped
every synthesised sound (2026-09-23) and its current `closing/soundv2/` is one.

> **Cycle 15 is cancelled (Nathan, 2026-09-23, Q7) and nothing of it was ever executed.**
> Its `BRIEF-brandmark-logo-reveal-sfx.md` (the real two-note logo-reveal sample on the
> text beats of opening *and* closing, plus `synth.py` numpy-fallback edits S1–S3 and a
> `brandmark/logo_reveal.py` module) will not run — so there is no competing
> `opening/soundv3`, no closing swap, and `synth.py` is still the 2026-09-19 file (checked
> on disk: no `logo_reveal.py`, no `opening/soundv3/`). **Stop trigger (kept, generic):** if
> `opening/soundv3/` already exists, or `opening/soundtrack.py` no longer matches §3's
> sha256, something unplanned happened — do not renumber on your own; report (§8).

## 0. What this is, in one paragraph

Nathan found a second Tunetank track and wants it on the brand opening: "use the
tunetank-piano-logo-484286.mp3 for the [opening] render. If applied correctly which I
think is just starting the two at the same time it is an exact perfect match. The audio
file runs a bit longer but at that point it is already silent." The file is already in the
repo (untracked): `marketing/audio-studio/piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`
(270 001 bytes, 8.438 s, stereo; its waveform/transcription analysis is in that folder's
`WAVEFORM-NOTES.md` / `NOTES.md`). This brief makes the recording **the whole soundtrack**
of `opening_v3.mp4` (6.5 s): file t = 0 on video t = 0, gain 0.85, a 0.5 s fade into the
hard end, stereo out, nothing synthesised kept (§2.2). The picture is untouched.

## 1. Facts this brief rests on (measured on Nathan's PC at Plan time)

### 1.1 The track — `piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`

| | value |
|---|---|
| decode | `ffmpeg -ac 2 -ar 44100 -f f32le` → 372 096 frames = **8.4376 s**, 44.1 kHz, **2 channels** |
| stereo | genuinely wide: L/R correlation 0.06, max abs(L−R) 1.65 — a mono fold-down changes it; the master is stereo |
| **peak** | **0.9997 (−0.00 dBFS) in the left channel at 1.191 s; R 0.9989.** Brickwall-limited: 536 samples above 0.891, the top six peaks (0.691 / 0.783 / 0.851 / 1.015 / 1.191 / 1.662 s) all ≥ 0.9955. The piano project's `WAVEFORM-NOTES.md` figure of 0.9359 (−0.58 dBFS) is the *mono average* of L and R and understates the stereo peak — the "no gain-down needed" reading does not survive a stereo decode. Hence `GAIN = 0.85` (§2.3). |
| head | first sample above −60 dBFS at 0.047 s, above −40 at 0.190, above −30 at 0.339 (= the notes' "audible from 0.34 s"), above −20 at 0.654; **first attack (the opening D-major chord) at 0.668 s** (5 ms high-passed energy −45 → −31 dB; 2 ms RMS −36 → −14 dB at 0.670). Kyutai's MIDI puts that chord at 0.65 — agrees. |
| onsets | 5 ms high-passed-energy detector (> 6 dB jump over the previous 20 ms, above −45 dBFS): **0.668, 1.477, 1.636, 2.125, 2.928, 3.253 s** — the opening chord, the arpeggio's last rising steps, the G4+G5+D6 chord, the D4+F#5+A5 chord, and the two last D5+D6 re-strikes (MIDI: 1.46, 1.62, 2.11, 2.92, 3.25 — agrees to ±10 ms). Inside the arpeggio (0.78–1.02 s) there are further 2 ms jumps of 12–14 dB riding on the chord; nothing after 3.253 s. |
| body / tail | 50 ms stereo RMS: −8 dBFS at 0.75, −11 at 1.0, −16 at 2.0, −18 at 3.0, −21 at 3.75, −22 at 4.0, −27 at 4.5, −32 at 5.0, −37 at 5.5, −42 at 5.75, −43 at 6.0, −48 at 6.25, **−52 at 6.5**, −58 at 6.75, −63 at 7.0, −94 at 8.0. Last sample above −40 dBFS **6.607 s**, above −50 7.004, above −60 7.429. Nothing but decay after 3.5 s (matches `WAVEFORM-NOTES.md`). |
| at the video's end | at 6.45–6.50 s the file's largest sample is 0.013 (−37.7 dBFS): "already silent" to the ear, not digital silence — hence the 0.5 s fade (§2.4). |

### 1.2 The animation (unchanged by this brief — `index.html` is not touched)

`silent-studio/brandmark/opening/index.html`, canonical, 6.5 s, **no lead-in blackout:
the ring starts drawing at literal t = 0.** Ring draws 0–1.3 (power2.inOut), yellow slash
1.3–1.8, mark fades out 2.15–2.6, empty frame to 2.95, wordmark tween 2.95–3.75, tagline
tween 3.35–4.05, hold, fade to black 5.5–6.3, hard end 6.5. Silent render:
`silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4` (6.500000 s, 1920×1080, 30 fps,
no audio — ffprobe at Plan time), also present as `silent-studio/all-renders/opening_v3.mp4`.

### 1.3 Which render Nathan meant, and why closing is out

Nathan pasted the mp3 path twice; the coordinator resolved the target by arithmetic and
this pass re-checked it. Nathan says the file "runs a bit longer but at that point it is
already silent". Against the two brandmark candidates:

| candidate | clip length | file at the cut (50 ms RMS) | "already silent"? |
|---|---|---|---|
| **opening** (`opening_v3.mp4`) | **6.5 s** | **−52 dBFS**; the file's audible window (−30 dBFS+) ended at 5.95 | **yes** — 1.94 s of tail cut off, all of it below −43 dBFS |
| closing (`closing_v4.mp4`) | 4.0 s | **−19 dBFS** (3.2–4.0 s mean −15 dBFS) | no — the piece would be cut mid-ring-out |

Opening it is (Nathan, Q6: "it was the opening so you are correct"). Closing is not touched
by this brief; it goes silent via `BRIEF-retire-synth-renders.md` (cycle 15's swap for it is
cancelled, and no cycle-16 recording fits 4.0 s).

### 1.4 What "starting the two at the same time" lands on — beat by beat

With the file's t = 0 on the video's t = 0 (no offset, no trim):

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

The piece's own last two attacks punctuate the two text beats, then its decay carries the
hold and dies under the fade. No alternative placement was needed or tried: the numbers
confirm Nathan's description rather than improve on it. (Trimming the 0.34 s head or
nudging by the 22 ms would be "overthinking" — both are within a frame or so of what he
heard and would break "just starting the two at the same time".)

## 2. Design decisions (each a ruling; the open ones are also in `questionsfornathan.md`)

### 2.1 The recording is the soundtrack; file t = 0 on video t = 0

`T0 = 0.0`, whole file placed, clipped to 6.5 s by `window_mix.place`. One constant.

### 2.2 Drop everything synthesised (default) — the alternative is logged, not built

soundv2's bed is a ring-draw sweep + C2 pad (0–1.3 s), a gate swoosh (1.3–1.8), a C2
bridging pad (1.8–2.95), the `sub_hit` + `chime` BRAND_STINGER (2.95 / 3.35), a C3/G3 pad
(3.35–5.55) and three high plucks (5.0–6.2). Every one of those occupies real estate the
piano now fills — the sweep and swoosh sit under the opening chord and arpeggio, the
stinger on the very beats the piece's own re-strikes hit, and the pads/plucks under the
decay. **Ruling: none of it is kept.** Reasons, in order of weight:

1. Nathan's words are "an exact perfect match" for the whole animation: the recording is
   the composition, not a layer on the old one.
2. Two sound worlds: a produced, wide-stereo, D-major piano recording plus a mono
   synthesised sweep/sub-hit in C would clash in key (soundv2's pads and stinger are C-rooted;
   the piece is D major per both transcriptions) and in character.
3. Tooling: the synthesised bed goes through `synth.finish()` → `reverb()` → scipy's
   `lfilter`, and Nathan's PC has no scipy (cycle 15's planned numpy fallback for it was
   cancelled). Keeping any of it would make the build impossible there. Keeping none of it
   makes `soundtrack.py` scipy-free and `synth.py`-free.

Nathan's answer (Q8, 2026-09-23): nothing kept — with one caveat the coordinator owes him
in chat: he judged "the audio for that render" by the *teaser's* soundv2
(`marketing/audio-studio/teaser/soundv2/teaser_v6_with_sound_v2.mp4`), which is a different
file from this scene's soundv2 (`marketing/audio-studio/brandmark/opening/soundv2/`). The
teaser's first 6.5 s are built from the same synthesised elements at slightly lower
amplitudes (`teaser/soundtrack.py` lines 46–53: the 220→660 Hz sweep, the whoosh at 1.3, the
sub-hit + chime stinger at 2.95/3.35, the C2 and C3/G3 pads), so his judgement does transfer;
he may still object once told which file was meant. (Moot in practice since his later
same-day instruction dropped every synthesised sound anywhere.)

*Alternative considered (Q8):* keep only the three trailing plucks (5.0 / 5.28 / 5.56 s,
amp 0.06, C5/G4/E4) as an outro shimmer under the fade. The piano is at −32…−37 dBFS
there, so they would be audible over it — which is exactly the problem: they are C-major
plucks over a D-major ring-out, added on top of a track Nathan called complete. Not built;
it is a three-line addition later if he asks (and it would re-introduce the scipy
dependency through `finish()`).

The synthesised soundv2 remains reproducible: `soundtrack.py` at soundv2 is committed
(`git show HEAD:marketing/audio-studio/brandmark/opening/soundtrack.py`), and its outputs
stay in `soundv2/`. The shared `synth.py` (BRAND_STINGER etc.) is not edited by this brief.

### 2.3 Gain 0.85 → master peak 0.8497 (−1.41 dBFS)

audio-studio convention: master peak ≤ −1 dBFS (0.891). The file peaks at 0.9997, so
unity gain fails it. Sweep (peak = 0.9997 × GAIN, no other layer):

| `GAIN` | master peak | |
|---|---|---|
| 1.00 | 0.9997 (−0.00 dBFS) | over |
| 0.90 | 0.8997 (−0.92) | over |
| 0.89 | 0.8897 (−1.02) | the ceiling, no margin |
| **0.85** | **0.8497 (−1.41)** | **chosen — 0.4 dB under the ceiling, and the file's own brickwall ceiling is what set the limit, not a musical choice** |
| 0.80 | 0.7997 (−1.94) | fine, just quieter than necessary |

For scale against the rest of the video: the opening chord/arpeggio sits at −8…−11 dBFS
(50 ms RMS × 0.85 → ≈ −9.5…−12.5), which is louder than anything in soundv2 (ring-draw
peak 0.307 ≈ −10 dBFS) and comparable to the ride's Tunetank bed at 0.45 (body −5…−10
dBFS × 0.45 ≈ −12…−17). If Nathan wants the opening quieter relative to the ride, it is
one constant (Q9 default: 0.85).

### 2.4 A 0.5 s fade into the hard end (6.0–6.5 s)

The file is still at −43 dBFS 50 ms RMS at 6.0 s and its largest sample in the last 50 ms
before the cut is −37.7 dBFS (§1.1); a hard cut at 6.5 would leave a ≈ −39 dBFS click
(after gain) — inaudible in practice, but a master should end on a 0. `window_mix.fade_out`
over the last 0.5 s (the picture is black from 6.3 s; the fade starts 0.5 s after the fade
to black begins) guarantees `last sample = 0` and changes nothing Nathan heard. Not applied
anywhere else — no fade-in (the file's own head is the fade-in), no trim.

### 2.5 Nothing passes through `synth.finish()`; stereo out; ffmpeg decode

The recording is already produced: no `soften()`, no reverb, no limiter. Stereo WAV
(the second stereo round in audio-studio after this folder's ride brief, if that lands
first). Decode via ffmpeg's stdout as raw
float32 (the same `decode_stereo` as `ride_tunetank.py` in this folder's other brief), no
temp file, no 16-bit requantise. `-ac 2` explicitly: `-ac 1` would sum L+R at −3 dB each
and misreport the peak.

### 2.6 Where the mp3 lives: referenced from the piano project, not copied

`soundtrack.py` points at `../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`
— the analysed copy, one source of truth (the ride brief does the same with its track).
(Cancelled cycle 15 had put its sample in `brandmark/sfx/`, where it still sits unused;
this track is not a sfx, it is a piece with a transcription project around it, so it stays
where it is.) The pipeline now depends on that
untracked folder (§8).

## 3. The edit — `marketing/audio-studio/brandmark/opening/soundtrack.py`, whole-file replacement

**Anchor: the current file, in full.** Before writing, verify all three of:
`sha256sum` = `7a2697c421a6cfe8a77217626813237a7595c5cc65dbe5d102002ba17eafc59a`,
`wc -l` = 77, mtime 2026-09-13 22:08 UTC (`stat -c %y`). If any differs, **stop** (the
file changed since Plan time — nothing planned should have touched it, cycle 15 being
cancelled; see the note at the top) and report. The current content, for the record (lines 1–77):

```python
"""
brandmark/opening - soundv2

Source: opening_v3.mp4, 6.5s, 1920x1080, no audio (unchanged from soundv1 -
this round only touches the audio, not the picture).
Visual: ring draws clockwise (0-1.3s) -> yellow slash/gate fades in (1.3-1.8s)
-> full mark fades out (2.15-2.6s) -> black beat -> "QUALIFIRE" wordmark fades
in (2.95-3.75s) -> tagline "Same road. New meaning." fades in (3.35-4.05s,
overlapping) -> holds -> fades to black (5.5-6.3s).

Nathan's soundv1 feedback (two items):
1) "the logo drawing should also have a sound, since it is in two parts it is
   pretty easy, a sound for the drawing and then maybe a kind of swoosh for
   the gate" - the ring-draw (0-1.3s) now gets an actual sound (a rising
   pitch sweep tracking the stroke being drawn on), and the slash/gate
   fade-in (1.3-1.8s) gets a swoosh.
2) "for the second text part, it should be only a two-beat sound (similarly
   to the Netflix sound) because only two things are being shown right after
   each other" - the wordmark+tagline reveal no longer plays the old
   rise-chime-then-land-chime pair; it now plays exactly two beats, the new
   shared BRAND_STINGER (low boom on the wordmark, bright ring on the
   tagline) - see synth.py. Closing's own soundv2 reuses this same stinger
   in full, so both ends of the video use the identical brand sound.
"""
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, whoosh, pluck, sweep, sub_hit,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
)

DURATION = 6.5


def build():
    m = new_master(DURATION)

    # 0.0-1.3s: the ring draws on - a rising pitch sweep tracks the stroke
    # being drawn (low -> higher as more of the circle completes), plus a
    # very faint low pad underneath so the moment doesn't start from total
    # silence.
    mix_into(m, pad([NOTES["C2"]], dur=1.6, amp=0.04, attack=0.3, release=0.6), 0.0)
    mix_into(m, sweep(220, 660, dur=1.3, amp=0.22, attack=0.05, release=0.15), 0.0)

    # 1.3-1.8s: the slash/gate fades in - a short swoosh answers the ring's
    # sweep, same "two parts, two sounds" structure as the visual.
    mix_into(m, whoosh(dur=0.55, amp=0.3), 1.3)

    # 1.8-2.95s: quiet pad bridges the mark's fade-out to the text reveal -
    # anticipation, not yet melodic.
    mix_into(m, pad([NOTES["C2"]], dur=1.3, amp=0.05, attack=0.4, release=0.5), 1.8)

    # ~2.95s / ~3.35s: the brand stinger, exactly two beats, one per text
    # element (wordmark, then tagline) - replaces the old rise+land chime
    # pair per Nathan's "only a two-beat sound, similarly to the Netflix
    # sound, because only two things are being shown right after each other."
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.3, amp=0.55), 2.95)
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=1.6, amp=0.4, stagger=0.09), 3.35)

    # Sustained pad underneath the second beat so it doesn't feel like a bare
    # sting - carries the mix to the end of the clip.
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=2.2, amp=0.09, attack=0.6, release=1.2), 3.35)

    # A few soft high plucks trailing off like a shimmer, as the tagline
    # settles (unchanged from soundv1).
    for i, f in enumerate([NOTES["C5"], NOTES["G4"], NOTES["E4"]]):
        mix_into(m, pluck(f, dur=1.2, amp=0.06, brightness=0.7), 5.0 + i * 0.28)

    return finish(m, DURATION, wet=0.3, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
```

**Replace the whole file with the following, verbatim** (122 lines; this exact text was
dry-run on Nathan's PC from `$HOME/scratch16/brandmark/opening/soundtrack.py` with the
same relative layout — `window_mix.py`/`salamander_render.py` two levels up, the mp3 at
`../../piano/projects/tunetank/sources/`):

```python
"""
brandmark/opening - soundv3 (cycle 16): Nathan's real piano logo track carries
the whole scene. Nothing is synthesised any more.

Source video: ../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4
(6.5 s, 1920x1080, 30 fps, no audio - unchanged since soundv1; this round only
touches the audio).
Visual: ring draws clockwise (0-1.3 s) -> yellow slash/gate fades in (1.3-1.8)
-> full mark fades out (2.15-2.6) -> empty frame -> "QUALIFIRE" wordmark fades
in (2.95-3.75) -> tagline "Same road. New meaning." (3.35-4.05, overlapping)
-> hold -> fade to black (5.5-6.3), hard end 6.5.

Track: ../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3
(Nathan, 2026-09-23: "use the tunetank-piano-logo mp3 for the opening render.
If applied correctly, which I think is just starting the two at the same time,
it is an exact perfect match. The audio file runs a bit longer but at that point
it is already silent"). 8.438 s, 44.1 kHz, genuinely stereo (L/R correlation
0.06). Measured on Nathan's PC (ffmpeg decode, numpy): near-silent head, first
attack (the opening D-major chord) at 0.668 s, a rising arpeggio through
1.0-1.7 s, re-struck D5+D6 pairs at 2.125 / 2.928 / 3.253 s, then only decay -
50 ms RMS -31 dBFS at 5.1 s, -38 at 5.95, -44 at 6.3, -49 at 6.45; the last
sample above -40 dBFS is at 6.61 s and the container runs to 8.44 s.
Peak 0.9997 (-0.00 dBFS, left channel, brickwall-limited: 536 samples above
0.891) - the mono-average figure in the piano project's WAVEFORM-NOTES.md
(-0.58 dBFS) understates the stereo peak, hence GAIN below.

Placement (marketing/cycles/16_ride-tunetank-soundtrack/
BRIEF-tunetank-piano-logo-opening.md): the file's t = 0 on the video's t = 0,
exactly as Nathan lined it up by hand - no offset, no trim. That puts the first
chord at 0.668 s, halfway through the ring draw; the arpeggio across the ring's
completion and the slash (1.3-1.8); a re-strike 25 ms before the mark starts to
fade (2.15); and the last two re-strikes 22 ms before the wordmark (2.95) and
97 ms before the tagline (3.35) - the two text beats are punctuated by the
piece's own final two attacks, which is the "exact perfect match" he heard.
The decay then carries the hold (3.55-5.5) and is at -35..-44 dBFS under the
fade to black; the video ends 1.94 s before the file does, in the file's tail.

GAIN 0.85 puts the stereo peak at 0.8497 (-1.41 dBFS), under the audio-studio
ceiling of -1 dBFS (0.891) with 0.4 dB to spare; 0.89 is the maximum. A 0.5 s
linear fade into the hard end (6.0-6.5 s) only guarantees the last sample is 0:
the file is at -43 dBFS there and the picture has been black since 6.3 s, so
nothing Nathan heard is changed (a hard cut would leave a -39 dBFS click).
Stereo out; nothing passes through synth.finish() (no reverb, no soften - the
recording is already produced), and nothing here imports synth.py or scipy, so
this file rebuilds on Nathan's PC as is.

The synthesised soundv2 build (ring-draw sweep, gate swoosh, C2 pads, the
sub_hit + chime BRAND_STINGER, C3/G3 pad, trailing plucks) is not carried
forward and is recoverable from git history (this file at soundv2, built
2026-09-13). An earlier plan (cycle 15, cancelled by Nathan on 2026-09-23,
never executed) would have put his logo-reveal sample on the two text beats
with the synthesised bed kept; it is not part of this round - see the cycle 16
README. Closing is untouched by this file and this track does not fit it
(the file is still at -19 dBFS when closing's 4.0 s end cuts it).

    cd marketing/audio-studio/brandmark/opening
    python3 soundtrack.py         # -> soundv3/soundtrack_v3.wav
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", ".."))  # -> audio-studio/ (window_mix)

import window_mix as wm

SR = 44100
DURATION = 6.5
TRACK = os.path.join(HERE, "..", "..", "piano", "projects", "tunetank", "sources",
                     "tunetank-piano-logo-484286.mp3")

T0 = 0.0            # file t=0 on video t=0 - Nathan's "just starting the two at the same time"
GAIN = 0.85         # stereo peak 0.9997 -> 0.8497 (-1.41 dBFS); 0.89 is the -1 dBFS ceiling
END_FADE = 0.5      # linear fade over the last 0.5 s (6.0-6.5), so the hard end is a true 0


def dbfs(x):
    return 20 * math.log10(x + 1e-12)


def decode_stereo(path, sr=SR):
    """ffmpeg -> float64 stereo (n, 2) at sr, straight from stdout as raw float32.
    No downmix: -ac 1 would sum L+R at -3 dB each and misreport the peak."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def write_wav_stereo(path, x, sr=SR):
    """x: (n, 2) float in [-1, 1] -> 16-bit interleaved stereo WAV (stdlib wave)."""
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.ascontiguousarray(pcm).tobytes())


def build():
    n = int(round(DURATION * SR))
    track = decode_stereo(TRACK)
    m = np.zeros((n, 2), dtype=np.float64)
    for ch in range(2):
        wm.place(m[:, ch], track[:, ch], T0, gain=GAIN, sr=SR)
        wm.fade_out(m[:, ch], DURATION, END_FADE, sr=SR)
    return m, track


if __name__ == "__main__":
    audio, track = build()
    print("track: %d frames (%.4f s), stereo peak %.4f (%.2f dBFS)" % (
        len(track), len(track) / SR, np.abs(track).max(), dbfs(np.abs(track).max())))
    os.makedirs(os.path.join(HERE, "soundv3"), exist_ok=True)
    out = os.path.join(HERE, "soundv3", "soundtrack_v3.wav")
    write_wav_stereo(out, audio)
    peak = float(np.abs(audio).max())
    print("wrote soundv3/soundtrack_v3.wav: %.4f s, %d ch, peak %.4f (%.2f dBFS), last sample %.6f" % (
        len(audio) / SR, audio.shape[1], peak, dbfs(peak), float(np.abs(audio[-1]).max())))
```

Notes for the executor: `window_mix` imports `salamander_render` (for its `write_wav`
re-export); that import succeeds on Nathan's PC without scipy (it did in the dry run and
in this folder's ride brief). `build()` returns `(master, track)` so the check script and
the `__main__` block share one decode. Nothing else in `audio-studio/` is edited:
not `synth.py`, not `window_mix.py`, not `closing/`; `brandmark/logo_reveal.py` does not
exist (it was cycle 15's, cancelled) and must not be created.

## 4. Build, mux, `all-renders/` (Nathan's PC, `device_bash`)

Stop at the first failure and report it.

```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/opening && python3 soundtrack.py
```
Expected output, to the digit (deterministic — same machine, same code, same file):
```
track: 372096 frames (8.4376 s), stereo peak 0.9997 (-0.00 dBFS)
wrote soundv3/soundtrack_v3.wav: 6.5000 s, 2 ch, peak 0.8497 (-1.41 dBFS), last sample 0.000000
```
Then the mux (stereo AAC), the probe, the `all-renders/` swap, the replaced quick-look copy
to `_to_delete/` (never `rm`, never request delete permission):
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio/brandmark/opening/soundv3 && ffmpeg -y -v error -i ../../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4 -i soundtrack_v3.wav -c:v copy -c:a aac -b:a 192k -shortest opening_v3_with_sound_v3.mp4 && ffprobe -v error -show_entries stream=codec_type,codec_name,channels:format=duration -of compact opening_v3_with_sound_v3.mp4 && ls -la
mkdir -p $HOME/mnt/Qualifire/_to_delete && cd $HOME/mnt/Qualifire/marketing/audio-studio/all-renders && mv opening_v3_with_sound_v2.mp4 $HOME/mnt/Qualifire/_to_delete/all-renders_opening_v3_with_sound_v2_replaced_in_all-renders_by_v3.mp4 && cp ../brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4 . && ls -la
```
Expected `ffprobe` (dry-run values): `stream|codec_name=h264|codec_type=video`,
`stream|codec_name=aac|codec_type=audio|channels=2`, `format|duration=6.500000`; the mp4
≈ 364 KB, the WAV 1 146 644 bytes. `silent-studio/all-renders/opening_v3.mp4` is already
current — nothing to do on the silent side. (`mv` across mounts may copy-then-fail on the
source; if so, report it — do not request delete permission.) The `all-renders/` swap is
`structure.md`'s standing "latest round per scene" convention, not a verdict: `soundv2/`
keeps its own copy of the same mux, for reference; soundv2 is an earlier round, not
"superseded" (Nathan, Q5) — and, per his later "no synthesised sounds", not an alternative.

## 5. Round docs (markdown only)

1. **Create `brandmark/opening/soundv3/FEEDBACK.md`** (the folder exists after §4; stop
   trigger if the *file* exists). Shape of `soundv2/FEEDBACK.md`. Header lines —
   **Render:** `opening_v3_with_sound_v3.mp4` — the same picked render (`opening_v3.mp4`,
   unchanged) with this round's soundtrack muxed on; **Also here:** `soundtrack_v3.wav`
   (stereo); **Script that made it:** `../soundtrack.py` (rewritten this round — it no
   longer uses `../../synth.py`); **Source video:**
   `../../../../silent-studio/brandmark/opening/rounds/v3/opening_v3.mp4` (6.5 s, 1920×1080,
   no audio — unchanged); **Source audio:**
   `../../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3` (8.44 s, stereo;
   analysis in that folder); **Built:** 2026-09-23; **Previous round:** `../soundv2/FEEDBACK.md`.
   "What this is": Nathan's words (§0, quoted), then in your own words: the recording is
   the whole soundtrack, file t = 0 on video t = 0, nothing synthesised kept and why
   (§2.2's three reasons), gain 0.85 and why (§2.3 — the file is brickwall-limited at
   0.9997), the 0.5 s end fade and why (§2.4), and the §1.4 table (copy it). "What changed
   since v2": bullets — every synthesised element (sweep, swoosh, C2 pads, sub_hit + chime
   stinger, C3/G3 pad, plucks) → gone; the Tunetank piano logo track from t = 0; stereo
   out; `soundtrack.py` no longer imports `synth.py` or scipy and now builds on Nathan's
   PC; soundv2 is reproducible from git and kept on disk as the earlier round. Add one
   line: "Cycle 15's planned round for this scene (the real logo-reveal sample on the two
   text beats, bed kept) was cancelled by Nathan on 2026-09-23 and never ran — cycle 16
   README §B / Q7." Add one line: "**Licence:** per Nathan, 2026-09-23 — free, usable
   without copyright issues." "Numbers": the two
   `python3 soundtrack.py` lines, the §6.1 output and the `ffprobe` lines, verbatim. "What
   to listen for": (a) the two final re-strikes on the wordmark (22 ms early) and tagline
   (97 ms early) — glued, or does the tagline one read early? (b) level: the opening chord
   at ≈ −10 dBFS RMS is the loudest thing in any scene so far — right for a brand opening,
   or bring `GAIN` down (Q9)? (c) the first 0.65 s: the ring starts drawing to a
   near-silent head — fine, or does the ring want a sound of its own again (that would be
   a layer on top of a track Nathan called complete — Q8, answered "nothing kept")? (d)
   closing goes silent this cycle (`closing/soundv3`, `BRIEF-retire-synth-renders.md`)
   while opening is this piano — does closing want something to match later (an option
   listed there, not decided)? Empty
   "Nathan's feedback" section with the usual `<!-- write your notes below -->` line.
2. **`brandmark/opening/README.md`** (stale — its table stops at soundv1): line 3's source
   video stays. Add two rows after the soundv1 row, same format:
   `| [soundv2](soundv2/FEEDBACK.md) | opening_v3_with_sound_v2.mp4 | Built 2026-09-13 — earlier round, kept on disk (synthesised) |`
   `| [soundv3](soundv3/FEEDBACK.md) | opening_v3_with_sound_v3.mp4 | Built 2026-09-23, awaiting Nathan's feedback — Nathan's Tunetank piano logo track as the whole soundtrack, nothing synthesised (cycle 16) |`
   and change soundv1's status cell to `Built — earlier round, kept on disk`. Never write
   "superseded" (Nathan, Q5). Replace lines 5–6 ("Source
   code: … own tones.") with: "Source code: `soundtrack.py` here — canonical, edited in
   place each round. Since soundv3 it places a real recording
   (`../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`) and no longer
   uses `../../synth.py`." Replace the "Sonic direction so far" paragraph with: "Since
   soundv3 the opening *is* Nathan's Tunetank piano logo track, started with the video: a
   near-silent head while the ring begins to draw, the opening D-major chord halfway
   through the draw, a rising arpeggio across the ring's completion and the gate, and the
   piece's last two re-strikes landing on the "QUALIFIRE" wordmark and the tagline; its
   decay carries the hold and dies under the fade to black. Nothing synthesised remains
   (soundv1–2's brand chime/stinger direction is in `soundv2/FEEDBACK.md` and git). Full
   rationale in `soundv3/FEEDBACK.md`."
3. **`brandmark/README.md`**: the opening row → `| [opening/](opening/README.md) | in progress — soundv3 | `opening/soundv3/FEEDBACK.md` |`;
   the closing row is item D's (`BRIEF-retire-synth-renders.md`) — leave it whatever state it
   is in. In the "Both share a **brand chime**…" paragraph append one sentence: "Since cycle
   16 (opening soundv3) the opening no longer uses the synthesised brand chime/stinger at all
   — it is Nathan's Tunetank piano logo recording end to end (see `opening/README.md`); the
   shared chime stays in `synth.py` for the earlier rounds only — no new round uses it
   (Nathan, 2026-09-23)." If item D has already added its closing sentence to that paragraph,
   put this one before it; either order is acceptable, neither executor removes the other's.
4. **`brandmark/opening/AUDIO-BRIEF.md`** — the direction changed (Nathan supplied the
   whole soundtrack), which per its own "How this file is used" #4 is the case where it
   *is* edited: line 4 → `**Current soundtrack round:** soundv3 (`soundv3/FEEDBACK.md`)`;
   the "Sounds like now (Claude)" column of every beat row, Nathan's column untouched:
   beat 0 → `Tunetank piano logo track from t=0: near-silent head, opening D-major chord at 0.67 s halfway through the draw, arpeggio rising from 1.0 s`;
   beat 1 → `Arpeggio's last rising steps (1.48) and a G-chord (1.64) as the gate lands`;
   beat 2 → `Chord ringing`;
   beat 3 → `Re-strike at 2.13 as the mark starts to fade; D5+D6 tremolo rings through the empty frame`;
   beat 4 → `Piece's penultimate re-strike at 2.93 (22 ms before the wordmark)`;
   beat 5 → `Piece's last re-strike at 3.25 (97 ms before the tagline)`;
   beat 6 → `Decay only (no new attacks): −21 dBFS at 3.75 s falling to −37 at 5.5`;
   beat 7 → `Decay −37 → −44 dBFS under the fade; 0.5 s fade to a true zero at 6.5 (the file itself runs to 8.44 s, silent past ~6)`;
   and, under the table, a new italic line: *Direction change 2026-09-23 (cycle 16):
   Nathan supplied the whole soundtrack — the Tunetank piano logo track
   (`../../piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`), started with
   the video, nothing synthesised kept. Every "Sounds like now" cell updated; times
   unchanged (the visual is still v3). Cycle 15's planned logo-reveal-sample round for this
   scene was cancelled and never ran; closing gets a silent round in this cycle.* Status stays
   `draft`; Nathan's column stays empty.
5. Do **not** edit `closing/` anything, `synth.py`, `window_mix.py`, `structure.md`,
   `APPROACH.md`, any `index.html`, `piano/projects/tunetank/` (its NOTES/WAVEFORM files are
   someone else's analysis — the stereo-peak correction in §1.1 is reported to the
   coordinator, not written there), anything under `ride/`, or this cycle's other files;
   do not touch `soundv1/` or `soundv2/`.

## 6. Verification (executor — numbers, not adjectives)

1. **The check script.** Save the following outside the repo (e.g. `$HOME/check_opening_v3.py`)
   and run it from `marketing/audio-studio/brandmark/` after §4:
   ```python
   """Cycle-16 check for brandmark/opening soundv3 (the Tunetank piano logo track).
   Run from marketing/audio-studio/brandmark/ after `python3 soundtrack.py` in opening/:
   format, exact length, peak under -1 dBFS, true-zero end, the track's first attack
   and its last two re-strikes where the brief says they land relative to the wordmark
   (2.95) and tagline (3.35) tweens, and the level under the fade to black."""
   import math, wave, numpy as np
   SR = 44100
   with wave.open("opening/soundv3/soundtrack_v3.wav", "rb") as f:
       ch, sr, n = f.getnchannels(), f.getframerate(), f.getnframes()
       x = np.frombuffer(f.readframes(n), dtype=np.int16).reshape(-1, ch).astype(np.float64) / 32768.0
   def db(v): return 20 * math.log10(v + 1e-12)
   mono = x.mean(axis=1)
   a = np.abs(x).max(axis=1)
   peak = float(a.max())
   def rms(t0, t1): return db(float(np.sqrt(np.mean(mono[int(t0 * SR):int(t1 * SR)] ** 2))))
   # onsets: 5 ms high-passed energy jumping > 6 dB over the previous 20 ms, above -45 dBFS
   hp = np.diff(mono, prepend=0.0); w = int(0.005 * SR); m = len(hp) // w
   r = 20 * np.log10(np.maximum(np.sqrt((hp[:m * w].reshape(m, w) ** 2).mean(axis=1)), 1e-9))
   onsets, last = [], -1.0
   for i in range(4, m):
       if r[i] - r[i - 4:i].max() > 6 and r[i] > -45 and i * w / SR - last > 0.06:
           last = i * w / SR; onsets.append(round(last, 3))
   first_attack = onsets[0]
   pre_word = max(t for t in onsets if t < 2.95)
   pre_tag = max(t for t in onsets if t < 3.35)
   checks = {
       "format ch=2 sr=44100": ch == 2 and sr == SR,
       "frames == 286650 (6.5 s)": n == 286650,
       "peak in [0.80, 0.891] (-1 dBFS ceiling)": 0.80 <= peak <= 0.891,
       "last frame is 0": float(np.abs(x[-1]).max()) == 0.0,
       "first attack 0.66-0.68 s (file t=0 on video t=0)": 0.66 <= first_attack <= 0.68,
       "re-strike 0.00-0.04 s before the wordmark (2.95)": 0.0 <= 2.95 - pre_word <= 0.04,
       "re-strike 0.08-0.12 s before the tagline (3.35)": 0.08 <= 3.35 - pre_tag <= 0.12,
       "head 0.0-0.3 s under -40 dBFS": rms(0.0, 0.3) < -40,
       "fade-to-black window 5.5-6.3 s under -30 dBFS": rms(5.5, 6.3) < -30,
   }
   print("ch=%d sr=%d frames=%d (%.4f s) peak=%.4f (%.2f dBFS) at %.4f s, last frame |x|=%.6f" % (
       ch, sr, n, n / sr, peak, db(peak), int(np.argmax(a)) / SR, float(np.abs(x[-1]).max())))
   print("onsets (s):", onsets)
   print("first attack %.3f ; before wordmark %.3f (%+.3f) ; before tagline %.3f (%+.3f)" % (
       first_attack, pre_word, pre_word - 2.95, pre_tag, pre_tag - 3.35))
   print("50 ms RMS at 0.65/1.30/2.15/2.95/3.35/5.10/5.50/5.95/6.30/6.45 s: " + " / ".join(
       "%.1f" % rms(t, t + 0.05) for t in (0.65, 1.30, 2.15, 2.95, 3.35, 5.10, 5.50, 5.95, 6.30, 6.45)))
   print("window RMS: 0.0-0.3 %.1f | 5.5-6.3 %.1f | 6.3-6.5 %.1f dBFS" % (rms(0, 0.3), rms(5.5, 6.3), rms(6.3, 6.5)))
   ok = True
   for k, v in checks.items():
       ok &= v; print("  %s -> %s" % (k, "PASS" if v else "FAIL"))
   print("ALL PASS" if ok else "SOMETHING FAILED")
   ```
   **Pass criteria — computed at Plan time on Nathan's PC from the scratch mirror with
   this exact code; must match to the last printed digit:**
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
   (The RMS figures here are of the *master* — mono-average of L/R, × 0.85, 16-bit, faded —
   so they sit below the raw-file stereo figures quoted in §1.1 and the docstring; that is
   expected, not a discrepancy. The 6.30 and 6.45 values are inside the end fade.)
2. **Greps** (from `marketing/audio-studio/`):
   `grep -n "synth\|scipy\|wavfile\|sub_hit\|BRAND_STINGER" brandmark/opening/soundtrack.py`
   → hits only inside the docstring (lines ≤ 58; none in code — check that every hit's line
   number is below the line `import math`); `grep -c "" brandmark/opening/soundtrack.py` → 122;
   `sha256sum brandmark/closing/soundtrack.py synth.py window_mix.py` → unchanged from before
   the run (record the pre-run values first);
   `GIT_OPTIONAL_LOCKS=0 git -c core.quotepath=off status --short marketing/audio-studio`
   → modified: `brandmark/opening/soundtrack.py`, `brandmark/opening/README.md`,
   `brandmark/opening/AUDIO-BRIEF.md`, `brandmark/README.md`, `all-renders/` (one deleted,
   one untracked); untracked: `brandmark/opening/soundv3/`, plus whatever was already
   untracked (`brandmark/sfx/`, `piano/projects/tunetank/`). **Do not commit** (Nathan's
   call; note in the report that `piano/projects/tunetank/sources/` must be committed with
   the code, since `soundtrack.py` now reads from it).
3. **Not applicable, do not run:** `closing/soundtrack.py`, anything under `ride/`,
   `gates-saving/`, the other scenes, `app/` tests, the piano project's scripts.

## 7. Report format

Post-edit line count and sha256 of `opening/soundtrack.py`; the two `python3 soundtrack.py`
output lines, the §6.1 output and the `ffprobe` lines verbatim; the grep results;
`ls -la audio-studio/all-renders/` and `ls -la $HOME/mnt/Qualifire/_to_delete/` after §4;
one sentence per stop trigger (the §3 sha256/line-count/mtime mismatch; `opening/soundv3/`
or its `FEEDBACK.md` already existing; a §4 command failing — including the `mv` to
`_to_delete/`; any §6.1 value off by more than 1 in the last printed digit).

## 8. Things to watch (for the coordinator / Inspect)

- **No round-number collision any more.** Cycle 15 is cancelled in full (Q7) and none of
  it ran, so `opening/soundv3` is this brief's; the §3 sha256 / `soundv3/` stop triggers
  remain only as a guard against the unexpected. The cycle-15 folder is read-only history;
  nothing in it is to be struck, re-anchored or executed. `synth.py` stays the 2026-09-19
  file — this brief never imports it.
- **Round numbers inside cycle 16:** the ride brief uses `ride/soundv2`, `start-ride/soundv9`,
  `gates-saving/soundv10`; this brief uses `brandmark/opening/soundv3`. Different scenes, no
  overlap, either order.
- **The mono-average peak in `piano/projects/tunetank/WAVEFORM-NOTES.md` (−0.58 dBFS)
  understates the stereo peak (−0.00 dBFS).** Not edited by this brief (someone else's
  file); the coordinator may want a one-line note added there.
- The pipeline now depends on the untracked `piano/projects/tunetank/sources/` folder.
- Licensing: per Nathan (Q4, 2026-09-23) both Tunetank tracks are "free and can be used
  without copyright issues" — his statement, recorded as such in the round's `FEEDBACK.md`;
  no agent verified a licence and the earlier "do not publish until confirmed" gate is dropped
  on his word.
- The 97 ms lead of the last re-strike on the tagline is the only sync figure past a
  detectability threshold; it is the file's own spacing and what Nathan heard when he
  lined it up by hand. A nudge is one constant (`T0`), but it would move every other beat
  too — leave it unless he asks. If he wants to check it by eye, the alignment tool
  (`BRIEF-av-alignment-tool.md`) loads this scene like any other (`opening_v3.mp4` +
  `soundtrack_v3.wav`, `T0` as the offset marker).
