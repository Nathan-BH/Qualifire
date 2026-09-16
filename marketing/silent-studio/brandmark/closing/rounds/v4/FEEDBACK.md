# brandmark/closing — round v4

**Render:** `closing_v4.mp4` (4.0s, 1920x1080) — built and confirmed 2026-09-16 on
Nathan's PC (`render.ps1 -Name brandmark\closing -Render`).

## What changed since v3

Per Nathan's request ("use the second part of the opening render — not the logo
drawing, but only the qualifire text + the slogan beneath it"): closing no longer
draws its own logo mark + fades to a yellow wordmark. It now reuses opening's
post-logo wordmark + tagline beat verbatim (same CSS, same two `fromTo` tweens,
shifted -2.80s), so the wordmark is opening's off-white (`var(--ink)`), not the
old yellow. Still a 4.0s clip; timeline id still `closing`.

## Verified

- Duration: `ffprobe` confirms exactly 4.000000s.
- Visual: extracted a still at 2.0s — shows "QUALIFIRE" in off-white plus the
  tagline "Same road. New meaning." underneath, matching opening's beat exactly
  (just retimed). No leftover mark/ring/yellow wordmark visible.

## Open item

The wordmark colour is off-white (opening's), not the previous yellow. This was
flagged as the one judgment call in the Execute pass — Nathan has not said either
way since seeing the render land. If he wants the closing wordmark back to yellow
specifically (even though it's now otherwise identical to opening), that's a
one-token change (`color: var(--ink)` → `#F5C542` on `#wordmark .word`).
