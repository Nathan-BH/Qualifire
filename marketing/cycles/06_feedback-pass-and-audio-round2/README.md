# Cycle 06 — gates-saving/ranking/closing feedback + audio round 2

Implements Nathan's 8-item feedback request from 2026-09-13:
1. `hyperframes/gates-saving/rounds/v4/FEEDBACK.md`
2. `hyperframes/ranking/rounds/v4/FEEDBACK.md`
3. `hyperframes/brandmark/closing/rounds/v2/FEEDBACK.md` (accompanies the named `closing_v2.mp4`)
4. `audio-studio/brandmark/opening/soundv1/FEEDBACK.md`
5. `audio-studio/start-ride/soundv1/FEEDBACK.md`
6. `audio-studio/gates-saving/soundv2/FEEDBACK.md`
7. `audio-studio/ranking/soundv1/FEEDBACK.md`
8. `audio-studio/brandmark/closing/soundv1/FEEDBACK.md`

## Implementation order (decided up front, to avoid one round overwriting another)

1. **hyperframes edits first** (gates-saving → ranking → closing), because two of
   the three audio rounds (ranking, closing) need to know the *new* visual timeline
   before their soundtrack can be written against it. Doing video first meant the
   audio work below could read the new `index.html` files directly instead of
   guessing at timing.
2. **gates-saving before ranking before closing** — no dependency between these
   three scenes, but gates-saving's fix (gate stroke-draw) was the most
   mechanically isolated (three `.gk` lines + one loop), so it went first as a
   lower-risk warm-up before ranking's structural change (new climb mechanic,
   duration 10.0s→10.8s) and closing's timing-only retime.
3. **audio-studio second, most-linked-first**: start-ride's soundv2 was written
   before gates-saving's soundv3, because gates-saving's feedback explicitly asks
   to reuse "the first ride"'s music, boosted — so start-ride's new C-G-Am-F loop
   had to exist before gates-saving could borrow it. Similarly, brandmark/opening's
   soundv2 (which invented the new two-beat `BRAND_STINGER`) was written before
   brandmark/closing's soundv2, which reuses that exact stinger in full.
4. Within audio, the three scenes whose picked video render is **unchanged**
   (opening, start-ride, gates-saving) got their new soundtrack muxed onto the
   existing render immediately. The two scenes whose video changed this same cycle
   (ranking, closing) got a wav built against the new (not-yet-rendered) timeline,
   with the mux deferred — see "Blocked" below.

No step in this order overwrote another round's work; every `soundvN`/`roundsN`
folder is additive, and `all-renders/` was only replaced with strictly newer
material.

## Model-tier pipeline

The three hyperframes edits went through the full pipeline (binding per
`CLAUDE.md`): Fable **Plan** (one dispatch, wrote three independent self-contained
briefs — gates-saving stroke-draw, ranking climb mechanic, closing tight reveal) →
three parallel Sonnet **Execute** dispatches (one per file) → fresh-context Fable
**Inspect**. Two of the three Execute dispatches stopped correctly on an anchor
mismatch (my own digest error in both cases, not a real ambiguity in Nathan's
files) and were corrected directly rather than re-run through another full round.
Inspect found one real defect (gates-saving's `.gk` opacity attribute dropped
entirely, which would have made GSAP's AttrPlugin animate from `"0"` instead of
`"0.6"→"1"`, causing a blink-out/fade-in instead of a smooth brighten) and one
sub-perceptual timing nit (ranking's two caption fade-outs overran their hard
`set()` by 0.1s) — both mechanical (<10 lines) and fixed directly by the
coordinator per the cycle-04 precedent, rather than spun into a second round.

All 5 audio-studio rounds were done as direct single-agent work (numpy/scipy
synthesis + ffmpeg mux, in one pass), per the cycle-05 precedent that this kind of
work doesn't need the Digest/Plan/Execute/Inspect split — there's no ambiguity to
delegate across agents when the same agent is doing the composing and the
rendering in one sitting.

| Tier | Model | Mandate | Tokens | Outcome |
|---|---|---|---|---|
| Plan | fable | Design gates-saving stroke-draw, ranking climb mechanic, closing tight reveal; write 3 self-contained execution briefs | not recoverable (session compacted before this table was written) | 3 briefs produced |
| Execute | sonnet ×3 | Implement each brief verbatim in its `index.html`, stop on anchor mismatch | not recoverable | gates-saving: stopped (digest anchor typo) → corrected directly; ranking: stopped (digest anchor typo) → corrected directly; closing: applied cleanly |
| Inspect | fable (fresh context) | Re-derive all arithmetic/timing independently, adversarially recheck for real defects | not recoverable | 1 real defect found (gates-saving opacity attr) + 1 minor timing nit (ranking caption fades) — both fixed directly; 1 non-issue flagged as a definition nuance, not a bug (ranking STEP_DOWN "off by 0.15s") |
| Direct execution | sonnet (this session) | All 5 audio-studio rounds: synthesis + mux, no subagent split (cycle-05 precedent) | not recoverable | 5 rounds shipped (3 fully muxed, 2 wav-only pending video renders) |

Exact token figures for the Plan/Execute/Inspect dispatches were not captured
before this conversation was compacted partway through the cycle; the table above
is honest about that gap rather than inventing numbers. Everything else in the
outcome column reflects what was actually produced and checked, not what an agent
merely reported.

## What shipped

**Video (`hyperframes/`)** — all committed to the PC:
- `gates-saving/index.html` — gate ticks redrawn as a white stroke-draw-on animation
  (was a colour pop-in) — `gates-saving/rounds/v5/FEEDBACK.md`
- `ranking/index.html` — new "Today climbs the tower" mechanic replacing the old
  lateral slide-in; duration 10.0s→10.8s — `ranking/rounds/v5/FEEDBACK.md`
- `brandmark/closing/index.html` — mark/wordmark/tagline now all on screen by
  0.75s (was a ~1.9s staggered reveal) — `brandmark/closing/rounds/v3/FEEDBACK.md`

**Audio (`audio-studio/`)** — all committed to the PC, plus `synth.py` gained
`sweep()`, `sub_hit()`, `droplet_run()` and the shared `BRAND_STINGER_LOW/HIGH`
constants:
- `brandmark/opening/soundv2` — ring-draw pitch sweep + swoosh, new two-beat
  BRAND_STINGER — muxed onto the existing `opening_v3.mp4`
- `start-ride/soundv2` — true silence before the button click, click on press,
  driving C-G-Am-F loop at 155bpm — muxed onto the existing `start-ride_v4.mp4`
- `gates-saving/soundv3` — whoosh on zoom-out, start-ride's chord loop reused and
  tempo-boosted 165→210bpm, migrated off its own inline synthesis copy onto the
  shared `synth.py` — muxed onto the existing `gates-saving_v4.mp4`
- `brandmark/closing/soundv2` — full two-beat BRAND_STINGER reusing opening's
  motif — **wav only**, not yet muxed (see Blocked)
- `ranking/soundv2` — new `droplet_run()` rising/accelerating crescendo synced to
  the new climb window — **wav only**, not yet muxed (see Blocked)

All 3 new "with sound" mp4s (opening, start-ride, gates-saving) are also copied
into `audio-studio/all-renders/`, replacing the previous sound version for each
of those three scenes.

`audio-studio/structure.md`'s folder map was updated to reflect all of the above.

## Update: everything finished, nothing left blocked

The section below described a real blocker mid-cycle (`device_bash` was
unreachable, so nothing here could render). Nathan rendered all three
compositions himself and built `teaser_v6.mp4` (47.6s, confirmed by ffprobe —
exactly matching the corrected estimate). Once that landed, the remaining work
was unblocked and finished in the same session:

- gates-saving's soundv3 audio was re-muxed onto the real `gates-saving_v5.mp4`.
- ranking's soundv2 (droplet crescendo) was muxed onto the real `ranking_v5.mp4`.
- brandmark/closing's soundv2 (full two-beat BRAND_STINGER) was muxed onto the
  real `closing_v3.mp4`.
- `audio-studio/teaser/soundv2` was built from scratch — a full rebuild of the
  teaser's independent composition retimed to 47.6s. Because `teaser_v6.mp4` is
  a literal concat of five complete, unmodified scene renders, every section's
  internal timing lines up exactly 1:1 with that scene's own standalone
  soundtrack, so this round echoes each scene's current motif (the brand
  stinger, the boosted ride, the droplet crescendo) at the exact right instant
  rather than just "in spirit." See `audio-studio/teaser/soundv2/FEEDBACK.md`.
- Both teaser masters now exist and are current: `hyperframes/teaser/rounds/v6/teaser_v6.mp4`
  (silent) and `audio-studio/all-renders/teaser_v6_with_sound_v2.mp4` (with audio) —
  this is the literal "update both teasers, with and without audio" ask, now done.

See `OPEN-ITEMS.md` for what's left (review + cleanup only — no more rendering
or building needed) and every judgment call flagged for Nathan's review.

<details>
<summary>Original blocker note (kept for history — no longer applies)</summary>

**"Update both teasers with and without audio" is not done yet**, and can't be
finished from here. Reason: `device_bash` (the shell this session normally uses
to run `render.ps1` on your PC) has been unreachable all session — the file
bridge (stage/commit) still works, so I could edit `index.html` files and write
audio directly to your PC, but nothing here can actually *render* a HyperFrames
composition to video.

Two of the three video edits above (ranking v5, closing v3) still need to be
rendered by you before the teasers can be rebuilt, and ranking/closing's new
soundtracks are written and ready but can't be muxed onto renders that don't
exist yet.

**What to do:**
1. Run `render.ps1` for the three new rounds (exact commands are in each round's
   `FEEDBACK.md`, e.g. `hyperframes/gates-saving/rounds/v5/FEEDBACK.md`):
   - `gates-saving` → v5
   - `ranking` → v5
   - `brandmark/closing` → v3
2. Once those land in `hyperframes/all-renders/` (or wherever your render step
   drops them), say so and I'll:
   - mux `audio-studio/ranking/soundv2/soundtrack_v2.wav` onto `ranking_v5.mp4`
   - mux `audio-studio/brandmark/closing/soundv2/soundtrack_v2.wav` onto `closing_v3.mp4`
   - drop both into `audio-studio/all-renders/`
   - rebuild both teaser masters (silent concat + audio concat) from the now-current
     5 scenes
3. gates-saving's audio (soundv3) is *already* correct for the v5 render too —
   its stroke-draw change doesn't touch timing, so no re-mux is needed beyond
   what's already in `all-renders/`.

</details>

See `OPEN-ITEMS.md` for the rest (cleanup you'll need to do by hand).
