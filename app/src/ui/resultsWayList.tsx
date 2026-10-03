/**
 * virgin-cycle15 brief 13 (Nathan 2026-09-27): the second level of RESULTS —
 * one route's ridden ways. Dumb UI: ResultsScreen owns openRouteId (as a
 * prop, per the Fable ruling 2026-09-28 -- Shell state, not local state) and
 * the hop into ResultsDetailScreen. Rendered only for routes with 2+ ridden
 * ways (a single-way route opens its detail directly -- decision 5).
 *
 * Styles are copied from ResultsScreen.tsx's current flat-list row look
 * (row/rowInfo/rowTitle/rowRight/rides/chev) so a way row here looks exactly
 * like today's RESULTS row — only the level above it (the route card) is new.
 */
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ResultsRoute } from './resultsListModel';
import { fmt } from './colourModel';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

export interface ResultsWayListProps {
  route: ResultsRoute;
  onBack: () => void;
  onOpenWay: (wayId: string) => void;
}

export default function ResultsWayList({ route, onBack, onOpenWay }: ResultsWayListProps) {
  const { t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.backRow} onPress={onBack}>
        <Text style={styles.backLabel}>‹ ROUTES</Text>
      </Pressable>
      <Text style={styles.heading}>{route.label}</Text>
      <FlatList
        data={route.ways}
        keyExtractor={(w) => w.wayId}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onOpenWay(item.wayId)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              {item.bestLapS !== null ? (
                <Text style={styles.sub}>best {fmt(item.bestLapS)}</Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rides}>{item.rideCount} activit{item.rideCount === 1 ? 'y' : 'ies'}</Text>
              <Text style={styles.chev}>›</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  backRow: { paddingVertical: 4 },
  backLabel: { color: t.textDim, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  heading: {
    color: t.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sub: { color: t.textDim, fontSize: 13, fontVariant: ['tabular-nums'] },
  row: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: { gap: 2, flex: 1 },
  rowTitle: { color: t.text, fontSize: 17, fontWeight: '800' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rides: { color: t.textDim, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chev: { color: t.textDim, fontSize: 16 },
});
