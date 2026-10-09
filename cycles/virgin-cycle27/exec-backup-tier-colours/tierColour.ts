/**
 * WP-F: pure tier -> map-line-colour module, extracted from chips.tsx so a
 * headless-runnable `.ts` model (rideDetailModel.ts) can import the real
 * runtime value instead of hand-duplicating it. chips.tsx (a `.tsx` file
 * with real JSX) re-exports these two names so every existing `.tsx`
 * consumer keeps working with zero import-path changes.
 * virgin-cycle22 03: also home of tierTextColour (text on a card) — see its doc comment.
 */
import type { Tier } from './chips.tsx';
import { colors, type PaddockTheme } from './theme.ts';

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

/** Night-theme purple for TEXT on a card. `colors.purple` (#9000C8) is the chip FILL / map-line
 * purple and reads 2.30:1 on the night card (#212127) — fine as a filled chip, too dark as 13 px
 * text. This tint is 5.02:1 on the card and 5.78:1 on the night race card. */
export const PURPLE_TEXT_NIGHT = '#C364FF';
/** Day-theme green for TEXT on a card: `colors.green` (#00D000) is 2.10:1 on white; this is 5.55:1
 * on the day card and 4.92:1 on the day race card (#F5F1E6). */
export const GREEN_TEXT_DAY = '#007A00';
/** Day-theme yellow for TEXT on a card: `colors.neutral` (#F5C542) is 1.62:1 on white, the theme's
 * own `accentText` (#B98A0A) only 3.13:1; this is 5.08:1 on the day card, 4.499:1 on the race card (just under AA; no text is drawn there). */
export const YELLOW_TEXT_DAY = '#8C6900';

/**
 * virgin-cycle22 03 (Nathan 2026-10-05): the colour a tier gives to TEXT drawn on a card — the big
 * lap time, a sector time, the "today" row of ON THIS WAY. ONE helper so the lap time and the sector
 * list can never disagree. Do NOT use `chipColors(tier, t).text` for text on a card: that palette is
 * for text drawn ON a chip of that tier — purple's `.text` is PURPLE_INK, the near-black ink for a
 * filled purple chip, which is unreadable (1.23:1) on the dark card (the 2026-10-05 SECTORS bug, the
 * text twin of the 2026-09-02 map-line bug above). And do NOT use `tierLineColour` for text: it is
 * the map-line palette, returns null without a verdict, and its yellow fails on a light card.
 *
 * Theme-aware (dark ground = `t.statusBar === 'light'`, the one PaddockTheme field that says which
 * ground the card is): the night card keeps the brand green/yellow and takes a lighter purple; the
 * day card keeps the brand purple and takes deeper green/yellow. Every value passes WCAG 4.5:1 on its
 * card (ridedetail_suite computes it). 'neutral' (no verdict yet) = `t.accentText` as the chips do;
 * 'est' / 'none' = `t.textDim` (dim, no verdict). Never null, never PURPLE_INK.
 */
export function tierTextColour(tier: Tier, t: PaddockTheme): string {
  const dark = t.statusBar === 'light';
  switch (tier) {
    case 'purple': return dark ? PURPLE_TEXT_NIGHT : colors.purple;
    case 'green': return dark ? colors.green : GREEN_TEXT_DAY;
    case 'yellow': return dark ? YELLOW_TIER : YELLOW_TEXT_DAY;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}
