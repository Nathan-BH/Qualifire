# BRIEF — re-mux the unchanged Tunetank sound onto the new pictures: `gates-saving/soundv11`, `ride/soundv3` (cycle 17, item C)

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable: two ffmpeg
muxes, two round folders, two `audio-studio/all-renders/` swaps, markdown. **No WAV is
rebuilt, no Python runs**: the sound is byte-for-byte cycle 16's (`ride/soundv2/ride_master_v2.wav`
and its slice `gates-saving/soundv10/soundtrack_v10.wav`), because item B changed only *how
fast the rider moves between* the E5 pulses, not *when* the pulses fall (video 3.80 / 5.81 /
7.65 / 9.51 / 11.38 s of gates-saving = 17.80 / 19.81 / 21.65 / 23.51 / 25.38 on the ride
clock — `ride_master.py`'s `_e5_events()` and `RIDE_T0`/`PULSE_T` are both untouched).
**Runs on Nathan's PC through `device_bash`.** **Depends on** item B (`silent-studio/all-renders/gates-saving_v9.mp4`)
and item A §A2 (`silent-studio/all-renders/ride_v1.mp4`); stop-on-missing-file. **Stop-on-ambiguity
applies.** Never call `device_request_delete_permission`; replaced files go to `_to_delete/`
with `mv -n`. Do not commit.

## 0. What this will and will not change (Nathan reads this)

**Will:** produce `gates-saving_v9_with_sound_v11.mp4` and `ride_v1_with_sound_v3.mp4` — the
new pictures (inverted gate easing) with the *same* Tunetank soundtrack Nathan already has in
`gates-saving_v8_with_sound_v10.mp4` / `ride_v2.mp4`. `audio-studio/all-renders/` swaps the
gates-saving file and gains the ride file. **Will not:** change a single audio sample, `T1`,
any gain, `ride_tunetank.py`, `start-ride/soundv9` (its picture `start-ride_v4` did not
change), or `brandmark/opening/soundv3`. Nathan's pending `T1` nudge (cycle 16, via the
alignment tool) stays pending and is unaffected — a nudge later is still a one-constant re-run
of `ride_tunetank.py` followed by these two muxes again.

## 1. Facts (from disk, 2026-09-23)

| | value |
|---|---|
| `audio-studio/ride/soundv2/ride_master_v2.wav` | md5 `49a3b66eff66b74ac75e27c9f5d8df83`, stereo 16-bit 44.1 kHz, 1 159 830 frames = 26.300000 s |
| `audio-studio/gates-saving/soundv10/soundtrack_v10.wav` | md5 `3c249e4b8bdae4ebc48e28285c1fb8d8`, 542 430 frames = 12.300000 s (= master[14.0 s :]) |
| current muxes | `gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4` = `all-renders/gates-saving_v8_with_sound_v10.mp4` (md5 `d22d7937da1b324b063e19ebef7887d1`); `ride/soundv2/ride_v2.mp4` (md5 `cfadcd2ac07e342d3c9757800565c52c`, h264 789 frames + aac 1132 packets) |
| mux recipe (cycle 16 §4, reused verbatim) | `ffmpeg -y -v error -i <silent.mp4> -i <wav> -c:v copy -c:a aac -b:a 192k -shortest <out.mp4>` |
| next free rounds | `gates-saving/soundv11` (soundv1–10 exist), `ride/soundv3` (soundv1–2 exist) |
| `audio-studio/all-renders/` after item A §A1 | `start-ride_v4_with_sound_v9.mp4`, `gates-saving_v8_with_sound_v10.mp4`, `opening_v3_with_sound_v3.mp4` |

## 2. Rulings (ASSUMED)

1. **New rounds, not in-place re-muxes.** A new picture under the same sound is a new round
   (`audio-studio/structure.md`: a round = the picked render with that round's soundtrack
   muxed on); cycle 16 flagged ranking's unrecorded "re-mux onto v7" as the thing to avoid.
2. **No WAV copy in the new round folders.** `soundtrack_v11.wav` would be a 4.6 MB duplicate
   of `soundv10/soundtrack_v10.wav`; the round's FEEDBACK.md names the WAV it muxed (path +
   md5) instead. Same for `ride/soundv3` → `../soundv2/ride_master_v2.wav`. (Alternative:
   copy them in; one `cp` each if Nathan prefers every round self-contained.)
3. **Ride file naming follows the process name now that `ride` is a silent-studio
   composition:** `ride_v1_with_sound_v3.mp4` (`<scene>_vX_with_sound_vN`), not `ride_v3.mp4`.
   soundv1/soundv2 keep their `ride_vN.mp4` names (history).
4. **The ride goes into `audio-studio/all-renders/`** as `ride_v1_with_sound_v3.mp4` — cycle 16
   kept `ride_v2.mp4` out of `all-renders/` only because ride was not a composition; it is
   one now (`silent-studio/all-renders/ride_v1.mp4`), and the two mirrors must track the same
   set.
5. The audio packets of a mux made from the same WAV with the same ffmpeg build are expected
   byte-identical to cycle 16's; §4.2 checks that, with a decoded-difference fallback.

## 3. Steps

### 3.1 Preconditions
```bash
cd $HOME/mnt/Qualifire/marketing
ls silent-studio/all-renders/gates-saving_v9.mp4 silent-studio/all-renders/ride_v1.mp4   # both (else stop: needs item B / item A §A2)
md5sum audio-studio/ride/soundv2/ride_master_v2.wav audio-studio/gates-saving/soundv10/soundtrack_v10.wav   # §1 md5s
ls audio-studio/gates-saving/soundv11 audio-studio/ride/soundv3 2>&1 | grep -c "No such file"   # 2
ls audio-studio/all-renders | sort   # the 3 files of §1 (no _no_sound_ file — else item A §A1 has not run: stop)
ffprobe -v error -show_entries stream=codec_type,nb_frames -of csv=p=0 silent-studio/all-renders/gates-saving_v9.mp4 silent-studio/all-renders/ride_v1.mp4   # video,369 and video,789
```

### 3.2 Muxes
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
mkdir -p gates-saving/soundv11 ride/soundv3
ffmpeg -y -v error -i ../silent-studio/all-renders/gates-saving_v9.mp4 -i gates-saving/soundv10/soundtrack_v10.wav -c:v copy -c:a aac -b:a 192k -shortest gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4
ffmpeg -y -v error -i ../silent-studio/all-renders/ride_v1.mp4 -i ride/soundv2/ride_master_v2.wav -c:v copy -c:a aac -b:a 192k -shortest ride/soundv3/ride_v1_with_sound_v3.mp4
D=$HOME/mnt/Qualifire/_to_delete; mkdir -p $D
mv -n all-renders/gates-saving_v8_with_sound_v10.mp4 $D/all-renders_gates-saving_v8_with_sound_v10_replaced_in_all-renders_by_v9_with_sound_v11.mp4
cp gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4 ride/soundv3/ride_v1_with_sound_v3.mp4 all-renders/
ls all-renders | sort   # gates-saving_v9_with_sound_v11 opening_v3_with_sound_v3 ride_v1_with_sound_v3 start-ride_v4_with_sound_v9 — exactly 4
```

### 3.3 Docs

**`gates-saving/soundv11/FEEDBACK.md`** (create; shape of `soundv10/FEEDBACK.md`, which
starts `# gates-saving — soundv10`): `# gates-saving — soundv11 (re-mux: same sound, new picture)`;
**Render:** `gates-saving_v9_with_sound_v11.mp4` — `../../silent-studio/all-renders/gates-saving_v9.mp4`
(inverted gate easing, cycle 17 item B) + `../soundv10/soundtrack_v10.wav` (md5
`3c249e4b8bdae4ebc48e28285c1fb8d8`, unchanged — no WAV copied here); **Script:** none run
(`../../ride/ride_tunetank.py` still describes the sound; it was not re-run); **Built:** <date>;
**Previous round:** `../soundv10/FEEDBACK.md`. "What changed since soundv10": only the picture
— the rider now slows at each gate and speeds up between (the five E5 pulses fall on the same
frames as before, so the sound was not rebuilt); "Verified": the §4 lines; "What to listen
for": whether a pulse landing on a *slow* rider reads better than on a fast one (Nathan's
request), the ~28 ms Salamander lead (unchanged); pointer to `../../ride/soundv3/FEEDBACK.md`
for the whole ride; empty `## Nathan's feedback`.

**`ride/soundv3/FEEDBACK.md`** (create): `# ride — soundv3 — Round 3 (re-mux of the round-2 master onto the cycle-17 picture)`;
**Render file:** `ride_v1_with_sound_v3.mp4` — `../../../silent-studio/all-renders/ride_v1.mp4`
(start-ride_v4 + gates-saving_v9, 26.3 s) + `../soundv2/ride_master_v2.wav` (md5
`49a3b66eff66b74ac75e27c9f5d8df83`, unchanged); **Source:** `../ride_tunetank.py` (not re-run;
`T1 = 3.80`, `T2 = 16.54`, gains 0.45 / 1.5 as in soundv2); "What changed since soundv2": the
picture only (gates-saving's easing inverted; start-ride unchanged); what to watch/listen
for: the second ride's gates at 19.81 / 21.65 / 23.51 with the rider now *slow* on each pulse;
`T1` still Nathan's to nudge with the alignment tool (`../tools/av-align/av-align.html`, whose
ride preset now names `ride_v1.mp4`); "Verified": §4; empty `## Nathan's feedback`.

**`gates-saving/README.md`** (98 lines, mtime 2026-09-23 20:21). Its "Rounds" table (lines
10–13) stops at soundv2; every later round is a `**Update:** soundvN (date) …` paragraph
(soundv4 at line 41 … soundv10 at line 91, which runs to line 98, the end of the file). Do
**not** add a table row. Append after the last line of the file (leave one blank line) the
paragraph
`**Update:** soundv11 (<date>) -- cycle 17: re-mux only. Item B inverted the gate easing (fast between gates, slow at them); the E5 pulse frames did not move, so `soundv10/soundtrack_v10.wav` is muxed unchanged onto `gates-saving_v9.mp4`, which replaces `gates-saving_v8_with_sound_v10.mp4` in `../all-renders/` (soundv10 is kept here as the same sound on the older picture). See `soundv11/FEEDBACK.md`.`
Lines 3–4 (`Source video: `../all-renders/gates-saving_v4.mp4` (12.3s, 1920x1080, silent — the` / `picked HyperFrames render, position 3 of the teaser).`) → one line: `Source video: `../../silent-studio/all-renders/gates-saving_v9.mp4` (12.3s, 1920x1080, silent — the picked HyperFrames render, position 3 of the teaser; read from silent-studio since cycle 17). Earlier rounds sat on v4/v5/v6/v8.` (check `grep -c "gates-saving_v4.mp4" README.md` → 1 first).

**`gates-saving/AUDIO-BRIEF.md`** line 5 `**Current soundtrack round:** soundv3 (`soundv3/FEEDBACK.md`)` →
`**Current soundtrack round:** soundv11 (`soundv11/FEEDBACK.md`) — Tunetank bed + Salamander E5 pulses (cycle 16), re-muxed onto gates-saving_v9 (cycle 17)`.
(The line is stale by several rounds; cycle 16's brief did not update it. Report that.)

**`ride/README.md`** (61 lines): rounds table — after line 44 (the soundv2 row) append
`| [soundv3](soundv3/FEEDBACK.md) | ride_v1_with_sound_v3.mp4 (silent-studio ride_v1 + the soundv2 master, unchanged) | Built <date> — 26.300000s via ffprobe; cycle 17 re-mux: gates-saving's easing inverted, pulse times unchanged. In `../all-renders/`. |`;
line 35 (`| **complete ride** (this folder) | soundv2 — built …`) → `| **complete ride** (this folder) | soundv3 — built (cycle 17 re-mux of the soundv2 Tunetank master onto the inverted-easing picture), awaiting Nathan's listen; soundv2 and soundv1 kept on disk for reference | [`soundv3/FEEDBACK.md`](soundv3/FEEDBACK.md) |`;
line 37 (`| [gates-saving/](../gates-saving/README.md) | soundv10 = …`) → `| [gates-saving/](../gates-saving/README.md) | soundv11 = soundv10's slice (14.0–26.3s of the soundv2 master) re-muxed onto gates-saving_v9 (cycle 17); soundv10 / soundv9 kept | [`../gates-saving/soundv11/FEEDBACK.md`](../gates-saving/soundv11/FEEDBACK.md) |`.

**`structure.md`** Folder map `gates-saving/` row (line 100 ff., begins `| `gates-saving/` | in progress — soundv1 …`): append to its Status cell ` … soundv11 (cycle 17): soundv10's Tunetank slice re-muxed onto gates-saving_v9 (inverted easing)` and change its "Feedback goes to" cell to `gates-saving/soundv11/FEEDBACK.md`. (Item A adds the `ride/` row; if it is there, set its feedback cell to `ride/soundv3/FEEDBACK.md`.)

Not touched: `start-ride/`, `brandmark/`, `ride_tunetank.py`, `check_tunetank.py`, any WAV,
`ride/soundv2/` (except item A's §4.5 note), `silent-studio/` anything.

## 4. Verification (executor — numbers)

### 4.1 Streams
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
for f in gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4 ride/soundv3/ride_v1_with_sound_v3.mp4 all-renders/gates-saving_v9_with_sound_v11.mp4 all-renders/ride_v1_with_sound_v3.mp4; do echo "$f | $(ffprobe -v error -show_entries stream=codec_type,codec_name,nb_frames,channels,sample_rate -of csv=p=0 $f | tr '\n' ' ')| $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done
```
Expect `h264,video,369` + `aac,audio,…,2,44100` and `12.300000`; `h264,video,789` + aac stereo
44100 and `26.300000`. md5 of each round file = its `all-renders/` copy (two equal pairs).

### 4.2 The video is the new picture, the audio is the old sound
```bash
ffmpeg -v error -i gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4 -map 0:v -c copy -f md5 - ; ffmpeg -v error -i ../silent-studio/all-renders/gates-saving_v9.mp4 -map 0:v -c copy -f md5 -   # equal
ffmpeg -v error -i ride/soundv3/ride_v1_with_sound_v3.mp4 -map 0:v -c copy -f md5 - ; ffmpeg -v error -i ../silent-studio/all-renders/ride_v1.mp4 -map 0:v -c copy -f md5 -   # equal
ffmpeg -v error -i gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4 -map 0:a -c copy -f md5 - ; ffmpeg -v error -i gates-saving/soundv10/gates-saving_v8_with_sound_v10.mp4 -map 0:a -c copy -f md5 -   # expected equal (same WAV, same encoder)
ffmpeg -v error -i ride/soundv3/ride_v1_with_sound_v3.mp4 -map 0:a -c copy -f md5 - ; ffmpeg -v error -i ride/soundv2/ride_v2.mp4 -map 0:a -c copy -f md5 -   # expected equal
```
If an audio pair is *not* equal: decode both to f32 (`ffmpeg -i X -f f32le -ac 2 -ar 44100 -`),
and report max |diff| and RMS of the difference in dBFS — pass if RMS diff < −60 dBFS (the
encoder was merely non-deterministic); anything louder → stop.

### 4.3 The pulses still land on the pictures' gate frames
Decode the new ride mux's audio and check the E5 lifts at 17.80 / 19.81 / 21.65 / 23.51 /
25.38 exactly as `check_tunetank.py`'s last block does (60 ms after pulse+30 ms vs 60 ms
before): write the ten-line python inline (import its `db`/`rd` logic; read the aac via
ffmpeg to f32 instead of `wave`), expect `[14.3, 8.0, 7.4, 6.1, 5.1]` ± 0.5 dB each. Then
confirm the picture: item B's §6.3 v9 output shows the rider on the gate ticks at frames 174 /
230 / 285 of gates-saving = ride frames 594 / 650 / 705 (14.0 s × 30 = 420 offset), i.e.
19.80 / 21.67 / 23.50 s — the same frames the pulses fall in. Quote both.

### 4.4 Git
```bash
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire status --short marketing/audio-studio
```
Untracked `gates-saving/soundv11/`, `ride/soundv3/`, `all-renders/ride_v1_with_sound_v3.mp4`,
`all-renders/gates-saving_v9_with_sound_v11.mp4`; deleted `all-renders/gates-saving_v8_with_sound_v10.mp4`;
modified the two READMEs, the AUDIO-BRIEF, `structure.md`, `ride/README.md`. Do not commit.

## 5. Report format

Tier readout; §4.1–4.3 output verbatim (all md5 pairs, the lift list); files created / moved
/ edited; `git status`; the stale-AUDIO-BRIEF fact; one sentence per stop trigger. Say that
nothing was listened to.

## 6. For Inspect (fresh Opus)

Rerun §4.1–4.3. Confirm both WAV md5s are unchanged from §1 and that no file under
`audio-studio/` other than the listed ones changed (`git status`, and `md5sum` of
`ride_tunetank.py` `check_tunetank.py` `ride_master.py` before/after). Confirm `_to_delete/`
holds the replaced gates-saving mux and that `soundv10/` and `ride/soundv2/` are byte-unchanged
(md5s in §1).
