# DIGEST: Ranking Reveal Feature (White Climb → Green Landing)

**Scope:** Suppress rank-chip display during live ride, defer reveal until STOP/END, then animate a "ranking climb" reveal (rider's row climbs from bottom to final position with colour flip on landing).

**Deliverable:** `cycles/virgin-cycle11/DIGEST-ranking-reveal.md` — a factual, line-anchored digest of all files referenced below, for a Fable Plan tier to read and design a fix.

---

## 1. `app/src/ui/chips.tsx` — PosChip Definition

**Lines 146–158 — PosChip component definition:**

```typescript
/** Static tower-position chip at the final-gate handover (LAYOUT §2a beat 2,
 * Nathan 2026-08-15): position is a FACT — ink, never tier-coloured, no
 * animation, no earcon. Renders nothing upstream when no tower source exists
 * (B-28 UNBUILT on the real screen). */
export function PosChip({ label }: { label: string }) {
  const { t } = useTheme();
  const s = useMemo(() => makeChipStyles(t), [t]);
  return (
    <View style={[s.posChip, { borderColor: t.race.border, backgroundColor: t.race.card }]}>
      <Text style={[s.posChipText, { color: t.text }]}>{label}</Text>
    </View>
  );
}
```

**PosChip styles (lines 198–206):**
```typescript
    posChip: {
      borderWidth: 2,
      borderRadius: radius.btn,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posChipText: { fontSize: 30, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
```

**Note:** PosChip is static, ink-only, rendered only when no tower source exists → currently B-28 UNBUILT on the real screen (renders nothing).

---

## 2. `app/src/ui/liveView.tsx` — Full File

**Header doc-comment (lines 1–29):** Establishes the "one render path" discipline. Says "no benchmark/delta near the clock" and "a static tower-position chip when a tower source exists (B-28 UNBUILT on the real screen)".

**LiveViewModel interface (lines 97–113):**
```typescript
export interface LiveViewModel {
  /** drives the ticking lap clock; null = placeholder 0:00.0 (dim) */
  clock: Timebase | null;
  /** small context line: current sector label, e.g. 'S3' (never a benchmark) */
  contextLabel: string;
  /** latest gate result — flashes over the clock for FLASH_HOLD_MS */
  flash: BigChipModel | null;
  /** increments per gate fire; each change retriggers the flash */
  flashKey: number;
  lap: LapChipModel | null;
  /** tower position at the handover ('P3'); null = render nothing (B-28) */
  posChip: string | null;
  /** live position among the selfs on the map ('P4'); null/undefined =
   *  render nothing (follow-up R10). A fact, never a benchmark. */
  livePos?: string | null;
  strip: StripSlotModel[];
}
```

**Critical JSX block rendering posChip (lines 278–286):**
```typescript
      <View style={paneStyles.bigSlot}>
        {lapTakesSlot && vm.lap ? (
          <View style={paneStyles.lapRow}>
            <View style={{ flex: 1 }}>
              <LiveLapChip tier={vm.lap.tier} time={vm.lap.time} delta={vm.lap.delta} />
            </View>
            {/* static position chip, no new earcon (Nathan 2026-08-15);
                null on the real screen until B-28 → nothing renders */}
            {vm.posChip ? <PosChip label={vm.posChip} /> : null}
          </View>
```

**lapTakesSlot logic (line 265):**
```typescript
  const lapTakesSlot = vm.lap !== null && showLap; // terminal — the counter never resumes
```

---

## 3. `app/src/live/towerSource.ts` — Full File

**Lines 30–47 — getLiveTowerPosition function:**
```typescript
/**
 * B-28 BUILT (cycle 008): ranks the live lap against the archive ghost set for
 * the locked track (src/store/results.seed.json, recomputed by our own
 * pipeline). Returns null — and the screen then renders NO chip — whenever a
 * position would be a fiction: no track locked, no lap yet, an estimated lap
 * (D-028: estimated never ranks), or a route with no history.
 */
export function getLiveTowerPosition(st: LiveEngineState): string | null {
  if (st.track === null || st.lap === null) return null;
  if (st.lap.estimated) return null;
  // The SAME clock as the history it is ranked against (store/timing.ts):
  // scoredS on both sides, never raw-vs-moving (the cycle-009 bug was exactly
  // that mismatch). null = no real time = no chip.
  const mine = scoredS(st.lap);
  if (mine === null) return null;
  const ghosts = lapValues(st.track);
  // D-045 ruling 1 / NW-1 (2026-09-08): rank and colour are independent
  // facts. The colour floor (MIN_HISTORY) gates PRIOR rides needed to
  // judge a verdict; a position needs no priors at all — the pool is
  // ghosts.length + 1 (this lap counts as its own first entry), so a
  // brand-new way's very first live lap still earns a real "P1 of 1"
  // rather than nothing. Only a pool of zero (impossible: `mine` is
  // already checked non-null above) would have no fact to report.
  if (ghosts.length + 1 < MIN_HISTORY) return null;
  return `P${positionAmong(mine, ghosts).pos} of ${ghosts.length + 1}`;
}
```

**Return format:** `P${pos} of ${total}` — a string like "P3 of 10". Returns `null` when no track, no lap, estimated lap, or no history to rank against.

---

## 4. `app/src/ui/colourModel.ts` — Key Exports

**Lines 24–53 — MIN_HISTORY and ranking window:**
```typescript
export const WINDOW_N = 10;  // Line 29
export const WINDOW_PREV = WINDOW_N - 1;  // Line 36
export const MIN_HISTORY = 1;  // Line 53 — D-045 ruling 1, lowered from 5 to 1 (2026-09-08)
```

**Lines 57–59 — GHOSTS export:**
```typescript
const GHOSTS: RideResult[] = shippedResults();
```

**Lines 125–127 — lapValues:**
```typescript
export function lapValues(wayId: string, excludeRideId?: string): number[] {
  return ghostsFor(wayId, excludeRideId).map((r) => scoredS(r.lap) as number);
}
```

**Lines 180–183 — positionAmong:**
```typescript
export function positionAmong(value: number, history: number[]): { pos: number; of: number } {
  const all = [...history, value].sort((a, b) => a - b);
  return { pos: all.indexOf(value) + 1, of: all.length };
}
```

**Lines 77–79 — ghostsFor:**
```typescript
export function ghostsFor(wayId: string, excludeRideId?: string): RideResult[] {
  return rankedFor(wayId).filter((r) => r.rideId !== excludeRideId).slice(-WINDOW_PREV);
}
```

---

## 5. `app/src/store/results.ts` — tower Function

**Lines 100–130 — tower function definition:**
```typescript
/**
 * The timing tower for one route (D-028) — B-28's whole seam.
 *
 * Ranked rows sort ascending by scored time (store/timing.ts — wall clock by
 * default, moving time opt-in) and carry 1-based positions; unrankable laps
 * are still returned, with `position: null`, so the surface can show today's
 * "NO TIME" row without inventing a rank for it. Archive-seeded laps rank as
 * marked ghosts.
 */
export function tower(results: RideResult[]): TowerRow[] {
  const rankable = results.filter(ranks);
  rankable.sort((a, b) => (scoredS(a.lap) as number) - (scoredS(b.lap) as number));
  const rows: TowerRow[] = rankable.map((r, i) => ({
    rideId: r.rideId,
    timeS: scoredS(r.lap) as number,
    position: i + 1,
    ghost: r.source === 'archive',
    interrupted: r.lap.quality === 'interrupted',
  }));
  for (const r of results) {
    if (ranks(r)) continue;
    rows.push({
      rideId: r.rideId,
      timeS: scoredS(r.lap) ?? r.lap.rawS,
      position: null,
      ghost: r.source === 'archive',
      interrupted: r.lap.quality === 'interrupted',
    });
  }
  return rows;
}
```

---

## 6. `app/src/ui/tower.tsx` — TimingTower Component & Animation

**Header doc-comment (lines 1–23):**
```
/**
 * TIMING TOWER (LAYOUT §3b, B-28/B-29, Nathan's 2026-08-15 rulings) — the
 * ranked column of past-self laps that heads the post-run board, into which
 * today's lap slots in. This component owns ANATOMY + MOTION only; which laps
 * populate it (window, dedup, gap semantics) is the PO's layer, and — B-28
 * UNBUILT — the real benchmark/ride-history store does not exist yet, so the
 * REAL app has no provider: only the Preview demo feeds it rows. View-model
 * in, pixels out — nothing here knows where rows came from (one render path,
 * LAYOUT §3.8).
 *
 * Row: P# · tier-coloured time (+ PB ●) · gap to P1 · date. Today ≈1.5× row
 * height, time at display size, accent-yellow left bar (identity chrome,
 * never a tier). Estimated lap = unranked "NO TIME" (dashed-grey time, sits
 * last, travels zero rows). Archive-seeded ghosts carry a ○ marker (D-018).
 * Position is a FACT — no failure styling for low positions (D-013).
 *
 * The slot-in (§3b): on a freshly finished board only (`justFinished`),
 * today's row enters at the BOTTOM and travels UP to its rank over ~700 ms
 * ease-out, the rows it passes stepping down; arrival (accent bar + TODAY)
 * fades in over ~200 ms. Upward is the only direction — zero travel still
 * gets the arrival fade, never an animation of failure. Plays exactly once:
 * never on revisit, never from HISTORY (guarded here AND by the caller).
 */
```

**TowerRowModel interface (lines 31–47):**
```typescript
export interface TowerRowModel {
  /** 1-based rank; null = unranked (estimated "NO TIME" — §2a.3) */
  pos: number | null;
  /** 'm:ss', or 'NO TIME' for an unranked estimated lap */
  time: string;
  /** colours the TIME only — position/gap/date stay ink (§3b) */
  tier: Tier;
  /** signed gap to P1; '—' for P1; '' when unranked */
  gap: string;
  /** past self, e.g. 'Tue 05 Aug'; ignored on the today row (renders TODAY) */
  date: string;
  today?: boolean;
  /** archive-seeded lap (D-018 pre-seeding) — ghost ○ marker */
  ghost?: boolean;
  /** all-time PB ● beside the time, as everywhere (D-007) */
  pb?: boolean;
}
```

**TimingTower component signature (lines 76–88):**
```typescript
export function TimingTower({
  model,
  justFinished = false,
  ceremony = false,
  onPlayed,
}: {
  model: TowerModel;
  /** true only on the board pushed by the final gate — arms the slot-in */
  justFinished?: boolean;
  /** §3a.3: REFERENCE SET frame — collapses to today's all-purple row alone */
  ceremony?: boolean;
  onPlayed?: () => void;
})
```

**Animation constants and refs (lines 56–95):**
```typescript
const MAX_VISIBLE = 8; // rows without scroll [ASSUMPTION §3b — PO's window call]
const PAST_H = 38;
const TODAY_ROW_H = 56; // ~1.5× — today's row doubles as the board headline
const SUB_H = 18;
const SLOT_IN_MS = 700; // [ASSUMPTION §3b — tune on device]
const ARRIVE_MS = 200;
...
  const played = useRef(false);
  // travel: 1 = today still at the bottom, 0 = arrived at rank.
  const travel = useRef(new Animated.Value(justFinished ? 1 : 0)).current;
  // arrive: accent bar + TODAY label opacity.
  const arrive = useRef(new Animated.Value(justFinished ? 0 : 1)).current;
```

**Animation effect block (lines 113–128):**
```typescript
  useEffect(() => {
    if (!justFinished || played.current || todayIdx < 0) return;
    played.current = true; // plays exactly once (§3b.3)
    travel.setValue(1);
    arrive.setValue(0);
    Animated.sequence([
      Animated.timing(travel, {
        toValue: 0,
        duration: SLOT_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(arrive, { toValue: 1, duration: ARRIVE_MS, useNativeDriver: true }),
    ]).start(() => onPlayed?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justFinished]);
```

**Key facts:**
- `SLOT_IN_MS = 700` — today's row travels from bottom to final rank in 700 ms with Easing.out(Easing.cubic).
- `ARRIVE_MS = 200` — accent bar + TODAY label fade in over 200 ms AFTER arrival.
- Animation plays exactly once: `played.current = true` guard prevents re-run.
- `onPlayed` callback fires after animation completes.
- **NO COLOUR FLIP CURRENTLY IN THE COMPONENT** — the component does not handle colour change; that is the responsibility of the data fed to it (TowerRowModel's tier).

---

## 7. `app/src/ui/towerModel.ts` — Full File

**Overview (lines 1–20):** Pure view-model builder — no store reads, headless-testable. Window of RideResults → TowerModel.

**buildTowerModel signature and logic (lines 50–121):**
```typescript
export function buildTowerModel(
  window: RideResult[],
  todayLapS: number | null,
  todayEstimated: boolean,
  todayAtMs: number,
  allTimeBestS: number | null,
): TowerModel {
  // The window comes from ghostsFor(), whose ranks() filter already drops
  // null scored times — this filter is belt-and-braces, never semantics.
  const past = window
    .filter((r) => scoredS(r.lap) !== null)
    .map((r) => ({
      value: scoredS(r.lap) as number,
      startedAtMs: r.startedAtMs,
      // Absent source (malformed entry) reads as ghost too — undefined !== 'app'.
      ghost: r.source !== 'app',
    }));
  const values = past.map((e) => e.value);
  const todayUnranked = todayEstimated || todayLapS === null;

  interface Working { value: number; today: boolean; ghost: boolean; date: string; tier: UiTier }
  const ranked: Working[] = past.map((e, i) => ({
    value: e.value,
    today: false,
    ghost: e.ghost,
    date: towerDate(e.startedAtMs),
    tier: tierFor(e.value, values.filter((_, j) => j !== i)),
  }));
  if (!todayUnranked) {
    ranked.push({
      value: todayLapS as number,
      today: true,
      ghost: false,
      date: towerDate(todayAtMs), // ignored by the component — it renders TODAY
      tier: tierFor(todayLapS, values),
    });
  }
  // Stable sort: on a tie, today (appended last) sits after the past lap.
  ranked.sort((a, b) => a.value - b.value);

  const p1 = ranked.length > 0 ? ranked[0].value : null;
  let pbFree = allTimeBestS !== null; // ● goes to the FIRST equal row only
  const rows: TowerRowModel[] = ranked.map((w, i) => {
    const pb = pbFree && w.value === allTimeBestS;
    if (pb) pbFree = false;
    return {
      pos: i + 1,
      time: fmt(w.value),
      tier: toTier(w.tier),
      gap: i === 0 ? '—' : `+${Math.round(w.value - (p1 as number))}s`,
      date: w.date,
      today: w.today,
      ghost: w.ghost,
      pb,
    };
  });

  if (todayUnranked) {
    // D-028: unranked, LAST — the slot-in travels zero rows from there.
    rows.push({
      pos: null,
      time: 'NO TIME',
      tier: 'est',
      gap: '',
      date: towerDate(todayAtMs),
      today: true,
      ghost: false,
      pb: false,
    });
  }

  return { rows };
}
```

**Key insight:** The tier is computed HERE, in buildTowerModel (line 84: `tier: tierFor(todayLapS, values)`), NOT in the animation. The component receives pre-baked tier values.

---

## 8. `app/src/ui/preview/PreviewScreen.tsx` — Tower Usage

**Line 32 — import:**
```typescript
import { TimingTower } from '../tower';
```

**Line 105 — justFinished state:**
```typescript
  const [justFinished, setJustFinished] = useState(false);
```

**Lines 306–320 — Two TimingTower invocations:**
```typescript
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
```

**Current usage:** The Preview screen ALREADY passes `justFinished={justFinished}` to arm the animation and `onPlayed={() => setJustFinished(false)}` to reset it. This is the ONLY existing consumer of the animation.

---

## 9. `app/src/ui/preview/data.ts` — Sample Tower Data

**TowerRowModel structure (examples from lines 310–330):**
```typescript
const TROW = (
  pos: number | null,
  time: string,
  tier: Tier,
  gap: string,
  date: string,
  f?: { today?: boolean; ghost?: boolean; pb?: boolean },
): TowerRowModel => ({ pos, time, tier, gap, date, ...f });

const TOWER_MIXED: TowerRowModel[] = [
  TROW(1, '14:31', 'purple', '—', 'Tue 05 Aug', { pb: true }),
  TROW(2, '14:46', 'green', '+0:15', '', { today: true }),
  TROW(3, '14:47', 'none', '+0:16', 'Thu 14 Aug'),
  TROW(4, '14:52', 'none', '+0:21', 'Mon 28 Jul'),
  TROW(5, '15:05', 'none', '+0:34', 'Wed 23 Jul', { ghost: true }),
  TROW(6, '15:11', 'none', '+0:40', 'Thu 07 Aug'),
];
```

**Sample row:** `TROW(2, '14:46', 'green', '+0:15', '', { today: true })` — today's row, ranked 2nd, green tier, +0:15s from P1, no date text (component renders "TODAY").

---

## 10. `app/src/ui/RecordScreen.tsx` — Live-Ride Integration

**Line 36 — getLiveTowerPosition import (confirmed):**
```typescript
import { getLiveTowerPosition } from '../live/towerSource';
```

**Lines 902–908 — livePos memo (mid-ride "P4" among selfs on map):**
```typescript
  // follow-up (live PX, R10): 'P4' among the selfs on the map, by chainage —
  // null before START, once the lap lands (the handover PosChip then owns
  // the fact), off the route, or with self dots off.
  const livePos = useMemo(() => {
    if (live.mode !== 'route' || !settings.selfDots || live.startGateT === null || live.lap !== null) return null;
    const p = selfLivePosition(selfDots, live.chainageM);
    return p === null ? null : `P${p}`;
  }, [selfDots, live.chainageM, live.startGateT, live.lap, live.mode, settings.selfDots]);
```

**Note:** This is a DIFFERENT, mid-ride indicator (live position among "selfs"/companions on the map), distinct from the final rank chip.

**Lines 1152–1159 — LiveSectorPane invocation in 'running' phase (line 1117 conditional):**
```typescript
        <LiveSectorPane
          vm={viewModelFromEngine(
            live,
            realTimebase(session.startedAtMs),
            getLiveTowerPosition(live), // real position once the lap lands
            tierOf,
            livePos,
          )}
          showLap={showLap}
        />
```

**KEY FACT:** `getLiveTowerPosition(live)` is passed as the 3rd argument to `viewModelFromEngine`, which becomes `vm.posChip`. This feeds the rank into the live screen as soon as the lap lands, during the ride (before STOP).

**Lines 519–598 — onEnd callback (STOP/END button handler):**
```typescript
  const onEnd = useCallback(async () => {
    setBusy(true);
    try {
      liveEngine.finalize();
      const s = sessionRef.current;
      endedRef.current = s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : null;
      const finalState = liveEngine.getState();
      rememberRide(finalState, s ? { rideId: s.rideId, startedAtMs: s.startedAtMs } : undefined);
      rememberFreeRide(finalState, s ? { startedAtMs: s.startedAtMs } : undefined);
      const sum = await stopTracking();
      setLastSummary(sum);
      const draft = s
        ? await draftRouteFromRide(s.rideId, s.startedAtMs, finalState.track, createExpoFsAdapter(), s.sportId ?? activeSportId())
        : null;
      setSession(null);
      setRecovered(false);
      setPauseMenu(false);
      setTrail([]);
      setFromExplicit(false);
      setPhase('ending');
      setNaming(draft);
      if (draft === null) setShowAnim('rev');
    } catch (e) {
      Alert.alert('Could not stop cleanly', e instanceof Error ? e.message : String(e));
      setPhase(sessionRef.current ? 'running' : 'setup');
    } finally {
      setBusy(false);
    }
  }, []);
```

**Key steps in order:**
1. Line 520: `liveEngine.finalize()` — settle the route.
2. Lines 531–533: Capture rideId/startedAtMs for post-stop handoff.
3. Line 534: `rememberRide(finalState, ...)` — save the ride.
4. Line 535: `stopTracking()` — stop location updates.
5. Lines 542–547: Route/naming draft logic.
6. **Line 550:** `setPhase('ending')` — flip to 'ending' phase (THE MOMENT THE SCREEN CHANGES).
7. Line 551: `setNaming(draft)` — set the naming card.
8. Line 553: `setShowAnim('rev')` — arm the reversed launch animation (if no naming offer).

**Lines 1061–1108 — 'ending' phase render block:**
```typescript
  if (phase === 'ending') {
    return (
      <View style={styles.raceColumn}>
        <Text style={styles.trackLine}>
          {lastSummary ? `Ride saved — ${fmtElapsed(lastSummary.endMs - lastSummary.startMs)}.` : 'Ride saved.'}
        </Text>
        {adjust !== null ? (
          <GateAdjustCard
            wayId={adjust.wayId}
            refLine={adjust.ref}
            refLengthM={adjust.refLengthM}
            initialChainageM={adjust.chainageM}
            busy={busy}
            onKeep={onAdjustKeep}
            onSave={onAdjustSave}
          />
        ) : naming !== null ? (
          <RouteNamingCard
            startExistingLabel={existingLandmarkLabel(naming.start)}
            endExistingLabel={existingLandmarkLabel(naming.end)}
            loop={naming.loop}
            busy={busy}
            matchedWayId={naming.matchedWayId ? wayLabelIn(currentCatalog(), naming.matchedWayId) : null}
            existingRoute={naming.existingRouteId ? existingRouteProps(naming.existingRouteId) : null}
            vocabulary={specVocabulary(activeCatalog().ways)}
            onSave={onNamingSave}
            onSkip={onNamingSkip}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        {showAnim === 'rev' && (
          <LaunchAnimation
            reverse
            onDone={() => {
              setShowAnim(null);
              setPhase('setup');
              const ended = endedRef.current;
              endedRef.current = null;
              if (ended) {
                tabNav.openRide({ rideId: ended.rideId, source: 'post-stop', startedAtMs: ended.startedAtMs });
              }
            }}
          />
        )}
      </View>
    );
  }
```

**Key sequence:**
- Line 1090: `showAnim === 'rev'` — the reversed launch animation plays.
- Line 1093: `onDone` callback after animation completes.
- Line 1096: `setPhase('setup')` — return to idle setup.
- Lines 1097–1102: Open the ride detail overlay if a rideId exists.

---

## 11. `marketing/silent-studio/ranking/index.html` — Reference Animation

**Structure:** 10 past-ride rows (P1–P10) + 1 "today" row initially below (top:600px, opacity:0).

**Today's row markup (line 160):**
```html
<div class="trow today" id="trow-today" style="top:600px"><span class="who">Today</span><span class="time num">17:08.9</span></div>
```

**Timing constants (line 266):**
```javascript
var CLIMB_T0 = 3.20, CLIMB_DUR = 2.2;
```

**Animation sequence (BEAT 2, lines 265–282):**
```javascript
    tl.to('#trow-10', { opacity: 0, y: 60, duration: 0.35, ease: 'power2.in' }, 3.00);
    var CLIMB_T0 = 3.20, CLIMB_DUR = 2.2;
    tl.fromTo('#trow-today', { y: 0 }, { y: -540, duration: CLIMB_DUR, ease: 'power2.out' }, CLIMB_T0);
    // Fade-in shortened 0.4 -> 0.25 with the new ease: Today now reaches row 9 at 3.39s and should be solid by then.
    tl.fromTo('#trow-today', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' }, CLIMB_T0);
    // Colour flip, not a fade: Today rides up white (same var(--ink) as every other
    // row) and turns green -- a P2 finish, not purple -- the instant it lands in
    // slot 2, same discrete "flip on completion" rule as the app's own sector strip.
    // Timed to the exact landing instant (also where the audio's green settle chime
    // fires), not before.
    tl.set('#trow-today .who, #trow-today .time', { color: '#00D000' }, CLIMB_T0 + CLIMB_DUR);
    // [row, start] — start = (CLIMB_T0 + u_cross * CLIMB_DUR) - 0.15, where u_cross is when Today's
    // top is half a slot below that row's top (Today at slot 10 pitch, rows at 60*(k-1)):
    // e_cross(k) = (570 - 60*(k-1)) / 540, u_cross = 1 - sqrt(1 - e_cross).
    var STEP_DOWN = [[9, 3.24], [8, 3.38], [7, 3.53], [6, 3.69], [5, 3.88], [4, 4.09], [3, 4.35], [2, 4.73]];
    STEP_DOWN.forEach(function (s) {
      tl.to('#trow-' + s[0], { y: 60, duration: 0.3, ease: 'power2.inOut' }, s[1]);
    });
```

**Key timing:**
- **CLIMB_T0 = 3.20 s** — today starts climbing.
- **CLIMB_DUR = 2.2 s** — climb duration (power2.out easing: fast off the line, decelerating into landing).
- **Landing at CLIMB_T0 + CLIMB_DUR = 5.40 s** — today lands in slot 2.
- **Colour flip at 5.40 s** — `tl.set(..., { color: '#00D000' }, 5.40)` — instant colour change (not a fade) the moment of landing.
- **Each row steps down 60px** — rows 9–2 step down one by one as today passes them (pre-computed step times, frame-seek safe).

**Easing:** `power2.out` — from GSAP, equivalent to cubic-out in React Native (`Easing.out(Easing.cubic)`).

---

## 12. `marketing/silent-studio/ranking/theme.js`

```javascript
document.documentElement.setAttribute('data-theme','night');
```

Simple theme setter — no animation logic.

---

## 13. `marketing/silent-studio/ranking/rounds/v7/FEEDBACK.md` — Full Text

```markdown
# ranking — round v7 (rendered, confirmed, picked)

**Render:** `ranking_2026-09-16_19-15-00.mp4` — picked into this folder as `ranking_v7.mp4`
and mirrored to `silent-studio/all-renders/ranking_v7.mp4`. Duration unchanged at 10.8s.

## What changed since v6

Nathan: "Instead of having it come up the ranking already green. Lets have it come up
white, and become green only when it slots in the P2 position."

- Removed the static `.trow.today .who, .trow.today .time { color: #00D000; }` CSS rule
  (v6's fix for the P2-not-purple bug, but it coloured the row green from frame 0 —
  including during the whole climb, not just on arrival).
- Today's row now inherits the same white (`var(--ink)`) as every other row in the
  tower while it climbs.
- Added `tl.set('#trow-today .who, #trow-today .time', { color: '#00D000' }, CLIMB_T0 + CLIMB_DUR)`
  — an instant flip (not a fade), timed to the exact moment Today lands in slot 2
  (5.4s), matching the same "flip on completion, never progressive" rule the app's own
  sector strip uses. This also lines up exactly with the audio's green settle chime,
  which already fires at 5.4s — no audio change was needed.

## Verification (confirmed against the rendered v7 mp4)

- [x] Today's row reads plain white (identical to the other nine rows) throughout the
      0-5.4s climb — stills at 4.0s and 5.2s (just after landing, before the flip)
      both show plain white text, no green tint anywhere before landing.
- [x] The colour flip at 5.4s is a hard cut, not a fade — still at 5.6s shows Today's
      row fully green and settled; combined with the 5.2s still, the flip happens
      within that ~0.4s window as an instant colour change, not a gradual one.
- [x] No stray colour flash or flicker during the climb — the only colour-touching
      code is the single `tl.set`, and the 4.0s/5.2s/5.6s stills show clean white ->
      white -> green with nothing in between.

## Audio

`audio-studio/ranking/soundv3/soundtrack_v3.wav` (GREEN_CHIME fix, already built for v6)
remuxed onto this video with no further changes — the colour flip still lands at
exactly 5.4s, same instant the settle chime already fires at. Output:
`ranking_v7_with_sound_v3.mp4`, duration 10.8s confirmed via ffprobe, mean volume
-23.5dB / max -0.9dB (healthy, consistent with v6).
```

**Critical insight:** Nathan's final approved animation shows:
1. **White climb (0–5.4s):** Today's row climbs up from the bottom in plain white, visually indistinguishable from the other rows.
2. **Instant flip (at 5.4s):** The moment Today lands in slot 2, its text changes to green (#00D000) — NOT a progressive fade, a hard discrete flip.
3. **Audio sync:** The colour flip lands exactly when the green settle chime fires (5.4s), creating a unified audio-visual moment.

---

## 14. `STATE.md` — Scoring and Live Screen Rules

**Scoring section (lines 194–208):**
```
- **Scoring:** three colour tiers (purple/green/yellow). **Reverted 2026-09-16
  (`cycles/virgin-cycle9/`) to cycle7's F1-broadcast hex** — `#9000C8`/`#00D000`/`#F5C542`,
  `purpleDeep` `#65008C` — undoing cycle8's phone-matched picks
  (`#6D4E9C`/`#8BCD39`/`#FFDE6D`), which Nathan had already rejected on phone testing
  2026-09-15 ("too faint... I would just keep the current colours we have",
  `marketing/hex-colours/SUMMARY.md`). Every file cycle8's colour-swap commit (`6da58a2`)
  touched was restored byte-for-byte from its parent commit — theme.ts, the D-030 hue-band
  firewall + its tests, the launcher icon, and the marketing/product colour references —
  except cycle8's own documentation and the scripts it added (`dev-phone.ps1`,
  `recolour-icon.py`), which stay regardless of which hex ships. No noise floor below
  a single ride (D-045 ruling 1, built as NW-1, 2026-09-08): a way's reference ride (ride 1)
  gets no colour verdict on the day it's ridden — it earns a rank once stored, but nothing to
  compare against yet — one prior ride compares purple/yellow only; two or more run the full
  model on the average of that way's rides on record. The ranking window is the 9 most recent
  previous rides plus the current one — never a global ranking, never "of 11".
```

**Live ride screen rules (lines 219–230):**
```
- **The live ride screen shows a real map** (MapLibre + OpenFreeMap), heading-up, locked
  zoom, no pan/zoom while moving, reference line + own position only. **Since virgin-cycle6,
  plus self dots:** the way's comparison window (`ghostsFor`, ≤ 9 rides) replayed from their
  own fixes, timed from the START gate; toggle `selfDots`. The reference ride races nobody;
  ride k races k − 1, capped at 9. Follow-up: three tiers by the colour model's own rule,
  P1 on top, live `P` on the context row.
```

---

## 15. Reference Point: Static Position Displays (OUT OF SCOPE)

**`app/src/ui/RidesScreen.tsx` line ~155:**
```typescript
                    <Text style={styles.rank}>
                      {item.rank ? `P${item.rank.pos}/${item.rank.of}` : '–'}
                    </Text>
```

**`app/src/ui/ResultsDetailScreen.tsx` lines 73 and 170:**
```typescript
  // (line ~73) — post-ride result header:
  const selectedPosLabel = s.tower && selectedBoardRow !== null && selectedBoardRow.pos !== null
    ? `P${selectedBoardRow.pos} of ${board.total}`
    : '';

  // (line ~170) — history list row:
  <Text style={[styles.histPos, { color: t.textDim }]}>{row.pos !== null ? `P${row.pos}` : '—'}</Text>
```

**Note:** These are EXISTING, STATIC position displays in the Rides list and Results board — separate views, out of scope for this feature. The feature affects ONLY the live-ride-finish moment (during/just after STOP) and the subsequent ranking reveal animation.

---

## Summary Findings

**Current state:**

1. **Live-screen rank chip:** `getLiveTowerPosition(live)` returns a static "P# of N" string as soon as the lap lands (during the ride, before STOP), rendered via `liveView.tsx`'s `PosChip` component (lines 285 in liveView.tsx).

2. **TimingTower animation component:** EXISTS and WORKS, only in the Preview screen. Accepts `justFinished` prop to arm the slot-in animation (~700 ms travel + ~200 ms arrival fade). Uses Animated.sequence with `travel` and `arrive` Animated.Value refs, plays exactly once per board push.

3. **Animation easing:** Easing.out(Easing.cubic) for travel (700 ms), immediate for arrival (200 ms).

4. **Colour handling:** TimingTower receives a pre-baked `tier` field in each TowerRowModel. No colour-flip logic inside the component currently — colour is static for each row.

5. **Reference animation:** `marketing/silent-studio/ranking/` shows the exact desired behaviour:
   - Today climbs white (0–5.4s).
   - Colour flips to green (#00D000) at landing (5.4s), not progressively.
   - Each overtaken row steps down 60px when today passes it (power2.inOut easing on step).
   - Audio chime fires at the same landing instant (5.4s).

6. **RecordScreen integration:** 
   - CURRENTLY: `getLiveTowerPosition(live)` is passed to `viewModelFromEngine()` during the 'running' phase, showing the rank chip as soon as the lap lands.
   - **NEEDED:** Suppress that chip during 'running', defer it until 'ending', then show the animated reveal.
   - The 'ending' phase already plays a reversed LaunchAnimation; the ranking climb could play in the same phase or overlay it.

**Architectural opportunity:** The `TimingTower` component is already built and animated. The Preview screen already proves the pattern works. The only missing pieces are: (a) suppress `getLiveTowerPosition()` from feeding a rank chip during 'running', (b) build/populate a TowerModel in the 'ending' phase with the final ranked board, (c) pass `justFinished={true}` to `TimingTower` to trigger the animation, and (d) add a colour-flip mechanism on the today row matching the reference (white during climb, flip to final tier colour on landing — if a colour-flip animation is desired; if not, the tier is baked in the model as it is now).

