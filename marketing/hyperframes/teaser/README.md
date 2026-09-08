# teaser — Qualifire brand teaser (HyperFrames composition)
`index.html` is a ~12s, 1920x1080 HyperFrames composition (id `teaser`), not
a website: ring draws clockwise -> wordmark + tagline -> four sector slots
(yellow/green/yellow/purple) -> timing-tower line -> yellow endcard. One
paused GSAP timeline (`window.__timelines.teaser`); only external asset is
the GSAP CDN script.

On your PC, from this folder: `npx hyperframes preview` (live-reload) or
`npx hyperframes render` (MP4). Or run `..\render.ps1` from this folder —
location-independent, checks Node 22+/FFmpeg first.
