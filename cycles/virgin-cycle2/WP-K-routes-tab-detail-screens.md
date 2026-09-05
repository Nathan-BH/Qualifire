**Status: DONE. Landed on the device (new `app/src/ui/CatalogDetailScreen.tsx`, `catalogDetailModel.ts`, `catalogDeleteActions.ts`, plus `RoutesScreen.tsx`, `App.tsx`, `tabNav.tsx`, `RideDetailScreen.tsx`) on 2026-09-05, commit `1a3e99c`, reconciled against landed WP-J (see "Update 2026-09-05" section below — WP-I's inline gate-adjust code was already gone by the time WP-K executed, so the planned relocation became a one-line `openGateAdjust` wire-up instead). `RoutesScreen.tsx` slimmed 282→113 lines: tap-only rows, no inline expand/delete/edit. `App.tsx` now mount-swaps FOUR overlays in order `gateAdjust` → `rideDetail` → `catalogDetail` → tab. Verified: 506 tests, 503 pass, 0 fail, 3 skip; `tsc --noEmit` exit 0. New screen's navigation feel still needs Nathan's on-device look.**
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

## Update 2026-09-05 (reconciled with landed WP-J)

**Written by:** Fable Plan pass (fresh context), 2026-09-05, against the mount at `ed0a5fe` (HEAD: `WP-C: raw-time scoring as the default, moving time an opt-in`). Baseline re-run on the mount before writing: `tsc --noEmit` exit 0; `node --experimental-strip-types tests/run.ts` → 494 tests, 491 pass, 0 fail, 3 skip. Everything below was read from the real files; Execute still re-verifies before each edit (standard). This section supersedes the original brief wherever the two disagree; where it is silent, the original stands.

**What changed since the original brief (2026-09-04, committed in `2bd41de`):** ten WPs landed. Three of them move this brief's anchors or invalidate a plan:

- **WP-I** (`0b45803`) — added the inline "edit gates" entry point to `RoutesScreen.tsx` that §1's last bullet, §3.3 item 3 case (b), §3.6 and §4.6 planned to relocate.
- **WP-J extended scope** (`4524122`) — **replaced that inline implementation entirely.** `RoutesScreen.tsx` holds no editing state, no `confirmEditGates`/`onEditGates`, no `GateAdjustCard`. Those moved into a new full-screen `app/src/ui/GateAdjustScreen.tsx` (133 lines), reached through two new `TabNav` methods `openGateAdjust(req: GateAdjustRequest)` / `closeGateAdjust()` (`tabNav.tsx`), mount-swapped by `Shell` as a **third overlay above `rideDetail`** (`App.tsx`). The ROUTES button is now a one-liner: `tabNav.openGateAdjust({ routeId: r.id })`. **There is nothing inline left to move.** §3.3 case (b), the "WP-I only" row of §3.6, and §4.6's last bullet are obsolete — Part B below replaces them. §7's "tabNav/App have grown a third overlay" stop-item has fired, and this update is its ruling (Part C).
- **WP-C** (`ed0a5fe`) — one-line changes in `RideDetailScreen.tsx` (a `useMemo` dep) and `RidesScreen.tsx` (+2 lines); shifts two of this brief's minor anchors (A.5).
- WP-A / WP-M (`064b6e2`, `6c3d6ab`) rewrote large parts of `routeMapView.tsx` (now 1121 lines) — anchors §2.4/§3.2 cite there have moved (A.6). WP-B / WP-E / WP-F / WP-G / WP-D touched nothing this brief cites except line-neutral edits (A.7).

**The design (§3, §4.3–§4.5, §4.7) is unchanged.** Only the gate-edit wiring gets simpler, and `Shell` gets a fourth overlay instead of a third.

---

### Part A — anchors re-verified file by file

#### A.1 `app/src/ui/RoutesScreen.tsx` — now **282 lines** (was 261; WP-I +? / WP-J net = +21 vs the brief's read)

| §2.1 / §4.6 said | **Now** | Note |
|---|---|---|
| header 1–20 | 1–20 | unchanged; the WP-Q paragraph 13–19 is what §4.6 rewrites |
| imports 21–34 | **21–36** — new since the brief: `gateEditDraftFor` from `../store/wayFromRide.ts` (**35**) and `useTabNav` from `./tabNav.tsx` (**36**) | `useTabNav` is **already imported** and `const tabNav = useTabNav();` is **already at line 115** — §4.6's "add `useTabNav`" bullet is done; keep both. `gateEditDraftFor` (35) leaves this file (it is used only in the expanded card) and is imported by `CatalogDetailScreen.tsx` instead (B.2). |
| delete helpers 36–109 | **38–111** (`joinLabels` 39, `landmarkLabels` 45, `applyDeletion` 52–67, `confirmDelete` 69–74, `onDeleteRoute` 76–92, `onDeleteWay` 94–106, `onDeleteLandmark` 108–111) | byte-identical to the brief's read; §4.3 moves them verbatim |
| `open` state 113 | **116** | remove |
| `tick`/`bump` 114–118 | **117–121** | remove |
| `now` / `CATALOG` / `SEED` 119–122 | **122–125** | `now` stays (dormant marker on the list); `SEED` and `isSeedOwned`/`shippedCatalog` go once no delete button is on the list — see the import list below |
| places card 126–169; dormant 129–130; deletable 135–136; row `<View>` 138; delete btn 147–154 | **129–172**; dormant **132–133**; deletable **138–139**; row `<View>` **141**; delete btn **150–157** | as §4.6: row becomes a `Pressable` → `openCatalog({ kind: 'place', id: l.id })`, delete button and `deletable` go |
| places footer 164–168 | **167–171** (WP-L not landed; text unchanged) | leave |
| ways 171–236; card `Pressable` 183 | **174–257**; the card is now `<View key={w.id} …>` (**186–187**) wrapping a header-only `<Pressable onPress={() => setOpen(…)}>` (**191–204**) — WP-I's nested-Pressable restructure, with its comment at **188–190** | §3.6's ruling stands: with no inline body left, collapse back to ONE `Pressable` whose `onPress` is `tabNav.openCatalog({ kind: 'way', id: w.id })` (or keep View>Pressable — Execute's call; either way delete the 188–190 comment, it describes a body that no longer exists) |
| `from → to` / `N routes` lines 187–193; chevron 195 | **194–200**; chevron **202** (`{isOpen ? '▾' : '›'}` → `›`) | keep the two text lines exactly |
| expanded block 197–233 | **205–254**: `routes.map` 207, `rankedCountFor` 208, `routeDeletable` 209, **`editDraft` 210 (new)**, variant label 213, the fake `4 sectors · START ~160 m in` line **214–216**, browse `RouteMapView` **220–221**, `delete route` 222–229, **WP-J's `edit gates` comment 230–233 + button 234–241 (new)**, `delete way` 245–252 | delete the whole block; the `edit gates` button is re-created in `CatalogDetailScreen.tsx` per B.2 (copy 234–241) |
| ways footer 238–241 | **259–262** — **text changed by WP-I**: second sentence is now `Editing a route's gates resets its history — every past ride is re-timed against the new gates.` | leave as-is (WP-L owns it). Coordinator note: WP-L's Part A item 2 quotes the OLD sentence; WP-L re-anchors by string, so its table row is stale — not WP-K's problem, flagged in Part F |
| styles 246–261 | **267–282** (`deleteBtn` 273–280, `deleteText` 281) | `deleteBtn`/`deleteText` become unused on the list — remove them (or keep for the `›`-less rows; Execute's call, say which) |

**Import set after §4.6 (read, don't trust tsc — this repo's `tsconfig` has no `noUnusedLocals`, so a stale import compiles clean).** Goes: `useState`, `Alert`, `saveUserCatalog`, `userCatalog`, `isSeedOwned`, `removeLandmark`, `removeRoute`, `removeWay`, `CatalogDeletion`, `shippedCatalog`, `removeUserRef`, `removeStoredResult`, `storedResultsForRoute`, `clearLastRide`, `dropRecorded`, `getLastRide`, `rankedCountFor`, `routeLabelIn`, `routeVariantLabel`, `RouteMapView`, `Catalog`/`Landmark`/`Route`/`Way`, `gateEditDraftFor`. Stays: `Pressable, ScrollView, StyleSheet, Text, View`, `currentCatalog`, `sortRoutesForDisplay` (only for `routes.length`; dropping it for a plain `filter` is fine), `radius`, `useTheme`, `useTabNav`. Verify with the one-off `./node_modules/.bin/tsc --noEmit --noUnusedLocals` — baseline on this mount is exactly **4** pre-existing TS6133 errors (`RecordScreen.tsx` 45 and 827, `colourModel.ts` 19, `tests/catalogdelete_suite.ts` 68); any error in a WP-K file is new.

#### A.2 `app/src/ui/tabNav.tsx` — now **69 lines** (was 53; WP-J +22 net of a header rewrite)

| §2.3 / §4.1 said | **Now** |
|---|---|
| header 1–10 | **1–11** — already lists `openGateAdjust: setGateAdjust`, `closeGateAdjust`; add `openCatalog: setCatalogDetail`, `closeCatalog` and "WP-K (cycle 2) 2026-09-05 — the catalog (place/way) detail" in the same sentence |
| `RideDetailRequest` doc 17–23, `source` line 26 | doc **19–25**, `source: 'post-stop' \| 'rides'` at **28** → add `\| 'routes'` and the doc sentence from §4.1 |
| — | **`GateAdjustRequest` 32–38 (new, WP-J)** — put `export type CatalogDetailRequest = { kind: 'place'; id: string } \| { kind: 'way'; id: string };` (with its doc comment) directly AFTER line 38, before `TabNav` |
| `TabNav` 30–38 (`go` 31, `openRide` 35, `closeRide` 37) | **40–54**: `go` 41, `openRide` 45, `closeRide` 47, **`openGateAdjust` 51, `closeGateAdjust` 53** — add `openCatalog`/`closeCatalog` AFTER line 53, before the closing `}` at 54, doc comments in the same voice ("WP-K (cycle 2): show the full-screen place/way detail over the ROUTES tab … Idempotent: re-opening replaces the request; the ride detail and the gate editor, when open, sit above it") |
| `useTabNav` | **65–69**, unchanged |

`source` has exactly one consumer (`RideDetailScreen.tsx:358`) and two producers (`RecordScreen.tsx:988` `'post-stop'`, `RidesScreen.tsx:123` `'rides'`) — no exhaustive switch anywhere, so widening the union is safe (re-verified by grep).

#### A.3 `app/App.tsx` — now **250 lines** (was 230; WP-J +30 net)

| §2.3 / §4.2 said | **Now** |
|---|---|
| screen imports ~28–31 | **28–33**; `GateAdjustScreen` at **32** — add `import CatalogDetailScreen from './src/ui/CatalogDetailScreen';` after it |
| tabNav import 41 | **42**: `import { TabNavProvider, type GateAdjustRequest, type RideDetailRequest, type Tab, type TabNav } from './src/ui/tabNav';` — add `type CatalogDetailRequest` (alphabetically first) |
| `tab` state 55 | **56** |
| `rideDetail` state 63 | **64** (comment 61–63) |
| — | **`gateAdjust` state 68 (comment 65–67, "Third instance …")** — put `catalogDetail` AFTER 68, comment "WP-K (cycle 2): the full-screen place/way detail, mount-swapped like rideDetail. Fourth instance of the split; sits UNDER rideDetail and gateAdjust (Part C)." |
| back handler 75–88 | **80–101**: comment 76–79; `gateAdjust` branch **86–89** (with WP-J's discard-no-confirm comment 82–85); `rideDetail` branch **90–93**; `tab !== 'record'` **94–97**; deps `[tab, rideDetail, gateAdjust]` at **101** |
| `tabBarHidden` 122 | **135**: `const tabBarHidden = (tab === 'record' && recFullscreen) \|\| rideDetail !== null \|\| gateAdjust !== null;` (comment 130–134) |
| `nav` 134–137 | **147–156** (five entries) |
| mount-swap 143–148 | **162–168** (three-way chain starting `gateAdjust !== null ?`) |

Exact edits in Part C.

#### A.4 `app/src/ui/GateAdjustScreen.tsx` — 133 lines, new (WP-J). **Not edited by WP-K.**

Read it to understand the seam, nothing more: `request: GateAdjustRequest` (31); resolves its own draft `gateEditDraftFor(request.routeId)` (39); owns `confirmEditGates`/`onEditGates` (55–92) — the WP-I code the original brief wanted to move now lives HERE, permanently; every exit is `tabNav.closeGateAdjust()` (86, 97, 119) — it never touches any other overlay, so a `catalogDetail` underneath survives it (Part C). `draft === null` renders a one-line message with `‹ BACK` (103–106), so a stale request never blanks the screen.

#### A.5 `app/src/ui/RideDetailScreen.tsx` (now 605 lines, +1 from WP-J) and `RidesScreen.tsx` (196 lines, +2 from WP-C)

`RideDetailScreen.tsx` — §4.7's two anchors hold exactly: **358** `const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : 'BACK TO RIDES';` and the comment at **302–304** ("RidesScreen remounts on close and refreshes itself; from 'post-stop' …"). §2.2's pattern anchors: entry **122**; top bar **361–368**; map **381–397**; ACTIONS **474–512**; slim button **543–545** (was 542–544); `makeStyles` **555**, `topBar/backText/topTitle/topDate` **556–561** (was 555–560), `pillRow` **566**, `deleteBtn` **575–581**, `deleteText` **583** (was 574–582); `const st` **586**, `h2` 587, `card` 588, `slimBtn` **590–597**, `slimBtnText` **598** (was 586–597). Values unchanged — §4.5 copies them as written. (Line 390 still carries a bare cycle-1 `WP-K` comment; the naming note in the header stands — tag everything `WP-K (cycle 2)`.)

`RidesScreen.tsx` — header comment 5–7 unchanged; `useTabNav` import **21** (was 20), `const tabNav` **28** (was 26), chevron row **132–137** (`›` at 136; was 130–135), `openRide` call at **123**.

#### A.6 `app/src/ui/routeMapView.tsx` — now **1121 lines** (was 980); WP-A, WP-M, WP-J all touched it

| Cited | Was | **Now** |
|---|---|---|
| `safeRefFor` (§2.4, §4.5) | 124 | **145**: `const safeRefFor = (id: string) => { try { return refFor(id); } catch { return null; } };` — copy verbatim |
| free-ride map props `gatesOnly` / `gateRouteIds` (§3.2 item 4) | 227–240 | **239–253** (`gatesOnly?` 244, `crossedGates?` 248, `gateRouteIds?: string[] \| null` 253). New optional props since: `trail?` 254–259, `gateSelect?` 266 — irrelevant to a browse map; nothing became required |
| "returns `null` anyway" (§3.2 item 4) | 449 | **525**: `if (riderOnly && !showRider && !hasTrail) return null;` where `riderOnly = !gatesOnly && !asset` (524) |

**Correction to §3.2 item 4's parenthetical:** that early return does NOT fire on a `gatesOnly` map (`riderOnly` is false whenever `gatesOnly` is true). A `gatesOnly` map with `gateRouteIds={[]}` would render bare tiles with no camera target; with `gateRouteIds={null}` it draws **every catalog route's gates** (`routeMapGeo.ts:105–133`, `ids = routeIds ?? Object.keys(assets)`). So the screen's own guard is load-bearing: render the place map **only when `model.touchingRouteIds.length > 0`**, and always pass the array, never `null`. The brief's instruction ("only when ≥1 touching route exists") already says this; only its justification was wrong.

Both browse maps (`routeId={r.refLineId}` per route; `gatesOnly` for the place) now get WP-M's two-finger rotation and compass button for free — intended (WP-M is "every non-race map").

#### A.7 Everything else — unchanged where cited, re-verified by grep/read

- `store/types.ts`: `Landmark` **21**, `Way` **36**, `Route` **45**, `GateSet` **68** — WP-C's only edit is `TowerRow.movingS → timeS` at 142, below everything this brief uses.
- `store/catalog.ts:211` `gateSetFor`; `store/gateSeeding.ts` 36–49 (5 seeded gates); `live/refs.ts:35` `refFor` (still throws on unknown track; `length` at 55); `store/defaultRoute.ts` `routeVariantLabel` **53**, `routeLabelIn` **73**, `sortRoutesForDisplay` **90**; `store/catalogDelete.ts` `CatalogDeletion` 32, `isSeedOwned` **54**, `removeRoute` 93, `removeWay` 134, `removeLandmark` 157; `store/catalogStore.ts` `currentCatalog` 67, `userCatalog` 72, `saveUserCatalog` **118–128** (§2.1 said 113–117; the synchronous `user = next; recompute();` is at 121–122 — same fact, the brief's number was off by five on the 09-04 read too; no commit touched this file); `store/seed.ts:47` `shippedCatalog`; `live/userRefs.ts:189` `removeUserRef`; `ui/lastRide.ts` `getLastRide` 172, `clearLastRide` 229, `dropRecorded` 285; `store/resultsStore.ts` `getStoredResult` **214**, `storedResultsForRoute` **223**, `removeStoredResult` 249; `store/wayFromRide.ts` `GateAdjustDraft` 184, `gateEditDraftFor` **260–268** (pure read: `userCatalog()` route + `userRefFor` + `gateSetFor`; null for a seed route, a missing ref or gate set).
- `ui/gateAdjustModel.ts` — now 80 lines (WP-J +21): `gateName` **39–43** (was 32–36), `fmtChainage` **68–71** (was 56–59); both bodies unchanged; new `fmtPct` at 77 not needed. Still import-free (pure).
- `ui/colourModel.ts` `rankedCountFor` **71** (was 70; WP-C); `ui/rideHistoryModel.ts` `dateTimeLabel` **51** (was 50; WP-C).
- **§4.4 import-chain purity re-verified on this mount:** `store/types.ts` (no imports), `store/catalog.ts` (→ types), `store/defaultRoute.ts` (→ types, `store/results.ts`, `store/routeSpecs.ts`), `store/results.ts` (→ types, **`store/timing.ts`** — new from WP-C, import-free), `store/routeSpecs.ts` (→ types), `store/catalogDelete.ts` (→ types), `ui/gateAdjustModel.ts` (none). No `.json`, no `expo`, no `react-native` anywhere in the chain → **no `registerHooks` shim needed**, as §4.4 hoped. If Execute still needs one, the shim is now at `tests/ridedetail_suite.ts` **21–29** (dynamic imports 30–31), not 20–30.
- `tests/run.ts` — 41 lines; `import './ridedetail_suite.ts';` is where §4.4 says to add the new suite after it (WP-J removed `gateadjustmap_suite`, WP-C added `timing_suite` — neither near it).
- The four "new" files (`CatalogDetailScreen.tsx`, `catalogDeleteActions.ts`, `catalogDetailModel.ts`, `tests/catalogdetail_suite.ts`) do **not** exist on the mount — confirmed; nothing pre-empted this brief.
- `grep -rn "160 m in" app/src` → exactly one hit, `RoutesScreen.tsx:215`. Acceptance 3 still means what it says.

---

### Part B — the corrected "edit gates" wiring (replaces §1 last bullet, §3.3 item 3 "WP-I slot", §3.6's "WP-I only"/"both" rows, §4.6's last bullet)

**B.1 What is true now.** WP-I's *store* work (`gateEditDraftFor`/`editRouteGates`, the "history will be reset" confirm) is landed and reused by WP-J's `GateAdjustScreen.tsx`, which owns the whole edit flow as a full-screen overlay. The only thing ROUTES contributes is the *button* — visible for a user route with a resolvable draft — and the button is a one-liner through the seam. `RoutesScreen.tsx` **230–241** today, verbatim:

```tsx
                      {/* WP-I's entry point, WP-J (extended): opens the
                          full-screen editor (GateAdjustScreen.tsx) instead of
                          an inline card. Only for a user route with a
                          resolvable draft (gateEditDraftFor !== null). */}
                      {editDraft !== null ? (
                        <Pressable
                          style={[st.deleteBtn, { borderColor: t.cardBorder }]}
                          onPress={() => tabNav.openGateAdjust({ routeId: r.id })}
                        >
                          <Text style={[st.deleteText, { color: t.textDim }]}>edit gates</Text>
                        </Pressable>
                      ) : null}
```
with its guard computed at **210**: `const editDraft = routeDeletable ? gateEditDraftFor(r.id) : null;`.

**B.2 What `CatalogDetailScreen.tsx` does (the "WP-I slot" in §3.3 item 3, now simply the "edit gates" row).** In the way body's per-route section, directly under the gate rows and before `delete route`:

- Compute, in the screen (not the model — it stays pure with the §4.4 interface untouched): `const gateEditable = route.deletable && gateEditDraftFor(route.id) !== null;` — `route.deletable` is the model's `!isSeedOwned(seed, 'route', id)`, i.e. the same `routeDeletable` guard line 210 uses. Import `gateEditDraftFor` from `../store/wayFromRide.ts` (that import leaves `RoutesScreen.tsx`, A.1).
- Render, when `gateEditable`, an outline button (the same `deleteBtn`/`deleteText` styles §4.5 copies from `RideDetailScreen`) labelled `edit gates` whose `onPress` is exactly `() => tabNav.openGateAdjust({ routeId: route.id })`. Comment it `{/* WP-I's entry point via WP-J's full-screen editor (GateAdjustScreen.tsx); moved here from RoutesScreen.tsx by WP-K (cycle 2). Only for a user route with a resolvable draft. */}`.
- **Nothing else.** No `editing`/`busy` state, no `confirmEditGates`/`onEditGates`, no `GateAdjustCard`, no `editRouteGates`/`createExpoFsAdapter`/`replaceRecorded` imports in `CatalogDetailScreen.tsx`. Anything that would make the detail screen own part of the save flow is out of shape — stop.
- **No refresh plumbing after a save.** While the editor is up, `Shell` has unmounted `CatalogDetailScreen` (mount-swap, Part C); `closeGateAdjust()` remounts it with `tick = 0`, `useMemo` re-runs `wayDetailFor` against `currentCatalog()`, and the gate rows/`gatesLabel` show the minted version (`v(n+1) · geometric`) with no `bump`. Same reason `RoutesScreen` needed no `bump` after WP-J.
- Order within the per-route section is the brief's (§3.3 item 3): facts rows → gate rows → `edit gates` → `delete route`. (Today's list puts `edit gates` AFTER `delete route`; the brief's non-destructive-first order stands — taste, note it in the report. Putting both in one `pillRow` is Execute's call.)

**B.3 §3.6 ordering table — corrected.** WP-I and WP-J are landed; WP-L is not (both footers still present, A.1). The live row is therefore "WP-I+WP-J landed, WP-L not":

| Landed | What this WP does |
|---|---|
| WP-I + WP-J (now) | Brief as written, with: (i) no code moves for gate editing — B.2's one-liner instead of §3.3(b)/§4.6's relocation; (ii) delete WP-I's nested-Pressable restructure with the expanded card (A.1); (iii) `useTabNav` already imported; (iv) `gateEditDraftFor` import moves to `CatalogDetailScreen.tsx`; (v) footers stay. WP-I's acceptance criterion 1 ("an expanded USER route … shows `edit gates`") and WP-J's B.10 criterion 9 ("`edit gates` on an expanded user route opens a full-screen editor") are then satisfied on the **way detail** instead of an expanded card — say so in the execution report so both status lines can be updated (coordinator). |
| + WP-L | As above; §4.6 simply has no footers to leave alone. Stop if WP-L changed anything else in `RoutesScreen.tsx` (§7). |

The "if this WP lands FIRST, append a line to WP-I's status header" instruction (§3.6 last paragraph) is void — WP-I landed first. Do not edit `WP-I-…md`.

---

### Part C — `Shell` with four overlays: exact wiring for `App.tsx`

**Stacking (ruling on §3.5 and §7's stop-item):** `gateAdjust` (top) → `rideDetail` → **`catalogDetail`** → tab. WP-J's B.9 anticipated exactly this and it is right: the editor is only ever opened from a route row (today `RoutesScreen`, after this WP the way detail), so it must stack over the way detail and BACK must reveal it; the ride detail likewise stacks over the way detail via the reference-ride row (§3.3). `gateAdjust` above `rideDetail` (WP-J's choice) is not disturbed — `RideDetailScreen` keeps its own inline card and never calls `openGateAdjust`, so those two never coexist. `catalogDetail` sits below both because it is the only one that opens the other two.

Edits, in file order (line numbers from A.3):

1. **Line 32 area** — `import CatalogDetailScreen from './src/ui/CatalogDetailScreen';` after `GateAdjustScreen`.
2. **Line 42** — add `type CatalogDetailRequest` to the tabNav import.
3. **After line 68** — 
   ```ts
   // WP-K (cycle 2): the full-screen place/way detail (ROUTES tab), mount-swapped
   // like rideDetail. Fourth instance of the "screen owns intent, Shell owns
   // chrome" split. Sits UNDER rideDetail and gateAdjust: the way detail is
   // what opens both (reference-ride row, edit gates), so their BACK lands on it.
   const [catalogDetail, setCatalogDetail] = useState<CatalogDetailRequest | null>(null);
   ```
4. **Back handler (80–101)** — insert between the `rideDetail` branch (90–93) and the `tab !== 'record'` branch (94):
   ```ts
         if (catalogDetail !== null) {
           setCatalogDetail(null);
           return true;
         }
   ```
   deps at 101 → `[tab, rideDetail, gateAdjust, catalogDetail]`. Extend the comment at 76–79: "System back: gate editor → ride detail → catalog detail → (other tabs → Record) …". Back = plain close, no confirm, one layer per press — the same rule as `rideDetail`; this matches §1 ("close on the hardware back button") and acceptance 6 ("one layer at a time"). No conflict with the original brief.
5. **Line 135** — `const tabBarHidden = (tab === 'record' && recFullscreen) || rideDetail !== null || gateAdjust !== null || catalogDetail !== null;` and add "WP-K (cycle 2): so does the catalog detail" to the comment at 130–134.
6. **`nav` (147–156)** — append `openCatalog: setCatalogDetail, closeCatalog: () => setCatalogDetail(null),` after `closeGateAdjust`.
7. **Mount-swap (162–168)** — write exactly:
   ```tsx
             {gateAdjust !== null ? <GateAdjustScreen request={gateAdjust} />
               : rideDetail !== null ? <RideDetailScreen request={rideDetail} />
               : catalogDetail !== null ? <CatalogDetailScreen request={catalogDetail} />
               : tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />
               : tab === 'rides' ? <RidesScreen />
               : tab === 'routes' ? <RoutesScreen />
               : tab === 'settings' ? <SettingsScreen />
               : <DemoScreen />}
   ```

**Consequences Execute should know (all intended, none need code):**
- Opening the editor or the ride detail from the way detail **unmounts** the way detail; closing them **remounts** it, so it re-reads `currentCatalog()`/results on its own: new gate version after a save, a changed `referenceRideId` after "Set as reference" in the ride detail, a vanished ride after a delete there. `tick` in `CatalogDetailScreen` is needed only for the in-screen deletes (§3.4).
- `catalogDetail` is not cleared by `closeRide()`/`closeGateAdjust()` — only by `closeCatalog()`, hardware back, or (if Execute wants, not required) `go(tab)`. Switching tabs is impossible while any overlay is up (tab bar hidden), so `go` never fires with `catalogDetail` set.
- §2.3's quoted `tabBarHidden` line and mount-swap snippet in the original brief are stale (three-way today); this Part's text is the one to write.

---

### Part D — acceptance criteria (§5), amended

- **1–9 stand as written.** Criterion 6 now reads two layers deep in practice: `way detail → ride detail → BACK → way detail`, and the hardware back button pops one layer per press through all four states (`gateAdjust`, `rideDetail`, `catalogDetail`, tab).
- **New 10.** On the way detail, a user route with a resolvable draft shows `edit gates`; a seed route or one with no ref/gate set does not (same guard as `RoutesScreen.tsx:210` today). Tapping it opens WP-J's full-screen editor over the way detail (tab bar hidden, `‹ BACK` / `EDIT GATES`). `‹ BACK`, KEEP GATES, discard and the hardware back button all return to the **way detail** (not the ROUTES list) with no write; `Save & reset` returns to the way detail whose gate rows show the new version. `grep -rn "openGateAdjust(" app/src/ui` → defined in `tabNav.tsx`, called from `CatalogDetailScreen.tsx` only (no longer from `RoutesScreen.tsx`).
- **New 11.** `RoutesScreen.tsx` imports nothing from `wayFromRide.ts`, `gateAdjustCard.tsx`, `expoFsAdapter.ts`, `resultsStore.ts`, `lastRide.ts`, `catalogDelete.ts`, `catalogStore.ts` except `currentCatalog`; `./node_modules/.bin/tsc --noEmit --noUnusedLocals` reports only the 4 baseline TS6133 errors listed in A.1.
- **Verification additions (§6):** `grep -rn "openGateAdjust(\|gateEditDraftFor(" app/src/ui` as above; on-device, Run: ROUTES → tap a user way → `edit gates` → nudge → hardware back → still on the way detail, `catalog.user.json` unchanged; `edit gates` → nudge → SAVE → `Save & reset` → way detail shows `gates N · v(k+1) · geometric` and the new chainages.

---

### Part E — stop-on-ambiguity (adds to §7; same rule: stop and report, never guess)

- `CatalogDetailScreen.tsx`, `catalogDeleteActions.ts`, `catalogDetailModel.ts` or `tests/catalogdetail_suite.ts` exists on the mount at execute time (they do not at `ed0a5fe`).
- `RoutesScreen.tsx` is not 282 lines with the `edit gates` block at 230–241 and `gateEditDraftFor` at 210/35 — i.e. something landed after `ed0a5fe`. WP-L landing is the expected case (footers gone, nothing else): cosmetic, continue; anything else: stop.
- `App.tsx`'s mount-swap at 162–168 or back handler at 80–101 is not the three-way shape in A.3, or `TabNav` has grown a method beyond the five listed in A.2.
- `RideDetailScreen.tsx:358` no longer has the two-way `primaryLabel` ternary.
- The `edit gates` guard: if Execute is tempted to move `gateEditable` into the pure model (a `canEditGates` dep) for testability — allowed as a taste call **T6** (default: screen-level per B.2, mirroring today's line 210); say which in the report. Do not stop on it.
- `gateRouteIds` on the place map: never pass `null` (A.6). If the model ever yields an empty `touchingRouteIds` with a non-empty `ways` list, that is a model bug — the suite should pin `touchingRouteIds.length > 0 ⇔ some touching way has ≥1 route`.
- The hardware-back-mid-save edge WP-J flagged (B.12) now lands on the way detail instead of the list: the editor closes while `editRouteGates` still awaits, and the remounted way detail may read the old gate set until its next remount. Accepted edge, same as WP-J's ruling; report if observed, do not add a guard through the seam.

### Part F — coordinator follow-ups (not for Execute)

- README table: WP-K's row — "reconciled 2026-09-05 with WP-J: no gate-edit code moves, `Shell` stacking gateAdjust → rideDetail → catalogDetail → tab"; WP-I's row — after WP-K lands, its UI criterion 1 is met on the way detail.
- WP-L Part A item 2 quotes the pre-WP-I footer sentence; the current text is `Editing a route's gates resets its history — every past ride is re-timed against the new gates.` (`RoutesScreen.tsx:259–262`). WP-L re-anchors by string — fix the quoted string before WP-L executes.
- STATE.md: the Shell seam now has four overlays after WP-K.
