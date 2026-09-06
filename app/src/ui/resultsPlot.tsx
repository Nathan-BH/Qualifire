/**
 * WP-2 Phase C: the RESULTS detail's scatterplot (§3.3-§3.7) — the last
 * PLOT_N ranked rides on a way, x = time (proportional, no panning — the
 * whole window always fits, never a ScrollView, never PX_PER_DAY), y =
 * scored seconds with faster-at-the-top orientation (Nathan, Q3). Every
 * pixel comes from resultsPlotModel.ts's buildPlotModel — this component
 * only measures its own width (onLayout, same idiom as wayMapView.tsx's
 * PngWayMap) and lays out plain Views from what the model already computed.
 * No arithmetic here — position lookups for the caption (date/time/rank)
 * are plain string formatting off resultsListModel.ts's already-formatted
 * HistoryRow, never a recomputation.
 *
 * The average line is a row of small Views (a "dash train"), never a
 * single-edge `borderStyle: 'dotted'` (unreliable cross-platform on RN).
 * Plain Views throughout — no react-native-svg, no native rebuild.
 *
 * Rankings-off (SETTINGS s.tower) leaves the plot itself untouched — tones
 * are pure time comparisons, not a rank — the switch only drops the
 * position segment from the selection caption below.
 */
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent, Pressable, StyleSheet, Text, View,
} from 'react-native';
import type { RideResult } from '../store/types.ts';
import {
  buildPlotModel, GUTTER_W, PLOT_H, POINT_R, FASTEST_R, type PointTone,
} from './resultsPlotModel.ts';
import type { HistoryRow } from './resultsListModel.ts';
import { YELLOW_TIER } from './tierColour.ts';
import { PaddockTheme, colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const DASH_W = 5;
const DASH_GAP = 5;
const X_AXIS_H = 16;
const Y_TICK_LABEL_W = 36;

function toneColour(tone: PointTone): string {
  if (tone === 'fastest') return colors.purple;
  if (tone === 'faster') return colors.green;
  return YELLOW_TIER;
}

export default function ResultsPlot({
  results, boardRows, rankingsOn, selectedRideId, onSelect, onOpenRide,
}: {
  results: RideResult[];
  boardRows: HistoryRow[];
  rankingsOn: boolean;
  selectedRideId: string | null;
  onSelect: (rideId: string) => void;
  onOpenRide: (rideId: string, startedAtMs: number) => void;
}) {
  const { t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [boxW, setBoxW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width !== boxW) setBoxW(width);
  };

  const plotW = Math.max(0, boxW - GUTTER_W);
  const model = useMemo(() => buildPlotModel(results, plotW), [results, plotW]);

  const dashes = useMemo(
    () => Array.from({ length: plotW > 0 ? Math.ceil(plotW / (DASH_W + DASH_GAP)) : 0 }),
    [plotW],
  );

  // The row this selection's caption reads off — pure lookup, no arithmetic;
  // dateLabel/timeLabel/pos are already formatted by buildHistoryBoard.
  const selectedRow = selectedRideId !== null
    ? boardRows.find((r) => r.rideId === selectedRideId) ?? null
    : null;

  return (
    <View style={[styles.frame, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <View onLayout={onLayout} style={{ flexDirection: 'row' }}>
        {boxW === 0 ? (
          <View style={{ height: PLOT_H }} />
        ) : model.empty === 'no-ranked' ? (
          <View style={styles.emptyWrap}>
            <Text style={{ color: t.textDim }}>not enough ranked rides yet</Text>
          </View>
        ) : (
          <>
            {/* y-axis gutter */}
            <View style={{ width: GUTTER_W, height: PLOT_H }}>
              {model.yTicks.map((tick) => (
                tick.label === null ? null : (
                  <Text
                    key={tick.at}
                    numberOfLines={1}
                    style={[
                      styles.yTickLabel,
                      { color: t.textDim, top: tick.at - 7, width: Y_TICK_LABEL_W },
                    ]}
                  >
                    {tick.label}
                  </Text>
                )
              ))}
            </View>
            {/* plot area */}
            <View style={{ width: plotW, height: PLOT_H }}>
              {model.meanY !== null ? (
                <View style={[styles.dashRow, { top: model.meanY }]} pointerEvents="none">
                  {dashes.map((_, i) => (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      style={[styles.dash, { backgroundColor: t.textDim, width: DASH_W, marginRight: DASH_GAP }]}
                    />
                  ))}
                </View>
              ) : null}
              {model.points.map((p) => {
                const r = p.tone === 'fastest' ? FASTEST_R : POINT_R;
                const selected = p.rideId === selectedRideId;
                return (
                  <Pressable
                    key={p.rideId}
                    hitSlop={8}
                    onPress={() => onSelect(p.rideId)}
                    style={[
                      styles.point,
                      {
                        left: p.x - r,
                        top: p.y - r,
                        width: r * 2,
                        height: r * 2,
                        borderRadius: r,
                        backgroundColor: toneColour(p.tone),
                      },
                      selected && { borderWidth: 2, borderColor: t.text },
                    ]}
                  />
                );
              })}
            </View>
          </>
        )}
      </View>
      {boxW > 0 && model.empty === 'none' ? (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: GUTTER_W }} />
          <View style={{ width: plotW, height: X_AXIS_H }}>
            {model.xTicks.map((tick) => (
              <Text
                key={tick.at}
                numberOfLines={1}
                style={[styles.xTickLabel, { color: t.textDim, left: tick.at - 16 }]}
              >
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {/* selection caption — WP-2 §3.7: drops the position segment when
          rankings are off, but the dots above are unaffected by the switch. */}
      <Pressable
        style={styles.captionRow}
        disabled={selectedRow === null}
        onPress={() => {
          if (selectedRow !== null) onOpenRide(selectedRow.rideId, selectedRow.startedAtMs);
        }}
      >
        <Text style={[styles.captionText, { color: t.textDim }]}>
          {selectedRow === null
            ? 'tap a point for that ride'
            : `${selectedRow.dateLabel} · ${selectedRow.timeLabel}${
              rankingsOn && selectedRow.pos !== null ? ` · P${selectedRow.pos}` : ''
            }`}
        </Text>
        {selectedRow !== null ? (
          <Text style={[styles.captionLink, { color: t.accent }]}>open ›</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingTop: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  emptyWrap: { flex: 1, height: PLOT_H, alignItems: 'center', justifyContent: 'center' },
  yTickLabel: { position: 'absolute', fontSize: 10, textAlign: 'right' },
  xTickLabel: { position: 'absolute', top: 0, fontSize: 10, width: 32, textAlign: 'center' },
  dashRow: {
    position: 'absolute', left: 0, right: 0, flexDirection: 'row', height: 1, overflow: 'hidden',
  },
  dash: { height: 1 },
  point: { position: 'absolute' },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.cardBorder,
    marginTop: 8,
  },
  captionText: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  captionLink: { fontSize: 12.5, fontWeight: '700' },
});
