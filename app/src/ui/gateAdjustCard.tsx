/**
 * Save-flow gate-adjustment card (OPEN-ITEMS item 3, Part B). SETUP-UX §4,
 * cited not redesigned: tap a gate -> it enlarges; a glove-sized
 * `−50 −10 │ 1 842 m │ +10 +50` nudge pad sits in the bottom third of the
 * card, the chainage number always visible and never under the thumb.
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase after CREATE WAY saved a route
 * whose gates were seeded (gateSeeding.ts). Dumb UI: owns only selection and
 * the working chainage list; RecordScreen owns persistence (KEEP = nothing,
 * SAVE with moved gates = a v2 gate set via addGateSet). No map yet — the
 * route IS drawable since WP-C; the map-mirror itself is a separate item
 * (needs a live-chainage override into `buildRuntimeRouteAsset`).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from './theme';
import { useTheme } from './themeContext';
import {
  NUDGE_LARGE_M, NUDGE_SMALL_M, clampNudge, fmtChainage, gateName, isAdjustable,
} from './gateAdjustModel';

export interface GateAdjustCardProps {
  refLengthM: number;
  initialChainageM: number[];
  busy: boolean;
  onKeep: () => void;
  onSave: (chainageM: number[]) => void;
}

export function GateAdjustCard(props: GateAdjustCardProps) {
  const { t } = useTheme();
  const [chainageM, setChainageM] = useState<number[]>(props.initialChainageM);
  const [selected, setSelected] = useState<number | null>(null);
  const n = chainageM.length;
  const dirty = chainageM.some((v, i) => Math.abs(v - props.initialChainageM[i]) > 1e-6);

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

      <View style={st.bar}>
        <View style={[st.barLine, { backgroundColor: t.cardBorder }]} />
        {chainageM.map((c, i) => {
          const adjustable = isAdjustable(i, n);
          const sel = selected === i;
          return (
            <Pressable
              key={i}
              disabled={!adjustable || props.busy}
              onPress={() => setSelected(sel ? null : i)}
              style={[st.tickHit, { left: `${(c / props.refLengthM) * 100}%` }]}
            >
              <View
                style={[
                  st.tick,
                  { backgroundColor: adjustable ? t.accent : t.textDim },
                  sel && st.tickSelected,
                ]}
              />
              <Text style={[st.tickLabel, { color: sel ? t.text : t.textDim }]}>
                {gateName(i, n)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null ? (
        <View style={st.padRow}>
          {pad(`−${NUDGE_LARGE_M}`, -NUDGE_LARGE_M)}
          {pad(`−${NUDGE_SMALL_M}`, -NUDGE_SMALL_M)}
          <Text style={[st.chainage, { color: t.text }]}>{fmtChainage(chainageM[selected])}</Text>
          {pad(`+${NUDGE_SMALL_M}`, NUDGE_SMALL_M)}
          {pad(`+${NUDGE_LARGE_M}`, NUDGE_LARGE_M)}
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
  bar: { height: 58, marginTop: 10, marginHorizontal: 8 },
  barLine: { position: 'absolute', left: 0, right: 0, top: 14, height: 2 },
  tickHit: { position: 'absolute', top: 0, width: 44, marginLeft: -22, alignItems: 'center' },
  tick: { width: 4, height: 30, borderRadius: 2 },
  tickSelected: { width: 8, height: 38, borderRadius: 3 },
  tickLabel: { fontSize: 10, letterSpacing: 1, marginTop: 3 },
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
