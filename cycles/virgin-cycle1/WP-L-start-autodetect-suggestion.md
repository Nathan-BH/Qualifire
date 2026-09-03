**Status: DONE — landed on the device 2026-09-03.** 380 tests, 377 pass, 0 fail, 3 skip (6 new, baseline 374/371/0/3); `tsc --noEmit` confirmed clean on-device. §3's prescribed edits (new `effectiveFromId()` in `recordFlow.ts`, `fromExplicit` state + `pickFrom()` wrapper, per-ride reset on end/discard only, flow-label copy) all landed as specified, against the real (post-WP-B) `RecordScreen.tsx` — WP-B's `pickSource` (routePick-derived) and this brief's `fromExplicit` (from-landmark-tap-derived) are genuinely independent, coexisting with no interaction. No blocking ambiguity. §5's on-phone check (actually riding/tapping through the RECORD tab UI) still outstanding — this session had a device shell for tests/tsc/git, but not a way to drive the running app's UI.
**Review doc item: 13 (notes5 N5). Size: small.**
**Verified against the mirror at commit `ec46906` (after WP-A landed) — `RecordScreen.tsx` shifted a few lines from earlier reads; re-grep the anchor text below rather than trusting exact line numbers if more work has landed since.**

---

# WP-L — Start auto-detect as a suggestion

## 1. Goal

In `auto` start mode, the auto-detected landmark must be a **suggestion**: it seeds STARTING FROM while the rider has not tapped anything, but an explicit tap wins and sticks for the rest of that ride's setup. Auto-detect must never un-set a deliberate choice. Per ride: the next ride's setup gets a fresh suggestion again.

## 2. Current state (verified against `RecordScreen.tsx`)

- `from`/`setFrom` state defaults to the catalog's default start landmark.
- `detected` is derived every render from the last fix (`landmarkAt`), null when there's no fix or it's outside every landmark disc.
- **The bug**: `const fromId = settings.startMode === 'auto' ? (detected?.id ?? from) : from;` — in auto mode `detected` unconditionally overrides `from`.
- Tapping a landmark pill or the `new` pill just calls `setFrom(id)` — no flag distinguishes "the rider explicitly chose this." So in auto mode with a detection present, tapping updates `from` but `fromId` never changes: **the tap is silently ignored.** That's Nathan's N5.
- `startMode` is a persisted global setting (`'auto' | 'pick'`, default `'auto'`), unrelated to per-ride state.
- **Realistic scenario**: ride home→work ends; `lastLat/Lon` still reads "work" (not cleared at stop); rider opens setup for the return, `detected = work`; taps `home` (or `new`) → ignored.
- `fromId` is read downstream for: `freeRide` check, `freeRideRouteIds`, `way` lookup, `pickedRoute`, the armed-screen label, pill highlighting (`pillOn`, plus a separate `✓` marking the *suggestion* independently — that existing UI split is exactly what should remain), the GOING TO pill filter. None of these need to change beyond consuming the corrected `fromId`.
- Nothing in the running/ending branches reads `fromId` — the ride freezes its route hint at START, and the end-of-ride naming card derives endpoints from the ride's own fixes. **The change is contained to setup/armed.**
- `from`/`to`/`routePick` are never reset between rides today — a new explicit-tap flag needs its own per-ride reset, or one tap disables auto-detect until app restart.
- **Existing analogous pattern to follow**: `pickedRoute` is already a pure render-time derivation ("the rider's pick if valid for this way, else the §8a default") with no effect and no seeding write into state — the fix below uses the exact same shape for `fromId`, avoiding a `useEffect` that would fight a later `startMode` toggle.
- The `from`/auto-detect rule is currently **inline in the component**, not in the pure, headlessly-tested `src/ui/recordFlow.ts` module (which already holds `canTransition`/`isFullscreen`/`statusItemsFor`). Pulling it out gives it a real test, same as `statusItemsFor` got.

## 3. Proposed change (exact)

### 3a. `src/ui/recordFlow.ts` — new pure function

```ts
/** STARTING FROM in the setup/armed phases (notes5 N5): in 'auto' start mode
 * the detected landmark is a SUGGESTION — it stands in for `from` only while
 * the rider has not tapped a START pill this ride. An explicit tap
 * (`fromExplicit`) wins and sticks, even if detection later changes or goes
 * null; 'pick' mode never consults detection at all. */
export function effectiveFromId(input: {
  startMode: 'auto' | 'pick';
  detectedId: string | null;
  from: string;
  fromExplicit: boolean;
}): string {
  if (input.startMode !== 'auto' || input.fromExplicit) return input.from;
  return input.detectedId ?? input.from;
}
```
(Untapped-case behaviour is byte-identical to today.)

### 3b. `RecordScreen.tsx`

1. Import `effectiveFromId` from `./recordFlow`.
2. New state next to `from`/`to`:
   ```ts
   // notes5 N5: true once the rider has tapped a START pill this ride. Reset
   // when a ride ends or is discarded — never on armed→setup cancel, which
   // must keep the rider's choice.
   const [fromExplicit, setFromExplicit] = useState(false);
   const pickFrom = (id: string) => { setFrom(id); setFromExplicit(true); };
   ```
3. Replace the `fromId` line:
   ```ts
   const fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit });
   ```
4. Update the nearby stale comment (currently says detection unconditionally overrides).
5. Pill handlers: `onPress={() => setFrom(l.id)}` → `onPress={() => pickFrom(l.id)}`; same for the `new` pill. After this, `setFrom(` should appear nowhere except the `useState` line and inside `pickFrom`.
6. Per-ride reset: `setFromExplicit(false);` in the `onEnd` success block and the discard success block. **Not** on armed→setup cancel paths (hardware back, cancel bar) — cancelling arming must keep what the rider chose.
7. Flow-label copy: show "DETECTED START" only when `fromId === detected.id`; otherwise "STARTING FROM" (or "START NOT DETECTED — PICK ONE" when nothing is detected at all). The detected pill keeps its own `✓` regardless, so the suggestion stays visible after an override.
8. Touch the nearby stale comment about `fromId` drifting mid-ride in auto mode — add "while nothing has been tapped (N5)".

Nothing else changes; `onStart` reads only refs derived from `fromId`, so no edit needed there.

## 4. Test plan

New test in `tests/recordflow_suite.ts` (import `effectiveFromId`): pick mode ignores detection whether or not `fromExplicit`; auto+untapped seeds from detection, falls back to `from` when nothing detected; **auto+tapped: the tap wins over a differing detection (the core regression)**; tap sticks after detection later changes or goes null; tapping the detected pill itself is a no-op that still "sticks"; tapping `new` in auto mode now takes hold.

Component-level behaviour (per-ride reset, label copy, pill handlers) can't be tested headlessly — cover in the on-device check.

## 5. Verification

```
cd app
node --experimental-strip-types tests/run.ts    # expect baseline + 1 test group, 0 fail
grep -n "setFrom(" src/ui/RecordScreen.tsx        # expect exactly: the useState line + inside pickFrom; no other JSX hits
./node_modules/.bin/tsc --noEmit
```

On-device: finish a home→work ride; open setup for the return (phone still reads "work" → `work ✓` highlighted, "DETECTED START"); tap `home` → highlights, `work` keeps its `✓`, label reads "STARTING FROM", stays `home` even after the armed screen's fresh GPS fix lands; tap `new` → free ride takes hold; start/end (or discard) a ride → next setup shows detection as a suggestion again; cancel from armed → tapped choice retained.

## 6. Files touched

`src/ui/recordFlow.ts`, `src/ui/RecordScreen.tsx`, `tests/recordflow_suite.ts`.

## 7. Open questions (none blocking)

1. Should `fromExplicit` also reset when `startMode` flips pick→auto? Recommend not — simpler rule, revisit only if the on-device check feels wrong.
2. Pre-existing, out of scope, noticed while tracing: after a home→work ride, `detected = work` while `to` also still defaults to `work`, so setup can silently read "work → work" with no way and a free ride. Not introduced by this WP — worth a small separate item later.
3. No "clear my selection" affordance exists today, so "revert to suggestion after clearing" doesn't arise; if one is ever added, its handler should call `setFromExplicit(false)`.
