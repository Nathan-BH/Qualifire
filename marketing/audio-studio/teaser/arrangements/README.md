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

## Open one in the tool

In `../../tools/teaser-lanes/teaser-lanes.html`, open the kit, then press **Open arrangement** and pick the folder's `.json` (or the `.txt`; both work) — or drop the file on the page. **Save arrangement** downloads a new `arrangement_YYYYMMDD-HHMM.json`; move it into a new `arrangement_vN/` folder here.

## Versions

| file | made | what |
|---|---|---|
| `arrangement_v1/arrangement_v1.txt` | 2026-09-24 | Nathan's first hand-tweaked arrangement, pasted verbatim (nothing edited). |
| `arrangement_v1/arrangement_v1.json` | 2026-09-24 | The same arrangement as a file the tool opens (Open arrangement); made from the .txt by `tools/teaser-lanes/tests/convert-arrangement.mjs`, nothing edited. |
| `arrangement_v1/IDEA-v1.md` | 2026-09-24 | Nathan's intent in his own words (to fill in). |
| `arrangement_v1/FEEDBACK-v1.md` | not written yet | Claude's feedback, written after IDEA-v1.md is filled in. |
| `arrangement_v2/arrangement_v2.json` | 2026-09-26 | Synthesized in chat from IDEA-v1/FEEDBACK-v1's piano-spine plan + Nathan's direct A-vs-B listening call (option A's fuller drums/bass/other over option B's isolated strings) + a bug fix (option A had a real silence gap ~31.3-33.9s; this uses a continuous piano loop through that stretch instead). Ships as **kitv3's actual default** (not just an Open-arrangement file) via `prep_kit.py`'s new `default_arrangement` override -- see the JSON's own `note` field for full characteristics. |

## Notes on v1 (folder `arrangement_v1/`)

- Video the tool was showing: `teaser_v9-proxy.mp4`, a look-only re-encode of `teaser_v9.mp4`, same 1428 frames and timing.
- Clips that run past the end of the video (`a-strings` 35.000-50.047, `b-piano` 35.000-50.000, `b-bass` 35.000-50.047) would be cut at 47.6 s; `b-drums` ends at 41.547.
- `muted` = the state of that lane's M switch (or a solo elsewhere) in the tool when the list was copied. It is NOT yet confirmed to mean "leave that clip out".
  Until Nathan says so in IDEA-v1.md, treat muted lines as "present in the tool, silent while listening".
- `arrangement_v1.json` holds the same 13 clips; `15.047` s source ends are stored as `15.0465` (the exact file length; the list rounds it to 15.047).
- Nothing here has been listened to by Claude.
