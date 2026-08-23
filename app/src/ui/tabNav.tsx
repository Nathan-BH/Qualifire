/**
 * Tab-navigation seam (Cycle 024, WP-A2): lets a screen switch tabs (e.g.
 * RecordScreen sending the rider to Result once the ride is saved and the
 * reversed launch mark has finished) WITHOUT importing App.tsx / Shell —
 * screens depend on this module, App owns the implementation (`go: setTab`).
 *
 * `Tab` is exported from here (not App.tsx) precisely so a screen can import
 * the type without creating a screen -> App -> screen import cycle.
 */
import { createContext, useContext, type ReactNode } from 'react';

// 'demo' = the old Preview tab, renamed (IDEAS §26, 2026-08-16). The five
// real tabs of the mockup (2026-08-16), plus 'demo' kept for the quick
// sound/colour/flow check.
export type Tab = 'record' | 'rides' | 'routes' | 'result' | 'settings' | 'demo';

export interface TabNav {
  go(tab: Tab): void;
}

const TabNavContext = createContext<TabNav | null>(null);

export function TabNavProvider({ go, children }: { go: (tab: Tab) => void; children: ReactNode }) {
  return <TabNavContext.Provider value={{ go }}>{children}</TabNavContext.Provider>;
}

/** Throws if used outside a TabNavProvider — every screen mounts inside
 * Shell, which always provides one; a missing provider is a real bug, not a
 * state worth degrading silently for. */
export function useTabNav(): TabNav {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error('useTabNav() called outside a TabNavProvider');
  return ctx;
}
