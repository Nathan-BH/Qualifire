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
