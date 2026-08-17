/** GPX 1.1 generation. Pure — no expo, no Node imports.
 *
 * Round-trip constraint (load-bearing): core's parser (app/core/src/gpx.ts)
 * accepts a <trkpt> only as
 *   <trkpt lat="..." lon="...">  …  <ele>…</ele>  …  <time>…</time>
 * — exactly that attribute order, no other attributes on trkpt, ele before
 * time, and numbers matching [-\d.]+ (no exponent notation). Everything
 * emitted here honours that; see the round-trip check in README.md.
 */
import type { DecodedRide } from './types.ts';

/** Numbers must never render in exponent form or the core regex drops the point. */
function num(n: number): string {
  const s = String(n);
  return /[eE]/.test(s) ? n.toFixed(9) : s;
}

function isoTime(unixMs: number): string {
  return new Date(unixMs).toISOString(); // always YYYY-MM-DDTHH:MM:SS.sssZ
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Builds a GPX 1.1 document from a decoded ride.
 *
 * The GPX is a derived view; the JSONL stays the raw truth. Two derivations:
 * <ele> is mandatory for core's parser, so a fix without ele carries the last
 * known elevation (0 before any is seen); accuracyM has no GPX 1.1 home and is
 * deliberately not exported (it lives only in the JSONL).
 */
export function buildGpx(decoded: DecodedRide, rideId: string): string {
  const name = decoded.header?.rideId ?? rideId;
  // F-2 belt-and-braces: emit in timestamp order even if the JSONL lines are
  // not (a pre-fix ride on disk has one scrambled block). Stable sort; the
  // JSONL itself is never rewritten (D-023) — the GPX is a derived view.
  const fixes = [...decoded.fixes].sort((a, b) => a.tUnixMs - b.tUnixMs);
  const startMs = fixes[0]?.tUnixMs ?? decoded.header?.startedAtMs ?? 0;
  const pts: string[] = [];
  let lastEle = 0;
  for (const f of fixes) {
    if (f.ele !== undefined && Number.isFinite(f.ele)) lastEle = f.ele;
    pts.push(
      `   <trkpt lat="${num(f.lat)}" lon="${num(f.lon)}">\n` +
        `    <ele>${num(lastEle)}</ele>\n` +
        `    <time>${isoTime(f.tUnixMs)}</time>\n` +
        `   </trkpt>`,
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx creator="Qualifire" version="1.1" xmlns="http://www.topografix.com/GPX/1/1"` +
    ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"` +
    ` xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
    ` <metadata>\n  <time>${isoTime(startMs)}</time>\n </metadata>\n` +
    ` <trk>\n` +
    `  <name>${escapeXml(name)}</name>\n` +
    `  <type>ebikeride</type>\n` +
    `  <trkseg>\n` +
    pts.join('\n') +
    (pts.length > 0 ? '\n' : '') +
    `  </trkseg>\n` +
    ` </trk>\n` +
    `</gpx>\n`
  );
}
