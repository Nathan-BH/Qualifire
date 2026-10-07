# Brief 03 (MAP tab): inspection report

**VERDICT: PASS WITH NOTES**

Inspector: Opus, fresh context, adversarial. Date: 2026-10-06/07. I changed nothing in app source, tests or the allow-list; this file is the only thing I wrote. Throwaway probes ran from `$HOME/scratch/` on the device, outside the repo.

## Numbers (rerun by me, from `app/`)

| check | result |
|---|---|
| `node --experimental-strip-types tests/run.ts` | `907 tests: 904 pass, 0 fail, 3 skip` (exit 0). No FAIL lines. The 3 SKIPs are the existing `engine: ... vs python parity oracle` fixtures. All 20 `catalogmap:` tests PASS. |
| `./node_modules/.bin/tsc --noEmit` | exit 0, no output |
| §7.2 standalone (seedmode_pin + catalogmap + ui_strings) | `33 tests: 33 pass, 0 fail, 0 skip` |
| standalone neighbours (waymapgeo + catalogdetail) | exit 0 |

The executor's numbers (907/904/0/3, tsc EXIT 0, 33/33) match mine exactly. Nothing is failing, so nothing needs to be marked FOREIGN.

## Scope and hygiene

- Nothing committed. HEAD is still `d03f5df cycle022 brief9` on branch `virgin`. `git stash list` is empty. `package.json` and the lockfile are untouched, so no new dependency.
- Cycle24 files: `App.tsx` (one word, `routes: 'map'`), `CatalogDetailScreen.tsx` (one string, `BACK TO MAP`), `RoutesScreen.tsx` (replaced), new `catalogMapModel.ts`, `catalogMapView.tsx` and `tests/catalogmap_suite.ts`, `tests/run.ts` (+1 line, `import './catalogmap_suite.ts';`), and `wayMapView.tsx`. In `wayMapView.tsx` the only cycle24 line is `-function Credit(` / `+export function Credit(`. Every other hunk in that diff is labelled `virgin-cycle23 brief 01` (gestures/mapFill). `ui-strings.allow.json` is also changed (see below). Everything is inside the brief's §4 list.
- Other modified files: `RideDetailScreen.tsx`, `rideHistoryModel.ts`, `replay_suite.ts`, `deployment/rounds/README.md`, `feedModel/rideActions/trailCache` plus their suites, and the `run.ts` lines for feedmodel/trailcache. These belong to cycle23 or other sessions (they are listed in `03-baseline-status.txt` or cycle23-labelled). No cycle24 leak found.
- Allow-list: I diffed `app/safe_to_delete/ui-strings.allow.pre-brief03.json` (the executor's pre-edit copy, which is gitignored) against the current file. The diff is exactly 8 entries removed (7 RoutesScreen + `BACK TO ROUTES`) and 4 added (`BACK TO MAP`, `Noto Sans Regular`, and the two OpenFreeMap style URLs with `long: true`). No other line moved or was reformatted. The rest of the 258-line `git diff` against HEAD is cycle23's RideDetailScreen removals. No em dashes in the new entries. The hygiene and live-tree guards pass.
- Nothing was deleted. The pre-edit copy went to `app/safe_to_delete/`, which the brief allows.

## Nathan's decisions vs the build (00-nathan-decisions.md)

| # | Check | Status |
|---|---|---|
| a | Tab label is MAP (`App.tsx:62`) | OK. No new rider-visible "ride" wording; `rides` only appears as identifiers. |
| b | Overview | OK. One line per `pairKey` (A↔B merged, loops separate), usual way only, constant 4 px at 0.55 opacity with no casing (so overlaps darken), pins labelled, fit to all pins, `gatesFC` empty. |
| c | Place focus | OK. Fits place + neighbours, connected lines 0.95, others ghosted at 0.12 (still drawn), non-neighbour pins and labels at 0.3, sheet rows ordered from / to / loop, row tap highlights, tap empty map or × returns to overview. See L1 for one tap-routing wrinkle. |
| d | Route focus | OK. Highlighted way at 5 px / 1.0, usual way at 0.55, other ways only their differing stretches, gates only here (and only for the highlighted way). See M1 and M2. |
| e | Way into the detail screen | OK. The sheet header Pressable calls `tabNav.openCatalog({kind, id})`. |
| f | Things that must not be built | OK. No edit mode, no new delete UX, no start-activity, no spokes, no thickness-by-frequency, no new deps. |
| g | Generic for any catalog | OK. No route or place names are hardcoded in the three files (grep for church/station/home/work/fosh/morning/evening finds nothing). Degenerate cases are listed below. |
| h | Text kept minimal | OK. The only new strings are `BACK TO MAP`, `Noto Sans Regular` and the two URL literals. Everything else is data or a glyph (× › + − ⤢). |

Degenerate cases I probed against the pure model with throwaway scripts:
- **0 places:** pins and lines empty, bounds null, so the camera stays put (`cameraTargetFor` returns `{}`).
- **Place without routes:** bounds fall back to `placeBounds`.
- **Unknown place or route:** returns null, and the screen falls back to overview.
- **Loop-only place:** no neighbours; uses `placeBounds`.
- **Two loops at one place:** two lines.
- **Both directions with zero rides:** the primary is the first route in catalog order.
- **Reversed geometry:** 0 differing stretches.
- **Sparse base vs dense other on the same line:** 0 stretches.
- **Other way empty or 1 vertex:** `[]`.
- **NaN latitude:** silently ignored in bounds, no crash.
- **300 places:** overview builds in 19 ms.
- **Missing endpoint landmark:** the row is labelled with the raw id (`A → Z`) and the missing neighbour is dropped. No crash.
- **Offline / missing assets:** with no path there is no line (twin fallback first). With no `ML` module the view is an empty frame.

## Findings (ranked)

### M1 (medium, device-verify): in ROUTE FOCUS, tapping the drawn way can reset the highlight or jump to the other direction
- `catalogMapView.tsx:181`: the focused pair's overview line is set to `opacity: 0` but is still a feature in the tappable `catalogLines` source (`:266-276`). The `catalogWays` source (`:281`) has no `onPress`.
- If MapLibre hit-tests opacity-0 features (it normally does, because opacity is paint, not visibility), then tapping the way the rider is looking at fires `onPressLine(line.routeId)`. That `routeId` is always the pair's PRIMARY route.
- `RoutesScreen.tsx:60-65` then sets `{level:'route', routeId: primary, highlightWayId: null}`. As a result:
  - (i) a way picked from the sheet loses its highlight and the gates jump back to the usual way;
  - (ii) if route focus was entered for the reverse (non-primary) direction from a place sheet, the map silently switches to the other direction.
- Ghost lines in route focus are also tappable and switch to another route; the spec does not cover that.
- The fix belongs in a later brief, for example a `filter` or a guard in the line `onPress` while in route focus. The executor followed the brief, so this is not an executor deviation.

### M2 (medium, perf / visual): `differingStretches` cost at the guard edge is far above the brief's "~100 ms"
- Measured on the PC with node: a 2449×2449-vertex base/other (just under `DIFF_GUARD = 6e6`) took **512 ms**. A phone will be slower, and this cost is paid once per non-usual, non-highlighted way.
- Runtime paths are resampled at about 5 m and capped at 4000 vertices (`wayAssetRuntime.ts:33`), so a route of roughly 12 km sits at the edge.
- Above the guard, the whole alternative way is drawn instead of only its differing stretches. That is visible, not a crash.
- The memo at `catalogMapView.tsx:187-205` depends on `route`, and `RoutesScreen.tsx:45` creates a new `route` object on every render, so the stretches are recomputed on every RoutesScreen render in route focus (every sheet tap). This is a brief-level estimate (D12), not an executor fault.

### L1 (low): place focus, twin row then tap on the line takes three taps instead of two
- After tapping the reverse-direction row, the shared line is highlighted. Tapping that line passes the PRIMARY routeId, so `RoutesScreen.tsx:61` only moves the highlight to the primary row instead of opening route focus.
- Tapping a ghost (unconnected) line in place focus sets an invisible `highlightRouteId`; a second tap then opens that route.

### L2 (low, perf): the overview memo is never hit when a sport is active
- `activeCatalog()` → `scopeCatalog` (`store/sports.ts:129-136`) returns a NEW object on every call when a sport is active.
- So `useMemo(..., [CATALOG])` at `RoutesScreen.tsx:43` recomputes `overviewModel`, including `resolveWayAsset` for every way, on every render.
- With no sport, the identity is stable instead, and ride counts or the usual way stay frozen for the lifetime of the mount. That is harmless today because rides are recorded on another tab, which remounts this one.

### L3 (low, defensive): `routeFocusModel` throws on a dangling way id
- `catalogMapModel.ts:209` uses `c.ways.find(...)!`. When `route.wayIds` names a way missing from `c.ways` (as the first entry or the most-ridden one), a probe got `TypeError: Cannot read properties of undefined (reading 'specs')`.
- `orderedWayIds` (`:80-85`) filters unknown ids but then re-prepends `usual`, which may itself be unknown.
- The catalog validator rejects such catalogs (`store/catalog.ts:102-105`, "unknown way"), so it is unreachable with validated data.

### L4 (low, UX): returning from the detail screen loses the focus
- `App.tsx:239` renders `CatalogDetailScreen` instead of `RoutesScreen`, so `BACK TO MAP` remounts the tab at OVERVIEW, not at the place or route the rider came from. The spec says nothing either way.

### I1 (info): the view's dimming rules are covered only by source pins
- The opacity/width logic in `linesFC`, `pinsFC` and `waysFC` has no unit test; the suite only pins source text. Correct by reading.

## The executor's three deviations

1. **Allow-list entries inserted in sorted position instead of appended: SOUND.** `tests/ui_strings_suite.ts:232` asserts `entries not sorted by file, kind, text`, so appending would fail the guard. The brief's "append" was wrong. I verified that no other entry moved.
2. **Two extra entries for the copied `MAP_STYLE_NIGHT` / `MAP_STYLE_DAY` URL literals: SOUND.** `wayMapView.tsx` already carries identical entries (`long: true`, allow-list :3700-3716), so this is the established precedent. Exporting the consts from `wayMapView.tsx` instead would have broken brief D2 (only one word may change in that file, which cycle23 is editing tonight). The cost is two duplicated technical entries; they can be folded later.
3. **`routeEndpointIds` reads `currentCatalog()` inside the view (`catalogMapView.tsx:356-359`): SOUND, slightly impure.** Route ids are global, so the unscoped catalog finds the same route as `activeCatalog()`. The file already calls `currentCatalog()` for asset resolution (`:50`). Downsides: it is a store read in a view that is otherwise props-driven, and the `pinsFC` memo (`:231`) does not depend on the catalog (harmless, since a catalog change re-renders the parent). A cleaner later fix is to put `placeIds` on `RouteFocusModel`.

## Only verifiable on the phone (for Nathan, 2026-10-07)

1. Pin tap and line tap do NOT also fire "tap empty map". This needs `stopPropagation` to suppress `Map.onPress` in MLRN 11.3.6. If it fails, the sheet flashes open and closes.
2. M1: in route focus, tap the highlighted way on the map. Does the highlight reset, or does the direction flip?
3. Pin labels render (`Noto Sans Regular` glyphs), collide sensibly, and fade with focus. Offline they are expected to be missing.
4. Line hit area at 4 px: is it easy to tap a line in overview?
5. Sheet (max 280 px, bottom 34) on a small phone: it should not cover the fitted content (bottom padding 300), and the credit "i" should stay visible.
6. The zoom bar (+ / − / ⤢) and the sport badge chip do not overlap anything. ⤢ re-fits after panning.
7. Camera refits on every level change. Zero places shows the MapLibre world view (OQ5).
8. Route focus speed on Nathan's longest route with 2 or more ways (M2). Do alternative ways show only the differing stretches, or the whole line?
9. Night vs day basemap: is the ink colour of differing stretches readable on both, and are the 0.12 ghost lines still visible at all?
10. `BACK TO MAP` returns to the tab at overview (L4).
