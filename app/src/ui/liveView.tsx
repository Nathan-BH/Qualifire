/**
 * Shared LIVE-screen pane v2 (LAYOUT §2/§2a + Nathan's 2026-08-15 rulings):
 * the big slot carries the ticking LAP CLOCK, F1-style — whole-ride elapsed,
 * m:ss.d at 0.1 s, the majority of the screen, ink — NEVER tier-coloured
 * while ticking, no target/benchmark/delta anywhere near it (a live position
 * `P4` on the context row is a fact under D-028, like the lap flash —
 * not a benchmark; follow-up brief R10). At each gate the completed sector's
 * frozen time REPLACES the digits in its tier's text colour for ~2.5 s
 * (virgin-cycle22 04: same clock typography, no box/label/delta — only the
 * colour says the tier; estimated = dim ~time; interrupted keeps its earned
 * tier, unmarked) — masking, never pausing: the clock runs underneath and
 * reappears already honest. At the final gate the LAP time flashes the same
 * way, LAP_HANDOVER_MS after that gate (cutting the sector flash short, §2a.1),
 * for one hold — then the whole-ride clock runs again until STOP (the lap chip
 * used to stay in the slot; the rank is revealed after STOP by the tower, R1).
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
 * every clean sector/lap is NEUTRAL with a blank delta; estimated flashes
 * a dim ~time; there is no delta anywhere in a flash (D-021); interrupted keeps its
 * earned tier, unmarked.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LiveEngineState, LiveSector } from '../live/engine';
import { StripSlot, Tier } from './chips';
import { useTheme } from './themeContext';
import { tierTextColour } from './tierColour';
import { scoredS } from '../store/timing';

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

/** A flash in the clock's slot (virgin-cycle22 04, Nathan 2026-10-04/05): the frozen time and the
 * tier that colours it — nothing else. No label, no delta, no PB marker, no rank, no box: a flash is
 * the lap clock's own digits in another colour for FLASH_HOLD_MS. Used for BOTH the sector flash at
 * each gate (`time` = `m:ss.d`; an estimated sector or a missed gate has no flash at all, brief 06)
 * and the lap flash at the finish (`time` = `m:ss`, no decimal, as the lap has always been shown). */
export interface FlashModel {
  tier: Tier;
  time: string;
}

export interface StripSlotModel {
  tier: Tier;
  label: string;
  /** frozen final time on completed blocks (m:ss; none without a real time) — §2 rule 4 */
  time?: string;
  current?: boolean;
}

export interface LiveViewModel {
  /** drives the ticking lap clock; null = placeholder 0:00.0 (dim) */
  clock: Timebase | null;
  /** current sector label, e.g. 'S3' — kept in the model for REPLAY/DEMO/tests; NOT rendered since virgin-cycle27 05 (the strip's current slot breathes instead) */
  contextLabel: string;
  /** latest gate result — flashes over the clock for FLASH_HOLD_MS */
  flash: FlashModel | null;
  /** increments per gate fire; each change retriggers the flash */
  flashKey: number;
  /** the lap result once the FINISH gate scored it (one-shot) — flashes LAP_HANDOVER_MS after that
   *  gate for FLASH_HOLD_MS, then the clock runs again until STOP */
  lap: FlashModel | null;
  /** tower position at the handover ('P3'); null = render nothing (B-28). virgin-cycle22 04: accepted, NOT rendered — the rank is revealed
   *  after STOP by the tower (cycle11 R1); kept so the three producers need no signature change. */
  posChip: string | null;
  /** live position among the selfs on the map ('P4'); null/undefined =
   *  render nothing (follow-up R10). A fact, never a benchmark. */
  livePos?: string | null;
  strip: StripSlotModel[];
}

/** Hold of the gate flash over the clock. [ASSUMPTION §2 — tune on device] */
export const FLASH_HOLD_MS = 2500;

/** LAYOUT §2a: the lap flash follows the final gate's sector flash by this much (cutting it short,
 * §2a.1) — the handover the screens used to time themselves (RecordScreen's own state + effect, until
 * virgin-cycle22 04). Owned by the pane now, so every surface (RECORD, DEMO, REPLAY) sequences alike. */
export const LAP_HANDOVER_MS = 1100;

/** m:ss(.d) — sector times get one decimal, lap/estimated times none. */
export function fmtSec(s: number, decimals: 0 | 1 = 0): string {
  const whole = decimals === 1 ? Math.floor(s * 10) / 10 : Math.round(s);
  const m = Math.floor(whole / 60);
  const rest = whole - m * 60;
  const sec = decimals === 1 ? rest.toFixed(1) : String(Math.round(rest));
  return `${m}:${(rest < 10 ? '0' : '') + sec}`;
}

/** (sectorIndex, timeS — scoredS() of the sector) -> tier. Supplied by the
 * screen from the colour model in Settings and the ghost history for the
 * locked route; returns 'neutral' when there is too little history to judge
 * (D-008's <5 rule). */
export type TierSource = (sectorIndex: number, timeS: number | null) => Tier;

const NEUTRAL_SOURCE: TierSource = () => 'neutral';

function bigFromSector(k: number, sec: LiveSector, tierOf: TierSource): FlashModel | null {
  // virgin-cycle23 brief 06 (Nathan 2026-10-07: nothing is ever shown as an estimate): only a real
  // sector time flashes. An estimated sector or a missed gate flashes nothing; the clock keeps running.
  if (sec.kind !== 'done' || sec.estimated) return null;
  // cycle 008: real tier from the ghost history, via the injected source.
  // virgin-cycle22 04: the time alone; no label row, nothing to compare against (D-021: no reference yet).
  return { tier: tierOf(k, scoredS(sec)), time: fmtSec(scoredS(sec) ?? sec.rawS, 1) };
}

export function viewModelFromEngine(
  st: LiveEngineState,
  clock: Timebase | null = null,
  posChip: string | null = null, // real callers pass getLiveTowerPosition()
  tierOf: TierSource = NEUTRAL_SOURCE,
  livePos: string | null = null,
): LiveViewModel {
  const strip: StripSlotModel[] = st.sectors.map((sec, i) => {
    const label = `S${i + 1}`;
    // virgin-cycle22 02 (Nathan 2026-10-04): no pause mark (U+2016) on an interrupted sector; the flag only drives scoring.
    switch (sec.kind) {
      case 'done':
        return sec.estimated
          ? { tier: 'est' as Tier, label } // brief 06: no ~ and no time without a real time; tier est keeps the slot grey
          : {
              tier: tierOf(i + 1, scoredS(sec)),
              label,
              time: fmtSec(scoredS(sec) ?? sec.rawS), // frozen m:ss — decimal lives in the flash
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
  const flash: FlashModel | null =
    lastDone === null || st.sectors[lastDone - 1] === undefined
      ? null // no gate yet — the clock owns the slot
      : bigFromSector(lastDone, st.sectors[lastDone - 1], tierOf);

  let lap: FlashModel | null = null;
  // virgin-cycle23 brief 06: the finish flashes only a real lap time; an estimated lap (or one without
  // a moving time) flashes nothing and the clock keeps running.
  if (st.lap !== null && !st.lap.estimated && scoredS(st.lap) !== null) {
    lap = {
      // lap tier: sector index 0 is the convention for "the whole lap"
      tier: tierOf(0, scoredS(st.lap) ?? st.lap.rawS ?? null),
      time: fmtSec(scoredS(st.lap) ?? st.lap.rawS ?? 0),
    };
  }

  const contextLabel =
    st.phase === 'finished'
      ? '' // the LAP result carries its own label
      : st.currentSector !== null
        ? `S${st.currentSector}`
        : '';

  return { clock, contextLabel, flash, flashKey: st.gateFires, lap, posChip, livePos, strip };
}

/* ---------------- the clock ---------------- */

/** The big ticking lap counter. 10 Hz re-render — digits are the only thing
 * moving on the whole surface (§2 rule 2). Ink, never a tier colour. */
function LapClock({ tb, clockSize }: { tb: Timebase | null; clockSize?: number }) {
  const { t } = useTheme();
  const [, tick] = useState(0);
  const running = tb?.running ?? false;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [running, tb?.anchorRealMs, tb?.rate]);
  return (
    <Text
      style={[
        clockStyles.clock,
        clockSize != null ? { fontSize: clockSize } : null,
        { color: tb ? t.text : t.textDim },
      ]}
    >
      {tb ? fmtClock(clockMsAt(tb, Date.now())) : '0:00.0'}
    </Text>
  );
}

/** A flash (virgin-cycle22 04): a frozen time — the completed sector's at a gate, the lap's at the
 * finish — set EXACTLY like the lap clock it masks (same clockStyles.clock, same clockSize override)
 * and coloured by the shared tier text colour. One Text: no box, no frame, no fill, no label, no
 * delta, no marker, no rank; identical shape for every tier and both themes. (The source test greps
 * this component for box/fill words — keep this comment free of them.) The "Sector colours" setting is the live MAP's
 * (D8, 2026-10-05); it is not read here and must never be. Nathan 2026-10-04: "sector time in tier
 * colour on the timer digits"; 2026-10-05: the finish flashes only the lap time the same way. */
function LiveFlash({ time, tier, clockSize }: { time: string; tier: Tier; clockSize?: number }) {
  const { t } = useTheme();
  return (
    <Text
      style={[
        clockStyles.clock,
        clockSize != null ? { fontSize: clockSize } : null,
        { color: tierTextColour(tier, t) },
      ]}
    >
      {time}
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

/** The pane. Owns both flash timers: a sector
 * flash at each gate fire (FLASH_HOLD_MS), and at the finish the lap flash LAP_HANDOVER_MS after the
 * final gate (LAYOUT §2a — it cuts the sector flash short, §2a.1) for one FLASH_HOLD_MS; then the slot
 * is the running clock's again (virgin-cycle22 04 — the lap result used to be fixed in the slot). */
export function LiveSectorPane({ vm, clockSize }: { vm: LiveViewModel; clockSize?: number }) {
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

  // Finish: the lap is scored once (engine phase 'finished'); LAP_HANDOVER_MS after that gate the lap
  // flash takes the slot from the sector flash (which does not come back), holds FLASH_HOLD_MS, then
  // the whole-ride clock runs again until STOP. Nathan 2026-10-05: same look as the sector flash.
  const [lapFlashOn, setLapFlashOn] = useState(false);
  const lapScored = vm.lap !== null;
  useEffect(() => {
    if (!lapScored) {
      setLapFlashOn(false);
      return;
    }
    let hold: ReturnType<typeof setTimeout> | null = null;
    const handover = setTimeout(() => {
      setFlashOn(false);
      setLapFlashOn(true);
      hold = setTimeout(() => setLapFlashOn(false), FLASH_HOLD_MS);
    }, LAP_HANDOVER_MS);
    return () => {
      clearTimeout(handover);
      if (hold) clearTimeout(hold);
    };
  }, [lapScored]);

  return (
    <View style={paneStyles.pane}>
      {/* virgin-cycle27 05 (Nathan 2026-10-08): position only — the current sector is shown by its
          breathing strip slot, never as text here. The blank keeps the row's height when there is no P. */}
      <Text style={[paneStyles.ctx, { color: t.text }]}>
        {vm.livePos ?? ' '}
      </Text>
      <View style={paneStyles.bigSlot}>
        {lapFlashOn && vm.lap ? (
          <LiveFlash time={vm.lap.time} tier={vm.lap.tier} clockSize={clockSize} />
        ) : flashOn && vm.flash ? (
          <LiveFlash time={vm.flash.time} tier={vm.flash.tier} clockSize={clockSize} />
        ) : (
          <LapClock tb={vm.clock} clockSize={clockSize} />
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
  strip: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 24 },
});
