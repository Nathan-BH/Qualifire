"""
Builds the "ride" master: one continuous 26.3s soundtrack across start-ride (0-14.0s)
and gates-saving (14.0-26.3s) on the video's combined clock, rendered through the real
Salamander samples. See marketing/cycles/14_ride-loop-surge-and-salamander/
BRIEF-ride-loop-track.md for the full derivation.

Content clock c (the note lists' own seconds) maps to the master's clock tau by
tau = c + SR_OFFSET (start-ride's approved soundv7 placement, kept). The piece loops
with period P = 15.43s (ruling 2: the piece's own "last E5 -> next downbeat" gap,
not the file's raw 15.04s length, which would shorten the last bar and click at the
seam). Two iterations of the note list (k=0, k=1, i.e. c and c+P) are scheduled onto
the one 26.3s buffer and rendered in a single pass per layer, so every note's natural
decay carries across the loop seam instead of being cut at a file boundary.

Three layers:
  bass    -- BASS,    at c and c+P, tau < SCENE_SPLIT+GS_LEN only (6 notes sound)
  voice_a -- VOICE_A,  likewise (11 notes sound)
  e5      -- exactly the FIVE E5 pulses that carry the ride (start line, three gates,
             finish line): E5_CONTENT, at their own MELODY durations (iteration-1
             pulses reuse iteration-0's durations for the same pitch/position in the
             bar). Every other E5 in the loop (the "basic soundtrack" span before the
             second ride starts, and anything past the master) is not rendered.

Writes:
    soundv1/ride_master_v1.wav                       (this family folder)
    ../start-ride/soundv8/soundtrack_v8.wav           (slice [0, 14.0s))
    ../gates-saving/soundv9/soundtrack_v9.wav         (slice [14.0s, 26.3s))

Prints the tau of every note scheduled per layer, each layer's peak, the master peak
and any global scale factor applied to keep it at or under -1 dBFS.

    cd marketing/audio-studio/ride
    python3 ride_master.py
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # -> audio-studio/
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "piano", "projects", "interstellar"))

import salamander_render as sr_
import window_mix as wm
from soundtrack import BASS, VOICE_A, MELODY
from salamander_soundtrack import GAIN_BASS, GAIN_VOICE_A, GAIN_VOICE_E5
from synth import NOTES

# ---- constants (BRIEF-ride-loop-track.md §4a) ----
P = 15.43
SR_OFFSET = 5.3
SCENE_SPLIT = 14.0
GS_LEN = 12.3
RIDE_T0 = 3.80
RIDE_DUR = 7.58
E5_CONTENT = [12.50, 14.51, 16.35, 18.21, 20.08]
GAIN = 1.5
TEMPO = 1.0
FADE_IN = (5.3, 0.15)
FADE_OUT_END = 26.3
FADE_OUT_LEN = 0.5
ENGINE = "salamander"

MASTER_DUR = SCENE_SPLIT + GS_LEN  # 26.3


def _midi(freq_name, NOTES):
    import math
    return round(69 + 12 * math.log2(NOTES[freq_name] / 440.0))


def _events(notes, NOTES):
    return [(_midi(n, NOTES), s, d) for n, s, d in notes]


def _e5_events():
    """The five ride pulses (E5_CONTENT), each matched to its own duration from
    MELODY's own list -- iteration-1 pulses (c >= P) reuse the iteration-0 duration
    at the same position in the bar (c - P)."""
    melody_dur = {round(s, 2): d for _, s, d in MELODY if _ == "E5"}
    out = []
    for c in E5_CONTENT:
        key = round(c, 2) if round(c, 2) in melody_dur else round(c - P, 2)
        d = melody_dur[key]
        out.append((c, d))
    return out


def _schedule(notes, tempo=TEMPO):
    """notes: [(name, c, dur), ...] for ONE iteration. Returns [(midi, tau, dur), ...]
    for BOTH iterations (k=0 and k=1), scaled by 1/tempo, filtered to tau < MASTER_DUR."""
    out = []
    scheduled_tau = []
    for name, c, dur in notes:
        midi = _midi(name, NOTES)
        for k in (0, 1):
            c2 = (c + k * P) / tempo
            tau = c2 + SR_OFFSET
            if tau < MASTER_DUR:
                out.append((midi, tau, dur / tempo))
                scheduled_tau.append(round(tau, 2))
    return out, sorted(scheduled_tau)


def dbfs(x):
    import math
    return 20 * math.log10(x + 1e-12)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))

    bass_notes, bass_tau = _schedule(BASS)
    voice_a_notes, voice_a_tau = _schedule(VOICE_A)
    print("bass scheduled tau (%d notes):" % len(bass_tau), bass_tau)
    print("voice_a scheduled tau (%d notes):" % len(voice_a_tau), voice_a_tau)

    e5_pairs = _e5_events()
    e5_midi = _midi("E5", NOTES)
    e5_notes = [(e5_midi, c / TEMPO + SR_OFFSET, d / TEMPO) for c, d in e5_pairs]
    e5_tau = sorted(round(t, 2) for _, t, _ in e5_notes)
    print("e5 scheduled tau (%d notes):" % len(e5_tau), e5_tau)

    bass_audio, sr = sr_.render(bass_notes, MASTER_DUR, velocity=95, gain=GAIN_BASS)
    voice_a_audio, sr = sr_.render(voice_a_notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_A)
    e5_audio, sr = sr_.render(e5_notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_E5)

    n_master = int(round(MASTER_DUR * sr))
    bass_audio = bass_audio[:n_master].astype(np.float64)
    voice_a_audio = voice_a_audio[:n_master].astype(np.float64)
    e5_audio = e5_audio[:n_master].astype(np.float64)

    for label, layer in [("bass", bass_audio), ("voice_a", voice_a_audio), ("e5", e5_audio)]:
        peak = float(np.max(np.abs(layer)))
        print("layer %s peak %.4f (%.2f dBFS)" % (label, peak, dbfs(peak)))

    master = np.zeros(n_master, dtype=np.float64)
    wm.place(master, bass_audio, 0.0, gain=GAIN, sr=sr)
    wm.place(master, voice_a_audio, 0.0, gain=GAIN, sr=sr)
    wm.place(master, e5_audio, 0.0, gain=GAIN, sr=sr)

    wm.fade_in(master, FADE_IN[0], FADE_IN[1], sr=sr)
    wm.fade_out(master, FADE_OUT_END, FADE_OUT_LEN, sr=sr)

    peak = float(np.max(np.abs(master)))
    target = 10 ** (-1.0 / 20.0)
    scale = 1.0
    if peak > target:
        scale = target / peak
        master *= scale
        peak = float(np.max(np.abs(master)))
    print("master peak %.4f (%.2f dBFS)%s" % (
        peak, dbfs(peak),
        (" -- scaled by %.5f" % scale) if scale != 1.0 else " -- no scaling needed"))

    soundv1_dir = os.path.join(here, "soundv1")
    os.makedirs(soundv1_dir, exist_ok=True)
    master_path = os.path.join(soundv1_dir, "ride_master_v1.wav")
    sr_.write_wav(master_path, master.astype(np.float32), sr)
    print("wrote", master_path, len(master), "samples")

    n_sr = int(round(SCENE_SPLIT * sr))
    slice_sr = master[:n_sr]
    slice_gs = master[n_sr:]
    start_ride_dir = os.path.join(here, "..", "start-ride", "soundv8")
    gates_saving_dir = os.path.join(here, "..", "gates-saving", "soundv9")
    os.makedirs(start_ride_dir, exist_ok=True)
    os.makedirs(gates_saving_dir, exist_ok=True)
    sr_.write_wav(os.path.join(start_ride_dir, "soundtrack_v8.wav"), slice_sr.astype(np.float32), sr)
    sr_.write_wav(os.path.join(gates_saving_dir, "soundtrack_v9.wav"), slice_gs.astype(np.float32), sr)
    print("wrote slice start-ride/soundv8/soundtrack_v8.wav", len(slice_sr), "samples")
    print("wrote slice gates-saving/soundv9/soundtrack_v9.wav", len(slice_gs), "samples")
