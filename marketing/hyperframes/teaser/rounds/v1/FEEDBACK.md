# Teaser — Round v1

**Render file:** teaser_v1.mp4 (source render: teaser_2026-09-09_18-08-41.mp4 — the post-revision render, not the earlier stale one)
**Duration:** 11.200 s (ffprobe; 336 frames at 30 fps, 1920x1080, H.264 — so ~0.8 s short of the "12 s" in the README/spec)
**Composition source:** hyperframes/teaser/index.html (state as rendered 2026-09-09, post mark-fade revision)

## What it's for
A short brand ident for Qualifire: app-store preview slot, social header, top of the landing page. It's the "who we are" clip rather than a feature walkthrough — it plants the Q-mark, the wordmark and tagline, flashes the sector-time colour language and the P2 ranking so the viewer knows this is about riding and timing, then closes on the mark + wordmark as a still. Everything sits on a near-black background throughout; there is no scene with a coloured field.

## What you see, in order
1. **0.0–1.0 s — Ring draws.** Near-black frame. The very first frame already has a small white dot slightly above centre (no fully-black lead-in frame). From that dot, a thick off-white ring draws clockwise starting at 12 o'clock; it is a complete circle by ~1.0 s. The ring sits in the upper-middle of the frame (centre at roughly 47% of frame height), the same position the endcard mark will later occupy.
2. **1.0–1.5 s — Yellow tail.** The ring holds for ~0.2 s, then from ~1.2 s a rounded yellow stroke draws outward from the ring's lower-right edge (about 5 o'clock) towards bottom-right, completing the "Q" by ~1.5 s. White ring + yellow tail = the Qualifire mark.
3. **1.5–2.0 s — Mark holds.** The finished Q-mark sits alone, centred, for half a second.
4. **2.0–2.5 s — Mark fades out in place; wordmark cross-fades in.** This is the revised behaviour and it landed: the mark does NOT shrink or travel to a corner. It fades to nothing where it stands (fully gone by ~2.5 s). At the same time, from ~2.0 s, the wordmark "QUALIFIRE" (wide-tracked, bold, off-white caps) fades in at almost the same spot — for ~0.3 s the ghost of the ring is visible sitting directly over the "L I" of the wordmark. The tagline "Same road. New meaning." (small, grey, sentence case) fades in just under the wordmark from ~2.3 s.
5. **2.5–4.6 s — Wordmark + tagline hold.** "QUALIFIRE" with "Same road. New meaning." beneath it, centred, static, ~2 s.
6. **4.6–4.95 s — Wordmark fades out.** Straight opacity fade, in place; screen is effectively empty at ~4.95 s.
7. **5.0–8.7 s — Four sector slots build, one per second.** Along the lower third of the frame (centred vertically at ~70% of frame height), four rounded-rectangle cards fade in left to right, each in its own colour, roughly every 1.0 s: S1 at ~5.0 s, S2 at ~6.0 s, S3 at ~7.0 s, S4 at ~8.0 s. Each card has a dark fill, a 2 px coloured border, a small grey label ("S 1" … "S 4") and a large bold time in the border colour. Colours and values as rendered: **S1 yellow 38.2 · S2 green 1:02.9 · S3 yellow 27.7 · S4 purple 51.0** — that is the planned yellow/green/yellow/purple sequence. Each card appears with a short (~0.15 s) fade, no slide or scale. Nothing else is on screen while the slots build; the upper two-thirds of the frame stay empty. Full row of four holds ~8.2–8.7 s.
8. **8.75–8.95 s — Slots fade out.** All four cards fade together, in place, in ~0.2 s.
9. **9.0–10.3 s — "P2" timing-tower line.** A large bold yellow "P2" fades in dead-centre (~9.0–9.2 s), then a small grey line "of your last 10 rides" fades in beneath it at ~9.3 s. Both hold, static, to ~10.3 s.
10. **10.3–10.5 s — P2 fades out.** Straight opacity fade in place; frame empty at ~10.5 s.
11. **10.6–11.2 s — Endcard: mark fades back in centred, then yellow wordmark.** From ~10.6 s the Q-mark (white ring + yellow tail, same size as the opening) fades back in at the same centred position it occupied at 1.5–2.0 s — a fade-in, not a travel — followed from ~10.7 s by "QUALIFIRE" beneath it, this time in yellow rather than off-white. Both are fully opaque by ~10.9 s and hold as a still until the file ends at 11.2 s. Note: the endcard background is the same near-black as the rest of the clip; nothing turns yellow except the wordmark text. If "yellow endcard" in the spec meant a yellow field, that is not what rendered.

**Revision check:** the mark fades out in place at ~2.0 s and fades back in centred at ~10.6 s — no shrink-to-corner, no travel. Sector slots are yellow / green / yellow / purple as planned. No visible pops, held stale frames or double-images at any clip boundary, so the `.inner` + `tl.set` hard-kill fix looks clean in the output.

## What you hear
Nothing — the file has no audio stream at all (ffprobe shows a single H.264 video stream and no audio track). If this is going on a social header or app-store preview that autoplays muted that's fine as-is; if it's going anywhere with sound on, a bed or a single hit on the endcard would need to be added at render time.

## Nathan's feedback
*(blank — write your notes below, overall or beat-by-beat)*

-
