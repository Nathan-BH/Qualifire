/**
 * Routes tab (IDEAS §20/§21, mockup 2026-08-16) — the ratified catalog, on the
 * phone: the six landmarks with their real radii, dormant ones marked, and the
 * routes that exist per way.
 *
 * Everything here is READ from src/store/catalog.seed.json, which was built
 * from data/analysis/landmarks_v1.json — Nathan's curated set. Nothing is
 * discovered at runtime: places and routes enter the catalog because he agreed
 * they are places and routes (DATA-MODEL §8a).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import catalogJson from '../store/catalog.seed.json';
import type { Catalog } from '../store/types.ts';
import { rankedCountFor } from './colourModel.ts';
import { routeLabel } from '../store/defaultRoute.ts';
import RouteMapView from './routeMapView.tsx';
import { radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const CATALOG = catalogJson as unknown as Catalog;

export default function RoutesScreen() {
  const { t } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>YOUR PLACES</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {CATALOG.landmarks.map((l) => {
          const dormant = !l.offerAtStart
            || (l.activeUntilMs !== null && l.activeUntilMs < now);
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
            </View>
          );
        })}
        <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
          Dormant places keep seeding history but are never offered at START.
          Radius is measured, not guessed: p90 of the endpoint spread, capped at half
          the gap to the nearest place.
        </Text>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>WAYS</Text>
      {CATALOG.ways.map((w) => {
        const from = CATALOG.landmarks.find((l) => l.id === w.startLandmarkId);
        const to = CATALOG.landmarks.find((l) => l.id === w.endLandmarkId);
        const routes = CATALOG.routes.filter((r) => r.wayId === w.id);
        const isOpen = open === w.id;
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
                    </View>
                  );
                })}
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
});
