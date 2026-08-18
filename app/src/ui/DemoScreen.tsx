/**
 * Demo tab, simplified to ONE thing (Nathan, 2026-08-16): an accelerated demo
 * ride. Its whole purpose is to exercise the things a real ride only shows you
 * once a day — the buzz at each gate, the tier colours, the live map and its
 * gate markers — without waiting for a commute.
 *
 * It drives the SAME pane as the Record screen (§17's shared-render-path rule):
 * a scripted ride replayed at 25x through `LiveSectorPane` and `RouteMapView`.
 * Nothing here writes to storage and nothing here is a ride — the Rides tab and
 * the Result tab never see it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import manifest from '../../assets/routes/routes.json';
import { chipColors, type Tier } from './chips';
import { ghostsFor, sectorValues, tierFor } from './colourModel';
import { LiveSectorPane, type LiveViewModel } from './liveView';
import RouteMapView from './routeMapView';
import { positionAtTime, type RouteAsset } from './routeMapMath';
import { useSettings } from './settings';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

const ROUTE = 'Morning';
const RATE = 25;              // a ~14-minute commute plays in ~34 s
const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so RATE is exact

const ASSET = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes[ROUTE];

export default function DemoScreen() {
  const { t } = useTheme();
  const { s: settings } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [running, setRunning] = useState(false);
  const [clockS, setClockS] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The scripted ride: the most recent archived Morning lap, sector by sector.
  const script = useMemo(() => {
    const g = ghostsFor(ROUTE);
    const ride = g[g.length - 1];
    const secs = ride ? ride.sectors.map((x) => x.movingS ?? x.rawS) : [185, 207, 237, 207];
    const gateAt: number[] = [0];
    secs.reduce((acc, v) => { gateAt.push(acc + v); return acc + v; }, 0);
    return { secs, gateAt, lap: secs.reduce((a, b) => a + b, 0) };
  }, []);

  const gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length;

  // One buzz per gate, exactly as on the bike (D-019) — the point of the demo.
  const prevGates = useRef(0);
  useEffect(() => {
    if (gatesDone !== prevGates.current) {
      if (running && settings.earcons && gatesDone > prevGates.current) Vibration.vibrate(60);
      prevGates.current = gatesDone;
    }
  }, [gatesDone, running, settings.earcons]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    prevGates.current = 0;
    setClockS(0);
    setRunning(true);
    // Simulated seconds = real elapsed × RATE, read off the wall clock each
    // tick — the tick only sets how OFTEN the dot redraws, never how fast
    // simulated time advances (setInterval drift cannot slow the ride).
    const startedAtMs = Date.now();
    timer.current = setInterval(() => {
      const next = ((Date.now() - startedAtMs) / 1000) * RATE;
      if (next >= script.lap) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
        setClockS(script.lap);
        return;
      }
      setClockS(next);
    }, TICK_MS);
  };

  const tierOf = (i: number, v: number | null): Tier =>
    tierFor(v, sectorValues(ROUTE, i)) as Tier;

  // View model built by hand — the demo has no engine, but it feeds the very
  // same pane, so what you see here is what the Record screen would draw.
  const vm: LiveViewModel = {
    // frozen timebase whose anchor IS the demo clock: re-rendered each tick
    clock: { anchorRealMs: Date.now(), anchorClockMs: clockS * 1000, rate: 1, running: false },
    contextLabel: gatesDone < 4 ? `S${gatesDone + 1}` : '',
    flash: null,
    flashKey: 0,
    lap: gatesDone >= 4
      ? { tier: tierOf(0, script.lap), time: fmtMS(script.lap), delta: '' }
      : null,
    posChip: null,
    strip: script.secs.map((v, i) => ({
      tier: i < gatesDone ? tierOf(i + 1, v) : ('none' as Tier),
      label: `S${i + 1}`,
      time: i < gatesDone ? fmtMS(v) : undefined,
      current: i === gatesDone,
    })),
  };

  const gateColours: (string | null)[] = [
    running || gatesDone > 0 ? chipColors('neutral', t).text : null,
    ...script.secs.map((v, i) =>
      i < gatesDone ? chipColors(tierOf(i + 1, v), t).text : null),
  ];

  // dot position: along the REAL ridden line (cycle 009)
  const pos = positionAtTime(ASSET, script.gateAt, clockS);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h2}>DEMO RIDE</Text>
      <Text style={styles.sub}>
        A real archived Morning lap replayed at {RATE}x. Buzz at every gate, tier colours as they
        are earned, the live map moving. Nothing is recorded.
      </Text>

      {settings.liveMap ? (
        <View style={{ marginTop: 12 }}>
          {/* browse = pannable/zoomable preview with the zoom bar (Nathan
              2026-08-18); the rider dot still rides the real line. */}
          <RouteMapView routeId={ROUTE} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
            zoom={4} gateColours={gateColours} variant="browse" />
        </View>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <LiveSectorPane vm={vm} showLap />
      </View>

      <Pressable style={[styles.btn, running && { opacity: 0.5 }]} onPress={start} disabled={running}>
        <Text style={styles.btnText}>{running ? 'RUNNING…' : 'RUN DEMO RIDE'}</Text>
      </Pressable>

      <Text style={styles.note}>
        Sounds are not wired yet — gates buzz only. When the tier tones land they play here first.
      </Text>
    </ScrollView>
  );
}

function fmtMS(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  h2: { color: t.textDim, fontSize: 12, letterSpacing: 2 },
  sub: { color: t.textDim, fontSize: 12.5, marginTop: 6 },
  btn: {
    marginTop: 16, alignSelf: 'stretch', borderRadius: radius.btn, paddingVertical: 14,
    backgroundColor: t.accent, alignItems: 'center',
  },
  btnText: { color: t.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  note: { color: t.textDim, fontSize: 11.5, marginTop: 14 },
});
