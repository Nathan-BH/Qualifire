/** Filesystem seam. Pure — no expo, no Node imports.
 *
 * core.ts talks only to this interface. The app injects expoFsAdapter;
 * headless tests inject createMemoryFsAdapter (below) or a node:fs one.
 * All paths are relative to the storage root and '/'-separated.
 */
export interface FsAdapter {
  /** mkdir -p. */
  ensureDir(relDir: string): Promise<void>;
  /** Create-or-truncate write. */
  writeText(relPath: string, text: string): Promise<void>;
  /** Append; creates the file if missing. Must hit the OS before resolving —
   * the crash-safety story (README) leans on every fix being flushed. */
  appendText(relPath: string, text: string): Promise<void>;
  /** Full contents, or null when the file does not exist. */
  readText(relPath: string): Promise<string | null>;
  exists(relPath: string): Promise<boolean>;
  /** File names (not paths) directly inside relDir; [] when dir missing. */
  listDir(relDir: string): Promise<string[]>;
  /** Removes the file; no-op when it does not exist. */
  deleteFile(relPath: string): Promise<void>;
}

/** In-memory adapter for headless tests. No platform imports whatsoever. */
export function createMemoryFsAdapter(): FsAdapter & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    async ensureDir() {},
    async writeText(relPath, text) {
      files.set(relPath, text);
    },
    async appendText(relPath, text) {
      files.set(relPath, (files.get(relPath) ?? '') + text);
    },
    async readText(relPath) {
      return files.has(relPath) ? files.get(relPath)! : null;
    },
    async exists(relPath) {
      return files.has(relPath);
    },
    async listDir(relDir) {
      const prefix = relDir === '' ? '' : relDir.replace(/\/?$/, '/');
      const names: string[] = [];
      for (const key of files.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        if (rest !== '' && !rest.includes('/')) names.push(rest);
      }
      return names.sort();
    },
    async deleteFile(relPath) {
      files.delete(relPath);
    },
  };
}
