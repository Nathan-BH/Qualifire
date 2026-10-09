# 12 — Last known location and auto-start digest

Date: 2026-10-08. Read-only digest, no code changed. Anchors are the working tree as on disk when read. `git status --short` at run time showed only the untracked `cycles/virgin-cycle27/`, so the "uncommitted cycle26 changes" note is not reconciled here. Line numbers may differ from older digests (e.g. 01-record-smart-pairing-digest.md, cycle20 brief 11), and some have drifted by 1-2 lines.

## TL;DR
- Nothing persists a position. The only remembered fix is in memory (location/index.ts:110-112), lives for one JS launch, and is null after a relaunch.
- RECORD ME with no fix: mode `follow`, `here` null, route bounds present, so cameraTargetFor centres the route bounds at zoom 16 (wayMapGeo.ts:422-445, wayMapView.tsx:715-725, :1019-1023). That is the "middle of the route line". No blue dot because the rider layer needs `showRider && here` (wayMapView.tsx:982).
- The auto-start toggle is the Settings "Start place" segmented control `detect | choose` (settings.tsx:653-659), key `startMode` in settings.json, default `'auto'`.
- The pill checkmark is `' ✓'` on the pill whose landmark equals the GPS-detected landmark (RecordScreen.tsx:1588). It does not check startMode, so it also shows in `choose` mode.
- Removing the toggle touches RecordScreen.tsx:1151 and :1575-1581, recordFlow.ts:63-71, settings.tsx:33/63/80-120/655-659, recordflow_suite.ts:60-109, and cycle27 brief 11 line 32.
- No rider dot can appear on any activity map today. Every activity mount passes `showRider={false}` with lat/lon null.

## A. Last known location

### A1. What remembers a position
1. In-memory last fix, location/index.ts. Fields at :68-69 (TrackerStatus) and :110-112 (module state, comment :10-11 says never persisted). Written at :259-261 (ride fix append), :485-487 (refreshPositionOnce), :528-530 (refreshPositionIfPermitted). Holds lat, lon and `lastFixMs` (expo timestamp). Accuracy is not kept. Survives a JS relaunch: no. Reset: `lastFixMs` to null in startTracking (:445); lastLat/lastLon are deliberately not reset there (:440-444); stopTracking (:549+) assigns neither. Age limit: none. RecordScreen.tsx:1143-1145 (detected landmark) and the armed-map dot use it with no age check.
2. Ride fixes on disk, rides/<rideId>.jsonl (storage/core.ts:4, :71). Each fix holds lat, lon, accuracyM, tUnixMs. Survives restart: yes. No map code reads a "last position" from it. RideMeta (storage/types.ts:65-74) and index entries carry no coordinates.
3. Active-session marker (location/session.ts, sessionMarker.ts). On disk while recording. Field list not enumerated (uncertain whether it stores coordinates).
4. settings.json (settings.tsx:80). Holds no position.
5. Landmarks/places (store/types.ts:28 radiusM; catalog seed and catalog.user.json, catalogStore.ts:42). Fixed places, not the device's last position. Whether user-created landmarks take a fix position (store/routeCreation.ts) was not traced.
6. Trail (RecordScreen.tsx:320, :408-413). In memory, reset at START, discard and ending.
7. expo-location getLastKnownPositionAsync or getLastPosition: no matches in app/src. Not used.
8. AsyncStorage, MMKV, SecureStore: none in app/src. Persistence is file-based (storage/expoFsAdapter.ts:9).

### A2. ME on the RECORD map and the MAP tab
RECORD armed (setup, prestart) map, RecordScreen.tsx:1270-1278:
- `WayMapView` with wayId = pickedWay?.refLineId, lat/lon = status.lastLat/lastLon, zoom=1, variant live, liveState prestart, fill. No `showRider` prop, so it defaults to true (wayMapView.tsx:407).
- initialMode is `fit` for prestart (wayMapView.tsx:426-427). The mode resets on phase, zoom, variant or way change (:437-440).
- The zoom bar shows only when `oneFingerOn` (:409), which is `gestures === 'full'`, the default (:408). So ME is visible.
- The ME/FIT label comes from fitMeNextMode (wayMapGeo.ts:488-493): `fit` or `free` reads ME, `follow` reads FIT. Tap sets `follow` (wayMapView.tsx:1019-1023).
- Camera in `follow` with no fix (`here` null) and a route bounds box: wayMapGeo.ts:437-443 returns `center` = midpoint of the bounds, `zoom` = camZoom (initial 16, wayMapView.tsx:442), duration 500. That is the mid-route-line result.
- Camera in `follow` with no fix and no route bounds (no way picked): cameraTargetFor returns `{}`, so the camera holds.
- Camera in `follow` with a fix: `center` = the fix at camZoom (wayMapGeo.ts:434-436). Rider dot drawn via rider-dot layer (wayMapView.tsx:982-997).
- First load of the armed map: `fit` with bounds fits the route (wayMapGeo.ts:428-434). With no way but a fix, it centres on the fix at zoom 16. With neither, no target. The only visible no-fix cue is the "waiting for GPS" badge (wayMapView.tsx:1048-1049).
RECORD running map, RecordScreen.tsx:1419-1430: lat = riderDot ?? status.lastLat (riderDot is from riderDotModel.ts). Live mode.
MAP tab, catalogMapView.tsx:
- Mode starts `fit` (:156) and resets to `fit` on focus or style change (:160-162).
- `cameraTargetFor({ mode, here: null, bounds, zoom: 14 })` (:164-165). `here` is hardcoded null.
- bounds = route?.bounds ?? place?.bounds ?? overview.bounds. First load fits that box.
- No ME button and no rider props or rider layer in this file (grep: none).

### A3. refreshPositionIfPermitted() and refreshPositionOnce()
refreshPositionIfPermitted (location/index.ts:510-545):
- Calls `getForegroundPermissionsAsync` (check only). If not granted, returns `'no-permission'` (:514-515) and writes nothing.
- Calls `hasServicesEnabledAsync`. If off, returns `'no-services'` (:516).
- Otherwise calls `getCurrentPositionAsync({ accuracy: Balanced, mayShowUserSettingsDialog: false })` (:522-525). This is a fresh fix request, not the OS last-known position. It never prompts (comment :494-499).
- On success it writes lastFixMs/lastLat/lastLon (:528-530) and emits. The JS timeout is 20 s (positionRetryPolicy.ts:39). A late native fix is still applied. Timeout returns `'failed'`.
- Callers: RecordScreen mount (:343), app foreground (:352-355), setup/armed poll (positionRetryPolicy.ts:33-35, delays 2-5 s, 60 s budget), and the RECORD press (see below).
refreshPositionOnce (location/index.ts:482-492):
- No permission or services check. Default dialog flag, so `mayShowUserSettingsDialog` is true. Errors swallowed.
- Only caller: RecordScreen.tsx:672 in onRecord, after `ensurePermissions()` returned something other than denied or services-off (:664-669).
Result: no code path reads an OS last-known position. With location off, the app has no fallback position.

## B. Auto-start toggle and pill checkmark

### B1. The toggle
- Row label "Start place" (settings.tsx:655), inside the "STARTING AN ACTIVITY" card (:653-660).
- Control: `Seg` with options `['auto','detect']` and `['pick','choose']` (:656-658). Two-option segmented control, not an on/off Switch. The Row has no hint prop (:655). Any help text was not traced.
- Type: settings.tsx:33 `startMode: 'auto' | 'pick'`. Default `'auto'` (:63).
- Storage: settings.json at documentDirectory (:80). Loaded at :82-107 (retired keys are scrubbed at :100-103; startMode is not). Saved after every change (:116-120).
- Read sites: RecordScreen.tsx:1151 (effectiveFromId argument) and :1575 (STARTING FROM / DETECTED START label switch). How RecordScreen gets `settings` was not traced.

### B2. The checkmark
- RecordScreen.tsx:1583-1590: the pill map over `startable`. Class pillOn when `fromId === l.id` (:1586). The glyph is appended at :1588: `{l.label}{detected?.id === l.id ? ' ✓' : ''}`.
- Condition: the pill whose landmark equals `detected`. It does not read startMode, so it shows in `choose` mode too.
- `detected` (RecordScreen.tsx:1143-1145) = `landmarkAt(CATALOG, lastFix, Date.now())`. landmarkAt (store/catalog.ts:141-157) returns the nearest landmark that is active now and whose radiusM contains the fix. No separate distance threshold.
- Related labels: "DETECTED START" (RecordScreen.tsx:1576-1577), "STARTING FROM" (:1579, :1581), "START NOT DETECTED" (:1580). Auto-mode only.

### B3. What auto-detect does
- Detection is derived each render from status.lastLat/lastLon (RecordScreen.tsx:1143). It updates on every status emit (each fix, and each refreshPositionIfPermitted that writes a fix). No timer and no check only on open.
- effectiveFromId (recordFlow.ts:63-71): if startMode !== 'auto' or fromExplicit, return `from`; otherwise return `detectedId ?? from`.
- fromExplicit is set true by pickFrom (RecordScreen.tsx:283-284) on any START pill tap. It is cleared by pickSport (:297), ride end (:810) and discard (:1046). Once set, `from` sticks even if detection changes or goes null (recordFlow.ts:61-62). Ride end and discard leave `from` and `to` alone (consistent with cycle27 digest 01).
- Toggle on (`auto`): the pill follows the detected landmark until a tap. With no detection, the previous `from` stays.
- Toggle off (`choose`): detection is never consulted for fromId (recordFlow.ts:69). The checkmark still shows.
- cycle20 brief 11 (cycles/virgin-cycle20/11-auto-detect-start-place.md:94-99) matches the code at current lines. Its retry numbers (2-5 s, 60 s) match positionRetryPolicy.ts:33-35.

### B4. Everything that reads or writes the setting
- settings.tsx:33, :63, :80-120, :655-659 (definition, default, persistence, UI).
- RecordScreen.tsx:1151, :1575 (readers).
- recordFlow.ts:63-71 (effectiveFromId).
- app/tests/recordflow_suite.ts:60-64 (startMode 'pick'), :71-82 and :88-109 (startMode 'auto').
- app/tests/ui-strings.allow.json:3079 ("Start place", attr:label), :770 ("DETECTED START"), :810 ("START NOT DETECTED"), :818 ("STARTING FROM"). The ✓ glyph has no allowlist entry (it sits in a JSX expression; scanner coverage uncertain).
- Docs: cycles/virgin-cycle20/11-auto-detect-start-place.md:4, :94-95; cycles/virgin-cycle27/11-brief-record-pairing.md:9, :32; cycles/virgin-cycle27/15-rulings-after-plan.md:8 (ruling 1.2). STATE.md, GLOSSARY.md, HOW-THE-APP-IS-BUILT.md: no matches for startMode, Start place or auto-detect.

### B5. cycle27 pairing brief (11-brief-record-pairing.md), lines for a planner to amend (not amended here)
- :9 Q1.2 text. Ruling 1.2 (15-rulings-after-plan.md:8) answers (a), so the "(b) STOP" branch is moot. Record the ruling here.
- :28-30 pickFrom, pickSport, ride-end setFromExplicit. Keep.
- :32 `effectiveFromId({ startMode: settings.startMode, ... })`. This is the one toggle dependency. Must drop the startMode argument (always auto) or change the helper.
- :137-138 setToExplicit additions. Unaffected.
- :219 rider-facing copy ("from the detected/first START place"). Still accurate once the toggle is gone.
- The brief does not mention the checkmark (no matches for checkmark or ✓), nor the Settings row, nor the STARTING FROM / DETECTED START labels. An amendment needs to add: remove settings.tsx:653-660; remove ' ✓' at RecordScreen.tsx:1588; remove or scrub startMode in settings.tsx (type, default, load scrub like :100-103); simplify recordFlow.ts:63-71 and recordflow_suite.ts:60-64 (the 'pick' cases become obsolete); decide whether the DETECTED START / STARTING FROM labels at :1575-1581 stay; retire ui-strings allow entry :3079 if the row is removed.

## C. No dot on activity maps
- ActivityCard feed card: activityCard.tsx:87-100. WayMapView variant browse, lat null, lon null, `showRider={false}`, trail only when `card.needsTrail` (:97). No selfs prop in these lines.
- RideDetailScreen route map: RideDetailScreen.tsx:451-458. browse, lat null, lon null, `showRider={false}` (:458). Lines beyond :462 not read. No-route variants at :500, :512, :528: browse, lat/lon null, `showRider={false}`, trail = fixes.
- Gate-adjust card: gateAdjustCard.tsx:147-153. lat null, showRider false.
- Catalog detail: CatalogDetailScreen.tsx:236-242 (showRider false), :408 (lat null, showRider false).
- MAP tab: catalogMapView.tsx has no rider prop or layer; `here` is hardcoded null (:165).
- The rider-dot layer (wayMapView.tsx:982-997) needs `showRider && here`. Both are false or null at every activity mount, so no dot can appear today. Only a prop change at those mounts would add one.
- Mounts that do show a rider: RECORD armed, prestart and running (RecordScreen.tsx:1270, :1419, :1539). Replay (ReplayScreen.tsx:232-236) passes replay position, so it shows a replay dot, not a location dot.
- "Day-mode": no map mode of that name was found. The only day/night setting is the theme (settings.tsx:612-614). Assumed to mean theme; uncertain.

## Unverified / uncertain
- Whether stopTracking or the RECORD ride-end path clears status.lastLat. Not cleared in location/index.ts; RecordScreen's ride-end handling was not traced. So the armed map may still show the previous ride's last fix after END (plausible, untested).
- The help text for the "Start place" row, and how RecordScreen obtains `settings`.
- Active-session marker fields (location/session.ts, sessionMarker.ts).
- Whether user-created landmarks take a fix position (store/routeCreation.ts).
- The checkmark's allowlist coverage in ui-strings scanner.
- All location behaviour is [UNTESTED ON DEVICE] per the code comments at location/index.ts:479-481 and :494-508. The "location off = no dot" conclusion is from code, not a device run.
- Repo state: the uncommitted cycle26 changes are not visible in git status at run time.
