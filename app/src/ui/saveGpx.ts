/**
 * Get a text document (GPX, debug JSON) off the phone without any native module that isn't
 * already in dev build 944bcc6f. [UNTESTED ON DEVICE]
 *
 * expo-sharing is NOT a dependency of the built dev client, so instead:
 *  1. Primary: Android Storage Access Framework (expo-file-system/legacy,
 *     whose native code ships inside the `expo` package) — user picks a
 *     folder (e.g. Downloads) once, we create the .gpx file there. Real file,
 *     any size, visible in Files/USB.
 *  2. Fallback (picker refused/failed): React Native's built-in Share sheet
 *     with the GPX as plain text. Works with zero extra modules, but Android
 *     caps intent payloads (~1 MB binder limit) — fine for a commute
 *     (~25 min at 1 Hz ≈ 150 KB), inelegant for multi-hour rides.
 *
 * Swap to expo-sharing at the next scheduled APK rebuild if SAF proves
 * clunky; noted in README-dev.md.
 */
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type SaveGpxResult =
  | { method: 'saf'; fileUri: string }
  | { method: 'share-text' }
  | { method: 'cancelled' };

/** e.g. startMs → "qualifire-20260814-0812" */
export function gpxBaseName(startMs: number): string {
  const d = new Date(startMs);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `qualifire-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}`
  );
}

/** Generalized save: any small text file, full name + MIME supplied by the
 * caller. Same two rungs as the original GPX path: SAF create-in-a-folder
 * primary, RN Share-as-text fallback (Android intent cap ~1 MB — fine for
 * GPX and the debug JSONs this serves). */
export async function saveTextFile(
  fileName: string,
  mime: string,
  text: string,
): Promise<SaveGpxResult> {
  // --- Primary: SAF "save to a folder you pick" -------------------------
  try {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      // MIME quirk note (unchanged from the GPX original): Android's
      // MimeTypeMap can mangle unknown extensions, so callers keep passing
      // octet-stream for .gpx. [UNTESTED — worst case is an odd file name]
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        fileName,
        mime,
      );
      await FileSystem.writeAsStringAsync(fileUri, text);
      return { method: 'saf', fileUri };
    }
  } catch {
    // fall through to text share
  }

  // --- Fallback: share sheet as text ------------------------------------
  try {
    const res = await Share.share(
      { message: text, title: fileName },
      { dialogTitle: `Export ${fileName}` },
    );
    if (res.action === Share.dismissedAction) return { method: 'cancelled' };
    return { method: 'share-text' };
  } catch {
    return { method: 'cancelled' };
  }
}

export async function saveGpx(baseName: string, gpxText: string): Promise<SaveGpxResult> {
  return saveTextFile(`${baseName}.gpx`, 'application/octet-stream', gpxText);
}
