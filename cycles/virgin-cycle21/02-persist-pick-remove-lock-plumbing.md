# 02 — Persist the pick across a relaunch; stop writing lock events; fix every consumer of the removed engine fields

**Source: Nathan, 2026-10-03** (retire way locking; see `README.md` §1). Depends on **brief 01**
(engine no longer has `lockKind`, `pickHonoured`, `anyAnchored`, `displayTrack`, `'lock'`/`'lockChange'`
events). Execute = Sonnet; STOP-ON-AMBIGUITY per EXECUTOR-RULES.md. Generic for every user's route; tests
use synthetic sidecars/specs only.

## Scope
IN: `app/src/location/session.ts`, `app/src/location/index.ts`, `app/src/storage/gpxPlusExport.ts`,
`app/src/ui/RecordScreen.tsx` (only `live.displayTrack` / removed-field uses; the overlay line is
brief 03), comment-only edits in `app/src/ui/colourModel.ts` (~186-188) and `rankingRevealModel.ts`
(~12), `process/CONVENTIONS.md`, `process/BETA-TESTERS.md`, `app/tests/README.md` (wording only), and
their tests (`gpxplus_suite.ts`, plus a session round-trip test).
OUT: `storage/types.ts` and `storage/eventsJsonl.ts` — **do not delete** `LockEvent`, `LockChangeEvent`,
their validators or `WayMatchDiagnostic` phase `'lock'`: already-saved rides contain them and must keep
opening/exporting. Do not touch `core/`, the overlay (03), the engine (01).

## Steps

**A. Persist the pick (crash/relaunch recovery).** Today the headless relaunch re-arms the engine with
`liveEngine.start({ pickId: null, wayIds: session.wayIds ?? null })` (`location/index.ts` ~189, inside the
"engineArmedThisLaunch" block). Under brief 01 that would silently drop the ride's reference.
1. `location/session.ts` `ActiveSession` (~line 20-45): add
   `pickId?: string | null;` with a doc comment (the START pick, restored on relaunch; absent in markers
   written before cycle 21 = no reference, tolerated). In `loadSession()` (~line 64): parse
   `const pickId = typeof parsed.pickId === 'string' ? parsed.pickId : parsed.pickId === null ? null : undefined;`
   and return it in the object (`return { rideId, startedAtMs, mode, wayIds, lastAliveAtMs, sportId, pickId }`).
2. `location/index.ts` `startTracking` (the `const s: ActiveSession = {` block ~383-392): add
   `pickId: opts?.wayPick ?? null,` beside `wayIds`.
3. `location/index.ts` ~189: `liveEngine.start({ pickId: session.pickId ?? null, wayIds: session.wayIds ?? null });`
   and fix the comment above it if it speaks of detection.
4. Test (new, in the suite that already tests `session.ts` — find it with a targeted grep for
   `loadSession`/`saveSession` in `app/tests`; if none exists create `app/tests/session_suite.ts` and
   register it exactly the way `run.ts` registers its siblings): `virgin-cycle21 02: session marker
   round-trips pickId (string, null) and a pre-cycle-21 marker without it loads as undefined`. If
   `FileSystem` cannot be exercised in the headless runner, extract the parse into a pure exported
   function `parseSession(raw: string): ActiveSession | null` and test that — do not mock expo.

**B. Stop writing lock events.** `location/index.ts` ~652-672 `liveEngine.subscribeEvents(...)`:
after brief 01 `EngineEvent` has only `type:'gate'`. Delete the `'lock'` and `'lockChange'` branches and
the `else // ev.type === 'gate'`, leaving the single `logEvent(... kind:'gate' ...)`. Update the two
comments (above `subscribeEvents`: "route lock + gate fires" -> "gate fires"; above `subscribeDiagnostics`
~681: "fired for EVERY candidate, win or lose ... a ride that never locks" -> one candidate, the pick).
`stopTracking` ~548-557 comment: finalize() now only unmatches a reference that never fired.
The sidecar's existing `pick` event (~455-462, `wayId: opts?.wayPick`) is unchanged.

**C. GPX+ export keeps its route facts without lock events.** `storage/gpxPlusExport.ts` ~285-367:
fidelity (`<qf:wayFidelity>`), distance (`<qf:wayDistanceM>`) and `<qf:wayLock>` hang off `lockEvs`.
A new-style sidecar has NO lock events but has `gate` events whose `track` is the pick. Change, keeping
every old-sidecar output byte-identical:
1. Move `const gateEvs = evs.filter(... e.kind === 'gate')` (currently ~387) above the `if (events !== null)` block.
2. `const rideTrack: string | null = lockEvs.length > 0 ? lockEvs[0].track : (gateEvs[0]?.track ?? null);`
3. Keep the `for (const l of lockEvs)` `<qf:wayLock .../>` loop exactly as is (old sidecars only).
4. Distance: `wayDistanceM(rideTrack)` when `rideTrack !== null` (was `lockEvs[0].track`; identical for old).
5. Fidelity: `settledTrack = lockEvs.length > 0 ? ([...lockEvs].reverse().find((e) => e.lockKind !== 'soft')?.track ?? null) : rideTrack;`
   then `refFor(settledTrack)` as today (still throws -> omitted for null/unknown). Old behaviour kept
   (soft-only old sidecar -> no fidelity).
6. The `else { lines.push('<qf:wayLock>none</qf:wayLock>') }` becomes: emit `none` only when
   `lockEvs.length === 0 && gateEvs.length === 0` (a ride that never fired a gate is honestly "none");
   a new-style ride with gates emits NO `<qf:wayLock>` element (nothing was locked) but does emit
   distance/fidelity. Restructure the if/else so the distance+fidelity code runs when `rideTrack !== null`
   — an indentation-heavy diff; keep comments, rewrite the "soft lock" comment to say it only concerns
   old sidecars.
7. `<qf:lockChanges>` (~368-384): unchanged (old sidecars); update its comment to "legacy".
8. Tests (`gpxplus_suite.ts`; use the file's existing helpers — see the N9 tests ~845-900 for building a
   sidecar and injecting `refFor`): add `virgin-cycle21 02: a new-style sidecar (pick + gate events, no
   lock) exports wayDistanceM and wayFidelity, and no <qf:wayLock>`; `... a sidecar with a pick and no
   gate and no lock exports <qf:wayLock>none</qf:wayLock>`. All existing lock/lockChange tests must
   pass UNCHANGED — if any needs editing, STOP and report (they pin old-ride compatibility).

**D. RecordScreen + other consumers of removed fields.** `tsc --noEmit` lists them. Known:
`RecordScreen.tsx:1157` `const selfWayId = live.displayTrack ?? pickedWay?.id ?? null;` ->
`live.track ?? pickedWay?.id ?? null` (update the cycle-20 comment above it: "the engine's reference,
fixed at START"). Any other `lockKind`/`pickHonoured`/`anyAnchored`/`displayTrack` use found by tsc:
replace by the engine's `track`/`pick` or delete the dead branch; STOP if one carries product logic
this brief does not mention.
Comment-only: `colourModel.ts` ~186-188 ("no locked way ... before the lock there is nothing honest")
-> "no reference way, or no real time -> 'neutral'"; `rankingRevealModel.ts` ~12 ("no way locked
(`track === null`)") -> "no reference way (`track === null`)". No logic change in either.

**E. Docs (dated, per the repo's guide-dating rule).** Targeted `grep -n -i "lock"` in
`process/CONVENTIONS.md`, `process/BETA-TESTERS.md`, `app/tests/README.md`; update only sentences that
describe route detection / locking, each edit prefixed or suffixed with "(2026-10-03, cycle 21:
way locking retired — the START pick is the only reference)". Do NOT add commands to evergreen docs
(commands live in this cycle's COMMANDS.md). Leave unrelated "lock screen"/"locked phone" text alone.

## Verification
`cd app && node --experimental-strip-types tests/run.ts` zero FAIL; `./node_modules/.bin/tsc --noEmit`
exit 0 **after this brief is applied on top of 01** except for the overlay line brief 03 owns
(`live.track` stays valid, so tsc should already be green — report anything else).
`grep -nE "lockKind|pickHonoured|anyAnchored|displayTrack" app/src --include=*.ts --include=*.tsx -r`
-> hits only in `storage/types.ts`, `storage/eventsJsonl.ts`, `storage/gpxPlusExport.ts` (legacy).
Report the old-sidecar GPX+ tests all unchanged and green.

## What changes on the phone / what does not
Changes: a ride interrupted by an app kill/relaunch keeps following the same picked way (before, it
re-guessed); new rides' GPX+ no longer contain lock events, but still carry distance and fidelity.
Does NOT change: any already-saved ride (opens and exports as before), the ride list, results,
sector times.
