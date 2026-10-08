# Inspect report: virgin-cycle26 briefs 01 + 02 + 05 (fresh-context Opus re-inspect, 2026-10-08)

**VERDICT: PASS WITH NOTES.** M1 and M2 from `inspect-report-01-02.md` are resolved. Every brief 05 §9 mutation fails at least one test. One new MAJOR design note (N1) needs a Fable ruling before brief 03 lands, because brief 03 builds on the offline projector. It is not a regression against shipped HEAD.

- Brief 01: PASS.
- Brief 02 + 05: PASS WITH NOTES (N1).

Safe to ship OTA (JS only)? Yes for all three briefs. No native file, dependency or config change. In every probe, N1's behaviour is never worse than HEAD.

## Checks rerun (all by me, on the live tree)
- `cd app && node --experimental-strip-types tests/run.ts` gives `940 tests: 937 pass, 0 fail, 3 skip`; `grep -c FAIL` = 0. The 3 skips are the pre-existing engine python-oracle skips.
- `cd app && ./node_modules/.bin/tsc --noEmit` exits 0 with no output.
- `git status --short`: the app changes are exactly the 18 files of briefs 01/02/05.
  - Brief 05 adds `catalogmap_suite.ts` and `routecreation_suite.ts`. Its other 7 files overlap with briefs 01/02.
  - Untouched: `run.ts`, `IDEAS.md`, `src/location/`, `catalogDeleteActions.ts`, `engine_suite.ts`, `gateseeding_suite.ts`, `userrefs_suite.ts`, `waymap_suite.ts`, `waymapgeo_suite.ts`, `demo_suite.ts`.
  - Non-app changes are coordinator material: cycle26 md files and the untracked `virgin-cycle27/`.
- Pre-existing tests are byte-identical. In `app/tests/*.ts` the only `-` line is `wayspec_suite.ts`'s import line, which brief 01 told it to replace. Every other test diff is an append or an import-list addition.
- Brief 05 code is verbatim. Every ```ts block of brief 05 §4 occurs contiguously in its target file (scripted check).
- Greps:
  - `pick.from === pick.to` in `app/src`: none.
  - `pickedLoop(`: the definition plus `RidesScreen.tsx:142` and `RideDetailScreen.tsx:227`.
  - `recordFlow.ts` has no `import` line.
  - `near.dist + CORRIDOR_M`: none.
  - `passVertex(`: the definition at `projection.ts:106` plus 4 call sites (`live.ts:90`, `live.ts:112`, `projection.ts:166`, `projection.ts:192`), each ending in its corridor argument.
  - `LOOP_ID` in `RecordScreen.tsx`: 3 lines, as brief 05 m5 expects.
  - `routeTitle(`: the definition plus 7 call sites, as listed in brief 01.
- Unchanged (diff read): `nearestVertex`, `nearestOnSegments`, `CORRIDOR_M`, `PASS_GAP_M`, `GateDetector`, `DEFAULT_LIVE_OPTIONS`, `crossTime`, `sp - 60` / `sp + 240`, and the tie rule `score < bestScore`.
- `git diff -- app/tests/ui-strings.allow.json` has exactly one added entry, with nothing edited or removed:
  ```
  { "file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "loop",
    "reason": "virgin-cycle26 brief 01: GOING TO pill = finish where I start (Nathan 2026-10-08); replaces offering the START place twice",
    "since": "2026-10-08", "by": "Sonnet execute, virgin-cycle26 brief 01" }
  ```
  - Since brief 01 there is no new allow-list entry and no entry for the title word.
  - Added `src` lines contain no `Alert`, `flashSub`, banner, sub-label or disabled state. The only new rider-facing text is the pill `loop` and the routeTitle suffix ` loop`.
- The parity test `virgin-cycle26 02: live gate events and offline crossTime agree…` (`live_suite.ts:1213`) still loops over both LOOP and OB.
  - It asserts an equal gate count and every gate within 2 s (`numEq` tolerance, not strict equality, unchanged from brief 02). It passes.

## M1 / M2 re-probes (scratch copy `$HOME/inspect26b`, outside the repo; probes from the first inspect re-pointed at the current tree)
- **M2 case A** (`probe/p1.ts`):
  - `passVertex(500,42,PAR,0,3000,0)` picks ch 1544 at 2.2 m (it used to pick ch 500 at 42 m).
  - Live re-acquires at x = 580 and reaches final s 2039. Offline end s = 2039 (it used to be 0 / 0). **Resolved.**
- **M2 case B** (`probe/p2.ts`): y = 39 and y = 30 both give live 2039 and offline 2039. The 05 test checks for no backwards run (min step > -3 m). The mid-route anchor at (500,42) gives ch 1544. **Resolved.**
- **Same-street retrace 1-5 m apart** (`probe/p4.ts` (C)), OB_LONG ref (passes 4 m apart):
  - 400 random first fixes with 10-20 m lateral noise either side: 0 anchor flips onto the return pass.
  - 400 random GPS-gap rejoins at 10-20 m noise: 0 live or offline flips.
  - The earliest-pass rule holds.
- **M1** (`probe/p5.ts`):
  - `pickedLoop` returns false for `undefined/undefined`, `null/null`, `''/''`, `''/x`, `~new/~new`, `~new/lm:a`, `lm:a/~new`, `lm:a/lm:b` and case/space variants.
  - It returns true for `lm:a/lm:a`.
  - A legacy ride `{from:'~new',to:'~new',labels 'new'}` titles as `new → new`.
  - Sweep over every START × GOING TO (`~new`, `lm:a`, `lm:b`, `~loop`): the RECORD title (`loopOn && toId !== NEW_ID`) equals the logged-pick title (`pickedLoop`) in every case. **Resolved.**

## Mutation checks (copy at `$HOME/inspect26b/app`, node_modules symlinked, script `$HOME/inspect26b/mut.py`)
The copy's baseline is `940/933/4/3`. The 4 FAILs are env-only `virgin-cycle19 02` `.easignore` tests, because the repo root is not copied. They are excluded from the counts below.

| mutation | non-env FAILs (test) |
|---|---|
| `pickedLoop` without `from !== NEW_ID` | 1 (05 pickedLoop) |
| `PASS_AMBIGUITY_M = 40` | 2 (05 passVertex `(500,30) nearS 0: ch 500`; 05 live re-acq parallel `y=30: offline ran backwards by 5 m`) |
| band = `near.dist + CORRIDOR_M`, cap kept | 2 (same two) |
| no cap (`dMax = band`) | 1 (05 passVertex `cap: ch 1568.6 dist 42.0`) |
| cap always (drop `near.dist <= within ?`) | 15 (engine fixtures, 02 single-pass, resultsstore…) |
| live re-acq back to `nearestVertex(…, sp, sp+bound)` | 1 (05 retraced-street `live rejoin chainage 2354.1`) |
| offline re-acq back to `nearestVertex(x,y,ref)` | 2 (02 detour; 05 retraced `offline rejoin 2354.1`) |
| tie `<` changed to `<=` | 1 (05 tie `tie: ch 455 dist 3`) |
| RidesScreen / RideDetailScreen back to raw `from === to` | 1 each (05 source pin) |
| RidesScreen / RideDetailScreen back to the arrow template | 1 each (05 source pin) |
| routeTitle loop arg changed to `false` at `routeFromRide.ts:197` | 1 (05 existingRouteProps) |
| … at `defaultWay.ts:94` | 1 (01 routeTitle/wayLabelIn) |
| … at `catalogDetailModel.ts:62` | 1 (01 catalog detail) |
| … at `catalogMapModel.ts:43` | 1 (05 MAP) |
| … at `RecordScreen.tsx:1266` (`false`, and also `loopOn` without the NEW_ID guard) | 1 each (01 RECORD source pin) |
| … at `RidesScreen.tsx:142` / `RideDetailScreen.tsx:227` | 1 each (05 source pin) |
| **live re-acq: drop `nearS` (`-Infinity`)** | **0**. Fable's claim holds (proof below). |
| **live re-acq: drop `o.corridor`** | **0**. It is default-equivalent while `corridor === CORRIDOR_M` (see m2). |

Proof that dropping `nearS` is behaviour-equivalent at `live.ts:112`:
- `sLo = sp`, so every candidate run has `sRun >= sp`.
- Then `|sRun - sp| = sRun - sp`, which is strictly monotone in `sRun`. That gives the same order as `score = sRun`.
- Runs are > 120 m apart in chainage, so no new ties can appear.

## Findings (ranked)

### N1 MAJOR (brief 05 design; needs a Fable ruling before brief 03): the 15 m band takes back brief 02's loop-anchor fix (plan risk (a)) when a loop reference's open/close points are ≥ ~20 m apart
- **Where:** `app/core/src/projection.ts:121-123`, used by the anchor callers `live.ts:90` and `projection.ts:166` (`nearS = -Infinity`).
- **Scenario:**
  - A loop reference whose last vertex is G m from its first, for example a reference recorded from a ride whose first fixes settled 25 m from where it ended.
  - The rider starts at the closing point.
  - The end pass is nearer by more than 15 m, so the start pass drops out of the candidates even though it is inside the 40 m corridor.
  - The anchor lands at ch ≈ L. The first fix fires FINISH `estimated` and skips gates 0-3, which is exactly the risk (a) symptom brief 02 fixed.
- **Probe** `probe/p4.ts` (A), ref `[[0,0],[1000,0],[1000,600],[0,600],[0,G]]`, first fix at (0,G):

  | G (m) | anchor now | anchor with brief 02 | anchor at HEAD | live gates now |
  |---|---|---|---|---|
  | 25 | 3170 | 0 | 3170 | `4e`, skipped 0,1,2,3 |
  | 30 | 3165 | 0 | 3165 | `4e`, skipped 0,1,2,3 |
  | 40 | 3155 | 0 | 3155 | `4e`, skipped 0,1,2,3 |

  - G ≤ 20 still anchors at 0.
  - Brief 05 §1 argued "a far first fix on a loop must still anchor on the earliest pass". That holds only when the nearest vertex is outside `within`. This case, with the nearest vertex inside it, was not considered.
  - No test covers it. The loop fixtures have the end vertex 1-5 m from the start.
- **Same root cause, wide road** (`probe/p4.ts` (B)): on a retrace whose return copy is 20-30 m away (opposite side of a wide road), the anchor AND the re-acquisition flip onto the return pass when GPS puts the fix ≥ (D+15)/2 m toward it. That is 18 m for D = 20 and 22 m for D = 25. Brief 02 kept the anchor on the outbound pass there.
- **Not a regression against HEAD.** HEAD's `nearestVertex` does the same, and worse (G = 10 and G = 15 already anchor at the end).
- **Candidate fix for Fable** (tested on the copy, not applied):
  ```
  const band = near.dist + (nearS === -Infinity ? CORRIDOR_M : PASS_AMBIGUITY_M);
  ```
  - The anchor keeps brief 02's band, still capped at `within`. Re-acquisition keeps 15 m.
  - Result: `940/933/4 env/3`, so zero new FAILs.
  - The G = 25/30/40 loops anchor at 0 with all 5 gates real. The D = 20 anchor stays OUT; re-acquisition still flips at ≥ 18 m.
  - p1/p2 parallel-street cases still give 2039.
  - Cost: a mid-route first fix between two parallel streets ≤ 40 m apart anchors on the earlier one. The forward window recovers that for the outbound street only.
  - If adopted, add a loop fixture with G = 25.

### m1 MINOR (coverage): the RECORD title guard is pinned only by a source string
- Changing `loopOn && toId !== NEW_ID` at `RecordScreen.tsx:1266` to `loopOn` fails only brief 01's source-pin test. No behavioural test covers it.
- That is acceptable because the expression is now mirrored by `pickedLoop`; my p5 sweep shows the two agree.
- Possible follow-up: a test asserting `resolveGoingTo('~loop','~new','~new')` combined with the RECORD guard equals `pickedLoop('~new','~new')`.

### m2 MINOR (coverage, by design): the `corridor` / `o.corridor` arguments at the 4 call sites are unpinned
- No test runs `LiveProjector` or `projectRideOffline` with a non-default corridor, so dropping any of the arguments survives.
- Brief 05 §9 declares this. The `within = 60` unit assertion pins only the parameter itself.

### m3 MINOR: `pickedLoop('~loop','~loop')` returns true
- This is unreachable today: `toId` is always resolved, and `from` is never `LOOP_ID`.
- Noted only because `pickedLoop` guards one sentinel and not the other.

### m4 MINOR (housekeeping, carried over)
- `recordFlow.ts` still has the double blank line before brief 01's block.
- Both `06-brief-01-executor-report.md` and `report-brief-01.md` exist.
- `06-brief-05-tsc.log` reads `exit 0` (current). The brief-01/02 tsc logs are still stale.
- `INSPECTOR-RULES.md` says scratch goes under `safe_to_delete/`. Per the coordinator I used `$HOME/inspect26b` outside the repo; nothing in the repo was written apart from this report.

## Performance (5 km reference, 1009 vertices, 3600 fixes; `probe/p2.ts`)

| case | time |
|---|---|
| 3600 × passVertex | 31.9 ms (nearestVertex: 14.6 ms) |
| offline, mixed | 7.7 ms |
| offline, all-lost (re-acquisition every fix) | 39.8 ms |
| live, all-lost | 21.9 ms |

No blow-up; passVertex stays O(n) per call.

## Brief 03 / 04 anchors (checked against the tree)
- All anchors in `EXECUTION-ORDER.md` and the two briefs' "2026-10-08 anchor update" notes are current:
  - `projection.ts`: `passVertex` closes at `:152`; the doc comment is at `:154-157`; `CORRIDOR_M` `:12`, `RefLine` import `:9`, `PASS_GAP_M` `:81`, `PASS_AMBIGUITY_M` `:89`.
  - `routeFromRide.ts`: `seedGateChainages` at `:118` / `:241`.
  - `RecordScreen.tsx`: `<WayMapView` at `:1270` / `:1419` / `:1538`; `selfs=` at `:1427`; `live.chainageM` at `:1239` / `:1241`.
- **Stale numbers** (both briefs say to match on text):
  - `EXECUTION-ORDER.md:19` says `PASS_GAP_M` is "still `:82`". It is now `:81`.
  - Brief 03 §2 `:59` and brief 04 `:122` / `:387` still carry the original numbers, alongside their parenthetical updates.
- **Caveat:** brief 03's numeric expectations were prototyped before brief 05, against brief 02's 40 m band. Its fixtures use 4 m offsets (inside the 15 m band), so they should hold. If N1's fix is adopted, rerun brief 03's prototype.

## Repro commands
```
cd $HOME/mnt/Qualifire && export GIT_OPTIONAL_LOCKS=0 && git status --short && git diff --stat
cd app && node --experimental-strip-types tests/run.ts | tail -1     # 940 / 937 / 0 / 3
cd app && ./node_modules/.bin/tsc --noEmit; echo $?                 # 0
git diff -- app/tests/ui-strings.allow.json
cd $HOME/inspect26b/probe && node --experimental-strip-types p1.ts   # M2 A resolved
node --experimental-strip-types p2.ts                                # M2 B resolved + perf
node --experimental-strip-types p4.ts                                # N1 (A) loop gap, (B) wide road, (C) retrace noise
node --experimental-strip-types p5.ts                                # pickedLoop / title parity
cd $HOME/inspect26b && python3 mut.py '<mutation name>'              # mutation table; 'ALT anchor band 40' = N1 candidate fix
```
