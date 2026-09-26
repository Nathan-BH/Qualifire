# Cycle 22 -- teaser-lanes: configurable video source + a kit for teaser-full

Goal (Nathan, 2026-09-26): teaser-lanes.html and prep_kit.py are hardcoded to the old
concat-pipeline video (`teaser_v9.mp4`, 47.6s/1428 frames). Cycle 21 replaced that with
`teaser-full` (one real HyperFrames render, 47.3s/1419 frames). Nathan wants:
1. teaser-lanes able to choose which mp4/kit it loads (not hardcoded to one video).
2. The new teaser-full render pre-loaded as the default.
3. A new kit + a starting arrangement built to fit the new render.

Not in scope: picking between rides-options A vs B (still Nathan's open call from
cycle 20 OPEN-ITEMS #3) -- any default arrangement this cycle produces is a provisional
placeholder, not a resolution of that choice.

Status: brief v1 fully executed and verified. The executor stopped on 2 real brief-internal contradictions while
implementing §5.3/§5.4/§7.3; a fresh-context Fable ruling (RULING-v1.md) resolved both, the executor applied them
and wrote `tests/e2e-served.mjs`, and the full §8 checklist now passes end to end (231/231, 390/390, 20/20 mutants,
18/18 served, 86/86 and 69/69 real-kit). Nothing left NOT RUN except the Windows-only `serve.ps1` and the
"Only Nathan can verify" items. See EXECUTOR-REPORT-v1.md, OPEN-ITEMS.md and RULING-v1.md.
