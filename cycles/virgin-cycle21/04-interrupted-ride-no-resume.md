# 04 — An interrupted ride is never resumed and never scored: it is saved as a free activity

**Source: Nathan, 2026-10-04.** Catastrophes (app process killed mid-ride, phone reset, battery dead)
"must NOT be resumed and NOT rescored. No resume, no rescoring. The best we can do is save it as a free
ride, or at least the portion of the ride that was properly recorded. The user can always delete it
himself." This replaces brief 02 step A's relaunch re-arm (pick restored into the engine) and fixes the
inspector's MAJOR (INSPECTION.md: relaunch recovery loses the route line) by deleting the path that had
it. It also folds in the inspector's MINOR clean-ups. Written by the Plan tier after reading the code
(2026-10-04). Nothing here is executed yet.

**Tier:** Execute = Sonnet, alone. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not found,
any test failing for a reason this brief does not name, any extra tsc error -> stop and report verbatim.
Never rule yourself. **Override of EXECUTOR-RULES for this brief only (coordinator-authorised):** you
MAY edit `cycles/virgin-cycle21/OPEN-ITEMS.md`, `README.md` and `COMMANDS.md`, exactly as step 9 says.

## 0. What the code does today (read, do not change yet)

- **On disk during a ride:** (1) the raw fixes, appended one by one by the location task
  (`appendFix` in `location/index.ts` task handler ~228-245) to `<rideId>.jsonl` — the ride itself
  (D-023); (2) the GPX+ sidecar events (`appendRideEvent`: meta, button, pick, gate, relaunch,
  wayMatchDiagnostic …); (3) the marker `qualifire-active-ride.json` (`location/session.ts`,
  `ActiveSession`: rideId, startedAtMs, mode, wayIds, sportId, lastAliveAtMs heartbeat, pickId since
  brief 02). Nothing derived (sectors, lap) is persisted until `onEnd` -> `rememberRide`.
  An interrupted ride therefore always leaves a readable raw file plus the marker; `endRide(rideId)`
  seals it and derives `{nFixes, startMs, endMs}` from the fixes actually written
  (`storage/core.ts` ~201-233, `jsonl.ts deriveMeta`: endMs = last fix time).
- **Relaunch flow today:** a fresh JS launch (process died; the OS restarted the sticky foreground
  service headlessly, or the rider reopened the app) calls `ensureSession()` (`location/index.ts`
  ~161-197) from the task handler or from RecordScreen's `getRecoveryState()`. On the first disk
  restore it sets `freshLaunchRestore`, logs a `relaunch` event (with `downS`) and **re-arms the engine
  with the pick** (`liveEngine.start({ pickId: session.pickId ?? null, wayIds: … })` ~192). The task
  handler then keeps appending fixes and feeding the engine = the ride is resumed and rescored.
  RecordScreen's mount effect (~443-517) has two branches: `if (rec.tracking) {` (service running ->
  `setSession`, trail replay = resume; `rideWayHint` is never restored = the MAJOR) and `} else {`
  (service dead -> virgin-cycle20 08/12 silent finaliser: `whenStoresReady()` -> `stopTracking()` ->
  `markRideFree(...)` -> `setLastSummary(sum)`, "Activity saved · mm:ss" line; `endRide: unknown`
  -> `dropStaleSession()`).
- **`getRecoveryState().restoration`** (~682-723) already tells the two cases apart: `'relaunch'` =
  this JS launch restored the marker from disk (a real process death), `'remount'` = the process and
  module state stayed alive and only the React tree remounted (e.g. activity recreated after a
  swipe-away while the foreground service kept the process alive). A remount loses nothing: the
  engine, session and fix feed never stopped.
- **Free activity today:** the dead-service branch above IS the free-save path: `stopTracking()`
  (finalize, `endRide`, clear marker, engine stop) + `markRideFree(rideId, startedAtMs, durationS,
  sportId)` (`store/freeRides.ts` ~112). No result is stored (`rememberRide` never runs), and the
  free mark keeps ACTIVITIES' backfill (`ui/rideHomes.ts`) from matching it to a way. No reference,
  no sectors, no selfs, no scoring — exactly Nathan's rule. **So no new machinery is needed**; the
  fallback (leave the raw file, clear the marker) is NOT used.

## Scope / non-scope

IN: `app/src/location/index.ts`, `app/src/location/session.ts` (comment only), `app/src/ui/RecordScreen.tsx`,
`app/src/ui/recordFlow.ts` (two pure helpers), `app/src/live/engine.ts` (comment + dead field),
`app/src/ui/wayMapView.tsx` (comment only), `app/tests/ui-strings.allow.json` (append ONE entry),
tests `recordflow_suite.ts`, `session_suite.ts`, `bootstrap_suite.ts`, `live_suite.ts` (one title),
cycle docs per step 9.
OUT: `storage/*` (formats unchanged; `relaunch`/`remount` events still written), `core/`, the engine's
behaviour, `sessionMarker.ts` logic, GPX+ export, ACTIVITIES/ride detail screens, native code. Do not
add a new RideEvent kind.

## Target invariants

1. A fresh JS launch that restores a marker from disk **never** calls `liveEngine.start` for it, and the
   task handler **never** appends or feeds a fix for that restored ride: it stops the location updates
   (and the notification ticker) and returns. The only `liveEngine.start(` left in `location/index.ts`
   is the one in `startTracking`.
2. On RecordScreen mount, `rec.restoration === 'remount' && rec.tracking` is the ONLY case that keeps
   the ride running (nothing was interrupted); it now also restores `rideWayHint` from the session's
   pick (fixes the MAJOR for the remount path). Every other recovered marker (`'relaunch'`, or a dead
   service) goes through the interrupted path.
3. Interrupted path: `whenStoresReady()` -> `stopTracking()` -> if `sum.nFixes < 30` delete the ride
   (nothing worth keeping) and show nothing; else `markRideFree(...)`, `setLastSummary(sum)` and flash
   **`Interrupted · saved as free activity`** once in the yellow RECORD button's sub-label (5 s hold).
   No result is stored, no draft/naming card, no reveal.
4. A ride started later in the same JS launch is unaffected (the interrupted check is by rideId).

## Steps (anchors by quoted content; line numbers are current-tree approximations)

**Pre-flight.** `GIT_OPTIONAL_LOCKS=0 git status --short` (expect cycle 20/21 files modified, uncommitted;
record it). Baseline: `cd app && node --experimental-strip-types tests/run.ts` -> expect **844 tests / 841
pass / 0 fail / 3 skip**; `./node_modules/.bin/tsc --noEmit` -> exit 0 (tests ~30 s, tsc ~60 s; run tsc in
the background to a file if near the 180 s limit: `(./node_modules/.bin/tsc --noEmit > /tmp/tsc04.txt 2>&1;
echo EXIT $? >> /tmp/tsc04.txt) &` then poll). If the baseline differs, record it and continue only if
0 fail and tsc 0 (the deltas below are relative).

**Step 1 — tests first (failed-before).** Add the tests of step 8 now, before any source edit; run
`tests/run.ts` and record that they fail (a module load error naming `wayHintForPick` /
`interruptedRideAction`, or the new asserts failing, both count as failed-before). Then do steps 2-7.

**Step 2 — `location/index.ts`: no re-arm, no resume.**
a. Next to `let engineArmedThisLaunch = false;` (~93) add
   ```ts
   // virgin-cycle21 04 (Nathan 2026-10-04): the ride a fresh JS launch restored from disk.
   // It was interrupted (the process died) and is never resumed: no engine re-arm, no fix
   // appended or fed; RecordScreen saves what was recorded as a free activity.
   let interruptedRideId: string | null = null;
   ```
b. In `ensureSession()` (~161-197), inside `if (session && !engineArmedThisLaunch) {`: keep
   `engineArmedThisLaunch = true;`, `freshLaunchRestore = true;`, the downS computation and the
   `logEvent(session.rideId, { kind: 'relaunch', … })`. **Delete** the comment
   "virgin-cycle21: restore the ride's START pick …" and the line
   `liveEngine.start({ pickId: session.pickId ?? null, wayIds: session.wayIds ?? null });`
   and put in its place `interruptedRideId = session.rideId;`. Rewrite the block comment above
   (`// WP-B fix B1 (second pass): a fresh JS launch's liveEngine singleton is …`) to say: a fresh
   launch that finds a marker is an interrupted ride (virgin-cycle21 04); it is marked here, exactly
   once per launch whichever caller restores it first, and is never re-armed; the engine stays idle.
   Leave the `engineArmedThisLaunch` variable name and its long doc comment, but replace that doc
   comment's last two sentences ("Living inside ensureSession() itself means … restores the session
   first.") with "Since virgin-cycle21 04 it only guards the one-time relaunch bookkeeping (event +
   interruptedRideId); the engine is never re-armed."
c. Task handler (~216-227): right after the existing `if (!s) { … return; }` block and BEFORE
   `const locations = data?.locations ?? [];` insert
   ```ts
   if (s.rideId === interruptedRideId) {
     // virgin-cycle21 04: an interrupted ride is never resumed — stop the service
     // (the marker stays on disk; RecordScreen files the recorded part as a free
     // activity on the next mount) and drop this batch unrecorded.
     stopRideNotification();
     try {
       await Location.stopLocationUpdatesAsync(LOCATION_TASK);
     } catch {
       /* already stopped */
     }
     return;
   }
   ```
   Update the comment above `liveEngine.feed(` (~286-290, "On a headless relaunch mid-ride the engine
   is explicitly re-armed … honest, D-016(b)") to: "A ride restored by a fresh launch never reaches
   here (virgin-cycle21 04: interrupted rides are not resumed)."
d. `stopTracking()` and `dropStaleSession()`: add `interruptedRideId = null;` next to their
   `session = null;`. In `startTracking` nothing changes (a new ride has a new rideId).
e. `getRecoveryState` doc comment (~682-699): replace the two bullets "tracking === true → … resume
   the recording screen" / "tracking === false → … offer to finalise" with: "'remount' && tracking →
   the process never died; RecordScreen keeps the ride running. Anything else (a 'relaunch', or the
   service died) is an interrupted ride: RecordScreen saves the recorded part as a free activity
   (virgin-cycle21 04, Nathan 2026-10-04: no resume, no rescoring)." Keep the P5 paragraph.
f. `stopTracking` comment (~558-561) "(e.g. the relaunch-recovery "Save ride" path)" -> "(e.g.
   RecordScreen's interrupted-ride save)".

**Step 3 — `location/session.ts` (comment only).** `pickId` doc comment (~44-47): replace with
"virgin-cycle21: the START pick (a TrackSpec id). Read only by a UI remount of a still-running ride
(RecordScreen restores the map's route line from it). Since virgin-cycle21 04 it is NEVER used to
re-arm the engine after a relaunch: an interrupted ride is not resumed. null = no pick; absent in a
pre-cycle-21 marker." Do not change `ActiveSession`, `sessionMarker.ts` or `session_suite`'s existing test.

**Step 4 — `recordFlow.ts`: two pure helpers** (append after `liveMapOverlayFor`, ~88):
```ts
/** virgin-cycle21 04: the running map's route line after a UI remount of a still-running
 * ride (RecordScreen state is gone, the engine is not). The pick is a TrackSpec/way id;
 * the map wants that way's refLineId (as rideWayHint does at START). Unknown/absent -> null. */
export function wayHintForPick(
  ways: readonly { id: string; refLineId: string }[], pickId: string | null | undefined,
): string | null {
  if (pickId === null || pickId === undefined) return null;
  return ways.find((w) => w.id === pickId)?.refLineId ?? null;
}

/** virgin-cycle21 04 (Nathan 2026-10-04): an interrupted ride is never resumed or scored.
 * What was recorded is saved as a free activity, unless it is too short to mean anything
 * (under INTERRUPTED_MIN_FIXES raw fixes, ~30 s at 1 Hz): then it is discarded. */
export const INTERRUPTED_MIN_FIXES = 30;
export function interruptedRideAction(nFixes: number): 'free' | 'discard' {
  return nFixes >= INTERRUPTED_MIN_FIXES ? 'free' : 'discard';
}
```

**Step 5 — `RecordScreen.tsx`: the recovery effect (~443-517).**
a. Import: add `interruptedRideAction` and `wayHintForPick` to the existing
   `import { effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode,
   recordPressAction, type RecordPhase } from './recordFlow';` (keep alphabetical-ish order).
   `deleteRide` (`'../storage'`) and `currentCatalog` (`'../store/catalogStore'`) are already imported.
b. Constants: after `const NO_SPORT_FLASH_HOLD_MS = 1000;` (~112) add
   ```ts
   /** virgin-cycle21 04 (Nathan 2026-10-04): the one trace of an interrupted ride (app killed,
    * phone reset, battery dead) — never resumed, never scored, filed free. Flashed once in the
    * RECORD sub-label on the mount that saved it. */
   const INTERRUPTED_MSG = 'Interrupted · saved as free activity';
   const INTERRUPTED_FLASH_HOLD_MS = 5000;
   ```
c. `// Relaunch recovery: ride marker on disk from a previous launch?` -> `// Recovery on mount: a ride
   marker exists. Only a UI remount of a still-running ride continues; anything else is an
   interrupted ride (virgin-cycle21 04).`
d. `if (rec.tracking) {` -> `if (rec.tracking && rec.restoration === 'remount') {`. Replace its first
   comment ("Service survived; keep recording, resume the UI. Banner kind comes …") with "The process
   never died (UI remount only): nothing was interrupted, the ride keeps running. RecordScreen state
   is fresh, so the route line is restored from the session's pick (virgin-cycle21 04; the old
   relaunch path lost it — INSPECTION MAJOR)." After `setSession(rec.session);` add
   `setRideWayHint(wayHintForPick(currentCatalog().ways, rec.session.pickId ?? null));`.
   Keep the trail replay unchanged.
e. The `} else {` branch: replace its leading comment ("virgin-cycle20 brief 08 (Nathan, clutter
   review Q2): no dialog, no text. The service died …") with: "virgin-cycle21 04 (Nathan 2026-10-04):
   an interrupted ride (the process died — app killed, phone reset, battery dead — or the service
   died) is never resumed and never scored. What was recorded is finalised and FILED FREE (no result,
   the free mark keeps ACTIVITIES' backfill from matching it to a way); under INTERRUPTED_MIN_FIXES
   it is discarded. One line flashes in the RECORD sub-label. A marker whose ride file is gone is
   dropped; any other failure leaves it for the next launch." Keep the brief-12 comment about
   `whenStoresReady`. Then replace
   ```ts
          const sum = await stopTracking();
          if (sum) {
            markRideFree(
   ```
   …through `setLastSummary(sum);` with exactly:
   ```ts
          const sum = await stopTracking();
          if (sum && interruptedRideAction(sum.nFixes) === 'discard') {
            // Too short to be an activity: nothing kept, nothing said.
            try {
              await deleteRide(sum.rideId);
            } catch {
              // Could not delete: file it free so it can never be matched to a way.
              markRideFree(sum.rideId, rec.session.startedAtMs, Math.max(0, (sum.endMs - sum.startMs) / 1000),
                effectiveRideSportId(rec.session.sportId, currentSports()));
            }
            setLastSummary(null);
            return;
          }
          if (sum) {
            markRideFree(
              sum.rideId,
              rec.session.startedAtMs,
              Math.max(0, (sum.endMs - sum.startMs) / 1000),
              effectiveRideSportId(rec.session.sportId, currentSports()),
            );
            flashSub(INTERRUPTED_MSG, INTERRUPTED_FLASH_HOLD_MS);
          }
          setLastSummary(sum);
   ```
   (`flashSub` is declared later in the component; it is only called after mount, inside the async
   effect, so this is legal — if tsc reports TS2448/2454 on it, STOP.) The `catch (e)` block stays.
f. Comment `// session.wayIds honest for a sport-scoped re-arm too.` (~682) -> `// session.wayIds honest.`
   (the preceding comment line stays).

**Step 6 — stale lock-era comments (comment-only, no logic).** RecordScreen.tsx:
- ~248-250 "The §8a route pick is a HARD lock (Nathan 2026-08-29): the picked route is the only one this
  ride can ever score against" -> "The §8a pick is the ride's one reference from START (virgin-cycle21):
  the picked way is the only one this ride can ever score against".
- ~296-298 "A hard lock (Nathan 2026-08-29): the engine scores this route or nothing" -> "The ride's one
  reference (virgin-cycle21): the engine scores this way or nothing".
- ~300 "The pick frozen at START — the pre-lock candidate for the LIVE map." -> "The pick frozen at
  START — the LIVE map's route line (virgin-cycle21: the only one it ever draws)."
- ~705-707 "a still-soft or never-locked ride otherwise misses the finalize() recovery that …" -> "finalize()
  unmatches a pick that never fired a gate (virgin-cycle21); it must run before rememberRide, which
  reads the CURRENT state, not what stopTracking returns."
- ~721-723 "… when nothing locked." -> "… when the ride has no reference."
- ~753-756 "nothing locked AND nothing to offer … A locked ride already has a stored result" -> "no
  reference AND nothing to offer … A ride with a reference already has a stored result".
- ~778-779 `("frozen at START", "the pre-lock candidate for the LIVE map")` -> `("frozen at START", "the
  LIVE map's route line")`.
- ~1060-1062 "Colour comes from the ghost history for the LOCKED route only: before the lock there is
  nothing honest to compare against" -> "Colour comes from the ghost history of the ride's reference
  (the START pick) only: with no reference there is nothing honest to compare against".
- While there, ~1083 "(sectorValues on the LOCKED track, [] before the lock — D-025)" -> "(sectorValues
  on the reference, [] without one — D-025)".
wayMapView.tsx ~697-698 "(route source is conditional and mounts later or in the same render — either
way above this)" -> "(every later source, route included, is always mounted after it — virgin-cycle21 03)".
After the edits: `grep -n -i "lock" app/src/ui/RecordScreen.tsx` — remaining hits must only be about the
phone's lock screen, `syncShowWhenLocked`/showWhenLocked, `BackHandler`, or quoted history; report
the list. Anything else describing route locking as current behaviour: fix it the same way, or STOP if
it is code, not a comment.

**Step 7 — `engine.ts`: dead `ended` + feed comment.** Verify with
`grep -n "ended" app/src/live/engine.ts` that `ended` is only declared (~257-258, with its doc comment),
reset in `start()` (~274) and set in `finalize()` (~396), and
`grep -rn "\.ended\b" app/src app/tests --include=*.ts --include=*.tsx` shows no read of the engine field
(hits on other objects, e.g. `decoded.end`, are not reads of it; if any read of `LiveEngine.ended`
exists, keep the field and say so). If truly unread, delete those four lines (doc comment, declaration,
`this.ended = false;`, `this.ended = true;`). Update `feed()`'s comment (~327-329) "Headless relaunch
mid-ride … location/index.ts restores the pick itself when it re-arms the engine" -> "Defensive: a feed
with no start() (should not happen since virgin-cycle21 04 — an interrupted ride is never fed)
auto-starts with NO options = no reference." Engine header line ~24 is fine.

**Step 8 — tests** (written in step 1).
- `recordflow_suite.ts` (+3):
  - `virgin-cycle21 04: wayHintForPick maps the pick to its refLineId; null/undefined/unknown -> null`
    (ways `[{id:'A',refLineId:'refA'},{id:'B',refLineId:'B'}]`: 'A'->'refA', 'B'->'B', null, undefined,
    'Z' -> null).
  - `virgin-cycle21 04: interruptedRideAction discards under 30 fixes, files free from 30`
    (INTERRUPTED_MIN_FIXES === 30; 0 and 29 -> 'discard'; 30 and 5000 -> 'free').
  - `virgin-cycle21 04: RecordScreen only continues a remounted live ride; every other recovery is saved free and flashed`
    — source check on RecordScreen.tsx (read like the suite's other source checks): contains
    `if (rec.tracking && rec.restoration === 'remount') {` and NOT `if (rec.tracking) {`; the slice
    from that line to `recoveryAutoSaveStarted = true;` contains
    `setRideWayHint(wayHintForPick(currentCatalog().ways, rec.session.pickId ?? null));`; the slice from
    `recoveryAutoSaveStarted = true;` to the next `catch (e)` contains, in this order,
    `await stopTracking();`, `interruptedRideAction(sum.nFixes) === 'discard'`, `await deleteRide(sum.rideId);`,
    `markRideFree(\n`, `flashSub(INTERRUPTED_MSG, INTERRUPTED_FLASH_HOLD_MS);`; and the file contains
    `const INTERRUPTED_MSG = 'Interrupted · saved as free activity';`.
- `session_suite.ts` (+1): `virgin-cycle21 04: a fresh-launch restore never re-arms the engine and the task drops an interrupted ride's fixes`
  — source check on `src/location/index.ts` (add `node:fs`/`node:path` imports and `TESTS_DIR` from
  `./lib.ts` as other suites do): `(src.match(/liveEngine\.start\(/g) ?? []).length === 1`; the slice
  `async function ensureSession` .. `TaskManager.defineTask` contains `interruptedRideId = session.rideId;`
  and not `liveEngine.start(`; in the slice `TaskManager.defineTask` .. `// Permissions`, the index of
  `if (s.rideId === interruptedRideId) {` is > 0 and < the index of `await appendFix(`, and the 400 chars
  after it contain `Location.stopLocationUpdatesAsync(LOCATION_TASK)` and `return;`; the stopTracking
  body (`export async function stopTracking(` .. `export async function dropStaleSession`) contains
  `interruptedRideId = null;`.
- `bootstrap_suite.ts` test `bootstrap: RecordScreen's relaunch recovery awaits the gate before
  stopTracking()/markRideFree()` (~52-70): change ONLY the anchor `src.indexOf('if (rec.tracking) {')`
  to `src.indexOf("if (rec.tracking && rec.restoration === 'remount') {")` and its message
  'the service-survived branch …' -> 'the remount branch resumes the UI at once, ungated'. Its other
  anchors must still hold unchanged (the order await gate -> stopTracking -> markRideFree; exactly one
  `whenStoresReady()`). If any other assert in it fails, STOP.
- `live_suite.ts` ~185: rename the title `live: mid-ride JS relaunch with the pick restored — sectors
  behind missed, sectors ahead at full parity` to `live: engine started mid-ride on a pick (partial
  buffer) — sectors behind missed, sectors ahead at full parity` (it pins engine parity, not product
  behaviour; the app no longer restarts the engine mid-ride). Body unchanged.
- **No test is deleted.** Brief 02's `virgin-cycle21 02: session marker round-trips pickId …` stays
  valid (pickId is still written and read; only the re-arm is gone). `L8 idle auto-start` stays (engine
  defensive behaviour).
- `ui-strings.allow.json`: **append** at the end of `entries` (never regenerate, never reorder):
  ```json
  {
    "file": "src/ui/RecordScreen.tsx",
    "kind": "literal",
    "text": "Interrupted · saved as free activity",
    "reason": "virgin-cycle21 04: only trace of a killed ride (Nathan 2026-10-04), one flash in the RECORD sub-label",
    "since": "2026-10-04",
    "by": "virgin-cycle21 04"
  }
  ```
  (36 chars <= 40, no `long`; not an alert; no em dash; flash, not a banner.) If the ui-strings suite
  reports this entry STALE or reports the string UNLISTED under another `kind`, STOP and report the
  suite's exact line — do not change the kind yourself.

**Step 9 — cycle docs** (dated "2026-10-04, brief 04").
- `OPEN-ITEMS.md`: decision 3 -> "~~Crash recovery keeps the pick~~ superseded by brief 04 (Nathan
  2026-10-04): an interrupted ride is never resumed or rescored; it is saved as a free activity (under
  30 fixes: discarded). `pickId` stays in the marker only for a UI remount's route line." Add under
  Decisions: "9. Tests retired by brief 01 without a log (inspector minor): `live: late anchor …` and
  `live cycle20-06 E5 …` — both needed a re-seed after a gate had fired, which invariant 6 now forbids
  (L6 pins the new rule). Corrected brief 01-03 counts: 22 tests deleted (20 live_suite, 1
  live_colour, 1 recordflow `a lock outranks the pick hint`), 14 added; 852 - 22 + 14 = 844." and the
  brief-04 decisions from the list at the end of this brief, numbered on.
- `COMMANDS.md` checklist item 3 -> "**Interrupted ride (optional):** during a picked ride, force-stop
  Qualifire (Android Settings > Apps > Qualifire > Force stop) after > 1 min of riding. Reopen the app:
  the RECORD button's sub-label flashes "Interrupted · saved as free activity"; ACTIVITIES shows the ride
  up to the force-stop, filed as a free activity, no times; delete it there if you want. Under ~30 s of
  riding nothing is kept. A plain swipe-away may keep recording (the process can stay alive): if the
  ride is still running when you reopen, the picked way's line must be on the map."
- `README.md`: in §1 the bullet "*Crash/relaunch recovery uses auto-detect* …" append "(2026-10-04,
  brief 04: superseded — an interrupted ride is not resumed; it is saved as a free activity.)"; in §2's
  table add row `| 04 | 04-interrupted-ride-no-resume.md | interrupted ride (app killed, reset, battery)
  never resumed/rescored: saved as free activity, one flash line; remount keeps the route line; inspector
  minors | location/index.ts, ui/RecordScreen.tsx, ui/recordFlow.ts | JS only |`; in §4 "Changes" add
  "an interrupted ride (app killed, phone reset, battery dead) is no longer resumed: what was recorded
  is saved as a free activity and one line says so (brief 04)".

## Verification (report every result)
1. `cd app && node --experimental-strip-types tests/run.ts`: **0 fail**; expected **848 tests / 845 pass /
   3 skip** (844 + 4 new; 0 deleted). Any other count: list added/deleted test names and explain, or STOP.
2. `./node_modules/.bin/tsc --noEmit`: exit 0.
3. Failed-before: step 1's run output (the new tests failing / not loading on the old source).
4. `grep -n "liveEngine.start(" app/src/location/index.ts` -> exactly one hit (startTracking).
   `grep -n "pickId" app/src/location/index.ts` -> hits only inside `startTracking` (the marker field
   `pickId: opts?.wayPick ?? null,` and `liveEngine.start({ pickId: … })`) plus comments; no `session.pickId`.
5. `grep -n "interruptedRideId" app/src/location/index.ts` -> declaration, set in ensureSession, check in
   the task handler, two resets.
6. `GIT_OPTIONAL_LOCKS=0 git diff -- app/tests/ui-strings.allow.json` -> exactly the one appended entry;
   quote it in the report.
7. `GIT_OPTIONAL_LOCKS=0 git status --short` and `git diff --stat`: list the files YOU touched (others
   were already modified by briefs 01-03).

## What changes on the phone / what does not
Changes (after OTA publish, JS only): if the app process dies mid-ride (killed by Android or force-stop,
phone restarted, battery dead), recording ends at that moment: the notification disappears if the OS had
restarted the service, nothing more is recorded, the engine is not restarted. On the next opening of
RECORD the recorded part is saved as a free activity (no times, never ranked, deletable from ACTIVITIES)
and the button's sub-label flashes "Interrupted · saved as free activity" for 5 s; a part under ~30 s is
silently deleted. If the process did NOT die (app UI recreated while recording continued), the ride
keeps going and the picked way's line is back on the map.
Does NOT change: normal START/STOP/PAUSE/discard, scoring of uninterrupted rides, already-saved rides,
GPX+ export (relaunch events still written), any rider-facing text other than the one new line.

## Out of scope
Recording more after a relaunch ("resume as free"), a rider prompt/alert, restoring `ridePickRef`
(post-ride naming endpoints) on a remount, a service death while the RECORD screen stays mounted (no
remount happens; unchanged), a new GPX+ event kind for "interrupted".

## Decisions taken (log into OPEN-ITEMS.md, step 9; Nathan can overrule)
- D1 "Interrupted" = this JS launch restored the marker from disk (`restoration === 'relaunch'`), or the
  service is dead. A `'remount'` with the service running is not a catastrophe (no fix was lost) and keeps
  running; it gets the route-line fix instead.
- D2 Recording stops at the interruption: fixes the OS delivers after a headless relaunch are dropped, not
  appended ("the portion that was properly recorded"). The service is stopped headlessly at once; the
  free save itself waits for the RECORD mount because `markRideFree` needs the stores (`whenStoresReady`,
  cycle 20 brief 12) that only the app UI boots.
- D3 Saved through the existing virgin-cycle20 08 free path (`stopTracking` + `markRideFree`): no new
  machinery, no fallback needed.
- D4 Under 30 raw fixes (~30 s) the interrupted ride is deleted silently (no free activity, no flash); if
  the delete fails it is filed free instead, so it can never be matched to a way.
- D5 `pickId` stays in `ActiveSession` and the marker (and `sessionMarker.ts` stays): it now only feeds
  the remount's route line; never a re-arm. Keeps brief 02's session test valid and the diff small.
- D6 Rider text: `Interrupted · saved as free activity` (36 chars; "activity" is the app's word for a ride;
  Nathan's draft "Your last ride was interrupted and can't be scored." is 51 chars, over budget), 5 s
  hold like the permission flashes. No text for a discarded ride.
- D7 No tests deleted; one engine test retitled because "relaunch with the pick restored" no longer
  describes app behaviour.

## Rulings (Plan tier, 2026-10-04, after the executor's stop at 848 / 843 pass / 2 fail / 3 skip)

**R1 — `liveEngine.start(` counted twice (session_suite test + verification item 4).** The second hit
is a stale comment (`location/index.ts` ~636-638, the rideNotification subscription block) that still
says the engine is started "in startTracking and ensureSession" — false since step 2b. Fix the comment,
NOT the test: the regex stays strict (a comment claiming a second start site is exactly the drift it
should catch). Exact edit in `app/src/location/index.ts` — replace
```
// the notification within a tick. `session` is the module truth (set before
// liveEngine.start() in startTracking and ensureSession; null before
// liveEngine.stop() in stopTracking, which resets the planner). Everything
```
with
```
// the notification within a tick. `session` is the module truth (set just
// before the engine starts in startTracking; restored from disk by
// ensureSession for an interrupted ride, which is never re-armed or fed —
// virgin-cycle21 04; null before liveEngine.stop() in stopTracking, which
// resets the planner). Everything
```
Verification item 4 is amended to read: `grep -n "liveEngine.start(" app/src/location/index.ts` ->
exactly one hit, code or comment (the call in `startTracking`).

**R2 — ui-strings allowlist sort.** The suite (`ui_strings_suite.ts`, "header and entry hygiene")
requires entries strictly sorted by (file, kind, text) with plain JS `<` (UTF-16 code-unit order, no
locale). Step 8's "append at the end" was wrong; the governing rule is CLAUDE.md rule 9 ("may append an
entry" = add one, with a reason, reported) and the suite's order. Move ONLY the new entry: cut the
8-line object now at the end of `entries` (and the `,` the executor added after the previous last
entry's `}`, so the file's former last entry closes with `}` again), and insert it between the
`src/ui/RecordScreen.tsx | literal | "GPS live"` entry (~line 786) and the
`src/ui/RecordScreen.tsx | literal | "Location (GPS) is turned off"` entry (~794), i.e. after the
`}` + `,` closing "GPS live", object followed by `,`. Checked: 467 existing entries already sorted;
"GPS live" < "Interrupted · …" < "Location (GPS) …" by code unit (G < I < L; the `·` U+00B7 sits after
the decisive first letter, needs no special care). No existing entry is reordered or changed, so
`git diff -- app/tests/ui-strings.allow.json` must still show exactly 8 added lines, no deletions.
Text, kind and reason unchanged.

**R3 — "check stops updates and returns" (fixed 400-char window too short).** The code matches step 2c
exactly; the brief's test window was miscounted (`return;` sits at offset ~440). Neither widen the
number nor shorten the comment: bound the slice by the block itself, which is stricter. Exact edit in
`app/tests/session_suite.ts` — replace
```
  const after = task.slice(chk, chk + 400);
  assert(after.includes('Location.stopLocationUpdatesAsync(LOCATION_TASK)') && after.includes('return;'), 'check stops updates and returns');
```
with
```
  const blkEnd = task.indexOf('const locations = data?.locations', chk);
  assert(blkEnd > chk && blkEnd < app, `interrupted block must end before the fix loop (${blkEnd})`);
  const blk = task.slice(chk, blkEnd);
  const iNotif = blk.indexOf('stopRideNotification();');
  const iStop = blk.indexOf('Location.stopLocationUpdatesAsync(LOCATION_TASK)');
  const iRet = blk.lastIndexOf('return;');
  assert(iNotif > 0 && iStop > iNotif && iRet > iStop, `check stops notification ${iNotif}, updates ${iStop}, then returns ${iRet}`);
  assert(!blk.includes('appendFix(') && !blk.includes('liveEngine.feed('), 'interrupted block never appends or feeds');
```
Source unchanged. Expected final: 848 tests / 845 pass / 0 fail / 3 skip (correcting R-section's 846:
the 848 total includes 3 skips, so 848 - 3 = 845 pass — the brief's original 845 was right).
