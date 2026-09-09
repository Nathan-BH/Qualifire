# VIDEO-EDITING-GUIDE — your four questions, answered

Written 2026-09-09 after you watched the first teaser render
(`marketing/hyperframes/teaser/renders/teaser_2026-09-09_09-14-01.mp4`).
Free-tool facts below were checked against current pages today; sources at the bottom.

## Recommendation (short version)

Two tracks, two tools. No single tool does both.

1. **Graphics-only videos (ideas 1, 2, 3, 4)** — you already have the Inkscape-style
   answer. The teaser is `marketing/hyperframes/teaser/index.html`: one plain-text
   HTML/CSS/JS file. Every colour, duration and piece of text is a literal in that file.
   You edit it (or I do), `npx hyperframes preview` shows it live in a browser, `render.ps1`
   makes the MP4. Nothing new to install. This is the whole workflow for four of the six videos.
2. **Footage videos (ideas 5, 7)** — these need real phone screen recordings, and cutting
   footage is a different job that HyperFrames is not built for. You need a normal video
   editor. **Start with DaVinci Resolve (free version, v21).** No watermark, no export cap
   that matters to you, no upsell nagging, permissive on commercial use, and the free tier
   is the same program professionals use, so nothing you learn is wasted. The one thing it
   lacks for free is automatic speech-to-text captions — irrelevant here, since your
   captions are scripted text you type in, not transcribed speech. If Resolve feels like too
   much program on day one, CapCut desktop is the easier fallback (see Q2 for its catches).
3. **How we split the work on 5 and 7:** you record the footage; I write the cut list
   (timestamps + caption text + when the logo bumper goes in); you do the cutting in
   Resolve. First time through, expect an afternoon. Details in Q3.

---

## Q1 — "Can I get more control, like Inkscape, where I build something and tweak it? Can I edit this video in a software?"

Yes for the video you just watched, and you already have it. The teaser is not a binary
video project; it is this text file:

```
marketing/hyperframes/teaser/index.html
```

Open it in any text editor. It has three kinds of things you can change:

- **Colours** — hex codes in the `<style>` block (ink `#F4F2EC`, yellow `#F5C542`,
  background `#0A0A0A`) and the tier array in the script:
  `var SECTOR_COLORS = ['#F5C542', '#3ED598', '#F5C542', '#A667F0'];`
- **Text** — literally the words in the HTML: `Same road. New meaning.`, `P2`,
  `of your last 10 rides`, the sector times `38.2`, `1:02.9`, …
- **Timing** — each `tl.fromTo(...)` / `tl.to(...)` line ends with the start time in
  seconds and contains a `duration:`. E.g. the ring draw is
  `{ strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0)` — change `1.3` to
  `2.0` and the ring draws slower. Each block (`#mark`, `#wordmark`, `#sectors`, `#tower`,
  `#endcard`) also has a `data-start` / `data-duration` attribute that says when it exists
  on the timeline at all.

Positions and sizes are ordinary CSS (`top`, `left`, `width`, `font-size`). Motion is
ordinary GSAP tweens (`x`, `y`, `scale`, `opacity`). If you can edit an SVG's XML you can
edit this; it is the same idea with a time axis added.

To see a change: from `marketing/hyperframes/teaser/`, run `npx hyperframes preview`.
It opens the composition in your browser with a scrubber and live-reloads on every save.
To make the MP4: `..\render.ps1` (or `npx hyperframes render`).

What you do **not** get: a visual GUI where you drag the ring around with a mouse.
The "editor" is the text file plus the live preview. Given how you already work with
SVGs (script → file → Inkscape only for looking), that's probably the right trade.

**The limit.** This works because those videos are 100% generated graphics. Ideas 5 and 7
are built from screen recordings of a real phone. Trimming a recording to the right
second, syncing captions to what happens on screen, fixing the phone's exposure — that
needs a tool with a scrubber and a timeline you drag things around on. HyperFrames can
place a video file on its timeline (`<video class="clip" data-start=… data-duration=…>`)
so it is not useless for those pieces, but choosing *where* to cut is still something you
do by watching the footage, and for that a proper video editor is simply better. There is
no tool that gives Inkscape-style text-editable control over raw footage. That's a real
property of the medium, not a missing feature.

---

## Q2 — "Is there free software, and what can it do?"

Three that fit "total beginner, short social clips, cut phone footage + add text captions".
All three run on Windows. None of them cost anything for what you need.

### DaVinci Resolve 21 (free version) — recommended

- **Licence / catch:** Genuinely free, no watermark, no time limit. The paid "Studio"
  is a one-off $295 and you do not need it. Free caps export at Ultra HD 3840×2160, 60 fps,
  8-bit — far above what a vertical phone clip for Instagram needs.
- **What free does:** Full multi-track timeline editing, trimming, transitions, text and
  title overlays with keyframe animation, colour correction (its strongest feature — good
  for evening out a phone recording), audio mixing, export presets for YouTube etc.
  Reads normal phone MP4/MOV files.
- **What free does not do:** No automatic speech-to-text captions ("Create Subtitles from
  Audio" and text-based editing are Studio-only). It *can* import, edit and export subtitle
  files. Some AI effects and noise reduction are Studio-only. None of this touches your
  two videos: the captions are scripted lines you type, and there is no speech.
- **Realistically for whom:** Someone willing to spend an afternoon learning the layout.
  It is a big program — seven "pages" (Media, Cut, Edit, Fusion, Colour, Fairlight,
  Deliver) — but you only need Edit and Deliver, maybe Colour. As a scientist used to
  dense tools (ImageJ, Inkscape) you will be fine; the intimidation is visual, not conceptual.
- **Commercial use:** No restriction on the free version for a business/brand.

### CapCut (desktop) — the easier fallback

- **Licence / catch:** Free tier exists, but it is a freemium product from ByteDance with a
  Standard ($9.99/mo) and Pro ($19.99/mo) tier, and the free tier has been shrinking. A
  plain manual edit with your own footage exports clean at up to 1080p with **no
  watermark**. Watermarks appear only if you use templates/effects/stickers marked "Pro"
  — and several previously free ones were moved behind that flag in the 2025–26 restructure,
  so you can get surprised. 4K export is Pro-only (you don't need it).
- **What free does:** Cut, split, multi-track timeline, keyframes, text with styled
  caption presets, transitions, speed changes, chroma key, and automatic speech captions
  (free up to ten minutes per video). The text/caption tooling is the most beginner-friendly
  of the three and is built around vertical social formats.
- **Watch out for:** Two separate licences. The software itself may be used for business.
  The bundled *assets* (music, effects, fonts, templates) are split into non-commercial and
  "dual use" — only assets flagged for commercial use may go into a brand video. Simplest
  rule: use only your own footage and your own text, none of their music or templates, and
  you are fine. Also: the terms of service grant CapCut a broad licence over content you
  upload to their cloud — keep projects local.
- **Realistically for whom:** Someone who wants captions on a phone clip in twenty
  minutes and does not care about learning a "real" editor. The lowest learning curve of
  the three by a wide margin.

### Shotcut — open source, no strings, but dated

- **Licence / catch:** GPL open source. No watermark, no tiers, no account, nothing.
- **What it does:** Multi-track timeline, trimming with ripple, text overlays (Simple and
  Rich text filters), wipe/cross-fade transitions, keyframes with easing on any filter,
  speed ramping, audio mixing, export presets for YouTube/mobile, reads and writes video
  with alpha (transparency), exports image sequences. Built on FFmpeg, so it opens anything.
- **What it lacks:** No automatic captions, no AI anything, and the interface looks and
  feels ten years old. Beginners report needing the docs for things Resolve and CapCut make
  obvious.
- **Realistically for whom:** If you object to Resolve requiring a Blackmagic download
  page and CapCut being ByteDance freemium, this is the clean option. Otherwise Resolve
  does everything Shotcut does with a better interface, also for free.

### Not recommended for this

Canva's video editor and the web/mobile CapCut are template-driven and cloud-bound;
Windows' built-in Clipchamp pushes a subscription for 1080p and has the same asset-licence
trap as CapCut. OpenShot is free and simple but crashes more than the three above.

---

## Q3 — "Best way to work together? You make a video, I edit it, you see my changes — like SVG being just code?"

Two tracks, depending on which video.

### (a) Graphics-only pieces — ideas 1, 2, 3, 4, plus all bumpers/overlays for the others

This is exactly the SVG workflow, and it works today:

1. I write or edit `index.html` in the composition folder.
2. You run `npx hyperframes preview` from that folder — browser opens, scrubber at the
   bottom, reloads on every save.
3. You react either **in chat** ("slash lands too late", "tagline too grey", "hold the P2
   longer") or by **editing the file yourself** — changing a hex code, a `duration:`, a
   start time, a line of text. Both are equal; mix them.
4. I read the file back. It is plain text, so I see every change you made as a diff,
   exactly like a hand-edited SVG. No "which version is canonical" problem as long as
   the file on disk is the truth — same rule you use for figures.
5. When it's right, `render.ps1 -Render` and the MP4 lands in `renders/`.

Nothing here is a binary project file, so nothing gets lost between us.

### (b) Footage pieces — ideas 5 and 7

Only you can produce the input: a screen recording from your phone of a real blank
install, a real ride, a real timing tower. After that:

**Option (i) — cut list, you cut. Start with this.**
I give you a written cut list for the video, in the same style as
`HYPERFRAMES-IDEAS-DETAILED.md` but concrete: which recording, from what timestamp to
what timestamp, in what order, what caption text goes over each segment and for how long,
where the Gate bumper (rendered from HyperFrames as an MP4) goes at the start/end, and the
export settings. You open Resolve, drop the clips on the timeline in that order, trim to
the timestamps, add the text, export. For simple cut-and-caption this is an afternoon the
first time and an hour the second. What I cannot see afterwards is the Resolve project file
(it's a database, not text) — but I can watch the exported MP4 and give feedback on it, and
you can tell me what you changed. Good enough.

**Option (ii) — I build the graphics, you layer them on top. Fallback if the text in
Resolve looks off-brand or fiddly.**
I render the branded parts — caption cards in the exact brand type/colours, the animated
"P2" arrival, the Gate bumper — as short MP4s from HyperFrames. You place them on a track
above your footage in Resolve. For overlays that need transparency, I render them on a
flat green background and you apply Resolve's (or CapCut's/Shotcut's) chroma-key filter,
or the overlay is a full-frame card that doesn't need transparency at all. This keeps the
"brand-precise" work in code and leaves you only the footage trimming.

**Option (iii) — for completeness: the closest thing to code-editable footage.**
You note the cut points as timestamps in a text file; I trim the clips with FFmpeg from
those numbers and place them as `<video class="clip">` elements inside a HyperFrames
composition with the captions on top. Fully text-based, fully diffable, no editor at all.
The catch: picking the timestamps still means you scrubbing through the recording, and
every "move that cut 0.3 s earlier" is a re-render instead of a drag. Worth it only if
you end up hating Resolve.

### Suggested order

Build idea 1 (the Gate sting) next in HyperFrames — it's the first two seconds of the
teaser and becomes the bumper every other video needs. Then, whenever you have the phone
footage, do idea 7 with option (i): it is the shortest footage piece and mostly one shot.

---

## Q4 — "Is video editing like PowerPoint — assets like the logo or a text, then actions applied to them? Or more complex?"

Your guess is right, with one extension.

**What's the same as PowerPoint.** Everything on screen is an object — a video clip, a
still image, a text box, an audio file. You place objects, you set their properties
(position, size, opacity, colour), and you apply motion to them. The HyperFrames teaser
literally has this structure: `#mark`, `#wordmark`, `#sectors`, `#tower`, `#endcard` are
the "assets" and the `tl.to(...)` lines are the "animations".

**What's different: time is continuous, and layers are simultaneous.**

- PowerPoint is organised by *slide* and advances by *click*. A video editor is organised
  by a **timeline** — one horizontal axis in seconds — and there are no slides; the whole
  video is one long strip.
- The timeline has stacked **tracks** (rows). Typical layout for your clips: bottom track
  = the phone footage; above it = graphic overlays (logo bumper, caption cards); above
  that = text; a separate row underneath for music or the phone's audio. Whatever is on a
  higher track draws on top of what's below, like layers in Inkscape.
- Every object occupies a **time range** on its track — a rectangle you can slide left or
  right (when it happens) and drag at its ends (how long it lasts / where the clip is
  trimmed). "Trimming" is just shortening that rectangle; the source recording is never
  altered.
- Motion uses **keyframes**: you set a property at time A and again at time B and the
  program interpolates in between. So "the logo slides in over 0.6 s" is two keyframes on
  its position, not a discrete "Fly In" click. HyperFrames' `tl.to('#mark', { x: -700,
  scale: 0.22, duration: 0.6 }, 2.0)` is exactly one keyframe pair written as code.
- **Transitions** (cross-fades etc.) are the one thing that's genuinely the same as PPT:
  a preset dropped between two neighbouring clips.

**Things PowerPoint doesn't make you think about, but a video editor does.**

- **Frame rate.** The project has a fixed fps (30 or 60); your phone recording has its own;
  the editor should match the project to the footage. A one-time setting.
- **Resolution and orientation.** Vertical 1080×1920 for Instagram/TikTok, horizontal
  1920×1080 for YouTube. Decide before you start; converting later means re-laying-out.
- **Audio sync.** Once you trim a clip, its sound stays attached, but if you place the
  phone's buzz as a separate file you have to align it by hand.
- **Export ("render"/"deliver").** Choosing a codec (H.264 is the answer), bitrate and
  container (MP4). The presets get this right; you just pick "YouTube 1080p".

So: conceptually not harder than PowerPoint, just two more dimensions (continuous time,
stacked layers) and a handful of technical settings that you set once and forget. For
your two footage videos — a few cuts, a dozen caption cards, a bumper at each end — that's
all there is to learn. Colour grading, multi-camera, motion tracking and the rest of
what makes Resolve a 300-page manual are not on your path.

---

## Sources checked today

- DaVinci Resolve free vs Studio: [Blackmagic product page](https://www.blackmagicdesign.com/products/davinciresolve/),
  [Toolfarm free-vs-Studio breakdown](https://www.toolfarm.com/tutorial/in-depth-davinci-resolve-studio-vs-the-free-version/),
  [transcription is Studio-only](https://davinciresolveclub.com/transcribe-audio-davinci-resolve/),
  [v21 release](https://cre-8.com.au/2026/06/03/davinci-resolve-version-21-now-available-for-free-download/)
- CapCut free/Standard/Pro after the 2026 restructure: [BIGVU](https://bigvu.tv/blog/capcut-free-vs-pro-what-2026s-restructure-actually-gives-you/),
  [Vidpros](https://vidpros.com/capcut-pro-vs-free/),
  [CapCut's own watermark help page](https://www.capcut.com/help/video-without-watermark),
  [commercial-use licence split](https://autoae.online/blog/is-capcut-free-for-commercial-use)
- Shotcut: [feature list](https://mltframework.github.io/shotcut_web/features/),
  [2026 review](https://atomisystems.com/screencasting/shotcut-review-2026/)
- HyperFrames: [GitHub README](https://github.com/heygen-com/hyperframes) (video clips on
  the timeline, `preview` live reload)
