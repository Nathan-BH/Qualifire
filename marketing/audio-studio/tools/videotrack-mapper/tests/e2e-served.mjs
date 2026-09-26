// e2e-served.mjs <synKitDir> [outDir] — Playwright run of teaser-lanes.html served over a local static HTTP
// server: auto-load of the default kit (kits.json) and the header kit-picker menu (cycle 22). Cloud container
// only: Playwright 1.56 from the global node_modules and the preinstalled Chromium (do not run `playwright
// install`). Writes <outDir>/served-*.png and <outDir>/served-report.txt. Exit code 1 on any failed check.
import { chromium } from "/usr/local/lib/node_modules_global/playwright/index.mjs";
import { mkdirSync, writeFileSync, readFileSync, cpSync, mkdtempSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve, extname } from "node:path";
import { tmpdir } from "node:os";
import http from "node:http";

const here = dirname(fileURLToPath(import.meta.url));
const synKit = resolve(process.argv[2] || "");
const out = resolve(process.argv[3] || join(here, "out"));
if (!process.argv[2]) { console.error("usage: node e2e-served.mjs <synthetic kit dir> [outDir]"); process.exit(2); }
mkdirSync(out, { recursive: true });

const lines = [];
let nChecks = 0, nFail = 0;
const log = s => { lines.push(s); console.log(s); };
const check = (name, cond, detail = "") => { nChecks++; if (!cond) nFail++; log((cond ? "PASS " : "FAIL ") + name + (detail !== "" ? "  [" + detail + "]" : "")); };
const norm = s => (s || "").replace(/\s+/g, " ").trim();

// ---- 1. temp folder: teaser-lanes.html copy, kits.json (kit-syn default, kit-missing does not exist), kit-syn/ = a copy of the synthetic kit ----
const tmp = mkdtempSync(join(tmpdir(), "teaser-lanes-served-"));
cpSync(join(here, "..", "teaser-lanes.html"), join(tmp, "teaser-lanes.html"));
mkdirSync(join(tmp, "kit-syn"), { recursive: true });
cpSync(synKit, join(tmp, "kit-syn"), { recursive: true });
writeFileSync(join(tmp, "kits.json"), JSON.stringify({
  format: "teaser-lanes-kits", version: 1, default: "kit-syn",
  kits: [{ dir: "kit-syn", label: "syn" }, { dir: "kit-missing", label: "missing" }]
}, null, 2) + "\n");

// ---- 2. node:http static server, Content-Type by extension, rooted at the temp folder ----
// favicon.ico -> 204 (Ruling 1 amendment: otherwise Chromium logs an unavoidable 404 console error on every load).
const TYPES = { ".html": "text/html", ".json": "application/json", ".webm": "video/webm", ".wav": "audio/wav" };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  const file = join(tmp, p.replace(/^\/+/, ""));
  if (!file.startsWith(tmp)) { res.writeHead(403); res.end(); return; }
  let data;
  try { data = readFileSync(file); } catch (e) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(data);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const pageUrl = "http://127.0.0.1:" + port + "/teaser-lanes.html";

// default copy list, written out from e2e.mjs's own EXPECTED_LIST literal (same synthetic kit, line ~27 there)
const EXPECTED_LIST = [
  "teaser-lanes · video.webm · 30 fps · 60.000 s · times in seconds; source = that sound's own clock, render = the video's",
  "logo: source 0.000-1.000 s -> render 0.000-1.000 s (gain 0.85, fade out 0.2 s)",
  "bed: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45)",
  "bed: source 0.000-5.000 s -> render 20.000-25.000 s (gain 0.45, fade out 1 s)",
  "a-strings: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45)",
  "a-strings: source 0.000-5.000 s -> render 20.000-25.000 s (gain 0.45, fade out 1 s)",
  "a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 1)",
  "b-drums: source 0.000-1.000 s -> render 3.000-4.000 s (gain 1, muted, file missing)",
  "e5: source 0.000-3.000 s -> render 2.000-5.000 s (gain 1)"
].join("\n");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--autoplay-policy=no-user-gesture-required"] });

// ============================================================
// served context (http://)
// ============================================================
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrs = [], pageErrs = [], allowedErrs = [];
page.on("console", m => {
  if (m.type() !== "error") return;
  const text = m.text(), url = (m.location() && m.location().url) || "";
  // Ruling 1 amendment: allow-list only the two deliberate 404s (kit-syn's missing b-drums.wav, kit-missing's
  // absent manifest.json); any other console error fails the check.
  if (text.startsWith("Failed to load resource: the server responded with a status of 404") &&
      (url.endsWith("/kit-syn/b-drums.wav") || url.endsWith("/kit-missing/manifest.json"))) {
    allowedErrs.push(text + " @ " + url);
    return;
  }
  consoleErrs.push(text + " @ " + url);
});
page.on("pageerror", e => pageErrs.push(e.message));

await page.goto(pageUrl);
await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
check("served: status reaches ready · 5 lanes within 30 s, no setInputFiles (auto-load)", norm(await page.textContent("#status-text")).startsWith("ready · 5 lanes"), norm(await page.textContent("#status-text")));

const pick = await page.evaluate(() => { const s = document.getElementById("kit-pick"); return [s.hidden, s.value, s.options.length]; });
check("served: #kit-pick visible, 2 options, value kit-syn", pick[0] === false && pick[1] === "kit-syn" && pick[2] === 2, JSON.stringify(pick));
check("served: body[data-served] === \"1\"", (await page.getAttribute("body", "data-served")) === "1");

check("served: #kit-info is \"kit: teaser-lanes · video.webm\"", norm(await page.textContent("#kit-info")) === "kit: teaser-lanes · video.webm", norm(await page.textContent("#kit-info")));

// Ruling 1's tolerance path: b-drums.wav is deliberately absent from the synthetic kit; the served fetch 404s on
// it, fetchKitEntries leaves it out of entries, and openKit shows the same "missing" lane as the file:// path.
const bdrumsSrc = norm(await page.textContent('.lane[data-lane="b-drums"] .lane-src'));
check("served: b-drums lane-src = missing: b-drums.wav (soft 404, like file://)", bdrumsSrc === "missing: b-drums.wav", bdrumsSrc);
const samples = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).map(l => l.dataset.lane + ":" + l.dataset.samples).join(","));
check("served: decoded sample counts (b-drums has none)", samples === "logo:88200,bed:529200,a-strings:529200,b-drums:,e5:132300", samples);

// e2e.mjs's own EXPECTED_LIST literal is the copy list after its own worked-example steps (its lines ~187-197:
// go to 44, add an a-strings clip 0-10 there, then unmute a-strings), not the raw auto-load default — reproduce
// that same sequence so the literal comparison is meaningful, exactly as done there.
await page.fill("#go-to", "44"); await page.press("#go-to", "Enter");
await page.click('.lane[data-lane="a-strings"] .b-add');
await page.fill("#ed-out", "10"); await page.press("#ed-out", "Enter");
await page.click('.lane[data-lane="a-strings"] .b-mute');
check("served: matched e2e.mjs's worked example (a-strings clip added, unmuted)", !(await page.getAttribute('.lane[data-lane="a-strings"]', "class")).includes("muted") && (await page.getAttribute("body", "data-clips")) === "8");
await page.click("#btn-copy");
const txt = await page.inputValue("#clip-list");
check("served: copy list equals e2e.mjs's EXPECTED_LIST (incl. b-drums' file missing line)", txt === EXPECTED_LIST, txt === EXPECTED_LIST ? "ok" : "\n" + txt);
await page.keyboard.press("Escape");

await page.screenshot({ path: join(out, "served-ready.png") });

// selecting kit-missing (no such folder): manifest.json fetch is hard-required -> loadServedKit's catch fires
await page.selectOption("#kit-pick", "kit-missing");
await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("could not fetch kit-missing/"), null, { timeout: 10000 });
const stMissing = norm(await page.textContent("#status-text"));
check("served: selecting kit-missing -> \"could not fetch kit-missing/\" and ⚠", stMissing.includes("could not fetch kit-missing/") && stMissing.includes("⚠"), stMissing);

await page.screenshot({ path: join(out, "served-menu.png") });

// selecting kit-syn again -> back to ready, and the pick is remembered in localStorage
await page.selectOption("#kit-pick", "kit-syn");
await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
check("served: selecting kit-syn again -> ready · 5 lanes", norm(await page.textContent("#status-text")).startsWith("ready · 5 lanes"), norm(await page.textContent("#status-text")));
const lsPick = await page.evaluate(() => { try { return localStorage.getItem("teaser-lanes:kit-pick"); } catch (e) { return null; } });
check("served: localStorage[\"teaser-lanes:kit-pick\"] === \"kit-syn\"", lsPick === "kit-syn", String(lsPick));

// reload -> auto-loads again to ready (remembered pick, not the kits.json default rule re-evaluated from scratch)
await page.reload();
await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
check("served: reload auto-loads again to ready (remembered pick)", norm(await page.textContent("#status-text")).startsWith("ready · 5 lanes"), norm(await page.textContent("#status-text")));

check("served: zero disallowed console errors", consoleErrs.length === 0, consoleErrs.join(" | "));
check("served: zero page errors", pageErrs.length === 0, pageErrs.join(" | "));
log("     allowed (deliberate) 404 console errors seen: " + (allowedErrs.length ? allowedErrs.join(" | ") : "(none logged)"));

await ctx.close();

// ============================================================
// second browser context, opened on file:// — SERVED must be false, no fetch, no console error, #kit-pick hidden
// ============================================================
const ctx2 = await browser.newContext();
const page2 = await ctx2.newPage();
const errs2 = [];
page2.on("console", m => { if (m.type() === "error") errs2.push("console: " + m.text()); });
page2.on("pageerror", e => errs2.push("pageerror: " + e.message));
const fileUrl = pathToFileURL(join(tmp, "teaser-lanes.html")).href;
await page2.goto(fileUrl);
await page2.waitForTimeout(1000);
check("file://: #kit-pick hidden", await page2.locator("#kit-pick").isHidden());
check("file://: status is \"open the kit folder to begin\"", norm(await page2.textContent("#status-text")) === "open the kit folder to begin", norm(await page2.textContent("#status-text")));
check("file://: body.dataset.served is undefined", (await page2.getAttribute("body", "data-served")) === null);
check("file://: zero console errors / page errors", errs2.length === 0, errs2.join(" | "));
await ctx2.close();

await browser.close();
server.close();

log("\n" + (nFail ? "FAILED: " + nFail + " of " + nChecks : "ALL PASS: " + nChecks + "/" + nChecks + " checks"));
writeFileSync(join(out, "served-report.txt"), lines.join("\n") + "\n");
process.exit(nFail ? 1 : 0);
