# teaser — round v9 (built, confirmed)

**Built and confirmed** (2026-09-23, cycle 17): `teaser_v9.mp4` built by ffmpeg stream-copy concat
(`concat.txt` here, relative paths); ffprobe reads 47.600000 s / 1428 frames, one h264 video
stream, no audio, 1920x1080, 30 fps.

## What changed since v8

- gates-saving `v6` -> **`v9`** (three rounds: cycle 9's render-remake v6 -> cycle 14's surge
  pacing v8 -> cycle 17's inverted easing v9 — the teaser never carried v7/v8). The rider now
  slows at each gate and speeds up between them.
- ranking `v7` -> `v8` and closing `v4` -> `v5` are byte-identical re-issues (no visual change).
- opening and start-ride unchanged.

Proof: the teaser frames at 26.31 s and 27.23 s equal `gates-saving/rounds/v9/frame_5_81s.png`
and `frame_6_73s.png` (mean absolute difference 0.0). The video packets of the unchanged
sections (0–6.5 s, 6.5–20.5 s, 32.8–43.6 s, 43.6–47.6 s) are md5-identical to v8's.

## Known gaps

No with-sound teaser exists (applying cycle 16's ride and opening sounds to this cut is a later
follow-up, cycle 16 item D section 7).

## Nathan's feedback

<!-- write your notes below -->
