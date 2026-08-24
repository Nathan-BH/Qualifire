/**
 * RIDES — ride history (cycle 024, WP-A3 redesign of the mockup's
 * ridesScreen(), cycle 022). Was a flat fixes-counter list ("the list is a
 * fix counter, not a ride list" — Ines, beta); now every ride is a row —
 * route, date, lap, rank — that expands into its own sector splits, with
 * export/delete demoted into that expanded detail instead of sitting on the
 * collapsed row.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteRide, exportGpxPlus, listRides } from '../storage';
import type { RideMeta } from '../storage/types';
import { decodeIndex } from '../storage/rideIndex';
import { backfillMissingResults, getStoredResult, removeStoredResult } from '../store/resultsStore';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { dropRecorded } from './lastRide';
import { buildRideRows, buildSectorRows } from './rideHistoryModel';
import { lapValues, sectorValues } from './colourModel';
import { chipColors } from './chips';
import { gpxBaseName, saveGpx } from './saveGpx';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

function fmtWhen(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}m${String(s % 60).padStart(2, '0')}s`;
}

export default function RidesScreen() {
  const { t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [rides, setRides] = useState<RideMeta[] | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    () => buildRideRows(rides ?? [], getStoredResult, (routeId, excl) => lapValues(routeId, excl)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rides, resultsTick],
  );
  const metaById = useMemo(() => new Map((rides ?? []).map((m) => [m.rideId, m])), [rides]);

  const onDelete = useCallback(
    (ride: RideMeta) => {
      Alert.alert(
        'Delete ride?',
        `${fmtWhen(ride.startMs)} · ${fmtDur(ride.endMs - ride.startMs)}\nThis permanently removes the raw trace.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRide(ride.rideId);
                // Cycle 024 (WP-A1): the derived sidecar (and this session's
                // in-memory comparison entry, if any) go with the raw ride —
                // never left orphaned pointing at a deleted trace.
                await removeStoredResult(ride.rideId);
                dropRecorded(ride.rideId);
                setExpandedId((id) => (id === ride.rideId ? null : id));
                await refresh();
              } catch (e) {
                Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
              }
            },
          },
        ],
      );
    },
    [refresh],
  );

  const onExport = useCallback(async (ride: RideMeta) => {
    setExporting(ride.rideId);
    try {
      const gpx = await exportGpxPlus(ride.rideId);
      const base = gpxBaseName(ride.startMs);
      const result = await saveGpx(base, gpx);
      if (result.method === 'saf') {
        Alert.alert('Exported', `${base}.gpx saved to the folder you picked.`);
      } else if (result.method === 'share-text') {
        Alert.alert('Shared', 'GPX sent as text via the share sheet.');
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
    }
  }, []);

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
          renderItem={({ item }) => {
            const expanded = expandedId === item.rideId;
            const meta = metaById.get(item.rideId);
            const result = expanded ? getStoredResult(item.rideId) : null;
            return (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowHead}
                  onPress={() => setExpandedId(expanded ? null : item.rideId)}
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
                    <Text style={styles.chev}>{expanded ? '▾' : '›'}</Text>
                  </View>
                </Pressable>
                {expanded ? (
                  <View style={styles.detail}>
                    {result && result.routeId ? (
                      buildSectorRows(
                        result,
                        (i) => sectorValues(result.routeId as string, i, result.rideId),
                      ).map((sec) => {
                        const col = chipColors(sec.tier, t).text;
                        return (
                          <View key={sec.index} style={styles.secRow}>
                            <Text style={[styles.secPos, { color: col }]}>{sec.label}</Text>
                            <Text style={[styles.secTime, { color: col }]}>{sec.timeLabel}</Text>
                            <Text style={styles.secAvg}>{sec.avgLabel}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.sub}>sector times not on file for this ride</Text>
                    )}
                    <View style={styles.pillRow}>
                      <Pressable
                        style={[styles.exportBtn, exporting === item.rideId && styles.busy]}
                        disabled={exporting != null || !meta}
                        onPress={() => meta && onExport(meta)}
                      >
                        <Text style={styles.exportText}>
                          {exporting === item.rideId ? '…' : 'Export GPX+'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteBtn}
                        disabled={exporting != null || !meta}
                        onPress={() => meta && onDelete(meta)}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          }}
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
  detail: { paddingBottom: 12, borderTopWidth: 1, borderTopColor: t.cardBorder, paddingTop: 10, gap: 6 },
  secRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  secPos: { width: 44, fontSize: 13, fontWeight: '700' },
  secTime: { width: 66, fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'right' },
  secAvg: { flex: 1, color: t.textDim, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  // AD pass: primary action = solid yellow, charcoal text (the gate slash as a button).
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
  deleteText: { color: t.textDim, fontSize: 13, fontWeight: '700' },
});
