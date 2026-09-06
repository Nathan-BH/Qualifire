/**
 * WP-2 Phase C: the RESULTS detail's scatterplot (§3.3-§3.7) — the last
 * PLOT_N ranked rides on a way, x = time (proportional, no panning — the
 * whole window always fits, never a ScrollView, never PX_PER_DAY), y =
 * scored seconds with faster-at-the-top orientation (Nathan, Q3). Every
 * pixel comes from resultsPlotModel.ts's buildPlotModel — this component
 * only measures its own width (onLayout, same idiom as wayMapView.tsx's
 * PngWayMap) and lays out plain Views from what the model already computed.
 * No arithmetic here — the caption's date/time are formatted directly off
 * the selected point's own raw fields via colourModel.ts's fmt and
 * towerModel.ts's towerDate (the same formatters resultsPlotModel.ts uses
 * internally), never a recomputation; the all-time position segment
 * (`selectedPosLabel`) is computed by the screen from its own board data,
 * not here — the plot never reaches into boardRows/rankingsOn itself.
 *
 * The average line is a row of small square dots (a "dotted" train, per
 * §3.7 — 2x2px squares spaced 4px apart), never a single-edge
 * `borderStyle: 'dotted'` (unreliable cross-platform on RN). Plain Views
 * throughout — no react-native-svg, no native rebuild.
 *
 * Rankings-off (SETTINGS s.tower) leaves the plot itself untouched — tones
 * are pure time comparisons, not a rank — the switch only drops the
 * position segment from the selection caption below (the screen passes an
 * empty `selectedPosLabel` in that case).
 */
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent, Pressable, StyleSheet, Text, View,
} from 'react-native';
import type { RideResult } from '../store/types.ts';
import {
  buildPlotModel, GUTTER_W, PLOT_H, POINT_R, FASTEST_R, type PointTone,
} from './resultsPlotModel.ts';
import { YELLOW_TIER } from './tierColour.ts';
import { fmt } from './colourModel.ts';
import { towerDate } from './towerModel.ts';
import { PaddockTheme, colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const DASH_W = 2;
const DASH_GAP = 4;
const X_AXIS_H = 16;
const Y_TICK_LABEL_W = 36;
const AVG_LABEL_W = 44; // avg label needs more room than a bare tick ("avg 42:07" vs "42:07")
const X_TICK_LABEL_W = 80;
const RING_R = 8;

function toneColour(tone: PointTone): string {
  if (tone === 'fastest') return colors.purple;
  if (tone === 'faster') return colors.green;
  return YELLOW_TIER;
}

export default function ResultsPlot({
  results, selectedRideId, selectedPosLabel, onSelect, onOpenRide,
}: {
  results: RideResult[];
  selectedRideId: string | null;
  /** `P3 of 27` — computed by the screen from its own board data; empty
   * while rankings are off (§3.9). The plot never formats this itself. */
  selectedPosLabel: string;
  onSelect: (rideId: string | null) => void;
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

  // The point this selection's caption reads off — a plain lookup by id
  // against the model's own points, no recomputation.
  const selectedPoint = selectedRideId !== null
    ? model.points.find((p) => p.rideId === selectedRideId) ?? null
    : null;

  // Dedup x-tick positions before rendering: with very few rides (or
  // near-identical timestamps) the model can legitimately hand back two
  // ticks that land on the same pixel (§3.5's zero-candidate fallback
  // labels both ends, which coincide when there is one point) — render
  // only one label there, keyed by index so two same-`at` ticks never
  // collide on key either.
  const xTicksToRender = model.xTicks.filter(
    (tick, i, arr) => arr.findIndex((t2) => t2.at === tick.at) === i,
  );

  return (
    <View style={[styles.frame, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <View onLayout={onLayout} style={{ flexDirection: 'row' }}>
        {boxW === 0 ? (
          <View style={{ height: PLOT_H }} />
        ) : model.empty === 'no-ranked' ? (
          <View style={styles.emptyWrap}>
            <Text style={{ color: t.textDim }}>no ranked rides yet</Text>
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
              {model.meanY !== null && model.meanS !== null ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.avgLabel,
                    { color: t.textDim, top: model.meanY - 7, width: AVG_LABEL_W },
                  ]}
                >
                  {`avg ${fmt(model.meanS)}`}
                </Text>
              ) : null}
            </View>
            {/* plot area */}
            <View style={{ width: plotW, height: PLOT_H }}>
              {/* bottommost: tapping empty plot space clears the selection.
                  Points render after this (on top) and still receive their
                  own taps. */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => onSelect(null)}
              />
              {model.meanY !== null ? (
                <View style={[styles.dashRow, { top: model.meanY - 1 }]} pointerEvents="none">
                  {dashes.map((_, i) => (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      style={[styles.dash, { backgroundColor: t.textDim, width: DASH_W, marginRight: DASH_GAP }]}
                    />
                  ))}
                </View>
              ) : null}
              {selectedPoint !== null ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectionRing,
                    {
                      left: selectedPoint.x - RING_R,
                      top: selectedPoint.y - RING_R,
                      width: RING_R * 2,
                      height: RING_R * 2,
                      borderRadius: RING_R,
                      borderColor: t.text,
                    },
                  ]}
                />
              ) : null}
              {model.points.map((p) => {
                const r = p.tone === 'fastest' ? FASTEST_R : POINT_R;
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
            {xTicksToRender.map((tick, i) => (
              <Text
                // eslint-disable-next-line react/no-array-index-key
                key={`${tick.at}-${i}`}
                numberOfLines={1}
                style={[styles.xTickLabel, { color: t.textDim, left: tick.at - X_TICK_LABEL_W / 2 }]}
              >
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
      {/* selection caption — WP-2 §3.7: drops the position segment when
          rankings are off (the screen passes '' for selectedPosLabel), but
          the dots above are unaffected by the switch. */}
      <Pressable
        style={styles.captionRow}
        disabled={selectedPoint === null}
        onPress={() => {
          if (selectedPoint !== null) onOpenRide(selectedPoint.rideId, selectedPoint.startedAtMs);
        }}
      >
        <Text style={[styles.captionText, { color: t.textDim }]}>
          {selectedPoint === null
            ? 'tap a point for that ride'
            : [towerDate(selectedPoint.startedAtMs), fmt(selectedPoint.timeS), selectedPosLabel]
              .filter((part) => part !== '')
              .join(' · ')}
        </Text>
        {selectedPoint !== null ? (
          <Text style={[styles.captionLink, { color: t.accentText }]}>open ›</Text>
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
  emptyWrap: { flex: 1, height: 120, alignItems: 'center', justifyContent: 'center' },
  yTickLabel: { position: 'absolute', fontSize: 10, textAlign: 'right' },
  avgLabel: { position: 'absolute', fontSize: 10, fontWeight: '600', textAlign: 'right' },
  xTickLabel: {
    position: 'absolute', top: 0, fontSize: 10, width: X_TICK_LABEL_W, textAlign: 'center',
  },
  dashRow: {
    position: 'absolute', left: 0, right: 0, flexDirection: 'row', height: 2, overflow: 'hidden',
  },
  dash: { height: 2, borderRadius: 1 },
  point: { position: 'absolute' },
  selectionRing: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
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
