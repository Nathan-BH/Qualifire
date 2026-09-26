# Cycle 23 — start-ride lead-in cut (piano-note sync) + teaser-lanes kit rename

**Process note:** done as **direct execution by the chat model**, not through the
Digest/Plan/Execute/Inspect pipeline — same class of exception as cycle 20
(`05_audio-studio-launch/README.md`'s carve-out): a small, mechanical cascade of
timing edits plus a mechanical rename, not new capability landing in code. Nathan
asked for speed and to execute immediately.

## What triggered this

Nathan noticed the kitv2 render's start-ride button-appear/click were audibly late
against the piano's own note onsets. Investigation (this same chat, prior turns)
traced it to cycle 20's `OPEN-ITEMS.md` #2 / cycle 21's README "open decision (a)":
start-ride's mandatory 1.0s blank lead-in (`tl.shiftChildren(1.0, true)`) was
identified as the blocker two cycles ago and deliberately left unresolved pending
Nathan's call on how much to cut it. Cycle 21 (the single-render unification) gave
the *freedom* to fix this cheaply but did not itself make the cut. Nathan chose to
proceed now.

## What changed

1. **`silent-studio/start-ride/index.html`** (canonical source): lead-in cut
   1.0s → 0.2s (`shiftChildren(0.2, true)`; blackout hold/reveal rescaled to
   0.08/0.12, keeping the same 0.4:0.6 ratio). Scene's own duration: 14.0 → 13.2s
   (both `#map`/`#ui` `data-duration` updated). Button-appear moves 7.4s → 6.6s;
   click moves 9.4s → **8.6s — exactly the 4th piano note onset** (8.60s per
   `FEEDBACK-v1.md`'s chroma analysis). Button-appear (6.6s) sits 0.45s after the
   3rd onset (6.15s), same "consistently offset after the note" pattern Nathan
   chose for the opening's own beats, just a larger offset — flagging this
   honestly rather than claiming an exact landing that isn't there.
2. **`cycles/21_teaser-single-render-unification/build_teaser_v2.py`**: `SCENES`
   tuple updated (startride duration 14.0→13.2; gatessaving/ranking/closing starts
   19.4/31.7/42.5, cascading -0.8s each) and re-run — regenerates
   `teaser-full/compositions/*.html` mechanically from the canonical sources (no
   hand-retyped tweens), same tool cycle 21's executor used.
3. **`teaser-full/index.html`** (master, hand-authored, not script-generated):
   slot `data-start`/`data-duration` updated to match (see table below); total
   `data-duration` 47.3 → **46.5s** (1419 → 1395 frames at 30fps).
4. **`audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-{A,B}.json`**:
   every clip time tied to a start-ride/gates-saving/ranking visual event shifted
   -0.8s (full list in each file's own updated `note` field). Option B's two pure
   audio-loop segments (anchored at master 0 and 12.26, independent of any video
   cut) were deliberately left alone; only its third segment's `out` (10.18→9.38)
   and the ranking-restart clip (34.7→33.9) moved, since those are pinned to the
   ranking scene cut, not to the loop's own arithmetic. `video.duration_s`/`frames`
   updated in both files.
5. **teaser-lanes kit rename** (Nathan, mid-task): `kit/` → `kitv1/`,
   `kit-teaser-full/` → `kitv2/`, so kit folders read as a build-iteration
   sequence rather than being named after whichever video they happen to hold.
   Updated: `prep_kit.py` (`kit_dir` values + docstring), `kits.json`,
   `.gitignore`, `teaser-lanes.html` (two literal mentions; the picker itself is
   data-driven off `kits.json`, no logic change), `verify_default_mix.py`, the
   `tests/e2e-real.mjs` comment, and `README.md` throughout. **The next kit
   built — from this cycle's re-render — is `kitv3`, whatever the video itself
   ends up called** (convention now stated in `teaser-lanes/README.md`'s opening
   paragraph).

## Slot table (master `teaser-full/index.html`)

| scene | old start | new start | old dur | new dur |
|---|---|---|---|---|
| opening | 0 | 0 (unchanged) | 6.2 | 6.2 (unchanged) |
| start-ride | 6.2 | 6.2 (unchanged) | 14.0 | **13.2** |
| gates-saving | 20.2 | **19.4** | 12.3 | 12.3 (unchanged) |
| ranking | 32.5 | **31.7** | 10.8 | 10.8 (unchanged) |
| closing | 43.3 | **42.5** | 4.0 | 4.0 (unchanged) |
| **total** | **47.3** | **46.5** | | |

## Status (updated 2026-09-26, same day)

Rendered, copied to `all-renders/teaser-full_v2.mp4`, and built as **kitv3** —
`PREP OK`, md5-verified, 1395 frames / 46.5s confirmed by ffprobe against this
cycle's own numbers, master-reproduction and alignment-guard checks all pass.
`kits.json` now lists kitv3 as the default. See `OPEN-ITEMS.md` for the exact
commands that were run. Only listening/feedback (step 5 there) is still Nathan's.

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| direct (no pipeline — mechanical timing cascade + mechanical rename, per the cycle-05/cycle-20 exception) | Sonnet (this chat) | — | lead-in cut + full cascade traced and applied by direct arithmetic (start-ride source, build script SCENES, master index.html, both rides-options JSONs); kit folders renamed kit→kitv1, kit-teaser-full→kitv2 and every reference updated; Nathan rendered same day, confirmed 46.5s/1395 frames by ffprobe, built as kitv3 (PREP OK) and listed as default in kits.json — see OPEN-ITEMS.md |

## Addendum (same day): arrangement_v2 shipped as kitv3's real default

Nathan asked what a proper default arrangement would look like (kitv3's default was
still the generic placeholder chain, same one every kit gets). Proposed one in chat
first, then built it after approval:

- **Piano spine**: continuous `b-piano` loop (0-12.26-24.52-33.9s, same loop math as
  `rides-options/option-B-piano-plus-stems.json`) instead of restarting the piano at
  each ride cue.
- **Rides**: `b-drums`+`b-bass`+`b-other` (Nathan's direct listening call: option A's
  fuller stem set beats option B's isolated strings, which "sounds empty"), 0.30 gain
  vs piano's 0.45, entering at 9.2s and 21.5s with a breathing dip in between
  (9.2-15.5s in, silence, back in by 21.5 -- `IDEA-v1.md`'s "keep piano going, quiet
  the rest for breathing room" request, previously unbuilt in either option file).
- **Bug found and fixed**: option A has a real silence gap ~31.3-33.9s (its ride-2
  clips all end at 31.26s, nothing plays again until the piano restart at 33.9s) --
  Nathan caught this by ear. The continuous piano loop covers that exact stretch, so
  it's piano-solo there now, not silence, while drums/bass/other still correctly thin
  out before the ranking climb (that part was intentional per `FEEDBACK-v1.md`, not
  the bug).
- **e5 gate chimes**: gain 1.0 -> 0.3, per Nathan's earlier "too loud" note.

Written to `audio-studio/teaser/arrangements/arrangement_v2/arrangement_v2.json`.
Wired into `prep_kit.py` as a new `default_arrangement` override (only set for
`teaser-full_v2`; every other kit's build is untouched) and kitv3 rebuilt --
`PREP OK`, manifest now ships 12 clips from arrangement_v2 instead of the generic
16-clip placeholder. No render/npm needed for any of this (pure Python + existing
kit build), so nothing here waits on Nathan's PC.
