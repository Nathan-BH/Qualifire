# INSPECT report — cycle-2 briefs WP-A, WP-B, WP-D (planning-only check)

**Tier:** Inspect (Fable, fresh context). **Date:** 2026-09-04. **Mount:** `$HOME/mnt/Qualifire`,
branch `virgin`, HEAD `5ae4c30`. Working tree: only `data/activities/...` notes/reviews and the
untracked `cycles/virgin-cycle2/` differ from HEAD — **no source file is modified**.

Nothing has been executed; this checks whether the three briefs are accurate and executable as
written. Every anchor below was re-read from the real files; every number was re-derived with the
app's own code (`node --experimental-strip-types`) on the mounted fixtures. Nothing in the repo was
edited. Throwaway probes live in the device home dir (outside the mount), not in the repo.

---

## WP-A — `WP-A-record-route-match-trail-visibility.md`

**Verdict: PASS WITH FINDINGS** (all minor; none changes the design or the fix).

### Anchors (all confirmed exact, 2026-09-04)
- `routeMapView.tsx` L76-77 imports, L135-145 `defaultRouteId()` + doc comment, L178-179 prop
  comment, L317 and L735 `const id = props.routeId ?? defaultRouteId();`, L737 `IMAGES[id]`,
  L347 zoom-reset deps, L428-439 always-mounted `trailFC`, L447 `hasTrail`, L246 `trail?:` (optional
  prop — `trail={undefined}` is type-safe and `trailFC` handles it).
- `defaultRoute.ts` L131-134 `defaultMapRouteId` — first drawable catalog route, as stated.
- `RecordScreen.tsx` L39 import, L224 the ONE `rideRouteHint` hook (the digest's "line 112" is
  indeed the `defaultRouteFor` doc comment at L112-114), L236 `trail` state, L448
  `setRideRouteHint(pickedRouteRef.current?.refLineId ?? null)`, L711 `writingHistory`
  (unconditional const in the component body — safe spot for `mapOverlay`), L838-847 `way` /
  `pickedRoute`, L930 + L1192 `routeId={pickedRoute?.refLineId ?? null}`, L1037 running-map routeId
  expression, L1046 `trail={trail}` (the only `trail={` in the file), L1183-1189 WP-D comment.
- `RideDetailScreen.tsx` L444-453 / L461-470 `variant="browse" routeId={null} trail={fixes ?? undefined}`.
- `DemoScreen.tsx` L13-15 and L52-54 comments say exactly what the brief says they say.
- `recordFlow.ts` is import-free (86 lines); `effectiveFromId` ends L72. `recordflow_suite.ts` last
  test ends L132; `routemap_suite.ts` static-guard tests at L244+ use `fs.readFileSync` as described.

### Root cause: holds
The fallback is real and is the only thing that could draw home>>work for a null pick; the trail prop
is unconditional. The PNG rung with `id === null` reaches its existing `!asset` degraded frame
(L777-793), so removing the fallback is null-safe there too.

### Findings
1. **`defaultMapRouteId` has more test consumers than the brief lists** (§6 stop-clause 1 says
   "its own tests"): `tests/store_suite.ts:792-806`, `tests/catalogstore_suite.ts:198`, and
   `tests/routeasset_runtime_suite.ts:313-328`. None imports `routeMapView.tsx`, none will fail —
   but an Execute agent grepping per §3.1 step 2 could STOP on them. Brief should name all three as
   expected, non-blocking hits.
2. **A stale comment/assertion message will survive:** `tests/routeasset_runtime_suite.ts:313`
   ("The EXACT predicate routeMapView.tsx's defaultRouteId() now uses") and its message "expected
   the newly-saved user route to be the setup map's default route ... (blank-map regression)". That
   test was written (commit `fec3654`, WP-C) precisely to pin the behaviour WP-A now removes — the
   setup map defaulting to the freshly-saved user route. Nathan's 2026-09-04 addendum overrides
   that, so the brief's "no caller wants this fallback" is right *today*, but the brief should say
   this history exists and tell Execute to leave the test alone (it tests the store function, not
   the map) — or make the comment fix part of §3.5. Not a blocker.
3. **Edge case the spec's "never neither" does not cover:** `liveMapOverlayFor` keys state 3 on
   `routeId !== null`, but the map draws a line only if the id resolves to a drawable asset. A
   picked/locked catalog route whose ref is missing/undrawable (`assetFor(id) === null`) would
   render rider-only with the trail hidden — neither line nor trail. Every catalog route today has a
   ref (routes are minted together with their ref in `wayCreation.ts`/`wayFromRide.ts`), so this is
   not reachable on Nathan's phone, but it is an unstated assumption; worth one sentence in §1.2 or
   a "do not chase" note.
4. **Minor:** `userRefs`/`refFor` claims (§2.3) verified — `route.id === route.refLineId` holds for
   both user routes in the 09-03 and 09-04 catalog fixtures.
5. The setup-preview comment fix (§3.3 step 5) is comment-only and correct. The armed map (L929-937)
   currently passes no `showRider`; the setup preview does — the brief's "they draw no trail today
   and must not start to" is accurate for both.

### Confidence
High — confirmed against every cited file and line; the pure function in §3.2 is trivially total
and its 5 proposed tests are consistent with it. No headless render is possible for the map itself
(as the brief says), so the pixel-level acceptance criteria 1-6, 9 remain on-device checks.

---

## WP-B — `WP-B-gate-placement-scale-bug.md`

**Verdict: PASS WITH FINDINGS** — the core claim is **confirmed independently and is stronger than
the brief states**; the fix covers every reader; findings are about a second affected route that
post-dates the brief's data, and a few test-plan inaccuracies.

### Anchors (all confirmed exact)
`jsonl.ts` L76-94 (`decodeRideFile` end / `deriveMeta` file-order first/last); `wayFromRide.ts` L19
import, L43-51 `readRideFixes` returning `decodeRideFile(text).fixes`, L96-97, L148, L205-206;
`userRefs.ts` L38-45 `RefFixInput`, L65-66 `buildRefFromRideFixes` filter (no sort); `resultsStore.ts`
L46 import, L436-441; `gpxExport.ts` L10 import, L35-38 F-2 sort; `gpxPlusExport.ts` L43 import,
L203-205 `buildSessionBlock` signature, L260-264 `excludedFixes` block then `if (events !== null)`,
L495 sort, L535 call; `storage/core.ts` L158-199 F-2 serializer, L119/L202/L242 `deriveMeta` callers,
L252/L289 exporters; `location/index.ts` L167-270 task handler, L192 `data?.locations ?? []`,
L206 `appendFix`; `gateSeeding` gate values in the 09-03 catalog fixture: `[139.58, 3489.46,
6978.93, 10468.39, 13818.28]` = 1/25/50/75/99 % of 13,957.856 — exact. Tests: `storage_suite.ts:283`,
`:334-358` (17-line `rng(99)` shuffle), `gpxplus_suite.ts:24` `makeEnv`, `:38-52` `stripGpxPlus`,
`resultsstore_suite.ts:217`, `waycreation_suite.ts:555` dynamic import of `wayFromRide.ts`.
`expo-task-manager` 56.0.25: `TaskManagerTaskBody<T> { data: T; error: TaskManagerError | null;
executionInfo }`, executor `(body) => Promise<any>`.

### Reader coverage: complete
`grep` for `decodeRideFile(` / `readRideFixes(` / `.fixes` across `src/` finds exactly the readers
the brief lists (A1 covers core.ts L119/L202/L242 via `deriveMeta`; A2 covers wayFromRide L96/L148/
L205, RecordScreen L320, RideDetailScreen L163, and `draftWayCreation`'s `ride.fixes` via L148;
A4 resultsStore; A5 the two exporters). No missed disk reader.

### The core claim, re-derived (independent of the brief's probes)
Using the app's own `buildRefFromRideFixes` on the 09-03 GPX (1,008 trkpts, 5 flagged, times
monotonic) vs the stored track in `qualifire-refs-20260903.json`:

| | pts | length | Euclid | ratio | reversals >135° | min step |
|---|---|---|---|---|---|---|
| stored `route:20260903-182911-3c34` | 2,819 | **13,957.9 m** | 4,601 m | 3.03 | 20 | 0.43 m |
| chronological rebuild from the GPX | 1,139 | **5,685.5 m** | — | 1.24 | 0 | — |
| stored `route:20260901-091752-f6ca` (healthy) | 1,134 | 5,661.6 m | 4,573 m | 1.24 | 0 | 4.52 m |

**Decisive:** the stored `lat0/lon0` equals the chronological rebuild's origin to **0.0 m** (double
precision identical; the brief said "within 12 m"). `meanOrigin` is the mean of the collapsed input
set, so the builder on the phone received *exactly* the same fix multiset. Duplicating even the
350-470 s window moves the origin by 29.5 m (checked). Same builder code (`eb9c487` ≤ phone build
`f7d96f7`, `git diff f7d96f7 HEAD --stat` touches no builder file). The only remaining variable is
**order** — the brief's root cause holds. Chronological order gives 5.7 km; the phone got 13.96 km;
therefore the fixes were read non-chronologically, and the read path (`readRideFixes` → file order)
is confirmed sort-free. Projecting the stored points onto the healthy line: prefix (s 0-2000) and
suffix (s 2900-5680) monotonic and on-road; the middle 2,000 stored points zig-zag over s 2,000-4,400
(686 backward steps, longest backward run 235 pts) — all three 25/50/75 % gates land in that block =
"bunched". Round-robin interleaving of the 350-470 s window through the real builder gives 11.2 km
(brief: 11.6 km; my GPX parse differs slightly from `parseGpx`) — same order of magnitude, same shape.

The raw `rides/20260903-182911-3c34.jsonl` is **not on the mount** (never exported), so the exact
permutation on disk cannot be observed — the brief says so honestly; Part B is the right instrument.

### Findings
1. **A second scrambled route exists and post-dates the brief's data — the brief's §6 "per-ride, not
   systemic" is now wrong in emphasis.** `data/activities/.../qualifire-20260904/` (files dated
   2026-09-04 20:03-21:26) holds Nathan's evening ride `qualifire-20260904-2144.gpx` (940 trkpts,
   5,918 m, times monotonic, `relaunches count="0"`) and its new route
   `route:20260904-214439-281e` ("WorkHomeWet"): **1,870 pts, 9,214.9 m, ratio 2.00, 40 reversals,
   min step 0.20 m, origin identical to the chronological rebuild (0.0 m)**. Its gate set is seeded
   at 92/2304/4607/6911/9123 m (and a version-2 manual adjustment exists). Scramble pattern differs
   from 3c34 (only 3 stored points > 30 m off the road, 343 short backward steps, longest run 76 —
   i.e. fixes interleaved a few seconds apart rather than 30-60 s apart), but the mechanism is the
   same. So 2 of Nathan's 3 user routes are affected; the write-side [ASSUMPTION] and Part C
   deserve more weight than "prevention, optional". The brief's recovery section, acceptance
   criteria and the QUESTIONS-FOR-NATHAN Q1 all target 3c34 only.
2. **Route 3c34 no longer exists on the phone.** Nathan's 09-04 notes: "Before the evening ride I
   deleted the previous WorkHome way from the ROUTES tab"; the 09-04 catalog/refs fixtures contain
   only `f6ca` and `281e`. The "set as reference on ride 3c34" recovery and Q1's "re-export ride
   3c34's GPX+" are only possible if the *ride file* survived the way deletion (plausible — rides
   are separate — but unverified here). The brief should retarget recovery to ride
   `20260904-214439-281e` / route WorkHomeWet and ask Q1 about BOTH rides (09-03 ~16:35-16:40 and
   09-04 ~19:5x).
3. **T1(b) import claim is wrong:** `tests/userrefs_suite.ts:15` imports only
   `collapseStationaryRuns, M_PER_DEG_LAT` from core — `meanOrigin` and `buildReference` are NOT
   imported. Execute must extend that import (trivial, but the brief says "already imported", which
   is a STOP trigger as written).
4. **T1 geometry description is off:** 240 fixes × 6 m on r = 600 m is a 137° arc (2.4 rad), not a
   quarter circle; arc/chord ≈ 1.28, not π/(2√2) = 1.11. The `< 1.7` assertion still holds and the
   harness-power numbers reproduce (my run of the brief's construction on the current builder:
   sorted 1,425.0 m / interleaved 8,804.6 m, ratio 6.18 — brief: 1,430.0 / 8,814.5 / 6.16). Fix
   the wording so Execute does not stop over "quarter-circle".
5. **`userRefs.ts` is not import-free of `storage/`:** L29 `import type { FsAdapter } from
   '../storage/fsAdapter.ts'` (type-only). The brief's "no storage imports today" is inaccurate;
   the instruction to inline the one-line sort in A3 is still the right call.
6. **Part C type sketch:** `data` is `T` (not optional) in `TaskManagerTaskBody`; the brief's
   `{ data?: ...; error: ... }` shape should become `TaskManager.TaskManagerTaskBody<{ locations:
   Location.LocationObject[] }>` — the brief already tells Execute to read the `.d.ts`, so this is
   informational.
7. **Not a disk reader, but worth one sentence:** the live engine is fed in delivery order inside
   the same handler loop (`location/index.ts` L256), so during the two scrambled rides the *live*
   engine also saw non-chronological fixes. Part A does not touch that; only Part C's per-batch sort
   does. Nathan should not expect A alone to explain/fix anything he saw live.
8. **A1 `deriveMeta` change is safe against the existing suite:** the only `endMs` assertions
   (`storage_suite.ts:84, :165, :186`) use in-order fixes where last-on-disk == latest.
9. Existing suite baseline on the mount: **468 tests: 465 pass, 0 fail, 3 skip.**

### Confidence
High on the root cause (stored line reproduced to the metre, origin identity proves same input set,
read path proven sort-free, builder code proven unchanged since the phone build). Medium on the
write-side mechanism (still an inference — no jsonl available; Part B is the right check). The
brief's numeric claims for 3c34/f6ca reproduce; the 281e finding is new evidence, not a contradiction.

---

## WP-D — `WP-D-gps-teleport-guard-hole.md`

**Verdict: PASS** (one presentational note, no defects).

### engine.ts integrity
- `git status` / `git diff --stat HEAD -- src/live/engine.ts core/src/live.ts`: **clean, nothing
  modified.** `cmp src/live/engine.ts safe_to_delete/engine.ts.plan_backup` → **IDENTICAL**
  (backup 21:16, 50,667 bytes). No leftover from the Plan agent's transient patch.
- `safe_to_delete/plan_probe_reacq.ts` (21:13), `plan_probe_reacq2.ts` (21:14), `plan_probe_syn.ts`
  (21:16) all exist; their contents match the brief's description (full-catalog old-vs-new adv
  table; the four synthetic scenarios with the same `lockXOnSynL` idiom the brief proposes).

### Anchors (all confirmed exact)
`engine.ts` L57-59 header principle; L127-153 doc comment (the paragraph to replace begins mid-L144
"Below that margin, a small re-acquisition hop can still slip" and ends L151 "not chased here.";
L152-153 kept); L154 `REACQ_JUMP_M = DEFAULT_LIVE_OPTIONS.windowFwd + 5`; L339 `onRoute: boolean`;
L429 `onRoute: false`; L502/L559/L591 the only other readers; L515-525 re-anchor path sets
`baseS = null`; L905 `const sBefore = c.proj.chainage;`, L906 update, L913-914 jump/discount, L916
adv, L917 `c.onRoute = fix.onRoute;` — **no write to `c.onRoute` between L905 and L917** (grep:
writes at 409, 502, 559, 591, 917 only). `core/src/live.ts` L44-47 options (`windowFwd 240`,
`lostBeforeReacq 5`, `reacqForwardM 400`, `vMaxReacq 15`), L80-121 `update()` — P1/P2 hold as
stated (chainage moves only on the two `onRoute: true` returns; `lost` is incremented before the
`>= lostBeforeReacq` check). `projection.ts:12` `CORRIDOR_M = 40`. `tests/live_suite.ts` L83-101
`advanceAt` with the L97 mirror line, L223 cycle-024 test, L252 `REACQ_JUMP_M > 240`, L801-826
`buildSyntheticRef`/`SYN_L`/`synPos`, L840-845 feed idiom; `LiveEngineState.fixesFed` (engine L302,
incremented at L473 before candidates are fed, so `steps[s.fixesFed - 1]` in the proposed helper
indexes the fix that caused the lock).

### Measurements re-run
- `plan_probe_reacq2.ts` on the current engine reproduces the brief's §2.4 table line for line
  (StationWorkAlt 65→0 ×4, StationHomePreferred 903→828, StationHomeWet 4553→4463, FoshHome
  4996→4911, EveningB 4524→4517 and 21→16); zero windowed rejoins in the corpus, as claimed.
- `plan_probe_syn.ts` on the current engine: **A 400, B 400, C 400, A2 700** (the "before" column).
- Hunk 1 applied to a **throwaway copy** of `app/` in the device home dir (the mount untouched):
  **A 600, B 400, C 400, A2 700** — the "after" column reproduces exactly. So the proposed test
  fails before and passes after, as the brief claims.
- Full existing suite on that patched copy (hunk 1 only, replica NOT yet updated): **468 tests: 465
  pass, 0 fail, 3 skip** — identical to the mount baseline. No existing lock position moves.
- Extra check (not in the brief): the new rule applied to Nathan's four real virgin-app rides
  (09-01 ×2, 09-03, 09-04) against his real refs (`f6ca`, `281e`): zero rejoin/re-acq events, `adv`
  and the fix index at which `adv ≥ 400` identical old vs new. Neutral on real data.

### Findings
1. **Hunk 2 join is fiddly but specified:** the replacement text's first line duplicates existing
   L143 ("the new chainage; it simply earns no lock evidence for ground it never"), so Execute must
   replace from L143 (or from the mid-L144 sentence start) through L151. The brief says to read
   L141-144 and make the join grammatical — adequate, but stating "replace L143-L151 inclusive"
   would remove the judgement call.
2. **Unquantified real-world cost (not a defect):** P3 rejoins (1-4 off-corridor fixes on the
   *correct* route, e.g. GPS noise at the 40 m edge, Nathan's "bridge with no connection") will now
   discount the metres covered while off-corridor, delaying lock proportionally. The corpus and
   Nathan's four real rides show zero such events, so the brief's claim stands; §3.1 could state the
   trade-off in one line so nobody reads a slightly later lock on a noisy ride as a regression.
3. The `[ASSUMPTION] none` statement is accurate: no new constant, no core change, `REACQ_JUMP_M`
   untouched, replica mirrors the engine exactly.

### Confidence
High — every anchor, every number and the before/after behaviour were reproduced with the real
engine (the "after" on an isolated copy), and the existing suite is green with the change.

---

## Summary

| brief | verdict | headline |
|---|---|---|
| WP-A | PASS WITH FINDINGS | Anchors exact, fix complete. Name the 3 extra `defaultMapRouteId` test consumers and the WP-C-era "blank-map regression" test so Execute does not stop on them; note the undrawable-ref edge case. |
| WP-B | PASS WITH FINDINGS | Root cause confirmed harder than the brief claims (origin identical to 0.0 m ⇒ same fix set, different order). **New:** route `281e` (09-04 evening, WorkHomeWet) is scrambled too (9.2 km for 5.9 km) and 3c34 has been deleted — retarget recovery/Q1 and upgrade Part C's priority. Fix T1's import + geometry wording. |
| WP-D | PASS | engine.ts unmodified (git clean, identical to backup); probes present and reproduce; after-numbers verified on a copy; existing suite green with hunk 1. |
