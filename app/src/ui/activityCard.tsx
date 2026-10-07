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
  onOpen: (card: FeedCardModel) => void; onMenu: (card: FeedCardModel, anchor: MenuAnchor) => void;
}) {
  const { card, live, sectorColoursOn } = props;
  const { t } = useTheme();
  const st = stylesFor(t);
  const trail = useRideTrail(card.rideId, live && card.needsTrail);
  const hero = tierTextColour(card.heroTier, t);
  const showMap = live && (card.variant === 'route' || (trail !== null && trail.length > 1));
  return (
    <Pressable style={st.block} onPress={() => props.onOpen(card)}>
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
              <Text style={st.chipLabel} numberOfLines={1}>{sec.label}</Text>
              <Text style={[st.chipTime, { color: tierTextColour(sec.tier, t) }]} numberOfLines={1}>{sec.timeLabel}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <MenuButton style={st.dots} onOpen={(anchor) => props.onMenu(card, anchor)} />
    </Pressable>
  );
});

const styleCache = new WeakMap<PaddockTheme, ReturnType<typeof makeStyles>>();
function stylesFor(t: PaddockTheme) {
  let s = styleCache.get(t);
  if (s === undefined) { s = makeStyles(t); styleCache.set(t, s); }
  return s;
}

// Heights add up to feedModel's CARD_HEIGHT_ROUTE (290) / CARD_HEIGHT_PLAIN (256):
// route = 14 + 24 + 46 + (6 + 150) + (10 + 24) + 15 + 1 ; plain = same minus the strip (34).
const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  block: { paddingTop: 14, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: t.cardBorder },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingRight: 52, height: 24 },
  title: { flex: 1, color: t.text, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  date: { color: t.textDim, fontSize: 12.5, fontVariant: ['tabular-nums'], marginLeft: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 46 },
  lap: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 40 },
  heroCol: { justifyContent: 'center' },
  rank: { color: t.text2, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 18 },
  qual: { color: t.textDim, fontSize: 12.5, lineHeight: 16 },
  dim: { opacity: 0.45 },
  mapSlot: { marginTop: 6, marginHorizontal: 16, height: CARD_MAP_HEIGHT },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: t.race.bg,
  },
  strip: { flexDirection: 'row', gap: 22, paddingHorizontal: 16, marginTop: 10, height: 24, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  chipLabel: { color: t.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  chipTime: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dots: { position: 'absolute', top: 6, right: 4 },
});
