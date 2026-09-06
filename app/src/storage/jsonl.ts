/** JSONL encode/decode for ride files. Pure — no expo, no Node imports.
 *
 * One JSON object per line, '\n'-terminated. Append-only: a killed process
 * tears at most the final line, and decodeRideFile drops any line that does
 * not parse — so a crash loses at most the last fix, never the ride.
 */
import type {
  DecodedRide,
  EndRecord,
  Fix,
  FixRecord,
  HeaderRecord,
  RideMeta,
  RideRecord,
} from './types.ts';
import { SCHEMA_VERSION } from './types.ts';

export function encodeHeader(rideId: string, startedAtMs: number, sportId?: string): string {
  const rec: HeaderRecord = {
    kind: 'header',
    schemaVersion: SCHEMA_VERSION,
    rideId,
    startedAtMs,
    recorder: 'qualifire-app',
    // WP-1: emitted only when given (absent, not null) so a ride started
    // with no sport in play stays byte-identical to the pre-WP-1 encoder.
    ...(sportId !== undefined ? { sportId } : {}),
  };
  return JSON.stringify(rec) + '\n';
}

/** Encodes the fix verbatim — JSON.stringify round-trips doubles exactly.
 * Optional fields are omitted (not null) when absent, key order is fixed. */
export function encodeFix(fix: Fix): string {
  const rec: FixRecord = {
    kind: 'fix',
    tUnixMs: fix.tUnixMs,
    lat: fix.lat,
    lon: fix.lon,
    ...(fix.ele !== undefined ? { ele: fix.ele } : {}),
    ...(fix.accuracyM !== undefined ? { accuracyM: fix.accuracyM } : {}),
    // Cycle 025 (WP-stale-first-fix P1): ADDITIVE flag fields only — written
    // when true, omitted otherwise, so an unflagged fix's line stays
    // byte-identical to the pre-flag encoder (D-023; pinned by a test).
    // decodeRideFile needs no change: it pushes parsed fix records verbatim,
    // so the flags round-trip automatically.
    ...(fix.preStart === true ? { preStart: true } : {}),
    ...(fix.warmup === true ? { warmup: true } : {}),
  };
  return JSON.stringify(rec) + '\n';
}

export function encodeEnd(endedAtMs: number, nFixes: number): string {
  const rec: EndRecord = { kind: 'end', endedAtMs, nFixes };
  return JSON.stringify(rec) + '\n';
}

/** The '\n' needed to heal a torn tail (mid-write kill left the file without a
 * trailing newline), or '' when the text is empty/absent or already terminated.
 * Healing only isolates the torn fragment onto its own line — it never rewrites
 * a record (the raw trace stays verbatim). */
export function healTornTail(text: string | null): string {
  return text !== null && text !== '' && !text.endsWith('\n') ? '\n' : '';
}

/** Tolerant decoder: unparseable or unknown-kind lines are counted, not fatal. */
export function decodeRideFile(text: string): DecodedRide {
  const out: DecodedRide = { header: null, fixes: [], end: null, nDropped: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let rec: RideRecord;
    try {
      rec = JSON.parse(line) as RideRecord;
    } catch {
      out.nDropped += 1;
      continue;
    }
    if (rec && rec.kind === 'header') out.header = rec;
    else if (rec && rec.kind === 'fix' && Number.isFinite(rec.tUnixMs)) out.fixes.push(rec);
    else if (rec && rec.kind === 'end') out.end = rec;
    else out.nDropped += 1;
  }
  return out;
}

/** The fixes in chronological (tUnixMs) order — a stable sort of a COPY.
 * decodeRideFile's own `fixes` stay in FILE order on purpose: that array is
 * the F-2 tests' oracle for "file order == call order", and the raw JSONL
 * is never rewritten (D-023). File order is NOT guaranteed chronological
 * (WP-B cycle 2, 2026-09-04: route 20260903-182911-3c34's reference line was
 * built from a scrambled block of fixes and came out 13.96 km for a 5.7 km
 * ride, gates bunched on the doubled-back stretch). Every consumer that
 * walks fixes as a path or a time series goes through this. */
export function chronologicalFixes<T extends { tUnixMs: number }>(fixes: readonly T[]): T[] {
  return [...fixes].sort((a, b) => a.tUnixMs - b.tUnixMs);
}

/** Meta is derived from the fixes actually on disk, not from the end record —
 * so a crashed (end-less) ride still reports honest numbers. Start/end are
 * the earliest/latest fix on disk, not the first/last line (file order is
 * not guaranteed chronological — see chronologicalFixes). */
export function deriveMeta(decoded: DecodedRide, rideId: string): RideMeta {
  const n = decoded.fixes.length;
  const fallback = decoded.header?.startedAtMs ?? 0;
  const inOrder = chronologicalFixes(decoded.fixes);
  return {
    rideId: decoded.header?.rideId ?? rideId,
    startMs: n > 0 ? inOrder[0].tUnixMs : fallback,
    endMs: n > 0 ? inOrder[n - 1].tUnixMs : fallback,
    nFixes: n,
    // WP-1: carried onto RideMeta only when the header has it, so an
    // unstamped (pre-WP-1) ride still derives `sportId: undefined`.
    ...(decoded.header?.sportId !== undefined ? { sportId: decoded.header.sportId } : {}),
  };
}
