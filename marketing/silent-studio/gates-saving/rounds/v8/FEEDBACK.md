# 03 — Gates & Saving — Round v8

**Render file:** gates-saving_v8.mp4 (rendered; duration confirmed via ffprobe at
exactly 12.300000s, matching plan exactly).
**Duration:** 12.300s (confirmed).
**Source:** ../../index.html.

## What changed since v7

Nathan's idea 6: he liked that v7's rider "speeds up and then slows down for the gates
crossing" but wanted that shape uniform at every gate, not just the first. Rather than
smooth v7's existing (unequal) gate layout, this round re-derives the whole ride from
the music: first the E5 pulse interval was re-measured (1.94 ± 0.09s), then the gates
were moved to exact quarters of the route so every leg between pulses is the same
fraction of the route (0.25) in one E5 interval — a "uniform surge" (half-cosine speed
ramp chain: peak at every gate, trough between gates, symmetric start/finish) becomes
possible without any leg stalling. The ride is now carried by **five** consecutive E5
pulses instead of three gate crossings on a piecewise-linear warp: the rider leaves the
start line on pulse 1, crosses the three gates on pulses 2–4, and reaches the finish on
pulse 5.

| Gate | Route fraction (v7 → v8) | Old crossing (v7) | New crossing (v8) |
|---|---|---|---|
| — (start line) | — | ride start 4.80s | ride start **3.80s** |
| 1 | 0.24 → **0.25** | 5.32s | **5.81s** |
| 2 | 0.63 → **0.50** | 7.18s | **7.65s** |
| 3 | 0.84 → **0.75** | 9.05s | **9.51s** |
| — (finish) | — | ride end 11.70s | ride end **11.38s** |

Full ride now 3.80–11.38s (7.58s, on five pulses) instead of 4.80–11.70s (6.9s, on
three warped legs); the 12.3s scene is unchanged, so the finish hold grows from 0.6s to
0.92s.

**Constants (from `BRIEF-gates-surge-pacing.md` §3):**

| | value |
|---|---|
| `GATES` | `[0.25, 0.50, 0.75]` |
| `RIDE_T0` | `3.80` |
| `PULSE_T` | `[0, 2.01, 3.85, 5.71, 7.58]` |
| `GATE_T` | `[2.01, 3.85, 5.71]` |
| `SURGE_A` | `0.6` |
| `RIDE_DUR` | `7.58` |
| ride ends | `11.38` |
| start / finish speed | 0.0406 / 0.0529 route/s (derived) |
| peaks at gates | 0.2082 / 0.2162 / 0.2145 route/s |
| troughs mid-leg | 0.0595 / 0.0535 route/s |
| rider fade-in | `3.40` |
| scene duration | 12.3s, unchanged |

**Caption (Edit 7, Nathan's Q7):** the "your"/"self" emphasis in capB swaps —
"your" is now upright/bold (`em-b`, 700), "self" now italic (`em-i`, base weight 600) —
the reverse of v4/v7, matching `ranking/index.html`'s "Compare against **your**_selfs_"
pairing.

**Audio for this round:** none valid yet. This round's video needs
`BRIEF-ride-loop-track.md`'s master (the gates-saving slice, `soundv9` in
`audio-studio/gates-saving/`) — **not** `soundtrack_v8.wav`, whose E5 pulses (5.32 /
7.18 / 9.05s) are the old gate times and would be audibly out of sync with this
round's new gates. This round has no valid audio until the ride brief lands.

## Verified (without a render)

Node re-run of the landed `PULSE_T`/`GATE_T`/`RIDE_PROFILE`/`rideFrac` block (see
`BRIEF-gates-surge-pacing.md` §6.1 for the exact script) reproduces the brief's pass
criteria digit-for-digit:

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
```

Every pulse lands exactly on its target route fraction; speed stays continuous and
monotone-increasing in route position throughout (0 non-increasing samples over
100,001 checks).

Gate geometry (node, ROUTE polyline, L = 1254.99px): far-part clearance 127.5 / 87.1 /
131.7px, tick-local clearance 46.0 / 15.1 / 30.7px, heading swing 17.9 / 54.4 / 4.1°
— all within the brief's ±1px/±1° tolerance of 128/87/132, 46/15/31, 18/54/4.

`grep -n "RIDE_WARP\|warpTime" index.html` and the same repo-wide over
`marketing/**/*.{html,js,py}` → no hits. `grep -n 'class="em-b">your' index.html` →
line 136 exactly.

## Things to watch

- The roll-out under `capA` (1.6–4.9s): the ride's first 1.1s now overlaps capA's
  hold, same as before — kept on purpose, reads as "here we go".
- Gate 2's tick sits inside the route's hairpin apex (tick-local clearance 15px, 54°
  heading swing) — Nathan explicitly waived this geometric objection ("I don't see the
  issue... it does not really matter"); recorded here, not a defect.
- Whether five pulses (go + 3 gates + finish) read as a clean rhythm rather than as
  extra, unexplained gate-like events — this is the one open design question the ride
  brief's own FEEDBACK.md also asks about (nested vs. sideways `ride/` family links is
  unrelated; this is about the pulse count itself).
- The bold "your" / italic "self" swap — if by "straight" Nathan meant *plain* rather
  than *bold*, the follow-up is one CSS number (`.caption .em-b { font-weight: 600 …`),
  not another markup change.

## Render on the PC (PowerShell, from marketing\silent-studio\)
```
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render
```
See `marketing/cycles/14_ride-loop-surge-and-salamander/COMMANDS.md` §2 for the full
copy-paste block (render, copy into this round folder, `ffprobe` duration check, the
five frame-check timestamps).

## Nathan's feedback
<!-- write your notes below, overall or beat-by-beat -->
