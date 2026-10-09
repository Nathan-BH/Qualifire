/**
 * virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): a session-level
 * cache of the fetched + patchMapStyle'd style copies, keyed by the style URL. Both map views
 * (wayMapView.tsx, catalogMapView.tsx) fetch the online style on every mount and only then
 * remount the native view on the patched copy (mapStyleFor, virgin-cycle22 09) — two native
 * starts per map per tab switch. With this cache the second and every later mount on the same
 * theme URL starts on the patched copy directly: one native start, no key change.
 * Only a successful fetch is remembered (a failure never is: the retry ladder stays as it was);
 * the copies for one URL are replaced whenever a newer fetch lands. Pure: no react, no native.
 */
export interface PatchedStyles { url: string; labelsOn: unknown; labelsOff: unknown }

const cache = new Map<string, PatchedStyles>();

/** The remembered copies for `url`, or null when this session has not fetched it yet. */
export function cachedPatchedStyles(url: string): PatchedStyles | null {
  return cache.get(url) ?? null;
}

/** Remembers `patched` under its own URL and returns it (so a caller can store what it cached). */
export function rememberPatchedStyles(patched: PatchedStyles): PatchedStyles {
  cache.set(patched.url, patched);
  return patched;
}

/** Tests only. */
export function clearPatchedStyleCache(): void {
  cache.clear();
}
