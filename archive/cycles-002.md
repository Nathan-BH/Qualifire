# Cycle 002 — 2026-08-14 (archived verbatim by Librarian at cycle 007 — live cap is 5 cycle files)

Trigger: Nathan, on demand ("subagents on layout" + "how do you practically build an app"). Members: Designer, Mobile Dev (woken early by Nathan's override), parallel.

## Agenda

1. B-07 + B-15 — concrete screen-by-screen layout (Designer)
2. B-08 — dev-and-deploy pipeline, Android, Windows PC (Mobile Dev)

## Decisions recorded

- **D-012** — RN/Expo dev-build stack, WiFi live-reload loop, sideloaded APK, $0 pipeline, phased build starting with a PC-only GPX harness.
- **D-013** — `product/LAYOUT.md` accepted as working UI spec (5 screens, auto LIVE→BOARD, interrupted/estimated rendering rules).

## Member summaries

- **Designer:** wrote `product/LAYOUT.md`; answered RE's D-011 rendering question (interrupted = earned tier + ‖ glyph; estimated = dashed grey, no tier, no earcon); tier ladder doubles as ink-density ladder, no red in palette. Confidence high.
- **Mobile Dev:** wrote `product/BUILD-PIPELINE.md`; resolved both standing [UNVERIFIED] flags (Expo FGS background GPS confirmed; Expo Go ruled out); EAS free tier verified; $0 end-to-end. Confidence high.

## Events during the cycle

- **B-17 DONE:** Nathan delivered his full Strava archive — 624 GPX files (`strava_export-20260814.zip`). Upgrades all quantitative work from "waiting" to "ready".

## Open after this cycle

- B-19 (new): Phase-0 validation harness on the archive — now the top-value item.
- B-20 (new): sector-of-the-day metric + gate-move invalidation (RE, exported from LAYOUT.md).
- Ideal-lap window decision (28d assumed in LAYOUT.md) — Principal to settle next cycle.
- Escalations to Nathan unchanged: confirm D-008 deviation, D-009; roster approval.

## Records check

STATE.md rewritten. Both new product docs labelled UNBUILT. Mobile Dev status change mirrored in TEAM.md. Files within caps.
