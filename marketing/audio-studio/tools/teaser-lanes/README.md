# teaser-lanes: sound lanes for the silent teaser (cycle 19; multi-video kit picker, cycle 22)

One page, `teaser-lanes.html`. Whichever kit is loaded plays on the LEFT (time and frame readout, transport, clip
editor under it); nine long sound lanes sit on the RIGHT, one red playhead through all. Two kits ship:
`kit-teaser-full/` (teaser-full v1, 47.3 s / 1419 frames — **default**) and `kit/` (teaser v9, 47.6 s / 1428 frames,
the old concat teaser). It plays live and writes no audio; what comes out is a plain-words clip list you paste into
chat, plus a small arrangement file if you press Save arrangement. Chrome or Edge only.

## Use it (Nathan)
1. Two ways to open it: **(a)** double-click `teaser-lanes.html`, press **Open kit folder** and choose
   `kit-teaser-full/` (or `kit/`), or drop the folder on the page; **(b)** run `serve.ps1` — the page opens at
   localhost:8765, loads the default kit by itself, and the header menu switches kits (the last pick you make is
   remembered in that browser). In served mode, a kit file the server cannot find is shown as a missing lane, same
   as a picked folder that lacks it; only `manifest.json` itself is required to load the kit at all.
2. Space plays/pauses. Left/Right step one frame (Shift: ten), Home/End first/last frame. Type `24.3` or `f729` in the go-to box.
3. Each lane is one sound (logo, bed, strings A, other A, piano B, drums B, bass B, other B, E5 pulses). **M** mutes, **S** solos, **+** adds a clip at the playhead.
4. Two clocks: the render clock is under the video; each lane header shows its own source clock (`src`). Where two clips of one lane overlap, both are shown, left to right in start order (`src 14.000 | 1.260`).
5. A shaded block is a clip: "play source in-out of this sound from render start". Click a block, type numbers in the editor, Enter applies.
   Example: strings A source 0-10 at render 44 -> `+` at 44, set `out` 10 -> `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 1)`.
6. **Copy list** gives one line per clip; paste it into chat. Clips and mutes are remembered in this browser; **Reset to defaults** restores today's teaser sound. Nothing is written to disk except the file **Save arrangement** downloads (step 8).
7. Zoom keys 1-4 = All / 10 s / 2 s / 0.5 s (0.5 s shows every frame). Lanes A and B are two splits of the same bed: unmute one split OR the bed, not both.
8. **Save arrangement** downloads your clips and mutes as a small .json file; keep it in `teaser/arrangements/<version>/`. **Open arrangement** (or dropping the file on the page) opens such a file, or a pasted clip list saved as .txt, and replaces what is on the lanes; **Undo** in the status line brings the previous clips back.

Below 1100 px wide the page stacks (video on top) and scrolls. It will not: edit or export audio, drag clips (numbers only), work in Firefox.

## Prepare the kit (one time; the coordinator or Nathan)
`cd marketing/audio-studio/tools/teaser-lanes && python prep_kit.py [teaser_v9|teaser-full_v1]` (default
`teaser-full_v1`; python3, numpy, ffmpeg/ffprobe on PATH). It copies the chosen source video into a short-GOP proxy,
decodes the sound sources to 32-bit float WAV, renders the five E5 pulses into `e5.wav`, checks the chain against
`ride/soundv2/ride_master_v2.wav`, checks the stems' alignment, and writes `<kit_dir>/manifest.json` and
`<kit_dir>/prep-report.txt` (`kit_dir` is `kit-teaser-full/` for `teaser-full_v1`, `kit/` for `teaser_v9`). Both kit
folders are git-ignored and each is about 57 MB; either can be rebuilt in about a minute.

## Default arrangement of kit-teaser-full (provisional)
The new kit's default clips are the same shipped ride soundtrack chain as `kit/`, re-anchored to teaser-full's own
scene offset (start-ride begins at 6.2 s instead of 6.5 s): logo 0–6.2 s, bed + the six stems at 10.0 s and 22.74 s,
E5 pulses at 24.0 s. This is a neutral placeholder, not a resolution of cycle 20's rides A/B pick (still open) — the
two option files' header fields were re-stamped for teaser-full in cycle 22 (clips, mutes and notes untouched), so
either opens on this kit with no "made for a different video" note; their −0.3 s cascade already fits this picture.

## Test it (coordinator)
| what | command | where |
|---|---|---|
| core functions + file hygiene (218 + cycle-22 cases) | `node teaser-lanes.test.mjs` | anywhere with node >= 20 |
| offline mix of the default clips vs the shipped soundtracks (`kit/` only, not adapted for `kit-teaser-full/`) | `python3 verify_default_mix.py` | PC/VM, needs `kit/` |
| browser run on a synthetic kit (390 checks, screenshots) | `node tests/synthetic-kit.mjs <dir>` then `node tests/e2e.mjs <dir> [outDir]` | cloud container: Playwright 1.56 + Chromium at the paths named in the scripts |
| browser run on a copy of a real kit, expectations keyed by `manifest.kit` (86 checks for `kit/`, 69 for `kit-teaser-full/`) | `node tests/e2e-real.mjs <dir with the 9 wavs + manifest + a video.webm matching the kit's frames/duration>` | cloud container |
| served-mode auto-load + kit picker over a local static server (18 checks) | `node tests/synthetic-kit.mjs <dir> && node tests/e2e-served.mjs <dir> [outDir]` | cloud container |
| convert a clip list or arrangement to .json | `node tests/convert-arrangement.mjs <in.txt> kit/manifest.json <out.json> "<created>" "<note>"` | anywhere with node >= 20 |
| mutation check for the open/save arrangement feature (20 mutants) | `node tests/synthetic-kit.mjs tests/out/synkit && node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` | anywhere with node >= 20 |

## Known limits and open points
- Nothing here has been listened to; all checks are measurements, screenshots and browser-automation runs.
- Kit WAVs are 32-bit float so the few hundred mp3-decode samples above 0 dBFS reach the mix unclipped, as in the build scripts; verify_default_mix.py (a) is within 1 LSB of ride_master_v2.wav (limit 4).
- Real-time play is right to about one frame on wired output, worse on Bluetooth; stepping and scrubbing are exact by construction.
- An arrangement file stores clips and M mutes only (solo is listening, not saved); opening one replaces the lanes (one-step Undo).

## Only Nathan can verify (his own Chrome/Edge on Windows)
- The page opens by double-click and the folder picker works; dropping the folder works.
- The h264 video decodes and plays there for both kits (the cloud test used VP9 webm stand-ins).
- `serve.ps1`: Python on PATH, port 8765 free, the browser opens and the default kit auto-loads; switching kits in
  the header menu; that the last-picked kit is remembered on reload.
- Real-time video/audio feel; the scrub sound while stepping; Bluetooth latency.
- Legibility of fonts and small text on Windows at his screen sizes.
- That kit-teaser-full's default state sounds like the shipped ride sound, shifted to the new picture.
- Opening cycle 20's option-A/option-B files on the new kit: no "made for a different video" note appears (they were
  re-stamped for teaser-full in cycle 22) and the timing looks right.
- Dropping a .json/.txt arrangement file on the page (the cloud test used a synthetic drop event).
