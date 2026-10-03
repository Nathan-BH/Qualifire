// Qualifire -- Metro seed redirect (virgin-cycle19 brief 01, 2026-10-03).
// Pure, dependency-free, so tests/seedstubs_suite.ts can run it under plain Node.
// metro.config.js wires it into Metro's resolver. When the bundle is NOT the
// shipped-seed one (EXPO_PUBLIC_SEED_MODE !== 'shipped' -- the same constant
// src/store/seed.ts inlines) the six Leuven seed files are swapped for stubs at
// RESOLUTION time, so Metro never bundles the real catalog, archive ghosts, way
// manifest or the three pre-rendered route PNGs (about 4.1 MB, and Nathan's
// commute geometry). DEMO is untouched: it passes its own in-code asset
// (src/ui/demoWayFixture.ts) and imports none of these files.
const path = require('path');

/** The six real files, relative to the app root, and their stubs. */
const SEED_FILES = [
  ['src/store/catalog.seed.json', 'assets/seed-stubs/catalog.empty.json'],
  ['src/store/results.seed.json', 'assets/seed-stubs/results.empty.json'],
  ['assets/ways/ways.json', 'assets/seed-stubs/ways.empty.json'],
  ['assets/ways/Morning.png', 'assets/seed-stubs/blank.png'],
  ['assets/ways/EveningA.png', 'assets/seed-stubs/blank.png'],
  ['assets/ways/EveningB.png', 'assets/seed-stubs/blank.png'],
];

function seedModeFromEnv(env) {
  return env.EXPO_PUBLIC_SEED_MODE === 'shipped' ? 'shipped' : 'empty';
}

/** Comparison key: normalized, and case-folded on Windows (drive letters and
 * folder names can differ in case between __dirname and Metro's paths there). */
function keyOf(p) {
  const n = path.normalize(p);
  return process.platform === 'win32' ? n.toLowerCase() : n;
}

/** Map of key(absolute real path) -> absolute stub path. Built once per root. */
const tables = new Map();
function redirectTable(appRoot) {
  let table = tables.get(appRoot);
  if (!table) {
    table = new Map();
    for (const [real, stub] of SEED_FILES) {
      table.set(keyOf(path.join(appRoot, real)), path.join(appRoot, stub));
    }
    tables.set(appRoot, table);
  }
  return table;
}

/**
 * Given a Metro resolution (from the default resolver), return the resolution
 * Metro should use. Identity (the SAME object) unless seedMode is 'empty' AND
 * the resolution lands on one of the six files.
 */
function redirectResolution(resolution, appRoot, seedMode) {
  if (seedMode === 'shipped' || !resolution) return resolution;
  const table = redirectTable(appRoot);
  if (resolution.type === 'sourceFile') {
    const stub = table.get(keyOf(resolution.filePath));
    return stub ? { type: 'sourceFile', filePath: stub } : resolution;
  }
  if (resolution.type === 'assetFiles') {
    const hit = resolution.filePaths.map(keyOf).find((k) => table.has(k));
    return hit ? { type: 'assetFiles', filePaths: [table.get(hit)] } : resolution;
  }
  return resolution;
}

module.exports = { SEED_FILES, seedModeFromEnv, redirectTable, redirectResolution };
