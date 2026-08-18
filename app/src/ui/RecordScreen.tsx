/**
 * Phase-1 recording screen. [UNTESTED ON DEVICE]
 * Big Start/Stop, live fix counter + elapsed time, permission/GPS problem
 * states, relaunch recovery, battery-optimisation warning.
 * Cycle 007 (live v2, Nathan 2026-08-15): while recording, the LIVE surface
 * (LAYOUT §2/§2a) renders from the real liveEngine feed through the shared
 * pane — big ticking LAP clock (rate-1 timebase anchored at recording start),
 * sector flashes masking it at each gate, sector blocks with frozen times,
 * LAP result terminal at the final-gate handover. The tower-position chip
 * renders ONLY when a tower source exists — B-28 UNBUILT, so the stub
 * returns null and nothing extra appears (see live/towerSource.ts).
 * No benchmark store yet → every clean sector/lap is NEUTRAL, deltas blank.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActiveSession,
  PermissionOutcome,
  RideSummary,
  TrackerStatus,
  ensurePermissions,
  getRecoveryState,
  getStatus,
  startTracking,
  stopTracking,
  subscribe,
} from '../location';
import { liveEngine, type LiveEngineState } from '../live/engine';
import { getLiveTowerPosition } from '../live/towerSource';
import { LiveSectorPane, realTimebase, viewModelFromEngine } from './liveView';
import RouteMapView from './routeMapView';
import { metresBetween } from './routeMapGeo';
import { useSettings } from './settings';
import { chipColors, type Tier } from './chips';
import { ghostsFor, lapValues, sectorValues, tierFor } from './colourModel';
import { rememberRide } from './lastRide';
import catalogJson from '../store/catalog.seed.json';
import { landmarkAt } from '../store/catalog';
import type { Catalog, Route } from '../store/types';
import { PaddockTheme, colors, radius } from './theme';
import { useTheme } from './themeContext';

/** How long a newly-changed status line holds the rotating slot (IDEAS §24).
 * [ASSUMPTION — tune on device: long enough to survive a glance delay, short
 * enough that the carousel is not effectively disabled.] */
const PIN_MS = 20000;

/** Stationary detection (B-51, RecordScreen-owned): the live ribbon dims and
 * releases its zoom-bar lock while genuinely moving is not the same as at a
 * red light or a junction — a light is not a finish, but the map should
 * still look paused rather than a fully-live ribbon that just happens not
 * to be moving right now. [ASSUMPTION — tune on device: 10 m / 6 s were
 * picked to ignore GPS jitter without lagging a real stop, not measured
 * against a real ride yet.] */
const STOPPED_AFTER_MS = 6000;
const MOVE_EPS_M = 10;

const CATALOG = catalogJson as unknown as Catalog;

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/** Presentational label for a route id — the Route type has no label field
 * (schema untouched): "EveningA" -> "Evening A", "Morning" -> "Morning". */
function routeLabel(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

/** §8a default: the most-ridden recent route on the way — most ghost rides in
 * the recent window (ghostsFor = last WINDOW_N ranked rides, ascending by
 * startedAtMs), tie -> the one ridden most recently, tie -> catalog order. */
function defaultRouteFor(routes: Route[]): Route | null {
  let best: Route | null = null;
  let bestN = -1;
  let bestLast = -Infinity;
  for (const r of routes) {
    const g = ghostsFor(r.id);
    const n = g.length;
    const last = n > 0 ? g[n - 1].startedAtMs : -Infinity;
    if (n > bestN || (n === bestN && last > bestLast)) {
      best = r; bestN = n; bestLast = last;
    }
  }
  return best;
}

export default function RecordScreen() {
  const { t, mode, toggleMode } = useTheme();
  const { s: settings } = useSettings();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [status, setStatus] = useState<TrackerStatus>(getStatus());
  const [now, setNow] = useState(Date.now());
  const [problem, setProblem] = useState<PermissionOutcome | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<RideSummary | null>(null);
  const [live, setLive] = useState<LiveEngineState>(liveEngine.getState());
  const [showLap, setShowLap] = useState(false);
  const [held, setHeld] = useState(false); // manual red-light hold (§18)
  // Start flow (§21): where from, where to. Detected-or-picked; the ride still
  // scores against whatever road is actually ridden (§8a: the pick is intent).
  const [from, setFrom] = useState('home');
  const [to, setTo] = useState('work');
  // §8a route pick (Nathan 2026-08-16, re-confirmed 2026-08-18): only asked
  // when the way has >1 ratified route. Stored WITH its wayId so a pick can
  // never leak onto a different way when START / GOING TO change — a stale
  // pair silently falls back to the §8a default. Intent, not truth: the
  // engine still scores whatever road is actually ridden.
  const [routePick, setRoutePick] = useState<{ wayId: string; routeId: string } | null>(null);
  // The pick frozen at START — the pre-lock candidate for the LIVE map. Frozen
  // because `fromId` can drift mid-ride in auto mode (detected landmark goes
  // null once you leave the disc), which would silently change `way`.
  const [rideRouteHint, setRideRouteHint] = useState<string | null>(null);

  // Live status from the location layer.
  useEffect(() => subscribe(setStatus), []);

  // Live sector state from the engine (display-only, derived; D-023).
  useEffect(() => liveEngine.subscribe(setLive), []);

  // Stationary detection for the live map ribbon (B-51): track the last fix
  // and the last time a fix actually moved >= MOVE_EPS_M (same equirectangular
  // estimate the map itself uses for its bearing jitter guard — metresBetween
  // is shared from routeMapGeo.ts so the two "did it move" checks never drift
  // apart).
  const lastMovedRef = useRef<number | null>(null);
  const lastFixRef = useRef<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (status.lastLat === null || status.lastLon === null) return;
    const lat = status.lastLat, lon = status.lastLon;
    const prev = lastFixRef.current;
    if (prev === null || metresBetween(prev.lat, prev.lon, lat, lon) >= MOVE_EPS_M) {
      lastMovedRef.current = Date.now();
      lastFixRef.current = { lat, lon };
    }
  }, [status.lastLat, status.lastLon]);

  // LAYOUT §2a: the lap chip appears ~1.1 s after the final gate, with the
  // lap earcon — never simultaneously with the sector chip.
  const lapScored = live.lap !== null;
  useEffect(() => {
    if (!lapScored) {
      setShowLap(false);
      return;
    }
    const id = setTimeout(() => setShowLap(true), 1100);
    return () => clearTimeout(id);
  }, [lapScored]);

  // 1 s clock while recording.
  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  // Relaunch recovery: ride marker on disk from a previous launch?
  useEffect(() => {
    (async () => {
      const rec = await getRecoveryState();
      if (!rec) return;
      if (rec.tracking) {
        // Service survived; keep recording, resume the UI.
        setSession(rec.session);
        setRecovered(true);
      } else {
        // Service died (OS kill / battery saver). Offer to finalise.
        Alert.alert(
          'Unfinished ride found',
          'The app was closed while a ride was recording and tracking has stopped. Save what was captured?',
          [
            {
              text: 'Save ride',
              onPress: async () => {
                const sum = await stopTracking();
                setLastSummary(sum);
              },
            },
            { text: 'Discard for now', style: 'cancel' },
          ],
        );
      }
    })();
  }, []);

  const onStart = useCallback(async () => {
    setBusy(true);
    setLastSummary(null);
    // A fresh ride must not inherit the previous one's "last moved" clock —
    // otherwise the map could read stationary for a moment at the very start.
    lastMovedRef.current = null;
    lastFixRef.current = null;
    try {
      const outcome = await ensurePermissions();
      if (outcome === 'denied' || outcome === 'services-off') {
        setProblem(outcome);
        return;
      }
      setProblem(outcome === 'foreground-only' ? 'foreground-only' : null);
      setRideRouteHint(pickedRouteRef.current?.refLineId ?? null);
      const s = await startTracking();
      setRecovered(false);
      setSession(s);
    } catch (e) {
      Alert.alert('Could not start tracking', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onStop = useCallback(async () => {
    setBusy(true);
    try {
      rememberRide(liveEngine.getState()); // hand the finished ride to Result
      const sum = await stopTracking();
      setSession(null);
      setRecovered(false);
      setLastSummary(sum);
    } catch (e) {
      Alert.alert('Could not stop cleanly', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const recording = session != null;
  const hasFix = status.lastLat !== null && status.lastLon !== null;
  const stationary = recording && hasFix && lastMovedRef.current !== null
    && (now - lastMovedRef.current) > STOPPED_AFTER_MS;
  const lastFixAgeS =
    status.lastFixMs != null ? Math.round((now - status.lastFixMs) / 1000) : null;

  // Rotating status slot (IDEAS §24): route / fix count / GPS state share one
  // line, advancing every 6 s. GPS trouble jumps the queue via ordering only —
  // content stays honest, nothing is hidden, just time-multiplexed.
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setStatusIdx((i) => i + 1), 6000);
    return () => clearInterval(id);
  }, [recording]);
  const gpsTrouble = status.lastFixMs == null || (lastFixAgeS != null && lastFixAgeS > 5);
  const gpsLine =
    status.lastFixMs == null
      ? 'waiting for first GPS fix…'
      : lastFixAgeS != null && lastFixAgeS > 5
        ? `last fix ${lastFixAgeS}s ago — GPS struggling?`
        : 'GPS live';
  const routeLocked = live.phase === 'locked' || live.phase === 'finished';
  const routeLine = routeLocked
    ? `${live.track ?? ''} · route locked${live.onRoute ? '' : ' · off route'}`
    : rideRouteHint ? `detecting route… · you picked ${routeLabel(rideRouteHint)}` : 'detecting route…';
  const statusItems = gpsTrouble
    ? [gpsLine, routeLine, `${status.fixesThisLaunch} fixes`] // trouble leads
    : [routeLine, `${status.fixesThisLaunch} fixes`, gpsLine];

  // A line that CHANGES claims the slot for PIN_MS instead of waiting its turn.
  // Without this the carousel can rotate the route lock away ~2 s after it
  // fires — and the lock (~400 m in) is the one line the rider is told to
  // look for. Rotation resumes when the pin expires; nothing is hidden either
  // way, and the pin only ever *delays* the other items.
  const [pinned, setPinned] = useState<'route' | 'gps' | null>(null);
  useEffect(() => {
    if (!recording || !routeLocked) return;
    setPinned('route');
    const id = setTimeout(() => setPinned(null), PIN_MS);
    return () => clearTimeout(id);
  }, [recording, routeLocked, live.track]);
  useEffect(() => {
    if (!recording || !gpsTrouble) return;
    setPinned('gps'); // trouble outranks the lock — it is the actionable one
    const id = setTimeout(() => setPinned(null), PIN_MS);
    return () => clearTimeout(id);
  }, [recording, gpsTrouble]);
  const statusLine =
    pinned === 'gps' ? gpsLine : pinned === 'route' ? routeLine : statusItems[statusIdx % statusItems.length];

  // Colour comes from the ghost history for the LOCKED route only: before the
  // lock there is nothing honest to compare against, so everything stays
  // neutral (D-025). Sector index 0 means "the whole lap".
  const tierOf = (sectorIndex: number, movingS: number | null): Tier => {
    if (live.track === null || movingS === null) return 'neutral';
    const history = sectorIndex === 0 ? lapValues(live.track) : sectorValues(live.track, sectorIndex);
    const tier = tierFor(movingS, history);
    return tier === 'est' ? 'est' : (tier as Tier);
  };

  // NOTE: the gate buzz is NOT fired here. src/location/index.ts owns it —
  // it sees every fire even with the screen off, and two buzzers meant the
  // rider felt each gate twice (cycle 009). This screen only sets the flag.

  // Gate markers on the map take the colour their sector earned, once scored.
  const gateColours = useMemo(() => {
    const out: (string | null)[] = [null];
    for (let i = 0; i < live.sectors.length; i++) {
      const sec = live.sectors[i];
      if (sec.kind !== 'done') { out.push(null); continue; }
      const tier = sec.estimated ? 'est' : tierOf(i + 1, sec.movingS ?? null);
      out.push(chipColors(tier, t).text);
    }
    return out;
  }, [live.sectors, live.track, t]);

  const startable = CATALOG.landmarks.filter((l) => l.offerAtStart);

  // DETECTED start: the real one, from the last fix through the catalog. Null
  // when the phone is nowhere known -- it used to claim "home" regardless
  // (cycle 009).
  const detected = status.lastLat !== null && status.lastLon !== null
    ? landmarkAt(CATALOG, { lat: status.lastLat, lon: status.lastLon }, Date.now())
    : null;
  const fromId = settings.startMode === 'auto' ? (detected?.id ?? from) : from;

  // The way the rider picked, and the routes on it -- so the ghost count is
  // THIS way's, not always Morning's.
  const way = CATALOG.ways.find(
    (w) => w.startLandmarkId === fromId && w.endLandmarkId === to,
  );
  const wayRoutes = way ? CATALOG.routes.filter((r) => r.wayId === way.id) : [];
  const ghostCount = wayRoutes.reduce((n, r) => n + ghostsFor(r.id).length, 0);
  const pickedRoute: Route | null = way
    ? (routePick && routePick.wayId === way.id
        ? (wayRoutes.find((r) => r.id === routePick.routeId) ?? defaultRouteFor(wayRoutes))
        : defaultRouteFor(wayRoutes))
    : null;
  // Mirror for onStart's [] useCallback closure (it must read the CURRENT pick).
  const pickedRouteRef = useRef<Route | null>(null);
  pickedRouteRef.current = pickedRoute;

  return (
    // Race mode (BRAND P1): recording switches to the theme's race surface.
    <ScrollView
      style={[styles.scroll, recording && { backgroundColor: t.race.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Theme toggle — settings-lite; hidden while recording (inert surface). */}
      {!recording && (
        <Pressable style={styles.modePill} onPress={toggleMode}>
          <Text style={styles.modePillText}>{mode === 'daylight' ? '☾ night' : '☀ day'}</Text>
        </Pressable>
      )}
      {/* Problem states */}
      {problem === 'services-off' && (
        <Text style={styles.warn}>
          Location (GPS) is turned off on this phone. Enable it in quick settings, then press
          Start again.
        </Text>
      )}
      {problem === 'denied' && (
        <View style={styles.warnBox}>
          <Text style={styles.warn}>
            Location permission was denied — Qualifire cannot track without it.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.linkBtnText}>Open app settings</Text>
          </Pressable>
        </View>
      )}
      {problem === 'foreground-only' && (
        <View style={styles.warnBox}>
          <Text style={styles.warn}>
            Background location ("Allow all the time") not granted. Tracking works only while the
            app is open with the screen on. Grant it in settings for pocket recording.
          </Text>
          <Pressable style={styles.linkBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.linkBtnText}>Open app settings</Text>
          </Pressable>
        </View>
      )}

      {/* Live readout */}
      {recording ? (
        <View style={styles.readoutLive}>
          {recovered && (
            <Text style={styles.recovered}>
              Recovered after relaunch — still recording. Counter shows fixes since relaunch;
              nothing was lost on disk.
            </Text>
          )}
          {/* LIVE surface v2 (LAYOUT §2/§2a) — real engine feed, real clock:
              rate-1 timebase anchored at recording start (whole-ride elapsed,
              per Nathan's lap-clock ruling). posChip is null until the B-28
              benchmark/ride-history store exists — no chip renders, never a
              fake rank. */}
          <LiveSectorPane
            vm={viewModelFromEngine(
              live,
              realTimebase(session.startedAtMs),
              getLiveTowerPosition(live), // real position once the lap lands
              tierOf,
            )}
            showLap={showLap}
          />
          {/* B-51: the map lives BELOW the sector strip now — a ribbon under
              the clock/strip row, not a headline element. Slim (120) while
              actually moving/stopped so it stays clearly subordinate to the
              clock (D-027); it grows back to 190 once FINISH releases it. */}
          {settings.liveMap ? (
            <RouteMapView
              routeId={live.track ?? rideRouteHint}
              lat={status.lastLat}
              lon={status.lastLon}
              zoom={4}
              gateColours={gateColours}
              variant="live"
              liveState={live.phase === 'finished' ? 'finished' : (stationary ? 'stopped' : 'moving')}
              height={live.phase === 'finished' ? 190 : 120}
            />
          ) : null}
          {/* One rotating status slot (IDEAS §24, 2026-08-16): route / fixes /
              GPS cycle every 6 s instead of stacking three lines. Warnings
              (storage errors) stay permanent below — never rotated away. */}
          <Text style={styles.trackLine}>{statusLine}</Text>
          {settings.redLight === 'button' && (
            <Pressable
              style={[styles.redFlag, held && { opacity: 0.6 }]}
              onPress={() => setHeld((h) => !h)}
            >
              <Text style={styles.redFlagText}>
                {held ? 'GO - RELEASE CLOCK' : 'RED LIGHT - HOLD CLOCK'}
              </Text>
              <Text style={styles.stopSlimSub}>
                self-reported stop - the measured clock keeps its own truth
              </Text>
            </Pressable>
          )}
          {status.storageErrors > 0 && (
            <Text style={styles.warn}>
              {status.storageErrors} storage errors — last: {status.lastError}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.readout}>
          {/* The mark, measured off product/brand/logos/qualifire_logo_1_gate_q.png
              rather than eyeballed: on a 512 canvas the ring is 309 px across
              with a 34 px stroke, and the slash is a 238 px diagonal 36 px thick
              whose bbox starts at the ring's centre — a Q's tail, not a bar
              through the whole mark. Scaled here to a 122 px wrap. */}
          <View style={styles.logoWrap}>
            <View style={styles.logoRing} />
            <View style={styles.logoSlash} />
          </View>
          <Text style={styles.appTitle}>Qualifire</Text>
          {/* B-51: at the rack, before START — real pannable streets, the
              candidate route (whichever way/route is picked so far; falls
              back to 'Morning' inside RouteMapView when nothing is picked
              yet, which is acceptable as the candidate). */}
          {settings.liveMap ? (
            <View style={{ alignSelf: 'stretch' }}>
              <RouteMapView
                routeId={pickedRoute?.refLineId ?? null}
                lat={status.lastLat}
                lon={status.lastLon}
                zoom={1}
                showRider
                variant="live"
                liveState="prestart"
                height={200}
              />
            </View>
          ) : null}
          <View style={styles.startFlow}>
            <Text style={styles.flowLabel}>
              {settings.startMode === 'auto'
                ? (detected ? 'DETECTED START' : 'START NOT DETECTED — PICK ONE')
                : 'STARTING FROM'}
            </Text>
            <View style={styles.pillRow}>
              {startable.map((l) => (
                <Pressable key={l.id} onPress={() => setFrom(l.id)}
                  style={[styles.pill, fromId === l.id && styles.pillOn]}>
                  <Text style={[styles.pillText, fromId === l.id && styles.pillTextOn]}>
                    {l.label}{detected?.id === l.id ? ' ✓' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.flowLabel}>GOING TO</Text>
            <View style={styles.pillRow}>
              {startable.filter((l) => l.id !== fromId).map((l) => (
                <Pressable key={l.id} onPress={() => setTo(l.id)}
                  style={[styles.pill, to === l.id && styles.pillOn]}>
                  <Text style={[styles.pillText, to === l.id && styles.pillTextOn]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
            {way && wayRoutes.length > 1 ? (
              <>
                <Text style={styles.flowLabel}>WHICH ROUTE TODAY?</Text>
                <View style={styles.pillRow}>
                  {wayRoutes.map((r) => (
                    <Pressable key={r.id} onPress={() => setRoutePick({ wayId: way.id, routeId: r.id })}
                      style={[styles.pill, pickedRoute?.id === r.id && styles.pillOn]}>
                      <Text style={[styles.pillText, pickedRoute?.id === r.id && styles.pillTextOn]}>
                        {routeLabel(r.id)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.sub}>
                  the pick is intent — ride a different road and the ride scores as the road you actually took (§8a)
                </Text>
              </>
            ) : null}
            <Text style={styles.sub}>
              {!way
                ? 'no route known for this pair yet — the ride records, but nothing is scored'
                : ghostCount > 0
                  ? `${ghostCount} rides found — you are racing ${ghostCount} ghosts`
                  : 'no history on this way yet — nothing to race'}
            </Text>
          </View>
          {lastSummary ? (
            <Text style={styles.sub}>
              Ride saved: {lastSummary.nFixes} fixes,{' '}
              {fmtElapsed(lastSummary.endMs - lastSummary.startMs)}. Find it in Rides.
            </Text>
          ) : (
            <Text style={styles.sub}>Ready to record.</Text>
          )}
        </View>
      )}

      {/* START stays the big slab; STOP shrinks to a slim bar (IDEAS §24) —
          recording is the live surface's moment, not the button's. Amber, no red (D-013). */}
      {recording ? (
        <Pressable
          style={[styles.stopSlim, busy && styles.busy]}
          disabled={busy}
          onPress={onStop}
        >
          <Text style={styles.stopSlimText}>STOP</Text>
          <Text style={styles.stopSlimSub}>ends & saves</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.bigBtn, styles.startYellow, busy && styles.busy]}
          disabled={busy}
          onPress={onStart}
        >
          <Text style={[styles.bigBtnText, styles.startText]}>START</Text>
          <Text style={[styles.bigBtnSub, styles.startSub]}>
            records the ride · screen can go off
          </Text>
        </Pressable>
      )}

    </ScrollView>
  );
}

const makeStyles = (t: PaddockTheme) => StyleSheet.create({
  scroll: { flex: 1 },
  // flexGrow + centre: short content still sits centred as before; tall
  // content (map on) scrolls instead of shoving START under the tab bar.
  content: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    padding: 20, paddingBottom: 36, gap: 22,
  },
  modePill: {
    position: 'absolute',
    top: 14,
    right: 16,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modePillText: { color: t.text2, fontSize: 12 },
  readout: { alignItems: 'center', gap: 6 },
  appTitle: {
    color: t.text,
    fontSize: 19,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 4,
  },
  // Logo mark, drawn: ink ring, yellow gate slash crossing it (BRAND P4).
  logoWrap: { width: 122, height: 122, marginBottom: 10 },
  // ring: 309/512 of the canvas, 34/512 stroke, centred (101..410 of 512)
  logoRing: {
    position: 'absolute',
    left: 24,   // 101/512 * 122
    top: 22,    //  91/512 * 122
    width: 74,  // 309/512 * 122
    height: 74,
    borderRadius: 37,
    borderWidth: 8, // 34/512 * 122
    borderColor: t.text,
  },
  // slash: 238/512 long, 36/512 thick, running from the ring centre down-right.
  // Rotating about the centre, so left/top place its MIDPOINT at the midpoint
  // of the reference bbox (269..437, 259..427 of 512).
  logoSlash: {
    position: 'absolute',
    left: 56,   // midpoint x 353/512*122 = 84, minus half the 57 px length
    top: 78,    // midpoint y 343/512*122 = 82, minus half the 9 px thickness
    width: 57,  // 238/512 * 122
    height: 9,  //  36/512 * 122
    borderRadius: 5,
    backgroundColor: t.accent,
    transform: [{ rotate: '45deg' }],
  },
  // Race readout: colours follow the theme's race surface. The ticking lap
  // clock IS the elapsed display now (LAYOUT §2 v2) — no second clock.
  readoutLive: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  trackLine: {
    color: t.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  counter: {
    color: t.textDim,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  sub: { color: t.text2, fontSize: 15, textAlign: 'center' },
  startFlow: { alignSelf: 'stretch', gap: 4, marginTop: 6 },
  flowLabel: { color: t.textDim, fontSize: 11, letterSpacing: 2, marginTop: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1, borderColor: t.cardBorder, borderRadius: radius.pill,
    paddingHorizontal: 11, paddingVertical: 4,
  },
  pillOn: { borderColor: t.accent },
  pillText: { color: t.textDim, fontSize: 12.5 },
  pillTextOn: { color: t.accentText },
  recovered: { color: colors.amber, fontSize: 13, textAlign: 'center' },
  warn: { color: colors.amber, fontSize: 14, textAlign: 'center' },
  warnBox: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.card,
    padding: 14,
  },
  bigBtn: {
    alignSelf: 'stretch',
    height: 150,
    borderRadius: radius.big,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Idle START is the gate slash as a button. Recording = slim amber bar (§24).
  startYellow: { backgroundColor: t.accent, borderColor: t.accent },
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
  // Amber, never red (D-013) even though it is a "red light" button.
  redFlag: {
    alignSelf: 'stretch',
    marginTop: 10,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.amber,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 2,
  },
  redFlagText: { color: colors.amber, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  stopSlimText: { color: colors.amber, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  stopSlimSub: { color: t.textDim, fontSize: 11, letterSpacing: 1 },
  busy: { opacity: 0.5 },
  bigBtnText: { color: t.text, fontSize: 40, fontWeight: '800', letterSpacing: 5 },
  startText: { color: t.onAccent },
  stopBtnText: { color: colors.amber },
  bigBtnSub: { color: t.textDim, fontSize: 12, letterSpacing: 1 },
  startSub: { color: t.onAccent, opacity: 0.75 },
  linkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: 'transparent',
  },
  linkBtnText: { color: t.text2, fontSize: 13 },
});
