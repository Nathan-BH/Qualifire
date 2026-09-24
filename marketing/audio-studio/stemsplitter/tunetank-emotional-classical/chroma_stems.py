#!/usr/bin/env python3
"""Pitch-class (chroma) read of the stems: which notes sound in each piano-chord segment.

    python3 chroma_stems.py        (run from this folder; needs ffmpeg on PATH)

For each of the five chord segments (onsets from WAVEFORM-NOTES.md) it takes an FFT
(Hann, 16384 pts, 50% overlap) of the piano, strings and bass stems, folds 55-2000 Hz
(bass: 30-300 Hz) energy into 12 pitch classes (A4 = 440, +-50 cents), and prints the
normalised profile + the strongest classes. Also a whole-body profile and a
Krumhansl-Schmuckler key estimate. Stdlib + numpy only.
"""
import os, subprocess, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100
PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
def load(n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'sources', n + '.mp3'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def chroma(x, a, b, lo, hi, N=16384):
    seg = x[int(a * SR):int(b * SR)]; w = np.hanning(N); acc = np.zeros(N // 2 + 1)
    for i in range(0, max(1, len(seg) - N + 1), N // 2):
        f = seg[i:i + N]
        if len(f) < N: f = np.pad(f, (0, N - len(f)))
        acc += np.abs(np.fft.rfft(f * w)) ** 2
    fr = np.fft.rfftfreq(N, 1 / SR); m = (fr >= lo) & (fr <= hi)
    midi = 69 + 12 * np.log2(fr[m] / 440); near = np.abs(midi - np.round(midi)) < 0.5
    c = np.zeros(12); np.add.at(c, (np.round(midi[near]).astype(int)) % 12, acc[m][near])
    return c / c.max()
def top(c, k=4): return ' '.join('%s(%.2f)' % (PC[i], c[i]) for i in np.argsort(c)[::-1][:k])
ON = [1.24, 3.70, 6.15, 8.60, 11.05]
stems = {n: load(n) for n in ['6stem_piano', 'strings-model_strings', '6stem_bass', 'original']}
print('segment      piano (strongest)                        strings                                  bass (30-300 Hz)')
for k, a in enumerate(ON):
    b = ON[k + 1] if k + 1 < len(ON) else 13.0
    print('chord %d %5.2f-%5.2f | %-40s | %-40s | %s' % (k + 1, a, b,
          top(chroma(stems['6stem_piano'], a + 0.05, b, 55, 2000)),
          top(chroma(stems['strings-model_strings'], a, min(b, 11.1), 55, 2000)) if a < 11 else '-',
          top(chroma(stems['6stem_bass'], a, min(b, 11.1), 30, 300), 2) if a < 11 else '-'))
body = chroma(stems['original'], 1.26, 11.1, 55, 2000)
print('\nwhole body (original, 1.26-11.1 s):', ' '.join('%s %.2f' % (PC[i], body[i]) for i in range(12)))
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
sc = [(np.corrcoef(np.roll(p, s), body)[0, 1], PC[s] + (' major' if p is maj else ' minor')) for p in (maj, mnr) for s in range(12)]
sc.sort(reverse=True); print('key estimate (Krumhansl):', ', '.join('%s %.2f' % (n, r) for r, n in sc[:4]))
