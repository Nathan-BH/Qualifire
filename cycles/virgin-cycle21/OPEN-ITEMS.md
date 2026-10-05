# virgin-cycle21 — OPEN-ITEMS (decisions taken for Nathan; he can overrule any)

## Decisions taken (all inside the briefs)
1. **No pick = no reference.** A ride with no pick (any 'new' end, or a pick outside the sport-scoped
   set) gets NO route line, NO sectors, NO selfs, no auto-match during OR after the ride; the trail is
   shown and the post-ride naming/free-ride flow handles it (01, 03). Consequence: riding a known way
   after choosing 'new' no longer matches that known way by itself.
2. **A picked ride is the pick from START**, and is "unmatched" at the end only if the pick's candidate
   never fired a single gate (accidental START) — replaces the old 400 m soft-lock rule (01).
3. ~~Crash recovery keeps the pick~~ superseded by brief 04 (Nathan 2026-10-04): an interrupted ride is
   never resumed or rescored; it is saved as a free activity (under 30 fixes: discarded). `pickId` stays
   in the marker only for a UI remount's route line.
4. **Poor-accuracy first-anchor re-seed** (cycle 023 fix 2) kept but only while no gate has fired (01).
5. **Old data stays readable**: `lock`/`lockChange` types and validators stay; GPX+ of OLD rides is
   byte-identical; NEW rides export distance+fidelity from their gate events and no `<qf:wayLock>` (02).
6. **`displayTrack` (cycle 20 brief 06) is deleted** — it equals `track` now (01/02).
7. **Dot-on-top fix is a layer-order fix in `wayMapView.tsx`**, not a z-index (MapLibre paints in mount
   order) (03).
8. The WorkNew root cause is **inferred from code** (no pick -> auto-lock). To verify on the ride's
   events file: a `pick` event with `wayId: null`, then a `lock`/`lockChange` for WorkZoo.
9. Tests retired by brief 01 without a log (inspector minor): `live: late anchor ...` and
   `live cycle20-06 E5 ...` — both needed a re-seed after a gate had fired, which invariant 6 now forbids
   (L6 pins the new rule). Corrected brief 01-03 counts: 22 tests deleted (20 live_suite, 1
   live_colour, 1 recordflow `a lock outranks the pick hint`), 14 added; 852 - 22 + 14 = 844. (2026-10-04, brief 04)
10. (brief 04, D1) "Interrupted" = this JS launch restored the marker from disk (`restoration === 'relaunch'`), or the service is dead. A `'remount'` with the service running keeps running and gets the route-line fix.
11. (brief 04, D2) Recording stops at the interruption: fixes delivered after a headless relaunch are dropped, not appended. The service is stopped headlessly; the free save waits for the RECORD mount (`markRideFree` needs the stores, `whenStoresReady`).
12. (brief 04, D3) Saved through the existing virgin-cycle20 08 free path (`stopTracking` + `markRideFree`): no new machinery.
13. (brief 04, D4) Under 30 raw fixes (~30 s) the interrupted ride is deleted silently; if the delete fails it is filed free.
14. (brief 04, D5) `pickId` stays in `ActiveSession`/marker (and `sessionMarker.ts`): it only feeds the remount's route line, never a re-arm.
15. (brief 04, D6) Rider text `Interrupted · saved as free activity` (36 chars), 5 s hold; no text for a discarded ride.
16. (brief 04, D7) No tests deleted; one engine test retitled (`live: engine started mid-ride on a pick (partial buffer) ...`). Rulings R1 (stale comment fixed, not the test regex) and R2 (ui-strings entry inserted in sorted position) applied.

## Needs your ruling (non-blocking — executors do NOT wait for these)
- R1: is "no auto-match for 'new'-end rides, ever" what you want, or should the post-ride naming card
  at least SUGGEST an existing way when the GPS clearly followed one? (Default taken: no suggestion;
  today's naming offer is unchanged.)
- R2: a picked ride where you actually ride another road keeps being scored as *missed sectors on the
  pick* (rule since 2026-08-29, unchanged). OK?
- R3: cycle 20 is still uncommitted and untested on the phone. Cycle 21 piles on top of it; if cycle 20
  needs a revert, engine.ts/RecordScreen.tsx edits interleave — commit cycle 20 first if you want a
  clean rollback point.
