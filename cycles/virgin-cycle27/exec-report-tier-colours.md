# Exec report: tier colours (brief 11-brief-tier-colours.md) — DONE

Decisions applied: Q2.1 = A (same hexes day+night, line+text), Q2.2 = A (2.8:1 preview floor). Brand yellow #F5C542 untouched.

## Files changed (git diff --stat, my files only)
app/src/ui/theme.ts 27 | app/src/ui/tierColour.ts 44 | app/src/ui/wayMapStyle.ts 4 (comment) | app/src/ui/wayMapView.tsx +1 (comment) | app/tests/ridedetail_suite.ts 33. 5 files, +63/-46. ui-strings.allow.json: untouched (diff empty). Backups: exec-backup-tier-colours/.

## Palette before -> after
- colors.purple: #9000C8 -> tierHex.purple #C364FF (alias)
- colors.green: #00D000 -> tierHex.green #007A00 (alias)
- colors.purpleDeep: #65008C -> #8946B3 (0.7 x C3/64/FF = 136.5/70/178.5 -> 89/46/B3, checked)
- colors.neutral #F5C542 unchanged (comment now says BRAND, not tier)
- YELLOW_TIER: colors.neutral #F5C542 -> tierHex.yellow #8C6900
- tierLineColour: #9000C8/#00D000/#F5C542 -> #C364FF/#007A00/#8C6900
- tierTextColour day: #9000C8/#007A00/#8C6900 -> #C364FF/#007A00/#8C6900; night: #C364FF/#00D000/#F5C542 -> #C364FF/#007A00/#8C6900
- New exports in theme.ts: tierHex, tierTextNight (= tierHex). PURPLE_TEXT_NIGHT/GREEN_TEXT_DAY/YELLOW_TEXT_DAY kept as aliases.

## Tests (ridedetail_suite.ts)
Rewrote per brief section 4: contrast floors 4.5 -> 2.8 (card and race ground, with dated note); the two "keeps brand" tests renamed/rewritten to assert tierHex in both themes; tierLineColour test; flash test; new single-source test (aliases, brand yellow unchanged, tierColour.ts has no hex outside comments).

## Verification
- Baseline: 954 tests: 951 pass, 0 fail, 3 skip (brief expected 940/937; other briefs/cycle26 already applied). tsc exit 0.
- After: 955 tests: 952 pass, 0 fail, 3 skip (+1 new test). tsc --noEmit exit 0 (exec-tsc-tier-colours.log empty).
- Grep #9000C8/#00D000 in app/src/ui: no remaining hits (comments in theme/tierColour/wayMapStyle were all updated).
- Contrast (computed, safe_to_delete/contrast27.ts), tier: day card / night card / day race.bg / night race.bg
  purple #C364FF: 3.19 / 5.02 / 3.19 / 6.21
  green  #007A00: 5.55 / 2.89 / 5.55 / 3.57
  yellow #8C6900: 5.08 / 3.15 / 5.08 / 3.90
- Static checks only; nothing rendered on a device.

## Deviations / surprises (no anchor mismatches)
1. Brief's new test snippets failed tsc (exit 2): (a) TS2367 comparing literal type '#8C6900' to '#F5C542' — fixed with `as string` casts; (b) TS2345 `readFileSync(new URL(...))` URL type clash — fixed with `fileURLToPath(new URL(...).href)`. Semantics unchanged.
2. wayMapView.tsx note sits inside a JSX block comment (moved, now ~line 855-864); I inserted the line as plain text without the leading `//`, before "Unearned sectors paint transparent". Original text of the note ("yellow-tier sector is now visually silent") remains, followed by the "no longer true" line.
3. `virgin-cycle23 03: sectorHighlightColours` test title occurs twice; the new test was inserted before the first (directly after the flash test).
4. tierColour.ts doc-comment: replaced the "Theme-aware ..." paragraph through "Every value passes WCAG 4.5:1 on its" and reworded the tail to "Contrast is computed in ridedetail_suite."; `colors` import in tierColour.ts is now unused but tsc is clean.
5. wayMapStyle.ts comment: hue "~283" also changed to "~277".

## Not done
No commit/push/publish. Nothing outside the five files.

## OPEN-ITEMS line for coordinator
Tier palette preview (cycle27 brief 02): Nathan judges on the phone in day + night, sector colours ON; contrast floor temporarily 2.8:1 in ridedetail_suite; reinstate 4.5 (or split tierTextNight) once settled.
