# gates-saving — soundv11 (re-mux: same sound, new picture)

**Render:** `gates-saving_v9_with_sound_v11.mp4` — `../../../silent-studio/all-renders/gates-saving_v9.mp4`
(inverted gate easing, cycle 17 item B) + `../soundv10/soundtrack_v10.wav` (md5
`3c249e4b8bdae4ebc48e28285c1fb8d8`, unchanged — no WAV copied here).
**Script:** none run (`../../ride/ride_tunetank.py` still describes the sound; it was not re-run).
**Built:** 2026-09-23 (cycle 17, item C), `ffmpeg -c:v copy -c:a aac -b:a 192k -shortest`.
**Previous round:** `../soundv10/FEEDBACK.md`.

## What changed since soundv10

Only the picture: the rider now slows at each gate and speeds up between (item B, inverted gate
easing). The five E5 pulses fall on the same frames as before (3.80 / 5.81 / 7.65 / 9.51 / 11.38 s),
so the sound was not rebuilt and not a single audio sample changed.

## Verified

- `ffprobe`: h264 video 369 frames + aac audio stereo 44100 Hz, duration 12.300000 s.
- Video packets md5 (`-map 0:v -c copy -f md5`) equal to `silent-studio/all-renders/gates-saving_v9.mp4`: `c74737b1646049f58e187b72cb0616e9`.
- Audio packets md5 equal to `../soundv10/gates-saving_v8_with_sound_v10.mp4`'s: `4291dc54a8bbe60c4ec2459fe7dc439c` (same WAV, same encoder).
- Rider on the gate ticks at gates-saving frames 174 / 230 / 285 = ride frames 594 / 650 / 705 = 19.80 / 21.67 / 23.50 s (distance to tick 1.64 / 1.32 / 0.87 px, speed 2.18 / 2.28 / 2.31 px/frame), the same frames the pulses fall in.
- Nothing was listened to.

## What to listen for

Whether a pulse landing on a *slow* rider reads better than on a fast one (Nathan's request); the
~28 ms Salamander lead (unchanged). The whole ride is judged in `../../ride/soundv3/FEEDBACK.md`.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
