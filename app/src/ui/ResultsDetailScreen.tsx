/**
 * WP-2: the full-screen RESULTS detail — one way's history, opened from
 * ResultsScreen.tsx. Modelled line-for-line on CatalogDetailScreen.tsx's
 * chrome (`request` prop, per-render `activeCatalog()`, `useMemo` models,
 * `null`-model-closes-via-`useEffect`, top bar `‹ BACK` / title / caption,
 * bottom `BACK TO RESULTS` button) — that file exports nothing but the
 * screen, so this chrome is copied, not imported, same as
 * CatalogDetailScreen.tsx's own note on RideDetailScreen.tsx.
 *
 * Layout (§3.10): way name -> LAST N RIDES (header, hint, the ResultsPlot
 * scatterplot) -> ALL N RIDES · fastest first (the unbounded all-time
 * board) -> BACK TO RESULTS. No map (Nathan, Q2) — no WayMapView import.
 *
 * The board never colours a time by tier (§3.2): PB is the only marker, a
 * filled purple dot, never a tier colour. Rankings-off (SETTINGS) collapses
 * the board's rows exactly like RideDetailScreen's PbDetail — the caption
 * stays, the rows don't render.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ResultsDetailRequest } from './tabNav.tsx';
import { useTabNav } from './tabNav.tsx';
import { useTheme } from './themeContext.tsx';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import { activeCatalog } from '../store/sportStore.ts';
import { storedResultsForWay } from '../store/resultsStore.ts';
import { wayLabelIn } from '../store/defaultWay.ts';
import { allTimeBestLapS } from './colourModel.ts';
import {
  buildHistoryBoard, boardCaption, windowCaption, type HistoryBoardModel, type HistoryRow,
} from './resultsListModel.ts';
import { plotWindow } from './resultsPlotModel.ts';
import ResultsPlot from './resultsPlot.tsx';

export default function ResultsDetailScreen({ request }: { request: ResultsDetailRequest }) {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const { s } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Which board row is highlighted — wired to the plot's own selection in
  // Phase C; already live here so B3's board rows can carry the accent bar.
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  // B-39: read per render, never captured at import.
  const CATALOG = activeCatalog();
  const way = CATALOG.ways.find((w) => w.id === request.wayId);

  // §3.4/§0: the way can vanish out from under this screen (a route/way
  // delete elsewhere). null model => close, never during render.
  useEffect(() => {
    if (way === undefined) tabNav.closeResults();
  }, [way, tabNav]);

  if (way === undefined) return null;

  const results = storedResultsForWay(request.wayId);
  const best = allTimeBestLapS(request.wayId);
  const board = buildHistoryBoard(results, best);
  const windowN = plotWindow(results).length;
  const label = wayLabelIn(CATALOG, request.wayId);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => tabNav.closeResults()} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: t.text }]}>RESULTS</Text>
        <Text style={[styles.topDate, { color: t.textDim }]}>{board.total} ride{board.total === 1 ? '' : 's'}</Text>
      </View>

      <Text style={[styles.wayName, { color: t.text }]}>{label}</Text>

      <Text style={[st.h2, { color: t.textDim }]}>{windowCaption(windowN)}</Text>
      <Text style={[styles.hint, { color: t.textDim }]}>
        purple = fastest of these · green / yellow = faster / slower than their average
      </Text>
      <ResultsPlot
        results={results}
        boardRows={board.rows}
        rankingsOn={s.tower}
        selectedRideId={selectedRideId}
        onSelect={setSelectedRideId}
        onOpenRide={(rideId, startedAtMs) => tabNav.openRide({ rideId, source: 'results', startedAtMs })}
      />

      <HistoryBoard
        board={board}
        rankingsOn={s.tower}
        t={t}
        styles={styles}
        selectedRideId={selectedRideId}
        onOpenRide={(rideId, startedAtMs) => tabNav.openRide({ rideId, source: 'results', startedAtMs })}
      />

      <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.closeResults()}>
        <Text style={[st.slimBtnText, { color: t.onAccent }]}>BACK TO RESULTS</Text>
      </Pressable>
    </ScrollView>
  );
}

// ------------------------------------------------------------- HistoryBoard

function HistoryBoard({
  board, rankingsOn, t, styles, selectedRideId, onOpenRide,
}: {
  board: HistoryBoardModel;
  rankingsOn: boolean;
  t: PaddockTheme;
  styles: ReturnType<typeof makeStyles>;
  selectedRideId: string | null;
  onOpenRide: (rideId: string, startedAtMs: number) => void;
}) {
  let printedNotRanked = false;
  return (
    <View>
      <Text style={[st.h2, { color: t.textDim }]}>{boardCaption(board.total, rankingsOn)}</Text>
      {rankingsOn ? board.rows.map((row) => {
        const showSub = row.pos === null && !printedNotRanked;
        if (showSub) printedNotRanked = true;
        return (
          <View key={row.rideId}>
            {showSub ? <Text style={[styles.notRanked, { color: t.textDim }]}>not ranked</Text> : null}
            <HistoryRowView
              row={row}
              t={t}
              styles={styles}
              selected={row.rideId === selectedRideId}
              onPress={() => onOpenRide(row.rideId, row.startedAtMs)}
            />
          </View>
        );
      }) : null}
    </View>
  );
}

function HistoryRowView({
  row, t, styles, selected, onPress,
}: {
  row: HistoryRow;
  t: PaddockTheme;
  styles: ReturnType<typeof makeStyles>;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.histRow,
        { borderColor: t.cardBorder },
        selected && { borderLeftWidth: 3, borderLeftColor: t.accent },
      ]}
    >
      <Text style={[styles.histPos, { color: t.textDim }]}>{row.pos !== null ? `P${row.pos}` : '—'}</Text>
      <Text style={[styles.histDate, { color: t.textDim }]}>{row.dateLabel}</Text>
      <View style={styles.histTimeGroup}>
        {row.pb ? <View style={[styles.pbDot, { backgroundColor: colors.purple }]} /> : null}
        <Text style={[styles.histTime, { color: row.noTime ? colors.grey : t.text }]}>{row.timeLabel}</Text>
      </View>
      <Text style={[styles.histGap, { color: t.textDim }]}>{row.gapLabel}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ styles

// Copied VALUES from CatalogDetailScreen.tsx's makeStyles/st (topBar/
// backText/topTitle/topDate/slimBtn/slimBtnText/h2) — that file exports
// nothing but the screen, so these are duplicated on purpose, not imported.
const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backText: { fontSize: 14, fontWeight: '700' },
  topTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  topDate: { fontSize: 12 },
  wayName: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  hint: { fontSize: 12, marginTop: -4, marginBottom: 10 },
  notRanked: { fontSize: 11, letterSpacing: 1, marginTop: 8, marginBottom: 2 },
  histRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  histPos: { width: 32, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  histDate: { flex: 1, fontSize: 13 },
  histTimeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  histTime: { fontSize: 14, fontVariant: ['tabular-nums'] },
  pbDot: { width: 6, height: 6, borderRadius: 3 },
  histGap: { width: 48, textAlign: 'right', fontSize: 12, fontVariant: ['tabular-nums'] },
});

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  slimBtn: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.btn,
  },
  slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
});
