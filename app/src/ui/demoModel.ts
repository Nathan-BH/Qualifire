/**
 * WP-O (DEMO tab modes, 2026-09-02): the demo's own pure, headless-testable
 * model. No React, no manifest import — this module is deliberately
 * self-contained so the demo behaves identically on `main` and on a virgin
 * build with zero archived rides.
 *
 * Why the demo owns its own "previous laps": on a virgin build `ghostsFor()`
 * is always `[]` (B-39, `store/seed.ts` under the `virgin` EAS profile), so
 * `tierFor`'s D-008 floor (`MIN_HISTORY` clean rides) is never cleared and
 * every sector renders 'neutral' — the demo would show no tier colours at
 * all. `DEMO_HISTORY` below pins six laps per sector (>= MIN_HISTORY) so the
 * one scripted lap in `DEMO_SECS` always shows all three verdict colours,
 * on every build, forever.
 */
import { tierFor, type UiTier } from './colourModel.ts';

export type DemoMode = 'first' | 'second';

/** The demo's own "previous laps" — six per sector, so tierFor()'s MIN_HISTORY
 * floor (5) is cleared on a virgin build with zero archived rides. Chosen so
 * one run of the scripted lap shows all three verdict colours. */
export const DEMO_HISTORY: readonly (readonly number[])[] = [
  [190, 195, 188, 200, 192, 197],   // S1: best 188, mean ~193.7
  [210, 205, 215, 208, 212, 206],   // S2: best 205, mean ~209.3
  [230, 225, 235, 228, 232, 226],   // S3: best 225, mean ~229.3
  [210, 205, 215, 208, 212, 206],   // S4: best 205, mean ~209.3
];

/** Today's scripted sector seconds — the existing literal, kept. */
export const DEMO_SECS: readonly number[] = [185, 207, 237, 207];
// → S1 purple (185 < 188), S2 green (207 < 209.3), S3 yellow (237 ≥ 229.3), S4 green.
// Lap 836 vs lap history [840, 830, 853, 844, 848, 835] → green.

/** Per-lap sums of DEMO_HISTORY (column-wise) — the lap's own comparison
 * window, used by demoTier(0, …). */
const DEMO_LAP_HISTORY: readonly number[] = DEMO_HISTORY[0].map((_, lapIdx) =>
  DEMO_HISTORY.reduce((sum, sector) => sum + sector[lapIdx], 0));

export interface DemoScript { secs: readonly number[]; gateAt: number[]; lap: number }

/** Today's fixed lap script (the old inline lines 45-47, lifted verbatim). */
export function buildDemoScript(secs: readonly number[] = DEMO_SECS): DemoScript {
  const gateAt: number[] = [0];
  secs.reduce((acc, v) => { gateAt.push(acc + v); return acc + v; }, 0);
  return { secs, gateAt, lap: secs.reduce((a, b) => a + b, 0) };
}

/** Tier for sector `i` (1-based, matching sectorColours' gate index) or the
 * lap (i = 0), judged against the demo's own pinned history. */
export function demoTier(i: number, value: number | null): UiTier {
  const history = i === 0 ? DEMO_LAP_HISTORY : DEMO_HISTORY[i - 1];
  return tierFor(value, history as number[]);
}

/** Gate-indexed colours for RouteMapView's `sectorColours` prop: index 0
 * null, index i = colour of sector i iff i <= gatesDone, else null. `paint`
 * maps a tier to its map-line colour (the screen passes `tierLineColour`
 * from `chips.tsx`; null = not-yet-earned, transparent on the map). */
export function demoSectorColours(
  script: DemoScript, gatesDone: number, paint: (tier: UiTier) => string | null,
): (string | null)[] {
  return [
    null,
    ...script.secs.map((v, idx) => {
      const i = idx + 1;
      return i <= gatesDone ? paint(demoTier(i, v)) : null;
    }),
  ];
}
