# BRIEF v1 — teaser-lanes: choose the video/kit, default = teaser-full, new kit + provisional arrangement

Plan tier (Fable), 2026-09-26. Executor: Sonnet (stop-on-ambiguity). Inspector afterwards: Opus (fresh context).
Cycle folder: `marketing/cycles/22_teaser-lanes-multi-video-kit/`.

Nathan's ask, verbatim intent: "update the teaser lanes tool to be able to choose which mp4 video you
load, and for now let's pre-load the new render as default. And then let's pre-load a new kit and
arrangement that fits the new render."

## 0. Rules for the executor (read first)

1. **STOP on ambiguity.** If anything below cannot be done exactly as written — a file is not where
   this brief says, a number you measure differs from the one given here, a test you are told must
   pass fails for a reason this brief does not anticipate — do NOT guess. Write what you found into
   `EXECUTOR-REPORT-v1.md` (section 11) under "STOPPED" and end. Chat forwards it to a Fable ruling.
2. **Never delete, never overwrite the old kit.** `tools/teaser-lanes/kit/` (teaser_v9) keeps working
   unchanged; the new kit is a sibling folder. Nothing is `rm`'d; nothing goes to `safe_to_delete/`
   in this cycle. Never call `device_request_delete_permission` (project rule).
3. **The A/B pick (cycle 20 OPEN-ITEMS #3, option-A vs option-B rides) is NOT decided here.** The
   default clips you put in the new kit are a *neutral placeholder* (section 6). Do not copy either
   option file's clips into the manifest, do not edit the two option files, do not word anything as
   "the chosen sound".
4. **The day render is out of scope.** `teaser-full/renders/teaser-full_2026-09-26_09-39-29.mp4` is
   the day render (verified: frame mean luma ≈ 250/255 vs ≈ 10/255 for the night file). Do not
   copy, rename or reference it anywhere except the one OPEN-ITEMS note in section 10.
5. **Extend the test discipline, never bypass it.** Every existing test command in section 8 must
   still pass; new behaviour gets new cases in the same files (or the one new file named there).
6. **Do not put the string `http://` or `https://` anywhere in `teaser-lanes.html`** (comments
   included) — the file-hygiene test `html: no external URL` greps for it. Write `localhost:8765`
   without a scheme. Same for `<script src` and `<link` (also forbidden by that test).
7. Paths. On the device bridge (`device_bash`) the repo is `$HOME/mnt/Qualifire/...`; on Nathan's
   PC the same path is `C:\Users\natha\Claude personal projects\Qualifire\...`. Every PowerShell
   block you write for Nathan (COMMANDS.md, OPEN-ITEMS.md) carries its own full `cd "C:\..."`
   line, uses `powershell -ExecutionPolicy Bypass -File .\x.ps1`, and `npx.cmd` never bare `npx`.
8. Where things run. The `device_bash` VM has python3 + numpy 2.2.6 + ffmpeg/ffprobe + node — that is
   where `prep_kit.py`, `verify_default_mix.py` and `node teaser-lanes.test.mjs` run (the existing
   `kit/` was built there on 2026-09-24, see `kit/prep-report.txt`). It has NO Playwright. The cloud
   sandbox (`Bash` tool) has Playwright 1.56 at `/usr/local/lib/node_modules_global/playwright/`,
   Chromium at `/opt/pw-browsers/chromium-1194/`, node 22, ffmpeg, python3 + numpy 2.4.4 — that is
   where every `tests/*.mjs` browser run goes, on files you stage there (`device_stage_files`) or
   re-create there. Neither can run PowerShell or `npx hyperframes`. `device_bash` calls cap at
   180 s (`timeout_ms: 180000`); `prep_kit.py` took "about a minute" last time (proxy encode alone
   was 41 s for the new video when Plan measured it) — pass the max timeout.
9. Git: mp4 files are never `git add`ed in this repo (all-renders/, renders/, rounds/ mp4s are
   untracked by convention). Add the new kit folder to the tool's `.gitignore` (section 4.3). Do not
   commit; the coordinator does bookkeeping.

## 1. Verified facts (Plan measured these on 2026-09-26; trust them, do not re-derive unless told)

### 1.1 The new render
- Night render: `marketing/silent-studio/teaser-full/renders/teaser-full_2026-09-26_09-36-34.mp4`,
  11,272,229 bytes, **md5 `3db40a137a9d879220879594af053d3f`**.
- ffprobe (v:0): h264, 1920x1080, yuv420p, r_frame_rate 30/1, **nb_frames 1419, nb_read_frames 1419,
  duration 47.300000**; frame pts: first 0.000000, **last 47.266667**; source has 7 keyframes.
- Scenes (root-absolute, from `teaser-full/README.md`): opening 0–6.2, start-ride 6.2–20.2,
  gates-saving 20.2–32.5, ranking 32.5–43.3, closing 43.3–47.3.
- `all-renders/` today: `closing_v5 colours_v5 gates-saving_v9 opening_v3 ranking_v8 ride_v1
  start-ride_v4 teaser_v9` (.mp4). No `teaser-full_*` yet → **the new name is `teaser-full_v1.mp4`**.
  `teaser-full/` has no `rounds/` folder yet (Nathan, cycle 21 OPEN-ITEMS: feedback for teaser-full
  goes in `rounds/`, and teaser-full stays alongside the old `teaser/`, not replacing it).

### 1.2 The proxy the adapted prep_kit.py must produce for it (Plan ran the exact ffmpeg line of
`prep_kit.py` step 3 on the night render, then probed):
- same encode flags → **1419 frames, duration 47.300000, first/last pts 0.000000 / 47.266667,
  max |src−proxy| timestamp diff 0.00000000, 142 keyframes, 16,150,732 bytes (< 40 MB).**
- Formulas (these are what the code must use, not literals): `duration_s = frames / 30`,
  `last_pts = (frames − 1) / 30`, `keyframes = ceil(frames / 10)` (1428 → 143 ✓ matches the old
  hardcoded value; 1419 → 142 ✓ matches the measurement).

### 1.3 How teaser-lanes.html loads a kit today (so you know what "pre-load" can honestly mean)
- Loading is `<input id="kit-input" type="file" webkitdirectory multiple hidden>` (line 196) clicked
  by `#btn-open` / `#btn-open-top` (`wire()`, lines ~1451–1454), or a drop on `window` walked with
  `webkitGetAsEntry()` (`fromDrop`/`walk`, lines ~1339–1354). Both produce
  `entries = [{file: File, path: "kit/…"}]` → `openKit(entries)` (line 1242).
- `openKit` finds the kit root with `C.kitRootOf(paths)` (shortest path ending in `manifest.json`),
  builds `byName` (Map filename → File), parses `manifest.json`, requires `manifest.video.file` to
  be present, then `waitVideo(file)` sets `video.src = URL.createObjectURL(file)` and decodes each
  lane's WAV with `decodeAudioData`. Nothing about the video is hardcoded in the HTML: fps, frames,
  duration and file name all come from the manifest. **So "choose which mp4" is already supported
  by opening a different kit folder** — this cycle makes that explicit and adds the default.
- No File System Access API, no persisted handles, no `fetch()`. `localStorage` is used for
  remembered clips, keyed by `stateKey = "teaser-lanes:" + manifest.kit + ":" + manifest.video.file
  + ":" + track ids` — so two kits never collide in storage as long as `kit` or `video.file` differ.
- `ensureCtx()` creates the AudioContext during `openKit`; `togglePlay()` and `scrubPlay()` both
  call `ctx.resume()` inside a user gesture, so a kit loaded WITHOUT a gesture still plays fine
  after the first click (decodeAudioData works on a suspended context).
- Browser constraint (same mechanism this project hit with HyperFrames sub-compositions): under
  `file://` a page can neither `fetch()` its own sibling files nor open a folder without a click.
  **Zero-click pre-load is only possible when the page is served over http** (a local static
  server). Under `file://` the best that exists is one click + the folder dialog (Chrome cannot be
  told which folder the `<input>` dialog opens in). This brief ships BOTH: the served zero-click
  path (section 5) and the unchanged double-click path with the default kit named on screen.
  Which one Nathan actually uses is his call (section 12, call 1) — nothing here blocks on it.
- Opening an arrangement made for another video is informational, not blocking:
  `applyArrangement` returns `note = "made for a different video (<name>, 47.600 s)"` when fps or
  duration differ by > 1.5 ms, and clips still apply (clamped to the video end). So cycle 20's two
  option files (stamped `kit: "teaser-lanes"`, `duration_s: 47.6`, but with the −0.3 s cascade
  already applied) open on the new kit with that note and otherwise correct timing.

### 1.4 prep_kit.py today (430 lines)
- Module constants: `KIT = HERE/kit`, `REPORT = KIT/prep-report.txt`, `VIDEO_MD5 = "07f9c5…"`,
  `BED_MD5` (audio — leave alone), `PROXY_NAME = "teaser_v9-proxy.mp4"`.
- `proxy_check(src, dst)` (lines ~150–175) hardcodes: `nb_frames == "1428"`, `nb_read_frames ==
  "1428"`, `|duration − 47.6| ≤ 0.001`, `len(ta) == len(tb) == 1428`, `|tb[-1] − 47.566667| ≤ 1e-5`,
  `nk == 143`, size < 40 MB. Codec/size/fps checks (h264, 1920x1080, 30/1) stay as they are.
- `main()` step 3: `vsrc = REPO/marketing/silent-studio/all-renders/teaser_v9.mp4`, md5 must equal
  `VIDEO_MD5` or Stop; proxy is "kept" if `kit/manifest.json` exists with matching `source_md5` and
  `proxy_check` passes; else re-encoded with the fixed ffmpeg line.
- Steps 4–7 (audio decode, E5 render, master reproduction vs `ride_master_v2.wav`, alignment
  guard) do not touch the video. **Unchanged in this cycle except for the output folder.**
- Step 8 manifest: `clips` literals `6.5 / 10.3 / 23.04 / 24.3`, `"kit": "teaser-lanes"`, video
  block literals (`PROXY_NAME`, `"teaser_v9.mp4"`, `47.6`, `1428`, source path, `VIDEO_MD5`, the
  `proxy` sentence with "1428 frame timestamps"), and `notes[]` with literals `24.30`, `6.5`,
  `32.8 = 23.04 + 9.76`, `25.3465`, `teaser_v9.mp4`.
- Those literals are all `ride constant + scene offset`: `ride_tunetank.py` has `T1 = 3.80`,
  `T2 = 16.54`, `RIDE_T0_ABS = 17.80`, `MASTER_DUR = 26.3` (ride_master.py), bed source length
  15.0465 s, and the offset is the teaser time at which start-ride begins: **6.5 for teaser_v9,
  6.2 for teaser-full**. Check: 3.80+6.5 = 10.3, 16.54+6.5 = 23.04, 17.80+6.5 = 24.3,
  26.3+6.5 = 32.8 (old, all match); 3.80+6.2 = 10.0, 16.54+6.2 = 22.74, 17.80+6.2 = 24.0,
  26.3+6.2 = 32.5 = exactly the new gates-saving end (new). Python float sums of these round
  cleanly with `round(x, 4)` (Plan checked: 10.3, 23.04, 24.3, 10.0, 22.74, 24.0).

### 1.5 Tests today
- `node teaser-lanes.test.mjs` — 218 cases; extracts `<script id="lanes-core">` and tests pure
  functions; section 18 = file hygiene (no `https?://`, no `<link`, no `<script src`, size < 160 KB,
  no CR, no BOM, one lanes-core block, title); section 19.12 requires `const HOWTO = [...]` to have
  exactly 8 entries with entry 7 starting `"Copy list gives one line per clip` and entry 8
  starting `"Lanes A (`. Entries 1–6 may be edited in place.
- `python3 verify_default_mix.py` — hardwired to `kit/` and to the shipped soundtracks of the
  47.6 s teaser (spans [6.5, 32.8), [0, 6.5), [32.8, 47.6)). **Stays kit/-only; not adapted.**
- `tests/synthetic-kit.mjs <dir>` + `tests/e2e.mjs <dir> [out]` — 390 checks under `file://`,
  loads via `page.setInputFiles("#kit-input", dir)`. Unaffected by this cycle as long as the
  `file://` path is unchanged and no console errors appear.
- `tests/e2e-real.mjs <copyOfRealKit>` — 86 checks, expectations hardcoded for the teaser_v9
  default (header `47.600 s`, clip lines at 10.300/23.040/24.300, `f729 = 24.300 s`, zoom window
  `[24.05,24.55]`, `savedObj.video.duration_s === 47.6`, and an arrangement-fixture block that
  asserts NO "made for" note — the fixtures are 47.6 s arrangements).
- `tests/mutants-open.mjs`, `tests/convert-arrangement.mjs` — not affected.

## 2. Target state (what exists when you are done)

```
marketing/silent-studio/all-renders/teaser-full_v1.mp4          copy of the night render (md5 3db40a…)
marketing/silent-studio/teaser-full/rounds/v1/teaser-full_v1.mp4 same copy (rounds convention)
marketing/silent-studio/teaser-full/rounds/v1/FEEDBACK.md       stub (section 3)
marketing/audio-studio/tools/teaser-lanes/
  prep_kit.py            per-video table, `python3 prep_kit.py [teaser_v9|teaser-full_v1]`, default teaser-full_v1
  kit/                   UNCHANGED content (rebuilt once as a regression check, byte-identical but `made`)
  kit-teaser-full/       NEW, built by the adapted script (git-ignored)
  kits.json              NEW, committed: which kits exist and which is default (served mode reads it)
  serve.ps1              NEW: Nathan's one-click local server + browser open (untestable here, say so)
  teaser-lanes.html      served-mode auto-load + kit picker; file:// path unchanged; texts updated
  teaser-lanes.test.mjs  new cases for the two new pure functions + hygiene
  tests/e2e-real.mjs     expectations keyed by manifest.kit (teaser-lanes | teaser-full)
  tests/e2e-served.mjs   NEW: Playwright run over a local static server (auto-load + picker)
  .gitignore             + kit-teaser-full/
  README.md              usage/prepare/test sections updated
marketing/cycles/22_teaser-lanes-multi-video-kit/
  COMMANDS.md            Nathan's copy-paste PowerShell blocks (serve, rebuild kits)
  OPEN-ITEMS.md          what only Nathan can verify + the day-render note + the calls in section 12
  EXECUTOR-REPORT-v1.md  your report
  kit-manifest-before.json   copy of kit/manifest.json taken BEFORE you touch prep_kit.py
```

## 3. Step 1 — land the render where the project expects it

```bash
cd "$HOME/mnt/Qualifire/marketing/silent-studio"
md5sum teaser-full/renders/teaser-full_2026-09-26_09-36-34.mp4     # must print 3db40a137a9d879220879594af053d3f — else STOP
mkdir -p teaser-full/rounds/v1
cp teaser-full/renders/teaser-full_2026-09-26_09-36-34.mp4 teaser-full/rounds/v1/teaser-full_v1.mp4
cp teaser-full/renders/teaser-full_2026-09-26_09-36-34.mp4 all-renders/teaser-full_v1.mp4
md5sum all-renders/teaser-full_v1.mp4 teaser-full/rounds/v1/teaser-full_v1.mp4   # both 3db40a…
```
The timestamped original stays in `renders/` (never moved). Do not touch `teaser_v9.mp4` (the old
`teaser` composition stays alongside per Nathan's cycle 21 ruling).

Write `teaser-full/rounds/v1/FEEDBACK.md` with exactly:
```
# teaser-full — round v1

v1 = `renders/teaser-full_2026-09-26_09-36-34.mp4` (night), first real render of the root +
sub-compositions build (cycle 21 v2). 47.3 s, 1419 frames @ 30 fps, md5 3db40a137a9d879220879594af053d3f.
Mirrored to `silent-studio/all-renders/teaser-full_v1.mp4` and fed to
`audio-studio/tools/teaser-lanes/kit-teaser-full/` (cycle 22).

## Feedback (Nathan)

(empty — write per-beat notes here)
```

Also edit the last paragraph of `teaser-full/README.md`: replace the sentence starting
`**Not yet rendered**` with: `**Rendered 2026-09-26** — round v1 lives in `rounds/v1/` (night
render, 47.3 s / 1419 frames); feedback goes in `rounds/v1/FEEDBACK.md`. Cycle 21's `OPEN-ITEMS.md`
still holds the lint/snapshot/render commands.` Keep the rest of that paragraph (the v1-archive
sentence and the build-recipe line).

## 4. Step 2 — prep_kit.py: the source video becomes a table entry + CLI argument

### 4.1 Constants → table
Replace the three lines `KIT = …`, `REPORT = …`, `VIDEO_MD5 = …`, `PROXY_NAME = …` (keep `SR`,
`BED_MD5`) with:

```python
FPS = 30
GOP = 10                                  # keyframe every GOP frames (the -g / -keyint_min value below)
# One entry per source video the kit can be built from. Everything the checks and the manifest need
# about the video is derived from `frames` + the constants above; nothing video-specific is hardcoded
# elsewhere in this file. `ride_offset_s` = the teaser time at which start-ride begins = what the
# ride clock (ride_tunetank.py / ride_master.py) is shifted by; `opening_len_s` = the opening's length.
VIDEOS = {
    "teaser_v9": dict(
        kit_dir="kit", kit_id="teaser-lanes",
        source="marketing/silent-studio/all-renders/teaser_v9.mp4",
        md5="07f9c5b495519c97cdec3987decc027f",
        frames=1428, proxy="teaser_v9-proxy.mp4",
        ride_offset_s=6.5, opening_len_s=6.5,
        extra_notes=[],
    ),
    "teaser-full_v1": dict(
        kit_dir="kit-teaser-full", kit_id="teaser-full",
        source="marketing/silent-studio/all-renders/teaser-full_v1.mp4",
        md5="3db40a137a9d879220879594af053d3f",
        frames=1419, proxy="teaser-full_v1-proxy.mp4",
        ride_offset_s=6.2, opening_len_s=6.2,
        extra_notes=[
            "PROVISIONAL default (cycle 22, 2026-09-26): these clips are the shipped ride soundtrack chain re-anchored to teaser-full's scene offset (start-ride at 6.2 s instead of 6.5 s). They are a neutral starting point, NOT the rides A/B pick from cycle 20 (rides-options/option-A-piano-then-bed.json vs option-B-piano-plus-stems.json), which is still open. Open either option file on this kit to audition it; the 'made for a different video (teaser_v9.mp4, 47.600 s)' note is expected and harmless because their -0.3 s cascade is already applied.",
            "The opening's own soundtrack (brandmark/opening/soundv3, 6.5 s) has not been re-cut for the 6.2 s opening; the logo clip here simply ends at 6.2 s with the same 0.5 s fade.",
        ],
    ),
}
DEFAULT_VIDEO = "teaser-full_v1"
```
`KIT` and `REPORT` become module globals assigned in `main()` from the chosen entry (see 4.4);
`say()` uses `REPORT` so it must be set before the first `say()`.

### 4.2 `proxy_check(src, dst, V)` — every literal derived from `V["frames"]`
Add a third parameter `V` (the table entry). Replace, in order:
- `str(st.get("nb_frames")) != "1428" or str(st.get("nb_read_frames")) != "1428" or abs(float(st["duration"]) - 47.6) > 0.001`
  → `n = V["frames"]; dur = n / FPS` (compute once at the top) and compare with `str(n)`, `str(n)`,
  `abs(float(st["duration"]) - dur) > 0.001`. Message: `"proxy frames/duration differ from %d / %.3f: %r" % (n, dur, st)`.
- `len(ta) != 1428 or len(tb) != 1428` → `!= n` (both); message uses `n`.
- `abs(tb[-1] - 47.566667) > 1e-5` → `last = (n - 1) / FPS`; `abs(tb[-1] - last) > 1e-5`; message
  prints `last` with `%.6f`.
- `nk != 143` → `nkeys = -(-n // GOP)` (ceil); `nk != nkeys`; message uses `nkeys`.
- Keep: codec/width/height/`r_frame_rate == "30/1"` check, `maxdiff > 1e-5`, `tb[0]`, size < 40 MB.
- The ffmpeg encode line keeps `"-g", str(GOP), "-keyint_min", str(GOP)` (values unchanged: 10).
Also add a **source check** before encoding (new, keeps the "refuse unknown video" safety even
though the md5 already guards it): after the md5 check, probe the source's `nb_frames` with the same
ffprobe call and Stop if `!= V["frames"]` (`"source has %s frames, table says %d"`).

### 4.3 `main()` — choose the video, set output folder
- Signature `main(video_key)`. In `__main__`: `key = sys.argv[1] if len(sys.argv) > 1 else
  DEFAULT_VIDEO`; if `key not in VIDEOS`: print `usage: python3 prep_kit.py [teaser_v9|teaser-full_v1]
  (default teaser-full_v1)` and `sys.exit(2)`. Also accept `-h`/`--help` → same usage, exit 0.
- First lines of `main()`: `global KIT, REPORT; V = VIDEOS[video_key]; KIT = os.path.join(HERE,
  V["kit_dir"]); REPORT = os.path.join(KIT, "prep-report.txt")`, then the existing `os.makedirs` /
  report reset, then `say("prep_kit.py  " + …)` **plus a new line** `say("video       %s -> %s/  (%s,
  %d frames, %.3f s)" % (video_key, V["kit_dir"], V["source"], V["frames"], V["frames"] / FPS))`.
- Step 3: `vsrc = os.path.join(REPO, *V["source"].split("/"))`, `vdst = os.path.join(KIT, V["proxy"])`,
  md5 compared with `V["md5"]`, "kept" condition compares `old_man["video"]["source_md5"] == V["md5"]`,
  both `proxy_check` calls pass `V`. The `say("proxy: %d frames, %d keyframes (every 10)…"` line:
  `(every %d)` with `GOP`.
- Steps 4–7: no change (they write into `KIT`, which is now per-video).
- Step 8: derive
  ```python
  off, olen, n = V["ride_offset_s"], V["opening_len_s"], V["frames"]
  dur = round(n / FPS, 3)
  t_bed1, t_bed2, t_e5 = round(T1 + off, 4), round(T2 + off, 4), round(rt.RIDE_T0_ABS + off, 4)
  bed2_out = round(MASTER_DUR - T2, 4)          # 9.76
  e5_out = round(MASTER_DUR - rt.RIDE_T0_ABS, 4)  # 8.5
  def fmtn(x): return ("%.4f" % x).rstrip("0").rstrip(".")
  ```
  (`T1`, `T2` are already imported from `rt`; `MASTER_DUR` from `ride_master`; `rt.RIDE_T0_ABS` is
  17.80 — check it exists at `ride_tunetank.py` line ~68; if it does not, STOP.)
  Clips:
  ```python
  clips = [{"track": "logo", "in": 0, "out": olen, "at": 0, "gain": 0.85, "fade_in": 0, "fade_out": 0.5}]
  for tid in (...same seven...):
      clips.append({"track": tid, "in": 0, "out": bed_len, "at": t_bed1, "gain": 0.45, "fade_in": 0, "fade_out": 0})
      clips.append({"track": tid, "in": 0, "out": bed2_out, "at": t_bed2, "gain": 0.45, "fade_in": 0, "fade_out": 1.0})
  clips.append({"track": "e5", "in": 0, "out": e5_out, "at": t_e5, "gain": 1.0, "fade_in": 0, "fade_out": 0})
  ```
  Manifest fields: `"kit": V["kit_id"]`; video block `{"file": V["proxy"], "name":
  os.path.basename(V["source"]), "fps": FPS, "duration_s": dur, "frames": n, "source": V["source"],
  "source_md5": V["md5"], "proxy": "re-encoded by prep_kit.py for frame stepping: libx264 crf 20,
  keyframe every %d frames, same 1920x1080 %d fps and the same %d frame timestamps; for looking only,
  never mix from it" % (GOP, FPS, n), "keyframes": video_info["keyframes"]}`.
  Notes: keep notes 1, 2 and 5 verbatim; note 3 → `"... (ride %.2f s = teaser %.2f s); ..." %
  (rt.RIDE_T0_ABS, t_e5)`; note 4 → `"Teaser clock = ride clock + %s s. Bed clip 2 ends at %s = %s +
  %s with the 1.0 s fade of ride_tunetank.py; bed clip 1 keeps the file's own tail (ends %s)." %
  (fmtn(off), fmtn(t_bed2 + bed2_out), fmtn(t_bed2), fmtn(bed2_out), fmtn(t_bed1 + bed_len))`;
  note 6 → `"The kit video is a short-GOP proxy of %s (Ruling 2, 2026-09-24); the original stays in
  silent-studio/all-renders." % os.path.basename(V["source"])`; then `+ V["extra_notes"]`.
  `made_by` stays `"prep_kit.py"`; add `"video_key": video_key` next to it (new field; the
  HTML's `parseManifest` ignores unknown top-level keys — confirm by reading lines 393–430; if it
  rejects unknown keys, drop this field instead of touching the parser).
- Docstring: update the header (folder names, run line with the optional argument, "Nothing outside
  the chosen kit folder is written").

### 4.4 Regression: the old kit must come out byte-identical
Before editing anything: `cp kit/manifest.json <cycle>/kit-manifest-before.json`. After the edit,
run `python3 prep_kit.py teaser_v9` (device_bash, timeout 180000; the proxy is "kept"). Then:
```bash
cd "$HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes"
python3 - <<'EOF'
import json
a=json.load(open("../../../cycles/22_teaser-lanes-multi-video-kit/kit-manifest-before.json"))
b=json.load(open("kit/manifest.json"))
for m in (a,b): m.pop("made",None); m.pop("video_key",None)
print("IDENTICAL" if a==b else "DIFF"); 
if a!=b:
    for k in set(a)|set(b):
        if a.get(k)!=b.get(k): print("key",k); print(" before",json.dumps(a.get(k))[:600]); print(" after ",json.dumps(b.get(k))[:600])
EOF
```
Must print `IDENTICAL`, and `kit/prep-report.txt` must end `PREP OK`. Then `python3
verify_default_mix.py` must end `MIX OK`. Any difference → STOP with the diff in your report.

### 4.5 Build the new kit
`python3 prep_kit.py teaser-full_v1` (device_bash, timeout 180000, from the tool folder). Expect in
`kit-teaser-full/prep-report.txt`: `md5 source 3db40a… expected 3db40a…`, `proxy encoded in ~40 s`,
`proxy: 1419 frames, 142 keyframes (every 10), timestamps identical to the source (max diff
0.000000 s), 16.2 MB`, `nb_frames=1419, duration=47.300000`, the audio steps identical to the old
report (same sample counts 663552 / 374850, same `master reproduction: PASS`, same
`file_offset_s: A = 0.0, B = 0.0`), `wrote manifest.json: 9 tracks, 16 clips`, `PREP OK`.
If the call hits the 180 s cap: run it again (the WAVs are rewritten deterministically; only the
proxy is slow, and a second run re-encodes it because no manifest exists yet) — if it fails twice,
STOP and report the timing; do not split the script.
Check the new manifest by hand: `python3 -c "import json;m=json.load(open('kit-teaser-full/manifest.json'));print(m['kit'],m['video']);print([(c['track'],c['at'],c['out']) for c in m['clips']])"`
→ kit `teaser-full`; video file `teaser-full_v1-proxy.mp4`, name `teaser-full_v1.mp4`, fps 30,
duration_s 47.3, frames 1419, keyframes 142; clips: logo (0, 6.2), the seven bed/stem pairs at
(10.0, 15.0465) and (22.74, 9.76), e5 (24.0, 8.5).

Add `kit-teaser-full/` as a new line to `tools/teaser-lanes/.gitignore` (currently `kit/` and
`tests/out/`).

## 5. Step 3 — teaser-lanes.html: served-mode auto-load + kit picker; file:// unchanged

### 5.1 `kits.json` (new, committed, tool folder root)
```json
{
  "format": "teaser-lanes-kits",
  "version": 1,
  "default": "kit-teaser-full",
  "kits": [
    { "dir": "kit-teaser-full", "label": "teaser-full v1 · 47.3 s (default)" },
    { "dir": "kit",             "label": "teaser v9 · 47.6 s (old concat teaser)" }
  ]
}
```

### 5.2 Two new pure functions in `<script id="lanes-core">` (export them in the `LanesCore` object, line ~634)
```js
// kits.json: which kit folders the served page may auto-load. dir = one folder name, no slashes.
function parseKitsList(objOrText) {
  let m = objOrText;
  if (typeof m === "string") { try { m = JSON.parse(m); } catch (e) { throw new Error("kits.json: not valid JSON (" + e.message + ")"); } }
  if (!m || typeof m !== "object" || m.format !== "teaser-lanes-kits" || m.version !== 1) throw new Error("kits.json: format must be teaser-lanes-kits version 1");
  if (!Array.isArray(m.kits) || !m.kits.length) throw new Error("kits.json: kits missing");
  const dirs = new Set(), kits = [];
  for (const k of m.kits) {
    if (!k || typeof k.dir !== "string" || !/^[A-Za-z0-9._-]+$/.test(k.dir) || k.dir === "." || k.dir === "..") throw new Error("kits.json: kit dir " + JSON.stringify(k && k.dir) + " must be one folder name");
    if (dirs.has(k.dir)) throw new Error("kits.json: duplicate kit dir " + k.dir);
    dirs.add(k.dir);
    kits.push({ dir: k.dir, label: typeof k.label === "string" && k.label ? k.label : k.dir });
  }
  if (typeof m.default !== "string" || !dirs.has(m.default)) throw new Error("kits.json: default must be one of the kit dirs");
  return { default: m.default, kits };
}
// The files a served kit needs: the video, then each track's file, in manifest order, no duplicates.
function kitFiles(manifest) {
  const out = [], seen = new Set();
  for (const f of [manifest.video.file].concat(manifest.tracks.map(t => t.file))) { if (!seen.has(f)) { seen.add(f); out.push(f); } }
  return out;
}
```

### 5.3 Markup
- Header (line ~125): after `<button id="btn-open-top" …>Open kit folder</button>` add
  `<select id="kit-pick" hidden title="Kit to load (served mode)"></select>`.
- Empty card (lines ~138–142): replace the `<p class="muted">The kit is <b>…kit</b> (made by
  prep_kit.py).</p>` line with two lines:
  `<p class="muted">Default kit: <b>kit-teaser-full/</b> (teaser-full v1, 47.3 s). Old teaser: <b>kit/</b> (teaser v9, 47.6 s). Both made by prep_kit.py.</p>`
  `<p class="muted" id="serve-hint">Opened by double-click: choose the kit folder above. Started with serve.ps1 (localhost:8765): the default kit loads by itself and the header menu switches kits.</p>`
- `HOWTO[0]` → `"Open a kit folder: kit-teaser-full (teaser-full v1, the default) or kit (teaser v9), both made by prep_kit.py. When the page is served by serve.ps1 the default kit loads by itself and the header menu switches kits."` (array stays 8 entries; entries 7 and 8 untouched).

### 5.4 Served-mode logic (app script, next to the "file input and drag/drop" section)
```js
  // ---------- served mode (cycle 22): auto-load the default kit and offer a kit menu when the page is served over http ----------
  const SERVED = location.protocol === "http:" || location.protocol === "https:";
  async function fetchKitEntries(dir, onProgress) {
    const get = async name => { const r = await fetch(dir + "/" + name, { cache: "no-store" }); if (!r.ok) throw new Error(dir + "/" + name + ": " + r.status); return r; };
    const manifestText = await (await get("manifest.json")).text();
    const manifest = C.parseManifest(manifestText);
    const files = C.kitFiles(manifest), entries = [{ file: new File([manifestText], "manifest.json"), path: dir + "/manifest.json" }];
    let k = 0;
    for (const name of files) {
      onProgress(++k, files.length, name);
      const blob = await (await get(name)).blob();
      entries.push({ file: new File([blob], name), path: dir + "/" + name });
    }
    return entries;
  }
  async function loadServedKit(dir) {
    unloadKit();
    S.base = "fetching " + dir + "/"; renderStatus();
    let entries;
    try { entries = await fetchKitEntries(dir, (i, n, name) => { S.base = "fetching " + i + " / " + n + " · " + dir + "/" + name; setProgress(i / (n + 1)); renderStatus(); }); }
    catch (e) { setProgress(0); S.base = ""; say("could not fetch " + dir + "/: " + e.message, "err"); return; }
    setProgress(0);
    await openKit(entries);
  }
  async function initServed() {
    if (!SERVED) return;
    let list;
    try { list = C.parseKitsList(await (await fetch("kits.json", { cache: "no-store" })).text()); }
    catch (e) { say("kits.json: " + e.message, "err"); return; }   // served without a kits.json: behave like file://
    const sel = $("kit-pick");
    sel.textContent = "";
    for (const k of list.kits) { const o = document.createElement("option"); o.value = k.dir; o.textContent = k.label; sel.appendChild(o); }
    sel.value = list.default;
    sel.hidden = false;
    sel.onchange = () => { store.set("teaser-lanes:kit-pick", sel.value); loadServedKit(sel.value); };
    const remembered = store.get("teaser-lanes:kit-pick");
    const pick = remembered && list.kits.some(k => k.dir === remembered) ? remembered : list.default;
    sel.value = pick;
    document.body.dataset.served = "1";
    await loadServedKit(pick);
  }
```
`init()` gets one more line after `renderStatus();`: `initServed();` (not awaited). Also: when a
kit is opened through the folder input/drop while served, keep the menu visible but do not change
its value (no code needed — `openKit` does not touch `#kit-pick`). Under `file://` `SERVED` is
false, `initServed` returns at once: no fetch, no console error, `#kit-pick` stays hidden — the
existing e2e runs (which use `pathToFileURL`) see exactly today's behaviour.

The "remember the last picked kit in this browser" line uses the existing `store` wrapper (same
localStorage discipline as the clips). Nathan's reading of "pre-load the new render as default":
first ever load = `kits.json`'s default = `kit-teaser-full`; afterwards the last-picked kit.
**If you think that "remembered pick" contradicts "default", do not decide — it is call 2 in
section 12; implement as written (remembered wins) and note it.**

### 5.5 `serve.ps1` (new, tool folder root; Windows-only; you cannot run it — say so in the report)
```powershell
<#
  serve.ps1 -- serve teaser-lanes over localhost so the page can auto-load the default kit (kits.json).
  Run:  powershell -ExecutionPolicy Bypass -File .\serve.ps1        (from marketing\audio-studio\tools\teaser-lanes)
  Stops with Ctrl+C. Needs Python 3 on PATH (tries `python`, then `py -3`).
#>
param([int]$Port = 8765)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/teaser-lanes.html"
$py = $null
foreach ($c in @(@('python'), @('py','-3'))) {
    try { & $c[0] @($c[1..($c.Length-1)] | Where-Object { $_ }) -c "import sys; assert sys.version_info >= (3,7)" 2>$null; if ($LASTEXITCODE -eq 0) { $py = $c; break } } catch { }
}
if (-not $py) { Write-Error "No Python 3 found on PATH (tried python, py -3). Install Python 3 or open teaser-lanes.html by double-click and use Open kit folder."; exit 1 }
Write-Host "Serving $here at $url  (Ctrl+C stops)" -ForegroundColor Cyan
Start-Process $url
& $py[0] @($py[1..($py.Length-1)] | Where-Object { $_ }) -m http.server $Port --bind 127.0.0.1 --directory "$here"
```
(`http://` is fine here — the hygiene rule is for the HTML only.)

## 6. The new kit's default arrangement — decision and its reasoning (for the README + report)

Decision: **the shipped ride soundtrack chain, re-anchored to teaser-full's scene offset** (logo
0–6.2 s fade 0.5; bed + the six stems at 10.0 s [15.0465 s] and 22.74 s [9.76 s, 1.0 s fade];
E5 pulses at 24.0 s [8.5 s]; stems muted, bed/logo/e5 audible — same mute pattern as `kit/`).
Why this and not the alternatives:
- The old script's literals un-shifted (10.3 / 23.04 / 24.3) would be 0.3 s late on every visual
  anchor — wrong by construction.
- Cycle 20's cascaded option files (10.0 / 22.3 / 24.0 / 34.7) ARE the A/B candidates; putting
  either into the manifest would silently pre-decide Nathan's open pick. Their 22.3 also comes from
  Nathan's own `arrangement_v1.json` (22.6 − 0.3), not from the shipped chain.
- The shipped chain + offset is exactly what `kit/`'s default means ("default clips = today's
  teaser sound"), so both kits keep one definition of "default", derived from the same constants.
  It also lands the ride bed's fade-out exactly on the new gates-saving→ranking cut (32.5 s).
It is marked provisional in `manifest.notes` (section 4.1 `extra_notes`) and in the README. The
two option files are left untouched; opening them on the new kit shows the informational
"made for a different video (teaser_v9.mp4, 47.600 s)" note (section 1.3) — expected.

## 7. Step 4 — tests to update/add

### 7.1 `teaser-lanes.test.mjs` (append a section 20 before the final summary line)
```js
// 20. served mode (cycle 22): kits.json parsing and the served kit file list
{
  const good = { format: "teaser-lanes-kits", version: 1, default: "kit-teaser-full", kits: [{ dir: "kit-teaser-full", label: "full" }, { dir: "kit" }] };
  const r = C.parseKitsList(JSON.stringify(good));
  ok("parseKitsList: default and two kits, label falls back to dir", r.default === "kit-teaser-full" && r.kits.length === 2 && r.kits[1].label === "kit" && r.kits[0].label === "full");
  throwsWith("parseKitsList: bad json", () => C.parseKitsList("{"), "not valid JSON");
  throwsWith("parseKitsList: wrong format", () => C.parseKitsList({ format: "x", version: 1, default: "kit", kits: [{ dir: "kit" }] }), "format must be");
  throwsWith("parseKitsList: default not listed", () => C.parseKitsList({ format: "teaser-lanes-kits", version: 1, default: "nope", kits: [{ dir: "kit" }] }), "default must be one of");
  throwsWith("parseKitsList: dir with a slash", () => C.parseKitsList({ format: "teaser-lanes-kits", version: 1, default: "a/b", kits: [{ dir: "a/b" }] }), "one folder name");
  throwsWith("parseKitsList: dir ..", () => C.parseKitsList({ format: "teaser-lanes-kits", version: 1, default: "..", kits: [{ dir: ".." }] }), "one folder name");
  throwsWith("parseKitsList: duplicate dir", () => C.parseKitsList({ format: "teaser-lanes-kits", version: 1, default: "kit", kits: [{ dir: "kit" }, { dir: "kit" }] }), "duplicate kit dir");
  throwsWith("parseKitsList: empty kits", () => C.parseKitsList({ format: "teaser-lanes-kits", version: 1, default: "kit", kits: [] }), "kits missing");
  const realM = C.parseManifest(fxManifestText);
  eq("kitFiles(real manifest): video first, then the 9 wavs in track order", C.kitFiles(realM), ["teaser_v9-proxy.mp4", "logo.wav", "bed.wav", "a-strings.wav", "a-other.wav", "b-piano.wav", "b-drums.wav", "b-bass.wav", "b-other.wav", "e5.wav"]);
  eq("kitFiles: duplicates collapse", C.kitFiles({ video: { file: "v.mp4" }, tracks: [{ file: "a.wav" }, { file: "a.wav" }, { file: "v.mp4" }] }), ["v.mp4", "a.wav"]);
  const kitsJson = JSON.parse(readFileSync(join(here, "kits.json"), "utf8"));
  const kl = C.parseKitsList(kitsJson);
  ok("kits.json in the tool folder parses and defaults to kit-teaser-full", kl.default === "kit-teaser-full" && kl.kits.map(k => k.dir).join(",") === "kit-teaser-full,kit");
  ok("html: kit-pick exactly once", (html.match(/id="kit-pick"/g) || []).length === 1);
  ok("html: HOWTO entry 1 names both kits", /^\s*"Open a kit folder: kit-teaser-full/.test((html.match(/const HOWTO = \[([\s\S]*?)\];/)[1].split("\n").filter(l => /^\s{4}"/.test(l)))[0]));
}
```
Verify the fixture `tests/fixtures/manifest-real.json` track order matches the `eq` list above by
reading it first (it is a copy of the real `kit/manifest.json`; the order is the `table` order in
prep_kit.py + e5). If it differs, use the fixture's actual order — it is a literal, not computed.
Expected total: 218 + 15 = **233 passing**; run from the device VM (`node teaser-lanes.test.mjs`)
and from the cloud sandbox on the staged copy — both must print `ALL PASS`.

### 7.2 `tests/e2e-real.mjs` — expectations keyed by `manifest.kit`
Replace the hardcoded block (lines ~26–37) with a table and pick `EXP = TABLE[manifest.kit]`
(STOP-style `process.exit(2)` with a message if the kit is not in the table):
```js
const TABLE = {
  "teaser-lanes": { dur: "47.600", durNum: 47.6, logo: "0.000-6.500 s -> render 0.000-6.500 s", bed1: "10.300-25.347", bed2: "23.040-32.800", e5: "24.300-32.800",
                    goFrame: "f729", goRead: "24.300 s f729", win05: "[24.05,24.55]", playFrom: "24", fixtures: true },
  "teaser-full":  { dur: "47.300", durNum: 47.3, logo: "0.000-6.200 s -> render 0.000-6.200 s", bed1: "10.000-25.047", bed2: "22.740-32.500", e5: "24.000-32.500",
                    goFrame: "f720", goRead: "24.000 s f720", win05: "[23.75,24.25]", playFrom: "24", fixtures: false }
};
```
Then: header line uses `EXP.dur`; logo line `"logo: source " + EXP.logo + " (gain 0.85, fade out 0.5 s)"`;
stem lines `": source 0.000-15.047 s -> render " + EXP.bed1 + " s (gain 0.45" + mu + ")"` and
`": source 0.000-9.760 s -> render " + EXP.bed2 + " s (gain 0.45, fade out 1 s" + mu + ")"`; e5
`"e5: source 0.000-8.500 s -> render " + EXP.e5 + " s (gain 1)"`. The `f729` fill/readout checks use
`EXP.goFrame`/`EXP.goRead` (the `src 14.000 | 1.260` expectations are identical for both kits by
construction: 24.0−10.0 = 14.0, 24.0−22.74 = 1.26 — leave those literals). Zoom window check uses
`EXP.win05`. `savedObj.video.duration_s === EXP.durNum`. The whole `if (tag === "1440x900") { …
arrangement fixtures … }` block runs only when `EXP.fixtures` is true; otherwise `log("     (arrangement
fixture checks skipped: fixtures are teaser_v9 arrangements)")`. The R4 e5 line literal
`"e5: source 0.000-8.500 s -> render 24.300-32.800 s (gain 0.3, fade in 2 s, muted)"` is inside
that block and stays as is. Update the header comment (line 2) to say the webm stand-in must match
the kit's manifest (47.6 s / 1428 for kit, 47.3 s / 1419 for kit-teaser-full).
Expected counts: old kit still 86 checks; new kit 86 − (the fixture block's checks) — count them
and write the number in your report.

### 7.3 `tests/e2e-served.mjs` (new; cloud sandbox; Playwright)
`node tests/e2e-served.mjs <synKitDir> [outDir]`. It: (1) makes a temp folder with a copy of
`teaser-lanes.html`, a `kits.json` = `{format, version 1, default: "kit-syn", kits: [{dir: "kit-syn",
label: "syn"}, {dir: "kit-missing", label: "missing"}]}`, and `kit-syn/` = a copy of the synthetic
kit; (2) starts a `node:http` static server on `127.0.0.1:0` (ephemeral port, `Content-Type` by
extension: html/json/webm/wav) rooted at that folder; (3) with the same `chromium.launch` line as
`e2e.mjs`, opens `http://127.0.0.1:<port>/teaser-lanes.html` and checks:
- status reaches `ready · 5 lanes` within 30 s WITHOUT any `setInputFiles` (auto-load);
- `#kit-pick` is visible, has 2 options, value `kit-syn`; `body[data-served] === "1"`;
- `#kit-info` text is `kit: teaser-lanes · video.webm` (the synthetic manifest's kit id is
  `teaser-lanes`, video `video.webm` — read `synthetic-kit.mjs` lines ~38–39 to confirm);
- the default copy list equals what `e2e.mjs` expects for the synthetic kit's defaults (copy its
  `EXPECTED_LIST` literal, `e2e.mjs` line ~27 — 9 lines);
- selecting `kit-missing` → status contains `could not fetch kit-missing/` and `⚠`; selecting
  `kit-syn` again → `ready · 5 lanes`; `localStorage["teaser-lanes:kit-pick"] === "kit-syn"`;
- reload the page → auto-loads again to ready (remembered pick);
- a second browser context opened on `pathToFileURL(<temp>/teaser-lanes.html)` (file://) → after
  1 s `#kit-pick` is hidden, status is `open the kit folder to begin`, `body.dataset.served`
  undefined, zero console errors;
- zero console errors / page errors in the served context too;
- screenshots `served-ready.png`, `served-menu.png` into outDir.
Around 25–30 checks; print `PASS`/`FAIL` lines and a final count like the other scripts; exit 1 on
any failure.

### 7.4 e2e-real on the NEW kit (cloud sandbox) — how to make the stand-in copy
```bash
# in the cloud sandbox, after staging kit-teaser-full/{manifest.json,*.wav} to /mnt/user-data/uploads/Qualifire/... (~43 MB; do NOT stage the proxy mp4)
mkdir -p /tmp/kit-full && cp <staged>/kit-teaser-full/*.wav <staged>/kit-teaser-full/manifest.json /tmp/kit-full/
ffmpeg -v error -y -f lavfi -i "testsrc=size=320x180:rate=30:duration=47.3" -c:v libvpx-vp9 -b:v 300k -deadline realtime -cpu-used 8 -pix_fmt yuv420p /tmp/kit-full/video.webm
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames,duration -of default=nw=1 /tmp/kit-full/video.webm   # 1419 / 47.3
python3 - <<'EOF'
import json; p="/tmp/kit-full/manifest.json"; m=json.load(open(p)); m["video"]["file"]="video.webm"; json.dump(m,open(p,"w"),indent=2)
EOF
node tests/e2e-real.mjs /tmp/kit-full tests/out/real-full
```
Do the same for the old kit (`duration=47.6`, 1428 frames) to prove the old expectations still pass.

## 8. Step 5 — the full check list (all must pass before "done")

| # | where | command (from `tools/teaser-lanes`) | must end with |
|---|---|---|---|
| 1 | device VM | `md5sum ../../../silent-studio/all-renders/teaser-full_v1.mp4` | `3db40a137a9d879220879594af053d3f` |
| 2 | device VM | `python3 prep_kit.py teaser_v9` then the 4.4 compare script | `PREP OK`, `IDENTICAL` |
| 3 | device VM | `python3 verify_default_mix.py` | `MIX OK` |
| 4 | device VM | `python3 prep_kit.py teaser-full_v1` | `PREP OK`, report says 1419 frames / 142 keyframes / 47.300000 |
| 5 | device VM + cloud | `node teaser-lanes.test.mjs` | `ALL PASS: 233/233` |
| 6 | cloud | `node tests/synthetic-kit.mjs tests/out/synkit && node tests/e2e.mjs tests/out/synkit tests/out/e2e` | same pass count as before (390) |
| 7 | cloud | `node tests/mutants-open.mjs . tests/out/mut tests/out/synkit` | all 20 mutants caught (as today) |
| 8 | cloud | `node tests/e2e-served.mjs tests/out/synkit tests/out/served` | all checks PASS |
| 9 | cloud | `node tests/e2e-real.mjs /tmp/kit-v9 …` (old kit stand-in) | 86/86 |
| 10 | cloud | `node tests/e2e-real.mjs /tmp/kit-full …` (new kit stand-in) | all PASS, count reported |
| 11 | device VM | `python3 -c "import json;json.load(open('kits.json'))"` and `git -c core.quotepath=off check-ignore kit-teaser-full/manifest.json` (prefix `GIT_OPTIONAL_LOCKS=0`) | prints the path (ignored) |

Staging note for the cloud runs: `tests/e2e.mjs` resolves the page as `join(here, "..",
"teaser-lanes.html")`, so stage/copy the whole `tools/teaser-lanes/` tree minus the two kit folders
(html, test.mjs, kits.json, tests/**) into one folder in the sandbox and run there.

## 9. Step 6 — docs

### 9.1 `tools/teaser-lanes/README.md`
- Title line: mention cycle 22. First paragraph: the video is whichever kit is loaded; two kits ship
  (`kit-teaser-full/` = teaser-full v1, 47.3 s, 1419 frames — default; `kit/` = teaser v9, 47.6 s,
  1428 frames).
- "Use it": step 1 becomes two ways — (a) double-click, Open kit folder, choose `kit-teaser-full/`
  (or `kit/`), or drop it; (b) `serve.ps1` → the page opens at `localhost:8765`, loads the default
  kit by itself, header menu switches kits; the last pick is remembered in that browser. Plain
  generic command lines only (like the existing `cd marketing/audio-studio/tools/teaser-lanes &&
  python prep_kit.py` style); the copy-paste PowerShell blocks live in the cycle's COMMANDS.md.
- "Prepare the kit": `python3 prep_kit.py [teaser_v9|teaser-full_v1]` (default `teaser-full_v1`),
  what each writes, ~57 MB each, both git-ignored.
- New short section "Default arrangement of kit-teaser-full (provisional)": the section 6 text,
  compressed to 5–6 lines, ending with "the rides A/B pick (cycle 20) is still open; opening either
  option file here shows a 'made for a different video' note that is expected".
- "Test it" table: add `e2e-served.mjs`, note `e2e-real.mjs` now keys on `manifest.kit`, and that
  `verify_default_mix.py` is for `kit/` only.
- "Only Nathan can verify": add `serve.ps1` (Python on PATH, port free, browser opens, auto-load in
  his Chrome/Edge), and the menu switch on his machine.

### 9.2 `cycles/22_…/COMMANDS.md` (all blocks with full `cd "C:\…"`, Bypass form)
Blocks for: serve (`powershell -ExecutionPolicy Bypass -File .\serve.ps1`), rebuild new kit
(`python prep_kit.py teaser-full_v1`), rebuild old kit (`python prep_kit.py teaser_v9`), and how to
open the two cycle 20 option files on the new kit (in-tool, no command).

### 9.3 `cycles/22_…/OPEN-ITEMS.md`
1. Only-Nathan checks (served mode on his PC; h264 proxy decodes; the default state sounds like the
   shipped ride sound shifted to the new picture; open option A/B on the new kit and confirm the
   note appears and timing looks right).
2. Day render note: `teaser-full/renders/teaser-full_2026-09-26_09-39-29.mp4` is the day render but
   was not renamed `_day` by `render.ps1` (its rename step needs exactly one new mp4); it is not
   used anywhere; renaming to `teaser-full_2026-09-26_09-39-29_day.mp4` is a one-line move for
   Nathan when he wants it — not done here.
3. The calls in section 12, verbatim.
4. Cycle 20 OPEN-ITEMS #3 (A/B pick) — pointer only, still open.

### 9.4 Cycle `README.md`: replace the "Status" line with "Status: brief v1 landed, executed; see EXECUTOR-REPORT-v1.md."

## 10. What must NOT change (for the inspector too)
`kit/` contents (except `manifest.json.made` and the new `video_key` field), `verify_default_mix.py`,
`tests/e2e.mjs`, `tests/synthetic-kit.mjs`, `tests/mutants-open.mjs`, `tests/convert-arrangement.mjs`,
`tests/fixtures/*`, the two `rides-options/*.json`, `arrangement_v1.*`, every scene file under
`silent-studio/`, `render.ps1`, `structure.md`, `silent-studio/COMMANDS.md`. The `file://` behaviour
of `teaser-lanes.html` (folder input, drop, arrangement open/save, hotkeys) is unchanged; the only
visible differences under `file://` are the two text edits in 5.3.

## 11. `EXECUTOR-REPORT-v1.md` must contain
Per section-8 row: the exact command, where it ran, the final line, the count. The 4.4 compare
output. The new kit's `prep-report.txt` step-3 lines verbatim. The list of files created/modified
with line counts. For `e2e-real.mjs` on the new kit: the check count and the skipped-block note.
Anything you could not run (serve.ps1) under "NOT RUN (Windows only)". Any STOP under "STOPPED".

## 12. Open calls for Nathan (not decided here; the executor implements the defaults stated and lists these in OPEN-ITEMS)

1. **How "pre-load as default" should feel.** Under double-click (`file://`) the browser forbids a
   page from reading its own folder, so the best possible is one click + the folder dialog with
   `kit-teaser-full/` named on screen. True zero-click needs the page served from localhost
   (`serve.ps1`, one extra step: a terminal window stays open). Both are shipped; nothing to
   decide before using either. Question: is the served mode worth keeping as *the* way you open the
   tool (then the README could lead with it), or do you prefer double-click and the served path
   stays a side option? Default implemented: both documented, double-click first.
2. **Remembered pick vs fixed default in served mode.** As specified, the menu remembers the last
   kit you chose in that browser; the `kits.json` default only applies on the first load (or after
   clearing site data). Alternative: always load `kit-teaser-full` on open, ignore the last pick.
   Default implemented: remembered pick.
3. **Re-stamping cycle 20's two option files** (`kit`, `video` header fields only → `teaser-full`,
   47.3 s / 1419) so they open on the new kit without the "made for a different video" note. Clip
   numbers would not change (their cascade is already applied). Not done: those files are the A/B
   candidates and this brief does not touch them. Yes/no?
4. **Opening soundtrack for the 6.2 s opening.** `brandmark/opening/soundv3` is 6.5 s; the new
   kit's logo clip just ends at 6.2 s. A re-cut of the opening's own sound is a separate, later
   item — flagged, not scheduled.
