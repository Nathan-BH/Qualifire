# teaser-full — one real HyperFrames render of the 47.3s teaser

This folder is a single HyperFrames composition that renders the whole Qualifire teaser
(opening → start-ride → gates-saving → ranking → closing) as one real render, instead of
five separately-rendered clips concatenated by ffmpeg.

## Mechanism

`index.html` is a thin ROOT document: it declares the shared theme tokens once (so `<html
data-theme="...">` and `render.ps1 -Theme day` govern every scene), registers one empty
paused root timeline, and holds five empty slot divs carrying `data-composition-src`. Each
slot mounts a `<template>`-wrapped sub-composition file from `compositions/`. HyperFrames
seeks each mounted scene's own timeline independently — nothing is manually merged onto the
root timeline (`master.add()`), which is what made v1 (archived below) lint-reject. Because
every scene lands in the root document's light DOM, each scene's CSS selectors and GSAP
selector strings are scoped to that scene's own subtree (`#<cid> #<cid>-scene ...` in CSS,
`gsap.context(fn, R)` in JS) so the five scenes' repeated ids and colours never leak into
each other. Relative asset paths inside a sub-composition (e.g. `map.png`) resolve against
this folder, not against `compositions/`.

## Timing (root-absolute)

| order | composition id | source scene | start | duration | track |
|---|---|---|---|---|---|
| 1 | `opening` | brandmark/opening | 0 | 6.2 | 0 |
| 2 | `startride` | start-ride | 6.2 | 14.0 | 1 |
| 3 | `gatessaving` | gates-saving | 20.2 | 12.3 | 2 |
| 4 | `ranking` | ranking | 32.5 | 10.8 | 3 |
| 5 | `closing` | brandmark/closing | 43.3 | 4.0 | 4 |

Total 47.3 s.

## Deliberate deviations from the original scene files

- **gates-saving's duration**: its clip divs' `data-duration` attribute said `12.4`, but its
  own GSAP timeline actually ends at `12.3` (every render of it measures 12.300000 s) — the
  new `compositions/gatessaving.html` uses the correct `12.3` throughout.
- **`#basemap` renamed per scene**: each of start-ride, gates-saving and ranking has its own
  `<img id="basemap">`. Mounting all three in one document made that id collide
  (HyperFrames resolves media elements globally by id), so each new composition file renames
  its basemap to `<cid>-basemap` (`startride-basemap`, `gatessaving-basemap`,
  `ranking-basemap`) in its HTML, CSS and JS. The five original scene files are untouched.

Everything else — every GSAP tween, ease, value, and helper function — is byte-identical to
the five original scene files.

**Rendered 2026-09-26** — round v1 lives in `rounds/v1/` (night render, 47.3 s / 1419 frames);
feedback goes in `rounds/v1/FEEDBACK.md`. Cycle 21's `OPEN-ITEMS.md` still holds the
lint/snapshot/render commands. v1 (the wrong-mechanism manual merge this replaced) is archived at
`marketing/cycles/21_teaser-single-render-unification/v1-merged-timelines/`, not deleted.

Full build recipe: `marketing/cycles/21_teaser-single-render-unification/BRIEF-teaser-full-v2.md`.
