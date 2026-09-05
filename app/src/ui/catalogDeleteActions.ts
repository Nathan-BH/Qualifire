/**
 * WP-Q's ROUTES-tab delete actions (originally `RoutesScreen.tsx`'s Part A),
 * moved here by WP-K (cycle 2) so both the ROUTES list and the new
 * `CatalogDetailScreen.tsx` share one copy — signatures unchanged, byte-
 * identical bodies. It imports `react-native` (`Alert`), so it is NOT
 * headless-testable; that is fine, nothing in it is new.
 */
import { Alert } from 'react-native';
import { saveUserCatalog, userCatalog } from '../store/catalogStore.ts';
import { removeLandmark, removeRoute, removeWay, type CatalogDeletion } from '../store/catalogDelete.ts';
import { removeUserRef } from '../live/userRefs.ts';
import { removeStoredResult, storedResultsForRoute } from '../store/resultsStore.ts';
import { clearLastRide, dropRecorded, getLastRide } from './lastRide.ts';
import { routeLabelIn } from '../store/defaultRoute.ts';
import type { Catalog, Landmark, Route, Way } from '../store/types.ts';

/** "A", "A and B", "A, B and C" — for the "no longer used by any way" clause. */
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function landmarkLabels(c: Catalog, ids: string[]): string {
  return joinLabels(ids.map((id) => c.landmarks.find((l) => l.id === id)?.label || id));
}

/** WP-Q §3.3 step 4: on confirm, in this order, awaited. The catalog write is
 * the one thing that can refuse, so it goes first — nothing else is touched
 * until it succeeds. */
async function applyDeletion(deletion: CatalogDeletion, bump: () => void): Promise<void> {
  const errs = await saveUserCatalog(deletion.next);
  if (errs.length > 0) {
    Alert.alert('Could not delete', errs.join('\n'));
    return;
  }
  for (const id of deletion.removedRefLineIds) await removeUserRef(id);
  for (const routeId of deletion.removedRouteIds) {
    for (const r of storedResultsForRoute(routeId)) {
      await removeStoredResult(r.rideId);
      dropRecorded(r.rideId);
    }
    if (getLastRide()?.routeId === routeId) clearLastRide();
  }
  bump();
}

function confirmDelete(title: string, body: string, deletion: CatalogDeletion, bump: () => void): void {
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void applyDeletion(deletion, bump) },
  ]);
}

export function onDeleteRoute(
  CATALOG: Catalog, SEED: Catalog, w: Way, r: Route, bump: () => void,
): void {
  const deletion = removeRoute(userCatalog(), SEED, r.id);
  const from = CATALOG.landmarks.find((l) => l.id === w.startLandmarkId);
  const to = CATALOG.landmarks.find((l) => l.id === w.endLandmarkId);
  const n = storedResultsForRoute(r.id).length;
  let body = deletion.removedWayIds.length > 0
    ? `This is the only route on ${from?.label} → ${to?.label}, so the way is removed too.\n`
    : '';
  body += `Its gates and reference line go with it. ${n} scored ride${n === 1 ? '' : 's'} on this route will be re-matched against your other routes; the ride recordings themselves are kept.`;
  if (deletion.removedLandmarkIds.length > 0) {
    const verb = deletion.removedLandmarkIds.length === 1 ? 'is' : 'are';
    body += `\n${landmarkLabels(CATALOG, deletion.removedLandmarkIds)} ${verb} no longer used by any way and will be removed as places.`;
  }
  confirmDelete(`Delete "${routeLabelIn(CATALOG, r.id)}" on ${from?.label} → ${to?.label}?`, body, deletion, bump);
}

export function onDeleteWay(CATALOG: Catalog, SEED: Catalog, w: Way, bump: () => void): void {
  const deletion = removeWay(userCatalog(), SEED, w.id);
  const from = CATALOG.landmarks.find((l) => l.id === w.startLandmarkId);
  const to = CATALOG.landmarks.find((l) => l.id === w.endLandmarkId);
  const routeCount = deletion.removedRouteIds.length;
  const n = deletion.removedRouteIds.reduce((sum, rid) => sum + storedResultsForRoute(rid).length, 0);
  let body = `${routeCount} route${routeCount === 1 ? '' : 's'}, its gates and reference line${routeCount === 1 ? '' : 's'} go with it. ${n} scored ride${n === 1 ? '' : 's'} will be re-matched against your other routes; the ride recordings themselves are kept.`;
  if (deletion.removedLandmarkIds.length > 0) {
    const verb = deletion.removedLandmarkIds.length === 1 ? 'is' : 'are';
    body += `\n${landmarkLabels(CATALOG, deletion.removedLandmarkIds)} ${verb} no longer used by any way and will be removed as places.`;
  }
  confirmDelete(`Delete the way ${from?.label} → ${to?.label}?`, body, deletion, bump);
}

export function onDeleteLandmark(SEED: Catalog, l: Landmark, bump: () => void): void {
  const deletion = removeLandmark(userCatalog(), SEED, l.id);
  confirmDelete(`Delete "${l.label}"?`, 'This place is no longer used by any way.', deletion, bump);
}
