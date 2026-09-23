# BRIEF — retire the synthesised renders: a silent round for closing, colours, ranking and teaser (cycle 16, item D)

**Status: ready to execute (2026-09-23, Plan tier, Fable, second revision).** Sonnet-executable:
four new round folders (each: one mp4 that is a byte-identical copy of the scene's latest
silent render, one `FEEDBACK.md`), four `audio-studio/all-renders/` replacements (replaced
files moved to `_to_delete/`), five README edits, four one-line `AUDIO-BRIEF.md` edits. No
Python, no WAV, no re-encode, no `index.html`, no `soundtrack.py` touched. **Runs on Nathan's PC
through `device_bash`** (`$HOME/mnt/Qualifire`; `GIT_OPTIONAL_LOCKS=0` for git) — the renders
are there. Independent of this folder's other three briefs (different scenes, disjoint
files): run it before, between or after them. **Stop-on-ambiguity applies**: any anchor
that does not match exactly once, any file that already exists where this brief creates
one, any md5 that differs → stop and report verbatim; never guess. Anchors quoted from disk
on 2026-09-23 (line counts via `grep -c ""`, mtimes UTC): `brandmark/closing/README.md` 17
lines, 2026-09-11 07:50; `colours/README.md` 19, 2026-09-11 07:50; `ranking/README.md` 20,
2026-09-16 16:59; `teaser/README.md` 31, 2026-09-13 22:44; `brandmark/README.md` 14,
2026-09-14 07:19. Silent-base md5s in §3.

## 0. What this is, in one paragraph

Nathan (2026-09-23): *"i do not wish to move forward with any of the synthesized sounds, so the
renders that contain should be superseeded with a new round that either removes it or applies
any of the new sounds i have decided on in cycle016."* Every one of the seven files in
`marketing/audio-studio/all-renders/` currently carries `synth.py`-generated audio (verified
by ffprobe: each has an `aac` stream; each round's `FEEDBACK.md` names `synth.py`). Three
scenes get a new sound in this cycle already — the ride pair (item A, Tunetank track +
Salamander sample pulses) and the opening (item B, Tunetank piano logo). **This brief covers
the other four — `brandmark/closing`, `colours`, `ranking`, `teaser` — with a new round that
removes the sound**: none of the cycle-16 sounds fits them (§1), so the honest new round is
silent. Older rounds stay on disk, untouched, as reference (Nathan, Q5). What could go under
these four scenes later is listed in §7 as options, not decided.

## 1. Why silent, per scene (the reasoning Nathan asked for)

| scene | length | why no cycle-16 sound fits | new round |
|---|---|---|---|
| `brandmark/closing` | 4.0 s | The Tunetank piano logo (8.44 s) started at 0 is still at **−19 dBFS at 4.0 s**, mid ring-out (item B §1.3 / README §A measured it); a cut there would be audible. Trimming or fading it to 4 s is a *new* sound design, which Nathan has not asked for. The ride track (15 s, orchestral) is a different piece for a different scene. | **silent** |
| `colours` | 19.0 s | Nothing in cycle 16 was chosen for it; the three tier chimes were `synth.py`. | **silent** |
| `ranking` | 10.8 s | Same: the droplet run and settle chime were `synth.py`. | **silent** |
| `teaser` | 47.6 s | It is a stream-copy concat of five scene renders (opening, start-ride, gates-saving, ranking, closing — `silent-studio/teaser/rounds/v8/concat.txt`), and three of those are being re-sounded in this very cycle while two go silent. Laying the new ride and opening sounds onto the teaser's cut is real work (retime item A's master onto the teaser's clock, item B's onto its 0–6.5 s, decide what the ranking/closing sections do) and depends on Nathan approving those sounds first. **Silent now; "apply the cycle-16 sounds to the teaser" is a later follow-up** (§7). | **silent** |

"Silent" means: the round's mp4 has **no audio stream at all** (not a muted or zeroed track),
so nothing synthesised can survive by accident and the file is honest about what it is.

## 2. The silent-round convention (rulings, checked against `structure.md`)

`marketing/audio-studio/structure.md` says a round is `soundvN/` holding the picked render
with that round's soundtrack muxed on, `soundtrack_vN.wav`, and `FEEDBACK.md`; and that
*every* new round, "not just ones worth keeping", replaces the scene's file in
`audio-studio/all-renders/`. `silent-studio/structure.md` adds that the two `all-renders/`
folders are siblings and both must be checked. For a round whose content is "no sound":

1. **Round number:** the next free `soundvN` per scene, so the sequence stays one line per
   round: `brandmark/closing/soundv3` (soundv1–2 exist), `colours/soundv2` (soundv1),
   `ranking/soundv4` (soundv1–3), `teaser/soundv3` (soundv1–2). Verified on disk.
2. **File name:** `<scene>_vX_no_sound_vN.mp4` — the process name `<scene>_vX_with_sound_vN.mp4`
   would claim a sound that is not there. `vX` is the silent base's visual round, `vN` this
   audio round. Not `<scene>_vX.mp4` either: that is `silent-studio/all-renders/`'s flat name
   and the two folders must stay distinguishable at a glance.
3. **No `soundtrack_vN.wav`.** There is no soundtrack; writing 4 s of zeros would be a
   pretend artefact. `FEEDBACK.md` says so in its header (`**Soundtrack:** none — this round
   removes the sound`) and records what the previous round had, the md5 of the copied base,
   and the ffprobe proof.
4. **The mp4 is a byte-identical copy of the latest silent render**, made with `cp`, not
   ffmpeg. All four silent bases already have no audio stream (ffprobe, 2026-09-23: one
   `h264` video stream each, nothing else), so a remux would only change container bytes for
   no reason and lose the "md5 equals the base" proof. **If a base ever does carry an audio
   stream** (ffprobe shows a second stream), the command is
   `ffmpeg -y -v error -i <base> -map 0:v -c:v copy -an <out>` (stream copy, no re-encode) and
   the proof becomes `ffprobe` (no audio stream) + equal `nb_frames` and `duration` + equal
   video-stream hash (`ffmpeg -v error -i <file> -map 0:v -c copy -f md5 -` on both). Today:
   `cp`, and §5 checks md5 equality.
5. **Base = the latest silent render in `silent-studio/all-renders/`**, not the older visual
   the last with-sound round was muxed on. That changes the picture for three scenes —
   Nathan needs to know (§8): closing v3 → **v4**, colours v2 → **v4**, teaser v6 → **v8**;
   ranking stays v7. The v4/v4/v8 renders are already the current picked visuals (rendered
   by Nathan on 2026-09-16, in `silent-studio/all-renders/` and each scene's `rounds/`), so
   the round follows the picture that is current, as `structure.md` intends.
6. **`audio-studio/all-renders/` replacement:** the new mp4 is copied in; the replaced
   synthesised file is moved (`mv`, never delete, never `device_request_delete_permission`)
   to `$HOME/mnt/Qualifire/_to_delete/` as
   `all-renders_<old name>_replaced_in_all-renders_by_no_sound_vN.mp4` — the naming this
   cycle's other briefs use. The old round folders keep their own copies of every replaced
   file (verified: `brandmark/closing/soundv2/`, `colours/soundv1/`, `ranking/soundv3/`,
   `teaser/soundv2/` each hold their mp4 + wav + FEEDBACK) and are not touched.
7. **`silent-studio/all-renders/` is not changed** by this brief (no new silent render);
   §5 only checks it still holds exactly the seven bases.

## 3. Facts (from disk, 2026-09-23)

| scene | replaced file in `audio-studio/all-renders/` (its picture) | latest silent base in `silent-studio/all-renders/` | md5 of base | frames / duration | new round file |
|---|---|---|---|---|---|
| brandmark/closing | `closing_v3_with_sound_v2.mp4` (v3) | `closing_v4.mp4` | `ab85722c7743ef1fef2ea14ab87e57e0` | 120 / 4.000000 | `brandmark/closing/soundv3/closing_v4_no_sound_v3.mp4` |
| colours | `colours_v2_with_sound_v1.mp4` (v2) | `colours_v4.mp4` | `20065537db84840549330d182cd63244` | 570 / 19.000000 | `colours/soundv2/colours_v4_no_sound_v2.mp4` |
| ranking | `ranking_v7_with_sound_v3.mp4` (v7) | `ranking_v7.mp4` | `7f3bf776241ba05974857a3a34122378` | 324 / 10.800000 | `ranking/soundv4/ranking_v7_no_sound_v4.mp4` |
| teaser | `teaser_v6_with_sound_v2.mp4` (v6) | `teaser_v8.mp4` | `3de2d748b9b0f1243de7d2c38a99d339` | 1428 / 47.600000 | `teaser/soundv3/teaser_v8_no_sound_v3.mp4` |

The same md5s hold for the copies in each scene's `silent-studio/<scene>/rounds/vX/`. Two
stale-doc facts the executor will meet and must not "fix" beyond what §4 says:
`brandmark/closing/soundv2/FEEDBACK.md` opens with "**NOT YET BUILT**" although the mux
`closing_v3_with_sound_v2.mp4` exists in `soundv2/` and `all-renders/` (241 344 bytes, aac) —
the header was never updated; and `brandmark/closing/README.md` / `brandmark/README.md` stop
at soundv1 though soundv2 exists. Old round folders stay untouched (Nathan, Q5); the READMEs
get the rows §4.3 lists. (Also for the coordinator, not this brief: `teaser_v8.mp4`'s concat
uses `gates-saving_v6.mp4`, two visual rounds behind the current v8 — a silent-studio matter.)

## 4. Steps (Nathan's PC, `device_bash`; stop at the first failure)

### 4.1 Preconditions
```bash
cd $HOME/mnt/Qualifire/marketing
ls audio-studio/brandmark/closing/soundv3 audio-studio/colours/soundv2 audio-studio/ranking/soundv4 audio-studio/teaser/soundv3 2>&1 | grep -c "No such file"   # expect 4
ls audio-studio/all-renders/                    # expect exactly the 7 files named in §3 + opening_v3_with_sound_v2.mp4, start-ride_v4_with_sound_v8.mp4, gates-saving_v8_with_sound_v9.mp4 (or their cycle-16 replacements if items A/B ran first — either is fine; anything else: stop)
md5sum silent-studio/all-renders/closing_v4.mp4 silent-studio/all-renders/colours_v4.mp4 silent-studio/all-renders/ranking_v7.mp4 silent-studio/all-renders/teaser_v8.mp4   # must equal §3
for f in closing_v4 colours_v4 ranking_v7 teaser_v8; do echo "$f: $(ffprobe -v error -show_entries stream=codec_type -of csv=p=0 silent-studio/all-renders/$f.mp4 | tr '\n' ' ')"; done   # each: "video" only
```

### 4.2 The four rounds
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
mkdir -p brandmark/closing/soundv3 colours/soundv2 ranking/soundv4 teaser/soundv3
cp ../silent-studio/all-renders/closing_v4.mp4 brandmark/closing/soundv3/closing_v4_no_sound_v3.mp4
cp ../silent-studio/all-renders/colours_v4.mp4 colours/soundv2/colours_v4_no_sound_v2.mp4
cp ../silent-studio/all-renders/ranking_v7.mp4 ranking/soundv4/ranking_v7_no_sound_v4.mp4
cp ../silent-studio/all-renders/teaser_v8.mp4  teaser/soundv3/teaser_v8_no_sound_v3.mp4
mkdir -p $HOME/mnt/Qualifire/_to_delete
mv all-renders/closing_v3_with_sound_v2.mp4 $HOME/mnt/Qualifire/_to_delete/all-renders_closing_v3_with_sound_v2_replaced_in_all-renders_by_no_sound_v3.mp4
mv all-renders/colours_v2_with_sound_v1.mp4 $HOME/mnt/Qualifire/_to_delete/all-renders_colours_v2_with_sound_v1_replaced_in_all-renders_by_no_sound_v2.mp4
mv all-renders/ranking_v7_with_sound_v3.mp4 $HOME/mnt/Qualifire/_to_delete/all-renders_ranking_v7_with_sound_v3_replaced_in_all-renders_by_no_sound_v4.mp4
mv all-renders/teaser_v6_with_sound_v2.mp4  $HOME/mnt/Qualifire/_to_delete/all-renders_teaser_v6_with_sound_v2_replaced_in_all-renders_by_no_sound_v3.mp4
cp brandmark/closing/soundv3/closing_v4_no_sound_v3.mp4 colours/soundv2/colours_v4_no_sound_v2.mp4 ranking/soundv4/ranking_v7_no_sound_v4.mp4 teaser/soundv3/teaser_v8_no_sound_v3.mp4 all-renders/
```
(`mv` into `_to_delete/` may copy-then-fail on the source on this mount; if it does, report
it and leave the source — do not request delete permission.)

### 4.3 Docs (markdown only; every anchor must match exactly once — `grep -c`)

**`FEEDBACK.md` in each new round folder** (four files, same shape; stop if the file exists).
Header lines: `# <scene> — soundvN (silent round)`; `**Render:** <file> — a byte-identical
copy of `../../../silent-studio/all-renders/<base>` (md5 …), no audio stream`; `**Soundtrack:**
none — this round removes the sound`; `**Script:** none (`../soundtrack.py` is not used from
this round on; it stays on disk for the earlier rounds)`; `**Built:** <date>`; `**Previous
round:** `../soundvN-1/FEEDBACK.md`` (soundv2 / soundv1 / soundv3 / soundv2). "What this is":
Nathan's sentence from §0 verbatim, then the §1 row's reasoning in one or two sentences,
then — for the three scenes whose picture moved — one line: "The picture is <vX>, the
current picked render, not the <vY> the previous round was muxed on." "Verified": the
`ffprobe` line and the two md5 lines from §5, verbatim. "What could go here later": the
scene's §7 line. "Questions": pointer to this folder's `questionsfornathan.md`. Empty
`## Nathan's feedback` heading with `<!-- write your notes below -->`.

**`brandmark/closing/README.md`** — anchor line 11
`| [soundv1](soundv1/FEEDBACK.md) | closing_v2_with_sound_v1.mp4 | Built, awaiting Nathan's feedback |`:
append after it
`| [soundv2](soundv2/FEEDBACK.md) | closing_v3_with_sound_v2.mp4 | Built 2026-09-13 (synthesised two-beat stinger) — earlier round, kept on disk for reference |`
`| [soundv3](soundv3/FEEDBACK.md) | closing_v4_no_sound_v3.mp4 | **Silent round** <date>, cycle 16 — Nathan dropped every synthesised sound; no cycle-16 sound fits closing (the piano logo is still at −19 dBFS at 4.0 s). In `../../all-renders/`. |`.
Anchor line 3 `Source video: `../../all-renders/closing_v2.mp4` (4.0s, 1920x1080, silent).` →
`Source video: `../../../silent-studio/all-renders/closing_v4.mp4` (4.0s, 1920x1080, silent) since soundv3; earlier rounds sat on v2/v3.`
Anchor lines 5–6 (`Source code: … own tones.`) → `Source code: `soundtrack.py` here built soundv1–2 on the shared `../../synth.py` toolkit; not used from soundv3 on (cycle 16: no synthesised sound moves forward).`
Under "## Sonic direction so far" append one paragraph: `Since soundv3 (cycle 16) closing is silent: Nathan dropped the synthesised direction, and neither cycle-16 recording fits a 4.0 s scene. Options for a later round are in the cycle-16 README (item D §7).`

**`colours/README.md`** — anchor line 11 `| [soundv1](soundv1/FEEDBACK.md) | colours_v2_with_sound_v1.mp4 | Built, awaiting Nathan's feedback |`:
append `| [soundv2](soundv2/FEEDBACK.md) | colours_v4_no_sound_v2.mp4 | **Silent round** <date>, cycle 16 — synthesised tier chimes dropped with the rest; picture is now v4. In `../all-renders/`. |`;
change soundv1's status cell to `Built 2026-09-11 (synthesised tier chimes) — earlier round, kept on disk for reference`;
anchor line 3 `Source video: `../all-renders/colours_v2.mp4` (19.0s, 1920x1080, silent).` → `Source video: `../../silent-studio/all-renders/colours_v4.mp4` (19.0s, 1920x1080, silent) since soundv2; soundv1 sat on v2.`;
lines 5–6 as for closing (`Draws on\nthe shared `../synth.py` toolkit.` → same "not used from soundv2 on" sentence).

**`ranking/README.md`** — anchor: the soundv3 row (line 13, begins `| [soundv3](soundv3/FEEDBACK.md) | ranking_v6_with_sound_v3.mp4 |`):
append after it `| [soundv4](soundv4/FEEDBACK.md) | ranking_v7_no_sound_v4.mp4 | **Silent round** <date>, cycle 16 — synthesised droplet run / settle chime dropped with the rest; picture v7 (as the previous mux). In `../all-renders/`. |`;
lines 5–6 as above; anchor line 3 `Source video: `../all-renders/ranking_v6.mp4` (10.8s, 1920x1080, silent).` → `Source video: `../../silent-studio/all-renders/ranking_v7.mp4` (10.8s, 1920x1080, silent) since soundv4 (soundv3 was re-muxed onto v7 too).`
(The soundv3 row names `ranking_v6_with_sound_v3.mp4` while `all-renders/`
held `ranking_v7_with_sound_v3.mp4` — a re-mux onto v7 that the table never recorded; leave the
row, mention it in the report.)

**`teaser/README.md`** — anchor line 13 `| [soundv2](soundv2/FEEDBACK.md) | teaser_v6_with_sound_v2.mp4 | Built, awaiting Nathan's feedback |`:
append `| [soundv3](soundv3/FEEDBACK.md) | teaser_v8_no_sound_v3.mp4 | **Silent round** <date>, cycle 16 — the synthesised composition is dropped; the cut's scenes are being re-sounded in cycle 16 (ride, opening) and applying those to the teaser is a later follow-up. Picture is now v8 (was v6). In `../all-renders/`. |`;
change both earlier rows' status cells to begin `Earlier round, kept on disk for reference (synthesised). `;
anchor lines 3–4 (`Source video: `../all-renders/teaser_v6.mp4` (47.6s, 1920x1080, silent — the\nassembled full video; was teaser_v5.mp4, 46.9s, in soundv1).`) → `Source video: `../../silent-studio/all-renders/teaser_v8.mp4` (47.6s, 1920x1080, silent — the assembled full video) since soundv3; soundv2 sat on teaser_v6, soundv1 on teaser_v5.`;
lines 6–7 as above.

**`brandmark/README.md`** — anchor line 14 `| [closing/](closing/README.md) | in progress — soundv1 | `closing/soundv1/FEEDBACK.md` |` →
`| [closing/](closing/README.md) | soundv3 — silent round (cycle 16) | `closing/soundv3/FEEDBACK.md` |`.
(Item B's brief edits line 13, the opening row, and appends a sentence to the "brand chime"
paragraph; if item B has already run, its sentence is present — leave it and add, after it:
`Closing's soundv3 (cycle 16) is silent: no synthesised sound moves forward and no cycle-16 recording fits 4.0 s.`
If item B has not run, add that same sentence to the end of the paragraph anyway; item B's
executor appends after it.)

**Four `AUDIO-BRIEF.md`s** — one line each, anchored on `**Current soundtrack round:**`
(occurs once per file): closing `soundv2 (`soundv2/FEEDBACK.md`)` → `soundv3 (`soundv3/FEEDBACK.md`) — silent round, cycle 16`;
colours `soundv1 (…)` → `soundv2 (`soundv2/FEEDBACK.md`) — silent round, cycle 16`; ranking
`soundv3 (…)` → `soundv4 (`soundv4/FEEDBACK.md`) — silent round, cycle 16`; teaser `soundv2 (…)`
→ `soundv3 (`soundv3/FEEDBACK.md`) — silent round, cycle 16`. Nothing else in those files
(Nathan's columns stay empty; the "Sounds like now" cells describe the earlier rounds and
are left — the round line above them says what is current).

**Not touched:** any `soundtrack.py`, `synth.py`, any `index.html`, any earlier `soundvN/`
folder (including closing/soundv2's stale "NOT YET BUILT" header — reported, not edited),
`silent-studio/` anything, `structure.md` / `APPROACH.md` (the coordinator's notes are already
there), the ride and opening scenes (items A/B).

## 5. Verification (executor — numbers, not adjectives)

```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
for f in brandmark/closing/soundv3/closing_v4_no_sound_v3.mp4 colours/soundv2/colours_v4_no_sound_v2.mp4 ranking/soundv4/ranking_v7_no_sound_v4.mp4 teaser/soundv3/teaser_v8_no_sound_v3.mp4; do echo "$f | streams: $(ffprobe -v error -show_entries stream=codec_type,codec_name,nb_frames -of csv=p=0 $f | tr '\n' ' ') | $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done
```
Expect, in order: `h264,video,120 | 4.000000`, `h264,video,570 | 19.000000`,
`h264,video,324 | 10.800000`, `h264,video,1428 | 47.600000` — **no `audio` entry anywhere**.
```bash
md5sum brandmark/closing/soundv3/*.mp4 colours/soundv2/*.mp4 ranking/soundv4/*.mp4 teaser/soundv3/*.mp4 all-renders/*_no_sound_*.mp4
```
→ eight lines, the four §3 md5s each appearing twice (round copy and `all-renders/` copy).
```bash
ls all-renders/ | sort
```
→ exactly seven files: `closing_v4_no_sound_v3.mp4`, `colours_v4_no_sound_v2.mp4`,
`ranking_v7_no_sound_v4.mp4`, `teaser_v8_no_sound_v3.mp4`, plus the three ride/opening files
(`opening_v3_with_sound_v2.mp4`, `start-ride_v4_with_sound_v8.mp4`,
`gates-saving_v8_with_sound_v9.mp4` if items A/B have not run; `…_v3`, `…_v9`, `…_v10` if they
have). No `closing_v3_`, `colours_v2_`, `ranking_v7_with_`, `teaser_v6_` left.
```bash
ls ../silent-studio/all-renders/ | sort     # unchanged: closing_v4 colours_v4 gates-saving_v8 opening_v3 ranking_v7 start-ride_v4 teaser_v8
ls -la $HOME/mnt/Qualifire/_to_delete/ | grep no_sound   # the four moved files
for f in brandmark/closing/README.md colours/README.md ranking/README.md teaser/README.md brandmark/README.md; do echo "$f $(grep -c 'no_sound\|silent round' $f)"; done   # 2 2 1 2 1 or more — never 0
grep -n "Current soundtrack round" brandmark/closing/AUDIO-BRIEF.md colours/AUDIO-BRIEF.md ranking/AUDIO-BRIEF.md teaser/AUDIO-BRIEF.md   # each names the new round
GIT_OPTIONAL_LOCKS=0 git -c core.quotepath=off status --short .   # modified: the 5 READMEs, 4 AUDIO-BRIEFs, all-renders (4 deleted, 4 untracked); untracked: the 4 round folders; nothing else new. Do not commit.
```

## 6. Report format

Tier readout line; the §5 ffprobe lines, md5 lines and both `ls` listings verbatim; the
`git status` block; the list of every file created or moved (with `_to_delete/` names); the
two stale-doc facts from §3 as one line each; any anchor that did not match, quoted.

## 7. What could go under these four scenes later (options only — nothing decided)

- **closing:** (a) stay silent; (b) a 4 s cut or fade of the Tunetank piano logo (a new
  design — the file's last 4 s of decay, or its first 4 s faded); (c) a new short recording
  Nathan picks, as he did for the opening. Whatever it is, opening and closing will not
  share the synthesised stinger any more.
- **colours:** (a) stay silent; (b) a recording Nathan picks (the tier reveals at their
  `index.html` times would be the markers).
- **ranking:** (a) stay silent; (b) a recording Nathan picks; (c) Salamander-sampled piano
  pulses on the settle beat — samples, not `synth.py` (the same engine as the ride's E5s).
- **teaser:** apply item A's ride master to its start-ride + gates-saving sections and item
  B's piano to its 0–6.5 s, once Nathan has approved both; decide ranking/closing sections
  then. A re-concat of the picture first (its `gates-saving_v6` is two visual rounds old) is
  a `silent-studio` step for the coordinator.

## 8. For Inspect (fresh Opus)

Rerun every §5 command yourself. Check that no file under `audio-studio/` other than the
five READMEs, four AUDIO-BRIEFs and `all-renders/` changed (`git status`, and `md5sum` of
every `soundtrack.py` and `synth.py` before/after — record both). Check the three picture
changes (closing v3→v4, colours v2→v4, teaser v6→v8) are stated in the corresponding
`FEEDBACK.md`s. Check the `_to_delete/` names. Confirm the four new mp4s have no audio
stream and equal their bases byte-for-byte.
