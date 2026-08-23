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

/** Tolerant decoder: unparseable / unknown-kind / non-finite-time lines are counted, not fatal. */
export function decodeEventsFile(text: string): DecodedEvents {
  const out: DecodedEvents = { events: [], nDropped: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let rec: RideEvent;
    try { rec = JSON.parse(line) as RideEvent; } catch { out.nDropped += 1; continue; }
    if (rec && KINDS.has(rec.kind) && Number.isFinite(rec.tUnixMs)) out.events.push(rec);
    else out.nDropped += 1;
  }
  return out;
}
