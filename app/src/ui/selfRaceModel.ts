/**
 * virgin-cycle6: live self-racing. Past rides of the way you're on, replayed
 * as small dots on the live map, timed from the START gate against the live
 * rider's own START crossing.
 *
 * R6 (naming): "self" / "selfs", never "ghost" — `ghost` already means an
 * archive-seeded result elsewhere in this codebase (TowerRow.ghost,
 * store/types.ts:159; tower(), results.ts:115; GHOSTS, colourModel.ts:59).
 *
 * Pure, no React, no expo, no react-native imports — same discipline as
 * sectorTrailModel.ts / colourModel.ts. `loadSelfTracks` takes an injected
 * FsAdapter (storage/fsAdapter.ts — itself a plain interface, no platform
 * imports), the same pattern lastRide.ts's initRideHistory(fs) uses, so this
 * module stays headless-testable.
 *
 * R2: the self set is EXACTLY colourModel.ghostsFor's window (<= 9 rides,
 * D-045's WINDOW_PREV) — no new counter, no second notion of "recent".
 * R3: a window entry with no readable ride file (or an archive-sourced
 * entry, which has no fixes on this branch) is skipped silently, never
 * interpolated from sector times, never invented.
 * R4: start/finish are this ride's OWN fixes replayed against the way's
 * CURRENT gate set (live/tracks.ts's catalogTrackSpecs — the same
 * {id, ref, gates} triples the live engine locks candidates against, and
 * resultsStore.ts's backfill already re-derives against), not the GPX+
 * events sidecar (recorded against whatever gate set existed that day).
 *
 * Deviation from the brief's literal `GeoJSON.FeatureCollection` return type
 * on `selfsFeatureCollection` (BRIEF-live-self-racing.md Task 1): this file's
 * sibling wayMapGeo.ts documents (its own header, lines 13-15) that the app's
 * tsconfig does not reliably resolve the global `GeoJSON` namespace and
 * defines local `GeoFeature`/`GeoFeatureCollection` shapes instead — every
 * other GeoJSON builder in this codebase (wayMapGeo.ts) follows that local
 * convention. Since I have no way to run `tsc` this session to confirm the
 * global namespace resolves here, I used the same local-shape convention
 * (structurally identical to what the brief describes) rather than risk a
 * whole-module compile failure on an unverifiable global type. Flagged in
 * the Report Back for Nathan/a fresh Fable to confirm or override.
 */
import { ghostsFor } from './colourModel.ts';
import { deriveGateCrossings } from '../store/derive.ts';
import { scoredS } from '../store/timing.ts';
import { catalogTrackSpecs } from '../live/tracks.ts';
import { chronologicalFixes, decodeRideFile } from '../storage/jsonl.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

// ---------------------------------------------------------------- geo shapes
//
// Local minimal GeoJSON shapes, mirroring wayMapGeo.ts's GeoFeature /
// GeoFeatureCollection (see file header for why these are local rather than
// the global `GeoJSON.*` namespace the brief's Task 1 literally names).

export interface SelfPointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat] — GeoJSON order
}

export interface SelfProperties {
  rideId: string;
  state: SelfState;
  best: boolean;
  tier: SelfTier;
  sortKey: number;
}

export interface SelfFeature {
  type: 'Feature';
  geometry: SelfPointGeometry;
  properties: SelfProperties;
}

export interface SelfFeatureCollection {
  type: 'FeatureCollection';
  features: SelfFeature[];
}

// ---------------------------------------------------------------- model

/** One past ride of a way, ready to replay. Fixes ascending by tUnixMs,
 * preStart/warmup fixes already excluded, decimated (see loadSelfTracks).
 * Times in epoch MILLISECONDS. */
export interface SelfTrack {
  rideId: string;
  /** epoch ms this ride crossed gate 0 of the way's CURRENT gate set */
  startMs: number;
  /** epoch ms it crossed the last gate; the dot freezes here */
  finishMs: number;
  /** scored lap seconds (store/timing.ts scoredS) — decides which self is "best" */
  lapS: number;
  /** follow-up (live PX): `sM` optional — existing test literals build fixes
   *  without it and must keep compiling; the loader always fills it. */
  fixes: readonly { tUnixMs: number; lat: number; lon: number; sM?: number }[];
}

export type SelfState = 'waiting' | 'racing' | 'finished';

/** follow-up R5′: purple = window-best self; green = below the arithmetic
 *  mean of all loaded selfs' lapS; yellow = the rest. Same rule as the app's
 *  one tier rule (colourModel.ts:158-164 tierFor, mean from stats():120). */
export type SelfTier = 'purple' | 'green' | 'yellow';

export interface SelfDot {
  rideId: string;
  lat: number;
  lon: number;
  state: SelfState;
  best: boolean;
  tier: SelfTier;
  rank: number;
  sM: number | null;
}

/** Position of `fixes` (ascending by tUnixMs, >= 1 entry) at absolute time
 * `targetMs`, clamped to the first/last fix and linearly interpolated
 * between the bracketing pair otherwise (binary search). follow-up (live
 * PX): also interpolates `sM` when BOTH bracketing fixes carry it, else
 * null; a clamped end returns that fix's `sM ?? null`. */
function interpAt(
  fixes: readonly { tUnixMs: number; lat: number; lon: number; sM?: number }[],
  targetMs: number,
): { lat: number; lon: number; sM: number | null } {
  const first = fixes[0];
  const last = fixes[fixes.length - 1];
  if (targetMs <= first.tUnixMs) return { lat: first.lat, lon: first.lon, sM: first.sM ?? null };
  if (targetMs >= last.tUnixMs) return { lat: last.lat, lon: last.lon, sM: last.sM ?? null };
  let lo = 0;
  let hi = fixes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (fixes[mid].tUnixMs <= targetMs) lo = mid;
    else hi = mid - 1;
  }
  const a = fixes[lo];
  const b = fixes[Math.min(lo + 1, fixes.length - 1)];
  if (b.tUnixMs === a.tUnixMs) return { lat: a.lat, lon: a.lon, sM: a.sM ?? null };
  const f = (targetMs - a.tUnixMs) / (b.tUnixMs - a.tUnixMs);
  const sM = a.sM !== undefined && b.sM !== undefined ? a.sM + f * (b.sM - a.sM) : null;
  return { lat: a.lat + f * (b.lat - a.lat), lon: a.lon + f * (b.lon - a.lon), sM };
}

/** Position of one self at live elapsed `elapsedMs` since the live START
 * crossing. `elapsedMs === null` (live rider not yet through START) or
 * negative (clock skew) -> 'waiting' at the interpolated position AT
 * `track.startMs` (R1: "parked at its own START-gate crossing position") —
 * not necessarily `fixes[0]`, which loadSelfTracks may keep up to 5 s before
 * the crossing. `elapsedMs >= finishMs - startMs` -> 'finished' at the
 * interpolated position AT `track.finishMs`. Otherwise 'racing', linearly
 * interpolated at `startMs + elapsedMs`. */
export function selfPositionAt(
  track: SelfTrack, elapsedMs: number | null,
): { lat: number; lon: number; state: SelfState; sM: number | null } {
  const lapMs = track.finishMs - track.startMs;
  if (elapsedMs === null || elapsedMs < 0) {
    const p = interpAt(track.fixes, track.startMs);
    return { lat: p.lat, lon: p.lon, state: 'waiting', sM: p.sM };
  }
  if (elapsedMs >= lapMs) {
    const p = interpAt(track.fixes, track.finishMs);
    return { lat: p.lat, lon: p.lon, state: 'finished', sM: p.sM };
  }
  const p = interpAt(track.fixes, track.startMs + elapsedMs);
  return { lat: p.lat, lon: p.lon, state: 'racing', sM: p.sM };
}

/** follow-up R5′: the app's one tier rule (colourModel.ts:158-164 tierFor,
 * mean from stats():120) — purple iff `index === bestIdx`; else green iff
 * `lapS` is below the arithmetic mean of `all`; else yellow. The model stays
 * colour-token-free: this returns a tier name, never a colour — the map
 * layer maps tier -> colour (tierColour.ts). */
export function selfTierFor(
  lapS: number, index: number, all: readonly number[], bestIdx: number,
): SelfTier {
  if (index === bestIdx) return 'purple';
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  return lapS < mean ? 'green' : 'yellow';
}

/** All dots for the frame. Tier (R5′, the app's one tier rule —
 * colourModel.ts:158-164 tierFor, mean from stats():120): the window-best
 * self (`best`, lowest lapS, ties -> earliest in the `tracks` array) is
 * purple; any other self whose lapS is below the arithmetic mean of all
 * loaded selfs' lapS is green; the rest are yellow. `rank` is 1..n ascending
 * by lapS, ties broken by array order (stable sort on index), feeding
 * `sortKey = 100 - rank` for stacking (R5‴, see selfsFeatureCollection).
 * Tracks with < 2 fixes or finishMs <= startMs are dropped, never drawn. */
export function selfDotsAt(
  tracks: readonly SelfTrack[], elapsedMs: number | null,
): SelfDot[] {
  const valid = tracks.filter((t) => t.fixes.length >= 2 && t.finishMs > t.startMs);
  if (valid.length === 0) return [];
  let bestIdx = 0;
  for (let i = 1; i < valid.length; i++) {
    if (valid[i].lapS < valid[bestIdx].lapS) bestIdx = i;
  }
  const allLapS = valid.map((t) => t.lapS);
  // rank 1..n by ascending lapS, ties broken by original array order.
  const order = valid.map((_, i) => i).sort((a, b) => allLapS[a] - allLapS[b] || a - b);
  const rankByIndex = new Array<number>(valid.length);
  order.forEach((idx, pos) => { rankByIndex[idx] = pos + 1; });
  return valid.map((t, i) => {
    const pos = selfPositionAt(t, elapsedMs);
    return {
      rideId: t.rideId,
      lat: pos.lat,
      lon: pos.lon,
      state: pos.state,
      best: i === bestIdx,
      tier: selfTierFor(t.lapS, i, allLapS, bestIdx),
      rank: rankByIndex[i],
      sM: pos.sM,
    };
  });
}

/** GeoJSON FeatureCollection of Point features, properties
 * {rideId, state, best, tier, sortKey}. follow-up R5‴: `sortKey = 100 -
 * rank` feeds the `self-dot` layer's `circle-sort-key` layout property so
 * P1 paints above P2 ... P9 — never rely on feature order in this array.
 * Same shape convention as wayMapGeo.ts's builders (see file header re: the
 * local-vs-global GeoJSON type deviation); consumed by WayMapView's `selfs`
 * source. */
export function selfsFeatureCollection(dots: readonly SelfDot[]): SelfFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: dots.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
      properties: { rideId: d.rideId, state: d.state, best: d.best, tier: d.tier, sortKey: 100 - d.rank },
    })),
  };
}

// ---------------------------------------------------------------- loader

/** Consecutive kept fixes stay >= this many ms apart (first/last of the
 * kept range are always kept regardless). Task 2's decimation rule. */
const DECIMATE_MIN_GAP_MS = 2000;
/** Padding either side of the [startMs, finishMs] window kept from the raw
 * fixes, so the dot has a fix to interpolate from right at the edges. */
const EDGE_PAD_MS = 5000;

function decimateByTime<T extends { tUnixMs: number }>(fixes: readonly T[], minGapMs: number): T[] {
  if (fixes.length <= 2) return [...fixes];
  const out: T[] = [fixes[0]];
  let lastKeptT = fixes[0].tUnixMs;
  for (let i = 1; i < fixes.length - 1; i++) {
    if (fixes[i].tUnixMs - lastKeptT >= minGapMs) {
      out.push(fixes[i]);
      lastKeptT = fixes[i].tUnixMs;
    }
  }
  out.push(fixes[fixes.length - 1]);
  return out;
}

/** Module-level cache, keyed `${rideId}:${gateSetVersion}` (R4) — a self
 * track never changes for a given ride + gate-set-version pair, so a
 * gate-set edit invalidates exactly the entries it should and nothing else. */
const trackCache = new Map<string, SelfTrack>();

/**
 * Builds the selfs for `wayId`'s current comparison window (R2:
 * colourModel.ghostsFor(wayId), unchanged, <= 9 entries) by reading each
 * window ride's own stored fixes and replaying them against the way's
 * CURRENT gate set (live/tracks.ts's catalogTrackSpecs — R4). A window entry
 * that is archive-sourced (R3), or whose ride file is absent/unreadable/too
 * short, or that yields no start/finish crossing, is skipped silently —
 * counted and logged, never thrown, never invented. Never throws.
 */
export async function loadSelfTracks(
  wayId: string, gateSetVersion: number, fs: FsAdapter,
): Promise<SelfTrack[]> {
  const spec = catalogTrackSpecs().find((s) => s.id === wayId);
  if (!spec) return [];

  const window = ghostsFor(wayId);
  const out: SelfTrack[] = [];
  let skipped = 0;

  for (const result of window) {
    if (result.source !== 'app') {
      // R3: archive results have sector times but no fixes on this branch.
      skipped++;
      continue;
    }
    const cacheKey = `${result.rideId}:${gateSetVersion}`;
    const cached = trackCache.get(cacheKey);
    if (cached) {
      // Inspect fix (virgin-cycle6): lapS is NOT part of the cache key — it
      // depends on the CURRENT timing mode (R7: purple must follow scoredS),
      // so re-read it on every hit rather than serving a stale mode's value.
      const lapS = scoredS(result.lap);
      if (lapS === null) { skipped++; continue; }
      out.push({ ...cached, lapS });
      continue;
    }
    try {
      const text = await fs.readText(`rides/${result.rideId}.jsonl`);
      if (text === null) { skipped++; continue; }
      const decoded = decodeRideFile(text);
      const inOrder = chronologicalFixes(decoded.fixes).filter((f) => !f.preStart && !f.warmup);
      if (inOrder.length < 2) { skipped++; continue; }

      const t = inOrder.map((f) => f.tUnixMs / 1000); // epoch seconds
      const lat = inOrder.map((f) => f.lat);
      const lon = inOrder.map((f) => f.lon);
      const { startS, finishS, chainageM } = deriveGateCrossings({ t, lat, lon, ref: spec.ref, gates: spec.gates });
      if (startS === null || finishS === null) { skipped++; continue; }

      const startMs = startS * 1000;
      const finishMs = finishS * 1000;
      if (!(finishMs > startMs)) { skipped++; continue; }

      // follow-up (live PX): chainageM[i] <-> inOrder[i], same index — carry
      // it as sM through the window filter and decimation below.
      const withS = inOrder.map((f, i) => ({ ...f, sM: chainageM[i] as number }));

      const loMs = startMs - EDGE_PAD_MS;
      const hiMs = finishMs + EDGE_PAD_MS;
      const windowed = withS.filter((f) => f.tUnixMs >= loMs && f.tUnixMs <= hiMs);
      if (windowed.length < 2) { skipped++; continue; }

      const lapS = scoredS(result.lap);
      if (lapS === null) { skipped++; continue; } // ranks() already guarantees this; defensive

      const track: SelfTrack = {
        rideId: result.rideId,
        startMs,
        finishMs,
        lapS,
        fixes: decimateByTime(windowed, DECIMATE_MIN_GAP_MS).map((f) => (
          { tUnixMs: f.tUnixMs, lat: f.lat, lon: f.lon, sM: f.sM }
        )),
      };
      trackCache.set(cacheKey, track);
      out.push(track);
    } catch {
      // D-023: a self track is a convenience derived from what's on disk —
      // one unreadable/corrupt ride file must never throw into the caller.
      skipped++;
    }
  }

  if (skipped > 0) {
    console.log(`[selfRaceModel] loadSelfTracks(${wayId}): skipped ${skipped} of ${window.length} window entries`);
  }
  return out;
}

// ------------------------------------------------------------ live position

/** follow-up R10: `P = 1 + count(selfs whose current chainage > riderChainageM)`.
 * Null when `riderChainageM` is unknown or there are no dots to compare
 * against. A self with `sM === null` (interpolation had no bracketing
 * chainage) never counts as ahead. */
export function selfLivePosition(
  dots: readonly SelfDot[], riderChainageM: number | null,
): number | null {
  if (riderChainageM === null || dots.length === 0) return null;
  return 1 + dots.filter((d) => d.sM !== null && d.sM > riderChainageM).length;
}
