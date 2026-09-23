# BRIEF — silent renders live in silent-studio: withdraw cycle 16's audio-studio silent rounds, re-issue the four scenes as new silent-studio versions, re-cut the teaser, add the `ride` composition (cycle 17, item A)

**Status: ready to execute (2026-09-23, Plan tier, Fable).** Sonnet-executable, files only:
`cp`/`mv -n`, two ffmpeg stream-copy concats, markdown. No `index.html`, no Python, no WAV,
no re-encode. **Runs on Nathan's PC through `device_bash`** (`$HOME/mnt/Qualifire`;
`GIT_OPTIONAL_LOCKS=0` for git). Two halves: **A1** (no dependency — can run now) and **A2**
(needs `silent-studio/all-renders/gates-saving_v9.mp4` from item B, `BRIEF-gate-easing-inversion.md`;
stop-on-missing-file). **Stop-on-ambiguity applies**: any anchor that does not match exactly
once, any file that already exists where this brief creates one, any md5 that differs → stop
and report verbatim; never guess. Never call `device_request_delete_permission`; superseded
files go to `$HOME/mnt/Qualifire/_to_delete/` with `mv -n`. Do not commit. Anchors and md5s
quoted from disk 2026-09-23 (line counts via `grep -c ""`).

## 0. What this will and will not change (Nathan reads this)

**Will:** (1) the four "silent rounds" cycle 16 created *inside* `audio-studio/`
(`brandmark/closing/soundv3`, `colours/soundv2`, `ranking/soundv4`, `teaser/soundv3`, each a
copy of a silent render + a FEEDBACK.md) are **withdrawn**: the folders and their
`audio-studio/all-renders/` copies move to `_to_delete/`, and every doc line that pointed at
them is re-pointed. Nathan: "instead of having silent rounds, we have a whole folder called
… silent-studio specifically for that purpose so thats where the silent renders should live".
(2) In `silent-studio/`, each of those four scenes gets **its next version**: closing **v5**,
colours **v5**, ranking **v8** are byte-identical re-issues of v4 / v4 / v7 (no visual change —
the round exists to record, in the right studio, that the scene's current deliverable is the
silent render); the teaser **v9** is a real new cut (it picks up `gates-saving_v9` from item B;
its `v8` still used `gates-saving_v6`, two rounds stale). (3) A new composition folder
`silent-studio/ride/` holds the ride as a silent-studio deliverable: **`ride_v1.mp4`** =
`start-ride_v4` + `gates-saving_v9`, 26.3 s, in `rounds/v1/` and `all-renders/`. (4)
`audio-studio/all-renders/` afterwards holds **only sounded renders** (start-ride, gates-saving,
opening — and the ride once item C re-muxes it); the silent set lives only in
`silent-studio/all-renders/`.

**Will not:** change any picture except the teaser's gates-saving section (via item B) — the
re-issued closing/colours/ranking files are the same bytes as before, and Nathan should not
expect to see anything new in them. Will not change any sound: the existing sounded rounds
(`start-ride/soundv9`, `gates-saving/soundv10`, `opening/soundv3`, `ride/soundv2`) stay as
they are; re-muxing sound onto the new pictures is item C (`BRIEF-sound-remux-rounds.md`).
Will not delete anything (everything withdrawn is in `_to_delete/`, recoverable by `mv`).
Will not touch `ride/soundv2/ride_v2_silent.mp4` or `ride_v2.mp4` (round-2 artefacts, kept for
reference) except for the two path lines in `ride/soundv2/concat.txt` (§4.5).

## 1. Rulings (all ASSUMED — Nathan can override any of them; each is a `mv`/edit to reverse)

1. **"New versions of the existing ones" = the next silent-studio round per scene, byte-identical
   where the picture is unchanged.** Nathan's words ask for new versions; `silent-studio/structure.md`
   defines a round as "the render Nathan is asked to review + FEEDBACK.md". A re-issue is
   honest as long as the round says in its first line that it is byte-identical to the
   previous one and why it exists. Alternative if Nathan dislikes the bumps: three `mv`s back.
2. **Opening and start-ride are not re-issued** (they have sounded rounds; nothing about them
   was in the audio-studio silent-round set). Gates-saving's new version is v9 from item B.
3. **The withdrawn `soundvN` numbers are not reused.** The next audio round for closing is
   `soundv4`, colours `soundv3`, ranking `soundv5`, teaser `soundv4`. Keeping the numbers
   monotonic means a git-history reader never sees two different `closing/soundv3`s. The
   README rows stay, edited to "withdrawn (cycle 17)".
4. **`audio-studio/all-renders/` = sounded renders only.** `audio-studio/structure.md` also
   says Nathan may drop a silent render there as the *starting point* for audio work; that
   sentence gets a dated note: the starting point is read from `../silent-studio/all-renders/`
   directly (no copy). No `_no_sound_` file and no flat silent copy stays in
   `audio-studio/all-renders/`.
5. **The ride is a silent-studio composition of the assembled kind** (like the teaser: no
   `index.html` render of its own, an ffmpeg stream-copy concat of two ingredient renders, a
   `concat.txt` with relative paths in the round folder, a README with the cut sheet). Name
   `ride`, version **v1** (silent-studio numbering is per composition and independent of
   `audio-studio/ride/soundvN`). Flat file `all-renders/ride_v1.mp4`. Its FEEDBACK.md says
   plainly that it is a concat of two existing renders, not a new animation.
6. **Teaser v9 uses the re-issued names** (`ranking_v8`, `closing_v5`) so the cut sheet and
   `concat.txt` name what is in `all-renders/` at build time; the bytes of those two parts
   equal v8's parts.
7. **`_to_delete/` naming** follows cycle 16 (`all-renders_<old>_replaced_in_all-renders_by_<new>.mp4`)
   for replaced files, and `audio-studio_<scene>_soundvN_withdrawn_cycle17/` for the withdrawn
   round folders (moved whole, FEEDBACK.md included — it is preserved there, not deleted).
8. **Doc dating:** every durable line added to an existing reference doc carries a date and
   the cycle, in the style already used in those docs (`(added 2026-09-23, cycle 17)`,
   `> **Decision note, 2026-09-23 (cycle 17):** …`).

## 2. Facts (from disk, 2026-09-23)

| scene | current silent-studio pick (`silent-studio/all-renders/`) | md5 | frames / s | withdrawn audio-studio round (folder → file) | audio-studio/all-renders copy to withdraw |
|---|---|---|---|---|---|
| brandmark/closing | `closing_v4.mp4` (rounds v1–v4) | `ab85722c7743ef1fef2ea14ab87e57e0` | 120 / 4.0 | `brandmark/closing/soundv3/` → `closing_v4_no_sound_v3.mp4` | `closing_v4_no_sound_v3.mp4` |
| colours | `colours_v4.mp4` (rounds v1–v4) | `20065537db84840549330d182cd63244` | 570 / 19.0 | `colours/soundv2/` → `colours_v4_no_sound_v2.mp4` | `colours_v4_no_sound_v2.mp4` |
| ranking | `ranking_v7.mp4` (rounds v1–v7) | `7f3bf776241ba05974857a3a34122378` | 324 / 10.8 | `ranking/soundv4/` → `ranking_v7_no_sound_v4.mp4` | `ranking_v7_no_sound_v4.mp4` |
| teaser | `teaser_v8.mp4` (rounds v1–v8; concat of opening_v3 + start-ride_v4 + **gates-saving_v6** + ranking_v7 + closing_v4) | `3de2d748b9b0f1243de7d2c38a99d339` | 1428 / 47.6 | `teaser/soundv3/` → `teaser_v8_no_sound_v3.mp4` | `teaser_v8_no_sound_v3.mp4` |
| opening | `opening_v3.mp4` | `816809d275eb4603d38d3d9ce59f3ea2` | 195 / 6.5 | — | — |
| start-ride | `start-ride_v4.mp4` | `e80ee7e9323a61048c23e9df4d8f51b7` | 420 / 14.0 | — | — |
| gates-saving | `gates-saving_v8.mp4` today; **`gates-saving_v9.mp4` after item B** | v8 `0e7519ab8718d80b89b09678308f2b32`; v9: from item B's report | 369 / 12.3 | — | — |

All seven are h264, 1920x1080, 30/1, one video stream, no audio. The four audio-studio copies
are byte-identical to their bases (same md5s). `audio-studio/all-renders/` today: those four +
`start-ride_v4_with_sound_v9.mp4`, `gates-saving_v8_with_sound_v10.mp4`,
`opening_v3_with_sound_v3.mp4`. `audio-studio/ride/soundv2/concat.txt` (262 bytes) holds two
absolute `/sessions/rcw-…/mnt/Qualifire/marketing/audio-studio/../silent-studio/all-renders/…`
lines. `silent-studio/ride/` does not exist. Existing round folders: closing v1–v4, colours
v1–v4, ranking v1–v7, teaser v1–v8 (so v5 / v5 / v8 / v9 are the next free numbers).

## 3. A1 — withdraw the audio-studio silent rounds; re-issue closing, colours, ranking (no dependency)

### 3.1 Preconditions
```bash
cd $HOME/mnt/Qualifire/marketing
for d in audio-studio/brandmark/closing/soundv3 audio-studio/colours/soundv2 audio-studio/ranking/soundv4 audio-studio/teaser/soundv3; do ls $d | tr '\n' ' '; echo "<- $d"; done   # each: FEEDBACK.md + one _no_sound_ mp4, nothing else
ls audio-studio/all-renders | sort   # exactly the 7 files named in §2
md5sum silent-studio/all-renders/closing_v4.mp4 silent-studio/all-renders/colours_v4.mp4 silent-studio/all-renders/ranking_v7.mp4   # = §2
ls silent-studio/brandmark/closing/rounds/v5 silent-studio/colours/rounds/v5 silent-studio/ranking/rounds/v8 silent-studio/ride 2>&1 | grep -c "No such file"   # 4
ls $HOME/mnt/Qualifire/_to_delete | grep -c "withdrawn_cycle17\|reissue"   # 0
```

### 3.2 Withdraw (move, never delete)
```bash
cd $HOME/mnt/Qualifire/marketing/audio-studio
D=$HOME/mnt/Qualifire/_to_delete; mkdir -p $D
mv -n brandmark/closing/soundv3 $D/audio-studio_brandmark-closing_soundv3_withdrawn_cycle17
mv -n colours/soundv2          $D/audio-studio_colours_soundv2_withdrawn_cycle17
mv -n ranking/soundv4          $D/audio-studio_ranking_soundv4_withdrawn_cycle17
mv -n teaser/soundv3           $D/audio-studio_teaser_soundv3_withdrawn_cycle17
mv -n all-renders/closing_v4_no_sound_v3.mp4 $D/all-renders_closing_v4_no_sound_v3_withdrawn_cycle17.mp4
mv -n all-renders/colours_v4_no_sound_v2.mp4 $D/all-renders_colours_v4_no_sound_v2_withdrawn_cycle17.mp4
mv -n all-renders/ranking_v7_no_sound_v4.mp4 $D/all-renders_ranking_v7_no_sound_v4_withdrawn_cycle17.mp4
mv -n all-renders/teaser_v8_no_sound_v3.mp4  $D/all-renders_teaser_v8_no_sound_v3_withdrawn_cycle17.mp4
ls all-renders | sort   # start-ride_v4_with_sound_v9.mp4 gates-saving_v8_with_sound_v10.mp4 opening_v3_with_sound_v3.mp4 (3 files; gates-saving may already read _v9_with_sound_v11 if item C ran — report)
```
If a directory `mv` fails on this mount (Windows-side lock): `mkdir` the target, `mv -n` the
two files individually, leave the empty source folder, and report it — do not delete it.

### 3.3 Re-issue closing v5, colours v5, ranking v8 (byte-identical)
```bash
cd $HOME/mnt/Qualifire/marketing/silent-studio
mkdir -p brandmark/closing/rounds/v5 colours/rounds/v5 ranking/rounds/v8
cp all-renders/closing_v4.mp4 brandmark/closing/rounds/v5/closing_v5.mp4
cp all-renders/colours_v4.mp4 colours/rounds/v5/colours_v5.mp4
cp all-renders/ranking_v7.mp4 ranking/rounds/v8/ranking_v8.mp4
D=$HOME/mnt/Qualifire/_to_delete
mv -n all-renders/closing_v4.mp4 $D/all-renders_closing_v4_replaced_in_all-renders_by_v5_reissue.mp4
mv -n all-renders/colours_v4.mp4 $D/all-renders_colours_v4_replaced_in_all-renders_by_v5_reissue.mp4
mv -n all-renders/ranking_v7.mp4 $D/all-renders_ranking_v7_replaced_in_all-renders_by_v8_reissue.mp4
cp brandmark/closing/rounds/v5/closing_v5.mp4 colours/rounds/v5/colours_v5.mp4 ranking/rounds/v8/ranking_v8.mp4 all-renders/
md5sum all-renders/closing_v5.mp4 all-renders/colours_v5.mp4 all-renders/ranking_v8.mp4 brandmark/closing/rounds/v5/*.mp4 colours/rounds/v5/*.mp4 ranking/rounds/v8/*.mp4   # the three §2 md5s, each twice
```

### 3.4 Docs for A1 (markdown only; `grep -c` each anchor → 1 before editing)

**`silent-studio/brandmark/closing/rounds/v5/FEEDBACK.md`, `colours/rounds/v5/FEEDBACK.md`,
`ranking/rounds/v8/FEEDBACK.md`** (create; same shape as that scene's previous round file):
`# <scene> — round vN (re-issue, no visual change)`; **Render:** `<file>` — a byte-identical
copy of `rounds/vN-1/<prev file>` (md5 …), `<len> s, 1920x1080, silent`; "## Why this round
exists": Nathan (2026-09-23) asked that silent renders live in `silent-studio/` and that the
scenes cycle 16 had given an audio-studio "silent round" get "new versions of the existing
ones" here instead; cycle 16's `audio-studio/<scene>/soundvN/` is withdrawn (now in
`_to_delete/`); this round records that the scene's current deliverable is the silent render
and nothing else changed. "## What changed since vN-1": **nothing — same bytes** (say it in
those words). "## Sound": none; no sound round is current for this scene (the last audio
round, `audio-studio/<scene>/soundvK/`, is an earlier synthesised round kept for reference);
options for a later sound are in cycle 16's `BRIEF-retire-synth-renders.md` §7. Empty
`## Nathan's feedback` with `<!-- write your notes below -->`.

**`silent-studio/brandmark/closing/README.md`** (27 lines, mtime 2026-09-16 17:09): after line
27 `| [v4](rounds/v4/FEEDBACK.md) | closing_v4.mp4 | 2026-09-16 | Built and rendered — cycle 9: opening's second part re-used, no mark; current pick |`
append `| [v5](rounds/v5/FEEDBACK.md) | closing_v5.mp4 | <date> | Re-issue, byte-identical to v4 (cycle 17: silent renders live here; the audio-studio silent round is withdrawn) — current pick |`
and change v4's `current pick` → `replaced by the v5 re-issue`. If the README has a
"(currently vN)" line, update it; if it names `all-renders/closing_v4.mp4` anywhere, change to `closing_v5.mp4`.

**`silent-studio/colours/README.md`** (47 lines): after line 47 `| [v4](rounds/v4/FEEDBACK.md) | colours_v4.mp4 | 2026-09-16 | Rendered, 19.0s confirmed, awaiting Nathan's feedback |`
append `| [v5](rounds/v5/FEEDBACK.md) | colours_v5.mp4 | <date> | Re-issue, byte-identical to v4 (cycle 17: silent renders live here; the audio-studio silent round is withdrawn) — current pick |`;
v4's status cell → `Rendered, 19.0s confirmed — replaced by the v5 re-issue (same bytes)`.

**`silent-studio/ranking/README.md`** (20 lines): after line 20 (the v7 row, ends `Current. |`)
append `| [v8](rounds/v8/FEEDBACK.md) | ranking_v8.mp4 | <date> | Re-issue, byte-identical to v7 (cycle 17: silent renders live here; the audio-studio silent round is withdrawn) — current |`;
in the v7 row replace `Current.` with `Replaced by the v8 re-issue (same bytes).`.

**`audio-studio/brandmark/closing/README.md`** (20 lines, mtime 2026-09-23 20:26):
line 3 → `Source video: `../../../silent-studio/all-renders/closing_v5.mp4` (4.0s, 1920x1080, silent; read from silent-studio, not copied here — cycle 17). Earlier rounds sat on v2/v3.`;
line 12 (the soundv3 row) → `| soundv3 | — | **Withdrawn 2026-09-23 (cycle 17)**: was a silent round (a copy of closing_v4.mp4); silent renders live in `../../../silent-studio/` — see `silent-studio/brandmark/closing/rounds/v5/`. Folder moved to `_to_delete/`. Number not reused; the next round is soundv4. |`;
line 20 (`Since soundv3 (cycle 16) closing is silent: …`) → `Closing is silent (cycle 16): Nathan dropped the synthesised direction, and neither cycle-16 recording fits a 4.0 s scene. No sound round is current; the deliverable is the silent render in `silent-studio/all-renders/` (cycle 17). Options for a later round are in the cycle-16 README (item D §7).`

**`audio-studio/colours/README.md`** (19 lines): line 3 → `Source video: `../../silent-studio/all-renders/colours_v5.mp4` (19.0s, 1920x1080, silent; read from silent-studio, not copied here — cycle 17). soundv1 sat on v2.`;
line 11 (soundv2 row) → `| soundv2 | — | **Withdrawn 2026-09-23 (cycle 17)**: was a silent round (a copy of colours_v4.mp4); silent renders live in `../../silent-studio/` — see `silent-studio/colours/rounds/v5/`. Folder moved to `_to_delete/`. Number not reused; the next round is soundv3. |`.

**`audio-studio/ranking/README.md`** (20 lines): line 3 → `Source video: `../../silent-studio/all-renders/ranking_v8.mp4` (10.8s, 1920x1080, silent; read from silent-studio, not copied here — cycle 17). soundv3 was re-muxed onto v7.`;
line 13 (soundv4 row) → `| soundv4 | — | **Withdrawn 2026-09-23 (cycle 17)**: was a silent round (a copy of ranking_v7.mp4); silent renders live in `../../silent-studio/` — see `silent-studio/ranking/rounds/v8/`. Folder moved to `_to_delete/`. Number not reused; the next round is soundv5. |`.

**`audio-studio/teaser/README.md`** (30 lines): line 3 → `Source video: `../../silent-studio/all-renders/teaser_v9.mp4` (47.6s, 1920x1080, silent — the assembled full video; read from silent-studio, not copied here — cycle 17). soundv2 sat on teaser_v6, soundv1 on teaser_v5.` (v9 is built in A2 of this same brief; if A2 is deferred, write `teaser_v8.mp4` and let A2 change it);
line 12 (soundv3 row) → `| soundv3 | — | **Withdrawn 2026-09-23 (cycle 17)**: was a silent round (a copy of teaser_v8.mp4); silent renders live in `../../silent-studio/` — see `silent-studio/teaser/rounds/v9/`. Folder moved to `_to_delete/`. Number not reused; the next round is soundv4. Applying the cycle-16 sounds to the teaser's cut is still a later follow-up. |`.

**`audio-studio/brandmark/README.md`** (18 lines): line 18 `| [closing/](closing/README.md) | soundv3 — silent round (cycle 16) | `closing/soundv3/FEEDBACK.md` |` →
`| [closing/](closing/README.md) | no sound round current — silent (cycle 16); soundv3 withdrawn (cycle 17), see `../../silent-studio/brandmark/closing/rounds/v5/` | — |`.

**Four `AUDIO-BRIEF.md`s**, line 5 each, anchored on `**Current soundtrack round:**`: closing
`soundv3 (`soundv3/FEEDBACK.md`) — silent round, cycle 16` → `none — the scene is silent; soundv3 was withdrawn in cycle 17 (silent renders live in silent-studio); the last audio round on disk is soundv2 (synthesised, reference only)`;
colours `soundv2 (…) — silent round, cycle 16` → `none — … soundv2 was withdrawn in cycle 17 …; last audio round soundv1 (synthesised, reference only)`;
ranking `soundv4 (…)` → `none — … soundv4 was withdrawn …; last audio round soundv3 (synthesised, reference only)`;
teaser `soundv3 (…)` → `none — … soundv3 was withdrawn …; last audio round soundv2 (synthesised, reference only)`.

**`audio-studio/structure.md`** (127 lines): in the decision note (lines 3–7), the phrase
`the other\n> scenes get a silent round;` → `the other\n> scenes have no sound round — their deliverable is the silent render in `../silent-studio/all-renders/` (cycle 17 withdrew cycle 16's audio-studio "silent rounds");` (keep the `> ` quote prefix on every line; re-wrap the note so no line exceeds ~95 chars). After the paragraph that begins `all-renders/` is the one folder both directions touch.` (line 13) insert one dated line as its own paragraph:
`> Note, 2026-09-23 (cycle 17): `all-renders/` here holds **sounded** renders only. A scene's silent starting point is read from `../silent-studio/all-renders/` directly — nothing silent is copied into this folder any more.`
Also in "Folder map", after the `teaser/` row, add `| `ride/` | family folder for the two-scene ride (start-ride + gates-saving as one soundtrack); the silent picture is `../silent-studio/ride/` (cycle 17) | `ride/soundv2/FEEDBACK.md` (soundv3 after cycle 17 item C) |` — only if no `ride/` row exists (`grep -c "^| \`ride/\`" structure.md` → 0 first).

**`audio-studio/APPROACH.md`** (153 lines): in its decision note (lines 3–7) `or are silent;` → `or have no sound round (their deliverable is the silent render in `../silent-studio/`, cycle 17);` — re-wrap, keep the `> ` prefix.

**Not touched in A1:** any `soundtrack.py`, `synth.py`, any `index.html`, any other
`soundvN/` folder, `start-ride/`, `gates-saving/`, `brandmark/opening/`, `ride/` (except §4.5
in A2), `silent-studio/structure.md` (A2), `marketing/README.md` (stale since 2026-09-09; the
coordinator's, not this brief's).

### 3.5 A1 verification
```bash
cd $HOME/mnt/Qualifire/marketing
ls audio-studio/all-renders | sort                       # 3 files, none containing no_sound
ls audio-studio/brandmark/closing audio-studio/colours audio-studio/ranking audio-studio/teaser | grep -c "soundv3$\|soundv2$\|soundv4$"   # closing: no soundv3; colours: no soundv2; ranking: no soundv4; teaser: no soundv3 — print the four listings
ls -d $HOME/mnt/Qualifire/_to_delete/*withdrawn_cycle17* $HOME/mnt/Qualifire/_to_delete/*reissue*   # 8 + 3 entries
md5sum silent-studio/all-renders/closing_v5.mp4 silent-studio/all-renders/colours_v5.mp4 silent-studio/all-renders/ranking_v8.mp4   # §2 md5s
ls silent-studio/all-renders | sort                      # closing_v5 colours_v5 gates-saving_v8|v9 opening_v3 ranking_v8 start-ride_v4 teaser_v8 (+ ride_v1/teaser_v9 after A2)
grep -rn "no_sound" audio-studio/*.md audio-studio/*/README.md audio-studio/*/*/README.md audio-studio/*/AUDIO-BRIEF.md audio-studio/*/*/AUDIO-BRIEF.md   # only the "was a silent round" withdrawal rows may mention it — list every hit
grep -c "withdrawn" audio-studio/brandmark/closing/README.md audio-studio/colours/README.md audio-studio/ranking/README.md audio-studio/teaser/README.md audio-studio/brandmark/README.md   # ≥1 each
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire status --short marketing/audio-studio marketing/silent-studio   # deleted: 4 all-renders files + 8 files in the 4 withdrawn folders + 3 silent-studio all-renders files; untracked: 3 new round folders + 3 new all-renders files; modified: the 5 READMEs, 4 AUDIO-BRIEFs, structure.md, APPROACH.md, 3 silent-studio READMEs. Nothing else. Do not commit.
```

## 4. A2 — teaser v9 and the `ride` composition (needs `gates-saving_v9.mp4`)

### 4.1 Precondition (stop-on-missing-file)
```bash
cd $HOME/mnt/Qualifire/marketing/silent-studio
ls all-renders/gates-saving_v9.mp4 all-renders/closing_v5.mp4 all-renders/ranking_v8.mp4 all-renders/opening_v3.mp4 all-renders/start-ride_v4.mp4   # all five exist (else stop: "A2 needs item B's gates-saving_v9 and A1's re-issues")
ls all-renders/gates-saving_v8.mp4 2>&1 | grep -c "No such"   # 1 (item B moved it)
for f in opening_v3 start-ride_v4 gates-saving_v9 ranking_v8 closing_v5; do echo "$f $(ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -of csv=p=0 all-renders/$f.mp4)"; done   # all h264,1920,1080,30/1 with 195 / 420 / 369 / 324 / 120 frames
ls teaser/rounds/v9 ride 2>&1 | grep -c "No such file"   # 2
```

### 4.2 Teaser v9
```bash
mkdir -p teaser/rounds/v9
printf "file '../../../all-renders/opening_v3.mp4'\nfile '../../../all-renders/start-ride_v4.mp4'\nfile '../../../all-renders/gates-saving_v9.mp4'\nfile '../../../all-renders/ranking_v8.mp4'\nfile '../../../all-renders/closing_v5.mp4'\n" > teaser/rounds/v9/concat.txt
ffmpeg -y -v error -f concat -safe 0 -i teaser/rounds/v9/concat.txt -c copy teaser/rounds/v9/teaser_v9.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,nb_frames -of csv=p=0 teaser/rounds/v9/teaser_v9.mp4; ffprobe -v error -show_entries format=duration -of csv=p=0 teaser/rounds/v9/teaser_v9.mp4   # h264,video,1428 / 47.600000 — no audio stream
D=$HOME/mnt/Qualifire/_to_delete
mv -n all-renders/teaser_v8.mp4 $D/all-renders_teaser_v8_replaced_in_all-renders_by_v9.mp4
cp teaser/rounds/v9/teaser_v9.mp4 all-renders/teaser_v9.mp4
```
(The concat list uses paths relative to the list file, like `rounds/v8/concat.txt`; ffmpeg's
concat demuxer resolves them from the list's directory. Never absolute `/sessions/...` paths.)

Proof the cut is right: the gates-saving section runs 20.5–32.8 s of the teaser. Extract
frame 20.5 + 5.81 = 26.31 s and 20.5 + 6.73 = 27.23 s (`ffmpeg -ss 26.31 -i teaser_v9.mp4 -frames:v 1 …`)
and compare each to `gates-saving/rounds/v9/frame_5_81s.png` / `frame_6_73s.png` (mean
absolute difference over the whole frame < 1.5 levels, PIL/numpy) — proves the teaser carries
the new motion. Also compare the teaser's 0–6.5 s, 6.5–20.5 s, 32.8–43.6 s, 43.6–47.6 s
sections' video packets to v8's by `ffmpeg -ss … -t … -c copy -f md5 -` (stream copy means
the packet bytes of the unchanged parts are identical; report the four md5 pairs).

### 4.3 The `ride` composition
```bash
mkdir -p ride/rounds/v1
printf "file '../../../all-renders/start-ride_v4.mp4'\nfile '../../../all-renders/gates-saving_v9.mp4'\n" > ride/rounds/v1/concat.txt
ffmpeg -y -v error -f concat -safe 0 -i ride/rounds/v1/concat.txt -c copy ride/rounds/v1/ride_v1.mp4
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames -of csv=p=0 ride/rounds/v1/ride_v1.mp4; ffprobe -v error -show_entries format=duration -of csv=p=0 ride/rounds/v1/ride_v1.mp4   # h264,video,1920,1080,30/1,789 / 26.300000 — no audio
cp ride/rounds/v1/ride_v1.mp4 all-renders/ride_v1.mp4
md5sum ride/rounds/v1/ride_v1.mp4 all-renders/ride_v1.mp4   # equal
ffmpeg -v error -ss 14.0 -i ride/rounds/v1/ride_v1.mp4 -map 0:v -c copy -f md5 - ; ffmpeg -v error -i all-renders/gates-saving_v9.mp4 -map 0:v -c copy -f md5 -   # the second half's packets equal gates-saving_v9's (report both; if -ss on a stream copy lands on a different packet boundary, compare instead the decoded frame at ride 17.80 s to gates-saving_v9's frame_3_80s.png, MAD < 1.5)
```
Also extract `ride/rounds/v1/frame_17_80s.png`, `frame_19_81s.png`, `frame_20_73s.png`
(= gates-saving 3.80 / 5.81 / 6.73) for Nathan.

### 4.4 Docs for A2

**`silent-studio/teaser/rounds/v9/FEEDBACK.md`** (create): `# teaser — round v9 (built, confirmed)`;
built <date> by ffmpeg stream-copy concat (`concat.txt` here), 47.600000 s / 1428 frames
confirmed; "## What changed since v8": gates-saving `v6` → **`v9`** (three rounds: cycle 9's
render-remake v6 → cycle 14's surge pacing v8 → cycle 17's inverted easing v9 — the teaser
never carried v7/v8), ranking `v7` → `v8` and closing `v4` → `v5` are byte-identical
re-issues (no visual change); opening/start-ride unchanged; the §4.2 proof numbers. "## Known
gaps": no with-sound teaser exists (applying cycle 16's ride and opening sounds to this cut is
a later follow-up, cycle 16 item D §7). Empty `## Nathan's feedback`.

**`silent-studio/teaser/README.md`** (161 lines): insert a new section **before** line 9
(`## Cut sheet (v7 — rounds/v7/teaser_v7.mp4, 47.6s) — superseded by v8`):
`## Cut sheet (v9 — rounds/v9/teaser_v9.mp4, 47.6s) — current` + the built/confirmed line + the
five-row table in the v7 section's format with `gates-saving_v9.mp4`, `ranking_v8.mp4`,
`closing_v5.mp4` (same lengths / play-at times as v7: 0–6.5 / 6.5–20.5 / 20.5–32.8 /
32.8–43.6 / 43.6–47.6) + one line on what changed (as in the FEEDBACK). In the "Feedback
rounds" table (line 161, the v8 row ends `— current |`) change `— current` → `— superseded by
v9` and append `| [v9](rounds/v9/FEEDBACK.md) | teaser_v9.mp4 | <date> | Built, 47.6s confirmed — gates-saving v9 (inverted gate easing, cycle 17); ranking v8 / closing v5 re-issues (same bytes) — current |`.

**`silent-studio/ride/README.md`** (create, ≤ 40 lines): `# ride — the two product-scene rides as one deliverable (assembled)`;
what it is (start-ride + gates-saving back to back = the piece the ride soundtrack is written
against; added 2026-09-23, cycle 17, at Nathan's request — "the ride render should also live in
silent studio as it is now part of the project"); not an `index.html` render — an ffmpeg
stream-copy concat, like the teaser; cut sheet table (`start-ride_v4.mp4` 14.000 s 0:00.000–0:14.000;
`gates-saving_v9.mp4` 12.300 s 0:14.000–0:26.300; total 26.300 s, 789 frames); recipe pointer
(`rounds/v1/concat.txt`); the sound side lives in `../../audio-studio/ride/` (soundv2 = Tunetank
bed on the v8 picture; soundv3 = the same master on this v1 picture, cycle 17 item C); a
"Feedback rounds" table with `| [v1](rounds/v1/FEEDBACK.md) | ride_v1.mp4 | <date> | Built, 26.3s confirmed — start-ride v4 + gates-saving v9 (inverted gate easing) — current |`.
No `index.html`, no `renders/`, no `theme.js` (nothing to render).

**`silent-studio/ride/rounds/v1/FEEDBACK.md`** (create): `# ride — round v1 (built, confirmed)`;
**Render:** `ride_v1.mp4` (26.300000 s, 789 frames, 1920x1080, silent) — a stream-copy concat
of two existing renders, **not a new animation**: `start-ride_v4.mp4` (0–14.0 s) +
`gates-saving_v9.mp4` (14.0–26.3 s); what to look at: the second ride now slows at each gate
(17.80 / 19.81 / 21.65 / 23.51 / 25.38 s on this clock) and speeds up between them; the frame
PNGs listed; the audio pairing (`../../../../audio-studio/ride/soundv3/` after item C; the
placements/markers in `audio-studio/tools/av-align/av-align.html` refer to this file's clock);
empty `## Nathan's feedback`.

**`silent-studio/structure.md`** (105 lines, mtime 2026-09-16): in the Folder map, after the
`teaser/` row (line 48) add
`| `ride/` | the two product rides back to back (start-ride + gates-saving), the deliverable the ride soundtrack is written against — assembled by concat like the teaser (added 2026-09-23, cycle 17) | no (concat) | — (a deliverable of its own, not a teaser ingredient) | `ride/rounds/v1/FEEDBACK.md` |`;
line 48's `stale (see below)` and `teaser/rounds/v2/FEEDBACK.md` → `no (concat, see below)` and
`teaser/rounds/v9/FEEDBACK.md`; in "## teaser — the full video" (line 75 ff.) change `current
build v2 = 105.5s at `teaser/rounds/v2/teaser_v2.mp4`` → `current build v9 = 47.6s at
`teaser/rounds/v9/teaser_v9.mp4` (cycle 17)`; at the end of the all-renders section (before
`## teaser`) add one dated paragraph: `Since cycle 17 (2026-09-23) this folder is the *only*
home of silent renders: `audio-studio/all-renders/` holds sounded renders only, and a scene
with no current sound round has no file there at all. `ride_v1.mp4` (cycle 17) is the eighth
composition here.`

### 4.5 `audio-studio/ride/soundv2/concat.txt` — the absolute paths
Replace its two lines (verbatim today: `file '/sessions/rcw-01bhggzr96fdzwbwwfhunbsr/mnt/Qualifire/marketing/audio-studio/../silent-studio/all-renders/start-ride_v4.mp4'` and the same with `gates-saving_v8.mp4`) with exactly
```
file '../../../silent-studio/all-renders/start-ride_v4.mp4'
file '../../../silent-studio/gates-saving/rounds/v8/gates-saving_v8.mp4'
```
The second line names what round 2 was *built from*; `all-renders/gates-saving_v8.mp4` has
moved to `_to_delete/` (item B), and `rounds/v8/gates-saving_v8.mp4` is the byte-identical
copy that stays in the repo (md5 `0e7519ab8718d80b89b09678308f2b32` — check it). Then add one line to
`ride/soundv2/FEEDBACK.md` after its "**Render file:**" paragraph: `*(2026-09-23, cycle 17:
`concat.txt` re-pointed from absolute `/sessions/...` paths to repo-relative ones; the
gates-saving half is now referenced from its round folder because `all-renders/` moved on to v9.
The mp4s here are unchanged.)*` Do **not** rebuild `ride_v2_silent.mp4` or `ride_v2.mp4`.

**`audio-studio/ride/README.md`** (61 lines): lines 4–5 read, verbatim,
`continuous soundtrack, not a HyperFrames composition of its own — there is no` (line 4) and
`` `silent-studio/ride/` twin. It exists because the teaser plays these two scenes `` (line 5).
Replace the fragment `there is no\n`silent-studio/ride/` twin.` (spanning the line break) with
`since cycle 17 (2026-09-23) its silent picture lives in `../../silent-studio/ride/`
(`ride_v1.mp4` = start-ride_v4 + gates-saving_v9), assembled by concat like the teaser.`
and re-wrap lines 4–6 to ≤ 95 chars (`grep -c "twin" README.md` → 1 before, 0 after; if
the fragment is not found exactly once, stop).

**`audio-studio/tools/av-align/README.md`** line 48 (the `| ride |` row): the video cell
`marketing/audio-studio/ride/soundv2/ride_v2_silent.mp4` (before the ride brief has run: …)`
→ `marketing/silent-studio/all-renders/ride_v1.mp4` (cycle 17; `ride/soundv2/ride_v2_silent.mp4` is the same clock on the older gates-saving_v8 picture)`.
(The page's own `"video_name"` is item D's edit, `BRIEF-av-align-ui-redesign.md` §7; if item D
already ran, this line is already changed — leave it.)

### 4.6 A2 verification
```bash
cd $HOME/mnt/Qualifire/marketing/silent-studio
ls all-renders | sort   # closing_v5 colours_v5 gates-saving_v9 opening_v3 ranking_v8 ride_v1 start-ride_v4 teaser_v9 — exactly 8
for f in all-renders/*.mp4; do echo "$f $(ffprobe -v error -show_entries stream=codec_type,nb_frames -of csv=p=0 $f | tr '\n' ' ') $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)"; done   # one video stream each; 120 570 369 195 324 789 420 1428 frames
cat teaser/rounds/v9/concat.txt ride/rounds/v1/concat.txt   # relative paths only; grep -c "/sessions" → 0
grep -c "/sessions" ../audio-studio/ride/soundv2/concat.txt   # 0
GIT_OPTIONAL_LOCKS=0 git -C $HOME/mnt/Qualifire status --short marketing   # + untracked teaser/rounds/v9, ride/, all-renders/ride_v1.mp4, all-renders/teaser_v9.mp4; deleted all-renders/teaser_v8.mp4; modified teaser/README.md, structure.md, audio-studio/ride/README.md, ride/soundv2/concat.txt, ride/soundv2/FEEDBACK.md, tools/av-align/README.md. Do not commit.
```

## 5. Report format

Tier readout line; every `ls`/`md5sum`/`ffprobe` line of §3.5 and §4.6 verbatim; the §4.2
and §4.3 proof numbers; the full list of files created / moved (with `_to_delete/` names) /
edited; the `git status` block; one sentence per stop trigger hit (anchor mismatch, a target
that already exists, a directory `mv` that failed, `gates-saving_v9.mp4` missing). State
plainly that closing v5 / colours v5 / ranking v8 are the same bytes as before and that
nothing was listened to or watched.

## 6. For Inspect (fresh Opus)

Rerun §3.5 and §4.6 yourself. Confirm the eleven `_to_delete/` entries exist and that the four
withdrawn folders each still contain their FEEDBACK.md and mp4 (nothing lost). Confirm the
three re-issues are byte-identical to their bases (md5), the teaser's unchanged sections are
packet-identical to v8's (§4.2) and its gates-saving section matches `gates-saving_v9`.
Confirm `grep -rn "no_sound\|silent round" marketing/audio-studio --include=*.md` shows only
withdrawal/decision wording (no live pointer to a `soundvN` that no longer exists). Confirm no
`soundtrack.py` / `synth.py` / `index.html` changed (`git status`). Confirm no absolute
`/sessions` path remains in any `concat.txt` under `marketing/`.
