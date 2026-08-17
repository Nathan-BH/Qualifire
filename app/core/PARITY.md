# PARITY — TS core vs the validated Python pipeline

**Status: PASSED, measured 2026-08-14 (cycle 004).** The TypeScript core in
`src/` reproduces the Python analysis pipeline (`data/analysis/02_analysis.py`
+ `03_gates.py`, cycle 003) **exactly** on all 125 commute rides with the
approved D-016 gates. This file is the checkable artifact that makes the core
DONE per BUILD-PIPELINE Phase 0.

## What was compared

Per ride x per sector (125 rides x 4 sectors = 500 rows): interpolated
entry/exit gate-crossing timestamps, raw time, stopped time, moving time
(the D-008 colouring quantity), and the flag
(`clean` / `interrupted` / `excluded_nocross` / `excluded_offroute`).

Both pipelines independently rebuild everything from the GPX files: track
origin, medoid reference ride, smoothed 5 m-resampled reference polyline,
offline chainage projection (D-011), stop detection, gate crossings.

## Reproduce

```
# 1. Python reference (needs numpy + the cache from data/analysis/01_parse.py)
python3 harness/dump_py_sector_times.py            # -> /tmp/parity/py_sector_times.csv

# 2. TS harness + comparison (Node >= 22.6; no npm install needed - zero deps)
node --experimental-strip-types harness/parity.ts ../../data /tmp/parity/py_sector_times.csv
```

Outputs `ts_sector_times.csv` and `parity_summary.txt` next to the Python CSV.

## Results (2026-08-14, sandbox Node 22.22.3 / Python 3.10 + numpy 2.2.6)

Reference polylines — identical medoid ride and length to the millimetre:

| track | rides | medoid reference | Lref (TS) | Lref (Py) |
|---|---|---|---|---|
| Morning  | 64 | 20260430-1208-home2work-18317063653 | 5651.278 m | 5651.278 m |
| EveningA | 32 | 20260724-1838-work2home-19448004625 | 5556.478 m | 5556.478 m |
| EveningB | 29 | 20260612-2223-work2home-18895067518 | 5837.910 m | 5837.910 m |

Sector rows: **500/500 compared, 0 flag mismatches, max |delta| = 0 at the
1 microsecond CSV print precision** for every field — gate crossings t_a and
t_b, raw, stopped, and moving time, on every track and sector. (True float
divergence is below 1e-6 s; both sides do the same float64 arithmetic in the
same order.)

Aggregates recomputed from the TS output match `data/analysis/RESULTS.md` §4
verbatim, e.g. Morning S1 185.5 s / sigma 6.44 / 12.7% interrupted …
EveningB S4 183.8 s / 4.90 / 3.6% — all 12 sectors identical.

## Live-detection simulation (625 gate-passages, non-detour rides)

| mode | clean-ride hard misses | detour misses | fired-estimated | skipped -> sector estimated |
|---|---|---|---|---|
| python-equivalent (no re-acq, 20 m arm) | 2 (0.3%) | 48 | 2 | 1 |
| D-016(a) as written (fixed 400 m re-acq) | 2 (0.3%) | 48 | 2 | 1 |
| D-016(a) time-aware (400 m floor, vmax 15 m/s) | **0** | 10 | 16 | 1 |

Double-fires: impossible by construction (monotonic chainage + in-order
latch), matching the Python sim's measured zero.

Row 1 reproduces RESULTS.md §6 exactly: the 3 clean-ride non-fires are the
same 3 gates on the same rides (20260521-1056 x2, 20260805-1034 START), and
the 48 detour misses match.

## Divergence found in D-016 amendment (a) — and the fix

Measured this cycle: the one clean ride that froze the forward-only window
(`20260521-1056`) is **not** a lateral excursion-and-rejoin. It is a **237 s
recording gap** (Strava auto-pause or GPS outage between fixes i=665 and
i=666) that resumes **1462 m downstream**, near the finish. A fixed ~400 m
forward re-acquisition bound as written in D-016(a) can never recover it —
row 2 proves it changes nothing.

Implemented instead (src/live.ts): the forward bound is **time-aware** —
`max(400 m, 15 m/s x seconds since the last on-route fix)` — still strictly
forward-only, still bounded by physical plausibility (15 m/s = 54 km/h, above
anything an e-bike does). Normal 1 Hz operation never exceeds the 400 m
floor; only genuine outages extend it. Gates crossed during such a jump fire
**estimated** (bracketing gap > 10 s or > 100 m), which D-013 renders
uncoloured and earcon-free. The 20260805-1034 START (first fix 56 m past the
gate, beyond the 50 m arming rule) is *correctly* skipped -> sector 1
estimated, per D-016(b) — a designed outcome, not a miss.

Side effect worth knowing: on detour rides the time-aware re-acquisition
recovers 38 of 48 previously-missed gates as estimated fires after the rider
rejoins. Their sectors stay uncoloured (off-corridor fixes / estimated flag),
so D-015 semantics are preserved; the ride simply regains later, real sectors.

**Needs ratification**: this is a deviation from the D-016(a) text ("~400 m").
Proposed to the Race Engineer / Principal as an amendment refinement.

## Other deviations from plan, explained

- **`@tmcw/togeojson` not used.** Two reasons: (1) the build sandbox's npm
  registry returned 403 on all packages this cycle, so the core was built
  dependency-free; (2) parity is stronger without it — `src/gpx.ts` mirrors
  the reference parser `01_parse.py` byte-for-byte in point-acceptance (a
  trkpt counts only with lat/lon/ele/time), so both pipelines see identical
  point sequences. The core now has **zero runtime dependencies**, which the
  app inherits. togeojson stays on the slate for any future generic-import UI.
- **`cheap-ruler` / `turf` not needed in core.** The track frame is a single
  equirectangular projection (constants identical to Python: 111320 / 110540
  m per degree; error negligible over 6 km), and the live loop is an O(window)
  segment search — already ~microseconds per fix. cheap-ruler would add a
  dependency to speed up something that is not slow.
- Windows CRLF in `activity-index.csv` and Python's csv `\r\n` line endings
  are stripped by the harness readers (cost one debugging round each).
