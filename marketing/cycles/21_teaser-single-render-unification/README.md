# Cycle 21 — teaser as one real render (single HyperFrames composition)

Goal: resolve `structure.md`'s open production-method question — stop assembling the
teaser as 5 separately-rendered clips concatenated by ffmpeg, build it as ONE real
HyperFrames render instead. Triggered directly by Nathan: "let's instead just consider
this as one version of a full final teaser and work with that instead of still thinking
of the separate renders, to have more freedom" — said after discovering that two piano-
note-landing targets in the audio arrangement (button-appear, click in start-ride) were
blocked by start-ride's mandatory 1.0s from-black beat, which only exists because each
scene has to be a self-contained, independently-concatenable clip.

This cycle ran the full Digest/Plan → Execute → Inspect pipeline (unlike cycle 20, which
was flagged as a process deviation).

## What happened, in order

1. Plan tier (Fable): read all 5 scene compositions plus the render/concat pipeline and
   wrote `BRIEF-teaser-full.md` — a digest of every scene's ids/CSS/JS/timeline, a
   feasibility finding (nesting each scene's already-exported GSAP timeline into one
   master timeline via `gsap.context()` scoping needs zero edits to any scene's tween
   code), and a full mechanical implementation brief with 3 open taste decisions flagged
   for Nathan (start-ride's blackout beat, a pre-existing gate-position mismatch, final
   folder location) rather than resolved unilaterally.
2. Execute tier (Sonnet): followed the brief exactly, building
   `marketing/silent-studio/teaser-full/` — one 1012-line `index.html` (now 1014 after a
   post-inspection fix) merging all 5 scenes, plus `theme.js`, both map PNGs, and a
   README. Used a Python script to assemble the file programmatically from the real
   source files rather than hand-retyping, avoiding transcription risk. No stops needed;
   2 minor brief-wording notes flagged, 0 tween lines edited. Implemented all 3 open
   decisions as their stated defaults.
3. Inspect tier (Opus, fresh context): independently re-derived every check rather than
   trusting the executor's report — byte-diffed every scene's script body against source
   (all identical), traced the CSS cascade by hand to confirm no scoping leak (in
   particular: ranking's "Today" row does NOT go purple from start-ride/gates-saving's
   stale color rule), ran all 6 inline scripts in a stubbed JS environment to confirm zero
   global leakage and zero out-of-scope `getElementById` calls, and independently
   re-derived each scene's real duration from its own last tween. Verdict: **PASS WITH
   FINDINGS (5 minor, 0 blocking)**.
4. One finding fixed directly (chore-level, 2 lines): the `gsap.context` version guard
   sat after the 5 scene scripts instead of before them, so on an old GSAP it would throw
   a generic error before the friendly one. Moved to its own `<script>` tag right after
   the GSAP CDN load. `index.html` is now 1014 lines, md5 `c6ab21e685965c2b7af8fbef428f4cbd`.

## What this build actually does

Nests `opening` (0.0), `start-ride` (6.2), `gates-saving` (20.2), `ranking` (32.5), and
`closing` (43.3) into one master GSAP timeline, `master.duration()` = **47.3s**, with each
scene's CSS/JS scoped to its own subtree so the 37 shared element ids and several
colliding CSS rules across the originals don't clash. Every scene's own tween code is
byte-identical to its source file — the only changes anywhere are the permitted
mechanical ones (CSS-selector prefixing, JS IIFE/`gsap.context` wrapping, `data-hf-id`
stripping, and each clip's `data-start`/`data-duration`/`data-track-index` attributes).

**This has NOT been rendered, previewed, or visually checked yet** — no npm/browser
access in either sandbox. See `OPEN-ITEMS.md`.

## Open decisions still standing (implemented as their stated default; not re-litigated here)

a. start-ride's 1.0s blackout/reveal lead-in — kept as-is. This is the actual reason
   button-appear/click stay at 7.4s/9.4s rather than reaching your original 6.3/8.7s
   targets; removing it now that there's no concat seam would get to 6.4s/8.4s but
   shortens the whole teaser by another 1.0s (yet another cascade through the audio
   arrangement). Your call whenever you want to revisit it — no rebuild needed, it's a
   text edit in this one file now, not a 5-file cascade.
b. The gates-saving/ranking gate-position mismatch (pre-existing, unrelated to this work)
   — left untouched.
c. Built as a new sibling folder, `teaser-full/`, not overwriting `teaser/index.html` (the
   old 11.2s legacy brand-teaser) or anything else — so the old concat pipeline and this
   new single-render composition can be compared side by side before committing to one.

## Files in this folder

| File | What |
|---|---|
| `BRIEF-teaser-full.md` | v1 Plan tier: digest, feasibility, and the executor's implementation brief |
| `EXECUTOR-REPORT.md` | v1 Sonnet executor's report |
| `INSPECT-REPORT.md` | v1 Opus (fresh context) inspector's report |
| `v1-merged-timelines/` | v1's actual built files, archived (not deleted) once superseded |
| `BRIEF-teaser-full-v2.md` | v2 Plan tier brief — the corrected native sub-composition recipe |
| `build_teaser_v2.py` | v2's build script (mechanical transform of the 5 originals; no hand-retyped tweens) |
| `check-teaser-full-v2.py` | v2's 257-check static verifier, run independently by both the executor and the inspector |
| `EXECUTOR-REPORT-v2.md` | v2 Sonnet executor's report |
| `INSPECT-REPORT-v2.md` | v2 Opus (fresh context) inspector's report |

## v2 — the redo (2026-09-26): v1 used the wrong HyperFrames mechanism

v1's approach — manually merging all 5 scenes' markup/CSS/JS into one file and
`master.add()`-ing each scene's GSAP timeline onto a hand-built master timeline — was
internally consistent (byte-identical tweens, correctly scoped CSS, PASS from the v1
Opus inspector) but was never checked against HyperFrames' own CLI, because nobody in the
v1 pipeline (Fable, Sonnet, Opus, or this chat) had working `npm`/browser access in any
sandbox. Nathan ran `npx.cmd hyperframes lint` on the real build on his PC and it came
back with 7 errors + 7 warnings — 5x `timeline_id_mismatch` and 4x
`nested_structure_needs_subcomposition`, both pointing at the same root cause:
HyperFrames has a native sub-composition mounting system (`data-composition-src` + a
`<template>`-wrapped child file), and its own docs say plainly: "Do not add a child
timeline manually to the parent GSAP timeline. HyperFrames seeks nested timelines
independently." v1's whole master-timeline mechanism was the wrong tool for the job.

The fix required re-running the full pipeline against the real mechanism, confirmed
against a real production example (HeyGen's own `hyperframes-launches` repo, a 5-scene
launch video built exactly this way) before any brief was written this time:

1. **Plan tier (Fable)**: read the 5 original scene files plus the archived v1 build, and
   wrote `BRIEF-teaser-full-v2.md` — a thin root `index.html` with 5 empty
   `data-composition-src` slots, plus 5 new `compositions/*.html` files (one
   `<template>`-wrapped sub-composition per scene), each built by double-ID-prefixing
   that scene's CSS, stripping `data-hf-id` stamps, and scoping JS via
   `gsap.context(fn, R)` + `closest()`-scoped lookups instead of a `document` shim.
   Flagged and got approved on 2 design calls beyond the stated brief (single light-DOM
   mount matching the real HyperFrames example; renaming the colliding `#basemap` id in
   the 3 new map-scene files only, originals untouched) and one gates-saving stale
   `data-duration` correction (12.4 → 12.3, matching where its own timeline actually
   ends). No unresolved ambiguity.
2. **Execute tier (Sonnet)**: built exactly per the brief via a mechanical Python
   transform script (no hand-retyped tweens/CSS/markup), archived v1 to
   `v1-merged-timelines/` rather than deleting it, and ran the brief's own 257-check
   static verifier to a clean pass. Self-caught and fixed a real bug in its own first
   draft — a `#stage{...}` rule was mis-prefixed as a descendant selector instead of the
   correct bare scene-level rule, which the checker's own prefix test couldn't catch —
   by byte-diffing its output against the brief's fully-specified worked example. No
   stops needed.
3. **Inspect tier (Opus, fresh context)**: independently re-derived every claim rather
   than trusting the executor's report — re-ran the 257 checks itself, re-hashed the 5
   originals against the last git commit (not just the executor's before/after claim),
   wrote its own script to undo every transform and confirm the result equals the
   originals exactly, ran every original and every new script through a fake-GSAP/DOM
   harness in both themes and diffed the call logs, and read HyperFrames' own mounting
   source on GitHub to confirm relative asset paths and CSS-prefix rewriting behave as
   the brief assumed. Verdict: **PASS WITH FINDINGS (5 minor, 0 blocking)** — one
   harmless dead-code fallback by design, one checker gap to add for future cycles, two
   small inaccuracies in the executor's own report, and one README nit (fixed directly
   as a chore below).
4. Two nits fixed directly (chore-level): the `teaser-full/README.md` line pointing at
   "archived below" without a path, now points at `v1-merged-timelines/`.

The two pre-existing lint findings not caused by either build —
`gsap_repeated_fromto_without_baseline` on `#trow-today` (ranking's own original file)
and `svg_measure_before_path_d` on `#route-core` (start-ride/gates-saving/ranking's
originals) — were confirmed present in the untouched original scene files by both the v1
and v2 pipelines independently, and are intentionally NOT fixed here: fixing them means
editing an original scene file, which is out of this cycle's authorization.

**Still not rendered end-to-end** — lint/check/snapshot/render on the real HyperFrames
CLI only run on Nathan's PC (no npm registry access in any sandbox used here). See
`OPEN-ITEMS.md`'s v2 section for the exact full-path PowerShell blocks and what each
result should show.

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| Plan (v1) | Fable | ~188k | digest + feasibility + brief written; nesting confirmed viable with zero scene-tween edits — mechanism later found wrong |
| Execute (v1) | Sonnet | ~178k | `teaser-full/index.html` (+assets) built per v1 brief; no stops; 0 tween edits |
| Inspect (v1) | Opus (fresh context) | ~186k | PASS WITH FINDINGS (5 minor, 0 blocking) — validated internal consistency, not the real mechanism |
| chore (v1 guard-ordering fix) | Sonnet (this chat, direct) | — | moved `gsap.context` guard before scene scripts (2 lines) |
| Plan (v2 redo) | Fable | ~209k | corrected native sub-composition brief written after real `npx.cmd hyperframes lint` output exposed v1's wrong mechanism |
| Execute (v2 redo) | Sonnet | ~90-110k | root + 5 `compositions/*.html` built per v2 brief; 257/257 checks; self-caught and fixed one real bug |
| Inspect (v2 redo) | Opus (fresh context) | ~220k | PASS WITH FINDINGS (5 minor, 0 blocking) — independently reproduced every claim |
| chore (v2 doc nits) | Sonnet (this chat, direct) | — | `teaser-full/README.md` archive-path nit; this README's v2 section |
