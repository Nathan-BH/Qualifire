# virgin-cycle21 — OPEN-ITEMS (decisions taken for Nathan; he can overrule any)

## Decisions taken (all inside the briefs)
1. **No pick = no reference.** A ride with no pick (any 'new' end, or a pick outside the sport-scoped
   set) gets NO route line, NO sectors, NO selfs, no auto-match during OR after the ride; the trail is
   shown and the post-ride naming/free-ride flow handles it (01, 03). Consequence: riding a known way
   after choosing 'new' no longer matches that known way by itself.
2. **A picked ride is the pick from START**, and is "unmatched" at the end only if the pick's candidate
   never fired a single gate (accidental START) — replaces the old 400 m soft-lock rule (01).
3. **Crash recovery keeps the pick**: `pickId` is stored in the session marker; markers from before this
   cycle have none -> no reference after a relaunch of an old ride (02).
4. **Poor-accuracy first-anchor re-seed** (cycle 023 fix 2) kept but only while no gate has fired (01).
5. **Old data stays readable**: `lock`/`lockChange` types and validators stay; GPX+ of OLD rides is
   byte-identical; NEW rides export distance+fidelity from their gate events and no `<qf:wayLock>` (02).
6. **`displayTrack` (cycle 20 brief 06) is deleted** — it equals `track` now (01/02).
7. **Dot-on-top fix is a layer-order fix in `wayMapView.tsx`**, not a z-index (MapLibre paints in mount
   order) (03).
8. The WorkNew root cause is **inferred from code** (no pick -> auto-lock). To verify on the ride's
   events file: a `pick` event with `wayId: null`, then a `lock`/`lockChange` for WorkZoo.

## Needs your ruling (non-blocking — executors do NOT wait for these)
- R1: is "no auto-match for 'new'-end rides, ever" what you want, or should the post-ride naming card
  at least SUGGEST an existing way when the GPS clearly followed one? (Default taken: no suggestion;
  today's naming offer is unchanged.)
- R2: a picked ride where you actually ride another road keeps being scored as *missed sectors on the
  pick* (rule since 2026-08-29, unchanged). OK?
- R3: cycle 20 is still uncommitted and untested on the phone. Cycle 21 piles on top of it; if cycle 20
  needs a revert, engine.ts/RecordScreen.tsx edits interleave — commit cycle 20 first if you want a
  clean rollback point.
