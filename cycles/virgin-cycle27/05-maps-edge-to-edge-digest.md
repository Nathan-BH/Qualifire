# 05 - Maps edge to edge: digest

Date: 2026-10-08. Read-only digest of app/src/ui (source read on device; nothing run, no device screenshots). Line numbers are from the files as they stand on disk.

## TL;DR
- Edge to edge today: only the ACTIVITIES feed card maps (activityCard.tsx:95 `bleed`, :138 mapSlot has no horizontal margin) and the MAP tab catalog map (catalogMapView.tsx:241 frame, :364-365 style, no border or radius).
- Every other map uses the WayMapView default frame: radius 16 (theme.ts:119 `radius.card`), 1 dp `cardBorder`, `overflow hidden`, inset by its parent's padding or margin (12, 16 or 20 dp per screen).
- The mechanism is the opt-in `bleed` prop on WayMapView (wayMapView.tsx:238 prop, :317 and :712 choose `st.frameBleed`, :1034 frameBleed = no border, no radius). Parents must add no horizontal padding; App shell (App.tsx:273, :276) and RidesScreen (RidesScreen.tsx:264-267) add none.
- Going edge to edge elsewhere means removing the parent inset per screen (raceColumn paddingHorizontal 12 in RecordScreen, ReplayScreen, DemoScreen; RideDetail mapWrap marginHorizontal 16; CatalogDetail ScrollView padding 16) and passing `bleed` at each WayMapView call. No shared map-level spacing token exists.
- Tests pin the current rule: recordflow_suite.ts:369-388 (card map has no margin/radius/border; `bleed` opt-in; default frame string asserted at :383). Changing the default frame or card map would need those pins updated.
- Conflict to raise with Nathan: cycle23 decisions and brief-03 keep the DETAIL page map bordered and rounded (00-nathan-decisions.md:39; brief-03-detail-page-redesign.md:304, :322 "full-bleed deferred"). Nathan's current ask covers all maps, so this recorded rule is superseded if he confirms it.

## Summary table

| map | screen | state | file:line |
|---|---|---|---|
| Feed block map (live, up to 3-5 at once) | ACTIVITIES (RidesScreen) | EDGE-TO-EDGE | activityCard.tsx:84-98 (WayMapView bleed), :138 mapSlot; wayMapView.tsx:712, :1034 |
| Feed placeholder (non-live block) | ACTIVITIES | EDGE-TO-EDGE | activityCard.tsx:139-145 (absolute fill, race.bg, no radius) |
| Ride detail map (route ref / reference / free / other, 4 branches) | RideDetailScreen (opened from ACTIVITIES, RESULTS, ROUTES) | INSET 16 + rounded 16 | RideDetailScreen.tsx:449, 498, 510, 526 (mapWrap); :640 marginHorizontal 16; WayMapView at :450, :499, :511, :527 (height 320) |
| Record setup (idle) map | RecordScreen idle | INSET 20 + rounded 16 | RecordScreen.tsx:1535 (height 330); parent ScrollView content padding 20 at :1697 |
| Record armed map | RecordScreen armed | INSET 12 + rounded 16 | RecordScreen.tsx:1261, :1267 (fill, minHeight 220); raceColumn :1712-1714 (paddingHorizontal 12) |
| Record running map (race, big) | RecordScreen running | INSET 12 + rounded 16 | RecordScreen.tsx:1410, :1416; raceColumn :1712-1714 |
| Replay map | ReplayScreen | INSET 12 + rounded 16 | ReplayScreen.tsx:232; raceColumn :280-283 (paddingHorizontal 12) |
| Demo running map (first ride / way mode) | DemoScreen (demo tab) | INSET 12 + rounded 16 | DemoScreen.tsx:663, :666; raceColumn :856-859 |
| MAP tab catalog map (overview / place / route) | RoutesScreen (ROUTES tab, MAP) | EDGE-TO-EDGE | RoutesScreen.tsx:89 mounts CatalogMapView inside View flex 1 (no padding); catalogMapView.tsx:241 frame; :364 `frame: flex 1, alignSelf stretch`; no border, no radius |
| Catalog detail place map | CatalogDetailScreen | INSET 16 + rounded 16 | CatalogDetailScreen.tsx:99 ScrollView padding 16; :235-238 View marginTop 12; WayMapView :236 (height 260) |
| Catalog detail WAY map | CatalogDetailScreen (WAY section) | INSET (parent unclear) + rounded 16 | CatalogDetailScreen.tsx:407-408 (marginTop 16; container not read) |
| Gate adjust map | GateAdjustCard (in RecordScreen, RideDetailScreen, DemoScreen, GateAdjustScreen) | INSET inside a bordered card + rounded 16 | gateAdjustCard.tsx:140 card (border, t.card), :146-147 mapWrap, :218 mapWrap marginTop 10; MAP_H 280 at :65 |
| "map unavailable" placeholder (no native module) | any WayMapView | same frame as its caller | wayMapView.tsx:315-325 (uses bleed or default frame) |

No map on RESULTS itself: RESULTS shows ResultsPlot (resultsPlot.tsx, a plot, not a map). Ride detail is opened from it.

## 1. Inventory and sizing

Shared component: `WayMapView` (wayMapView.tsx, default export at :322-325) picks the MapLibre path or the "map unavailable" path. Layout is set on the outer View at :317-319 (ML null) and :712-714 (MapLibre):
- `props.bleed ? st.frameBleed : st.frame`
- `props.fill ? { flex: 1, alignSelf: 'stretch' } : { height: h }` where `h = props.height ?? 190` (default at :316 for the null path; MapLibre path not re-read for its default).
- Background `t.race.bg`, border `t.cardBorder` (wayMapView.tsx:319 null path, :714 MapLibre path).

Styles (wayMapView.tsx:1033-1035):
- `frame`: alignSelf stretch, borderRadius radius.card (16), borderWidth 1, overflow hidden. This is the default for every caller.
- `frameBleed`: alignSelf stretch, overflow hidden. No border, no radius. Used only by activityCard.tsx:95.
- `mapFill`: flex 1, alignSelf stretch (wayMapView.tsx:731). Map gets `style={{ flex: 1 }}` (:735).

Callers of WayMapView (grep of src/ui): CatalogDetailScreen x2, DemoScreen x2, RecordScreen x3, ReplayScreen x1, RideDetailScreen x4, activityCard x1, gateAdjustCard x1. Only activityCard passes `bleed` (confirmed by grep for `bleed` in src/ui).

Per-screen parent insets (all read from source):
- RIDES feed: RidesScreen.tsx:226 FlatList, :254 contentContainerStyle `feed` (paddingBottom 24 only, :267); :264 container flex 1. Header row :265 has paddingHorizontal 16 but sits outside the list. No horizontal padding reaches the cards.
- App shell: App.tsx:273 root (paddingTop status bar only), :276 content (flex 1, paddingBottom only when tab bar hidden). No horizontal padding.
- RecordScreen and others: see table.

## 2. Edge-to-edge reference (ACTIVITIES)

How the feed card achieves it:
1. The map frame drops its border and radius: WayMapView receives `bleed` (activityCard.tsx:95), so it takes `st.frameBleed` (wayMapView.tsx:712).
2. The card's map slot has no horizontal margin: `mapSlot: { marginTop: 6, height: CARD_MAP_HEIGHT }` (activityCard.tsx:138). The earlier `marginHorizontal: 16` was removed by brief 04 (cycles/virgin-cycle23/brief-04-feedback-polish.md:101-130, :212).
3. Text keeps its 16 dp side padding on its own rows: `head` paddingHorizontal 16 (activityCard.tsx:130), hero paddingHorizontal 16 (:133).
4. The block itself has no horizontal padding: `block` sets paddingTop/paddingBottom and a bottom border only (activityCard.tsx:129).
5. Nothing above it insets: RidesScreen feed has no horizontal padding (RidesScreen.tsx:267); App content has none (App.tsx:276).

Shared vs per-screen: the bleed decision lives in one shared component (WayMapView `bleed` prop, default false). Geometry constants are shared in feedModel.ts:45-49 (CARD_PAD_TOP/BOTTOM 22, FEED_DIVIDER_DP 3, CARD_MAP_HEIGHT 150). Card gestures are `'readonly'` (activityCard.tsx:38), so the map does not take one-finger drags; the card's `mapFill` gets pointerEvents none for readonly (wayMapView.tsx:731).

The MAP tab's full-bleed map (catalogMapView.tsx) is a separate component (catalogMapView.tsx:1-12 says it is a sibling of WayMapView, not a mode of it). It has its own frame style and no `bleed` prop.

Radius and border tokens: `radius` in theme.ts:119 (card 16, big 24, pill 99, btn 10). Border colour `t.cardBorder` from the theme. No spacing token for map insets; every inset is a literal (12, 16, 20).

## 3. Overlays anchored to the map frame

Overlays are absolutely positioned inside the map frame, so their distance from the screen edge follows the frame's inset.

WayMapView (wayMapView.tsx):
- Zoom bar: `zoomBar` right 6, top 6 (style :1039; JSX :980-1015). Shown only in the MapLibre path; whether it renders on readonly card maps was not traced (UNCLEAR).
- Credit "i" button: `creditBtn` right 6, bottom 6, 22x22 (style :1048; JSX :368-380). Mounted by the MapLibre path. brief-04 notes it sits 6 dp from the screen edge on the feed card and must stay tappable (brief-04 line 85).
- Credit card: `creditCard` right 6, bottom 32, maxWidth 85% (style :1054; JSX :354-366).
- Badges: `badge` bottom 6, left 6 (style :1061). Used for "map unavailable" (:321), "OFF ROUTE" (:1021) and "waiting for GPS" (:1026).
- Dimmed state: `dimmedFrame` opacity 0.4 (:1038) applied to the frame in the MapLibre path (:715).

MAP tab (catalogMapView.tsx):
- Zoom bar: right 6, top 6 (:365; JSX :338).
- Credit: `<Credit rung="maplibre">` mounted at catalogMapView.tsx:352.

ROUTES sheet (RoutesScreen.tsx):
- Sheet overlay: absolute, left 12, right 12, bottom 34, maxHeight 280 (style :168; JSX :107). Floats over the MAP. Not an inset of the map itself.
- `badge` style top 8, left 8 (RoutesScreen.tsx:166). Probably the sport chip described in cycle24 brief 03 (line 176); use not verified.

Gate adjust card: gate taps are map features, no overlay chips (wayMapView.tsx:301 note); the card has its own chip row elsewhere (not traced).

## 4. Tests and docs

Tests:
- app/tests/recordflow_suite.ts:369 card map has no `marginHorizontal`, `borderRadius` or `borderWidth`; :370 `showRider={false} bleed gestures=...` element shape.
- app/tests/recordflow_suite.ts:377-388: `bleed` is opt-in; both frame sites use `props.bleed ? st.frameBleed : st.frame`; no unconditional `st.frame`; default frame string `frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' }` pinned (:383); frameBleed string pinned (:384); only the feed card passes `bleed` (:388).
- app/tests/waymap_suite.ts:340, :348: "map unavailable" badge text, and no `<Modal` in wayMapView.tsx. No pin on the frame style.
- catalogmap_suite.ts: no pin on frame or radius (per brief-04 line 96; not re-grepped).

Design docs and cycle notes:
- cycles/virgin-cycle23/00-nathan-decisions.md:33 "Maps run edge to edge (full-bleed, no corner radius, no border)" for the feed.
- :39 first build keeps the bordered inset map (preview B); full-bleed detail map DEFERRED. Same bordered map for "the detail page's big map (inset with margins)".
- :55 feed maps edge to edge; "The DETAIL page's big map stays exactly as it is."
- cycles/virgin-cycle23/brief-03-detail-page-redesign.md:221 `mapWrap: { marginHorizontal: 16 }`; :304 bordered rounded frame, 16 dp margins; :322 full-bleed map deferred.
- cycles/virgin-cycle23/brief-04-feedback-polish.md:11 feed maps edge to edge; :88-96 screen chain; :101 row heights unchanged.
- cycles/virgin-cycle24/00-nathan-decisions.md:27 overview "full-bleed map".
- cycles/virgin-cycle24/03-brief-map-tab.md:15 "one full-bleed MapLibre map"; :159 frame with no border radius.
- STATE.md and GLOSSARY.md: grep for map edge, bleed, inset, margin, radius, full width returned no match.
- design/canonical/*.svg: no map-width or radius rule found by grep. rides_day.svg still draws bordered rounded rows (rx 16 at :18, :43), so it predates the bleed decision (UNVERIFIED that these rows are maps).

## Unverified / uncertain
- Whether the bleed change at activityCard.tsx:95 and wayMapView.tsx:712 is committed (code is on disk; git log not checked).
- Zoom bar visibility on readonly card maps (UNCLEAR).
- CatalogDetailScreen.tsx:407-408 WAY map: parent container and padding not read.
- gateAdjustCard.tsx card padding (line ~140 card style) not read; inset total inside the card unknown.
- catalogMapView.tsx Credit mount line (~350) and RoutesScreen.tsx:166 badge use: not re-read.
- Default height of the MapLibre path (wayMapView.tsx ~:600-700) not read; only the ML-null default (190) was confirmed.
- No device run, screenshot or safe-area check: App uses useSafeAreaInsets only for the tab bar (App.tsx:97); map frames do not read insets. Side insets on landscape or notched phones were not assessed.
- design/canonical SVG rules were checked by grep only, not by reading each file.
