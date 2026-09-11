"""
start-ride — soundv1 (first pass)

Source: start-ride_v4.mp4, 14.0s, 1920x1080, no audio.
Visual: black fading in on a still map point (0-4s, no route yet), a brief
hold on the located dot (4-8s), then the caption "Ride your normal route."
appears as a plain yellow route starts drawing across the map (8-14s).

Nothing is judged yet at this point in the story - no tier colours, no
result - so this stays intentionally plain and a little held-back: the
calm-before-the-ride feeling, using the neutral YELLOW_TONE rather than any
of the "win" chimes, saving the payoff for gates-saving/colours/ranking.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime, note,
    CMAJ9_PAD, AM7_PAD, AM7_ARP, YELLOW_TONE,
)

DURATION = 14.0


def build():
    m = new_master(DURATION)

    # 0.0-4.0s: near-silence, a single low held tone standing in for the
    # located dot before anything moves - deliberately sparse.
    mix_into(m, note(65.41, dur=4.3, amp=0.08, attack=1.2, release=1.5), 0.0)

    # 4.0-8.0s: quiet pad settles in as the view holds on the start point.
    mix_into(m, pad(CMAJ9_PAD, dur=4.3, amp=0.09, attack=1.0, release=0.8), 4.0)
    mix_into(m, pulse_train(4.3, 7.9, bpm=88, total_dur=DURATION, amp=0.05, freq=150), 0.0)

    # ~8.0s: a single plain marker tone as the caption lands and the route
    # starts drawing - neutral, matter-of-fact (this is normal, not yet a
    # personal best).
    mix_into(m, chime(YELLOW_TONE, dur=0.8, amp=0.22, stagger=0.0), 7.95)

    # 8.0-14.0s: the route draws steadily - lift to Am7 and a walking
    # arpeggio that gently accelerates, matching the line extending across
    # the map, but stops short of a big resolve since the story isn't
    # finished yet.
    mix_into(m, pad(AM7_PAD, dur=6.2, amp=0.11, attack=0.6, release=1.0), 8.0)
    mix_into(m, arpeggio(AM7_ARP, 8.2, 13.9, bpm=96, total_dur=DURATION, amp=0.14), 0.0)

    return finish(m, DURATION, wet=0.24, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
