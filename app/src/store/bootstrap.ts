/**
 * virgin-cycle20 brief 12 (Opus inspection of 08, B1): "the stores are
 * loaded" as a promise any screen can await.
 *
 * App.tsx hydrates the persistent stores in ONE ordered chain at launch
 * (sports -> catalog -> reference lines -> free rides -> ride history) and
 * never blocks the UI on it. RecordScreen's relaunch recovery (an
 * interrupted recording found on disk) used to finalise the ride and
 * markRideFree() it straight from its own mount effect, racing that chain:
 * store/freeRides.ts drops a write made before initFreeRidePersistence()
 * armed it (`if (fs === null) return;`) and a write made after arming but
 * before the cache READ landed overwrites the cache with the new mark alone;
 * effectiveRideSportId() returns null before sports.json is loaded. Every
 * late-boot writer awaits whenStoresReady() first instead.
 *
 * PURE (no expo / react-native import) so tests/bootstrap_suite.ts can load
 * it under plain Node. markStoresReady() is idempotent; resetStoresReadyForTests()
 * re-arms the gate (settings.tsx's "Reset to virgin" does NOT reset it — the
 * stores it re-inits are re-read in place, and a recovery is a launch-time event).
 */
let resolveReady: (() => void) | null = null;
let ready: Promise<void> = new Promise<void>((r) => { resolveReady = r; });
let settled = false;

/** Resolves once App.tsx's store chain has finished (success or failure —
 * the chain never throws, D-023, but the gate opens on the rejection path too). */
export function whenStoresReady(): Promise<void> {
  return ready;
}

/** App.tsx calls this at the end of its launch chain. Idempotent. */
export function markStoresReady(): void {
  if (settled) return;
  settled = true;
  resolveReady?.();
}

/** True once markStoresReady() ran — a synchronous read for tests/diagnostics. */
export function storesReadySettled(): boolean {
  return settled;
}

/** Test seam: back to the pending state. */
export function resetStoresReadyForTests(): void {
  settled = false;
  ready = new Promise<void>((r) => { resolveReady = r; });
}
