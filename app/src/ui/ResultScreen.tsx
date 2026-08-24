/**
 * RESULT — last ride + personal bests (cycle 024, WP-A3 redesign of the
 * mockup's resultScreen()/resultDetail(), cycle 022). Was "just a fixed
 * result… not appealing nor useful" (Nathan) built around one hardcoded
 * FALLBACK_ROUTE ghost stand-in; now it is "Your last ride" (survives a
 * restart via getLastRideOrStored — beta finding #1 closed) plus a Personal
 * Bests accordion per route, driven entirely by whatever routes actually have
 * history (WP-D3 killed the last hardcoded route list).
 *
 * Honesty (unchanged): position is a fact and is never coloured (D-013); a
 * lap only ranks with MIN_HISTORY comparable rides and an estimated lap never
 * ranks at all (D-025/D-028). No raw B-NN/D-NN id or rideId reaches the
 * screen — decision ids stay in code comments only.
 *
 * Cycle 023 note (re-baselined before this brief started, per its own
 * instruction): cycle 023 shipped GPX+ diagnostics fixes (engine.ts,
 * location/index.ts, routeMapView.tsx, storage/gpxPlusExport.ts) — it did NOT
 * touch this file or settings.tsx, and no raw-vs-paused-time line exists in
 * either as of this brief. The brief's "HIGH conflict" flag anticipated a
 * paused-time toggle that never actually landed; nothing to carry forward.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import seedResultsJson from '../store/results.seed.json';
import { storedResults } from '../store/resultsStore.ts';
import type { RideResult } from '../store/types.ts';
import { TRACK_IDS } from '../live/refs.ts';
import { MIN_HISTORY, allTimeBestLapS, fmt, ghostsFor, lapValues, positionAmong, sectorValues,
  tierFor, type UiTier } from './colourModel.ts';
import { chipColors } from './chips.tsx';
import { getLastRideOrStored, type FinishedRide } from './lastRide.ts';
import { lastFreeRide } from '../store/freeRides.ts';
import { buildPbDetail, buildPbRows, dateTimeLabel, lapCellLabel, routeLabel } from './rideHistoryModel.ts';
import RouteMapView from './routeMapView.tsx';
import { useTabNav } from './tabNav.tsx';
import { useSettings } from './settings.tsx';
import { PaddockTheme, colors, radius } from './theme.ts';
import { useTheme } from './themeContext.tsx';

const SEED_RESULTS = seedResultsJson as unknown as RideResult[];

function tierColour(tier: UiTier, t: PaddockTheme): string {
  switch (tier) {
    case 'purple': return colors.purple;
    case 'green': return colors.green;
    case 'yellow': return colors.neutral;
    case 'neutral': return t.accentText;
    default: return t.textDim;
  }
}

/** The rank line under the big lap figure — D-028's "an estimated lap never
 * ranks" and D-008's MIN_HISTORY floor, both stated in plain words. */
function rankLineFor(ride: FinishedRide, hist: number[]): string {
  if (ride.lapMovingS !== null) {
    if (hist.length >= MIN_HISTORY) {
      const { pos, of } = positionAmong(ride.lapMovingS, hist);
      return `P${pos} of ${of} on this route`;
    }
    return `${hist.length} rides of history — too few to rank`;
  }
  // Fix 2026-08-24 (WP-A3 review): the old 'ended early' copy here was wrong
  // for a lap that reached START and FINISH but lost a middle gate (quality
  // 'missed', ride.estimated false, lapMovingS null, lapRawS a real elapsed
  // time) — the rider did not end early. Mirrors the 'estimated' line's own
  // "never ranks" phrasing rather than inventing a new tone.
  return ride.estimated
    ? 'no time — an estimated lap never ranks'
    : 'no lap — a missed gate never ranks';
}

/** Every routeId with any recorded history at all (seed archive + the
 * persistent per-ride store), ordered by the catalog's own order (TRACK_IDS —
 * every ratified route since WP-D1) with anything outside that list appended
 * last. buildPbRows below drops whatever turns out to have zero RANKABLE
 * rides (ghostsFor's own ranks() filter), same as the mockup's routesAvail. */
function routeIdsInHistory(): string[] {
  const present = new Set<string>();
  for (const r of SEED_RESULTS) if (r.routeId !== null) present.add(r.routeId);
  for (const r of storedResults()) if (r.routeId !== null) present.add(r.routeId);
  const ordered: string[] = [];
  for (const id of TRACK_IDS) {
    if (present.has(id)) {
      ordered.push(id);
      present.delete(id);
    }
  }
  return [...ordered, ...present];
}

function PbDetail(props: { routeId: string; lastRideId: string | null; showRanking: boolean; t: PaddockTheme }) {
  const { routeId, lastRideId, showRanking, t } = props;
  const detail = buildPbDetail(ghostsFor(routeId), lastRideId);
  return (
    <View style={st.pbDetail}>
      {detail.ranking.length > 0 ? (
        <>
          <Text style={[st.hint, { color: t.textDim }]}>last {detail.ranking.length} on this route</Text>
          {showRanking
            ? detail.ranking.map((row) => (
              <View key={row.posLabel} style={st.pbRow}>
                <Text style={[st.pbPos, { color: t.text }]}>{row.posLabel}</Text>
                <Text style={{ flex: 1, color: row.today ? t.accentText : t.textDim, fontSize: 13 }}>
                  {row.dateLabel}
                </Text>
                <Text style={[st.pbNum, { color: t.text }]}>{row.timeLabel}</Text>
                <Text style={[st.pbNum, { color: t.textDim }]}>{row.gapLabel}</Text>
              </View>
            ))
            : null}
        </>
      ) : (
        <Text style={[st.hint, { color: t.textDim }]}>no rides on file yet</Text>
      )}
      {detail.pbSectors.length > 0 ? (
        <>
          <Text style={[st.hint, { color: t.textDim, marginTop: 10 }]}>personal best sectors</Text>
          {detail.pbSectors.map((sec) => (
            <View key={sec.label} style={st.pbRow}>
              <Text style={[st.pbPos, { color: t.text }]}>{sec.label}</Text>
              <Text style={[st.pbNum, { color: t.text }]}>{sec.timeLabel}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

export default function ResultScreen() {
  const { t } = useTheme();
  const { s } = useSettings();
  const tabNav = useTabNav();
  const [traceOpen, setTraceOpen] = useState(false);

  // WP-B: a free ride shows its OWN board instead of the route board whenever
  // it is the more recent of the two — free-ride sector times are raw,
  // uncoloured, unranked, and structurally isolated (store/freeRides.ts is
  // the only reader/writer): nothing here reaches into ghostsFor/the tower
  // for them (D-025 mode-consistency).
  const free = lastFreeRide();
  const ride = getLastRideOrStored();
  const showFreeBoard = free !== null && (ride === null || free.startedAtMs > ride.atMs);
  const rideLaps = ride ? lapValues(ride.routeId, ride.rideId) : [];
  const lapTier: UiTier = ride ? tierFor(ride.lapMovingS, rideLaps) : 'neutral';
  // Fix 2026-08-24 (WP-A3 review, D-025): follows the SAME rule RIDES already
  // uses (rideHistoryModel.ts's lapCellLabel, shared verbatim) so a
  // 'missed'-quality lap (movingS null, not estimated) reads as "no lap" here
  // too, instead of falling through to a bare, unearned-looking `rawS`.
  const lapLabel = ride ? lapCellLabel(ride.lapMovingS, ride.estimated, ride.lapRawS) : '–';
  const rankLine = ride ? rankLineFor(ride, rideLaps) : '';

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
            tierFor(sec.movingS, sectorValues(ride.routeId, sec.index, ride.rideId).filter((v) => v !== sec.movingS)),
            t,
          ).text
          : null),
    ]
    : [];

  const pbRows = buildPbRows(routeIdsInHistory(), allTimeBestLapS, (r) => ghostsFor(r).length);
  const [openRoute, setOpenRoute] = useState<string | null>(() => {
    if (ride && pbRows.some((r) => r.routeId === ride.routeId)) return ride.routeId;
    return pbRows[0]?.routeId ?? null;
  });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>{showFreeBoard ? 'FREE RIDE' : 'YOUR LAST RIDE'}</Text>
      {showFreeBoard && free ? (
        // WP-B: no tower, no ranks, no colours — a free ride has no
        // comparable history by construction (D-013/D-025).
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
          <Text style={{ color: t.textDim }}>{dateTimeLabel(free.startedAtMs)}</Text>
          <Text style={{ color: t.textDim, fontSize: 12.5, marginTop: 4 }}>
            {free.crossings.length} gates crossed
          </Text>
          {free.sectors.length > 0 ? (
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              {free.sectors.map((sec, i) => (
                <Text key={i} style={[st.freeSectorRow, { color: t.text }]}>
                  {routeLabel(sec.routeId)} S{sec.index} — {fmt(sec.rawS, 1)} raw
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 10, textAlign: 'center' }}>
            Free-ride sector times live in their own category — they never mix into a route&apos;s
            history, so your route comparisons stay clean.
          </Text>
          <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.go('record')}>
            <Text style={[st.slimBtnText, { color: t.onAccent }]}>RECORD ANOTHER</Text>
          </Pressable>
        </View>
      ) : ride === null ? (
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={{ color: t.textDim }}>Record a ride to see it here.</Text>
        </View>
      ) : (
        <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder, alignItems: 'center' }]}>
          <Text style={{ color: t.textDim }}>{routeLabel(ride.routeId)}</Text>
          <Text style={[st.big, { color: tierColour(lapTier, t) }]}>{lapLabel}</Text>
          <Text style={{ color: t.textDim, fontSize: 12.5 }}>{rankLine}</Text>

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

          <Pressable style={[st.slimBtn, { backgroundColor: t.accent }]} onPress={() => tabNav.go('record')}>
            <Text style={[st.slimBtnText, { color: t.onAccent }]}>RECORD ANOTHER</Text>
          </Pressable>
        </View>
      )}

      <Text style={[st.h2, { color: t.textDim }]}>PERSONAL BESTS — TAP A ROUTE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {pbRows.length === 0 ? (
          <Text style={{ color: t.textDim }}>No route history on file yet.</Text>
        ) : (
          pbRows.map((row) => {
            const open = openRoute === row.routeId;
            return (
              <View key={row.routeId} style={[st.pbHeadWrap, { borderBottomColor: t.cardBorder }]}>
                <Pressable
                  style={st.pbHead}
                  onPress={() => setOpenRoute(open ? null : row.routeId)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>{row.routeName}</Text>
                    <Text style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
                      personal best {row.pbLabel} · {row.nOnFile} rides on file
                    </Text>
                  </View>
                  <Text style={{ color: t.textDim, fontSize: 16 }}>{open ? '▾' : '›'}</Text>
                </Pressable>
                {open ? (
                  <PbDetail routeId={row.routeId} lastRideId={ride?.rideId ?? null} showRanking={s.tower} t={t} />
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 12 }}>
        Position is a fact; colour is a judgement — a mid-pack ride is never dressed as failure.
        Purple beats your best, green beats your recent average, yellow is an ordinary lap.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13, paddingVertical: 4 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  traceLink: { alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10 },
  traceLinkText: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  slimBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.btn,
  },
  slimBtnText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1 },
  // WP-B: plain ink throughout — no tier colour (D-013: a free ride has no
  // comparable history by construction).
  freeSectorRow: { fontSize: 14, fontVariant: ['tabular-nums'], textAlign: 'center', paddingVertical: 2 },
  pbHeadWrap: { borderBottomWidth: 1, paddingVertical: 4 },
  pbHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pbDetail: { paddingBottom: 10 },
  hint: { fontSize: 11.5, marginBottom: 2 },
  pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  pbPos: { width: 40, fontSize: 13, fontWeight: '700' },
  pbNum: { fontVariant: ['tabular-nums'], textAlign: 'right', width: 66, fontSize: 13 },
});
