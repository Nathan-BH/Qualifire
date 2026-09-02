/**
 * Demo tab (WP-O, 2026-09-02): TWO scripted demo modes, so Nathan can see
 * from the couch the two things a real commute only shows once a day.
 *
 * - SECOND RIDE (default): the full reference line + neutral gate ticks are
 *   there from the start; as the dot passes each gate, the sector segment
 *   just completed paints its earned tier colour. Gate ticks never change
 *   colour (Nathan's 2026-09-01 ruling) — the map is given only the earned
 *   SECTOR span colours; the gate-tick colouring prop is never built here.
 * - FIRST RIDE: basemap + moving dot + a yellow trail growing behind it, no
 *   route, no gates, no sector strip — exactly what a stranger's very first
 *   ride looks like. Needs a non-null, no-manifest-entry route id
 *   (`DEMO_FIRST_RIDE_ID`) so `RouteMapView` takes WP-D's rider-only path
 *   instead of falling back to a real bundled route (an id of `null` would
 *   resolve via `defaultRouteId()` — wrong for this mode).
 *
 * Both modes drive the SAME pane as the Record screen (§17's
 * shared-render-path rule): a scripted ride replayed at 25x. Nothing here
 * writes to storage and nothing here is a ride — the Rides tab and the
 * Result tab never see it.
 *
 * Why the demo owns its own tier history: on a virgin build the archive ghost
 * set is always empty (B-39), so `tierFor`'s D-008 floor is never cleared and
 * every sector would render 'neutral'. `demoModel.ts` is self-contained — its
 * own pinned `DEMO_HISTORY`/`DEMO_SECS`, no archive lookups of any kind — so
 * the demo shows real tier colours on every build, virgin included.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import manifest from '../../assets/routes/routes.json';
import { tierLineColour, type Tier } from './chips';
import { buildDemoScript, demoSectorColours, demoTier, type DemoMode } from './demoModel.ts';
import { LiveSectorPane, type LiveViewModel } from './liveView';
import RouteMapView from './routeMapView';
import { positionAtTime, type RouteAsset } from './routeMapMath';
import { useSettings } from './settings';
import { colors, PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';
import { routeLabel } from '../store/defaultRoute';

// Intentional literal (B-39): a scripted replay of an archived Morning lap by design, not a hardcode bug.
const ROUTE = 'Morning';
const RATE = 25;              // a ~14-minute commute plays in ~34 s
const TICK_MS = 33;           // ~30 fps redraw; sim time is wall-clock anchored so RATE is exact

// FIRST RIDE mode: a deliberately non-null id with NO manifest entry, so
// RouteMapView's `asset` lookup misses and WP-D's rider-only path (basemap +
// dot, no route layers) renders. Do not use `null` — that falls back to
// `defaultRouteId()`, which draws a real bundled route (§2.2/§3.4).
const DEMO_FIRST_RIDE_ID = 'demo:first-ride';
const FIRST_RIDE_STATUS = 'writing history · no known route here';

const ASSET = (manifest as unknown as { routes: Record<string, RouteAsset> }).routes[ROUTE];

export default function DemoScreen() {
  const { t } = useTheme();
  const { s: settings } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [mode, setMode] = useState<DemoMode>('second');
  const [running, setRunning] = useState(false);
  const [clockS, setClockS] = useState(0);
  const [trail, setTrail] = useState<readonly TrailPoint[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The scripted ride: today's fixed lap (demoModel.ts's pinned fixture).
  const script = useMemo(() => buildDemoScript(), []);

  const gatesDone = script.gateAt.filter((g, i) => i > 0 && clockS >= g).length;

  // One buzz per gate, exactly as on the bike (D-019) — SECOND RIDE only.
  // A first ride has no gates to cross, so there is nothing to buzz for.
  const prevGates = useRef(0);
  useEffect(() => {
    if (gatesDone !== prevGates.current) {
      if (mode === 'second' && running && settings.earcons && gatesDone > prevGates.current) {
        Vibration.vibrate(60);
      }
      prevGates.current = gatesDone;
    }
  }, [gatesDone, running, settings.earcons, mode]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // dot position: along the REAL ridden line (cycle 009) — same geometry for
  // both modes. FIRST RIDE hides the route, not the road: a first ride still
  // happens on a real road, the app just doesn't know it yet.
  const pos = positionAtTime(ASSET, script.gateAt, clockS);

  // FIRST RIDE only: grow the trail behind the dot as the clock advances.
  useEffect(() => {
    if (mode !== 'first' || !pos) return;
    setTrail((prev) => appendTrailPoint(prev, pos.lat, pos.lon));
  }, [clockS, mode, pos]);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    prevGates.current = 0;
    setClockS(0);
    setTrail([]);
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

  // Switching mode stops any run in progress and resets every piece of
  // scripted state — the two modes never share a run.
  const switchMode = (m: DemoMode) => {
    if (m === mode) return;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setRunning(false);
    setClockS(0);
    prevGates.current = 0;
    setTrail([]);
    setMode(m);
  };

  const tierOf = (i: number, v: number | null): Tier => demoTier(i, v) as Tier;

  // View model built by hand — the demo has no engine, but it feeds the very
  // same pane, so what you see here is what the Record screen would draw.
  // Used by SECOND RIDE only.
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

  // SECOND RIDE only: gate-indexed sector verdict colours for the map's
  // sector-span prop. Gate ticks themselves are never coloured — that is the
  // point of this mode (Nathan's 2026-09-01 ruling) — so no gate-tick colour
  // array is built or passed here at all.
  const sectorColours = demoSectorColours(script, gatesDone, tierLineColour);

  const headerCopy = mode === 'second'
    ? `A real archived ${routeLabel(ROUTE)} lap replayed at ${RATE}x — the reference line and gates are already there; each sector paints its colour as you cross the gate that ends it. Nothing is recorded.`
    : 'The same lap ridden as if for the first time — no route, no gates, just you and the line you are writing. Nothing is recorded.';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h2}>DEMO RIDE</Text>
      <Text style={styles.sub}>{headerCopy}</Text>

      <View style={styles.pillRow}>
        <Pressable
          style={[styles.pill, mode === 'first' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('first')}
        >
          <Text style={[styles.pillText, mode === 'first' && styles.pillTextSelected]}>FIRST RIDE</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, mode === 'second' ? styles.pillSelected : styles.pillOutline]}
          onPress={() => switchMode('second')}
        >
          <Text style={[styles.pillText, mode === 'second' && styles.pillTextSelected]}>SECOND RIDE</Text>
        </Pressable>
      </View>

      {settings.liveMap ? (
        <View style={{ marginTop: 12 }}>
          {/* browse = pannable/zoomable preview with the zoom bar (Nathan
              2026-08-18); the rider dot still rides the real line. */}
          {mode === 'second' ? (
            <RouteMapView routeId={ROUTE} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
              zoom={4} sectorColours={sectorColours} leadColour={colors.grey} variant="browse" />
          ) : (
            <RouteMapView routeId={DEMO_FIRST_RIDE_ID} lat={pos?.lat ?? null} lon={pos?.lon ?? null}
              zoom={4} trail={trail} variant="browse" />
          )}
        </View>
      ) : null}

      <View style={{ marginTop: 8 }}>
        {mode === 'second' ? (
          <LiveSectorPane vm={vm} showLap />
        ) : (
          <Text style={styles.sub}>{FIRST_RIDE_STATUS} · {fmtMS(clockS)}</Text>
        )}
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
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    flex: 1, borderRadius: radius.btn, paddingVertical: 10, borderWidth: 2, alignItems: 'center',
  },
  pillSelected: { backgroundColor: t.accent, borderColor: t.accent },
  pillOutline: { backgroundColor: 'transparent', borderColor: t.race.border },
  pillText: { color: t.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  pillTextSelected: { color: t.onAccent },
  btn: {
    marginTop: 16, alignSelf: 'stretch', borderRadius: radius.btn, paddingVertical: 14,
    backgroundColor: t.accent, alignItems: 'center',
  },
  btnText: { color: t.onAccent, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  note: { color: t.textDim, fontSize: 11.5, marginTop: 14 },
});
