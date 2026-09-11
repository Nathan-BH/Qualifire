"""
teaser — soundv1 (first pass)

Source: teaser_v5.mp4, 46.9s, 1920x1080, no audio.

Built as an independent composition, not a concatenation of the other
scenes' soundtracks (per Nathan's "independent... including the full
teaser") - but it reuses the same brand vocabulary and tier chimes from
synth.py so it feels like the same sonic world as the individual scenes,
just paced for its own cut.

Frame-by-frame scene order in this cut (confirmed 2026-09-11 by extracting
frames at 2fps and reading them):
  0-6s     opening brand mark ("QUALIFIRE" / "Same road. New meaning.")
  6-24s    start-ride: map holds, then a route starts drawing
  24-32s   gates-saving: the route re-appears fully coloured
           (yellow/purple/green tiers, i.e. the "colours" idea, expressed
           here through the route itself rather than a separate bar-chart
           scene - colours_v2.mp4 does not appear in this cut)
  32-34s   hold on the finished coloured route
  34-40s   ranking: "LAST TEN RIDES" card, "Today" row lights up purple,
           caption "Compare against yourselfs"
  40-46.9s closing brand mark, full brightness, tagline holds

One continuous chord arc runs underneath all of it (same C major family as
every other scene) so the piece reads as one build rather than five
stitched-together stings.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime, note, pluck,
    NOTES, BRAND_CHIME_RISE, BRAND_CHIME_LAND,
    CMAJ9_PAD, CMAJ9_ARP, AM7_PAD, AM7_ARP, FMAJ7_PAD, FMAJ7_ARP,
    GADD9_PAD, GADD9_ARP, CMAJ_RESOLVE,
    YELLOW_TONE, GREEN_CHIME, PURPLE_CHIME,
)

DURATION = 46.9


def build():
    m = new_master(DURATION)

    # ---- 0-6s: opening brand -------------------------------------------
    mix_into(m, pad([NOTES["C2"]], dur=3.0, amp=0.05, attack=1.2, release=0.8), 0.0)
    mix_into(m, chime(BRAND_CHIME_RISE, dur=1.0, amp=0.32, stagger=0.2), 2.6)
    mix_into(m, chime(BRAND_CHIME_LAND, dur=1.6, amp=0.38, stagger=0.09), 3.8)
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=2.0, amp=0.08, attack=0.5, release=1.0), 3.8)

    # ---- 6-24s: start-ride, calm and building ---------------------------
    mix_into(m, note(65.41, dur=4.0, amp=0.07, attack=1.0, release=1.3), 6.0)
    mix_into(m, pad(CMAJ9_PAD, dur=6.2, amp=0.09, attack=1.0, release=0.8), 8.0)
    mix_into(m, pulse_train(8.0, 13.8, bpm=88, total_dur=DURATION, amp=0.05, freq=150), 0.0)
    mix_into(m, chime(YELLOW_TONE, dur=0.8, amp=0.2, stagger=0.0), 13.9)
    mix_into(m, pad(AM7_PAD, dur=10.2, amp=0.11, attack=0.6, release=1.0), 14.0)
    mix_into(m, arpeggio(AM7_ARP, 14.2, 23.9, bpm=98, total_dur=DURATION, amp=0.13), 0.0)

    # ---- 24-32s: gates-saving, the coloured route reveal ----------------
    mix_into(m, pad(FMAJ7_PAD, dur=3.2, amp=0.12, attack=0.3, release=0.6), 24.0)
    mix_into(m, arpeggio(FMAJ7_ARP, 24.1, 26.9, bpm=108, total_dur=DURATION, amp=0.14), 0.0)
    mix_into(m, chime(GREEN_CHIME, dur=0.9, amp=0.32, stagger=0.08), 26.95)
    mix_into(m, pad(GADD9_PAD, dur=5.2, amp=0.13, attack=0.2, release=0.6), 27.0)
    mix_into(m, arpeggio(GADD9_ARP, 27.1, 31.9, bpm=120, total_dur=DURATION, amp=0.15), 0.0)
    mix_into(m, chime(PURPLE_CHIME, dur=1.0, amp=0.4, stagger=0.08), 31.9)

    # ---- 32-34s: hold on the finished route -----------------------------
    mix_into(m, pad(CMAJ_RESOLVE, dur=2.2, amp=0.13, attack=0.4, release=1.2), 32.0)
    for i, f in enumerate([NOTES["G5"], NOTES["E5"]]):
        mix_into(m, pluck(f, dur=1.4, amp=0.05, brightness=0.7), 32.6 + i * 0.35)

    # ---- 34-40s: ranking ------------------------------------------------
    mix_into(m, pad(CMAJ9_PAD, dur=3.2, amp=0.1, attack=0.5, release=0.6), 34.0)
    mix_into(m, arpeggio(CMAJ9_ARP, 34.2, 37.9, bpm=100, total_dur=DURATION, amp=0.12), 0.0)
    mix_into(m, chime(PURPLE_CHIME, dur=1.2, amp=0.36, stagger=0.08), 37.9)
    mix_into(m, pad(GADD9_PAD, dur=2.2, amp=0.12, attack=0.1, release=1.0), 37.9)
    mix_into(m, pad(CMAJ_RESOLVE, dur=2.0, amp=0.1, attack=0.6, release=1.2), 39.7)

    # ---- 40-46.9s: closing brand -----------------------------------------
    mix_into(m, pad([NOTES["C2"]], dur=2.0, amp=0.04, attack=0.6, release=0.8), 40.0)
    mix_into(m, chime(BRAND_CHIME_LAND, dur=2.4, amp=0.3, stagger=0.12), 41.4)
    mix_into(m, pad([NOTES["C3"], NOTES["G3"], NOTES["C4"]], dur=4.5, amp=0.08, attack=0.6, release=2.2), 41.4)

    return finish(m, DURATION, wet=0.26, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v1.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v1.wav", len(audio) / SR, "s")
