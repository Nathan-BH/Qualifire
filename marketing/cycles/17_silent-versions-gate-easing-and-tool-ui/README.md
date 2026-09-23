# Cycle 17 — silent renders live in silent-studio (+ the ride as a composition), gate easing inverted, av-align UI redesign

**Status (2026-09-24): B1 executed (Sonnet) and Inspect-passed (Opus) — `gates-saving/index.html`
is edited on disk (md5 `09869627fdd3df5ddeec65f681639dfa`, 332 lines), nothing rendered yet; the
executor's stop (trough count 5, not 4) and the inspector's prediction that B2's first-draft
criteria would fail a correct render were both folded back into `BRIEF-gate-easing-inversion.md`
(§3, §6.3) the same day. Next: Nathan runs `COMMANDS.md` §1; A1 and D can run meanwhile.**
Plan pass 2026-09-23 (Fable): four finished briefs + `COMMANDS.md`. At that point nothing was
built, no render, no commit, nothing moved; the only edits outside this folder are a
pointer line at the top of `../16_ride-tunetank-soundtrack/README.md` and a dated
"superseded in part" note at the top of its `BRIEF-retire-synth-renders.md`.** Cycle 16 was
executed and inspected earlier today (commit `b69effa marketing cycle016`); Nathan then sent
three follow-ups, verbatim:

1. "instead of having silent rounds, we have a whole folder called C:\Users\natha\Claude
   personal projects\Qualifire\marketing\silent-studio specifically for that purpose so thats
   where the silend renders should live (just make a new versions of the existing ones) also
   the ride render should also live in silent studio as it is now part of the project as well."
2. "i think because we skipped cycle015 the gate speeding/slowing is still of on the
   gates-saving and ride renders, it should speed up in between gates and slow down at gates,
   have a look at it to fix it"
3. "also think about improving the UI of the aligmnent tool to make it more profesionall and
   user friendly. Have a look at how current tools look like and lets copy a working design"

## Index

| file | item | what it does | runs where | depends on |
|---|---|---|---|---|
| `BRIEF-silent-studio-versions-and-ride.md` | **A** | A1: withdraw cycle 16's four audio-studio "silent rounds" (→ `_to_delete/`), re-issue closing v5 / colours v5 / ranking v8 in silent-studio, re-point docs. A2: teaser v9 (re-cut with gates-saving v9), new `silent-studio/ride/` composition (v1), fix `ride/soundv2/concat.txt`'s absolute paths | Nathan's PC (`device_bash`) | A1 nothing; A2 needs B2 |
| `BRIEF-gate-easing-inversion.md` | **B** | B1: one edit block in `gates-saving/index.html` (dip at every pulse, crest mid-leg) + node check; **Nathan renders**; B2: file v9, measure the rider's motion on the render, swap `silent-studio/all-renders/` | B1/B2 Nathan's PC; the render is Nathan's (`COMMANDS.md` §1) | nothing |
| `BRIEF-sound-remux-rounds.md` | **C** | `gates-saving/soundv11` and `ride/soundv3`: the unchanged cycle-16 WAVs muxed onto the new pictures; `audio-studio/all-renders/` swap + ride added | Nathan's PC | B2 and A2 (and A1 for the all-renders state) |
| `BRIEF-av-align-ui-redesign.md` | **D** | restyle/relayout of `tools/av-align/av-align.html` (Resolve-style: viewer, inspector, timeline dock, status bar, dark), same behaviour, same ids, tests unchanged; ride preset name → `ride_v1.mp4` | cloud container (Playwright) + write-back to the PC | nothing hard; run last |
| `COMMANDS.md` | — | the one PowerShell command Nathan runs (the render), what to look at, how to commit | Nathan | after B1 |
| `check_rider_motion.py` | B | **written by the executor** from B §6.3 (not present yet) — the per-frame rider tracker; its `.cent.npy` outputs are the evidence of the motion change | — | — |

## Execution order

```
B1 (index.html edit + node check)      A1 (withdraw + re-issues + docs)     D (UI, container)
        │ then Nathan: COMMANDS.md §1            │  any time                       │  any time
        ▼                                        │                                 │
B2 (pick up render, measure, file v9) ───────────┤                                 │
        ▼                                        ▼                                 │
A2 (teaser v9, ride v1, concat.txt) ◄── needs gates-saving_v9 + closing_v5/ranking_v8
        ▼
C  (soundv11, ride/soundv3, audio-studio/all-renders)
```
- **Parallel-safe:** B1 ‖ A1 ‖ D (disjoint files; A1 and D both touch
  `tools/av-align/README.md` line 48 with the *same* edit — whichever runs second finds it
  done). A2 waits for B2. C waits for A2 (and A1's all-renders state).
- **Shared files to watch:** `silent-studio/all-renders/` (A1, A2, B2 each add/move different
  files — never the same one), `audio-studio/structure.md` (A1 edits the decision note and
  adds a `ride/` row; C edits the gates-saving row and the ride row's feedback cell — do them
  in that order), `audio-studio/ride/README.md` (A2 one sentence; C the tables).
- **Why this order and not "everything on v8 now, re-bump later":** building the ride and the
  teaser first on `gates-saving_v8` and again on v9 would give the ride two silent-studio
  versions and the teaser two new versions in one day for no visual reason. The render is one
  minute of Nathan's time; A1 and D give the executors work while waiting.
- **Git:** executors never commit (`process/CONVENTIONS.md`: bookkeeping stays with the
  coordinator). Every brief ends with `git status --short` of its expected footprint. Nathan
  or the coordinator commits with `COMMANDS.md` §3. `_to_delete/` is git-ignored, so withdrawn
  folders show as deletions in git — they exist in commit `b69effa` and on disk in
  `_to_delete/`.
- **`STATE.md` / `OPEN-ITEMS.md`:** the coordinator's, after the cycle lands (per-scene table
  below is the source).

## What changed versus cycle 16 (what is superseded, what happens to it)

| cycle 16 output | cycle 17 | where it goes |
|---|---|---|
| item D's four "silent rounds" `audio-studio/brandmark/closing/soundv3`, `colours/soundv2`, `ranking/soundv4`, `teaser/soundv3` (+ their `audio-studio/all-renders/*_no_sound_*.mp4` copies) | **withdrawn** (A1); replaced by silent-studio versions | folders → `_to_delete/audio-studio_<scene>_soundvN_withdrawn_cycle17/` (FEEDBACK.md inside, nothing lost); files → `_to_delete/all-renders_<name>_withdrawn_cycle17.mp4`; README rows say "withdrawn"; numbers not reused |
| item D's doc edits (5 READMEs, 4 AUDIO-BRIEFs, notes in `structure.md`/`APPROACH.md`) | re-pointed (A1): "no sound round current; the deliverable is the silent render in silent-studio"; the decision "synth dropped" stays valid | edited in place, dated |
| `audio-studio/all-renders/` = 3 sounded + 4 silent | **sounded only**: start-ride, gates-saving (v9/soundv11 after C), opening, ride (after C) | the 4 silent copies → `_to_delete/` |
| `gates-saving_v8.mp4` (silent-studio) and `gates-saving_v8_with_sound_v10.mp4` | replaced by v9 / v9_with_sound_v11 (B2, C) | → `_to_delete/all-renders_…_replaced_in_all-renders_by_…` (cycle 16 naming); round folders keep their copies |
| `ride/soundv2/ride_v2.mp4`, `ride_v2_silent.mp4` | kept as round 2 (older picture); `ride/soundv3` is the new round (C); `concat.txt`'s absolute paths fixed (A2 §4.5) | untouched except `concat.txt` + one dated FEEDBACK line |
| `teaser_v8.mp4` (concat with `gates-saving_v6`, two rounds stale even in cycle 16) | teaser v9 (A2) | → `_to_delete/all-renders_teaser_v8_replaced_in_all-renders_by_v9.mp4` |
| av-align page (cycle 16 item C) | restyled (D); `video_name` `ride_v2_silent.mp4` → `ride_v1.mp4` | edited in place; core script and tests byte-unchanged |
| cycle 15's `BRIEF-gates-surge-inversion.md` (cancelled, never run) | its design re-validated on disk and re-issued as B (comment text and pointer updated to cycle 17) | cycle 15 folder untouched (history) |

## Per-scene / per-round final state (after A, B, C, D)

| scene | silent-studio version (rounds/ + all-renders flat file) | change to the picture | audio-studio round (folder / file) | sound source | replaces in `silent-studio/all-renders/` | replaces in `audio-studio/all-renders/` |
|---|---|---|---|---|---|---|
| brandmark/opening | v3 `opening_v3.mp4` (unchanged) | none | `brandmark/opening/soundv3/opening_v3_with_sound_v3.mp4` (cycle 16, unchanged) | Tunetank piano logo | — | — |
| start-ride | v4 `start-ride_v4.mp4` (unchanged; its rider runs at constant speed — nothing to invert) | none | `start-ride/soundv9/start-ride_v4_with_sound_v9.mp4` (cycle 16, unchanged) | Tunetank ride track slice 0–14.0 s | — | — |
| gates-saving | **v9** `gates-saving_v9.mp4` (B) | gate easing inverted: slow at the 5 pulses, fast mid-leg; 369 frames, gate times/positions unchanged | **`gates-saving/soundv11/gates-saving_v9_with_sound_v11.mp4`** (C) | `soundv10/soundtrack_v10.wav` unchanged (slice 14.0–26.3 s of the Tunetank master + Salamander E5 pulses) | `gates-saving_v8.mp4` | `gates-saving_v8_with_sound_v10.mp4` |
| ranking | **v8** `ranking_v8.mp4` (A1, byte-identical re-issue of v7) | none (same bytes) | none current (soundv4 withdrawn; last on disk soundv3, synthesised, reference) | — | `ranking_v7.mp4` | `ranking_v7_no_sound_v4.mp4` (withdrawn, nothing replaces it) |
| colours | **v5** `colours_v5.mp4` (A1, re-issue of v4) | none | none current (soundv2 withdrawn; soundv1 reference) | — | `colours_v4.mp4` | `colours_v4_no_sound_v2.mp4` (withdrawn) |
| brandmark/closing | **v5** `closing_v5.mp4` (A1, re-issue of v4) | none | none current (soundv3 withdrawn; soundv2 reference) | — | `closing_v4.mp4` | `closing_v4_no_sound_v3.mp4` (withdrawn) |
| teaser | **v9** `teaser_v9.mp4` (A2: opening_v3 + start-ride_v4 + **gates-saving_v9** + ranking_v8 + closing_v5; 1428 frames, 47.6 s) | only the gates-saving section (20.5–32.8 s) | none current (soundv3 withdrawn; soundv2 reference; sounded teaser = later follow-up) | — | `teaser_v8.mp4` | `teaser_v8_no_sound_v3.mp4` (withdrawn) |
| **ride** (new composition) | **v1** `silent-studio/ride/rounds/v1/ride_v1.mp4` = `all-renders/ride_v1.mp4` (A2: start-ride_v4 + gates-saving_v9; 789 frames, 26.3 s) | second half carries the inverted easing | **`ride/soundv3/ride_v1_with_sound_v3.mp4`** (C) | `ride/soundv2/ride_master_v2.wav` unchanged (T1 = 3.80, T2 = 16.54, E5 pulses) | — (new) | — (new; `ride_v2.mp4` was never in all-renders) |

`silent-studio/all-renders/` afterwards: 8 files (`closing_v5 colours_v5 gates-saving_v9 opening_v3 ranking_v8 ride_v1 start-ride_v4 teaser_v9`). `audio-studio/all-renders/`: 4 files (`start-ride_v4_with_sound_v9 gates-saving_v9_with_sound_v11 opening_v3_with_sound_v3 ride_v1_with_sound_v3`).

## Rulings

1. **Silent renders live in silent-studio; audio-studio holds sounded renders only.** Cycle 16
   item D's "silent round inside audio-studio" is withdrawn as a wrong placement (Nathan's
   words), not as a wrong decision — the decision "no synthesised sound moves forward" stands.
2. **The gate easing only exists in gates-saving.** `start-ride/index.html` moves its rider at
   constant speed (lines 211–222, `i / N * L`), has no `rideFrac`/profile, and its gates only
   recolour on crossing; no other composition reuses the easing. Nathan's "gates-saving and
   ride renders" are the same motion seen in two files (ride = start-ride + gates-saving), so
   the fix is one edit block. The teaser shows the old motion until re-cut (A2).
3. **Cycle 15's inversion design is lifted, not its docs.** Every anchor (lines 219–246, 151,
   314; md5 `5166bb8a…`; `SURGE_A`/`trough` occurrences) and every number was re-derived on
   disk on 2026-09-23 (B §2, §6.1): `DIP_A = 0.6`, dips 0.0498 / 0.0520 / 0.0541 / 0.0536 /
   0.0535 route/s at the five pulses, crests 0.1979 / 0.2187 / 0.2150 / 0.2138 mid-leg, route
   fraction exactly 0 / 0.25 / 0.50 / 0.75 / 1 at 0 / 2.01 / 3.85 / 5.71 / 7.58 s, 8 segments,
   monotone, speed continuous (max boundary jump 5.6e-9), `RIDE_DUR` 7.58 and the 12.3 s scene
   unchanged. The v8 render was also *measured* (rider tracked per frame): 8.15 / 4.82 / 8.88
   px/frame at the gates vs 2.55 / 2.28 mid-leg — the defect is in the picture, not only in
   the code — and the same tracker is B2's acceptance check (v9 must read ≤ 3.5 at the gates
   [modelled 2.2–2.3], ≥ 6.5 mid-leg [7.4 / 9.1 / 8.9 / 8.7], ratio ≥ 2.5, the rider ≤ 2.2 px
   from each gate tick and on v8's pixels at start/finish; v8 fails criteria 2–5). Corrected
   2026-09-24: the first draft compared gate-frame positions to v8's rider (off by up to 3.5 px
   because pulses are not on frame boundaries) and demanded mid-leg position differences that a
   symmetric profile cannot produce — Inspect caught it before the render.
4. **The audio does not change** (C): the E5 pulses come from `ride_master.py`'s note list and
   land on video 3.80 / 5.81 / 7.65 / 9.51 / 11.38 s; B keeps `RIDE_T0`/`PULSE_T`, so
   `ride_master_v2.wav` and its gates-saving slice are muxed unchanged. New round numbers
   because the picture is new: `gates-saving/soundv11`, `ride/soundv3`.
5. **Nathan renders; agents do everything else.** `device_bash`'s VM cannot run HyperFrames
   (npm registry → 403 for `hyperframes`; no Chromium). It can run node, python3 (numpy,
   PIL, opencv — no scipy), ffmpeg/ffprobe — all of B's checks and A/C's concats and muxes.
6. **UI: adopt the Resolve Edit-page layout and the research palette; keep every id, the
   core script and the tests untouched; dark only; drop the optional extras** (overview strip,
   sync strip, frame zoom, split-pane drag, extra keys). Verification is visual (Playwright
   screenshots looked at with the Read tool, three sizes, five states) plus the cycle-16
   behaviour checks extended to the new timecode.
7. **Doc dating:** the repo's reference docs date their durable additions inline
   (`(added 2026-09-06 at Nathan's request)`, `> **Decision note, 2026-09-23 (cycle 16):** …`,
   `Written 2026-09-09 …`, `Created 2026-09-11. … added 2026-09-11`). Every brief follows
   that: each new line in an existing reference doc carries `2026-09-23` and `cycle 17`.

## ASSUMED (Nathan can override; each is cheap to reverse)

- **A-1** "new versions of the existing ones" = the next silent-studio round for each scene
  that had an audio-studio silent round, **byte-identical where nothing changed** (closing v5,
  colours v5, ranking v8), with the round's FEEDBACK saying so in its first line. Alternative:
  no bump for unchanged pictures — three `mv`s back and three README rows.
- **A-2** opening and start-ride are not re-issued (they have sounded rounds; not in the
  cycle-16 silent set).
- **A-3** the withdrawn `soundvN` numbers are not reused (next: closing soundv4, colours
  soundv3, ranking soundv5, teaser soundv4).
- **A-4** `audio-studio/all-renders/` holds sounded renders only; a scene with no current
  sound round has no file there; the "starting point" is read from `silent-studio/all-renders/`.
- **A-5** the ride is a silent-studio composition of the *assembled* kind (concat, like the
  teaser), folder `silent-studio/ride/`, version **v1**, flat file `ride_v1.mp4`; it goes into
  both `all-renders/` mirrors (`ride_v1_with_sound_v3.mp4` on the audio side, process naming).
- **A-6** teaser v9 names the re-issued parts (`ranking_v8`, `closing_v5`) in its concat.
- **A-7** `ride/soundv2/ride_v2_silent.mp4` stays where it is (round-2 input, reference); only
  `concat.txt`'s absolute paths are fixed, pointing the gates-saving half at
  `silent-studio/gates-saving/rounds/v8/gates-saving_v8.mp4` (byte-identical to what it was
  built from).
- **B-1** start line and finish line are dips like the gates (one rule for all five pulses;
  gentle roll-out 0.050 and arrival 0.054 route/s); a "sprint finish" would be a two-line
  variant. `DIP_A = 0.6` = the exact mirror of v8's strength (v8's fast/slow swapped, same
  envelope). `DIP_A = 0.5` if Nathan wants it milder (dips 0.062, crests 0.205).
- **C-1** the new audio rounds do not copy the WAV (they name `../soundv10/soundtrack_v10.wav`
  / `../soundv2/ride_master_v2.wav` with md5s); one `cp` each if Nathan prefers self-contained
  rounds.
- **D-1** dark only; `#stop` kept as a button; radio kept hidden inside the card; extras
  dropped (list in D §1). **D-2** `video_name` → `ride_v1.mp4` even if D runs before A2 (the
  page only sees file names).

## Open items for Nathan (not blocking; answer in this file, inline)

1. **A-1** — do you want the byte-identical re-issues (closing v5, colours v5, ranking v8),
   or only new versions where the picture changed (gates-saving v9, teaser v9, ride v1)?
   Default: re-issues, as your words say. **Answer:**
2. **B-1** — after watching `gates-saving_v9.mp4`: keep the gentle start/finish (dips at the
   start line and finish line too), or a sprint to the finish? And is the strength right
   (`DIP_A = 0.6`, same envelope as v8 mirrored) or milder (0.5)? **Answer:**
3. **T1** — still pending from cycle 16: nudge `T1 = 3.80` with the alignment tool if the
   ride-1 entry feels off (a one-constant re-run of `ride_tunetank.py`, then C's two muxes
   again). **Answer:**
4. **Teaser sound** — still a later follow-up (apply the ride and opening recordings to the
   teaser's cut; decide ranking/closing sections). Say when. **Answer:**
5. **D** — after the restyle: anything you want back from the old page (e.g. the always-open
   explanation), or any panel proportion to change? **Answer:**

## Verified from disk vs taken from the digest (Plan pass, 2026-09-23)

Verified on Nathan's PC: git clean at `b69effa`; both `all-renders/` listings and md5s; the
four withdrawn folders' contents; `ride/soundv2/` contents and `concat.txt`'s absolute paths;
`gates-saving/index.html` md5/lines/anchors 151, 219–246, 314 and the five `trough` hits (226, 235, 237, 243, 245; B §3 first said four — corrected 2026-09-24 after the executor's stop);
`start-ride/index.html` constant-speed `ride()`; no other `index.html` uses the profile;
`teaser/rounds/v8/concat.txt` uses `gates-saving_v6`; the cycle 15 brief's numbers (re-run
under node v22.23.2 — identical to the digit); the v8 render measured per frame (tracker in
B §6.3); VM tooling (node, python3 + numpy/PIL/cv2, no scipy, ffmpeg; `npm view hyperframes`
→ 403; no Chromium); the av-align file (793 lines, 40 766 B), its config block, the ids and
functions the JS uses, the test's static checks, `.gitattributes` LF rule, README line 48;
the Playwright Chromium in the cloud container (`/opt/pw-browsers/chromium-1194`). Taken from
the research note (not re-derived): the reference-tool table and the WCAG ratios of the
palette (D §8.3 has the executor recompute the ratios from the shipped tokens).

## Model-tier readout (this pass)

| Tier | Model | Tokens (approx) | Outcome |
|---|---|---|---|
| Digest | Haiku + Sonnet researcher (earlier) | (coordinator's figure) | facts + UI research note; every load-bearing fact re-checked on disk by Plan |
| Plan | Fable (claude-fable-5-1) | ~150k in context, ~30k written | this folder (README, COMMANDS, 4 briefs); cycle 16 pointer notes; ~25 read-only tool calls on Nathan's PC (git, ffprobe, md5, node profile check, per-frame rider tracking of v8, npm/Chromium probe) and the research screenshots read in the container |
| Execute | Sonnet | — | not yet dispatched (A1, B1, D can start now) |
| Inspect | Opus | — | not yet dispatched |
