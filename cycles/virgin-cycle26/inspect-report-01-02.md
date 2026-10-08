# Inspect report: virgin-cycle26 briefs 01 + 02 (fresh-context Opus, 2026-10-08)

**VERDICT: FAIL** (brief 01: FAIL, one-line fix; brief 02: PASS WITH NOTES, one MAJOR design note for Fable)

Safe to ship OTA (JS only)? Brief 01: NO until M1 is fixed (then yes; no native change). Brief 02: yes (JS-only, `app/core` + one comment file), subject to the coordinator accepting M2 or getting a Fable ruling first.

## Checks rerun (all by me, on the live tree)

- `cd app && node --experimental-strip-types tests/run.ts` -> `931 tests: 928 pass, 0 fail, 3 skip` (baseline 918/915/0/3; +5 brief 01, +8 brief 02 = +13). All 13 new tests PASS.
- `cd app && ./node_modules/.bin/tsc --noEmit` -> exit 0, no output. (Stale logs `06-brief-01-tsc.log` / `06-brief-02-tsc.log` in the cycle folder predate the RULINGS fix; the brief-02 one still shows TS2367.)
- `git status --short`: app changes are exactly brief 01's 12 files + brief 02's 4 files. No `IDEAS.md` change, no `run.ts` change, no edit to `engine_suite.ts`, `gateseeding_suite.ts`, `userrefs_suite.ts`, `waymap*_suite.ts`, `demo_suite.ts`, `catalogmap_suite.ts`, `migrations_suite.ts`, `ridehistory_suite.ts`, `core/src/timing.ts`, `core/src/index.ts`. Non-app: `cycles/virgin-cycle26/{00-nathan-ideas,NOTES,README}.md` modified and `cycles/virgin-cycle27/` untracked (coordinator material, not executor hunks).
- Pre-existing tests in `live_suite.ts` / `recordflow_suite.ts` / `wayspec_suite.ts` / `catalogdetail_suite.ts`: diffs are pure appends + import-list additions (the only `-` line in wayspec is the import line it was told to replace).
- Code vs brief text (scripted diff of every ```ts block against the added lines): `recordFlow.ts`, `recordflow_suite.ts` (incl. the RULINGS `(LOOP_ID as string)` fix), `live_suite.ts` block, `passVertex` body: identical. Only deviation: comments in `core/src/projection.ts` and `core/src/live.ts` use ASCII `<=` / `--` instead of the brief's `≤` / `—` (keeps `projection.ts` ASCII-only as at HEAD; harmless).
- `nearestOnSegments`, `nearestVertex`, `CORRIDOR_M`, `GateDetector`, `DEFAULT_LIVE_OPTIONS`, `crossTime`, offline window `sp - 60` / `sp + 240` and the non-monotonic `s[i] = hit.s`: untouched. `grep -n nearestVertex core/src/*.ts src/live/*.ts` -> projection.ts only. `engine.ts` diff = the two comment lines.
- `routeTitle(` = definition (`defaultWay.ts:80`) + 7 call sites (defaultWay:94, routeFromRide:197, catalogDetailModel:62, catalogMapModel:43, RecordScreen:1266, RidesScreen:141, RideDetailScreen:226). Every `loop` arg is id-derived. `} → ${` leftovers = catalogMerge:105, catalogDeleteActions:63/70/84 (old format, deferred as documented), demoModel:188/329, routeTitle itself. No other arrow title template anywhere in `src`.
- RecordScreen: 6 hunks; `filter((l) => l.id !== fromId)` count 1; `landmarkLabel(to)` none; `landmarkLabel(toId)` 2; `routeTitle` 2. `recordFlow.ts` still import-free.
- Allow-list: `git diff -- app/tests/ui-strings.allow.json` = exactly one added entry, nothing edited/removed:
  ```
  { "file": "src/ui/RecordScreen.tsx", "kind": "text", "text": "loop",
    "reason": "virgin-cycle26 brief 01: GOING TO pill = finish where I start (Nathan 2026-10-08); replaces offering the START place twice",
    "since": "2026-10-08", "by": "Sonnet execute, virgin-cycle26 brief 01" }
  ```
  No em dash, sorted slot (sort assertion passes), no entry for the title word. No new `Alert` / `flashSub` / banner / sub-label / disabled state in any diff; the only new rider-facing words are the pill `loop` and the `routeTitle` suffix ` loop`.

## Mutate-checks (scratch copy at `$HOME/inspect26/app`, node_modules symlinked; 4 env-only FAILs there from `virgin-cycle19 02` .easignore tests because the repo root is not copied, excluded below)

Brief 02 (each mutation alone):
| mutation | new-test FAILs |
|---|---|
| `passVertex` body -> `return nearestVertex(...)` | 6 (earliest/nearS, loop t=0, OB order, offline anchor, offline re-acq, live-vs-offline) = brief §5 |
| live anchor `:90` back to nearestVertex | 3 (loop t=0, OB, parity) |
| **live re-acq `:112` back to nearestVertex (no nearS)** | **0, uncovered** |
| offline anchor back | 2 |
| offline re-acq back | 1 |
| pass split line removed | 6 |
| `runD2 = Infinity` reset removed | 2 |
| tie `<` -> `<=` (later pass wins) | **0, uncovered** |

Brief 01:
| mutation | FAILs |
|---|---|
| pill removed | source pin + ui_strings STALE |
| `resolveGoingTo` call replaced by raw `to` | source pin |
| resolver without stale clause / with new->new as loop | resolveGoingTo test |
| catalogDetailModel / wayLabelIn back to arrow template | catalogdetail / wayspec test |
| **catalogMapModel, routeFromRide `existingRouteProps`, RidesScreen, RideDetailScreen back to arrow template** | **0, uncovered** (brief did not ask for tests there) |

## Findings (ranked)

### M1 MAJOR (brief 01): every `new → new` free ride is titled **"new loop"** in RIDES and ride detail
- `app/src/ui/RidesScreen.tsx:141`, `app/src/ui/RideDetailScreen.tsx:226`: loop flag is `!!pick.from && pick.from === pick.to`.
- The brief's premise (§2: "'~new' is never logged") is wrong. That holds for `ridePickRef` (`RecordScreen.tsx:724-727`) but the persisted PickEvent is written from `startContext` verbatim (`src/location/index.ts:464-469`: `from: ctx.from, to: ctx.to`), and `startContextRef` (`RecordScreen.tsx:1253-1255`) carries `from: fromId` / `to: toId`, which are `'~new'` for a new->new ride (blank-install default, `RecordScreen.tsx:278-279`). Labels are `'new'` (`landmarkLabel`, `:1247-1248`).
- Scenario: blank install, START `new`, GOING TO `new` (or `loop` with START `new`), ride, STOP, keep as free activity. RIDES row fallback (no stored wayId) shows `new loop`; before this change it showed `new → new`. This also relabels every past new->new ride already on the phone. The armed title is fine (it guards `toId !== NEW_ID`); the two log-reading sites do not.
- Repro: `cd $HOME/inspect26 && node --experimental-strip-types probe/p3.ts` -> `"new loop"` (routeTitle with the exact logged values).
- Minimal fix (both sites): `!!pick.from && pick.from !== '~new' && pick.from === pick.to`. Add a test that pins this (both sites are currently untested, see mutate table).

### M2 MAJOR (brief 02, design, needs a Fable ruling): pass-aware re-acquisition regresses when two passes are 30-45 m apart (parallel streets one block apart)
- `app/core/src/projection.ts:102` candidate radius `near.dist + CORRIDOR_M` (40 m), combined with the callers' `nv.dist <= corridor` check (`live.ts:113`, `projection.ts:177`).
- Case A (re-acq rejected; live AND offline): ref `[[0,0],[1000,0],[1000,44],[0,44]]` (loop out along one street, back along a parallel one 44 m away). Anchor at (0,0), then a GPS gap, then the rider reappears 2 m from the return leg at (600..0, 42). `passVertex(500,42,ref,0,3000,0)` picks the outbound vertex (ch 500, dist 42.0) over the true one (ch 1544, dist 2.2). 42 > corridor, so re-acq is rejected on every fix. The rider is never re-acquired: live final s = 0, offline end s = 0. Pre-change core: re-acquired at the first eligible fix, live and offline both end at s = 2039 (full lap).
- Case B (wrong pass accepted; offline runs backwards): same ref, rider at y = 39 or 30 (9-14 m from the return leg, 30-39 m from the outbound one). Offline re-acq picks the outbound pass and then projects the whole return leg backwards along it: end s = 0 (pre-change: 2039). Live recovers its end chainage, but the sp it holds along the return leg is wrong, so live and offline disagree there. This is the parity property brief 02's last test claims.
- Also, the first-fix anchor at (500,42) goes to ch 500 (42 m away) instead of ch 1544. That only matters for a mid-route start.
- Repro: `cd $HOME/inspect26/probe && node --experimental-strip-types p1.ts && node --experimental-strip-types p2.ts` (post-change) vs `p1pre.ts` / `p2pre.ts` (same core with the four call sites reverted, in `$HOME/inspect26/core_pre`).
- Why the tests miss it: the fixtures only have a second pass 1-5 m away (OB y = -4, loop end vertex 1 m away). Nothing has a second pass 30-45 m away, and the live re-acq call-site change is not exercised by any test (mutate table).
- Possible fixes for Fable: (a) restrict candidates to `d <= max(near.dist, CORRIDOR_M)` for the re-acq callers, or simply pick only among passes whose best vertex is within corridor when one exists; (b) a tighter ambiguity radius (e.g. `near.dist + 10-15 m`, which covers both sides of one street) instead of `+ CORRIDOR_M`. Either change keeps all 8 new tests' geometry (second pass at 1.4-5 m). Add a parallel-street fixture at 30 and 44 m.

### m3 MINOR (brief 02): two behaviours have no test
- The live re-acq call (`core/src/live.ts:112`, `nearS = this.sp`) can be reverted with zero failures.
- The tie rule ("equal scores keep the earlier pass", `projection.ts:111` strict `<`) can be flipped to `<=` with zero failures.
- Reasoning check: ties are only possible with a finite `nearS` exactly midway between two passes. Strict `<` does keep the earlier pass. A single pass returns nearestVertex's index (same iteration order, strict `<` on d2). `closeRun` resets `runD2` (mutating it fails 2 tests). The split happens before the current vertex is folded in.

### m4 MINOR (brief 01): four of the seven routeTitle sites are untested
- `catalogMapModel.ts:43`, `routeFromRide.ts:197`, `RidesScreen.tsx:141`, `RideDetailScreen.tsx:226` can each be reverted to the arrow template with zero failures. The brief did not ask for these tests, so this is a coverage note, not a deviation. M1 lives in two of them.

### m5 MINOR (brief text): Acceptance says `grep -n "LOOP_ID" RecordScreen.tsx` gives exactly 2 lines; it gives 3
- The third is the brief-supplied comment at `:1153` ("`to` may be the LOOP_ID sentinel"). The executor followed the brief; the acceptance line is internally inconsistent.

### m6 MINOR (housekeeping)
- Both `06-brief-01-executor-report.md` and `report-brief-01.md` exist with the same content.
- The tsc logs in the cycle folder are stale.
- `recordFlow.ts` gained a double blank line before the appended block.

## Edge probes that passed (evidence)
- passVertex one-vertex ref = nearestVertex (`{0,5}`). Empty ref and NaN fix return `{-1, Infinity}`, same as nearestVertex, so callers behave exactly as before (pre-existing `ch[-1]` = undefined on an empty ref is unchanged).
- Hairpin < PASS_GAP_M stays one pass (test). A gap exactly 120 m stays in one run (`>`).
- Far-end single-pass anchor unchanged (test).
- Live-vs-offline test asserts both fixtures, equal gate count, and every gate within 2 s (numEq tolerance, not exact equality).
- Performance on a 5 km ref (1009 vertices) with a 3600-fix trace:
  - 3600 x passVertex = 31 ms vs nearestVertex 14 ms;
  - offline all-lost (re-acq every fix) 40 ms;
  - live all-lost 25 ms.
  No blowup (O(n) per call, about 2x nearestVertex).
- Picker:
  - `loop` with START X resolves to X; a later START change carries it along (`to` stays `'~loop'`, resolved at render).
  - A stale `to === fromId` shows the loop pill on, so there is no hidden state.
  - START `new` + `loop` gives `toId '~new'`, titled `new → new` on RECORD.
  - `new → new` is distinct from a loop.
  - `ridePickRef` receives a landmark id or null, never `'~loop'`. `setTo(reset.to ?? NEW_ID)` on a sport switch clears a loop selection.
  - No `useEffect` depends on raw `to`.

## Anchors in briefs 03/04 shifted by 01/02 (for the next executor)
- Brief 03 `routeFromRide.ts:117` -> now `:118`; `:240` -> now `:241` (text unchanged).
- Brief 03 `projection.ts`: insert point is now after `passVertex`'s closing `}` at `:136`, before the doc comment at `:138-139`. `CORRIDOR_M` is still `:12`, `RefLine` import still `:9`.
- Brief 04 `RecordScreen.tsx:1416-1427` (live `<WayMapView`) -> now `:1419-1430`; `:1424` `selfs={settings.selfDots ? selfDots : undefined}` -> now `:1427`; "`live.chainageM` used at `:1238`" -> now `:1239`/`:1241`. Other `<WayMapView` mounts are now at `:1270` and `:1538`.
- If M1/M2 fixes land first, re-grep: M1 touches RidesScreen/RideDetailScreen only; an M2 fix touches `projection.ts` around `:102`, which shifts brief 03's insert point.

## Repro commands
```
cd $HOME/mnt/Qualifire && export GIT_OPTIONAL_LOCKS=0 && git status --short && git diff --stat
cd app && node --experimental-strip-types tests/run.ts | tail -1          # 931/928/0/3
cd app && ./node_modules/.bin/tsc --noEmit; echo $?                     # 0
git diff -- app/tests/ui-strings.allow.json
grep -rn "routeTitle(" app/src ; grep -rn '} → \${' app/src --include=*.ts --include=*.tsx
cd $HOME/inspect26 && node --experimental-strip-types probe/p3.ts         # M1: "new loop"
cd $HOME/inspect26/probe && node --experimental-strip-types p1.ts; node --experimental-strip-types p1pre.ts   # M2 case A
node --experimental-strip-types p2.ts; node --experimental-strip-types p2pre.ts                                 # M2 case B + perf
```
Scratch copy `$HOME/inspect26` (outside the repo, not user-visible) holds the mutate-check copy, `core_pre/` and `probe/`; nothing in the repo was modified apart from this report.
