/**
 * TIMING TOWER (LAYOUT §3b, B-28/B-29, Nathan's 2026-08-15 rulings) — the
 * ranked column of past-self laps that heads the post-run board, into which
 * today's lap slots in. This component owns ANATOMY + MOTION only; which laps
 * populate it (window, dedup, gap semantics) is the PO's layer, and — B-28
 * UNBUILT — the real benchmark/ride-history store does not exist yet, so the
 * REAL app has no provider: only the Preview demo feeds it rows. View-model
 * in, pixels out — nothing here knows where rows came from (one render path,
 * LAYOUT §3.8).
 *
 * Row: P# · tier-coloured time (+ PB ●) · gap to P1 · date. Today ≈1.5× row
 * height, time at display size, accent-yellow left bar (identity chrome,
 * never a tier). Estimated lap = unranked "NO TIME" (dashed-grey time, sits
 * last, travels zero rows). Archive-seeded ghosts carry a ○ marker (D-018).
 * Position is a FACT — no failure styling for low positions (D-013).
 *
 * The slot-in (§3b): on a freshly finished board only (`justFinished`),
 * today's row enters at the BOTTOM and travels UP to its rank over ~700 ms
 * ease-out, the rows it passes stepping down; arrival (accent bar + TODAY)
 * fades in over ~200 ms. Upward is the only direction — zero travel still
 * gets the arrival fade, never an animation of failure. Plays exactly once:
 * never on revisit, never from HISTORY (guarded here AND by the caller).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { Tier } from './chips';
import { PURPLE_INK } from './chips';
import { PaddockTheme, colors, radius } from './theme';
import { useTheme } from './themeContext';

export interface TowerRowModel {
  /** 1-based rank; null = unranked (estimated "NO TIME" — §2a.3) */
  pos: number | null;
  /** 'm:ss', or 'NO TIME' for an unranked estimated lap */
  time: string;
  /** colours the TIME only — position/gap/date stay ink (§3b) */
  tier: Tier;
  /** signed gap to P1; '—' for P1; '' when unranked */
  gap: string;
  /** past self, e.g. 'Tue 05 Aug'; ignored on the today row (renders TODAY) */
  date: string;
  today?: boolean;
  /** archive-seeded lap (D-018 pre-seeding) — ghost ○ marker */
  ghost?: boolean;
  /** all-time PB ● beside the time, as everywhere (D-007) */
  pb?: boolean;
}

export interface TowerModel {
  /** final ranked order, today's row already in place (unranked today last) */
  rows: TowerRowModel[];
  /** moving/vs-ref/elapsed/stops sub-line anchored under today's row (§3.1) */
  todaySub?: string;
}

const MAX_VISIBLE = 8; // rows without scroll [ASSUMPTION §3b — PO's window call]
const PAST_H = 38;
const TODAY_ROW_H = 56; // ~1.5× — today's row doubles as the board headline
const SUB_H = 18;
const SLOT_IN_MS = 700; // [ASSUMPTION §3b — tune on device]
const ARRIVE_MS = 200;

function timeColor(tier: Tier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple':
      return colors.purple;
    case 'green':
      return colors.green;
    case 'est':
      return colors.grey; // NO TIME — grey is no-data only, and this is no data
    default:
      return t.text; // neutral stays ink, never highlighted (D-022)
  }
}

export function TimingTower({
  model,
  justFinished = false,
  ceremony = false,
  onPlayed,
}: {
  model: TowerModel;
  /** true only on the board pushed by the final gate — arms the slot-in */
  justFinished?: boolean;
  /** §3a.3: REFERENCE SET frame — collapses to today's all-purple row alone */
  ceremony?: boolean;
  onPlayed?: () => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeTowerStyles(t), [t]);
  const played = useRef(false);
  // travel: 1 = today still at the bottom, 0 = arrived at rank.
  const travel = useRef(new Animated.Value(justFinished ? 1 : 0)).current;
  // arrive: accent bar + TODAY label opacity.
  const arrive = useRef(new Animated.Value(justFinished ? 0 : 1)).current;

  const rowsAll = model.rows;
  const todayIdxAll = rowsAll.findIndex((r) => r.today);

  // Pre-scroll (§3b): TODAY must be on screen at board push, clipping P1
  // above if it must — the headline outranks the leader.
  let start = 0;
  if (rowsAll.length > MAX_VISIBLE) {
    const want = todayIdxAll < 0 ? 0 : todayIdxAll - (MAX_VISIBLE - 3);
    start = Math.max(0, Math.min(want, rowsAll.length - MAX_VISIBLE));
  }
  const rows = rowsAll.slice(start, start + MAX_VISIBLE);
  const clippedBelow = rowsAll.length - (start + rows.length);
  const todayIdx = rows.findIndex((r) => r.today);
  const todayBlockH = TODAY_ROW_H + (model.todaySub ? SUB_H : 0);
  const belowDist = todayIdx >= 0 ? (rows.length - 1 - todayIdx) * PAST_H : 0;

  useEffect(() => {
    if (!justFinished || played.current || todayIdx < 0) return;
    played.current = true; // plays exactly once (§3b.3)
    travel.setValue(1);
    arrive.setValue(0);
    Animated.sequence([
      Animated.timing(travel, {
        toValue: 0,
        duration: SLOT_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(arrive, { toValue: 1, duration: ARRIVE_MS, useNativeDriver: true }),
    ]).start(() => onPlayed?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justFinished]);

  if (ceremony) {
    // §3a.3: ranking a ride that just BECAME the definition is noise.
    const today = rowsAll.find((r) => r.today) ?? rowsAll[0];
    return (
      <View style={s.cerRow}>
        <Text style={s.cerLbl}>LAP</Text>
        <Text style={s.cerTime}>{today?.time ?? ''}</Text>
        <Text style={s.cerToday}>TODAY · unranked</Text>
      </View>
    );
  }

  const todayShift = travel.interpolate({ inputRange: [0, 1], outputRange: [0, belowDist] });
  const belowShift = travel.interpolate({ inputRange: [0, 1], outputRange: [0, -todayBlockH] });

  return (
    <View style={s.tower}>
      {start > 0 && (
        <Text style={s.clip}>{`⋮ P1–P${rowsAll[start - 1].pos ?? start} above`}</Text>
      )}
      {rows.map((r, i) => {
        if (r.today) {
          return (
            <Animated.View
              key="today"
              style={[s.todayBlock, { height: todayBlockH, transform: [{ translateY: todayShift }] }]}
            >
              <View style={[s.row, s.todayRow]}>
                <Animated.View style={[s.accentBar, { opacity: arrive }]} />
                <Text style={[s.pos, s.posToday, { color: t.text }]}>
                  {r.pos !== null ? `P${r.pos}` : '—'}
                </Text>
                <Text style={[s.time, s.timeToday, { color: timeColor(r.tier, t) }]}>
                  {r.time}
                  {r.pb ? <Text style={{ color: colors.purple }}> ●</Text> : null}
                </Text>
                <Text style={[s.gap, { color: t.textDim }]}>{r.gap}</Text>
                <Animated.Text style={[s.date, s.dateToday, { color: t.text, opacity: arrive }]}>
                  TODAY
                </Animated.Text>
              </View>
              {model.todaySub ? (
                <Text style={[s.todaySub, { color: t.textDim }]}>{model.todaySub}</Text>
              ) : null}
            </Animated.View>
          );
        }
        const passed = todayIdx >= 0 && i > todayIdx; // steps down as today travels up
        return (
          <Animated.View
            key={`${r.date}-${r.pos}`}
            style={[s.row, { height: PAST_H }, passed && { transform: [{ translateY: belowShift }] }]}
          >
            <Text style={[s.pos, { color: t.textDim }]}>{r.pos !== null ? `P${r.pos}` : '—'}</Text>
            <Text style={[s.time, { color: timeColor(r.tier, t) }]}>
              {r.time}
              {r.pb ? <Text style={{ color: colors.purple }}> ●</Text> : null}
            </Text>
            <Text style={[s.gap, { color: t.textDim }]}>{r.gap}</Text>
            <Text style={[s.date, { color: t.textDim }]}>
              {r.date}
              {r.ghost ? ' ○' : ''}
            </Text>
          </Animated.View>
        );
      })}
      {clippedBelow > 0 && <Text style={s.clip}>{`⋮ ${clippedBelow} more below`}</Text>}
    </View>
  );
}

const makeTowerStyles = (t: PaddockTheme) =>
  StyleSheet.create({
    tower: { alignSelf: 'stretch', marginBottom: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      paddingHorizontal: 6,
      height: PAST_H,
    },
    todayBlock: { alignSelf: 'stretch' },
    todayRow: {
      height: TODAY_ROW_H,
      backgroundColor: t.card,
      borderRadius: radius.btn,
      alignItems: 'center',
    },
    accentBar: {
      width: 4,
      alignSelf: 'stretch',
      marginVertical: 6,
      borderRadius: 2,
      backgroundColor: t.accent, // identity chrome — which row is YOU — never a tier
    },
    pos: { width: 40, fontSize: 15, fontWeight: '700', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
    posToday: { fontSize: 17, fontWeight: '800' },
    time: { width: 96, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] },
    timeToday: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5, width: 160 },
    gap: { flex: 1, fontSize: 15, textAlign: 'right', fontVariant: ['tabular-nums'] },
    date: { width: 96, fontSize: 13, textAlign: 'right' },
    dateToday: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    todaySub: { fontSize: 12, height: SUB_H, paddingLeft: 14, fontVariant: ['tabular-nums'] },
    clip: { color: colors.grey, fontSize: 11, paddingLeft: 6, paddingVertical: 2, letterSpacing: 1 },
    /* §3a.3 ceremony collapse: today's all-purple row alone, unranked. */
    cerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 14,
      backgroundColor: colors.purple,
      borderRadius: radius.card,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    cerLbl: { color: PURPLE_INK, fontSize: 17, fontWeight: '800', letterSpacing: 2 },
    cerTime: { color: PURPLE_INK, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
    cerToday: { color: PURPLE_INK, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginLeft: 'auto' },
  });
