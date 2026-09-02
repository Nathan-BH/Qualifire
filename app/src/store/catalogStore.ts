/**
 * The runtime catalog (cycle 025, B-39 remainder — the empty-seed install
 * path).
 *
 * Before this module every reader imported catalog.seed.json directly, so
 * "the catalog" was a compile-time constant: nothing a rider does on the
 * phone could ever add a landmark, a way or a route — the backlog's own
 * words, "blocks every user-created way". Now:
 *
 *   currentCatalog() === mergeCatalogs(shippedCatalog(), userCatalog())
 *
 * where the user catalog is `catalog.user.json` under the storage root
 * (sibling of rides/ and results/), holding ONLY what was created on this
 * phone. The seed is never copied to disk — see mergeCatalogs() for why —
 * so a virgin build (seed 'empty', store/seed.ts) runs on the user file
 * alone, and Nathan's build keeps picking up seed changes exactly as before.
 *
 * Read posture (D-023-style tolerance, mirrors resultsStore.ts): a missing
 * user file is simply "nothing added yet"; an undecodable one is IGNORED for
 * the session and NEVER overwritten — unlike results/, this file is not a
 * derived cache but the only copy of the rider's own places and routes.
 * Write posture: saveUserCatalog() validates the MERGED catalog before
 * accepting, so a bad write can never leave the app reading a catalog that
 * validateCatalog() rejects; fs errors are swallowed (best-effort, like
 * every sidecar write in this app).
 *
 * saveUserCatalog() callers: RecordScreen's retroactive-naming flow and its
 * gate-adjust save (B-36/B-42's write-through seam), and — since WP-Q —
 * RoutesScreen's per-item delete (route/way/orphan-place, cascading via
 * store/catalogDelete.ts).
 *
 * Synchronous readers: every consumer calls currentCatalog() at USE time
 * (never captured at import), so what it sees is the seed until
 * initCatalogStore() resolves, then seed + user. App.tsx bumps a state after
 * boot hydration so mounted screens re-render with the merged catalog.
 */
import { decodeCatalog, emptyCatalog, encodeCatalog, mergeCatalogs, validateCatalog } from './catalog.ts';
import { shippedCatalog } from './seed.ts';
import type { Catalog } from './types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const USER_CATALOG_FILE = 'catalog.user.json';

let seed: Catalog = shippedCatalog();
let user: Catalog = emptyCatalog();
let current: Catalog = mergeCatalogs(seed, user);
let armedFs: FsAdapter | null = null;
/** Serializes every write against USER_CATALOG_FILE, last-write-wins —
 * the same shape as resultsStore.ts's writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function recompute(): void {
  current = mergeCatalogs(seed, user);
}

function enqueueWrite(fn: (fs: FsAdapter) => Promise<void>): Promise<void> {
  const fs = armedFs;
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fn(fs);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

/** The catalog every reader uses: shipped seed + this phone's additions. */
export function currentCatalog(): Catalog {
  return current;
}

/** This phone's own additions only (what catalog.user.json holds). */
export function userCatalog(): Catalog {
  return user;
}

/** Loads catalog.user.json (missing => nothing added; undecodable or
 * unreadable => ignored for this session, never written) and recomputes
 * currentCatalog(). Never throws. Returns the merged catalog. */
export async function initCatalogStore(fs: FsAdapter): Promise<Catalog> {
  armedFs = fs;
  user = emptyCatalog();
  try {
    const text = await fs.readText(USER_CATALOG_FILE);
    if (text !== null) {
      const decoded = decodeCatalog(text);
      if (decoded !== null) {
        user = decoded;
      } else {
        console.warn(
          `initCatalogStore: ${USER_CATALOG_FILE} is not a catalog — ignored for this session, left untouched`,
        );
      }
    }
  } catch { /* unreadable => same as missing for this session; nothing written */ }
  try {
    recompute();
  } catch {
    // decodeCatalog checks that the four arrays exist but not their elements,
    // so a decodable-but-malformed file (e.g. {"landmarks":[null], ...} — a
    // torn write, a hand edit, an older app version) used to throw out of
    // mergeCatalogs HERE, past App.tsx's .then chain, silently skipping
    // initRideHistory. Same posture as an undecodable file: ignored for this
    // session, never overwritten. recompute() on an empty user catalog cannot
    // throw (the seed is bundled and structurally sound).
    console.warn(
      `initCatalogStore: ${USER_CATALOG_FILE} decoded but did not merge — ignored for this session, left untouched`,
    );
    user = emptyCatalog();
    recompute();
  }
  return current;
}

/** Replaces this phone's additions. Refuses — returns validateCatalog()'s
 * errors and changes nothing — when the MERGED catalog would not validate;
 * otherwise updates currentCatalog() at once, writes the file best-effort,
 * and returns []. */
export async function saveUserCatalog(next: Catalog): Promise<string[]> {
  const errs = validateCatalog(mergeCatalogs(seed, next));
  if (errs.length > 0) return errs;
  user = next;
  recompute();
  const text = encodeCatalog(next);
  await enqueueWrite(async (fs) => {
    await fs.writeText(USER_CATALOG_FILE, text);
  });
  return [];
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushCatalogWrites(): Promise<void> {
  return writeTail;
}

/** Test-only: clears state and disarms persistence. `seedOverride` lets the
 * suite simulate a build with a different seed (an EMPTY one = the virgin
 * install) without touching process.env; omit it to return to the shipped
 * seed. */
export function resetCatalogStoreForTests(seedOverride?: Catalog): void {
  armedFs = null;
  writeTail = Promise.resolve();
  seed = seedOverride ?? shippedCatalog();
  user = emptyCatalog();
  recompute();
}
