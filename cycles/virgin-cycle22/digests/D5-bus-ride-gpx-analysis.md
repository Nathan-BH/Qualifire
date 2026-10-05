# D5 — bus ride GPX analysis (coordinator, 2026-10-04)

File: data/activities/TEST in virgin-app rides/qualifire-20261004-0906.gpx (Qualifire export, 1233 fixes, 1233 s, 9.84 km).
- 1 Hz, dt 1.0-1.075 s, no gaps, no out-of-order timestamps.
- Largest step between consecutive fixes: 17.1 m (max speed 85 km/h). No jump > 40 m. A 100 m spike is NOT in the exported fixes.
- Accuracy: median 7.9 m, max 36.6 m, 28 fixes > 20 m, none > 50 m. First exported fix has acc 18.5 m (earlier warm-up fixes probably excluded).
- Roundabout area (local x 2600-2950, y 4290-4450, fixes 783-957): the bus passes the roundabout TWICE (first ~t 800-830 s,
  second ~t 920-950 s) and, between them, makes a pickup loop to the west (~t 840-880 s) retracing ~100 m of road in both directions.
  So 2 roundabout circles + a genuinely doubled ~100 m stretch exist in reality.
- Stop near fix 316-484: stationary 52 s, then 18 s displaced ~8 m, then 95 s back at the first spot. The 18 s block is below
  the 20 s collapse threshold (reference.ts:135), so the kink is a real spur in the raw data.
- Conclusion: raw data does not contain the live spikes nor 4-5 circles. The faulty ACTIVITIES overlay is produced downstream (see D1).
- Needed to close the case: screenshot of the ACTIVITIES map, and the ride JSONL from the phone (to compare with this GPX).
