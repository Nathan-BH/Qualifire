# BRIEF — teaser sound lanes (cycle 19)

> «Ruling 2, 2026-09-24»: see RULINGS-2.md for the 20 rulings of the fix round (copy-list mute/solo rule, video proxy, scrub timing, `+` defaults, undo, tests, mutation battery). Where this brief and RULINGS-2 differ, RULINGS-2 wins.

Plan tier: Fable 5.1, 2026-09-24. Executor: Sonnet, stop-on-ambiguity. Inspector: fresh-context Opus (section 12).
«Ruling 1, 2026-09-24»: edits marked with this tag come from `RULINGS-1.md` (kit WAVs are 32-bit float; 16 default clips; report file is EXECUTOR-REPORT.md). Where this brief and RULINGS-1.md disagree, RULINGS-1.md wins.
Repo root on Nathan's PC: `C:\Users\natha\Claude personal projects\Qualifire` = `$HOME/mnt/Qualifire` in device_bash (a Linux VM on his machine: ffmpeg /usr/bin/ffmpeg, node v22.23.2, python3 + numpy 2.2.6, all verified 2026-09-24).
Paths below are relative to the repo root unless they start with `/` or `C:`.

---

## 0. For Nathan — what this builds, in plain words

A new page, `marketing/audio-studio/tools/teaser-lanes/teaser-lanes.html`, that you double-click in Chrome or Edge. The silent teaser (`teaser_v9.mp4`, 47.6 s, 1428 frames) plays on the LEFT, with its big time/frame readout, the transport and the clip editor under it. To its RIGHT, using the full height, nine long sound lanes, one per sound: the opening piano logo, the emotional-classical bed (original mix), the same bed split two ways (A: strings + other; B: piano + drums + bass + other), and the five E5 gate pulses. One red playhead runs through everything. Space plays, the arrow keys step one frame, and when you step you hear exactly that frame's slice of every unmuted lane.

Each lane shows its sound as a waveform. A shaded block on a lane is a **clip**: "play source in–out of this sound starting at render time X". Every lane has two clocks: the render clock (the video's, shown big under the video) and its own source clock (0 = start of that sound file, shown in the lane header while the playhead is over one of its clips). Click a block and one small row of number fields appears: source in, source out (or length), render start; render end is shown. Type numbers and press Enter. `+` on a lane adds a clip at the playhead; Duplicate copies the selected clip to the playhead; Delete removes it. M mutes, S solos.

When you press **Copy list** you get one plain line per clip, e.g.
`a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45)` — paste that into chat and Claude builds the audio from it. That is the only output. The tool writes no audio and changes no file. Your clips and mute settings are remembered by the browser between sessions; **Reset** puts back today's teaser sound.

**It will not**: edit or save audio, mix or export, drag clips with the mouse (numbers only, on purpose), work in Firefox, or promise sample-exact sync in real-time playback (about ±1 frame on wired output, worse on Bluetooth; stepping/scrubbing is exact by construction).

**One-time preparation** (Claude does it, you can re-run it): `python prep_kit.py` copies the ten sound files and the video into `tools/teaser-lanes/kit/` as WAVs plus a `manifest.json`, and renders the E5 pulses into their own file. The page opens that one folder with one click. Nothing is moved or deleted.

**Default state = today's teaser sound**: logo at 0.0 (gain 0.85, fade 6.0–6.5); bed at 10.30 and at 23.04 (gain 0.45; second instance fades 31.8–32.8); E5 pulses at 24.30 / 26.31 / 28.15 / 30.01 / 31.88 (Digest B's "29.81" was a typo: 23.51 + 6.5 = 30.01). The stem lanes carry the same two bed placements but start muted, so muting `bed` and unmuting `a-strings` plays the strings where the bed was. Lanes A and B are two splits of the same bed: unmute one split OR the bed, never both (it is written on screen).

---

## 1. Hard rules (executor: read twice)

1. **Never delete.** If something must go, `mv` it to `safe_to_delete/` under the repo root (create it). Never call `device_request_delete_permission`.
2. Files edited/created: ONLY under `marketing/audio-studio/tools/teaser-lanes/` (new folder, incl. its `kit/`) and `marketing/cycles/19_teaser-sound-lanes/` (your reports, screenshots). `marketing/audio-studio/tools/av-align/` stays byte-identical (md5 of its three files before Phase A and after Phase E must match; §11). Nothing else in the repo is touched; the coordinator does bookkeeping (STATE, OPEN-ITEMS, cycle README rows, `.gitattributes` LF pin for the new folder — you do NOT edit `.gitattributes`).
3. git via device_bash: always `GIT_OPTIONAL_LOCKS=0 git status` etc. Never commit, never stage. Read-only git only.
4. LF line endings, UTF-8, no BOM, in every file you write. Check: `file <f>` shows no CRLF; `head -c3 <f> | xxd` is not `ef bb bf`.
5. The page has no external URLs, no CDN, no web fonts, no `<link>`, no `<script src>`. `node teaser-lanes.test.mjs` enforces it.
6. Every anchor (file:line) in this brief must be re-verified when you read it (`sed -n` / `grep -n`). If it does not match: STOP and report the mismatch verbatim.
7. **STOP-on-ambiguity**: on any ambiguity, anchor mismatch, or failing check not covered by §10 (pre-decided calls), stop and report verbatim (what you saw, what you expected, the command). Never guess, never rule. Leave the tree consistent (finish the file you were writing or move it aside; state which phase checkpoint holds).
8. device_bash calls are short (≤ 120 s default, 180 s max, no background processes). Split work accordingly; write long scripts as files and run them.
9. Author files in the cloud container (Write tool), then land them on the PC with `device_commit_files` to `C:\Users\natha\Claude personal projects\Qualifire\marketing\audio-studio\tools\teaser-lanes\<name>` (staged path under `/mnt/user-data/outputs/`). Small text can be written on the mount directly. Never re-type a file's content from tool output.
10. Nothing may be described as "listened to". Verified means measured or looked at (screenshots) and you say which.
11. Do not ask Nathan anything. Taste decisions are in §13; the coordinator forwards stops to a fresh Fable.

---

## 2. Facts verified by Plan (2026-09-24) — reuse, do not re-derive

- `teaser_v9.mp4`: 47.600 s, 30 fps, 1428 frames, 1920x1080 h264, silent, 12,470,104 bytes, md5 `07f9c5b495519c97cdec3987decc027f`. Scene cuts: opening 0–6.5, start-ride 6.5–20.5, gates-saving 20.5–32.8, ranking 32.8–43.6, closing 43.6–47.6. **Teaser clock = ride clock + 6.5 s.**
- `ride/soundv2/ride_master_v2.wav`: 26.300 s, 1,159,830 stereo int16 frames, md5 `49a3b66eff66b74ac75e27c9f5d8df83`. Plan re-rendered it in the VM with the exact ride_tunetank.py chain: **max |diff| = 1 LSB, 0 samples > 1 LSB, 3.5 s runtime.** So Phase B is feasible in the VM and the pass rule is ≤ 2 LSB.
- After `ffmpeg -ac 2 -ar 44100 -f f32le` decode, `original.mp3` AND every stem are exactly **663,552 samples = 15.0465 s** (Digest B's 15.073 was the container duration incl. encoder padding; ffmpeg's gapless trimming removes it). Cross-correlation vs original: every stem lag 0 samples (bass 12 samples = 0.27 ms, i.e. noise for a −13 dBFS layer); sum(strings-model strings+other) lag 0, corr 0.9999, residual rms 0.004 vs 0.277; sum(6stem bass+drums+piano+other) lag 0, corr 0.9998. `6stem_instrum` corr 1.000 vs original (= whole mix). `6stem_guitar`, `6stem_vocals` peak 0.000.
- E5 events (`ride_master._e5_events()` → (content, dur)): tau = [17.80, 19.81, 21.65, 23.51, 25.38] ride clock, durations [1.28, 0.53, 1.22, 1.25, 1.23]; rendered mono by `salamander_render.render(notes, 26.3, velocity=105, gain=GAIN_VOICE_E5)` (GAIN_VOICE_E5 = 0.5723, `piano/projects/interstellar/salamander_soundtrack.py:36`), × GAIN 1.5 (`ride/ride_master.py:57`), `window_mix.fade_out(e5, 26.3, 0.5)`, added to both channels. Rendered peak 0.5025. Sample index of tau 17.80 = 784,980; e5 tail length 374,850 samples = 8.500 s. RMS in the 50 ms after each tau / 50 ms before ≥ 9000 (pulses never overlap).
- Bed placements (`ride/ride_tunetank.py:66-73`): T1 3.80, ATTACK 1.26, T2 16.54, GAIN_BED 0.45, BED_FADE (26.3, 1.0) applied to the summed bed layer (ride-1 instance ends 3.80+15.0465 = 18.85 < 25.3, so only ride 2 is faded), E5_FADE (26.3, 0.5). `window_mix.place` (`window_mix.py:15-23`): `start = round(at*sr)`, add `gain*layer`, clipped to master. `window_mix.fade_out` (`:41-53`): `linspace(1,0,n,endpoint=False)` over `[round((t_end-len)*sr), round(t_end*sr))`, zero after.
- Opening (`brandmark/opening/soundtrack.py:73-79, 103-110`): DURATION 6.5, T0 0.0, GAIN 0.85, END_FADE 0.5; `build()` returns `(m, track)` where `m` is the 6.5 s stereo float mix. Logo file `piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3`, 8.4375 s container = 372,096 samples = `source_len_s` 8.4376 by the 4-decimal rule «Ruling 1, 2026-09-24».
- av-align (`tools/av-align/av-align.html`): pure core `<script id="av-core">` lines 362–482 (`frameOf` 366, `shownFrameOf` 369, `seekTimeOfFrame` 370, `roundTenthMs` 371, `nudgeFrames` 374, `peakBins` 413–431); engine: `ensureCtx` 605, `stopAll` 610, `startPlacement` 673–691 (lead = max(0, 0.05 − outputLatency), o0 handling), `tick` 694–702 (25 ms drift → restart), `onFrame` 704 (rVFC), `loop` 711, `togglePlay` 719, `scrubPlay` 733–756 (2 ms fades, `node.start(w, c0, len)`), `loadVideo` 764, `stepTo` 776–793 (register rVFC BEFORE setting currentTime, `seeked` + 400 ms fallback). Test harness pattern: `tools/av-align/av-align.test.mjs` lines 1–15 (regex-extract the core script, `vm.runInNewContext`).
- Cloud container: node v22.22.2, Playwright **1.56.0** at `/usr/local/lib/node_modules_global/playwright` (import it by that absolute path: `import { chromium } from '/usr/local/lib/node_modules_global/playwright/index.mjs'`), Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, ffmpeg + ffprobe, numpy 2.4.4. Verified there: `locator.setInputFiles('<dir>')` on `<input type=file webkitdirectory>` delivers the folder's files with `webkitRelativePath = "<dir>/<name>"`; `URL.createObjectURL(file)` + VP9 webm plays; `new AudioContext({sampleRate:44100})` is `running` with launch arg `--autoplay-policy=no-user-gesture-required`; `decodeAudioData` on 16-bit WAV works («Ruling 1, 2026-09-24»: the kit is 32-bit float WAV, format tag 3; Chromium's decode of it is proven by e2e-real's `data-peak` check); `requestVideoFrameCallback` fires after a paused seek ONLY if registered before `currentTime` is set, and ~19 times per 600 ms of play.
- The VM cannot open a browser; Chrome/Edge on Windows are Nathan's alone (§9.E list).

---

## 3. Deliverables (all new)

```
marketing/audio-studio/tools/teaser-lanes/
  teaser-lanes.html        the tool (single file; <script id="lanes-core"> pure core + <script> app), < 160 KB
  teaser-lanes.test.mjs    node tests of the core (node >= 20, no deps)
  prep_kit.py              builds kit/ from the repo sources (python3 + numpy + ffmpeg); writes kit/prep-report.txt
  verify_default_mix.py    offline mix of the manifest's default clips vs ride_master_v2.wav and the opening mix
  tests/synthetic-kit.mjs  generates a synthetic kit (cloud) into a given dir
  tests/e2e.mjs            Playwright run against the synthetic kit; writes tests/out/*.png and tests/out/report.txt
  README.md                how to use (Nathan) + how to test (coordinator), <= 60 lines
  .gitignore               contains: kit/  tests/out/
  kit/                     GENERATED by prep_kit.py (never committed): manifest.json, teaser_v9.mp4, 9 wavs, prep-report.txt
marketing/cycles/19_teaser-sound-lanes/
  EXECUTOR-REPORT.md       your phase-by-phase report («Ruling 1, 2026-09-24»: this name, not EXEC-REPORT.md) (checkpoints, outputs, numbers, what only Nathan can verify)
  shots/                   the e2e screenshots copied here (1440x900, 1440x810, 1920x1080, 1920x990, 1000x800 stacked, 0.5 s zoom, empty state, help open)
  prep-report.txt          copy of kit/prep-report.txt
```

---

## 4. The kit and `prep_kit.py` (Phase B)

Why WAV: `decodeAudioData` on mp3 may or may not apply gapless trimming, ffmpeg does; the build scripts (`ride_tunetank.decode_stereo`) use ffmpeg. Transcoding once with the SAME ffmpeg command makes what the tool plays sample-identical to what the build scripts mix, and removes the 15.073/15.047 question. WAV decode is exact and fast; ~43 MB of float WAV on disk (kit ~55 MB with the video), ~60 MB decoded in RAM «Ruling 1, 2026-09-24»: 32-bit float, because the mp3 decode has samples above 1.0 (bed 1.0435, other A 1.1309, other B 1.0384) that the build scripts mix unclipped; a 16-bit copy clipped them and failed §9.E.3 (a) by 642 LSB.

Run: `cd "$HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes" && timeout 170 python3 prep_kit.py` (VM). Nathan may run `python prep_kit.py` on Windows; it needs only python3, numpy, ffmpeg on PATH (same as ride_tunetank.py). No PowerShell wrapper (§13.1).

`prep_kit.py` does, in order, printing each step and appending to `kit/prep-report.txt` (overwrite the report at start):

1. `HERE`, `AS = HERE/../..` (= audio-studio). `sys.path` inserts exactly as `ride/ride_tunetank.py:51-53` (`AS`, `AS/piano/projects/interstellar`, `AS/ride`). Import `salamander_render as sr_`, `window_mix as wm`, `from ride_master import GAIN, GAIN_VOICE_E5, MASTER_DUR, SR_OFFSET, TEMPO, _e5_events, _midi`, `from synth import NOTES`, and load `ride_tunetank.py` via `importlib.util.spec_from_file_location` (it has a `__main__` guard; you only need `T1, ATTACK, T2, GAIN_BED, BED_FADE, E5_FADE, BED_MP3, decode_stereo, write_wav_stereo`). SR = 44100.
2. `mkdir -p kit` (never wipe it; overwrite files by name).
3. «Ruling 2, 2026-09-24» (was: copy the video verbatim): md5 of the source must be `07f9c5b495519c97cdec3987decc027f` else STOP; write a short-GOP PROXY `kit/teaser_v9-proxy.mp4` with `ffmpeg -v error -y -i SRC -an -c:v libx264 -preset veryfast -crf 20 -g 10 -keyint_min 10 -sc_threshold 0 -bf 0 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 30000 DST` (1920x1080 kept; ≈ 15.5 MB, ≈ 26 s). Checks (STOP on failure): h264 1920x1080, r_frame_rate 30/1, nb_frames 1428, duration 47.600 ± 0.001, per-frame timestamps equal to the source (1428 each, max diff ≤ 1e-5 s; `frame=pts_time,pkt_pts_time -of json`, take the one present), keyframes == 143, size < 40 MB. Keep an existing proxy that passes the checks when the existing manifest has the same `source_md5` (idempotent, `proxy kept (checks pass)`); the old verbatim copy is moved to `<repo>/safe_to_delete/`, never deleted. Details: RULINGS-2 ruling 3a.
4. «Ruling 1, 2026-09-24»: decode each audio source with `rt.decode_stereo(SRC)` (= `ffmpeg -i SRC -ac 2 -ar 44100 -f f32le -`) and write it unchanged as a 32-bit float WAV with prep_kit's own `write_wav_f32` (RIFF, 16-byte `fmt `, tag 3, 2 ch, 44100 Hz, 32 bits, `data`; no `fact` chunk; ffmpeg's `pcm_f32le` muxer writes an EXTENSIBLE header that Python's `wave` cannot read, hence the own writer). Read-back must equal the decode bit-for-bit (`np.array_equal` on float32) else STOP. Was: `ffmpeg ... -c:a pcm_s16le`. Table (id → source → kit file):
   - `logo` ← `piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3` → `logo.wav`
   - `bed` ← `stemsplitter/tunetank-emotional-classical/sources/original.mp3` → `bed.wav` (md5 of source must be `a5ea27ca9bd0742beb78bf61bc0ae5fa`, identical to the tunetank-ride file)
   - `a-strings` ← `.../strings-model_strings.mp3` → `a-strings.wav`; `a-other` ← `.../strings-model_other.mp3` → `a-other.wav`
   - `b-piano` ← `6stem_piano.mp3`; `b-drums` ← `6stem_drums.mp3`; `b-bass` ← `6stem_bass.mp3`; `b-other` ← `6stem_other.mp3` → `b-*.wav`
   - excluded, written in the report and in `manifest.notes`: `6stem_instrum` (= whole mix again, corr 1.000), `6stem_guitar`, `6stem_vocals` (peak 0.000)
   For each: read the WAV back with `read_wav_f32` («Ruling 1, 2026-09-24»), record `samples`, `peak` (max |sample|, 4 decimals, may exceed 1.0), `source_len_s = round(samples/SR, 4)`, `peak_dbfs`, source md5, source ffprobe duration. Check: bed-family files all have 663,552 samples else STOP-report; logo 372,096 ± 2 (8.4375 s) else report the number (not a stop).
5. **E5 lane** (`e5.wav`): exactly the `ride_tunetank.py:114-121` chain: `pairs = _e5_events(); notes = [(_midi("E5", NOTES), c/TEMPO + SR_OFFSET, d/TEMPO) for c, d in pairs]; e5, _ = sr_.render(notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_E5); n = round(MASTER_DUR*SR); e5 = e5[:n].astype(float64) * GAIN; wm.fade_out(e5, E5_FADE[0], E5_FADE[1], sr=SR)`. Then `i0 = round(17.80*SR) = 784980`; `e5_file = stack([e5[i0:], e5[i0:]], axis=1)` (374,850 × 2); `write_wav_f32("kit/e5.wav", e5_file)`. So **e5.wav file t=0 = ride 17.80 = teaser 24.30**; pulses inside the file at 0.000 / 2.010 / 3.850 / 5.710 / 7.580; gain 1.5×0.5723 and the 0.5 s fade (file 8.0–8.5) are BAKED IN, so its clip gain is 1.0 and no fade.
6. **E5 + chain verification** (the design asked for): re-render the bed layer exactly as `ride_tunetank.py:107-111` (place T1, place T2, gain GAIN_BED, `fade_out(26.3, 1.0)` per channel) from `decode_stereo(BED_MP3)`; `master = bed_layer; master[:,0] += e5; master[:,1] += e5`; `pcm = (clip(master,-1,1)*32767).astype(int16)`; read `ride/soundv2/ride_master_v2.wav`; require equal shape (1,159,830 × 2) and `max|existing − pcm| ≤ 2` LSB and count(>1) ≤ 100. Also: `derived = existing[:,0]/32767 − bed_layer[:,0]`; `max|derived − e5| ≤ 1e-3`. Also per pulse: `rms(e5[a:a+2205]) / max(rms(e5[a-2205:a]), 1e-9) ≥ 100` for `a = round(tau*SR)`. Any failure → STOP-report with the numbers and the peak-correlation lag between existing and pcm.
7. **Alignment check** (guard; Plan measured lag 0 everywhere): decode kit wavs to mono float; `lag(ref, x)`: FFT cross-correlation `c[k] = Σ_t ref[t]·x[t+k]`, |k| ≤ 4410, return `k*` and the normalised correlation at `k*`. Self-test first: `x = concat(zeros(100), ref)` must return k = 100 (else STOP). Compute vs `bed`: each stem (report only), `sumA = a-strings + a-other`, `sumB = b-piano + b-drums + b-bass + b-other`. Rules: for sumA and sumB, corr ≥ 0.99 and |k| ≤ 22 samples → `file_offset_s = 0` for that family; 22 < |k| ≤ 2205 and corr ≥ 0.9 → `file_offset_s = round(k/SR, 6)` for every track of that family (file time = source time + offset) and a WARN line; otherwise STOP-report. A stem whose own |k − k_family| > 44 samples with corr ≥ 0.5 → STOP-report.
8. Write `kit/manifest.json` (2-space indent, LF, sorted keys off — keep the order below):

```json
{
  "kit": "teaser-lanes", "version": 1, "made": "2026-09-24T18:00:00Z", "made_by": "prep_kit.py",
  "video": { "file": "teaser_v9-proxy.mp4", "name": "teaser_v9.mp4", "fps": 30, "duration_s": 47.6, "frames": 1428,
             "source": "marketing/silent-studio/all-renders/teaser_v9.mp4", "source_md5": "07f9c5b495519c97cdec3987decc027f",
             "proxy": "re-encoded by prep_kit.py for frame stepping: libx264 crf 20, keyframe every 10 frames, same 1920x1080 30 fps and the same 1428 frame timestamps; for looking only, never mix from it", "keyframes": 143 },
  "groups": [
    { "id": "open",  "label": "Opening" },
    { "id": "bed",   "label": "Bed, original mix" },
    { "id": "A",     "label": "Bed split A (strings model): strings + other = the original" },
    { "id": "B",     "label": "Bed split B (6-stem model): piano + drums + bass + other = the original" },
    { "id": "pulse", "label": "Gate pulses (E5), rendered from the Salamander samples, gain and fade baked in" }
  ],
  "tracks": [
    { "id": "logo",      "label": "logo",      "group": "open",  "file": "logo.wav",      "file_offset_s": 0, "source_len_s": 8.4376,  "muted": false, "source": "marketing/audio-studio/piano/projects/tunetank/sources/tunetank-piano-logo-484286.mp3", "source_md5": "<md5>", "samples": 372096 },
    { "id": "bed",       "label": "bed",       "group": "bed",   "file": "bed.wav",       "file_offset_s": 0, "source_len_s": 15.0465, "muted": false, "source": "...original.mp3", "source_md5": "a5ea27ca9bd0742beb78bf61bc0ae5fa", "samples": 663552 },
    { "id": "a-strings", "label": "strings A", "group": "A", "file": "a-strings.wav", "file_offset_s": 0, "source_len_s": 15.0465, "muted": true, "source": "...", "source_md5": "...", "samples": 663552 },
    { "id": "a-other",   "label": "other A",   "group": "A", "file": "a-other.wav",   "...": "..." },
    { "id": "b-piano",   "label": "piano B",   "group": "B", "file": "b-piano.wav",   "...": "..." },
    { "id": "b-drums",   "label": "drums B",   "group": "B", "file": "b-drums.wav",   "...": "..." },
    { "id": "b-bass",    "label": "bass B",    "group": "B", "file": "b-bass.wav",    "...": "..." },
    { "id": "b-other",   "label": "other B",   "group": "B", "file": "b-other.wav",   "...": "..." },
    { "id": "e5",        "label": "E5 pulses", "group": "pulse", "file": "e5.wav",    "file_offset_s": 0, "source_len_s": 8.5, "muted": false, "source": "rendered by prep_kit.py from ride_master.py/ride_tunetank.py", "source_md5": "", "samples": 374850 }
  ],
  "clips": [
    { "track": "logo",      "in": 0, "out": 6.5,     "at": 0,     "gain": 0.85, "fade_in": 0, "fade_out": 0.5 },
    { "track": "bed",       "in": 0, "out": 15.0465, "at": 10.3,  "gain": 0.45, "fade_in": 0, "fade_out": 0 },
    { "track": "bed",       "in": 0, "out": 9.76,    "at": 23.04, "gain": 0.45, "fade_in": 0, "fade_out": 1.0 },
    { "track": "a-strings", "in": 0, "out": 15.0465, "at": 10.3,  "gain": 0.45, "fade_in": 0, "fade_out": 0 },
    { "track": "a-strings", "in": 0, "out": 9.76,    "at": 23.04, "gain": 0.45, "fade_in": 0, "fade_out": 1.0 },
    "... the same two clips for a-other, b-piano, b-drums, b-bass, b-other (10 more) ...",
    { "track": "e5",        "in": 0, "out": 8.5,     "at": 24.3,  "gain": 1.0,  "fade_in": 0, "fade_out": 0 }
  ],
  "notes": [
    "Left out on purpose: 6stem_instrum.mp3 (= the whole mix again), 6stem_guitar.mp3 and 6stem_vocals.mp3 (empty, peak 0.000).",
    "Lanes A and B are two splits of the same bed: unmute one split OR the bed, not both.",
    "e5.wav: file t=0 is the START pulse (ride 17.80 s = teaser 24.30 s); pulses at 0.000 / 2.010 / 3.850 / 5.710 / 7.580 s; GAIN_VOICE_E5 x 1.5 and the 0.5 s fade to 8.5 s are baked in.",
    "Teaser clock = ride clock + 6.5 s. Bed clip 2 ends at 32.8 = 23.04 + 9.76 with the 1.0 s fade of ride_tunetank.py; bed clip 1 keeps the file's own tail (ends 25.3465).",
    "The kit video is a short-GOP proxy of teaser_v9.mp4 (Ruling 2, 2026-09-24); the original stays in silent-studio/all-renders."
  ],
  "how_made": { "decode": "ride_tunetank.decode_stereo (ffmpeg -i SRC -ac 2 -ar 44100 -f f32le -), written as 32-bit float WAV (WAVE_FORMAT_IEEE_FLOAT, tag 3) by prep_kit.py", "wav": "stereo, 44100 Hz, float32; samples above 1.0 preserved (bed 1.0435, other A 1.1309, other B 1.0384)", "e5": "ride_tunetank.py:114-121 chain, sliced from sample 784980" }
}
```
   Exactly 16 clips (logo 1 + bed 2 + six stems × 2 + e5 1; «Ruling 1, 2026-09-24», was 19). Every track also carries `"peak"` (max |sample|, 4 decimals) after `"samples"`; `notes` gets one more line on the float format (RULINGS-1 step 1e). `source_len_s` values come from the measured sample counts (4 decimals). Bed-family default clips use the bed's `source_len_s` for `out` of clip 1.
9. `prep-report.txt` ends with `PREP OK` or `PREP STOP: <reason>`. Also copy it to the cycle folder. Exit code 0 only on OK.

Time budget: transcodes ~1.5 s each, E5 render 2.4 s, correlations ~5 s: well under 60 s.

---

## 5. The page — pure core (`<script id="lanes-core">`, Phase A)

`const LanesCore = (() => { ... return { ... }; })();` — no DOM, no `window`, so `teaser-lanes.test.mjs` can `vm.runInNewContext(core + "\nmodule.exports = LanesCore;")` exactly like av-align's test. Copy (do not import) from av-align: `frameOf, timeOfFrame, shownFrameOf, seekTimeOfFrame, roundTenthMs, nudge, nudgeFrames, peakBins`. Add:

| function | contract |
|---|---|
| `fmtSeconds(t)` | `fmt3(t)`: three decimals, decimal round-half-up («Ruling 1, 2026-09-24»: not `toFixed(3)`, which gives `15.046` for 15.0465 because the double sits just under it); `fmtFrame(n)` → `"f" + n` |
| `fmtNum(x)` | up to 3 decimals, trailing zeros and dot stripped: 0.45→`0.45`, 1→`1`, 1.5→`1.5`, 15.0465→`15.047` (`fmt3` first, «Ruling 1, 2026-09-24»), 9.76→`9.76` |
| `parseTimeEntry(s, fps)` | `"44"`/`"44.0"`→seconds 44; `"f1320"`→1320/fps; `"1:04.5"`→64.5; else `null` |
| `clipLen(c)` = `roundTenthMs(c.out − c.in)`; `clipEnd(c)` = `roundTenthMs(c.at + clipLen(c))` | |
| `sourceTimeAt(c, tR)` | `c.in + (tR − c.at)` if `c.at ≤ tR < clipEnd(c)`, else `null` |
| `fileTimeOfSource(track, tS)` | `tS + (track.file_offset_s || 0)` |
| `clipsUnder(clips, trackId, tR)` | clips of that track with `sourceTimeAt ≠ null`, sorted by `at` |
| `laneReadout(clips, trackId, tR)` | `sourceTimeAt` of the first of `clipsUnder`, or `null`; `laneReadouts(clips, trackId, tR)` → all of them in `at` order, and the lane header shows them joined with ` | ` (left to right = clip start order), e.g. `src 14.000 | 1.260` for the bed at render 24.30 «Ruling 1, 2026-09-24» |
| `gainAt(c, tR)` | 0 outside; inside: `c.gain × fi × fo`, `fi = fade_in>0 ? min(1,(tR−at)/fade_in) : 1`, `fo = fade_out>0 ? min(1,(end−tR)/fade_out) : 1` |
| `frameSlice(c, track, n, fps)` | overlap of `[n/fps,(n+1)/fps)` with `[at,end)`: `{fileStart: fileTimeOfSource(track, c.in + (s0−c.at)), len: s1−s0, gain: gainAt(c,(s0+s1)/2)}` or `null` if `len ≤ 0.0005` |
| `startParams(c, track, tR)` | for real-time play from render time `tR`: `rel = tR − c.at`; if `rel ≥ len` → `null`; `delay = rel<0 ? −rel : 0; rel = max(0,rel)`; return `{delay, fileOffset: fileTimeOfSource(track, c.in+rel), dur: len−rel, g0: gainAt(c, c.at+rel), tFadeOutStart: max(0, end−fade_out−(c.at+rel)), tEnd: len−rel, gain: c.gain}` |
| `audible(lanes)` | `Map id→bool`: if any `solo` → only solo lanes; else `!muted` |
| `validateClip(c, track, video)` | returns `{ok, clip, errors[]}`; normalises `in,out,at,fade_*` with `roundTenthMs`, `gain` to 3 decimals; errors: `in < 0`, `out ≤ in`, `out > source_len_s` (→ clamps to `source_len_s`, adds warning not error), `at < 0`, `at ≥ video.duration_s`, `gain < 0 || gain > 4`, `fade_in + fade_out > len` |
| `overlaps(clips, trackId)` | list of `[start,end]` render intervals where ≥ 2 clips of the track overlap (for hatching) |
| `formatClipList(state)` | exact text, §7 |
| `parseManifest(objOrText)` | validates: `version === 1`; `video.file/fps/duration_s/frames` present, `frames === round(duration_s*fps)`; every track has unique `id` (regex `^[a-z0-9-]+$`), `label`, `group` (existing), `file`, numeric `source_len_s > 0`, boolean `muted`; every clip's `track` exists and passes `validateClip`. Throws `Error("manifest: <what>")`. Returns a deep copy with defaults filled (`file_offset_s` 0, `fade_*` 0, `gain` 1). |
| `buildState(manifest)` | `{video, groups, lanes:[{id,label,group,file,file_offset_s,source_len_s,muted,solo:false,status:"pending"}], clips:[{id:"c1"..,track,in,out,at,gain,fade_in,fade_out}], sel:null, zoom:"all"}` in manifest order |
| `laneHeight(innerH, N)` | side layout: `clamp(40, floor((innerH − 78)/N), 96)` → (810,9)→81, (900,9)→91, (990,9)→96, (1080,9)→96, (400,9)→40. 78 = top bar 36 + ruler 18 + status 24 |
| `layoutMode(innerW)` | `innerW >= 1100 ? "side" : "stacked"`; `leftWidth(innerW)` = `clamp(520, round(0.42*innerW), 760)` → 1440→605, 1920→760, 1100→520 |
| `windowFor(zoom, tPlay, dur)` | `"all"`→`[0,dur]`; `"10"`→10 s window centred on `tPlay`, clamped inside `[0,dur]`; `"2"`→2 s likewise; `"0.5"`→0.5 s likewise (15 frames: ≥ 44 px per frame at a 665 px lane) |
| `xOfTime(t, win, width)` / `timeOfX(x, win, width)` | linear map of `win=[t0,t1]` onto `[0,width)`; all drawing AND hit-testing use these two with the lane canvas's own `clientWidth` (never a constant) |
| `stateKey(manifest)` | `"teaser-lanes:" + manifest.kit + ":" + manifest.video.file + ":" + manifest.tracks.map(t=>t.id).join(",")` |
| `serializeState(state)` / `restoreState(saved, manifest)` | JSON of `{clips, muted:{id:bool}}`; restore drops clips whose track is unknown and re-validates each; returns `{state, dropped}` |

`clipsUnder`, `laneReadout`, `frameSlice` treat the clip end as exclusive; `at` inclusive.

---

## 6. The page — app (Phase C)

### 6.1 Layout (dark; side-by-side; no page scroll at inner sizes 1440x810 and 1920x990, and at viewports 1440x900 / 1920x1080)

Nathan (verbatim): "maybe it could be better to have the video on the left or right side instead of top. Since the tracks themself are long shaped while the video itself is more square!" So: **video LEFT, lanes RIGHT**, lanes take the full height.

```
+----------------------------------------------------------------------------------------------------------+
| Teaser sound lanes   [Open kit folder]  kit: teaser-lanes · teaser_v9.mp4                  [Copy list] [?] |  36 px, full width
+--------------------------------------------+-------------+-------------------------------------------------+
|                                            | hdr 132 px  |0      5      10     15     20     25     30 .. 45|  ruler 18 px
|            VIDEO 16:9                      | logo  M S + | ####                                            |
|         (605 px wide at 1440,              | src 0.412   |                                                 |
|          760 px at 1920)                   +-------------+-------------------------------------------------+
|                                            | bed   M S + |        ########clip1########  ###clip2##|       |
+--------------------------------------------+ src 1.260   |                                                 |
|  render   24.300 s    f729                 +-------------+-------------------------------------------------+  lanes:
+--------------------------------------------+ strings A   |        ............................  (muted,    |  9 x laneH
| [|<] [<<] [<] [ > play ] [>] [>>] [>|]     | M S +  src —|                                       dimmed)   |  81 px @1440x810
| go to [ 24.3    ] (s or f729)              +-------------+-------------------------------------------------+  96 px @1920x990
| [x] sound when stepping                    | other A     |                                                 |
| zoom [All] [10 s] [2 s] [0.5 s]            | ...         |                                                 |
+--------------------------------------------+-------------+-------------------------------------------------+
| clip: bed   in [ 0.000]  out [ 9.760]      | piano B     |                                                 |
|             len [ 9.760]  at  [23.040]     | drums B     |                                                 |
|             end 32.800   gain [0.45]       | bass B      |                                                 |
|             fade in [0]  fade out [1.0]    | other B     |                                                 |
| [Duplicate at playhead] [Delete]           +-------------+-------------------------------------------------+
+--------------------------------------------+ E5 pulses   |                              |  |  |  |  |      |
| How to (the 8 lines of 6.7; shown here     | M S + src — |                                                 |
| when they fit, otherwise behind ?)         |             |                                                 |
+--------------------------------------------+-------------+-------------------------------------------------+
| ready · 9 lanes · restored your last clips and mutes  [Reset to defaults]                                   |  status 24 px, full width
+----------------------------------------------------------------------------------------------------------+
```
CSS: `body` = grid rows `36px 1fr 24px`; the middle row = grid columns `var(--left) 1fr`, `--left: clamp(520px, 42vw, 760px)`. Left column (flex column, 12 px gutters): video (`width: 100%`, `aspect-ratio: 16/9`, black letterbox; 605x340 at 1440, 760x428 at 1920), readout row 44 px (`24.300 s   f729`, mono font ≥ 28 px), transport 2 rows (44 + 32 px), clip editor (2 rows, ≤ 80 px), how-to (`overflow: hidden`, fills what is left: ≥ 200 px at 1440x810 = the 8 lines at 13 px; if fewer than 8 lines fit, show only "press ? for the how-to"). Right area: ruler 18 px + lanes, `laneH = laneHeight(innerHeight, N)`; the lane stack fits by construction (`18 + N*laneH ≤ innerHeight − 60`). Lane header **132 px** wide, two rows: row 1 = label (ellipsis; group colour as a 3 px left bar: open=grey, bed=blue, A=teal, B=violet, pulse=amber) + `M` `S` `+` (20x20 px toggles/button, pressed = filled); row 2 = `src 3.500` (mono; `—` when no clip under the playhead; `missing` in amber when the file is missing). Waveform canvas = the rest of the row (`clientWidth` ≈ 1440−605−132−36 ≈ 665 px at 1440; ≈ 990 px at 1920). Every lane canvas and the ruler share `windowFor(zoom, playhead, duration)` and `xOfTime/timeOfX` with their own `clientWidth` (the layout makes them equal; e2e asserts all lane canvases have the ruler's width). The red playhead line spans ruler + all lanes.

Waveform: the lane's mono peaks (0.5 ms bins) in the group colour, inside clip blocks only (a block = source `[in,out)` drawn at `[at,end)`; fill 18 % of the colour, 1 px border; selected block 2 px white border; small ticks at in/out with tiny `in`/`out` labels when the block is ≥ 60 px wide; overlaps hatched). Outside clips the lane is empty. Not-audible lanes: 40 % opacity. Zoom `10 s`/`2 s`/`0.5 s`: window centred on the playhead; `2 s` and `0.5 s` draw frame ticks on the ruler every frame (labelled every 5 frames at `2 s`, every frame at `0.5 s`; at `0.5 s` a frame is ≥ 44 px wide on a 665 px lane, which is what makes frame-accurate alignment possible). Clicking anywhere in a lane canvas or the ruler seeks to `timeOfX`; if the click hits a block, it also selects the clip. No dragging.

**Stacked mode** (`innerWidth < 1100`): one column: video on top (full width, 16:9), then readout + transport + editor, then ruler + lanes at a fixed 40 px each; the page MAY scroll vertically (never horizontally); how-to only behind `?`. `<body data-layout="side|stacked">` is set on load and on `resize`.

### 6.2 Empty / loading / error states
- Empty: centred card on the video area: **Open kit folder** button (triggers the hidden `<input type=file webkitdirectory>`), text "or drop the folder here", one line "The kit is `marketing/audio-studio/tools/teaser-lanes/kit` (made by `prep_kit.py`)". Lanes area shows nothing; transport disabled.
- Loading: status line `loading 4 / 10 · b-piano.wav` and a thin progress bar; lanes appear as they decode (status text per lane).
- Errors: no `manifest.json` at the kit root → status (error style, icon + text): "That folder has no manifest.json. Open the kit folder made by prep_kit.py." `parseManifest` throw → its message. Video file missing → "Kit is missing teaser_v9.mp4 — run prep_kit.py again." (lanes not loaded). Audio file missing → that lane shows `missing: b-drums.wav`, its M/S/+ disabled, its clips still drawn as outlines and still listed (§7). Decode failure → same as missing with "decode failed".
- Drop: `dragover/drop` on the whole page; folder via `DataTransferItem.webkitGetAsEntry()` + recursive `createReader().readEntries` (loop until empty batch); a plain multi-file drop is accepted if it contains `manifest.json`.
- Kit root = the directory containing `manifest.json` with the shortest `webkitRelativePath`; files are matched by name within that directory only.

### 6.3 Engine (copy av-align's logic, generalised)
- One `AudioContext({sampleRate: 44100})`, created on first user gesture (`ensureCtx`). Graph: clipGain → laneGain[id] → master → destination. `laneGain.gain.value = audible ? 1 : 0` set immediately on M/S changes (no restart).
- Decode: sequential `decodeAudioData` per lane; keep `buffer`, `mono` (Float32 mean of channels), `peaks = peakBins(mono, 0, n, ceil(n/22))` (0.5 ms bins, so even the 0.5 s zoom on a 990 px lane has ≥ 1 bin per pixel); drawing uses min/max over the bins covering each pixel (never raw samples).
- Play (`togglePlay`): as av-align 719–731. `tick(m)`: on the first rVFC frame `startAll(m)`; then per active record, `drift = (m − c.at) − (rel0 + ctx.currentTime − lat − when)`; `|drift| > 0.025` → restart that clip; count resyncs (status shows `resyncs: n` only when > 0).
- `startClip(c, track, m)`: `p = startParams(c, track, m + lead + lat)`; `when = ctx.currentTime + lead + p.delay`; `node.start(when, p.fileOffset, p.dur)`; gain automation on the clip gain node: `setValueAtTime(p.g0, when)`; if fade_in still running: `linearRampToValueAtTime(c.gain, when + remaining)`; `setValueAtTime(c.gain, when + p.tFadeOutStart)` then `linearRampToValueAtTime(0, when + p.tEnd)` when `fade_out > 0`. Records `{node, gain, clipId, rel0, when, ended}`.
- Scrub (`stepTo(n)` with "sound when stepping" on, default on): for each audible lane, each clip: `s = frameSlice(...)`; play `node.start(t0 + (s0 − n/fps), s.fileStart, s.len)` with 2 ms linear in/out fades at gain `s.gain`, t0 = `ctx.currentTime + 0.01`. Muted lanes are not scrubbed.
- Seeking: `video.currentTime = seekTimeOfFrame(n)`; register `requestVideoFrameCallback` BEFORE assigning; `seeked` + 400 ms fallback; token to drop stale callbacks (av-align 776–793). «Ruling 2, 2026-09-24»: the step sound plays only on a frame-presented signal (`seeked` or the token-checked rVFC callback, whichever first); the 400 ms timeout only refreshes the readout and never plays it. «Ruling 2, 2026-09-24»: a seek WHILE PLAYING does not pause: `stopAll(); S.first = true;` seek, and the next rVFC tick calls `startAll(m)` from the new position; no scrub sound then.
- Pause: stop all nodes; `video.pause()`.
- «Ruling 1, 2026-09-24»: when play starts inside a clip's own fade-out (`tFadeOutStart = 0`), skip the `setValueAtTime(c.gain, …)` step and ramp from `p.g0` to 0 over `tEnd`; the literal formula would jump the gain up.
- Firefox (no rVFC): banner "Firefox is not supported: open this page in Chrome or Edge." and continue with `currentTime` polling.

### 6.4 Clip editor row
Always present in the left column under the transport. Nothing selected → grey text "Click a clip block to edit it, or press + on a lane to add one at the playhead." Selected → fields `in`, `out`, `len` (editing `len` sets `out = in + len`; editing `out` sets `len`), `at`, derived `end`, `gain`, `fade in`, `fade out`; each numeric field shows its frame under it in small text (`f1320`). Enter or blur applies through `validateClip`; on error the field gets a red border and a one-line message in the status; on warning (out clamped) apply and say so. Buttons: **Duplicate at playhead** (new clip, same in/out/gain/fades, `at = frameOf(current)/fps`, selected), **Delete**, and `Delete` key. `+` on a lane: `{in 0, out: source_len_s, at: playhead, gain: g, fades 0}` clamped to the video end by `validateClip` (if `at ≥ duration` → status error "playhead is at the end"). «Ruling 2, 2026-09-24»: `g` = gain of the lane's clip with the largest `at`, else 1; `+` also sets `lane.muted = false` (solo untouched); status `added <laneId> clip at <t> s (gain <g>)` + `; lane unmuted` when it was. Editor labels `src in / src out / length / render start / render end / gain / fade in / fade out`; frame hints `f` + floor(t·fps) for times, `N frames` under length. When `clipEnd > duration` the status says `ends past the video (47.600 s); it will be cut there`. One-level Undo (status button) for Delete and Reset. Comma decimals accepted (`0,45`), negatives reported by `validateClip` (`in < 0`, `gain must be between 0 and 4`).

### 6.5 Persistence and Copy list
- After every change: `localStorage[stateKey] = serializeState(state)` (try/catch; failure → status "cannot remember state in this browser", nothing else). On load: if present → `restoreState`, status "restored your last clips and mutes · [Reset to defaults]" (button visible only then; Reset = `buildState(manifest)` + clears the key).
- **Copy list**: opens a small panel with a read-only `<textarea id="clip-list">` containing `formatClipList(state)`, selected, plus "Copy" (`navigator.clipboard.writeText`, fallback `document.execCommand("copy")`) and status "copied N lines".

### 6.6 Keys (ignored while a field has focus)
`Space` play/pause · `←/→` one frame · `Shift+←/→` ten frames · `Home/End` first/last frame · `1/2/3/4` zoom All/10 s/2 s/0.5 s · `Delete` delete selected clip · `Esc` close panel / deselect · `?` help.

### 6.7 On-screen how-to (under the clip editor in the left column when it fits, and behind `?`; ≤ 8 lines, use these words)
```
1. Open the kit folder (tools/teaser-lanes/kit, made by prep_kit.py). Everything loads at once.
2. Space plays and pauses. Left/Right step one frame (Shift: ten). Home/End: first/last frame. Type a time (or f + frame) in the box and press Enter.
3. Each lane on the right is one sound. M mutes it (its clips are listed as muted = leave them out), S solos it for listening only. Two clocks: the render clock (under the video) and each lane's own source clock (src, in its header).
4. A shaded block is a clip: "play source in-out of this sound from render start". Click a block to edit its numbers below; Enter applies.
5. + on a lane adds a clip at the playhead. Duplicate puts a copy of the selected clip at the playhead. Delete removes it.
6. Zoom: All / 10 s / 2 s / 0.5 s around the playhead (0.5 s shows every frame). Click anywhere in the lanes or the ruler to move the playhead there.
7. Copy list gives one plain line per clip to paste into chat. Nothing is written to disk; clips and mutes are remembered in this browser (Reset restores today's teaser sound).
8. Lanes A (strings + other) and B (piano + drums + bass + other) are two splits of the same bed: unmute one split OR the bed, not both. Real-time play is right to about one frame (worse on Bluetooth); stepping is exact.
```

---

## 7. Copy-list format (exact; tested byte-for-byte)

Header line, then one line per clip in lane order (manifest order) and by `at` within a lane, `\n`-joined, no trailing newline:
```
teaser-lanes · <video.name or video.file> · <fps> fps · <fmtSeconds(duration)> s · times in seconds; source = that sound's own clock, render = the video's; muted = leave that clip out
<laneId>: source <fmtSeconds(in)>-<fmtSeconds(out)> s -> render <fmtSeconds(at)>-<fmtSeconds(end)> s (gain <fmtNum(gain)>[, fade in <fmtNum> s][, fade out <fmtNum> s][, muted][, file missing][, cut by the video end at <fmtSeconds(duration)> s])
```
«Ruling 2, 2026-09-24»: `muted` is appended when `lane.muted` is true (the M button only; solo never reaches the list; was: `audible()` false). The cut part is appended when `clipEnd > duration + 1e-9`. The Copy panel shows the fixed line `muted = leave that clip out (M). Solo (S) is only for listening and is not in the list.` Example from the default state:
```
teaser-lanes · teaser_v9.mp4 · 30 fps · 47.600 s · times in seconds; source = that sound's own clock, render = the video's; muted = leave that clip out
logo: source 0.000-6.500 s -> render 0.000-6.500 s (gain 0.85, fade out 0.5 s)
bed: source 0.000-15.047 s -> render 10.300-25.347 s (gain 0.45)
bed: source 0.000-9.760 s -> render 23.040-32.800 s (gain 0.45, fade out 1 s)
a-strings: source 0.000-15.047 s -> render 10.300-25.347 s (gain 0.45, muted)
```
Worked example (Nathan's): clip `{track:"a-strings", in:0, out:10, at:44, gain:0.45}` → `sourceTimeAt(47.5) = 3.5`, `clipEnd = 54`, line `a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45, cut by the video end at 47.600 s)` («Ruling 2, 2026-09-24»: `+` unmutes the lane and inherits 0.45; with the lane muted again the line reads `(gain 0.45, muted, cut by the video end at 47.600 s)`).

---

## 8. `teaser-lanes.test.mjs` (Phase A) — required cases with expected values

Harness: as av-align's test, regex `/<script id="lanes-core">([\s\S]*?)<\/script>/`. Print `pass/FAIL` per case and `N/N passed`, exit 1 on failure. Cases (at least):
1. frame round-trip for 1428 frames (`frameOf(timeOfFrame(f))`, `frameOf(seekTimeOfFrame(f))`); `frameOf(24.30)=729`, `frameOf(10.30)=309`, `frameOf(32.8)=984`, `frameOf(47.6)` → 1428 (callers clamp to 1427).
2. `clipEnd({in:0,out:10,at:44}) === 54`; `clipEnd({in:0,out:9.76,at:23.04}) === 32.8`; `clipLen` 9.76.
3. `sourceTimeAt(c, 47.5) === 3.5`; `sourceTimeAt(c, 44) === 0`; `sourceTimeAt(c, 43.99) === null`; `sourceTimeAt(c, 54) === null`.
4. `fileTimeOfSource({file_offset_s: 0.026}, 3.5)` ≈ 3.526.
5. `frameSlice(c, {file_offset_s:0}, 1320, 30)` → fileStart 0, len 1/30 (±1e-9); `n=1319` → null; `n=1619` → fileStart ≈ 9.9667, len ≈ 0.0333; `n=1620` → null.
6. `gainAt({in:0,out:9.76,at:23.04,gain:0.45,fade_in:0,fade_out:1}, 31.8) === 0.45`; at 32.3 → 0.225 (±1e-9); at 32.79 → 0.0045 (±1e-6); at 30 → 0.45; at 32.8 → 0. Fade-in `{at:0, fade_in:0.5, gain:1}` at 0.25 → 0.5.
7. `startParams` for the bed clip 2 from tR 25.0: `rel 1.96, delay 0, fileOffset 1.96, dur 7.8, g0 0.45, tFadeOutStart 6.8, tEnd 7.8`; from tR 20.0: `delay 3.04, fileOffset 0, dur 9.76`; from tR 33 → null.
8. `audible`: `[{id:a,muted:false,solo:false},{id:b,muted:true,solo:false}]` → a true, b false; with `b.solo=true` → a false, b true.
9. `validateClip`: `out ≤ in` error; `out 20` on `source_len_s 15.0465` → ok with warning and `out === 15.0465`; `at 47.6` on duration 47.6 → error; rounding `in 0.33333` → 0.3333.
10. `parseManifest` accepts the synthetic manifest; rejects duplicate id, unknown group, unknown clip track, `frames` mismatch — each with a message containing the offending id/field.
11. `buildState(syntheticManifest)`: lane count, clip ids `c1..cN`, `muted` copied, `solo false`.
12. `formatClipList` on a 3-clip fixture equals the exact expected string (write the string literally in the test; include a muted lane and a fade).
13. `fmtNum` table; `parseTimeEntry` table (`"f1320"`→44, `"1:04.5"`→64.5, `"x"`→null).
14. `laneHeight` (810,9)=81, (900,9)=91, (1080,9)=96, (400,9)=40; `layoutMode(1440)="side"`, `(1099)="stacked"`; `leftWidth(1440)=605`, `(1920)=760`, `(1100)=520`; `windowFor("2", 0.5, 47.6)` = [0,2]; `("2", 47.5, 47.6)` = [45.6,47.6]; `("10", 24.3, 47.6)` = [19.3,29.3]; `("0.5", 24.3, 47.6)` = [24.05,24.55]; `xOfTime(24.3, [24.05,24.55], 660)` = 330 and `timeOfX(330, [24.05,24.55], 660)` = 24.3 (±1e-9).
15. `overlaps` on two clips `[10,25.3465]` and `[23.04,32.8]` → `[[23.04,25.3465]]`.
16. `serializeState`/`restoreState` round trip; restore drops a clip with unknown track and reports `dropped 1`.
17. `peakBins` as av-align (ramp fixture).
18. File hygiene: no `https?://`, no `<link`, no `<script ... src=`, size < 160 KB, no CRLF (`!/\r/.test(html)`), no BOM, `lanes-core` block occurs once.
Run in the cloud (`node teaser-lanes.test.mjs`) AND in the VM (`cd $HOME/mnt/Qualifire/marketing/audio-studio/tools/teaser-lanes && node teaser-lanes.test.mjs`); both must print ALL PASS.

---

## 9. Verification (Phases D and E)

### D. Synthetic, cloud (`tests/synthetic-kit.mjs`, `tests/e2e.mjs`)
`synthetic-kit.mjs <outDir>`: writes `video.webm` via `ffmpeg -f lavfi -i testsrc=size=320x180:rate=30:duration=60 -c:v libvpx-vp9 -b:v 300k -deadline realtime -cpu-used 8 -pix_fmt yuv420p` (1800 frames; `testsrc` burns a running timestamp with no font dependency); writes WAVs with a 20-line PCM16 writer: `logo.wav` 2.0 s (1 kHz burst 0–0.3 s), `bed.wav` 12.0 s (clicks at 1.26, 5.0, 9.0 s over −60 dB noise), `a-strings.wav` 12.0 s (same clicks), `e5.wav` 3.0 s (clicks at 0, 2.01); `manifest.json` (version 1, video `video.webm` fps 30 duration_s 60 frames 1800, groups as real, tracks `logo, bed, a-strings, b-drums (file b-drums.wav, deliberately absent), e5`, clips: logo 0–1.0 at 0 gain 0.85 fade_out 0.2; bed 0–12 at 1.0 gain 0.45; bed 0–5 at 20 gain 0.45 fade_out 1; a-strings same two, muted; b-drums 0–1 at 3; e5 0–3 at 2.0 gain 1).
`e2e.mjs`: launch `chromium` at the absolute Playwright path, `executablePath` as in §2, args `['--autoplay-policy=no-user-gesture-required']`; collect `console` errors and `pageerror`. For viewports 1440x900, 1440x810, 1920x1080, 1920x990 (side layout) and 1000x800 (stacked):
1. `goto file://.../teaser-lanes.html`; screenshot `empty-<w>x<h>.png`; assert the Open button and the how-to `?` exist.
2. `setInputFiles('#kit-input', outDir)`; wait for status to contain `ready`; assert 5 lanes, `b-drums` shows `missing: b-drums.wav`, video readout `0.000 s   f0` (normalise whitespace).
3. Press `ArrowRight` ×3 → readout `0.100 s   f3`; lane `logo` src readout `0.100`; lane `bed` `—`. Type `f60` in go-to + Enter → `2.000 s   f60`; `bed` src `1.000`, `e5` src `0.000`; at the four wide sizes assert `data-layout="side"`, `document.documentElement.scrollHeight <= innerHeight` (no page scroll), video width ≥ 520 and its box entirely left of every lane canvas, every lane row height ≥ 40, and NO OVERLAP: the bounding boxes of `#video-panel, #readout, #transport, #clip-editor, #howto, #ruler, .lane` pairwise do not intersect and all lie inside the viewport; all lane canvases have the same width as the ruler. At 1000x800 assert `data-layout="stacked"`, video on top (its bottom ≤ the ruler's top) and no horizontal scroll.
4. Click `M` on `bed` → lane gets class `muted`; press `S` on `e5` → only e5 audible (check aria-pressed and classes); undo both.
5. Click the `+` on `a-strings` while at f1320 (`go to 44` first) → clip created at 44; in the editor set `out` 10 → Enter; assert editor `end` shows `54.000`; go to `47.5` → `a-strings` src `3.500`. Unmute a-strings.
6. Copy list: open the panel; the textarea text must equal EXACTLY the expected string built in the test from the known state (write it literally, header included).
7. Duplicate at playhead (at 47.5) → 2 clips; Delete → 1; overlap hatch present when applicable (check the pure `overlaps` result matches drawn count via a `data-overlaps` attribute on the lane).
8. Zoom `3` (2 s) at f1320 → ruler has frame ticks (`data-ticks="frames"`); zoom `4` (0.5 s) → `data-window` equals `[43.75,44.25]` and consecutive frame ticks are ≥ 40 px apart; clicking the lane canvas at `xOfTime(44.1)` seeks to f1323; zoom `1` back.
9. Play: press Space, wait 700 ms, Space; assert `video.currentTime` advanced ≥ 0.5 s and `AudioContext.state === 'running'`; resync count read from `data-resyncs` reported (not asserted).
10. Reload the page, re-open the kit → status contains `restored`; Reset → clip count back to the manifest's 7 (logo 1, bed 2, a-strings 2, b-drums 1 incl. the missing lane, e5 1; «Ruling 1, 2026-09-24», was 8).
11. Screenshots after step 5 at each viewport: `main-<w>x<h>.png` (five sizes incl. 1000x800 stacked), `zoom05-1440x900.png` at the 0.5 s zoom, plus `help-1440x900.png` with the `?` panel open. Zero console errors / page errors across the run (assert).
Then LOOK at every screenshot (Read tool) and write in EXECUTOR-REPORT what you saw: video on the left and large, lanes on the right using the full height, 5 lanes, readouts legible, how-to fully visible at the wide sizes, no clipped or overlapping text, playhead visible; at 1000x800 the stacked order. Copy the PNGs to the cycle folder `shots/`.

### E. Real media, PC (VM via device_bash)
1. `md5sum` the three av-align files → record (do this BEFORE Phase A too).
2. Phase B ran: `kit/prep-report.txt` ends `PREP OK`; paste the numbers into EXECUTOR-REPORT (sample counts, lags, corr, master max diff).
3. `python3 verify_default_mix.py` (write it): loads `kit/manifest.json` and the kit wavs; renders a 47.6 s stereo float mix from the manifest clips that are NOT muted, using exactly the tool's semantics (`start = round(at*SR)`, source slice `[round((in+offset)*SR), round((out+offset)*SR))`, gain, linear fades as `gainAt` sampled per sample); compares (a) `[6.5, 32.8)` vs `ride_master_v2.wav` shifted by 6.5 s: int16 both, `max|diff| ≤ 4` LSB and `rms(diff) ≤ 1.5` LSB («Ruling 1, 2026-09-24»: with the float kit the expected result is max ≤ 1 LSB, 0 samples > 2 LSB, rms ≤ 0.5; the limits are unchanged; the kit files are read with `read_wav_f32`, the two references with `wave`); (b) `[0, 6.5)` vs `brandmark/opening/soundv3/soundtrack_v3.wav` (286,650 frames expected = 6.5 s; if its length differs, STOP-report) same tolerances; (c) `[32.8, 47.6)` is all zeros. Prints `MIX OK` or the failing span with max diff and the cross-correlation lag. Any failure → STOP-report.
4. `node teaser-lanes.test.mjs` in the VM → ALL PASS.
5. `python3 -c "import json;json.load(open('kit/manifest.json'))"`; `ls -la kit` (9 wavs + `teaser_v9-proxy.mp4` + `manifest.json` + `prep-report.txt`, plus `verify-default-mix.txt` after step 3 = 13 entries; «Ruling 1, 2026-09-24»; «Ruling 2, 2026-09-24»: proxy instead of the verbatim copy); `md5sum` of the SOURCE `silent-studio/all-renders/teaser_v9.mp4` matches §2; the proxy passes the §4.3 checks (1428 frames, 143 keyframes, timestamps identical).
6. Line endings/BOM check on every new file; av-align md5s unchanged; `GIT_OPTIONAL_LOCKS=0 git status --porcelain` lists ONLY paths under the two allowed folders (kit/ and tests/out are ignored via the new `.gitignore`).
7. Optional (only if one `device_stage_files` call of the 9 wavs + manifest ≤ 60 MB succeeds): run a reduced e2e in the cloud against the real kit copy with the synthetic `video.webm` substituted and the manifest's `video.file` patched to it in a scratch copy; assert 9 lanes ready, decoded sample counts (`data-samples`) equal the manifest's `samples`. Skip silently if staging fails; say so.
8. **List for Nathan (put in EXECUTOR-REPORT and README)** — only he can verify: the page opens by double-click in Chrome/Edge and the kit folder picker works; the h264 mp4 decodes and plays; real-time video/audio feel; scrub sound when stepping; dropping the folder works; fonts/legibility on Windows; the default state sounds like today's teaser; Bluetooth latency.

---

## 10. Stop-on-ambiguity list — pre-decided

| Likely call | Decision |
|---|---|
| Digest B says 29.81 for pulse 4 | Typo. 23.51 + 6.5 = **30.01**. Nothing to change in the tool (e5.wav carries the pulses at their true times). |
| Stems 15.073 vs original 15.047 | Container vs decoded length. After ffmpeg decode all are 663,552 samples. `file_offset_s = 0` expected; the guard in §4.7 decides; only a STOP if its rules say so. |
| Include `6stem_instrum`? | No (= whole mix, corr 1.000). Note in manifest and how-to. Nathan can ask later. |
| Bed clip 2 `out`: 9.76 or the full 15.0465? | **9.76** (ends at 32.8 with the 1.0 s fade, exactly ride_tunetank's master end). |
| Is bed clip 1 faded? | No. It ends 25.3465 by its own tail (ride 18.85 < fade start 25.3). |
| E5 lane gain/fade | Baked into e5.wav; clip gain 1.0, no fade. Clip `0–8.5 at 24.3`. |
| Where does the E5 clip start if Nathan moves it? | It is a normal clip; its source clock starts at the START pulse. |
| Two-decimal vs three-decimal times | Three decimals everywhere (frame precision needs it). |
| Gain printed always? | Yes, always; fades only when > 0; `muted` when the lane is muted with M («Ruling 2, 2026-09-24»: solo never reaches the list; header defines `muted = leave that clip out`). |
| Overlapping clips in one lane | Allowed, summed, hatched. No snapping. |
| Dragging clips | Not built. |
| Clip beyond video end | `at` must be < duration; `end` may exceed it (drawn clipped, plays until the video stops). «Ruling 2, 2026-09-24»: the list line says `cut by the video end at 47.600 s`, the status says `ends past the video (47.600 s); it will be cut there`. |
| Kit folder location / git size | `tools/teaser-lanes/kit/`, ignored by the folder's `.gitignore`. Re-creatable in < 60 s. |
| PowerShell prep script? | Python (`prep_kit.py`), because the E5 render must import `ride_master.py`. No wrapper. |
| Playwright cannot simulate folder drag-drop | Test the input path only; folder drop goes on Nathan's list. |
| rVFC not firing after seek in tests | Register before setting `currentTime` (verified). If it still fails: use the 400 ms fallback and report the count, not a STOP. |
| `AudioContext` suspended in headless | Launch arg `--autoplay-policy=no-user-gesture-required` (verified running). If suspended anyway: report, not a STOP. |
| Master re-render max diff = 1 LSB | Pass (rule ≤ 2). Diff > 2 anywhere → STOP with the lag. |
| `soundv3/soundtrack_v3.wav` differs from `soundtrack.build()` | Not your problem: compare against the wav as shipped; if the opening span fails the ≤ 4 LSB rule, STOP-report with the max diff and lag. |
| Video size vs lane height | Side layout (Nathan's ask): left column 520–760 px wide, lanes 40–96 px tall, no collapsing. Below 1100 px wide: stacked, page may scroll. |
| localStorage throws on file:// | Catch, status message, continue. |
| `clipboard.writeText` rejected | Fallback `execCommand("copy")`; the textarea is selected anyway. |
| Missing video in a kit | Error state; lanes not loaded. |
| An anchor in §2 is off by a few lines | If the function is clearly the same code within ±10 lines, proceed and note the real line in EXECUTOR-REPORT; otherwise STOP. |

Anything not in this table that changes a number, a format, a file location or a rule → STOP and report.

---

## 11. Phased execution and checkpoints

Before A: `md5sum` the three av-align files; `GIT_OPTIONAL_LOCKS=0 git status --porcelain | head` (record). Create the tool folder, `.gitignore`, and `mkdir -p marketing/cycles/19_teaser-sound-lanes/shots`.

- **A — core + tests** (cloud, then land on PC): `teaser-lanes.html` containing only the shell (`<title>Teaser sound lanes</title>`, the `lanes-core` script, an empty app script with a `// PHASE C` marker) + `teaser-lanes.test.mjs`. Checkpoint A: ALL PASS in cloud and VM; EXECUTOR-REPORT §A written. Consistent state: a page that renders an empty dark body.
- **B — prep_kit.py + kit** (VM): write, run, report `PREP OK`; copy report to cycle folder. Checkpoint B: kit has 11 files + report; numbers in EXECUTOR-REPORT §B. If the master check or alignment guard STOPs, the kit stays on disk (nothing else depends on it yet).
- **C — page** (cloud authoring; run `synthetic-kit.mjs` and open the page once in Playwright, screenshot 1440x900 with the kit loaded, LOOK at it; land on PC). Checkpoint C: tests still ALL PASS; zero console errors on load; screenshot looked at and described.
- **D — synthetic verification**: `e2e.mjs` full run; screenshots looked at; copies in `shots/`. Checkpoint D: `tests/out/report.txt` says ALL PASS with case count; EXECUTOR-REPORT §D.
- **E — real media on PC**: §9.E 1–8; README.md final. Checkpoint E: EXECUTOR-REPORT complete with the readout table (tier | model | tokens | outcome), the Nathan-only list, av-align md5 unchanged, git status clean outside the two folders.

Each phase's EXECUTOR-REPORT section states: commands run, outputs (numbers), files landed (paths), what was NOT verified.

---

## 12. INSPECT checklist (fresh-context Opus; adversarial; reruns everything itself)

1. Read this brief §1–§2, then diff reality against it: anchors, md5s, sample counts. Rerun `node teaser-lanes.test.mjs` in the VM; count cases ≥ 18 groups above; read the test source for tautologies (a test that computes its expectation with the function under test fails inspection).
2. Rerun `python3 prep_kit.py` (it must be idempotent; second run identical md5s for all 9 wavs + manifest except `made`; «Ruling 1, 2026-09-24»). Recompute independently, with your own 15-line numpy script (not the executor's), the master reproduction max diff and the sumA/sumB lags; compare with the report.
3. Rerun `verify_default_mix.py`; then write your own independent mix of the manifest's audible clips (numpy, from the kit wavs only) and compare against `ride_master_v2.wav` shifted 6.5 s and against `ride/soundv3/ride_v1_with_sound_v3.mp4`'s audio (`ffmpeg -i ... -f f32le -ac 2 -ar 44100 -`; that mp4 is on the ride clock; AAC → expect max diff up to ~0.02 full scale, so use correlation ≥ 0.999 and lag 0 ±1 sample as the rule there) and, for 0–6.5, against `brandmark/opening/soundv3/soundtrack_v3.wav` (int16 rule, ≤ 4 LSB) and `opening_v3_with_sound_v3.mp4`'s audio (correlation rule). Report numbers.
4. Rerun `tests/e2e.mjs` in the cloud; look at every screenshot yourself; try to break the UI with Playwright: `out < in`, `at` = 47.6, gain −1, garbage in go-to, `+` at the last frame, delete with nothing selected, Space during loading, opening a folder without manifest, a manifest with an unknown track — no uncaught error, a visible message each time.
5. Copy-list byte check against §7 on the default REAL manifest (build the expected 17 lines (header + 16 clips; «Ruling 1, 2026-09-24») yourself from §4 step 8 and compare with `formatClipList(buildState(parseManifest(kit/manifest.json)))` run in node).
6. Two-clock check: for the worked example, `sourceTimeAt(47.5) = 3.5` in the UI readout (Playwright) and in the core; and for the default bed clip 2 at render 24.30: `src 1.260` (the ATTACK).
7a. Layout check at 1440x900, 1440x810, 1920x1080, 1920x990, 1000x800: with Playwright read `getBoundingClientRect` of `#video-panel, #readout, #transport, #clip-editor, #howto, #ruler, .lane`; assert pairwise no intersection, all inside the viewport, no page scroll at the wide sizes, lane height ≥ 40 there, and that the 0.5 s zoom shows ≥ 40 px per frame; look at the screenshots yourself.
7. Frame sync check: step 10 frames with Playwright; after each, `video.currentTime` within `[n/30, (n+1)/30)`, readout frame `n`, every lane readout equals the core's `laneReadout` for `n/30`.
8. Hygiene: LF/no BOM on every new file; no external refs; page < 160 KB; `.gitignore` covers `kit/` and `tests/out/`; av-align md5s equal the pre-Phase-A values; `GIT_OPTIONAL_LOCKS=0 git status --porcelain` shows only the two folders; nothing under `safe_to_delete/` unless reported; no file in the repo was deleted (compare `git status` for ` D ` lines).
9. Read §13 and judge whether any taste decision silently violates a requirement in `REQUIREMENTS-from-nathan.md`; list them (do not fix).
10. Write `INSPECT-REPORT.md` in the cycle folder: PASS/FAIL per item with the numbers you measured, and the Nathan-only list unchanged.

---

## 13. Decisions taken for Nathan (taste; he reviews afterwards)

1. Prep script in Python, not PowerShell: it must import `ride_master.py` to render the E5 pulses; run as `python prep_kit.py`.
2. Kit audio is the build scripts' own float decode written as 32-bit float WAV («Ruling 1, 2026-09-24», was 16-bit: 16-bit clipped the decode's samples above 1.0 and failed the master check by 642 LSB), so what the tool plays is bit-identical to what the scripts mix; exact browser decode; the video is copied verbatim. Kit is git-ignored (derived, ~55 MB, re-creatable).
3. `6stem_instrum` left out (it is the whole mix again); guitar/vocals left out (empty). Nine lanes total.
4. Lanes named `logo, bed, strings A, other A, piano B, drums B, bass B, other B, E5 pulses`; ids `logo, bed, a-strings, a-other, b-piano, b-drums, b-bass, b-other, e5` are what the copy list uses.
5. Layout per Nathan's later note ("the tracks themself are long shaped while the video itself is more square"): video LEFT (column `clamp(520px, 42vw, 760px)`: 605 px at 1440, 760 px at 1920), lanes RIGHT using the full height (81 px per lane at 1440x810, 96 px at 1920x990). Readout, transport, clip editor and the how-to sit under the video. Below 1100 px wide the page stacks (video on top) and may scroll. Lanes are ~665 px wide at 1440, so a fourth zoom (0.5 s, every frame ≥ 44 px) was added for frame-accurate work; the lane header is 132 px in two rows.
6. Numbers only: no clip dragging. Clicking in the lanes moves the playhead (and selects a clip if hit).
7. Three-decimal times everywhere; gain always printed in the list; fades only when > 0; `muted` appended when a lane is muted with M («Ruling 2, 2026-09-24»: solo is listening only and never reaches the list; the header defines the word).
8. E5 lane file starts at the START pulse (teaser 24.30); gain and fade baked in.
9. State remembered in `localStorage` with a visible "restored … Reset" line. «Open-arrangement brief, 2026-09-24»: SUPERSEDED on Nathan's request — the page gets Open arrangement / Save arrangement (a small `.json` file, and the pasted clip list `.txt` opens too); see `BRIEF-open-arrangement.md`. (Was: no JSON export/import; Copy list is the export; Save-a-copy is explicitly later.)
10. "Sound when stepping" on by default; step sound respects mute/solo; «Ruling 2, 2026-09-24»: it plays only once the frame is presented (`seeked`/rVFC), never on the timeout fallback; the kit video is a short-GOP proxy so every step decodes at most 9 frames.
11. Overlapping clips allowed and hatched; the same file may be placed any number of times.
12. Colours per group (grey/blue/teal/violet/amber) plus text labels; never colour alone.
