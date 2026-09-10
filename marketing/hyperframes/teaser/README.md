# teaser — the full app preview (assembled)

`teaser` is the full video. It is not (yet) a single HyperFrames render of the
`index.html` in this folder: it is assembled by concatenating cuts of the
ingredient compositions listed below, in this order. Order and in/out points are
a property of this file, not of the ingredient folders — each ingredient is a
standalone composition with its own README, render and feedback rounds.

## Cut sheet (v4 — rounds/v4/teaser_v4.mp4, 64.8s) — current
**Built and confirmed** (2026-09-10): `rounds/v4/teaser_v4.mp4` exists; ffprobe reads
64.800000s / 1944 frames, matching the six-part sum exactly. Concat list and recipe in
`rounds/v4/FEEDBACK.md`.

| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | ../brandmark/opening/ | opening_v2.mp4 (own composition, full) | 5.5s | 0:00.0–0:05.5 |
| 2 | ../start-ride/ | start-ride_v3.mp4 (own composition, full) | 13.0s | 0:05.5–0:18.5 |
| 3 | ../gates-saving/ | gates-saving_v3.mp4 (own composition, full) | 14.8s | 0:18.5–0:33.3 |
| 4 | ../ranking/ | ranking_v3.mp4 (own composition, full) | 10.0s | 0:33.3–0:43.3 |
| 5 | ../colours/ | colours_v2.mp4 (own composition, full) | 19.0s | 0:43.3–1:02.3 |
| 6 | ../brandmark/closing/ | closing_v1.mp4 (own composition, full, unchanged) | 2.5s | 1:02.3–1:04.8 |

v4 applies Nathan's first feedback pass to five of the six ingredients — opening,
start-ride, gates-saving, ranking, and colours all get new renders; `brandmark/closing`
is unchanged (still v1). `rounds/v4/concat.txt` + re-encode recipe: see
`rounds/v4/FEEDBACK.md`. Feedback on the assembly as a whole: `rounds/v4/FEEDBACK.md`.
Feedback on an individual scene: that scene's own `rounds/v2/FEEDBACK.md`
(brandmark/opening, colours) or `rounds/v3/FEEDBACK.md` (start-ride, gates-saving,
ranking) or `rounds/v1/FEEDBACK.md` (brandmark/closing).

## Cut sheet (v3 — rounds/v3/teaser_v3.mp4, 110.5s) — superseded by v4
| # | Ingredient | Source render | Length | Plays at |
|---|---|---|---|---|
| 1 | ../brandmark/opening/ | opening_v1.mp4 (own composition, full) | 5.0s | 0:00.0–0:05.0 |
| 2 | ../start-ride/ | start-ride_v2.mp4 (rotation-corrected, full) | 13.0s | 0:05.0–0:18.0 |
| 3 | ../gates-saving/ | gates-saving_v2.mp4 (rotation-corrected, full) | 14.8s | 0:18.0–0:32.8 |
| 4 | ../ranking/ | ranking_v2.mp4 (rotation-corrected, full) | 15.2s | 0:32.8–0:48.0 |
| 5 | ../colours/ | colours_v1.mp4 (own composition, full) | 60.0s | 0:48.0–1:48.0 |
| 6 | ../brandmark/closing/ | closing_v1.mp4 (own composition, full) | 2.5s | 1:48.0–1:50.5 |

v3 replaces v2's start-ride/gates-saving/ranking beats (which were cut from the old
pre-map "tour" render) with the current standalone real-map renders of those three
scenes. v3 was built the same way as v4; its concat list was not kept (see
`rounds/v4/concat.txt` for the recipe). Feedback on the assembly as a whole:
`rounds/v3/FEEDBACK.md`. Feedback on an individual scene: that scene's own
`rounds/v2/FEEDBACK.md` (start-ride/gates-saving/ranking) or
`rounds/v1/FEEDBACK.md` (brandmark/opening, brandmark/closing, colours).

## What else is in this folder
- `index.html` — stale: the old 11.2s brand teaser. It is not the source of the
  assembled video and has not been touched since the 2026-09-10 restructure below.
- `renders/`, `rounds/v1/` — outputs and feedback of that 11.2s version (history).
- `parts/` — legacy per-scene cuts, used by v2's concat; superseded by the top-level
  ingredient folders for v3 onward.

## History

### v2 cut sheet (rounds/v2/teaser_v2.mp4, 105.5s) — superseded by v3
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
ingredient's own rounds folder).

### The 11.2s brand teaser (v1, 2026-09-09)

**2026-09-10 restructure:** "teaser" is now the full app-preview composition —
Nathan's 6-beat story for the merged video, replacing the retired "tour"
composition name. Body content lives in `parts/`: `parts/02-start-ride`
through `parts/04-ranking` carry what used to be "tour". Note that
`index.html` is stale — it still describes the old 11.2s v1 composition
(ring/wordmark/sector-cards/tower/endcard) and has not yet been rebuilt to
match either `teaser_v2.mp4` or `teaser_v3.mp4`.

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
| [v2](rounds/v2/FEEDBACK.md) | teaser_v2.mp4 | 2026-09-10 | Skeleton (ffmpeg assembly of parts) — superseded by v3 |
| [v3](rounds/v3/FEEDBACK.md) | teaser_v3.mp4 | 2026-09-10 | Real-map beats swapped in — superseded by v4 |
| [v4](rounds/v4/FEEDBACK.md) | teaser_v4.mp4 | 2026-09-10 | Built, 64.8s confirmed — awaiting Nathan's feedback |
