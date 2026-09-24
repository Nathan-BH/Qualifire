# Cycle 19 — teaser sound-lanes tool: Nathan's requirements (2026-09-24, verbatim where quoted)

Context: the cycle-17 av-align restyle (Resolve-style, `marketing/audio-studio/tools/av-align/av-align.html`)
was judged "way too cluttered and unclear on how to use it and what is where". Nathan is not a video
editor and wants something that works for him, not what editors typically use. Decision: REBUILD as a
new tool (av-align stays on disk untouched, as reference).

## What he wants (his words)

1. "a top big panel with the video playing. And then below the sound channels which are always
   synced to the video, so moving forward or back keeps the two together."
2. Sounds split into tracks ("stems"): `marketing/audio-studio/stemsplitter/tunetank-emotional-classical/sources/`.
3. "with the visual individual waveforms i can see what parts exactly line up with what visual
   identity in the render."
4. Load the FULL TEASER (`marketing/silent-studio/all-renders/teaser_v9.mp4`, 47.6 s, silent) — today only two
   parts have sound (opening 0-6.5 s; the ride 6.5-32.8 s = start-ride + gates-saving), the rest is silent;
   goal: "add sound a bit everywhere until i am satisfied".
5. "lets do it" (rebuild). "It would be great if you can just load everything in the tool, and i can
   mute it myself to avoid cacophony but just have it all present."
6. "the tool plays live with the mute settings but does not produce any audio yet before saving. I would
   also not necessarily save a lot (maybe later) for now i want to be able to tell you what to put where
   precisely."
7. KEY REQUIREMENT — two clocks: "the video render has a running clock, but each track also has an
   internal clock; imagine i want to repeat the strings part somewhere else in the render, i need to be
   able to say 'put t0-t10 of the strings only track at t44-t54 of the render'."
   => a sound placement = (track, source-in, source-out, render start). He reads/enters these numbers
   and tells the coordinator (Claude) what to build. The coordinator (not the tool) later renders audio.

## Nathan's constraints on the design
- Simple, uncluttered, obvious how to use it and what is where. Not a video-editor clone. Short, direct text.
- Big video on top; sound lanes below; ONE playhead; stepping/scrubbing/playing moves video and every lane together.
- Each lane shows its own waveform and can show its own (source) clock next to the render clock.
- Mute per lane (solo welcome). Everything loaded and present at once.

## Coordinator's reading of the rest (open to Plan's judgment; log deviations, do not ask Nathan)
- Default state should reproduce today's teaser sound (opening piano logo; emotional-classical bed placed twice
  for the ride; the five E5 pulses) with the stems present but muted, so unmuting a stem gives that stem where
  the original sits.
- The tool only plays and reports numbers (a plain-words placement list he can copy to chat). It does not
  write audio files. Save-a-copy is optional/later.
- Single offline HTML for the tool itself is desirable; loading all media in one action (not 12 file pickers)
  is a hard usability need — Plan must solve loading under file:// restrictions (e.g. a folder pick of a prepared
  kit folder + manifest, or a generated bundle). Chrome/Edge on Windows are the targets.

## Addendum (Ruling 2, 2026-09-24): Nathan's later layout note (verbatim, given the same day, after item 1 above)
"maybe it could be better to have the video on the left or right side instead of top. Since the tracks themself
are long shaped while the video itself is more square!"
=> supersedes the "top big panel ... below the sound channels" wording of item 1: video LEFT, lanes RIGHT using the
full height; below 1100 px wide the page stacks (video on top). Recorded here so the binding file matches what was built
(INSPECT-REPORT defect 9).
