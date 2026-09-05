**Status: BRIEF WRITTEN, NOT YET EXECUTED.**
**Source:** `data/activities/TEST in virgin-app rides/qualifire-20260904/qualifire-20260904-notes.md`
("What i like about the last implementation is that now on the RIDES tab selecting a ride opens
it properly in a new window and i have the option to go back. It should be the same for the
routes tab, tapping on a 'place' or a 'way' should open it similarly in a new tab so we have more
info on it/features."). Size: **medium** — 1 new screen file, 1 new pure model + its test suite,
1 small moved-helpers module, wiring in `tabNav.tsx` + `App.tsx`, a slimmed `RoutesScreen.tsx`,
a two-line touch to `RideDetailScreen.tsx`. Roughly 350–450 lines of new/moved code, ~120 lines
of tests.
**Anchors verified against the mounted working tree on 2026-09-04 (Plan pass, Fable). Line
numbers below are from that read — Execute MUST re-verify every anchor before editing.**
**Sibling briefs touching the same file (read before executing):** `WP-I-edit-existing-route-gates.md`
(adds an `edit gates` button + inline `GateAdjustCard` to the EXPANDED way card in
`RoutesScreen.tsx`, and restructures the card's nested Pressable) and `WP-L-remove-ai-clutter-text.md`
(deletes the two prose footers at `RoutesScreen.tsx:164-168` and `:238-241`). Both are
independent of this one in the store layer but collide with it in `RoutesScreen.tsx`'s JSX. The
ordering rule is in §3.6; the reconciliation for whichever lands second is spelled out there.
**Naming note:** cycle1 already had a "WP-K" (sector-coloured trail) and its comments say
`WP-K` in `RideDetailScreen.tsx:390` and `routeMapView.tsx:204`. Tag every comment this brief
adds as **`WP-K (cycle 2)`** — never bare `WP-K` — so the two never get confused.

---

# WP-K (cycle 2) — ROUTES tab: tap a place or a way → full-screen detail, with BACK

## 1. What it is

Nathan likes exactly one thing about WP-H (cycle 1) and wants it copied: a RIDES row is no
longer an expand-in-place card; a tap mount-swaps a full-screen `RideDetailScreen` over the tab,
the tab bar disappears, a `‹ BACK` sits top-left, the system back button also closes it, and the
screen carries everything about that ride (facts, map, actions). ROUTES today still does the
OLD pattern for ways (expand-in-place) and does nothing at all for places.

This WP gives the ROUTES tab the same shape:

- Tapping a **place** row opens a full-screen **place detail**.
- Tapping a **way** card opens a full-screen **way detail** (which also carries every route on
  that way — see §3.1 for why a route does not get a third screen).
- Both have `‹ BACK`, hide the tab bar, close on the hardware back button, and land back on the
  ROUTES list (which remounts and re-reads the catalog, so a deletion made inside the detail is
  reflected).
- The delete actions that today live inside the expanded way card move INTO the detail screens
  (mirroring WP-H: "Export/Delete/Ignore/Set-as-reference all live there now" —
  `RidesScreen.tsx:5-7`). The list itself becomes tap-only rows, like RIDES.
- The detail screens replace the one hardcoded fiction on the tab today — every route shows
  `4 sectors · START ~160 m in` (`RoutesScreen.tsx:206`) regardless of its real gate set — with
  the real gate-set facts read from the catalog.
- **WP-I (cycle 2, `WP-I-edit-existing-route-gates.md` — "not being able to change gates for
  current routes yet") owns the edit-gates action** (`gateEditDraftFor`/`editRouteGates` in
  `store/wayFromRide.ts`, the `edit gates` button, the inline `GateAdjustCard`, the "history will
  be reset" confirm). WP-I's own brief says its entry point "goes inline" on today's expanded
  card and that "when the detail screen is built, the `edit gates` button and the card move
  there and `editRouteGates`/`gateEditDraftFor` are reused as-is" (WP-I lines 29, 254). This WP
  reserves the position on the way detail and, if WP-I has already landed, MOVES WP-I's button +
  card there unchanged (§3.3 item 3, §3.6). It never builds the action itself.

## 2. Current state (2026-09-04, exact repo)

### 2.1 `app/src/ui/RoutesScreen.tsx` — what a tap does today (261 lines)

- **Places (lines 126–169):** `YOUR PLACES` is one card; each landmark is a plain `<View>` row
  (line 138) — **no `Pressable`, a tap does nothing**. The row shows `label` (+ `· dormant`),
  `lat, lon · radiusM m` (lines 140–145), and — only when the landmark is user-owned AND
  referenced by no way (lines 135–136) — a `delete` outline button (lines 147–154) calling
  `onDeleteLandmark(SEED, l, bump)` (line 106).
- **Ways (lines 171–236):** each way is a `Pressable` card (line 183) whose `onPress` toggles a
  single local `open` id (`useState<string | null>` at line 113) — **expand-in-place**. Collapsed:
  `from → to` and `N routes · asks which one at START` (lines 187–193) with a `›`/`▾` chevron
  (line 195). Expanded (lines 197–233): one block per route — `routeVariantLabel(r.id, w, r.specs)`
  (line 204), the hardcoded `… · 4 sectors · START ~160 m in` line (line 206), a 260-px browse
  `RouteMapView` keyed on `r.refLineId` (lines 211–212), a `delete route` button when
  `!isSeedOwned(SEED, 'route', r.id)` (lines 213–220) — then `delete way` when
  `!isSeedOwned(SEED, 'way', w.id)` (lines 224–231).
- **Delete plumbing (lines 36–109):** pure UI helpers `joinLabels`, `landmarkLabels`,
  `applyDeletion` (saves the catalog first, then removes user refs, stored results, in-memory
  recorded results and the lastRide pointer, then `bump()`), `confirmDelete` (the
  `Alert.alert` with Cancel + destructive Delete), and the three entry points `onDeleteRoute`
  (74–90), `onDeleteWay` (92–104), `onDeleteLandmark` (106–109). These build their confirm copy
  from `removeRoute/removeWay/removeLandmark(userCatalog(), SEED, id)` (`store/catalogDelete.ts`),
  which runs the pure cascade BEFORE the alert so the copy names the real consequences. **Reuse
  these verbatim — do not rebuild.**
- Re-render idiom (lines 114–118): a `tick` state bumped after a delete so `currentCatalog()` /
  `userCatalog()` are re-read. `saveUserCatalog` updates `currentCatalog()` synchronously before
  the file write (`store/catalogStore.ts:113-117`), so after `applyDeletion` resolves the catalog
  already reflects the deletion.
- Two prose footers (lines 164–168, 238–241). `WP-L-remove-ai-clutter-text.md` (Part A items
  1–2) deletes both — **this brief leaves them exactly where they are** and keeps working whether
  or not WP-L has landed (§3.6).

### 2.2 `app/src/ui/RideDetailScreen.tsx` — the pattern to mirror (604 lines)

- **Entry:** `export default function RideDetailScreen({ request }: { request: RideDetailRequest })`
  (line 122). Everything it needs comes from the request (`rideId`, `source`, `startedAtMs`)
  plus module-level stores read per render.
- **Chrome (lines 361–368):** a `ScrollView` (`padding: 16, paddingBottom: 40`) whose first
  child is `styles.topBar` — `‹ BACK` `Pressable` (`hitSlop={8}`, `onPress={() => tabNav.closeRide()}`),
  a letter-spaced title `RIDE`, and a dim right-hand caption. Styles at lines 555–560
  (`topBar`, `backText`, `topTitle`, `topDate`).
- **Body:** one bordered card (`st.card`, line 587) with the headline facts, a 300-px browse
  `RouteMapView` (`variant="browse"`, `showRider={false}`, `zoom={1}`, lines 382–397), then
  `st.h2` section headers (`SECTORS`, `ON THIS ROUTE`).
- **Actions (lines 475–512):** an `ACTIONS` header, a `pillRow` (`flexDirection: 'row', gap: 8,
  flexWrap: 'wrap'`) of outline buttons (`styles.deleteBtn`/`deleteText`, lines 574–582: dim
  outline, never the accent colour for destructive actions), the primary accent button only for
  Export.
- **Primary close button (lines 358, 542–544):** a slim accent button `BACK TO RIDES` /
  `RECORD ANOTHER` chosen by `request.source`, also calling `tabNav.closeRide()`.
- **Delete-then-close (lines 287–313):** after a successful delete it calls `tabNav.closeRide()`
  — "RidesScreen remounts on close and refreshes itself".
- Model split: `rideDetailModel.ts` is a PURE view model (`rideDetailFor(rideId, startedAtMs,
  deps)` with every store read injected, `kind: 'route' | 'free' | 'none'`), tested headless in
  `tests/ridedetail_suite.ts`. The screen only formats/wires.

### 2.3 Navigation mechanism — `app/src/ui/tabNav.tsx` + `app/App.tsx`

There is **no React Navigation**. Tabs are a `useState<Tab>` in `Shell` (`App.tsx:55`), and the
ride detail is a second piece of Shell state, `rideDetail: RideDetailRequest | null`
(`App.tsx:63`), **mount-swapped in place of the active tab's screen** while non-null
(`App.tsx:143-148`):

```tsx
{rideDetail !== null ? <RideDetailScreen request={rideDetail} />
  : tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />
  : tab === 'rides' ? <RidesScreen />
  : tab === 'routes' ? <RoutesScreen />
  ...
```

- The tab bar is hidden while a detail is up: `const tabBarHidden = (tab === 'record' && recFullscreen) || rideDetail !== null;` (`App.tsx:122`).
- Hardware back (`App.tsx:75-88`): `rideDetail !== null` → close it and return `true`; else
  non-record tab → go to `record`; else default.
- Screens reach Shell only through the `TabNav` context (`tabNav.tsx:30-38`): `go(tab)`,
  `openRide(req)`, `closeRide()`, built once in `App.tsx:134-137`:
  `{ go: setTab, openRide: setRideDetail, closeRide: () => setRideDetail(null) }`.
- `RideDetailRequest.source` is `'post-stop' | 'rides'` (`tabNav.tsx:24-28`); its only consumer
  is the primary-button label at `RideDetailScreen.tsx:358`.

### 2.4 Facts available for a place / way / route (all already on file, nothing new to store)

- `Landmark` (`store/types.ts:21-34`): `label, lat, lon, radiusM, activeFromMs, activeUntilMs, offerAtStart`.
- `Way` (`types.ts:36-43`): `startLandmarkId, endLandmarkId, loopDiscriminator?, routeIds`.
- `Route` (`types.ts:45-66`): `wayId, refLineId, gateSetVersion, seeded, referenceRideId?, specs?`.
- `GateSet` (`types.ts:68-80`): `version, chainageM[], createdAtMs, origin?, note?`; latest via
  `gateSetFor(c, routeId)` (`store/catalog.ts:211-218`). User routes seed 5 gates
  START/G1/G2/G3/FINISH (`store/gateSeeding.ts:35-49`); names via `gateName(i, n)` and metres via
  `fmtChainage(m)` → `"1 842 m"` (`ui/gateAdjustModel.ts:32-36, 56-59`).
- Route length: `refFor(refLineId).length` (`live/refs.ts:35-59`, metres) — **throws on an
  unknown track**; `routeMapView.tsx:124` already wraps it: `const safeRefFor = (id) => { try { return refFor(id); } catch { return null; } }`. Do the same.
- Labels: `routeVariantLabel(id, way, specs)` (`store/defaultRoute.ts:53-67`),
  `routeLabelIn(catalog, id)` (73–80), `sortRoutesForDisplay` (90–96).
- Results: `storedResultsForRoute(routeId)` (`store/resultsStore.ts:223`), `rankedCountFor(routeId)`
  (`ui/colourModel.ts:70`), `getStoredResult(rideId)` (`resultsStore.ts:214`) — a `RideResult`
  carries `startedAtMs`, the exact key `openRide` wants.
- Ownership: `isSeedOwned(SEED, 'landmark' | 'way' | 'route', id)` (`store/catalogDelete.ts:54-58`).
- Date label: `dateTimeLabel(ms)` (`ui/rideHistoryModel.ts:50-54`, `'Tue 05 Aug · 08:31'`).

## 3. Design (decided here; §7 lists what is taste and what is not)

### 3.1 One screen, two kinds — no separate route screen

Mirror `RideDetailKind`: one `CatalogDetailScreen` driven by
`CatalogDetailRequest = { kind: 'place', id } | { kind: 'way', id }`. A **route does not get its
own screen**: Nathan named "place" and "way", a way's routes are its variants (WP-G), most ways
have exactly one, and today's expanded card already stacks every route's map under the way. So
the way detail carries one section per route (variant label, map, facts, actions) — the same
content as today's expanded card, now on a real screen with real facts. If a way ever has 3+
routes the page just scrolls; acceptable (it is what the card does today).

### 3.2 Place detail — what it shows (top to bottom)

1. Top bar: `‹ BACK` · `PLACE` · right caption `yours` / `shipped` (seed-owned).
2. Headline card: the label (big), `lat, lon` (5 dp, as today), `radius 180 m`,
   `dormant` marker when `!offerAtStart || (activeUntilMs !== null && activeUntilMs < now)`
   (today's exact rule, `RoutesScreen.tsx:129-130`), `offered at START` / `not offered at START`.
3. `WAYS FROM HERE` / `WAYS TO HERE` (one `WAYS` section is fine when both are empty → `No way
   uses this place yet.`): each touching way as a tappable row `A → B · N routes ›` that calls
   `tabNav.openCatalog({ kind: 'way', id })` — **replaces** the current request (idempotent, like
   `openRide`), so BACK from that way goes to the ROUTES list, not back to the place. (Keeping a
   stack is a taste call — §7.)
4. Map: **only when ≥1 touching route exists** — `RouteMapView variant="browse" gatesOnly
   gateRouteIds={touchingRouteIds} routeId={null} lat={null} lon={null} showRider={false}
   zoom={1} height={260}` (the WP-B free-ride map shape, `routeMapView.tsx:227-240`) — the
   streets around the place with the gates of every route that touches it. No landmark pin or
   radius circle: `routeMapView.tsx` has no landmark layer and adding one is out of scope (§7).
   With zero touching routes render no map (a browse map with `routeId={null}`, no rider and no
   trail returns `null` anyway — `routeMapView.tsx:449`).
5. `ACTIONS`: `Delete` (outline, `deleteBtn` style) **only** under today's exact rule
   (`RoutesScreen.tsx:135-136`: user-owned AND unreferenced) → `onDeleteLandmark(SEED, l, bump)`.
   No other action exists for a place today; do not invent one.
6. Slim accent `BACK TO ROUTES` button (mirrors `RideDetailScreen.tsx:542-544`).

No explanatory prose footer (Nathan's same-day "AI clutter" note — do not add any).

### 3.3 Way detail — what it shows

1. Top bar: `‹ BACK` · `WAY` · right caption `yours` / `shipped`.
2. Headline card: `From → To` (big); loop ways (`startLandmarkId === endLandmarkId`) show
   `loop · <loopDiscriminator>`; `N routes` + ` · asks which one at START` when N > 1
   (today's line 191–192 copy). Two tappable rows `from: <label> ›` / `to: <label> ›` →
   `openCatalog({ kind: 'place', id })`.
3. One section per route, in `sortRoutesForDisplay` order, header `ROUTE · <variantLabel>`
   (for a one-route way the variant label is `plain` or the seed's variant — keep it, it is what
   RECORD shows). Inside:
   - The 260-px browse `RouteMapView` exactly as today (`RoutesScreen.tsx:211-212`:
     `routeId={r.refLineId}`, uncoloured, no rider).
   - Facts rows (label left, value right, tabular nums), each omitted when unknown:
     `length` — `5.8 km` from `safeRefFor(refLineId)?.length` (`—` / omitted when null);
     `gates` — `5 · v2 · geometric` (count, `gateSetVersion`, `origin` if present);
     one row per gate `START 58 m`, `G1 1 442 m`, …, `FINISH 5 703 m` (`gateName`, `fmtChainage`);
     `rides on file` — `storedResultsForRoute(r.id).length`, and `ranked` — `rankedCountFor(r.id)`
     (this replaces today's `N ghost laps seeded` + the fake `4 sectors · START ~160 m in`);
     `reference ride` — when `r.referenceRideId` is set and `getStoredResult(referenceRideId)`
     exists: a tappable row `<dateTimeLabel(startedAtMs)> ›` →
     `tabNav.openRide({ rideId, source: 'routes', startedAtMs })` (the ride detail stacks ON TOP
     of the way detail — §4.1/4.2 — and its BACK returns here); when the id is set but no stored
     result exists: plain text `on file, not scored`; when unset (seed routes): omit the row.
   - **WP-I slot** — directly under the gate rows, before `delete route`. Two cases:
     (a) **WP-I not landed yet** (no `gateEditDraftFor` export in `store/wayFromRide.ts`): render
     nothing; leave the comment `{/* WP-I (cycle 2): the "edit gates" button + inline
     GateAdjustCard go here, per route — see WP-I-edit-existing-route-gates.md Step 2 items
     4-6. Not built by WP-K (cycle 2). */}`. WP-I then executes its Step 2 against
     `CatalogDetailScreen.tsx`'s per-route section instead of `RoutesScreen.tsx` (same JSX,
     same `confirmEditGates`/`onEditGates` functions, `bump` = this screen's tick) — WP-I's
     brief already anticipates this move.
     (b) **WP-I already landed** (the button/card/`editing`/`busy` state/`confirmEditGates`/
     `onEditGates` exist in `RoutesScreen.tsx`): MOVE them verbatim into `CatalogDetailScreen`'s
     way body — the `editing`/`busy` state and the two functions into the screen component, the
     `edit gates` Pressable + the `GateAdjustCard` block into the per-route section at this
     position — and delete them from `RoutesScreen.tsx` along with the rest of the expanded
     card (§4.6). `gateEditDraftFor`/`editRouteGates` are imported unchanged. Do not alter their
     copy, their confirm, or the card's props.
   - `delete route` outline button when `!isSeedOwned(SEED, 'route', r.id)` →
     `onDeleteRoute(CATALOG, SEED, w, r, bump)`.
4. `ACTIONS`: `Delete way` outline button when `!isSeedOwned(SEED, 'way', w.id)` →
   `onDeleteWay(CATALOG, SEED, w, bump)`.
5. Slim accent `BACK TO ROUTES` button.

### 3.4 After a delete inside a detail

`bump` in the detail screen is NOT a plain tick: after `applyDeletion` resolves it must check
whether the screen's subject still exists in `currentCatalog()` (a route delete can cascade the
way away — `onDeleteRoute`'s "only route on this way" branch; a way delete always removes the
way and may remove orphan places). Rule: **subject gone → `tabNav.closeCatalog()`; subject still
there → tick.** The model's `null` return (§4.4) is the same check, so the screen can simply
re-run the model and close on `null`.

### 3.5 Stacking order in Shell

`rideDetail` (top) → `catalogDetail` → the tab. Closing the ride detail reveals whatever was
underneath (the way detail, if it opened the ride; the RIDES list otherwise). This is what makes
the reference-ride cross-link cost nothing.

### 3.6 Ordering against WP-I and WP-L (same file, `RoutesScreen.tsx`)

All three are independent in intent; only their JSX edits overlap. Whichever executes second
re-anchors, per this table — Execute reads the file first and picks the row that matches:

| Already landed | What this WP does differently |
|---|---|
| neither | Brief as written. Footers stay (WP-L will delete them later, from the slimmed file — trivial re-anchor for WP-L: "last child of the YOUR PLACES card / of the ScrollView" still holds). |
| WP-L only | §4.6 simply has no footers to leave alone. Nothing else changes. |
| WP-I only | §3.3 item 3 case (b): move WP-I's button, card, state and two functions into the way detail; the nested-Pressable restructure WP-I made (its Step 2 item 3) is deleted together with the expanded card — the list card goes back to being ONE Pressable whose only job is `openCatalog` (no inline body remains, so the footgun WP-I fixed no longer exists). WP-I's acceptance criterion 1 ("an expanded USER route … shows `edit gates`") is then satisfied on the way detail instead — say so in the execution report so the WP-I status line can be updated. |
| both | Both rows above. |

If this WP lands FIRST, add one line to `WP-I-edit-existing-route-gates.md`'s status header:
"WP-K (cycle 2) landed first — execute Step 2 against `app/src/ui/CatalogDetailScreen.tsx`'s
per-route section (the marked WP-I slot), not `RoutesScreen.tsx`; skip Step 2 item 3 (no nested
Pressable remains)." The coordinator owns the README table; Execute only appends that line.

## 4. The fix — file by file

### 4.1 `app/src/ui/tabNav.tsx` (extend, ~25 lines)

- `RideDetailRequest.source`: `'post-stop' | 'rides' | 'routes'` (line 26). Update the doc
  comment (lines 17–23): `'routes'` = opened from a way detail's reference-ride row; CLOSE lands
  back on that way detail.
- New: `export type CatalogDetailRequest = { kind: 'place'; id: string } | { kind: 'way'; id: string };`
- `TabNav` (lines 30–38) gains `openCatalog(req: CatalogDetailRequest): void;` and
  `closeCatalog(): void;` with doc comments in the same voice as `openRide`/`closeRide`
  ("mount-swapped in place of the active tab, hides the tab bar; idempotent — re-opening
  replaces the request; the ride detail, when open, sits above it").

### 4.2 `app/App.tsx` (wire, ~20 lines)

- Import `CatalogDetailScreen` (new, §4.5) and `type CatalogDetailRequest` (line 41's import).
- `const [catalogDetail, setCatalogDetail] = useState<CatalogDetailRequest | null>(null);` next to
  `rideDetail` (line 63), with a `WP-K (cycle 2)` comment pointing at WP-H's comment above it.
- Hardware back (lines 75–88): insert **between** the `rideDetail` branch and the `tab !== 'record'`
  branch: `if (catalogDetail !== null) { setCatalogDetail(null); return true; }`; add
  `catalogDetail` to the effect's deps.
- `tabBarHidden` (line 122): `|| catalogDetail !== null`.
- `nav` (lines 134–137): add `openCatalog: setCatalogDetail, closeCatalog: () => setCatalogDetail(null)`.
- Render (lines 143–148): insert `: catalogDetail !== null ? <CatalogDetailScreen request={catalogDetail} />`
  **after** the `rideDetail` branch and **before** the `tab === 'record'` branch.

### 4.3 New `app/src/ui/catalogDeleteActions.ts` (move, no logic change)

Move `joinLabels`, `landmarkLabels`, `applyDeletion`, `confirmDelete`, `onDeleteRoute`,
`onDeleteWay`, `onDeleteLandmark` (`RoutesScreen.tsx:36-109`) **verbatim** into this module,
`export` the three `onDelete*` functions, and carry the imports they need
(`Alert` from react-native, `saveUserCatalog`/`userCatalog` from catalogStore, `removeLandmark`/
`removeRoute`/`removeWay`/`CatalogDeletion` from catalogDelete, `removeUserRef`,
`removeStoredResult`/`storedResultsForRoute`, `clearLastRide`/`dropRecorded`/`getLastRide`,
`routeLabelIn`, the `Catalog`/`Landmark`/`Route`/`Way` types). File header: one paragraph saying
these are WP-Q's ROUTES-tab delete actions, moved here by WP-K (cycle 2) so the list and the
detail screens share them; signatures unchanged. It imports `react-native` (`Alert`) so it is
NOT headless-testable — that is fine, nothing in it is new. Then delete lines 36–109 from
`RoutesScreen.tsx` and drop the imports it no longer needs (verify each with `tsc`).
`RoutesScreen.tsx` will not import `onDelete*` at all after §4.6 (no delete buttons on the list).

### 4.4 New `app/src/ui/catalogDetailModel.ts` (pure, ~130 lines) + `app/tests/catalogdetail_suite.ts`

Same contract as `rideDetailModel.ts`: pure, every store read injected, no JSX, no expo imports.
Its static import chain must stay JSON-free (`store/types.ts`, `store/catalog.ts` for
`gateSetFor`, `store/defaultRoute.ts` for the labels/sort, `store/catalogDelete.ts` for
`isSeedOwned`, `ui/gateAdjustModel.ts` for `gateName`/`fmtChainage` — all verified pure on
2026-09-04, none pulls `catalog.seed.json`), so the suite needs no `registerHooks` shim. If
Execute finds otherwise, copy the shim from `tests/ridedetail_suite.ts:20-30` and say so.

```ts
export interface CatalogDetailDeps {
  catalog: Catalog;            // currentCatalog()
  seed: Catalog;               // shippedCatalog()
  nowMs: number;
  refLengthM: (refLineId: string) => number | null;   // safeRefFor(id)?.length ?? null
  resultsOnFile: (routeId: string) => number;         // storedResultsForRoute(id).length
  rankedCount: (routeId: string) => number;           // rankedCountFor(id)
  storedStartMs: (rideId: string) => number | null;   // getStoredResult(id)?.startedAtMs ?? null
}

export interface TouchingWayModel { wayId: string; label: string; direction: 'from' | 'to' | 'loop'; routeCount: number }
export interface PlaceDetailModel {
  id: string; label: string; coordsLabel: string; radiusLabel: string;
  dormant: boolean; offerAtStart: boolean; seedOwned: boolean; deletable: boolean;
  ways: TouchingWayModel[]; touchingRouteIds: string[];
}
export interface GateRowModel { name: string; chainageLabel: string }
export interface RouteDetailModel {
  id: string; refLineId: string; variantLabel: string; fullLabel: string;
  seedOwned: boolean; deletable: boolean;
  lengthLabel: string | null;                       // '5.8 km' (1 dp; '850 m' under 1 km)
  gatesLabel: string | null;                        // '5 · v2 · geometric' — null when no gate set
  gateRows: GateRowModel[];                         // [] when no gate set
  ridesOnFile: number; rankedCount: number;
  referenceRide: { rideId: string; startedAtMs: number } | null;   // only when a stored result exists
  referenceUnscored: boolean;                       // referenceRideId set but no stored result
}
export interface WayDetailModel {
  id: string; label: string; loop: boolean; loopDiscriminator: string | null;
  from: { id: string; label: string } | null; to: { id: string; label: string } | null;
  seedOwned: boolean; deletable: boolean; asksAtStart: boolean; routes: RouteDetailModel[];
}

export function placeDetailFor(id: string, deps: CatalogDetailDeps): PlaceDetailModel | null;
export function wayDetailFor(id: string, deps: CatalogDetailDeps): WayDetailModel | null;
export function fmtLengthM(m: number): string;   // exported so the suite pins the format
```

Rules the model encodes (each one a test):
- `null` when the id is not in `deps.catalog` (the screen closes on it — §3.4).
- `dormant` = today's rule verbatim (`RoutesScreen.tsx:129-130`); `deletable` for a place =
  `!isSeedOwned(seed,'landmark',id) && no way references it` (lines 135–136); for a way/route =
  `!isSeedOwned(...)` (lines 181, 201).
- `ways` for a place: every way whose start OR end is the place; `direction` `'loop'` when both,
  else `'from'`/`'to'`; `label` = `from → to` via landmark labels (id fallback, as
  `RoutesScreen.tsx:44`); `routeCount` = routes with that `wayId`. `touchingRouteIds` = the ids
  of all those routes, catalog order, deduplicated.
- Way routes in `sortRoutesForDisplay` order; `variantLabel` = `routeVariantLabel(r.id, w, r.specs)`;
  `fullLabel` = `routeLabelIn(catalog, r.id)`; `asksAtStart` = `routes.length > 1`.
- Gate facts from `gateSetFor(catalog, r.id)` (latest version): `gatesLabel` =
  `${n} · v${version}` + ` · ${origin}` when `origin` is set; `gateRows[i]` =
  `{ name: gateName(i, n), chainageLabel: fmtChainage(chainageM[i]) }`.
- `lengthLabel` via `fmtLengthM`: `< 1000` → `'850 m'`, else `(m/1000).toFixed(1) + ' km'`.
- `referenceRide` only when `referenceRideId` is set AND `storedStartMs(referenceRideId)` is
  non-null; `referenceUnscored` when set but null.

Tests (`tests/catalogdetail_suite.ts`, registered in `tests/run.ts`'s import list after
`./ridedetail_suite.ts`): build a small inline catalog (2 places, 1 way with 2 routes, one route
with a 5-gate set v2 origin geometric and `referenceRideId`, plus 1 orphan user place and 1
seed-owned place), and assert at minimum: unknown id → null (both functions); place ways /
direction / touchingRouteIds; loop direction; dormant by `offerAtStart=false` and by expired
`activeUntilMs`; place deletable only when user-owned AND unreferenced; way routes sorted
(Std before Alt); gate rows names + `fmtChainage` output; `gatesLabel` with and without origin;
`lengthLabel` null when `refLengthM` returns null, `'850 m'`, `'5.8 km'`; `referenceRide` vs
`referenceUnscored` vs omitted.

### 4.5 New `app/src/ui/CatalogDetailScreen.tsx` (~220 lines)

`export default function CatalogDetailScreen({ request }: { request: CatalogDetailRequest })`.
Structure to copy from `RideDetailScreen.tsx`: `useTheme`, `useTabNav`, `makeStyles(t)` with the
same `topBar/backText/topTitle/topDate/deleteBtn/deleteText/pillRow` values (lines 555–583 —
copy the values, do not import them; that file exports nothing but the screen), a module `st`
with `h2/card/slimBtn/slimBtnText` (lines 586–597), a `tick` state, the `ScrollView` with
`padding: 16, paddingBottom: 40`, the top bar with `‹ BACK` → `tabNav.closeCatalog()`, the slim
accent `BACK TO ROUTES` at the bottom → `tabNav.closeCatalog()`.

Per render: `const CATALOG = currentCatalog(); const SEED = shippedCatalog();` (B-39 rule, read
per render — `RoutesScreen.tsx:120-122`), build `deps` (§4.4 mapping, `safeRefFor` defined
locally exactly as `routeMapView.tsx:124`), `useMemo` the model on `[request, tick]`. If the model
is `null` (subject deleted, or a stale request) render nothing but call `tabNav.closeCatalog()`
in a `useEffect` — never during render.

`bump` passed to the `onDelete*` helpers: `() => setTick((v) => v + 1)`; the null-model effect
above then closes the screen when the subject is gone (§3.4). Because `applyDeletion` already
awaited `saveUserCatalog`, the re-run model sees the post-delete catalog.

Two inner components `PlaceBody` / `WayBody` (or one switch — Execute's call) rendering §3.2 /
§3.3. Facts rows: a two-column row style (`factRow: { flexDirection:'row', paddingVertical:3 }`,
label `color: t.textDim, flex: 1`, value `color: t.text, fontVariant: ['tabular-nums']`). Tappable
cross-link rows use `Pressable` + the `›` chevron as `RidesScreen.tsx:130-135` does. Reference-
ride row calls `tabNav.openRide({ rideId, source: 'routes', startedAtMs })`.

### 4.6 `app/src/ui/RoutesScreen.tsx` (slim, net −110 lines)

- Remove `open` state (line 113) and every expanded-card branch (lines 197–233), the per-row
  delete buttons (147–154, 213–220, 224–231) and the deletion helpers (36–109, moved in §4.3).
  Remove now-unused imports (`Alert`, `Pressable` stays, `removeLandmark/…`, `removeUserRef`,
  `removeStoredResult/storedResultsForRoute`, `clearLastRide/dropRecorded/getLastRide`,
  `rankedCountFor`, `routeVariantLabel`, `RouteMapView`, `userCatalog`/`saveUserCatalog`) — let
  `tsc` and a read of the file confirm the exact set. `tick`/`bump` (114–118) go too unless
  something still needs them (nothing should).
- Places: each row becomes a `Pressable` (`onPress={() => tabNav.openCatalog({ kind: 'place', id: l.id })}`)
  keeping today's two text lines and adding a dim `›` at the right (as the way card has).
- Ways: the card's `onPress` becomes `tabNav.openCatalog({ kind: 'way', id: w.id })`; the
  chevron is always `›` (no `▾`). Keep the `from → to` and `N routes · asks which one at START`
  lines exactly.
- `useTabNav` import + `const tabNav = useTabNav();` (as `RidesScreen.tsx:20, 26`).
- Update the file-header comment: WP-Q's delete paragraph now says delete lives on the
  `CatalogDetailScreen` (WP-K, cycle 2); the list is tap-only like RIDES.
- Leave both prose footers (164–168, 238–241) untouched if still present (§2.1, WP-L).
- If WP-I landed first: also remove its `editing`/`busy` state, `confirmEditGates`/`onEditGates`,
  the `edit gates` Pressable, the inline `GateAdjustCard` block, the `dim` style and the imports
  they brought (`editRouteGates`, `gateEditDraftFor`, `GateAdjustDraft`, `GateAdjustCard`,
  `createExpoFsAdapter`, `replaceRecorded`, `getStoredResult`) — all of it moves to
  `CatalogDetailScreen.tsx` (§3.3 case b). Net: after this WP `RoutesScreen.tsx` renders rows and
  cards, nothing else.
- ROUTES remounts when the detail closes (it is unmounted while the detail is up — §2.3), so it
  re-reads `currentCatalog()` on its own; no tick needed.

### 4.7 `app/src/ui/RideDetailScreen.tsx` (2 lines)

Line 358: `const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : request.source === 'routes' ? 'BACK TO ROUTE' : 'BACK TO RIDES';`.
Lines 302–304's comment: add "from 'routes' the way detail underneath is revealed". Nothing else —
`closeRide()` already just pops the ride layer.

## 5. Acceptance criteria

1. ROUTES tab: a tap on a place row opens a full-screen place detail; a tap on a way card opens a
   full-screen way detail. The tab bar is hidden while either is up; `‹ BACK`, the bottom
   `BACK TO ROUTES` button and the hardware back button all return to the ROUTES list.
2. Nothing on the ROUTES list expands in place any more, and no delete button renders on the
   list.
3. Way detail shows, per route, the browse map exactly as today plus real facts: length,
   gate count/version(/origin), one row per gate with its name and metres, rides on file, ranked
   count, and the reference-ride row when applicable. The string `4 sectors · START ~160 m in`
   no longer exists anywhere in `app/src`.
4. Delete route / delete way / delete place still work with the same confirm copy as today
   (moved code, not rewritten), and a delete that removes the screen's subject closes the
   screen; one that does not (route deleted, way survives) re-renders it in place.
5. Seed-owned items never show a delete button (same `isSeedOwned` gates as today).
6. Tapping the reference-ride row opens `RideDetailScreen` with primary button `BACK TO ROUTE`;
   closing it lands back on the way detail; hardware back does the same, one layer at a time.
7. Place ↔ way cross-link rows work (place → its ways; way → its two places).
8. `tests/catalogdetail_suite.ts` exists, is registered in `run.ts`, and its tests pass;
   `tsc --noEmit` exits 0; the full suite has zero FAIL.
9. No new explanatory prose was added to any of the three ROUTES surfaces.

## 6. Verification

```
cd app && node --experimental-strip-types tests/run.ts     # zero FAIL; new catalogdetail tests listed as PASS
cd app && ./node_modules/.bin/tsc --noEmit                  # exit 0
grep -rn "160 m in" app/src                                  # no output
grep -rn "onDelete\(Route\|Way\|Landmark\)" app/src/ui        # defined in catalogDeleteActions.ts, called only from CatalogDetailScreen.tsx
```

On-device (Nathan, dev client): the nine criteria above, plus the one thing no test can see —
that the way detail's per-route map still pans/zooms as the old expanded card's did. Report
plainly which of these were checked by code/tests and which are owed an on-device look.

## 7. Stop-on-ambiguity

STOP and report verbatim — never guess, never rule from the coordinator's chat — on any anchor
mismatch or on any of these:

- `RoutesScreen.tsx` no longer matches §2.1 (e.g. the prose footers are already gone because the
  clutter WP landed first, or the delete helpers moved). Re-verify, report the drift, continue
  only if the drift is purely cosmetic to this brief's edits.
- WP-I has landed in a shape §3.3 case (b) does not describe (e.g. the button is somewhere other
  than the expanded route block, the state is not `editing`/`busy`, or the card is opened via a
  different component): stop and report the actual shape — do not improvise the move.
- WP-L has landed and changed more in `RoutesScreen.tsx` than deleting the two footers: stop and
  report the diff.
- `tabNav.tsx`/`App.tsx` have grown a third overlay since 2026-09-04 (stacking order in §3.5
  would need a ruling).
- The model's static import chain turns out to pull `catalog.seed.json` (see §4.4 — add the shim
  and say so; that is the only ambiguity Execute may resolve alone).

Taste calls decided here with a stated default — implement the default, do NOT stop on them, but
list them in the execution report so Nathan can overrule:
- **T1** No third (route) screen; routes live inside the way detail (§3.1).
- **T2** Cross-links between place and way REPLACE the catalog request rather than stacking
  (§3.2 item 3). A proper back-stack is a small later change (`catalogDetail` becomes an array).
- **T3** Place map = `gatesOnly` over the touching routes, no landmark pin/radius circle (§3.2
  item 4). A landmark layer in `routeMapView.tsx` is a follow-up if Nathan wants the place itself
  drawn.
- **T4** Fact-row wording and order in §3.3 item 3; `fmtLengthM` format.
- **T5** Delete affordances moved off the list entirely (mirrors WP-H) rather than duplicated.
