# 06 — START-gate lag: S1 and the selfs must appear the instant the START gate is crossed

> ## Resume point (Plan tier, 2026-10-03 — read this first)
> **§1 (`app/src/live/engine.ts`, (a)-(i)) is already applied and green; continue with §2.**
> The first executor stopped on two anchor mismatches; both are ruled below and every other
> anchor in §2-§7 and the Verification plan has been re-read against the CURRENT working tree
> (briefs 04, 01, 03, 05, 08 of this cycle are applied, uncommitted; `git diff
> app/src/live/engine.ts` shows exactly §1). Measured on this tree: **788 tests / 785 pass /
> 0 fail / 3 skip, `tsc --noEmit` exit 0** — that is the new "before" baseline (Verification 1).
> Expected after §2-§7: **797 tests / 794 pass / 0 fail / 3 skip** (+6 live E1-E6, +3 selfrace
> L1-L3). E1-E6 and L1-L3 were dry-run by the Plan tier against the applied engine (and a scratch
> copy of `selfRaceModel.ts` with §3 applied): 9/9 pass as written here. Do not re-apply §1.
> - **Ruling (1), §6:** brief 03 changed `rideNotificationFor()` to return `{ whenMs, label }`;
>   `subText` no longer exists. §6 is rewritten below: assert `pre?.label === 'S1'`, the target
>   test is `'ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the
>   last gate'` (line 46, `const s4 = …` at line 48).
> - **Ruling (2), §7:** only `live_colour_suite.ts` (line 53) and `rankingreveal_suite.ts` (line
>   59) carry the `chainageM: null,` anchor — add `displayTrack: null,` after it in those two.
>   `resultsstore_suite.ts` `finishedState` and `timing_suite.ts` `stateWith` already omit
>   `startGateT`/`chainageM`; leave them untouched (the `as` cast compiles; adding one field to a
>   literal that omits two others would be a half-measure). "Four helpers" → **two files**.
> - `app/src/ui/selfRaceModel.ts` has **CRLF** line endings — edit it with a script that
>   preserves `\r\n` (a Python read-modify-write on the decoded text, re-encoded with CRLF, or
>   `sed` without touching the terminators). Every other file touched here is LF.
> - Hard rule unchanged: if an anchor quoted below is still not where it says, stop and report.

**Source: Nathan, 2026-10-01** — on real rides the app takes "a very long time" (1-2 minutes
into the ride) to show that the START gate was crossed: no current-sector label (`S1`), no
selfs (past-ride replay dots) until well after the gate. His hypothesis: asset loading (self
tracks) is slow, so prepare everything on the setup screen / between START and the gate.
Ruling from the investigation below: **the hypothesis is not the cause.** Loading is a
side-effect of the real cause — the engine does not *display* anything about the picked way
until the way is **locked**, and the lock is a 400 m evidence rule measured from the first
good fix, which lands ~110-240 m *past* the START gate on every catalog way. Self tracks are
only requested after that lock, so they arrive even later. Fix both: show the pick's own
candidate from START press (display-only, lock race untouched), and preload the selfs on the
setup screen.

**Status: §1 applied (uncommitted), §2-§7 pending — see the Resume point above.** Written
2026-10-02 by the Plan tier (Fable) against the working tree (branch `virgin`, HEAD `ae911bb`);
re-anchored 2026-10-03 against the tree with briefs 04/01/03/05/08 + §1 applied (measured:
**788 tests / 785 pass / 0 fail / 3 skip**). Engine line numbers in "Root cause" / "Evidence"
are the pre-§1 numbering (historical; §1 is done). Executor: Sonnet, cold, this file only.

## What this changes on the phone — and what it does not

- **Stays exactly as today:** the raw ride JSONL, every GPX+ sidecar event (`lock`, `lockChange`,
  `gate`, diagnostics — same events, same instants), gate detection, the 400 m / 200 m lock race,
  soft/verified/finalized semantics, finalize()'s recovery, `rememberRide`, ranking, the buzz,
  the status line wording (`<way> · your pick · confirming…` stays until the soft lock), sector
  colours (still only once `live.track` is non-null — D-025 untouched).
- **Changes (display only):** under a RECORD-tab pick, the live strip / `S<n>` label / flash chip /
  notification sub-text / `startGateT` / `chainageM` describe the **pick's own candidate from the
  moment START is pressed**, not from the lock. At the START crossing `S1` appears on the next
  fix (≤1 s) and the selfs start moving. The selfs are **loaded on the setup screen** as soon as a
  way is picked (and re-loaded when the window or the gate set changes), so they are already on
  the map — parked at the START gate in their `waiting` state — when START is pressed.
- With **no pick** (from/to pair with no route): nothing changes — there is no candidate to
  presume, the lock still reveals the way at ~400 m. See Decision 6.
- **JS only → OTA-able** (`publish-preview` / EAS Update). No native change, no new build.

## Root cause — ranked, with what code alone can and cannot prove

Three candidate causes were put to the code (all line numbers read 2026-10-02):

**(1) Route-lock latency — THE cause (proven from code + measured on the archive fixtures).**
- `app/src/live/engine.ts` `getState()` lines 615-653: `currentSector` is derived from
  `this.locked?.det` (line 616-620), `startGateT` from `this.locked.events` (633-636),
  `chainageM` from `this.locked.proj` (652), `sectors` from `this.sectors`, which only
  `recompute()` writes (850-918) and `recompute()` returns at once when `this.locked` is null
  (851-852). So **before a lock the state carries nothing about any candidate** — even though
  the pick's own `GateDetector` has already fired gate 0 and kept the event (`feedCandidate`
  lines 841-844, `c.events.push`). `gateFires` is the one exception (627-629: max over all
  candidates) — which is why Nathan *feels the buzz* at the gate but sees no `S1`.
- The lock needs `adv >= LOCK_MIN_ADVANCE_M` (400 m, line 105) of corridor-verified advance on
  the pick's candidate (`evaluateLockState` 750-756: soft at 400 m of the pick's own advance,
  verified when it is also the unblocked leader). `adv = chainage − baseS` (838); `baseS` is
  the chainage of the **first unflagged fix** (826-827). START gates sit ~160-290 m into every
  way (ANCHOR_M comment, 150-155), so a lock can never come before chainage ≈ 400 m + whatever
  was discounted — i.e. **≥110-240 m after START**, plus every metre ridden before the first
  good fix (warm-up fixes are not fed at all: `feed()` line 425 `if (flagged === true) return;`,
  flags from `app/src/location/fixFlags.ts` — a fix is `warmup` until accuracy ≤ 20 m, cap 60 s)
  and plus any advance discounted by the off-corridor rule (836: `if (jump > REACQ_JUMP_M ||
  !wasOnWay) c.baseS += jump` — a noisy doorstep start eats advance).
- **Measured** (scratch script over `app/tests/fixtures`, engine fed with the fixture's own
  track as `pickId`, archive rides so GPS was already warm — a lower bound for the phone):

  | fixture | first fix → gate 0 | first fix → lock | **gate 0 → lock** |
  |---|---|---|---|
  | clean_morning | 40.0 s | 79.0 s (verified, ch 405 m) | **39.0 s** |
  | clean_eveninga | 59.5 s | 102.0 s (verified, 405 m) | **42.5 s** |
  | clean_eveningb | 12.5 s | 74.0 s (verified, 511 m) | **61.5 s** |
  | detour_eveningb | 65.6 s | 108.0 s (verified, 447 m) | **42.4 s** |
  | latelock_20260805 | (gate 0 skipped — late GPS) | 70.0 s | n/a |

  Add the phone's warm-up (fixes with accuracy > 20 m are not fed; 2026-08-25 showed 22 s of
  such fixes), a traffic light near the start, and the first ~50-100 m ridden off the corridor
  from a front door, and 1-2 minutes after START is exactly what this rule produces.
- The same numbers are in **every ride Nathan already has**: the sidecar
  `rides/<id>.events.jsonl` logs the `lock` event (`atT`) and, replayed at that lock, the
  gate-0 `gate` event with its true crossing `t` (`app/src/location/index.ts` 585-611).
  `lock.atT − gate(0).t` is the lag he saw. No new instrumentation is needed to confirm it.

**(2) START-crossing detection — NOT a cause.** `app/core/src/live.ts` `GateDetector.update`
(144-169): a gate fires on the very fix whose chainage reaches it (`prevS < g && s >= g`),
interpolated between the two bracketing fixes, no debounce, no approach-side requirement, no
minimum distance; the only latch is monotonic chainage. Pre-lock the event is kept on the
candidate (engine 843) with its exact time — which is why the replayed `gate` event at the
lock carries the true crossing time, and why `startGateT` after this fix will be the SAME
number before and after the lock (pinned by test E3 below).

**(3) Self-track loading — a real but secondary delay, and a consequence of (1).**
`app/src/ui/RecordScreen.tsx` 1084-1095: the loader runs in a `useEffect` keyed on
`live.track`, i.e. **only after the lock**. `app/src/ui/selfRaceModel.ts` `loadSelfTracksFor`
(280-356): per window ride (≤ 9, `WINDOW_PREV`) one `fs.readText` of the whole
`rides/<id>.jsonl`, `decodeRideFile` (one `JSON.parse` per line — a 25-min 1 Hz ride is ~1500
lines, ~150-250 KB), `deriveGateCrossings` (`store/derive.ts` 155-172 → `projectRideOffline`,
O(n × ~60 segments) — trivial), decimation; sequential `await`s, no yield between rides,
module-level cache keyed `rideId:gateSetVersion` that is **empty on every cold launch**. Code
alone cannot time this on the phone; a plausible envelope is 30-150 ms per ride → 0.3-1.5 s
for a full window on a mid-range phone, sync JSON parsing on the JS thread in that window.
That is seconds after the lock, never minutes — but it is pure waste to start it only at the
lock when the way is known on the setup screen. The loader already `console.log`s skips
(353); this brief adds one harmless timing line (Decision 7) so the on-device cost is read
off `adb logcat`/Metro once and the envelope above stops being a guess.

**What could not be proven from code:** the exact per-ride load time on the phone (Decision 7
logs it), and how much of Nathan's 1-2 min is warm-up vs. the 400 m rule on a given day (his
sidecars answer it: `lock.atT − gate(0).t` vs. the first unflagged fix's `tUnixMs`).

## Evidence (read 2026-10-02)

- `app/src/live/engine.ts` 270-308 `LiveEngineState` (fields `phase, track, sectors,
  currentSector, lastDone, lap, gateFires, fixesFed, onWay, lockKind, pick, pickHonoured,
  anyAnchored, startGateT, chainageM`); 339-359 private fields (`specs, phase, cands, locked,
  lockKind, pick, pickHonoured, sectors, lap, fixesFed, onWay, tBuf, latBuf, lonBuf,
  listeners, evListeners, diagListeners`); 367-402 `start()` (375 `this.sectors =
  pendingSectors(pickSpec ? pickSpec.gates.length - 1 : N_SECTORS_DEFAULT)`); 404-412
  `stop()`; 424-512 `feed()` — 452-509 the detecting/soft branch, 455 `const poorNow = …`,
  456 `for (const c of this.cands) {`, 464-481 the retry block, 482 `const wasAnchored = …`,
  486 `const evs = this.feedCandidate(c, lat, lon, tSec);`, 487-494 `if (c === this.locked &&
  evs.length > 0) {…}`, 507 `if (this.phase !== 'finished') this.evaluateLockState(…)`,
  510 `if (lockedFired && this.locked) this.recompute();`, 511 `this.emit();`; 519-613
  `finalize()` — 520 `if (this.lockKind === 'verified') return;`, 551-564 the
  `finished.length === 0` branch; 615-654 `getState()`; 850-943 `recompute()` — 851-852
  `const cand = this.locked; if (!cand) return;`, 923 `if (evFin && this.lap === null) {`,
  940-941 `this.lap = …; this.phase = 'finished';`.
- `app/src/ui/RecordScreen.tsx` (**re-read 2026-10-03 after brief 08's rewrite; 1693 lines**):
  47 `import { loadSelfTracks, selfDotsAt, selfLivePosition, type SelfDot, type SelfTrack } from
  './selfRaceModel.ts';`; 46 `import { ghostsFor, lapValues, sectorValues, tierFor } from
  './colourModel';`; 60 `import { createExpoFsAdapter } from '../storage/expoFsAdapter';`; 78
  `currentCatalog`, 79 `gateSetFor`; 17 `useCallback, useEffect, useMemo, useRef, useState`.
  **1012-1071 the self block** (1012 comment `// virgin-cycle6 (self racing), Task 5. Loading:
  fire-and-forget, same` … 1023 `const [selfTracks, setSelfTracks] = useState<SelfTrack[]>([]);`
  … load effect keyed `[live.track, settings.selfDots]` ending 1035; 1043-1056 the 250 ms tick
  effect keyed `[phase, selfTracks, live.startGateT]`; 1058-1062 the `revealHoldRef` unmount
  cleanup effect (`useEffect(() => () => { … }, []);` — it sits INSIDE the block and moves
  verbatim with it, harmless); 1067-1071 the `livePos` useMemo ending `}, [selfDots,
  live.chainageM, live.startGateT, live.lap, settings.selfDots]);`). 1096 `const route =
  CATALOG.routes.find(`; 1100 `const ghostCount = routeWays.reduce((n, r) => n +
  ghostsFor(r.id).length, 0);`; 1101-1105 `pickedWay`; 1116-1117 `const pickedWayRef =
  useRef<Way | null>(null);` / `pickedWayRef.current = pickedWay;`; 1303
  `selfs={settings.selfDots ? selfDots : undefined}`; 1320 `livePos,`. **Between 1071 and 1117
  nothing references `selfTracks`, `selfDots` or `livePos`** (next references: 1303, 1320 —
  grep before moving, Executor rule). Other `live.track` readers: 969 `mapOverlay`, 975-976
  `tierOf`, 1005/1009 `sectorColours` — brief 08 removed the status lines and `wayLine`.
- `app/src/ui/liveView.tsx` 204-209: `contextLabel = st.phase === 'finished' ? '' :
  st.currentSector !== null ? `S${st.currentSector}` : ''` — the on-screen `S1`.
- `app/src/location/rideNotificationPolicy.ts` 44-48: `else if (st.currentSector !== null)
  subText = `S${st.currentSector}`;` — the notification `S1`; fed by `liveEngine.subscribe` in
  `app/src/location/index.ts` 562-564.
- `app/src/location/index.ts` 429-432 `liveEngine.start({ pickId: opts?.wayPick ?? null,
  wayIds: … })` — the pick reaches the engine at START press; 185 (headless relaunch)
  re-arms with `pickId: null` (out of scope, see below).
- `app/src/ui/selfRaceModel.ts` 236-241 constants, 257-260 `const trackCache = new Map<string,
  SelfTrack>();`, 271-275 `loadSelfTracks`, 280-356 `loadSelfTracksFor` (288 `for (const
  result of window) {`, 294-304 cache hit, 343 `trackCache.set(cacheKey, track);`, 352-355 the
  skip log).
- Tests: `app/tests/live_suite.ts` 1391 lines, ends with the cycle025 stale-fix test; helpers
  `buildSyntheticRef` (779-786), `SYN_L` (796-798: line 0→3005 m, gates `[100, 800, 1500,
  2200, 2900]`), `xyToLatLon`/`numEq`/`DiagnosticEvent`/`EngineEvent` imported (13-21),
  `LiveEngine` at 39-40. `app/tests/selfrace_suite.ts` 554 lines; helpers `makeResult`
  (52-68), `pointAtChainage` (74-85), `fixLine` (87-89), `FAR_FUTURE_MS`, `createMemoryFsAdapter`,
  `replaceRecorded`/`resetRecordedForTests`, `catalogTrackSpecs`, `loadSelfTracks` imported
  (33-43); `loadSelfTracksFor` is NOT yet destructured there (destructure at 34-36). `app/tests/
  ridenotification_suite.ts` (rewritten by brief 03): 46-54 the S-label test, now asserting
  `s1?.label === 'S1'` on a `{ whenMs, label }` return. Of the four suites that build
  `LiveEngineState` literals with an `as` cast, only `live_colour_suite.ts` (52-53) and
  `rankingreveal_suite.ts` (58-59) list `startGateT: null, chainageM: null,`;
  `resultsstore_suite.ts` (48-55) and `timing_suite.ts` (71-77) end at `anyAnchored: false,`.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor in §2-§7 and the Verification plan was re-read on 2026-10-03 against the current tree (Resume point). If a quoted line is not
  where the brief says, or a name differs, stop and report (file, line, expected, found).
  Never guess, never patch around it, never rule on an open question yourself.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is `mv`'d
  aside, never deleted). **Never delete** — `safe_to_delete/` is the bin.
- No `npm install`, no `npx …`, no `eas …`. Verification is `cd app && node
  --experimental-strip-types tests/run.ts` and `cd app && ./node_modules/.bin/tsc --noEmit`.
  Never grep the whole repo or `node_modules` — `timeout 40 grep -n` on the named files only.
- **Files touched — exactly these, nothing else:**
  - EDIT `app/src/live/engine.ts` — DONE (§1 applied; do not re-apply)
  - EDIT `app/src/ui/RecordScreen.tsx`
  - EDIT `app/src/ui/selfRaceModel.ts`
  - EDIT `app/tests/live_suite.ts` (append)
  - EDIT `app/tests/selfrace_suite.ts` (append + one destructure)
  - EDIT `app/tests/ridenotification_suite.ts` (one assertion)
  - EDIT `app/tests/live_colour_suite.ts` and `app/tests/rankingreveal_suite.ts` (one added
    line each — mechanical; ruling (2): NOT `resultsstore_suite.ts` / `timing_suite.ts`)
- Do **not** touch: `app/core/**`, `app/src/location/**`, `liveView.tsx`, `lastRide.ts`,
  `colourModel.ts`, `recordFlow.ts`, `wayMapView.tsx`, `storage/**`, `tests/run.ts` (no new suite
  file), `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, this folder's other files.

## Goal

After the OTA: pick a way on RECORD → the selfs for that way load in the background while the
rider is still on the setup/armed screen. Press START → the live map shows the selfs parked at
the START gate (`waiting`), the strip is all pending, the status line says `<way> · your pick ·
confirming…`. Cross the START gate → on the next fix (≤1 s) `S1` is the context label, the
notification sub-text reads `S1`, the selfs start racing, `P<n>` appears. The lock still fires
~400 m in exactly as today (same `lock`/`gate` sidecar events, same instants), and the status
line flips to `way locked (your pick) · verifying` with nothing else on screen changing. Headless
suite: 788 → **797** (+6 engine, +3 loader; plus one assertion inside the existing
notification-policy test), `tsc` clean.

## Decisions

1. **Engine: a display candidate, never a lock change.** New private helper `displayCand()` =
   `this.locked`, else (pick set, not ended) the pick's own candidate, else null. `getState()`
   derives `currentSector`, `lastDone`, `startGateT`, `chainageM` and exposes a new
   `displayTrack` from it. **`track` keeps meaning the lock verdict** (every existing
   `track === null` pre-lock assertion stays true; `rememberRide`, ranking, `mapOverlay`,
   colours all key on `track`). Rationale: under the hard pick (file header, Nathan 2026-08-29)
   the pick's candidate is the ONLY candidate this ride can ever display — showing its progress
   before the 400 m is a presumption about *when* the display starts, not *what* is displayed.
   The 400 m evidence rule itself is not touched: `evaluateLockState`, `commitLock`, `finalize`,
   `emitEvent` are unchanged, so the ride record is byte-identical.
2. **`sectors` follow the display candidate** via `recompute()` reading `displayCand()` instead
   of `this.locked`, run when the display candidate fires a gate (or is re-seeded by the
   cycle-023 retry) while there is no lock yet. **Guard:** the D-022 lap handover inside
   `recompute()` (`this.lap = …; this.phase = 'finished'`) runs **only for `this.locked`** — a
   provisional candidate that reaches FINISH before 400 m of advance (a very short way) shows
   its sectors but never scores a lap and never flips `phase`, because `phase === 'finished'`
   gates `evaluateLockState` (line 507) and `finalize()` alone decides such a ride (its own
   `gates[last] − baseS >= 400` rule, 547-550). Pinned by test E4.
3. **`finalize()` ends the presumption.** A new `ended` flag (set at the top of `finalize()`,
   reset in `start()`) makes `displayCand()` return only `this.locked`; in the
   unmatched branch (`finished.length === 0 && lockKind === 'none'`) `this.sectors` is reset to
   pending so no provisional strip survives into `rememberRide`/Result. (`stop()` already empties
   `cands`, so nothing is displayed after it.)
4. **No event is emitted pre-lock.** Speculative-fire suppression (engine 483-494) stays: the
   pick's gate-0 event reaches the sidecar only replayed at the lock, as today. The display reads
   the candidate's kept event directly; `startGateT` before and after the lock is the same
   number (test E3).
5. **Selfs preload on RECORD's setup/armed screen and persist through the ride.** RecordScreen's
   self blocks move below `pickedWayRef` and key on `selfWayId = live.displayTrack ??
   pickedWay?.id ?? null`: on setup/armed that is the pick (engine idle → `displayTrack` null),
   from START press on it is the engine's display candidate — the **same id**, so the effect
   does not re-run at START and the loaded tracks carry straight over; at the lock
   `displayTrack` is unchanged (locked === pick) — again no re-run. Deps also carry
   `selfGateSetVersion` (gate edit → reload under new cache keys) and `selfWindowKey` (the
   window's ride ids joined — a ride just saved changes it the moment `rememberRide` stores the
   result, so the next setup screen reloads with the new ride; cheap: `ghostsFor` is a filter
   over the in-memory results, computed per render like `ghostCount` already is at line 1100).
6. **No pick → no preload, no presumption.** Without a pick (from/to pair without a route) the
   engine cannot name a candidate before 400 m of evidence; guessing one on screen would be the
   "silent reassignment" the hard pick exists to prevent. Preloading every sport-scoped
   candidate's window (up to ~20 ways × 9 rides) on speculation was considered and rejected:
   unbounded I/O for a case (riding endpoints the catalog has no route for) that by
   construction has little or no self history. The post-lock load path stays as the fallback
   (same effect, `selfWayId` becomes `displayTrack` at the lock).
7. **Loader: yield between rides, bound the cache, log the cost.** `loadSelfTracksFor` awaits
   a `setTimeout(0)` between window rides so a cold-cache load never holds the JS thread for
   more than one ride's parse (~tens of ms); `trackCache` becomes LRU-bounded at
   `TRACK_CACHE_MAX = 90` (10 ways' full windows; one decimated 25-min track is ~25 KB → < 2.5 MB
   worst case); one `console.log('[selfRaceModel] loadSelfTracks(<way>): <n> tracks (<hits>
   cached) in <ms> ms')` per call — read once on-device, then it stays as the only timing
   instrument this brief adds. Failure modes unchanged: never throws, one bad file is skipped.
8. **Colours stay keyed on `live.track`** (`tierOf`, `sectorColours`, RecordScreen 974-1010).
   D-025 is a ruling; a provisional `S1` done before the lock shows neutral until the lock, then
   coloured — identical to today's post-lock colouring, a few seconds later at most. Not widened
   here (Open call A).
9. **Parked selfs before the crossing are intended.** `selfDotsAt(tracks, null)` already defines
   the `waiting` state at each self's own START position (selfRaceModel 142-157); today it is
   simply never reached because tracks arrived after the lock. From START press the dots sit on
   the gate — a visible marker of where `S1` begins. (Open call B.)

## Files to touch

### 1. EDIT `app/src/live/engine.ts` — **ALREADY APPLIED (a)-(i), verified 2026-10-03. Skip to §2.**

(a) **File header** — after the `FREE MODE — retired …` paragraph (ends line 88 `* engine mode.
One mode remains: the lock/verify machinery below.`), before the closing ` */` on line 89,
insert:
```
 *
 * DISPLAY CANDIDATE (virgin-cycle20 06, Nathan 2026-10-01 "S1 and the selfs
 * only show 1-2 minutes into the ride"): the lock needs 400 m of evidence
 * measured from the first good fix — ~110-240 m PAST every START gate — so
 * nothing about the way used to be displayed until then. Under a RECORD-tab
 * pick the pick's own candidate is the only one this ride can ever display,
 * so getState() now describes it from start() on (`displayTrack`,
 * currentSector, lastDone, sectors, startGateT, chainageM). Display-only:
 * `track` is still the lock verdict, no event is emitted before the lock, the
 * lock race / finalize() / the ride record are untouched, and recompute()
 * scores a lap (D-022) only for the LOCKED candidate.
```

(b) **`LiveEngineState`** — after the `chainageM: number | null;` member (line 307), add:
```ts
  /** virgin-cycle20 06: the candidate whose live progress is on screen — `track`
   * once locked; before any lock, under a RECORD-tab pick, the pick's own
   * candidate (the only one a picked ride can ever display — see the file
   * header's DISPLAY CANDIDATE). null with no pick and no lock, and after
   * finalize() left the ride unmatched. currentSector / lastDone / sectors /
   * startGateT / chainageM describe THIS candidate. Display-only presumption:
   * `track`, the lock race, the event record and finalize() are untouched. */
  displayTrack: TrackId | null;
```

(c) **Private field** — after line 353 `private onWay = false;` add:
```ts
  /** virgin-cycle20 06: true from finalize() until the next start() — ends the
   * pre-lock display presumption (displayCand() then returns only `locked`). */
  private ended = false;
```

(d) **`start()`** — after line 372 `this.pickHonoured = false;` add `    this.ended = false;`.

(e) **`feed()`, detecting branch.** Replace lines 455-456
```ts
      const poorNow = accuracyM !== undefined && accuracyM > POOR_ACCURACY_M;
      for (const c of this.cands) {
```
with
```ts
      const poorNow = accuracyM !== undefined && accuracyM > POOR_ACCURACY_M;
      // virgin-cycle20 06: the pre-lock display candidate (the pick's own, or
      // null). Its gate fires / re-seeds rebuild `sectors` below exactly as a
      // locked candidate's do — display only, nothing is emitted for it.
      const disp = this.locked === null ? this.displayCand() : null;
      for (const c of this.cands) {
```
and replace line 437 `    let lockedFired = false;` with
```ts
    let lockedFired = false;
    let displayDirty = false; // virgin-cycle20 06: see `disp` below
```
Inside the retry block, after line 475 `c.lastXtd = 999; // fresh candidate: nothing fed yet
this instant` add:
```ts
          if (c === disp) displayDirty = true; // re-seeded: its kept events are gone
```
After the `if (c === this.locked && evs.length > 0) { … }` block (ends line 494), add:
```ts
        if (c === disp && evs.length > 0) displayDirty = true;
```
Replace line 510
```ts
    if (lockedFired && this.locked) this.recompute();
```
with
```ts
    if (lockedFired && this.locked) this.recompute();
    // virgin-cycle20 06: a display-candidate fire/re-seed with STILL no lock
    // (a lock on this same fix already recomputed inside commitLock).
    else if (displayDirty && this.locked === null && !this.ended) this.recompute();
```

(f) **`finalize()`** — insert `    this.ended = true;` as the FIRST statement (before line 520
`if (this.lockKind === 'verified') return;`). In the unmatched branch, replace lines 561-563
```ts
      }
      this.emit();
      return;
```
with
```ts
      } else {
        // virgin-cycle20 06: never locked → the pre-lock display presumption is
        // withdrawn with the ride (nothing provisional reaches rememberRide/Result).
        this.sectors = pendingSectors(this.sectors.length);
      }
      this.emit();
      return;
```
(The `if (this.lockKind === 'soft') {…}` at 555-561 gains this `else`.)

(g) **`getState()`** — replace lines 616-618
```ts
    const det = this.locked?.det ?? null;
    const next = det ? det.nextGateIndex : 0;
    const nGates = this.locked ? this.locked.gates.length : this.sectors.length + 1;
```
with
```ts
    // virgin-cycle20 06: everything positional below reads the DISPLAY candidate
    // (locked, else the pick's own pre-lock); `track`/`gateFires` keep today's rule.
    const disp = this.displayCand();
    const det = disp?.det ?? null;
    const next = det ? det.nextGateIndex : 0;
    const nGates = disp ? disp.gates.length : this.sectors.length + 1;
```
Replace lines 622-626 (`if (this.locked) { for (const e of this.locked.events) …`) to iterate
`disp.events` under `if (disp)`. Replace lines 633-636 (`if (this.locked) { const g0 =
this.locked.events.find(…)`) likewise with `disp`. In the returned object add
`displayTrack: disp ? disp.track : null,` after `track: …` and change line 652 to
`chainageM: disp ? disp.proj.chainage : null,`. `track`, `gateFires`, `anyAnchored`, `lap`,
`phase`, `lockKind`, `pick`, `pickHonoured`, `onWay`, `fixesFed` are unchanged.

(h) **New private helper** — directly above `private pickLeader()` (line 698's doc comment):
```ts
  /** virgin-cycle20 06: the candidate getState()/recompute() describe — the lock
   * when there is one; otherwise, under a RECORD-tab pick and until finalize(),
   * the pick's own candidate (display-only presumption, see the file header). */
  private displayCand(): Candidate | null {
    if (this.locked) return this.locked;
    if (this.pick === null || this.ended) return null;
    return this.cands.find((c) => c.track === this.pick) ?? null;
  }
```

(i) **`recompute()`** — replace lines 851-852
```ts
    const cand = this.locked;
    if (!cand) return;
```
with
```ts
    const cand = this.displayCand();
    if (!cand) return;
```
and line 923
```ts
    if (evFin && this.lap === null) {
```
with
```ts
    // virgin-cycle20 06: D-022's handover is the LOCKED candidate's alone — a
    // pre-lock display candidate shows its sectors but never scores a lap nor
    // flips phase (phase==='finished' gates evaluateLockState; finalize() rules).
    if (evFin && this.lap === null && cand === this.locked) {
```

### 2. EDIT `app/src/ui/RecordScreen.tsx`

(a) **Move** the whole block lines **1012-1071** (from the comment line 1012 `  // virgin-cycle6
(self racing), Task 5. Loading: fire-and-forget, same` through the `livePos` useMemo's closing
line 1071 `  }, [selfDots, live.chainageM, live.startGateT, live.lap, settings.selfDots]);`) to
directly after line **1117** `  pickedWayRef.current = pickedWay;` (keep one blank line on each
side). The block contains, in order: the load comment + state + effect (1012-1035), the tick
comment + state + effect (1037-1056), the `revealHoldRef` unmount-cleanup effect (1058-1062 —
moves verbatim, it is dependency-free) and the `livePos` comment + useMemo (1064-1071). First
`timeout 40 grep -n "selfTracks\|selfDots\|livePos" app/src/ui/RecordScreen.tsx` and confirm no
reference lies between the old and new positions (expected: none between 1071 and 1117; next
references at 1303 `selfs={…}` and 1320 `livePos,`); if one does, stop and report.

(b) In the moved block, replace the state + load effect
```ts
  const [selfTracks, setSelfTracks] = useState<SelfTrack[]>([]);
  useEffect(() => {
    if (live.track === null || !settings.selfDots) {
      setSelfTracks([]);
      return;
    }
    let cancelled = false;
    const gateSetVersion = gateSetFor(currentCatalog(), live.track)?.version ?? 1;
    void loadSelfTracks(live.track, gateSetVersion, createExpoFsAdapter()).then((tracks) => {
      if (!cancelled) setSelfTracks(tracks);
    });
    return () => { cancelled = true; };
  }, [live.track, settings.selfDots]);
```
with
```ts
  // virgin-cycle20 06 (Nathan 2026-10-01, START-gate lag): the selfs belong to the
  // way that is ON SCREEN, not to the lock — during a ride the engine's display
  // candidate (the pick from START press, the lock afterwards: the same id, so
  // nothing reloads at START or at the lock), on the setup/armed screen the pick
  // itself. So the window is read from disk while the rider is still choosing /
  // arming, and is already on the map (parked at the START gate) when START is
  // pressed. Reload triggers: another way picked, a gate-set edit (new cache
  // keys), or the window itself changing — a ride just saved joins ghostsFor()'s
  // slice the moment rememberRide stores it. ghostsFor is a filter over the
  // in-memory results (ghostCount above already calls it per render).
  const selfWayId = live.displayTrack ?? pickedWay?.id ?? null;
  const selfGateSetVersion = selfWayId === null ? 1 : (gateSetFor(currentCatalog(), selfWayId)?.version ?? 1);
  const selfWindowKey = selfWayId === null ? '' : ghostsFor(selfWayId).map((r) => r.rideId).join(',');
  const [selfTracks, setSelfTracks] = useState<SelfTrack[]>([]);
  useEffect(() => {
    if (selfWayId === null || !settings.selfDots) {
      setSelfTracks([]);
      return;
    }
    let cancelled = false;
    void loadSelfTracks(selfWayId, selfGateSetVersion, createExpoFsAdapter()).then((tracks) => {
      if (!cancelled) setSelfTracks(tracks);
    });
    return () => { cancelled = true; };
  }, [selfWayId, selfGateSetVersion, selfWindowKey, settings.selfDots]);
```
The old comment block (lines 1012-1022, `// virgin-cycle6 (self racing), Task 5. Loading: …`
through `// exact shape to mirror; this is the established one.`) is replaced by the new comment
above. The tick effect and the `livePos` useMemo move verbatim. `useState`,
`useEffect`, `useMemo`, `gateSetFor`, `currentCatalog`, `ghostsFor`, `createExpoFsAdapter`,
`loadSelfTracks` are already imported (verify with grep; if `createExpoFsAdapter` is not, stop).

(c) Nothing else in the file changes. In particular `mapOverlay` (969), `tierOf` (974-979),
`sectorColours` (1001-1010) keep reading `live.track` / `live.phase`. (Brief 08 removed the
status lines and `wayLine`; there is nothing else keyed on `live.track` in this file.)

### 3. EDIT `app/src/ui/selfRaceModel.ts` — **CRLF file: preserve `\r\n` on every line you write** (369 lines)

(a) Replace lines 257-260
```ts
/** Module-level cache, keyed `${rideId}:${gateSetVersion}` (R4) — a self
 * track never changes for a given ride + gate-set-version pair, so a
 * gate-set edit invalidates exactly the entries it should and nothing else. */
const trackCache = new Map<string, SelfTrack>();
```
with
```ts
/** Module-level cache, keyed `${rideId}:${gateSetVersion}` (R4) — a self
 * track never changes for a given ride + gate-set-version pair, so a
 * gate-set edit invalidates exactly the entries it should and nothing else.
 * virgin-cycle20 06: LRU-bounded (Map insertion order; a hit re-inserts) now
 * that RecordScreen preloads on the setup screen for every way tapped. */
const trackCache = new Map<string, SelfTrack>();
/** 10 ways' full windows (WINDOW_PREV = 9 each); one decimated track is ~25 KB. */
export const TRACK_CACHE_MAX = 90;
/** Test seam only. */
export function selfTrackCacheSizeForTests(): number { return trackCache.size; }
export function resetSelfTrackCacheForTests(): void { trackCache.clear(); }
function cacheSet(key: string, track: SelfTrack): void {
  trackCache.delete(key); // re-insert → most recent
  trackCache.set(key, track);
  while (trackCache.size > TRACK_CACHE_MAX) {
    const oldest = trackCache.keys().next().value;
    if (oldest === undefined) break;
    trackCache.delete(oldest);
  }
}
/** virgin-cycle20 06: one macrotask between window rides so a cold load never
 * holds the JS thread longer than one ride's parse. */
function yieldToUi(): Promise<void> { return new Promise((r) => setTimeout(r, 0)); }
```

(b) In `loadSelfTracksFor` (280-356): after line 286 `  let skipped = 0;` add
```ts
  let hits = 0;
  const t0 = Date.now();
  let first = true;
```
Replace the loop head line 288 `  for (const result of window) {` with
```ts
  for (const result of window) {
    if (!first) await yieldToUi();
    first = false;
```
In the cache-hit branch (296-303) replace line 302 `      out.push({ ...cached, lapS });` with
```ts
      hits++;
      cacheSet(cacheKey, cached); // LRU touch
      out.push({ ...cached, lapS });
```
Replace line 343 `      trackCache.set(cacheKey, track);` with `      cacheSet(cacheKey, track);`.
Replace lines 352-355
```ts
  if (skipped > 0) {
    console.log(`[selfRaceModel] loadSelfTracks(${wayId}): skipped ${skipped} of ${window.length} window entries`);
  }
  return out;
```
with
```ts
  if (skipped > 0) {
    console.log(`[selfRaceModel] loadSelfTracks(${wayId}): skipped ${skipped} of ${window.length} window entries`);
  }
  // virgin-cycle20 06: the one timing instrument for the on-device cost of a
  // cold vs warm load (read it off logcat/Metro; harmless otherwise).
  console.log(`[selfRaceModel] loadSelfTracks(${wayId}): ${out.length} tracks (${hits} cached) in ${Date.now() - t0} ms`);
  return out;
```
Header comment (lines 1-37): no change required; optionally add one line under R2 noting the
cache bound — not load-bearing.

### 4. EDIT `app/tests/live_suite.ts` — append after the last test (line 1391)

```ts
// ============================================================ virgin-cycle20 06: pre-lock display candidate

/** SYN_L ridden from 0 at 5 m/s with a pick (or none); returns the engine plus
 * the events it emitted. `accuracy(s)` lets a test shape the cycle-023 retry. */
function rideSynL(toS: number, pickId: string | null, accuracy?: (s: number) => number) {
  const engine = new LiveEngine([SYN_L]);
  const evts: EngineEvent[] = [];
  const diag: DiagnosticEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.subscribeDiagnostics((e) => diag.push(e));
  if (pickId !== null) engine.start({ pickId });
  let t = 1755167000;
  const tAt = new Map<number, number>();
  for (let s = 0; s <= toS; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000, accuracy ? accuracy(s) : undefined);
    tAt.set(s, t);
    t += 1;
  }
  return { engine, evts, diag, tAt };
}

test('live cycle20-06 E1: under a pick the pick\'s own candidate is DISPLAYED from start() — S1/startGateT on the START-crossing fix, no lock, no event', () => {
  // Before gate 0 (100 m): displayed but nothing crossed.
  const pre = rideSynL(95, 'SyntheticL');
  const s0 = pre.engine.getState();
  assert(s0.displayTrack === 'SyntheticL' && s0.track === null && s0.lockKind === 'none',
    `pre-gate: displayTrack ${s0.displayTrack}, track ${s0.track}, lockKind ${s0.lockKind}`);
  assert(s0.currentSector === null && s0.startGateT === null && s0.lastDone === null,
    `pre-gate: currentSector ${s0.currentSector}, startGateT ${s0.startGateT}, lastDone ${s0.lastDone} — want all null`);
  assert(s0.sectors.length === 4 && s0.sectors.every((x) => x.kind === 'pending'), `pre-gate sectors ${s0.sectors.map((x) => x.kind)}`);
  assert(s0.chainageM !== null && numEq(s0.chainageM, 95, 6), `pre-gate chainageM ${s0.chainageM}, want ~95`);
  // On the crossing fix (s = 100): S1 immediately, still no lock, still no event.
  const at = rideSynL(100, 'SyntheticL');
  const s1 = at.engine.getState();
  assert(s1.track === null && s1.lockKind === 'none' && s1.phase === 'detecting', `at gate: track ${s1.track}, lockKind ${s1.lockKind}, phase ${s1.phase}`);
  assert(s1.currentSector === 1, `at gate: currentSector ${s1.currentSector}, want 1`);
  assert(s1.startGateT !== null && numEq(s1.startGateT, at.tAt.get(100)!, 1.01), `at gate: startGateT ${s1.startGateT}, want ~${at.tAt.get(100)}`);
  assert(s1.sectors[0].kind === 'current' && s1.sectors.slice(1).every((x) => x.kind === 'pending'), `at gate sectors ${s1.sectors.map((x) => x.kind)}`);
  assert(s1.gateFires === 1, `gateFires ${s1.gateFires} (the buzz counter already counted pre-lock fires)`);
  assert(at.evts.length === 0, `${at.evts.length} engine events before the lock, want 0 (nothing is emitted for a display candidate)`);
});

test('live cycle20-06 E2: with NO pick nothing is presumed — display fields stay null until the lock (today\'s behaviour)', () => {
  const r = rideSynL(395, null);
  const st = r.engine.getState();
  assert(st.displayTrack === null && st.track === null && st.currentSector === null && st.startGateT === null && st.chainageM === null,
    `no pick: displayTrack ${st.displayTrack}, currentSector ${st.currentSector}, startGateT ${st.startGateT}, chainageM ${st.chainageM} — want all null`);
  assert(st.sectors.every((x) => x.kind === 'pending'), `no-pick sectors ${st.sectors.map((x) => x.kind)}`);
  assert(st.gateFires === 1, `gateFires ${st.gateFires}: gate 0 DID fire on the candidate (unchanged max-over-candidates rule)`);
});

test('live cycle20-06 E3: the lock changes nothing on screen — same startGateT before/after, the replayed gate-0 event carries that exact time, lock event unchanged', () => {
  const r = rideSynL(405, 'SyntheticL');
  let preLockStart: number | null = null;
  // re-drive to capture the pre-lock value at s = 395
  const pre = rideSynL(395, 'SyntheticL');
  preLockStart = pre.engine.getState().startGateT;
  const st = r.engine.getState();
  assert(st.track === 'SyntheticL' && st.lockKind === 'verified', `post: track ${st.track}, lockKind ${st.lockKind}`);
  assert(st.displayTrack === 'SyntheticL' && st.currentSector === 1, `post: displayTrack ${st.displayTrack}, currentSector ${st.currentSector}`);
  assert(preLockStart !== null && st.startGateT === preLockStart, `startGateT moved at the lock: ${preLockStart} → ${st.startGateT}`);
  const locks = r.evts.filter((e) => e.type === 'lock');
  const gates = r.evts.filter((e) => e.type === 'gate');
  assert(locks.length === 1 && locks[0].type === 'lock' && locks[0].kind === 'verified' && numEq(locks[0].atChainageM, 405, 6),
    `lock events ${JSON.stringify(locks)}`);
  assert(gates.length === 1 && gates[0].type === 'gate' && gates[0].gateIndex === 0 && gates[0].t === preLockStart,
    `replayed gate-0 ${JSON.stringify(gates)} — want exactly one, t === the pre-lock startGateT`);
});

test('live cycle20-06 E4: a display candidate that reaches FINISH before 400 m shows sectors but NEVER scores a lap or flips phase; finalize() withdraws it', () => {
  const SYN_SHORT: TrackSpec = {
    id: 'SyntheticShort', ref: buildSyntheticRef([[0, 0], [405, 0]]), gates: [50, 150, 250, 350],
  };
  const engine = new LiveEngine([SYN_SHORT]);
  const evts: EngineEvent[] = [];
  engine.subscribeEvents((e) => evts.push(e));
  engine.start({ pickId: 'SyntheticShort' });
  let t = 1755167000;
  for (let s = 0; s <= 360; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }
  const mid = engine.getState();
  assert(mid.track === null && mid.lockKind === 'none' && mid.displayTrack === 'SyntheticShort',
    `mid: track ${mid.track}, lockKind ${mid.lockKind}, displayTrack ${mid.displayTrack}`);
  assert(mid.sectors.length === 3 && mid.sectors.every((x) => x.kind === 'done'), `mid sectors ${mid.sectors.map((x) => x.kind)} — want 3 done`);
  assert(mid.lap === null && mid.phase === 'detecting', `mid: lap ${JSON.stringify(mid.lap)}, phase ${mid.phase} — a display candidate must never score D-022's lap`);
  assert(mid.currentSector === null && mid.lastDone === 3, `mid: currentSector ${mid.currentSector}, lastDone ${mid.lastDone}`);
  assert(evts.length === 0, `${evts.length} events before finalize, want 0`);
  engine.finalize();
  const fin = engine.getState();
  assert(fin.track === null && fin.lockKind === 'none' && fin.lap === null && fin.phase !== 'finished',
    `finalize: track ${fin.track}, lockKind ${fin.lockKind}, lap ${JSON.stringify(fin.lap)}, phase ${fin.phase} — want unmatched (350 − 0 < 400)`);
  assert(fin.displayTrack === null && fin.currentSector === null && fin.startGateT === null,
    `finalize must end the presumption: displayTrack ${fin.displayTrack}, currentSector ${fin.currentSector}, startGateT ${fin.startGateT}`);
  assert(fin.sectors.every((x) => x.kind === 'pending'), `finalize sectors ${fin.sectors.map((x) => x.kind)} — want all pending`);
  assert(evts.length === 0, `${evts.length} events after finalize, want 0`);
});

test('live cycle20-06 E5: the cycle-023 retry re-derives the display — no stale "current" S1 after the re-seed skips gate 0', () => {
  // Poor accuracy (60 m) through the START gate, first good fix at 160 m: the
  // retry re-seeds the projector at 160 m; D-016(b) arming then SKIPS gate 0
  // (160 − 100 = 60 > armWithinM 50) — the display must say so at once.
  const r = rideSynL(160, 'SyntheticL', (s) => (s < 160 ? 60 : 10));
  const retries = r.diag.filter((d) => d.track === 'SyntheticL' && d.phase === 'retry');
  assert(retries.length === 1, `${retries.length} retries, want exactly 1 (scenario precondition)`);
  const st = r.engine.getState();
  assert(st.displayTrack === 'SyntheticL' && st.track === null, `displayTrack ${st.displayTrack}, track ${st.track}`);
  assert(st.startGateT === null, `startGateT ${st.startGateT} survived the re-seed — stale pre-retry event`);
  assert(st.sectors[0].kind === 'missed', `sectors[0] ${JSON.stringify(st.sectors[0])} — want missed (gate 0 skipped by arming), not a stale "current"`);
  assert(r.evts.length === 0, `${r.evts.length} events, want 0`);
});

test('live cycle20-06 E6: every pre-lock `track === null` invariant still holds under a pick — stop() clears the display too', () => {
  const r = rideSynL(300, 'SyntheticL');
  const st = r.engine.getState();
  assert(st.track === null && st.lockKind === 'none' && st.displayTrack === 'SyntheticL', `track ${st.track}, lockKind ${st.lockKind}, displayTrack ${st.displayTrack}`);
  r.engine.stop();
  const off = r.engine.getState();
  assert(off.displayTrack === null && off.currentSector === null && off.startGateT === null && off.chainageM === null,
    `after stop(): displayTrack ${off.displayTrack}, currentSector ${off.currentSector}, startGateT ${off.startGateT}, chainageM ${off.chainageM}`);
});
```
(`buildSyntheticRef`, `SYN_L`, `xyToLatLon`, `numEq`, `EngineEvent`, `DiagnosticEvent`,
`TrackSpec` are all in scope at the end of this file — confirm by grep; if `SYN_L` is declared
inside a block rather than at module scope, stop and report.)

### 5. EDIT `app/tests/selfrace_suite.ts`

(a) Line 34-36 destructure: add `loadSelfTracksFor, TRACK_CACHE_MAX, selfTrackCacheSizeForTests,
resetSelfTrackCacheForTests,` to the list taken from `'../src/ui/selfRaceModel.ts'`.

(b) Append at the end of the file:
```ts
// ============================================================ virgin-cycle20 06: preload cache

/** A 40-fix ramp ride on Morning from 5 m before gate 0 to 5 m past FINISH (same
 * shape as the R7 test above), written to `fs` as rides/<rideId>.jsonl. */
async function writeRampRide(fs: FsAdapter, rideId: string, baseT: number): Promise<void> {
  const spec = catalogTrackSpecs().find((s) => s.id === 'Morning');
  assert(spec !== undefined, 'expected Morning to resolve a TrackSpec from the runtime catalog');
  const g0 = spec!.gates[0];
  const gLast = spec!.gates[spec!.gates.length - 1];
  const N = 40;
  const lines: string[] = [];
  for (let i = 0; i < N; i++) {
    const p = pointAtChainage(spec!.ref, (g0 - 5) + ((gLast - g0 + 10) * i) / (N - 1));
    lines.push(fixLine((baseT + i) * 1000, p.lat, p.lon));
  }
  await fs.writeText(`rides/${rideId}.jsonl`, lines.join('\n') + '\n');
}

function countingFs(inner: FsAdapter): FsAdapter & { reads: number } {
  const wrapped = { ...inner, reads: 0 } as FsAdapter & { reads: number };
  wrapped.readText = async (p: string) => { wrapped.reads += 1; return inner.readText(p); };
  return wrapped;
}

test('selfrace cycle20-06 L1: a second load of the same window reads NO files (warm cache — the setup-screen preload pays for the ride)', async () => {
  resetRecordedForTests();
  resetSelfTrackCacheForTests();
  const fs = countingFs(createMemoryFsAdapter());
  const reads = () => fs.reads; // a call, so TS never narrows the count between asserts (tsc TS2367 otherwise)
  const window: RideResult[] = [];
  for (let k = 0; k < 3; k++) {
    const rideId = `c20-06-warm-${k}`;
    await writeRampRide(fs, rideId, 1_670_000_000 + k * 1000);
    window.push(makeResult(rideId, 'Morning', FAR_FUTURE_MS + k, { movingS: 900 + k, rawS: 900 + k, quality: 'clean' }));
  }
  const first = await loadSelfTracksFor('Morning', 1, fs, window);
  assert(first.length === 3 && reads() === 3, `cold: ${first.length} tracks, ${reads()} reads — want 3 / 3`);
  const second = await loadSelfTracksFor('Morning', 1, fs, window);
  assert(second.length === 3 && reads() === 3, `warm: ${second.length} tracks, ${reads()} reads — want 3 / still 3 (no file read on a hit)`);
  // A gate-set edit is a different key → re-read, exactly once per ride.
  const bumped = await loadSelfTracksFor('Morning', 2, fs, window);
  assert(bumped.length === 3 && reads() === 6, `gateSetVersion 2: ${bumped.length} tracks, ${reads()} reads — want 3 / 6`);
});

test('selfrace cycle20-06 L2: the cache is bounded at TRACK_CACHE_MAX (LRU) while every requested track is still returned', async () => {
  resetRecordedForTests();
  resetSelfTrackCacheForTests();
  const fs = createMemoryFsAdapter();
  const n = TRACK_CACHE_MAX + 5;
  const window: RideResult[] = [];
  for (let k = 0; k < n; k++) {
    const rideId = `c20-06-cap-${k}`;
    await writeRampRide(fs, rideId, 1_680_000_000 + k * 1000);
    window.push(makeResult(rideId, 'Morning', FAR_FUTURE_MS + k, { movingS: 900, rawS: 900, quality: 'clean' }));
  }
  const tracks = await loadSelfTracksFor('Morning', 1, fs, window);
  assert(tracks.length === n, `${tracks.length} tracks returned, want ${n} (the cap limits retention, never the result)`);
  assert(selfTrackCacheSizeForTests() === TRACK_CACHE_MAX, `cache size ${selfTrackCacheSizeForTests()}, want ${TRACK_CACHE_MAX}`);
});

test('selfrace cycle20-06 L3: the loader yields between rides — an unreadable ride in the middle costs nothing to its neighbours and the call still resolves', async () => {
  resetRecordedForTests();
  resetSelfTrackCacheForTests();
  const base = createMemoryFsAdapter();
  await writeRampRide(base, 'c20-06-y-0', 1_690_000_000);
  await writeRampRide(base, 'c20-06-y-2', 1_690_002_000);
  const fs: FsAdapter = { ...base, async readText(p) { if (p.includes('c20-06-y-1')) throw new Error('boom'); return base.readText(p); } };
  const window = [0, 1, 2].map((k) => makeResult(`c20-06-y-${k}`, 'Morning', FAR_FUTURE_MS + k, { movingS: 900, rawS: 900, quality: 'clean' }));
  const tracks = await loadSelfTracksFor('Morning', 1, fs, window);
  assert(tracks.map((t) => t.rideId).join(',') === 'c20-06-y-0,c20-06-y-2', `tracks ${tracks.map((t) => t.rideId)} — want rides 0 and 2, ride 1 skipped`);
});
```
(`RideResult` is imported as a type at line 21; `FsAdapter` at 22; `catalogTrackSpecs`,
`createMemoryFsAdapter`, `resetRecordedForTests`, `makeResult`, `pointAtChainage`, `fixLine`,
`FAR_FUTURE_MS` are all in scope. `createMemoryFsAdapter()` returns a plain object literal of
closures over `files` (no `this`), so `{ ...base, … }` spreads cleanly — verified. Plan tier
dry-ran L1-L3 against §3: 3/3 pass, tsc-clean with the `reads()` helper above.)

### 6. EDIT `app/tests/ridenotification_suite.ts` — **ruling (1) applied: the API is now
`{ whenMs, label }` (brief 03), not `subText`.** Inside the test at line 46
```ts
test('ridenotif: label rule — S<n> while a sector is being ridden, "finished" after the last gate', () => {
```
after line 48 `  const s4 = rideNotificationFor(T0, { phase: 'locked', currentSector: 4 });`, add
```ts
  // virgin-cycle20 06: a pre-lock display candidate's S1 reaches the notification too.
  const pre = rideNotificationFor(T0, { phase: 'detecting', currentSector: 1 });
  assert(pre?.label === 'S1', 'S1 must show while still detecting (pick presumed before the lock)');
```
and change the test's name (line 46) to end with `… "finished" after the last gate — also while
detecting under a pick`. (`rideNotificationLabel` at `rideNotificationPolicy.ts` 47-51 already
returns `S${currentSector}` for any phase but `finished`, so this passes without a source change
— it pins the contract. One assertion added to an existing test — the count does not change.)

### 7. EDIT two `as LiveEngineState` helpers — **ruling (2): two files, not four**
`app/tests/live_colour_suite.ts` line 53 `    chainageM: null,` and
`app/tests/rankingreveal_suite.ts` line 59 `    chainageM: null,`: after each add
`    displayTrack: null,` (the `as` cast would compile without it; add it so these helpers keep
describing a complete state, as their own comment says). **Do not touch**
`resultsstore_suite.ts` (`finishedState`, 48-55) or `timing_suite.ts` (`stateWith`, 71-77): their
literals already omit `startGateT`/`chainageM` and end at `anyAnchored: false,` — no anchor, and
the cast compiles as is.

## Verification plan

1. **Before editing tests** run `cd app && node --experimental-strip-types tests/run.ts` once
   on the tree as handed over (§1 applied, nothing else) and record the summary (expected
   `788 tests: 785 pass, 0 fail, 3 skip` — measured by the Plan tier 2026-10-03).
2. Apply §2-§3 (source) and §4-§7 (tests). Run again: expect **797 tests: 794 pass, 0 fail,
   3 skip** (+6 live, +3 selfrace; §6 adds an assertion, not a test). Zero FAIL is the bar; paste
   the summary line. Then, as the failed-before artifact, temporarily revert ONLY §1(g)'s
   `displayTrack`/`disp` lines (keep the field in the type), rerun, confirm E1/E3/E4/E5/E6 FAIL
   (E2 passes either way), restore, rerun green. Say so in the report.
3. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0.
4. `timeout 40 grep -n "live\.track" app/src/ui/RecordScreen.tsx` → exactly five remaining
   uses, all above the moved block: `mapOverlay` (969), `tierOf` (975, 976), `sectorColours`
   (1005, 1009) — none in the self block (today's 1025/1030/1031/1035 are gone). `timeout 40
   grep -n "displayTrack" app/src/live/engine.ts app/src/ui/RecordScreen.tsx` → engine: the
   header comment, the type member + its doc, `getState()`'s return; RecordScreen: the new
   comment and `selfWayId`.
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` — the tree already carries ~40 modified files
   from briefs 04/01/03/05/08 (uncommitted), so instead check `GIT_OPTIONAL_LOCKS=0 git diff
   --stat -- app/src/ui/RecordScreen.tsx app/src/ui/selfRaceModel.ts app/tests/live_suite.ts
   app/tests/selfrace_suite.ts app/tests/ridenotification_suite.ts app/tests/live_colour_suite.ts
   app/tests/rankingreveal_suite.ts` and confirm `git diff app/src/ui/selfRaceModel.ts` shows no
   whole-file line-ending churn (CRLF preserved: the diff must be a few dozen lines, not 369).
6. Inspect (fresh Opus): reruns 1-5; reads §1 diff against Decisions 1-4 (no change to
   `evaluateLockState`, `commitLock`, `emitEvent` call sites, `finalize()`'s winner logic; the
   lap guard `cand === this.locked`; `ended` set/reset); confirms `track` semantics untouched
   by grepping the 40+ existing `track === null` assertions still pass; confirms the moved
   RecordScreen block is byte-identical except the replaced load effect.

## On-device checklist — Nathan, after the OTA (JS only)

1. RECORD, pick a way with history. Metro/logcat shows one `[selfRaceModel] loadSelfTracks(<way>):
   n tracks (0 cached) in X ms` line **while still on the setup screen**. Note X (cold). Tap
   another way and back: `(n cached) in Y ms`, Y ≪ X.
2. Press START (still at home). The live map shows the selfs **parked at the START gate**
   (`waiting` style), strip all empty, status `<way> · your pick · confirming…`, notification
   = stopwatch only. No `S1` yet — correct, the gate is not crossed.
3. Ride through the START gate. **Within one second: `S1` is the context label, the notification
   sub-text reads `S1`, the selfs start moving, `P<n>` appears.** Buzz as before.
4. ~400 m in: status flips to `… · way locked (your pick) · verifying` (then `way locked`).
   **Nothing else on screen should change at that instant** — same `S1`, same dots.
5. After the ride: the GPX+ sidecar's `lock.atT − gate(0).t` is still the same tens of seconds
   it always was (the lock did not move; only the display did). The ride ranks exactly as before.
6. Control: pick from/to with **no** route (a `new` endpoint). Behaviour unchanged — no selfs,
   `detecting route…`, the way appears only at the lock.
7. If `S1` is still late on a given day, the sidecar tells which half it is: the first unflagged
   fix's `tUnixMs` vs the START press (`button` event) is GPS warm-up — a different brief.

## Out of scope

- Headless relaunch mid-ride (`location/index.ts` 185 re-arms with `pickId: null`, so the
  display presumption is lost with the pick — exactly today's loss of the soft lock; persisting
  the pick on the session marker is its own brief).
- Widening sector colours / `mapOverlay` to the display candidate (Open call A), warm-up
  tuning (`fixFlags.ts`), the 400 m rule itself, the no-pick case (Decision 6).

## Open calls (default chosen — executor does NOT stop for these)

- **A. Colours before the lock.** Default: unchanged (keyed on `live.track`, D-025). Nathan may
  rule that under a hard pick the pick's history is an honest comparison from START — then
  `tierOf`/`sectorColours` switch to `live.displayTrack`, one-line each.
- **B. Parked selfs before the crossing.** Default: shown (the model's existing `waiting`
  state). If Nathan finds the pile of dots at the gate distracting, `selfDotsAt` can drop
  `waiting` dots with a one-line filter in the tick effect.
- **C. Cache bound 90.** Default as stated; purely a memory guard.

## Report back

- The test summary line before, with §1(g) reverted (expected FAILs listed in Verification 2),
  and after (0 fail, total), plus `tsc` exit code.
- The greps from Verification 4, and `git status --porcelain`.
- Any anchor mismatch, verbatim, with the line actually found — and stop there.
- A reminder line for the coordinator: "JS only — OTA-able; STATE.md should note that the live
  strip now presumes the pick from START press (display only)."
