"""
teaser — soundv2

Source: teaser_v6.mp4, 47.6s, 1920x1080, no audio (confirmed by an actual
render 2026-09-14 — was teaser_v5.mp4, 46.9s, in soundv1).

Still an independent composition, not a concatenation of the other scenes'
soundtracks (per Nathan's original steer for the teaser) — but this round
it deliberately echoes the *actual current* per-scene motifs at the *actual*
right moments, because teaser_v6 (unlike v1-era teasers) is a literal
back-to-back concat of five complete, unmodified scene renders. That means
every section's internal timing here lines up exactly 1:1 with that scene's
own standalone soundtrack, just offset by the section's start time — so the
brand stinger, the boosted ride, and the droplet crescendo below all land
at the same instants they do in each scene's own soundv2/v3, not just "in
spirit."

Exact section boundaries (confirmed against the real render):
  0.0  -  6.5   brandmark/opening   (opening_v3.mp4, unchanged)
  6.5  - 20.5   start-ride          (start-ride_v4.mp4, unchanged)
  20.5 - 32.8   gates-saving        (gates-saving_v5.mp4 — new gate-draw visual, same 12.3s timing)
  32.8 - 43.6   ranking             (ranking_v5.mp4 — new "Today climbs the tower", 10.8s)
  43.6 - 47.6   brandmark/closing   (closing_v3.mp4 — new tight reveal, 4.0s)

One continuous C-major-family chord arc runs underneath all of it (same
shared vocabulary as every other scene) so the piece still reads as one
build, even though each section's foreground motif now matches its scene.
"""
import sys
sys.path.insert(0, "..")
from synth import (
    SR, new_master, mix_into, finish, pad, arpeggio, pulse_train, chime, note, pluck,
    sweep, sub_hit, droplet_run, whoosh, riser, click,
    NOTES, BRAND_STINGER_LOW, BRAND_STINGER_HIGH,
    CMAJ9_PAD, CMAJ9_ARP, AM7_PAD, AM7_ARP, FMAJ7_PAD, FMAJ7_ARP,
    GADD9_PAD, GADD9_ARP, CMAJ_RESOLVE,
    YELLOW_TONE, GREEN_CHIME, PURPLE_CHIME,
)

DURATION = 47.6


def build():
    m = new_master(DURATION)

    # ---- 0.0-6.5s: opening brand — mirrors brandmark/opening/soundv2 -----
    mix_into(m, pad([NOTES["C2"]], dur=3.0, amp=0.05, attack=1.2, release=0.8), 0.0)
    mix_into(m, sweep(220, 660, dur=1.3, amp=0.18), 0.0)                       # ring-draw
    mix_into(m, whoosh(dur=0.55, amp=0.22), 1.3)                              # slash/gate
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=1.15, amp=0.06, attack=0.3, release=0.5), 1.8)
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.3, amp=0.42), 2.95)          # beat 1
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=1.6, amp=0.34, stagger=0.09), 3.35)  # beat 2
    mix_into(m, pad([NOTES["C3"], NOTES["G3"]], dur=3.2, amp=0.06, attack=0.5, release=1.5), 3.8)

    # ---- 6.5-20.5s: start-ride — silence, click, driving C-G-Am-F loop ---
    # A faint trailing tail from the opening chord carries through the hush
    # rather than true zero amplitude (a deliberate compromise for a
    # continuous piece — see this round's FEEDBACK.md).
    mix_into(m, pad([NOTES["C3"]], dur=3.0, amp=0.02, attack=0.5, release=2.0), 6.6)
    mix_into(m, click(freq=150, amp=0.42, dur=0.14), 9.7)                     # button press
    mix_into(m, riser(dur=1.7, amp=0.11), 10.1)
    _CHORD_LOOP = [CMAJ9_ARP, GADD9_ARP, AM7_ARP, FMAJ7_ARP]
    _seg = 8.5 / 4.0
    for i, chord in enumerate(_CHORD_LOOP):
        s = 11.8 + i * _seg
        mix_into(m, arpeggio(chord, s, s + _seg, bpm=155, total_dur=DURATION, amp=0.15), 0.0)
    mix_into(m, pulse_train(11.8, 20.3, bpm=155, total_dur=DURATION, amp=0.09, freq=92, decay=0.07), 0.0)

    # ---- 20.5-32.8s: gates-saving — whoosh + start-ride's loop, boosted --
    mix_into(m, whoosh(dur=1.0, amp=0.26), 20.5)
    mix_into(m, pad(CMAJ9_PAD, dur=3.5, amp=0.09, attack=0.3, release=0.6), 21.55)
    _ride0, _ride_dur = 25.3, 6.9
    _gate_t = [_ride0 + f * _ride_dur for f in (0.0, 0.24, 0.63, 0.84, 1.0)]
    _tempos = [165, 180, 195, 210]
    for i, chord in enumerate(_CHORD_LOOP):
        mix_into(m, arpeggio(chord, _gate_t[i], _gate_t[i + 1], bpm=_tempos[i], total_dur=DURATION, amp=0.16), 0.0)
    mix_into(m, chime(GREEN_CHIME, dur=0.5, amp=0.22, stagger=0.06), _gate_t[1])
    mix_into(m, chime(YELLOW_TONE * 2, dur=0.4, amp=0.2, stagger=0.05), _gate_t[2])
    mix_into(m, chime(PURPLE_CHIME, dur=0.6, amp=0.28, stagger=0.06), _gate_t[3])
    mix_into(m, chime(CMAJ_RESOLVE, dur=1.0, amp=0.26, stagger=0.06), 32.2)

    # ---- 32.8-43.6s: ranking — quiet hold, droplet crescendo, purple land
    mix_into(m, pad(CMAJ9_PAD, dur=3.0, amp=0.09, attack=0.5, release=0.6), 32.8)
    mix_into(m, droplet_run(NOTES["A3"], NOTES["G5"] * 1.26, n=9, t0=36.0, t1=38.05, amp=0.26), 0.0)
    mix_into(m, chime(PURPLE_CHIME, dur=1.2, amp=0.34, stagger=0.08), 38.2)
    mix_into(m, pad(GADD9_PAD, dur=2.4, amp=0.1, attack=0.1, release=1.0), 38.2)
    mix_into(m, pad(CMAJ_RESOLVE, dur=5.0, amp=0.07, attack=0.6, release=2.5), 38.7)

    # ---- 43.6-47.6s: closing brand — full two-beat BRAND_STINGER reprise -
    mix_into(m, sub_hit(BRAND_STINGER_LOW, dur=1.4, amp=0.42), 43.6)          # beat 1
    mix_into(m, chime(BRAND_STINGER_HIGH, dur=2.2, amp=0.32, stagger=0.10), 43.95)  # beat 2
    mix_into(m, pad([NOTES["C3"], NOTES["G3"], NOTES["C4"]], dur=3.3, amp=0.07, attack=0.6, release=2.2), 44.3)

    return finish(m, DURATION, wet=0.26, soften_passes=1)


if __name__ == "__main__":
    import numpy as np
    from scipy.io import wavfile
    audio = build()
    wavfile.write("soundtrack_v2.wav", SR, (audio * 32767).astype(np.int16))
    print("wrote soundtrack_v2.wav", len(audio) / SR, "s")
