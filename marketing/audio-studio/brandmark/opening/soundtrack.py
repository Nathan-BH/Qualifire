"""
brandmark/opening — soundv1 (first pass)

Source: opening_v3.mp4, 6.5s, 1920x1080, no audio.
Visual: black (0-1.5s) -> "QUALIFIRE" wordmark fades in alone (~3s) -> full
mark (ring+slash icon) + wordmark + tagline "Same road. New meaning." settle
in at full brightness by 6s, holds to 6.5s.

This is the brand's signature moment - the sound that should become
recognizable on its own, so it reuses the shared BRAND_CHIME motif from
synth.py rather than one-off tones.
"""
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, whoosh, pluck,
    NOTES, BRAND_CHIME_RISE, BRAND_CHIME_LAND,
)

DURATION = 6.5


def build():
    m = new_master(DURATION)

    # 0-3s: near-silence, the faintest low pad breathing under the fade-in -
    # anticipation, not yet melodic.
    mix_into(m, pad([NOTES["C2"]], dur=3.2, amp=0.05, attack=1.5, release=1.0), 0.0)

    # ~1.5-3.2s: a very quiet upward whoosh timed to the wordmark fading in.
    mix_into(m, whoosh(dur=1.8, amp=0.12), 1.4)

    # ~3.0s: the brand chime rise - two ascending plucked notes - as the
    # wordmark reads clearly.
    mix_into(m, chime(BRAND_CHIME_RISE, dur=1.1, amp=0.35, stagger=0.22), 3.0)

    # ~4.3s: the full mark lands - icon + wordmark + tagline all visible -
    # answered by the richer landing chord.
    mix_into(m, chime(BRAND_CHIME_LAND, dur=1.6, amp=0.4, stagger=0.09), 4.3)

    # Sustained pad underneath the landing chord so it doesn't feel like a
    # bare sting - carries the mix to the end of the clip.
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=2.2, amp=0.09, attack=0.6, release=1.2), 4.3)

    # A few soft high plucks trailing off like a shimmer, as the tagline
    # settles.
    for i, f in enumerate([NOTES["C5"], NOTES["G4"], NOTES["E4"]]):
        mix_into(m, pluck(f, dur=1.2, amp=0.06, brightness=0.7), 5.0 + i * 0.28)

    return finish(m, DURATION, wet=0.3, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
