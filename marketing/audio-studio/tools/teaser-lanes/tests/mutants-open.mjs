// mutants-open.mjs <toolDir> <outDir> <synKitDir> [ids] — mutation check for the open/save arrangement feature (node, no deps).
// For each mutant: copies teaser-lanes.html, teaser-lanes.test.mjs and tests/fixtures/ into <outDir>/oNN/,
// applies one exact find -> replace on the html copy (must match exactly once, else "ANCHOR MISSING oNN"),
// runs `node teaser-lanes.test.mjs` there. If the unit suite still passes, copies tests/e2e.mjs into
// <outDir>/oNN/tests/ and runs `node tests/e2e.mjs <synKitDir> <outDir>/oNN/e2e` with cwd <outDir>/oNN;
// a non-zero exit or no "ALL PASS" -> "killed (e2e)", else "SURVIVED". A unit-caught mutant prints
// "killed (unit)" — except a stated ACCEPT (a mutant proven equivalent).
// «Ruling 4, 2026-09-25»: new synKitDir argument and e2e second pass; O11's acceptNote removed (it is
// not equivalent — see RULINGS-4 ruling 6); mutants O12-O20 added (RULINGS-4 ruling 1/3/4/5/8 regions).
import { mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const toolDir = process.argv[2], outDir = process.argv[3], synKitDirArg = process.argv[4], idsArg = process.argv[5];
if (!toolDir || !outDir || !synKitDirArg) { console.error("usage: node mutants-open.mjs <toolDir> <outDir> <synKitDir> [ids]"); process.exit(2); }
const synKitDir = resolve(synKitDirArg);
mkdirSync(outDir, { recursive: true });

const html = readFileSync(join(toolDir, "teaser-lanes.html"), "utf8");
const wantedIds = idsArg ? new Set(idsArg.split(",").map(s => s.trim())) : null;

const MUTANTS = [
  { id: "O1", what: "in/out swapped in parseClipLine",
    find: 'const track = m[1], inV = parseFloat(m[2]), outV = parseFloat(m[3]), at = parseFloat(m[4]);',
    replace: 'const track = m[1], inV = parseFloat(m[3]), outV = parseFloat(m[2]), at = parseFloat(m[4]);' },
  { id: "O2", what: "fade in part never stored",
    find: 'if ((pm = /^fade in\\s+(\\d+(?:\\.\\d+)?)\\s*s$/.exec(part))) { fade_in = parseFloat(pm[1]); continue; }',
    replace: 'if ((pm = /^fade in\\s+(\\d+(?:\\.\\d+)?)\\s*s$/.exec(part))) { continue; }' },
  { id: "O3", what: "muted part ignored (lane flag never true)",
    find: 'if (/^muted$/.test(part)) { muted = true; continue; }',
    replace: 'if (/^muted$/.test(part)) { continue; }' },
  { id: "O4", what: "clips.slice(1) before return in parseArrangementText (off-by-one count)",
    find: 'return { kind: "text", clips, muted, rejected };',
    replace: 'return { kind: "text", clips: clips.slice(1), muted, rejected };' },
  { id: "O5", what: "JSON writer omits fade_out",
    find: 'const o = { track: c.track, in: c.in, out: c.out, at: c.at, gain: c.gain, fade_in: c.fade_in, fade_out: c.fade_out };',
    replace: 'const o = { track: c.track, in: c.in, out: c.out, at: c.at, gain: c.gain, fade_in: c.fade_in };' },
  { id: "O6", what: "format-tag check removed (format !== -> false &&)",
    find: 'if (obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (expected \\"format\\": \\"teaser-lanes-arrangement\\")");',
    replace: 'if (false && obj.format !== ARRANGEMENT_FORMAT) throw new Error("not a teaser-lanes arrangement (expected \\"format\\": \\"teaser-lanes-arrangement\\")");' },
  { id: "O7", what: "applyArrangement duration tolerance 0.0015 -> 10",
    find: 'Math.abs(arr.video.duration_s - manifest.video.duration_s) > 0.0015',
    replace: 'Math.abs(arr.video.duration_s - manifest.video.duration_s) > 10' },
  { id: "O8", what: "JSON writer sort removed",
    find: '.sort((a, b) => {\n      const la = laneOrder.get(a.c.track), lb = laneOrder.get(b.c.track);\n      if (la !== lb) return la - lb;\n      if (a.c.at !== b.c.at) return a.c.at - b.c.at;\n      return a.i - b.i;\n    })',
    replace: '.sort((a, b) => 0)' },
  { id: "O9", what: "applyArrangement's dropped count forced to 0",
    find: 'return { state: r.state, dropped: r.dropped, note };',
    replace: 'return { state: r.state, dropped: 0, note };' },
  { id: "O10", what: "arrangementFileName month not zero-padded / off by one (getMonth() without +1)",
    find: 'return "arrangement_" + date.getFullYear() + p2(date.getMonth() + 1) + p2(date.getDate()) + "-" + p2(date.getHours()) + p2(date.getMinutes()) + ".json";',
    replace: 'return "arrangement_" + date.getFullYear() + p2(date.getMonth()) + p2(date.getDate()) + "-" + p2(date.getHours()) + p2(date.getMinutes()) + ".json";' },
  { id: "O11", what: "parseArrangement also treats a leading [ as JSON",
    find: 'if (t[0] === "{") {',
    replace: 'if (t[0] === "{" || t[0] === "[") {' },
  { id: "O12", what: "M acts on the stale lane object (blocker)",
    find: 'L.muted = !L.muted;',
    replace: 'l.muted = !l.muted;' },
  { id: "O13", what: "S acts on the stale lane object (blocker)",
    find: 'L.solo = !L.solo;',
    replace: 'l.solo = !l.solo;' },
  { id: "O14", what: "M does not clear Undo",
    find: 'applyAudible(); changed(); renderStatus(); };',
    replace: 'applyAudible(); persist(); renderStatus(); };' },
  { id: "O15", what: "changed() no longer clears S.undo",
    find: 'function changed(restartPlay) {\n    S.undo = null;\n',
    replace: 'function changed(restartPlay) {\n' },
  { id: "O16", what: "Save writes an empty created stamp",
    find: '{ created: C.arrangementStamp(now), note: "" }',
    replace: '{ created: "", note: "" }' },
  { id: "O17", what: "unloadKit keeps a stale Undo",
    find: 'S.restored = false; S.undo = null;',
    replace: 'S.restored = false;' },
  { id: "O18", what: "drop routes by extension again",
    find: 'if (fl && fl.length === 1 && !(en0 && en0.isDirectory)) {',
    replace: 'if (fl && fl.length === 1 && /\\.(json|txt)$/i.test(fl[0].name)) {' },
  { id: "O19", what: "video block without numbers still compared",
    find: 'Number.isFinite(arr.video.fps) && Number.isFinite(arr.video.duration_s) && ',
    replace: '' },
  { id: "O20", what: "version message without quotes",
    find: 'JSON.stringify(obj.version)',
    replace: 'obj.version' }
];

const rows = [];
for (const m of MUTANTS) {
  if (wantedIds && !wantedIds.has(m.id)) continue;
  const dir = join(outDir, m.id.toLowerCase());
  mkdirSync(join(dir, "tests"), { recursive: true });
  const count = html.split(m.find).length - 1;
  if (count !== 1) {
    console.log("ANCHOR MISSING " + m.id + " (found " + count + " times, expected exactly 1)");
    rows.push({ id: m.id, what: m.what, result: "ANCHOR MISSING" });
    continue;
  }
  const mutatedHtml = html.split(m.find).join(m.replace);
  writeFileSync(join(dir, "teaser-lanes.html"), mutatedHtml);
  cpSync(join(toolDir, "teaser-lanes.test.mjs"), join(dir, "teaser-lanes.test.mjs"));
  cpSync(join(toolDir, "tests", "fixtures"), join(dir, "tests", "fixtures"), { recursive: true });
  let unitPassed;
  try { execFileSync("node", ["teaser-lanes.test.mjs"], { cwd: dir, stdio: "pipe" }); unitPassed = true; }
  catch (e) { unitPassed = false; }
  let result;
  if (!unitPassed) {
    result = "killed (unit)";
  } else {
    cpSync(join(toolDir, "tests", "e2e.mjs"), join(dir, "tests", "e2e.mjs"));
    let e2ePassed = false;
    try {
      const outBuf = execFileSync("node", ["tests/e2e.mjs", synKitDir, join(dir, "e2e")], { cwd: dir, stdio: "pipe" });
      e2ePassed = outBuf.toString().includes("ALL PASS");
    } catch (e) { e2ePassed = false; }
    result = e2ePassed ? "SURVIVED" : "killed (e2e)";
  }
  rows.push({ id: m.id, what: m.what, result });
}

console.log("");
console.log("id   | what | killed/SURVIVED");
console.log("---|---|---");
for (const r of rows) console.log(r.id + " | " + r.what + " | " + r.result);

const anchorMissing = rows.filter(r => r.result === "ANCHOR MISSING").length;
const survived = rows.filter(r => r.result === "SURVIVED").length;
console.log("\nANCHOR MISSING: " + anchorMissing + "   SURVIVED (uncaught): " + survived + "   total mutants: " + rows.length);
process.exit((anchorMissing || survived) ? 1 : 0);
