# BRIEF — Live position chip, Stage 1 (cycle 025 · WP-live-ghost-position P1 · D-039 execution tier)

Written 2026-08-31 by the Opus planning pass (substituting for the exhausted Fable tier), from
the code at HEAD `ecd4f56`. Every anchor below was verified against the actual file bytes, and
**the entire edit set below was DRY-RUN against HEAD tonight** — applied verbatim, tested,
type-checked, diffed, then fully reverted. Every number in this brief is measured, not estimated.

You are the Haiku executor. **This brief is your ONLY input.** Do not read the WP, the backlog,
STATE.md, or any other document — everything you need is here. Execute exactly what is written.

**Stop-on-ambiguity rule (hard):** if any anchor string below does not match the file, if any
count or output differs from what is predicted here, if a test fails for a reason this brief
does not predict, or if you find yourself needing to make ANY decision this brief has not
already made for you — STOP immediately, change nothing further, and report the exact
discrepancy verbatim to the coordinator. Do NOT improvise, do NOT "fix" it, do NOT pick a
reasonable-looking alternative, do NOT rename anything, do NOT reformat anything. You are not
authorised to rule on anything. A stopped pass with a clear report is a success; a guessed pass
is a failure.

---

## Environment

- The repo is mounted at `$HOME/mnt/Qualifire`. Access it ONLY via `device_bash`.
- Every `device_bash` call is a FRESH shell — no cwd and no env carry over between calls. Start
  every command with `cd "$HOME/mnt/Qualifire" && …` or `cd "$HOME/mnt/Qualifire/app" && …`.
- The mount is SLOW. Prefix ordinary commands with `timeout 40` and pass `timeout_ms` ≈ 45000.
- **Exception — tsc.** `./node_modules/.bin/tsc --noEmit` takes well over 40 s on this mount.
  Run it with NO `timeout` prefix and `timeout_ms` ≈ 180000. Use the local binary path shown —
  NOT `npx tsc` (npx's resolution overhead alone blows the budget).
- The test suite (`node --experimental-strip-types tests/run.ts`) finishes in well under 40 s.
- Backgrounding (`nohup`, `&`, `disown`) does NOT survive across `device_bash` calls. Never try.
- **Do NOT run any git write command** — no `add`, `commit`, `checkout`, `restore`, `reset`,
  `stash`, `clean`. The coordinator commits. Read-only `git diff` / `git log` / `git show` is fine.
- There is a stale `.git/index.lock` on this mount that cannot be removed. `git status` and
  `git diff` may print `warning: unable to unlink '…/.git/index.lock'` — this is BENIGN, ignore
  it. If a git read command fails outright because of it, add `--no-optional-locks`, e.g.
  `git --no-optional-locks diff --stat`.
- **You cannot delete files on this mount** (`rm` returns "Operation not permitted"). Therefore:
  never create a file you would then need to remove. Every edit in this brief modifies an
  EXISTING file — **this brief creates no new files at all.** If you find yourself about to
  create one, you have misread the brief: STOP.
- There is an untracked `_to_delete/` folder at the repo root left by the planning pass (it
  holds one throwaway probe file the pass could not delete). Leave it alone; it is flagged to
  the coordinator. It is untracked, so it will not appear in `git diff`.
- Node v22 and `app/node_modules/.bin/tsc` are present.
- **Do NOT run `data/analysis/08_build_route_assets.py`** under any circumstances.
- **Do NOT run `data/analysis/07_build_mockup.py`.** Its template is stale: regenerating from
  it reverts `demos/mockup.html` by ~400 lines (measured tonight: 130 insertions, 536 deletions).
  You edit `demos/mockup.html` directly, exactly as specified in Part E.

---

## Mandate — what you are building

A **live position chip during the ride**: a small "P4 of 10" readout on the race screen that
shows where the rider currently stands among their own recent rides on the same route, updated
**only at gate crossings**, behind a settings toggle that **defaults ON**.

Nathan's rulings (2026-08-26, final — not open, do not re-litigate):
- The toggle exists and **starts enabled**.
- The chip updates ONLY at gate crossings — never ticking, never continuous (D-006/D-027: the
  race screen is glanceable and audio/haptic-first).
- The chip lives INSIDE the existing race-screen pane. It does not add a new screen region.
- It must use the **same time base** as the ranks and colours it sits beside (see next section).

**Acceptance:** during a route ride, once the first gate has been crossed, the race screen shows
a chip reading e.g. `P4 of 10` — the rider's rank on cumulative moving time at that gate against
the 9 most recent previous rides on that route — and that chip's value changes only when a gate
fires. Turning "Live position" off in Settings removes it entirely. The chip never appears when
a rank would be a fiction (no route locked, free ride, before the first gate, an estimated or
moving-time-less sector, or fewer than 5 comparable ghosts).

### THE TIME-BASE FINDING (read this, it is the trap)

**Ranks and colours in this app today compare MOVING time — time excluding stopped/paused
duration — NOT raw wall-clock.** Verified in code, not assumed:

- `app/src/ui/colourModel.ts:110` — `lapValues()` maps each ghost to `r.lap.movingS`.
- `app/src/ui/colourModel.ts:123` — `sectorValues()` pushes `s.movingS` (clean sectors only).
- `app/src/live/towerSource.ts:31-34` — the existing finish-line position chip reads
  `st.lap.movingS` and returns `null` when it is absent, with the comment *"MOVING time only.
  Falling back to raw ranked a stopped-time-inflated lap against everyone else's moving times —
  not the same quantity (cycle 009)."*
- `app/src/ui/ResultScreen.tsx:74` — the RESULT screen's rank line calls
  `positionAmong(ride.lapMovingS, hist)`.

So: **the live chip must be moving-time based.** It sums `LiveSector.movingS` for the completed
sectors and compares against sums of `SectorResult.movingS` from the stored population. It must
NEVER use raw wall-clock elapsed, and never the lap clock on screen. (Context, informational
only: a decision called D-042 named raw wall-clock as the eventual scoring default, but its
implementation is still open, so nothing in the app compares wall-clock today — and this chip
must not be the first thing that does.) Test A2 in Part D locks this in.

### EXPLICITLY OUT OF SCOPE — hard guard

**Stage 2 — moving ghost dots on the live map — is deliberately deferred and you must not touch
any part of it.** It requires an on-device visual check in both themes that this pipeline cannot
perform (MapLibre rendering has caused two device-only bugs already).

You must NOT, under any circumstances:
- open, edit, or import from `app/src/ui/routeMapView.tsx`, `app/src/ui/routeMapGeo.ts`,
  `app/src/ui/routeMapMath.ts`, `app/src/ui/routeMapStyle.ts`;
- change ANY `<RouteMapView …>` JSX or any prop passed to it (there are three such call sites in
  `RecordScreen.tsx`, at roughly lines 639, 717 and 868 — leave all three byte-identical);
- add animated markers, ghost dots, position-vs-time curves, or any per-ghost trace data;
- touch `app/src/ui/DemoScreen.tsx` or anything under `app/src/ui/preview/`.

If any instruction below seems to require touching live-map rendering, you have misread it: STOP.

---

## Baseline at HEAD (measured by the planning pass tonight)

- `cd app && node --experimental-strip-types tests/run.ts` → **264 tests: 261 pass, 0 fail, 3 skip**
- `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (took ~60–150 s tonight)
- `git --no-optional-locks status --porcelain` → only two untracked entries (`_to_delete/` and
  `data/activities/TEST in app rides/qualifire-20260830/`); no tracked file is modified.

---

## What already exists (verified — you are wiring existing parts together, not inventing)

You do **not** need to read these files to do the job; this section is here so you recognise the
anchors. Everything you need to type is given verbatim in Parts A–E.

1. **The ranking population already exists and you MUST reuse it, not reinvent it.**
   `app/src/ui/colourModel.ts` exports `ghostsFor(routeId, excludeRideId?)` (line 61) — the
   WINDOW_PREV = 9 most recent previous ranked rides on a route (`WINDOW_N` = 10, `WINDOW_PREV`
   = 9, `MIN_HISTORY` = 5, lines 28/35/39). Rider + that window = a pool of at most 10, which is
   why the chip reads "of 10" and can never read "of 11". It also exports
   `positionAmong(value, history)` (line 157) → `{ pos, of }`, which is generic over any array
   of numbers — it does NOT require a finished ride. **No extension of colourModel.ts is needed
   and you must not edit that file.**

2. **The gate-crossing hook already exists — nothing new has to be added to the engine.**
   `app/src/live/engine.ts`'s private `recompute()` (line 841) rebuilds `this.sectors` — one
   `LiveSector` per sector, each completed one carrying `movingS` — and it is called ONLY when a
   gate of the locked candidate fires (line 527: `if (lockedFired && this.locked) this.recompute();`,
   plus the lock/finalize replays). `getState()` (line 627) exposes `sectors` and `lastDone`
   (the highest gate index fired so far, 1-based; `null` before the first gate).
   **Consequence: a value derived from `state.sectors` + `state.lastDone` changes only at gate
   crossings, automatically. That is exactly the D-006/D-027 constraint, satisfied for free — no
   timer, no new event, no engine change.** You must NOT edit `app/src/live/engine.ts`.

3. **The position-chip UI component already exists.** `app/src/ui/chips.tsx:140` exports
   `PosChip({ label })` — a bordered chip rendering its label in plain ink, never a tier colour
   ("position is a FACT"). `app/src/ui/liveView.tsx` already imports it (line 31) and already
   renders it at the finish handover (line 270) from `LiveViewModel.posChip`. The RESULT screen
   uses the same copy format in prose (`ResultScreen.tsx:75`: `` `P${pos} of ${of} on this route` ``).
   **Decision already made for you: reuse `PosChip` as-is and add ONE new optional view-model
   field. Do not extract a shared component, do not create a new component, do not restyle
   `PosChip`, and do not edit `chips.tsx` at all.**

4. **The settings pattern already exists.** `app/src/ui/settings.tsx` holds a `Settings`
   interface (line 16), a `DEFAULTS` object (line 24), file persistence that merges
   `{...DEFAULTS, ...saved}` (so a settings file written before this change keeps the new
   default of `true`), and a `<Row …><Switch …/></Row>` pattern in the screen body. You copy
   that pattern exactly.

5. **Earcons / haptics on position CHANGE: EXPLICITLY SKIPPED — do not build it.**
   The WP made this optional and not required for acceptance. The whole audio/haptic channel
   today is `app/src/location/index.ts:434-450`: a single module-scope subscription firing one
   identical `Vibration.vibrate(70)` per gate fire, with an explicit contract ("one identical
   ~70 ms buzz per gate fire") and an explicit rule that the buzz lives in that layer and nowhere
   else. Tier earcons via `expo-audio` are still unbuilt. A position-change cue would therefore
   need either a second, distinguishable vibration pattern — breaking the "one identical buzz"
   contract, and colliding with the gate buzz in the same instant, since position changes happen
   AT a gate crossing — or an entirely new audio-cue subsystem. That is not cheap, so it is
   skipped by decision, not half-built. **Do not touch `app/src/location/index.ts`.**

---

## The edit set — 6 files, all existing. Apply in order.

Use `sed -i`, or a small throwaway python script written to `/tmp` (NOT inside the repo), or any
editing tool. Never re-type a whole file from tool output — output can be truncated.

Every anchor below is quoted verbatim and is UNIQUE in its file unless the brief says otherwise.
**Before each replacement, confirm the anchor occurs exactly once**, e.g.
`grep -c "…" path`. If a count is not 1, STOP and report.

---

### Part A — `app/src/live/towerSource.ts` (2 edits)

This file is already "the live position source". The new logic goes here; **no new file.**

**A1 — imports.** Anchor (lines 18–19, the two consecutive import lines):

```ts
import type { LiveEngineState } from './engine.ts';
import { MIN_HISTORY, lapValues, positionAmong } from '../ui/colourModel.ts';
```

Replace with:

```ts
import type { LiveEngineState, LiveSector } from './engine.ts';
import type { RideResult } from '../store/types.ts';
import { MIN_HISTORY, ghostsFor, lapValues, positionAmong } from '../ui/colourModel.ts';
```

**A2 — append the new functions at the END of the file.** The file currently ends with the body
of `getLiveTowerPosition` (lines 35–39, and this is the last line of the file):

```ts
  const ghosts = lapValues(st.track);
  // Same noise floor as the colours: one ghost yielding "P1" is not a fact.
  if (ghosts.length < MIN_HISTORY) return null;
  return `P${positionAmong(mine, ghosts).pos} of ${ghosts.length + 1}`;
}
```

Leave those lines exactly as they are and APPEND the following after them (note the blank line
first):

```ts

/* ----------------------------- WP-live-ghost-position P1 (Stage 1) ------- */

/**
 * Cumulative MOVING time from the START gate to gate `gate`, for the ride in
 * progress. This is the SAME quantity the colours and ranks elsewhere in the
 * app compare (colourModel.ts lapValues/sectorValues both read `movingS`);
 * D-042 ruled raw wall-clock the eventual scoring default but B-59 is still
 * OPEN, so nothing on screen compares wall-clock today and this chip must not
 * be the first thing that does.
 *
 * Null -- and the chip then renders nothing -- unless EVERY sector from 1 to
 * `gate` is scored with a real moving time. An estimated fire never ranks
 * (D-028); a skipped/off-route sector has no time at all; and a sector the
 * offline pipeline could not give a moving time to would silently turn the
 * running total into a different quantity from the ghosts moving-time sums.
 * An interrupted sector DOES count: it carries a real moving time and ranks,
 * exactly as it does for the lap.
 */
export function liveCumulativeMovingS(sectors: LiveSector[], gate: number): number | null {
  if (gate < 1 || gate > sectors.length) return null;
  let total = 0;
  for (let k = 0; k < gate; k++) {
    const sec = sectors[k];
    if (sec.kind !== 'done') return null;
    if (sec.estimated || sec.movingS === null) return null;
    total += sec.movingS;
  }
  return total;
}

/** The same quantity for a stored or seeded ride: the sum of its SectorResult
 * moving times for sectors 1..gate. Null if any of those sectors is missing or
 * carries no moving time (store/types.ts: movingS is null unless the sector is
 * clean or interrupted), so a ghost with a hole in it drops out of the field
 * rather than ranking on a short sum. */
export function ghostCumulativeMovingS(r: RideResult, gate: number): number | null {
  let total = 0;
  for (let k = 1; k <= gate; k++) {
    const sec = r.sectors.find((x) => x.index === k);
    if (sec === undefined || sec.movingS === null) return null;
    total += sec.movingS;
  }
  return total;
}

/**
 * WP-live-ghost-position P1 -- the LIVE position chip during the ride: where
 * the rider stands right now among the timing-tower population, at the last
 * gate actually crossed. "P4 of 10".
 *
 * The population is NOT reinvented here: ghostsFor is the ranking window
 * already ruled in D-045 ruling 2 (the WINDOW_PREV = 9 most recent previous
 * ranked rides on this route), so rider + window is a pool of at most
 * WINDOW_N = 10 and the chip can never say "of 11".
 *
 * D-006/D-027 (glanceable race screen): this value changes ONLY when the
 * engine rebuilds its sectors, which happens only on a gate fire
 * (engine.ts recompute()) -- it never ticks between gates.
 *
 * Null -- render nothing, never a fake rank -- when no route is locked, in
 * free mode (D-025: a free ride has no comparable history by construction),
 * before the first gate, when this ride own cumulative time is not a clean
 * moving time, or when fewer than MIN_HISTORY ghosts have a comparable
 * cumulative time at that gate (D-008 noise floor, the same one the colours
 * use).
 */
export function getLivePositionAtGate(st: LiveEngineState): string | null {
  if (st.mode === 'free') return null;
  if (st.track === null) return null;
  const gate = st.lastDone;
  if (gate === null || gate < 1) return null;
  const mine = liveCumulativeMovingS(st.sectors, gate);
  if (mine === null) return null;
  const field: number[] = [];
  for (const g of ghostsFor(st.track)) {
    const v = ghostCumulativeMovingS(g, gate);
    if (v !== null) field.push(v);
  }
  if (field.length < MIN_HISTORY) return null;
  const { pos, of } = positionAmong(mine, field);
  return `P${pos} of ${of}`;
}
```

---

### Part B — `app/src/ui/liveView.tsx` (4 edits)

**B1 — the view-model field.** Anchor (lines 104–105):

```tsx
  /** tower position at the handover ('P3'); null = render nothing (B-28) */
  posChip: string | null;
```

Replace with:

```tsx
  /** tower position at the handover ('P3'); null = render nothing (B-28) */
  posChip: string | null;
  /** WP-live-ghost-position P1: the LIVE position chip shown DURING the ride,
   * recomputed only at gate crossings. `undefined` = the feature is off (the
   * settings toggle, or the lap has landed and the handover chip above owns
   * the position) and NO row is rendered at all; `null` = on but not yet
   * earned (no gate crossed, too little history) -- the row keeps its
   * reserved height so the chip arriving at gate 1 never shifts the strip. */
  livePosChip?: string | null;
```

The field is **optional (`?:`) on purpose** — three other places build a `LiveViewModel` object
literal (`DemoScreen.tsx`, `preview/data.ts`, `preview/PreviewScreen.tsx`) and must keep
compiling untouched.

**B2 — the builder's signature.** Anchor (lines 151–153):

```tsx
  posChip: string | null = null, // real callers pass getLiveTowerPosition()
  tierOf: TierSource = NEUTRAL_SOURCE,
): LiveViewModel {
```

Replace with:

```tsx
  posChip: string | null = null, // real callers pass getLiveTowerPosition()
  tierOf: TierSource = NEUTRAL_SOURCE,
  // WP-live-ghost-position P1: real callers pass getLivePositionAtGate(st),
  // or undefined when the toggle is off / the lap has landed.
  livePosChip: string | null | undefined = undefined,
): LiveViewModel {
```

**B3 — the builder's return.** Anchor (line 203, one line):

```tsx
  return { clock, contextLabel, flash, flashKey: st.gateFires, lap, posChip, strip };
```

Replace with:

```tsx
  return { clock, contextLabel, flash, flashKey: st.gateFires, lap, posChip, livePosChip, strip };
```

**B4 — render the chip inside the existing pane.** Anchor (lines 285–286, these two consecutive
lines — the close of the big slot and the opening of the strip row):

```tsx
      </View>
      <View style={paneStyles.strip}>
```

Replace with:

```tsx
      </View>
      {/* WP-live-ghost-position P1 (Stage 1, ruled 2026-08-26): the live
          position chip, INSIDE the existing pane -- no new screen region
          (D-006/D-027). Its value changes only when the engine rebuilds its
          sectors, which happens only at a gate crossing, so it never ticks.
          undefined = feature off, render no row at all; null = on but not
          yet earned, keep the reserved height so the chip arriving at gate 1
          does not shift the strip. Ink, never a tier colour -- position is a
          fact (D-013), the same rule the handover PosChip already follows. */}
      {vm.livePosChip === undefined ? null : (
        <View style={paneStyles.livePosRow}>
          {vm.livePosChip === null ? null : <PosChip label={vm.livePosChip} />}
        </View>
      )}
      <View style={paneStyles.strip}>
```

**B5 — the style.** Anchor (line 307, one line, inside `paneStyles`):

```tsx
  strip: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 24 },
```

Replace with:

```tsx
  // WP-live-ghost-position P1: a fixed reserved height, so the chip appearing
  // at the first gate never moves the sector strip mid-ride.
  livePosRow: {
    alignSelf: 'stretch',
    minHeight: 60,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 24 },
```

---

### Part C — `app/src/ui/RecordScreen.tsx` (2 edits, both tiny)

**C1 — the import.** Anchor (line 34, one line):

```tsx
import { getLiveTowerPosition } from '../live/towerSource';
```

Replace with:

```tsx
import { getLivePositionAtGate, getLiveTowerPosition } from '../live/towerSource';
```

**C2 — pass the new argument.** Anchor (lines 743–745, these three consecutive lines):

```tsx
            getLiveTowerPosition(live), // real position once the lap lands
            tierOf,
          )}
```

Replace with:

```tsx
            getLiveTowerPosition(live), // real position once the lap lands
            tierOf,
            // WP-live-ghost-position P1: the live position chip DURING the
            // ride. undefined (no row at all) when the toggle is off, and
            // once the lap has landed -- the handover chip owns the position
            // from that moment on, and two position chips would disagree.
            settings.livePosition && live.lap === null ? getLivePositionAtGate(live) : undefined,
          )}
```

`settings` is already in scope in this component (`const { s: settings } = useSettings();`,
line 110). **Change nothing else in this file.** In particular, the three `<RouteMapView …>`
blocks stay byte-identical (Stage 2 guard).

---

### Part D — settings and tests

**D1 — `app/src/ui/settings.tsx`, the interface.** Anchor (lines 19–22):

```tsx
  tower: boolean;
  liveMap: boolean;
  earcons: boolean;
}
```

Replace with:

```tsx
  tower: boolean;
  liveMap: boolean;
  /** WP-live-ghost-position P1 -- default ON (Nathan, 2026-08-26). */
  livePosition: boolean;
  earcons: boolean;
}
```

**D2 — `app/src/ui/settings.tsx`, the defaults.** Anchor (lines 27–30):

```tsx
  tower: true,
  liveMap: true,
  earcons: true,
};
```

Replace with:

```tsx
  tower: true,
  liveMap: true,
  livePosition: true,
  earcons: true,
};
```

**D3 — `app/src/ui/settings.tsx`, the screen row.** Anchor (line 153, one line — the opening tag
of the Earcons row inside the "ON THE BIKE" card):

```tsx
        <Row label="Earcons" hint="one buzz + tier sound at each gate (D-019)" t={t}>
```

Replace with:

```tsx
        <Row label="Live position" hint="your place among your last 10 rides, updated at each gate" t={t}>
          <Switch on={s.livePosition} onToggle={() => set('livePosition', !s.livePosition)} t={t} />
        </Row>
        <Row label="Earcons" hint="one buzz + tier sound at each gate (D-019)" t={t}>
```

**D4 — `app/tests/live_colour_suite.ts`, the type import.** Anchor (line 13, one line):

```ts
import type { LiveEngineState } from '../src/live/engine.ts';
```

Replace with:

```ts
import type { LiveEngineState, LiveSector } from '../src/live/engine.ts';
```

**D5 — `app/tests/live_colour_suite.ts`, the module import.** Anchor (line 33, one line):

```ts
const { getLiveTowerPosition } = await import('../src/live/towerSource.ts');
```

Replace with:

```ts
const { getLivePositionAtGate, getLiveTowerPosition } = await import('../src/live/towerSource.ts');
```

**D6 — `app/tests/live_colour_suite.ts`, the four new tests.**

⚠️ **The insertion point matters and is not negotiable.** The new tests MUST go immediately
after the `positionAmong` test and BEFORE the `B-44` test that follows it. Later tests in this
file call `rememberRide()`, which pushes extra rides into the very ranking window these tests
measure — inserting lower down changes the field size and the tests will fail. Also note the
file ALREADY defines a helper named `doneSector` further down (line ~230); it is hoisted, so the
new tests use it and **must not declare their own** (a duplicate declaration is a hard
SyntaxError that kills the whole suite).

Anchor (lines 110–114, the complete `positionAmong` test):

```ts
test('cycle008: positionAmong is stable and 1-based', () => {
  assert(positionAmong(5, [10, 20, 30]).pos === 1, 'fastest is P1');
  assert(positionAmong(25, [10, 20, 30]).of === 4, 'the field includes today');
  assert(positionAmong(35, [10, 20, 30]).pos === 4, 'slowest is last, not unranked');
});
```

Leave those five lines exactly as they are and APPEND the following immediately after them (note
the blank line first):

```ts

/* ------------------- WP-live-ghost-position P1: the LIVE position chip ---- */

test('WP-live-ghost-position P1: the live chip ranks a cumulative time at a gate', () => {
  // Morning's ranking window is its 9 previous ranked rides (WINDOW_PREV),
  // every one of them with complete clean sector data, so the field is always
  // exactly 10 -- rider + 9. Their cumulative MOVING times at gate 2 are
  // 382.9 383.9 387.1 392.2 392.3 395.5 403.3 406.5 419.0, so a rider on
  // 181 + 209 = 390.0 s slots in fourth: the WP's own "P4 of 10".
  const g2 = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 2, currentSector: 3,
    sectors: [doneSector(181), doneSector(209), { kind: 'current' }, { kind: 'pending' }],
  }));
  assert(g2 === 'P4 of 10', `expected "P4 of 10", got ${g2}`);

  const pole = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 1, currentSector: 2,
    sectors: [doneSector(150), { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' }],
  }));
  assert(pole === 'P1 of 10', `a 150 s first sector leads the field, got ${pole}`);

  const last = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 1, currentSector: 2,
    sectors: [doneSector(300), { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' }],
  }));
  assert(last === 'P10 of 10', `a 300 s first sector is last, got ${last}`);
});

test('WP-live-ghost-position P1: MOVING time, never raw wall-clock (the time-base trap)', () => {
  // The ghosts' cumulative values are sums of SectorResult.movingS -- time
  // EXCLUDING stopped time. D-042 ruled raw wall-clock the eventual scoring
  // default, but B-59 is still open, so the live chip must sit on the same
  // moving-time base as the colours and ranks beside it.
  const noMoving = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 1, currentSector: 2,
    sectors: [
      { kind: 'done', rawS: 190, stoppedS: 30, movingS: null, interrupted: false, estimated: false },
      { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' },
    ],
  }));
  assert(noMoving === null, `no moving time means no chip, never a raw-vs-moving rank, got ${noMoving}`);

  // 190 s of RAW time with 30 s stopped ranks on its 160 s of MOVING time --
  // which is pole. Reading the raw 190 s instead would place it 7th, so this
  // assertion fails loudly if the chip ever switches to wall-clock.
  const moving = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 1, currentSector: 2,
    sectors: [
      { kind: 'done', rawS: 190, stoppedS: 30, movingS: 160, interrupted: true, estimated: false },
      { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' },
    ],
  }));
  assert(moving === 'P1 of 10', `160 s of moving time leads the field, got ${moving}`);

  const est = getLivePositionAtGate(stateWith({
    phase: 'locked', lap: null, lastDone: 1, currentSector: 2,
    sectors: [
      { kind: 'done', rawS: 190, stoppedS: null, movingS: null, interrupted: false, estimated: true },
      { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' },
    ],
  }));
  assert(est === null, `an estimated sector never ranks (D-028), got ${est}`);
});

test('WP-live-ghost-position P1: the live field is 10 at every gate, never 11 (D-045 ruling 2)', () => {
  for (let g = 1; g <= 4; g++) {
    const sectors: LiveSector[] = [];
    for (let k = 1; k <= 4; k++) sectors.push(k <= g ? doneSector(200) : { kind: 'pending' });
    const chip = getLivePositionAtGate(stateWith({ phase: 'locked', lap: null, lastDone: g, sectors }));
    assert(chip !== null && / of 10$/.test(chip), `gate ${g} must rank in a field of 10, got ${chip}`);
  }
});

test('WP-live-ghost-position P1: no gate, no lock, no history or free mode means no chip', () => {
  const base = {
    phase: 'locked' as const,
    lap: null,
    lastDone: 1,
    currentSector: 2,
    sectors: [doneSector(190), { kind: 'current' }, { kind: 'pending' }, { kind: 'pending' }] as LiveSector[],
  };
  assert(getLivePositionAtGate(stateWith({ ...base, lastDone: null })) === null,
    'before the first gate there is nothing to rank');
  assert(getLivePositionAtGate(stateWith({ ...base, track: null })) === null,
    'no locked route means no chip');
  assert(getLivePositionAtGate(stateWith({ ...base, track: 'NoSuchRoute' })) === null,
    'a route with no history must render nothing, never a "P1 of 1"');
  assert(getLivePositionAtGate(stateWith({ ...base, mode: 'free' })) === null,
    'a free ride has no comparable history by construction (D-025)');
});
```

**Expected suite result after Parts A–D: `268 tests: 265 pass, 0 fail, 3 skip`** (+4 on the
baseline's 264/261/0/3). Measured by the planning pass's dry run.

---

### Part E — the mockup mirror (`demos/mockup.html`, 2 edits)

`process/CONVENTIONS.md` requires the mockup to track the app in the same pass. The mockup's ride
screen DOES model gate crossings and it DOES carry per-sector ghost data (`const GH =
D.towers.Morning`, line 245), so the chip is mirrorable. **Edit `demos/mockup.html` directly.
Do NOT run `07_build_mockup.py` (see Environment).**

**E1 — the markup.** Anchor (lines 406–408, three consecutive lines inside the running-phase
template):

```
    <div class="strip" id="strip"></div>
    <div class="status" id="status"></div>
    <button class="btn slim" id="end" style="margin-top:12px">END</button>
```

Replace with:

```
    <div class="strip" id="strip"></div>
    <div id="livepos" style="text-align:center;font-size:26px;font-weight:800;letter-spacing:1px;min-height:34px;margin-top:10px;font-variant-numeric:tabular-nums"></div>
    <div class="status" id="status"></div>
    <button class="btn slim" id="end" style="margin-top:12px">END</button>
```

**E2 — the computation.** Anchor (line 545, one line, inside `paint()`):

```
  // Rotate on REAL seconds, not ride-clock seconds
```

⚠️ That is a PREFIX of the real line, which continues `— at 25× the ride clock the`. Match the
prefix and insert before it; do not retype the rest of the line. Insert the following block
immediately BEFORE that line, keeping that line intact:

```js
  // WP-live-ghost-position P1: the LIVE position chip. Ranks CUMULATIVE
  // MOVING time at the last gate actually crossed against the same ghost
  // window the colours use (GH), so it changes only at gate crossings and
  // never ticks. Blank in free mode (no comparable history by construction)
  // and before the first gate.
  const lp = document.getElementById('livepos');
  if(lp){
    const cum = (arr,g) => arr.slice(0,g).reduce((a,b)=>a+b,0);
    if(R.freeRide || R.gate < 1){
      lp.textContent = '';
    } else {
      const mine = cum(D.sim.sectors, R.gate);
      const all = GH.map(g=>cum(g.sectors, R.gate)).concat([mine]).sort((a,b)=>a-b);
      lp.textContent = 'P' + (all.indexOf(mine)+1) + ' of ' + all.length;
    }
  }
```

Measured by the dry run: with this block the mockup's simulated Morning ride reads
`P3 of 10`, `P5 of 10`, `P4 of 10`, `P5 of 10` at gates 1–4, and all three inline `<script>`
blocks still pass `node --check`.

---

### Part F — the design-SVG mirror (`design/make_screens.py` + regenerate)

`design/canonical/` is a build output of `design/make_screens.py` (never hand-edited); the
running race screen and the settings screen both appear there, so both need the mirror. The
script is idempotent — running it at HEAD with no source change rewrites all 18 SVGs
byte-identically (verified tonight).

**F1 — the layout budget.** Anchor (lines 1171–1172, these two consecutive lines).
⚠️ The FIRST of these two lines also occurs at line 1257 in a different function — that is why
you must match BOTH lines together. Confirm the two-line anchor occurs exactly once.

```python
    STATUS_GAP, PAUSE_GAP, PAUSE_H, BOTTOM_PAD = 26.0, 10.0, 56.0, 12.0
    fixed_total = GAP1 + CONTEXT_H + CLOCK_H + STRIP_H + STRIP_GAP + STATUS_GAP + PAUSE_GAP + PAUSE_H + BOTTOM_PAD
```

Replace with:

```python
    STATUS_GAP, PAUSE_GAP, PAUSE_H, BOTTOM_PAD = 26.0, 10.0, 56.0, 12.0
    # WP-live-ghost-position P1: the live position chip row (liveView.tsx's
    # livePosRow -- minHeight 60, marginTop 8, between the big slot and the
    # sector strip). Reserved height, so the chip arriving at gate 1 never
    # shifts the strip.
    LIVE_POS_GAP, LIVE_POS_H, LIVE_POS_W = 8.0, 60.0, 168.0
    fixed_total = (GAP1 + CONTEXT_H + CLOCK_H + LIVE_POS_GAP + LIVE_POS_H + STRIP_H + STRIP_GAP
                   + STATUS_GAP + PAUSE_GAP + PAUSE_H + BOTTOM_PAD)
```

**F2 — draw the chip.** Anchor (lines 1192–1194, these three consecutive lines including the
blank line between them):

```python
    y += CLOCK_H

    strip = group(content, "content_pane_strip", {})
```

Replace with:

```python
    y += CLOCK_H

    # WP-live-ghost-position P1 (Stage 1, ruled 2026-08-26): the live position
    # chip. One gate is crossed in this scene (S1 done), so the rider has a
    # real cumulative-moving-time rank at gate 1. Ink on the race card, never
    # a tier colour -- position is a fact (D-013), the same rule the finished
    # screen's handover chip below already follows.
    y += LIVE_POS_GAP
    lpos = group(content, "content_live_pos_chip", {})
    lpos_x = (VB_W - LIVE_POS_W) / 2
    rect(lpos, "content_live_pos_chip_bg", lpos_x, y, LIVE_POS_W, LIVE_POS_H,
         fill=t["raceCard"], stroke=t["raceBorder"], sw=2, rx=10)
    text_el(lpos, "content_live_pos_chip_label", VB_W / 2, y + LIVE_POS_H / 2 + 9,
            "P4 of 10", 26, weight="800", color=t["text"], anchor="middle",
            letter_spacing=1, tabular=True)
    y += LIVE_POS_H

    strip = group(content, "content_pane_strip", {})
```

**F3 — the docstring.** Anchor (lines 1150–1151, two consecutive lines):

```python
    not yet reached. settings.redLight defaults to 'auto', so the manual
    red-light button is not shown (§18)."""
```

Replace with:

```python
    not yet reached. settings.redLight defaults to 'auto', so the manual
    red-light button is not shown (§18). WP-live-ghost-position P1: the live
    position chip sits between the clock and the strip, showing the rider's
    rank on cumulative moving time at the last gate crossed."""
```

**F4 — the settings screen row.** Anchor (line 878, one line):

```python
                    ("Live map", "moving dot on the route while riding", switch(True)),
```

Replace with:

```python
                    ("Live map", "moving dot on the route while riding", switch(True)),
                    ("Live position",
                     "your place among your last 10 rides, updated at each gate",
                     switch(True)),
```

**F5 — regenerate.** Run exactly:

```
cd "$HOME/mnt/Qualifire" && timeout 40 python3 design/make_screens.py
```

Expected: it prints `Wrote 18 SVGs to …` followed by the 18 filenames, and exits 0. Exactly FOUR
of them will differ from HEAD: `record_running_day.svg`, `record_running_night.svg`,
`settings_day.svg`, `settings_night.svg`. If it prints `VALIDATION FAILED`, STOP and report the
error lines verbatim.

---

## Must-not-change list (byte-identical at the end of your pass)

Anything not in the six-file edit set. Explicitly, and non-exhaustively:

**Stage 2 / live-map guard (named, hard):** `app/src/ui/routeMapView.tsx` ·
`app/src/ui/routeMapGeo.ts` · `app/src/ui/routeMapMath.ts` · `app/src/ui/routeMapStyle.ts` ·
every `<RouteMapView …>` JSX block and every prop passed to one · `app/src/ui/DemoScreen.tsx` ·
`app/src/ui/preview/**` · `app/assets/routes/**`.

**Also unchanged:** `app/src/live/engine.ts` · `app/src/live/refs.ts` · `app/src/live/tracks.ts` ·
`app/src/ui/colourModel.ts` · `app/src/ui/chips.tsx` · `app/src/ui/theme.ts` ·
`app/src/ui/themeContext.tsx` · `app/src/ui/ResultScreen.tsx` · `app/src/ui/RidesScreen.tsx` ·
`app/src/ui/RoutesScreen.tsx` · `app/src/ui/tower.tsx` · `app/src/ui/towerModel.ts` ·
`app/src/ui/rideHistoryModel.ts` · `app/src/ui/recordFlow.ts` · `app/src/location/**` ·
`app/src/store/**` · `app/src/storage/**` · `app/core/**` · `app/tests/run.ts` ·
`app/tests/lib.ts` · `app/tests/fixtures/**` · every test suite other than
`live_colour_suite.ts` · `design/canonical/**` except the four SVGs regenerated by F5 ·
`design/edited/**` · `data/analysis/**` · `data/**` · `demos/**` except `mockup.html` ·
`product/**` · `process/**` · `cycles/**` · `STATE.md` · `IDEAS.md` · `NATHAN-STATUS.md` ·
`package.json` · `tsconfig.json` · `app.json` · `app.config.js`.

Do not create any file. Do not delete any file. Do not rename anything.

---

## Verification (MANDATORY — run all seven, report each exact output)

1. **Tests.**
   `cd "$HOME/mnt/Qualifire/app" && timeout 40 node --experimental-strip-types tests/run.ts 2>&1 | tail -3`
   → final line exactly: **`268 tests: 265 pass, 0 fail, 3 skip`**
   (baseline 264/261/0/3; +4 new). Report the exact final line.

2. **The four new tests actually ran and passed.**
   `cd "$HOME/mnt/Qualifire/app" && timeout 40 node --experimental-strip-types tests/run.ts 2>&1 | grep -c "PASS  WP-live-ghost-position"`
   → `4`

3. **Type check.** No `timeout` prefix; `timeout_ms` ≈ 180000.
   `cd "$HOME/mnt/Qualifire/app" && ./node_modules/.bin/tsc --noEmit; echo "tsc exit: $?"`
   → `tsc exit: 0` and no diagnostic lines above it. If it times out, retry ONCE with the same
   command; if it times out twice, report that and stop.

4. **The new function is wired, and nothing else imports it.**
   `cd "$HOME/mnt/Qualifire/app" && grep -c "getLivePositionAtGate" src/live/towerSource.ts src/ui/RecordScreen.tsx tests/live_colour_suite.ts`
   → `src/live/towerSource.ts:1`, `src/ui/RecordScreen.tsx:2`, `tests/live_colour_suite.ts:12`

5. **The toggle exists and defaults ON.**
   `cd "$HOME/mnt/Qualifire/app" && grep -n "livePosition" src/ui/settings.tsx`
   → exactly 3 lines: the interface field (`livePosition: boolean;`), the default
   (`livePosition: true,`), and the `<Switch on={s.livePosition} …>` line inside the new
   `<Row …>` block. (The `<Row label="Live position" …>` line spells it with a space, so it is
   correctly not matched by this grep.)

6. **Stage 2 guard — the live-map code is untouched.**
   `cd "$HOME/mnt/Qualifire" && git --no-optional-locks diff --name-only -- app/src/ui/routeMapView.tsx app/src/ui/routeMapGeo.ts app/src/ui/routeMapMath.ts app/src/ui/routeMapStyle.ts app/src/ui/DemoScreen.tsx app/src/ui/preview app/src/live/engine.ts app/src/ui/colourModel.ts app/src/ui/chips.tsx`
   → **no output at all.** Any output here is a hard failure: STOP and report.

7. **The whole diff.**
   `cd "$HOME/mnt/Qualifire" && git --no-optional-locks diff --stat`
   → exactly these **11 files** and nothing else (this brief file and `_to_delete/` are
   untracked and will not appear):

   ```
   app/src/live/towerSource.ts               |  88 +++++++++-
   app/src/ui/RecordScreen.tsx               |   7 +-
   app/src/ui/liveView.tsx                   |  34 +++-
   app/src/ui/settings.tsx                   |   6 +
   app/tests/live_colour_suite.ts            |  94 +++++++++-
   demos/mockup.html                         |  17 ++
   design/canonical/record_running_day.svg   |  42 +++---
   design/canonical/record_running_night.svg |  42 +++---
   design/canonical/settings_day.svg         |  48 ++++---
   design/canonical/settings_night.svg       |  48 ++++---
   design/make_screens.py                    |  30 +++-
   ```

   Totalling **~370 insertions, ~86 deletions**. Small formatting drift in the counts is fine; a
   twelfth file, a missing file, or a wildly different shape is not — STOP and report.

**The planning pass DRY-RAN this entire edit set tonight against HEAD** — every Part A–F edit
applied verbatim, verifications 1–7 run, then the tree fully restored. Results: the suite came
back exactly `268 tests: 265 pass, 0 fail, 3 skip` with all four new tests passing, tsc exited 0,
`make_screens.py` regenerated cleanly and changed exactly those four SVGs, all three mockup
script blocks passed `node --check`, and the diff touched exactly the eleven files listed. So any
deviation you observe is a REAL discrepancy: report it, do not fix it, do not rationalise it, and
do not re-run with variations beyond the single permitted retry of a timed-out tsc.

---

## Include these findings in your report (informational — no code action)

1. **Time base (the WP's named trap), settled:** ranks and colours today are MOVING-time based
   (`colourModel.ts:110` and `:123`; `towerSource.ts:31-34`; `ResultScreen.tsx:74`). The live
   chip therefore sums `LiveSector.movingS` and compares against sums of `SectorResult.movingS`.
   It does not read raw wall-clock anywhere. When D-042's raw-time implementation eventually
   lands, this chip changes in the same pass as the rest of the ranking surface, from the same
   fields — nothing here needs a separate migration.

2. **No engine change was needed.** The "gate crossing event hook" the WP asked about already
   exists implicitly: `LiveEngine.recompute()` runs only on a gate fire, and it is the only thing
   that rewrites `state.sectors` / `state.lastDone`. Deriving the chip from those two fields
   satisfies the D-006/D-027 "never ticking" constraint structurally, with no timer and no new
   event channel. `engine.ts` is untouched.

3. **Earcon / haptic on position CHANGE was explicitly SKIPPED, not half-built.** The entire
   audio/haptic channel today is one `Vibration.vibrate(70)` per gate fire at
   `app/src/location/index.ts:434-450`, under a stated "one identical buzz per gate fire"
   contract, in a layer explicitly documented as the only buzzer. Tier earcons (expo-audio) are
   still unbuilt. Since a position change always coincides with a gate crossing, any cue would
   either collide with the existing buzz or require a whole new audio subsystem. Flagged for a
   future cycle; nothing was added.

4. **Repo-health finding — `demos/mockup.html` has drifted from its generator.** Running
   `data/analysis/07_build_mockup.py` at HEAD rewrites the mockup with 130 insertions and 536
   deletions — the committed mockup is far AHEAD of `data/analysis/mockup_template.html` (it
   loses the ride-history/result accordions, the record flow, and the launch animation). The
   generator is therefore effectively dead and the "regenerated from the template" line in
   `process/CONVENTIONS.md` is no longer true. This brief edits `demos/mockup.html` directly as a
   result. **The coordinator should schedule a template-vs-mockup reconciliation** — this is a
   standing hazard, not this WP's work.

5. **Pre-existing copy drift left alone (out of scope):** `design/make_screens.py`'s settings
   mirror still labels the SCORING row "Timing tower", while the app renamed it to "Rankings" in
   cycle 024 (`settings.tsx:173`). Not touched here — fixing it would put an unrelated change in
   this diff.

6. **Stage 2 (moving ghost dots on the live map) remains entirely unbuilt and untouched**, per
   its own mandate: it needs a mandatory on-device eyeball in both themes, which this pipeline
   cannot perform. No live-map file was opened or modified.

7. **Layout note for Nathan / the Designer (needs an on-device look, not a code action):** the
   chip is rendered in a reserved 60 px row with an 8 px top margin, between the big clock slot
   and the sector strip, inside the existing `LiveSectorPane` — no new screen region. The map
   above it is `flex: 1`, so it absorbs the ~68 px. The chip uses the existing `PosChip`
   component at its existing 30 px type size. If that reads too large mid-ride, the fix is a
   size prop on `PosChip` — a follow-up, deliberately not invented here.
