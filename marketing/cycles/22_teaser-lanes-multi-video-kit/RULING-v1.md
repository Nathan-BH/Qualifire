# RULING v1 — cycle 22 (teaser-lanes multi-video kit)

Fable ruling (fresh context), 2026-09-26, on the two STOPPED items in `EXECUTOR-REPORT-v1.md` / `OPEN-ITEMS.md` #1–#2.
Addendum to `BRIEF-v1.md`; where the two disagree, this file wins. Everything below was checked against the real
files (`teaser-lanes.html` md5 `b76c6d41db7b8c272e1472ee89270257`, `tests/e2e.mjs` md5 `d4a925a22069bd6991b5b3afd43c8879`,
both identical on the device and in the cloud sandbox). The repo copy of `teaser-lanes.html` was NOT modified by this
ruling — every experiment ran on a scratch copy in the cloud sandbox; Execute applies the changes below.

The executor was right to stop on both: they are real contradictions in the brief, not misreadings.

---

## Ruling 1 — served-mode missing-file handling: mirror `openKit`, only `manifest.json` is hard-required

### Decision
Served mode is the file:// path with a different way of collecting `entries`, not a different tolerance model. So:

| fetch | on 404 | reason |
|---|---|---|
| `<dir>/manifest.json` | **hard** — throw, `loadServedKit` shows `⚠ could not fetch <dir>/: <dir>/manifest.json: 404` | without it there is no track list; the file:// equivalent ("That folder has no manifest.json…") is also a hard stop, and §7.3's `kit-missing` check expects exactly this text |
| `<dir>/<manifest.video.file>` | **soft** — leave the entry out, let `openKit` handle it | `openKit` line 1286 already has the one and only message for this case: `Kit is missing <video> — run prep_kit.py again.` Throwing in `fetchKitEntries` would create a second, differently-worded error for the same condition. Result is still a hard stop (lanes not loaded), just phrased identically to file:// |
| each `<dir>/<track.file>` | **soft** — leave the entry out, let `openKit` handle it | `openKit` line 1318: `if (!f) { l.status = "missing"; … continue; }` — the lane gets status `"missing"`, its M/S/+ are disabled, load continues, and the kit still reaches `ready · N lanes`. This is exactly what §7.3's synthetic kit (no `b-drums.wav`) needs |
| any non-ok status that is not 404 (403, 500, …), or a network failure | **hard** — throw (unchanged) | that is a server problem, not "the folder lacks this file" |

No new status value, no new field, no change to `openKit`, `unloadKit`, `loadServedKit` or `initServed`.
`openKit` decides "missing" purely by `byName.get(l.file)` being undefined, so omitting the entry is the exact
equivalent of the file not being in the picked folder.

### The change (replace the whole `fetchKitEntries` function, `teaser-lanes.html` lines 1382–1394, with this)
```js
  async function fetchKitEntries(dir, onProgress) {
    // Only manifest.json is hard-required. A 404 on any other kit file leaves that file out of `entries`, so openKit
    // treats it exactly like a picked folder that lacks the file (video -> its "Kit is missing" error, track -> lane status "missing").
    const get = async (name, optional) => {
      const r = await fetch(dir + "/" + name, { cache: "no-store" });
      if (r.ok) return r;
      if (optional && r.status === 404) return null;
      throw new Error(dir + "/" + name + ": " + r.status);
    };
    const manifestText = await (await get("manifest.json", false)).text();
    const manifest = C.parseManifest(manifestText);
    const files = C.kitFiles(manifest), entries = [{ file: new File([manifestText], "manifest.json"), path: dir + "/manifest.json" }];
    let k = 0;
    for (const name of files) {
      onProgress(++k, files.length, name);
      const r = await get(name, true);
      if (!r) continue;
      const blob = await r.blob();
      entries.push({ file: new File([blob], name), path: dir + "/" + name });
    }
    return entries;
  }
```
(Rule 6 check: no `http://`, no `<script src`, no `<link` in that text.)

### How a missing lane shows up (existing code, quoted — the served test asserts these literals)
- Status line: `S.base = "ready · " + (N - 1) + " lanes"` with `N = manifest.tracks.length + 1` (line 1345) — **a missing
  lane is counted like any other**; the ready line carries no note about it. Synthetic kit → `ready · 5 lanes`.
- Lane header src box (line 1057): `box.textContent = "missing: " + l.file` → `missing: b-drums.wav`, class `lane-src warn`.
- Lane canvas (line 983): `"missing: " + l.file` drawn in the lane, dashed outline clips.
- Copy list (line 387): the clip line ends with `file missing` inside the parentheses, e.g. the `e2e.mjs` literal
  `b-drums: source 0.000-1.000 s -> render 3.000-4.000 s (gain 1, muted, file missing)`.
- `.lane[data-lane="b-drums"]` has no `data-samples` (e2e.mjs line 122 expects `b-drums:` empty).

### Verified in the sandbox (scratch copy + the patched function above, synthetic kit served by a node static server)
```
status: ready · 5 lanes
kit-pick hidden/value/options: [ false, 'kit-syn', 2, '1' ]
kit-info: kit: teaser-lanes · video.webm
b-drums lane-src: missing: b-drums.wav
samples: logo:88200,bed:529200,a-strings:529200,b-drums:,e5:132300
after kit-missing: ⚠ could not fetch kit-missing/: kit-missing/manifest.json: 404
after kit-novideo: ⚠ Kit is missing video.webm — run prep_kit.py again.
back to kit-syn: ready · 5 lanes localStorage: kit-syn
```

### Consequence for `tests/e2e-served.mjs` (§7.3) — two amendments, both found while verifying, both mandatory
1. **Chromium logs a console error for every 404, including `favicon.ico`.** Measured: with the synthetic kit served,
   `page.on("console")` receives `Failed to load resource: the server responded with a status of 404 (Not Found)` for
   `/favicon.ico` (every http page load — never happens under file://), `/kit-syn/b-drums.wav` (deliberate) and
   `/kit-missing/manifest.json` (deliberate). A literal "zero console errors" check can therefore never pass in served
   mode. Rule: (a) the test's static server answers `GET /favicon.ico` with `204` and an empty body; (b) the served
   context's console check is: `pageerror` count must be 0, and every console message of type `error` must satisfy
   `m.text().startsWith("Failed to load resource: the server responded with a status of 404")` AND
   `m.location().url` ends with `/kit-syn/b-drums.wav` or `/kit-missing/manifest.json`; any other error message
   fails the check. Log the allowed 404s to the report so they stay visible. The file:// context keeps the plain
   zero-console-errors check exactly as `e2e.mjs` does it.
2. The static server must answer a missing file with **`404`** (not 403/500), or the tolerance path is not exercised.
Add these checks to the §7.3 list (after "status reaches `ready · 5 lanes`"): `.lane[data-lane="b-drums"] .lane-src`
text is `missing: b-drums.wav`; the lanes' `data-samples` join is `logo:88200,bed:529200,a-strings:529200,b-drums:,e5:132300`
(copy the helper `e2e.mjs` uses at line 122); the copy list's b-drums line is the `e2e.mjs` `EXPECTED_LIST` literal
quoted above (already implied by "default copy list equals EXPECTED_LIST"). Everything else in §7.3 stands.

Side observation (not part of this ruling, not to be changed this cycle): line 1344 `S.base = "ready · " + N - 1 + " lanes";`
evaluates to `NaN` and is immediately overwritten by line 1345; harmless dead line, pre-existing.

---

## Ruling 2 — `HOWTO[0]`: the verified shorter text

### Root cause, measured
`#howto` is `flex: 1 1 auto; min-height: 0; overflow: hidden` inside the left column; at 1440x900 its `clientHeight`
is **274 px** and the eight `<li>` lines sit at 12 px / line-height 1.3 (≈ 15.6 px per wrapped line, text width 565 px).
The brief's 214-character `HOWTO[0]` wraps to **3 lines** (46.8 px) → `scrollHeight` 278 > 274 → `fitHowto()` hides
the full text. A 2-line entry (31.2 px) fits with ~11 px to spare; the 1-line original had ~27 px. The 2→3 line
boundary is at ≈ 1130 px of unwrapped text (≈ 195 characters in the test's Chromium font); the brief's text measures
1146 px. So this is a 4-pixel overflow, and shortening by one wrapped line is the correct fix — the CSS and
`fitHowto()` are behaving as designed. **Flagged alternative, NOT chosen:** giving `#howto` more room (a smaller
video panel or clip editor at 1440 wide) would change `e2e.mjs`'s measured layout numbers and is its own cycle.

### The text (replace `HOWTO[0]`, `teaser-lanes.html` line 674, with exactly this)
```js
    "Open a kit folder: kit-teaser-full (teaser-full v1, the default) or kit (teaser v9), both made by prep_kit.py. With serve.ps1 the default loads by itself; the header menu switches kits.",
```
185 characters; unwrapped width 1068 px against the 1130 px two-line limit (≈ 10 characters of slack). All three
facts survive verbatim: kit-teaser-full is the default; kit/ is teaser v9; served via serve.ps1 = auto-load of the
default + header menu switches kits. Still starts `"Open a kit folder: kit-teaser-full` (test.mjs §20 regex), array
stays 8 entries, entries 7–8 untouched. Do not "improve" the wording: three of the four variants I measured with a
few more words wrapped to 3 lines (e.g. "…both made by prep_kit.py. Served by serve.ps1, the default kit loads by
itself and the header menu switches kits." = 198 chars / 1146 px → FAIL).

### Evidence — real runs in the cloud sandbox on a scratch copy of the repo's `teaser-lanes.html` with only that line changed
Baseline (repo text, before): `FAIL 1440x900 how-to full text shown iff the viewport is at least 1440x900  [shown: false]` — reproduced.

`node tests/synthetic-kit.mjs tests/out/synkit && node tests/e2e.mjs tests/out/synkit tests/out/e2e` (exit 0):
```
synthetic kit written to tests/out/synkit (5 tracks, 7 clips, b-drums.wav deliberately absent)
     measured 1440x900: video panel 581x327, lane height 96, lane canvas width 702, how-to full text shown: true
PASS 1440x900 how-to full text shown iff the viewport is at least 1440x900  [shown: true]
     measured 1440x810: video panel 581x327, lane height 96, lane canvas width 702, how-to full text shown: false
PASS 1440x810 how-to full text shown iff the viewport is at least 1440x900  [shown: false]
     measured 1920x1080: video panel 736x414, lane height 96, lane canvas width 1027, how-to full text shown: true
PASS 1920x1080 how-to full text shown iff the viewport is at least 1440x900  [shown: true]
     measured 1920x990: video panel 736x414, lane height 96, lane canvas width 1027, how-to full text shown: true
PASS 1920x990 how-to full text shown iff the viewport is at least 1440x900  [shown: true]
     measured 1000x800: video panel 976x549, lane height 40, lane canvas width 868, how-to full text shown: false
PASS 1000x800 how-to full text shown iff the viewport is at least 1440x900  [shown: false]
PASS 1100x800 zero console errors and page errors

ALL PASS: 390/390 checks
```
Same scratch copy: `node teaser-lanes.test.mjs` → `ALL PASS: 231/231 passed` (incl. `pass html: HOWTO entry 1 names both kits`);
`node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` → `ANCHOR MISSING: 0   SURVIVED (uncaught): 0   total mutants: 20`.

---

## What Execute does now (in this order)
1. `teaser-lanes.html`: replace line 674 (Ruling 2 text) and the `fetchKitEntries` function (Ruling 1 code). Nothing else in the HTML.
2. Write `tests/e2e-served.mjs` per BRIEF §7.3 + the two amendments and three extra checks in Ruling 1.
3. Re-run BRIEF §8 rows 5, 6, 7, 8 (cloud) and row 5 (device). Expected: `231/231` (not 233 — OPEN-ITEMS #3 stands),
   `390/390`, 20/20 mutants, e2e-served all PASS. Rows 9–10 unaffected (no served code runs under file://) but cheap to re-run.
4. `README.md` (tool): fill the `e2e-served.mjs` row; add one line under "Use it (b)": "a kit file the server cannot find
   is shown as a missing lane, like a folder that lacks it; only manifest.json is required."
5. Append to `EXECUTOR-REPORT-v1.md` a "RESUMED after RULING-v1" section with the four counts, and strike the two
   STOPPED items in `OPEN-ITEMS.md` with a pointer to this file. OPEN-ITEMS #3 (231 vs 233) is a brief typo — leave it as noted.
