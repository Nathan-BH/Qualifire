#!/usr/bin/env python3
"""Waveform + spectrogram figure, matching ../tunetank-ride/waveform_*.png's format.

    ffmpeg -y -v error -i source.mp3 -ar 44100 -ac 2 /tmp/x.wav
    python3 make_waveform.py /tmp/x.wav source.mp3 out.png

Pure stdlib `wave` + numpy + matplotlib (no scipy, no librosa) - same "runs anywhere"
constraint as tools/parse_midi.py.
"""
import sys, wave, numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

wav_path, label, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

w = wave.open(wav_path, 'rb')
sr = w.getframerate()
nch = w.getnchannels()
sampwidth = w.getsampwidth()
nframes = w.getnframes()
raw = w.readframes(nframes)
w.close()

dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sampwidth]
data = np.frombuffer(raw, dtype=dtype).astype(np.float64)
maxval = float(2**(8*sampwidth - 1))
data = data / maxval
if nch > 1:
    data = data.reshape(-1, nch)
    mono = data.mean(axis=1)
else:
    mono = data

dur = len(mono) / sr
peak = np.max(np.abs(mono))
peak_dbfs = 20*np.log10(peak) if peak > 0 else float('-inf')
rms = np.sqrt(np.mean(mono**2))
rms_dbfs = 20*np.log10(rms) if rms > 0 else float('-inf')

t = np.arange(len(mono)) / sr

# 20ms RMS envelope
win = max(1, int(0.020 * sr))
n_win = len(mono) // win
env = np.array([np.sqrt(np.mean(mono[i*win:(i+1)*win]**2)) for i in range(n_win)])
t_env = (np.arange(n_win) + 0.5) * win / sr

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(20, 10), height_ratios=[1, 1])

ax1.plot(t, mono, linewidth=0.3, color='#1f5fa8', alpha=0.9)
ax1.plot(t_env, env, color='#c0392b', linewidth=1.2, label='RMS envelope (20ms)')
ax1.plot(t_env, -env, color='#c0392b', linewidth=1.2)
ax1.set_xlim(0, dur)
ax1.set_ylim(-1.05, 1.05)
ax1.set_ylabel('Amplitude')
ax1.set_title(f'{label} — {dur:.2f}s, peak {peak_dbfs:.1f} dBFS, mean {rms_dbfs:.2f} dBFS')
ax1.legend(loc='upper right')
ax1.grid(True, alpha=0.3)

Pxx, freqs, bins, im = ax2.specgram(mono, NFFT=2048, Fs=sr, noverlap=1536, cmap='inferno')
ax2.set_ylim(0, 5000)
ax2.set_xlim(0, dur)
ax2.set_xlabel('Time (s)')
ax2.set_ylabel('Frequency (Hz)')
cbar = fig.colorbar(im, ax=ax2, pad=0.01)
cbar.set_label('dB')

plt.tight_layout()
plt.savefig(out_path, dpi=100)
print(f"duration={dur:.3f}s sr={sr} channels={nch} peak={peak:.4f} ({peak_dbfs:.2f} dBFS) rms={rms_dbfs:.2f} dBFS")
