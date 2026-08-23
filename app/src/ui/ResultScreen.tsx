/**
 * Post-run board (B-29 / mockup 2026-08-16), reading the REAL archive ghosts
 * from src/store/results.seed.json.
 *
 * Honesty: position is a fact and is never coloured (D-013/D-028) — only the
 * lap and sector rows carry a tier, and which tier depends on the colour model
 * chosen in Settings. Until a real ride exists this screen shows the most
 * recent ghost as "today" so the layout can be judged; that is labelled.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import catalogJson from '../store/catalog.seed.json';
import seedResultsJson from '../store/results.seed.json';
import { fallbackRouteId, routeLabel } from '../store/defaultRoute.ts';
import type { Catalog, RideResult } from '../store/types.ts';
import { chipColors } from './chips.tsx';
import { MIN_HISTORY, allTimeBestLapS, fmt, ghostsFor, lapValues, positionAmong, sectorValues,
  tierFor, type UiTier } from './colourModel.ts';
import { getLastRide, recordedResults } from './lastRide.ts';
import { TimingTower } from './tower.tsx';
import { buildTowerModel } from './towerModel.ts';
import RouteMapView from './routeMapView.tsx';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const CATALOG = catalogJson as unknown as Catalog;
const SEED_RESULTS = seedResultsJson as unknown as RideResult[];

/** The slot-in plays exactly once per FINISHED ride, never on revisit (§3b.3,
 * guarded here AND inside tower.tsx). Module-level so remounts (tab away and
 * back) remember which rides already animated; keyed by the ride's atMs. */
const ANIMATED_RIDES = new Set<number>();

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
  // Hooks must run unconditionally — declared before the early returns below.
  const [traceOpen, setTraceOpen] = useState(false);
  const ride = getLastRide();                       // the ride you just finished
  // No finished ride yet: fall back to the route of the most recent ranking
  // result (seed or session), never a literal track name (B-39). null only
  // when the catalog itself is empty (cannot happen today).
  const ROUTE = ride?.routeId ?? fallbackRouteId(CATALOG, [...SEED_RESULTS, ...recordedResults()]);
  // B-44: today's own recorded ride must not sit inside its own comparison
  // history — exclude it by its real rideId (cycle 024, WP-A1: FinishedRide
  // now carries the real id, not a session:-prefixed stand-in).
  const sessionId = ride?.rideId;
  const ghosts = ROUTE !== null ? ghostsFor(ROUTE, sessionId) : [];
  const laps = ROUTE !== null ? lapValues(ROUTE, sessionId) : [];
  // Slot-in arming: true only the first time THIS finished ride's board is
  // rendered; the effect below marks it seen after that first render.
  const justFinished = ride !== null && !ANIMATED_RIDES.has(ride.atMs);
  useEffect(() => {
    if (ride !== null) ANIMATED_RIDES.add(ride.atMs);
  }, [ride?.atMs]);

  if (ROUTE === null || ghosts.length === 0) {
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

  // B-57: gate colours for the "view trace" browse map — mirrors
  // RecordScreen's gateColours memo, but keyed off the finished ride's OWN
  // sectors (there is no live engine on this screen). Only a clean sector
  // with a real moving time earns a colour; index 0 (START) never does.
  const resultGateColours: (string | null)[] = ride
    ? [
      null,
      ...[...ride.sectors].sort((a, b) => a.index - b.index).map((sec) =>
        sec.quality === 'clean' && sec.movingS !== null
          ? chipColors(
            tierFor(sec.movingS, sectorValues(ROUTE, sec.index, sessionId).filter((v) => v !== sec.movingS)),
            t,
          ).text
          : null),
    ]
    : [];

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

      {ride !== null ? (
        <>
          <Pressable style={st.traceLink} onPress={() => setTraceOpen((v) => !v)}>
            <Text style={[st.traceLinkText, { color: t.textDim }]}>
              {traceOpen ? '‹ HIDE TRACE' : 'VIEW TRACE ›'}
            </Text>
          </Pressable>
          {traceOpen ? (
            // Shows the ROUTE on real streets with today's gate colours; the
            // true ridden trace needs a JSONL reader (future work, D-023).
            <RouteMapView variant="browse" routeId={ride.routeId} lat={null} lon={null}
              zoom={1} height={300} showRider={false} gateColours={resultGateColours} />
          ) : null}
        </>
      ) : null}

      {s.tower && ranked ? (
        <>
          <Text style={[st.h2, { color: t.textDim }]}>TIMING TOWER — LAST {others.length} RIDES</Text>
          {/* B-28 wired: the real tower (anatomy + slot-in) fed by the pure
              builder — one render path with the Preview demo (LAYOUT §3.8). */}
          <TimingTower
            model={buildTowerModel(
              // No real ride: the newest ghost stands in as "today" (see above),
              // so it must leave the past-row window — same exclusion `others`
              // makes — or the tower would show the stand-in twice.
              ride ? ghosts : ghosts.slice(0, -1),
              mine, ride?.estimated ?? false, ride?.atMs ?? Date.now(), allTimeBestLapS(ROUTE),
            )}
            justFinished={justFinished}
          />
          <Text style={{ color: t.textDim, fontSize: 11.5, paddingVertical: 9 }}>
            The tower does not change with the colour model, by design: position is a fact,
            colour is a judgement (D-013).
          </Text>
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
          ? `"TODAY" is the ride you just finished on ${routeLabel(ROUTE)}.`
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
  traceLink: { alignSelf: 'center', marginVertical: 6, paddingVertical: 6, paddingHorizontal: 10 },
  traceLinkText: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
});
