# virgin-cycle13 — live-map self-dot tuning (size, own-dot opacity)

**Status (2026-09-24): code change made, committed.** 634 tests: 631 pass, 0 fail, 3 skip
(unchanged from before the change). `tsc --noEmit` clean. JS-only — ships via
`publish-preview.cmd`, no new build needed (see `COMMANDS.md`).

## What prompted this

Nathan noticed on the live-racing openmap rung that his own rider dot looked noticeably
bigger than the "self" dots (past-ride replays) and was fully opaque, so a self dot
directly under his own was completely hidden. Investigated `app/src/ui/wayMapView.tsx`
(the MapLibre/openmap rung — self dots are only drawn there, never on the PNG fallback
rung) and confirmed the values as they stood:

| layer | radius (px) | opacity |
| --- | --- | --- |
| `rider-dot` (own dot) | 7 | 1.0 (unset — fully opaque) |
| `self-dot` (past-ride replays) | 5 | 0.7 racing / 0.35 finished |

Two follow-up questions Nathan asked, answered from the code + `OPEN-ITEMS.md`:

1. **Why dim a finished self to 0.35 instead of just hiding it?** By design
   (`OPEN-ITEMS.md`, virgin-cycle11 DEMO overhaul note): "finished dots dim and park at
   FINISH." The dot stays parked at its finish position rather than vanishing, so you can
   still see where/when that self ended up relative to you and whoever is still racing —
   a dot disappearing mid-race would read as a bug, not information. 0.35 (half the 0.7
   racing-state opacity) demotes it below anything still live without erasing the context.
   That same doc explicitly flags size/opacity/stacking as values meant to be tuned by feel
   on-device (cycle6 R5 was "a starting point"), which is what this cycle does.
2. **Are self dots stacked fastest-over-slowest?** Yes. `selfDotsAt` (`selfRaceModel.ts`)
   ranks 1..n ascending by lap time and sets `sortKey = 100 - rank`, so the fastest self
   gets the highest sortKey. MapLibre's `circle-sort-key` draws higher values on top — the
   existing code comment confirms this: "stacks P1 above P2 ... P9." The rider's own dot is
   a separate source mounted after `selfs` regardless, so it's always on top of the whole
   field.

## Fix applied

`app/src/ui/wayMapView.tsx` — three-line paint tweak, no logic/behaviour change beyond the
visual tuning:

- `self-dot` `circle-radius`: 5 → 6 (Nathan: size gap vs. the rider dot felt too obvious)
- `rider-dot`: added `circle-opacity: 0.85` (was unset / fully opaque) so a self dot
  directly underneath now shows through slightly
- Updated the stale comment above `self-dot`'s opacity expression ("every self sits under
  the rider's 1.0" → "...the rider's 0.85") to match

No change to colour, stroke, or the sort-key/mount-order stacking logic — Nathan didn't ask
for those to move.

## Tests

```
cd app
node --experimental-strip-types tests/run.ts
```
→ 634 tests: 631 pass, 0 fail, 3 skip (identical counts to before the change — nothing in
`selfRaceModel.ts`'s pure logic touched, this is paint-only).

```
cd app
./node_modules/.bin/tsc --noEmit
```
→ clean, exit 0.

## Status

**Committed.** Only file changed: `app/src/ui/wayMapView.tsx`.

## Not done / open items

- Not routed through Digest → Plan → Execute → Inspect. Treated as a chore per
  `CLAUDE.md` rule 2 (three mechanical paint-value lines, zero ambiguity — Nathan specified
  the exact direction for each: radius 6, "reduce own-dot opacity just a bit").
- **No on-device re-check yet.** Nathan should glance at the live map next time selfs are
  present (DEMO tab → TENTH RIDE is the fastest way to see a full field, per
  `OPEN-ITEMS.md` item 7) and confirm radius 6 / opacity 0.85 read the way he wants — these
  are exactly the kind of values `OPEN-ITEMS.md` flags as meant to be judged by eye on the
  phone, not finalized from a diff.
- Ships as an OTA JS update (`publish-preview.cmd`), not a new numbered build — see
  `COMMANDS.md` in this folder.

| tier | model | tokens | outcome |
| --- | --- | --- | --- |
| chore (direct edit, no pipeline — 3 mechanical paint lines) | Sonnet 5 | ~15k | landed, tests+tsc pass, committed |
