# Analysis Review — 2026-08-27

## Summary
Clean baseline day: two symmetric ~15-min, ~5.75 km commute rides with no route deviation issues.

## Files
- `qualifire-20260827-0944.gpx` (Morning)
- `qualifire-20260827-1946.gpx` (EveningA)

## Per-ride breakdown

| Ride | Duration | Distance | Points | Route | On-route % | GPS acc | Notes |
|---|---|---|---|---|---|---|---|
| 09:44 | 15.1 min | 5.75 km | 884 | Morning (soft) | — | 118.6 m | routeDistanceM=5325, gates: START/G1/G2/G3/FINISH |
| 19:46 | 15.3 min | 5.75 km | 919 | EveningA (verified) | 99.1% | 16.3 m | 3× GPS spikes (max 119.5 km/h), 9s off-route at start (GPS settling) |

## Key findings
- Both rides follow their locked routes tightly (99.1% on-route for verified EveningA)
- Morning uses "soft" route lock; EveningA verified lock — consistent naming
- Gate naming follows semantic scheme (START, G1, G2, G3, FINISH)
- `qf:routeDistanceM` present for both rides (5325 m)
- No storage errors, no crashes (`storageErrors=0`, `relaunches=0`)

## Anomalies
1. EveningA shows 3 GPS speed spikes up to 119.5 km/h with poor accuracy (16.3 m) — likely artifacts from GPS noise rather than real motion
2. EveningA has 9-second off-route segment at ride start (typical GPS cold-start drift)

## Interpretation needed
- Are the GPS speed spikes expected at this accuracy level? Should the app filter these outliers?
- Is 9s cold-start drift acceptable for route-matching logic?

