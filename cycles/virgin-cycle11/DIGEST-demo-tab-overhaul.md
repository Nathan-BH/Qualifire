# DIGEST: Demo Tab Overhaul Work

**Coordinator:** Haiku Digest tier  
**Date:** 2026-09-19  
**Purpose:** Line-anchored factual report on current demo tab implementation and related tower/ranking/self-race features, to support Plan-tier design of Nathan's three feature requests.

---

## 1. DemoScreen.tsx (full file, 241 lines)

**File:** `app/src/ui/DemoScreen.tsx`

**Current mode type (line 39):**
```typescript
export default function DemoScreen() {
  // ...
  const [mode, setMode] = useState<DemoMode>('second');  // line 68
```
where `DemoMode = 'first' | 'second'` (imported from demoModel.ts, line 40).

**Key constants:**
- Line 49: `const RATE = 25;` — speed multiplier (~14-minute commute plays in ~34 s)
- Line 50: `const TICK_MS = 33;` — redraw interval (~30 fps)
- Line 54: `const DEMO_FIRST_RIDE_ID = 'demo:first-ride';` — non-null fake id for rider-only path
- Line 55: `const FIRST_RIDE_STATUS = 'writing history · no known route here';` — display text for first ride

**start() function (lines 103–125):**
Sets clock to 0, begins wall-clock-anchored interval at 25× speed, stops when lap complete.

**switchMode(m: DemoMode) function (lines 128–139):**
Switches between modes ('first'/'second'), clears in-flight state, stops any running demo.

**View model (lines 173–193):**
```typescript
const vm: LiveViewModel = {
  clock: { anchorRealMs: Date.now(), anchorClockMs: clockS * 1000, rate: 1, running: false },
  contextLabel: gatesDone < 4 ? `S${gatesDone + 1}` : '',
  flash: null,
  flashKey: 0,
  lap: gatesDone >= 4
    ? { tier: tierOf(0, script.lap), time: fmtMS(script.lap), delta: '' }
    : null,
  posChip: null,  // LINE 188 — FLAGGED BELOW
  strip: script.secs.map((v, i) => ({
    tier: i < gatesDone ? tierOf(i + 1, v) : ('none' as Tier),
    label: `S${i + 1}`,
    time: i < gatesDone ? fmtMS(v) : undefined,
    current: i === gatesDone,
  })),
};
```

**FLAGGED DISCREPANCY (lines 176–178):** Current `vm.lap` is built with immediate tier colour ON FINISH:
```typescript
lap: gatesDone >= 4
  ? { tier: tierOf(0, script.lap), time: fmtMS(script.lap), delta: '' }
  : null,
```
This is the OLD behaviour. Cycle11's new ranking-reveal design (rankingRevealModel.ts) implements DEFERRED neutral-then-hard-flip-on-STOP (see section 8 below). **EXPLICIT CONFLICT:** DemoScreen's vm.lap still shows immediate tier colour, NOT the deferred-neutral design cycle11 introduced. Plan must decide: does demo need to match the cycle11 reveal behaviour, or is the immediate-colour vm acceptable for demo-only?

**JSX return (lines 195–241):**
- Lines 196–199: Header "DEMO RIDE" with subtitle
- Lines 201–211: Pill row with FIRST RIDE and SECOND RIDE toggles (`mode === 'first' ? ... : ...`)
- Lines 213–226: Conditional WayMapView (SECOND RIDE with `sectorColours` prop; FIRST RIDE with `trail` prop)
- Lines 228–235: Conditional LiveSectorPane (SECOND RIDE) or text status (FIRST RIDE)
- Lines 237–239: RUN DEMO RIDE button, disabled while running

**No third pill exists.** Only two modes; no TENTH RIDE yet. **No selfs prop passed to WayMapView.** The self-racing dots (cycle6 feature) are not yet visible in demo.

---

## 2. demoModel.ts (full file, 73 lines)

**File:** `app/src/ui/demoModel.ts`

**DemoMode type (line 20):**
```typescript
export type DemoMode = 'first' | 'second';
```

**DEMO_HISTORY (lines 28–32):**
```typescript
export const DEMO_HISTORY: readonly (readonly number[])[] = [
  [190, 195, 188, 200, 192, 197],   // S1: best 188, mean ~193.7
  [210, 205, 215, 208, 212, 206],   // S2: best 205, mean ~209.3
  [230, 225, 235, 228, 232, 226],   // S3: best 225, mean ~229.3
  [210, 205, 215, 208, 212, 206],   // S4: best 205, mean ~209.3
];
```
Six pinned past laps per sector, used to compute verdicts on the one scripted ride.

**DEMO_SECS (line 36):**
```typescript
export const DEMO_SECS: readonly number[] = [185, 207, 237, 207];
```
The fixed scripted lap: S1 185s, S2 207s, S3 237s, S4 207s. Total lap = 836s.

**buildDemoScript(secs) (lines 39–44):**
```typescript
export function buildDemoScript(secs: readonly number[] = DEMO_SECS): DemoScript {
  const gateAt: number[] = [0];
  secs.reduce((acc, v) => { gateAt.push(acc + v); return acc + v; }, 0);
  return { secs, gateAt, lap: secs.reduce((a, b) => a + b, 0) };
}
```
Returns `{ secs, gateAt: [0, 185, 392, 629, 836], lap: 836 }`.

**demoTier(i, value) (lines 46–49):**
```typescript
export function demoTier(i: number, value: number | null): UiTier {
  const history = i === 0 ? DEMO_LAP_HISTORY : DEMO_HISTORY[i - 1];
  return tierFor(value, history as number[]);
}
```
Judges sector i (1-based) or lap (i=0) against pinned history.

**demoSectorColours(script, gatesDone, paint) (lines 51–61):**
```typescript
export function demoSectorColours(
  script: DemoScript, gatesDone: number, paint: (tier: UiTier) => string | null,
): (string | null)[] {
  return [
    null,
    ...script.secs.map((v, idx) => {
      const i = idx + 1;
      return i <= gatesDone ? paint(demoTier(i, v)) : null;
    }),
  ];
}
```
Returns array of gate-indexed tier colours, null for unearned sectors.

---

## 3. demoWayFixture.ts (exports)

**File:** `app/src/ui/demoWayFixture.ts`

**DEMO_WAY_ID (line 19):**
```typescript
export const DEMO_WAY_ID = 'demo:second-ride';
```
Not a catalog id, used only as RouteMapView's zoom-reset key.

**DEMO_WAY_ASSET (lines 21–172):**
```typescript
export const DEMO_WAY_ASSET: WayAsset = {
  image: '',
  w: 900,
  h: 1400,
  x0: 0.08095268167074943,
  y1: 1.0343507781932277,
  scale: 900967.8450941328,
  offx: 60,
  offy: 355.11880409641395,
  sourceRide: 'demo:second-ride',
  gateIdx: [7,40,76,120,157],  // 5 gate indices into the path array
  gates: [
    { name: "START", lat: 50.83636, lon: 4.64036, px: 93.22661935770469, py: 1037.7351113655393 },
    { name: "G1", lat: 50.84342, lon: 4.65127, px: 264.78479124247485, py: 861.9325726643979 },
    { name: "G2", lat: 50.85111, lon: 4.66399, px: 464.80495131343883, py: 670.4120008076726 },
    { name: "G3", lat: 50.85875, lon: 4.6705, px: 567.173759651637, py: 480.1054159585538 },
    { name: "FINISH", lat: 50.8636, lon: 4.68614, px: 813.1104973489587, py: 359.2794279316513 },
  ],
  path: [172 coordinate pairs, [lat, lon], spanning Brussels area roughly 50.836–50.864 N, 4.638–4.686 E]
};
```
Frozen geometry: 172-point path with 5 gates (START, G1, G2, G3, FINISH), scale info for PNG rendering, ~1.5 km long (Brussels commute).

---

## 4. wayMapMath.ts — positionAtTime (lines 168–200)

**File:** `app/src/ui/wayMapMath.ts`

```typescript
export function positionAtTime(
  a: WayAsset, gateTimes: number[], tSec: number,
): { lat: number; lon: number } | null {
  const path = a.path;
  const idx = a.gateIdx;
  if (!path || !idx || path.length < 2 || idx.length !== gateTimes.length) return null;

  let k = 0;
  while (k < gateTimes.length - 2 && tSec >= gateTimes[k + 1]) k++;
  const span = Math.max(gateTimes[k + 1] - gateTimes[k], 1e-6);
  const f = Math.max(0, Math.min(1, (tSec - gateTimes[k]) / span));

  const i0 = idx[k];
  const i1 = Math.max(idx[k + 1], i0 + 1);
  // cumulative planar length over this sector's slice of the path
  const cum: number[] = [0];
  for (let i = i0; i < i1 && i + 1 < path.length; i++) {
    const dy = (path[i + 1][0] - path[i][0]) * 111320;
    const dx = (path[i + 1][1] - path[i][1]) * 111320 * Math.cos((path[i][0] * Math.PI) / 180);
    cum.push(cum[cum.length - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1];
  if (total <= 0) return { lat: path[i0][0], lon: path[i0][1] };

  const want = f * total;
  let j = 0;
  while (j < cum.length - 2 && cum[j + 1] < want) j++;
  const segLen = Math.max(cum[j + 1] - cum[j], 1e-9);
  const g = Math.max(0, Math.min(1, (want - cum[j]) / segLen));
  const p0 = path[Math.min(i0 + j, path.length - 1)];
  const p1 = path[Math.min(i0 + j + 1, path.length - 1)];
  return { lat: p0[0] + (p1[0] - p0[0]) * g, lon: p0[1] + (p1[1] - p0[1]) * g };
}
```
**Purpose:** Given a WayAsset, gate-crossing times, and elapsed time tSec, returns interpolated {lat, lon} along the route. Used by DemoScreen to place the moving dot. Binary-searchable for use by self-racing (section 9 below).

---

## 5. tabNav.tsx (full file, 101 lines)

**File:** `app/src/ui/tabNav.tsx`

**Tab type (line 19):**
```typescript
export type Tab = 'record' | 'rides' | 'routes' | 'results' | 'settings' | 'demo';
```

**TabNav interface (lines 43–85):** Public API for screens to navigate and open overlays:
```typescript
export interface TabNav {
  go(tab: Tab): void;
  /** WP-H: show the full-screen ride detail over whatever tab is active
   * (Shell mount-swaps it in and hides the tab bar, same chrome rule as
   * WP-A2's recFullscreen). Idempotent: re-opening replaces the request. */
  openRide(req: RideDetailRequest): void;
  closeRide(): void;
  /** WP-J: show the full-screen gate editor over whatever tab is active
   * (Shell mount-swaps it in and hides the tab bar — the same chrome rule as
   * openRide). Idempotent: re-opening replaces the request. */
  openGateAdjust(req: GateAdjustRequest): void;
  closeGateAdjust(): void;
  /** WP-K (cycle 2): show the full-screen place/way detail over the ROUTES
   * tab (Shell mount-swaps it in and hides the tab bar). */
  openCatalog(req: CatalogDetailRequest): void;
  closeCatalog(): void;
  /** WP-2: show the full-screen RESULTS detail for one way. */
  openResults(req: ResultsDetailRequest): void;
  closeResults(): void;
}
```

**FLAGGED PATTERN (established idiom for full-screen overlays):**
The repeated "screen owns intent, Shell owns chrome" pattern, documented in method comments:
- **openRide/closeRide** (WP-H) — ride detail overlay, Shell hides tab bar
- **openGateAdjust/closeGateAdjust** (WP-J) — gate editor overlay, Shell hides tab bar
- **openCatalog/closeCatalog** (WP-K) — catalog detail overlay, Shell hides tab bar
- **openResults/closeResults** (WP-2) — results detail overlay, Shell hides tab bar

Each opens a full-screen MOUNT-SWAP that hides the tab bar. **Key implication for Nathan's request:** RUN DEMO RIDE should follow this pattern — a third overlay like the others, not a new mode within the pill row.

---

## 6. App.tsx (lines 1–296)

**File:** `app/App.tsx`

**recFullscreen state and onFullscreenChange (lines 73–77):**
```typescript
const [recFullscreen, setRecFullscreen] = useState(false);
// WP-H: the full-screen ride detail, mount-swapped in place of the active
// tab's screen while non-null. Second instance of WP-A2's "screen owns
// intent, Shell owns chrome" split (recFullscreen above).
const [rideDetail, setRideDetail] = useState<RideDetailRequest | null>(null);
```
RecordScreen is invoked (line 207):
```typescript
: tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />
```

**tabBarHidden condition (lines 158–160):**
```typescript
const tabBarHidden = (tab === 'record' && recFullscreen)
  || rideDetail !== null || gateAdjust !== null || catalogDetail !== null || resultsDetail !== null;
```
The tab bar is hidden when:
1. On RECORD tab AND RecordScreen reports fullscreen, OR
2. Any of the five overlays (ride detail, gate adjust, catalog detail, results detail) are open.

**nav object build (lines 162–172):**
```typescript
const nav = useMemo<TabNav>(
  () => ({
    go: setTab,
    openRide: setRideDetail,
    closeRide: () => setRideDetail(null),
    openGateAdjust: setGateAdjust,
    closeGateAdjust: () => setGateAdjust(null),
    openCatalog: setCatalogDetail,
    closeCatalog: () => setCatalogDetail(null),
    openResults: setResultsDetail,
    closeResults: () => setResultsDetail(null),
  }),
  [],
);
```

**JSX return (lines 200–242):**
```typescript
return (
  <TabNavProvider nav={nav}>
    <View style={styles.root}>
      <View style={styles.content}>
        {gateAdjust !== null ? <GateAdjustScreen request={gateAdjust} />
          : rideDetail !== null ? <RideDetailScreen request={rideDetail} />
          : catalogDetail !== null ? <CatalogDetailScreen request={catalogDetail} />
          : resultsDetail !== null ? <ResultsDetailScreen request={resultsDetail} />
          : tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />
          : tab === 'rides' ? <RidesScreen />
          : tab === 'routes' ? <RoutesScreen />
          : tab === 'results' ? <ResultsScreen />
          : tab === 'settings' ? <SettingsScreen />
          : <DemoScreen />}
      </View>
      {!tabBarHidden && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {(['record', 'rides', 'routes', 'results', 'settings', 'demo'] as const).map((tb) => (
            <Pressable
              key={tb}
              style={[styles.tab, tab === tb && styles.tabActiveBar]}
              onPress={() => setTab(tb)}
            >
              <Text style={[styles.tabText, tab === tb && styles.tabActive]}>{tb}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <StatusBar style={chrome.statusBar} />
    </View>
  </TabNavProvider>
);
```

**Mount-swap chain:** Overlays are checked FIRST (gateAdjust, rideDetail, catalogDetail, resultsDetail), then tab screens. When an overlay is open, that overlay renders instead of the active tab. The tab bar is hidden whenever tabBarHidden is true.

---

## 7. routeNamingCard.tsx

**File:** `app/src/ui/routeNamingCard.tsx`

**RouteNamingCardProps interface (lines 27–56):**
```typescript
export interface RouteNamingCardProps {
  startExistingLabel: string | null;
  endExistingLabel: string | null;
  loop: boolean;
  busy: boolean;
  /** WP-F: set when the live engine scored this ride against a route */
  matchedWayLabel?: string | null;
  /** WP-G: set when draft.existingWayId is set */
  existingRoute?: { label: string; knownSpecLists: string[][] } | null;
  vocabulary?: string[];
  onSave: (names: RouteNames) => void;
  onSkip: () => void;
}
```

**Header doc comment (lines 1–19):**
```
/**
 * STOP-step naming card (OPEN-ITEMS item 2; COLD-START §3 step 5 — "the only
 * true onboarding step... this is where landmarks are born on a cold start").
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase whenever store/wayCreation.ts
 * drafted new endpoint(s) — since WP-F that includes a ride the live engine
 * DID score against some route, as long as its endpoint pair still has no
 * way of its own (matchedRouteLabel then swaps in the "scored as X, but…"
 * sub-copy so the card never contradicts what Result shows). Since WP-G an
 * existing directed way is ALSO offered here, in variant mode
 * (`existingWay` set): the card becomes "new route on this way" instead of
 * "new way", the endpoints render as fixed text (both already exist), and
 * ≥1 spec segment is required. Dumb UI: it owns only the two text inputs
 * and the spec segments; RecordScreen owns the draft, the build and the
 * saveUserCatalog() call. An endpoint that matched an EXISTING landmark
 * renders as fixed text, not an input. SKIP is always available and loses
 * nothing — the ride itself was already saved before this card exists.
 */
```

**RouteNamingCard invocation in RecordScreen.tsx (lines 1151–1161):**
```typescript
<RouteNamingCard
  startExistingLabel={existingLandmarkLabel(naming.start)}
  endExistingLabel={existingLandmarkLabel(naming.end)}
  loop={naming.loop}
  busy={busy}
  matchedWayLabel={naming.matchedWayId ? wayLabelIn(currentCatalog(), naming.matchedWayId) : null}
  existingRoute={naming.existingRouteId ? existingRouteProps(naming.existingRouteId) : null}
  vocabulary={specVocabulary(activeCatalog().ways)}
  onSave={onNamingSave}
  onSkip={onNamingSkip}
/>
```

**onNamingSkip callback (lines 634–637):**
```typescript
const onNamingSkip = useCallback(() => {
  setNaming(null);
  setShowAnim('rev');
}, []);
```
Simply clears the naming card and plays the reverse mark.

**onNamingSave callback (lines 639–677):**
```typescript
const onNamingSave = useCallback(async (names: RouteNames) => {
  const draft = namingRef.current;
  if (!draft) return;
  if (draft.existingRouteId && findWayWithSpecs(activeCatalog(), draft.existingRouteId, names.specs ?? [])) {
    Alert.alert('That way already exists', 'Pick it on RECORD next time instead of adding it again.');
    return;
  }
  setBusy(true);
  try {
    const out = await createRouteFromDraft(draft, names, createExpoFsAdapter());
    if (!out.ok) {
      Alert.alert('Could not create the route', out.errors.join('\n'));
      return;
    }
    setNaming(null);
    if (out.adjust) {
      setAdjust(out.adjust);
    } else {
      setShowAnim('rev');
    }
  } catch (e) {
    Alert.alert('Could not create the route', e instanceof Error ? e.message : String(e));
  } finally {
    setBusy(false);
  }
}, []);
```
Validates, calls createRouteFromDraft (persists to disk), then either navigates to gate adjustment or plays reverse mark. **Key point for demo:** a real save writes to storage; the demo version must FAKE this save (accept input, display success, but discard on exit).

---

## 8. Ranking Reveal (tower.tsx, towerModel.ts, rankingRevealModel.ts)

### 8a. tower.tsx (full file, 297 lines)

**File:** `app/src/ui/tower.tsx`

**TimingTower prop list (lines 93–105):**
```typescript
export function TimingTower({
  model,
  justFinished = false,
  ceremony = false,
  reveal = false,
  climbMs = SLOT_IN_MS,
  startDelayMs = 0,
  onPlayed,
}: {
  model: TowerModel;
  justFinished?: boolean;  // arms the slot-in
  ceremony?: boolean;      // §3a.3: collapse to today's all-purple row alone
  reveal?: boolean;        // virgin-cycle11: today rides up in plain ink, no P/gap, hard cut on land
  climbMs?: number;        // travel duration; default SLOT_IN_MS
  startDelayMs?: number;   // delay before travel starts; default 0
  onPlayed?: () => void;
})
```

**TowerRowModel fields (lines 60–82):**
```typescript
export interface TowerRowModel {
  pos: number | null;      // 1-based rank; null = unranked
  time: string;            // 'm:ss' or 'NO TIME'
  tier: Tier;              // colours the TIME only
  gap: string;             // signed gap to P1 or ''
  date: string;            // 'Tue 05 Aug' for past self, ignored for today (renders TODAY)
  today?: boolean;
  ghost?: boolean;         // archive-seeded (D-018)
  pb?: boolean;            // all-time PB
}
```

**Key constants (lines 86–91):**
- `SLOT_IN_MS = 700` — travel duration
- `ARRIVE_MS = 200` — arrival fade-in
- `PAST_H = 38` — row height for past laps
- `TODAY_ROW_H = 56` — today row is ~1.5× height

**Reveal mode (lines 224–241):** When `reveal === true` and `justFinished === true`:
- Today starts at bottom with plain ink (no P, no gap, no tier colour)
- Climbs up to its rank position over `climbMs`
- Passed rows step down ONE AT A TIME (not lockstep) as today passes them
- At landing instant: hard state flip `setLanded(true)` reveals pos, gap, and tier colour — never a fade

### 8b. towerModel.ts (full file, 122 lines)

**File:** `app/src/ui/towerModel.ts`

**buildTowerModel function (lines 49–102):**
```typescript
export function buildTowerModel(
  window: RideResult[],
  todayLapS: number | null,
  todayEstimated: boolean,
  todayAtMs: number,
  allTimeBestS: number | null,
): TowerModel {
  // ... builds ranked list of TowerRowModel, today already in place ...
  return { rows };
}
```
Returns `TowerModel` with `rows: TowerRowModel[]` + optional `todaySub` string (moving/vs-ref/elapsed).

### 8c. rankingRevealModel.ts (full file, 98 lines)

**File:** `app/src/ui/rankingRevealModel.ts`

**Tuning constants (lines 35–39):**
```typescript
export const REVEAL_START_DELAY_MS = 500;      // settle time before climb starts
export const REVEAL_HOLD_MS = 1500;            // board hold time after climb before naming card
export const CLIMB_MIN_MS = 600;               // minimum climb duration
export const CLIMB_PER_ROW_MS = 200;           // ms per row passed
export const CLIMB_MAX_MS = 2200;              // cap on climb duration
```

**climbMsFor function (line 60):**
```typescript
export function climbMsFor(rowsPassed: number): number {
  return Math.min(CLIMB_MAX_MS, Math.max(CLIMB_MIN_MS, CLIMB_MIN_MS + CLIMB_PER_ROW_MS * rowsPassed));
}
```

**RankingReveal interface (lines 41–51):**
```typescript
export interface RankingReveal {
  model: TowerModel;           // today's row in place, from buildTowerModel
  pos: number;                 // today's 1-based rank in the pool
  of: number;                  // pool size = window + 1, <= WINDOW_N (9)
  tier: Tier;                  // today's earned tier (what the flip lands on)
  rowsPassed: number;          // rows below today in the full model
  climbMs: number;             // climbMsFor(rowsPassed)
}
```

**buildRankingReveal function (lines 70–96):**
```typescript
export function buildRankingReveal(
  st: Pick<LiveEngineState, 'track' | 'lap'>,
  rideId: string,
  startedAtMs: number,
  window: RideResult[] = st.track === null ? [] : ghostsFor(st.track, rideId),
  allTimeBestS: number | null = st.track === null ? null : allTimeBestLapS(st.track),
): RankingReveal | null {
  // Returns null (no reveal, R4) when: st.track === null, st.lap === null, st.lap.estimated,
  // scoredS(st.lap) === null, or window.length === 0 (ride 1 has no comparison).
  // Otherwise returns RankingReveal with model, tier, climbMs, etc.
}
```

**Called from RecordScreen.tsx (line 556):**
```typescript
const nextReveal = s ? buildRankingReveal(finalState, s.rideId, s.startedAtMs) : null;
```
Used to feed the TimingTower when phase flips to 'ending'.

---

## 9. selfRaceModel.ts (full file, ~550 lines)

**File:** `app/src/ui/selfRaceModel.ts`

**SelfTrack interface (lines 71–84):**
```typescript
export interface SelfTrack {
  rideId: string;
  startMs: number;           // epoch ms this ride crossed gate 0 of the way's CURRENT gate set
  finishMs: number;          // epoch ms it crossed the last gate; the dot freezes here
  lapS: number;              // scored lap seconds (store/timing.ts scoredS) — decides "best"
  fixes: readonly { tUnixMs: number; lat: number; lon: number; sM?: number }[];
}
```
One past ride, ready to replay. Fixes are chronological, pre-start/warmup already excluded, decimated to ~2s gaps.

**SelfState type (line 86):**
```typescript
export type SelfState = 'waiting' | 'racing' | 'finished';
```

**SelfTier type (lines 90–91):**
```typescript
export type SelfTier = 'purple' | 'green' | 'yellow';
```
Purple = window-best self; green = below arithmetic mean of all loaded selfs' lapS; yellow = rest. Same rule as colourModel.ts's tierFor.

**SelfDot interface (lines 93–103):**
```typescript
export interface SelfDot {
  rideId: string;
  lat: number;
  lon: number;
  state: SelfState;         // waiting | racing | finished
  best: boolean;            // true iff this self is the window-best
  tier: SelfTier;
  rank: number;             // 1..n by ascending lapS
  sM: number | null;        // chainage in meters, for live PX feedback
}
```

**selfPositionAt function (lines 131–146):**
```typescript
export function selfPositionAt(
  track: SelfTrack, elapsedMs: number | null,
): { lat: number; lon: number; state: SelfState; sM: number | null } {
  // elapsedMs = null or < 0 -> waiting at track.startMs
  // elapsedMs >= lapMs (finishMs - startMs) -> finished at track.finishMs
  // else: racing, linearly interpolated at startMs + elapsedMs
}
```
Given elapsed time since live START crossing, returns current position + state of one self track.

**selfDotsAt function (lines 194–222):**
```typescript
export function selfDotsAt(
  tracks: readonly SelfTrack[], elapsedMs: number | null,
): SelfDot[] {
  // Filters tracks (>= 2 fixes, finishMs > startMs)
  // Ranks by ascending lapS (ties broken by array order)
  // Returns array of SelfDot, one per track, with tier/rank/best set
}
```

**selfsFeatureCollection function (lines 225–235):**
```typescript
export function selfsFeatureCollection(dots: readonly SelfDot[]): SelfFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: dots.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
      properties: { rideId: d.rideId, state: d.state, best: d.best, tier: d.tier, sortKey: 100 - d.rank },
    })),
  };
}
```
Wraps SelfDots in GeoJSON FeatureCollection for MapLibre layer.

**loadSelfTracks function (lines 332–407):**
```typescript
export async function loadSelfTracks(
  wayId: string, gateSetVersion: number, fs: FsAdapter,
): Promise<SelfTrack[]> {
  const spec = catalogTrackSpecs().find((s) => s.id === wayId);
  if (!spec) return [];

  const window = ghostsFor(wayId);  // <= 9 entries (D-045, R2)
  const out: SelfTrack[] = [];
  let skipped = 0;

  for (const result of window) {
    if (result.source !== 'app') { skipped++; continue; }  // R3: archive has no fixes
    
    const cacheKey = `${result.rideId}:${gateSetVersion}`;
    const cached = trackCache.get(cacheKey);
    if (cached) {
      const lapS = scoredS(result.lap);
      if (lapS === null) { skipped++; continue; }
      out.push({ ...cached, lapS });
      continue;
    }

    try {
      const text = await fs.readText(`rides/${result.rideId}.jsonl`);
      if (text === null) { skipped++; continue; }
      const decoded = decodeRideFile(text);
      const inOrder = chronologicalFixes(decoded.fixes).filter((f) => !f.preStart && !f.warmup);
      if (inOrder.length < 2) { skipped++; continue; }

      // Derive gate crossings against the way's CURRENT spec (R4)
      const t = inOrder.map((f) => f.tUnixMs / 1000);
      const { startS, finishS, chainageM } = deriveGateCrossings({
        t, lat, lon, ref: spec.ref, gates: spec.gates
      });
      if (startS === null || finishS === null) { skipped++; continue; }

      // Window by time, decimate by 2s gaps, build SelfTrack
      const startMs = startS * 1000;
      const finishMs = finishS * 1000;
      const loMs = startMs - EDGE_PAD_MS;
      const hiMs = finishMs + EDGE_PAD_MS;
      const windowed = withS.filter((f) => f.tUnixMs >= loMs && f.tUnixMs <= hiMs);
      if (windowed.length < 2) { skipped++; continue; }

      const lapS = scoredS(result.lap);
      if (lapS === null) { skipped++; continue; }

      const track: SelfTrack = {
        rideId: result.rideId,
        startMs,
        finishMs,
        lapS,
        fixes: decimateByTime(windowed, DECIMATE_MIN_GAP_MS).map((f) => ({
          tUnixMs: f.tUnixMs, lat: f.lat, lon: f.lon, sM: f.sM
        })),
      };
      trackCache.set(cacheKey, track);
      out.push(track);
    } catch {
      skipped++;  // D-023: never throw
    }
  }

  return out;
}
```

**FLAGGED CONSTRAINT:** loadSelfTracks requires **real ride files on disk** (`rides/${result.rideId}.jsonl`). The demo tab is self-contained (no storage writes) and uses a frozen route fixture. It **CANNOT use loadSelfTracks directly** — it would need SYNTHETIC SelfTrack objects built by hand, with fake fixes, or the demo would need to manufacture sample ride files. This is a hard constraint on how self-dots can appear in demo.

---

## 10. wayMapView.tsx — selfs prop (lines 276–280)

**File:** `app/src/ui/wayMapView.tsx`

**selfs prop declaration:**
```typescript
/** virgin-cycle6: past rides of this way replayed as dots (selfRaceModel.ts).
 * Drawn by the MapLibre rung only, BELOW the rider dot (mount order).
 * undefined/[] = the source still mounts, empty. The PNG rung ignores it
 * (accepted degradation, same as sectorColours). */
selfs?: readonly SelfDot[];
```

**Line 532:** Converted to GeoJSON and mounted:
```typescript
const selfsFC = useMemo(() => {
  return selfsFeatureCollection(props.selfs ?? []);
}, [props.selfs]);
```

**Conclusion:** WayMapView already accepts `selfs` as an optional prop and will render it if provided. **No changes needed to WayMapView itself** — a demo just needs to pass synthetic SelfDots.

---

## 11. STATE.md — DEMO Tab Rules

**File:** `STATE.md`

**Grep result (line ~77):**
```
  source/layer (MapLibre rung only), `RecordScreen.tsx` wiring, and a SETTINGS toggle
  (`selfDots`, default on). Ride 1 of a way races nobody; ride k races k − 1, capped at nine.
  Follow-up: three tiers by the colour model's own rule, P1 on top, live `P` on the context
  row. PNG rung, DEMO tab and free mode untouched by design (R9). See
  `cycles/virgin-cycle6/README.md`.
```

**FLAGGED EXPLICIT RULE:** "DEMO tab and free mode untouched by design (R9)." This refers to cycle6's self-racing feature — the original brief stated that the self-dots feature should not modify the DEMO tab. **This is now being OVERRIDDEN by Nathan's new request (#3) to add self-dots visibility to SECOND RIDE / TENTH RIDE modes.** Plan must acknowledge this explicit override.

---

## 12. CLAUDE.md — Model-Tier Pipeline (lines 2–30)

**File:** `CLAUDE.md`

The model-tier pipeline is:
1. **Haiku Digest** (this pass): reads raw files, produces factual line-anchored digest
2. **Plan tier** (Fable, frontier model): reads digest, designs fix, writes brief
3. **Sonnet Execute**: implements brief, stop-on-ambiguity (never guess on undecided calls)
4. **Opus Inspect**: fresh-context adversarial check, reruns all tests

**Quoted verbatim (lines 3–12):**
```
1. **Read `STATE.md` first.** It's the single source of truth: current status, what's
   settled about how the app behaves, and what's actually still open. If a fact appears
   in two places, `STATE.md` wins.
2. **Every real task runs the model-tier pipeline:** a Haiku **Digest** subagent reads
   files and condenses them into a factual, line-anchored digest; the frontier model
   (**Plan**, dispatched as `model: "fable"`) reads that digest — not raw files — and does
   the thinking: designs the fix, writes a self-contained brief.
```

Note: Commit baa8c6b updated the pipeline to make Opus the Inspect tier (not Fable). The live file confirms this (line 3 now says "the frontier model (**Plan**, dispatched as `model: "fable"`)" — but this refers to the Plan tier, not Inspect; Inspect is Opus per the original text).

---

## Summary of Flagged Discrepancies and Constraints

### 1. **vm.lap Construction Conflicts with Cycle11 Design (CRITICAL)**
   - **File:** DemoScreen.tsx, lines 176–178
   - **Current:** `vm.lap` shows immediate tier colour on finish (OLD behaviour)
   - **Cycle11 design:** Ranking reveal defers tier colour until a hard flip on STOP
   - **Decision needed:** Does demo follow the NEW deferred design, or keep immediate colour? If deferred, a synthetic RankingReveal must be built for demo (no real store backing).

### 2. **STATE.md Explicit "DEMO Tab Untouched" Rule (OVERRIDDEN)**
   - **File:** STATE.md, ~line 77
   - **Rule:** "DEMO tab and free mode untouched by design (R9)" — from cycle6 self-racing work
   - **New request:** Nathan's ask #3 explicitly adds self-dots to SECOND RIDE / TENTH RIDE
   - **Status:** Rule is being intentionally overridden; Plan must acknowledge this.

### 3. **selfRaceModel.loadSelfTracks Requires Real Ride Files (CONSTRAINT)**
   - **File:** selfRaceModel.ts, lines 332–407
   - **Constraint:** Reads from `rides/${rideId}.jsonl` — requires persisted ride data
   - **Demo implication:** Demo cannot use loadSelfTracks directly (demo has no ride files). Must either:
     - Generate synthetic SelfTrack objects by hand (fake fixes), OR
     - Create dummy ride files in demo (breaks "self-contained" principle)

### 4. **DemoScreen Has No Third Pill Yet**
   - **File:** DemoScreen.tsx, lines 201–211
   - **Current:** Two pills only (FIRST RIDE / SECOND RIDE)
   - **Request:** Add TENTH RIDE pill
   - **Model:** Must be similar to SECOND RIDE (show ranking tower, self-dots), but with 9 prior rides in the synthetic history

---

## Next Steps for Plan Tier

1. **Decide on timing-tower reveal mode for demo:** Does demo SECOND RIDE / TENTH RIDE show the cycle11 deferred-reveal animation, or immediate-colour vm? If deferred, a synthetic RankingReveal must be built.
2. **Design full-screen mode for DEMO:** Nathan's request #1 asks for "full-screen to a representation of how the current race screen is." This requires either:
   - A new overlay (following tabNav idiom) that mount-swaps DemoScreen's content to full-screen, OR
   - A modal mode within DemoScreen itself that hides the pill row and tab bar
3. **Design synthetic self-dots for demo:** If SECOND RIDE / TENTH RIDE must show self-dots, Plan must decide:
   - Hand-build synthetic SelfTrack objects in demoModel.ts, OR
   - Extend demoModel.ts to generate sample ride files, OR
   - Create a demo-specific "fake self-tracks" builder
4. **Design FIRST RIDE post-ride card:** Nathan's request asks for a "post ride screen for saving the routes" — RouteNamingCard exists but requires live draft data. Demo version must fake the naming flow (no real save).

---

**END OF DIGEST**
