# 10 — Rename "share" wording to "export" in Data settings

**Source (Nathan, verbatim):** "Also in the Data settings section; it does not make sense to call this 'share' options; replace it with 'export'; and also adapt the explanatory text to say export instead of share when the help icons are shown"

**Status:** parked — do not execute until Nathan asks.

**Executor rules:** stop-on-ambiguity; no commit; no delete.

## Goal
Replace the user-facing "share" terminology in the Data settings section with "export" — both the button labels and the help/hint explanatory text.

## Current state (confirmed by direct grep, no subagent needed — mechanical text-only chore)
All in `app/src/ui/settings.tsx`:
- Line 245: `Alert.alert('Nothing to share yet', ...)`
- Line 250: `else if (res.method === 'share-text') Alert.alert('Shared', ...)`
- Line 252: `Alert.alert('Share failed', ...)`
- Line 333 (Reset-to-virgin warning copy): `"...Export anything you want to keep first (RIDES → Export GPX+, or the two share buttons above)."`
- Line 650: `hint="Share catalog.user.json — every place, way and route created on this phone."`
- Line 655: `<Text style={[st.shareText, { color: t.text }]}>share</Text>` (button label, catalog export row)
- Line 659: `hint="Share refs.user.json — the line of each way, built from its reference ride. Per-ride GPX+ export lives on RIDES."`
- Line 664: `<Text style={[st.shareText, { color: t.text }]}>share</Text>` (button label, refs export row)
- Internal style/function names (NOT user-visible): `shareBtn`/`shareText` styles (lines 698-699, also reused for the unrelated sport rename/delete/add buttons at 508-544 — do not rename these style objects, see Decisions), `shareStoreFile()` function (line 241), code comments at lines 201, 238, 240, 667-668 referencing "share".

## Decisions
- Change every USER-VISIBLE string containing "share"/"Share" in the Data section to "export"/"Export":
  - Button labels (655, 664): `"share"` → `"export"`.
  - Hint texts (650, 659): `"Share catalog.user.json..."` → `"Export catalog.user.json..."`; `"Share refs.user.json..."` → `"Export refs.user.json..."`.
  - Line 333: `"...or the two share buttons above."` → `"...or the two export buttons above."`.
  - Alerts: `'Nothing to share yet'` → `'Nothing to export yet'`; `'Shared'` → `'Exported'`; `'Share failed'` → `'Export failed'`.
- **Leave "share sheet" wording alone** where it refers to the OS's actual native Share Sheet UI (line 250's message body: "sent as text via the share sheet") — this is a correct technical description of the iOS/Android system mechanism the export goes through, not the app's own terminology choice, so it should stay accurate. Flagged as a Decision rather than silently changed.
- **Do NOT rename internal style objects** `shareBtn`/`shareText` (lines 698-699) — they're reused generically for the sport rename/delete/add buttons elsewhere in the same file (lines 508-544), unrelated to the Data section's export feature; renaming them is a larger, purely-cosmetic refactor Nathan didn't ask for. Flag as an optional follow-up if Nathan wants full internal-naming consistency later.
- **Do NOT rename `shareStoreFile()`** (line 241) or touch code comments (201, 238, 240, 667-668) — internal-only, no user-visible effect. Optional future cleanup, out of scope here.

## Files to touch
- `app/src/ui/settings.tsx` only — the ~8 user-visible string occurrences listed above.

## Verification plan
Confirm current test baseline before landing (may shift if other parked cycle15 briefs land first). After the change: `grep -in "share" app/src/ui/settings.tsx` should show only the internal style names (`shareBtn`/`shareText`), `shareStoreFile()`, the "share sheet" OS-mechanism sentence, and the untouched code comments — no other user-visible "share" text should remain in the Data section. Check `app/tests/` for any test asserting the literal strings "share"/"Share" as rendered Data-section text; update if found.

## On-device checklist
Open Settings → Data section: confirm both rows now say "export" as the button label, confirm both hints read "Export ..." instead of "Share ...", confirm the Reset-to-virgin warning copy says "export buttons" not "share buttons", trigger a nonexistent-file case to see "Nothing to export yet", and do one real export to see "Exported" (not "Shared") in the success alert.

## Out of scope
- Internal style/function names (`shareBtn`, `shareText`, `shareStoreFile`).
- The "share sheet" OS-mechanism phrase.
- Code comments.

## What this changes on Nathan's phone
Only wording in the Data settings section — button labels, hints, and alert copy switch from "share" to "export" terminology. No behavior change; the export mechanism (which happens to route through the OS share sheet) is unchanged.

## Open questions
None — fully specified.
