/**
 * Routes tab (IDEAS §20/§21, mockup 2026-08-16) — the ratified catalog, on the
 * phone: the six landmarks with their real radii, dormant ones marked, and the
 * routes that exist per way.
 *
 * Everything here is READ from the runtime catalog (store/catalogStore.ts —
 * B-39): the shipped seed (src/store/catalog.seed.json, built from
 * data/analysis/landmarks_v1.json — Nathan's curated set) plus whatever this
 * phone has added. Nothing is discovered at runtime: places and routes enter
 * the catalog because the rider agreed they are places and routes
 * (DATA-MODEL §8a). Empty in a virgin build until the rider creates them.
 *
 * WP-Q Part A: per-item delete, mirroring RidesScreen.tsx's idiom exactly —
 * destructive actions live only inside an expanded card, an Alert.alert with
 * Cancel + a destructive confirm, delete demoted off the collapsed row. The
 * cascade itself (store/catalogDelete.ts) is pure and runs BEFORE the Alert
 * is shown, so the confirm text always names the real consequences. No
 * delete affordance ever renders on a seed-owned item (isSeedOwned) — on
 * Nathan's dev/preview build the 6/13/20 seed items are simply undeletable.
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentCatalog, saveUserCatalog, userCatalog } from '../store/catalogStore.ts';
import { isSeedOwned, removeLandmark, removeRoute, removeWay, type CatalogDeletion } from '../store/catalogDelete.ts';
import { shippedCatalog } from '../store/seed.ts';
import { removeUserRef } from '../live/userRefs.ts';
import { removeStoredResult, storedResultsForRoute } from '../store/resultsStore.ts';
import { clearLastRide, dropRecorded, getLastRide } from './lastRide.ts';
import { rankedCountFor } from './colourModel.ts';
import { routeLabel, routeVariantLabel, sortRoutesForDisplay } from '../store/defaultRoute.ts';
import RouteMapView from './routeMapView.tsx';
import { radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';
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

function onDeleteRoute(
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
  confirmDelete(`Delete "${routeVariantLabel(r.id, w)}" on ${from?.label} → ${to?.label}?`, body, deletion, bump);
}

function onDeleteWay(CATALOG: Catalog, SEED: Catalog, w: Way, bump: () => void): void {
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

function onDeleteLandmark(SEED: Catalog, l: Landmark, bump: () => void): void {
  const deletion = removeLandmark(userCatalog(), SEED, l.id);
  confirmDelete(`Delete "${l.label}"?`, 'This place is no longer used by any way.', deletion, bump);
}

export default function RoutesScreen() {
  const { t } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  // WP-Q: bumped after a delete so the screen re-reads currentCatalog() /
  // userCatalog() — React has no way to know those module-level stores
  // changed on their own (same idiom as RidesScreen's resultsTick).
  const [, setTick] = useState(0);
  const bump = () => setTick((v) => v + 1);
  const now = Date.now();
  // B-39: read per render, never captured at import (see RecordScreen).
  const CATALOG = currentCatalog();
  const SEED = shippedCatalog();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>YOUR PLACES</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {CATALOG.landmarks.map((l) => {
          const dormant = !l.offerAtStart
            || (l.activeUntilMs !== null && l.activeUntilMs < now);
          // WP-Q §3.3.3: a delete button appears only for a landmark that is
          // BOTH user-owned and currently unreferenced by any way — removeLandmark
          // would otherwise be a no-op anyway. Nothing creates an orphan today
          // (nothing to render for), so this is belt-and-braces for later WPs.
          const deletable = !isSeedOwned(SEED, 'landmark', l.id)
            && !CATALOG.ways.some((w) => w.startLandmarkId === l.id || w.endLandmarkId === l.id);
          return (
            <View key={l.id} style={[st.row, { borderBottomColor: t.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: dormant ? t.textDim : t.text, fontSize: 14 }}>
                  {l.label}{dormant ? '  · dormant' : ''}
                </Text>
                <Text style={{ color: t.textDim, fontSize: 11.5 }}>
                  {l.lat.toFixed(5)}, {l.lon.toFixed(5)} · {l.radiusM} m
                </Text>
              </View>
              {deletable ? (
                <Pressable
                  style={[st.deleteBtn, { borderColor: t.cardBorder }]}
                  onPress={() => onDeleteLandmark(SEED, l, bump)}
                >
                  <Text style={[st.deleteText, { color: t.textDim }]}>delete</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {/* B-39 minimal empty state (a blank install has no places yet) — a
            bare card read as broken; B-43's empty-state pass owns the real
            design and may replace this line. */}
        {CATALOG.landmarks.length === 0 ? (
          <Text style={{ color: t.textDim, fontSize: 14, paddingVertical: 9 }}>No places yet.</Text>
        ) : null}
        <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
          Dormant places keep seeding history but are never offered at START.
          Radius is measured, not guessed: p90 of the endpoint spread, capped at half
          the gap to the nearest place.
        </Text>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>WAYS</Text>
      {/* B-39 minimal empty state — same note as the places card above. */}
      {CATALOG.ways.length === 0 ? (
        <Text style={{ color: t.textDim, fontSize: 14, marginBottom: 10 }}>No ways yet.</Text>
      ) : null}
      {CATALOG.ways.map((w) => {
        const from = CATALOG.landmarks.find((l) => l.id === w.startLandmarkId);
        const to = CATALOG.landmarks.find((l) => l.id === w.endLandmarkId);
        const routes = sortRoutesForDisplay(CATALOG.routes.filter((r) => r.wayId === w.id));
        const isOpen = open === w.id;
        const wayDeletable = !isSeedOwned(SEED, 'way', w.id);
        return (
          <Pressable key={w.id} onPress={() => setOpen(isOpen ? null : w.id)}
            style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, marginBottom: 10 }]}>
            <View style={[st.row, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 15 }}>
                  {from?.label} → {to?.label}
                </Text>
                <Text style={{ color: t.textDim, fontSize: 11.5 }}>
                  {routes.length} route{routes.length === 1 ? '' : 's'}
                  {routes.length > 1 ? ' · asks which one at START' : ''}
                </Text>
              </View>
              <Text style={{ color: t.textDim }}>{isOpen ? '▾' : '›'}</Text>
            </View>
            {isOpen ? (
              <View style={{ paddingBottom: 12 }}>
                {routes.map((r) => {
                  const n = rankedCountFor(r.id);
                  const routeDeletable = !isSeedOwned(SEED, 'route', r.id);
                  return (
                    <View key={r.id} style={{ marginTop: 10 }}>
                      <Text style={{ color: t.text, fontSize: 13.5 }}>{routeLabel(r.id)}</Text>
                      <Text style={{ color: t.textDim, fontSize: 11.5, marginBottom: 6 }}>
                        {n} ghost lap{n === 1 ? '' : 's'} seeded · 4 sectors · START ~160 m in
                      </Text>
                      {/* B-51: real pannable streets in place of the old static
                          route image — uncoloured gate rings (nothing has been
                          scored on THIS screen), no rider (browse, not live). */}
                      <RouteMapView variant="browse" routeId={r.refLineId} lat={null} lon={null}
                        zoom={1} height={260} showRider={false} />
                      {routeDeletable ? (
                        <Pressable
                          style={[st.deleteBtn, { borderColor: t.cardBorder }]}
                          onPress={() => onDeleteRoute(CATALOG, SEED, w, r, bump)}
                        >
                          <Text style={[st.deleteText, { color: t.textDim }]}>delete route</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
                {wayDeletable ? (
                  <Pressable
                    style={[st.deleteBtn, { borderColor: t.cardBorder, marginTop: 14 }]}
                    onPress={() => onDeleteWay(CATALOG, SEED, w, bump)}
                  >
                    <Text style={[st.deleteText, { color: t.textDim }]}>delete way</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 4 }}>
        Route lines are pre-rendered from your own rides, with the measured gates marked.
        Moving a middle gate keeps lap history comparable; moving START or FINISH does not.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  // Mirrors RidesScreen.tsx's deleteBtn/deleteText — dim outline, never the
  // yellow accent (destructive actions are never a primary-styled button).
  deleteBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.btn,
    borderWidth: 1,
  },
  deleteText: { fontSize: 12, fontWeight: '700' },
});
