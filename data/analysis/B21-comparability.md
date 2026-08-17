# B-21 — Are archive (Strava-export) traces comparable to future app-recorded traces?

Race Engineer, cycle 004 (2026-08-14). Gates D-018 (app pre-seeding). Forensics run inline on the
125 cached track rides (cache from `01_parse.py`); no new scripts written.

## 1. Forensics on the archive

- **Provenance.** All 624 GPX: `creator="StravaGPX"` (bulk-export re-render), zero `<extensions>`
  (no HR/cadence/power/device), no device field in `activities.csv` → recorded by the **Strava
  phone app**. On Android that means Google's fused location provider — the same source
  expo-location uses `[UNVERIFIED — Strava's internal recorder implementation]`.
- **Sampling.** 98.0% of intervals are exactly 1 s. Gaps >1.5 s: ~20/ride, median 4 s; 58% begin
  at <1 m/s → **stationary point-dropping confirmed**. Per ride: stationary-gap time median 0 s
  (p90 10 s); moving-gap time median 6 s (p90 68 s). **5/125 rides contain hour-scale gaps**
  (recorder left running: 18114423397, 18630944261, 19011356244, 19399895229, 19421935423).
- **Smoothing, not snapping.** Stationary jitter radius median 0.46 m (p90 1.05 m). Cruise-speed
  increment σ = 0.32 m/s with lag-1 autocorr −0.35 (pure white position noise gives −0.67) →
  high-frequency position noise ≈ 0.1–0.5 m, an order of magnitude below raw GNSS (3–5 m): the
  stream is Kalman-filtered (FLP and/or Strava cleanup). **No road-snapping**: parallel-path
  cross-track offsets up to 19 m survive (RESULTS §1) — a snapper would have erased them.
- **No privacy-zone trimming**: traces start/end 15–70 m from the home/work anchors.
## 2. What expo-location changes on the same phone

Matters for sector moving time (D-008):
- **Noise level.** Raw FLP output may be noisier than Strava's cleaned export. Bound: gate-timing
  error ≈ position noise / speed → 0.5 m at 6.5 m/s ≈ 0.1 s; even raw-GNSS 5 m ≈ 0.8 s. Both
  sit far under σ_s = 4–10 s (D-016).
- **Cadence.** `timeInterval:1000` is a minimum-interval *hint*; actual spacing wobbles
  `[UNVERIFIED magnitude]`. D-011 gate interpolation absorbs 1–2 s spacing. **Config trap:**
  setting `distanceInterval>0` silently disables `timeInterval` (expo/expo#10196) — use
  `accuracy: BestForNavigation, timeInterval: 1000, distanceInterval: 0`.
- **Continuous stationary points** (no dropping). NEUTRAL under our pipeline: stop detection is
  timestamp-based, so a 4 s stationary gap and four 1 Hz jitter fixes (<1 m/s) classify identically.

Does not matter: elevation source (timing never reads `<ele>`); Strava's own moving-time field
(never used — our pipeline recomputes from lat/lon/t only); missing `accuracy` field in the
archive (the app gains a quality filter the archive lacked — strictly an improvement).

## 3. Fairness verdict

**Comparable — YES, with guards.** The archive is not "Strava-processed times": it is the phone's
own fused-location stream at 1 Hz, minus stationary points, mildly cleaned. Seeds computed by OUR
pipeline (D-011/D-016) from those coordinates share the moving-time definition exactly. The only
plausible systematic is smoothing-related gate-timing shift, bounded ≲1 s/gate ≈ ≲2 s/sector
[estimate] — under half the noise floor and under the k·σ_s colour margin, so it cannot mint a
false purple. Stationary dropping adds **zero** moving-time bias under our detector.

## 4. Recommendation (for D-018, app)

1. **Pre-seed** benchmarks and σ_s from our-pipeline sector times of *clean* archive rides only:
   exclude the 5 gap-pathological rides and any sector containing a moving-gap >5 s.
2. **Mark seeded benchmarks** visually (ghost dot on the chip) — a first-week purple should be
   honest about its opponent.
3. **Let D-008 rolling windows retire seeds naturally**: the 7-day (green) benchmark is 100%
   app-native after 7 days of use; the 28-day (purple) after 28 days. At ~5 rides/week/track no
   extra expiry mechanism is needed — seeds are gone within one month by construction.
4. **Calibration tripwire, first app week**: recompute the three fingerprints (dt histogram,
   stationary jitter, cruise dv σ) on app traces; if cruise dv σ > 2× archive (>0.64 m/s),
   re-derive σ_s from app rides only and flag to Principal. Seeding σ_s from the archive also
   kills the <5-clean-rides cold-start neutral on day one (29–64 clean rides per track).
