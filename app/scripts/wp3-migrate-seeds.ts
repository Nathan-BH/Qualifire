/**
 * WP-3 (2026-09-05) — one-shot seed migration, v1 -> v2 (§3.5). Run once with
 * `node --experimental-strip-types scripts/wp3-migrate-seeds.ts` from `app/`.
 * Upgrades the bundled catalog.seed.json (upgradeCatalog) and every element
 * of results.seed.json (upgradeResult), writing both back at their existing
 * 1-space indent. `tests/fixtures/catalog.seed.v1.json` (the pre-WP-3 verbatim
 * copy, already made) is the migration test's real-data input — this script
 * does not touch it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { upgradeCatalog, upgradeResult } from '../src/store/migrations.ts';

const CATALOG_PATH = 'src/store/catalog.seed.json';
const RESULTS_PATH = 'src/store/results.seed.json';

function main(): void {
  const catalogRaw = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const catalogV2 = upgradeCatalog(catalogRaw);
  if (catalogV2 === null) throw new Error(`${CATALOG_PATH}: upgradeCatalog returned null`);
  writeFileSync(CATALOG_PATH, JSON.stringify(catalogV2, null, 1) + '\n');

  const resultsRaw = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
  if (!Array.isArray(resultsRaw)) throw new Error(`${RESULTS_PATH}: not an array`);
  const resultsV2 = resultsRaw.map((r, i) => {
    const up = upgradeResult(r);
    if (up === null) throw new Error(`${RESULTS_PATH}[${i}]: upgradeResult returned null`);
    return up;
  });
  writeFileSync(RESULTS_PATH, JSON.stringify(resultsV2, null, 1) + '\n');

  console.log(`${CATALOG_PATH}: migrated to schemaVersion 2`);
  console.log(`${RESULTS_PATH}: migrated ${resultsV2.length} results to schemaVersion 2`);
}

main();
