/** GPX+ suite — exercises the events sidecar (app/src/storage/eventsJsonl.ts)
 * and GPX+ export (app/src/storage/gpxPlusExport.ts) headless through core.ts
 * + the in-memory adapter (per the storage README: never import index.ts or
 * expoFsAdapter.ts here). Covers: events JSONL encode->decode identity,
 * appendEvent lifecycle + D-023 (ride .jsonl untouched), the rides/*.events.jsonl
 * index-rebuild trap, deleteRide cleanup, byte-identical standard export,
 * GPX+ round trip through core's parser, pinned session-block derivations,
 * the no-sidecar (pre-feature) ride, and sidecar torn-tail healing.
 */
import { createMemoryFsAdapter } from '../src/storage/fsAdapter.ts';
import { createStorage } from '../src/storage/core.ts';
import { encodeEvent, decodeEventsFile } from '../src/storage/eventsJsonl.ts';
import { isoTime } from '../src/storage/gpxExport.ts';
import type { Fix, RideEvent } from '../src/storage/types.ts';
import { parseGpx } from '../core/src/index.ts';
import { test, assert, loadFixture } from './lib.ts';

interface Env { fs: ReturnType<typeof createMemoryFsAdapter>; storage: ReturnType<typeof createStorage>; clock: { t: number } }

function makeEnv(startMs = 1755167000000): Env {
  const fs = createMemoryFsAdapter();
  const clock = { t: startMs };
  let n = 0;
  const storage = createStorage(fs, {
    now: () => clock.t,
    randomSuffix: () => `g${String(n++).padStart(3, '0')}`,
  });
  return { fs, storage, clock };
}

/** Strips a GPX+ document down to what buildGpx would have produced: removes
 * the xmlns:qf attribute and every line whose trimmed content is qf:-only. */
function stripGpxPlus(gpxPlus: string): string {
  const noXmlns = gpxPlus.replace(' xmlns:qf="https://qualifire.local/gpx/1"', '');
  return noXmlns
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !(
        t.startsWith('<extensions>') ||
        t.startsWith('</extensions>') ||
        t.startsWith('<qf:') ||
        t.startsWith('</qf:')
      );
    })
    .join('\n');
}

// ---------------------------------------------------------------- (a) events JSONL

test('gpx+: events JSONL encode->decode identity — one of each kind, garbage/unknown counted not fatal', () => {
  const events: RideEvent[] = [
    { kind: 'meta', tUnixMs: 1000, schemaVersion: 1, appVersion: '0.1.0' },
    { kind: 'button', tUnixMs: 2000, button: 'start' },
    { kind: 'lock', tUnixMs: 3000, track: 'Morning', atChainageM: 450.5, atT: 3 },
    { kind: 'gate', tUnixMs: 4000, track: 'Morning', gateIndex: 0, t: 4, estimated: false },
    { kind: 'storageError', tUnixMs: 5000, message: 'boom' },
    { kind: 'relaunch', tUnixMs: 6000 },
    {
      kind: 'routeMatchDiagnostic', tUnixMs: 7000, track: 'Morning', phase: 'anchor',
      accuracyM: 97.7, thresholdM: 50, poorAccuracy: true,
    },
    { kind: 'elevationOutlier', tUnixMs: 8000, deltaM: 10.7, dtS: 1, thresholdMps: 4 },
  ];
  const text = events.map(encodeEvent).join('') + 'not json\n' + '{"kind":"bogus","tUnixMs":1}\n';
  const dec = decodeEventsFile(text);
  assert(dec.events.length === events.length, `${dec.events.length} events decoded, want ${events.length}`);
  assert(dec.nDropped === 2, `nDropped ${dec.nDropped}, want 2 (garbage line + unknown kind)`);
  for (let i = 0; i < events.length; i++) {
    assert(JSON.stringify(dec.events[i]) === JSON.stringify(events[i]), `event ${i} round-trip mismatch`);
  }
});

// ---------------------------------------------------------------- (b) appendEvent lifecycle

test('gpx+: appendEvent lifecycle — lands in the sidecar in call order, ride .jsonl untouched (D-023)', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  const rideBefore = fs.files.get(`rides/${rideId}.jsonl`)!;
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 1 });
  await storage.appendEvent(rideId, { kind: 'storageError', tUnixMs: clock.t + 2, message: 'x' });
  const rideAfter = fs.files.get(`rides/${rideId}.jsonl`)!;
  assert(rideBefore === rideAfter, 'appending events touched the ride .jsonl (D-023 violation)');
  const evText = fs.files.get(`rides/${rideId}.events.jsonl`)!;
  const dec = decodeEventsFile(evText);
  assert(dec.nDropped === 0 && dec.events.length === 3, `${dec.events.length} events / ${dec.nDropped} dropped`);
  assert(
    dec.events[0].kind === 'button' && dec.events[1].kind === 'relaunch' && dec.events[2].kind === 'storageError',
    'events not landed in call order',
  );
});

// ---------------------------------------------------------------- (c) index rebuild safety

test('gpx+: index rebuild — the events sidecar never becomes a bogus ride entry', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.endRide(rideId);
  fs.files.delete('index.json');
  const restarted = createStorage(fs, { now: () => clock.t });
  const rides = await restarted.listRides();
  assert(rides.length === 1, `${rides.length} rides listed, want exactly 1`);
  const rebuilt = JSON.parse(fs.files.get('index.json')!);
  assert(rebuilt.rides.length === 1, `rebuilt index has ${rebuilt.rides.length} entries, want 1`);
  assert(
    !rebuilt.rides.some((r: { rideId: string }) => r.rideId.includes('.events')),
    'events sidecar leaked into the rebuilt index as a bogus ride entry',
  );
});

// ---------------------------------------------------------------- (d) deleteRide cleanup

test('gpx+: deleteRide removes both the ride file and the events sidecar', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.endRide(rideId);
  assert(
    fs.files.has(`rides/${rideId}.jsonl`) && fs.files.has(`rides/${rideId}.events.jsonl`),
    'setup did not produce both files',
  );
  await storage.deleteRide(rideId);
  assert(!fs.files.has(`rides/${rideId}.jsonl`), 'ride file not deleted');
  assert(!fs.files.has(`rides/${rideId}.events.jsonl`), 'events sidecar not deleted');
});

// ---------------------------------------------------------------- (e) byte-identical standard export

test('gpx+: standard exportGpx stays byte-identical — stripped exportGpxPlus equals it exactly', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes: Fix[] = [
    { tUnixMs: 1755167000000, lat: 50.8, lon: 4.6, ele: 30, accuracyM: 5 },
    { tUnixMs: 1755167001000, lat: 50.8001, lon: 4.6001, accuracyM: 8.2 },
    { tUnixMs: 1755167002000, lat: 50.8002, lon: 4.6002, ele: 31 },
  ];
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.appendEvent(rideId, { kind: 'meta', tUnixMs: 1755166999000, schemaVersion: 1, appVersion: '0.1.0' });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: 1755166999500, button: 'start' });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: 1755167000500, track: 'Morning', atChainageM: 10, atT: 1755167000.5,
  });
  await storage.appendEvent(rideId, {
    kind: 'gate', tUnixMs: 1755167000600, track: 'Morning', gateIndex: 0, t: 1755167000.6, estimated: false,
  });
  await storage.appendEvent(rideId, { kind: 'storageError', tUnixMs: 1755167001500, message: 'boom' });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: 1755167001600 });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: 1755167002500, button: 'end' });

  const plain = await storage.exportGpx(rideId);
  assert(!plain.includes('qf:'), 'standard export leaked qf: extensions');

  const plus = await storage.exportGpxPlus(rideId);
  assert(plus.includes('qf:'), 'GPX+ export carries no qf: content — setup produced nothing to strip');
  const stripped = stripGpxPlus(plus);
  assert(stripped === plain, 'stripped GPX+ output is not byte-identical to exportGpx');
});

// ---------------------------------------------------------------- (f) GPX+ round trip through core

test('gpx+: exportGpxPlus round trip through core parser preserves every fix time+coord', async () => {
  const src = loadFixture('clean_morning');
  const { storage, clock } = makeEnv(src.fixes.t[0] * 1000);
  const rideId = await storage.startRide();
  for (let i = 0; i < src.fixes.t.length; i++) {
    clock.t = src.fixes.t[i] * 1000;
    await storage.appendFix(rideId, {
      tUnixMs: src.fixes.t[i] * 1000,
      lat: src.fixes.lat[i],
      lon: src.fixes.lon[i],
      ele: src.fixes.ele[i],
      accuracyM: i % 4 === 0 ? 5 : undefined,
    });
  }
  await storage.endRide(rideId);
  const parsed = parseGpx(await storage.exportGpxPlus(rideId), rideId);
  assert(parsed.t.length === src.fixes.t.length,
    `core parser saw ${parsed.t.length}/${src.fixes.t.length} points — GPX+ shape violates the parser contract`);
  for (let i = 0; i < parsed.t.length; i++) {
    assert(parsed.t[i] === src.fixes.t[i], `fix ${i}: time ${parsed.t[i]} != ${src.fixes.t[i]}`);
    assert(parsed.lat[i] === src.fixes.lat[i] && parsed.lon[i] === src.fixes.lon[i],
      `fix ${i}: coord not bit-identical after round trip`);
  }
});

// ---------------------------------------------------------------- (g) session-block derivations

test('gpx+: session-block derivations — pinned fixture matches every documented field', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0 - 3000);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [];
  for (let i = 0; i < 10; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8, lon: 4.6 });
  fixes[0].accuracyM = 12.5;
  fixes.push({ tUnixMs: t0 + 29000, lat: 50.802, lon: 4.6 }); // 20 s gap, ~222 m jump -> moving
  for (let i = 1; i <= 5; i++) {
    fixes.push({ tUnixMs: t0 + 29000 + i * 1000, lat: 50.802 + i * 0.0001, lon: 4.6 });
  }
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }

  await storage.appendEvent(rideId, { kind: 'meta', tUnixMs: t0 - 3000, schemaVersion: 1, appVersion: '0.1.0' });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: t0 - 3000, button: 'start' });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: t0 + 15000, track: 'Morning', atChainageM: 450.5, atT: (t0 + 15000) / 1000,
  });
  await storage.appendEvent(rideId, {
    kind: 'gate', tUnixMs: t0 + 16000, track: 'Morning', gateIndex: 0, t: (t0 + 16000) / 1000, estimated: false,
  });
  await storage.appendEvent(rideId, {
    kind: 'gate', tUnixMs: t0 + 20000, track: 'Morning', gateIndex: 1, t: (t0 + 20000) / 1000, estimated: true,
  });
  await storage.appendEvent(rideId, { kind: 'storageError', tUnixMs: t0 + 21000, message: 'boom & <bang>' });

  const gpx = await storage.exportGpxPlus(rideId);

  const accMatches = gpx.match(/<qf:acc>/g) ?? [];
  assert(accMatches.length === 1, `${accMatches.length} <qf:acc> elements, want exactly 1`);
  assert(gpx.includes('<qf:acc>12.5</qf:acc>'), 'accuracy value not 12.5');
  assert(gpx.includes('<qf:firstFixDelayS>3</qf:firstFixDelayS>'), 'firstFixDelayS not 3');
  assert(gpx.includes('<qf:routeLock track="Morning" atChainageM="450.5"'), 'routeLock fields wrong');
  assert(/<qf:gate name="START"[^>]*estimated="false"/.test(gpx), 'START gate wrong');
  assert(/<qf:gate name="G1"[^>]*estimated="true"/.test(gpx), 'G1 gate wrong');
  assert(/<qf:outage[^>]*maxGapS="20"/.test(gpx), 'outage maxGapS not 20');
  assert(gpx.includes(`<qf:outage fromT="${isoTime(t0 + 9000)}" toT="${isoTime(t0 + 29000)}"`),
    'outage fromT/toT wrong');
  assert(gpx.includes(`<qf:stop fromT="${isoTime(t0)}" toT="${isoTime(t0 + 9000)}"/>`), 'stop bounds wrong');
  assert(gpx.includes('<qf:storageErrors count="1">'), 'storageErrors count wrong');
  assert(gpx.includes('<qf:lastMessage>boom &amp; &lt;bang&gt;</qf:lastMessage>'), 'lastMessage not escaped correctly');
  assert(gpx.includes('<qf:relaunches count="0"/>'), 'relaunches count wrong');
  assert(/<qf:button kind="start"/.test(gpx), 'start button missing');
});

// ---------------------------------------------------------------- (h) no-sidecar ride

test('gpx+: no-sidecar ride (pre-feature) — exportGpxPlus still succeeds, only outages/stops/firstFixAt emitted', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  const fixes: Fix[] = [
    { tUnixMs: 1755167000000, lat: 50.8, lon: 4.6 },
    { tUnixMs: 1755167015000, lat: 50.8, lon: 4.6 }, // >5 s gap -> outage
  ];
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:session>'), 'qf:session missing even with no sidecar');
  assert(gpx.includes('<qf:firstFixAt>'), 'firstFixAt missing');
  assert(gpx.includes('<qf:outages>'), 'outages missing');
  assert(!gpx.includes('<qf:routeLock'), 'routeLock present with no events file on disk');
  assert(!gpx.includes('<qf:storageErrors'), 'storageErrors present with no events file on disk');
  assert(!gpx.includes('<qf:relaunches'), 'relaunches present with no events file on disk');
  assert(!gpx.includes('<qf:buttons'), 'buttons present with no events file on disk');
});

// ---------------------------------------------------------------- (i) sidecar torn-tail healing

test('gpx+: events sidecar torn-tail healing — new event parses, nDropped is exactly 1', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t + 1000, button: 'end' });
  const file = `rides/${rideId}.events.jsonl`;
  fs.files.set(file, fs.files.get(file)!.slice(0, -5)); // tear the final line mid-write
  const restarted = createStorage(fs, { now: () => clock.t });
  await restarted.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 2000 });
  const dec = decodeEventsFile(fs.files.get(file)!);
  assert(dec.nDropped === 1, `nDropped ${dec.nDropped}, want 1 (the torn line)`);
  assert(dec.events.length === 2, `${dec.events.length} events survived, want 2 (pre-crash first event + new)`);
  assert(dec.events[0].kind === 'button' && (dec.events[0] as { button: string }).button === 'start',
    'pre-crash first event corrupted');
  assert(dec.events[1].kind === 'relaunch', 'new post-restart event not the last one / wrong kind');
});

// ---------------------------------------------------------------- (j) cycle 023 fix 4: route distance

test('gpx+: cycle 023 fix 4 — a locked ride carries qf:routeDistanceM (START-to-FINISH distance)', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  // Morning: START chainage 162 m, FINISH chainage 5487 m (core/src/reference.ts
  // PROPOSED_GATES) -> route distance is the difference, 5325 m, not FINISH's
  // raw absolute chainage (which overstates by the 162 m START offset).
  assert(gpx.includes('<qf:routeDistanceM>5325</qf:routeDistanceM>'), 'routeDistanceM missing/wrong for Morning');
});

test('gpx+: cycle 023 fix 4 guard — an unrecognized persisted track degrades gracefully, no export failure', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  // simulates an old ride whose track id was since renamed/dropped from PROPOSED_GATES
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'RetiredTrackXYZ', atChainageM: 10, atT: clock.t / 1000,
  });
  await storage.endRide(rideId);
  let gpx = '';
  let threw = false;
  try {
    gpx = await storage.exportGpxPlus(rideId);
  } catch {
    threw = true;
  }
  assert(!threw, 'exportGpxPlus threw on an unrecognized track id — must degrade gracefully instead');
  assert(gpx.includes('<qf:routeLock track="RetiredTrackXYZ"'), 'routeLock itself must still be emitted');
  assert(!gpx.includes('<qf:routeDistanceM>'), 'routeDistanceM must be OMITTED for an unrecognized track, not fabricated');
});

// ---------------------------------------------------------------- (k) cycle 023 fix 5b: new diagnostics kinds exported

test('gpx+: cycle 023 fix 5b — routeMatchDiagnostic and elevationOutlier events reach the GPX+ export', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, ele: 30 });
  await storage.appendEvent(rideId, {
    kind: 'routeMatchDiagnostic', tUnixMs: clock.t, track: 'Morning', phase: 'anchor',
    accuracyM: 97.7, thresholdM: 50, poorAccuracy: true,
  });
  await storage.appendEvent(rideId, {
    kind: 'routeMatchDiagnostic', tUnixMs: clock.t + 1000, track: 'Morning', phase: 'retry',
    accuracyM: 15, thresholdM: 50, poorAccuracy: false,
  });
  await storage.appendEvent(rideId, {
    kind: 'elevationOutlier', tUnixMs: clock.t + 2000, deltaM: 10.7, dtS: 1, thresholdMps: 4,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:routeMatchDiagnostics>'), 'routeMatchDiagnostics block missing');
  assert(/<qf:attempt track="Morning" phase="anchor" accuracyM="97.7"/.test(gpx), 'anchor attempt line wrong/missing');
  assert(/<qf:attempt track="Morning" phase="retry" accuracyM="15"/.test(gpx), 'retry attempt line wrong/missing');
  assert(gpx.includes('poorAccuracy="true"'), 'poorAccuracy=true not rendered for the initial anchor');
  assert(gpx.includes('<qf:elevationOutliers>'), 'elevationOutliers block missing');
  assert(/<qf:elevationOutlier t="[^"]+" deltaM="10.7" dtS="1" thresholdMps="4"/.test(gpx),
    'elevationOutlier line wrong/missing');

  // and the standard (non-plus) export must stay untouched by any of this (D-023 / byte-identical contract)
  const plain = await storage.exportGpx(rideId);
  assert(!plain.includes('qf:'), 'standard exportGpx leaked new qf: diagnostics content');
});

test('gpx+: cycle 023 fix 5b — a ride with NO routeMatchDiagnostic/elevationOutlier events omits both blocks', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:routeMatchDiagnostics>'), 'routeMatchDiagnostics present with none recorded');
  assert(!gpx.includes('<qf:elevationOutliers>'), 'elevationOutliers present with none recorded');
});
