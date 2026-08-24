/** JSONL encode/decode for the GPX+ events sidecar. Pure — no expo, no Node. */
import type { DecodedEvents, RideEvent } from './types.ts';

const KINDS = new Set([
  'meta', 'button', 'lock', 'gate', 'storageError', 'relaunch',
  'routeMatchDiagnostic', 'elevationOutlier',
]);

/** kind first, tUnixMs second, then the kind's own fields — verbatim values. */
export function encodeEvent(ev: RideEvent): string {
  const { kind, tUnixMs, ...rest } = ev;
  return JSON.stringify({ kind, tUnixMs, ...rest }) + '\n';
}

/** WP-G 1c (B-69 hardening): per-kind required-field validation. A line that
 * parses as JSON and carries a known kind + finite tUnixMs can still be
 * unusable downstream — e.g. a hand-corrupted `lock` line missing `track` or
 * `atT` used to decode successfully and then THROW inside gpxPlusExport.ts
 * (escapeXml(undefined) / isoTime(NaN)). Rejecting it HERE, at the tolerant
 * decoder boundary, means export code never has to defend against a
 * malformed event again — a dropped line is counted (nDropped), never
 * "repaired", consistent with the decoder's existing doctrine. */
// WP-G follow-up fix: Number.isFinite alone isn't a valid-date check — an
// absurd-but-finite value (e.g. 1e18) is finite yet throws RangeError from
// `new Date(...).toISOString()` downstream in gpxPlusExport.ts's isoTime().
// 8.64e15 is JS Date's own documented representable range in milliseconds.
const MAX_TIME_MS = 8.64e15;
function isFiniteMsTime(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_TIME_MS;
}

function isValidEvent(rec: unknown): rec is RideEvent {
  if (!rec || typeof rec !== 'object') return false;
  const r = rec as Record<string, unknown>;
  if (typeof r.kind !== 'string' || !KINDS.has(r.kind) || !isFiniteMsTime(r.tUnixMs)) return false;
  switch (r.kind) {
    case 'meta':
      return (
        Number.isFinite(r.schemaVersion) &&
        (r.appVersion === undefined || typeof r.appVersion === 'string')
      );
    case 'button':
      return r.button === 'start' || r.button === 'pause' || r.button === 'resume' || r.button === 'end';
    case 'lock':
      return (
        typeof r.track === 'string' &&
        Number.isFinite(r.atChainageM) &&
        typeof r.atT === 'number' &&
        isFiniteMsTime(r.atT * 1000)
      );
    case 'gate':
      return (
        typeof r.track === 'string' &&
        Number.isFinite(r.gateIndex) &&
        typeof r.t === 'number' &&
        isFiniteMsTime(r.t * 1000) &&
        typeof r.estimated === 'boolean'
      );
    case 'storageError':
      return typeof r.message === 'string';
    case 'relaunch':
      return true; // no fields beyond kind/tUnixMs
    case 'routeMatchDiagnostic':
      return (
        typeof r.track === 'string' &&
        (r.phase === 'anchor' || r.phase === 'retry' || r.phase === 'lock') &&
        Number.isFinite(r.thresholdM) &&
        typeof r.poorAccuracy === 'boolean' &&
        (r.accuracyM === null || Number.isFinite(r.accuracyM)) &&
        // xtdM is optional (added after this event kind first shipped) — an
        // older sidecar line without it must still decode.
        (r.xtdM === undefined || r.xtdM === null || Number.isFinite(r.xtdM))
      );
    case 'elevationOutlier':
      return Number.isFinite(r.deltaM) && Number.isFinite(r.dtS) && Number.isFinite(r.thresholdMps);
    default:
      return false;
  }
}

/** Tolerant decoder: unparseable / unknown-kind / non-finite-time / missing
 * required-field lines are counted, not fatal. */
export function decodeEventsFile(text: string): DecodedEvents {
  const out: DecodedEvents = { events: [], nDropped: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let rec: unknown;
    try { rec = JSON.parse(line); } catch { out.nDropped += 1; continue; }
    if (isValidEvent(rec)) out.events.push(rec);
    else out.nDropped += 1;
  }
  return out;
}
