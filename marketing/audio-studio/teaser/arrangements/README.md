# teaser arrangements

Plans for where each sound goes on the teaser, one folder per version (`arrangement_v1/`, ...), made by hand in `../../tools/teaser-lanes/`
(press Copy list, paste into chat). An arrangement is a PLAN: a list of clips, one line each.
No audio has been built from any of them; a built round would be a later `../soundvN/` folder
that says which arrangement it came from.

## How to read a line

`lane: source A-B s -> render C-D s (gain, fades, muted)`

- source = that sound's own clock (0 = start of the file); render = the teaser video's clock (0-47.6 s).
- So `strings: source 0-10 -> render 44-54` means: play the first 10 s of the strings sound, starting at 44 s of the video.
- Lanes: logo = opening piano logo; bed = the full emotional-classical track; a-strings / a-other = split A (strings model);
  b-piano / b-drums / b-bass / b-other = split B (6-stem model); e5 = the five gate-pulse piano notes.
  A and B are two splits of the same bed, so the bed plus its own stems play the same music twice.

## Versions

| file | made | what |
|---|---|---|
| `arrangement_v1/arrangement_v1.txt` | 2026-09-24 | Nathan's first hand-tweaked arrangement, pasted verbatim (nothing edited). |
| `arrangement_v1/IDEA-v1.md` | 2026-09-24 | Nathan's intent in his own words (to fill in). |
| `arrangement_v1/FEEDBACK-v1.md` | not written yet | Claude's feedback, written after IDEA-v1.md is filled in. |

## Notes on v1 (folder `arrangement_v1/`)

- Video the tool was showing: `teaser_v9-proxy.mp4`, a look-only re-encode of `teaser_v9.mp4`, same 1428 frames and timing.
- Clips that run past the end of the video (`a-strings` 35.000-50.047, `b-piano` 35.000-50.000, `b-bass` 35.000-50.047) would be cut at 47.6 s; `b-drums` ends at 41.547.
- `muted` = the state of that lane's M switch (or a solo elsewhere) in the tool when the list was copied. It is NOT yet confirmed to mean "leave that clip out".
  Until Nathan says so in IDEA-v1.md, treat muted lines as "present in the tool, silent while listening".
- Nothing here has been listened to by Claude.
