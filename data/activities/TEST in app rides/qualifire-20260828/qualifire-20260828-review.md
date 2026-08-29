# Analysis Review — 2026-08-28

## Summary
Busiest and messiest day: 3 separate files, including one heavily off-route ride and one low-quality manual gate-test loop. Includes significant route-matching and timing anomalies.

## Files
- `qualifire-20260828-1719.gpx` (MorningB)
- `qualifire-20260828-1854.gpx` (WorkChurchB)
- `qualifire-20260828-1922.gpx` (Gate test loop — likely QA, not real ride)

## Per-ride breakdown

| Ride | Duration | Distance | Points | Route | On-route % | GPS acc | Notes |
|---|---|---|---|---|---|---|---|
| 17:19 | 19.1 min | 5.91 km | 1028 | MorningB (verified) | 100.0% | 100.0 m | 112.8s dead gap after first fix; routeDistanceM=5325 |
| 18:54 | 19.0 min | 5.03 km | 1127 | WorkChurchB (verified) | **11.3%** | 137.0 m | **Off-route for 16.6 of 19 min** (maxDistM=999.0, clamped) |
| 19:22 | 3.5 min | 1.15 km | 202 | (none) | n/a | **443.1 m** | **Manual gate-test loop**: repeating FINISH/gate4 hits, 0 route attempts, 207.7 km/h spike |

## Key findings

### MorningB (17:19) — Good fidelity, timing issue
- Perfect route match (100.0% on-route)
- GPS accuracy excellent (100.0 m)
- **Major anomaly**: 112.8s dead gap between first GPS fix and first trackpoint
  - Metadata `<time>` is ~2 min before real movement begins
  - `startPressedAt` timestamp postdates the gap resolution by ~2s
  - Will skew any duration/pace metric computed from raw first/last trackpoint timestamps
- `qf:routeDistanceM` present (5325 m)
- Gate naming uses generic scheme (gate0…gate4, not semantic)

### WorkChurchB (18:54) — Critical route-matching failure
- **Only 11.3% of ride is on the locked route**
- GPS accuracy poor (137.0 m)
- Spends 16.6 minutes (87% of ride duration) with max distance = 999.0 m (clamped at detector max)
- Same "verified" lock status as MorningB, but opposite behavior
- `qf:routeDistanceM` **absent** (inconsistent with lock type)
- Either route-locking picked wrong candidate, or rider deviated significantly

### 19:22 Gate test — QA/diagnostic, exclude from real-ride stats
- Only 3.5 min, 1.15 km, 202 points
- Worst GPS accuracy of entire dataset (443.1 m)
- No route lock assigned
- Gate hits repeat (FINISH, gate4, FINISH, gate4, ...) — characteristic of looping in one area
- 0 route-matching attempts (vs. 21–61 on real rides)
- Single 207.7 km/h GPS spike (artifact)
- **Likely a manual QA loop testing gate-trigger logic**

## Anomalies & questions

1. **112.8s dead-time gap** (17:19): Why does the first GPS fix precede actual movement by ~2 min? GPS cold-start taking this long, or app not recording initial fixes?
   
2. **WorkChurchB massive off-route** (18:54): Is this a genuine route-matching failure, or did the rider actually deviate? The "verified" lock status suggests the app thought it had locked correctly.

3. **Inconsistent `qf:routeDistanceM`**: MorningB has it, WorkChurchB doesn't. Both are "verified" locks. Is this intentional (only soft locks get it?) or a bug?

4. **Gate naming inconsistency**: 17:19 and 18:54 use generic `gate0…gate4` names, but the 19:22 loop uses `FINISH`/`gate4`. Different code paths?

5. **Should 19:22 be excluded** from any official test aggregate? It's clearly not a real route ride.

