/** Storage suite — exercises app/src/storage headless through core.ts + the
 * in-memory adapter (per the storage README: never import index.ts or
 * expoFsAdapter.ts here). Covers: JSONL encode->decode identity, GPX
 * export -> core-parse round trip, torn-tail (crash) recovery, index rebuild.
 */
import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { createMemoryFsAdapter, type FsAdapter } from '../src/storage/fsAdapter.ts';
import { createStorage } from '../src/storage/core.ts';
import { encodeFix, decodeRideFile } from '../src/storage/jsonl.ts';
import type { Fix } from '../src/storage/types.ts';
import { parseGpx } from '../core/src/index.ts';
import { test, assert, loadFixture, FIXTURES_DIR } from './lib.ts';

/** Deterministic PRNG (mulberry32) — reproducible "random" doubles. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Env { fs: ReturnType<typeof createMemoryFsAdapter>; storage: ReturnType<typeof createStorage>; clock: { t: number } }

function makeEnv(startMs = 1755167000000): Env {
  const fs = createMemoryFsAdapter();
  const clock = { t: startMs };
  let n = 0;
  const storage = createStorage(fs, {
    now: () => clock.t,
    randomSuffix: () => `t${String(n++).padStart(3, '0')}`,
  });
  return { fs, storage, clock };
}

/** Full-precision doubles exercising the encoder: negatives, tiny (exponent-form),
 * huge, integer-valued, and 17-significant-digit mantissas. */
function trickyFixes(n: number): Fix[] {
  const rand = rng(42);
  const out: Fix[] = [];
  for (let i = 0; i < n; i++) {
    const fix: Fix = {
      tUnixMs: 1755167000000 + i * 1000 + Math.floor(rand() * 999),
      lat: 50.8 + (rand() - 0.5) * 0.1,
      lon: 4.6 + (rand() - 0.5) * 0.1,
    };
    if (i % 3 !== 2) fix.ele = i % 5 === 0 ? -12.30000000000001 : rand() * 120;
    if (i % 4 === 0) fix.accuracyM = rand() * 30;
    out.push(fix);
  }
  // deliberate nasties
  out.push({ tUnixMs: 1755167999999, lat: 50.123456789012345, lon: -4.000000000000001, ele: 7.5e-7 });
  out.push({ tUnixMs: 1755168000001, lat: -0.1, lon: 179.99999999999997 });
  return out;
}

test('storage: JSONL encode->decode identity — every field verbatim, bit-exact', () => {
  const fixes = trickyFixes(50);
  const text = fixes.map(encodeFix).join('');
  const dec = decodeRideFile(text);
  assert(dec.nDropped === 0, `${dec.nDropped} lines dropped`);
  assert(dec.fixes.length === fixes.length, `${dec.fixes.length} fixes != ${fixes.length}`);
  for (let i = 0; i < fixes.length; i++) {
    const a = fixes[i], b = dec.fixes[i];
    assert(a.tUnixMs === b.tUnixMs && a.lat === b.lat && a.lon === b.lon,
      `fix ${i}: t/lat/lon not bit-identical`);
    assert(a.ele === b.ele, `fix ${i}: ele ${a.ele} != ${b.ele} (undefined must stay undefined)`);
    assert(a.accuracyM === b.accuracyM, `fix ${i}: accuracyM not preserved`);
  }
});

test('storage: full ride lifecycle — header/fixes/end on disk, meta from fixes', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  assert(/^\d{8}-\d{6}-t\d{3}$/.test(rideId), `rideId format: ${rideId}`);
  const fixes = trickyFixes(20);
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  clock.t += 5000;
  const meta = await storage.endRide(rideId);
  assert(meta.nFixes === fixes.length, `meta.nFixes ${meta.nFixes}`);
  assert(meta.startMs === fixes[0].tUnixMs && meta.endMs === fixes[fixes.length - 1].tUnixMs,
    'meta start/end not derived from the fixes on disk');
  const dec = decodeRideFile(fs.files.get(`rides/${rideId}.jsonl`)!);
  assert(dec.header !== null && dec.header.rideId === rideId, 'header missing/wrong');
  assert(dec.end !== null && dec.end.nFixes === fixes.length, 'end record missing/wrong');
});

test('storage: GPX export -> core parse round trip preserves every fix time+coord', async () => {
  const src = loadFixture('clean_morning'); // real ride, full resolution
  const { storage, clock } = makeEnv(src.fixes.t[0] * 1000);
  const rideId = await storage.startRide();
  for (let i = 0; i < src.fixes.t.length; i++) {
    clock.t = src.fixes.t[i] * 1000;
    await storage.appendFix(rideId, {
      tUnixMs: src.fixes.t[i] * 1000,
      lat: src.fixes.lat[i], lon: src.fixes.lon[i], ele: src.fixes.ele[i],
    });
  }
  await storage.endRide(rideId);
  const parsed = parseGpx(await storage.exportGpx(rideId), rideId);
  assert(parsed.t.length === src.fixes.t.length,
    `core parser saw ${parsed.t.length}/${src.fixes.t.length} points — export shape violates the parser contract`);
  for (let i = 0; i < parsed.t.length; i++) {
    assert(parsed.t[i] === src.fixes.t[i], `fix ${i}: time ${parsed.t[i]} != ${src.fixes.t[i]}`);
    assert(parsed.lat[i] === src.fixes.lat[i] && parsed.lon[i] === src.fixes.lon[i],
      `fix ${i}: coord not bit-identical after round trip`);
    assert(parsed.ele[i] === src.fixes.ele[i], `fix ${i}: ele drifted`);
  }
});

test('storage: GPX export — ele-less fixes carry last elevation; tiny numbers never exponent-form', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes: Fix[] = [
    { tUnixMs: 1755167000000, lat: 50.8, lon: 4.6, ele: 33.5 },
    { tUnixMs: 1755167001000, lat: 50.8001, lon: 4.6001 },          // no ele -> carries 33.5
    { tUnixMs: 1755167002000, lat: 50.8002, lon: 4.6002, ele: 7.5e-7 }, // would print "7.5e-7" bare
  ];
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  const gpx = await storage.exportGpx(rideId);
  for (const m of gpx.matchAll(/lat="([^"]+)" lon="([^"]+)"|<ele>([^<]+)<\/ele>/g)) {
    for (const v of [m[1], m[2], m[3]]) {
      if (v !== undefined) assert(/^-?[\d.]+$/.test(v), `exponent-form or malformed number in GPX: ${v}`);
    }
  }
  const parsed = parseGpx(gpx, rideId);
  assert(parsed.t.length === 3, `parser accepted ${parsed.t.length}/3 points`);
  assert(parsed.ele[1] === 33.5, `carried ele ${parsed.ele[1]} != 33.5`);
  assert(Math.abs(parsed.ele[2] - 7.5e-7) < 1e-15, `tiny ele ${parsed.ele[2]} mangled`);
});

test('storage: torn tail — any mid-line truncation loses at most the final fix', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes = trickyFixes(10);
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  const full = fs.files.get(`rides/${rideId}.jsonl`)!;
  const lastLineStart = full.lastIndexOf('\n', full.length - 2) + 1;
  for (let cut = lastLineStart; cut < full.length; cut++) { // every possible tear point
    const dec = decodeRideFile(full.slice(0, cut));
    assert(dec.fixes.length >= fixes.length - 1,
      `cut at ${cut}: recovered ${dec.fixes.length} fixes, lost more than the final line`);
    assert(dec.fixes.length <= fixes.length && dec.nDropped <= 1,
      `cut at ${cut}: decoder invented data (${dec.fixes.length} fixes, ${dec.nDropped} dropped)`);
    for (let i = 0; i < dec.fixes.length; i++) {
      assert(dec.fixes[i].tUnixMs === fixes[i].tUnixMs, `cut at ${cut}: surviving fix ${i} corrupted`);
    }
  }
});

test('storage: crash recovery (clean kill between writes) — resumable, endable, end exactly once', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes = trickyFixes(8);
  for (const f of fixes.slice(0, 6)) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  // OS kill BETWEEN line writes (the common 1 Hz case): file intact, no end record
  const file = `rides/${rideId}.jsonl`;
  const restarted = createStorage(fs, { now: () => clock.t });
  const listed = await restarted.listRides();
  assert(listed.length === 1 && listed[0].nFixes === 6,
    `crashed ride listed with ${listed[0]?.nFixes} fixes, want 6`);
  assert(listed[0].endMs === fixes[5].tUnixMs, 'crashed-ride endMs not the last fix on disk');
  clock.t = fixes[6].tUnixMs;
  await restarted.appendFix(rideId, fixes[6]); // resume post-restart
  const meta = await restarted.endRide(rideId);
  assert(meta.nFixes === 7, `post-recovery nFixes ${meta.nFixes}, want 7`);
  await restarted.endRide(rideId); // idempotence probe: must not append a second end
  const endCount = (fs.files.get(file)!.match(/"kind":"end"/g) ?? []).length;
  assert(endCount === 1, `${endCount} end records after recovery, want exactly 1`);
});

test('storage: crash recovery (kill mid-write, torn tail) — pre-crash fixes intact, listed honestly', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes = trickyFixes(8);
  for (const f of fixes.slice(0, 6)) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  const file = `rides/${rideId}.jsonl`;
  fs.files.set(file, fs.files.get(file)!.slice(0, -7)); // tear the final line mid-write
  const restarted = createStorage(fs, { now: () => clock.t });
  const listed = await restarted.listRides();
  assert(listed.length === 1 && listed[0].nFixes === 5,
    `torn ride listed with ${listed[0]?.nFixes} fixes, want 5 (6 written, last torn)`);
  assert(listed[0].endMs === fixes[4].tUnixMs, 'torn-ride endMs not the last surviving fix');
  // FINDING F-1 (fixed in storage): appending to a torn file used to glue the new
  // record onto the torn fragment, silently losing the first post-crash record.
  // Storage now heals the missing trailing '\n' before resuming appends, so the
  // new record lands on its own line; only the torn line itself stays lost.
  clock.t = fixes[6].tUnixMs;
  await restarted.appendFix(rideId, fixes[6]);
  const dec = decodeRideFile(fs.files.get(file)!);
  assert(dec.fixes.length >= 5, 'pre-crash fixes corrupted by resume-append');
  for (let i = 0; i < 5; i++) {
    assert(dec.fixes[i].tUnixMs === fixes[i].tUnixMs, `surviving fix ${i} corrupted`);
  }
  assert(dec.fixes.length === 6, // F-1 healed: the resumed fix survives
    `resume-append onto a torn tail lost a record: ${dec.fixes.length} fixes, want 6`);
  assert(dec.fixes[5].tUnixMs === fixes[6].tUnixMs, 'resumed fix not the one appended');
});

test('storage: index rebuild — missing or corrupt index.json regenerated from ride files', async () => {
  const { fs, storage, clock } = makeEnv();
  const idA = await storage.startRide();
  clock.t += 1000; await storage.appendFix(idA, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, ele: 30 });
  clock.t += 1000; await storage.endRide(idA);
  clock.t += 60000;
  const idB = await storage.startRide(); // still recording — no end record
  clock.t += 1000; await storage.appendFix(idB, { tUnixMs: clock.t, lat: 50.81, lon: 4.61 });
  const before = JSON.stringify(await storage.listRides());

  fs.files.delete('index.json');
  const s2 = createStorage(fs, { now: () => clock.t });
  assert(JSON.stringify(await s2.listRides()) === before, 'listing differs after index deletion');
  assert(fs.files.has('index.json'), 'index.json not regenerated');

  fs.files.set('index.json', '{"schemaVersion":1,"rides":[{TRUNC');
  const s3 = createStorage(fs, { now: () => clock.t });
  assert(JSON.stringify(await s3.listRides()) === before, 'listing differs after index corruption');
  const rebuilt = JSON.parse(fs.files.get('index.json')!);
  assert(rebuilt.rides.length === 2, `rebuilt index has ${rebuilt.rides.length} rides, want 2`);
  const entryB = rebuilt.rides.find((r: { rideId: string }) => r.rideId === idB);
  assert(entryB.status === 'recording' && entryB.endMs === null,
    'rebuild invented an end for the still-recording ride');
});

test('storage: WP-B fix B2 — startRide(mode) persists mode on the index entry, endRide preserves it', async () => {
  const { fs, storage, clock } = makeEnv();

  // A free ride: mode must show up on the index entry the instant it starts,
  // AND survive endRide's full reconstruction of that entry (D-025 — this is
  // what lastRide.ts/RidesScreen.tsx read to keep a free ride out of
  // backfillMissingResults).
  const freeId = await storage.startRide('free');
  const afterStart = JSON.parse(fs.files.get('index.json')!);
  const freeEntryAtStart = afterStart.rides.find((r: { rideId: string }) => r.rideId === freeId);
  assert(freeEntryAtStart.mode === 'free', `startRide('free') wrote mode=${freeEntryAtStart.mode}, want 'free'`);

  clock.t += 1000;
  await storage.appendFix(freeId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  clock.t += 1000;
  await storage.endRide(freeId);
  const afterEnd = JSON.parse(fs.files.get('index.json')!);
  const freeEntryAtEnd = afterEnd.rides.find((r: { rideId: string }) => r.rideId === freeId);
  assert(freeEntryAtEnd.status === 'ended', 'ride did not reach ended status');
  assert(freeEntryAtEnd.mode === 'free',
    `endRide dropped mode: got ${freeEntryAtEnd.mode}, want 'free' preserved from startRide`);

  // A route ride started with an explicit 'route' mode, and one started with
  // no argument at all (every pre-B2 call site) — both must round-trip too;
  // the second exercises the back-compat default (mode omitted -> undefined,
  // never invented as a literal 'route' string that would mask a real gap).
  const routeId = await storage.startRide('route');
  await storage.endRide(routeId);
  const noArgId = await storage.startRide();
  await storage.endRide(noArgId);
  const finalIndex = JSON.parse(fs.files.get('index.json')!);
  const routeEntry = finalIndex.rides.find((r: { rideId: string }) => r.rideId === routeId);
  const noArgEntry = finalIndex.rides.find((r: { rideId: string }) => r.rideId === noArgId);
  assert(routeEntry.mode === 'route', `explicit 'route' mode not preserved: got ${routeEntry.mode}`);
  assert(noArgEntry.mode === undefined,
    `no-arg startRide() invented a mode (${noArgEntry.mode}) instead of leaving it unset`);
});

/** Async-jitter wrapper over the memory adapter: every read/append resolves
 * after 0-3 deterministic macrotask ticks — the promise-race soup a device
 * produces when a burst of queued location events each call appendFix without
 * awaiting the previous one (mid-ride JS relaunch, F-2). */
function jittery(mem: FsAdapter, seed: number): FsAdapter {
  const rand = rng(seed);
  const delay = async (): Promise<void> => {
    const n = Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
  };
  return {
    ...mem,
    readText: async (p) => { await delay(); return mem.readText(p); },
    appendText: async (p, t) => { await delay(); return mem.appendText(p, t); },
  };
}

test('storage: F-2 — concurrent append burst racing the read-back branch keeps file order == call order', async () => {
  // Harness power first: the same jitter MUST scramble the naive pattern the
  // pre-fix code used (per-call read-back then append, unserialized) — the
  // exact shape that scrambled 17 lines of the real ride 20260815-0024.
  const probeFs = createMemoryFsAdapter();
  const naive = jittery(probeFs, 7);
  probeFs.files.set('probe', '');
  await Promise.all(Array.from({ length: 20 }, (_, i) => (async () => {
    await naive.readText('probe');           // the crash-recovery read-back
    await naive.appendText('probe', `${i},`); // then the append — unserialized
  })()));
  const inOrder = Array.from({ length: 20 }, (_, i) => `${i},`).join('');
  assert(probeFs.files.get('probe') !== inOrder,
    'jitter harness failed to scramble the unserialized pattern — this test has no power');

  // Now the real storage under the same jitter: ride starts, JS relaunches
  // mid-ride (fresh createStorage, so every call would take the slow read-back
  // branch), then a burst of 20 appendFix calls arrives with NO awaits between
  // them, racing an immediate endRide.
  const mem = createMemoryFsAdapter();
  const clock = { t: 1755167000000 };
  const s1 = createStorage(mem, { now: () => clock.t, randomSuffix: () => 'f2f2' });
  const rideId = await s1.startRide();
  const want: number[] = [];
  for (let i = 0; i < 3; i++) {
    clock.t += 1000; want.push(clock.t);
    await s1.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  }
  const relaunched = createStorage(jittery(mem, 7), { now: () => clock.t });
  const burst: Promise<void>[] = [];
  for (let i = 0; i < 20; i++) {
    clock.t += 1000; want.push(clock.t);
    burst.push(relaunched.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 }));
  }
  const metaP = relaunched.endRide(rideId); // races the drain — must land last
  await Promise.all(burst);
  const meta = await metaP;
  const raw = mem.files.get(`rides/${rideId}.jsonl`)!;
  const dec = decodeRideFile(raw);
  assert(dec.nDropped === 0, `${dec.nDropped} lines mangled by the race`);
  assert(dec.fixes.length === 23 && meta.nFixes === 23,
    `${dec.fixes.length} fixes on disk / meta ${meta.nFixes}, want 23`);
  for (let i = 0; i < 23; i++) {
    assert(dec.fixes[i].tUnixMs === want[i],
      `file order != call order at fix ${i}: ${dec.fixes[i].tUnixMs} != ${want[i]} (F-2 regression)`);
  }
  const lines = raw.trimEnd().split('\n');
  assert(lines[lines.length - 1].includes('"kind":"end"'), 'end record did not land last');
  assert((raw.match(/"kind":"end"/g) ?? []).length === 1, 'more than one end record');
});

test('storage: F-2 — GPX export of a scrambled-on-disk ride is chronological, JSONL left untouched (D-023)', async () => {
  // A pre-fix ride on disk: one contiguous block of 17 fix lines out of order
  // (the shape found in the real export). The export must sort; the raw JSONL
  // must never be rewritten.
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes: Fix[] = [];
  for (let i = 0; i < 40; i++) {
    clock.t += 1000;
    fixes.push({ tUnixMs: clock.t, lat: 50.8 + i * 1e-4, lon: 4.6 + i * 1e-4, ele: 30 + i });
  }
  for (const f of fixes) await storage.appendFix(rideId, f);
  await storage.endRide(rideId);
  const file = `rides/${rideId}.jsonl`;
  const lines = fs.files.get(file)!.trimEnd().split('\n'); // header, 40 fixes, end
  const block = lines.splice(16, 17);                      // 17 fix lines...
  const shuf = rng(99);
  for (let i = block.length - 1; i > 0; i--) {             // ...deterministically shuffled
    const j = Math.floor(shuf() * (i + 1));
    [block[i], block[j]] = [block[j], block[i]];
  }
  lines.splice(16, 0, ...block);
  const scrambled = lines.join('\n') + '\n';
  fs.files.set(file, scrambled);
  const onDisk = decodeRideFile(scrambled).fixes.map((f) => f.tUnixMs);
  assert(onDisk.some((t, i) => i > 0 && t < onDisk[i - 1]), 'scramble setup failed — file still in order');

  const restarted = createStorage(fs, { now: () => clock.t });
  const parsed = parseGpx(await restarted.exportGpx(rideId), rideId);
  assert(parsed.t.length === 40, `export lost points: ${parsed.t.length}/40`);
  const byT = new Map(fixes.map((f) => [f.tUnixMs, f]));
  for (let i = 0; i < 40; i++) {
    const tMs = Math.round(parsed.t[i] * 1000);
    assert(tMs === fixes[i].tUnixMs, `point ${i} not chronological: ${tMs} != ${fixes[i].tUnixMs}`);
    const src = byT.get(tMs)!;
    assert(parsed.lat[i] === src.lat && parsed.lon[i] === src.lon && parsed.ele[i] === src.ele,
      `point ${i}: coords decoupled from their timestamp by the sort`);
  }
  assert(fs.files.get(file) === scrambled, 'exportGpx rewrote the raw JSONL (D-023 violation)');
});

test('storage: real export 20260815-0024 — core parses all 92 points; pre-fix scramble preserved as the F-2 fossil', () => {
  // fixtures/qualifire-20260815-0024.gpx is the first GPX the real app ever
  // exported (acceptance night, 2026-08-15 00:24): a ~94 s STATIONARY doorstep
  // test loop, NOT a commute. It was exported by the pre-F-2 build, so its
  // 17-point scrambled block is committed evidence of the on-device race.
  const gpx = nodeFs.readFileSync(path.join(FIXTURES_DIR, 'qualifire-20260815-0024.gpx'), 'utf8');
  const nTrkpt = (gpx.match(/<trkpt /g) ?? []).length;
  const p = parseGpx(gpx, 'qualifire-20260815-0024');
  assert(nTrkpt === 92 && p.t.length === nTrkpt,
    `core parser accepted ${p.t.length}/${nTrkpt} trkpts — on-device export violates the parser contract`);
  const descents = p.t.reduce((n, t, i) => n + (i > 0 && t < p.t[i - 1] ? 1 : 0), 0);
  assert(descents > 0,
    'file is chronological — the F-2 fossil is gone; was the fixture regenerated with the fixed exporter?');
});

test('storage: real export 20260815-0024 — through the fixed exporter: chronological 94 s stationary loop', async () => {
  const gpx = nodeFs.readFileSync(path.join(FIXTURES_DIR, 'qualifire-20260815-0024.gpx'), 'utf8');
  const p = parseGpx(gpx, 'qualifire-20260815-0024');
  const { storage, clock } = makeEnv(Math.round(p.t[0] * 1000));
  const rideId = await storage.startRide();
  for (let i = 0; i < p.t.length; i++) { // append in FILE order — i.e. scrambled
    clock.t = Math.round(p.t[i] * 1000);
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: p.lat[i], lon: p.lon[i], ele: p.ele[i] });
  }
  await storage.endRide(rideId);
  const out = parseGpx(await storage.exportGpx(rideId), rideId);
  assert(out.t.length === 92, `re-export lost points: ${out.t.length}/92`);
  for (let i = 1; i < out.t.length; i++) {
    assert(out.t[i] > out.t[i - 1], `re-export not chronological at point ${i}`);
  }
  const durS = out.t[out.t.length - 1] - out.t[0];
  assert(durS > 90 && durS < 98, `duration ${durS.toFixed(1)} s — expected the documented ~94 s loop`);
  const latSpanM = (Math.max(...out.lat) - Math.min(...out.lat)) * 111320;
  const lonSpanM = (Math.max(...out.lon) - Math.min(...out.lon)) * 111320 * Math.cos((out.lat[0] * Math.PI) / 180);
  assert(latSpanM < 50 && lonSpanM < 50,
    `span ${latSpanM.toFixed(0)}x${lonSpanM.toFixed(0)} m — this fixture is documented as stationary, not a commute`);
});

test('storage: appendFix guards — non-finite fix and ended ride rejected', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  let threw = false;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: NaN, lon: 4.6 }).catch(() => { threw = true; });
  assert(threw, 'non-finite lat accepted');
  threw = false;
  await storage.appendFix('20990101-000000-dead', { tUnixMs: clock.t, lat: 50.8, lon: 4.6 }).catch(() => { threw = true; });
  assert(threw, 'unknown rideId accepted');
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.endRide(rideId);
  threw = false;
  await storage.appendFix(rideId, { tUnixMs: clock.t + 1000, lat: 50.8, lon: 4.6 }).catch(() => { threw = true; });
  assert(threw, 'append after endRide accepted');
});
