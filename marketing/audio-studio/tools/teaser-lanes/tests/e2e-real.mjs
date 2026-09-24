// e2e-real.mjs <realKitCopyDir> [outDir] — reduced browser run against a COPY of the real kit (9 wavs + manifest) in which the
// h264 teaser_v9.mp4 is replaced by a synthetic 47.6 s / 1428-frame webm and manifest.video.file is patched to it (the cloud Chromium has no h264).
// It checks the 9-lane layout, that the browser decodes every wav to exactly the manifest's sample count, the two clocks on the default
// state and the default copy list. Cloud container only. Writes <outDir>/real-*.png and <outDir>/real-report.txt.
import { chromium } from "/usr/local/lib/node_modules_global/playwright/index.mjs";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const kit = resolve(process.argv[2] || "");
const out = resolve(process.argv[3] || join(here, "out"));
if (!process.argv[2]) { console.error("usage: node e2e-real.mjs <real kit copy dir> [outDir]"); process.exit(2); }
mkdirSync(out, { recursive: true });
const pageUrl = pathToFileURL(join(here, "..", "teaser-lanes.html")).href;
const manifest = JSON.parse(readFileSync(join(kit, "manifest.json"), "utf8"));

const lines = [];
let nChecks = 0, nFail = 0;
const log = s => { lines.push(s); console.log(s); };
const check = (name, cond, detail = "") => { nChecks++; if (!cond) nFail++; log((cond ? "PASS " : "FAIL ") + name + (detail !== "" ? "  [" + detail + "]" : "")); };
const norm = s => (s || "").replace(/\s+/g, " ").trim();
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

// default copy list written out from the brief's step-8 table (not computed by the tool)
const stems = ["bed", "a-strings", "a-other", "b-piano", "b-drums", "b-bass", "b-other"];
const expected = [
  "teaser-lanes · " + manifest.video.file + " · 30 fps · 47.600 s · times in seconds; source = that sound's own clock, render = the video's",
  "logo: source 0.000-6.500 s -> render 0.000-6.500 s (gain 0.85, fade out 0.5 s)"
];
for (const id of stems) {
  const mu = id === "bed" ? "" : ", muted";
  expected.push(id + ": source 0.000-15.047 s -> render 10.300-25.347 s (gain 0.45" + mu + ")");
  expected.push(id + ": source 0.000-9.760 s -> render 23.040-32.800 s (gain 0.45, fade out 1 s" + mu + ")");
}
expected.push("e5: source 0.000-8.500 s -> render 24.300-32.800 s (gain 1)");
const EXPECTED_LIST = expected.join("\n");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const EXPECT_H = { "1440x810": 81, "1440x900": 91, "1920x990": 96, "1920x1080": 96 };
for (const [W, H] of [[1440, 810], [1440, 900], [1920, 990], [1920, 1080]]) {
  const tag = W + "x" + H;
  log("\n=== real kit, viewport " + tag + " ===");
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  page.on("pageerror", e => errs.push("pageerror: " + e.message));
  await page.goto(pageUrl);
  const t0 = Date.now();
  await page.setInputFiles("#kit-input", kit);
  await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 60000 });
  log("     load + decode of 9 wavs + video: " + (Date.now() - t0) + " ms");
  check(tag + " 9 lanes", (await page.locator(".lane").count()) === 9);
  const samples = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).map(l => l.dataset.lane + ":" + l.dataset.samples));
  const want = manifest.tracks.map(t => t.id + ":" + t.samples);
  check(tag + " decoded sample counts equal the manifest's for all 9 lanes", samples.join() === want.join(), samples.join(" "));
  if (tag === "1440x810") {
    const peaks = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll(".lane")).map(l => [l.dataset.lane, parseFloat(l.dataset.peak)])));
    for (const t of manifest.tracks) check(tag + " data-peak of " + t.id + " matches the manifest peak " + t.peak + " within 0.0005", Math.abs(peaks[t.id] - t.peak) <= 0.0005, String(peaks[t.id]));
    check(tag + " bed data-peak >= 1.04 (float WAV decoded unclipped)", peaks["bed"] >= 1.04, String(peaks["bed"]));
    check(tag + " a-other data-peak >= 1.10 (float WAV decoded unclipped)", peaks["a-other"] >= 1.10, String(peaks["a-other"]));
    log("     data-peak per lane: " + JSON.stringify(peaks));
  }
  check(tag + " status is plain ready with no leftover error", norm(await page.textContent("#status-text")) === "ready · 9 lanes", norm(await page.textContent("#status-text")));
  const lh = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).map(l => Math.round(l.getBoundingClientRect().height)));
  check(tag + " lane height " + EXPECT_H[tag] + " px", lh.every(h => h === EXPECT_H[tag]), lh.join(","));
  const dims = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: innerHeight }));
  check(tag + " no page scroll (" + dims.sh + " <= " + dims.ih + ")", dims.sh <= dims.ih);
  const bad = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("#video-panel,#readout,#transport,#clip-editor,#howto,#ruler,.lane")).map(e => ({ n: e.id || e.dataset.lane, r: e.getBoundingClientRect() }));
    const o = [];
    for (let i = 0; i < els.length; i++) {
      const a = els[i].r;
      if (a.left < -0.5 || a.top < -0.5 || a.right > innerWidth + 0.5 || a.bottom > innerHeight + 0.5) o.push("outside:" + els[i].n);
      for (let j = i + 1; j < els.length; j++) { const b = els[j].r; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) o.push(els[i].n + "~" + els[j].n); }
    }
    return o;
  });
  check(tag + " no overlaps and everything inside the viewport", bad.length === 0, bad.join(" "));
  const cw = await page.evaluate(() => [document.getElementById("ruler").clientWidth, ...Array.from(document.querySelectorAll(".lane-cv")).map(c => c.clientWidth)]);
  check(tag + " lane canvases share the ruler width (" + cw[0] + ")", cw.every(w => w === cw[0]), cw.join(","));

  // default state: two clocks
  await page.fill("#go-to", "f729"); await page.press("#go-to", "Enter");
  const src = async id => norm(await page.textContent(`.lane[data-lane="${id}"] .lane-src`));
  check(tag + " f729 = 24.300 s: readout", norm(await page.textContent("#readout")) === "24.300 s f729", norm(await page.textContent("#readout")));
  check(tag + " f729: bed src 14.000 | 1.260 (instance 1 tail, instance 2 = the ATTACK), e5 src 0.000 (the start pulse), logo none", (await src("bed")) === "src 14.000 | 1.260" && (await src("e5")) === "src 0.000" && (await src("logo")) === "src —", (await src("bed")) + " | " + (await src("e5")) + " | " + (await src("logo")));
  check(tag + " f729: every stem shows src 14.000 | 1.260", (await Promise.all(["a-strings", "a-other", "b-piano", "b-drums", "b-bass", "b-other"].map(src))).every(s => s === "src 14.000 | 1.260"));
  await page.fill("#go-to", "0"); await page.press("#go-to", "Enter");
  check(tag + " f0: logo src 0.000", (await src("logo")) === "src 0.000");
  await page.fill("#go-to", "f729"); await page.press("#go-to", "Enter");

  await page.click("#btn-copy");
  const txt = await page.inputValue("#clip-list");
  check(tag + " default copy list = header + 16 clip lines exactly as in the brief's step-8 table", txt === EXPECTED_LIST, txt === EXPECTED_LIST ? txt.split("\n").length + " lines" : "\n" + txt);
  await page.keyboard.press("Escape");

  // trade the bed for strings A + other A (unmute both, mute bed): the copy list must follow
  await page.click('.lane[data-lane="bed"] .b-mute');
  await page.click('.lane[data-lane="a-strings"] .b-mute');
  await page.click('.lane[data-lane="a-other"] .b-mute');
  await page.click("#btn-copy");
  const txt2 = await page.inputValue("#clip-list");
  const l2 = txt2.split("\n");
  check(tag + " after bed -> A swap: bed lines muted, A lines not", l2.filter(l => l.startsWith("bed:")).every(l => l.endsWith(", muted)")) && l2.filter(l => /^a-(strings|other):/.test(l)).every(l => !l.includes("muted")));
  await page.keyboard.press("Escape");

  await page.screenshot({ path: join(out, "real-main-" + tag + ".png") });
  if (W === 1440 && H === 810) {
    await page.keyboard.press("4"); await settle(page);
    await page.screenshot({ path: join(out, "real-zoom05-" + tag + ".png") });
    const win = await page.getAttribute("#ruler", "data-window");
    check(tag + " zoom 0.5 s at f729 window [24.05,24.55]", win === "[24.05,24.55]", win);
    await page.keyboard.press("1");
    // real-time play across the ride start
    await page.fill("#go-to", "24"); await page.press("#go-to", "Enter");
    const a = await page.evaluate(() => document.getElementById("video").currentTime);
    await page.keyboard.press("Space"); await page.waitForTimeout(1500); await page.keyboard.press("Space");
    const b = await page.evaluate(() => document.getElementById("video").currentTime);
    check(tag + " play 1.5 s over the real kit: video advanced " + (b - a).toFixed(2) + " s (>= 1.2), context running", b - a >= 1.2 && (await page.getAttribute("body", "data-ctx")) === "running");
    log("     resyncs (reported, not asserted): " + (await page.getAttribute("#status", "data-resyncs")));
  }
  check(tag + " zero console errors", errs.length === 0, errs.join(" | "));
  await ctx.close();
}
await browser.close();
log("\n" + (nFail ? "FAILED: " + nFail + " of " + nChecks : "ALL PASS: " + nChecks + "/" + nChecks + " checks"));
writeFileSync(join(out, "real-report.txt"), lines.join("\n") + "\n");
process.exit(nFail ? 1 : 0);
