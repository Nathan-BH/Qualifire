# D6 — why the ACTIVITIES map looks doubled (coordinator, 2026-10-04 ~22:00; reproduced offline, not Inspect-verified)

Nathan's observation: the whole yellow line on the ACTIVITIES map is two lines that mostly overlap; the doubling shows at turns and
the roundabout, which is circled 4x instead of 2x.

## Explanation (SUPERSEDES the sector-span hypothesis in D1 item 6)
Two different yellow lines are drawn on RideDetailScreen's map (D1 correction items 1-3):
1. the REFERENCE line (stored by ROUTES; built by collapse-stationary -> 5-fix smoothing -> 5 m resample, D4);
2. the RIDDEN TRAIL (`trail={fixes}`): the raw fixes, only 5 m-decimated.
On a first ride the reference IS this ride, so the two coincide on straight stretches (median offset 0.2 m) and part at bends/roundabouts
where the smoothing rounds off GPS wobble and stop spurs. Each roundabout pass is drawn twice (raw bulge + smoothed circle) -> 2 passes x 2 lines = 4 circles.
ROUTES draws only line 1 -> looks clean. Not a data bug and not a sector-slice bug.

## Evidence
Offline reproduction of the reference build on the real GPX (D6-sim-raw-vs-reference.py/.png): reference-vs-raw offset median 0.2 m,
p95 1.4 m, max 7.0 m (stop spur); in the roundabout area median 0.5 m, max 3.6 m. The picture shows a clean smoothed circle inside a
wobbly raw bulge on each pass. (Simulation follows reference.ts constants from D4; the real code was not run.)

## Options for the Plan tier / Nathan (not decided)
A. ACTIVITIES shows only the ridden trail (this ride) and no base reference line; ROUTES shows the reference. (Two tabs, two honest jobs.)
B. ACTIVITIES shows the reference only (no trail) when the ride IS the way's reference (first ride / promoted ride); keep the trail for later rides.
C. Keep both but make the trail visibly distinct (thin, different colour) so doubling reads as "your actual GPS vs the cleaned line".
D. Separately (D4): make the smoothing distance-based so it does not over-round tight bends at bus speed.
Check before choosing: why the trail is in yellow (same as base core) on this screen; sector spans also paint over the reference (D1 item 5).
