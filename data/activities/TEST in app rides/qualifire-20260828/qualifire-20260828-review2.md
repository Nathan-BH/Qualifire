# Review 2 — Rider Interpretation — 2026-08-28

## Ride 1: 17:19 (MorningB in app, actually HomeWorkWet)
**Nathan's account:** Mostly correct execution. Chain came off mid-ride → pressed pause → fixed chain → pressed continue → all gates fired.

**Technical review alignment:**
- Perfect route-lock performance (100.0% on-route, `qf:routeDistanceM=5325`)
- 112.8s dead-time gap after first GPS fix: **explains the pause/fix interval** — app was tracking but rider wasn't moving
- No anomalies detected; clean gate sequence

**Interpretation:** Chain stoppage is captured in the GPS/timing data. Pause handling appears correct.

---

## Ride 2: 18:54 (marked WorkChurchB, should have been WorkHomeWet)
**Nathan's account:** 
- Started as WorkHomeWet, gate 0 fired correctly
- Took alternative route between gate 0 and gate 1 (within sector 1)
- Alternative route overlapped with WorkChurch route → app auto-switched to WorkChurchB
- Chain came off again → pressed pause → continued
- Chain came off second time closer to home → ended the ride
- Never locked back to WorkHomeWet

**Technical review alignment:**
- Only 11.3% on-route to locked route (WorkChurchB): **explains the massive deviation** — this was the intentional alternative route, then app switched
- GPS accuracy poor (137.0 m): **consistent with rider following non-standard path**
- 16.6 minutes off-route (87% of ride): **matches the pause-based chain incidents and extended alternative routing**
- No `qf:routeDistanceM`: **route switching or fidelity state change may have cleared this**

**Interpretation:** Auto-switching to WorkChurchB based on overlapping geometry is working as designed, but the app did not re-lock to the original WorkHomeWet after the route deviated. Pause handling worked; chain incidents logged via timing gaps.

**Question for next cycle:** Should route-lock include logic to re-detect and re-lock the original route after a pause, or is "lock until end" the correct behavior?

---

## Ride 3: 19:22 (final meters, unclear route selection)
**Nathan's account:** Chain came off a third time; just started app for final meters to home. May have selected NewHome route (uncertain).

**Technical review alignment:**
- 3.5 min, 1.15 km, 202 points, 443.1 m GPS accuracy: **low fidelity, short duration consistent with "final meters" narrative**
- No route lock assigned: **matches uncertainty about which route was selected**
- Repeating FINISH/gate4 gate hits: **characteristic of loop-like trajectory or manual QA testing**
- 0 route-matching attempts (vs. 21–61 on real rides): **route-matching didn't engage**

**Interpretation:** This is borderline between a real ride fragment (final meters) and a diagnostic/test artifact. The repeating gate pattern suggests either GPS noise at home location or app behavior not optimized for sub-1km ride completion. Exclude from performance metrics for now.

---

## Cross-ride summary
- Route auto-switching works but doesn't re-lock to original
- Pause/resume for chain maintenance is logged in timing data
- Alternative routing within a sector can trigger unexpected auto-switches
- Home location may have edge-case gate-firing behavior

