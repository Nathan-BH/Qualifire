# Cycle 15 — invert the gate surge; research a richer soundtrack; the real logo-reveal sound on brandmark

**CLOSED / not run — cancelled by Nathan 2026-09-23 ("cycle015 will not be run; it is closed"); see
`../16_ride-tunetank-soundtrack/README.md` §B for what this means for opening, closing and `synth.py`.
Nothing in this folder was ever executed; it is kept as history.**

**Status (2026-09-23, Plan pass): parts 1 and 3 are finished briefs, ready to execute —
nothing executed yet; part 2 is a closed research deliverable, no execution pending.**

**Update (2026-09-23): Nathan has no plan to execute this cycle's brief for now.**
Nothing in this cycle (`BRIEF-gates-surge-inversion.md`, `BRIEF-brandmark-logo-reveal-sfx.md`,
`SOUNDTRACK-RICHNESS-OPTIONS.md`) is being executed. The ideas stay written in this folder
in case he wants to act on them later.
Nathan watched `ride/soundv1` (`gates-saving_v8.mp4` + `ride_master_v1.wav` / `ride_v1.mp4`)
and left two points in `marketing/audio-studio/ride/soundv1/FEEDBACK.md`, then asked in
chat to "have a look at [the feedback] and make a plan to implement it already in a new
cycle". Later the same day he added a third, unrelated item: a real sound effect he wants
used verbatim on the brandmark text reveal, to be briefed in this cycle. No `index.html`,
no `.py`, no WAV has been touched in this pass.

## What this cycle covers

| # | Nathan's point | Answer / file | Status |
|---|---|---|---|
| 1 | "The ride animation is wired incorrectly … speed up in between gates and slow down at the gates. Whil the current animation is slow between gates and then speeds up at the gates." | Confirmed: cycle 14 read idea 6 as *peak at the gate* — v8 runs 0.041 → 0.208 (gate 1) → 0.060 → 0.216 (gate 2) → 0.054 → 0.215 (gate 3) → 0.053 route/s. **`BRIEF-gates-surge-inversion.md`** mirrors the shape: a dip at all five E5 pulses (0.050 / 0.052 / 0.054 / 0.054 / 0.054) and a crest mid-leg (0.198 / 0.219 / 0.215 / 0.214), same speed envelope as v8, same eight-ramp half-cosine machinery, `GATES` / `PULSE_T` / `GATE_T` / `RIDE_T0` / `RIDE_DUR` byte-identical so every crossing time and all audio stay valid. One anchored edit (lines 219–246), node-verified pass criteria, round v9 docs. | **Ready to execute** (Sonnet Execute, then Opus Inspect). Nathan then re-renders `gates-saving_v9.mp4`. |
| 2 | "simple piano notes just dont fit … I need a more complex soundtrack which sounds more like a song, and then for the gates … one extra instrument … worth looking for an extension, or GitHub repo, or tool/skills" | **`SOUNDTRACK-RICHNESS-OPTIONS.md`** — what "a song" means technically, the one hard constraint (gates are pinned to note onsets, so a new bed means one `PULSE_T` re-derivation), a licensing flag (the melody is Zimmer's *Interstellar*), and four realistic paths with effort / quality / risk / cost: A hand-arrange with CC0 VSCO instruments (€0, no installs), B ElevenLabs Music / Stable Audio API bed by script (~$5–25), C Suno Studio by Nathan with stems + MIDI export ($8–24 / mo), D local open-weight Stable Audio 3 Small (€0, install risk). Skills and MCP registry checked: nothing does composition. The "extra instrument at the gates" layer is ours and composes with every path. | **Closed** — analysis only; Nathan picks (Q3). |
| 3 | "the exact sound... a simple 2 notes sound which fits perfectly with the two step animation of the qualifire text + slogan... the same exact sound should also be used for closing as it is the same animation" (his `universfield-logo-reveal-199582.mp3`, now `audio-studio/brandmark/sfx/logo-reveal.mp3`) | **`BRIEF-brandmark-logo-reveal-sfx.md`** — measured the file on his PC (stereo, 3.109 s; hit 1 attack at 0.194 s, hit 2 at 0.485 s, gap 0.291 s, tail to 2.37 s — both notes inside the first second as he thought); places it verbatim, dry and in stereo, in **both** `brandmark/opening` and `brandmark/closing` with hit 1 sample-exact on the wordmark tween (2.95 s / 0.15 s) — hit 2 then lands 0.109 s before the tagline in both (the file's gap is 0.291 s, the animation's 0.40 s); closing starts the file at −0.044 s by skipping its digital-zero head; gain 2.2 (−2.1 dBFS peak, master under −1 dBFS); the synth `sub_hit`+`chime` pair goes, every other layer stays byte-identical; one shared `brandmark/logo_reveal.py` so the two scenes cannot differ. Also unblocks building any `soundtrack.py` on Nathan's PC: `synth.py`'s reverb gets a pure-numpy fallback (bit-identical to scipy's `lfilter`, verified) because that shell has no scipy. Anchored edits in 3 files + 1 new module, build/mux commands, a numeric check with pass values computed on his PC, round docs (`soundv3/` for both). | **Ready to execute** (Sonnet Execute on Nathan's PC via `device_bash`, then Opus Inspect). Independent of items 1–2. |
| — | Open judgment calls with provisional defaults | `questionsfornathan.md` (Q1 end-of-ride shape, Q2 dip strength, Q3 tooling path + the Interstellar question, Q4 hit-2 timing on the tagline, Q5 keep the pad under the sample) | awaiting Nathan, not blocking |
| — | Nathan-PC commands | none yet — `OPEN-ITEMS.md` is added once part 1 executes (render + frame checks + mux + `all-renders/` housekeeping, in the cycle-06 shape). Item 3 needs none: its executor builds, muxes and swaps `all-renders/` on his PC itself | pending execution |

## Implementation order

1. **Execute `BRIEF-gates-surge-inversion.md`** (Sonnet, stop-on-ambiguity; one file,
   one edit, two round docs). Inspect (fresh Opus) reruns §6 itself.
2. Coordinator writes `OPEN-ITEMS.md` (render block from the brief's §8; the mux and
   `ride_v2.mp4` as Claude follow-ups; the two `all-renders/` cleanups; the pointer line
   in `audio-studio/ride/soundv1/FEEDBACK.md` saying point 1 → cycle 15, point 2 →
   `SOUNDTRACK-RICHNESS-OPTIONS.md`).
3. Nathan renders v9, watches it with the existing `soundv9` audio, and answers Q1–Q3.
4. Part 2 becomes real briefs in the next cycle, on whichever path he picks.
5. **Execute `BRIEF-brandmark-logo-reveal-sfx.md`** (Sonnet, on Nathan's PC through
   `device_bash`; stop-on-ambiguity). **No dependency on 1–4** — different compositions,
   different files (it touches `audio-studio/synth.py`, which item 1 does not, and item
   1 touches `silent-studio/gates-saving/index.html`, which it does not); it can run
   before, between or after them, including before Nathan renders v9. Inspect (fresh
   Opus) reruns its §6 itself. Nothing for Nathan to render: both silent sources already
   exist (`opening_v3.mp4`, `closing_v4.mp4`), so the executor builds, muxes and swaps
   `all-renders/` in one pass; Nathan then only watches and answers Q4/Q5.

**Not in this cycle:** any *ride* audio change (the existing master lines up with the new
render as-is); the teaser (its bookends still use the synthesised brand chime — whether
they should switch to the real sample too is a question for when the teaser is next
touched); the ~28 ms Salamander lead (still Nathan's call, unchanged by the inversion and
less visible under it); `colours`; either brandmark `index.html` (the 0.40 s tagline
offset stays — Q4).

## Rulings made in this cycle

1. **The fix is animation-only.** The five crossing times come from where the E5s
   actually sound (`ride_master.py` `E5_CONTENT`), so `PULSE_T`/`GATE_T`/`RIDE_T0`/
   `RIDE_DUR`/`GATES` do not move; only `RIDE_PROFILE`'s shape does.
2. **Dip at every pulse, crest at every mid-leg — the start and finish included.** The
   literal one-ramp mirror of v8's end legs would make the rider appear at 0.197 route/s
   and stop dead from 0.214 at the finish; treating all five pulses alike gives a gentle
   roll-out (0.050) and arrival (0.054). Provisional — Q1.
3. **`DIP_A = 0.6` in the `(1 − A)` form**, because it reproduces v8's speed envelope
   exactly (min 0.050 vs 0.041, max 0.219 vs 0.216) with the moments swapped — one
   change at a time. Provisional — Q2.
4. **Point 2 is a document, not a build.** An analysis-only ask ends in a written
   deliverable on the Plan tier — no Execute tier, no second Inspect.
5. **The logo-reveal sample replaces the synth stinger and is placed dry, in stereo,
   hit 1 sample-exact on the wordmark.** Not layered under the synth (he asked for "the
   exact sound"), not through `finish()` (its low-pass + reverb would colour it), not
   folded to mono (the file is real stereo; a fold-down loses 3.9 dB and its width).
   Hit 1 is the loud attack against the first thing on screen, so it gets the exact
   alignment; hit 2 (13 dB softer, on hit 1's tail) lands 0.109 s early against a soft
   0.7 s fade. Provisional — Q4.
6. **Closing's −0.044 s start skips the file's head rather than clamping to 0.** The
   skipped 0.044 s are digital zeros (first non-zero sample at 0.144 s), so the sample is
   still verbatim; clamping would put hit 1 44 ms (1.3 frames) late.
7. **Every other layer in both beds stays byte-identical** (ring-draw sweep, swoosh,
   pads, plucks) — one change at a time; the bare-sting variant is a one-line removal
   (Q5).
8. **Fix the tooling at the root, minimally.** Nathan's PC shell has no scipy, so
   `synth.reverb()` could not run there; a guarded pure-numpy `comb`/`allpass` fallback
   (verified bit-identical to `lfilter` in the cloud sandbox, and faster) makes every
   scene's `soundtrack.py` buildable on his machine. The scipy path stays for shells that
   have it.

## Model-tier readout (this pass)

| Tier | Model | Tokens (approx) | Outcome |
|---|---|---|---|
| Digest | Haiku | (coordinator's figure) | ran before this pass: `index.html` lines 219–323, `ride_master.py`, the audio-studio tree — the facts this pass built on |
| Plan | Fable (claude-fable-5-1) | ~55k in context, ~15k written | 4 files written; inverted profile designed and node-verified on Nathan's PC (0 non-increasing samples over 100 001 points, every pulse exact); 9 web fetches/searches + skills list + MCP registry for the tooling doc |
| Plan (item 3) | Fable (claude-fable-5-1) | ~110k in context, ~14k written | `BRIEF-brandmark-logo-reveal-sfx.md` + this README + Q4/Q5; the mp3 measured on Nathan's PC (onsets, stereo, head/tail); the whole design dry-run there from a scratch mirror of the post-edit files (both WAVs built, both muxes probed, the §6 check passing with the numbers now in the brief); the reverb fallback proven bit-identical to scipy in the cloud sandbox; every anchor re-applied to fresh copies of the on-disk files and confirmed identical to the mirror. ~30 tool calls. |
| Execute | Sonnet | — | not yet dispatched |
| Inspect | Opus | — | not yet dispatched |

Checkable artifacts of this pass: the five files in this folder; the node output in the
surge brief's §6.1 (reproducible from the brief's own code on any node ≥ 18); the numbers
in the brandmark brief's §1.1, §2.7 and §6.1 (reproducible on Nathan's PC from the brief's
own code — the executor's run must reproduce §6.1 to the digit).
