**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Review doc item:** qualifire-20260903 review, issue #3 ("work>>home route 20260903-182911-3c34: abnormal lines, gates bunched at the centre"). Size: **small-medium** — one ~6-line helper in `storage/jsonl.ts`, 5 mechanical call-site swaps, one ~12-line GPX+ diagnostic, one defensive ~15-line change in the location task handler (Part C, separable), ~4 new tests. No schema change, no migration, no rewrite of any ride file (D-023).
**Verified against the mount as read 2026-09-04 (`5ae4c30`, branch `virgin`). Every line number below was re-read by the Plan tier; if any anchor does not match on the day of execution, STOP (see "Stop-on-ambiguity").**

---

# WP-B (cycle 2) — Gates bunched / abnormal lines on route 3c34: the reference line was built from fixes in disk order, and disk order is not chronological

## What it is

Nathan's 2026-09-03 review, issue #3: the new work>>home route (`route:20260903-182911-3c34`, created from ride `20260903-182911-3c34` by the save-flow at STOP) draws "abnormal lines" in the ROUTES-tab map preview and its five gates look bunched near the centre. He calls it unusable and expects to delete it.

The gates are NOT misplaced relative to the reference line — `seedGateChainages` is correct (`app/src/store/gateSeeding.ts:42-70`; 0.99 x 13,957.856 = 13,818.28, the stored value, exact). The reference line itself is wrong: it is **13,957.856 m long for a ride whose recorded track is 5,757 m**. Gates at 25/50/75 % of a line that spends ~9 km of its 14 km zig-zagging back and forth over one ~700 m stretch of road all land on that stretch — which is exactly "bunched at the centre", and the zig-zag is the "abnormal lines".

**This IS a code defect, not a winding commute.** Root cause and the fix are below; nothing about Nathan's geography needs to be known or guessed.

## Investigation

All checks run on Nathan's PC against the mount (`$HOME/mnt/Qualifire`), using the app's own `core/` + `src/live/userRefs.ts` code under `node --experimental-strip-types` — i.e. the exact code that ran on the phone (the builder files `app/src/live/userRefs.ts`, `app/core/src/reference.ts`, `app/core/src/geo.ts` were last touched in `eb9c487`, 2026-09-03, at or before the phone build `f7d96f7`; only `app/src/store/wayFromRide.ts` changed afterwards, +242 lines, all additive — `git diff f7d96f7 HEAD --stat`).

Inputs: `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-1828.gpx` (the ride's GPX+ export: 1,008 trkpts, 1 preStart + 4 warmup flagged, 1,003 clean, 16:29:16Z -> 16:46:04Z, `relaunches count="0"`, `storageErrors count="0"`), `qualifire-refs-20260903.json` (the phone's `refs.user.json`, both routes), `qualifire-catalog-20260903.json`.

### 1. The raw recorded track is a normal 5.7 km commute

| quantity (1,003 clean fixes, GPX order = chronological) | value |
|---|---|
| sum of consecutive point-to-point distances | **5,757 m** |
| straight-line start -> end | 4,603 m |
| ratio | **1.25** |
| median step / max step | 6.3 m / 44 m (no step > 60 m) |
| median speed / median GPS accuracy | 22.8 km/h / 3.8 m (max 26.8 m) |
| stationary runs (collapseStationaryRuns, 15 m / 20 s) | 1 run, 54 fixes, 53 s (the 16:44:01-16:44:45 stop) |

No jitter, no jumps, no out-and-back. A 13.9 km path in 1,008 s would be a 49.7 km/h average.

### 2. The app's own pipeline, fed these fixes in chronological order, produces a healthy line

`parseGpx -> collapseStationaryRuns -> meanOrigin -> buildReference` (and equally `buildRefFromRideFixes` on the same fixes): raw cumdist 5,792 m -> after collapse 5,784 m -> after k=5 box smooth 5,724 m -> after 5 m resample **5,714.6 m, 1,145 points**. Ratio to Euclidean 1.24. So none of `collapseStationaryRuns` / smoothing / `resample` / `cumdist` inflates anything. The digest's jitter/threshold hypotheses are ruled out.

### 3. The line the phone actually stored is a different object

`refs.user.json` track `route:20260903-182911-3c34`: **2,819 points, 13,957.856 m**, Euclidean 4,601 m, ratio **3.03**, 20 direction reversals sharper than 135 deg, minimum consecutive-point spacing 0.43 m (a 5 m-resampled line only does that when the input polyline turns back on itself inside 5 m).

Projecting each stored point onto the healthy line (`nearestOnSegments`) and onto the nearest recorded fix:

| stored chainage | nearest recorded fix (median) | which fixes (elapsed since 16:28:50) |
|---|---|---|
| 0 - 1,750 m | 1.5 m away | t = 27 -> 350 s, monotonic — correct |
| ~2,000 - 7,000 m | **50-105 m away from ANY fix** | t = 360-460 s, visited back and forth ~8 times |
| 7,392 - 8,391 m | 1.7 m away | t = 489 -> 721 s, monotonic — correct |
| ~8,900 - 11,900 m | 30-105 m away | t = 437-680 s, back and forth |
| 12,369 - 13,958 m | 1.5 m away | t = 678 -> 1,028 s, monotonic — correct |

685 of 2,818 stored steps move *backwards* along the true route; the longest backward run is 249 points = 1,245 m. The stored `lat0/lon0` (= mean of the input points after collapse) is within 12 m of the mean of the correctly-ordered set — so the input to the builder was **the same ~1,003 fixes, in a different order** (mass duplication would have moved the mean by ~30 m per extra copy of that stretch; it did not).

### 4. Reproduction of the mechanism

Take the chronological fixes, split the ones in one window into k consecutive batches and emit those batches round-robin (fix 1 of batch A, fix 1 of batch B, fix 2 of A, ...), leave everything else in order, run the real `buildRefFromRideFixes`:

| permutation | built length |
|---|---|
| none (chronological) | 5,714.6 m |
| t in [350, 470) s, 2 batches interleaved | **11,610.9 m** (2,379 pts) |
| t in [350, 470) s, 3 batches | 10,950.8 m |
| t in [360, 460) s, 2 batches | 9,779.8 m |
| t in [350, 680) s, 2 batches | 42,343.7 m |

Two minutes of interleaved fixes are enough to double the line; the stored 13,958 m is one specific such permutation (the exact one is unknowable without the jsonl — it is not exportable today, see Part B). The k=5 box smoother in `buildReference` (`app/core/src/reference.ts:65-95`) averaging fixes that are 30-60 s apart is what puts the smoothed points 50-100 m off the road, and the residual alternation is what adds the distance — matching §3 exactly.

### 5. Why the GPX looks fine while the reference line does not

`app/src/storage/gpxExport.ts:35-38` and `gpxPlusExport.ts:495` **stable-sort the decoded fixes by `tUnixMs` before writing** — the F-2 "belt-and-braces" from the 2026-08-15 acceptance night (`tests/README.md:7,21`: "concurrent appendFix bursts ... landed in promise-resolution order (real ride 20260815-0024, 17-line scrambled block); storage now chains appends per ride and gpxExport stable-sorts by tUnixMs"). Every other consumer reads `decodeRideFile(text).fixes` in **file order** and never sorts:

- `app/src/store/wayFromRide.ts:43-51` `readRideFixes` -> `buildRefFromRideFixes` (`createWayFromDraft` :205-206, `promoteRideToReference` :96-97), `draftWayFromRide` :148-155 (track length + first/last fix = landmark positions), `RecordScreen.tsx:320` (writing-history replay), `RideDetailScreen.tsx:163` (the "true trace").
- `app/src/store/resultsStore.ts:436-441` backfill derivation: `t/lat/lon` arrays straight from file order into `deriveRideResult` (a non-monotonic `t`).
- `app/src/storage/jsonl.ts:85-94` `deriveMeta`: `startMs`/`endMs` = first/last fix in file order (feeds `endRide` and `listRides`).

So the exported GPX Nathan looks at is chronological, and the reference line built from the very same file is not.

### 6. Route f6ca is healthy — this is per-ride, not systemic

`route:20260901-091752-f6ca` (home>>work): 1,134 points, 5,661.6 m, Euclidean 4,572.6 m, ratio **1.24**, 0 reversals. Gates at 56.6 / 1,415 / 2,831 / 4,246 / 5,605 m are sane. The review-detailed doc's speculation that it "might have the same ~3x inflation" is wrong. Whatever scrambled ride 3c34's file did not happen (or not enough to matter) on 2026-09-01.

## Root cause

**Confirmed (read side, deterministic):** the reference-line builder, the way-creation draft, the ride trace, and the results backfill all consume ride fixes in **on-disk order**, and on-disk order is **not guaranteed chronological**. The F-2 serializer (`app/src/storage/core.ts:158-199`, "run strictly after the previous append for this ride") guarantees *file order == appendFix call order* — and the project's own tests pin exactly that — but call order is only chronological if no two producers ever interleave their calls. The F-2 belt-and-braces sort was applied to the two GPX exporters only; the reference builder (added later, OPEN-ITEMS item 3 / `fa0e3aa`) and the other readers never got it.

**[ASSUMPTION] (write side — the most likely producer of the interleaving on this ride; cannot be verified headless):** `app/src/location/index.ts:167-270` is the `TaskManager.defineTask` handler. It does `await ensureSession()` and then `for (const loc of data.locations) { await appendFix(...) ... }` (:192-215). Nothing prevents two invocations of the handler from running concurrently, and when Android delivers *batched* location arrays (screen off / pocket) back-to-back, invocation B's loop starts while invocation A's loop is still awaiting file appends; the F-2 serializer then faithfully writes A1, B1, A2, B2, ... — precisely the round-robin interleaving that reproduces the inflation in §4. `relaunches count="0"` on this ride rules out the F-2 relaunch race; batching is the remaining candidate. The two scrambled windows (t ~ 350-470 s and ~ 437-680 s) are consistent with two such bursts. Part B below adds the diagnostic that will prove or disprove this from the phone's own copy of the file.

## The fix

Three parts. A is the fix for the reported bug and must land. B is the diagnostic that makes the [ASSUMPTION] checkable on the phone (and lets Nathan's re-export of ride 3c34 confirm the scramble on disk — the F-2-fossil pattern). C is a defensive write-side change that is *not headless-testable* and must go in its own commit so it can be reverted alone.

### Part A — one chronological choke point, used by every reader

**A1. `app/src/storage/jsonl.ts`** — add, directly after `decodeRideFile` (ends :80) and before `deriveMeta` (:85):

```ts
/** The fixes in chronological (tUnixMs) order — a stable sort of a COPY.
 * decodeRideFile's own `fixes` stay in FILE order on purpose: that array is
 * the F-2 tests' oracle for "file order == call order", and the raw JSONL
 * is never rewritten (D-023). File order is NOT guaranteed chronological
 * (WP-B cycle 2, 2026-09-04: route 20260903-182911-3c34's reference line was
 * built from a scrambled block of fixes and came out 13.96 km for a 5.7 km
 * ride, gates bunched on the doubled-back stretch). Every consumer that
 * walks fixes as a path or a time series goes through this. */
export function chronologicalFixes<T extends { tUnixMs: number }>(fixes: readonly T[]): T[] {
  return [...fixes].sort((a, b) => a.tUnixMs - b.tUnixMs);
}
```

And change `deriveMeta` (:85-94) so `startMs`/`endMs` come from the chronological copy:

```ts
export function deriveMeta(decoded: DecodedRide, rideId: string): RideMeta {
  const n = decoded.fixes.length;
  const fallback = decoded.header?.startedAtMs ?? 0;
  const inOrder = chronologicalFixes(decoded.fixes);
  return {
    rideId: decoded.header?.rideId ?? rideId,
    startMs: n > 0 ? inOrder[0].tUnixMs : fallback,
    endMs: n > 0 ? inOrder[n - 1].tUnixMs : fallback,
    nFixes: n,
  };
}
```

Keep the existing doc comment on `deriveMeta`; add one line to it: "start/end are the earliest/latest fix on disk, not the first/last line (file order is not guaranteed chronological — see chronologicalFixes)".

**A2. `app/src/store/wayFromRide.ts:47`** — `return decodeRideFile(text).fixes;` becomes `return chronologicalFixes(decodeRideFile(text).fixes);`. Extend the import at :19 to `import { chronologicalFixes, decodeRideFile } from '../storage/jsonl.ts';`. Add to `readRideFixes`'s doc comment (:32-42): "Returned in chronological order (WP-B cycle 2) — disk order is not; every consumer of this (reference build, way draft, trace, replay) needs a path/time series."

**A3. `app/src/live/userRefs.ts:66`** — inside `buildRefFromRideFixes`, sort the flag-filtered fixes before building (the builder is an exported pure function and must defend itself, independent of who calls it):

```ts
  const used = [...fixes]
    .filter((f) => !f.preStart && !f.warmup)
    .sort((a, b) => a.tUnixMs - b.tUnixMs);
```

(`RefFixInput` already requires `tUnixMs`, :38-45. Do NOT import from `../storage/jsonl.ts` here — userRefs.ts is a `live/` module with no storage imports today; keep it that way, the one-liner is enough.) Add to the function's doc comment (:56-64): "Fixes are sorted by tUnixMs first — the on-disk order is not chronological in general (WP-B cycle 2)."

**A4. `app/src/store/resultsStore.ts:436-441`** — after `const decoded = decodeRideFile(text);` (:436) add `const inOrder = chronologicalFixes(decoded.fixes);` and use `inOrder` in place of `decoded.fixes` on :437 (`if (inOrder.length < 2) continue;`) and :439-441 (the three `.map`s). Extend the import at :46 to `import { chronologicalFixes, decodeRideFile } from '../storage/jsonl.ts';`.

**A5. `app/src/storage/gpxExport.ts:38` and `app/src/storage/gpxPlusExport.ts:495`** — replace the inline `[...decoded.fixes].sort((a, b) => a.tUnixMs - b.tUnixMs)` with `chronologicalFixes(decoded.fixes)`. gpxExport.ts currently imports only a type from `./types.ts` (:10); add `import { chronologicalFixes } from './jsonl.ts';` (no cycle: jsonl.ts imports nothing from gpxExport.ts). gpxPlusExport.ts: add the same import next to its `./gpxExport.ts` import at :43. Behaviour is byte-identical to today (same stable sort); this is only so there is one definition. Keep the F-2 comment at gpxExport.ts:35-37.

### Part B — GPX+ diagnostic: how scrambled was the file on disk

**`app/src/storage/gpxPlusExport.ts`** — `buildSessionBlock` (:203-205) currently receives the already-sorted `fixes`. Add a fourth parameter `fileOrder: readonly FixRecord[]` (the fixes as decoded, unsorted) and pass `decoded.fixes` at the call site (:535 — `buildSessionBlock(fixes, events, refFor)` becomes `buildSessionBlock(fixes, events, refFor, decoded.fixes)`). Inside `buildSessionBlock`, immediately after the `excludedFixes` block (:260-262) and BEFORE `if (events !== null) {` (:264) — so it is emitted whether or not a sidecar exists — add:

```ts
  // WP-B (cycle 2, 2026-09-04): how far the JSONL's line order departs from
  // chronological. The exporters sort (F-2 belt-and-braces) so the trkpts
  // above are always in time order; this line records what was on disk, so
  // a scrambled ride (route 20260903-182911-3c34's reference ride) can be
  // recognised from its export alone. outOfOrder = number of consecutive
  // line pairs whose time steps backwards; maxBackstepS = the largest such
  // step. Always emitted: "0" is a statement, absence would be ambiguity.
  let outOfOrder = 0;
  let maxBackstepMs = 0;
  for (let i = 1; i < fileOrder.length; i++) {
    const back = fileOrder[i - 1].tUnixMs - fileOrder[i].tUnixMs;
    if (back > 0) { outOfOrder += 1; if (back > maxBackstepMs) maxBackstepMs = back; }
  }
  lines.push(
    outOfOrder === 0
      ? `   <qf:fixOrder outOfOrder="0"/>`
      : `   <qf:fixOrder outOfOrder="${outOfOrder}" maxBackstepS="${num(maxBackstepMs / 1000)}"/>`,
  );
```

`num` is already imported at :43. The GPX+ "minus qf: lines equals plain GPX" test strips every `<qf:` line (`tests/gpxplus_suite.ts:38-52`), so the new line cannot break it. No existing test pins the whole session block (they all use `includes` on single lines — verified :262, :264, :280, :556, :615, :639).

### Part C — [UNVERIFIED ON DEVICE] serialize task invocations and sort each batch (separate commit)

**`app/src/location/index.ts:167-270`.** Lift the handler body into a module-level `async function handleLocationBatch({ data, error }: { data?: { locations: Location.LocationObject[] }; error: TaskManager.TaskManagerError | null })` — body unchanged except one line — and chain invocations:

```ts
// WP-B (cycle 2): invocations are chained. The storage layer keeps file
// order == call order (F-2), but two overlapping invocations — Android
// delivering batched location arrays back-to-back — interleave their
// per-fix appends (A1, B1, A2, B2 ...), and that is exactly what doubled
// route 20260903-182911-3c34's reference line. Chaining makes call order
// the delivery order; sorting each batch makes it chronological within one
// delivery. A rejected link never blocks the next (same shape as
// storage/core.ts's appendTail).
let taskTail: Promise<void> = Promise.resolve();
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, (args) => {
  const run = taskTail.then(() => handleLocationBatch(args), () => handleLocationBatch(args));
  taskTail = run.catch(() => {});
  return run;
});
```

The one changed line inside the body: `const locations = data?.locations ?? [];` (:192) becomes `const locations = [...(data?.locations ?? [])].sort((a, b) => a.timestamp - b.timestamp);`.

The exact `TaskManager.TaskManagerError` / args typing must be read from `node_modules/expo-task-manager`'s `.d.ts` on the day (`TaskManagerTaskBody`); if it does not line up with the shape above, STOP — do not invent a type. The headless suite cannot load expo, so this part has **no test**; it is verified on the phone via Part B (a ride recorded with C in place must export `<qf:fixOrder outOfOrder="0"/>`; a re-export of ride 3c34 — whose file is untouched — must NOT). Risk to state plainly to Nathan: chaining means one invocation that never resolves would block all later ones; `ensureSession` and `appendFix` already have that property individually, so this is not a new failure class, but it is a wider one.

### Recovery for the existing route (no code)

Nothing rewrites `refs.user.json` or the ride file. After Part A ships, the stored 3c34 line is still the scrambled one. Two ways to recover, either fine: (i) open ride `20260903-182911-3c34` on the RIDES tab and use **set as reference** (`promoteRideToReference`, WP-H) — it rebuilds the line from the now-sorted fixes, re-seeds the gates as version 2, clears and re-derives results; (ii) delete the route and re-create it from the ride detail. The brief recommends (i) because it also exercises the fix on the very file that broke.

## Open question for Nathan

Not blocking execution (the fix does not depend on the answer), but it decides whether Part C's [ASSUMPTION] is confirmed or something else is producing the scramble. Add to this cycle's `QUESTIONS-FOR-NATHAN.md`:

```
### Q — `WP-B-gate-placement-scale-bug.md` (route 3c34: scrambled fix order on disk)

The bunched gates on work>>home (route 20260903-182911-3c34) are not a gate bug: the
reference line the app built for it is 13.96 km long for a 5.76 km ride, because the ride's
fixes were read off the phone's disk in the order they were WRITTEN, and on that ride a
couple of minutes' worth of fixes were written interleaved (fix from 16:35, fix from 16:36,
next fix from 16:35, ...). Your GPX export looks fine only because the exporter sorts by time
first; the reference builder didn't. The code fix (WP-B cycle 2) sorts everywhere. To pin
down WHY the file was written interleaved — most likely Android delivering GPS in batches
while the phone was in your pocket, and two batches being written at once — two things:

1. Once the fix is on your phone: on the RIDES tab, re-export the GPX+ of ride
   20260903-182911-3c34 (the ride file itself is never rewritten, so it still carries the
   scramble) and drop it in data/activities/. The new `<qf:fixOrder outOfOrder="..."/>` line
   in its session block is the proof. Then use "set as reference" on that same ride to rebuild
   the route (gates re-seed, old results cleared) — or just delete it, your call.
2. During that ride, roughly 16:35-16:40, was the phone screen off / in a pocket or bag, or
   was it mounted with the RECORD screen visible? (If it was visible the batching story is
   weaker and we look elsewhere.)

**Answer:**
```

## Acceptance criteria

1. `buildRefFromRideFixes(fixes)` returns a bit-identical `RefLine` for any permutation of the same fixes (pinned by test T1).
2. `readRideFixes` returns fixes in non-decreasing `tUnixMs` for a scrambled-on-disk file, and the file is byte-untouched afterwards (T2).
3. `deriveMeta` on a scrambled file reports `startMs` = earliest and `endMs` = latest fix (T3).
4. A GPX+ export of a scrambled-on-disk ride contains `<qf:fixOrder outOfOrder="17" maxBackstepS="..."/>` (the count matching the scramble the test made) and an in-order ride contains exactly `<qf:fixOrder outOfOrder="0"/>`; the plain-GPX-equivalence test still passes (T4).
5. The results backfill of a scrambled copy of an in-order ride yields the same `RideResult` (same sectors/rawS/movingS) as the in-order original (T5).
6. `tsc --noEmit` clean; `tests/run.ts` zero FAIL; the two existing F-2 storage tests (`tests/storage_suite.ts:283`, `:334`) are unchanged and still pass — they read `decodeRideFile(...).fixes` as file order, which A1 preserves.
7. Part C: compiles; no test; its commit message says "UNVERIFIED ON DEVICE — see WP-B cycle 2 Part B for the on-phone check".
8. Nothing in `refs.user.json`, `catalog.user.json` or any `rides/*.jsonl` is rewritten by any of this.

## Verification

- `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0) and `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL), before and after.
- New tests:
  - **T1** `tests/userrefs_suite.ts` — "userRefs: buildRefFromRideFixes is order-independent (WP-B cycle 2 — scrambled fix order doubled route 3c34)". Build a synthetic 1 Hz ride that is NOT a straight line (a straight line is order-insensitive under smoothing — the test must have power): e.g. 240 fixes along a quarter-circle of radius 600 m about (50.85, 4.66), one fix per second at ~6 m/s (angle step = 6/600 rad). Build `sorted = buildRefFromRideFixes(fixes)`. Build `scrambled` from the same fixes with fixes 60..179 interleaved as two round-robin batches (60..119 and 120..179 alternating), rest in order. Assert (a) `scrambled.ref.length === sorted.ref.length` exactly and `rx/ry/ch` arrays are element-wise `===`; (b) harness power: the same interleaving fed through `collapseStationaryRuns -> meanOrigin -> buildReference` DIRECTLY (already imported in this suite, :15) gives a length > 1.5 x `sorted.ref.length` — i.e. the test would have failed before A3; (c) `sorted.ref.length / hypot(end - start)` < 1.7 (a quarter circle's arc/chord is pi/(2*sqrt2) = 1.11).
  - **T2** `tests/storage_suite.ts` — "storage: readRideFixes / chronologicalFixes — scrambled-on-disk ride comes back chronological, JSONL untouched (WP-B cycle 2)". Reuse the scramble construction of the test at :334-358 (header + 40 fixes + end, lines 16..32 shuffled with `rng(99)`), then `readRideFixes(rideId, fs)` (import from `../src/store/wayFromRide.ts` — note `tests/waycreation_suite.ts:555` already imports that module, so it loads headlessly) and assert non-decreasing `tUnixMs`, 40 fixes, each fix's lat/lon still paired with its own timestamp, and `fs.files.get(file) === scrambled`. Also assert `chronologicalFixes` is stable on equal timestamps (two fixes with the same `tUnixMs` keep their file order).
  - **T3** same suite, same scrambled file — `deriveMeta(decodeRideFile(scrambled), rideId)` gives `startMs === fixes[0].tUnixMs` and `endMs === fixes[39].tUnixMs`.
  - **T4** `tests/gpxplus_suite.ts` — "gpx+: WP-B cycle 2 — <qf:fixOrder> counts backward time steps in FILE order; 0 on a clean ride". Use `makeEnv()` (:24) and the same 17-line shuffle; export via `storage.exportGpxPlus(rideId)` (`src/storage/core.ts:36`, implemented near :285-292); compute the expected `outOfOrder` count from the shuffled lines yourself (parse each line's `tUnixMs`) rather than hard-coding 17 — the shuffle's backward-step count is whatever `rng(99)` produces. Assert the clean ride's export contains `<qf:fixOrder outOfOrder="0"/>`.
  - **T5** `tests/resultsstore_suite.ts` — the existing test at :217 ("backfill derives a result matching a direct deriveRideResult call on the same points", ride `backfillride1`) writes a ride file through an fs adapter and asserts on the derived result. Add a twin directly after it that shuffles a contiguous block of ~17 fix lines of that same file (the `rng`-seeded shuffle shape from `storage_suite.ts:345-356`) before backfill and asserts the derived `RideResult` is deep-equal to the in-order one. If that test's structure does not let you get at the file text between write and backfill, stop and report rather than restructuring it.
- On the phone (Nathan, after the build): re-export ride 3c34's GPX+ and confirm `outOfOrder` > 0 there; run "set as reference" on it and confirm the ROUTES-tab preview draws one clean line with the finish gate near Home; record one new ride and confirm its export says `outOfOrder="0"` (Part C's only check).

## Stop-on-ambiguity

Standard clause: any anchor above (file, line, quoted code) that does not match the mount on the day, any type that does not line up, any existing test that starts failing for a reason not explained here — stop, report the mismatch verbatim, do not guess, do not resolve it from the coordinator's chat; it goes to a fresh Fable.

Flagged by the Plan tier:

- **Part C's expo typings.** The exact parameter type of a `defineTask` handler and whether returning a promise from it is honoured on Android are to be read from the installed `expo-task-manager` `.d.ts`, not assumed. If the installed version's handler signature differs from `({ data, error })`, stop.
- **Part C is [UNVERIFIED ON DEVICE] by construction** — it can only be checked by Nathan's next ride (Part B). If the coordinator wants A+B only, that is a complete fix for the reported bug; C is prevention.
- **`deriveMeta` change (A1)** feeds `endRide`'s index entry and `listRides`. If any existing test asserts `endMs` equals the *last-written* fix on a deliberately scrambled file, stop and report — I found none, but the storage suite has 15 tests and I read only the F-2 ones in full.
- **T1's harness-power assertion (b)** — the Plan tier ran exactly this construction (240 fixes, r = 600 m, fixes 60..179 interleaved as two batches) through the CURRENT (pre-fix) `buildRefFromRideFixes`: sorted 1,430.0 m, interleaved 8,814.5 m, ratio 6.16. If your numbers differ materially, stop and report them; do not loosen the 1.5x threshold. A test that cannot fail on the pre-fix code is not a regression lock.
- **The write-side cause is an [ASSUMPTION].** What is confirmed is: same fixes, non-chronological order, on this one ride, with no relaunch. Any statement to Nathan must keep that distinction (§Root cause wording).

---
## Inspect findings (2026-09-04, fresh-context Fable pass) — READ BEFORE EXECUTING, changes the priority target

**Verdict: PASS WITH FINDINGS.** The core root-cause claim is not just confirmed but confirmed MORE strongly than this brief originally stated: the stored 3c34 reference line's `lat0`/`lon0` origin matches a chronologically-rebuilt origin from the same fix set to within 0.0 m — proof the phone's builder received the identical multiset of fixes, just permuted. The read path is confirmed sort-free; `buildReference`'s own code is confirmed unchanged since the phone's build. The T1 harness numbers reproduce exactly (1,425 → 8,805 m, ratio 6.18).

**Important correction — retarget the priority example and the QUESTIONS-FOR-NATHAN.md question:**

Route `20260903-182911-3c34` (the route this brief's investigation and its "Recovery for the existing route" section are built around) **has since been deleted from Nathan's phone** — Nathan's own 2026-09-04 note (`qualifire-20260904-notes.md`) says he deleted the WorkHome way from ROUTES before his evening ride. There is nothing left on-device to recover for 3c34 specifically; its numbers stay useful as the confirmed diagnostic example, but it is no longer the live target for the "re-export and check `<qf:fixOrder>`" recovery step.

**A second, currently-live route hit the exact same bug**: `qualifire-catalog-20260904.json`/`qualifire-refs-20260904.json` (in `data/activities/TEST in virgin-app rides/qualifire-20260904/`, Nathan's 2026-09-04 evening ride, the new "WorkHomeWet" route he created after re-picking WorkHome and adding a "Wet" specification) shows the same scrambled-fix-order pattern: a stored reference length of **9,215 m for what should be a ~5,918 m ride**, with 40 chronological reversals detected in the underlying fix order (vs. 3c34's 20). **This route (call it `281e` per its short id, or look it up by the "WorkHomeWet" label in the 2026-09-04 catalog) is the one that still exists on the phone and should be the actual target once WP-B's fix lands** — both for the `<qf:fixOrder>` re-export verification step and for the "set as reference" recovery action.

**Action needed (folded into this cycle's bookkeeping, not a code change):** `QUESTIONS-FOR-NATHAN.md`'s Q1 (drafted from this brief) has been updated by the coordinator to reference route 281e/WorkHomeWet instead of 3c34 — see that file. If executing this brief, re-derive 281e's exact route id from the live catalog on Nathan's phone at execution time (catalogs are per-install-state and may have changed further since this digest) rather than trusting the id above blindly.

**Minor corrections, no action needed:** T1's setup comment describing `meanOrigin`/`buildReference` as "already imported" in `userrefs_suite.ts` is not accurate — they are not pre-imported; and the arc this brief calls a "quarter-circle" (arc-chord ratio 1.11) is actually a ~137° arc (ratio 1.28) — the brief's own `< 1.7` plausibility bound still holds either way, so this doesn't change the fix or its verification, just a description to fix if anyone edits T1's narration.

---
## Update 2026-09-05 — Nathan's answer to Q1

`QUESTIONS-FOR-NATHAN.md` Q1: Nathan will wait for this fix to land before re-exporting the
WorkHomeWet ride's GPX+ (correct — the `<qf:fixOrder>` diagnostic line this brief adds won't
exist until then). He's not certain the phone screen stayed on throughout the ride, but
raises a plausible additional contributing scenario: **switching between apps during the
ride** (backgrounding this app) could plausibly correlate with Android delivering GPS fixes
in batches that then get written interleaved. His own framing: "in any cases it should be
robust to these actions" — i.e. regardless of root cause (screen-off, app-switch, or
something else), the sort-everywhere fix in this brief should make the app correct either
way, which matches this brief's design (fixing the READ side, not trying to prevent whatever
causes the WRITE-side scramble in the first place). No change to the fix itself — this is
recorded for context on Part C's `[ASSUMPTION]` (unverified root cause of the write-order
scramble) and to close the loop on the diagnostic step once Nathan re-exports post-fix.
