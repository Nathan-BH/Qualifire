/**
 * Post-ride REPLAY — virgin-cycle14 brief 02 (testuser LBH #2). Wiring only;
 * all logic lives in the pure `replayModel.ts`. Looks like the DEMO tab's
 * SECOND/TENTH RIDE run: live-variant map, the rider's dot on its own
 * recorded fixes, its own trace drawn thin beneath the way line (cycle15 07), prior rides racing as self dots, the shared
 * LiveSectorPane, a status line, and one control row: speed dial, scrub
 * bar, play/pause (long-press = restart). Mounted by RideDetailScreen.tsx
 * in place of its scroll view while `replaying`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './themeContext.tsx';
import { useSettings } from './settings.tsx';
import { colors, radius, type PaddockTheme } from './theme.ts';
import WayMapView from './wayMapView.tsx';
import { LiveSectorPane } from './liveView.tsx';
import { PlayIcon, PauseIcon } from './replayIcons.tsx';
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
  clampClockS, loadReplayRider, nextReplayRate, replayClockS, replayEndS, replayGatesDone,
  replayLiveViewModel, replaySectorColours, replayTimebase, riderPositionAt, scrubDeltaS,
  type ReplayAnchor, type ReplayRider,
  REPLAY_RATE_DEFAULT, REPLAY_TICK_MS,
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
        replayTimebase(anchor), livePos, detail.lapTier,
      )
      : null),
    [ready, rider, detail.sectorRows, detail.lapLabel, clockS, anchor, livePos, detail.lapTier],
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

  function cycleRate() {
    setRate(nextReplayRate(anchor.rate));
  }

  // Scrub bar — a relative jog, not an absolute seek (brief 08 decision 4).
  // Reads anchor/endS/setClockS/setAnchor through a ref so the PanResponder,
  // created once, always sees the latest render's values/closures.
  const scrubRef = useRef({ anchor, endS, setClockS, setAnchor });
  scrubRef.current = { anchor, endS, setClockS, setAnchor };
  const startS = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const p = scrubRef.current;
        const now = replayClockS(p.anchor, Date.now());
        startS.current = now;
        p.setClockS(now);
        p.setAnchor({ clockS: now, realMs: Date.now(), rate: p.anchor.rate, playing: false });
      },
      onPanResponderMove: (_e, gs) => {
        const p = scrubRef.current;
        const next = clampClockS(startS.current + scrubDeltaS(gs.dx, p.anchor.rate), p.endS);
        p.setClockS(next);
        p.setAnchor({ clockS: next, realMs: Date.now(), rate: p.anchor.rate, playing: false });
      },
    }),
  ).current;

  if (rider === 'loading') {
    return (
      <View style={styles.raceColumn}>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
      </View>
    );
  }

  if (rider === null) {
    return (
      <View style={styles.raceColumn}>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={[styles.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
      </View>
    );
  }

  const statusLine = isOver
    ? `replay over · ${detail.rankLine || detail.lapLabel}`
    : `replay · ${anchor.rate}x · ${wayLabelIn(currentCatalog(), wayId)}`;

  const progressPct = endS > 0 ? 100 * Math.min(Math.max(clockS / endS, 0), 1) : 0;
  const scrubEnabled = !!vm && endS > 0;

  return (
    <View style={styles.raceColumn}>
      {/* virgin-cycle27 06 (Nathan 2026-10-08): the map runs edge to edge like the ACTIVITIES cards — bleed frame, parent inset cancelled on the map only. */}
      <View style={{ flex: 1, minHeight: 220, alignSelf: 'stretch', marginHorizontal: -12 }}>
        <WayMapView
          bleed
          key={`replay-${rideId}`}
          wayId={wayId}
          lat={pos ? pos.lat : null}
          lon={pos ? pos.lon : null}
          zoom={4}
          sectorColours={sectorColours}
          leadColour={settings.sectorColours ? colors.grey : undefined}
          selfs={settings.selfDots ? selfDots : undefined}
          progressM={pos ? pos.sM : null}
          rideTrace={rider.fixes}
          variant="live"
          liveState={anchor.playing ? 'moving' : 'finished'}
          fill
        />
      </View>

      {vm ? <LiveSectorPane vm={vm} clockSize={56} /> : null}

      <Text style={styles.trackLine}>{statusLine}</Text>

      <View style={styles.ctlRow}>
        <Pressable style={styles.dial} hitSlop={8} onPress={cycleRate} accessibilityLabel="replay speed">
          <Text style={styles.dialText}>{anchor.rate}×</Text>
        </Pressable>
        <View style={styles.scrubWrap} {...(scrubEnabled ? pan.panHandlers : {})}>
          <View style={styles.scrubTrack}>
            <View style={[styles.scrubFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={[styles.scrubKnob, { left: `${progressPct}%` }]} />
        </View>
        <Pressable
          style={styles.ctlBtn}
          hitSlop={8}
          onPress={togglePlay}
          onLongPress={restart}
          accessibilityLabel={anchor.playing ? 'pause' : 'play'}
        >
          {anchor.playing ? <PauseIcon color={t.text} /> : <PlayIcon color={t.text} />}
        </Pressable>
      </View>
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
  },
  ctlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: t.accent,
    backgroundColor: t.race.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: { color: t.accent, fontSize: 15, fontWeight: '800' },
  scrubWrap: { flex: 1, height: 44, justifyContent: 'center' },
  scrubTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: t.race.card },
  scrubFill: { height: '100%', backgroundColor: t.accent },
  scrubKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: t.accent,
    marginLeft: -8,
  },
  ctlBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: t.race.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 4 },
});
