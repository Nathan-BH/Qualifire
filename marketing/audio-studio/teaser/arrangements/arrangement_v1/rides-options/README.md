# Rides-section options (2026-09-25, option A corrected same day)

Two playable arrangement files, both answering your "two parallel versions" request in
`FEEDBACK-v1.md`. Both are full arrangements (opening through closing), identical except for
what happens in the Rides window (10.3-35 s) — everything before and after that window
(opening piano, the 35 s ranking/closing piano restart) is the same in both, so you can A/B
just the Rides idea without other differences muddying the comparison.

**How to use:** open `tools/teaser-lanes/teaser-lanes.html`, load the kit, then **Open
arrangement** and pick one of these two `.json` files (or drop it on the page). Switch
between them the same way to compare.

## option-A-piano-then-bed.json

Reconstructs the full sound from the B-split stems only — `b-piano` + `b-drums` + `b-bass` +
`b-other` — instead of the monolithic `bed` file (corrected 2026-09-25: the first version of
this file used `bed` directly, which works content-wise but hides everything behind one
fader; using the four B stems stays in the same stem family as the piano and gives you
per-instrument mute/solo in the tool). All four share the same clip timing (10.3 s and
22.6 s, mirroring `arrangement_v1.json`'s original `bed` clip shape) so they stay mutually in
sync. Rebalanced 2026-09-25: piano stays at 0.45 (the reference level used elsewhere in this
arrangement), drums/bass/other lowered to 0.30 so piano reads as the backbone instead of sitting
flat with everything else — same logic as your "strings a bit quieter so they don't overbear the
piano" note in `IDEA-v1.md`, applied to all three non-piano B-stems. Starting point only, tune
each independently in the tool. This is the "does it need the other bucket" test case — it
includes `b-other`.

## option-B-piano-plus-stems.json

Piano never stops — looped on a 12.26 s trim (see `../FEEDBACK-v1.md` for the arithmetic
behind that number) across the whole rides window, with isolated `a-strings` / `b-drums` /
`b-bass` entering at ride-start instead of the full B-stem reconstruction. No `-other` stem
at all — this is the other half of the A/B: does it feel thinner without that texture?
Strings gain is already lowered to 0.30 (vs. piano/drums/bass at 0.45) per your note that
they shouldn't overbear the piano. First pass, not fully polished automation — the two
clip-pairs (10.3 s and 22.6 s) give you the same "first ride / second ride" structure to fade
against, but the breathing-room automation between them is still yours to dial in by ear.

Both leave `e5` (gate chimes) untouched at gain 1.0, since you said that's not a priority yet.

Neither has been listened to — these are built from the same documented numbers as
`FEEDBACK-v1.md`, not from playing the tool.
