"""Cycle 16 verification (BRIEF-tunetank-ride-soundtrack.md section 6). Run from
audio-studio/ride after ride_tunetank.py. Prints numbers; compare to the brief."""
import math, os, wave, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100
def rd(p):
    with wave.open(p, "rb") as w:
        assert w.getnchannels() == 2 and w.getframerate() == SR, (p, w.getnchannels(), w.getframerate())
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768.0
db = lambda x: 20 * math.log10(x + 1e-12)
m = rd(os.path.join(HERE, "soundv2", "ride_master_v2.wav"))
a = rd(os.path.join(HERE, "..", "start-ride", "soundv9", "soundtrack_v9.wav"))
b = rd(os.path.join(HERE, "..", "gates-saving", "soundv10", "soundtrack_v10.wav"))
print("frames master/start-ride/gates-saving:", len(m), len(a), len(b), "(expect 1159830 617400 542430)")
print("slice parity:", np.array_equal(m[:617400], a), np.array_equal(m[617400:], b), "(expect True True)")
pk = np.abs(m).max(); print("master peak %.4f (%.2f dBFS) at %.3f s (expect 0.8520 / -1.39 / 17.871; must be <= -1.00 dBFS)" % (pk, db(pk), np.unravel_index(np.abs(m).argmax(), m.shape)[0] / SR))
mono = m.mean(axis=1)
def rms(t0, t1): return db(np.sqrt(np.mean(mono[int(t0 * SR):int(t1 * SR)] ** 2)))
print("RMS windows (dBFS):")
for t0, t1 in [(0, 3.8), (3.8, 4.6), (5.0, 5.2), (5.3, 5.5), (13.5, 14.0), (14.0, 14.5), (14.5, 15.0), (15.0, 15.5), (15.5, 16.0), (16.5, 17.0), (17.0, 17.5), (17.5, 17.8), (17.8, 18.0), (25.3, 25.5), (26.0, 26.2), (26.25, 26.3)]:
    print("  %5.2f-%5.2f  %6.1f" % (t0, t1, rms(t0, t1)))
print("last frame |x|: %.6f (expect 0.000000)" % np.abs(m[-1]).max())
w = int(0.02 * SR); e = np.array([db(np.sqrt(np.mean(mono[i * w:(i + 1) * w] ** 2))) for i in range(len(mono) // w)])
def first_over(t_from, thr):
    i0 = int(t_from / 0.02)
    for i in range(i0, len(e)):
        if e[i] > thr: return round(i * 0.02, 2)
print("ride-1 attack: first 20ms window > -15 dBFS after 3.80 at", first_over(3.80, -15), "(expect 5.08)")
print("ride-2 attack: first 20ms window > -15 dBFS after 16.54 at", first_over(16.54, -15), "(expect 17.82)")
print("ride-1 tail: first 20ms window < -25 dBFS after 14.00 at", [round(i * 0.02, 2) for i in range(int(14 / 0.02), len(e)) if e[i] < -25][0], "(expect 15.44)")
sal = []
for t in [17.80, 19.81, 21.65, 23.51, 25.38]:
    i = int((t + 0.03) * SR); j = int((t + 0.09) * SR); k = int((t - 0.06) * SR)
    sal.append(round(db(np.sqrt(np.mean(mono[i:j] ** 2))) - db(np.sqrt(np.mean(mono[k:i - int(0.03 * SR)] ** 2))), 1))
print("E5 jump (60ms after pulse+30ms vs 60ms before), dB:", sal, "(expect [14.3, 8.0, 7.4, 6.1, 5.1]; every value > 3)")
