# WP-D1 addendum — adjudication of the executor's two escalations (2026-08-20)

Written by the reviewer standing in for Fable. The WP-D1 executor stopped correctly on two
judgment calls. Both are resolved; WP-D1 is landed in full and the suite is green
(**167 tests: 164 pass, 0 fail, 3 benign skips**; `tsc --noEmit` clean).

**Anyone about to run WP-D2 must read section 2 — WP-D2's "current state" description of
`engine.ts` is now one change out of date, and that change is what makes WP-D2's own tests 5–7
produce the numbers its brief predicts.**

---

## 1. MorningB gate re-projection — the brief's expected numbers were measured on a different line

The brief's §3 expectation `≈[215, 1850, 3120, 4450, 5785] ±15 m` is wrong. The executor's
implementation was right; two independent reproductions agree with it to 0.1 m.

Root cause, measured on `qualifire-20260819-1155.gpx`:

| line the chainage was measured on | length | gate chainages |
|---|---|---|
| smoothed, **not yet resampled** (this is the brief's own "5962 m line") | 5961.37 m | 214, 1846, 3112, 4434, 5765 |
| smoothed + 5 m resampled — what `buildReference` actually stores | 5941.50 m | 209.7, 1840.9, 3094.9, 4417.0, 5747.2 |
| + the stationary-run collapse **this brief's §1 mandates** | **5927.06 m** | **203.8, 1834.9, 3081.0, 4403.0, 5733.3** |

Two independent effects, both shortening the chainage, neither accounted for in the expected numbers:

1. **Metric mismatch.** The analyst quoted a 5962 m line; `buildReference`'s stored reference is
   5941.5 m. The 20 m difference is chord-vs-arc: resampling at 5 m along the arc stores vertices
   whose straight-line chainage is shorter, and the deficit concentrates in curvy stretches — so
   it is *not* a uniform scale factor. That alone moves FINISH by 18 m.
2. **The collapse step.** §1 of this same brief added `collapseStationaryRuns`, which removes the
   ~14 m jitter knot left by ride 1's two mid-ride stops (both sit between G1 and G2 — exactly
   where the executor's per-gate error jumps from 15 m to 39 m). The analyst measured before that
   step existed.

The residual (analyst's numbers sit 0–20 m above even the un-resampled line, and every one of them
is an exact multiple of 5) says they were read off to the nearest 5 m, not computed. The ±15 m
tolerance was written against a number the brief's own §1 change invalidates.

**Reversal/direction ruled out.** MorningB's FINISH gate is EveningB's START (at work) and its
START is near home; the rebuilt chainages ascend START→FINISH; the pre-promotion `routes.json`
entry (`20260520-2317-work2home … (reversed)`) drew the same home→work direction. Ride 1 is
home→work and is built **not** reversed. Correct.

### Ruling — adopt the executor's numbers as v2 (landed)

`[204, 1835, 3081, 4403, 5733]` m on the 5927.06 m line (exact projections 203.777, 1834.932,
3080.970, 4402.990, 5733.279; rounded to whole metres to match `gates.ts`'s existing convention and
to keep the two copies trivially comparable). Safety checks: strictly monotonic; START at 3.44 % and
FINISH at 96.73 % of the line (the cold-start 3 %/97 % convention); spacings 1631 / 1246 / 1322 /
1330 m (v1's were 1639 / 1225 / 1325 / 1325); lateral offsets of the five preserved physical gate
positions 0.36 / 2.54 / 8.32 / 9.03 / 0.58 m, all far inside the 40 m corridor.

Landed in `catalog.seed.json` (gate set v2, v1 retained, route → v2), `core/src/gates.ts`
(same numbers, kept in sync by a new test), and the rebuilt `routes.json` MorningB entry.

---

## 2. The 5 test failures — WP-D2 as briefed would NOT have fixed them

The escalation's premise ("WP-D2's anchored rule is the fix") is false. The failure is not a margin
that cannot open; it is a **re-acquisition teleport being counted as lock evidence**.

Traced on the `clean_morning` fixture, candidate MorningB:

```
fix  10  ground   17 m   Morning s=7.0   xtd 4.8    MorningB s=45.9   xtd  4.9
fix  50  ground  240 m   Morning s=228.4 xtd 2.4    MorningB s=45.9   xtd 170.1   (frozen, off-corridor)
fix  78  ground  415 m   Morning s=399.8 xtd 1.5    MorningB s=45.9   xtd 225.7
fix  79  ground  420 m   Morning s=405.0 xtd 1.2    MorningB s=624.1  xtd  37.2   <-- +578 m in one fix
```

Around 460 m of ground the Morning road passes back within 40 m of the promoted MorningB line.
D-016(a)'s time-aware re-acquisition (bound `max(400, 15 · Δt)`) does its job and re-acquires
MorningB 578 m downstream **in a single fix**. `Candidate.adv = chainage − baseS` read that
teleport as 607.8 m of advance, beat Morning's honest 405.0 m by 202.8 m, and hard-locked MorningB.
With the pre-promotion stand-in reference MorningB was 223 m off-corridor at that moment and frozen
at 8.6 m — which is why this was latent until WP-D1.

Simulating WP-D2's briefed algorithm confirms it does not help: both candidates are *anchored*
(both start at home), so the anchored clause never fires, `blockers` is empty, and D2 hard-locks
MorningB **verified** — with or without `pick=Morning`, and on both the legacy 4-track specs the
existing suites inject and the full 20-route catalog. D2's own new test 5 would have failed too.

### Ruling — neither "land red and wait for D2" nor "hold the reference back". Fix the defect (landed)

Holding the reference back solves nothing (the defect is in the engine and D2 makes all 20 routes
candidates anyway) and withholds a promotion Nathan ratified. Landing red is worse than described,
because nothing downstream was going to turn it green.

`app/src/live/engine.ts` now makes `adv` mean **corridor-verified travel**:

```ts
export const REACQ_JUMP_M = DEFAULT_LIVE_OPTIONS.windowFwd;   // 240 m
// in feedCandidate: if the projector moved forward by more than its own
// search window in one fix, carry baseS forward with it — the candidate keeps
// the new chainage, it just earns no lock evidence for ground it never showed.
```

240 m is not a tuned number: ordinary windowed projection is bounded by `windowFwd`, so a larger
single-fix move can **only** be a re-acquisition. No false positives are possible.
`LOCK_MIN_ADVANCE_M` (400) and `LOCK_MARGIN_M` (200) are untouched. Gate firing, chainage and every
displayed time are untouched — this is a lock-race rule only.

Measured effect across every committed fixture: identical lock fix index and lock advance
everywhere, except (a) `clean_morning` / `synthetic_truncated`, which go back to locking Morning at
405.0 m, and (b) `wrongdir_eveninga`, which still locks Morning but earlier (fix 40 at 410.5 m
instead of fix 75 at 820.8 m — the 820.8 was itself a re-acquisition artifact). Regression test:
`live: a re-acquisition jump is not lock evidence …` in `live_suite.ts`, which pins both that the
pathology is real in the fixture data and that the engine is immune to it.

### What WP-D2's executor needs to know

- `engine.ts` has a new exported `REACQ_JUMP_M` and `feedCandidate` maintains `baseS`
  incrementally. D2's rewrite of the `feed()` else-branch (brief lines 196–219) is orthogonal —
  **do not revert this**, and keep `adv` meaning corridor-verified travel when candidates are
  rebuilt from `TrackSpec`s.
- `live_suite.ts`'s `advanceAt()` helper gained a `discount` parameter mirroring the same rule.
  When D2 switches `drive()` to `new LiveEngine(fixtureSpecs())`, the new regression test must keep
  MorningB among the fixture specs or it stops proving anything.
- Forward-look, simulating D2's design **with this fix in place** — these are the numbers to expect,
  not a reason to escalate:
  - test 5 (`clean_morning`, full catalog, `pick=Morning`) → **soft lock on Morning at fix 79**,
    leader at that instant is HomeFosh (407.7 m), blockers = Morning, HomeStationPreferred,
    HomeStationViaFosh, HomeChurch. Exactly the shape the brief predicts.
  - test 6 (`clean_eveningb`, no pick) → **verified lock on EveningB at adv 400.4 m**. Inside the
    brief's [400, 700] window but at its floor, *not* the predicted ~510–560: WorkChurchB is only
    at 174 m when EveningB reaches 400, so the 200 m margin is already open and it never blocks.
  - test 7 (`clean_eveninga`, no pick) → **verified lock on EveningA at adv 405.3 m**;
    StationHomePreferred and StationWorkAlt are unanchored and correctly never block.

---

## 3. Landed

| file | change |
|---|---|
| `app/src/live/engine.ts` | `REACQ_JUMP_M`; `adv` = corridor-verified travel; header comment |
| `app/core/src/gates.ts` | MorningB chainages → v2 `[204, 1835, 3081, 4403, 5733]` + comment |
| `app/src/store/catalog.seed.json` | MorningB gate set v2 appended (v1 retained); route → `gateSetVersion: 2` |
| `app/assets/routes/routes.json` | MorningB entry rebuilt on the promoted line (150 path pts, gates at v2 chainages) |
| `safe_to_delete/routes-morningb-pre-promotion-20260820.json` | the old MorningB entry (never deleted) |
| `app/tests/store_suite.ts` | `refs: MorningB is the promoted 2026-08-19 ride`; the routes.json test now loops MorningB **and** StationHomeWet |
| `app/tests/live_suite.ts` | re-acquisition regression test; `advanceAt(…, discount)` |

Untouched and already correct from the executor's pass: `build_track_ref.ts` (collapse helper),
`refs.json` (20 tracks; the 3 medoid tracks byte-identical), StationHomeWet route/way/gate set.

MorningB v2 gate positions, for eyeballing (physical positions unchanged from v1):
START <https://www.google.com/maps?q=50.83779,4.63917> ·
G1 <https://www.google.com/maps?q=50.83719,4.65665> ·
G2 <https://www.google.com/maps?q=50.84241,4.66960> ·
G3 <https://www.google.com/maps?q=50.85318,4.67684> ·
FINISH <https://www.google.com/maps?q=50.86211,4.68696>

Acceptance story, replayed end to end: feeding `qualifire-20260819-1155.gpx` (the promoted ride
itself) through a default engine locks **MorningB at fix 77**, fires all 5 gates, and produces four
real (non-estimated) sectors and a real lap — while a genuine Morning commute locks Morning.

## 4. Two follow-ups for the coordinator (neither blocking)

- **`routes.json` inverse transform uses the wrong metres-per-degree.** WP-D1 §5 specifies
  `lat = lat0 + (y/R)/rad` with `R = 6378137` (≈111319.5 m/deg), but the forward transform
  (`core/src/geo.ts` `toXY`) uses `M_PER_DEG_LAT = 110540`. The drawn line is therefore stretched
  ~0.7 % north–south — up to ~20 m, about 3 px at the 900×1400 canvas. MorningB and StationHomeWet
  were both written with the brief's formula so all rebuilt entries stay mutually consistent; a
  future pass should switch every entry to 110540 together. Drawn-map only: no effect on chainage,
  gates, projection or timing.
- **`data/analysis/` (or wherever the analyst's port lives) should adopt the resampled-line
  metric**, so future "expected chainage" figures in briefs are measured on the line the engine
  actually projects onto.
