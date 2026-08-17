/**
 * Pure view-model builder for the timing tower (B-28's missing half).
 *
 * tower.tsx owns ANATOMY + MOTION and deliberately knows nothing about where
 * rows come from; THIS module is the provider seam: window of RideResults in,
 * TowerModel out. No store reads, no React — headless-testable.
 *
 * Semantics (tower.tsx doc block + D-013/D-018/D-028):
 *  - Rows are the window's laps plus today's, sorted ascending; pos is 1-based.
 *  - gap: '—' for P1, else '+Xs' whole seconds to P1 (rounded); '' unranked.
 *  - tier colours the TIME only. A past row is judged against the OTHER rows
 *    in the window (itself excluded — a lap cannot be its own history); today
 *    is judged against the whole window (B-44 exclusion happened upstream).
 *  - An estimated (or lap-less) today NEVER ranks (D-028): pos null, 'NO
 *    TIME', dashed-est tier, empty gap, sits LAST so the slot-in travels zero
 *    rows.
 *  - ghost ○ marks archive-seeded laps (D-018): any source !== 'app'.
 *  - pb ● sits on the first row equalling the all-time best (D-007) — which
 *    may be nobody, when the all-time best fell out of the window.
 */
import type { RideResult } from '../store/types.ts';
import type { Tier } from './chips.tsx';
import type { TowerModel, TowerRowModel } from './tower.tsx';
import { fmt, tierFor, type UiTier } from './colourModel.ts';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Tue 05 Aug' — hand-formatted, local time (it is the rider's own day). */
export function towerDate(ms: number): string {
  const d = new Date(ms);
  const day = String(d.getDate());
  return `${WEEKDAYS[d.getDay()]} ${day.length < 2 ? '0' : ''}${day} ${MONTHS[d.getMonth()]}`;
}

/** UiTier (colour model) → Tier (chips). Same names today, but the two types
 * are owned by different layers — convert explicitly so a drift in either
 * becomes a compile error here rather than a wrong colour on the board. */
function toTier(u: UiTier): Tier {
  switch (u) {
    case 'purple': return 'purple';
    case 'green': return 'green';
    case 'yellow': return 'yellow';
    case 'neutral': return 'neutral';
    case 'est': return 'est';
  }
}

export function buildTowerModel(
  window: RideResult[],
  todayLapS: number | null,
  todayEstimated: boolean,
  todayAtMs: number,
  allTimeBestS: number | null,
): TowerModel {
  // The window comes from ghostsFor(), whose ranks() filter already drops
  // null moving times — this filter is belt-and-braces, never semantics.
  const past = window
    .filter((r) => r.lap.movingS !== null)
    .map((r) => ({
      value: r.lap.movingS as number,
      startedAtMs: r.startedAtMs,
      // Absent source (malformed entry) reads as ghost too — undefined !== 'app'.
      ghost: r.source !== 'app',
    }));
  const values = past.map((e) => e.value);
  const todayUnranked = todayEstimated || todayLapS === null;

  interface Working { value: number; today: boolean; ghost: boolean; date: string; tier: UiTier }
  const ranked: Working[] = past.map((e, i) => ({
    value: e.value,
    today: false,
    ghost: e.ghost,
    date: towerDate(e.startedAtMs),
    tier: tierFor(e.value, values.filter((_, j) => j !== i)),
  }));
  if (!todayUnranked) {
    ranked.push({
      value: todayLapS as number,
      today: true,
      ghost: false,
      date: towerDate(todayAtMs), // ignored by the component — it renders TODAY
      tier: tierFor(todayLapS, values),
    });
  }
  // Stable sort: on a tie, today (appended last) sits after the past lap.
  ranked.sort((a, b) => a.value - b.value);

  const p1 = ranked.length > 0 ? ranked[0].value : null;
  let pbFree = allTimeBestS !== null; // ● goes to the FIRST equal row only
  const rows: TowerRowModel[] = ranked.map((w, i) => {
    const pb = pbFree && w.value === allTimeBestS;
    if (pb) pbFree = false;
    return {
      pos: i + 1,
      time: fmt(w.value),
      tier: toTier(w.tier),
      gap: i === 0 ? '—' : `+${Math.round(w.value - (p1 as number))}s`,
      date: w.date,
      today: w.today,
      ghost: w.ghost,
      pb,
    };
  });

  if (todayUnranked) {
    // D-028: unranked, LAST — the slot-in travels zero rows from there.
    rows.push({
      pos: null,
      time: 'NO TIME',
      tier: 'est',
      gap: '',
      date: towerDate(todayAtMs),
      today: true,
      ghost: false,
      pb: false,
    });
  }

  return { rows };
}
