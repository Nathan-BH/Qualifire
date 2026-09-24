// e2e.mjs <kitDir> [outDir] — Playwright run of teaser-lanes.html against the synthetic kit (see synthetic-kit.mjs).
// Cloud container only: Playwright 1.56 from the global node_modules and the preinstalled Chromium (do not run `playwright install`).
// Writes <outDir>/*.png and <outDir>/report.txt (default outDir: ./out next to this file). Exit code 1 on any failed check.
import { chromium } from "/usr/local/lib/node_modules_global/playwright/index.mjs";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const kit = resolve(process.argv[2] || "");
const out = resolve(process.argv[3] || join(here, "out"));
if (!process.argv[2]) { console.error("usage: node e2e.mjs <synthetic kit dir> [outDir]"); process.exit(2); }
mkdirSync(out, { recursive: true });
const pageUrl = pathToFileURL(join(here, "..", "teaser-lanes.html")).href;

const lines = [];
let nChecks = 0, nFail = 0;
const log = s => { lines.push(s); console.log(s); };
const check = (name, cond, detail = "") => {
  nChecks++;
  if (!cond) nFail++;
  log((cond ? "PASS " : "FAIL ") + name + (detail !== "" ? "  [" + detail + "]" : ""));
};
const norm = s => (s || "").replace(/\s+/g, " ").trim();

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
const VIEWPORTS = [[1440, 900], [1440, 810], [1920, 1080], [1920, 990], [1000, 800]];
const SEL_BOXES = ["#video-panel", "#readout", "#transport", "#clip-editor", "#howto", "#ruler", ".lane"];

async function readout(page) { return norm(await page.textContent("#readout")); }
async function src(page, id) { return norm(await page.textContent(`.lane[data-lane="${id}"] .lane-src`)); }
async function goTo(page, text) { await page.fill("#go-to", text); await page.press("#go-to", "Enter"); }
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function clickLane(page, id, t) {
  await settle(page);
  const cv = id ? page.locator(`.lane[data-lane="${id}"] .lane-cv`) : page.locator("#ruler");
  await cv.scrollIntoViewIfNeeded();
  const box = await cv.boundingBox();
  const win = JSON.parse(await page.getAttribute("#ruler", "data-window"));
  const x = (t - win[0]) / (win[1] - win[0]) * box.width;
  await cv.click({ position: { x, y: box.height / 2 } });
  await settle(page);
}
async function boxes(page) {
  return page.evaluate(sels => {
    const out = [];
    for (const s of sels) for (const e of document.querySelectorAll(s)) { const r = e.getBoundingClientRect(); out.push({ s: s + (e.dataset.lane ? "[" + e.dataset.lane + "]" : ""), x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }); }
    return out;
  }, SEL_BOXES);
}
const intersects = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;

for (const [W, H] of VIEWPORTS) {
  const tag = W + "x" + H, stacked = W < 1100;
  log("\n=== viewport " + tag + (stacked ? " (stacked expected)" : " (side layout expected)") + " ===");
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  page.on("pageerror", e => errs.push("pageerror: " + e.message));

  // 1. empty state
  await page.goto(pageUrl);
  await page.screenshot({ path: join(out, "empty-" + tag + ".png") });
  check(tag + " empty: Open kit folder button and ? exist", (await page.locator("#btn-open").isVisible()) && (await page.locator("#btn-help").isVisible()));
  check(tag + " empty: transport disabled", await page.locator("#btn-play").isDisabled());

  // 2. load the kit with one input action
  await page.setInputFiles("#kit-input", kit);
  await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
  check(tag + " loaded: 5 lanes", (await page.locator(".lane").count()) === 5);
  check(tag + " loaded: b-drums shows missing: b-drums.wav", (await src(page, "b-drums")) === "missing: b-drums.wav", await src(page, "b-drums"));
  check(tag + " loaded: readout 0.000 s f0", (await readout(page)) === "0.000 s f0", await readout(page));
  const samples = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).map(l => l.dataset.lane + ":" + l.dataset.samples).join(","));
  check(tag + " loaded: decoded sample counts", samples === "logo:88200,bed:529200,a-strings:529200,b-drums:,e5:132300", samples);
  const pkBed = await page.evaluate(() => document.querySelector('.lane[data-lane="bed"]').dataset.peak);
  check(tag + " loaded: bed data-peak exists and is <= 1.0000 (synthetic 16-bit kit)", pkBed !== undefined && /^\d\.\d{4}$/.test(pkBed) && parseFloat(pkBed) <= 1.0, String(pkBed));
  check(tag + " layout mode", (await page.getAttribute("body", "data-layout")) === (stacked ? "stacked" : "side"));

  // 3. stepping and the two clocks
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  check(tag + " ArrowRight x3 -> 0.100 s f3", (await readout(page)) === "0.100 s f3", await readout(page));
  check(tag + " f3: logo src 0.100, bed src dash", (await src(page, "logo")) === "src 0.100" && (await src(page, "bed")) === "src —", (await src(page, "logo")) + " | " + (await src(page, "bed")));
  await goTo(page, "f60");
  check(tag + " go to f60 -> 2.000 s f60", (await readout(page)) === "2.000 s f60", await readout(page));
  check(tag + " f60: bed src 1.000, e5 src 0.000", (await src(page, "bed")) === "src 1.000" && (await src(page, "e5")) === "src 0.000", (await src(page, "bed")) + " | " + (await src(page, "e5")));
  await page.keyboard.press("Shift+ArrowRight");
  check(tag + " Shift+Right = ten frames -> f70", (await readout(page)) === "2.333 s f70", await readout(page));
  await page.keyboard.press("Home");
  check(tag + " Home -> f0", (await readout(page)) === "0.000 s f0");
  await page.keyboard.press("End");
  check(tag + " End -> f1799", (await readout(page)) === "59.967 s f1799", await readout(page));
  await goTo(page, "f60");

  async function layoutChecks(label) {
    const bs = await boxes(page);
    const dims = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth }));
    const cvw = await page.evaluate(() => Array.from(document.querySelectorAll(".lane-cv")).map(c => c.clientWidth));
    const rw = await page.evaluate(() => document.getElementById("ruler").clientWidth);
    check(tag + " " + label + ": lane canvases share the ruler width (" + rw + " px)", cvw.length === 5 && cvw.every(w => w === rw), cvw.join(","));
    check(tag + " " + label + ": no horizontal scroll", dims.sw <= dims.iw, dims.sw + " vs " + dims.iw);
    let bad = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (intersects(bs[i], bs[j])) bad.push(bs[i].s + "~" + bs[j].s);
    check(tag + " " + label + ": no overlap between video, readout, transport, editor, how-to, ruler, lanes", bad.length === 0, bad.join(" "));
    const lanes = bs.filter(b => b.s.startsWith(".lane"));
    const vp = bs.find(b => b.s === "#video-panel");
    if (!stacked) {
      check(tag + " " + label + ": no page scroll (scrollHeight " + dims.sh + " <= innerHeight " + dims.ih + ")", dims.sh <= dims.ih);
      const outside = bs.filter(b => b.x < -0.5 || b.y < -0.5 || b.r > dims.iw + 0.5 || b.b > dims.ih + 0.5).map(b => b.s);
      check(tag + " " + label + ": every box inside the viewport", outside.length === 0, outside.join(" "));
      check(tag + " " + label + ": video panel width " + Math.round(vp.w) + " >= 520", vp.w >= 520);
      const cvBoxes = await page.evaluate(() => Array.from(document.querySelectorAll(".lane-cv")).map(c => c.getBoundingClientRect().left));
      check(tag + " " + label + ": video entirely left of every lane canvas", cvBoxes.every(x => vp.r <= x));
      check(tag + " " + label + ": lane height " + Math.round(lanes[0].h) + " >= 40", lanes.every(l => l.h >= 40));
    } else {
      check(tag + " " + label + ": stacked, video on top (video bottom <= ruler top)", vp.b <= bs.find(b => b.s === "#ruler").y + 0.5);
    }
    return { vp, lane: lanes[0], rw };
  }
  const lay1 = await layoutChecks("layout after load");
  const howtoShown = await page.evaluate(() => !document.getElementById("howto-body").hidden);
  log("     measured " + tag + ": video panel " + Math.round(lay1.vp.w) + "x" + Math.round(lay1.vp.h) + ", lane height " + Math.round(lay1.lane.h) + ", lane canvas width " + lay1.rw + ", how-to full text shown: " + howtoShown);

  // 4. mute / solo
  await page.click('.lane[data-lane="bed"] .b-mute');
  check(tag + " M on bed -> class muted and aria-pressed", (await page.getAttribute('.lane[data-lane="bed"]', "class")).includes("muted") && (await page.getAttribute('.lane[data-lane="bed"] .b-mute', "aria-pressed")) === "true");
  await page.click('.lane[data-lane="e5"] .b-solo');
  const silent = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).filter(l => l.classList.contains("silent")).map(l => l.dataset.lane).join(","));
  check(tag + " S on e5 -> only e5 audible", silent === "logo,bed,a-strings,b-drums", silent);
  await page.click('.lane[data-lane="e5"] .b-solo');
  await page.click('.lane[data-lane="bed"] .b-mute');
  const silent2 = await page.evaluate(() => Array.from(document.querySelectorAll(".lane")).filter(l => l.classList.contains("silent")).map(l => l.dataset.lane).join(","));
  check(tag + " undo: back to defaults (a-strings and b-drums silent)", silent2 === "a-strings,b-drums", silent2);

  // 5. the worked example: put strings 0-10 at render 44
  await goTo(page, "44");
  check(tag + " go to 44 -> f1320", (await readout(page)) === "44.000 s f1320", await readout(page));
  await page.click('.lane[data-lane="a-strings"] .b-add');
  check(tag + " + on a-strings: clip added and selected", (await page.textContent("#ed-track")) === "a-strings" && (await page.getAttribute("body", "data-clips")) === "8");
  await page.fill("#ed-out", "10");
  await page.press("#ed-out", "Enter");
  check(tag + " editor: out 10 -> end 54.000", (await page.textContent("#ed-end")) === "54.000", await page.textContent("#ed-end"));
  check(tag + " editor: at 44.000, len 10.000", (await page.inputValue("#ed-at")) === "44.000" && (await page.inputValue("#ed-len")) === "10.000");
  await goTo(page, "47.5");
  check(tag + " go to 47.5 -> a-strings src 3.500", (await src(page, "a-strings")) === "src 3.500", await src(page, "a-strings"));
  await page.click('.lane[data-lane="a-strings"] .b-mute');
  check(tag + " unmuted a-strings", !(await page.getAttribute('.lane[data-lane="a-strings"]', "class")).includes("muted"));
  // click a block selects it
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.screenshot({ path: join(out, "main-" + tag + ".png") });
  if (stacked) {
    await page.evaluate(() => { document.getElementById("status").style.position = "static"; });
    await page.screenshot({ path: join(out, "main-" + tag + "-fullpage.png"), fullPage: true });
    await page.evaluate(() => { document.getElementById("status").style.position = ""; });
  }
  const lay2 = await layoutChecks("layout with a clip selected");

  // 6. copy list, exact text
  await page.click("#btn-copy");
  const txt = await page.inputValue("#clip-list");
  check(tag + " copy list equals the expected 9 lines exactly", txt === EXPECTED_LIST, txt === EXPECTED_LIST ? "" : "\n" + txt);
  await page.click("#btn-copy-go");
  await page.waitForFunction(() => document.getElementById("copy-msg").textContent !== "", null, { timeout: 5000 });
  const msg = norm(await page.textContent("#copy-msg"));
  check(tag + " Copy button reports a result", /^copied 9 lines$|could not copy/.test(msg), msg);
  await page.keyboard.press("Escape");
  check(tag + " Esc closes the copy panel", await page.locator("#copy-panel").isHidden());

  // 7. duplicate / delete and overlap hatching
  check(tag + " before duplicate: a-strings has no overlaps", (await page.getAttribute('.lane[data-lane="a-strings"]', "data-overlaps")) === "0");
  await page.click("#btn-dup"); await settle(page);
  check(tag + " Duplicate at playhead -> 9 clips, selected copy at 47.500", (await page.getAttribute("body", "data-clips")) === "9" && (await page.inputValue("#ed-at")) === "47.500", await page.inputValue("#ed-at"));
  check(tag + " overlap [47.5, 54] on a-strings -> data-overlaps 1", (await page.getAttribute('.lane[data-lane="a-strings"]', "data-overlaps")) === "1");
  await page.click("#btn-del"); await settle(page);
  check(tag + " Delete -> 8 clips, overlaps back to 0", (await page.getAttribute("body", "data-clips")) === "8" && (await page.getAttribute('.lane[data-lane="a-strings"]', "data-overlaps")) === "0");
  await page.keyboard.press("Delete");
  check(tag + " Delete with nothing selected does nothing", (await page.getAttribute("body", "data-clips")) === "8");

  // 8. zoom
  await goTo(page, "44");
  await page.keyboard.press("3"); await settle(page);
  check(tag + " zoom 2 s: ruler shows frame ticks", (await page.getAttribute("#ruler", "data-ticks")) === "frames");
  await page.keyboard.press("4"); await settle(page);
  const wnd = await page.getAttribute("#ruler", "data-window"), fpx = parseFloat(await page.getAttribute("#ruler", "data-frame-px"));
  check(tag + " zoom 0.5 s: window [43.75,44.25]", wnd === "[43.75,44.25]", wnd);
  check(tag + " zoom 0.5 s: frame ticks " + fpx + " px apart (>= 40)", fpx >= 40);
  if (W === 1440 && H === 900) await page.screenshot({ path: join(out, "zoom05-1440x900.png") });
  await clickLane(page, "bed", 44.1 + 1 / 60); // the middle of frame 1323 (a click exactly on a frame boundary can land on either side by one pixel)
  check(tag + " click at the middle of frame 1323 in a lane seeks to f1323", (await readout(page)) === "44.100 s f1323", await readout(page));
  await page.keyboard.press("1"); await settle(page);
  check(tag + " zoom back to All", (await page.getAttribute("#ruler", "data-ticks")) === "seconds" && (await page.getAttribute("#ruler", "data-window")) === "[0,60]");
  const near = async f => Math.abs(parseInt((await readout(page)).split("f")[1], 10) - f) <= 3; // one pixel is 3 frames at zoom All
  await clickLane(page, "bed", 5);
  check(tag + " click on the bed block at 5 s selects it and seeks to about f150 (+-1 px)", (await page.textContent("#ed-track")) === "bed" && (await near(150)), (await page.textContent("#ed-track")) + " " + (await readout(page)));
  await clickLane(page, null, 30);
  check(tag + " click on the ruler at 30 s seeks to about f900 (+-1 px)", await near(900), await readout(page));

  // 9. play
  await goTo(page, "10");
  const t0 = await page.evaluate(() => document.getElementById("video").currentTime);
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  await page.keyboard.press("Space");
  const t1 = await page.evaluate(() => document.getElementById("video").currentTime);
  check(tag + " play 700 ms: video advanced " + (t1 - t0).toFixed(2) + " s (>= 0.5)", t1 - t0 >= 0.5, t0.toFixed(3) + " -> " + t1.toFixed(3));
  const ctxState = await page.getAttribute("body", "data-ctx");
  check(tag + " AudioContext state running", ctxState === "running", ctxState);
  log("     resyncs during that play (reported, not asserted): " + (await page.getAttribute("#status", "data-resyncs")));
  check(tag + " after pause the readout moved on", parseInt((await readout(page)).split("f")[1], 10) > 300, await readout(page));

  // 9b. playing into the end of the video stops cleanly
  await goTo(page, "f1785");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.getElementById("btn-play").textContent === "Play", null, { timeout: 5000 });
  check(tag + " play into the end: stops by itself, button says Play again, readout on the last frames", parseInt((await readout(page)).split("f")[1], 10) >= 1790, await readout(page));

  // 10. persistence: reload, reopen, restored, Reset
  {
    await page.reload();
    await page.setInputFiles("#kit-input", kit);
    await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
    const stt = norm(await page.textContent("#status-text"));
    check(tag + " reload + reopen: status says restored", stt.includes("restored"), stt);
    check(tag + " restored: 8 clips and a-strings unmuted", (await page.getAttribute("body", "data-clips")) === "8" && !(await page.getAttribute('.lane[data-lane="a-strings"]', "class")).includes("muted"));
    await page.click("#btn-reset");
    check(tag + " Reset: back to the manifest's 7 clips, a-strings muted again", (await page.getAttribute("body", "data-clips")) === "7" && (await page.getAttribute('.lane[data-lane="a-strings"]', "class")).includes("muted"));
    check(tag + " Reset button hidden afterwards", await page.locator("#btn-reset").isHidden());
  }

  // robustness (one viewport is enough)
  if (W === 1440 && H === 900) {
    log("--- robustness at " + tag);
    await goTo(page, "garbage");
    check(tag + " go-to garbage: visible error, readout unchanged", (await norm(await page.textContent("#status-text"))).includes("go to:") && (await page.locator("#go-to").getAttribute("class"))?.includes("bad"));
    await page.fill("#go-to", "");
    await clickLane(page, "bed", 5); // select the first bed clip
    await page.fill("#ed-out", "0"); await page.press("#ed-out", "Enter");
    const m1 = norm(await page.textContent("#status-text"));
    check(tag + " editor: out 0 (<= in) is refused with a message", m1.includes("out <= in"), m1);
    await page.fill("#ed-gain", "5"); await page.press("#ed-gain", "Enter");
    const m2 = norm(await page.textContent("#status-text"));
    check(tag + " editor: gain 5 is refused with a message", m2.includes("gain"), m2);
    await page.fill("#ed-gain", "-1"); await page.press("#ed-gain", "Enter");
    const m3 = norm(await page.textContent("#status-text"));
    check(tag + " editor: gain -1 is refused with a message", m3.includes("not a number"), m3);
    await page.keyboard.press("Escape");
    await goTo(page, "f1799");
    await page.click('.lane[data-lane="logo"] .b-add');
    check(tag + " + at the last frame: no crash, one clip added", (await page.getAttribute("body", "data-clips")) === "8", await page.getAttribute("body", "data-clips"));
    await page.click("#btn-del");
    check(tag + " Delete removes it again", (await page.getAttribute("body", "data-clips")) === "7");
    // folder without a manifest
    const empty = mkdtempSync(join(tmpdir(), "nomanifest-"));
    writeFileSync(join(empty, "readme.txt"), "not a kit\n");
    await page.setInputFiles("#kit-input", empty);
    await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("no manifest.json"), null, { timeout: 5000 });
    check(tag + " folder without manifest.json: visible error", true, norm(await page.textContent("#status-text")));
    // manifest with an unknown track
    const bad = mkdtempSync(join(tmpdir(), "badkit-"));
    const m = JSON.parse((await import("node:fs")).readFileSync(join(kit, "manifest.json"), "utf8"));
    m.clips.push({ track: "ghost", in: 0, out: 1, at: 0, gain: 1 });
    writeFileSync(join(bad, "manifest.json"), JSON.stringify(m));
    await page.setInputFiles("#kit-input", bad);
    await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("unknown track ghost"), null, { timeout: 5000 });
    check(tag + " manifest with an unknown track: visible error naming it", true, norm(await page.textContent("#status-text")));
    // kit without the video
    const nov = mkdtempSync(join(tmpdir(), "novideo-"));
    writeFileSync(join(nov, "manifest.json"), JSON.stringify(JSON.parse((await import("node:fs")).readFileSync(join(kit, "manifest.json"), "utf8"))));
    await page.setInputFiles("#kit-input", nov);
    await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("is missing video.webm"), null, { timeout: 5000 });
    check(tag + " kit without the video: visible error", true, norm(await page.textContent("#status-text")));
    // re-open the good kit and take the help screenshot with a clean state
    await page.setInputFiles("#kit-input", kit);
    await page.waitForFunction(() => document.getElementById("status-text").textContent.includes("ready"), null, { timeout: 30000 });
    await page.keyboard.press("?");
    check(tag + " ? opens the help panel", await page.locator("#help-panel").isVisible());
    await page.screenshot({ path: join(out, "help-1440x900.png") });
    await page.keyboard.press("Escape");
  }

  check(tag + " zero console errors and page errors", errs.length === 0, errs.join(" | "));
  await ctx.close();
}
await browser.close();

log("\n" + (nFail ? "FAILED: " + nFail + " of " + nChecks + " checks" : "ALL PASS: " + nChecks + "/" + nChecks + " checks"));
writeFileSync(join(out, "report.txt"), lines.join("\n") + "\n");
process.exit(nFail ? 1 : 0);
