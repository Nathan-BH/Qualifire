# ride — sound design (assembled track)

"ride" is the two product-scene rides (`start-ride` then `gates-saving`) heard as one
continuous soundtrack, not a HyperFrames composition of its own — since cycle 17
(2026-09-23) its silent picture lives in `../../silent-studio/ride/` (`ride_v1.mp4` =
start-ride_v4 + gates-saving_v9), assembled by concat like the teaser. It exists because
the teaser plays these two scenes back-to-back
(`../../silent-studio/teaser/rounds/v8/concat.txt`), so the audio should
be one performance across the cut, not two independently-faded clips.

**Combined clock:** start-ride owns video 0–14.0s, gates-saving 14.0–26.3s. Content
clock `c` (the note lists' own seconds) maps onto this by `tau = c + 5.3` — start-ride's
already-approved soundv7 placement, unchanged.

**Loop-point ruling (see `BRIEF-ride-loop-track.md` §1 for the full derivation):** the
piece loops with period `P = 15.43s`, not the file's raw 15.04s length — the extra
0.39s of rest keeps the last bar's length and the E5→E5 seam gap inside the piece's own
range (back-to-back looping would come up 8.7% short and read as a stumble). The master
is rendered from two iterations of the note list in a single pass (never by looping a
finished WAV), so every note decays naturally across the seam instead of clicking at a
file boundary.

**Engine:** Salamander (cycle 14) — `../salamander_render.py`, calibrated against the
FluidSynth reference peaks in `../piano/projects/interstellar/salamander_soundtrack.py`.
No A/B round (Nathan, Q1): this is the ride master's engine outright.

**Why the parts are sideways links, not nested.** `brandmark/`'s two sub-scenes
(`opening/`, `closing/`) live *under* the family folder because they only exist as part
of that family. `start-ride/` and `gates-saving/` are different: each already has 7–8
rounds of its own top-level history before "ride" existed, so nesting them here would
break every existing link and round number for no gain. This family README points
*sideways* at the existing scene folders instead — please keep it that way; if a future
reader is tempted to move them under `ride/`, don't.

| Part | Status | Feedback goes to |
|---|---|---|
| **complete ride** (this folder) | soundv3 — built (cycle 17 re-mux of the soundv2 Tunetank master onto the inverted-easing picture), awaiting Nathan's listen; soundv2 and soundv1 kept on disk for reference | [`soundv3/FEEDBACK.md`](soundv3/FEEDBACK.md) |
| [start-ride/](../start-ride/README.md) | soundv9 = slice 0–14.0s of the soundv2 master (soundv8 = the same slice of soundv1, kept) | [`../start-ride/soundv9/FEEDBACK.md`](../start-ride/soundv9/FEEDBACK.md) |
| [gates-saving/](../gates-saving/README.md) | soundv11 = soundv10's slice (14.0–26.3s of the soundv2 master) re-muxed onto gates-saving_v9 (cycle 17); soundv10 / soundv9 kept | [`../gates-saving/soundv11/FEEDBACK.md`](../gates-saving/soundv11/FEEDBACK.md) |

## Rounds

| Round | Render | Status |
|---|---|---|
| [soundv1](soundv1/FEEDBACK.md) | ride_v1.mp4 (silent concat + master) | Earlier round, kept on disk (direction changed to the Tunetank bed in soundv2, cycle 16). Built — confirmed via ffprobe at exactly 26.300000s, matching plan exactly |
| [soundv2](soundv2/FEEDBACK.md) | ride_v2.mp4 (silent concat + Tunetank master) | Built — 26.300000s via ffprobe; Nathan's Tunetank track placed twice (t=0 at 3.80 s, while the START box fades out, and at 16.54 s), E5 pulses on ride 2 only; see cycle 16 |
| [soundv3](soundv3/FEEDBACK.md) | ride_v1_with_sound_v3.mp4 (silent-studio ride_v1 + the soundv2 master, unchanged) | Built 2026-09-23 — 26.300000s via ffprobe; cycle 17 re-mux: gates-saving's easing inverted, pulse times unchanged. In `../all-renders/`. |

`ride_master.py` builds `soundv1/ride_master_v1.wav` and the two per-scene slices
(`../start-ride/soundv8/soundtrack_v8.wav`, `../gates-saving/soundv9/soundtrack_v9.wav`)
purely from the note-list data — no video needed for that step. Following Nathan's
render of `gates-saving_v8.mp4`
(`marketing/cycles/14_ride-loop-surge-and-salamander/COMMANDS.md` §2), the muxes
(`start-ride_v4_with_sound_v8.mp4` at 14.000000s, `gates-saving_v8_with_sound_v9.mp4`
at 12.300000s) and the standalone `ride_v1.mp4` (26.300000s) are now built — all
durations confirmed via ffprobe and matching plan exactly.

`ride_tunetank.py` builds soundv2: `soundv2/ride_master_v2.wav` (stereo, 16-bit, 44.1 kHz) and
the two per-scene slices (`../start-ride/soundv9/soundtrack_v9.wav`,
`../gates-saving/soundv10/soundtrack_v10.wav`) from Nathan's stock track
(`../piano/projects/tunetank-ride/sources/tunetank-emotional-classical-484234.mp3`,
decoded once with ffmpeg) placed twice on the combined clock, and it imports
`ride_master.py`'s E5 schedule for the five pulses over the second ride;
`ride_master.py` still builds soundv1 unchanged. `check_tunetank.py` verifies the outputs.
