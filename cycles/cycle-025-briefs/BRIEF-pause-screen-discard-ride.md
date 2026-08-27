# BRIEF — Pause screen: button-row overflow + copy triage (P1), discard-ride path (P2), yellow-polyline diagnosis (P3)

Execution brief for the Sonnet executor. Self-contained: everything you need is in this
document. Written 2026-08-27 by the Fable planner after reading every cited file at HEAD
(post-commits 035a667/85916fd/e288ec4 — all line numbers below were re-verified fresh).

> **If any ambiguity or surprise arises, STOP and report back — never guess.**

## 0. Environment

- The repo is mounted at `$HOME/mnt/Qualifire` and is reached ONLY through the
  `mcp__remote-devices__device_bash` tool. Every call is a fresh shell (no cwd/env
  carryover) with a ~45 s timeout: always prefix commands with
  `cd "$HOME/mnt/Qualifire" && ...`.
- Run `npx tsc --noEmit` synchronously in ONE call with a generous timeout
  (`timeout_ms` near 45000) — backgrounding does not survive between calls.
- Do NOT run any `git` command. Commits are the coordinator's job.
- Never delete any file. This task deletes no files.
- Files you may EDIT: `app/src/ui/RecordScreen.tsx`, `app/src/ui/recordFlow.ts`
  (two comment lines only). Everything else is read-only for you. Explicitly
  off-limits for edits: `app/src/ui/routeMapView.tsx` (another cycle-025 pass
  just landed there), `app/src/ui/RidesScreen.tsx`, `app/src/storage/*`,
  `app/src/location/*`, `app/src/live/*`, `demos/mockup.html`,
  `design/make_screens.py`, `product/*`, `STATE.md`, `BACKLOG.md`.

## 1. Context (verified at HEAD — background, not tasks)

The PAUSE screen is part of `app/src/ui/RecordScreen.tsx`'s `phase === 'running'`
render (the race column). Pressing PAUSE sets `pauseMenu` true and swaps the PAUSE bar
for a RESUME | END button row (lines 724–756 at HEAD).

- **P1 (layout/copy, RULED):** a 2026-08-25 device screenshot showed "ESUME back to the
  rid" — the RESUME button's content overflowing off the left screen edge. Mechanism
  (verified in code): each button is `styles.stopSlim` (line 1054), which is
  `flexDirection: 'row'` + `justifyContent: 'center'` + `gap: 12`; each holds TWO `Text`
  children side by side (big label + grey microcopy). Neither Text can shrink
  (no `flexShrink`), so on a `flex: 1` half-width button the row's content is wider than
  the button and centred overflow spills off BOTH edges. Nathan RULED 2026-08-26:
  remove "ends & saves" entirely ("Just END is enough"); the WP also drops
  "back to the ride" (RESUME explains itself).
- **P2 (discard, RULED):** there is no way to end a recording WITHOUT saving it. Nathan
  RULED 2026-08-26: a discarded ride is REALLY deleted, not hidden. A full deletion path
  already exists in the RIDES tab (`app/src/ui/RidesScreen.tsx` `onDelete`, lines
  115–145): `Alert.alert` confirm → `deleteRide(rideId)` → `removeStoredResult(rideId)`
  → `dropRecorded(rideId)`. Verified what `deleteRide` (app/src/storage/core.ts lines
  296–307) removes: the raw ride JSONL (`rideFile`), the events sidecar (`eventsFile`),
  the ride-index entry (`removeEntry` + index rewrite), and in-memory tails. It THROWS
  if the ride is still recording (`live.has(rideId)`), so tracking must be stopped
  first. `stopTracking()` (app/src/location/index.ts line 370) stops the OS location
  task, finalizes/stops the live engine, and calls `endRide` — which removes the ride
  from the `live` set and writes an 'ended' index entry that the subsequent
  `deleteRide` then removes. `removeStoredResult` (app/src/store/resultsStore.ts line
  242) deletes the derived result sidecar + its index entry + memory; `dropRecorded`
  (app/src/ui/lastRide.ts line 286) drops the in-session comparison entry. This IS a
  full honest deletion; the pause-screen discard must reuse exactly this path — never a
  second deletion mechanism.
- **P3 (investigation-only):** a yellow polyline on the pause map at ~17 s in, not
  passing through the rider's blue dot, pre-route-lock. The planner's diagnosis is in
  section 4 — your job is to VERIFY each cited fact at HEAD and report, changing no code.
- Design mirrors: checked by the planner — NEITHER `demos/mockup.html` NOR
  `design/make_screens.py` depicts the expanded RESUME/END pause menu (the mockup's
  running screen still has a bare `END` button, mockup.html line 403, predating the
  cycle-020 pause menu; make_screens.py lines 1189–1196 draw only the COLLAPSED "PAUSE /
  recording continues · resume or end" bar, which this pass does not change). So no
  mockup/SVG regeneration is required in this pass; your report must flag the mockup's
  pre-existing pause-menu gap to the coordinator (section 6, report item 5).

## 2. P1 — pause-menu row: copy removal + structural overflow guard

All edits in `app/src/ui/RecordScreen.tsx`.

**2a.** Find the pause-menu block (currently lines 724–756). The `!pauseMenu`
(collapsed PAUSE bar) branch is UNCHANGED — including its
"recording continues · resume or end" sub-line (ruled by the planner: it mirrors
`design/make_screens.py`'s canonical record_running SVG; changing it would drag the
design-mirror obligation into this pass for no ruled reason). Replace ONLY the `:`
branch. Current code of that branch, verbatim:

```tsx
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
            <Pressable
              style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
              disabled={busy}
              onPress={() => { noteButtonPress('resume'); setPauseMenu(false); }}
            >
              <Text style={styles.stopSlimText}>RESUME</Text>
              <Text style={styles.stopSlimSub}>back to the ride</Text>
            </Pressable>
            <Pressable
              style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
              disabled={busy}
              onPress={onEnd}
            >
              <Text style={styles.stopSlimText}>END</Text>
              <Text style={styles.stopSlimSub}>ends & saves</Text>
            </Pressable>
          </View>
```

Replace with (a fragment: the row, then the quieter discard bar beneath it — the
parent `raceColumn` has `gap: 8`, which provides the spacing):

```tsx
          <>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Pressable
                style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
                disabled={busy}
                onPress={() => { noteButtonPress('resume'); setPauseMenu(false); }}
              >
                <Text style={styles.stopSlimText} numberOfLines={1}>RESUME</Text>
              </Pressable>
              <Pressable
                style={[styles.stopSlim, { flex: 1 }, busy && styles.busy]}
                disabled={busy}
                onPress={onEnd}
              >
                <Text style={styles.stopSlimText} numberOfLines={1}>END</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.discardBar, busy && styles.busy]}
              disabled={busy}
              onPress={onDiscard}
            >
              <Text style={styles.discardBarText}>Discard ride</Text>
            </Pressable>
          </>
```

Keep/adapt the existing comment above the block; extend it with one line noting the
discard bar reuses the RIDES-tab deletion path (Nathan 2026-08-26).

**2b.** Structural guard: in `makeStyles` (line 1079 at HEAD), change

```ts
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
```

to

```ts
  // flexShrink + numberOfLines at the call sites: a stopSlim button's content
  // can now never push past its flex:1 width, whatever future copy does
  // (2026-08-25 screenshot: "ESUME back to the rid" off both screen edges).
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
```

`stopSlimSub` stays — it is still used by the collapsed PAUSE bar (line 734) and the
red-light button (line 714). Do NOT remove it.

**2c.** Add two styles to `makeStyles`, next to `stopSlimText`/`stopSlimSub` (modelled
on this file's own `cancelBar` and RidesScreen's `deleteBtn`/`deleteText` — dim, bordered,
quieter than the amber RESUME/END; destructive stays un-red per D-013):

```ts
  // Discard = the quiet third action under RESUME | END: dim border + dim text
  // (RidesScreen's own Delete affordance tone), never amber, never red (D-013).
  discardBar: {
    alignSelf: 'stretch',
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 9,
  },
  discardBarText: { color: t.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
```

After 2a there must be NO remaining occurrence of "back to the ride" or "ends & saves"
anywhere in `app/src/` (grep to confirm).

## 3. P2 — the discard path

All in `app/src/ui/RecordScreen.tsx` unless stated.

**3a. Imports.** At HEAD line 44 is `import { rememberRide } from './lastRide';` —
change to `import { dropRecorded, rememberRide } from './lastRide';`. Add two imports
beside the existing storage/store imports:

```ts
import { deleteRide } from '../storage';
import { removeStoredResult } from '../store/resultsStore';
```

(Exact paths verified: RidesScreen, in the same directory, imports from `'../storage'`
and `'../store/resultsStore'`.)

**3b. `onDiscard`.** Insert directly AFTER the `onEnd` callback (its closing `}, []);`
is just before `const recording = session != null;`, line 389 at HEAD):

```tsx
  // Discard (Cycle 025, Nathan 2026-08-26): end WITHOUT saving. Reuses the
  // RIDES-tab deletion path verbatim (deleteRide + removeStoredResult +
  // dropRecorded — RidesScreen.onDelete) so there is exactly ONE deletion
  // mechanism. A discarded ride is REALLY deleted, not hidden ("I only delete
  // rides that I genuinely did not do or should not count"). stopTracking()
  // must run first: deleteRide refuses while the ride is in storage's live
  // set, and endRide (inside stopTracking) is what clears it.
  const onDiscard = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    Alert.alert(
      'Discard ride?',
      'This stops recording and permanently removes the raw trace. Nothing is saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await stopTracking();
            } catch (e) {
              // Mirror onEnd's failure stance: stay where the ride really is.
              Alert.alert('Could not stop cleanly', e instanceof Error ? e.message : String(e));
              setPhase(sessionRef.current ? 'running' : 'setup');
              setBusy(false);
              return;
            }
            // Tracking is stopped. No rememberRide/rememberFreeRide, no
            // 'ending' phase, no reversed mark, no Result handoff — nothing
            // was kept, so fold straight back to setup (running -> setup is
            // legal: recordFlow.ts). Result's "last ride" intentionally still
            // shows the previous finished ride, never the discarded one.
            setSession(null);
            setRecovered(false);
            setPauseMenu(false);
            setLastSummary(null);
            setPhase('setup');
            try {
              await deleteRide(s.rideId);
              // Defensive mirrors of RidesScreen.onDelete: no result sidecar
              // or in-session entry is written on this path (rememberRide was
              // skipped), but never risk leaving one orphaned.
              await removeStoredResult(s.rideId);
              dropRecorded(s.rideId);
            } catch (e) {
              Alert.alert(
                'Could not discard',
                `${e instanceof Error ? e.message : String(e)}\nThe ride was ended and kept instead — you can delete it from RIDES.`,
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, []);
```

Notes, all verified: `Alert` is already imported (line 18); `sessionRef` mirrors the
current session for `[]` callbacks (line 129); the confirm-dialog pattern and wording
deliberately mirror RidesScreen's `onDelete` ("permanently removes the raw trace",
`style: 'destructive'`, Cancel first). Do NOT call `noteButtonPress` for discard — its
union type is `'pause' | 'resume'` only, and the events sidecar is deleted anyway; do
not widen the union.

**3c. `recordFlow.ts` comments only** (behaviour already legal — `running -> setup` is
in the table). In `app/src/ui/recordFlow.ts`: line 32, extend the trailing comment to
`// setup: recovery declined / stop failure fallback / discard`; line 44, change to
`*   running -> setup  recovery declined, stopTracking() threw on END, or DISCARD (ride deleted, nothing saved)`.
No other edits in this file. No changes to `LEGAL_TRANSITIONS` values.

## 4. P3 — yellow polyline: VERIFY this diagnosis, change no code

The planner's diagnosis, from reading `app/src/ui/routeMapView.tsx` and
`RecordScreen.tsx` at HEAD. Verify each numbered claim with a grep/read and mark it
VERIFIED (with the line number you saw) or COULD-NOT-VERIFY in your report. If any
claim fails verification, STOP and report — do not improvise a new theory.

1. The live map's only yellow line layer is the route line: `routeMapView.tsx` renders
   `route-core` with `'line-color': colors.neutral` (line ~426), and `colors.neutral`
   is `#F5C542` (theme.ts line 19) — the structural yellow. Gate ticks are short
   perpendicular strokes, not a polyline; the free-ride (`gatesOnly`) rung renders
   circles and NO route line (`routeFC` returns null when `gatesOnly`, line ~320).
2. While recording a route-mode ride, RecordScreen passes
   `routeId={live.mode === 'free' ? null : (live.track ?? rideRouteHint)}` (line ~656).
   Pre-lock, `live.track` is null, so the map draws `rideRouteHint` — the CANDIDATE
   route frozen at START (`pickedRouteRef.current?.refLineId ?? null`, line 331). A
   candidate route legitimately need not pass through the rider's dot (the rider may
   not have reached it 17 s in). This is intended B-51 behaviour, not a bug.
3. The mystery case: if NO candidate existed at START (`pickedRoute` null — happens
   whenever `way` is undefined, i.e. the frozen from/to pair matches no catalog way,
   e.g. auto-detected `fromId` drifted or from==to; RecordScreen lines 500–511), then
   `rideRouteHint` is null → the map's `props.routeId` is null → `MapLibreRouteMap`
   line 215 (`const id = props.routeId ?? DEFAULT_ROUTE_ID;`) silently falls back to
   `DEFAULT_ROUTE_ID` = the FIRST key of `app/assets/routes/routes.json` = `Morning`
   (the PNG rung, line 550, has the same fallback). So the live pause map can draw the
   Morning route in yellow, unbidden, anywhere in the city — a line with no relation
   to the rider's position. The fallback comment (lines 74–76) says it exists for the
   "no route known yet" browse/candidate case; nothing exempts the live variant.
4. "Leftover geometry from an earlier map session" is NOT a plausible mechanism at
   HEAD: sources are keyed React children fed from `useMemo` state; a stale
   `routeFC` would require a stale `asset`, which is derived per render.
5. Proposed follow-up (for the coordinator to file, NOT for you to build): suppress the
   `DEFAULT_ROUTE_ID` fallback when `variant === 'live'` and the ride is actually
   running (moving/stopped) — show basemap + rider only. Not a one-liner: the
   `if (!gatesOnly && !asset) return null;` guard (line ~327) would currently unmount
   the whole map when no asset resolves, so the fix needs a deliberate
   "no route, keep the map" render path. Needs a Nathan-visible behaviour choice; out
   of this pass's scope.

## 5. Do NOT

- Do not touch `routeMapView.tsx`, `RidesScreen.tsx`, any storage/location/live/store
  file, the mockup, or `make_screens.py`.
- Do not add a new storage function, a soft-delete, a trash folder, or any second
  deletion mechanism.
- Do not change the collapsed PAUSE bar or its sub-copy.
- Do not use red anywhere (D-013).
- Do not delete or rename any file.

## 6. Acceptance criteria and verification (run ALL, in this order)

1. `cd "$HOME/mnt/Qualifire/app" && npx tsc --noEmit` → no output, exit 0
   (one synchronous call, timeout_ms ≈ 45000).
2. `cd "$HOME/mnt/Qualifire/app" && node --experimental-strip-types tests/run.ts` →
   zero FAIL (SKIPs are acceptable if they pre-exist; note any).
3. `cd "$HOME/mnt/Qualifire" && grep -rn "ends & saves\|back to the ride" app/src/` → no matches.
4. `grep -n "Discard ride" app/src/ui/RecordScreen.tsx` → the button label and the
   Alert title both present.
5. `grep -c "stopSlimSub" app/src/ui/RecordScreen.tsx` → exactly 3 (style def, PAUSE
   bar, red-light button).
6. `grep -n "deleteRide" app/src/ui/RecordScreen.tsx` → import + exactly one call site.
7. Confirm you edited ONLY `RecordScreen.tsx` and `recordFlow.ts`.

## 7. Report format (return exactly this structure)

```
RESULT: DONE | BLOCKED
P1: <one line: what was removed/changed, with final line numbers>
P2: <one line: onDiscard summary + where the button renders>
P3: claims 1-5 each marked VERIFIED (line no.) or COULD-NOT-VERIFY (what you saw instead)
CHECKS:
  tsc: <clean | output>
  tests: <N PASS / N FAIL / N SKIP>
  greps 3-7: <pass/fail each>
FILES TOUCHED: <list>
FLAGS FOR COORDINATOR:
  - mockup.html has never depicted the cycle-020 pause menu (bare END button,
    line 403) — pre-existing gap, unchanged by this pass; needs a product call.
  - collapsed PAUSE bar sub still says "resume or end" (now also discard) —
    left unchanged deliberately (mirrors make_screens.py canonical SVG);
    optional follow-up copy+mirror pass if Nathan wants it.
  - P3 follow-up fix proposal (section 4, item 5) for the backlog.
ESCALATIONS: <none | verbatim question>
```
