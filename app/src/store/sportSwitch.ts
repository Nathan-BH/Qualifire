/**
 * WP-1 (2026-09-06, C1/C6): the reset rule for RECORD's setup phase when the
 * rider taps a different sport pill. Pure so the rule is pinned by a test,
 * not eyeballed on device: a pick (way/route) from the sport just left must
 * never survive onto the newly-scoped catalog.
 */
import { defaultEndpoints } from './defaultWay.ts';
import type { Catalog } from './types.ts';

export interface AfterSportSwitch {
  from: string | null;
  to: string | null;
  wayPick: null;
}

/** `defaultEndpoints(catalog)` plus an explicit, always-null way pick. Call
 * with the NEWLY-scoped catalog (activeCatalog() after saveSports has
 * already flipped the active sport). */
export function afterSportSwitch(catalog: Catalog): AfterSportSwitch {
  const eps = defaultEndpoints(catalog);
  return { from: eps.from, to: eps.to, wayPick: null };
}
