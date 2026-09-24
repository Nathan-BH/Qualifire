# virgin-cycle13 — trim the no-sport RECORD copy

**Status (2026-09-24): code change made, committed.** 634 tests: 631 pass, 0 fail, 3 skip
(unchanged). `tsc --noEmit` clean. JS-only — ships via `publish-preview.cmd`, no new build
needed (see `COMMANDS.md`).

## What prompted this

Nathan, reviewing the RECORD screen's zero-sports state (see `self-dot-tuning.md`'s chat
for the full text inventory of that screen -- same cycle, different task): the
explanatory body sentence and the button's "GO TO SETTINGS" label both read as
AI-generated filler for a screen state a real user should be able to read at a glance. His
framing: "this kind of long descriptive ai text should leave most of the app by now if i
want this to be taken seriously and used by real people."

## Fix applied

`app/src/ui/RecordScreen.tsx`, the `noSport` branch only (zero sports created in
SETTINGS -> SPORTS yet) -- text only, no logic/behaviour change:

1. **Start-flow card.** Dropped the body sentence ("Rides belong to a sport — bike, run,
   walk, whatever you call it. Add one in SETTINGS -> SPORTS, then come back."). The label
   now carries the destination itself:
   - before: `SET UP A SPORT FIRST` (label) + the sentence above (body)
   - after: `SET UP A SPORT FIRST — GO TO SETTINGS` (label only, nothing else)
2. **Big yellow button.** No longer swaps its own big top line for "GO TO SETTINGS" -- it
   now always reads the same as the normal RECORD button. Only the subtext under it changes
   to flag the missing sport:
   - before: `GO TO SETTINGS` (big line) / `add a sport to start recording` (subtext)
   - after: `● RECORD` (big line, same as the normal button) / `no sport selected` (subtext)

Tapping the button still routes to SETTINGS while `noSport` is true (`onPress` unchanged) --
only what it displays changed, per Nathan's framing ("keep it as record, which is what it
should be").

## Tests

```
cd app
node --experimental-strip-types tests/run.ts
```
-> 634 tests: 631 pass, 0 fail, 3 skip (identical counts -- no logic touched, text-only edit).

```
cd app
./node_modules/.bin/tsc --noEmit
```
-> clean, exit 0.

## Status

**Committed.** Only file changed: `app/src/ui/RecordScreen.tsx`.

## Not done / open items

- Not routed through Digest -> Plan -> Execute -> Inspect. Treated as a chore per
  `CLAUDE.md` rule 2 (mechanical text swap, zero ambiguity -- Nathan specified the exact
  wording for both spots).
- **No on-device re-check yet.** Nathan should glance at RECORD with zero sports configured
  (or a fresh/virgin install) to confirm the shortened label and the RECORD-styled button
  with "no sport selected" read the way he wants.
- **Broader scope flagged, not acted on.** Nathan's comment was framed as a general
  complaint ("this kind of long descriptive ai text should leave most of the app"), not a
  request to audit every screen. This task only touched the two spots he named on RECORD.
  A fuller pass over the rest of the app's copy is a separate task if he wants it.
- Ships as an OTA JS update (`publish-preview.cmd`), not a new numbered build.

| tier | model | tokens | outcome |
| --- | --- | --- | --- |
| chore (direct edit, no pipeline -- 2 text spots, exact wording given) | Sonnet 5 | ~15k | landed, tests+tsc pass, committed |
