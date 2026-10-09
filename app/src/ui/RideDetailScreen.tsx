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
 * the suggestion rows mirrors RecordScreen's (WayNamingCard → GateAdjustCard) through
 * the shared store/wayFromRide.ts bodies; the WP-G duplicate-specs belt
 * check is repeated here as RecordScreen repeats it.
 *
 * virgin-cycle23 brief 03: redesigned as one flat scroll — map first in its frame, text on the page background, SECTORS/ON THIS WAY/suggestions as plain rows, quick actions in the ⋯ menu (activityMenu.tsx), sector tap highlights the stretch on the map.
 *
 * virgin-cycle14 brief 02 (testuser LBH #2): REPLAY — `ReplayScreen.tsx` mounted in
 * place of this scroll view while `replaying`.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RideDetailRequest } from './tabNav.tsx';
import { useTabNav } from './tabNav.tsx';
import { useTheme } from './themeContext.tsx';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import WayMapView from './wayMapView.tsx';
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';
import { FREE_RIDE_ROW_NAME, dateTimeLabel, buildPbDetail } from './rideHistoryModel.ts';
import {
  ownLapBarredFromRanking, priorLapValues, priorPoolFor, priorSectorValues, type UiTier,
} from './colourModel.ts';
import { rideDetailFor, sectorHighlightColours, sectorTimeCell } from './rideDetailModel.ts';
import ReplayScreen from './ReplayScreen.tsx';
import { loadReplayRider } from './replayModel.ts';
import { ALL_YELLOW } from './sectorTrailModel.ts';
import { tierTextColour } from './tierColour.ts';
import { currentCatalog, userCatalog } from '../store/catalogStore.ts';
import { effectiveRideSportId, scopeCatalog } from '../store/sports.ts';
import { activeCatalog, currentSports } from '../store/sportStore.ts';
import { routeTitle, wayLabelIn } from '../store/defaultWay.ts';
import { pickedLoop } from './recordFlow.ts';
import {
  clearUnmatched, getStoredResult, removeStoredResult, storedResultsForWay,
} from '../store/resultsStore.ts';
import { freeRideNear, freeRideResults, markRideFree, unmarkRideFree } from '../store/freeRides.ts';
import {
  clearLastRide, dropRecorded, getLastRide, replaceRecorded,
} from './lastRide.ts';
import {
  createRouteFromDraft, draftRouteFromRide, existingLandmarkLabel, existingRouteProps,
  promoteRideToReference, readRideFixes, saveAdjustedGates, type GateAdjustDraft,
} from '../store/routeFromRide.ts';
import {
  applyEndpointChoices, findWayWithSpecs, type EndpointChoices, type RouteCreationDraft, type RouteNames,
} from '../store/routeCreation.ts';
import { landmarkUsageCounts } from '../store/landmarkUsage.ts';
import { placeOptions } from '../store/placeSearch.ts';
import { specVocabulary } from '../store/waySpecs.ts';
import { RouteNamingCard } from './routeNamingCard.tsx';
import { GateAdjustCard } from './gateAdjustCard.tsx';
import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';
import { decodeEventsFile } from '../storage/eventsJsonl.ts';
import { listRides } from '../storage';
import type { PickEvent, RideMeta } from '../storage/types';
import { confirmDeleteRide, exportRideGpx, toggleIgnoreRide } from './rideActions.ts';
import { durationLabel, sectorGapLabel } from './feedModel.ts';
import { ActivityMenu, MenuButton, type MenuAnchor, type MenuItem } from './activityMenu.tsx';

/** ResultScreen.tsx's PbDetail, lifted in verbatim — the ride-detail's own
 * "ON THIS ROUTE" section, scoped to this ride's route (§3.4).
 * virgin-cycle20 08: ranking only — the sector-bests block is gone
 * (Nathan: rolling comparison, no records).
 * virgin-cycle29 03: the pool is the ride's FROZEN window + itself (priorPoolFor), so this list and the P-rank above never disagree.
 * virgin-cycle22 03: the today row is coloured with THIS ride's lap tier (date + time cells), not accentText. virgin-cycle27 02 FINAL: no-verdict times (durationLabel) go through tierTextColour('neutral') = brand yellow too. */
function PbDetail(props: { wayId: string; lastRideId: string | null; startedAtMs: number; todayTier: UiTier; t: PaddockTheme }) {
  const { wayId, lastRideId, startedAtMs, todayTier, t } = props;
  const detail = buildPbDetail(priorPoolFor(wayId, lastRideId ?? '', startedAtMs), lastRideId);
  const todayColour = tierTextColour(todayTier, t);
  return (
    <View style={st.pbDetail}>
      {detail.ranking.length > 0 ? (
        <>
          {detail.ranking.map((row) => (
            <View key={row.posLabel} style={[st.pbRow, { borderTopColor: t.cardBorder }, row.today && { backgroundColor: t.card }]}>
              <Text style={[st.pbPos, { color: t.text }]}>{row.posLabel}</Text>
              <Text style={{ flex: 1, color: row.today ? todayColour : t.textDim, fontSize: 13 }}>
                {row.dateLabel}
              </Text>
              <Text style={[st.pbNum, { color: row.today ? todayColour : t.text }]}>{row.timeLabel}</Text>
              <Text style={[st.pbNum, { color: t.textDim }]}>{row.gapLabel}</Text>
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
  const [replaying, setReplaying] = useState(false); // virgin-cycle14 brief 02
  const [canReplay, setCanReplay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [meta, setMeta] = useState<RideMeta | null>(null);
  // §3.3 offer: 'pending' until the draft resolves; null = no offer.
  const [draft, setDraft] = useState<RouteCreationDraft | null | 'pending'>('pending');
  const [naming, setNaming] = useState(false);
  const [adjust, setAdjust] = useState<GateAdjustDraft | null>(null);
  // virgin-cycle13 (Nathan 2026-09-24): "<from> → <to>" fallback for the
  // "no way" card below — the ride's own START-time pick, read once from its
  // GPX+ events sidecar. Only ever used when the ride is neither a matched
  // route nor a way's own reference (model.referenceOf, below), so it's
  // fetched lazily off that same condition rather than for every ride.
  const [pickLabel, setPickLabel] = useState<string | null>(null);

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

  const model = useMemo(
    () => rideDetailFor(request.rideId, request.startedAtMs, {
      result: getStoredResult(request.rideId),
      free: freeRideNear(freeRideResults(), request.startedAtMs),
      ways: currentCatalog().ways,
      userWays: userCatalog().ways,
      laps: (wayId) => priorLapValues(wayId, request.rideId, request.startedAtMs),
      sectors: (wayId, i) => priorSectorValues(wayId, i, request.rideId, request.startedAtMs),
      barred: (wayId) => ownLapBarredFromRanking(wayId, request.rideId),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request.rideId, request.startedAtMs, tick],
  );

  // The true ridden trace: the raw fixes, decimated through WP-J's own
  // min-distance rule rather than pushing every raw fix into the map.
  // virgin-cycle22 01: only for a ride with NO reference (the three cards
  // below the route card) — the route card draws the reference alone, so
  // the file is not read for it. Re-runs when the kind changes (naming card
  // makes a route; "Not a free activity" makes a plain ride again).
  useEffect(() => {
    if (model.kind === 'route') {
      setFixes(null);
      return;
    }
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
  }, [request.rideId, model.kind]);

  const replayWayId = model.wayId ?? model.referenceOf?.id ?? null; // a matched ride, or a way's own reference ride
  // virgin-cycle20 08 (Q1): the Replay button only when a replay exists —
  // the same loader ReplayScreen uses, so the two can never disagree. An
  // activity that never crossed START on its way simply has no button.
  useEffect(() => {
    let cancelled = false;
    setCanReplay(false);
    if (replayWayId === null) return;
    loadReplayRider(request.rideId, replayWayId, createExpoFsAdapter())
      .then((r) => { if (!cancelled) setCanReplay(r !== null); })
      .catch(() => { /* no button is the honest fallback */ });
    return () => { cancelled = true; };
  }, [request.rideId, replayWayId]);

  // virgin-cycle13: only fetched for the card that actually needs it (kind
  // !== 'route' and not a way's own reference — see the render below and
  // rideHistoryModel.ts's buildRideRows doc comment for the same fallback
  // chain on the RIDES list). Best-effort, mirrors the fixes effect above.
  useEffect(() => {
    if (model.kind === 'route' || model.referenceOf !== null) {
      setPickLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fs = createExpoFsAdapter();
        const text = await fs.readText(`rides/${request.rideId}.events.jsonl`);
        if (text === null) {
          if (!cancelled) setPickLabel(null);
          return;
        }
        const { events } = decodeEventsFile(text);
        const pick = events.find((e): e is PickEvent => e.kind === 'pick');
        if (!cancelled) {
          setPickLabel(pick && pick.fromLabel && pick.toLabel ? routeTitle(pick.fromLabel, pick.toLabel, pickedLoop(pick.from, pick.to)) : null);
        }
      } catch {
        if (!cancelled) setPickLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request.rideId, model.kind, model.referenceOf]);

  // §3.3: the retroactive naming offer, drafted against the CURRENT catalog
  // with this ride's own matched route as the WP-F endpoint hint. Re-drafted
  // when the model's route changes; cleared explicitly after a create.
  useEffect(() => {
    let cancelled = false;
    setDraft('pending');
    (async () => {
      // WP-1 (C4): the RIDE's own sport (its start-time stamp, via meta —
      // read once on mount above, same source RidesScreen uses), resolved
      // through the §3.4 fallback — never whatever the global active sport
      // happens to be right now.
      const sportId = effectiveRideSportId(meta?.sportId, currentSports());
      const d = await draftRouteFromRide(
        request.rideId, request.startedAtMs, model.wayId, createExpoFsAdapter(), sportId,
      );
      if (!cancelled) setDraft(d);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.rideId, request.startedAtMs, model.wayId, meta]);

  const offer = draft !== 'pending' && draft !== null && model.referenceOf === null ? draft : null;
  const offerRoute = offer?.existingRouteId ? existingRouteProps(offer.existingRouteId) : null;
  const offerLabel = offer?.existingRouteId
    ? `Save as a new way on ${offerRoute?.label ?? 'this route'}`
    : 'Make this the reference of a new route';

  async function onNamingSave(names: RouteNames, choices: EndpointChoices) {
    if (offer === null) return;
    // brief 05; 06b (Inspect finding 3): resolved in the RIDE's sport, as the draft was
    const rideCatalog = scopeCatalog(currentCatalog(), offer.sportId, currentSports());
    const draft = applyEndpointChoices(rideCatalog, offer, choices);
    // WP-G: belt to the card's own braces (RecordScreen's onNamingSave, verbatim).
    if (draft.existingRouteId && findWayWithSpecs(rideCatalog, draft.existingRouteId, names.specs ?? [])) {
      Alert.alert('That way already exists', 'Pick it on RECORD next time instead of adding it again.');
      return;
    }
    setBusy(true);
    try {
      const out = await createRouteFromDraft(draft, names, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not create the route', out.errors.join('\n'));
        return;
      }
      // virgin-cycle18 brief 04 (decision 6): a free ride that just became a
      // route's reference is not free any more — route wins, one home.
      if (model.free !== null) unmarkRideFree(model.free.rideId);
      const founding = getStoredResult(request.rideId);
      if (founding) replaceRecorded(founding); // §5 stored it; the RECORD window sees it now
      else dropRecorded(request.rideId); // brief 06: a stale result on another way was dropped — leave the window too
      setNaming(false);
      setDraft(null);
      setTick((v) => v + 1); // model re-reads: kind 'route', referenceOf = the new route
      if (out.adjust) setAdjust(out.adjust);
    } catch (e) {
      Alert.alert('Could not create the route', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // virgin-cycle16 02 (Nathan 2026-09-28): a free ride is a post-ride label.
  // meta (listRides, read on mount) gives the wall-clock duration; null if it
  // has not arrived yet — the record is identity, the raw JSONL is the ride.
  function onSaveFree() {
    // virgin-cycle18 06b (one home): reached from the naming card on a ride
    // the engine scored (WP-F / an endpoint changed) — drop that result, store
    // and window, before filing the free record. From the plain "Save as free
    // ride" button (kind 'none') there is no result and this is a no-op.
    if (getStoredResult(request.rideId) !== null) {
      void removeStoredResult(request.rideId);
      dropRecorded(request.rideId);
    }
    markRideFree(
      request.rideId,
      request.startedAtMs,
      meta ? Math.max(0, (meta.endMs - meta.startMs) / 1000) : null,
      effectiveRideSportId(meta?.sportId, currentSports()),
    );
    setNaming(false);
    setTick((v) => v + 1); // model re-reads: free = the new record → kind 'free'
  }
  function onUnsaveFree() {
    if (model.free === null) return;
    unmarkRideFree(model.free.rideId);
    // virgin-cycle18 brief 04 (decision 7): also drop the ride's permanent
    // unmatched marker so the next settleRideHomes/boot backfill re-matches
    // it against today's ways. Matches nothing → filed free again by that pass.
    void clearUnmatched(request.rideId);
    setTick((v) => v + 1); // model re-reads: free = null → kind 'none', offer + "Save as free ride" back
  }

  async function onAdjustSave(chainageM: number[]) {
    if (adjust === null) return;
    setBusy(true);
    try {
      const out = await saveAdjustedGates(adjust, chainageM, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not save the gates', out.errors.join('\n'));
        return;
      }
      setAdjust(null);
      const refRide = getStoredResult(request.rideId); // virgin-cycle18 brief 04: the v2 re-time
      if (refRide) replaceRecorded(refRide);
      else dropRecorded(request.rideId); // its v1 result was removed — no stale in-session copy (Inspect follow-up 2026-09-30)
      setTick((v) => v + 1); // sectors/lap re-read at the minted gates
    } catch (e) {
      Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleIgnore() {
    if (busy) return;
    setBusy(true);
    try {
      if (await toggleIgnoreRide(request.rideId, !model.ignored)) setTick((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!meta) return;
    await exportRideGpx(meta);
  }

  function onDelete() {
    if (!meta) return;
    // RidesScreen remounts on close and refreshes itself; from 'post-stop' the
    // rider lands back on RECORD setup; from 'routes' the way detail underneath
    // is revealed (comment kept from WP-H).
    confirmDeleteRide(meta, model.free?.rideId ?? null, () => tabNav.closeRide());
  }

  async function onPromote() {
    const wayId = model.wayId;
    if (wayId === null || model.promoteTarget === null) return;
    setBusy(true);
    try {
      const out = await promoteRideToReference(wayId, request.rideId, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not set the reference', out.errors.join('\n'));
        return;
      }
      // lastRide coherence — RoutesScreen.tsx's delete-route steps, plus
      // replaceRecorded for whatever the immediate re-derive came back with.
      for (const id of out.clearedRideIds) dropRecorded(id);
      if (getLastRide()?.wayId === wayId) clearLastRide();
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
    const wayId = model.wayId;
    if (wayId === null) return;
    const n = storedResultsForWay(wayId).filter((r) => r.rideId !== request.rideId).length;
    const ghosts = n === 0
      ? 'There are no past results on this way yet.'
      : `Its ${n} past result${n === 1 ? ' is' : 's are'} discarded and re-timed from the recordings against the new reference — old times and ranks do not survive.`;
    Alert.alert(
      `Overwrite the reference of "${wayLabelIn(currentCatalog(), wayId)}"?`,
      `This way will be overwritten and past ghosts will be lost.\n\nIts reference line and gates are rebuilt from this activity (${dateTimeLabel(request.startedAtMs)}). ${ghosts} Activity recordings are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Overwrite', style: 'destructive', onPress: () => void onPromote() },
      ],
    );
  }

  useEffect(() => { setSelectedSector(null); }, [request.rideId, tick]);

  const menuItems: MenuItem[] = [];
  if (meta) menuItems.push({ label: 'Export GPX+', onPress: () => void onExport() });
  if (model.canToggleIgnore) {
    menuItems.push(model.ignored
      ? { label: 'Count in ranking', onPress: () => void onToggleIgnore() }
      : { label: 'Ignore in ranking', onPress: () => void onToggleIgnore() });
  }
  if (meta) menuItems.push({ label: 'Delete', onPress: onDelete });

  const primaryLabel = request.source === 'post-stop' ? 'RECORD ANOTHER' : request.source === 'routes' ? 'BACK TO ROUTE' : 'BACK TO ACTIVITIES';

  if (replaying && replayWayId !== null) {
    return (
      <ReplayScreen rideId={request.rideId} wayId={replayWayId} startedAtMs={request.startedAtMs}
        detail={model} onClose={() => setReplaying(false)} />
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.topBar}>
        <Pressable style={styles.roundBtn} onPress={() => tabNav.closeRide()} hitSlop={6}>
          <Text style={[styles.roundGlyph, { color: t.text }]}>‹</Text>
        </Pressable>
        <MenuButton style={styles.roundBtn} onOpen={setMenuAnchor} />
      </View>

      {model.kind === 'route' ? (
        <>
          <View style={styles.mapWrap}>
            <WayMapView
              bleed
              variant="browse"
              wayId={model.wayId}
              lat={null}
              lon={null}
              zoom={1}
              height={320}
              showRider={false}
              // WP-K: gated by the settings toggle, same two-line pattern as
              // RecordScreen and the RIDES row — ALL_YELLOW (truthy, all-null)
              // when off, no leadColour when off (pixel-identical to a map
              // with no sectorColours prop at all — sectorTrailModel.ts).
              // virgin-cycle22 01 (Nathan 2026-10-05): no `trail` here — the
              // reference line IS this ride's line (sectors, gates, what ROUTES
              // shows); the raw ridden trail doubled it at every bend. The
              // trail is drawn only by the branches below, which have no reference.
              // virgin-cycle23 brief 03: while a SECTORS row is selected the map shows only that
              // stretch, in riderBlue (selection, not a verdict — the gate-adjust ring's rule).
              sectorColours={selectedSector !== null
                ? sectorHighlightColours(model.sectorRows, selectedSector, colors.riderBlue)
                : (s.sectorColours ? model.sectorColours : ALL_YELLOW)}
              leadColour={selectedSector === null && s.sectorColours ? colors.grey : undefined}
            />
          </View>
          <View style={styles.pad}>
            <Text style={[styles.name, { color: t.text }]}>{wayLabelIn(currentCatalog(), model.wayId as string)}</Text>
            <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
            {model.unranked
              ? <Text style={[st.big, { color: tierTextColour('neutral', t) }]}>{durationLabel(meta)}</Text>
              : <Text style={[st.big, { color: tierTextColour(model.lapTier, t) }]}>{model.lapLabel}</Text>}
            <Text style={[styles.rankLine, { color: t.text2 }]}>{model.rankLine}</Text>
            {model.referenceOf ? (
              <Text style={[styles.rankLine, { color: t.textDim }]}>
                reference activity of {wayLabelIn(currentCatalog(), model.referenceOf.id)}
              </Text>
            ) : null}
          </View>
        </>
      ) : model.referenceOf !== null ? (
        <>
          {/* virgin-cycle13 (Nathan 2026-09-24): this ride founded a way
              (Way.referenceRideId) but its OWN result never matched anything —
              matching only runs against ways that existed at backfill time, and
              a permanent unmatched marker (resultsStore.ts) means it's never
              retried once the way is minted from this very ride. Read straight
              off the catalog, same as the kind==='route' reference line above —
              no fabricated lap/rank/sectors, this ride genuinely has none on
              file. */}
          <View style={styles.mapWrap}>
            <WayMapView bleed variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
          </View>
          <View style={styles.pad}>
            <Text style={[styles.name, { color: t.text }]}>{wayLabelIn(currentCatalog(), model.referenceOf.id)}</Text>
            <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
            <Text style={[st.big, { color: tierTextColour('neutral', t) }]}>{durationLabel(meta)}</Text>
            <Text style={[styles.rankLine, { color: t.textDim }]}>ref</Text>
          </View>
        </>
      ) : model.kind === 'free' && model.free ? (
        <>
          <View style={styles.mapWrap}>
            <WayMapView bleed variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
          </View>
          <View style={styles.pad}>
            <Text style={[styles.name, { color: t.text }]}>{FREE_RIDE_ROW_NAME}</Text>
            <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
            <Text style={[st.big, { color: tierTextColour('neutral', t) }]}>{durationLabel(meta)}</Text>
            <Text style={[styles.rankLine, { color: t.textDim }]}>{pickLabel ?? 'saved as a free activity'}</Text>
          </View>
        </>
      ) : (
        <>
          {/* virgin-cycle13: pickLabel (this ride's own START-time from/to,
              fetched above) covers both a free ride ("new → new") and a
              route-mode ride that genuinely matched nothing; falls back to the
              old plain text only for a pre-GPX+ ride with no sidecar pick at all. */}
          <View style={styles.mapWrap}>
            <WayMapView bleed variant="browse" wayId={null} lat={null} lon={null} zoom={1} height={320} showRider={false} trail={fixes ?? undefined} />
          </View>
          <View style={styles.pad}>
            {pickLabel !== null ? <Text style={[styles.name, { color: t.text }]}>{pickLabel}</Text> : null}
            <Text style={[styles.date, { color: t.textDim }]}>{dateTimeLabel(request.startedAtMs)}</Text>
            <Text style={[st.big, { color: tierTextColour('neutral', t) }]}>{durationLabel(meta)}</Text>
          </View>
        </>
      )}

      {replayWayId !== null && canReplay ? (
        <View style={styles.pad}>
          <Pressable style={[styles.replayBtn, { backgroundColor: t.accent }]} onPress={() => setReplaying(true)}>
            <Text style={[styles.replayText, { color: t.onAccent }]}>Replay</Text>
          </Pressable>
        </View>
      ) : null}

      {model.kind === 'route' ? (
        <>
          <Text style={[st.h2, styles.h2, { color: t.textDim }]}>SECTORS</Text>
          {model.sectorRows.map((sec) => (
            // virgin-cycle22 03: label plain, only the TIME carries the tier colour; avg stays dim.
            // tierTextColour, never the chip palette's .text. virgin-cycle23: a row is a Pressable;
            // tapping it selects the sector on the map (tap again clears); gap = this time vs the sector average.
            <Pressable key={sec.index}
              style={[styles.secRow, { borderTopColor: t.cardBorder }, selectedSector === sec.index && { backgroundColor: t.card }]}
              onPress={() => setSelectedSector((cur) => (cur === sec.index ? null : sec.index))}>
              <Text style={[styles.secPos, { color: t.text }]}>{sec.label}</Text>
              <Text style={[styles.secTime, { color: tierTextColour(sec.tier, t) }]}>{sectorTimeCell(sec)}</Text>
              <Text style={[styles.secAvg, { color: t.textDim }]}>{sec.avgLabel}</Text>
              <Text style={[styles.secGap, { color: t.textDim }]}>{sectorGapLabel(sec.gapS)}</Text>
            </Pressable>
          ))}
          <Text style={[st.h2, styles.h2, { color: t.textDim }]}>ON THIS WAY</Text>
          <PbDetail wayId={model.wayId as string} lastRideId={request.rideId} startedAtMs={request.startedAtMs} todayTier={model.lapTier} t={t} />
        </>
      ) : null}

      {model.promoteTarget !== null ? (
        <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={confirmPromote}>
          <Text style={[styles.sugText, { color: t.text }]}>Make this the reference of this way</Text>
          <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
        </Pressable>
      ) : null}
      {offer !== null && !naming && adjust === null ? (
        <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={() => setNaming(true)}>
          <Text style={[styles.sugText, { color: t.text }]}>{offerLabel}</Text>
          <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
        </Pressable>
      ) : null}
      {model.kind === 'none' && model.referenceOf === null && !naming && adjust === null ? (
        <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={onSaveFree}>
          <Text style={[styles.sugText, { color: t.text }]}>Save as free activity</Text>
          <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
        </Pressable>
      ) : null}
      {model.kind === 'free' ? (
        <Pressable style={[styles.sugRow, { borderTopColor: t.cardBorder }, busy && styles.busy]} disabled={busy} onPress={onUnsaveFree}>
          <Text style={[styles.sugText, { color: t.text }]}>Not a free activity</Text>
          <Text style={[styles.sugChev, { color: t.textDim }]}>›</Text>
        </Pressable>
      ) : null}

      {naming && offer !== null ? (
        <View style={styles.pad}>
          <RouteNamingCard
            startExistingLabel={existingLandmarkLabel(offer.start)}
            endExistingLabel={existingLandmarkLabel(offer.end)}
            loop={offer.loop}
            busy={busy}
            matchedWayLabel={offer.matchedWayId ? wayLabelIn(currentCatalog(), offer.matchedWayId) : null}
            existingRoute={offerRoute}
            vocabulary={specVocabulary(activeCatalog().ways)}
            places={placeOptions(activeCatalog(), landmarkUsageCounts(activeCatalog()))}
            startProposedId={offer.start.kind === 'existing' ? offer.start.landmarkId : null}
            endProposedId={offer.end.kind === 'existing' ? offer.end.landmarkId : null}
            routeForPair={(ch) => {
              const d = applyEndpointChoices(scopeCatalog(currentCatalog(), offer.sportId, currentSports()), offer, ch);
              return d.existingRouteId ? existingRouteProps(d.existingRouteId) : null;
            }}
            onSave={(names, choices) => void onNamingSave(names, choices)}
            onSkip={() => setNaming(false)}
            onSaveFree={onSaveFree}
          />
        </View>
      ) : null}
      {adjust !== null ? (
        <View style={styles.pad}>
          <GateAdjustCard
            mapInset={16}
            wayId={adjust.wayId}
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
      <ActivityMenu anchor={menuAnchor} items={menuItems} onClose={() => setMenuAnchor(null)} />
    </ScrollView>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.cardBorder, backgroundColor: t.race.card, alignItems: 'center', justifyContent: 'center' },
  roundGlyph: { fontSize: 26, lineHeight: 28, fontWeight: '700' },
  mapWrap: { marginHorizontal: 0 }, // virgin-cycle27 06 (Nathan 2026-10-08): the map runs edge to edge like the ACTIVITIES cards — bleed frame, parent inset cancelled on the map only.
  pad: { paddingHorizontal: 16 },
  name: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  date: { fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  rankLine: { fontSize: 13, marginTop: 2 },
  replayBtn: { marginTop: 16, paddingVertical: 14, borderRadius: radius.btn, alignItems: 'center' },
  replayText: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  h2: { paddingHorizontal: 16, marginTop: 28, marginBottom: 8 },
  secRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
  secPos: { width: 44, fontSize: 15, fontWeight: '700' },
  secTime: { width: 72, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  secAvg: { flex: 1, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  secGap: { minWidth: 48, fontSize: 15, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  sugRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1 },
  sugText: { fontSize: 15, fontWeight: '700', flex: 1 },
  sugChev: { fontSize: 18, marginLeft: 8 },
  busy: { opacity: 0.5 },
});

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 10 },
  slimBtn: { alignSelf: 'center', marginTop: 24, marginBottom: 4, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.btn },
  slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
  pbDetail: { paddingBottom: 4 },
  pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
  pbPos: { width: 44, fontSize: 15, fontWeight: '700' },
  pbNum: { fontVariant: ['tabular-nums'], textAlign: 'right', width: 72, fontSize: 15 },
});
