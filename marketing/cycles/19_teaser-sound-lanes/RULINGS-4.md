# RULINGS-4 — open/save arrangement, inspect fixes (Plan tier, Fable, fresh context, 2026-09-25)

Scope: the 12 defects of `INSPECT-REPORT-open-arrangement.md` (FAIL: 1 blocker, 1 major, 5 minor, 5 cosmetic). Read: that report in full, `BRIEF-open-arrangement.md` (with Ruling 3 applied), RULINGS-1/2/3, `EXECUTOR-REPORT-open-arrangement.md`. Spot-checked on the live page `tools/teaser-lanes/teaser-lanes.html` (md5 `bfb1b7e1c4966273b7bb2f145a6e64dc`, 1553 lines; all line numbers below are from this file): `buildLanesDom` 1150–1181, `laneOf` 697, `applyAudible` 716–730, `renderStatus` 679–692, `changed()` 1079–1089, `unloadKit` 1213–1229, `openArrangementFile` 1357–1386, `restoreSerialized` 1387–1395, `undoLast` 1412–1417, the drop handler 1460–1469, the wiring 1497–1503, the Reset handler 1504–1513, `parseArrangement` 570–579, `applyArrangement` 580–589, HOWTO 648–658, `#howto` CSS 79–82, `fitHowto` 1196–1200; `tests/mutants-open.mjs` (O11 = `if (t[0] === "{") {` → `if (t[0] === "{" || t[0] === "[") {`); `tests/e2e.mjs` 40 (viewports), 171–172 (`howtoShown` is only logged), 304–437 (blocks C–I), 439–459 (robustness); `teaser-lanes.test.mjs` 401, 531.
Measured myself (cloud Chromium 1194, DejaVu Sans, synthetic kit, probe `howto-probe*.mjs` in the session scratchpad): the how-to box and every candidate line set at 1440x900, 1920x1080, 1920x990, 1440x810, 1536x864, 1366x768, 1100x800, 1280x720 — numbers in ruling 2.
RULINGS-2 is still NOT applied to the page. Every fix below is written so that it stays valid when RULINGS-2 lands; the merge points are in §"Merge points for the Ruling-2 executor".

Verdict on the inspect report: every defect confirmed, including the two claims against the executor (the O11 "equivalent" ACCEPT is false — see ruling 6; the how-to fallback was visible in the executor's own `arr-1440x900.png` and the brief §9 asked for it to be reported, yet the report says "Deviations: None" — see ruling 2). The executor's numbers were otherwise right.

## Rulings

### 1. BLOCKER — M and S dead after Open, Undo and Reset — FIX (general fix to `buildLanesDom`, regions widened)

**Root cause (exact):** `buildLanesDom` (1150) runs once per kit load and iterates `for (const l of S.st.lanes)` (1154). The two handlers it wires at **1176–1177**

```
      bM.onclick = () => { l.muted = !l.muted; bM.blur(); applyAudible(); persist(); };
      bS.onclick = () => { l.solo = !l.solo; bS.blur(); applyAudible(); persist(); };
```

close over `l`, the **lane object of the state that existed at load time**. `openArrangementFile` (1382 `S.st = fresh`), `restoreSerialized` (1392 `S.st = r.state`) and the Reset handler (1510 `S.st = fresh`) all replace `S.st` with a state whose `lanes` are **new objects** (`restoreState`/`buildState` build them from the manifest). After that, a click flips `muted`/`solo` on the orphaned old object; `applyAudible()` (716) reads `S.st.lanes` — the new objects — and finds nothing changed, so the class, the aria-pressed, the gain node and the copy list all stay as they were. It is not stale DOM (the rows and buttons are the same nodes, looked up by id through `S.lanes[l.id]`), not lost listeners, and not a re-render problem: it is one captured object reference. `+` (`addClip(l.id)`) and the canvas (`onCanvasClick(e, cv, l.id)`) pass the **id** and look the lane up live, which is why they kept working. Pre-existing: Reset has replaced `S.st` the same way since cycle 19 landed; nobody clicked M after Reset in a test.

**Fix (smallest, robust):** look the lane up by id at click time with the helper that already exists (`laneOf`, 697: `const laneOf = id => S.st.lanes.find(l => l.id === id);`). Replace lines 1176–1177 by exactly:

```
      bM.onclick = () => { const L = laneOf(l.id); if (!L) return; L.muted = !L.muted; bM.blur(); applyAudible(); changed(); renderStatus(); };
      bS.onclick = () => { const L = laneOf(l.id); if (!L) return; L.solo = !L.solo; bS.blur(); applyAudible(); persist(); };
```

(`changed()` instead of `persist()` on M is defect 3, ruling 3. `renderStatus()` after it makes the Undo button disappear at once — `changed()` does not render the status and the M handler has no `say`. S keeps `persist()`: solo is listening-only and must not eat the Undo.) Rejected alternatives: rebuilding the lane DOM on every state swap (would drop the decoded buffers, waveform bins and gain nodes held in `S.lanes`, and re-decode 42 MB), event delegation on `#lanes` (bigger change for the same effect), rewriting the swap sites to mutate the old lane objects in place (three sites, fragile).

**Regions widened:** the executor may edit `buildLanesDom` lines 1176–1177 only (the two handler lines; nothing else in 1150–1181), plus the anchors listed in the checklist. This is a general fix, not part of the open-arrangement §3 regions; BRIEF §3 says so now «Ruling 4».

### 2. MAJOR — the 9th how-to line hides the how-to at 1440x900 and 1920x990 — FIX (back to 8 entries; the arrangement text goes into the Copy list line; `howtoShown` becomes a hard check)

Measured (box `clientHeight` / content needed, cloud Chromium): the how-to box is **274 px at 1440x900**, 277 at 1920x990, 367 at 1920x1080. One visual row is 15.6 px + 1 px margin. The pre-feature 8 entries wrap to 1/2/2/2/2/2/2/3 = **16 rows = 257 px** at 1440x900 — that is the ceiling; a 17th row overflows. The new 8th entry (283 chars) wraps to **4 rows**, so 20 rows / 326 px: no shortening of that line alone can fit (even a 1-row version makes 17 rows). Also measured: RULINGS-2's rewritten line 3 (230 chars) wraps to **3 rows at 1440x900**, so the pre-feature set + Ruling 2 would ALSO overflow (278 > 274) — the Ruling-2 executor would have hit the same wall. Both are solved together below.

Decision: **the how-to stays at 8 entries**. Entry 7 (Copy list) is rewritten to name Save/Open/Undo in 2 rows, and entry 8 (Lanes A/B) is shortened from 3 rows to 2 so that Ruling 2's 3-row line 3 fits later. Exact texts (measured 2 rows each at 1440x900 with the last row 83 % / 85 % full; 2 rows at 1536x864; 2 rows at 1920):

- entry 7: `Copy list gives one line per clip to paste into chat. Save arrangement keeps your clips and mutes in a small file; Open arrangement brings them back, Undo undoes that.`
- entry 8: `Lanes A (strings + other) and B (piano + drums + bass + other) split the same bed: unmute one split OR the bed, not both. Play is right to about a frame; stepping is exact.`
- the current entry 8 (`Save arrangement downloads …`) is removed; entries 1–6 unchanged.

Measured result: 1440x900 → rows 1/2/2/2/2/2/2/2 = 15 rows, 241 px in 274 (fits, one spare row); with Ruling 2's line 3 → 1/2/3/2/2/2/2/2 = 257 px (fits, same margin as before the feature); 1920x990 and 1920x1080 fit with room; 1440x810, 1100x800 and 1000x800 keep the "press ? for the how-to" fallback as RULINGS-1 §2.9 accepted. "Nothing is written to disk" leaves the how-to (it is now false, defect 9) and "remembered in this browser" too — the README keeps both facts (step 6), and the Reset button says the same thing on screen.
`howtoShown` is no longer just logged: `tests/e2e.mjs` asserts it (true at 1440x900, 1920x1080, 1920x990; false at 1440x810 and 1000x800), so it cannot be missed again. The unit hygiene case goes to **8 entries**. Note for the record: BRIEF §9 asked for the flip to be reported; the executor's report says "Deviations: None" although its own `arr-1440x900.png` shows the fallback. The hard check replaces the reporting rule.

### 3. MINOR — M does not clear Undo — FIX
Covered by ruling 1 (`changed(); renderStatus();` in the M handler). Mutants O14 (M back to `persist()`) and O15 (`changed()` no longer clears `S.undo`) must die in e2e.

### 4. MINOR — a stale Undo survives a kit unload — FIX
`unloadKit` line 1216 becomes `S.loaded = false; S.st = null; S.manifest = null; S.restored = false; S.undo = null;`. Every unload path ends in a `say(...)`, which re-renders the status and hides the button. e2e: open `syn.txt` (Undo visible), then the existing no-manifest folder → `#btn-undo` hidden. Mutant O17.

### 5. MINOR — a dropped single file is routed by extension and can unload the kit — FIX
The page decides by content everywhere else; the drop should too. Drop handler 1462–1463 become:
```
      const fl = e.dataTransfer.files, it0 = e.dataTransfer.items && e.dataTransfer.items[0];
      const en0 = it0 && it0.webkitGetAsEntry ? it0.webkitGetAsEntry() : null;
      if (fl && fl.length === 1 && !(en0 && en0.isDirectory)) {
```
(the `if (!S.loaded) …`, `await openArrangementFile(fl[0]); return;` lines stay). One dropped **file** of any name → arrangement path (a wrong file gives `could not open <name>: …` and the kit stays); one dropped **folder** (`isDirectory`) or several items → kit path, unchanged. On the synthetic Playwright drop `webkitGetAsEntry()` is null, so it takes the file path as today. e2e: a synthetic drop of the `syn.txt` bytes named `notes.md` → `opened notes.md: 5 clips (1 dropped)` and still 5 lanes. Mutant O18. Only Nathan can confirm a real Explorer folder drop still opens the kit (it is on his list already).

### 6. MINOR — the O11 "equivalent mutant" ACCEPT is wrong — FIX (test gap)
Confirmed from the code: `parseArrangement` (570–579) sends only a leading `{` to JSON; `[1,2]` goes to the text parser and throws `no clip lines found`; under O11 it throws `not a JSON object`, and a text file that starts with `[` (`[my notes]` then clip lines) stops opening. The unit test at line 401 calls `parseArrangementJson("[1,2]")` directly, which is why O11 survived. Not equivalent. Fix: unit case 13 (below); O11 loses its `acceptNote` and must be killed by the unit suite; the executor report's mutation row is corrected in the appended section (not rewritten in place).

### 7. MINOR — I16 and I11 test gaps — FIX
- I16: e2e F also asserts the `created` value matches `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$` and its date part equals the browser's local date of the run. Mutant O16.
- I11: unit case 14: a line with no render end is not a clip line (`null`).

### 8. COSMETIC — odd notes on hand-edited JSON — FIX (two one-liners)
- `applyArrangement` 583: compare the video only when `Number.isFinite(arr.video.fps) && Number.isFinite(arr.video.duration_s)`; otherwise no note (`"video": {}` → `""`). Keep the identifier `arr.video` so mutant O7's anchor still matches. Unit case 15; mutant O19.
- `parseArrangementJson` 543: `"unknown arrangement version " + JSON.stringify(obj.version) + " (…)"` → `unknown arrangement version "1" (this page reads version 1)`; `version 2` still prints `2`. Unit case 16; mutant O20.

### 9. COSMETIC — wording — FIX the two false sentences, ACCEPT the rest
- FIX tool README line 5 → `It plays live and writes no audio; what comes out is a plain-words clip list you paste into chat, plus a small arrangement file if you press Save arrangement. Chrome or Edge only.`
- FIX README step 6 → `6. **Copy list** gives one line per clip; paste it into chat. Clips and mutes are remembered in this browser; **Reset to defaults** restores today's teaser sound. Nothing is written to disk except the file **Save arrangement** downloads (step 8).`
- How-to line 7: "Nothing is written to disk" is gone with ruling 2.
- ACCEPT `(0 dropped)`: the count is 0 in every real case, the README explains it ("clips on a lane the kit does not have are left out and counted"), and renaming it touches a dozen test literals for no behaviour change. Saying *which* clip was dropped needs `restoreState` to return reasons — a Ruling-2-owned region; not now.
- ACCEPT the `not valid JSON (Unterminated string …)` detail: rare, and the technical part is what fixes the file.

### 10. COSMETIC — Undo restores clips and mutes, not solo or the selection — ACCEPT
Solo is listening-only and never stored (`serializeState` 451–455 writes clips and mutes only); deselection is what the brief asks. Nothing to do.

### 11. COSMETIC — focus stays on Open/Save/Undo, Enter repeats the action — FIX
Wiring 1498, 1500, 1501 become
```
    $("btn-open-arr").onclick = () => { $("btn-open-arr").blur(); $("arr-input").click(); };
    $("btn-save-arr").onclick = () => { $("btn-save-arr").blur(); saveArrangement(); };
    $("btn-undo").onclick = () => { $("btn-undo").blur(); undoLast(); };
```
(the same `blur()` the M/S/+ buttons already do). e2e: after the Save click and after the Undo click, `document.activeElement.id` is not that button. Copy list's identical behaviour is pre-existing and harmless (it only re-opens the panel); left alone.

### 12. COSMETIC — `created` time zone in `arrangement_v1.json`; one wrong line number — ACCEPT
The `created` stamp is a label that nothing compares; changing it would change the fixture, its md5 `ddc156dd…` and the round-trip literal for a 2-hour cosmetic. Files Nathan saves from the page carry his local time, as specified. The merge-note slip (`undo: null` is at 667, not 663) is superseded: the appended report section lists the final line numbers after this fix.

## Fix instructions for the executor (ordered; self-contained; stop only on a failing expected output)

Rules unchanged: BRIEF §1 (no deletes; only the three allowed folders; LF/no BOM; git read-only; author in the cloud, land with `device_commit_files`, md5 PC == cloud for every landed file; device_bash ≤ 120 s; never re-type file content from tool output; do not ask Nathan). Re-verify every anchor with `grep -n`/`sed -n` before editing; ±10 lines of clearly the same code → proceed and note the real line; otherwise STOP. Baseline: `teaser-lanes.html` md5 `bfb1b7e1c4966273b7bb2f145a6e64dc`, 1553 lines. Tool folder in the VM: `cd "$HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes"`.

1. **Page — the blocker (ruling 1).** Lines 1176–1177 of `buildLanesDom` → the two exact lines of ruling 1. Confirm `laneOf` exists at ≈ 697. Nothing else in 1150–1181 changes.
2. **Page — unload (ruling 4).** Line 1216: append `S.undo = null;` after `S.restored = false;` (one line, exact text in ruling 4).
3. **Page — drop routing (ruling 5).** Lines 1462–1463 → the three lines of ruling 5; the rest of the handler unchanged.
4. **Page — focus (ruling 11).** Lines 1498, 1500, 1501 → the three lines of ruling 11.
5. **Page — core one-liners (ruling 8).** Line 543: `obj.version` → `JSON.stringify(obj.version)` inside the message only. Line 583: add `Number.isFinite(arr.video.fps) && Number.isFinite(arr.video.duration_s) &&` after `typeof arr.video === "object" &&` (keep `arr.video`; keep the `0.0015` expression byte-identical for mutant O7).
6. **Page — how-to (ruling 2).** HOWTO array 648–658: delete line 656 (the `Save arrangement downloads …` entry), replace line 655 by the ruling-2 entry-7 text and line 657 by the ruling-2 entry-8 text (both as JSON-style double-quoted string literals with the trailing comma pattern of the array; 8 entries; `];` follows). Everything else in the array unchanged (line 651, entry 3, stays as is — Ruling 2 rewrites it later). Hygiene after steps 1–6: page < 160 KB, LF, no BOM, ids once each, no external URL.
7. **Unit tests (`teaser-lanes.test.mjs`).** Change line ≈ 531 `HOWTO has 9 entries` → `HOWTO has 8 entries` (expects 8) and add: entry 7 starts with `Copy list gives one line per clip` and contains `Save arrangement`, entry 8 starts with `Lanes A (`. Add cases (literals only):
   13. `parseArrangement("[1,2]")` throws containing `no clip lines found`; `parseArrangement("[my notes]\nbed: source 0.000-1.000 s -> render 0.000-1.000 s (gain 1)\n")` → `kind "text"`, `clips.length 1`, `clips[0].track "bed"`.
   14. `parseClipLine("bed: source 0.000-1.000 s -> render 0.000 s (gain 1)")` → `null`.
   15. `applyArrangement({clips: [], muted: {}, video: {}}, M).note === ""`; with `video: {name: "x.mp4"}` → `""`; with `video: {fps: 30, duration_s: 46}` → `made for a different video (?, 46.000 s)` (`M` = `parseManifest(manifest-real.json)`).
   16. `parseArrangementJson('{"format":"teaser-lanes-arrangement","version":"1","clips":[]}')` throws containing `unknown arrangement version "1"`; the existing `version 2` case still passes with `unknown arrangement version 2`.
   Run `node teaser-lanes.test.mjs` → `ALL PASS: <208 + N>/<208 + N>` (N ≈ 8; state it). Zero FAIL.
8. **`tests/e2e.mjs`.**
   a. Line ≈ 172 (after the `log("     measured …")`): `check(tag + " how-to full text shown iff the viewport is at least 1440x900", howtoShown === (W >= 1440 && H >= 900), "shown: " + howtoShown);` → true at 1440x900, 1920x1080, 1920x990; false at 1440x810, 1000x800.
   b. Block F (≈ 353–378): after `savedText` is read, `const cr = /"created": "([^"]*)"/.exec(savedText)[1]; const today = await page.evaluate(() => { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); });` and `check(tag + " save: created is a local YYYY-MM-DD HH:MM of today", /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cr) && cr.slice(0, 10) === today, cr);` and `check(tag + " save: focus left the Save button", (await page.evaluate(() => document.activeElement && document.activeElement.id)) !== "btn-save-arr");`.
   c. Block D (≈ 328): after the Undo click, add `check(tag + " undo: focus left the Undo button", (await page.evaluate(() => document.activeElement && document.activeElement.id)) !== "btn-undo");`.
   d. New block **R4** right after block I's `Reset after an opened arrangement: back to 7` (≈ 437) and before `// folder without a manifest` (≈ 439). State there: 7 clips, a-strings muted, bed unmuted, Undo hidden. Checks, in this order (each `check(tag + " R4: …")`):
      1. click `.lane[data-lane="bed"] .b-mute` → bed class contains `muted` and its `.b-mute` aria-pressed `"true"` ("M after Reset works"); click again → class gone.
      2. click `.lane[data-lane="e5"] .b-solo` → aria-pressed `"true"` and bed lane class contains `silent` ("S after Reset works"); click again → `"false"`, `silent` gone.
      3. `setInputFiles("#arr-input", SYN_TXT)`, wait for `opened syn.txt` → `data-clips "5"`, `#btn-undo` visible.
      4. click S on e5 → aria-pressed `"true"` AND `#btn-undo` still visible ("S after Open works; S keeps Undo"); click again → `"false"`.
      5. click M on a-strings → a-strings class contains `muted` AND `#btn-undo` hidden ("M after Open works; M clears Undo"); click again → class gone.
      6. `setInputFiles("#arr-input", SYN_TXT)` again → `#btn-undo` visible; click `#btn-undo` → status contains `back to the clips before opening syn.txt`, `data-clips "5"`, `#btn-undo` hidden.
      7. click M on bed → bed class does NOT contain `muted` (syn had it muted; "M after Undo works"); click again → contains `muted` (state back to syn).
      8. `dispatchArrDrop(page, "#main", SYN_TXT, "notes.md")` → wait for `opened notes.md` (≤ 5 s) → status contains `opened notes.md: 5 clips (1 dropped)` and `.lane` count 5 ("a dropped file of any name opens as an arrangement, the kit stays"). If `dataTransfer.files` is empty on the synthetic drop, log `drop not testable in Playwright` as block E does, no FAIL. `#btn-undo` is visible now (needed by the next block).
   e. After the existing `folder without manifest.json: visible error` check (≈ 444): `check(tag + " R4: a stale Undo dies with the kit", await page.locator("#btn-undo").isHidden());`.
   Run `node tests/synthetic-kit.mjs <dir> && node tests/e2e.mjs <dir> <out>` → `ALL PASS: <365 + N>` (N ≈ 22; state it), zero console/page errors, and the log lines `how-to full text shown: true` at 1440x900, 1920x1080, 1920x990. LOOK at the new `arr-1440x900.png`: the how-to shows eight numbered lines, the 7th starts "Copy list gives one line per clip" — not "press ? for the how-to". LOOK at `help-1440x900.png`: the `?` panel lists the same eight entries. State both in the report.
9. **`tests/e2e-real.mjs`.** After `openArr(… arrangement_v1.json …)` (≈ 133) and before the Save (≈ 135): click M on e5 → `.lane[data-lane="e5"]` class contains `muted`, `#btn-undo` hidden; click `#btn-copy` → the copy list line for e5 equals `e5: source 0.000-8.500 s -> render 24.300-32.800 s (gain 0.3, fade in 2 s, muted)` (compare after `stripCut`), Escape; click M on e5 again → class gone. Click S on bed → `.lane[data-lane="bed"] .b-solo` aria-pressed `"true"` and `.lane[data-lane="e5"]` class contains `silent`; click S again → `"false"`. (State is then exactly as before, so the Save checks that follow are unchanged.) Re-stage the real kit as before (9 wavs + manifest patched to the webm, one call) and run → `ALL PASS: <81 + N>` (N ≈ 7; state it).
10. **`tests/mutants-open.mjs`.** New signature `node tests/mutants-open.mjs <toolDir> <outDir> <synKitDir> [ids]` (`synKitDir` = a `tests/synthetic-kit.mjs` output; `ids` = optional comma-separated subset, e.g. `O12,O13`). Per mutant: as today, then if the unit suite still passes, copy `tests/e2e.mjs` into `<outDir>/oNN/tests/` (fixtures are already there) and run `node tests/e2e.mjs <synKitDir> <outDir>/oNN/e2e` with cwd `<outDir>/oNN`; non-zero exit or no `ALL PASS` → `killed (e2e)`; else `SURVIVED`. Unit kills print `killed (unit)`. Remove O11's `acceptNote` (its `what` loses "(may be equivalent)"). Add, with exact `find` strings taken from the edited page (each must be unique):
    - O12 `M acts on the stale lane object (blocker)`: `L.muted = !L.muted;` → `l.muted = !l.muted;`
    - O13 `S acts on the stale lane object (blocker)`: `L.solo = !L.solo;` → `l.solo = !l.solo;`
    - O14 `M does not clear Undo`: `applyAudible(); changed(); renderStatus(); };` → `applyAudible(); persist(); renderStatus(); };`
    - O15 `changed() no longer clears S.undo`: `function changed(restartPlay) {\n    S.undo = null;\n` → `function changed(restartPlay) {\n`
    - O16 `Save writes an empty created stamp`: `{ created: C.arrangementStamp(now), note: "" }` → `{ created: "", note: "" }`
    - O17 `unloadKit keeps a stale Undo`: `S.restored = false; S.undo = null;` → `S.restored = false;`
    - O18 `drop routes by extension again`: `if (fl && fl.length === 1 && !(en0 && en0.isDirectory)) {` → `if (fl && fl.length === 1 && /\.(json|txt)$/i.test(fl[0].name)) {`
    - O19 `video block without numbers still compared`: `Number.isFinite(arr.video.fps) && Number.isFinite(arr.video.duration_s) && ` → `` (empty)
    - O20 `version message without quotes`: `JSON.stringify(obj.version)` → `obj.version`
    Expected table: O1–O11, O19, O20 `killed (unit)`; O12–O18 `killed (e2e)`; `ANCHOR MISSING: 0   SURVIVED (uncaught): 0   total mutants: 20`. Run with `outDir` under the tool folder (`tests/out/mut`) so the copied `e2e.mjs` resolves `playwright` like the original; time one e2e run first and split the run with `ids` if the whole battery would pass 8 minutes in one call. Paste the table into the report.
11. **Docs.** Tool `README.md`: line 5 and step 6 → the ruling-9 texts; test-table row → `node tests/synthetic-kit.mjs tests/out/synkit && node tests/mutants-open.mjs . tests/out/mut tests/out/synkit`; the three counts. No README text about the how-to changes (the README never quoted it).
12. **Land + verify.** `device_commit_files` for `teaser-lanes.html`, `teaser-lanes.test.mjs`, `tests/e2e.mjs`, `tests/e2e-real.mjs`, `tests/mutants-open.mjs`, `README.md`; md5 PC == cloud for each (table). VM: `node teaser-lanes.test.mjs` → ALL PASS (same count as the cloud); `file`/BOM check on every changed file; av-align md5s still `0e08fc6c…`, `a0faf5b8…`, `c0b5d4a5…`; `arrangement_v1/arrangement_v1.json` and the fixtures untouched (`ddc156dd…`, `64d40cbf…`, `1e0fee35…` for the §4.1 literal in the test); `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → only the three allowed folders. Copy `arr-1440x900.png`, `real-arr-1440x900.png` and the three report logs to `cycles/19_teaser-sound-lanes/shots/` (overwrite).
13. **Report.** Append to `cycles/19_teaser-sound-lanes/EXECUTOR-REPORT-open-arrangement.md` a section `## Ruling 4 follow-up (2026-09-25)` with: the commands and counts of steps 7–10; the `how-to full text shown` value at each of the five viewports; the mutation table (20 rows) with the sentence "O11 is not equivalent (killed by unit case 13); the earlier ACCEPT was wrong"; the md5 table; the screenshots looked at and what they show; updated merge notes for the Ruling-2 executor with the final line numbers of: the HOWTO array, the M/S handlers, `changed()`, `unloadKit`, the drop condition, the wiring; the readout row. Do not rewrite earlier sections. "Deviations" must list anything that differs from this file, or say "none — and the how-to check is now a hard assertion".

## Merge points for the Ruling-2 executor (RULINGS-2 is still not applied)
- **Undo:** the M handler now calls `changed()` (ruling 8's "any other change clears it" holds for M by construction); `unloadKit` clears `S.undo`. Reuse both; do not add a second mechanism. Ruling 8's Reset undo sets `S.undo` AFTER `changed(true)` and then `say(...)`, exactly like `openArrangementFile`.
- **How-to:** the array has **8** entries and a hard `howtoShown` check at 1440x900 / 1920x990 / 1920x1080. Ruling 2's line-3 rewrite (230 chars, 3 rows at 1440x900) fits with the Ruling-4 entries 7 and 8 (measured 257 px in 274). Do not lengthen any other entry; if the check fails, shorten line 3, not the check.
- **README step 6:** use the Ruling-4 wording (ruling 9) as the base for Ruling 2's `muted` sentence; "Nothing is written to disk" must stay qualified by "except the file Save arrangement downloads".
- **`applyArrangement` / `parseArrangementJson`** are Ruling-4-touched core lines; Ruling 2 does not touch them.
- **Mutation batteries:** `tests/mutants-open.mjs` (this feature, 20 mutants, unit + e2e) and Ruling 2's `tests/mutants/run.py` coexist; when Ruling 2 changes a line that an O-mutant anchors on (`changed()`, the drop handler, `unloadKit`), update that mutant's `find` string in the same step.

## Decisions taken for Nathan (plain words)
- **M and S work again after Open, Undo and Reset.** The buttons were still talking to the lanes from before the kit was swapped; they now look the lane up when you click. This was an old bug (Reset had it too), fixed for good, not just for Open.
- **Pressing M counts as a change**, so the Undo button disappears when you mute or unmute after opening a file (S, which is only for listening, keeps Undo).
- **The how-to stays eight lines** so it fits on a 1440x900 laptop screen. The Copy-list line now also says what Save arrangement, Open arrangement and Undo do, in one sentence; the Lanes A/B line is shorter. The `?` panel shows the same eight lines.
- **Dropping any single file on the page opens it as an arrangement**; a wrongly named file just says it could not be opened, and your lanes stay. Dropping a folder still opens a kit.
- **Undo disappears when the kit is unloaded**, so it can never point at clips that are gone.
- **Enter no longer repeats Open, Save or Undo** after you click them.
- Small message fixes for hand-edited files ("made for a different video (?, NaN.NaN s)" is gone; a version written as text is shown in quotes). The README no longer says "nothing is written to disk" without mentioning Save arrangement.
- Left as is: "0 dropped" in the status line (it means nothing was left out), the technical detail after "not valid JSON", Undo not restoring solo or the selected clip (solo is never saved), and the 21:49 (UTC) time stamp inside `arrangement_v1.json`.

## Brief edits made (each tagged «Ruling 4, 2026-09-25» in BRIEF-open-arrangement.md)
Intro "Read first" (RULINGS-4 added; it wins where the two differ); §3 HOWTO row and a new row block for the widened regions (`buildLanesDom` 1176–1177, `unloadKit` 1216, drop 1462–1463, wiring 1498/1500/1501, `parseArrangementJson` 543, `applyArrangement` 583), plus the "Nothing else in the page changes" line; §4.3 drop condition; §4.4 M/S and unloadKit; §4.5 HOWTO (8 entries, the two texts); §5.12 (8 entries) and the new unit cases 13–16 pointer; §6.4 O11 (not equivalent) and the harness signature; §7 README wording; §9 HOWTO row; §12 how-to bullet.

| tier | model | tokens | outcome |
|---|---|---|---|
| Plan (ruling 4) | Fable 5.1 | ≈ 95k | 12 rulings (9 FIX, 3 ACCEPT); blocker root-caused to the captured `l` at `buildLanesDom` 1176–1177; how-to fix measured in Chromium (8 entries fit at 1440x900 with and without Ruling 2's line 3); brief edited in place |
