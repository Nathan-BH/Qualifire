# BRIEF — open / save an arrangement file (cycle 19 follow-up; Plan tier, Fable, 2026-09-24)

Self-contained. Executor: Sonnet, stop-on-ambiguity (§9 lists the pre-decided calls). Implements Nathan's request:
"add to arrangement_v1 folder a filetype i can open in the teaser-lanes.html tool, so that if tomorrow i want to hear or continue editing my arrangement it is possible".
This overrides BRIEF-teaser-sound-lanes.md §13 decision 9 ("no JSON export/import"); §13.9 there now carries the tag «Open-arrangement brief, 2026-09-24».

Read first (all under `$HOME/mnt/Qualifire/marketing/`): this file; `cycles/19_teaser-sound-lanes/BRIEF-teaser-sound-lanes.md` §1 (hard rules), §5 (core), §6.5, §7, §8, §10; `RULINGS-2.md` rulings 1, 5, 8 (they are NOT applied to the page yet — see §8 here); `RULINGS-3.md` (ruling 3: the `kit` argument of `formatArrangementJson`, already applied to this brief «Ruling 3, 2026-09-25»); `RULINGS-4.md` (the inspect fixes: M/S after Open/Undo/Reset, how-to back to 8 entries, drop routing, Undo on unload, focus, two core one-liners, tests and mutants — where this brief and RULINGS-4 differ, RULINGS-4 wins «Ruling 4, 2026-09-25»). Spot-check every anchor in §3 with `grep -n` / `sed -n` before editing.

## 0. For Nathan — what this builds, in plain words
- Two new buttons in the top bar next to **Copy list**: **Open arrangement** and **Save arrangement**.
- **Save arrangement** downloads one small text file, `arrangement_YYYYMMDD-HHMM.json`, holding your clips and your M mutes. Move it into `teaser/arrangements/<version>/`.
- **Open arrangement** (or dropping the file onto the page) puts those clips and mutes back on the lanes. It also opens a pasted clip list saved as `.txt`, so your existing `arrangement_v1.txt` opens directly. Whatever was on the lanes before is replaced; **Undo** in the status line brings it back.
- Your `arrangement_v1/` folder gets `arrangement_v1.json`, made from your `.txt` by the same code the page uses, so tomorrow you open either one.

## 1. Hard rules (unchanged from the cycle brief §1, repeated)
1. Never delete; `mv` to `<repo>/safe_to_delete/` if something must go. Never call `device_request_delete_permission`.
2. Files edited/created ONLY under `marketing/audio-studio/tools/teaser-lanes/`, `marketing/audio-studio/teaser/arrangements/` (only `README.md` and `arrangement_v1/arrangement_v1.json`), and `marketing/cycles/19_teaser-sound-lanes/` (your report, screenshots). `tools/av-align/` byte-identical: md5 `0e08fc6c4a3871ff70c55ff23b3b12f7` README.md, `a0faf5b80c72e418878dfb210a151eaf` av-align.html, `c0b5d4a579a67886ce7ead2eb076b57f` av-align.test.mjs before and after. Do not edit STATE, OPEN-ITEMS, cycle README rows, `.gitattributes`.
3. git read-only (`GIT_OPTIONAL_LOCKS=0 git status --porcelain`); never commit or stage.
4. LF, UTF-8, no BOM in every file you write (`file <f>`; `head -c3 <f> | xxd` is not `ef bb bf`).
5. No external URLs, no `<link>`, no `<script src>` in the page (the unit test enforces it). Page size stays < 160 KB.
6. Every anchor in §3 re-verified before use; mismatch beyond ±10 lines of clearly the same code → STOP, report verbatim.
7. STOP-on-ambiguity: anything not pre-decided in §9 that changes a number, a format, a file location or a rule → stop, report what you saw / expected / the command. Leave the tree consistent.
8. device_bash calls ≤ 120 s (180 max). Author in the cloud (Write), land with `device_commit_files` to `C:\Users\natha\Claude personal projects\Qualifire\marketing\...\<name>`; after landing, md5 on the PC == md5 in the cloud for every file (table in the report). Small text (README rows, the generated JSON) may be written on the mount directly. Never re-type file content from tool output.
9. Nothing is "listened to". Verified = measured, or looked at (screenshots, say which).
10. Do not ask Nathan anything.

Tool folder (PC): `$HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes/` (`teaser-lanes.html` 1334 lines, `teaser-lanes.test.mjs` 142 cases, `tests/e2e.mjs` 322 checks, `tests/e2e-real.mjs` 69 checks, `kit/` with manifest + 9 float wavs + `teaser_v9-proxy.mp4`). Nathan's file: `$HOME/mnt/Qualifire/marketing/audio-studio/teaser/arrangements/arrangement_v1/arrangement_v1.txt` (md5 `64d40cbf90e5a97b498dc55ea1d61794`, LF, UTF-8, 14 lines, ends with `\n`). `kit/manifest.json` md5 `e1233d06c9b3449466eefd14e67ce149` (kit `teaser-lanes`, video `{file: teaser_v9-proxy.mp4, name: teaser_v9.mp4, fps 30, duration_s 47.6, frames 1428}`; tracks logo 8.4376 s, bed/a-strings/a-other/b-piano/b-drums/b-bass/b-other 15.0465 s, e5 8.5 s; default muted: the six stems).

## 2. Facts verified by Plan (reuse, do not re-derive)
- `validateClip` (page 316–350) errors only on `at >= duration_s`; a clip whose END runs past the video is OK (kept, drawn clipped). `out` above `source_len_s + 1e-9` is CLAMPED to `source_len_s` with a warning, not an error. So the txt's `15.047` becomes `15.0465` on open and prints as `15.047` again (`fmt3` rounds half-up); `35.000-50.047` clips are kept, not dropped.
- `restoreState(saved, manifest)` (452–465) already: rebuilds from `buildState`, drops clips whose track is unknown or fails validation (`dropped` count), applies `muted` only where the saved value is a boolean (lanes not mentioned keep the manifest default). Reuse it for both file kinds.
- `formatClipList` today (371–387) prints `v.file` in the header and takes `muted` from `audible()`; RULINGS-2 ruling 1 will change both. Solo is never saved by us, so with solo off `audible()` == `!lane.muted`.
- The page has no undo yet (`S.undo` does not exist). RULINGS-2 ruling 8 will add `S.undo = {label, restore}` with a button next to Reset; we introduce exactly that shape now (§4.4) so the later executor extends it instead of adding a second one.
- Numbers in state are `roundTenthMs`'d (4 decimals) and gain 3 decimals; `JSON.stringify` of such numbers is deterministic and shortest (`10.3`, `15.0465`, `0.45`), so the JSON writer needs no number formatting of its own.
- `#kit-info` already ellipsizes (`#kit-info` CSS line 35); the top bar (line 32) is `display:flex; gap:10px; height:36px`. Buttons are 26 px high there (line 34).
- Playwright can set a single file on a hidden `<input type=file>` (`page.setInputFiles`) and can catch downloads (`page.waitForEvent("download")`). Folder drag-drop cannot be simulated (cycle brief §10); a synthetic `DataTransfer` with a `File` CAN be dispatched (`page.dispatchEvent(sel, "drop", { dataTransfer })`) — `webkitGetAsEntry()` is null on it, so the arrangement-drop detection must look at `dataTransfer.files`, not entries (§4.3).
- The synthetic kit (`tests/synthetic-kit.mjs`): kit `teaser-lanes`, video `video.webm` 60 s / 1800 frames, lanes logo (2 s), bed (12), a-strings (12, muted), b-drums (12, muted, file missing), e5 (3); 7 default clips.

## 3. Page anchors touched (today's line numbers; re-verify)
| region | lines | change |
|---|---|---|
| `#topbar button` CSS | 34 | add `white-space: nowrap; flex: none;` |
| top bar buttons | 128 (`btn-copy`) | insert after it: `<button id="btn-open-arr" type="button" disabled>Open arrangement</button>` `<button id="btn-save-arr" type="button" disabled>Save arrangement</button>` |
| status footer | 191 (`btn-reset`) | insert after it: `<button id="btn-undo" type="button" hidden>Undo</button>` |
| hidden inputs | 193 (`kit-input`) | insert after it: `<input id="arr-input" type="file" accept=".json,.txt,application/json,text/plain" hidden>` |
| core: new block | after `kitRootOf` (482–492), before `return {` (494) | §4.1 functions |
| core: export line | 494–497 | add `parseClipLine, parseArrangementText, parseArrangementJson, parseArrangement, applyArrangement, formatArrangementJson, arrangementFileName, ARRANGEMENT_FORMAT` |
| HOWTO array | 509–517 (landed page: 648–658) | stays at EIGHT entries: entry 7 (Copy list) and entry 8 (Lanes A/B) are replaced by the two texts in §4.5; the 9th entry the first pass added is removed «Ruling 4, 2026-09-25» |
| `S` object | 521–524 | add `undo: null` |
| `renderStatus` | 537–550 | add `$("btn-undo").hidden = !S.undo;` next to the `btn-reset` line |
| `changed()` | 937 | first statement: `S.undo = null;` |
| `setEnabled` | 1088 | add `"btn-open-arr", "btn-save-arr"` to the id list |
| after load | 1180 (`$("btn-copy").disabled = false;`) | also enable the two new buttons |
| file input / drop section | 1186–1209; drop handler 1251–1254 | §4.3 detection + new functions `openArrangementFile`, `saveArrangement`, `undoLast` (place them after `fromDrop`, before `// ---------- copy list ----------`) |
| wiring | 1280–1283 | add `$("btn-open-arr").onclick`, `$("arr-input").change`, `$("btn-save-arr").onclick`, `$("btn-undo").onclick` |
Nothing else in the page changes. `formatClipList`, `validateClip`, `restoreState`, `stepTo`, `addClip`, the editor and the engine are untouched (RULINGS-2 owns them).
Regions widened by Ruling 4 (line numbers of the landed 1553-line page, md5 `bfb1b7e1…`; exact replacement lines in RULINGS-4.md rulings 1, 4, 5, 8, 11) «Ruling 4, 2026-09-25»: `buildLanesDom` lines 1176–1177 ONLY (the M and S handlers: look the lane up with `laneOf(l.id)` at click time; M calls `changed(); renderStatus();`) — a general fix, `buildLanesDom` is otherwise untouched; `unloadKit` line 1216 (`S.undo = null;`); the drop handler lines 1462–1463 (single dropped file of any name → arrangement path, a dropped folder → kit path); the wiring lines 1498, 1500, 1501 (`blur()` on Open/Save/Undo); `parseArrangementJson` line 543 (`JSON.stringify(obj.version)` in the message); `applyArrangement` line 583 (`Number.isFinite` guard on `arr.video.fps`/`duration_s`).

## 4. Specification

### 4.1 Core (`<script id="lanes-core">`, pure, no DOM)
```
const ARRANGEMENT_FORMAT = "teaser-lanes-arrangement";   // version 1
```
**`parseClipLine(line)`** → `{track, in, out, at, gain, fade_in, fade_out, muted}` or `null` (not a clip line). Regex, exact:
```
/^\s*([a-z0-9-]+):\s*source\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*s\s*->\s*render\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*s\s*\((.*)\)\s*$/
```
`in = m[2], out = m[3], at = m[4]` (as numbers); `m[5]` (render end) is read but IGNORED (it is derived; the source range and the start define the clip). `m[6]` is split on `/,\s*/`; each part must match one of: `^gain\s+(\d+(?:\.\d+)?)$` → gain; `^fade in\s+(\d+(?:\.\d+)?)\s*s$` → fade_in; `^fade out\s+(\d+(?:\.\d+)?)\s*s$` → fade_out; `^muted$` → muted true; `^file missing$` (ignored); `^cut by the video end at .*$` (ignored, RULINGS-2 ruling 5). Any other part → the whole line returns `{ bad: true }` (rejected, counted). Defaults: gain 1, fades 0, muted false.

**`parseArrangementText(text)`** → `{ kind: "text", clips: [{track,in,out,at,gain,fade_in,fade_out}], muted: {laneId: bool}, rejected: [lineNumbers] }`. Split on `/\r?\n/`; every line that `parseClipLine` returns non-null is a clip line (header and any other line ignored, whichever header variant); `muted[track] = OR of that track's lines' muted` (a lane with clip lines but never `muted` gets `false`; a lane with no clip lines is absent from the map → keeps the manifest default in `restoreState`). Throws `Error("no clip lines found (expected lines like \"bed: source 0.000-15.047 s -> render 10.300-25.347 s (gain 0.45)\")")` when 0 clip lines (rejected lines do not count as found).

**`parseArrangementJson(textOrObj)`** → `{ kind: "json", clips, muted, video, kit, created, note }`; unknown/extra keys ignored. Errors (plain phrases, no prefix):
- not an object → `not a JSON object`
- `format !== ARRANGEMENT_FORMAT` → `not a teaser-lanes arrangement (expected "format": "teaser-lanes-arrangement")`
- `version !== 1` → `unknown arrangement version <v> (this page reads version 1)`
- `clips` missing / not an array → `"clips" is missing or not a list`
- clip i (1-based in messages): `track` not a string matching `/^[a-z0-9-]+$/` → `clip <i>: track is missing`; `in`/`out`/`at` not finite numbers → `clip <i>: <field> is not a number`; `gain`/`fade_in`/`fade_out` present but not finite numbers → same wording. Range problems are NOT errors here: `restoreState` drops those clips and counts them.
- `muted` present but not an object → `"muted" is not an object`; non-boolean values ignored.
`video`, `kit`, `created`, `note` pass through when present (any type; used only for the mismatch note).

**`parseArrangement(text)`**: `text.trim() === ""` → `Error("the file is empty")`; first non-space char `{` → `JSON.parse` (failure → `Error("not valid JSON (" + e.message + ")")`) then `parseArrangementJson`; else `parseArrangementText`. File extension is never consulted.

**`applyArrangement(arr, manifest)`** → `{ state, dropped, note }` = `restoreState({clips: arr.clips, muted: arr.muted}, manifest)` plus `note`: `""`, or `"made for a different video (" + (arr.video.name || arr.video.file || "?") + ", " + fmtSeconds(arr.video.duration_s) + " s)"` when `arr.video` is an object and (`arr.video.fps !== manifest.video.fps` or `|arr.video.duration_s − manifest.video.duration_s| > 0.0015`); else `"made for kit " + arr.kit` when `typeof arr.kit === "string" && arr.kit !== manifest.kit`. File names are never compared (the proxy rename must not warn). Warn, never refuse.

**`formatArrangementJson(state, kit, meta)`** (`kit` = the loaded manifest's `kit` string, i.e. `manifest.kit` — the caller always passes it, because `state` carries no kit id; `buildState`/`restoreState` stay untouched. `meta = {created: string, note: string}`) «Ruling 3, 2026-09-25» → the exact text below, LF, ending with one `\n`. Key order fixed. Top-level keys on their own lines with 2-space indent; `video`, `muted` and each clip are one-line objects written as `{"k": v, "k2": v2}` (one space after `:` and after `,`); clips indented 4 spaces, comma after each but the last; numbers via `JSON.stringify`. `kit` (top-level `"kit"`) = `JSON.stringify(typeof kit === "string" ? kit : "")` — the `kit` argument, never read from `state` «Ruling 3, 2026-09-25»; `video` = `{file: v.file, name: v.name || v.file, fps, duration_s, frames}`; `muted` = every lane in lane order → `!!lane.muted` (solo ignored); `clips` sorted like the list (lane order, then `at`, then original index), fields `track, in, out, at, gain, fade_in, fade_out` (no `id`). Expected output for the synthetic kit after opening the fixture of §6.1 (with `kit = "teaser-lanes"` (the synthetic manifest's `kit`) and `meta = {created: "CREATED", note: ""}` «Ruling 3, 2026-09-25»), md5 `1e0fee35d507715a571820e35d05d7b3` (807 bytes; unchanged by Ruling 3 — the literal was already right, only its `kit` source was undocumented):
```
{
  "format": "teaser-lanes-arrangement",
  "version": 1,
  "kit": "teaser-lanes",
  "video": {"file": "video.webm", "name": "video.webm", "fps": 30, "duration_s": 60, "frames": 1800},
  "created": "CREATED",
  "note": "",
  "muted": {"logo": false, "bed": true, "a-strings": false, "b-drums": true, "e5": false},
  "clips": [
    {"track": "logo", "in": 0, "out": 1, "at": 0, "gain": 0.85, "fade_in": 0, "fade_out": 0.2},
    {"track": "bed", "in": 0, "out": 12, "at": 1, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "bed", "in": 0, "out": 5, "at": 20, "gain": 0.45, "fade_in": 0.5, "fade_out": 1},
    {"track": "a-strings", "in": 2, "out": 10, "at": 44, "gain": 0.6, "fade_in": 0, "fade_out": 0},
    {"track": "e5", "in": 0, "out": 3, "at": 2, "gain": 1, "fade_in": 0, "fade_out": 0}
  ]
}
```
**`arrangementFileName(date)`** → `"arrangement_" + YYYYMMDD + "-" + HHMM + ".json"` (local time, zero-padded); **`arrangementStamp(date)`** → `"YYYY-MM-DD HH:MM"` (local). Export both.

### 4.2 Nathan's file — exact expected content of `arrangement_v1/arrangement_v1.json` (md5 `ddc156dd39e341b3e41937ba50a82fdb`, 1872 bytes)
```
{
  "format": "teaser-lanes-arrangement",
  "version": 1,
  "kit": "teaser-lanes",
  "video": {"file": "teaser_v9-proxy.mp4", "name": "teaser_v9.mp4", "fps": 30, "duration_s": 47.6, "frames": 1428},
  "created": "2026-09-24 21:49",
  "note": "converted from arrangement_v1.txt (Nathan's first hand-tweaked arrangement, 2026-09-24) by tests/convert-arrangement.mjs",
  "muted": {"logo": true, "bed": false, "a-strings": true, "a-other": true, "b-piano": false, "b-drums": false, "b-bass": true, "b-other": true, "e5": false},
  "clips": [
    {"track": "logo", "in": 0, "out": 6.5, "at": 0, "gain": 0.85, "fade_in": 0, "fade_out": 0.5},
    {"track": "bed", "in": 0, "out": 15.0465, "at": 10.3, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "bed", "in": 0, "out": 15, "at": 22.6, "gain": 0.45, "fade_in": 2.5, "fade_out": 1},
    {"track": "a-strings", "in": 0, "out": 15.0465, "at": 35, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "a-other", "in": 0, "out": 15.0465, "at": 10.3, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "a-other", "in": 0, "out": 9.76, "at": 23.04, "gain": 0.45, "fade_in": 0, "fade_out": 1},
    {"track": "b-piano", "in": 0, "out": 10.5, "at": 0, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "b-piano", "in": 0, "out": 15, "at": 35, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "b-drums", "in": 0, "out": 15.0465, "at": 26.5, "gain": 0.45, "fade_in": 5, "fade_out": 0},
    {"track": "b-bass", "in": 0, "out": 15.0465, "at": 35, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "b-other", "in": 0, "out": 15.0465, "at": 10.3, "gain": 0.45, "fade_in": 0, "fade_out": 0},
    {"track": "b-other", "in": 0, "out": 9.76, "at": 23.04, "gain": 0.45, "fade_in": 0, "fade_out": 1},
    {"track": "e5", "in": 0, "out": 8.5, "at": 24.3, "gain": 0.3, "fade_in": 2, "fade_out": 0}
  ]
}
```
(`15.047` in the txt → `15.0465` here: the clamp of §2; the six `15.047` lines are bed 1, a-strings, a-other 1, b-drums, b-bass, b-other 1. `created` = the txt's mtime on the PC, 2026-09-24 21:49, passed as an argument, never `new Date()`. `kit` = `manifest.kit` of `kit/manifest.json` (`"teaser-lanes"`), passed as the second argument by the converter «Ruling 3, 2026-09-25»; the literal and its md5 `ddc156dd39e341b3e41937ba50a82fdb` are unchanged by Ruling 3.)

### 4.3 App — open
- `#btn-open-arr` → `$("arr-input").click()`; `arr-input` `change` → `openArrangementFile(file)`, then `e.target.value = ""`.
- Drop handler (1251; landed page 1460–1469): BEFORE `fromDrop`, `const fl = e.dataTransfer.files, it0 = e.dataTransfer.items && e.dataTransfer.items[0]; const en0 = it0 && it0.webkitGetAsEntry ? it0.webkitGetAsEntry() : null; if (fl && fl.length === 1 && !(en0 && en0.isDirectory)) { if (!S.loaded) { say("open the kit folder first, then the arrangement", "err"); return; } await openArrangementFile(fl[0]); return; }` — one dropped FILE of any name is an arrangement (content decides, as with the picker); one dropped FOLDER or several items stay the kit path «Ruling 4, 2026-09-25» (was: `/\.(json|txt)$/i` on the name, which sent a wrongly named file down the kit path and unloaded the kit).
- `openArrangementFile(file)`: `if (!S.loaded) { say("open the kit folder first, then the arrangement", "err"); return; }`; `text = await file.text()`; `arr = C.parseArrangement(text)`; `r = C.applyArrangement(arr, S.manifest)`; on a thrown error → `say("could not open " + file.name + ": " + e.message, "err")`, state untouched. Otherwise, exactly as the Reset handler (1285–1293) does: `old = S.st`, `fresh = r.state`, copy each lane's `status` from `old`, `fresh.zoom = old.zoom`, `fresh.sel = null`, every `fresh.lanes[i].solo = false`; `S.st = fresh; S.restored = true;` `applyAudible(); changed(true);` THEN `S.undo = { label: "opening " + file.name, restore: () => restoreSerialized(before) }` where `before = C.serializeState(old)` was taken before the swap, and `say(msg)` with
  `msg = "opened " + file.name + ": " + fresh.clips.length + " clip" + (n === 1 ? "" : "s") + " (" + r.dropped + " dropped" + (arr.rejected && arr.rejected.length ? ", " + arr.rejected.length + " line" + (k === 1 ? "" : "s") + " not understood: line " + arr.rejected.join(", ") : "") + ")" + (r.note ? " · " + r.note : "")`.
  Examples: `opened arrangement_v1.txt: 13 clips (0 dropped)`; `opened syn.txt: 5 clips (1 dropped)`; `opened old.json: 13 clips (0 dropped) · made for a different video (teaser_v8.mp4, 46.000 s)`.
- `changed()` persists to localStorage as usual: the opened arrangement is the new remembered state. Reset to defaults keeps working (button shown because `S.restored = true`).
- `restoreSerialized(saved)`: `r = C.restoreState(saved, S.manifest)`; same lane-status/zoom copy; `S.st = r.state; applyAudible(); changed(true);`.

### 4.4 App — undo (RULINGS-2 ruling 8 shape, wired for Open only)
`S.undo = null | { label, restore }`. `renderStatus` shows `#btn-undo` iff `S.undo`. `changed()` clears it first thing (so Open sets `S.undo` AFTER its `changed(true)`, then `renderStatus()` via `say`). `#btn-undo` click: `const u = S.undo; S.undo = null; u.restore(); say("back to the clips before " + u.label);` → e.g. `back to the clips before opening arrangement_v1.txt`. Any later change (edit, +, Delete, M, Reset, another Open) clears the button. The RULINGS-2 executor adds Delete and Reset to this same mechanism; it must not create a second one. «Ruling 4, 2026-09-25»: the M handler in `buildLanesDom` calls `changed(); renderStatus();` (not `persist()`), so M clears Undo and hides the button at once; S keeps `persist()` (solo is listening-only and never clears Undo); `unloadKit` sets `S.undo = null` so a stale Undo cannot outlive the kit; both handlers look the lane up with `laneOf(l.id)` at click time (RULINGS-4 ruling 1).

### 4.5 App — save and how-to
- `#btn-save-arr` → `saveArrangement()`: `now = new Date(); name = C.arrangementFileName(now); text = C.formatArrangementJson(S.st, S.manifest.kit, { created: C.arrangementStamp(now), note: "" })` «Ruling 3, 2026-09-25»; `Blob([text], {type: "application/json"})`, temporary `<a download=name href=objectURL>`, click, revoke after 1 s; `say("saved " + name + " (" + n + " clips) to your Downloads folder; move it into teaser/arrangements/")`. Disabled until a kit is loaded.
- HOWTO «Ruling 4, 2026-09-25»: the array stays at EIGHT entries (a 9th entry hid the whole how-to behind "press ? for the how-to" at 1440x900 and 1920x990 — measured in RULINGS-4 ruling 2). Entry 7 (exact): `"Copy list gives one line per clip to paste into chat. Save arrangement keeps your clips and mutes in a small file; Open arrangement brings them back, Undo undoes that."` Entry 8 (exact): `"Lanes A (strings + other) and B (piano + drums + bass + other) split the same bed: unmute one split OR the bed, not both. Play is right to about a frame; stepping is exact."` Entries 1–6 unchanged (Ruling 2 rewrites entry 3 later; it fits with these). `tests/e2e.mjs` asserts `howtoShown` true at 1440x900, 1920x1080, 1920x990 and false at 1440x810, 1000x800.
- Keys: none added.

### 4.6 Converter script `tests/convert-arrangement.mjs`
`node tests/convert-arrangement.mjs <in.txt|in.json> <manifest.json> <out.json> "<created>" "<note>"`. Extracts the core block exactly like `teaser-lanes.test.mjs` (regex on `teaser-lanes.html` next to `tests/`), `manifest = parseManifest(<manifest.json text>)`, `parseArrangement`, `applyArrangement(arr, manifest)`, `formatArrangementJson(state, manifest.kit, {created, note})` «Ruling 3, 2026-09-25», writes `out.json` (LF), prints `wrote <out>: <n> clips, <dropped> dropped, muted: <ids joined by ", ">` and exits 1 if `dropped > 0` or lines were rejected. No dependencies.

## 5. Unit tests to add (`teaser-lanes.test.mjs`; literals only, never computed with the function under test)
Fixtures under `tests/fixtures/`: `arrangement_v1.txt` (verbatim copy of Nathan's file, md5 `64d40cbf…`), `arrangement_v1.json` (the §4.2 text, md5 `ddc156dd…`), `manifest-real.json` (copy of `kit/manifest.json`, md5 `e1233d06…`), `syn.txt` (§6.1). Read them with `readFileSync(join(here, "tests", "fixtures", …))`.
1. `parseClipLine` table: Nathan's logo line → `{track:"logo", in:0, out:6.5, at:0, gain:0.85, fade_in:0, fade_out:0.5, muted:true}`; bed line 2 → `fade_in 2.5, fade_out 1, muted false`; e5 line → `gain 0.3, fade_in 2`; a Ruling-2-style line `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45, muted, cut by the video end at 47.600 s)` → `gain 0.45, muted true`; `b-drums: … (gain 1, muted, file missing)` → ok, muted true; the header line → `null`; `"" ` → `null`; `bed: source 0-1 s -> render 0-1 s (gain 1, loud)` → `{bad: true}`; `Bed: source …` (capital) → `null`.
2. `parseArrangementText(arrangement_v1.txt)`: 13 clips; `rejected` `[]`; `muted` deep-equals `{logo:true, bed:false, "a-strings":true, "a-other":true, "b-piano":false, "b-drums":false, "b-bass":true, "b-other":true, e5:false}`; clips[3] deep-equals `{track:"a-strings", in:0, out:15.047, at:35, gain:0.45, fade_in:0, fade_out:0}` (raw, pre-clamp); clips[12].track `"e5"`.
3. Tolerance: the same text with the header replaced by the Ruling-2 header (`…render = the video's; muted = leave that clip out`) and `, cut by the video end at 47.600 s` appended inside the parentheses of the three 35.000 lines → identical `clips` and `muted` (deep-equal to case 2). CRLF version of the file → identical. A file with two junk lines added → same clips, `rejected` lists their 1-based line numbers only when they LOOK like clip lines with a bad part (e.g. `bed: source 0-1 s -> render 0-1 s (gain 1, loud)` → rejected `[16]`); plain prose lines are just ignored (rejected `[]`).
4. `parseArrangementText("hello\nworld\n")` throws containing `no clip lines found`; `parseArrangement("")` and `parseArrangement("  \n")` throw `the file is empty`.
5. `parseArrangement(arrangement_v1.json)`: `kind "json"`, 13 clips, `muted` as in case 2, `video.duration_s 47.6`, `kit "teaser-lanes"`, `created "2026-09-24 21:49"`.
6. JSON errors (`throwsWith`): `{"format":"x","clips":[]}` → `not a teaser-lanes arrangement`; `{"format":"teaser-lanes-arrangement","version":2,"clips":[]}` → `unknown arrangement version 2`; `{"format":"teaser-lanes-arrangement","version":1}` → `"clips" is missing`; `…"clips":[{"track":"bed","in":"a","out":1,"at":0}]` → `clip 1: in is not a number`; `…"clips":[{"in":0,"out":1,"at":0}]` → `clip 1: track is missing`; `…"clips":[],"muted":5` → `"muted" is not an object`; `{` → `not valid JSON`; `[1,2]` → `not a JSON object`. Extra keys (`"colour":"blue"`, clip `"id":"c9"`) are ignored (no throw, clip count right).
7. `applyArrangement(parseArrangement(arrangement_v1.txt), parseManifest(manifest-real.json))`: `dropped 0`, `state.clips.length 13`, `state.clips[3]` deep-equals `{id:"c4", track:"a-strings", in:0, out:15.0465, at:35, gain:0.45, fade_in:0, fade_out:0}`, `note ""`, lanes muted exactly `[logo, a-strings, a-other, b-bass, b-other]`, every `solo === false`. Same with the JSON fixture → deep-equal states. Then `formatClipList(state)` split on `\n`, drop line 0, strip `/, cut by the video end at [0-9.]+ s/g` from each line → equals the txt's lines 2–14 exactly (13 literal lines from the file, compared as strings).
8. Round trip JSON: `formatArrangementJson(applyArrangement(parseArrangement(J), M).state, M.kit, {created: "2026-09-24 21:49", note: <the §4.2 note>}) === J` «Ruling 3, 2026-09-25» where `J` = the fixture text (byte-identical, including the final `\n`). Also `formatArrangementJson` on `buildState(syntheticManifest)` after applying the §6.1 fixture, with `syntheticManifest.kit` (`"teaser-lanes"`) and `{created:"CREATED", note:""}`, equals the §4.1 literal (write it in the test) «Ruling 3, 2026-09-25».
9. Ordering and determinism: a state whose `clips` array is `[e5 clip, bed at 20, bed at 1, logo]` formats with clips in lane order then `at` (`logo, bed 1, bed 20, e5`); calling twice gives identical strings; a lane with `solo: true, muted: false` writes `false`. Every call in this case passes `"teaser-lanes"` as `kit`; one extra assert: `kit` passed as `undefined` writes the line `  "kit": "",` (writer rule of §4.1) «Ruling 3, 2026-09-25».
10. `applyArrangement` notes: `arr.video = {name:"teaser_v8.mp4", fps:30, duration_s:46}` → note `made for a different video (teaser_v8.mp4, 46.000 s)`; `arr.video = {file:"other.mp4", fps:30, duration_s:47.6}` → `""` (file names not compared); `arr.kit = "x"` (video matching) → `made for kit x`; a clip on lane `ghost` → `dropped 1`, others kept; a clip with `at: 47.6` → dropped; a clip `{in:0,out:15.047,at:35}` on a-strings → kept, `out 15.0465`.
11. `arrangementFileName(new Date(2026, 8, 24, 21, 49))` === `arrangement_20260924-2149.json`; `arrangementStamp(same)` === `2026-09-24 21:49`; `(new Date(2026, 0, 5, 9, 7))` → `arrangement_20260105-0907.json`.
12. Hygiene additions: `html` contains `id="btn-open-arr"`, `id="btn-save-arr"`, `id="btn-undo"`, `id="arr-input"` exactly once each; `HOWTO` array has 8 entries «Ruling 4, 2026-09-25»: take the text between `const HOWTO = [` and the next `];`, count its lines that start with four spaces and a `"` → 8; entry 7 starts with `Copy list gives one line per clip` and contains `Save arrangement`; entry 8 starts with `Lanes A (`.
13.–16. «Ruling 4, 2026-09-25» (exact expectations in RULINGS-4 step 7): `parseArrangement("[1,2]")` throws `no clip lines found` and a text file starting with `[my notes]` opens (kills O11); a clip line with no render end → `null`; `applyArrangement` with `video: {}` or `video: {name: "x.mp4"}` → note `""`; `"version": "1"` → `unknown arrangement version "1"`.
Expected: `ALL PASS: <142 + N>/<142 + N>` in the cloud AND in the VM (`cd $HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes && node teaser-lanes.test.mjs`); state N (about 50).

## 6. Browser tests
### 6.1 Fixture `tests/fixtures/syn.txt` (Ruling-2 header on purpose; one unknown lane; LF; final newline)
```
teaser-lanes · video.webm · 30 fps · 60.000 s · times in seconds; source = that sound's own clock, render = the video's; muted = leave that clip out
logo: source 0.000-1.000 s -> render 0.000-1.000 s (gain 0.85, fade out 0.2 s)
bed: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45)
bed: source 0.000-5.000 s -> render 20.000-25.000 s (gain 0.45, fade in 0.5 s, fade out 1 s, muted)
a-strings: source 2.000-10.000 s -> render 44.000-52.000 s (gain 0.6)
e5: source 0.000-3.000 s -> render 2.000-5.000 s (gain 1)
ghost: source 0.000-1.000 s -> render 0.000-1.000 s (gain 1)
```
Expected copy-list clip lines after opening it (today's page; compare after stripping the cut part, header checked only by `startsWith("teaser-lanes · video.webm · 30 fps · 60.000 s")`):
```
logo: source 0.000-1.000 s -> render 0.000-1.000 s (gain 0.85, fade out 0.2 s)
bed: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45, muted)
bed: source 0.000-5.000 s -> render 20.000-25.000 s (gain 0.45, fade in 0.5 s, fade out 1 s, muted)
a-strings: source 2.000-10.000 s -> render 44.000-52.000 s (gain 0.6)
e5: source 0.000-3.000 s -> render 2.000-5.000 s (gain 1)
```
(bed line 1 gains `muted`: the flag is per lane, OR over its lines. b-drums stays muted by default and has no clip.)

### 6.2 `tests/e2e.mjs` additions (synthetic kit; in the 1440x900 pass only unless said)
A. Empty state (near line 77, before the kit is set): `#btn-open-arr` and `#btn-save-arr` disabled; dispatch a synthetic drop of `syn.txt` on `#main` (`DataTransfer` + `File` built in `page.evaluateHandle`) → `#status-text` contains `open the kit folder first`.
B. After the kit is loaded: both buttons enabled.
C. In block 10, right after the check `Delete removes it again` (7 clips, a-strings muted): `setInputFiles("#arr-input", fixtures/syn.txt)`; wait for `#status-text` to contain `opened syn.txt`; checks: status contains `opened syn.txt: 5 clips (1 dropped)`; `body[data-clips] === "5"`; bed lane has class `muted`, a-strings does NOT, b-drums does; no lane has class `solo`; `#btn-undo` visible; `#btn-reset` visible; Copy list text: header startsWith as above and the 5 clip lines equal §6.1 (cut part stripped); `#copy-panel` closed again (Escape).
D. Undo: click `#btn-undo` → `data-clips === "7"`, a-strings muted again, status contains `back to the clips before opening syn.txt`, `#btn-undo` hidden. Then `+` on logo → `#btn-undo` still hidden (a change clears nothing that is not there; sanity) and Delete it.
E. Re-open `syn.txt` (5 clips). Drop path: dispatch the synthetic drop of `syn.txt` with the kit loaded → status `opened syn.txt` again (if `dataTransfer.files` is empty on the synthetic event in headless, log `drop not testable in Playwright` and count the check as skipped-with-note, not FAIL — §9).
F. Save: `const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#btn-save-arr")])`; `dl.suggestedFilename()` matches `/^arrangement_\d{8}-\d{4}\.json$/`; read `await dl.path()`; text with its `"created": "…"` value replaced by `CREATED` equals the §4.1 literal byte for byte; status contains `saved arrangement_` and `(5 clips)`.
G. Re-open the downloaded file via `setInputFiles("#arr-input", <path>)` → status `opened arrangement_….json: 5 clips (0 dropped)`, `data-clips 5`, same copy list as C, same mute classes.
H. Corrupt files (each via `setInputFiles`, each leaves `data-clips === "5"` and shows `⚠ could not open <name>: …`): `garbage.txt` (`hello\nworld\n`) → `no clip lines found`; `empty.json` (0 bytes) → `the file is empty`; `wrongtag.json` (`{"format":"x","clips":[]}`) → `not a teaser-lanes arrangement`; `badclip.json` (`{"format":"teaser-lanes-arrangement","version":1,"clips":[{"track":"bed","in":"a","out":1,"at":0}]}`) → `clip 1: in is not a number`; `ghost.json` (valid file, one clip on lane `ghost` only) is NOT an error: it opens with 0 clips kept → status `opened ghost.json: 0 clips (1 dropped)`, `data-clips "0"`; then Undo → `data-clips "5"`.
I. Persistence: `page.reload()`, reopen the kit → status `restored`, `data-clips 5`, bed muted (the opened arrangement is the remembered state). Then Reset → 7.
J. Screenshots to LOOK at: `arr-1440x900.png` (right after C, Copy panel closed, status showing `opened syn.txt: 5 clips (1 dropped)` and the Undo button) and, in a separate context at viewport 1100x800 (side layout minimum; load kit, open `syn.txt`), `arr-1100x800.png`. State in the report: both button labels fully readable and not wrapped, `?` button still visible, `#kit-info` ellipsized or not, status text and Undo button readable, nothing overlapping (also run the existing no-overlap `boxes` assertion at 1100x800 with `#topbar` and `#status` added to the set for that context).
K. The zero-console-errors check must still pass. Expected total `ALL PASS: <322 + N>` — state N.

### 6.3 `tests/e2e-real.mjs` additions (copy of the real kit: 9 wavs + manifest patched to `video.webm`, re-staged in one call ≈ 42.5 MB)
After the existing default-list check: open `tests/fixtures/arrangement_v1.txt` → status `opened arrangement_v1.txt: 13 clips (0 dropped)` (no "different video" note: fps and duration match; the file name differs and is not compared); `data-clips 13`; lanes with class `muted` exactly `logo, a-strings, a-other, b-bass, b-other`; Copy list lines 2–14 (cut part stripped) equal the fixture's lines 2–14 as literal strings read from the fixture file. Open `tests/fixtures/arrangement_v1.json` → same three checks. Save → downloaded JSON parsed: `clips` deep-equals the fixture JSON's `clips`, `muted` deep-equals its `muted`, `video.duration_s 47.6`, `format` tag right. Screenshot `real-arr-1440x900.png` (LOOK: 13 blocks over 9 lanes, five lanes dimmed as muted, status line). Expected `ALL PASS: <69 + N>`.

### 6.4 Mutation check `tests/mutants-open.mjs` (node, no deps)
Takes `<toolDir> <outDir>`; for each mutant copies `teaser-lanes.html`, `teaser-lanes.test.mjs` and `tests/fixtures/` into `<outDir>/oNN/`, applies one `find → replace` on the html (exit 1 with `ANCHOR MISSING oNN` if `find` is absent or not unique), runs `node teaser-lanes.test.mjs` there, and prints a table `id | what | killed/SURVIVED`. Mutants (write the exact strings after you have written the code): O1 in/out swapped in `parseClipLine`; O2 `fade in` part never stored; O3 `muted` part ignored (lane flag never true); O4 `clips.slice(1)` before return in `parseArrangementText` (off-by-one count); O5 JSON writer omits `fade_out`; O6 format-tag check removed (`format !==` → `false &&`); O7 `applyArrangement` duration tolerance `0.0015` → `10`; O8 JSON writer sort removed; O9 `dropped` never counted (`restoreState` untouched — instead `note` built with `||` instead of `&&`? no: mutate `applyArrangement` to return `dropped: 0`); O10 `arrangementFileName` month not zero-padded / off by one (`getMonth()` without `+ 1`); O11 `parseArrangement` treats a leading `[` as JSON too — NOT equivalent «Ruling 4, 2026-09-25»: `parseArrangement("[1,2]")` must throw `no clip lines found` (text branch) and a `.txt` starting with `[` must open; unit case 13 kills it. Harness signature is now `node tests/mutants-open.mjs <toolDir> <outDir> <synKitDir> [ids]`: a mutant that survives the unit suite is run through `tests/e2e.mjs` on the synthetic kit (`killed (e2e)`); mutants O12–O20 (blocker M/S, M clears Undo, `changed()` clears `S.undo`, empty `created`, stale Undo on unload, drop routing, video guard, version quotes) are listed with exact strings in RULINGS-4 step 10. Expected: O1–O11, O19, O20 killed (unit); O12–O18 killed (e2e); `ANCHOR MISSING` 0; SURVIVED 0. Paste the table into the report.

## 7. Documentation
- Tool `README.md` «Ruling 4, 2026-09-25»: line 5 → `It plays live and writes no audio; what comes out is a plain-words clip list you paste into chat, plus a small arrangement file if you press Save arrangement. Chrome or Edge only.`; step 6 → `6. **Copy list** gives one line per clip; paste it into chat. Clips and mutes are remembered in this browser; **Reset to defaults** restores today's teaser sound. Nothing is written to disk except the file **Save arrangement** downloads (step 8).`; the mutants-open row → `node tests/synthetic-kit.mjs tests/out/synkit && node tests/mutants-open.mjs . tests/out/mut tests/out/synkit`. Use step 8 (one line): `8. **Save arrangement** downloads your clips and mutes as a small .json file; keep it in `teaser/arrangements/<version>/`. **Open arrangement** (or dropping the file on the page) opens such a file, or a pasted clip list saved as .txt, and replaces what is on the lanes; **Undo** in the status line brings the previous clips back.` Test table: update the three counts, add a row `| convert a clip list or arrangement to .json | `node tests/convert-arrangement.mjs <in.txt> kit/manifest.json <out.json> "<created>" "<note>"` | anywhere with node >= 20 |` and a row for `node tests/mutants-open.mjs . tests/out/mut`. "Known limits": add `- An arrangement file stores clips and M mutes only (solo is listening, not saved); opening one replaces the lanes (one-step Undo).` Nathan-only list: add `Dropping a .json/.txt arrangement file on the page (the cloud test used a synthetic drop event).`
- `teaser/arrangements/README.md`: table row `| `arrangement_v1/arrangement_v1.json` | 2026-09-24 | The same arrangement as a file the tool opens (Open arrangement); made from the .txt by `tools/teaser-lanes/tests/convert-arrangement.mjs`, nothing edited. |`. New section before "Versions": `## Open one in the tool` — two lines: `In `../../tools/teaser-lanes/teaser-lanes.html`, open the kit, then press **Open arrangement** and pick the folder's `.json` (or the `.txt`; both work) — or drop the file on the page. **Save arrangement** downloads a new `arrangement_YYYYMMDD-HHMM.json`; move it into a new `arrangement_vN/` folder here.` And in "Notes on v1": `- `arrangement_v1.json` holds the same 13 clips; `15.047` s source ends are stored as `15.0465` (the exact file length; the list rounds it to 15.047).`
- `EXECUTOR-REPORT.md` (cycle folder): append `## Open/save arrangement (2026-09-24)` with commands, counts, md5 table (cloud vs PC for every landed file), the mutation table, the screenshots looked at and what they show, the readout row. Do not rewrite earlier sections.

## 8. Coexistence with RULINGS-2 (not yet applied to the page)
Your feature must work on today's page and stay valid after RULINGS-2 lands. The parser ignores the header line and the `cut by the video end at … s` part, and reads `muted` per lane — both list variants open identically. Tests compare clip lines with the cut part stripped, so they hold under either `formatClipList`. Regions both change: HOWTO array (RULINGS-2 rewrites line 3; you add line 8), `changed()` (RULINGS-2 wants `S.undo` cleared there — you do it), the footer Undo button and `S.undo` shape (yours; RULINGS-2 ruling 8 reuses it for Delete/Reset), `renderStatus`. Write these four in the report under "merge notes for the Ruling-2 executor" with the final line numbers. Do NOT apply anything from RULINGS-2 yourself.

## 9. Stop-on-ambiguity list — pre-decided
| Likely call | Decision |
|---|---|
| Header of the txt/list says a different video/fps | Header is ignored entirely; no check, no note. Only a JSON `video` block can produce the "different video" note. |
| JSON made for another kit/video | Open anyway, add the note (§4.1). Never refuse. |
| Clip line whose render end does not equal start + length | Accept; the source range and the start win; end ignored. |
| Clip line with an unknown part (`loud`, a typo) | Line rejected and counted (`n lines not understood: line k`); the rest opens. Zero usable lines → error, state untouched. |
| Lane with clip lines, none `muted` | lane.muted = false. Lane without clip lines → manifest default (via `restoreState`). |
| Clip past the video end (35.000-50.047) | Kept (validateClip allows it), drawn clipped; 0 dropped. |
| `out` 15.047 vs `source_len_s` 15.0465 | Clamped to 15.0465 by `validateClip` (warning, not an error); prints 15.047 again. Not reported in the status. |
| Solo state on open | All lanes `solo = false`; solo is never written to a file. |
| Open before a kit is loaded | Buttons disabled; a drop says `open the kit folder first, then the arrangement`. No queueing. |
| Where does Save write | Browser download (Chrome's Downloads folder); Nathan moves it. No File System Access API. |
| Trailing newline in the JSON | Exactly one `\n` at the end. Copy list unchanged (none). |
| Where the JSON's top-level `"kit"` comes from | Always the caller's `manifest.kit`, passed as the second positional argument of `formatArrangementJson(state, kit, meta)` (`S.manifest.kit` in the app, `manifest.kit` in the converter and tests). Never read from `state`; `buildState`/`restoreState` are not touched for it. «Ruling 3, 2026-09-25» |
| `created` time zone | Local time, `YYYY-MM-DD HH:MM`, no seconds, no zone. |
| Undo depth | One step, Open only (RULINGS-2 adds Delete/Reset). Any change clears it. |
| HOWTO ≤ 8 lines (cycle brief §6.7) | Stays 8 «Ruling 4, 2026-09-25» (§4.5 texts). `howtoShown` is a hard e2e check: true at 1440x900, 1920x1080, 1920x990. If it fails, STOP with the measured `#howto` clientHeight/scrollHeight — do not lengthen or add entries. |
| Two buttons do not fit the top bar at 1100 px (label wraps or `?` pushed out) | Shorten the labels to `Open arr.` / `Save arr.` with `title="Open arrangement"` / `"Save arrangement"` and say so in the report. Not below 1100 px (stacked layout scrolls anyway; kit-info may vanish to 0 width, that is fine). |
| Synthetic drop event has no `files` in headless | Log `drop not testable in Playwright`, no FAIL; goes on the Nathan-only list. |
| Playwright download is not fired (headless `acceptDownloads`) | Create the context with `acceptDownloads: true`. If still nothing → STOP with the console output. |
| `page.setInputFiles` on `#arr-input` rejected because of `accept` | Playwright ignores `accept`; if it errors, remove `accept` (keep the `.json,.txt` note in the button title) and report. |
| Existing check counts change (142/322/69) | Expected; state the new totals in the README table and the report. |
| An anchor in §3 is off by a few lines | Same code within ±10 lines → proceed, note the real line; otherwise STOP. |
| Kit on the PC lacks `name` in `video` | It has it (verified, md5 above). If the manifest md5 differs, still proceed if `video.name` exists; else the JSON's `name` equals `file` (writer rule) and the §4.2 literal will differ → STOP with the diff. |
Anything else that changes a number, a format, a file location or a rule → STOP, report verbatim.

## 10. Phases and checkpoints
- **A. Core + unit tests (cloud).** Copy the four fixtures (verbatim copies: `md5sum` equal to §1/§4.2 values; write `syn.txt` from §6.1). Implement §4.1; add §5 cases. Checkpoint: `node teaser-lanes.test.mjs` → `ALL PASS: <142+N>`; the §5.8 byte-identical round trip passes against the §4.2 literal saved as the fixture.
- **B. App (cloud).** §3 regions, §4.3–4.5. Checkpoint: unit suite still ALL PASS (hygiene: page < 160 KB, no CR, ids once each).
- **C. Converter + Nathan's file.** Write `tests/convert-arrangement.mjs`; land page + tests + fixtures on the PC (`device_commit_files`, md5 table); in the VM: `cd $HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes && node tests/convert-arrangement.mjs ../../teaser/arrangements/arrangement_v1/arrangement_v1.txt kit/manifest.json ../../teaser/arrangements/arrangement_v1/arrangement_v1.json "2026-09-24 21:49" "converted from arrangement_v1.txt (Nathan's first hand-tweaked arrangement, 2026-09-24) by tests/convert-arrangement.mjs"`. Expected print: `wrote …/arrangement_v1.json: 13 clips, 0 dropped, muted: logo, a-strings, a-other, b-bass, b-other`; `md5sum` of the written file == `ddc156dd39e341b3e41937ba50a82fdb` == `tests/fixtures/arrangement_v1.json`; `node teaser-lanes.test.mjs` in the VM → ALL PASS. Any other md5 → `diff` against the fixture and STOP with the diff.
- **D. Browser (cloud).** `node tests/synthetic-kit.mjs <dir> && node tests/e2e.mjs <dir> <out>` → `ALL PASS: <322+N>`, zero console/page errors; LOOK at `arr-1440x900.png`, `arr-1100x800.png`; re-stage the real kit (9 wavs + manifest, ≈ 42.5 MB, one call), patch `video.file` to the webm stand-in, `node tests/e2e-real.mjs <dir> <out>` → `ALL PASS: <69+N>`; LOOK at `real-arr-1440x900.png`. Then `node tests/mutants-open.mjs . tests/out/mut` → all killed (or stated ACCEPT), `ANCHOR MISSING` 0. Copy the three screenshots and the reports to `cycles/19_teaser-sound-lanes/shots/`.
- **E. Land + docs.** Land every changed file (page, unit test, `tests/e2e.mjs`, `tests/e2e-real.mjs`, `tests/convert-arrangement.mjs`, `tests/mutants-open.mjs`, `tests/fixtures/*`, tool `README.md`); write the two README changes (§7) on the mount; md5 PC == cloud for each; VM: `node teaser-lanes.test.mjs` ALL PASS; `file` / BOM check on every changed file; av-align md5s unchanged; `GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows only `tools/teaser-lanes/`, `teaser/arrangements/` and the cycle folder. Append the report section (§7) with the readout row.

## 11. INSPECT checklist (fresh-context Opus, adversarial; reruns everything itself)
1. Rerun the three suites in the cloud and the unit suite in the VM; counts match the README table.
2. `md5sum` of `arrangement_v1/arrangement_v1.json`, `tests/fixtures/arrangement_v1.json` (both `ddc156dd…`), `tests/fixtures/arrangement_v1.txt` (`64d40cbf…`), av-align (three md5s), every landed file cloud vs PC.
3. Read `parseClipLine`: the regex is anchored (`^…$`), lane id class `[a-z0-9-]`, the render end is ignored, an unknown part rejects the line; `parseArrangement` never looks at the extension.
4. Open the real fixture in a browser run and confirm the copy list's 13 clip lines equal the txt's (cut part stripped) — do not trust the executor's literal.
5. Confirm `formatClipList`, `validateClip`, `restoreState`, `stepTo`, `addClip`, the engine and `av-align` are untouched (diff the page against the pre-change copy; only the §3 regions differ).
6. Undo: state before Open is restored exactly (clip count, mutes, selected clip null); any later change hides the button; `S.undo` is set after `changed(true)`, not before.
7. Solo never reaches a file: a saved JSON from a state with a soloed lane writes `false`, and opening clears solo.
8. LOOK at the three screenshots yourself: labels plain and whole, no overlap at 1100x800, status readable.
9. Run `tests/mutants-open.mjs` yourself; add two mutants of your own (e.g. render-end regex made optional; `muted` OR → AND) and report.
10. Rule compliance: no deletes, no commit, nothing outside the three allowed folders, LF/no BOM, page < 160 KB, no external URLs, `.gitattributes` untouched.

## 12. Decisions taken for Nathan (plain words)
- **One small file, two ways to open it.** Your arrangement is saved as a `.json` text file next to your `.txt`. The tool opens both, so your existing `arrangement_v1.txt` already works — pick it with Open arrangement or drop it on the page.
- **Save goes to Downloads.** The browser cannot write into your project folder by itself; Save arrangement downloads `arrangement_<date>-<time>.json`, you move it into `teaser/arrangements/`. The clip list (Copy list) stays as it is; the file is for reopening, the list is for chat.
- **Opening replaces what is on the lanes**, and one Undo in the status line brings the previous clips back. The opened arrangement is also what the browser remembers for next time (Reset to defaults still returns to today's teaser sound).
- **Mutes are saved, solo is not.** M means "leave that clip out" (as Ruling 2 says) and travels with the file; S is for listening and is switched off on open.
- **Files made for another video** still open, with a note in the status line saying which video they were made for. Clips on a lane the kit does not have are left out and counted (`1 dropped`).
- **Clips that run past the end of the video** (your 35–50 s ones) are kept, as before: they play until the video stops.
- The list's `15.047` is the whole file (15.0465 s); the `.json` stores the exact 15.0465 and the list keeps printing 15.047.
- The how-to stays at eight lines so it fits a 1440x900 laptop screen; the Copy-list line now also says what Save arrangement, Open arrangement and Undo do «Ruling 4, 2026-09-25».
- This changes the earlier decision "no JSON export/import" (cycle brief §13.9), on your request.
