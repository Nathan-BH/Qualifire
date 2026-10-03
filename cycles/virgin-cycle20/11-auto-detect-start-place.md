# 11 — Auto-detect START place keeps trying after location comes on late

**Source: Nathan, 2026-10-02** — the RECORD setup screen's automatic start-place detection
("Start place" setting = auto, `settings.startMode`) "does not always work". His suspicion: open the
app FIRST, turn location on (GPS toggle, or grant the permission) only THEN, and auto-detect stays
dead until the app is restarted. Ruling: the setup/armed screen keeps re-trying a **quiet** position
read (no prompt of any kind) while it is visible and has no position — on every return to the app,
on every RECORD press, and on a bounded light poll — and the detected start place appears by itself
within a few seconds of location coming on. A manual pick still wins (N5). Nothing about recording,
the engine or permissions-at-RECORD changes.

**Status: brief only. Nothing below is in the app.** Written 2026-10-02 by the Plan tier
(Fable) against the working tree (branch `virgin`, HEAD `ae911bb`; 784 tests / 781 pass /
0 fail / 3 skip at HEAD). **This brief runs AFTER briefs 06 and 08**, which also edit
`RecordScreen.tsx` — every anchor below is quoted text, and §Interplay says what each of those
briefs moves. Executor: Sonnet, cold, this file only.

## What this changes on the phone — and what it does not

- **Changes:** with location OFF (or permission not yet granted) when the RECORD tab opens, the
  screen now re-checks quietly — ~every 2–5 s for up to 60 s while the setup/armed screen is
  visible and no position is known, again whenever the app comes back to the foreground, and
  again on each RECORD press (which restarts the 60 s budget). The moment a position arrives
  the `DETECTED START` pill lights up by itself (unless a pill was tapped meanwhile). Opening
  the tab with location OFF **no longer pops the Google "turn on location?" dialog**
  (§Evidence E2 — today it can).
- **Stays exactly as today:** what RECORD/START do with permissions (`ensurePermissions`, the
  GPS-off flash — brief 08's `flashSub` after it lands), the N5 rule (a tapped pill sticks),
  `'pick'` start mode (never consults detection), recording, the engine, the foreground service,
  the running/ending phases (no poll there), `getStatus()`'s shape, every other screen.
- **JS-only → OTA-able** via EAS Update (`scripts/publish-preview.ps1`; no native, no
  fingerprint change — `mayShowUserSettingsDialog` is an existing expo-location JS option).

## Evidence (read 2026-10-02; `app/node_modules/expo-location` = 56.0.23, RN 0.85.3)

### E1 — the position is read exactly ONCE, on mount, and a failure is never retried

- `app/src/ui/RecordScreen.tsx` lines 323-328:
  ```ts
  // WP-D Piece B: a non-prompting position refresh on mount, so a returning
  // user sees the rider dot on the setup map without pressing RECORD first —
  // refreshPositionIfPermitted() checks permission before asking for a fix
  // and never triggers an OS prompt just from opening this tab.
  // [UNTESTED ON DEVICE]
  useEffect(() => { void refreshPositionIfPermitted(); }, []);
  ```
  `[]` deps: once per mount. No `AppState` listener anywhere in `RecordScreen.tsx` (grep: zero
  hits), no focus hook (the app has no react-navigation; `App.tsx` 228 renders
  `tab === 'record' ? <RecordScreen …/>` conditionally, so RecordScreen **unmounts on a tab
  switch and remounts on return** — a tab round-trip is today's only "retry", which is exactly
  Nathan's "works again only after…" experience, short of a restart).
- `app/src/location/index.ts` lines 477-485 `refreshPositionIfPermitted` → `getForegroundPermissionsAsync()`;
  `if (!perm.granted) return;` (silent) → lines 460-470 `refreshPositionOnce`:
  `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` inside
  `try { … } catch { /* display only */ }`. Every failure (services off, permission missing,
  no fix) is **swallowed with no state, no flag, no retry**. `lastLat/lastLon` stay `null`
  (module scope, lines 106-107), so `status.lastLat === null` on the screen.
- The other callers: `onRecord` line 535 `void refreshPositionOnce();` — only reached AFTER
  `ensurePermissions()` returned ok (line 527-532 return early on `'denied' | 'services-off'`), and
  `startTracking` (the ride's own 1 Hz feed, running phase only). So with location off at RECORD
  press, nothing is read either; after the rider turns it on, the NEXT press works (ensurePermissions
  passes, `refreshPositionOnce` runs) — but the setup screen itself never recovers on its own.

### E2 — the "non-prompting" mount read CAN prompt (and a dismissed prompt is a dead end)

- `refreshPositionOnce` does not pass `mayShowUserSettingsDialog`; expo-location defaults it to
  **true** (`android/src/main/java/expo/modules/location/records/LocationArguments.kt` 42
  `@Field var mayShowUserSettingsDialog: Boolean = true`). `LocationModule.kt` 466-490
  `getCurrentPositionAsync`: `if (LocationHelpers.hasNetworkProviderEnabled(mContext) || !showUserSettingsDialog) requestSingleLocation(…) else addPendingLocationRequest(…)` →
  531-569 `resolveUserSettingsForRequest` → Play Services `SettingsClient.checkLocationSettings`
  → `RESOLUTION_REQUIRED` → `startResolutionForResult` = the system **"For a better experience,
  turn on device location" dialog**. With location OFF the network provider is off, so opening
  the RECORD tab shows that dialog. "OK" turns location on and the fix follows (works); "No
  thanks" → `RESULT_CANCELED` → `LocationSettingsUnsatisfiedException` → swallowed (E1) → dead
  until remount. This contradicts the comment at RecordScreen 326 and the project rule
  (non-prompting only). Needs on-device confirmation of the dialog's appearance — but the code
  path is unconditional.
- With `mayShowUserSettingsDialog: false` and services off, `requestSingleLocation`
  (`LocationHelpers.kt` 67-86) → fused `getCurrentLocation` → `null` →
  `CurrentLocationIsUnavailableException`, or a failure → rejected promise. Quiet, fast, swallowable.
- `hasServicesEnabledAsync` (`LocationModule.kt` 311-312 → `LocationHelpers.isAnyProviderAvailable`,
  144-148: `isProviderEnabled(GPS) || isProviderEnabled(NETWORK)`) is a synchronous LocationManager
  read — **cheap enough to poll**; it is not evented in expo-location (no listener API;
  `getProviderStatusAsync` 213 / 403-418 is the same read with more fields;
  `enableNetworkProviderAsync` is a prompt — never used here; `watchPositionAsync`'s error
  handler fires `LocationUnavailableException` on availability loss but is a continuous GPS
  subscription — too heavy for a setup screen). So the retry has to be driven from our side:
  AppState + a bounded poll.

### E3 — downstream is already latch-free: a late position auto-picks

- `RecordScreen.tsx` 1144-1152: `detected` is recomputed **every render** from
  `status.lastLat/lastLon` through `landmarkAt(CATALOG, …, Date.now())`, and
  `fromId = effectiveFromId({ startMode: settings.startMode, detectedId: detected?.id ?? null, from, fromExplicit })`.
  `app/src/ui/recordFlow.ts` 63-71: `if (startMode !== 'auto' || fromExplicit) return from; return detectedId ?? from;`.
  No "detected once" flag, no memo. `status` is live: line 321 `useEffect(() => subscribe(setStatus), [])`
  and `refreshPositionOnce` calls `emit()` after setting `lastLat/lastLon` (index.ts 466). So the
  instant a position lands, the label flips to `DETECTED START` (1575-1581) and the pill highlights.
- `fromExplicit` (281-282) is set by any pill tap and reset only at ride end/discard (`setFromExplicit(false)`
  at 603/683/921-ish — brief 08 shifts these) and on sport switch (296). **A pill tapped while
  detection was dead keeps winning after the late fix** — N5, deliberate, unchanged here (Open call A).
- The armed screen shows `landmarkLabel(fromId)` (1230-1231) live too; `rideWayHint`/the pick are
  frozen only at START (`onStart` 589). So polling in `'armed'` is useful and safe.

### E4 — the opposite cases (location turned OFF after a fix; permission revoked)

- `lastLat/lastLon` are module state, kept deliberately across START (index.ts 418-423, WP-D
  Piece A) and across remounts. If location is switched off AFTER a fix, the setup screen keeps
  showing that (stale) fix as the detected start, with no age check — **today's behaviour, unchanged
  by this brief** (the poll only runs when there is NO position). At the kerb the last fix is almost
  always still the right place, and the ride itself is protected by `fixFlags.ts`'s `preStart`.
  Flagged for the coordinator (§Out of scope), no change proposed. Permission revoked while the app
  is open: Android kills and restarts the process — fresh module state, mount read → `'no-permission'`,
  poll runs, nothing stale.

### What is proven from code vs what needs the phone

- Proven: one read per mount, silent swallow, no AppState/focus retry, remount-on-tab-switch,
  per-render auto-pick (E1, E3), the default-true settings dialog path (E2).
- Needs on-device confirmation: that the Play Services dialog actually appears on this build when
  the tab opens with location off (E2), and the fix latency after the shade toggle (Balanced
  priority = fused/network, usually seconds).

## Executor rules (binding)

- **Stop-on-ambiguity.** Anchors are quoted text, read 2026-10-02 at HEAD `ae911bb`; briefs 06
  and 08 have landed before you and shift line numbers — **never anchor on a number**. If a quoted
  string is absent or differs, stop and report (file, expected, found) verbatim. §Interplay lists
  the anchors those briefs change and what to do.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a leftover `.git/index.lock` is `mv`'d
  aside, never deleted). **Never delete** — `safe_to_delete/` is the bin. No `npm install`,
  no `npx …`, no `eas …`. Never grep the whole repo or `node_modules`; `timeout 40 grep -n`
  on the named files only.
- **Files touched — exactly these, nothing else:**
  - NEW `app/src/location/positionRetryPolicy.ts` (pure; no expo/RN import)
  - EDIT `app/src/location/index.ts` (replace `refreshPositionIfPermitted`; one import-free addition)
  - EDIT `app/src/ui/RecordScreen.tsx` (RN import line; `../location` import list; the mount
    effect block; one line in `onRecord`)
  - NEW `app/tests/positionretry_suite.ts`
  - EDIT `app/tests/run.ts` (one import line)
- Do **not** touch: `refreshPositionOnce` (onRecord's post-permission read stays), `ensurePermissions`,
  `startTracking`/`stopTracking`, the task handler, `recordFlow.ts`, `effectiveFromId`, `settings.tsx`,
  `App.tsx`, `tabNav.tsx`, `catalog.ts`, `live/*`, `storage/*`, `STATE.md`, `OPEN-ITEMS.md`,
  `IDEAS.md`, this folder's other files; in `RecordScreen.tsx` nothing but the four anchors below.

## Goal

While the RECORD screen is in `'setup'` or `'armed'` with no position known, a quiet
(permission-check-only, dialog-free) position read is retried on a bounded schedule
(2, 2, 2, 3, 3, then 5 s apart; ≤ 60 s per budget; ≤ 15 reads), the budget restarting on
app-foreground and on RECORD press; the poll stops the moment a position is known, the phase
leaves setup/armed, or the screen unmounts; the policy is a pure module with headless tests that
fail before / pass after; the mount read can no longer raise the Play Services settings dialog.

## Decisions

1. **Quiet read = permission check (no request) + services check + `mayShowUserSettingsDialog: false`.**
   `refreshPositionIfPermitted` is rewritten to return an outcome
   `'fixed' | 'no-permission' | 'no-services' | 'failed'` so the screen can stop polling only on
   `'fixed'` (via the status subscription) and nothing else prompts. It never calls
   `request*PermissionsAsync`, never `enableNetworkProviderAsync`. Services off → returns
   `'no-services'` **without** touching the fused client at all (cheapest possible tick).
2. **In-flight dedupe + JS-side 20 s timeout.** The fused `getCurrentLocation` has no caller-side
   timeout in expo-location (`LocationHelpers.kt` 67-86); a poll must never stack native requests.
   One module-scope in-flight promise is shared by every caller; a tick that finds one pending
   returns that same promise. If the native call outlives 20 s the tick resolves `'failed'` and the
   poll continues — a late native resolve still applies its fix (never dropped).
3. **Retry triggers: (a) mount — unchanged; (b) `AppState` `'active'` — immediate quiet read + budget
   restart (covers "went to Settings, enabled, came back": the quick-settings shade does NOT
   background the app, so (b) alone is not enough); (c) RECORD press — budget restart (the
   post-`ensurePermissions` `refreshPositionOnce` already reads when permissions pass; the restart
   covers the GPS-off flash → user enables → waits); (d) the bounded poll while
   `phase ∈ {setup, armed}` and `status.lastLat === null`.** No poll in `running`/`ending`
   (the ride feed owns the position) — enforced in the pure policy, not just the screen.
4. **Battery: ≤ 15 quiet reads per 60 s budget, each a cheap permission+services check first;
   `getCurrentPositionAsync` (Balanced priority; `maxUpdateAge` 3 s per expo's Balanced params) only
   when both pass.** Services off → zero GPS activity per tick. The effect's cleanup clears the timer on
   unmount (tab switch) and on phase change, so a background tab never polls.
5. **The policy is pure: `positionRetryPolicy.ts`** — `nextPollDelayMs(state)` (null = stop),
   `pollDelayFor(attempt)`, `restartsBudget(trigger)`, constants. Mirrors `lockScreenPolicy.ts`:
   no expo/RN import so Node can load it; the phase type is a local literal union, not an import
   from `ui/recordFlow` (location/ must not depend on ui/).
6. **N5 stands:** a tapped pill wins over a late detection for the rest of the ride (E3). Not
   changed (Open call A).
7. **Stale position after location goes OFF: unchanged (E4).** Out of scope; flagged.
8. **Tests: a new suite `positionretry_suite.ts` (+7 tests → 791 / 788 / 0 / 3 at HEAD counts,
   plus whatever 06 and 08 added).** Tests 1-5 pin the pure policy (fail to import today);
   tests 6-7 are source pins on `index.ts` and `RecordScreen.tsx` (fail today).

## Files to touch

### 1. NEW `app/src/location/positionRetryPolicy.ts`

```ts
/**
 * Qualifire — virgin-cycle20 brief 11: the pure half of "auto-detect START keeps
 * trying after location comes on late". PURE — no expo / react-native import, so
 * tests/positionretry_suite.ts can load it under plain Node. location/index.ts's
 * refreshPositionIfPermitted() does the actual quiet read; RecordScreen.tsx runs
 * the timer; THIS file decides whether / when the next quiet read happens.
 *
 * Why a poll at all: expo-location has no event for "location services were
 * just switched on" (hasServicesEnabledAsync is a plain LocationManager read),
 * and toggling location from the quick-settings shade never backgrounds the app,
 * so an AppState listener alone misses Nathan's case. A bounded, cheap poll
 * (permission + services check first; a real fix request only when both pass)
 * while the setup/armed screen is visible and no position is known closes it.
 */

/** RecordScreen's phases (recordFlow.ts) — a local literal union, never an
 * import from ui/ (location/ must not depend on ui/). */
export type RecordPhaseLike = 'setup' | 'armed' | 'running' | 'ending';

/** What a quiet read can come back with. 'fixed' is the only one that ends a
 * poll — and it ends it through the status subscription (lastLat !== null),
 * not through this value, so a fix from ANY source (onRecord's read, a late
 * native resolve) stops the timer too. */
export type QuietRefreshOutcome = 'fixed' | 'no-permission' | 'no-services' | 'failed';

/** Why a retry is being asked for. Every trigger performs a quiet read; the
 * ones in RESTARTING_TRIGGERS also restart the poll budget (RecordScreen bumps
 * its poll epoch for them). */
export type RetryTrigger = 'mount' | 'app-active' | 'record-press';

/** Delays between consecutive quiet reads within one budget — gentle backoff
 * to 5 s. Sum of the first 6 = 17 s; then 5 s steps to the budget end. */
export const POLL_DELAYS_MS: readonly number[] = [2000, 2000, 2000, 3000, 3000, 5000];
/** How long one poll run may keep trying (per budget; restarted by RESTARTING_TRIGGERS). */
export const POLL_BUDGET_MS = 60_000;
/** JS-side cap on one native getCurrentPositionAsync wait (index.ts). The fused
 * client has no caller-side timeout; after this the tick counts as 'failed' and
 * the poll goes on. A late native resolve still applies its fix. */
export const QUIET_REFRESH_TIMEOUT_MS = 20_000;

/** Delay before poll attempt `attempt` (0-based): the table, then its last entry. */
export function pollDelayFor(attempt: number): number {
  const i = Math.max(0, Math.floor(attempt));
  return POLL_DELAYS_MS[Math.min(i, POLL_DELAYS_MS.length - 1)];
}

export interface PollState {
  phase: RecordPhaseLike;
  /** status.lastLat !== null && status.lastLon !== null */
  hasFix: boolean;
  /** ms since this budget started (mount / epoch bump). */
  elapsedMs: number;
  /** quiet reads already scheduled in this budget (0 before the first). */
  attempt: number;
}

/** ms until the next quiet read, or null = stop polling. Stops when: a fix is
 * known; the phase is not setup/armed (the ride feed owns the position while
 * running; nothing to detect while ending); or the budget is spent. */
export function nextPollDelayMs(s: PollState): number | null {
  if (s.hasFix) return null;
  if (s.phase !== 'setup' && s.phase !== 'armed') return null;
  if (s.elapsedMs >= POLL_BUDGET_MS) return null;
  return pollDelayFor(s.attempt);
}

/** Triggers that restart the 60 s budget as well as reading once. 'mount' is a
 * fresh effect anyway (its own budget), so it is listed for completeness. */
export const RESTARTING_TRIGGERS: ReadonlySet<RetryTrigger> = new Set<RetryTrigger>(['mount', 'app-active', 'record-press']);
export function restartsBudget(trigger: RetryTrigger): boolean {
  return RESTARTING_TRIGGERS.has(trigger);
}

/** Upper bound on quiet reads in one budget — documents the battery ceiling
 * (tests pin it). Computed, not hard-coded, so the table and the budget can
 * never drift from the number. */
export function maxReadsPerBudget(): number {
  let t = 0, n = 0;
  for (;;) {
    const d = nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: t, attempt: n });
    if (d === null) return n;
    t += d;
    n += 1;
  }
}
```

### 2. EDIT `app/src/location/index.ts`

(a) Directly after the existing import block's last line
`import { rideNotificationFor } from './rideNotificationPolicy';` add:
```ts
import { QUIET_REFRESH_TIMEOUT_MS, type QuietRefreshOutcome } from './positionRetryPolicy';
```
(If brief 08 added its own import lines after it, insert after the LAST `import … from './…'` line
of the block.)

(b) Replace the whole `refreshPositionIfPermitted` function — from the doc comment starting
`/** WP-D Piece B: like refreshPositionOnce, but checks foreground permission` through its closing
`}` after `await refreshPositionOnce();` (lines 472-485 at HEAD) — with:
```ts
/** WP-D Piece B → virgin-cycle20 brief 11: the QUIET position read for the
 * setup/armed screen. Never prompts: permission is CHECKED (getForeground-
 * PermissionsAsync), never requested; services are CHECKED (a plain
 * LocationManager read) and a disabled toggle returns 'no-services' without
 * touching the fused client; the fix request itself passes
 * mayShowUserSettingsDialog:false — expo-location's default is TRUE, which
 * made the old mount read pop the Play Services "turn on location?" dialog
 * whenever the tab opened with location off (LocationModule.kt
 * getCurrentPositionAsync → resolveUserSettingsForRequest). Safe to call from
 * a timer: one in-flight native request is shared by every caller, and a
 * JS-side QUIET_REFRESH_TIMEOUT_MS cap turns a hung request into 'failed'
 * while a late native resolve still applies its fix. Display only — nothing
 * is recorded (no ride is open). Returns what happened so RecordScreen's
 * poll can log it; the poll STOPS via the status subscription (lastLat set),
 * never via this value. [UNTESTED ON DEVICE] */
let quietRefreshInFlight: Promise<QuietRefreshOutcome> | null = null;
export async function refreshPositionIfPermitted(): Promise<QuietRefreshOutcome> {
  if (quietRefreshInFlight !== null) return quietRefreshInFlight;
  const run = (async (): Promise<QuietRefreshOutcome> => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return 'no-permission';
      if (!(await Location.hasServicesEnabledAsync())) return 'no-services';
    } catch {
      return 'failed'; // display only
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const native = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      });
      // Apply the fix whenever it lands — even after the timeout below gave up waiting.
      const applied = native.then((loc) => {
        lastFixMs = loc.timestamp;
        lastLat = loc.coords.latitude;
        lastLon = loc.coords.longitude;
        emit();
        return 'fixed' as const;
      });
      applied.catch(() => { /* display only */ });
      const timeout = new Promise<'failed'>((resolve) => {
        timer = setTimeout(() => resolve('failed'), QUIET_REFRESH_TIMEOUT_MS);
      });
      return await Promise.race([applied, timeout]);
    } catch {
      return 'failed'; // display only
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  })();
  quietRefreshInFlight = run.finally(() => { quietRefreshInFlight = null; });
  return quietRefreshInFlight;
}
```
(`refreshPositionOnce` directly above stays byte-identical; `lastFixMs/lastLat/lastLon/emit` are the
module's own, lines 105-107/152. `Promise.race` of `applied` (typed `Promise<'fixed'>`) and
`timeout` (`Promise<'failed'>`) is `Promise<'fixed' | 'failed'>` — assignable. If tsc complains about
`timer` being narrowed to `null` in the `finally`, declare it as
`let timer: ReturnType<typeof setTimeout> | null = null as ReturnType<typeof setTimeout> | null;` —
report which form you needed.)

### 3. EDIT `app/src/ui/RecordScreen.tsx`

(a) The react-native import line starts `import { Alert, Animated, BackHandler,` — insert
`AppState, ` after `Animated, ` so it reads `import { Alert, Animated, AppState, BackHandler, …`.
(Brief 08 removes `Linking` from the same line; irrelevant to this anchor.)

(b) In the `from '../location'` import list, the two lines
```ts
  refreshPositionIfPermitted,
  refreshPositionOnce,
```
stay as they are (the function keeps its name; only its return type changed). Add, after the
`import { effectiveFromId, … } from './recordFlow';` line:
```ts
import { nextPollDelayMs, restartsBudget } from '../location/positionRetryPolicy';
```
(Brief 08 removes `statusItemsFor` from that `./recordFlow` import — anchor on the
`from './recordFlow';` tail, not the full list.)

(c) Replace the mount-read block — the five comment lines starting
`  // WP-D Piece B: a non-prompting position refresh on mount, so a returning` through
`  useEffect(() => { void refreshPositionIfPermitted(); }, []);` — with:
```tsx
  // WP-D Piece B: a quiet position read on mount, so a returning user sees
  // the rider dot on the setup map without pressing RECORD first —
  // refreshPositionIfPermitted CHECKS permission + services and never
  // triggers an OS prompt or the Play Services dialog just from opening this tab.
  // virgin-cycle20 brief 11 (Nathan, 2026-10-02): and it keeps trying. The read
  // used to run exactly once per mount; with location off at that moment the
  // failure was swallowed and the DETECTED START pill stayed dead until a tab
  // switch or a restart. Now: (1) again whenever the app returns to the
  // foreground (Settings → enable → back), with the poll budget restarted;
  // (2) a bounded quiet poll while this screen is in setup/armed and no
  // position is known — positionRetryPolicy.ts owns the schedule (2-5 s steps,
  // 60 s budget, ≤ maxReadsPerBudget() reads); (3) RECORD press restarts the
  // budget (onRecord). The poll stops through the status subscription above
  // (any fix, from any source) or when the phase leaves setup/armed or the
  // screen unmounts (tab switch — App.tsx renders tabs conditionally). The
  // quick-settings shade never backgrounds the app, which is why (1) alone
  // is not enough. Non-prompting by construction: nothing here can request
  // a permission. [UNTESTED ON DEVICE]
  useEffect(() => { void refreshPositionIfPermitted(); }, []);
  const [pollEpoch, setPollEpoch] = useState(0); // bump = restart the poll budget
  const noFix = status.lastLat === null || status.lastLon === null;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void refreshPositionIfPermitted();
      if (restartsBudget('app-active')) setPollEpoch((e) => e + 1);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!noFix) return;
    if (phase !== 'setup' && phase !== 'armed') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAtMs = Date.now();
    let attempt = 0;
    const schedule = () => {
      const delay = nextPollDelayMs({ phase, hasFix: false, elapsedMs: Date.now() - startedAtMs, attempt });
      if (delay === null) return;
      timer = setTimeout(() => {
        timer = null;
        if (cancelled) return;
        attempt += 1;
        void refreshPositionIfPermitted().then((outcome) => {
          if (cancelled || outcome === 'fixed') return; // 'fixed' → status update → noFix flips → cleanup
          schedule();
        });
      }, delay);
    };
    schedule();
    return () => { cancelled = true; if (timer !== null) clearTimeout(timer); };
  }, [phase, noFix, pollEpoch]);
```
(`phase` is `useState<RecordPhase>('setup')` declared well above this block; `status` is the
`useState<TrackerStatus>` at ~187. `hasFix` is passed as `false` because the effect only runs while
`noFix`; the policy still guards it for other callers/tests.)

(d) In `onRecord`, directly BEFORE the two comment lines
```ts
      // Permissions move up to RECORD (armed press) so the OS dialogs happen
      // at the kerb, not on the bike — START (below) re-checks, idempotently.
```
(the first occurrence, inside `onRecord`'s `try {`) insert:
```ts
      // virgin-cycle20 brief 11: a RECORD press restarts the quiet-read budget
      // (the GPS-off flash → rider enables location → the pill lights up by
      // itself). The post-permission refreshPositionOnce() below is unchanged.
      if (restartsBudget('record-press')) setPollEpoch((e) => e + 1);
```
(`onRecord` is a `useCallback(…, [])`; `setPollEpoch` is a stable setter, so the empty deps stay
honest. Brief 08 rewrites the `if (outcome === 'denied' || …)` block AFTER these comment lines and
the no-sport guard BEFORE `setBusy(true)`; the two comment lines themselves are not in 08's edit
list. If they are gone, stop and report.)

### 4. NEW `app/tests/positionretry_suite.ts`

```ts
/**
 * virgin-cycle20 brief 11 — auto-detect START keeps trying after location
 * comes on late. The pure schedule (positionRetryPolicy.ts) is tested in full;
 * the two wiring facts a phone would otherwise be needed for are source pins:
 * the quiet read passes mayShowUserSettingsDialog:false and checks services
 * first, and RecordScreen wires AppState + the poll + the RECORD restart.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import {
  maxReadsPerBudget, nextPollDelayMs, pollDelayFor, restartsBudget,
  POLL_BUDGET_MS, POLL_DELAYS_MS, QUIET_REFRESH_TIMEOUT_MS,
} from '../src/location/positionRetryPolicy.ts';

const SRC = (rel: string) => fs.readFileSync(path.resolve(TESTS_DIR, '..', 'src', rel), 'utf8');

test('positionretry: delays back off 2,2,2,3,3,5 then hold at 5 s', () => {
  assert(POLL_DELAYS_MS.join(',') === '2000,2000,2000,3000,3000,5000', `table changed: ${POLL_DELAYS_MS.join(',')}`);
  for (let i = 0; i < POLL_DELAYS_MS.length; i++) assert(pollDelayFor(i) === POLL_DELAYS_MS[i], `attempt ${i}`);
  assert(pollDelayFor(6) === 5000 && pollDelayFor(40) === 5000, 'past the table it holds the last entry');
  assert(pollDelayFor(-3) === 2000 && pollDelayFor(1.7) === 2000, 'defensive on odd attempt values');
});

test('positionretry: polls only in setup/armed, only without a fix, only inside the budget', () => {
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: 0, attempt: 0 }) === 2000, 'setup, no fix → first delay');
  assert(nextPollDelayMs({ phase: 'armed', hasFix: false, elapsedMs: 10_000, attempt: 4 }) === 3000, 'armed polls too (the armed screen names the start place live)');
  assert(nextPollDelayMs({ phase: 'running', hasFix: false, elapsedMs: 0, attempt: 0 }) === null, 'running: the ride feed owns the position');
  assert(nextPollDelayMs({ phase: 'ending', hasFix: false, elapsedMs: 0, attempt: 0 }) === null, 'ending: nothing to detect');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: true, elapsedMs: 0, attempt: 0 }) === null, 'a known position ends the poll');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: POLL_BUDGET_MS, attempt: 9 }) === null, 'budget spent → stop');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: POLL_BUDGET_MS - 1, attempt: 9 }) === 5000, 'one ms inside the budget still schedules');
});

test('positionretry: battery ceiling — at most 15 quiet reads per 60 s budget', () => {
  assert(POLL_BUDGET_MS === 60_000, `budget is ${POLL_BUDGET_MS}`);
  const n = maxReadsPerBudget();
  assert(n === 15, `expected 15 reads per budget (17 s for the first 6, then 5 s steps), got ${n}`);
  // and the simulated run really spans the budget rather than stopping early
  let t = 0, k = 0, d: number | null;
  while ((d = nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: t, attempt: k })) !== null) { t += d; k += 1; }
  assert(t >= POLL_BUDGET_MS && t < POLL_BUDGET_MS + 5000, `last read lands at ${t} ms`);
});

test('positionretry: a fix arriving mid-run stops the very next tick', () => {
  // the screen reads hasFix from the status subscription on every schedule()
  assert(nextPollDelayMs({ phase: 'setup', hasFix: false, elapsedMs: 4000, attempt: 2 }) === 2000, 'before the fix');
  assert(nextPollDelayMs({ phase: 'setup', hasFix: true, elapsedMs: 4000, attempt: 2 }) === null, 'after the fix');
});

test('positionretry: app-active and RECORD press restart the budget; the native wait is capped', () => {
  assert(restartsBudget('app-active'), 'returning from Settings restarts the budget');
  assert(restartsBudget('record-press'), 'RECORD restarts the budget');
  assert(restartsBudget('mount'), 'mount is its own fresh budget');
  assert(QUIET_REFRESH_TIMEOUT_MS === 20_000, `timeout ${QUIET_REFRESH_TIMEOUT_MS}`);
  assert(QUIET_REFRESH_TIMEOUT_MS < POLL_BUDGET_MS, 'one hung read can never eat the whole budget');
});

test('positionretry: location/index.ts quiet read never prompts (services check first, no settings dialog, shared in-flight)', () => {
  const src = SRC('location/index.ts');
  const start = src.indexOf('export async function refreshPositionIfPermitted');
  assert(start > 0, 'refreshPositionIfPermitted missing');
  const body = src.slice(start, src.indexOf('export async function stopTracking', start));
  assert(body.includes('Location.getForegroundPermissionsAsync()'), 'permission is CHECKED');
  assert(!body.includes('requestForegroundPermissionsAsync') && !body.includes('requestBackgroundPermissionsAsync'), 'never REQUESTED');
  assert(body.includes('Location.hasServicesEnabledAsync()'), 'services are checked before any fix request');
  assert(body.includes('mayShowUserSettingsDialog: false'), 'the Play Services settings dialog is suppressed (expo default is true)');
  assert(!body.includes('enableNetworkProviderAsync'), 'no network-provider prompt either');
  assert(body.includes('QUIET_REFRESH_TIMEOUT_MS'), 'the native wait is capped');
  assert(src.includes('let quietRefreshInFlight'), 'one shared in-flight promise');
  assert(body.includes("return 'no-services'") && body.includes("return 'no-permission'"), 'outcomes reported, not swallowed');
  // the old one-shot (onRecord's post-permission read) is untouched
  assert(src.includes('export async function refreshPositionOnce(): Promise<void>'), 'refreshPositionOnce unchanged');
});

test('positionretry: RecordScreen wires AppState active, the bounded poll and the RECORD restart', () => {
  const src = SRC('ui/RecordScreen.tsx');
  assert(/import \{[^}]*\bAppState\b[^}]*\} from 'react-native'/.test(src), 'AppState imported from react-native');
  assert(src.includes("from '../location/positionRetryPolicy'"), 'policy imported');
  assert(src.includes("AppState.addEventListener('change'"), 'foreground listener present');
  assert(src.includes("restartsBudget('app-active')"), 'app-active restarts the budget');
  assert(src.includes("restartsBudget('record-press')"), 'RECORD press restarts the budget');
  assert(src.includes('nextPollDelayMs({ phase, hasFix: false, elapsedMs: Date.now() - startedAtMs, attempt })'), 'the poll asks the policy');
  assert(src.includes('}, [phase, noFix, pollEpoch]);'), 'poll effect keyed on phase, fix presence and the epoch');
  assert(src.includes("if (phase !== 'setup' && phase !== 'armed') return;"), 'no poll outside setup/armed');
  assert(src.includes('useEffect(() => { void refreshPositionIfPermitted(); }, []);'), 'the mount read stays');
  assert(!src.includes("refreshPositionIfPermitted(); }, [phase"), 'the mount read is not itself re-keyed');
  // never a prompting call from the screen's retry paths
  const n = (src.match(/refreshPositionIfPermitted\(\)/g) ?? []).length;
  assert(n === 3, `expected exactly 3 quiet-read call sites (mount, app-active, poll), got ${n}`);
});
```

### 5. EDIT `app/tests/run.ts`

After the line `import './lockscreen_suite.ts';` add `import './positionretry_suite.ts';`.

## Verification plan

1. **Failed-before artifact.** Before editing anything else, create §4's suite and register it
   (§5) and run `cd app && node --experimental-strip-types tests/run.ts` → the run must fail to
   import `../src/location/positionRetryPolicy.ts` (module not found) — report the error line. Then
   temporarily comment out the policy import + tests 1-5 and run again → tests 6 and 7 must FAIL
   (`mayShowUserSettingsDialog: false` missing; `AppState` not imported). Report both lines, restore
   the file, then do §1 → §2 → §3.
2. `cd app && node --experimental-strip-types tests/run.ts` — expect **0 FAIL**, total = (the count
   after briefs 06 and 08 landed) + 7, 3 skip. Report the exact summary line and the per-test
   `PASS positionretry:` lines (7 of them).
3. `cd app && ./node_modules/.bin/tsc --noEmit` — clean, exit 0 (report any `timer` narrowing form
   you needed in §2(b)).
4. `timeout 40 grep -n "mayShowUserSettingsDialog\|quietRefreshInFlight\|hasServicesEnabledAsync" app/src/location/index.ts`
   → `mayShowUserSettingsDialog: true` once (startTracking, untouched) and `: false` once; the
   in-flight let + its uses; `hasServicesEnabledAsync` in `ensurePermissions` and in the quiet read.
   `timeout 40 grep -n "refreshPositionIfPermitted\|setPollEpoch\|AppState" app/src/ui/RecordScreen.tsx`
   → 1 import line, 3 call sites, 1 declaration + 2 bumps, the RN import + listener.
   `timeout 40 grep -n "expo\|react-native" app/src/location/positionRetryPolicy.ts` → nothing.
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows, besides what 06/08 and the pre-existing
   `M scripts/OTA-TROUBLESHOOTING.md` / untracked `cycles/…`, `marketing/…` changed, exactly:
   `M app/src/location/index.ts`, `M app/src/ui/RecordScreen.tsx`, `M app/tests/run.ts`,
   `?? app/src/location/positionRetryPolicy.ts`, `?? app/tests/positionretry_suite.ts`.
6. Inspect (fresh Opus): reruns 1-5; reads the `RecordScreen.tsx` diff against Decisions 3-4
   (cleanup clears the timer; no poll effect without the phase guard; `refreshPositionOnce` call in
   `onRecord` still there, after `ensurePermissions`); reads §2(b) for the race: a native resolve
   after the timeout still sets `lastLat` and emits; `quietRefreshInFlight` is reset in every
   outcome; `recordFlow.ts`, `App.tsx`, `settings.tsx`, `catalog.ts` byte-identical
   (`git diff --stat` lists none of them beyond 06/08's own edits).

## Interplay with briefs 06 and 08 (both land BEFORE this one)

- **Brief 06** edits `RecordScreen.tsx` only around the self-track loader (`loadSelfTracks` effect,
  ~1084-1095 at HEAD, plus an added preload near it) and the `../location`-unrelated imports at
  line 47. None of this brief's four anchors (RN import line, `./recordFlow` import tail, the
  `WP-D Piece B` mount block at ~323-328, the two `Permissions move up to RECORD` comment lines in
  `onRecord`) are in 06's edit list.
- **Brief 08** edits: lines 102-104 (flash constants), 189-193 (`problem`/`recovered` state), the
  recovery mount effect (~381-432), `onRecord` 527-532 (the `if (outcome === …)` block — AFTER this
  brief's (d) anchor), `onStart` 574-579, `problemStates`, `yellowSub`, the `Linking` import, the
  `'START NOT DETECTED — PICK ONE'` label → `'START NOT DETECTED'`, `recordFlow.ts` (`statusItemsFor`
  removed, `recordPressAction` reshaped) and `location/index.ts` (adds `dropStaleSession` after
  `stopTracking`, one string). It changes the no-sport guard at the top of `onRecord` (before
  `setBusy(true)`), not the comment lines this brief anchors on. In `index.ts` 08's `dropStaleSession`
  sits AFTER `stopTracking`, so test 6's slice `refreshPositionIfPermitted … stopTracking` is
  unaffected. If 08 changed the `refreshPositionIfPermitted` doc comment or body — it should not —
  stop and report.
- Test counts are additive: this brief is +7 on whatever 06 and 08 left.

## On-device checklist — Nathan, after the OTA (JS-only; no new build)

Prep: Settings → "Start place" = auto. Stand inside a known place's radius (home).
1. **Location OFF, cold open.** Turn location off in the shade, open Qualifire on RECORD. Expect:
   **no** Google "turn on location?" dialog (today one may appear — say if you still see it), label
   `START NOT DETECTED`. Wait ~5 s, nothing changes (correct: location is off).
2. **Shade toggle, stay on RECORD.** Pull the shade, turn location ON, close the shade, do not
   touch the app. Within ~2-10 s the label flips to `DETECTED START` and the home pill lights up.
   (Fused/network fix; indoors can be slower — note the delay.)
3. **Settings toggle.** Location OFF again, kill and reopen the app, then go to Android Settings →
   Location → ON → back to Qualifire. Expect the pill within ~2-5 s of returning.
4. **Tab switch.** Location OFF, open app, go to ACTIVITIES, turn location ON in the shade, come
   back to RECORD: the pill appears (remount read + poll).
5. **Budget.** Location OFF, open app, wait > 60 s, then turn location ON and do nothing: the pill
   does NOT appear (budget spent — expected). Press RECORD once (you get the GPS-off flash only if
   still off; otherwise it arms) — or just return from another tab/app: the pill appears.
6. **Manual pick wins.** Location OFF, open app, tap `work`, turn location ON: `work` stays
   selected (N5), the home pill shows a `✓` only. Tap `home` to take the detection.
7. **Permission denied first.** Revoke the location permission (app info → Permissions → Location →
   Don't allow), open the app → `START NOT DETECTED`, no prompt. Press RECORD → the OS permission
   dialog (as today); deny → GPS/permission flash. Grant it in app info → come back: pill appears
   within a few seconds. (If Android restarted the process on the permission change, that is the
   OS, not the app; the mount read covers it.)
8. **Stale fix (known limitation).** With a fix shown, turn location OFF: the detected pill stays
   (last known position, not re-checked). Say if you want it to go grey after N minutes.

## Out of scope

- E4's stale-position-after-location-off (no age check on the setup screen) — unchanged; a design
  call for the coordinator (a `lastFixMs` age threshold on `detected` would be ~3 lines + a test,
  but it also greys the dot on the setup map).
- `onRecord`/`onStart`'s `ensurePermissions` flow and brief 08's flashes.
- Any evented alternative (`watchPositionAsync` on the setup screen): a continuous subscription
  for a screen that may sit open for minutes; rejected on battery grounds.

## Open calls (default chosen — executor does NOT stop for these)

- **A. A pill tapped while detection was dead keeps winning once the late fix lands.** Chosen:
  unchanged (N5: "a tap sticks even if detection later changes"). Nathan can tap the detected pill
  (it shows `✓`). Alternative would be to reset `fromExplicit` when the first fix of the session
  arrives — rejected as a surprise reassignment under the rider's thumb.
- **B. Poll in `'armed'` as well as `'setup'`.** Chosen: yes (the armed line names the start place
  live; RECORD already passed the permission gate there, so a tick is just a fix request).
- **C. `getLastKnownPositionAsync` as a fast path before `getCurrentPositionAsync`.** Chosen: no —
  Balanced already accepts a ≤3 s cached fix (`maxUpdateAge`), and the last-known fix after a
  location toggle is exactly the stale one E4 warns about.

## Report back

- The failed-before lines from Verification 1 (module-not-found; then tests 6/7 failing), the final
  summary line (0 FAIL), `tsc` exit code and any `timer` typing form used.
- The three greps from Verification 4 and the `git status --porcelain` list.
- Any anchor mismatch, verbatim, with the text actually found — and stop there.
- A reminder line for the coordinator: "JS-only; OTA-able; on-device: confirm the Play Services
  dialog no longer appears with location off (E2) and the fix delay after the shade toggle;
  stale-fix-after-location-off unchanged (E4)".
