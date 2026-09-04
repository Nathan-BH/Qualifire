/**
 * RIDES — ride history (cycle 024, WP-A3 redesign of the mockup's
 * ridesScreen(), cycle 022; WP-H 2026-09-04). Was a flat fixes-counter list
 * ("the list is a fix counter, not a ride list" — Ines, beta); every ride is
 * a row — route, date, lap, rank — and a tap now opens the full-screen ride
 * detail (WP-H) instead of expanding in place: sector splits, trace, Export/
 * Delete/Ignore/Set-as-reference all live there now.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { listRides } from '../storage';
import type { RideMeta } from '../storage/types';
import { decodeIndex } from '../storage/rideIndex';
import { backfillMissingResults, getStoredResult } from '../store/resultsStore';
import { currentCatalog } from '../store/catalogStore';
import { routeLabelIn } from '../store/defaultRoute';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { buildRideRows } from './rideHistoryModel';
import { lapValues } from './colourModel';
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

  const refresh = useCallback(async () => {
    try {
      const list = await listRides();
      setRides([...list].sort((a, b) => b.startMs - a.startMs));
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
      try {
        const fs = createExpoFsAdapter();
        const text = await fs.readText('index.json');
        const rideIndex = text !== null ? decodeIndex(text) : null;
        if (rideIndex !== null) {
          // WP-B fix B2: exclude free rides from the same backfill — a free
          // ride must never get silently re-derived as a route PB (D-025).
          // Mirrors lastRide.ts's initRideHistory identical filter.
          const endedIds = rideIndex.rides
            .filter((r) => r.status === 'ended' && r.mode !== 'free')
            .map((r) => r.rideId);
          await backfillMissingResults(fs, endedIds);
        }
      } catch { /* best-effort — the row still renders off whatever is already stored */ }
      if (!cancelled) {
        setBackfilling(false);
        setResultsTick((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rides]);

  const rows = useMemo(
    // WP-G: labelFor is routeLabelIn so a user-minted route shows its way + specs, not the raw route:<rideId> id.
    () => buildRideRows(rides ?? [], getStoredResult, (routeId, excl) => lapValues(routeId, excl),
      (id) => routeLabelIn(currentCatalog(), id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rides, resultsTick],
  );
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rides</Text>
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      {backfilling ? <Text style={styles.sub}>matching routes…</Text> : null}
      {rides == null ? (
        <Text style={styles.sub}>Loading…</Text>
      ) : rides.length === 0 ? (
        <Text style={styles.sub}>No rides yet. Record one on the Record tab.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.rideId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowHead}
                onPress={() => tabNav.openRide({ rideId: item.rideId, source: 'rides', startedAtMs: item.startMs })}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.routeName ?? 'no route — recorded only'}</Text>
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
});
