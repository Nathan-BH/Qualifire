# RESULTS Tab Digest — Rethinking in Light of Cycles 23 & 24

**Created:** 2026-10-07  
**Scope:** RESULTS tab (native ID: 'results', labeled "results"), in relation to ACTIVITIES (cycle 23) and MAP (cycle 24) redesigns.

---

## 1. Current Tab Navigation & Labels

**App.tsx, lines 57–58, 251–269:**
- Tab order: `['record', 'rides', 'routes', 'results', 'settings', 'demo']`
- Tab label map (user-facing):
  - `record` → "record"
  - `rides` → "activities" (virgin-cycle20: renamed from "rides" to match all activity types)
  - `routes` → "map" (cycle24: renamed from "routes")
  - `results` → "results"
  - `settings` → "settings"
  - `demo` → "demo"

**Navigation:** Shell owns tab state (setTab); bottom nav bar scrolls horizontally when tabs overflow 6×92dp. Hidden when: recording, demoing, or full-screen detail open (ride, gate editor, catalog detail, results detail).

---

## 2. RESULTS Tab Structure (Virgin-Cycle 3, WP-2 & Cycle 15, Brief 13)

**Component:** `ResultsScreen.tsx` (lines 1–262)  
**Navigation type:** Route-grouped list with optional drill-down; mount-swapped full-screen detail as second layer (see App.tsx line 233).

### 2a. Top-Level Screen

**Sport badge:** Line 43–46
- Text: "{SPORT_NAME}" (uppercase) or "NO SPORT YET · ADD ONE IN SETTINGS"
- Sport-scoped via `activeSportId()` and `activeCatalog()` (not `currentCatalog()`)

**Route cards (lines 75–98):**
- **Grouped by:** Route ID; ordered by most-ridden first (model: `buildResultsRoutes()`, resultsListModel.ts)
- **Card shows:**
  - Title: `"{start} → {end}"` (from route landmark labels)
  - Subtitle: `"{N} way{s} · {M} activit{ies}"` (way count, ride count)
- **Tap behavior:**
  - Single-way route → opens detail screen directly (line 89–90)
  - Multi-way route → opens ResultsWayList (lines 89–90, decision 5 of cycle 15 brief 13)
- **Styling:** `t.card` background, `t.cardBorder` hairline, borderRadius `radius.card`, no accent bar (route-level; ways are not separated by sport)

**Way list drill-down (lines 70–77):**
- Component: `ResultsWayList.tsx` (lines 1–86)
- Header: `"Results"` + back text `"‹ BACK"`
- Lists ways on the route, one row per way (way name, usage count)
- Tap a way → opens detail screen; **BACK lands on way list, not route list** (App.tsx line 97, shell owns state via `openResultsRoute` prop, not local ResultsScreen state)

**Free activities section (lines 61–74):**
- Header: `"FREE ACTIVITIES"` (style: `sectionHead`, 12px, all-caps, letter-spaced)
- Rows per free ride, newest first; sport-scoped like routes
- Each row: date/time, duration (or "–"), "free activity"
- **New in cycle 15:** free rides moved from ride detail to results board; migrated v1/v2 records marked with `rideId.startsWith('free:')`, which are not tappable

**Empty state (line 56):**
- Text: `"NO RESULTS YET"` (style: `empty`, color t.textDim)
- Shown when routes.length === 0 && freeRides.length === 0

**Styling:**
- Container: ScrollView, padding 16px, gap 14px between card/header
- Title: "Results" (26px, weight 800, all-caps, letterSpacing 2)
- Card row: flex row, paddingVertical 9px, chevron › on right (color t.textDim, fontSize 16)

### 2b. Detail Screen (ResultsDetailScreen.tsx, lines 1–261)

**Opened via:** `tabNav.openResults({ wayId })` (from route list or way list)  
**Back action:** `tabNav.closeResults()` → unmount screen, return to route list (not way list)

**Header (lines 50–55):**
- Back button: `‹ BACK` (fontSize 14, fontWeight 700), onPress closeResults
- Title: `"RESULTS"` (15px, weight 800, letterSpacing 2)
- Count: `"{total} activit{ies}"` (12px, textDim)

**Way name (line 57):**
- From `wayLabelIn(CATALOG, wayId)` (22px, weight 800, marginTop 4)

**Last N rides section (lines 59–63):**
- Header: Window caption from `windowCaption(windowN)` (12px, textDim, letterSpacing 2, marginTop 16)
  - Text: "LAST {N} RIDES" (where N = plotWindow(results).length, typically 9)
- **ResultsPlot** (resultsPlot.tsx, lines 1–278):
  - Scatterplot: X-axis = index in window, Y-axis = lap time (faster = higher)
  - Each dot: purple (fastest window), green (≥ avg), yellow (< avg)
  - Tap a dot → highlights that row in board below, opens ride detail on press
  - Selection caption: Shows "P{pos} of {total}" from board row; empty if unranked
  - Styling: Custom React Native Views (no react-native-svg), hand-rolled axes

**All-time history board (lines 65–90):**
- Header: `"ALL {N} RIDES · FASTEST FIRST"` (boardCaption, 12px, letterSpacing 2, marginTop 16)
- Rows sorted fastest-to-slowest, all-time (not just window)
- **Per row (HistoryRowView):**
  - Rank: `"P{pos}"` or `"—"` (32px width, fontVariant tabular-nums, textDim)
  - Date: `dateLabel` from RideResult.startedAtMs (flex 1)
  - Time: lap time; if PB (all-time best), purple dot (6px circle) left of time
    - Styling: color grey if "no time" (unranked), else t.text
  - Gap: time delta from best (48px width, right-aligned, tabular-nums, textDim)
- Selection: left border accent bar (3dp, t.accent) when row selected via plot
- Tap a row → `tabNav.openRide({ rideId, source: 'results', startedAtMs })`

**Back button (line 92):**
- `"BACK TO RESULTS"` (slimBtn style, bg t.accent, fontSize 12.5, fontWeight 800)

**Important rules (preamble, lines 16–29):**
- No tier colour on board times (only PB dot, purple)
- Rankings-off SETTINGS collapses board rows (PBDETAIL-like)
- Way vanishes → closeResults (line 41–44, useEffect)
- Selected ride ID wired to plot selection (line 34, setSelectedRideId)
- Selection caption text computed from board model (lines 47–50), not re-derived

---

## 3. Data Model & Derivation

**File:** `app/src/store/types.ts` (RideResult interface, lines 161–185)

```typescript
interface RideResult {
  kind: 'rideResult';
  rideId: string;
  startedAtMs: number;
  wayId: string | null;          // null = unmatched to a route
  source: 'recorded' | 'archive';
  lap: {
    rawS: number;
    movingS: number | null;      // null until raw-time ruling lands
    quality: 'clean' | 'estimated' | 'interrupted' | 'missed';
  };
  sectors: SectorResult[];        // array of sector timings
  ranking?: RankingResult;
  derivedBy: { engineVersion, gateSetVersion, resultSchemaVersion };
  ignoredFromRanking?: boolean;   // rider-set via "Ignore in ranking" action
  tripwireDemoted?: boolean;
}
```

**Storage:** `results/<rideId>.json` per ride; persistent index `results/index.json`

**Ranking rules (store/results.ts lines 89–106):**
- Ranks if: `quality === 'clean' || 'interrupted'` AND NOT estimated AND NOT tripwire-demoted AND NOT ignoredFromRanking AND has real scored time
- Tower: sorted ascending by scored time, 1-based position; unrankable rows included with position: null

**Window:** Last N (typically 9, `WINDOW_N` in towerModel.ts); rode function `plotWindow(results)` caps to 9 rides near NOW (resultsPlotModel.ts)

**Comparison basis for tier colour:** Window average (not all-time average; settable in IDEAS per D-007/D-008 ruling, still open)

---

## 4. Rider-Facing Text (ui-strings.allow.json)

**From RESULTS tab & detail:**
| String | File | Context |
|--------|------|---------|
| `Results` | ResultsScreen.tsx | Tab label / title page |
| `RESULTS` | ResultsDetailScreen.tsx | Detail screen title |
| `BACK TO RESULTS` | ResultsDetailScreen.tsx | Close detail button |
| `NO RESULTS YET` | ResultsScreen.tsx | Empty state (no routes/ways) |
| `{N} way{s} · {M} activit{ies}` | ResultsScreen.tsx | Route card subtitle |
| `FREE ACTIVITIES` | ResultsScreen.tsx | Section header |
| `{N} activit{ies}` | ResultsDetailScreen.tsx | Detail screen count |
| (Scatterplot axes, labels from resultsPlot.tsx/resultsPlotModel.ts — not rider-facing, internal debug only) | — | — |

**Rules:**
- No em dashes; no `long: true` override needed (all strings <40 chars, no alert bodies)
- New additions require one-line reason in allow-file

---

## 5. What RESULTS Offers (Unique vs. Elsewhere)

### 5a. Unique to RESULTS

1. **Per-way ranked lap history board** — all-time, fastest-first, with all-time-best marker (PB dot)
   - NOT on ACTIVITIES (shows only one ride at a time, no ranking/comparison board)
   - NOT on RideDetailScreen (shows "ON THIS WAY" — last 9 only, limited row set)

2. **Last N rides scatterplot** — visual trend of lap times over window
   - Shows each dot colored vs window average (not all-time average)
   - NOT on ACTIVITIES (no plot)
   - NOT on RideDetailScreen (DEMO tab shows a synthetic scatterplot from pinned demo laps, not real data)

3. **Per-way performance summary at a glance**
   - Aggregated view: "how fast am I on this way overall, in this season"
   - ACTIVITIES is chronological (newest first), not ranked
   - MAP tab (cycle24) is spatial (places + routes), not performance

4. **Free activity list** (unmatched rides)
   - Grouped in one section on RESULTS board
   - On ACTIVITIES, free rides show in the feed with other routes (no separate section in cycle23 design; card accent distinguishes them)

### 5b. Reachable from Multiple Tabs

1. **Per-ride detail** (lap time, sectors, rank, actions):
   - **RESULTS:** Tap a board row → detail screen
   - **ACTIVITIES:** Tap a card → detail screen (cycle23: will be feed card)
   - **MAP:** Tap a place → routes → tap a route → ways → (not yet decided if ways open detail or card info)
   - **RIDES:** Already open detail (current tab; not changing in these cycles)

2. **Per-way all-time best (PB marker):**
   - **RESULTS:** PB dot on all-time board
   - **RideDetailScreen:** Marked in "ON THIS WAY" board (if this ride is PB)
   - **ACTIVITIES:** Likely marked on card if cycle23 adds a best-time badge (TBD with card design)

3. **Comparison window (last 9 rides on a way):**
   - **RESULTS:** Scatterplot + board rows
   - **RideDetailScreen:** "ON THIS WAY" board (last 9) + scatterplot (TBD in cycle23 if added here too)
   - **ACTIVITIES:** Not shown in current design; cycle23 may add a mini-plot or "your best / average" to the card

4. **Sector times vs. window average:**
   - **RideDetailScreen:** "SECTORS" section (time, average gap)
   - **ACTIVITIES:** Possibly on card or detail (cycle23 designs mention sectors on detail page)
   - **RESULTS:** NOT shown; only the board (no sector breakdown per ride)

---

## 6. Nathan's Stated Design Principles (Cycles 23 & 24)

### Cycle 23 (Activities Feed Redesign)

- **Visual language:** "NO nested rounded rectangles... content sits on the screen background. Structure from spacing, hairline dividers, type size, small-caps section headers." (cycle23 00-nathan-decisions.md, decision 8)
- **Feed experience:** "Feels like a feed, not a library of collapsed rows... Every activity shown as a pre-expanded block, newest on top." (decision 1)
- **Map on card:** "Live map on each card... only a few maps live at once... fast-scroll delay is accepted as normal feed behaviour" (decision 3)
- **Detail redesign (mandatory):** "Nathan does NOT want the current detail page kept as-is; it must integrate with the feed... map FIRST, large, full-bleed... layout direction... not nested boxes" (decision "Detail page REDESIGN")
- **Constraints:** "Riders do NOT start activities from the MAP tab. Managing (delete, etc.) lives in ACTIVITIES or detail, discrete so feed is not cluttered."

### Cycle 24 (MAP Tab as Spatial View)

- **Purpose:** "Activities tab = chronological view; MAP tab = spatial view of the same rides... this is my world, these are my patterns" (decision: Concept)
- **Interaction:** Tap a place → routes in/out; tap a route → its ways + recent activities (implied TBD)
- **Map hierarchy:** Overview (all routes, merged direction, semi-transparent), place focus (spider-web, connected strong, rest dimmed), route focus (ways drawn, usual one strongest, gates shown)
- **Constraints:** "Minimal text, generic for every user's routes... riders do NOT start activities from the MAP tab"

### Both Cycles

- **Per-sport isolation:** Every tab sport-scoped via `activeSportId()` (no merge across sports); free activities in same feed/view as routed activities
- **Empty-seed install:** Starts with zero landmarks/routes/ways; filled in as rider records
- **No em dashes, ui-strings budget:** All rider-facing strings <40 chars unless marked `long: true`

---

## 7. Constraints & Known Open Decisions

**From CLAUDE.md & OPEN-ITEMS.md:**

1. **Tests:** `node --experimental-strip-types tests/run.ts` (0 FAIL), `tsc --noEmit` (exit 0)
2. **Rider-facing strings:** ui-strings.allow.json must include every visible string; new entries require reason; no em dashes
3. **Git on this mount:** Use `GIT_OPTIONAL_LOCKS=0`; `.git/index.lock` survives sometimes → `mv` it aside
4. **Model-tier pipeline (every real task):** Haiku Digest → Fable Plan → Sonnet Execute (stop on ambiguity) → Opus Inspect (fresh context, adversarial re-check)
5. **Chores <10 lines:** Direct execution, no subagents
6. **Nothing is done because an agent said so:** Every progress point = checkable artifact (test passed, file exists, change on device)

**Open in RESULTS context (TBD in cycles):**

- **Relation to ACTIVITIES feed card:** What RESULTS info appears on the feed card? Best time? Average time? Last rank? Mini scatterplot? (None are decided; current detail design is being replaced per cycle23.)
- **Relation to ACTIVITIES detail page:** Will the new detail page show a scatterplot (moving RESULTS-like feature there)? Will sector times still show vs-average? (Cycle23 mentions "sector rows with gap to average" on detail but design not finalized.)
- **Relation to MAP tab:** Ways opened from MAP may link to ACTIVITIES or RESULTS detail, or show a card on the map; interaction TBD (cycle24 decided ways are not directly clickable from the map yet; see 03-brief-open-questions.md in cycle24).
- **Free activities:** Will RESULTS's free-activity section and ACTIVITIES's feed-card styling for free activities match? (Cycle23 decides free rides in feed get a card accent instead of separate section; RESULTS decided same per cycle15 brief 13; visual alignment TBD in execution.)

---

## 8. File References

- **App.tsx:** Tab nav, mount-swap logic for detail screens
- **ResultsScreen.tsx:** Route list, way-list drill-down
- **ResultsWayList.tsx:** Way rows within a route
- **ResultsDetailScreen.tsx:** Board + scatterplot detail
- **resultsPlot.tsx:** Scatterplot component (hand-rolled Views)
- **resultsPlotModel.ts:** Plot data derivation
- **resultsListModel.ts:** Route/way grouping, board model
- **store/results.ts:** Ranking, window, tower logic (pure)
- **store/resultsStore.ts:** Persistent results store, backfill, file I/O
- **store/derive.ts:** Result derivation from raw ride JSONL
- **ui-strings.allow.json:** Rider-facing text registry
- **cycles/virgin-cycle23/:** ACTIVITIES redesign (feed, card, detail)
- **cycles/virgin-cycle24/:** MAP tab (spatial view)

