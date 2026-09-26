"""
gates-saving - soundv3

Source: gates-saving_v4.mp4 (12.3-12.4s render; the v5 visual redesign - white
draw-across gates instead of colour pop-ins - does not change any of this
scene's timing, so this soundtrack still lines up with the existing v4
render while Nathan renders v5 separately). 1920x1080.
Visual: 1.0s zoom-out lead-in continuing the camera from start-ride's
finishing frame (0.0-1.0s), start/end landmark rings pop in (1.05-1.55s),
caption "Save your route as reference." + three gate ticks appear (1.6-4.9s,
now drawing across the route rather than popping in - see hyperframes
rounds/v5), rider fades in and the second ride runs (4.4-11.7s), caption
"Next time. Start racing yourself." (5.2-12.3s), ends 12.4s.

Migrated to import the shared synth.py toolkit (this file used to carry its
own inline copy, predating the extraction - see APPROACH.md's "worth
migrating it to import synth.py too next time that file gets touched").

Nathan's soundv2 feedback (two items):
1) "if possible some kind of whoosh sound while zooming out" -> a whoosh now
   plays under the 0.0-1.0s zoom-out lead-in.
2) "for the second ride ideally I want something close to the first ride but
   more upbeat. Think about how in mario kart when you get the star boost,
   the music is more fast paced and happy, while the music is actually the
   same, that kind of idea here" -> "the first ride" is start-ride's own
   scene, whose soundv2 (see ../start-ride/soundtrack.py) was rebuilt this
   same round into a driving four-chord loop (C-G-Am-F, using the shared
   CMAJ9_ARP/GADD9_ARP/AM7_ARP/FMAJ7_ARP tones) at a fast, upbeat tempo. This
   scene's ride (4.4-11.7s) now reuses that exact same four-chord
   progression and tone set - not a new melody - but at a faster, still-
   accelerating tempo (165->210bpm vs start-ride's flat 155bpm) and brighter
   mix, so it reads as "the same tune, boosted" the way a Mario Kart star
   power-up remixes the existing race music rather than swapping it out.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime, whoosh,
    CMAJ9_PAD, CMAJ9_ARP, GADD9_ARP, AM7_ARP, FMAJ7_ARP, CMAJ_RESOLVE,
    YELLOW_TONE, GREEN_CHIME, PURPLE_CHIME,
)

DURATION = 12.3

GATES = [0.24, 0.63, 0.84]           # same fractions as the video's own GATES constant
RIDE_T0, RIDE_DUR = 4.8, 6.9
GATE_T = [RIDE_T0 + f * RIDE_DUR for f in GATES]   # [6.456, 9.147, 10.596]


def build():
    m = new_master(DURATION)

    # 0.0-1.0s: whoosh under the zoom-out lead-in.
    mix_into(m, whoosh(dur=1.0, amp=0.32), 0.0)

    # 1.05-4.8s: calm hold while the route is shown and the gates draw on -
    # same "at rest" feeling as before, just quieter than the old opening
    # since the whoosh already carried the scene's first second.
    mix_into(m, pad(CMAJ9_PAD, dur=3.9, amp=0.10, attack=0.6, release=0.8), 1.05)
    mix_into(m, chime([CMAJ9_ARP[0], CMAJ9_ARP[1]], dur=0.7, amp=0.28, stagger=0.09), 1.6)  # "saved" ping

    # 4.4-11.7s: the second ride - start-ride's own four-chord loop (C-G-Am-F),
    # reused note-for-note, boosted: tempo climbs 165->210bpm across the four
    # segments (vs start-ride's flat 155) and the mix sits a touch brighter.
    SEGMENTS = [
        (CMAJ9_ARP, RIDE_T0, GATE_T[0], 165),
        (GADD9_ARP, GATE_T[0], GATE_T[1], 180),
        (AM7_ARP, GATE_T[1], GATE_T[2], 195),
        (FMAJ7_ARP, GATE_T[2], RIDE_T0 + RIDE_DUR, 210),
    ]
    for tones, start, end, bpm in SEGMENTS:
        mix_into(m, arpeggio(tones, start, end, bpm=bpm, total_dur=DURATION, amp=0.22), 0.0)
    mix_into(m, pulse_train(RIDE_T0, RIDE_T0 + RIDE_DUR, bpm=180, total_dur=DURATION, amp=0.10, freq=95, decay=0.07), 0.0)

    # Gate-crossing pings - each marks the sector that just completed
    # (green -> yellow -> purple), tuned to sit inside whichever chord is
    # playing at that moment, same idea as soundv2's event chimes.
    mix_into(m, chime(GREEN_CHIME, dur=0.45, amp=0.30, stagger=0.05), GATE_T[0])
    mix_into(m, chime(YELLOW_TONE * 2, dur=0.4, amp=0.26, stagger=0.06), GATE_T[1])
    mix_into(m, chime(PURPLE_CHIME, dur=0.6, amp=0.36, stagger=0.06), GATE_T[2])

    # 11.7-12.3s: final resolve as the clip ends (purple sector's the peak;
    # this settles it back to the calm opening key).
    mix_into(m, chime(CMAJ_RESOLVE, dur=1.0, amp=0.34, stagger=0.0), RIDE_T0 + RIDE_DUR)

    return finish(m, DURATION, wet=0.22, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v3.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v3.wav", len(audio) / SR, "s")
