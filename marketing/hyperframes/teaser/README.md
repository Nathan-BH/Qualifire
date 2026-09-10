# teaser — the full app preview (assembled)

`teaser` is the full video. It is not (yet) a single HyperFrames render of the
`index.html` in this folder: it is assembled by concatenating cuts of the
ingredient compositions listed below, in this order. Order and in/out points are
a property of this file, not of the ingredient folders — each ingredient is a
standalone composition with its own README, render and feedback rounds.

## Cut sheet (v2 — rounds/v2/teaser_v2.mp4, 105.5s)
| # | Ingredient | Source render | In–out | Length | Plays at |
|---|---|---|---|---|---|
| 1 | ../brandmark/opening/ | teaser_2026-09-09_18-08-41.mp4 | 0.000–5.000s | 5.0s | 0:00.0–0:05.0 |
| 2 | ../start-ride/ | tour_2026-09-09_23-16-48.mp4 | 2.2–15.233s | 13.0s | 0:05.0–0:18.0 |
| 3 | ../gates-saving/ | tour_2026-09-09_23-16-48.mp4 | 15.233–30.0s | 14.8s | 0:18.0–0:32.8 |
| 4 | ../ranking/ | tour_2026-09-09_23-16-48.mp4 | 30.0–45.233s | 15.2s | 0:32.8–0:48.0 |
| 5 | ../colours/ | purple_2026-09-09_18-09-50.mp4 (copy at colours/renders/colours_2026-09-09_18-09-50.mp4) | 0–55.0s | 55.0s | 0:48.0–1:43.0 |
| 6 | ../brandmark/closing/ | teaser_2026-09-09_18-08-41.mp4 | 10.5–11.2s + 1.8s held frame | 2.5s | 1:43.0–1:45.5 |

The exact ffmpeg recipe that produced v2 is `rounds/v2/concat.txt` (it points at
the legacy `parts/` copies of these cuts; the canonical cuts now live in each
ingredient's `rounds/v1/`). Feedback on the assembly as a whole: `rounds/v2/FEEDBACK.md`.
Feedback on an individual scene: that scene's own `rounds/v1/FEEDBACK.md`.

## What else is in this folder
- `index.html` — stale: the old 11.2s brand teaser. It is still the only source
  code for the two lockup variants (`brandmark/opening` = 0–5.0s, `brandmark/closing`
  = 10.5–11.2s) until those are split out. It does not produce the assembled video.
- `renders/`, `rounds/v1/` — outputs and feedback of that 11.2s version (history).
- `parts/` — legacy per-scene cuts; superseded by the top-level ingredient folders,
  kept because `rounds/v2/concat.txt` references them.

## History — the 11.2s brand teaser (v1, 2026-09-09)

**2026-09-10 restructure:** "teaser" is now the full app-preview composition —
Nathan's 6-beat story for the merged video, replacing the retired "tour"
composition name. Body content lives in `parts/`: `parts/02-start-ride`
through `parts/04-ranking` carry what used to be "tour". Note that
`index.html` is stale — it still describes the old 11.2s v1 composition
(ring/wordmark/sector-cards/tower/endcard) and has not yet been rebuilt to
match `rounds/v2/teaser_v2.mp4`.

`index.html` is a ~12s, 1920x1080 HyperFrames composition (id `teaser`), not
a website: ring draws clockwise -> wordmark + tagline -> four sector slots
(yellow/green/yellow/purple) -> timing-tower line -> yellow endcard. One
paused GSAP timeline (`window.__timelines.teaser`); only external asset is
the GSAP CDN script.

On your PC, from this folder: `npx hyperframes preview` (live-reload) or
`npx hyperframes render` (MP4). Or run `..\render.ps1 -Name teaser` from
`marketing/hyperframes/` — location-independent, checks Node 22+/FFmpeg first.

**2026-09-09 revision:** per Nathan's feedback, the mark now fades out in
place at 2s (no shrink-to-corner) and fades back in centered for the endcard
at 10.6s (no travel); also fixed 3 `gsap_exit_missing_hard_kill` contract
errors by wrapping every clip's content in a `.inner` div and hard-killing
each exit fade with `tl.set` right at its clip boundary.

**Renders note:** `renders/teaser_2026-09-09_09-14-01.mp4` predates the
revision above and is stale/superseded by `teaser_2026-09-09_18-08-41.mp4`;
it should eventually move to `archive/`.

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | teaser_v1.mp4 | 2026-09-09 | Awaiting feedback |
| [v2](rounds/v2/FEEDBACK.md) | teaser_v2.mp4 | 2026-09-10 | Skeleton (ffmpeg assembly of parts) — awaiting feedback |
