/**
 * Phase-1 ride list: every stored ride, with per-ride GPX export.
 * [UNTESTED ON DEVICE]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteRide, exportGpxPlus, listRides } from '../storage';
import { gpxBaseName, saveGpx } from './saveGpx';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

function fmtTotal(ms: number): string {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min}m`;
}

interface RideRow {
  rideId: string;
  startMs: number;
  endMs: number;
  nFixes: number;
}

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
  const [rides, setRides] = useState<RideRow[] | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listRides();
      // Newest first.
      setRides([...list].sort((a, b) => b.startMs - a.startMs));
    } catch (e) {
      Alert.alert('Could not load rides', e instanceof Error ? e.message : String(e));
      setRides([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onDelete = useCallback(
    (ride: RideRow) => {
      Alert.alert(
        'Delete ride?',
        `${fmtWhen(ride.startMs)} · ${fmtDur(ride.endMs - ride.startMs)} · ${ride.nFixes} fixes.\nThis permanently removes the raw trace.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRide(ride.rideId);
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

  const onExport = useCallback(async (ride: RideRow) => {
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
      {rides != null && rides.length > 0 && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{rides.length}</Text>
            <Text style={styles.statLbl}>rides</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {fmtTotal(rides.reduce((a, r) => a + (r.endMs - r.startMs), 0))}
            </Text>
            <Text style={styles.statLbl}>recorded</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {rides.reduce((a, r) => a + r.nFixes, 0).toLocaleString()}
            </Text>
            <Text style={styles.statLbl}>gps fixes</Text>
          </View>
        </View>
      )}
      {rides == null ? (
        <Text style={styles.sub}>Loading…</Text>
      ) : rides.length === 0 ? (
        <Text style={styles.sub}>No rides yet. Record one on the Record tab.</Text>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.rideId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{fmtWhen(item.startMs)}</Text>
                <Text style={styles.sub}>
                  {fmtDur(item.endMs - item.startMs)} · {item.nFixes} fixes
                </Text>
              </View>
              <View style={styles.rowBtns}>
                <Pressable
                  style={[styles.exportBtn, exporting === item.rideId && styles.busy]}
                  disabled={exporting != null}
                  onPress={() => onExport(item)}
                >
                  <Text style={styles.exportText}>
                    {exporting === item.rideId ? '…' : 'Export GPX+'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  disabled={exporting != null}
                  onPress={() => onDelete(item)}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
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
  stats: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: {
    color: t.accentText,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLbl: {
    color: t.text2,
    fontSize: 11,
    letterSpacing: 1.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    borderRadius: radius.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowInfo: { gap: 2 },
  rowTitle: {
    color: t.text,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rowBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    width: 34,
    height: 34,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: t.textDim, fontSize: 15 },
});
