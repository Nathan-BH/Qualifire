# Cycle 014 — 2026-08-17

Trigger: Nathan — "find a definite solution for a real map in the app, using the model-tier protocol; Strava's map as inspiration". Design/decision cycle, Fable chat as Principal.

## Rulings

Map on EVERY screen incl. live ride (overrules D-033); free options only, free-tier account acceptable if flagged; online-first fine ("I usually have 5G on"); one dev-client rebuild fine.

## What shipped

**D-041 — map stack settled:** `@maplibre/maplibre-react-native` 11.3.6 + OpenFreeMap vector styles online (`dark`/`positron`, no key) + ambient cache; Protomaps PMTiles z0–15 optional offline; route/gates/dot as GeoJSON layers; PNG kept as fallback. Rejected: expo-maps (alpha, Google key + billing), @rnmapbox/maps (account/token, no gain at 1 user), WebView+GL JS (second engine, battery), PNG-only (no heading-up). Satellite LATER (Esri imagery needs key); 3D terrain NON-GOAL (flat Leuven; MapLibre Native Terrain3D roadmap only). D-032/D-034/D-035 relaxed.

Files landed: `product/MAP-STACK-OPTIONS.md`, `product/MAP-TILES.md`, `product/MAP-CONTRACT.md`, `scripts/spike-maplibre.ps1` (written, NOT run). Backlog: B-50…B-58 added; B-34 SUPERSEDED; B-46 NEEDS NATHAN; B-47 after B-50; B-32 reworded.

## Inspector findings

OpenFreeMap `dark` style EXISTS (tiles doc said no); Protomaps host `build.protomaps.com/YYYYMMDD.pmtiles`, z0–15 only; MapLibre RN v11 uses `trackUserLocation`/`bearing`/`pitch` not v10 `heading`; v11 style rewritten with real positron layer ids; script bugs fixed: repo-root path, dirty-check, PS 5.1 `-Depth`, app.json BOM, discard-branch, `.so` checks, `$LASTEXITCODE`.

## Process notes

Cloud sandbox has NO npm/tile-server access (403) — spikes run on Nathan's PC. Tokens: Haiku ~28k; Sonnet members ~98k/~87k/~115k; Fable inspector ~100k; Sonnet fixes ~132k; Haiku check ~42k; Librarian ~46k.

Status: Cycle 014 files LANDED; Nathan runs spike; §29 ruling now independent of map; B-32 dark/light after B-50.
