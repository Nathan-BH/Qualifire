/**
 * Shared LIVE-screen pane v2 (LAYOUT §2/§2a + Nathan's 2026-08-15 rulings):
 * the big slot carries the ticking LAP CLOCK, F1-style — whole-ride elapsed,
 * m:ss.d at 0.1 s, the majority of the screen, ink — NEVER tier-coloured
 * while ticking, no target/benchmark/delta anywhere near it. At each gate the
 * completed sector's frozen time FLASHES over it in the earned tier colour
 * for ~2.5 s — masking, never pausing: the clock runs underneath and
 * reappears already honest. Estimated flashes grey/dashed/colourless;
 * interrupted keeps its earned tier + ‖. At the final gate the LAP result
 * takes the slot terminally (~1.1 s after the gate, cutting the sector flash
 * short per §2a.1), plus a static tower-position chip when a tower source
 * exists (B-28 UNBUILT on the real screen — see live/towerSource.ts).
 *
 * ONE render path (hard rule, §3.8): the clock is driven by a Timebase with
 * a rate multiplier —
 *  - RecordScreen feeds the REAL engine state via viewModelFromEngine() with
 *    a rate-1 timebase anchored at recording start;
 *  - the Preview demo feeds scripted view models whose timebase is
 *    re-anchored at each scripted gate with a demo rate (~70×), so a ~13 s
 *    demo reads as a ~15-min lap and the clock shows plausible cumulative
 *    values at every gate. Same pane, same clock code — the demo is an
 *    accelerated emulation of the race screen, never a fork.
 *
 * Honesty (D-008/D-013/D-021): no benchmark store yet, so from the engine
 * every clean sector/lap is NEUTRAL with a blank delta; estimated renders
 * dashed-grey ~time, delta suppressed; interrupted keeps earned tier + ‖.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LiveEngineState, LiveSector } from '../live/engine';
import { LiveBigChip, LiveLapChip, PosChip, StripSlot, Tier } from './chips';
import { useTheme } from './themeContext';

/* ---------------- timebase: one clock, two speeds ---------------- */

/** Piecewise-linear timebase driving the lap clock. Real rides: one segment,
 * rate 1, anchored at recording start. The demo re-anchors at each scripted
 * gate so the clock reads the scenario's cumulative times exactly. */
export interface Timebase {
  /** wall-clock ms at the anchor (Date.now() domain) */
  anchorRealMs: number;
  /** displayed clock ms at the anchor */
  anchorClockMs: number;
  /** displayed ms per real ms — 1 on the bike, ~70 in the demo */
  rate: number;
  running: boolean;
}

export const realTimebase = (startedAtMs: number): Timebase => ({
  anchorRealMs: startedAtMs,
  anchorClockMs: 0,
  rate: 1,
  running: true,
});

export function clockMsAt(tb: Timebase, nowMs: number): number {
  return tb.anchorClockMs + (tb.running ? (nowMs - tb.anchorRealMs) * tb.rate : 0);
}

/** m:ss.d — the lap clock's only format (0.1 s is enough, per Nathan). */
export function fmtClock(ms: number): string {
  const ds = Math.max(0, Math.floor(ms / 100));
  const m = Math.floor(ds / 600);
  const sec = Math.floor((ds % 600) / 10);
  return `${m}:${sec < 10 ? '0' : ''}${sec}.${ds % 10}`;
}

/* ---------------- view model ---------------- */

export interface BigChipModel {
  tier: Tier;
  waiting?: boolean;
  lbl: string;
  glyph: string;
  time: string;
  delta: string;
  pb?: boolean;
}

export interface LapChipModel {
  tier: Tier;
  time: string;
  delta: string;
}

export interface StripSlotModel {
  tier: Tier;
  label: string;
  /** frozen final time on completed blocks (m:ss / ~m:ss) — §2 rule 4 */
  time?: string;
  current?: boolean;
}

export interface LiveViewModel {
  /** drives the ticking lap clock; null = placeholder 0:00.0 (dim) */
  clock: Timebase | null;
  /** small context line: current sector label, e.g. 'S3' (never a benchmark) */
  contextLabel: string;
  /** latest gate result — flashes over the clock for FLASH_HOLD_MS */
  flash: BigChipModel | null;
  /** increments per gate fire; each change retriggers the flash */
  flashKey: number;
  lap: LapChipModel | null;
  /** tower position at the handover ('P3'); null = render nothing (B-28) */
  posChip: string | null;
  strip: StripSlotModel[];
}

/** Hold of the gate flash over the clock. [ASSUMPTION §2 — tune on device] */
export const FLASH_HOLD_MS = 2500;

/** m:ss(.d) — sector times get one decimal, lap/estimated times none. */
export function fmtSec(s: number, decimals: 0 | 1 = 0): string {
  const whole = decimals === 1 ? Math.floor(s * 10) / 10 : Math.round(s);
  const m = Math.floor(whole / 60);
  const rest = whole - m * 60;
  const sec = decimals === 1 ? rest.toFixed(1) : String(Math.round(rest));
  return `${m}:${(rest < 10 ? '0' : '') + sec}`;
}

/** (sectorIndex, movingS) -> tier. Supplied by the screen from the colour
 * model in Settings and the ghost history for the locked route; returns
 * 'neutral' when there is too little history to judge (D-008's <5 rule). */
export type TierSource = (sectorIndex: number, movingS: number | null) => Tier;

const NEUTRAL_SOURCE: TierSource = () => 'neutral';

function bigFromSector(k: number, sec: LiveSector, tierOf: TierSource): BigChipModel {
  const lbl = `S${k}`;
  if (sec.kind === 'done') {
    if (sec.estimated) {
      // D-011/D-013: gap-derived — ~raw, colourless, dashed, delta suppressed.
      return { tier: 'est', lbl, glyph: '', time: `~${fmtSec(sec.rawS)}`, delta: '– –' };
    }
    return {
      // cycle 008: real tier from the ghost history, via the injected source
      tier: tierOf(k, sec.movingS ?? null),
      lbl,
      glyph: sec.interrupted ? '‖' : '',
      time: fmtSec(sec.movingS ?? sec.rawS, 1),
      delta: '', // D-021: no reference on this track yet → delta blank
    };
  }
  // 'missed' (skipped gate / offroute): no data — grey, no numbers.
  return { tier: 'est', lbl, glyph: '', time: '– –', delta: '' };
}

export function viewModelFromEngine(
  st: LiveEngineState,
  clock: Timebase | null = null,
  posChip: string | null = null, // real callers pass getLiveTowerPosition()
  tierOf: TierSource = NEUTRAL_SOURCE,
): LiveViewModel {
  const strip: StripSlotModel[] = st.sectors.map((sec, i) => {
    const label = `S${i + 1}`;
    switch (sec.kind) {
      case 'done':
        return sec.estimated
          ? { tier: 'est' as Tier, label: `${label} ~`, time: `~${fmtSec(sec.rawS)}` }
          : {
              tier: tierOf(i + 1, sec.movingS ?? null),
              label: sec.interrupted ? `${label} ‖` : label,
              time: fmtSec(sec.movingS ?? sec.rawS), // frozen m:ss — decimal lives in the flash
            };
      case 'current':
        return { tier: 'none' as Tier, label, current: true };
      case 'missed': // never traversed/scored — stays an empty grey slot
      case 'pending':
      default:
        return { tier: 'none' as Tier, label };
    }
  });

  const lastDone = st.lastDone;
  const flash: BigChipModel | null =
    lastDone === null || st.sectors[lastDone - 1] === undefined
      ? null // no gate yet — the clock owns the slot
      : bigFromSector(lastDone, st.sectors[lastDone - 1], tierOf);

  let lap: LapChipModel | null = null;
  if (st.lap !== null) {
    lap = st.lap.estimated
      ? {
          tier: 'est',
          time: st.lap.rawS !== null ? `~${fmtSec(st.lap.rawS)}` : '– –',
          delta: '– –',
        }
      : {
          // lap tier: sector index 0 is the convention for "the whole lap"
          tier: tierOf(0, st.lap.movingS ?? st.lap.rawS ?? null),
          time: fmtSec(st.lap.movingS ?? st.lap.rawS ?? 0),
          delta: '', // no lap reference yet (D-021)
        };
  }

  const contextLabel =
    st.phase === 'finished'
      ? '' // the LAP result carries its own label
      : st.currentSector !== null
        ? `S${st.currentSector}`
        : '';

  return { clock, contextLabel, flash, flashKey: st.gateFires, lap, posChip, strip };
}

/* ---------------- the clock ---------------- */

/** The big ticking lap counter. 10 Hz re-render — digits are the only thing
 * moving on the whole surface (§2 rule 2). Ink, never a tier colour. */
function LapClock({ tb }: { tb: Timebase | null }) {
  const { t } = useTheme();
  const [, tick] = useState(0);
  const running = tb?.running ?? false;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [running, tb?.anchorRealMs, tb?.rate]);
  return (
    <Text style={[clockStyles.clock, { color: tb ? t.text : t.textDim }]}>
      {tb ? fmtClock(clockMsAt(tb, Date.now())) : '0:00.0'}
    </Text>
  );
}

const clockStyles = StyleSheet.create({
  clock: {
    fontSize: 92,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
});

/* ---------------- the pane ---------------- */

/** The pane. `showLap` gates the lap result so callers can honour the §2a
 * sequencing (~1.1 s after the final gate, with the lap earcon); when it
 * lands it cuts any running sector flash short (§2a.1) and is terminal. */
export function LiveSectorPane({ vm, showLap = true }: { vm: LiveViewModel; showLap?: boolean }) {
  const { t } = useTheme();
  const [flashOn, setFlashOn] = useState(false);

  // Each gate fire retriggers the flash; the clock keeps running underneath
  // (masked, never paused) and reappears at ~+2.5 s already honest.
  useEffect(() => {
    if (vm.flashKey <= 0) {
      setFlashOn(false);
      return;
    }
    setFlashOn(true);
    const id = setTimeout(() => setFlashOn(false), FLASH_HOLD_MS);
    return () => clearTimeout(id);
  }, [vm.flashKey]);

  const lapTakesSlot = vm.lap !== null && showLap; // terminal — the counter never resumes

  return (
    <View style={paneStyles.pane}>
      <Text style={[paneStyles.ctx, { color: t.textDim }]}>{vm.contextLabel || ' '}</Text>
      <View style={paneStyles.bigSlot}>
        {lapTakesSlot && vm.lap ? (
          <View style={paneStyles.lapRow}>
            <View style={{ flex: 1 }}>
              <LiveLapChip tier={vm.lap.tier} time={vm.lap.time} delta={vm.lap.delta} />
            </View>
            {/* static position chip, no new earcon (Nathan 2026-08-15);
                null on the real screen until B-28 → nothing renders */}
            {vm.posChip ? <PosChip label={vm.posChip} /> : null}
          </View>
        ) : flashOn && vm.flash ? (
          <LiveBigChip
            tier={vm.flash.tier}
            waiting={vm.flash.waiting}
            lbl={vm.flash.lbl}
            glyph={vm.flash.glyph}
            time={vm.flash.time}
            delta={vm.flash.delta}
            pb={vm.flash.pb}
          />
        ) : (
          <LapClock tb={vm.clock} />
        )}
      </View>
      <View style={paneStyles.strip}>
        {vm.strip.map((slot, i) => (
          <StripSlot key={i} tier={slot.tier} label={slot.label} time={slot.time} current={slot.current} />
        ))}
      </View>
    </View>
  );
}

const paneStyles = StyleSheet.create({
  pane: { alignSelf: 'stretch' },
  ctx: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  // Fixed-height slot: clock / flash / lap swap with zero layout jump.
  bigSlot: { minHeight: 190, justifyContent: 'center', alignSelf: 'stretch' },
  lapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  strip: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 24 },
});
