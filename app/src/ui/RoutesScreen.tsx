/**
 * ROUTES tab (MAP in cycle24; renamed back in virgin-cycle27 07) (virgin-cycle24 brief 03, Nathan 2026-10-06). The old ROUTES tab
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
 * 'routes'; the tab label is `routes` again.
 * virgin-cycle25 brief 02: route focus also carries the way's trend panel (trendPanelModel.ts + ResultsPlot inline) under the way rows; place focus unchanged.
 *
 * B-39: the catalog is read per render, never captured at import.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { activeCatalog, activeSportId, currentSports } from '../store/sportStore.ts';
import { storedResultsForWay } from '../store/resultsStore.ts';
import type { RideResult } from '../store/types.ts';
import {
  overviewModel, placeFocusModel, routeFocusModel, type CatalogMapDeps,
} from './catalogMapModel.ts';
import CatalogMapView, { catalogAssetFor, type CatalogMapFocus } from './catalogMapView.tsx';
import { getStatus, lastKnownPositionIfPermitted, refreshPositionIfPermitted, subscribe, type TrackerStatus } from '../location';
import { useTheme } from './themeContext.tsx';
import { useTabNav } from './tabNav.tsx';
import ResultsPlot from './resultsPlot.tsx';
import {
  PANEL_PLOT_H, ROUTE_SHEET_CAMERA_PAD, ROUTE_SHEET_MAX_H, WAY_ROWS_MAX_H, trendPanelFor,
} from './trendPanelModel.ts';

export default function RoutesScreen() {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const CATALOG = activeCatalog();
  const sportId = activeSportId();
  const sportLabel = currentSports().sports.find((sp) => sp.id === sportId)?.label ?? null;
  const [focus, setFocus] = useState<CatalogMapFocus>({ level: 'overview' });
  // virgin-cycle25 02: the tapped dot of the trend panel, keyed by way so a way
  // switch never carries a selection over (no effect needed: derived below).
  const [plotSel, setPlotSel] = useState<{ wayId: string; rideId: string } | null>(null);

  // virgin-cycle27 09 (Nathan 2026-10-08): the rider's position for the blue dot and the ME half of
  // the toggle. Order (Fable ruling 8.1): a LIVE fix from the shared store this launch → the phone's
  // last known position (OS cache, read once on open, kept in local state, never written to the
  // store) → nothing (toggle reads FIT, no dot, nothing said). Plus ONE quiet fresh read when the tab
  // opens and one per ME tap (never prompts; RECORD is still the only place that asks).
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  const [lastKnown, setLastKnown] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => subscribe(setStatus), []);
  useEffect(() => {
    let alive = true;
    void lastKnownPositionIfPermitted().then((p) => { if (alive && p !== null) setLastKnown({ lat: p.lat, lon: p.lon }); });
    void refreshPositionIfPermitted();
    return () => { alive = false; };
  }, []);
  const here = status.lastLat !== null && status.lastLon !== null ? { lat: status.lastLat, lon: status.lastLon } : lastKnown;

  const deps: CatalogMapDeps = {
    catalog: CATALOG,
    pathFor: (id) => catalogAssetFor(id)?.path ?? null,
    ridesFor: (id) => storedResultsForWay(id).length,
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const overview = useMemo(() => overviewModel(deps), [CATALOG]);
  const place = focus.level === 'place' ? placeFocusModel(focus.placeId, deps) : null;
  const route = focus.level === 'route' ? routeFocusModel(focus.routeId, deps) : null;
  const trend = route
    ? trendPanelFor(route, focus.level === 'route' ? focus.highlightWayId : null, (id): RideResult[] => storedResultsForWay(id))
    : null;
  const plotSelected = trend !== null && plotSel !== null && plotSel.wayId === trend.wayId ? plotSel.rideId : null;

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
        sheetPad={focus.level === 'route' ? ROUTE_SHEET_CAMERA_PAD : undefined}
        onPressPin={(id) => setFocus({ level: 'place', placeId: id, highlightRouteId: null })}
        onPressLine={onPressRoute}
        onPressEmpty={toOverview}
        here={here}
        onMe={() => { void refreshPositionIfPermitted(); }}
      />
      <View style={[st.badge, { backgroundColor: t.card, borderColor: t.cardBorder }]} pointerEvents="none">
        <Text style={[st.badgeText, { color: t.textDim }]}>
          {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET · ADD ONE IN SETTINGS'}
        </Text>
      </View>
      {place || route ? (
        <View style={[st.sheet, route ? st.sheetRoute : null, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <View style={st.sheetHead}>
            <Pressable style={st.sheetTitle} onPress={openDetail}>
              <Text style={{ color: t.text, fontSize: 15, flexShrink: 1 }}>{sheetLabel}</Text>
              <Text style={{ color: t.textDim }}>›</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={toOverview}>
              <Text style={{ color: t.textDim, fontSize: 18 }}>×</Text>
            </Pressable>
          </View>
          {place ? (
            <ScrollView>
              {place.rows.map((row) => {
                const on = focus.level === 'place' && row.routeId === focus.highlightRouteId;
                return (
                  <Pressable key={row.routeId} style={[st.row, { borderTopColor: t.cardBorder }]}
                    onPress={() => onPressRoute(row.routeId)}>
                    <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                    <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {route && trend ? (
            <>
              <ScrollView style={{ maxHeight: WAY_ROWS_MAX_H }}>
                {route.ways.map((row) => {
                  const on = row.wayId === (focus.level === 'route' ? (focus.highlightWayId ?? route.usualWayId) : null);
                  return (
                    <Pressable key={row.wayId} style={[st.row, { borderTopColor: t.cardBorder }]}
                      onPress={() => setFocus({ level: 'route', routeId: route.routeId, highlightWayId: row.wayId })}>
                      <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                      <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {trend.hasPlot && trend.wayId !== null ? (
                <View style={[st.plotWrap, { borderTopColor: t.cardBorder }]}>
                  <ResultsPlot
                    variant="inline"
                    height={PANEL_PLOT_H}
                    results={trend.results}
                    selectedRideId={plotSelected}
                    selectedPosLabel=""
                    onSelect={(id) => setPlotSel(id === null || trend.wayId === null ? null : { wayId: trend.wayId, rideId: id })}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  badge: { position: 'absolute', top: 8, left: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, letterSpacing: 2 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 34, maxHeight: 280, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sheetRoute: { maxHeight: ROUTE_SHEET_MAX_H },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 13, gap: 12 },
  sheetTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingVertical: 9, paddingHorizontal: 13, gap: 12 },
  plotWrap: { borderTopWidth: 1, paddingHorizontal: 8, paddingBottom: 4 },
});
