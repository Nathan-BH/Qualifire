# audio-studio — structure

> Rewritten 2026-09-26 (marketing cycle 24, studio-folders restructure). The previous per-scene version
is archived at ../archive/pre-teaser-full-studios/audio-studio/structure.md.

## Current workflow

Sound design for the one teaser happens in `tools/teaser-lanes/teaser-lanes.html` (video left, nine
lanes right, one playhead; it plays live and writes no audio). Output = a clip list pasted into chat
and/or a saved arrangement JSON. Carried forward from cycle 16 (2026-09-23): synthesised `synth.py`
sound is dropped; real recordings (Tunetank) only.

## Kits

`tools/teaser-lanes/kitvN/`, numbered by build iteration, built by `tools/teaser-lanes/prep_kit.py`
from a silent render in `../silent-studio/all-renders/`. See `tools/teaser-lanes/README.md` for the
current kit list rather than restating it here.

## Arrangements

`teaser/arrangements/arrangement_vN/` (planned move to `teaser-full/arrangements/` on 2026-09-26,
cycle 24, blocked by a Windows permission error — see `../cycles/24_studio-folders-restructure/OPEN-ITEMS.md`,
"Escalations", before retrying). A built sound round, when one exists, goes in `teaser-full/soundvN/`, and
its muxed MP4 in `all-renders/teaser-full_vN_with_sound_vM.mp4`.

## Sound sources `prep_kit.py` reads — do not move without editing it

`piano/projects/tunetank/…` (logo), `stemsplitter/tunetank-emotional-classical/sources/` (bed +
stems), `ride/` (`ride_master.py`, `ride_tunetank.py` constants, `soundv2/ride_master_v2.wav`
regression reference), and the root modules `synth.py`, `salamander_render.py`, `window_mix.py`
(plus `fluid_render.py`, used by the piano scripts).

## all-renders

Empty as of this cycle; the with-sound sibling of `../silent-studio/all-renders/`.

## Other tools

`tools/av-align/` (older per-scene alignment tool, kept as is).

## Where the old per-scene folders went

See `../archive/pre-teaser-full-studios/audio-studio/` for the archived material, and
`../cycles/24_studio-folders-restructure/README.md` for the full old -> new path map.
