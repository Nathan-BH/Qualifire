"""
ranking — soundv1 (first pass)

Source: ranking_v4.mp4, 10.1s, 1920x1080, no audio.
Visual: holds on the finished colored route (0-3s), a "LAST TEN RIDES /
THIS ROUTE" card fades in and the list settles (3-6s), the "Today" row
lights up purple at ~6s, then the caption "Compare against yourselfs"
appears and holds to the end.

Purple is this project's "personal best / peak" colour (see synth.py and
gates-saving/colours), so the "Today" highlight reuses PURPLE_CHIME as the
scene's one clear payoff moment.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, chime,
    CMAJ9_PAD, CMAJ9_ARP, GADD9_PAD, CMAJ_RESOLVE, PURPLE_CHIME,
)

DURATION = 10.1


def build():
    m = new_master(DURATION)

    # 0.0-3.0s: quiet hold on the finished route - calm, at rest, same
    # feeling gates-saving opens on.
    mix_into(m, pad(CMAJ9_PAD, dur=3.3, amp=0.09, attack=0.6, release=0.8), 0.0)

    # 3.0-6.0s: the ranking card fades in and the list settles - a gentle
    # arpeggio giving it some life without pulling focus.
    mix_into(m, pad(CMAJ9_PAD, dur=3.2, amp=0.11, attack=0.5, release=0.6), 3.0)
    mix_into(m, arpeggio(CMAJ9_ARP, 3.2, 5.9, bpm=100, total_dur=DURATION, amp=0.13), 0.0)

    # ~6.0s: "Today" lights up purple - the payoff.
    mix_into(m, chime(PURPLE_CHIME, dur=1.2, amp=0.38, stagger=0.08), 5.95)
    mix_into(m, pad(GADD9_PAD, dur=1.6, amp=0.13, attack=0.1, release=0.9), 5.95)

    # 7.5-10.1s: settle into the resolve chord as the caption holds.
    mix_into(m, pad(CMAJ_RESOLVE, dur=2.6, amp=0.12, attack=0.6, release=1.4), 7.5)

    return finish(m, DURATION, wet=0.26, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
