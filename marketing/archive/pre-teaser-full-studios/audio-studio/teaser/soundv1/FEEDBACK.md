# teaser — soundv1

**Render:** teaser_v5_with_sound_v1.mp4 — the picked render with this round's
soundtrack muxed on.
**Also here:** `soundtrack_v1.wav` — the soundtrack alone.
**Script that made it:** `soundtrack.py` (canonical, see `../structure.md`; draws
on the shared `../synth.py` toolkit).
**Source video:** `../all-renders/teaser_v5.mp4` (46.9s, 1920x1080, no audio)
**Built:** 2026-09-11
**Previous round:** none — first pass.

## What this is

Built as an **independent composition**, not a concatenation of the other
scenes' soundtracks — per your steer that the teaser should have its own
standalone take, same as everything else. It reuses the shared brand chime and
tier chimes from `../synth.py` so it feels like the same sonic world as the
individual scenes, just paced for its own cut, under one continuous chord arc
rather than five stitched-together stings.

Scene order confirmed by extracting frames at 2fps and reading them through the
whole clip:

| Time | Scene | What's on screen |
|---|---|---|
| 0-6s | opening brand | "QUALIFIRE" wordmark, then full mark + tagline |
| 6-24s | start-ride | map holds, then a plain route starts drawing |
| 24-32s | gates-saving | the route reappears fully coloured (yellow→green→purple) |
| 32-34s | (hold) | finished coloured route |
| 34-40s | ranking | "LAST TEN RIDES" card, "Today" lights up purple, caption |
| 40-46.9s | closing brand | full-bright mark, tagline holds |

One thing worth flagging: **`colours_v2.mp4`'s bar-chart scene does not appear in
this teaser cut at all.** The "colours" idea (yellow/green/purple tiers) is
expressed here through the gates-saving route re-colouring itself, not through a
separate bar-chart moment. So this soundtrack's 24-32s section borrows
gates-saving's chord-per-tier idea rather than colours'.

## Known limitation
Pure numpy/scipy synthesis, no real instrument samples — see `../APPROACH.md`.

## What to listen for
- Whether the piece reads as one continuous build across 46.9s or as five
  separate moods bolted together — this was the main risk of doing an
  "independent" composition instead of a literal concat.
- Whether the brand chime bookends (0-6s, 40-46.9s) feel like the same idea
  despite ~35s apart — no other scene's audio references them in between.
- Whether the gates-saving section (24-32s) needs slower pacing given it's
  compressed to 8s here vs. gates-saving's own 12.3s for the same idea.
- The scene-timing table above is estimated from frame sampling, not frame-exact
  cut points — flag anything that sounds off-beat and it's likely a timing miss,
  not an intentional choice.

## Nathan's feedback
<!-- write notes below -->
