# teaser-lanes: sound lanes for the silent teaser (cycle 19)

One page, `teaser-lanes.html`. The silent teaser (`teaser_v9.mp4`, 47.6 s, 30 fps, 1428 frames) plays on the LEFT
(time and frame readout, transport, clip editor under it); nine long sound lanes sit on the RIGHT, one red playhead through all.
It plays live and writes no audio; the only output is a plain-words clip list you paste into chat. Chrome or Edge only.

## Use it (Nathan)
1. Double-click `teaser-lanes.html`. Press **Open kit folder** and choose `kit/` (or drop the folder on the page). Everything loads at once.
2. Space plays/pauses. Left/Right step one frame (Shift: ten), Home/End first/last frame. Type `24.3` or `f729` in the go-to box.
3. Each lane is one sound (logo, bed, strings A, other A, piano B, drums B, bass B, other B, E5 pulses). **M** mutes, **S** solos, **+** adds a clip at the playhead.
4. Two clocks: the render clock is under the video; each lane header shows its own source clock (`src`). Where two clips of one lane overlap, both are shown, left to right in start order (`src 14.000 | 1.260`).
5. A shaded block is a clip: "play source in-out of this sound from render start". Click a block, type numbers in the editor, Enter applies.
   Example: strings A source 0-10 at render 44 -> `+` at 44, set `out` 10 -> `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 1)`.
6. **Copy list** gives one line per clip; paste it into chat. Nothing is written to disk. Clips and mutes are remembered in this browser; **Reset to defaults** restores today's teaser sound.
7. Zoom keys 1-4 = All / 10 s / 2 s / 0.5 s (0.5 s shows every frame). Lanes A and B are two splits of the same bed: unmute one split OR the bed, not both.

Below 1100 px wide the page stacks (video on top) and scrolls. It will not: edit or export audio, drag clips (numbers only), work in Firefox.

## Prepare the kit (one time; the coordinator or Nathan)
`cd marketing/audio-studio/tools/teaser-lanes && python prep_kit.py` (python3, numpy, ffmpeg/ffprobe on PATH). It copies the video verbatim, decodes the
sound sources to 32-bit float WAV, renders the five E5 pulses into `e5.wav`, checks the chain against `ride/soundv2/ride_master_v2.wav`, checks the stems' alignment,
and writes `kit/manifest.json` (default clips = today's teaser sound) and `kit/prep-report.txt`. `kit/` is git-ignored and can be rebuilt in about a minute (about 55 MB).

## Test it (coordinator)
| what | command | where |
|---|---|---|
| core functions + file hygiene (142 cases) | `node teaser-lanes.test.mjs` | anywhere with node >= 20 |
| offline mix of the default clips vs the shipped soundtracks | `python3 verify_default_mix.py` | PC/VM, needs `kit/` |
| browser run on a synthetic kit (322 checks, screenshots) | `node tests/synthetic-kit.mjs <dir>` then `node tests/e2e.mjs <dir> [outDir]` | cloud container: Playwright 1.56 + Chromium at the paths named in the scripts |
| browser run on a copy of the real kit (69 checks) | `node tests/e2e-real.mjs <dir with the 9 wavs + manifest + a 47.6 s video.webm>` | cloud container |

## Known limits and open points
- Nothing here has been listened to; all checks are measurements, screenshots and browser-automation runs.
- Kit WAVs are 32-bit float so the few hundred mp3-decode samples above 0 dBFS reach the mix unclipped, as in the build scripts; verify_default_mix.py (a) is within 1 LSB of ride_master_v2.wav (limit 4).
- Real-time play is right to about one frame on wired output, worse on Bluetooth; stepping and scrubbing are exact by construction.

## Only Nathan can verify (his own Chrome/Edge on Windows)
- The page opens by double-click and the folder picker works; dropping the folder works.
- The h264 `teaser_v9.mp4` decodes and plays there (the cloud test used a VP9 webm stand-in).
- Real-time video/audio feel; the scrub sound while stepping; Bluetooth latency.
- Legibility of fonts and small text on Windows at his screen sizes.
- That the default state sounds like today's teaser.
