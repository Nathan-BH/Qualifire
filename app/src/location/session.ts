/**
 * Active-ride marker, persisted to disk.
 *
 * Why this exists: the background location task can wake this JS bundle
 * headlessly (app killed, foreground service still delivering fixes). All
 * module state is gone in that launch, but the task still needs to know which
 * rideId to append to. A tiny JSON marker in the app's document directory is
 * the source of truth for "a ride is being recorded".
 *
 * Uses expo-file-system (legacy API — stable, well-documented). The native
 * module is already inside dev build 944bcc6f because expo-file-system is a
 * direct dependency of the `expo` package (verified in node_modules:
 * expo@56.0.19 depends on expo-file-system ~56.0.9), so no APK rebuild is
 * needed. [UNTESTED ON DEVICE]
 */
import * as FileSystem from 'expo-file-system/legacy';

export interface ActiveSession {
  rideId: string;
  startedAtMs: number;
  /** Cycle 025 (startup stale-fix cleanup): the START button press timestamp,
   * used to flag cached/stale fixes that arrive with tUnixMs predating START.
   * Optional for back-compat with markers written before this field existed. */
  startPressedAtMs?: number;
  /** WP-B fix B1: which mode this ride was started in, and (for 'free') which
   * catalog routes the engine was restricted to — persisted so a headless
   * relaunch mid-ride can re-arm the engine in the SAME mode it left in,
   * rather than defaulting to 'route' (see location/index.ts's
   * TaskManager.defineTask handler and D-025). Optional/undefined for a
   * marker written before this fix — tolerated as 'route' by omission,
   * matching every ride recorded before B1 (they were all route rides; free
   * mode did not exist yet). */
  mode?: 'route' | 'free';
  routeIds?: string[] | null;
  /** Cycle 025 (P4): last-known-alive heartbeat, refreshed by the location
   * task every HEARTBEAT_EVERY_N_FIXES fixes (location/index.ts) and set at
   * startTracking. On relaunch recovery, ensureSession derives
   * downS = (now - lastAliveAtMs)/1000 for the relaunch event — measuring
   * the outage, not just counting it. Optional: a marker written before this
   * field existed still loads (downS is then simply omitted). */
  lastAliveAtMs?: number;
}

function markerUri(): string {
  // documentDirectory is null only on web; this app is Android-only.
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory available');
  return `${dir}qualifire-active-ride.json`;
}

export async function saveSession(s: ActiveSession): Promise<void> {
  await FileSystem.writeAsStringAsync(markerUri(), JSON.stringify(s));
}

export async function loadSession(): Promise<ActiveSession | null> {
  try {
    const info = await FileSystem.getInfoAsync(markerUri());
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(markerUri());
    const parsed = JSON.parse(raw) as Partial<ActiveSession>;
    if (typeof parsed.rideId === 'string' && typeof parsed.startedAtMs === 'number') {
      const mode = parsed.mode === 'free' ? 'free' : parsed.mode === 'route' ? 'route' : undefined;
      const routeIds = Array.isArray(parsed.routeIds) ? parsed.routeIds : parsed.routeIds === null ? null : undefined;
      const startPressedAtMs =
        typeof parsed.startPressedAtMs === 'number' && Number.isFinite(parsed.startPressedAtMs)
          ? parsed.startPressedAtMs
          : undefined;
      const lastAliveAtMs =
        typeof parsed.lastAliveAtMs === 'number' && Number.isFinite(parsed.lastAliveAtMs)
          ? parsed.lastAliveAtMs
          : undefined;
      return {
        rideId: parsed.rideId,
        startedAtMs: parsed.startedAtMs,
        startPressedAtMs,
        mode,
        routeIds,
        lastAliveAtMs,
      };
    }
    // Corrupt marker: discard rather than crash the task forever.
    await clearSession();
    return null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await FileSystem.deleteAsync(markerUri(), { idempotent: true });
  } catch {
    // Best-effort; a stale marker is handled by loadSession/recovery.
  }
}
