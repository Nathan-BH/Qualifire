"""
ranking - soundv2

Source: ranking_v5.mp4 (not rendered yet - built against the NEW v5 timeline
in ../../hyperframes/ranking/index.html, 10.8s, 1920x1080; see that file's
rounds/v5/FEEDBACK.md for the visual redesign this pairs with).
Visual: map dims, tower fades in (0-0.7s), ten rows fill top-down (0.8-2.5s),
old #10 drops off (3.0-3.35s), "Today" rises from below the list and climbs
the whole tower in one continuous glide, overtaking each row on the way,
settling into slot 2 at 5.4s, hold (5.4-5.9s), caption "Compare directly to
your previous ride" (5.9-7.9s), caption "Compare against yourselfs" (8.2-
10.8s).

Nathan's soundv1 feedback: "Dont like this piano. I would want some kind of
'droplet crescendo' I dont know how to describe it. Since I want it going up
in the ranking, some kind of sound that goes from low to high pitch + goes
up in speed (shorter intervals)?" - the old quiet piano-ish pad+arpeggio
during the card-fade is gone. In its place: a run of short rising "droplet"
plucks (see synth.py's new droplet_run - low pitch and slower at the start,
climbing higher and speeding up as it goes) timed to exactly the same
3.2-5.4s window the new "Today climbs the tower" animation runs, so the
sound and the rank climb are the same event. It resolves into the purple
"personal best" chime the instant Today settles into slot 2.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, droplet_run, chime,
    CMAJ9_PAD, CMAJ_RESOLVE, PURPLE_CHIME, NOTES,
)

DURATION = 10.8


def build():
    m = new_master(DURATION)

    # 0.0-3.0s: quiet hold while the ten rows fill in - calm, at rest, same
    # feeling gates-saving opens on (unchanged idea from soundv1).
    mix_into(m, pad(CMAJ9_PAD, dur=3.3, amp=0.09, attack=0.6, release=0.8), 0.0)

    # 3.2-5.25s: the droplet crescendo, timed to Today's climb (3.2-5.4s) -
    # rises from a low A3 to a bright D6-ish register while the interval
    # between drops shrinks, so it visibly (audibly) speeds up and climbs at
    # once, same shape as the rank animation itself. Left 0.15s of headroom
    # before 5.4 so the landing chime below doesn't collide with the last drop.
    mix_into(m, droplet_run(NOTES["A3"], NOTES["G5"] * 1.26, n=9, t0=3.2, t1=5.25, amp=0.30), 0.0)

    # 5.4s: Today settles into slot 2 - the payoff, purple "personal best"
    # chime (same PURPLE_CHIME used in gates-saving/colours) plus a brief
    # pad swell under it.
    mix_into(m, chime(PURPLE_CHIME, dur=1.2, amp=0.40, stagger=0.07), 5.4)
    mix_into(m, pad([NOTES["D4"], NOTES["A4"]], dur=1.6, amp=0.13, attack=0.1, release=0.9), 5.4)

    # 5.9-7.9s: caption A, calm - the payoff already happened, so this stays
    # understated.
    mix_into(m, pad(CMAJ9_PAD, dur=2.2, amp=0.08, attack=0.5, release=0.8), 5.9)

    # 8.2-10.8s: settle into the resolve chord as the second caption holds.
    mix_into(m, pad(CMAJ_RESOLVE, dur=2.8, amp=0.11, attack=0.6, release=1.4), 8.2)

    return finish(m, DURATION, wet=0.26, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
