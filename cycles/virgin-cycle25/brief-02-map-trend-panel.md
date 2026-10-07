# brief-02 — the trend panel in MAP route focus (scatterplot inside the existing bottom sheet)

**Cycle:** virgin-cycle25. **Source:** `00-nathan-decisions.md` decisions 2, 3, 5 and Corrections C2, C6, C7 (binding: the panel is the scatterplot ALONE, per way, inside the EXISTING way-row sheet; dot tap shows date + time only; no all-time anything; keep the plot's current look; borderless — cycle23's "no nested rounded rectangles"), digest `02-map-panel-digest.md` §1-§3. Written by the Plan tier (Fable) 2026-10-07 night; anchors re-read at commit `e7414a4` and adjusted for brief 01.

**Tier:** Execute = Sonnet, alone, under `cycles/virgin-cycle25/EXECUTOR-RULES.md`. STOP-ON-AMBIGUITY.

**Run order: AFTER brief 01** (needs `buildPlotModel(results, plotW, plotH)` and `PLOT_N = WINDOW_N`). Pre-flight: `grep -n "plotH: number = PLOT_H" app/src/ui/resultsPlotModel.ts` prints one line and `grep -n "export const PLOT_N = WINDOW_N;" app/src/ui/resultsPlotModel.ts` prints one line; else STOP ("brief 01 not landed").

## Goal

On the MAP tab, focusing a route (tap a line, or a route row in a place's sheet) already opens a bottom sheet: title row (`›` opens the catalog detail, `×` returns to overview) and one row per way with its ride count; tapping a row highlights that way on the map. This brief adds, under those rows, the scatterplot of the highlighted way (`focus.highlightWayId ?? route.usualWayId`): the last 10 ranked activities, newest at the right in the brand yellow, the rest grey, the window-average dotted line — exactly today's `ResultsPlot`, drawn without its card frame (borderless inside the sheet), shorter (140 px), and with a caption that appears only when a dot is tapped: `<date> · <time>`, nothing else. The way rows are the way switcher (unchanged from cycle24). When the highlighted way has no ranked activity the sheet looks exactly as it does today (no plot, no empty-state text). Place focus is untouched. DEMO keeps the framed plot it has (its props do not change). No new rider-facing string.

## 0. What the code does today (verified anchors)

- `app/src/ui/RoutesScreen.tsx` (138 lines, cycle24): imports `:18-27`:
  ```ts
  import { useEffect, useMemo, useState } from 'react';
  import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
  import { activeCatalog, activeSportId, currentSports } from '../store/sportStore.ts';
  import { storedResultsForWay } from '../store/resultsStore.ts';
  import {
    overviewModel, placeFocusModel, routeFocusModel, type CatalogMapDeps,
  } from './catalogMapModel.ts';
  import CatalogMapView, { catalogAssetFor, type CatalogMapFocus } from './catalogMapView.tsx';
  import { useTheme } from './themeContext.tsx';
  import { useTabNav } from './tabNav.tsx';
  ```
  state `:35` `  const [focus, setFocus] = useState<CatalogMapFocus>({ level: 'overview' });`; `route` `:45` `  const route = focus.level === 'route' ? routeFocusModel(focus.routeId, deps) : null;`; `gateAsset` `:54-56`; `<CatalogMapView` `:76-86` with `:82` `        sheetOpen={focus.level !== 'overview'}`; sheet `:92-126`:
  ```tsx
      {place || route ? (
        <View style={[st.sheet, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
  ```
  body `:103-124`:
  ```tsx
          <ScrollView>
            {place ? place.rows.map((row) => {
  ```
  … `:114-123` (route rows) …
  ```tsx
            }) : null}
          </ScrollView>
        </View>
      ) : null}
  ```
  styles `:132-138`:
  ```ts
  const st = StyleSheet.create({
    badge: { position: 'absolute', top: 8, left: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
    badgeText: { fontSize: 11, letterSpacing: 2 },
    sheet: { position: 'absolute', left: 12, right: 12, bottom: 34, maxHeight: 280, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 13, gap: 12 },
    sheetTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingVertical: 9, paddingHorizontal: 13, gap: 12 },
  });
  ```
- `app/src/ui/catalogMapModel.ts` `:197-201` `RouteFocusModel { routeId; label; usualWayId: string | null; ways: RouteWayRow[]; bounds }`, `RouteWayRow { wayId, label, rides, usual, path }` (`:196`). `usualWayId` is null only for a route with zero ways (`:46-58`).
- `app/src/ui/catalogMapView.tsx` `:85` `  sheetOpen: boolean;` (inside `CatalogMapViewProps` `:79-89`) and `:165` `      ? { padding: { top: 48, right: 48, bottom: props.sheetOpen ? 300 : 48, left: 48 } }`.
- `app/src/ui/resultsPlot.tsx` (278 lines): imports `:38-40` `import {\n  buildPlotModel, GUTTER_W, PLOT_H, POINT_R,\n} from './resultsPlotModel.ts';`; props `:53-63`:
  ```tsx
  export default function ResultsPlot({
    results, selectedRideId, selectedPosLabel, onSelect, onOpenRide,
  }: {
    results: RideResult[];
    selectedRideId: string | null;
    /** `P3 of 27` — computed by the screen from its own board data; empty
     * while rankings are off (§3.9). The plot never formats this itself. */
    selectedPosLabel: string;
    onSelect: (rideId: string | null) => void;
    onOpenRide: (rideId: string, startedAtMs: number) => void;
  }) {
  ```
  `:74` `  const model = useMemo(() => buildPlotModel(results, plotW), [results, plotW]);`; `:98` `    <View style={[styles.frame, { backgroundColor: t.card, borderColor: t.cardBorder }]}>`; `:101` `          <View style={{ height: PLOT_H }} />`; `:109` `            <View style={{ width: GUTTER_W, height: PLOT_H }}>`; `:126` `            <View style={{ width: plotW, height: PLOT_H }}>`; caption `:225-242`:
  ```tsx
        <Pressable
          style={styles.captionRow}
          disabled={selectedPoint === null}
          onPress={() => {
            if (selectedPoint !== null) onOpenRide(selectedPoint.rideId, selectedPoint.startedAtMs);
          }}
        >
          <Text style={[styles.captionText, { color: t.textDim }]}>
            {selectedPoint === null
              ? 'tap a point for that activity'
              : [towerDate(selectedPoint.startedAtMs), fmt(selectedPoint.timeS), selectedPosLabel]
                .filter((part) => part !== '')
                .join(' · ')}
          </Text>
          {selectedPoint !== null ? (
            <Text style={[styles.captionLink, { color: t.accentText }]}>open ›</Text>
          ) : null}
        </Pressable>
  ```
  styles `:248-254` `frame: {...}` and `:265-272` `captionRow: {...}`.
- `app/src/store/resultsStore.ts` `:224-226` `storedResultsForWay(wayId)` = every stored result on the way, unsorted, today included once stored. `app/src/ui/resultsPlotModel.ts` `plotWindow(results)` = ranked, ascending, last PLOT_N.
- `app/tests/catalogmap_suite.ts` `:221-225` pins RoutesScreen (`<CatalogMapView`, no `YOUR PLACES`); `app/tests/recordflow_suite.ts :309` (badge string in RoutesScreen.tsx), `:333` (em-dash scan incl. RoutesScreen.tsx — NO ` — ` in any new line of this file, comments included, unless the line starts with `//` or `*`), `:226-246` (the word "ride(s)" must not appear inside a quoted string or JSX text of any `src/ui` file — identifiers are fine).
- `app/tests/run.ts` `:49` `import './catalogmap_suite.ts';`

## 1. Changes, file by file

### 1a. `app/src/ui/trendPanelModel.ts` — NEW, pure (no React, no store)

```ts
/**
 * virgin-cycle25 brief 02: the MAP route focus's trend panel, pure. Which way
 * the panel describes (the highlighted way, else the route's usual way, else
 * the first way), its stored results, and whether there is anything to plot.
 * The plot itself is resultsPlot.tsx over resultsPlotModel.ts (brief 01:
 * last WINDOW_N ranked activities). No rank, no gap, no all-time best
 * (Nathan, cycle25 decision 5): the panel is the scatterplot alone.
 */
import type { RideResult } from '../store/types.ts';
import type { RouteFocusModel } from './catalogMapModel.ts';
import { plotWindow } from './resultsPlotModel.ts';

/** Height of the plot area inside the sheet (resultsPlot.tsx `height`);
 * PLOT_H (220) is the DEMO card's. */
export const PANEL_PLOT_H = 140;
/** The sheet's maxHeight in ROUTE focus (place focus keeps 280). */
export const ROUTE_SHEET_MAX_H = 380;
/** Way rows scroll beyond three (36 px each) so the plot always stays on screen. */
export const WAY_ROWS_MAX_H = 108;
/** Camera bottom padding while the route sheet is open (catalogMapView `sheetPad`). */
export const ROUTE_SHEET_CAMERA_PAD = 400;

export interface TrendPanelModel {
  /** the way the plot describes; null only for a route with zero ways */
  wayId: string | null;
  /** every stored result on that way (plotWindow does the ranking filter) */
  results: RideResult[];
  /** false = draw no plot (no ranked activity yet); the sheet is then the cycle24 sheet */
  hasPlot: boolean;
}

export function trendPanelFor(
  route: RouteFocusModel,
  highlightWayId: string | null,
  resultsFor: (wayId: string) => RideResult[],
): TrendPanelModel {
  const wayId = highlightWayId ?? route.usualWayId ?? route.ways[0]?.wayId ?? null;
  const results = wayId === null ? [] : resultsFor(wayId);
  return { wayId, results, hasPlot: plotWindow(results).length >= 1 };
}
```

### 1b. `app/src/ui/resultsPlot.tsx` — inline variant, height, optional open link

1. Props `:53-63` → 
   ```tsx
   export default function ResultsPlot({
     results, selectedRideId, selectedPosLabel, onSelect, onOpenRide, variant = 'card', height,
   }: {
     results: RideResult[];
     selectedRideId: string | null;
     /** `P3 of 27` — computed by the screen from its own board data; empty
      * while rankings are off (§3.9). The plot never formats this itself. */
     selectedPosLabel: string;
     onSelect: (rideId: string | null) => void;
     /** absent (virgin-cycle25 02, the MAP panel): no `open ›` link, the caption is text only */
     onOpenRide?: (rideId: string, startedAtMs: number) => void;
     /** 'card' = today's bordered card (DEMO); 'inline' (virgin-cycle25 02) = no
      * frame, no padding, caption row only while a point is selected: for a
      * host that already draws the box (the MAP sheet). */
     variant?: 'card' | 'inline';
     /** plot area height; default PLOT_H (220) */
     height?: number;
   }) {
   ```
2. After `:66` (`const [boxW, setBoxW] = useState(0);`) add:
   ```tsx
     const inline = variant === 'inline';
     const plotH = height ?? PLOT_H;
   ```
3. `:74` → `  const model = useMemo(() => buildPlotModel(results, plotW, plotH), [results, plotW, plotH]);`
4. `:98` → `    <View style={inline ? styles.inlineFrame : [styles.frame, { backgroundColor: t.card, borderColor: t.cardBorder }]}>`
5. `:101`, `:109`, `:126`: replace `height: PLOT_H` with `height: plotH` (three places; `grep -c "height: PLOT_H"` must then be 0 and `PLOT_H` is still imported for the default).
6. Caption block `:225-242` → 
   ```tsx
         {inline && selectedPoint === null ? null : (
           <Pressable
             style={[styles.captionRow, inline ? styles.captionRowInline : null]}
             disabled={selectedPoint === null || onOpenRide === undefined}
             onPress={() => {
               if (selectedPoint !== null && onOpenRide !== undefined) onOpenRide(selectedPoint.rideId, selectedPoint.startedAtMs);
             }}
           >
             <Text style={[styles.captionText, { color: t.textDim }]}>
               {selectedPoint === null
                 ? 'tap a point for that activity'
                 : [towerDate(selectedPoint.startedAtMs), fmt(selectedPoint.timeS), selectedPosLabel]
                   .filter((part) => part !== '')
                   .join(' · ')}
             </Text>
             {selectedPoint !== null && onOpenRide !== undefined ? (
               <Text style={[styles.captionLink, { color: t.accentText }]}>open ›</Text>
             ) : null}
           </Pressable>
         )}
   ```
   (The three string literals stay byte-identical, so the allow-list entries for this file remain valid: `tap a point for that activity`, `open ›`, `no ranked activities yet`.)
7. Styles: after the `frame: {...}` entry (`:248-254`) add
   ```ts
     inlineFrame: { paddingTop: 4 },
   ```
   and after `captionRow: {...}` (`:265-272`) add
   ```ts
     captionRowInline: { paddingVertical: 6, marginTop: 4, borderTopWidth: 0 },
   ```
8. Header comment: append one paragraph before the closing ` */` of `:1-32`: ` * virgin-cycle25 brief 02: a second host, the MAP tab's route sheet, renders it with variant="inline" (no frame, caption only while a point is selected, no open link) and a smaller height; DEMO keeps the card.`

### 1c. `app/src/ui/catalogMapView.tsx` — camera padding follows the sheet height

- `:85` → two lines:
  ```ts
    sheetOpen: boolean;
    /** bottom camera padding while the sheet is open (virgin-cycle25 02: the route sheet is taller); default 300 */
    sheetPad?: number;
  ```
- `:165` → `      ? { padding: { top: 48, right: 48, bottom: props.sheetOpen ? (props.sheetPad ?? 300) : 48, left: 48 } }`

### 1d. `app/src/ui/RoutesScreen.tsx` — the panel

1. Imports: after `:21` `import { storedResultsForWay } from '../store/resultsStore.ts';` add
   ```ts
   import type { RideResult } from '../store/types.ts';
   ```
   and after `:27` `import { useTabNav } from './tabNav.tsx';` add
   ```ts
   import ResultsPlot from './resultsPlot.tsx';
   import {
     PANEL_PLOT_H, ROUTE_SHEET_CAMERA_PAD, ROUTE_SHEET_MAX_H, WAY_ROWS_MAX_H, trendPanelFor,
   } from './trendPanelModel.ts';
   ```
   (If tsc rejects `'./resultsPlot.tsx'` with an extension error, use `'./resultsPlot'` — DemoScreen.tsx `:118` imports it that way. Report which.)
2. After `:35` (`const [focus, setFocus] = ...`) add:
   ```tsx
     // virgin-cycle25 02: the tapped dot of the trend panel, keyed by way so a way
     // switch never carries a selection over (no effect needed: derived below).
     const [plotSel, setPlotSel] = useState<{ wayId: string; rideId: string } | null>(null);
   ```
3. After `:45` (`const route = ...`) add:
   ```tsx
     const trend = route
       ? trendPanelFor(route, focus.level === 'route' ? focus.highlightWayId : null, (id): RideResult[] => storedResultsForWay(id))
       : null;
     const plotSelected = trend !== null && plotSel !== null && plotSel.wayId === trend.wayId ? plotSel.rideId : null;
   ```
4. `:82` → `        sheetOpen={focus.level !== 'overview'}` stays; add directly under it:
   ```tsx
           sheetPad={focus.level === 'route' ? ROUTE_SHEET_CAMERA_PAD : undefined}
   ```
5. `:93` → `        <View style={[st.sheet, route ? st.sheetRoute : null, { backgroundColor: t.card, borderColor: t.cardBorder }]}>`
6. Replace the whole body `:103-124` (from `          <ScrollView>` to the matching `          </ScrollView>`, both inclusive) with:
   ```tsx
             {place ? (
               <ScrollView>
                 {place.rows.map((row) => {
                   const on = focus.level === 'place' && row.routeId === focus.highlightRouteId;
                   return (
                     <Pressable key={row.routeId} style={[st.row, { borderTopColor: t.cardBorder }]}
                       onPress={() => onPressRoute(row.routeId)}>
                       <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                       <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                     </Pressable>
                   );
                 })}
               </ScrollView>
             ) : null}
             {route && trend ? (
               <>
                 <ScrollView style={{ maxHeight: WAY_ROWS_MAX_H }}>
                   {route.ways.map((row) => {
                     const on = row.wayId === (focus.level === 'route' ? (focus.highlightWayId ?? route.usualWayId) : null);
                     return (
                       <Pressable key={row.wayId} style={[st.row, { borderTopColor: t.cardBorder }]}
                         onPress={() => setFocus({ level: 'route', routeId: route.routeId, highlightWayId: row.wayId })}>
                         <Text style={{ color: on ? t.accentText : t.text, fontSize: 14, flexShrink: 1 }}>{row.label}</Text>
                         <Text style={{ color: t.textDim, fontSize: 12.5 }}>{String(row.rides)}</Text>
                       </Pressable>
                     );
                   })}
                 </ScrollView>
                 {trend.hasPlot && trend.wayId !== null ? (
                   <View style={[st.plotWrap, { borderTopColor: t.cardBorder }]}>
                     <ResultsPlot
                       variant="inline"
                       height={PANEL_PLOT_H}
                       results={trend.results}
                       selectedRideId={plotSelected}
                       selectedPosLabel=""
                       onSelect={(id) => setPlotSel(id === null || trend.wayId === null ? null : { wayId: trend.wayId, rideId: id })}
                     />
                   </View>
                 ) : null}
               </>
             ) : null}
   ```
   The place branch is the old code moved inside its own `ScrollView`; the route rows are byte-identical to today's `:114-123` apart from the enclosing `ScrollView style`.
7. Styles: add to `st` after `sheet:`:
   ```ts
     sheetRoute: { maxHeight: ROUTE_SHEET_MAX_H },
   ```
   and after `row:`:
   ```ts
     plotWrap: { borderTopWidth: 1, paddingHorizontal: 8, paddingBottom: 4 },
   ```
8. Header comment `:1-17`: append ` * virgin-cycle25 brief 02: route focus also carries the way's trend panel (trendPanelModel.ts + ResultsPlot inline) under the way rows; place focus unchanged.` before the closing ` */`.

Height arithmetic (for the inspector): header ≈ 40 (10+10 padding + 15 pt text ≈ 20) + rows ≤ 108 (3 × (9+9+18)) + plotWrap (1 border + 4 top pad + 140 plot + 16 x-axis + 4 bottom pad = 165, + caption 4+6+16+6 = 32 while a dot is selected) ≤ 345 < ROUTE_SHEET_MAX_H 380. The sheet is bottom-anchored, so the caption appearing grows it upward by 32 px; the camera padding (400) already leaves room.

## 2. Tests

### 2a. `app/tests/trendpanel_suite.ts` — NEW

```ts
/** virgin-cycle25 brief 02: trendPanelModel.ts (pure) + source pins on the MAP
 * sheet wiring. JSON-free import chain except resultsPlotModel → colourModel
 * (bare .json seed), hence the loader hook (same as resultsmodel_suite.ts). */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { assert, test, TESTS_DIR } from './lib.ts';
import type { RideResult, SectorQuality } from '../src/store/types.ts';
import type { RouteFocusModel } from '../src/ui/catalogMapModel.ts';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
      const source = nodeFs.readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', source: `export default ${source};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { trendPanelFor, PANEL_PLOT_H, ROUTE_SHEET_MAX_H, WAY_ROWS_MAX_H, ROUTE_SHEET_CAMERA_PAD } = await import('../src/ui/trendPanelModel.ts');
const { PLOT_N } = await import('../src/ui/resultsPlotModel.ts');

const src = (...p: string[]) => nodeFs.readFileSync(path.resolve(TESTS_DIR, '..', ...p), 'utf8');

function mk(rideId: string, startedAtMs: number, rawS: number, wayId: string, quality: SectorQuality = 'clean', extra: Partial<RideResult> = {}): RideResult {
  const movingS = quality === 'estimated' || quality === 'missed' ? null : rawS;
  return {
    kind: 'rideResult', schemaVersion: 2, rideId, startedAtMs, wayId, source: 'app',
    lap: { rawS, movingS, quality }, sectors: [],
    derivedBy: { engineVersion: 'test', gateSetVersion: 1, resultSchemaVersion: 2 },
    ...extra,
  };
}
const route = (usualWayId: string | null, ways: string[]): RouteFocusModel => ({
  routeId: 'rHW', label: 'Home → Work', usualWayId,
  ways: ways.map((wayId) => ({ wayId, label: wayId, rides: 0, usual: wayId === usualWayId, path: null })),
  bounds: null,
});
const store: Record<string, RideResult[]> = {
  w1: [mk('a', 1000, 600, 'w1'), mk('b', 2000, 610, 'w1')],
  w2: [mk('c', 3000, 700, 'w2', 'clean', { ignoredFromRanking: true }), mk('d', 4000, 0, 'w2', 'estimated')],
  w3: [],
};
const resultsFor = (id: string) => store[id] ?? [];

test('trendpanel: the highlighted way wins, else the usual way, else the first way, else null', () => {
  assert(trendPanelFor(route('w1', ['w1', 'w2']), 'w2', resultsFor).wayId === 'w2', 'highlighted');
  assert(trendPanelFor(route('w1', ['w1', 'w2']), null, resultsFor).wayId === 'w1', 'usual');
  assert(trendPanelFor(route(null, ['w3', 'w1']), null, resultsFor).wayId === 'w3', 'first way');
  const none = trendPanelFor(route(null, []), null, resultsFor);
  assert(none.wayId === null && none.results.length === 0 && none.hasPlot === false, 'zero ways: nothing');
});

test('trendpanel: hasPlot needs at least one RANKED activity (ignored / estimated do not count); results are the raw store slice', () => {
  const w1 = trendPanelFor(route('w1', ['w1']), null, resultsFor);
  assert(w1.hasPlot && w1.results.length === 2, 'two clean activities plot');
  const w2 = trendPanelFor(route('w2', ['w2']), null, resultsFor);
  assert(!w2.hasPlot && w2.results.length === 2, 'ignored + estimated: results kept, no plot');
  assert(!trendPanelFor(route('w3', ['w3']), null, resultsFor).hasPlot, 'empty way: no plot');
  const one = trendPanelFor(route('w1', ['w1']), null, (id) => resultsFor(id).slice(0, 1));
  assert(one.hasPlot, 'a single ranked activity is a (one-dot) plot');
});

test('trendpanel: layout constants — plot shorter than the DEMO card, sheet taller than the place sheet, camera pad covers the sheet', () => {
  assert(PANEL_PLOT_H === 140 && PANEL_PLOT_H < 220, `PANEL_PLOT_H ${PANEL_PLOT_H}`);
  assert(ROUTE_SHEET_MAX_H === 380 && ROUTE_SHEET_MAX_H > 280, `ROUTE_SHEET_MAX_H ${ROUTE_SHEET_MAX_H}`);
  assert(WAY_ROWS_MAX_H === 108, `WAY_ROWS_MAX_H ${WAY_ROWS_MAX_H}`);
  assert(ROUTE_SHEET_CAMERA_PAD >= ROUTE_SHEET_MAX_H + 12, 'camera pad must clear the sheet (bottom 34, but the tab bar sits below the map view)');
  assert(40 + WAY_ROWS_MAX_H + 1 + 4 + PANEL_PLOT_H + 16 + 4 + 32 <= ROUTE_SHEET_MAX_H, 'header + 3 rows + plot + caption fit the sheet');
  assert(PLOT_N === 10, 'the panel plots the 10-activity ranking pool (brief 01)');
});

test('trendpanel: RoutesScreen wires the inline plot under the way rows, date + time only, no open link, no new text', () => {
  const rs = src('src', 'ui', 'RoutesScreen.tsx');
  assert(rs.includes('<ResultsPlot') && rs.includes('variant="inline"') && rs.includes('height={PANEL_PLOT_H}'), 'inline plot');
  assert(rs.includes('selectedPosLabel=""') && !rs.includes('onOpenRide='), 'caption is date · time only');
  assert(rs.includes('trend.hasPlot && trend.wayId !== null ?'), 'no plot without a ranked activity');
  assert(rs.includes('sheetPad={focus.level === \'route\' ? ROUTE_SHEET_CAMERA_PAD : undefined}'), 'camera pad follows the route sheet');
  assert(rs.includes('maxHeight: WAY_ROWS_MAX_H'), 'way rows scroll, the plot stays');
  assert(!rs.includes('LAST ') && !rs.includes('windowCaption') && !rs.includes('allTimeBest') && !rs.includes('rankingPoolFor'), 'no caption, no rank, no all-time anything');
  const plot = src('src', 'ui', 'resultsPlot.tsx');
  assert(plot.includes('onOpenRide?:') && plot.includes("variant?: 'card' | 'inline'") && !plot.includes('height: PLOT_H'), 'plot: optional open, variant, height prop');
  assert(plot.includes('{inline && selectedPoint === null ? null : ('), 'inline: no caption row without a selection');
  const map = src('src', 'ui', 'catalogMapView.tsx');
  assert(map.includes('props.sheetOpen ? (props.sheetPad ?? 300) : 48'), 'camera padding keeps 300 as the default');
  const demo = src('src', 'ui', 'DemoScreen.tsx');
  assert(!demo.includes('variant=') && demo.includes('onOpenRide={() =>'), 'DEMO keeps the card variant and its no-op open');
});
```

### 2b. `app/tests/run.ts`

After `:49` `import './catalogmap_suite.ts';` add `import './trendpanel_suite.ts';`

Expected: brief 01's `925 tests: 922 pass, 0 fail, 3 skip` → `929 tests: 926 pass, 0 fail, 3 skip`. `catalogmap_suite` pins (`<CatalogMapView`, no `YOUR PLACES`), the recordflow badge / em-dash / "ride" scans and the ui-strings live-tree test pass UNEDITED. If any of them fails: STOP, report verbatim.

## 3. Visible text

| file | kind | exact text | status |
|---|---|---|---|
| (none) | | | No string is added, moved or removed. `resultsPlot.tsx`'s three literals are byte-identical. The caption shows only `towerDate(...)` · `fmt(...)` (computed, already allow-listed by their formatters' hosts). |

`git diff -- app/tests/ui-strings.allow.json` must be EMPTY. If the live-tree test reports anything: STOP.

## 4. Decisions already made (Planner rulings)

- Extend the cycle24 sheet (C7): the way rows ARE the switcher and stay even for a single-way route (they carry the ride count cycle24 shows; removing them for one way would hide it). No chips, no segmented control, no second sheet.
- Plot look unchanged (C2): newest dot yellow, rest grey, dotted average; no tone colours, no purple fastest dot.
- Caption = date · time only (decision 3), shown only while a dot is selected: no "tap a point" hint (CONVENTIONS: no hint restating the obvious), no `open ›` (the ride's page is one tap away in ACTIVITIES; a link to it is a follow-up — OPEN-ITEMS), no `LAST N ACTIVITIES` caption (the panel is "the scatterplot alone"; the dot count says it).
- Empty state: no ranked activity on the way → no plot, no text; the sheet is exactly cycle24's. One ranked activity → one dot (honest, already handled by the model).
- Borderless: `variant="inline"` draws no frame/box inside the sheet's box; a 1 px top rule (`plotWrap`) separates rows from plot, same idiom as the row dividers.
- Heights: fixed constants in `trendPanelModel.ts` (tunable in one place): plot 140, route sheet max 380, rows max 108, camera pad 400. Place focus keeps 280/300.
- Hardware back: unchanged (MAP → RECORD, cycle24 behaviour); a back-to-overview step is logged for OPEN-ITEMS, not built.
- Sport scoping: unchanged (`activeCatalog()` per render; results are per way id, which is sport-specific by construction).
- Selection state is keyed by way (`{wayId, rideId}`) and derived, so no `useEffect` reset and no hook-order change.
- Detail page → MAP panel link (decision 7 / C6): DEFERRED. It needs a focus request channel through `TabNav` + App state; too much for this cycle's "panel alone". Logged in OPEN-ITEMS (§7).

## 5. Acceptance

1. Pre-flight passes.
2. tsc exit 0 (`tsc-brief02.log`, `timeout_ms: 180000`); run.ts `929 tests: 926 pass, 0 fail, 3 skip` (`run-brief02.log`; baseline `run-brief02-baseline.log` = brief 01's counts).
3. `git diff -- app/tests/ui-strings.allow.json` empty.
4. `grep -c "height: PLOT_H" app/src/ui/resultsPlot.tsx` = 0; `grep -c "height: plotH" app/src/ui/resultsPlot.tsx` = 3.
5. `grep -n "ResultsPlot" app/src/ui/DemoScreen.tsx` unchanged (`git diff -- app/src/ui/DemoScreen.tsx` empty).
6. `grep -n " — " app/src/ui/RoutesScreen.tsx app/src/ui/trendPanelModel.ts` → only lines starting with `//` or ` *` (or nothing).
7. `git status --short`: `M app/src/ui/RoutesScreen.tsx`, `M app/src/ui/catalogMapView.tsx`, `M app/src/ui/resultsPlot.tsx`, `M app/tests/run.ts`, `?? app/src/ui/trendPanelModel.ts`, `?? app/tests/trendpanel_suite.ts` (+ brief 01's four files, + cycle logs). Nothing else.

## 6. Out of scope — do NOT touch

`resultsPlotModel.ts` (brief 01 owns it), `catalogMapModel.ts`, `DemoScreen.tsx`, `demoModel.ts`, `RideDetailScreen.tsx`, `activityCard.tsx`, `feedModel.ts`, `App.tsx`, `tabNav.tsx`, every RESULTS file (brief 03), any `tests/catalogmap_suite.ts` or `recordflow_suite.ts` line, the allow list.

## 7. For the coordinator (OPEN-ITEMS, not edited by you — put this in the report)

"virgin-cycle25 brief 02 (MAP trend panel), on-device checks owed: (a) the route sheet (max 380 dp) still leaves the route visible on a short phone — knobs `ROUTE_SHEET_MAX_H`, `ROUTE_SHEET_CAMERA_PAD`, `PANEL_PLOT_H` in `app/src/ui/trendPanelModel.ts`; (b) dot tap inside the sheet (hitSlop 8) vs the sheet's own scroll; (c) way-row tap re-plots and clears the dot caption; (d) night/day contrast of the grey dots on `t.card`. Follow-ups, not built: a link from the ride detail page into this panel (needs a focus-request channel in TabNav + App state — C6); hardware back in route focus going to overview before leaving the tab; `open ›` from a dot to the ride page."

## 8. Stop-on-ambiguity / report

As `EXECUTOR-RULES.md`. Report: steps; `git status --short`; test counts before/after; tsc; `git diff --stat`; allow-list diff (expected empty); the §7 paragraph verbatim; any mismatch verbatim as a STOP.

## RULING (post-escalation, 2026-10-08, fresh Fable) — section 2a, last test, last assert

**Facts verified in the code.** `app/src/ui/DemoScreen.tsx:664` and `:669` carry `variant="live"` on the two live-map views (unrelated to the plot); the only `<ResultsPlot` element is `:788-794`, has no `variant` prop and does have `onOpenRide={() =>`. The executor's edits are correct; the brief's pin `!demo.includes('variant=')` is over-broad (whole file). Executor was right to stop.

**Why not the suggested regex.** `/<ResultsPlot[^>]*variant=/` is wrong too: `[^>]*` stops at the `>` of the arrow in `onOpenRide={() => …}`, so a `variant="inline"` added AFTER `onOpenRide` would not be matched and the test would pass when it should fail. The pin must scope to the whole element, `<ResultsPlot` … `/>`.

**Exact edit for the executor** — in `app/tests/trendpanel_suite.ts`, last test, replace these two lines:
```ts
  const demo = src('src', 'ui', 'DemoScreen.tsx');
  assert(!demo.includes('variant=') && demo.includes('onOpenRide={() =>'), 'DEMO keeps the card variant and its no-op open');
```
with:
```ts
  const demo = src('src', 'ui', 'DemoScreen.tsx');
  const demoPlotStart = demo.indexOf('<ResultsPlot');
  const demoPlotEnd = demo.indexOf('/>', demoPlotStart);
  assert(demoPlotStart !== -1 && demoPlotEnd > demoPlotStart, 'DEMO still mounts <ResultsPlot … />');
  const demoPlot = demo.slice(demoPlotStart, demoPlotEnd);
  assert(!demoPlot.includes('variant=') && demoPlot.includes('onOpenRide={() =>'), 'DEMO keeps the card variant and its no-op open');
```
Mutation check: `<ResultsPlot` occurs once in DemoScreen.tsx (the comments at `:66`/`:779` have no `<`); the slice is the whole element `:788-794`. Adding `variant=…` anywhere inside that element — before or after `onOpenRide` — lands in the slice and FAILS the test; the `variant="live"` at `:664`/`:669` is outside it. Dropping `onOpenRide` from the element also fails.

Nothing else changes: no app/ edit, DemoScreen.tsx stays untouched (acceptance 5 still holds). Expected after the fix: `929 tests: 926 pass, 0 fail, 3 skip`. Then run acceptance greps 4-6 and finish the report + the section 7 OPEN-ITEMS paragraph as written.

**Other pins reviewed.** The remaining trendpanel pins are presence pins or absence pins that are MEANT to be whole-file (`RoutesScreen.tsx` must contain no `onOpenRide=`, `LAST `, `windowCaption`, `allTimeBest`, `rankingPoolFor` at all; `resultsPlot.tsx` no `height: PLOT_H`) — all pass against the executor's edits and are not over-broad. brief-03 had one pin of the same kind (`!nav.includes('openResultsRoute')` vs a replacement comment that named `openResultsRoute`) — fixed in brief-03 1c step 1, plus its acceptance 5 (`'results'` grep) corrected; both marked RULING there.
