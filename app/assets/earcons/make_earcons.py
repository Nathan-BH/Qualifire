#!/usr/bin/env python3
"""D-019 earcons rendered to WAV — faithful port of demos/mockup.html's
WebAudio spec (12 ms linear attack, exponential decay; sine/triangle).
Lap voice (D-022): same figure octave-doubled down at ~half gain, no buzz.
Consumed by the app via expo-audio from build 3 onward. Re-run to regenerate."""
import numpy as np, wave

SR = 44100
E5, GS5, B5, E6, GS6 = 659.25, 830.61, 987.77, 1318.51, 1661.22
E4, GS4, B4 = 329.63, 415.30, 493.88

def tone(buf, t0, freq, dur, wave_type='triangle', gain=0.22, detune_cents=0):
    f = freq * (2 ** (detune_cents / 1200))
    n0, n1 = int(t0 * SR), int((t0 + dur + 0.05) * SR)
    t = np.arange(n1 - n0) / SR
    if wave_type == 'sine':
        w = np.sin(2 * np.pi * f * t)
    else:
        w = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    env = np.ones_like(t)
    a = int(0.012 * SR)
    env[:a] = np.linspace(0, 1, a)
    dec = t >= 0.012
    env[dec] = np.exp(np.log(0.0001) * (t[dec] - 0.012) / max(dur - 0.012, 1e-3))
    end = min(n1, len(buf))
    buf[n0:end] += (w * env * gain)[: end - n0]

def render(name, notes, total):
    buf = np.zeros(int(total * SR))
    for n in notes:
        tone(buf, *n[:3], **(n[3] if len(n) > 3 else {}))
    buf = np.clip(buf, -1, 1)
    with wave.open(f'{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((buf * 32767).astype('<i2').tobytes())

render('neutral', [(0.02, E5, 0.15, dict(wave_type='sine', gain=0.20))], 0.4)
render('green', [(0.02, E5, 0.11), (0.16, B5, 0.13)], 0.5)
arp = [(0.02, E5, 0.09), (0.12, GS5, 0.09), (0.22, B5, 0.09),
       (0.32, E6, 0.28), (0.32, E6, 0.28, dict(detune_cents=8, gain=0.10))]
render('purple', arp, 0.9)
render('purple_pb', arp + [(0.50, GS6, 0.14, dict(gain=0.14))], 0.9)
render('lap_green', [(0.02, E5, 0.13), (0.02, E4, 0.13, dict(gain=0.11)),
                     (0.18, B5, 0.17), (0.18, B4, 0.17, dict(gain=0.11))], 0.6)
lap_arp = [(0.02, E5, 0.09), (0.02, E4, 0.09, dict(gain=0.11)),
           (0.12, GS5, 0.09), (0.12, GS4, 0.09, dict(gain=0.11)),
           (0.22, B5, 0.09), (0.22, B4, 0.09, dict(gain=0.11)),
           (0.32, E6, 0.28), (0.32, E5, 0.28, dict(gain=0.11)),
           (0.32, E6, 0.28, dict(detune_cents=8, gain=0.10))]
render('lap_purple', lap_arp, 0.9)
render('lap_purple_pb', lap_arp + [(0.50, GS6, 0.14, dict(gain=0.14))], 0.9)
print('7 earcons rendered')
