/**
 * Shared tier palette + the strip slot (LAYOUT §6: filled > outlined > flat, no
 * red, grey = no-data only). The big chips are gone since virgin-cycle22 04 — a
 * flash is the clock's digits in tierTextColour (liveView.tsx). Extracted from the Preview tab so the REAL live
 * surface (RecordScreen, engine-fed) and the Preview demo render through the
 * same components — one visual code path, not a fake and a copy.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaddockTheme, colors } from './theme';
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

const makeChipStyles = (t: PaddockTheme) =>
  StyleSheet.create({
    slot: { flex: 1, alignItems: 'center', gap: 4 },
    slotBar: { alignSelf: 'stretch', height: STRIP_BAR_HEIGHT, borderRadius: STRIP_BAR_HEIGHT / 2 },
    slotText: { fontSize: 14, fontWeight: '700' },
  });
