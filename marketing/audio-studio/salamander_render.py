"""
Sample-based piano rendering via the real Salamander Grand Piano samples -- the same
multi-sampled Yamaha C5 set midiviewer.io and Klang.io play back in their own preview
players. Counterpart of ../fluid_render.py (the FluidSynth/bundled-GM-soundfont
sampler), but runnable on Nathan's PC shell: pure numpy + stdlib + an ffmpeg
subprocess for mp3 decode (no FluidSynth, no scipy, no network).

Samples come from `piano/samples/salamander/` -- fetched by
`piano/projects/interstellar/get_salamander_samples.ps1` on 2026-09-20. The mirror is
single-velocity-layer (one mp3 per sampled note) and is missing `A0`; every note this
project uses (F2 and up) is well inside the covered range.

Design decisions (fixed; see marketing/cycles/14_ride-loop-surge-and-salamander/
BRIEF-salamander-renderer.md for the full rationale):
1. Decode with ffmpeg (no mp3 library is installed on this shell; ffmpeg is), into a
   per-process-cached float32 array. Nothing decoded is written into the repo -- the
   cache lives under the OS temp dir.
2. Sample map: 29 names at a 3-semitone grid, `A0` absent; nearest sample by semitone
   distance (never a tie on this grid).
3. Pitch shift by linear resampling (numpy.interp): ratio r = 2**(shift/12).
4. Envelope: unity through the note's duration, then a damper-style exponential
   release (tau 0.12s) for 0.6s after note-off, then zero.
5. Velocity -> amplitude, linear (vel / 127); velocity is a per-call constant, as in
   fluid_render.render.
6. Buffer length int((dur_s + 2.0) * sr), matching fluid_render.py line 71, so callers
   that truncate to DUR keep working and callers that want the tail get it.
7. Output level is the caller's job (`gain`); render() prints the peak and refuses to
   clip silently (raises if peak > 1.0).
8. Pure numpy + stdlib + ffmpeg subprocess only. No scipy, no synth.py import inside
   this module.

    import salamander_render
    audio, sr = salamander_render.render([(69, 0.0, 1.0), (72, 0.5, 1.0)], dur_s=2.0)
    salamander_render.write_wav("out.wav", audio, sr)

notes: list of (midi_number, start_seconds, duration_seconds). velocity/gain are
render-wide (call once per "voice" -- bass, melody, etc, matching how synth.py's
pad()/pluck() calls and fluid_render.render are typically one voice at a time too).
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "piano", "samples", "salamander")
SAMPLE_NAMES = [
    "C1", "Ds1", "Fs1", "A1", "C2", "Ds2", "Fs2", "A2", "C3", "Ds3", "Fs3", "A3",
    "C4", "Ds4", "Fs4", "A4", "C5", "Ds5", "Fs5", "A5", "C6", "Ds6", "Fs6", "A6",
    "C7", "Ds7", "Fs7", "A7", "C8",
]
SAMPLE_MIDI = {name: 24 + 3 * i for i, name in enumerate(SAMPLE_NAMES)}
RELEASE_TAU = 0.12
RELEASE_LEN = 0.6

_CACHE = {}


def _decode(name):
    """Decode piano/samples/salamander/<name>.mp3 to float32 mono @ SR, cached per
    process (and on disk under a temp dir so repeat runs skip ffmpeg entirely)."""
    if name in _CACHE:
        return _CACHE[name]
    cache_dir = os.path.join(tempfile.gettempdir(), "salamander_decoded")
    os.makedirs(cache_dir, exist_ok=True)
    wav_path = os.path.join(cache_dir, name + ".wav")
    if not os.path.exists(wav_path):
        mp3_path = os.path.join(SAMPLE_DIR, name + ".mp3")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", mp3_path, "-ac", "1", "-ar", str(SR), "-f", "wav", wav_path],
            check=True,
        )
    with wave.open(wav_path, "rb") as w:
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    _CACHE[name] = data
    return data


def _nearest(midi):
    """Nearest sample name and the shift (in semitones) to reach `midi` from it."""
    if midi < 24 or midi > 108:
        raise ValueError("midi %r out of range [24, 108]" % (midi,))
    best_name, best_shift, best_dist = None, None, None
    for name in SAMPLE_NAMES:
        dist = midi - SAMPLE_MIDI[name]
        adist = abs(dist)
        if best_dist is None or adist < best_dist:
            best_name, best_shift, best_dist = name, dist, adist
    return best_name, best_shift


def _pitch_shift(x, shift):
    """Linear resample by ratio r = 2**(shift/12); output sample i reads source
    position i * r (upshift shortens/speeds the source, downshift lengthens it)."""
    if shift == 0:
        return x
    r = 2.0 ** (shift / 12.0)
    n_out = int(len(x) / r)
    src_pos = np.arange(n_out) * r
    src_idx = np.arange(len(x), dtype=np.float64)
    return np.interp(src_pos, src_idx, x).astype(np.float32)


def render(notes, dur_s, velocity=100, gain=1.0, sr=SR):
    """notes: [(midi_num, start_s, dur_s), ...]. Returns (float32 mono array, sr)."""
    n_total = int((dur_s + 2.0) * sr)  # pad for natural piano decay past the last note
    out = np.zeros(n_total, dtype=np.float64)
    amp = velocity / 127.0

    for midi_num, start, note_dur in notes:
        name, shift = _nearest(midi_num)
        src = _decode(name)
        voiced = _pitch_shift(src, shift)

        note_len = int(round(note_dur * sr))
        release_len = int(round(RELEASE_LEN * sr))
        clip_len = min(len(voiced), note_len + release_len)
        if clip_len <= 0:
            continue
        clip = voiced[:clip_len].copy()
        if clip_len > note_len:
            t = np.arange(clip_len - note_len, dtype=np.float64) / sr
            clip[note_len:] *= np.exp(-t / RELEASE_TAU)

        start_idx = int(round(start * sr))
        end_idx = min(start_idx + clip_len, n_total)
        if end_idx <= start_idx:
            continue
        out[start_idx:end_idx] += amp * clip[: end_idx - start_idx]

    out *= gain
    peak = float(np.max(np.abs(out))) if out.size else 0.0
    peak_dbfs = 20.0 * np.log10(peak + 1e-12)
    print("peak %.3f (%.1f dBFS)" % (peak, peak_dbfs))
    if peak > 1.0:
        raise ValueError("gain too high: peak %.2f" % (peak,))

    return out.astype(np.float32), sr


def write_wav(path, x, sr=SR):
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())
