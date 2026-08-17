/**
 * The derive step: raw fixes → one RideResult. Pure.
 *
 * This is the *only* thing that manufactures a RideResult, and it manufactures
 * it entirely from raw lat/lon/t through app/core — the parity-proven engine —
 * so D-023 holds literally: delete every result and the whole store rebuilds
 * from the JSONL with identical numbers. Nothing here reads a stored benchmark,
 * and nothing here decides a colour.
 *
 * Quality mapping from core's SectorFlag, matching the live layer (D-025):
 *   clean              → 'clean'
 *   interrupted        → 'interrupted'      (stop inside; moving time still real)
 *   excluded_offroute  → 'missed'           (detour; never scored, D-015)
 *   excluded_nocross   → 'missed'           (gate never crossed)
 * 'estimated' is NOT inferred here. Measured while building this (2026-08-16):
 * offline, a GPS gap does not produce an interpolated sector at all — the
 * projector's forward search window (~240 m) cannot skip the hole, so the fixes
 * after it project badly and core flags the sector `excluded_offroute`. Punching
 * a synthetic 90 s hole into a clean ride reproduces it exactly. So offline the
 * honest verdict is 'missed'. 'estimated' is a LIVE concept — a gate that fired
 * under the D-016(a) re-acquisition rule — and reaches this function only when
 * the caller passes those sector indexes in. Offline never invents it.
 *
 * Note on import style: explicit `.ts` specifiers, the repo convention the QA
 * suite resolves natively. (live/engine.ts still uses Metro-style extensionless
 * imports and needs the harness shim — normalizing it would retire that.)
 */
import {
  computeKinematics,
  projectRideOffline,
  sectorTimes,
  stoppedTimeBetween,
  toXY,
  type RefLine,
} from '../../core/src/index.ts';
import type { RideResult, SectorQuality, SectorResult } from './types.ts';
import { RESULT_SCHEMA_VERSION } from './types.ts';

export interface DeriveInput {
  rideId: string;
  /** epoch seconds, ascending */
  t: ArrayLike<number>;
  lat: ArrayLike<number>;
  lon: ArrayLike<number>;
  ref: RefLine;
  /** gate chainages [start..finish]; N gates ⇒ N-1 sectors */
  gates: number[];
  routeId: string;
  gateSetVersion: number;
  engineVersion: string;
  source?: 'app' | 'archive';
  tripwireDemoted?: boolean;
  /** 1-based sector indexes the LIVE layer scored under re-acquisition; only
   * these become 'estimated'. Offline never infers it (see header). */
  estimatedSectors?: number[];
}

export function deriveRideResult(inp: DeriveInput): RideResult {
  const estimated = new Set(inp.estimatedSectors ?? []);
  const { x, y } = toXY(inp.lat, inp.lon, inp.ref.lat0, inp.ref.lon0);
  const { s, xtd } = projectRideOffline(x, y, inp.ref);
  const { stopped } = computeKinematics(inp.t, x, y);
  const rows = sectorTimes({ t: inp.t, s, xtd, stopped }, inp.gates);

  const sectors: SectorResult[] = rows.map((r, k) => {
    let quality: SectorQuality =
      r.flag === 'clean' ? 'clean' : r.flag === 'interrupted' ? 'interrupted' : 'missed';
    if (quality !== 'missed' && estimated.has(r.sector)) quality = 'estimated';
    const raw = r.rawS ?? 0;
    return {
      index: r.sector,
      fromChainageM: inp.gates[k],
      toChainageM: inp.gates[k + 1],
      rawS: raw,
      // estimated ⇒ raw only. An estimated sector must never carry a moving
      // time, or a gap-derived number could be coloured or ranked.
      movingS: quality === 'estimated' || quality === 'missed' ? null : (r.movingS ?? null),
      quality,
    };
  });

  // The lap spans the first to the last gate, and inherits the worst sector:
  // one missed sector means there is no lap at all; one estimated sector makes
  // the lap estimated (raw only); one interrupted sector makes it interrupted.
  const first = rows[0];
  const last = rows[rows.length - 1];
  const anyMissed = sectors.some((x2) => x2.quality === 'missed');
  const anyEstimated = sectors.some((x2) => x2.quality === 'estimated');
  const anyInterrupted = sectors.some((x2) => x2.quality === 'interrupted');
  const lapQuality: SectorQuality = anyMissed
    ? 'missed'
    : anyEstimated
      ? 'estimated'
      : anyInterrupted
        ? 'interrupted'
        : 'clean';

  const haveBounds = first?.tA != null && last?.tB != null;
  const lapRaw = haveBounds ? (last.tB as number) - (first.tA as number) : 0;
  const lapStopped = haveBounds
    ? stoppedTimeBetween(inp.t, stopped, first.tA as number, last.tB as number)
    : 0;

  return {
    kind: 'rideResult',
    schemaVersion: RESULT_SCHEMA_VERSION,
    rideId: inp.rideId,
    startedAtMs: Math.round((inp.t[0] as number) * 1000),
    routeId: anyMissed && !haveBounds ? null : inp.routeId,
    source: inp.source ?? 'app',
    lap: {
      rawS: lapRaw,
      movingS: lapQuality === 'clean' || lapQuality === 'interrupted' ? lapRaw - lapStopped : null,
      quality: lapQuality,
    },
    sectors,
    ...(inp.tripwireDemoted ? { tripwireDemoted: true } : {}),
    derivedBy: {
      engineVersion: inp.engineVersion,
      gateSetVersion: inp.gateSetVersion,
      resultSchemaVersion: RESULT_SCHEMA_VERSION,
    },
  };
}
