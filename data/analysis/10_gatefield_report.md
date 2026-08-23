# Gate-field offline replay -- evidence document (WP-H, cycle 024)

## 1. What we tested

Your gate-field idea from the 19 Aug notes (point 4): instead of routes, scatter free-floating
"gates" on the roads you ride often, and have each one fire whenever it's crossed, computing
section times between whichever gates actually fired -- no route identity required.

We replayed this model **offline** against your own 125 archived home<->work rides
(64 Morning, 32 EveningA,
29 EveningB -- `data/analysis/cache/*.npz`). **No app was changed.**
This only answers "is the idea good, on the evidence?" -- it does not build anything.

**Known limitation, stated up front:** every cached ride is on the home<->work corridor. There is
no archived evidence for the station, church, or fosh legs -- the gate field's behaviour on those
roads is untested here.

## 2. The field we built

95 gates, one per gate slot on each of your 19 ratified routes (5 gates x 19 routes). Each gate
got:
- a **position** (from `routes.json`),
- a **direction** (bearing), taken from which way the route travels through that point,
- an **80 m crossing line** (the corridor half-width, ±40 m) perpendicular to that direction.

Many of those 95 gates sit on the same physical road -- different routes share streets. Clustering
gates within 30 m of each other and pointed the same way (within 30°) collapsed the 95 gates down
to **86 physical clusters**. Gates pointing opposite ways on the same road (e.g. your
morning gate vs. the equivalent evening gate on the same street, ridden in reverse) were correctly
kept separate -- the direction rule is what makes that possible.

## 3. What fired

- **Morning** (64 rides): valid hits per ride -- median 17 (range 11-17). Wrong-direction events: 699. Suppressed GPS-jitter re-fires: 1. Foreign-gate valid hits: 0 colocated with one of your own gates (harmless double-count, same physical line), **708 genuinely foreign** -- a parallel street or a crossing route's gate would have beeped at you that many times across all 64 rides.
- **EveningA** (32 rides): valid hits per ride -- median 10 (range 6-27). Wrong-direction events: 491. Suppressed GPS-jitter re-fires: 1. Foreign-gate valid hits: 29 colocated with one of your own gates (harmless double-count, same physical line), **161 genuinely foreign** -- a parallel street or a crossing route's gate would have beeped at you that many times across all 32 rides.
- **EveningB** (29 rides): valid hits per ride -- median 11 (range 6-15). Wrong-direction events: 190. Suppressed GPS-jitter re-fires: 0. Foreign-gate valid hits: 27 colocated with one of your own gates (harmless double-count, same physical line), **152 genuinely foreign** -- a parallel street or a crossing route's gate would have beeped at you that many times across all 29 rides.

Overall: **1021 genuinely-foreign false fires**, 1380 wrong-direction events
(the gate saw you, but going the wrong way -- these never count as hits), 2
re-fires suppressed by the 60-second guard (GPS jitter straddling a line).

## 4. Section times vs today's sectors

Side by side on the *same rides*: the gate-field's own-route consecutive-gate sections
(START->G1->G2->G3->FINISH, cluster-keyed) vs. the existing route model recomputed fresh in this
run (never copied from an old report). Raw time first (your rule: luck counts), moving time kept
alongside for continuity with the historical tables.

### Morning

| Sector | Gate-field n | Gate-field median raw (s) | Gate-field median moving (s) | Gate-field σ (s) | Route-model n | Route-model median raw (s) | Route-model median moving (s) | Route-model σ (s) |
|---|---|---|---|---|---|---|---|---|
| S1 | 59 | 188.9 | 188.9 | 7.6 | 63 | 187.8 | 187.8 | 8.2 |
| S2 | 64 | 203.2 | 203.2 | 3.8 | 64 | 203.2 | 203.2 | 3.8 |
| S3 | 64 | 240.9 | 240.9 | 5.1 | 64 | 240.9 | 240.9 | 5.4 |
| S4 | 64 | 203.9 | 203.7 | 6.8 | 64 | 203.6 | 203.3 | 6.7 |

### EveningA

| Sector | Gate-field n | Gate-field median raw (s) | Gate-field median moving (s) | Gate-field σ (s) | Route-model n | Route-model median raw (s) | Route-model median moving (s) | Route-model σ (s) |
|---|---|---|---|---|---|---|---|---|
| S1 | 30 | 211.7 | 211.1 | 8.8 | 32 | 211.5 | 210.9 | 9.7 |
| S2 | 32 | 230.5 | 230.2 | 5.5 | 32 | 230.5 | 230.3 | 5.5 |
| S3 | 32 | 159.0 | 159.0 | 4.2 | 32 | 159.0 | 159.0 | 4.2 |
| S4 | 29 | 224.7 | 223.3 | 6.7 | 32 | 225.2 | 224.8 | 8.5 |

### EveningB

| Sector | Gate-field n | Gate-field median raw (s) | Gate-field median moving (s) | Gate-field σ (s) | Route-model n | Route-model median raw (s) | Route-model median moving (s) | Route-model σ (s) |
|---|---|---|---|---|---|---|---|---|
| S1 | 27 | 214.6 | 214.4 | 8.1 | 29 | 214.5 | 213.1 | 7.1 |
| S2 | 28 | 201.2 | 201.2 | 5.4 | 29 | 201.1 | 201.1 | 5.7 |
| S3 | 27 | 185.1 | 185.1 | 4.3 | 29 | 185.1 | 185.1 | 4.7 |
| S4 | 26 | 183.7 | 183.7 | 4.9 | 29 | 184.0 | 184.0 | 4.7 |


**Per-gate crossing-time agreement.** Across 488 own-route gate crossings with both numbers available: median Δt = +0.01 s, p95 |Δt| = 0.07 s. A small, mostly-sub-second gap is expected
(different math: line-crossing vs. chainage-projection); a large one would mean the two models
disagree about where the gate actually is.

**Comparability check** (the review's caveat, measured): for each own-route section, how much did
the actual ridden distance between the two gates vary across rides? Tight variation means "the road
between these gates was the same every time" -- so the section time is a fair comparison. Wide
variation means the section mixed genuinely different roads (e.g. a detour) and the time is not
directly comparable.

| Track | Sector | n rides | Median path (m) | p95 path (m) | Spread | Verdict |
|---|---|---|---|---|---|---|
| Morning | S1 | 59 | 1152.4 | 1166.2 | 1.2% | tight, comparable |
| Morning | S2 | 64 | 1345.2 | 1351.1 | 0.4% | tight, comparable |
| Morning | S3 | 64 | 1562.6 | 1583.6 | 1.3% | tight, comparable |
| Morning | S4 | 63 | 1275.9 | 1284.8 | 0.7% | tight, comparable |
| EveningA | S1 | 30 | 1329.7 | 1334.4 | 0.4% | tight, comparable |
| EveningA | S2 | 32 | 1508.2 | 1519.0 | 0.7% | tight, comparable |
| EveningA | S3 | 32 | 1048.8 | 1051.4 | 0.2% | tight, comparable |
| EveningA | S4 | 29 | 1348.5 | 1356.1 | 0.6% | tight, comparable |
| EveningB | S1 | 27 | 1326.6 | 1332.0 | 0.4% | tight, comparable |
| EveningB | S2 | 28 | 1321.0 | 1327.6 | 0.5% | tight, comparable |
| EveningB | S3 | 27 | 1223.7 | 1260.8 | 3.0% | tight, comparable |
| EveningB | S4 | 26 | 1202.0 | 1205.8 | 0.3% | tight, comparable |

No section was flagged -- the road between every own-route gate pair was ridden consistently.

## 5. What this suggests

Read strictly from the numbers above -- this is not a recommendation, it's what the data shows:

- The gate field reproduces your existing sectors closely on the same rides (see the crossing-time
  agreement and the σ columns above) -- the underlying geometry is sound.
- Free-floating gates on a shared-road network **do pick up real cross-route traffic**: the
  genuinely-foreign hit counts above are the parallel-street/crossing-route false-fire rate you
  asked the replay to measure. Whether that rate is "fine" or "too noisy" is a judgement call the
  numbers alone don't make for you.
- 42 of the 95 gates (on routes with no cached rides) never fired at all in this
  archive -- expected, not a failure: those routes just aren't in the home<->work archive.

The review's expected landing zone was **"gates shared across routes" rather than "no routes at
all"** (`product/ROUTING-AND-SEGMENTATION.md` §4, `product/DATA-MODEL.md` §8). This replay's
foreign-hit and comparability numbers above are the evidence for or against that -- read them
against your own tolerance for false fires and section-time noise.

## 6. What this did NOT test

- **Live 1 Hz phone GPS vs. archive quality.** The archive is the same recording pipeline, but this
  replay has the *complete* trace for every ride -- no arming window, no late GPS lock, no dropped
  fixes mid-ride. A live gate field would additionally need to survive those (the live engine's
  50 m arming distance, `app/core/src/live.ts` `armWithinM`, is a live-only concern -- irrelevant
  to this offline replay).
- **Non-home-work rides.** Only the 3 home<->work tracks have cached archive data; the other 16
  ratified routes' gates sat in the field (their never-hit status above is itself evidence, not a
  gap), but there is zero station/church/fosh archive to test them against.
- **Free-ride recording** (gates fired on an unplanned route) -- that is a separate, later build,
  not this replay.
- Raw wall-clock time is the default truth here (D-042: luck counts); both raw and moving time are
  reported above so the numbers line up with the historical tables.

## 7. Provenance

- Script: `data/analysis/10_gatefield_replay.py`
- Run date: 2026-08-22
- Ride count: 125 cached rides (64 Morning, 32 EveningA, 29 EveningB)
- Sanity anchor: Morning gates fired in catalog order on 59/64 Morning rides
- To reproduce: `python3 data/analysis/10_gatefield_replay.py` (repo root, or via
  `scripts/gatefield-replay.cmd` on Windows)

---

**Your call, not a recommendation dressed as fact:** adopt gates-shared-across-routes, prototype it
live, or drop the idea. Nothing here decides that for you.
