# BRIEF — gates-saving: design the ride from the E5 interval ("uniform surge"), gates at exact quarters on five pulses

**Status: ready to execute (2026-09-20, third Plan pass — Nathan has answered every
question; nothing here depends on an open answer any more).** Written 2026-09-20 (Plan
tier, Fable). Sonnet-executable: markdown + JS/HTML edits inside one `index.html`, no
renders, no npm. **Replaces** `13_gates-easing-and-loose-ends/BRIEF-gates-warp-easing.md`
(Nathan, Q5: "cycle13 should not be followed"; cycle 13's README row is marked
superseded). Stop-on-ambiguity applies — every anchor is quoted verbatim from disk on
2026-09-20 (`index.html` mtime 2026-09-19 22:34, unchanged through all three passes).

**What changed in this pass.** Nathan's Q6 answer settles the layout: he does not accept
the hairpin objection ("I don't see the issue with the middle gate being inside an
hairpin, it does not really matter"), wants the gates at 25 / 50 / 75 % of the ride, and
points out we can choose how many E5 pulses carry it — "3 for the gates or 5 if we
include the 0% and 100% start and end of the ride". Finalised here as **`GATES =
[0.25, 0.50, 0.75]` on five consecutive E5 pulses** (start line, three gates, finish
line): every one of the four legs is exactly 0.25 of the route in exactly one E5
interval, so the lead-in and the finish sprint stop being special cases. The whole model
was recomputed from the note list for this (§1–§3); the earlier C1/C7 layouts and the
"why not quarters" argument are kept only as history (§2c). Also added: Nathan's Q7
typography change (Edit 7) — same file, same pass.

## 0. What this is, in one paragraph

Nathan (idea 6): he likes that the v7 rider "speeds up and then slows down for the
gates crossing", regrets that it only happens at gate 1, and asks to make that shape
uniform across all gates — designing *from the music*: first fix the interval of the
"extra notes" (the E5 pulses), then compute how long the ride must be including the
speed-ups and slow-downs, then decide whether the current ride/gates fit or must
change. This brief does exactly that: the E5 interval is **1.94 ± 0.09 s**; a
"surge" profile (speed peaks at every gate, dips to a trough between gates, same shape
at each gate) is defined; **five consecutive pulses** of the continuous ride track
(`BRIEF-ride-loop-track.md`) carry the ride — the rider leaves the start line on pulse 1,
crosses gates at **0.25 / 0.50 / 0.75** of the route on pulses 2–4, and reaches the
finish on pulse 5 — so the ride is **7.58 s**, from video **3.80 s to 11.38 s**, inside
the existing 12.3 s scene (finish hold 0.92 s, was 0.6 s), no new route, no new map
capture, no change to the scene's duration.

## 1. The interval (re-measured from the note list in this pass)

E5 onsets (`piano/projects/interstellar/soundtrack.py` `MELODY`, content seconds):
0.92, 2.78, 4.65, 6.61, 8.57, 10.68, 12.50, 14.51. Consecutive gaps: **1.86, 1.87,
1.96, 1.96, 2.11, 1.82, 2.01** — mean 1.941 s, SD 0.093 s (population; 0.100 sample).
Across the loop seam (ride brief §1, P = 15.43) the gap is 14.51 → 16.35 = **1.84**,
then iteration 1 repeats the list: 16.35, 18.21, 20.08, 22.04, …. So the pulse is one
steady ~1.9 s beat with ±5 % human wobble, **not** a perfectly regular clock — which is
why the ride cannot simply run at constant speed and still hit every pulse (§2), even
though Nathan is right that it is regular *enough* to put the gates at exact quarters.

**Which five pulses.** On the ride clock (ride brief §3: start-ride's soundv7 placement
kept, so gates-saving video `v` = content `c` − 8.7) the E5 pulses that fall inside
gates-saving are at video 1.98 / **3.80 / 5.81 / 7.65 / 9.51 / 11.38** / (13.34, past the
scene). The first, 1.98, is inside the intro (rings pop 1.05–1.55, gate ticks draw
1.9–2.9, `capA` 1.6–4.9), so the ride takes the next five: content c = 12.50 / 14.51 /
16.35 / 18.21 / 20.08. Their gaps — the four leg durations — are **2.01 / 1.84 / 1.86 /
1.87 s** (the first is the piece's bar-4 gap, the second is the loop seam, the last two
are bar 1 of the next iteration). Sum **7.58 s** = `RIDE_DUR`.

## 2. The calculation Nathan asked for

**Model ("uniform surge", five-pulse form).** Node k (k = 0…4) is the rider at route
fraction `F[k]` = 0 / 0.25 / 0.50 / 0.75 / 1 at ride-relative time `PULSE_T[k]` = 0 /
2.01 / 3.85 / 5.71 / 7.58 (an E5 onset each). Leg k runs node k → k+1, lasting
`D[k] = PULSE_T[k+1] − PULSE_T[k]` and covering 0.25 of the route, so its mean speed is
`vbar[k] = 0.25 / D[k]`. Speed along the route is a chain of half-cosine ramps:

- at every **gate** (interior node k = 1, 2, 3) the speed is a **peak**,
  `v[k] = (1 + A) × (vbar[k−1] + vbar[k]) / 2` — the same rule at all three gates
  (both adjacent legs count equally; that is what makes it uniform);
- inside legs 1 and 2 (gate → gate) the speed dips to a **trough** at the leg's
  mid-time, `trough[k] = 2·vbar[k] − (v[k] + v[k+1]) / 2`, which is exactly the value
  that makes the two half-ramps cover 0.25 of the route;
- leg 0 (start → gate 1) is **one ramp up** from the start speed `v[0] = 2·vbar[0] − v[1]`
  to the gate-1 peak; leg 3 (gate 3 → finish) is **one ramp down** from the gate-3 peak
  to the finish speed `v[4] = 2·vbar[3] − v[3]`. Both end speeds are *derived*, not
  chosen — there is no `V_START` / `V_END` knob any more, and no derived `dur`:
  `RIDE_DUR = PULSE_T[4]` is read straight off the music.

Each ramp from speed `a` to `b` over `d` seconds covers `d·(a + b)/2` of the route, so
every pulse is hit at its `PULSE_T` by construction — no curve fitting — and speed is
continuous everywhere (each ramp ends where the next begins). `A = 0.6` as before.

**Does the surge shape still earn its place, now that every leg is the same length?**
Yes, for two reasons. (1) It is the feature: Nathan's idea 6 *is* "speeds up and then
slows down for the gates crossing" made uniform; a constant-speed rider would hit the
pulses but show nothing at the gates. (2) The legs are equal in *route* but not in
*time* (2.01 / 1.84 / 1.86 / 1.87 s), so even a "constant speed" rider would have to run
at 0.124 / 0.136 / 0.134 / 0.134 route/s with a 9 % step at gate 1 — small, but a jolt,
which is what cycle 13 was trying to remove. The ramp chain absorbs the wobble inside
each leg instead. What *did* simplify: the profile is symmetric (start and finish are
treated alike), two knobs disappeared (`V_START`, `V_END`), and the ride length is no
longer a derived quantity.

**Computed (node, this pass — the code of Edit 2 verbatim):**

| | value |
|---|---|
| legs `D` | 2.01 / 1.84 / 1.86 / 1.87 s |
| leg means `vbar` | 0.1244 / 0.1359 / 0.1344 / 0.1337 route/s |
| node speeds `v[0..4]` | **0.0406** (start) / 0.2082 / 0.2162 / 0.2145 (gate peaks) / **0.0529** (finish) |
| troughs (legs 1, 2) | 0.0595 / 0.0535 |
| `RIDE_DUR` | **7.58 s** (= `PULSE_T[4]`) |
| min / max speed over 240 steps | 0.0406 / 0.2161 route/s — no stall, no jump |
| mean speed | 0.1319 route/s (start-ride's constant ride is 0.1176 — the two rides now feel alike) |
| monotone | 100 001-point derivative scan: 0 non-increasing samples |
| `A` head-room | start speed stays > 0 up to A = 0.91, finish speed up to A = 0.99; A = 0.6 is well inside |

For comparison, v7's leg speeds were 0.462 / 0.210 / 0.112 / 0.060 route/s with jumps
at every gate; the new profile runs 0.041 → 0.208 → 0.060 → 0.216 → 0.054 → 0.215 →
0.053, continuous. The first ride (`start-ride`, constant speed) is untouched.

**Is anything actually wrong with 0.25 / 0.50 / 0.75, beyond the look Nathan waived?
No.** Checked explicitly in this pass: the maths lands every pulse (above); it fits the
scene (ride ends 11.38, `capB` starts fading 11.9, scene ends 12.3); no speed is
nonsensical (peaks 0.21–0.22 route/s are less than half of v7's first leg; the slowest
point, 0.041 at the start line, is a roll-out, not a stall — C1's was 0.038). The one
non-visual consequence of gate 2 at 0.50 is that sector 2 (yellow) hands over to sector
3 (purple) inside the hairpin's ~50 px blob rather than on an open stretch — a look, the
same class of thing Nathan waived, and it renders deterministically (the tick's angle is
set by `GATES[1] = 0.50` exactly; nothing is rounded at run time). Recorded, not
objected to.

### 2a. Geometry at the three gate points (kept for the record; not an objection)

Re-run in this pass on the `ROUTE` polyline of line 150 (70 vertices, L = 1255.0 px),
same method as the second pass (arc-length parameterisation; "far-part" = nearest route
segment whose arc range lies outside ±10 % of L; "tick-local" = nearest route segment
outside ±2 % of L to any point of the 44 px tick, oriented as lines 179–189 orient it;
"swing" = heading change between f − 0.01 and f + 0.01):

| f | point (px) | far-part, px | tick-local, px | swing, ° |
|---|---|---|---|---|
| 0.25 | 836.8, 833.6 | 128 | 46 | 18 |
| 0.50 | 920.7, 653.2 | 87 | **15** | **54** |
| 0.75 | 1129.8, 479.0 | 132 | 31 | 4 |

Gate 2 sits at the apex of the hairpin (the route doubles back within 22–40 px of itself
between 0.42 and 0.57; the turnaround is ~100 px of route in a 41 × 39 px box). Nathan has
seen these numbers (Q6 text) and waived them. They are the §6.3 expected values.

### 2b. Why the *current* gates could not take the shape (unchanged finding)

With `GATES = [0.24, 0.63, 0.84]` the legs between gates are 0.39 and 0.21 of the route
in ~1.86 s each — mean speeds 0.210 vs 0.112 route/s, a 1.9× ratio; with the same
relative surge at both gates leg 2's trough falls to 0.006 route/s (the rider visibly
stalls). Uniform surge needs equal legs; exact quarters are the cleanest equal legs there
are. (Tempo-stretching the audio cannot change this — the stall ratio is tempo-invariant;
see 2c.)

### 2c. History — what the second pass proposed and why it is dropped

The second pass held that 0.50 was unusable because of the hairpin (tick-local 15 px,
54° swing) and offered quarter-*spaced* layouts C7 (0.35 / 0.60 / 0.85, 6.83 s) and C1
(0.30 / 0.60 / 0.90, 6.33 s), both with an asymmetric lead-in/sprint and a free `V_END`.
Nathan's answer waives the geometric objection and adds the fifth pulse; with that, C0
(exact quarters) is not only possible but the only layout where all four legs are
identical in route length *and* each is one E5 interval — C1/C7 are strictly less
uniform. Nothing from C1/C7 survives into the code. **Tempo (Q6b):** Nathan took the
default — `TEMPO = 1.0`, no stretch; the knob lives in `ride_master.py` (ride brief §4)
and, if ever set ≠ 1, every `PULSE_T` here scales as 1/TEMPO and §6.1 is recomputed with
the same code. The second pass's finding stands that a stretch is a length/tempo knob,
never a placement knob.

## 3. Ruling — the constants (final)

From `BRIEF-ride-loop-track.md` §3 (identical numbers there — the single consistency
check of this cycle): gates-saving's five ride pulses fall at video **3.80 / 5.81 / 7.65 /
9.51 / 11.38 s**.

| | value | derivation |
|---|---|---|
| `GATES` | `[0.25, 0.50, 0.75]` | exact quarters (Nathan, Q6) |
| `RIDE_T0` | `3.80` | E5 at video 3.80 (content c = 12.50) — the "go" pulse |
| `PULSE_T` | `[0, 2.01, 3.85, 5.71, 7.58]` | 3.80 / 5.81 / 7.65 / 9.51 / 11.38 − 3.80 |
| `GATE_T` | `[2.01, 3.85, 5.71]` | `PULSE_T[1..3]` |
| `SURGE_A` | `0.6` | peak = 1.6 × mean of the two adjacent legs' means |
| `RIDE_DUR` | **7.58 s** | `PULSE_T[4]` — the finish pulse |
| ride ends | **11.38 s** | `RIDE_T0 + RIDE_DUR`; `#sec4` paints there; the finish E5 sounds there |
| start / finish speed | 0.0406 / 0.0529 route/s | derived (§2) |
| peaks at gates | 0.2082 / 0.2162 / 0.2145 | |
| troughs mid-leg | 0.0595 / 0.0535 | |
| rider fade-in | `3.40` | `RIDE_T0 − 0.4`, as today's 4.4 = 4.8 − 0.4 |
| scene duration | 12.3 s, **unchanged** (Q7 default) | finish hold 11.38–12.3 = 0.92 s (was 11.7–12.3 = 0.6 s) — Q7's 2.2 s worry is gone |

`capA` (1.6–4.9) overlaps the first 1.1 s of the ride — kept on purpose (the slow
roll-out under the caption reads as "here we go"; if it fights, that is a "Things to
watch" item, not an edit). `capB` at 5.2 is unchanged and fades 11.9–12.3, 0.52 s after
the finish pulse. `data-duration` 12.4 / rendered 12.3 s unchanged.

## 4. The edits — one file, `marketing/silent-studio/gates-saving/index.html`

Seven edits, all in this file, one execution pass. Line numbers are the pre-edit file's
(mtime 2026-09-19 22:34). Anchors are verbatim; stop if any is not found exactly once.

**Edit 1 — line 151, anchor (verbatim):**

```javascript
    var GATES = [0.24, 0.63, 0.84];                                  // fractions of route length (clear of the 0.40-0.57 self-loop)
```

replace with:

```javascript
    var GATES = [0.25, 0.50, 0.75];                                  // exact quarters of the route (cycle 14 surge pacing; Nathan waived the 0.42-0.57 hairpin at gate 2)
```

`GATES` also drives the tick geometry (lines 177–189) and the sector dash windows
(lines 170–175) — both rebuild from the array, no other edit.

**Edit 2 — lines 219–248, anchor:** the comment block starting
`    // Melody-aligned pacing (2026-09-20, Nathan's idea): the old build synthesized an E5`
through the closing `    }` of `function warpTime(f)` (comment lines 219–229, blank `//`
line, `RIDE_WARP` comment 230–234, array 235–241, `warpTime` 242–248 — the block cycle
13's brief §4 quotes in full). Replace the whole block with:

```javascript
    // Melody-aligned pacing, take 2 (cycle 14, Nathan's idea 6): the rider still crosses
    // each gate exactly on one of the soundtrack's own E5 pulses (no gate-chime in the
    // audio -- see audio-studio/gates-saving/soundv8/FEEDBACK.md for take 1), but the
    // pacing is now designed from the music instead of fitted to it: FIVE consecutive E5
    // pulses carry the ride -- start line, gate 1, gate 2, gate 3, finish line -- and the
    // gates sit at exact quarters of the route (GATES), so every leg is 0.25 of the route
    // in one E5 interval (~1.9 s). Within each leg the rider's speed is a half-cosine ramp
    // chain: up to a PEAK at each gate, down to a trough between gates, the same shape at
    // every gate ("uniform surge"); the first leg is one ramp up from the start speed to
    // the gate-1 peak, the last leg one ramp down from the gate-3 peak to the finish
    // speed. Because a ramp from speed a to b over d seconds covers d*(a+b)/2 of the
    // route, every pulse is hit at its PULSE_T by construction and speed is continuous
    // everywhere (no jolts). Numbers and the calculation:
    // marketing/cycles/14_ride-loop-surge-and-salamander/BRIEF-gates-surge-pacing.md
    var PULSE_T = [0, 2.01, 3.85, 5.71, 7.58]; // ride-relative seconds of the five E5 pulses = video 3.80 / 5.81 / 7.65 / 9.51 / 11.38
    var GATE_T = PULSE_T.slice(1, 4);          // the gate crossings (pulses 2-4)
    var SURGE_A = 0.6;                         // peak = (1+A) x mean of the two adjacent legs' mean speeds; trough = whatever lands the leg
    var RIDE_PROFILE = (function () {
      var F = [0].concat(GATES).concat([1]), n = F.length - 1, D = [], vbar = [], v = [], trough = [], k;
      for (k = 0; k < n; k++) { D[k] = PULSE_T[k + 1] - PULSE_T[k]; vbar[k] = (F[k + 1] - F[k]) / D[k]; }
      for (k = 1; k < n; k++) v[k] = (1 + SURGE_A) * (vbar[k - 1] + vbar[k]) / 2;   // peak speed at every gate
      v[0] = 2 * vbar[0] - v[1];                                                     // start speed: the first ramp lands gate 1 on its pulse
      v[n] = 2 * vbar[n - 1] - v[n - 1];                                             // finish speed: the last ramp lands the finish on its pulse
      var segs = [[D[0], v[0], v[1]]];                                               // [duration, vFrom, vTo] half-cosine speed ramps
      for (k = 1; k < n - 1; k++) { trough[k] = 2 * vbar[k] - (v[k] + v[k + 1]) / 2; segs.push([D[k] / 2, v[k], trough[k]]); segs.push([D[k] / 2, trough[k], v[k + 1]]); }
      segs.push([D[n - 1], v[n - 1], v[n]]);
      return { segs: segs, D: D, vbar: vbar, v: v, trough: trough, dur: PULSE_T[n] };
    })();
    // Route fraction at ride-relative time t. Monotone as long as every ramp stays above 0.
    function rideFrac(t) {
      var x = 0, t0 = 0, segs = RIDE_PROFILE.segs;
      for (var i = 0; i < segs.length; i++) {
        var d = segs[i][0], va = segs[i][1], vb = segs[i][2];
        if (t <= t0 + d) { var tau = t - t0; return x + ((va + vb) / 2) * tau - ((vb - va) / 2) * (d / Math.PI) * Math.sin(Math.PI * tau / d); }
        x += d * (va + vb) / 2; t0 += d;
      }
      return 1;
    }
```

**Edit 3 — lines 250–264, anchor** (the second pass wrote 250–263; the function's own `    }` is line 264 — re-checked on disk in this pass)**:** the four comment lines starting
`    // Rider along the route, paced by RIDE_WARP instead of constant speed: still 240 short`
and the whole `function ride(tl, start, dur) { … }` that follows (ends with the `}`
after `prev = p; prevT = t;`). Replace with:

```javascript
    // Rider along the route on the surge profile: still 240 short linear tweens (no
    // callbacks, no plugins, so a frame-seeking renderer always lands on the right point),
    // now equal in TIME (dur/240 each) with the position per step taken from rideFrac(t).
    function ride(tl, start, dur) {
      var N = 240, prev = at(0), step = dur / N;
      for (var i = 1; i <= N; i++) {
        var p = at(rideFrac(i * step) * L);
        tl.fromTo('#rider', { attr: { cx: prev.x, cy: prev.y } },
          { attr: { cx: p.x, cy: p.y }, duration: step, ease: 'none', immediateRender: false, lazy: false },
          start + (i - 1) * step);
        prev = p;
      }
    }
```

**Edit 4 — lines 278–279, anchor (comment only):**

```javascript
    // Snap the (now-invisible) rider back to the route's start point, so its 4.4s fade-in for the
    // second ride reappears at the start line rather than jumping there from the finish at 4.8s.
```

replace `4.4s` with `3.4s` and `at 4.8s` with `at 3.8s` (RIDE_T0 − 0.4 and RIDE_T0).

**Edit 5 — line 299, anchor (comment only):**

```javascript
    // Beat 3 (5.2-12.3): caption B -- fades in while the second ride (started 4.8) is already running.
```

replace `(started 4.8)` with `(started 3.8)`. Nothing else on the line.

**Edit 6 — lines 304–319, anchor:** from `    // Beat 4 (4.8-11.7): second ride. …`
through `    tl.set('#rider', { opacity: 1 }, 11.70);` (the block as on disk: the
three-line Beat-4 comment, `var RIDE_T0 = 4.8, RIDE_DUR = 6.9;`, the rider fade-in at
`4.4`, `ride(tl, RIDE_T0, RIDE_DUR);`, the three-line sector comment,
`GATES.forEach(function (f, i) { var t = RIDE_T0 + warpTime(f); …`, the `#sec4` line,
`// hold to 12.4`, the final `tl.set`). Replace with:

```javascript
    // Beat 4 (3.8-11.38): second ride, on the surge profile -- start line, three gates and the finish each
    // on an E5 pulse. Crossing a gate = that sector paints its tier colour (cycle 9: the overlay is now the
    // core's own 6px, so the line changes colour but never width; the gate ticks stay white -- the old
    // recolour-on-cross was never a wanted feature, per Nathan).
    var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;                 // ride starts ON the E5 at video 3.80s; ends ON the E5 at 11.38s
    tl.fromTo('#rider', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, RIDE_T0 - 0.4);
    ride(tl, RIDE_T0, RIDE_DUR);
    // Sector recolouring fires at the gate's own crossing time -- GATE_T is what ride() paces to,
    // so the dot and the paint cannot drift apart.
    GATES.forEach(function (f, i) {
      tl.to('#sec' + (i + 1), { opacity: 1, duration: 0.25 }, RIDE_T0 + GATE_T[i]);
    });
    tl.to('#sec4', { opacity: 1, duration: 0.25 }, RIDE_T0 + RIDE_DUR);
    // hold to 12.4
    tl.set('#rider', { opacity: 1 }, RIDE_T0 + RIDE_DUR);
```

Provenance of the Beat-4 comment (checked at the second Plan pass): the parenthetical
"(cycle 9: the overlay is now the core's own 6px … never a wanted feature, per Nathan)"
is **the file's own existing comment**, lines 304–306 on disk, carried over verbatim
because Edit 6 replaces the lines it lives on. It records round v6
(`rounds/v6/FEEDBACK.md`; `gates-saving/README.md` v6 row). Keep it; do not reword it.

**Edit 7 — line 136, the caption "Next time. Start racing yourself." (Nathan, Q7:
"have the 'your' straight and the 'self' in italic").** Today the markup is the
*opposite* (v4, `rounds/v4/FEEDBACK.md`: "your" italic-not-bold, "self" bold-not-italic).
Anchor (verbatim, one line):

```html
      <p data-hf-id="hf-t8wh" class="caption" id="capB">Next time. Start racing <span data-hf-id="hf-0b5e" class="em-i">your</span><span data-hf-id="hf-gwww" class="em-b">self</span>.</p>
```

replace with (the two `class` values swap; the `data-hf-id`s stay on their own spans;
nothing else on the line changes):

```html
      <p data-hf-id="hf-t8wh" class="caption" id="capB">Next time. Start racing <span data-hf-id="hf-0b5e" class="em-b">your</span><span data-hf-id="hf-gwww" class="em-i">self</span>.</p>
```

The CSS (lines 58–59, `.caption .em-i { font-style: italic; font-weight: 600; }` and
`.caption .em-b { font-weight: 700; font-style: normal; }`) is **not** edited: after the
swap "your" is upright at 700 and "self" italic at the caption's base weight 600 —
exactly the pairing `ranking/index.html` v4 uses for "Compare against **your**_selfs_"
(its lines 57–60: ".em-b = 'your' (bold, not italic); .em-i = 'selfs' (italic, not
bold)"), so the two captions now agree. "Things to watch" in the round doc: if Nathan's
"straight" meant *plain* (600, not bold), the follow-up is one CSS number
(`.caption .em-b { font-weight: 600 …`), not a markup change.

**Nothing else changes.** `warpTime` and `RIDE_WARP` must not remain anywhere in the
file (`grep` — stop trigger if a reference survives).

## 5. Round docs (markdown only)

1. **Create `rounds/v8/FEEDBACK.md`** (cycle 13's brief is superseded, so v8 is free —
   stop trigger if `rounds/v8/` already exists). Shape of `rounds/v7/FEEDBACK.md`. Header
   `# 03 — Gates & Saving — Round v8`; **Render file:** `gates-saving_v8.mp4 (not
   rendered yet — Nathan's PC step; commands in
   marketing/cycles/14_ride-loop-surge-and-salamander/COMMANDS.md §2)`; **Duration
   (planned):** `12.300s (unchanged)`; **Source:** `../../index.html`. "What changed
   since v7": §0 in your own words; a gate table (old 0.24 / 0.63 / 0.84 at 5.32 / 7.18 /
   9.05 → new 0.25 / 0.50 / 0.75 at 5.81 / 7.65 / 9.51, ride 3.80–11.38 on five pulses);
   the §3 constants table; the caption change (Edit 7); the sentence that the audio for
   this round is `BRIEF-ride-loop-track.md`'s master (gates-saving slice, `soundv9`), not
   `soundtrack_v8.wav`, whose E5s (5.32 / 7.18 / 9.05) no longer match — **this round has
   no valid audio until that brief lands**, say so. "Verified (without a render)": §6
   numbers. "Things to watch": the roll-out under `capA`; gate 2's tick inside the hairpin
   (Nathan waived it — record that he did, and that the sector-2 → sector-3 colour change
   happens inside the blob); whether five pulses (go + 3 gates + finish) read as intended;
   the bold "your". Render block: the single `render.ps1` line + pointer to this cycle's
   `COMMANDS.md` §2. Empty "Nathan's feedback".
2. **`gates-saving/README.md`** (silent-studio): add the v8 row after line 20 in the same
   format — `| [v8](rounds/v8/FEEDBACK.md) | gates-saving_v8.mp4 | — | Built, awaiting
   Nathan's render — surge pacing designed from the E5 interval, gates at exact quarters
   0.25/0.50/0.75 on five pulses, caption "your" upright / "self" italic (cycle 14) |`;
   change v7's trailing "Current." to "Current until v8 is rendered." Also fix line 3's
   "(currently v3)" → "(currently v8)" and line 11's "Duration: 14.8s." → "Duration:
   12.3s." — two stale lines noticed at Plan time, under the chore threshold, same edit.
3. Do **not** edit anything under `marketing/audio-studio/` (the ride brief owns that),
   nor `structure.md`, nor cycle 13's files (already marked by the coordinator).

## 6. Verification (executor — no render possible; numbers, not adjectives)

1. **Run the new block under node.** Copy Edit 1 + Edit 2 (the `GATES` line, then the
   `PULSE_T` … `rideFrac` block) plus `var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;`
   into a scratch file, append:
   ```javascript
   var P = RIDE_PROFILE, f4 = function (x) { return x.toFixed(4); };
   console.log('D', P.D.map(f4).join(', '), '| vbar', P.vbar.map(f4).join(', '));
   console.log('v0..v4', P.v.map(f4).join(', '), '| troughs', P.trough.slice(1).map(f4).join(', '));
   console.log('RIDE_DUR', RIDE_DUR.toFixed(4), 'ride end', (RIDE_T0 + RIDE_DUR).toFixed(4), 'segs', P.segs.length);
   PULSE_T.forEach(function (t, k) { console.log('pulse' + k, 'abs', (RIDE_T0 + t).toFixed(2), 'rideFrac', rideFrac(t).toFixed(6), 'target', [0, 0.25, 0.5, 0.75, 1][k]); });
   var N = 240, prev = 0, minStep = 1e9, maxStep = 0; for (var i = 1; i <= N; i++) { var f = rideFrac(i / N * RIDE_DUR), st = f - prev; if (st < minStep) minStep = st; if (st > maxStep) maxStep = st; prev = f; }
   console.log('240 steps: min df', minStep.toFixed(5), 'max df', maxStep.toFixed(5), 'min speed', (minStep / (RIDE_DUR / N)).toFixed(4), 'max speed', (maxStep / (RIDE_DUR / N)).toFixed(4));
   var bad = 0; for (var j = 0; j <= 100000; j++) { var t = j / 100000 * RIDE_DUR, e = 1e-5, lo = Math.max(0, t - e), hi = Math.min(RIDE_DUR, t + e); if (rideFrac(hi) - rideFrac(lo) <= 0) bad++; }
   console.log('non-increasing samples', bad);
   console.log([0.5, 1.0, 1.5, 2.5, 3.0, 3.5, 4.5, 5.0, 5.25, 6.0, 6.5, 7.0].map(function (t) { return 'f(' + t.toFixed(2) + ')=' + rideFrac(t).toFixed(4); }).join(' '));
   ```
   **Pass criteria (computed at Plan time on Nathan's PC, node 22, with this exact code;
   all must hold, to the last printed digit):**
   ```
   D 2.0100, 1.8400, 1.8600, 1.8700 | vbar 0.1244, 0.1359, 0.1344, 0.1337
   v0..v4 0.0406, 0.2082, 0.2162, 0.2145, 0.0529 | troughs 0.0595, 0.0535
   RIDE_DUR 7.5800 ride end 11.3800 segs 6
   pulse0 abs 3.80 rideFrac 0.000000 target 0
   pulse1 abs 5.81 rideFrac 0.250000 target 0.25
   pulse2 abs 7.65 rideFrac 0.500000 target 0.5
   pulse3 abs 9.51 rideFrac 0.750000 target 0.75
   pulse4 abs 11.38 rideFrac 1.000000 target 1
   240 steps: min df 0.00128 max df 0.00683 min speed 0.0406 max speed 0.2161
   non-increasing samples 0
   f(0.50)=0.0244 f(1.00)=0.0708 f(1.50)=0.1482 f(2.50)=0.3372 f(3.00)=0.3774 f(3.50)=0.4304 f(4.50)=0.6072 f(5.00)=0.6388 f(5.25)=0.6645 f(6.00)=0.8113 f(6.50)=0.9023 f(7.00)=0.9622
   ```
2. **Diff:** the change touches only lines 136, 151, 219–248, 250–264, 278–279, 299,
   304–319 of the pre-edit file (report the post-edit ranges). `grep -n "RIDE_WARP\|warpTime"
   marketing/silent-studio/gates-saving/index.html` → no hits. `grep -rn "RIDE_WARP\|
   warpTime" marketing/ --include=*.html --include=*.js --include=*.py` → no hits (docs
   may still mention them; that is history). `grep -c "em-b\|em-i" index.html` → the same
   count as before the edit (4: two CSS rules, two spans); `grep -n 'class="em-b">your'
   index.html` → line 136 exactly.
3. **Gate geometry** (node, on the `ROUTE` polyline copied from line 150, the §2a method):
   far-part clearance 128 / 87 / 132 px, tick-local 46 / 15 / 31 px, swing 18 / 54 / 4°
   (±1 px / ±1°). The 15 px / 54° at gate 2 is the waived hairpin, not a failure —
   report it, do not stop on it.
4. **Not applicable, do not run:** `app/` tests, `tsc`.
5. The render, the five-frame check (rider on the start line at 3.80, on each tick at
   5.81 / 7.65 / 9.51, on the finish ring at 11.38) and the caption frame (e.g. 8.00 s:
   "your" upright bold, "self" italic) are Nathan's — `COMMANDS.md` §2.

## 7. Report format

Post-edit line ranges of the seven edits; §6.1 node output verbatim; the grep results;
§6.3 numbers; one sentence per stop trigger (an anchor not found exactly once;
`rounds/v8` exists; a `PULSE_T`, `GATE_T`, `RIDE_PROFILE` or `rideFrac` identifier already
present; a `warpTime`/`RIDE_WARP` reference surviving; §6.1 values off by more than 1 in
the last printed digit; line 136 not byte-identical to the anchor).
