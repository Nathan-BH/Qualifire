# Analysis Review — 2026-08-29

## Summary
Single longer, geographically distinct ride. Not directly comparable to the short in-town commute loops of Aug 27–28, but shows clean execution with no anomalies.

## Files
- `qualifire-20260829-1055.gpx` (HomeStationPreferred)

## Ride metrics

| Ride | Duration | Distance | Points | Route | On-route % | GPS acc | Notes |
|---|---|---|---|---|---|---|
| 10:55 | 23.7 min | 8.48 km | 1417 | HomeStationPreferred (soft) | — | 40.1 m | Longest/farthest ride; bbox extends well north of Aug 27–28 routes |

## Key findings

- **Longest and farthest ride of the test set**: 23.7 min, 8.48 km, 1417 trackpoints
- **Excellent GPS accuracy**: 40.1 m (best of all recorded routes except MorningB's 100.0 m edge case)
- **Soft route lock** (not "verified") on `HomeStationPreferred`
- No storage errors, no crashes (`storageErrors=0`, `relaunches=0`)
- Gate naming **absent** (no gates in extensions block)
- `qf:routeDistanceM` **absent** (same pattern as WorkChurchB: soft locks on 29th but not on 27th 09:44, inconsistent)
- Geographic bbox extends well north — different route/location than the 27th/28th commute loops

## Anomalies

1. **Inconsistent `qf:routeDistanceM` for soft locks**: 
   - 27th 09:44 (soft lock, Morning): has `qf:routeDistanceM=5325`
   - 29th 10:55 (soft lock, HomeStationPreferred): **absent**
   - This should be consistent if the field depends only on lock type

2. **No gate data**: Unlike 27th/28th rides (which all have gate hits in extensions), 29th ride has no gates recorded. Is this expected for this route/location, or was gate recording disabled?

## Interpretation needed

- Is the absence of `qf:routeDistanceM` on this ride expected, or a bug?
- Why no gates recorded? Is gate instrumentation route/location-specific?
- How does performance compare to 27th/28th rides? (Geographic separation makes direct comparison difficult, but GPS accuracy is notably better here)

