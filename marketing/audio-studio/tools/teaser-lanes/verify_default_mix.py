#!/usr/bin/env python3
"""
verify_default_mix.py -- offline mix of kitv1/manifest.json's default (audible) clips, compared with the shipped soundtracks.

Uses exactly the tool's semantics: a clip plays source [in, out) of its track (plus the track's file_offset_s) starting at render time `at`,
times gain, times a linear fade in/out sampled per sample (gainAt), summed. Only tracks whose manifest `muted` is false are mixed.
  (a) render [6.5, 32.8) vs ride/soundv2/ride_master_v2.wav (shifted by 6.5 s)      max |diff| <= 4 LSB, rms(diff) <= 1.5 LSB (1 LSB expected)
  (b) render [0, 6.5)    vs archive/pre-teaser-full-studios/audio-studio/brandmark/opening/soundv3/soundtrack_v3.wav            same tolerances (file must be 286,650 frames)
  (c) render [32.8, 47.6) is all zeros
Prints per-span numbers and ends with MIX OK, or the failing span, its max diff and the cross-correlation lag (then exit 1).
Kit WAVs are 32-bit float (prep_kit.py), so decode overs above 1.0 are mixed unclipped, then clipped once at the end like the build scripts.
Needs python3 + numpy only. Run: cd marketing/audio-studio/tools/teaser-lanes && python3 verify_default_mix.py
"""
import json
import os
import struct
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AS = os.path.normpath(os.path.join(HERE, "..", ".."))
KIT = os.path.join(HERE, "kitv1")
SR = 44100
TOL_MAX, TOL_RMS = 4, 1.5


def read_wav_int16(path):
    """16-bit stereo reader for the shipped references (ride_master_v2.wav, soundtrack_v3.wav)."""
    with wave.open(path, "rb") as w:
        assert w.getnchannels() == 2 and w.getsampwidth() == 2 and w.getframerate() == SR, path
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2)


def read_wav_f32(path):
    """32-bit float stereo 44.1 kHz reader for the kit files (tag 3, or EXTENSIBLE with float sub-format); returns float64."""
    with open(path, "rb") as f:
        raw = f.read()
    bad = "%s is not a 32-bit float 44.1 kHz stereo WAV" % path
    assert len(raw) >= 12 and raw[0:4] == b"RIFF" and raw[8:12] == b"WAVE", bad
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(raw):
        cid = raw[pos:pos + 4]
        size = struct.unpack("<I", raw[pos + 4:pos + 8])[0]
        body = raw[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            data = body
        pos += 8 + size + (size & 1)
    assert fmt is not None and data is not None and len(fmt) >= 16, bad
    tag, ch, rate = struct.unpack("<HHI", fmt[0:8])
    bits = struct.unpack("<H", fmt[14:16])[0]
    ok = (tag == 3 and bits == 32) or (tag == 0xFFFE and len(fmt) >= 26 and fmt[24:26] == b"\x03\x00" and bits == 32)
    assert ok and ch == 2 and rate == SR and len(data) % 8 == 0, bad
    return np.frombuffer(data, dtype="<f4").reshape(-1, 2).astype(np.float64)


def xcorr_lag(ref, x, maxlag=4410):
    n, m = len(ref), len(x)
    nfft = 1 << int(np.ceil(np.log2(n + m)))
    c = np.fft.irfft(np.conj(np.fft.rfft(ref, nfft)) * np.fft.rfft(x, nfft), nfft)
    ks = np.arange(-maxlag, maxlag + 1)
    return int(ks[int(np.argmax(c[ks % nfft]))])


def render(man):
    dur = man["video"]["duration_s"]
    n_total = int(round(dur * SR))
    mix = np.zeros((n_total, 2), dtype=np.float64)
    tracks = {t["id"]: t for t in man["tracks"]}
    used = []
    for c in man["clips"]:
        t = tracks[c["track"]]
        if t["muted"]:
            continue
        wav = read_wav_f32(os.path.join(KIT, t["file"]))       # float, may exceed 1.0; no scaling
        off = t.get("file_offset_s", 0)
        i0 = int(round((c["in"] + off) * SR))
        i1 = int(round((c["out"] + off) * SR))
        seg = wav[i0:i1]
        start = int(round(c["at"] * SR))
        n = len(seg)
        tt = (start + np.arange(n)) / SR                   # render time of each output sample
        end = round(c["at"] + round(c["out"] - c["in"], 4), 4)
        g = np.full(n, float(c["gain"]))
        if c.get("fade_in", 0) > 0:
            g *= np.minimum(1.0, (tt - c["at"]) / c["fade_in"])
        if c.get("fade_out", 0) > 0:
            g *= np.minimum(1.0, (end - tt) / c["fade_out"])
        e = min(start + n, n_total)
        mix[start:e] += seg[: e - start] * g[: e - start, None]
        used.append("%s@%.3f" % (c["track"], c["at"]))
    return mix, used


def to_pcm(x):
    return (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16)


def compare(name, ours, ref):
    d = np.abs(ours.astype(np.int32) - ref.astype(np.int32))
    mx = int(d.max())
    rms = float(np.sqrt(np.mean((ours.astype(np.float64) - ref.astype(np.float64)) ** 2)))
    at = int(np.unravel_index(int(d.argmax()), d.shape)[0])
    ok = mx <= TOL_MAX and rms <= TOL_RMS
    print("%s: frames %d, max |diff| %d LSB (at frame %d), rms(diff) %.4f LSB, samples > 2 LSB: %d  -> %s" % (
        name, len(ours), mx, at, rms, int((d > 2).sum()), "ok" if ok else "FAIL"))
    if not ok:
        lag = xcorr_lag(ref[:, 0].astype(np.float64), ours[:, 0].astype(np.float64))
        print("   cross-correlation lag ours vs reference: %d samples" % lag)
    return ok


def main():
    man = json.load(open(os.path.join(KIT, "manifest.json"), encoding="utf-8"))
    mix, used = render(man)
    pcm = to_pcm(mix)
    peak = max(float(np.abs(read_wav_f32(os.path.join(KIT, t["file"]))).max()) for t in man["tracks"])
    print("kit format: float32 (max |sample| over the kit: %.4f)" % peak)
    print("clips mixed (%d): %s" % (len(used), ", ".join(used)))
    print("mix length: %d frames = %.4f s" % (len(pcm), len(pcm) / SR))
    ok = True
    a0, a1 = int(round(6.5 * SR)), int(round(32.8 * SR))
    master = read_wav_int16(os.path.join(AS, "ride", "soundv2", "ride_master_v2.wav"))
    if len(master) != a1 - a0:
        print("STOP: ride_master_v2.wav has %d frames, expected %d" % (len(master), a1 - a0))
        sys.exit(1)
    ok &= compare("(a) render [6.5, 32.8) vs ride_master_v2.wav", pcm[a0:a1], master)
    opening = read_wav_int16(os.path.join(AS, "..", "archive", "pre-teaser-full-studios", "audio-studio", "brandmark", "opening", "soundv3", "soundtrack_v3.wav"))  # moved 2026-09-26 (marketing cycle 24)
    if len(opening) != 286650:
        print("STOP: soundtrack_v3.wav has %d frames, expected 286650" % len(opening))
        sys.exit(1)
    ok &= compare("(b) render [0, 6.5) vs soundtrack_v3.wav", pcm[: len(opening)], opening)
    tail = pcm[a1:]
    nz = int(np.count_nonzero(tail))
    print("(c) render [32.8, 47.6): %d frames, non-zero samples: %d  -> %s" % (len(tail), nz, "ok" if nz == 0 else "FAIL"))
    ok &= nz == 0
    if ok:
        print("MIX OK")
    else:
        print("MIX FAIL")
        sys.exit(1)


if __name__ == "__main__":
    main()
