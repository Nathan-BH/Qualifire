# RULINGS-3 — open/save arrangement brief (Plan tier, Fable, fresh context)

## Ruling 3 — 2026-09-25 — where `formatArrangementJson` gets the top-level `"kit"`

**Stop forwarded (Sonnet executor, EXECUTOR-REPORT-open-arrangement.md, Phase A, no file touched):** `formatArrangementJson(state, meta)` has no documented source for the required top-level `"kit"` field; both quoted call sites pass two arguments; `state` never carries a kit id.

**Verified on the live page** (`tools/teaser-lanes/teaser-lanes.html`, md5 `cd0bf7d96d98bf2ebd12935a0cc42ba8`, 1334 lines): the executor is right.
- `buildState(manifest)` (436–445) returns `{video: manifest.video, groups, lanes, clips, sel, zoom}` — no `kit`; `restoreState` (452–465) rebuilds from `buildState` and adds nothing.
- `manifest.kit` is read directly off a manifest object only: `stateKey` (446) and `#kit-info` (1133). `parseManifest` (389 ff.) deep-copies the manifest and keeps `kit` untouched (not validated).
- The app holds the loaded manifest in **`S.manifest`** (`S` object 523–527; set at 1120, cleared at 1074; used as `C.stateKey(S.manifest)`, `C.buildState(S.manifest)` in the Reset handler 1286–1293).
- Both manifests carry `kit: "teaser-lanes"` (`kit/manifest.json` line 2; `tests/synthetic-kit.mjs` line 38).

**Decision: option (1).** `formatArrangementJson` takes the kit id as an explicit second positional argument; the two quoted call sites in the brief were incomplete. Options (2) and (3) are rejected: (2) would change `buildState`/`restoreState` output — regions the brief lists as untouched and outside the §3 anchors (INSPECT item 5 would fail, and it would alter what `serializeState`/localStorage restore see); (3) would drop the `kit` field that `parseArrangementJson`/`applyArrangement` (the "made for kit x" note, unit case 5 and 10) already rely on, and would change two fixtures for no gain. Option (1) is the smallest, most local change: one extra argument read from an identifier that is already in scope at every call site (`S.manifest.kit` in the app, `manifest.kit` in the converter, `M.kit` / the synthetic manifest in tests), zero risk to state-restore behaviour.

### Exact corrected signature
```
formatArrangementJson(state, kit, meta)
```
- `kit`: the loaded manifest's `kit` string (`manifest.kit`). The writer emits the line `  "kit": ` + `JSON.stringify(typeof kit === "string" ? kit : "")` + `,`. It is never read from `state`.
- `meta = {created: string, note: string}` unchanged.
- Key order, whitespace, sorting and every other writer rule of §4.1 unchanged.

### Exact corrected call sites (verbatim lines now in the brief)
- §4.5 app save: `text = C.formatArrangementJson(S.st, S.manifest.kit, { created: C.arrangementStamp(now), note: "" })`
- §4.6 converter: `manifest = parseManifest(<manifest.json text>)`, `applyArrangement(arr, manifest)`, `formatArrangementJson(state, manifest.kit, {created, note})`
- §5.8 round trip: `formatArrangementJson(applyArrangement(parseArrangement(J), M).state, M.kit, {created: "2026-09-24 21:49", note: <the §4.2 note>}) === J`; the §4.1-literal case passes `syntheticManifest.kit` (`"teaser-lanes"`) and `{created:"CREATED", note:""}`.
- §5.9 ordering/determinism: every call passes `"teaser-lanes"`; one extra assert: `kit` passed as `undefined` writes `  "kit": "",`.

### The two literal fixtures — UNCHANGED, md5s recomputed from the brief text (not guessed)
Both literals already contained `"kit": "teaser-lanes"`; only the argument that supplies it was missing. Recomputed with `sed -n <lines> BRIEF | md5sum` before and after the edit:

§4.1 synthetic fixture (`kit = "teaser-lanes"`, `meta = {created: "CREATED", note: ""}`) — **md5 `1e0fee35d507715a571820e35d05d7b3`, 807 bytes, LF, one final `\n`:**
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

§4.2 `arrangement_v1/arrangement_v1.json` (`kit = manifest.kit` of `kit/manifest.json`) — **md5 `ddc156dd39e341b3e41937ba50a82fdb`, 1872 bytes, LF, one final `\n`:**
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

### Every line changed in BRIEF-open-arrangement.md (applied in place, each tagged «Ruling 3, 2026-09-25»; file stays LF, UTF-8, no BOM; 273 → 274 lines)
`diff` of the brief before → after (line numbers are the pre-edit file's):
```
7c7
< Read first (all under `$HOME/mnt/Qualifire/marketing/`): this file; `cycles/19_teaser-sound-lanes/BRIEF-teaser-sound-lanes.md` §1 (hard rules), §5 (core), §6.5, §7, §8, §10; `RULINGS-2.md` rulings 1, 5, 8 (they are NOT applied to the page yet — see §8 here). Spot-check every anchor in §3 with `grep -n` / `sed -n` before editing.
---
> Read first (all under `$HOME/mnt/Qualifire/marketing/`): this file; `cycles/19_teaser-sound-lanes/BRIEF-teaser-sound-lanes.md` §1 (hard rules), §5 (core), §6.5, §7, §8, §10; `RULINGS-2.md` rulings 1, 5, 8 (they are NOT applied to the page yet — see §8 here); `RULINGS-3.md` (ruling 3: the `kit` argument of `formatArrangementJson`, already applied to this brief «Ruling 3, 2026-09-25»). Spot-check every anchor in §3 with `grep -n` / `sed -n` before editing.
85c85
< **`formatArrangementJson(state, meta)`** (`meta = {created: string, note: string}`) → the exact text below, LF, ending with one `\n`. Key order fixed. Top-level keys on their own lines with 2-space indent; `video`, `muted` and each clip are one-line objects written as `{"k": v, "k2": v2}` (one space after `:` and after `,`); clips indented 4 spaces, comma after each but the last; numbers via `JSON.stringify`. `video` = `{file: v.file, name: v.name || v.file, fps, duration_s, frames}`; `muted` = every lane in lane order → `!!lane.muted` (solo ignored); `clips` sorted like the list (lane order, then `at`, then original index), fields `track, in, out, at, gain, fade_in, fade_out` (no `id`). Expected output for the synthetic kit after opening the fixture of §6.1 (with `meta = {created: "CREATED", note: ""}`), md5 `1e0fee35d507715a571820e35d05d7b3`:
---
> **`formatArrangementJson(state, kit, meta)`** (`kit` = the loaded manifest's `kit` string, i.e. `manifest.kit` — the caller always passes it, because `state` carries no kit id; `buildState`/`restoreState` stay untouched. `meta = {created: string, note: string}`) «Ruling 3, 2026-09-25» → the exact text below, LF, ending with one `\n`. Key order fixed. Top-level keys on their own lines with 2-space indent; `video`, `muted` and each clip are one-line objects written as `{"k": v, "k2": v2}` (one space after `:` and after `,`); clips indented 4 spaces, comma after each but the last; numbers via `JSON.stringify`. `kit` (top-level `"kit"`) = `JSON.stringify(typeof kit === "string" ? kit : "")` — the `kit` argument, never read from `state` «Ruling 3, 2026-09-25»; `video` = `{file: v.file, name: v.name || v.file, fps, duration_s, frames}`; `muted` = every lane in lane order → `!!lane.muted` (solo ignored); `clips` sorted like the list (lane order, then `at`, then original index), fields `track, in, out, at, gain, fade_in, fade_out` (no `id`). Expected output for the synthetic kit after opening the fixture of §6.1 (with `kit = "teaser-lanes"` (the synthetic manifest's `kit`) and `meta = {created: "CREATED", note: ""}` «Ruling 3, 2026-09-25»), md5 `1e0fee35d507715a571820e35d05d7b3` (807 bytes; unchanged by Ruling 3 — the literal was already right, only its `kit` source was undocumented):
133c133
< (`15.047` in the txt → `15.0465` here: the clamp of §2; the six `15.047` lines are bed 1, a-strings, a-other 1, b-drums, b-bass, b-other 1. `created` = the txt's mtime on the PC, 2026-09-24 21:49, passed as an argument, never `new Date()`.)
---
> (`15.047` in the txt → `15.0465` here: the clamp of §2; the six `15.047` lines are bed 1, a-strings, a-other 1, b-drums, b-bass, b-other 1. `created` = the txt's mtime on the PC, 2026-09-24 21:49, passed as an argument, never `new Date()`. `kit` = `manifest.kit` of `kit/manifest.json` (`"teaser-lanes"`), passed as the second argument by the converter «Ruling 3, 2026-09-25»; the literal and its md5 `ddc156dd39e341b3e41937ba50a82fdb` are unchanged by Ruling 3.)
148c148
< - `#btn-save-arr` → `saveArrangement()`: `now = new Date(); name = C.arrangementFileName(now); text = C.formatArrangementJson(S.st, { created: C.arrangementStamp(now), note: "" })`; `Blob([text], {type: "application/json"})`, temporary `<a download=name href=objectURL>`, click, revoke after 1 s; `say("saved " + name + " (" + n + " clips) to your Downloads folder; move it into teaser/arrangements/")`. Disabled until a kit is loaded.
---
> - `#btn-save-arr` → `saveArrangement()`: `now = new Date(); name = C.arrangementFileName(now); text = C.formatArrangementJson(S.st, S.manifest.kit, { created: C.arrangementStamp(now), note: "" })` «Ruling 3, 2026-09-25»; `Blob([text], {type: "application/json"})`, temporary `<a download=name href=objectURL>`, click, revoke after 1 s; `say("saved " + name + " (" + n + " clips) to your Downloads folder; move it into teaser/arrangements/")`. Disabled until a kit is loaded.
153c153
< `node tests/convert-arrangement.mjs <in.txt|in.json> <manifest.json> <out.json> "<created>" "<note>"`. Extracts the core block exactly like `teaser-lanes.test.mjs` (regex on `teaser-lanes.html` next to `tests/`), `parseManifest`, `parseArrangement`, `applyArrangement`, `formatArrangementJson(state, {created, note})`, writes `out.json` (LF), prints `wrote <out>: <n> clips, <dropped> dropped, muted: <ids joined by ", ">` and exits 1 if `dropped > 0` or lines were rejected. No dependencies.
---
> `node tests/convert-arrangement.mjs <in.txt|in.json> <manifest.json> <out.json> "<created>" "<note>"`. Extracts the core block exactly like `teaser-lanes.test.mjs` (regex on `teaser-lanes.html` next to `tests/`), `manifest = parseManifest(<manifest.json text>)`, `parseArrangement`, `applyArrangement(arr, manifest)`, `formatArrangementJson(state, manifest.kit, {created, note})` «Ruling 3, 2026-09-25», writes `out.json` (LF), prints `wrote <out>: <n> clips, <dropped> dropped, muted: <ids joined by ", ">` and exits 1 if `dropped > 0` or lines were rejected. No dependencies.
164,165c164,165
< 8. Round trip JSON: `formatArrangementJson(applyArrangement(parseArrangement(J), M).state, {created: "2026-09-24 21:49", note: <the §4.2 note>}) === J` where `J` = the fixture text (byte-identical, including the final `\n`). Also `formatArrangementJson` on `buildState(syntheticManifest)` after applying the §6.1 fixture with `{created:"CREATED", note:""}` equals the §4.1 literal (write it in the test).
< 9. Ordering and determinism: a state whose `clips` array is `[e5 clip, bed at 20, bed at 1, logo]` formats with clips in lane order then `at` (`logo, bed 1, bed 20, e5`); calling twice gives identical strings; a lane with `solo: true, muted: false` writes `false`.
---
> 8. Round trip JSON: `formatArrangementJson(applyArrangement(parseArrangement(J), M).state, M.kit, {created: "2026-09-24 21:49", note: <the §4.2 note>}) === J` «Ruling 3, 2026-09-25» where `J` = the fixture text (byte-identical, including the final `\n`). Also `formatArrangementJson` on `buildState(syntheticManifest)` after applying the §6.1 fixture, with `syntheticManifest.kit` (`"teaser-lanes"`) and `{created:"CREATED", note:""}`, equals the §4.1 literal (write it in the test) «Ruling 3, 2026-09-25».
> 9. Ordering and determinism: a state whose `clips` array is `[e5 clip, bed at 20, bed at 1, logo]` formats with clips in lane order then `at` (`logo, bed 1, bed 20, e5`); calling twice gives identical strings; a lane with `solo: true, muted: false` writes `false`. Every call in this case passes `"teaser-lanes"` as `kit`; one extra assert: `kit` passed as `undefined` writes the line `  "kit": "",` (writer rule of §4.1) «Ruling 3, 2026-09-25».
232a233
> | Where the JSON's top-level `"kit"` comes from | Always the caller's `manifest.kit`, passed as the second positional argument of `formatArrangementJson(state, kit, meta)` (`S.manifest.kit` in the app, `manifest.kit` in the converter and tests). Never read from `state`; `buildState`/`restoreState` are not touched for it. «Ruling 3, 2026-09-25» |
```
Occurrence check: `grep -n "formatArrangementJson("` in the brief → 5 lines (85, 148, 153, 164 ×2), every one now carries the `kit` argument; `grep -c` for the two md5s: 3 lines before, 4 after (the new §4.2 parenthetical repeats `ddc156dd…` to say it is unchanged) — no stale value exists because the values did not change. Mutation section §6.4 and browser sections §6.2/§6.3 construct no `formatArrangementJson` call and need no change (O5/O8 mutate the writer body, not its signature).

### For the executor (resume Phase A)
Implement §4.1 with the three-argument signature; the fixtures and both md5s in the brief are the byte-identical targets exactly as before. Nothing in `buildState`/`restoreState` changes.

| tier | model | tokens | outcome |
|---|---|---|---|
| Plan (ruling) | Fable 5.1 | ≈ 60k | Ruling 3 written; brief corrected in place (11 edits, 8 lines); both md5s recomputed and confirmed unchanged |
