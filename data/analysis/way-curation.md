# Way curation — Nathan's per-ride verdicts, 2026-08-16

Nathan reviewed the way maps ride by ride. Verdicts are recorded in `ride_curation.json` **keyed by filename** (the 1–N numbers on the pages are page-order and would rot the moment sampling changes) and rendered back onto `demos/ways/*.html`: ignored rides are struck through, drawn grey-dashed, and start hidden — a reversible record, never a deletion.

**59 keep · 12 ignore · 5 unreviewed · 13 dropped ways** (puttestraat loops, work loop).

Each verdict was checked against the traces. Nathan was right about everything he asserted, with one number mix-up noted below, and the measurements answer several of his open questions.

---

## Confirmed by measurement

| Claim | Evidence |
|---|---|
| church–home **3 & 5 are identical** | 0.96 path overlap — the same road twice |
| church–home **1 is a bad, much longer route** | 8.45 km / 122 min vs 6.3–6.8 km / ~17 min; also a 433 m GPS jump |
| church–home **2 has a detour** | 11.36 km — nearly double the clean rides |
| puttestraat→work **11 is impossible, straight lines over buildings** | 2338 m single-point jump; overlap with every other ride 0.44–0.52, the lowest in the set. A recording artifact, exactly as called |
| work→puttestraat **4 stops at the Okay in Vossem** | 9.7 min inside 150 m of 50.832227, 4.565008 — confirmed at the coordinate given |
| home–station **9 & 10 are the recent standard and avoid fosh** | closest approach to fosh 547 / 549 m, vs 4–9 m for 4/5/6/7/8/11 |
| home–station **9 & 10 are the better route** | also the shortest: 8.67 / 8.74 km vs 9.08–9.48 km for the rest. The preference is measurable, not just habit |
| home–work **7 mirrors the two work→home routes** | 0.71–0.73 overlap with 4/5/10 (Evening B) and only 0.01–0.05 with the Morning cluster — 7 *is* the home→work version of Evening B |
| home–work **8 is a really off run** | 10.89 km / 102 min, 2529 m jump |
| station–work **3 is a bad route** | matches nothing: 0.11–0.21 with every other ride |
| station–work **9 & 10 are the same**, 2 is a valid alternative | 9↔10 = 0.85; 2 is the reverse of 1 at 0.75; 8 is the reverse of 9/10 at 0.76–0.79 |

## One correction

On fosh–home you noted a stop at work on **2 & 4**. Measured, it is the other pair: **1 and 3 sit at work for 57 and 150 minutes** (they are the 152- and 173-minute rides). Rides 2 and 4 are the clean fast ones — 24.4 and 22.4 min, with only ~36 s inside 120 m of work, i.e. a pass, not a stop. If the local warping you saw is on 2 & 4, it is a brief pause or GPS wobble at the work end rather than a real stop; if you meant "the two long ones", that is 1 & 3. Worth an eyeball on the page before we act.

**On smoothing it out.** Two separate problems, worth not conflating: for *timing* a stop is already handled — moving time excludes it (D-008), which is why a 150 min ride can still hold a clean lap. For the *line*, the fix is a stationary-run collapse: where consecutive fixes stay inside ~15 m for more than ~20 s, replace the whole run with one centroid point. That removes the parked-bike drift blob from the map and, more usefully, stops it polluting the reference polyline that D-011 projects onto. Cheap, offline, and it belongs to the reference-building step rather than the recorder — raw stays raw (D-023).

## Answers to the "what are the true alternatives?" questions

**fosh ↔ home — the asymmetry is real.** The three fosh→home rides (1, 3, 4) share one corridor (0.70–0.76). The single home→fosh ride (2) overlaps them by only **0.13–0.17** — it takes a genuinely different way out. So this way currently has *two* routes, one per direction, and the outbound has exactly one example. Worth riding again before it becomes a reference.

**fosh ↔ puttestraat — no real alternatives.** All eight are 17.8–18.4 km with pairwise overlap 0.60–0.92, tightening to 0.85–0.92 among the later rides (5–8). One route with normal variation; ride 1 is the most distinct (0.60–0.71) but not a separate road. Treat as a single route seeded by the recent rides.

**home ↔ station — three families, and your preference is the shortest.**

| Family | Rides | Character |
|---|---|---|
| **Direct (preferred)** | 9, 10 | 8.67–8.74 km, avoids fosh (547 m), 0.74 to each other |
| Via fosh, outbound | 4, 6, 8, 11 | 0.89–0.92 among themselves, passes fosh at 4–9 m |
| Via fosh, return | 5, 7 | 0.85 to each other but only ~0.24 to the outbound family — the return uses different roads |
| Odd one out | 2 | matches nothing above 0.53 — left **unreviewed** |

If you want two agreed options rather than many, the honest split is **"direct" (9/10)** and **"via fosh"** — but note the via-fosh family is not one route: out and back use different roads, so it would be two routes under D-010's per-direction rule, or one route you accept asymmetrically.

**home ↔ work — ride 7 is the missing mirror.** Confirmed above. Adopting it gives a symmetric set: Morning A / Evening A (the current corridor) and Morning B / **Evening B** (the asphalt, no-dirt-track rain route). Note it currently has **one** example, so it seeds a reference but not a benchmark distribution — the first few rides on it will be neutral by D-008's <5-clean-rides rule regardless of the colour model.

## Still open

- **station–work rides 4, 5, 6, 7** were not reviewed (they are station→work; 6 & 7 pair at 0.84 and may be a third route). Marked `unreviewed`, not ignored.
- **home–station ride 2** — same, unreviewed.
- **puttestraat→work 1, 2, 3** are ignored on your roadworks account, which the data cannot see: they overlap the kept rides at 0.70–0.81, so they are not obviously different roads. The verdict stands on your knowledge, and the note records why.
