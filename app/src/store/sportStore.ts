/**
 * The runtime sport list (WP-1, 2026-09-06). Structurally a copy of
 * catalogStore.ts's refuse-and-disarm posture (the post-WP-3 pattern to
 * mirror): a missing file is simply "nothing added yet" (fresh install, or
 * right after Reset-to-virgin — sports.json lives under the storage root on
 * purpose, §3.4); an undecodable or structurally invalid one is IGNORED for
 * the session and NEVER overwritten, because its ids are the partition keys
 * every route/ride stamp points at — clobbering it would silently repoint
 * every stamp at nothing.
 *
 * Also exposes `activeCatalog()` — the one derived view every screen reads
 * instead of catalogStore's `currentCatalog()`: `scopeCatalog(currentCatalog(),
 * activeSportId(), currentSports())`. Computed fresh at call time (cheap at
 * this catalog's size); never captured at import.
 */
import { decodeSports, emptySports, encodeSports, scopeCatalog, validateSports } from './sports.ts';
import type { Sport, SportsFile } from './sports.ts';
import { currentCatalog } from './catalogStore.ts';
import type { Catalog } from './types.ts';
import type { FsAdapter } from '../storage/fsAdapter.ts';

export const SPORTS_FILE = 'sports.json';

let sports: SportsFile = emptySports();
let armedFs: FsAdapter | null = null;
/** Serializes every write against SPORTS_FILE, last-write-wins — same shape
 * as catalogStore.ts's writeTail. */
let writeTail: Promise<void> = Promise.resolve();

function enqueueWrite(fn: (fs: FsAdapter) => Promise<void>): Promise<void> {
  const fs = armedFs;
  const turn = writeTail.then(async () => {
    if (fs === null) return;
    await fn(fs);
  });
  writeTail = turn.catch(() => {});
  return turn.catch(() => {});
}

export function currentSports(): SportsFile {
  return sports;
}

export function activeSportId(): string | null {
  return sports.activeSportId;
}

/** SETTINGS uses this to show the disarmed-store error (B1): sports.json
 * existed but could not be trusted, so Add/rename/delete all refuse to
 * write until Reset-to-virgin or a hand fix (debug export). */
export function sportWritesArmed(): boolean {
  return armedFs !== null;
}

/** Loads sports.json (missing => emptySports(), nothing written; undecodable
 * or structurally invalid => emptySports(), console.warn, writes disarmed
 * for this session). Never throws. Returns the loaded file. */
export async function initSportStore(fs: FsAdapter): Promise<SportsFile> {
  armedFs = fs;
  sports = emptySports();
  try {
    const text = await fs.readText(SPORTS_FILE);
    if (text !== null) {
      const decoded = decodeSports(text);
      if (decoded !== null && validateSports(decoded).length === 0) {
        sports = decoded;
      } else {
        armedFs = null;
        console.warn(
          `initSportStore: ${SPORTS_FILE} is not a valid sports file — ignored for this session, left untouched, saving disabled`,
        );
      }
    }
    // text === null: missing file, today's "zero sports" state — nothing to
    // warn about, nothing to write (the file is born on the first addSport).
  } catch {
    // unreadable => same as missing for THIS session; nothing written, but
    // do not disarm — a transient read failure should not permanently lock
    // out saves for the rest of the process the way a corrupt file must.
  }
  return sports;
}

/** Validates, replaces the in-memory file, and writes best-effort. Refuses
 * (returns validateSports()'s errors, changes nothing) when `next` would not
 * validate. When writes are disarmed (initSportStore found a file it could
 * not trust), returns a one-line refusal and leaves the on-disk bytes
 * untouched — recovery is Reset-to-virgin or a hand fix via the debug
 * export, never a silent overwrite of ids every stamp points at. */
export async function saveSports(next: SportsFile): Promise<string[]> {
  const errs = validateSports(next);
  if (errs.length > 0) return errs;
  if (armedFs === null) return [`${SPORTS_FILE} could not be read at boot — not saved`];
  sports = next;
  const text = encodeSports(next);
  await enqueueWrite(async (fs) => {
    await fs.writeText(SPORTS_FILE, text);
  });
  return [];
}

/** Test seam: resolves once every write scheduled so far has settled. */
export function flushSportWrites(): Promise<void> {
  return writeTail;
}

/** The catalog every screen reads instead of currentCatalog(): landmarks
 * (shared) + the active sport's routes/ways/gate sets, or the whole catalog
 * unchanged when there is no active sport (null — zero sports, §3.4). */
export function activeCatalog(): Catalog {
  return scopeCatalog(currentCatalog(), activeSportId(), currentSports());
}

/** Test-only: clears state and disarms persistence, mirroring
 * catalogStore.ts's resetCatalogStoreForTests. `override` lets a test start
 * from a non-empty sports list without going through the fs. */
export function resetSportStoreForTests(override?: SportsFile): void {
  armedFs = null;
  writeTail = Promise.resolve();
  sports = override ?? emptySports();
}

export type { Sport, SportsFile };
