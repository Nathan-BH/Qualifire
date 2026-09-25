# FEEDBACK-v1 — teaser arrangement, response to IDEA-v1.md

**Built:** 2026-09-25
**Responds to:** `IDEA-v1.md` (2026-09-24)
**Reference data used:** `arrangement_v1.json`/`.txt`, `tools/teaser-lanes/kit/manifest.json` +
`prep-report.txt`, `stemsplitter/tunetank-emotional-classical/chroma_output.txt` +
`chroma_stems.py` (piano note onsets `ON = [1.24, 3.70, 6.15, 8.60, 11.05]`, already
established there — not re-derived here), `WAVEFORM-NOTES.md` (first transient 1.262 s,
decrescendo from ~11.1 s), `ride/ride_tunetank.py` (`ATTACK = 1.26`, confirms the same
value independently), `silent-studio/teaser/rounds/v9/concat.txt` + `FEEDBACK.md` (scene
cuts: opening 0–6.5, start-ride 6.5–20.5, gates-saving 20.5–32.8, ranking 32.8–43.6,
closing 43.6–47.6).
**Not done:** actually listening to any of this, or opening the teaser composition source
to re-verify exact current frame times for the opening's five visual events — see
"Needs verification" below.

## Bottom line

The overall idea is sound and the numbers back it up better than you probably expected:
the piano stem's note onsets are locked in at roughly **1.24 / 3.70 / 6.15 / 8.60 / 11.05 s**
(steady ~2.45 s spacing) inside its own 15.05 s clip, and your three "move this later/earlier"
guesses for the opening (3.8 / 6.3 / 8.7) each land within 0.15 s of a real onset — so the
opening block just needs small nudges, not new analysis. The Rides section is the one that
needs a real rebuild (not a tweak of `arrangement_v1.json`'s existing clips), because "bed"
and the isolated stems currently overlap and would double the piano/drums. The Ranking +
Closing question ("what notes are left") turns out to already be answered by your own
choice to restart the piano at `at: 35` — see that section, it's a nice coincidence.

## Whole-teaser feeling (piano as the spine)

Feasible, and it's the right call given what's in the stems. `6stem_piano` carries only
13.9% of the original mix's energy but the isolation is clean (0 lag vs the bed, correlation
0.52 — meaning it really is a separable, distinct part, not bleed from other instruments).
Playing it continuously start-to-finish is a good spine to build everything else around.

One thing to flag before it becomes a habit: "the other components" in your notes (strings,
drums, bass) don't add up to the whole mix. The stem separation leaves two big leftover
buckets — `a-other` and `b-other` — that actually hold **more energy than any single
named instrument** (44.0% and 46.7% respectively, vs. 28.6% for strings, 13.9% piano,
11.2% drums, 2.9% bass). That "other" bucket is presumably pad/texture/reverb tail the
separation models couldn't cleanly attribute. If the Rides section ends up as literally
piano + strings + drums + bass with no "other" at all, it may sound thinner than the
original bed even at matching gains, simply because nearly half the original energy isn't
in any of those four lanes. Worth a quick A/B once it's built: if it feels thin, bring in
one of the `-other` stems at low gain as texture rather than assuming more strings/drums
gain will fix it.

Upon listening I agree that upon listening it feels lighter if we omit what is in the other bucket. So I would like to have two parallel versions; one where you it changes from piano only to full "bed"(or add the other track, is it the same ?) and then have a version with the parallel piano, drums, bass and strings

When I say two versions I do not mean file, but I just mean that in the teaser-lanes tool; both options should be playable by me, so cut and attach all tracks in sync so I can play with it myself in the tool

Overall we also have freedom to speed up/shorten anything in the render itself it helps line up with the audio so lets keep that in mind. We can serve the music in anyways we like. I am thinking about the closing for example, we can change it so it matches an end piano note.

(something small I just want an answer on: if in a future round I want to align the piano notes with the gates crossing, how feasbale would that be, how big of a changes to the render would it be + what changes exactly (faster/slower/different gates ?))

## Opening (0–10 s)

**Feasible, small nudges only.** The four onsets in the piano's own clip that fall inside
this window are:

| # | file time (= render time, since `b-piano`'s first clip is `at: 0`) | your target | delta |
|---|---|---|---|
| 1 | 1.24 s | (gate drawing — no target given, you say it's already synced) | — |
| 2 | 3.70 s | 3.800 s | +0.10 s |
| 3 | 6.15 s | 6.300 s | +0.15 s |
| 4 | 8.60 s | 8.700 s | +0.10 s |

Your three guesses are all slightly *after* the real onset, by 0.10–0.15 s each — close
enough that it'll likely read as synced either way, but if you want it tight, use 3.70 /
6.15 / 8.60 instead of 3.80 / 6.30 / 8.70. Note 5 (11.05 s) falls just past the 10 s block,
which is a clean place to hand off into the Rides section.

I based it on the first note landing with the gate drawing, and upon closer look I saw it was slightly offset after the note. So my idea was to repeat the pattern across for consistency + try to see if the effect still lands properly. so it is a design choice for now, but I am open to adapting it in the future if I prefer exact note landing after all.

**Needs verification before implementation:** I did not re-open the actual composition
(the canonical opening is `brandmark/opening`, separate from the retired `teaser/parts/
01-opening`) to confirm the *current* frame times of ring-draw / gate-draw / text-appear /
button-appear / click. I'm taking your read that gate-draw is already synced to note 1 at
face value. One thing worth double-checking when you (or whoever executes this) scrubs the
real composition: the scene cut from opening to start-ride sits at exactly 6.5 s, and your
target for "start button appear" (6.3 s) is *before* that cut. If the button-appear element
currently lives inside the start-ride scene rather than the tail of the opening scene, it
can't be moved earlier than 6.5 s without moving it into a different scene's render — worth
confirming which scene actually owns that element before setting the target to 6.15–6.3 s.

## Rides (10–33.5 s)

**Feasible, but this section needs a rebuild, not an edit of `arrangement_v1.json`'s
existing clips.** Right now that file plays the full "bed" (which already contains piano)
starting at 10.3 s while `b-piano` (isolated) also keeps sounding until 10.5 s — if both
your new "always-on piano" and a "bed" layer are active at once anywhere, the piano doubles.
The four points in your notes, in order:

**1) Looping the piano after ~15 s.** The math backs up your instinct that the tail needs
trimming, and gives it a number. The onsets are ~2.45 s apart; extrapolating past the last
real onset (11.05 s) puts a theoretical next note at 11.05 + 2.45 = **13.50 s**. For a loop
back to the start to land on that beat, the loop length needs to be `13.50 − 1.24 ≈ 12.25 s`
— i.e. trim/crossfade the loop point to around **12.2–12.3 s**, not the file's full 15.05 s.
Good news: that trim point falls inside the section that's *already decrescendo-ing*
(from ~11.1 s per `WAVEFORM-NOTES.md`), so a short crossfade there should be easy to hide —
much easier than looping the full-length clip, which would jump straight from near-silence
back to a loud attack. This number is arithmetic from documented onsets, not something
listened to — worth an ear-check on the actual loop once built.

**2) Strings/drums/bass instead of "bed" at ride start.** Technically sound, with one
correction to the plan: to get piano + strings + drums + bass all separately controllable,
you're mixing across the two stem-separation runs — `a-strings` (from the strings-model
split) alongside `b-drums`/`b-bass` (from the 6-stem split). The teaser-lanes tool's own
README says "unmute one split OR the bed, not both," but that's about not doubling the same
content twice — it's fine to pick different *instruments* from different splits, since
`prep-report.txt`'s alignment check confirms every stem is sample-locked to the same bed
clock (0-sample lag, `a-strings`/`b-piano`/`b-drums`/`b-other` all at k=0; `b-bass` at 12
samples = 0.27 ms, inaudible). Just don't also turn on the "bed" lane itself once you're
doing this — that's the double-piano/double-drums trap above. On "strings a bit quieter":
trivial, it's a gain-only change (currently everything sits at a uniform 0.45; drop strings
to roughly 0.30–0.35 relative to piano's 0.45 and re-listen).

**3) No gap between first and second ride.** Straightforward once (2) is rebuilt as
continuous piano + fadable strings/drums/bass, rather than two separate "bed" clips
crossfading into each other (which is what's actually driving today's gap/reset feeling).
Keep piano's gain constant through the whole ride window; automate the other three lanes'
gain down for the first ride's ending and back up for the second ride's start. No new
analysis needed here, it's an execution detail for whoever builds arrangement_v2.

**4) Syncing components to the piano's note peaks — yes, this makes sense, and the good
news is you get it for free.** Because every stem (piano, strings, drums, bass — from
either split) is sample-aligned to the *same* original bed clock (confirmed by the
alignment guard above, 0–12 samples of lag across the board), their natural relationship
to each other is already baked in. The only way to break it is to give different lanes
different start offsets. Practical rule for the brief: whichever `at` time you use for a
`b-piano` clip that starts fresh (in=0) or loops, use that *exact same* `at` time (and the
same in-point) for the `a-strings`/`b-drums`/`b-bass` clips playing alongside it. Don't
independently time-shift one lane relative to another.

**Untouched by your notes — worth a decision:** the `e5` gate-pulse chimes currently sound
at 24.3–32.8 s (inside the Rides window), unmuted, gain 1.0 — full volume relative to
everything else at 0.45. IDEA-v1 doesn't mention them. Given the new "piano never stops,
everything else breathes around it" plan, is E5 staying as-is, or should it duck along with
strings/drums/bass, or get folded into the same breathing automation?

Good question, I havent really updated the chimes yet, this will be done after I am happy with the current revision first. Overall I can already say they are too loud and should not overbear the other tracks, but that is a simple "gain" change for me in the tool so not a priority.

## Ranking + closing (33.5–47.6 s)

**Feasible, and there's a genuinely nice coincidence here worth knowing before you change
anything.** `arrangement_v1.json` already restarts `b-piano` fresh (`in: 0, at: 35`) rather
than continuing the loop into this section. Restarting there produces onsets at (35 + each
piano onset):

| onset (piano's own clock) | render time (at `at: 35`) |
|---|---|
| 1.24 s | 36.24 s |
| 3.70 s | 38.70 s |
| 6.15 s | 41.15 s |
| 8.60 s | **43.60 s** |
| 11.05 s | **46.05 s** |

43.60 s is *exactly* the ranking→closing scene cut (closing starts at 43.6 s, per
`silent-studio/teaser/rounds/v9/concat.txt`'s section timing), and it's also where the
older teaser AUDIO-BRIEF had a brand-stinger reprise planned. 46.05 s lands with 1.55 s of
ringing-decay left before the video ends at 47.6 s — a natural spot for the last
qualifier + slogan to land and ring out to black, which is exactly what you asked for
("check what notes are left"). Recommendation: **keep the piano restart at `at: 35`**
rather than changing it, and build your fade plan around those two landing points:
- Fade strings out and thin the texture through the ranking climb (32.8 → ~36 s), keeping
  drums + piano + bass, as you described.
- Drop drums (and bass) right around 43.60 s — the scene cut into closing — leaving piano
  alone for its 46.05 s note and its natural decay tail to the end.
- Target the final "Qualifire" wordmark/slogan reveal at 43.60 s (matching visual cut) and/or
  46.05 s (final musical statement) rather than a number picked independently of the piano.

## Answers to your open sections

- **Muted lines (which are "leave out" vs. "just muted while listening"):** not answered in
  IDEA-v1.md — still open. Given the plan above, `bed`/`a-other`/`b-other` in the current
  file are effectively superseded anyway (Rides gets rebuilt around isolated stems instead
  of "bed"), so this mostly matters for whatever v2 arrangement gets built next.
- **What sounded wrong/missing, next things to try:** left blank — nothing to respond to.

## Implementation plan

This is a sound-arrangement redesign, not a code change, so it doesn't need the model-tier
pipeline (Digest/Plan/Execute/Inspect) — it's the kind of direct edit-and-build work this
folder's own convention already uses for `soundvN` rounds. Suggested order for whoever
builds it:

1. **Opening:** in the actual teaser composition, nudge text/slogan-appear, button-appear,
   and click to 3.70 / 6.15 / 8.60 s (or your original 3.80/6.30/8.70 if 0.1–0.15 s of slack
   doesn't matter to you) — after confirming which scene currently owns the button-appear
   element (see "needs verification" above).
2. **Rides:** build a new `arrangement_v2` (or edit this one) with: `b-piano` looping on a
   ~12.25 s trim/crossfade from render 0 through the end of the Rides section; `a-strings` +
   `b-drums` + `b-bass` entering together at ride-start (not "bed"), all three sharing the
   same `at`/`in` offsets as the piano's current loop segment; a gain automation pass for
   the "first ride → second ride" breathing (fade other lanes down, piano flat); strings
   gain lowered relative to piano; a decision on what E5 does during this window.
3. **Ranking + closing:** keep piano's `at: 35` restart; fade strings out through the
   ranking climb; drop drums/bass at 43.60 s; land the final text reveal at 43.60 s and/or
   46.05 s.
4. Build a `soundv1` round from this, listen on the real render, and feed back per-beat in
   that round's `FEEDBACK.md` (per this folder's existing convention) — nothing above has
   actually been heard yet, only measured.

## Readout

| tier | model | tokens | outcome |
|---|---|---|---|
| direct (no pipeline — analysis/planning doc, not a code change) | Sonnet (this chat) | — | `FEEDBACK-v1.md` written; loop-trim (~12.25s) and closing note-landing (43.60/46.05s) findings are new; opening deltas confirm your existing guesses within 0.15s |

## Claude's response to your comments (2026-09-25)

**"is [bed] the same as [adding the other track]?" — no.** `bed` is the original single mixed
file — piano, strings, drums, bass and the leftover "other" texture all baked together,
un-splittable. The `-other` stems (`a-other`, `b-other`) are just the leftover bucket *alone*
(everything the separation model couldn't cleanly call strings/piano/drums/bass) — `b-other`
specifically has no piano/drums/bass in it, only whatever's left after those three are pulled
out. So "piano + strings + drums + bass + b-other" and "bed" would sound similar in *content*
(since together they add back up to roughly the whole mix) but very differently in *control*:
with `bed` you get one fader for everything; with the stems (including `-other` as texture)
you keep independent control of each. If option B still feels thin after you listen, adding
`b-other` at low gain alongside strings/drums/bass (instead of falling back to `bed`) keeps
that control while filling in the missing energy — worth trying before reaching for `bed`.

**Two playable versions — built.** See `rides-options/option-A-piano-then-bed.json` and
`rides-options/option-B-piano-plus-stems.json` (README in that folder). Both are full
0–47.6 s arrangements, identical outside the Rides window, so you can toggle between them in
teaser-lanes and hear just the Rides difference. Option A is close to today's
`arrangement_v1.json` minus the doubled piano; option B is the continuous-piano-plus-isolated-
stems plan with the 12.26 s loop trim and lowered strings gain already wired in. Neither has
been listened to on my end — built from the same numbers as the analysis above, not from
playing the tool.

**Render itself can flex (speed up/shorten to fit the audio) — noted, and it changes the
closing recommendation.** Everything above treated the video's cuts as fixed and moved audio
to match them; if the render can move instead, the closing is the obvious place to use that:
rather than landing the last piano note (46.05 s) 1.55 s before the fixed 47.6 s end, the
closing scene (currently 43.6–47.6 s, 4.0 s) could be trimmed or extended by ~1.5 s so the
video itself ends right on that note's decay instead of after it. That's a change to the
actual composition/render (`closing_v5.mp4`'s timing in the HyperFrames project), not just
the arrangement file — bigger than an audio-only tweak, and probably its own small brief once
you're happy with the arrangement side. Good to keep in mind for the opening too (e.g. if you
ever want the button-appear/click exactly on 6.15/8.60 s and that turns out to conflict with
the 6.5 s scene cut — see "needs verification" above — nudging the cut itself is now also an
option, not just the audio).

**Opening: offset-but-consistent is a fine design choice** — noted, no change needed unless
you change your mind later. Worth remembering exact-landing (3.70/6.15/8.60) is a one-line
change whenever you want to try it.

**E5 gate chimes:** left untouched in both option files (still gain 1.0, unmuted) per your
note that this isn't a priority yet. Agreed they read as too loud relative to everything else
sitting at 0.30–0.45 — a gain-only fix whenever you get to it.

**Aligning piano notes to gate crossings — feasibility, for a future round.** The current gate
crossing/chime times (from `tools/teaser-lanes/kit/prep-report.txt`'s E5 pulse schedule,
ride-clock `[17.8, 19.81, 21.65, 23.51, 25.38]` + the 6.5 s ride→teaser offset) land at
**teaser-clock 24.30 / 26.31 / 28.15 / 30.01 / 31.88 s** — roughly 1.85–2.0 s apart. The
piano's onsets are a fixed ~2.45 s apart. Those are two different "tempos," so today only one
gate lines up close to a piano note by chance (gate 3 at 28.15 s vs. a piano onset at 28.20 s
under option B's loop scheme — 0.05 s, essentially exact; the other four are 0.6–1.2 s off).
To get all of them to line up, the gate-to-gate pacing in `gates-saving`'s render would need
to change to match (or cleanly subdivide) the piano's 2.45 s step — feasible in principle,
since that pacing is already a parametrized easing curve (cycle 14 "surge pacing" → cycle 17
"inverted easing v9," not hand-keyframed per gate), so it's a matter of retuning that curve's
timing rather than re-animating from scratch. It would touch the gates-saving composition
itself (a real render change, not an arrangement-file change), and I'd want to open that
composition's actual timing source before scoping it precisely — happy to do that as a
follow-up once you're ready to greenlight it.

## Correction (2026-09-25, later same day)

I mis-summarized this in chat afterward, so correcting it here too: your comment on the
Opening section was about **which target numbers to keep** (3.800/6.300/8.700 s, for
pattern-consistency with note 1's own slight offset, rather than switching to the tighter
exact-onset values 3.70/6.15/8.60) — not a decision that no render change is needed. The
render was never actually touched. Per the original `IDEA-v1.md`, text+slogan-appear,
button-appear, and click are all still at their old (wrong) times. **This is still an open
implementation item:** move them to 3.800 / 6.300 / 8.700 s, with the same "needs
verification" caveat as before — confirm which scene currently owns the button-appear
element before setting its target to 6.3 s, since that's close to the 6.5 s opening→start-ride
cut.

## Open items, current state (2026-09-25)

- **Opening render change** — needed, not yet done: nudge text/slogan-appear, button-appear,
  click to 3.800 / 6.300 / 8.700 s in the actual composition (`brandmark/opening` /
  start-ride). Needs the scene-ownership check first.
- **Rides — your turn:** listen to `rides-options/option-A-piano-then-bed.json` vs.
  `option-B-piano-plus-stems.json` in teaser-lanes and say which direction (or what to
  adjust). Nothing else proceeds on Rides until this happens.
- **Closing trim (~1.5 s)** — optional, not started, only relevant if you want the video to
  end exactly on the piano's decay.
- **Gate-crossing retiming** — optional, bigger, not started, future-round candidate.
- **E5 gain** — acknowledged too loud, one-line fix, you said not a priority yet.

## Fix (2026-09-25, later)

`rides-options/option-A-piano-then-bed.json` was wrong as first built: it used the
monolithic `bed` file, when it should stay inside the same stem family as the piano
(`b-piano` + `b-drums` + `b-bass` + `b-other`, all B-split) for per-instrument control in
the tool. Corrected — see `rides-options/README.md`. Content is nearly identical either way
(the four B stems sum back to `bed` almost exactly), but option A now gives you the same
mute/solo granularity as option B, and directly contrasts with it: A includes `b-other`, B
doesn't.

## Rebalance (2026-09-25, later still)

Confirmed with Nathan: the reason option A needs to be built from separate B-stems rather
than `bed` is so piano's gain can stay high while the other instruments' gains come down
independently — giving piano more weight/presence, not just equal-footing with everything
else. Same principle as `IDEA-v1.md`'s "strings a bit quieter so they don't overbear the
piano" note, generalized to all three non-piano B-stems. `option-A-piano-then-bed.json`
rebalanced: piano stays at 0.45, `b-drums`/`b-bass`/`b-other` lowered to 0.30. Starting
point, not final — tune each independently in the tool from here.

## Render investigation (2026-09-25)

Went into the actual HyperFrames composition sources to execute the opening/closing render
changes. Two things changed the picture from the earlier "needs verification" note.

**Can't run the render myself.** `marketing/silent-studio/COMMANDS.md` is explicit:
`render.ps1`/`npx hyperframes render` needs npm registry access, which neither this cloud
session nor the local device shell has (confirmed: 403 from the proxy on
`registry.npmjs.org`). I can edit the composition source; the actual render pass has to run
in a real PowerShell window on your PC. **So: re-render is needed** (the visual timing is
baked into the rendered pixels, not adjustable after the fact) — you were right that no new
`.mp4` pieces need building from scratch, but the affected scenes (`brandmark/opening`,
maybe `start-ride`) do need to go through `render.ps1 -Render` again once their source is
edited, then the teaser concat + `prep_kit.py` re-run so the audio tool's kit matches.

**`brandmark/opening/index.html` (teaser 0–6.5 s) — done.** Found the actual elements:
- "ring drawing" = the ring stroke draw, 0–1.3 s. Silent, as you wanted — untouched.
- "gate drawing" is very likely the logo's `#slash` element, which fades in at 1.3 s — 0.06 s
  after note 1 (1.24 s), which matches your "already perfectly synced" read closely enough
  that I left it alone. Worth a glance to confirm that's the element you meant.
- Wordmark + tagline: **moved from 2.95/3.35 s to 3.80/4.20 s** (your confirmed target,
  keeping their original 0.40 s gap). Fits comfortably before the scene's own fade-to-black
  (starts 5.50 s) — done, ready to render.

**`start-ride/index.html` (teaser 6.5–20.5 s) — found a real conflict, need your call.**
The button isn't one number, it's a 4-part choreography: button fades in, a cursor glides
in from off-screen, arrives, presses the button, both fade out. Current times (after
accounting for the file's own `shiftChildren(1.0)` + the 6.5 s scene start): button appears
at **7.7 s**, cursor arrives and presses at **9.7 s**, everything's gone by **10.5 s**.

Two problems with the original target:
1. **6.300 s for "button appear" isn't reachable at all** — start-ride's scene doesn't even
   start until 6.5 s, and its first second is a 0.4 s blackout hold + 0.6 s reveal before
   anything can show. The earliest the button could plausibly start appearing is ~7.3–7.5 s.
2. Retiming just the press (to land near 8.60/8.70 s) breaks the choreography if I move it
   alone — the cursor wouldn't finish gliding in before the "press" happens. Moving it
   properly means compressing the whole beat (glide + dwell + press), and/or starting the
   whole thing earlier by shortening the opening scene's tail so start-ride begins sooner.

Didn't touch this file — wanted your read on which way to take it before editing something
I can't preview myself (no render access here). Options: (a) accept button-appear near where
it structurally can be (~7.3–7.5 s) and just compress the internal beat so the press lands
near 8.6–8.7 s; (b) shorten `brandmark/opening`'s tail hold (5.50–6.50 s) so start-ride
begins earlier and the whole beat shifts left "for free," at the cost of less hold time after
the wordmark; (c) leave button/click alone for now, revisit as its own small pass later.

**Closing — turns out no change needed.** Checked `brandmark/closing/index.html`: wordmark
already fades in at 43.75 s (0.15 s after the 43.60 s landing point, about the same slack as
the "gate drawing" one above), and the fade-to-black already runs 46.80→47.60 s, straddling
note 5's decay (46.05 s) rather than starting after it. My earlier suggestion to trim/extend
the closing by ~1.5 s was based on the arithmetic alone, before checking the real numbers —
retracting it; the existing composition already lands close to where the piano wants it.

**To render what's done so far**, from a PowerShell window on your PC:
```
cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
```
Copy the new `opening_v3...mp4` (name it `opening_v4.mp4` next, per this folder's own
versioning) into `all-renders/`, update `teaser/rounds/v9/concat.txt` (or cut a v10), and
`tools/teaser-lanes/prep_kit.py` needs a re-run afterward so the audio tool's kit matches the
new picture.

## Opening shortened, cascade applied (2026-09-25, later still)

Your call on the button-timing question: shorten the wordmark/tagline hold rather than touch
start-ride's own choreography. Done:

- `brandmark/opening/index.html`: post-tagline hold cut from 0.60 s to 0.30 s (hold now
  4.90-5.20 s, fade 5.20-6.00 s, black pad to 6.20 s). **Total scene duration: 6.5 s -> 6.2 s.**
- That shortening moves every later scene's absolute start 0.3 s earlier, and with it every
  audio cue that was locked to a specific visual moment in one of those scenes (confirmed for
  the ride-start cue — it's timed to start-ride's own camera push-in, not an arbitrary number).
  Shifted -0.3 s in `rides-options/option-A-piano-then-bed.json` and
  `option-B-piano-plus-stems.json`: ride-start entry 10.3 -> 10.0, second-ride clip
  22.6 -> 22.3, E5 gate chimes 24.3 -> 24.0, ranking/closing piano restart 35 -> 34.7 (option B's
  loop segment 3 shortened to end exactly on that new restart point, same as before). The
  opening piano clip's own out-point moved 10.5 -> 10.2 to keep its 0.2 s overlap with the
  now-earlier ride-start entry. **Didn't touch `arrangement_v1.json`** (the original) or its
  `.txt` — those are already-superseded reference copies and now describe the *old* timing.

**Honest result on button/click:** this pulls the whole start-ride beat left by 0.3 s without
touching its internal choreography, per your call — button-appear moves from 7.7 s to **7.4 s**,
click from 9.7 s to **9.4 s**. That's real progress but doesn't reach the original 6.3/8.7
targets — those needed touching start-ride's own internal spacing (option (a) from the earlier
question), which we're not doing right now. If 7.4/9.4 still reads as "too late" once you've
seen the render, that's the reason, and (a) is still on the table as a follow-up.

**What's left before any of this is real:**
1. Render the updated `brandmark/opening` from a PowerShell window on your PC:
   ```
   cd "C:\Users\natha\Claude personal projects\Qualifire\marketing\silent-studio"
   powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark\opening -Render
   ```
2. Copy the new render into `marketing\silent-studio\all-renders\` (next free `opening_vN`),
   update `teaser\rounds\v9\concat.txt` (or cut a v10) to use it, and re-concat the full teaser.
3. Re-run `tools\teaser-lanes\prep_kit.py` so the audio tool's `kit\` matches the new,
   0.3 s-shorter video — the two option files above assume that new kit; opened against
   today's still-47.6 s kit they'll look 0.3 s off everywhere past the opening.

Didn't do any of this myself — the render step needs npm, which isn't reachable from either
sandbox (see "Render investigation" above).
