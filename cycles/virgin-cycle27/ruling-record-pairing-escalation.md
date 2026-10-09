# Ruling — record-pairing escalation (brief 11-brief-record-pairing.md + AMENDMENT)

Fable, 2026-10-09. Read: the brief, `exec-report-record-pairing.md`, the working-tree diff of
`settings.tsx`, `recordflow_suite.ts`, `ui-strings.allow.json`, and the live `RecordScreen.tsx`.
All three failures are brief omissions, not executor errors. None of the fixes weakens a test.

## 1. Em dash in the settings.tsx scrub comment — APPROVED (exact text below)
The `virgin-cycle20 08` clutter scan drops comment-ONLY lines, but `:102` is code + trailing comment,
and `Record<string, unknown>` supplies the `>` the regex `['"\`>][^'"\`<]*\S — \S` keys on. Replace the
whole trailing comment so it matches the three scrub lines above it (`retired, always on` style):

```ts
        delete (saved as Record<string, unknown>).startMode; // virgin-cycle27 01 (Nathan 2026-10-08): Start place row retired, the start is always detected, pills stay tappable
```
(em dash → `,`). The A3 test's `^.*\.startMode;.*$` exception still matches this line.

## 2. STALE `src/ui/settings.tsx [text] "STARTING AN ACTIVITY"` — APPROVED
A1 already said the whole card incl. the heading goes; A4's table simply missed the heading's entry.
Remove the entry at `ui-strings.allow.json:3233-3240` (`file: src/ui/settings.tsx`, `kind: text`,
`text: STARTING AN ACTIVITY`, `by: bootstrap`). Python read-modify-write, re-sorted, as per EXECUTOR-RULES.
The brief-6 allow-list diff is therefore exactly THREE removed entries (`Start place`, `START NOT DETECTED`,
`STARTING AN ACTIVITY`); quote all three in the report. Any other STALE/UNLISTED still means STOP.

## 3. cycle26 01 pin on the loop pill — APPROVED with exact text
`recordflow_suite.ts:678` must follow §3.4. New line:

```ts
  assert((src.match(/<Pressable key=\{LOOP_ID\} onPress=\{\(\) => pickTo\(LOOP_ID\)\}/g) ?? []).length === 1, 'exactly one loop pill');
```
Intent preserved: still pins exactly one loop pill, keyed `LOOP_ID`, whose tap sets `to` to `LOOP_ID`
(now via `pickTo`, which is `setTo(id)` + `setToExplicit(true)`). The new cycle27 pin separately asserts no
`onPress={() => setTo(` survives and that all three GOING TO pills use `pickTo`, so the two pins together
are stricter than before. Verified live: `RecordScreen.tsx:1622` is
`<Pressable key={LOOP_ID} onPress={() => pickTo(LOOP_ID)}`.

## Other leftovers checked
- Test count 963 = baseline 958 + 5 (four landmarkusage + one recordflow pin; the rewritten
  effectiveFromId test keeps the count) — matches A5.1. Expected after fixes: 963 / 960 pass / 0 fail / 3 skip.
- `grep "setTo("` on RecordScreen.tsx: only `pickTo`'s own, the sport-switch reset (`:305`) and the effect
  (`:1170`) — §5.5 holds.
- The Seg words `detect` / `choose` have no allow-list entries (as A1 predicted) — nothing to do.
- The large allow-list diff in the working tree also carries briefs 03/07/10 and cycle23-05 hunks from
  earlier executors; those are NOT brief 6's and must not be touched. Attribute by content in the report.
- Re-run the full suite + `tsc --noEmit` after the three edits; then finish the report per §8/A7.
