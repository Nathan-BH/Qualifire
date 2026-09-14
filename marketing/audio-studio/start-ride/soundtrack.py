"""
start-ride - soundv2

Source: start-ride_v4.mp4, 14.0s, 1920x1080, no audio (unchanged from soundv1
- this round only touches the audio, not the picture).
Visual (re-read directly from ../../silent-studio/start-ride/index.html's actual
timeline, not from sampled frames this time): 0.0-0.4s black hold, 0.4-1.0s
reveal, START button fades in at 1.2s, virtual cursor glides onto it and
presses it at 3.2s (button scales down 3.2-3.35, back up 3.35-3.55, both
button+cursor fade out by 4.0s), camera pushes in 3.8-5.1s, caption "Ride
your normal route." fades in at 4.6s, the route then draws behind the rider
at constant speed from 5.3-13.8s, holding at the finish to 14.0s.

Nathan's soundv1 feedback (three items):
1) "No sound before clicking the button." -> true silence from 0 to the
   click at 3.2s (soundv1 had a low tone from 0.0-4.0s; that's gone).
2) "upon clicking add a clicking sound" -> a punchy click() lands exactly at
   3.2s, synced to the button's press.
3) "more upbeat music during the ride, not this mellow piano. More something
   like how a mario kart soundtrack would be during a race?" -> the old
   Cmaj9->Am7 pad-and-arpeggio (a calm, held-back build) is replaced with a
   driving four-chord loop (C - G - Am - F, the shared chord tones already
   in synth.py) at a fast 155bpm eighth-note arpeggio plus a light rhythmic
   "kick" pulse underneath - a bright, game-y, racing feel instead of a
   mellow one, for the full 5.3-13.8s draw.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime, click, riser,
    CMAJ9_ARP, GADD9_ARP, AM7_ARP, FMAJ7_ARP, CMAJ_RESOLVE,
)

DURATION = 14.0


def build():
    m = new_master(DURATION)

    # 0.0-3.2s: true silence - nothing plays before the button is clicked.

    # 3.2s: the click, synced exactly to the button's press.
    mix_into(m, click(freq=150, amp=0.6, dur=0.14), 3.2)

    # 3.4-5.3s: a small riser bridges the click into the camera push-in and
    # caption, so the ride doesn't start from a second dead silence - quiet,
    # just enough momentum leading in.
    mix_into(m, riser(dur=1.7, amp=0.12), 3.6)

    # 5.3-13.8s: the ride - a driving four-chord loop (C-G-Am-F, ~2.1s each),
    # fast eighth-note arpeggio (155bpm) plus a light rhythmic pulse under it,
    # bright and game-like instead of the old mellow single-chord build.
    CHORDS = [
        (CMAJ9_ARP, 5.30, 7.425),
        (GADD9_ARP, 7.425, 9.55),
        (AM7_ARP, 9.55, 11.675),
        (FMAJ7_ARP, 11.675, 13.8),
    ]
    for tones, start, end in CHORDS:
        mix_into(m, arpeggio(tones, start, end, bpm=155, total_dur=DURATION, amp=0.20), 0.0)
    mix_into(m, pulse_train(5.30, 13.8, bpm=155, total_dur=DURATION, amp=0.11, freq=92, decay=0.07), 0.0)

    # 13.8s: a quick bright resolve as the ride finishes and holds - a small
    # "finish line" flourish rather than the old build-with-no-resolve.
    mix_into(m, chime(CMAJ_RESOLVE, dur=0.6, amp=0.34, stagger=0.0), 13.8)

    return finish(m, DURATION, wet=0.22, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
