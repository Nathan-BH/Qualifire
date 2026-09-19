/**
 * WP-O (DEMO tab modes, 2026-09-02): the demo's own pure, headless-testable
 * model. No React, no manifest import — this module is deliberately
 * self-contained so the demo behaves identically on `main` and on a virgin
 * build with zero archived rides.
 *
 * Why the demo owns its own "previous laps": on a virgin build `ghostsFor()`
 * is always `[]` (B-39, `store/seed.ts` under the `virgin` EAS profile), so
 * without a pinned history every sector would render 'neutral' (n=0, the
 * same honest floor a real way's reference ride gets — NW-1, 2026-09-08).
 * `DEMO_HISTORY` below pins six laps per sector — MIN_HISTORY itself only
 * needs 1 since D-045 ruling 1, but the demo isn't chasing the floor, it is
 * chasing VARIETY: green needs history with a mean above its best (n>=2),
 * and the six pinned values below are what makes the one scripted lap in
 * `DEMO_SECS` show all three verdict colours at once, on every build,
 * forever.
 */
import { tierFor, type UiTier } from './colourModel.ts';
import type { LiveViewModel } from './liveView.tsx';   // type-only, house precedent towerModel.ts:22-23
import type { Tier } from './chips.tsx';
import type { RouteNames } from '../store/routeCreation.ts';  // type-only
// Re-exported so DemoScreen.tsx never has to import from '../store/**' at all
// (Rules: DemoScreen must not import anything from app/src/store/**).
export type { RouteNames };

export type DemoMode = 'first' | 'second';

/** Where the DEMO tab is: the chooser, the full-screen scripted ride, or the post-STOP
 *  screen. State within the DEMO tab — never a RecordPhase. */
export type DemoPhase = 'idle' | 'running' | 'ending';

/** The demo's own "previous laps" — six per sector. MIN_HISTORY (1, since
 * D-045 ruling 1 / NW-1) needs only one to clear the floor; six is chosen
 * instead so the pinned history has real spread (best < mean), which is
 * what lets one run of the scripted lap show all three verdict colours. */
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

/** R3: simulated seconds the clock keeps running past the lap before the run auto-STOPs
 *  (~2.4 real s at RATE 25). Long enough to read the neutral lap chip; brief C also needs
 *  every slower self to reach its finish inside it. */
export const DEMO_ROLL_OUT_S = 60;
/** sim second at which the run auto-STOPs (R3). */
export function demoRunEndS(script: DemoScript): number { return script.lap + DEMO_ROLL_OUT_S; }

/** R4: what the STOP button (and hardware back) does. */
export type DemoStopOutcome = 'skip' | 'ending';
export function demoStopOutcome(gatesDone: number, sectorCount: number = DEMO_SECS.length): DemoStopOutcome {
  return gatesDone >= sectorCount ? 'ending' : 'skip';
}

/** R7: theatre timings for the fake save. */
export const DEMO_FAKE_SAVE_MS = 600;
export const DEMO_SAVED_HOLD_MS = 1800;
export function demoSavedLine(names: RouteNames): string {
  return `${names.start.trim()} → ${names.end.trim()} created · demo only, nothing saved`;
}

/** m:ss — lifted verbatim from DemoScreen.tsx's local fmtMS (Task 3 deletes that copy). */
export function demoFmtMS(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

/**
 * The hand-built LiveViewModel the demo feeds to LiveSectorPane — the same pane the Record
 * screen draws, so what the demo shows IS what the rider sees. R5: the lap chip is
 * 'neutral' once the lap lands (cycle11 R1 — the tier is the rank in disguise and is
 * revealed after STOP by the tower, brief B); sectors keep their tiers; posChip null.
 * `nowMs` anchors the frozen timebase (Date.now() on the screen; fixed in tests).
 * `livePos` is brief C's; default null renders nothing.
 */
export function demoLiveViewModel(
  script: DemoScript, clockS: number, nowMs: number, livePos: string | null = null,
): LiveViewModel {
  const gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length;
  return {
    clock: { anchorRealMs: nowMs, anchorClockMs: clockS * 1000, rate: 1, running: false },
    contextLabel: gatesDone < 4 ? `S${gatesDone + 1}` : '',
    flash: null,
    flashKey: 0,
    lap: gatesDone >= 4
      ? { tier: 'neutral' as Tier, time: demoFmtMS(script.lap), delta: '' }
      : null,
    posChip: null,
    livePos,
    strip: script.secs.map((v, i) => ({
      tier: i < gatesDone ? (demoTier(i + 1, v) as Tier) : ('none' as Tier),
      label: `S${i + 1}`,
      time: i < gatesDone ? demoFmtMS(v) : undefined,
      current: i === gatesDone,
    })),
  };
}
