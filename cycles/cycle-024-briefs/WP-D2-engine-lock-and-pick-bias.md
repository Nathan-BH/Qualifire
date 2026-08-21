# WP-D2 — Engine: all catalog routes as live candidates + pick-biased lock-then-verify (B-65 ruling)

**Executor model: Sonnet. You see ONLY this brief. STOP AND ESCALATE on any judgment call this brief does not pre-resolve — never guess. Requires WP-D1 landed first (refs for all 20 catalog routes + StationHomeWet).**

## Goal, in Nathan's words

"Every route I ratified should lock and score live" — today only Morning/EveningA/EveningB/MorningB do; the other routes preview and take a pick but never score (his 2026-08-19 station→home ride half-became an evening-B ride mid-route because the true route wasn't a candidate). And his NEW RULING (2026-08-20, resolves the B-65 doc conflict): **the RECORD-tab route pick biases the engine's route lock as a hint, verified by GPS after the true lock fires — if the rider actually rides a different road, the ridden route wins ("lock-then-verify", never a shortcut on lock timing).** Ask-upfront (the WHICH ROUTE TODAY? pills, DATA-MODEL §8a) wins over pure auto-detect (B-41/COLD-START §10); those doc edits are bookkeeping, not this brief.

## Environment & rules (binding)

- Repo on Nathan's PC `C:\Users\natha\Claude personal projects\Qualifire\` = `$HOME/mnt/Qualifire/` in the device workspace. Cloud sandbox has NO npm/PyPI. No git.
- **No repo writes until the coordinator confirms cycle 023 landed AND WP-D1 landed.**
- Tests run pure: `cd app && node --experimental-strip-types tests/run.ts` (sandbox and PC). `npx.cmd tsc --noEmit` on the PC via device_bash. Re-baseline the suite before editing (WP-D1 leaves it at its baseline+5, 0 FAIL).
- Every behaviour change lands with regression tests. No test may be weakened to pass. D-023: engine state is derived, in-memory display truth only; raw JSONL untouched. Honesty rules (D-013/D-025): no colour/verdict a sector hasn't earned; estimated ⇒ raw-only.

## Current state (verified in code 2026-08-20)

`app/src/live/engine.ts` (394 lines):
- `TRACK_IDS` from `app/src/live/refs.ts` line 19: `['Morning','EveningA','EveningB','MorningB']`. `refFor(track)` reads `app/tests/fixtures/refs.json`. Gates come from `gateChainages(track)` = `app/core/src/gates.ts` `PROPOSED_GATES` (4 hardcoded tracks).
- `start()` (line 139) builds one `Candidate` per TRACK_ID: `{track, ref, proj: new LiveProjector(ref), det: new GateDetector(gateChainages(track)), events, baseS, adv, onRoute}`.
- `feed()` (line 174): auto-starts if idle; if locked, feeds only the locked candidate and emits its gate events; else feeds all, computes `leader()` (max `adv`), and locks when `lead.adv >= LOCK_MIN_ADVANCE_M (400)` and `lead.adv − second >= LOCK_MARGIN_M (200)` — then `this.cands = [lead]`, emits one `{type:'lock'}` EngineEvent and replays the winner's kept pre-lock gate events. **A lock is permanent; there is no unlock/re-detect (B-65's known gap).**
- `Candidate.adv` = chainage advance measured from `baseS` = projection of the FIRST fed fix (`feedCandidate`, line 277). `LiveProjector` (app/core/src/live.ts) is forward-only, corridor 40 m, window [sp−30, sp+240], D-016(a) re-acquisition, and `GateDetector` D-016(b) arming within 50 m.
- `recompute()` (line 294) rebuilds sectors/lap from the offline parity pipeline over the whole buffer — locked candidate only, on gate fire (~5×/ride, ~1e5 ops).
- Wiring: `app/src/location/index.ts` line 225 `liveEngine.start()` inside `startTracking()`; line 150 feeds fixes; module-scope `subscribe` buzzes on `gateFires` increase (line 277-285); module-scope `subscribeEvents` (line 300) writes `lock`/`gate` events into the GPX+ sidecar (`app/src/storage/eventsJsonl.ts` — decoder is field-tolerant, `KINDS` allow-list only).
- `app/src/ui/RecordScreen.tsx`: §8a pick pills (lines 554–571) set `routePick {wayId, routeId}`; `pickedRoute` (line 338) falls back to `defaultRouteFor` (most-ridden §8a default) — so **a pick effectively always exists when a known way is selected**; `onStart` (line 216) freezes `rideRouteHint = pickedRouteRef.current?.refLineId` for the pre-lock map only. The engine never learns the pick.
- Tests: `app/tests/live_suite.ts` drives `new LiveEngine()` over committed fixtures (Morning/EveningA/EveningB (+synthetics)); asserts lock advance ∈ [400, 480] and margin ≥200 (lines 100–130), parity of displayed times, honesty invariants, subscribe contract, GPX+ events. `app/tests/engine_suite.ts` tests core (LiveProjector/GateDetector directly — untouched by this brief). `app/tests/lib.ts` `refFor`/`gateChainages` serve the 4 legacy tracks.

### The measured geometry that shapes the design (analyst, 2026-08-20 — do not re-derive)

The 20-route catalog contains **corridor-subset pairs** that break the naive margin rule:
- **Morning is 98% inside HomeStationPreferred's corridor** (home→station passes work): a Morning commute keeps both candidates advancing in lockstep until Morning ref chainage ~5540 of 5651 — the 200 m margin can NEVER open ⇒ with all 20 candidates and today's rule, **the daily Morning ride would never lock**.
- StationHomePreferred passes 51 m from the work landmark at its ~2550 m ⇒ it shadows EveningA rides *mid-line* (its first on-corridor fix comes at chainage ≫ its start). Likewise StationHomeWet (WP-D1) shadows EveningB (66% shared corridor, joining at SHW chainage ~2900).
- HomeFosh stays inside HomeStationViaFosh's corridor until ~7040 of 7370 m; WorkFosh inside WorkStationA's until ~1820 of 1860 m ⇒ margin can only open in the last few hundred metres, or never if the rider stops at the shorter route's end.

Two mechanisms fix all of these without ever weakening the 400 m evidence rule; together they ARE the ruling's "lock-then-verify":

## Design (pre-resolved — implement exactly this)

### New concepts in `engine.ts`

```ts
export interface TrackSpec { id: string; ref: RefLine; gates: number[] }
export const ANCHOR_M = 300;   // "anchored" = this candidate was joined at its own start
export interface EngineStartOptions { pickId?: string | null }
export type LockKind = 'none' | 'soft' | 'verified' | 'finalized';
```

- `LiveEngine` constructor: `constructor(specs?: TrackSpec[])` — default `catalogTrackSpecs()` from a NEW file `app/src/live/tracks.ts`: pure; imports `catalog.seed.json` + `gateSetFor` from `../store/catalog.ts` + `refFor` from `./refs.ts`; returns one spec per catalog route `{id: route.id, ref: refFor(route.refLineId), gates: gateSetFor(catalog, route.id, route.gateSetVersion)!.chainageM}`. Routes whose refLineId is missing from refs.json are skipped with a console.warn (defensive only — after WP-D1 all 20 resolve; add a test that none are skipped).
- `refs.ts`: widen `refFor` to accept any string id present in refs.json (`TrackId` in `app/core/src/types.ts` line 37 becomes `export type TrackId = string;` — keep the name; update its comment. `tsc --noEmit` must stay clean everywhere it is consumed). `TRACK_IDS` export becomes the catalog-derived id list (derived in tracks.ts and re-exported for compatibility) — grep confirms `engine.ts` is its only consumer.
- `Candidate` gains: `anchored: boolean` (set true the first time `fix.onRoute && fix.s <= ANCHOR_M`; initially false), and gate count may differ per candidate (all currently 5 — do not assume 4: pre-lock `sectors` sizing below).
- State additions (extend `LiveEngineState`): `lockKind: LockKind` (today's states map: unlocked='none', locked='verified'), `pick: string | null`.
- `start(opts?: EngineStartOptions)`: stores `this.pick = opts?.pickId ?? null`. `feed()`'s idle auto-start calls `start()` (pick null) — unchanged behaviour.
- Pre-lock `sectors`: if a pick exists and matches a spec, size `pendingSectors(spec.gates.length - 1)`; else keep `N_SECTORS_DEFAULT = 4`. (Display-only; rebuilt at lock.)

### Lock algorithm (replaces the else-branch of `feed()`, lines 196–219)

Each fix while `lockKind !== 'verified'` (note: soft-locked engines KEEP feeding all candidates):

1. Feed every candidate (as today's detecting branch). Gate-event emission rule unchanged: only the currently locked (soft or verified) candidate's fires are emitted/recomputed; losing candidates keep their events silently.
2. `leader` = max `adv`; ties (exact equal adv) break by: anchored first, then pick, then spec order.
3. `blockers` = candidates c ≠ leader with `leader.adv − c.adv < LOCK_MARGIN_M` **AND (c.anchored OR !leader.anchored)** — an unanchored rival never blocks an anchored leader (it is a mid-line shadow: StationHomePreferred under an EveningA ride, StationHomeWet under an EveningB ride). This clause is what keeps EveningA/EveningB hard-locking at ~400 m exactly as today.
4. If `leader.adv >= LOCK_MIN_ADVANCE_M`:
   - `blockers` empty → **verified lock** exactly as today (emit `lock` event, replay winner's events, `cands=[leader]`, `lockKind='verified'`, phase 'locked'). If a soft lock on a DIFFERENT candidate was active, first emit the new lock event, replay, and `recompute()` — the ridden route wins; sectors rebuild honestly.
   - `blockers` non-empty AND `lockKind==='none'` AND `this.pick` is the id of `leader` or of a blocker whose `adv >= LOCK_MIN_ADVANCE_M` → **soft lock the pick's candidate**: `lockKind='soft'`, phase 'locked', `locked = pickCand`, emit `{type:'lock', …, kind:'soft', pick: this.pick}`, replay pickCand's kept events, `recompute()`. Do NOT drop the other candidates.
   - otherwise: stay detecting (no pick ⇒ exactly today's behaviour: wait for the margin).
5. While `lockKind==='soft'`: on every fix, re-evaluate. (a) If the soft-locked candidate now satisfies step 4's verified condition (it is leader with no blockers) → promote: `lockKind='verified'`, `cands=[locked]` (no second lock event — set a `pickHonoured` field on the state instead). (b) If ANY other candidate leads the soft-locked one by `>= LOCK_MARGIN_M` → **switch** (the rider took the other road): emit a new `{type:'lock', kind:'soft'|'verified'…}` for it per step 4's evaluation, replay its kept events, `recompute()`, `this.lap` stays null (a switch after FINISH cannot happen: guard — no switching once `phase==='finished'`).
6. **`finalize()`** — NEW public method, called once when the ride ends (see wiring): if `lockKind==='verified'` → no-op. Else consider candidates whose FINISH gate (last gate) has fired: if exactly one → lock it (`lockKind='finalized'`, emit lock event, replay, recompute); if several → the one with the greatest `adv` (a longer completed route subsumes its prefix — measured case: riding WorkStationA fires WorkFosh's FINISH en route), pick breaking exact-adv ties; if none → if soft-locked keep the soft lock as 'finalized' (its display already stood), else remain unlocked (ride unmatched, as today). `finalize()` then emits state.

The 400 m evidence rule is never shortcut: no lock of any kind before some candidate has ≥400 m of corridor-verified advance, and a soft lock can only ever be corrected TOWARD the route with 200 m more measured advance. Verified locks never unlock (no regression of today's invariant).

### Perf/memory (justified — cite in code comment)

Per 1 Hz fix per candidate: windowed projection ≈ (30+240)/5 ≈ 54 segment tests ≈ ~500 flops ⇒ 20 candidates ≈ 10k flops/s — negligible (the offline recompute we already run ~5×/ride is ~1e5 ops). First-fix `nearestVertex` over ~1200–1750 vertices × 20 ≈ 30k ops, once. Refs memory ≈ 20 × ~1400 vertices × 3 Float64Arrays ≈ 700 KB. Keeping all candidates alive until verified lock costs only the projector state (a few numbers each). No cap needed beyond the existing `MAX_BUFFERED_FIXES`.

### Wiring

- `app/src/location/index.ts`: `startTracking()` gains an optional param `opts?: { routePick?: string | null }`; line 225 becomes `liveEngine.start({ pickId: opts?.routePick ?? null })`. `stopTracking()`: call `liveEngine.finalize()` BEFORE `endRide`/`liveEngine.stop()` (line ~252) so the last emitted state carries the finalized route. Sidecar lock events (line 300): pass through the new optional `kind`/`pick` fields (`eventsJsonl.ts` `KINDS` already allows 'lock'; extra fields ride along encode/decode untouched — verify with the existing gpxplus tests).
- `app/src/ui/RecordScreen.tsx`: `onStart` (line 217) `startTracking({ routePick: pickedRouteRef.current?.id ?? null })`. `onEnd` (line 230): `rememberRide` already runs before `stopTracking()`, which would miss finalize — reorder to: `liveEngine.finalize(); rememberRide(liveEngine.getState()); await stopTracking();`. Status line (line 267): while `lockKind==='soft'`, render `` `${track} · route locked (your pick) · verifying` `` — honest about the provisional state; verified/finalized keep today's wording.
- `app/src/ui/lastRide.ts` `pushRecorded` (line 174): `gateSetVersion` no longer hardcoded 1 — look up via `gateSetFor(CATALOG, f.routeId)?.version ?? 1` (import catalog seed + helper; keep the module pure).

## Tests

**Existing suites keep their assertions by injecting the legacy 4-track specs** (they test the auto-lock mechanics, not the catalog): add to `app/tests/lib.ts` a helper `fixtureSpecs(): TrackSpec[]` returning the 4 tracks from `refFor` + `gateChainages`; `live_suite.ts` `drive()` constructs `new LiveEngine(fixtureSpecs())`. No existing assertion text changes — if any existing test fails after this, that is a defect in your change, not in the test.

New tests in `live_suite.ts` (baseline is whatever WP-D1 left; expected +9, 0 new skips):
1. `catalogTrackSpecs: 20 specs, every catalog route resolves ref+gates, none skipped` (import tracks.ts directly; uses the JSON-import hook already in this suite).
2. `pick honoured: clean_eveningb with pick=EveningB — same lock fix index and same lock advance bounds as no-pick` (drive twice, compare `lockAt`; lock event carries pick; final lockKind 'verified').
3. `pick wrong: clean_eveningb with pick=EveningA — ridden route wins` — in this fixture the sibling freezes almost immediately (D-025 measured the Evening sibling frozen at ≤12 m by lock time), so at 400 m the margin is already clear and EveningA is NOT a blocker: assert a single **verified** lock on EveningB at the same `lockAt` as no-pick, exactly one lock event, state `pick==='EveningA'` with the honoured flag false, final sectors at full offline parity (reuse `assertDoneReal`). The soft-lock-then-switch path is covered by synthetic test 8b below.
4. `no pick: behaviour unchanged` (existing clean-fixture tests already prove it; add one explicit: drive clean_morning with `start()` no-arg via feed auto-start — final state equals the pick-free drive; `pick` null in state).
5. `full-catalog shadow regression: clean_morning with all catalog specs + pick=Morning` — soft lock on Morning at advance within [400, 520] (HomeStationPreferred is an anchored blocker the whole way — measured: shares 98% of Morning's corridor; HomeChurch shares the first ~340 m; NB the leader at any instant may be HSP by resampling noise since the two lines are the same road — the soft lock keys on the PICK being in the tied set with adv ≥ 400, not on the pick being leader), `finalize()` after the last fix → `lockKind='finalized'`, track Morning, all 4 sectors at offline parity, lap real. **This is the guard that the daily commute still scores.**
6. `full-catalog shadow regression: clean_eveningb, NO pick` — StationHomeWet is an UNANCHORED shadow (its corridor joins mid-line at its ~2900 m — must not block, rule 3); but WorkChurchB is an ANCHORED partial blocker (measured: it shares EveningB's exit from work up to EveningB chainage ~310 m, so at 400 m advance the margin is only ~90 m). Assert: verified lock on EveningB, lock advance within [400, 700] (expected ~510–560: 310 + the 200 m margin), all sectors at offline parity, lap real. Print the measured lock advance in the assert message so the coordinator can record the real number.
7. `unanchored shadow never blocks: clean_eveninga, no pick, full catalog` — same shape (StationHomePreferred shadows EveningA mid-line).
8. `prefix stall + finalize: synthetic` — build two synthetic specs sharing the first 1200 m (straight west→east line, 5 m vertex step, planar coords fed through a tiny lat/lon wrapper around the shared origin), then diverging at 90°: route S continues 200 m north (total 1400 m), route L continues 1800 m east (total 3000 m); gates S `[100,400,700,1000,1300]`, L `[100,800,1500,2200,2900]`. (a) Ride the shared road then S's branch to 1400 m at 5 m/s, then stand still 30 s. No pick: no lock during the shared stretch (both anchored, tied within margin); once S leads L by ≥200 m on its branch it VERIFIED-locks S — assert lock fires near ride-chainage ~1400 m; if instead the ride stops AT 1200 m (second sub-case, separate engine): never locks, `finalize()` → whichever candidates' FINISH fired — only S's (gate 1300? no — at 1200 m neither FINISH fired) ⇒ stays unlocked and `finalize()` leaves it unmatched: assert phase not 'finished', lap null. (b) same (a) ride with pick=L: soft lock on L at 400 m advance (tied group {S,L}, pick=L); rider takes S's branch: L freezes at 1200, S advances; at S.adv ≈ 1400 (leads by 200) the engine SWITCHES — assert two lock events in `subscribeEvents` order: L (kind soft, pick L) then S (kind verified); final track S; **the ridden road wins over the pick**.
9. `prefix ride-through + finalize by completed line: same specs, ride the shared road then L's branch to 3000 m, no pick` — S freezes at 1200; L verified-locks ~200 m past the split; S's FINISH never fires (its gate 1300 is on the unridden branch — assert no S gate event leaks). Then a second sub-case for finalize's FINISH rule: ride to exactly 1350 m along S's branch **with a ride that also crossed S's FINISH at 1300** but never opened the margin (stop at 1350, margin 150 < 200): `finalize()` → S ('finalized' — the only candidate whose FINISH fired), sectors from S's gates, lap real.

New tests in `live_colour_suite.ts` (+2):
10. `pick wrong: a finished ride ranks against the RIDDEN route's ghosts` — drive clean_eveningb (fixtureSpecs+catalog irrelevant; use full-catalog specs) with pick=EveningA, `finalize()`, `rememberRide(engine.getState())`; assert `getLastRide().routeId === 'EveningB'` and `ghostsFor('EveningA')` does NOT contain the session entry while `ghostsFor('EveningB')` does (after `resetRecordedForTests` hygiene as in the existing B-44 tests).
11. `soft lock never colours before scoring` — engine state with `lockKind:'soft'`: `viewModelFromEngine`/`tierOf` path unchanged (colour still comes only from `live.track` history; assert a soft-locked state produces the same tiers as a verified one with identical sectors — colour honesty is keyed to the locked route id, which IS the displayed route).

Fixture note: tests 5–7 read the real catalog + WP-D1's refs.json — they are the promotion's regression lock. If they fail on margins, STOP and report the measured advances (do not tune LOCK constants — they are documented/ratified).

## Verification

1. Sandbox: `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL, count = WP-D1 baseline +11.
2. PC via device_bash: same run + `npx.cmd tsc --noEmit` clean.
3. Manual trace read: feed `data/activities/TEST in app rides/qualifire-20260819/qualifire-20260819-2025.gpx` (parseGpx, sorted) through a default engine with pick `StationHomeWet` in a scratch script (NOT committed): expect soft/verified lock on StationHomeWet — the 2026-08-19 "picked up EveningB mid-ride" failure is the acceptance story; report lock chainage + kind in your handover.

## Files touched

- `app/src/live/engine.ts` (candidates from specs; anchored; soft/verify/switch/finalize; state fields)
- `app/src/live/tracks.ts` (NEW — catalogTrackSpecs)
- `app/src/live/refs.ts` (string ids, catalog-derived TRACK_IDS re-export)
- `app/core/src/types.ts` (TrackId = string)
- `app/src/location/index.ts` (startTracking opts; finalize on stop; sidecar lock fields)
- `app/src/ui/RecordScreen.tsx` (pass pick; finalize-then-remember; soft status wording)
- `app/src/ui/lastRide.ts` (gateSetVersion from catalog)
- `app/tests/lib.ts` (fixtureSpecs helper)
- `app/tests/live_suite.ts` (+9), `app/tests/live_colour_suite.ts` (+2)

## Conflicts with cycle 023

**HIGH on `RecordScreen.tsx`** (023's auto-pause / paused-time-in-result work edits the same file — coordinator must order this brief after 023's diff and hand you the landed file). **MEDIUM on `engine.ts`/`location/index.ts`** if 023's off-route-while-on-course investigation touched projection or the feed path — check 023's diff for `app/core/src/live.ts`, `projection.ts`, `engine.ts` before starting; if it changed corridor/window constants, escalate to the coordinator before implementing (the anchored rule depends on corridor semantics).

## Pre-resolved ambiguities

- "Bias" = (a) pre-lock display + soft lock among genuinely tied candidates only after 400 m of evidence, (b) tie-breaks; never a reduced threshold. "Verify" = continued background candidates + switch toward 200 m-better evidence + finalize at ride end. Verified locks never unlock.
- ANCHOR_M = 300 (covers START gates ~160–290 + 50 m arming + noise; far below the ≥2500 m mid-line joins measured for every shadow pair).
- No pick ⇒ no soft lock (display stays 'detecting'; finalize still recovers the route at ride end). Headless relaunch has no pick by design; its degraded-but-honest behaviour is acceptable and covered by the existing relaunch test (which injects fixtureSpecs, hence unchanged).
- Buzz: unchanged mechanism (`gateFires` delta). Under a soft lock the buzzes are the soft candidate's fires; a later switch rebuilds sectors but past buzzes are not "taken back" (a gate WAS crossed on the shared road). Note this in the engine header comment.
- lap on switch: switching is impossible after phase 'finished'; before it, `this.lap` is null by construction (lap only forms at FINISH).
- `results.seed.json` stays as-is (it is already data; routes without seeds simply have empty ghost sets — verified in `ghostsFor`).

## NEEDS-NATHAN

- None. (The ruling itself was Nathan's; DECISIONS.md entry + B-41/COLD-START §10 follow-up edits are the coordinator's bookkeeping, not this brief.)

## Rollback

`engine.ts`/`tracks.ts` changes are pure-JS, display-layer only (D-023: nothing persisted). Revert the touched files and the old 4-track behaviour returns; refs/catalog from WP-D1 are inert without tracks.ts.
