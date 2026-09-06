/**
 * Tab-navigation seam (Cycle 024, WP-A2; WP-H 2026-09-04 — the ride-detail
 * overlay; WP-J 2026-09-05 extended scope — the full-screen gate editor;
 * WP-K (cycle 2) 2026-09-05 — the catalog (place/way) detail): lets a screen
 * switch tabs or open a full-screen overlay WITHOUT importing App.tsx / Shell
 * — screens depend on this module, App owns the implementation (`go:
 * setTab`, `openRide: setRideDetail`, `closeRide`, `openGateAdjust:
 * setGateAdjust`, `closeGateAdjust`, `openCatalog: setCatalogDetail`,
 * `closeCatalog`, `openResults: setResultsDetail`, `closeResults`).
 *
 * `Tab` is exported from here (not App.tsx) precisely so a screen can import
 * the type without creating a screen -> App -> screen import cycle.
 */
import { createContext, useContext, type ReactNode } from 'react';

// 'demo' = the old Preview tab, renamed (IDEAS §26, 2026-08-16). WP-H dropped
// the old RESULT tab (Nathan, Q4 — "Lets drop the results tab entirely");
// its job moved to the full-screen ride detail overlay below. WP-2 (cycle 3)
// re-introduced it as 'results' — a per-way history tab, not a revival of
// the old RESULT screen.
export type Tab = 'record' | 'rides' | 'routes' | 'results' | 'settings' | 'demo';

/** WP-H: who opened the ride detail, and for which ride. `source` decides
 * where CLOSE lands (post-stop → RECORD's idle setup, 'rides' → the RIDES
 * list, 'routes' → the way detail underneath — WP-K (cycle 2)'s reference-
 * ride row, 'results' → the RESULTS way detail underneath — WP-2) and what
 * the primary button says. `startedAtMs` is the SESSION's
 * start (location/index.ts:329) when the opener has it — the exact key a
 * free-ride record is filed under (`free:${startedAtMs}`, freeRides.ts:127);
 * RIDES only knows the raw index's startMs (a few ms earlier), so it passes
 * that and rideDetailModel falls back to a tolerance match. */
export interface RideDetailRequest {
  rideId: string;
  source: 'post-stop' | 'rides' | 'routes' | 'results';
  startedAtMs: number;
}

/** WP-J (extended scope, 2026-09-05): who to edit the gates of. Opened from
 * ROUTES' "edit gates" (now the way detail, WP-K cycle 2) — the editor
 * resolves the draft itself (store/wayFromRide.ts gateEditDraftFor) so the
 * request stays a plain id, like RideDetailRequest. */
export interface GateAdjustRequest {
  wayId: string;
}

/** WP-K (cycle 2): who to show the full-screen catalog detail for — a place
 * or a way (a route never gets its own screen; a way's routes are its
 * variants, shown inside the way detail). */
export type CatalogDetailRequest = { kind: 'place'; id: string } | { kind: 'route'; id: string };

/** WP-2: who to show the full-screen RESULTS detail for — one way's board
 * plus its last-9 scatterplot. A plain id, like GateAdjustRequest. */
export interface ResultsDetailRequest {
  wayId: string;
}

export interface TabNav {
  go(tab: Tab): void;
  /** WP-H: show the full-screen ride detail over whatever tab is active
   * (Shell mount-swaps it in and hides the tab bar, same chrome rule as
   * WP-A2's recFullscreen). Idempotent: re-opening replaces the request. */
  openRide(req: RideDetailRequest): void;
  /** WP-H: dismiss the detail; the active tab's screen remounts underneath. */
  closeRide(): void;
  /** WP-J: show the full-screen gate editor over whatever tab is active
   * (Shell mount-swaps it in and hides the tab bar — the same chrome rule as
   * openRide). Idempotent: re-opening replaces the request. */
  openGateAdjust(req: GateAdjustRequest): void;
  /** WP-J: dismiss the editor; the active tab's screen remounts underneath. */
  closeGateAdjust(): void;
  /** WP-K (cycle 2): show the full-screen place/way detail over the ROUTES
   * tab (Shell mount-swaps it in and hides the tab bar). Idempotent:
   * re-opening replaces the request; the ride detail and the gate editor,
   * when open, sit above it. */
  openCatalog(req: CatalogDetailRequest): void;
  /** WP-K (cycle 2): dismiss the detail; ROUTES remounts underneath and
   * re-reads the catalog on its own. */
  closeCatalog(): void;
  /** WP-2: show the full-screen RESULTS detail for one way, over whatever
   * tab is active (Shell mount-swaps it in and hides the tab bar — the same
   * chrome rule as the other overlays). Idempotent: re-opening replaces the
   * request. */
  openResults(req: ResultsDetailRequest): void;
  /** WP-2: dismiss the detail; the active tab's screen remounts underneath. */
  closeResults(): void;
}

const TabNavContext = createContext<TabNav | null>(null);

export function TabNavProvider({ nav, children }: { nav: TabNav; children: ReactNode }) {
  return <TabNavContext.Provider value={nav}>{children}</TabNavContext.Provider>;
}

/** Throws if used outside a TabNavProvider — every screen mounts inside
 * Shell, which always provides one; a missing provider is a real bug, not a
 * state worth degrading silently for. */
export function useTabNav(): TabNav {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error('useTabNav() called outside a TabNavProvider');
  return ctx;
}
