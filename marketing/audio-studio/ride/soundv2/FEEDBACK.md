# ride — soundv2 — Round 2 (Tunetank bed)

**Render file:** `ride_master_v2.wav` (built); `ride_v2.mp4` (built — confirmed via ffprobe at
exactly 26.300000s). **Source:** `../ride_tunetank.py`.

*(2026-09-23, cycle 17: `concat.txt` re-pointed from absolute `/sessions/...` paths to repo-relative ones; the
gates-saving half is now referenced from its round folder because `all-renders/` moved on to v9.
The mp4s here are unchanged.)*

## What this is

Nathan (cycle 16): "It should start only after the click, when the actual ride starts … the
sound fades out exactly when the rides zoom out for gates saving … then the sound should
start playing again for the second ride, for which we can add on top only the 'second track,
of the interstellar notes we already have just to punctuate the gates'."

His stock track (`../../piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3`,
15.047 s, stereo) is placed twice on the combined clock:

- ride 1: file t = 0 at `T1 = 3.80` s (play pressed while the START box fades out, 3.55–4.00 s,
  per Nathan's Q1 answer; the one constant he can nudge with the alignment tool). Attack
  (`ATTACK = 1.26` s into the file) lands at 5.06 s, the file's own decrescendo begins at 14.90 s.
- ride 2: file t = 0 at `T2 = 17.80 − ATTACK = 16.54` s, so the first full-scale transient
  lands on the ride-2 start pulse (17.80 s); 1.0 s linear fade ending at 26.3 s.

E5 layer: `ride_master.py`'s five pulses (17.80 / 19.81 / 21.65 / 23.51 / 25.38), imported, not
copied, faded 0.5 s to 26.3 like soundv1's master. Gains: `GAIN_BED = 0.45`, E5 `GAIN = 1.5`.

**Licence:** per Nathan, 2026-09-23 — free, usable without copyright issues.

## Previous round

[`../soundv1/FEEDBACK.md`](../soundv1/FEEDBACK.md) — the synthesised round, kept on disk for reference.

## The schedule (verbatim `ride_tunetank.py` output)

```
bed decoded: 663552 frames (15.0465 s), peak 1.0435 (0.37 dBFS)
placements: T1 3.800 -> sample 167580 ; T2 16.540 -> sample 729414 (attack lands at 17.800)
layer bed peak 0.4803 (-6.37 dBFS)
e5 scheduled tau (5 notes): [17.8, 19.81, 21.65, 23.51, 25.38]
peak 0.335 (-9.5 dBFS)
layer e5 peak 0.5025 (-5.98 dBFS)
master peak 0.8520 (-1.39 dBFS) at 17.871 s -- no scaling needed
wrote marketing/audio-studio/ride/soundv2/ride_master_v2.wav 1159830 frames
wrote slice start-ride/soundv9/soundtrack_v9.wav 617400 frames
wrote slice gates-saving/soundv10/soundtrack_v10.wav 542430 frames
```

## Verified

Verbatim `check_tunetank.py` output:

```
frames master/start-ride/gates-saving: 1159830 617400 542430 (expect 1159830 617400 542430)
slice parity: True True (expect True True)
master peak 0.8520 (-1.39 dBFS) at 17.871 s (expect 0.8520 / -1.39 / 17.871; must be <= -1.00 dBFS)
RMS windows (dBFS):
   0.00- 3.80  -240.0
   3.80- 4.60   -51.7
   5.00- 5.20   -16.2
   5.30- 5.50   -17.5
  13.50-14.00   -17.4
  14.00-14.50   -17.3
  14.50-15.00   -17.1
  15.00-15.50   -22.1
  15.50-16.00   -27.3
  16.50-17.00   -35.6
  17.00-17.50   -38.6
  17.50-17.80   -28.7
  17.80-18.00   -10.9
  25.30-25.50   -12.7
  26.00-26.20   -29.8
  26.25-26.30   -46.1
last frame |x|: 0.000000 (expect 0.000000)
ride-1 attack: first 20ms window > -15 dBFS after 3.80 at 5.08 (expect 5.08)
ride-2 attack: first 20ms window > -15 dBFS after 16.54 at 17.82 (expect 17.82)
ride-1 tail: first 20ms window < -25 dBFS after 14.00 at 15.44 (expect 15.44)
E5 jump (60ms after pulse+30ms vs 60ms before), dB: [14.3, 8.0, 7.4, 6.1, 5.1] (expect [14.3, 8.0, 7.4, 6.1, 5.1]; every value > 3)
```

ffprobe (duration | audio codec,channels), run from `marketing/audio-studio`:

```
start-ride/soundv9/start-ride_v4_with_sound_v9.mp4: 14.000000 | aac,2
gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4: 12.300000 | aac,2
ride/soundv2/ride_v2_silent.mp4: 26.300000 |
ride/soundv2/ride_v2.mp4: 26.300000 | aac,2
```

## Known, benign timing offset

The ~28 ms Salamander lead described in [`../soundv1/FEEDBACK.md`](../soundv1/FEEDBACK.md)
("Known, benign timing offset") applies to the E5 layer here too; the Tunetank bed has none.

## What to listen for

- The attack at 5.06 s against the rider starting to move at 5.30 s.
- The decrescendo beginning at 14.90 s against gates-saving's zoom-out (14.0–15.0 s).
- The empty overgang, roughly 15.4–17.8 s (only the tail rings and the second placement's quiet head).
- The attack landing on the ride-2 start pulse at 17.80 s.
- The five E5 pulses over the bed.
- The 1.0 s end fade to 26.3 s.

## Questions

See `../../../cycles/16_ride-tunetank-soundtrack/questionsfornathan.md`.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
