# Qualifire 2026-08-20 Test Rides Review (Rides 1–3)

**Reviewed by:** Model-tier analysis (Sonnet subagent)  
**Date:** 2026-08-20  
**Scope:** 3 in-app development rides with GPX+ data export  
**Files:** `qualifire-20260820-0912.gpx`, `qualifire-20260820-0936.gpx`, `qualifire-20260820-1157.gpx`

---

## Summary

All three rides successfully exported valid GPX 1.1 + GPX+ (custom `qf:` namespace) data. **Route/sector detection backend is working correctly** — the UI rendering issue in Ride 1 (missing line/dot) is confirmed as a rendering-layer bug, not a tracking bug. Off-route detection (Ride 2) works as designed. Route lock failure in Ride 3 traces to poor initial GPS accuracy, suggesting the route-matching threshold may be too strict or needs a post-settle retry.

---

## Ride-by-Ride Findings

### Ride 1 — 09:12 (home >> work-dry, h>>w-d)
**File:** `qualifire-20260820-0912.gpx` (180,657 bytes)  
**Duration:** 18:03 (1083.3s)  
**Points:** 921 trackpoints @ ~1 Hz

#### Data Quality
- **Route lock:** ✅ `track="Morning"` atChainageM=400.34
- **Sectors (gates):** ✅ All 5 expected (START, G1, G2, G3, FINISH) with `estimated="false"` (real GPS crossings, not interpolated)
- **Timing:** Clean 1 Hz sampling (median delta 1.000s, mean 1.178s)
- **Outages:** 1 gap (07:12:43–07:15:24, 160.7s) = first-fix-before-button-press idle period — expected and benign
- **Elevation:** One outlier spike (+10.7m in 1s at 07:30:45.857, end of ride) — barometer/GPS blend glitch, not real climb
- **Storage:** No errors, no relaunches

#### Key Finding
**The on-screen rendering bug is confirmed isolated to the UI layer.** Nathan reported "no ride line overview, no personal dot, no sector line visible" — but the GPX+ `qf:gates` block proves all 5 sectors were internally detected and logged correctly. The backend route/sector engine is working; the problem is that the day-mode rendering system failed to draw the visual feedback. This is a **rendering bug, not a tracking bug**.

#### Recommendation
- [ ] Check day-mode map rendering pipeline (line/dot/sector drawing)
- [ ] Verify day-mode style/visibility configuration is applied correctly
- [ ] Test that other ride modes (e.g. night) render the same route

---

### Ride 2 — 09:36 (work >> new location, w>>n)
**File:** `qualifire-20260820-0936.gpx` (46,939 bytes)  
**Duration:** 4:59 (299.3s)  
**Points:** 233 trackpoints @ ~1 Hz

#### Data Quality
- **Route lock:** ✅ Initial lock to `track="EveningA"` atChainageM=405.86, then **holds no further updates**
- **Sectors (gates):** ⚠️ **Only START gate** — no G1, G2, G3, FINISH detected
- **Timing:** Clean 1 Hz except start (66.4s pre-button-press + 6s mid-ride pause)
- **Outages:** Two: initial 66.4s (first-fix idle, expected), mid-ride 6s pause (actual rider stop)
- **Elevation:** One outlier spike (−13.5m in 1s at 07:40:37.857) — barometer/GPS glitch, consistent with Ride 1
- **Storage:** No errors, no relaunches

#### Key Finding
**Off-route detection is working as designed.** Once the rider left the "EveningA" route, no further gates could be crossed geometrically, so sector logging correctly stopped. The file only contains START — no false gates downstream. However, **there is no explicit per-point "distance to route" or "on-route/off-route" boolean field** in the current GPX+ schema. Route fidelity has to be inferred indirectly from `routeLock` + gate presence. This is a **schema gap** if Nathan wants to quantify how far off-route the rider drifted.

#### Recommendation
- [ ] Consider adding per-point field (or session-level summary) with "distance to nearest route" or off-route distance threshold
- [ ] Alternatively, log a waypoint/marker at the exact divergence point for post-ride analysis
- [ ] Clarify whether off-route logic should trigger on distance threshold or gate-crossing failure (currently appears to be gate-only)

---

### Ride 3 — 11:57 (unknown location >> work, n>>w)
**File:** `qualifire-20260820-1157.gpx` (45,324 bytes)  
**Duration:** 3:59 (238.5s)  
**Points:** 226 trackpoints @ ~1 Hz

#### Data Quality
- **Route lock:** ❌ `routeLock="none"` (no `track`/`chainage`/`time` attributes) — no route match found
- **Sectors (gates):** ❌ **No `<qf:gates>` block at all** — zero sectors, as expected for a non-locked ride
- **Initial fix accuracy:** ⚠️ **Poor (up to 97.7m for first ~13s)**, vs. typical cruising accuracy of 4–6m across all three rides
- **Outages:** Two short gaps (7.375s, 5.363s) after button press, during poor-accuracy window
- **Elevation:** One outlier spike (+4.9m in 1s at 09:59:19.834) — smallest of the three, same glitch class
- **Storage:** No errors, no relaunches

#### Key Finding
**Route lock failure is likely due to poor initial GPS accuracy, not just "unknown location."** The device took ~13s to settle to a good fix (97.7m → ~6m), during which the route-matching window was open. If the route matcher requires high accuracy or times out before the fix settles, it will miss. This suggests either (a) **the route-matching threshold is too strict**, or (b) **the matcher should retry once accuracy improves** rather than giving up after the first attempt.

#### Recommendation
- [ ] Log route-match attempt metadata: accuracy at match time, threshold used, match distance/angle deviation, retry attempts
- [ ] Consider a two-phase match strategy: fast attempt at first fix, then retry on accuracy threshold improvement
- [ ] Test route matching with deliberately poor accuracy to quantify the sensitivity

---

## Cross-Ride Observations

### File Size vs. Point Count
Bytes per point is nearly identical: 196.2 B/point (R1), 201.5 B/point (R2), 200.5 B/point (R3).  
**→ File-size variation is driven by ride duration, not data richness. No quality concern.**

### Consistent Pre-Button-Press Pattern
All three rides show:
1. GPS fix acquired minutes before the Start button is pressed
2. Single lone first trackpoint logged at `firstFixAt`
3. One `qf:outage`/`qf:stop` pair bridging the idle gap
4. Clean ~1 Hz tracking from button-press onward

This appears to be intentional "pre-buffer" behavior (capturing position before the user is ready), not a bug. **Worth documenting** if external tools/dashboards naively parse GPX (that first gap will throw off calculated average speed/density).

### Recurring Elevation Glitch
Every ride has exactly one barometric/GPS altitude spike:
- Ride 1: +10.7m in 1s
- Ride 2: −13.5m in 1s
- Ride 3: +4.9m in 1s

Same signature across all three suggests a **systematic barometer recalibration or GPS-vs-barometer blending transition**, not random outliers. If elevation/climb is exposed in ride summaries or analytics, this glitch will corrupt those calculations.

#### Recommendation
- [ ] Investigate altitude source logic (barometer calibration, GPS altitude weighting)
- [ ] Add elevation smoothing/outlier rejection (e.g., flag/reject spikes >5m in 1s)
- [ ] If barometer is being used, ensure it's re-calibrated before or after each ride

### Missing Route-Fidelity Field
**Current GPX+ schema does not include per-point route-distance or on/off-route status.** Only coarse proxies exist:
- `qf:routeLock` (which route track, if locked)
- `qf:gates` (which sectors were crossed)

**Gap:** Nathan's notes mention seeing "off-route sometime while perfectly on course" in Ride 4 (evening ride, not reviewed here). Without per-point on/off-route data, auditing route-detection accuracy from GPX files alone is difficult.

#### Recommendation
- [ ] Add session-level summary of on-route vs. off-route time/distance if not already tracked
- [ ] OR add per-point `<qf:routeDist>` (distance to nearest route) and/or `<qf:onRoute>` boolean
- [ ] Log route-match diagnostics (chainage, deviation, accuracy at match time) for post-ride analysis

---

## Summary Table

| Ride | Date/Time | Route | Sectors | Duration | Points | Initial Accuracy | Issue |
|------|-----------|-------|---------|----------|--------|---|---|
| 1 (h→w-d) | 09:12 | ✅ Morning | ✅ 5/5 (all `estimated="false"`) | 18:03 | 921 | ~5m | ⚠️ UI rendering bug (line/dot missing) — backend correct |
| 2 (w→n) | 09:36 | ✅ EveningA | ⚠️ 1/5 (START only) | 4:59 | 233 | ~5m | ✅ Off-route correctly logged; no per-point distance field |
| 3 (n→w) | 11:57 | ❌ none | ❌ 0/5 | 3:59 | 226 | ❌ 97.7m (poor) | ⚠️ Route lock failed, likely due to accuracy threshold |

---

## Data Export Assessment

✅ **GPX+ schema is working well:**
- Valid GPX 1.1 with custom `qf:` extensions
- All expected session metadata present (appVersion, startPressedAt, firstFixAt, routeLock, gates, outages, stops, etc.)
- Coordinates/times are valid and consistent

✅ **Point-level accuracy is good:**
- Clean ~1 Hz sampling
- Horizontal accuracy values reasonable (4–6m cruising, higher at start/end)

⚠️ **Known gaps/glitches:**
- Elevation outliers (barometer/GPS blend glitch)
- Route-fidelity field missing (per-point on/off-route or distance to route)
- No route-match diagnostics logged

⚠️ **Rendering layer issue (Ride 1):**
- Route/sector detection backend works; UI does not draw visual feedback

---

## Next Steps

1. **Urgent:** Debug Ride 1 day-mode rendering pipeline (line/dot/sector visibility)
2. **High:** Audit route-matching logic sensitivity to initial GPS accuracy; consider post-settle retry
3. **High:** Add elevation outlier filtering (1-second spike threshold)
4. **Medium:** Extend GPX+ schema with per-point or session-level route-distance/on-route status
5. **Medium:** Document pre-button-press point buffering behavior (expected or bug?)
6. **Medium:** Investigate why "off-route" flag sometimes triggers while "perfectly on course" (Ride 4 evening; outside review scope but flagged in notes)

---

*Review completed by Sonnet subagent analysis pipeline.*
