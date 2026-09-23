# BRIEF — ride (start-ride + gates-saving): the Tunetank track as the bed, E5 pulses kept on the second ride's gates

**Status: ready to execute (2026-09-23, Plan tier, Fable; revised the same day after
Nathan's answers in `questionsfornathan.md` — `T1` moved from 3.20 to **3.80**, every
derived number re-measured; cycle 15 cancelled, so nothing here waits on it).** Sonnet-executable: one new
module (`audio-studio/ride/ride_tunetank.py`, verbatim in §3.1), one check script
(`audio-studio/ride/check_tunetank.py`, verbatim in §3.2), three WAVs, three muxes plus
the standalone `ride_v2.mp4`, round docs, `all-renders/` swap. **Runs on Nathan's PC
through `device_bash`** (the project is mounted at `$HOME/mnt/Qualifire`; `GIT_OPTIONAL_LOCKS=0`
for any git command), not in the cloud sandbox: the mp3, ffmpeg, the Salamander samples
and the silent renders are there, and the WAV/mp4 outputs must land there. That shell has
python3 + numpy 2.2.6 + ffmpeg/ffprobe and **no scipy** — nothing below needs it. Every
command below was dry-run on that PC at Plan time from a scratch mirror (`$HOME/tt/mirror/`,
symlinks to the repo's `piano/`, `salamander_render.py`, `window_mix.py`, a copy of
`ride_master.py`); nothing in the repo was executed or written. Stop-on-ambiguity applies.
Anchors quoted from disk on 2026-09-23: `ride_master.py` 172 lines, mtime 2026-09-20 19:59
UTC; `window_mix.py` 92 lines, 2026-09-20 19:48; `salamander_render.py` 2026-09-20 19:45;
`ride/README.md` 2026-09-20 20:36; `start-ride/README.md` and `gates-saving/README.md`
2026-09-20 20:45; the mp3 481 489 bytes, 2026-09-23 11:38 UTC; `silent-studio/gates-saving/index.html`
2026-09-20 19:52 (lines 233, 314–316 quoted in §1.2); `silent-studio/start-ride/index.html`
2026-09-16 14:55 (lines 240, 263, 273). Self-contained: cycle 15
(`../15_ride-surge-fix-and-audio-tooling/`) was cancelled by Nathan on 2026-09-23 and never
executed, so no file this brief touches or imports has changed since Plan time (§8.1).

## 0. What this is, in one paragraph

Nathan wants the stock track he found (`audio-studio/piano/projects/tunetank-ride/sources/
tunetank-emotional-classical-484234.mp3`, 15.047 s, stereo) under the 26.3 s ride clip
instead of `ride_master.py`'s synthesised piano bed: "It should start only after the click,
when the actual ride starts … the sound fades out exactly when the rides zoom out for gates
saving … then the sound should start playing again for the second ride, for which we can
add on top only the 'second track, of the interstellar notes we already have just to
punctuate the gates'." This brief places the file **twice** on the combined clock — t = 0 at
**`T1 = 3.80` s**, while the START box is fading out (Nathan's Q1 answer: "press play while
the yellow START box is fading out", not on the click), so its own decrescendo still begins
inside gates-saving's zoom-out, and again
with its first transient exactly on the ride-2 start pulse (17.80 s), faded manually to the
video's end — and layers `ride_master.py`'s existing five E5 pulses on top of the second
placement only, imported from that module so they cannot drift. The "overgang" between the
two (≈ 15.4–17.8 s) is left to the file's own tail and head by default (Q2, confirmed). Output
is a stereo master plus the two per-scene slices in the round-1 convention, three muxes and
`ride_v2.mp4`. `ride_master.py` is not modified and still reproduces round 1
(`ride/soundv1/`), which stays on disk for reference (Q5, closed: Tunetank is round 2 of the
ride family; no synthesised sound moves forward). `T1` is
the one constant Nathan may nudge afterwards with the alignment tool
(`BRIEF-av-alignment-tool.md`); a nudge is a one-constant re-run of §4.

## 1. Facts this brief rests on (measured on Nathan's PC at Plan time)

### 1.1 The track

| | value |
|---|---|
| decode | `ffmpeg -ac 2 -ar 44100 -f f32le` → 663 552 frames = **15.0465 s**, 44.1 kHz, **2 channels** (L/R correlation 0.52 — real stereo) |
| peak | L 1.0435 / R 1.0351 = **+0.37 dBFS** (583 stereo samples over 1.0 — lossy-decode overshoot, harmless once gained down). The "+3.07 dBFS / 1.4239" in `WAVEFORM-NOTES.md` is ffmpeg's `-ac 1` downmix, which sums L+R at −3 dB each: 2.0138/√2 = 1.4239 exactly. A true (L+R)/2 peaks at 1.0069. §5.5 corrects the note. |
| head | first sample above −60 dBFS at 0.050 s, above −40 at 0.441, above −20 at 0.876; max |x| in the first 50 ms = 0.0011 — no click at t = 0 |
| **attack** | first full-scale transient at **1.262 s** (1 ms RMS −3.8 dBFS, peak 1.021; the rise runs 1.255–1.262). `ATTACK = 1.26`. |
| body | 1.26–11.1 s, 100 ms RMS between −5 and −10 dBFS, no internal arc; stereo peak at 9.552 s |
| decrescendo | 100 ms RMS: −7.3 dBFS at 11.0, −13.0 at 11.5, −18.9 at 12.0, −24.1 at 12.5, −26.2 at 13.0, −30.8 at 13.4, −33.9 at 14.0, −39.3 at 14.5, −44.9 at 15.0 — one clean fade from ~11.1 s to the end |

### 1.2 The video (unchanged by this brief — neither `index.html` is touched)

Combined clock: start-ride owns 0–14.0 s, gates-saving 14.0–26.3 s (`SCENE_SPLIT = 14.0`,
`GS_LEN = 12.3` in `ride_master.py` lines 52–53).

- start-ride (`index.html` line 273 `tl.shiftChildren(1.0, true);` — every beat below is
  post-shift): START pressed 3.20 s (line 236 comment "Beat 1 (1.0-4.0): START button in,
  pressed, out."; press at pre-shift 2.2, line 244); **START box fades out 3.55–4.00 s**
  (line 240 `tl.to('#start-btn', { opacity: 0, duration: 0.45, ease: 'power1.in' }, 2.55);`
  — pre-shift 2.55, `power1.in` so opacity ≈ 0.7 at 3.80 and 0.5 at 3.87; the dim overlay
  fades on the same tween, line 241; `set opacity 0` at 4.00, line 242); camera push-in
  **3.8–5.1** (line 255, pre-shift 2.8); caption in 4.6–5.1; rider moves **5.3–13.8** (line
  263 `ride(tl, 4.3, 8.5);`); scene ends 14.0. Renders are 30 fps: 3.80 s = frame 114
  exactly, 3.55 = frame 106.5, 4.00 = frame 120.
- gates-saving (own clock + 14.0): line 274 "Frame 0: continuing from start-ride's finishing
  2x frame -- zoomed in on the route's finish" — the 1.0 s zoom-out lead-in = **14.0–15.0 s**;
  rings 15.05–15.25; caption A + gate ticks 15.6–18.9; line 233
  `var PULSE_T = [0, 2.01, 3.85, 5.71, 7.58]; // ... = video 3.80 / 5.81 / 7.65 / 9.51 / 11.38`;
  line 314 `var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;` → ride 2 runs **17.80–25.38 s**
  absolute; caption B out by 26.3; video ends **26.3**.

### 1.3 `ride_master.py` — what is reused (read-only)

Lines 50–62 constants (`P`, `SR_OFFSET = 5.3`, `SCENE_SPLIT`, `GS_LEN`, `RIDE_T0 = 3.80`,
`RIDE_DUR = 7.58`, `E5_CONTENT = [12.50, 14.51, 16.35, 18.21, 20.08]`, `GAIN = 1.5`,
`TEMPO = 1.0`), line 64 `MASTER_DUR = SCENE_SPLIT + GS_LEN`, lines 67–86 `_midi` /
`_e5_events`, line 46 `from salamander_soundtrack import ... GAIN_VOICE_E5` (0.5723), and
lines 118–126 — the E5 construction this brief copies *by import*:

```python
    e5_pairs = _e5_events()
    e5_midi = _midi("E5", NOTES)
    e5_notes = [(e5_midi, c / TEMPO + SR_OFFSET, d / TEMPO) for c, d in e5_pairs]
    ...
    e5_audio, sr = sr_.render(e5_notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_E5)
```

The five pulses are at tau 17.80 / 19.81 / 21.65 / 23.51 / 25.38 (durations 1.28 / 0.53 /
1.22 / 1.25 / 1.23 s) — start line, three gates, finish — **all inside the second ride**;
there is no E5 under start-ride in soundv1 either, so "add on top only … to punctuate the
gates" is exactly this layer, unchanged. Importing `ride_master` runs its module-level
imports (`soundtrack`, `salamander_soundtrack`, `synth`) but not its `__main__` block —
verified in the dry run. `window_mix.place / fade_out` (lines 15–53) work on any 1-D float
array, so they are applied per channel. `salamander_render.write_wav` (line 144) is
mono-only and is **not** modified; the new module has its own stereo writer.

## 2. Design decisions (each one a ruling; the open ones are also in `questionsfornathan.md`)

### 2.1 Ride 1: file t = 0 while the START box fades out, `T1 = 3.80` — no fade

Nathan's rule (Q1, 2026-09-23): play is pressed **while the yellow START box is fading
out** — the click (3.20, the Plan-pass default) is "too soon". That box fades 3.55–4.00 s
(§1.2), so `T1 ∈ [3.55, 4.00]`. His earlier "fades out exactly when the rides zoom out"
means the decrescendo *starts* (file 11.1 s) inside 14.0–15.0, i.e. `T1 ≤ 3.90`. The
intersection is 3.55–3.90; **3.80** is chosen: it is frame 114 at 30 fps, the camera push-in
tween starts there (the only named beat inside the window), the box is at opacity ≈ 0.7 —
unmistakably "fading out" — and both of Nathan's sentences hold. With `T1 = 3.80` (all
measured on the build): quiet head 3.80–5.06, **attack 5.06** (7 frames before the rider
moves at 5.30; first 20 ms window over −15 dBFS at 5.08), body to **14.90**, −19 dBFS at
15.80, first 20 ms window under −25 dBFS at 15.44, −31 at 17.2, file ends 18.85 — the tail
rings at ≈ −39 dBFS when ride 2 attacks, inaudible under it. Nothing is trimmed or faded:
the tail is the file's own.

The window, one constant each (measured, `ride_tunetank.py` with only `T1` changed):

| `T1` (frame) | where in the fade-out | attack | decrescendo begins | < −25 dBFS | file ends | master peak |
|---|---|---|---|---|---|---|
| 3.5667 (107) | first full frame | 4.83 | 14.67 — inside the zoom-out | 15.26 | 18.61 | 0.8540 (−1.37) |
| **3.80 (114) — default** | opacity ≈ 0.7; push-in starts | **5.06** | **14.90 — inside the zoom-out** | 15.44 | 18.85 | **0.8520 (−1.39)** |
| 4.00 (120) | last frame, box gone | 5.26 | 15.10 — 0.1 s after it ends | 15.64 | 19.05 | 0.8595 (−1.32) |
| 4.04 (H4, just outside) | box gone; attack on the rider's start | 5.30 | 15.14 | 15.68 | 19.09 | 0.8519 (−1.39) |

Trade-off to be honest about: the later `T1` is, the more of the audible fade happens under
the landmark rings (15.05–15.25) and caption A (15.6+) instead of under the zoom-out itself.
If Nathan finds the fade late on `ride_v2.mp4`, 3.5667 is the earliest value that still obeys
his rule; the alignment tool (`BRIEF-av-alignment-tool.md`) is how he picks. The second
placement (§2.3) is anchored to the ride-2 start pulse, not to `T1`, and does not move.

### 2.2 The overgang: nothing added (default), the file's head is ride 2's pre-roll

After 15.44 s (first 20 ms window under −25 dBFS) only the tail rings; from 16.54 the
second placement's own quiet head rises under it (master −35.6 dBFS at 16.5–17.0, −38.6 at
17.0–17.5, −28.7 at 17.5–17.8) into the attack at 17.80. The gap is the rings popping and caption A / the gate ticks drawing —
visual beats without sound, then the payoff comes in from a breath. Named alternatives
(Q2): a key-matched sustained pad under 15.0–17.8; one soft E5 ping per gate tick drawing
in; or starting the second placement earlier so there is no dip. Each is one added layer in
`ride_tunetank.py`, none changes T1/T2.

### 2.3 Ride 2: attack on the start pulse, `T2 = 17.80 − 1.26 = 16.54` (independent of `T1`)

The first full-scale transient is sample-placed on `RIDE_T0` (absolute 17.80), coinciding
with the first E5 pulse. `T2` is derived from `RIDE_T0_ABS − ATTACK`, not from `T1`: nudging
`T1` never moves the second pass. Placing the whole file (not a cut at 1.26) costs nothing, keeps the
sample verbatim and avoids a synthetic fade-in. At the video's end the file is at its own
9.76 s — still in the body — so the second placement gets a **linear 1.0 s fade ending at
26.3** (it begins 0.08 s before the finish pulse at 25.38; the natural decrescendo would fall
at 27.6–31.5 s, past the video).

### 2.4 The E5 layer: `ride_master.py`'s five pulses, imported, `GAIN = 1.5`, 0.5 s fade to 26.3

**These pulses are not synthesised sound.** They are Salamander Grand Piano *samples* (real
recordings, `audio-studio/piano/samples/salamander/`) rendered by `salamander_render.py`;
`ride_master.py` imports only the `NOTES` pitch-name table from `synth.py`, no generator.
Nathan's "no synthesised sounds" (2026-09-23) is about `synth.py`'s generated tones; the E5
pulses he confirmed in Q3 stay. Same `_e5_events()`, same `salamander_render.render(velocity=105, gain=GAIN_VOICE_E5)`,
same × `GAIN`; the layer is faded 0.5 s to 26.3 exactly as soundv1's master was, then added
to both channels. Measured lift at each pulse over the bed (60 ms after pulse + 30 ms
Salamander lead vs 60 ms before): +14.3 / +8.0 / +7.4 / +6.1 / +5.1 dB. Louder E5 was Q3 —
Nathan: build the default, nudge later.

### 2.5 Gain: `GAIN_BED = 0.45`, stereo out, ceiling met without the guard

Sweep on the real layers with `T1 = 3.80` (bed gain / E5 multiplier → master peak):
0.60/1.5 → −0.01 dBFS, 0.50/1.5 → −0.90, **0.45/1.5 → −1.39** (0.8520 at 17.871 s, the
start pulse on the attack), 0.40/1.5 → −1.91; E5 at 1.7 clears the ceiling only with the bed
≤ 0.40 (−1.33), E5 at 2.0 not even at 0.35 (−0.98). 0.45 is the loudest bed that clears the
−1 dBFS ceiling with no guard scaling (the guard stays in the code as a safety net, as in
`ride_master.py` lines 145–151). Bed layer peak 0.4803 (−6.37 dBFS; the first pass's tail
now adds under the second's attack); body RMS in the master ≈ −17 to −19 dBFS. The master is stereo (the file is
real stereo; a mono fold loses width); the two slices and the muxes are stereo too.

### 2.6 A new sibling module, `ride_master.py` untouched

`ride_master.py` keeps building round 1 (`ride/soundv1/`) byte-for-byte; that round stays
on disk **for reference** (Q5, closed — Nathan: "keep the previous round there for reference
and just make the tunetank version a round2 of the ride family"; nothing here is called
"superseded", and round 1 is not offered as an alternative since no synthesised sound moves
forward). `ride_tunetank.py` imports its constants and helpers so the E5
timing has one source of truth. Round numbers: family `ride/soundv2`, slices
`start-ride/soundv9` and `gates-saving/soundv10` (the next free round in each folder —
`start-ride/soundv8` and `gates-saving/soundv9` exist and are round 1's slices). Cycle 15
is cancelled, so no other brief competes for these numbers; the only remaining collision
is with this folder's opening brief, which uses `brandmark/opening/soundv3` — a different
scene, no overlap.

## 3. The files

### 3.1 New file `marketing/audio-studio/ride/ride_tunetank.py` — verbatim (153 lines, md5 `ed9816873915195035c337b848c45a36`)

```python
"""
Builds the "ride" master, round 2: the Tunetank track (Nathan's pick, cycle 16) as the
bed under both rides, with ride_master.py's five E5 pulses layered on top of the second
ride only. See marketing/cycles/16_ride-tunetank-soundtrack/
BRIEF-tunetank-ride-soundtrack.md for the derivation of every number below.

Combined clock tau (seconds): start-ride owns 0-14.0, gates-saving 14.0-26.3.

Two placements of the SAME file (stereo, decoded once with ffmpeg):
  ride 1 -- file t=0 at T1 = 3.80 (frame 114 at 30 fps: the START box is fading out
            (3.55-4.00) and the camera push-in begins). Nathan's rule (Q1, 2026-09-23):
            play is pressed while the START box fades out, not on the click. The file's
            ~1.26 s quiet intro rises under the push-in, the attack lands at 5.06 (7
            frames before the rider moves at 5.3), the body runs under the ride
            (5.3-13.8), and its own decrescendo (file 11.1-15.0 s) lands on 14.9-18.85:
            the fade starts inside gates-saving's 1.0 s zoom-out lead-in (14.0-15.0).
            No fade is applied: the tail is the file's own. T1 is the one constant to
            nudge (any value in 3.55-4.00 keeps the "during the fade-out" rule).
  ride 2 -- file t=0 at T2 = RIDE_T0_ABS - ATTACK = 17.80 - 1.26 = 16.54, so the
            file's first full-scale transient lands ON the ride-2 start pulse (17.80).
            The file's quiet intro doubles as the pre-roll into it (the "overgang"
            default: nothing added, the two quiet ends of the same file overlap at
            about -36 to -39 dBFS around 16.5-17.5 s). The file would still be in its plateau
            at the video's end, so this instance gets a manual 1.0 s fade to 26.3.

E5 layer: exactly ride_master.py's five pulses (17.80 / 19.81 / 21.65 / 23.51 / 25.38),
same samples, same durations, same GAIN_VOICE_E5 * GAIN chain -- imported, not copied,
so the pulses cannot drift from soundv1's. Faded 0.5 s to 26.3 like soundv1's master.

Writes (stereo, 16-bit, 44.1 kHz):
    soundv2/ride_master_v2.wav                       (this family folder)
    ../start-ride/soundv9/soundtrack_v9.wav           (slice [0, 14.0s))
    ../gates-saving/soundv10/soundtrack_v10.wav       (slice [14.0s, 26.3s))

Prints the placement sample indices, each layer's peak, the master peak and any global
scale factor (the -1 dBFS guard, which the chosen gains do not trip).

Needs ffmpeg on PATH (the bed is an mp3) -- run on Nathan's PC, not the cloud sandbox:
    cd marketing/audio-studio/ride
    python3 ride_tunetank.py
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))  # -> audio-studio/
sys.path.insert(0, os.path.join(HERE, "..", "piano", "projects", "interstellar"))
sys.path.insert(0, HERE)

import salamander_render as sr_
import window_mix as wm
from ride_master import (GAIN, GAIN_VOICE_E5, MASTER_DUR, RIDE_T0, SCENE_SPLIT, SR_OFFSET,
                         TEMPO, _e5_events, _midi)
from synth import NOTES

SR = 44100
BED_MP3 = os.path.join(HERE, "..", "piano", "projects", "tunetank-ride", "sources",
                       "tunetank-emotional-classical-484234.mp3")

# ---- constants (BRIEF-tunetank-ride-soundtrack.md section 2) ----
T1 = 3.80                       # ride 1: file t=0 while the START box fades out (3.55-4.00); frame 114
ATTACK = 1.26                   # file time of the first full-scale transient
RIDE_T0_ABS = SCENE_SPLIT + RIDE_T0   # 17.80
T2 = RIDE_T0_ABS - ATTACK       # 16.54: ride 2, attack on the start pulse
GAIN_BED = 0.45                 # bed peak 1.0435 -> 0.470 (-6.6 dBFS)
GAIN_E5 = GAIN                  # 1.5, ride_master's chain, unchanged
BED_FADE = (26.3, 1.0)          # ride-2 bed: linear fade ending at the video's end
E5_FADE = (26.3, 0.5)           # E5 layer: soundv1's master fade, kept


def dbfs(x):
    return 20 * math.log10(x + 1e-12)


def decode_stereo(path, sr=SR):
    """ffmpeg -> float32 stereo (n, 2) at sr. No downmix: ffmpeg's -ac 1 sums L+R at
    -3 dB each, which is what made the coordinator's mono analysis read +3.07 dBFS."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def write_wav_stereo(path, x, sr=SR):
    """x: (n, 2) float in [-1, 1] -> 16-bit interleaved stereo WAV (salamander_render's
    write_wav is mono-only and is left alone)."""
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.ascontiguousarray(pcm).tobytes())


if __name__ == "__main__":
    n_master = int(round(MASTER_DUR * SR))

    bed = decode_stereo(BED_MP3)
    print("bed decoded: %d frames (%.4f s), peak %.4f (%.2f dBFS)" % (
        len(bed), len(bed) / SR, np.abs(bed).max(), dbfs(np.abs(bed).max())))
    print("placements: T1 %.3f -> sample %d ; T2 %.3f -> sample %d (attack lands at %.3f)" % (
        T1, int(round(T1 * SR)), T2, int(round(T2 * SR)), T2 + ATTACK))

    bed_layer = np.zeros((n_master, 2), dtype=np.float64)
    for ch in range(2):
        wm.place(bed_layer[:, ch], bed[:, ch], T1, gain=GAIN_BED, sr=SR)
        wm.place(bed_layer[:, ch], bed[:, ch], T2, gain=GAIN_BED, sr=SR)
        wm.fade_out(bed_layer[:, ch], BED_FADE[0], BED_FADE[1], sr=SR)
    print("layer bed peak %.4f (%.2f dBFS)" % (np.abs(bed_layer).max(), dbfs(np.abs(bed_layer).max())))

    e5_pairs = _e5_events()
    e5_midi = _midi("E5", NOTES)
    e5_notes = [(e5_midi, c / TEMPO + SR_OFFSET, d / TEMPO) for c, d in e5_pairs]
    e5_tau = sorted(round(t, 2) for _, t, _ in e5_notes)
    print("e5 scheduled tau (%d notes):" % len(e5_tau), e5_tau)
    e5_audio, _ = sr_.render(e5_notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_E5)
    e5_layer = e5_audio[:n_master].astype(np.float64) * GAIN_E5
    wm.fade_out(e5_layer, E5_FADE[0], E5_FADE[1], sr=SR)
    print("layer e5 peak %.4f (%.2f dBFS)" % (np.abs(e5_layer).max(), dbfs(np.abs(e5_layer).max())))

    master = bed_layer.copy()
    for ch in range(2):
        wm.place(master[:, ch], e5_layer, 0.0, gain=1.0, sr=SR)

    peak = float(np.abs(master).max())
    target = 10 ** (-1.0 / 20.0)
    scale = 1.0
    if peak > target:
        scale = target / peak
        master *= scale
        peak = float(np.abs(master).max())
    print("master peak %.4f (%.2f dBFS) at %.3f s%s" % (
        peak, dbfs(peak), np.unravel_index(np.abs(master).argmax(), master.shape)[0] / SR,
        (" -- scaled by %.5f" % scale) if scale != 1.0 else " -- no scaling needed"))

    soundv2_dir = os.path.join(HERE, "soundv2")
    os.makedirs(soundv2_dir, exist_ok=True)
    master_path = os.path.join(soundv2_dir, "ride_master_v2.wav")
    write_wav_stereo(master_path, master)
    print("wrote", master_path, len(master), "frames")

    n_sr = int(round(SCENE_SPLIT * SR))
    start_ride_dir = os.path.join(HERE, "..", "start-ride", "soundv9")
    gates_saving_dir = os.path.join(HERE, "..", "gates-saving", "soundv10")
    os.makedirs(start_ride_dir, exist_ok=True)
    os.makedirs(gates_saving_dir, exist_ok=True)
    write_wav_stereo(os.path.join(start_ride_dir, "soundtrack_v9.wav"), master[:n_sr])
    write_wav_stereo(os.path.join(gates_saving_dir, "soundtrack_v10.wav"), master[n_sr:])
    print("wrote slice start-ride/soundv9/soundtrack_v9.wav", n_sr, "frames")
    print("wrote slice gates-saving/soundv10/soundtrack_v10.wav", len(master) - n_sr, "frames")
```

### 3.2 New file `marketing/audio-studio/ride/check_tunetank.py` — verbatim (34 lines, md5 `4e5f63c4bf5daff2317d7ed869fd3f08`)

```python
"""Cycle 16 verification (BRIEF-tunetank-ride-soundtrack.md section 6). Run from
audio-studio/ride after ride_tunetank.py. Prints numbers; compare to the brief."""
import math, os, wave, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100
def rd(p):
    with wave.open(p, "rb") as w:
        assert w.getnchannels() == 2 and w.getframerate() == SR, (p, w.getnchannels(), w.getframerate())
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768.0
db = lambda x: 20 * math.log10(x + 1e-12)
m = rd(os.path.join(HERE, "soundv2", "ride_master_v2.wav"))
a = rd(os.path.join(HERE, "..", "start-ride", "soundv9", "soundtrack_v9.wav"))
b = rd(os.path.join(HERE, "..", "gates-saving", "soundv10", "soundtrack_v10.wav"))
print("frames master/start-ride/gates-saving:", len(m), len(a), len(b), "(expect 1159830 617400 542430)")
print("slice parity:", np.array_equal(m[:617400], a), np.array_equal(m[617400:], b), "(expect True True)")
pk = np.abs(m).max(); print("master peak %.4f (%.2f dBFS) at %.3f s (expect 0.8520 / -1.39 / 17.871; must be <= -1.00 dBFS)" % (pk, db(pk), np.unravel_index(np.abs(m).argmax(), m.shape)[0] / SR))
mono = m.mean(axis=1)
def rms(t0, t1): return db(np.sqrt(np.mean(mono[int(t0 * SR):int(t1 * SR)] ** 2)))
print("RMS windows (dBFS):")
for t0, t1 in [(0, 3.8), (3.8, 4.6), (5.0, 5.2), (5.3, 5.5), (13.5, 14.0), (14.0, 14.5), (14.5, 15.0), (15.0, 15.5), (15.5, 16.0), (16.5, 17.0), (17.0, 17.5), (17.5, 17.8), (17.8, 18.0), (25.3, 25.5), (26.0, 26.2), (26.25, 26.3)]:
    print("  %5.2f-%5.2f  %6.1f" % (t0, t1, rms(t0, t1)))
print("last frame |x|: %.6f (expect 0.000000)" % np.abs(m[-1]).max())
w = int(0.02 * SR); e = np.array([db(np.sqrt(np.mean(mono[i * w:(i + 1) * w] ** 2))) for i in range(len(mono) // w)])
def first_over(t_from, thr):
    i0 = int(t_from / 0.02)
    for i in range(i0, len(e)):
        if e[i] > thr: return round(i * 0.02, 2)
print("ride-1 attack: first 20ms window > -15 dBFS after 3.80 at", first_over(3.80, -15), "(expect 5.08)")
print("ride-2 attack: first 20ms window > -15 dBFS after 16.54 at", first_over(16.54, -15), "(expect 17.82)")
print("ride-1 tail: first 20ms window < -25 dBFS after 14.00 at", [round(i * 0.02, 2) for i in range(int(14 / 0.02), len(e)) if e[i] < -25][0], "(expect 15.44)")
sal = []
for t in [17.80, 19.81, 21.65, 23.51, 25.38]:
    i = int((t + 0.03) * SR); j = int((t + 0.09) * SR); k = int((t - 0.06) * SR)
    sal.append(round(db(np.sqrt(np.mean(mono[i:j] ** 2))) - db(np.sqrt(np.mean(mono[k:i - int(0.03 * SR)] ** 2))), 1))
print("E5 jump (60ms after pulse+30ms vs 60ms before), dB:", sal, "(expect [14.3, 8.0, 7.4, 6.1, 5.1]; every value > 3)")
```

Write both with a heredoc (`cat > file <<'EOF'`) or the Write tool, then confirm the md5
sums above before running anything. If either differs, stop: something was not copied
verbatim.

## 4. Build, mux, `all-renders/` (Nathan's PC, `device_bash`)

All paths below are under `$HOME/mnt/Qualifire/marketing`. Run in this order; each step's
expected output is in §6.

```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio/ride
python3 ride_tunetank.py            # writes soundv2/ride_master_v2.wav + the two slices
python3 check_tunetank.py           # §6.1 -- every line must match
```

Muxes — same recipe as cycle 14 (`BRIEF-ride-loop-track.md` lines 224–225, 237–242):

```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
SS=../silent-studio
ffmpeg -y -v error -i $SS/all-renders/start-ride_v4.mp4 -i start-ride/soundv9/soundtrack_v9.wav -c:v copy -c:a aac -b:a 192k -shortest start-ride/soundv9/start-ride_v4_with_sound_v9.mp4
ffmpeg -y -v error -i $SS/all-renders/gates-saving_v8.mp4 -i gates-saving/soundv10/soundtrack_v10.wav -c:v copy -c:a aac -b:a 192k -shortest gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4
printf "file '%s'\nfile '%s'\n" "$PWD/$SS/all-renders/start-ride_v4.mp4" "$PWD/$SS/all-renders/gates-saving_v8.mp4" > ride/soundv2/concat.txt
ffmpeg -y -v error -f concat -safe 0 -i ride/soundv2/concat.txt -c copy ride/soundv2/ride_v2_silent.mp4
ffmpeg -y -v error -i ride/soundv2/ride_v2_silent.mp4 -i ride/soundv2/ride_master_v2.wav -c:v copy -c:a aac -b:a 192k -shortest ride/soundv2/ride_v2.mp4
for f in start-ride/soundv9/start-ride_v4_with_sound_v9.mp4 gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4 ride/soundv2/ride_v2_silent.mp4 ride/soundv2/ride_v2.mp4; do echo "$f: $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f) | $(ffprobe -v error -select_streams a -show_entries stream=codec_name,channels -of csv=p=0 $f)"; done
```

Expect `14.000000 | aac,2`, `12.300000 | aac,2`, `26.300000 |` (silent), `26.300000 | aac,2`.
Concat the two *silent* renders and mux once, never the two per-scene muxes (AAC framing at
the join — cycle 14's ruling). **Silent source check first:** `ls $SS/all-renders/start-ride_v*.mp4 $SS/all-renders/gates-saving_v*.mp4`
must list exactly `start-ride_v4.mp4` and `gates-saving_v8.mp4` (30 fps, 420 and 369 frames).
Anything else — a `_v9` present, a `_v8` missing — is a stop trigger (cycle 15's surge
inversion, which would have produced `gates-saving_v9.mp4`, was cancelled and never ran, so
a v9 would mean something unplanned happened).

**`audio-studio/all-renders/` — what this brief does to it, exactly.** Per
`marketing/audio-studio/structure.md` that folder holds *Claude's latest round per scene*
for a quick look (every round replaces the previous file there — the standing convention,
not a judgement that the new round is better). So: copy `start-ride_v4_with_sound_v9.mp4`
and `gates-saving_v8_with_sound_v10.mp4` into `audio-studio/all-renders/`; move the two
round-1 copies there, `start-ride_v4_with_sound_v8.mp4` and `gates-saving_v8_with_sound_v9.mp4`,
to `$HOME/mnt/Qualifire/_to_delete/` as
`all-renders_start-ride_v4_with_sound_v8_replaced_in_all-renders_by_v9.mp4` and
`all-renders_gates-saving_v8_with_sound_v9_replaced_in_all-renders_by_v10.mp4` (`mv` —
never `device_request_delete_permission`). Nothing about round 1 is retired by this:
`ride/soundv1/`, `start-ride/soundv8/` and `gates-saving/soundv9/` keep their own copies of
the same muxes and WAVs, for reference (Q5, closed). The silent side of `all-renders/` is
unchanged (no new silent render in this cycle).

## 5. Round docs (markdown only)

### 5.1 `audio-studio/ride/soundv2/FEEDBACK.md` — new, in the shape of `soundv1/FEEDBACK.md`

Sections: render file line (`ride_master_v2.wav`, `ride_v2.mp4`, source `../ride_tunetank.py`);
"What this is" (Nathan's quote from the cycle README, the two placements with T1/T2/ATTACK —
say in one line that `T1 = 3.80` is "play pressed while the START box fades out (3.55–4.00)",
per Nathan's Q1 answer, and that it is the one constant he can nudge with the alignment
tool; the E5 layer imported from `ride_master.py`); one line
`**Licence:** per Nathan, 2026-09-23 — free, usable without copyright issues.`;
"Previous round" pointer to `../soundv1/FEEDBACK.md` (the synthesised round, kept on disk for
reference); "The schedule" (the verbatim
`ride_tunetank.py` stdout); "Verified" (the verbatim `check_tunetank.py` output plus the four
ffprobe lines); "Known, benign timing offset" (one line pointing at `soundv1/FEEDBACK.md`'s
section — the ~28 ms Salamander lead applies to the E5 layer here too, the bed has none);
"What to listen for" (the attack at 5.06 against the rider's start at 5.30; the fade
beginning at 14.90 against the zoom-out; the empty overgang 15.4–17.8; the attack on the
ride-2 start pulse; the five pulses over the bed; the 1.0 s end fade); "Questions" (pointer
to `cycles/16_ride-tunetank-soundtrack/questionsfornathan.md`);
an empty "## Nathan's feedback" heading.

### 5.2 `audio-studio/ride/README.md` (3 346 bytes)

- Part table: change `| **complete ride** (this folder) | soundv1 — built, awaiting Nathan's listen |`
  to `soundv2 — built (Tunetank bed, cycle 16), awaiting Nathan's listen; soundv1 (synthesised piano) kept on disk for reference`
  and its link to `soundv2/FEEDBACK.md`; the two scene rows to `soundv9 = slice 0–14.0s of the
  soundv2 master (soundv8 = the same slice of soundv1, kept)` / `soundv10 = slice 14.0–26.3s of
  the soundv2 master (soundv9 = the same slice of soundv1, kept)` with their FEEDBACK links.
- Rounds table: append `| [soundv2](soundv2/FEEDBACK.md) | ride_v2.mp4 (silent concat + Tunetank master) | Built — 26.300000s via ffprobe; Nathan's Tunetank track placed twice (t=0 at 3.80 s, while the START box fades out, and at 16.54 s), E5 pulses on ride 2 only; see cycle 16 |`
  and change soundv1's status cell to begin `Earlier round, kept on disk (direction changed to the Tunetank bed in soundv2, cycle 16). `.
  Do not write "superseded" anywhere (Nathan, Q5: Tunetank is one more round, not a final).
- After the closing paragraph add one paragraph: `ride_tunetank.py` builds soundv2 (which
  files, stereo, the bed mp3 path, "imports `ride_master.py`'s E5 schedule; `ride_master.py`
  still builds soundv1 unchanged"). Keep the loop-point and engine paragraphs — they describe
  soundv1 and remain true of it.

### 5.3 `audio-studio/start-ride/README.md` and `soundv9/FEEDBACK.md`

Rounds table: soundv8's cell becomes `Earlier round, kept on disk (cycle 16 changed direction). 2026-09-20 -- ...`
(rest kept); append
`| [soundv9](soundv9/FEEDBACK.md) | start-ride_v4_with_sound_v9.mp4 | **Latest** <date> -- built and muxed, confirmed 14.000000s via ffprobe, in \`all-renders/\`. Slice [0-14.0s] of \`../ride/soundv2/ride_master_v2.wav\` (stereo): Nathan's Tunetank track from 3.80 s (play pressed while the START box fades out), no synthesised layers, its own tail carries into gates-saving (cycle 16) |`.
`soundv9/FEEDBACK.md`: short, `soundv8/FEEDBACK.md`'s shape — what the slice is, the
attack at 5.06 s (5.08 on the 20 ms grid) seven frames before the rider moves, the
decrescendo beginning at 14.9 s (the file's own — it carries into gates-saving), the slice
parity check, the licence line as in §5.1, an empty "Nathan's feedback" heading.

### 5.4 `audio-studio/gates-saving/README.md` and `soundv10/FEEDBACK.md`

This README records rounds ≥ 3 as `**Update:**` paragraphs, not table rows — append one:
`**Update:** soundv10 (<date>) -- direction change, cycle 16: Nathan's Tunetank track replaces
the synthesised bed. \`soundv10/soundtrack_v10.wav\` is the [14.0-26.3s] slice of
\`../ride/soundv2/ride_master_v2.wav\` (stereo): the first pass of the track fades out over
this scene's zoom-out lead-in (0-1.0 s here), the second pass attacks on the start pulse at
3.80 s, and the five E5 pulses (3.80/5.81/7.65/9.51/11.38 s, unchanged from soundv9, imported
from \`ride_master.py\`) punctuate the gates on top; 1.0 s fade to the end. Mux
\`gates-saving_v8_with_sound_v10.mp4\` built, 12.300000s via ffprobe, in \`all-renders/\`.
See \`soundv10/FEEDBACK.md\`.` Also change the soundv9 paragraph's "is built and in
`all-renders/`" to "is built; `all-renders/` now holds soundv10 (cycle 16), soundv9 is kept
here as the synthesised round". `soundv10/FEEDBACK.md`: as 5.3, with the scene-clock
numbers (the first pass's decrescendo already running at the cut — −17 dBFS at 0–1.0 s,
under −25 dBFS from 1.44 s; attack 3.82 on the 20 ms grid; pulses; fade).

### 5.5 `audio-studio/piano/projects/tunetank-ride/WAVEFORM-NOTES.md` (419 bytes)

Replace `- Peak amplitude: 1.4239 (3.07 dBFS)` with
`- Peak amplitude: 1.4239 (3.07 dBFS) as ffmpeg's -ac 1 downmix ((L+R)/sqrt 2); the stereo file itself peaks at 1.0435 (+0.37 dBFS), (L+R)/2 at 1.0069 -- cycle 16`.
Append `- First full-scale transient (the audible start): 1.262 s; decrescendo from ~11.1 s to the end (-34 dBFS at 14.0 s)`.

### 5.6 Not touched

Both `AUDIO-BRIEF.md`s (their convention: they change when *Nathan* changes the direction
in their last column, or when a visual re-render moves a timing — neither happened; the
direction change is recorded in the scene READMEs as cycle 14 did for soundv8/9).
`ride/soundv1/FEEDBACK.md` (Nathan's feedback file — the coordinator adds any pointer line,
not the executor). `ride_master.py`, `window_mix.py`, `salamander_render.py`, `synth.py`,
both `index.html`, anything under `marketing/cycles/15_ride-surge-fix-and-audio-tooling/`
(cancelled, read-only history).

## 6. Verification (executor — numbers, not adjectives)

### 6.1 `python3 check_tunetank.py` must print exactly this (dry-run output, Nathan's PC, 2026-09-23)

```
frames master/start-ride/gates-saving: 1159830 617400 542430 (expect 1159830 617400 542430)
slice parity: True True (expect True True)
master peak 0.8520 (-1.39 dBFS) at 17.871 s (expect 0.8520 / -1.39 / 17.871; must be <= -1.00 dBFS)
RMS windows (dBFS):
   0.00- 3.80  -240.0
   3.80- 4.60   -51.7
   5.00- 5.20   -16.2
   5.30- 5.50   -17.5
  13.50-14.00   -17.4
  14.00-14.50   -17.3
  14.50-15.00   -17.1
  15.00-15.50   -22.1
  15.50-16.00   -27.3
  16.50-17.00   -35.6
  17.00-17.50   -38.6
  17.50-17.80   -28.7
  17.80-18.00   -10.9
  25.30-25.50   -12.7
  26.00-26.20   -29.8
  26.25-26.30   -46.1
last frame |x|: 0.000000 (expect 0.000000)
ride-1 attack: first 20ms window > -15 dBFS after 3.80 at 5.08 (expect 5.08)
ride-2 attack: first 20ms window > -15 dBFS after 16.54 at 17.82 (expect 17.82)
ride-1 tail: first 20ms window < -25 dBFS after 14.00 at 15.44 (expect 15.44)
E5 jump (60ms after pulse+30ms vs 60ms before), dB: [14.3, 8.0, 7.4, 6.1, 5.1] (expect [14.3, 8.0, 7.4, 6.1, 5.1]; every value > 3)
```

The build is deterministic (same file, same samples, same code), so these reproduce to the
digit; a ±0.1 dB difference in an RMS window means a different ffmpeg build decoded the mp3
and is acceptable **only** if every other line matches — report it. Anything else: stop.

### 6.2 `python3 ride_tunetank.py` stdout must contain

```
bed decoded: 663552 frames (15.0465 s), peak 1.0435 (0.37 dBFS)
placements: T1 3.800 -> sample 167580 ; T2 16.540 -> sample 729414 (attack lands at 17.800)
layer bed peak 0.4803 (-6.37 dBFS)
e5 scheduled tau (5 notes): [17.8, 19.81, 21.65, 23.51, 25.38]
layer e5 peak 0.5025 (-5.98 dBFS)
master peak 0.8520 (-1.39 dBFS) at 17.871 s -- no scaling needed
```

(plus `salamander_render`'s own `peak ...` line and the three `wrote` lines; with `T1 = 3.80`
the float and the 16-bit peaks both print 0.8520).
`e5 scheduled tau` must equal soundv1's line in `ride/soundv1/FEEDBACK.md` verbatim.

### 6.3 Files and muxes

`ls -la` the three WAVs (4 639 364 / 2 469 644 / 2 169 764 bytes = 44-byte header + frames × 4)
and the four mp4s; the ffprobe loop in §4 prints the four expected lines; `ride_master.py`
is byte-identical to before (`md5sum` before and after — record both).

## 7. Report format

Tier readout line (model, tokens, tool calls), the md5 of both new files, the §6.1 block
verbatim, the §6.2 lines, the ffprobe lines, the list of every file written or moved (with
the `_to_delete/` names), and any line where the output differed from this brief — with the
difference, not a paraphrase.

## 8. Things to watch (for the coordinator / Inspect)

1. **Silent sources are fixed.** Cycle 15 (which would have re-rendered gates-saving as
   `_v9`) is cancelled and nothing of it ever ran (checked 2026-09-23: `synth.py` unchanged
   since 2026-09-19, no `brandmark/logo_reveal.py`, no `gates-saving_v9.mp4`). §4 expects
   exactly `start-ride_v4.mp4` and `gates-saving_v8.mp4`; anything else is a stop.
2. **The +3.07 dBFS figure** must not reappear anywhere as the track's peak; §5.5 corrects
   the one place it is written.
3. **`import ride_master`** pulls in `soundtrack.py` / `salamander_soundtrack.py` from
   `piano/projects/interstellar/` and `audio-studio/synth.py`, whose scipy import is already
   guarded (`synth.py` lines 14–17: `lfilter = None` when scipy is absent; only `reverb()`
   raises, and nothing here calls it), so the chain works without scipy — verified in the
   dry run (again on 2026-09-23 with `T1 = 3.80`). `synth.py` is the 2026-09-19 file; cycle
   15's planned numpy-fallback edits to it were cancelled and are not needed here.
4. **Stereo everywhere downstream:** the muxes are `aac, 2 ch` where soundv1's were mono;
   `ride_v1.mp4` stays as it is.
5. **Q1–Q4 are answered and applied** (`T1 = 3.80`; overgang empty; 1.5/0.45; licence per
   Nathan; Q5 closed — round 1 stays for reference, Tunetank is round 2). A later `T1` nudge
   from the alignment tool is a one-constant edit at line 66 of `ride_tunetank.py` (and the
   matching `expect` strings in `check_tunetank.py`) followed by §4 again — the two round
   folders are overwritten in place, no new round number, unless the coordinator says so.
6. **Line 66 of `ride_tunetank.py` is the only place `T1` lives**; `T2` is derived from
   `RIDE_T0_ABS − ATTACK` and must not be re-expressed in terms of `T1`.
