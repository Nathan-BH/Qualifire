#!/usr/bin/env python3
"""Numbers + overview figure for the MVSEP stems of tunetank-emotional-classical.

    python3 analyze_stems.py            (run from this folder; needs ffmpeg on PATH)

Decodes sources/*.mp3 with ffmpeg (-ar 44100 -ac 2, no downmix), aligns every stem to
original.mp3 by cross-correlation (ffprobe reports MVSEP's mp3s as 15.073 s, but ffmpeg's
decode trims the encoder padding to 15.0465 s = the original; lag is 0 samples for every stem
with real content except bass, +12 = 0.27 ms), then prints per-stem level/energy stats, reconstruction residuals and a
windowed RMS table, and writes figures/stems_overview.png. Per-file waveform figures come from
../../piano/projects/tunetank/make_waveform.py (same format as tunetank-ride's).
Stdlib + numpy + matplotlib only, same constraint as make_waveform.py.
"""
import os, subprocess, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, 'sources'); SR = 44100
def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, name + '.mp3'),
                          '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
db = lambda x: 20 * np.log10(max(x, 1e-12))
rms = lambda x: np.sqrt(np.mean(x ** 2))

orig = load('original'); N = len(orig); om = orig.mean(1)
def align(x):
    """lag (samples) such that x[lag:lag+N] ~ orig; searched over +-4096 on the mono sum."""
    xm = x.mean(1); best, lag = -1, 0
    seg = om[SR:SR * 11]  # body only
    for L in range(-4096, 4097, 1):
        a = xm[SR + L: SR * 11 + L]
        if len(a) != len(seg): continue
        c = np.dot(a, seg)
        if c > best: best, lag = c, L
    return lag
def cut(x, lag):
    y = np.zeros((N, 2)); src = x[max(lag, 0):]; dst0 = max(-lag, 0)
    n = min(N - dst0, len(src)); y[dst0:dst0 + n] = src[:n]; return y

STRINGS = ['strings-model_strings', 'strings-model_other']
SIX = ['6stem_' + s for s in ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']]
ALL = STRINGS + SIX + ['6stem_instrum']
stems = {}
for n in ALL:
    x = load(n); lag = align(x); stems[n] = cut(x, lag)
    print('%-26s decoded %.4f s, lag %+d samples (%+.2f ms)' % (n, len(x) / SR, lag, lag / SR * 1000))

E0 = np.sum(orig ** 2)
print('\n%-26s %8s %9s %10s %9s' % ('file', 'peak', 'RMS dBFS', 'energy %', 'corr/orig'))
print('%-26s %8.4f %9.2f %10s %9s' % ('original', np.abs(orig).max(), db(rms(orig)), '100', '1'))
for n in ALL:
    s = stems[n]; c = np.dot(s.ravel(), orig.ravel()) / np.sqrt(np.sum(s ** 2) * E0)
    print('%-26s %8.4f %9.2f %10.1f %9.3f' % (n, np.abs(s).max(), db(rms(s)), 100 * np.sum(s ** 2) / E0, c))

def resid(parts, label):
    r = orig - sum(stems[p] for p in parts)
    print('residual %-40s %7.2f dB below original' % (label, db(rms(orig)) - db(rms(r))))
print()
resid(STRINGS, 'strings + other (strings model)')
resid(SIX, 'sum of 6 stems (6-stem model)')
resid(['6stem_instrum', '6stem_vocals'], 'instrum + vocals')
resid(['6stem_' + s for s in ['drums', 'bass', 'guitar', 'piano', 'other']], 'drums+bass+guitar+piano+other vs instrum'.replace(' vs instrum', ''))

WIN = [(0.0, 1.2), (1.26, 3.0), (3.0, 5.0), (5.0, 7.0), (7.0, 9.0), (9.0, 11.1), (11.1, 12.5), (12.5, 14.0), (14.0, 15.0)]
cols = ['original'] + STRINGS + ['6stem_piano', '6stem_other', '6stem_drums', '6stem_bass']
short = {'original': 'orig', 'strings-model_strings': 'STR', 'strings-model_other': 'STR-oth', '6stem_piano': 'piano',
         '6stem_other': '6-oth', '6stem_drums': 'drums', '6stem_bass': 'bass'}
print('\nwindowed RMS (dBFS)\n%-12s' % 'window s' + ''.join('%9s' % short[c] for c in cols))
for a, b in WIN:
    i, j = int(a * SR), int(b * SR); row = '%5.2f-%5.2f ' % (a, b)
    for c in cols:
        x = orig if c == 'original' else stems[c]; row += '%9.1f' % db(rms(x[i:j]))
    print(row)

# overview: 50 ms RMS envelopes in dBFS, one lane per file
win = int(0.05 * SR); nw = N // win; t = (np.arange(nw) + 0.5) * win / SR
def env(x):
    m = x.mean(1)[:nw * win].reshape(nw, win); return 20 * np.log10(np.sqrt((m ** 2).mean(1)) + 1e-9)
lanes = ['original'] + STRINGS + SIX
fig, axes = plt.subplots(len(lanes), 1, figsize=(20, 1.5 * len(lanes)), sharex=True)
for ax, n in zip(axes, lanes):
    x = orig if n == 'original' else stems[n]
    ax.fill_between(t, -60, env(x), color='#1f5fa8' if n != 'original' else '#333333', alpha=0.85)
    ax.plot(t, env(orig), color='#c0392b', lw=0.8, alpha=0.6)
    ax.set_ylim(-60, 0); ax.set_yticks([-60, -30, 0]); ax.grid(True, alpha=0.3)
    ax.set_ylabel(n.replace('strings-model_', 'strings: ').replace('6stem_', '6-stem: '), rotation=0, ha='right', va='center', fontsize=11)
    for v in (1.26, 11.1): ax.axvline(v, color='k', lw=0.6, ls='--')
axes[-1].set_xlabel('Time (s)'); axes[-1].set_xlim(0, N / SR)
plt.tight_layout(); plt.savefig(os.path.join(HERE, 'figures', 'stems_overview.png'), dpi=100)
print('\nwrote figures/stems_overview.png')
