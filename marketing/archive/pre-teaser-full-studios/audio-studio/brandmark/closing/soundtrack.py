"""
brandmark/closing - soundv2

Source: closing_v3.mp4 (not rendered yet - built against the NEW v3 timeline
in ../../silent-studio/brandmark/closing/index.html, 4.0s, 1920x1080; see that
file's rounds/v3/FEEDBACK.md for the visual redesign this pairs with: mark,
wordmark, and tagline now all arrive together within 0.75s instead of
soundv1's ~1.9s staggered reveal).
Visual: mark fades/scales up (0.00-0.50s), QUALIFIRE wordmark fades in,
overlapping (0.10-0.60s), tagline "Same road. New meaning." fades in,
overlapping both (0.25-0.75s) - everything on screen by 0.75s - holds to
3.50s, fades to black (3.50-4.00s).

Nathan's soundv1 feedback: "Should use the same Netflix type sound as In the
beginning to close it off." - soundv1 only played the quiet "landing" half
of the brand chime, as a deliberately understated echo of the opening. That
restraint is gone: this round plays the FULL two-beat BRAND_STINGER from
../opening/soundtrack.py's soundv2 (the low boom + the bright ring, see
synth.py's BRAND_STINGER_LOW/BRAND_STINGER_HIGH) - the identical brand sound
at both ends of the video, timed to the now-tight reveal (beat 1 on the
mark/wordmark arriving together at the very start, beat 2 on the tagline
0.35s later), so it plays out fully rather than being cut down for the close.
"""
import sys
sys.path.insert(0, "../..")
from synth import (
    SR, new_master, mix_into, finish, pad, chime, sub_hit,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
)

DURATION = 4.0


def build():
    m = new_master(DURATION)

    # 0.0s / 0.35s: the same two-beat brand stinger from brandmark/opening,
    # played in full this time (soundv1 only used the quiet landing half).
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.4, amp=0.5), 0.0)
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=2.2, amp=0.36, stagger=0.10), 0.35)

    # A soft sustained pad under the second beat, ringing through the hold
    # so the close reads as definitive rather than trailing into silence
    # early - fades naturally into the 3.5-4.0s visual fade-to-black.
    mix_into(m, pad([NOTES["C3"], NOTES["G3"], NOTES["C4"]], dur=3.2, amp=0.09, attack=0.5, release=2.0), 0.35)

    return finish(m, DURATION, wet=0.3, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
