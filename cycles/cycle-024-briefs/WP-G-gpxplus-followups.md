# WP-G — GPX+ follow-ups (B-69 hardening, route-match diagnostics + retry, elevation-spike flag, route-fidelity field)

**Executor model:** Sonnet, no other context. **Stop-on-ambiguity:** escalate, never guess. Cycle 023 is landing changes on this repo; every anchor below is from the 2026-08-20 snapshot — re-verify against the live file before each edit (see "Conflict with 023").

## Goal in Nathan's words
From B-69 (backlog line 74) and the 20 Aug rides 1–3 review: (1) the PAUSE/RESUME taps never reach the GPX+ button log, `escapeXml` doesn't escape `"` inside attribute values, and a hand-corrupted sidecar line can throw during export; (2) ride 3 never locked because the first fix sat at 97.7 m accuracy for ~13 s — log route-match diagnostics (accuracy at match time, threshold, per-candidate deviation, retries) and retry the match once accuracy settles; (3) every ride shows one ±5–13 m elevation spike in 1 s (barometer/GPS blend glitch) — flag it; (4) there is no per-point or session-level on/off-route data in GPX+, so "off-route while perfectly on course" (ride 4) can't be audited from an export.

## Current state (snapshot 2026-08-20)
- `app/src/ui/RecordScreen.tsx`: PAUSE button `onPress={() => setPauseMenu(true)}` (line 458), RESUME `onPress={() => setPauseMenu(false)}` (line 468). Imports from `'../location'` at lines 19–30 (no `noteButtonPress` yet).
- `app/src/location/index.ts`: `noteButtonPress(button: 'pause'|'resume')` EXISTS and works (lines 294–296) — it is simply never called. Background task appends fixes with `accuracyM: loc.coords.accuracy ?? undefined` (line 132) and feeds the engine `liveEngine.feed(lat, lon, timestamp)` (line 150) — accuracy is NOT passed to the engine. `stopTracking` 235–255 (logs `button:end`, ends ride, then `liveEngine.stop()`). `liveEngine.subscribeEvents` handler 300–313 maps EngineEvent `lock`/`gate` to sidecar events.
- `app/src/live/engine.ts` (393 lines): session-side wrapper (house rule in header: "adapt the session side, never the [core] engine"). `LOCK_MIN_ADVANCE_M = 400`, `LOCK_MARGIN_M = 200` (57–58). `Candidate` 107–117 (`proj: LiveProjector`, `adv`, `baseS`, `onRoute` — no last-xtd kept). `feed()` 174–223: lock fires when leader `adv >= 400` and leads by `>= 200`; lock emit block 208–219. `feedCandidate` 277–289 (gets `fix.xtd` from `proj.update` and drops it). `EngineEvent` union 86–88 (`lock` | `gate`).
- `app/core/src/live.ts`: `LiveProjector.update` returns `{ s, xtd, onRoute }`; corridor 40 m; forward-only; first fix anchors `sp` at the nearest vertex (84–87) — a 97.7 m-accuracy first fix mis-anchors a candidate and forward-only projection then freezes it: that is the ride-3 failure mechanism. Do NOT touch core.
- `app/core/src/projection.ts`: `CORRIDOR_M = 40`, `projectRideOffline(x, y, ref)` → `{ s, xtd }` per fix (offline, global re-acquisition — robust to junk head sections). Exported via `core/src/index.ts` (engine imports it from there); **check whether `CORRIDOR_M` is exported from the index barrel; if not, add it (additive)**.
- `app/src/live/refs.ts`: `refFor(track)` → `RefLine` from `tests/fixtures/refs.json`; `TRACK_IDS = ['Morning','EveningA','EveningB','MorningB']`. Pure, importable from storage code.
- `app/src/storage/eventsJsonl.ts` (23 lines): `KINDS = Set('meta','button','lock','gate','storageError','relaunch')` (line 4); `decodeEventsFile` validates ONLY kind + finite `tUnixMs` — a lock line missing `track` or `atT` passes the decoder.
- `app/src/storage/gpxExport.ts`: `escapeXml` (22–24) escapes only `& < >`; `num`, `isoTime` also exported.
- `app/src/storage/gpxPlusExport.ts` (219 lines): `buildSessionBlock` 87–175 emits qf:session children; `qf:routeLock` line 109 interpolates `escapeXml(lockEv.track)` (TypeError if `track` missing) and `isoTime(lockEv.atT * 1000)` (**`atT` missing → NaN date → `toISOString()` throws RangeError — the B-69 crash**); gate line 121 same class of risk (`g.t`, `g.track`). `buildGpxPlus` 181–219. Imports from core index: `computeKinematics, PROPOSED_GATES, toXY` (line 30).
- `app/src/storage/types.ts`: `RideEvent` union 110–111; `LockEvent` 84–91; `DecodedEvents` 113–116. `FixRecord.ele`/`accuracyM` optional.
- Tests: `app/tests/gpxplus_suite.ts` — 9 tests (a–i); test (e) 132–160 pins standard `exportGpx` byte-identical to stripped GPX+ (`stripGpxPlus` 33–47 drops the `xmlns:qf` attr and every line whose trimmed content starts `<extensions>`, `</extensions>`, `<qf:`, `</qf:` — any new session child that follows that shape strips cleanly). `engine_suite.ts` exists; `loadFixture('clean_morning')` gives `src.fixes.t/lat/lon/ele` arrays (usage: gpxplus_suite 164–177).
- Standing rules: D-023 raw ride JSONL never rewritten (sidecars/derived views only); "lock timing is never shortcut" (Nathan's 2026-08-20 lock-then-verify ruling); every GPX+ field honestly sourced — nothing fabricated when its source is absent.

## Changes

### Part 1 — B-69 (chore-tier pieces first)
1a. **RecordScreen wiring (CHORE — two one-liners + one import).** Add `noteButtonPress` to the `'../location'` import; PAUSE onPress → `{ noteButtonPress('pause'); setPauseMenu(true); }`; RESUME onPress → `{ noteButtonPress('resume'); setPauseMenu(false); }`. (Only these two; END/START are logged inside the location layer already.)

1b. **`escapeXml` quote-escaping** (`gpxExport.ts` 22–24): append `.replace(/"/g, '&quot;')` after the existing three replaces (`&` first stays first). This cannot change any existing export byte for real data (ride ids/track names contain no quotes) — test (e) must still pass untouched.

1c. **Sidecar validation instead of throwing** (`eventsJsonl.ts`): extend `decodeEventsFile` with per-kind required-field checks; a failing line increments `nDropped` (never throws, never "repairs"):
- `meta`: `Number.isFinite(schemaVersion)`
- `button`: `button` ∈ {start, pause, resume, end}
- `lock`: `typeof track === 'string'` && finite `atChainageM` && finite `atT`
- `gate`: `typeof track === 'string'` && finite `gateIndex` && finite `t` && `typeof estimated === 'boolean'`
- `storageError`: `typeof message === 'string'`
- `relaunch`: none beyond kind/tUnixMs
- `match` (new kind, Part 2): `status` ∈ {locked, retry, none} && finite `retries` (other fields optional)
Export code (`gpxPlusExport.ts`) then never sees a malformed event; no change needed at the use sites beyond Part 2's additions.

### Part 2 — route-match diagnostics + post-settle retry
Design ruling (pre-resolved): the retry lives in the SESSION-SIDE engine (`app/src/live/engine.ts`), not core and not the location layer — core stays untouched per its own header rule; the location layer only forwards accuracy. A retry RESETS the candidates and re-anchors them, which can only make the lock LATER (advance re-counts from the settle point; 400 m / 200 m rules unchanged) — "lock timing is never shortcut" is preserved by construction. State this in code comments.

2a. **Types** (`storage/types.ts` + `eventsJsonl.ts` KINDS): new event
```ts
export interface MatchEvent {
  kind: 'match'; tUnixMs: number;
  status: 'locked' | 'retry' | 'none';
  thresholdM: number; retries: number;
  accuracyM?: number;                       // accuracy of the triggering fix, when known
  candidates: { track: string; advM: number; xtdM: number }[];
}
```
Add to the `RideEvent` union and to `KINDS`.

2b. **Engine** (`app/src/live/engine.ts`):
- `feed(lat, lon, tUnixMs, accuracyM?: number)` — optional 4th param (existing callers/tests unaffected).
- New exported const `MATCH_RETRY_ACC_M = 30` (poor-accuracy threshold; ride-3 evidence: 97.7 m start settling to 4–6 m) and `MATCH_RETRY_ARM_FIXES = 30` (the poor-fix flag can only be ARMED during the first 30 fixes ≈ 30 s of detection, so a mid-ride GPS wobble never discards real progress).
- `Candidate` gains `lastXtd: number` (set from `fix.xtd` in `feedCandidate`).
- Private state: `poorStart = false`, `retries = 0`, `lastAccuracyM: number | null`.
- In `feed`, while `phase === 'detecting'`: record `lastAccuracyM`; if `accuracyM !== undefined && accuracyM > MATCH_RETRY_ACC_M && fixesFed <= MATCH_RETRY_ARM_FIXES` → `poorStart = true`. If `poorStart && retries === 0 && accuracyM !== undefined && accuracyM <= MATCH_RETRY_ACC_M` (and still detecting): snapshot candidate stats, rebuild `cands` exactly as `start()` does (fresh LiveProjector/GateDetector, empty events, `baseS = null`) — KEEP `tBuf/latBuf/lonBuf/fixesFed` (the offline recompute over the buffer is corridor-robust and stays honest) — `retries = 1`, emit EngineEvent `{ type:'match', status:'retry', thresholdM: MATCH_RETRY_ACC_M, retries, accuracyM, candidates: <pre-reset snapshot of {track, advM: c.adv, xtdM: c.lastXtd}> }`, then feed the current fix into the fresh candidates.
- At lock (existing block 208–219): additionally emit `{ type:'match', status:'locked', thresholdM, retries, accuracyM (of the locking fix, if given), candidates }` where candidates snapshots ALL candidates (leader included) BEFORE `this.cands = [lead]`.
- New accessor `getMatchDiagnostics(): { thresholdM: number; retries: number; lastAccuracyM: number | null; candidates: { track: string; advM: number; xtdM: number }[] }` (from live `cands`; empty array when idle).
- Extend the `EngineEvent` union accordingly.
2c. **Location layer** (`location/index.ts`):
- Line 150: `liveEngine.feed(lat, lon, timestamp, loc.coords.accuracy ?? undefined)`.
- `subscribeEvents` handler: add the `match` branch → `logEvent(session.rideId, { kind:'match', tUnixMs: Date.now(), ...ev-without-type })`.
- `stopTracking`: after the `button:end` log and BEFORE `liveEngine.stop()`: if `liveEngine.getState().phase === 'detecting'`, log `{ kind:'match', tUnixMs: Date.now(), status:'none', ...liveEngine.getMatchDiagnostics() }` — the honest "never locked" record for rides like 20 Aug ride 3.
2d. **GPX+ session block** (`gpxPlusExport.ts`, inside `buildSessionBlock`, only when `events !== null` and at least one match event exists — nothing fabricated): from the LAST match event emit
```
   <qf:matchDiag status=".." retries=".." thresholdM=".."( accuracyM="..")?>
    <qf:candidate track=".." advM=".." xtdM=".."/>...
   </qf:matchDiag>
```
(track through `escapeXml`, numbers through `num`; 3/4-space indent matching siblings; qf-only lines so the test-(e) strip stays clean).

### Part 3 — elevation-spike flag (export-time flag; raw untouched)
Ruling (pre-resolved per D-023): the recorder keeps writing raw `ele` verbatim; GPX+ FLAGS spikes; `<ele>` values are NOT altered anywhere (external tools get raw + the flag; the offline analysis pipeline can filter on its own later — out of this WP's scope, note it in the executor report only).
In `buildSessionBlock`: over the sorted fixes, for consecutive pairs where BOTH have finite `ele`, `gapS = dt`, flag when `gapS <= 1.5 && |Δele| > 5`. If any, emit
```
   <qf:eleSpikes count="N">
    <qf:eleSpike t="<isoTime of the later fix>" deltaM=".." gapS=".."/>   (first 20 only)
   </qf:eleSpikes>
```
Omit the block entirely when none (matches the outages/stops pattern).

### Part 4 — route fidelity (session-level; cheapest honest option)
Ruling (pre-resolved): session-level summary + off-route segments, NOT per-point (a per-point `<qf:dtr>` adds ~20 B × every trkpt for data that is derivable at export time; the session summary answers the audit question "was I off route, when, how far"). Only emitted when the ride LOCKED (no route ⇒ no honest distance-to-route claim).
In `gpxPlusExport.ts`: import `refFor` from `'../live/refs.ts'` (pure; reads tests/fixtures/refs.json — no expo/Node) and `projectRideOffline` (+ `CORRIDOR_M`, exporting it from `core/src/index.ts` if it isn't yet) from core. When a (validated) lock event exists and `refFor(track)` resolves (wrap in try/catch — unknown track ⇒ omit the block): `toXY(lats, lons, ref.lat0, ref.lon0)` → `projectRideOffline(x, y, ref)` → per-fix `xtd`. Emit
```
   <qf:routeFidelity track=".." corridorM="40" onRoutePct=".." maxXtdM="..">
    <qf:offRouteSeg fromT=".." toT=".." maxDistM=".."/>   (maximal runs of xtd > corridorM lasting >= 5 s; first 20)
   </qf:routeFidelity>
```
`onRoutePct` = 100 × (fixes with xtd ≤ corridor)/nFixes, one decimal; `maxXtdM` one decimal (cap the printed value at 999).

## Tests (expected: +9 over the re-baselined count; last known 145 total / 142 pass / 0 fail / 3 skip — 023 may have moved it, RE-BASELINE FIRST)
`gpxplus_suite.ts` (+6):
1. `escapeXml('a"b&<>')` → `a&quot;b&amp;&lt;&gt;`; and a storageError message containing `"` lands as `&quot;` in the export.
2. decoder validation: a lock line missing `track`, a lock with non-finite `atT`, a gate missing `t`, a button with `button:'bogus'` → all counted in `nDropped`, none in `events`; well-formed lines unaffected.
3. corrupted-sidecar export never throws: sidecar containing ONLY a malformed lock line → `exportGpxPlus` succeeds and emits `<qf:routeLock>none</qf:routeLock>` (the honest fallback).
4. eleSpikes: fixes with one +10 m jump in 1 s → `<qf:eleSpikes count="1">` with `deltaM="10"`; a clean ride → no `qf:eleSpikes` anywhere.
5. routeFidelity: clean_morning fixture ride + a valid lock event `track:"Morning"` → block present, `corridorM="40"`, `onRoutePct` > 90; no lock event → block absent.
6. match events: encode→decode identity for all three statuses (extend/beside test a), and a sidecar with a `match` event → `<qf:matchDiag status="none" retries="1"` … with one `<qf:candidate` per entry.
(Existing test (e) byte-identity and (f) round-trip re-run unchanged — they are the regression lock for every addition here.)
`engine_suite.ts` (+3):
7. post-settle retry: feed ~15 fixes of junk positions with `accuracyM = 90`, then clean_morning fixes with `accuracyM = 5` → exactly one `match/retry` event (correct thresholdM, retries 1), lock still achieved, and the lock chainage/time is NOT earlier than a control run fed only the clean fixes (never-shortcut guard).
8. steady good accuracy → zero retry events; the lock emits one `match/locked` event carrying all candidates with finite advM/xtdM.
9. accuracy degrades AFTER `MATCH_RETRY_ARM_FIXES` good fixes then recovers → no reset (arming window respected); `getMatchDiagnostics()` returns candidates + retries 0.

## Verification
- Sandbox-pure: `cd app && node --experimental-strip-types tests/run.ts` → zero FAIL; report counts before/after.
- Nathan's PC via device_bash (never git): `cd $HOME/mnt/Qualifire/app && npx.cmd tsc --noEmit` (confirm exact command against README-dev.md) → clean.
- RecordScreen wiring is tsx (not headless-covered): verified by tsc + a note for Nathan's next test ride (a PAUSE tap should now appear in `<qf:buttons>`).

## Files touched
`app/src/ui/RecordScreen.tsx`, `app/src/storage/gpxExport.ts`, `app/src/storage/eventsJsonl.ts`, `app/src/storage/types.ts`, `app/src/storage/gpxPlusExport.ts`, `app/src/live/engine.ts`, `app/src/location/index.ts`, `app/core/src/index.ts` (only if `CORRIDOR_M` needs exporting), `app/tests/gpxplus_suite.ts`, `app/tests/engine_suite.ts`.

## Conflict with 023 — CHECK-023-FIRST
- **G-A (HIGH):** 023's off-route-while-on-course investigation may itself add sidecar diagnostics, new `RideEvent` kinds, or qf: fields (its diagnosis plausibly overlaps Part 2 and Part 4 wholesale). Look for: new kinds in `storage/types.ts` / `KINDS` in `eventsJsonl.ts`, new `<qf:` emissions in `gpxPlusExport.ts`, any engine change around `onRoute`/corridor or `feed()`'s signature. If 023 landed an equivalent, adopt its schema and only fill the gaps (accuracy-at-match, per-candidate deviation, retry) instead of adding a parallel one.
- **G-B (MED):** 023's paused-time-toggle/auto-pause work edits RecordScreen near the PAUSE/RESUME handlers — the exact lines 1a touches. Re-anchor; the wiring is two calls into whatever handlers exist after 023.
- **G-C (LOW):** if 023 changed `LiveProjector`/corridor behaviour in core, re-run the never-shortcut control test (test 7) against the new baseline before asserting.

## Pre-resolved ambiguities
- Retry location: session-side engine; single retry per ride; threshold 30 m; armed only within the first 30 fixes; reset re-anchors candidates (lock can only be later — rule preserved). Buffers kept.
- Malformed sidecar lines are DROPPED (counted), never repaired — consistent with the decoder's existing tolerant doctrine.
- Elevation: flag at export, filter in analysis (separately, later); raw and `<ele>` untouched everywhere (D-023).
- Route fidelity: session-level + segments, lock-gated; no storage-schema change, no per-point bloat.
- `escapeXml` scope: `"` only (B-69's exact ask); `'` not added.
- Match diagnostics are surfaced in GPX+ (`qf:matchDiag`), not just the sidecar — Nathan's ride reviews are built from the export, and data that dies in the sidecar can't explain "every future weirdness".

## NEEDS-NATHAN
- Ratify the retry constants (30 m threshold / one retry / 30-fix arming window) — picked from the ride-3 evidence (97.7 m → 4–6 m settle in ~13 s); build proceeds, constants are one-line tunables.

## Rollback
All additive: new event kind, new optional param, new qf: blocks, two UI one-liners. Reverting the ten files restores byte-identical exports (test e is the lock); no data migration, sidecars with `match` events simply decode as dropped lines under old code (tolerant decoder).
