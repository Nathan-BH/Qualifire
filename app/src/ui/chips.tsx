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
import { YELLOW_TIER, tierLineColour } from './tierColour';

// F1-style sector bar thickness (Nathan: a bit bigger than the first
// sketch's 4px) -- tune further on device if it still reads thin.
const STRIP_BAR_HEIGHT = 6;

export type Tier = 'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est';

/** YELLOW_TIER / tierLineColour: moved to tierColour.ts (a pure `.ts` module
 * headless tests can load) and re-exported here so every existing `.tsx`
 * consumer keeps importing them from './chips' with zero changes. See
 * tierColour.ts for the doc comment on what these mean. */
export { YELLOW_TIER, tierLineColour };

export const PURPLE_INK = '#120521';

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

/** One sector of the live row (LAYOUT §2 rule 4): sector label above a thin
 * bar (STRIP_BAR_HEIGHT). Both are dim grey until the sector earns a real tier
 * (purple/green/yellow, via tierLineColour -- never chipColors().border,
 * which is 'transparent' for yellow); `'est'` and `'neutral'` (no verdict
 * yet) both stay grey too. No time text — the decimal lives in the override
 * and on the board. The current sector gets no cue at all (identical to an
 * unreached one): the context line above the clock already names it, so
 * `current` is accepted for the caller's sake but does not affect styling. */
export function StripSlot(props: { tier: Tier; label: string; time?: string; current?: boolean }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  // tierLineColour (not chipColors().border): yellow's .border is
  // 'transparent' (LAYOUT §6 filled > outlined > FLAT) -- .border only
  // carries the hue for purple/green. tierLineColour returns null for
  // 'none' / 'neutral' / 'est' (no earned verdict -> no colour), which
  // covers all six Tier values correctly, unlike a chipColors()-derived
  // check (2026-09-16 Inspect finding, cycle9: yellow/neutral rendered
  // fully transparent and vanished from the strip under the first version
  // of this logic).
  const line = tierLineColour(props.tier);
  const barColour = line ?? t.race.border;
  const labelColour = line ?? t.textDim;
  return (
    <View style={s.slot}>
      <Text style={[s.slotText, { color: labelColour }]}>{props.label}</Text>
      <View style={[s.slotBar, { backgroundColor: barColour }]} />
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
    slot: { flex: 1, alignItems: 'center', gap: 4 },
    slotBar: { alignSelf: 'stretch', height: STRIP_BAR_HEIGHT, borderRadius: STRIP_BAR_HEIGHT / 2 },
    slotText: { fontSize: 14, fontWeight: '700' },
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
