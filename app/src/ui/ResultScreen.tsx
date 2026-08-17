/**
 * Post-run board (B-29 / mockup 2026-08-16), reading the REAL archive ghosts
 * from src/store/results.seed.json.
 *
 * Honesty: position is a fact and is never coloured (D-013/D-028) — only the
 * lap and sector rows carry a tier, and which tier depends on the colour model
 * chosen in Settings. Until a real ride exists this screen shows the most
 * recent ghost as "today" so the layout can be judged; that is labelled.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MIN_HISTORY, fmt, ghostsFor, lapValues, positionAmong, sectorValues, tierFor, type UiTier }
  from './colourModel.ts';
import { getLastRide } from './lastRide.ts';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const FALLBACK_ROUTE = 'Morning'; // only used when no ride has finished yet

function tierColour(tier: UiTier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}

export default function ResultScreen() {
  const { t } = useTheme();
  const { s } = useSettings();
  const ride = getLastRide();                       // the ride you just finished
  const ROUTE = ride?.routeId ?? FALLBACK_ROUTE;
  // B-44: today's own recorded ride must not sit inside its own comparison
  // history — exclude it by the same session id pushRecorded() gave it.
  const sessionId = ride ? `session:${ride.atMs}` : undefined;
  const ghosts = ghostsFor(ROUTE, sessionId);
  const laps = lapValues(ROUTE, sessionId);

  if (ghosts.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: t.textDim }}>No ride history for this route yet.</Text>
      </View>
    );
  }

  // A real finished ride wins; otherwise the newest ghost stands in so the
  // layout can be judged — and that substitution is stated on screen.
  const stand = ghosts[ghosts.length - 1];
  const today = ride
    ? { sectors: ride.sectors.map((x) => ({ ...x, quality: x.quality as string })) }
    : { sectors: stand.sectors.map((x) => ({ index: x.index, movingS: x.movingS, rawS: x.rawS, quality: x.quality as string })) };
  const mine = (ride ? (ride.lapMovingS ?? ride.lapRawS) : stand.lap.movingS) as number | null;
  const others = ride ? laps : laps.filter((_, i) => i !== ghosts.length - 1);
  if (mine === null) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: t.textDim }}>
          That ride has no lap — a gate was missed or the trace had a gap, so nothing is scored.
          Nothing is invented here (D-025).
        </Text>
      </View>
    );
  }
  // D-028, enforced on BOTH screens: an estimated lap never ranks. The live
  // screen already refused it; this one used to rank it anyway (cycle 009).
  const ranked = !(ride?.estimated ?? false) && others.length >= MIN_HISTORY;
  const { pos, of } = positionAmong(mine, others);
  const lapTier = ride?.estimated ? 'est' : tierFor(mine, others);
  const rows = [...others.map((v) => ({ v, me: false })), { v: mine, me: true }]
    .sort((a, b) => a.v - b.v);
  const pole = rows[0].v;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>LAP</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
        <Text style={[st.big, { color: tierColour(lapTier, t) }]}>{fmt(mine, 1)}</Text>
        <Text style={{ color: t.textDim, fontSize: 12.5 }}>
          {ranked
            ? `P${pos} of ${of} · ${others.length} ghosts`
            : ride?.estimated
              ? 'NO TIME — estimated laps never rank (D-028)'
              : `${others.length} rides of history — too few to rank`}
        </Text>
      </View>

      {s.tower && ranked ? (
        <>
          <Text style={[st.h2, { color: t.textDim }]}>TIMING TOWER — LAST {others.length} RIDES</Text>
          <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            {rows.map((r, i) => (
              <View key={i} style={[st.row, { borderBottomColor: t.cardBorder }]}>
                <Text style={[st.pos, { color: t.textDim }]}>P{i + 1}</Text>
                <Text style={{ flex: 1, color: r.me ? t.text : t.textDim, fontWeight: r.me ? '700' : '400' }}>
                  {r.me ? 'TODAY' : 'ghost'}
                </Text>
                <Text style={[st.num, { color: r.me ? t.text : t.textDim }]}>{fmt(r.v)}</Text>
                <Text style={[st.num, { color: t.textDim, width: 56 }]}>
                  {i === 0 ? '' : `+${(r.v - pole).toFixed(0)}s`}
                </Text>
              </View>
            ))}
            <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
              The tower does not change with the colour model, by design: position is a fact,
              colour is a judgement (D-013).
            </Text>
          </View>
        </>
      ) : null}

      <Text style={[st.h2, { color: t.textDim }]}>SECTORS</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {today.sectors.map((sec) => {
          const hist = sectorValues(ROUTE, sec.index, sessionId).filter((v) => v !== sec.movingS);
          const tier = tierFor(sec.movingS, hist);
          const col = tierColour(tier, t);
          const mean = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : null;
          return (
            <View key={sec.index} style={[st.row, { borderBottomColor: t.cardBorder }]}>
              <Text style={[st.pos, { color: col, fontWeight: '700' }]}>S{sec.index}</Text>
              <Text style={{ flex: 1, color: t.textDim, fontSize: 12 }}>
                {sec.quality !== 'clean' ? sec.quality : ''}
              </Text>
              <Text style={[st.num, { color: col }]}>
                {sec.movingS !== null ? fmt(sec.movingS, 1) : `~${fmt(sec.rawS)}`}
              </Text>
              <Text style={[st.num, { color: t.textDim, width: 74 }]}>
                {mean !== null ? `avg ${fmt(mean)}` : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 12 }}>
        Purple beats every ghost, green is above your recent average, yellow is an ordinary
        lap — F1's own palette. Rows shown are archive ghosts recomputed by our own pipeline. {ride
          ? `"TODAY" is the ride you just finished on ${ROUTE}.`
          : '"TODAY" is the most recent ghost — record a ride and it is replaced by yours.'}
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  pos: { width: 40, fontWeight: '700' },
  num: { fontVariant: ['tabular-nums'], textAlign: 'right', width: 66 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
