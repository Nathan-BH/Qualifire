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
 * WP-K (cycle 2): a tap on a place or a way row now mount-swaps a full-screen
 * `CatalogDetailScreen` over the tab (mirrors WP-H's ride-detail pattern) —
 * export/delete/edit-gates all live there now, same idiom as RidesScreen.tsx.
 * This list is tap-only: no row expands in place, no delete button ever
 * renders here.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentCatalog } from '../store/catalogStore.ts';
import { radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';
import { useTabNav } from './tabNav.tsx';

export default function RoutesScreen() {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const now = Date.now();
  // B-39: read per render, never captured at import (see RecordScreen).
  const CATALOG = currentCatalog();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>YOUR PLACES</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {CATALOG.landmarks.map((l) => {
          const dormant = !l.offerAtStart
            || (l.activeUntilMs !== null && l.activeUntilMs < now);
          return (
            <Pressable
              key={l.id}
              style={[st.row, { borderBottomColor: t.cardBorder }]}
              onPress={() => tabNav.openCatalog({ kind: 'place', id: l.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: dormant ? t.textDim : t.text, fontSize: 14 }}>
                  {l.label}{dormant ? '  · dormant' : ''}
                </Text>
                <Text style={{ color: t.textDim, fontSize: 11.5 }}>
                  {l.lat.toFixed(5)}, {l.lon.toFixed(5)} · {l.radiusM} m
                </Text>
              </View>
              <Text style={{ color: t.textDim }}>›</Text>
            </Pressable>
          );
        })}
        {/* B-39 minimal empty state (a blank install has no places yet) — a
            bare card read as broken; B-43's empty-state pass owns the real
            design and may replace this line. */}
        {CATALOG.landmarks.length === 0 ? (
          <Text style={{ color: t.textDim, fontSize: 14, paddingVertical: 9 }}>No places yet.</Text>
        ) : null}
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>ROUTES</Text>
      {/* B-39 minimal empty state — same note as the places card above. */}
      {CATALOG.routes.length === 0 ? (
        <Text style={{ color: t.textDim, fontSize: 14, marginBottom: 10 }}>No routes yet.</Text>
      ) : null}
      {CATALOG.routes.map((w) => {
        const from = CATALOG.landmarks.find((l) => l.id === w.startLandmarkId);
        const to = CATALOG.landmarks.find((l) => l.id === w.endLandmarkId);
        const wayCount = CATALOG.ways.filter((r) => r.routeId === w.id).length;
        return (
          <Pressable
            key={w.id}
            style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, marginBottom: 10 }]}
            onPress={() => tabNav.openCatalog({ kind: 'route', id: w.id })}
          >
            <View style={[st.row, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 15 }}>
                  {from?.label} → {to?.label}
                </Text>
                <Text style={{ color: t.textDim, fontSize: 11.5 }}>
                  {wayCount} way{wayCount === 1 ? '' : 's'}
                  {wayCount > 1 ? ' · asks which one at START' : ''}
                </Text>
              </View>
              <Text style={{ color: t.textDim }}>›</Text>
            </View>
          </Pressable>
        );
      })}

    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
});
