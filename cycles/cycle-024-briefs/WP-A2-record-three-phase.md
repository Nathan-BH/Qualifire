# WP-A2 — RECORD three-phase flow (setup → armed → running), launch mark forward/reversed, fullscreen race mode

**Sequence:** brief 2 of 3 for WP-A. Requires WP-A1 landed and green (it changed `rememberRide`'s call in RecordScreen and `lastRide.ts`). A3 follows.

**DO NOT WRITE ANY REPO FILE until the coordinator confirms cycle 023 has landed.** First step: re-baseline. Cycle 023's scope (day-mode race-map rendering, auto-pause/map-dim, paused-time-in-result toggle, off-route investigation) very likely touched `RecordScreen.tsx`. Diff the live file against the anchors below before editing; preserve every 023 addition inside the 'running' branch verbatim. If 023 restructured the recording branch beyond recognition of these anchors, STOP and escalate — do not guess.

## Goal (Nathan's words, notes2 2026-08-19)

"On the RECORD tab, the START button should be replaced with a record button. When clicked, it should show the nice animation and then take you to the RACE screen but still not started. There the selected route should be shown with your location and everything set but not started. Then on that screen you can actually press start and start moving." … "At the end when you press stop it would be nice to show the animation again — but maybe it should be reversed: so the yellow line gets undrawn and then the circle gets undrawn as well." … "When you press record but are on the race screen, the other tabs in the footer disappear — full screen, no tab browsing. We should have the same feature." Plus: "I don't know what 'fixes' are" — the raw fixes count leaves every user-facing status line (stays in the GPX+ sidecar).

Reference implementation of the whole flow: `demos/mockup.html` (cycle 022) — three-phase `recordScreen()` L318-391, `qfPlayLaunch(reverse, onDone)` L140-183, reverse keyframes L101-127, tabbar hiding L730-745, status line L477-491. The mockup is the ratified spec; deviations are pre-resolved below.

## Environment / hard constraints

- No npm installs, no new packages, no react-native-svg/reanimated — the reverse animation must reuse the existing RN `Animated` approach in `launchAnimation.tsx`.
- Verification: `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL (sandbox-pure); `npx tsc --noEmit` clean via device_bash on the PC (`cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit`, fall back to `npx`). Re-baseline counts first.
- D-042: PAUSE is an accidental-stop guard; recording and the clock NEVER stop. Nothing in this brief touches `src/live/engine.ts` or the recording semantics of `src/location/index.ts` (one additive export allowed, change 5).
- D-013: no failure styling; the app palette has "NO RED ANYWHERE" (`app/src/ui/theme.ts` L6 doctrine) — see NEEDS-NATHAN for the RECORD button colour.
- Never delete files — `safe_to_delete/`. Stop-on-ambiguity: escalate, don't guess.

## Current state (anchors, snapshot 2026-08-20 — re-baseline against post-023 files)

- `app/App.tsx`: `Shell` L57-124 owns `tab` state; tab bar is a horizontal ScrollView L105-120, always visible; hardware back L70-79 (non-record tab → record); `LaunchAnimation` mounted once at cold boot L126-145 (`booting` state in `App`, overlay above Shell).
- `app/src/ui/RecordScreen.tsx` (762 lines): single screen, two branches — recording column `if (session)` L385-485 (cycle 020: map top ≈half, `LiveSectorPane`, status line, red-light button, PAUSE→RESUME|END L454-482) and idle ScrollView L487-603 (logo, prestart map L515-528, from/to/route pills L529-578, big START L591-600). `onStart` L201-225 (permissions → `startTracking()`); `onEnd` L227-241 (A1 version: `rememberRide(state, sessionRef…)` → `stopTracking()`). Status carousel L252-293: `statusItems` includes `` `${status.fixesThisLaunch} fixes` `` L271-272; pin logic L279-293. Recovery effect L173-199. "Ride saved: N fixes" L580-584; "Counter shows fixes since relaunch" L390-392.
- `app/src/ui/launchChoreo.ts` (148 lines): pure constants + maths (RING_MS 1400, SLASH_DELAY_MS 1150, SLASH_MS 500, FADE_MS 250, TOTAL_* L24-31, `slashProgress`, `hemisphereAngles`, `markGeometry`).
- `app/src/ui/launchAnimation.tsx` (236 lines): forward-only overlay; ring = two clipped hemisphere Views driven by `p` 0→1, slash grows via scaleX after SLASH_DELAY_MS; tap-to-skip; reduced-motion hold; `onDone` after fade.
- `app/src/location/index.ts`: `getStatus()` L70 (lastLat/lastLon only update while the background task runs); `ensurePermissions` L169; `startTracking` L186; `stopTracking` L235; `noteButtonPress('pause'|'resume')` L294-296 (B-69: currently uncalled).
- `app/src/ui/routeMapView.tsx`: `variant="live"`, `liveState` ∈ prestart/moving/stopped/finished — used at L401-411 (recording) and L517-527 (idle prestart). DO NOT modify routeMap* files (cycle-023/WP-E territory).
- Mockup: armed screen = `.armed-wrap` — readytag line ("home → work · Morning B · ready, not started"), map filling remaining height, big START button (mockup L366-375). Reverse choreography: tail undraws first (.5 s), ring undraws next (1.4 s, delay .5 s) — total 1.9 s before fade (mockup L117-122, L175).
- `app/tests/launch_anim_suite.ts` (8 tests) — pattern to extend.

## Change list

### 1. MOD `app/src/ui/launchChoreo.ts` — reverse choreography (pure)

Add, mirroring the mockup's numbers exactly:
- `REV_SLASH_MS = 500` (tail undraw), `REV_RING_DELAY_MS = 500`, `REV_RING_MS = 1400`, `REV_TOTAL_BEFORE_FADE_MS = REV_RING_DELAY_MS + REV_RING_MS` (= 1900), `REV_TOTAL_MS = REV_TOTAL_BEFORE_FADE_MS + FADE_MS` (= 2150).
- `reverseSlashProgress(tMs): number` — 1 at t≤0, eases 1→0 over [0, REV_SLASH_MS] (ease-in cubic — mirror of `easeOutCubic`; the mockup uses `ease-in` for the undraw), clamped 0 after.
- `reverseRingProgress(tMs): number` — 1 until REV_RING_DELAY_MS, then 1→0 across REV_RING_MS with the same RING_BEZIER handled by the Animated value (the pure function documents endpoints/clamping only, like `slashProgress`: return the linear-time envelope, eased by the component).
Both monotonically non-increasing, clamped to [0,1].

### 2. MOD `app/src/ui/launchAnimation.tsx` — `reverse` prop

`LaunchAnimation({ onDone, reverse = false })`. Reverse path: set `p`=1, `slash`=1 at mount; sequence: `Animated.timing(slash, {toValue: 0, duration: REV_SLASH_MS, easing: Easing.in(Easing.cubic)})`, in parallel `Animated.sequence([delay(REV_RING_DELAY_MS), timing(p, {toValue: 0, duration: REV_RING_MS, easing: bezier(RING_BEZIER)})])`; then the existing `finish()` fade. Existing interpolations already map p/slash symmetrically (hemispheres un-sweep, slash shrinks toward its inner end) — no new geometry. `slashOpacity` interpolation (L124) already hides the slash only below 0.001 — verify the shrinking bar reads as "undrawing" not "fading"; keep scaleX+translate as-is. Tap-to-skip in reverse: snap p=0, slash=0, then fade. Reduced-motion in reverse: show the blank state? No — mirror the mockup (L161-169): hold the CURRENT (completed) mark briefly then fade; i.e. same hold path as forward but without setting values to 1 first when reversed… pre-resolved: reduced-motion reverse = hold the completed mark REDUCED_MOTION_HOLD_MS, then fade (no undraw animation). Forward path byte-identical behaviour to today.

### 3. NEW `app/src/ui/recordFlow.ts` — pure, headless-testable flow rules

- `export type RecordPhase = 'setup' | 'armed' | 'running' | 'ending';`
- `canTransition(from, to)` table: setup→armed (RECORD), armed→setup (back/cancel), armed→running (START), running→ending (END pressed, save done, reverse anim playing), ending→setup (anim done), plus setup→running (relaunch recovery) and running→setup (recovery declined / stop failure fallback). Everything else false.
- `isFullscreen(phase): boolean` — true for armed/running/ending.
- `statusItemsFor(input: { gpsTrouble: boolean; gpsLine: string; routeLine: string }): string[]` — the rotating items WITHOUT any fixes count: trouble ? [gpsLine, routeLine] : [routeLine, gpsLine]. (Mirrors mockup L484: route + 'gps live' only. Fix counts remain in the GPX+ sidecar — nothing to change there.)

### 4. MOD `app/App.tsx` — fullscreen tab bar + tab navigation seam

- NEW tiny context in `app/src/ui/tabNav.tsx`: `TabNavProvider({ go, children })`, `useTabNav(): { go(tab: Tab): void }` (Tab type moved/exported from App or duplicated as a string union — pre-resolved: export `type Tab` from `tabNav.tsx` and have App import it, so screens depend on tabNav not App).
- Shell: `const [recFullscreen, setRecFullscreen] = useState(false)`. Render `<RecordScreen onFullscreenChange={setRecFullscreen} />`; render the tab-bar ScrollView only when `!(tab==='record' && recFullscreen)` (hidden entirely — mockup L734-736). Wrap Shell's children in `TabNavProvider` with `go: setTab`. When `tab` changes away from 'record' programmatically nothing special is needed (the bar can only be used while visible). Hardware-back handler L70-79 unchanged (RecordScreen adds its own, change 5).
- Keep the cold-boot forward `LaunchAnimation` exactly as-is.

### 5. MOD `app/src/ui/RecordScreen.tsx` — the three phases

Props: `{ onFullscreenChange?: (fs: boolean) => void }`. Also uses `useTabNav()`.

State: `const [phase, setPhase] = useState<RecordPhase>('setup')` plus existing `session`. Effective phase: `session != null ? (phase === 'ending' ? 'ending' : 'running') : phase`... pre-resolved simpler rule: keep `phase` authoritative; sync it — `useEffect`: if `session != null && phase !== 'running' && phase !== 'ending'` → `setPhase('running')` (covers relaunch recovery L173-199 restoring a session); if `session == null && (phase === 'running')` → stay (END path sets 'ending' explicitly before session clears; a stop-failure Alert path resets to 'setup'). Report fullscreen: `useEffect(() => onFullscreenChange?.(isFullscreen(phase)), [phase])`.

**setup** (today's idle branch, L487-603, mostly unchanged):
- Big button relabelled **RECORD** with a filled record-dot glyph (`●` Text, `t.onAccent`) before the label; styling: keep today's accent slab (`startYellow`) — see NEEDS-NATHAN #1 for the red option; sub-line: "arms the ride · nothing starts yet".
- Press RECORD → `onRecord`: run `ensurePermissions()` (moved up from onStart so OS dialogs happen at the kerb, not on the bike): denied/services-off → set `problem`, STAY in setup; else clear/flag problem (foreground-only), fire-and-forget `refreshPositionOnce()` (change 6), then show the FORWARD launch overlay: render `<LaunchAnimation onDone={() => { setPhase('armed'); setShowAnim(null); }} />` from RecordScreen (local state `showAnim: 'fwd'|'rev'|null`; overlay is absolute-fill, zIndex above content — it already styles itself absolute inset 0, which inside RecordScreen's flex-1 View covers the tab area; the tab bar is already hidden because we set fullscreen when `showAnim!=null || isFullscreen(phase)` — include `showAnim` in the fullscreen effect).
- The "Ride saved: N fixes, m:ss. Find it in Rides." line (L580-584) → "Ride saved — {fmtElapsed(...)}. Find it in Rides." (no fixes count).

**armed** (new branch, mirrors mockup L366-375):
- Full-height column on `t.race.bg` (reuse `raceColumn` style): readytag Text (styles like `trackLine`): `` `${fromLabel} → ${toLabel}${pickedRoute ? ' · ' + routeLabel(pickedRoute.refLineId) : ''} · ready — not started` ``; then the map filling remaining space: `RouteMapView` `variant="live"` `liveState="prestart"` `routeId={pickedRoute?.refLineId ?? null}` `lat/lon from status` `fill` (same component call shape as the recording branch L401-411 but prestart); `problemStates` above it; big **START** button (today's start-slab styling, sub "the clock runs from here") → `onStart` (existing L201-225, unchanged apart from what A1 did; on success the session lands and the sync effect flips phase to 'running'); slim "back" affordance: a small text button "‹ cancel — back to setup" (amber border slim bar) → `setPhase('setup')`.
- Hardware back while armed: register a BackHandler in RecordScreen (runs before Shell's): if phase==='armed' → setPhase('setup'), return true. If running/ending → return true (swallow — no accidental background/exit mid-flow; the OS home button still works, recording survives via the foreground service). Setup → return false (Shell handles).
- Armed screen must NOT start tracking, NOT start the engine, NOT write anything (D-042 untouched: the clock anchor stays `startTracking()`'s `startedAtMs`).

**running** (today's L385-485 column, preserved including every cycle-023 change found at re-baseline):
- Status items: replace L270-272 with `statusItemsFor({gpsTrouble, gpsLine, routeLine})` from recordFlow (fixes count gone). Pin logic unchanged.
- Recovered copy L390-392 → "Recovered after relaunch — still recording. Nothing was lost on disk." (no fixes mention).
- PAUSE→RESUME|END block: wire B-69's `noteButtonPress` — `onPress` PAUSE: `noteButtonPress('pause'); setPauseMenu(true)`; RESUME: `noteButtonPress('resume'); setPauseMenu(false)` (import from `../location`). (Coordinator note: this closes WP-G's B-69 RecordScreen item — flag in the completion report.)
- END (inside pause menu, unchanged position): `onEnd` becomes: set `busy`; `rememberRide(..., meta)` (A1); `await stopTracking()`; `setLastSummary(sum)`; `setPhase('ending')`; render `<LaunchAnimation reverse onDone={() => { setPhase('setup'); tabNav.go('result'); }} />`. On stopTracking throw: keep today's Alert, `setPhase(session ? 'running' : 'setup')`, no navigation, no animation.
- The mockup's auto-finish at the last gate (mockup L438-439) is NOT ported: in the real app the finish gate ends TIMING (engine 'finished') but recording continues to the door; END stays manual. Pre-resolved.

### 6. MOD `app/src/location/index.ts` — one additive export

```ts
/** One-shot position refresh for the armed (pre-start) screen — display only,
 * never recorded (no ride is open). Foreground permission must already be
 * granted; failures are swallowed. [UNTESTED ON DEVICE] */
export async function refreshPositionOnce(): Promise<void> {
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    lastFixMs = loc.timestamp; lastLat = loc.coords.latitude; lastLon = loc.coords.longitude;
    emit();
  } catch { /* display only */ }
}
```
No other changes to this file. (It also improves the setup screen's detected-start pill, which reads `status.lastLat` — today null until a ride has run.)

### 7. Tests

- EXTEND `app/tests/launch_anim_suite.ts` (+4): reverse constants match the mockup storyboard (500/500/1400 → 1900/2150); `reverseSlashProgress` monotone non-increasing, 1 at 0, exactly 0 at REV_SLASH_MS; `reverseRingProgress` holds 1 through the delay and reaches 0 at REV_TOTAL_BEFORE_FADE_MS; reverse total > forward total (1900 > 1650, the mockup's asymmetry).
- NEW `app/tests/recordflow_suite.ts` (+4), imported from `run.ts`: transition table (legal moves pass, illegal — e.g. setup→ending, ending→running — fail); `isFullscreen` true exactly for armed/running/ending; `statusItemsFor` never contains the substring 'fix' in any item and orders trouble-first; items are non-empty strings.
- Expected: A1's baseline + 8, 0 FAIL. Re-baseline and report exact numbers.

## Verification

1. `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL.
2. device_bash: `cd "$HOME/mnt/Qualifire/app" && npx.cmd tsc --noEmit` → clean; rerun suite on PC.
3. Grep `src/ui` for `fixes` — remaining hits must be non-user-facing (comments) or GPX+/storage internals; `RidesScreen.tsx` hits are allowed (A3 removes them).
4. On-device checks (PowerShell/manual — list for Nathan, cannot run in sandbox): RECORD → animation → armed (tab bar gone) → START → running (tab bar still gone) → END → reversed animation → lands on Result, tab bar back. Mark `[UNTESTED ON DEVICE]` in code comments where the file convention does.

## Files touched

`app/src/ui/launchChoreo.ts` · `app/src/ui/launchAnimation.tsx` · `app/src/ui/recordFlow.ts` (NEW) · `app/src/ui/tabNav.tsx` (NEW) · `app/App.tsx` · `app/src/ui/RecordScreen.tsx` (major) · `app/src/location/index.ts` (additive) · `app/tests/launch_anim_suite.ts` · `app/tests/recordflow_suite.ts` (NEW) · `app/tests/run.ts`

## Conflict-with-023 flags

- **HIGH — `RecordScreen.tsx`:** 023's auto-pause/map-dim and off-route work lands here. Re-baseline mandatory; preserve 023's running-branch changes verbatim inside the new 'running' phase. Escalate on structural divergence.
- `App.tsx`: low risk; re-check the Shell anchors.
- routeMap* files: NOT touched by this brief (WP-E/023 own them) — armed screen only passes existing props.
- WP-G overlap: B-69 `noteButtonPress` wiring is DONE here (2 lines); report so the coordinator strikes it from WP-G.

## Pre-resolved ambiguities (recap)

- Armed phase records nothing; recording+clock start at START (D-042 semantics unchanged); one-shot GPS refresh only.
- Permissions prompt moved to RECORD press; START re-checks (idempotent).
- No auto-END at the finish gate (mockup deviation, deliberate).
- Hardware back: armed→setup; running/ending swallowed; setup → Shell default.
- Reduced-motion reverse = static hold + fade.
- Tab-bar hiding covers the animation overlays too (no tab switch mid-mark).
- Abandon-ride-via-tabs cannot happen (bar hidden); the mockup's safety-net reset (L752-754) is therefore not ported.

## NEEDS-NATHAN

1. **RECORD button colour.** The ratified mockup draws RECORD as a red slab with a white dot (mockup L87-89); the app codebase has an explicit "D-013: NO RED ANYWHERE" doctrine (`theme.ts` L6) — red is reserved against colour-trust/colourblind rules. Default shipped here: accent-yellow slab with a charcoal record dot. Say "red" and it's a two-line change (`colors.recordRed = '#D33'`).

## Rollback

Revert the ten files. No on-device data is created by this brief; behaviour returns to single-phase START/PAUSE flow.
