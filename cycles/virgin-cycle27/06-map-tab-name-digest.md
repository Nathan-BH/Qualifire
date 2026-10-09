# 06 - MAP tab name digest (ROUTES vs MAP)

Date: 2026-10-08. Read-only digest of the repo as it stands on the Windows PC (`$HOME/mnt/Qualifire`). Paths are relative to the repo root. Line numbers are as read on 2026-10-08. No fixes proposed.

## TL;DR
- Rider-visible bottom tabs today: RECORD, ACTIVITIES, MAP, SETTINGS, DEMO (five, in that order), rendered uppercase. The label comes from `TAB_LABEL` at `app/App.tsx:58-60`; the internal tab ids are record/rides/routes/settings/demo.
- The MAP tab is the old ROUTES tab (`app/src/ui/RoutesScreen.tsx`, file and id `routes` kept). It is a full-bleed catalog map of places (pins) and routes (lines), with a bottom sheet for place or route focus. It has no create action on the tab itself.
- The word ROUTES still appears on screen inside the MAP tab's detail screen: section headers "ROUTES FROM HERE" / "ROUTES TO HERE" and the route-level "ROUTE" title (`app/src/ui/CatalogDetailScreen.tsx:95, 219, 228`).
- Decision record: `cycles/virgin-cycle24/00-nathan-decisions.md:13` says "the ROUTES tab is renamed the MAP tab". No rationale or alternative name is recorded. The name itself was not debated in the recorded decisions.
- `app/STATE.md` is stale: it still says six tabs including RESULTS and lists the tab as ROUTES.

## 1. Tab bar today
Source: `app/App.tsx`.
- Label map `TAB_LABEL`, `App.tsx:58-60`: `record: 'record', rides: 'activities', routes: 'map', settings: 'settings', demo: 'demo'`. Comment at `App.tsx:55-57` cites virgin-cycle20 brief 05 (Nathan, 2026-09-30): "the user sees activities; the tab ID stays 'rides'".
- Tab order, `App.tsx:230`: `['record', 'rides', 'routes', 'settings', 'demo']`. Rendered as a horizontal ScrollView, `App.tsx:223-240`, text uppercased by `tabText` style (`App.tsx:298`).
- Type, `app/src/ui/tabNav.tsx:23`: `export type Tab = 'record' | 'rides' | 'routes' | 'settings' | 'demo';`
- Screen per tab, `App.tsx:214-218`: record -> `RecordScreen`, rides -> `RidesScreen`, routes -> `RoutesScreen`, settings -> `SettingsScreen`, demo -> `DemoScreen`.
- No icons. The bar is text only.
- Rider-visible strings: RECORD, ACTIVITIES, MAP, SETTINGS, DEMO (uppercase by style). Verified by code, not by device.

## 2. What the MAP tab contains and does today
Source: `app/src/ui/RoutesScreen.tsx`, `app/src/ui/catalogMapView.tsx`, `app/src/ui/catalogMapModel.ts`, `app/src/ui/CatalogDetailScreen.tsx`.
- Content: a MapLibre map of the active sport's catalog. Places are pins labelled with the place name (`catalogMapView.tsx:229, 323`). Routes are lines. Both are shown. Lists are not on the tab itself except in the bottom sheet.
- Three levels (`RoutesScreen.tsx:1-11`, `catalogMapModel.ts:1-12`):
  - OVERVIEW: all places as pins, one line per route pair (A->B and B->A merged), usual way only, no gates.
  - PLACE focus (tap a pin, `RoutesScreen.tsx:97`): routes out of and into the place. Sheet rows list route labels with ride counts (`RoutesScreen.tsx:119-128`). Tapping a row highlights the line; tapping again opens ROUTE focus (`RoutesScreen.tsx:73-79`).
  - ROUTE focus (tap a line, or a highlighted row): the route's ways listed with ride counts (`RoutesScreen.tsx:134-143`), the highlighted way with gates, and a trend plot (`RoutesScreen.tsx:145-156`, cycle25 brief 02).
- Taps: pin -> place focus; line or row -> route/highlight; way row -> route focus with that way highlighted; empty map or the sheet x -> overview (`RoutesScreen.tsx:97-99, 113-115`). The sheet header title row (name and ›) opens the detail screen: `tabNav.openCatalog({kind:'place'|'route'})` (`RoutesScreen.tsx:82-85, 109-112`).
- Create: none on the MAP tab. Creation happens at STOP in RECORD via `ui/routeNamingCard.tsx` (see section 4 vocabulary).
- Edit, delete, rename, merge: only in `CatalogDetailScreen.tsx`, reached from the sheet header. Place: Rename (`:253`), Merge into another place (`:279`), Delete (`:292`). Route: Delete route (`:372`). Way: edit gates (`:431`), delete way (`:436`). Management is not on the map itself. `cycles/virgin-cycle24/00-nathan-decisions.md:32-38` records edit mode as undecided and not built.
- Filters and toggles: none on the tab. The only chrome is a sport badge at top-left, `RoutesScreen.tsx:101-104`, showing the active sport in caps or `NO SPORT YET · ADD ONE IN SETTINGS`. Zoom controls `+`, `-`, `⤢` (`catalogMapView.tsx:341-349`).
- Empty state: zero places = bare map with no sentence and the default world camera (`cycles/virgin-cycle24/03-brief-open-questions.md` OQ5). Only the sport badge text remains. Code has no separate empty copy on this tab (checked `catalogMapView.tsx`, `catalogMapModel.ts`, `RoutesScreen.tsx`).
- Words on screen in the tab: the tab itself has no route or way word. The sheet shows route labels and way variant labels as data. Trend and sheet count are numbers. Detail screen words: "PLACE" / "ROUTE" title (`CatalogDetailScreen.tsx:95`), "ROUTES FROM HERE" or "ROUTES" (`:219`), "No route uses this place yet." (`:221`), "ROUTES TO HERE" (`:228`), "WAY · " header (`:407`), "from:" / "to:" (`:344, 350`), "reference activity" (`:418`), "BACK TO MAP" (`:179`). Route and way words appear on screen in the detail screen, not the tab.
- Internal code names: `RoutesScreen`, `CatalogMapView`, `catalogMapModel`, `overviewModel`, `placeFocusModel`, `routeFocusModel`, `CatalogMapFocus` levels `overview`/`place`/`route`.

## 3. Other tabs, one line each
- RECORD (`app/src/ui/RecordScreen.tsx`): record a ride. Pickers offer START and GOING TO landmarks (pill rows, `RecordScreen.tsx:1580-1603`), and a way can be picked before start. Free ride offers a naming card at STOP (`routeNamingCard.tsx`, labels "CREATE ROUTE" and "New route" in `app/src/ui/routeNamingCard.tsx`).
- ACTIVITIES (`app/src/ui/RidesScreen.tsx`, tab id `rides`): chronological list of every ride, each row showing route name, date, lap and rank (`RidesScreen.tsx:1-7`). Yes, rows show route names, so route lists exist here too.
- SETTINGS (`app/src/ui/settings.tsx`): toggles, sports, data, reset. No route lists.
- DEMO (`app/src/ui/DemoScreen.tsx`): scripted ride replay for demonstration. Shows way and results plot caption, no route list.
- RESULTS: removed. `cycles/virgin-cycle25/brief-03-remove-results-tab.md` and `cycles/virgin-cycle25/00-nathan-decisions.md:6, 13`. Its trend moved into the MAP route focus sheet.
- Overlap: ACTIVITIES shows route names per ride; MAP shows routes as lines and sheet rows. Both use "route" and "way" wording. No other tab shows a route catalog list.

## 4. Vocabulary and rider-text rules
- Route and way meanings (GLOSSARY.md:8-18): "Route. The from->to path between two landmarks... ridden in one direction only. A route is the parent." "Way. One particular way of riding a route... Everything that gets timed and scored is tied to a way, not a route." "Landmark. A named place in your catalog." Swap made 2026-09-06 (WP-3, virgin-cycle3), per `GLOSSARY.md:8` and `STATE.md` vocabulary section.
- Place is the rider-facing word for a landmark in code comments and CatalogDetailScreen. Glossary uses landmark. Code uses `Landmark` (`store/types`) and `place` in UI. "place" and "landmark" are both used in code; no recorded ruling on which is rider-facing.
- GLOSSARY.md:106 and :112 still list "RIDES, ROUTES, RESULTS, SETTINGS" and "the RESULTS tab" (stale after cycles 24-25).
- Rider text rules: `process/CONVENTIONS.md:65-82`. "Minimal. A figure, a number or one word beats a sentence." Every visible string must be in `app/tests/ui-strings.allow.json`. Strings over 40 chars need `long: true`. Alert bodies at most 20 words. No em dash. No banner box. These are text budgets, not tab naming rules.
- Tab naming: no rule found in CONVENTIONS.md or GLOSSARY.md on tab names or length. The only tab-name ruling is cycle20 brief 05 (Nathan 2026-09-30) that the rider sees "activities" for the rides tab, as cited at `App.tsx:55-57`. Confirmed in `cycles/virgin-cycle20/` only by the App.tsx comment (not separately verified in that folder).
- Single-word tab labels are not scanned by the strings test. `cycles/virgin-cycle24/03-brief-map-tab.md` D15 says the tab label `map` and all ids are single-word, so the scanner does not list them. No allowlist entry for `map`, `activities`, `record`, `settings`, `demo`, or `routes` was found in `app/tests/ui-strings.allow.json`.

## 5. Where ROUTES and MAP appear
Categories: RUN = runtime, TEST = test, ALLOW = allowlist, ID = internal identifier, DOC = doc or design.

- RUN `app/App.tsx:58-60` TAB_LABEL `routes: 'map'`. Also `App.tsx:230` tab array, `:216` render, `:55-57` comment.
- ID `app/src/ui/tabNav.tsx:23` `Tab` type `'routes'`; `tabNav.tsx:27-36` comments (`source: 'routes'`, way detail).
- ID `app/src/ui/RoutesScreen.tsx:1-18` header ("MAP tab ... The file keeps its old name and the tab id 'routes'"), `:35` component `RoutesScreen`.
- ID `app/src/ui/catalogMapView.tsx`, `catalogMapModel.ts` (file names, no ROUTES word).
- RUN `app/src/ui/CatalogDetailScreen.tsx:95` title `ROUTE`; `:179` BACK TO MAP; `:219` ROUTES FROM HERE / ROUTES; `:228` ROUTES TO HERE.
- ALLOW `app/tests/ui-strings.allow.json:148` "ROUTES FROM HERE" (file CatalogDetailScreen.tsx); `:250` "BACK TO MAP" (reason cites the rename); `:307` "ROUTES TO HERE".
- ALLOW `app/tests/ui-strings.allow.json:1292` and `:1356` "NO SPORT YET · ADD ONE IN SETTINGS" (RidesScreen.tsx and RoutesScreen.tsx); `:1332` "Activities" (RidesScreen.tsx).
- TEST `app/tests/catalogmap_suite.ts:218` asserts `App.tsx` contains `routes: 'map'`.
- TEST `app/tests/recordflow_suite.ts:341-345` asserts tab array and Tab union contain `'routes'` (ids).
- TEST `app/tests/` also includes catalogdelete, routecreation, trendpanel, waymap suites that refer to route screens by name (not checked line by line).
- DOC `design/canonical/routes_day.svg`, `routes_night.svg`, `rides_*.svg`, `record_setup_*.svg`, `catalog_detail_*.svg`, `demo_*.svg`, `results_*.svg`: tab bar text reads ROUTES, RIDES, RESULTS (stale, pre-cycle23-25 design). Also `design/drafts/routes_draft-*.svg`.
- DOC `GLOSSARY.md:106, 112` (ROUTES, RESULTS) stale.
- DOC `STATE.md` (six tabs, RIDES / ROUTES / RESULTS) stale.
- DOC `cycles/virgin-cycle24/*`, `cycles/virgin-cycle25/*` use MAP / ROUTES as expected for those cycles.

## 6. History
- `cycles/virgin-cycle24/00-nathan-decisions.md:1-3`: cycle created 2026-10-06 for "one specific app change concerning the ROUTES tab."
- Line 9: "the 'YOUR PLACES' section of the ROUTES tab is poor and unattractive."
- Line 13 (DECIDED): "places and routes are merged into one view; the ROUTES tab is renamed the MAP tab, and the map is its most central piece."
- Line 14: "Activities tab = chronological view; MAP tab = spatial view of the same rides."
- Line 17 (DECIDED): "riders do NOT start activities from the MAP tab."
- Naming: the rename to MAP is recorded as decided. No alternative names, and no discussion of "map" vs "routes" wording, appear in the cycle24 decisions or in `cycles/virgin-cycle24/03-brief-open-questions.md`. OQ11 and OQ12 (lines 17-18) cover the detail button and file name only.
- `cycles/virgin-cycle24/03-brief-map-tab.md:22`: "User-visible tab label: `map` (was `routes`). Internal ids (`Tab` 'routes', `RoutesScreen.tsx`, `openCatalog`) stay."
- `cycles/virgin-cycle24/03-brief-map-tab.md:42` (D15): tab label `map` is single-word and not scanned.
- `cycles/virgin-cycle24/04-inspection-report.md:30`: inspector check "Tab label is MAP (`App.tsx:62`) OK."
- `cycles/virgin-cycle25/00-nathan-decisions.md:13`: "Tab bar after this: record, activities, map, settings, demo."
- Cycle24 Nathan decisions file also says "Standing rules still apply: minimal text, generic for every user's routes" (line 19).
- Cycle27 folder (`cycles/virgin-cycle27/`) holds 00-nathan-ideas.md and digests 01-05. No mention of MAP or ROUTES was found in cycles 26 and 27 besides loop and picker digests.

## Unverified / uncertain
- Tab label rendering and uppercase were read from code, not checked on device. The rider-visible strings may differ if `textTransform` or fonts change them.
- Whether the MAP tab word "map" was chosen by Nathan explicitly or by the executor; the decision record only says "renamed the MAP tab". No name alternatives recorded.
- Whether any on-device string like "NO SPORT YET" or "ROUTES FROM HERE" fits the budget rule (over 40 chars) was not measured beyond the allowlist.
- `cycles/virgin-cycle20/` was not searched for the activities ruling beyond the App.tsx comment.
- Test suites other than the four named were not read line by line.
- Whether `scripts/` or `deployment/` store-listing text uses ROUTES or MAP was not searched.
- The `design/` canonical SVG text was read from grep only; layout not inspected.
- Current build state (committed or published) of cycle22-25 changes was not checked; cycle24 notes say uncommitted and unpublished at the time.
