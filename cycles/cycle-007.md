# Cycle 007 — 2026-08-15

Trigger: Nathan, same session as cycle 006, ratifying IDEAS §15–17 (timing tower; ticking live counter; SOTD dropped in favour of a post-run rethink; demo = accelerated race-mode emulation kept in sync). Members: Product Owner, Designer, Mobile Dev (wave 2).

## Agenda

1. Tower semantics (Product Owner)
2. Live-screen v2 + tower + board v2 layout (Designer)
3. Implementation (Mobile Dev, wave 2)

Mid-cycle Nathan rulings (popups): run the cycle now; big counter = LAP clock, F1-style — over Designer's sector-clock assumption (LAYOUT amended same cycle); build 3 gains a standalone preview-profile APK (D-026).

## Decisions recorded

- **D-026** — build 3 includes a standalone preview-profile APK.
- **D-027** — D-006 amended: ticking lap clock on the visual layer, audio stays primary; supersedes the no-ticking clause.
- **D-028** — tower semantics: 28-day same-track moving-time laps; interrupted ranked with ‖ flag; estimated unranked NO TIME; P1 = pole, REF badge distinct; ghosts for seeds with tripwire demotion; slot-in ceremony on board only; board v2 order; SOTD dropped (shrinking B-20).

Backlog: B-28/29/30 added (B-28 PART-DONE, B-29/B-30 CODE COMPLETE); B-07 SUPERSEDED → B-29; B-15 RESOLVED → D-027.

## Member summaries

- **Product Owner:** BACKLOG B-28/29/30; CONCEPT.md tower section; tower semantics spec ratified as D-028.
- **Designer (three passes):** LAYOUT §2/§2a rewritten (live v2, ticking clock, 2.5 s override, handover beats), new §3b tower + §3 board v2; lap-clock amendment after Nathan's ruling (counter sized for "15:00.0", ~95 pt); demos/mockup.html rebuilt to v2 with the 5 randomized scenarios + tower slot-in, mechanically verified (node --check, tag balance, handlers).
- **Mobile Dev:** liveView.tsx rewritten (rate-multiplied Timebase, 10 Hz lap clock, tier flashes, est/‖ treatments, LAP + position chip); new tower.tsx; PreviewScreen board v2 (SOTD removed, LapBoardChip deleted); data.ts scenarios gained clockGatesS + tower rows (P2/P11/P1-pole/NO TIME/P4); towerSource.ts null stub (B-28); tsc clean; suite unchanged 63 = 60/0/3. Untested on device: clock jank, flash hold, slot-in feel.

## Events during the session (between cycles)

- Randomized demo scenarios first added to the app preview (Nathan's direct ask, pre-007); Nathan's palette reference saved to product/brand/.

## Open after this cycle

- Monday commute (acceptance step 9 + D-024 tripwire artifact); benchmark/ride-history store (real tiers + tower population); build 3 incl. preview APK.
- B-20 residue, B-27, mark animations; stationary clock-dim UNBUILT; Metro-import normalization owed to QA (cosmetic).

## Records check

PO, Designer, MD role logs all carry a cycle-007 entry; all role files under the ~120-line cap. Cycle file count hit 6 — cycle-002 relocated verbatim to archive/cycles-002.md (relocation, not deletion); the delete of the live copy was declined by permission, so a 3-line pointer stub remains in cycles/ pending manual removal. Live content is 003–007.
