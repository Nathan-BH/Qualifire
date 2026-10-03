# virgin-cycle21 — retire way locking: the user's pick at START is the only reference

Source: Nathan, 2026-10-03. Written by the Plan tier (Sonnet coordinator reading the code directly at
Nathan's request; Fable quota exhausted, no subagent tiers used for the planning). **Nothing in this
folder has been executed.** Nothing is on his phone until briefs 01-03 are executed, inspected and
published (COMMANDS.md).

## 1. REVIEW — is retiring way locking right?

**Verdict: yes, with three guard-rails (below).** Plain-language terms: a *way* = one specific variant
of a *route* (the code's `TrackSpec` / catalog "way"); the *pick* = the way chosen on the RECORD tab
before START (`pickedWayRef` -> `startTracking({wayPick})` -> `liveEngine.start({pickId})`); the
*lock* = the engine deciding mid-ride which way you are on (`engine.ts` LockKind none/soft/verified/
finalized).

**What the lock was for** (engine.ts header): before the RECORD-tab pick existed, the app had to
*guess* the route from the GPS. Every catalog way ran as a live candidate (20 of them), a 400 m /
200 m-margin race picked a winner, `finalize()` recovered a route at ride end. Cycle 024 -> 2026-08-29
already made a *picked* ride "hard-locked" to the pick; what survived is the guessing machinery.

**What it costs today (all three are your observations):**
1. *Delay.* The pick's own candidate only becomes "the" route after 400 m of evidence, so cycle 20
   needed a whole brief (06) to bolt a "display candidate" on top so S1 and the selfs show at START.
2. *Wrong way.* A ride with NO pick still runs the full guess. **Your WorkNew ride is a Work -> New
   ride: 'new' at either end is "an ordinary first ride ... wayPick null" (virgin-cycle16 01), so
   `liveEngine.start({pickId:null})`.** After ~400 m on the stretch Work->New shares with Work->Zoo,
   the unblocked-leader rule locked WorkZoo; the live map drew `live.track ?? wayHint`
   (RecordScreen.tsx:1057 `liveMapOverlayFor`), i.e. the LOCK outranks everything; and `rememberRide`
   / history save under `finalState.track`, i.e. WorkZoo. (Inferred from code; your ride's events file
   should show a `pick` event with `wayId: null` and a `lock` event for WorkZoo reason
   `unblockedLeader` — I cannot see your ride data.)
3. *Dot under the line* — a SEPARATE bug, see below. It was only triggered by the overlay appearing
   mid-ride.

**Root cause of the dot under the yellow line (not caused by the lock itself):** `wayMapView.tsx`
paints MapLibre layers in *mount order*. The route source is conditional (`{wayFC ? <GeoJSONSource
key="route"…> : null}`, ~line 705) while the rider source is mounted as soon as there is a fix. When the
overlay changes from "no way" to "a way" *after* the dot exists (exactly what the lock did), the route
mounts AFTER the dot and paints over it. The file's own comments (trail/selfs "always mounted … or it
would mount AFTER the rider source and paint over the dot") describe this rule; the route, sector-spans,
place and gate sources were never given the same treatment because the overlay used to be set before
the dot. Removing the lock removes today's trigger, but the layer-order hole stays; brief 03 closes it.

**Counter-arguments I tested, and what they become:**
- *Crash/relaunch recovery uses auto-detect* (`location/index.ts:189` restarts the engine with
  `pickId:null`). Removing detection would silently turn a recovered ride into an unmatched one ->
  **brief 02 persists the pick in the session marker** and restores it.
- *A ride on a known way started with 'new' no longer gets recognised.* True and intended: your rule is
  that the START pick is the reference. The post-ride naming flow (`draftRouteFromRide`) already
  handles "new" rides; it keeps working because `track` is null for them.
- *Rider leaves the picked road.* Already the rule since 2026-08-29: scored as missed sectors on the
  pick, never reassigned. Unchanged.
- *Accidental START / pick never ridden.* Old rule: no soft lock -> unmatched. New rule (brief 01):
  unmatched iff the pick's candidate never fired a single gate by `finalize()`; otherwise it is the pick.
- *Old rides and GPX+ files contain lock fields.* Kept readable (types + `eventsJsonl` validators);
  only the WRITING stops (brief 02).
- *Perf:* 20 candidates per fix drop to 1 — a side benefit.
- *Test debt:* engine/live/gpxplus/colour/ranking/recordflow suites encode the lock; executors delete
  tests of retired behaviour and must name each one (the Opus inspector checks every removal).

Recommendation: execute 01 -> 02 -> 03 in that order.

## 2. Briefs

| # | file | what | files (main) | OTA? |
|---|------|------|--------------|------|
| 01 | `01-engine-pick-is-the-reference.md` | engine has exactly one candidate (the pick) from START; no race, no soft/verified, no finalize recovery, no lock events | `app/src/live/engine.ts`, engine/live tests | JS only |
| 02 | `02-persist-pick-remove-lock-plumbing.md` | pick survives relaunch; stop writing lock events/`qf:wayLock`; rename comments/docs; consumers of removed fields | `location/session.ts`, `location/index.ts`, `storage/gpxPlusExport.ts`, `ui/RecordScreen.tsx` (+ comments in colourModel/rankingRevealModel), `process/*.md` | JS only |
| 03 | `03-overlay-is-the-pick-and-dot-on-top.md` | live overlay = pick only; the rider dot is always the topmost layer | `ui/recordFlow.ts`, `ui/RecordScreen.tsx`, `ui/wayMapView.tsx`, tests | JS only |

Order matters: 01 changes `LiveEngineState` (removes `lockKind`, `pickHonoured`, `anyAnchored`,
`displayTrack`); 02 and 03 fix the consumers. Run tsc after each.

## 3. Dependency on cycle 20 and baseline

Cycle 20 (briefs 01-12) is fully executed in the working tree, UNCOMMITTED, and untested on a device.
Cycle 21 edits on top of it. Overlapping files with cycle 20: `engine.ts` (06, 02, 12),
`RecordScreen.tsx` (04, 06, 08, 12), `recordflow_suite.ts`, `live_colour_suite.ts`,
`rankingreveal_suite.ts` (06 added `displayTrack: null` literals). Measured 2026-10-03 on the current
tree: **838 tests / 835 pass / 0 fail / 3 skip** (`cd app && node --experimental-strip-types
tests/run.ts`); cycle 20's log records tsc exit 0 at that count — executors re-measure tsc as their own
baseline. Do not commit/stash anything; do not run these briefs before Nathan says go.

## 4. What changes on his phone — and what does not

- Changes (after publish): picked rides show the pick's line, S1 and selfs from START (as cycle 20),
  and NEVER switch to another way; no-pick rides ('new' ends) show only your trail (no foreign way, no
  lock) and finish in the naming flow; the blue dot is always on top of the lines.
- Does NOT change: gate firing, sector/lap maths (same offline pipeline), colours rules, ride storage
  format (old rides open unchanged), notification, PAUSE, settings (there is no way-lock setting).
- Not on the phone yet: all of it. Cycle 20 is not on the phone either (needs build 8 for the native
  notification parts; its JS parts and this cycle are OTA-able) — see COMMANDS.md.
