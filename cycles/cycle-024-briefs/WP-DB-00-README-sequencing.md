# WP-D / WP-B — coordinator sequencing note (not an executor brief)

Order (hard dependencies): **WP-D1 → WP-D2 → WP-D3 → WP-B.** WP-B additionally sequences AFTER WP-A's RECORD/RIDES/RESULT redesign and after cycle 023 lands (shared files: RecordScreen.tsx, ResultScreen.tsx, routeMapView.tsx, demos/mockup.html).

Nothing writes to the repo until cycle 023 lands (analysis-only phase rule).

Key analyst findings the coordinator should know when ordering against 023 and WP-A/WP-E:
- **Naive "just add 19 candidates" would break the daily commute**: Morning's road is 98% inside HomeStationPreferred's corridor (they separate only ~110 m before work), so today's 400 m/200 m lock rule would never fire on a Morning ride. WP-D2's anchored rule + pick soft-lock ("lock-then-verify", Nathan's 2026-08-20 ruling) is the fix; the measured shadow pairs are listed in WP-D2.
- Both reference promotions verified and PROMOTE: ride 1's 18.4-min hole spans 6.9 m on the ground (line complete; median 7.9 m from the old reversed-evening stand-in); ride 3 is genuinely a different road from the preferred station→home line (median 211 m, 60% of points >40 m away) and starts 59 m from the station / ends 1 m from home.
- Files with HIGH 023-conflict risk across these briefs: `RecordScreen.tsx` (D2, D3, B), `routeMapView.tsx` (D3, B), `engine.ts`/`location/index.ts` (D2, B — check 023's off-route investigation diff first).
- Test-count deltas if baselines hold: D1 +5, D2 +11, D3 +3, B +5 (total +24 over the post-023 baseline).
- Bookkeeping owed elsewhere (NOT in these briefs): DECISIONS.md entry for the 2026-08-20 pick-bias ruling; follow-up edits to B-41 and COLD-START.md §10; BACKLOG status updates for B-39/B-60/B-65.
