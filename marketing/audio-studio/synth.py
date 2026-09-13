"""
Shared procedural-audio toolkit for audio-studio.

Extracted from gates-saving/soundtrack.py so every scene draws on the same
building blocks instead of re-deriving them. Pure numpy/scipy, no external
assets, no network calls, no pip installs beyond what's already present.
See audio-studio/APPROACH.md for the reasoning.

Lives at the audio-studio root, next to structure.md/APPROACH.md. A scene's
own soundtrack.py reaches it with `sys.path.insert(0, "..")` (or "../.."
for a scene that's nested one level deeper, like brandmark/opening/).
"""
import numpy as np
from scipy.signal import lfilter

SR = 44100


def t_axis(dur, sr=SR):
    return np.linspace(0, dur, int(sr * dur), endpoint=False)


def envelope(n, attack, release, sr=SR):
    a = max(1, min(int(attack * sr), n))
    r = max(1, min(int(release * sr), n - a))
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a)
    if r > 0:
        env[-r:] = np.linspace(1, 0, r)
    return env


def sine(freq, dur, amp=1.0, phase=0.0, detune=0.0, sr=SR):
    tt = t_axis(dur, sr)
    return amp * np.sin(2 * np.pi * (freq + detune) * tt + phase)


def note(freq, dur, amp=1.0, attack=0.01, release=0.3, warmth=True, sr=SR):
    """A single soft synth note: two slightly detuned sines (warmth) + envelope."""
    sig = sine(freq, dur, amp=0.6, sr=sr)
    if warmth:
        sig = sig + sine(freq, dur, amp=0.4, detune=1.5, phase=0.3, sr=sr)
    sig *= envelope(len(sig), attack, release, sr=sr)
    return sig


def chime(freqs, dur=0.9, amp=0.5, stagger=0.05, sr=SR):
    """Ascending/soft bell-like chime: notes fired in quick succession."""
    total_len = int(sr * (dur + stagger * len(freqs)))
    buf = np.zeros(total_len)
    for i, f in enumerate(freqs):
        n = note(f, dur, amp=amp, attack=0.005, release=dur * 0.85, sr=sr)
        start = int(i * stagger * sr)
        buf[start:start + len(n)] += n
    return buf


def whoosh(dur=1.2, amp=0.35, sr=SR):
    """Filtered-noise swell used for transitions."""
    n = int(sr * dur)
    noise = np.random.uniform(-1, 1, n)
    smoothed = np.cumsum(noise)
    smoothed -= np.linspace(smoothed[0], smoothed[-1], n)
    smoothed /= np.max(np.abs(smoothed)) + 1e-9
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return amp * smoothed * env


def riser(dur=2.0, amp=0.3, sr=SR):
    """Anticipation build: filtered noise with an increasing-only envelope
    (no fall-off) - use where the payoff sound (a click/hit) comes right after."""
    n = int(sr * dur)
    noise = np.random.uniform(-1, 1, n)
    smoothed = np.cumsum(noise)
    smoothed -= np.linspace(smoothed[0], smoothed[-1], n)
    smoothed /= np.max(np.abs(smoothed)) + 1e-9
    env = np.linspace(0, 1, n) ** 1.8
    return amp * smoothed * env


def click(freq=140, amp=0.6, dur=0.12, sr=SR):
    """A punchy low-thud + bright transient - button presses, stingers."""
    thud = note(freq, dur, amp=amp, attack=0.001, release=dur * 0.9, warmth=False, sr=sr)
    n = int(sr * dur * 0.3)
    transient = np.random.uniform(-1, 1, n) * envelope(n, 0.001, dur * 0.25, sr=sr) * amp * 0.5
    out = thud.copy()
    out[: len(transient)] += transient
    return out


def pad(freqs, dur, amp=0.12, attack=1.0, release=1.5, sr=SR):
    """Sustained multi-note chord bed, slow attack/release."""
    n = int(sr * dur)
    buf = np.zeros(n)
    for f in freqs:
        buf += sine(f, dur, amp=amp / len(freqs), detune=0.6, sr=sr)
        buf += sine(f, dur, amp=amp / len(freqs), detune=-0.6, phase=1.1, sr=sr)
    buf *= envelope(n, attack=min(attack, dur * 0.3), release=min(release, dur * 0.3), sr=sr)
    return buf


def pluck(freq, dur, amp=0.5, decay=0.9985, brightness=0.5, sr=SR):
    """Karplus-Strong plucked string: a soft music-box/kalimba tone."""
    n_period = max(2, int(sr / freq))
    n_out = int(sr * dur)
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
    out *= envelope(len(out), 0.002, dur * 0.6, sr=sr)
    return out


def arpeggio(chord_tones, start, end, bpm, total_dur, amp=0.16,
             pattern=(0, 1, 2, 3, 2, 1), sr=SR):
    """Plays a chord's notes in a pattern at a set tempo using pluck().
    total_dur sizes the returned buffer (the scene's full duration)."""
    step = 30.0 / bpm  # eighth note
    times = np.arange(start, end, step)
    total_len = int(sr * total_dur) + sr
    buf = np.zeros(total_len)
    for i, tstart in enumerate(times):
        freq = chord_tones[pattern[i % len(pattern)] % len(chord_tones)]
        n = pluck(freq, dur=step * 2.2, amp=amp, sr=sr)
        s = int(tstart * sr)
        buf[s:s + len(n)] += n[: max(0, len(buf) - s)]
    return buf[: int(sr * total_dur)]


def pulse_train(start, end, bpm, total_dur, amp=0.16, freq=170, decay=0.09, sr=SR):
    """Soft rhythmic 'heartbeat'/tick pulses."""
    step = 60.0 / bpm
    times = np.arange(start, end, step)
    total_len = int(sr * total_dur) + sr
    buf = np.zeros(total_len)
    for tstart in times:
        n = note(freq, decay, amp=amp, attack=0.002, release=decay * 0.9, warmth=False, sr=sr)
        s = int(tstart * sr)
        buf[s:s + len(n)] += n
    return buf[: int(sr * total_dur)]


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


def reverb(x, wet=0.22, sr=SR):
    """Small Schroeder reverb: parallel combs + series allpasses."""
    delays_ms = [29.7, 37.1, 41.1, 43.7]
    acc = np.zeros_like(x)
    for d_ms in delays_ms:
        d = max(1, int(sr * d_ms / 1000))
        acc = acc + comb(x, d, 0.78)
    acc /= len(delays_ms)
    acc = allpass(acc, max(1, int(sr * 0.005)), 0.7)
    acc = allpass(acc, max(1, int(sr * 0.0017)), 0.7)
    return x * (1 - wet) + acc * wet


def soften(x, passes=1):
    """Cheap low-pass via repeated 3-point moving average."""
    kernel = np.array([1, 2, 1]) / 4.0
    for _ in range(passes):
        x = np.convolve(x, kernel, mode="same")
    return x


def mix_into(master, clip, start_time, sr=SR):
    s = int(start_time * sr)
    e = min(len(master), s + len(clip))
    master[s:e] += clip[: e - s]


def new_master(duration, sr=SR):
    return np.zeros(int(sr * duration) + sr)


def finish(master, duration, wet=0.22, soften_passes=1, peak=0.9, sr=SR):
    """Common finishing chain: trim, soften, reverb, limit."""
    master = master[: int(sr * duration)]
    if soften_passes:
        master = soften(master, passes=soften_passes)
    if wet:
        master = reverb(master, wet=wet, sr=sr)
    m = np.max(np.abs(master))
    if m > peak:
        master = master / m * peak
    return master


# --- added for the 2026-09 gate-draw / brand-stinger feedback round --------
def sweep(f0, f1, dur, amp=0.3, attack=0.02, release=0.05, warmth=True, sr=SR):
    """A continuous pitch sweep from f0 to f1 over dur seconds - sonifies a
    line being drawn (a stroke-dashoffset reveal, a gate tick, a logo ring).
    Builds the instantaneous phase by integrating a linearly-interpolated
    frequency curve (so the pitch glide is exact, not just an FM trick)."""
    n = int(sr * dur)
    freqs = np.linspace(f0, f1, n)
    phase = 2 * np.pi * np.cumsum(freqs) / sr
    sig = amp * 0.6 * np.sin(phase)
    if warmth:
        sig = sig + amp * 0.4 * np.sin(phase * 1.004 + 0.3)
    sig *= envelope(n, attack, release, sr=sr)
    return sig


def sub_hit(freq, dur=0.9, amp=0.55, attack=0.004, release=0.75, sr=SR):
    """A low, punchy 'boom' - the low half of the Netflix-style two-beat
    brand stinger (see BRAND_STINGER_LOW below). Unlike click() (a short UI
    tap), this has real sustain and a touch of second-harmonic weight."""
    sig = sine(freq, dur, amp=0.7, sr=sr) + sine(freq * 2, dur, amp=0.15, phase=0.2, sr=sr)
    sig *= envelope(len(sig), attack, release, sr=sr)
    return sig * amp


def droplet_run(f0, f1, n, t0, t1, amp=0.3, shrink=0.82, sr=SR):
    """A run of n short 'droplet' plucks rising in pitch (f0->f1, musically/
    geometrically interpolated) while accelerating - the gap between drops
    shrinks by `shrink` each step, so the run both rises AND speeds up, a
    literal "goes up in pitch + speeds up" crescendo. Volume also ramps up
    slightly across the run for a real crescendo feel, not just a pitch
    glide. Returns a buffer covering [0, t1 + a short pluck tail]."""
    total_len = int(sr * (t1 + 0.4))
    buf = np.zeros(total_len)
    span = t1 - t0
    if n > 1 and shrink != 1:
        interval0 = span * (1 - shrink) / (1 - shrink ** (n - 1))
    elif n > 1:
        interval0 = span / (n - 1)
    else:
        interval0 = 0
    t = t0
    for i in range(n):
        u = i / max(1, n - 1)
        freq = f0 * (f1 / f0) ** u
        a = amp * (0.6 + 0.7 * u)
        dur = max(0.09, 0.32 - 0.02 * i)
        sig = pluck(freq, dur=dur, amp=a, brightness=0.85, decay=0.9975, sr=sr)
        s = int(t * sr)
        buf[s:s + len(sig)] += sig[: max(0, len(buf) - s)]
        t += interval0 * (shrink ** i)
    return buf[: int(sr * (t1 + 0.4))]


# --- shared C-major chord/note vocabulary, reused across scenes for a ------
# --- consistent sonic identity (see APPROACH.md "brand chord vocabulary") -
NOTES = {
    "C2": 65.41, "F2": 87.31, "G2": 98.00, "A2": 110.00,
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99,
}

CMAJ9_PAD = [NOTES["C3"], NOTES["E3"], NOTES["G3"], NOTES["B3"], NOTES["D4"]]
CMAJ9_ARP = [NOTES["C4"], NOTES["E4"], NOTES["G4"], NOTES["B4"]]
AM7_PAD = [NOTES["A2"], NOTES["C3"], NOTES["E3"], NOTES["G3"]]
AM7_ARP = [NOTES["A3"], NOTES["C4"], NOTES["E4"], NOTES["G4"]]
FMAJ7_PAD = [NOTES["F2"], NOTES["A2"], NOTES["C3"], NOTES["E3"]]
FMAJ7_ARP = [NOTES["F3"], NOTES["A3"], NOTES["C4"], NOTES["E4"]]
GADD9_PAD = [NOTES["G2"], NOTES["B3"] / 2, NOTES["D3"], NOTES["A3"]]
GADD9_ARP = [NOTES["G3"], NOTES["B3"], NOTES["D4"], NOTES["A4"]]
CMAJ_RESOLVE = [NOTES["C4"], NOTES["E4"], NOTES["G4"], NOTES["C5"]]

# The "Qualifire" brand chime: used in brandmark/opening and brandmark/closing,
# and to bookend the teaser. A rising fourth (G4->C5) landing on a bright,
# open two-note interval - simple enough to be recognizable on its own.
BRAND_CHIME_RISE = [NOTES["G4"], NOTES["C5"]]
BRAND_CHIME_LAND = [NOTES["C4"], NOTES["G4"], NOTES["C5"]]

# The brand's two-beat "Netflix-style" stinger (added 2026-09-13, Nathan's
# opening/closing feedback): a low sub "boom" (sub_hit at BRAND_STINGER_LOW)
# answered ~0.35-0.45s later by a bright ringing chord (chime at
# BRAND_STINGER_HIGH, which reuses BRAND_CHIME_LAND so it stays inside the
# same brand vocabulary) - exactly two beats, for a moment where exactly two
# things appear right after each other (opening's wordmark+tagline; closing's
# whole reveal). Shared by brandmark/opening (soundv2) and brandmark/closing
# (soundv2) so it reads as the same brand sound in both places.
BRAND_STINGER_LOW = NOTES["C2"]
BRAND_STINGER_HIGH = BRAND_CHIME_LAND

# Tier colours (gates-saving, colours, ranking all use these three):
# yellow = plain/neutral, green = good, purple = best. Kept in one place so
# a future scene reuses the same emotional coding instead of reinventing it.
YELLOW_TONE = [NOTES["A3"]]                       # single plain note
GREEN_CHIME = [NOTES["G4"], NOTES["B4"]]           # bright two-note rise
PURPLE_CHIME = [NOTES["D4"], NOTES["A4"], NOTES["D5"]]  # richer three-note "level up"
