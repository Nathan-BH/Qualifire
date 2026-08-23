/**
 * Qualifire location layer — Phase 1 (B-24). [UNTESTED ON DEVICE]
 *
 * expo-location + expo-task-manager wiring:
 *  - defineTask at module scope (required: headless launches must see it),
 *  - two-step Android permission flow (while-in-use, then background),
 *  - foreground-service background updates: timeInterval 1000 ms,
 *    distanceInterval 0 (RE finding: a non-zero distance filter suppresses
 *    fixes at standstill, which destroys stopped-time measurement),
 *  - every fix funnelled to storage via the B-24 interface contract,
 *  - relaunch recovery via a persisted active-ride marker (./session).
 *
 * Storage (../storage) is the Backend Dev's module per the interface
 * contract; it is imported, never implemented here.
 */
import { Vibration } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants'; // [UNTESTED ON DEVICE]
import { appendFix, startRide, endRide, appendRideEvent } from '../storage';
import { liveEngine } from '../live/engine';
import { checkElevationOutlier, ELEVATION_OUTLIER_RATE_MPS } from './elevationOutlier';
import { ActiveSession, saveSession, loadSession, clearSession } from './session';

export const LOCATION_TASK = 'qualifire-ride-tracking';

export type { ActiveSession };

export interface RideSummary {
  rideId: string;
  nFixes: number;
  startMs: number;
  endMs: number;
}

/** GPX+ diagnostics logging. Swallow-everything — never disturb recording,
 * same doctrine as the engine-feed try/catch below. */
function logEvent(rideId: string, ev: import('../storage').RideEvent): void {
  appendRideEvent(rideId, ev).catch(() => { /* diagnostics only — never disturb recording */ });
}

// ---------------------------------------------------------------------------
// Module state + status emitter (lives per JS launch; disk marker is truth)
// ---------------------------------------------------------------------------

export interface TrackerStatus {
  session: ActiveSession | null;
  /** Fixes appended since this JS bundle launched (resets on app relaunch —
   * the on-disk ride keeps ALL fixes; endRide reports the true total). */
  fixesThisLaunch: number;
  lastFixMs: number | null;
  /** last fix position — display only (the live map's dot); never persisted
   * here, the raw JSONL remains the only record (D-023). */
  lastLat: number | null;
  lastLon: number | null;
  storageErrors: number;
  lastError: string | null;
}

let session: ActiveSession | null = null;
let sessionLoaded = false; // whether we've consulted the disk marker yet
let fixesThisLaunch = 0;
let lastFixMs: number | null = null;
let lastLat: number | null = null;
let lastLon: number | null = null;
let storageErrors = 0;
let lastError: string | null = null;

// Cycle 023 fix 3: previous fix's elevation/time, for the outlier rate check.
// Reset in startTracking (a fresh ride's first fix has nothing to compare
// against yet — that's fine, checkElevationOutlier just isn't called for it).
let prevEle: number | null = null;
let prevEleTUnixMs: number | null = null;

const listeners = new Set<(s: TrackerStatus) => void>();

export function getStatus(): TrackerStatus {
  return { session, fixesThisLaunch, lastFixMs, lastLat, lastLon, storageErrors, lastError };
}

export function subscribe(fn: (s: TrackerStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  const snap = getStatus();
  listeners.forEach((fn) => fn(snap));
}

async function ensureSession(): Promise<ActiveSession | null> {
  if (session) return session;
  if (!sessionLoaded) {
    session = await loadSession();
    sessionLoaded = true;
  }
  return session;
}

// ---------------------------------------------------------------------------
// The background task — funnels fixes to storage. Defined at module scope.
// ---------------------------------------------------------------------------

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      lastError = `${error.code}: ${error.message}`;
      emit();
      return;
    }
    // Freshly restored (not already live in memory) means this JS launch
    // never saw the session before now — the mark of a mid-ride relaunch.
    const hadLiveSession = session !== null;
    const s = await ensureSession();
    if (!s) {
      // Orphan: fixes arriving with no active ride (marker lost/cleared).
      // Stop the service rather than record into the void.
      try {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      } catch {
        /* already stopped */
      }
      return;
    }
    if (!hadLiveSession) {
      logEvent(s.rideId, { kind: 'relaunch', tUnixMs: Date.now() });
    }
    const locations = data?.locations ?? [];
    for (const loc of locations) {
      const ele = loc.coords.altitude ?? undefined;
      try {
        await appendFix(s.rideId, {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          ele, // stored VERBATIM — D-023. Never clamped/smoothed here or anywhere upstream of disk.
          tUnixMs: loc.timestamp,
          accuracyM: loc.coords.accuracy ?? undefined,
        });
        fixesThisLaunch += 1;
        lastFixMs = loc.timestamp;
        lastLat = loc.coords.latitude;
        lastLon = loc.coords.longitude;
      } catch (e) {
        // Never let one bad write kill the service; count and surface it.
        storageErrors += 1;
        lastError = e instanceof Error ? e.message : String(e);
        logEvent(s.rideId, { kind: 'storageError', tUnixMs: Date.now(), message: lastError });
      }
      // Cycle 023 fix 3: flag-don't-mutate elevation-outlier diagnostics.
      // Compares this fix's raw ele against the PREVIOUS raw ele already
      // written above — this is a read-only side channel, never a rewrite of
      // what just got appended (D-023). Swallow-everything, same doctrine as
      // every other diagnostics call on this path.
      if (ele !== undefined && Number.isFinite(ele)) {
        if (prevEle !== null && prevEleTUnixMs !== null) {
          const check = checkElevationOutlier(prevEle, prevEleTUnixMs, ele, loc.timestamp);
          if (check?.isOutlier) {
            logEvent(s.rideId, {
              kind: 'elevationOutlier', tUnixMs: loc.timestamp,
              deltaM: check.deltaM, dtS: check.dtS, thresholdMps: ELEVATION_OUTLIER_RATE_MPS,
            });
          }
        }
        prevEle = ele;
        prevEleTUnixMs = loc.timestamp;
      }
      // Live sectors (cycle 006): display-only derived state, fed AFTER the
      // raw append so the JSONL can never depend on it. Engine errors are
      // swallowed — the raw ride is worth strictly more than the live view.
      // On a headless relaunch mid-ride the engine auto-starts and re-locks;
      // earlier sectors surface as estimated/missed (honest, D-016(b)).
      try {
        liveEngine.feed(loc.coords.latitude, loc.coords.longitude, loc.timestamp, loc.coords.accuracy ?? undefined);
      } catch {
        /* display-only */
      }
    }
    emit();
  },
);

// ---------------------------------------------------------------------------
// Permissions — two-step flow, as Android requires
// ---------------------------------------------------------------------------

export type PermissionOutcome =
  | 'granted' // fine + background: full pocket/screen-off tracking
  | 'foreground-only' // fine granted, background refused: works with app in foreground
  | 'denied' // no location at all
  | 'services-off'; // device GPS toggle is off

export async function ensurePermissions(): Promise<PermissionOutcome> {
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) return 'services-off';
  // Step 1: while-in-use (fine) location.
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  // Step 2: background ("Allow all the time"). On Android 11+ this sends the
  // user to the app's settings page rather than showing a dialog.
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return 'foreground-only';
  return 'granted';
}

// ---------------------------------------------------------------------------
// Start / stop / recovery
// ---------------------------------------------------------------------------

export async function startTracking(opts?: { routePick?: string | null }): Promise<ActiveSession> {
  const pressedAtMs = Date.now();
  const existing = await ensureSession();
  if (existing) return existing; // already recording; be idempotent

  const rideId = await startRide();
  const s: ActiveSession = { rideId, startedAtMs: Date.now() };
  try {
    await saveSession(s);
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000, // ~1 Hz — the cadence core/ was validated against
      distanceInterval: 0, // MUST be 0: keep fixes coming while stopped
      mayShowUserSettingsDialog: true,
      foregroundService: {
        notificationTitle: 'Qualifire — recording ride',
        notificationBody: 'GPS tracking is active until you press Stop.',
        notificationColor: '#e10600',
        killServiceOnDestroy: false, // survive the app being swiped away
      },
    });
  } catch (e) {
    // Failed to actually start: don't leave an orphan ride/marker behind.
    await clearSession();
    try {
      await endRide(rideId);
    } catch {
      /* storage may legitimately refuse an empty ride; marker is gone */
    }
    throw e;
  }
  session = s;
  sessionLoaded = true;
  fixesThisLaunch = 0;
  lastFixMs = null;
  lastLat = null;
  lastLon = null;
  storageErrors = 0;
  lastError = null;
  prevEle = null;
  prevEleTUnixMs = null;
  liveEngine.start({ pickId: opts?.routePick ?? null }); // fresh live-sector state for this ride
  logEvent(rideId, {
    kind: 'meta', tUnixMs: pressedAtMs, schemaVersion: 1,
    ...(Constants.expoConfig?.version ? { appVersion: Constants.expoConfig.version } : {}),
  });
  logEvent(rideId, { kind: 'button', tUnixMs: pressedAtMs, button: 'start' });
  emit();
  return s;
}

/** One-shot position refresh for the armed (pre-start) screen — display only,
 * never recorded (no ride is open). Foreground permission must already be
 * granted; failures are swallowed. [UNTESTED ON DEVICE] */
export async function refreshPositionOnce(): Promise<void> {
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    lastFixMs = loc.timestamp;
    lastLat = loc.coords.latitude;
    lastLon = loc.coords.longitude;
    emit();
  } catch {
    /* display only */
  }
}

export async function stopTracking(): Promise<RideSummary | null> {
  const s = await ensureSession();
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    /* service already gone (killed by OS) — still finalise the ride */
  }
  // Cycle 024 (WP-D2): settle a route BEFORE the ride ends, so the last
  // emitted state (and any caller reading getState() right after stopTracking
  // resolves) carries the finalized route rather than a still-soft or
  // never-locked one. Defensive here even though RecordScreen's onEnd also
  // calls finalize() itself first — this covers every OTHER stopTracking()
  // caller (e.g. the relaunch-recovery "Save ride" path), and finalize() is
  // idempotent, so calling it twice on the same ride is harmless.
  liveEngine.finalize();
  let summary: RideSummary | null = null;
  if (s) {
    logEvent(s.rideId, { kind: 'button', tUnixMs: Date.now(), button: 'end' });
    summary = await endRide(s.rideId);
  }
  await clearSession();
  session = null;
  sessionLoaded = true;
  liveEngine.stop(); // derived state is discarded; the raw JSONL is the record
  emit();
  return summary;
}

// ---------------------------------------------------------------------------
// D-019 gate buzz: one identical ~70 ms buzz per gate fire, including
// estimated fires (a gate WAS crossed). Subscribed at module scope so it also
// works in headless relaunches (no UI mounted). Earcons are build 3
// (expo-audio); until then the buzz is the whole audio channel.
// [UNTESTED ON DEVICE — incl. whether VIBRATE lands in the manifest of the
// current APK; added to app.json for the next build.]
// ---------------------------------------------------------------------------

// The buzz lives HERE and nowhere else: this layer sees every gate fire even
// with the screen off, and a second buzzer in the UI (cycle 008) meant the
// rider felt two, with the Settings toggle unable to stop either. Cycle 009.
let buzzedFires = 0;
let earconsEnabled = true;

/** Settings owns the preference; the tracker owns the hardware. */
export function setEarconsEnabled(on: boolean): void {
  earconsEnabled = on;
}

liveEngine.subscribe((st) => {
  if (st.gateFires > buzzedFires && earconsEnabled) {
    try {
      Vibration.vibrate(70);
    } catch {
      /* display-only channel */
    }
  }
  buzzedFires = st.gateFires;
});

// ---------------------------------------------------------------------------
// GPX+ button log. The UI layer calls noteButtonPress on PAUSE/RESUME taps;
// START/END are logged internally by startTracking/stopTracking above.
// ---------------------------------------------------------------------------

/** No-op when no ride is active. */
export function noteButtonPress(button: 'pause' | 'resume'): void {
  if (session) logEvent(session.rideId, { kind: 'button', tUnixMs: Date.now(), button });
}

// GPX+ engine events (route lock + gate fires) — subscribed at module scope
// for the same headless-relaunch reason as the buzz subscription above.
liveEngine.subscribeEvents((ev) => {
  if (!session) return; // cannot attribute; headless relaunch re-locks after ensureSession restores it
  if (ev.type === 'lock') {
    logEvent(session.rideId, {
      kind: 'lock', tUnixMs: Math.round(ev.atT * 1000),
      track: ev.track, atChainageM: ev.atChainageM, atT: ev.atT,
      // ev.kind (soft/verified/finalized) persists as `lockKind` — `kind`
      // itself is this RECORD's own discriminant ('lock'), see LockEvent's
      // doc comment in storage/types.ts.
      lockKind: ev.kind, pick: ev.pick,
    });
  } else {
    logEvent(session.rideId, {
      kind: 'gate', tUnixMs: Math.round(ev.t * 1000),
      track: ev.track, gateIndex: ev.gateIndex, t: ev.t, estimated: ev.estimated,
    });
  }
});

// Cycle 023 fix 5b: route-match diagnostics (a channel distinct from both the
// live-state subscribe() above and the lock/gate ride-record subscribeEvents()
// above it — see engine.ts's DiagnosticEvent doc comment) — appended to the
// SAME sidecar file as every other GPX+ event, just a new kind. Subscribed at
// module scope for the same headless-relaunch reason as the others: fired for
// EVERY candidate, win or lose, so a ride that never locks still leaves a
// diagnosable trail (unlike subscribeEvents, which only ever sees the winner).
liveEngine.subscribeDiagnostics((d) => {
  if (!session) return; // cannot attribute; headless relaunch resubscribes after ensureSession restores it
  logEvent(session.rideId, {
    kind: 'routeMatchDiagnostic', tUnixMs: Math.round(d.atT * 1000),
    track: d.track, phase: d.phase, accuracyM: d.accuracyM,
    thresholdM: d.thresholdM, poorAccuracy: d.poorAccuracy,
  });
});

/**
 * Call once on app mount. Detects "app relaunched while a ride was (or should
 * have been) recording":
 *  - tracking === true  → the foreground service is still running; the task
 *    keeps appending. UI should resume the recording screen.
 *  - tracking === false → the service died (OS/battery saver). UI should
 *    offer to finalise the ride so its fixes aren't stranded.
 */
export async function getRecoveryState(): Promise<{
  session: ActiveSession;
  tracking: boolean;
} | null> {
  const s = await ensureSession();
  if (!s) return null;
  let tracking = false;
  try {
    tracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    tracking = false;
  }
  return { session: s, tracking };
}
