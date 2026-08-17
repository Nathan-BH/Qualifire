# Landmark mining (IDEAS §21) — 2026-08-16, from activity-index.csv endpoints

1248 ride endpoints (624 rides × start+end), greedy-clustered at 150 m → 83 clusters.
Top clusters, with visit counts and recency:

| Visits | Since May | Coords | Active | Identity |
|---|---|---|---|---|
| 396 | 136 | 50.8635, 4.6883 | Sep 25 → now | **work** ✔ |
| 373 | 20 | 50.8224, 4.5066 | Aug 24 → Jul 26 | **Puttestraat, Tervuren** (family home — matches Nathan's account; tapers after the ~Apr 2026 move) |
| 186 | 155 | 50.8365, 4.6382 | Apr 26 → now | **home** ✔ (first appears 2026-04-13 — the move date) |
| 88 | 7 | 50.8703, 4.6919 | Sep 24 → Aug 26 | **centroid is WRONG — see "Centroid drift" below; true mass at 50.8698, 4.6902.** Nathan's old student area; identity pending on the corrected link |
| 17 | 17 | 50.8812, 4.7151 | May 26 → now | **Leuven station** ✔ (new-ish habit) |
| 17 | 0 | 50.8697, 4.6892 | 2024–2025 only | ? — near the 88-visit spot; possibly same venue, different parking |
| 15+10 | ~1 | 50.823, 4.516 | mostly 2024 | Tervuren neighbourhood spots (Puttestraat era) |
| 7+6 | 6 | 50.878, 4.704 | 2025 → now | **fosh** ✔ (two adjacent sub-clusters — bike-parking spread) |
| 5 | 3 | 50.8586, 4.6957 | Apr 26 → now | **church** ✔ |
| 5 | 3 | 50.8807, 4.7185 | Apr–May 26 | ? — station east side (Kop van Kessel-Lo?) |

## Centroid drift — the 88-visit cluster re-measured (2026-08-16, after Nathan flagged the link looked like a Carrefour)

Nathan looked at `50.8703, 4.6919` and said it lands on a Carrefour Market near his old student accommodation, doubting he would have logged 88 tracked rides to a supermarket. He was right, and the doubt was better than the number: **the published centroid is not where the visits are.**

Re-clustering the 88 raw endpoints at 40 m instead of 150 m:

| n | Coords | |
|---|---|---|
| 30 | 50.86982, 4.69003 | https://maps.google.com/?q=50.86982,4.69003 |
| 29 | 50.86979, 4.69044 | https://maps.google.com/?q=50.86979,4.69044 |
| 16 | 50.87016, 4.69003 | https://maps.google.com/?q=50.87016,4.69003 |
| 7 | 50.87071, 4.69203 | https://maps.google.com/?q=50.87071,4.69203 |

**75 of 88 events sit within ~50 m of 50.8698, 4.6902** — roughly 150 m WSW of the published centroid. The 7-point outlier at 50.87071, 4.69203 (plausibly the Carrefour) dragged the 150 m greedy centroid off the mass and onto a place Nathan barely visits. The three-way split of the main mass is street-side parking jitter, the same effect already seen at fosh.

**Dwell evidence — it is not a shop.** Pairing each arrival with the next departure: n=43, **median 101.7 h**; only **1 of 43** arrivals is followed by a departure within the hour, and 36 are followed by a gap >24 h. A supermarket run is a sub-hour round trip; this is a place the bike arrives at and then *stays*. Departures peak at 19:00, arrivals at 08:00 and 20:00, with many arrivals never matched by a tracked departure — consistent with somewhere the bike is parked between uses rather than a destination ridden to and straight back from. Visit rhythm is ~weekly across two years, not daily, so it also is not a residence he commuted from (Puttestraat holds that role for the same period, 373 visits).

**Nathan's fix (same session):** the accommodation is at **50°52'13.1"N 4°41'30.8"E = 50.87031, 4.69189** — i.e. essentially the *published centroid*, and only ~46 m from the 7-event outlier. So the 150 m cluster is catching **two distinct places 141 m apart**, exactly as he guessed:

| Place | Events | Coords | Distance from the flat |
|---|---|---|---|
| **Student accommodation** (Nathan, confirmed) | ~7 | 50.87071, 4.69203 | 46 m |
| **Unidentified main mass** — where the bike actually lives | ~75 | 50.86982, 4.69003 | **141 m SW** · https://maps.google.com/?q=50.86982,4.69003 |

**Resolved (Nathan + a dating check, same session).** He identified the 75-event spot as where the bike lived while he commuted from the student accommodation, and suggested the 7-event spot might be first-year leftovers from the building next door. Dating the two sub-clusters tests that directly — and it comes out differently:

| | Events | Span | Shape |
|---|---|---|---|
| **B — 50.86982, 4.69003** (bike spot) | 83 | **2024-09-14 → 2025-10-25** | heavy and daily-ish at the start (16/21/17 events Sep–Nov 2024), tapering through 2025 |
| **A — 50.87071, 4.69203** (Nathan's flat pin / the Carrefour) | 7 | **2025-08-21 → 2026-07-29** | sparse and *recent* — 2 a month in May/Jun/Jul 2026 |

So they are two **eras**, not two buildings in the same era: B is the accommodation era and ends Oct 2025; A only *starts* as B dies and is still running now, months after the April 2026 move to the current home. A sparse, ~monthly, still-active stop at a supermarket 141 m from an old address is exactly the errand pattern — **Nathan's original Carrefour instinct was right about A**, and it was only wrong as an explanation of the merged 88. (First year is not in the archive at all; the data starts Aug 2024.)

Consequence: B is a **dormant** landmark — deep history, no future rides, Nathan's own words: "I don't live there, so I would not make any ride using this as a landmark." It seeds history and must never be offered at START. A is an errand stop, not a way endpoint.

The intermediate reading below is kept for the record: the flat is the *minor* sub-cluster. Whatever sits 141 m southwest of it absorbs 75 of the 88 events and holds the bike for days at a time (median dwell 101.7 h) — a bike shed, an inner courtyard, a shared garage, or a friend's place. **This is the one still to identify (Nathan).** `oldflat` as a label for the whole cluster is withdrawn; whichever of the two ends up in the catalog, they are two landmarks, not one.

**Radius rule falls straight out:** the cluster radius must be *smaller than the distance between distinct places*. Two real places 141 m apart mean 150 m cannot be the global default — it merges them by construction. Per-place radii (already wanted for fosh) with a default nearer 60–80 m, and a check that no two landmarks overlap.

**Method lesson, worth carrying into the model:** a greedy centroid at a radius wider than the place is a *lie with a decimal point on it*. Landmark centroids must be re-derived at a tight radius once the cluster exists (or reported as the densest sub-mode, never the mean), and any coordinate shown to a human should come with a map link so it can be falsified — which is exactly how this error surfaced.

## Landmark set v1 — RATIFIED by Nathan, 2026-08-16

Six landmarks. Nathan corrected two coordinates and struck four clusters; the mined clusters were only ever a proposal, and this is the curated list (`landmarks_v1.json`).

| id | Coords | Radius | Source |
|---|---|---|---|
| home | 50.8365, 4.6382 | 120 m | mined |
| work | 50.8635, 4.6883 | 130 m | mined |
| **puttestraat** | **50.822078, 4.505119** | 120 m | **Nathan's coordinate** (moved 110 m WSW off the mined centroid) · dormant since Apr 2026 |
| station | 50.8812, 4.7151 | 251 m | mined |
| **fosh** | **50.879122, 4.702835** | 256 m | **Nathan's coordinate** (replaces the smeared 50.878, 4.704 pair) |
| **church** | **50.857749, 4.697827** | 234 m | **Nathan's coordinate** (replaces 50.8586, 4.6957) |

**Struck as outdated:** the 88-visit cluster (old student bike spot + the Carrefour), the 17-visit spot beside it, the 15+10 Tervuren neighbourhood spots, and the 5-visit "station east side". The way table above predates this curation — its mystery-N-of-work and Tervuren rows are gone with them.

**Result: 435 of 624 rides map to a (start, end) landmark pair.** Down from 521 with 83 auto-clusters, which is the point: 86 rides now end nowhere named rather than at a place Nathan does not recognize as a destination.

| Rides | Way | | Rides | Way |
|---|---|---|---|---|
| 127 + 96 | **puttestraat ↔ work** | | 6 + 5 | home ↔ station |
| 67 + 57 | **home ↔ work** | | 5 + 7 | home ↔ puttestraat |
| 31 | puttestraat loops | | 3 + 2 | home/work → church, 2 church → home |
| 8 + 3 | fosh → puttestraat / home | | 7 + 3 | station ↔ work |

### Radius: my earlier 60–80 m recommendation was wrong

Measured, it fails badly: at 80 m only **115** rides map (puttestraat alone drops from 373 endpoints to 56). Real endpoint spread is 100–230 m — a bike gets parked wherever there is space, so the *endpoint* cloud is far wider than the building. The 88-cluster failure was never "150 m is too wide globally"; it was two genuinely distinct places sitting 141 m apart.

The rule that survives both facts: **radius = p90 of the endpoint spread + 30 m, capped at half the distance to the nearest other landmark.** That is what produced the table above — generous where a place stands alone, automatically tight where two places crowd each other, and it can never merge two landmarks by construction.

One flag on fosh / church / station: Nathan's named coordinates sit 150–220 m from where rides actually end (median 150 / 164 / 45 m), which is why their radii come out large. His point is *the place*; the endpoint cloud is *where the bike stops*. Worth deciding later whether the anchor moves to the endpoint mode — not decided here, and the big radius is harmless while nothing else is nearby.

### Puttestraat re-anchored (Nathan, 2026-08-16)

Moved 110 m WSW to **50.822078, 4.505119**, and the archive says it is now essentially exact: the median distance from a real endpoint to the anchor falls **104 m → 10 m**, p90 **114 m → 43 m**. The mined centroid had been sitting on the edge of the cloud; Nathan's point sits on its mode.

Radius therefore tightens 144 → **120 m** (the floor; the spread alone would justify ~75 m). Cost of the tightening: **7 fewer rides** map on puttestraat↔work (223 → 216) and 3 on home↔puttestraat, from a diffuse tail of 17 endpoints spread 127–272 m out with no second mode — parking variance and short-stopped rides, not another place. Widening to 200 m would recover ~11 endpoints; not taken, because a sharp anchor is worth more than a handful of rides and nothing else is within 9 km to collide with.

Nathan's framing is worth recording as a principle, because it separates two things that keep getting conflated: **the landmark marks where the ride truly ends; the final gate deliberately sits a few hundred metres before it.** A landmark is an identity, not a timing boundary — so it should be as precise as possible, while gate placement (§22) stays free to trade precision for a clean, safe timing line.

## Notes for the cycle
- Landmark radius ~150 m works: known places resolve cleanly; fosh smears over two adjacent clusters (bike-parking jitter) → landmark radius may need to be per-place (bigger for parkings).
- Way-mining next step: count (start-landmark, end-landmark) pairs over the archive to see which "ways" (§20) have enough history to seed benchmarks, incl. partial-route overlap (e.g. station→home shares the Morning corridor's tail).
- Method: index coords only, no GPX parsing; rerunnable one-pass greedy clustering.

## Way mining (§20) — landmark-pair counts over the whole archive, 2026-08-16

521 of 624 rides map cleanly to a (start, end) landmark pair; 103 have ≥1 endpoint off-landmark.

| Rides | Way | Active | Note |
|---|---|---|---|
| 128 + 104 | **puttestraat ↔ work** | Sep 25 – Jul 26 | the old ~43-min commute — deepest history of any way; benchmarks seedable instantly |
| 68 + 63 | **home ↔ work** | Apr 26 – now | the current Morning / Evening A+B tracks |
| 43 | mystery-N-of-work → itself | Sep 24 – Apr 25 | round-trip loops from the unnamed spot — identity matters (training loops?) |
| 35 | puttestraat → itself | 2024 – May 26 | leisure loops from the family home |
| 11 | fosh → puttestraat | 2025 | |
| 7 + 6 + 5 + 3 | **home/work ↔ station** (4 directions) | Apr 26 – now | small but active — §21 says small sets are fine |
| 7 + 7 | home ↔ puttestraat | Apr – Jun 26 | |
| 4 + 3 + 3 | work→fosh, fosh→home, home→church | 2025 – now | seedable at low n |

## Overlap check (§20 partial-route claim) — new test rides vs Morning corridor, 2026-08-16

- **station→home (19:26 ride, 8.6 km): 65% of its points lie within 40 m of the Morning corridor, spanning chainage 22–5727 m — effectively the ENTIRE 5.65 km track.** The ride home from the station rejoins near work and rides the full commute corridor in reverse. Consequence: a station→home way is ~2.9 km of new road + the complete known corridor — its sectors over the shared span could reuse the existing gates/benchmarks rather than starting fresh. Sector-sharing across ways is worth designing for from day one, not a later optimization.
- **work→church (10:20 ride, 1.8 km): 2% overlap (single point at the work end)** — genuinely new road; needs its own gates entirely.

## Route consistency of the prize way — puttestraat↔work, 2026-08-16

237 rides checked (path overlap vs the most recent, 40 m corridor): **median 97% overlap; 170 rides ≥90%, 67 at 70–90%, zero below 70%.** The old commute is essentially ONE physical route — the 232-ride history is comparable and seedable as a single way. Per-direction split (same-direction references): **to-work 128 rides, median 96%; to-putt 109 rides, median 99%; zero rides below 70% in either direction.** So the 70–90% band is NOT an A/B route split — both directions are one route with occasional partial detours (probably shop stops / roadworks; the D-015 detour rule handles those per-ride). Unlike the current commute, the old one needs **no Evening-A/B-style track split — two tracks (one per direction, per D-010), one route each.** Gate proposal can proceed directly from the reference rides.

**Takeaways for the cycle:** (1) the ways expansion has one giant prize — puttestraat↔work with 232 archived rides; (2) loop rides (same start/end landmark) are a real category the way model must handle, not an edge case (78 rides); (3) the mystery spot participates in 4 distinct ways — naming it is the single highest-leverage question for Nathan; (4) station ways are new but growing, matching Nathan's account.
