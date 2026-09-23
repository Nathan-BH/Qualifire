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
