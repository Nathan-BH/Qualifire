> **2026-09-10:** brandmark is now a family folder — the base lockup here, one
> subfolder per variant (`opening/`, `closing/`). Render a variant with
> `.\render.ps1 -Name brandmark\<variant>`. Map: `../structure.md`.

# brandmark — Qualifire logo + wordmark lockup (HyperFrames composition, formerly "gate")

This is the animated brand mark (white ring + gold tail forming the "Q") and the
"QUALIFIRE" wordmark — a marketing asset for bookending other videos and for use as
an animated avatar/icon. It is **not related** to the "gates" that mark automatic
sector crossings in the ride/route compositions (see
`hyperframes/gates-saving/`) — that name collision between "gate"
(this mark) and "gates" (sector markers) was part of why this got renamed.

## Renamed 2026-09-10

This composition was `hyperframes/gate/`. It is kept there as a legacy duplicate
only because this session has no way to delete files from Nathan's PC —
`hyperframes/brandmark/` is canonical going forward; treat `hyperframes/gate/` as
superseded.

## Spec

5-second branded bumper: ring draws, gold tail lands completing the "Q", QUALIFIRE
fades in, holds, fades to black. 1920x1080, one paused GSAP timeline
(`window.__timelines.gate` — the in-file id string was not changed as part of this
rename, since the brief was to relocate the composition unmodified; renaming the
internal id is a separate, not-yet-done step), only external asset is the GSAP CDN
script.

On your PC, from `marketing/hyperframes/`:
```powershell
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark            # preview
powershell -ExecutionPolicy Bypass -File .\render.ps1 -Name brandmark -Render    # render to MP4
```
Or, from this folder: `npx hyperframes preview` / `npx hyperframes render`.

**Unverified:** the above assumes the HyperFrames tooling resolves compositions by
folder name and will pick up `brandmark` correctly now that the folder has been
renamed. Nobody has run the render pipeline against this folder yet this session —
if `-Name brandmark` doesn't resolve, check whether the tooling instead keys off
the `data-composition-id="gate"` attribute inside `index.html` (see the spec note
above) rather than the folder name.

Built and rendered 2026-09-09 as `gate` (`renders/brandmark_2026-09-09_18-09-25.mp4`,
copied here from `gate/renders/gate_2026-09-09_18-09-25.mp4` — decoded video is
pixel-identical; the file is a few KB larger only because the transfer to Nathan's
PC stamps a C2PA provenance atom on every committed file, the same benign artifact
already documented in `gate/rounds/v1/FEEDBACK.md`).

## Known lockup variants

Nathan wants multiple versions of this mark+wordmark animation — different
existing renders across the project already show different lockup behaviour.
This is a survey of what exists today, as a starting point for that work, not
a finished variant library.

- **This composition (brandmark / ex-gate):** mark draws (white ring, then gold
  tail), THEN the "QUALIFIRE" wordmark fades in below it in gold/yellow —
  sequential, not simultaneous, no tagline. Per `rounds/v1/FEEDBACK.md`, the ring
  + tail finish at 1.433s, the wordmark fade-in starts at 2.933s — a **1.5s** static
  hold on the bare mark between mark-complete and wordmark-fade-start.

- **Teaser's opening (`hyperframes/brandmark/opening/`):** mark draws (ring +
  *yellow* tail, not gold), then the mark fades OUT in place while the wordmark
  "QUALIFIRE" (**off-white**, not yellow) and the tagline "Same road. New meaning."
  cross-fade IN — overlapping/simultaneous, not sequential; for about 0.3s the
  fading ring is visible directly over the "LI" of the wordmark. Nathan flagged
  this overlap on 2026-09-10 as needing more spacing ("there is an overlap with
  the logo fading out and the qualifire text + tagline coming in (should be
  spaced more)") — logged in that part's own
  `rounds/v1/FEEDBACK.md`, not repeated in full here.

- **Teaser's closing (`hyperframes/brandmark/closing/`):** the mark fades
  back IN centred (rather than drawing/travelling/shrinking into place), then the
  *yellow* "QUALIFIRE" wordmark fades in beneath it — sequential like brandmark,
  no tagline, but the mark arrives by a plain opacity fade rather than by tracing
  the ring and tail.

**Axes of variation across these three:** wordmark colour (white/off-white vs.
gold/yellow), tagline present or not, and the timing relationship between mark
and wordmark (sequential-with-a-gap here in brandmark, overlapping-crossfade at
the teaser's open, sequential-fade-in at the teaser's close).

## Next steps

Nathan wants multiple named variants of this lockup built (e.g. by wordmark
colour, tagline on/off, mark/wordmark timing). Not built yet — this README is
the survey to start from.

## Feedback rounds
| Round | Render | Date | Status |
|---|---|---|---|
| [v1](rounds/v1/FEEDBACK.md) | brandmark_v1.mp4 | 2026-09-09 | Awaiting feedback |
