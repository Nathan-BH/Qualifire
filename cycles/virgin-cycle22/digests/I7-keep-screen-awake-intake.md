# I7 — Keep the screen on while a ride is running: intake (Nathan, 2026-10-05 23:07)

**Status: decision + context only. No digest, plan or code yet.**

## Decision (Nathan)
Tester feedback: the phone's screen turns off after a while without touching it; wants it to stay on like a YouTube video. Nathan agreed: the screen stays on
ONLY on the RECORD screen and ONLY while a ride is running.

## Facts verified (coordinator, 2026-10-05; not Inspected)
- No keep-awake / wake-lock code exists in app/src, package.json, app.json (grep: keepawake, useKeepAwake, activateKeepAwake, wakelock, idleTimer, FLAG_KEEP_SCREEN_ON -> nothing).
- Stack: expo ~56.0.0, react-native 0.85.3, expo-location, expo-task-manager. Standard solution = `expo-keep-awake` (native module).
- A native module changes the native fingerprint -> needs a NEW BUILD, cannot ship via EAS Update OTA alone (see memory/notes on build7 fingerprint drift,
  cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md, and the EAS update setup notes).

## Scope as agreed
- ON: RECORD screen, ride running. OFF: every other tab, armed/prestart, finished, cancelled, app backgrounded, screen unmounted.
- Plan tier must define exactly which `liveState`/engine state counts as "running" (suggestion by coordinator: moving AND stopped at a red light count as running,
  because a red light is not a finish — same rule as the map's dimmed 'stopped' state; prestart and finished do not). Confirm against RecordScreen/engine code.

## Open questions for the Plan tier (NOT decided by Nathan)
1. A settings switch to turn it off (battery)? Coordinator suggested one; Nathan did not rule on it. Plan: price it, mark any new rider-facing string
   (allow-list entry with reason, CLAUDE.md #9; Nathan owns rider text).
2. Guaranteed release on every exit path (finish, cancel, save, tab switch, unmount, app background, crash-recovery) so the lock can never outlive the ride.
3. Build impact: new native dependency -> must be called out to Nathan as "needs a new build, not an OTA" (prototypes-are-not-implementation rule).
4. Separate concern, NOT in this item: whether recording continues when the phone locks / app is backgrounded (background location). Ask the tester which they meant.
