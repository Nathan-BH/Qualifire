# 14 - Replay speed digest (adding a 1x option)

Date: 2026-10-08. Read-only digest of the working tree as on disk (cycle26 changes uncommitted; git not checked). Paths relative to app/ unless noted.

## TL;DR
- REPLAY speeds are `REPLAY_RATES = [5, 10, 25]`, default 10 (src/ui/replayModel.ts:23-24), not 5/15/25. The 5/15/25 list belongs to DEMO only (src/ui/demoModel.ts:385, default 25).
- The selector is one 44 dp circular "dial" that cycles on tap (src/ui/ReplayScreen.tsx:254-255), not a row of buttons, so option count does not affect layout.
- Adding 1x means changing REPLAY_RATES and nextReplayRate's wrap (replayModel.ts:31-34). The clock is wall-clock anchored and has no speed-specific code, so 1x should run with no engine change (inference; not run on device).
- Speed is not persisted: it resets to 10 on each ReplayScreen mount. DEMO keeps it only in module memory for the app session.
- Tests pin the exact cycle (tests/replay_suite.ts:455-459) and the default (tests/replay_suite.ts:94). Allowlist has "replay speed" but no entry for the rate text or the "replay · Nx" status line.

## 1. Definitions, labels, selector UI
- Constants: `REPLAY_RATE_DEFAULT = 10`, `REPLAY_RATES = [5, 10, 25]` (replayModel.ts:23-24). Order is ascending.
- Cycle: `nextReplayRate` steps to the next entry and wraps; unknown rate falls back to REPLAY_RATES[0] (replayModel.ts:31-35).
- DEMO list (separate on purpose): `DEMO_RATES = [5, 15, 25]`, `DEMO_RATE_DEFAULT = 25` (demoModel.ts:382-387). Comment says "Deliberately NOT REPLAY_RATES".
- Rider-visible labels:
  - Dial text `{anchor.rate}×` with U+00D7 (ReplayScreen.tsx:255), so shows "10×".
  - Status line `replay · ${anchor.rate}x · <way>` with ASCII x (ReplayScreen.tsx:224), shown while playing.
  - Dial accessibilityLabel "replay speed" (ReplayScreen.tsx:254).
  - DEMO: dial `{rate}×` (DemoScreen.tsx:685), accessibilityLabel `Demo speed ${rate}x` (DemoScreen.tsx:684).
- Selector UI: single `Pressable` styled `dial`, 44x44, borderRadius 22, 2 px accent border (ReplayScreen.tsx:294-300 area); text fontSize 15 (ReplayScreen.tsx:304). Taps call `cycleRate` (ReplayScreen.tsx:171-174). No segmented control, chips or pills. Width is fixed, so sizing does not depend on option count; the text "1×" is shorter than "10×", no overflow risk (inference).
- Control row: dial, scrub bar, play/pause in a flex row with gap 10 (ReplayScreen.tsx:253, 293).
- Screens using REPLAY speeds: ReplayScreen (src/ui/ReplayScreen.tsx), mounted from RideDetailScreen (RideDetailScreen.tsx:432-435; Replay button at 538-541; canReplay gate at 192-204, 113-114). DemoScreen uses its own list, not REPLAY_RATES (DemoScreen.tsx:95-96, 491-498). No ACTIVITIES use found in the grep output (uncertain: grep covered src/ui and was not exhaustive for every route file).

## 2. How speed is applied
- Clock model: `replayClockS(a, nowMs) = a.clockS + (nowMs - a.realMs)/1000 * a.rate` while playing (replayModel.ts:110-113). Anchor state is React useState (ReplayScreen.tsx:45-47).
- Tick: `setInterval` every `REPLAY_TICK_MS = 50` (replayModel.ts:46; ReplayScreen.tsx:81-95). Each tick reads the wall clock, so speed only changes the slope. Auto-pause at `replayEndS` (ReplayScreen.tsx:84-90).
- Rate change: `setRate` re-anchors at the current clock with the new rate (ReplayScreen.tsx:~170-174), so no jump.
- End of ride: `replayEndS = rideSeconds + REPLAY_ROLL_OUT_S (10)` (replayModel.ts:48, 102-103). The comment "1 real s at 10x" (replayModel.ts:47) implies the roll-out is 10 ride-seconds, which is 1 real second at 10x and 10 real seconds at 1x. Inference from the arithmetic.
- Scrub: `scrubDeltaS = dx * rate * 0.4` (replayModel.ts:36-38, `SCRUB_S_PER_DP_PER_RATE`). A full-width swipe is about 96 ride-s at 1x (vs 960 at 10x). Comment at replayModel.ts:36-38 lists 8 min at 5x, 16 min at 10x, 40 min at 25x; 1x would be about 1.6 min (inference).
- Feeds into:
  - Rider position: `riderPositionAt(r, clockS)` interpolates the ride's own fixes (replayModel.ts:121; ReplayScreen.tsx:115-116). No speed term.
  - Gates done: `replayGatesDone` from clockS (replayModel.ts:127; ReplayScreen.tsx:121). No speed term.
  - Self dots: `selfDotsAt(selfTracks, clockS*1000)` (ReplayScreen.tsx:~118). Pure function of clock; no speed term found.
  - Sector colours and live view: `replayLiveViewModel` with `replayTimebase(anchor)` (replayModel.ts:116-118, 149-153; ReplayScreen.tsx:135-144). Timebase is `{rate, running}`.
  - Sector pane flash timer: liveView.tsx:211-216 re-runs on rate change; 100 ms interval at liveView.tsx:214. Flash hold FLASH_HOLD_MS = 2500 (liveView.tsx:116), in real ms (inference: the hold is not speed-scaled).
  - Map: WayMapView gets lat/lon, progressM, selfs, rideTrace, zoom=4, liveState 'moving'/'finished' (ReplayScreen.tsx:~228-240). No speed term.
- Speed assumptions: none found in replay code. No smoothing, throttle, skipped-frame logic or step size tied to rate (grep: no matches for smoothing/throttle in replayModel.ts or ReplayScreen.tsx). Render cadence is 20 Hz at any speed.
- Haptics / audio / notifications: none in ReplayScreen.tsx or replayModel.ts (grep for Vibrat/haptic/Notification/sound/audio returned nothing). DemoScreen does vibrate on gate events (DemoScreen.tsx:304); not replay.
- 250 ms self-dot tick: not found in replay files. RecordScreen has a 250 ms tick (RecordScreen.tsx:1207-1224) for the live recorder, not replay. Unverified whether any self-dot tick exists elsewhere.
- Real-time behaviour at 1x (inference from code, not run): a ride plays at wall-clock pace; the 50 ms tick and 20 Hz redraw are unchanged; the 10 s roll-out takes 10 real s; the scrub is finer; the auto-pause at end is about 10 real s after finish. The only speed-keyed numbers are the scrub gain and the roll-out's real-time duration.

## 3. Persistence, reset, sharing
- REPLAY: rate lives in ReplayScreen local state, initialised to REPLAY_RATE_DEFAULT on mount (ReplayScreen.tsx:45-47). Load effect keeps `a.rate` across ride loads (ReplayScreen.tsx:~60-70), so it persists only while the screen stays mounted. Leaving and reopening resets to 10.
- Settings: no rate field found in the replay code. Not checked: full settings store (settings.tsx) for a replay key. Treat as not persisted (uncertain beyond the grep).
- DEMO: module-level `let demoSessionRate: DemoRate = DEMO_RATE_DEFAULT` (DemoScreen.tsx:183), read on each mount; persists for the app process, resets to 25 on relaunch (inference from module scope).
- Per-ride: not per-ride; rate is not keyed by rideId.
- Shared list: none. REPLAY_RATES and DEMO_RATES are separate constants by design (demoModel.ts:382-384).

## 4. Tests and allowlist
- tests/replay_suite.ts:93-95: default is 10; default is in REPLAY_RATES; tick 33-100 ms.
- tests/replay_suite.ts:455-459: `nextReplayRate` cycles 5 -> 10 -> 25 -> 5 and falls back on unknown rate. Will need an update for 1x (any inserted entry breaks these asserts).
- tests/replay_suite.ts:29-30: imports REPLAY_RATES, scrubDeltaS, etc.
- tests/replay_suite.ts:453: section "cycle15 brief 08 - speed dial / scrub bar".
- tests/demo_suite.ts:125-127: DEMO_RATES must be [5,15,25], default 25.
- tests/demo_suite.ts:229-230: DEMO_ROLL_OUT_S / max(DEMO_RATES) >= 4.6; fastest rate only.
- tests/ui-strings.allow.json:1010 "replay speed" (accessibility label; "reason" and "since" present, by "Nathan"/bootstrap per file header rules).
- tests/ui-strings.allow.json:1018 "replay over · {…}".
- tests/ui-strings.allow.json:411 "Demo speed {…}x".
- No allowlist entry for "replay · {…}x" status line, nor for the dial text "{…}×" in ReplayScreen. Uncertain whether the extractor scans these (they are expressions/const strings). Not verified by running the guard.
- Guard rules (tests/ui_strings_extract.ts:25 MAX_LEN = 40; :27 MIN_ENTRIES = 50): entries over 40 chars need long:true; the header says agents may append an entry only with a one-line justification and must report it; Nathan owns the file. A new literal "1×" would need an entry only if the extractor sees a literal; computed dial text probably does not (inference).
- Budget rule from the header: no em dash in entries (use " · ").

## 5. Docs and "1x" / real-time wording
- STATE.md:188-189: "post-ride REPLAY ... default 10x, PAUSE/RESTART/BACK".
- cycles/virgin-cycle14/02-post-ride-replay.md (origin of REPLAY, rate choice "10 first, tweak later" per replayModel.ts:22).
- cycles/virgin-cycle15/03-demo-speed-and-skip.md and 08-replay-screen-redesign.md (speed dial, scrub gain; replayModel cites "cycle15 brief 08 decision 4").
- cycles/virgin-cycle16/07-demo-screen-controls-redesign.md and README.md (dial replaces pills).
- cycles/virgin-cycle22/08-demo-and-replay-flash.md (flash behaviour at fast rates).
- No "1x" label found in src, tests or docs (grep for 1x/1×/real time/live speed). "real time" hits are about timing data (store/timing.ts, colourModel etc.), not playback speed. liveView.tsx:18-22 and 43-58 use "rate-1 timebase" for the live recording clock, an internal term.

## Unverified / uncertain
- Not run on device or in the test suite; all "real-time behaviour" statements are code inference.
- Whether the cycle26 uncommitted working-tree edits touch replayModel.ts, ReplayScreen.tsx or the tests (git status not checked).
- Full ACTIVITIES route coverage for replay entry points (grep was not exhaustive for route files).
- Whether the ui-strings guard scans dynamic dial text or the status-line const.
- Full settings store (settings.tsx) for any replay-rate key.
- The prompt said REPLAY uses 5x/15x/25x; code says 5/10/25 (default 10). Treated the code as truth.
- Exact line numbers for ReplayScreen cycleRate/setRate and the load effect are approximate (+/- 2).
