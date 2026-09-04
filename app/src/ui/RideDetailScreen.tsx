/**
 * WP-H: the full-screen ride detail — one ride view, opened two ways
 * (post-STOP, and a tap on a RIDES row). Absorbs ResultScreen.tsx's per-ride
 * board (route + date, headline GATED lap, rank line, per-sector split table,
 * "ON THIS ROUTE" personal-bests detail) and RidesScreen.tsx's expanded-row
 * actions (Export GPX+, Delete), adds the true ridden trace on the map, an
 * "Ignore in ranking" toggle, and (2026-09-04 addendum, §3.3b) "Make this the
 * reference of this route" — a one-step, destructive re-reference of an
 * EXISTING user route's benchmark, reset not remap (Nathan, 2026-09-04).
 *
 * §3.3 — the retroactive STOP-step offer (Fable ruling 2026-09-04 on the
 * WP-G conflict): ONE button whose label and card mode follow the draft.
 * `existingWayId === null` → "Make this the reference of a new way" and the
 * card in new-way mode; `existingWayId` set → "Save as a new route on <way>"
 * and the card in WP-G's variant mode (≥1 spec required). Shown iff a draft
 * exists and the ride is not already some route's reference. The flow below
 * ACTIONS mirrors RecordScreen's (WayNamingCard → GateAdjustCard) through
 * the shared store/wayFromRide.ts bodies; the WP-G duplicate-specs belt
 * check is repeated here as RecordScreen repeats it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RideDetailRequest } from './tabNav.tsx';
import { useTabNav } from './tabNav.tsx';
import { useTheme } from './themeContext.tsx';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import RouteMapView from './routeMapView.tsx';
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';
import { chipColors } from './chips.tsx';
import { dateTimeLabel, buildPbDetail } from './rideHistoryModel.ts';
import {
  fmt, lapValues, ownLapBarredFromRanking, rankingPoolFor, sectorValues, type UiTier,
} from './colourModel.ts';
import { rideDetailFor } from './rideDetailModel.ts';
import { currentCatalog, userCatalog } from '../store/catalogStore.ts';
import { routeLabelIn } from '../store/defaultRoute.ts';
import {
  getStoredResult, removeStoredResult, setIgnoredFromRanking, storedResultsForRoute,
} from '../store/resultsStore.ts';
import { freeRideNear, freeRideResults } from '../store/freeRides.ts';
import {
  clearLastRide, dropRecorded, getLastRide, replaceRecorded,
} from './lastRide.ts';
import {
  createWayFromDraft, draftWayFromRide, existingLandmarkLabel, existingWayProps,
  promoteRideToReference, readRideFixes, saveAdjustedGates, type GateAdjustDraft,
} from '../store/wayFromRide.ts';
import { findRouteWithSpecs, type WayCreationDraft, type WayNames } from '../store/wayCreation.ts';
import { specVocabulary } from '../store/routeSpecs.ts';
import { WayNamingCard } from './wayNamingCard.tsx';
import { GateAdjustCard } from './gateAdjustCard.tsx';
import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';
import { deleteRide, exportGpxPlus, listRides } from '../storage';
import type { RideMeta } from '../storage/types';
import { gpxBaseName, saveGpx } from './saveGpx.ts';

function tierColour(tier: UiTier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}

function fmtWhen(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}m${String(s % 60).padStart(2, '0')}s`;
}

/** ResultScreen.tsx's PbDetail, lifted in verbatim — the ride-detail's own
 * "ON THIS ROUTE" section, scoped to this ride's route (§3.4). */
function PbDetail(props: { routeId: string; lastRideId: string | null; showRanking: boolean; t: PaddockTheme }) {
  const { routeId, lastRideId, showRanking, t } = props;
  const detail = buildPbDetail(rankingPoolFor(routeId, lastRideId), lastRideId);
  return (
    <View style={st.pbDetail}>
      {detail.ranking.length > 0 ? (
        <>
          <Text style={[st.hint, { color: t.textDim }]}>last {detail.ranking.length} on this route</Text>
          {showRanking
            ? detail.ranking.map((row) => (
              <View key={row.posLabel} style={st.pbRow}>
                <Text style={[st.pbPos, { color: t.text }]}>{row.posLabel}</Text>
                <Text style={{ flex: 1, color: row.today ? t.accentText : t.textDim, fontSize: 13 }}>
                  {row.dateLabel}
                </Text>
                <Text style={[st.pbNum, { color: t.text }]}>{row.timeLabel}</Text>
                <Text style={[st.pbNum, { color: t.textDim }]}>{row.gapLabel}</Text>
              </View>
            ))
            : null}
        </>
      ) : (
        <Text style={[st.hint, { color: t.textDim }]}>no rides on file yet</Text>
      )}
      {detail.pbSectors.length > 0 ? (
        <>
          <Text style={[st.hint, { color: t.textDim, marginTop: 10 }]}>personal best sectors</Text>
          {detail.pbSectors.map((sec) => (
            <View key={sec.label} style={st.pbRow}>
              <Text style={[st.pbPos, { color: t.text }]}>{sec.label}</Text>
              <Text style={[st.pbNum, { color: t.text }]}>{sec.timeLabel}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

export default function RideDetailScreen({ request }: { request: RideDetailRequest }) {
  const { t } = useTheme();
  const { s } = useSettings();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [tick, setTick] = useState(0);
  const [fixes, setFixes] = useState<TrailPoint[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [meta, setMeta] = useState<RideMeta | null>(null);
  // §3.3 offer: 'pending' until the draft resolves; null = no offer.
  const [draft, setDraft] = useState<WayCreationDraft | null | 'pending'>('pending');
  const [naming, setNaming] = useState(false);
  const [adjust, setAdjust] = useState<GateAdjustDraft | null>(null);

  // The Delete confirm's copy needs meta's own timestamps — resolved once on
  // mount from the same source RidesScreen uses (listRides()); Export/Delete
  // stay disabled until it resolves, mirroring RidesScreen's own !meta guard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listRides();
        const found = list.find((m) => m.rideId === request.rideId) ?? null;
        if (!cancelled) setMeta(found);
      } catch {
        /* Export/Delete simply stay disabled — nothing else depends on this */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.rideId]);

  // The true ridden trace: the raw fixes, decimated through WP-J's own
  // min-distance rule rather than pushing every raw fix into the map.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await readRideFixes(request.rideId, createExpoFsAdapter());
      if (cancelled) return;
      if (raw === null) {
        setFixes(null);
        return;
      }
      let trail: readonly TrailPoint[] = [];
      for (const f of raw) trail = appendTrailPoint(trail, f.lat, f.lon);
      setFixes([...trail]);
    })();
    return () => {
      cancelled = true;
    };
  }, [request.rideId]);

  const model = useMemo(
    () => rideDetailFor(request.rideId, request.startedAtMs, {
      result: getStoredResult(request.rideId),
      free: freeRideNear(freeRideResults(), request.startedAtMs),
      routes: currentCatalog().routes,
      userRoutes: userCatalog().routes,
      laps: (routeId) => lapValues(routeId, request.rideId),
      sectors: (routeId, i) => sectorValues(routeId, i, request.rideId),
      barred: (routeId) => ownLapBarredFromRanking(routeId, request.rideId),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request.rideId, request.startedAtMs, tick],
  );

  // §3.3: the retroactive naming offer, drafted against the CURRENT catalog
  // with this ride's own matched route as the WP-F endpoint hint. Re-drafted
  // when the model's route changes; cleared explicitly after a create.
  useEffect(() => {
    let cancelled = false;
    setDraft('pending');
    (async () => {
      const d = await draftWayFromRide(request.rideId, request.startedAtMs, model.routeId, createExpoFsAdapter());
      if (!cancelled) setDraft(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [request.rideId, request.startedAtMs, model.routeId]);

  const offer = draft !== 'pending' && draft !== null && model.referenceOf === null ? draft : null;
  const offerWay = offer?.existingWayId ? existingWayProps(offer.existingWayId) : null;
  const offerLabel = offer?.existingWayId
    ? `Save as a new route on ${offerWay?.label ?? 'this way'}`
    : 'Make this the reference of a new way';

  async function onNamingSave(names: WayNames) {
    if (offer === null) return;
    // WP-G: belt to the card's own braces (RecordScreen's onNamingSave, verbatim).
    if (offer.existingWayId && findRouteWithSpecs(currentCatalog(), offer.existingWayId, names.specs ?? [])) {
      Alert.alert('That route already exists', 'Pick it on RECORD next time instead of adding it again.');
      return;
    }
    setBusy(true);
    try {
      const out = await createWayFromDraft(offer, names, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not create the way', out.errors.join('\n'));
        return;
      }
      setNaming(false);
      setDraft(null);
      setTick((v) => v + 1); // model re-reads: referenceOf = the new route
      if (out.adjust) setAdjust(out.adjust);
    } catch (e) {
      Alert.alert('Could not create the way', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onAdjustSave(chainageM: number[]) {
    if (adjust === null) return;
    setBusy(true);
    try {
      const out = await saveAdjustedGates(adjust, chainageM);
      if (!out.ok) {
        Alert.alert('Could not save the gates', out.errors.join('\n'));
        return;
      }
      setAdjust(null);
    } catch (e) {
      Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleIgnore() {
    setBusy(true);
    try {
      const upd = await setIgnoredFromRanking(request.rideId, !model.ignored);
      if (upd) replaceRecorded(upd);
      setTick((v) => v + 1);
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!meta) return;
    setExporting(true);
    try {
      const gpx = await exportGpxPlus(meta.rideId);
      const base = gpxBaseName(meta.startMs);
      const result = await saveGpx(base, gpx);
      if (result.method === 'saf') {
        Alert.alert('Exported', `${base}.gpx saved to the folder you picked.`);
      } else if (result.method === 'share-text') {
        Alert.alert('Shared', 'GPX sent as text via the share sheet.');
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  function onDelete() {
    if (!meta) return;
    Alert.alert(
      'Delete ride?',
      `${fmtWhen(meta.startMs)} · ${fmtDur(meta.endMs - meta.startMs)}\nThis permanently removes the raw trace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRide(meta.rideId);
              await removeStoredResult(meta.rideId);
              dropRecorded(meta.rideId);
              // RidesScreen remounts on close and refreshes itself; from
              // 'post-stop' the rider lands back on RECORD setup — same as
              // discard-after-the-fact.
              tabNav.closeRide();
            } catch (e) {
              Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  async function onPromote() {
    const routeId = model.routeId;
    if (routeId === null || model.promoteTarget === null) return;
    setBusy(true);
    try {
      const out = await promoteRideToReference(routeId, request.rideId, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not set the reference', out.errors.join('\n'));
        return;
      }
      // lastRide coherence — RoutesScreen.tsx's delete-route steps, plus
      // replaceRecorded for whatever the immediate re-derive came back with.
      for (const id of out.clearedRideIds) dropRecorded(id);
      if (getLastRide()?.routeId === routeId) clearLastRide();
      for (const id of [request.rideId, ...out.clearedRideIds]) {
        const r = getStoredResult(id);
        if (r) replaceRecorded(r);
      }
      setTick((v) => v + 1); // model re-reads: referenceOf = this route, promoteTarget = null, ranks reset
    } catch (e) {
      Alert.alert('Could not set the reference', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function confirmPromote() {
    const routeId = model.routeId;
    if (routeId === null) return;
    const n = storedResultsForRoute(routeId).filter((r) => r.rideId !== request.rideId).length;
    const ghosts = n === 0
      ? 'There are no past results on this route yet.'
      : `Its ${n} past result${n === 1 ? ' is' : 's are'} discarded and re-timed from the recordings against the new reference — old times and ranks do not survive.`;
    Alert.alert(
      `Overwrite the reference of "${routeLabelIn(currentCatalog(), routeId)}"?`,
      `This route will be overwritten and past ghosts will be lost.\n\nIts reference line and gates are rebuilt from this ride (${dateTimeLabel(request.startedAtMs)}). ${ghosts} Ride recordings are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Overwrite', style: 'destructive', onPress: () => void onPromote() },
      ],
    );
  }

  const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : 'BACK TO RIDES';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => tabNav.closeRide()} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: t.text }]}>RIDE</Text>
        <Text style={[styles.topDate, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
      </View>

      {model.kind === 'route' ? (
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
          <Text style={{ color: t.textDim }}>{routeLabelIn(currentCatalog(), model.routeId as string)}</Text>
          <Text style={[st.big, { color: tierColour(model.lapTier, t) }]}>{model.lapLabel}</Text>
          <Text style={{ color: t.textDim, fontSize: 12.5 }}>{model.rankLine}</Text>
          {model.referenceOf ? (
            <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 4 }}>
              reference ride of {routeLabelIn(currentCatalog(), model.referenceOf.id)}
            </Text>
          ) : null}

          <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
            <RouteMapView
              variant="browse"
              routeId={model.routeId}
              lat={null}
              lon={null}
              zoom={1}
              height={300}
              showRider={false}
              sectorColours={model.sectorColours}
              leadColour={colors.grey}
              trail={fixes ?? undefined}
            />
          </View>

          <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
            <Text style={[st.h2, { color: t.textDim }]}>SECTORS</Text>
            {model.sectorRows.map((sec) => {
              const col = chipColors(sec.tier, t).text;
              return (
                <View key={sec.index} style={styles.secRow}>
                  <Text style={[styles.secPos, { color: col }]}>{sec.label}</Text>
                  <Text style={[styles.secTime, { color: col }]}>{sec.timeLabel}</Text>
                  <Text style={[styles.secAvg, { color: t.textDim }]}>{sec.avgLabel}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
            <Text style={[st.h2, { color: t.textDim }]}>ON THIS ROUTE</Text>
            <PbDetail
              routeId={model.routeId as string}
              lastRideId={request.rideId}
              showRanking={s.tower}
              t={t}
            />
          </View>
        </View>
      ) : model.kind === 'free' && model.free ? (
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
          <Text style={{ color: t.textDim }}>FREE RIDE</Text>
          <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>
            {model.free.crossings.length} gates crossed
          </Text>
          {model.free.sectors.length > 0 ? (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              {model.free.sectors.map((sec, i) => (
                <Text key={i} style={[st.freeSectorRow, { color: t.text }]}>
                  {routeLabelIn(currentCatalog(), sec.routeId)} S{sec.index} — {fmt(sec.rawS, 1)} raw
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 10, textAlign: 'center' }}>
            Free-ride sector times live in their own category — they never mix into a route&apos;s
            history, so your route comparisons stay clean.
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
            <RouteMapView
              variant="browse"
              routeId={null}
              lat={null}
              lon={null}
              zoom={1}
              height={300}
              showRider={false}
              trail={fixes ?? undefined}
            />
          </View>
        </View>
      ) : (
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={{ color: t.textDim }}>no route — recorded only</Text>
          <Text style={{ color: t.textDim, marginTop: 4 }}>sector times not on file for this ride</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
            <RouteMapView
              variant="browse"
              routeId={null}
              lat={null}
              lon={null}
              zoom={1}
              height={300}
              showRider={false}
              trail={fixes ?? undefined}
            />
          </View>
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Text style={[st.h2, { color: t.textDim }]}>ACTIONS</Text>
        <View style={styles.pillRow}>
          <Pressable
            style={[styles.exportBtn, exporting && styles.busy]}
            disabled={exporting || !meta}
            onPress={onExport}
          >
            <Text style={styles.exportText}>{exporting ? '…' : 'Export GPX+'}</Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} disabled={!meta} onPress={onDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          {model.canToggleIgnore ? (
            <Pressable style={[styles.deleteBtn, busy && styles.busy]} disabled={busy} onPress={onToggleIgnore}>
              <Text style={styles.deleteText}>{model.ignored ? 'Count in ranking' : 'Ignore in ranking'}</Text>
            </Pressable>
          ) : null}
        </View>
        {model.promoteTarget !== null ? (
          <Pressable
            style={[styles.deleteBtn, styles.promoteBtn, busy && styles.busy]}
            disabled={busy}
            onPress={confirmPromote}
          >
            <Text style={styles.deleteText}>Make this the reference of this route</Text>
          </Pressable>
        ) : null}
        {offer !== null && !naming && adjust === null ? (
          <Pressable
            style={[styles.deleteBtn, styles.promoteBtn, busy && styles.busy]}
            disabled={busy}
            onPress={() => setNaming(true)}
          >
            <Text style={styles.deleteText}>{offerLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {naming && offer !== null ? (
        <View style={{ marginTop: 12 }}>
          <WayNamingCard
            startExistingLabel={existingLandmarkLabel(offer.start)}
            endExistingLabel={existingLandmarkLabel(offer.end)}
            loop={offer.loop}
            busy={busy}
            matchedRouteLabel={offer.matchedRouteId ? routeLabelIn(currentCatalog(), offer.matchedRouteId) : null}
            existingWay={offerWay}
            vocabulary={specVocabulary(currentCatalog().routes)}
            onSave={(names) => void onNamingSave(names)}
            onSkip={() => setNaming(false)}
          />
        </View>
      ) : null}
      {adjust !== null ? (
        <View style={{ marginTop: 12 }}>
          <GateAdjustCard
            refLine={adjust.ref}
            refLengthM={adjust.refLengthM}
            initialChainageM={adjust.chainageM}
            busy={busy}
            onKeep={() => setAdjust(null)}
            onSave={(ch) => void onAdjustSave(ch)}
          />
        </View>
      ) : null}

      <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.closeRide()}>
        <Text style={[st.slimBtnText, { color: t.onAccent }]}>{primaryLabel}</Text>
      </Pressable>

      <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 12 }}>
        Position is a fact; colour is a judgement — a mid-pack ride is never dressed as failure.
        Purple beats your best, green beats your recent average, yellow is an ordinary lap.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backText: { fontSize: 14, fontWeight: '700' },
  topTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  topDate: { fontSize: 12 },
  secRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  secPos: { width: 44, fontSize: 13, fontWeight: '700' },
  secTime: { width: 66, fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'right' },
  secAvg: { flex: 1, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  exportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.btn,
    backgroundColor: t.accent,
  },
  busy: { opacity: 0.5 },
  exportText: { color: t.onAccent, fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  promoteBtn: { marginTop: 8, alignSelf: 'flex-start' },
  deleteText: { color: t.textDim, fontSize: 13, fontWeight: '700' },
});

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 4, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13, paddingVertical: 4 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  slimBtn: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.btn,
  },
  slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
  freeSectorRow: { fontSize: 14, fontVariant: ['tabular-nums'], textAlign: 'center', paddingVertical: 2 },
  pbDetail: { paddingBottom: 10 },
  hint: { fontSize: 11.5, marginBottom: 2 },
  pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  pbPos: { width: 40, fontSize: 13, fontWeight: '700' },
  pbNum: { fontVariant: ['tabular-nums'], textAlign: 'right', width: 66, fontSize: 13 },
});
