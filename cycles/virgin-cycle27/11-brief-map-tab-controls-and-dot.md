# Brief 8-9 — MAP/ROUTES tab map: +, −, FIT/ME, two-finger rotate, blue dot; every map: `↑` retired, FIT resets north

Written by the Plan tier (Fable) 2026-10-08 ~02:05 UTC from `10-plan.md` §8+9 and digests 07 + 08; every anchor re-read in the working tree (suite baseline `940 tests: 937 pass, 0 fail, 3 skip`). Executor: Sonnet, alone. Read `EXECUTOR-RULES.md`. **Status: APPROVED (Nathan 2026-10-09 00:24) — read the AMENDMENT at the end first (rulings 8.1 / 8.2 + the last-known-location ruling). cycle26 brief 04 IS committed (`a7834cd`); runs 8th, before brief 6** (it rewrites `wayMapView.tsx`; re-read every §2 anchor in `wayMapView.tsx` by content before editing — line numbers below are pre-cycle26-04) **and before cycle27 brief 6.**

## 0. Rules
- STOP-ON-AMBIGUITY → `cycles/virgin-cycle27/12-brief-08-executor-report.md` `## STOPPED`.
- **Nathan's rulings (2026-10-08 01:19 / 01:22 / 01:25, verbatim in `00-nathan-ideas.md`):** "lets have the fit option reset the bearing so we can retire the north arrow"; "ME should function as it is now, so it should not touch the bearing and keep heading during the ride"; "fit button never exists in isolation i think, it is always coupled with ME … so it makes sense to have it together on the MAP tab as well" + the blue dot "if location is on and i am looking at the MAP tab".
- ~~BLOCKED UNTIL NATHAN RULES~~ **RULED (8.1 last-known location, 8.2 = a + no dot on activity maps) — see the AMENDMENT section A0; kept for the record:**
  - Q8.1 MAP-tab ME with no position (location off / never granted / no fix yet): (a) the toggle simply reads FIT and nothing is said or asked [recommended; this brief]; (b) ME shown, tap requests permission (a second prompt site); (c) ME shown but inert.
  - Q8.2 dot freshness: (a) one quiet read when the tab opens + one on each ME tap [recommended; this brief]; (b) a 5 s poll while the tab is visible.
  - Q8.3 (informational, recorded): FIT on a FINISHED live map after a rotate also drops the held course-up — north stays through a later ME, exactly as `↑` did (sticky `userBearing = 0`). (a) accept [this brief].
- **Never prompt for permission from this tab**: only `refreshPositionIfPermitted()` (checks, never requests — `location/index.ts:493-530`). RECORD remains the only place that asks (`ensurePermissions`).
- **Visible text:** exactly three allow-list hunks (§6): REMOVE `Reset map to north up`; ADD `FIT` and `ME` for `src/ui/catalogMapView.tsx` (entries are keyed per file). Anything else reported by the `ui_strings` suite → STOP.
- No new GeoJSON source in `WayMapView`; in `catalogMapView.tsx` the one new `rider` source is mounted LAST (dot on top — cycle21's rule). Never delete; no commit; no publish; no dependency; strip-only TS; `GIT_OPTIONAL_LOCKS=0`.

## 1. Purpose
- **All `WayMapView` maps** (`wayMapView.tsx`): the `↑` button goes; the FIT branch of the single FIT/ME toggle now calls `resetNorth()` before `setMode('fit')` — FIT = "↑ then FIT" of yesterday, one existing mechanism, no new state. ME untouched. Rotation scope unchanged (`rotateEnabledFor`: browse / prestart / finished).
- **MAP tab** (`catalogMapView.tsx` + `RoutesScreen.tsx`): rotation on; `⤢` → the same FIT/ME toggle (`fitMeNextMode`); FIT = fit the catalog bounds north-up (today's rule); ME = centre on the rider at zoom `max(15, current)` keeping the current bearing; a blue `rider-dot` (same paint as `WayMapView`'s) when the shared location store has a position; a quiet, non-prompting read on tab open and on each ME tap.

## 2. Verified anchors (2026-10-08 ~01:40 UTC — `wayMapView.tsx` lines are PRE-cycle26-04; match by content)
- `app/src/ui/wayMapView.tsx`: `:28`, `:80-82`, `:468` comments mention the compass button; `:489-498` `const resetNorth = () => { setUserBearing(0); … cameraRef.current?.setStop({ bearing: 0, duration: 400, easing: 'ease' }); … };` `:691` `const fitMeNext = fitMeNextMode(mode, showRider);` `:996-1001` the toggle:
  ```tsx
          <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
            onPress={() => setMode(fitMeNext)}>
            {fitMeNext === 'fit'
              ? <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
              : <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>}
          </Pressable>
  ```
  `:1002-1015` the `{/* WP-M: compass reset … */}` comment + `{rotateEnabled ? ( <Pressable … onPress={resetNorth} accessibilityLabel="Reset map to north up"> … ↑ … ) : null}` block; `:1016` `</View>` closes the bar; `:959-975` the `rider` source + `rider-dot` layer paint (copy its paint values).
- `app/src/ui/wayMapGeo.ts:396-404` doc comment ("until the compass button explicitly sets it back to 0 …"); `:430-436` fit pins `bearing: userBearing ?? 0`; `:481-483` exact: `export function fitMeNextMode(mode: 'follow' | 'fit' | 'free', showRider: boolean): 'fit' | 'follow' { return showRider && mode !== 'follow' ? 'follow' : 'fit'; }` and its doc `:467-480`.
- `app/src/ui/catalogMapView.tsx`: `:18` `import { useEffect, useMemo, useRef, useState } from 'react';` `:27` `import { cameraTargetFor, gateHalfLenM, gateTicksFeatureCollection } from './wayMapGeo.ts';` `:32` `import { colors } from './theme.ts';` `:79-91` `CatalogMapViewProps` (ends `onPressEmpty: () => void;` `:91`); `:94` `type RegionDidChangeEvent = { nativeEvent: { userInteraction: boolean; bearing: number; zoom: number } };` `:156-157` `const [mode, setMode] = useState<'fit' | 'free'>('fit');` / `const [liveZoom, setLiveZoom] = useState<number | null>(null);` `:160-162` the focus/style effect `setMode('fit')`; `:163-169` `cameraProps` with `cameraTargetFor({ mode, here: null, bounds, zoom: 14, bearing: 0 })`; `:235-238` `zoomBy`; `:248-254` `onRegionWillChange` / `onRegionDidChange`; `:263` `touchRotate={false}`; `:336` `</M.Map>` after the `catalogPins` source; `:338-351` the zoom bar with `⤢` at `:347-350`; `:352` `<Credit rung="maplibre" locked={false} />`; `:364-370` styles.
- `app/src/ui/RoutesScreen.tsx`: `:19` `import { useEffect, useMemo, useState } from 'react';` `:21-23` store imports; `:89-99` `<CatalogMapView … onPressEmpty={toOverview} />`.
- `app/src/location/index.ts`: `:63-71` `TrackerStatus { …; lastLat: number | null; lastLon: number | null; … }`; `:148-150` `getStatus()`; `:152-157` `subscribe(fn)`; `:493` `export async function refreshPositionIfPermitted(): Promise<QuietRefreshOutcome>` (never prompts). RecordScreen imports them from `'../location'` (`RecordScreen.tsx:24-35`).
- `app/src/ui/wayMapGeo.ts:88-94` `riderFeature(lat, lon)`.
- Tests: `tests/waymap_suite.ts:319-331` (exactly one `onPress={resetNorth}` in the bar) and `:387-403` (`compass untouched`, four Pressables); `tests/catalogmap_suite.ts` (`src()` helper, last test ends `:250`; `:221-225` RoutesScreen pin); `tests/waymapgeo_suite.ts:468-481` (`userBearing` tests — unchanged, still valid).
- Allow-list entries: `src/ui/wayMapView.tsx | attr:accessibilityLabel | Reset map to north up`; `src/ui/wayMapView.tsx | text | FIT`; `… | text | ME`. None yet for `catalogMapView.tsx` except the font and two style URLs.

## 3. Edits — `WayMapView` (every other map)

### 3.1 `src/ui/wayMapView.tsx`
1. Toggle press (`:997`): `onPress={() => setMode(fitMeNext)}` → `onPress={() => { if (fitMeNext === 'fit') resetNorth(); setMode(fitMeNext); }}`. Replace the comment block above it (`:989-995`, "virgin-cycle22 06 …") by appending: `virgin-cycle27 08 (Nathan 2026-10-08): FIT also resets north — it calls resetNorth() (sticky userBearing 0, the old ↑) before fitting, so the ↑ button is retired; ME never touches the bearing.`
2. Remove the whole `↑` block: the comment `{/* WP-M: compass reset — … */}` and `{rotateEnabled ? ( <Pressable … accessibilityLabel="Reset map to north up"> … </Pressable> ) : null}` (`:1002-1015`). Keep `resetNorth` (`:489-498`), `rotateEnabled`, `userBearing`, `onRegionDidChange`, `touchRotate={rotateEnabled}` — all still used.
3. Comments: `:28` "rotation + compass reset everywhere except moving/stopped" → "rotation everywhere except moving/stopped; FIT resets north (virgin-cycle27 08)"; `:80-82` "A compass button in the MapLibre zoom bar (…) resets it to" → "FIT in the zoom bar (virgin-cycle27 08; was a compass button) resets it to"; `:468` "until the compass" → "until FIT (virgin-cycle27 08)". Comment-only; if cycle26 04 changed the wording, adapt or skip and say so.
4. Verify `rotateEnabled` is still referenced elsewhere after the removal (it is: `touchRotate={rotateEnabled}`, the `userBearing` clear effect, `onRegionDidChange`). If tsc reports it unused, STOP.

### 3.2 `src/ui/wayMapGeo.ts:396-404` comment: "until the compass button explicitly sets it back to 0" → "until FIT explicitly sets it back to 0 (virgin-cycle27 08 — the compass button is gone)". No code.

## 4. Edits — the MAP tab

### 4.1 `src/ui/catalogMapView.tsx`
1. `:27` → `import { cameraTargetFor, fitMeNextMode, gateHalfLenM, gateTicksFeatureCollection, riderFeature } from './wayMapGeo.ts';`
2. Props (`:79-91`): add after `sheetPad?: number;`:
```ts
  /** virgin-cycle27 09 (Nathan 2026-10-08): the rider's last known position from the shared
   * location store — a blue dot and the ME half of the toggle; null = no dot, toggle reads FIT. */
  here: { lat: number; lon: number } | null;
  /** called on each ME tap so the owner can refresh the position quietly (never prompts) */
  onMe?: () => void;
```
3. State (`:156-157`): `useState<'fit' | 'free'>('fit')` → `useState<'fit' | 'free' | 'follow'>('fit')`; add `const [liveBearing, setLiveBearing] = useState(0);`
4. `cameraProps` (`:163-169`) → 
```ts
  const followZoom = Math.max(15, liveZoom ?? 15);
  const cameraProps: Partial<CameraStop> = {
    ...cameraTargetFor({ mode, here: mode === 'follow' ? props.here : null, bounds, zoom: followZoom, bearing: liveBearing }),
    ...(mode === 'fit' && bounds
      ? { padding: { top: 48, right: 48, bottom: props.sheetOpen ? (props.sheetPad ?? 300) : 48, left: 48 } }
      : {}),
  };
```
(`cameraTargetFor`: 'fit' pins bearing 0 — FIT resets north with no extra code; 'follow' with `here` centres at `zoom` with `bearing: liveBearing` — ME keeps the rotation; 'free' = `{}`.) Add a comment line: `// virgin-cycle27 08+09: FIT = bounds, north-up (the fit rule); ME = centre on the rider at street zoom, bearing untouched (Nathan: ME never touches the bearing).`
5. `onRegionDidChange` (`:251-254`): also `const b = e?.nativeEvent?.bearing; if (typeof b === 'number') setLiveBearing(b);`
6. `:263` `touchRotate={false}` → `touchRotate` (MapLibre default true; same as every other map). Comment: `// virgin-cycle27 08: two-finger rotate on, like every other map (cycle24 had it off with no recorded reason).`
7. Rider source — insert directly before `</M.Map>` (`:336`), after the `catalogPins` source, so it is the LAST source:
```tsx
        {/* virgin-cycle27 09: the rider — same paint as WayMapView's rider-dot, always the topmost layer. */}
        {props.here ? (
          <M.GeoJSONSource key="rider" id="rider" data={riderFeature(props.here.lat, props.here.lon)}>
            <M.Layer id="rider-dot" type="circle" paint={{
              'circle-radius': 7,
              'circle-opacity': 0.85,
              'circle-color': colors.riderBlue,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2,
            }} />
          </M.GeoJSONSource>
        ) : null}
```
(No off-route variant here: the MAP tab has no way to be off.)
8. Zoom bar (`:347-350`): replace the `⤢` Pressable with the coupled toggle, literal JSX text as in `WayMapView`:
```tsx
        {/* virgin-cycle27 08+09: ONE FIT/ME toggle (fitMeNextMode), labelled with the NEXT action; with no
            position (location off, never granted, no fix yet) it always reads FIT and nothing is said. */}
        <Pressable style={[st.zoomBtn, { backgroundColor: t.race.card, borderColor: t.cardBorder }]}
          onPress={() => { if (fitMeNext === 'follow') props.onMe?.(); setMode(fitMeNext); }}>
          {fitMeNext === 'fit'
            ? <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>FIT</Text>
            : <Text style={[st.zoomText, { color: t.textDim, fontSize: 10.5 }]}>ME</Text>}
        </Pressable>
```
and above the `return` add `const fitMeNext = fitMeNextMode(mode, props.here !== null);`. `zoomBy` (`:235-238`) stays (`+`/`−` set `free`, as today on this map).
9. The focus/style effect (`:160-162`) stays `setMode('fit')`.

### 4.2 `src/ui/RoutesScreen.tsx`
1. Add `import { getStatus, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';` next to the store imports (`:21-23`).
2. Inside `RoutesScreen`, after `const [plotSel, …]`:
```ts
  // virgin-cycle27 09 (Nathan 2026-10-08): the rider's position for the blue dot — the shared
  // store, plus ONE quiet read when the tab opens (never prompts: refreshPositionIfPermitted checks
  // permission + services; RECORD is still the only place that asks). Refreshed again on each ME tap.
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  useEffect(() => subscribe(setStatus), []);
  useEffect(() => { void refreshPositionIfPermitted(); }, []);
  const here = status.lastLat !== null && status.lastLon !== null ? { lat: status.lastLat, lon: status.lastLon } : null;
```
3. `<CatalogMapView …>` (`:89-99`): add `here={here}` and `onMe={() => { void refreshPositionIfPermitted(); }}`.

## 5. Tests
### 5.1 `tests/waymap_suite.ts`
- `:319-331` test `'routemap: exactly one zoom bar (MapLibre) with exactly one compass reset button …'`: rename to `'routemap: exactly one zoom bar (MapLibre), no compass button — FIT resets north (virgin-cycle27 08)'`; change the `mapLibreResets.length === 1` assert to `=== 0` with message `'no onPress={resetNorth} button left in the bar (FIT calls resetNorth())'`; add `assert(!src.includes('accessibilityLabel="Reset map to north up"') && !src.includes('>↑<'), '↑ button retired');` and `assert(src.slice(firstZoomBar, creditTag).includes("if (fitMeNext === 'fit') resetNorth();"), 'FIT resets north');`. Keep the PNG-remnant loop.
- `:387-403` test `'virgin-cycle22 06: … ONE FIT/ME toggle …'`: `assert((bar.match(/onPress=\{resetNorth\}/g) ?? []).length === 1, 'compass untouched')` → `=== 0, 'compass gone (virgin-cycle27 08)'`; `pressables === 4` → `=== 3` with message `'three Pressables in the bar (+, −, FIT/ME)'`; the `setMode(fitMeNext)` count stays 1.
### 5.2 `tests/catalogmap_suite.ts` — append after `:250`
```ts
test('virgin-cycle27 08+09: the MAP tab map has +, −, one FIT/ME toggle, rotation on, a rider dot mounted last, and never prompts', () => {
  const cm = src('src', 'ui', 'catalogMapView.tsx');
  assert(!cm.includes('touchRotate={false}'), 'rotate no longer forced off');
  assert(!cm.includes('⤢'), 'the ⤢ glyph is gone');
  assert(cm.includes("const fitMeNext = fitMeNextMode(mode, props.here !== null);") && (cm.match(/>FIT</g) ?? []).length === 1 && (cm.match(/>ME</g) ?? []).length === 1, 'one coupled toggle, literal labels');
  assert(cm.includes("useState<'fit' | 'free' | 'follow'>('fit')") && cm.includes("here: mode === 'follow' ? props.here : null") && cm.includes('bearing: liveBearing'), 'ME centres on the rider without touching the bearing; FIT pins north via the fit rule');
  const riderAt = cm.indexOf('id="rider"'); const mapEnd = cm.indexOf('</M.Map>'); const pinsAt = cm.indexOf('id="catalogPins"');
  assert(riderAt > pinsAt && riderAt < mapEnd, 'rider source is the LAST source (dot on top)');
  assert(cm.includes("'circle-color': colors.riderBlue"), 'riderBlue, never a tier colour');
  for (const forbidden of ['ensurePermissions', 'requestForegroundPermissionsAsync', 'refreshPositionOnce']) assert(!cm.includes(forbidden), `${forbidden} must not be on the MAP tab`);
  const rs = src('src', 'ui', 'RoutesScreen.tsx');
  assert(rs.includes("import { getStatus, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';"), 'RoutesScreen reads the shared store');
  assert(rs.includes('useEffect(() => { void refreshPositionIfPermitted(); }, []);') && rs.includes('here={here}') && rs.includes('onMe={() => { void refreshPositionIfPermitted(); }}'), 'one quiet read on open, one per ME tap');
  assert(!rs.includes('ensurePermissions'), 'never prompts');
});
```
(`src()` is the suite's existing read helper.)

## 6. Visible text (allow-list, three hunks exactly)
| file | kind | exact text | action | why |
|---|---|---|---|---|
| src/ui/wayMapView.tsx | attr:accessibilityLabel | `Reset map to north up` | REMOVE entry | button retired |
| src/ui/catalogMapView.tsx | text | `FIT` | ADD (`reason`: "virgin-cycle27 08: the MAP tab gets the same coupled FIT/ME toggle as every map", since 2026-10-08, by "Sonnet execute, virgin-cycle27 brief 08") | same control as every other map |
| src/ui/catalogMapView.tsx | text | `ME` | ADD (same reason) | same |
Python read-modify-write, sorted, as EXECUTOR-RULES says. Any other STALE/UNLISTED → STOP.

## 7. Acceptance
1. Baseline (whatever it is after cycle26 04 — record it) → after: +1 test, 0 FAIL. `waymapgeo_suite.ts:468-481`, `:495-504`, `:584-591` pass unedited.
2. `tsc --noEmit` exit 0 (`12-brief-08-tsc.log`).
3. `git diff --stat`: `src/ui/wayMapView.tsx`, `src/ui/wayMapGeo.ts` (comment), `src/ui/catalogMapView.tsx`, `src/ui/RoutesScreen.tsx`, `tests/waymap_suite.ts`, `tests/catalogmap_suite.ts`, `tests/ui-strings.allow.json`. Attribute `wayMapView.tsx` hunks vs cycle26 04's.
4. `grep -n "↑\|Reset map to north up" src/ui/*.tsx` → none. `grep -c "resetNorth" src/ui/wayMapView.tsx` → the definition + the one FIT call (+ comments).
5. `grep -n "ensurePermissions\|requestForegroundPermissionsAsync" src/ui/RoutesScreen.tsx src/ui/catalogMapView.tsx` → none.

## 8. What this changes on Nathan's phone (JS-only, OTA)
MAP/ROUTES tab: +, −, FIT/ME; two-finger rotation works; FIT squares the map north and fits everything; a blue dot where he is, provided RECORD has been granted location at some point and location is on (otherwise no dot, the button reads FIT, nothing is said); ME jumps to the dot at street zoom without turning the map. Every other map: the `↑` button is gone; FIT un-rotates and fits; ME exactly as before (course-up while riding). NOT changed: the ride's course-up map, DEMO, ACTIVITIES cards, the permission flow. Headless cannot prove the gesture or the camera; the inspector reads the camera arithmetic and the mount order; Nathan tests rotate → FIT on the detail map and on the MAP tab.

## 9. Rollback
Restore the `↑` block and the toggle press in `wayMapView.tsx`; in `catalogMapView.tsx` restore `touchRotate={false}`, the `⤢` button, the 2-mode state and `here: null`; drop the rider source and the two props; drop RoutesScreen's location hooks; restore the three test pins and the allow-list entries.

## 10. Report
`12-brief-08-executor-report.md`: files, counts, tsc, the three allow-list hunks quoted, any STOP. OPEN-ITEMS line: "MAP-tab controls + dot (cycle27 brief 08+09) — on-device: rotate then FIT on ride detail, catalog detail, prestart and finished maps; MAP tab dot after a RECORD-granted install; ME with location off reads FIT."


---

# AMENDMENT (Fable, 2026-10-09 ~22:55 UTC) — rulings 8.1 / 8.2 + the last-known-location ruling. Status: APPROVED (Nathan 2026-10-09 00:24: execute all briefs). cycle26 brief 04 IS landed and committed (`a7834cd`), so this brief is unblocked; it runs after `11-brief-replay-1x.md` and before `11-brief-maps-edge-to-edge.md` (`10-plan.md` §15).

This amendment is part of the brief; execute §§0-10 above AND this section in one run. Where the two conflict, THIS section wins. Anchors re-read 2026-10-09 ~22:30 UTC (baseline `956 tests: 953 pass, 0 fail, 3 skip`). Current `wayMapView.tsx` lines (post-cycle26-04): `resetNorth` `:499`; `fitMeNext` `:708`; the toggle `:1020-1025` (`onPress={() => setMode(fitMeNext)}` at `:1021`); the `↑` block `:1026-1040` (`{/* WP-M: compass reset …` through `) : null}`); `</View>` closing the bar `:1041`; rider source `:984-997`; `touchRotate={rotateEnabled}` `:791`; `compass={false}` `:783`. `catalogMapView.tsx` anchors of §2 are unchanged (`:156-157`, `:165`, `:235`, `:251`, `:263`, `:337` `</M.Map>`, `:339-350` the bar, `:352` Credit). `RoutesScreen.tsx:19` imports, `:44` `plotSel`, `:89-99` the mount — unchanged.

## A0. Rulings now in force (replace §0's BLOCKED block — nothing is blocked)
- **Q8.2 = (a)** one quiet read on tab open + one per ME tap (Nathan), PLUS: **activity card and activity detail maps never show a ME button or a blue dot** — they already pass `showRider={false}` with `lat`/`lon` null (`activityCard.tsx:91-94`, `RideDetailScreen.tsx:451-458, :500, :512, :528`, `gateAdjustCard.tsx:149-151`, `CatalogDetailScreen.tsx:236-242, :408`) and this brief adds NO prop to any of them. The §5.2 test pins it (A3).
- **Q8.1 — ME with no LIVE fix goes to the LAST KNOWN location** (Nathan 2026-10-08 08:04 + 08:18: "possible to just have it zoom in on the last known location … location permission is always granted so if the best option is to ask the phone last-known position, thats definitely possible"). Nathan accepted (A); Fable was to rule (A) OS last-known vs (B) saving the app's own last fix vs (C) both.
- **FABLE RULING: (C) with the order live store fix → OS last-known position → nothing. Nothing new is persisted by the app.** Reasons:
  1. The shared tracker store (`location/index.ts` `lastLat/lastLon`) already IS "the app's own last fix" for this JS launch (every ride fix and every quiet read writes it; it is never persisted — D-023, `location/index.ts:68-69`). Reading it first costs nothing and is what the dot shows anyway.
  2. `expo-location`'s `getLastKnownPositionAsync()` (present in the installed `~56.0.23`, `node_modules/expo-location/build/Location.d.ts:37`) returns the OS's cached fix — the very thing Google Maps shows — without turning on any sensor and without a prompt once foreground permission is granted (which it always is for Nathan; for anyone else we CHECK, never request). It survives app relaunches, which the store does not. Writing our own copy of it to disk (B alone) would duplicate what the OS keeps better and add a storage format, a migration, and a stale-data policy we do not need.
  3. The OS value is kept OUT of the tracker store: `RecordScreen` derives the DETECTED START landmark from `status.lastLat/lastLon` with no age check (`RecordScreen.tsx:1143`), so pushing a cached, possibly hours-old position into the store could mis-detect a start. The MAP/ROUTES tab therefore holds the OS value in its OWN local state and prefers a live store fix whenever one exists.
  4. Scope: **MAP/ROUTES tab only.** The RECORD armed map is NOT changed (coordinator's "applies to RECORD map too if it behaves the same" — it does behave the same, but RECORD already polls for a fresh fix within seconds of opening (`positionRetryPolicy.ts`), shows a "waiting for GPS" badge, and a stale dot there would be a dot that jumps once the real fix lands, on the one screen where the dot's truth matters. Logged for a later cycle, not done here.)
- **The dot IS drawn at the last-known position too** (same paint; no greyed variant — minimal, and the tab-open quiet read usually replaces it within seconds). The toggle reads ME whenever ANY position (live or last-known) exists, FIT otherwise; with nothing at all, nothing is said or asked (Q8.1's old (a) is the residual case).

## A1. Extra anchors (verified 2026-10-09)
- `app/src/location/index.ts:36-40` imports incl. `import * as Location from 'expo-location';` (confirm the alias by reading the import block); `:493-508` the doc comment of `refreshPositionIfPermitted` (`/** WP-D Piece B → virgin-cycle20 brief 11: the QUIET position read …`); `:509` `let quietRefreshInFlight: …`; `:510` `export async function refreshPositionIfPermitted(): Promise<QuietRefreshOutcome> {`; `:546` `export async function stopTracking(): …`.
- `tests/positionretry_suite.ts:59-73` slices `src` from `export async function refreshPositionIfPermitted` to `export async function stopTracking` and asserts the slice has NO `requestForegroundPermissionsAsync` etc. ⇒ **the new function must be inserted BEFORE the `/** WP-D Piece B …` doc comment (`:493`), never between those two functions.** It must not contain any `request…Permissions` call either.
- `tests/catalogmap_suite.ts` `src()` helper reads `app/src/...` files; last test ends `:250` (append after it).

## A2. Extra edits
### A2.1 `src/location/index.ts` — the OS last-known read (insert directly BEFORE line `:493`, the `/** WP-D Piece B …` comment)
```ts
/** virgin-cycle27 09 (Nathan 2026-10-08, ruling 8.1): the phone's own LAST KNOWN position —
 * what Google Maps centres on before a fresh fix. Read from the OS cache (no sensor, no
 * prompt: permission is CHECKED, never requested; a missing permission or an empty cache
 * returns null). Deliberately NOT written into the tracker status: RecordScreen's detected
 * START is derived from lastLat/lastLon without an age check, and this value may be hours
 * old. Used by the MAP/ROUTES tab only (RoutesScreen), as the ME target and dot when no
 * live fix exists this launch. [UNTESTED ON DEVICE] */
export async function lastKnownPositionIfPermitted(): Promise<{ lat: number; lon: number; ageMs: number } | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const loc = await Location.getLastKnownPositionAsync();
    if (loc === null) return null;
    return { lat: loc.coords.latitude, lon: loc.coords.longitude, ageMs: Math.max(0, Date.now() - loc.timestamp) };
  } catch {
    return null; // display only
  }
}
```
### A2.2 `src/ui/RoutesScreen.tsx` — replaces §4.2 items 1-2
1. Import: `import { getStatus, lastKnownPositionIfPermitted, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';`
2. After `const [plotSel, …]` (`:44`):
```ts
  // virgin-cycle27 09 (Nathan 2026-10-08): the rider's position for the blue dot and the ME half of
  // the toggle. Order (Fable ruling 8.1): a LIVE fix from the shared store this launch → the phone's
  // LAST KNOWN position (OS cache, read once on open, kept in local state, never written to the
  // store) → nothing (toggle reads FIT, no dot, nothing said). Plus ONE quiet fresh read when the tab
  // opens and one per ME tap (never prompts; RECORD is still the only place that asks).
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  const [lastKnown, setLastKnown] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    let alive = true;
    void lastKnownPositionIfPermitted().then((p) => { if (alive && p !== null) setLastKnown({ lat: p.lat, lon: p.lon }); });
    void refreshPositionIfPermitted();
    return () => { alive = false; };
  }, []);
  const here = status.lastLat !== null && status.lastLon !== null ? { lat: status.lastLat, lon: status.lastLon } : lastKnown;
```
3. The mount (§4.2 item 3) unchanged: `here={here}` and `onMe={() => { void refreshPositionIfPermitted(); }}`.
### A2.3 `catalogMapView.tsx` — §4.1 unchanged. Note for the ME camera: `cameraTargetFor({ mode: 'follow', here, … })` centres on `here` whichever source it came from.

## A3. Tests — replace §5.2's RoutesScreen asserts with
```ts
  const rs = src('src', 'ui', 'RoutesScreen.tsx');
  assert(rs.includes("import { getStatus, lastKnownPositionIfPermitted, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';"), 'RoutesScreen reads the shared store + the OS last-known position');
  assert(rs.includes('void lastKnownPositionIfPermitted().then(') && rs.includes('void refreshPositionIfPermitted();') && rs.includes('here={here}') && rs.includes('onMe={() => { void refreshPositionIfPermitted(); }}'), 'last-known once on open, one quiet fresh read on open, one per ME tap');
  assert(rs.includes("? { lat: status.lastLat, lon: status.lastLon } : lastKnown"), 'order: live store fix first, OS last-known second (ruling 8.1)');
  assert(!rs.includes('ensurePermissions') && !rs.includes('requestForegroundPermissionsAsync'), 'never prompts');
  // ruling 8.2: activity card / detail / editor maps never get a dot or a ME button
  for (const f of ['activityCard.tsx', 'RideDetailScreen.tsx', 'gateAdjustCard.tsx']) {
    const s = src('src', 'ui', f);
    for (const el of s.match(/<WayMapView[\s\S]*?\/>/g) ?? []) assert(/showRider=\{false\}/.test(el) && /lat=\{null\}/.test(el), `${f}: no rider dot on an activity map`);
  }
```
and APPEND one test to `tests/positionretry_suite.ts` (after its last test):
```ts
test('virgin-cycle27 09: lastKnownPositionIfPermitted reads the OS cache, checks (never requests) permission, writes nothing to the tracker status', () => {
  const src = SRC('location/index.ts');
  const start = src.indexOf('export async function lastKnownPositionIfPermitted');
  assert(start > 0, 'lastKnownPositionIfPermitted missing');
  assert(start < src.indexOf('export async function refreshPositionIfPermitted'), 'sits BEFORE the quiet read (the quiet-read test slices from there)');
  const body = src.slice(start, src.indexOf('\n}\n', start));
  assert(body.includes('Location.getForegroundPermissionsAsync()') && body.includes('Location.getLastKnownPositionAsync()'), 'permission checked, OS cache read');
  assert(!body.includes('request') && !body.includes('getCurrentPositionAsync'), 'no prompt, no sensor');
  assert(!body.includes('lastLat =') && !body.includes('lastLon =') && !body.includes('emit()'), 'never written into the tracker status');
});
```
(`SRC` is that suite's existing helper — verify at the top of the file; if absent, STOP.) Count: **+2 tests** for this brief (§5.2's catalogmap test + this one).

## A4. Acceptance additions
- `git diff --stat` ALSO includes `src/location/index.ts` and `tests/positionretry_suite.ts`.
- `grep -n "getLastKnownPositionAsync" src` → exactly one hit, in `location/index.ts`.
- `grep -n "lastKnown\|here=" src/ui/activityCard.tsx src/ui/RideDetailScreen.tsx src/ui/gateAdjustCard.tsx src/ui/CatalogDetailScreen.tsx` → none.
- The existing `positionretry` test `'location/index.ts quiet read never prompts …'` still passes (your insertion is outside its slice).

## A5. On Nathan's phone (adds to §8)
MAP/ROUTES tab, opened cold with location on: the blue dot appears at once where the phone last knew it was, the toggle reads ME, ME zooms there; a few seconds later the quiet read moves the dot to the fresh fix. Location off / never granted / empty OS cache: no dot, FIT only, nothing said. ACTIVITIES cards, the activity detail page, the gate editor: no dot, no ME, unchanged.

## A6. Report additions
OPEN-ITEMS lines for the coordinator: "MAP-tab last-known position (cycle27 brief 08+09, Fable ruling 8.1 = live fix → OS last-known → none; nothing persisted) — on-device: open the tab cold indoors; dot + ME at once, dot moves when the fresh fix lands." and "RECORD armed map: ME with no fix still centres the route (not changed by cycle27; apply the same last-known fallback later if Nathan wants it)."
