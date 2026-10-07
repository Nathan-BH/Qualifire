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
  const demoPlotStart = demo.indexOf('<ResultsPlot');
  const demoPlotEnd = demo.indexOf('/>', demoPlotStart);
  assert(demoPlotStart !== -1 && demoPlotEnd > demoPlotStart, 'DEMO still mounts <ResultsPlot … />');
  const demoPlot = demo.slice(demoPlotStart, demoPlotEnd);
  assert(!demoPlot.includes('variant=') && demoPlot.includes('onOpenRide={() =>'), 'DEMO keeps the card variant and its no-op open');
});
