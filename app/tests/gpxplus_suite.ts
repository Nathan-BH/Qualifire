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
import { escapeXml, isoTime } from '../src/storage/gpxExport.ts';
import type { Fix, RideEvent } from '../src/storage/types.ts';
import { parseGpx } from '../core/src/index.ts';
import { test, assert, loadFixture, refFor } from './lib.ts';

interface Env { fs: ReturnType<typeof createMemoryFsAdapter>; storage: ReturnType<typeof createStorage>; clock: { t: number } }

/** `withRefFor` (WP-G Part 4): only the routeFidelity-specific tests below
 * inject tests/lib.ts's Node-safe refFor — every other test leaves it
 * undefined, so this suite's existing assertions (none of which know about
 * routeFidelity) are provably unaffected by the feature's addition. */
function makeEnv(startMs = 1755167000000, withRefFor = false): Env {
  const fs = createMemoryFsAdapter();
  const clock = { t: startMs };
  let n = 0;
  const storage = createStorage(fs, {
    now: () => clock.t,
    randomSuffix: () => `g${String(n++).padStart(3, '0')}`,
    ...(withRefFor ? { refFor } : {}),
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
    // N9 (2026-09-02, GPX+ pick/lock-change logging):
    {
      kind: 'pick', tUnixMs: 3200, mode: 'route', from: 'lm:a', to: 'lm:b',
      fromLabel: 'Home', toLabel: 'Work', routeId: 'route:x', pickSource: 'picked',
      routeIds: ['route:x', 'route:y'],
    },
    {
      kind: 'lockChange', tUnixMs: 3500, track: 'Morning', from: 'soft', to: 'verified',
      atChainageM: 500, atT: 3.5, reason: 'unblockedLeader', pick: 'Morning',
    },
    { kind: 'gate', tUnixMs: 4000, track: 'Morning', gateIndex: 0, t: 4, estimated: false },
    { kind: 'storageError', tUnixMs: 5000, message: 'boom' },
    { kind: 'relaunch', tUnixMs: 6000 },
    { kind: 'relaunch', tUnixMs: 6500, downS: 6.2 },
    { kind: 'remount', tUnixMs: 6600 },
    {
      kind: 'routeMatchDiagnostic', tUnixMs: 7000, track: 'Morning', phase: 'anchor',
      accuracyM: 97.7, thresholdM: 50, poorAccuracy: true, xtdM: 12.3,
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
  // N9: a pick and a lockChange must strip out exactly like every other qf:
  // element — this is the byte-identity test's whole point.
  await storage.appendEvent(rideId, {
    kind: 'pick', tUnixMs: 1755166999600, mode: 'route', from: 'lm:a', to: 'lm:b',
    fromLabel: 'Home', toLabel: 'Work', routeId: 'Morning', pickSource: 'picked',
  });
  await storage.appendEvent(rideId, {
    kind: 'lockChange', tUnixMs: 1755167000700, track: 'Morning', from: 'soft', to: 'verified',
    atChainageM: 20, atT: 1755167000.7, reason: 'unblockedLeader', pick: 'Morning',
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
  assert(!gpx.includes('<qf:pick'), 'N9: qf:pick present with no events file on disk');
  assert(!gpx.includes('<qf:lockChanges'), 'N9: qf:lockChanges present with no events file on disk');
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
    accuracyM: 97.7, thresholdM: 50, poorAccuracy: true, xtdM: 12.3,
  });
  await storage.appendEvent(rideId, {
    kind: 'routeMatchDiagnostic', tUnixMs: clock.t + 1000, track: 'Morning', phase: 'retry',
    accuracyM: 15, thresholdM: 50, poorAccuracy: false, xtdM: null,
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
  // WP-G Part 2 gap-fill: per-candidate deviation, when known; omitted (not
  // fabricated) when the source event carries null (the retry phase).
  assert(/<qf:attempt track="Morning" phase="anchor"[^>]* xtdM="12.3"/.test(gpx), 'anchor xtdM not rendered');
  assert(!/phase="retry"[^>]* xtdM=/.test(gpx), 'retry xtdM rendered despite a null source value');
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

// ---------------------------------------------------------------- (l) WP-G 1b: escapeXml quotes

test('gpx+: WP-G 1b — escapeXml now escapes " as well as & < >, and a quoted storageError message survives export', async () => {
  assert(escapeXml('a"b&<>') === 'a&quot;b&amp;&lt;&gt;', `escapeXml('a"b&<>') = ${escapeXml('a"b&<>')}`);
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'storageError', tUnixMs: clock.t, message: 'bad "quote" here' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('bad &quot;quote&quot; here'), 'quoted storageError message not escaped in export');
});

// ---------------------------------------------------------------- (m) WP-G 1c: decoder per-kind validation

test('gpx+: WP-G 1c — decoder rejects lines with a known kind but missing/wrong required fields', () => {
  const lines = [
    JSON.stringify({ kind: 'lock', tUnixMs: 1000, atChainageM: 10, atT: 1 }), // missing track
    JSON.stringify({ kind: 'lock', tUnixMs: 1000, track: 'Morning', atChainageM: 10, atT: NaN }), // non-finite atT
    JSON.stringify({ kind: 'gate', tUnixMs: 1000, track: 'Morning', gateIndex: 0, t: 1 }), // missing estimated
    JSON.stringify({ kind: 'button', tUnixMs: 1000, button: 'bogus' }), // not a valid button literal
    // well-formed control lines: must survive
    JSON.stringify({ kind: 'lock', tUnixMs: 1000, track: 'Morning', atChainageM: 10, atT: 1 }),
    JSON.stringify({ kind: 'button', tUnixMs: 1000, button: 'pause' }),
  ];
  const dec = decodeEventsFile(lines.join('\n') + '\n');
  assert(dec.events.length === 2, `${dec.events.length} events survived, want exactly 2 (the two well-formed lines)`);
  assert(dec.nDropped === 4, `nDropped ${dec.nDropped}, want 4 (the four malformed lines)`);
  assert(dec.events[0].kind === 'lock' && dec.events[1].kind === 'button', 'wrong events survived validation');
});

test('gpx+: WP-G 1c follow-up — decoder also rejects finite-but-out-of-Date-range time fields (RangeError class, not just missing fields)', () => {
  const lines = [
    JSON.stringify({ kind: 'meta', tUnixMs: 1000, schemaVersion: 1, appVersion: 42 }), // appVersion not a string
    JSON.stringify({ kind: 'lock', tUnixMs: 1000, track: 'Morning', atChainageM: 10, atT: 1e18 }), // atT*1000 out of Date range
    JSON.stringify({ kind: 'gate', tUnixMs: 1000, track: 'Morning', gateIndex: 0, t: 1e18, estimated: false }), // t*1000 out of Date range
    JSON.stringify({ kind: 'elevationOutlier', tUnixMs: 1e18, deltaM: 5, dtS: 1, thresholdMps: 4 }), // top-level tUnixMs out of range
    // well-formed control line: must survive
    JSON.stringify({ kind: 'meta', tUnixMs: 1000, schemaVersion: 1, appVersion: '1.2.3' }),
  ];
  const dec = decodeEventsFile(lines.join('\n') + '\n');
  assert(dec.events.length === 1, `${dec.events.length} events survived, want exactly 1 (the well-formed meta line)`);
  assert(dec.nDropped === 4, `nDropped ${dec.nDropped}, want 4 (the four out-of-range/wrong-type lines)`);
});

// ---------------------------------------------------------------- (n) WP-G 1c/B-69: corrupted sidecar never throws

test('gpx+: WP-G B-69 — a sidecar containing ONLY a malformed lock line never throws; export falls back to routeLock=none', async () => {
  const { fs, storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.endRide(rideId);
  // Hand-corrupted sidecar: a lock line with `track` missing entirely — before
  // WP-G 1c this decoded successfully and then threw inside gpxPlusExport.ts
  // (escapeXml(undefined) / isoTime(NaN)); now it is dropped at the decoder.
  fs.files.set(`rides/${rideId}.events.jsonl`, JSON.stringify({ kind: 'lock', tUnixMs: clock.t, atChainageM: 10, atT: 1 }) + '\n');
  let gpx = '';
  let threw = false;
  try {
    gpx = await storage.exportGpxPlus(rideId);
  } catch {
    threw = true;
  }
  assert(!threw, 'exportGpxPlus threw on a hand-corrupted sidecar line — must degrade gracefully instead');
  assert(gpx.includes('<qf:routeLock>none</qf:routeLock>'), 'malformed lock line did not fall back to the honest "none" state');
});

// ---------------------------------------------------------------- (o) WP-G Part 4: route fidelity

test('gpx+: WP-G Part 4 — a locked clean_morning ride carries qf:routeFidelity with onRoutePct > 90', async () => {
  const src = loadFixture('clean_morning');
  const { storage, clock } = makeEnv(src.fixes.t[0] * 1000, /* withRefFor */ true);
  const rideId = await storage.startRide();
  for (let i = 0; i < src.fixes.t.length; i++) {
    clock.t = src.fixes.t[i] * 1000;
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: src.fixes.lat[i], lon: src.fixes.lon[i] });
  }
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  const m = gpx.match(/<qf:routeFidelity track="Morning" corridorM="40" onRoutePct="([\d.]+)" maxXtdM="[\d.]+">/);
  assert(m !== null, `routeFidelity block missing/malformed:\n${gpx}`);
  const pct = Number(m![1]);
  assert(pct > 90, `onRoutePct ${pct} not > 90 for a clean on-route fixture ride`);
});

test('gpx+: WP-G Part 4 — no lock event means routeFidelity is omitted entirely (no honest distance-to-route claim)', async () => {
  const { storage, clock } = makeEnv(1755167000000, /* withRefFor */ true);
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:routeFidelity'), 'routeFidelity present despite no lock event');
});

test('gpx+: WP-G Part 4 — no refFor injected (the default) means routeFidelity is never emitted, even when locked', async () => {
  const { storage, clock } = makeEnv(); // withRefFor defaults to false
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:routeFidelity'), 'routeFidelity present despite no refFor lookup injected');
});

test('gpx+: WP-G Part 4 fix — routeFidelity uses the LAST SETTLED lock, not a transient soft one from a display-target switch', async () => {
  const src = loadFixture('clean_morning');
  const { storage, clock } = makeEnv(src.fixes.t[0] * 1000, /* withRefFor */ true);
  const rideId = await storage.startRide();
  for (let i = 0; i < src.fixes.t.length; i++) {
    clock.t = src.fixes.t[i] * 1000;
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: src.fixes.lat[i], lon: src.fixes.lon[i] });
  }
  // A soft lock on a DIFFERENT track fired first (e.g. a prefix-route display
  // pick before the engine settled) — the original bug (WP-G Part 4, Blocker
  // 1) took the FIRST lock line and published a fidelity % against it,
  // regardless of whether it was ever more than a display choice.
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: src.fixes.t[0] * 1000 + 500, track: 'EveningA',
    atChainageM: 5, atT: src.fixes.t[0] + 0.5, lockKind: 'soft',
  });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000, lockKind: 'finalized',
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(
    gpx.includes('<qf:routeFidelity track="Morning"'),
    `routeFidelity did not report the SETTLED (finalized) track:\n${gpx}`,
  );
  assert(
    !gpx.includes('<qf:routeFidelity track="EveningA"'),
    'routeFidelity reported the transient SOFT lock track instead of the settled one',
  );
});

// ---------------------------------------------------------------- (p) cycle 025: relaunch/lock export enrichment

test('gpx+: cycle 025 — relaunches block carries one timestamped child per relaunch; downS only when present; remounts excluded from the count', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 1000 });
  await storage.appendEvent(rideId, { kind: 'remount', tUnixMs: clock.t + 1500 });
  await storage.appendEvent(rideId, { kind: 'relaunch', tUnixMs: clock.t + 2000, downS: 6.2 });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:relaunches count="2">'), 'count must be 2 (a remount is not a relaunch)');
  assert(gpx.includes(`<qf:relaunch t="${isoTime(clock.t + 1000)}"/>`), 'downS-less relaunch child missing, or downS fabricated');
  assert(gpx.includes(`<qf:relaunch t="${isoTime(clock.t + 2000)}" downS="6.2"/>`), 'relaunch child missing its downS');
  assert(gpx.includes('</qf:relaunches>'), 'relaunches block not closed');
  assert(!gpx.includes('qf:remount'), 'remount events must not be exported');
  const plain = await storage.exportGpx(rideId);
  assert(!plain.includes('qf:'), 'standard exportGpx leaked qf: content');
});

test('gpx+: cycle 025 — every lock event is exported in sidecar order with its lockKind; routeDistanceM still keyed to the first lock', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000, lockKind: 'soft',
  });
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t + 5000, track: 'Morning', atChainageM: 120, atT: (clock.t + 5000) / 1000, lockKind: 'verified',
  });
  // pre-WP-D2-style lock with no lockKind at all — the attribute must be omitted
  await storage.appendEvent(rideId, {
    kind: 'lock', tUnixMs: clock.t + 9000, track: 'Morning', atChainageM: 300, atT: (clock.t + 9000) / 1000,
  });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  const locks = gpx.match(/<qf:routeLock /g) ?? [];
  assert(locks.length === 3, `${locks.length} qf:routeLock elements, want 3`);
  assert(/<qf:routeLock track="Morning" atChainageM="10"[^>]*lockKind="soft"/.test(gpx), 'soft lock missing/wrong');
  assert(/<qf:routeLock track="Morning" atChainageM="120"[^>]*lockKind="verified"/.test(gpx), 'verified lock missing/wrong');
  assert(/<qf:routeLock track="Morning" atChainageM="300" atT="[^"]+"\/>/.test(gpx), 'kindless lock must omit the lockKind attribute');
  assert(gpx.indexOf('atChainageM="10"') < gpx.indexOf('atChainageM="120"'), 'locks out of sidecar order');
  assert(gpx.includes('<qf:routeDistanceM>5325</qf:routeDistanceM>'), 'routeDistanceM missing (first lock, Morning)');
});

// ---------------------------------------------------------------- (q) cycle 025: stale-first-fix cleanup

test('gpx+: cycle025 stale-fix — flagged pre-START/warm-up fixes are excluded from outages, stops, firstFix* (P2 semantics) and counted in qf:excludedFixes; the trkpts themselves stay exported, flagged inline', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0 - 3000);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [
    // the 2026-08-25 shape: one stale cached fix 9 s before START, then five
    // coarse points frozen at the door, then the real ride
    { tUnixMs: t0 - 9000, lat: 50.79, lon: 4.59, accuracyM: 12, preStart: true },
  ];
  for (let i = 1; i <= 5; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8, lon: 4.6, accuracyM: 45, warmup: true });
  for (let i = 0; i < 8; i++) fixes.push({ tUnixMs: t0 + 6000 + i * 1000, lat: 50.8 + i * 0.0001, lon: 4.6, accuracyM: 8 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: t0, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  // record-but-flag: every fix still a trkpt, flags visible per point
  assert((gpx.match(/<trkpt /g) ?? []).length === 14, 'flagged fixes must still be exported as trkpts (D-023 record-but-flag)');
  assert((gpx.match(/<qf:preStart\/>/g) ?? []).length === 1, 'preStart point flag missing/miscounted');
  assert((gpx.match(/<qf:warmup\/>/g) ?? []).length === 5, 'warmup point flags missing/miscounted');
  // P2: firstFix* from the first NON-flagged fix; delay >= 0; exclusions counted, not vanished
  assert(gpx.includes(`<qf:firstFixAt>${isoTime(t0 + 6000)}</qf:firstFixAt>`), 'firstFixAt not the first non-flagged fix');
  assert(gpx.includes('<qf:firstFixDelayS>6</qf:firstFixDelayS>'), 'firstFixDelayS not measured from the first non-flagged fix');
  assert(gpx.includes('<qf:excludedFixes preStart="1" warmup="5"/>'), 'excludedFixes counts wrong/missing');
  // the old pipeline logged a phantom 10 s outage (stale->door) and a phantom stop (frozen door points)
  assert(!gpx.includes('<qf:outages>'), 'phantom outage derived from flagged fixes');
  assert(!gpx.includes('<qf:stops>'), 'phantom stop derived from flagged fixes');
  // P3 rider: max speed comes from the clean moving fixes (~11.1 m/s), not the 130 m/s stale jump
  const m = gpx.match(/<qf:maxSpeedKmh>([\d.]+)<\/qf:maxSpeedKmh>/);
  assert(m !== null, 'maxSpeedKmh missing');
  const kmh = Number(m![1]);
  assert(kmh > 35 && kmh < 45, `maxSpeedKmh ${kmh} — expected ~40 from the clean fixes only`);
});

test('gpx+: cycle025 stale-fix — an UNFLAGGED pre-START fix (ride recorded before the flags existed) is still excluded from derived stats via the start-press timestamp', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0 - 3000);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [{ tUnixMs: t0 - 9000, lat: 50.79, lon: 4.59 }]; // no flag on disk — old ride
  for (let i = 0; i < 8; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8 + i * 0.0001, lon: 4.6 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.appendEvent(rideId, { kind: 'button', tUnixMs: t0, button: 'start' });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:outages>'), 'phantom 9 s outage from the unflagged stale fix (the 4 recorded ride days re-export dirty)');
  assert(gpx.includes(`<qf:firstFixAt>${isoTime(t0)}</qf:firstFixAt>`), 'firstFixAt not the first post-press fix');
  assert(gpx.includes('<qf:firstFixDelayS>0</qf:firstFixDelayS>'), 'firstFixDelayS not clamped to the post-press fix');
  assert(gpx.includes('<qf:excludedFixes preStart="1" warmup="0"/>'), 'export-time pre-START exclusion not counted');
  assert(!gpx.includes('<qf:preStart/>'), 'per-trkpt flag fabricated for a fix that carries none on disk');
});

test('gpx+: cycle025 P3 — maxSpeedKmh filters poor-accuracy and gap-adjacent samples (mid-ride re-acquisition spikes)', async () => {
  const t0 = 1755167000000;
  const { storage, clock } = makeEnv(t0);
  const rideId = await storage.startRide();
  const fixes: Fix[] = [];
  // clean riding at ~5.6 m/s (~20 km/h)
  for (let i = 0; i <= 4; i++) fixes.push({ tUnixMs: t0 + i * 1000, lat: 50.8 + i * 0.00005, lon: 4.6, accuracyM: 8 });
  // a ~200 km/h jump carried by a 90 m-accuracy point (the 23rd's 500 m-acc class) -> acc prong
  fixes.push({ tUnixMs: t0 + 5000, lat: 50.8007, lon: 4.6, accuracyM: 90 });
  fixes.push({ tUnixMs: t0 + 6000, lat: 50.80075, lon: 4.6, accuracyM: 8 });
  // a 14 s outage, then a good-accuracy catch-up point at ~120 km/h -> gap-adjacency prong
  fixes.push({ tUnixMs: t0 + 20000, lat: 50.80175, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 21000, lat: 50.80205, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 22000, lat: 50.8021, lon: 4.6, accuracyM: 8 });
  fixes.push({ tUnixMs: t0 + 23000, lat: 50.80215, lon: 4.6, accuracyM: 8 });
  for (const f of fixes) { clock.t = f.tUnixMs; await storage.appendFix(rideId, f); }
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(gpx.includes('<qf:outages>'), 'the real 14 s outage must STILL be logged — the filter is for max-speed only');
  const m = gpx.match(/<qf:maxSpeedKmh>([\d.]+)<\/qf:maxSpeedKmh>/);
  assert(m !== null, 'maxSpeedKmh missing');
  const kmh = Number(m![1]);
  assert(kmh > 15 && kmh < 25,
    `maxSpeedKmh ${kmh} — a poor-acc (~200 km/h) or gap-adjacent (~120 km/h) sample leaked through the filter`);
});

test('gpx+: cycle025 P3 — maxSpeedKmh is omitted (never a fabricated 0) when no sample survives the filter', async () => {
  const { storage, clock } = makeEnv();
  const rideId = await storage.startRide();
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6, accuracyM: 90 });
  clock.t += 1000;
  await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8001, lon: 4.6, accuracyM: 90 });
  await storage.endRide(rideId);
  const gpx = await storage.exportGpxPlus(rideId);
  assert(!gpx.includes('<qf:maxSpeedKmh>'), 'maxSpeedKmh emitted although every sample endpoint is poor-accuracy');
});

// ---------------------------------------------------------------- (p) N9: <qf:pick>

test('gpx+: N9 — <qf:pick> renders right after startPressedAt, every recorded field escaped, omitted fields dropped', async () => {
  // (a) route ride, explicit pick, full fields incl. label escaping
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
    await storage.appendEvent(rideId, {
      kind: 'pick', tUnixMs: clock.t, mode: 'route',
      from: 'lm:a', to: 'lm:b', fromLabel: 'Home & <Away>', toLabel: 'Work',
      routeId: 'route:x', pickSource: 'picked',
    });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(/<qf:startPressedAt>[^<]*<\/qf:startPressedAt>\n\s*<qf:pick /.test(gpx),
      'qf:pick is not immediately after qf:startPressedAt');
    assert(
      gpx.includes(
        '<qf:pick mode="route" from="lm:a" fromLabel="Home &amp; &lt;Away&gt;" to="lm:b" toLabel="Work" routeId="route:x" pickSource="picked" t="',
      ),
      'route/picked qf:pick attributes wrong/missing/mis-escaped',
    );
  }

  // (b) free ride, one known end — the directional routeIds filter recorded
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
    await storage.appendEvent(rideId, {
      kind: 'pick', tUnixMs: clock.t, mode: 'free',
      from: 'lm:a', to: '~new', fromLabel: 'Home', toLabel: 'new',
      pickSource: 'none', routeIds: ['route:a', 'route:b'],
    });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(
      gpx.includes(
        '<qf:pick mode="free" from="lm:a" fromLabel="Home" to="~new" toLabel="new" pickSource="none" routeIds="route:a route:b" t="',
      ),
      'free-with-routeIds qf:pick attributes wrong/missing',
    );
    assert(!gpx.includes('routeId="'), 'a free ride with no chosen route must not render a routeId attribute');
  }

  // (c) free ride, both ends unknown — unfiltered, no routeIds attribute
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
    await storage.appendEvent(rideId, {
      kind: 'pick', tUnixMs: clock.t, mode: 'free',
      from: '~new', to: '~new', fromLabel: 'new', toLabel: 'new', pickSource: 'none',
    });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(
      gpx.includes('<qf:pick mode="free" from="~new" fromLabel="new" to="~new" toLabel="new" pickSource="none" t="'),
      'free/none qf:pick attributes wrong/missing',
    );
    assert(!gpx.includes('routeIds="'), 'both-ends-unknown free ride must not render a routeIds attribute');
  }

  // (d) minimal pick — mode only, nothing else recorded (an old/degenerate sidecar)
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
    await storage.appendEvent(rideId, { kind: 'pick', tUnixMs: clock.t, mode: 'route' });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(/<qf:pick mode="route" t="[^"]+"\/>/.test(gpx), 'minimal qf:pick must omit every unset attribute');
    assert(!gpx.includes('pickSource='), 'pickSource fabricated when not recorded');
  }

  // (e) no pick event at all — omitted entirely, never fabricated
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, { kind: 'button', tUnixMs: clock.t, button: 'start' });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(!gpx.includes('<qf:pick'), 'qf:pick fabricated when no pick event was recorded');
  }
});

// ---------------------------------------------------------------- (q) N9: <qf:lockChange>

test('gpx+: N9 — <qf:lockChanges> lists every transition in sidecar order with reason+pick, omitted when none; <qf:routeLock> renders the persisted pick', async () => {
  // (a) two transitions, in sidecar order, pick carried on both the lock and each lockChange
  {
    const t0 = 1755167000000;
    const { storage } = makeEnv(t0);
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: t0, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, {
      kind: 'lock', tUnixMs: t0 + 1000, track: 'Morning', atChainageM: 400, atT: (t0 + 1000) / 1000,
      lockKind: 'soft', pick: 'Morning',
    });
    await storage.appendEvent(rideId, {
      kind: 'lockChange', tUnixMs: t0 + 1000, track: 'Morning', from: 'none', to: 'soft',
      atChainageM: 400, atT: (t0 + 1000) / 1000, reason: 'pickAdvance', pick: 'Morning',
    });
    await storage.appendEvent(rideId, {
      kind: 'lockChange', tUnixMs: t0 + 5000, track: 'Morning', from: 'soft', to: 'verified',
      atChainageM: 900, atT: (t0 + 5000) / 1000, reason: 'unblockedLeader', pick: 'Morning',
    });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(
      /<qf:routeLock track="Morning" atChainageM="400"[^>]*lockKind="soft"[^>]*pick="Morning"\/>/.test(gpx),
      'routeLock did not carry the persisted pick',
    );
    const changes = gpx.match(/<qf:lockChange [^\/]+\/>/g) ?? [];
    assert(changes.length === 2, `${changes.length} qf:lockChange elements, want 2`);
    assert(
      changes[0].includes('from="none" to="soft"') && changes[0].includes('reason="pickAdvance"') && changes[0].includes('pick="Morning"'),
      `first lockChange wrong: ${changes[0]}`,
    );
    assert(
      changes[1].includes('from="soft" to="verified"') && changes[1].includes('reason="unblockedLeader"') && changes[1].includes('pick="Morning"'),
      `second lockChange wrong: ${changes[1]}`,
    );
    assert(gpx.includes('<qf:lockChanges>') && gpx.includes('</qf:lockChanges>'), 'lockChanges wrapper missing');
  }

  // (b) no transitions at all — the wrapper must be omitted entirely even
  // though the ride carries a routeLock with no persisted pick.
  {
    const { storage, clock } = makeEnv();
    const rideId = await storage.startRide();
    await storage.appendFix(rideId, { tUnixMs: clock.t, lat: 50.8, lon: 4.6 });
    await storage.appendEvent(rideId, {
      kind: 'lock', tUnixMs: clock.t, track: 'Morning', atChainageM: 10, atT: clock.t / 1000, lockKind: 'verified',
    });
    await storage.endRide(rideId);
    const gpx = await storage.exportGpxPlus(rideId);
    assert(!gpx.includes('<qf:lockChanges'), 'lockChanges wrapper rendered with no lockChange events on the sidecar');
    const rl = (gpx.match(/<qf:routeLock[^>]*\/>/) ?? [''])[0];
    assert(!rl.includes('pick='), 'routeLock rendered a pick attribute although the lock event carried none');
  }
});

// ---------------------------------------------------------------- (r) N9: decoder validation

test('gpx+: N9 — decoder rejects malformed pick/lockChange lines, keeps well-formed ones', () => {
  const lines = [
    JSON.stringify({ kind: 'pick', tUnixMs: 1000, mode: 'bogus' }), // mode not route|free
    JSON.stringify({ kind: 'pick', tUnixMs: 1000, mode: 'route', pickSource: 'bogus' }), // bad pickSource literal
    JSON.stringify({ kind: 'pick', tUnixMs: 1000, mode: 'route', routeIds: ['a', 2] }), // non-string in routeIds
    JSON.stringify({ kind: 'pick', tUnixMs: 1000, mode: 'route', from: 5 }), // from not a string
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'bogus', to: 'soft',
      atChainageM: 10, atT: 1, reason: 'pickAdvance',
    }), // bad from literal
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'none', to: 'none',
      atChainageM: 10, atT: 1, reason: 'pickAdvance',
    }), // 'none' is not a valid `to`
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'none', to: 'soft',
      atChainageM: 10, atT: 1, reason: 'bogus',
    }), // bad reason literal
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'none', to: 'soft',
      atChainageM: NaN, atT: 1, reason: 'pickAdvance',
    }), // JSON.stringify(NaN) -> null, so this exercises a non-number atChainageM
    // well-formed control lines: must survive
    JSON.stringify({
      kind: 'pick', tUnixMs: 1000, mode: 'route', from: 'lm:a', to: 'lm:b',
      fromLabel: 'Home', toLabel: 'Work', routeId: 'route:x', pickSource: 'picked', routeIds: ['route:x'],
    }),
    JSON.stringify({ kind: 'pick', tUnixMs: 1000, mode: 'free' }),
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'none', to: 'soft',
      atChainageM: 10, atT: 1, reason: 'pickAdvance', pick: 'Morning',
    }),
    JSON.stringify({
      kind: 'lockChange', tUnixMs: 1000, track: 'Morning', from: 'soft', to: 'finalized',
      atChainageM: 10, atT: 1, reason: 'rideEndPromotion', pick: null,
    }),
  ];
  const dec = decodeEventsFile(lines.join('\n') + '\n');
  assert(dec.events.length === 4, `${dec.events.length} events survived, want exactly 4 (the four well-formed lines)`);
  assert(dec.nDropped === 8, `nDropped ${dec.nDropped}, want 8 (the eight malformed lines)`);
  assert(dec.events.every((e) => e.kind === 'pick' || e.kind === 'lockChange'), 'wrong events survived validation');
});
