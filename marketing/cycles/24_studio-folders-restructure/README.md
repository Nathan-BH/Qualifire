# Cycle 24 — studio folders restructure (teaser-full-centred)

## Process

Digest = Haiku, Plan = Opus (standing in for Fable at Nathan's request), Execute = Sonnet (this
report), Inspect = Opus to follow. See `## Readout` below for the tier table.

## Why

Nathan now works on exactly one video: the single full-teaser render in
`marketing/silent-studio/teaser-full/` (one HyperFrames composition, since cycle 21). It is no longer
assembled from separate per-scene renders, so the old "one top-level folder per render part" layout in
both `silent-studio/` and `audio-studio/` (brandmark, colours, gates-saving, ranking, ride, start-ride,
the old concat `teaser/`) was outdated. Sound design is now done in the lane tool
`marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html`, not with per-scene `soundtrack.py`/
`soundvN/` rounds. This cycle reshapes both studios around `teaser-full/` + `teaser-lanes`, and moves
the per-part history to an archive (never deleted).

### The two facts that shaped the plan

1. **Five per-scene `index.html` files were still live sources.** `teaser-full/compositions/*.html` are
   *generated* from `silent-studio/brandmark/opening/`, `start-ride/`, `gates-saving/`, `ranking/`,
   `brandmark/closing/` `index.html` by `build_teaser_full.py` (formerly
   `cycles/21_teaser-single-render-unification/build_teaser_v2.py`). Cycle 23 had just edited
   `start-ride/index.html` and re-run that script. So those five scenes' **source files** moved to
   `silent-studio/scenes/<scene>/` (a sibling of `teaser-full/`, deliberately *not inside it*), and only
   their `renders/`+`rounds/` history went to the archive.
2. **`audio-studio/ride/` stays where it is.** `tools/teaser-lanes/prep_kit.py` (which Nathan is using to
   build `kitv3`) imports `ride/ride_master.py`, loads `ride/ride_tunetank.py`, reads
   `ride/soundv2/ride_master_v2.wav`, and imports the audio-studio root modules `synth.py`,
   `salamander_render.py`, `window_mix.py`, plus `piano/…` and `stemsplitter/…`. None of those moved.

### Archive choice (decided in the brief)

`marketing/archive/pre-teaser-full-studios/`, mirroring the original layout underneath
(`…/silent-studio/<x>`, `…/audio-studio/<x>`). Why: (a) `marketing/archive/` already exists as the "old
marketing stuff, kept for reference" home; (b) root `safe_to_delete/`/`_to_delete/` are gitignored and
mean "to be cleared" — this material is history to keep, not trash; (c) mirroring the old sub-paths
keeps every old relative reference recognisable.

## What stayed, and why

- `silent-studio/teaser-full/` — unchanged, it's the one deliverable.
- `silent-studio/_map/` — the basemap capture tool, unchanged location (README's copy-loop paths were
  updated, §6.1.5).
- `audio-studio/tools/teaser-lanes/` — the sound-design tool + `kitvN/` kits, unchanged location (two
  one-line doc/string edits, §6.2.3/.4).
- `audio-studio/ride/`, `piano/`, `stemsplitter/`, `synth.py`, `salamander_render.py`, `window_mix.py`,
  `fluid_render.py` — the sound-source chain `prep_kit.py` reads (§0 fact 2).
- `silent-studio/all-renders/teaser_v9.mp4` — pinned: `kitv1` + test fixtures point at it.

## Implementation order

§4.0 (mkdir) → §4.1 (scene sources → `scenes/`) → §4.2 (whole per-part folders → archive) → §4.3
(all-renders files → archive) → §4.4 (docs + build script) → §5 (audio-studio) → §6 (edits) → §9
(verification).

## Path map

All paths written in full from `marketing/…`. Status: **done** unless noted.

### §4.0 — cycle folder (done before this run started)

| # | old | new |
|---|---|---|
| 0 | `marketing/cycles/23_studio-folders-restructure/` | `marketing/cycles/24_studio-folders-restructure/` |

### §4.1 — scene sources → `silent-studio/scenes/`

| # | old | new |
|---|---|---|
| 1 | `marketing/silent-studio/brandmark/opening/index.html` | `marketing/silent-studio/scenes/opening/index.html` |
| 2 | `marketing/silent-studio/brandmark/opening/theme.js` | `marketing/silent-studio/scenes/opening/theme.js` |
| 3 | `marketing/silent-studio/brandmark/opening/README.md` | `marketing/silent-studio/scenes/opening/README.md` |
| 4 | `marketing/silent-studio/brandmark/closing/index.html` | `marketing/silent-studio/scenes/closing/index.html` |
| 5 | `marketing/silent-studio/brandmark/closing/theme.js` | `marketing/silent-studio/scenes/closing/theme.js` |
| 6 | `marketing/silent-studio/brandmark/closing/README.md` | `marketing/silent-studio/scenes/closing/README.md` |
| 7 | `marketing/silent-studio/start-ride/index.html` | `marketing/silent-studio/scenes/start-ride/index.html` |
| 8 | `marketing/silent-studio/start-ride/theme.js` | `marketing/silent-studio/scenes/start-ride/theme.js` |
| 9 | `marketing/silent-studio/start-ride/README.md` | `marketing/silent-studio/scenes/start-ride/README.md` |
| 10 | `marketing/silent-studio/start-ride/map.png` | `marketing/silent-studio/scenes/start-ride/map.png` |
| 11 | `marketing/silent-studio/start-ride/map-day.png` | `marketing/silent-studio/scenes/start-ride/map-day.png` |
| 12 | `marketing/silent-studio/gates-saving/index.html` | `marketing/silent-studio/scenes/gates-saving/index.html` |
| 13 | `marketing/silent-studio/gates-saving/theme.js` | `marketing/silent-studio/scenes/gates-saving/theme.js` |
| 14 | `marketing/silent-studio/gates-saving/README.md` | `marketing/silent-studio/scenes/gates-saving/README.md` |
| 15 | `marketing/silent-studio/gates-saving/map.png` | `marketing/silent-studio/scenes/gates-saving/map.png` |
| 16 | `marketing/silent-studio/gates-saving/map-day.png` | `marketing/silent-studio/scenes/gates-saving/map-day.png` |
| 17 | `marketing/silent-studio/ranking/index.html` | `marketing/silent-studio/scenes/ranking/index.html` |
| 18 | `marketing/silent-studio/ranking/theme.js` | `marketing/silent-studio/scenes/ranking/theme.js` |
| 19 | `marketing/silent-studio/ranking/README.md` | `marketing/silent-studio/scenes/ranking/README.md` |
| 20 | `marketing/silent-studio/ranking/map.png` | `marketing/silent-studio/scenes/ranking/map.png` |
| 21 | `marketing/silent-studio/ranking/map-day.png` | `marketing/silent-studio/scenes/ranking/map-day.png` |

### §4.2 — per-part folders → archive

| # | old | new |
|---|---|---|
| 22 | `marketing/silent-studio/brandmark/` | `marketing/archive/pre-teaser-full-studios/silent-studio/brandmark/` |
| 23 | `marketing/silent-studio/start-ride/` | `marketing/archive/pre-teaser-full-studios/silent-studio/start-ride/` |
| 24 | `marketing/silent-studio/gates-saving/` | `marketing/archive/pre-teaser-full-studios/silent-studio/gates-saving/` |
| 25 | `marketing/silent-studio/ranking/` | `marketing/archive/pre-teaser-full-studios/silent-studio/ranking/` |
| 26 | `marketing/silent-studio/colours/` | `marketing/archive/pre-teaser-full-studios/silent-studio/colours/` |
| 27 | `marketing/silent-studio/ride/` | `marketing/archive/pre-teaser-full-studios/silent-studio/ride/` |
| 28 | `marketing/silent-studio/teaser/` | `marketing/archive/pre-teaser-full-studios/silent-studio/teaser/` |

### §4.3 — silent all-renders → archive

| # | old | new |
|---|---|---|
| 29 | `marketing/silent-studio/all-renders/closing_v5.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/closing_v5.mp4` |
| 30 | `marketing/silent-studio/all-renders/colours_v5.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/colours_v5.mp4` |
| 31 | `marketing/silent-studio/all-renders/gates-saving_v9.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/gates-saving_v9.mp4` |
| 32 | `marketing/silent-studio/all-renders/opening_v3.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/opening_v3.mp4` |
| 33 | `marketing/silent-studio/all-renders/ranking_v8.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/ranking_v8.mp4` |
| 34 | `marketing/silent-studio/all-renders/ride_v1.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/ride_v1.mp4` |
| 35 | `marketing/silent-studio/all-renders/start-ride_v4.mp4` | `marketing/archive/pre-teaser-full-studios/silent-studio/all-renders/start-ride_v4.mp4` |

### §4.4 — docs + build script

| # | old | new |
|---|---|---|
| 36 | `marketing/silent-studio/structure.md` (original) | `marketing/archive/pre-teaser-full-studios/silent-studio/structure.md`; new `marketing/silent-studio/structure.md` written |
| 37 | `marketing/silent-studio/COMMANDS.md` (original) | `marketing/archive/pre-teaser-full-studios/silent-studio/COMMANDS.md`; new `marketing/silent-studio/COMMANDS.md` written |
| 38 | `marketing/cycles/21_teaser-single-render-unification/build_teaser_v2.py` | `marketing/silent-studio/build_teaser_full.py` (then edited, §6.1.1) |

### §5 — audio-studio

| # | old | new | status |
|---|---|---|---|
| 39 | `marketing/audio-studio/teaser/arrangements/` | `marketing/audio-studio/teaser-full/arrangements/` | **ESCALATED — not moved** (Windows `Permission denied`; see OPEN-ITEMS.md) |
| 40 | `marketing/audio-studio/teaser/` | `marketing/archive/pre-teaser-full-studios/audio-studio/teaser/` | **SKIPPED** (depends on row 39) |
| 41 | `marketing/audio-studio/brandmark/` | `marketing/archive/pre-teaser-full-studios/audio-studio/brandmark/` | done |
| 42 | `marketing/audio-studio/colours/` | `marketing/archive/pre-teaser-full-studios/audio-studio/colours/` | done |
| 43 | `marketing/audio-studio/gates-saving/` | `marketing/archive/pre-teaser-full-studios/audio-studio/gates-saving/` | done |
| 44 | `marketing/audio-studio/ranking/` | `marketing/archive/pre-teaser-full-studios/audio-studio/ranking/` | done |
| 45 | `marketing/audio-studio/start-ride/` | `marketing/archive/pre-teaser-full-studios/audio-studio/start-ride/` | done |
| 46 | `marketing/audio-studio/all-renders/gates-saving_v9_with_sound_v11.mp4` | `marketing/archive/pre-teaser-full-studios/audio-studio/all-renders/gates-saving_v9_with_sound_v11.mp4` | done |
| 47 | `marketing/audio-studio/all-renders/opening_v3_with_sound_v3.mp4` | `marketing/archive/pre-teaser-full-studios/audio-studio/all-renders/opening_v3_with_sound_v3.mp4` | done |
| 48 | `marketing/audio-studio/all-renders/ride_v1_with_sound_v3.mp4` | `marketing/archive/pre-teaser-full-studios/audio-studio/all-renders/ride_v1_with_sound_v3.mp4` | done |
| 49 | `marketing/audio-studio/all-renders/start-ride_v4_with_sound_v9.mp4` | `marketing/archive/pre-teaser-full-studios/audio-studio/all-renders/start-ride_v4_with_sound_v9.mp4` | done |
| 50 | `marketing/audio-studio/AUDIO-BRIEF.template.md` | `marketing/archive/pre-teaser-full-studios/audio-studio/AUDIO-BRIEF.template.md` | done |
| 51 | `marketing/audio-studio/FEEDBACK.template.md` | `marketing/archive/pre-teaser-full-studios/audio-studio/FEEDBACK.template.md` | done |
| 52 | `marketing/audio-studio/structure.md` (original) | `marketing/archive/pre-teaser-full-studios/audio-studio/structure.md`; new `marketing/audio-studio/structure.md` written | done |

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| Digest | Haiku | | |
| Plan | Opus | | |
| Execute | Sonnet | | rows 0-38, 41-52 done; rows 39-40 escalated; all §6 edits done; V1-V8 pass |
| Inspect | Opus | | |
