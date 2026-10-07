# brief-02 — ACTIVITIES tab becomes a feed (RidesScreen + ActivityCard + ActivityMenu)

**Cycle:** virgin-cycle23. **Source:** `00-nathan-decisions.md` (binding: feed, live maps, two-finger-first, borderless, preview B = map inside a bordered rounded rectangle with 16 dp margins), `03-preview-B-inset.html` / `preview-common.js` (visual target; fake data), digests 01/02. Written by the Plan tier (Fable) 2026-10-06 night; anchors re-read at commit `d03f5df` and adjusted for brief 01. Nothing is executed yet.

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle23/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order: AFTER brief 01** (needs `WayMapView`'s `gestures` prop, `src/ui/rideActions.ts`, `src/ui/feedModel.ts`, `src/ui/trailCache.ts`). Pre-flight: `grep -c "gestures" app/src/ui/wayMapView.tsx` ≥ 6 and `ls app/src/ui/feedModel.ts app/src/ui/trailCache.ts app/src/ui/rideActions.ts` all exist, else STOP ("brief 01 not landed").

## Goal

The ACTIVITIES tab shows every activity of the active sport as a pre-expanded block, newest first: route name + date, hero lap time in its tier colour with rank and quality beneath, a LIVE map (150 dp, in the map component's own bordered rounded frame, 16 dp side margins), a sector strip S1..Sn with times in tier colours; a plain variant (free / no-way) with the duration as hero, no rank, no strip, the ride's own trail on the map. Blocks sit directly on the page background separated by a 1 dp divider; no per-activity card box, no left accent bar. The separate FREE ACTIVITIES section is gone (free activities sit in the same chronological feed, titled "Free activity" as `buildRideRows` already names them). A tap anywhere on a block opens the existing full-screen detail (`tabNav.openRide`, unchanged). A ⋯ button on each block opens a small menu: Ignore/Count in ranking (when the ride can rank) and Delete. Only the on-screen blocks plus one neighbour each side carry a live map; the rest show an instant placeholder in the frame colour. BACK from the detail restores the feed's scroll offset.

## 0. What the code does today (verified anchors; brief 01 does not touch RidesScreen.tsx)

- `app/src/ui/RidesScreen.tsx` (271 lines): imports `:9-26` (incl. `:10` `import { Alert, SectionList, Pressable, StyleSheet, Text, View } from 'react-native';`, `:21` `import { FREE_RIDE_ROW_NAME, buildRideRows, type RideRowModel } from './rideHistoryModel';`, `:25` `import { PaddockTheme, radius } from './theme';`); state `:32-41` (`rides`, `resultsTick`, `pickLabels`); `refresh` `:43-59` (sport scoping — KEEP VERBATIM); effects `:61-63`, `:81-96` (settleRideHomes), `:104-136` (pick labels — KEEP VERBATIM); `rows` memo `:138-155` (KEEP); `sections` memo `:156-167` (REMOVE); `:168` `const sportLabel = …`; JSX `:169-216` with the `<SectionList` at `:184-213` (REPLACE); styles `:219-271` (`container: { flex: 1, padding: 16, gap: 14 }`, `header`, `title`, `refreshBtn`, `refreshText`, `sub`, `row`, `rowHead`, `rowInfo`, `rowTitle`, `rowRight`, `rank`, `chev`, `sectionHead`).
- `app/src/ui/RideDetailScreen.tsx` `:157-169` the `rideDetailFor` deps the feed must build identically:
  ```ts
  rideDetailFor(request.rideId, request.startedAtMs, {
    result: getStoredResult(request.rideId),
    free: freeRideNear(freeRideResults(), request.startedAtMs),
    ways: currentCatalog().ways,
    userWays: userCatalog().ways,
    laps: (wayId) => lapValues(wayId, request.rideId),
    sectors: (wayId, i) => sectorValues(wayId, i, request.rideId),
    barred: (wayId) => ownLapBarredFromRanking(wayId, request.rideId),
  })
  ```
  and `:496-514` the route map call (`variant="browse" wayId={model.wayId} lat={null} lon={null} zoom={1} height={300} showRider={false} sectorColours={s.sectorColours ? model.sectorColours : ALL_YELLOW} leadColour={s.sectorColours ? colors.grey : undefined}`), `:554-563` the trail map call (`wayId={null} … trail={fixes ?? undefined}`).
- `app/src/ui/wayMapView.tsx` `:631` `if (riderOnly && !showRider && !hasTrail && !place) return null;` — a browse map with no asset and no trail renders NOTHING (no frame). The card therefore always draws its own placeholder frame underneath (§1b).
- `app/src/ui/theme.ts`: `PaddockTheme { bg, card, cardBorder, text, textDim, text2, accent, accentText, onAccent, statusBar, race: { bg, card, border } }`, `radius = { card: 16, big: 24, pill: 99, btn: 10 }`, `colors.grey`.
- `app/src/ui/tierColour.ts` `:67` `tierTextColour(tier, t)`; `app/src/ui/sectorTrailModel.ts` `:41` `ALL_YELLOW`.
- `app/src/ui/settings.tsx` `useSettings()` → `{ s, set }`, `s.sectorColours: boolean`.
- `app/src/store/routeFromRide.ts` `:48` `readRideFixes(rideId, fs)`; `app/src/storage/expoFsAdapter.ts` `createExpoFsAdapter()`.
- `app/src/ui/tabNav.tsx` `:64` `openRide(req: RideDetailRequest)`; `RideDetailRequest { rideId; source: 'post-stop'|'rides'|'routes'|'results'; startedAtMs }`.
- `App.tsx` `:237-246`: the detail is MOUNT-SWAPPED in place of `<RidesScreen />` — RidesScreen unmounts on open and remounts on close. Scroll restore therefore uses a module-scope variable (survives the remount), not component state. No App.tsx change.
- Tests pinning RidesScreen.tsx (`tests/recordflow_suite.ts :307-309`): must NOT contain `matching ways`, `Loading…`, `recorded only`, `backfilling`, `Record one`, `NO SPORT YET —`; MUST contain `NO SPORT YET · ADD ONE IN SETTINGS`; no em dash in a visible string; no `‖`. `tests/ridehistory_suite.ts` tests `buildRideRows`/`FREE_RIDE_ROW_NAME` (model only, untouched).
- Allow-list entries for `src/ui/RidesScreen.tsx`: `alert-title` `Could not load activities`; `literal` `NO SPORT YET · ADD ONE IN SETTINGS`; `literal` `rides/{…}.events.jsonl`; `prop:title` `FREE ACTIVITIES`; `text` `Activities`, `No activities yet`, `Refresh`.

## 1. Changes, file by file

### 1a. `app/src/ui/activityMenu.tsx` — NEW small anchored menu (shared with brief 03)

```tsx
/**
 * virgin-cycle23 brief 02: the ⋯ quick-action menu of an activity (feed card
 * and detail page). A transparent Modal: a full-screen backdrop that closes on
 * tap, and one card of rows anchored under the ⋯ button's measured window
 * rect. No icons, no sub-labels (CLAUDE.md rule 9). Labels come from the
 * caller so the ui-strings scanner sees them in the screen that owns them.
 */
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface MenuAnchor { x: number; y: number; width: number; height: number }
export interface MenuItem { label: string; onPress: () => void }

export function ActivityMenu(props: { anchor: MenuAnchor | null; items: MenuItem[]; onClose: () => void }) {
  const { t } = useTheme();
  const win = useWindowDimensions();
  const { anchor } = props;
  if (anchor === null) return null;
  const top = Math.min(anchor.y + anchor.height + 2, win.height - 56 * props.items.length - 16);
  const right = Math.max(8, win.width - (anchor.x + anchor.width));
  return (
    <Modal transparent animationType="fade" visible onRequestClose={props.onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} />
      <View style={[st.card, { top, right, backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {props.items.map((it) => (
          <Pressable key={it.label} style={st.row} onPress={() => { props.onClose(); it.onPress(); }}>
            <Text style={[st.rowText, { color: t.text }]}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

/** The ⋯ button; reports its window rect so the menu can anchor under it. */
export function MenuButton(props: { onOpen: (anchor: MenuAnchor) => void; style?: object }) {
  const { t } = useTheme();
  const ref = useRef<View>(null);
  return (
    <View ref={ref} collapsable={false} style={[st.btn, props.style]}>
      <Pressable hitSlop={6} style={st.btnHit}
        onPress={() => ref.current?.measureInWindow((x, y, width, height) => props.onOpen({ x, y, width, height }))}>
        <Text style={[st.btnText, { color: t.textDim }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: { position: 'absolute', minWidth: 190, borderRadius: radius.btn, borderWidth: 1, paddingVertical: 4 },
  row: { paddingVertical: 13, paddingHorizontal: 16 },
  rowText: { fontSize: 14, fontWeight: '600' },
  btn: { width: 40, height: 40 },
  btnHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 22, lineHeight: 24 },
});
```
(`import { useRef } from 'react';` at the top.) The '⋯' glyph has no letters: not a scanned string. `measureInWindow` exists on a `View` ref in RN 0.85 (same API ReactNative has used since 0.6x); if tsc complains about the ref type, use `useRef<View | null>(null)`.

### 1b. `app/src/ui/activityCard.tsx` — NEW feed block

```tsx
/**
 * virgin-cycle23 brief 02: one block of the ACTIVITIES feed (preview B). Flat
 * on the page background, a 1 dp divider below, the map in WayMapView's own
 * bordered rounded frame with 16 dp side margins. Fixed height per variant
 * (feedModel.ts CARD_HEIGHT_*) so the list's getItemLayout is exact —
 * every text row has an explicit height and numberOfLines={1}.
 *
 * Live map only while `live` (brief 02 §1c: on-screen blocks plus
 * MAP_MOUNT_RADIUS neighbours); otherwise an instant placeholder in the
 * frame colour. A 'plain' block (free / no way) draws the ride's own fixes,
 * paced + cached through trailCache.ts; a 'route' block draws the way's
 * reference line (no trail — virgin-cycle22 01's rule), sector colours gated
 * by the SETTINGS toggle exactly like the detail page.
 */
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WayMapView, { type WayMapGestures } from './wayMapView';
import { ALL_YELLOW } from './sectorTrailModel';
import { tierTextColour } from './tierColour';
import { colors, radius, type PaddockTheme } from './theme';
import { useTheme } from './themeContext';
import { CARD_MAP_HEIGHT, type FeedCardModel } from './feedModel';
import { createTrailLoader } from './trailCache';
import type { TrailPoint } from './trailModel';
import { readRideFixes } from '../store/routeFromRide';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { MenuButton, type MenuAnchor } from './activityMenu';

/** Nathan 2026-10-06: two-finger first; flip to 'readonly' if one finger on the
 * map blocks the feed scroll or the tap on his phone (00-nathan-decisions.md §3).
 * ONE line to switch. */
export const CARD_MAP_GESTURES: WayMapGestures = 'twoFinger';
/** live maps = viewable blocks ± this many neighbours */
export const MAP_MOUNT_RADIUS = 1;
/** trails kept in memory / JSONL reads in flight at once */
export const TRAIL_CACHE_CAPACITY = 30;
export const TRAIL_READ_CONCURRENCY = 2;

const rideTrails = createTrailLoader((id) => readRideFixes(id, createExpoFsAdapter()), TRAIL_CACHE_CAPACITY, TRAIL_READ_CONCURRENCY);

function useRideTrail(rideId: string, enabled: boolean): readonly TrailPoint[] | null {
  const [trail, setTrail] = useState<readonly TrailPoint[] | null>(() => rideTrails.peek(rideId) ?? null);
  useEffect(() => {
    if (!enabled) return;
    const cached = rideTrails.peek(rideId);
    if (cached !== undefined) { setTrail(cached); return; }
    let cancelled = false;
    void rideTrails.load(rideId).then((tr) => { if (!cancelled) setTrail(tr); });
    return () => { cancelled = true; };
  }, [rideId, enabled]);
  return trail;
}

export const ActivityCard = memo(function ActivityCard(props: {
  card: FeedCardModel; live: boolean; sectorColoursOn: boolean;
  onPress: () => void; onMenu: (anchor: MenuAnchor) => void;
}) {
  const { card, live, sectorColoursOn } = props;
  const { t } = useTheme();
  const st = stylesFor(t);
  const trail = useRideTrail(card.rideId, live && card.needsTrail);
  const hero = tierTextColour(card.heroTier, t);
  const showMap = live && (card.variant === 'route' || (trail !== null && trail.length > 1));
  return (
    <Pressable style={st.block} onPress={props.onPress}>
      <View style={st.head}>
        {card.title !== null ? <Text style={st.title} numberOfLines={1}>{card.title}</Text> : <View style={{ flex: 1 }} />}
        <Text style={st.date} numberOfLines={1}>{card.dateLabel}</Text>
      </View>
      <View style={[st.hero, card.ignored && st.dim]}>
        <Text style={[st.lap, { color: hero }]} numberOfLines={1}>{card.heroLabel}</Text>
        <View style={st.heroCol}>
          {card.rankLabel !== null ? <Text style={st.rank} numberOfLines={1}>{card.rankLabel}</Text> : null}
          {card.subLabel !== null ? <Text style={st.qual} numberOfLines={1}>{card.subLabel}</Text> : null}
        </View>
      </View>
      <View style={st.mapSlot}>
        <View style={st.placeholder} />
        {showMap ? (
          <WayMapView
            variant="browse"
            wayId={card.wayId}
            lat={null}
            lon={null}
            zoom={1}
            height={CARD_MAP_HEIGHT}
            showRider={false}
            gestures={CARD_MAP_GESTURES}
            trail={card.needsTrail ? trail ?? undefined : undefined}
            sectorColours={card.variant === 'route' ? (sectorColoursOn ? card.sectorColours : ALL_YELLOW) : undefined}
            leadColour={card.variant === 'route' && sectorColoursOn ? colors.grey : undefined}
          />
        ) : null}
      </View>
      {card.variant === 'route' ? (
        <View style={st.strip}>
          {card.sectors.map((sec) => (
            <View key={sec.label} style={st.chip}>
              <Text style={st.chipLabel}>{sec.label}</Text>
              <Text style={[st.chipTime, { color: tierTextColour(sec.tier, t) }]}>{sec.timeLabel}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <MenuButton style={st.dots} onOpen={props.onMenu} />
    </Pressable>
  );
});
```
Layout table — the heights MUST add up to feedModel's constants (route 290, plain 256); every row has an explicit `height`:

| part | style | height |
|---|---|---|
| block | `paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.cardBorder` | 14 + 16 + 1 |
| head | `flexDirection row, alignItems center, paddingHorizontal 16, paddingRight 52, height 24` | 24 |
| hero | `flexDirection row, alignItems center, gap 12, paddingHorizontal 16, height 46` | 46 |
| mapSlot | `marginTop 6, marginHorizontal 16, height CARD_MAP_HEIGHT` | 6 + 150 |
| strip (route only) | `flexDirection row, gap 22, paddingHorizontal 16, marginTop 10, height 24, alignItems center` | 10 + 24 |
| route total | | 14+24+46+156+34+16+1 = **291 → set `paddingBottom: 15`** so the total is 290 |
| plain total | | 14+24+46+156+15+1 = **256** ✓ |

So: `paddingBottom: 15` (not 16) in `block`. Other styles: `title: { flex: 1, color: t.text, fontSize: 17, fontWeight: '800', lineHeight: 22 }`; `date: { color: t.textDim, fontSize: 12.5, fontVariant: ['tabular-nums'], marginLeft: 10 }`; `lap: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 40 }`; `heroCol: { justifyContent: 'center' }`; `rank: { color: t.text2, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 18 }`; `qual: { color: t.textDim, fontSize: 12.5, lineHeight: 16 }`; `dim: { opacity: 0.45 }`; `placeholder: { ...StyleSheet.absoluteFillObject, borderRadius: radius.card, borderWidth: 1, borderColor: t.cardBorder, backgroundColor: t.race.bg }`; `chip: { flexDirection: 'row', alignItems: 'baseline', gap: 6 }`; `chipLabel: { color: t.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 }`; `chipTime: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }`; `dots: { position: 'absolute', top: 6, right: 4 }`. Build the styles with a module-level `const stylesFor = (t: PaddockTheme) => StyleSheet.create({...})` memoised per theme object (a `WeakMap<PaddockTheme, …>` or `useMemo` inside the component — either; keep it cheap, the card is memo'd).
Rules: NO hard-coded hex anywhere in this file (theme tokens / `colors.*` only); no sub-label text beyond `rankLabel`/`subLabel` from the model; `'⋯'` only via MenuButton.

### 1c. `app/src/ui/RidesScreen.tsx` — the feed

1. Imports: replace `:10` with `import { Alert, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';`; add `import { useRef } from 'react'` to the react import at `:9`; replace `:21` with `import { buildRideRows } from './rideHistoryModel';` (FREE_RIDE_ROW_NAME and RideRowModel no longer used — remove `sections`); add:
   ```ts
   import { userCatalog } from '../store/catalogStore';
   import { lapValues, ownLapBarredFromRanking, sectorValues } from './colourModel';
   import { rideDetailFor } from './rideDetailModel';
   import { buildFeedCards, feedItemLayout, liveMapIndices, sameIndexSet, type FeedCardModel } from './feedModel';
   import { ActivityCard, MAP_MOUNT_RADIUS } from './activityCard';
   import { ActivityMenu, type MenuAnchor, type MenuItem } from './activityMenu';
   import { confirmDeleteRide, toggleIgnoreRide } from './rideActions';
   import { useSettings } from './settings';
   ```
   (`currentCatalog` is already imported at `:15`; `freeRideNear, freeRideResults` at `:14`; `getStoredResult` at `:13`.) Keep `radius` in the theme import only if still used by `refreshBtn` (it is).
2. Module scope, above the component: `/** survives the detail's mount-swap (App.tsx) so BACK lands where the rider was */ let feedScrollOffset = 0;`
3. Inside the component after `const styles = …`: `const { s } = useSettings();` `const listRef = useRef<FlatList<FeedCardModel>>(null);` `const restoredRef = useRef(false);` `const [liveIdx, setLiveIdx] = useState<Set<number>>(() => new Set());` `const [menu, setMenu] = useState<{ anchor: MenuAnchor; card: FeedCardModel } | null>(null);`
4. Delete the `sections` memo (`:156-167`) and add after the `rows` memo:
   ```ts
   const metaById = useMemo(() => new Map((rides ?? []).map((m) => [m.rideId, m])), [rides]);
   const cards = useMemo(
     () => buildFeedCards(rows,
       (rideId, startMs) => rideDetailFor(rideId, startMs, {
         result: getStoredResult(rideId),
         free: freeRideNear(freeRideResults(), startMs),
         ways: currentCatalog().ways,
         userWays: userCatalog().ways,
         laps: (wayId) => lapValues(wayId, rideId),
         sectors: (wayId, i) => sectorValues(wayId, i, rideId),
         barred: (wayId) => ownLapBarredFromRanking(wayId, rideId),
       }),
       (rideId) => metaById.get(rideId) ?? null,
       (rideId, i) => getStoredResult(rideId)?.sectors.find((sec) => sec.index === i)?.quality ?? 'clean'),
     // eslint-disable-next-line react-hooks/exhaustive-deps
     [rows, metaById, resultsTick],
   );
   const cardsRef = useRef(cards); cardsRef.current = cards;
   const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 5, minimumViewTime: 0 }).current;
   const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
     const idx = viewableItems.map((v) => v.index).filter((i): i is number => i !== null);
     const next = liveMapIndices(idx, cardsRef.current.length, MAP_MOUNT_RADIUS);
     setLiveIdx((prev) => (sameIndexSet(prev, next) ? prev : next));
   }).current;
   const menuItems = (card: FeedCardModel): MenuItem[] => {
     const meta = metaById.get(card.rideId) ?? null;
     const toggle: MenuItem | null = card.ignoreToggle === null ? null
       : card.ignoreToggle === 'count'
         ? { label: 'Count in ranking', onPress: () => void toggleIgnoreRide(card.rideId, false).then((ok) => { if (ok) setResultsTick((v) => v + 1); }) }
         : { label: 'Ignore in ranking', onPress: () => void toggleIgnoreRide(card.rideId, true).then((ok) => { if (ok) setResultsTick((v) => v + 1); }) };
     const del: MenuItem = { label: 'Delete', onPress: () => { if (meta) confirmDeleteRide(meta, freeRideNear(freeRideResults(), card.startMs)?.rideId ?? null, () => void refresh()); } };
     return toggle ? [toggle, del] : [del];
   };
   ```
   The three `label:` literals must be written exactly in that shape (a `label:` property with a plain string literal) so the scanner records them as `prop:label` — see §3.
5. Replace the JSX `:169-216` with:
   ```tsx
   return (
     <View style={styles.container}>
       <View style={styles.header}>
         <Text style={styles.title}>Activities</Text>
         <Pressable style={styles.refreshBtn} onPress={refresh}>
           <Text style={styles.refreshText}>Refresh</Text>
         </Pressable>
       </View>
       {/* Q5: bare sport-name badge, same convention as ROUTES. */}
       <Text style={[styles.sub, styles.pad]}>
         {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET · ADD ONE IN SETTINGS'}
       </Text>
       {rides == null ? null : rides.length === 0 ? (
         <Text style={[styles.sub, styles.pad]}>No activities yet</Text>
       ) : (
         <FlatList
           ref={listRef}
           data={cards}
           extraData={liveIdx}
           keyExtractor={(c) => c.rideId}
           getItemLayout={(_data, index) => feedItemLayout(cards, index)}
           renderItem={({ item, index }) => (
             <ActivityCard
               card={item}
               live={liveIdx.has(index)}
               sectorColoursOn={s.sectorColours}
               onPress={() => tabNav.openRide({ rideId: item.rideId, source: 'rides', startedAtMs: item.startMs })}
               onMenu={(anchor) => setMenu({ anchor, card: item })}
             />
           )}
           viewabilityConfig={viewabilityConfig}
           onViewableItemsChanged={onViewableItemsChanged}
           onScroll={(e) => { feedScrollOffset = e.nativeEvent.contentOffset.y; }}
           scrollEventThrottle={64}
           onLayout={() => {
             if (restoredRef.current) return;
             restoredRef.current = true;
             if (feedScrollOffset > 0) listRef.current?.scrollToOffset({ offset: feedScrollOffset, animated: false });
           }}
           windowSize={5}
           initialNumToRender={3}
           maxToRenderPerBatch={3}
           removeClippedSubviews
           contentContainerStyle={styles.feed}
           style={{ flex: 1 }}
         />
       )}
       <ActivityMenu anchor={menu?.anchor ?? null} items={menu ? menuItems(menu.card) : []} onClose={() => setMenu(null)} />
     </View>
   );
   ```
6. Styles: `container: { flex: 1 }`; `header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }`; add `pad: { paddingHorizontal: 16, marginBottom: 6 }` and `feed: { paddingBottom: 24 }`; keep `title`, `refreshBtn`, `refreshText`, `sub`; REMOVE `row`, `rowHead`, `rowInfo`, `rowTitle`, `rowRight`, `rank`, `chev`, `sectionHead` (and their comments). `radius` import stays (refreshBtn).
7. Update the file header comment (`:1-8`): add one line "virgin-cycle23 brief 02: the rows became a feed of pre-expanded blocks with live maps (activityCard.tsx); a tap still opens the detail."
8. Allow-list (§3): remove the stale `prop:title` `FREE ACTIVITIES` entry; append `prop:label` `Ignore in ranking`, `Count in ranking`, `Delete` for `src/ui/RidesScreen.tsx`.

## 2. Tests

No new suite (the UI is not headlessly renderable; the pure parts were tested in brief 01). Add to `app/tests/recordflow_suite.ts`, right before the test `'virgin-cycle21 04: wayHintForPick …'` (`:338`), ONE static-pin test:

```ts
test('virgin-cycle23 02: ACTIVITIES is a flat feed — FlatList of ActivityCards, fixed layout, no FREE ACTIVITIES section, two-finger card maps switchable in one line', () => {
  const read = (...p: string[]) => fs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');
  const rides = read('src', 'ui', 'RidesScreen.tsx');
  assert(rides.includes('<FlatList') && !rides.includes('SectionList'), 'FlatList, not SectionList');
  assert(!rides.includes('FREE ACTIVITIES') && !rides.includes('FREE_RIDE_ROW_NAME'), 'no separate free section');
  assert(rides.includes('getItemLayout={(_data, index) => feedItemLayout(cards, index)}'), 'exact item layout');
  assert(rides.includes('onViewableItemsChanged') && rides.includes('MAP_MOUNT_RADIUS'), 'live maps follow viewability');
  assert(rides.includes('let feedScrollOffset = 0;') && rides.includes('scrollToOffset({ offset: feedScrollOffset, animated: false })'), 'BACK restores the feed offset');
  assert(rides.includes("source: 'rides'"), 'tap still opens the detail from rides');
  const card = read('src', 'ui', 'activityCard.tsx');
  assert(/export const CARD_MAP_GESTURES: WayMapGestures = '(twoFinger|readonly)';/.test(card), 'one-line gesture switch');
  assert(card.includes('gestures={CARD_MAP_GESTURES}'), 'the card map uses it');
  assert(!/#[0-9A-Fa-f]{3,8}\b/.test(card.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no hard-coded hex in the card');
  assert(card.includes('borderBottomWidth: 1') && !card.includes('borderLeftWidth'), 'divider, no accent bar');
  assert(!card.includes('trail=') || card.includes("card.needsTrail ? trail ?? undefined : undefined"), 'route blocks never draw the raw trail');
  assert(/sectorColours=\{card\.variant === 'route' \? \(sectorColoursOn \? card\.sectorColours : ALL_YELLOW\) : undefined\}/.test(card), 'sector colours gated by the toggle, as the detail page');
  const menu = read('src', 'ui', 'activityMenu.tsx');
  assert(menu.includes('<Modal transparent') && menu.includes('measureInWindow'), 'anchored menu over a transparent modal');
});
```
Then: `cd app && node --experimental-strip-types tests/run.ts` → 0 FAIL, count = baseline (after brief 01) + 1.

## 3. Visible text

| file | kind | exact text | status | action |
|---|---|---|---|---|
| src/ui/RidesScreen.tsx | prop:title | `FREE ACTIVITIES` | REMOVED (section gone) | remove entry |
| src/ui/RidesScreen.tsx | prop:label | `Ignore in ranking` | NEW (feed ⋯ menu; same words as the detail page) | append; reason "cycle23 feed menu: quick toggle, same label as the detail page" |
| src/ui/RidesScreen.tsx | prop:label | `Count in ranking` | NEW | append, same reason |
| src/ui/RidesScreen.tsx | prop:label | `Delete` | NEW (feed ⋯ menu) | append; reason "cycle23 feed menu: delete with the existing confirm" |
| src/ui/activityCard.tsx / activityMenu.tsx | — | (none; '⋯' has no letters) | | |

Unchanged and still present in RidesScreen.tsx: `Activities`, `Refresh`, `No activities yet`, `NO SPORT YET · ADD ONE IN SETTINGS`, `Could not load activities`, `rides/{…}.events.jsonl`. If the suite reports anything else: STOP.

Sorted entries (RULINGS.md R3, 2026-10-06): `tests/ui_strings_suite.ts:212` asserts `entries` are sorted by (file, kind, text) in code-unit order, so "append" means INSERT at the sorted slot: the three `prop:label` entries sit after `src/ui/RidesScreen.tsx | literal | rides/{…}.events.jsonl` and before `| text | Activities`, in the order `Count in ranking`, `Delete`, `Ignore in ranking` (where the removed `prop:title | FREE ACTIVITIES` was). Do it with one python read-modify-write (`json.load` → remove / append → `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` → `json.dump(indent=2, ensure_ascii=False)` + trailing newline; this round-trips the file byte-for-byte). Entry fields: file, kind, text, reason, since (today), by ("Sonnet execute, virgin-cycle23 brief 02").

## 4. Decisions already made

- Live-map mechanism: FlatList + viewability (`itemVisiblePercentThreshold: 5`) → live set = viewable ± `MAP_MOUNT_RADIUS` (1). Typically 3-5 live maps; the first paint of a block is always the placeholder frame (instant). `windowSize 5` keeps a few more blocks RENDERED (text only, cheap) than MAPPED.
- Placeholder = the map frame colour (`t.race.bg`) with the same border/radius; no trail line in the placeholder (a line cannot be drawn without the map; the live map draws it as soon as its style is up, instantly on the offline style). Nathan's "card colour + trail line immediately" is therefore met for the colour, approximated for the line — say so in the report.
- Scroll restore via a module-scope offset + `getItemLayout` with fixed heights (feedModel constants). The detail stays mount-swapped (no App.tsx change): simpler, and it means the feed's maps are NOT alive under the detail page.
- Free activities: titled "Free activity" (the row model's existing name), no extra marker (the title already says it; CLAUDE.md rule 9). A 'none' ride (not saved as free) shows its from→to pick label or no title, and the duration — no "not saved" text.
- 'ignored' sub-label replaces the hidden rank on an ignored ride; a non-clean quality wins over it (one word only).
- Card tap target: the whole block is one Pressable; the map, in 'twoFinger' mode, handles its own touches (a one-finger tap on the map may or may not reach the block — the title/hero/strip areas always do). If on-device the map swallows one-finger scrolling, Nathan flips `CARD_MAP_GESTURES` to `'readonly'` (map takes no touches at all; scroll and tap work everywhere). Both lines go to OPEN-ITEMS via the coordinator (§7).
- Trail loader: capacity 30 / concurrency 2 (brief 01); one shared instance per app session.
- Menu: transparent Modal anchored under the ⋯ (preview B's dropdown), not a bottom sheet (Nathan rejected sheets for the detail; a modal row list is the closest native-feeling equivalent that does not fight the map's gestures).

## 5. Acceptance

1. Pre-flight greps (top of this brief) pass.
2. tsc exit 0; run.ts 0 FAIL, +1 test vs the post-brief-01 count (report both numbers).
3. `git diff -- app/tests/ui-strings.allow.json`: exactly one entry removed (`FREE ACTIVITIES`) and three added at their sorted slot (§3), nothing else; entry count = before + 2 (465 if brief 01 left 463).
4. `grep -n "SectionList\|FREE_RIDE_ROW_NAME\|sectionHead\|borderLeftWidth" app/src/ui/RidesScreen.tsx` → nothing.
5. `grep -c "numberOfLines={1}" app/src/ui/activityCard.tsx` ≥ 6.
6. Heights: `grep -n "height: 24\|height: 46\|paddingBottom: 15\|paddingTop: 14\|marginTop: 6\|marginTop: 10" app/src/ui/activityCard.tsx` shows all six (the sum rule in §1b).
7. `git status --short`: `M app/src/ui/RidesScreen.tsx`, `M app/tests/recordflow_suite.ts`, `M app/tests/ui-strings.allow.json`, `?? app/src/ui/activityCard.tsx`, `?? app/src/ui/activityMenu.tsx` plus brief 01's files.

## 6. Out of scope

RideDetailScreen (brief 03); App.tsx; any WayMapView change beyond brief 01; distance for free activities (not required: duration only); FlashList or any new dependency.

## 7. For the coordinator (OPEN-ITEMS, not edited by you — put this in the report)

"virgin-cycle23 brief 02 (feed), on-device checks owed: (a) one-finger scroll and tap over a card MAP — if the native map swallows them, flip `CARD_MAP_GESTURES` in `app/src/ui/activityCard.tsx` to `'readonly'` (one line); (b) two-finger pinch on a card map moves/zooms it; (c) scroll smoothness with 3-5 live maps (MAP_MOUNT_RADIUS/windowSize are the knobs); (d) BACK from the detail lands at the same feed offset; (e) day/night contrast of the hero/strip colours on the bare page background; (f) the map 'i' credit button on a card still opens its card."

## 8. Stop-on-ambiguity / report

As EXECUTOR-RULES.md. Report every allow-list change quoted, the test counts, `git status --short`, and the §7 paragraph verbatim.
