# BRIEF — Relaunch recovery hardening: timestamped relaunches, all locks, downtime measurement, banner/counter unification (P1–P5)

Execution brief for the Sonnet executor. Self-contained: everything you need is in this
document. Written 2026-08-27 by the Fable planner after reading every cited file at HEAD.

> **If any ambiguity or surprise arises, STOP and report back — never guess.**

## 0. Environment

- The repo is mounted at `$HOME/mnt/Qualifire` and is reached ONLY through the
  `mcp__remote-devices__device_bash` tool. Every call is a fresh shell (no cwd/env
  carryover) with a ~45 s timeout: always prefix commands with
  `cd "$HOME/mnt/Qualifire" && ...` and split long work into multiple calls. If a
  command might exceed the timeout, background it with
  `nohup ... > outfile 2>&1 & disown` and poll the outfile in follow-up calls.
- Do NOT run any `git` command. Commits are the coordinator's job.
- Never delete anything (repo rule: moves go to `safe_to_delete/`) — this task
  requires no deletions anyway.
- Touch ONLY the seven files listed in §2. Facts about the repo are derived at
  execution time, never copied from this brief's prose (verify each "current code"
  quote matches HEAD before replacing it; if one doesn't, STOP and report).

## 1. Context (read, don't re-derive)

A 2026-08-22 crash produced `<qf:relaunches count="0"/>` in a GPX+ export even though a
real relaunch happened: relaunch logging used to lose a race between RecordScreen's
mount effect and the background task. That race is ALREADY FIXED at HEAD (the logging
moved inside `ensureSession()`, once per launch — verified by the planner, §3). This
pass: regression-lock what is lockable (P1), enrich the GPX+ export with timestamped
relaunch entries (P2) and ALL lock events (P3), measure crash downtime via a session-
marker heartbeat (P4), and unify the recovery banner with the logged sidecar event
behind one shared predicate per Nathan's 2026-08-26 visibility-first ruling (P5).
P6 (crash-evidence-capture runbook) is OUT OF SCOPE — do not build any part of it.

A separate pass (commit 035a667) just fixed a MapLibre crash in
`app/src/ui/routeMapView.tsx`. Do not touch that file.

## 2. Files you may modify (exactly these seven, nothing else)

1. `app/src/storage/types.ts` (§4)
2. `app/src/storage/eventsJsonl.ts` (§5)
3. `app/src/location/session.ts` (§6)
4. `app/src/location/index.ts` (§7)
5. `app/src/ui/RecordScreen.tsx` (§8)
6. `app/src/storage/gpxPlusExport.ts` (§9)
7. `app/tests/gpxplus_suite.ts` (§10)

Explicitly OFF-LIMITS: `app/src/live/engine.ts`, `app/src/storage/gpxExport.ts`,
`app/src/storage/core.ts`, `app/src/storage/index.ts`, `app/src/ui/routeMapView.tsx`,
`app/src/ui/recordFlow.ts`, `demos/`, `design/`, `IDEAS.md`, `STATE.md`,
`product/DECISIONS.md`, `product/BACKLOG.md`, and everything else.

No mockup regeneration is needed: the planner grepped `demos/` and `design/` — the
recovery banner is not depicted anywhere in the mockups, so P5's banner change has no
shipped-design artifact to regenerate (CLAUDE.md rule 6 satisfied vacuously).

Recommended order: §4 → §5 → §9 → §10 first (pure storage/export layer, headlessly
testable), run the suite, then §6 → §7 → §8 (device layer, type-check only), then §11.

## 3. P1 — verification status, and your (tiny) part

The planner verified at HEAD: `ensureSession()` (`app/src/location/index.ts`, lines
108–128) consults the disk marker exactly once per JS launch (the `sessionLoaded`
guard) and, when a fresh launch restores a session, logs
`{ kind: 'relaunch', tUnixMs: Date.now() }` and re-arms `liveEngine` behind the
once-per-launch `engineArmedThisLaunch` flag (declared line 76) — regardless of
whether the background task handler (its call at line 148) or RecordScreen's mount →
`getRecoveryState()` (line 445) reaches it first. Both callers funnel through the same
function. CONFIRMED — do not re-derive or re-investigate.

Neither `location/index.ts` (imports expo-location / expo-task-manager /
expo-constants / react-native) nor `session.ts` (imports expo-file-system/legacy) can
be imported by the headless Node test runner, so the race itself CANNOT be locked by a
unit test. Do NOT invent a fake one. The regression locks this pass adds are:
(a) the pure-layer tests of §10 (decoder + export shapes for exactly the events this
logic emits), and (b) the manual on-device protocol in Appendix A of THIS brief file,
which the coordinator runs at the next device test. Your only P1 code obligation:
while making §7's edits, confirm the code you find matches the description above —
if it does not, STOP and report.

## 4. `app/src/storage/types.ts` — event-shape changes (P4 + P5)

**4a.** `RelaunchEvent` (currently, near line 122):

```ts
export interface RelaunchEvent {
  kind: 'relaunch';
  tUnixMs: number;
}
```

becomes:

```ts
export interface RelaunchEvent {
  kind: 'relaunch';
  tUnixMs: number;
  /** Cycle 025 (P4): seconds between the session marker's last heartbeat
   * (ActiveSession.lastAliveAtMs, session.ts) and this relaunch recovery —
   * how long the process was actually dead, accurate to the ~30-fix
   * heartbeat cadence. Optional so a sidecar recorded before this field
   * existed, or a marker without a heartbeat, still decodes — omitted,
   * never fabricated. */
  downS?: number;
}
```

**4b.** Immediately after `RelaunchEvent`, add a new event interface:

```ts
/** Cycle 025 (P5, Nathan's 2026-08-26 visibility-first ruling): a UI-only
 * restoration — RecordScreen mounted and found an in-progress, still-tracking
 * session while the JS process stayed alive (no process death). Logged so the
 * "recovered" banner ALWAYS has a matching sidecar record (one shared
 * predicate, location/index.ts's getRecoveryState), but a remount is NEVER a
 * relaunch: the GPX+ <qf:relaunches> count filters on kind === 'relaunch'
 * only, so this kind can never inflate the true process-death count. */
export interface RemountEvent {
  kind: 'remount';
  tUnixMs: number;
}
```

**4c.** In the `RideEvent` union (currently
`| MetaEvent | ButtonEvent | LockEvent | GateFireEvent | StorageErrorEvent | RelaunchEvent`
on one line, `| RouteMatchDiagnosticEvent | ElevationOutlierEvent` on the next), add
`| RemountEvent` directly after `RelaunchEvent`.

## 5. `app/src/storage/eventsJsonl.ts` — decoder tolerance (P4 + P5)

**5a.** The `KINDS` set (lines 4–7) gains `'remount'`:

```ts
const KINDS = new Set([
  'meta', 'button', 'lock', 'gate', 'storageError', 'relaunch', 'remount',
  'routeMatchDiagnostic', 'elevationOutlier',
]);
```

**5b.** In `isValidEvent`, the `case 'relaunch':` arm (currently
`return true; // no fields beyond kind/tUnixMs`) becomes:

```ts
    case 'relaunch':
      // downS is optional (cycle 025 P4) — an older sidecar without it must
      // still decode; a present-but-non-finite value is rejected like any
      // other malformed field.
      return r.downS === undefined || Number.isFinite(r.downS);
```

**5c.** Add a new arm directly after it:

```ts
    case 'remount':
      return true; // no fields beyond kind/tUnixMs
```

## 6. `app/src/location/session.ts` — heartbeat field on the marker (P4)

D-023 check (planner-verified): this marker (`qualifire-active-ride.json`) is a
mutable convenience file — `saveSession` already overwrites it wholesale on every
call. It is NOT the append-only raw ride JSONL (that lives in `storage/core.ts` and
is untouched by this pass). Updating it periodically is safe and doctrine-compliant.

**6a.** `ActiveSession` gains an optional field (after `routeIds?: string[] | null;`):

```ts
  /** Cycle 025 (P4): last-known-alive heartbeat, refreshed by the location
   * task every HEARTBEAT_EVERY_N_FIXES fixes (location/index.ts) and set at
   * startTracking. On relaunch recovery, ensureSession derives
   * downS = (now - lastAliveAtMs)/1000 for the relaunch event — measuring
   * the outage, not just counting it. Optional: a marker written before this
   * field existed still loads (downS is then simply omitted). */
  lastAliveAtMs?: number;
```

**6b.** In `loadSession`, inside the
`if (typeof parsed.rideId === 'string' && typeof parsed.startedAtMs === 'number')`
branch, after the `routeIds` line add:

```ts
      const lastAliveAtMs =
        typeof parsed.lastAliveAtMs === 'number' && Number.isFinite(parsed.lastAliveAtMs)
          ? parsed.lastAliveAtMs
          : undefined;
```

and extend the return to
`return { rideId: parsed.rideId, startedAtMs: parsed.startedAtMs, mode, routeIds, lastAliveAtMs };`

## 7. `app/src/location/index.ts` — heartbeat, downS, one restoration predicate (P4 + P5)

**7a. Module state.** Directly after the `engineArmedThisLaunch` declaration
(line 76, `let engineArmedThisLaunch = false;`), add:

```ts
// Cycle 025 (P4): heartbeat — refresh the session marker's lastAliveAtMs
// every N fixes so a relaunch can measure HOW LONG the process was dead
// (downS on the relaunch event), not just that it died. Cheap: one small
// JSON overwrite per ~30 s at the 1 Hz fix cadence.
const HEARTBEAT_EVERY_N_FIXES = 30;
let fixesSinceHeartbeat = 0;
// Cycle 025 (P5): one shared restoration predicate (Nathan 2026-08-26,
// visibility-first). ensureSession() marks a fresh-launch disk restore; the
// FIRST getRecoveryState() call afterwards claims that restore as the
// 'relaunch' the banner reports; every LATER mount that finds a live session
// is a 'remount' (process alive, UI-only) — banner shown AND event logged,
// but never counted as a relaunch (GPX+ counts kind === 'relaunch' only).
let freshLaunchRestore = false;
let freshRestoreConsumedByUi = false;
```

**7b. `ensureSession()` restore branch.** Replace (currently lines 121–124):

```ts
    if (session && !engineArmedThisLaunch) {
      engineArmedThisLaunch = true;
      logEvent(session.rideId, { kind: 'relaunch', tUnixMs: Date.now() });
      liveEngine.start({ pickId: null, mode: session.mode ?? 'route', routeIds: session.routeIds ?? null });
    }
```

with:

```ts
    if (session && !engineArmedThisLaunch) {
      engineArmedThisLaunch = true;
      freshLaunchRestore = true;
      // Cycle 025 (P4): how long was the process dead? Derived from the
      // marker's last heartbeat when present; omitted (never fabricated)
      // for a marker written before the field existed.
      const nowMs = Date.now();
      const downS =
        session.lastAliveAtMs !== undefined
          ? Math.max(0, Math.round(((nowMs - session.lastAliveAtMs) / 1000) * 10) / 10)
          : undefined;
      logEvent(session.rideId, {
        kind: 'relaunch', tUnixMs: nowMs,
        ...(downS !== undefined ? { downS } : {}),
      });
      liveEngine.start({ pickId: null, mode: session.mode ?? 'route', routeIds: session.routeIds ?? null });
    }
```

Do NOT change anything else in `ensureSession` (the `sessionLoaded` guard and the
existing doc comments stay).

**7c. Task-handler heartbeat.** In the `TaskManager.defineTask` handler's per-fix
`try` success path, directly after `fixesThisLaunch += 1;` (line ~170), add:

```ts
        fixesSinceHeartbeat += 1;
```

Then AFTER the `for (const loc of locations) { ... }` loop closes and BEFORE the
final `emit();` of the handler (currently line ~213), add:

```ts
    // Cycle 025 (P4) heartbeat — swallow-everything, same doctrine as every
    // diagnostics write on this path: the marker refresh must never disturb
    // recording. `s` is the module `session` object, so subsequent saves
    // carry the field too.
    if (fixesSinceHeartbeat >= HEARTBEAT_EVERY_N_FIXES) {
      fixesSinceHeartbeat = 0;
      s.lastAliveAtMs = Date.now();
      saveSession(s).catch(() => { /* best-effort; the next heartbeat retries */ });
    }
```

`saveSession` is already imported at the top of the file (line 24) — no import change.

**7d. `startTracking`.** Replace the session construction (currently):

```ts
  const s: ActiveSession = {
    rideId,
    startedAtMs: Date.now(),
```

with:

```ts
  const startedAtMs = Date.now();
  const s: ActiveSession = {
    rideId,
    startedAtMs,
    // Cycle 025 (P4): first heartbeat = start; refreshed every
    // HEARTBEAT_EVERY_N_FIXES fixes by the task handler above.
    lastAliveAtMs: startedAtMs,
```

(the `mode:` and `routeIds:` lines that follow stay exactly as they are). In the
post-start state-reset block (the run of assignments beginning `session = s;` /
`sessionLoaded = true;` / `fixesThisLaunch = 0;` ...), add `fixesSinceHeartbeat = 0;`
directly after `fixesThisLaunch = 0;`.

**7e. `getRecoveryState()`.** Replace the whole function (currently lines 437–458,
including its doc comment) with:

```ts
/**
 * Call once on RecordScreen mount. Detects "app relaunched while a ride was
 * (or should have been) recording":
 *  - tracking === true  → the foreground service is still running; the task
 *    keeps appending. UI should resume the recording screen.
 *  - tracking === false → the service died (OS/battery saver). UI should
 *    offer to finalise the ride so its fixes aren't stranded.
 * Cycle 025 (P5, Nathan 2026-08-26): this is ALSO the single shared
 * restoration predicate — the same call that decides the banner logs the
 * sidecar record, so the two can never disagree again. `restoration` says
 * which kind of restoration this mount is seeing:
 *  - 'relaunch': this JS launch restored the session from disk (a real
 *    process death; the relaunch event was already logged by ensureSession,
 *    headless-safe) — claimed by the first UI mount only.
 *  - 'remount': the process stayed alive and only the UI remounted; a
 *    'remount' event is logged HERE (only when still tracking — the
 *    dead-service path shows the finalise Alert, not the banner), flagged so
 *    the exported relaunch count never includes it.
 */
export async function getRecoveryState(): Promise<{
  session: ActiveSession;
  tracking: boolean;
  restoration: 'relaunch' | 'remount';
} | null> {
  const s = await ensureSession();
  if (!s) return null;
  let tracking = false;
  try {
    tracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    tracking = false;
  }
  let restoration: 'relaunch' | 'remount';
  if (freshLaunchRestore && !freshRestoreConsumedByUi) {
    freshRestoreConsumedByUi = true;
    restoration = 'relaunch';
  } else {
    restoration = 'remount';
    if (tracking) logEvent(s.rideId, { kind: 'remount', tUnixMs: Date.now() });
  }
  return { session: s, tracking, restoration };
}
```

## 8. `app/src/ui/RecordScreen.tsx` — banner from the shared predicate (P5)

**8a.** After `const [recovered, setRecovered] = useState(false);` (line 133), add:

```ts
  // Cycle 025 (P5): which kind of restoration the banner is reporting —
  // set from getRecoveryState().restoration, the single shared predicate.
  const [recoveredKind, setRecoveredKind] = useState<'relaunch' | 'remount'>('relaunch');
```

**8b.** In the relaunch-recovery mount effect (lines ~206–235), the
`if (rec.tracking)` branch currently reads:

```ts
      if (rec.tracking) {
        // Service survived; keep recording, resume the UI.
        setSession(rec.session);
        setRecovered(true);
      } else {
```

Change it to:

```ts
      if (rec.tracking) {
        // Service survived; keep recording, resume the UI. Banner kind comes
        // from the SAME predicate that logged the sidecar record (P5) —
        // banner and counter can no longer disagree.
        setSession(rec.session);
        setRecoveredKind(rec.restoration);
        setRecovered(true);
      } else {
```

**8c.** The banner (currently, lines ~636–640):

```tsx
        {recovered && (
          <Text style={styles.recovered}>
            Recovered after relaunch — still recording. Nothing was lost on disk.
          </Text>
        )}
```

becomes (strings pinned — do not reword):

```tsx
        {recovered && (
          <Text style={styles.recovered}>
            {recoveredKind === 'relaunch'
              ? 'Recovered after relaunch — still recording. Nothing was lost on disk.'
              : 'Recording continued in the background — nothing was lost on disk.'}
          </Text>
        )}
```

Intended behaviour change (Nathan's 2026-08-26 ruling, do not "fix" it): ANY mount
that finds a live tracking session now shows a banner — including a same-launch
UI-only remount that previously showed the (then-dishonest) relaunch banner with
nothing logged. Now it shows the remount wording AND logs a flagged `remount` event.
Nothing else in RecordScreen changes; `setRecovered(false)` calls in onStart/onEnd
stay as they are.

## 9. `app/src/storage/gpxPlusExport.ts` — export all locks (P3) + timestamped relaunches (P2/P4)

**9a. Import.** In the type-import block (lines 19–30), add `RelaunchEvent` to the
imported names (alphabetical slot: after `MetaEvent,`).

**9b. P3 — the lock section.** Replace the ENTIRE `if (events !== null) { ... }`
block that currently spans lines 170–237 (it begins
`const lockEv = evs.find((e): e is LockEvent => e.kind === 'lock');` and ends with
the `lines.push(`   <qf:routeLock>none</qf:routeLock>`);` else-branch) with the block
below. The `try { ... }` body and `catch` are byte-identical to HEAD except that
`settledLockEv` is now sourced from `lockEvs` — verify against HEAD as you paste:

```ts
  if (events !== null) {
    const lockEvs = evs.filter((e): e is LockEvent => e.kind === 'lock');
    if (lockEvs.length > 0) {
      // Cycle 025 (P3): EVERY lock event is exported, in sidecar order — the
      // old evs.find() took only the FIRST lock, silently discarding the
      // rest (e.g. the settled lock that followed a transient soft display
      // lock). Repeating qf:routeLock keeps the shape additive/backward-
      // compatible: a consumer that read "the" routeLock still finds the
      // first element first. lockKind is emitted only when the event carries
      // it (a pre-WP-D2 sidecar doesn't — honest omission); its values are a
      // closed literal union ('soft'|'verified'|'finalized'), no escaping
      // needed.
      for (const l of lockEvs) {
        const lk = l.lockKind === undefined ? '' : ` lockKind="${l.lockKind}"`;
        lines.push(
          `   <qf:routeLock track="${escapeXml(l.track)}" atChainageM="${num(l.atChainageM)}" atT="${isoTime(l.atT * 1000)}"${lk}/>`,
        );
      }
      // Cycle 023 fix 4 (semantics unchanged by P3): distance keyed to the
      // FIRST lock's track; only emitted when that track is recognized — an
      // old/renamed track id degrades to no field, never an export failure.
      const dist = routeDistanceM(lockEvs[0].track);
      if (dist !== null) lines.push(`   <qf:routeDistanceM>${num(dist)}</qf:routeDistanceM>`);
      // WP-G Part 4: session-level route fidelity — only emitted when the
      // ride actually SETTLED on a route, not merely soft-locked (a soft
      // lock is "a display choice, not a narrowing of the evidence" per
      // engine.ts — publishing a fidelity % against it would be an unearned
      // claim, D-025/D-028). Take the LAST lock event whose lockKind isn't
      // 'soft' (undefined lockKind = pre-WP-D2 sidecar, treated as settled;
      // there was only one kind of lock then).
      // AND a refFor lookup was actually injected (see RefLookup's doc
      // comment). Session-level + off-route segments, not per-point
      // (cheapest honest option: derivable at export time, no per-trkpt
      // bloat). refFor() throws for an unrecognized/renamed track id —
      // caught, block omitted, never an export failure (same doctrine as
      // routeDistanceM above).
      const settledLockEv = [...lockEvs].reverse().find((e) => e.lockKind !== 'soft');
      try {
        if (!refFor) throw new Error('no refFor injected');
        if (!settledLockEv) throw new Error('no settled (non-soft) lock');
        const ref = refFor(settledLockEv.track);
        const lats = fixes.map((f) => f.lat);
        const lons = fixes.map((f) => f.lon);
        const { x, y } = toXY(lats, lons, ref.lat0, ref.lon0);
        const { xtd } = projectRideOffline(x, y, ref);
        const nFixes = fixes.length;
        if (nFixes > 0) {
          let onCount = 0;
          let maxXtd = 0;
          for (let i = 0; i < nFixes; i++) {
            if (xtd[i] <= CORRIDOR_M) onCount += 1;
            if (xtd[i] > maxXtd) maxXtd = xtd[i];
          }
          const onRoutePct = ((100 * onCount) / nFixes).toFixed(1);
          const maxXtdCapped = Math.min(maxXtd, 999).toFixed(1);
          const segs = findOffRouteSegments(fixes, xtd, CORRIDOR_M).slice(0, 20);
          lines.push(
            `   <qf:routeFidelity track="${escapeXml(settledLockEv.track)}" corridorM="${num(CORRIDOR_M)}"` +
              ` onRoutePct="${onRoutePct}" maxXtdM="${maxXtdCapped}">`,
          );
          for (const s of segs) {
            lines.push(
              `    <qf:offRouteSeg fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"` +
                ` maxDistM="${Math.min(s.maxDistM, 999).toFixed(1)}"/>`,
            );
          }
          lines.push(`   </qf:routeFidelity>`);
        }
      } catch {
        /* no refFor injected, no settled lock, or an unrecognized/renamed
           track id: omit the block, no export failure */
      }
    } else {
      lines.push(`   <qf:routeLock>none</qf:routeLock>`);
    }
  }
```

**9c. P2/P4 — the relaunches lines.** Replace (currently lines 312–313):

```ts
    const relaunches = evs.filter((e) => e.kind === 'relaunch').length;
    lines.push(`   <qf:relaunches count="${relaunches}"/>`);
```

with:

```ts
    // Cycle 025 (P2/P4): timestamped relaunch entries, not just a count —
    // the 2026-08-22 crash review needed WHEN the process died and for how
    // long, and a bare count couldn't say. The count filters on
    // kind === 'relaunch' ONLY: 'remount' events (P5) are UI-visibility
    // records, never process deaths, and are not exported at all. downS is
    // omitted when the source event lacks it (pre-P4 sidecar, or a marker
    // without a heartbeat) — never fabricated. count="0" keeps the exact
    // self-closing form existing consumers and test (g) pin.
    const relaunchEvs = evs.filter((e): e is RelaunchEvent => e.kind === 'relaunch');
    if (relaunchEvs.length > 0) {
      lines.push(`   <qf:relaunches count="${relaunchEvs.length}">`);
      for (const r of relaunchEvs) {
        const down = r.downS === undefined ? '' : ` downS="${num(r.downS)}"`;
        lines.push(`    <qf:relaunch t="${isoTime(r.tUnixMs)}"${down}/>`);
      }
      lines.push(`   </qf:relaunches>`);
    } else {
      lines.push(`   <qf:relaunches count="0"/>`);
    }
```

Timestamp format is `isoTime(tUnixMs)` — the same formatter every other `t="..."`
attribute in this file uses. Consumer check (planner-verified): the ONLY code reading
`qf:routeLock` or `qf:relaunches` anywhere in the repo is this exporter and
`app/tests/gpxplus_suite.ts`; the `.gpx` files under `data/activities/` are past
export OUTPUTS, not consumers. No external coordination needed. Remount events are
deliberately NOT exported this pass (the sidecar keeps them) — mention this in your
report's NOTES so the coordinator can surface it to Nathan.

## 10. `app/tests/gpxplus_suite.ts` — regression locks

**10a.** Extend test (a) ("events JSONL encode->decode identity", line ~57): in its
`events: RideEvent[]` array, directly after `{ kind: 'relaunch', tUnixMs: 6000 },`
add:

```ts
    { kind: 'relaunch', tUnixMs: 6500, downS: 6.2 },
    { kind: 'remount', tUnixMs: 6600 },
```

The test's assertions are parametric on `events.length` — nothing else changes.

**10b.** Append a new section at the end of the file:

```ts
// ---------------------------------------------------------------- (p) cycle 025: relaunch/lock export enrichment

test('gpx+: cycle 025 — relaunches block carries one timestamped child per relaunch; downS only when present; remounts excluded from the count', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 1000 });
  await storage.appendEvent(rideId, { kind: 'remount', tUnixMs: clock.t + 1500 });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 2000, downS: 6.2 });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:relaunches count="2">'), 'count must be 2 (a remount is not a relaunch)');
  assert(gpx.includes(`<qf:relaunch t="${isoTime(clock.t + 1000)}"/>`), 'downS-less relaunch child missing, or downS fabricated');
  assert(gpx.includes(`<qf:relaunch t="${isoTime(clock.t + 2000)}" downS="6.2"/>`), 'relaunch child missing its downS');
  assert(gpx.includes('</qf:relaunches>'), 'relaunches block not closed');
  assert(!gpx.includes('qf:remount'), 'remount events must not be exported');
  const plain = await storage.exportGpx(rideId);
  assert(!plain.includes('qf:'), 'standard exportGpx leaked qf: content');
});

test('gpx+: cycle 025 — every lock event is exported in sidecar order with its lockKind; routeDistanceM still keyed to the first lock', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000, lockKind: 'soft',
  });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t + 5000, track: 'Morning', atChainageM: 120, atT: (clock.t + 5000) / 1000, lockKind: 'verified',
  });
  // pre-WP-D2-style lock with no lockKind at all — the attribute must be omitted
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t + 9000, track: 'Morning', atChainageM: 300, atT: (clock.t + 9000) / 1000,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  const locks = gpx.match(/<qf:routeLock /g) ?? [];
  assert(locks.length === 3, `${locks.length} qf:routeLock elements, want 3`);
  assert(/<qf:routeLock track="Morning" atChainageM="10"[^>]*lockKind="soft"/.test(gpx), 'soft lock missing/wrong');
  assert(/<qf:routeLock track="Morning" atChainageM="120"[^>]*lockKind="verified"/.test(gpx), 'verified lock missing/wrong');
  assert(/<qf:routeLock track="Morning" atChainageM="300" atT="[^"]+"\/>/.test(gpx), 'kindless lock must omit the lockKind attribute');
  assert(gpx.indexOf('atChainageM="10"') < gpx.indexOf('atChainageM="120"'), 'locks out of sidecar order');
  assert(gpx.includes('<qf:routeDistanceM>5325</qf:routeDistanceM>'), 'routeDistanceM missing (first lock, Morning)');
});
```

**10c.** Existing tests you must NOT weaken (expected to pass UNCHANGED — if any
fails after your edits, your change is wrong, not the test; STOP and report rather
than editing them):
- test (e) "byte-identical standard export" — its ride contains one relaunch event,
  so the export now emits the child form; `stripGpxPlus` filters every `<qf:`/`</qf:`
  line, so stripped output stays byte-identical.
- test (g) — pins `<qf:relaunches count="0"/>` (that ride has no relaunch events) and
  `<qf:routeLock track="Morning" atChainageM="450.5"` (its single lock has no
  lockKind, so the element is byte-identical to before).
- test (h) — no sidecar file → no `<qf:relaunches` / `<qf:routeLock` at all.
- the four WP-G Part 4 routeFidelity tests — settled-lock selection semantics are
  unchanged.
- test (n) B-69 — `<qf:routeLock>none</qf:routeLock>` fallback unchanged.

## 11. Verification (run everything yourself; nothing is done because you say so)

1. **Full suite** (from a fresh shell):
   `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts 2>&1 | tail -15`
   Required: `0 fail`, and the two new §10b tests listed as PASS. If the run risks
   the ~45 s cap, background it:
   `cd "$HOME/mnt/Qualifire/app" && nohup node --experimental-strip-types tests/run.ts > ../cycles/cycle-025-briefs/testrun-relaunch.out 2>&1 & disown`
   then poll `tail -15 "$HOME/mnt/Qualifire/cycles/cycle-025-briefs/testrun-relaunch.out"`.
2. **Type check** (this one usually needs backgrounding):
   `cd "$HOME/mnt/Qualifire/app" && nohup npx tsc --noEmit > ../cycles/cycle-025-briefs/tsc-relaunch.out 2>&1 & disown`
   Poll with `pgrep -f "tsc --noEmit" || echo done` then read the outfile. Required:
   the outfile is EMPTY (clean).
3. **First-lock bug really gone:**
   `cd "$HOME/mnt/Qualifire" && grep -n "evs.find((e): e is LockEvent" app/src/storage/gpxPlusExport.ts`
   must print nothing.
4. Record before/after test counts (the suite prints `N tests: ...` at the end).

## 12. Acceptance criteria

- [ ] All seven §2 files changed as specified; NO other file touched; no git commands.
- [ ] Full suite: zero FAIL (including every §10c pinned test, unmodified).
- [ ] `npx tsc --noEmit`: clean.
- [ ] `<qf:relaunches count="0"/>` self-closing form preserved for zero relaunches;
      count > 0 emits the block form with one `<qf:relaunch t="..."/>` child per
      relaunch event, `downS` attribute only when the event carries it.
- [ ] Every lock event exports as its own `<qf:routeLock .../>` element, in order,
      `lockKind` attribute only when present; `routeDistanceM` and `routeFidelity`
      semantics unchanged.
- [ ] `getRecoveryState()` returns `restoration: 'relaunch' | 'remount'`, logs a
      `remount` event exactly when a live tracking session is handed to a
      non-first-restore mount, and the banner strings match §8c verbatim.
- [ ] Session marker carries `lastAliveAtMs` from START and refreshes every 30 fixes;
      the relaunch event carries `downS` derived from it (rounded to 0.1 s, clamped
      at >= 0); all marker writes swallow errors.
- [ ] No P6 work. No mockup/design regeneration (planner-verified as not applicable).

## 13. Report format (return exactly this shape)

```
RESULT: done | blocked (reason)
CHANGES: <one line per file, 7 lines>
TESTS: <N before> -> <N after> tests, <pass>/<fail>
TSC: clean | <paste errors>
DEVIATIONS: none | <list, each with why>
NOTES: remount events are logged but not exported (deliberate, needs Nathan's eyes);
       <anything surprising>
```

## Appendix A — manual on-device verification protocol (P1/P4/P5)

For the coordinator's next device session; the executor does NOT run this.

1. Start a route ride; keep it recording for >= 40 s (> 30 fixes, so at least one
   heartbeat lands on the marker).
2. Swipe the app away in the task switcher while the foreground-service notification
   stays up. Wait ~60 s.
3. Reopen the app via the launcher icon. Expect: the "Recovered after relaunch —
   still recording. Nothing was lost on disk." banner.
4. End the ride, export GPX+. Expect `<qf:relaunches count="1">` containing exactly
   one `<qf:relaunch t="..." downS="..."/>` whose `t` is near the reopen time and
   whose `downS` is ~60–90 s (the wait plus up to one 30-fix heartbeat lag).
5. Race-direction check (the original bug's class): repeat steps 1–3 but reopen via
   the foreground-service NOTIFICATION instead of the launcher icon (different
   first-caller ordering: background task vs UI mount). The exported count must
   still be exactly 1 — never 0, never 2.
6. Remount check (P5): mid-ride, if the UI can be driven away from RecordScreen and
   back (process alive throughout), expect the "Recording continued in the
   background — nothing was lost on disk." banner, a `remount` line in
   `rides/<rideId>.events.jsonl`, and the exported relaunch count NOT incremented.
