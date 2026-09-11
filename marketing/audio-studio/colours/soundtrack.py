"""
colours — soundv1 (first pass)

Source: colours_v2.mp4, 19.0s, 1920x1080, no audio.
Visual: a horizontal bar chart builds in against an "avg" dashed line, then
walks through three reveals of the same tier system used in gates-saving:
  0.0-5.0s   build-in, bars settle                      (neutral)
  ~5.0s      "Yellow." / "Yellow is slower than your average."
  5.0-10.0s  bar climbs                                  (rising)
  ~10.0s     "Green." / "Faster than your average."
  10.0-14.0s bar climbs further, brief hold, no label yet
  14.0-18.0s transition
  ~18.0s     "Purple." / "Faster than every one of your last ten."  (peak)

Same chord-per-tier idea as gates-saving/soundtrack.py, but this scene lives
entirely inside that reveal-a-label beat, so the pacing is three clear
plateaus rather than one continuous run.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime,
    FMAJ7_PAD, FMAJ7_ARP, AM7_PAD, AM7_ARP, GADD9_PAD, GADD9_ARP, CMAJ_RESOLVE,
    YELLOW_TONE, GREEN_CHIME, PURPLE_CHIME,
)

DURATION = 19.0


def build():
    m = new_master(DURATION)

    # 0.0-5.0s: neutral build-in. Plain, a little tentative - Fmaj7, slow
    # arpeggio, quiet pulse standing in for the bars ticking into place.
    mix_into(m, pad(FMAJ7_PAD, dur=5.2, amp=0.11, attack=0.8, release=0.8), 0.0)
    mix_into(m, arpeggio(FMAJ7_ARP, 0.6, 5.0, bpm=92, total_dur=DURATION, amp=0.12), 0.0)
    mix_into(m, pulse_train(0.0, 5.0, bpm=100, total_dur=DURATION, amp=0.05, freq=150), 0.0)

    # ~5.0s: "Yellow" reveal - single plain tone, matter-of-fact, not a
    # letdown but not a win either.
    mix_into(m, chime(YELLOW_TONE, dur=1.0, amp=0.3, stagger=0.0), 4.95)

    # 5.0-10.0s: lift into Am7 - the bar is visibly climbing now.
    mix_into(m, pad(AM7_PAD, dur=5.2, amp=0.12, attack=0.5, release=0.8), 5.0)
    mix_into(m, arpeggio(AM7_ARP, 5.3, 9.9, bpm=104, total_dur=DURATION, amp=0.14), 0.0)

    # ~10.0s: "Green" reveal - the bright two-note rise.
    mix_into(m, chime(GREEN_CHIME, dur=1.0, amp=0.34, stagger=0.08), 9.95)

    # 10.0-14.0s: continued climb into Gadd9, arpeggio speeding up, building
    # toward the peak reveal.
    mix_into(m, pad(GADD9_PAD, dur=4.2, amp=0.13, attack=0.4, release=0.6), 10.0)
    mix_into(m, arpeggio(GADD9_ARP, 10.3, 13.9, bpm=116, total_dur=DURATION, amp=0.15), 0.0)

    # 14.0-18.0s: brief held transition before the peak - keep it moving
    # with a faster, quieter arpeggio rather than going silent.
    mix_into(m, pad(GADD9_PAD, dur=4.2, amp=0.10, attack=0.3, release=0.6), 14.0)
    mix_into(m, arpeggio(GADD9_ARP, 14.2, 17.9, bpm=126, total_dur=DURATION, amp=0.11,
                          pattern=(0, 1, 2, 3)), 0.0)

    # ~18.0s: "Purple" - the peak. Richer three-note chime plus a full
    # resolve chord, the biggest moment in the scene.
    mix_into(m, chime(PURPLE_CHIME, dur=1.1, amp=0.4, stagger=0.09), 17.95)
    mix_into(m, pad(CMAJ_RESOLVE, dur=1.3, amp=0.16, attack=0.05, release=0.9), 17.95)

    return finish(m, DURATION, wet=0.24, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
