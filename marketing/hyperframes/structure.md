# hyperframes — structure

This folder is all Qualifire marketing video compositions.
`teaser` is the full video; everything else is an ingredient or legacy.

Last restructured 2026-09-10.

## How a composition is made

A composition is a folder with an `index.html` (one paused GSAP timeline, 1920x1080).
`.\render.ps1 -Name <folder>` previews it live, `-Render` produces a timestamped MP4 in
`<folder>/renders/`; a render Nathan is asked to review is copied into
`<folder>/rounds/vN/<folder>_vN.mp4` next to a `FEEDBACK.md`, one round per iteration.
`-Name` accepts a subpath (e.g. `brandmark\opening`). See `COMMANDS.md` and
`STUDIO-GUIDE.md` for details.

## The one rule

- Every ingredient of the teaser is a top-level folder of the same shape, named for
  what it shows, not for where it plays.
- `brandmark/` is the one family folder: base lockup at its root, one subfolder per
  variant.
- The playing order and in/out points live only in `teaser/README.md`.

## Folder map

| Folder | What it is | Own index.html? | Position in teaser | Feedback goes to |
|---|---|---|---|---|
| `brandmark/` | base lockup (mark + wordmark) | yes | — (asset, not itself in teaser) | `brandmark/rounds/v1/FEEDBACK.md` |
| `brandmark/opening/` | lockup variant: draw-in + tagline cross-fade | not yet — code in `teaser/index.html` 0–5s | 1 | `brandmark/opening/rounds/v1/FEEDBACK.md` |
| `brandmark/closing/` | lockup variant: fade-in + yellow wordmark | not yet — code in `teaser/index.html` 10.5–11.2s | 6 | `brandmark/closing/rounds/v1/FEEDBACK.md` |
| `start-ride/` | product scene: start button, route draws | yes (v2, 2026-09-10; needs `map.png`, see `_map/`) | 2 | `start-ride/rounds/v2/FEEDBACK.md` (most recent round) |
| `gates-saving/` | product scene: gates pop in, second ride | yes (v2, 2026-09-10; needs `map.png`, see `_map/`) | 3 | `gates-saving/rounds/v2/FEEDBACK.md` (most recent round) |
| `ranking/` | product scene: rank fragment, timing tower | yes (v2, 2026-09-10; needs `map.png`, see `_map/`) | 4 | `ranking/rounds/v2/FEEDBACK.md` (most recent round) |
| `colours/` | "Why purple is rare" — 60s tier/colour explainer | yes | 5 (uses 0–55s of the render) | `colours/rounds/v1/FEEDBACK.md` |
| `_map/` | basemap capture page for the three product scenes (not a composition) | — | — | — |
| `teaser/` | the assembled full video | stale (see below) | — | `teaser/rounds/v2/FEEDBACK.md` |

## teaser — the full video

Assembled by ffmpeg concat of cuts of the ingredients above; current build v2 = 105.5s
at `teaser/rounds/v2/teaser_v2.mp4`; the ordered cut sheet is in `teaser/README.md`;
`teaser/index.html` does not produce it (it's the old 11.2s brand teaser and the source
code for the two lockup variants). The production method is still undecided — either
split every ingredient into its own `index.html` and rebuild teaser as one real
HyperFrames render, or keep ffmpeg-concat as the permanent method; ask Nathan.

## brandmark — the lockup library

Root = reference lockup (draw → hold → gold wordmark); `opening/` and `closing/` are
the teaser's variants; new variants go in new subfolders, rendered with
`-Name brandmark\<variant>`; survey of variant behaviours is in `brandmark/README.md`.

## Legacy folders

| Folder | Was | Now lives at | Why still here |
|---|---|---|---|
| `gate/` | original logo+wordmark sting | `brandmark/` | this session could not move/delete files on Nathan's PC |
| `tour/` | 50s product tour | `start-ride/`, `gates-saving/`, `ranking/` (v1 renders were cut from this) | no longer on disk anywhere (not even git history) — its source is lost; the three scenes were rebuilt from scratch as their own `index.html` on 2026-09-10 |
| `purple/` | 60s colour explainer | `colours/` | same |
| `teaser/parts/` | per-scene cuts of the skeleton | the top-level ingredient folders above | kept — referenced by `teaser/rounds/v2/concat.txt` |

## Pending cleanup (needs a shell on Nathan's PC)

- move `gate/`, `purple/` to `safe_to_delete/` (never delete outright — project rule); `tour/` is already gone, nothing to move
- remove stray test files `hyperframes/ZZTEST_render.mp4` and `brandmark/renders/TESTFILE_temp.mp4` (same: move, don't delete)
- update `render.ps1` help text and any `gate`/`purple`/`tour` references in `COMMANDS.md` / `STUDIO-GUIDE.md`
- timeline ids inside `brandmark/index.html` (still says `gate`) and `colours/index.html` (still says `purple`) are cosmetically stale
- split `teaser/index.html` into real per-ingredient `index.html` files (brandmark/opening, brandmark/closing) — the three product scenes are done
