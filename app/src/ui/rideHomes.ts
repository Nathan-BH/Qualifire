/**
 * virgin-cycle18 brief 04 (Nathan 2026-09-29): "All rides deserve a spot
 * somewhere, and should show up in the results tab." Every FINISHED ride has
 * exactly one home in RESULTS — under its route › way (a stored result with
 * a wayId, or the way it is the reference of) or in FREE RIDES (a free-ride
 * record). settleRideHomes() makes that true for whatever is on disk:
 *
 *  1. the backfill pass RidesScreen ran inline until this brief (ended
 *     rides, per-ride sport scoping, `mode !== 'free'`), now ALSO skipping
 *     rides that carry a free record — a free ride is never re-derived as a
 *     route ride (D-025's rule, carried over to the label that replaced
 *     free mode; the way back is "Not a free ride" on the ride detail);
 *  1b. (Inspect follow-up, 2026-09-30) every user way whose reference ride
 *     has no stored result gets one — timed on its own way at the current
 *     gates, any quality (store/routeFromRide.ts timeMissingReference) —
 *     because RESULTS lists stored results only, and a reference stuck
 *     behind a pre-brief-02 marker or a `missed` v1 lap was invisible there;
 *  2. then every ended ride still without a home is filed as a free ride
 *     (its own startMs, wall-clock duration, effective sport).
 *
 * Idempotent (both steps skip what is already settled), never throws, cheap
 * after the first pass. Called on RIDES and RESULTS mount. Boot runs only
 * step 1 (lastRide.initRideHistory, with the same free-record skip handed
 * in from App.tsx — lastRide must not import this store). Lives in ui/
 * because store/resultsStore, store/catalog and ui/lastRide are barred from
 * importing store/freeRides (its header's structural rule) — a ui/ module
 * that reads all of them is the only place this composition can sit.
 */
import type { FsAdapter } from '../storage/fsAdapter.ts';
import { decodeIndex } from '../storage/rideIndex.ts';
import type { IndexEntry } from '../storage/types.ts';
import { backfillMissingResults, getStoredResult } from '../store/resultsStore.ts';
import { freeRideNear, freeRideResults, markRideFree } from '../store/freeRides.ts';
import { currentCatalog, userCatalog } from '../store/catalogStore.ts';
import { timeMissingReference } from '../store/routeFromRide.ts';
import { effectiveRideSportId, wayIdsOfSport } from '../store/sports.ts';
import { currentSports } from '../store/sportStore.ts';

export type RideHomeEntry = Pick<IndexEntry, 'rideId' | 'startMs' | 'endMs' | 'status' | 'mode' | 'sportId'>;

/** Step-1 candidates: ended, not recorded in the retired free MODE, and not
 * carrying a free record (`isFree` — the caller's freeRideNear by startMs,
 * the same tolerance match RIDES/detail resolve the label with). Pure. */
export function backfillCandidates(
  entries: readonly RideHomeEntry[],
  isFree: (rideId: string, startMs: number) => boolean,
): RideHomeEntry[] {
  return entries.filter((r) => r.status === 'ended' && r.mode !== 'free' && !isFree(r.rideId, r.startMs));
}

/** Step-2 candidates: ended (endMs known), no stored result on a way, not a
 * way's reference, no free record. Legacy `mode: 'free'` rides ARE
 * candidates (they are free rides by definition; only those with >=1 gate
 * crossing ever got a record under WP-B). Pure. */
export function orphanRides(
  entries: readonly RideHomeEntry[],
  hasWayResult: (rideId: string) => boolean,
  isReference: (rideId: string) => boolean,
  isFree: (rideId: string, startMs: number) => boolean,
): RideHomeEntry[] {
  return entries.filter((r) => (
    r.status === 'ended' && r.endMs !== null
    && !hasWayResult(r.rideId) && !isReference(r.rideId) && !isFree(r.rideId, r.startMs)
  ));
}

/** Both steps against the live stores. Returns the rideIds filed free in
 * this pass (empty when everything already had a home). Never throws. */
export async function settleRideHomes(fs: FsAdapter): Promise<string[]> {
  const filed: string[] = [];
  try {
    const text = await fs.readText('index.json');
    const rideIndex = text !== null ? decodeIndex(text) : null;
    if (rideIndex === null) return filed;
    const isFree = (_rideId: string, startMs: number) => freeRideNear(freeRideResults(), startMs) !== null;

    // 1. RidesScreen.tsx's backfill effect, verbatim, minus free rides.
    const candidates = backfillCandidates(rideIndex.rides, isFree);
    const sportByRideId = new Map(candidates.map((r) => [r.rideId, r.sportId]));
    await backfillMissingResults(fs, candidates.map((r) => r.rideId), (rideId) => {
      const f = currentSports();
      return wayIdsOfSport(currentCatalog(), effectiveRideSportId(sportByRideId.get(rideId), f), f);
    });

    // 1b. A way whose reference ride has no stored result is invisible in
    // RESULTS (it lists stored results only) — time the reference on its own
    // way now. Idempotent: a stored reference result short-circuits.
    for (const w of userCatalog().ways) await timeMissingReference(w.id, fs);

    // 2. Whatever still has no home is a free ride.
    const ways = currentCatalog().ways;
    const orphans = orphanRides(
      rideIndex.rides,
      (rideId) => getStoredResult(rideId)?.wayId != null,
      (rideId) => ways.some((w) => w.referenceRideId === rideId),
      isFree,
    );
    for (const r of orphans) {
      markRideFree(
        r.rideId,
        r.startMs,
        r.endMs !== null ? Math.max(0, (r.endMs - r.startMs) / 1000) : null,
        effectiveRideSportId(r.sportId, currentSports()),
      );
      filed.push(r.rideId);
    }
  } catch { /* best-effort — the screens render off whatever is already stored */ }
  return filed;
}
