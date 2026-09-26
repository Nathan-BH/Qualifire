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
 *
 * virgin-cycle14 brief 08 (Nathan #11): the same pinned laps also feed the RESULTS
 * scatterplot at the end of every demo ride — demoPlotResults / demoPlotPosLabel /
 * demoPlotCaption hand the real ResultsPlot the store's own shapes, nothing stored.
 */
import { WINDOW_PREV, tierFor, type UiTier } from './colourModel.ts';
import type { LiveViewModel } from './liveView.tsx';   // type-only, house precedent towerModel.ts:22-23
import type { Tier } from './chips.tsx';
import type { RouteNames } from '../store/routeCreation.ts';  // type-only
import type { RideResult } from '../store/types.ts';   // type-only
import { buildRankingReveal, type RankingReveal } from './rankingRevealModel.ts';
import type { SelfTrack } from './selfRaceModel.ts';
import { positionAtTime, type WayAsset } from './wayMapMath.ts';
import { DEMO_WAY_ASSET, DEMO_WAY_ID } from './demoWayFixture.ts';
import type { RefLine } from '../../core/src/index.ts';
import { buildRefFromRideFixes, type RefFixInput } from '../live/userRefs.ts';
import { seedGateChainages } from '../store/gateSeeding.ts';   // pure, import-free (brief D R5)
import { buildHistoryBoard, windowCaption } from './resultsListModel.ts';   // pure over a results array (brief 08)
import { plotWindow } from './resultsPlotModel.ts';                          // the real plot's own window rule (brief 08)
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

/** Brief D R2: the lap the dot rode — the START→FINISH slice of the fixture path — as
 *  RefFixInputs with synthetic 1 Hz timestamps. The timestamps only feed the stationary-run
 *  collapse; consecutive vertices are tens of metres apart, so nothing collapses. */
export function demoRefFixes(asset: WayAsset = DEMO_WAY_ASSET, startMs = 0): RefFixInput[] {
  const idx = asset.gateIdx;
  const path = asset.path;
  if (!idx || !path || idx.length < 2 || path.length <= idx[idx.length - 1]) return [];
  return path.slice(idx[0], idx[idx.length - 1] + 1).map(([lat, lon], i) => ({
    lat, lon, tUnixMs: startMs + i * 1000,
  }));
}

/** What the demo's GateAdjustCard needs — the store's GateAdjustDraft minus the real wayId
 *  (the demo has no way). */
export interface DemoGateAdjustDraft { ref: RefLine; refLengthM: number; chainageM: number[] }

/** Brief D R2/R3: the real reference-line builder over the fixture's lap, then the real gate
 *  seeder over it. null only if the builder refuses (< 2 vertices / < MIN_TRACK_LENGTH_M —
 *  impossible with the shipped fixture; the screen then falls back to the line at once). */
export function demoGateAdjustDraft(startMs: number, asset: WayAsset = DEMO_WAY_ASSET): DemoGateAdjustDraft | null {
  const built = buildRefFromRideFixes(demoRefFixes(asset, startMs));
  if (built === null) return null;
  return {
    ref: built.ref,
    refLengthM: built.ref.length,
    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),
  };
}

/** Brief D R4: what happened on the gate card. */
export type DemoGatesOutcome = 'kept' | 'adjusted';
export function demoSavedLine(names: RouteNames, gates: DemoGatesOutcome | null = null): string {
  const g = gates === null ? '' : gates === 'kept' ? 'gates kept · ' : 'gates adjusted · ';
  return `${names.start.trim()} → ${names.end.trim()} created · ${g}demo only, nothing saved`;
}

/** brief C, R2: sim-seconds between synthetic self fixes — the loader's DECIMATE_MIN_GAP_MS. */
export const DEMO_SELF_FIX_STEP_S = 2;

/** Shared column→identity mapping between demoPriorResults and demoSelfTracks (R2's
 *  "reuse the same column→id/startedAtMs mapping"): for each of the last `priorLaps`
 *  columns of DEMO_HISTORY (oldest first), its 1-based column index, rideId, startedAtMs
 *  and lapS. */
function demoPriorColumns(
  priorLaps: number, nowMs: number,
): { col: number; rideId: string; startedAtMs: number; lapS: number }[] {
  const laps = demoPriorLapSeconds(priorLaps);
  const startCol = DEMO_HISTORY[0].length - priorLaps; // 0-based index of the first included column
  return laps.map((lapS, k) => {
    const col = startCol + k + 1; // 1-based DEMO_HISTORY column index
    return {
      col,
      rideId: `demo:prior-${col}`,
      startedAtMs: nowMs - DEMO_PRIOR_DAYS_AGO[startCol + k] * 86_400_000,
      lapS,
    };
  });
}

/** R1: the last `priorLaps` pinned laps as RideResults — the shape buildTowerModel reads
 *  (lap, startedAtMs, source). Oldest first; rideId 'demo:prior-<k>' with k the 1-based
 *  column index in DEMO_HISTORY, so brief C's SelfTracks can share the ids. */
export function demoPriorResults(priorLaps: number, nowMs: number): RideResult[] {
  return demoPriorColumns(priorLaps, nowMs).map(({ rideId, startedAtMs, lapS }) => ({
    kind: 'rideResult',
    schemaVersion: 2,
    rideId,
    startedAtMs,
    wayId: DEMO_WAY_ID,
    source: 'app',
    lap: { rawS: lapS, movingS: lapS, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 },
  }));
}

/** brief C, R5: chainage in SECTOR units, 0 at START, 4 at FINISH: k + fraction of sector
 *  k, linear in time — mirrors positionAtTime's own k/f selection exactly (same bound,
 *  same span/f arithmetic), so two riders with the same demoChainage are at the same place
 *  on the path. Clamped to [0, gateAt.length - 1]. */
export function demoChainage(gateAt: readonly number[], tSec: number): number {
  const maxK = gateAt.length - 1;
  let k = 0;
  while (k < maxK - 1 && tSec >= gateAt[k + 1]) k++;
  const span = Math.max(gateAt[k + 1] - gateAt[k], 1e-6);
  const f = Math.max(0, Math.min(1, (tSec - gateAt[k]) / span));
  return k + f;
}

/** brief C, R2/R3: one SelfTrack per pinned prior lap (the LAST `priorLaps` columns, ids
 *  and startedAtMs identical to demoPriorResults'), fixes sampled every
 *  DEMO_SELF_FIX_STEP_S from t = 0 to t = lap inclusive along `asset`'s path at that lap's
 *  own gate times; startMs = the lap's startedAtMs, finishMs = startMs + lap*1000,
 *  lapS = lap, each fix carrying sM = demoChainage. Oldest first. [] for 0 priors. */
export function demoSelfTracks(
  priorLaps: number, nowMs: number, asset: WayAsset = DEMO_WAY_ASSET,
): SelfTrack[] {
  return demoPriorColumns(priorLaps, nowMs).map(({ col, rideId, startedAtMs, lapS }) => {
    const secsForCol = DEMO_HISTORY.map((sector) => sector[col - 1]);
    const gateAt = buildDemoScript(secsForCol).gateAt;
    const sampleTimes: number[] = [];
    for (let t = 0; t <= lapS; t += DEMO_SELF_FIX_STEP_S) sampleTimes.push(t);
    if (sampleTimes[sampleTimes.length - 1] !== lapS) sampleTimes.push(lapS);
    const fixes = sampleTimes.reduce<{ tUnixMs: number; lat: number; lon: number; sM: number }[]>(
      (acc, t) => {
        const p = positionAtTime(asset, gateAt, t);
        if (p) acc.push({ tUnixMs: startedAtMs + t * 1000, lat: p.lat, lon: p.lon, sM: demoChainage(gateAt, t) });
        return acc;
      },
      [],
    );
    return { rideId, startMs: startedAtMs, finishMs: startedAtMs + lapS * 1000, lapS, fixes };
  });
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

/** virgin-cycle14 brief 08 (Nathan #11): today's scripted lap as a RideResult — the same
 *  shape/fields as demoPriorResults' rows (rawS === movingS, 'clean', DEMO_WAY_ID), id
 *  DEMO_TODAY_RIDE_ID, dated `nowMs`. Never stored; only ever handed to pure builders. */
export function demoTodayResult(nowMs: number, script: DemoScript = buildDemoScript()): RideResult {
  return {
    kind: 'rideResult',
    schemaVersion: 2,
    rideId: DEMO_TODAY_RIDE_ID,
    startedAtMs: nowMs,
    wayId: DEMO_WAY_ID,
    source: 'app',
    lap: { rawS: script.lap, movingS: script.lap, quality: 'clean' },
    sectors: [],
    derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 },
  };
}

/** brief 08: what the RESULTS tab would hold for this way after the demo lap — the mode's
 *  priors (the LAST DEMO_PRIOR_LAPS[mode] columns, oldest first, same ids/dates as the tower
 *  and the self dots) plus today, newest. Feed this straight to ResultsPlot's `results`:
 *  its own plotWindow() keeps the last PLOT_N ranked (TENTH: priors 2-9 + today, 9 dots;
 *  SECOND: 2; FIRST: 1 — the real component's own <2-point rendering, no special case). */
export function demoPlotResults(
  mode: DemoMode, nowMs: number, script: DemoScript = buildDemoScript(),
): RideResult[] {
  return [...demoPriorResults(DEMO_PRIOR_LAPS[mode], nowMs), demoTodayResult(nowMs, script)];
}

/** brief 08: the plot caption's position segment, exactly as ResultsDetailScreen.tsx builds
 *  it (`P<pos> of <total>` from the real buildHistoryBoard over the same results; PB marker
 *  irrelevant here, so allTimeBestS is null). '' for no selection, an unknown id, or an
 *  unranked row — the screen blanks it itself when SETTINGS rankings are off. */
export function demoPlotPosLabel(results: readonly RideResult[], rideId: string | null): string {
  if (rideId === null) return '';
  const board = buildHistoryBoard([...results], null);
  const row = board.rows.find((r) => r.rideId === rideId);
  return row !== undefined && row.pos !== null ? `P${row.pos} of ${board.total}` : '';
}

/** brief 08: the real screen's header over the same window — 'LAST 9 RIDES' / 'LAST 1 RIDE'. */
export function demoPlotCaption(results: readonly RideResult[]): string {
  return windowCaption(plotWindow([...results]).length);
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
