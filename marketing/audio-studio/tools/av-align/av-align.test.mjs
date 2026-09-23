// av-align.test.mjs — node ≥ 18, no dependencies. Run: node av-align.test.mjs (from this folder).
// Extracts the <script id="av-core"> block from av-align.html and checks the pure functions.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "av-align.html"), "utf8");
const core = html.match(/<script id="av-core">([\s\S]*?)<\/script>/);
if (!core) throw new Error("av-core block not found");
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(core[1] + "\nmodule.exports = AVCore;", sandbox);
const C = sandbox.module.exports;

let fails = 0, n = 0;
const ok = (name, cond, detail = "") => { n++; if (!cond) { fails++; console.log("FAIL", name, detail); } else console.log("pass", name); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1. frame <-> time, 30 fps, every frame of the ride (789 frames) and the opening (195)
for (const total of [789, 195]) {
  let bad = 0;
  for (let f = 0; f < total; f++) {
    if (C.frameOf(C.timeOfFrame(f, 30), 30) !== f) bad++;
    if (C.frameOf(C.seekTimeOfFrame(f, 30), 30) !== f) bad++;
  }
  ok(`frame round-trip ${total} frames`, bad === 0, `bad=${bad}`);
}
ok("frameOf(3.80,30) = 114", C.frameOf(3.80, 30) === 114);
ok("frameOf(3.55,30) = 106", C.frameOf(3.55, 30) === 106);
ok("frameOf(4.00,30) = 120", C.frameOf(4.00, 30) === 120);
ok("frameOf(17.80,30) = 534", C.frameOf(17.80, 30) === 534);
ok("frameOf(-0.1) clamps to 0", C.frameOf(-0.1, 30) === 0);
ok("seekTimeOfFrame(114,30) = 3.81667", near(C.seekTimeOfFrame(114, 30), 3.816667, 1e-6));

// 2. offset arithmetic and nudges
ok("nudge +1 frame", C.nudge(3.8, 1 / 30) === 3.8333);
ok("nudge -1 frame", C.nudge(3.8, -1 / 30) === 3.7667);
ok("nudge +10 ms", C.nudge(3.8, 0.010) === 3.81);
ok("nudge -100 ms", C.nudge(3.8, -0.100) === 3.7);
ok("nudge snaps to 0.1 ms", C.nudge(3.80004, 0) === 3.8);
ok("videoTimeOfAudio(1.26, 3.8) = 5.06", near(C.videoTimeOfAudio(1.26, 3.8), 5.06, 1e-9));
ok("audioTimeOfVideo(17.8, 16.54) = 1.26", near(C.audioTimeOfVideo(17.8, 16.54), 1.26, 1e-9));
ok("fmtSeconds", C.fmtSeconds(3.8) === "3.800");
ok("fmtFrames", C.fmtFrames(3.8, 30) === "114.00");
const sw = C.scrubWindow(5.0, 3.8, 30);
ok("scrubWindow", near(sw[0], 1.2, 1e-9) && near(sw[1], 1.2 + 1 / 30, 1e-9), JSON.stringify(sw));

// 3. onset detection on a synthetic click track (44.1 kHz, 6 s, clicks at 1.000 / 2.500 / 4.250 s)
const sr = 44100, mono = new Float32Array(6 * sr);
for (const t of [1.0, 2.5, 4.25]) {
  const i0 = Math.round(t * sr);
  for (let k = 0; k < 2205; k++) mono[i0 + k] = 0.8 * Math.exp(-k / 400) * Math.sin(2 * Math.PI * 880 * k / sr);
}
for (let i = 0; i < mono.length; i++) mono[i] += 0.0005 * Math.sin(2 * Math.PI * 50 * i / sr); // faint hum, must not trigger
const on = C.detectOnsets(mono, sr);
ok("3 onsets found", on.length === 3, JSON.stringify(on));
ok("onset times within 6 ms", on.length === 3 && near(on[0].t, 1.0, 0.006) && near(on[1].t, 2.5, 0.006) && near(on[2].t, 4.25, 0.006), JSON.stringify(on));
ok("silence gives no onsets", C.detectOnsets(new Float32Array(sr), sr).length === 0);

// 4. peak bins
const ramp = new Float32Array(1000); for (let i = 0; i < 1000; i++) ramp[i] = i / 1000;
const pb = C.peakBins(ramp, 0, 1000, 10);
ok("peakBins length", pb.length === 20);
ok("peakBins first bin", near(pb[0], 0, 1e-6) && near(pb[1], 0.099, 1e-6), `${pb[0]} ${pb[1]}`);
ok("peakBins last bin", near(pb[18], 0.9, 1e-6) && near(pb[19], 0.999, 1e-6), `${pb[18]} ${pb[19]}`);

// 5. config block: parse, serialize (byte-exact), apply (block-only change)
const m = html.match(/\/\* AV-ALIGN CONFIG BEGIN \*\/\n([\s\S]*?)\/\* AV-ALIGN CONFIG END \*\//);
ok("config block present once", !!m && html.split("/* AV-ALIGN CONFIG BEGIN */").length === 2 && html.split("/* AV-ALIGN CONFIG END */").length === 2);
const cfg = C.parseConfig(m[1]);
ok("parsed scene/fps", cfg.scene === "ride" && cfg.fps === 30);
ok("parsed T1", cfg.placements[0].label === "T1" && cfg.placements[0].at === 3.8);
ok("serialize round-trips byte-exact", C.serializeConfig(cfg) === m[1], "serialized text differs from the shipped block");
const cfg2 = JSON.parse(JSON.stringify(cfg)); cfg2.placements[0].at = C.nudge(cfg2.placements[0].at, -1 / 30);
const applied = C.applyConfig(html, cfg2);
ok("applyConfig replaced exactly one block", applied.replaced === 1);
const before = html.split("\n"), after = applied.html.split("\n");
const changed = []; for (let i = 0; i < Math.max(before.length, after.length); i++) if (before[i] !== after[i]) changed.push(i + 1);
ok("only the T1 line changed", changed.length === 1 && after[changed[0] - 1].includes('"at": 3.7667'), `changed lines: ${changed.join(",")}`);
ok("applyConfig on text without a block errors", (() => { try { C.applyConfig("nothing here", cfg); return false; } catch (e) { return true; } })());
ok("copy name", /^av-align\.ride\.\d{8}-\d{4}\.html$/.test(C.formatCopyName("ride", new Date(2026, 8, 23, 14, 5))));

// 6. the shipped file has no external references
ok("no http(s) references", !/https?:\/\//.test(html));
ok("no <link> and no src= on scripts", !/<link\b/i.test(html) && !/<script[^>]*\bsrc=/i.test(html));
ok("file under 120 KB", Buffer.byteLength(html, "utf8") < 120 * 1024, `${Buffer.byteLength(html, "utf8")} bytes`);
ok("no comments outside scripts", !html.replace(/<script[\s\S]*?<\/script>/g, "").includes("<!--"));

console.log(`${n - fails}/${n} passed`);
console.log(fails ? "SOMETHING FAILED" : "ALL PASS");
process.exit(fails ? 1 : 0);
