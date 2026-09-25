# INSPECT REPORT 2: open / save arrangement, re-inspection after RULINGS-4

Inspect tier, Opus 5.5, fresh context, 2026-09-25. I had no shared context with the planner or the executor. Read-only apart from this file: no commit, nothing deleted, no tool, brief, ruling or report file edited. My probes, mutants and screenshots are only in this session's cloud scratchpad. They are not landed.
Baseline: `INSPECT-REPORT-open-arrangement.md` (FAIL: 1 blocker, 1 major, 5 minor, 5 cosmetic), `RULINGS-4.md`, the Ruling-4-tagged `BRIEF-open-arrangement.md`, and the whole of `EXECUTOR-REPORT-open-arrangement.md`, including "Ruling 4 follow-up".

## Verdict: PASS with fixes

- **The blocker is gone, and I proved it on the audio graph, not just the buttons.** M and S work after Open, after Undo, after Reset, and after an Open → Undo → Reset chain. I checked 3 or 4 lanes after each one.
- **The major is gone.** At 1440x900, 1920x1080 and 1920x990 the how-to shows all 8 lines with no scrolling. I looked at every screenshot.
- Every number the executor gave reproduces exactly.
- New findings, none of them blocking:
  - 1 minor product defect. It is older than this feature, and neither the first inspection nor RULINGS-4 caught it.
  - 2 minor test gaps.
  - 1 cosmetic report inaccuracy.

## 1. Numbers reproduced (my own runs)

| suite | where | executor claim | my result |
|---|---|---|---|
| `node teaser-lanes.test.mjs` | cloud (node 22.22.2) and VM on the PC mount (node 22.23.2) | 218/218 | **ALL PASS: 218/218** in both |
| `node tests/synthetic-kit.mjs <d> && node tests/e2e.mjs <d> <o>` | cloud, Chromium 1194 | 390/390 | **ALL PASS: 390/390**, zero console or page errors, 25 s |
| `node tests/e2e-real.mjs <realkit> <o>` | cloud; my own copy of the 9 real wavs staged from the PC, `kit/manifest.json` (md5 `e1233d06…`) patched to `video.webm`, and my own VP9 webm (ffprobe: 30/1, 1428 frames, 47.600000 s) | 86/86 | **ALL PASS: 86/86** |
| `node tests/mutants-open.mjs . <o> <synkit>` | cloud | 20/20 killed | **20 killed** (O1–O11, O19, O20 by unit; O12–O18 by e2e), `ANCHOR MISSING: 0`, `SURVIVED: 0`, 2 min 25 s. See §4 for how O18 dies |

- My counts do not differ from the executor's anywhere.
- The landed logs `shots/open-arr-e2e-report.txt` and `open-arr-e2e-real-report.txt` equal my own logs line for line. The only differences are timing values and the Save timestamp. The executor's run was stamped `2026-09-25 01:48` UTC and mine `12:00`.
- `howtoShown` in my run: 1440x900 true, 1440x810 false, 1920x1080 true, 1920x990 true, 1000x800 false. These are hard assertions now, and all of them pass.

## 2. The blocker (M/S dead after Open, Undo and Reset): FIXED, proven on the audio graph

**Code.** `buildLanesDom` lines 1175–1176 of the live page (md5 `17ecbf82a94e34139207b4e961d8c82d`, 1553 lines):
```
bM.onclick = () => { const L = laneOf(l.id); if (!L) return; L.muted = !L.muted; bM.blur(); applyAudible(); changed(); renderStatus(); };
bS.onclick = () => { const L = laneOf(l.id); if (!L) return; L.solo = !L.solo; bS.blur(); applyAudible(); persist(); };
```
- Both handlers look the lane up live with `laneOf` (line 696: `S.st.lanes.find(l => l.id === id)`).
- The captured `l` is now used only for its `id`.
- `git diff HEAD` shows these two lines replacing exactly the HEAD lines 1033–1034 (`l.muted = !l.muted; … persist();`).

**Behaviour (my probe `probe1.mjs`, real kit, 1440x900).**
- **How I read the gains.** An init script wraps `BaseAudioContext.createGain` and `AudioNode.connect`. It records the 9 per-lane GainNodes, meaning the nodes connected to the master gain. After every click, the probe reads their `.gain.value`. The page never reports these values itself.
- **Which lanes I clicked after each event.**

| after | M on (each clicked twice) | S on |
|---|---|---|
| fresh load (control) | e5, bed, b-piano | e5 |
| Open `arrangement_v1.txt` | e5, a-strings, b-drums, logo | b-piano |
| Open json, then Undo | bed, a-other, b-bass | a-strings |
| Reset to defaults | logo, e5, b-other | bed |
| Open → Undo → Reset chain | b-piano, a-strings, e5 | b-drums |

- **What each M click had to do:**
  - flip the lane's `muted` class and `aria-pressed`;
  - flip **its own GainNode** between 1 and 0, and change no other lane's gain;
  - make the Copy-list lines of that lane gain or lose `, muted`;
  - store the change in localStorage;
  - after the second click, bring the lane back exactly.
- **What each S block had to do:**
  - Soloing gives only that lane gain 1, and every other lane 0.
  - A second solo keeps both soloed lanes audible.
  - Un-soloing restores every GainNode exactly.
- **Mute plus solo.** A muted lane that is then soloed is audible (gain 1, `C.audible` gives solo priority, unchanged since HEAD), and its muted flag stays on. Pressing M while it is soloed flips only the flag. After un-solo, the lane is muted and silent again, so solo does not eat the mute.
- **Consistency.** Before and after every block, every lane's GainNode value agrees with its `silent` class.
- **Result: 131 of 133 checks pass, with zero page errors.** The 2 failures are the new defect 1 below, and neither is about M or S.
- **Undo interplay.** M after Open hides Undo, and S after Open keeps Undo, as ruled. "Another Open" gives a one-step Undo back to the state before the second open.

## 3. The major (how-to hidden): FIXED. I looked at the screenshots myself

`probe2.mjs`, real kit, `arrangement_v1.txt` opened. For each size I measured the box of every `<li>` against the `#howto` box and the viewport. I did not rely on the page's `hidden` flag, and I then looked at each PNG.

| viewport | layout | what I measured | what I saw in the screenshot |
|---|---|---|---|
| 1440x900 | side | 8 `<li>` all inside the box. Box 593–868 (274 px), last line ends at 840, so 28 px spare. Rows 1/2/2/2/2/2/2/2. No page scroll | All eight numbered lines are readable under the clip editor. Line 7 reads "Copy list gives one line per clip to paste into chat. Save arrangement keeps your clips and mutes in a small file; Open arrangement brings them back, Undo undoes that." Line 8 is the shortened Lanes A/B sentence. Nothing is cut off. The status bar shows `opened arrangement_v1.txt: 13 clips (0 dropped)` with Reset to defaults and Undo |
| 1920x990 | side | 8 in the box (680–958), last line at 911. No scroll | All eight lines are visible, most of them on one line each. There is empty space below line 8 |
| 1920x1080 | side | 8 in the box (680–1048), last line at 911. No scroll | Same as 1920x990, with more empty space |
| 1100x800 | **side** (the page stacks only below 1100 px, so 1100x800 is the side-layout minimum, not stacked) | body hidden, "press ? for the how-to" shown. No page scroll | Shows the one-line "press ? for the how-to" under the editor. RULINGS-1 §2.9 and RULINGS-4 accept this. The four top-bar buttons are fully labelled, and the status bar and Undo are readable |

- The `?` panel at 1440x900 lists the same 8 entries in the same order (compared as text, and looked at).
- The executor's landed `shots/arr-1440x900.png` matches its description: all eight lines, `opened syn.txt: 5 clips (1 dropped)`, Reset and Undo.
- **Headroom.** My mutant N6 adds one sentence to entry 7 (about +1 row). It still fits at 1440x900 in the cloud's DejaVu Sans. The slack is about 1 to 2 rows, which is what the ruling claimed.
- **Also measured, and accepted.** At 1536x864 and 1366x768 the page shows the fallback. 1536x864 is what a 1920x1080 laptop at 125 % Windows scaling reports, so Nathan may see "press ? for the how-to" on his own screen. RULINGS-1 accepted this below a height of 900.

## 4. The mutation suite, checked for *why* each mutant dies

- O12–O17 each fail the specific check they were written for:
  - O12: 3 R4 M checks;
  - O13: 2 R4 S checks;
  - O14 and O15: "M after Open works; M clears Undo";
  - O16: the `created` check;
  - O17: "a stale Undo dies with the kit".
- **O18 dies by accident, not by a check.** Under O18 the `notes.md` drop takes the kit path, and the kit unloads. The R4 drop block then logs **"NOTE: drop not testable in Playwright (dataTransfer.files empty…)"**, which is false: block E proves that drops work in this Chromium. It then calls `setInputFiles("#arr-input", …)` on an unloaded page, and `waitForFunction` throws an uncaught timeout (`e2e.mjs:508`), so there is no report. The harness counts the crash as a kill. See defect 3.

## 5. My own mutants (15, independent of `mutants-open.mjs`)

**How I ran them.**
- Each mutant is one exact find→replace, checked to match exactly once, on a copy of the live page.
- Each goes through the unit suite first. If it survives, it goes to the synthetic e2e, and then to the real-kit e2e.
- My `probe1.mjs` runs as a separate fourth detector.

| id | bug | project suites | my probe |
|---|---|---|---|
| N1 | (a) the closure fix fully reverted (exact HEAD lines, the original blocker) | **killed** (e2e: R4 M/S after Reset, S after Open) | caught (M on e5 after Open: `false->false`, gain `1->1`) |
| N2 | (a') M captures the stale lane through an alias (`const L = l`) | **killed** (e2e: 3 R4 M checks) | caught |
| N3 | (b) M clears `S.undo` but never re-renders, so the button stays shown | **killed** (e2e R4 "M clears Undo") | caught |
| N4 | (c) Reset keeps the pending Undo, so Undo after Reset brings the pre-open clips back | **SURVIVED all three** | not distinctly caught (see defect 1) |
| N5 | (d) how-to back to 9 entries | **killed** (unit: HOWTO has 8 entries) | – |
| N6 | (d') entry 7 lengthened by one sentence, still 8 entries | survived (it still fits at 1440x900: an equivalent-in-effect mutant, recorded as a measure of the headroom) | – |
| N7 | (e) solo clears the lane's own mute flag | **SURVIVED all three** | caught (muted+soloed e5 lost its flag) |
| N8 | (e') mute wins over solo in `audible()` | **killed** (unit) | caught |
| N9 | (f) S clears Undo | **killed** (e2e "S keeps Undo") | caught |
| N10 | (g) M always toggles lane 0 | **killed** (e2e) | caught |
| N11 | (h) `restoreSerialized` (Undo) skips `applyAudible` | **killed** (e2e "undo: … a-strings muted again") | not caught (my probe checks after the next click) |
| N12 | (i) drop: a real Explorer *file* entry (`isFile`) goes down the kit path | survived. **Cannot be tested in Playwright**, because its synthetic drop has no `webkitGetAsEntry` entry. Only Nathan can verify this | – |
| N13 | (j) Open arrangement keeps keyboard focus | survived (the ruling asked for focus checks on Save and Undo only). Cosmetic | – |
| N14 | (k) M no longer persists (`changed()` replaced by `S.undo = null; renderStatus()`) | **SURVIVED all three** | caught (the stored state does not follow M) |
| N15 | (l) a failed open (corrupt file) also throws away a valid pending Undo | **SURVIVED all three** | – |

- **The four mutants the ruling was aimed at** are (a) the M/S closure, (b) M clearing Undo, (d) the how-to count, and the shape of (f). The project suites kill all four.
- **Real gaps** are N4, N7, N14 and N15, which survive the project suites (defect 2). N12 is a gap no headless test can close.

## 6. Defects

### 1. MINOR (product; older than this feature, missed by the first inspection and by RULINGS-4): after an Open, the Undo button stays visible but does nothing after +, Delete, Duplicate, a field edit, or Reset
- **What the brief says.** BRIEF §4.4: "Any later change (edit, +, Delete, M, Reset, another Open) clears the button". §12 item 6: "any later change hides the button".
- **What the code does.**
  - `addClip`, `duplicateSel`, `deleteSel` and `applyField` each call `say(...)` **before** `changed(true)`. The Reset handler does the same: `applyAudible(); say("back to today's teaser sound"); changed(true);`.
  - `changed()` sets `S.undo = null` but does not call `renderStatus()`.
  - So `#btn-undo` stays shown with nothing behind it. Ruling 1 fixed this for M only, by adding `renderStatus()` to the M handler.
- **Measured** (`probe3.mjs`, real kit; each row starts from a fresh Open that uses a unique file name):
```
M          clips 13 -> 13; Undo visible after: false
S          clips 13 -> 13; Undo visible after: true  -> clicked: "back to the clips before opening arr2.txt"   (correct: S keeps Undo)
+          clips 13 -> 14; Undo visible after: true  -> clicked: data-clips 14 -> 14, status "ready · 9 lanes"   (dead button)
Delete     clips 13 -> 12; Undo visible after: true  -> clicked: 12 -> 12                                       (dead button)
Duplicate  clips 13 -> 14; Undo visible after: true  -> clicked: 14 -> 14                                       (dead button)
edit gain  clips 13 -> 13; Undo visible after: true  -> clicked: 13 -> 13                                       (dead button)
Reset      clips 13 -> 16; Undo visible after: true  -> clicked: 16 -> 16, "back to today's teaser sound"       (dead button)
```
- **Impact.** No data is lost, and the button disappears at the next status render (a lane or ruler click, for example). But Nathan sees an Undo that does nothing when he clicks it.
- **No test covers it.** My N4 (Reset silently keeps the Undo) survives all three suites, so a regression to the worse behaviour would also go unnoticed.
- **Suggested fix (needs Plan, because `changed()` is a region shared with RULINGS-2).**
  - Add one line at the end of `changed()`: `$("btn-undo").hidden = !S.undo;` (or `renderStatus()`).
  - Add e2e checks: Open, then `+` → `#btn-undo` hidden; Open, then Reset → `#btn-undo` hidden.
  - RULINGS-2 ruling 8 (Reset/Delete undo) sets `S.undo` after `changed(true)`, so the fix is compatible with it.

### 2. MINOR (tests): the M/S/Undo semantics still have gaps the suites do not see
All three suites pass while one of these bugs is present:
- N7: soloing a lane wipes its own mute flag. The R4 checks only solo lanes that are not muted.
- N14: M stops being saved to the browser. No test reloads the page after an M.
- N4: see defect 1.
- N15: a corrupt-file open throws away a valid pending Undo.
Suggested checks:
- mute a lane, solo it, un-solo it → it is still `muted` and silent;
- after M, reload and re-open the kit → the mute has persisted;
- Open, then Reset → Undo hidden;
- Open, then a corrupt file → Undo is still visible and still works.

### 3. MINOR (tests): the R4 drop check turns a routing regression into a "not testable" note
- `e2e.mjs` lines 496–508 decide "drop not testable in Playwright" whenever `opened notes.md` does not appear within 5 s. It does not look at whether `dataTransfer.files` was empty, which is what the ruling specified.
- Under O18 the real cause is the regression itself: the kit unloads. The fallback then crashes, which is the only reason O18 counts as "killed".
- If a future change made the page fail without unloading the kit, the check would pass with just a NOTE.
- Fix: have `dispatchArrDrop` return `dataTransfer.files.length` from the page, and use the fallback only when that is 0. Otherwise FAIL.

### 4. COSMETIC (report accuracy)
- **A screenshot described but not landed.** The Ruling 4 section describes `shots/help-1440x900.png (new)`, but the file in `shots/` on the PC is still the pre-feature one (mtime 2026-09-24 18:18). The ruling asked to land only the two `arr` screenshots, so nothing is missing, but the path in the report is misleading.
- **PNG sizes.** The report explains the changed PNG sizes as a "transfer-side re-encoding". It is more specific than that, and harmless.
  - Both PNGs grew by exactly **5,770 bytes** (154,574 → 160,344 and 204,416 → 210,186).
  - That is one added 5,758-byte **`caBX` chunk** (C2PA content-credentials metadata) plus 12 bytes of chunk framing.
  - IHDR and IDAT are intact and every chunk CRC is valid. The image data was not re-encoded.

## 7. Landing after the PC disconnect: checked
- `EXECUTOR-REPORT-open-arrangement.md` does **not** mention a disconnection anywhere (I searched for disconnect, connectivity, drift and reconnect). If the executor reported one, it did so only in its chat hand-back.
- **The timeline fits a gap:**
  - the executor's e2e Save stamp is 01:48 UTC;
  - the six landed files have mtime 09:49 UTC;
  - the report has mtime 09:53.
- **What I checked:**
  - **md5s.** The six files in the report's md5 table (`teaser-lanes.html` `17ecbf82…`, `teaser-lanes.test.mjs` `c5f74167…`, `README.md` `fe43ae4c…`, `tests/e2e.mjs` `d4a925a2…`, `tests/e2e-real.mjs` `93ed7f74…`, `tests/mutants-open.mjs` `a08177b4…`) **match the PC now**, and match the copies I staged and ran.
  - **Truncation.** There is no half-written file: the page is 1553 lines and ends with `</html>`, and all the test files parse and run.
  - **Encoding.** There is no CRLF and no BOM in any of the 22 changed or new text files under the three folders (CR count 0 in each). No external URL, `<link>` or `<script src>` was added. The page is 81,666 bytes.
  - **Fixtures.** The unchanged fixtures are still `ddc156dd…`, `64d40cbf…`, `e1233d06…` and `fa42090…`.

## 8. Regression check (what the first inspection confirmed)
- **Faithful header.** I used the real kit with the **unpatched** manifest and put my webm under `teaser_v9-proxy.mp4` (`probe4.mjs`).
- **Opening the txt.** Opening `arrangement_v1.txt` gives `13 clips (0 dropped)`, and the muted lanes are exactly `logo,a-strings,a-other,b-bass,b-other`.
- **Copy list.** The Copy list plus `\n` is byte-identical to the file: all 14 lines, header included.
- **Opening the json.** Opening `arrangement_v1.json` gives the same Copy list as the txt.
- **Save.** The download is named `arrangement_20260925-1216.json`. It is byte-identical to `arrangement_v1/arrangement_v1.json` apart from `created` and `note`. `created` has the form `YYYY-MM-DD HH:MM`, and the file is LF with no BOM.
- **Round trip.** I changed the state (M on e5, + on logo), saved it, pressed Reset, and re-opened the save.
  - The Copy list is identical, and so are the clips (as a set) and the mutes.
  - Only the internal clip order differs, because Save sorts clips by lane, as §4.1 specifies.
- **av-align unchanged.** `README.md` `0e08fc6c…`, `av-align.html` `a0faf5b8…`, `av-align.test.mjs` `c0b5d4a5…`, and `git diff --quiet HEAD -- tools/av-align` is clean.
- **Nathan's txt.** `arrangement_v1.txt` md5 is `64d40cbf90e5a97b498dc55ea1d61794`, and `git diff --quiet HEAD` on it is clean.
- **git status.** `GIT_OPTIONAL_LOCKS=0 git status --porcelain` lists only paths under `audio-studio/tools/teaser-lanes/`, `audio-studio/teaser/arrangements/` and `cycles/19_teaser-sound-lanes/`.
  - `.gitattributes`, `STATE.md`, `OPEN-ITEMS.md` and the cycle `README.md` are unchanged.
  - `EXECUTOR-REPORT.md` is modified, but only by the earlier pass's appended section. Nothing from this pass is in it.
- **Page diff against HEAD.** `git diff -U0 HEAD` of the page touches only the §3 regions plus the Ruling-4 lines: 543 and 583 inside the core block, M/S 1175–1176, `unloadKit` 1216, the drop condition 1461–1463, and the wiring 1498–1501. The Reset handler, `formatClipList`, `restoreState` and the engine are untouched.

## 9. The accepted items (RULINGS-4 #9 partly, #10, #12): still only accepted, none made worse
- **#9 (the parts accepted).**
  - The status still reads `(0 dropped)`.
  - `not valid JSON (…)` still carries the parser detail (page line 575).
  - The two false README sentences were fixed as ruled: line 5 and step 6 now read word for word as in ruling 9.
- **#10.** Undo still restores clips and mutes but not solo or the selection. `serializeState` still writes only clips and mutes.
- **#12.** `arrangement_v1.json` is unchanged (`ddc156dd…`), and so is its `"created": "2026-09-24 21:49"`.
- The fixed cosmetic items #8 and #11 hold:
  - unit cases 15 and 16 pass;
  - `blur()` is present on Open, Save and Undo, and the e2e focus checks for Save and Undo pass.

## 10. What I could not verify
- Anything audible. I checked GainNode values, not sound.
- h264 playback of the real proxy (I used a VP9 stand-in).
- A real OS drag-and-drop from Windows Explorer. This includes whether a dropped **file** takes the arrangement path when `webkitGetAsEntry()` returns a file entry (mutant N12 shows no headless test can see this).
- Fonts on Windows. The how-to row counts were measured with DejaVu Sans; Segoe UI metrics differ.
- The real Downloads folder and Nathan's time zone.

## 11. Only Nathan can verify (his Chrome/Edge)
- M and S respond, and the sound changes, after Open arrangement, after Undo, and after Reset to defaults. Try 2 or 3 lanes each time.
- Dropping `arrangement_v1.json` from Explorer onto the page opens it, and the lanes stay. Dropping the `kit` folder still opens the kit.
- At his usual window size, whether the how-to shows all 8 lines or "press ? for the how-to". 1536x864 (125 % scaling) will show the short version, which is accepted.
- Save arrangement lands in Downloads as `arrangement_YYYYMMDD-HHMM.json` with his local time.
- Defect 1, once decided: after Open, press + → the Undo button should disappear.

## Readout
| tier | model | tokens | outcome |
|---|---|---|---|
| Inspect (re-inspection after Ruling 4) | Opus 5.5 | ≈ 150k | PASS with fixes. Blocker fixed (proven on the per-lane GainNodes after Open, Undo, Reset and a chain; 131/133 probe checks, the 2 failures are defect 1). Major fixed (8 lines fully visible at 1440x900, 1920x1080 and 1920x990, screenshots looked at). All counts reproduced: 218, 390, 86, 20/20. My 15 mutants: 8 killed by the project suites; 7 survived: N6 (deliberate headroom probe), N12 (a real Explorer file drop cannot be simulated), N13 (cosmetic focus), and N4, N7, N14, N15 (real test gaps). New: 1 minor product defect (dead Undo button after +, Delete, Duplicate, edit or Reset), 2 minor test gaps, 1 cosmetic. Landing verified (md5s match; PNGs differ only by a C2PA chunk) |
