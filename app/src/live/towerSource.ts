/**
 * Live tower-position source for the final-gate handover (LAYOUT §2a beat 2,
 * Nathan 2026-08-15: lap tier chip + a static tower-position chip, e.g. "P3",
 * no new earcon).
 *
 * ── B-28 UNBUILT ─────────────────────────────────────────────────────────
 * Computing a real position needs the benchmark / ride-history store: the
 * trailing-28-day lap set per track, with the PO's ranking semantics (clean +
 * interrupted moving-time laps rank; estimated laps never rank; archive-
 * seeded ghosts rank marked, demoted if the D-024 cruise-σ tripwire fires).
 * None of that exists yet. Until it lands, this returns null and the real
 * RecordScreen renders NO position chip at all — never a fake or placeholder
 * rank. The Preview demo supplies scripted positions through the same
 * view-model field, so the render path is already shared (LAYOUT §3.8) and
 * B-28 only has to replace this function's body.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { LiveEngineState } from './engine.ts';
import { MIN_HISTORY, lapValues, positionAmong } from '../ui/colourModel.ts';

/**
 * B-28 BUILT (cycle 008): ranks the live lap against the archive ghost set for
 * the locked track (src/store/results.seed.json, recomputed by our own
 * pipeline). Returns null — and the screen then renders NO chip — whenever a
 * position would be a fiction: no track locked, no lap yet, an estimated lap
 * (D-028: estimated never ranks), or a route with no history.
 */
export function getLiveTowerPosition(st: LiveEngineState): string | null {
  if (st.track === null || st.lap === null) return null;
  if (st.lap.estimated) return null;
  // MOVING time only. Falling back to raw ranked a stopped-time-inflated lap
  // against everyone else's moving times -- not the same quantity (cycle 009).
  const mine = st.lap.movingS;
  if (mine === null) return null;
  const ghosts = lapValues(st.track);
  // Same noise floor as the colours: one ghost yielding "P1" is not a fact.
  if (ghosts.length < MIN_HISTORY) return null;
  return `P${positionAmong(mine, ghosts).pos} of ${ghosts.length + 1}`;
}
