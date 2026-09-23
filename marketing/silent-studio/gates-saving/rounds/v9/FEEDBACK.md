# 03 — Gates & Saving — Round v9

**Render file:** gates-saving_v9.mp4 (rendered by Nathan 2026-09-24 with HyperFrames; duration
confirmed via ffprobe at exactly 12.300000 s, 369 frames, 1920x1080, 30 fps, no audio).
**Source:** ../../index.html.

## What changed since v8

v8's speed shape was backwards: the rider *peaked* at every gate (1.6x the leg mean) and crawled
between them. Nathan's feedback on the ride soundv1 render (repeated 2026-09-23): "it should
speed up in between gates and slow down at gates". This round is the mirror image: at every
one of the five E5 pulses (start line, three gates, finish line) the rider dips to
`(1 - 0.6) x` the mean speed of the adjacent leg(s), and at the mid-time of each leg it
crests, so each leg is one dip-crest-dip cycle (8 half-cosine ramps instead of 6, `DIP_A = 0.6`,
the exact mirror of v8's `SURGE_A = 0.6`). The rider still crosses each gate and the finish at
the same frame as before, the gates stay where they are on the map, and only the speed shape
changed (`gates-saving/index.html`, cycle 17 item B).

| | v8 | v9 |
|---|---|---|
| speed at the five pulses (route/s) | 0.041 / **0.208** / **0.216** / **0.215** / 0.053 | **0.0498 / 0.0520 / 0.0541 / 0.0536 / 0.0535** |
| speed at the four mid-legs | — / 0.060 / 0.054 / — | **0.1979 / 0.2187 / 0.2150 / 0.2138** |
| min / max over the 240 steps | 0.0406 / 0.2161 | 0.0499 / 0.2186 |
| route fraction at pulse times 0 / 2.01 / 3.85 / 5.71 / 7.58 | 0 / 0.25 / 0.50 / 0.75 / 1 | 0 / 0.25 / 0.50 / 0.75 / 1 (unchanged) |
| segments | 6 | 8 |

Every crossing *time* and route fraction is unchanged (3.80 / 5.81 / 7.65 / 9.51 / 11.38 s at
0 / 0.25 / 0.50 / 0.75 / 1), and the scene is still 12.3 s, so every existing soundtrack still fits.

## Verified

Profile (node, B1): speed at pulses 0.0498, 0.0520, 0.0541, 0.0536, 0.0535 | at mid-legs 0.1979,
0.2187, 0.2150, 0.2138 (every pulse < 0.06, every mid-leg > 0.19).

Rider tracker on the render (`marketing/cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py`,
output verbatim):

```
frames 369 (expect 369 = 12.3 s x 30)
pulses (start, gate1, gate2, gate3, finish):
  t= 3.800 frame 114  centre (  576.4,   947.9)  area  272  speed 1.02 px/frame
  t= 5.810 frame 174  centre (  835.6,   832.5)  area  320  speed 2.18 px/frame
  t= 7.650 frame 230  centre (  920.8,   651.9)  area  287  speed 2.28 px/frame
  t= 9.510 frame 285  centre ( 1129.0,   479.2)  area  293  speed 2.31 px/frame
  t=11.380 frame 341  centre ( 1343.8,   292.5)  area  288  speed 1.23 px/frame
mid-legs:
  t= 4.805 frame 144  centre (  697.9,   900.7)  area  300  speed 7.32 px/frame
  t= 6.730 frame 202  centre (  953.0,   737.9)  area  290  speed 9.07 px/frame
  t= 8.580 frame 257  centre ( 1041.4,   610.5)  area  292  speed 8.94 px/frame
  t=10.445 frame 313  centre ( 1239.4,   380.9)  area  290  speed 8.71 px/frame
max speed at a pulse 2.31  <  min speed at a mid-leg 7.32  ->  INVERTED (slow at gates, fast between): PASS
rider tracked on 277 frames, first 0 last 368
```

(v8 on the same tracker: 8.15 / 4.82 / 8.88 px/frame at the gates, 5.13 / 2.55 / 2.28 / 5.11 mid-leg, "NOT inverted: FAIL".)

Distance from the tracked rider to the gate tick at the gate frames: gate 1 1.64 px, gate 2 1.32 px,
gate 3 0.87 px (limit 2.2). Start / finish centres within 0.4 / 0.1 px of v8's. Gate ticks unchanged:
mean absolute difference of region x 800-1200, y 400-900 between v8 and v9 `frame_3_80s.png` = 0.209 (limit 1.0).

Frames filed in this folder (9 PNGs): frame_3_80s, frame_4_805s, frame_5_81s, frame_6_73s,
frame_7_65s, frame_8_58s, frame_9_51s, frame_10_445s, frame_11_38s.

## Things to watch

- The roll-out under `capA` is now 0.050 route/s rising to 0.198 at ~1.0 s: the rider is at
  6.7 % of the route when `capA` starts fading at 4.5 s and 14.3 % when it is gone at 4.9 s
  (v8: 3.9 % / 8.4 %).
- Gate 2's dip is inside the hairpin apex (Nathan waived the geometry); now it reads as braking
  for the bend.
- Whether the *gentle* finish (0.054 route/s) still reads as "finish"; if Nathan wants a sprint
  finish instead, that is the one-ramp end variant, a two-line change.
- The ~28 ms Salamander sample lead (`ride/soundv1/FEEDBACK.md`, "Known, benign timing offset") is
  unchanged by this round; the rider is now *slowest* at the pulses, so a pulse sounding 0.8 frame
  late is less visible than it was in v8.

## Audio for this round

Item C of cycle 17 re-muxes `audio-studio/gates-saving/soundv10/soundtrack_v10.wav` (unchanged)
onto this render as `soundv11`, and the ride as `ride/soundv3`.

## Nathan's feedback
<!-- write your notes below -->
