/**
 * Pure layout model for the RESULTS detail's scatterplot (WP-2 §3.3-§3.7):
 * the last WINDOW_PREV ranked rides on a way, laid out by slot (x) — the
 * ride's position in a fixed PLOT_N-slot grid, newest at the right edge —
 * against scored seconds (y, faster = up), against the window's own
 * average. No React, no native module — every pixel the component draws
 * comes from here, so `resultsPlot.tsx` never does arithmetic of its own.
 *
 * The window is exactly `ghostsFor()`'s shape (colourModel.ts): the same
 * `ranks()` filter, the same `WINDOW_PREV` constant, re-exported as PLOT_N
 * so the two can never drift apart.
 */
import type { RideResult } from '../store/types.ts';
import { scoredS } from '../store/timing.ts';
import { ranks } from '../store/results.ts';
import { WINDOW_PREV, fmt } from './colourModel.ts';
import { towerDate } from './towerModel.ts';

// -------------------------------------------------------------- constants

export const PLOT_N = WINDOW_PREV;
export const PAD_L = 12;
export const PAD_R = 12;
export const PLOT_H = 220;
export const GUTTER_W = 44;
export const MIN_SPAN_S = 30;
export const MIN_SPAN_FRAC = 0.05;
export const PAD_FRAC = 0.10;
export const TICK_STEPS_S = [5, 10, 15, 20, 30, 60, 120, 300, 600, 900];
export const MAX_Y_TICKS = 5;
export const LABEL_COLLISION_PX = 12;
export const POINT_R = 5;
export const X_TICK_MIN_GAP_PX = 84; // X_TICK_LABEL_W (component) is 80; two centred labels need at least that plus a hair

export type PointTone = 'fastest' | 'faster' | 'slower';

export interface PlotPoint {
  rideId: string;
  startedAtMs: number;
  timeS: number;
  x: number;
  y: number;
  tone: PointTone;
}

/** `at` is a pixel coordinate (y for a y-tick, x for an x-tick) — not a
 * time or a seconds value — so the component only ever positions, never
 * computes. */
export interface PlotTick {
  at: number;
  label: string | null;
}

export interface PlotModel {
  points: PlotPoint[];
  plotW: number;
  plotH: number;
  yMin: number;
  yMax: number;
  meanS: number | null;
  meanY: number | null;
  yTicks: PlotTick[];
  xTicks: PlotTick[];
  windowN: number;
  empty: 'none' | 'no-ranked';
}

// -------------------------------------------------------------- helpers

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** §3.3: the last PLOT_N ranked rides, ascending startedAtMs — the exact
 * `ranks()` filter and `WINDOW_PREV` constant `ghostsFor()` uses, never a
 * local lookalike. Rider-ignored, tripwire-demoted and estimated/missed
 * rides are never in the field. */
export function plotWindow(results: RideResult[]): RideResult[] {
  return results
    .filter(ranks)
    .slice()
    .sort((a, b) => a.startedAtMs - b.startedAtMs)
    .slice(-PLOT_N);
}

/** §3.4: the y-domain — the window's own range widened to include the
 * mean, floored to a minimum span, then padded 10% each side. No outlier
 * fence: a slow ride simply widens the domain. */
export function fitDomain(times: number[]): { yMin: number; yMax: number; meanS: number } {
  const meanS = mean(times);
  const withMean = [...times, meanS];
  let lo = Math.min(...withMean);
  let hi = Math.max(...withMean);
  let span = hi - lo;
  const minSpan = Math.max(MIN_SPAN_S, MIN_SPAN_FRAC * median(times));
  if (span < minSpan) {
    const mid = (lo + hi) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
    span = minSpan;
  }
  const pad = PAD_FRAC * span;
  return { yMin: lo - pad, yMax: hi + pad, meanS };
}

/** §3.6: 'fastest' = the minimum time in the window (ties: the OLDEST —
 * i.e. the first occurrence in chronological order, matching towerModel's
 * "first equal" PB rule); otherwise faster/slower than the window's mean.
 * Index-aligned with `times` (chronological order). */
export function toneFor(times: number[], meanS: number): PointTone[] {
  const minT = Math.min(...times);
  const fastestIdx = times.indexOf(minT);
  return times.map((t, i) => {
    if (i === fastestIdx) return 'fastest';
    return t < meanS ? 'faster' : 'slower';
  });
}

/** D6: slot k of a PLOT_N-slot grid, k = 0 leftmost. PLOT_N === 1 is not a
 * real configuration (WINDOW_N is 10) but must not divide by zero. */
export function xAtSlot(k: number, plotW: number): number {
  if (PLOT_N <= 1) return plotW - PAD_R;
  return PAD_L + (k / (PLOT_N - 1)) * (plotW - PAD_L - PAD_R);
}
/** D6: the i-th of n window rides (chronological, 0 = oldest) fills the
 * rightmost n slots. */
export function slotIndex(i: number, n: number): number {
  return PLOT_N - n + i;
}

function yAt(timeS: number, yMin: number, yMax: number): number {
  return ((timeS - yMin) / (yMax - yMin)) * PLOT_H;
}

/** how many tick multiples of `step` actually land inside [yMin, yMax] —
 * `floor(span/step) + 1` in the general case, which is NOT the same
 * quantity as `span/step`; comparing against this (not the raw ratio) is
 * what actually guarantees the on-screen count stays <= MAX_Y_TICKS. */
function tickCountForStep(yMin: number, yMax: number, step: number): number {
  const first = Math.ceil(yMin / step) * step;
  let count = 0;
  for (let v = first; v <= yMax + 1e-9; v += step) count++;
  return count;
}

function buildYTicks(yMin: number, yMax: number, meanY: number): PlotTick[] {
  let step = TICK_STEPS_S[TICK_STEPS_S.length - 1];
  for (const s of TICK_STEPS_S) {
    if (tickCountForStep(yMin, yMax, s) <= MAX_Y_TICKS) { step = s; break; }
  }
  const first = Math.ceil(yMin / step) * step;
  const ticks: PlotTick[] = [];
  for (let v = first; v <= yMax + 1e-9; v += step) {
    const at = yAt(v, yMin, yMax);
    const label = Math.abs(at - meanY) <= LABEL_COLLISION_PX ? null : fmt(v);
    ticks.push({ at, label });
  }
  return ticks;
}

function buildSlotXTicks(points: PlotPoint[]): PlotTick[] {
  const newest = points[points.length - 1];
  const oldest = points[0];
  const ticks: PlotTick[] = [{ at: newest.x, label: towerDate(newest.startedAtMs) }];
  if (points.length > 1 && newest.x - oldest.x >= X_TICK_MIN_GAP_PX) {
    ticks.unshift({ at: oldest.x, label: towerDate(oldest.startedAtMs) });
  }
  return ticks;
}

// -------------------------------------------------------------- the model

/** §3.3-§3.6 in full. `plotW` is the plot area's own width (post-gutter —
 * the caller has already subtracted GUTTER_W). No `allTimeBestS`, no
 * `nowMs`: the plot never claims a position and is never windowed to now. */
export function buildPlotModel(results: RideResult[], plotW: number): PlotModel {
  const window = plotWindow(results);
  const windowN = window.length;
  if (windowN === 0) {
    return {
      points: [], plotW, plotH: PLOT_H, yMin: 0, yMax: 0, meanS: null, meanY: null,
      yTicks: [], xTicks: [], windowN: 0, empty: 'no-ranked',
    };
  }

  const times = window.map((r) => scoredS(r.lap) as number);
  const { yMin, yMax, meanS } = fitDomain(times);
  const tones = toneFor(times, meanS);

  const points: PlotPoint[] = window.map((r, i) => ({
    rideId: r.rideId,
    startedAtMs: r.startedAtMs,
    timeS: times[i],
    x: xAtSlot(slotIndex(i, windowN), plotW),
    y: yAt(times[i], yMin, yMax),
    tone: tones[i],
  }));

  const meanY = yAt(meanS, yMin, yMax);
  const yTicks = buildYTicks(yMin, yMax, meanY);
  const xTicks = buildSlotXTicks(points);

  return { points, plotW, plotH: PLOT_H, yMin, yMax, meanS, meanY, yTicks, xTicks, windowN, empty: 'none' };
}
