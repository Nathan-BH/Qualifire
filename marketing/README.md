# marketing/ — the public-facing site and brand assets

| File | What it is |
|---|---|
| `index.html` | The marketing site — outward-facing copy and layout. Rewritten cycle 022 to match `product/BRAND.md`'s current framing (no scarcity language, no F1 name-dropping — see that file's rewrite, cycle 024). |
| `HYPERFRAMES-PLAN.md` | Plan for the "hyperframes" motion/teaser assets used on the site. |
| `assets/` | Static brand assets used by the site (logo PNG/SVG). |
| `hyperframes/` | Rendered teaser assets and the render script (`render.ps1`) that builds them. |

Read by: whoever touches outward-facing copy or the site — cross-check against
`product/BRAND.md` before changing tone or claims, since the site was already
corrected once (cycle 022) for exactly this kind of drift.

**Provenance note (virgin-cycle5, 2026-09-08).** `index.html` was brought over from `main`
unchanged in `0fb4a1c` (2026-09-08) and reviewed for `virgin`-correctness in
`cycles/virgin-cycle5/REVIEW-website.md`; its no-regrets fixes landed the same cycle
(`cycles/virgin-cycle5/BRIEF-website-improvement-plan.md` part (c)). The "cycle 022 / cycle
024" references above are `main`'s cycle numbers, not `virgin`'s — kept as-is for
provenance, not deleted.
