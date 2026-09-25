// Headless dump of the RESULTS scatterplot model for the demo modes (FIRST / SECOND / TENTH).
// See README.md in this folder for how to run it. Prints JSON to stdout.
import { demoPriorResults, DEMO_SECS } from '../../app/src/ui/demoModel.ts';
import { DEMO_WAY_ID } from '../../app/src/ui/demoWayFixture.ts';
import { buildPlotModel, GUTTER_W } from '../../app/src/ui/resultsPlotModel.ts';
import { fmt } from '../../app/src/ui/colourModel.ts';
import { towerDate } from '../../app/src/ui/towerModel.ts';

const now = new Date(2026, 8, 26, 12, 0, 0).getTime(); // fixed "now" so the x axis is reproducible
const lap = DEMO_SECS.reduce((a, b) => a + b, 0);
const today = {
  kind: 'rideResult', schemaVersion: 2, rideId: 'demo:today', startedAtMs: now, wayId: DEMO_WAY_ID,
  source: 'app', lap: { rawS: lap, movingS: lap, quality: 'clean' }, sectors: [],
  derivedBy: { engineVersion: 'demo', gateSetVersion: 1, resultSchemaVersion: 2 },
} as any;
const boxW = 344; // ~ a 360 dp phone minus screen + card padding
const out: any = {};
for (const [mode, n] of [['first', 0], ['second', 1], ['tenth', 9]] as const) {
  const results = [...demoPriorResults(n, now), today];
  out[mode] = { model: buildPlotModel(results, boxW - GUTTER_W), todayCaption: `${towerDate(now)} · ${fmt(lap)}`, lap };
}
console.log(JSON.stringify(out));
