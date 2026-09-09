# teaser — Qualifire brand teaser (HyperFrames composition)
`index.html` is a ~12s, 1920x1080 HyperFrames composition (id `teaser`), not
a website: ring draws clockwise -> wordmark + tagline -> four sector slots
(yellow/green/yellow/purple) -> timing-tower line -> yellow endcard. One
paused GSAP timeline (`window.__timelines.teaser`); only external asset is
the GSAP CDN script.

On your PC, from this folder: `npx hyperframes preview` (live-reload) or
`npx hyperframes render` (MP4). Or run `..\render.ps1 -Name teaser` from
`marketing/hyperframes/` — location-independent, checks Node 22+/FFmpeg first.

**2026-09-09 revision:** per Nathan's feedback, the mark now fades out in
place at 2s (no shrink-to-corner) and fades back in centered for the endcard
at 10.6s (no travel); also fixed 3 `gsap_exit_missing_hard_kill` contract
errors by wrapping every clip's content in a `.inner` div and hard-killing
each exit fade with `tl.set` right at its clip boundary.
