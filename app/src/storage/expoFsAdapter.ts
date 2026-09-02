/** The ONLY file in storage/ that imports expo-file-system.
 *
 * SDK 56 modern API (File/Directory/Paths classes; the pre-SDK-54 functions
 * live under 'expo-file-system/legacy' and are not used here). Native calls
 * are synchronous in this API; at 1 Hz fix rate that is well within budget,
 * and a synchronous append is exactly what crash-safety wants — the line is
 * on disk before the promise resolves.
 *
 * Root: <documentDirectory>/qualifire/ — app-private, survives app updates,
 * cleared only on uninstall.
 */
import { Directory, File, Paths } from 'expo-file-system';
import type { FsAdapter } from './fsAdapter.ts';

export function createExpoFsAdapter(rootName = 'qualifire'): FsAdapter {
  const root = new Directory(Paths.document, rootName);

  const parts = (rel: string) => rel.split('/').filter((p) => p !== '');
  const fileAt = (rel: string) => new File(root, ...parts(rel));
  const dirAt = (rel: string) => {
    const p = parts(rel);
    return p.length === 0 ? root : new Directory(root, ...p);
  };
  const ensureRoot = () => {
    if (!root.exists) root.create({ intermediates: true, idempotent: true });
  };

  return {
    async ensureDir(relDir) {
      ensureRoot();
      const d = dirAt(relDir);
      if (!d.exists) d.create({ intermediates: true, idempotent: true });
    },
    async writeText(relPath, text) {
      ensureRoot();
      const f = fileAt(relPath);
      if (!f.exists) f.create({ intermediates: true });
      f.write(text); // truncating write
    },
    async appendText(relPath, text) {
      ensureRoot();
      const f = fileAt(relPath);
      if (!f.exists) f.create({ intermediates: true });
      f.write(text, { append: true });
    },
    async readText(relPath) {
      const f = fileAt(relPath);
      if (!f.exists) return null;
      return await f.text();
    },
    async exists(relPath) {
      return fileAt(relPath).exists;
    },
    async listDir(relDir) {
      const d = dirAt(relDir);
      if (!d.exists) return [];
      return d
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .map((entry) => entry.name)
        .sort();
    },
    async deleteFile(relPath) {
      const f = fileAt(relPath);
      if (f.exists) f.delete();
    },
  };
}

/** WP-Q reset: moves the whole storage root aside (never deletes — repo
 * doctrine, CONTEXT.md's "Ground rules") and returns the new sibling
 * directory's name. Root does not exist yet => returns null (nothing to
 * move; the caller proceeds — a virgin phone resetting itself is a no-op
 * here).
 *
 * Uses `moveSync`, not the brief's originally-assumed `move`: this file's
 * whole style is synchronous native calls (`f.write`, `d.create`, `f.delete`
 * above), and this function's own signature is synchronous (`string | null`,
 * not a Promise) to match — `Directory.prototype.move` DOES exist in the
 * installed expo-file-system (56.0.9, verified against
 * node_modules/expo-file-system/src/internal/NativeFileSystem.types.ts) but
 * is async (`Promise<void>`); `moveSync` is its synchronous twin and is what
 * a same-turn, no-await caller needs. Not headless-testable by design (like
 * everything else in this file); the on-device acceptance in the WP-Q brief
 * (§4.3) is its test. */
export function archiveStorageRoot(rootName = 'qualifire', stamp: string): string | null {
  const root = new Directory(Paths.document, rootName);
  if (!root.exists) return null;
  const aside = new Directory(Paths.document, `${rootName}.reset-${stamp}`);
  root.moveSync(aside);
  return aside.name;
}
