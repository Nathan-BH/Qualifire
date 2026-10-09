# virgin-cycle28 · Plan (Opus PLAN tier, 2026-10-09)

Plan tier for this cycle is **Opus** (Nathan's decision: no Fable this cycle). Inputs: `00-nathan-ideas.md`
(binding, incl. the idea-2 correction and refinements 4b-4e), digests 01-04, and direct spot-checks of the
real tree at `c93f406` (working tree clean for `app/`; only `cycles/virgin-cycle28/` and `cycles/virgin-cycle29/`
untracked). Nothing here is implemented. Every anchor below was re-read in the real code today.

## 0. Scope

| # | Idea | Brief | Files (app/) |
|---|------|-------|--------------|
| 1 | Gate chip tap pans/zooms the editor map to that gate | `11-brief-01-02-gate-card.md` (part A) | `src/ui/gateAdjustCard.tsx`, `src/ui/wayMapView.tsx`, `src/ui/wayMapGeo.ts`, `tests/waymapgeo_suite.ts`, `tests/waymap_suite.ts` |
| 2 | Nudge pad: relabel/restyle only, readout without percent | `11-brief-01-02-gate-card.md` (part B) | `src/ui/gateAdjustCard.tsx`, `src/ui/gateAdjustModel.ts`, `tests/gateseeding_suite.ts` |
| 3 | Rename a way (edit its specifier) on the ROUTE detail screen | `11-brief-03-rename-way.md` | `src/store/catalogMerge.ts`, `src/ui/catalogDetailModel.ts`, `src/ui/CatalogDetailScreen.tsx`, `tests/catalogmerge_suite.ts`, `tests/catalogdetail_suite.ts`, `tests/ui-strings.allow.json` |
| 4 | RECORD: `new` pill in WHICH WAY TODAY?, shown for 1+ ways; "Original" auto-label | `11-brief-04-record-new-way-pill.md` | `src/ui/recordFlow.ts`, `src/ui/RecordScreen.tsx`, `src/store/waySpecs.ts`, `src/store/routeCreation.ts`, `tests/recordflow_suite.ts`, `tests/routecreation_suite.ts` |

Ideas 1 and 2 are merged into one brief: both edit `gateAdjustCard.tsx` (chip `onPress` and the pad/readout block
sit 15 lines apart) and one executor + one inspection is cheaper than two on the same file.

All four are JS-only (OTA-able). No change under `app/modules/`, `app.json`, `app.config.js`, `package.json`, `eas.json`.

## 1. Digest accuracy (spot-checked)

The digests are factually right; several line numbers are stale (files grew since the anchors were taken):

- Digest 01/02, `gateAdjustCard.tsx`: real lines are ~+4 off. `selected` state is `:76` (digest `:72`), map
  `gateSelect` `:160` (digest `:155`), chip `onPress` `:172` (digest `:167`), readout `:187-189`, pad row `:190-195`
  (digest `:185-190`), `pad()` `:124-141`, hint `:198`. `REPEAT_MS`/`LONG_PRESS_MS` are `:70-71`.
- Digest 01, `wayMapView.tsx`: real lines ~+17 off. `cameraRef` `:486`, `resetNorth`'s `setStop` `:506`,
  `cameraTargetFor` push `:731-741`, `<M.Camera ref={cameraRef} {...cameraProps} />` `:811`, gate-tick `onPress`
  `:937-946`, riderOnly early return `:683`. `gateSelect` prop doc `:302-308`.
- Digest 04, `RecordScreen.tsx`: `wayPick` state `:316`, `route`/`routeWays`/`pickedWay` `:1176-1183`,
  `pickSource` `:1188-1192`, `startTracking({ wayPick: ... })` `:725-730`, ride-end resets `:817-830`, discard
  resets `:1055-1061`, sport-switch reset `:300-308`, WHICH WAY block `:1638-1667` (condition `:1639`).
- Digest 02's open question "whether the pad labels are scanned" is now answered: `tests/ui_strings_extract.ts:124`
  drops any string without two consecutive letters, and non-JSX literals must be prose (`isProse`, `:53-55`). So
  `−1%` etc. were never scanned, and glyph-only labels / `+36 m` style readouts never will be.
- Scanner scope (`ui_strings_extract.ts:185-198`): `App.tsx`, `src/ui/**`, `src/location/*.ts` only. **`src/store/` is
  not scanned.** Consequence for "Original" (below).
- Digest 03's `catalog.ts:93-113` duplicate rule: real code `catalog.ts:~96-117`. Two PLAIN ways on one route are
  legal; two ways with the same non-empty specs (lowercased, joined by a space) are rejected. The naming card
  (`routeNamingCard.tsx:169-170`) separately REQUIRES at least one spec for a new way on an existing route.
- Latent bug found (not in any digest): `CatalogDetailScreen.tsx:50` discards the tick (`const [, setTick]`) and the
  model memo keys on `[request, setTick]` (`:83`), so `bump()` re-renders but never recomputes the model. A rename
  would save but keep showing the old name until the screen is reopened. Brief 03 fixes it (2 lines). [INFERRED:
  the same staleness may already affect place rename today; not device-checked.]

### Std/Alt reconciliation (asked by the coordinator)
`store/defaultWay.ts:14-25` `WAY_DISPLAY_ID` maps two SEED ids to `WorkStationAlt` / `WorkStationStd`, and
`sortWaysForDisplay` (`:106-112`) lists display ids ending `Std` first and `Alt` last. Both act on **seed way ids
only**; a user way id (`way:` / `route:` prefix) never ends in Std/Alt, so the sort is a no-op for every user way,
and the virgin seed is empty. Nothing in code types "Std" into `specs`. "Original" therefore lives in `specs`, the
user-way naming channel, and does not interact with the seed overlay. No sort change: the original way is already
first in catalog order and is the most-ridden default.

## 2. Idea 1: gate chip pans the map

Design:
- `WayMapView` gets one optional prop `focusGate?: { index: number; seq: number } | null`. Absent for every other
  caller, so every other mount is byte-for-byte unaffected.
- `MapLibreWayMap` gets one `useEffect` keyed on `focusGate?.seq`, placed right after `resetNorth` (before the
  riderOnly early return at `:683`, Rules of Hooks). It looks up `asset.gates[index]`, calls `setMode('free')`
  (so the declarative `cameraTargetFor` push becomes `{}` and cannot pull the camera back to the whole-route fit),
  then `cameraRef.current?.setStop({ ...gateFocusStop(gate, liveZoom), easing: 'ease' })` inside try/catch,
  mirroring `resetNorth`. `free` is the same state a rider drag produces; the existing FIT button still re-fits.
- Pure helper `gateFocusStop(gate, liveZoom)` in `wayMapGeo.ts`: `{ center: [lon, lat], zoom: max(liveZoom ?? 0,
  GATE_FOCUS_ZOOM), duration: 500 }`, `GATE_FOCUS_ZOOM = 17`. Never zooms OUT a rider who is already closer.
- `GateAdjustCard` owns a `focus` state; ONLY the chip `onPress` bumps it, and only when the tap selects (a tap that
  deselects does not move the map). The map-tap path (`gateSelect.onPress`) is untouched, as Nathan asked: a gate
  you tapped on the map is already in view.
- `seq` (not the index) is the effect key, so tapping the same chip again after panning away re-centres.
- Backward compatible: the card's props are unchanged, so all four mounts (`RecordScreen.tsx`, `RideDetailScreen.tsx`,
  `DemoScreen.tsx`, `GateAdjustScreen.tsx`; verified `<GateAdjustCard` in each) get the behaviour with no edit.
- Not done (out of scope, say so): the camera does not follow a gate while it is being nudged; a style remount
  (`mapStyleKey` change) resets the camera to the whole-route fit as today.

## 3. Idea 2: nudge pad relabel/restyle

Choice: **big outer `−` / `+`, small inner `−` / `+`** (Nathan's third option). Why:
1. Size carries the step size without words: the big step gets the big target and big glyph, the fine step the small ones; the pad already has the 1.25/0.75 flex split.
2. `++`/`−−` reads like programming notation; chevrons (`‹‹ ‹ › ››`) imply a screen direction the route on the map may contradict (the gate moves along the route, not left/right).
3. Plain `−`/`+` means "back / further along the route" on any route, in any language, and adds zero rider text.

Behaviour unchanged: same four `pad()` calls with the same deltas (`-largeM`, `-smallM`, `smallM`, `largeM`), same
`nudgeDeltaM`/`NUDGE_*_PCT`/`clampNudge`/`MIN_GATE_GAP_M`, same hold-to-repeat. Style only: big glyph 30 pt / 800,
small glyph 18 pt / 700 (was 17 / 13 with longer text). `pad()` gains an explicit `id` used as the React key (the old
key was the label; two `−` labels would collide).

Readout: `G2 · 1 842 m · 37.2 %` becomes `G2 · 1 842 m`, plus ` · +36 m` once the gate has moved from where the
card opened (`fmtMoved(current, initial)`, new pure helper in `gateAdjustModel.ts`; `''` under 0.5 m; minus sign is
U+2212 like the old labels). Metres from the route start already were in the readout; the moved-by figure replaces
the percent with something a rider can act on ("I pushed it 36 m on"). `fmtPct` stays exported and tested (model
unchanged), just no longer rendered.

## 4. Idea 3: rename a way

- Pure `renameWay(userCat, seedCat, wayId, text)` in `store/catalogMerge.ts`, beside `renameLandmark`, same
  `RenameOutcome` shape. Rules:
  - the way must be in the USER catalog (shipped ways refused, like shipped places, `catalogMerge.ts:21`);
  - `text` is split on `·` into parts (`parseSpecsText` = `cleanSpecs(text.split('·'))`), so a multi-part name
    round-trips through the pre-filled `Dry · Fast`;
  - each part at most `MAX_SPEC_LEN = 24` (the naming card's spec `maxLength`, `routeNamingCard.tsx:342`);
  - empty (back to the plain From → To) is allowed ONLY when the way is the route's only way; otherwise refused;
  - no other way on the same route (merged seed+user) may carry the same parts (`sameSpecs`, case-insensitive);
  - only `specs` changes: same id, refLineId, gate sets, results. Rides store `wayId` only (`types.ts:118-119`), so
    every label everywhere updates by recomputation; no migration.
- `saveUserCatalog` re-validates the merge (catches the join-collision corner of `catalog.ts`'s rule too).
- UI on `CatalogDetailScreen.tsx` `WaySection`: a `rename way` button (lowercase, beside `edit gates` / `delete
  way`), shown when `r.renamable`; inline `TextInput` (`maxLength={40}`, pre-filled with `specsText`), `SAVE`,
  `cancel` copied from the place rename (Alert.prompt is iOS-only). Failure: `Alert.alert('Could not rename', ...)`.
- `WayDetailModel` gains `renamable` (= `!seedOwned`) and `specsText` (`specs.join(' · ')`, `''` when plain).
- Memo fix: `const [tick, setTick]` and deps `[request, tick]` so the saved name shows at once.

## 5. Idea 4: RECORD `new` pill

Binding rules (00-nathan-ideas 4, 4b-4e) and how each is met:

| Rule | Implementation |
|------|----------------|
| never auto-selected on any route | new state `newWayRouteId: string \| null`, initial `null`; set ONLY by tapping the pill; cleared at sport switch, ride end and discard (the same three places `setWayPick(null)` runs) |
| tap toggles on/off | `toggleNewWay(cur, routeId)` (pure, `recordFlow.ts`) |
| selecting it deselects the way pill | `newOn` makes `pickedWay = null`, so no way pill is `on`; the pill tap also runs `setWayPick(null)` |
| deselecting restores the default way (most-ridden) | toggling off runs `setWayPick(null)`, so `pickedWay` falls back to `defaultWayFor(routeWays)` |
| block shows with exactly one way | condition `route && routeWays.length > 1` becomes `route && showWhichWay(routeWays.length)` (>= 1). With one way the flat pill row renders (spec rows need >= 2 ways: `specPickRows` returns `[]` below 2, `waySpecs.ts:44`) |
| "new" = free ride on the known pair | `pickedWay === null` already means: `startTracking({ wayPick: null })` (`:726`), `setRideWayHint(null)` (`:721`) → engine has no candidate (`live/engine.ts:270-293`), trail drawn ("writing history", `recordFlow.ts liveMapOverlayFor`), no off-route scoring. Armed/setup maps draw no line (`wayId={pickedWay?.refLineId ?? null}`) |
| then the existing save-as-new-way flow with existingRouteId | unchanged: STOP's `draftRouteFromRide` sets `existingRouteId` when the ride's start/end discs match the route (`routeCreation.ts:164-169`); the ride has no `matchedWayId`, so `namingOfferMode` is `'card'` → "New way on <route>", SPECIFICATIONS (required) |
| old plain sole way auto-labelled "Original" | in `buildRouteCreationCatalog`'s `existingRouteId` branch (`routeCreation.ts:~420-438`): if the route is ours and has exactly one way, ours and plain, that way gets `specs: [ORIGINAL_SPEC_LABEL]` in the same catalog write. Skipped when the new way's own specs equal `['Original']` (case-insensitive), which would otherwise collide. Applies to every new-way save (RECORD card and ride-detail offer), per 4c |
| new way gets its own specifier | already enforced: the card requires >= 1 spec for a way on an existing route (`routeNamingCard.tsx:170`) |
| "Original" is a single constant | `export const ORIGINAL_SPEC_LABEL = 'Original';` in `store/waySpecs.ts` next to `PLAIN_SPEC_LABEL` |

Pill placement: flat row = every way pill then `new`; spec rows = `new` appended to the depth-0 row, and while
`new` is on, rows deeper than 0 are hidden and no option is drawn `on`. Pill text is the existing `new` (JSX
`text|new` is already allow-listed for `RecordScreen.tsx`).

Not changed: the armed title reads `Home → Station` (no variant) while `new` is on; `pickSource` logs `'none'`
(no type change in `location/`); the engine, the live map, STOP's draft and the naming card are untouched.

## 6. Execution order and dependencies

`01-02` (gate card) → `03` (rename way) → `04` (new pill). 03 before 04 is required (4c leans on rename existing to
fix an "Original" the rider dislikes). 01-02 shares no file with 03 or 04 and may run in parallel with 03 ONLY if
the coordinator accepts that each executor's test run sees the other's in-progress edits; recommended: sequential.
cycle29's draft brief touches `wayMapView.tsx` too: never run cycle28 01-02 concurrently with any cycle29 brief.
See `EXECUTION-ORDER.md`.

## 7. Risks

- **Camera (01)**: `setStop` while a declarative `bounds` push is mid-animation. Mitigated by `setMode('free')` first
  (same state a drag produces). [UNVERIFIED on device: MapLibre RN 11.3.6 behaviour when Camera props go from bounds
  to none in the same tick as an imperative `setStop`; the drag path already relies on it.]
- **Zoom 17 (01)**: on a long route, focused gate may hide its neighbours. FIT restores the overview.
- **Glyph-only pad (02)**: no screen-reader labels added (they would be rider text). Accepted, minimal text.
- **Design mock drift (02)**: `design/make_screens.py:2683` and `design/canonical/gate_adjust_*.svg` still show
  percent labels. Not touched (out of scope); coordinator logs it in OPEN-ITEMS.
- **Rename parsing (03)**: a rider who wants a literal `·` inside one part cannot. Accepted. Renaming to `plain`
  is not refused (it would read like the plain label); accepted edge.
- **Shared `CatalogDetailScreen.tsx` memo fix (03)** also makes delete flows recompute on `bump()`; strictly more
  correct; inspector checks the delete paths still close the screen (`model === null` effect, `:89-91`).
- **"Original" not machine-checked (04)**: the constant is in `src/store/`, which the ui-strings scanner does not read,
  and it is a single word (not prose). It CANNOT get an allow-list entry (it would be reported STALE). It is listed
  in the visible-text table for Nathan's review instead.
- **GPS endpoints (04)**: if the ride's end is detected outside the destination disc, STOP drafts "New route" instead
  of "New way on". Same as today for any ride; the card lets the rider re-pick the places, which brings
  `existingRoute` back. Not forced from the pills (that would override geometry).
- **Single plain way pill (04)**: a route with one plain way now shows `plain | new`. `plain` is the existing label.
- **Shared tree with cycle29** (`wayMapView.tsx`): anchors are by content; mismatch = STOP.

## 8. Rider-facing text ledger

| Brief | file | kind | exact text | allow-list action | why it earns its place |
|-------|------|------|-----------|-------------------|------------------------|
| 01-02 | gateAdjustCard.tsx | pad glyphs | `−` `+` (×2 sizes) | none: no letters, never scanned | replaces `−1%` `−0.1%` `+0.1%` `+1%`; size = step |
| 01-02 | gateAdjustCard.tsx | readout | `G2 · 1 842 m · +36 m` | none: built from helpers, no 2-letter run | percent replaced by metres moved |
| 03 | CatalogDetailScreen.tsx | text | `rename way` | **append** (reason: "virgin-cycle28 03 (Nathan 2026-10-09): ways can be renamed like places; lowercase like edit gates / delete way") | the missing action Nathan got stuck on |
| 03 | CatalogDetailScreen.tsx | text | `SAVE`, `cancel` | none: already listed for this file | reused from place rename |
| 03 | CatalogDetailScreen.tsx | alert-title | `Could not rename` | none: already listed | reused |
| 03 | store/catalogMerge.ts | alert body (dynamic) | `a shipped way cannot be renamed` / `each part is at most 24 letters` / `this route has other ways, so this one needs a name` / `"<name>" is already a way on this route` | none: `src/store` not scanned | each <= 11 words, no em dash |
| 04 | RecordScreen.tsx | text | `new` | none: `RecordScreen.tsx|text|new` already listed | the pill |
| 04 | store/waySpecs.ts | spec value | `Original` | none possible (store not scanned, single word); flagged here for Nathan | 4e, provisional |

Net allow-list change for the cycle: exactly one appended entry (brief 03). Briefs 01-02 and 04 leave
`app/tests/ui-strings.allow.json` byte-identical.

## 9. Test plan

New tests:
- `waymapgeo_suite.ts`: `gateFocusStop` centre is `[lon, lat]`; zoom 17 when `liveZoom` null or lower; keeps 18.4
  when higher; duration 500.
- `waymap_suite.ts` (source scan): `focusGate?: { index: number; seq: number } | null;` prop; the effect calls
  `setMode('free')` and `gateFocusStop(`; the card passes `focusGate={focus}`; the map-tap literal
  `onPress: (i) => setSelected((cur) => (cur === i ? null : i))` is unchanged; the chip handler bumps `seq`.
- `gateseeding_suite.ts`: `fmtMoved` (`''` at 0 and 0.4 m, `+36 m`, `−4 m` with U+2212, rounding); source scan: card
  no longer contains `%'` labels nor `fmtPct(`; four `pad(` calls with `-largeM`, `-smallM`, `smallM`, `largeM`.
- `catalogmerge_suite.ts`: `renameWay` happy path, `Dry · Fast` split, trim, duplicate refused (case-insensitive),
  empty refused with siblings / allowed when sole way (field removed), shipped way refused, part > 24 refused,
  merged result validates, ids / refLineId / gate sets untouched.
- `catalogdetail_suite.ts`: `renamable` false for a seed way, true for a user way; `specsText` `'Dry · Fast'` / `''`.
- `recordflow_suite.ts`: `toggleNewWay`, `newWayOn`, `showWhichWay`; source scan on RecordScreen: condition is
  `showWhichWay(routeWays.length)`, `!newOn` guards `pickedWay`, `setNewWayRouteId(null)` appears at the three resets
  (>= 3 occurrences), `useState<string | null>(null)` for the new state (never seeded from anything).
- `routecreation_suite.ts`: "Original" relabel on a sole plain user way; no relabel when 2+ ways, when the sole way
  has specs, when the route is seed-owned, when the new specs are `['original']`; merged result validates.

Existing tests that change: `routecreation_suite.ts` "WP-G 1" gains one assertion (its plain `r1` now becomes
`['Original']`; its existing assertions still hold). No other existing assertion should change; any that fails is a
STOP.

## 10. Needs Nathan (the pipeline proceeds on the default)

1. Nudge glyphs: big outer `−`/`+`, small inner `−`/`+`. **Default: yes.** Alternative: `−−`/`−`/`+`/`++`.
2. Readout shows metres moved (`· +36 m`) once a gate moved. **Default: yes.** Alternative: just `G2 · 1 842 m`.
3. Chip tap zooms to 17 (or keeps a closer zoom); map taps and nudges never move the map. **Default: yes.**
4. Only your own ways are renamable, shipped ways never (same as places). **Default: yes.**
5. Multi-part names are typed in one field, parts separated by `·` (pre-filled). **Default: yes.** Alternative: the naming card's pill editor (bigger change).
6. A way may be renamed back to no specifier only when it is the route's only way. **Default: yes.**
7. "Original" is applied on every new-way save (RECORD card and ride-detail offer), not only after the `new` pill. **Default: yes** (4c wording).
8. A route with one plain way shows `plain | new` in WHICH WAY TODAY?. **Default: keep `plain`.** Alternative: label it with the route name.
9. Whether the ride becomes a new way on THIS route is decided by where it actually started/ended (as today), not forced from the pills. **Default: yes.**
