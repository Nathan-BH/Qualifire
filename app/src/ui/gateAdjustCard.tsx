/**
 * Save-flow gate-adjustment card (OPEN-ITEMS item 3, Part B). SETUP-UX §4,
 * cited not redesigned: tap a gate -> it enlarges; a glove-sized
 * `−1% −0.1% │ 1 842 m │ +0.1% +1%` nudge pad sits in the bottom third of
 * the card, the chainage number always visible and never under the thumb.
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's and RideDetailScreen's 'ending'/adjust steps after
 * CREATE WAY saved a route whose gates were seeded (gateSeeding.ts). Dumb
 * UI: owns only selection and the working chainage list; the host screen
 * owns persistence (KEEP = nothing, SAVE with moved gates = a v2 gate set
 * via addGateSet/saveAdjustedGates, store/wayFromRide.ts). WP-I (map half):
 * the card draws the ride's REAL reference line (gateAdjustMapModel.ts — the
 * WP-C builder re-fitted into the card's box, the imgFailed segment
 * technique from routeMapView.tsx) and re-places every gate on it by
 * chainage on each nudge; no basemap, no pan/zoom — a proposal card, not a
 * map surface. Still `[UNTESTED ON DEVICE]` until the §4.1 checklist runs.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { RefLine } from '../../core/src/index.ts';
import { radius } from './theme';
import { useTheme } from './themeContext';
import {
  NUDGE_LARGE_PCT, NUDGE_SMALL_PCT, clampNudge, fmtChainage, gateName, isAdjustable, nudgeDeltaM,
} from './gateAdjustModel';
import {
  CARD_TICK_SELECTED_FACTOR, buildCardMapFrame, gateMarkPx, pathSegmentsPx, type GateMarkPx,
} from './gateAdjustMapModel';

export interface GateAdjustCardProps {
  /** the ride's real reference line (WP-I): the map draws it and places gates on it */
  refLine: RefLine;
  refLengthM: number;
  initialChainageM: number[];
  busy: boolean;
  onKeep: () => void;
  onSave: (chainageM: number[]) => void;
}

const MAP_H = 200;

export function GateAdjustCard(props: GateAdjustCardProps) {
  const { t } = useTheme();
  const [chainageM, setChainageM] = useState<number[]>(props.initialChainageM);
  const [selected, setSelected] = useState<number | null>(null);
  const [boxW, setBoxW] = useState(0);
  const n = chainageM.length;
  const dirty = chainageM.some((v, i) => Math.abs(v - props.initialChainageM[i]) > 1e-6);

  const onMapLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== boxW) setBoxW(w);
  };
  // Built once per ref/box: the path never moves when a gate is nudged, only the gate marks do.
  const frame = useMemo(
    () => (boxW > 0 ? buildCardMapFrame(props.refLine, boxW, MAP_H) : null),
    [props.refLine, boxW],
  );
  const segs = useMemo(() => (frame ? pathSegmentsPx(frame) : []), [frame]);
  // Per render (i.e. per nudge): each gate re-placed ON the real line by chainage.
  const marks: GateMarkPx[] = frame
    ? chainageM.map((s, i) => gateMarkPx(props.refLine, frame, s,
        { factor: selected === i ? CARD_TICK_SELECTED_FACTOR : 1 }))
    : [];

  const smallM = nudgeDeltaM(NUDGE_SMALL_PCT, props.refLengthM);
  const largeM = nudgeDeltaM(NUDGE_LARGE_PCT, props.refLengthM);

  const nudge = (deltaM: number) => {
    if (selected === null) return;
    setChainageM((prev) =>
      prev.map((v, i) =>
        i === selected ? clampNudge(prev, selected, deltaM, props.refLengthM) : v,
      ),
    );
  };

  const pad = (label: string, deltaM: number) => (
    <Pressable
      key={label}
      style={[st.padBtn, { borderColor: t.cardBorder }]}
      disabled={props.busy}
      onPress={() => nudge(deltaM)}
    >
      <Text style={[st.padText, { color: t.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>Sector gates — proposed</Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        Seeded at 25/50/75% of your ride, nudged clear of where you stopped. A
        proposal, not a benchmark — tap a gate to nudge it, or keep it and refine
        after a few rides.
      </Text>

      <View style={[st.map, { borderColor: t.cardBorder }]} onLayout={onMapLayout}>
        {segs.map((sg, i) => (
          <View key={`s${i}`} pointerEvents="none" style={{
            position: 'absolute', left: sg.x0, top: sg.y0 - 1.5,
            width: sg.len, height: 3, backgroundColor: t.textDim, opacity: 0.55,
            transform: [{ translateX: 0 }, { rotate: `${sg.angDeg}deg` }],
            transformOrigin: 'left center',
          }} />
        ))}
        {/* selected gate rendered last so its hit area and tick sit on top */}
        {marks
          .map((m, i) => ({ m, i }))
          .sort((a, b) => (a.i === selected ? 1 : 0) - (b.i === selected ? 1 : 0))
          .map(({ m, i }) => {
            const adjustable = isAdjustable(i, n);
            const sel = selected === i;
            const thick = sel ? 5 : 3;
            // loop routes: FINISH sits on START — drop its label a line so both read
            const overlapsStart = i === n - 1 && Math.hypot(m.cx - marks[0].cx, m.cy - marks[0].cy) < 10;
            return (
              <View key={`g${i}`} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                <View pointerEvents="none" style={{
                  position: 'absolute', left: m.x0, top: m.y0 - thick / 2,
                  width: m.len, height: thick, borderRadius: thick / 2,
                  backgroundColor: adjustable ? t.accent : t.textDim,
                  transform: [{ translateX: 0 }, { rotate: `${m.angDeg}deg` }],
                  transformOrigin: 'left center',
                }} />
                {sel ? (
                  <View pointerEvents="none" style={[st.halo, {
                    left: m.cx - 16, top: m.cy - 16, borderColor: t.accent,
                  }]} />
                ) : null}
                <Pressable
                  disabled={!adjustable || props.busy}
                  onPress={() => setSelected(sel ? null : i)}
                  hitSlop={4}
                  style={[st.hit, { left: m.cx - 22, top: m.cy - 22 }]}
                />
                <View pointerEvents="none" style={[st.labelBox, { left: m.cx - 22, top: m.cy + (overlapsStart ? 26 : 14) }]}>
                  <Text style={[st.tickLabel, { color: sel ? t.text : t.textDim }]}>{gateName(i, n)}</Text>
                </View>
              </View>
            );
          })}
      </View>

      {selected !== null ? (
        <View style={st.padRow}>
          {pad('−1%', -largeM)}
          {pad('−0.1%', -smallM)}
          <Text style={[st.chainage, { color: t.text }]}>{fmtChainage(chainageM[selected])}</Text>
          {pad('+0.1%', smallM)}
          {pad('+1%', largeM)}
        </View>
      ) : (
        <Text style={[st.hint, { color: t.textDim }]}>tap G1–G3 to nudge a gate</Text>
      )}

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, props.busy && st.dim]}
        disabled={props.busy}
        onPress={() => (dirty ? props.onSave(chainageM) : props.onKeep())}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>
          {dirty ? 'SAVE GATES' : 'KEEP GATES'}
        </Text>
      </Pressable>
      {dirty ? (
        <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onKeep}>
          <Text style={[st.skipText, { color: t.textDim }]}>discard nudges — keep the proposal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  map: { height: MAP_H, marginTop: 10, borderWidth: 1, borderRadius: radius.btn, overflow: 'hidden' },
  hit: { position: 'absolute', width: 44, height: 44 },
  halo: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, opacity: 0.6 },
  labelBox: { position: 'absolute', width: 44, alignItems: 'center' },
  tickLabel: { fontSize: 10, letterSpacing: 1 },
  padRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  padBtn: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 12, paddingVertical: 12, minWidth: 52, alignItems: 'center' },
  padText: { fontSize: 15, fontWeight: '700' },
  chainage: { fontSize: 16, fontWeight: '700', minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
