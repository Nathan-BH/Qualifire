/**
 * RESULTS — virgin-cycle15 brief 13 (Nathan 2026-09-27) + Fable ruling
 * 2026-09-28: grouped by route, then way, most-used first. Opens on a list
 * of route cards (`From → To`, `N ways · M rides`, ROUTES tab's visual
 * register); tapping a multi-way route reveals its ridden ways
 * (resultsWayList.tsx); tapping a single-way route, or a way row, opens the
 * same ResultsDetailScreen board+scatterplot as before this brief.
 *
 * `openRouteId` is a PROP, not local state (the ruling): App.tsx's ternary
 * mount-swaps ResultsDetailScreen IN PLACE of this screen, so any in-screen
 * state for the drilled-into route would die on that hop and BACK would
 * always land on the route list instead of the way list. Shell owns it
 * (`resultsRoute`) and this screen changes it through
 * tabNav.openResultsRoute/closeResultsRoute. No local useState, and no
 * hardware-back subscription of its own here — hardware back for the way
 * list is handled once, in App.tsx's existing listener.
 *
 * WP-1 (unchanged): sport-scoped exactly like ROUTES/RIDES — `activeCatalog()`,
 * not `currentCatalog()` — and carries the same bare sport-name badge line.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activeCatalog, activeSportId, currentSports } from '../store/sportStore';
import { storedResultsForWay } from '../store/resultsStore';
import { allTimeBestLapS } from './colourModel';
import { buildResultsRoutes, type ResultsRoute } from './resultsListModel';
import ResultsWayList from './resultsWayList';
import { useTabNav } from './tabNav';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

export default function ResultsScreen({ openRouteId }: { openRouteId: string | null }) {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Bumped once after mount so the model re-reads the results store after
  // whatever async hydration RIDES' own backfill pass may still be doing —
  // same idiom as RidesScreen's resultsTick, CatalogDetailScreen's tick.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((v) => v + 1);
  }, []);

  const CATALOG = activeCatalog();
  const sportId = activeSportId();
  const sportLabel = currentSports().sports.find((sp) => sp.id === sportId)?.label ?? null;

  const routes: ResultsRoute[] = useMemo(
    () => buildResultsRoutes(CATALOG, storedResultsForWay, allTimeBestLapS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CATALOG, tick],
  );

  const openRoute = openRouteId !== null ? routes.find((r) => r.routeId === openRouteId) ?? null : null;

  // §2's "if it is gone because rides were deleted meanwhile" bullet — also
  // covers a sport switch, since openRouteId belongs to the previous sport's
  // catalog once CATALOG changes underneath it.
  useEffect(() => {
    if (openRouteId !== null && openRoute === null) tabNav.closeResultsRoute();
  }, [openRouteId, openRoute, tabNav]);

  if (openRoute !== null) {
    return (
      <ResultsWayList
        route={openRoute}
        onBack={() => tabNav.closeResultsRoute()}
        onOpenWay={(wayId) => tabNav.openResults({ wayId })}
      />
    );
  }

  // Group 5 Inspect fix-up (2026-09-28): a ScrollView, like RoutesScreen's
  // card register -- a plain flex:1 View clipped the least-used routes once
  // the ridden list outgrew the screen. The cards sit in their own View so
  // the container's `gap` spaces the title/badge/block, not every card.
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Results</Text>
      {/* Q5/WP-1: bare sport-name badge, same convention as ROUTES/RIDES. */}
      <Text style={styles.sub}>
        {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET — ADD ONE IN SETTINGS'}
      </Text>
      {routes.length === 0 ? (
        // decision 8: no ridden route at all.
        <Text style={styles.empty}>NO RESULTS YET — RIDE A ROUTE FIRST</Text>
      ) : (
        <View>
          {routes.map((route) => (
            <Pressable
              key={route.routeId}
              style={styles.card}
              onPress={() => (
                route.ways.length === 1
                  // decision 5: a single ridden way skips the way list.
                  ? tabNav.openResults({ wayId: route.ways[0].wayId })
                  : tabNav.openResultsRoute(route.routeId)
              )}
            >
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{route.label}</Text>
                  <Text style={styles.cardSub}>
                    {route.ways.length} way{route.ways.length === 1 ? '' : 's'} · {route.rideCount} ride{route.rideCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  title: {
    color: t.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sub: { color: t.text2, fontSize: 14, fontVariant: ['tabular-nums'] },
  empty: { color: t.textDim, fontSize: 14 },
  // Route-card register copied from RoutesScreen.tsx's `st` (decision 10 —
  // values, not the file's components).
  card: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.card,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  cardTitle: { color: t.text, fontSize: 15 },
  cardSub: { color: t.textDim, fontSize: 11.5 },
  chev: { color: t.textDim, fontSize: 16 },
});
