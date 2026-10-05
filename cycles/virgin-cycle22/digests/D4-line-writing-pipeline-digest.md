# D4 — live trace vs saved line pipelines (Haiku Digest, 2026-10-04)

Status: Haiku Digest, NOT verified by Inspect. Relevant to: GPS gap (tunnel) straight line, bus-stop kink, live spikes.

## Live yellow trace
WayMapView (wayMapView.tsx:720-727) <- RecordScreen `trail` state (RecordScreen.tsx:311, :403) <- appendTrailPoint
(trailModel.ts). Only filters: finite lat/lon; keep a point only if >= 5 m from the last kept (TRAIL_MIN_STEP_M, trailModel.ts:22/37);
cap 4000 points FIFO (:25); a live 'tail' point appended so the line reaches the rider dot (:64).
NO accuracy filter, NO speed cap, NO gap handling, NO smoothing, arrival order (not time-sorted).

## Saved reference line (what ROUTES shows)
readRideFixes (store/routeFromRide.ts:48) -> chronologicalFixes() -> buildRefFromRideFixes (live/userRefs.ts:68):
drop preStart + warmup flagged fixes; sort by tUnixMs -> collapseStationaryRuns (core/src/reference.ts:132; radius 15 m,
min 20 s; run replaced by ONE centroid) -> buildReference (reference.ts:65): planar XY, 5-FIX zero-padded box smoothing
(k=5, first/last 5 unsmoothed; counted in fixes NOT metres) -> resample at 5.0 m arc-length (core/src/geo.ts:71) ->
round to mm, recompute chainage (userRefs.ts:91) -> stop chainages (userRefs.ts:96).
Min track 200 m (routeCreation.ts:50).

## Gaps / speed
No gap detection or interpolation anywhere: a GPS gap becomes a straight segment, live and saved.
No max-speed or max-jump filter. POOR_ACCURACY_M=50 (engine.ts:164) only anchors the matcher; WARMUP_ACC_M=20,
WARMUP_MAX_S=60 (fixFlags.ts:29-30) define the warm-up flag. Elevation outliers diagnostics-only (D-023).

## Known note
storage/jsonl.ts:85-92: a past ride's reference came out 13.96 km for 5.7 km because file order was scrambled;
fix = all consumers use chronologicalFixes(). The live trail does not.

## Implications to examine (hypotheses, unproven)
- 5-fix smoothing is time-based: ~70 m at 50 km/h vs ~25 m on a bike -> distorts tight bends / roundabouts on fast vehicles.
- Stops: a run < 20 s is NOT collapsed, so a small back-and-forth during a stop survives as a spur (seen in D5 at fixes 369-387, ~8 m).
- Live spikes absent from the final GPX (D5) -> live-only artefact (unfiltered fix, tail point, arrival order). Unverified.
