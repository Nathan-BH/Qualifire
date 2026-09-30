/**
 * WP-H (WP-F §8 follow-on, 2026-09-04): the "this ride becomes the reference
 * of a way" flows, shared by RecordScreen's STOP-step offer and the ride
 * detail's retroactive offer, plus (§3.3b/§4.9b) "promote a later ride to
 * REPLACE an existing route's reference". No React, no Alerts, no ui/
 * imports — I/O goes through the given FsAdapter and the catalog/results/ref
 * stores; callers turn `{ ok:false, errors }` into UI. Bodies lifted from
 * RecordScreen.tsx (readRideFixes, namingDraftFor, existingLandmarkLabel,
 * existingWayProps, onNamingSave, onAdjustSave) unchanged in behaviour.
 *
 * WP-G interaction (Fable ruling, 2026-09-04): draftWayFromRide's draft can
 * carry `existingWayId` — a route-VARIANT offer on a way the rider already
 * has — exactly as at the STOP step. The ride detail offers it too (the
 * retroactive offer follows the live one, WP-G §9 Q1: "always"); only the
 * button label and the card's own mode differ, both keyed on that field.
 */
import type { RefLine } from '../../core/src/index.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { chronologicalFixes, decodeRideFile } from '../storage/jsonl.ts';
import { buildRefFromRideFixes, saveUserRef, userRefFor } from '../live/userRefs.ts';
import { seedGateChainages } from './gateSeeding.ts';
import { addGateSet, gateSetFor, waysForRoute } from './catalog.ts';
import { currentCatalog, saveUserCatalog, userCatalog } from './catalogStore.ts';
import { scopeCatalog } from './sports.ts';
import { activeSportId, currentSports } from './sportStore.ts';
import {
  BACKFILL_ENGINE_VERSION, backfillMissingResults, clearUnmatched, getStoredResult,
  removeStoredResult, saveResult, storedResultsForWay,
} from './resultsStore.ts';
import { deriveRideResult } from './derive.ts';
import type { Catalog, RideResult } from './types.ts';
import {
  buildRouteCreationCatalog, draftRouteCreation, newPlaceLabelErrors, type RouteCreationDraft, type RouteNames,
} from './routeCreation.ts';

export type RideFix = { lat: number; lon: number; [k: string]: unknown };

/** RecordScreen.tsx's readRideFixes — raw fixes (flags included) or null on
 * any failure. Also what the ride detail uses to draw the true trace.
 *
 * `fs` is REQUIRED, no `createExpoFsAdapter()` default (unlike RecordScreen's
 * original UI-layer copy) — this is a store/ module (D-023 posture: no expo,
 * no react-native), matching resultsStore.ts's own initResultsStore/
 * backfillMissingResults, both of which also require `fs` explicitly. A
 * default would statically import storage/expoFsAdapter.ts (real
 * expo-file-system), which the headless test runner cannot load — every
 * caller (RideDetailScreen.tsx included) passes createExpoFsAdapter()
 * itself.
 *
 * Returned in chronological order (WP-B cycle 2) — disk order is not; every
 * consumer of this (reference build, way draft, trace, replay) needs a
 * path/time series. */
export async function readRideFixes(rideId: string, fs: FsAdapter) {
  try {
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    return chronologicalFixes(decodeRideFile(text).fixes);
  } catch {
    return null;
  }
}

export type PromoteReferenceOutcome =
  | {
      ok: true;
      /** the gate-set version minted for the new reference */
      gateSetVersion: number;
      /** stored results removed OTHER than the promoted ride's own old one */
      ghostsCleared: number;
      /** every rideId whose stored result was removed (the promoted ride's own included when it had one) */
      clearedRideIds: string[];
      /** of [rideId, ...clearedRideIds], the ones the immediate re-derive scored on THIS route again */
      retimed: string[];
    }
  | { ok: false; errors: string[] };

/** WP-H addendum (2026-09-04, §3.3b): make `rideId` the reference of the
 * EXISTING user route `routeId`. Reset, not remap: the reference line is
 * rebuilt from this ride and stored under the route's UNCHANGED refLineId
 * (an idempotent overwrite, userRefs.ts:170), the gates are re-seeded from
 * it as a new gate-set version (old versions stay — catalog.ts:202), the
 * route's referenceRideId is rewritten, every stored result on the route is
 * removed, and the affected rides (this one included) are re-derived against
 * the new geometry through the ordinary backfill so the state on return is
 * final — a bare delete would come back re-timed at the next boot anyway
 * (resultsStore.ts:412; lastRide.ts:270). Order: the one refusable write
 * (catalog) first; nothing else is touched until it succeeds. Refuses, with
 * no writes at all, for a route not in userCatalog() (seed routes — refs.ts
 * would ignore a user ref under their id), for a ride that already is the
 * reference, and for a ride no reference line can be built from
 * (userRefs.ts:65: unreadable, or under MIN_TRACK_LENGTH_M). No React, no
 * Alerts, no ui/ imports: the caller mirrors `clearedRideIds` into
 * lastRide.recorded (dropRecorded / clearLastRide / replaceRecorded), as
 * RoutesScreen.tsx:57-62 does for delete-route. */
export async function promoteRideToReference(
  wayId: string, rideId: string, fs: FsAdapter,
): Promise<PromoteReferenceOutcome> {
  const user = userCatalog();
  const way = user.ways.find((r) => r.id === wayId);
  if (!way) {
    return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way cannot be re-referenced`] };
  }
  if (way.referenceRideId === rideId) {
    return { ok: false, errors: ['this ride is already the reference of that way'] };
  }
  const fixes = await readRideFixes(rideId, fs);
  const built = fixes ? buildRefFromRideFixes(fixes) : null;
  if (!built) {
    return { ok: false, errors: ['no reference line can be built from this ride (recording unreadable, or under 200 m)'] };
  }

  // Everything below is decided; the catalog write is the only step that can refuse.
  const version = (gateSetFor(user, wayId)?.version ?? 0) + 1;
  const withGates = addGateSet(user, {
    wayId,
    version,
    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),
    createdAtMs: Date.now(),
    origin: 'geometric',
    note: `re-seeded when ride ${rideId} became the reference (WP-H §3.3b)`,
  });
  const next: Catalog = {
    ...withGates,
    ways: withGates.ways.map((r) => (r.id === wayId ? { ...r, referenceRideId: rideId } : r)),
  };
  const errs = await saveUserCatalog(next);
  if (errs.length > 0) return { ok: false, errors: errs };

  await saveUserRef(way.refLineId, built.ref);

  // The reset (WP-Q's loop, RoutesScreen.tsx:57-62), then the immediate
  // re-derive so the ghosts do not come back unannounced at the next boot.
  const clearedRideIds = storedResultsForWay(wayId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  const candidates = clearedRideIds.includes(rideId) ? clearedRideIds : [rideId, ...clearedRideIds];
  await clearUnmatched(rideId); // virgin-cycle18 brief 02: a marker from before this way existed must not defeat the re-time
  await backfillMissingResults(fs, candidates);
  const retimed = candidates.filter((id) => getStoredResult(id)?.wayId === wayId);

  return {
    ok: true,
    gateSetVersion: version,
    ghostsCleared: clearedRideIds.filter((id) => id !== rideId).length,
    clearedRideIds,
    retimed,
  };
}

// ============================================================ §4.9: the
// "reference of a NEW way / new route on an existing way" flow (WP-F §8).

/** RecordScreen.tsx's namingDraftFor — null = no offer (short ride,
 * unreadable). Since WP-G an existing directed way is NOT a null: the draft
 * comes back with `existingWayId` set (variant offer). `fs` required, as
 * readRideFixes. */
export async function draftRouteFromRide(
  rideId: string, startedAtMs: number, matchedWayId: string | null, fs: FsAdapter,
  // WP-1 (C4): both real callers (RecordScreen's post-STOP offer,
  // RideDetailScreen's retroactive offer) now pass the RIDE's own sport
  // explicitly (its start-time stamp, resolved through effectiveRideSportId)
  // — never whatever the global active sport happens to be right now, since
  // a sport switch made from SETTINGS mid-ride must not retag the offer.
  // The default is a fallback for a hypothetical bare caller only.
  sportId: string | null = activeSportId(),
): Promise<RouteCreationDraft | null> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null) return null;
  try {
    // WP-1: all landmarks (shared, for disc fitting) but only THIS sport's
    // routes (for the existing-route/variant check) — identity when
    // sportId === null (no sport, or zero sports total).
    const scoped = scopeCatalog(currentCatalog(), sportId, currentSports());
    return draftRouteCreation(scoped, {
      rideId, startedAtMs, fixes: fixes.map((f) => ({ lat: f.lat, lon: f.lon })), matchedWayId, sportId,
    });
  } catch {
    return null;
  }
}

/** The matched existing landmark's label for the naming card, or null when
 * the endpoint is a new place (the card shows an input instead). */
export function existingLandmarkLabel(r: RouteCreationDraft['start']): string | null {
  if (r.kind !== 'existing') return null;
  return currentCatalog().landmarks.find((l) => l.id === r.landmarkId)?.label ?? r.landmarkId;
}

/** WP-G: the naming card's view of the way a variant is being added to
 * (RecordScreen.tsx's existingWayProps). null for an unknown way id. */
export function existingRouteProps(routeId: string): { label: string; knownSpecLists: string[][] } | null {
  const c = currentCatalog();
  const w = c.routes.find((x) => x.id === routeId);
  if (!w) return null;
  const lab = (id: string) => c.landmarks.find((l) => l.id === id)?.label ?? id;
  return {
    label: `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}`,
    knownSpecLists: waysForRoute(c, routeId).map((r) => r.specs ?? []),
  };
}

/** What the gate-adjust step carries between CREATE WAY and its own save. */
export interface GateAdjustDraft {
  wayId: string;
  /** the ride's real reference line — the card draws gates ON it (WP-I) */
  ref: RefLine;
  refLengthM: number;
  chainageM: number[];
}

export type CreateRouteOutcome =
  | {
      ok: true; wayId: string; adjust: GateAdjustDraft | null;
      /** virgin-cycle18 brief 04: true iff the founding ride's own result is
       * now stored on this way (any lap quality — see timeReferenceAt). */
      referenceTimed: boolean;
    }
  | { ok: false; errors: string[] };

/** RecordScreen.tsx's onNamingSave try-body. Builds the route's real
 * reference line from the ride (null on ANY failure => the way saves exactly
 * as before, with an unresolvable refLineId — building a reference must
 * never block creating the way), seeds the v1 gate set from it, saves the
 * catalog (the one refusable step; nothing else is touched when it refuses),
 * then registers the ref under `route:<rideId>`. `adjust` is non-null
 * exactly when a reference line + seed were built — the caller then offers
 * GateAdjustCard (SETUP-UX §4). The WP-G duplicate-specs belt check stays in
 * the callers (its Alert copy is theirs). Same body in both draft modes:
 * buildWayCreationCatalog forks on `draft.existingWayId` by itself. */
export async function createRouteFromDraft(
  draft: RouteCreationDraft, names: RouteNames, fs: FsAdapter,
): Promise<CreateRouteOutcome> {
  // virgin-cycle18 brief 05 (decision 1): belt to the card's braces — a new
  // place may not take an existing place's name (Nathan's two "Work"s).
  // Judged on the merged catalog, the one the rider sees. No writes on refusal.
  const nameErrs = newPlaceLabelErrors(currentCatalog(), draft, names);
  if (nameErrs.length > 0) return { ok: false, errors: nameErrs };
  const fixes = await readRideFixes(draft.rideId, fs);
  const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
  const seed = builtRef
    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) }
    : undefined;
  const built = buildRouteCreationCatalog(userCatalog(), draft, names, seed);
  const errs = await saveUserCatalog(built);
  if (errs.length > 0) return { ok: false, errors: errs };
  const wayId = `way:${draft.rideId}`;
  if (builtRef) await saveUserRef(wayId, builtRef.ref);
  // virgin-cycle18 brief 02 (decision 3) + brief 04 (decision 8): the
  // founding ride matched nothing when it ended — a backfill since (RIDES
  // visit, restart) may have left a permanent unmatched marker. Clear it,
  // then store this ride's OWN result against the way it just founded, at
  // the v1 gates, so RESULTS lists the route from this moment (no backfill
  // needed) and a second ride this session already races it. Any lap
  // quality is stored (a missed sector = NO TIME under the way, never a
  // rank — D-028), exactly as rememberRide stores a live ride.
  // saveAdjustedGates re-times it if the gates move a moment later.
  await clearUnmatched(draft.rideId);
  let referenceTimed = false;
  if (builtRef && seed) {
    const own = await timeReferenceAt(draft.rideId, wayId, builtRef.ref, seed.chainageM, 1, fs);
    if (own !== null) {
      await saveResult(own);
      referenceTimed = true;
    }
  }
  // virgin-cycle18 brief 06 (decision 6): this ride is now the reference of
  // `wayId`. A result it still holds on ANOTHER way (the engine scored it as
  // X, the rider re-pointed the endpoints on the card: "not X") would be a
  // second home. timeReferenceAt above overwrote it when it could time the
  // ride (results are keyed by rideId); when it could not, drop the stale one.
  if (!referenceTimed) {
    const stale = getStoredResult(draft.rideId);
    if (stale && stale.wayId !== wayId) await removeStoredResult(draft.rideId);
  }
  return {
    ok: true,
    wayId,
    adjust: builtRef && seed ? { wayId, ref: builtRef.ref, refLengthM: builtRef.ref.length, chainageM: seed.chainageM } : null,
    referenceTimed,
  };
}

export type AdjustOutcome =
  | { ok: true; moved: false }
  | {
      ok: true; moved: true;
      /** virgin-cycle18 brief 04: true iff the reference ride's result was
       * re-derived at the minted v2 and stored; false = its v1 result was
       * removed (a stale-chainage result must not survive) and the way has
       * no reference result until the next gate save. */
      referenceRetimed: boolean;
    }
  | { ok: false; errors: string[] };

/** RecordScreen.tsx's onAdjustSave decision + try-body. KEEP costs nothing
 * (the seeded v1 set was already saved by CREATE WAY): unmoved gates return
 * `{ ok:true, moved:false }` with no write. Moved gates mint VERSION 2
 * through addGateSet ("history is never deleted", store/catalog.ts).
 * virgin-cycle18 brief 04: the founding ride's v1 result (stored by
 * createRouteFromDraft) is re-timed against the moved gates right here, so
 * it never sits under chainages that are no longer the way's. `fs` is
 * required, as everywhere else in this module (readRideFixes' note). */
export async function saveAdjustedGates(a: GateAdjustDraft, chainageM: number[], fs: FsAdapter): Promise<AdjustOutcome> {
  const moved = chainageM.some((v, i) => Math.abs(v - a.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };
  const errs = await saveUserCatalog(
    addGateSet(userCatalog(), {
      wayId: a.wayId,
      version: 2,
      chainageM,
      createdAtMs: Date.now(),
      origin: 'geometric',
      note: 'adjusted at save (tap-then-nudge) from the seeded proposal',
    }),
  );
  if (errs.length > 0) return { ok: false, errors: errs };
  const refRideId = userCatalog().ways.find((w) => w.id === a.wayId)?.referenceRideId ?? null;
  if (refRideId === null) return { ok: true, moved: true, referenceRetimed: false };
  const own = await timeReferenceAt(refRideId, a.wayId, a.ref, chainageM, 2, fs);
  if (own !== null) {
    await saveResult(own);
    return { ok: true, moved: true, referenceRetimed: true };
  }
  await removeStoredResult(refRideId);
  return { ok: true, moved: true, referenceRetimed: false };
}

// ============================================================ WP-I
// (virgin-cycle2): "edit gates for an EXISTING route" from the ROUTES tab —
// reuses promoteRideToReference's reset-not-remap convention (ratified,
// QUESTIONS-FOR-NATHAN.md Q2, 2026-09-05) but keeps the existing reference
// line: only gate positions move, no new ride is involved.

/** WP-I (virgin-cycle2): the gate-adjust draft for an EXISTING user route —
 * its own reference line and its CURRENT gate set, so RoutesScreen can open
 * GateAdjustCard on it. null when the route is not user-owned, has no
 * resolvable user ref (a way saved without a line), or no gate set. Pure
 * read, no I/O. Same shape as the create-way draft on purpose: the card and
 * the screen wiring do not care which flow produced it. */
export function gateEditDraftFor(wayId: string): GateAdjustDraft | null {
  const user = userCatalog();
  const way = user.ways.find((r) => r.id === wayId);
  if (!way) return null;
  const ref = userRefFor(way.refLineId);
  const gates = gateSetFor(user, wayId, way.gateSetVersion);
  if (!ref || !gates) return null;
  return { wayId, ref, refLengthM: ref.length, chainageM: [...gates.chainageM] };
}

/** virgin-cycle18 brief 02: the reference ride's result against `gates`, or
 * null with a reason. Reads the recording exactly as backfillMissingResults
 * does (readRideFixes = chronologicalFixes over every fix, flags included),
 * derives against THIS way's ref (no candidate loop, no corridor test — the
 * ref line IS this recording), and accepts the same qualities the backfill
 * accepts (clean | interrupted). `reason` is human copy for an Alert.
 * `readable` is false only when the recording is absent/unreadable/too short
 * — the caller must not block a gate edit on a ride it could never time. */
export async function deriveReferenceAgainst(
  rideId: string, wayId: string, ref: RefLine, gates: number[], gateSetVersion: number, fs: FsAdapter,
): Promise<{ result: RideResult | null; readable: boolean; reason: string | null }> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null || fixes.length < 2) {
    return { result: null, readable: false, reason: 'the reference recording is missing or unreadable' };
  }
  const t = fixes.map((f) => f.tUnixMs / 1000);
  const lat = fixes.map((f) => f.lat);
  const lon = fixes.map((f) => f.lon);
  const result = deriveRideResult({
    rideId, t, lat, lon, ref, gates, wayId, gateSetVersion,
    engineVersion: BACKFILL_ENGINE_VERSION, source: 'app',
  });
  if (result.wayId === wayId && (result.lap.quality === 'clean' || result.lap.quality === 'interrupted')) {
    return { result, readable: true, reason: null };
  }
  const missed = result.sectors.filter((s) => s.quality === 'missed').map((s) => s.index);
  const which = missed.length > 0
    ? `sector ${missed.join(' and ')} (between gate ${missed.map((i) => `${i - 1}→${i}`).join(', ')}) is not timed in its recording`
    : `its lap comes out '${result.lap.quality}'`;
  return { result: null, readable: true, reason: `the reference ride cannot be timed against these gates: ${which}` };
}

/** virgin-cycle18 brief 04 (decision 8): the reference ride's result against
 * `gates` at ANY lap quality — the "does this ride have a home" question,
 * where deriveReferenceAgainst above answers "would this edit lose a TIMED
 * reference" (it returns null for missed/estimated laps on purpose). null
 * only when the recording is absent/unreadable/too short, or when derive
 * itself disowns the way (missed sectors AND no lap bounds — derive.ts:110).
 * Same reader, same engine version, same `source` as the backfill, so the
 * stored result is byte-compatible with a loop-derived one. */
export async function timeReferenceAt(
  rideId: string, wayId: string, ref: RefLine, gates: number[], gateSetVersion: number, fs: FsAdapter,
): Promise<RideResult | null> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null || fixes.length < 2) return null;
  const result = deriveRideResult({
    rideId,
    t: fixes.map((f) => f.tUnixMs / 1000),
    lat: fixes.map((f) => f.lat),
    lon: fixes.map((f) => f.lon),
    ref, gates, wayId, gateSetVersion,
    engineVersion: BACKFILL_ENGINE_VERSION, source: 'app',
  });
  return result.wayId === wayId ? result : null;
}

/** virgin-cycle18 brief 04 follow-up (Inspect finding 1, 2026-09-30): a way
 * whose reference ride has NO stored result never appears in RESULTS —
 * buildResultsList walks stored results only. That is every way created
 * retroactively from RIDES before brief 02 (its marker was never cleared,
 * so backfillMissingResults skips the reference forever) and every
 * reference whose v1 lap came out `missed` (the candidate loop refuses it
 * and marks it). Time the reference against its OWN way at the way's
 * CURRENT gate set, any lap quality (exactly what createRouteFromDraft does
 * at creation), store it, and only then drop the marker (a marker is only
 * dropped when a result replaces it, so an unreadable recording is not
 * re-run through the candidate loop on every mount). Returns true iff a
 * result was stored this call. false — and no write — when the way is not
 * user-owned, has no referenceRideId, already has a stored reference
 * result, has no resolvable ref line or gate set, or its recording is
 * absent/unreadable/too short/disowned by derive. Never throws. Called by
 * ui/rideHomes.ts settleRideHomes between its backfill and free-filing
 * steps. */
export async function timeMissingReference(wayId: string, fs: FsAdapter): Promise<boolean> {
  try {
    const user = userCatalog();
    const way = user.ways.find((w) => w.id === wayId);
    const refRideId = way?.referenceRideId ?? null;
    if (!way || refRideId === null || getStoredResult(refRideId) !== null) return false;
    const ref = userRefFor(way.refLineId);
    const gates = gateSetFor(user, wayId, way.gateSetVersion);
    if (!ref || !gates) return false;
    const own = await timeReferenceAt(refRideId, wayId, ref, gates.chainageM, gates.version, fs);
    if (own === null) return false;
    await saveResult(own);
    await clearUnmatched(refRideId);
    return true;
  } catch {
    return false;
  }
}

export type EditGatesOutcome =
  | { ok: true; moved: false }
  | {
      ok: true;
      moved: true;
      /** the gate-set version minted */
      gateSetVersion: number;
      /** every rideId whose stored result on this route was removed */
      clearedRideIds: string[];
      /** the ones the immediate re-derive scored on THIS route again — every
       * clearedRideIds entry that came back, PLUS the reference ride when it
       * was re-timed (virgin-cycle18 brief 02: it may not have had a result
       * to clear). */
      retimed: string[];
      /** Way.referenceRideId, or null for a way without one */
      referenceRideId: string | null;
      /** true iff referenceRideId is set AND its fresh result is stored on this way */
      referenceRetimed: boolean;
    }
  | { ok: false; errors: string[] };

/** WP-I: move the gates of an EXISTING user route to `chainageM` — Nathan's
 * "edit the gate … it should not recalculate, and just say that previous
 * recordings will be lost (starting over basically)" (2026-09-04), i.e. the
 * SAME reset-not-remap convention as promoteRideToReference above, minus the
 * parts that are about a new ride: the reference line is untouched (no
 * readRideFixes/buildRefFromRideFixes/saveUserRef), referenceRideId is
 * untouched, and the chainages are the rider's, not seedGateChainages'.
 * Kept identical: user-route-only refusal, version = latest + 1 through
 * addGateSet (old versions stay), one refusable catalog write first, then
 * every stored result on the route removed and the affected rides re-derived
 * at once through the ordinary backfill (see promote's doc comment for why a
 * bare delete would come back re-timed at the next boot anyway). Unmoved
 * gates are a free no-op, as saveAdjustedGates. Refuses, with no writes, for
 * a non-user route, a missing gate set or ref, a chainage list of a different
 * length, or one that is not strictly increasing within [0, ref.length]. */
export async function editWayGates(
  wayId: string, chainageM: number[], fs: FsAdapter,
): Promise<EditGatesOutcome> {
  const user = userCatalog();
  const way = user.ways.find((r) => r.id === wayId);
  if (!way) {
    return { ok: false, errors: [`"${wayId}" is not one of your own ways — a shipped way's gates cannot be edited`] };
  }
  const current = gateSetFor(user, wayId);
  const ref = userRefFor(way.refLineId);
  if (!current || !ref) {
    return { ok: false, errors: ['this way has no gate set or no reference line to place gates on'] };
  }
  if (chainageM.length !== current.chainageM.length) {
    return { ok: false, errors: [`expected ${current.chainageM.length} gates, got ${chainageM.length}`] };
  }
  for (let i = 0; i < chainageM.length; i++) {
    const c = chainageM[i];
    if (!(c >= 0 && c <= ref.length) || (i > 0 && c <= chainageM[i - 1])) {
      return { ok: false, errors: [`gate ${i} at ${c} m is not on the line or not after gate ${i - 1}`] };
    }
  }
  const moved = chainageM.some((v, i) => Math.abs(v - current.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };

  const version = current.version + 1;
  // virgin-cycle18 brief 02: never lose a reference self to a gate edit.
  // Refuse, with no writes, when the reference times against the CURRENT
  // gates but would not against the new ones (decision 2). A reference that
  // already does not time (or has no readable recording) never blocks.
  const refRideId = way.referenceRideId ?? null;
  let refNext: RideResult | null = null;
  if (refRideId !== null) {
    const next = await deriveReferenceAgainst(refRideId, wayId, ref, chainageM, version, fs);
    if (next.result === null && next.readable) {
      const now = await deriveReferenceAgainst(refRideId, wayId, ref, current.chainageM, current.version, fs);
      if (now.result !== null) {
        return { ok: false, errors: [`${next.reason} — move that gate somewhere the reference ride actually passed`] };
      }
    }
    refNext = next.result;
  }
  const errs = await saveUserCatalog(
    addGateSet(user, {
      wayId,
      version,
      chainageM: [...chainageM],
      createdAtMs: Date.now(),
      origin: 'geometric',
      note: `edited from ROUTES (tap-then-nudge) over v${current.version} (WP-I, virgin-cycle2)`,
    }),
  );
  if (errs.length > 0) return { ok: false, errors: errs };

  // The reset, then the immediate re-derive — promoteRideToReference's loop,
  // with the reference handled FIRST and directly (virgin-cycle18 brief 02,
  // decisions 1+3): its marker is cleared, its fresh result (derived above
  // against this way's own ref) is stored, and the general backfill then
  // skips it (store.has) instead of re-matching it across every catalog way.
  const clearedRideIds = storedResultsForWay(wayId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  if (refRideId !== null) await clearUnmatched(refRideId);
  if (refNext !== null) {
    await saveResult(refNext);
  } else if (refRideId !== null) {
    // virgin-cycle18 brief 04: no TIMED result under the new gates (brief 02's
    // decision 2 let this through: it was not timed before either) — store
    // whatever this way's own reference derives to, so it keeps its home
    // under the way as NO TIME instead of becoming an orphan.
    const own = await timeReferenceAt(refRideId, wayId, ref, chainageM, version, fs);
    if (own !== null) await saveResult(own);
  }
  await backfillMissingResults(fs, clearedRideIds);
  const candidates = refRideId !== null && !clearedRideIds.includes(refRideId)
    ? [...clearedRideIds, refRideId] : clearedRideIds;
  const retimed = candidates.filter((id) => getStoredResult(id)?.wayId === wayId);
  const referenceRetimed = refRideId !== null && getStoredResult(refRideId)?.wayId === wayId;
  return { ok: true, moved: true, gateSetVersion: version, clearedRideIds, retimed, referenceRideId: refRideId, referenceRetimed };
}
