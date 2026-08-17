/**
 * Demo data for the Preview tab — verbatim from demos/mockup.html.
 * All times are real measured numbers from the 64 Morning rides (B-19):
 * sector medians 3:06 / 3:23 / 4:01 / 3:23, lap median 15:01 moving.
 */

import type { Tier } from '../chips';
import type { TowerRowModel } from '../tower';

export type { Tier };

export interface LiveState {
  tier: Tier;
  waiting?: boolean;
  lbl: string;
  time: string;
  delta: string;
  glyph: string;
  pb?: boolean;
  strip: SlotKey[];
  /** frozen block times (m:ss / ~m:ss) aligned with `strip` — LAYOUT §2.4 */
  stripTimes: (string | null)[];
  earcon: string | null;
}

export type SlotKey = 'N' | 'NI' | 'G' | 'E' | 'P' | '';

export const STATES: Record<string, LiveState> = {
  pregate: {
    tier: 'none',
    waiting: true,
    lbl: 'S1',
    time: '…',
    delta: '',
    glyph: '',
    strip: ['', '', '', ''],
    stripTimes: [null, null, null, null],
    earcon: null,
  },
  neutral: {
    tier: 'neutral',
    lbl: 'S1',
    time: '3:06.8',
    delta: '−1.4',
    glyph: '',
    strip: ['N', '', '', ''],
    stripTimes: ['3:06', null, null, null],
    earcon: '🔊 buzz + one soft note — time posted',
  },
  interrupted: {
    tier: 'neutral',
    lbl: 'S2',
    time: '3:29.3',
    delta: '+5.3',
    glyph: '‖',
    strip: ['N', 'NI', '', ''],
    stripTimes: ['3:06', '3:29', null, null],
    earcon: '🔊 buzz + earned tier’s sound — ‖ carries the asterisk',
  },
  green: {
    tier: 'green',
    lbl: 'S3',
    time: '3:55.4',
    delta: '−7.1',
    glyph: '',
    strip: ['N', 'NI', 'G', ''],
    stripTimes: ['3:06', '3:29', '3:55', null],
    earcon: '🔊 buzz + rising fifth — beats 7-day best',
  },
  estimated: {
    tier: 'est',
    lbl: 'S3',
    time: '~4:01',
    delta: '– –',
    glyph: '',
    strip: ['N', 'NI', 'E', ''],
    stripTimes: ['3:06', '3:29', '~4:01', null],
    earcon: '🔊 buzz + silence — recorded, not scored',
  },
  purple: {
    tier: 'purple',
    lbl: 'S4',
    time: '3:14.9',
    delta: '−11.2',
    glyph: '',
    pb: true,
    strip: ['N', 'NI', 'G', 'P'],
    stripTimes: ['3:06', '3:29', '3:55', '3:14'],
    earcon: '🔊 buzz + rising arpeggio ♪ — beats 28-day best (+ PB grace note)',
  },
};

export interface LapDemo {
  tier: Tier;
  t: string;
  d: string;
  ear: string;
}

export const LAP_GREEN: LapDemo = {
  tier: 'green',
  t: '14:46',
  d: '−0:17',
  ear: '🔊 lap voice: rising fifth an octave fuller — beats 7-day lap best',
};

export interface BoardSector {
  lbl: string;
  glyph: string;
  name: string;
  t: string;
  d: string;
  tier: Tier;
  pb?: boolean;
}

export const BOARD_SECTORS: BoardSector[] = [
  { lbl: 'S1', glyph: '', name: 'Village exit', t: '3:06.8', d: '−1.4', tier: 'neutral' },
  { lbl: 'S2', glyph: '‖', name: 'Vaartdijk drag', t: '3:29.3', d: '+5.3', tier: 'neutral' },
  { lbl: 'S3', glyph: '', name: 'Canal straight', t: '3:55.4', d: '−7.1', tier: 'green' },
  { lbl: 'S4', glyph: '', name: 'Campus rise', t: '3:14.9', d: '−11.2', tier: 'purple', pb: true },
];

export interface HistRide {
  rd: string;
  rt: string;
  lapTier: Tier;
  mini: SlotKey[];
}

export const HIST_RIDES: HistRide[] = [
  { rd: 'Thu 14 Aug', rt: '14:46', lapTier: 'green', mini: ['N', 'NI', 'G', 'P'] },
  { rd: 'Wed 13 Aug', rt: '15:19', lapTier: 'none', mini: ['N', 'N', 'N', 'N'] },
  { rd: 'Tue 12 Aug', rt: '15:24 ‖', lapTier: 'none', mini: ['NI', 'N', 'N', 'N'] },
  { rd: 'Mon 11 Aug', rt: '15:13', lapTier: 'none', mini: ['N', 'N', 'G', 'N'] },
  { rd: 'Fri 08 Aug', rt: '15:15', lapTier: 'none', mini: ['N', 'E', 'N', 'N'] },
  { rd: 'Thu 07 Aug', rt: '15:11', lapTier: 'none', mini: ['N', 'N', 'N', 'G'] },
  { rd: 'Wed 06 Aug', rt: '15:31', lapTier: 'none', mini: ['N', 'N', 'N', 'N'] },
];

/** Trend dots — cx/cy verbatim from the mockup SVG (viewBox 340×110). */
export const TREND_DOTS: Array<[number, number]> = [
  [44, 55], [54, 38], [64, 60], [74, 30], [84, 48], [94, 66], [104, 44],
  [114, 21], [124, 52], [134, 58], [144, 40], [154, 72], [164, 47], [174, 33],
  [184, 56], [194, 62], [204, 45], [214, 50], [224, 27], [234, 58], [244, 43],
  [254, 68], [264, 49], [274, 36], [284, 54], [294, 46], [304, 61],
];
export const TREND_TODAY: [number, number] = [318, 83];
export const TREND_REF_Y = 42;

export interface Track {
  name: string;
  meta: string;
}

export const TRACKS: Track[] = [
  { name: 'MORNING', meta: 'home → work · 5.7 km · 4 sectors · ref 15:03' },
  { name: 'EVENING A', meta: 'work → home · 5.6 km · 4 sectors · ref 15:12' },
  { name: 'EVENING B', meta: 'work → home · 5.8 km · 4 sectors · ref 15:48' },
];

/** Gate positions on the chainage bar: metres of 5651 total. */
export const CHAINAGE_TOTAL = 5651;
export const GATES = [
  { m: 162, lbl: 'start', kind: 'end' as const },
  { m: 1312, lbl: 'G1', kind: 'gate' as const },
  { m: 2662, lbl: 'G2', kind: 'gate' as const },
  { m: 4212, lbl: 'G3', kind: 'gate' as const },
  { m: 5487, lbl: 'finish', kind: 'end' as const },
];

export const SECLIST = [
  'S1 · 1150 m · median 3:06 · σ 6.4 s',
  'S2 · 1350 m · median 3:23 · σ 3.8 s',
  'S3 · 1550 m · median 4:01 · σ 5.3 s',
  'S4 · 1275 m · median 3:23 · σ 7.1 s',
];

/** Demo ride sequence: [ms, stateKey] then lap + board handover.
 * Pacing (Nathan 2026-08-16 fix): gates 5 s apart — each 2.5 s flash is
 * followed by ~2.5 s of visibly ticking lap clock, so the clock/flash
 * alternation actually reads. (The old 2.6 s spacing left the clock visible
 * ~0.1 s between flashes — it looked permanently frozen after gate 1.) */
export const DEMO_SEQ: Array<[number, string]> = [
  [0, 'pregate'],
  [4000, 'neutral'],
  [9000, 'interrupted'],
  [14000, 'green'],
  [19000, 'purple'],
];
export const DEMO_LAP_AT = 20100;
export const DEMO_BOARD_AT = 22600;

/* -------------------------------------------------------------------------
 * Randomized demo scenarios (Nathan, 2026-08-15): each ▶ press plays a
 * different plausible Morning lap, so different outcomes — and how they slot
 * into the board and history — can be seen. Times stay near the measured
 * medians (3:06 / 3:23 / 4:01 / 3:23, lap 15:01, ref 15:03). Scenario 0 is
 * the original scripted lap, unchanged.
 * ---------------------------------------------------------------------- */

export interface BoardLap {
  tier: Tier;
  t: string;
  d: string;
}

export interface DemoScenario {
  name: string;
  seq: Array<[number, LiveState]>;
  lap: LapDemo;
  boardLap: BoardLap;
  /**
   * Lap-clock reading (seconds, cumulative whole-ride) at each of the four
   * gates — includes a doorstep-to-start-gate offset and any stopped time, so
   * the accelerated demo clock shows plausible values consistent with the
   * scenario's sector times (Nathan 2026-08-15: rate-multiplied timebase).
   */
  clockGatesS: [number, number, number, number];
  /** tower position chip at the live handover ('P2'); null = estimated lap, no rank */
  posChip: string | null;
  /** board v2 tower (§3b): final ranked order, today's row already in place */
  tower: TowerRowModel[];
  /** moving/vs-ref/elapsed/stops sub-line under today's tower row (§3.1) */
  todaySub: string;
  board: BoardSector[];
  /** how today slots into the history column */
  histTime: string;
  histTier: Tier;
  histMini: SlotKey[];
}

const SEC_NAMES = ['Village exit', 'Vaartdijk drag', 'Canal straight', 'Campus rise'];
const SEQ_AT = [4000, 9000, 14000, 19000]; // 5 s gaps: 2.5 s flash + 2.5 s ticking clock

const EAR_N = '🔊 buzz + one soft note — time posted';
const EAR_I = '🔊 buzz + earned tier’s sound — ‖ carries the asterisk';
const EAR_G = '🔊 buzz + rising fifth — beats 7-day best';
const EAR_P = '🔊 buzz + rising arpeggio ♪ — beats 28-day best (+ PB grace note)';
const EAR_E = '🔊 buzz + silence — recorded, not scored';

interface SecRow {
  tier: Tier;
  time: string;
  delta: string;
  glyph: string;
  pb?: boolean;
  slot: SlotKey;
  earcon: string;
}

/** '3:08.2' → '3:08' for the frozen block; '~4:07' stays as-is (§2.4). */
const blockTime = (t: string): string => (t.startsWith('~') ? t : t.split('.')[0]);

function mkSeq(rows: SecRow[]): Array<[number, LiveState]> {
  const strip: SlotKey[] = ['', '', '', ''];
  const times: (string | null)[] = [null, null, null, null];
  const out: Array<[number, LiveState]> = [[0, STATES.pregate]];
  rows.forEach((r, i) => {
    strip[i] = r.slot;
    times[i] = blockTime(r.time);
    out.push([
      SEQ_AT[i],
      {
        tier: r.tier,
        lbl: 'S' + (i + 1),
        time: r.time,
        delta: r.delta,
        glyph: r.glyph,
        pb: r.pb,
        strip: [...strip],
        stripTimes: [...times],
        earcon: r.earcon,
      },
    ]);
  });
  return out;
}

function mkBoard(rows: SecRow[]): BoardSector[] {
  return rows.map((r, i) => ({
    lbl: 'S' + (i + 1),
    glyph: r.glyph,
    name: SEC_NAMES[i],
    t: r.time,
    d: r.delta,
    tier: r.tier,
    pb: r.pb,
  }));
}

const ORDINARY: SecRow[] = [
  { tier: 'neutral', time: '3:08.2', delta: '+1.4', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'neutral', time: '3:24.1', delta: '+0.8', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'neutral', time: '4:03.0', delta: '+2.0', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'neutral', time: '3:21.7', delta: '−1.3', glyph: '', slot: 'N', earcon: EAR_N },
];

const PURPLE_DAY: SecRow[] = [
  { tier: 'neutral', time: '3:05.0', delta: '−1.8', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'green', time: '3:19.4', delta: '−3.7', glyph: '', slot: 'G', earcon: EAR_G },
  { tier: 'purple', time: '3:49.9', delta: '−11.1', glyph: '', pb: true, slot: 'P', earcon: EAR_P },
  { tier: 'green', time: '3:16.2', delta: '−6.8', glyph: '', slot: 'G', earcon: EAR_G },
];

const SCRAPPY: SecRow[] = [
  { tier: 'neutral', time: '3:41.6', delta: '+17.6', glyph: '‖', slot: 'NI', earcon: EAR_I },
  { tier: 'neutral', time: '3:25.5', delta: '+2.3', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'est', time: '~4:07', delta: '– –', glyph: '', slot: 'E', earcon: EAR_E },
  { tier: 'neutral', time: '3:24.0', delta: '+0.7', glyph: '', slot: 'N', earcon: EAR_N },
];

const QUIET_GREEN: SecRow[] = [
  { tier: 'neutral', time: '3:07.1', delta: '−0.5', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'neutral', time: '3:22.6', delta: '−0.6', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'neutral', time: '3:59.8', delta: '−1.5', glyph: '', slot: 'N', earcon: EAR_N },
  { tier: 'green', time: '3:15.8', delta: '−7.2', glyph: '', slot: 'G', earcon: EAR_G },
];

/* -------------------------------------------------------------------------
 * Timing-tower demo rows (B-28 store UNBUILT — the demo IS the tower's data
 * source for now). Positions vary per scenario so each ▶ press shows a
 * different slot-in: mixed→P2, ordinary→P11 of 19, purple→P1 taking pole,
 * scrappy→unranked NO TIME, quiet green→P4. ○ = archive-seeded ghost
 * (D-018); ● = all-time PB; times take the lap tier's colour only.
 * ---------------------------------------------------------------------- */

const TROW = (
  pos: number | null,
  time: string,
  tier: Tier,
  gap: string,
  date: string,
  f?: { today?: boolean; ghost?: boolean; pb?: boolean },
): TowerRowModel => ({ pos, time, tier, gap, date, ...f });

const TOWER_MIXED: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', 'Tue 05 Aug', { pb: true }),
  TROW(2, '14:46', 'green', '+0:15', '', { today: true }),
  TROW(3, '14:47', 'none', '+0:16', 'Thu 14 Aug'),
  TROW(4, '14:52', 'none', '+0:21', 'Mon 28 Jul'),
  TROW(5, '15:05', 'none', '+0:34', 'Wed 23 Jul', { ghost: true }),
  TROW(6, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
];

/** 19-deep session — today mid-pack: the tower pre-scrolls, clipping P1. */
const TOWER_ORDINARY: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', 'Tue 05 Aug', { pb: true }),
  TROW(2, '14:46', 'green', '+0:15', 'Thu 14 Aug'),
  TROW(3, '14:52', 'none', '+0:21', 'Mon 28 Jul'),
  TROW(4, '14:58', 'none', '+0:27', 'Fri 01 Aug'),
  TROW(5, '15:03', 'none', '+0:32', 'Tue 22 Jul', { ghost: true }),
  TROW(6, '15:05', 'none', '+0:34', 'Wed 23 Jul'),
  TROW(7, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
  TROW(8, '15:13', 'none', '+0:42', 'Mon 11 Aug'),
  TROW(9, '15:15', 'none', '+0:44', 'Fri 08 Aug'),
  TROW(10, '15:17', 'none', '+0:46', 'Fri 18 Jul', { ghost: true }),
  TROW(11, '15:19', 'none', '+0:48', '', { today: true }),
  TROW(12, '15:21', 'none', '+0:50', 'Wed 30 Jul'),
  TROW(13, '15:24', 'none', '+0:53', 'Tue 12 Aug'),
  TROW(14, '15:27', 'none', '+0:56', 'Thu 17 Jul', { ghost: true }),
  TROW(15, '15:29', 'none', '+0:58', 'Mon 21 Jul'),
  TROW(16, '15:31', 'none', '+1:00', 'Wed 06 Aug'),
  TROW(17, '15:34', 'none', '+1:03', 'Tue 29 Jul'),
  TROW(18, '15:38', 'none', '+1:07', 'Wed 16 Jul', { ghost: true }),
  TROW(19, '15:42', 'none', '+1:11', 'Mon 14 Jul'),
];

const TOWER_PURPLE: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', '', { today: true, pb: true }),
  TROW(2, '14:38', 'none', '+0:07', 'Tue 05 Aug'),
  TROW(3, '14:46', 'green', '+0:15', 'Thu 14 Aug'),
  TROW(4, '14:52', 'none', '+0:21', 'Mon 28 Jul'),
  TROW(5, '15:05', 'none', '+0:34', 'Wed 23 Jul', { ghost: true }),
  TROW(6, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
];

/** Estimated lap: ranked past laps only; today is unranked NO TIME (§2a.3). */
const TOWER_SCRAPPY: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', 'Tue 05 Aug', { pb: true }),
  TROW(2, '14:46', 'green', '+0:15', 'Thu 14 Aug'),
  TROW(3, '14:52', 'none', '+0:21', 'Mon 28 Jul'),
  TROW(4, '15:05', 'none', '+0:34', 'Wed 23 Jul', { ghost: true }),
  TROW(5, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
  TROW(null, 'NO TIME', 'est', '', '', { today: true }),
];

const TOWER_QUIET: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', 'Tue 05 Aug', { pb: true }),
  TROW(2, '14:46', 'green', '+0:15', 'Thu 14 Aug'),
  TROW(3, '14:49', 'none', '+0:18', 'Mon 28 Jul'),
  TROW(4, '14:52', 'green', '+0:21', '', { today: true }),
  TROW(5, '14:58', 'none', '+0:27', 'Fri 01 Aug'),
  TROW(6, '15:05', 'none', '+0:34', 'Wed 23 Jul', { ghost: true }),
  TROW(7, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
];

export const SCENARIOS: DemoScenario[] = [
  {
    name: 'mixed day',
    seq: [
      [0, STATES.pregate],
      [4000, STATES.neutral],
      [9000, STATES.interrupted],
      [14000, STATES.green],
      [19000, STATES.purple],
    ],
    lap: LAP_GREEN,
    boardLap: { tier: 'green', t: '14:46', d: '−0:17' },
    // offset ~30 s to the start gate; 26 s stop lives in S2 (the ‖).
    clockGatesS: [216.8, 452.1, 687.5, 882.4],
    posChip: 'P2',
    tower: TOWER_MIXED,
    todaySub: 'moving · −0:17 vs ref · 15:12 elapsed · ‖ 1 stop',
    board: BOARD_SECTORS,
    histTime: '14:46',
    histTier: 'green',
    histMini: ['N', 'NI', 'G', 'P'],
  },
  {
    name: 'ordinary day',
    seq: mkSeq(ORDINARY),
    lap: { tier: 'none', t: '15:19', d: '+0:16', ear: '(deliberately silent — a neutral lap makes no sound)' },
    boardLap: { tier: 'none', t: '15:19', d: '+0:16' },
    clockGatesS: [228.2, 432.3, 675.3, 877.0],
    posChip: 'P11',
    tower: TOWER_ORDINARY,
    todaySub: 'moving · +0:16 vs ref · 15:34 elapsed · ‖ 1 stop',
    board: mkBoard(ORDINARY),
    histTime: '15:19',
    histTier: 'none',
    histMini: ['N', 'N', 'N', 'N'],
  },
  {
    name: 'purple day',
    seq: mkSeq(PURPLE_DAY),
    lap: { tier: 'purple', t: '14:31', d: '−0:32', ear: '🔊 lap voice: rising arpeggio an octave fuller — 28-day lap best' },
    boardLap: { tier: 'purple', t: '14:31', d: '−0:32' },
    clockGatesS: [205.0, 404.4, 634.3, 830.5],
    posChip: 'P1',
    tower: TOWER_PURPLE,
    todaySub: 'moving · −0:32 vs ref · 14:44 elapsed · 0 stops',
    board: mkBoard(PURPLE_DAY),
    histTime: '14:31',
    histTier: 'purple',
    histMini: ['N', 'G', 'P', 'G'],
  },
  {
    name: 'scrappy day',
    seq: mkSeq(SCRAPPY),
    lap: { tier: 'est', t: '~15:38', d: '– –', ear: '🔊 buzz + silence — lap estimated (gap in the trace), recorded not scored' },
    boardLap: { tier: 'est', t: '~15:38', d: '– –' },
    clockGatesS: [286.6, 492.1, 759.1, 963.1],
    posChip: null, // estimated lap does not rank — no position chip (§2a.3)
    tower: TOWER_SCRAPPY,
    todaySub: 'estimated sector — not ranked · 16:02 elapsed · ‖ 2 stops',
    board: mkBoard(SCRAPPY),
    histTime: '~15:38',
    histTier: 'none',
    histMini: ['NI', 'N', 'E', 'N'],
  },
  {
    name: 'quiet green',
    seq: mkSeq(QUIET_GREEN),
    lap: { tier: 'green', t: '14:52', d: '−0:11', ear: '🔊 lap voice: rising fifth an octave fuller — beats 7-day lap best' },
    boardLap: { tier: 'green', t: '14:52', d: '−0:11' },
    clockGatesS: [209.1, 422.7, 662.5, 858.3],
    posChip: 'P4',
    tower: TOWER_QUIET,
    todaySub: 'moving · −0:11 vs ref · 15:03 elapsed · ‖ 1 stop',
    board: mkBoard(QUIET_GREEN),
    histTime: '14:52',
    histTier: 'green',
    histMini: ['N', 'N', 'N', 'G'],
  },
];

/* -------------------------------------------------------------------------
 * Demo timebase (Nathan 2026-08-15: the demo lap clock ticks FAST — same
 * clock code as the real screen, driven through a rate multiplier; a ~13 s
 * demo stands in for a ~15-min lap). The timebase is re-anchored at each
 * scripted gate so the clock reads the scenario's cumulative value exactly
 * at the moment the flash lands, with a constant rate within each segment.
 * ---------------------------------------------------------------------- */

/** Real seconds of the demo segment beginning at scripted step `step` —
 * derived from SEQ_AT (segments are non-uniform: 4 s to gate 1, then 5 s). */
function segRealS(step: number): number {
  if (step === 0) return SEQ_AT[0] / 1000;
  if (step < SEQ_AT.length) return (SEQ_AT[step] - SEQ_AT[step - 1]) / 1000;
  return (SEQ_AT[SEQ_AT.length - 1] - SEQ_AT[SEQ_AT.length - 2]) / 1000;
}

/** Anchor + rate for the segment beginning at scripted step `step` (0 =
 * demo start / pregate; 1–4 = after gate 1–4). */
export function demoClockAt(
  sc: DemoScenario,
  step: number,
): { anchorClockMs: number; rate: number } {
  const g = sc.clockGatesS;
  const at = step === 0 ? 0 : g[Math.min(step, g.length) - 1];
  const to =
    step < g.length ? g[step] : g[g.length - 1] + (g[g.length - 1] - g[g.length - 2]);
  return { anchorClockMs: at * 1000, rate: (to - at) / segRealS(step) || 1 };
}
