/**
 * RESULTS — WP-2: the way-list (§3.8). Re-introduces the top-level results
 * tab Nathan asked for (2026-09-05): every way he's actually ridden, most-
 * ridden first, full name, tap through to that way's all-time board and
 * scatterplot (ResultsDetailScreen.tsx). Structure copied from
 * RidesScreen.tsx's outer shape; row/card styling copied from RidesScreen's
 * row look, not imported — RidesScreen.tsx exports nothing but the screen.
 *
 * WP-1 landed first: this list is sport-scoped exactly like ROUTES/RIDES —
 * `activeCatalog()`, not `currentCatalog()` — and carries the same bare
 * sport-name badge line as those two screens.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { activeCatalog, activeSportId, currentSports } from '../store/sportStore';
import { storedResultsForWay } from '../store/resultsStore';
import { allTimeBestLapS } from './colourModel';
import { buildResultsList } from './resultsListModel';
import { useTabNav } from './tabNav';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

export default function ResultsScreen() {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Bumped once after mount so the model re-reads the results store after
  // whatever async hydration RIDES' own backfill pass may still be doing —
  // same idiom as RidesScreen's resultsTick, CatalogDetailScreen's tick.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((v) => v + 1);
  }, []);

  const CATALOG = activeCatalog();
  const sportId = activeSportId();
  const sportLabel = currentSports().sports.find((sp) => sp.id === sportId)?.label ?? null;

  const model = useMemo(
    () => buildResultsList(CATALOG, storedResultsForWay, allTimeBestLapS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CATALOG, tick],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Results</Text>
      {/* Q5/WP-1: bare sport-name badge, same convention as ROUTES/RIDES. */}
      <Text style={styles.sub}>
        {sportLabel !== null ? sportLabel.toUpperCase() : 'NO SPORT YET — ADD ONE IN SETTINGS'}
      </Text>
      {model.rows.length === 0 ? (
        <Text style={styles.empty}>no results yet — finish a ride on a way and it shows up here</Text>
      ) : (
        <FlatList
          data={model.rows}
          keyExtractor={(r) => r.wayId}
          ListFooterComponent={
            model.unriddenWays > 0 ? (
              <Text style={styles.footer}>
                {model.unriddenWays} more way{model.unriddenWays === 1 ? '' : 's'} with no rides yet — see ROUTES
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => tabNav.openResults({ wayId: item.wayId })}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.sub}>
                  {item.bestLabel !== null ? `best ${item.bestLabel} · ` : ''}last {item.lastLabel}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rides}>{item.rides} ride{item.rides === 1 ? '' : 's'}</Text>
                <Text style={styles.chev}>›</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  title: {
    color: t.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sub: { color: t.text2, fontSize: 14, fontVariant: ['tabular-nums'] },
  empty: { color: t.textDim, fontSize: 14 },
  footer: { color: t.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
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
