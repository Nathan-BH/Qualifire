/**
 * Shared tier-chip language (LAYOUT §6: filled > outlined > flat, no red,
 * grey = no-data only). Extracted from the Preview tab so the REAL live
 * surface (RecordScreen, engine-fed) and the Preview demo render through the
 * same components — one visual code path, not a fake and a copy.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaddockTheme, colors, radius } from './theme';
import { useTheme } from './themeContext';

export type Tier = 'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est';

/** An ordinary time — below the recent average. F1 yellow, the same yellow the
 * brand already uses, because in F1 yellow is the DEFAULT colour of a lap time,
 * not a warning (D-013: no failure styling, ever). */
export const YELLOW_TIER = colors.neutral;

export const PURPLE_INK = '#120521';

/**
 * The colour a tier paints on a MAP LINE (sector-coloured trail) — the same
 * colour the sector legend block shows for that tier: purple's chip FILL,
 * green's chip BORDER, yellow's flat TEXT. This is the single source of truth
 * for every sector-coloured trail (ResultScreen, DemoScreen, any future
 * live/race screen) — do not build a local map, and do NOT use
 * `chipColors(tier, t).text`: purple's `.text` is PURPLE_INK, the near-black
 * ink for text drawn ON a purple chip, which paints a purple sector's line
 * almost black (the 2026-09-02 DEMO-tab bug).
 *
 * null = no earned colour: the span paints transparent and the yellow base
 * route line shows through (RouteMapView's "not yet run" fallback).
 * 'none' / 'neutral' / 'est' are deliberately null — a verdict-less sector is
 * never given a scored colour on the map.
 */
export function tierLineColour(tier: Tier): string | null {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return YELLOW_TIER;
    default: return null;
  }
}

export interface ChipPalette {
  bg: string;
  border: string;
  text: string;
  dashed?: boolean;
}

export function chipColors(tier: Tier, t: PaddockTheme): ChipPalette {
  switch (tier) {
    case 'purple':
      return { bg: colors.purple, border: colors.purple, text: PURPLE_INK }; // map lines: use tierLineColour(), never .text
    case 'green':
      return { bg: 'transparent', border: colors.green, text: colors.green };
    case 'neutral':
      return { bg: 'transparent', border: 'transparent', text: t.accentText };
    case 'yellow':
      return { bg: 'transparent', border: 'transparent', text: YELLOW_TIER };
    // 'neutral' above means "no verdict yet" — deliberately NOT yellow, so a
    // route with no history never looks like a scored ordinary lap.
    case 'est':
      return { bg: 'transparent', border: colors.grey, text: colors.grey, dashed: true };
    default:
      return { bg: 'transparent', border: 'transparent', text: colors.grey };
  }
}

/** The big last-completed-sector chip (LAYOUT §2): frozen at the gate,
 * never ticks. `waiting` = between start and gate 1 — flat grey, no numbers. */
export function LiveBigChip(props: {
  tier: Tier;
  waiting?: boolean;
  lbl: string;
  glyph: string;
  time: string;
  delta: string;
  pb?: boolean;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  const c = chipColors(props.tier, t);
  const text = props.waiting ? colors.grey : c.text;
  return (
    <View
      style={[
        s.liveBig,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderStyle: c.dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <View style={s.liveRow1}>
        <Text style={[s.slbl, { color: text }]}>
          {props.lbl}
          {props.glyph ? <Text style={{ fontWeight: '400' }}> {props.glyph}</Text> : null}
        </Text>
        <Text style={[s.sdelta, { color: text }]}>{props.delta}</Text>
      </View>
      <Text style={[s.stime, { color: text }]}>
        {props.time}
        {props.pb ? (
          <Text style={{ color: props.tier === 'purple' ? PURPLE_INK : colors.purple }}> ●</Text>
        ) : null}
      </Text>
    </View>
  );
}

/** The lap chip at the final-gate handover (LAYOUT §2a): below the sector
 * chip, same tier language, appears once ~1.1 s after the gate. */
export function LiveLapChip(props: { tier: Tier; time: string; delta: string }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  const c = chipColors(props.tier, t);
  return (
    <View
      style={[
        s.liveLap,
        { backgroundColor: c.bg, borderColor: c.border, borderStyle: c.dashed ? 'dashed' : 'solid' },
      ]}
    >
      <Text style={[s.llbl, { color: c.text }]}>LAP</Text>
      <Text style={[s.lt, { color: c.text }]}>{props.time}</Text>
      <Text style={[s.ld, { color: c.text }]}>{props.delta}</Text>
    </View>
  );
}

/** One sector block of the live row (LAYOUT §2 rule 4): completed blocks in
 * tier style with their frozen final time (m:ss — the decimal lives in the
 * override and on the board); current = accent border only, no numbers;
 * untraversed = empty grey. `current` is the only permitted position cue. */
export function StripSlot(props: { tier: Tier; label: string; time?: string; current?: boolean }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  const c = chipColors(props.tier, t);
  const empty = props.tier === 'none';
  return (
    <View
      style={[
        s.slot,
        {
          backgroundColor: c.bg,
          borderColor: props.current ? t.accent : empty ? t.race.border : c.border,
          borderStyle: c.dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text style={[s.slotText, { color: empty ? t.textDim : c.text }]}>{props.label}</Text>
      {props.time ? <Text style={[s.slotTime, { color: c.text }]}>{props.time}</Text> : null}
    </View>
  );
}

/** Static tower-position chip at the final-gate handover (LAYOUT §2a beat 2,
 * Nathan 2026-08-15): position is a FACT — ink, never tier-coloured, no
 * animation, no earcon. Renders nothing upstream when no tower source exists
 * (B-28 UNBUILT on the real screen). */
export function PosChip({ label }: { label: string }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  return (
    <View style={[s.posChip, { borderColor: t.race.border, backgroundColor: t.race.card }]}>
      <Text style={[s.posChipText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const makeChipStyles = (t: PaddockTheme) =>
  StyleSheet.create({
    liveBig: {
      alignSelf: 'stretch',
      borderRadius: 18,
      borderWidth: 2,
      padding: 22,
      minHeight: 180,
      justifyContent: 'center',
      gap: 2,
    },
    liveRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    slbl: { fontSize: 34, fontWeight: '800' },
    sdelta: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
    stime: {
      fontSize: 64,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
    },
    liveLap: {
      alignSelf: 'stretch',
      marginTop: 14,
      borderRadius: radius.card,
      borderWidth: 2,
      paddingVertical: 12,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    llbl: { fontSize: 26, fontWeight: '800', letterSpacing: 2 },
    lt: { fontSize: 42, fontWeight: '800', fontVariant: ['tabular-nums'] },
    ld: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
    slot: {
      width: 68,
      height: 56,
      borderRadius: radius.btn,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    slotText: { fontSize: 14, fontWeight: '700' },
    slotTime: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
    posChip: {
      borderWidth: 2,
      borderRadius: radius.btn,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posChipText: { fontSize: 30, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  });
