"""
brandmark/opening - soundv2

Source: opening_v3.mp4, 6.5s, 1920x1080, no audio (unchanged from soundv1 -
this round only touches the audio, not the picture).
Visual: ring draws clockwise (0-1.3s) -> yellow slash/gate fades in (1.3-1.8s)
-> full mark fades out (2.15-2.6s) -> black beat -> "QUALIFIRE" wordmark fades
in (2.95-3.75s) -> tagline "Same road. New meaning." fades in (3.35-4.05s,
overlapping) -> holds -> fades to black (5.5-6.3s).

Nathan's soundv1 feedback (two items):
1) "the logo drawing should also have a sound, since it is in two parts it is
   pretty easy, a sound for the drawing and then maybe a kind of swoosh for
   the gate" - the ring-draw (0-1.3s) now gets an actual sound (a rising
   pitch sweep tracking the stroke being drawn on), and the slash/gate
   fade-in (1.3-1.8s) gets a swoosh.
2) "for the second text part, it should be only a two-beat sound (similarly
   to the Netflix sound) because only two things are being shown right after
   each other" - the wordmark+tagline reveal no longer plays the old
   rise-chime-then-land-chime pair; it now plays exactly two beats, the new
   shared BRAND_STINGER (low boom on the wordmark, bright ring on the
   tagline) - see synth.py. Closing's own soundv2 reuses this same stinger
   in full, so both ends of the video use the identical brand sound.
"""
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, whoosh, pluck, sweep, sub_hit,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
)

DURATION = 6.5


def build():
    m = new_master(DURATION)

    # 0.0-1.3s: the ring draws on - a rising pitch sweep tracks the stroke
    # being drawn (low -> higher as more of the circle completes), plus a
    # very faint low pad underneath so the moment doesn't start from total
    # silence.
    mix_into(m, pad([NOTES["C2"]], dur=1.6, amp=0.04, attack=0.3, release=0.6), 0.0)
    mix_into(m, sweep(220, 660, dur=1.3, amp=0.22, attack=0.05, release=0.15), 0.0)

    # 1.3-1.8s: the slash/gate fades in - a short swoosh answers the ring's
    # sweep, same "two parts, two sounds" structure as the visual.
    mix_into(m, whoosh(dur=0.55, amp=0.3), 1.3)

    # 1.8-2.95s: quiet pad bridges the mark's fade-out to the text reveal -
    # anticipation, not yet melodic.
    mix_into(m, pad([NOTES["C2"]], dur=1.3, amp=0.05, attack=0.4, release=0.5), 1.8)

    # ~2.95s / ~3.35s: the brand stinger, exactly two beats, one per text
    # element (wordmark, then tagline) - replaces the old rise+land chime
    # pair per Nathan's "only a two-beat sound, similarly to the Netflix
    # sound, because only two things are being shown right after each other."
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.3, amp=0.55), 2.95)
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=1.6, amp=0.4, stagger=0.09), 3.35)

    # Sustained pad underneath the second beat so it doesn't feel like a bare
    # sting - carries the mix to the end of the clip.
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=2.2, amp=0.09, attack=0.6, release=1.2), 3.35)

    # A few soft high plucks trailing off like a shimmer, as the tagline
    # settles (unchanged from soundv1).
    for i, f in enumerate([NOTES["C5"], NOTES["G4"], NOTES["E4"]]):
        mix_into(m, pluck(f, dur=1.2, amp=0.06, brightness=0.7), 5.0 + i * 0.28)

    return finish(m, DURATION, wet=0.3, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
