# ride — soundv3 — Round 3 (re-mux of the round-2 master onto the cycle-17 picture)

**Render file:** `ride_v1_with_sound_v3.mp4` — `../../../silent-studio/all-renders/ride_v1.mp4`
(start-ride_v4 + gates-saving_v9, 26.3 s) + `../soundv2/ride_master_v2.wav` (md5
`49a3b66eff66b74ac75e27c9f5d8df83`, unchanged; no WAV copied here).
**Source:** `../ride_tunetank.py` (not re-run; `T1 = 3.80`, `T2 = 16.54`, gains 0.45 / 1.5 as in soundv2).
**Built:** 2026-09-23 (cycle 17, item C), `ffmpeg -c:v copy -c:a aac -b:a 192k -shortest`.
**Previous round:** [`../soundv2/FEEDBACK.md`](../soundv2/FEEDBACK.md).

## What changed since soundv2

The picture only: gates-saving's easing inverted (slow at the gates, fast between); start-ride
unchanged. The sound is byte-for-byte soundv2's.

## What to watch / listen for

The second ride's gates at 19.81 / 21.65 / 23.51 s with the rider now *slow* on each pulse.
`T1` is still Nathan's to nudge with the alignment tool (`../../tools/av-align/av-align.html`, whose ride
preset now names `ride_v1.mp4`).

## Verified

- `ffprobe`: h264 video 789 frames + aac audio stereo 44100 Hz (1132 packets), duration 26.300000 s.
- Video packets md5 equal to `silent-studio/all-renders/ride_v1.mp4`: `9196647a2f9cd8b79dacaa3cca723d67`.
- Audio packets md5 equal to `../soundv2/ride_v2.mp4`'s: `bb700d370cd57309f0bf9f894534a6f2`.
- E5 lift (60 ms after pulse+30 ms vs 60 ms before) at 17.80 / 19.81 / 21.65 / 23.51 / 25.38 s, decoded from this mp4: `[14.0, 8.0, 7.4, 6.1, 5.1]` dB (expect `[14.3, 8.0, 7.4, 6.1, 5.1]` +-0.5).
- Nothing was listened to.

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
