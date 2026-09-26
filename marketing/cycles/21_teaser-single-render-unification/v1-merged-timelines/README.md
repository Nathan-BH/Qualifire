# teaser-full

One real HyperFrames composition combining all five teaser scenes (opening, start-ride,
gates-saving, ranking, closing) into a single `index.html`, instead of concatenating five
separately-rendered MP4s (the `teaser/` folder's method).

Built by copying each scene's markup, CSS and script verbatim into its own `#scene-*`
root, scoping each scene's CSS selectors and GSAP timeline targets to that root
(`gsap.context`), wrapping each scene's script in an IIFE (with a local `document` shim
for the geometry-building `getElementById` calls), and nesting all five child timelines
into one master GSAP timeline (`master.add(child, absoluteStart)`), with a `visibility`
toggle at each scene boundary so exactly one scene root is visible at a time. Un-pauses
each child (created `{ paused: true }`) before `add()`.

Total duration: 47.3s — opening 0/6.2, start-ride 6.2/20.2, gates-saving 20.2/32.5,
ranking 32.5/43.3, closing 43.3/47.3. (Corrects gates-saving's stale `data-duration="12.4"`
clip attribute to its actual 12.3s timeline length.)

Open decisions implemented "as-is" per the brief's stated defaults: start-ride's 1.0s
blackout/reveal lead-in is kept unchanged; the gates-saving/ranking gate-position mismatch
(quarters vs 0.24/0.63/0.84) is left as pre-existing; this composition lives as a sibling
folder rather than replacing `teaser/index.html` (which is untouched).

Full digest, feasibility analysis and implementation brief:
`../../cycles/21_teaser-single-render-unification/BRIEF-teaser-full.md`

Not yet run: `render.ps1` / `npx hyperframes` preview, lint, check, snapshot and render
verification (brief section 3.6) — needs Nathan's own PC; not available in the build
environment.
