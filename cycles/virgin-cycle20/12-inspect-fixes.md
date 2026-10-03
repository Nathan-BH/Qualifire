# 12 — Fixes from the Opus inspections of 08 / 06 / 11 (B1 recovery race, double-finalize wipe, app-active read mid-ride, stale comments, CONVENTIONS text)

**Source:** Opus inspections I2 (briefs 08, 09) and I3 (06, 07, 10, 11, 02), 2026-10-03 — see
`EXECUTION-LOG.md`. Written 2026-10-03 by the Plan tier (Fable) against the CURRENT working tree
(all of briefs 01-11 applied, uncommitted; measured: **833 tests / 830 pass / 0 fail / 3 skip,
`tsc --noEmit` exit 0**). Every edit below was dry-run by the Plan tier on a scratch copy of
`app/` (+ `process/CONVENTIONS.md`) built from that tree: result **838 / 835 / 0 / 3, tsc 0**, and
the two behavioural tests were confirmed to FAIL with their fix reverted. Executor: Sonnet, cold,
this file only. **Status: pending.**

## What this changes on the phone — and what it does not

- **B1 (BLOCKER, brief 08):** an interrupted recording found on relaunch (service died, marker on
  disk) is still finalised silently and filed FREE — but only **after** App's store chain has
  loaded (sports → catalog → reference lines → free rides → ride history). Before: the free mark
  could be dropped (store not yet armed) or overwrite the free-ride cache before its read landed, so
  the activity could later be backfilled and ranked against an official way; and its sport was
  `null` because sports.json was not loaded yet. Nothing visible changes; the "Activity saved · …"
  line on the setup screen appears a little later on a slow launch (after the chain, typically well
  under a second). The live-recovery branch (service survived → resume the UI) is **not** gated.
- **MAJOR (brief 06):** a ride whose lock stayed **soft** to the end (two catalog ways on the same
  line, no FINISH) is promoted to `finalized` by the first `finalize()`; the defensive second
  `finalize()` (RecordScreen `onEnd` → `stopTracking`) no longer wipes its done sectors back to
  pending. Verified locks and never-locked rides: unchanged.
- **MINOR (brief 11):** the `AppState` `'active'` quiet position read is no longer wired while
  the phase is `running`/`ending` — the ride feed owns `lastLat/lastLon/lastFixMs` mid-ride.
  Setup/armed behaviour (foreground read + budget restart) unchanged.
- Comments only: `RecordScreen.tsx` (post-brief-10 predicate), `rideHistoryModel.ts` ×3,
  `resultsPlot.tsx` ×2. Docs: `process/CONVENTIONS.md` § Rider-facing text now names `flashSub`
  and the real hold times (2 s GPS off, 5 s permission).
- **No visible string is added, removed or changed. `app/tests/ui-strings.allow.json` is NOT
  touched** (Verification 6 proves it). JS-only → OTA-able; no native change, no new build.

## Evidence (read 2026-10-03 on the current tree; anchors are by content, never by number)

### B1 — the recovery races App's launch chain
- `app/App.tsx` `useEffect(() => { … initSportStore(fs).then(() => initCatalogStore(fs)).then(() =>
  initUserRefs(fs)).then(() => initFreeRidePersistence(fs)).then(() => initRideHistory(fs, …)).then(()
  => setWindowHydrated(true), () => {}); }, []);` — fire-and-forget, nothing awaits it.
- `app/src/ui/RecordScreen.tsx` relaunch-recovery effect: in the `else` branch (`rec.tracking`
  false) it runs `if (recoveryAutoSaveStarted) return; recoveryAutoSaveStarted = true; try { const
  sum = await stopTracking(); if (sum) { markRideFree(sum.rideId, rec.session.startedAtMs, …,
  effectiveRideSportId(rec.session.sportId, currentSports())); } setLastSummary(sum); } …`. React
  runs a child's mount effects BEFORE the parent's, so this starts before App's chain does.
- `app/src/store/freeRides.ts`: `enqueueWrite` captures `const fs = armedFs;` and `if (fs ===
  null) return;` — a mark before `initFreeRidePersistence` set `armedFs` is kept in memory but never
  written (lost at the next launch → backfilled by `lastRide.ts`'s `initRideHistory`, whose
  `skipBackfill` reads `freeRideResults()`). A mark after arming but before the cache `readText`
  resolved writes `encodeCache(rides)` with only the new record — earlier marks on disk are
  overwritten (the later merge only fixes memory).
- `app/src/store/sports.ts` `effectiveRideSportId(sportId, sports)` → `null` while the sport list
  is empty (before `initSportStore`).

### MAJOR — `finalize()`'s pending-reset fires for `'finalized'`
- `app/src/live/engine.ts` `finalize()`: `if (this.lockKind === 'verified') return;` … `if
  (finished.length === 0) { if (this.lockKind === 'soft') { this.lockKind = 'finalized'; … } else {
  this.sectors = pendingSectors(this.sectors.length); } this.emit(); return; }`. Second call on a
  soft-promoted ride: `lockKind === 'finalized'` → the bare `else` → sectors wiped. Callers:
  `RecordScreen.tsx` `onEnd` (`liveEngine.finalize();` "defensively") then
  `location/index.ts` `stopTracking` (`liveEngine.finalize();`). Existing test `live N9 L2` calls
  `finalize()` twice but only checks events/lockKind, never sectors — which is why it passed.

### MINOR — app-active read mid-ride
- `RecordScreen.tsx`: `useEffect(() => { const sub = AppState.addEventListener('change', (next) =>
  { if (next !== 'active') return; void refreshPositionIfPermitted(); if
  (restartsBudget('app-active')) setPollEpoch((e) => e + 1); }); return () => sub.remove(); }, []);`
  — no phase guard; `refreshPositionIfPermitted` (`location/index.ts`) sets `lastLat/lastLon/
  lastFixMs` on success. The poll effect right below it already has `if (phase !== 'setup' && phase
  !== 'armed') return;`. `const [phase, setPhase] = useState<RecordPhase>('setup');` is declared
  above both effects.

### Stale text
- `RecordScreen.tsx` sectorColours `useMemo` comment: "the same clean-only predicate the stored ride
  will carry as quality 'clean'" — brief 10 made `sectorValues` delegate to the store's
  `sectorHistory` (clean AND interrupted).
- `rideHistoryModel.ts` doc comment: `"no way — recorded only"` (RidesScreen renders no title for
  `wayName: null` since 08), `"<way name> — ref"` ×2 (code is `` `${labelFor(refWay.id)} · ref` ``).
- `resultsPlot.tsx`: header "Rankings-off (SETTINGS s.tower) … the switch only drops …" and the
  JSX comment "when rankings are off" — `s.tower` was retired by 08 (`settings.tsx`: "Rankings row
  retired, always on"); `selectedPosLabel` is `''` only for a point without a position now.
- `process/CONVENTIONS.md` § Rider-facing text: "`flashGpsOff` … for ~2 s" — code is `flashSub(msg,
  holdMs = GPS_FLASH_HOLD_MS)` with `GPS_FLASH_HOLD_MS = 2000`, `PERM_FLASH_HOLD_MS = 5000`
  (`PERM_DENIED_MSG`, `PERM_FOREGROUND_ONLY_MSG`), `NO_SPORT_FLASH_HOLD_MS = 1000`. The same
  sentence in `09-clutter-guardrails.md` line ~446 is a BRIEF (not edited — executor rules);
  `process/CLUTTER-AUDIT-HOWTO.md` and `CLAUDE.md` point 9 do not name the function or a time → no
  edit there.

## Executor rules (binding)

- Read `EXECUTOR-RULES.md` and `/CLAUDE.md` first. **Stop-on-ambiguity**: every anchor is quoted
  text; the apply script (§1) exits with `STOP: anchor found N times` if any anchor is not found
  exactly once — report that output verbatim and stop. Never anchor on a line number.
- `GIT_OPTIONAL_LOCKS=0` on every git call. No commit, no `npm`/`npx`/`eas`. Never delete —
  `safe_to_delete/` is the bin. No recursive greps over the repo or `node_modules`.
- **All files touched here are LF** (checked: zero `\r` in every one). The script preserves
  endings (`newline=''`); the three `cat >>`/`cat >` steps write LF.
- **Files touched — exactly these, nothing else:**
  - NEW `app/src/store/bootstrap.ts`
  - NEW `app/tests/bootstrap_suite.ts`
  - EDIT `app/App.tsx` (one import, one `.then` in the launch chain)
  - EDIT `app/src/ui/RecordScreen.tsx` (one import; one `await` + comment in the recovery; the
    AppState effect; one comment)
  - EDIT `app/src/live/engine.ts` (one `else` → `else if`, comment)
  - EDIT `app/src/ui/rideHistoryModel.ts` (3 comment lines), `app/src/ui/resultsPlot.tsx` (2 comments)
  - EDIT `app/tests/live_suite.ts` (append one test), `app/tests/positionretry_suite.ts` (append one
    test), `app/tests/run.ts` (one import line)
  - EDIT `process/CONVENTIONS.md` (one bullet)
  - NEW (scratch, gitignored) `safe_to_delete/virgin-cycle20-12/apply12.py`
- Do **not** touch: `app/src/store/freeRides.ts`, `location/index.ts`, `lastRide.ts`,
  `settings.tsx`, `app/tests/ui-strings.allow.json`, `app/scripts/*`, any other brief, `STATE.md`,
  `OPEN-ITEMS.md`, `IDEAS.md`, `EXECUTION-LOG.md`.

## Decisions (made; the executor does not revisit them)

1. **B1 fix = a module-level "stores ready" gate, awaited by the recovery.** New pure module
   `app/src/store/bootstrap.ts` (`whenStoresReady()`, `markStoresReady()`, `storesReadySettled()`,
   `resetStoresReadyForTests()`). App's chain gets `.then(markStoresReady, markStoresReady)` right
   after `initRideHistory` (both paths — the chain never throws, but the gate must never stay shut).
   The recovery's `else` branch does `await whenStoresReady();` immediately before `const sum = await
   stopTracking();`, inside the `try` and after the `recoveryAutoSaveStarted` latch. Why this and
   not hardening `freeRides.ts`: the race also covers `effectiveRideSportId` (sports not loaded) and
   the backfill's `index.json` read (`initRideHistory`'s IIFE issues it before the chain resolves, so
   it sees the ride before `endRide` wrote `status: 'ended'` → not a backfill candidate this launch;
   the free mark then covers every later launch). One await fixes all three; `freeRides.ts` stays
   byte-identical. The marker stays on disk until the gate opens, so a kill mid-wait is retried next
   launch (same as any other failure in that branch). `RecordScreen` → `store/bootstrap` is the
   same direction as its other `../store/*` imports; App → `./src/store/bootstrap` likewise. No
   import from `App.tsx` into `ui/` (would be circular).
2. **MAJOR fix = `else if (this.lockKind === 'none')`.** A bare `else` reached `'finalized'`. With
   the guard the second call on a soft-promoted ride takes neither branch, emits, returns —
   idempotent for sectors as well as events (`live N9 L2` keeps pinning the event side).
3. **MINOR fix = key the AppState effect on `phase` and bail out in `running`/`ending`** instead of
   a `phaseRef`: no listener exists mid-ride at all, the cleanup is the existing `sub.remove()`, and
   nothing else changes (`refreshPositionIfPermitted()` call-site count stays 3 — positionretry
   test 7 still passes). A ref would keep a live listener that does nothing; this is smaller.
4. **Tests (+5 → 838 / 835 / 0 / 3):** `bootstrap_suite.ts` — 1 pure gate test + 2 source pins
   (App chain order on both paths; recovery order `await gate → stopTracking → markRideFree`, and
   the `rec.tracking` branch stays ungated); `live_suite.ts` — the soft-lock double-finalize
   regression (fails on the current tree: sectors `pending,pending,pending,pending`);
   `positionretry_suite.ts` — a source pin that the AppState effect bails out before subscribing and
   is keyed on `[phase]` (fails on the current tree). A pure test of the recovery itself is not
   feasible (React + expo in `RecordScreen`), hence the pins — the same style brief 11 used.
5. **Allowlist: no entries.** Nothing rider-visible changes (comments, a guard, an `await`, docs).
   Verification 6 diffs the allowlist and requires an empty diff. If `ui_strings` FAILS after your
   edits, that is unexpected → STOP and report the FAIL line verbatim.

## Files to touch

### 1. The apply script (exact-anchor edits for §2-§7; run ONCE)

Create `safe_to_delete/virgin-cycle20-12/apply12.py` (repo root; `mkdir -p` the folder) with
EXACTLY the content below, then run it **from `app/`**:
`cd $HOME/mnt/Qualifire/app && python3 ../safe_to_delete/virgin-cycle20-12/apply12.py`.
Expected output: seven `ok  …` lines ending with `ALL ANCHORS APPLIED`. Any `STOP: …` → report
verbatim and stop (the script writes nothing to a file whose anchors did not all match, but
earlier files in the list may already be written — say which `ok` lines printed).

```python
#!/usr/bin/env python3
"""virgin-cycle20 brief 12 — exact-anchor edits. Run from the app/ dir:
   python3 apply12.py           (STOPS with a message if any anchor is not found exactly once)
Every file here is LF; the script reads/writes bytes-decoded UTF-8 with newline='' so endings are preserved."""
import sys, io

def edit(path, pairs):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        s = f.read()
    for old, new in pairs:
        n = s.count(old)
        if n != 1:
            sys.exit(f"STOP: anchor found {n} times (want 1) in {path}:\n---\n{old}\n---")
        s = s.replace(old, new)
    with io.open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(s)
    print(f"ok  {path} ({len(pairs)} edit{'s' if len(pairs)!=1 else ''})")

# ---------------------------------------------------------------- §2 App.tsx
edit('App.tsx', [
(
"import { freeRideNear, freeRideResults, initFreeRidePersistence } from './src/store/freeRides';\n",
"import { freeRideNear, freeRideResults, initFreeRidePersistence } from './src/store/freeRides';\n"
"import { markStoresReady } from './src/store/bootstrap';\n",
),
(
"      .then(() => initRideHistory(fs, (_rideId, startMs) => freeRideNear(freeRideResults(), startMs) !== null))\n"
"      .then(\n"
"        () => setWindowHydrated(true),\n"
"        () => {},\n"
"      );\n",
"      .then(() => initRideHistory(fs, (_rideId, startMs) => freeRideNear(freeRideResults(), startMs) !== null))\n"
"      // virgin-cycle20 brief 12: open the \"stores ready\" gate (store/bootstrap.ts)\n"
"      // on BOTH paths — RecordScreen's relaunch recovery awaits it before it\n"
"      // finalises an interrupted recording and files it free (it used to race\n"
"      // this chain and lose the free mark; Opus inspection of brief 08, B1).\n"
"      .then(markStoresReady, markStoresReady)\n"
"      .then(\n"
"        () => setWindowHydrated(true),\n"
"        () => {},\n"
"      );\n",
),
])

# ---------------------------------------------------------------- §3 RecordScreen.tsx
edit('src/ui/RecordScreen.tsx', [
# (a) import
(
"import { markRideFree } from '../store/freeRides';\n",
"import { markRideFree } from '../store/freeRides';\n"
"import { whenStoresReady } from '../store/bootstrap';\n",
),
# (b) recovery: await the store chain before stopTracking
(
"        if (recoveryAutoSaveStarted) return;\n"
"        recoveryAutoSaveStarted = true;\n"
"        try {\n"
"          const sum = await stopTracking();\n",
"        if (recoveryAutoSaveStarted) return;\n"
"        recoveryAutoSaveStarted = true;\n"
"        try {\n"
"          // virgin-cycle20 brief 12 (Opus inspection of 08, B1): wait for App.tsx's\n"
"          // store chain (sports -> catalog -> refs -> free rides -> ride history)\n"
"          // before finalising. markRideFree() before initFreeRidePersistence()\n"
"          // armed the store was dropped (`fs === null`) or overwrote the cache\n"
"          // before its read landed, so the interrupted recording could later be\n"
"          // backfilled and ranked against an official way; effectiveRideSportId()\n"
"          // was null before sports.json loaded. The marker stays on disk until\n"
"          // this resolves, so a kill mid-wait just retries next launch.\n"
"          await whenStoresReady();\n"
"          const sum = await stopTracking();\n",
),
# (c) AppState 'active' quiet read: not mid-ride
(
"  useEffect(() => {\n"
"    const sub = AppState.addEventListener('change', (next) => {\n"
"      if (next !== 'active') return;\n"
"      void refreshPositionIfPermitted();\n"
"      if (restartsBudget('app-active')) setPollEpoch((e) => e + 1);\n"
"    });\n"
"    return () => sub.remove();\n"
"  }, []);\n",
"  useEffect(() => {\n"
"    // virgin-cycle20 brief 12 (Opus inspection of 11): no listener at all while\n"
"    // running/ending — the ride feed owns lastLat/lastLon/lastFixMs and a\n"
"    // foreground quiet read would overwrite them mid-ride (the poll below\n"
"    // already stops outside setup/armed; this closes the one remaining path).\n"
"    if (phase === 'running' || phase === 'ending') return;\n"
"    const sub = AppState.addEventListener('change', (next) => {\n"
"      if (next !== 'active') return;\n"
"      void refreshPositionIfPermitted();\n"
"      if (restartsBudget('app-active')) setPollEpoch((e) => e + 1);\n"
"    });\n"
"    return () => sub.remove();\n"
"  }, [phase]);\n",
),
# (d) stale comment after brief 10
(
"  // uses (sectorValues on the LOCKED track, [] before the lock — D-025), the\n"
"  // same clean-only predicate the stored ride will carry as quality 'clean',\n"
"  // painted through tierLineColour (the map-line source of truth, never\n",
"  // uses (sectorValues on the LOCKED track, [] before the lock — D-025), the\n"
"  // store's own sectorHistory predicate (clean AND interrupted sectors on the\n"
"  // scored clock, virgin-cycle20 brief 10 — no longer clean-only), painted\n"
"  // through tierLineColour (the map-line source of truth, never\n",
),
])

# ---------------------------------------------------------------- §4 engine.ts
edit('src/live/engine.ts', [
(
"        this.noteLockChange('soft', this.locked!, atT, 'rideEndPromotion');\n"
"      } else {\n"
"        // virgin-cycle20 06: never locked → the pre-lock display presumption is\n"
"        // withdrawn with the ride (nothing provisional reaches rememberRide/Result).\n"
"        this.sectors = pendingSectors(this.sectors.length);\n"
"      }\n",
"        this.noteLockChange('soft', this.locked!, atT, 'rideEndPromotion');\n"
"      } else if (this.lockKind === 'none') {\n"
"        // virgin-cycle20 06: never locked → the pre-lock display presumption is\n"
"        // withdrawn with the ride (nothing provisional reaches rememberRide/Result).\n"
"        // brief 12: 'none' ONLY — a bare `else` also ran for 'finalized', so the\n"
"        // defensive second finalize() (RecordScreen onEnd, then stopTracking) wiped\n"
"        // a soft-promoted ride's done sectors back to pending.\n"
"        this.sectors = pendingSectors(this.sectors.length);\n"
"      }\n",
),
])

# ---------------------------------------------------------------- §5 stale comments
edit('src/ui/rideHistoryModel.ts', [
(
" * two overrides below before landing on `wayName: null` (rendered by the\n"
" * caller as \"no way — recorded only\"):\n",
" * two overrides below before landing on `wayName: null` (the caller renders\n"
" * no title at all — virgin-cycle20 08 removed the \"no way\" text):\n",
),
(
" *     — wins outright: shown as \"<way name> — ref\" via the SAME `labelFor`\n",
" *     — wins outright: shown as \"<way name> · ref\" via the SAME `labelFor`\n",
),
(
" * founded a way is still \"<way name> — ref\" (a named free ride became a\n",
" * founded a way is still \"<way name> · ref\" (a named free ride became a\n",
),
])

edit('src/ui/resultsPlot.tsx', [
(
" * Rankings-off (SETTINGS s.tower) leaves the plot itself untouched — tones\n"
" * are pure time comparisons, not a rank — the switch only drops the\n"
" * position segment from the selection caption below (the screen passes an\n"
" * empty `selectedPosLabel` in that case). Tones are still computed by the\n",
" * The Rankings switch (SETTINGS s.tower) was retired by virgin-cycle20 08 —\n"
" * rankings are always on; the screen still passes an empty `selectedPosLabel`\n"
" * for a point with no position, and the caption below drops that segment\n"
" * (tones are pure time comparisons, not a rank). Tones are still computed by the\n",
),
(
"      {/* selection caption — WP-2 §3.7: drops the position segment when\n"
"          rankings are off (the screen passes '' for selectedPosLabel), but\n"
"          the dots above are unaffected by the switch. */}\n",
"      {/* selection caption — WP-2 §3.7: drops the position segment when the\n"
"          screen passes '' for selectedPosLabel (no position for this point;\n"
"          the Rankings switch itself is gone, virgin-cycle20 08). */}\n",
),
])

# ---------------------------------------------------------------- §6 process/CONVENTIONS.md (repo root)
edit('../process/CONVENTIONS.md', [
(
"- **Warnings use the yellow button's sub-label flash, never a banner.** The pattern is\n"
"  `flashGpsOff` in `RecordScreen.tsx`: the message replaces the button's caption for ~2 s, fades,\n"
"  and the caption returns. No `warnBox`-style boxes, no top-of-screen notices.\n",
"- **Warnings use the yellow button's sub-label flash, never a banner.** The pattern is\n"
"  `flashSub(msg, holdMs)` in `RecordScreen.tsx` (virgin-cycle20 08 generalised `flashGpsOff`): the\n"
"  message replaces the button's caption, holds 2 s for GPS off (`GPS_FLASH_HOLD_MS`) or 5 s for a\n"
"  permission problem (`PERM_FLASH_HOLD_MS`), fades, and the caption returns. No `warnBox`-style\n"
"  boxes, no top-of-screen notices.\n",
),
])

# ---------------------------------------------------------------- §7 tests/run.ts
edit('tests/run.ts', [
(
"import './positionretry_suite.ts';\n",
"import './positionretry_suite.ts';\n"
"import './bootstrap_suite.ts';\n",
),
])
print("ALL ANCHORS APPLIED")
```

For the record, what the script does (the executor does NOT re-type these; the script is the edit):

- **§2 `app/App.tsx`**: after `import { freeRideNear, freeRideResults, initFreeRidePersistence }
  from './src/store/freeRides';` add `import { markStoresReady } from './src/store/bootstrap';`;
  in the launch chain, between `.then(() => initRideHistory(fs, …))` and `.then(() =>
  setWindowHydrated(true), () => {})` insert a 4-line comment + `.then(markStoresReady,
  markStoresReady)`.
- **§3 `app/src/ui/RecordScreen.tsx`**: (a) after `import { markRideFree } from
  '../store/freeRides';` add `import { whenStoresReady } from '../store/bootstrap';`; (b) in the
  recovery `else` branch, after `recoveryAutoSaveStarted = true;` / `try {` and before `const sum =
  await stopTracking();` insert an 8-line comment + `await whenStoresReady();`; (c) the AppState
  effect gains a 4-line comment + `if (phase === 'running' || phase === 'ending') return;` before
  `const sub = AppState.addEventListener(...)` and its deps become `}, [phase]);`; (d) the
  `sectorColours` comment's "same clean-only predicate …" sentence is reworded (brief 10).
- **§4 `app/src/live/engine.ts`**: in `finalize()`, `} else {` after the `rideEndPromotion` branch
  → `} else if (this.lockKind === 'none') {` + 3 comment lines.
- **§5 `rideHistoryModel.ts`** (3 doc-comment lines) and **`resultsPlot.tsx`** (header paragraph +
  JSX comment) reworded as quoted in the script.
- **§6 `process/CONVENTIONS.md`**: the "Warnings use the yellow button's sub-label flash" bullet
  now reads `flashSub(msg, holdMs)` … 2 s GPS off (`GPS_FLASH_HOLD_MS`) / 5 s permission
  (`PERM_FLASH_HOLD_MS`).
- **§7 `app/tests/run.ts`**: `import './bootstrap_suite.ts';` after `import './positionretry_suite.ts';`.

### 8. NEW `app/src/store/bootstrap.ts` (create with `cat > … <<'EOF'`, exactly this)

```ts
/**
 * virgin-cycle20 brief 12 (Opus inspection of 08, B1): "the stores are
 * loaded" as a promise any screen can await.
 *
 * App.tsx hydrates the persistent stores in ONE ordered chain at launch
 * (sports -> catalog -> reference lines -> free rides -> ride history) and
 * never blocks the UI on it. RecordScreen's relaunch recovery (an
 * interrupted recording found on disk) used to finalise the ride and
 * markRideFree() it straight from its own mount effect, racing that chain:
 * store/freeRides.ts drops a write made before initFreeRidePersistence()
 * armed it (`if (fs === null) return;`) and a write made after arming but
 * before the cache READ landed overwrites the cache with the new mark alone;
 * effectiveRideSportId() returns null before sports.json is loaded. Every
 * late-boot writer awaits whenStoresReady() first instead.
 *
 * PURE (no expo / react-native import) so tests/bootstrap_suite.ts can load
 * it under plain Node. markStoresReady() is idempotent; resetStoresReadyForTests()
 * re-arms the gate (settings.tsx's "Reset to virgin" does NOT reset it — the
 * stores it re-inits are re-read in place, and a recovery is a launch-time event).
 */
let resolveReady: (() => void) | null = null;
let ready: Promise<void> = new Promise<void>((r) => { resolveReady = r; });
let settled = false;

/** Resolves once App.tsx's store chain has finished (success or failure —
 * the chain never throws, D-023, but the gate opens on the rejection path too). */
export function whenStoresReady(): Promise<void> {
  return ready;
}

/** App.tsx calls this at the end of its launch chain. Idempotent. */
export function markStoresReady(): void {
  if (settled) return;
  settled = true;
  resolveReady?.();
}

/** True once markStoresReady() ran — a synchronous read for tests/diagnostics. */
export function storesReadySettled(): boolean {
  return settled;
}

/** Test seam: back to the pending state. */
export function resetStoresReadyForTests(): void {
  settled = false;
  ready = new Promise<void>((r) => { resolveReady = r; });
}
```

### 9. NEW `app/tests/bootstrap_suite.ts` (exactly this)

```ts
/**
 * virgin-cycle20 brief 12 — the "stores ready" gate (src/store/bootstrap.ts)
 * and the two wiring facts a phone would otherwise be needed for, as source
 * pins: App.tsx opens the gate at the END of its launch chain (after the ride
 * history, on both paths) and RecordScreen's relaunch recovery awaits it
 * BEFORE stopTracking()/markRideFree() (Opus inspection of brief 08, B1).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import { markStoresReady, resetStoresReadyForTests, storesReadySettled, whenStoresReady } from '../src/store/bootstrap.ts';

const SRC = (rel: string) => fs.readFileSync(path.resolve(TESTS_DIR, '..', rel), 'utf8');

test('bootstrap: the gate is pending until markStoresReady(), then resolves for every waiter (idempotent, re-armable)', async () => {
  resetStoresReadyForTests();
  assert(!storesReadySettled(), 'fresh gate must be pending');
  let hits = 0;
  const count = () => hits; // read through a closure: `assert(hits === 0)` would narrow `hits` to literal 0 for tsc
  const w1 = whenStoresReady().then(() => { hits += 1; });
  const w2 = whenStoresReady().then(() => { hits += 1; });
  await Promise.resolve(); await Promise.resolve();
  assert(count() === 0, `waiters ran before the gate opened (${count()})`);
  markStoresReady();
  markStoresReady(); // idempotent
  assert(storesReadySettled(), 'settled after markStoresReady()');
  await Promise.all([w1, w2]);
  assert(count() === 2, `both waiters ran once each, got ${count()}`);
  let late = false;
  await whenStoresReady().then(() => { late = true; });
  assert(late, 'a waiter attached AFTER the gate opened resolves at once');
  resetStoresReadyForTests();
  assert(!storesReadySettled(), 're-armed');
  let reran = false;
  void whenStoresReady().then(() => { reran = true; });
  await Promise.resolve(); await Promise.resolve();
  assert(!reran, 'after a reset the gate is pending again');
  markStoresReady();
});

test('bootstrap: App.tsx opens the gate at the end of the launch chain, after initRideHistory, on both paths', () => {
  const src = SRC('App.tsx');
  assert(src.includes("import { markStoresReady } from './src/store/bootstrap';"), 'App imports markStoresReady');
  const hist = src.indexOf('.then(() => initRideHistory(fs,');
  const open = src.indexOf('.then(markStoresReady, markStoresReady)');
  const hydrated = src.indexOf('() => setWindowHydrated(true)');
  assert(hist > 0 && open > 0 && hydrated > 0, `anchors: initRideHistory ${hist}, markStoresReady ${open}, setWindowHydrated ${hydrated}`);
  assert(hist < open && open < hydrated, 'the gate opens AFTER the ride history loads and before the hydration bump');
  assert((src.match(/markStoresReady/g) ?? []).length === 3, 'one import + the two-path .then only');
});

test('bootstrap: RecordScreen\'s relaunch recovery awaits the gate before stopTracking()/markRideFree()', () => {
  const src = SRC('src/ui/RecordScreen.tsx');
  assert(src.includes("import { whenStoresReady } from '../store/bootstrap';"), 'RecordScreen imports whenStoresReady');
  const guard = src.indexOf('recoveryAutoSaveStarted = true;');
  assert(guard > 0, 'recovery guard missing');
  const block = src.slice(guard, src.indexOf('setLastSummary(sum);', guard));
  const waitAt = block.indexOf('await whenStoresReady();');
  const stopAt = block.indexOf('const sum = await stopTracking();');
  const markAt = block.indexOf('markRideFree(\n'); // the call (the comment above it says markRideFree() inline)
  assert(waitAt > 0 && stopAt > 0 && markAt > 0, `anchors in the recovery block: wait ${waitAt}, stop ${stopAt}, mark ${markAt}`);
  assert(waitAt < stopAt && stopAt < markAt, 'order must be: await gate -> stopTracking -> markRideFree');
  assert((src.match(/whenStoresReady\(\)/g) ?? []).length === 1, 'exactly one await site (the recovery)');
  // the live-recovery branch (service survived) is NOT gated — it only resumes the UI
  const tracking = src.indexOf('if (rec.tracking) {');
  assert(tracking > 0 && src.slice(tracking, guard).includes('setSession(rec.session);') && !src.slice(tracking, guard).includes('whenStoresReady'),
    'the service-survived branch resumes the UI at once, ungated');
});
```

### 10. APPEND to `app/tests/live_suite.ts` (after its last line — the file ends with the
`live cycle20-06 E6` test's `});`; append a blank line then this block, via `cat >> … <<'EOF'`)

```ts
test('live cycle20-12: a soft-promoted ride keeps its done sectors through the defensive SECOND finalize()', () => {
  // Opus inspection of brief 06 (I3): finalize()'s pending-reset ran for every
  // lockKind other than 'soft' — including 'finalized', the state the FIRST
  // finalize() leaves a soft lock in — so RecordScreen's onEnd finalize()
  // followed by stopTracking()'s own wiped the ride's sectors to pending.
  // Same two-ways-one-line layout as N9 L2: pick L, ride 1200 m straight —
  // S and L tie on the shared corridor, so the lock stays soft (never verified).
  const engine = new LiveEngine([SYN_S, SYN_L]);
  engine.start({ pickId: 'SyntheticL' });
  let t = 1755167000;
  for (let s = 0; s <= 1200; s += 5) {
    const [lat, lon] = xyToLatLon(s, 0, 0, 0);
    engine.feed(lat, lon, t * 1000);
    t += 1;
  }
  const mid = engine.getState();
  assert(mid.track === 'SyntheticL' && mid.lockKind === 'soft', `pre-finalize: track ${mid.track}, lockKind ${mid.lockKind} — want soft`);
  assert(mid.sectors[0].kind === 'done' && mid.sectors[1].kind === 'current',
    `pre-finalize sectors ${mid.sectors.map((x) => x.kind)} — want S1 done (gates 100/800 crossed), S2 current`);
  engine.finalize();
  const once = engine.getState();
  assert(once.lockKind === 'finalized' && once.track === 'SyntheticL', `first finalize: lockKind ${once.lockKind}, track ${once.track}`);
  assert(once.sectors[0].kind === 'done', `first finalize sectors ${once.sectors.map((x) => x.kind)} — S1 must stay done`);
  const before = JSON.stringify(once.sectors);
  engine.finalize(); // the defensive second call (stopTracking after onEnd)
  const twice = engine.getState();
  assert(twice.sectors[0].kind === 'done', `second finalize sectors ${twice.sectors.map((x) => x.kind)} — S1 wiped to ${twice.sectors[0].kind}`);
  assert(JSON.stringify(twice.sectors) === before, `second finalize changed sectors: ${before} -> ${JSON.stringify(twice.sectors)}`);
  assert(twice.lockKind === 'finalized' && twice.track === 'SyntheticL' && twice.currentSector === once.currentSector,
    `second finalize: lockKind ${twice.lockKind}, track ${twice.track}, currentSector ${twice.currentSector} (was ${once.currentSector})`);
});
```

### 11. APPEND to `app/tests/positionretry_suite.ts` (after its last line — the file ends with
the test asserting `expected exactly 3 quiet-read call sites`; append a blank line then this)

```ts
test('positionretry: the app-active quiet read is not wired while running/ending (brief 12 — the ride feed owns the position)', () => {
  const src = SRC('ui/RecordScreen.tsx');
  const start = src.indexOf("AppState.addEventListener('change'");
  assert(start > 0, 'foreground listener missing');
  const effectStart = src.lastIndexOf('useEffect(() => {', start);
  const effectEnd = src.indexOf('return () => sub.remove();', start);
  assert(effectStart > 0 && effectEnd > start, 'could not bracket the AppState effect');
  const body = src.slice(effectStart, effectEnd);
  assert(body.includes("if (phase === 'running' || phase === 'ending') return;"), 'the effect must bail out in running/ending BEFORE subscribing');
  assert(body.indexOf("if (phase === 'running'") < body.indexOf('AppState.addEventListener'), 'the phase guard precedes the subscription');
  const deps = src.slice(effectEnd, src.indexOf(';', src.indexOf('}, [', effectEnd)) + 1);
  assert(deps.endsWith('}, [phase]);'), `the AppState effect is keyed on phase, got: ${deps.slice(-40)}`);
});
```

## Verification plan (in this order; report every line asked for)

1. **Baseline first.** `GIT_OPTIONAL_LOCKS=0 git status --short` (save it) and `cd app && node
   --experimental-strip-types tests/run.ts` → expect the summary `833 tests: 830 pass, 0 fail, 3 skip`;
   `./node_modules/.bin/tsc --noEmit` → exit 0. Anything else → STOP (the tree is not the one this
   brief was written against).
2. **Failed-before artifacts (do these BEFORE §1):**
   a. Create §9 `bootstrap_suite.ts` only (NOT §8 yet, NOT the run.ts import) and run
      `cd app && node --experimental-strip-types -e "import('./tests/bootstrap_suite.ts').then(()=>console.log('LOADED'),(e)=>console.log('ERR', e.code))"`
      → expect `ERR ERR_MODULE_NOT_FOUND` (the `MODULE_TYPELESS_PACKAGE_JSON` warning is noise).
      Report that line.
   b. Append §10 and §11 to the two suites, run the suite → exactly **2 FAIL**:
      `FAIL  live cycle20-12: … — second finalize sectors pending,pending,pending,pending — S1 wiped to pending`
      and `FAIL  positionretry: the app-active quiet read is not wired … — the effect must bail out in running/ending BEFORE subscribing`
      and the summary `835 tests: 830 pass, 2 fail, 3 skip` (bootstrap_suite is not loaded yet at
      this point, so nothing else fails). Report both FAIL lines and the summary.
3. Create §8 `bootstrap.ts`, then run the §1 script (seven `ok` lines + `ALL ANCHORS APPLIED`).
4. `cd app && node --experimental-strip-types tests/run.ts` → **`838 tests: 835 pass, 0 fail, 3 skip`**.
   Report the summary line and the five new `PASS` lines (`bootstrap:` ×3, `live cycle20-12:`,
   `positionretry: the app-active …`).
5. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0 (the Plan tier's dry run needed the
   `count()` closure in test 1 for this; it is already in §9).
6. **Allowlist untouched:** the file is untracked (`??`, from brief 09), so git cannot diff it —
   run `stat -c %Y app/tests/ui-strings.allow.json` in step 1 and again here: identical mtime,
   and the `ui_strings` tests are among the 835 PASS.
7. Greps (targeted, `timeout 40`):
   - `grep -n "markStoresReady\|whenStoresReady" app/App.tsx app/src/ui/RecordScreen.tsx` → App:
     1 import + `.then(markStoresReady, markStoresReady)`; RecordScreen: 1 import + 1 `await
     whenStoresReady();`.
   - `grep -n "else if (this.lockKind === 'none')" app/src/live/engine.ts` → exactly 1 hit;
     `grep -c "^      } else {$" app/src/live/engine.ts` → one fewer than before the script
     (report both numbers; the Plan tier does not pin the absolute count).
   - `grep -n "if (phase === 'running' || phase === 'ending') return;\|}, \[phase\]);" app/src/ui/RecordScreen.tsx`
     → the guard and the deps, adjacent to `AppState.addEventListener`.
   - `grep -n "clean-only" app/src/ui/RecordScreen.tsx` → only the new "no longer clean-only" mention.
   - `grep -n "— ref\|recorded only" app/src/ui/rideHistoryModel.ts` → nothing.
     `grep -n "s.tower\|rankings are off" app/src/ui/resultsPlot.tsx` → only the "was retired" header line.
   - `grep -n "flashGpsOff\|flashSub" process/CONVENTIONS.md` → the one rewritten bullet (both words on it).
   - `grep -c $'\r' app/App.tsx app/src/ui/RecordScreen.tsx app/src/live/engine.ts app/src/ui/rideHistoryModel.ts app/src/ui/resultsPlot.tsx app/tests/live_suite.ts app/tests/positionretry_suite.ts app/tests/run.ts app/tests/bootstrap_suite.ts app/src/store/bootstrap.ts process/CONVENTIONS.md` → every count 0 (LF preserved).
8. `GIT_OPTIONAL_LOCKS=0 git status --short` and `git diff --stat` — compared with step 1 the ONLY
   differences are: `?? app/src/store/bootstrap.ts`, `?? app/tests/bootstrap_suite.ts`, and larger
   diffs on the already-`M` files `app/App.tsx`, `app/src/live/engine.ts`,
   `app/src/ui/RecordScreen.tsx`, `app/src/ui/rideHistoryModel.ts`, `app/src/ui/resultsPlot.tsx`,
   `app/tests/live_suite.ts`, `app/tests/run.ts`, `process/CONVENTIONS.md`; `app/tests/
   positionretry_suite.ts` stays `??` (grown). `safe_to_delete/` is gitignored. Nothing else moved.
9. Inspect (fresh Opus) reruns 1-8 and additionally: mutate-checks §10 by reverting the `else if`
   guard on a copy; reads the recovery diff for the await's position (inside `try`, after the latch,
   before `stopTracking`); confirms `freeRides.ts`, `location/index.ts`, `lastRide.ts`, `settings.tsx`
   carry no hunk from this brief; confirms `ui_strings` passed and the allowlist mtime is unchanged.

## Out of scope (do NOT do)

- Hardening `freeRides.ts` for other early callers (none exist today: `RideDetailScreen`'s "Save
  as free ride" is user-driven, long after boot).
- Native request stacking in `refreshPositionIfPermitted`, selfrace L1/L3 strengthening, the
  `tsconfig` exclude, the `Dry, Left, Fast` placeholder, the `09-clutter-guardrails.md` copy of the
  CONVENTIONS sentence (a brief — never edited by an executor).

## Report back

- Step 2a's module-not-found line; step 2b's two FAIL lines; step 3's script output; step 4's
  summary line + five PASS lines; step 5's tsc exit; step 6's two mtimes; every grep from step 7;
  step 8's status/diff-stat deltas.
- Files changed (the list in Executor rules, nothing more) and the explicit sentence
  "`app/tests/ui-strings.allow.json`: no entries added".
- Any anchor mismatch / unexpected FAIL verbatim — and stop there.
- Reminder for the coordinator: JS-only, OTA-able; on-device check for Nathan: force-stop the app
  mid-ride, relaunch → "Activity saved · …" appears after the stores load, the ride shows under FREE
  ACTIVITIES with its sport, and never appears on the way's board after a second relaunch.
