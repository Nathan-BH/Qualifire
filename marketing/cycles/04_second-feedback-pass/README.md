# Cycle 04 — second feedback pass across all six teaser ingredients

## Goal
Apply Nathan's second round of recorded feedback across all six teaser ingredients: build `brandmark/closing` as a real standalone HyperFrames composition (v2) with the new tagline, slow the opening's fades (v3), strip the START button subtitle and add a black lead-in to start-ride (v4), give gates-saving a zoom-out lead-in that continues from start-ride's 2x end frame plus a sector recolour (v4), replace ranking's rank-card beat with a straight-to-tower "new ride slides into P2" structure (v4), then reassemble the teaser as v5 with the colours section dropped (five ingredients, 46.9s planned).

## What triggered it
Nathan reviewed every round produced in cycle 03 (opening_v2, start-ride_v3, gates-saving_v3, ranking_v3, closing_v1, teaser_v4 — all rendered by him on his PC, so this is feedback on actual footage) and wrote feedback into each round's `FEEDBACK.md`. Two structural calls fell out of that feedback and were made without interrupting him: closing needed to become its own composition (the only clean way to remove the old ffmpeg-cut's stray frames and add the tagline — structure.md's own pending-cleanup list already called for this split, mirroring opening's cycle-03 split), and gates-saving's "zoom out — what do you think?" was answered yes, as a 1.0s camera lead-in that continues start-ride's final frame.

## How it was built (model-tier protocol)
Haiku Digest (read all 6 FEEDBACK.md files + repo conventions, condensed to a factual digest) → Fable Plan (designed the fix for each item, wrote 6 self-contained briefs + resolved the cross-scene SECTOR_COLORS/camera-formula questions) → coordinator spot-checked the source files directly to resolve the plan's flagged unknowns (green hex, opening's actual mark/tagline markup, gates-saving's missing `#cam` wrapper, ranking's actual tower structure) before dispatch, which meant none of the six executors hit a genuine stop-on-ambiguity → six parallel Sonnet executors landed the edits → a fresh-context Fable Inspector independently re-read every changed file, re-derived every timeline's arithmetic by hand, and diffed the shared constants (`MAP_CENTER`/`MAP_ZOOM`/`ROUTE`/`GATES`/`SECTOR_COLORS`) across start-ride/gates-saving/ranking byte-for-byte. It found 3 render-breaking defects (sector fill colours never actually applied despite the ticks changing; start-ride's blackout div had no CSS so the black lead-in wouldn't show; gates-saving's rider carry-over was silently cancelled by a GSAP `immediateRender` default) and 2 design questions (ranking's new row visually crossing through the row it displaces; closing's wordmark colour drifting from yellow to off-white without Nathan asking for that). The 3 defects were mechanical (<10 lines total) and fixed directly by the coordinator; the 2 design questions went to a fresh Fable ruling (not decided in the coordinator's own chat) and the rulings were applied the same way.

`device_bash` was unreachable on Nathan's PC for this entire session (confirmed repeatedly, same as cycles 01/02) — every file operation used the stage/edit-locally/commit fallback. **Nothing in this cycle has been rendered or visually verified.** All six deliverables are source-only, correct by hand-derived arithmetic and independent adversarial inspection, not by an actual render.

## What shipped
| Composition | Round | Planned duration | File(s) changed |
|---|---|---|---|
| brandmark/closing | v2 (first-ever standalone composition) | 4.000s / 120 frames | new `index.html`, edited `README.md`, new `rounds/v2/FEEDBACK.md` |
| brandmark/opening | v3 | 6.500s / 195 frames | edited `index.html`, new `rounds/v3/FEEDBACK.md` |
| start-ride | v4 | 14.000s / 420 frames | edited `index.html`, new `rounds/v4/FEEDBACK.md` |
| gates-saving | v4 | 12.400s / 372 frames | edited `index.html`, new `rounds/v4/FEEDBACK.md` |
| ranking | v4 | 10.000s / 300 frames | edited `index.html`, new `rounds/v4/FEEDBACK.md` |
| teaser | v5 (assembly only, not yet built) | 46.900s / 1407 frames (planned) | new `rounds/v5/concat.txt` + `FEEDBACK.md`, edited `README.md` |

Every composition's `SECTOR_COLORS` (start-ride, gates-saving, ranking) is now byte-identical: `['#3ED598', '#F5C542', '#A667F0', '#3ED598']` (green-yellow-purple-green, per Nathan's "use all the colours"), and now actually paints the sector overlays (`#sec1`-`#sec4` stroke attributes), not just the gate ticks — this was the inspector's most consequential catch, see OPEN-ITEMS.md.

## Known open items, judgment calls, and what Nathan needs to do next
See `OPEN-ITEMS.md` in this folder.
