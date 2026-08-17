# Cycle 004 — 2026-08-14

Trigger: Nathan, on demand. Members: Mobile Dev, Race Engineer, Product Owner, Designer (parallel). Backend Dev/QA held one more cycle (no codebase to model/test until today).

## Agenda

1. Phase-1 start: TS core + parity + app scaffold (MD)
2. B-21 — Strava-vs-app comparability (RE)
3. B-22 — deliberate reference design (PO)
4. B-23 — earcons, audible in the mockup (Designer)

## Decisions recorded

- **D-021** — "Quali Day": declare-before primary, promote-after secondary, ceremonial all-purple frame (display-only), "Reference defended" grace rule, free-form cadence, per-track.
- **D-022** — lap scored at the final gate (Nathan's mid-cycle ruling): lap tier vs rolling 7/28-day lap bests.
- **D-018 resolved for app**: pre-seed benchmarks + σ_s with guards (clean rides only, ghost-dot marking, tripwire); rolling windows retire seeds naturally. Cold-start conflict dissolved.
- **D-016(a) ratified as amended**: time-aware re-acquisition bound (measured fix by MD).

## Member summaries

- **Mobile Dev:** first application code — `app/core/` TS engine, **exact parity** with Python (500/500 rows, 0 mismatches); Expo scaffold config-only; dropped all runtime deps (togeojson/turf/cheap-ruler unneeded). npm typecheck pending Nathan's PC.
- **Race Engineer:** archive forensics measured — Strava phone-app data, 1 Hz, smoothed not snapped; 5 pathological rides excluded; bias bound ≲2 s/sector → pre-seeding is safe via our own pipeline. expo-location config gotcha exported to MD (distanceInterval:0).
- **Product Owner:** Quali Day design; own lost automatic-monthly argument folded into constraints; two taste flags to Nathan.
- **Designer:** pulse scheme withdrawn; three E-major earcons specced + implemented in mockup (WebAudio); estimated = buzz + silence preserved.

## Open after this cycle

- B-24 (next centrepiece): FGS wiring + storage + export → first APK. Needs Nathan's PC setup (app/README-dev.md).
- B-25, B-26 (Designer/RE fold-ins), B-20 still open.
- Nathan taste checks: earcon A/B, promote-after, nudge threshold, sector names.

## Records check

STATE rewritten; all four role logs current; parity claim verified by artifact (PARITY.md). Role files approaching the ~120-line cap (race-engineer 68, designer 68) — compaction scheduled when any file crosses 120. Librarian note: sandbox npm registry blocked — recorded so future cycles don't rediscover it.
