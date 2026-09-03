/** GPX 1.1 + qf: extensions (GPX+ diagnostics). Pure — no expo, no Node imports.
 *
 * exportGpx (gpxExport.ts) stays byte-identical: GPX+ only ADDS an
 * xmlns:qf attribute on <gpx>, an optional per-trkpt <extensions> block
 * (<qf:acc> when accuracyM is present; <qf:preStart/> / <qf:warmup/> when
 * the fix carries a cycle-025 stale-fix flag), and a file-level
 * <extensions><qf:session> block between </trk> and </gpx>. Everything else
 * — point order, elevation
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
 *
 * N9 (2026-09-02): the session block also carries, when recorded, a single
 * <qf:pick> (the RECORD-tab pick/mode/labels in effect at START, right after
 * <qf:startPressedAt>) and a <qf:lockChanges> wrapper (one <qf:lockChange>
 * per live/engine.ts LockKind transition, in sidecar order) — plus the
 * <qf:routeLock pick="…"/> attribute, which was persisted since cycle 024
 * but never rendered before this pass.
 */
import type {
  ButtonEvent,
  DecodedEvents,
  DecodedRide,
  ElevationOutlierEvent,
  FixRecord,
  GateFireEvent,
  LockChangeEvent,
  LockEvent,
  MetaEvent,
  PickEvent,
  RelaunchEvent,
  RouteMatchDiagnosticEvent,
  StorageErrorEvent,
} from './types.ts';
import { escapeXml, isoTime, num } from './gpxExport.ts';
import {
  CORRIDOR_M, computeKinematics, projectRideOffline, PROPOSED_GATES, toXY,
  type RefLine, type TrackId,
} from '../../core/src/index.ts';

/** WP-G Part 4: looks up a track's reference polyline, or throws for an
 * unrecognized id. INJECTED rather than statically imported from
 * '../live/refs.ts' — that module's `import ... from '.../refs.json'` is a
 * bare JSON import Metro bundles fine but Node's ESM loader cannot load
 * without a loader hook, and this file (via storage/core.ts) is loaded
 * eagerly/statically by nearly every headless test suite, long before any
 * such hook could be registered. storage/index.ts (the real device wiring,
 * never imported headlessly) supplies the real refs.ts lookup; tests inject
 * their own Node-safe one (tests/lib.ts's refFor) only where they exercise
 * this feature. No injection => the routeFidelity block is simply omitted,
 * same honest-omission doctrine as an unrecognized track below. */
export type RefLookup = (track: string) => RefLine;

/** Consecutive fixes further apart than this (seconds) count as a GPS outage. */
export const OUTAGE_GAP_S = 5;

/** Cycle 025 (WP-stale-first-fix P3): accuracy gate for max-speed samples.
 * The 2026-08-23/24/25 reviews' fake 43–92 km/h "sprints" all came from
 * points that were poor-accuracy and/or immediately after an outage resumed
 * — a max-speed figure Qualifire shows must filter on BOTH qf:acc and
 * gap-adjacency (the 24th's rule, re-endorsed by the 25th). 20 m sits below
 * every observed warm-up/catch-up accuracy worth distrusting here and above
 * a normal riding fix; deliberately NOT engine.ts's POOR_ACCURACY_M = 50
 * (matcher-anchoring calibration, owned by B-75). */
export const MAX_SPEED_ACC_M = 20;

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

interface OffRouteSeg {
  fromMs: number;
  toMs: number;
  maxDistM: number;
}

/** WP-G Part 4: maximal runs of fixes whose cross-track deviation exceeds the
 * corridor, lasting >=5 s (a single noisy fix is not "off route"). `fixes`
 * and `xtd` must be index-aligned and `fixes` sorted by tUnixMs. */
function findOffRouteSegments(fixes: FixRecord[], xtd: Float64Array, corridorM: number): OffRouteSeg[] {
  const out: OffRouteSeg[] = [];
  let i = 0;
  while (i < fixes.length) {
    if (xtd[i] > corridorM) {
      let j = i;
      let maxDist = xtd[i];
      while (j + 1 < fixes.length && xtd[j + 1] > corridorM) {
        j += 1;
        if (xtd[j] > maxDist) maxDist = xtd[j];
      }
      const fromMs = fixes[i].tUnixMs;
      const toMs = fixes[j].tUnixMs;
      if ((toMs - fromMs) / 1000 >= 5) out.push({ fromMs, toMs, maxDistM: maxDist });
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return out;
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

/** Cycle 025 (WP-stale-first-fix P3): max speed, km/h, over already-
 * flag-filtered fixes, with the review-mandated filter: the speed sample
 * (fix i-1 -> fix i) is discarded when either endpoint's accuracy is worse
 * than MAX_SPEED_ACC_M, when the pair itself spans an outage gap, or when it
 * is the first sample after an outage resumes (mid-ride re-acquisition
 * catch-up — the fake 50–83 km/h points of 2026-08-24/25 that P1's
 * pre-START rule alone cannot catch). undefined accuracy = "unknown, never
 * poor" (engine.ts's doctrine). Returns null when no sample survives —
 * honest omission, never a fabricated 0. NOT core/src/live.ts's
 * re-acquisition hop bounding (vMaxReacq) nor engine.ts's REACQ_JUMP_M
 * advance discount (B-90 family): those guard the lock race's evidence;
 * this guards a summary statistic. Cite, don't merge (WP ruling). */
function computeMaxSpeedKmh(fixes: FixRecord[]): number | null {
  if (fixes.length < 2) return null;
  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const tSec = fixes.map((f) => f.tUnixMs / 1000);
  const { x, y } = toXY(lats, lons, lats[0], lons[0]);
  const { v } = computeKinematics(tSec, x, y);
  const accOk = (f: FixRecord): boolean => f.accuracyM === undefined || f.accuracyM <= MAX_SPEED_ACC_M;
  const gapAt = (i: number): boolean => tSec[i] - tSec[i - 1] > OUTAGE_GAP_S;
  let best: number | null = null;
  for (let i = 1; i < fixes.length; i++) {
    if (!accOk(fixes[i]) || !accOk(fixes[i - 1])) continue;
    if (gapAt(i)) continue;
    if (i >= 2 && gapAt(i - 1)) continue;
    if (best === null || v[i] > best) best = v[i];
  }
  return best === null ? null : best * 3.6;
}

/** Builds the ` <extensions>\n  <qf:session>...\n </extensions>\n` block.
 * Always emitted for a GPX+ document, even when every child is omitted. */
function buildSessionBlock(
  fixes: FixRecord[], events: DecodedEvents | null, refFor: RefLookup | undefined,
): string {
  const evs = events?.events ?? [];
  const lines: string[] = [];

  const metaEv = evs.find((e): e is MetaEvent => e.kind === 'meta' && e.appVersion !== undefined);
  if (metaEv) lines.push(`   <qf:appVersion>${escapeXml(metaEv.appVersion!)}</qf:appVersion>`);

  const startEv = evs.find((e): e is ButtonEvent => e.kind === 'button' && e.button === 'start');
  if (startEv) lines.push(`   <qf:startPressedAt>${isoTime(startEv.tUnixMs)}</qf:startPressedAt>`);

  // N9 (2026-09-02, GPX+ pick/lock-change logging): a START-time fact,
  // rendered once, right after startPressedAt — attributes only for what was
  // actually recorded (PickEvent's own fields are all optional beyond mode).
  const pickEv = evs.find((e): e is PickEvent => e.kind === 'pick');
  if (pickEv) {
    const a = (k: string, v: string | null | undefined): string =>
      v === undefined || v === null ? '' : ` ${k}="${escapeXml(v)}"`;
    lines.push(
      `   <qf:pick mode="${pickEv.mode}"` +
        a('from', pickEv.from) + a('fromLabel', pickEv.fromLabel) +
        a('to', pickEv.to) + a('toLabel', pickEv.toLabel) +
        a('routeId', pickEv.routeId) +
        (pickEv.pickSource === undefined ? '' : ` pickSource="${pickEv.pickSource}"`) +
        (pickEv.routeIds ? ` routeIds="${escapeXml(pickEv.routeIds.join(' '))}"` : '') +
        ` t="${isoTime(pickEv.tUnixMs)}"/>`,
    );
  }

  // Cycle 025 (WP-stale-first-fix P1/P2, Nathan 2026-08-26 record-but-flag):
  // every fix-DERIVED stat in this block (firstFixAt/firstFixDelayS, outages,
  // stops, routeFidelity, maxSpeedKmh) excludes flagged fixes — the recorded
  // preStart/warmup flags, PLUS an export-time pre-START timestamp test
  // against the start press, so the four ride files recorded before the
  // flags existed clean up on re-export too. Derived-side only: buildGpxPlus
  // still renders every fix as a trkpt, and the raw JSONL is never rewritten
  // (D-023). firstFixDelayS semantics (P2, decided this pass): the delay to
  // the first NON-flagged fix — >= 0 by construction, never again "how stale
  // was the cached fix"; the excluded points are counted in qf:excludedFixes
  // (and flagged per-trkpt) rather than silently vanishing.
  const isExcluded = (f: FixRecord): boolean =>
    f.preStart === true || f.warmup === true ||
    (startEv !== undefined && f.tUnixMs < startEv.tUnixMs);
  const cleanFixes = fixes.filter((f) => !isExcluded(f));
  const nPreStart = fixes.filter(
    (f) => f.preStart === true || (startEv !== undefined && f.tUnixMs < startEv.tUnixMs),
  ).length;
  const nWarmup = fixes.length - cleanFixes.length - nPreStart;

  const firstFix = cleanFixes.length > 0 ? cleanFixes[0] : null;
  if (firstFix) lines.push(`   <qf:firstFixAt>${isoTime(firstFix.tUnixMs)}</qf:firstFixAt>`);

  if (startEv && firstFix) {
    const delayS = (firstFix.tUnixMs - startEv.tUnixMs) / 1000;
    lines.push(`   <qf:firstFixDelayS>${num(delayS)}</qf:firstFixDelayS>`);
  }
  if (nPreStart + nWarmup > 0) {
    lines.push(`   <qf:excludedFixes preStart="${nPreStart}" warmup="${nWarmup}"/>`);
  }

  if (events !== null) {
    const lockEvs = evs.filter((e): e is LockEvent => e.kind === 'lock');
    if (lockEvs.length > 0) {
      // Cycle 025 (P3): EVERY lock event is exported, in sidecar order — the
      // old evs.find() took only the FIRST lock, silently discarding the
      // rest (e.g. the settled lock that followed a transient soft display
      // lock). Repeating qf:routeLock keeps the shape additive/backward-
      // compatible: a consumer that read "the" routeLock still finds the
      // first element first. lockKind is emitted only when the event carries
      // it (a pre-WP-D2 sidecar doesn't — honest omission); its values are a
      // closed literal union ('soft'|'verified'|'finalized'), no escaping
      // needed.
      for (const l of lockEvs) {
        const lk = l.lockKind === undefined ? '' : ` lockKind="${l.lockKind}"`;
        // N9: render the pick that was in effect when this lock fired —
        // persisted since cycle 024 (LockEvent.pick), never shown before.
        const pk = l.pick === undefined || l.pick === null ? '' : ` pick="${escapeXml(l.pick)}"`;
        lines.push(
          `   <qf:routeLock track="${escapeXml(l.track)}" atChainageM="${num(l.atChainageM)}" atT="${isoTime(l.atT * 1000)}"${lk}${pk}/>`,
        );
      }
      // Cycle 023 fix 4 (semantics unchanged by P3): distance keyed to the
      // FIRST lock's track; only emitted when that track is recognized — an
      // old/renamed track id degrades to no field, never an export failure.
      const dist = routeDistanceM(lockEvs[0].track);
      if (dist !== null) lines.push(`   <qf:routeDistanceM>${num(dist)}</qf:routeDistanceM>`);
      // WP-G Part 4: session-level route fidelity — only emitted when the
      // ride actually SETTLED on a route, not merely soft-locked (a soft
      // lock is "a display choice, not a narrowing of the evidence" per
      // engine.ts — publishing a fidelity % against it would be an unearned
      // claim, D-025/D-028). Take the LAST lock event whose lockKind isn't
      // 'soft' (undefined lockKind = pre-WP-D2 sidecar, treated as settled;
      // there was only one kind of lock then).
      // AND a refFor lookup was actually injected (see RefLookup's doc
      // comment). Session-level + off-route segments, not per-point
      // (cheapest honest option: derivable at export time, no per-trkpt
      // bloat). refFor() throws for an unrecognized/renamed track id —
      // caught, block omitted, never an export failure (same doctrine as
      // routeDistanceM above).
      const settledLockEv = [...lockEvs].reverse().find((e) => e.lockKind !== 'soft');
      try {
        if (!refFor) throw new Error('no refFor injected');
        if (!settledLockEv) throw new Error('no settled (non-soft) lock');
        const ref = refFor(settledLockEv.track);
        // Cycle 025 (WP-stale-first-fix P1): fidelity is a derived stat too —
        // a stale at-the-door fix must not count as an off-route excursion.
        const lats = cleanFixes.map((f) => f.lat);
        const lons = cleanFixes.map((f) => f.lon);
        const { x, y } = toXY(lats, lons, ref.lat0, ref.lon0);
        const { xtd } = projectRideOffline(x, y, ref);
        const nFixes = cleanFixes.length;
        if (nFixes > 0) {
          let onCount = 0;
          let maxXtd = 0;
          for (let i = 0; i < nFixes; i++) {
            if (xtd[i] <= CORRIDOR_M) onCount += 1;
            if (xtd[i] > maxXtd) maxXtd = xtd[i];
          }
          const onRoutePct = ((100 * onCount) / nFixes).toFixed(1);
          const maxXtdCapped = Math.min(maxXtd, 999).toFixed(1);
          const segs = findOffRouteSegments(cleanFixes, xtd, CORRIDOR_M).slice(0, 20);
          lines.push(
            `   <qf:routeFidelity track="${escapeXml(settledLockEv.track)}" corridorM="${num(CORRIDOR_M)}"` +
              ` onRoutePct="${onRoutePct}" maxXtdM="${maxXtdCapped}">`,
          );
          for (const s of segs) {
            lines.push(
              `    <qf:offRouteSeg fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"` +
                ` maxDistM="${Math.min(s.maxDistM, 999).toFixed(1)}"/>`,
            );
          }
          lines.push(`   </qf:routeFidelity>`);
        }
      } catch {
        /* no refFor injected, no settled lock, or an unrecognized/renamed
           track id: omit the block, no export failure */
      }
    } else {
      lines.push(`   <qf:routeLock>none</qf:routeLock>`);
    }
  }

  // N9: one <qf:lockChange> per LockKind transition (engine.ts's
  // noteLockChange), in sidecar order — omitted entirely when there are none
  // (a ride that never transitioned must never fabricate one). Closes the
  // two transitions (soft->verified promotion, soft/none->finalized ride-end
  // settle) that left no trace in the sidecar before this WP.
  const lockChangeEvs = evs.filter((e): e is LockChangeEvent => e.kind === 'lockChange');
  if (lockChangeEvs.length > 0) {
    lines.push(`   <qf:lockChanges>`);
    for (const c of lockChangeEvs) {
      const pk = c.pick === undefined || c.pick === null ? '' : ` pick="${escapeXml(c.pick)}"`;
      lines.push(
        `    <qf:lockChange from="${c.from}" to="${c.to}" track="${escapeXml(c.track)}"` +
          ` atChainageM="${num(c.atChainageM)}" reason="${c.reason}"${pk} t="${isoTime(c.atT * 1000)}"/>`,
      );
    }
    lines.push(`   </qf:lockChanges>`);
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
      // WP-G Part 2 gap-fill: per-candidate deviation, when known (absent for
      // the 'retry' phase itself, and for events recorded before this field
      // existed — nothing fabricated either way).
      const xtd = d.xtdM === null || d.xtdM === undefined ? '' : ` xtdM="${num(d.xtdM)}"`;
      lines.push(
        `    <qf:attempt track="${escapeXml(d.track)}" phase="${d.phase}"${acc}` +
          ` thresholdM="${num(d.thresholdM)}" poorAccuracy="${d.poorAccuracy ? 'true' : 'false'}"${xtd}` +
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

  const outages = findOutages(cleanFixes);
  if (outages.length > 0) {
    lines.push(`   <qf:outages>`);
    for (const o of outages) {
      lines.push(`    <qf:outage fromT="${isoTime(o.fromMs)}" toT="${isoTime(o.toMs)}" maxGapS="${num(o.gapS)}"/>`);
    }
    lines.push(`   </qf:outages>`);
  }

  const stops = findStops(cleanFixes);
  if (stops.length > 0) {
    lines.push(`   <qf:stops>`);
    for (const s of stops) {
      lines.push(`    <qf:stop fromT="${isoTime(s.fromMs)}" toT="${isoTime(s.toMs)}"/>`);
    }
    lines.push(`   </qf:stops>`);
  }

  // Cycle 025 (WP-stale-first-fix P3): the app's ONE max-speed figure — no
  // UI or export computed one before this pass, so the first ever shipped is
  // born filtered (see computeMaxSpeedKmh). Omitted when nothing survives.
  const maxKmh = computeMaxSpeedKmh(cleanFixes);
  if (maxKmh !== null) {
    lines.push(`   <qf:maxSpeedKmh>${maxKmh.toFixed(1)}</qf:maxSpeedKmh>`);
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

    // Cycle 025 (P2/P4): timestamped relaunch entries, not just a count —
    // the 2026-08-22 crash review needed WHEN the process died and for how
    // long, and a bare count couldn't say. The count filters on
    // kind === 'relaunch' ONLY: 'remount' events (P5) are UI-visibility
    // records, never process deaths, and are not exported at all. downS is
    // omitted when the source event lacks it (pre-P4 sidecar, or a marker
    // without a heartbeat) — never fabricated. count="0" keeps the exact
    // self-closing form existing consumers and test (g) pin.
    const relaunchEvs = evs.filter((e): e is RelaunchEvent => e.kind === 'relaunch');
    if (relaunchEvs.length > 0) {
      lines.push(`   <qf:relaunches count="${relaunchEvs.length}">`);
      for (const r of relaunchEvs) {
        const down = r.downS === undefined ? '' : ` downS="${num(r.downS)}"`;
        lines.push(`    <qf:relaunch t="${isoTime(r.tUnixMs)}"${down}/>`);
      }
      lines.push(`   </qf:relaunches>`);
    } else {
      lines.push(`   <qf:relaunches count="0"/>`);
    }
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
 * events) — every events-sourced field is omitted rather than fabricated.
 * `refFor` (WP-G Part 4) is an optional injected reference-polyline lookup —
 * see RefLookup's doc comment for why this is DI rather than a static import;
 * omitted means the routeFidelity block is simply never emitted. */
export function buildGpxPlus(
  decoded: DecodedRide, events: DecodedEvents | null, rideId: string, refFor?: RefLookup,
): string {
  const name = decoded.header?.rideId ?? rideId;
  const fixes = [...decoded.fixes].sort((a, b) => a.tUnixMs - b.tUnixMs);
  const startMs = fixes[0]?.tUnixMs ?? decoded.header?.startedAtMs ?? 0;
  const pts: string[] = [];
  let lastEle = 0;
  for (const f of fixes) {
    if (f.ele !== undefined && Number.isFinite(f.ele)) lastEle = f.ele;
    // Cycle 025 (WP-stale-first-fix P1): flagged points are still exported —
    // record-but-flag — carrying their flag inline so any consumer can apply
    // the same exclusion the qf:session stats do. An unflagged fix's output
    // is byte-identical to before (same single-line <extensions> shape).
    const extXml =
      (f.accuracyM !== undefined && Number.isFinite(f.accuracyM)
        ? `<qf:acc>${num(f.accuracyM)}</qf:acc>`
        : '') +
      (f.preStart === true ? '<qf:preStart/>' : '') +
      (f.warmup === true ? '<qf:warmup/>' : '');
    const accLine = extXml === '' ? '' : `    <extensions>${extXml}</extensions>\n`;
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
    buildSessionBlock(fixes, events, refFor) +
    `</gpx>\n`
  );
}
