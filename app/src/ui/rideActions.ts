/**
 * virgin-cycle23 brief 01: the three quick actions an activity offers from
 * BOTH the feed card's menu (brief 02) and the detail page's menu (brief 03) —
 * one body each, moved verbatim out of RideDetailScreen.tsx (WP-H) so the
 * two surfaces can never drift. Store side effects are the same calls, in
 * the same order, as the detail screen made before this brief.
 */
import { Alert } from 'react-native';
import type { RideMeta } from '../storage/types';
import { deleteRide, exportGpxPlus } from '../storage';
import { removeStoredResult, setIgnoredFromRanking } from '../store/resultsStore.ts';
import { unmarkRideFree } from '../store/freeRides.ts';
import { dropRecorded, replaceRecorded } from './lastRide.ts';
import { gpxBaseName, saveGpx } from './saveGpx.ts';

function fmtWhen(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}m${String(s % 60).padStart(2, '0')}s`;
}

/** The Delete confirm + the delete itself. `freeRideId` = model.free?.rideId ?? null
 * (so no orphan free record, virgin-cycle16 02). `onDeleted` runs after the stores are
 * updated (detail: tabNav.closeRide(); feed: refresh()). */
export function confirmDeleteRide(meta: RideMeta, freeRideId: string | null, onDeleted: () => void): void {
  Alert.alert(
    'Delete activity?',
    `${fmtWhen(meta.startMs)} · ${fmtDur(meta.endMs - meta.startMs)}\nThis permanently removes the raw trace.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRide(meta.rideId);
            await removeStoredResult(meta.rideId);
            dropRecorded(meta.rideId);
            if (freeRideId !== null) unmarkRideFree(freeRideId);
            onDeleted();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ],
  );
}

/** Ignore/Count in ranking. Returns true when the store changed (caller bumps its tick). */
export async function toggleIgnoreRide(rideId: string, nowIgnored: boolean): Promise<boolean> {
  try {
    const upd = await setIgnoredFromRanking(rideId, nowIgnored);
    if (upd) replaceRecorded(upd);
    return true;
  } catch (e) {
    Alert.alert('Could not update', e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Export GPX+ via SAF / share-text, with the same three alerts as before. */
export async function exportRideGpx(meta: RideMeta): Promise<void> {
  try {
    const gpx = await exportGpxPlus(meta.rideId);
    const base = gpxBaseName(meta.startMs);
    const result = await saveGpx(base, gpx);
    if (result.method === 'saf') {
      Alert.alert('Exported', `${base}.gpx saved to the folder you picked.`);
    } else if (result.method === 'share-text') {
      Alert.alert('Shared', 'GPX sent as text via the share sheet.');
    }
  } catch (e) {
    Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
  }
}
