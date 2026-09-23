# BRIEF — gates-saving: invert the gate easing (fast BETWEEN gates, slow AT the gates), render v9 (cycle 17, item B)

**Status: B1 executed and Inspect-passed 2026-09-24 (index.html edited on disk, md5
`09869627fdd3df5ddeec65f681639dfa`); §3's trough count, §3's diff-stat and §6.3's pass criteria
corrected the same day after the executor's stop and the inspector's prediction — B2 not yet
run (waiting for Nathan's render).** Originally: ready to execute (2026-09-23, Plan tier,
Fable). Sonnet-executable in two halves
with a Nathan-run render in the middle: **B1** = one anchored JS edit in
`marketing/silent-studio/gates-saving/index.html` + a node check; **Nathan renders** (see
`COMMANDS.md` §1); **B2** = pick up the render, verify the *motion* objectively, file round
`v9`, swap `silent-studio/all-renders/`, docs. No audio is touched by this brief (that is
`BRIEF-sound-remux-rounds.md`, item C). **Runs on Nathan's PC through `device_bash`**
(`$HOME/mnt/Qualifire`; `GIT_OPTIONAL_LOCKS=0` for git; node v22.23.2, python3 + numpy +
opencv, ffmpeg/ffprobe are all there — verified 2026-09-23). **Stop-on-ambiguity applies**:
any anchor that does not match exactly once, any file that already exists where this brief
creates one, any check value outside its stated tolerance → stop and report verbatim; never
guess. Never call `device_request_delete_permission`; superseded files go to
`$HOME/mnt/Qualifire/_to_delete/` with `mv -n`. Do not commit.

This brief lifts the design of the cancelled cycle 15
(`../15_ride-surge-fix-and-audio-tooling/BRIEF-gates-surge-inversion.md`, never executed) and
**re-validated every anchor and number against the file on disk on 2026-09-23** (`index.html`
md5 `5166bb8a9d4eec5b302a794e68dfc04c`, 333 lines, mtime 2026-09-20 19:52:51 UTC — unchanged
since cycle 14's v8). Cycle 15's docs stay history; this brief is the one to execute.

## 0. What this will and will not change (Nathan reads this)

**Will:** the rider in the *second* ride (gates-saving, video 3.80–11.38 s of the scene,
17.80–25.38 s of the combined ride) now **slows down at each gate and speeds up between
gates**. Today it does the opposite (verified in the code and in the v8 render, §1). The gates
stay exactly where they are on the map, the rider still crosses each gate and the finish at
exactly the same frame as before, and the scene is still 12.3 s / 369 frames — so every
existing soundtrack (the E5 pulses at 3.80 / 5.81 / 7.65 / 9.51 / 11.38 s) still lines up.

**Will not:** touch the first ride (`start-ride`): its rider moves at **constant speed** along
the route (`start-ride/index.html` lines 211–222: `i / N * L`, no speed profile, no gate
easing) and its three gate ticks only change colour when crossed. There is nothing to invert
there; Nathan's "gates-saving and ride renders" both show the gates-saving motion (the ride is
`start-ride` + `gates-saving` back to back), so fixing gates-saving fixes both. No other
composition reuses the easing (`grep -l "SURGE_A\|rideFrac\|RIDE_PROFILE" */index.html
brandmark/*/index.html` → only `gates-saving/index.html`). The teaser (`teaser_v8.mp4`) shows
the *old* motion until it is re-cut — that re-cut is item A §B2 of this cycle
(`BRIEF-silent-studio-versions-and-ride.md`), which uses the `gates-saving_v9.mp4` this brief
produces. Nothing under `audio-studio/` changes here.

## 1. The defect, in numbers (from disk)

`gates-saving/index.html` lines 235–246: `SURGE_A = 0.6`, `v[k] = (1 + SURGE_A) × mean` at
every gate → **peak** speed at the gates. Speed (route fractions per second, from the code):
start 0.041 → **gate 1 0.208** → mid-leg 0.060 → **gate 2 0.216** → 0.054 → **gate 3
0.215** → finish 0.053. Measured on the v8 render itself (`rounds/v8/gates-saving_v8.mp4`,
the §6.3 tracker, px per frame): gate 1 **8.15**, gate 2 4.82, gate 3 **8.88** vs mid-legs
2.55 / 2.28 — fast on the ticks, crawling between. Nathan (ride/soundv1 feedback, repeated
2026-09-23): "it should speed up in between gates and slow down at gates".

## 2. The fix — one edit block, timings untouched

Keep `GATES = [0.25, 0.50, 0.75]` (line 151), `PULSE_T = [0, 2.01, 3.85, 5.71, 7.58]`,
`GATE_T`, `RIDE_T0 = 3.80` (line 314), `RIDE_DUR = 7.58`, `rideFrac`, `ride()`, Beat 4 —
byte-identical. Replace only the speed *shape*: a **dip** at every pulse (start, three gates,
finish — one rule for all five: `v = (1 − DIP_A) × mean of the adjacent legs`), a **crest** at
each leg's mid-time (`crest = 2·vbar − (v_from + v_to)/2`, the one value that makes the two
half-cosine ramps cover exactly 0.25 of the route), 8 ramps instead of 6, `DIP_A = 0.6` (the
exact mirror of v8's 0.6: same speed envelope Nathan has seen, fast and slow moments swapped).
Recomputed 2026-09-23 with node v22.23.2 from the exact block in §4 (the executor reproduces
this in §6.1):

| | v8 (on disk) | v9 (this brief) |
|---|---|---|
| speed at the five pulses (route/s) | 0.041 / **0.208** / **0.216** / **0.215** / 0.053 | **0.0498 / 0.0520 / 0.0541 / 0.0536 / 0.0535** |
| speed at the four mid-legs | — / 0.060 / 0.054 / — (end legs are single ramps) | **0.1979 / 0.2187 / 0.2150 / 0.2138** |
| min / max over the 240 steps | 0.0406 / 0.2161 | 0.0499 / 0.2186 |
| route fraction at pulse times 0 / 2.01 / 3.85 / 5.71 / 7.58 | 0 / 0.25 / 0.50 / 0.75 / 1 | **0.000000 / 0.250000 / 0.500000 / 0.750000 / 1.000000** (unchanged) |
| `RIDE_DUR` / ride end / scene | 7.58 / 11.38 / 12.3 s | unchanged |
| segments | 6 | 8 |
| monotone (100 001-sample derivative scan) | 0 non-increasing | 0 non-increasing |
| speed continuity at every ramp boundary | — | max jump 5.6e-9 route/s |

Gate positions on screen do not move (`GATES` and `ROUTE` unchanged; the gate ticks are placed
from `GATES` at line 178–190). In pixels (route polyline L = 1255.0 px, 30 fps, chord speed
over ±3 frames as the §6.3 tracker measures it — modelled 2026-09-24 from the edited file
including the 240 linear tweens): v9 reads ≈ 2.2–2.3 px/frame at the three gate frames and
≈ 7.4 / 9.1 / 8.9 / 8.7 px/frame at the four mid-leg frames (mid-leg 1 is lower than its
0.198 route/s crest suggests because the ±3-frame chord cuts a bend there); v8 reads 8.1 /
4.8 / 8.9 at the gates and 5.1 / 2.6 / 2.3 / 5.1 mid-leg. §6.3's pass bands are set from
these with margin.

## 3. B1 — the edit (`marketing/silent-studio/gates-saving/index.html`)

Preconditions (stop if any differs):
```bash
cd $HOME/mnt/Qualifire/marketing/silent-studio
md5sum gates-saving/index.html                    # 5166bb8a9d4eec5b302a794e68dfc04c
grep -c "" gates-saving/index.html                # 333
grep -n "Melody-aligned pacing, take 2" gates-saving/index.html   # 219 only
grep -n "^    })();" gates-saving/index.html      # 246 only
grep -n "var SURGE_A = 0.6;" gates-saving/index.html   # 235 only
grep -c "trough" gates-saving/index.html          # 5  (lines 226, 235, 237, 243, 245 — all inside the 219–246 block; corrected 2026-09-24, the brief first said 4)
grep -n "var GATES = \[0.25, 0.50, 0.75\]" gates-saving/index.html   # 151
grep -n "var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;" gates-saving/index.html   # 314
grep -c "DIP_A\|crest" gates-saving/index.html    # 0
ls gates-saving/rounds/v9 2>&1 | grep -c "No such file"   # 1
ls ../../_to_delete/ | grep -c "gates-saving_v8_replaced"  # 0
```

**Edit 1 — replace lines 219–246 (the 28-line block from the comment line
`    // Melody-aligned pacing, take 2 (cycle 14, Nathan's idea 6): the rider still crosses`
through the IIFE's closing line `    })();`) with these 27 lines, verbatim** (4-space indent as
in the file; the `PULSE_T` and `GATE_T` lines are byte-identical to the old ones):

```javascript
    // Melody-aligned pacing, take 3 (cycle 17, Nathan's feedback on v8): the rider still
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
    // marketing/cycles/17_silent-versions-gate-easing-and-tool-ui/BRIEF-gate-easing-inversion.md
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

Do it with a python read-modify-write (never by retyping the file): read the file, assert
`lines[218].startswith('    // Melody-aligned pacing, take 2')` and `lines[245] == '    })();\n'`
and `lines[246].startswith('    // Route fraction at ride-relative time t.')`, splice, write
back with LF endings, no BOM. After the edit the file is 332 lines; `rideFrac` starts at 247
(was 248), `ride()` at 260 (was 261), `var RIDE_T0 = 3.80, …` is at **313** (was 314).

Post-edit checks (stop if any differs):
```bash
grep -c "" gates-saving/index.html                      # 332
grep -n "SURGE_A\|trough" gates-saving/index.html       # no output
grep -n "var DIP_A = 0.6;" gates-saving/index.html      # 236 only
grep -n "var PULSE_T = \[0, 2.01, 3.85, 5.71, 7.58\]" gates-saving/index.html   # 234 only
grep -n "var GATES = \[0.25, 0.50, 0.75\]" gates-saving/index.html               # 151
grep -n "var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;" gates-saving/index.html   # 313
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire diff --stat -- marketing/silent-studio/gates-saving/index.html   # 1 file, 20 insertions(+), 21 deletions(-)  (corrected 2026-09-24: git splits the block into hunks around the unchanged PULSE_T/GATE_T/… lines; the brief first said one hunk +27/−28)
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire diff -U0 -- marketing/silent-studio/gates-saving/index.html | grep "^@@"   # exactly these five hunks, all inside 219–246 (old) / 219–245 (new): @@ -219,11 +219,12 @@  @@ -232 +233 @@  @@ -235 +236 @@  @@ -237 +238 @@  @@ -239,7 +240,5 @@
md5sum gates-saving/index.html   # 09869627fdd3df5ddeec65f681639dfa (the edited file as B1 left it, 2026-09-24)
```
Then run §6.1 (the node check) **before** telling the coordinator that Nathan can render.

**Not part of this edit:** the comments at (post-edit) lines 257–259 ("Rider along the route on
the surge profile …") and 309–312 ("Beat 4 (3.8-11.38): second ride, on the surge profile …")
— still true, leave them. No `theme.js`, no `map.png`, nothing else in the folder.

## 4. Nathan's step — the render

After B1 passes, the coordinator posts `COMMANDS.md` §1 to Nathan (one command, ~1 min):
`powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name gates-saving -Render` from
`marketing\silent-studio\`. HyperFrames cannot run from `device_bash` (npm registry returns
403 for `hyperframes` and the VM has no Chromium — checked 2026-09-23), so this step is his.
The render lands in `gates-saving/renders/gates-saving_<YYYY-MM-DD_HH-MM-SS>.mp4`; Nathan
does not copy or rename anything — B2 does.

## 5. B2 — resume point: file round v9 and swap `all-renders/`

**Resume precondition (stop-on-missing-file):**
```bash
cd $HOME/mnt/Qualifire/marketing/silent-studio
find gates-saving/renders -name 'gates-saving_*.mp4' ! -name '*_day.mp4' -newer gates-saving/index.html -printf '%T@ %p\n' | sort -n | tail -1
```
Expect exactly one path newer than the edited `index.html` (today there are 5 older renders,
the newest `gates-saving_2026-09-20_22-23-38.mp4`; none is newer than the edit). None → **stop:
"render not found — Nathan has not run COMMANDS.md §1 yet"**. More than one newer → stop and
list them. Call the one file `$NEW`. Then:
```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames -of csv=p=0 "$NEW"   # h264,video,1920,1080,30/1,369 — one stream, no audio
ffprobe -v error -show_entries format=duration -of csv=p=0 "$NEW"   # 12.300000
```
Any other value → stop.

**File the round:**
```bash
mkdir -p gates-saving/rounds/v9
cp "$NEW" gates-saving/rounds/v9/gates-saving_v9.mp4
md5sum "$NEW" gates-saving/rounds/v9/gates-saving_v9.mp4   # equal
for t in 3.80 4.805 5.81 6.73 7.65 8.58 9.51 10.445 11.38; do ffmpeg -y -v error -ss $t -i gates-saving/rounds/v9/gates-saving_v9.mp4 -frames:v 1 gates-saving/rounds/v9/frame_$(echo $t | tr . _)s.png; done   # 9 PNGs (same naming as v8's frame_3_80s.png)
mkdir -p $HOME/mnt/Qualifire/_to_delete
mv -n all-renders/gates-saving_v8.mp4 $HOME/mnt/Qualifire/_to_delete/all-renders_gates-saving_v8_replaced_in_all-renders_by_v9.mp4
cp gates-saving/rounds/v9/gates-saving_v9.mp4 all-renders/gates-saving_v9.mp4
ls all-renders/   # closing_v4 colours_v4 gates-saving_v9 opening_v3 ranking_v7 start-ride_v4 teaser_v8 (+ any files item A has already added — report the exact listing)
```
(`mv -n` may copy-then-fail on this mount; if it does, report it, leave the source, do not
delete.) `rounds/v8/` stays untouched (its mp4 is the reference for §6.3).

## 6. Verification (executor — numbers, not adjectives)

### 6.1 The profile under node (B1, before the render)
Write `$HOME/c17/profile_check.js` = line 151 of the file (`var GATES = …`), then the 27
lines of Edit 1 exactly as they now stand in the file (copy them out with `sed -n 219,245p`),
then post-edit lines 247–255 (`rideFrac`), then `var RIDE_T0 = 3.80, RIDE_DUR = RIDE_PROFILE.dur;`,
then this tail:
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
var segs = P.segs, t0 = 0, maxJump = 0; for (var s = 0; s < segs.length - 1; s++) { t0 += segs[s][0]; var j2 = Math.abs(sp(t0 - 2e-4) - sp(t0 + 2e-4)); if (j2 > maxJump) maxJump = j2; }
console.log('max speed jump at a segment boundary', maxJump.toExponential(2));
```
`node $HOME/c17/profile_check.js` must print exactly (computed at Plan time, node v22.23.2, on
Nathan's PC):
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
max speed jump at a segment boundary 5.61e-9
```
(the last line may differ in its last digits — anything below 1e-6 passes; everything else to
the digit). The "speed at pulses … | at mid-legs …" line is the inversion: every pulse value
< 0.06, every mid-leg value > 0.19.

### 6.2 The render (B2)
Stream/duration/frame checks of §5 (369 frames, 12.300000 s, no audio) and the md5 equality
of `$NEW`, `rounds/v9/gates-saving_v9.mp4`, `all-renders/gates-saving_v9.mp4` (three equal lines).

### 6.3 The motion, measured on the render (B2 — this is the acceptance check Nathan asked for)
Write this file **verbatim** to `marketing/cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py`
(it is the tracker Plan ran on v8; Plan's v8 output is the baseline below):
```python
"""Read-only check of the rider's motion in a gates-saving render (cycle 17, item B).
Usage: python3 check_rider_motion.py <render.mp4>
Decodes every frame (1920x1080, 30 fps), finds the blue rider dot (#2F7DE1 fill) as the
blob nearest the previous position, prints its centre at the five E5 pulse frames and the
four mid-leg frames plus the px/frame speed there (central difference over +/-3 frames),
and writes <basename>.cent.npy (frame, x, y, area) next to this script.
Needs: ffmpeg on PATH, numpy, opencv (python3 -c "import cv2")."""
import sys, os, subprocess, numpy as np, cv2
mp4 = sys.argv[1]; W, H, FPS = 1920, 1080, 30
raw = subprocess.run(["ffmpeg","-v","error","-i",mp4,"-f","rawvideo","-pix_fmt","rgb24","-"],check=True,stdout=subprocess.PIPE).stdout
n = len(raw)//(W*H*3); fr = np.frombuffer(raw,dtype=np.uint8).reshape(n,H,W,3)
print("frames", n, "(expect 369 = 12.3 s x 30)")
cent = np.full((n,3), np.nan); prev = None
for i in range(n):
    f = fr[i].astype(np.int16); r,g,b = f[...,0],f[...,1],f[...,2]
    m = ((b>60)&(b>r+40)&(b>g+20)).astype(np.uint8); m[985:,:] = 0    # blue-ish, caption band excluded
    k, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
    cands = [(j, st[j,cv2.CC_STAT_AREA], cen[j]) for j in range(1,k) if 120 <= st[j,cv2.CC_STAT_AREA] <= 800
             and 0.6 <= st[j,cv2.CC_STAT_WIDTH]/max(1,st[j,cv2.CC_STAT_HEIGHT]) <= 1.7]
    if not cands: continue
    if prev is not None: cands.sort(key=lambda c: np.hypot(c[2][0]-prev[0], c[2][1]-prev[1]))
    else: cands.sort(key=lambda c: -c[1])
    j, area, c = cands[0]; cent[i] = (c[0], c[1], area); prev = c
def sp(t, w=3):
    i = int(round(t*FPS)); a, b = max(0,i-w), min(n-1,i+w)
    return np.hypot(cent[b,0]-cent[a,0], cent[b,1]-cent[a,1])/(b-a)
def row(t):
    i = int(round(t*FPS)); print("  t=%6.3f frame %3d  centre (%7.1f, %7.1f)  area %4.0f  speed %.2f px/frame" % (t, i, cent[i,0], cent[i,1], cent[i,2], sp(t)))
print("pulses (start, gate1, gate2, gate3, finish):"); [row(t) for t in (3.80, 5.81, 7.65, 9.51, 11.38)]
print("mid-legs:"); [row(t) for t in (4.805, 6.73, 8.58, 10.445)]
vp = [sp(t) for t in (3.80, 5.81, 7.65, 9.51, 11.38)]; vm = [sp(t) for t in (4.805, 6.73, 8.58, 10.445)]
print("max speed at a pulse %.2f  <  min speed at a mid-leg %.2f  ->  %s" % (max(vp), min(vm), "INVERTED (slow at gates, fast between): PASS" if max(vp) < min(vm) else "NOT inverted: FAIL"))
vis = np.nonzero(~np.isnan(cent[:,0]))[0]; print("rider tracked on %d frames, first %d last %d" % (len(vis), vis[0], vis[-1]))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.path.basename(mp4)+".cent.npy"); np.save(out, cent); print("wrote", out)
```
Run it on **both** renders (≈1 min each; the `.cent.npy` files it writes into the cycle folder
are kept — they are the evidence):
```bash
cd $HOME/mnt/Qualifire/marketing
python3 cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py silent-studio/gates-saving/rounds/v8/gates-saving_v8.mp4
python3 cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py silent-studio/gates-saving/rounds/v9/gates-saving_v9.mp4
```
**v8 baseline (Plan, 2026-09-23 — the v8 run must reproduce these to ±0.3 px / ±0.05 px/frame):**
```
pulses (start, gate1, gate2, gate3, finish):
  t= 3.800 frame 114  centre (  576.7,   948.2)  area  280  speed 0.78 px/frame
  t= 5.810 frame 174  centre (  833.7,   831.9)  area  320  speed 8.15 px/frame
  t= 7.650 frame 230  centre (  921.9,   648.8)  area  292  speed 4.82 px/frame
  t= 9.510 frame 285  centre ( 1128.3,   480.7)  area  283  speed 8.88 px/frame
  t=11.380 frame 341  centre ( 1343.8,   292.6)  area  290  speed 1.21 px/frame
mid-legs:
  t= 4.805 frame 144  centre (  647.2,   933.8)  area  288  speed 5.13 px/frame
  t= 6.730 frame 202  centre (  951.2,   739.5)  area  288  speed 2.55 px/frame
  t= 8.580 frame 257  centre ( 1044.1,   608.5)  area  286  speed 2.28 px/frame
  t=10.445 frame 313  centre ( 1272.2,   330.0)  area  285  speed 5.11 px/frame
max speed at a pulse 8.88  <  min speed at a mid-leg 2.28  ->  NOT inverted: FAIL
rider tracked on 277 frames, first 0 last 368
```
**v9 pass criteria (all must hold; re-derived 2026-09-24 from a model of the edited file
including the 240 linear tweens and the tracker's ±3-frame chord speed — the model reproduces
the v8 tracker output above to ≤ 0.9 px and ≤ 0.1 px/frame; the "v8 would read" column is what
the same criterion gives on the OLD render, so the set is a real discriminator):**

| # | criterion (values from the tracker output) | v9 expected | v8 would read |
|---|---|---|---|
| 1 | `frames 369` | 369 | 369 |
| 2 | distance from the tracked centre to the gate **tick** point at the three gate frames — tick points from the route: gate 1 (836.8, 833.6) at frame 174, gate 2 (920.7, 653.2) at frame 230, gate 3 (1129.8, 479.0) at frame 285 — each **≤ 2.2 px** (the pulse times 5.81 / 7.65 / 9.51 s are not frame boundaries, so the rider sits a fraction of a frame off the tick; in v9 it is slow there and lands almost on it) | 0.7 / 1.1 / 0.7 (+ ≤ 0.9 px tracker offset) | 3.5 / 4.6 / 2.3 → **fails gates 1–2** (gate 3 marginal) |
| 3 | speed at the three gate frames 174 / 230 / 285 each **≤ 3.5 px/frame** | 2.18 / 2.28 / 2.30 | 8.15 / 4.82 / 8.88 → **fails all three** |
| 4 | speed at the four mid-leg frames 144 / 202 / 257 / 313 each **≥ 6.5 px/frame** | 7.36 / 9.07 / 8.91 / 8.73 | 5.13 / 2.55 / 2.28 / 5.11 → **fails all four** |
| 5 | ratio min(mid-leg speeds) / max(gate speeds) **≥ 2.5** and the script's last line `INVERTED (slow at gates, fast between): PASS` | 7.36 / 2.30 = 3.2 | 2.28 / 8.88 = 0.26 → **fails** |
| 6 | start and finish unchanged: centre at frame 114 within **1.5 px** of (576.7, 948.2) and at frame 341 within 1.5 px of (1343.8, 292.6) (v8's tracked centres; the model puts v9 on the same points, 0.0 px apart) | 0.0 / 0.0 | 0.0 / 0.0 (passes — timing did not move) |
| 7 | gate ticks unchanged: mean absolute difference of region x 800–1200, y 400–900 between `rounds/v8/frame_3_80s.png` and `rounds/v9/frame_3_80s.png` (PIL/numpy, 8-bit levels) **< 1.0** | ≈ 0 | — |

(Mid-leg *positions* are not a criterion: on legs 2 and 3 both profiles are symmetric about
the leg's mid-time, so the rider is at nearly the same route fraction there in v8 and v9 —
0.373 vs 0.375, 0.625 vs 0.622 — and on leg 4 v9 is *behind* v8 (0.873 vs 0.922). The brief's
first version asked for >20 px differences there; that was wrong and is withdrawn. Speed is
the thing that changed, and criteria 3–5 measure it.) Frames 114 and 341 straddle standstill,
so their speeds (≈ 1.0 / 1.3) are not bounded beyond criterion 5.

Paste the whole v9 output, the three tick distances and the criterion-7 number in the report. Any criterion failing →
stop, report, do not swap `all-renders/` (or move it back if already swapped).

### 6.4 Git
```bash
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire status --short marketing/silent-studio marketing/cycles/17_silent-versions-gate-easing-and-tool-ui
```
Expect: modified `gates-saving/index.html`, `gates-saving/README.md`; untracked
`gates-saving/rounds/v9/`, `gates-saving/renders/<new>.mp4`, `all-renders/gates-saving_v9.mp4`
(deleted `all-renders/gates-saving_v8.mp4`), `check_rider_motion.py` + two `.cent.npy` in the
cycle folder (+ whatever item A has done if it ran first). **Do not commit.**

## 7. Docs (markdown only; each anchor must match exactly once — check with `grep -c`)

1. **Create `gates-saving/rounds/v9/FEEDBACK.md`** (stop if it exists). Shape of
   `rounds/v8/FEEDBACK.md`: `# 03 — Gates & Saving — Round v9`; **Render file:**
   `gates-saving_v9.mp4` (rendered by Nathan <date>; duration confirmed via ffprobe at exactly
   12.300000 s, 369 frames); **Source:** `../../index.html`. "## What changed since v8": §0's
   first paragraph in your own words + Nathan's sentence quoted; the §2 table; one line that
   every crossing *time* and route fraction is unchanged (3.80 / 5.81 / 7.65 / 9.51 / 11.38 at
   0 / 0.25 / 0.50 / 0.75 / 1) so every existing soundtrack still fits. "## Verified": the
   §6.1 pulse/mid-leg line, the §6.3 v9 output verbatim, the tick distances, the criterion-7 number, the nine
   PNGs listed. "## Things to watch" (copy from cycle 15's §5 item 1 (a)–(d), re-labelled cycle
   17): the roll-out under capA, gate 2's dip inside the hairpin (reads as braking for the
   bend), the gentle finish (a sprint finish would be a two-line variant), the ~28 ms
   Salamander lead now less visible. "## Audio for this round": item C of this cycle re-muxes
   `audio-studio/gates-saving/soundv10/soundtrack_v10.wav` (unchanged) onto this render as
   `soundv11`, and the ride as `ride/soundv3`. Empty `## Nathan's feedback` with
   `<!-- write your notes below -->`.
2. **`gates-saving/README.md`** (21 lines, mtime 2026-09-20 20:36): line 4 `(currently v8)` →
   `(currently v9)`; line 21 (the v8 row, begins `| [v8](rounds/v8/FEEDBACK.md) | gates-saving_v8.mp4 | 2026-09-20 | Rendered, current —`)
   → replace `Rendered, current —` with `Rendered — replaced by v9 (the surge direction was backwards) —`;
   append after it
   `| [v9](rounds/v9/FEEDBACK.md) | gates-saving_v9.mp4 | <date> | Rendered, current — gate easing inverted (cycle 17): slow at every E5 pulse, fast mid-leg; gate times and positions unchanged, 12.300000 s confirmed, motion verified by `../../cycles/17_silent-versions-gate-easing-and-tool-ui/check_rider_motion.py` |`.
3. Nothing in `structure.md`, nothing under `audio-studio/`, nothing in cycle 14/15/16 folders.

## 8. Report format

B1: the pre/post grep lines, the `git diff -U0` hunk header, the §6.1 output verbatim. B2:
`$NEW`'s name, the ffprobe lines, the three md5 lines, the §6.3 v8 and v9 outputs verbatim,
the tick distances and the criterion-7 number, the `all-renders/` listing, the `_to_delete/` name, `git status`. One
sentence per stop trigger hit (anchor mismatch, `rounds/v9` exists, render missing / more than
one, a §6.1 digit off, a §6.3 criterion failing). Say explicitly that the executor did **not**
render (Nathan did) and did **not** listen to anything.

## 9. For Inspect (fresh Opus)

Rerun §6.1 from the file as it is on disk (not from this brief), rerun §6.3 on both renders
yourself, recompute the tick distances and criterion 7, diff `index.html` against `git show HEAD:…` and confirm the
five hunks all inside 219–246 → 219–245 (+20/−21) and no change to line 151 / `rideFrac` / `ride()` / Beat 4.
Confirm `rounds/v8/` is byte-unchanged (md5 `0e7519ab8718d80b89b09678308f2b32` for
`gates-saving_v8.mp4`) and that `_to_delete/` holds the v8 all-renders copy. Look at
`rounds/v9/frame_5_81s.png` and `frame_6_73s.png` with the Read tool (stage them): the rider
sits on gate 1's tick in the first, and is well past it on the open straight in the second.
