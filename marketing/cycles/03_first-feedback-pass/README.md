# Cycle 03 — first feedback pass across all six teaser ingredients

## Goal
Apply Nathan's recorded feedback to five compositions (opening → v2, start-ride → v3,
gates-saving → v3, ranking → v3, colours → v2), fix a broken pair of interactive map
preview tools, and once the five renders exist, reassemble the teaser as v4.

## What triggered it
Nathan's request in chat: implement the six items below, in an order that avoids
overwriting or redoing work (he specifically flagged that some map-related changes could
touch more than one scene, since start-ride/gates-saving/ranking share the same basemap
and framing constants).

## How it was built (model-tier protocol)
Digest (Haiku) → Fable (planning + diagnosis + one self-contained brief per task) → six
parallel Sonnet executors → fresh Fable inspector (independently re-derived every claim
against the actual files, cross-checked the three product scenes' shared constants
byte-for-byte, and re-ran the arithmetic behind the start-ride camera math rather than
trusting the executor's numbers). The inspector found one real, render-visible defect and
three stale-doc nits — all mechanical (<10 lines), fixed directly by the coordinator
rather than another subagent round.

## Delivered

**1. Map-scroll-fix** (`_map/route-current_0903-1828.html`, `_map/route-alt-wet-loop_0904-2144.html`) —
these two route-candidate preview tools draw the route as a one-time static SVG overlay in
frame-pixel coordinates; because they're `interactive: true` (by design, for panning/zooming
to compare route shapes), the first scroll/pan moved the map canvas and left the route behind.
`map-capture.html` was never affected because it's `interactive: false` — its map never moves,
so its identical static overlay never goes stale. Fix: both preview files now unproject the
pixel-space route to lon/lat once at construction (before any interaction can occur) and
register it as a native MapLibre GeoJSON source + two `line` layers, which MapLibre keeps
registered under any pan/zoom/rotate. Explanation appended to `_map/README.md`.

**2. opening_v2** (`brandmark/opening/index.html`, new file) — this composition didn't exist
yet; opening_v1 had only ever been a cut of the old `teaser/index.html`. Split it out into its
own composition and fixed Nathan's spacing complaint: the mark now fades fully out (2.0–2.45s),
holds an empty frame (2.45–2.8s), then the wordmark/tagline fade in (2.8–3.55s) — v1 cross-faded
these. Duration grew 5.0s → 5.5s to keep the wordmark hold readable.

**3. start-ride_v3** (`start-ride/index.html`) — three fixes: a virtual cursor now glides onto
and "presses" the START button in sync with its existing press animation; the bottom-gradient
vignette (which made the route's start look ~50% dimmed) is replaced with a uniform tint; and
the camera now pushes in 2× and follows the rider via a moving-average camera-follow (using
`map.png`'s native 2× capture resolution, so no re-capture or upsampling). The shared
`MAP_CENTER`/`MAP_ZOOM`/`ROUTE`/`GATES`/`SECTOR_COLORS` constants and `map.png` itself are
byte-for-byte untouched — the zoom-and-follow effect lives entirely in a CSS-transform wrapper
local to this one file, so gates-saving and ranking keep their v2 overview framing exactly.

**4. gates-saving_v3** (`gates-saving/index.html`) — caption box moved from `top:920px` to
`top:990px` so it clears the route/ring drawing it was overlapping (moving the drawing instead
would have meant moving the shared basemap); first caption changed to "Save your route as
reference."

**5. ranking_v3** (`ranking/index.html`) — text-only per Nathan's request, animations kept:
captions become "Compare directly to your previous ride" and "Compare against your*selfs*"
(only "selfs" italic); composition shortened from 15.2s to 10.0s, with the second caption's
entrance retimed so it's still readable for ~1.6s before the cut instead of ~0.9s.

**6. colours_v2** (`colours/index.html`) — the largest rewrite: removed the gate/route intro
(chart now visible from frame 0), average/lines now animate in together (best-dot/label
removed), animation pacing tightened throughout, retimed to a 19.0s four-beat structure
(chart-build 0–4 / yellow 4–9 / green 9–14 / purple 14–19, purple stays on the chart), each
tier caption is now a coloured word ("Yellow."/"Green."/"Purple.") above a one-line explainer,
the rolling-window beat and the "purple is rare by design" endcard are both removed entirely
(rolling window is a separate future composition — Nathan's ask to build it is **out of scope
for this cycle**, tracked in Open items below). Also fixed a latent v1 bug where the "Your last
ten rides…" caption never actually appeared (an opacity flag was never set) — this was v1's
"8 seconds of dead air" that Nathan's own feedback flagged without knowing the cause. The
inspector caught one more: a GSAP `immediateRender` leak that would have flashed the average
line at full opacity on frame 0 before its fade-in — fixed directly (one-line change,
`colours/index.html`, the avg-blink tween at the green beat).

**teaser_v4 — not built this cycle.** Its precondition (all five new renders existing as files)
isn't met — nothing was rendered this session (see Blockers). It's ready to build the moment
the five MP4s exist; see Open items for the exact recipe.

## Changes made
- 1 new composition (`brandmark/opening/index.html`).
- 4 edited compositions (`start-ride/index.html`, `gates-saving/index.html`,
  `ranking/index.html`, `colours/index.html`).
- 2 edited map preview tools (`_map/route-current_0903-1828.html`,
  `_map/route-alt-wet-loop_0904-2144.html`) + `_map/README.md` note.
- 1 source snapshot (`colours/rounds/v1/index_v1-source.html`, preserving the removed
  rolling-window code for its future standalone composition).
- 5 new `rounds/vN/FEEDBACK.md` files + updated scene READMEs.
- 3 stale-doc nits fixed directly by the coordinator (ranking/gates-saving README "currently
  v2" pointers → v3; colours README's leftover v1 paragraphs; opening README's "Behaviour"
  sentence still describing v1).

## Open items
Nothing could be rendered this session — `device_bash` was unavailable the whole run, same
blocker as cycles 01 and 02. Every source edit landed through the `device_stage_files` /
`device_commit_files` fallback instead. Exact render commands, judgment calls made without
interrupting Nathan, and the teaser_v4 recipe are in `OPEN-ITEMS.md`.

## Next
Nathan renders the five updated compositions (+ confirms the map-scroll fix by opening the
two preview HTMLs in Chrome and scrolling), then either gives feedback on the new renders or
runs the teaser_v4 concat once all five exist. The rolling-window standalone composition
(Nathan's separate ask, folded out of colours_v2) is unstarted and not yet scoped as its own
cycle item.
