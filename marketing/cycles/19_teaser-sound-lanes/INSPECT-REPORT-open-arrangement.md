# INSPECT REPORT: open / save arrangement (cycle 19 follow-up)

Inspect tier, Opus 5.5, fresh context, 2026-09-25. Read-only apart from this file. No commit, nothing deleted, no tool, brief or ruling file edited.
Scope: `BRIEF-open-arrangement.md` (with the RULINGS-3 changes applied), RULINGS-1/2/3, `EXECUTOR-REPORT-open-arrangement.md`, `tools/teaser-lanes/`, `teaser/arrangements/`.

## Verdict: FAIL (one blocker, small fix; everything else is PASS with fixes)

The file format, the parser, the converter, `arrangement_v1.json` and the round trip are correct, and every number the executor gave reproduces.
The blocker: **after Open arrangement, the M and S buttons on every lane stop working.** You click them and nothing happens until you reload the page and open the kit again. Nathan asked for this feature so he could "continue editing" his arrangement, and M and S are what he uses to do that. The bug was already in **Reset to defaults** (it hid there). Open arrangement now uses the same code path every time, and no test clicks M or S after an Open.
The fix is about 2 lines, but it is in `buildLanesDom`, which is outside the §3 regions the brief allows. So it needs a ruling (defect 1).

Defect counts: **1 blocker, 1 major, 5 minor, 5 cosmetic.**

## 1. Numbers reproduced (my own runs, not the executor's logs)

| suite | where | executor claim | my result |
|---|---|---|---|
| `node teaser-lanes.test.mjs` | cloud (node 22.22.2) | 208/208 | **ALL PASS: 208/208** |
| `node teaser-lanes.test.mjs` | VM on the PC mount (node 22.23.2) | 208/208 | **ALL PASS: 208/208** |
| `node tests/synthetic-kit.mjs <d> && node tests/e2e.mjs <d> <o>` | cloud, Chromium 1194 | 365/365 | **ALL PASS: 365/365**, 0 FAIL, zero console/page errors |
| `node tests/e2e-real.mjs <realkit> <o>` | cloud; my own fresh copy of the 9 real wavs (md5s = the RULINGS-2 list) + `kit/manifest.json` patched to `video.webm` + my own 47.6 s / 1428-frame VP9 webm (ffprobe: 30/1, 1428 frames, 47.600000 s) | 81/81 | **ALL PASS: 81/81** |
| `node tests/mutants-open.mjs . <o>` | cloud | 10 killed + O11 ACCEPT | **10 killed, O11 not killed, ANCHOR MISSING 0**. The ACCEPT reason is wrong, see defect 6 |
| `node tests/convert-arrangement.mjs arrangement_v1.txt kit/manifest.json out.json "2026-09-24 21:49" "<note>"` | cloud | md5 `ddc156dd…` | `wrote …: 13 clips, 0 dropped, muted: logo, a-strings, a-other, b-bass, b-other`, **md5 `ddc156dd39e341b3e41937ba50a82fdb`**. From the `.json` as input: same md5. From a txt with one typo: exit 1, `1 line(s) not understood: line 14` |

Fixture literals were re-derived from the brief text with `awk` on the ```` ``` ```` blocks, not taken from the executor: §6.1 `syn.txt` → `fa42090317251c0d1766460e44363b98` (= the fixture); §4.1 literal → `1e0fee35d507715a571820e35d05d7b3` (= the brief); §4.2 literal → `ddc156dd39e341b3e41937ba50a82fdb` (= `arrangement_v1/arrangement_v1.json` = `tests/fixtures/arrangement_v1.json`).

## 2. My own mutants (18 new, independent of `tests/mutants-open.mjs`)

Each mutant is one exact find→replace (checked unique) on a copy of `teaser-lanes.html`. Each is run through the unit suite, then the synthetic e2e if it survived, then the real-kit e2e if it survived again.

| id | bug | result |
|---|---|---|
| I1 | JSON open swaps `in`/`out` | killed (unit) |
| I2 | JSON open loses `fade_in` | killed (unit) |
| I3 | txt open loses `fade out` | killed (unit) |
| I4 | a `muted` line deletes the clip instead of muting the lane | killed (unit) |
| I5 | JSON open drops the last clip (off by one) | killed (unit) |
| I6 | clips running past the video end are dropped on open | killed (unit) |
| I7 | kit mismatch never noted | killed (unit) |
| I8 | corrupt file: the error escapes instead of a status message | killed (e2e) |
| I9 | Undo snapshot taken after the swap (Undo restores the opened state) | killed (e2e) |
| I10 | lane `muted` = AND over its lines instead of OR | killed (unit) |
| I11 | render end made optional in the clip-line regex | **SURVIVED** |
| I12 | solo leaks into the saved file | killed (unit) |
| I13 | `changed()` no longer clears `S.undo` | **SURVIVED** (all three suites) |
| I14 | the JSON `muted` map is ignored | killed (unit) |
| I15 | "different video" note also fires on the file name (so the proxy rename warns) | killed (unit) |
| I16 | Save writes an empty `created` stamp | **SURVIVED** (the e2e normalizer `"created": "[^"]*"` also matches `""`) |
| I17 | `gain` part ignored (gain 1) | killed (unit) |
| I18 | Undo button never shown | killed (e2e) |

15 of 18 killed. I11 is harmless: the parser just becomes more tolerant. I13 and I16 are real test gaps (defects 3 and 7).

## 3. Round-trip truth (real kit)

To get a faithful header, I put the webm bytes under the real kit's file name `teaser_v9-proxy.mp4` and used the **unpatched** manifest (md5 `e1233d06…`). Chromium sniffs the content and plays it.
- Open `arrangement_v1.txt` → status `ready · 9 lanes · opened arrangement_v1.txt: 13 clips (0 dropped)`. Muted lanes are exactly `logo, a-strings, a-other, b-bass, b-other`.
- **Copy list = the original, all 14 lines byte-identical**, header included. The only difference is that the file ends with `\n` and the list does not. Today's page still has the pre-Ruling-2 header and `muted` wording, and so does Nathan's file, so no wording difference shows up at all.
- **Save arrangement**: the downloaded file is byte-identical to `arrangement_v1/arrangement_v1.json` apart from `created`/`note`: `clips`, `muted`, `video`, `kit`, `format` and `version` are all equal.
- Changed state (one M, one +), then re-opened the saved JSON: **localStorage state identical** to before saving, copy list identical, muted lanes identical.

## 4. arrangement_v1.json correctness (independent Python parse of the txt)

All 13 clips match: track, in, out (15.047 → 15.0465 = the file length, clamped), at, gain, fade in and fade out. Every render end in the txt equals at + (out − in) to within 0.0006. The muted set derived from the txt (OR per lane) equals the JSON's `logo, a-strings, a-other, b-bass, b-other`. All 9 lanes are present in the `muted` map.
Past the video end (47.6 s): a-strings ends 50.0465, b-piano 50.000 and b-bass 50.0465. All three are kept (0 dropped). At f1427 their lane headers show `src 12.567` (a-strings, b-piano, b-bass), so they play until the video stops: kept and cut, as the earlier convention says. Correction to the inspection brief: **b-drums ends at 41.5465 s, before the video end**, so it is an ordinary clip.

## 5. Defects

### 1. BLOCKER: M and S buttons do nothing after Open arrangement, after Undo, and (already before this feature) after Reset to defaults
`buildLanesDom` (`teaser-lanes.html` 1175–1177) wires `bM.onclick = () => { l.muted = !l.muted; … }` and `bS.onclick` the same way. `l` is the lane object of the state that existed when the kit was loaded. `openArrangementFile`, `restoreSerialized` and the Reset handler all replace `S.st` with new lane objects, so these clicks now change a stale object. The button does not light up, the sound does not change and the copy list does not change. `+` and the canvas still work because they look lanes up by id.
Evidence (my probe `insp6.mjs`, real kit, 1440x900; click M on e5, then S on bed):
```
fresh kit load                     M on e5 works: true  | S on bed works: true
after Open arrangement             M on e5 works: false | S on bed works: false
   after dead M on e5 the copy list e5 line: e5: source 0.000-8.500 s -> render 24.300-32.800 s (gain 0.3, fade in 2 s)
after Undo                         M on e5 works: false | S on bed works: false
after reload + kit (restored)      M on e5 works: true  | S on bed works: true
after Reset to defaults (pre-existing) M on e5 works: false | S on bed works: false
```
None of the 365 + 81 checks clicks M or S after an Open, an Undo or a Reset.
Suggested fix (needs a Plan ruling, because it is outside the §3 regions): look the lane up at click time, `const L = S.st.lanes.find(x => x.id === l.id); L.muted = !L.muted; …`, and the same for solo. Then add an e2e check that M and S work after Open, after Undo and after Reset.

### 2. MAJOR: the 9th how-to line hides the how-to at 1440x900 and 1920x990, and the executor did not report it
Before this feature, the full how-to showed at 1440x900 and 1920x990 (`shots/e2e-report.txt`: `measured 1440x900 … how-to full text shown: true`, the same at 1920x990). After it, both show only "press ? for the how-to" (`shots/open-arr-e2e-report.txt` lines 29 and 277: `false`; my synthetic run gives the same). Measured on the real kit (height of the how-to box / height needed):

| viewport | box height | needed with 9 lines | needed with 8 lines |
|---|---|---|---|
| 1440x900 | 274 px | 326 px | 274 px |
| 1920x990 | 277 px | 279 px | 277 px |

So the new line alone causes the overflow. BRIEF §9 says: "If `howtoShown` flips to false at 1440x900 in `e2e.mjs`, report it". The executor report says "Deviations: None", and describes `arr-1440x900.png` as "No defects", although that screenshot shows the one-line fallback. On most laptop screens, the one place that explains Open and Save is now hidden behind `?`. Plan should either shorten the line to fit in one wrapped line, or accept this explicitly.

### 3. MINOR: M and S do not clear Undo, and no test checks that a later change hides Undo
§4.4: "Any later change (edit, +, Delete, M, Reset, another Open) clears the button". The M handler calls `persist()`, not `changed()`, so `S.undo` survives an M press. After defect 1 is fixed, this would be visible: M after Open, then Undo, silently reverts that M change as well. My mutant I13 (remove `S.undo = null` from `changed()`) survives all three suites. The only related check (e2e D, "+ on logo: Undo stays hidden") runs after an Undo, when nothing is pending.

### 4. MINOR: a stale Undo survives a kit unload, and clicking it then throws
`unloadKit()` does not clear `S.undo`. To reproduce: open an arrangement, then drop any single file that is not `.json`/`.txt` (or a folder without a manifest). The kit unloads, but **Undo stays visible**. Clicking it throws an uncaught `TypeError: Cannot read properties of null (reading 'video')` (`insp2.mjs`). After re-opening the same kit, Undo is still shown. Clicking it then replaces the restored state with the pre-open clips: harmless, but not what the label promises. Fix: `S.undo = null` in `unloadKit`.

### 5. MINOR: dropping a file routes by extension, and a wrongly named arrangement unloads the kit
The file picker decides by content, and that works: `.md`, no extension, BOM `.json` and CRLF `.txt` all open with `13 clips (0 dropped)`.
The drop handler does it differently: it only treats a single `*.json`/`*.txt` as an arrangement. `arrangement_v2.md`, `noext`, or two files at once go down the kit-folder path. That **unloads the loaded kit** (all lanes disappear) and says `⚠ That folder has no manifest.json. Open the kit folder made by prep_kit.py.`, which is confusing when Nathan dropped a file. Nothing is lost: localStorage restores the clips when he re-opens the kit.
This is exactly what §4.3 prescribes, so it is not an executor error. Plan could route "a single file that is not a folder" to the arrangement path.

### 6. MINOR: the O11 "equivalent mutant" ACCEPT is factually wrong
The report says that under O11, `parseArrangement("[1,2]")` "still throws the identical message". Measured:
```
original: parseArrangement("[1,2]")        THROWS no clip lines found (…)
O11:      parseArrangement("[1,2]")        THROWS not a JSON object
original: "[my notes]\nbed: source …"      -> 1 clip
O11:      "[my notes]\nbed: source …"      THROWS not valid JSON (…)
```
O11 changes behaviour: a hand-typed `.txt` that starts with `[` fails to open. It is a surviving mutant, which means a test gap (add a unit case for text starting with `[`), not an equivalent one.

### 7. MINOR: other surviving test gaps
- I16: the Save `created` stamp is never checked, because the normalizer regex accepts `""`.
- I11: no unit case rejects a line that has no render end. That is harmless, but INSPECT item 11.9 asked about it.

### 8. COSMETIC: odd notes on hand-edited JSON
- A `video` block without numbers (`"video": {}`) gives `made for a different video (?, NaN.NaN s)`.
- `"version": "1"` (a string) gives `unknown arrangement version 1 (this page reads version 1)`.

### 9. COSMETIC: wording that Save arrangement now contradicts, and jargon
- Tool README line 5 says "the only output is a plain-words clip list you paste into chat". README step 6 and page how-to line 7 say "Nothing is written to disk". Save arrangement now writes a download.
- The status line says `13 clips (0 dropped)`. "dropped" is programmer wording ("left out" is plainer), and when something is dropped the status does not say which clip or why (unknown lane, starts after the video end, fades longer than the clip).
- `could not open trunc.json: not valid JSON (Unterminated string in JSON at position 500 (line 8 column 135))` is readable but technical.
- The other messages are clear to a non-programmer:
  - `open the kit folder first, then the arrangement`
  - `could not open empty.txt: the file is empty`
  - `12 clips (0 dropped, 1 line not understood: line 14)`
  - `made for kit other-kit`
  - `back to the clips before opening …`
  - `saved arrangement_…json (13 clips) to your Downloads folder; move it into teaser/arrangements/`

### 10. COSMETIC: Undo restores clips and mutes exactly, but not solo or the selection
The stored state is byte-identical after Undo (`insp7.mjs`). A lane soloed before the Open is not soloed after Undo, and the selected clip is deselected. The brief expects the deselection. Solo is listening-only.

### 11. COSMETIC: focus stays on Open/Save, so Enter re-triggers them
Keyboard focus stays on Open arrangement / Save arrangement after a click. Enter then repeats the action (a second download was measured). Space is safe: it is caught and plays. Copy list already behaves the same way.

### 12. COSMETIC: `created` time zone and one wrong line number in the merge notes
- `arrangement_v1.json` `"created": "2026-09-24 21:49"` is the txt's mtime read on a UTC clock (VM `date`: UTC; mtime 1790286566 = 21:49:26 UTC = 23:49 CEST). The page's Save stamps local time. If Nathan's PC runs on Belgian time, the two conventions differ by 2 h.
- The executor's merge notes put `undo: null` at line 663; it is at line 667. Every other line number in the merge notes is correct.

## 6. File-open UX and robustness (real kit, `insp.mjs`, 34/36 checks pass; the 2 fails are defects 3 and 4)

| case | clips after | status line |
|---|---|---|
| before any kit: buttons | – | both disabled |
| before any kit: drop / hidden input | 0 | `open the kit folder to begin · ⚠ open the kit folder first, then the arrangement` |
| JSON from another kit | 13 | `opened otherkit.json: 13 clips (0 dropped) · made for kit other-kit` |
| JSON without `kit` | 13 | `opened nokit.json: 13 clips (0 dropped)` (no note, as specified) |
| JSON for another video | 13 | `… · made for a different video (teaser_v8.mp4, 46.000 s)` |
| clip on unknown lane `strings` | 13 | `… 13 clips (1 dropped)` |
| binary garbage named .json | 13 (unchanged) | `⚠ could not open garbage.json: no clip lines found (expected lines like "bed: source …")` |
| empty .txt | unchanged | `⚠ could not open empty.txt: the file is empty` |
| truncated JSON | unchanged | `⚠ could not open trunc.json: not valid JSON (Unterminated string …)` |
| one typo (`fadein 2 s`) | 12 | `opened typo.txt: 12 clips (0 dropped, 1 line not understood: line 14)` |
| CRLF .txt / BOM .json / .md / no extension (picker) | 13 | opened, 0 dropped |
| open while playing | 13 | opened; the video keeps playing; zero errors; Undo while playing: zero errors |
| M after Open | – | Undo stays visible (defect 3; M itself dead: defect 1) |
| re-open kit after an Open | – | Undo still visible (defect 4) |

Screenshots I looked at:
- **`insp-real-txt-1440x900.png`** (arrangement_v1.txt opened):
  - 13 blocks over 9 lanes; logo, strings A, other A, bass B and other B have an orange M and greyed labels.
  - strings A, piano B and bass B blocks run off the right edge at 47.6 s.
  - The status line reads `opened arrangement_v1.txt: 13 clips (0 dropped)`, with Reset to defaults and Undo next to it.
  - The how-to is reduced to "press ? for the how-to" (defect 2).
- **`insp-real-typo-1100x800.png`**:
  - All top-bar buttons have their full labels, none wrapped. Measured boxes: Copy list 665–743, Open arrangement 753–899, Save arrangement 909–1052, ? 1062–1088, all 26 px high, no overlap. The kit info text is not ellipsized.
  - The status line is fully readable.
- **Executor's shots**:
  - `arr-1440x900.png` matches its description, except that it shows the one-line how-to (defect 2).
  - `real-arr-1440x900.png` matches its description (it too shows the one-line how-to).
- My screenshots and probe scripts are in this session's cloud scratchpad only (`scratchpad/insp/`, `insp*.mjs`, `mymut.mjs`). They are not landed, per the read-only rule.

## 7. Hygiene
- av-align: README.md `0e08fc6c…`, av-align.html `a0faf5b8…`, av-align.test.mjs `c0b5d4a5…`. All three equal `git show HEAD:` and the brief.
- `arrangement_v1.txt`: `64d40cbf90e5a97b498dc55ea1d61794` on the PC, in the fixture copy and at HEAD.
- `GIT_OPTIONAL_LOCKS=0 git status --porcelain`: every entry is under `audio-studio/tools/teaser-lanes/`, `audio-studio/teaser/arrangements/` or `cycles/19_teaser-sound-lanes/`. `.gitattributes`, `STATE.md`, `OPEN-ITEMS.md` and the cycle `README.md` are unchanged against HEAD.
- LF and no BOM in all 18 new or changed text files (CR count 0; the first 3 bytes are never `ef bb bf`).
- Page: 81,583 bytes (under 160 KB). No `http(s)://`, `<link` or `<script src`.
- Baseline: `git show HEAD:…/teaser-lanes.html` gives md5 `cd0bf7d96d98bf2ebd12935a0cc42ba8`, 1334 lines. That is exactly the pre-feature page RULINGS-3 verified, so the baseline is fully established.
- `git diff HEAD` of the page (+223 / −4) touches only the §3 regions: topbar CSS, the two buttons, `#btn-undo`, `#arr-input`, the core block and the export line, HOWTO line 8, `S.undo`, `renderStatus`, `changed()`, `setEnabled`, the after-load enables, the open/save/undo functions, the drop pre-check and the wiring. `formatClipList`, `validateClip`, `restoreState`, `stepTo`, `addClip` and the engine are untouched.
- Tests: the unit file is +219/−0. `e2e.mjs` is +207/−3, and the 3 removed lines are refactors (an import line and the `boxes` signature), not removed checks.
- Landed md5s on the PC equal the executor's table (e2e `0fb6a67f…`, e2e-real `86622d7a…`, mutants-open `cbd84e32…`, tool README `909aeaa3…`, arrangements README `68438e99…`, EXECUTOR-REPORT `8c36353c…`).

## 8. Coexistence with RULINGS-2 (not applied yet)
- The parser ignores the header and the `cut by the video end at … s` part (unit case 3 passes). Today's list and Ruling-2 lists therefore both open the same way.
- `S.undo = {label, restore}`, the clear in `changed()` and the footer button are the shapes Ruling 8 reuses.
- The Ruling-2 executor must also fix the M/S path (defects 1 and 3), or Ruling 8's "any other change clears it" will not hold for M.

## 9. Docs as Nathan would read them
- "Open arrangement" and "Save arrangement" are plain, and so is the arrangements README section "Open one in the tool".
- Confusing points:
  - "keep it in teaser/arrangements/" gives no full path (the README gives `../../teaser/arrangements` relative to the tool).
  - "dropped" in the status line.
  - "Nothing is written to disk" is now untrue in a literal sense (defect 9).
  - The arrangements README says `muted` is "NOT yet confirmed to mean leave that clip out". Opening the file turns those lines into M mutes, which matches what Nathan heard, so this is fine.

## 10. What I could not verify
- Real OS drag-and-drop from Windows Explorer. The synthetic `DataTransfer` drop works in headless Chromium.
- h264 playback of the real proxy (I used a VP9 stand-in).
- The real Downloads-folder behaviour, and Nathan's PC time zone.
- Anything audible (nothing was listened to).

## 11. Only Nathan can verify (his Chrome/Edge)
- Open arrangement → `arrangement_v1.json` (and the `.txt`) from the real file dialog shows 13 blocks, with 5 lanes muted.
- **After the defect-1 fix**: M and S respond after an Open, after Undo and after Reset.
- Dropping the `.json` from Explorer onto the page opens it (and does not unload the kit).
- Save arrangement lands in Downloads under the name `arrangement_YYYYMMDD-HHMM.json`, with his local time.
- Whether the how-to is visible at his screen size (defect 2).

## Readout
| tier | model | tokens | outcome |
|---|---|---|---|
| Inspect | Opus 5.5 | ≈ 240k | FAIL (1 blocker: M/S dead after Open/Undo/Reset; 1 major: how-to hidden at 1440x900 and not reported; 5 minor; 5 cosmetic). All counts reproduced: 208, 365, 81, 11 (O11 is not equivalent); my own mutants: 15 of 18 killed |
