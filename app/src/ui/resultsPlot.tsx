/**
 * WP-2 Phase C: the RESULTS detail's scatterplot (§3.3-§3.7) — the last
 * PLOT_N ranked rides on a way, x = slot index (a fixed PLOT_N-slot grid,
 * newest at the right edge — virgin-cycle15 brief 04; not proportional to
 * time any more; no panning — the whole window always fits, never a
 * ScrollView, never PX_PER_DAY), y =
 * scored seconds with faster-at-the-top orientation (Nathan, Q3). Every
 * pixel comes from resultsPlotModel.ts's buildPlotModel — this component
 * only measures its own width (onLayout, same idiom as wayMapView.tsx's
 * PngWayMap) and lays out plain Views from what the model already computed.
 * No model arithmetic here (only label-box layout) — the caption's date/time are formatted directly off
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
 * The Rankings switch (SETTINGS s.tower) was retired by virgin-cycle20 08 —
 * rankings are always on; the screen still passes an empty `selectedPosLabel`
 * for a point with no position, and the caption below drops that segment
 * (tones are pure time comparisons, not a rank). Tones are still computed by the
 * model; the dots are NOT tone-coloured (virgin-cycle15 brief 04 retired the
 * three-tone code with its legend). virgin-cycle16 brief 08: the newest
 * ride's dot (last point, rightmost slot) is the brand yellow `t.accent`,
 * every other dot is `t.textDim` — the same grey as the ticks and the
 * average line — so the only colour on the plot marks "this ride".
 * virgin-cycle25 brief 02: a second host, the MAP tab's route sheet, renders it with variant="inline" (no frame, caption only while a point is selected, no open link) and a smaller height; DEMO keeps the card.
 */
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent, Pressable, StyleSheet, Text, View,
} from 'react-native';
import type { RideResult } from '../store/types.ts';
import {
  buildPlotModel, GUTTER_W, PLOT_H, POINT_R,
} from './resultsPlotModel.ts';
import { fmt } from './colourModel.ts';
import { towerDate } from './towerModel.ts';
import { PaddockTheme, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const DASH_W = 2;
const DASH_GAP = 4;
const X_AXIS_H = 16;
const Y_TICK_LABEL_W = 36;
const X_TICK_LABEL_W = 80;
const RING_R = 8;

export default function ResultsPlot({
  results, selectedRideId, selectedPosLabel, onSelect, onOpenRide, variant = 'card', height,
}: {
  results: RideResult[];
  selectedRideId: string | null;
  /** `P3 of 27` — computed by the screen from its own board data; empty
   * while rankings are off (§3.9). The plot never formats this itself. */
  selectedPosLabel: string;
  onSelect: (rideId: string | null) => void;
  /** absent (virgin-cycle25 02, the MAP panel): no `open ›` link, the caption is text only */
  onOpenRide?: (rideId: string, startedAtMs: number) => void;
  /** 'card' = today's bordered card (DEMO); 'inline' (virgin-cycle25 02) = no
   * frame, no padding, caption row only while a point is selected: for a
   * host that already draws the box (the MAP sheet). */
  variant?: 'card' | 'inline';
  /** plot area height; default PLOT_H (220) */
  height?: number;
}) {
  const { t } = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [boxW, setBoxW] = useState(0);
  const inline = variant === 'inline';
  const plotH = height ?? PLOT_H;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width !== boxW) setBoxW(width);
  };

  const plotW = Math.max(0, boxW - GUTTER_W);
  const model = useMemo(() => buildPlotModel(results, plotW, plotH), [results, plotW, plotH]);

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
    <View style={inline ? styles.inlineFrame : [styles.frame, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <View onLayout={onLayout} style={{ flexDirection: 'row' }}>
        {boxW === 0 ? (
          <View style={{ height: plotH }} />
        ) : model.empty === 'no-ranked' ? (
          <View style={styles.emptyWrap}>
            <Text style={{ color: t.textDim }}>no ranked activities yet</Text>
          </View>
        ) : (
          <>
            {/* y-axis gutter */}
            <View style={{ width: GUTTER_W, height: plotH }}>
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
            <View style={{ width: plotW, height: plotH }}>
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
              {model.points.map((p, i) => {
                const r = POINT_R;
                // virgin-cycle16 brief 08: the newest ride (the window is
                // ascending startedAtMs, so the last point) is the brand
                // yellow; the rest are the plot's own grey (Decisions 1–3).
                const newest = i === model.points.length - 1;
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
                        backgroundColor: newest ? t.accent : t.textDim,
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
            {xTicksToRender.map((tick, i) => {
              // virgin-cycle16 brief 08: a label is an 80px box centred on its
              // tick; the newest tick sits PAD_R (12px) from the plot's right
              // edge, so a centred box ran 28px past it, out of the card. Clamp
              // the box inside the plot width and right-align a clamped label so
              // its text hugs the tick. The left is not clamped: the oldest
              // label's overhang lands in the empty gutter spacer and fits.
              const centred = tick.at - X_TICK_LABEL_W / 2;
              const maxLeft = plotW - X_TICK_LABEL_W;
              const atEnd = centred > maxLeft;
              return (
                <Text
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${tick.at}-${i}`}
                  numberOfLines={1}
                  style={[
                    styles.xTickLabel,
                    atEnd ? styles.xTickLabelEnd : null,
                    { color: t.textDim, left: atEnd ? maxLeft : centred },
                  ]}
                >
                  {tick.label}
                </Text>
              );
            })}
          </View>
        </View>
      ) : null}
      {/* selection caption — WP-2 §3.7: drops the position segment when the
          screen passes '' for selectedPosLabel (no position for this point;
          the Rankings switch itself is gone, virgin-cycle20 08). */}
      {inline && selectedPoint === null ? null : (
        <Pressable
          style={[styles.captionRow, inline ? styles.captionRowInline : null]}
          disabled={selectedPoint === null || onOpenRide === undefined}
          onPress={() => {
            if (selectedPoint !== null && onOpenRide !== undefined) onOpenRide(selectedPoint.rideId, selectedPoint.startedAtMs);
          }}
        >
          <Text style={[styles.captionText, { color: t.textDim }]}>
            {selectedPoint === null
              ? 'tap a point for that activity'
              : [towerDate(selectedPoint.startedAtMs), fmt(selectedPoint.timeS), selectedPosLabel]
                .filter((part) => part !== '')
                .join(' · ')}
          </Text>
          {selectedPoint !== null && onOpenRide !== undefined ? (
            <Text style={[styles.captionLink, { color: t.accentText }]}>open ›</Text>
          ) : null}
        </Pressable>
      )}
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
  inlineFrame: { paddingTop: 4 },
  emptyWrap: { flex: 1, height: 120, alignItems: 'center', justifyContent: 'center' },
  yTickLabel: { position: 'absolute', fontSize: 10, textAlign: 'right' },
  xTickLabel: {
    position: 'absolute', top: 0, fontSize: 10, width: X_TICK_LABEL_W, textAlign: 'center',
  },
  xTickLabelEnd: { textAlign: 'right' },
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
  captionRowInline: { paddingVertical: 6, marginTop: 4, borderTopWidth: 0 },
  captionText: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  captionLink: { fontSize: 12.5, fontWeight: '700' },
});
