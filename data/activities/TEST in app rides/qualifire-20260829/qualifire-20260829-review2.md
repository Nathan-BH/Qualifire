# Review 2 — Rider Interpretation — 2026-08-29

## Ride: 10:55 (HomeStationPreferred)
**Nathan's account:**
- Uneventful ride overall
- Clocked sectors 1–3 correctly
- Sector 4 marked as "did not traverse" in app
- Took slightly different route than current reference
- Possibly missed gate 3 (suspected reason for sector 4 skip)

**Technical review alignment:**
- Longest and farthest ride of test set (23.7 min, 8.48 km, 1417 points)
- Excellent GPS accuracy (40.1 m)
- Soft route lock on `HomeStationPreferred`
- **No gate data in extensions block**: expected if sector 4 was not traversed
- No fidelity block (on-route % unavailable), but no anomalies in track data itself
- Geographic bbox extends well north of 27th/28th routes

**Interpretation gap:**
- App shows sectors 1–3 clocked but marks sector 4 as "did not traverse"
- Nathan suspects missed gate 3 as the cause
- Technical data doesn't contain explicit per-sector timestamps or gate-miss events (those would be in `qf:attempt` matching traces, not in summary `qf:session`)

**Questions for next cycle:**
1. **Where is the sector-traversal status logged?** It appears in the app UI but isn't visible in the GPX+ extensions we're analyzing. Are there per-gate timestamps in `qf:attempt`?
2. **Did rider actually miss gate 3, or did GPS miss the gate trigger?** With 40.1 m accuracy, gate detection should be reliable, but the "slightly different route" may have passed the gate outside its trigger radius
3. **Is the `qf:routeDistanceM` absence expected for this ride?** (Same as 28th anomaly — soft locks should populate this consistently)

**Next steps:**
- Check raw `qf:attempt` matching logs for gate 3 miss/hit status
- Compare actual rider trajectory near gate 3 vs. expected gate waypoint
- Verify trigger radius vs. route deviation distance

---

## Summary
Clean technical execution; misses appear to be either GPS/trigger-radius edge cases or intentional minor route deviations by rider. No crashes or fidelity warnings, but sector-completion status is not visible in GPX+ extension — need deeper log inspection.

