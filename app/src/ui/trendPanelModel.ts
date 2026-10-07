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
