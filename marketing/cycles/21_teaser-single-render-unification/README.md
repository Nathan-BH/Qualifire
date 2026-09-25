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
| `BRIEF-teaser-full.md` | Plan tier: digest, feasibility, and the executor's implementation brief |
| `EXECUTOR-REPORT.md` | Sonnet executor's report |
| `INSPECT-REPORT.md` | Opus (fresh context) inspector's report |

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| Plan | Fable | ~188k | digest + feasibility + brief written; nesting confirmed viable with zero scene-tween edits |
| Execute | Sonnet | ~178k | `teaser-full/index.html` (+assets) built per brief; no stops; 0 tween edits |
| Inspect | Opus (fresh context) | ~186k | PASS WITH FINDINGS (5 minor, 0 blocking) |
| chore (guard-ordering fix) | Sonnet (this chat, direct) | — | moved `gsap.context` guard before scene scripts (2 lines) |
