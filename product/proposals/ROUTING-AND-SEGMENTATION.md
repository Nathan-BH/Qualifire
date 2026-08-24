# Routing and segmentation — type a destination, get a raceable track

**Navigation Engineer design proposal, cycle 011 (2026-08-17).** Answers IDEAS §29. Everything proposed here is `UNBUILT`. No app code is touched.

Inputs: `data/analysis/RESULTS.md` (all σ and cross-track numbers below), `product/DATA-MODEL.md` (catalog schema), `data/activity-index.csv` (624 rides, re-measured today), `app/assets/routes/routes.json` (3 routes, raster + web-mercator + hand gates).

---

## 0. What I measured today, before proposing anything

| Fact | Value | Source |
|---|---|---|
| Rides in index | 624 · 1,304,592 fixes total · median 2,358/ride · p90 3,048 | `data/activity-index.csv` |
| Archive bbox | lat 44.4356–50.8919 · lon 4.3636–26.0963 | same |
| **Rides with an endpoint outside the Leuven box** | **3** (2× Bucharest Feb 2025, 1× Ardennes Aug 2024) | same |
| On-route cross-track | p50 0.8–1.1 m · p95 4.1 (A) / 5.3 (B) / **19.4 m** (Morning, parallel-path offsets) | RESULTS §1 |
| Existing corridor | 40 m | RESULTS §5 preamble |
| Sector noise floor | 3% gain clears 1σ at **~100 m** (Morning) / **~200 m ≈ 30 s** (evenings) | RESULTS §3 |
| Shipped gate spacing | 4 sectors on 5.65 km ⇒ **1,150–1,550 m**, ~200 s each | RESULTS §4 |

**Correction to the brief.** STATE is right that the archive spans Europe, but the bbox prefilter rejects only **3 of 624** rides. It is a *correctness* guard (never compare Bucharest to Leuven), not a performance win. The performance work has to happen at a finer grain — §4.

---

## 1. Routing engine — the options

All OSM-derived routing data is **ODbL 1.0** regardless of engine ([Geofabrik](https://download.geofabrik.de/europe/belgium.html)). Belgium extract `belgium-latest.osm.pbf` = **659 MB** (2026-08-15).

| Engine | Licence | On-device Android? | Data for our area | Cost at 1 user | Source |
|---|---|---|---|---|---|
| **BRouter** | MIT | **Yes — it *is* an Android app.** Java, ships on F-Droid/Play; used as OSMAnd's and Locus' offline engine | `E0_N50.rd5` = **78,352,141 B (74.7 MB)** covers lon 0–5 / lat 50–55, i.e. the whole commute. Neighbour `E5_N50` 181 MB | €0 | [README](https://raw.githubusercontent.com/abrensch/brouter/master/README.md) · [segments](https://brouter.m11n.de/segments/) |
| **Valhalla** | MIT | Yes in principle — tiled by design, C++/NDK; `valhalla-mobile` JNI bindings are community WIP, not a release | Germany tilepack ≈ 4.6 GB; Belgium not published — `[UNVERIFIED]` | €0 self-built | [repo](https://github.com/valhalla/valhalla) · [Ferrostar routers](https://stadiamaps.github.io/ferrostar/route-providers.html) · [ValhallaAndroidPOC](https://github.com/Rallista/ValhallaAndroidPOC) |
| **GraphHopper (OSS)** | Apache 2.0 | Degraded — "Offline routing is **no longer officially supported** but should still work as Android supports most of Java"; last Android APK was 1.0 (2020) | CH graph from the 659 MB PBF, built off-device | €0 | [README](https://raw.githubusercontent.com/graphhopper/graphhopper/master/README.md) |
| **OSRM** | BSD-2-Clause | **No.** Designed as a server; mobile is not a supported target | n/a | VPS ⇒ **not €0** | [wiki](https://wiki.openstreetmap.org/wiki/Open_Source_Routing_Machine) |
| GraphHopper Directions API | hosted | Network-only | n/a | Free = 0€, **500 credits/day, non-commercial only, no SLA** | [pricing](https://www.graphhopper.com/pricing/) |
| openrouteservice | hosted | Network-only | n/a | Free tier ~2,500/day / 40k/mo `[UNVERIFIED — secondary source; the official page publishes only per-request caps]` | [restrictions](https://openrouteservice.org/restrictions/) |

### Pick: **BRouter**, `UNBUILT`

1. It is the only option where "runs offline on Android" is the *normal* case rather than a port. Working rule 5 decides this on its own.
2. 74.7 MB for one tile covering the entire commute region is a downloadable asset, not a bundled one — see §7 (Mobile Dev).
3. MIT, €0, no account, no key, no VPS. The $0 pipeline is untouched. Valhalla is the honest runner-up and the one to revisit if the JNI bindings reach a release; OSRM is disqualified by architecture, not quality.
4. Its cost function is a **text profile file** the rider can edit. That matters for §2.

**The gap I could not close:** I searched and found **no maintained React Native / Expo binding for BRouter, Valhalla or GraphHopper**. Every path is a custom native module. The project already ships a custom dev client, so this is work, not a blocker — but it is real work and it belongs to the Mobile Dev to price.

**Geocoding is the actual network dependency, not routing.** Nominatim's policy caps use at **1 request/second**, forbids **auto-complete search outright**, and requires that an app be able to switch provider **without a software update** ([OSMF policy](https://operations.osmfoundation.org/policies/nominatim/)). So: typing a destination needs signal; riding to it must not. Proposal `UNBUILT` — geocode at the kitchen table, cache the resolved coordinate in the catalog, and let the pocket case be coordinate-in / route-out.

---

## 2. "Fastest" is a claim, not a fact

A cycling cost function minimises a weighted sum over edges — length, an assumed speed per road class, surface penalty, turn cost, gradient, junction cost. None of those weights is measured on Nathan's bike. Two separate questions get conflated:

| | Routing profile | Racing |
|---|---|---|
| Question | which road should I be sent down | how fast did I get down it |
| Optimises | a model's guess at time, comfort, safety | measured elapsed time on a fixed line |
| Evidence | OSM tags + generic assumptions | 624 rides |

**Position.** "Fastest" is the wrong default here, for a measured reason. RESULTS §5: **66.3% of moving time sits in 22–26 km/h**, median 23.5, only 3.6% above 27 km/h — the 25 km/h assist cutoff acts as a governor. On this bike, road class barely moves the clock; the time lives in junctions, stops and climbs-into-cutoff. A "fastest" profile that routes onto a busier road to buy nominal km/h buys nothing and adds red lights, and red lights are this project's known confounder.

Proposal `UNBUILT`: default profile = BRouter `trekking`, relabelled **"a sensible way"**, never "fastest". Offer at most one alternative. And say the quiet part in the data model: **the profile picks the road; it never touches a time.** No routing engine's ETA is ever stored, shown, or compared against — the only seconds in this app come from the offline pipeline, per D-023.

---

## 3. Segmenting a route nobody has ridden

The tension, stated plainly: **short sectors are more interesting and less trustworthy.** RESULTS §3 measured the floor — a 3% improvement clears 1σ at ~100 m (Morning) and ~200 m / ~30 s (evenings). RESULTS §4's conclusion stands: *noise does not limit sector count on this commute; glanceability does.*

**Proposed algorithm** (`UNBUILT`), on a planned polyline of length L:

| Step | Rule | Derived from |
|---|---|---|
| 1. Count | `n = clamp(round(L / 1400 m), 3, 6)` | 1,400 m is the mean of the shipped 1,150–1,550 m gates (RESULTS §4) |
| 2. Seed | place n−1 gates at equal chainage quantiles | — |
| 3. Snap | move each gate to the **midpoint of the longest signal-free run** within ±250 m, using OSM `highway=traffic_signals` / `crossing` nodes | RESULTS §4 placed real gates in `stop_frac = 0.00` bins; with no history, signal-free run is the geometric proxy for that |
| 4. Prefer | within that window, also prefer a road-class change or a named-road boundary — a sector should be nameable | §22 / §21 want real sector names |
| 5. Reject | no sector < **300 m** or > **2,500 m**; no gate within **150 m** of a controlled intersection | 300 m = 1.5× the measured 200 m evening floor; 2,500 m so no sector is a black box |
| 6. Fail | if steps 3–5 cannot satisfy 5, fall back to pure quantiles and **flag the gate set `geometric`** | working rule 3 |

**Honesty clause, non-negotiable.** Gates from geometry are a **starting grid, not a benchmark**. `GateSet` gains `origin: 'measured' | 'geometric'`. A `geometric` gate set may define sectors and time them; it may not be described as good placement, and the first N rides on it are explicitly a placement experiment. Once ≥5 clean rides exist, the RESULTS §4 procedure re-runs on real `stop_frac` and mints a **new `gateSetVersion`** — which DATA-MODEL §6 already prices honestly (middle-gate moves keep laps, break sector history).

---

## 4. Overlap detection — which of 624 rides share road

Both numbers working rule 4 demands, up front:

| Parameter | Value | Why |
|---|---|---|
| **Tolerance** | **25 m** cross-track | Clears the worst measured on-route p95 (19.4 m, Morning parallel-path offsets, RESULTS §1) with margin, and stays inside the project's existing 40 m corridor rather than widening it |
| **Minimum shared length** | **800 m contiguous**, AND ≥ 1 whole candidate sector | 200 m is the measured floor where a 3% gain clears 1σ; 300 m is the sector floor (§3); 800 m buys a whole sector plus its gates. Round number — **must be replayed on the archive before it is trusted** (working rule 6) |

**Algorithm** (`UNBUILT`), four stages, cheapest first:

1. **Ride-bbox × route-bbox + 500 m buffer.** Correctness guard. Measured yield here: rejects 3/624. Cheap, keep it, do not oversell it.
2. **Cell-set intersection.** At import, each ride is reduced once to a set of ~100 m grid cells (geohash-7 ≈ 153 m is the off-the-shelf equivalent). Query = set intersection against the route's cells; require ≥ 800 m worth of shared cells. This is the stage that actually does the work — it is where 621 near-Leuven rides get separated into "shares the corridor" and "goes the other way out of town".
3. **Chainage projection**, on survivors only. Reuse D-011's existing forward-only projection with bounded re-acquisition — the engine already does this and it is parity-proven. Produce a per-ride boolean mask over route chainage at ≤ 25 m.
4. **Per-sector rollup.** For each candidate sector, the comparison set is the rides whose mask covers it *entirely*. Nothing else counts.

**Partial overlap: yes, and it is the point.** The comparison set is **per sector, not per route**. Sector 2 may have 40 comparable rides while sectors 1, 3 and 4 have zero. That is a legitimate, honest board: three grey sectors and one with a delta. The alternative — refusing to compare unless the whole route matches — throws away the 237-ride puttestraat↔work corridor the moment the route deviates by one street. DATA-MODEL §8 already keeps the door open: sector identity is keyed to `(route, chainage pair)`, and the station→home test ride overlaps the Morning corridor for its full 5.65 km at 65% of points within 40 m.

**Cost on a phone.** Stage 2 is a one-time O(1.3M) import pass, then set intersections. Stage 3 is the only per-query geometry: at ~2,358 fixes/ride × however many survive stage 2, 100 survivors ≈ 236k point-projections. That should be well under a second in JS. `[UNVERIFIED — not benchmarked. This is the number QA should measure first, on device, before anyone builds a screen around it.]`

---

## 5. How a planned route becomes a first-class route

The path is deliberately boring, because DATA-MODEL already has the shape:

```
typed destination → geocode (online, once) → BRouter (offline) → polyline
  → new Route{ provenance:'planned', refLineId:<new>, gateSetVersion:1 }
  → new GateSet{ origin:'geometric', chainageM:[…] }        (§3)
  → overlap scan vs 624 rides → per-sector candidate comparison sets   (§4)
  → ride it → the existing offline pipeline emits RideResult, unchanged
```

The engine sees a `Route` with a reference polyline and a chainage gate list. It cannot tell the difference, and must not need to. Two new fields carry all the honesty: `Route.provenance: 'ratified' | 'planned'` and `GateSet.origin: 'measured' | 'geometric'`.

**What a planned route must NOT be allowed to do**, until it has ≥ **5 clean rides** (D-008's existing threshold — reusing it rather than inventing a second one):

| Forbidden | Why |
|---|---|
| Claim a benchmark or a PB | there is nothing to be better than |
| Colour a sector (green/purple/any tier) | working rule 1; D-025's live-layer honesty |
| Enter the timing tower or produce a position | D-028 already refuses to rank `estimated` quality |
| Be offered as a way at START | DATA-MODEL §8a — routes are **ratified, not discovered**; a one-off diversion must not mint a permanent ghost route |
| Be seeded with archive ghosts as if it were its own history | D-018 ghosts belong to the route that was actually ridden |

**What it IS allowed to do from ride 1:** run the lap clock, fire gates, record raw sector times, and show them as bare numbers. Timing without comparison is honest. Comparison without history is not.

Promotion is Nathan's, not the algorithm's: at 5 clean rides the app *offers* the route for ratification, with the re-measured gate proposal attached.

---

## 6. Graceful failure — the rider ignores the route

The standing question, answered in the design rather than after it. **The plan loses to the road.** This is D-025's "the ridden route wins" extended one step earlier — an intended route is now as non-authoritative as a declared one.

| Trigger | Behaviour |
|---|---|
| Off-corridor > **40 m** for > **5 s** | Route lock drops. Sectors go `missed`/NO TIME. **No reroute prompt, no nag, no sound.** |
| Lap clock | Keeps running. It is a clock, not a comparison — killing it punishes a legal choice |
| Rejoin within the D-011 re-acquisition window | Silent relock; the skipped sector stays `missed`, later sectors time normally |
| Never rejoins | Ride records to completion as an unmatched ride (`routeId: null`, D-025). Nothing is lost — D-023 keeps raw fixes forever |
| At ride end | The app offers **the trace he actually rode** as a new candidate route, with §3 gates. The plan is discarded, not preserved as a grievance |
| No signal the whole time | Routing works (§1). Geocoding does not — so a destination not resolved before departure simply cannot be typed. Stated as a limit, not hidden |

The failure mode this rules out explicitly: an app that decides a legal detour was a *mistake*.

---

## 7. Hand-offs

| To | What I hand over | What I do not decide |
|---|---|---|
| **Race Engineer** | (a) **candidate sectors** from §3, tagged `origin:'geometric'`; (b) **candidate comparison sets**, per sector, from §4 with tolerance 25 m / min shared 800 m | Whether any of it may be **coloured**. Specifically: is a 3-ride sector set enough (D-008 says <5 stays neutral, §21 says small sets are fine — that conflict is his, not mine); do `origin:'geometric'` sectors ever earn a tier; does a partially-overlapping ride enter a window at full weight |
| **Designer** | Behaviour only: a route can exist with 4 sectors and 0 comparisons; sectors can be individually comparable or not on the same ride; off-route is silent; the plan is discarded at ride end | Every screen. No layout is proposed here |
| **Mobile Dev** | Three things to price: (1) **no maintained Expo/RN binding exists** for BRouter/Valhalla/GraphHopper — a custom native module is required; (2) **74.7 MB** of routing data must be a *downloaded asset*, not bundled — and must survive an OTA update; (3) offline routing is CPU-bursty at plan time and **zero-cost while riding** — no background service, no radio, no battery draw mid-ride | Whether it survives Expo at all. If it does not, §1's runner-up ordering (Valhalla, then a plan-online/ride-offline compromise) is the fallback ladder |

## 8. Deliberately not designed

- **Map rendering.** Today's routes are raster PNGs with a web-mercator transform (`app/assets/routes/routes.json`); real maps are MapLibre and belong to build 3 (D-026), not here.
- **Map-matching to a graph.** §4 projects onto a polyline, not onto edges — parity-proven and sufficient. Edge-matching is only needed if sectors are ever shared *across* routes, which DATA-MODEL §8 already deferred. Multi-day planning likewise: sized for a commute, not a tour.
- **Anything at all until it is replayed.** Every number in §3 and §4 is a starting value chosen from measured evidence, not a validated one. Working rule 6: the 624-ride archive is the test bench, and none of this has been on it.
