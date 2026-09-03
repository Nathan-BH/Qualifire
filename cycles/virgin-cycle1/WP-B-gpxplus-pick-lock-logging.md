**Status: DONE — landed on the device 2026-09-03 (commit `f7d96f7`). 374 tests, 371 pass, 0 fail, 3 skip (baseline 366/363/0/3 + 8 new); `tsc --noEmit` confirmed clean on-device. §2's current-state description (verified against the mirror at `ec46906`) still matched the real repo despite five later WPs (D/J/O/C/Q/F) having touched `RecordScreen.tsx`/`location/index.ts` since — re-read confirmed no structural conflict before editing, so §4 applied as written. No ambiguity required stopping for Nathan.**
**Review doc item: 2 (notes5 N9). Size: small.**
**Verified against the mirror at commit `ec46906` (after WP-A's third round landed) — re-grep `engine.ts`/`live_suite.ts` anchors before executing if more work has landed on them since.**

---

# WP-B — GPX+ pick and lock-change logging

*Plan tier (Fable), 2026-09-02. Item 2 of the 2026-09-01 virgin-ride review's plan (notes5 N9). Status: **UNBUILT** — this is an execution brief for a Sonnet Execute pass. If any ambiguity or surprise arises while executing, STOP and report back — never guess.*

> **Naming caution for the executor.** The codebase already uses the tag "WP-B" for the *free-ride* work (`WP-B fix B1/B2`, `WP-B: free mode`, `WP-B coordinator addendum` in `engine.ts`, `index.ts`, `session.ts`, `types.ts`, `RecordScreen.tsx`). Do **not** tag new comments "WP-B". Tag them **`N9 (2026-09-02, GPX+ pick/lock-change logging)`** so a future grep can tell the two apart.

## 1. Goal

Make a ride's GPX+ file a self-sufficient record of (a) what the RECORD tab was set to when START was pressed — from, to, the route pick, the mode, and whether the pick was an explicit tap or the silent §8a default — and (b) every change of the engine's `lockKind` during the ride, with its timestamp, the candidate, and the mechanism that caused it. Nathan's own words (notes5, 2026-08-29): *"if I select a route >> write it into the gpx+ data. If the app confirms the route locked >> write it into the gpx+ data. if it stays unchanged, fine; but if it changes to another route >> should be logged so we can investigate what happened."*

Under WP-A's hard pick (landed) there are no more mid-ride switches, so "changes to another route" collapses to the `lockKind` state machine: `none -> soft -> verified`, `none -> verified`, `soft -> finalized`, `none -> finalized`, or nothing at all. Two of those transitions are **completely invisible in today's sidecar** (see §2.4) — that is the concrete hole this WP closes.

Diagnostics only. Nothing here is a control input; the raw ride JSONL is untouched (D-023); the standard `exportGpx` stays byte-identical.

## 2. Current state (verified 2026-09-02 against `qualifire-mirror/app`, HEAD `ec46906`)

Line numbers below are from that read; re-grep the quoted anchor text rather than trusting them if more work has landed on `engine.ts`/`live_suite.ts` since.

### 2.1 The GPX+ writer is export-time, not ride-time

The module that emits `<qf:routeLock>` is **`src/storage/gpxPlusExport.ts`** (`buildSessionBlock()`, lines 194–434; `buildGpxPlus()`, 443–490). It is pure and runs at *export* time over two inputs: the decoded ride file and the decoded **events sidecar** `rides/<rideId>.events.jsonl` (`core.ts:284-294`, `exportGpxPlus` → `decodeEventsFile` → `buildGpxPlus`). Nothing is written to the GPX at ride time. So "emit `<qf:pick>` at START" really means: **append a `pick` event to the sidecar at START, and render it at export.** Same for lock changes. The doctrine, stated in the file header (lines 18–19): *"Only what was actually observed is ever emitted — no field is fabricated when its source event/data is absent."*

The sidecar pipeline has three layers, all of which gain a new event kind in this WP:

| Layer | File | What exists today |
|---|---|---|
| Types | `src/storage/types.ts:88-199` | `RideEvent` union: `meta, button, lock, gate, storageError, relaunch, remount, routeMatchDiagnostic, elevationOutlier`. `LockEvent` (102–119) already carries an **optional `pick?: string \| null`** — persisted since cycle 024, **never rendered** in the GPX. |
| Codec | `src/storage/eventsJsonl.ts` | `KINDS` set (4–7); `encodeEvent` (10–13) spreads the object with `kind`, `tUnixMs` first; `isValidEvent` (32–91) per-kind required-field validation — closed literal unions (e.g. `lockKind`) are enforced *here* because the export interpolates them unescaped (comment at 50–55). |
| Render | `src/storage/gpxPlusExport.ts` | `<qf:routeLock track= atChainageM= atT= lockKind=/>` per lock event, in sidecar order (249–254); `<qf:routeLock>none</qf:routeLock>` when a sidecar exists but has no lock events (312). Blocks like `gates`/`outages`/`stops`/`routeMatchDiagnostics` are **omitted entirely when empty**; `buttons` uses a wrapper with one child per event (418–425). Timestamps: `isoTime()` (always `YYYY-MM-DDTHH:MM:SS.sssZ`), numbers: `num()`, free text: `escapeXml()` — all from `gpxExport.ts:13-24`. |

### 2.2 Where the sidecar is fed from the live ride

**`src/location/index.ts`** is the integration point, not `RecordScreen.tsx`:

- `startTracking(opts)` (299–375): receives `{ routePick?, mode?, routeIds? }`, calls `liveEngine.start({ pickId: opts?.routePick ?? null, mode, routeIds })` at 363–367, then logs `meta` (368–371) and `button:'start'` (372) with `tUnixMs: pressedAtMs`. **It has no from/to landmark information at all** — that has to be threaded in.
- Module-scope `liveEngine.subscribeEvents(...)` (465–482) persists engine events: `if (ev.type === 'lock') {...} else { /* gate */ }`. **The `else` assumes every non-lock event is a gate** — adding a third `EngineEvent` member without touching this handler would log lock changes as gates. Must become explicit branches.
- `stopTracking()` (392–420) calls `liveEngine.finalize()` at 408 **while `session` is still set** (it is nulled at 415), so anything finalize() emits is attributable. `liveEngine.stop()` (417) runs after `session = null` — anything it emitted would be dropped by the `if (!session) return` guard, which is why start()/stop() must not emit lock changes (they don't in this design).
- `RecordScreen.onEnd` calls `liveEngine.finalize()` first, then `stopTracking()` calls it again — finalize() is idempotent today, and the new event must stay idempotent too (§3.2).
- Sidecar appends are serialised per ride (`core.ts:255-282`, `eventsTail`), so an event logged synchronously inside `startTracking` right after the `button:'start'` line is guaranteed to land before any lock event produced by the first fed fix.

### 2.3 What RecordScreen knows at START (all of it currently dropped on the floor)

`RecordScreen.tsx`:
- `fromId` — the detected-or-picked start landmark id, or `NEW_ID = '~new'`. `to` — the end landmark id or `'~new'` (WP-L may change how `fromId` is derived — its brief is additive to the same variable, not a conflict).
- `freeRide = fromId === NEW_ID || to === NEW_ID`; `freeRouteIds` — the directional filter handed to the engine in free mode.
- `way` — undefined when no catalog Way runs from→to (**ride 2's case**); `pickedRoute`: the explicit `routePick` if it is for *this* way and still exists, else `defaultRouteFor(wayRoutes)` (the §8a default), else null.
- `landmarkLabel(id)` gives the catalog label or `'new'`.
- `onStart`: free → `startTracking({ routePick: null, mode: 'free', routeIds })`; otherwise `startTracking({ routePick: pickedRouteRef.current?.id ?? null })`, reading the pick via a ref because `onStart` is a `[]` `useCallback`.

So three start shapes exist: **free** (mode free, no pick), **route with pick** (explicit tap *or* default — indistinguishable to the engine and to the file today), **route with no pick** (`way` undefined → auto-detect; ride 2). The review had to reconstruct ride 2's shape from source.

### 2.4 The engine's lock transitions — and which ones are silent

`src/live/engine.ts` (`LiveEngine`):
- `LockKind = 'none' | 'soft' | 'verified' | 'finalized'`. `EngineEvent` = `{type:'lock', track, atChainageM, atT, kind, pick}` | `{type:'gate', ...}`.
- `commitLock(cand, kind, tSec, accuracyM, poorNow)`: sets `this.lockKind = kind` **unconditionally**, but emits the `lock` event **only `if (isNewTarget)`** — the doc comment says so: *"A no-op target change (promotion of the already-displayed soft candidate) emits no new lock event."*
- `finalize()`: early-returns for free mode and `'verified'`; the "nothing completed" branch does `if (this.lockKind === 'soft') this.lockKind = 'finalized'; this.emit(); return;` — **no event**; the winner branch sets `this.lockKind = 'finalized'` and emits a `lock` event **only `if (!alreadyDisplayed)`**.
- `start()`/`stop()` reset `lockKind = 'none'` directly (ride boundaries, not transitions).

Dry-run against the suite's own synthetic pair (`SYN_S`/`SYN_L`) — measured, not inferred:

| Ride | `lockKind` transitions seen on `subscribe()` | `lock` events on `subscribeEvents()` |
|---|---|---|
| pick=L, ride L to 3000 m, finalize | `none->soft` (fix 81), `soft->verified` (fix 281) | **1** (`soft`) — the promotion is invisible |
| pick=L, ride shared road to 1000 m, finalize | `none->soft` (81), `soft->finalized` (201) | **1** (`soft`) — the ride-end settle is invisible |
| no pick, ride L to 3000 m, finalize | `none->verified` (281) | 1 (`verified`) |
| no pick, ride shared road to 1000 m, finalize | none | 0 |

Two of the five reachable transitions (`soft->verified`, `soft->finalized`) leave **no trace** in the sidecar today. Ride 2's `none->finalized` did leave a `lock` event, but with no *reason* and no record that there was no pick (the `pick` field was persisted as `null` and never rendered).

### 2.5 Two pre-existing facts worth knowing (not bugs this WP fixes)

- **A headless relaunch drops the pick.** `ensureSession()` re-arms with `liveEngine.start({ pickId: null, mode: session.mode ?? 'route', routeIds })` because `ActiveSession` persists `mode`/`routeIds` but **not** `routePick`. Under the hard pick that silently converts a picked ride into an auto-detect ride mid-ride. Out of scope here; with this WP landed it becomes *visible* in the file. Flagged in §8 as a recommended follow-up.
- The existing test suites assert `locks.length === 1` in several places and `evts.length === 0` in four never-locked rides. The design below keeps all of them green: lock-change events are a *new* `type`, filtered out by the `type === 'lock'` filters, and are only emitted on a transition to a non-`none` kind, so a ride that never locks still emits zero events.

Baseline (this session): `node --experimental-strip-types tests/run.ts` → **305 tests: 302 pass, 0 fail, 3 skip**. `tsc --noEmit` not run this session (see CONTEXT.md).

## 3. Design

### 3.1 `<qf:pick>` — once, a START-time fact

Rendered immediately after `<qf:startPressedAt>`. Attributes are rendered only when the event carries them; `mode`/`pickSource` are closed unions the decoder enforces; every other value is free text (labels are user-typed!) and goes through `escapeXml`. `routeIds` is a space-separated list, only when non-null.

```xml
<!-- route ride, way exists, §8a default applied (no explicit tap) -->
<qf:pick mode="route" from="lm:…:start" fromLabel="Home" to="lm:…:end" toLabel="Work" routeId="route:20260901-091752-f6ca" pickSource="default" t="2026-09-01T07:17:52.228Z"/>

<!-- route ride, explicit tap on a way with >1 route -->
<qf:pick mode="route" from="…" fromLabel="Work" to="…" toLabel="Home" routeId="route:…WorkHomeWet" pickSource="picked" t="…"/>

<!-- ride 2's actual shape: both ends known, no Way in that direction -> auto-detect, no pick -->
<qf:pick mode="route" from="lm:…:end" fromLabel="Work" to="lm:…:start" toLabel="Home" pickSource="none" t="2026-09-01T17:17:22.702Z"/>

<!-- ride 1's actual shape: new>>new free ride, unfiltered -->
<qf:pick mode="free" from="~new" fromLabel="new" to="~new" toLabel="new" pickSource="none" t="…"/>

<!-- free ride with one known end: the directional filter the engine ran with -->
<qf:pick mode="free" from="lm:…" fromLabel="Home" to="~new" toLabel="new" pickSource="none" routeIds="route:a route:b" t="…"/>
```

`pickSource` is always present (`picked | default | none`): "no pick" is stated out loud, never left to the absence of `routeId`. `from`/`to` are landmark **ids**; `fromLabel`/`toLabel` the labels *as shown at START*.

### 3.2 `<qf:lockChange>` — one per `lockKind` transition

Wrapped in `<qf:lockChanges>` (omitted entirely when there are none), rendered right after the `routeLock`/`routeDistanceM`/`routeFidelity` group. `from`/`to` are `LockKind` literals; `reason` is a closed union naming the *mechanism*:

| Transition | `reason` | Emitted where |
|---|---|---|
| `none -> soft` | `pickAdvance` — the pick's own candidate reached `LOCK_MIN_ADVANCE_M` of corridor-verified advance | `commitLock(…, 'soft')` |
| `none -> verified` | `unblockedLeader` — the leader has 400 m and no blocker inside the 200 m margin | `commitLock(…, 'verified')` |
| `soft -> verified` | `unblockedLeader` — same mechanism, `from="soft"` says it was a promotion | `commitLock(…, 'verified')` (the no-event path today) |
| `soft -> finalized` | `rideEndPromotion` — ride ended, nothing completed its own route, the still-soft display is relabelled settled | `finalize()`, `finished.length === 0` branch |
| `soft -> finalized` | `routeCompleted` — the pick's candidate completed its own route | `finalize()`, winner branch, `alreadyDisplayed === true` |
| `none -> finalized` | `routeCompleted` — a candidate completed its own route with no live lock | `finalize()`, winner branch, `alreadyDisplayed === false` |

```xml
<qf:lockChanges>
 <qf:lockChange from="none" to="soft" track="route:…WorkHomeWet" atChainageM="612.4" reason="pickAdvance" pick="route:…WorkHomeWet" t="2026-08-28T…Z"/>
 <qf:lockChange from="soft" to="verified" track="route:…WorkHomeWet" atChainageM="1410.9" reason="unblockedLeader" pick="route:…WorkHomeWet" t="…"/>
</qf:lockChanges>
```

`pick` is the engine's pick at the instant of the transition (omitted when null). `t` is the **triggering fix's** time.

**The "stayed unmatched" ride gets no `<qf:lockChange>` and no `<qf:lockChanges>` wrapper** — the transition never happened, so emitting a synthetic element would fabricate an observation. `<qf:pick …>` says what was attempted, `<qf:routeLock>none</qf:routeLock>` says nothing ever locked.

**Idempotence.** The engine emits a lock change **only when the kind actually changes**. `finalize()` is called twice per normal ride — the second call sees `'finalized' -> 'finalized'` and emits nothing.

**Ordering.** Within one transition the existing `lock` event (when there is one) is emitted first, then the `lockChange`.

### 3.3 Also render the already-persisted `pick` on `<qf:routeLock>`

`LockEvent.pick` has been on disk since cycle 024 and never shown. One line in the render loop: append ` pick="…"` (escaped) when the event carries a non-null string.

## 4. Exact changes

### 4.1 `src/live/engine.ts`

**(a)** Next to `LockKind`, add:
```ts
export type LockChangeReason = 'pickAdvance' | 'unblockedLeader' | 'routeCompleted' | 'rideEndPromotion';
```

**(b)** Add a third member to `EngineEvent`:
```ts
  | {
      type: 'lockChange';
      track: TrackId;
      from: LockKind;
      to: Exclude<LockKind, 'none'>;
      atChainageM: number;
      atT: number;
      reason: LockChangeReason;
      pick: string | null;
    };
```

**(c)** Private helper, next to `emitEvent`:
```ts
  private noteLockChange(prev: LockKind, cand: Candidate, atT: number, reason: LockChangeReason): void {
    if (prev === this.lockKind || this.lockKind === 'none') return;
    this.emitEvent({
      type: 'lockChange', track: cand.track, from: prev, to: this.lockKind,
      atChainageM: cand.proj.chainage, atT, reason, pick: this.pick,
    });
  }
```

**(d)** `commitLock` — capture the previous kind, emit at the end:
```ts
    const isNewTarget = this.locked !== cand;
    const prevKind = this.lockKind;
    this.locked = cand;
    this.lockKind = kind;
    …existing body unchanged…
    if (isNewTarget) { …unchanged… }
    this.noteLockChange(prevKind, cand, tSec, kind === 'soft' ? 'pickAdvance' : 'unblockedLeader');
```

**(e)** `finalize()` — hoist `const atT = …` from inside `if (!alreadyDisplayed)` to just after the early returns, then:
```ts
    const prevKind = this.lockKind;
    …
    if (finished.length === 0) {
      if (this.lockKind === 'soft') {
        this.lockKind = 'finalized';
        this.noteLockChange('soft', this.locked!, atT, 'rideEndPromotion');
      }
      this.emit();
      return;
    }
    …winner selection, this.locked = winner, this.lockKind = 'finalized', … unchanged…
    if (!alreadyDisplayed) { …unchanged, minus the hoisted atT line… }
    this.noteLockChange(prevKind, winner, atT, 'routeCompleted');
    this.emit();
```

**(f)** File header, HARD PICK paragraph: after *"it is promoted to VERIFIED with no second lock event"* add *"(a `lockChange` event records the promotion — N9)"*.

### 4.2 `src/storage/types.ts`

Add after `LockEvent`:
```ts
export interface PickEvent {
  kind: 'pick';
  tUnixMs: number;
  mode: 'route' | 'free';
  from?: string;
  to?: string;
  fromLabel?: string;
  toLabel?: string;
  routeId?: string | null;
  pickSource?: 'picked' | 'default' | 'none';
  routeIds?: string[] | null;
}
export interface LockChangeEvent {
  kind: 'lockChange';
  tUnixMs: number;
  track: string;
  from: 'none' | 'soft' | 'verified' | 'finalized';
  to: 'soft' | 'verified' | 'finalized';
  atChainageM: number;
  atT: number;
  reason: 'pickAdvance' | 'unblockedLeader' | 'routeCompleted' | 'rideEndPromotion';
  pick?: string | null;
}
```
Add both to the `RideEvent` union.

### 4.3 `src/storage/eventsJsonl.ts`

- `KINDS`: add `'pick', 'lockChange'`.
- `isValidEvent` cases (closed-union enforcement, same doctrine as `lockKind`):
```ts
    case 'pick': {
      const optStr = (v: unknown): boolean => v === undefined || typeof v === 'string';
      return (
        (r.mode === 'route' || r.mode === 'free') &&
        optStr(r.from) && optStr(r.to) && optStr(r.fromLabel) && optStr(r.toLabel) &&
        (r.routeId === undefined || r.routeId === null || typeof r.routeId === 'string') &&
        (r.pickSource === undefined || r.pickSource === 'picked' || r.pickSource === 'default' || r.pickSource === 'none') &&
        (r.routeIds === undefined || r.routeIds === null ||
          (Array.isArray(r.routeIds) && r.routeIds.every((x) => typeof x === 'string')))
      );
    }
    case 'lockChange':
      return (
        typeof r.track === 'string' &&
        (r.from === 'none' || r.from === 'soft' || r.from === 'verified' || r.from === 'finalized') &&
        (r.to === 'soft' || r.to === 'verified' || r.to === 'finalized') &&
        Number.isFinite(r.atChainageM) &&
        typeof r.atT === 'number' && isFiniteMsTime(r.atT * 1000) &&
        (r.reason === 'pickAdvance' || r.reason === 'unblockedLeader' ||
          r.reason === 'routeCompleted' || r.reason === 'rideEndPromotion') &&
        (r.pick === undefined || r.pick === null || typeof r.pick === 'string')
      );
```

### 4.4 `src/storage/gpxPlusExport.ts`

Import `LockChangeEvent, PickEvent` from `./types.ts`. Three insertions in `buildSessionBlock`:

**(a)** Right after the `startPressedAt` push:
```ts
  const pickEv = evs.find((e): e is PickEvent => e.kind === 'pick');
  if (pickEv) {
    const a = (k: string, v: string | null | undefined): string =>
      v === undefined || v === null ? '' : ` ${k}="${escapeXml(v)}"`;
    lines.push(
      `   <qf:pick mode="${pickEv.mode}"` +
        a('from', pickEv.from) + a('fromLabel', pickEv.fromLabel) +
        a('to', pickEv.to) + a('toLabel', pickEv.toLabel) +
        a('routeId', pickEv.routeId) +
        (pickEv.pickSource === undefined ? '' : ` pickSource="${pickEv.pickSource}"`) +
        (pickEv.routeIds ? ` routeIds="${escapeXml(pickEv.routeIds.join(' '))}"` : '') +
        ` t="${isoTime(pickEv.tUnixMs)}"/>`,
    );
  }
```

**(b)** In the `for (const l of lockEvs)` loop, render the persisted pick:
```ts
        const lk = l.lockKind === undefined ? '' : ` lockKind="${l.lockKind}"`;
        const pk = l.pick === undefined || l.pick === null ? '' : ` pick="${escapeXml(l.pick)}"`;
        lines.push(
          `   <qf:routeLock track="${escapeXml(l.track)}" atChainageM="${num(l.atChainageM)}" atT="${isoTime(l.atT * 1000)}"${lk}${pk}/>`,
        );
```

**(c)** Immediately after the `<qf:routeLock>none</qf:routeLock>` block closes, before `gateEvs`:
```ts
  const lockChangeEvs = evs.filter((e): e is LockChangeEvent => e.kind === 'lockChange');
  if (lockChangeEvs.length > 0) {
    lines.push(`   <qf:lockChanges>`);
    for (const c of lockChangeEvs) {
      const pk = c.pick === undefined || c.pick === null ? '' : ` pick="${escapeXml(c.pick)}"`;
      lines.push(
        `    <qf:lockChange from="${c.from}" to="${c.to}" track="${escapeXml(c.track)}"` +
          ` atChainageM="${num(c.atChainageM)}" reason="${c.reason}"${pk} t="${isoTime(c.atT * 1000)}"/>`,
      );
    }
    lines.push(`   </qf:lockChanges>`);
  }
```

Update the file-header comment's list of what the session block carries.

### 4.5 `src/location/index.ts`

**(a)** `startTracking` opts — add and export:
```ts
export interface StartContext {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  pickSource: 'picked' | 'default' | 'none';
}
…
export async function startTracking(opts?: {
  routePick?: string | null;
  mode?: 'route' | 'free';
  routeIds?: string[] | null;
  startContext?: StartContext;
}): Promise<ActiveSession> {
```

**(b)** Right after the `button:'start'` log:
```ts
  const ctx = opts?.startContext;
  logEvent(rideId, {
    kind: 'pick', tUnixMs: pressedAtMs,
    mode: opts?.mode ?? 'route',
    routeId: opts?.routePick ?? null,
    ...(ctx ? { from: ctx.from, to: ctx.to, fromLabel: ctx.fromLabel, toLabel: ctx.toLabel, pickSource: ctx.pickSource } : {}),
    ...(opts?.routeIds ? { routeIds: opts.routeIds } : {}),
  });
```

**(c)** The `subscribeEvents` handler — explicit branches:
```ts
liveEngine.subscribeEvents((ev) => {
  if (!session) return;
  if (ev.type === 'lock') {
    …unchanged…
  } else if (ev.type === 'lockChange') {
    logEvent(session.rideId, {
      kind: 'lockChange', tUnixMs: Math.round(ev.atT * 1000),
      track: ev.track, from: ev.from, to: ev.to, atChainageM: ev.atChainageM, atT: ev.atT,
      reason: ev.reason, pick: ev.pick,
    });
  } else {
    …the existing gate branch unchanged…
  }
});
```

### 4.6 `src/ui/RecordScreen.tsx`

**(a)** Import `type StartContext` from `'../location'`.

**(b)** After the `pickedRoute` computation:
```tsx
  const pickSource: StartContext['pickSource'] = freeRide || !pickedRoute
    ? 'none'
    : routePick !== null && routePick.wayId === way?.id && wayRoutes.some((r) => r.id === routePick.routeId)
      ? 'picked'
      : 'default';
```

**(c)** After `landmarkLabel` is defined, a ref mirror like `pickedRouteRef`:
```tsx
  const startContextRef = useRef<StartContext | null>(null);
  startContextRef.current = {
    from: fromId, to, fromLabel: landmarkLabel(fromId), toLabel: landmarkLabel(to), pickSource,
  };
```

**(d)** Both `startTracking` calls in `onStart` gain `startContext: startContextRef.current ?? undefined`.

## 5. Tests

### 5.1 `tests/gpxplus_suite.ts`

- Add one `pick` and one `lockChange` to the "one of each kind" identity test.
- Byte-identical test: append a `pick`/`lockChange` in the setup; assert `stripped === plain` still holds.
- No-sidecar test: assert `!gpx.includes('<qf:pick')` and `!gpx.includes('<qf:lockChanges')`.
- New: renders every recorded field, escapes labels, omits what wasn't recorded (route/default, free/none, free with routeIds, minimal pick).
- New: lists every transition in sidecar order with reason and pick; omitted when none; routeLock now carries pick.
- New: decoder rejects malformed pick/lockChange lines, keeps well-formed ones.

### 5.2 `tests/live_suite.ts`

Reuse `SYN_S`/`SYN_L`/`SYN_P`, `xyToLatLon`, `subscribeEvents`. Add a `changes()` filter helper. Five new tests (L1-L5) covering: pick=L soft→verified promotion (exactly one lock event, two lockChanges); pick=L shared-road soft→finalized rideEndPromotion, idempotent on a second finalize(); no-pick none→verified with `pick: null`; routeCompleted from both the picked-prefix and no-pick-late-anchor shapes; never-locked and free rides emit zero lockChanges. Full assertions are in the agent's original brief output — re-derive/copy exactly before executing, don't paraphrase the assertions.

## 6. Verification

```
cd app && node --experimental-strip-types tests/run.ts   # zero FAIL; expect 305 + new tests, 3 skip unchanged
cd app && ./node_modules/.bin/tsc --noEmit                # exit 0
```

## 7. Acceptance criteria

1. A route ride started from the RECORD tab writes exactly one `pick` sidecar event at START and renders `<qf:pick …/>` right after `<qf:startPressedAt>`.
2. Every `lockKind` transition produces exactly one `lockChange` event with the reason table in §3.2; idempotent; never-locked/free rides produce none.
3. `<qf:routeLock>` renders the persisted `pick` attribute when present.
4. `exportGpx` (standard) byte-identical to before; old sidecars export unchanged.
5. All existing + new tests pass; `tsc` clean.
6. No new comment tagged "WP-B"; tag `N9`.

## 8. Coordinator follow-ups surfaced (not blockers)

1. **Relaunch drops the pick** — `ActiveSession` doesn't persist `routePick`; a relaunch re-arms with `pickId: null`. With N9 landed this at least becomes readable from the file. Recommended as its own small follow-up.
2. Once WP-A and this land together, ride 2's own file would read `pickSource="none"`, `<qf:routeLock>none</qf:routeLock>`, no `<qf:lockChanges>` — exactly the "recognised as a virgin ride" shape Nathan asked for.

## 9. Files touched

`app/src/live/engine.ts`, `app/src/storage/types.ts`, `app/src/storage/eventsJsonl.ts`, `app/src/storage/gpxPlusExport.ts`, `app/src/location/index.ts`, `app/src/ui/RecordScreen.tsx`, `app/tests/gpxplus_suite.ts`, `app/tests/live_suite.ts`. Not touched: `gpxExport.ts`, `core.ts`, `session.ts`, `jsonl.ts`, any ride data, `STATE.md`/`OPEN-ITEMS.md`.
