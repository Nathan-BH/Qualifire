# silent-studio — structure

> Rewritten 2026-09-26 (marketing cycle 24, studio-folders restructure). The previous version (the
"one top-level folder per ingredient" layout) is archived at
../archive/pre-teaser-full-studios/silent-studio/structure.md.

## The one rule now

There is one deliverable, `teaser-full/`, a single HyperFrames composition (1920x1080, cycle 21).
Nothing is assembled from separate renders any more.

## Layout

```
marketing/silent-studio/
  teaser-full/            UNCHANGED — the one deliverable (master index.html + generated compositions/)
  scenes/                 the five canonical scene sources teaser-full is generated from
    opening/  start-ride/  gates-saving/  ranking/  closing/     (index.html, theme.js, README.md, map*.png)
  _map/                   basemap capture tool (unchanged location)
  all-renders/            silent teaser renders only: every teaser-full_v*.mp4 + teaser_v9.mp4 (kitv1's pinned source)
  build_teaser_full.py    the build script (moved from cycles/21), scene paths updated
  render.ps1              default -Name 'teaser-full'
  checkpoint.ps1          unchanged
  structure.md            this file
  COMMANDS.md             copy-paste PowerShell
  STUDIO-GUIDE.md         dated banner only
```

## How a change reaches the teaser

1. Edit the scene source `scenes/<scene>/index.html`.
2. Claude runs `build_teaser_full.py`, which regenerates `teaser-full/compositions/<id>.html` from
   the five sources (no hand-retyped tweens).
3. If a scene's duration changed, the slot `data-start`/`data-duration` values and the total in the
   hand-authored master `teaser-full/index.html` are updated to match (cycle 23 is the worked
   example).
4. Render `teaser-full` with `render.ps1`.
5. Copy the MP4 to `all-renders/teaser-full_vN.mp4` (next free N; never overwrite an earlier one)
   and, for review, `teaser-full/rounds/vN/`.

Scene <-> composition file mapping:

| scenes/ folder | compositions/ file |
|---|---|
| opening | `opening.html` |
| start-ride | `startride.html` |
| gates-saving | `gatessaving.html` |
| ranking | `ranking.html` |
| closing | `closing.html` |

Scenes can still be previewed alone (`-Name scenes\<scene>`) but a scene is no longer rendered or
reviewed on its own.

## all-renders

Silent teaser renders only: every `teaser-full_vN.mp4`, plus `teaser_v9.mp4` kept because
`teaser-lanes`'s `kitv1` is built from it. Sibling rule kept but narrowed: `audio-studio/all-renders/`
holds the with-sound version of the same teaser (`teaser-full_vN_with_sound_vM.mp4`) once one exists;
a cleanup pass still checks both folders.

## `_map/`

Basemap capture tool for the three map scenes; unchanged.

## Where the old per-part folders went

See `../archive/pre-teaser-full-studios/silent-studio/` for the archived material, and
`../cycles/24_studio-folders-restructure/README.md` (section "Path map") for the full old -> new path
map.
