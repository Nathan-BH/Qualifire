/**
 * virgin-cycle29 02 (probe): one-at-a-time queue that draws a way card with the headless MapLibre
 * snapshotter (StaticMapImageManager) and files the PNG under <root>/mapsnaps/. Derived cache only (D-023):
 * the app may delete these files; nothing here is a source of truth. Brief 04 extends this module.
 */
import { getStatus } from '../location';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import type { FsAdapter } from '../storage/fsAdapter';
import { cachedPatchedStyles } from './mapStyleCache';
import { snapshotFileName, snapshotKey, SNAPSHOT_TIMEOUT_MS, withTimeout, type SnapshotKeyInput } from './cardSnapshotModel';

// Same guarded require as wayMapView.tsx: null when the native module is absent.
let ML: typeof import('@maplibre/maplibre-react-native') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ML = require('@maplibre/maplibre-react-native');
} catch {
  ML = null;
}

export type SnapshotRequest = SnapshotKeyInput & { styleJson: unknown; bounds: [number, number, number, number] };

interface IndexEntry { key: string; file: string; madeAtMs: number }

const INDEX_PATH = 'mapsnaps/index.json';
const known = new Map<string, IndexEntry>();
const pending = new Map<string, Promise<string>>();
let indexLoaded: Promise<void> | null = null;
let chain: Promise<unknown> = Promise.resolve();
let fsSingleton: FsAdapter | null = null;

function fs(): FsAdapter {
  if (fsSingleton === null) fsSingleton = createExpoFsAdapter();
  return fsSingleton;
}

/** Reads mapsnaps/index.json once, on first use. */
export function loadSnapshotIndex(adapter: FsAdapter): Promise<void> {
  if (indexLoaded === null) {
    indexLoaded = (async () => {
      try {
        const text = await adapter.readText(INDEX_PATH);
        if (text === null) return;
        const rows = JSON.parse(text) as IndexEntry[];
        for (const r of rows) if (!known.has(r.key)) known.set(r.key, r);
      } catch { /* a bad index is just an empty cache */ }
    })();
  }
  return indexLoaded;
}

/** The file:// URI of a snapshot already made this session or recorded in the index (once loaded), else null. */
export function peekSnapshot(key: string): string | null {
  const e = known.get(key);
  return e === undefined ? null : fs().fileUri(`mapsnaps/${e.file}`);
}

async function make(input: SnapshotRequest, key: string): Promise<string> {
  const t0 = Date.now();
  const adapter = fs();
  await loadSnapshotIndex(adapter);
  const hit = peekSnapshot(key);
  if (hit !== null && await adapter.exists(`mapsnaps/${known.get(key)!.file}`)) { console.log('[snap] hit', key); return hit; }
  if (ML === null) throw new Error('unavailable');
  if (cachedPatchedStyles(input.styleUrl) === null) throw new Error('gated');
  const idle = getStatus().session === null; // never draw during a recording
  if (!idle) throw new Error('gated');
  const uri = await withTimeout(ML.StaticMapImageManager.createImage({
    mapStyle: input.styleJson as object,
    width: input.widthDp,
    height: input.heightDp,
    bounds: input.bounds,
    output: 'file',
  }), SNAPSHOT_TIMEOUT_MS);
  const file = snapshotFileName(key);
  await adapter.importFile(uri, `mapsnaps/${file}`);
  known.set(key, { key, file, madeAtMs: Date.now() });
  await adapter.writeText(INDEX_PATH, JSON.stringify([...known.values()]));
  console.log('[snap] made', key, Date.now() - t0, 'ms');
  return adapter.fileUri(`mapsnaps/${file}`);
}

/** One createImage in flight (promise chain); a pending key returns the same promise. */
export function requestSnapshot(input: SnapshotRequest): Promise<string> {
  const key = snapshotKey(input);
  const dup = pending.get(key);
  if (dup !== undefined) return dup;
  const run = chain.then(() => make(input, key));
  const p = run.then(
    (uri) => { pending.delete(key); return uri; },
    (e: unknown) => {
      pending.delete(key);
      console.warn('[snap] failed', key, e instanceof Error ? e.message : String(e));
      throw e;
    },
  );
  pending.set(key, p);
  chain = p.catch(() => undefined);
  return p;
}
