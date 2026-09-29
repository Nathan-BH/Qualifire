# virgin-cycle18 — 6 briefs written, NOT executed (2026-09-29)

Nathan fed ideas from his own test rides and tester feedback; each went through Haiku Digest ->
Fable Plan. Nothing here has been implemented; every brief is self-contained for a Sonnet
executor (stop-on-ambiguity), then a fresh Opus Inspect.

## Brief index

| # | file | idea | ships as | status |
| --- | --- | --- | --- | --- |
| 01 | `01-app-over-lock-screen.md` | show the app over the lock screen so a ride can be stopped without unlocking | **native rebuild** | briefed |
| 02 | `02-gate-edit-keeps-reference-self.md` | after editing gates the reference ride gave no dot / no sector colours (real cause: permanent "unmatched" marker, not gate deletion) | JS / OTA | briefed |
| 03 | `03-ride-running-notification.md` | running notification: live timer + current sector `S1`; **flame icons folded in** (assets in `assets-03/`) | **native rebuild** | briefed |
| 04 | `04-every-ride-has-a-place-in-results.md` | remove "plain ride"; every ride lands in RESULTS (route > way, or FREE RIDES); free-ride option on the RECORD card | JS / OTA | briefed |
| 05 | `05-no-duplicate-places.md` | no duplicate places: typeahead + exact-name refusal, plus rename and merge for existing twins (Nathan's two "Work") | JS / OTA | briefed |
| 06 | `06-post-ride-places-editable.md` | post-ride From/To are editable proposals, never etched (mirrors the auto-detect start pattern) | JS / OTA | briefed |

## Order and dependencies

- **JS chain, execute in this order:** 02 -> 04 -> 05 -> 06. 04 builds on 02's helpers and edits
  only the buttons block of `routeNamingCard.tsx`; 05 introduces the shared place picker; 06 reuses it.
  All four are OTA-able (`publish-preview.ps1`).
- **Native pair:** 01 and 03 are independent of each other and of the JS chain; one
  `build7.ps1` rebuild after both land. Once `app/modules/` exists in the tree the fingerprint
  moves and OTAs stop reaching the current Preview - so land/publish the JS chain BEFORE adding
  the native modules, or accept publishing only after the rebuilt APK is installed.
- Brief 01's test suite was amended (pure policy file; Node cannot import `expo`).

## Nathan's calls still open (defaults chosen in each brief, none blocking)

See the "Nathan's call" section at the end of each brief. Notable: 01 full screen vs reduced
lock-safe pane; 03 notification card colour (kept red, because expo-location colorizes the card);
05 merge in-brief vs split out; 02 block vs warn on an untimeable gate nudge.

## Not briefed / parked follow-ups

Long-ride "still recording" reminder, STOP button in the notification, auto-stop on stillness
(all from brief 03's out-of-scope list).
