# brief-01 — Card map gesture modes, shared activity actions, feed model + trail cache (pure layer)

**Cycle:** virgin-cycle23 (ACTIVITIES tab as a feed). **Source:** `00-nathan-decisions.md` (binding), digests 01/02, preview B. Written by the Plan tier (Fable) 2026-10-06 night; every anchor below was re-read in the tree at commit `d03f5df` (git status: only `deployment/rounds/README.md` modified, cycle23/24 folders untracked). Nothing is executed yet.

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle23/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order:** FIRST of three. Brief 02 (feed UI) and brief 03 (detail page) import what this brief creates. This brief changes NO screen layout: after it lands the app looks exactly as before (every new prop/module is unused or default-equivalent). That is deliberate: it can be verified alone with the headless suite.

> **Patched 2026-10-06 by Fable after the executor's STOP (see `RULINGS.md` R1-R4):** §1f constructor (strip-only), §1d step 4 (replay_suite fixture), §3 + §5 (allow-list: 10 moves + 1 append, entries stay sorted), §5.7 git status.

## Goal

1. `WayMapView` gets a `gestures` prop: `'full'` (default, today's behaviour, every existing caller unchanged), `'twoFinger'` (one finger does nothing on the map: dragPan off, double-tap zooms off, rotation off, pitch off, pinch ON since a pinch also pans; zoom bar hidden) and `'readonly'` (every gesture off, zoom bar hidden, the native map takes no touches at all so a tap/scroll falls through to the parent).
2. The three quick actions a feed card and the detail page both need (Delete with its confirm, Ignore/Count in ranking, Export GPX+) move out of `RideDetailScreen.tsx` into one shared module `src/ui/rideActions.ts`, and `RideDetailScreen.tsx` calls that module. Behaviour and alert copy identical.
3. A pure feed view-model `src/ui/feedModel.ts` (card model, fixed card heights, live-map window, sector strip labels, sector gap label) and a pure LRU + concurrency-limited trail loader `src/ui/trailCache.ts`, both headless-tested in new suites registered in `tests/run.ts`.
4. `buildSectorRows` gains `gapS` (seconds vs the sector's average) so brief 03 can show the gap without re-deriving it.

## 0. What the code does today (verified anchors)

- `app/src/ui/wayMapView.tsx`
  - `:201-202` `type WayMapVariant = 'live' | 'browse';` / `type LiveMapState = ...`
  - `:204` `type WayMapProps = {` … `:289` `gateSelect?: { selected: number | null; onPress: (gateIndex: number) => void };` / `:290` `};`
  - `:378-380` `const variant = props.variant ?? 'live';` `const liveState = props.liveState ?? 'moving';` `const showRider = props.showRider ?? true;`
  - `:392` `const rotateEnabled = rotateEnabledFor(variant, liveState);`
  - `:711-755` the `<M.Map` element: `:746-754` exactly
    ```tsx
        dragPan={true}
        touchZoom={true}
        doubleTapZoom={true}
        doubleTapHoldZoom={true}
        // WP-M: was a literal `false` always — see rotateEnabledFor
        // (routeMapGeo.ts) for the scope rule (browse/prestart/finished on,
        // moving/stopped off).
        touchRotate={rotateEnabled}
        touchPitch={false}
      >
    ```
    `:954` `</M.Map>`; `:957` `<View style={st.zoomBar}>` … `:994` `</View>` then `:995` `<Credit rung="maplibre" locked={creditLocked} />`.
  - Styles `:1008-1009` `const st = StyleSheet.create({` / `frame: { alignSelf: 'stretch', borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },` — the map frame is ALREADY a bordered rounded rectangle (radius.card = 16, border `t.cardBorder`): preview B's "map in a bordered rounded rectangle" needs no new frame.
  - Tests that pin this file (must keep passing, do not edit them): `tests/waymap_suite.ts` `:301-316` requires `touchRotate={rotateEnabled}` and `touchPitch={false}` literally inside the `<M.Map` open tag (slice from `<M.Map` to `<M.Camera`); `:385-399` zoom bar test slices from the literal `<View style={st.zoomBar}>` to `<Credit rung="maplibre"` and counts `setMode('follow')` (2), `setMode(fitMeNext)` (1), `>FIT<` (1), `>ME<` (1); `:361-383` every `<M.GeoJSONSource` except `rider` must not be preceded by `? (` or `&& (`; `:243-257` `<M.Map` must carry `key={mapStyleKey}`.
- `app/src/ui/RideDetailScreen.tsx` (763 lines)
  - `:71-81` `function fmtWhen(ms)` and `function fmtDur(ms)` (used only by `onDelete`).
  - `:360-371` `async function onToggleIgnore() {` … `}` (setBusy, `setIgnoredFromRanking(request.rideId, !model.ignored)`, `replaceRecorded(upd)`, `setTick`, `Alert.alert('Could not update', …)`).
  - `:373-390` `async function onExport() {` … `}` (`exportGpxPlus(meta.rideId)`, `gpxBaseName`, `saveGpx`, alerts `'Exported'` / `'Shared'` / `'Export failed'`).
  - `:392-420` `function onDelete() {` … `}` (`Alert.alert('Delete activity?', \`${fmtWhen(meta.startMs)} · ${fmtDur(meta.endMs - meta.startMs)}\nThis permanently removes the raw trace.\`, [Cancel, Delete→ deleteRide, removeStoredResult, dropRecorded, unmarkRideFree if free, tabNav.closeRide()])`, `'Could not delete'`).
  - Imports `:47-49` `clearUnmatched, getStoredResult, removeStoredResult, setIgnoredFromRanking, storedResultsForWay` from resultsStore; `freeRideNear, freeRideResults, markRideFree, unmarkRideFree` from freeRides; `:50-52` `clearLastRide, dropRecorded, getLastRide, replaceRecorded` from lastRide; `:67` `deleteRide, exportGpxPlus, listRides` from '../storage'; `:69` `gpxBaseName, saveGpx` from './saveGpx.ts'.
- `app/src/ui/rideHistoryModel.ts`
  - `:206-212` `export interface SectorRowModel { index; label; timeLabel; tier: UiTier; avgLabel }`
  - `:219-247` `buildSectorRows(result, hist)`: `:226-227` `const h = hist(sec.index); const avgLabel = h.length ? \`avg ${fmt(h.reduce((a, b) => a + b, 0) / h.length)}\` : '';` then the missed branch `:228-233`, estimated/null branch `:235-240`, and `:244-245` `const tier = tierFor(v, h); return { index: sec.index, label: \`S${sec.index}\`, timeLabel: fmt(v, 1), tier, avgLabel };`
  - `:65-77` `RideRowModel` (`rideId, startMs, dateLabel, wayId, wayName, lapS, lapLabel, quality, rank`).
- `app/src/ui/rideDetailModel.ts` `:19-44` `RideDetailModel` (`kind, rideId, startedAtMs, wayId, lapLabel, lapTier, rankLine, ignored, canToggleIgnore, referenceOf, promoteTarget, sectorRows, sectorColours, free`), `:104` `rideDetailFor(rideId, startedAtMs, d: RideDetailDeps)`.
- `app/src/ui/trailModel.ts` `:16` `export interface TrailPoint { lat: number; lon: number }`, `:38` `export function appendTrailPoint(trail: readonly TrailPoint[], lat, lon): readonly TrailPoint[]` (decimation: min step `TRAIL_MIN_STEP_M` = 5 m, cap `TRAIL_MAX_POINTS` = 4000). Pure (imports only wayMapGeo.ts).
- `app/src/store/routeFromRide.ts` `:48-57` `export async function readRideFixes(rideId, fs)` → chronological fixes (`{ lat, lon, tUnixMs, … }[]`) or null.
- `app/src/storage/types.ts` `:65-74` `RideMeta { rideId; startMs; endMs; nFixes; sportId? }`.
- `app/tests/run.ts` `:14-68` one `import './xxx_suite.ts';` per suite, last ones `:66 ui_strings_suite`, `:67 easignore_suite`, `:68 seedstubs_suite`. `tests/lib.ts` exports `test(name, fn)` and `assert(cond, msg)`.
- `app/tests/ridehistory_suite.ts` `:17-27` the `registerHooks` JSON shim + dynamic import pattern a suite needs when the module under test (transitively) imports colourModel.ts → `results.seed.json`. `feedModel.ts` imports rideHistoryModel/rideDetailModel types only (type imports are erased) but the `sectorGapLabel`/height helpers import nothing heavy; `trailCache.ts` imports trailModel.ts (pure). The new suites therefore need NO shim unless you import a value from colourModel — don't.
- Allow-list `app/tests/ui-strings.allow.json`: entries keyed `file|kind|text`; the scanner (`tests/ui_strings_extract.ts`) scans `App.tsx`, every file under `src/ui/` (so the new `src/ui/*.ts` modules ARE scanned) and `src/location/*.ts`. Today the strings moved by step 2 are listed under `src/ui/RideDetailScreen.tsx`: `alert-title` `Delete activity?`, `Could not delete`, `Could not update`, `Exported`, `Shared`, `Export failed`; `alert-body` `{…} · {…} This permanently removes the raw trace.`, `{…}.gpx saved to the folder you picked.`, `GPX sent as text via the share sheet.`; `prop:text` `Cancel`, `Delete`. None is `legacy`. The scanner de-duplicates per `file|kind|text`, so an entry only goes STALE when no occurrence of that key is left in the file: `prop:text` `Cancel` ALSO occurs in the Overwrite-reference alert (`:412` `{ text: 'Cancel', style: 'cancel' }`), which stays in RideDetailScreen.tsx, so that entry stays and rideActions.ts gets a NEW `Cancel` entry (R3). `tests/ui_strings_suite.ts:212` asserts `entries` are sorted by (file, kind, text) in code-unit order — edited/added entries must sit at their sorted position (`src/ui/RideDetailScreen.tsx` < `src/ui/rideActions.ts`).

## 1. Changes, file by file

### 1a. `app/src/ui/wayMapView.tsx` — the `gestures` prop

1. After `:202` `type LiveMapState = …;` add:
   ```ts
   /** virgin-cycle23 brief 01: how much of the map a finger may move.
    * 'full' (default) = today's behaviour on every existing surface.
    * 'twoFinger' = a feed card: one finger does nothing on the map (so the list
    * scrolls and a tap reaches the card), two fingers pinch-zoom (a pinch also
    * pans); no double-tap zoom, no rotation, no zoom bar.
    * 'readonly' = a picture: no gesture at all, the native view takes NO touches
    * (pointerEvents none on its wrapper) so everything falls through to the parent.
    * The ONE place the feed picks between the last two is CARD_MAP_GESTURES in
    * activityCard.tsx (brief 02). */
   export type WayMapGestures = 'full' | 'twoFinger' | 'readonly';
   ```
2. In `WayMapProps`, right before the closing `};` at `:290` (after the `gateSelect?` member), add:
   ```ts
     /** virgin-cycle23 brief 01: see WayMapGestures. Default 'full'. */
     gestures?: WayMapGestures;
   ```
3. After `:380` `const showRider = props.showRider ?? true;` add:
   ```ts
     const gestures: WayMapGestures = props.gestures ?? 'full';
     const oneFingerOn = gestures === 'full';          // dragPan, double-tap zooms, rotation, zoom bar
     const pinchOn = gestures !== 'readonly';           // touchZoom (a pinch also pans)
   ```
4. Replace `:392` `const rotateEnabled = rotateEnabledFor(variant, liveState);` with
   `const rotateEnabled = rotateEnabledFor(variant, liveState) && oneFingerOn;`
   (keeps `touchRotate={rotateEnabled}` literally — waymap_suite pins it — and switches off the compass button and the bearing read-back with it).
5. In the `<M.Map` open tag replace the four literal lines `:746-749`
   ```tsx
        dragPan={true}
        touchZoom={true}
        doubleTapZoom={true}
        doubleTapHoldZoom={true}
   ```
   with
   ```tsx
        dragPan={oneFingerOn}
        touchZoom={pinchOn}
        doubleTapZoom={oneFingerOn}
        doubleTapHoldZoom={oneFingerOn}
   ```
   Leave `touchRotate={rotateEnabled}` and `touchPitch={false}` untouched.
6. Wrap the whole `<M.Map … </M.Map>` element (`:711` to `:954`) in
   ```tsx
      <View style={st.mapFill} pointerEvents={gestures === 'readonly' ? 'none' : 'auto'}>
        …existing <M.Map …>…</M.Map> unchanged…
      </View>
   ```
   and add to `st` (after `frame:` at `:1009`): `mapFill: { flex: 1, alignSelf: 'stretch' },`. The wrapper is a sibling of the zoom bar / Credit / badges, which stay absolutely positioned over the frame as today.
7. Zoom bar: wrap `:957-994` so it only mounts with full gestures, keeping the literal open tag on its own line:
   ```tsx
      {oneFingerOn ? (
      <View style={st.zoomBar}>
        …unchanged…
      </View>
      ) : null}
   ```
   (The zoom-bar test slices from `<View style={st.zoomBar}>` to `<Credit rung="maplibre"`; the trailing `) : null}` is inside the slice and harmless.) The `<Credit>` stays mounted in every mode (licence; it is a 22 dp "i" that opens an in-frame card — in 'readonly' it is still tappable because it sits OUTSIDE the pointerEvents-none wrapper).
8. Update the file-header comment list of props only if one exists there (it does not need to); no other change. In particular do NOT touch `onRegionWillChange`/`onRegionDidChange`.

### 1b. `app/src/ui/rideActions.ts` — NEW shared quick actions (no JSX, `.ts`)

Create with this exact API; bodies are the current RideDetailScreen code moved verbatim (keep every alert string byte-identical):

```ts
/**
 * virgin-cycle23 brief 01: the three quick actions an activity offers from
 * BOTH the feed card's menu (brief 02) and the detail page's menu (brief 03) —
 * one body each, moved verbatim out of RideDetailScreen.tsx (WP-H) so the
 * two surfaces can never drift. Store side effects are the same calls, in
 * the same order, as the detail screen made before this brief.
 */
import { Alert } from 'react-native';
import type { RideMeta } from '../storage/types';
import { deleteRide, exportGpxPlus } from '../storage';
import { removeStoredResult, setIgnoredFromRanking } from '../store/resultsStore.ts';
import { unmarkRideFree } from '../store/freeRides.ts';
import { dropRecorded, replaceRecorded } from './lastRide.ts';
import { gpxBaseName, saveGpx } from './saveGpx.ts';

function fmtWhen(ms: number): string { …moved from RideDetailScreen :71-75… }
function fmtDur(ms: number): string { …moved from :77-81… }

/** The Delete confirm + the delete itself. `freeRideId` = model.free?.rideId ?? null
 * (so no orphan free record, virgin-cycle16 02). `onDeleted` runs after the stores are
 * updated (detail: tabNav.closeRide(); feed: refresh()). */
export function confirmDeleteRide(meta: RideMeta, freeRideId: string | null, onDeleted: () => void): void {
  Alert.alert(
    'Delete activity?',
    `${fmtWhen(meta.startMs)} · ${fmtDur(meta.endMs - meta.startMs)}\nThis permanently removes the raw trace.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRide(meta.rideId);
            await removeStoredResult(meta.rideId);
            dropRecorded(meta.rideId);
            if (freeRideId !== null) unmarkRideFree(freeRideId);
            onDeleted();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ],
  );
}

/** Ignore/Count in ranking. Returns true when the store changed (caller bumps its tick). */
export async function toggleIgnoreRide(rideId: string, nowIgnored: boolean): Promise<boolean> {
  try {
    const upd = await setIgnoredFromRanking(rideId, nowIgnored);
    if (upd) replaceRecorded(upd);
    return true;
  } catch (e) {
    Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Export GPX+ via SAF / share-text, with the same three alerts as before. */
export async function exportRideGpx(meta: RideMeta): Promise<void> {
  try {
    const gpx = await exportGpxPlus(meta.rideId);
    const base = gpxBaseName(meta.startMs);
    const result = await saveGpx(base, gpx);
    if (result.method === 'saf') {
      Alert.alert('Exported', `${base}.gpx saved to the folder you picked.`);
    } else if (result.method === 'share-text') {
      Alert.alert('Shared', 'GPX sent as text via the share sheet.');
    }
  } catch (e) {
    Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
  }
}
```
Check the import of `deleteRide, exportGpxPlus` resolves (`src/storage/index.ts` `:61` and `:71`) and that `unmarkRideFree` is exported from `src/store/freeRides.ts` (it is imported by RideDetailScreen today).

### 1c. `app/src/ui/RideDetailScreen.tsx` — call the shared module

1. Remove `:71-81` (`fmtWhen`, `fmtDur`) — they move to rideActions.ts. `grep -n "fmtWhen\|fmtDur" app/src/ui/RideDetailScreen.tsx` must then return nothing.
2. Replace `:360-371` `onToggleIgnore` with
   ```ts
     async function onToggleIgnore() {
       setBusy(true);
       try {
         if (await toggleIgnoreRide(request.rideId, !model.ignored)) setTick((v) => v + 1);
       } finally {
         setBusy(false);
       }
     }
   ```
3. Replace `:373-390` `onExport` with
   ```ts
     async function onExport() {
       if (!meta) return;
       setExporting(true);
       try {
         await exportRideGpx(meta);
       } finally {
         setExporting(false);
       }
     }
   ```
4. Replace `:392-420` `onDelete` with
   ```ts
     function onDelete() {
       if (!meta) return;
       // RidesScreen remounts on close and refreshes itself; from 'post-stop' the
       // rider lands back on RECORD setup; from 'routes' the way detail underneath
       // is revealed (comment kept from WP-H).
       confirmDeleteRide(meta, model.free?.rideId ?? null, () => tabNav.closeRide());
     }
   ```
5. Imports: add `import { confirmDeleteRide, exportRideGpx, toggleIgnoreRide } from './rideActions.ts';`. Then remove now-unused names: from `:47-48` drop `removeStoredResult` ONLY IF no other use remains (`onSaveFree` at `:317` still calls `void removeStoredResult(request.rideId)` → KEEP it); `setIgnoredFromRanking` → remove; from `:67` drop `deleteRide, exportGpxPlus` (keep `listRides`); drop `:69` `gpxBaseName, saveGpx` import entirely; `unmarkRideFree` is still used by `onNamingSave`/`onUnsaveFree` → keep; `dropRecorded`/`replaceRecorded` still used → keep. Run tsc to confirm no unused-import complaints are errors (tsconfig has no noUnusedLocals, so a leftover import is only untidy — still remove the ones listed).
6. Allow-list: the suite will now report STALE for the 11 RideDetailScreen entries listed in §0 and UNLISTED for the same 11 texts under `src/ui/rideActions.ts`. Edit each existing entry's `file` from `src/ui/RideDetailScreen.tsx` to `src/ui/rideActions.ts` in place (kind and text unchanged; keep reason/since/by). Quote all 11 in the report.

### 1d. `app/src/ui/rideHistoryModel.ts` — `gapS`

1. `SectorRowModel` (`:206-212`): add `/** virgin-cycle23: seconds vs the sector's average (positive = slower), null without a real time or without history */ gapS: number | null;` after `avgLabel: string;`.
2. In `buildSectorRows` (`:226-227`): replace
   `const avgLabel = h.length ? \`avg ${fmt(h.reduce((a, b) => a + b, 0) / h.length)}\` : '';`
   with
   ```ts
         const mean = h.length ? h.reduce((a, b) => a + b, 0) / h.length : null;
         const avgLabel = mean !== null ? `avg ${fmt(mean)}` : '';
   ```
   Add `gapS: null` to the missed return (`:229-232`) and the estimated return (`:236-239`), and `gapS: mean !== null ? v - mean : null` to the final return (`:245`).
3. `grep -n "gapS" app/src/ui/rideHistoryModel.ts` → 4 hits (interface + 3 returns).
4. (R2) `app/tests/replay_suite.ts:272-277` builds four `SectorRowModel` literals without `gapS` (`const sectorRows = [ { index: 0, label: 'S1', timeLabel: '3:05', tier: 'purple' as const, avgLabel: '3:10' }, …` S2/S3/S4) and tsc fails 11× `Property 'gapS' is missing`. Add `, gapS: null` after each row's `avgLabel: '…'` (four rows, nothing else in the file). `grep -c "gapS: null" app/tests/replay_suite.ts` → 4.

### 1e. `app/src/ui/feedModel.ts` — NEW pure feed view-model

```ts
/**
 * virgin-cycle23: pure view-model for the ACTIVITIES feed (brief 02 renders
 * it). No React, no expo, no store reads — everything injected, like
 * rideHistoryModel.ts. One card per ride, newest first (the caller passes
 * buildRideRows' output, already ordered).
 */
import type { RideMeta } from '../storage/types.ts';
import type { RideRowModel, SectorRowModel } from './rideHistoryModel.ts';
import type { RideDetailModel } from './rideDetailModel.ts';
import type { UiTier } from './colourModel.ts';
import { fmt } from './colourModel.ts';   // NOTE: value import → the suite needs the JSON shim (see §2)

export type FeedCardVariant = 'route' | 'plain';

export interface FeedSectorChip { label: string; timeLabel: string; tier: UiTier }

export interface FeedCardModel {
  rideId: string;
  startMs: number;
  dateLabel: string;
  /** route/way name, "Free activity", "<from> → <to>", or null (header shows the date only) */
  title: string | null;
  variant: FeedCardVariant;
  /** 'route': lap label; 'plain': the ride's wall-clock duration, or '' when endMs <= startMs */
  heroLabel: string;
  heroTier: UiTier;         // 'route': detail.lapTier (neutral while ignored); 'plain': 'neutral'
  rankLabel: string | null; // 'P3/10' or null
  subLabel: string | null;  // non-clean quality ('estimated' | 'missed' | 'interrupted'), or 'ignored', else null
  ignored: boolean;
  wayId: string | null;     // the map asset for 'route'; null for 'plain'
  sectorColours: (string | null)[]; // detail.sectorColours (gate-indexed)
  sectors: FeedSectorChip[];        // 'route' only; [] for 'plain'
  /** 'plain' cards draw the ride's own fixes (no reference line to draw) */
  needsTrail: boolean;
  /** which quick toggle the menu offers, or null when the ride cannot rank */
  ignoreToggle: 'ignore' | 'count' | null;
}

export const CARD_HEIGHT_ROUTE = 290; // see brief 02 §1c layout table; includes the 1 dp divider
export const CARD_HEIGHT_PLAIN = 256;
export const CARD_MAP_HEIGHT = 150;

export function durationLabel(meta: RideMeta | null): string {
  if (meta === null || meta.endMs <= meta.startMs) return '';
  return fmt((meta.endMs - meta.startMs) / 1000);
}

/** The strip shows a bare dash for a sector the ride did not traverse; otherwise the row's own time label. */
export function sectorChipLabel(row: SectorRowModel, quality: string): string {
  return quality === 'missed' ? '–' : row.timeLabel;
}

export function buildFeedCard(row: RideRowModel, detail: RideDetailModel, meta: RideMeta | null,
  sectorQuality: (index: number) => string): FeedCardModel {
  const route = detail.kind === 'route';
  const sub = row.quality ?? (detail.ignored ? 'ignored' : null);
  return {
    rideId: row.rideId,
    startMs: row.startMs,
    dateLabel: row.dateLabel,
    title: row.wayName,
    variant: route ? 'route' : 'plain',
    heroLabel: route ? row.lapLabel : durationLabel(meta),
    heroTier: route ? detail.lapTier : 'neutral',
    rankLabel: route ? (row.rank ? `P${row.rank.pos}/${row.rank.of}` : null) : null,
    subLabel: route ? sub : null,
    ignored: detail.ignored,
    wayId: route ? detail.wayId : null,
    sectorColours: detail.sectorColours,
    sectors: route ? detail.sectorRows.map((r) => ({ label: r.label, timeLabel: sectorChipLabel(r, sectorQuality(r.index)), tier: r.tier })) : [],
    needsTrail: !route,
    ignoreToggle: detail.canToggleIgnore ? (detail.ignored ? 'count' : 'ignore') : null,
  };
}

export function buildFeedCards(rows: readonly RideRowModel[],
  detailFor: (rideId: string, startMs: number) => RideDetailModel,
  metaFor: (rideId: string) => RideMeta | null,
  sectorQualityFor: (rideId: string, index: number) => string): FeedCardModel[] {
  return rows.map((row) => buildFeedCard(row, detailFor(row.rideId, row.startMs), metaFor(row.rideId), (i) => sectorQualityFor(row.rideId, i)));
}

export function feedCardHeight(card: FeedCardModel): number {
  return card.variant === 'route' ? CARD_HEIGHT_ROUTE : CARD_HEIGHT_PLAIN;
}

/** FlatList getItemLayout: fixed heights make scroll restore and windowing exact. O(n) per call is fine (n = rides on file). */
export function feedItemLayout(cards: readonly FeedCardModel[], index: number): { length: number; offset: number; index: number } {
  let offset = 0;
  for (let i = 0; i < index && i < cards.length; i++) offset += feedCardHeight(cards[i]);
  const length = index < cards.length ? feedCardHeight(cards[index]) : 0;
  return { length, offset, index };
}

/** Which card indices carry a LIVE map: every viewable index plus `radius` neighbours each side, clamped to [0, count). Empty when nothing is viewable. */
export function liveMapIndices(viewable: readonly number[], count: number, radius: number): Set<number> {
  const out = new Set<number>();
  for (const v of viewable) {
    for (let i = v - radius; i <= v + radius; i++) if (i >= 0 && i < count) out.add(i);
  }
  return out;
}

export function sameIndexSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/** '+3s' / '-2s' / '0s' / '' (null). ASCII hyphen-minus, no dash glyphs (CLAUDE.md rule 9). */
export function sectorGapLabel(gapS: number | null): string {
  if (gapS === null) return '';
  const r = Math.round(gapS);
  if (r === 0) return '0s';
  return `${r > 0 ? '+' : '-'}${Math.abs(r)}s`;
}
```
Notes: `'ignored'` and the `'–'` dash are the only rider-visible literals here; the scanner records neither (single word / no letters) — they are listed in §3 for Nathan anyway. `fmt` is a value import from colourModel.ts, so the new suite uses the ridehistory_suite JSON shim + dynamic import (§2).

### 1f. `app/src/ui/trailCache.ts` — NEW pure LRU + paced loader

Strip-only rule (R1): the suite runs under `node --experimental-strip-types`, which erases types only. No constructor parameter properties (`constructor(readonly x: T)`), no `enum`, no `namespace`, no `import x = require()`, no decorators anywhere in new code — they throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` at import and kill the whole suite. `private`/`readonly` on a declared member is fine.

```ts
/**
 * virgin-cycle23: the feed mounts a few live maps at once and a 'plain' card
 * draws the ride's own fixes — one JSONL read per card. This module paces
 * those reads (at most `concurrency` in flight, FIFO), dedupes a read already
 * in flight, decimates through trailModel's appendTrailPoint (same rule as
 * RideDetailScreen) and keeps the last `capacity` trails in an LRU so a
 * scroll back, or a remount after BACK from the detail page, redraws from
 * memory. Pure: the reader is injected; the app wires readRideFixes in
 * activityCard.tsx (brief 02).
 */
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';

export class LruCache<V> {
  private map = new Map<string, V>();
  readonly capacity: number;
  constructor(capacity: number) { this.capacity = capacity; }   // no parameter property: node strip-only mode rejects it (R1)
  get(key: string): V | undefined {        // refreshes recency
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key); this.map.set(key, v);
    return v;
  }
  has(key: string): boolean { return this.map.has(key); }
  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }
  get size(): number { return this.map.size; }
  keys(): string[] { return [...this.map.keys()]; }
}

export type FixReader = (rideId: string) => Promise<readonly { lat: number; lon: number }[] | null>;

export interface TrailLoader {
  /** resolves to the decimated trail (cached afterwards), or null when the file is missing/unreadable (null is cached too, so a missing file is read once) */
  load(rideId: string): Promise<readonly TrailPoint[] | null>;
  /** synchronous cache probe: undefined = not loaded yet */
  peek(rideId: string): readonly TrailPoint[] | null | undefined;
  /** test hook */
  inFlight(): number;
}

export function decimateFixes(raw: readonly { lat: number; lon: number }[]): readonly TrailPoint[] {
  let trail: readonly TrailPoint[] = [];
  for (const f of raw) trail = appendTrailPoint(trail, f.lat, f.lon);
  return trail;
}

export function createTrailLoader(read: FixReader, capacity: number, concurrency: number): TrailLoader {
  const cache = new LruCache<readonly TrailPoint[] | null>(capacity);
  const pending = new Map<string, Promise<readonly TrailPoint[] | null>>();
  const queue: (() => void)[] = [];
  let running = 0;
  const next = () => { while (running < concurrency && queue.length > 0) { running++; queue.shift()!(); } };
  return {
    peek: (id) => (cache.has(id) ? cache.get(id) : undefined),
    inFlight: () => running,
    load(id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id) as readonly TrailPoint[] | null);
      const p = pending.get(id);
      if (p) return p;
      const job = new Promise<readonly TrailPoint[] | null>((resolve) => {
        queue.push(() => {
          read(id).then((raw) => (raw === null ? null : decimateFixes(raw)), () => null).then((trail) => {
            cache.set(id, trail);
            pending.delete(id);
            running--;
            resolve(trail);
            next();
          });
        });
      });
      pending.set(id, job);
      next();
      return job;
    },
  };
}
```

## 2. Tests to add (both registered in `tests/run.ts` right after `:45` `import './ridehomes_suite.ts';`: `import './feedmodel_suite.ts';` then `import './trailcache_suite.ts';`)

### `app/tests/feedmodel_suite.ts`
Header: same `registerHooks` JSON shim as `ridehistory_suite.ts :17-27` (copy it; feedModel imports `fmt` from colourModel which imports `results.seed.json`), then `const { buildFeedCard, buildFeedCards, feedItemLayout, liveMapIndices, sameIndexSet, sectorGapLabel, durationLabel, sectorChipLabel, CARD_HEIGHT_ROUTE, CARD_HEIGHT_PLAIN } = await import('../src/ui/feedModel.ts');`. Build fixtures inline (plain objects typed as `RideRowModel` / `RideDetailModel` / `RideMeta` — no store).

| test name | asserts |
|---|---|
| `feedmodel: buildFeedCard route — hero is the lap label in the detail's tier, rank P<pos>/<of>, sub = non-clean quality, strip = one chip per sector row` | with row `{lapLabel:'5:03.0', quality:null, rank:{pos:1,of:10}, wayName:'Morning'}` and detail `{kind:'route', lapTier:'purple', ignored:false, canToggleIgnore:true, sectorRows:[S1 clean '1:41.0' tier green, S2 missed '– did not traverse –' tier est], sectorColours:[null,'#00D000',null], wayId:'w1'}`: variant 'route', heroLabel '5:03.0', heroTier 'purple', rankLabel 'P1/10', subLabel null, wayId 'w1', sectors length 2, sectors[0].timeLabel '1:41.0', sectors[1].timeLabel '–' (sectorQuality returns 'missed' for index 2), needsTrail false, ignoreToggle 'ignore' |
| `feedmodel: buildFeedCard route — ignored ride: neutral tier, no rank, sub 'ignored', toggle 'count'` | detail ignored:true lapTier 'neutral' canToggleIgnore:true, row.rank null, row.quality null → heroTier 'neutral', rankLabel null, subLabel 'ignored', ignored true, ignoreToggle 'count' |
| `feedmodel: buildFeedCard route — a non-clean quality wins over 'ignored' in the sub label` | row.quality 'estimated', detail.ignored true → subLabel 'estimated' |
| `feedmodel: buildFeedCard plain (free) — duration from meta, neutral tier, no rank/sectors, needsTrail, no toggle` | detail kind 'free' canToggleIgnore false, meta {startMs:1000, endMs:1000+42*60*1000+10*1000} → variant 'plain', heroLabel '42:10', heroTier 'neutral', rankLabel null, sectors [], wayId null, needsTrail true, ignoreToggle null, title === row.wayName |
| `feedmodel: durationLabel — '' when meta is null or endMs <= startMs (never invented)` | null → ''; {startMs: 5, endMs: 5} → ''; {startMs: 5, endMs: 4} → '' |
| `feedmodel: buildFeedCards keeps the rows' order and calls detailFor with (rideId, startMs)` | 3 rows → 3 cards same rideId order; a spy records the (rideId, startMs) pairs |
| `feedmodel: feedItemLayout — offsets are the running sum of fixed heights, route 290 / plain 256` | cards [route, plain, route]: index0 {offset 0, length 290}, index1 {offset 290, length 256}, index2 {offset 546, length 290}; index 3 (past the end) → {length 0, offset 836}; also assert CARD_HEIGHT_ROUTE === 290 && CARD_HEIGHT_PLAIN === 256 |
| `feedmodel: liveMapIndices — viewable plus radius neighbours, clamped; empty in = empty out` | ([2,3], 10, 1) → {1,2,3,4}; ([0], 10, 1) → {0,1}; ([9], 10, 2) → {7,8,9}; ([], 10, 1) → size 0; ([5], 10, 0) → {5} |
| `feedmodel: sameIndexSet` | ({1,2},{2,1}) true; ({1},{1,2}) false; ({1,2},{1,3}) false |
| `feedmodel: sectorGapLabel — +3s / -2s / 0s / '' and rounding` | 3.4 → '+3s'; -1.6 → '-2s'; 0.3 → '0s'; null → ''; assert no '−' (U+2212) and no '—' in any output |
| `feedmodel: sectorChipLabel — missed shows a bare dash, anything else the row's time label` | ({timeLabel:'– did not traverse –'}, 'missed') → '–'; ({timeLabel:'~1:30'}, 'estimated') → '~1:30' |

### `app/tests/trailcache_suite.ts` (no shim needed: imports only trailCache.ts → trailModel.ts → wayMapGeo.ts; confirm with a dry `node --experimental-strip-types -e "import('./app/src/ui/trailCache.ts')"` from the repo root — if it throws on a JSON import, add the same shim)

| test name | asserts |
|---|---|
| `trailcache: LruCache evicts the least recently USED key, get refreshes recency, set on an existing key refreshes too` | capacity 2: set a, set b, get a, set c → keys ['a','c'] (b evicted); then set a (existing) → keys ['c','a']; size 2 |
| `trailcache: loader caches a decimated trail and reads each ride once` | reader counts calls; two fixes 100 m apart → load('r1') twice → reader called once, result length 2, peek('r1') returns the same array |
| `trailcache: loader caches null for a missing file (read once) and resolves null on a throwing reader` | reader returns null for 'gone' → load twice → 1 call, both null, peek('gone') === null; reader throws for 'bad' → load resolves null (no rejection) |
| `trailcache: loader runs at most `concurrency` reads at once, FIFO, and dedupes an in-flight id` | reader returns promises resolved manually; concurrency 2; load a,b,c,d (+ load a again returns the SAME promise object); inFlight() === 2 until a resolves, then c starts (inFlight 2), …; final order of reader calls [a,b,c,d] |
| `trailcache: LRU capacity bounds the loader` | capacity 2, load r1,r2,r3 sequentially (await each) → peek('r1') undefined, peek('r2') and peek('r3') defined |
| `trailcache: decimateFixes applies the trail rule (points closer than TRAIL_MIN_STEP_M collapse)` | 3 fixes: p0, p0+1 m, p0+100 m → length 2 |

Use `metresBetween`-free fixtures: lat/lon deltas of 0.001° ≈ 111 m (far) and 0.00001° ≈ 1 m (near) at lat 50.

## 3. Visible text

| file | kind | exact text | status | action |
|---|---|---|---|---|
| src/ui/rideActions.ts | alert-title | `Delete activity?` | MOVED from RideDetailScreen.tsx | edit entry `file` |
| src/ui/rideActions.ts | alert-body | `{…} · {…} This permanently removes the raw trace.` | MOVED | edit `file` |
| src/ui/rideActions.ts | prop:text | `Cancel` | NEW (RideDetailScreen.tsx keeps its own `Cancel`: Overwrite alert `:412`) | append; reason "virgin-cycle23 brief 01: Delete confirm moved to rideActions.ts; RideDetailScreen.tsx keeps its own Cancel (Overwrite alert)" |
| src/ui/rideActions.ts | prop:text | `Delete` | MOVED (the `text` `Delete` JSX entry of RideDetailScreen.tsx is a different key and stays) | edit `file` |
| src/ui/rideActions.ts | alert-title | `Could not delete` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-title | `Could not update` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-title | `Exported` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-body | `{…}.gpx saved to the folder you picked.` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-title | `Shared` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-body | `GPX sent as text via the share sheet.` | MOVED | edit `file` |
| src/ui/rideActions.ts | alert-title | `Export failed` | MOVED | edit `file` |
| src/ui/feedModel.ts | (not scanned: single word) | `ignored` | NEW, rider sees it in brief 02's card sub-label | none; listed for Nathan |
| src/ui/feedModel.ts | (not scanned: no letters) | `–` | NEW (strip dash for a missed sector) | none |

No other text appears or disappears. If the suite names any other string: STOP. Expected suite output before the edit: 11 UNLISTED under rideActions.ts, 10 STALE under RideDetailScreen.tsx (the suite prints 20 violations then "… and 1 more"; the 21st is `prop:text` `Delete`).

How to edit (R3): ONE python read-modify-write on `app/tests/ui-strings.allow.json`: `json.load`; set `file` on the 10 MOVED entries (match on file+kind+text; reason/since/by untouched); append the one NEW entry; `a['entries'].sort(key=lambda e: (e['file'], e['kind'], e['text']))`; `json.dump(a, f, indent=2, ensure_ascii=False)` + `f.write('\n')`. The dump round-trips the current file byte-for-byte, so the diff is exactly the entry moves. Never touch header fields or any `legacy: true` entry.

## 4. Decisions already made (do not re-decide)

- `'twoFinger'` keeps `touchZoom` on (a pinch also pans — Nathan) and nothing else; `'readonly'` = `pointerEvents="none"` on a wrapper around `<M.Map>` only (the Credit "i" stays tappable). Chosen over an overlay Pressable because an overlay cannot pass two-finger touches through to a native view in RN; `readonly` is the guaranteed-safe fallback brief 02 switches to by one constant.
- `rotateEnabled` absorbs the gesture mode (one edit, keeps the pinned `touchRotate={rotateEnabled}` and drops the compass button with it).
- The zoom bar is hidden for both card modes (Nathan: zoom bar/controls hidden on a card).
- Delete/Ignore/Export move to a shared `.ts` module; Promote, Make route, Save/Unsave free stay in RideDetailScreen (detail-only per Nathan, and two of Promote's alert strings are frozen `legacy` entries that must not move).
- Card hero for a plain card is the wall-clock duration from `RideMeta` (`endMs - startMs`, the same value `buildRideRows` already shows for a free row) — never a distance; '' when it cannot be derived.
- Fixed card heights (route 290 dp / plain 256 dp) are a design choice so `getItemLayout` is exact (scroll restore after BACK, no blank windows). Brief 02 enforces them with `numberOfLines={1}` and explicit row heights.
- Live-map radius default 1 (visible cards plus one above and one below) — brief 02's constant.
- Trail loader: capacity 30, concurrency 2 — brief 02's constants.
- `gapS` is a number (seconds) on the model; the label is formatted by `sectorGapLabel` (ASCII '-' only).

## 5. Acceptance

1. `cd app && ./node_modules/.bin/tsc --noEmit` → exit 0.
2. `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL; total tests = baseline + 17 (11 feedmodel + 6 trailcache); expected `887 tests: 884 pass, 0 fail, 3 skip` (baseline 870 inferred; do not stash/revert to measure it). Report the exact counts.
3. `app/tests/ui-strings.allow.json`: 463 entries (was 462); `git diff` on it shows the 10 MOVED entries leaving the `src/ui/RideDetailScreen.tsx` block and an 11-entry `src/ui/rideActions.ts` block (10 moved + `Cancel`) between the last `src/ui/resultsWayList.tsx` entry and the first `src/ui/rideDetailModel.ts` entry, in sorted order (alert-body `GPX sent…`, `{…} · {…} This permanently…`, `{…}.gpx saved…`; alert-title `Could not delete`, `Could not update`, `Delete activity?`, `Export failed`, `Exported`, `Shared`; prop:text `Cancel`, `Delete`); `RideDetailScreen.tsx | prop:text | Cancel` and `| text | Delete` still present; `legacyCount` 32 and every `legacy` entry untouched. Verify: `python3 -c "import json;a=json.load(open('app/tests/ui-strings.allow.json'));print(len(a['entries']), sum(e['file']=='src/ui/rideActions.ts' for e in a['entries']))"` → `463 11`.
4. `grep -c "gestures" app/src/ui/wayMapView.tsx` ≥ 6; `grep -n "dragPan={oneFingerOn}" app/src/ui/wayMapView.tsx` → 1 hit; `grep -n "pointerEvents={gestures === 'readonly' ? 'none' : 'auto'}" app/src/ui/wayMapView.tsx` → 1 hit.
5. `grep -rn "gestures=" app/src/ui/*.tsx` → NO caller passes it yet (this brief changes no screen).
6. `grep -n "Alert.alert('Delete activity?'" app/src/ui/RideDetailScreen.tsx` → 0; same grep on `rideActions.ts` → 1.
7. `git status --short` lists exactly: `M app/src/ui/wayMapView.tsx`, `M app/src/ui/RideDetailScreen.tsx`, `M app/src/ui/rideHistoryModel.ts`, `M app/tests/run.ts`, `M app/tests/replay_suite.ts` (R2), `M app/tests/ui-strings.allow.json`, `?? app/src/ui/rideActions.ts`, `?? app/src/ui/feedModel.ts`, `?? app/src/ui/trailCache.ts`, `?? app/tests/feedmodel_suite.ts`, `?? app/tests/trailcache_suite.ts` (plus the pre-existing `M deployment/rounds/README.md` and untracked `cycles/` folders, not yours).

## 6. Out of scope

Any screen layout; RidesScreen; the feed card component; the detail redesign; OPEN-ITEMS/STATE edits; committing.

## 7. Stop-on-ambiguity

If any quoted anchor is not found verbatim, if a pinned test in waymap_suite/recordflow_suite fails, if tsc reports an error outside the files above, or if the allow-list suite names a string not in §3: STOP and report verbatim.

## 8. Report format

EXECUTOR-RULES.md final-report list, plus: the 10 allow-list `file` edits and the 1 appended entry quoted; the replay_suite.ts fixture edit; the test count delta; the `git status --short` output; a one-line note that no screen changed (so the inspector can diff-check it).
