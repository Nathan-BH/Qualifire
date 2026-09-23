# BRIEF — gates-saving: invert the surge (fast BETWEEN gates, slow AT the gates)

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable: one
anchored JS edit inside `marketing/silent-studio/gates-saving/index.html` plus round
docs; no renders, no npm, no audio. Stop-on-ambiguity applies — every anchor is quoted
verbatim from disk on 2026-09-23 (`index.html` mtime 2026-09-20 19:52:51 UTC, unchanged
since cycle 14's v8 landed). **Fixes** the direction error in
`14_ride-loop-surge-and-salamander/BRIEF-gates-surge-pacing.md` (that brief's *timing*
stands in full; only its speed *shape* was backwards).

## 0. What this is, in one paragraph

Nathan, on `ride/soundv1` (`audio-studio/ride/soundv1/FEEDBACK.md`, point 1): "The ride
animation is wired incorrectly, what i actually wanted is for it to speed up in between
gates and slow down at the gates. Whil the current animation is slow between gates and
then speeds up at the gates." Cycle 14 read idea 6 ("speeds up and then slows down for
the gates crossing") as *peak at the gate*; v8 therefore runs 0.041 → **0.208** (gate 1)
→ 0.060 → **0.216** (gate 2) → 0.054 → **0.215** (gate 3) → 0.053 route/s — fast *on*
the ticks, crawling between them. This brief mirrors the shape: the rider's speed now
**dips at every E5 pulse** (start line, three gates, finish line) and **crests at the
mid-time of every leg**, 0.050 → 0.198 → 0.052 → 0.219 → 0.054 → 0.215 → 0.054 → 0.214
→ 0.054. Nothing about *when* the rider is *where* changes: `GATES`, `PULSE_T`, `GATE_T`,
`RIDE_T0`, `RIDE_DUR` are byte-identical, the five crossings still land at video 3.80 /
5.81 / 7.65 / 9.51 / 11.38 s on the five E5 onsets, so the existing audio
(`ride/soundv1/ride_master_v1.wav`, `gates-saving/soundv9/soundtrack_v9.wav`) stays in
sync and is untouched. Only `RIDE_PROFILE` (the speed shape between those anchors)
changes. Nathan must re-render `gates-saving_v9.mp4` on his PC to see it (§5, §8).

## 1. Why the timing constants are not free (do not touch them)

`audio-studio/ride/ride_master.py` renders the master with `E5_CONTENT = [12.50, 14.51,
16.35, 18.21, 20.08]` — the five E5 onsets of the Interstellar note list
(`piano/projects/interstellar/soundtrack.py` `MELODY`, second loop iteration at P =
15.43 s) placed at master τ = 17.80 / 19.81 / 21.65 / 23.51 / 25.38, i.e. gates-saving
video 3.80 / 5.81 / 7.65 / 9.51 / 11.38 (`RIDE_T0 + PULSE_T`, cross-checked at 0 ms
drift in the ride round doc). Those are *where the notes sound*. The fix is therefore
animation-only: the rider must still be at route fraction `F[k]` = 0 / 0.25 / 0.50 /
0.75 / 1 at `PULSE_T[k]` = 0 / 2.01 / 3.85 / 5.71 / 7.58 — just moving slowly there
instead of fast.

## 2. The inverted model ("uniform dip")

Same machinery as cycle 14 §2 — leg k runs node k → k+1, duration `D[k] = PULSE_T[k+1]
− PULSE_T[k]`, covers 0.25 of the route, mean speed `vbar[k] = 0.25 / D[k]`; speed is a
chain of half-cosine ramps and a ramp from speed a to b over d seconds covers
d·(a + b)/2 of the route. What changes is which value is *set* and which is *derived*:

- at **every pulse** (node k = 0…4) the speed is a **dip**, set by one rule:
  `v[k] = (1 − A) × (vbar[k−1] + vbar[k]) / 2` at the three gates (both adjacent legs
  count equally, as before), and `v[0] = (1 − A) × vbar[0]`, `v[4] = (1 − A) × vbar[3]`
  at the start and finish lines (one adjacent leg, so its mean alone);
- inside **every leg** (all four, the first and last included) the speed rises to a
  **crest** at the leg's mid-time, `crest[k] = 2·vbar[k] − (v[k] + v[k+1]) / 2` — the
  one value that makes the two half-ramps cover exactly 0.25 of the route:
  `(D/2)·(v[k] + crest)/2 + (D/2)·(crest + v[k+1])/2 = D·vbar[k] = 0.25` ✓.

So the profile is **eight** half-leg ramps (v8 had six: one ramp per end leg, two per
inner leg); speed is continuous everywhere (each ramp ends where the next begins), and
`rideFrac` — unchanged — hits `F[k]` at `PULSE_T[k]` by construction.

**Knob: `DIP_A = 0.6`, `(1 − A)` form.** Rationale: v8's `SURGE_A = 0.6` put the gate
peaks at 1.6× the local mean and the *derived* troughs came out at ≈0.44× (0.0595 /
0.1359). The exact mirror is dips at 0.4× (= 1 − 0.6) with derived crests at ≈1.6×
(0.2187 / 0.1359 = 1.61). Result: **the same speed envelope Nathan has already seen
in v8 — min 0.050 vs 0.041, max 0.219 vs 0.216 route/s — with the fast and slow
moments swapped.** The alternative `mean / (1 + A)` form gives dips at 0.625× and crests
at ≈1.375× for the same A (v = 0.078–0.085, crests 0.169–0.189): a visibly milder
surge than v8 — rejected only because it would change two things at once (direction
*and* strength); if Nathan later wants it milder, `DIP_A = 0.5` (dips 0.062, crests
0.205) is the one-number change (`questionsfornathan.md` Q2).

**Positivity / no stall — strictly safer than v8.** `v[k] = (1 − A) × (positive mean) > 0`
for every A < 1, and every crest satisfies `crest[k] = 2·vbar[k] − (v[k] + v[k+1])/2 ≥
2·vbar[k] − (1 − A)·max(vbar) > vbar[k] > 0`. In v8 the *derived* values were the
troughs and went negative above A ≈ 0.91; here the derived values are crests, which
can never go below the leg mean. Headroom table (node, this pass):

| `DIP_A` | min dip | max crest | crest / dip |
|---|---|---|---|
| 0.3 | 0.0871 | 0.1789 | 2.05 |
| 0.5 | 0.0622 | 0.2054 | 3.30 |
| **0.6** | **0.0498** | **0.2187** | **4.40** |
| 0.7 | 0.0373 | 0.2319 | 6.22 |
| 0.8 | 0.0249 | 0.2452 | 9.86 |
| 0.9 | 0.0124 | 0.2585 | 20.8 |

**Why the ends are dips, not single ramps (a design call — logged as Q1).** The literal
mirror of v8's end legs (one ramp each) would force `v[0] = 2·vbar[0] − v[1] = 0.1967`
and `v[4] = 2·vbar[3] − v[3] = 0.2138`: the rider would *appear* at near-crest speed on
the start line and hit the finish at crest speed, then freeze (`tl.set('#rider', …)` at
`RIDE_T0 + RIDE_DUR`) — a 0.21 route/s → 0 jolt, exactly the class of thing cycles 13–14
removed. Treating the start and finish pulses like the gates (they *are* E5 pulses, and
v8 already treats them as nodes) gives a gentle roll-out (0.050, v8 had 0.041) and a
gentle arrival (0.054, v8 had 0.053) and one rule for all five pulses. Nathan's sentence
only specifies the gates; the ends are this brief's default, provisional.

**Computed (node 22 on Nathan's PC, this pass — the code of Edit 1 verbatim):**

| | value |
|---|---|
| legs `D` | 2.01 / 1.84 / 1.86 / 1.87 s (unchanged) |
| leg means `vbar` | 0.1244 / 0.1359 / 0.1344 / 0.1337 route/s (unchanged) |
| dips `v[0..4]` (at the five pulses) | **0.0498** (start) / 0.0520 / 0.0541 / 0.0536 (gates) / **0.0535** (finish) |
| crests (mid-time of legs 0–3) | 0.1979 / 0.2187 / 0.2150 / 0.2138 |
| `RIDE_DUR` | 7.58 s (unchanged) |
| min / max speed over 240 steps | 0.0499 / 0.2186 route/s — no stall, no jump (v8: 0.0406 / 0.2161) |
| speed at pulses vs at mid-legs | 0.050 / 0.052 / 0.054 / 0.054 / 0.054 **vs** 0.198 / 0.219 / 0.215 / 0.214 — the inversion, in numbers |
| mean speed | 0.1319 route/s (unchanged: same distance, same time) |
| monotone | 100 001-point derivative scan: 0 non-increasing samples |
| segments | 8 (was 6) |

Where the crests fall on the map: the mid-*time* of each leg is roughly the mid-*route*
(legs are near-symmetric), so the fastest stretches are around route fractions ≈0.125 /
0.375 / 0.625 / 0.875 — the open straights — and the slowest point of leg 1→2 is the
hairpin apex at 0.50 (gate 2), which now reads as "brakes for the hairpin" rather than
v8's "sprints through it". Recorded as a thing to watch, not a design input.

## 3. Constants — what stays, what changes

| | value | this brief |
|---|---|---|
| `GATES` | `[0.25, 0.50, 0.75]` (line 151) | **unchanged** |
| `PULSE_T` | `[0, 2.01, 3.85, 5.71, 7.58]` | **unchanged** |
| `GATE_T` | `PULSE_T.slice(1, 4)` | **unchanged** |
| `RIDE_T0` / `RIDE_DUR` | `3.80` / `RIDE_PROFILE.dur` = 7.58 (line 314) | **unchanged** |
| `SURGE_A = 0.6` | peak = (1 + A) × mean | **removed** |
| `DIP_A = 0.6` | dip = (1 − A) × mean | **new** |
| `RIDE_PROFILE.trough` | mid-leg troughs (legs 1, 2) | **removed** (nothing reads it — checked: `grep -rn "\.trough"` over `marketing/**/*.{html,js,py}` → no hits) |
| `RIDE_PROFILE.crest` | mid-leg crests (legs 0–3) | **new** |
| `RIDE_PROFILE.segs` | 6 ramps | 8 ramps |
| `rideFrac`, `ride()`, Beat 4 wiring, sector recolour times, fade-in 3.40, scene 12.3 s | | **unchanged** |
| every file under `audio-studio/` | | **unchanged** |

## 4. The edit — one file, `marketing/silent-studio/gates-saving/index.html`

**One edit.** Line numbers are the pre-edit file's (mtime 2026-09-20 19:52:51 UTC).
The anchor is verbatim; stop if it is not found exactly once.

**Edit 1 — lines 219–246, anchor:** the 28-line block that starts with the comment line

```javascript
    // Melody-aligned pacing, take 2 (cycle 14, Nathan's idea 6): the rider still crosses
```

and ends with the IIFE's closing line

```javascript
    })();
```

(the block on disk, in full: comment lines 219–232 ending
`    // marketing/cycles/14_ride-loop-surge-and-salamander/BRIEF-gates-surge-pacing.md`;
line 233 `    var PULSE_T = [0, 2.01, 3.85, 5.71, 7.58]; // ride-relative seconds …`;
234 `    var GATE_T = PULSE_T.slice(1, 4); …`; 235 `    var SURGE_A = 0.6; …`; 236–246
`    var RIDE_PROFILE = (function () { … })();` — the eleven-line IIFE whose body has
`trough[k] = 2 * vbar[k] - (v[k] + v[k + 1]) / 2` on line 243 and
`return { segs: segs, D: D, vbar: vbar, v: v, trough: trough, dur: PULSE_T[n] };` on
line 245). Line 247, `    // Route fraction at ride-relative time t. Monotone as long as
every ramp stays above 0.`, and everything after it are **not** part of the anchor and
must not change. Replace the 28 lines with these 27:

```javascript
    // Melody-aligned pacing, take 3 (cycle 15, Nathan's feedback on v8): the rider still
    // crosses each gate exactly on one of the soundtrack's own E5 pulses -- FIVE consecutive
    // pulses carry the ride (start line, gate 1, gate 2, gate 3, finish line) and the gates
    // sit at exact quarters of the route (GATES), so every leg is 0.25 of the route in one
    // E5 interval (~1.9 s). Take 2 (cycle 14) had the speed shape backwards: it PEAKED at
    // each gate and dipped between them. Nathan wants the opposite -- "speed up in between
    // gates and slow down at the gates" -- so the profile is now the mirror image: within
    // each leg the rider's speed is a half-cosine ramp chain DOWN to a DIP at every pulse
    // (start line, the three gates, finish line -- the same rule at all five) and UP to a
    // CREST at the leg's mid-time; every leg, the first and the last included, is one
    // dip-crest-dip cycle, so the rider rolls out of the start gently and arrives at the
    // finish gently. Because a ramp from speed a to b over d seconds covers d*(a+b)/2 of the
    // route, every pulse is hit at its PULSE_T by construction and speed is continuous
    // everywhere (no jolts). Numbers and the calculation:
    // marketing/cycles/15_ride-surge-fix-and-audio-tooling/BRIEF-gates-surge-inversion.md
    var PULSE_T = [0, 2.01, 3.85, 5.71, 7.58]; // ride-relative seconds of the five E5 pulses = video 3.80 / 5.81 / 7.65 / 9.51 / 11.38
    var GATE_T = PULSE_T.slice(1, 4);          // the gate crossings (pulses 2-4)
    var DIP_A = 0.6;                           // dip = (1-A) x mean of the adjacent legs' mean speeds; crest = whatever lands the leg
    var RIDE_PROFILE = (function () {
      var F = [0].concat(GATES).concat([1]), n = F.length - 1, D = [], vbar = [], v = [], crest = [], segs = [], k;
      for (k = 0; k < n; k++) { D[k] = PULSE_T[k + 1] - PULSE_T[k]; vbar[k] = (F[k + 1] - F[k]) / D[k]; }
      for (k = 1; k < n; k++) v[k] = (1 - DIP_A) * (vbar[k - 1] + vbar[k]) / 2;   // dip speed at every gate
      v[0] = (1 - DIP_A) * vbar[0];                                               // start line: the same dip rule, one adjacent leg
      v[n] = (1 - DIP_A) * vbar[n - 1];                                           // finish line: the same dip rule, one adjacent leg
      for (k = 0; k < n; k++) { crest[k] = 2 * vbar[k] - (v[k] + v[k + 1]) / 2; segs.push([D[k] / 2, v[k], crest[k]]); segs.push([D[k] / 2, crest[k], v[k + 1]]); }   // per leg: [duration, vFrom, vTo] half-cosine ramps dip -> crest -> dip; the crest is what lands the leg
      return { segs: segs, D: D, vbar: vbar, v: v, crest: crest, dur: PULSE_T[n] };
    })();
```

The two lines `var PULSE_T = …` and `var GATE_T = …` are byte-identical to the old
ones (they are inside the anchor only because the block is replaced as a whole). After
the edit the file is one line shorter: `rideFrac` starts at line 247 (was 248), `ride()`
at 260 (was 261), Beat 4's `var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;` at 313
(was 314).

**Nothing else changes.** `SURGE_A` and `trough` must not remain anywhere in the file
(`grep` — stop trigger if a reference survives). Lines 258–260's comment ("Rider along
the route on the surge profile …") and line 310's ("Beat 4 (3.8-11.38): second ride, on
the surge profile …") stay as they are — still true.

## 5. Round docs (markdown only)

1. **Create `marketing/silent-studio/gates-saving/rounds/v9/FEEDBACK.md`** (stop
   trigger if `rounds/v9/` already exists). Shape of `rounds/v8/FEEDBACK.md`. Header
   `# 03 — Gates & Saving — Round v9`; **Render file:** `gates-saving_v9.mp4 (not
   rendered yet — Nathan's PC step; the render block below)`; **Duration (planned):**
   `12.300s (unchanged)`; **Source:** `../../index.html`. "What changed since v8": §0
   in your own words, Nathan's point 1 quoted; a table of speed at the five pulses vs
   at the four mid-legs, v8 → v9 (v8: pulses 0.041 / 0.208 / 0.216 / 0.215 / 0.053,
   mid-legs — / 0.060 / 0.054 / — with legs 0 and 3 being single ramps; v9: pulses
   0.050 / 0.052 / 0.054 / 0.054 / 0.054, mid-legs 0.198 / 0.219 / 0.215 / 0.214); a
   line that every crossing *time* and route fraction is unchanged (3.80 / 5.81 / 7.65 /
   9.51 / 11.38 at 0 / 0.25 / 0.50 / 0.75 / 1); the §3 table. **Audio for this round:**
   the existing `audio-studio/gates-saving/soundv9/soundtrack_v9.wav` (the master's
   slice) is still the right audio — the E5 pulses are at the same video times — so
   this round *does* have valid audio from day one; the mux (`gates-saving_v9_with_
   sound_v9.mp4`, and a `ride_v2.mp4` concat with `start-ride_v4.mp4`) is a Claude
   follow-up once the render exists, not a line for Nathan. "Verified (without a
   render)": the §6.1 output. "Things to watch": (a) the roll-out under `capA` is now
   0.050 route/s rising to 0.198 at ~1.0 s — the rider is at 6.7 % of the route when
   `capA` starts fading at 4.5 s and 14.3 % when it is gone at 4.9 s (v8: 3.9 % / 8.4 %);
   (b) gate 2's dip is inside the hairpin apex
   (Nathan waived the geometry; now it reads as braking for the bend); (c) whether the
   *gentle* finish (0.054) still reads as "finish" — if Nathan wants a sprint finish
   instead, that is the one-ramp end variant in the brief's §2 (Q1), a two-line change;
   (d) the ~28 ms Salamander sample lead (`ride/soundv1/FEEDBACK.md`, "Known, benign
   timing offset") is unchanged by this round — the rider is now *slowest* at the
   pulses, so a pulse sounding 0.8 frame late is less visible than it was in v8, not
   more. Render block (below, §8). Empty "Nathan's feedback".
2. **`marketing/silent-studio/gates-saving/README.md`:** add the v9 row after the v8
   row (line 21), same format — `| [v9](rounds/v9/FEEDBACK.md) | gates-saving_v9.mp4 |
   — | Built, awaiting Nathan's render — surge inverted: slow at every E5 pulse, fast
   mid-leg (cycle 15); gate times unchanged, soundv9 audio still valid |`; change v8's
   "Rendered, current —" to "Rendered — superseded by v9 (surge direction was
   backwards) —"; line 3's "(currently v8)" → "(currently v9)".
3. Do **not** edit anything under `marketing/audio-studio/` (Nathan's feedback text in
   `ride/soundv1/FEEDBACK.md` stays exactly as he wrote it; the coordinator adds the
   "answered in cycle 15" pointer, not the executor), nor `structure.md`, nor cycle 14's
   files.

## 6. Verification (executor — no render possible; numbers, not adjectives)

1. **Run the new block under node.** Copy line 151 (the `GATES` line, unchanged) and
   Edit 1's 27 lines, then the unchanged `rideFrac` (post-edit lines 247–255) and
   `var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;` into a scratch file, append:
   ```javascript
   var P = RIDE_PROFILE, f4 = function (x) { return x.toFixed(4); };
   console.log('D', P.D.map(f4).join(', '), '| vbar', P.vbar.map(f4).join(', '));
   console.log('v0..v4', P.v.map(f4).join(', '), '| crests', P.crest.map(f4).join(', '));
   console.log('RIDE_DUR', RIDE_DUR.toFixed(4), 'ride end', (RIDE_T0 + RIDE_DUR).toFixed(4), 'segs', P.segs.length);
   PULSE_T.forEach(function (t, k) { console.log('pulse' + k, 'abs', (RIDE_T0 + t).toFixed(2), 'rideFrac', rideFrac(t).toFixed(6), 'target', [0, 0.25, 0.5, 0.75, 1][k]); });
   var N = 240, prev = 0, minStep = 1e9, maxStep = 0; for (var i = 1; i <= N; i++) { var f = rideFrac(i / N * RIDE_DUR), st = f - prev; if (st < minStep) minStep = st; if (st > maxStep) maxStep = st; prev = f; }
   console.log('240 steps: min df', minStep.toFixed(5), 'max df', maxStep.toFixed(5), 'min speed', (minStep / (RIDE_DUR / N)).toFixed(4), 'max speed', (maxStep / (RIDE_DUR / N)).toFixed(4));
   var bad = 0; for (var j = 0; j <= 100000; j++) { var t = j / 100000 * RIDE_DUR, e = 1e-5, lo = Math.max(0, t - e), hi = Math.min(RIDE_DUR, t + e); if (rideFrac(hi) - rideFrac(lo) <= 0) bad++; }
   console.log('non-increasing samples', bad);
   var sp = function (t) { var e = 1e-4, a = Math.max(0, t - e), b = Math.min(RIDE_DUR, t + e); return (rideFrac(b) - rideFrac(a)) / (b - a); };
   var mids = [0, 1, 2, 3].map(function (k) { return (PULSE_T[k] + PULSE_T[k + 1]) / 2; });
   console.log('speed at pulses', PULSE_T.map(function (t) { return sp(t).toFixed(4); }).join(', '), '| at mid-legs', mids.map(function (t) { return sp(t).toFixed(4); }).join(', '));
   console.log([0.5, 1.0, 1.5, 2.5, 3.0, 3.5, 4.5, 5.0, 5.25, 6.0, 6.5, 7.0].map(function (t) { return 'f(' + t.toFixed(2) + ')=' + rideFrac(t).toFixed(4); }).join(' '));
   ```
   **Pass criteria (computed at Plan time on Nathan's PC, node v22.23.2, with this
   exact code; all must hold, to the last printed digit):**
   ```
   D 2.0100, 1.8400, 1.8600, 1.8700 | vbar 0.1244, 0.1359, 0.1344, 0.1337
   v0..v4 0.0498, 0.0520, 0.0541, 0.0536, 0.0535 | crests 0.1979, 0.2187, 0.2150, 0.2138
   RIDE_DUR 7.5800 ride end 11.3800 segs 8
   pulse0 abs 3.80 rideFrac 0.000000 target 0
   pulse1 abs 5.81 rideFrac 0.250000 target 0.25
   pulse2 abs 7.65 rideFrac 0.500000 target 0.5
   pulse3 abs 9.51 rideFrac 0.750000 target 0.75
   pulse4 abs 11.38 rideFrac 1.000000 target 1
   240 steps: min df 0.00158 max df 0.00690 min speed 0.0499 max speed 0.2186
   non-increasing samples 0
   speed at pulses 0.0498, 0.0520, 0.0541, 0.0536, 0.0535 | at mid-legs 0.1979, 0.2187, 0.2150, 0.2138
   f(0.50)=0.0382 f(1.00)=0.1234 f(1.50)=0.2096 f(2.50)=0.2921 f(3.00)=0.3898 f(3.50)=0.4747 f(4.50)=0.5681 f(5.00)=0.6708 f(5.25)=0.7121 f(6.00)=0.7691 f(6.50)=0.8445 f(7.00)=0.9447
   ```
   The "speed at pulses … | at mid-legs …" line is the one that proves the inversion:
   every pulse value must be below 0.06 and every mid-leg value above 0.19.
2. **Diff:** the change touches only lines 219–246 of the pre-edit file (post-edit
   219–245; report both). `grep -n "SURGE_A\|trough" marketing/silent-studio/gates-saving/index.html`
   → no hits. `grep -n "PULSE_T = \[0, 2.01, 3.85, 5.71, 7.58\]" index.html` → exactly
   one hit; `grep -n "var GATES = \[0.25, 0.50, 0.75\]" index.html` → line 151;
   `grep -n "RIDE_T0 = 3.80" index.html` → exactly one hit (line 313 post-edit).
   `git diff --stat` (with `GIT_OPTIONAL_LOCKS=0`) → one file, and the diff must not
   touch line 151, `rideFrac`, `ride()`, or Beat 4.
3. **Not applicable, do not run:** `app/` tests, `tsc`, anything under `audio-studio/`,
   the gate-geometry check (GATES unchanged — cycle 14's §6.3 numbers stand).
4. The render and the frame checks are Nathan's — §8.

## 7. Report format

Post-edit line range of the edit; §6.1 node output verbatim; the grep results; one
sentence per stop trigger (the anchor not found exactly once; `rounds/v9` exists;
`DIP_A` or `crest` already present in the file; a `SURGE_A`/`trough` reference
surviving; §6.1 values off by more than 1 in the last printed digit; line 151 or line
314 (pre-edit) not byte-identical to §3's values).

## 8. Things to watch / Nathan's step (goes into `OPEN-ITEMS.md` once this lands)

This brief changes **nothing** in the audio or the mux. The five gate-crossing
timestamps are unchanged, so `soundtrack_v9.wav` and `ride_master_v1.wav` line up with
the new render as they are. Nathan re-renders on his PC (PowerShell, from
`marketing\silent-studio\`):

```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
$new = Get-ChildItem .\gates-saving\renders\*.mp4 | Where-Object { $_.Name -notlike '*_day.mp4' } | Sort-Object LastWriteTime | Select-Object -Last 1
Copy-Item $new.FullName .\gates-saving\rounds\v9\gates-saving_v9.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 .\gates-saving\rounds\v9\gates-saving_v9.mp4
foreach ($t in '3.80','4.80','5.81','6.73','7.65','8.58','9.51','10.45','11.38') { ffmpeg -y -v error -ss $t -i .\gates-saving\rounds\v9\gates-saving_v9.mp4 -frames:v 1 ".\gates-saving\rounds\v9\frame_$($t.Replace('.','_'))s.png" }
```

Planned duration 12.300 s. Frame checks: the rider on the start line at 3.80, on each
gate tick at 5.81 / 7.65 / 9.51 and on the finish ring at 11.38 (same five as v8 — the
*positions* did not move); the four new mid-leg frames (4.80 / 6.73 / 8.58 / 10.45) are
where the rider should be moving fastest, roughly an eighth of the route past each
pulse. Then Claude muxes `soundv9`'s WAV onto it and rebuilds `ride_v2.mp4`
(`audio-studio/ride/soundv2/`), and moves the superseded `gates-saving_v8_with_sound_v9.mp4`
in **both** `silent-studio/all-renders/` and `audio-studio/all-renders/` to
`Qualifire\_to_delete\` — never deleted.
