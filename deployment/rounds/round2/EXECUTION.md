# EXECUTION -- BRIEF-01 (deployment round 2)

Date: 2026-10-05. Executor: Sonnet. No deviations. No stops.

## Files touched
- `app/eas.json` -- lines 1-15 matched; added `,` after virgin block and new `play` block (+7 lines).
- `scripts/publish-play.ps1` -- NEW, extracted programmatically from brief section 3.1 (237 lines, LF).
- `scripts/README.md` -- new row after the publish-preview row (line 7 anchor matched).
- `deployment/CURRENT-STATE.md` -- 5a date (line 1), 5b play table row after line 70, 5c two-line paragraph replaced, 5d tooling row after line 95, 5e decision paragraph appended at end of `## 8. Cost of the status quo` (last section, file end). All anchors at expected line numbers.
- `deployment/README.md` -- 6a round-2 paragraph after line 20, 6b files-table row after line 30, 6c line 52 replaced. Anchors matched.
- `OPEN-ITEMS.md` -- 7: anchor found at lines 180-185 (no shift); new bullet inserted at line 186, before the blank line and `## Housekeeping`.

## Commands and results
- eas.json check: `eas.json OK` (valid JSON, play profile asserts pass).
- diff publish-preview.ps1 publish-play.ps1: exit 1; hunks 2-10c2-14, 12c16, 16-18c20-28, 24-25c34-35, 28a39-45 (header block, lines 1-35 region); 32-34c49-52 (header), 70c88, 74c92, 90-91c108-115, 93-94c117-118, 143c167, 191c215, 196-198c220-222, 201c225, 207c231, 209c233-234. All within brief 3.3 regions.
- Structural check: publish-play.ps1 braces 48/48, parens 77/77, 237 lines, LF; publish-preview.ps1 braces 46/46, parens 70/70, 212 lines. All assertions passed.
- app.config.js load check (APP_VARIANT unset): true.
- tests: 848 tests: 845 pass, 0 fail, 3 skip.
- tsc --noEmit: exit 0.
- git status before/after diff: additions only ` M app/eas.json`, ` M scripts/README.md`, `?? scripts/publish-play.ps1` (CURRENT-STATE.md, deployment/README.md, OPEN-ITEMS.md were already M).
- git diff --stat on the five edited files: OPEN-ITEMS 17, eas.json 7, CURRENT-STATE 29, deployment/README 19, scripts/README 1 (stats include pre-existing working-copy changes).
- git diff on app/app.json, app/app.config.js: empty (only a CRLF warning).
- app/fingerprint.config.js: absent.

## Deviations
None.

---
## Post-inspection addendum (coordinator, 2026-10-06)

Opus inspection (`INSPECTION.md`) found D1: `app/eas.json` is part of the fingerprint, so the `play` profile this brief added moved the preview fingerprint. The profile was backed out (`app/eas.json` restored to the committed version, `git diff` empty, JSON valid, no `play` profile). The edited file is preserved as `DEFERRED-eas.json-with-play-profile.json`. Everything else in this log stands. See `PLAN.md` "Executed".
