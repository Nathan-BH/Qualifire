/** GPX 1.1 + qf: extensions (GPX+ diagnostics). Pure — no expo, no Node imports.
 *
 * exportGpx (gpxExport.ts) stays byte-identical: GPX+ only ADDS an
 * xmlns:qf attribute on <gpx>, an optional per-trkpt <extensions><qf:acc>
 * (only when accuracyM is present), and a file-level <extensions><qf:session>
 * block between </trk> and </gpx>. Everything else — point order, elevation
 * carry-forward, metadata/name/type — matches buildGpx exactly.
 *
 * Round-trip constraint (same as gpxExport.ts): core's parser only looks at
 * <trkpt lat lon><ele><time>, so the <extensions> blocks added here (both
 * placed AFTER <time>/</trk>) and the extra xmlns:qf attribute are invisible
 * to it — GPX+ documents parse identically to standard GPX and stay
 * Strava-safe (GPX 1.1 schema also requires file-level <extensions> after
 * <trk>).
 *
 * Only what was actually observed is ever emitted — no field is fabricated
 * when its source event/data is absent.
 */
import type {
  ButtonEvent,
  DecodedEvents,
  DecodedRide,
  ElevationOutlierEvent,
  FixRecord,
  GateFireEvent,
  LockEvent,
  MetaEvent,
  RouteMatchDiagnosticEvent,
  StorageErrorEvent,
} from './types.ts';
import { escapeXml, isoTime, num } from './gpxExport.ts';
import { computeKinematics, PROPOSED_GATES, toXY, type TrackId } from '../../core/src/index.ts';

/** Consecutive fixes further apart than this (seconds) count as a GPS outage. */
export const OUTAGE_GAP_S = 5;

function gateName(track: string, gateIndex: number): string {
  return PROPOSED_GATES[track as TrackId]?.[gateIndex]?.name ?? `gate${gateIndex}`;
}

/** Cycle 023 fix 4: total distance (m) along the matched route, START gate
 * to FINISH gate (FINISH chainage minus START chainage — START itself sits
 * at a non-zero chainage, ~162 m on every current track, so the raw FINISH
 * chainage alone overstates the ridden distance by that offset), for a
 * track id actually present in PROPOSED_GATES. Guarded lookup — an
 * unrecognized/unknown persisted track string (an old ride whose track was
 * since renamed or dropped) returns null so the caller omits the field
 * instead of throwing and killing the whole export. */
function routeDistanceM(track: string): number | null {
  const gates = PROPOSED_GATES[track as TrackId];
  if (!gates || gates.length === 0) return null;
  return gates[gates.length - 1].chainage - gates[0].chainage;
}

interface Outage {
  fromMs: number;
  toMs: number;
  gapS: number;
}

/** Every consecutive fix pair further apart than OUTAGE_GAP_S. `fixes` must
 * already be sorted by tUnixMs. */
function findOutages(fixes: FixRecord[]): Outage[] {
  const out: Outage[] = [];
  for (let i = 1; i < fixes.length; i++) {
    const gapS = (fixes[i].tUnixMs - fixes[i - 1].tUnixMs) / 1000;
    if (gapS > OUTAGE_GAP_S) out.push({ fromMs: fixes[i - 1].tUnixMs, toMs: fixes[i].tUnixMs, gapS });
  }
  return out;
}

interface Stop {
  fromMs: number;
  toMs: number;
}

/** Maximal runs of stopped fixes per core/kinematics.ts's own defaults
 * (STOP_V_MS = 1.0, STOP_T_S = 3.0). `fixes` must already be sorted. */
function findStops(fixes: FixRecord[]): Stop[] {
  if (fixes.length < 2) return [];
  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const tSec = fixes.map((f) => f.tUnixMs / 1000);
  const { x, y } = toXY(lats, lons, lats[0], lons[0]);
  const { stopped } = computeKinematics(tSec, x, y);
  const out: Stop[] = [];
  let i = 0;
  while (i < stopped.length) {
    if (stopped[i]) {
      let j = i;
      while (j + 1 < stopped.length && stopped[j + 1]) j++;
      out.push({ fromMs: fixes[i].tUnixMs, toMs: fixes[j].tUnixMs });
      i = j + 1;
    } else {
      i++;
    }
  }
  return out;
}

/** Builds the ` <extensions>\n  <qf:session>...\n </extensions>\n` block.
 * Always emitted for a GPX+ document, even when every child is omitted. */
function buildSessionBlock(fixes: FixRecord[], events: DecodedEvents | null): string {
  const evs = events?.events ?? [];
  const lines: string[] = [];

  const metaEv = evs.find((e): e is MetaEvent => e.kind === 'meta' && e.appVersion !== undefined);
  if (metaEv) lines.push(`   <qf:appVersion>${escapeXml(metaEv.appVersion!)}</qf:appVersion>`);

  const startEv = evs.find((e): e is ButtonEvent => e.kind === 'button' && e.button === 'start');
  if (startEv) lines.push(`   <qf:startPressedAt>${isoTime(startEv.tUnixMs)}</qf:startPressedAt>`);

  const firstFix = fixes.length > 0 ? fixes[0] : null;
  if (firstFix) lines.push(`   <qf:firstFixAt>${isoTime(firstFix.tUnixMs)}</qf:firstFixAt>`);

  if (startEv && firstFix) {
    const delayS = (firstFix.tUnixMs - startEv.tUnixMs) / 1000;
    lines.push(`   <qf:firstFixDelayS>${num(delayS)}</qf:firstFixDelayS>`);
  }

  if (events !== null) {
    const lockEv = evs.find((e): e is LockEvent => e.kind === 'lock');
    if (lockEv) {
      lines.push(
        `   <qf:routeLock track="${escapeXml(lockEv.track)}" atChainageM="${num(lockEv.atChainageM)}" atT="${isoTime(lockEv.atT * 1000)}"/>`,
      );
      // Cycle 023 fix 4: only emitted when the locked track is recognized —
      // an old/renamed track id degrades to no field, never an export failure.
      const dist = routeDistanceM(lockEv.track);
      if (dist !== null) lines.push(`   <qf:routeDistanceM>${num(dist)}</qf:routeDistanceM>`);
    } else {
      lines.push(`   <qf:routeLock>none</qf:routeLock>`);
    }
  }

  const gateEvs = evs.filter((e): e is GateFireEvent => e.kind === 'gate');
  if (gateEvs.length > 0) {
    lines.push(`   <qf:gates>`);
    for (const g of gateEvs) {
      lines.push(
        `    <qf:gate name="${escapeXml(gateName(g.track, g.gateIndex))}" t="${isoTime(g.t * 1000)}" estimated="${g.estimated ? 'true' : 'false'}"/>`,
      );
    }
    lines.push(`   </qf:gates>`);
  }

  // Cycle 023 fix 5b: route-match diagnostics — every candidate's anchor/
  // retry/lock attempts, so a ride that never locked still leaves a trail.
  const routeMatchEvs = evs.filter((e): e is RouteMatchDiagnosticEvent => e.kind === 'routeMatchDiagnostic');
  if (routeMatchEvs.length > 0) {
    lines.push(`   <qf:routeMatchDiagnostics>`);
    for (const d of routeMatchEvs) {
      const acc = d.accuracyM === null ? '' : ` accuracyM="${num(d.accuracyM)}"`;
      lines.push(
        `    <qf:attempt track="${escapeXml(d.track)}" phase="${d.phase}"${acc}` +
          ` thresholdM="${num(d.thresholdM)}" poorAccuracy="${d.poorAccuracy ? 'true' : 'false'}"` +
          ` t="${isoTime(d.tUnixMs)}"/>`,
      );
    }
    lines.push(`   </qf:routeMatchDiagnostics>`);
  }

  // Cycle 023 fix 3/5b: flagged elevation outliers — the raw <ele> values
  // above are never touched (D-023); this is purely a diagnostic side-channel.
  const elevationEvs = evs.filter((e): e is ElevationOutlierEvent => e.kind === 'elevationOutlier');
  if (elevationEvs.length > 0) {
    lines.push(`   <qf:elevationOutliers>`);
    for (const o of elevationEvs) {
      lines.push(
        `    <qf:elevationOutlier t="${isoTime(o.tUnixMs)}" deltaM="${num(o.deltaM)}"` +
          ` dtS="${num(o.dtS)}" thresholdMps="${num(o.thresholdMps)}"/>`,
      );
    }
    lines.push(`   </qf:elevationOutliers>`);
  }

  const outages = findOutages(fixes);
  if (outages.length > 0) {
    lines.push(`   <qf:outages>`);
    for (const o of outages) {
      lines.push(`    <qf:outage fromT="${isoTime(o.fromMs)}" toT="${isoTime(o.toMs)}" maxGapS="${num(o.gapS)}"/>`);
    }
    lines.push(`   </qf:outages>`);
  }

  const stops = findStops(fixes);
  if (stops.length > 0) {
    lines.push(`   <qf:stops>`);
    for (const s of stops) {
      lines.push(`    <qf:stop fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"/>`);
    }
    lines.push(`   </qf:stops>`);
  }

  if (events !== null) {
    const errs = evs.filter((e): e is StorageErrorEvent => e.kind === 'storageError');
    if (errs.length > 0) {
      lines.push(`   <qf:storageErrors count="${errs.length}">`);
      lines.push(`    <qf:lastMessage>${escapeXml(errs[errs.length - 1].message)}</qf:lastMessage>`);
      lines.push(`   </qf:storageErrors>`);
    } else {
      lines.push(`   <qf:storageErrors count="0"/>`);
    }

    const relaunches = evs.filter((e) => e.kind === 'relaunch').length;
    lines.push(`   <qf:relaunches count="${relaunches}"/>`);
  }

  const buttonEvs = evs.filter((e): e is ButtonEvent => e.kind === 'button');
  if (buttonEvs.length > 0) {
    lines.push(`   <qf:buttons>`);
    for (const b of buttonEvs) {
      lines.push(`    <qf:button kind="${escapeXml(b.button)}" t="${isoTime(b.tUnixMs)}"/>`);
    }
    lines.push(`   </qf:buttons>`);
  }

  return (
    ` <extensions>\n` +
    `  <qf:session>\n` +
    (lines.length > 0 ? lines.join('\n') + '\n' : '') +
    `  </qf:session>\n` +
    ` </extensions>\n`
  );
}

/** Builds a GPX 1.1 + qf: extensions document from a decoded ride and its
 * (possibly absent) events sidecar. `events === null` means no sidecar file
 * exists on disk (pre-GPX+ ride, or one that never got any diagnostics
 * events) — every events-sourced field is omitted rather than fabricated. */
export function buildGpxPlus(decoded: DecodedRide, events: DecodedEvents | null, rideId: string): string {
  const name = decoded.header?.rideId ?? rideId;
  const fixes = [...decoded.fixes].sort((a, b) => a.tUnixMs - b.tUnixMs);
  const startMs = fixes[0]?.tUnixMs ?? decoded.header?.startedAtMs ?? 0;
  const pts: string[] = [];
  let lastEle = 0;
  for (const f of fixes) {
    if (f.ele !== undefined && Number.isFinite(f.ele)) lastEle = f.ele;
    const accLine =
      f.accuracyM !== undefined && Number.isFinite(f.accuracyM)
        ? `    <extensions><qf:acc>${num(f.accuracyM)}</qf:acc></extensions>\n`
        : '';
    pts.push(
      `   <trkpt lat="${num(f.lat)}" lon="${num(f.lon)}">\n` +
        `    <ele>${num(lastEle)}</ele>\n` +
        `    <time>${isoTime(f.tUnixMs)}</time>\n` +
        accLine +
        `   </trkpt>`,
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx creator="Qualifire" version="1.1" xmlns="http://www.topografix.com/GPX/1/1"` +
    ` xmlns:qf="https://qualifire.local/gpx/1"` +
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
    buildSessionBlock(fixes, events) +
    `</gpx>\n`
  );
}
