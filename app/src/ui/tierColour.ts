/**
 * WP-F: pure tier -> map-line-colour module, extracted from chips.tsx so a
 * headless-runnable `.ts` model (rideDetailModel.ts) can import the real
 * runtime value instead of hand-duplicating it. chips.tsx (a `.tsx` file
 * with real JSX) re-exports these two names so every existing `.tsx`
 * consumer keeps working with zero import-path changes.
 */
import type { Tier } from './chips.tsx';
import { colors } from './theme.ts';

/** An ordinary time — below the recent average. F1 yellow, the same yellow the
 * brand already uses, because in F1 yellow is the DEFAULT colour of a lap time,
 * not a warning (D-013: no failure styling, ever). */
export const YELLOW_TIER = colors.neutral;

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
