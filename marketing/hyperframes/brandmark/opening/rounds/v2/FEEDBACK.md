# 01 — Opening — Round v2

**Render file:** opening_v2.mp4 (not rendered yet)
**Duration (planned):** 5.500s (165 frames at 30fps, 1920x1080)
**Source:** ../../index.html — first HyperFrames render of this composition. (v1 was a cut of the old teaser's render, not a HyperFrames render of a standalone composition.)

## What changed since v1
- Split out: the opening now has its own composition source (`brandmark/opening/index.html`),
  no longer a cut of `../../teaser/index.html`.
- Nathan's v1 feedback — the mark fading out and the QUALIFIRE wordmark/tagline fading in
  overlapped (a ~0.3s ghost of the ring visible over the "LI" of QUALIFIRE). v2 spaces them
  apart: mark-out 2.0–2.45 (fully gone, no cross-fade), a 0.35s beat of empty frame to 2.8,
  then wordmark-in 2.8–3.55.
- Composition duration grows from 5.0s to 5.5s (+0.5s) so the wordmark hold stays readable
  after moving its start later. Judgment call — flagging here since it changes the cut length;
  should be safe since the teaser v4 cut sheet re-measures durations anyway.

## What you'll see, in order
1. 0.0–1.3 — Ring draws clockwise.
2. 1.3–1.65 — Yellow tail completes the mark.
3. 1.65–2.0 — Mark holds.
4. 2.0–2.45 — Mark fades out completely, in place.
5. 2.45–2.8 — Empty frame (the spacing gap — new in v2).
6. 2.8–3.05 — QUALIFIRE wordmark fades in.
7. 3.05–3.55 — "Same road. New meaning." tagline fades in.
8. 3.55–5.1 — Hold.
9. 5.1–5.5 — Fade to black, hard-killed at the clip end.

## Render

Not rendered yet — the automated render pass couldn't run this session (device shell unavailable).

Render on the PC (PowerShell, from marketing\hyperframes\):
```
.\render.ps1 -Name brandmark\opening -Render
```
then copy the newest brandmark\opening\renders\*.mp4 to brandmark\opening\rounds\v2\opening_v2.mp4 and confirm 5.5 s:
```
ffprobe -v error -show_entries format=duration -of csv=p=0 brandmark\opening\rounds\v2\opening_v2.mp4
```

## Nathan's feedback
- whats good is the spacing gap empty frame implemented in the last round.
- what I want now is to have the fading in of the text more slowly.
- for example 1,2,3,4 are well paced (although I would actually draw the yellow line just a tat slower (now it looks like it appears, if it is a bit slower we can see it drawn)
- step 6 fading in is too fast I would slow it down
and then at step 9 I would slowly fade it out again
