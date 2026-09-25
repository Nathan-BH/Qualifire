# Cycle 20 — piano-spine rides arrangement + opening trim

Goal: implement Nathan's `IDEA-v1.md` ("piano never stops, everything else breathes
around it") for the teaser's Rides section, and execute the resulting Opening-timing
consequences, using the teaser-lanes tool's arrangement format.

**Process note (read this first):** this cycle's work was done as **direct execution
by the chat model**, not through the Digest/Plan/Execute/Inspect pipeline — the same
class of exception `05_audio-studio-launch/README.md` uses for audio-studio work: a
sound-arrangement/timing redesign plus small, mechanical GSAP timing edits, not a new
capability landing in code. Nathan reviewed and corrected the work directly in
`FEEDBACK-v1.md` rather than through a written Inspect report. Flagging this plainly —
the readout below is not a Sonnet-executor/Opus-inspector tier readout, because those
tiers were not used.

## What happened, in order

1. `IDEA-v1.md` (2026-09-24, Nathan) — plan for Opening / Rides / Ranking+Closing.
2. `FEEDBACK-v1.md` (2026-09-25) — feasibility analysis: piano note onsets, the
   ~12.25s loop-trim math for the Rides section, and the ranking/closing note-landing
   coincidences (43.60s / 46.05s already fall on the scene cut and near video end).
   Nathan edited the file directly with inline comments.
3. Correction: an early claim that opening button/click timing needed "no change" was
   wrong — Nathan caught it; the render had never actually been touched.
4. `rides-options/option-A-piano-then-bed.json` and `option-B-piano-plus-stems.json`
   built for A/B listening in teaser-lanes. Option A corrected from the monolithic
   `bed` file to explicit `b-piano`+`b-drums`+`b-bass`+`b-other` per Nathan (piano is
   part of the "B" stem family). Gains rebalanced so piano stays loud while the other
   B-stems can be lowered independently — Nathan's "piano weight" reasoning.
5. Render investigation: confirmed the opening / start-ride / closing composition
   sources; confirmed render access is PC-only (the cloud sandbox gets a 403 from the
   proxy on `registry.npmjs.org`).
6. Structural conflict found: the opening's original target for "start button appear"
   (6.3s) is impossible as authored — start-ride's own scene starts at 6.5s and has
   its own 1.0s blackout/reveal lead-in before the button appears at all.
7. Nathan's call: shorten the opening's wordmark/tagline hold instead of touching
   start-ride's internal choreography. Executed: `brandmark/opening/index.html`
   post-tagline hold cut 0.60s→0.30s, `data-duration` 6.5→6.2 (documented as v4 in
   that file's own history comment).
8. Cascade applied: every audio cue timed to a scene boundary shifted -0.3s in both
   rides-options JSON files (ride-start 10.3→10.0, second-ride 22.6→22.3, ranking
   restart 35→34.7, `e5` 24.3→24.0, opening piano out-point 10.5→10.2, option B's
   third loop segment resized 10.48→10.18 so it still lands exactly on the new
   restart point).
9. Result, honestly: button-appear moved 7.7s→7.4s, click 9.7s→9.4s — real progress,
   still short of the original 6.3s/8.7s targets. Reaching those needs a second,
   separate change to `start-ride/index.html`'s own blank-lead-in/reveal beat — a
   live decision, not yet made. See `OPEN-ITEMS.md`.

## Files referenced (not copied into this cycle folder — they live at their own working locations)

- `audio-studio/teaser/arrangements/arrangement_v1/IDEA-v1.md`
- `audio-studio/teaser/arrangements/arrangement_v1/FEEDBACK-v1.md` — full analysis,
  Nathan's inline comments, and every correction/append logged in place, in order
- `audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-A-piano-then-bed.json`
- `audio-studio/teaser/arrangements/arrangement_v1/rides-options/option-B-piano-plus-stems.json`
- `audio-studio/teaser/arrangements/arrangement_v1/rides-options/README.md`
- `silent-studio/brandmark/opening/index.html` (v4, 2026-09-25, per its own history comment)
- `silent-studio/start-ride/index.html` (read and measured; not yet edited — see `OPEN-ITEMS.md`)
- `silent-studio/brandmark/closing/index.html` (read and measured; already well-aligned as-is, not edited)

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| direct (no pipeline — sound-arrangement redesign + small mechanical GSAP timing edits, per the cycle-05 exception) | Sonnet (this chat) | — | `FEEDBACK-v1.md` analysis + corrections written; two rides-options A/B files built and cascade-shifted; `brandmark/opening/index.html` duration cut 6.5s→6.2s; nothing rendered yet (PC-only, see `OPEN-ITEMS.md`) |
