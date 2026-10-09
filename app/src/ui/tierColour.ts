/**
 * WP-F: pure tier -> map-line-colour module, extracted from chips.tsx so a
 * headless-runnable `.ts` model (rideDetailModel.ts) can import the real
 * runtime value instead of hand-duplicating it. chips.tsx (a `.tsx` file
 * with real JSX) re-exports these two names so every existing `.tsx`
 * consumer keeps working with zero import-path changes.
 * virgin-cycle22 03: also home of tierTextColour (text on a card) — see its doc comment.
 */
import type { Tier } from './chips.tsx';
import { tierHex, type PaddockTheme } from './theme.ts';

/** The yellow TIER (an ordinary time, below the recent average). virgin-cycle27 02 FINAL
 * (Nathan 2026-10-09): the BRAND yellow again (tierHex.yellow === colors.neutral) — in F1
 * yellow is the DEFAULT colour of a lap time, not a warning (D-013). */
export const YELLOW_TIER = tierHex.yellow;

/**
 * The colour a tier paints on a MAP LINE (sector-coloured trail) — the same
 * colour the sector legend block shows for that tier: purple's chip FILL,
 * green's chip BORDER, yellow's flat TEXT. This is the single source of truth
 * for every sector-coloured trail (ResultScreen, DemoScreen, any future
 * live/race screen) — do not build a local map, and do NOT use
 * `chipColors(tier, t).text`: purple's `.text` is PURPLE_INK, the white
 * ink for text drawn ON a purple chip, which paints a purple sector's line
 * almost black (the 2026-09-02 DEMO-tab bug).
 *
 * null = no earned colour: the span paints transparent and the yellow base
 * route line shows through (RouteMapView's "not yet run" fallback).
 * 'none' / 'neutral' / 'est' are deliberately null — a verdict-less sector is
 * never given a scored colour on the map.
 * virgin-cycle27 02: the three hexes are tierHex (theme.ts), shared with tierTextColour.
 */
export function tierLineColour(tier: Tier): string | null {
  switch (tier) {
    case 'purple': return tierHex.purple;
    case 'green': return tierHex.green;
    case 'yellow': return tierHex.yellow;
    default: return null;
  }
}

/** virgin-cycle27 02: kept as named exports for the tests; all three read the one palette (no per-theme values since the FINAL ruling). */
export const PURPLE_TEXT_NIGHT = tierHex.purple;
export const GREEN_TEXT_DAY = tierHex.green;
export const YELLOW_TEXT_DAY = tierHex.yellow;

/**
 * virgin-cycle22 03 (Nathan 2026-10-05): the colour a tier gives to TEXT drawn on a card — the big
 * lap time, a sector time, the "today" row of ON THIS WAY. ONE helper so the lap time and the sector
 * list can never disagree. Do NOT use `chipColors(tier, t).text` for text on a card: that palette is
 * for text drawn ON a chip of that tier — purple's `.text` is PURPLE_INK, the white ink for a
 * filled purple chip, which is unreadable (1.23:1) on the dark card (the 2026-10-05 SECTORS bug, the
 * text twin of the 2026-09-02 map-line bug above). And do NOT use `tierLineColour` for text: it is
 * the map-line palette, returns null without a verdict.
 *
 * virgin-cycle27 02 FINAL (Nathan 2026-10-09): the same three hexes as the map line (tierHex) in BOTH themes — one palette, no night table; the low night contrast is an accepted on-device trial.
 * Contrast is computed in ridedetail_suite. 'neutral' (no verdict yet, e.g. the founding/reference ride) = tierHex.yellow, same as 'yellow' and the chips;
 * 'est' / 'none' = `t.textDim` (dim, no verdict). Never null, never PURPLE_INK.
 */
export function tierTextColour(tier: Tier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple': return tierHex.purple;
    case 'green': return tierHex.green;
    case 'yellow': return tierHex.yellow;
    case 'neutral': return tierHex.yellow; // brand yellow, both themes (Nathan 2026-10-09); NOT t.accentText (daylight #B98A0A rejected)
    default: return t.textDim;
  }
}
