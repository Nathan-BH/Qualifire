# Studio Folders Digest — Cycle 23

**Date:** 2026-09-26  
**Scope:** `marketing/silent-studio/` and `marketing/audio-studio/` folder structures, cross-references, and workflow evolution history.

---

## 1. silent-studio/ tree

**Location:** `C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio\`  
**Total size:** ~296 MB across 9 major composition folders + 1 map folder

### Folder structure by size (du -sh):

```
_map/                          32 K   (5 files: map captures, route candidates, README)
brandmark/                    1.6 M   (30 files: base lockup + opening/closing variants)
colours/                       11 M   (19 files: tier/colour explainer composition)
ride/                          13 M   (7 files: start-ride + gates-saving concatenated)
ranking/                       19 M   (25 files: rank fragment + timing tower scene)
start-ride/                    35 M   (15 files: product scene with start button + route)
teaser-full/                   44 M   (40 files: single HyperFrames render, 47.3s)
all-renders/                   47 M   (9 files: current silent renders, flat naming)
gates-saving/                  47 M   (45 files: product scene with gates + route segment 2)
teaser/                        66 M   (79 files: legacy concat pipeline, teaser_v9.mp4)
```

### Top-level documents/scripts:
- `structure.md` — folder layout, composition building method, all-renders mirroring rules
- `STUDIO-GUIDE.md` — HyperFrames Studio UI and preview workflow
- `COMMANDS.md` — render.ps1 command reference
- `checkpoint.ps1` — script to save render checkpoints

### Key substructure per composition:
Each composition folder contains:
- `index.html` — GSAP timeline source (the "truth")
- `README.md` — scene description, status table
- `theme.js` — CSS palette tokens (night/day variants)
- `renders/` — timestamped render dumps (usually stale)
- `rounds/vN/` — approved iterations
  - `<comp>_vN.mp4` — the approved render
  - `FEEDBACK.md` — Nathan's notes, duration confirmation
  - Optional: `<comp>_vN_day.mp4` — day-palette variant

### Special folders:
- **`brandmark/`** — family folder with sub-variants opening/ and closing/
- **`_map/`** — not a composition; basemap for three product scenes
- **`teaser/`** — legacy concat teaser (47.6s ffmpeg assembly, teaser_v9.mp4)
  - `teaser/parts/` — per-scene cuts for concatenation
- **`teaser-full/`** — single HyperFrames render (cycle 21, 2026-09-21)
  - `index.html` — 1014 lines, master GSAP nesting all 5 scenes
  - `compositions/` — component HTML files
  - `renders/` — teaser-full_v1.mp4 (47.3s)
- **`ride/`** — start-ride + gates-saving back-to-back (cycle 17)
- **`all-renders/`** — mirror of current silent renders (flat names, one per composition)

---

## 2. audio-studio/ tree

**Location:** `C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\`  
**Total size:** ~370 MB

### Folder structure by size (du -sh):

```
__pycache__/                   24 K   (3 files: Python cache)
colours/                      2.8 M   (6 files: soundv1 round)
brandmark/                    4.5 M   (23 files: opening/closing with soundv1-v3)
ranking/                      6.9 M   (12 files: soundv1-v3 rounds)
stemsplitter/                  13 M   (24 files: stem source workspace)
all-renders/                   22 M   (4 files: sounded renders only)
teaser/                        25 M   (17 files: soundv1-v2 rounds + arrangements)
ride/                          46 M   (16 files: soundv1-v3 + master WAVs)
gates-saving/                  48 M   (42 files: soundv1-v11 rounds)
start-ride/                    86 M   (30 files: soundv1-v9 rounds)
piano/                         61 M   (97 files: piano projects)
tools/                        116 M   (66 files: teaser-lanes + av-align + tests)
```

### Top-level documents/scripts:
- `structure.md` — per-scene folder layout, sound-design workflow, all-renders mirroring
- `APPROACH.md` — design rationale, synthesis toolkit, Nathan's input workflow
- `AUDIO-BRIEF.template.md`, `FEEDBACK.template.md` — templates for per-scene briefs
- `fluid_render.py`, `synth.py`, `window_mix.py` — shared synthesis/mixing utilities

### Key substructure per scene:
Each scene folder contains:
- `soundtrack.py` — canonical synthesis source (edited in place)
  - Imports `synth.py`: `sys.path.insert(0, "..")`  or `sys.path.insert(0, "../..")`
- `README.md` — sonic direction + status table
- `AUDIO-BRIEF.md` — beat sheet + Nathan's direction (canonical, edited in place)
- `soundvN/` — one per iteration
  - `<scene>_..._vN.mp4` — render with soundtrack muxed
  - `soundtrack_vN.wav` — soundtrack alone
  - `FEEDBACK.md` — round verdict, what changed, what to listen for

### Special folders:
- **`brandmark/`** — family folder with opening/ and closing/ sub-scenes
- **`ride/`** — two-scene ride as one soundtrack (cycle 16+)
- **`all-renders/`** — mirror of current sounded renders (one per scene, flat names)
- **`piano/`** — workspace for piano-note synthesis (interstellar/, ratpac/ projects)
- **`tools/teaser-lanes/`** — see section 2.1 below
- **`stemsplitter/`** — stem separation workspace

### 2.1 Special folder: `tools/teaser-lanes/`

**teaser-lanes.html** — lane arranger for the silent teaser (cycle 19+)

**Top-level files:**
- `teaser-lanes.html` — single-page tool (JavaScript, no external dependencies)
- `teaser-lanes.test.mjs` — 218 core test cases
- `serve.ps1` — local dev server (port 8765)
- `prep_kit.py` — kit builder; decodes video/audio, renders WAVs, writes manifest
- `README.md` — usage guide, kit preparation, test matrix
- `kits.json` — registry of available kits

**Kit folders (numbered by build iteration):**

| Kit | Video | Duration | Frames | Files |
|---|---|---|---|---|
| `kitv1/` | teaser_v9 (concat) | 47.6 s | 1428 | ~11 |
| `kitv2/` | teaser-full_v1 (single render) | 47.3 s | 1419 | ~11 |

Each kit contains: 9 × `.wav` files (bed, logo, a-strings, a-other, b-piano, b-drums, b-bass, b-other, e5), `manifest.json`, video proxy, `prep-report.txt`.

**Lanes in the tool:**
1. `logo` — brand reveal
2. `bed` — main emotional background track
3. `a-strings`, `a-other` — bed layer A split
4. `b-piano`, `b-drums`, `b-bass`, `b-other` — bed layer B split
5. `e5` — five E5 pulse gate markers

---

## 3. Structure/convention docs — key excerpts

### File: `silent-studio/structure.md` — The one rule (lines 20–24)

```
- Every ingredient of the teaser is a top-level folder of the same shape, 
  named for what it shows, not for where it plays.
- `brandmark/` is the one family folder: base lockup at its root, 
  one subfolder per variant.
- The playing order and in/out points live only in `teaser/README.md`.
```

### File: `silent-studio/structure.md` — How a composition is made (lines 7–14)

```
A composition is a folder with an `index.html` (one paused GSAP timeline, 1920x1080).
`.\render.ps1 -Name <folder>` previews it live, `-Render` produces a timestamped MP4 in
`<folder>/renders/`; a render Nathan is asked to review is copied into
`<folder>/rounds/vN/<folder>_vN.mp4` next to a `FEEDBACK.md`, one round per iteration.
```

### File: `silent-studio/structure.md` — all-renders mirroring rule (lines 52–78)

```
`silent-studio/all-renders/` holds one file per composition — the latest `rounds/vN/`
render, silent, flat filenames (`gates-saving_v5.mp4`, `teaser_v6.mp4`, etc., no
`soundvN` suffix). Same idea as `audio-studio/all-renders/`, but that folder holds
the **with-sound** version of the same renders. **The two folders are siblings that
track the same set of "current" files from two different angles — a cleanup or
"what's superseded" pass has to check both, or it silently misses one.**

...Since cycle 17 (2026-09-23) this folder is the *only* home of silent renders:
`audio-studio/all-renders/` holds sounded renders only, and a scene with no current sound
round has no file there at all. `ride_v1.mp4` (cycle 17) is the eighth composition here.
```

### File: `audio-studio/structure.md` — Current state (lines 1–8, cycle 16 decision)

```
> **Decision note, 2026-09-23 (cycle 16):** the `synth.py` synthesised direction is dropped —
> Nathan: "i do not wish to move forward with any of the synthesized sounds". No new round
> uses `synth.py` audio; the ride and opening use Nathan's Tunetank recordings, the other
> scenes have no sound round — their deliverable is the silent render in
> `../silent-studio/all-renders/` (cycle 17 withdrew cycle 16's audio-studio "silent
> rounds"); earlier `soundvN/` rounds stay on disk for reference.
```

### File: `audio-studio/structure.md` — How a scene's sound is made (lines 47–90)

```
There's no external tool in the loop... Claude writes the soundtrack as Python (numpy/scipy)
and mixes it onto the picked render with ffmpeg, in Claude's own sandbox, all in one pass.
...every version Claude produces is already a candidate for your review, not a 
disposable preview.

Shared building blocks... live once in `synth.py` at this folder's root, so a scene's
`soundtrack.py` imports from it instead of redefining tones.

A scene folder is:
  soundtrack.py — canonical synthesis script — the source of truth, edited in place
    across iterations, not duplicated per round. Imports the shared synth.py
  README.md — sonic direction + status table
  AUDIO-BRIEF.md — beat sheet + direction, Nathan's input before a round is composed
  soundvN/
    <scene>_..._vN.mp4 — the picked render with soundtrack muxed on
    soundtrack_vN.wav — the soundtrack alone
    FEEDBACK.md — everything about this round: what changed, what to listen for
```

### File: `audio-studio/tools/teaser-lanes/README.md` — Usage and kit structure (lines 1–16)

```
One page, `teaser-lanes.html`. Whichever kit is loaded plays on the LEFT (time and frame 
readout, transport, clip editor under it); nine long sound lanes sit on the RIGHT, one red 
playhead through all. Two kits ship: `kitv2/` (teaser-full v1, 47.3 s / 1419 frames — **default**) 
and `kitv1/` (teaser v9, 47.6 s / 1428 frames, the old concat teaser).

It plays live and writes no audio; what comes out is a plain-words clip list you paste into chat, 
plus a small arrangement file if you press Save arrangement. Chrome or Edge only.

Kit folders are numbered by build iteration, not by which video they hold (`kitv1` was built first, 
from the old concat teaser; `kitv2` second, from the single-render `teaser-full_v1`). 
The next kit built -- from the piano-note-synced re-render -- will be `kitv3`, 
whatever the underlying video ends up being called.
```

---

## 4. Cross-references — what points at what

**Search scope:** grep -rn for folder names in `silent-studio/` and `audio-studio/`.

| Folder name | Key references | File locations |
|---|---|---|
| **brandmark** | render.ps1 commands; composition source; parent folder (opening/closing); Folder table in structure.md | COMMANDS.md (32, 49, 56–57); structure.md (42, 48–49, 100); brandmark/*.md; audio-studio/brandmark/* |
| **opening** (brand) | Sub-scene of brandmark; render.ps1 -Name brandmark\opening; source video paths | silnt-studio/brandmark/opening/*; audio-studio/brandmark/opening/*; README.md, FEEDBACK.md files reference ../../all-renders/ |
| **closing** (brand) | Sub-scene of brandmark; render.ps1 -Name brandmark\closing | silent-studio/brandmark/closing/*; audio-studio/brandmark/closing/*; FEEDBACK.md references silent-studio/all-renders/ path |
| **colours** | render.ps1 -Name colours; folder table row; soundv1 composition; source video ../../silent-studio/all-renders/colours_v5.mp4 | COMMANDS.md (32); structure.md (46, 101); audio-studio/colours/* |
| **gates-saving** | render.ps1 commands (26, 29, 40, 58); synth.py extraction origin; composition example in APPROACH.md; most active scene with 11 sound rounds | COMMANDS.md, structure.md, APPROACH.md (42, 47, 56, 79–91); gates-saving/* in both studios |
| **ranking** | render.ps1 -Name ranking; folder table; tier-chime references | COMMANDS.md (40, 59); structure.md (45); APPROACH.md (56, 98–101); ranking/* |
| **start-ride** | render.ps1 -Name start-ride; map.png copy command; folder table | COMMANDS.md (40, 49, 56–57); structure.md (43); APPROACH.md (95–97); start-ride/* |
| **ride** | Folder table (added cycle 17); concat assembly; Tunetank master; teaser-lanes reference | structure.md (49, 78); audio-studio/ride/*; teaser-lanes README, tools/* |
| **teaser** | Not independently renderable (concat assembly); folder table; parts/ subfolder; ffmpeg concat source | structure.md (30–31, 50, 81–89, 100); teaser/README.md; teaser/parts/*; tools/teaser-lanes (kitv1 source) |
| **teaser-full** | Single HyperFrames render (cycle 21); folder table; all-renders; kitv2 source | structure.md (49, 77–78); teaser-full/*; cycles/21_*; teaser-lanes (kitv2 default) |
| **all-renders** (both folders) | Core mirroring rule; all per-scene README.md files; soundvN/FEEDBACK.md files; cleanup history | structure.md (52–78); audio-studio/structure.md (15–24); cycle 07, 17 cleanup docs |
| **kitv1** | teaser-lanes kit for teaser_v9 (47.6s, 1428 frames); default until cycle 22 | teaser-lanes/README.md (11–16, 41–47); prep_kit.py default arg; cycles/19, 22 |
| **kitv2** | teaser-lanes kit for teaser-full_v1 (47.3s, 1419 frames); current default (cycle 22) | teaser-lanes/README.md; prep_kit.py; cycles/21, 22; teaser-lanes.html default |

---

## 5. Recent workflow-evolution history

### Cycle 07 (2026-09-14): silent-studio rename and render cleanup

Renamed `marketing/hyperframes/` → `marketing/silent-studio/` to mirror `audio-studio/` naming. Identified stale renders in each scene's `renders/` folder (timestamped dumps superseded by newer `rounds/vN/` versions). Staleness verdict: teaser's `renders/` is expected-empty (teaser is ffmpeg-concat, not independently rendered); gates-saving, ranking, brandmark/closing, and colours had superseded files moved to `safe_to_delete/`. **Key rule:** "every ingredient is a top-level folder of the same shape, named for what it shows."

### Cycle 17 (2026-09-23): silent renders live in silent-studio + ride composition + gate easing inversion

Re-issued silent renders as proper compositions in `silent-studio/` (closing v5, colours v5, ranking v8). Added `silent-studio/ride/` as new composition (start-ride + gates-saving, 26.3s). Inverted gate easing on gates-saving. **Critical:** `silent-studio/all-renders/` now holds **silent only**, `audio-studio/all-renders/` holds **sounded only** (mirrored state). Withdrew cycle 16's "silent rounds" folders (→ `_to_delete/`). Nathan: "i do not wish to move forward with any of the synthesized sounds" — now using Tunetank recordings.

### Cycle 19 (2026-09-24): teaser-sound-lanes tool

Built `audio-studio/tools/teaser-lanes/teaser-lanes.html` — plays silent teaser on left, nine sound lanes on right, on one playhead. Lets Nathan interactively pick clip start/end times, outputs copy-paste clip list or saveable arrangement JSON. **kitv1** shipped with teaser_v9 (47.6s, old concat teaser). Enables Nathan to build teaser sound arrangement without hand-editing Python/JSON.

### Cycle 21 (2026-09-21): teaser as one real render (single HyperFrames composition)

Replaced ffmpeg-concat teaser with one real HyperFrames render. Built `silent-studio/teaser-full/index.html` — 1014-line master GSAP timeline nesting all 5 scenes with scoped CSS/JS. Master duration = 47.3s. Each scene's tween code byte-identical to source. Resolves `structure.md`'s production-method question: one real render in new `teaser-full/` folder (does not overwrite old `teaser/`).

### Cycle 22 (2026-09-26): teaser-lanes multi-video kit picker + kitv2 (teaser-full)

Made teaser-lanes.html configurable to load different video sources and kits (was hardcoded to teaser_v9 + kitv1). Built **kitv2** from `teaser-full_v1.mp4` (47.3s, 1419 frames). Kit numbering by build iteration, not by video source: kitv3 (when built from piano-synced re-render) will still be kitv3 regardless of video name. Added UI to switch kits. Default kit = kitv2 (teaser-full). Copied cycle-20's rides-options A/B arrangement files, re-stamped to fit teaser-full timings.

---

## 6. Established precedent

**Numbered-iteration convention for tools/teaser-lanes kit folders:**

Kit folders are numbered by **build iteration**, not by their underlying video source. This allows kits to be rebuilt with new videos without changing the kit number if the tool/kit builder's logic hasn't fundamentally changed.

| Kit | Built | Video source | Notes |
|---|---|---|---|
| `kitv1` | 2026-09-24 (cycle 19) | teaser_v9 (concat) | Original kit; default until cycle 22 |
| `kitv2` | 2026-09-26 (cycle 22) | teaser-full_v1 (single render) | New default; same tool/prep logic |
| `kitv3` | TBD | TBD (piano-synced re-render planned) | Will follow same pattern |

**Implication for future restructures:** if folders are renamed or moved, the `kitvN` naming should persist — it refers to kit's build generation, not location or video name. Registry (`kits.json`) and README default arrangement update to point to new path, but `kitv1` remains `kitv1`.

---

**End of Digest**
