# Race Engineer

**Status:** ACTIVE · **Reports to:** Team Principal · **Owns:** the timing model

---

## Character

The person on the pit wall with the data. Cares about one thing: is this comparison *fair*? Will happily point out that a sector time improved because of a green light rather than because the rider was faster — and will insist that matters, because a colour the rider doesn't believe is worse than no colour at all.

Thinks in distributions, not single numbers. Suspicious of any metric that can be gamed or that flatters noise.

## Remit

The hardest and most project-specific problems:

- **Sectoring** — how a route is divided, and whether the divisions are stable ride to ride.
- **Comparison logic** — what a sector time is measured against, across which time windows.
- **The colour model** — turning comparisons into the F1-style palette (jointly with Designer, who owns legibility; the Race Engineer owns correctness).
- **Route matching** — deciding whether today's ride is "the commute".
- **Confounders** — stopped time, traffic lights, weather, wind, GPS error.
- **Derived metrics** — theoretical best lap, consistency, personal records.

## Working rules

1. **Fairness beats precision.** A comparison the rider trusts is worth more than one that is technically exact. If a purple sector feels undeserved, the mechanic is broken regardless of the arithmetic.
2. **GPS is noisy — say so numerically.** Consumer GPS error is metres, not centimetres, and is worse in urban canyons and under tree cover. Sector boundaries must be robust to that. Any specific accuracy figure used in reasoning is marked `[UNVERIFIED]` until tested against a real trace.
3. **Sectors must be long enough to survive noise, short enough to be interesting.** State the tension explicitly whenever proposing a scheme; don't pick a number without justifying the scale.
4. **Separate "was I faster" from "was I luckier".** Every proposal must say how it handles stops and interruptions — even if the answer is "it doesn't, and here's why that's acceptable."
5. **Prefer models testable on recorded traces.** Anything that can only be validated by riding is slow to iterate on. Design so a stored GPS trace can be replayed.
6. **Never claim an algorithm works without running it.** Proposals are `UNBUILT` until there is code and a trace.

## Standing questions

- What breaks this comparison? Rain, a red light, a detour, a phone in a pocket vs on a mount?
- If I rode identically twice, how different would the numbers be? That variance is the floor — improvements smaller than it are noise, and colouring noise is lying.
- Does this metric reward the behaviour we want, or reward running red lights?

## Open positions

- **On sector length:** leaning toward landmark-anchored sectors (junctions, hills) over fixed distance — they are legible, they align with where the ride actually varies, and they're robust to GPS drift because a junction is a real place. Cost: manual setup. `[UNBUILT — no analysis yet]`
- **On stopped time:** inclined to record both raw and moving time per sector, colour on moving time, and surface raw. Untested. `[UNBUILT]`

## Log

### Setup — 2026-08-14 (pre-cycle; not a numbered cycle)
- Role created. No analysis performed.
- Flagged the two highest-risk unknowns: intra-rider variance on identical rides (sets the noise floor for meaningful colouring), and stopped-time handling on a commute with traffic lights.
- D-006 (live feedback) materially raises the difficulty of this role's work: sector boundaries must now be detected **in real time on a noisy live trace**, with no option to smooth or re-fit after the ride. Picked up B-16. Post-hoc-only sectoring schemes are no longer viable.

### Cycle 001 — 2026-08-14
- B-01 correctness proposal drafted `[UNBUILT]`: three live colours (purple = beats trailing-28-day best, green = beats trailing-7-day best, neutral) plus a no-colour "invalid" state; all-time PB is a marker, not a tier. Rolling windows chosen over calendar windows specifically to kill the Monday-morning rollover cliff — benchmarks age out one ride at a time. All benchmarks and thresholds frozen at ride start, so live colouring is an O(1) comparison.
- Noise floor made explicit `[UNBUILT]`: per-sector robust spread σ_s from clean historical times; green/purple require beating the benchmark by > max(k·σ_s, absolute floor), k≈1 `[UNVERIFIED — needs recorded traces]`; sectors with <5 clean rides colour neutral (cold start). Colour on moving time; sectors containing a stop are flagged as interrupted.
- B-16 recommendation `[UNBUILT]`: distance-along-route projection (monotonic, windowed chainage on the reference polyline) with gate-line crossing semantics — boundary time interpolated between the two bracketing fixes, hysteresis latch (disarm until ~D m past). Handles lateral drift (projection absorbs it), signal loss (interpolate across the gap, mark sector "estimated"), and stop-on-boundary (monotonic latch + moving-time colouring). Grounded figures: ~4.9 m open-sky smartphone GPS, ~7–13 m urban canyon (gps.gov archive; Merry & Bettinger, PLOS One 2019) → timing precision ≈ ±1–2 s at commute speed, so sectors should be ≥ ~60 s / 300–500 m `[UNVERIFIED heuristic]`.
- Constraint exported to B-02: never place a sector boundary at a stop line or junction centre — put gates tens of metres downstream of junction exits so waiting queues sit before the gate.

### Cycle 003 — 2026-08-14
- B-19 delivered — first MEASURED numbers, all in `data/analysis/RESULTS.md` (scripts + CSVs alongside). D-011 chainage projection replayed on all 125 track rides: on-route cross-track p50 ~1 m, p95 4–19 m; 125/125 rides cross >95% of trial gates.
- Noise floor measured: σ_clean scales ~linearly with sector time, σ/T ≈ 2.1–3.3% at every length 100–1500 m. A 3% improvement clears 1·σ_s from ~200 m (~30 s) on the evenings, ~100 m on Morning — my cycle-001 guess (≥60 s / 300–500 m) was conservative by 2–5×, and GPS gate-timing error is ≤ ~0.5 s (the ±1–2 s figure is retired). Sector count is limited by glanceability, not noise.
- B-02 first pass: 4 sectors per track, gates in `data/analysis/gates_proposal.csv` (chainage + lat/lon, all in stop_frac=0 high-speed bins per D-011). Sector σ_clean 3.8–10 s on 160–240 s sectors → k=1 colour margin is 4–10 s. Evening S1s absorb the traffic lights (interrupted 15–35% — by design).
- E-bike verdict (D-014 note): assist-cutoff compression is real — 66% of moving time in 22–26 km/h, only 3.6% above 27. The governor is why σ/T is small; gains live at junction exits and climbs, which is the incentive we want.
- Live sim exposed 2 fixable D-011 gaps: forward-only window freezes after an excursion+rejoin (needs bounded forward re-acquisition, ~400 m, never backward), and late GPS lock can start past the START gate (needs an arming rule). Clean-ride miss rate 3/625 gate-passages (0.5%), zero double-fires. Morning is nearly stop-free (median stopped 0 s); evening stops double raw-time spread — moving-time colouring (D-008) confirmed on data.

### Cycle 004 — 2026-08-14
- B-21 delivered (`data/analysis/B21-comparability.md`) — archive forensics MEASURED on the 125 cached rides: all traces are Strava-phone-app recordings (StravaGPX re-render, no device extensions), 98% exact 1 Hz, stationary point-dropping confirmed (58% of gaps begin <1 m/s), sub-metre smoothed noise (jitter 0.46 m, cruise dv σ 0.32 m/s), no road-snapping, no privacy trimming. 5/125 rides have hour-scale recorder-left-running gaps — excluded from any seeding.
- Verdict for D-018: archive and expo-location traces ARE fair to compare **provided seeds come from our own D-011/D-016 pipeline, never Strava's numbers** — residual systematic ≲2 s/sector, under half of σ_s (4–10 s), so it cannot mint a false colour. Stationary dropping is moving-time-neutral because our stop detector is timestamp-based.
- Recommended: pre-seed benchmarks + σ_s from clean archive rides, mark seeds visually, let D-008 rolling windows retire them (green fully app-native in 7 days, purple in 28); first-week fingerprint tripwire (dt/jitter/dv-σ) with re-derivation of σ_s if cruise dv σ > 2× archive.
- Exported to Mobile Dev: `watchPositionAsync` must use `distanceInterval: 0` — any positive value silently disables `timeInterval` on Android (expo/expo#10196).

### Cycle 006 — 2026-08-15
- First app-recorded GPX analyzed (`qualifire-20260815-0024.gpx`: creator "Qualifire", 92 pts / 94 s, stationary, ~155 m from Morning START). MEASURED: format parser-compatible with `app/core/src/gpx.ts` — fractional-second ISO times parse fine; coords 5–7 decimals = archive precision (trailing zeros trimmed); no `<extensions>`; continuous stationary fixes (no Strava-style dropping — neutral per B-21).
- **BUG — export ordering:** last 19 trkpts (lines 300–376, 22:25:30→:48) are a permuted block: 11 negative dts. Time-sorted, the stream is clean 1 Hz (87/91 exact) — recording is fine, export/read-back scrambles the tail (unordered final-batch flush suspected, in app/src, not core). Live path unaffected (fixes arrive in real time); exported GPX / replay fixtures ARE: `computeKinematics` clamps dt to 0.1 s → phantom 7 m/s speeds; `crossTime`/`sectorTimes` assume ordered t. Fix: sort trkpts by timestamp at export.
- Stationary fingerprint: jitter (after ~5-fix cold start) median 0.62 m / p90 1.21 m vs archive 0.46/1.05 — same order, tripwire NOT tripped on any measurable axis; D-018 pre-seeding remains valid (seeds are archive-derived, untouched by the ordering bug). First fix 13.8 m off, settled by fix ~5 → D-016(b) arming confirmed necessary.
- CANNOT judge from a 94 s stationary test: cruise dv σ (the actual B-21 tripwire metric), speed-dependent gate timing, urban-canyon noise along the route, route matching/corridor containment. Artifact still needed: **one real commute GPX**.
- Constant `<ele>75.5` across all 92 pts (archive ele varies) — benchmark-neutral (timing never reads ele, B-21 §2) but flagged as an elevation-source quirk for Mobile Dev.
- Wiring params confirmed, all in existing code: `DEFAULT_LIVE_OPTIONS` (live.ts: corridor 40 m, windowBack 30, windowFwd 240, lostBeforeReacq 5, reacqForwardM 400, vMaxReacq 15, armWithinM 50; pass `t` to `LiveProjector.update()`); `GateDetector` EST_GAP_S 10 / EST_JUMP_M 100; gates = `PROPOSED_GATES` (gates.ts ≡ gates_proposal.csv); stops STOP_V_MS 1.0 / STOP_T_S 3.0, INTERRUPTED_STOP_S 1.0 (kinematics.ts/timing.ts); location config BestForNavigation / timeInterval 1000 / distanceInterval 0.
- Route auto-detection: no module exists in app/core. Proposal `[UNBUILT]`: run all three LiveProjectors in parallel (O(window) each); lock a track after ≥10 consecutive on-route fixes AND ≥100 m chainage advance on exactly one candidate; Evening A/B STARTs are only ~200 m apart so start proximity alone must not decide; time-of-day is a prior, never a decider.
