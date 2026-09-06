/**
 * Pure layout model for the RESULTS detail's scatterplot (WP-2 §3.3-§3.7):
 * the last WINDOW_PREV ranked rides on a way, laid out in time (x) against
 * scored seconds (y, faster = up), against the window's own average. No
 * React, no native module — every pixel the component draws comes from
 * here, so `resultsPlot.tsx` never does arithmetic of its own.
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
export const MAX_X_TICKS = 6;
export const WEEKLY_TICKS_UNDER_DAYS = 45;
export const LABEL_COLLISION_PX = 12;
export const POINT_R = 4;
export const FASTEST_R = 5;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

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

function xAt(ms: number, tOldest: number, tNewest: number, plotW: number): number {
  const denom = tNewest - tOldest;
  if (denom === 0) return plotW - PAD_R;
  return PAD_L + ((ms - tOldest) / denom) * (plotW - PAD_L - PAD_R);
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

/** the 1st of every month whose timestamp falls within [fromMs, toMs]. */
function monthBoundariesInRange(fromMs: number, toMs: number): number[] {
  const out: number[] = [];
  const start = new Date(fromMs);
  let d = new Date(start.getFullYear(), start.getMonth(), 1);
  if (d.getTime() < fromMs) d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  while (d.getTime() <= toMs) {
    out.push(d.getTime());
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

/** every Monday whose timestamp falls within [fromMs, toMs]. */
function mondaysInRange(fromMs: number, toMs: number): number[] {
  const out: number[] = [];
  const start = new Date(fromMs);
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const untilMonday = (1 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + untilMonday);
  while (d.getTime() <= toMs) {
    if (d.getTime() >= fromMs) out.push(d.getTime());
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** keep every n-th element, counting BACK from the newest (last) — the
 * newest candidate always survives. */
function keepEveryNth<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  for (let i = arr.length - 1; i >= 0; i -= n) out.unshift(arr[i]);
  return out;
}

function monthLabel(ms: number, isFirst: boolean): string {
  const d = new Date(ms);
  const mon = MONTHS[d.getMonth()];
  const withYear = isFirst || d.getMonth() === 0; // every January carries the year too
  return withYear ? `${mon} ${String(d.getFullYear()).slice(-2)}` : mon;
}

function mondayLabel(ms: number): string {
  const d = new Date(ms);
  const day = String(d.getDate());
  return `${day.length < 2 ? '0' : ''}${day} ${MONTHS[d.getMonth()]}`;
}

function buildXTicks(tOldest: number, tNewest: number, plotW: number): PlotTick[] {
  const spanDays = (tNewest - tOldest) / DAY_MS;
  const weekly = spanDays < WEEKLY_TICKS_UNDER_DAYS;
  let candidates = weekly ? mondaysInRange(tOldest, tNewest) : monthBoundariesInRange(tOldest, tNewest);

  if (candidates.length === 0) {
    return [
      { at: xAt(tOldest, tOldest, tNewest, plotW), label: towerDate(tOldest) },
      { at: xAt(tNewest, tOldest, tNewest, plotW), label: towerDate(tNewest) },
    ];
  }
  if (candidates.length > MAX_X_TICKS) {
    candidates = keepEveryNth(candidates, Math.ceil(candidates.length / MAX_X_TICKS));
  }
  return candidates.map((ms, i) => ({
    at: xAt(ms, tOldest, tNewest, plotW),
    label: weekly ? mondayLabel(ms) : monthLabel(ms, i === 0),
  }));
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
  const tOldest = window[0].startedAtMs;
  const tNewest = window[windowN - 1].startedAtMs;

  const points: PlotPoint[] = window.map((r, i) => ({
    rideId: r.rideId,
    startedAtMs: r.startedAtMs,
    timeS: times[i],
    x: xAt(r.startedAtMs, tOldest, tNewest, plotW),
    y: yAt(times[i], yMin, yMax),
    tone: tones[i],
  }));

  const meanY = yAt(meanS, yMin, yMax);
  const yTicks = buildYTicks(yMin, yMax, meanY);
  const xTicks = buildXTicks(tOldest, tNewest, plotW);

  return { points, plotW, plotH: PLOT_H, yMin, yMax, meanS, meanY, yTicks, xTicks, windowN, empty: 'none' };
}
