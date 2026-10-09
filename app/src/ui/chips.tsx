/**
 * Shared tier palette + the strip slot (LAYOUT §6: filled > outlined > flat, no
 * red, grey = no-data only). The big chips are gone since virgin-cycle22 04 — a
 * flash is the clock's digits in tierTextColour (liveView.tsx). Extracted from the Preview tab so the REAL live
 * surface (RecordScreen, engine-fed) and the Preview demo render through the
 * same components — one visual code path, not a fake and a copy.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PaddockTheme, colors } from './theme';
import { useTheme } from './themeContext';
import { YELLOW_TIER, tierLineColour } from './tierColour';

// F1-style sector bar thickness (Nathan: a bit bigger than the first
// sketch's 4px) -- tune further on device if it still reads thin.
const STRIP_BAR_HEIGHT = 6;

// virgin-cycle27 brief 05 (Nathan 2026-10-08): the CURRENT sector's slot breathes —
// a slow opacity cycle, never below BREATHE_FLOOR so the label stays legible in
// daylight; off (full opacity, still) when the OS reduce-motion setting is on.
export const BREATHE_FLOOR = 0.55;
export const BREATHE_PERIOD_MS = 2400;

export type Tier = 'none' | 'neutral' | 'yellow' | 'green' | 'purple' | 'est';

/** YELLOW_TIER / tierLineColour: moved to tierColour.ts (a pure `.ts` module
 * headless tests can load) and re-exported here so every existing `.tsx`
 * consumer keeps importing them from './chips' with zero changes. See
 * tierColour.ts for the doc comment on what these mean. */
export { YELLOW_TIER, tierLineColour };

/** Ink for text ON a filled purple chip / the purple ceremony row (tower.tsx). virgin-cycle27 02
 * FINAL (Nathan 2026-10-09): the final purple #7B3FA8 is dark, so the ink is WHITE (6.73:1; the old
 * near-black #120521 would be 2.92:1). Same in both themes — the chip fill is theme-less. Never
 * use this for text on a card (tierTextColour). */
export const PURPLE_INK = colors.white;

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
      return { bg: 'transparent', border: 'transparent', text: YELLOW_TIER }; // virgin-cycle27 02 FINAL: brand yellow, not t.accentText
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
 * and on the board. virgin-cycle27 05: the current sector's label and bar BREATHE
 * (opacity 1 -> BREATHE_FLOOR -> 1 over BREATHE_PERIOD_MS, looped, native driver) — the only
 * cue that a sector is live; the context line no longer names it. Reduced motion: no
 * animation, full opacity. */
export function StripSlot(props: { tier: Tier; label: string; time?: string; current?: boolean }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  const breathe = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduceMotion(v); })
      .catch(() => { /* default: animate */ });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!props.current || reduceMotion) {
      breathe.stopAnimation();
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: BREATHE_FLOOR, duration: BREATHE_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: BREATHE_PERIOD_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); breathe.setValue(1); };
  }, [props.current, reduceMotion, breathe]);
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
    <Animated.View style={[s.slot, { opacity: breathe }]}>
      <Text style={[s.slotText, { color: labelColour }]}>{props.label}</Text>
      <View style={[s.slotBar, { backgroundColor: barColour }]} />
    </Animated.View>
  );
}

const makeChipStyles = (t: PaddockTheme) =>
  StyleSheet.create({
    slot: { flex: 1, alignItems: 'center', gap: 4 },
    slotBar: { alignSelf: 'stretch', height: STRIP_BAR_HEIGHT, borderRadius: STRIP_BAR_HEIGHT / 2 },
    slotText: { fontSize: 14, fontWeight: '700' },
  });
