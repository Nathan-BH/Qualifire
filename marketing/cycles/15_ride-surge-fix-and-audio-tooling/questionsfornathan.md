# Questions for Nathan — cycle 15

Each has the default the brief / doc already assumes, so nothing is blocked on an
answer; an answer changes one number or which path becomes the next cycle. Write your
answer inline under the question (as in cycle 14); the coordinator adds a resolution
line under it.

## Q1 — The start line and the finish line: slow like the gates, or fast?

Your sentence fixes the gates ("speed up in between gates and slow down at the gates")
but not the two ends of the ride. Two readings:

- **(b) — the brief's default:** the start line and finish line are E5 pulses too, so
  they get the same rule as the gates: the rider rolls out of the start slowly (0.050
  route/s), surges to ~0.20 mid-leg, brakes for gate 1, … , surges after gate 3 and
  arrives at the finish slowly (0.054). Gentle both ends, one rule for all five pulses.
- **(a) — the literal mirror of v8's end legs:** one ramp per end leg, which forces a
  *fast* start (the rider appears on the start line already at 0.197 route/s) and a
  sprint finish (0.214 route/s at the line, then the freeze at 11.38 s). Reads as "flying
  start, sprint finish"; the stop at the finish is a jolt.

*Reasoning:* v8 already treated the ends as nodes and you did not object to its gentle
roll-out / arrival; (a) reintroduces the kind of jump cycles 13–14 removed. If you want
a sprint finish only (slow start, fast finish), that is a two-line variant — say so.

**Coordinator resolution (provisional):** (b), as written in
`BRIEF-gates-surge-inversion.md` §2.

## Q2 — How pronounced should the dip be?

The brief uses `DIP_A = 0.6`: speed at the gates is 0.4× the local mean and mid-leg
~1.6× — the exact mirror of v8's envelope (v8: 1.6× at gates, ~0.44× between), so the
only thing that changes on screen is *where* the fast and slow moments are, not how
strong they are. If v8 already felt too jerky or too tame, this is one number:

| `DIP_A` | at the gates (route/s) | mid-leg | ratio |
|---|---|---|---|
| 0.5 (milder) | ~0.062 | ~0.205 | 3.3 |
| **0.6 (default)** | **~0.050** | **~0.219** | **4.4** |
| 0.7 (stronger) | ~0.037 | ~0.232 | 6.2 |

No value below 1.0 can stall the rider (the brief's §2 shows why).

**Coordinator resolution (provisional):** 0.6 — judge it on the v9 render first.

## Q3 — Which soundtrack path, and does the Interstellar melody stay?

`SOUNDTRACK-RICHNESS-OPTIONS.md` §8 lays out four paths. In one line each:

- **A** — Claude hand-arranges (pad, arpeggio, countermelody, light percussion, reverb)
  with free CC0 orchestral samples through the existing sampler. €0, no installs,
  "good MIDI mockup" ceiling.
- **B** — an AI service makes the bed by script (ElevenLabs Music first choice, Stable
  Audio second), we keep our own gate layer on top and re-time the gates to its beat.
  ~$5–25 to experiment, "real production" sound, needs one network test from Claude's
  shell on your PC.
- **C** — you make the song in Suno Studio and export stems + MIDI; we assemble.
  $8–24 / month, best-sounding, but every change is your manual step.
- **D** — you install Stable Audio 3 Small locally; Claude scripts it. €0, an evening
  of installing, small-model quality.

**Q3a:** which one (or "B, fall back to A")?

**Q3b:** the current melody is a transcription of Hans Zimmer's *Interstellar* theme.
For a public-facing Qualifire video that is a sync-licence question (and a Content ID
one). Do you want to keep it (private / proof-of-concept use), or should the next cycle
write an *original* line in the same mood — which B/C/D do naturally and A can do too?

*Reasoning:* the doc's suggested default is B for the bed with an original gate line,
A as the zero-cost fallback. The "one extra instrument at the gates" layer is ours in
every path, so nothing you answer here changes the structure you said works.

**Coordinator resolution (provisional):** none — this one is genuinely yours; nothing is
built until you answer. Part 1 (the animation fix) does not depend on it.

## Q4 — The second note lands 0.11 s before the tagline. Leave it, nudge it, or move the tagline?

Your sound's two notes are 0.291 s apart; the animation puts the tagline 0.40 s after
the wordmark, in both opening and closing. The brief syncs the **first** note exactly on
the wordmark (the loud attack, the thing anyone hears), so the second, softer note
arrives at 3.241 s / 0.441 s — **109 ms before** the tagline starts fading in (3.35 /
0.55). Three ways to deal with it:

- **(a) — the brief's default:** leave it. Hit 1 exact; hit 2 early by 0.109 s against
  a soft 0.7 s fade. Zero changes to the video.
- **(b) — split the difference:** start the sound 40 ms later. Hit 1 is then 40 ms
  *late* (audio lagging video is far less noticeable than leading — you don't notice
  lag until ~125 ms, lead from ~45 ms), hit 2 is 69 ms early. One number in each
  `soundtrack.py` (`WORDMARK_T - HIT1 + 0.040`).
- **(c) — make the animation fit the sound:** move the tagline tween from +0.40 s to
  +0.291 s after the wordmark (3.241 / 0.441) in both `index.html`s. Both notes exact,
  but both videos must be re-rendered (`opening_v4`, `closing_v5`) and re-muxed.

*Reasoning:* the second note is a subtle chime 13 dB down, riding on the first note's
tail — it reads as one gesture, not two separate events, so (a) is the safe default
and (c) is only worth it if the tagline visibly "arrives after its sound".

**Coordinator resolution (provisional):** (a). Judge it on the soundv3 renders.

## Q5 — Keep the soft pad under your sound, or let the sting stand bare?

Both scenes keep the sustained pad that soundv2 put under the second beat (opening:
C3/G3 from 3.35 s, about 18 dB below the sample's peak; closing: C3/G3/C4 from 0.35 s,
ringing through the hold to the fade). It is quiet and it fills the hold after the
sample's ~2.2 s tail dies, but it is also the one synthesised thing still sounding
during your sample. Dropping it is one line per file.

Same question, smaller: opening's three trailing plucks from 5.0 s (unchanged since
soundv1) — keep, or silence after the sample?

**Coordinator resolution (provisional):** keep both, unchanged — one change at a time;
the sample is the only thing this round changes.
