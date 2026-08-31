# BRIEF — Save-flow gates, PART C of 3: minimal debug export for tomorrow's feedback

**Written 2026-08-31 (Plan tier, fable) against `virgin` HEAD `3c738fa`. Every quoted
"before" block and line number verified against that HEAD this session; baseline suite
(`283 tests: 280 pass, 0 fail, 3 skip`) and `tsc --noEmit` (exit 0) actually run. Edits
dry-run mentally, not applied.**

**Sequencing: run after PART A** (`BRIEF-save-flow-refline.md` — this brief imports
`USER_REFS_FILE` from the module A creates). Independent of PART B, but the intended
order is A → B → C; the predicted suite counts below assume A and B have landed.

## What this is — and emphatically is not

Two "get this file off the phone" actions so tomorrow's first virgin-flow rides come
back with evidence: the rider's own catalog (`catalog.user.json` — the places, ways,
routes and gate sets the save flow actually created) and the built reference lines
(`refs.user.json`, Part A's output). Per-ride GPX+ diagnostics export **already
exists and needs no work**: `RidesScreen.tsx` lines 148–162 already wire
`exportGpxPlus()` (route locks, gate crossings, route-match diagnostics, stops,
outages, relaunches, buttons, storage errors — `gpxPlusExport.ts`) into
`saveGpx()`'s share flow on every ride row. That plus these two files is the whole
"what happened inside the app" feedback loop for tomorrow.

**This is NOT OPEN-ITEMS item 5** (whole-app export/import: zip, raw-ride checkbox,
overwrite-with-confirm import, version-stamping). Item 5 stays parked and separately
scoped; nothing here imports anything, zips anything, or promises restore.

## Stop-on-ambiguity

**If any ambiguity or surprise arises — an anchor that doesn't match, a predicted
output that differs — STOP and report back. Never guess.**

## Design decisions already made (do not re-decide)

- **No `expo-sharing`.** The coordinator's sketch suggested adding it; rejected after
  inspection: `saveGpx.ts`'s header documents that the BUILT dev client (944bcc6f)
  does not contain expo-sharing's native module — adding the JS package without an
  APK rebuild produces a runtime failure, and an APK rebuild must not gate tomorrow's
  ride. The existing `saveGpx.ts` mechanism (SAF create-file primary, RN `Share`
  text fallback) is already proven wiring with zero native additions; both new
  actions reuse it. Revisit expo-sharing at the next scheduled APK rebuild (already
  noted in `saveGpx.ts`/README-dev).
- **Generalize, don't duplicate:** `saveGpx.ts` grows a `saveTextFile(fileName,
  mime, text)`; `saveGpx()` becomes a one-line delegate. Both files are small JSON
  (`catalog.user.json` is KBs; `refs.user.json` ~30 KB/route — well under the ~1 MB
  Share-intent fallback cap noted in the header).
- **Placement: SETTINGS tab, new DATA section.** The Result screen is for one ride
  (and its GPX+ is already on RIDES rows); these two files are app-level state, and
  settings.tsx is the only app-level surface with room for a rare-use action. A row
  + small `share` button, matching the existing Row/card pattern.
- **Read via `createExpoFsAdapter().readText()`** — the same storage-root adapter
  every store uses; a `null` read = honest "nothing to share yet" alert, never an
  empty file share.

## Edit 1 — `app/src/ui/saveGpx.ts` (generalize)

1a. Header, **lines 1–17**: after the line
` * Swap to expo-sharing at the next scheduled APK rebuild if SAF proves` /
` * clunky; noted in README-dev.md.` (lines 15–16), no change required — but extend
the first doc line. Before (line 2, verbatim):
```typescript
 * Get a GPX document off the phone without any native module that isn't
```
After:
```typescript
 * Get a text document (GPX, debug JSON) off the phone without any native module that isn't
```

1b. Replace the `saveGpx` function, **lines 36–67** (from
`export async function saveGpx(baseName: string, gpxText: string): Promise<SaveGpxResult> {`
through the file-ending `}`). Before (verbatim, lines 36–67):
```typescript
export async function saveGpx(baseName: string, gpxText: string): Promise<SaveGpxResult> {
  // --- Primary: SAF "save to a folder you pick" -------------------------
  try {
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (perm.granted) {
      // MIME: octet-stream + explicit .gpx in the name. Android's MimeTypeMap
      // doesn't know application/gpx+xml, which can mangle the extension.
      // [UNTESTED — worst case is an odd file name, not data loss]
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        `${baseName}.gpx`,
        'application/octet-stream',
      );
      await FileSystem.writeAsStringAsync(fileUri, gpxText);
      return { method: 'saf', fileUri };
    }
  } catch {
    // fall through to text share
  }

  // --- Fallback: share sheet as text ------------------------------------
  try {
    const res = await Share.share(
      { message: gpxText, title: `${baseName}.gpx` },
      { dialogTitle: `Export ${baseName}.gpx` },
    );
    if (res.action === Share.dismissedAction) return { method: 'cancelled' };
    return { method: 'share-text' };
  } catch {
    return { method: 'cancelled' };
  }
}
```
After:
```typescript
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
```
(`RidesScreen.tsx`'s existing `saveGpx(base, gpx)` call keeps working unchanged —
verify with step 4 below.)

## Edit 2 — `app/src/ui/settings.tsx` (DATA section)

2a. Imports. Before (**lines 8–10**, verbatim):
```typescript
import * as FileSystem from 'expo-file-system/legacy';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setEarconsEnabled } from '../location';
```
After:
```typescript
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { setEarconsEnabled } from '../location';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { USER_CATALOG_FILE } from '../store/catalogStore';
import { USER_REFS_FILE } from '../live/userRefs';
import { saveTextFile } from './saveGpx';
```

2b. A module-level helper. Directly above `export default function SettingsScreen()`
(**line 128**), insert:
```typescript
/** Debug export (OPEN-ITEMS item 3, Part C — NOT item 5's whole-app
 * export/import, which stays parked): share ONE storage-root JSON via the
 * proven saveGpx.ts rungs. A missing file is an honest "nothing yet", never
 * an empty share. */
async function shareStoreFile(rel: string, outName: string): Promise<void> {
  try {
    const text = await createExpoFsAdapter().readText(rel);
    if (text === null) {
      Alert.alert('Nothing to share yet', `${rel} does not exist on this phone.`);
      return;
    }
    const res = await saveTextFile(outName, 'application/json', text);
    if (res.method === 'saf') Alert.alert('Exported', `${outName} saved to the folder you picked.`);
    else if (res.method === 'share-text') Alert.alert('Shared', `${outName} sent as text via the share sheet.`);
  } catch (e) {
    Alert.alert('Share failed', e instanceof Error ? e.message : String(e));
  }
}

/** e.g. 2026-08-31 -> "20260831", for stamped export names. */
function dateStamp(nowMs: number): string {
  const d = new Date(nowMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
```

2c. The section. Between the SCORING card's closing `</View>` (**line 176**) and the
footer `<Text ...>` (**line 178**), insert:
```tsx

      <Text style={[st.h2, { color: t.textDim }]}>DATA</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Places & routes" t={t}
          hint="share catalog.user.json — everything the save flow created on this phone">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_CATALOG_FILE, `qualifire-catalog-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
        <Row label="Reference lines" t={t}
          hint="share refs.user.json — the reference lines built from your rides (per-ride GPX+ lives on RIDES)">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_REFS_FILE, `qualifire-refs-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
      </View>
```

2d. Styles. In the `StyleSheet.create` block (**lines 186–195**), after the `knob`
entry (**line 194**), add:
```typescript
  shareBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  shareText: { fontSize: 11.5, letterSpacing: 1 },
```

## Tests — none headless, stated honestly

Every touched module (`saveGpx.ts`, `settings.tsx`) sits behind react-native /
expo-file-system imports and cannot load in the Node suite — the same standing
reason `saveGpx.ts` and `RidesScreen.onExport` have no suite coverage today. No
token test is added for its own sake; verification is tsc + greps + Nathan's
on-device pass (below). The suite must come out UNCHANGED from what Part B left.

## Mandatory verification (run all, in order)

1. `cd app && npx tsc --noEmit` → exit code **0**, no output.
2. `cd app && node --experimental-strip-types tests/run.ts` → final line exactly
   `302 tests: 299 pass, 0 fail, 3 skip` (i.e. unchanged from Part B; if running with
   only Part A landed: `292 tests: 289 pass, 0 fail, 3 skip`).
3. `grep -c "saveTextFile" app/src/ui/saveGpx.ts` → `2` (the export declaration and
   the delegate call inside `saveGpx`). Then
   `grep -c "saveTextFile" app/src/ui/settings.tsx` → `2` (import + call in
   `shareStoreFile`).
4. `grep -n "saveGpx(base, gpx)" app/src/ui/RidesScreen.tsx` → still exactly 1 match
   (untouched).
5. `grep -c "expo-sharing" app/package.json` → `0`.
6. `grep -c "shareStoreFile" app/src/ui/settings.tsx` → `3` (declaration + 2 calls).

If ANY of these differs, stop and report.

## On-device pass for Nathan (tomorrow, non-blocking for landing this brief)

- SETTINGS shows the DATA card in both themes; both `share` buttons open the SAF
  folder picker; a virgin phone before any named way gets the honest "Nothing to
  share yet" alert for both files.
- After naming a way: catalog share contains the new landmarks/way/route/gateSet
  (5 gates if Part B landed and a ref was built); refs share contains one track
  keyed `route:<rideId>`.
- A ride row's existing GPX+ export still works (regression eyeball).

## Must not change

- `RidesScreen.tsx` (its `onExport` keeps calling `saveGpx` — zero edits there).
- `exportGpx` / `exportGpxPlus` output; `gpxPlusExport.ts`; `storage/` entirely.
- `SaveGpxResult`'s shape and `gpxBaseName` (imported by RidesScreen).
- `package.json` — **no new dependencies, native or JS** (that is the point).
- Settings persistence (`settings.json` load/save semantics, `DEFAULTS`, the
  provider) — the new section is render-only plus the two share handlers.
- No import UI, no zip, nothing written INTO the storage root by these actions.

## Handoff notes for the coordinator

- **Answer material for Nathan's open question (1):** for tomorrow's feedback loop,
  GPX+ (already shareable per ride) + these two JSONs cover "what happened inside
  the app" and "what state did the app build" without item 5. Item 5 (whole-app
  export/IMPORT with zip/overwrite/backup semantics) remains parked and is what a
  phone migration needs — these share actions are diagnostics, not backup.
- expo-sharing deliberately NOT added (native module absent from the built dev
  client; needs the next APK rebuild). If/when that rebuild happens, `saveTextFile`
  is the single seam to swap.
- Suggested OPEN-ITEMS footnote under item 5: "Part C's settings DATA card shares
  catalog.user.json / refs.user.json read-only; item 5 supersedes it for real
  backup/restore when built."
