"""
brandmark/closing — soundv1 (first pass)

Source: closing_v2.mp4, 4.0s, 1920x1080, no audio.
Visual: near-black with the dim mark barely visible (0-1.5s), brightening
steadily to the full bright mark + wordmark + tagline "Same road. New
meaning." by 3.5-4.0s.

This is the sign-off, so it plays like the quieter, more spacious echo of
brandmark/opening's chime rather than a repeat of it - same brand vocabulary,
lower energy, because it's closing the piece rather than opening it.
"""
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime,
    NOTES, BRAND_CHIME_LAND,
)

DURATION = 4.0


def build():
    m = new_master(DURATION)

    # 0-1.5s: near-silent low pad matching the dim opening frame.
    mix_into(m, pad([NOTES["C2"]], dur=2.0, amp=0.04, attack=0.8, release=0.8), 0.0)

    # ~1.3s: the landing chord only (no separate rise - this is an echo, not
    # a full re-statement), quieter than opening's version, longer release
    # so it can still be ringing as the clip ends.
    mix_into(m, chime(BRAND_CHIME_LAND, dur=2.4, amp=0.3, stagger=0.12), 1.3)

    # A soft sustained pad under it that never really resolves loudly - the
    # piece is meant to trail off into quiet rather than land hard.
    mix_into(m, pad([NOTES["C3"], NOTES["G3"], NOTES["C4"]], dur=2.5, amp=0.08, attack=0.5, release=1.8), 1.3)

    return finish(m, DURATION, wet=0.32, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
