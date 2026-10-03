# 01 — Engine: the START pick is the one and only reference; the lock race is deleted

**Source: Nathan, 2026-10-03.** Ride "WorkNew" (a Work -> New ride, no pick) was auto-locked to
"WorkZoo" about 1 min in; WorkZoo's line was drawn and the ride would have been filed under it. Nathan:
"never lock any ways into the ride; the absolute reference is the user pick at the start". Review and
root cause: `README.md`. This brief is the engine half. Read `README.md` §1 first.

**Tier:** Execute = Sonnet. STOP-ON-AMBIGUITY (EXECUTOR-RULES.md): any quoted anchor not where stated,
any test failing for a reason this brief does not name -> stop and report verbatim. Never rule yourself.

## Scope / non-scope

IN: `app/src/live/engine.ts`; tests that encode the lock (`app/tests/live_suite.ts` ~51 tests with
heavy lock coverage, `engine_suite.ts`, `live_colour_suite.ts`, `rankingreveal_suite.ts`,
`recordflow_suite.ts`, `selfrace_suite.ts`, `riderdot_suite.ts` (lines ~146-191 assert the old
"pre-lock display candidate" split between `track` and `displayTrack`; `live_suite.ts` ~1419-1515 has the
cycle-20 06 `displayTrack` tests) — only literals/asserts that name removed fields or lock behaviour).
OUT (briefs 02/03): the session marker, `location/index.ts` event handlers, GPX+ export,
`liveMapOverlayFor`, `wayMapView.tsx`, docs. Do NOT touch `core/` (gate detector, projector, timing —
parity-proven), `tracks.ts`, `selfRaceModel.ts` logic.

**Generic rule (Nathan):** works for every user's route. Tests use the existing synthetic fixtures /
`TrackSpec` builders in `tests/lib.ts` and the specs `live_suite.ts` already builds; never a rider's
real route.

## Target behaviour (invariants — the tests in §6 pin them)

1. `start({pickId, wayIds})`: if `pickId` names a spec in the (optionally `wayIds`-filtered) spec set,
   the engine has **exactly one candidate, the pick's, which is the reference from START**: `phase`
   becomes `'locked'` immediately (the union keeps all four members; `'detecting'` now means "running with
   no reference"), `getState().track === pickId` from the first call after `start()`.
   Otherwise (no pick, or a pick not in the spec set): **zero candidates**, `track === null` for the whole
   ride, `phase === 'detecting'`, sectors `pendingSectors(N_SECTORS_DEFAULT)`, no gate fires, no events.
   The engine never creates a candidate for any other way, ever.
2. The pick is never changed, switched, re-evaluated or "verified". There is no lock race.
3. No `'lock'` / `'lockChange'` EngineEvent is emitted any more. `'gate'` events are emitted for the
   pick's fires exactly as the verified fast path did (`type:'gate', track, gateIndex, t, estimated`),
   and `recompute()` runs when the candidate fires — same as today's `lockedFired` path.
4. `finalize()`: sets `ended = true`; if there is a reference and its candidate fired **no gate at all**
   (`cand.events.length === 0`) -> the ride is unmatched: `locked = null`, `sectors = pendingSectors(n)`,
   `phase` unchanged, emit. Otherwise nothing changes (the pick stays). **No recovery of any other
   candidate, ever** (that was the no-pick FINISH-gate recovery). Idempotent (two calls == one; brief 12's
   `lockKind==='none'` guard disappears because there is no lockKind).
5. Diagnostics stay for the pick: `wayMatchAttempt` with phase `'anchor'` and `'retry'`
   (types in `storage/types.ts` unchanged). Phase `'lock'` is no longer emitted by the engine.
6. The cycle-023 poor-accuracy re-seed of the first anchor stays but is restricted to
   `c.events.length === 0` (a re-seed discards `c.events`; with one candidate alive for the whole ride
   it must never discard real fires). Ruling made here; log in OPEN-ITEMS if a retry test disagrees.
7. Everything positional in `getState()` (`currentSector`, `lastDone`, `startGateT`, `chainageM`,
   `riderSnap`, `gateFires`, `lap`, `sectors`, `onWay`) reads the one candidate (`this.locked`), as
   `disp` does today. `track` and the old `displayTrack` are now the same value.

## Steps (anchors: locate by the quoted text; line numbers are current-tree approximations)

All in `app/src/live/engine.ts` (1064 lines). Prefix shell with `GIT_OPTIONAL_LOCKS=0`; first run
`git status --short`, baseline tests + tsc (README §3: expect 838/835/0/3; tsc exit 0).

1. **Header comment (lines ~1-110):** rewrite the "Route auto-detection ... HARD PICK lock-then-verify
   ... DISPLAY CANDIDATE" paragraphs to describe the new design in <= 12 lines (pick = reference from
   START; no pick = no reference; no detection, no lock, no switching; why: Nathan 2026-10-03, README).
   Keep the 'Advance is CORRIDOR-VERIFIED' paragraph only if `adv` survives step 4 — else delete it.
2. **Delete exports/types:** `LOCK_MIN_ADVANCE_M`, `LOCK_MARGIN_M` (lines ~120-121), `ANCHOR_M` and its
   doc comment (~165), `LockKind`, `LockChangeReason` (~198-203), the `'lock'` and `'lockChange'`
   members of `EngineEvent` (~226-256). First `grep` each name in `app/src` and `app/tests`
   (targeted files, no recursive repo grep): `store/routeCreation.ts:70` only *mentions* ANCHOR_M in a
   comment ("not imported") — **keep routeCreation's own constant/value untouched**, change only the sentence that points at the
   deleted engine constant (say the value is now routeCreation's own).
   Keep `REACQ_JUMP_M` / `adv` ONLY if still read after step 4; otherwise delete them and the
   `wasOnWay`/`jump` discounting in `feedCandidate` (they existed solely to protect the lock race's
   evidence). If you keep `baseS` (needed by the retry rule) keep `baseAccuracyM`, `retried`.
3. **`LiveEngineState` (~286-337):** remove `lockKind`, `pickHonoured`, `anyAnchored`, `displayTrack`;
   keep `track`, `pick`, `phase`, `sectors`, `currentSector`, `lastDone`, `lap`, `gateFires`, `fixesFed`,
   `onWay`, `startGateT`, `chainageM`, `riderSnap`. Rewrite the doc comment of `track`: "the START pick
   (the reference for the whole ride), or null when the ride has none". Note `pick` stays (logged).
4. **`Candidate`:** remove `anchored`, and `adv` if unused. **Class fields:** remove `lockKind`,
   `pickHonoured`; `locked` now = "the reference candidate" (rename NOT required — keep the name to
   limit churn, add a one-line comment); `ended` stays.
5. **`start()` (~416-455):** build `cands` only for the pick (see invariant 1): compute `pickSpec` from
   the `wayIds`-filtered `specs` (today `pickSpec` is looked up in `allSpecs`; filter FIRST so a pick
   outside the sport-scoped set is "no reference"); `this.cands = pickSpec ? [candidate(pickSpec)] : []`;
   `this.locked = this.cands[0] ?? null`; `this.phase = this.locked ? 'locked' : 'detecting'`;
   `sectors = pendingSectors(pickSpec ? pickSpec.gates.length - 1 : N_SECTORS_DEFAULT)`. No event is
   emitted at start. `stop()`: drop the removed fields.
6. **`feed()` (~485-580):** collapse the two branches into one. Keep, in order: `flagged` early return,
   idle auto-start (`this.start()` with NO options -> no reference; unchanged), buffers, then **if
   `this.locked`**: the cycle-023 re-seed block (condition now also `c.events.length === 0`, see
   invariant 6; on re-seed set `lockedFired = true` is NOT needed — just call `recompute()` after
   `feedCandidate` since events were cleared), the `wayMatchAttempt` 'anchor' diagnostic on first
   anchor, `feedCandidate`, `gate` emission with `estimated`, `this.onWay = locked.onWay`, then
   `if (fired || reseeded) this.recompute()`; `this.emit()`. When `locked === null` only buffers
   advance (no work). Delete `evaluateLockState`, `commitLock`, `pickLeader`, `noteLockChange`,
   `displayCand` (inline `this.locked`; if `ended` and unmatched `locked` is already null).
7. **`finalize()` (~565-690):** replace the whole body per invariant 4 (it is ~125 lines today; the new
   body is ~12). Keep the doc comment short: "ride end: a reference that never fired a gate = unmatched".
8. **`getState()` (~697-735):** per invariant 7: `const c = this.locked`; `track: c ? c.track : null`;
   delete `disp`, `displayTrack`, `lockKind`, `pickHonoured`, `anyAnchored`; `gateFires = c ? c.events.length : 0`;
   `riderSnapOf(c)`; `chainageM: c ? c.proj.chainage : null`.
9. `recompute()` (~960): `const cand = this.locked` (was `displayCand()`); rest unchanged. Check the
   `phase`/`lap` bookkeeping inside still compiles (FINISH sets `phase='finished'`).
10. Dead code: let `tsc --noEmit` and a targeted grep for each removed identifier in `app/src/**`
    (RecordScreen, location/index.ts, storage, ui models) tell you the consumers — but **only fix
    consumers inside engine.ts here**; leave the rest for briefs 02/03. Therefore after this brief tsc is
    EXPECTED to fail in those consumer files; run it and list every error file in your report. (To keep
    the tree green between briefs the coordinator runs 01+02+03 back to back.)

## Tests (this brief's share)

Delete tests of retired behaviour (list EVERY deleted test name in your report; the Opus inspector
checks each is truly retired): lock race (400 m / 200 m margin / blockers), soft->verified promotion,
anchored/unanchored rival, REACQ discounting if `adv` was removed, `finalize()` recovery of a
non-picked candidate, `lockChange`/`lock` event assertions, `lockKind`/`pickHonoured`/`anyAnchored`
asserts. Adjust the rest: helper literals that set `displayTrack:` / `lockKind:` (live_colour_suite:53,
rankingreveal_suite:59 carry `displayTrack: null,`) lose those fields; asserts that read
`displayTrack` read `track`. Do not weaken any assert that is still about gates/sectors/laps — if such a
test fails after the engine change, STOP and report.

Add to `live_suite.ts` (names prefixed `virgin-cycle21 01:`; use the suite's existing spec builders; two
specs that share their first stretch, A (pick) and B (rival), exist or are trivially built from the same
polyline helpers — if there is NO existing builder for two shared-start specs, build them from one
`tests/lib.ts` ref and a longer copy; STOP only if impossible):
- L1 **pick is the reference from the first fix**: start({pickId:A}); before any fix `track===A`,
  `phase==='locked'`; after one fix near A's start `track===A` and `lockKind` is not a property.
- L2 **a rival that "pulls ahead" never takes over**: pick A; feed a track that follows B's divergent
  stretch for > 1 km; `track` stays A for every fix; the collected EngineEvents contain no `lock`/
  `lockChange` and no gate event with `track === B`; sectors beyond what A saw are pending/missed.
- L3 **no pick = no reference**: start({pickId:null}); feed 2 km along A; `track===null` throughout,
  `sectors.length===4`, all pending, `gateFires===0`, no events, `riderSnap===null`.
- L4 **pick outside the sport-scoped set**: start({pickId:A, wayIds:[B]}) behaves as L3.
- L5 **finalize**: pick A, no gate fired -> `finalize()` => `track===null`, sectors pending; second
  `finalize()` same; pick A with >= 1 gate fired -> `finalize()` keeps `track===A` and the done sectors
  (twice); a no-pick ride that completed A's whole route -> `finalize()` leaves `track===null` (no recovery).
- L6 **re-seed never eats fires**: poor-accuracy first fix, then a gate fires, then a good fix ->
  events/`sectors` keep the fire (the `events.length===0` restriction).
- L7 the **failed-before check**: temporarily revert engine.ts (`git stash` is forbidden — copy the file
  aside, restore it from the saved copy) and confirm L1-L5 fail on the old engine; restore; report.

Expected test count: not fixed — baseline 838; report before/after, the exact list of deleted names, the
7+ added. Zero FAIL, 3 skip unchanged. tsc: see step 10 (full green only after brief 03).

## Verification (executor)

`cd app && node --experimental-strip-types tests/run.ts` -> zero FAIL;
`./node_modules/.bin/tsc --noEmit` -> only the consumer errors listed in your report (RecordScreen,
location/index.ts, storage/…). `grep -nE "lockKind|pickHonoured|anyAnchored|displayTrack|LOCK_|ANCHOR_M|
evaluateLockState|commitLock|pickLeader" app/src/live/engine.ts` -> no hits.

## What changes on the phone / what does not

Changes (once published): a picked ride is on its way from START and can never be reassigned; a ride
with no pick has no reference at all. Does NOT change: gate times, sector/lap numbers for a picked ride
(same detector, same offline recompute), the rider-dot snap (brief 02 of cycle 20 reads the same
candidate), saved ride files. Nothing is on his phone from this brief alone.

## Out of scope

Persisting the pick across a relaunch (brief 02), overlay/dot layering (brief 03), any change to
`core/`, any colour/tier rule, the naming flow.
