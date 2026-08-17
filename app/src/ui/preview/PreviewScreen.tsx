/**
 * PREVIEW tab — interactive RN port of demos/mockup.html (D-013 layout,
 * D-019 earcons, D-021 Quali Day, D-022 lap tier). Demo data only; nothing
 * here touches recording or storage. Earcon *sounds* need the audio module
 * (build 3) — the gate buzz is real (Vibration), sounds shown as captions.
 *
 * Navigation mirrors the mockup: HOME → START arms → LIVE; ▶ demo ride plays
 * a whole Morning lap (a sector completes every ~2.6 s); the final gate shows
 * the D-022 lap handover and pushes the BOARD automatically. Board ↔ history
 * ↔ setup ↔ home. Android back walks back to HOME first.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { PaddockTheme, colors, radius } from '../theme';
import { useTheme } from '../themeContext';
import { PURPLE_INK, chipColors } from '../chips';
import {
  LiveSectorPane,
  realTimebase,
  type LiveViewModel,
  type Timebase,
} from '../liveView';
import { TimingTower } from '../tower';
import {
  DEMO_BOARD_AT,
  DEMO_LAP_AT,
  HIST_RIDES,
  LapDemo,
  LiveState,
  SCENARIOS,
  STATES,
  SlotKey,
  TRACKS,
  TREND_DOTS,
  TREND_REF_Y,
  TREND_TODAY,
  Tier,
  demoClockAt,
} from './data';
import { PreviewRoute, ROUTES } from './routes';

const ROUTE_KEYS = ['morning', 'eveningA', 'eveningB'] as const;
type RouteKey = (typeof ROUTE_KEYS)[number];

/** Morning per-sector stats from B-19; other tracks get lengths only for now. */
const MORNING_SEC_STATS = ['median 3:06 · σ 6.4 s', 'median 3:23 · σ 3.8 s', 'median 4:01 · σ 5.3 s', 'median 3:23 · σ 7.1 s'];

/** Position (x, y in 0..1) on a route polyline at a given chainage fraction. */
function pointAtFrac(route: PreviewRoute, frac: number): [number, number] {
  const pts = route.pts;
  if (frac <= 0) return [pts[0][0], pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][2] >= frac) {
      const [x0, y0, f0] = pts[i - 1];
      const [x1, y1, f1] = pts[i];
      const t = f1 > f0 ? (frac - f0) / (f1 - f0) : 0;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
}

function fmtKm(m: number): string {
  return `${Math.round(m)} m`;
}

type Scr = 'home' | 'live' | 'board' | 'hist' | 'setup';

/* ---- tier styling now lives in ../chips (shared with the real live surface) ---- */

const SLOT_TIER: Record<SlotKey, Tier> = { N: 'neutral', NI: 'neutral', G: 'green', E: 'est', P: 'purple', '': 'none' };
const SLOT_GLYPH: Record<SlotKey, string> = { N: '', NI: ' ‖', G: '', E: ' ~', P: ' ●', '': '' };

function buzz(): void {
  Vibration.vibrate(70);
}

/* ==================================================================== */

export default function PreviewScreen() {
  const { t } = useTheme();
  const s = useMemo(() => makeS(t), [t]);
  const [scr, setScr] = useState<Scr>('home');
  const [track, setTrack] = useState(0);
  const [st, setSt] = useState<LiveState>(STATES.pregate);
  const [scen, setScen] = useState(0);
  const [demoDone, setDemoDone] = useState(false);
  const [lap, setLap] = useState<LapDemo | null>(null);
  const [riding, setRiding] = useState(false);
  /** scripted step index — doubles as the flash trigger (0 = no gate yet) */
  const [gateIdx, setGateIdx] = useState(0);
  /** demo lap-clock timebase — re-anchored at each scripted gate */
  const [tb, setTb] = useState<Timebase | null>(null);
  /** arms the tower slot-in on the freshly pushed board only (§3.8/§3b.3) */
  const [justFinished, setJustFinished] = useState(false);
  const [quali, setQuali] = useState<'hidden' | 'card' | 'defended'>('hidden');
  const [ceremony, setCeremony] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopDemo = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRiding(false);
  }, []);

  const go = useCallback(
    (s: Scr) => {
      if (s !== 'live') stopDemo();
      if (s === 'board' && scr !== 'board') setCeremony(false);
      // Manual navigation never replays the slot-in (§3b.3).
      if (s === 'board') setJustFinished(false);
      setScr(s);
    },
    [scr, stopDemo],
  );

  // Android back walks the preview stack back to HOME before leaving the tab.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scr !== 'home') {
        stopDemo();
        setScr('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [scr, stopDemo]);

  useEffect(() => stopDemo, [stopDemo]);

  const setLive = useCallback((state: LiveState, gate: boolean) => {
    setLap(null);
    setSt(state);
    if (gate) buzz(); // D-019: every gate = one identical short buzz
  }, []);

  const startRide = useCallback(() => {
    stopDemo();
    setLive(STATES.pregate, false);
    setGateIdx(0);
    // Manual live entry runs the real clock code at rate 1 — same as the bike.
    setTb(realTimebase(Date.now()));
    setScr('live');
  }, [setLive, stopDemo]);

  const playDemo = useCallback(() => {
    stopDemo();
    setRiding(true);
    // A different random scenario each run (never the same twice in a row),
    // so repeated ▶ presses show different outcomes slotting into board+history.
    let next = scen;
    while (next === scen) next = Math.floor(Math.random() * SCENARIOS.length);
    setScen(next);
    const sc = SCENARIOS[next];
    sc.seq.forEach(([t, state], i) => {
      timers.current.push(
        setTimeout(() => {
          setLive(state, i > 0);
          setGateIdx(i);
          // Accelerated lap clock (Nathan 2026-08-15): re-anchor the shared
          // timebase at each scripted gate — the clock the flash masks reads
          // the scenario's cumulative time, at ~70× real rate.
          const { anchorClockMs, rate } = demoClockAt(sc, i);
          setTb({ anchorRealMs: Date.now(), anchorClockMs, rate, running: true });
        }, t),
      );
    });
    // D-022 handover: lap result + lap voice, 300 ms after the sector earcon ends.
    timers.current.push(setTimeout(() => setLap(sc.lap), DEMO_LAP_AT));
    // LIVE → BOARD automatic — no "end ride" button on the happy path.
    timers.current.push(
      setTimeout(() => {
        stopDemo();
        setCeremony(false);
        setDemoDone(true);
        setJustFinished(true); // §2a beat 3 → the tower slot-in plays once
        setScr('board');
      }, DEMO_BOARD_AT),
    );
  }, [scen, setLive, stopDemo]);

  const sc = SCENARIOS[scen];

  // Scripted view model → the SAME LiveSectorPane the real RecordScreen uses.
  // The demo data carries tiers/deltas/positions the engine cannot produce yet
  // (no benchmark store); the rendering path is shared, only data is scripted.
  const curSlot = st.strip.indexOf('');
  const liveVm: LiveViewModel = {
    clock: tb,
    contextLabel: lap || curSlot === -1 ? '' : `S${curSlot + 1}`,
    flash:
      gateIdx > 0
        ? { tier: st.tier, lbl: st.lbl, glyph: st.glyph, time: st.time, delta: st.delta, pb: st.pb }
        : null,
    flashKey: gateIdx,
    lap: lap ? { tier: lap.tier, time: lap.t, delta: lap.d } : null,
    posChip: lap ? sc.posChip : null, // scrappy (estimated) carries null — no rank, no chip
    strip: st.strip.map((k, i) => ({
      tier: SLOT_TIER[k],
      label: 'S' + (i + 1) + SLOT_GLYPH[k],
      time: st.stripTimes[i] ?? undefined,
      current: riding && !lap && i === curSlot,
    })),
  };

  return (
    <View style={s.root}>
      {scr === 'home' && (
        <ScrollView contentContainerStyle={s.pad}>
          <Text style={s.appTitle}>Qualifire</Text>
          <View style={s.trackpick}>
            <Text style={s.auto}>auto-selected · 07:41 · near home</Text>
            <Text style={s.tname}>{TRACKS[track].name}</Text>
            <Text style={s.tmeta}>{TRACKS[track].meta}</Text>
          </View>
          <View style={s.altrow}>
            {TRACKS.map((t, i) => (
              <Pressable
                key={t.name}
                style={[s.altBtn, i === track && s.altBtnSel]}
                onPress={() => setTrack(i)}
              >
                <Text style={[s.altBtnText, i === track && s.altBtnTextSel]}>
                  {t.name.charAt(0) + t.name.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={s.startBtn} onPress={startRide}>
            <Text style={s.startBtnText}>START</Text>
            <Text style={s.startBtnSub}>arms the gates · screen goes inert while moving</Text>
          </Pressable>
          <View style={s.homelinks}>
            <Pressable style={s.hlink} onPress={() => go('board')}>
              <Text style={s.hlinkText}>Yesterday's board</Text>
              <Text style={s.hlinkNum}>Wed · 15:19 →</Text>
            </Pressable>
            <Pressable style={s.hlink} onPress={() => go('hist')}>
              <Text style={s.hlinkText}>History</Text>
              <Text style={s.hlinkNum}>→</Text>
            </Pressable>
            <Pressable style={s.hlink} onPress={() => go('setup')}>
              <Text style={s.hlinkText}>Route & sector setup</Text>
              <Text style={s.hlinkNum}>→</Text>
            </Pressable>
          </View>
          <View style={s.toggles}>
            <View style={s.tg}>
              <Text style={s.tgText}>Elapsed clock on live screen</Text>
              <Text style={s.pill}>off</Text>
            </View>
            <View style={s.tg}>
              <Text style={s.tgText}>Sound</Text>
              <Text style={s.pill}>on</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {scr === 'live' && (
        // Race mode (BRAND P1): the live surface is near-black; tier colours only.
        <View style={[s.pad, { flex: 1, backgroundColor: t.race.bg }]}>
          <LiveSectorPane vm={liveVm} />
          <Text style={s.earcon}>{lap ? lap.ear : (st.earcon ?? ' ')}</Text>
          <Text style={s.striplegend}>
            completed sectors only — no benchmark, no name, nothing upcoming (D-006)
          </Text>
          <View style={s.liveFoot}>
            <Text style={s.inertnote}>
              real app: zero touch targets while moving. Final gate pushes the board automatically.
            </Text>
            <Pressable style={s.demoplay} onPress={riding ? stopDemo : playDemo}>
              <Text style={s.demoplayText}>{riding ? '■ riding…' : '▶ demo ride'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {scr === 'board' && (
        // BOARD v2 (LAYOUT §3, Nathan 2026-08-15): tower headline → sector
        // rows → quarantined ideal lap → quali card last. SECTOR OF THE DAY
        // is REMOVED — the one green row pops out of the flat column itself.
        <ScrollView contentContainerStyle={s.pad}>
          {ceremony && (
            <View style={s.refbanner}>
              <Text style={s.refbannerText}>REFERENCE SET</Text>
            </View>
          )}
          <View style={s.bhead}>
            <Text style={s.bheadDir}>→ WORK · MORNING</Text>
            <Text style={s.bheadDate}>Thu 14 Aug · 07:41</Text>
          </View>
          {ceremony ? (
            // §3a.3: the tower collapses to today's all-purple row, unranked.
            <TimingTower
              ceremony
              model={{
                rows: [
                  { pos: null, time: sc.boardLap.t, tier: 'purple', gap: '', date: '', today: true },
                ],
              }}
            />
          ) : (
            // The tower IS the lap headline (§3.1) — today's row carries the
            // number just read in the big slot; sub-line anchored beneath it.
            <TimingTower
              model={{ rows: sc.tower, todaySub: sc.todaySub }}
              justFinished={justFinished}
              onPlayed={() => setJustFinished(false)}
            />
          )}
          <View style={{ gap: 8 }}>
            {sc.board.map((sec) => (
              <RowChip key={sec.lbl} {...sec} ceremony={ceremony} />
            ))}
          </View>
          <View style={s.ideal}>
            <View style={s.idealRow}>
              <Text style={s.idealLbl}>IDEAL LAP</Text>
              <Text style={s.idealV}>14:19</Text>
              <Text style={s.idealGap}>you: +0:27</Text>
            </View>
            <Text style={s.idealCap}>best sectors, trailing 28 d — not a real lap</Text>
          </View>
          {/* The one decision, LAST on the board (§3.4): the glance completes
              over rank → sectors → headroom before the choice is offered. */}
          {quali === 'card' && !ceremony && (
            <View style={[s.qualicard, { marginTop: 14 }]}>
              <Text style={s.qcap}>Quali attempt · 14:46 vs ref 15:03</Text>
              <View style={s.qbtns}>
                <Pressable
                  style={s.qbtn}
                  onPress={() => {
                    setQuali('hidden');
                    setCeremony(true);
                  }}
                >
                  <Text style={s.qbtnText}>New reference set</Text>
                </Pressable>
                <Pressable style={s.qbtn} onPress={() => setQuali('defended')}>
                  <Text style={s.qbtnText}>Reference defended</Text>
                </Pressable>
              </View>
            </View>
          )}
          {quali === 'defended' && !ceremony && (
            <View style={[s.qualicard, { marginTop: 14 }]}>
              <Text style={s.qdone}>
                Reference defended — 15:03 stands.{'\n'}Nothing stored, nothing counted.
              </Text>
            </View>
          )}
          {quali === 'hidden' && !ceremony && (
            <Pressable style={s.qualiDemoBtn} onPress={() => setQuali('card')}>
              <Text style={s.qualiDemoText}>▶ demo: board after an armed quali attempt (D-021)</Text>
            </Pressable>
          )}
          <View style={s.bfoot}>
            <Pressable style={s.bfootBtn} onPress={() => go('hist')}>
              <Text style={s.bfootText}>History</Text>
            </Pressable>
            <Pressable style={s.bfootBtn} onPress={() => go('home')}>
              <Text style={s.bfootText}>Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {scr === 'hist' && (
        <ScrollView contentContainerStyle={s.pad}>
          <View style={s.htoggle}>
            {TRACKS.map((t, i) => (
              <Pressable key={t.name} style={[s.htBtn, i === track && s.htBtnSel]} onPress={() => setTrack(i)}>
                <Text style={[s.htText, i === track && s.htTextSel]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.trend}>
            <Text style={s.tcap}>lap moving time · last 28 rides · dashed = ref 15:03</Text>
            <View style={s.trendPlot}>
              <Text style={[s.axisLbl, { top: 4, left: 2 }]}>15:45</Text>
              <Text style={[s.axisLbl, { bottom: 2, left: 2 }]}>14:30</Text>
              <View style={[s.refline, { top: TREND_REF_Y }]} />
              {TREND_DOTS.map(([cx, cy], i) => (
                <View key={i} style={[s.dot, { left: `${(cx / 340) * 100}%`, top: cy - 3 }]} />
              ))}
              <View
                style={[s.dot, s.dotToday, { left: `${(TREND_TODAY[0] / 340) * 100}%`, top: TREND_TODAY[1] - 4 }]}
              />
              <Text style={[s.axisLbl, { color: colors.neutral, bottom: 0, right: 8 }]}>today</Text>
            </View>
          </View>
          <View>
            {(demoDone
              ? [{ rd: 'Fri 15 Aug', rt: sc.histTime, lapTier: sc.histTier, mini: sc.histMini }, ...HIST_RIDES]
              : HIST_RIDES
            ).map((r) => (
              <Pressable key={r.rd} style={s.ride} onPress={() => go('board')}>
                <Text style={s.rideDate}>{r.rd}</Text>
                <Text
                  style={[
                    s.rideTime,
                    r.lapTier === 'green' && { color: colors.green },
                    r.lapTier === 'purple' && { color: colors.purple },
                  ]}
                >
                  {r.rt}
                </Text>
                <View style={s.mini}>
                  {r.mini.map((k, i) => {
                    const c = chipColors(SLOT_TIER[k], t);
                    return (
                      <View
                        key={i}
                        style={[
                          s.miniChip,
                          {
                            backgroundColor: c.bg,
                            borderColor: c.border,
                            borderStyle: c.dashed ? 'dashed' : 'solid',
                          },
                        ]}
                      >
                        <Text style={[s.miniText, { color: c.text }]}>
                          {k === 'NI' ? '‖' : k === 'E' ? '~' : k === 'P' ? '●' : '–'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={s.histnote}>
            mostly flat — that is correct. A month scans like the season graphic: purple visibly
            rare (D-008's intent made visible). No streaks, no averages. Lap tier colours the time
            itself (D-022): one green 14:46 pops out of a column of plain laps, like the F1 tower.
          </Text>
          <View style={s.bfoot}>
            <Pressable style={s.bfootBtn} onPress={() => go('home')}>
              <Text style={s.bfootText}>Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {scr === 'setup' && <SetupScreen track={track} setTrack={setTrack} goHome={() => go('home')} />}
    </View>
  );
}

/* ---------- pieces ---------- */
/* (LapBoardChip removed — board v2: the tower's today-row IS the lap
   headline, §3.1; the live handover LAP result lives in liveView.) */

function RowChip(props: {
  lbl: string;
  glyph: string;
  name: string;
  t: string;
  d: string;
  tier: Tier;
  pb?: boolean;
  big?: boolean;
  ceremony?: boolean;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeS(t), [t]);
  const c = props.ceremony
    ? { bg: colors.purple, border: colors.purple, text: PURPLE_INK, dashed: false }
    : chipColors(props.tier, t);
  return (
    <View
      style={[
        s.rowchip,
        props.big && { paddingVertical: 14 },
        {
          backgroundColor: c.bg,
          borderColor: c.border === 'transparent' ? colors.cardBorder : c.border,
          borderStyle: c.dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text style={[s.rcLbl, props.big && { fontSize: 20 }, { color: c.text }]}>{props.lbl}</Text>
      <Text style={[s.rcGlyph, { color: c.text }]}>{props.glyph}</Text>
      <Text style={[s.rcName, { color: c.text, opacity: props.ceremony ? 0.8 : 0.75 }]}>
        {props.name}
      </Text>
      <Text style={[s.rcT, props.big && { fontSize: 24 }, { color: c.text }]}>{props.t}</Text>
      {!props.ceremony && (
        <Text style={[s.rcD, props.big && { fontSize: 20 }, { color: c.text }]}>{props.d}</Text>
      )}
      {!props.ceremony && (
        <Text style={s.rcBadge}>{props.pb ? '●' : ' '}</Text>
      )}
    </View>
  );
}

/* ---------- setup screen: real routes, toggle, draggable gates ---------- */

function SetupScreen({
  track,
  setTrack,
  goHome,
}: {
  track: number;
  setTrack: (i: number) => void;
  goHome: () => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeS(t), [t]);
  const routeKey: RouteKey = ROUTE_KEYS[track];
  const route = ROUTES[routeKey];
  // Draggable gate chainages, per track, seeded from the measured proposal.
  const [gates, setGates] = useState<Record<RouteKey, number[]>>(() => ({
    morning: ROUTES.morning.gates.map((g) => g.m),
    eveningA: ROUTES.eveningA.gates.map((g) => g.m),
    eveningB: ROUTES.eveningB.gates.map((g) => g.m),
  }));
  const [mapW, setMapW] = useState(0);
  const [barW, setBarW] = useState(0);
  const [moved, setMoved] = useState(false);

  const g = gates[routeKey];
  const labels = route.gates.map((x) => x.lbl);
  const mapH = mapW > 0 ? Math.min(200, Math.max(120, mapW / route.aspect)) : 150;
  const PAD = 14;

  const setGate = useCallback(
    (i: number, m: number) => {
      setMoved(true);
      setGates((prev) => {
        const arr = [...prev[routeKey]];
        const lo = i === 0 ? 0 : arr[i - 1] + 100;
        const hi = i === arr.length - 1 ? route.total : arr[i + 1] - 100;
        arr[i] = Math.round(Math.min(hi, Math.max(lo, m)));
        return { ...prev, [routeKey]: arr };
      });
    },
    [routeKey, route.total],
  );

  const sectors = g.slice(1).map((m, i) => m - g[i]);

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.stitle}>Setup · gates on chainage</Text>
      <View style={s.htoggle}>
        {TRACKS.map((t, i) => (
          <Pressable key={t.name} style={[s.htBtn, i === track && s.htBtnSel]} onPress={() => setTrack(i)}>
            <Text style={[s.htText, i === track && s.htTextSel]}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
      <View
        style={[s.mapbox, { height: mapH + 2 * PAD }]}
        onLayout={(e) => setMapW(e.nativeEvent.layout.width - 2 * PAD)}
      >
        <Text style={s.mcap}>MAP PREVIEW (cosmetic — D-002) · real {(route.total / 1000).toFixed(1)} km trace</Text>
        {mapW > 0 &&
          route.pts.map(([x, y], i) => (
            <View
              key={i}
              style={[s.mapDot, { left: PAD + x * mapW - 1.5, top: PAD + y * mapH - 1.5 }]}
            />
          ))}
        {mapW > 0 &&
          g.map((m, i) => {
            const [x, y] = pointAtFrac(route, m / route.total);
            const end = i === 0 || i === g.length - 1;
            return (
              <View
                key={labels[i]}
                style={[
                  end ? s.gateMapEnd : s.gateMapDot,
                  { left: PAD + x * mapW - (end ? 5 : 6), top: PAD + y * mapH - (end ? 5 : 6) },
                ]}
              />
            );
          })}
        {mapW > 0 &&
          g.map((m, i) => {
            const [x, y] = pointAtFrac(route, m / route.total);
            return (
              <Text
                key={labels[i] + '-l'}
                style={[s.gateMapLbl, { left: PAD + x * mapW - 20, top: PAD + y * mapH + 8 }]}
              >
                {labels[i] === 'START' ? 'start' : labels[i] === 'FINISH' ? 'finish' : labels[i]}
              </Text>
            );
          })}
      </View>
      <View style={s.chainage} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        <View style={s.chainTrack} />
        {barW > 0 &&
          g.map((m, i) => (
            <GateHandle
              key={labels[i]}
              m={m}
              total={route.total}
              barW={barW}
              end={i === 0 || i === g.length - 1}
              lbl={labels[i] === 'START' ? 'start' : labels[i] === 'FINISH' ? 'finish' : labels[i]}
              onChange={(nm) => setGate(i, nm)}
            />
          ))}
      </View>
      <View style={s.chainlabels}>
        {g.map((m, i) => (
          <Text key={labels[i]} style={s.chainLblText}>
            {i === 0 || i === g.length - 1 ? fmtKm(m) : String(Math.round(m))}
          </Text>
        ))}
      </View>
      <Text style={s.setupInfo}>
        Drag the handles — a gate IS a chainage value; the map only previews it (D-011). Proposed
        gates sit in measured stop_frac = 0.00 zones, median crossing speed 19–30 km/h.
        {moved ? ' Moved gates are preview-only — nothing is stored yet (B-20).' : ''}
      </Text>
      <View style={s.setupWarn}>
        <Text style={s.setupWarnText}>
          ⚠ example: a gate within ~50 m of a junction exit gets this banner — "move it downstream
          so queues wait BEFORE the gate". None of the proposed gates trigger it.
        </Text>
      </View>
      <View style={s.seclist}>
        {sectors.map((len, i) => (
          <Text key={i} style={s.seclistText}>
            {`S${i + 1} · ${Math.round(len)} m` +
              (routeKey === 'morning' ? ` · ${MORNING_SEC_STATS[i]}` : '')}
          </Text>
        ))}
      </View>
      <Text style={s.setupFoot}>
        Benchmarks start colouring after 5 clean rides (D-008 warm-up).
        {routeKey !== 'morning' ? ' Sector medians for this track land with the B-19 rerun.' : ''}
      </Text>
      <View style={s.bfoot}>
        <Pressable style={s.bfootBtn} onPress={goHome}>
          <Text style={s.bfootText}>Home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function GateHandle({
  m,
  total,
  barW,
  end,
  lbl,
  onChange,
}: {
  m: number;
  total: number;
  barW: number;
  end: boolean;
  lbl: string;
  onChange: (m: number) => void;
}) {
  const { t } = useTheme();
  const s = useMemo(() => makeS(t), [t]);
  const startM = useRef(m);
  const propsRef = useRef({ m, total, barW, onChange });
  propsRef.current = { m, total, barW, onChange };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startM.current = propsRef.current.m;
      },
      onPanResponderMove: (_e, gs) => {
        const p = propsRef.current;
        p.onChange(startM.current + (gs.dx / p.barW) * p.total);
      },
    }),
  ).current;
  const left = (m / total) * (barW - 28);
  return (
    <View style={[s.handleHit, { left }]} {...pan.panHandlers}>
      <View style={end ? s.gateDotEnd2 : s.gateDotGate2} />
      <Text style={s.gateLbl2}>{lbl}</Text>
    </View>
  );
}

/* ---------- styles ---------- */

const makeS = (t: PaddockTheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  pad: { padding: 18, paddingBottom: 30 },
  appTitle: {
    color: t.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 22,
  },

  /* home */
  trackpick: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    borderRadius: radius.card,
    padding: 15,
    marginBottom: 10,
  },
  auto: { fontSize: 11, color: t.text2, letterSpacing: 1, textTransform: 'uppercase' },
  tname: { fontSize: 30, fontWeight: '800', color: t.text, marginVertical: 3 },
  tmeta: { fontSize: 13, color: t.text2, fontVariant: ['tabular-nums'] },
  altrow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  altBtn: {
    flex: 1,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.btn,
    paddingVertical: 9,
    alignItems: 'center',
  },
  // AD pass: yellow selection chrome; solid-yellow primary button.
  altBtnSel: { borderColor: t.accent },
  altBtnText: { color: t.text2, fontSize: 13 },
  altBtnTextSel: { color: t.text, fontWeight: '700' },
  startBtn: {
    height: 130,
    borderRadius: radius.big,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { color: t.onAccent, fontSize: 40, fontWeight: '800', letterSpacing: 5 },
  startBtnSub: { color: t.onAccent, opacity: 0.75, fontSize: 12, letterSpacing: 1 },
  homelinks: { marginTop: 22, gap: 10 },
  hlink: {
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hlinkText: { color: t.text, fontSize: 15 },
  hlinkNum: { color: t.accentText, fontSize: 15, fontVariant: ['tabular-nums'] },
  toggles: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: t.cardBorder,
    paddingTop: 12,
    gap: 6,
  },
  tg: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tgText: { fontSize: 12, color: t.text2 },
  pill: {
    color: t.text2,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    fontSize: 11,
    overflow: 'hidden',
  },

  /* live — whole sector pane renders via ../liveView (shared with RecordScreen) */
  earcon: { height: 52, marginTop: 16, textAlign: 'center', fontSize: 14, color: t.textDim },
  striplegend: { textAlign: 'center', fontSize: 11, color: '#4e4d48', marginTop: 10, letterSpacing: 0.5 },
  liveFoot: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  inertnote: { fontSize: 10, color: '#43423e', maxWidth: 170, lineHeight: 14 },
  demoplay: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.cardBorder,
    backgroundColor: t.card,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  demoplayText: { color: t.text2, fontSize: 12 },

  /* board */
  refbanner: {
    borderWidth: 2,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  refbannerText: {
    color: colors.purple,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 6,
    fontSize: 15,
  },
  bhead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  bheadDir: { color: t.text, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  bheadDate: { color: t.textDim, fontSize: 14, fontVariant: ['tabular-nums'] },
  qualicard: {
    borderWidth: 1,
    borderColor: t.cardBorder,
    backgroundColor: t.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  qcap: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: t.textDim,
    textAlign: 'center',
    marginBottom: 10,
  },
  qbtns: { flexDirection: 'row', gap: 10 },
  qbtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    backgroundColor: t.card,
    borderWidth: 2,
    borderColor: t.cardBorder,
    alignItems: 'center',
  },
  qbtnText: { color: t.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  qdone: { textAlign: 'center', fontSize: 13, lineHeight: 20, color: t.textDim, padding: 4 },
  rowchip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 2,
  },
  rcLbl: { width: 34, fontWeight: '800', fontSize: 19 },
  rcGlyph: { width: 16, fontSize: 15 },
  rcName: { flex: 1, fontSize: 13, fontWeight: '400' },
  rcT: { width: 74, textAlign: 'right', fontWeight: '700', fontSize: 19, fontVariant: ['tabular-nums'] },
  rcD: { width: 66, textAlign: 'right', fontWeight: '600', fontSize: 19, fontVariant: ['tabular-nums'] },
  rcBadge: { width: 20, textAlign: 'right', color: colors.purple, fontSize: 15 },
  ideal: { marginTop: 12, borderTopWidth: 2, borderStyle: 'dashed', borderTopColor: '#33322e', paddingTop: 12 },
  idealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  idealLbl: { color: t.text2, fontSize: 14 },
  idealV: { fontSize: 22, fontWeight: '700', color: '#a09e96', fontVariant: ['tabular-nums'] },
  idealGap: { fontWeight: '600', color: t.text2, fontVariant: ['tabular-nums'] },
  idealCap: { fontSize: 11, color: '#5f5e58', marginTop: 3 },
  qualiDemoBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.cardBorder,
    borderRadius: radius.btn,
    padding: 10,
    alignItems: 'center',
  },
  qualiDemoText: { color: t.text2, fontSize: 12 },
  bfoot: { marginTop: 18, flexDirection: 'row', gap: 10 },
  bfootBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bfootText: { color: colors.linkText, fontSize: 15 },

  /* history */
  htoggle: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  htBtn: {
    flex: 1,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: radius.btn,
    paddingVertical: 8,
    alignItems: 'center',
  },
  htBtnSel: { borderColor: t.accent },
  htText: { color: t.text2, fontSize: 12 },
  htTextSel: { color: t.text, fontWeight: '700' },
  trend: {
    backgroundColor: t.race.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  tcap: { fontSize: 11, color: '#6f6e68', marginBottom: 4 },
  trendPlot: { height: 110, position: 'relative' },
  axisLbl: { position: 'absolute', fontSize: 9, color: '#5f5e58', fontVariant: ['tabular-nums'] },
  refline: {
    position: 'absolute',
    left: 34,
    right: 4,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: '#4a4944',
  },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#c9c7c0' },
  dotToday: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent },
  ride: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.btn,
  },
  rideDate: { width: 96, color: t.textDim, fontSize: 13 },
  rideTime: { width: 78, fontWeight: '700', color: t.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  mini: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  miniChip: {
    width: 26,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: { fontSize: 10 },
  histnote: {
    marginTop: 16,
    fontSize: 11,
    color: '#5c5b55',
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: t.cardBorder,
    paddingTop: 10,
  },

  /* setup */
  stitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    color: t.text,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  mapbox: {
    backgroundColor: t.race.card,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 14,
    height: 150,
    marginBottom: 18,
    overflow: 'hidden',
  },
  mcap: { position: 'absolute', top: 8, left: 10, fontSize: 10, color: '#55544f', letterSpacing: 1, zIndex: 2 },
  mapDot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#3a3a42' },
  gateMapDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.accent,
    zIndex: 3,
  },
  gateMapEnd: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.bg,
    borderWidth: 2,
    borderColor: '#8a8880',
    zIndex: 3,
  },
  gateMapLbl: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 9,
    color: t.text2,
    zIndex: 3,
  },
  handleHit: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 44,
    alignItems: 'center',
    zIndex: 4,
  },
  gateDotGate2: {
    marginTop: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: t.accent,
  },
  gateDotEnd2: {
    marginTop: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: t.bg,
    borderWidth: 2,
    borderColor: '#8a8880',
  },
  gateLbl2: { marginTop: 3, fontSize: 9, color: '#7c7a73' },
  chainage: { height: 46, position: 'relative', marginHorizontal: 2, marginTop: 8 },
  chainTrack: {
    position: 'absolute',
    top: 12,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3a3a42',
  },
  chainlabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  chainLblText: { fontSize: 11, color: '#7c7a73', fontVariant: ['tabular-nums'] },
  setupInfo: { color: t.text2, fontSize: 13, lineHeight: 19, marginTop: 12 },
  setupWarn: {
    borderWidth: 1,
    borderColor: '#3d3325',
    backgroundColor: '#181307',
    borderRadius: radius.btn,
    padding: 11,
    marginTop: 14,
  },
  setupWarnText: { color: colors.amber, fontSize: 13, lineHeight: 19 },
  seclist: { marginTop: 14, gap: 5 },
  seclistText: { fontSize: 14, color: colors.linkText, fontVariant: ['tabular-nums'] },
  setupFoot: { marginTop: 14, fontSize: 11, color: '#5c5b55', lineHeight: 16 },
});
