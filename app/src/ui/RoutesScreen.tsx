/**
 * MAP tab (virgin-cycle24 brief 03, Nathan 2026-10-06). The old ROUTES tab
 * (a places list + route cards) is now one full-bleed map of the active
 * sport's catalog, with three levels:
 *   OVERVIEW    every place a labelled pin, ONE line per route pair (A->B and
 *               B->A are one line), only the usual way drawn, no gates.
 *   PLACE focus tap a pin: its routes at full strength, the rest ghosted; a
 *               bottom sheet lists the routes out of and into the place.
 *   ROUTE focus tap a line (or a highlighted sheet row again): the route's
 *               ways, the highlighted one strongest with its gates; the sheet
 *               lists the ways.
 * The sheet header opens the existing CatalogDetailScreen (rename/merge/delete/
 * edit gates stay reachable). The file keeps its old name and the tab id
 * 'routes'; only the tab label changed to `map`.
 *
 * B-39: the catalog is read per render, never captured at import.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activeCatalog, activeSportId, currentSports } from '../store/sportStore.ts';
import { storedResultsForWay } from '../store/resultsStore.ts';
import {
  overviewModel, placeFocusModel, routeFocusModel, type CatalogMapDeps,
} from './catalogMapModel.ts';
import CatalogMapView, { catalogAssetFor, type CatalogMapFocus } from './catalogMapView.tsx';
import { useTheme } from './themeContext.tsx';
import { useTabNav } from './tabNav.tsx';

export default function RoutesScreen() {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const CATALOG = activeCatalog();
  const sportId = activeSportId();
  const sportLabel = currentSports().sports.find((sp) => sp.id === sportId)?.label ?? null;
  const [focus, setFocus] = useState<CatalogMapFocus>({ level: 'overview' });

  const deps: CatalogMapDeps = {
    catalog: CATALOG,
    pathFor: (id) => catalogAssetFor(id)?.path ?? null,
    ridesFor: (id) => storedResultsForWay(id).length,
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const overview = useMemo(() => overviewModel(deps), [CATALOG]);
  const place = focus.level === 'place' ? placeFocusModel(focus.placeId, deps) : null;
  const route = focus.level === 'route' ? routeFocusModel(focus.routeId, deps) : null;

  // A focused place/route that vanished (deleted in the detail screen) falls back to OVERVIEW.
  useEffect(() => {
    if ((focus.level === 'place' && !place) || (focus.level === 'route' && !route)) {
      setFocus({ level: 'overview' });
    }
  }, [focus, place, route]);

  const gateAsset = route
    ? catalogAssetFor(focus.level === 'route' ? (focus.highlightWayId ?? route.usualWayId ?? '') : '')
    : null;

  const toOverview = () => setFocus({ level: 'overview' });
  // Tap a route (line or sheet row): first tap highlights within a place focus, the second opens ROUTE focus.
  const onPressRoute = (routeId: string) => {
    if (focus.level === 'place' && focus.highlightRouteId !== routeId) {
      setFocus({ level: 'place', placeId: focus.placeId, highlightRouteId: routeId });
    } else {
      setFocus({ level: 'route', routeId, highlightWayId: null });
    }
  };

  const sheetLabel = place ? place.place.label : route ? route.label : '';
  const openDetail = () => {
    if (place) tabNav.openCatalog({ kind: 'place', id: place.place.id });
    else if (route) tabNav.openCatalog({ kind: 'route', id: route.routeId });
  };

  return (
    <View style={{ flex: 1 }}>
      <CatalogMapView
        overview={overview}
        focus={focus}
        place={place}
        route={route}
        gateAsset={gateAsset}
        sheetOpen={focus.level !== 'overview'}
        onPressPin={(id) => setFocus({ level: 'place', placeId: id, highlightRouteId: null })}
        onPressLine={onPressRoute}
        onPressEmpty={toOverview}
      />
      <View style={[st.badge, { backgroundColor: t.card, borderColor: t.cardBorder }]} pointerEvents="none">
        <Text style={[st.badgeText, { color: t.textDim }]}>
          {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET · ADD ONE IN SETTINGS'}
        </Text>
      </View>
      {place || route ? (
        <View style={[st.sheet, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <View style={st.sheetHead}>
            <Pressable style={st.sheetTitle} onPress={openDetail}>
              <Text style={{ color: t.text, fontSize: 15, flexShrink: 1 }}>{sheetLabel}</Text>
              <Text style={{ color: t.textDim }}>›</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={toOverview}>
              <Text style={{ color: t.textDim, fontSize: 18 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView>
            {place ? place.rows.map((row) => {
              const on = focus.level === 'place' && row.routeId === focus.highlightRouteId;
              return (
                <Pressable key={row.routeId} style={[st.row, { borderTopColor: t.cardBorder }]}
                  onPress={() => onPressRoute(row.routeId)}>
                  <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                  <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                </Pressable>
              );
            }) : null}
            {route ? route.ways.map((row) => {
              const on = row.wayId === (focus.level === 'route' ? (focus.highlightWayId ?? route.usualWayId) : null);
              return (
                <Pressable key={row.wayId} style={[st.row, { borderTopColor: t.cardBorder }]}
                  onPress={() => setFocus({ level: 'route', routeId: route.routeId, highlightWayId: row.wayId })}>
                  <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                  <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                </Pressable>
              );
            }) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  badge: { position: 'absolute', top: 8, left: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, letterSpacing: 2 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 34, maxHeight: 280, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 13, gap: 12 },
  sheetTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingVertical: 9, paddingHorizontal: 13, gap: 12 },
});
