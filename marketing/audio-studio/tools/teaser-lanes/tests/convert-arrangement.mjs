// convert-arrangement.mjs <in.txt|in.json> <manifest.json> <out.json> "<created>" "<note>" — node >= 20, no dependencies.
// Converts a pasted clip list (.txt) or an existing arrangement (.json) into the .json format
// teaser-lanes.html's Open arrangement reads, using the exact same core code as the page.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const [inPath, manifestPath, outPath, created, note] = process.argv.slice(2);
if (!inPath || !manifestPath || !outPath || created === undefined || note === undefined) {
  console.error("usage: node convert-arrangement.mjs <in.txt|in.json> <manifest.json> <out.json> \"<created>\" \"<note>\"");
  process.exit(2);
}

const htmlPath = join(here, "..", "teaser-lanes.html");
const html = readFileSync(htmlPath, "utf8");
const core = html.match(/<script id="lanes-core">([\s\S]*?)<\/script>/);
if (!core) throw new Error("lanes-core block not found in " + htmlPath);
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(core[1] + "\nmodule.exports = LanesCore;", sandbox);
const C = sandbox.module.exports;

const manifest = C.parseManifest(readFileSync(manifestPath, "utf8"));
const inText = readFileSync(inPath, "utf8");
const arr = C.parseArrangement(inText);
const r = C.applyArrangement(arr, manifest);
const text = C.formatArrangementJson(r.state, manifest.kit, { created, note });
writeFileSync(outPath, text);

const mutedIds = r.state.lanes.filter(l => l.muted).map(l => l.id);
const rejected = arr.rejected || [];
console.log("wrote " + outPath + ": " + r.state.clips.length + " clips, " + r.dropped + " dropped, muted: " + mutedIds.join(", "));
if (r.dropped > 0 || rejected.length > 0) {
  if (rejected.length) console.error(rejected.length + " line(s) not understood: line " + rejected.join(", "));
  process.exit(1);
}
