/**
 * Tab-navigation seam (Cycle 024, WP-A2; WP-H 2026-09-04 — the ride-detail
 * overlay; WP-J 2026-09-05 extended scope — the full-screen gate editor):
 * lets a screen switch tabs or open a full-screen overlay WITHOUT importing
 * App.tsx / Shell — screens depend on this module, App owns the
 * implementation (`go: setTab`, `openRide: setRideDetail`, `closeRide`,
 * `openGateAdjust: setGateAdjust`, `closeGateAdjust`).
 *
 * `Tab` is exported from here (not App.tsx) precisely so a screen can import
 * the type without creating a screen -> App -> screen import cycle.
 */
import { createContext, useContext, type ReactNode } from 'react';

// 'demo' = the old Preview tab, renamed (IDEAS §26, 2026-08-16). WP-H drops
// 'result': the RESULT tab is gone (Nathan, Q4 — "Lets drop the results tab
// entirely"); its job is now the full-screen ride detail overlay below.
export type Tab = 'record' | 'rides' | 'routes' | 'settings' | 'demo';

/** WP-H: who opened the ride detail, and for which ride. `source` decides
 * where CLOSE lands (post-stop → RECORD's idle setup, 'rides' → the RIDES
 * list) and what the primary button says. `startedAtMs` is the SESSION's
 * start (location/index.ts:329) when the opener has it — the exact key a
 * free-ride record is filed under (`free:${startedAtMs}`, freeRides.ts:127);
 * RIDES only knows the raw index's startMs (a few ms earlier), so it passes
 * that and rideDetailModel falls back to a tolerance match. */
export interface RideDetailRequest {
  rideId: string;
  source: 'post-stop' | 'rides';
  startedAtMs: number;
}

/** WP-J (extended scope, 2026-09-05): who to edit the gates of. Opened from
 * ROUTES' "edit gates" (RoutesScreen.tsx) — the editor resolves the draft
 * itself (store/wayFromRide.ts gateEditDraftFor) so the request stays a
 * plain id, like RideDetailRequest. */
export interface GateAdjustRequest {
  routeId: string;
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
