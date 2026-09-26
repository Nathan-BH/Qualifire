# start-ride — soundv8

Slice [0–14.0s] of `../../ride/soundv1/ride_master_v1.wav`, rendered with Salamander —
judge the join in `../../ride/soundv1/ride_v1.mp4` (built, confirmed 26.300000s via ffprobe). This file
exists so the scene's own round table stays complete; it is not a new mix, just the
first 14.0s of the ride master, byte-identical to it (`numpy.array_equal` confirmed).

Musically this is the same content as soundv7 (bass + voice_a, same events, same
timing) — only the engine changed (Salamander instead of FluidSynth) and the piece is
now rendered as the head of a longer, looping master instead of a standalone 15.04s
file. Onset positions (5.62/7.45/9.34/11.25/13.19) sit within a few ms of soundv7's own
scan (5.60/7.43/9.31/11.22/13.16) — same notes, same positions.

**Render:** `start-ride_v4_with_sound_v8.mp4` — built. Confirmed via ffprobe at
exactly 14.000000s, matching plan exactly.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
