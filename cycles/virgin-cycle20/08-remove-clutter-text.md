# 08 — Remove the clutter text (CLUTTER-REVIEW §1 decisions + Nathan's §2 answers)

**Source: Nathan, 2026-09-30 → 2026-10-02** — the clutter audit (`CLUTTER-AUDIT.md`, his inline
`Feedback:` / `*` answers) and its review (`CLUTTER-REVIEW.md`: §1 settled rows; §2 questions, now
**answered by Nathan on the `Answer:` lines**). This brief implements every §1 row and every §2 answer.
§Decisions (Nathan's answers) below is the binding reading of those answers; the executor re-reads
the `Answer:` lines first and stops if one no longer matches its row.

**Status: brief only. Nothing below is in the app.** Written 2026-10-02 (revised the same day after
Nathan's answers) by the Plan tier (Fable) against the working tree (branch `virgin`, HEAD `ae911bb`;
784 tests / 781 pass / 0 fail / 3 skip at HEAD; only docs are modified in the tree). Executor: Sonnet,
cold, this file only.

**Sequencing (binding): run AFTER briefs 04 (PAUSE sub-text), 05 (ride → activity wording) and
01/03 (notification) have landed.** This brief edits the same files and several of the same strings.
Every anchor below is therefore the **post-05 text** (the "ride"→"activity" form); where 05 changed
a line this brief also touches, both forms are given and the executor must find the post-05 one. If
the pre-05 form is what the tree holds, **05 has not landed — stop and report**, do not execute.
Line numbers are HEAD `ae911bb` values for orientation only; **find the quoted text, never count
lines.**

## Decisions (Nathan's answers to CLUTTER-REVIEW §2) — check the `Answer:` lines before executing

| # | Review Q | Nathan's answer (paraphrased) | Implemented as | Where |
|---|---|---|---|---|
| D1 | Q1 | "agree with the default to remove all" | Every edge-case text removed, nothing shown: "no activities on file yet", the free-activity sentence, "sector times not on file…", "matching ways…", "Loading…", "no way — recorded only" (both screens), ReplayScreen's "no replay — …" **and the Replay button hidden** for such activities, GateAdjust "cannot be edited" text (EDIT GATES is already hidden without a draft — Evidence), "not ranked" divider | §Files 4, 5, 6, 7, 8 |
| D2 | Q2 | "is there a way for me to force this so I could test it? … only allow to save it as a free ride, so it does not count for any official route" | No dialog, no new text: an interrupted recording is finalised on the next launch **and filed as a free activity** (route-less, never ranked, never matched to a way). Force-test recipe in the checklist (item 8) | §Files 3.1, Decision 5 |
| D3 | Q3 | "lets keep this for now" | "last {N} on this way" stays | §Files 4 |
| D4 | Q4 | "show the 'No sport configured yet' text for a second, then force the user to the settings tab" | The inline first-sport form (`FirstSportPrompt`, "YOUR FIRST SPORT", "with this sport", "no sport yet", "SET UP A SPORT FIRST — PRESS RECORD") goes. RECORD with zero sports flashes `No sport configured yet` under RECORD for 1 s, then switches to the SETTINGS tab (its SPORTS section adds the first sport — verified). The RESULTS/ACTIVITIES/ROUTES badge stays `NO SPORT YET · ADD ONE IN SETTINGS` (now accurate; dash → dot) | §Files 3.5, 9, Decision 2 |
| D5 | Q5 | "keep it for 5 seconds then" | Permission flashes hold **5 s** (then the 0.4 s fade). The GPS-off flash keeps its own 2 s constant (the hold is a per-call parameter now — Decision 1), so only the permission messages change. (a) denied → `Location permission not granted` on RECORD/START press, START stays blocked; (b) foreground-only → `Allow location all the time` on START press, recording proceeds (shown in the running screen's status slot — Decision 3); (c) no tap-to-settings | §Files 3.2 |
| D6 | Q6 | "agree remove it still" | "personal best sectors" section AND its data (`pbSectors` in `buildPbDetail`, type, tests) removed | §Files 4, 5, 12 |
| D7 | Q7 | "remove the Qualifire name from the notification title … all of them are extra clutter … remove them all together" | (1) Notification title = `Recording activity` (05's noun, capital R, no app name). (2) Every surviving em-dash string is **removed, not re-punctuated**: a pure caption is deleted; a control label keeps the control and its first clause. Per-item list in §Files 11. Lone `—` placeholders (unranked rows) stay. `Alert.alert` dialog prose is not screen text and is left alone (Decision 10) | §Files 11 |
| D8 | Q8 | "dont care about demo, it is not a real feature" | DemoScreen **texts untouched** (both "demo · …" lines stay), except the already-settled §1 row `Not part of the final app — …` → ` · `. Its `settings.liveMap` / `settings.tower` reads are hard-wired (code, not text — forced by the removal of those settings) | §Files 8 |
| D9 | Q9 | "agree on the first one as it is concise. The two other propositions … whole text should be removed" | `Ride saved — 12:34. Find it in Rides.` → **`Activity saved · 12:34`** (no "Find it in…"; same form on the ending screen); `‹ cancel — back to setup` → `‹ cancel`; `SET UP A SPORT FIRST — PRESS RECORD` → gone with the old no-sport flow; gate card `Sector gates — proposed` → header deleted, `discard nudges — keep the proposal` → `discard nudges` | §Files 3.5, 11 |
| D10 | Q10 | "hint text" | `Sector colours` label unchanged; its **hint** becomes `Colour sectors on live map` | §Files 2.5 |
| D11 | Q11 | "one combined file is better" | One `Export app` row → one `qualifire-export-YYYYMMDD.json` (catalog + reference lines) | §Files 2.6 |

If any `Answer:` line in `CLUTTER-REVIEW.md` §2 now reads differently from the paraphrase above
(Nathan edits the file), **STOP and report** which question and what it says.

Two decisions the coordinator asked this brief to make (not review questions):
- **Live map / Rankings settings — removed from the `Settings` type with an on-load scrub**, not left
  as unused fields. Reason: the repo already does exactly this for retired keys (`redLight`,
  `timing` — `settings.tsx` `SettingsProvider` load effect), and removing the field makes `tsc` fail
  on any consumer this brief missed — a free blast-radius check. Old `settings.json` files with the
  keys still load (the keys are deleted before `setS`). Stored-key compatibility is therefore kept.
- **`statusItemsFor` (recordFlow.ts) is removed with its test** — it existed only to order the two
  status lines this brief deletes; keeping a dead export would contradict "remove display code that
  becomes dead". Likewise `recordPressAction` shrinks to the two actions that remain (Decision 2).

## What this changes on the phone — and what it does not

- **RECORD (setup, no sport yet):** no form, no label, no sub-label text. Pressing RECORD flashes
  `No sport configured yet` under RECORD for 1 s and the app switches to SETTINGS, where the SPORTS
  card (second card, no scrolling) has the "add sport" box. RECORD's sub-label otherwise reads the
  slogan `same activity · new meaning` as today.
- **RECORD (setup):** no "Ready to record." line; no "your pick is locked for this activity"; start
  label `START NOT DETECTED` (no "— PICK ONE"); after STOP the setup screen reads `Activity saved · 12:34`.
- **RECORD (armed):** START carries only the word START (sub-label empty unless flashing); the line
  above the map reads `Home → Work · Dry` (no "· ready — not started"); `‹ cancel`. **No permission
  banner.** Pressing START with location permission denied flashes `Location permission not granted`
  under START (5 s hold, 0.4 s fade) and does not start — as today minus the banner.
- **RECORD (setup) permission:** pressing RECORD with permission denied flashes the same text under
  RECORD for 5 s and stays in setup. GPS-off flash unchanged (2 s).
- **RECORD (running):** the status slot under the sector pane shows `GPS LIVE` while a fix is ≤ 5 s
  old and **nothing** otherwise (no "waiting for first GPS fix…", no "last fix…", no route/way lines,
  no rotation, no pin). If START was pressed with foreground-only permission, that slot first shows
  `ALLOW LOCATION ALL THE TIME` for 5 s, fades, then behaves as above; recording runs as today. No
  "Recovered after relaunch…" / "Recording continued…" amber lines any more (recovery itself is
  unchanged). A storage problem still shows `3 STORAGE ERRORS` (without the "— last: …" tail).
  Ending screen: `Activity saved · 12:34`.
- **Interrupted recording (app force-stopped mid-activity, service dead):** on the next launch
  RECORD finalises it silently **as a free activity** — it appears in ACTIVITIES under FREE
  ACTIVITIES, is never matched to a way, never ranked, never in RESULTS; the setup screen shows
  `Activity saved · <elapsed>`. No dialog. (While the service survived a swipe-away, the live screen
  resumes as before — now without the amber line.)
- **ACTIVITIES list:** no "matching ways…", no "Loading…"; an activity without a way shows just its
  date line; empty state `No activities yet`; badge `NO SPORT YET · ADD ONE IN SETTINGS`; a reference
  activity's row title reads `Home → Work · ref` (the dash gone, the marker kept — Decision 9).
- **Activity detail:** the "ON THIS WAY" block shows `last N on this way` + ranking rows only; rank
  lines are the bare status (`not ranked`, `no rank`, `too few to rank`, `no time`, `no lap`); the
  free-activity card has no "no lap, no sectors…" line; the unmatched card has no "no way — recorded
  only" / "sector times not on file" lines; the reference card shows the way label and `ref` on its
  own line (the "this activity is the reference … no lap time" sentence is gone). **Replay** button
  appears only when the activity actually crossed START on its way (after a short load); rankings
  are always shown.
- **Replay:** blank map area instead of "loading replay…"; the never-crossed case is unreachable
  from the button and renders just `‹ BACK`.
- **RESULTS:** badge `NO SPORT YET · ADD ONE IN SETTINGS`; empty state `NO RESULTS YET`; detail:
  rankings always on, no "not ranked" divider (unranked rows keep `—`).
- **ROUTES:** badge as above; way detail → EDIT GATES: card header is the way label alone, one line
  `Tap a gate to move it`, `discard nudges`; the post-activity proposal card has **no header**, the
  same `Tap a gate to move it` line, `discard nudges`; naming card: `New route`, the explanatory
  sentences lose their "— this activity becomes its reference" tails, `SPECIFICATIONS (optional)` /
  `(required)`, the duplicate line stops at the names.
- **SETTINGS:** no `?` on Active sport, Theme, Auto day/night, Start place, Export, Reset; "Sport
  picker on RECORD" → **Choose sport at start** (no hint); **Live map row gone** (map always on);
  `Sector colours` keeps its label, hint `Colour sectors on live map`; "Race your past activities" →
  **Race yourself** with hint `Race *selfs* dots on live map` (selfs italic); Gate buzz untouched;
  **SCORING section gone** (Rankings always on); DATA = **Export app** + **Reset app** only; the sport
  row no longer shows "… — delete those first" under a disabled delete (the counts are already on
  the row; "switch to another sport first" stays).
- **DEMO:** `Not part of the final app · use only for testing features.`; everything else as today
  (map and plot position label always on).
- **Notification title:** `Recording activity` (a JS option of `startLocationUpdatesAsync`).
- **Stays:** every behaviour behind the removed texts (engine lock logic, GPS trouble internals,
  START blocking on denied, backfill matching, ranking colours/ghosts/windows, free rides, recovery
  logging), all storage, every id. No data migration.
- **JS-only → OTA-able.** Files: `src/ui/*.tsx|ts`, `src/location/index.ts` (one string + one small
  export), `tests/`; one file moved to `safe_to_delete/`. Nothing under `modules/`, `android/`,
  `app.json`, `plugins/`, `package.json`. (01/03 force build 8 anyway; this brief's JS rides along in
  build 8 or as a later OTA.)

## Evidence (read 2026-10-02, HEAD `ae911bb`; post-04/05 text noted where it differs)

### RecordScreen.tsx — the GPS-off flash (mechanism being generalised)
- Lines 102-104: `const GPS_OFF_MSG = 'Location (GPS) is turned off';` `const GPS_FLASH_HOLD_MS = 2000;`
  `const GPS_FLASH_FADE_MS = 400;` (doc comment lines 95-101). **One shared hold constant today**,
  used only inside `flashGpsOff` — so the hold becomes a parameter and GPS-off keeps 2 s (D5).
- Lines 484-513:
  ```tsx
    const [gpsFlash, setGpsFlash] = useState(false);
    const gpsFlashOpacity = useRef(new Animated.Value(1)).current;
    const gpsFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashGpsOff = useCallback(() => {
      if (gpsFlashTimer.current !== null) clearTimeout(gpsFlashTimer.current);
      gpsFlashOpacity.stopAnimation();
      gpsFlashOpacity.setValue(1);
      setGpsFlash(true);
      gpsFlashTimer.current = setTimeout(() => {
        gpsFlashTimer.current = null;
        Animated.timing(gpsFlashOpacity, {
          toValue: 0,
          duration: GPS_FLASH_FADE_MS,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return; // a newer press stopped this fade — it owns the state now
          setGpsFlash(false);
        });
      }, GPS_FLASH_HOLD_MS);
    }, [gpsFlashOpacity]);
    useEffect(() => () => {
      if (gpsFlashTimer.current !== null) clearTimeout(gpsFlashTimer.current);
      gpsFlashOpacity.stopAnimation();
    }, []);
    // Sub-label of either yellow button: the GPS-off message while flashing
    // (animated opacity replaces startSub's static 0.75), the caption otherwise.
    const yellowSub = (caption: string) => (
      <Animated.Text style={[styles.bigBtnSub, styles.startSub, gpsFlash ? { opacity: gpsFlashOpacity } : null]}>
        {gpsFlash ? GPS_OFF_MSG : caption}
      </Animated.Text>
    );
  ```
- `problem` state: line 189 `const [problem, setProblem] = useState<PermissionOutcome | null>(null);`
  set at lines 528/532 (`onRecord`) and 575/579 (`onStart`), read ONLY by `problemStates` (1196-1218).
  `onRecord` lines 527-532:
  ```ts
        if (outcome === 'denied' || outcome === 'services-off') {
          setProblem(outcome);
          if (outcome === 'services-off') flashGpsOff(); // virgin-cycle16 05: message in the button, not a banner
          return; // stay in setup
        }
        setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
  ```
  `onStart` lines 574-579 identical except the comment is `// virgin-cycle16 05` and `return;` has no
  trailing comment. **START blocking on `denied` is the `return` in these handlers, not the banner.**
- `problemStates` lines 1193-1218 (two `<View style={styles.warnBox}>` blocks with `Open app settings`
  → `Linking.openSettings()`), rendered at 1234 (armed), 1384 (running), 1502 (setup). `Linking` is
  imported at line 18 and used only there. Styles `warnBox` 1791-1799, `linkBtn` / `linkBtnText`
  (only used in `problemStates`). `styles.warn` is ALSO used by the storage-error line — **keep `warn`**.
- `PermissionOutcome` (`src/location/index.ts` 304-308): `'granted' | 'foreground-only' | 'denied' | 'services-off'`.

### RecordScreen.tsx — the status-line machinery (to be removed)
- Line 38 import: `import { effectiveFromId, endingSlotFor, isFullscreen, liveMapOverlayFor, namingOfferMode, recordPressAction, statusItemsFor, type RecordPhase } from './recordFlow';`
- Lines 91-94 `PIN_MS` (+ doc comment), 106-111 `WRITING_HISTORY_AFTER_FIXES` (+ doc comment).
- Lines 961-962 `const lastFixAgeS = status.lastFixMs != null ? Math.round((now - status.lastFixMs) / 1000) : null;` (**kept** — feeds `gpsLive`).
- Lines 964-1029: from `// Rotating status slot (IDEAS §24)` through `const statusLine = …;` —
  `statusIdx` + interval effect, `gpsTrouble`, `gpsLine`, `wayLocked`, `writingHistory`,
  **`mapOverlay = liveMapOverlayFor(...)` (988-991 — KEEP)**, `wayLine`, `statusItems`, `pinned` +
  two effects, `statusLine`. Grep-verified: none of those names is used elsewhere in the file except
  the render line 1434 `<Text style={styles.trackLine}>{statusLine}</Text>` and its comment 1430-1433.
- `recordFlow.ts` 95-103 `export function statusItemsFor(…)` — used only by RecordScreen. Test:
  `tests/recordflow_suite.ts` line 53 `test('recordFlow: statusItemsFor never mentions a raw fixes COUNT and orders trouble-first', () => {` … `});` (ends 77); import line 8 lists it.

### RecordScreen.tsx — recovery (the alert to replace) and free rides
- Lines 381-432: the mount effect `// Relaunch recovery: ride marker on disk from a previous launch?`.
  `if (rec.tracking) { setSession(rec.session); setRecoveredKind(rec.restoration); setRecovered(true); … trail hydration … }`
  (keep, minus the two `setRecovered*` calls). `else { // Service died (OS kill / battery saver). Offer to finalise.` then
  ```tsx
          Alert.alert(
            'Unfinished ride found',
            'The app was closed while a ride was recording and tracking has stopped. Save what was captured?',
            [
              {
                text: 'Save ride',
                onPress: async () => {
                  const sum = await stopTracking();
                  setLastSummary(sum);
                },
              },
              { text: 'Discard for now', style: 'cancel' },
            ],
          );
  ```
  (post-05: `'Unfinished activity found'`, `'… while an activity was recording …'`, `text: 'Save activity'`.)
- `recovered` display: lines 190 `const [recovered, setRecovered] = useState(false);`, 193
  `const [recoveredKind, setRecoveredKind] = useState<'relaunch' | 'remount'>('relaunch');`, 391-392
  setters, `setRecovered(false);` at 603, 683, 921, render 1385-1390, style `recovered:` 1789. Display
  only — `getRecoveryState` logs the `remount` sidecar event itself.
- **How a recovered session is scored, and why it can be forced free in a small change** (read
  `src/location/index.ts`, `src/store/freeRides.ts`, `src/ui/rideHomes.ts`, `RecordScreen.tsx onEnd`):
  - `ensureSession()` (index.ts 157-187) re-arms `liveEngine.start({ pickId: null, wayIds: session.wayIds })`
    on a relaunch; with the service dead **no fix is fed this launch**, so `liveEngine.getState().track`
    is `null` and `stopTracking()`'s `liveEngine.finalize()` finalises an empty engine. `stopTracking`
    (487-516) logs the `end` event, `endRide(rideId)` (seals the JSONL, writes the index entry), clears
    the marker, stops the engine. **It stores no result** — `rememberRide` / `buildRankingReveal` /
    `draftRouteFromRide` are called only by RecordScreen's `onEnd` (617-690), which the recovery path
    never runs.
  - The ONE thing that could later score it against a way is ACTIVITIES' backfill:
    `rideHomes.ts settleRideHomes` (69-114) runs `backfillMissingResults` on every ended ride that
    `!hasWayResult && !isReference && !isFree` (`backfillCandidates`, 60-65), where
    `isFree = freeRideNear(freeRideResults(), startMs) !== null`. A ride already filed free is skipped,
    and step 2 of the same function files whatever is still homeless as free anyway.
  - `markRideFree(rideId, startedAtMs, durationS, sportId)` (`freeRides.ts` 112-122) is the post-ride
    label (idempotent by rideId; a flat cache file; "STRUCTURAL ISOLATION IS THE RULE" header lines
    6-13: a free ride never reaches `ghostsFor()` / `recordedResults()` / the results store).
    RecordScreen already imports it (line 78) and calls it in `onEnd` (674) with
    `effectiveRideSportId(s.sportId, currentSports())` (633). `RideSummary` (index.ts 42-47) is
    `{ rideId, nFixes, startMs, endMs }`.
  - So: `stopTracking()` then `markRideFree(sum.rideId, rec.session.startedAtMs, (sum.endMs - sum.startMs) / 1000, effectiveRideSportId(rec.session.sportId, currentSports()))`
    is the whole change; the list shows it under FREE ACTIVITIES (`rideHistoryModel.ts` matches
    `freeRideNear` on `startMs`). **No fallback to `ignoredFromRanking` is needed** (the stop condition
    the coordinator set does not trigger).
- `stopTracking` tail (index.ts): `await clearSession(); session = null; sessionLoaded = true; liveEngine.stop(); emit(); return summary;`.
  `storage/core.ts` 206: `if (text === null) throw new Error(`endRide: unknown ride ${rideId}`);` —
  the one realistic throw (marker whose ride file is gone); it happens **before** `clearSession`, so
  the marker would stay forever. `clearSession` is imported in index.ts line 32.
  `tests/lockscreen_suite.ts` 68 pins exactly **two** `syncShowWhenLocked();` calls in index.ts.

### RecordScreen.tsx — first-sport flow (to be removed) and tab navigation
- Line 75 `import { FirstSportPrompt } from './firstSportPrompt';`; 81 `import { addSport, effectiveRideSportId, scopeCatalog, setActiveSport, showSportPillRow, wayIdsOfSport } from '../store/sports';`
  (`addSport` is used only by `onFirstSport`); 83 `import { activeCatalog, activeSportId, currentSports, saveSports } from '../store/sportStore';` (`saveSports` also used by the sport-pill switch at 292 — keep).
- 266 `const noSport = currentSports().sports.length === 0;`; 269-271 `firstSportPrompt` / `firstSportText` / `firstSportError` states (+ comment 267-268); 543-560 `const onFirstSport = useCallback(async () => { … }, [firstSportText, onRecord]);` (+ comment 539-542).
- 1534-1554: the C0 block
  ```tsx
          {noSport ? (
            <View style={styles.startFlow}>
              {firstSportPrompt ? (
                <FirstSportPrompt … />
              ) : (
                <Text style={styles.flowLabel}>SET UP A SPORT FIRST — PRESS RECORD</Text>
              )}
            </View>
          ) : (
            <>
  ```
  (its `</>` / `)}` close at 1655-1656 right after the `lastSummary` block).
- 1668-1692 the RECORD button:
  ```tsx
          onPress={() => {
            const action = recordPressAction({ sportCount: currentSports().sports.length, firstSportPrompt });
            if (action === 'arm') void onRecord();
            else if (action === 'add-first-sport') void onFirstSport();
            else setFirstSportPrompt(true);
          }}
        >
          {noSport ? (
            <>
              <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
              {yellowSub(firstSportPrompt ? 'with this sport' : 'no sport yet')}
            </>
          ) : (
            <>
              {/* Record-dot glyph … */}
              <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
              {yellowSub('same ride · new meaning')}
            </>
          )}
  ```
  (post-05: `'same activity · new meaning'`.) `onRecord` (515-537) already guards `if (currentSports().sports.length === 0) return;`.
- `recordFlow.ts` 105-115: `RecordPressAction = 'open-first-sport' | 'add-first-sport' | 'arm'`,
  `recordPressAction({ sportCount, firstSportPrompt })`. Tests `recordflow_suite.ts` 168-205: five
  tests (`fresh install — the first RECORD press opens the first-sport prompt, never navigates`,
  `press 2 saves the typed sport and arms`, `at least one sport always arms`, `a stale prompt flag is
  ignored once a sport exists`, `onFirstSport's save-then-arm sequence …`).
- `firstSportPrompt.tsx` (58 lines) is imported **only** by RecordScreen (grepped `src/ui`, `tests`).
- **Tab navigation:** RecordScreen has `const tabNav = useTabNav();` (162); `TabNav.go(tab: Tab)`
  (`tabNav.tsx` 60) is `setTab` in `App.tsx` (205). `App.tsx` 229 switches screens by `tab`, so
  RecordScreen **unmounts** on `go('settings')` (timers must be cleared on unmount — the flash cleanup
  effect already exists).
- **SETTINGS can add the first sport:** `settings.tsx` `SportsSection` (382-583) renders the add box
  (`TextInput` + `add sport` button → `handleAdd` → `addSport(sf, …)` → `saveSports`) **regardless of
  sport count** (the `sf.sports.map` list is simply empty), with the text "Add at least one sport to
  record. Name it what you like." when none exists (482-485). The section sits second, under
  APPEARANCE (`virgin-cycle14 brief 03: … so a fresh install finds it without scrolling`).

### RecordScreen.tsx — other strings
- 1230-1233 (armed): `<Text style={styles.trackLine}>` / `{landmarkLabel(fromId)} → {landmarkLabel(to)}` /
  `` {route && pickedWay ? ` · ${wayVariantLabel(pickedWay.id, route, pickedWay.specs)}` : ''} · ready — not started `` / `</Text>`
- 1256 `{yellowSub('the clock runs from here')}`; 1259 `<Text style={styles.cancelBarText}>‹ cancel — back to setup</Text>`
- 1286-1288 (ending, post-05): `? 'Activity saved.' // virgin-cycle11 R2: …` / `` : lastSummary ? `Activity saved — ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}.` : 'Activity saved.'} ``
- 1436-1437 `{status.storageErrors} storage errors — last: {status.lastError}`
- 1580 `: 'START NOT DETECTED — PICK ONE')`
- 1641-1643 `<Text style={styles.sub}>` / `your pick is locked for this activity` (post-05) / `</Text>`.
- 1647-1653 (post-05): `{lastSummary ? (` `<Text style={styles.sub}>` `Activity saved — {fmtElapsed(…)}. Find it in Activities.` `</Text>` `) : (` `<Text style={styles.sub}>Ready to record.</Text>` `)}`
- 586 `Alert.alert('No sport set up', 'Add a sport in SETTINGS before recording.');` inside `if (sportId === null) { … return; }` in `onStart`.
- 806-809 `if (draft.existingRouteId && findWayWithSpecs(…)) { Alert.alert('That way already exists', 'Pick it on RECORD next time instead of adding it again.'); return; }`
- `settings.liveMap` ternaries at 1235 (armed), 1396 (running) — each `… : ( <View style={{ flex: 1 }} /> )` — and 1520 (setup, `: null`).
- `bigBtn` (1800-1808) is `height: 150`, centred, `gap: 8` — a missing sub-label just re-centres the word.
- `styles.trackLine` (1764-1772): dim, 12 px, uppercase, centred.

### settings.tsx
- `Settings` interface 29-58 has `tower: boolean;` (31) and `liveMap: boolean;` (32); `DEFAULTS` 61-72 has `tower: true,` (63), `liveMap: true,` (64).
- Load scrub precedent 101-102:
  ```ts
          delete (saved as Record<string, unknown>).redLight; // virgin-cycle7: setting retired; scrub old files
          delete (saved as Record<string, unknown>).timing; // virgin-cycle14 #5: "Luck factor" row retired; scoring is raw-only, scrub old files
  ```
- `Row` props 219-225: `label: string; hint?: string; help: Help; …`; 227 `const hasHelp = props.help.show && props.hint !== undefined && props.hint !== '';`; 247 renders `{props.hint}`. Help-open state keyed by `props.label` (228).
- `shareStoreFile(rel, outName)` 259-274; `dateStamp(nowMs)` 277-281; `USER_CATALOG_FILE = 'catalog.user.json'`, `USER_REFS_FILE = 'refs.user.json'`; `saveTextFile(fileName, mime, text): Promise<SaveGpxResult>` (`ui/saveGpx.ts` 40-44).
- `onResetPress` 350 (post-05): `` … Export anything you want to keep first (ACTIVITIES → Export GPX+, or the two export buttons above).` ``
- Rows (post-05 text):
  - 474 `<Row label="Active sport" hint="Everything on RECORD, ROUTES and ACTIVITIES is scoped to this one." help={help} t={t}>`
  - 536-541 the disabled-delete hint:
    ```tsx
                    {!canDelete ? (
                      <Text style={{ color: t.textDim, fontSize: 11 }}>
                        {isActive
                          ? 'switch to another sport first'
                          : `${usage.routes} route${usage.routes === 1 ? '' : 's'} · ${usage.rides} activit${usage.rides === 1 ? 'y' : 'ies'} — delete those first`}
                      </Text>
                    ) : null}
    ```
  - 571-577 `<Row` / `label="Sport picker on RECORD"` / `hint="Show the sport row on RECORD. Off: switch sports here instead."` / `help={help} t={t} sep` / `>` / `<Switch on={s.showSportPillOnRecord} …`
  - 597 Theme row with `hint="The map and race surface follow it. …"`; 602-603 `<Row label="Auto day/night" t={t} help={help}` / `hint="Day theme inside the window, … Never switches mid-activity — it waits for STOP.">`
  - 627-629 Live map row (`<Switch on={s.liveMap} onToggle={() => set('liveMap', !s.liveMap)} t={t} />`)
  - 630-631 `<Row label="Sector colours" t={t} help={help}` / `hint="Paint each stretch of the route line in the colour its sector earned.">`
  - 634-635 `<Row label="Race your past activities" t={t} help={help}` / `hint="Your previous activities of this route move along the map as small dots, … your position among them right now.">`
  - 645 `<Row label="Start place" hint="Detect where you are when an activity starts, or choose the place yourself." help={help} t={t}>`
  - 651-662 SCORING section (`<Text …>SCORING</Text>`, card, `{/* Cycle 024 (WP-A3) … */}` comment, `<Row label="Rankings" hint="Show where each activity placed … on RESULTS." …>` / `<Switch on={s.tower} …`)
  - 664-699 DATA: `<Row label="Places & routes" …` + hint + Pressable `shareStoreFile(USER_CATALOG_FILE, …)`; `<Row label="Reference activities" …` + hint + Pressable `shareStoreFile(USER_REFS_FILE, …)`; the `{/* WP-Q Part B … */}` comment; `<Row label="Reset app" t={t} sep help={help}` / `hint="Moves every activity, result, … Settings and theme are kept.">`.
- No test reads `settings.tsx` or pins its labels (grepped `tests/`).

### Consumers of the two removed settings
- `settings.liveMap`: `RecordScreen.tsx` 1235, 1396, 1520; `ReplayScreen.tsx` 233-252; `DemoScreen.tsx` 660-676.
- `s.tower` / `settings.tower`: `RideDetailScreen.tsx` 135 `const { s } = useSettings();` (only use) + 532 `showRanking={s.tower}` → `PbDetail` (94-131); `ResultsDetailScreen.tsx` 39 + 72 `const selectedPosLabel = s.tower && selectedBoardRow !== null && selectedBoardRow.pos !== null` + 99 `rankingsOn={s.tower}` → `HistoryBoard` (117-146: `boardCaption(board.total, rankingsOn)`, `{rankingsOn ? board.rows.map(…) : null}`, the `printedNotRanked`/`showSub` "not ranked" divider 128-134, style `notRanked` 191); `DemoScreen.tsx` 794 `selectedPosLabel={settings.tower ? demoPlotPosLabel(plotResults, plotSel) : ''}`.

### Other screens
- `RideDetailScreen.tsx` `PbDetail` 94-131 (see §Files 4); 487 `<Text style={{ color: t.textDim, fontSize: 12.5 }}>{model.rankLine}</Text>`; 547 `<Text style={{ color: t.textDim }}>{wayLabelIn(currentCatalog(), model.referenceOf.id)} — ref</Text>`; 548-550 `<Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>` / post-05 `this activity is the reference for this way — no lap time on file for it` / `</Text>`; 570 post-05 `<Text style={{ color: t.textDim, marginTop: 4 }}>no lap, no sectors — a free activity is not compared to anything</Text>`; 590-591 `<Text style={{ color: t.textDim }}>{pickLabel ?? 'no way — recorded only'}</Text>` / post-05 `<Text style={{ color: t.textDim, marginTop: 4 }}>sector times not on file for this activity</Text>` (`pickLabel` is `useState<string | null>`, 154); 610-614 the Replay button `{replayWayId !== null ? (<Pressable style={styles.exportBtn} onPress={() => setReplaying(true)}><Text style={styles.exportText}>Replay</Text></Pressable>) : null}`; 210 `const replayWayId = model.wayId ?? model.referenceOf?.id ?? null;`; `createExpoFsAdapter` already imported.
- `rideHistoryModel.ts` 281-284 `PbDetailModel`, 296-329 `buildPbDetail` (`// Sector indices …` through `return { ranking, pbSectors };`); 158 `` const wayName = refWay !== null ? `${labelFor(refWay.id)} — ref` : pickLabelFor(m.rideId); `` — the row title is the only place a reference activity's row says it is the reference. Tests: `ridehistory_suite.ts` 345-346 (`pbSectors`), 154 & 233 `'Gym → Home — ref'`; `timing_suite.ts` 222 test `'timing: buildPbDetail orders rides and picks the sector best by the scored clock'` with `pbSectors` asserts at 238-239, 245-246.
- `rideDetailModel.ts` `rankLineFor` 63-86: 68 `if (r.ignored) return 'not ranked — you excluded this activity from ranking';` (post-05), 70 `if (barred) return 'no rank — this lap is excluded from the comparison';`, 83 `` return `${hist.length} activities of history — too few to rank`; `` (post-05), 85 `return r.estimated ? 'no time — an estimated lap never ranks' : 'no lap — a missed gate never ranks';`. Consumers: the detail line (487) and `ReplayScreen.tsx` 225 `` `replay over · ${detail.rankLine || detail.lapLabel}` ``. Pins: `ridedetail_suite.ts` 93 `startsWith('not ranked — you excluded')`, 108, 114, 134 (post-05 `'not ranked — you excluded this activity from ranking'`).
- `RidesScreen.tsx` 33 `const [backfilling, setBackfilling] = useState(false);`, 86 `setBackfilling(true);`, 91-92 `if (!cancelled) {` / `setBackfilling(false);`; 182 `'NO SPORT YET — ADD ONE IN SETTINGS'`; 184 `{backfilling ? <Text style={styles.sub}>matching ways…</Text> : null}`; 185-188 `{rides == null ? (` / `<Text style={styles.sub}>Loading…</Text>` / `) : rides.length === 0 ? (` / post-05 `<Text style={styles.sub}>No activities yet. Record one on the Record tab.</Text>`; 204 `<Text style={styles.rowTitle}>{item.wayName ?? 'no way — recorded only'}</Text>` (`wayName: string | null`).
- `ResultsScreen.tsx` 113 `'NO SPORT YET — ADD ONE IN SETTINGS'`, 117 post-05 `<Text style={styles.empty}>NO RESULTS YET — DO A ROUTE FIRST</Text>`. `RoutesScreen.tsx` 46 `'NO SPORT YET — ADD ONE IN SETTINGS'` (same badge — not in the audit).
- `ReplayScreen.tsx` 202-220: `if (rider === 'loading') { … <Text style={styles.trackLine}>loading replay…</Text> … }`, `if (rider === null) { … <Text style={styles.trackLine}>no replay — this activity never crossed START on this way</Text> … }` (post-05). `replayModel.ts` 179-190 `loadReplayRider(rideId, wayId, fs): Promise<ReplayRider | null>` — null when no spec / unreadable / START never crossed; ReplayScreen itself calls it (61).
- `GateAdjustScreen.tsx` 111-128 (quoted in §Files 6). `CatalogDetailScreen.tsx` 403 `const gateEditable = r.deletable && gateEditDraftFor(r.id) !== null;` → `edit gates` (427-433) **already hidden** without a draft.
- `gateAdjustCard.tsx` props 56-58 `title?: string; subtitle?: string; discardLabel?: string;`; 141 `<Text style={[st.title, { color: t.text }]}>{props.title ?? 'Sector gates — proposed'}</Text>`; 143 `{props.subtitle ?? 'Seeded at 1/25/50/75/99 % of your activity, nudged clear of where you stopped. A proposal, not a benchmark — pick a gate to nudge it (start and finish too), or keep it and refine after a few activities.'}` (post-05, G1); 207 `<Text style={[st.skipText, { color: t.textDim }]}>{props.discardLabel ?? 'discard nudges — keep the proposal'}</Text>`. RecordScreen's post-activity `<GateAdjustCard` passes none of the three (defaults apply).
- `routeNamingCard.tsx` (post-05): 189 `{existingRoute ? `New way on ${existingRoute.label}` : 'New route — name where you rode'}`; 194 `` ? `${existingRoute.label} is a route you have, but this activity did not follow any of its ways. Name what made it different to save it as a new way — this activity becomes its reference.` ``; 200 `` ? `Scored as ${props.matchedWayLabel}, but no route of yours runs between these two places. Name them to make this a way of its own — this activity becomes its reference.` ``; 201 `: 'This activity does not match any route you have. Name its start and end to make it a real way — this activity becomes its reference.'}`; 317 `{existingRoute ? 'SPECIFICATIONS (required) — e.g. Dry, Left' : 'SPECIFICATIONS (optional) — e.g. Dry, Left'}`; 369 `` {dupList.length ? ` · ${dupList.join(' · ')}` : ''} — pick it on RECORD next time, or add another ``.
- `ResultsDetailScreen.tsx` — see consumers above. `firstSportPrompt.tsx` — moved out (D4). `DemoScreen.tsx` 811 `<Text style={styles.sub}>Not part of the final app — use only for testing features.</Text>`; 660 / 794 the two settings reads.
- **Notification title** — `src/location/index.ts` 397, post-05: `notificationTitle: 'Qualifire — recording activity',` (pre-05 `'Qualifire — recording ride'`). What the earlier briefs say, so the executor recognises the current text by content: **01** (§Evidence, §Files 1) quotes the block with `notificationTitle: 'Qualifire — recording ride',` and leaves it; **03** says "Title stays `Qualifire — recording ride`" and rewrites the suite assertion's message to `'expo-location title must be untouched'` keeping the substring; **05** (F1, P1) changes the string to `'Qualifire — recording activity'` and the suite substring with it, and its checklist item 7 expects `Qualifire — recording activity`. After this brief the title is `'Recording activity'`; the suite pin becomes `fgOpts.includes("notificationTitle: 'Recording activity'")` with 03's message text. The Kotlin module never sets the title (`recoverBuilder` inherits it), so no native change. Brief 05's own regression test (visible "ride" scanner over `src/ui/*`, `App.tsx`, `sports.ts`, `routeFromRide.ts`, `index.ts`) is satisfied: **none of this brief's new strings contains "ride"** (checked: "Location permission not granted", "Allow location all the time", "No sport configured yet", "Tap a gate to move it", "Choose sport at start", "Colour sectors on live map", "Race yourself", "Race selfs dots on live map", "Export app", "Recording activity", "discard nudges", "New route", "No activities yet").

## Executor rules (binding)

- **Stop-on-ambiguity.** Anchors are the quoted **text**. If a quoted string is not found verbatim in
  the named file (allowing for 01/03/04/05 having moved lines), is found more than once where one is
  expected, or is found only in its pre-05 "ride" form → stop and report (file, expected, found).
  Never guess, never widen a removal to engine/store logic.
- **Re-read `CLUTTER-REVIEW.md` §2 `Answer:` lines first**; any that contradicts §Decisions → stop.
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a stray `.git/index.lock` is `mv`'d aside).
  **Never delete** — `safe_to_delete/` (gitignored, repo root) is the bin; `mv`, never `rm`.
  No `npm install`, `npx`, `eas`.
- Remove **display** code only. The engine (`src/live/*`), `location/index.ts` beyond the two edits
  in §Files 3.0 and 11, storage, stores, models' logic (except `pbSectors`) stay as they are.
- **Files touched — exactly these, nothing else:**
  - EDIT `app/src/ui/RecordScreen.tsx`, `settings.tsx`, `RideDetailScreen.tsx`, `rideHistoryModel.ts`,
    `rideDetailModel.ts`, `RidesScreen.tsx`, `ResultsScreen.tsx`, `RoutesScreen.tsx`, `ResultsDetailScreen.tsx`,
    `ReplayScreen.tsx`, `GateAdjustScreen.tsx`, `gateAdjustCard.tsx`, `routeNamingCard.tsx`,
    `DemoScreen.tsx`, `recordFlow.ts`
  - MOVE `app/src/ui/firstSportPrompt.tsx` → `safe_to_delete/virgin-cycle20-08/firstSportPrompt.tsx`
  - EDIT `app/src/location/index.ts` (one string; one small new export)
  - EDIT `app/tests/recordflow_suite.ts`, `ridehistory_suite.ts`, `timing_suite.ts`, `ridedetail_suite.ts`,
    `ridenotification_suite.ts`
- Do **not** touch: `src/live/*`, `src/store/*`, `src/storage/*`, `src/location/session.ts`,
  `rideNotification*.ts`, `liveView.tsx`, `wayMapView.tsx`, `tower.tsx`, `towerModel.ts`,
  `resultsListModel.ts` (its `rankingsOn` branch stays, dead but tested), `resultsPlot.tsx`,
  `CatalogDetailScreen.tsx`, `catalogDeleteActions.ts`, `demoModel.ts`, `tabNav.tsx`, `App.tsx`,
  `tests/run.ts`, `tests/lib.ts`, `modules/`, `app.json`, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`,
  this folder's other files.

## Goal

Every string in §Files is gone or shortened as listed; the permission banners are replaced by the
5 s flash; the no-sport press flashes and goes to SETTINGS; an interrupted recording is filed as a
free activity silently on the next launch; Live map and Rankings are no longer settings; DATA is
Export app + Reset app; the notification title is `Recording activity`; tests 0 FAIL; `tsc` clean;
the targeted greps in §Verification return nothing; the new `virgin-cycle20 08` suite test pins it.

## Decisions (design)

1. **One generic flash with a per-call hold.** `gpsFlash: boolean` + `GPS_OFF_MSG` become
   `flashMsg: string | null` + `flashSub(msg, holdMs = GPS_FLASH_HOLD_MS)`; `yellowSub(caption)` shows
   `flashMsg ?? caption`. Constants: `GPS_FLASH_HOLD_MS = 2000` (GPS-off, unchanged),
   `PERM_FLASH_HOLD_MS = 5000` (D5), `NO_SPORT_FLASH_HOLD_MS = 1000` (D4); fade 400 ms for all. A
   caption of `''` with no flash renders **nothing** (`null`), so START shows the bare word centred.
2. **No-sport press = flash + navigate.** `recordPressAction` becomes `'arm' | 'no-sport'`; on
   `'no-sport'` the handler calls `flashSub(NO_SPORT_MSG, NO_SPORT_FLASH_HOLD_MS)` and arms a
   `setTimeout(() => tabNav.go('settings'), NO_SPORT_FLASH_HOLD_MS)` kept in a ref and cleared on
   unmount (RecordScreen unmounts on the tab switch; the flash timer cleanup is extended to clear it).
   `onRecord`'s own zero-sport guard stays. The whole `FirstSportPrompt` component, its states and
   `onFirstSport` go; the C0 block renders nothing while `noSport`; the RECORD button has one branch
   (slogan sub-label). SETTINGS' SPORTS card is the add path (verified — Evidence).
3. **Foreground-only flash lives in the running screen's status slot.** The START press that
   detects `'foreground-only'` immediately moves the phase to `running`, where there is no yellow
   button, so a sub-label flash would be invisible. The slot that shows `GPS live` becomes an
   `Animated.Text` driven by the same `flashMsg`/opacity: it shows the ask for 5 s, fades, then
   `GPS live` / nothing. `trackLine` is uppercase, so it reads `ALLOW LOCATION ALL THE TIME`. On the
   RECORD press, `'foreground-only'` does **not** flash (the launch animation would hide it; the
   START press re-checks and flashes).
4. **Status slot = `GPS live` or blank.** `gpsLive = status.lastFixMs != null && lastFixAgeS != null && lastFixAgeS <= 5`
   — the same ≤ 5 s rule that chose "GPS live" today. No rotation, no pin, no interval → `PIN_MS`,
   `WRITING_HISTORY_AFTER_FIXES`, `statusItemsFor` and their comments go. The amber "Recovered …"
   lines go too (D7: captions with em dashes are clutter; the recovery is unchanged and still logged).
5. **Silent recovery → free activity (D2).** The dead-service branch calls `stopTracking()` (exactly
   what the old "Save ride" button did), then `markRideFree(...)` with the session's identity, then
   `setLastSummary(sum)` so the setup screen reads `Activity saved · m:ss`. Why this is safe and
   sufficient: the recovery path never stores a result (only `onEnd` does), and the free mark removes
   the activity from ACTIVITIES' backfill candidates — the only path that could ever have matched it
   to a way (Evidence). Guarded by a module-scope `let recoveryAutoSaveStarted = false` so a remount in
   the same JS launch never repeats it (`stopTracking`/`markRideFree` are idempotent anyway).
   **Failure:** `try/catch` — a thrown `endRide: unknown ride …` means the marker points at a ride file
   that no longer exists: nothing can be saved, so the marker is dropped via a new `dropStaleSession()`
   export (clears the marker, resets the module `session`, stops the engine — mirrors `stopTracking`'s
   tail). Any other error leaves the marker for the next launch (silent retry, `console.warn` only).
6. **Live map / Rankings: field removal + load scrub** (see top). Every consumer is hard-wired to
   the "on" branch; the `else` views go with the ternaries. `useSettings` is dropped from
   `RideDetailScreen` and `ResultsDetailScreen`. `PbDetail` loses `showRanking`; `HistoryBoard` loses
   `rankingsOn` and calls `boardCaption(board.total, true)`.
7. **Replay button gated by the real loader.** `RideDetailScreen` runs
   `loadReplayRider(request.rideId, replayWayId, fs)` once per detail open and shows the button only
   when it resolves non-null — the same function ReplayScreen uses. Until it resolves the button is
   absent. ReplayScreen's two text branches keep their layout (`‹ BACK`) with no text.
8. **Export app = one combined document.** `shareAppExport()` reads both files, parses each (missing →
   `null`, corrupt → raw text under `*_raw` so nothing is lost), writes
   `{ kind: 'qualifire-export', schemaVersion: 1, exportedAtMs, catalog, refs }` through `saveTextFile`;
   both missing → the existing "Nothing to export yet" alert. No importer exists (Q11), so the shape is
   documentation. Name: `qualifire-export-YYYYMMDD.json` (today's date-stamp convention).
9. **Em-dash survivors (D7) — per item** (full table in §Files 11). Rule applied: pure caption →
   delete; control label → keep the control, first clause only; a model string that is a status
   label → its first clause (`not ranked`, `no rank`, `too few to rank`, `no time`, `no lap` — 2-3 words,
   honest, and `ReplayScreen`'s `replay over · ${rankLine || lapLabel}` keeps a value). **The two
   "— ref" markers:** on the ride-detail reference card the sentence under it is deleted, so ` — ref`
   is the only thing saying "this is the reference" → it becomes its own line `ref` (no dash); on the
   ACTIVITIES row the title is one string and the only marker → `Home → Work · ref` (the app's own
   ` · ` way-label separator, not a rewrite of a sentence). Both flagged in §Open call.
10. **Alerts stay as they are.** `Alert.alert` titles/bodies (RecordScreen 946, GateAdjustScreen
    59/89, RideDetailScreen 453, CatalogDetailScreen 137, settings 321/329, `sports.ts`,
    `routeFromRide.ts`) are modal dialog prose, not screen clutter, and were not in the review's 17;
    brief 09's inventory will list them for a later ruling.
11. **Test accounting:** −1 (statusItemsFor test), −3 (five `recordPressAction` tests become two),
    +1 (new `virgin-cycle20 08` text-level test) → net **−3**; `timing_suite` and `ridehistory_suite`
    tests shrink but stay.

## Files to touch

### 1. EDIT `app/src/ui/recordFlow.ts`
- Remove lines 95-103 (`export function statusItemsFor(…) { … }`) and the doc comment directly above
  it if it documents only the status slot.
- Replace lines 105-115 (the `RecordPressAction` comment, type and function) with:
  ```ts
  /** virgin-cycle20 brief 08 (Nathan, clutter review Q4): what the big RECORD
   * button does on press. 'no-sport' = zero sports → RecordScreen flashes
   * "No sport configured yet" and switches to SETTINGS (whose SPORTS card adds
   * the first sport); 'arm' = at least one sport → onRecord as always. The
   * inline first-sport prompt (virgin-cycle15 brief 02) is retired. */
  export type RecordPressAction = 'no-sport' | 'arm';
  export function recordPressAction(input: { sportCount: number }): RecordPressAction {
    return input.sportCount > 0 ? 'arm' : 'no-sport';
  }
  ```
- `grep -n "statusItemsFor\|firstSportPrompt\|open-first-sport\|add-first-sport" src/ui/recordFlow.ts` → nothing.

### 2. EDIT `app/src/ui/settings.tsx`

2.1 Interface + defaults — remove `  tower: boolean;` and `  liveMap: boolean;` from `Settings`;
remove `  tower: true,` and `  liveMap: true,` from `DEFAULTS`. Add above the interface's first field:
```ts
  /** virgin-cycle20 brief 08 (Nathan, clutter review): `liveMap` and `tower`
   * (Live map, Rankings) are no longer settings — the live map and the
   * rankings are always on. Old settings.json keys are scrubbed on load. */
```
2.2 Load scrub — after the `delete (saved as Record<string, unknown>).timing; …` line add:
```ts
        delete (saved as Record<string, unknown>).liveMap; // virgin-cycle20 08: Live map row retired — always on
        delete (saved as Record<string, unknown>).tower; // virgin-cycle20 08: Rankings row retired — always on
```
2.3 `Row` — `hint?: string;` → `hint?: React.ReactNode;` (nothing else changes).
2.4 SportsSection:
- `<Row label="Active sport" hint="Everything on RECORD, ROUTES and ACTIVITIES is scoped to this one." help={help} t={t}>` → `<Row label="Active sport" help={help} t={t}>`
- Disabled-delete hint (Evidence 536-541) → keep only the active-sport case:
  ```tsx
                  {!canDelete && isActive ? (
                    <Text style={{ color: t.textDim, fontSize: 11 }}>switch to another sport first</Text>
                  ) : null}
  ```
  (the route/activity counts already sit on the row header — the "— delete those first" sentence was a duplicate; D7).
- `Sport picker on RECORD` row: `label="Sport picker on RECORD"` → `label="Choose sport at start"`; remove the `hint="Show the sport row on RECORD. Off: switch sports here instead."` line.
2.5 SettingsScreen:
- Theme row: drop `hint="The map and race surface follow it. With Auto on, your pick holds until the next scheduled change."`.
- Auto day/night row: drop the `hint="Day theme inside the window, … it waits for STOP."` line.
- WHILE RECORDING card: **remove the whole Live map `<Row …>…</Row>` (three lines).**
  Sector colours row: label unchanged; `hint="Paint each stretch of the route line in the colour its sector earned."` → `hint="Colour sectors on live map"` (D10).
  Race row: replace
  ```tsx
          <Row label="Race your past activities" t={t} help={help}
            hint="Your previous activities of this route move along the map as small dots, timed from the START gate. Purple is your best of the last nine, green is faster than their average, yellow slower. The P-number under the map is your position among them right now.">
  ```
  with
  ```tsx
          <Row label="Race yourself" t={t} help={help}
            hint={<>Race <Text style={{ fontStyle: 'italic' }}>selfs</Text> dots on live map</>}>
  ```
  Gate buzz row untouched.
- Start place row: drop `hint="Detect where you are when an activity starts, or choose the place yourself."`.
- **Remove the SCORING section entirely** (`<Text …>SCORING</Text>`, its card `<View>` … `</View>`, the `{/* Cycle 024 (WP-A3) … */}` comment, the Rankings `<Row>`).
- DATA card: replace the two export rows (from `<Row label="Places & routes"` through the second `</Row>`) with
  ```tsx
          <Row label="Export app" t={t} help={help}>
            <Pressable
              style={[st.shareBtn, { borderColor: t.cardBorder }]}
              onPress={() => void shareAppExport(`qualifire-export-${dateStamp(Date.now())}.json`)}
            >
              <Text style={[st.shareText, { color: t.text }]}>export</Text>
            </Pressable>
          </Row>
  ```
  Reset row: drop its `hint="Moves every activity, … Settings and theme are kept."` line (keep `sep`). The `{/* WP-Q Part B … */}` comment stays (optionally reword "two share rows" → "export row").
2.6 Add `shareAppExport` where `shareStoreFile` was (**remove `shareStoreFile`** and its doc comment — unreferenced after 2.5; `USER_CATALOG_FILE`/`USER_REFS_FILE` imports stay):
```ts
/** virgin-cycle20 brief 08 (Nathan, clutter review Q11): ONE "Export app"
 * document — the catalog (places, ways, routes) and the reference lines
 * together, since neither is useful without the other. Replaces the two
 * per-file exports. There is no importer yet; the shape is documentation.
 * Each file is parsed when it is valid JSON and carried raw when it is not,
 * so a corrupt file is still exported rather than dropped. */
async function shareAppExport(outName: string): Promise<void> {
  try {
    const fs = createExpoFsAdapter();
    const [catalogText, refsText] = await Promise.all([fs.readText(USER_CATALOG_FILE), fs.readText(USER_REFS_FILE)]);
    if (catalogText === null && refsText === null) {
      Alert.alert('Nothing to export yet', 'No places, routes or reference lines on this phone yet.');
      return;
    }
    const parse = (text: string | null): { value: unknown; raw: string | null } => {
      if (text === null) return { value: null, raw: null };
      try { return { value: JSON.parse(text) as unknown, raw: null }; } catch { return { value: null, raw: text }; }
    };
    const cat = parse(catalogText);
    const refs = parse(refsText);
    const doc = {
      kind: 'qualifire-export',
      schemaVersion: 1,
      exportedAtMs: Date.now(),
      catalog: cat.value,
      refs: refs.value,
      ...(cat.raw !== null ? { catalog_raw: cat.raw } : {}),
      ...(refs.raw !== null ? { refs_raw: refs.raw } : {}),
    };
    const res = await saveTextFile(outName, 'application/json', JSON.stringify(doc));
    if (res.method === 'saf') Alert.alert('Exported', `${outName} saved to the folder you picked.`);
    else if (res.method === 'share-text') Alert.alert('Exported', `${outName} sent as text via the share sheet.`);
  } catch (e) {
    Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
  }
}
```
2.7 `onResetPress` confirm text: `(ACTIVITIES → Export GPX+, or the two export buttons above).` →
`(ACTIVITIES → Export GPX+, or Export app above).` (pre-05 form `(RIDES → …` = 05 not landed → stop).
2.8 Sanity: `grep -n "liveMap\|tower\|shareStoreFile\|Live map\|Rankings\|SCORING\|Places & routes\|Reference activities\|Reference rides\|delete those first\|Sport picker" src/ui/settings.tsx` → nothing.

### 3. EDIT `app/src/ui/RecordScreen.tsx`

3.0 (in `app/src/location/index.ts`) — add after `stopTracking`'s closing brace:
```ts
/** virgin-cycle20 brief 08: the silent relaunch finaliser (RecordScreen) found
 * a marker whose ride file no longer exists — nothing can be saved, so the
 * marker is dropped instead of being re-detected on every launch. Mirrors
 * stopTracking's tail without touching the service or storage. */
export async function dropStaleSession(): Promise<void> {
  await clearSession();
  session = null;
  sessionLoaded = true;
  liveEngine.stop();
  emit();
}
```
(`clearSession`, `session`, `sessionLoaded`, `liveEngine`, `emit` exist at module scope — verify by grep; no `syncShowWhenLocked()` call.)

3.1 Recovery — in the mount effect: remove `setRecoveredKind(rec.restoration);` and
`setRecovered(true);` from the `if (rec.tracking)` branch (keep `setSession(rec.session);` and the trail
hydration). Replace the `else { // Service died …` branch body (the whole `Alert.alert(…)` call) with:
```tsx
        // virgin-cycle20 brief 08 (Nathan, clutter review Q2): no dialog, no
        // text. The service died (OS kill / force stop); what was captured is
        // finalised exactly as the old "Save ride" button did and then FILED
        // FREE — a recovered recording never counts for an official way: the
        // recovery path stores no result, and the free mark keeps it out of
        // ACTIVITIES' backfill (ui/rideHomes.ts), the only path that could
        // have matched it to a way. The setup screen's "Activity saved · …"
        // line is the only trace. A marker whose ride file is gone cannot be
        // saved and is dropped; any other failure leaves it for the next launch.
        if (recoveryAutoSaveStarted) return;
        recoveryAutoSaveStarted = true;
        try {
          const sum = await stopTracking();
          if (sum) {
            markRideFree(
              sum.rideId,
              rec.session.startedAtMs,
              Math.max(0, (sum.endMs - sum.startMs) / 1000),
              effectiveRideSportId(rec.session.sportId, currentSports()),
            );
          }
          setLastSummary(sum);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('unknown ride')) {
            await dropStaleSession().catch(() => {});
          } else {
            console.warn('[record] interrupted activity not finalised this launch:', msg);
          }
        }
```
Add at module scope (near `NEW_ID`): `let recoveryAutoSaveStarted = false; // virgin-cycle20 08: once per JS launch`.
Add `dropStaleSession,` to the `from '../location'` import list (alphabetical: the line before
`ensurePermissions,`). `markRideFree`, `effectiveRideSportId`, `currentSports` are already imported.
Remove the `recovered` display: lines 190 and 193 (both states), the three `setRecovered(false);`
lines (603, 683, 921), the render block `{recovered && (<Text style={styles.recovered}>…</Text>)}`
(1385-1390) and the `recovered:` style (1789). `grep -n "recovered\|Unfinished \|Save activity\|Discard for now" src/ui/RecordScreen.tsx` → nothing (the word may survive inside comments only).

3.2 Flash generalisation — replace lines 102-104 with:
```ts
const GPS_OFF_MSG = 'Location (GPS) is turned off';
const GPS_FLASH_HOLD_MS = 2000;
const GPS_FLASH_FADE_MS = 400;
/** virgin-cycle20 brief 08 (Nathan, clutter review Q4/Q5): the two permission
 * banners and the inline first-sport form are gone; these flash in the same
 * slot, the same way, each with its own hold (Q5: permissions 5 s; Q4: the
 * no-sport message shows 1 s, then RECORD hands over to SETTINGS). */
const PERM_DENIED_MSG = 'Location permission not granted';
const PERM_FOREGROUND_ONLY_MSG = 'Allow location all the time';
const PERM_FLASH_HOLD_MS = 5000;
const NO_SPORT_MSG = 'No sport configured yet';
const NO_SPORT_FLASH_HOLD_MS = 1000;
```
Append to the comment above (lines 95-101) one sentence: `virgin-cycle20 08: the same flash now
carries the permission and no-sport messages with their own holds (see below).`
Replace the block quoted in Evidence (lines 480-513) with:
```tsx
  // virgin-cycle16 05 / virgin-cycle20 08: transient message in the yellow
  // button's sub-label (RECORD in setup, START when armed) or, while running,
  // in the status slot under the sector pane. Imperative rather than an
  // effect because Nathan wants it to re-fire on EVERY press. holdMs is per
  // message (GPS-off 2 s, permissions 5 s, no-sport 1 s).
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const flashOpacity = useRef(new Animated.Value(1)).current;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSportNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSub = useCallback((msg: string, holdMs: number = GPS_FLASH_HOLD_MS) => {
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    flashOpacity.stopAnimation();
    flashOpacity.setValue(1);
    setFlashMsg(msg);
    flashTimer.current = setTimeout(() => {
      flashTimer.current = null;
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: GPS_FLASH_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return; // a newer press stopped this fade — it owns the state now
        setFlashMsg(null);
      });
    }, holdMs);
  }, [flashOpacity]);
  useEffect(() => () => {
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    if (noSportNavTimer.current !== null) clearTimeout(noSportNavTimer.current);
    flashOpacity.stopAnimation();
  }, []);
  // virgin-cycle20 08 (Q4): RECORD with zero sports — say so for a second,
  // then hand over to SETTINGS (its SPORTS card adds the first sport).
  const onNoSport = useCallback(() => {
    flashSub(NO_SPORT_MSG, NO_SPORT_FLASH_HOLD_MS);
    if (noSportNavTimer.current !== null) clearTimeout(noSportNavTimer.current);
    noSportNavTimer.current = setTimeout(() => {
      noSportNavTimer.current = null;
      tabNav.go('settings');
    }, NO_SPORT_FLASH_HOLD_MS);
  }, [flashSub, tabNav]);
  // Sub-label of either yellow button: the flash while flashing (animated
  // opacity replaces startSub's static 0.75), the caption otherwise; nothing
  // at all for an empty caption (START carries only its word).
  const yellowSub = (caption: string) => {
    if (flashMsg === null && caption === '') return null;
    return (
      <Animated.Text style={[styles.bigBtnSub, styles.startSub, flashMsg !== null ? { opacity: flashOpacity } : null]}>
        {flashMsg ?? caption}
      </Animated.Text>
    );
  };
```
(`tabNav` is declared at line 162, above this block — confirm it is in scope; if `useTabNav()` sits
below, stop and report.)
`onRecord`: replace lines 527-532 with
```ts
      if (outcome === 'denied' || outcome === 'services-off') {
        // virgin-cycle16 05 / cycle20 08: message in the button, never a banner
        if (outcome === 'denied') flashSub(PERM_DENIED_MSG, PERM_FLASH_HOLD_MS); else flashSub(GPS_OFF_MSG);
        return; // stay in setup
      }
```
`onStart`: replace lines 574-579 with
```ts
      if (outcome === 'denied' || outcome === 'services-off') {
        if (outcome === 'denied') flashSub(PERM_DENIED_MSG, PERM_FLASH_HOLD_MS); else flashSub(GPS_OFF_MSG); // virgin-cycle16 05 / cycle20 08
        return;
      }
      // virgin-cycle20 08 (Q5b): recording proceeds; the running screen's
      // status slot flashes the ask (START itself is gone the next frame).
      if (outcome === 'foreground-only') flashSub(PERM_FOREGROUND_ONLY_MSG, PERM_FLASH_HOLD_MS);
```
Remove line 189 (`problem` state). Remove the whole `problemStates` definition (comment 1190-1195
through `);` at 1218) and its three `{problemStates}` render sites. Remove `Linking` from the
react-native import — `grep -n "Linking" src/ui/RecordScreen.tsx` → empty. Remove styles `warnBox`,
`linkBtn`, `linkBtnText` (keep `warn`). `grep -n "gpsFlash\|flashGpsOff\|setProblem\|problemStates\|warnBox" src/ui/RecordScreen.tsx` → nothing.

3.3 Status machinery — remove `PIN_MS` + comment (91-94) and `WRITING_HISTORY_AFTER_FIXES` + comment
(106-111). Remove `statusItemsFor` from the line-38 import. Replace lines 964-1029 (from `// Rotating
status slot (IDEAS §24)` to the `const statusLine = …;` line) with:
```ts
  // virgin-cycle20 brief 08 (Nathan, clutter review): the rotating status
  // slot is gone. The only live status text left is "GPS live", shown while
  // the last fix is <= 5 s old (the same rule that chose it before) and
  // nothing otherwise — no "waiting for first fix", no "GPS struggling", no
  // route/way lines. The engine's lock logic is untouched; it is simply not
  // narrated here any more.
  const gpsLive = status.lastFixMs != null && lastFixAgeS != null && lastFixAgeS <= 5;
  // Cycle-2 WP-A: reference line vs live trail, mutually exclusive — see
  // recordFlow.ts liveMapOverlayFor. Derived per render (no effect/state):
  // live.track (lock) outranks the START-frozen pick hint.
  const mapOverlay = liveMapOverlayFor({ track: live.track, wayHint: rideWayHint });
```
Running phase: replace the comment 1430-1433 + `<Text style={styles.trackLine}>{statusLine}</Text>` with
```tsx
        {/* virgin-cycle20 08: one quiet slot — "GPS live" or nothing; also the
            5 s flash of the foreground-only permission ask (Q5b). Storage
            errors stay permanent below. */}
        <Animated.Text style={[styles.trackLine, flashMsg !== null ? { opacity: flashOpacity } : null]}>
          {flashMsg ?? (gpsLive ? 'GPS live' : '')}
        </Animated.Text>
```
Storage line: `{status.storageErrors} storage errors — last: {status.lastError}` → `{status.storageErrors} storage errors` (D7 — first clause; `lastError` stays in the GPX+ sidecar).
`grep -n "waiting for first\|GPS struggling\|writing history\|detecting route\|way locked\|your pick · confirming\|statusItems\|wayLine\|gpsLine\|PIN_MS\|WRITING_HISTORY\|last: {" src/ui/RecordScreen.tsx` → nothing.

3.4 Live map hard-wired — at the three `{settings.liveMap ? (` sites keep the map `<View>…</View>`
child, remove the ternary wrapper and its `: ( <View style={{ flex: 1 }} /> )` / `: null` branch.
Reword the running-site comment (`… even when the map is switched off.`) to drop that clause.
`grep -n "liveMap" src/ui/RecordScreen.tsx` → only `liveMapOverlayFor` / `mapOverlay` lines.

3.5 Strings and the no-sport flow:
- `{yellowSub('the clock runs from here')}` → `{yellowSub('')}`
- `<Text style={styles.cancelBarText}>‹ cancel — back to setup</Text>` → `<Text style={styles.cancelBarText}>‹ cancel</Text>`
- Armed trackLine: `` {route && pickedWay ? ` · ${wayVariantLabel(pickedWay.id, route, pickedWay.specs)}` : ''} · ready — not started `` → `` {route && pickedWay ? ` · ${wayVariantLabel(pickedWay.id, route, pickedWay.specs)}` : ''} `` (the ` · ready — not started` suffix goes).
- ending: `` : lastSummary ? `Activity saved — ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}.` : 'Activity saved.'} `` → `` : lastSummary ? `Activity saved · ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}` : 'Activity saved.'} `` (D9 form, no trailing period after the time).
- `: 'START NOT DETECTED — PICK ONE')` → `: 'START NOT DETECTED')`
- Remove the three lines `<Text style={styles.sub}>` / `your pick is locked for this activity` / `</Text>`.
- Replace the `lastSummary ? (…) : (<Text style={styles.sub}>Ready to record.</Text>)` block with
  ```tsx
            {lastSummary ? (
              <Text style={styles.sub}>
                Activity saved · {fmtElapsed(lastSummary.endMs - lastSummary.startMs)}
              </Text>
            ) : null}
  ```
- **No-sport flow (D4):** remove line 75 (`FirstSportPrompt` import); remove `addSport` from the
  line-81 import; remove the states at 269-271 and their comment 267-268; remove `onFirstSport`
  (539-560, comment included). The C0 block: `{noSport ? (<View style={styles.startFlow}> … </View>) : (<>` →
  `{noSport ? null : (<>` (keep the comment above it, append `virgin-cycle20 08: no inline form — RECORD
  flashes and hands over to SETTINGS.`). The RECORD button's `onPress` becomes
  ```tsx
          onPress={() => {
            const action = recordPressAction({ sportCount: currentSports().sports.length });
            if (action === 'arm') void onRecord();
            else onNoSport();
          }}
  ```
  and its children collapse to the single (former `noSport === false`) branch:
  ```tsx
          {/* Record-dot glyph … (comment unchanged) */}
          <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>
          {yellowSub('same activity · new meaning')}
  ```
  `noSport` itself stays (the C0 block and the sport-pill row still read it). Update the big comment
  above the button (`Q4 (WP-1): while zero sports exist the button opens the first-sport prompt … only the
  subtext flags the missing sport.`) to: `Q4 → virgin-cycle20 08: while zero sports exist the button
  flashes "No sport configured yet" for a second and switches to SETTINGS (recordFlow.recordPressAction).`
- Dead alerts: `if (sportId === null) { Alert.alert('No sport set up', …); return; }` → `if (sportId === null) return; // unreachable in practice (see comment above); no dialog (virgin-cycle20 08)`.
  `Alert.alert('That way already exists', 'Pick it on RECORD next time instead of adding it again.');` → delete the line, keep `return;`, add `// virgin-cycle20 08: race only (the card already disables ADD ROUTE on a duplicate) — fail silently`.
- `grep -n "firstSport\|FirstSportPrompt\|with this sport\|no sport yet\|SET UP A SPORT\|Ready to record\|your pick is locked\|the clock runs\|back to setup\|ready — not started\|PICK ONE\|Find it in" src/ui/RecordScreen.tsx` → nothing.

3.6 MOVE `app/src/ui/firstSportPrompt.tsx`:
```
mkdir -p safe_to_delete/virgin-cycle20-08
mv app/src/ui/firstSportPrompt.tsx safe_to_delete/virgin-cycle20-08/firstSportPrompt.tsx
```
(repo root). `grep -rn "firstSportPrompt" app/src app/tests` → nothing.

### 4. EDIT `app/src/ui/RideDetailScreen.tsx`
- Remove `import { useSettings } from './settings.tsx';` and `const { s } = useSettings();`.
- `PbDetail`: signature `props: { wayId: string; lastRideId: string | null; t: PaddockTheme }`; body:
  ```tsx
    return (
      <View style={st.pbDetail}>
        {detail.ranking.length > 0 ? (
          <>
            <Text style={[st.hint, { color: t.textDim }]}>last {detail.ranking.length} on this way</Text>
            {detail.ranking.map((row) => (
              <View key={row.posLabel} style={st.pbRow}>
                <Text style={[st.pbPos, { color: t.text }]}>{row.posLabel}</Text>
                <Text style={{ flex: 1, color: row.today ? t.accentText : t.textDim, fontSize: 13 }}>
                  {row.dateLabel}
                </Text>
                <Text style={[st.pbNum, { color: t.text }]}>{row.timeLabel}</Text>
                <Text style={[st.pbNum, { color: t.textDim }]}>{row.gapLabel}</Text>
              </View>
            ))}
          </>
        ) : null}
      </View>
    );
  ```
  Call site: drop `showRanking={s.tower}`. Doc comment: add `virgin-cycle20 08: ranking only — the
  "personal best sectors" block is gone (Nathan: rolling comparison, no records).`
- Reference card: `<Text style={{ color: t.textDim }}>{wayLabelIn(currentCatalog(), model.referenceOf.id)} — ref</Text>` →
  ```tsx
            <Text style={{ color: t.textDim }}>{wayLabelIn(currentCatalog(), model.referenceOf.id)}</Text>
            <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>ref</Text>
  ```
  and delete the three lines `<Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>` / `this activity is the reference for this way — no lap time on file for it` / `</Text>`.
- Remove `<Text style={{ color: t.textDim, marginTop: 4 }}>no lap, no sectors — a free activity is not compared to anything</Text>`.
- `<Text style={{ color: t.textDim }}>{pickLabel ?? 'no way — recorded only'}</Text>` → `{pickLabel !== null ? <Text style={{ color: t.textDim }}>{pickLabel}</Text> : null}`.
- Remove `<Text style={{ color: t.textDim, marginTop: 4 }}>sector times not on file for this activity</Text>`.
- Replay gating: add `import { loadReplayRider } from './replayModel.ts';` (match the file's suffix style); add `const [canReplay, setCanReplay] = useState(false);` next to `replaying`; after `replayWayId` is computed add:
  ```ts
    // virgin-cycle20 08 (Q1): the Replay button only when a replay exists —
    // the same loader ReplayScreen uses, so the two can never disagree. An
    // activity that never crossed START on its way simply has no button.
    useEffect(() => {
      let cancelled = false;
      setCanReplay(false);
      if (replayWayId === null) return;
      loadReplayRider(request.rideId, replayWayId, createExpoFsAdapter())
        .then((r) => { if (!cancelled) setCanReplay(r !== null); })
        .catch(() => { /* no button is the honest fallback */ });
      return () => { cancelled = true; };
    }, [request.rideId, replayWayId]);
  ```
  Button: `{replayWayId !== null ? (` → `{replayWayId !== null && canReplay ? (`.

### 5. EDIT `app/src/ui/rideHistoryModel.ts`
- `PbDetailModel`: remove `pbSectors: { label: string; timeLabel: string }[];`.
- `buildPbDetail`: remove from `// Sector indices are read from the window itself …` through the `});`
  closing `const pbSectors = …`; `return { ranking, pbSectors };` → `return { ranking };`. Doc comment:
  drop "and its best-ever sector split", add `virgin-cycle20 08: no sector bests — rolling comparison only (Nathan).`
- Line 158: `` `${labelFor(refWay.id)} — ref` `` → `` `${labelFor(refWay.id)} · ref` `` (Decision 9 — the row's only reference marker).

### 6. EDIT `app/src/ui/GateAdjustScreen.tsx` and `gateAdjustCard.tsx`
GateAdjustScreen — replace
```tsx
      {draft === null ? (
        <Text style={{ color: t.textDim, fontSize: 13 }}>
          This way's gates cannot be edited — it has no reference activity or gate set on file.
        </Text>
      ) : (
```
with
```tsx
      {draft === null ? null /* unreachable from the UI: CatalogDetailScreen hides "edit gates" without a draft (virgin-cycle20 08) */ : (
```
and in the `<GateAdjustCard` props: `` title={`Sector gates — ${label}`} `` → `title={label}`; the whole
`subtitle="Tap a gate on the map or below to nudge it — … recordings and activities do."` → `subtitle="Tap a gate to move it"`;
`discardLabel="discard nudges — keep the current gates"` → `discardLabel="discard nudges"`. (Pre-05 subtitle says "rides" → stop.)
gateAdjustCard — `<Text style={[st.title, { color: t.text }]}>{props.title ?? 'Sector gates — proposed'}</Text>` →
`{props.title !== undefined ? <Text style={[st.title, { color: t.text }]}>{props.title}</Text> : null}` (D9: the
proposal card has no header; the edit screen passes the way label); the `props.subtitle ?? 'Seeded at 1/25/50/75/99 % … after a few activities.'`
default → `props.subtitle ?? 'Tap a gate to move it'`; `props.discardLabel ?? 'discard nudges — keep the proposal'` → `props.discardLabel ?? 'discard nudges'`.
If `st.title` carries a `marginBottom` that now leaves a gap above the subtitle, leave it (layout is not this brief's).

### 7. EDIT `app/src/ui/RidesScreen.tsx`
- Remove `const [backfilling, setBackfilling] = useState(false);`, `setBackfilling(true);`, `setBackfilling(false);` (keep the `if (!cancelled) { setResultsTick(…) }` block).
- `'NO SPORT YET — ADD ONE IN SETTINGS'` → `'NO SPORT YET · ADD ONE IN SETTINGS'` (D4 — accurate again).
- Remove `{backfilling ? <Text style={styles.sub}>matching ways…</Text> : null}`.
- `{rides == null ? (` / `<Text style={styles.sub}>Loading…</Text>` → `{rides == null ? null : rides.length === 0 ? (`.
- `No activities yet. Record one on the Record tab.` → `No activities yet` (D7: first clause).
- `<Text style={styles.rowTitle}>{item.wayName ?? 'no way — recorded only'}</Text>` → `{item.wayName !== null ? <Text style={styles.rowTitle}>{item.wayName}</Text> : null}`.
- `grep -n "backfilling\|Loading…\|matching ways\|recorded only\|Record one" src/ui/RidesScreen.tsx` → nothing.

### 8. EDIT `ResultsDetailScreen.tsx`, `ReplayScreen.tsx`, `DemoScreen.tsx`
- **ResultsDetailScreen:** remove the `useSettings` import and `const { s } = useSettings();`;
  `const selectedPosLabel = s.tower && selectedBoardRow !== null && selectedBoardRow.pos !== null` →
  `const selectedPosLabel = selectedBoardRow !== null && selectedBoardRow.pos !== null`; remove
  `rankingsOn={s.tower}` from `<HistoryBoard`; in `HistoryBoard` drop `rankingsOn` from the destructure
  and the type, `boardCaption(board.total, rankingsOn)` → `boardCaption(board.total, true)`,
  `{rankingsOn ? board.rows.map((row) => {` → `{board.rows.map((row) => {` with the matching `}) : null}` →
  `})}`; remove `let printedNotRanked = false;`, the two `showSub` lines and the `{showSub ? <Text …>not ranked</Text> : null}` line; remove style `notRanked`. Comment "Empty while rankings are off, or …" → "Empty when …".
- **ReplayScreen:** delete `<Text style={styles.trackLine}>loading replay…</Text>` and
  `<Text style={styles.trackLine}>no replay — this activity never crossed START on this way</Text>` (both branches keep `raceColumn` + `‹ BACK`). Live map: remove the `{settings.liveMap ? (` wrapper and its `) : ( <View style={{ flex: 1 }} /> )}` branch, keeping the map `<View>`. `settings` stays (`selfDots`, `sectorColours`).
- **DemoScreen (D8 — code only, one settled text):** `Not part of the final app — use only for testing features.` → `Not part of the final app · use only for testing features.`; unwrap `{settings.liveMap ? (` … `) : ( <View style={{ flex: 1 }} /> )}`; `selectedPosLabel={settings.tower ? demoPlotPosLabel(plotResults, plotSel) : ''}` → `selectedPosLabel={demoPlotPosLabel(plotResults, plotSel)}`. **Nothing else in DemoScreen changes** (`demo · nothing is recorded`, `demo only · nothing saved`, `Activity saved — …`, `FIRST_RIDE_STATUS` all stay).

### 9. EDIT `ResultsScreen.tsx`, `RoutesScreen.tsx`
- Both: `'NO SPORT YET — ADD ONE IN SETTINGS'` → `'NO SPORT YET · ADD ONE IN SETTINGS'`.
- ResultsScreen: `NO RESULTS YET — DO A ROUTE FIRST` → `NO RESULTS YET` (D7: first clause; pre-05 `RIDE A ROUTE FIRST` → stop).

### 10. EDIT `rideDetailModel.ts` (D7 — status labels keep their first clause)
- `'not ranked — you excluded this activity from ranking'` → `'not ranked'`
- `'no rank — this lap is excluded from the comparison'` → `'no rank'`
- `` `${hist.length} activities of history — too few to rank` `` → `'too few to rank'` (the count is not the status; `hist` stays used by the `if` above it).
- `'no time — an estimated lap never ranks' : 'no lap — a missed gate never ranks'` → `'no time' : 'no lap'`
Update the function's doc comment: `virgin-cycle20 08: bare status words — the explanations were clutter (Nathan, Q7).`

### 11. Remaining em-dash survivors (D7) — per item
| File | Before (substring) | Kind | After |
|---|---|---|---|
| `routeNamingCard.tsx` 189 | `'New route — name where you rode'` | header | `'New route'` |
| `routeNamingCard.tsx` 194 | `… to save it as a new way — this activity becomes its reference.` | caption | `… to save it as a new way.` (tail deleted) |
| `routeNamingCard.tsx` 200 | `… a way of its own — this activity becomes its reference.` | caption | `… a way of its own.` |
| `routeNamingCard.tsx` 201 | `… to make it a real way — this activity becomes its reference.'` | caption | `… to make it a real way.'` |
| `routeNamingCard.tsx` 317 | `'SPECIFICATIONS (required) — e.g. Dry, Left' : 'SPECIFICATIONS (optional) — e.g. Dry, Left'` | field label | `'SPECIFICATIONS (required)' : 'SPECIFICATIONS (optional)'` |
| `routeNamingCard.tsx` 369 | `` : ''} — pick it on RECORD next time, or add another `` | caption | `` : ''} `` (tail deleted — the line ends at the names) |
| `src/location/index.ts` 397 | `notificationTitle: 'Qualifire — recording activity',` | title | `notificationTitle: 'Recording activity',` |
(Every other survivor is handled in its own section above: RecordScreen 3.3/3.5, RideDetailScreen 4,
rideHistoryModel 5, GateAdjust 6, Rides 7, Results 9, rideDetailModel 10, settings 2.4, Demo 8.)
**Untouched by design:** `Alert.alert` prose (Decision 10), `'—'` placeholders (`ResultsDetailScreen` 167, `tower.tsx`, `towerModel.ts`, `resultsListModel.ts` 242, `gateAdjustModel.ts` `'— %'`), comments, DemoScreen texts other than line 811.

### 12. EDIT tests
- `recordflow_suite.ts`: remove `statusItemsFor,` from the import; remove the test
  `'recordFlow: statusItemsFor never mentions a raw fixes COUNT and orders trouble-first'` (53-77).
  Replace the five `recordPressAction` tests (168-205) with:
  ```ts
  test('recordPressAction (virgin-cycle20 08): zero sports → no-sport (flash + SETTINGS), otherwise arm', () => {
    assert(recordPressAction({ sportCount: 0 }) === 'no-sport', 'zero sports must not arm');
    assert(recordPressAction({ sportCount: 1 }) === 'arm', '1 sport must arm');
    assert(recordPressAction({ sportCount: 3 }) === 'arm', '3 sports must arm');
  });

  test('recordPressAction: the first sport added in SETTINGS becomes active, so the next RECORD press arms', () => {
    const result = addSport(emptySports(), 'Bike', 1_000);
    assert(!Array.isArray(result), `addSport must succeed for a fresh label, got ${JSON.stringify(result)}`);
    if (Array.isArray(result)) return;
    assert(result.activeSportId === result.sports[0].id, 'the first sport added must become the active sport');
    assert(recordPressAction({ sportCount: result.sports.length }) === 'arm', 'once a sport exists the press must arm');
  });
  ```
  Append (the file imports `fs`, `path`, `TESTS_DIR` after 04 — else stop):
  ```ts
  test('virgin-cycle20 08: clutter text is gone (CLUTTER-REVIEW §1 + Nathan\'s §2 answers)', () => {
    const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
    const rec = read('src', 'ui', 'RecordScreen.tsx');
    for (const gone of [
      'the clock runs from here', 'with this sport', 'no sport yet', 'Ready to record.', 'your pick is locked',
      'SET UP A SPORT', 'FirstSportPrompt', 'firstSportPrompt', 'onFirstSport', 'back to setup', 'ready — not started', 'PICK ONE', 'Find it in',
      'waiting for first GPS fix', 'GPS struggling', 'writing history', 'detecting route', 'way locked',
      'Unfinished ', 'Discard for now', 'No sport set up', 'That way already exists', 'Recovered after relaunch', 'nothing was lost on disk', '— last:',
      'Location permission was denied', 'Background location', 'Open app settings', 'warnBox', 'problemStates',
      'statusItemsFor', 'PIN_MS', 'WRITING_HISTORY_AFTER_FIXES', 'gpsFlash', 'flashGpsOff', 'settings.liveMap',
    ]) assert(!rec.includes(gone), `RecordScreen still contains "${gone}"`);
    for (const kept of ["'GPS live'", 'PERM_DENIED_MSG', 'PERM_FOREGROUND_ONLY_MSG', 'PERM_FLASH_HOLD_MS = 5000', 'NO_SPORT_MSG', 'NO_SPORT_FLASH_HOLD_MS = 1000', 'GPS_FLASH_HOLD_MS = 2000', "tabNav.go('settings')", 'recoveryAutoSaveStarted', 'dropStaleSession', 'markRideFree(', 'Activity saved · '])
      assert(rec.includes(kept), `RecordScreen lacks "${kept}"`);
    assert(!fs.existsSync(path.resolve(TESTS_DIR, '..', 'src', 'ui', 'firstSportPrompt.tsx')), 'firstSportPrompt.tsx moved out');
    const flow = read('src', 'ui', 'recordFlow.ts');
    assert(!flow.includes('statusItemsFor') && !flow.includes('open-first-sport') && flow.includes("'no-sport'"), 'recordFlow trimmed');
    const set = read('src', 'ui', 'settings.tsx');
    for (const gone of ['liveMap', 'tower', 'Live map', 'Rankings', 'SCORING', 'Sport picker on RECORD', 'Places & routes', 'shareStoreFile', 'Race your past', 'delete those first', 'two export buttons'])
      assert(!set.includes(gone), `settings still contains "${gone}"`);
    for (const kept of ['Choose sport at start', 'label="Sector colours"', 'hint="Colour sectors on live map"', 'Race yourself', 'Export app', 'shareAppExport', 'qualifire-export-'])
      assert(set.includes(kept), `settings lacks "${kept}"`);
    const det = read('src', 'ui', 'RideDetailScreen.tsx');
    for (const gone of ['personal best sectors', 'pbSectors', 'on file yet', 'not compared to anything', 'sector times not on file', 'recorded only', 'useSettings', 's.tower', '— ref', 'no lap time on file'])
      assert(!det.includes(gone), `RideDetailScreen still contains "${gone}"`);
    assert(det.includes('loadReplayRider') && det.includes('canReplay') && det.includes('>ref</Text>'), 'Replay gated; ref marker kept');
    const hist = read('src', 'ui', 'rideHistoryModel.ts');
    assert(!hist.includes('pbSectors') && hist.includes('· ref`'), 'pbSectors gone; list row keeps its ref marker');
    const rides = read('src', 'ui', 'RidesScreen.tsx');
    for (const gone of ['matching ways', 'Loading…', 'recorded only', 'backfilling', 'Record one', 'NO SPORT YET —']) assert(!rides.includes(gone), `RidesScreen still contains "${gone}"`);
    for (const f of ['ResultsScreen.tsx', 'RoutesScreen.tsx', 'RidesScreen.tsx']) assert(read('src', 'ui', f).includes('NO SPORT YET · ADD ONE IN SETTINGS'), `${f} badge`);
    assert(!read('src', 'ui', 'ResultsScreen.tsx').includes('DO A ROUTE FIRST'), 'RESULTS empty state is the first clause only');
    const rep = read('src', 'ui', 'ReplayScreen.tsx');
    assert(!rep.includes('loading replay') && !rep.includes('never crossed START') && !rep.includes('settings.liveMap'), 'ReplayScreen texts removed');
    const gate = read('src', 'ui', 'GateAdjustScreen.tsx');
    assert(!gate.includes('cannot be edited') && !gate.includes('nudge it') && !gate.includes('Sector gates') && gate.includes('Tap a gate to move it') && gate.includes('discardLabel="discard nudges"'), 'GateAdjust screen strings');
    const card = read('src', 'ui', 'gateAdjustCard.tsx');
    assert(!card.includes('Sector gates') && !card.includes('Seeded at') && !card.includes('keep the proposal') && card.includes("'Tap a gate to move it'"), 'gate card defaults');
    const rd = read('src', 'ui', 'ResultsDetailScreen.tsx');
    assert(!rd.includes('not ranked') && !rd.includes('rankingsOn') && !rd.includes('useSettings'), 'ResultsDetail divider + rankings switch gone');
    const model = read('src', 'ui', 'rideDetailModel.ts');
    for (const kept of ["'not ranked'", "'no rank'", "'too few to rank'", "'no time'", "'no lap'"]) assert(model.includes(kept), `rankLine lacks ${kept}`);
    const naming = read('src', 'ui', 'routeNamingCard.tsx');
    assert(!naming.includes('becomes its reference') && !naming.includes('name where you rode') && !naming.includes('e.g. Dry, Left') && !naming.includes('pick it on RECORD next time'), 'naming card tails removed');
    const demo = read('src', 'ui', 'DemoScreen.tsx');
    assert(demo.includes('Not part of the final app · use only') && demo.includes('demo · nothing is recorded') && !demo.includes('settings.liveMap') && !demo.includes('settings.tower'), 'Demo: only the settled dash + settings reads');
    // Em dashes (Q7): none left in a visible string of these files (alerts excluded by file choice; '—' placeholders are not " — ")
    for (const f of ['RecordScreen.tsx', 'RideDetailScreen.tsx', 'rideDetailModel.ts', 'rideHistoryModel.ts', 'ResultsScreen.tsx', 'RoutesScreen.tsx', 'RidesScreen.tsx', 'ReplayScreen.tsx', 'GateAdjustScreen.tsx', 'gateAdjustCard.tsx', 'routeNamingCard.tsx', 'settings.tsx']) {
      const lines = read('src', 'ui', f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l) && !/Alert\.alert\(/.test(l));
      const hits = lines.filter((l) => /['"`>][^'"`<]*\S — \S[^'"`<]*/.test(l) && !/^\s*(['"`]|\$\{|\\n)/.test(l.trim()));
      assert(hits.length === 0, `${f} still has an em dash in a visible string:\n${hits.join('\n')}`);
    }
    assert(read('src', 'location', 'index.ts').includes("notificationTitle: 'Recording activity'"), 'notification title is the bare noun');
  });
  ```
  (If the em-dash scan flags a line that is part of a multi-line `Alert.alert(` body — e.g. settings'
  `performReset` strings or RecordScreen 946 — add that exact literal to an allowlist **and report
  it**; never loosen the regex silently.)
- `ridehistory_suite.ts`: remove the two `pbSectors` lines (`const s1 = …` and its `assert`); `'Gym → Home — ref'` → `'Gym → Home · ref'` at both pins (154, 233).
- `timing_suite.ts`: in the `buildPbDetail` test remove the four `pbSectors` assert lines; rename the test to `'timing: buildPbDetail orders rides by the scored clock'`.
- `ridedetail_suite.ts`: 93 `startsWith('not ranked — you excluded')` → rewrite as `assert(m.rankLine === 'not ranked', …)`; 108 `'no time — an estimated lap never ranks'` → `'no time'`; 114 `'no rank — this lap is excluded from the comparison'` → `'no rank'`; 134 (post-05) `'not ranked — you excluded this activity from ranking'` → `'not ranked'`.
- `ridenotification_suite.ts`: the `fgOpts.includes("notificationTitle: 'Qualifire — recording activity'")` substring → `"notificationTitle: 'Recording activity'"` (message text unchanged — `'expo-location title must be untouched'` after 03). Pre-05 form (`recording ride`) → stop.

## Verification plan

1. **Failed-before artifact:** append the new test (§12) before any source edit; run
   `cd app && node --experimental-strip-types tests/run.ts 2>&1 | grep -A60 "virgin-cycle20 08"` → FAIL on
   `RecordScreen still contains "the clock runs from here"`. Paste it.
2. Apply §1-§12. `cd app && node --experimental-strip-types tests/run.ts` → **0 FAIL**; total = (total
   after 01/03/04/05) − 3. Report the summary line.
3. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0. (A leftover `settings.liveMap` /
   `s.tower` consumer, or a `FirstSportPrompt` reference, fails here — the blast-radius check working.)
4. Targeted greps (never the whole repo, never `node_modules`) — **all must print nothing**:
   ```
   cd app && timeout 40 grep -n "the clock runs\|with this sport\|no sport yet\|Ready to record\|your pick is locked\|SET UP A SPORT\|firstSport\|back to setup\|ready — not started\|PICK ONE\|Find it in\|waiting for first GPS\|GPS struggling\|writing history ·\|detecting route\|way locked\|Unfinished \|Save ride\|Save activity\|Discard for now\|No sport set up\|That way already exists\|Recovered after\|lost on disk\|— last:\|Location permission was denied\|Background location\|Open app settings\|warnBox\|problemStates\|PIN_MS\|WRITING_HISTORY_AFTER_FIXES\|gpsFlash\|flashGpsOff\|recovered" src/ui/RecordScreen.tsx
   timeout 40 grep -n "statusItemsFor\|open-first-sport\|add-first-sport" src/ui/recordFlow.ts src/ui/RecordScreen.tsx tests/recordflow_suite.ts
   timeout 40 grep -rn "firstSportPrompt\|FirstSportPrompt" src tests App.tsx
   timeout 40 grep -n "settings\.liveMap\|settings\.tower\|s\.tower\|s\.liveMap" src/ui/*.tsx
   timeout 40 grep -n "liveMap\|tower\|Live map\|Rankings\|SCORING\|shareStoreFile\|Sport picker\|Places & routes\|Reference activities\|delete those first\|two export buttons" src/ui/settings.tsx
   timeout 40 grep -n "pbSectors\|personal best" src/ui/*.ts src/ui/*.tsx tests/*.ts
   timeout 40 grep -n "ADD ONE IN SETTINGS —\|NO SPORT YET —\|DO A ROUTE FIRST\|matching ways\|Loading…\|recorded only\|loading replay\|never crossed START\|cannot be edited\|not ranked</\|Sector gates\|keep the proposal\|keep the current gates\|Seeded at\|becomes its reference\|name where you rode\|e.g. Dry, Left\|pick it on RECORD next time\|no lap time on file\|— ref" src/ui/*.tsx src/ui/*.ts
   timeout 40 grep -n "Qualifire —\|recording ride\|recording activity" src/location/index.ts tests/ridenotification_suite.ts
   ```
   Surviving-by-design check: `timeout 40 grep -c "—" src/ui/tower.tsx src/ui/towerModel.ts src/ui/resultsListModel.ts src/ui/DemoScreen.tsx` → tower/towerModel/resultsListModel unchanged from HEAD; DemoScreen = HEAD − 1 (line 811 only).
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → exactly the files in §Executor rules (`D app/src/ui/firstSportPrompt.tsx` included; `safe_to_delete/` is gitignored), plus whatever 01/03/04/05 left. `git diff --stat` shows nothing under `src/live`, `src/store`, `src/storage`, `modules/`, `app.json`.
6. Inspect (fresh Opus): reruns 1-5; reads the RecordScreen diff and confirms (i) `onRecord`/`onStart`
   still `return` on `denied`/`services-off`, (ii) the dead-service recovery branch has no
   `Alert.alert`, calls `stopTracking` then `markRideFree` with the session's `startedAtMs`/`sportId`,
   is guarded and try/caught, (iii) `mapOverlay` survived, (iv) `dropStaleSession` has no
   `syncShowWhenLocked()` and `lockscreen_suite` still passes, (v) `Settings` has no `tower`/`liveMap`
   and the two scrub lines exist, (vi) the no-sport path clears its timer on unmount, (vii) every
   removed em-dash string is either deleted or cut at its first clause — no ` · ` rewrite except the
   two `ref` markers and the three badges.

## On-device checklist — Nathan (OTA is enough for this brief; build 8 if shipped with 01/03)

1. **Virgin RECORD** (Reset app, reopen): under RECORD the slogan `same activity · new meaning`; no
   form, no label. Press RECORD → `No sport configured yet` flashes under RECORD for ~1 s, then the
   app is on SETTINGS with the SPORTS card in view; type a sport, `add sport`; back to RECORD → press
   RECORD → arms as before.
2. **Setup with a sport:** no `Ready to record.`; pick a route with 2+ ways → the pills show, **no**
   `your pick is locked…` under them; start label `START NOT DETECTED` when nothing is detected.
3. **Permission denied** (phone Settings → Apps → Qualifire → Permissions → Location → Don't allow):
   press RECORD → `Location permission not granted` flashes under RECORD for ~5 s and fades, you stay
   on setup, **no banner**. Allow "while using", arm; deny again from a split screen and press START →
   same 5 s flash under START, nothing starts.
4. **Foreground-only** (Location → "Only while using"): RECORD → armed (no banner); START → recording
   starts; under the sector pane `ALLOW LOCATION ALL THE TIME` shows ~5 s then fades to `GPS LIVE` (or
   blank). Set "Allow all the time" afterwards.
5. **GPS off**: RECORD / START → `Location (GPS) is turned off` flash, still 2 s.
6. **Armed screen:** START shows only `START`; the line above the map is `Home → Work · Dry` with no
   "ready — not started"; the bar reads `‹ cancel`.
7. **Running:** the slot under the pane shows `GPS LIVE` once fixes arrive and is **blank** before;
   wrap the phone / go indoors — blank instead of "last fix 9s ago"; no route/way line at lock. PAUSE
   unchanged (brief 04). Ending screen: `Activity saved · 12:34`.
8. **Interrupted recording — how to force it:** press RECORD, then START, walk ~1 min. Now **do not
   swipe the app away** (the foreground service survives a swipe and the app simply resumes). Instead:
   Android Settings → Apps → Qualifire → **Force stop** (confirm). The notification disappears. Reopen
   Qualifire: **no dialog**; RECORD's setup screen reads `Activity saved · 1:0x`; open ACTIVITIES →
   the activity is listed under **FREE ACTIVITIES** (row `Free activity`), its detail shows the
   FREE ACTIVITY card with the map and no lap/sectors, and it does **not** appear in RESULTS (not
   under the route you were on, no rank). Repeat once: the second launch finds nothing (no second
   entry). Swipe-away test (service survives): reopen → live screen resumes, no amber line.
9. **ACTIVITIES:** no `matching ways…` / `Loading…`; an unmatched activity's row shows only the date
   line; a reference activity's row reads `Home → Work · ref`; empty state `No activities yet`; badge
   `NO SPORT YET · ADD ONE IN SETTINGS` after a reset.
10. **Activity detail:** ON THIS WAY = `last N on this way` + rows, **no** `personal best sectors`;
    rank line is a bare `not ranked` after excluding one (`no rank` / `too few to rank` / `no time` /
    `no lap` in the other cases); free card without the "no lap, no sectors…" line; unmatched card
    without "recorded only" / "sector times not on file"; reference card: way label, then `ref`, no
    sentence. **Replay** button present on a normal matched activity, **absent** on a free one and on
    one that never crossed START.
11. **Replay:** map immediately (blank for a split second, no "loading replay…").
12. **RESULTS:** `NO RESULTS YET` on a virgin install; a route detail with an unranked activity shows
    `—` in the position column and **no** `not ranked` divider; the plot caption `P3 of 9` appears when
    a point is selected.
13. **ROUTES › way › edit gates:** header is the way label alone, `Tap a gate to move it`,
    `discard nudges`. After an activity the proposal card has **no header**, `Tap a gate to move it`,
    `discard nudges`; naming card: `New route`, sentences end at "… as a new way." / "… a way of its
    own." / "… a real way.", `SPECIFICATIONS (optional)`, the duplicate line ends at the names.
14. **SETTINGS:** `?` icons only on Sector colours (hint `Colour sectors on live map`), Race yourself
    (hint `Race selfs dots on live map`, *selfs* italic), Gate buzz, Day from; `Choose sport at start`
    with 2+ sports, no `?`; **no Live map row**; **no SCORING section**; DATA = `Export app` + `Reset app`,
    no `?`; a used sport's expanded row shows no "— delete those first" line (the active one still says
    `switch to another sport first`). Export app → `qualifire-export-YYYYMMDD.json` with `kind`,
    `schemaVersion`, `exportedAtMs`, `catalog`, `refs`. Reset confirm ends `… or Export app above).`
15. **DEMO:** `Not part of the final app · use only for testing features.`; everything else as before;
    map always shows.
16. **Notification:** title `Recording activity` (no "Qualifire —"), body from 03, plain card from 01.
Paste screenshots of 1, 3, 4, 7, 8, 10, 14 into this folder's `PROGRESS.md`.

## Risk areas — and when to stop

- **Silent free-activity recovery (Decision 5).** The only new behaviour that touches data. New code
  paths: the guard, `markRideFree` after `stopTracking`, the try/catch, `dropStaleSession`. **Stop if:**
  `stopTracking`'s tail in `index.ts` does not read exactly `await clearSession(); session = null; sessionLoaded = true; liveEngine.stop(); emit();`;
  or `endRide`'s unknown-ride message is not `endRide: unknown ride`; or `markRideFree`'s signature is
  not `(rideId, startedAtMs, durationS, sportId)`; or `tests/lockscreen_suite.ts` fails after the
  index.ts edit; or `rideHomes.ts backfillCandidates` no longer excludes free rides (then the free mark
  would not keep the activity off a way — report, do not patch).
- **No-sport navigation (Decision 2).** **Stop if** `tabNav.go` is not `(tab: Tab) => void` with
  `'settings'` a valid `Tab`, or SETTINGS' SportsSection does not render its add box with zero sports.
- **Live map / Rankings removal.** Bounded by `tsc`. **Stop if** `tsc` reports a `liveMap`/`tower` read
  in a file not in §Executor rules.
- **Foreground-only flash in the status slot (Decision 3).** Purely display; Nathan said he will test
  the 5 s and revisit.
- **Em-dash scope (Decision 10).** Alerts untouched; brief 09's inventory lists them.
- **Brief 05's "ride" scanner** runs over `src/ui/*`; no new visible literal here contains "ride".

## Out of scope

- Brief 09 (guardrails: the approved-strings inventory test) — generated after this lands; it should
  include the alert prose for Nathan's ruling.
- DemoScreen texts (D8), `demoModel.ts`.
- Alert bodies/titles and store error strings (Decision 10).
- The "GPS live" alternating-texts idea (Nathan: nothing to implement yet); `boardCaption`'s now-dead
  `rankingsOn=false` branch and its `resultsmodel_suite` pin (model untouched); `recordPressAction`
  callers outside RecordScreen (none).
- `STATE.md` / `OPEN-ITEMS.md` updates (coordinator): Live map and Rankings are no longer settings;
  the interrupted-recording dialog is replaced by a silent free-activity save; the first sport is
  added in SETTINGS (RECORD hands over); DATA export is one file; the notification title is
  `Recording activity` (supersedes 01/03/05's title lines).

## Open call for Nathan (executor does NOT act on it)

- **The two "ref" markers (Decision 9).** With the sentences gone, `ref` is the only thing that says
  "this is the way's reference activity": the detail card shows it as its own line, the ACTIVITIES row
  title as `Home → Work · ref`. Say "drop them" and both go (one line each) — then nothing on either
  screen distinguishes a reference activity from an ordinary one.

## Report back

- The §Decisions check: each Q1-Q11 `Answer:` line still matches its paraphrase (else stop).
- Verification 1's FAIL line (before), the final summary line (after), `tsc` exit code.
- Every grep from Verification 4, each empty (or the offending line, verbatim — and stop).
- `git status --porcelain`, `git diff --stat`, `ls safe_to_delete/virgin-cycle20-08/`.
- Any anchor found only in its pre-05 form, verbatim — and stop there.
- Any em-dash allowlist entry the suite test needed (file:line, verbatim).
- Reminder line for the coordinator: "JS-only, OTA-able; sequenced after 01/03/04/05; test count net −3;
  notification title now `Recording activity` — supersedes the title lines in 01/03/05".
