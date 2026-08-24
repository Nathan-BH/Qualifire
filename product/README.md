# product/ — what we are building

Split into three, 2026-08-24 (cycle 024, WP-I bookkeeping), following the disposition
the 2026-08-20 WP-I brief set out. Nothing in the split was rewritten as part of the
move itself — files moved as-is (one file, `GPX-PLUS-proposal.md`, got a one-line
"implemented" note prepended before its move; `BRAND.md`, `LAYOUT.md`, `CONCEPT.md`
were separately rewritten/corrected the same day, as noted below).

## Full disposition index

| File | Status | Last touched | Who reads it | What it is |
|---|---|---|---|---|
| `BACKLOG.md` | live | 2026-08-24 | Product Owner (owns content), Team Principal (sets status), everyone at cycle start | Open work, prioritised. |
| `DECISIONS.md` | live | 2026-08-24 | everyone — append-only decision log | Every settled question, dated, with rationale (numbered from D-001). |
| `CONCEPT.md` | live (+ correction block, 2026-08-24) | 2026-08-24 | Product Owner (owns), everyone wanting the idea | The app concept, distilled — body is the cycle-007 record, corrected at the top for what's now built. |
| `DATA-MODEL.md` | live | 2026-08-16 | Navigation Engineer, Backend Dev | Data model — §8a is the route-pick-at-START design (2026-08-16). The later pick-bias/lock-then-verify ruling (D-044, 2026-08-20) that builds on it is not yet cross-referenced here — filed as B-152. |
| `LAYOUT.md` | live (+ status-block fix, 2026-08-24) | 2026-08-24 | Designer, Mobile Dev | Screen-by-screen spec — status block at top corrected to match the shipped six-tab app; body (§1 onward) kept as the original design record. |
| `BRAND.md` | live (full rewrite, 2026-08-24) | 2026-08-24 | Art Director, Designer, Mobile Dev | Brand doc — rewritten to drop the scarcity/162m/three-tracks/7-28-day framing Nathan overruled; see `cycles/cycle-024.md`. |
| `PRIOR-ART.md` | live | 2026-08-14 | Product Owner | Still-consulted reference (Strava/OpenTracks/Open Pace comparison). |
| `MAP-TILES.md` | live | 2026-08-17 | Mobile Dev, Navigation Engineer | Style URLs, ToS, attribution strings — still operative (open B-52/B-56). |
| `MAP-CONTRACT.md` | live | 2026-08-17 | Mobile Dev, Navigation Engineer, QA | Per-surface map behaviour + acceptance test — still binding. |
| `brand/` | live | 2026-08-15 | Art Director | Canonical brand assets + `make_brandboard.py`. |
| `README.md` | live | 2026-08-24 | everyone | This file. |
| `proposals/COLD-START.md` | proposal | 2026-08-17 | Product Owner, Designer | Unbuilt cold-start ladder design (B-35…B-43 open). |
| `proposals/SETUP-UX.md` | proposal | 2026-08-17 | Product Owner, Designer | Unbuilt onboarding/gate-setup design. |
| `proposals/ROUTING-AND-SEGMENTATION.md` | proposal | 2026-08-17 | Product Owner, Designer | Unbuilt; gated on the §29 typed-destination fork Nathan hasn't ruled. |
| `proposals/TRIAGE-ideas-18-27.md` | proposal | 2026-08-16 | Product Owner | Idea triage; open remnants tracked in `BACKLOG.md`. |
| `superseded/MAPLIBRE-SPIKE.md` | superseded | 2026-08-17 | nobody (historical) | Stale v10 prop names, from before the real MapLibre map decision (D-041) superseded it. |
| `superseded/MAP-STACK-OPTIONS.md` | superseded | 2026-08-17 | nobody (historical) | Decision support that fed the real map-stack decision (D-041). |
| `superseded/BUILD-PIPELINE.md` | superseded | 2026-08-16 | nobody (historical) | Plan overtaken by real builds 3/4/5 + runbooks + `scripts/`. |
| `superseded/GPX-PLUS-proposal.md` | superseded | 2026-08-24 | nobody (historical) | Shipped as GPX+ (B-68, cycle 021); extended further cycle 024 (WP-G). |

## Moved 2026-08-24 (old path → new path)

| Old path | New path |
|---|---|
| `product/COLD-START.md` | `product/proposals/COLD-START.md` |
| `product/SETUP-UX.md` | `product/proposals/SETUP-UX.md` |
| `product/ROUTING-AND-SEGMENTATION.md` | `product/proposals/ROUTING-AND-SEGMENTATION.md` |
| `product/TRIAGE-ideas-18-27.md` | `product/proposals/TRIAGE-ideas-18-27.md` |
| `product/MAPLIBRE-SPIKE.md` | `product/superseded/MAPLIBRE-SPIKE.md` |
| `product/MAP-STACK-OPTIONS.md` | `product/superseded/MAP-STACK-OPTIONS.md` |
| `product/BUILD-PIPELINE.md` | `product/superseded/BUILD-PIPELINE.md` |
| `product/GPX-PLUS-proposal.md` | `product/superseded/GPX-PLUS-proposal.md` |

Every move above is reversible (`mv` back) — see `STATE.md` → "Awaiting Nathan" for
the one-line flag.

## `proposals/` — designed but not built

Unbuilt design work. Promotion out of here means it gets built, not just discussed.

## `superseded/` — settled or overtaken, kept for the record

Never deleted; these explain how the project got here even though nothing here is
current.
