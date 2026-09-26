/**
 * Post-ride REPLAY — virgin-cycle14 brief 02 (testuser LBH #2). Wiring only;
 * all logic lives in the pure `replayModel.ts`. Looks like the DEMO tab's
 * SECOND/TENTH RIDE run: live-variant map, the rider's dot on its own
 * recorded fixes, prior rides racing as self dots, the shared
 * LiveSectorPane, a status line, and PAUSE/PLAY, RESTART, a speed pill
 * (5x / 10x / 25x), BACK. Mounted by RideDetailScreen.tsx in place of its
 * scroll view while `replaying`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './themeContext.tsx';
import { useSettings } from './settings.tsx';
import { colors, radius, type PaddockTheme } from './theme.ts';
import WayMapView from './wayMapView.tsx';
import { LiveSectorPane } from './liveView.tsx';
import type { RideDetailModel } from './rideDetailModel.ts';
import { ALL_YELLOW } from './sectorTrailModel.ts';
import { currentCatalog } from '../store/catalogStore.ts';
import { gateSetFor } from '../store/catalog.ts';
import { wayLabelIn } from '../store/defaultWay.ts';
import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';
import { priorWindowFor } from './colourModel.ts';
import {
  loadSelfTracksFor, selfDotsAt, selfLivePosition, type SelfTrack,
} from './selfRaceModel.ts';
import {
  loadReplayRider, replayClockS, replayEndS, replayGatesDone, replayLiveViewModel,
  replaySectorColours, replayTimebase, riderPositionAt, type ReplayAnchor, type ReplayRider,
  REPLAY_RATE_DEFAULT, REPLAY_RATES, REPLAY_TICK_MS,
} from './replayModel.ts';

export default function ReplayScreen(props: {
  rideId: string; wayId: string; startedAtMs: number; detail: RideDetailModel; onClose: () => void;
}) {
  const { rideId, wayId, startedAtMs, detail, onClose } = props;
  const { t } = useTheme();
  const { s: settings } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [rider, setRider] = useState<ReplayRider | null | 'loading'>('loading');
  const [selfTracks, setSelfTracks] = useState<SelfTrack[]>([]);
  const [anchor, setAnchor] = useState<ReplayAnchor>({
    clockS: 0, realMs: Date.now(), rate: REPLAY_RATE_DEFAULT, playing: false,
  });
  const [clockS, setClockS] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the ride's replay rider + the as-ridden selfs window. Anchor mismatch
  // (stop-on-ambiguity note): the brief's spec deps this effect on
  // `settings.timing`, but `Settings` (settings.tsx) no longer has a `timing`
  // field — it was retired by concurrent cycle14 work ("Luck factor" row,
  // settings.tsx:102). Omitted from the deps below; nothing else in this
  // effect reads timing mode.
  useEffect(() => {
    let cancelled = false;
    const fs = createExpoFsAdapter();
    const gsv = gateSetFor(currentCatalog(), wayId)?.version ?? 1;
    Promise.all([
      loadReplayRider(rideId, wayId, fs),
      settings.selfDots
        ? loadSelfTracksFor(wayId, gsv, fs, priorWindowFor(wayId, rideId, startedAtMs))
        : Promise.resolve([]),
    ]).then(([r, tracks]) => {
      if (cancelled) return;
      setRider(r);
      setSelfTracks(tracks);
      if (r !== null) {
        setClockS(0);
        setAnchor((a) => ({ clockS: 0, realMs: Date.now(), rate: a.rate, playing: true }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, wayId, startedAtMs]);

  // Tick — advances the replay clock at REPLAY_TICK_MS while playing.
  useEffect(() => {
    if (!anchor.playing || rider === null || rider === 'loading') return;
    const endS = replayEndS(rider);
    const id = setInterval(() => {
      const next = replayClockS(anchor, Date.now());
      if (next >= endS) {
        setClockS(endS);
        setAnchor({ clockS: endS, realMs: Date.now(), rate: anchor.rate, playing: false });
      } else {
        setClockS(next);
      }
    }, REPLAY_TICK_MS);
    timer.current = id;
    return () => {
      clearInterval(id);
      timer.current = null;
    };
  }, [anchor, rider]);

  // Hardware back — registered after Shell's (App.tsx only re-registers on
  // tab/overlay change, neither of which happens during a replay), same
  // reliance as DemoScreen.tsx.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const ready = rider !== null && rider !== 'loading';

  const pos = useMemo(
    () => (ready ? riderPositionAt(rider as ReplayRider, clockS) : null),
    [ready, rider, clockS],
  );
  const elapsedMs = clockS * 1000;
  const selfDots = useMemo(() => selfDotsAt(selfTracks, elapsedMs), [selfTracks, elapsedMs]);
  const gatesDone = useMemo(
    () => (ready ? replayGatesDone(rider as ReplayRider, clockS) : 0),
    [ready, rider, clockS],
  );
  const sectorCount = ready
    ? (detail.sectorRows.length > 0 ? detail.sectorRows.length : (rider as ReplayRider).gateMs.length - 1)
    : 0;
  const livePos = useMemo(() => {
    if (!settings.selfDots || pos === null || gatesDone >= sectorCount) return null;
    const p = selfLivePosition(selfDots, pos.sM);
    return p === null ? null : `P${p}`;
  }, [settings.selfDots, selfDots, pos, gatesDone, sectorCount]);

  const vm = useMemo(
    () => (ready
      ? replayLiveViewModel(
        rider as ReplayRider, detail.sectorRows, detail.lapLabel, clockS,
        replayTimebase(anchor), livePos,
      )
      : null),
    [ready, rider, detail.sectorRows, detail.lapLabel, clockS, anchor, livePos],
  );

  const sectorColours = ready && settings.sectorColours
    ? replaySectorColours(detail.sectorColours, gatesDone)
    : ALL_YELLOW;

  const endS = ready ? replayEndS(rider as ReplayRider) : 0;
  const isOver = clockS >= endS;

  function togglePlay() {
    const now = Date.now();
    if (anchor.playing) {
      setAnchor({ clockS, realMs: now, rate: anchor.rate, playing: false });
    } else if (isOver) {
      setClockS(0);
      setAnchor({ clockS: 0, realMs: now, rate: anchor.rate, playing: true });
    } else {
      setAnchor({ clockS, realMs: now, rate: anchor.rate, playing: true });
    }
  }

  function restart() {
    const now = Date.now();
    setClockS(0);
    setAnchor({ clockS: 0, realMs: now, rate: anchor.rate, playing: true });
  }

  function setRate(r: number) {
    setAnchor({ clockS, realMs: Date.now(), rate: r, playing: anchor.playing });
  }

  if (rider === 'loading') {
    return (
      <View style={styles.raceColumn}>
        <Text style={styles.trackLine}>loading replay…</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
      </View>
    );
  }

  if (rider === null) {
    return (
      <View style={styles.raceColumn}>
        <Text style={styles.trackLine}>no replay — this ride never crossed START on this way</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
      </View>
    );
  }

  const statusLine = isOver
    ? `replay over · ${detail.rankLine || detail.lapLabel}`
    : `replay · ${anchor.rate}x · ${wayLabelIn(currentCatalog(), wayId)}`;

  return (
    <View style={styles.raceColumn}>
      {settings.liveMap ? (
        <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch' }}>
          <WayMapView
            key={`replay-${rideId}`}
            wayId={wayId}
            lat={pos ? pos.lat : null}
            lon={pos ? pos.lon : null}
            zoom={4}
            sectorColours={sectorColours}
            leadColour={settings.sectorColours ? colors.grey : undefined}
            selfs={settings.selfDots ? selfDots : undefined}
            variant="live"
            liveState={anchor.playing ? 'moving' : 'finished'}
            fill
          />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {vm ? <LiveSectorPane vm={vm} showLap /> : null}

      <Text style={styles.trackLine}>{statusLine}</Text>

      <View style={styles.pillRow}>
        {REPLAY_RATES.map((r) => (
          <Pressable
            key={r}
            style={[styles.pill, r === anchor.rate ? styles.pillSelected : styles.pillOutline]}
            onPress={() => setRate(r)}
          >
            <Text style={r === anchor.rate ? styles.pillTextSelected : styles.pillText}>{r}x</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.stopSlim} onPress={togglePlay}>
        <Text style={styles.stopSlimText}>
          {anchor.playing ? 'PAUSE' : isOver ? 'REPLAY AGAIN' : 'PLAY'}
        </Text>
      </Pressable>
      <Pressable style={styles.stopSlim} onPress={restart}>
        <Text style={styles.stopSlimText}>RESTART</Text>
      </Pressable>
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  raceColumn: {
    flex: 1, alignSelf: 'stretch', backgroundColor: t.race.bg,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, gap: 8,
  },
  trackLine: {
    color: t.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 10,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: {
    flex: 1, borderRadius: radius.btn, paddingVertical: 10, borderWidth: 2, alignItems: 'center',
  },
  pillSelected: { backgroundColor: t.accent, borderColor: t.accent },
  pillOutline: { backgroundColor: 'transparent', borderColor: t.race.border },
  pillText: { color: t.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  pillTextSelected: { color: t.onAccent, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  stopSlim: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: t.race.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4, flexShrink: 1 },
  backText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 4 },
});
