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
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeRideFile } from '../storage/jsonl.ts';
import { buildRefFromRideFixes, saveUserRef } from '../live/userRefs.ts';
import { seedGateChainages } from './gateSeeding.ts';
import { addGateSet, gateSetFor, routesForWay } from './catalog.ts';
import { currentCatalog, saveUserCatalog, userCatalog } from './catalogStore.ts';
import { backfillMissingResults, getStoredResult, removeStoredResult, storedResultsForRoute } from './resultsStore.ts';
import type { Catalog } from './types.ts';
import {
  buildWayCreationCatalog, draftWayCreation, type WayCreationDraft, type WayNames,
} from './wayCreation.ts';

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
 * itself. */
export async function readRideFixes(rideId: string, fs: FsAdapter) {
  try {
    const text = await fs.readText(`rides/${rideId}.jsonl`);
    if (text === null) return null;
    return decodeRideFile(text).fixes;
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
  routeId: string, rideId: string, fs: FsAdapter,
): Promise<PromoteReferenceOutcome> {
  const user = userCatalog();
  const route = user.routes.find((r) => r.id === routeId);
  if (!route) {
    return { ok: false, errors: [`"${routeId}" is not one of your own routes — a shipped route cannot be re-referenced`] };
  }
  if (route.referenceRideId === rideId) {
    return { ok: false, errors: ['this ride is already the reference of that route'] };
  }
  const fixes = await readRideFixes(rideId, fs);
  const built = fixes ? buildRefFromRideFixes(fixes) : null;
  if (!built) {
    return { ok: false, errors: ['no reference line can be built from this ride (recording unreadable, or under 200 m)'] };
  }

  // Everything below is decided; the catalog write is the only step that can refuse.
  const version = (gateSetFor(user, routeId)?.version ?? 0) + 1;
  const withGates = addGateSet(user, {
    routeId,
    version,
    chainageM: seedGateChainages(built.ref.length, built.stopChainageM),
    createdAtMs: Date.now(),
    origin: 'geometric',
    note: `re-seeded when ride ${rideId} became the reference (WP-H §3.3b)`,
  });
  const next: Catalog = {
    ...withGates,
    routes: withGates.routes.map((r) => (r.id === routeId ? { ...r, referenceRideId: rideId } : r)),
  };
  const errs = await saveUserCatalog(next);
  if (errs.length > 0) return { ok: false, errors: errs };

  await saveUserRef(route.refLineId, built.ref);

  // The reset (WP-Q's loop, RoutesScreen.tsx:57-62), then the immediate
  // re-derive so the ghosts do not come back unannounced at the next boot.
  const clearedRideIds = storedResultsForRoute(routeId).map((r) => r.rideId);
  for (const id of clearedRideIds) await removeStoredResult(id);
  const candidates = clearedRideIds.includes(rideId) ? clearedRideIds : [rideId, ...clearedRideIds];
  await backfillMissingResults(fs, candidates);
  const retimed = candidates.filter((id) => getStoredResult(id)?.routeId === routeId);

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
export async function draftWayFromRide(
  rideId: string, startedAtMs: number, matchedRouteId: string | null, fs: FsAdapter,
): Promise<WayCreationDraft | null> {
  const fixes = await readRideFixes(rideId, fs);
  if (fixes === null) return null;
  try {
    return draftWayCreation(currentCatalog(), {
      rideId, startedAtMs, fixes: fixes.map((f) => ({ lat: f.lat, lon: f.lon })), matchedRouteId,
    });
  } catch {
    return null;
  }
}

/** The matched existing landmark's label for the naming card, or null when
 * the endpoint is a new place (the card shows an input instead). */
export function existingLandmarkLabel(r: WayCreationDraft['start']): string | null {
  if (r.kind !== 'existing') return null;
  return currentCatalog().landmarks.find((l) => l.id === r.landmarkId)?.label ?? r.landmarkId;
}

/** WP-G: the naming card's view of the way a variant is being added to
 * (RecordScreen.tsx's existingWayProps). null for an unknown way id. */
export function existingWayProps(wayId: string): { label: string; knownSpecLists: string[][] } | null {
  const c = currentCatalog();
  const w = c.ways.find((x) => x.id === wayId);
  if (!w) return null;
  const lab = (id: string) => c.landmarks.find((l) => l.id === id)?.label ?? id;
  return {
    label: `${lab(w.startLandmarkId)} → ${lab(w.endLandmarkId)}`,
    knownSpecLists: routesForWay(c, wayId).map((r) => r.specs ?? []),
  };
}

/** What the gate-adjust step carries between CREATE WAY and its own save. */
export interface GateAdjustDraft {
  routeId: string;
  refLengthM: number;
  chainageM: number[];
}

export type CreateWayOutcome =
  | { ok: true; routeId: string; adjust: GateAdjustDraft | null }
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
export async function createWayFromDraft(
  draft: WayCreationDraft, names: WayNames, fs: FsAdapter,
): Promise<CreateWayOutcome> {
  const fixes = await readRideFixes(draft.rideId, fs);
  const builtRef = fixes ? buildRefFromRideFixes(fixes) : null;
  const seed = builtRef
    ? { chainageM: seedGateChainages(builtRef.ref.length, builtRef.stopChainageM) }
    : undefined;
  const built = buildWayCreationCatalog(userCatalog(), draft, names, seed);
  const errs = await saveUserCatalog(built);
  if (errs.length > 0) return { ok: false, errors: errs };
  const routeId = `route:${draft.rideId}`;
  if (builtRef) await saveUserRef(routeId, builtRef.ref);
  return {
    ok: true,
    routeId,
    adjust: builtRef && seed ? { routeId, refLengthM: builtRef.ref.length, chainageM: seed.chainageM } : null,
  };
}

export type AdjustOutcome = { ok: true; moved: boolean } | { ok: false; errors: string[] };

/** RecordScreen.tsx's onAdjustSave decision + try-body. KEEP costs nothing
 * (the seeded v1 set was already saved by CREATE WAY): unmoved gates return
 * `{ ok:true, moved:false }` with no write. Moved gates mint VERSION 2
 * through addGateSet ("history is never deleted", store/catalog.ts). */
export async function saveAdjustedGates(a: GateAdjustDraft, chainageM: number[]): Promise<AdjustOutcome> {
  const moved = chainageM.some((v, i) => Math.abs(v - a.chainageM[i]) > 1e-6);
  if (!moved) return { ok: true, moved: false };
  const errs = await saveUserCatalog(
    addGateSet(userCatalog(), {
      routeId: a.routeId,
      version: 2,
      chainageM,
      createdAtMs: Date.now(),
      origin: 'geometric',
      note: 'adjusted at save (tap-then-nudge) from the seeded proposal',
    }),
  );
  return errs.length > 0 ? { ok: false, errors: errs } : { ok: true, moved: true };
}
