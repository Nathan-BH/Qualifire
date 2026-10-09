# Exec report - record pairing (brief 11-brief-record-pairing.md + amendment) - STOPPED

Status: all edits of section 3 and A2/A3/A4 applied; baseline 958 tests (955 pass, 0 fail, 3 skip). After: 963 tests, 957 pass, **3 FAIL**, 3 skip. tsc --noEmit exit 0 (log: cycles/virgin-cycle27/exec-tsc-record-pairing.log). Stopped per STOP-ON-AMBIGUITY because 3 failures were not anticipated by the brief. I did NOT fix them.

## Files touched (my hunks)
app/src/store/landmarkUsage.ts, app/src/ui/RecordScreen.tsx, app/src/ui/recordFlow.ts, app/src/ui/settings.tsx, app/tests/landmarkusage_suite.ts, app/tests/recordflow_suite.ts, app/tests/ui-strings.allow.json (removed exactly: `src/ui/settings.tsx|attr:label|Start place`, `src/ui/RecordScreen.tsx|literal|START NOT DETECTED`, re-sorted round trip).
grep startMode src tests: only the settings.tsx scrub line plus the new test's own text.

## Failures (verbatim) and my proposed fixes (need Fable ruling)
1. `FAIL virgin-cycle20 08: clutter text is gone ... settings.tsx still has an em dash in a visible string: delete (saved as Record<string, unknown>).startMode; // virgin-cycle27 01 ... Start place row retired — the start is always detected ...`
   The scanner treats the comment line the amendment (A2.1) prescribes verbatim as visible text. Fix: replace the em dash in that comment with a hyphen/colon.
2. `FAIL ui-strings: ... STALE allowlist entry src/ui/settings.tsx [text] "STARTING AN ACTIVITY" no longer in the code: remove the entry`
   Deleting the whole card (A2.1) removes this heading; A4's table lists only two removals. Fix: remove that third entry (file src/ui/settings.tsx, kind text, text STARTING AN ACTIVITY, by bootstrap).
3. `FAIL virgin-cycle26 01: RECORD offers a loop pill ... exactly one loop pill` (tests/recordflow_suite.ts ~line 678) pins `<Pressable key={LOOP_ID} onPress={() => setTo(LOOP_ID)}`; section 3.4 changes it to pickTo(LOOP_ID). Fix: update that pin's regex to `pickTo\(LOOP_ID\)`.

## For Opus inspector
Shared-file hunks in RecordScreen.tsx are interleaved with cycle26/earlier briefs. Re-arm setToExplicit(false) added at sport switch, ride end (~l.819) and discard (~l.1056).

## RESOLVED (Fable ruling, ruling-record-pairing-escalation.md)
Applied all three fixes: (1) settings.tsx:102 comment em dash -> comma; (2) removed allow entry `src/ui/settings.tsx|text|STARTING AN ACTIVITY` (by bootstrap); (3) recordflow_suite.ts:678 loop-pill pin now matches `pickTo(LOOP_ID)`.
Allow-list removals by this brief (three): `src/ui/settings.tsx|attr:label|Start place`, `src/ui/RecordScreen.tsx|literal|START NOT DETECTED`, `src/ui/settings.tsx|text|STARTING AN ACTIVITY`.
Final: 963 tests, 960 pass, 0 fail, 3 skip (baseline 958/955/0/3). tsc --noEmit exit 0. Status: DONE.
