"""
v2: actual soft music instead of a pulse-and-a-chord.

Still zero external assets, zero network calls, zero new pip packages
(pretty_midi / fluidsynth / soundfile etc. are all unreachable in this
sandbox right now - PyPI installs of *anything* new are 403ing at the
proxy, unrelated to audio). Everything below is built from numpy + a
hand-rolled Karplus-Strong plucked string and a Schroeder-style
algorithmic reverb, both plain DSP with no model weights needed.

Key: C major. Chord map over the timeline:
  0.0 - 5.0   Cmaj9   (static route, calm)
  5.0 - 7.3   Am7     (dot starts moving)
  7.3 - 9.3   Fmaj7   (green trail extends)
  9.3 - 11.7  Gadd9   (purple / personal-best, brighter)
  11.7-12.3   Cmaj    (resolve, clip ends)

A plucked-string arpeggio outlines each chord in eighth notes (speeding
up 100->116->128bpm with the runner), replacing the old mechanical
"pulse" with an actual melodic figure. The old event chimes (save /
green / purple / final) are re-tuned to sit inside the same chord so
nothing clashes, then the whole mix gets a soft algorithmic reverb and
a gentle low-pass to round off harsh sine edges.
"""
import numpy as np
from scipy.signal import lfilter
from scipy.io import wavfile

SR = 44100
DURATION = 12.3


def t_axis(dur):
    return np.linspace(0, dur, int(SR * dur), endpoint=False)


def envelope(n, attack, release, sr=SR):
    a = max(1, min(int(attack * sr), n))
    r = max(1, min(int(release * sr), n - a))
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a)
    if r > 0:
        env[-r:] = np.linspace(1, 0, r)
    return env


def sine(freq, dur, amp=1.0, phase=0.0, detune=0.0):
    tt = t_axis(dur)
    return amp * np.sin(2 * np.pi * (freq + detune) * tt + phase)


def note(freq, dur, amp=1.0, attack=0.01, release=0.3, warmth=True):
    sig = sine(freq, dur, amp=0.6)
    if warmth:
        sig = sig + sine(freq, dur, amp=0.4, detune=1.5, phase=0.3)
    sig *= envelope(len(sig), attack, release)
    return sig


def chime(freqs, dur=0.9, amp=0.5, stagger=0.05):
    total_len = int(SR * (dur + stagger * len(freqs)))
    buf = np.zeros(total_len)
    for i, f in enumerate(freqs):
        n = note(f, dur, amp=amp, attack=0.005, release=dur * 0.85)
        start = int(i * stagger * SR)
        buf[start:start + len(n)] += n
    return buf


def whoosh(dur=1.2, amp=0.35):
    n = int(SR * dur)
    noise = np.random.uniform(-1, 1, n)
    smoothed = np.cumsum(noise)
    smoothed -= np.linspace(smoothed[0], smoothed[-1], n)
    smoothed /= np.max(np.abs(smoothed)) + 1e-9
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return amp * smoothed * env


def pad(freqs, dur, amp=0.12, attack=1.0, release=1.5):
    n = int(SR * dur)
    buf = np.zeros(n)
    for f in freqs:
        buf += sine(f, dur, amp=amp / len(freqs), detune=0.6)
        buf += sine(f, dur, amp=amp / len(freqs), detune=-0.6, phase=1.1)
    buf *= envelope(n, attack=min(attack, dur * 0.3), release=min(release, dur * 0.3))
    return buf


def pluck(freq, dur, amp=0.5, decay=0.9985, brightness=0.5):
    """Karplus-Strong plucked string: a soft music-box / kalimba tone."""
    n_period = max(2, int(SR / freq))
    n_out = int(SR * dur)
    buf = np.random.uniform(-1, 1, n_period) * brightness + \
        np.random.uniform(-1, 1, n_period) * (1 - brightness) * 0.3
    out = np.zeros(n_out)
    idx = 0
    for i in range(n_out):
        out[i] = buf[idx]
        nxt = buf[(idx + 1) % n_period]
        buf[idx] = decay * 0.5 * (buf[idx] + nxt)
        idx = (idx + 1) % n_period
    out *= amp
    out *= envelope(len(out), 0.002, dur * 0.6)
    return out


def arpeggio(chord_tones, start, end, bpm, amp=0.16, pattern=(0, 1, 2, 3, 2, 1)):
    step = 30.0 / bpm  # eighth note
    times = np.arange(start, end, step)
    total_len = int(SR * DURATION) + SR
    buf = np.zeros(total_len)
    for i, tstart in enumerate(times):
        freq = chord_tones[pattern[i % len(pattern)] % len(chord_tones)]
        n = pluck(freq, dur=step * 2.2, amp=amp)
        s = int(tstart * SR)
        buf[s:s + len(n)] += n[: max(0, len(buf) - s)]
    return buf[: int(SR * DURATION)]


def soft_low_pulse(start, end, bpm, amp=0.07, freq=70):
    """Very quiet sub 'heartbeat' under the arpeggio - felt, not heard."""
    step = 60.0 / bpm
    times = np.arange(start, end, step)
    total_len = int(SR * DURATION) + SR
    buf = np.zeros(total_len)
    for tstart in times:
        n = note(freq, 0.12, amp=amp, attack=0.002, release=0.1, warmth=False)
        s = int(tstart * SR)
        buf[s:s + len(n)] += n
    return buf[: int(SR * DURATION)]


def mix_into(master, clip, start_time):
    s = int(start_time * SR)
    e = min(len(master), s + len(clip))
    master[s:e] += clip[: e - s]


def comb(x, delay, fb):
    a = np.zeros(delay + 1)
    a[0] = 1
    a[delay] = -fb
    return lfilter([1.0], a, x)


def allpass(x, delay, fb=0.7):
    b = np.zeros(delay + 1)
    b[0] = -fb
    b[delay] = 1.0
    a = np.zeros(delay + 1)
    a[0] = 1.0
    a[delay] = -fb
    return lfilter(b, a, x)


def reverb(x, wet=0.22):
    delays_ms = [29.7, 37.1, 41.1, 43.7]
    acc = np.zeros_like(x)
    for d_ms in delays_ms:
        d = max(1, int(SR * d_ms / 1000))
        acc = acc + comb(x, d, 0.78)
    acc /= len(delays_ms)
    acc = allpass(acc, max(1, int(SR * 0.005)), 0.7)
    acc = allpass(acc, max(1, int(SR * 0.0017)), 0.7)
    return x * (1 - wet) + acc * wet


def soften(x, cutoff_passes=2):
    """Cheap low-pass via repeated 3-point moving average - takes the edge
    off pure-sine harmonics without needing scipy.signal.butter tuning."""
    kernel = np.array([1, 2, 1]) / 4.0
    for _ in range(cutoff_passes):
        x = np.convolve(x, kernel, mode="same")
    return x


# --- chord tones -----------------------------------------------------------
CMAJ9_PAD = [130.81, 164.81, 196.00, 246.94, 293.66]        # C3 E3 G3 B3 D4
CMAJ9_ARP = [261.63, 329.63, 392.00, 493.88]                 # C4 E4 G4 B4

AM7_PAD = [110.00, 130.81, 164.81, 196.00]                   # A2 C3 E3 G3
AM7_ARP = [220.00, 261.63, 329.63, 392.00]                   # A3 C4 E4 G4

FMAJ7_PAD = [87.31, 110.00, 130.81, 164.81]                  # F2 A2 C3 E3
FMAJ7_ARP = [174.61, 220.00, 261.63, 329.63]                 # F3 A3 C4 E4

GADD9_PAD = [98.00, 123.47, 146.83, 220.00]                  # G2 B2 D3 A3
GADD9_ARP = [196.00, 246.94, 293.66, 440.00]                 # G3 B3 D4 A4

CMAJ_RESOLVE = [261.63, 329.63, 392.00, 523.25]              # C4 E4 G4 C5


def build():
    master = np.zeros(int(SR * DURATION) + SR)

    # --- pad bed following the chord map ---
    mix_into(master, pad(CMAJ9_PAD, 5.0, amp=0.14, attack=1.2, release=1.0), 0.0)
    mix_into(master, pad(AM7_PAD, 2.3, amp=0.13, attack=0.4, release=0.6), 5.0)
    mix_into(master, pad(FMAJ7_PAD, 2.0, amp=0.13, attack=0.3, release=0.6), 7.3)
    mix_into(master, pad(GADD9_PAD, 2.4, amp=0.15, attack=0.3, release=0.8), 9.3)

    # --- melodic arpeggio (Karplus-Strong pluck), speeding up with the run ---
    mix_into(master, arpeggio(AM7_ARP, 5.2, 7.3, bpm=100, amp=0.15), 0.0)
    mix_into(master, arpeggio(FMAJ7_ARP, 7.3, 9.3, bpm=112, amp=0.17), 0.0)
    mix_into(master, arpeggio(GADD9_ARP, 9.3, 11.7, bpm=124, amp=0.19), 0.0)

    # --- quiet sub heartbeat, felt more than heard, only while running ---
    mix_into(master, soft_low_pulse(5.2, 11.7, bpm=112, amp=0.06), 0.0)

    # --- UI / event chimes, re-tuned to sit inside the current chord ---
    mix_into(master, chime([523.25, 659.25], dur=0.7, amp=0.3, stagger=0.09), 3.0)      # save (C E, Cmaj9)
    mix_into(master, whoosh(dur=1.0, amp=0.28), 4.85)                                   # transition
    mix_into(master, chime([392.0, 493.88], dur=0.5, amp=0.32, stagger=0.06), 7.0)       # green ping (G B, Fmaj7 color)
    mix_into(master, chime([293.66, 440.0, 587.33], dur=0.8, amp=0.34, stagger=0.07), 9.3)  # purple "level up" (D A D5, Gadd9)
    mix_into(master, chime(CMAJ_RESOLVE, dur=1.6, amp=0.36, stagger=0.0), 11.7)          # final resolve

    master = master[: int(SR * DURATION)]
    master = soften(master, cutoff_passes=1)
    master = reverb(master, wet=0.22)

    peak = np.max(np.abs(master))
    if peak > 0.9:
        master = master / peak * 0.9

    return master


if __name__ == "__main__":
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
