/**
 * Save-flow gate-adjustment card (OPEN-ITEMS item 3, Part B). SETUP-UX §4,
 * cited not redesigned: tap a gate -> it enlarges; a glove-sized
 * `−1% −0.1% │ 1 842 m │ +0.1% +1%` nudge pad sits in the bottom third of
 * the card, the chainage number always visible and never under the thumb.
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's and RideDetailScreen's 'ending'/adjust steps after
 * CREATE WAY saved a route whose gates were seeded (gateSeeding.ts), and by
 * ROUTES' full-screen `GateAdjustScreen.tsx` (WP-J extended scope) for an
 * existing route. Dumb UI: owns only selection and the working chainage
 * list; the host screen owns persistence (KEEP = nothing, SAVE with moved
 * gates = a v2 gate set via addGateSet/saveAdjustedGates or editRouteGates,
 * store/wayFromRide.ts).
 *
 * WP-J (2026-09-05): the card now embeds a REAL, zoomable `RouteMapView`
 * (browse variant, no rider) instead of the old custom View-based drawing —
 * "no basemap, no pan/zoom" (this file's original claim) is superseded at
 * Nathan's request ("so I could not zoom in on the route to see better
 * where my gates were + landmark features they were close to"). The map is
 * rebuilt from `buildRuntimeRouteAsset` on every nudge and re-places every
 * gate on it by chainage; tapping a gate tick on the map (or a chip below)
 * selects it. START and FINISH are adjustable like any gate (see
 * gateAdjustModel.ts's isAdjustable) — the old end-lock existed only for
 * B-20's laps-cost, which is nil on a route's first gate set (RecordScreen/
 * RideDetailScreen host) and is priced by WP-I's reset dialog instead on the
 * ROUTES full-screen host. The nudge pad supports hold-to-repeat (long-press
 * starts a fixed-rate repeat, release stops it) and its layout keeps every
 * button inside a 294-px worst-case content width (WP-H, folded in).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RefLine } from '../../core/src/index.ts';
import { radius } from './theme';
import { useTheme } from './themeContext';
import {
  NUDGE_LARGE_PCT, NUDGE_SMALL_PCT, clampNudge, fmtChainage, fmtPct, gateName, nudgeDeltaM,
} from './gateAdjustModel';
import { buildRuntimeRouteAsset } from './routeAssetRuntime.ts';
import RouteMapView from './routeMapView.tsx';

export interface GateAdjustCardProps {
  /** the route this card edits — a real id (never null): the embedded
   * RouteMapView needs it for the PNG rung's IMAGES lookup and its
   * mode-reset effect keys on it (routeMapView.tsx). */
  routeId: string;
  /** the ride's real reference line (WP-I): the map draws it and places gates on it */
  refLine: RefLine;
  refLengthM: number;
  initialChainageM: number[];
  busy: boolean;
  onKeep: () => void;
  onSave: (chainageM: number[]) => void;
  /** WP-I: optional copy overrides for the "editing an existing route" case
   * — default (undefined) is today's just-created-route copy, byte-for-byte. */
  title?: string;
  subtitle?: string;
  discardLabel?: string;
  /** WP-J (extended scope, 2026-09-05): map height in px. Default MAP_H
   * (280) — the inline Record/RideDetail hosts. GateAdjustScreen.tsx passes
   * a larger value so the full-screen editor spends its room on the map. */
  mapHeight?: number;
}

const MAP_H = 280;
const REPEAT_MS = 120;      // ~8 nudges/s: ±1 % → 8 %/s, ±0.1 % → 0.8 %/s
const LONG_PRESS_MS = 350;

export function GateAdjustCard(props: GateAdjustCardProps) {
  const { t } = useTheme();
  const [chainageM, setChainageM] = useState<number[]>(props.initialChainageM);
  const [selected, setSelected] = useState<number | null>(null);
  const n = chainageM.length;
  const dirty = chainageM.some((v, i) => Math.abs(v - props.initialChainageM[i]) > 1e-6);

  // Built once per ref, rebuilt per nudge (chainageM changes): the map you
  // zoom into needs the room, so every gate is re-placed ON the real line by
  // chainage on each nudge — the same asset shape the PNG/MapLibre rungs
  // already know how to draw (routeAssetRuntime.ts).
  const asset = useMemo(
    () => buildRuntimeRouteAsset(props.refLine, chainageM, 'gate-card'),
    [props.refLine, chainageM],
  );

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

  // Hold-to-repeat (§4.4): onLongPress starts a fixed-rate interval,
  // onPressOut stops it. nudgeRef always points at the latest `nudge`
  // closure so the interval callback never nudges from stale state — the
  // functional setChainageM inside `nudge` is what makes this safe.
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudgeRef = useRef(nudge);
  nudgeRef.current = nudge;
  const stopRepeat = () => {
    if (repeat.current !== null) {
      clearInterval(repeat.current);
      repeat.current = null;
    }
  };
  const startRepeat = (deltaM: number) => {
    stopRepeat();
    nudgeRef.current(deltaM); // first step on hold-start
    repeat.current = setInterval(() => nudgeRef.current(deltaM), REPEAT_MS);
  };
  useEffect(() => stopRepeat, []); // unmount
  useEffect(() => {
    if (props.busy || selected === null) stopRepeat();
  }, [props.busy, selected]);

  const pad = (label: string, deltaM: number, size: 'big' | 'small') => (
    <Pressable
      key={label}
      style={[st.padBtn, size === 'big' ? st.padBtnBig : st.padBtnSmall, { borderColor: t.cardBorder }]}
      disabled={props.busy}
      onPress={() => nudge(deltaM)}
      onLongPress={() => startRepeat(deltaM)}
      delayLongPress={LONG_PRESS_MS}
      onPressOut={stopRepeat}
    >
      <Text
        style={[size === 'big' ? st.padTextBig : st.padTextSmall, { color: t.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>{props.title ?? 'Sector gates — proposed'}</Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        {props.subtitle ?? 'Seeded at 1/25/50/75/99 % of your ride, nudged clear of where you stopped. A proposal, not a benchmark — pick a gate to nudge it (start and finish too), or keep it and refine after a few rides.'}
      </Text>

      <View style={st.mapWrap}>
        <RouteMapView
          routeId={props.routeId}
          asset={asset}
          lat={null}
          lon={null}
          variant="browse"
          showRider={false}
          height={props.mapHeight ?? MAP_H}
          gateSelect={{ selected, onPress: (i) => setSelected((cur) => (cur === i ? null : i)) }}
        />
      </View>

      <View style={st.chipRow}>
        {chainageM.map((_, i) => {
          const sel = selected === i;
          return (
            <Pressable
              key={i}
              style={[st.chip, { borderColor: t.cardBorder }, sel && { backgroundColor: t.accent }]}
              disabled={props.busy}
              onPress={() => setSelected((cur) => (cur === i ? null : i))}
            >
              <Text
                style={[st.chipText, { color: sel ? t.onAccent : t.text }]}
                numberOfLines={1}
              >
                {gateName(i, n)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null ? (
        <>
          <Text style={[st.readout, { color: t.text }]}>
            {gateName(selected, n)} · {fmtChainage(chainageM[selected])} · {fmtPct(chainageM[selected], props.refLengthM)}
          </Text>
          <View style={st.padRow}>
            {pad('−1%', -largeM, 'big')}
            {pad('−0.1%', -smallM, 'small')}
            {pad('+0.1%', smallM, 'small')}
            {pad('+1%', largeM, 'big')}
          </View>
        </>
      ) : (
        <Text style={[st.hint, { color: t.textDim }]}>tap a gate on the map or below to nudge it</Text>
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
          <Text style={[st.skipText, { color: t.textDim }]}>{props.discardLabel ?? 'discard nudges — keep the proposal'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  mapWrap: { marginTop: 10 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: radius.btn, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  readout: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10, fontVariant: ['tabular-nums'] },
  padRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  padBtn: { borderWidth: 1, borderRadius: radius.btn, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  padBtnBig: { flex: 1.25, paddingVertical: 16, paddingHorizontal: 6 },
  padBtnSmall: { flex: 0.75, paddingVertical: 10, paddingHorizontal: 4 },
  padTextBig: { fontSize: 17, fontWeight: '800' },
  padTextSmall: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
