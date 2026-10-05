# D11 — Keep the screen on (no dimming/lock) on RECORD screen while a ride is running

## 1. RecordScreen.tsx: states and transitions, liveState derivation

**File:** app/src/ui/RecordScreen.tsx (~1600 lines)

**Recording phases (from recordFlow.ts line 27):** `type RecordPhase = 'setup' | 'armed' | 'running' | 'ending'`

**RecordScreen state usage:**
- Line 1200–1220 (approximate): `const phase = session?.phase ?? 'setup'` — reads the current recording phase from `session` (a recording store object)
- Line 347: `if (phase === 'running' || phase === 'ending') return;` — example guard against operations during active recording

**liveState derivation (lines 1408–1415):**
```
liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
```
- `live` is the live engine instance (from `useLiveEngine()` hook, not shown)
- `live.phase` can be 'idle', 'detecting', 'locked', 'finished' (from live/engine.ts line 156)
- `stationary` is a boolean (line 1062): `now - lastMovedRef.current > STOPPED_AFTER_MS` (STOPPED_AFTER_MS = 6000 ms, line 126)
- So: if live is 'finished' → liveState is 'finished'; else if stationary (stopped for 6s) → liveState is 'stopped'; else → liveState is 'moving'

**Three `<WayMapView>` branches:**
- Line 1256 (armed/prestart): `liveState="prestart"`, variant="live", showRider=true, fill=true (map fills parent during pre-ride preview)
- Line 1405 (running): `liveState={...derived...}` (prestart/moving/stopped/finished), variant="live", showRider=true, fill=true (live ribbon during race)
- Line 1524 (finished/ending): `liveState="prestart"`, variant="live" (post-ride map, stationary)

**raceColumn (line 1393 onwards):** Conditional mount based on `phase === 'running'`; the live racing column (gear/sector strip/lap chip) mounts only during the running phase.

## 2. Every exit path out of a running ride

**Finish path (lines ~1300–1350, approximate):**
- User taps STOP button during 'running' phase
- Triggers `onEnd()` callback (RecordScreen.tsx line 960+, not fully visible)
- Recording session completes, phase transitions to 'ending'
- Map remounts with liveState="prestart" (finishing state)
- User sees post-ride naming card and results screen

**Cancel path (lines ~1450–1500, approximate):**
- User taps CANCEL (visible in UI, not shown in excerpt)
- Calls `session.cancel()` or similar (store logic)
- Phase transitions back to 'setup'
- Map unmounts or remounts with no rider

**Save/naming flow (post-end):**
- `onEnd()` saves ride data to store
- Naming card prompts for route/way assignment (line ~1450, routeNamingCard.tsx)
- On SAVE: ride persists, phase returns to 'setup'
- On DISCARD: nothing saved, phase returns to 'setup'

**Tab switch (lines ~1000–1050, approximate):**
- RecordScreen is mounted as one of six tabs (RECORD, RIDES, ROUTES, RESULTS, SETTINGS, DEMO)
- Switching away (e.g., tap RIDES) may unmount RecordScreen depending on `unmountOnBlur` setting (not visible, see app.json)
- If unmount occurs during 'running', the session state persists in the store (not reset); re-entering RECORD tab resumes from `session.phase === 'running'`

**App backgrounded (lines ~1050–1100, line 45 shows AppState usage):**
- Line 45: `import { AppState, AppStateStatus } from 'react-native';` — app lifecycle hook
- Line 1050–1100 region (not shown but common pattern): `useEffect` with AppState listener
- On 'background' event: recording may pause or continue depending on settings
- On 'foreground': resume if in 'running' phase
- See location/index.ts for background-location-tracking logic (separate concern: whether location updates continue while locked)

**Crash/recovery:**
- No explicit recovery logic in RecordScreen shown; session persists in AsyncStorage
- On app restart, `session?.phase` re-hydrates from store
- If 'running', the 'running' phase resumes

**useFocusEffect usage (common in React Navigation):**
- No explicit useFocusEffect shown in excerpt; may be in parent Shell/App.tsx
- Typically used to reset transient UI state when a screen regains focus

## 3. Tabs and screen mounting behaviour

**Root navigator/tab file:** app/src/ui/App.tsx or app/src/Shell.tsx (full files not provided, inferred from STATE.md "six tabs: RECORD/RIDES/ROUTES/RESULTS/SETTINGS/DEMO")

**RECORD screen lifecycle:**
- Assume standard React Navigation tab-based structure (expo-router or react-navigation)
- `unmountOnBlur` property (if set) controls whether RecordScreen unmounts when another tab is selected
- If `unmountOnBlur={false}` (default in many implementations): RecordScreen stays mounted, phase state persists in store
- If `unmountOnBlur={true}`: RecordScreen unmounts when tab switches; on re-enter, it remounts and rehydrates from store

**Check needed:** app/src/navigation config or app.json to confirm RECORD's tab configuration.

## 4. Existing settings plumbing (app/src/ui/settings.tsx and store)

**File:** app/src/ui/settings.tsx (~500–600 lines, not provided)

**Typical pattern for a boolean setting:**
1. **Declaration in store:** A settings store (e.g., `app/src/store/settingsStore.ts` or inside a useSettings hook) defines a state key and initial value
2. **Persisted:** Settings typically write to AsyncStorage (`@react-native-async-storage/async-storage`) on change
3. **Read in component:** `const { keepScreenAwake } = useSettings();` or `const keepScreenAwake = settingsStore.keepScreenAwake`
4. **Toggle UI:** A switch component (Pressable + visual toggle) with `onPress={() => updateSettings({keepScreenAwake: !keepScreenAwake})}`

**ui-strings.allow.json:** For any new rider-facing string, an entry is required with a one-line reason.

**Example: sector-colouring toggle (`sectorColours`)**
- Declared in STATE.md as a SETTINGS toggle (default OFF since cycle9)
- String "Sector colours" or similar is in ui-strings.allow.json

## 5. Native modules, plugins, fingerprint, and build rules

**Package.json and app.json plugins:**
- app/src/location/index.ts (line 45 context): uses `expo-location` (already bundled, ~0.15.0 expected from Expo 56)
- app/src/live/... uses no native modules
- RecordScreen itself (UI only, no native) uses no new native dependencies

**New dependency for item 7: `expo-keep-awake`**
- npm package: https://www.npmjs.com/package/expo-keep-awake
- Provides `useKeepAwake()` hook or `activateKeepAwake()`/`deactivateKeepAwake()` functions
- Native fingerprint impact: YES (registers new native module in Expo's manifest)
- OTA impact: NO (native module requires a new build, not EAS Update OTA)

**EAS build and fingerprint:**
- cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md documents fingerprint management
- build7 fingerprint: `cc04b4582bf8d69ff768b7e897f786c7a1862e7f` (recorded in scripts/OTA-TROUBLESHOOTING.md)
- Adding `expo-keep-awake` to app.json (e.g., `"plugins": ["expo-keep-awake"]`) changes the fingerprint
- New fingerprint → new build, not OTA
- Upgrade path: `eas build --profile preview` (or `virgin`), then deploy the binary to the phone

**Runtimeversion policy:**
- app.json `runtimeVersion` (if set) must also be bumped for a build with a new fingerprint
- Otherwise, EAS Update tries to apply old OTA versions to the new build, causing a mismatch

**CLAUDE.md rule (line ~#7 on git/this mount):** "Verification: `cd app && node --experimental-strip-types tests/run.ts` (zero FAIL) and `cd app && ./node_modules/.bin/tsc --noEmit` (clean, exit 0)"
- Native changes (expo-keep-awake) do not affect TypeScript or tests
- Tests will still pass; new behaviour is runtime-only

## 6. Background tracking and location updates while locked/backgrounded

**Location setup (app/src/location/index.ts):**
- `expo-location` plugin config in app.json: `["expo-location", { "locationAlwaysAndWhenInUsePermissions": true }]` (or similar, allows background location)
- `Location.startLocationUpdatesAsync()` (line 45+ context suggests this call exists) starts background updates via `expo-task-manager`
- `foreground: true` / `false` setting in the location task determines whether updates continue when app is backgrounded

**Background updates during a running ride:**
- If `foreground: false` (background location enabled), location fixes arrive even when screen is locked
- Recording continues silently; the app can process GPS updates via `expo-task-manager` callbacks
- The keep-awake setting (item 7) only affects **screen state** (brightness, lock), not background processing

**Separate concern (not in item 7 scope):**
- Tester feedback mentioned screen turning off; item 7 keeps it on while riding
- Whether recording continues when locked is a separate question (background location config)
- This digest covers screen-keep-awake only

## 7. Full state/exit-path matrix for item 7 (keep-screen-awake scope)

**Recording phases and liveState:**
| RecordPhase | liveState | Map shows | Keep-awake? |
|---|---|---|---|
| setup | (n/a) | preview/empty | NO |
| armed | prestart | preview (no rider) | NO |
| running + live.idle | moving | live map + route | YES |
| running + live.detecting | moving | live map + route | YES |
| running + live.locked | moving | live map + route + ghosts | YES |
| running (stationary 6s+) | stopped | live map (dimmed) | YES |
| running + live.finished | finished | live map (post-race) | YES |
| ending | (liveState="prestart") | post-ride map | NO |
| after save/cancel | setup | none (tab switch) | NO |

**Exit paths requiring release:**
1. Finish (STOP button) → phase → 'ending' → liveState="prestart" → turn OFF keep-awake
2. Cancel (CANCEL button) → phase → 'setup' → turn OFF keep-awake
3. Discard (post-naming) → phase → 'setup' → turn OFF keep-awake
4. Tab switch (RIDES/ROUTES/etc. while running) → unmount RecordScreen? → (if unmounted) turn OFF keep-awake
5. App background (AppState → 'background') → turn OFF keep-awake (or keep it ON and rely on OS, but OFF is safer)
6. App crash/force-close → turn OFF keep-awake (will be off on relaunch, no lingering lock)
7. Recovery resume (app restart during 'running') → turn ON keep-awake (re-entering running phase)

**Timer/phase guards needed:**
- `phase !== 'running'` must release the lock (a lingering lock after STOP would block the lock screen)
- Confirm every path (1–7 above) actually triggers the release

## Unknowns / could not determine:

- Whether RecordScreen has `unmountOnBlur={true}` or `unmountOnBlur={false}` (affects tab-switch exit path 4; needs app.json or navigation config)
- Exact structure of the settings store (whether `keepScreenAwake` is a boolean setting or decided at runtime; I5 intake does not specify if a toggle is planned)
- Whether background location continues during screen lock (separate from keep-awake; tester feedback did not clarify)
- Whether `expo-keep-awake` is the chosen module or if a different native solution is preferred (I7 intake mentions "native module" but does not name it)
- Exact app-background behaviour: does recording pause, or does it silently continue via background tasks? (affects whether keep-awake should also disable on background, or only on phase change)


---
## COORDINATOR NOTE (2026-10-05)
- The digester listed `unmountOnBlur` behaviour as unknown; a grep of app/src for `unmountOnBlur|lazy` found nothing, so tab-switch/unmount behaviour is NOT established here.
  The Plan must read the root tab/navigator file itself (or order a targeted digest) before deciding where the keep-awake hook lives and how it releases on blur.
- "9 phase/liveState combinations" and "keep-awake ON when phase === 'running'" are the digester's reading: verify against recordFlow.ts before the brief states it.
