# BRIEF — gates-saving: replace `RIDE_WARP`'s linear lerp with a monotone cubic (round v8)

**Status: this brief is not yet executed.** Written 2026-09-20 (Plan tier, Fable).
Sonnet-executable: markdown + one JS block inside an `index.html`, no renders, no npm.
Stop-on-ambiguity applies — every anchor below is quoted verbatim from disk on
2026-09-20; if any anchor does not match, stop and report, do not adapt.

## 0. What this is, in one paragraph

`marketing/silent-studio/gates-saving/index.html` paces the rider along the route with
`RIDE_WARP`, five `[routeFraction, rideSeconds]` anchors, and `warpTime(f)`, which
**linearly** interpolates between them. Linear interpolation means the rider's speed is
constant inside each leg and jumps at every anchor. Round 7 made this visible: the
first leg (start → gate 1) runs at ~3x the old pace and then drops to less than half
that speed the instant the dot touches gate 1. This brief replaces the linear lerp with
a **monotone cubic Hermite interpolant (PCHIP tangents)** through the *same* five
anchors, so speed is continuous everywhere while every gate is still crossed at the
exact second the music expects. Only `warpTime(f)` changes; both of its callers pick
the new curve up automatically.

## 1. The problem, with its provenance

`silent-studio/gates-saving/rounds/v7/FEEDBACK.md`, "Things to watch", verbatim:

> The first leg (ride start to gate 1) now covers 24% of the route in just 0.52s --
> roughly 3x the old pace -- before the rider slows for the rest of the ride. Reads as
> a quick start in the frame check; worth a look at full speed in case it feels
> abrupt. A real easing curve (vs. the current hard piecewise-linear breaks at each
> gate) is the natural follow-up if so.

`audio-studio/gates-saving/soundv8/FEEDBACK.md`, carried-forward open item, verbatim:

> the first ride leg (start to gate 1) covers 24% of the route in 0.52s, ~3x the old
> pace, before slowing for the rest. Confirmed via frame extraction that it looks
> correct per the design (dot is exactly on the gate), but full-speed feel hasn't been
> watched yet. Flag if it reads as abrupt -- a real easing curve instead of hard
> per-gate breaks is the natural fix.

The numbers behind "hard breaks" (speed in route-fractions per second, i.e. 1/(dt/df)):

| Leg | f range | Δf | Δt (s) | dt/df | speed (route/s) |
|---|---|---|---|---|---|
| 1 start → gate 1 | 0 → 0.24 | 0.24 | 0.52 | 2.1667 | 0.462 |
| 2 gate 1 → gate 2 | 0.24 → 0.63 | 0.39 | 1.86 | 4.7692 | 0.210 |
| 3 gate 2 → gate 3 | 0.63 → 0.84 | 0.21 | 1.87 | 8.9048 | 0.112 |
| 4 gate 3 → end | 0.84 → 1 | 0.16 | 2.65 | 16.5625 | 0.060 |

At gate 1 the speed halves instantaneously (0.462 → 0.210); at gate 2 it halves again;
at gate 3 nearly so. Those are the three jolts.

## 2. Ruling

Replace the interpolation between `RIDE_WARP` anchors with a curve that:

- **(a) passes through every anchor exactly.** `warpTime(0.24)` must still be `0.52`,
  `warpTime(0.63)` = `2.38`, `warpTime(0.84)` = `4.25`, `warpTime(1)` = `6.9`,
  `warpTime(0)` = `0`. Absolute times (`RIDE_T0 = 4.8` +) stay 5.32 / 7.18 / 9.05 /
  11.70 s. This is non-negotiable — it is why `RIDE_WARP` exists (round 7 verified
  these against `soundtrack_v8.wav`'s real note onsets to ~20 ms). The audio is not
  touched by this brief and stays in sync because of (a).
- **(b) has continuous first derivative** (C¹): no speed jump at any anchor.
- **(c) is strictly monotonically increasing** in f: dt/df > 0 everywhere, so the rider
  never stops or moves backwards, and every one of `ride()`'s 240 tween steps gets a
  positive duration without relying on the `Math.max(0.0001, …)` guard.

**Method: cubic Hermite interpolation on each leg, with tangents chosen by the
PCHIP / Fritsch–Butland rule** (the weighted harmonic mean of the neighbouring secant
slopes; endpoints take their one-sided secant). This is the same interpolant as
MATLAB's `pchip` / SciPy's `PchipInterpolator` with secant endpoints. Why this one:

- Hermite through the anchors gives (a) by construction and (b) because adjacent legs
  share the tangent at their common anchor.
- The harmonic-mean tangent is never larger than twice the smaller neighbouring
  secant, which satisfies the Fritsch–Carlson sufficient condition for monotonicity
  (both normalised tangents in [0, 3]) — so (c) holds for *any* increasing anchor set,
  not just this one. A natural cubic spline or Catmull–Rom does **not** guarantee this
  and, with slopes ranging 2.2 → 16.6 across four legs, would overshoot.
- The endpoint tangent at f = 0 is the leg-1 secant itself, so the rider *starts* at
  exactly the speed it had in v7 (0.462 route/s) and then eases — the alternative
  three-point endpoint formula PCHIP sometimes uses would give a *faster* start here
  (dt/df = 1.18), the opposite of what round 7 flagged.

What this ruling does **not** do: it cannot make leg 1 slower on average. Leg 1 must
still cover 24 % of the route in 0.52 s because the anchor is pinned to the music. The
cubic in fact peaks slightly *faster* than v7 in the middle of leg 1 (0.52 route/s at
f ≈ 0.08 vs. v7's constant 0.462) because it has to decelerate into gate 1 while
covering the same distance in the same time. That is the price of continuity and is
accepted; if Nathan wants leg 1 genuinely slower, that is an anchor/`RIDE_T0` change
and a new audio round (cycle README ruling 3, `questionsfornathan.md` Q1).

## 3. The math, fully specified

Anchors `(x_i, y_i)` for i = 0..4, from `RIDE_WARP` (x = route fraction, y = ride seconds):

    (0, 0)  (0.24, 0.52)  (0.63, 2.38)  (0.84, 4.25)  (1, 6.9)

Step widths and secant slopes for each leg i = 0..3:

    h_i = x_{i+1} − x_i
    d_i = (y_{i+1} − y_i) / h_i

Tangents `m_i` at each anchor:

    m_0 = d_0                       (left endpoint: one-sided secant)
    m_4 = d_3                       (right endpoint: one-sided secant)
    for interior k = 1..3:
        if d_{k−1} ≤ 0 or d_k ≤ 0:  m_k = 0        (never triggers for these anchors; kept for safety)
        else:
            w1 = 2·h_k + h_{k−1}
            w2 = h_k + 2·h_{k−1}
            m_k = (w1 + w2) / (w1 / d_{k−1} + w2 / d_k)

Evaluation for f in leg i (x_i ≤ f ≤ x_{i+1}), with s = (f − x_i) / h_i:

    h00 =  2s³ − 3s² + 1
    h10 =    s³ − 2s² + s
    h01 = −2s³ + 3s²
    h11 =    s³ −  s²
    warpTime(f) = h00·y_i + h10·h_i·m_i + h01·y_{i+1} + h11·h_i·m_{i+1}

Precomputed for these anchors (the executor's own console output must match to 4 dp;
these were computed at Plan time by running §4's exact code under node):

| i | h_i | d_i |
|---|---|---|
| 0 | 0.24 | 2.1667 |
| 1 | 0.39 | 4.7692 |
| 2 | 0.21 | 8.9048 |
| 3 | 0.16 | 16.5625 |

| anchor | m_i (dt/df) | resulting speed at anchor (route/s) | v7 speed just before / just after |
|---|---|---|---|
| f = 0 | 2.1667 | 0.462 | — / 0.462 |
| f = 0.24 | 2.8935 | 0.346 | 0.462 / 0.210 |
| f = 0.63 | 6.4053 | 0.156 | 0.210 / 0.112 |
| f = 0.84 | 11.7414 | 0.085 | 0.112 / 0.060 |
| f = 1 | 16.5625 | 0.060 | 0.060 / — |

Spot values (f → new warpTime, v7 linear warpTime for comparison):

| f | new | v7 |
|---|---|---|
| 0.00 | 0.0000 | 0.0000 |
| 0.10 | 0.1990 | 0.2167 |
| 0.24 | **0.5200** | 0.5200 |
| 0.40 | 1.1154 | 1.2831 |
| 0.63 | **2.3800** | 2.3800 |
| 0.735 | 3.1749 | 3.3150 |
| 0.84 | **4.2500** | 4.2500 |
| 0.92 | 5.4786 | 5.5750 |
| 1.00 | **6.9000** | 6.9000 |

Global checks (computed at Plan time, to be re-run by the executor per §6):
dt/df over 100 001 evenly spaced f in [0, 1]: minimum 1.9244, maximum 18.1695, zero
non-positive values. 240 tween steps: smallest step 0.00802 s (at f = 0.0833), largest
0.07570 s (at f = 0.95), sum 6.9000 s.

## 4. The edit — exactly one block in one file

File: `marketing/silent-studio/gates-saving/index.html`. **Anchor (must match verbatim,
currently lines 230–248):**

```javascript
    // RIDE_WARP: [routeFraction, rideRelativeSeconds] anchors, piecewise-linear between
    // them -- speed is constant within a leg, and changes (not smoothly) at each anchor.
    // The first leg is the fast one: about 3x the old constant speed, to reach the
    // melody's first beat only 0.52s after the ride starts. Flagged in soundv8's
    // FEEDBACK.md as the thing most likely to need a second look.
    var RIDE_WARP = [
      [0, 0],
      [0.24, 0.52],   // gate1 -> melody E5 at content t=0.92s (bass_only/voice_a/melody share this clock)
      [0.63, 2.38],   // gate2 -> melody E5 at content t=2.78s
      [0.84, 4.25],   // gate3 -> melody E5 at content t=4.65s
      [1, 6.9],        // ride end, unchanged (== RIDE_DUR)
    ];
    function warpTime(f) {
      for (var i = 1; i < RIDE_WARP.length; i++) {
        var a = RIDE_WARP[i - 1], b = RIDE_WARP[i];
        if (f <= b[0]) { var t = (f - a[0]) / (b[0] - a[0]); return a[1] + t * (b[1] - a[1]); }
      }
      return RIDE_WARP[RIDE_WARP.length - 1][1];
    }
```

**Replace that whole block (comment, array, function) with:**

```javascript
    // RIDE_WARP: [routeFraction, rideRelativeSeconds] anchors. The rider crosses each
    // gate at exactly the anchor's time (that is what keeps it on the melody's E5
    // onsets in soundtrack_v8.wav), and between anchors it follows a monotone cubic
    // Hermite curve (PCHIP / Fritsch-Butland tangents) rather than v7's straight
    // lines -- so speed is continuous through every gate instead of jumping there.
    // The first leg is still the fast one (24% of the route in 0.52s, pinned by the
    // music); the curve only removes the jolt at gate 1, it cannot slow the leg.
    // Round v8 (cycle 13); the anchor values are unchanged from v7.
    var RIDE_WARP = [
      [0, 0],
      [0.24, 0.52],   // gate1 -> melody E5 at content t=0.92s (bass_only/voice_a/melody share this clock)
      [0.63, 2.38],   // gate2 -> melody E5 at content t=2.78s
      [0.84, 4.25],   // gate3 -> melody E5 at content t=4.65s
      [1, 6.9],        // ride end, unchanged (== RIDE_DUR)
    ];
    // Tangent (dt/df) at each anchor: weighted harmonic mean of the two neighbouring
    // secant slopes (endpoints: their one-sided secant). Never more than 2x the smaller
    // neighbour, which is what guarantees the curve is monotone -- t never decreases,
    // so the rider never stops or backs up. Computed once at load.
    var WARP_M = (function () {
      var n = RIDE_WARP.length, h = [], d = [], m = [];
      for (var i = 0; i < n - 1; i++) {
        h[i] = RIDE_WARP[i + 1][0] - RIDE_WARP[i][0];
        d[i] = (RIDE_WARP[i + 1][1] - RIDE_WARP[i][1]) / h[i];
      }
      m[0] = d[0];
      m[n - 1] = d[n - 2];
      for (var k = 1; k < n - 1; k++) {
        if (d[k - 1] <= 0 || d[k] <= 0) { m[k] = 0; continue; }
        var w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
        m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
      }
      return m;
    })();
    function warpTime(f) {
      var n = RIDE_WARP.length;
      if (f <= RIDE_WARP[0][0]) return RIDE_WARP[0][1];
      for (var i = 1; i < n; i++) {
        var a = RIDE_WARP[i - 1], b = RIDE_WARP[i];
        if (f <= b[0]) {
          var h = b[0] - a[0], s = (f - a[0]) / h, s2 = s * s, s3 = s2 * s;
          var h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
          return h00 * a[1] + h10 * h * WARP_M[i - 1] + h01 * b[1] + h11 * h * WARP_M[i];
        }
      }
      return RIDE_WARP[n - 1][1];
    }
```

Nothing else in the file changes. In particular, **do not touch either call site**:

- `ride(tl, start, dur)` (currently lines 254–263) — `var f = i / N, p = at(f * L), t = warpTime(f);`
- the sector-recolour block (currently lines 312–315) —
  `GATES.forEach(function (f, i) { var t = RIDE_T0 + warpTime(f); … })`

Both consume `warpTime(f)` and therefore pick up the new curve with no edit. Patching
either separately is exactly the desync round 7 had to fix; the single shared function
is the point. `RIDE_T0 = 4.8`, `RIDE_DUR = 6.9`, `GATES = [0.24, 0.63, 0.84]`, the
`#sec4` recolour at `RIDE_T0 + RIDE_DUR`, the rider fade-in at 4.4 s and the hold at
11.70 all stay as they are; the scene's total duration (12.3 s) is unchanged.

Stop-on-ambiguity triggers: the anchor block above is not found verbatim; `warpTime`
or `RIDE_WARP` appear anywhere in the file other than the block and the two call
sites named; a `WARP_M` identifier already exists; the file has an `index_v8-source.html`
sibling or a `rounds/v8/` folder already. Any of these → stop, report, do not proceed.

## 5. Round docs (markdown only)

1. **Create `marketing/silent-studio/gates-saving/rounds/v8/FEEDBACK.md`**, in the shape
   of `rounds/v7/FEEDBACK.md` (read it first; do not edit it — it is the historical
   record for v7 and its "Things to watch" note is what this round answers). Required
   content:
   - header `# 03 — Gates & Saving — Round v8`; **Render file:** `gates-saving_v8.mp4
     (not rendered yet — Nathan's PC step; commands in
     marketing/cycles/13_gates-easing-and-loose-ends/COMMANDS.md §2)`; **Duration
     (planned):** `12.300s (unchanged from v7)`; **Source:** `../../index.html`.
   - "What changed since v7": the §0 paragraph in your own words, the anchor table
     from v7 with the note that all crossing times are unchanged, the §3 tangent/speed
     table, and the sentence that the audio (`soundtrack_v8.wav`, the v8 mux) is
     untouched because the anchors are.
   - "Verified (without a render)": the numbers from your §6 run.
   - "Things to watch": (i) whether the run-in to gate 1 now reads as a glide — the
     open question this round exists to answer (Q1 in the cycle's
     `questionsfornathan.md`); (ii) that the peak speed in leg 1 is ~12 % higher than
     v7's constant (0.52 vs 0.46 route/s) by necessity.
   - "Render on the PC" block: the single `render.ps1 -Name gates-saving -Render` line
     and a pointer to `COMMANDS.md` §2 in this cycle folder for the copy / ffprobe /
     frame-extract / mux steps — do not duplicate those blocks.
   - an empty "Nathan's feedback" section.
2. **Copy the edited `index.html` to `rounds/v8/index_v8-source.html`** only if the
   `colours` convention applies here too — check: `gates-saving/rounds/v7/` has no
   `index_v7-source.html`, so the gates-saving convention is *not* to snapshot the
   source. Do not create one.
3. **`marketing/silent-studio/gates-saving/README.md`**: add a v8 row below the v7 row
   (currently line 20) in the same column format: `| [v8](rounds/v8/FEEDBACK.md) |
   gates-saving_v8.mp4 | — | Built, awaiting Nathan's render — monotone-cubic ride
   easing through the unchanged RIDE_WARP anchors (cycle 13) |`. Change the v7 row's
   trailing "Current." to "Current until v8 is rendered." Nothing else in that README.
4. Do **not** edit anything under `marketing/audio-studio/` — the soundtrack and the mux
   are unaffected. Do not edit `silent-studio/structure.md` or `silent-studio/COMMANDS.md`.

## 6. Verification (executor — no render possible; report numbers, not adjectives)

The sandbox cannot run `render.ps1` / HyperFrames / npm (standing limitation). Verify
the math directly instead:

1. **Run the new function under node.** Copy the exact `RIDE_WARP` + `WARP_M` +
   `warpTime` block from §4 into a scratch file in your scratchpad directory (not the
   repo), append the following checks, run `node <file>`, and paste the output into
   your report:
   ```javascript
   console.log('m =', WARP_M.map(function (x) { return x.toFixed(4); }).join(', '));
   RIDE_WARP.forEach(function (p) { console.log('anchor f=' + p[0], warpTime(p[0]).toFixed(6), 'abs', (4.8 + warpTime(p[0])).toFixed(4)); });
   var N = 240, prevT = 0, minStep = Infinity, sum = 0;
   for (var i = 1; i <= N; i++) { var t = warpTime(i / N), st = t - prevT; if (st < minStep) minStep = st; sum += st; prevT = t; }
   console.log('240 steps: minStep', minStep.toFixed(5), 'sum', sum.toFixed(4));
   var bad = 0, minD = Infinity; for (var j = 0; j <= 100000; j++) { var f = j / 100000, e = 1e-6, lo = Math.max(0, f - e), hi = Math.min(1, f + e); var dd = (warpTime(hi) - warpTime(lo)) / (hi - lo); if (dd <= 0) bad++; if (dd < minD) minD = dd; }
   console.log('dt/df: nonpositive', bad, 'min', minD.toFixed(4));
   [0.1, 0.4, 0.735, 0.92].forEach(function (f) { console.log('f=' + f, warpTime(f).toFixed(4)); });
   ```
   **Pass criteria (must all hold, else stop and report):** `m` =
   `2.1667, 2.8935, 6.4053, 11.7414, 16.5625`; anchors print `0.000000 / 0.520000 /
   2.380000 / 4.250000 / 6.900000` with abs `4.8000 / 5.3200 / 7.1800 / 9.0500 / 11.7000`;
   `minStep` ≈ `0.00802` (> 0.0001, the `ride()` guard, by a wide margin); `sum` =
   `6.9000`; `nonpositive 0`; `min` ≈ `1.9244`; the four spot values `0.1990 / 1.1154 /
   3.1749 / 5.4786`.
2. **Confirm the edit is the only change**: a diff of `index.html` against its
   pre-edit state touches only the §4 block (comment + array + `WARP_M` + `warpTime`).
   Report the line range of the change.
3. **Confirm nothing else consumes the curve**: `grep -rn "RIDE_WARP\|warpTime\|WARP_M"
   marketing/` should hit only `silent-studio/gates-saving/index.html` (the block and
   the two call sites), the gates-saving `README.md`, `rounds/v7/FEEDBACK.md`, your new
   `rounds/v8/FEEDBACK.md`, `audio-studio/gates-saving/README.md`,
   `audio-studio/gates-saving/soundv8/FEEDBACK.md`, `audio-studio/piano/projects/
   interstellar/NOTES.md`, and the cycle 12/13 folders — i.e. docs only; no other code.
   If any other `.html`/`.js`/`.py` file references them, stop and report.
4. **Not applicable, do not run:** the app test suite and `tsc` (CLAUDE.md §6) — this
   brief touches only `marketing/silent-studio/`, nothing under `app/`.
5. The render, the three-frame gate check and the mux are Nathan's, already in
   `COMMANDS.md` §2 of this cycle folder.

## 7. Report format

Path of the edited file and the exact line range replaced; the node output from §6.1
verbatim; the grep result from §6.3; the two markdown files created/edited; and one
sentence per §4 stop-trigger confirming it did not fire. No opinions on how it will
look — nobody has seen it move yet.
