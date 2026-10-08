# virgin-cycle26 — final inspect of the whole cycle (briefs 01, 02, 05, 06, 03, 04; tree uncommitted)

Fresh-context Opus INSPECT, 2026-10-08. Every check below was rerun by me on the live tree or on scratch copies outside the repo (`$HOME/inspfin/app` = current tree, `$HOME/insphead/app` = `git archive HEAD`, node_modules symlinked). Probes and mutation scripts are copied to `safe_to_delete/inspect26-final/`.

**VERDICT: PASS WITH NOTES.** Nothing blocks. No finding is MAJOR. The notes are a perf item on map mount (N1), two real Leuven routes that now draw a short faint stretch (N2), a units drift (N3), and three test gaps (N4-N6).

| brief | verdict | safe to ship OTA (JS only)? |
|---|---|---|
| 01 record picker loop | PASS (regression pass) | yes |
| 02 engine pass-aware | PASS (regression pass) | yes |
| 05 fix inspect 01/02 | PASS (regression pass) | yes |
| 06 first-fix band (N1 fix) | PASS | yes |
| 03 gates on retraced ground | PASS WITH NOTES (N5) | yes |
| 04 map pass display | PASS WITH NOTES (N1-N4, N7) | yes |

No native, config or dependency file changed. The diff touches only `app/core`, `app/src` and `app/tests` `.ts`/`.tsx` files.

## 1. Tree, counts, strings

- `cd app && node --experimental-strip-types tests/run.ts` gives **`954 tests: 951 pass, 0 fail, 3 skip`**.
- `cd app && ./node_modules/.bin/tsc --noEmit` exits **0** with no output.
- `git status --short` shows 30 modified `app/` files. Every one is in a brief's file list:
  - 01: `defaultWay`, `routeFromRide` (import + label), `catalogDetailModel`, `catalogMapModel`, `RidesScreen`, `RideDetailScreen`, `RecordScreen` (picker hunks), `recordFlow`, suites.
  - 02 / 05 / 06: `projection`, `live`, `engine` (2 comment lines), `live_suite`.
  - 03: `projection` (insert), `gateSeeding`, `userRefs`, `routeFromRide` ×2, `gateseeding_suite`, `userrefs_suite`.
  - 04: `wayMapGeo`, `wayMapMath`, `gateAdjustModel`, `wayMapView`, one prop each on Record / Demo / Replay, `waymapgeo_suite`, `waymap_suite`, `gateseeding_suite`.
- `run.ts`, `IDEAS.md`, `demoModel.ts`, `engine_suite.ts` and `demo_suite.ts` are untouched.
- `cycles/virgin-cycle27/` is untracked. It is not part of any brief; it is the coordinator's.
- Pre-existing tests are unedited. Across `app/tests/*.ts`, the only `-` lines are import lines:
  - `gateseeding_suite.ts`: 2 lines (03 and 04 import widening).
  - `wayspec_suite.ts`: 1 line (brief 01).
- `git diff -- app/tests/ui-strings.allow.json` has exactly ONE added entry, nothing edited or removed:
  `{"file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "loop", "reason": "virgin-cycle26 brief 01: GOING TO pill = finish where I start (Nathan 2026-10-08); replaces offering the START place twice", "since": "2026-10-08", "by": "Sonnet execute, virgin-cycle26 brief 01"}`.
  There is no entry for the `${start} loop` title template (`defaultWay.ts:81`), as D13 (amended) requires.
- The added UI lines contain no `Alert`, `flashSub` or `overlap` (grep of `+` lines over every `src/ui/*.tsx` diff → none). There is no banner, sub-label or disabled state.
- Greps:
  - `routeTitle(` has 8 hits (definition + 7 call sites).
  - `} → ${` hits only `catalogMerge.ts:105`, `catalogDeleteActions.ts` ×3, `demoModel.ts` ×2 and `routeTitle` itself.
  - `pick.from === pick.to` → none.
  - `nearestOnSegments` in `userRefs.ts` → none.
  - `seedGateChainages(`: `routeFromRide.ts:118` and `:241` take 3 arguments, `demoModel.ts:180` takes 2.
  - `gateSeeding.ts`, `gateAdjustModel.ts` and `wayMapMath.ts` are import-free.
  - `wayMapGeo.ts` imports only core (`CORRIDOR_M`, `PASS_GAP_M`) and `wayMapMath` (`pathCumulativeM`, type `WayAsset`). Core has no JSON import and no Node API.

## 2. Brief 06 (first-fix band)

- The diff is exactly the two hunks of §4.1. The new line is `projection.ts:123`: `const band = near.dist + (nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M);`.
- These are unchanged: `PASS_AMBIGUITY_M = 15`, the `within` cap line, the tie rule `score < bestScore`, the signature, and `live.ts` (still exactly brief 02/05's hunks).
- `nearS` is `-Infinity` at exactly the two anchor call sites (`live.ts:90`, `projection.ts:202`) and `sp` at the two re-acquisition sites.
- §9 mutation table, rerun with `$HOME/inspfin/mut.py "06 "`. Every row fails exactly the tests the brief lists:
  - `brief05 state` → 06 unit / loop / wide road
  - `brief02 state` → 05 never-prefers, 05 live re-acq parallel, 06 unit (early context)
  - `inverted` → those five
  - band `30` / `20` → 06 unit + loop at G = 40 (`ch 3155`)
  - no cap → 05 `(500,42)` + 06 `G=45`
- Probe `p4.ts` (A): a loop whose end is G = 25/30/40 m from its start, first fix at the closing point, now anchors at ch 0 and fires gates `0,1,2,3,4`. HEAD anchored at 3170/3165/3155 (instant FINISH).
- Probe `p4.ts` (C): genuine same-street retrace (4 m) with 10-20 m random lateral noise flips the anchor 0/400 times and the re-acquisition 0/400 times.
- Probe `p4.ts` (B): the wide-road re-acquisition residual is unchanged and documented (OPEN item 2): D = 20 flips at e ≥ 18 m, D = 25 at e ≥ 22 m, D = 30 at e ≥ 25 m. The anchor stays outbound in every row.
- Parallel streets (`p1`, `p2`, re-pointed at the current tree): live and offline both end at **2039** for y = 39 / 30 / the gap case. `(500,42)` anchors at 1544 (the corridor cap holds).

## 3. Brief 03 (gates on retraced ground)

- The diff matches §4 exactly:
  - `overlapChainages` skips `|Δch| <= gapM` BEFORE the distance test and compares with `<=`.
  - The stop loop's `k` only advances, and the `while` guard keeps it ≤ `len-1`.
  - The new `userRefs.ts` imports are real core exports.
- §9 mutations (`mut.py "03 "`):
  - `clear` without the overlap clause → `got 16,400,800,1200,1584` (exactly the brief's prediction).
  - Old early return → the same failure.
  - `overlapChainages` gap test `< 1` → both overlap tests fail.
  - Stop chainage `proj.s[0]` → the knot test and the outbound-stop test fail.
  - Overlap list emptied → the buildRef overlap test fails.
- **Byte-identity vs HEAD on real data** (`pseed.ts`, run on HEAD and the current tree; outputs `pseed-head.txt` / `pseed-now.txt`):
  - Every fixture ride gives identical stop chainages and identical seeded gates to 3 decimals. The fixture rides are `clean_morning`, `clean_eveninga`, `clean_eveningb`, `detour_eveningb` (7 stops), `gap_20260521`, `latelock_20260805`, `synthetic_firstride`, `synthetic_truncated` and `wrongdir_eveninga`.
  - The demo route gives the same result (2-arg seed `[51.287, 1282.178, 2564.356, 3846.535, 5077.426]`, 0 overlap).
  - All 20 `refs.json` tracks seed identically.
  - Two real tracks DO report retraced ground: `WorkStationA` (28 vertices, ch 3231-3433) and `ChurchFosh` (58, ch 2404-2711). Both cross themselves within 2-3 m near their ends. Their quantiles are clear of it, so the gates do not move.
- **Stop chainage via ride-order projection, end to end** (`e2e.ts`, PartialOB-noisy reference ride, σ 5 m, stop at ~300 m on the outbound street): HEAD gives stop **3833** (wrongly attributed to the return copy); the current tree gives **351**.
- The seeding on noisy reference rides is identical with 2 and 3 arguments in all five e2e scenarios. Every quantile was clear, so the new clause had nothing to move.

## 4. Brief 04 (faint / bright pass display)

- **Wiring.** Each surface has exactly one `progressM=`:
  - `RecordScreen.tsx:1428`: `live.chainageM`, the engine's forward-only chainage.
  - `ReplayScreen.tsx:241`: `pos ? pos.sM : null`. `sM` comes from `deriveGateCrossings` → the pass-aware `projectRideOffline` against the current spec ref (`replayModel.ts`).
  - `DemoScreen.tsx:669`: `progressAtTime(ASSET, …)`. `ASSET === DEMO_WAY_ASSET` (`:194`), the same object the map draws.
  - The armed / race map (`RecordScreen.tsx:1270`), the post-ride map (`:1539`), the gate editor (`gateAdjustCard.tsx:147`), the feed, the catalog and ride detail pass nothing, so nothing on them can fade.
- **Paint-only.**
  - `git diff -- app/src/ui/wayMapView.tsx | grep -c "^[+-].*GeoJSONSource"` → 0.
  - No `key=` / `id=` line changed. `GeoJSONSource` count is 19 at HEAD and now.
  - No quoted `line-dasharray` / `line-gradient`. The `trail-*` paint is untouched.
  - The five layers carry `['case', ['has','faint'], FAINT_OPACITY, 1]`.
- **Rules of Hooks.** `passModel`, `faintVerts` and `wayFC` are three `useMemo`s at `wayMapView.tsx:604-609`, above the `riderOnly` return (`:666`), and they run unconditionally. `faintGates` is a plain const after the guard. No effect was added, so there is no cleanup or leak question.
- **`progressKey`.** `Math.round(progressM/10)` → flags recomputed at most every 10 m. A boundary is off by ≤ 5 m.
- **Fallbacks.**
  - `NaN`: the key is NaN. `Object.is` keeps the memo stable, and `faintVertices` returns null on a non-finite value, so the map draws today's single feature.
  - null / undefined: the same single feature.
  - `WayAsset` objects are referentially stable (`resolveWayAsset` cache; the module constant in DEMO; the bundled manifest), so the O(n²) model is built once per mount.
- **Ordinary single-pass route.** `partnerM` is all null, `faintVertices` returns null, and the route FC is one feature identical to `wayLineFeature`. The opacity expression evaluates to 1, matching HEAD (gate-ticks was `'line-opacity': 1`; the others defaulted to 1). The exception is self-crossing routes (N2).
- **Gates and spans of the pass the rider is not on.**
  - Gates are faint iff their path vertex is.
  - A sector span is faint iff its END gate is. Lead-in / lead-out spans never fade.
  - Everything sits at 0.3 until it is within 240 m.
  - Verified by the suite and by `pfade.ts`.
- **Editor tap (`nextGateOnTap`).**
  - The card's `onPress` toggles (`gateAdjustCard.tsx:155`: `cur === i ? null : i`).
  - A single hit behaves as before: tapping the selected gate deselects it.
  - A stack cycles: lowest index first, then next, wrapping. A rider is never trapped; the chips still select any gate directly.
- **§9 mutations** (`mut.py "04 "`). These are caught:
  - partner clause removed
  - runs without the shared vertex
  - `gateFaint` constant false
  - tick `faint` dropped
  - `nextGateOnTap` without cycling
  - `progressAtTime` without `f`
  - Demo prop dropped

  Removing the `> nearM` clause is **NOT caught** (N4).

## 5. Cross-cutting end to end (`e2e.ts`)

Real `LiveEngine`, `buildRefFromRideFixes`, 3-argument `seedGateChainages` and `deriveGateCrossings`. In each scenario a noisy reference ride is built, then a second lap with noise and a displaced first fix is run.

| scenario | HEAD | now |
|---|---|---|
| Home loop (ref σ 3 m, lap σ 5 m, first fix 12 m off) | anchor 3204, events `4e`, instant FINISH at t = 0, all sectors `missed(skipped)` | anchor 5.0, events `0,1,2,3,4`, none estimated, finished once; live gate times = offline to 0.1 s; sectors done ×4 |
| Home loop noisy (lap σ 12 m, first fix 19 m off) | anchor 3264, only `4`, sectors skipped | anchor 14, `0,1,2,3,4`; live vs offline ≤ 0.4 s; sector 2 `missed(offroute)` (σ 12 m noise leaves the 40 m corridor) |
| Partial out-and-back (σ 5) | anchor 4013, `4e` instant FINISH | anchor 9.4, `0,1,2,3,4`, ≤ 0.1 s live vs offline, done ×4 |
| Partial OB noisy (σ 15) | `0..4`, sectors 2-4 `missed(offroute)` | identical to HEAD (pre-existing noise behaviour, not this cycle) |
| Half-retraced return (σ 10) | `0..4`, done ×4 | identical |

- In every case, saved-ride analysis (`deriveGateCrossings`) agrees with the live gate times to ≤ 0.6 s.
- Titles (probe `p5.ts` + suite):
  - A `new → new` free ride logged as `~new/~new` is titled `new → new`.
  - The `pickedLoop` / `resolveGoingTo` parity sweep has no mismatches.
  - A loop way reads `Home loop · <spec>` (`wayLabelIn`; the suite pins it).
  - Non-loop output is the byte-identical template `${start} → ${end}` (`defaultWay.ts:81`).
- Regression mutations of 01 / 05 (`mut_old.py`) still fail their tests:
  - `pickedLoop` guard
  - live / offline re-acq → `nearestVertex`
  - tie `<=`
  - `RidesScreen` raw
  - the `defaultWay` and Record title mutants

## 6. Performance (Node / V8 desktop; Hermes on the phone will be slower, unmeasured)

| path | 5 km out-and-back (1 100 vertices) | 20 km loop (4 000 vertices) |
|---|---|---|
| `overlapChainages` (once per route birth) | 7 ms | 55 ms |
| `buildPassModel` (per map mount, N1) | 7 ms | 39 ms |
| 360 × (faint + runs + gateFaint + ticks + spans) | 35 ms | 89 ms |
| 1 000 × `progressAtTime` | 37 ms | 122 ms |
| `projectRideOffline`, 1 h at 1 Hz | 8.5 ms | 5.5 ms |
| `projectRideOffline`, 1 h, all lost | 23 ms | 62 ms |
| `buildRefFromRideFixes`, 3 600 fixes | 21 ms | 61 ms |

Bundled-route timings from `pfade.ts`: `buildPassModel` takes 0.2-6.5 ms (48 ms on the first, cold-JIT call).

## 7. Findings (ranked)

### N1 MINOR (perf, brief 04): the O(n²) pass model is built on EVERY MapLibre map mount, including the many surfaces that never pass `progressM`
- **Where:** `app/src/ui/wayMapView.tsx:604`, `const passModel = useMemo(() => (asset ? buildPassModel(asset) : null), [asset]);`.
- **Effect:** it runs for every feed card (`activityCard.tsx:87`), every catalog and ride-detail map and the gate editor. `useMemo` is per instance, so N feed cards pay N × O(n²).
  - Measured on V8: 7 ms for a 5 km route and 39 ms for 20 km, per mount.
  - Hermes (no JIT) is likely several times slower, so a feed of several cards may hitch on mount.
- **Minimal fix:** gate the work, not the hook: `const hasProgress = props.progressM !== undefined && props.progressM !== null;` then `useMemo(() => (asset && hasProgress ? buildPassModel(asset) : null), [asset, hasProgress])`. Alternatively, a module-level `WeakMap<WayAsset, PassModel>` cache.
- **Repro:** `cd $HOME/inspfin/probe && node --experimental-strip-types perf.ts $HOME/inspfin/app`.

### N2 MINOR (behaviour, brief 04; design-consistent): two real "ordinary" Leuven routes cross themselves and now draw a short faint stretch
- **What:** `WorkStationA` crosses itself at ch 3271 / 3398 (3 m apart) and `ChurchFosh` at 2444 / 2651 (1.7 m). At the start of a ride, about **70 m** (WorkStationA) and **160 m** (ChurchFosh) of their end loop-around-the-block draw at 0.3 opacity. It brightens once the rider is within 240 m.
- **Why it matters:** this is the geometric rule working as designed, but it is not "nothing faint" for every point-to-point route. Any route whose legs pass within 40 m of each other more than 120 m apart in chainage (a P-loop round a block, a switchback climb) will show it.
- **Same rule elsewhere:** brief 03 seeding uses the same rule; it moves no gate on these two.
- **Repro:** `node --experimental-strip-types pfade.ts $HOME/inspfin/app` (columns `partners`, `maxFaint`).

### N3 MINOR (units, brief 04): path metres drift from engine chainage by 0.3-0.6 %
- **Where:** `pathCumulativeM` (`wayMapMath.ts`, appended block) uses 111 320 m/deg for latitude. Core (`geo.ts:11`) uses `M_PER_DEG_LAT = 110540`. The doc comment "agrees with the engine's chainage to rounding" is therefore not true.
- **Measured drift between path metres and engine chainage:**
  - Runtime assets: +9 to +33 m over 1.7-8.7 km.
  - Bundled simplified assets (shipped seed mode, ~150-vertex paths): −67 m (MorningB) to +45 m (EveningB).
- **Effect:**
  - LIVE and REPLAY compare engine chainage against path metres, so fade boundaries shift by that amount. This is small against the 240 m window.
  - DEMO is self-consistent.
- **Fix (if wanted):** use 110 540 for the latitude term, or carry each path vertex's chainage from `buildRuntimeWayAsset`.

### N4 MINOR (test gap, brief 04): the `FADE_NEAR_M` clause is untested
- **Mutation:** removing `&& Math.abs(model.cumM[k] - s) > nearM` from `faintVertices` (`wayMapGeo.ts`, appended block) leaves the suite at 0 non-env FAIL.
- **Why it survives:** the `s = 1950` assertion in `waymapgeo_suite.ts` (brief 04 test 2) is vacuous. No vertex within 240 m of 1950 is ever faint by the partner clause alone.
- **When the clause matters:** only where BOTH copies are within 240 m of the rider, i.e. near a turnaround or a loop closure. Brief 04 §9's prediction is wrong.
- **Suggested pin:** an out-and-back with a short dead-end turnaround, at s just before the turn.
- **Repro:** `cd $HOME/inspfin && python3 mut.py "04 no near"`.

### N5 MINOR (test gap, brief 03): the 3-argument wiring in `routeFromRide.ts` is untested
- Reverting either `routeFromRide.ts:118` or `:241` to the 2-argument call passes the whole suite.
- The behaviour is right today. Nothing pins that a retraced reference ride's overlap actually reaches seeding on route creation or re-reference.
- **Repro:** `python3 mut.py "03 routeFromRide"`.

### N6 MINOR (test gap, brief 02/05 regression pass): the live re-acquisition's `nearS = this.sp` is not distinguished from `-Infinity`
- `python3 mut_old.py 'live reacq drop nearS'` → 0 non-env FAIL.
- It is benign:
  - Inside `[sp, sp + bound]`, `|s − sp|` and "earliest" order the candidates identically.
  - Since brief 06, the mutant only widens the re-acquisition band from 15 to 40 m.
- No test covers that widening at the live call site.

### N7 NOTE (perf, brief 04): the route source is rebuilt every 10 m bucket on a retraced route
- `faintVertices` returns a fresh array every 10 m bucket, even when the flags are unchanged.
- On a retraced route, `wayFC` is therefore rebuilt and re-sent to native roughly every 2 s at 18 km/h.
- Single-pass routes are unaffected (null stays null).
- Cheap fix: content-compare the flags or memo on a run signature.

### N8 NOTE (brief 04 design): span fade is keyed on the END gate
- A sector span's fade follows its END gate. On a loop, span 4 (G3 → FINISH) is flagged faint for its whole length while the rider is near the start. It is invisible in practice because an undone sector's span is transparent.

### N9 NOTE (brief 01, pre-existing allowance): delete confirmations still say "Home → Home"
- `catalogDeleteActions.ts:63/70/84` still print "Home → Home" for a loop route in the delete confirmations.
- Brief 01 lists these sites as allowed. Nathan may want them to read "Home loop" later.

### Known and accepted (not new)
- The wide-road re-acquisition residual (D = 20-25 m, e ≥ (D+15)/2), brief 06 OPEN item 2.
- A loop whose gap is > 40 m anchors at the end.
- Offroute misses under σ ≥ 12 m noise are identical at HEAD.

## 8. Device test checklist for Nathan (phone)

1. **RECORD → GOING TO:**
   - The `loop` pill sits between the places and `new`. Check that the row wraps acceptably on your phone.
   - Pick a START, tap `loop`: the armed title reads `<Place> loop` (`· spec` if the way has one), never `Home → Home`.
   - Change START: the loop follows.
   - `new → new` still reads `new → new`.
2. **Ride a real Home-to-Home loop**, starting at your door:
   - No FINISH at the first fix.
   - START fires, then G1-G3, then FINISH once at the end.
   - Sectors are coloured, not "missed".
   - The saved ride's sector times match what LIVE showed.
3. **Make the loop ride a new route (STOP → name it):**
   - Gates land on sensible spots, START and FINISH at the door.
   - Open the gate editor. Tap the shared START/FINISH spot repeatedly: it cycles START → FINISH → START and never gets stuck. A chip still selects any gate, and tapping a selected single gate deselects it.
4. **Out-and-back or partially retraced route:**
   - LIVE, on the way out: the return copy of the street and its gates look dimmed (0.3), not hidden. They brighten as you come within ~240 m.
   - On the way back, the outbound copy dims instead.
   - Check legibility of 0.3 on both basemaps (dark at night, positron by day).
   - REPLAY of that ride: the same fade follows the scrubber.
5. **Ordinary routes:**
   - Morning or any straight commute looks exactly as before.
   - WorkStationA and ChurchFosh (if present in your catalog) show a short dimmed stretch at their end-of-route block loop until you approach it (N2). Decide whether you like that.
6. **Feed and catalog with several map cards:**
   - Scroll the feed and open the catalog / ride detail. Watch for any new hitch when map cards mount (N1). Long routes (10-20 km) are the worst case.
7. **DEMO:** no visible change is expected; the demo route does not retrace itself (plan Q1). Check that the dot and the map still behave.

## Repro commands

```
cd $HOME/mnt/Qualifire/app && node --experimental-strip-types tests/run.ts | tail -1     # 954 / 951 / 0 / 3
cd $HOME/mnt/Qualifire/app && ./node_modules/.bin/tsc --noEmit; echo $?                    # 0
cd $HOME/mnt/Qualifire && GIT_OPTIONAL_LOCKS=0 git diff -- app/tests/ui-strings.allow.json  # one `loop` entry
# scratch copy (outside repo): rsync app/ to $HOME/inspfin/app minus node_modules, symlink node_modules;
# HEAD copy: git archive HEAD app | tar -x -C $HOME/insphead
cd $HOME/inspfin && python3 mut.py "06 " ; python3 mut.py "03 " ; python3 mut.py "04 "     # mutation tables
cd $HOME/inspfin && python3 mut_old.py 'live reacq drop nearS'                              # N6
cd $HOME/inspfin/probe && node --experimental-strip-types p4.ts                             # loops G=25/30/40, wide road, retrace noise
cd $HOME/inspfin/probe && node --experimental-strip-types pseed.ts $HOME/insphead/app > head.txt; node --experimental-strip-types pseed.ts $HOME/inspfin/app > now.txt; diff head.txt now.txt
cd $HOME/inspfin/probe && node --experimental-strip-types e2e.ts $HOME/inspfin/app          # (and $HOME/insphead/app for HEAD)
cd $HOME/inspfin/probe && node --experimental-strip-types pfade.ts $HOME/inspfin/app        # N2, N3
cd $HOME/inspfin/probe && node --experimental-strip-types perf.ts $HOME/inspfin/app         # N1, §6
```
(The scripts are copied to `safe_to_delete/inspect26-final/`. In a scratch copy, one env FAIL, `virgin-cycle19 02` `.easignore`, is expected and excluded.)
