"""
Salamander twin of fluid_soundtrack.py (cycle 14): renders the same four layers
through the real samples and exports the calibrated per-layer gains that
ride_master.py uses; the FluidSynth files one level up remain as the record of
soundv5-v8 and as the level reference.

This is calibration, not a round (Nathan, Q1: no A/B -- the ride master uses
Salamander outright). Writes into a new `salamander/` sub-folder next to the existing
FluidSynth files: `salamander/bass_only.wav`, `salamander/melody_only.wav`,
`salamander/voice_a.wav`, `salamander/voice_e5.wav`. No `gate_chimes_12.3s.wav` --
retired in round 7, not regenerated here.

Gain: each layer is rendered first at gain=1.0, the printed peak is read, and the
gain is set so the Salamander layer's peak lands within +/-0.3 dB of its FluidSynth
counterpart's peak (measured 2026-09-20): bass_only.wav -12.3 dBFS, melody_only.wav
-8.4 dBFS, voice_a.wav -9.2 dBFS, voice_e5.wav -9.5 dBFS. This keeps the x1.5 / x1.0
scene mixes (cycle 14 README ruling 5) valid for either engine.

    cd marketing/audio-studio/piano/projects/interstellar
    python3 salamander_soundtrack.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))  # -> audio-studio/
import salamander_render as sr_
from soundtrack import BASS, MELODY, VOICE_A

DUR = 15.04

# Measured 2026-09-20 at gain=1.0 (peak, dBFS): bass 0.5310 (-5.50), melody 0.6167
# (-4.20), voice_a 0.5855 (-4.65), voice_e5 0.5853 (-4.65). Target FluidSynth peaks:
# bass -12.3, melody -8.4, voice_a -9.2, voice_e5 -9.5 dBFS. gain = 10**((target -
# measured_dBFS_at_gain1) / 20); resulting Salamander peaks land exactly on target.
GAIN_BASS = 0.457      # -5.50 dBFS @ gain=1 -> -12.30 dBFS
GAIN_MELODY = 0.6165   # -4.20 dBFS @ gain=1 -> -8.40 dBFS
GAIN_VOICE_A = 0.5922  # -4.65 dBFS @ gain=1 -> -9.20 dBFS
GAIN_VOICE_E5 = 0.5723 # -4.65 dBFS @ gain=1 -> -9.50 dBFS


def _midi(freq_name, NOTES):
    import math
    return round(69 + 12 * math.log2(NOTES[freq_name] / 440.0))


def _events(notes, NOTES):
    return [(_midi(n, NOTES), s, d) for n, s, d in notes]


if __name__ == "__main__":
    from synth import NOTES

    out_dir = os.path.join(os.path.dirname(__file__), "salamander")
    os.makedirs(out_dir, exist_ok=True)

    audio, sr = sr_.render(_events(BASS, NOTES), DUR, velocity=95, gain=GAIN_BASS)
    sr_.write_wav(os.path.join(out_dir, "bass_only.wav"), audio[: int(DUR * sr)], sr)

    audio, sr = sr_.render(_events(MELODY, NOTES), DUR, velocity=105, gain=GAIN_MELODY)
    sr_.write_wav(os.path.join(out_dir, "melody_only.wav"), audio[: int(DUR * sr)], sr)

    audio, sr = sr_.render(_events(VOICE_A, NOTES), DUR, velocity=105, gain=GAIN_VOICE_A)
    sr_.write_wav(os.path.join(out_dir, "voice_a.wav"), audio[: int(DUR * sr)], sr)

    voice_e5 = [t for t in MELODY if t[0] == "E5"]
    audio, sr = sr_.render(_events(voice_e5, NOTES), DUR, velocity=105, gain=GAIN_VOICE_E5)
    sr_.write_wav(os.path.join(out_dir, "voice_e5.wav"), audio[: int(DUR * sr)], sr)

    print("wrote 4 layers via Salamander into", out_dir)
