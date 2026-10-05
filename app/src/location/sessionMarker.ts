/**
 * Pure (no expo import) parse of the active-ride marker, split out of
 * session.ts so the headless test runner can exercise it (session.ts imports
 * expo-file-system, which Node cannot load). virgin-cycle21 02.
 */
import type { ActiveSession } from './session';

/** Parse the marker's JSON text. Returns null when it parses but lacks the two
 * required fields (a corrupt marker); throws on invalid JSON (loadSession's
 * try/catch turns that into null). Optional fields missing from an older
 * marker load as undefined. */
export function parseSession(raw: string): ActiveSession | null {
  const parsed = JSON.parse(raw) as Partial<ActiveSession>;
  if (typeof parsed.rideId === 'string' && typeof parsed.startedAtMs === 'number') {
    const mode = parsed.mode === 'free' ? 'free' : parsed.mode === 'route' ? 'route' : undefined;
    const wayIds = Array.isArray(parsed.wayIds) ? parsed.wayIds : parsed.wayIds === null ? null : undefined;
    const lastAliveAtMs =
      typeof parsed.lastAliveAtMs === 'number' && Number.isFinite(parsed.lastAliveAtMs)
        ? parsed.lastAliveAtMs
        : undefined;
    const sportId = typeof parsed.sportId === 'string' ? parsed.sportId : undefined;
    const pickId = typeof parsed.pickId === 'string' ? parsed.pickId : parsed.pickId === null ? null : undefined;
    return { rideId: parsed.rideId, startedAtMs: parsed.startedAtMs, mode, wayIds, lastAliveAtMs, sportId, pickId };
  }
  return null;
}
