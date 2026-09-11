# gates-saving — soundv2

**Render:** gates-saving_v4_with_sound_v2.mp4 — the same picked render with this
round's soundtrack muxed on.
**Also here:** `soundtrack_v2.wav` — the soundtrack alone.
**Script that made it:** `../soundtrack.py` (canonical — this round's logic is what's
currently there; future rounds will edit it in place, see `../../structure.md`).
**Source video:** ../../all-renders/gates-saving_v4.mp4 (12.3s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** ../soundv1/FEEDBACK.md

## What this is

soundv1 was isolated cues over a pulse. This is an actual short piece of music: a real
chord progression mapped to the same visual beats, plus a melodic figure instead of a
mechanical click.

**Key: C major.** Chord map:

| Time | Chord | Visual beat | Feel |
|---|---|---|---|
| 0.0–5.0s | Cmaj9 | static route, "Save your route as reference" | calm, at rest |
| 5.0–7.3s | Am7 | dot starts moving | quiet lift |
| 7.3–9.3s | Fmaj7 | green trail extends | build |
| 9.3–11.7s | Gadd9 | purple / personal-best segment | brightest, most open |
| 11.7–12.3s | resolves to Cmaj | clip ends | settled |

**Melody:** a plucked-string arpeggio (Karplus-Strong synthesis — a noise burst fed into
a decaying delay loop tuned to the note, the classic algorithm behind music-box/kalimba
tones) plays each chord's notes in a pattern, speeding up 100→112→124bpm as the runner
moves, replacing soundv1's flat pulse with actual melodic motion. A very quiet sub
"heartbeat" pulse sits underneath, felt more than heard.

**Event chimes** (save / green ping / purple level-up / final resolve) are kept from
soundv1 but re-tuned to sit inside whichever chord is playing at that moment, so they
don't clash.

**Glue:** the whole mix goes through a small hand-built Schroeder reverb (parallel comb
filters + allpass filters) and a cheap low-pass smoothing pass, which is most of what
makes this sound "produced" rather than "synthesized."

## Known limitation

Everything here is pure numpy/scipy synthesis — no real instrument samples. Wanted to
try `fluidsynth` + a soundfont (already sitting on the sandbox at
`/usr/share/sounds/sf2/default-GM.sf2`) for actual piano/string timbres, but both `pip`
and `apt` are currently blocked from installing anything new in Claude's sandbox
(unrelated to audio — a sandbox network policy thing right now). See `../../APPROACH.md`
for the full picture; worth revisiting if that opens back up.

## What to listen for
- Whether the chord progression actually reads as "soft music" now, or still feels
  synthetic — and if so, where (the pad tone? the pluck tone? the reverb amount?).
- Tone character: pad and pluck are both plain sine-based (two detuned oscillators).
  Candidates to try next if it still feels thin: more harmonics per note, a softer
  "electric piano"-style FM tone, or (once package installs work again) a real
  soundfont via fluidsynth.
- Arpeggio pattern (0,1,2,3,2,1 through the chord tones) — repetitive by design for a
  12s clip; flag if it should vary more.
- Reverb wetness (currently 0.22) — more/less space.
- Whether the event chimes (save/green/purple/resolve) still land right now that
  they're tuned into the chord instead of standing alone.

## Nathan's feedback
<!-- write notes below -->
