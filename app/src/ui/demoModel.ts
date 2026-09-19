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
 * `DEMO_HISTORY` below pins nine laps per sector (virgin-cycle11 brief B,
 * R2/R3) — MIN_HISTORY itself only needs 1 since D-045 ruling 1, but the
 * demo isn't chasing the floor, it is chasing VARIETY: green needs history
 * with a mean above its best (n>=2), and the last DEMO_PRIOR_LAPS[mode]
 * columns are what makes SECOND RIDE (1 prior) honestly purple/yellow only
 * and TENTH RIDE (9 priors, the whole ranking pool) show all three verdict
 * colours on the scripted lap in `DEMO_SECS`, on every build, forever.
 */
import { WINDOW_PREV, tierFor, type UiTier } from './colourModel.ts';
import type { LiveViewModel } from './liveView.tsx';   // type-only, house precedent towerModel.ts:22-23
import type { Tier } from './chips.tsx';
import type { RouteNames } from '../store/routeCreation.ts';  // type-only
import type { RideResult } from '../store/types.ts';   // type-only
import { buildRankingReveal, type RankingReveal } from './rankingRevealModel.ts';
import { DEMO_WAY_ID } from './demoWayFixture.ts';
// Re-exported so DemoScreen.tsx never has to import from '../store/**' at all
// (Rules: DemoScreen must not import anything from app/src/store/**).
export type { RouteNames };

export type DemoMode = 'first' | 'second' | 'tenth';

/** Where the DEMO tab is: the chooser, the full-screen scripted ride, or the post-STOP
 *  screen. State within the DEMO tab — never a RecordPhase. */
export type DemoPhase = 'idle' | 'running' | 'ending';

/** The demo's own "previous laps" — nine per sector (virgin-cycle11 brief B, R3):
 * the last WINDOW_PREV columns are exactly the real app's ranking pool, so TENTH
 * RIDE's board is the whole pool, never a demo-only fiction. MIN_HISTORY (1,
 * since D-045 ruling 1 / NW-1) needs only one to clear the floor; nine is chosen
 * so the pinned history has real spread (best < mean), which is what lets one
 * run of the scripted lap show all three verdict colours when judged against
 * the last WINDOW_PREV of them (TENTH RIDE). */
export const DEMO_HISTORY: readonly (readonly number[])[] = [
  [190, 195, 188, 200, 192, 197, 194, 198, 191],   // S1: best 188, mean ~193.9
  [210, 205, 215, 208, 212, 206, 211, 216, 209],   // S2: best 205, mean ~210.2
  [230, 225, 235, 228, 232, 226, 229, 238, 233],   // S3: best 225, mean ~230.7
  [210, 205, 215, 208, 212, 206, 211, 213, 209],   // S4: best 205, mean ~209.9
];

/** Today's scripted sector seconds — the existing literal, kept. */
export const DEMO_SECS: readonly number[] = [185, 207, 237, 207];
// Against the last WINDOW_PREV (9) columns (TENTH RIDE):
// → S1 purple (185 < 188), S2 green (207 < 210.2), S3 yellow (237 ≥ 230.7), S4 green.
// Lap 836 vs the last 9 lap sums [840, 830, 853, 844, 848, 835, 845, 865, 842] → green.

/** R2: how many of the pinned laps a mode "has ridden before" — the LAST n columns of
 *  DEMO_HISTORY, mirroring ghostsFor's slice(-WINDOW_PREV). first: 0 (ride 1 races nobody
 *  and gets no reveal), second: 1, tenth: WINDOW_PREV — so TENTH RIDE's board is exactly
 *  the real pool, WINDOW_N rows (Nathan, item 1: "we always stay with 10 rides"). */
export const DEMO_PRIOR_LAPS: Readonly<Record<DemoMode, number>> = { first: 0, second: 1, tenth: WINDOW_PREV };

/** Days before `nowMs` each prior lap (oldest first) was ridden — a plausible fortnight. */
export const DEMO_PRIOR_DAYS_AGO: readonly number[] = [16, 14, 13, 9, 8, 7, 6, 2, 1];

export const DEMO_TODAY_RIDE_ID = 'demo:today';

/** The last `priorLaps` columns of DEMO_HISTORY, per sector. 0 → four empty rows. */
export function demoHistoryFor(priorLaps: number): readonly (readonly number[])[] {
  return DEMO_HISTORY.map((sector) => (priorLaps <= 0 ? [] : sector.slice(sector.length - priorLaps)));
}

/** Per-lap sums of those columns (the lap's own comparison window), used by demoTier(0, …). */
export function demoPriorLapSeconds(priorLaps: number): number[] {
  const cols = demoHistoryFor(priorLaps);
  const n = cols[0]?.length ?? 0;
  return Array.from({ length: n }, (_, lapIdx) => cols.reduce((sum, sector) => sum + sector[lapIdx], 0));
}

export interface DemoScript { secs: readonly number[]; gateAt: number[]; lap: number }

/** Today's fixed lap script (the old inline lines 45-47, lifted verbatim). */
export function buildDemoScript(secs: readonly number[] = DEMO_SECS): DemoScript {
  const gateAt: number[] = [0];
  secs.reduce((acc, v) => { gateAt.push(acc + v); return acc + v; }, 0);
  return { secs, gateAt, lap: secs.reduce((a, b) => a + b, 0) };
}

/** Tier for sector `i` (1-based, matching sectorColours' gate index) or the
 * lap (i = 0), judged against the last `priorLaps` of the demo's own pinned
 * history (R2) — default is "against all of them" (every existing call/test
 * meaning kept). */
export function demoTier(i: number, value: number | null, priorLaps: number = DEMO_HISTORY[0].length): UiTier {
  const history = i === 0 ? demoPriorLapSeconds(priorLaps) : demoHistoryFor(priorLaps)[i - 1];
  return tierFor(value, history as number[]);
}

/** Gate-indexed colours for RouteMapView's `sectorColours` prop: index 0
 * null, index i = colour of sector i iff i <= gatesDone, else null. `paint`
 * maps a tier to its map-line colour (the screen passes `tierLineColour`
 * from `chips.tsx`; null = not-yet-earned, transparent on the map). */
export function demoSectorColours(
  script: DemoScript, gatesDone: number, paint: (tier: UiTier) => string | null,
  priorLaps: number = DEMO_HISTORY[0].length,
): (string | null)[] {
  return [
    null,
    ...script.secs.map((v, idx) => {
      const i = idx + 1;
      return i <= gatesDone ? paint(demoTier(i, v, priorLaps)) : null;
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

/** R1: the last `priorLaps` pinned laps as RideResults — the shape buildTowerModel reads
 *  (lap, startedAtMs, source). Oldest first; rideId 'demo:prior-<k>' with k the 1-based
 *  column index in DEMO_HISTORY, so brief C's SelfTracks can share the ids. */
export function demoPriorResults(priorLaps: number, nowMs: number): RideResult[] {
  const cols = demoHistoryFor(priorLaps);
  const laps = demoPriorLapSeconds(priorLaps);
  const startCol = DEMO_HISTORY[0].length - priorLaps; // 0-based index of the first included column
  return laps.map((lapS, k) => ({
    kind: 'rideResult',
    schemaVersion: 2,
    rideId: `demo:prior-${startCol + k + 1}`,
    startedAtMs: nowMs - DEMO_PRIOR_DAYS_AGO[startCol + k] * 86_400_000,
    wayId: DEMO_WAY_ID,
    source: 'app',
    lap: { rawS: lapS, movingS: lapS, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 },
  }));
}

/** R1/R4: the real reveal builder over the synthetic window. null for 'first'. */
export function buildDemoReveal(
  mode: DemoMode, nowMs: number, script: DemoScript = buildDemoScript(),
): RankingReveal | null {
  const priorLaps = DEMO_PRIOR_LAPS[mode];
  const priorSeconds = demoPriorLapSeconds(priorLaps);
  const allTimeBest = priorSeconds.length > 0 ? Math.min(...priorSeconds, script.lap) : script.lap;
  return buildRankingReveal(
    { track: DEMO_WAY_ID, lap: { rawS: script.lap, stoppedS: 0, movingS: script.lap, estimated: false } },
    DEMO_TODAY_RIDE_ID, nowMs, demoPriorResults(priorLaps, nowMs), allTimeBest,
  );
}

/** R6: the known route SECOND/TENTH RIDE are on — fixed text on the WP-G card by that
 *  variant's own design (the route exists). Not the item-6 pre-fill: FIRST RIDE's inputs stay blank. */
export const DEMO_ROUTE_START = 'Home';
export const DEMO_ROUTE_END = 'Work';
export const DEMO_ROUTE_LABEL = `${DEMO_ROUTE_START} → ${DEMO_ROUTE_END}`;
/** Spec chips for show — a virgin catalog has no vocabulary; the real card would show none. */
export const DEMO_SPEC_VOCABULARY: readonly string[] = ['Dry', 'Wet', 'Fast'];
/** The confirmation line after the WP-G card's ADD WAY. Mirrors wayLabelIn's `base · spec · spec`. */
export function demoAddedWayLine(routeLabel: string, specs: readonly string[] | undefined): string {
  const s = (specs ?? []).map((x) => x.trim()).filter((x) => x.length > 0);
  return `${routeLabel}${s.length ? ` · ${s.join(' · ')}` : ''} added as a new way · demo only, nothing saved`;
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
  priorLaps: number = DEMO_HISTORY[0].length,
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
      tier: i < gatesDone ? (demoTier(i + 1, v, priorLaps) as Tier) : ('none' as Tier),
      label: `S${i + 1}`,
      time: i < gatesDone ? demoFmtMS(v) : undefined,
      current: i === gatesDone,
    })),
  };
}
