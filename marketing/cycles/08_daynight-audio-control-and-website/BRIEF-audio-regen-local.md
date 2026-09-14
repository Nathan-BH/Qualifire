# BRIEF — regenerate a scene's audio locally on Nathan's PC (`regen.ps1` + walkthrough in this folder's `COMMANDS.md`)

**For:** Sonnet executor. Creates one PowerShell script under `marketing/audio-studio/`,
replaces the placeholder section 5 of this cycle folder's `COMMANDS.md` with the
Nathan-facing walkthrough, adds one `.gitignore` line, and makes two small anchored doc
edits under `marketing/audio-studio/`.
No Python edits, no renders, no git write. Stop-on-ambiguity applies to every anchor below.
**Status:** briefed, not executed. Walkthrough target redirected 2026-09-14 from
`audio-studio/REGEN.md` to this folder's `COMMANDS.md` section 5 (Nathan: every command
this cycle adds lives in the cycle folder, in one place).
**Origin:** `BRIEF-audio-studio-control.md` §0 alternative C; Nathan's Q2 answer in
`questionsfornathan.md` ("worth trying, make a file that runs me through the steps").

## 0. Why, and the ruling

Today every audio round runs in Claude's sandbox: `soundtrack.py` → wav → ffmpeg mux →
`soundvN/` → `all-renders/`. Nathan hears a change only one chat turn later, and the
sandbox cannot install anything (`APPROACH.md` lines 22–31: the fluidsynth/soundfont
upgrade is blocked by sandbox pip/apt policy). Nathan's PC has neither problem: it already
has ffmpeg on PATH (`silent-studio/render.ps1` lines 69–75 refuse to run without it, and
the seven silent renders exist), and a Python is likely there (his home directory has
`.anaconda`, `.conda`, `.ipython`, `.jupyter`, `PycharmProjects` — likely, not confirmed).
Local regeneration lets him nudge a number in `soundtrack.py` and hear it in seconds, and
is the only path on which the soundfont route can ever be retried.

**Rulings (do not re-litigate):**

1. **Two output modes.** Default = *preview*: output goes to `<scene>/regen/`
   (gitignored, overwritten every run, never a round). `-Round` = the `structure.md`
   convention: a new `soundvN/` with wav + mp4 + a seeded `FEEDBACK.md`, and the
   `audio-studio/all-renders/` copy replaced. Reason: the nudge-and-listen loop must not
   dirty the tree or overwrite a judged round, and every `soundtrack.py` synthesises noise
   with unseeded `np.random` (`synth.py` lines 61, 73, 85, 106–107), so even an unmodified
   re-run differs at the bit level — an in-place overwrite would show as a binary git diff
   on every run.
2. **The mux is the sandbox's, reproduced exactly:**
   `ffmpeg -y -i <video> -i <wav> -c:v copy -c:a aac -b:a 192k -shortest <out>`.
   Verified 2026-09-14 by the planner against `brandmark/closing/soundv2/closing_v3_with_sound_v2.mp4`
   and `brandmark/opening/soundv2/opening_v3_with_sound_v2.mp4`: the video streams are
   MD5-identical to `silent-studio/brandmark/{closing,opening}/rounds/v3/{closing,opening}_v3.mp4`
   (so `-c:v copy`), the audio is AAC-LC mono 44100 Hz, and `-b:a 192k` reproduces both
   files' measured audio bitrates exactly (132081 / 138905 bps) where 128k/160k/256k do
   not. `-shortest` could not be verified (wav and video durations are equal by
   construction) and is kept as a guard. No `-movflags +faststart`, no metadata mapping.
3. **The silent source video is `silent-studio/all-renders/<leaf>_vM.mp4`**, highest M.
   `audio-studio/all-renders/` now holds only `_with_sound` files. Verified 2026-09-14:
   the silent twin holds exactly `closing_v3`, `colours_v2`, `gates-saving_v5`,
   `opening_v3`, `ranking_v5`, `start-ride_v4`, `teaser_v6` — the same versions the
   with-sound files were muxed onto. `<leaf>` = last path segment of the scene
   (`brandmark/closing` → `closing`).
4. **The soundtrack version N comes from `soundtrack.py` itself**, never from a folder
   count: every one of the seven scripts ends with the literal
   `wavfile.write("soundtrack_vN.wav", SR, (audio * 32767).astype(np.int16))`
   (colours 73, teaser 101, gates-saving 93, ranking 69, start-ride 74,
   brandmark/opening 76, brandmark/closing 54). Parse N with
   `wavfile\.write\(\s*"soundtrack_v(\d+)\.wav"`.
5. **The script must run `python` with the scene folder as the working directory.**
   Every `soundtrack.py` does `sys.path.insert(0, "..")` (`"../.."` for the two brandmark
   scenes) and writes its wav by relative name — both resolve against the CWD, not the
   script's location.
6. `regen.ps1` lives at `marketing/audio-studio/regen.ps1` (it derives every path from
   `$PSScriptRoot`, so it stays there). The walkthrough is **not** a file under
   `audio-studio/`: it is section 5 of
   `marketing/cycles/08_daynight-audio-control-and-website/COMMANDS.md` — Nathan's rule
   (2026-09-14): every command this cycle adds lives in that one file.
7. Nathan runs it via `powershell -ExecutionPolicy Bypass -File .\regen.ps1 …`, same as
   `render.ps1` (`silent-studio/COMMANDS.md`, "One-time thing you'll hit").

Not in scope: seeding the random generator, `KNOBS` dicts, stems, fluidsynth, day-render
muxing (`BRIEF-daynight-renders.md` §7), any change to any `soundtrack.py` or `synth.py`.

## 1. `marketing/audio-studio/regen.ps1`

Model the file on `silent-studio/render.ps1` (comment-based help block, `[CmdletBinding()]`
`param(...)`, `$ErrorActionPreference = 'Stop'`, a `Test-CommandExists` helper, green/cyan
`Write-Host` progress lines, `Write-Error` + `exit 1` on every failure, `Push-Location`/`Pop-Location`
in `try/finally`). Windows PowerShell 5.1 compatible (no PowerShell-7-only syntax such as
`&&`, `??`, ternaries).

### Parameters

| Param | Type | Meaning |
|---|---|---|
| `-Scene` | string | Scene folder relative to `audio-studio/`: `colours`, `gates-saving`, `ranking`, `start-ride`, `teaser`, `brandmark/opening`, `brandmark/closing`. Accept `/` or `\`. Required unless `-Check`. |
| `-Check` | switch | Run the preflight (§1.2) only, print a summary, exit 0/1. No scene needed. |
| `-Round` | switch | Write a real round (§1.5) instead of a preview (§1.4). |
| `-Python` | string | Explicit interpreter path (e.g. an Anaconda `python.exe`). Skips interpreter discovery. |
| `-Video` | string | Explicit silent source mp4. Skips the `silent-studio/all-renders/` lookup. |

### 1.1 Paths (derive from `$PSScriptRoot`, never hardcode `C:\Users\natha`)

- `$audioRoot = $PSScriptRoot`
- `$marketingRoot = Split-Path -Parent $audioRoot`
- `$silentRenders = Join-Path $marketingRoot 'silent-studio\all-renders'`
- `$repoRoot = Split-Path -Parent $marketingRoot`
- `$safeToDelete = Join-Path $repoRoot 'safe_to_delete'` (gitignored; create if missing)
- `$sceneDir = Join-Path $audioRoot ($Scene -replace '/', '\')`; `$leaf = Split-Path -Leaf $sceneDir`
- Valid scenes are discovered, not listed: every folder at depth 1 or 2 under `$audioRoot`
  that contains `soundtrack.py`. If `$sceneDir\soundtrack.py` does not exist, print that
  discovered list and exit 1.

### 1.2 Preflight (also what `-Check` runs)

1. **Python.** If `-Python` given: use it. Otherwise try, in order, `py -3`, `python`,
   `python3`. A candidate counts only if running it with `--version` exits 0 and its
   output matches `^Python 3\.(\d+)`. Two Windows traps to handle explicitly:
   - the Microsoft Store stub: `Get-Command python` resolving under `\WindowsApps\` and
     `python --version` printing "Python was not found; run without arguments to install
     from the Microsoft Store" (exit code 9009). Treat as not found; do not let it open
     the Store (run it with `--version`, never bare).
   - `py` present but no Python 3 registered: `py -3 --version` errors. Treat as not found.
   Minor version below 9 → `Write-Error` "Python 3.9 or newer is needed" and exit 1.
   Remember the winning invocation as `$pyExe` + `$pyArgs` (`py` needs the `-3` argument
   before the script path).
2. **numpy + scipy.** Run `<python> -c "import numpy, scipy; print(numpy.__version__, scipy.__version__)"`.
   Non-zero exit → `Write-Error` with the exact fix line
   `<python> -m pip install numpy scipy` (substitute the discovered interpreter) and exit 1.
3. **ffmpeg and ffprobe** on PATH (`Test-CommandExists`), same wording as `render.ps1`
   line 71 for the install hint.
4. Print one green line per check with the version found. With `-Check`, stop here.

### 1.3 Generate

1. Read `$sceneDir\soundtrack.py`; extract N per ruling 4. Zero matches, or more than one
   distinct N → `Write-Error` and exit 1 (do not guess).
2. Resolve the source video: if `-Video` given, use it (must exist). Otherwise list
   `$silentRenders` for files matching `^$leaf_v(\d+)\.mp4$` (regex-escape `$leaf`; this
   deliberately excludes future `_day` variants), take the highest M. None → exit 1
   naming the folder and the pattern.
3. `Push-Location $sceneDir`; run `& $pyExe @pyArgs soundtrack.py`; check `$LASTEXITCODE`;
   `Pop-Location` in `finally`. Expected stdout: `wrote soundtrack_vN.wav <seconds> s`.
   Confirm `$sceneDir\soundtrack_vN.wav` now exists, else exit 1.
4. Durations: `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 <file>`
   for the wav and the video. Print both. If they differ by more than 0.1 s, print a
   yellow warning ("soundtrack.py's DURATION does not match <video>; the mux is cut to the
   shorter one — check the `Source:` line in soundtrack.py's docstring") and continue.

### 1.4 Preview mode (default)

- `$out = Join-Path $sceneDir 'regen'`; create it.
- Move the wav to `$out\soundtrack_vN.wav` (overwrite).
- Mux: `ffmpeg -y -hide_banner -loglevel warning -i <video> -i <wav> -c:v copy -c:a aac -b:a 192k -shortest "$out\${leaf}_v${M}_with_sound_v${N}.mp4"`.
  Pass arguments as separate tokens (paths contain spaces); do not redirect stderr;
  check `$LASTEXITCODE`.
- Write `$out\last-run.txt`: timestamp, interpreter + version, video path, both
  durations, the exact ffmpeg command line.
- Final lines: the mp4 path, and "Preview only — nothing under soundvN/ or all-renders/
  was touched. Re-run with -Round to make it a round."

### 1.5 Round mode (`-Round`)

- `$roundDir = Join-Path $sceneDir "soundv$N"`. If it already exists → `Write-Error`
  "soundv$N already exists. Either run without -Round (preview), or start a new round by
  changing the version number in soundtrack.py's wavfile.write line (and its docstring)
  to N+1." and exit 1. Do this check **before** running Python (§1.3 step 3) so a refused
  round leaves nothing behind.
- Create `$roundDir`; move the wav there; mux to `$roundDir\${leaf}_v${M}_with_sound_v${N}.mp4`
  with the identical ffmpeg line.
- `FEEDBACK.md`: copy `$audioRoot\FEEDBACK.template.md` to `$roundDir\FEEDBACK.md` with
  these literal replacements and nothing else: `<scene>` → the scene as given with forward
  slashes (e.g. `brandmark/closing`); `<N>` → N; `<N-1>` → N−1;
  `` `<scene>_..._v<N>_with_sound_v<N>.mp4` `` → the actual mp4 filename in backticks;
  `<source video>` → `marketing/silent-studio/all-renders/<leaf>_vM.mp4`;
  `../../all-renders/<scene>_v<N>.mp4` → the same silent-studio path; `<duration>` →
  the video duration to one decimal; `<date>` → today `yyyy-MM-dd`. Placeholders inside
  `<…>` in the body ("What this is", "What changed", "What to listen for") stay for the
  author. If the template file is missing, exit 1.
- `all-renders/`: for every file in `$audioRoot\all-renders` matching
  `^${leaf}_v\d+_with_sound_v\d+\.mp4$`, **move** it to
  `$safeToDelete\audio-studio-all-renders\<name>.<yyyyMMdd-HHmmss>.mp4` (create the folder;
  never delete — CLAUDE.md rule 5). Then copy the new mp4 into `all-renders/`.
- Final lines: the three paths written, plus "Next: fill `What this is / What changed /
  What to listen for` in soundvN/FEEDBACK.md and update the folder-map row in
  structure.md (lines 103–111) — regen.ps1 does not edit docs."

### 1.6 General

- Every failure path: `Write-Error` with the fix, `exit 1`. Never `Remove-Item`.
- `__pycache__/` appears under `audio-studio/` after the first run; it is already
  gitignored (`.gitignore` line "`__pycache__/`"). Say so in a comment, do nothing.

## 2. The walkthrough — section 5 of this folder's `COMMANDS.md`

`marketing/cycles/08_daynight-audio-control-and-website/COMMANDS.md` exists and ends
with a placeholder section headed exactly
`## 5. Audio regeneration on your PC (regen.ps1) — pending` (one paragraph). Replace
that section — heading and paragraph, through end of file — with the walkthrough below
under the heading `## 5. Audio regeneration on your PC (regen.ps1)`; sections 1–4 above
it stay untouched. Use numbered steps under that heading, never a new `#` title. Do
**not** create `audio-studio/REGEN.md`. Copy-paste PowerShell, the tone and shape of
`silent-studio/COMMANDS.md`. Steps, in this order; every command block must be runnable
as pasted once step 5's `cd` into
`C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio` has been
done (steps 6 and 9 assume it).

1. **What this is** (3 lines): regenerate a scene's soundtrack and the muxed mp4 on
   your PC, so a number changed in `soundtrack.py` can be heard in seconds. Preview by
   default; `-Round` makes a real round.
2. **One-time: do you have Python?** Run, in this order, and read the outcome table:
   ```powershell
   py -3 --version
   python --version
   ```
   | You see | Meaning | Do |
   |---|---|---|
   | `Python 3.x.y` from either | Python is there | note which command worked; go to step 3 |
   | `'py' is not recognized…` **and** `Python was not found; run without arguments to install from the Microsoft Store…` (or the Store opens) | no Python on PATH — but you may have Anaconda | step 2b |
   | `Python 2.x` | too old | use `py -3`; if that fails, step 2c |
   2b. **Anaconda check** — run:
   ```powershell
   foreach ($p in "$env:USERPROFILE\anaconda3\python.exe", "$env:LOCALAPPDATA\anaconda3\python.exe", "$env:USERPROFILE\miniconda3\python.exe", "C:\ProgramData\anaconda3\python.exe") { if (Test-Path $p) { "FOUND  $p" } }
   ```
   If one prints `FOUND`, you can pass it to the script as `-Python "<that path>"`
   (Anaconda already bundles numpy and scipy). If that later fails with `DLL load failed`,
   run the same `regen.ps1` line from the **Anaconda PowerShell Prompt** (Start menu),
   where Anaconda is on PATH, and drop `-Python`. If nothing prints, step 2c.
   2c. **Install Python**: `winget install Python.Python.3.12` (or python.org's installer
   with "Add python.exe to PATH" ticked). Close and reopen PowerShell, then `py -3 --version`.
3. **numpy + scipy**:
   ```powershell
   py -3 -c "import numpy, scipy; print(numpy.__version__, scipy.__version__)"
   ```
   (swap `py -3` for whatever worked in step 2). Two version numbers → done.
   `ModuleNotFoundError` → `py -3 -m pip install numpy scipy`, then re-run the check.
4. **ffmpeg**: `ffmpeg -version` — should already work because `render.ps1` needs it too.
   If not, the install hint in `..\silent-studio\render.ps1` applies.
5. **Let the script check everything for you**:
   ```powershell
   cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio"
   powershell -ExecutionPolicy Bypass -File .\regen.ps1 -Check
   powershell -ExecutionPolicy Bypass -File .\regen.ps1 -Check -Python "C:\path\to\python.exe"   # only if step 2b applied
   ```
   Same `-ExecutionPolicy Bypass` story as `render.ps1` (`marketing\silent-studio\COMMANDS.md`).
6. **First run** (shortest scene, 4 s):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\regen.ps1 -Scene brandmark/closing
   ```
   Expect `brandmark\closing\regen\closing_v3_with_sound_v2.mp4` and `soundtrack_v2.wav`
   next to it. Double-click the mp4. (Version numbers will move on as rounds advance.)
7. **The nudge loop**: open `<scene>\soundtrack.py` in any editor (Notepad is fine;
   PyCharm/VS Code if you have them), change a number, save, re-run the same command,
   listen. What the numbers mean, in plain words: `amp=` how loud that layer is;
   `bpm=` how fast the plucked pattern runs; the last argument of `mix_into(...)` is
   the second at which that sound starts; `wet=` inside `finish(...)` is how much
   reverb; `attack=`/`release=` how soft the start/end of a sound is. Leave `DURATION`
   and the `wavfile.write("soundtrack_vN.wav" …)` line alone unless you are starting a
   new round. The script runs from inside the scene folder on purpose — do not run
   `python soundtrack.py` from elsewhere; it will not find `synth.py`.
   Note: two runs of the *same* file are never byte-identical — the whooshes, plucks and
   clicks are made from random noise — so a tiny difference between runs is normal.
8. **Keeping or discarding what you tried**: `git diff marketing/audio-studio` shows your
   edits to `soundtrack.py`; `git checkout -- marketing/audio-studio/<scene>/soundtrack.py`
   throws them away; commit to keep. `regen\` is gitignored, so previews never end up in
   git. If you like a change, either commit `soundtrack.py` and say so in the scene's
   `AUDIO-BRIEF.md` / latest `FEEDBACK.md`, or make it a round yourself (step 9).
9. **Making it a real round** (optional — rounds are normally Claude's): bump the `vN` in
   the `wavfile.write` line to the next number, then
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\regen.ps1 -Scene gates-saving -Round
   ```
   This creates `soundvN\` with the wav, the mp4 and a pre-filled `FEEDBACK.md` to
   finish by hand, and swaps the scene's file in `all-renders\` (the old one goes to
   `safe_to_delete\`). The script refuses if `soundvN\` already exists.
10. **Other switches**: `-Video <path>` to mux onto a different render (e.g. a fresh
    `..\silent-studio\<scene>\renders\…mp4` before it is a round); `-Python <path>`.
11. **Scene names**: `colours`, `gates-saving`, `ranking`, `start-ride`, `teaser`,
    `brandmark/opening`, `brandmark/closing`.

## 3. `.gitignore` (repo root)

Append, after the existing `_to_delete/` line:
```
# audio-studio local preview output (regen.ps1); rounds live in soundvN/, not here
marketing/audio-studio/**/regen/
```

## 4. Doc edits (anchored; re-read the anchors before editing)

- `audio-studio/structure.md`
  - After the paragraph ending line 38 ("…not a disposable preview.") insert one
    paragraph: "Since 2026-09 there is an optional local twin of that step for Nathan's
    PC: `regen.ps1` at this folder's root runs a scene's `soundtrack.py` and the same
    ffmpeg mux (`-c:v copy -c:a aac -b:a 192k`). Without switches it writes to
    `<scene>/regen/` (gitignored — a preview, not a round); with `-Round` it writes a real
    `soundvN/` and the `all-renders/` copy per the conventions below. Setup and usage:
    `../cycles/08_daynight-audio-control-and-website/COMMANDS.md`, section 5."
  - In the folder tree (lines 47–68), add after the `FEEDBACK.md` line, at the same
    indentation as `soundvN/`:
    `regen/                local preview output from regen.ps1 (gitignored, overwritten each run; not a round)`
- `audio-studio/APPROACH.md`
  - Lines 133–137 (alternative C): replace "Separate follow-up brief (…), not yet
    written, not part of this move." with "Built as `regen.ps1` at this folder's root;
    Nathan's walkthrough is section 5 of
    `cycles/08_daynight-audio-control-and-website/COMMANDS.md` (brief:
    `BRIEF-audio-regen-local.md` there); first run on Nathan's PC pending." Keep
    "Composes with A's `KNOBS`."
  - Lines 40–43 ("`gates-saving/soundtrack.py` itself still has its own inline copy …
    not required.") → replace with "(`gates-saving/soundtrack.py` migrated onto it in
    soundv3, 2026-09-13.)" and strike the matching bullet at lines 145–147 in "Open
    questions" with `~~…~~ — resolved (soundv3, 2026-09-13)`, the way line 142 already
    does. Verified: that file's line 36 is `sys.path.insert(0, "..")` and line 37 imports
    from `synth`; `structure.md` line 43 says the same.
- Nothing else. `silent-studio/COMMANDS.md`, `STUDIO-GUIDE.md`, `VIDEO-EDITING-GUIDE.md`,
  `STATE.md` (coordinator's), any `soundtrack.py`, `synth.py`, any `FEEDBACK.md`, any
  `AUDIO-BRIEF.md`: untouched. The only file edited outside `audio-studio/` and the
  repo-root `.gitignore` is this cycle folder's `COMMANDS.md` (§2).

## 5. Verification (executor, before reporting done)

- Files exist: `audio-studio/regen.ps1`; this folder's `COMMANDS.md` section 5 no longer
  says "pending" and holds steps 1–11; no `audio-studio/REGEN.md` was created;
  `.gitignore` has the new line; `git diff --stat` shows only `regen.ps1`, `.gitignore`,
  that `COMMANDS.md`, `structure.md`, `APPROACH.md`.
- `regen.ps1` contains, verbatim as separate tokens, `-c:v copy -c:a aac -b:a 192k -shortest`;
  the N regex from ruling 4; the `^<leaf>_v(\d+)\.mp4$` pattern; a `Push-Location` to
  the scene folder before the Python call; no `Remove-Item`.
- Parse check, where a PowerShell is available (Nathan's PC or `pwsh` in the sandbox):
  `powershell -NoProfile -Command "[scriptblock]::Create((Get-Content -Raw .\regen.ps1)) | Out-Null"`.
  If no PowerShell is available, say so — do not claim it parses.
- Sandbox dry-run of the two commands the script issues, if numpy/scipy import there:
  `cd audio-studio/brandmark/closing && python3 soundtrack.py` (expect
  `wrote soundtrack_v2.wav 4.0 s`), then the ffmpeg line against
  `silent-studio/all-renders/closing_v3.mp4`, then `ffprobe` on the result: one `h264`
  stream and one `aac` mono 44100 Hz stream, duration 4.0. Move the two scratch outputs
  to `safe_to_delete/`, never leave them in the scene folder. If numpy/scipy are absent
  in the sandbox, report that and skip; do not fake the run.
- Read the new `COMMANDS.md` section 5 once as Nathan: every command block runnable as
  pasted after step 5's `cd`; the outcome table covers all three step-2 cases.
- The actual first PC run (`-Check`, then `-Scene brandmark/closing`) is Nathan's; list
  it in the report as pending, never as done.

## 6. Stop-on-ambiguity

If any anchor above does not match the file (line numbers drifted, the `wavfile.write`
form differs in any script, the template tokens differ from §1.5, the silent twin lacks a
scene, `FEEDBACK.template.md` is missing), or any call is undecided (an eighth scene, a
second silent version for one scene, a PowerShell construct you are unsure is 5.1-safe),
**STOP and report verbatim** — file, line, what you expected, what you found. Never
guess, never rule on it yourself, never fix an unrelated thing you noticed.

## 7. Report format

Files created/edited with paths; the exact regex and ffmpeg line as they appear in the
script; each §5 check with its result (ran / could not run and why); any stop. Tokens used.
