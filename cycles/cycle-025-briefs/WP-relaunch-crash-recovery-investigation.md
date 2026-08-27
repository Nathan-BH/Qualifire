# WP — Relaunch counter & crash recovery: investigation + prevention proposals (cycle 025)

**Status: INVESTIGATION ONLY. Every proposal below is labelled UNBUILT — nothing in this
document has been implemented, and no app code was touched in producing it.**
Prepared 2026-08-25 by a frontier read-the-code pass (model-tier protocol, planning tier), from the
2026-08-22 ride-1 evidence (`data/activities/TEST in app rides/qualifire-20260822/`,
`qualifire-20260822-review.md`) and a direct read of the repo at HEAD (`7350853`, "cycle024 part2")
plus the git history spanning the ride date. All line numbers below are HEAD unless a commit is
named. Dates absolute throughout.

## The question, in Nathan's words

From `qualifire-20260822-notes.md`, ride 1 (11:49, dev build with GPX+): *"at some point the app
closed, dont know why. After relaunch I got the message 'recoverd after relaunch...'. Interesting
to see if the gpx+ data is able to see what happened there."* The GPX+ export answered
`<qf:relaunches count="0"/>` — the app's own message and its own event log contradict each other.
Nathan has since confirmed in chat: the crash was real, he closed and relaunched the app, recovery
worked, and the recovery run went on to log real gates. This WP explains why the counter lied, how
recovery worked anyway, and what to build so both stay honest next time.

**Route resolution (chat shorthand "home w>>h-d"):** the shorthand doesn't match any catalog name
verbatim, but the data resolves it beyond doubt. The notes say the engine switched him to *"my
home>>work morning dry route"*; the GPX+ session block locks `track="Morning"`
(`app/src/store/catalog.seed.json`: route `Morning`, way `home>work`), and both post-crash gates
(G3 12:00:36, FINISH 12:03:59) are Morning gates that land exactly on the track. So "home w>>h-d"
= the **Morning** route (home→work, the one Nathan calls "morning dry") — read the shorthand as a
garbled "home>>w m-d". No ambiguity remains for this WP's purposes.

---

## 1. Root cause of `relaunches count="0"` — a lost race, already documented in the code

**Hypothesis (HIGH confidence, ~85–90%): the relaunch was never written to the events sidecar
because, in the code running on the phone that day, relaunch detection lived in the background
location task and was gated on "this JS launch had no session in memory yet at task entry" — and
Nathan's act of manually reopening the app made the UI restore the session first, so the task's
check came up empty-handed forever.** The counter is honest about its input (0 events in the
sidecar → count 0); the event was simply never logged.

### The mechanism, step by step

The exported count is a pure event count: `app/src/storage/gpxPlusExport.ts:312–313` filters the
ride's events sidecar for `kind === 'relaunch'` and prints the length. So the question is why no
`relaunch` event reached `rides/20260822-114947-e4f5.events.jsonl`.

At ride time the phone was running pre-"WP-B fix B1 round 3" code. In that version
(`git show b26c964:app/src/location/index.ts`, commit of 2026-08-20 — and still unchanged in
`90f7f68` of 2026-08-23, so every candidate bundle for a 2026-08-22 ride has it), the background
task handler read:

```ts
// b26c964 app/src/location/index.ts:106–122 (abridged)
const hadLiveSession = session !== null;   // module state at task entry
const s = await ensureSession();           // loads the disk marker if needed
...
if (!hadLiveSession) {
  logEvent(s.rideId, { kind: 'relaunch', tUnixMs: Date.now() });
}
```

and `ensureSession()` (b26c964:86–93) just loaded the marker — no logging of its own.

The race: after the crash, Nathan tapped the app icon. A fresh JS launch begins. **Two callers
compete to restore the session:** RecordScreen's mount effect
(`app/src/ui/RecordScreen.tsx:206–236` at HEAD; same structure then) calls
`getRecoveryState() → ensureSession()` immediately on mount, while the background task handler
only runs when the next location batch arrives. When the human relaunches by hand, the UI mounts
first — so by the time the task handler ran, `session` was already non-null, `hadLiveSession` came
up `true`, and the one line that logs the relaunch was skipped. Permanently: the flag is
per-launch, there is no second chance. Meanwhile the "Recovered after relaunch — still recording"
banner (`RecordScreen.tsx:636–639`) is driven by a *different* source of truth — the disk marker
plus `hasStartedLocationUpdatesAsync` via `getRecoveryState()` (`location/index.ts:445–458`) — so
the UI knew about the relaunch while the event log never did. Exactly the review's observation:
"the information exists in the app and simply never reaches the event log."

This is not a reconstruction from thin air — HEAD's own comments describe this bug in the past
tense. `app/src/location/index.ts:142–147`: *"the relaunch-detection + engine re-arm used to live
here, gated on `session !== null` at entry — but RecordScreen's mount effect can call
getRecoveryState() -> ensureSession() first and win the race, leaving this handler's own check
permanently blind."* And `cycles/cycle-024.md:104–112` records WP-B's round 2 re-verification
finding "a second path (reopening the app, not just a true OS relaunch) still leaking the same
bug," fixed in round 3 by moving the re-arm into `ensureSession()`. That fix — commit `7350853`,
**2026-08-24, two days after the ride** — also moved the relaunch logging: at HEAD,
`ensureSession()` itself logs the event whenever a fresh launch restores a session from disk
(`location/index.ts:108–128`, the `logEvent` at line 123, behind the once-per-launch
`engineArmedThisLaunch` flag), regardless of which caller gets there first.

**So the primary bug is already fixed at HEAD — as a side effect of a fix aimed at free-ride mode
loss, shipped without ever being tested against the relaunch-counter failure it also cures.**
That's why the prevention proposals below are mostly verification and gap-closing, not a rewrite.

### Supporting evidence that the phone ran the old code

The exported session block itself dates the bundle. HEAD's exporter would have emitted
`qf:routeDistanceM` (cycle 023 fix 4, `gpxPlusExport.ts:178–179` — `Morning` is in
`PROPOSED_GATES`, the gates are even *named* through it) and `qf:routeMatchDiagnostics` (cycle 023
fix 5b) for this ride. The exported file has neither — the block jumps straight from `qf:routeLock`
to `qf:gates`. The bundle that recorded *and* exported ride 1 predates those cycle-023/024
landings, and therefore also predates the round-3 relaunch fix of 2026-08-24.

### The ~10–15% residual: which kind of "app closed" was it?

Two scenarios both produce `count="0"` under the old code, and the export cannot distinguish them:

- **(A) Full process death + fresh JS launch (best supported).** The foreground service
  (`killServiceOnDestroy: false`, `location/index.ts:277`) has Android re-deliver location updates
  to a fresh launch; the disk marker names the ride; the UI wins the race as above. The track's
  only disturbance — a 4.5 s recording hole at 11:57:03–11:57:16 with a 69 m re-acquisition jump
  at [50.851124, 4.665888](https://maps.google.com/?q=50.851124,4.665888) — fits a several-second
  process gap, and its 4.5 s duration slips under the exporter's `OUTAGE_GAP_S = 5`
  (`gpxPlusExport.ts:51`), which is why there's no `qf:outages` block either (a near-miss worth
  knowing about: a relaunch losing <5 s of track is invisible to the outage detector too).
- **(B) Activity/UI death with the process surviving** (the foreground service holds the process).
  No new JS launch → module state intact → even *correct* counting code would honestly log
  nothing; the banner would still show on remount. Less likely — it doesn't explain the 4.5 s
  fix hole well — but not excluded.

**A checkable discriminator exists on the phone.** Scenario A implies a fresh live engine that
re-anchored mid-route and re-locked Morning around 11:57–11:59 — and `subscribeEvents` logs every
lock to the sidecar (session was restored by then). The GPX+ export shows only ONE lock because
`buildSessionBlock` takes the *first* (`evs.find`, `gpxPlusExport.ts:171`). So: pull
`rides/20260822-114947-e4f5.events.jsonl` from the app's document directory (adb or a debug share)
— **a second `lock` line at ~09:57–09:59Z proves scenario A; its absence proves B.** Either way no
`relaunch` line will be there; that part is settled.

---

## 2. How recovery worked well enough to log real gates

What survives an app crash mid-ride, from the code:

- **The active-ride marker** — `qualifire-active-ride.json` in the document directory
  (`app/src/location/session.ts:40–47`), written at START. It carries the rideId (and, since WP-B,
  the mode). This is the single hinge of recovery: any fresh launch finds it and resumes appending
  to the same ride.
- **The raw ride JSONL and the events sidecar** — append-only, flushed per line
  (`app/src/storage/core.ts`). A mid-write kill leaves at most a torn last line, healed on the
  next append (`healTornTail`, core.ts:163–174 for fixes, 255–282 for events — `appendEvent`
  never refuses a write). The F-2 per-ride append chain (core.ts:87–95) exists precisely because
  a post-relaunch burst of queued location events arrives concurrently.
- **The Android foreground service** — `killServiceOnDestroy: false` keeps the OS delivering (or
  queuing) fixes across the death of the JS side, which is why the hole is 4.5 s and not minutes.

What does NOT survive: every bit of JS module state — the live engine's lock on Morning, its gate
history and buffers, the tracker's counters, all React state.

The recovery choreography that then produced real gates (old code, scenario A): the fresh launch's
first `liveEngine.feed()` finds the engine idle and **auto-starts it**
(`app/src/live/engine.ts:422–426` — "Headless relaunch mid-ride: module state is fresh but fixes
keep coming. Auto-start"). The reborn engine re-anchors against all candidates mid-route,
re-locks Morning (Nathan was still riding its line — the "route overlap"), and D-016(b) arming
means gates already behind the anchor are *skipped, never invented* (engine.ts:388–392): START,
G1, G2 are not re-fired, so no duplicate or `estimated="true"` entries pollute the sidecar. G3 and
FINISH are then crossed live and fire with true timestamps, `estimated="false"`. Stitch that onto
the pre-crash sidecar (lock at 11:51:59, START/G1/G2) and you get exactly the seamless-looking
export we have: 5 clean gates, one visible lock, zero trace of drama. Recovery genuinely is good —
at most ~4.5 s of track lost — which is precisely why the one thing it failed to record (that it
happened at all) matters for trust.

Note the old auto-start defaulted to `mode:'route'` with no options — harmless here because ride 1
WAS a route ride, but it's the same hole that WP-B existed to close for free rides; HEAD re-arms
in the persisted mode instead (`ensureSession`, location/index.ts:121–125).

---

## 3. Prevention / fix proposals — all UNBUILT

"Prevent the crash" and "count honestly when a crash happens anyway" are different fixes; both are
listed. P1–P3 are the trust-repair core and are small.

**P1 — UNBUILT — Verify the already-landed fix against THIS failure, and regression-lock it.**
(Small.) HEAD already logs the relaunch in `ensureSession()` no matter who calls first, but that
behaviour shipped as a free-ride-mode fix and was never checked against the relaunch-counter
failure. Two parts: (a) a headless regression test simulating the losing ordering — "UI restores
the session, then the task handler runs" — asserting exactly one `relaunch` event lands in the
sidecar; note `location/index.ts` imports expo modules and isn't headless-testable today, so the
test either targets an extracted seam or this lands as (b) alone: an on-device protocol for
Nathan's next dev-build ride — force-kill the app mid-ride (swipe away or `adb shell am force-stop`),
reopen, finish, export, and confirm `<qf:relaunches count="1"/>`. Risk: none to ship (no code
change unless the seam-extraction route is chosen); the risk of skipping it is shipping cycle 024's
fix on faith — exactly what rule 3 forbids.

**P2 — UNBUILT — Timestamped relaunch entries in GPX+, not just a count.** (Small.) The sidecar
event already carries `tUnixMs`; the exporter throws it away (`gpxPlusExport.ts:312–313` prints
only a count). Emit children — e.g. `<qf:relaunches count="1"><qf:relaunch t="…"/></qf:relaunches>`
— so the *when* is in the file, as the 2026-08-22 review asked. Additive, strips cleanly under
gpxplus test (e)'s byte-identity rule for standard GPX. Risk: none identified.

**P3 — UNBUILT — Export every lock event, not just the first.** (Small.) `evs.find` at
`gpxPlusExport.ts:171` hides exactly the recovery re-lock that would have made this crash visible
in the export. Emit all lock events (repeat `qf:routeLock` or a `qf:locks` block, carrying
`lockKind`). This also documents WP-D2's soft→verified progression for free. Risk: consumers of
the single-element shape — grep for `routeLock` readers first; the review tooling reads it.

**P4 — UNBUILT — Dirty-shutdown breadcrumb: measure the gap, don't just count it.** (Medium.)
Persist a cheap heartbeat — e.g. `lastAliveAtMs` refreshed on the session marker every N fixes
(session.ts is already the write path; D-023-safe, marker is not the raw ride). On
relaunch-recovery, log the `relaunch` event enriched with `downS` (now − lastAliveAt) and let GPX+
carry it. Turns "a relaunch happened" into "the app was dead for 6.2 s at 11:57:07". Risk: marker
write frequency vs. flash wear/battery — every N=30 fixes is plenty; unknowns: none structural.

**P5 — UNBUILT — One source of truth for banner and counter.** (Small–medium.) Today the
"Recovered after relaunch" banner derives from `getRecoveryState()` while the counter derives from
the sidecar event — they can still disagree at HEAD (a UI-only remount with the process alive
shows the banner but logs nothing; arguably correct, but then the banner overclaims). **Definition
RULED by Nathan 2026-08-26 (round 2): visibility-first.** Any restoration of an in-progress
session — fresh JS launch OR UI-only remount — shows the banner and logs a sidecar event, driven
from one shared predicate (e.g. `getRecoveryState()` returning a `freshLaunch` flag from
`ensureSession`); the event's kind flag keeps a remount from inflating the true-relaunch count
while the rider is still warned the recording may be corrupted. Risk: low; the ruling is in.

**P6 — UNBUILT — The crash itself: cause UNRESOLVED, propose evidence capture, not a fix.**
(Small process change; the fix itself is unknown.) Stop-on-ambiguity applies: nothing in the repo
identifies the crash. `app/err.log` is empty, there is no crash log in the ride folder, and the
GPX only shows the 4.5 s hole. What is known: it hit the dev-client build (the preview build rode
twice that day without incident), ~8 minutes in, with the MapLibre live map on screen. Candidate
suspects — dev-client/Metro disconnect behaviour away from the PC, memory pressure from the live
map (B-47's battery/stability A/B is already backlogged on exactly this area) — are speculation
and labelled as such. Proposal: a capture runbook so the *next* crash is diagnosable — (a) after
any crash, pull `adb logcat -b crash -d` and Android's exit reasons (`adb shell dumpsys activity
exitinfo <pkg>`) before anything else; (b) the P4 breadcrumb timestamps the death for correlation;
(c) optionally log `getHistoricalProcessExitReasons` into the sidecar at recovery time (needs a
tiny native module — defer unless crashes recur). Do NOT build crash-prevention on a guessed
cause.

**Immediate zero-code check — CLOSED 2026-08-26, not possible (Nathan cannot access on-phone
files; see NEEDS-NATHAN 2):** the check would have been: get
`rides/20260822-114947-e4f5.events.jsonl` off the phone (app document directory, via adb
`run-as`/backup or a temporary debug share button) and look for a second `lock` line at
~09:57–09:59Z. Present → scenario A confirmed end-to-end; absent → scenario B, which slightly
changes P5's framing (the banner fired on a remount, not a relaunch) but changes nothing in P1–P4.

## Ordering and fit

P1 before the next test ride (it's the trust gate for the counter); P2+P3 together in one exporter
pass (same file, same test suite, regenerate nothing else — no shipped design change, so no
mockup regen is triggered); P4 and P5 together (both touch the marker/recovery seam); P6's runbook
is a paragraph in BUILD-4-RUNBOOK.md territory, Principal's call where it lives. Verification for
any code WP that follows: `cd app && node --experimental-strip-types tests/run.ts` zero FAIL,
`npx tsc --noEmit` clean, per repo rule 6.

## NEEDS-NATHAN

**Priority note (2026-08-26):** Nathan considers the 2026-08-22 crash possibly a one-off needing
no immediate action unless it recurs; he may try to reproduce it by re-riding a home>>station
route ("if the crash reproduces it means it is something intrinsic"). Item 1 below was NOT
answered — his reply addressed priority, not the definition. **The definition was then ruled in
round 2 (2026-08-26, see item 1 below) — P5 is unblocked.**

1. ~~Ratify the relaunch definition in P5~~ — **RULED 2026-08-26 (round 2): the banner does NOT
   stay silent on a UI-only remount.** Nathan: the banner "should not be silent and should be
   visible so we know something happened and the recording might be corrupted." So P5's predicate
   is visibility-first: ANY restoration of an in-progress session — fresh JS launch OR UI-only
   remount with the process alive — shows the banner AND logs a sidecar event, from one shared
   predicate; the event carries a kind flag (`freshLaunch` true/false, or
   `kind: 'relaunch'|'remount'`) so the relaunch counter and analysis still distinguish a true
   process death from a remount. The earlier "banner only on fresh JS launch" candidate is
   rejected. (Counter semantics resolved by the planner from the ruling's intent: remounts are
   logged-but-flagged, never counted as relaunches.) P5 is unblocked.
2. ~~The phone-side sidecar pull (immediate check above)~~ — **CLOSED 2026-08-26, not possible:**
   Nathan has no access to any .jsonl/.json file on the phone; the only artifact he can produce
   is the GPX+ export already on file. The scenario A/B discriminator stays undetermined unless
   a debug share/export path is built first.
3. ~~Whether P6's capture runbook is worth doing now~~ — **RULED 2026-08-26: wait.** Nathan:
   set it up only if another crash happens; a recurrence would also bring fresh GPX+ data.
   P6 is deferred until a second unexplained crash occurs.

## What this document is not

Not a backlog edit (B-items and status are the Product Owner's / Principal's), not a decision
(D-numbers are Nathan-ratified only), and not an implementation. It is a checkable artifact: an
explicitly UNBUILT proposal set per `process/CYCLE.md` ("A proposal — explicitly labelled as
unbuilt") and `process/CONVENTIONS.md` ("Never log unbuilt work as built. Label proposals
UNBUILT.").
