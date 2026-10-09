# Exec report: brief 12 map white flash (Sonnet execute)

Status: DONE. All steps in sections 3-8 applied exactly; no deviations, no stops.
Note: `?? cycles/virgin-cycle27/12-brief-map-white-flash.md` was also untracked at start (the brief itself).

Files changed: app/src/ui/wayMapView.tsx (6.1-6.7), app/src/ui/catalogMapView.tsx (7.1-7.7), app/tests/run.ts (+1 import).
New: app/src/ui/mapStyleCache.ts, mapCoverModel.ts, mapCover.tsx, app/tests/mapcover_suite.ts.
ui-strings.allow.json untouched. Nothing under app/modules, app.json, app.config.js, package.json, eas.json.

Tests: before 967 (964 pass, 0 fail, 3 skip); after 971 (968 pass, 0 fail, 3 skip).
tsc --noEmit: exit 0 (log: 12-brief-12-tsc.log, empty = clean output).
Native rendering NOT verifiable here (static checks only).

Inspector: (a) useMapCover precedes early returns in both views (wayMapView hook sits right after the setMode(initialMode) effect, before the riderOnly return); (b) MapCover is after </M.Map>/</View>, before zoomBar; (c) seen/opacity reset per key via useMemo([key]); (d) rememberPatchedStyles only in the success path.

OPEN-ITEMS line: "virgin-cycle27 12 (map white flash): on-device check needed — tab switches RECORD/ACTIVITIES/MAP at night show the dark frame colour, then the map fades in; START/finish label flips and a day/night flip do the same; +/−/FIT/ME still tap through; offline (airplane mode, nothing cached) shows the plain offline map with no cover."
