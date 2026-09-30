/**
 * RIDES — ride history (cycle 024, WP-A3 redesign of the mockup's
 * ridesScreen(), cycle 022; WP-H 2026-09-04). Was a flat fixes-counter list
 * ("the list is a fix counter, not a ride list" — Ines, beta); every ride is
 * a row — route, date, lap, rank — and a tap now opens the full-screen ride
 * detail (WP-H) instead of expanding in place: sector splits, trace, Export/
 * Delete/Ignore/Set-as-reference all live there now.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SectionList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listRides } from '../storage';
import type { PickEvent, RideMeta } from '../storage/types';
import { getStoredResult } from '../store/resultsStore';
import { freeRideNear, freeRideResults } from '../store/freeRides';
import { currentCatalog } from '../store/catalogStore';
import { effectiveRideSportId } from '../store/sports';
import { activeSportId, currentSports } from '../store/sportStore';
import { wayLabelIn } from '../store/defaultWay';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { decodeEventsFile } from '../storage/eventsJsonl';
import { FREE_RIDE_ROW_NAME, buildRideRows, type RideRowModel } from './rideHistoryModel';
import { lapValues } from './colourModel';
import { settleRideHomes } from './rideHomes';
import { useTabNav } from './tabNav';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

export default function RidesScreen() {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [rides, setRides] = useState<RideMeta[] | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  // Bumped after a backfill pass so buildRideRows re-reads resultsStore's
  // module-level map — React has no way to know that map changed on its own.
  const [resultsTick, setResultsTick] = useState(0);
  // virgin-cycle13 (Nathan 2026-09-24): "<from> → <to>" for a ride whose own
  // stored result is null/unmatched, read once per rideId from its GPX+
  // events sidecar (N9's PickEvent) — see the effect below and
  // rideHistoryModel.ts's buildRideRows doc comment for the full "no way"
  // fallback chain (reference ride first, this second).
  const [pickLabels, setPickLabels] = useState<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const list = await listRides();
      // WP-1: RIDES shows only the active sport's own rides (both sides are
      // null under zero sports, so every ride passes — §3.4). Backfill above
      // still runs unfiltered across every sport (per-ride-sport, not
      // per-active-sport) so switching sport never starves another sport's
      // backfill.
      const f = currentSports();
      const active = activeSportId();
      const scoped = list.filter((r) => effectiveRideSportId(r.sportId, f) === active);
      setRides([...scoped].sort((a, b) => b.startMs - a.startMs));
    } catch (e) {
      Alert.alert('Could not load rides', e instanceof Error ? e.message : String(e));
      setRides([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cycle 024 (WP-A3): older on-device rides may predate the results store —
  // derive their route/lap/sectors the first time this screen is visited (and
  // after every manual refresh; backfillMissingResults is idempotent, it
  // skips anything already stored, so re-running it costs nothing). D-023:
  // read-only over the raw JSONL — this only ever derives, never rewrites it.
  //
  // Fix 2026-08-24 (WP-A3 review): only rides whose index status is 'ended'
  // are offered up. `rides` (listRides()) deliberately also includes a ride
  // still recording or crashed mid-ride, honestly derived from its truncated
  // file — backfilling THAT file can fail to match any route, and a failed
  // match writes a PERMANENT unmatched marker at the current
  // BACKFILL_ENGINE_VERSION (resultsStore.ts), poisoning that ride's result
  // even after it is later healed/ended. Reads index.json the same way
  // lastRide.ts's initRideHistory does (the only other backfillMissingResults
  // caller) so both apply the identical "ended only" rule; skips the pass
  // entirely if the index is missing/corrupt rather than guessing at status.
  useEffect(() => {
    if (rides === null || rides.length === 0) return;
    let cancelled = false;
    (async () => {
      setBackfilling(true);
      // virgin-cycle18 brief 04: the inline backfill moved to ui/rideHomes.ts
      // (same pass, minus free rides) and is followed there by the orphan
      // filing — a ride this list shows is, after this, always in RESULTS too.
      await settleRideHomes(createExpoFsAdapter());
      if (!cancelled) {
        setBackfilling(false);
        setResultsTick((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rides]);

  // virgin-cycle13: fills pickLabels for whatever's left "no way" after the
  // backfill pass above AND the reference-ride override (computed inline
  // below, from the catalog — no I/O) — best-effort, one small sidecar read
  // per still-unnamed ride, same non-throwing discipline as the backfill
  // effect. Runs after resultsTick so a ride that DID get backfilled this
  // pass is correctly skipped rather than fetched for nothing.
  useEffect(() => {
    if (rides === null || rides.length === 0) return;
    let cancelled = false;
    (async () => {
      const need = rides.filter((m) => {
        if (pickLabels.has(m.rideId)) return false;
        const res = getStoredResult(m.rideId);
        if (res !== null && res.wayId !== null) return false; // already named
        if (currentCatalog().ways.some((w) => w.referenceRideId === m.rideId)) return false; // reference wins, no fetch needed
        return true;
      });
      if (need.length === 0) return;
      const fs = createExpoFsAdapter();
      const updates = new Map(pickLabels);
      for (const m of need) {
        try {
          const text = await fs.readText(`rides/${m.rideId}.events.jsonl`);
          if (text !== null) {
            const { events } = decodeEventsFile(text);
            const pick = events.find((e): e is PickEvent => e.kind === 'pick');
            if (pick && pick.fromLabel && pick.toLabel) {
              updates.set(m.rideId, `${pick.fromLabel} → ${pick.toLabel}`);
            }
          }
        } catch { /* best-effort — the row just falls back to "no way" */ }
      }
      if (!cancelled) setPickLabels(updates);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rides, resultsTick]);

  const rows = useMemo(
    // WP-G: labelFor is routeLabelIn so a user-minted route shows its way + specs, not the raw route:<rideId> id.
    // virgin-cycle13: referenceWayFor/pickLabelFor are the "no way" fallback
    // chain (buildRideRows doc comment) — reference ride first, then this
    // effect's sidecar-derived pick label, then plain null (unchanged).
    // virgin-cycle15 brief 13 §1: freeFor sits between the two — a free ride
    // was always in this list (it is a raw ride like any other); this labels
    // it "Free ride" + gate count instead of the generic "new → new · no
    // lap". Same freeRideNear tolerance match RideDetailScreen uses, so the
    // row's label and the detail's free view can never disagree.
    () => buildRideRows(rides ?? [], getStoredResult, (wayId, excl) => lapValues(wayId, excl),
      (id) => wayLabelIn(currentCatalog(), id),
      (rideId) => currentCatalog().ways.find((w) => w.referenceRideId === rideId) ?? null,
      (rideId) => pickLabels.get(rideId) ?? null,
      (startMs) => freeRideNear(freeRideResults(), startMs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rides, resultsTick, pickLabels],
  );
  // virgin-cycle16 03 (Nathan 2026-09-28): free rides sit in their own
  // FREE RIDES section under the list, not inline. A row is free iff
  // buildRideRows named it FREE_RIDE_ROW_NAME (decision 2). Empty sections
  // are not rendered, so a rider with no free rides sees the list as before.
  const sections = useMemo(() => {
    const main = rows.filter((r) => r.wayName !== FREE_RIDE_ROW_NAME);
    const free = rows.filter((r) => r.wayName === FREE_RIDE_ROW_NAME);
    const out: { title: string | null; data: RideRowModel[] }[] = [];
    if (main.length > 0) out.push({ title: null, data: main });
    if (free.length > 0) out.push({ title: 'FREE RIDES', data: free });
    return out;
  }, [rows]);
  const sportLabel = currentSports().sports.find((sp) => sp.id === activeSportId())?.label ?? null;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rides</Text>
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      {/* Q5: bare sport-name badge, same convention as ROUTES. */}
      <Text style={styles.sub}>
        {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET — ADD ONE IN SETTINGS'}
      </Text>
      {backfilling ? <Text style={styles.sub}>matching ways…</Text> : null}
      {rides == null ? (
        <Text style={styles.sub}>Loading…</Text>
      ) : rides.length === 0 ? (
        <Text style={styles.sub}>No rides yet. Record one on the Record tab.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.rideId}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            section.title !== null ? <Text style={styles.sectionHead}>{section.title}</Text> : null
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowHead}
                onPress={() => tabNav.openRide({ rideId: item.rideId, source: 'rides', startedAtMs: item.startMs })}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.wayName ?? 'no way — recorded only'}</Text>
                  <Text style={styles.sub}>
                    {item.dateLabel} · {item.lapLabel}
                    {item.quality ? ` · ${item.quality}` : ''}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rank}>
                    {item.rank ? `P${item.rank.pos}/${item.rank.of}` : '–'}
                  </Text>
                  <Text style={styles.chev}>›</Text>
                </View>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // AD pass: titles are big, heavy, high-contrast ink.
  title: {
    color: t.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
  },
  refreshText: { color: t.text2, fontSize: 13 },
  sub: { color: t.text2, fontSize: 14, fontVariant: ['tabular-nums'] },
  // Mockup .trackpick card: #141414, 1px #232323, radius 16.
  row: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowInfo: { gap: 2, flex: 1 },
  rowTitle: {
    color: t.text,
    fontSize: 17,
    fontWeight: '800',
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // D-013: rank is a fact, never coloured — dim ink only.
  rank: { color: t.textDim, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chev: { color: t.textDim, fontSize: 16 },
  // virgin-cycle16 03: the FREE RIDES section header — same small-caps
  // register as the ride detail's ACTIONS / ON THIS WAY headings.
  sectionHead: { color: t.textDim, fontSize: 12, letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
});
