/**
 * RIDES — ride history (cycle 024, WP-A3 redesign of the mockup's
 * ridesScreen(), cycle 022; WP-H 2026-09-04). Was a flat fixes-counter list
 * ("the list is a fix counter, not a ride list" — Ines, beta); every ride is
 * a row — route, date, lap, rank — and a tap now opens the full-screen ride
 * detail (WP-H) instead of expanding in place: sector splits, trace, Export/
 * Delete/Ignore/Set-as-reference all live there now.
 * virgin-cycle23 brief 02: the rows became a feed of pre-expanded blocks with live maps (activityCard.tsx); a tap still opens the detail.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, PixelRatio, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewToken } from 'react-native';
import { listRides } from '../storage';
import type { PickEvent, RideMeta } from '../storage/types';
import { getStoredResult } from '../store/resultsStore';
import { freeRideNear, freeRideResults } from '../store/freeRides';
import { currentCatalog } from '../store/catalogStore';
import { effectiveRideSportId } from '../store/sports';
import { activeSportId, currentSports } from '../store/sportStore';
import { routeTitle, wayLabelIn } from '../store/defaultWay';
import { pickedLoop } from './recordFlow';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { decodeEventsFile } from '../storage/eventsJsonl';
import { buildRideRows } from './rideHistoryModel';
import { userCatalog } from '../store/catalogStore';
import { ownLapBarredFromRanking, priorLapValues, priorSectorValues } from './colourModel';
import { rideDetailFor } from './rideDetailModel';
import { buildFeedCards, CARD_MAP_HEIGHT, feedItemLayout, liveMapIndices, sameIndexSet, type FeedCardModel } from './feedModel';
import { ActivityCard, MAP_MOUNT_RADIUS, rideTrails } from './activityCard';
import { assetFor, MAP_STYLE_DAY, MAP_STYLE_NIGHT } from './wayMapView';
import { fitZoomFor, paddedBoundsFor, cardSnapshotStyle } from './cardSnapshotModel';
import { requestSnapshot } from './cardSnapshotQueue';
import { cachedPatchedStyles } from './mapStyleCache';
import { ALL_YELLOW } from './sectorTrailModel';
import { trailLineFeature, type TrailPoint } from './trailModel';
import { gateHalfLenM, gateTicksFeatureCollection, routeRunsFeatureCollection, sectorSpansFeatureCollection, trailBounds, wayBounds } from './wayMapGeo';
import { ActivityMenu, type MenuAnchor, type MenuItem } from './activityMenu';
import { confirmDeleteRide, toggleIgnoreRide } from './rideActions';
import { useSettings } from './settings';
import { settleRideHomes } from './rideHomes';
import { useTabNav } from './tabNav';
import { colors, PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

/** survives the detail's mount-swap (App.tsx) so BACK lands where the rider was */
let feedScrollOffset = 0;

export default function RidesScreen() {
  const { t, mode } = useTheme();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { s } = useSettings();
  const listRef = useRef<FlatList<FeedCardModel>>(null);
  const restoredRef = useRef(false);
  const [liveIdx, setLiveIdx] = useState<Set<number>>(() => new Set());
  const [menu, setMenu] = useState<{ anchor: MenuAnchor; card: FeedCardModel } | null>(null);
  const [rides, setRides] = useState<RideMeta[] | null>(null);
  // Bumped after a backfill pass so buildRideRows re-reads resultsStore's
  // module-level map — React has no way to know that map changed on its own.
  const [resultsTick, setResultsTick] = useState(0);
  // virgin-cycle13 (Nathan 2026-09-24): "<from> → <to>" for a ride whose own
  // stored result is null/unmatched, read once per rideId from its GPX+
  // events sidecar (N9's PickEvent) — see the effect below and
  // rideHistoryModel.ts's buildRideRows doc comment for the full "no way"
  // fallback chain (reference ride first, this second).
  const [pickLabels, setPickLabels] = useState<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const list = await listRides();
      // WP-1: RIDES shows only the active sport's own rides (both sides are
      // null under zero sports, so every ride passes — §3.4). Backfill above
      // still runs unfiltered across every sport (per-ride-sport, not
      // per-active-sport) so switching sport never starves another sport's
      // backfill.
      const f = currentSports();
      const active = activeSportId();
      const scoped = list.filter((r) => effectiveRideSportId(r.sportId, f) === active);
      setRides([...scoped].sort((a, b) => b.startMs - a.startMs));
    } catch (e) {
      Alert.alert('Could not load activities', e instanceof Error ? e.message : String(e));
      setRides([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cycle 024 (WP-A3): older on-device rides may predate the results store —
  // derive their route/lap/sectors the first time this screen is visited (and
  // after every manual refresh; backfillMissingResults is idempotent, it
  // skips anything already stored, so re-running it costs nothing). D-023:
  // read-only over the raw JSONL — this only ever derives, never rewrites it.
  //
  // Fix 2026-08-24 (WP-A3 review): only rides whose index status is 'ended'
  // are offered up. `rides` (listRides()) deliberately also includes a ride
  // still recording or crashed mid-ride, honestly derived from its truncated
  // file — back-filling THAT file can fail to match any route, and a failed
  // match writes a PERMANENT unmatched marker at the current
  // BACKFILL_ENGINE_VERSION (resultsStore.ts), poisoning that ride's result
  // even after it is later healed/ended. Reads index.json the same way
  // lastRide.ts's initRideHistory does (the only other backfillMissingResults
  // caller) so both apply the identical "ended only" rule; skips the pass
  // entirely if the index is missing/corrupt rather than guessing at status.
  useEffect(() => {
    if (rides === null || rides.length === 0) return;
    let cancelled = false;
    (async () => {
      // virgin-cycle18 brief 04: the inline backfill moved to ui/rideHomes.ts
      // (same pass, minus free rides) and is followed there by the orphan
      // filing — a ride this list shows is, after this, always in RESULTS too.
      await settleRideHomes(createExpoFsAdapter());
      if (!cancelled) {
        setResultsTick((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rides]);

  // virgin-cycle13: fills pickLabels for whatever's left "no way" after the
  // backfill pass above AND the reference-ride override (computed inline
  // below, from the catalog — no I/O) — best-effort, one small sidecar read
  // per still-unnamed ride, same non-throwing discipline as the backfill
  // effect. Runs after resultsTick so a ride that DID get backfilled this
  // pass is correctly skipped rather than fetched for nothing.
  useEffect(() => {
    if (rides === null || rides.length === 0) return;
    let cancelled = false;
    (async () => {
      const need = rides.filter((m) => {
        if (pickLabels.has(m.rideId)) return false;
        const res = getStoredResult(m.rideId);
        if (res !== null && res.wayId !== null) return false; // already named
        if (currentCatalog().ways.some((w) => w.referenceRideId === m.rideId)) return false; // reference wins, no fetch needed
        return true;
      });
      if (need.length === 0) return;
      const fs = createExpoFsAdapter();
      const updates = new Map(pickLabels);
      for (const m of need) {
        try {
          const text = await fs.readText(`rides/${m.rideId}.events.jsonl`);
          if (text !== null) {
            const { events } = decodeEventsFile(text);
            const pick = events.find((e): e is PickEvent => e.kind === 'pick');
            if (pick && pick.fromLabel && pick.toLabel) {
              updates.set(m.rideId, routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to)));
            }
          }
        } catch { /* best-effort — the row just falls back to "no way" */ }
      }
      if (!cancelled) setPickLabels(updates);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rides, resultsTick]);

  const rows = useMemo(
    // WP-G: labelFor is routeLabelIn so a user-minted route shows its way + specs, not the raw route:<rideId> id.
    // virgin-cycle13: referenceWayFor/pickLabelFor are the "no way" fallback
    // chain (buildRideRows doc comment) — reference ride first, then this
    // effect's sidecar-derived pick label, then plain null (unchanged).
    // virgin-cycle15 brief 13 §1: freeFor sits between the two — a free ride
    // was always in this list (it is a raw ride like any other); this labels
    // it "Free ride" + gate count instead of the generic "new → new · no
    // lap". Same freeRideNear tolerance match RideDetailScreen uses, so the
    // row's label and the detail's free view can never disagree.
    () => buildRideRows(rides ?? [], getStoredResult, (wayId, excl, beforeMs) => priorLapValues(wayId, excl, beforeMs),
      (id) => wayLabelIn(currentCatalog(), id),
      (rideId) => currentCatalog().ways.find((w) => w.referenceRideId === rideId) ?? null,
      (rideId) => pickLabels.get(rideId) ?? null,
      (startMs) => freeRideNear(freeRideResults(), startMs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rides, resultsTick, pickLabels],
  );
  const metaById = useMemo(() => new Map((rides ?? []).map((m) => [m.rideId, m])), [rides]);
  const cards = useMemo(
    () => buildFeedCards(rows,
      (rideId, startMs) => rideDetailFor(rideId, startMs, {
        result: getStoredResult(rideId),
        free: freeRideNear(freeRideResults(), startMs),
        ways: currentCatalog().ways,
        userWays: userCatalog().ways,
        laps: (wayId) => priorLapValues(wayId, rideId, startMs),
        sectors: (wayId, i) => priorSectorValues(wayId, i, rideId, startMs),
        barred: (wayId) => ownLapBarredFromRanking(wayId, rideId),
      }),
      (rideId) => metaById.get(rideId) ?? null,
      (rideId, i) => getStoredResult(rideId)?.sectors.find((sec) => sec.index === i)?.quality ?? 'clean'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, metaById, resultsTick],
  );
  const cardsRef = useRef(cards); cardsRef.current = cards;
  const tabNavRef = useRef(tabNav); tabNavRef.current = tabNav;
  // virgin-cycle29 02 PROBE (off by default): long-press the title to swap the FIRST card's live map for a
  // snapshotter picture of the same card; long-press again to go back. Brief 04 decides whether this ships.
  const { width: winW } = useWindowDimensions();
  const [probe, setProbe] = useState(false);
  const [probeUri, setProbeUri] = useState<string | null>(null);
  useEffect(() => {
    if (!probe) { setProbeUri(null); return; }
    setProbeUri(null); // inspect-02 m2: never show a picture of a previous input
    const card = cards[0];
    if (card === undefined) return;
    let cancelled = false;
    const styleUrl = mode === 'night' ? MAP_STYLE_NIGHT : MAP_STYLE_DAY;
    const patched = cachedPatchedStyles(styleUrl);
    if (patched === null) { console.log('[snap]', 'skip', 'style'); return; }
    const route = card.variant === 'route';
    const asset = route ? assetFor(card.wayId) : null;
    const peeked = card.needsTrail ? rideTrails.peek(card.rideId) : null;
    const trail: readonly TrailPoint[] | null = peeked ?? null;
    const bounds = route ? (asset ? wayBounds(asset) : null) : (trail ? trailBounds(trail) : null);
    if (bounds === null) { console.log('[snap]', 'skip', 'trail'); return; }
    const colours = route ? (s.sectorColours ? card.sectorColours : ALL_YELLOW) : undefined;
    const lead = route && s.sectorColours ? colors.grey : undefined;
    const widthDp = Math.floor(winW); // inspect-02 m3: native does .toInt(); the maths must use the same width
    const fitZ = fitZoomFor(bounds, widthDp, CARD_MAP_HEIGHT, 20);
    const trailFeature = !route && trail ? trailLineFeature(trail) : null;
    const style = cardSnapshotStyle(patched.labelsOn, {
      route: asset ? routeRunsFeatureCollection(asset, null) : null,
      trail: { type: 'FeatureCollection', features: trailFeature ? [trailFeature] : [] },
      spans: asset && colours ? sectorSpansFeatureCollection(asset, colours, lead, undefined) : null,
      ticks: asset ? gateTicksFeatureCollection(asset, undefined, gateHalfLenM(asset.gates[0]?.lat ?? 0, fitZ), undefined) : null,
    });
    void requestSnapshot({
      variant: card.variant, rideId: card.rideId, wayId: card.wayId, gateSetVersion: null, styleUrl,
      sectorColoursOn: s.sectorColours, sectorColours: card.sectorColours, trailPoints: trail?.length ?? 0,
      widthDp, heightDp: CARD_MAP_HEIGHT, density: PixelRatio.get(),
      styleJson: style, bounds: paddedBoundsFor(bounds, widthDp, CARD_MAP_HEIGHT, 20),
    }).then((uri) => { if (!cancelled) setProbeUri(uri); }, () => { /* logged by the queue */ });
    return () => { cancelled = true; };
  }, [probe, cards, s.sectorColours, mode, winW]);
  const onOpenCard = useCallback((card: FeedCardModel) => {
    tabNavRef.current.openRide({ rideId: card.rideId, source: 'rides', startedAtMs: card.startMs });
  }, []);
  const onMenuCard = useCallback((card: FeedCardModel, anchor: MenuAnchor) => setMenu({ anchor, card }), []);
  // virgin-cycle29 01: 40 % visible before a card carries a live map; with 307 dp cards that is the two the rider sees, never a sliver.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40, minimumViewTime: 0 }).current;
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
  const sportLabel = currentSports().sports.find((sp) => sp.id === activeSportId())?.label ?? null;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onLongPress={() => setProbe((v) => !v)} delayLongPress={600}>
          <Text style={styles.title}>Activities</Text>
        </Pressable>
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
              snapshotUri={index === 0 ? probeUri : null}
              onOpen={onOpenCard}
              onMenu={onMenuCard}
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
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews
          contentContainerStyle={styles.feed}
          style={{ flex: 1 }}
        />
      )}
      <ActivityMenu anchor={menu?.anchor ?? null} items={menu ? menuItems(menu.card) : []} onClose={() => setMenu(null)} />
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pad: { paddingHorizontal: 16, marginBottom: 6 },
  feed: { paddingBottom: 24 },
  // AD pass: titles are big, heavy, high-contrast ink.
  title: {
    color: t.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
  },
  refreshText: { color: t.text2, fontSize: 13 },
  sub: { color: t.text2, fontSize: 14, fontVariant: ['tabular-nums'] },
});
