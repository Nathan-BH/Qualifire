"""
Shared windowing helper for assembling a mixed master from individually rendered
layers (any float array at 44.1 kHz -- engine-agnostic; `write_wav` is re-exported
from salamander_render so callers need only import this one module). Used by
`ride/ride_master.py` to place, fade and window the bass/voice_a/e5 layers into the
continuous "ride" master (see marketing/cycles/14_ride-loop-surge-and-salamander/
BRIEF-ride-loop-track.md). No round folders, no muxes, no scene-README rows are
created by this module -- it is pure signal-processing.
"""
import numpy as np

from salamander_render import write_wav, SR  # noqa: F401  (re-exported for callers)


def place(master, layer, at_s, gain=1.0, sr=SR):
    """Add `gain * layer` into `master` (both float arrays at `sr` Hz) starting at
    `at_s` seconds, in place. Clips the layer to whatever fits inside `master`."""
    start = int(round(at_s * sr))
    end = min(start + len(layer), len(master))
    if end <= start:
        return master
    master[start:end] += gain * layer[: end - start]
    return master


def fade_in(master, t0, len_s, sr=SR):
    """Linear fade-in ramp (0 -> 1) over [t0, t0 + len_s), in place; everything
    before t0 is silenced (multiplied by 0)."""
    i0 = int(round(t0 * sr))
    i1 = int(round((t0 + len_s) * sr))
    i0c = max(0, min(i0, len(master)))
    i1c = max(0, min(i1, len(master)))
    if i0c > 0:
        master[:i0c] = 0.0
    if i1c > i0c:
        ramp = np.linspace(0.0, 1.0, i1c - i0c, endpoint=False)
        master[i0c:i1c] *= ramp
    return master


def fade_out(master, t_end, len_s, sr=SR):
    """Linear fade-out ramp (1 -> 0) over [t_end - len_s, t_end), in place; everything
    at/after t_end is silenced."""
    i0 = int(round((t_end - len_s) * sr))
    i1 = int(round(t_end * sr))
    i0c = max(0, min(i0, len(master)))
    i1c = max(0, min(i1, len(master)))
    if i1c > i0c:
        ramp = np.linspace(1.0, 0.0, i1c - i0c, endpoint=False)
        master[i0c:i1c] *= ramp
    if i1c < len(master):
        master[i1c:] = 0.0
    return master


def silence_outside(master, t0, t1, sr=SR):
    """Zero everything outside [t0, t1), in place."""
    i0 = max(0, min(int(round(t0 * sr)), len(master)))
    i1 = max(0, min(int(round(t1 * sr)), len(master)))
    master[:i0] = 0.0
    master[i1:] = 0.0
    return master


if __name__ == "__main__":
    m = np.zeros(int(2.0 * SR), dtype=np.float64)
    layer = np.full(int(1.0 * SR), 0.5, dtype=np.float64)
    place(m, layer, 0.5, gain=2.0)
    a, b = int(0.5 * SR), int(1.5 * SR)
    print("place: [a,b) all 1.0:", bool(np.all(m[a:b] == 1.0)), "outside zero:",
          bool(np.all(m[:a] == 0.0)) and bool(np.all(m[b:] == 0.0)))

    fade_in(m, 0.5, 0.1)
    i_55 = int(0.55 * SR)
    i_60 = int(0.60 * SR)
    print("fade_in @0.55s:", round(float(m[i_55]), 4), "(expect 0.5 +/- 0.01)")
    print("fade_in @0.60s:", round(float(m[i_60]), 4), "(expect 1.0)")

    fade_out(m, 1.5, 0.5)
    i_125 = int(1.25 * SR)
    print("fade_out @1.25s:", round(float(m[i_125]), 4), "(expect 0.5 +/- 0.01)")
    last_layer_idx = int(1.5 * SR) - 1
    print("fade_out last layer sample |x|:", abs(float(m[last_layer_idx])), "(expect < 0.001)")

    silence_outside(m, 0.6, 1.4)
    rms_before = np.sqrt(np.mean(m[: int(round(0.6 * SR))].astype(np.float64) ** 2))
    rms_after = np.sqrt(np.mean(m[int(round(1.4 * SR)):].astype(np.float64) ** 2))
    import math
    def dbfs(r):
        return 20 * math.log10(r + 1e-12)
    print("silence_outside RMS before 0.6s (dBFS):", round(dbfs(rms_before), 1))
    print("silence_outside RMS after 1.4s (dBFS):", round(dbfs(rms_after), 1))
