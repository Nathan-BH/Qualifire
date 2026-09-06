/**
 * WP-K (cycle 2): the full-screen ROUTES-tab detail — a place or a way,
 * mount-swapped in place of the active tab while open (mirrors
 * `RideDetailScreen.tsx`'s WP-H pattern — chrome copied from there, not
 * imported: that file exports nothing but the screen). Absorbs
 * `RoutesScreen.tsx`'s old expand-in-place card: real gate-set facts (no
 * more the hardcoded "4 sectors · START ~160 m in"), the delete actions
 * (moved to `catalogDeleteActions.ts`), and the "edit gates" entry point —
 * WP-I/WP-J's full-screen editor, opened via `tabNav.openGateAdjust`
 * (2026-09-05 reconciliation, Part B: nothing to move here, no state, no
 * functions, just the one button).
 *
 * A route never gets its own screen (§3.1): a way's routes are its
 * variants, so the way body carries one section per route.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CatalogDetailRequest } from './tabNav.tsx';
import { useTabNav } from './tabNav.tsx';
import { useTheme } from './themeContext.tsx';
import { PaddockTheme, radius } from './theme.ts';
import WayMapView from './wayMapView.tsx';
import { dateTimeLabel } from './rideHistoryModel.ts';
import { rankedCountFor } from './colourModel.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { shippedCatalog } from '../store/seed.ts';
import { refFor } from '../live/refs.ts';
import { getStoredResult, storedResultsForWay } from '../store/resultsStore.ts';
import { gateEditDraftFor } from '../store/routeFromRide.ts';
import {
  onDeleteLandmark as deleteLandmark,
  onDeleteWay as deleteWay,
  onDeleteRoute as deleteRoute,
} from './catalogDeleteActions.ts';
import {
  placeDetailFor, routeDetailFor,
  type CatalogDetailDeps, type PlaceDetailModel, type WayDetailModel, type RouteDetailModel,
} from './catalogDetailModel.ts';

export default function CatalogDetailScreen({ request }: { request: CatalogDetailRequest }) {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);
  // Bumped after an in-screen delete so the model re-reads currentCatalog()
  // (same idiom as RoutesScreen's old tick/RidesScreen's resultsTick).
  const [, setTick] = useState(0);
  const bump = () => setTick((v) => v + 1);

  // B-39: read per render, never captured at import (RoutesScreen.tsx:122-125).
  const CATALOG = currentCatalog();
  const SEED = shippedCatalog();

  // live/refs.ts's refFor() throws on an unknown track — swallow to null
  // here exactly as routeMapView.tsx:145 does, so a route with no
  // resolvable reference line just omits its length instead of crashing.
  const safeRefFor = (id: string) => {
    try {
      return refFor(id);
    } catch {
      return null;
    }
  };

  const deps: CatalogDetailDeps = {
    catalog: CATALOG,
    seed: SEED,
    nowMs: Date.now(),
    refLengthM: (refLineId) => safeRefFor(refLineId)?.length ?? null,
    resultsOnFile: (wayId) => storedResultsForWay(wayId).length,
    rankedCount: (wayId) => rankedCountFor(wayId),
    storedStartMs: (rideId) => getStoredResult(rideId)?.startedAtMs ?? null,
  };

  const model = useMemo(
    () => (request.kind === 'place' ? placeDetailFor(request.id, deps) : routeDetailFor(request.id, deps)),
    // deps is rebuilt every render from the same per-render CATALOG/SEED
    // reads above; request/tick are what actually decide when to recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, setTick],
  );

  // §3.4: the subject can vanish out from under this screen (a route delete
  // that takes its way with it; a way delete). null model => close, never
  // during render.
  useEffect(() => {
    if (model === null) tabNav.closeCatalog();
  }, [model, tabNav]);

  if (model === null) return null;

  const title = request.kind === 'place' ? 'PLACE' : 'ROUTE';
  const caption = model.seedOwned ? 'shipped' : 'yours';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => tabNav.closeCatalog()} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.topDate, { color: t.textDim }]}>{caption}</Text>
      </View>

      {request.kind === 'place' ? (
        <PlaceBody
          model={model as PlaceDetailModel}
          t={t}
          styles={styles}
          onOpenRoute={(routeId) => tabNav.openCatalog({ kind: 'route', id: routeId })}
          onDelete={() => {
            const l = CATALOG.landmarks.find((x) => x.id === request.id);
            if (l) deleteLandmark(SEED, l, bump);
          }}
        />
      ) : (
        <RouteBody
          model={model as RouteDetailModel}
          t={t}
          styles={styles}
          onOpenPlace={(placeId) => tabNav.openCatalog({ kind: 'place', id: placeId })}
          onOpenRide={(rideId, startedAtMs) => tabNav.openRide({ rideId, source: 'routes', startedAtMs })}
          onEditGates={(wayId) => tabNav.openGateAdjust({ wayId })}
          onDeleteWay={(wayId) => {
            const w = CATALOG.routes.find((x) => x.id === request.id);
            const r = CATALOG.ways.find((x) => x.id === wayId);
            if (w && r) deleteWay(CATALOG, SEED, w, r, bump);
          }}
          onDeleteRoute={() => {
            const w = CATALOG.routes.find((x) => x.id === request.id);
            if (w) deleteRoute(CATALOG, SEED, w, bump);
          }}
        />
      )}

      <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.closeCatalog()}>
        <Text style={[st.slimBtnText, { color: t.onAccent }]}>BACK TO ROUTES</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- PlaceBody

function PlaceBody({
  model, t, styles, onOpenRoute, onDelete,
}: {
  model: PlaceDetailModel;
  t: PaddockTheme;
  styles: ReturnType<typeof makeStyles>;
  onOpenRoute: (routeId: string) => void;
  onDelete: () => void;
}) {
  const fromRoutes = model.routes.filter((w) => w.direction === 'from' || w.direction === 'loop');
  const toRoutes = model.routes.filter((w) => w.direction === 'to');
  const noRoutes = fromRoutes.length === 0 && toRoutes.length === 0;

  return (
    <>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={{ color: model.dormant ? t.textDim : t.text, fontSize: 18, fontWeight: '800' }}>
          {model.label}{model.dormant ? '  · dormant' : ''}
        </Text>
        <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 6 }}>{model.coordsLabel}</Text>
        <Text style={{ color: t.textDim, fontSize: 12.5 }}>{model.radiusLabel}</Text>
        <Text style={{ color: t.textDim, fontSize: 12.5 }}>
          {model.offerAtStart ? 'offered at START' : 'not offered at START'}
        </Text>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>{noRoutes ? 'ROUTES' : 'ROUTES FROM HERE'}</Text>
      {noRoutes ? (
        <Text style={{ color: t.textDim, fontSize: 13 }}>No route uses this place yet.</Text>
      ) : (
        <>
          {fromRoutes.map((w) => <RouteLinkRow key={w.routeId} route={w} t={t} onPress={() => onOpenRoute(w.routeId)} />)}
          {fromRoutes.length === 0 ? <Text style={{ color: t.textDim, fontSize: 13 }}>None.</Text> : null}
          {toRoutes.length > 0 ? (
            <>
              <Text style={[st.h2, { color: t.textDim }]}>ROUTES TO HERE</Text>
              {toRoutes.map((w) => <RouteLinkRow key={w.routeId} route={w} t={t} onPress={() => onOpenRoute(w.routeId)} />)}
            </>
          ) : null}
        </>
      )}

      {model.touchingWayIds.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <WayMapView
            variant="browse"
            gatesOnly
            gateWayIds={model.touchingWayIds}
            wayId={null}
            lat={null}
            lon={null}
            showRider={false}
            zoom={1}
            height={260}
          />
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        {model.deletable ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={onDelete}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function RouteLinkRow({
  route, t, onPress,
}: {
  route: PlaceDetailModel['routes'][number];
  t: PaddockTheme;
  onPress: () => void;
}) {
  return (
    <Pressable style={st.linkRow} onPress={onPress}>
      <Text style={{ flex: 1, color: t.text, fontSize: 14 }}>
        {route.label} · {route.wayCount} way{route.wayCount === 1 ? '' : 's'}
      </Text>
      <Text style={{ color: t.textDim }}>›</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ WayBody

function RouteBody({
  model, t, styles, onOpenPlace, onOpenRide, onEditGates, onDeleteWay, onDeleteRoute,
}: {
  model: RouteDetailModel;
  t: PaddockTheme;
  styles: ReturnType<typeof makeStyles>;
  onOpenPlace: (placeId: string) => void;
  onOpenRide: (rideId: string, startedAtMs: number) => void;
  onEditGates: (wayId: string) => void;
  onDeleteWay: (wayId: string) => void;
  onDeleteRoute: () => void;
}) {
  return (
    <>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{model.label}</Text>
        {model.loop ? (
          <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>loop · {model.loopDiscriminator}</Text>
        ) : null}
        <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: model.loop ? 0 : 4 }}>
          {model.ways.length} way{model.ways.length === 1 ? '' : 's'}
          {model.asksAtStart ? ' · asks which one at START' : ''}
        </Text>
        {model.from ? (
          <Pressable style={st.linkRow} onPress={() => onOpenPlace(model.from!.id)}>
            <Text style={{ flex: 1, color: t.text, fontSize: 13 }}>from: {model.from.label}</Text>
            <Text style={{ color: t.textDim }}>›</Text>
          </Pressable>
        ) : null}
        {model.to ? (
          <Pressable style={st.linkRow} onPress={() => onOpenPlace(model.to!.id)}>
            <Text style={{ flex: 1, color: t.text, fontSize: 13 }}>to: {model.to.label}</Text>
            <Text style={{ color: t.textDim }}>›</Text>
          </Pressable>
        ) : null}
      </View>

      {model.ways.map((r) => (
        <WaySection
          key={r.id}
          r={r}
          t={t}
          styles={styles}
          onOpenRide={onOpenRide}
          onEditGates={onEditGates}
          onDeleteWay={onDeleteWay}
        />
      ))}

      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        {model.deletable ? (
          <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={onDeleteRoute}>
            <Text style={[styles.deleteText, { color: t.textDim }]}>Delete route</Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function FactRow({ label, value, t }: { label: string; value: string; t: PaddockTheme }) {
  return (
    <View style={st.factRow}>
      <Text style={{ color: t.textDim, flex: 1, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 13, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function WaySection({
  r, t, styles, onOpenRide, onEditGates, onDeleteWay,
}: {
  r: WayDetailModel;
  t: PaddockTheme;
  styles: ReturnType<typeof makeStyles>;
  onOpenRide: (rideId: string, startedAtMs: number) => void;
  onEditGates: (wayId: string) => void;
  onDeleteWay: (wayId: string) => void;
}) {
  // B.2 (2026-09-05 update): the "edit gates" guard is computed here at the
  // screen level, mirroring RoutesScreen.tsx:210's own `routeDeletable ?
  // gateEditDraftFor(r.id) : null` — kept out of the pure model on purpose
  // (taste call T6; the model stays store-read-agnostic about wayFromRide.ts).
  const gateEditable = r.deletable && gateEditDraftFor(r.id) !== null;

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[st.h2, { color: t.textDim, marginTop: 0 }]}>WAY · {r.variantLabel}</Text>
      <WayMapView variant="browse" wayId={r.refLineId} lat={null} lon={null} zoom={1} height={260} showRider={false} />

      <View style={{ marginTop: 8 }}>
        {r.lengthLabel !== null ? <FactRow label="length" value={r.lengthLabel} t={t} /> : null}
        {r.gatesLabel !== null ? <FactRow label="gates" value={r.gatesLabel} t={t} /> : null}
        {r.gateRows.map((g) => <FactRow key={g.name} label={g.name} value={g.chainageLabel} t={t} />)}
        <FactRow label="rides on file" value={String(r.ridesOnFile)} t={t} />
        <FactRow label="ranked" value={String(r.rankedCount)} t={t} />
        {r.referenceRide !== null ? (
          <Pressable style={st.linkRow} onPress={() => onOpenRide(r.referenceRide!.rideId, r.referenceRide!.startedAtMs)}>
            <Text style={{ flex: 1, color: t.textDim, fontSize: 13 }}>reference ride</Text>
            <Text style={{ color: t.text, fontSize: 13 }}>{dateTimeLabel(r.referenceRide.startedAtMs)} ›</Text>
          </Pressable>
        ) : r.referenceUnscored ? (
          <FactRow label="reference ride" value="on file, not scored" t={t} />
        ) : null}
      </View>

      {gateEditable ? (
        // WP-I's entry point via WP-J's full-screen editor (GateAdjustScreen.tsx);
        // moved here from RoutesScreen.tsx by WP-K (cycle 2). Only for a user
        // route with a resolvable draft.
        <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder }]} onPress={() => onEditGates(r.id)}>
          <Text style={[styles.deleteText, { color: t.textDim }]}>edit gates</Text>
        </Pressable>
      ) : null}
      {r.deletable ? (
        <Pressable style={[styles.deleteBtn, { borderColor: t.cardBorder, marginTop: 8 }]} onPress={() => onDeleteWay(r.id)}>
          <Text style={[styles.deleteText, { color: t.textDim }]}>delete way</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ styles

// Copied VALUES from RideDetailScreen.tsx's makeStyles (topBar/backText/
// topTitle/topDate/deleteBtn/deleteText/pillRow) and its module `st` (h2/
// card/slimBtn/slimBtnText) — that file exports nothing but the screen, so
// these are duplicated on purpose, not imported.
const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backText: { fontSize: 14, fontWeight: '700' },
  topTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  topDate: { fontSize: 12 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  deleteText: { color: t.textDim, fontSize: 13, fontWeight: '700' },
});

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13, paddingVertical: 10 },
  slimBtn: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.btn,
  },
  slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  factRow: { flexDirection: 'row', paddingVertical: 3 },
});
