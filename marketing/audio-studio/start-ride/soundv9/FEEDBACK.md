# start-ride — soundv9

Slice [0–14.0s] of `../../ride/soundv2/ride_master_v2.wav` (stereo), Nathan's Tunetank track
from 3.80 s (play pressed while the START box fades out) with no synthesised layers. Judge the
join in `../../ride/soundv2/ride_v2.mp4` (built, confirmed 26.300000s via ffprobe). This file
exists so the scene's own round table stays complete; it is the first 14.0s of the ride master,
byte-identical to it (`numpy.array_equal` confirmed by `check_tunetank.py`: slice parity True).

- The attack lands at 5.06 s (5.08 on the 20 ms grid), seven frames before the rider moves at 5.30 s.
- The decrescendo begins at 14.9 s: it is the file's own and carries into gates-saving.
- Slice parity: 617,400 samples, equal to the master's first 617,400.

**Licence:** per Nathan, 2026-09-23 — free, usable without copyright issues.

**Render:** `start-ride_v4_with_sound_v9.mp4` — built. Confirmed via ffprobe at exactly 14.000000s (aac, 2 channels).

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
