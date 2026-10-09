# 03 — RECORD slogan digest ("same activity · new meaning")

Date: 2026-10-08. Digest only: no code, docs or tests were edited. Source of request: `cycles/virgin-cycle27/00-nathan-ideas.md` idea 3 (Nathan: change "same activity - new meaning" to "same route - new meaning").

## TL;DR
- Runtime string is one inline JSX literal: `app/src/ui/RecordScreen.tsx:1671` `{yellowSub('same activity · new meaning')}`. It uses the middle dot `·`, not the hyphen Nathan typed.
- Allowlist entry `app/tests/ui-strings.allow.json:858` must match the code text exactly; a code-only edit makes the guard report STALE + UNLISTED.
- Old string is 27 chars; "same route · new meaning" is 24 chars. Both are under the 40-char limit, and neither has an em dash, so no run.ts rule fires on length or dash.
- Vocabulary: visible text says "activity" (cycle20 ruling); Route = parent from→to path, Way = variant (STATE.md:35-44, GLOSSARY.md:12-18). "same route" fits the route term.
- Only test referencing the live literal is `app/tests/ui_strings_suite.ts:41,49` (in-memory fixture plus expected list). Live-tree guard test location not confirmed.

## 1. Every occurrence (slogan and close variants)
Runtime / allowlist / test (live tree):
- `app/src/ui/RecordScreen.tsx:1671` — RUNTIME, `{yellowSub('same activity · new meaning')}` (inside the RECORD `Pressable`, ~1660-1672).
- `app/tests/ui-strings.allow.json:858` — ALLOWLIST, `"text": "same activity · new meaning"`.
- `app/tests/ui_strings_suite.ts:41` — TEST fixture, a JSX source string in an in-memory extractor test.
- `app/tests/ui_strings_suite.ts:49` — TEST expected list, `'text|same activity · new meaning'`.
- `app/dist/_expo/static/js/android/AppEntry-922a86ac25ec17cff724cc2cba8f4399.hbc.map:1` — BUILD artifact (sourcemap). Stale until the next build; not source.

Docs / design (not runtime):
- `cycles/virgin-cycle27/00-nathan-ideas.md:9,60,62` — Nathan's idea text (hyphen form) and the request to change it to "same route - new meaning".
- `cycles/virgin-cycle27/NOTES.md:10` — session note for idea 3.
- `cycles/virgin-cycle20/05-ride-to-activity-visible-text.md:218,670` — brief that renamed "same ride" → "same activity".
- `cycles/virgin-cycle20/08-remove-clutter-text.md:56,276,280,800,1060` — clutter brief; 276 is the old "same ride" line, the others say "same activity".
- `cycles/virgin-cycle20/09-ALLOWLIST-REVIEW.md:145`, `09-clutter-guardrails.md:58,305,307`, `CLUTTER-AUDIT.md:16,25,29,31,45,85`, `CLUTTER-REVIEW.md:35` — review docs; mostly old "same ride · new meaning".
- `cycles/virgin-cycle14/07-record-button-slogan.md` (parked brief, 10 hits) — origin of the slogan ("same ride · new meaning"). Its line refs (1487-1516, 1511-1514 "arms the ride") are obsolete: the RECORD button is now at ~1660-1672.
- `cycles/virgin-cycle16/05-gps-off-warning-in-button.md:6,7,53,167,404,411,452` — brief using "same ride · new meaning" for the GPS-off flash.

Not slogan matches (ignore): generic "same ride"/"new meaning" prose in `app/src/location/index.ts:567`, `app/src/store/freeRides.ts:159`, `app/src/ui/lastRide.ts:147`, `app/src/ui/resultsPlotModel.ts:23`, `app/src/ui/rideHistoryModel.ts:34`, `app/src/ui/wayAssetRuntime.ts:3`, `app/core/PARITY.md:64`, several test names/comments.

## 2. How the slogan is rendered on RECORD
- Component: `RecordScreen` (`app/src/ui/RecordScreen.tsx`). The caption is an inline literal passed to the helper `yellowSub` (defined 642-650).
- `yellowSub(caption)` returns `null` when `flashMsg === null` and `caption === ''`. Otherwise it renders `flashMsg ?? caption`, where `flashMsg` is a transient message that replaces the caption with an opacity fade.
- Transient messages that replace the slogan: `GPS_OFF_MSG = 'Location (GPS) is turned off'` (102, 2000 ms hold) and `NO_SPORT_MSG = 'No sport configured yet'` (112, 1000 ms hold).
- Variants by state: the slogan literal is used once (1671). The START screen uses `yellowSub('')` (1283), so it shows no sub-label there. No armed/recording/ending variant of the slogan exists. No day/night variant: the mode pill (1515) toggles `☾ night` / `☀ day` but does not change the caption.
- Construction: a single string literal. Not built from pieces, no noun substitution, no helper or model function builds it.
- Gating (label uncertain): CLUTTER-AUDIT.md:25 says it shows "only in setup phase when at least one sport exists". The setup form is inside `{noSport ? null : (...)}` starting at 1550. I did not confirm the exact enclosing condition of the 1671 Pressable.

## 3. Allowlist entry and run.ts rules
- Entry (`app/tests/ui-strings.allow.json` ~855-861): `file: "src/ui/RecordScreen.tsx"`, `kind: "literal"`, `text: "same activity · new meaning"`, `reason: "bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)"`, `since: "2026-10-02"`, `by: "bootstrap"`. No `long` flag.
- Rules in `app/tests/ui_strings_extract.ts`:
  - `MAX_LEN = 40`: text longer than 40 chars needs `long: true` (rule `too-long`).
  - Em dash (U+2014) is a HARD rule (`em-dash`), cannot be waived. The app convention is `' · '`.
  - Alert body max 20 words (`alert-words`), not applicable to a literal.
  - Reason ≥12 chars, `since` YYYY-MM-DD, `by` required (`no-reason`).
  - Code/entry mismatch: `stale` if an entry text is not in code; `unlisted` if a code string is not in the allowlist.
  - Banner-style boxes are forbidden (not applicable here).
- Old text: "same activity · new meaning" = 27 chars. Under 40: no `too-long`. No em dash.
- Candidate "same route · new meaning" (middle dot) = 24 chars. Under 40, no em dash.
- Candidate "same route - new meaning" (hyphen, as Nathan typed) = 24 chars. Also under 40, not an em dash (ASCII hyphen). The app's stated convention is `·` (cycle14 brief).
- Any change must update both the code literal and the allow entry text together. Changing only one fails the guard (stale or unlisted).

## 4. Other RECORD-screen visible text on the activity/route/ride vocabulary
Current agreed vocabulary:
- Cycle20 ruling (`cycles/virgin-cycle20/05-ride-to-activity-visible-text.md:3-8`): every user-visible string says "activity/activities" instead of ride; code, ids, files, storage and comments keep "ride".
- Route = from→to path between two landmarks (parent). Way = one named variant of a route (`STATE.md:35-44`, `GLOSSARY.md:8-18`, virgin-cycle3, 2026-09-06).
- Visible strings on RECORD found by the scan (`app/src/ui/RecordScreen.tsx`):
  - `117` `INTERRUPTED_MSG = 'Interrupted · saved as free activity'` — "free activity" (consistent with the ruling; the GLOSSARY still says "free ride"; GLOSSARY is a doc). Whether this text is shown on RECORD: uncertain.
  - `1015` Alert title `'Discard activity?'` — consistent.
  - `1493` `Discard activity` — consistent.
  - `1371` `accessibilityLabel="This activity was a different way"` — accessibility label only; consistent.
  - `940`, `958` Alert `'Could not create the route'` — uses "route" consistently with the GLOSSARY.
- No visible "ride" string found in `RecordScreen.tsx` (non-comment). The scan was a regex over lines and may miss strings split across lines or strings in imported modules (`recordFlow.ts`, `routeNamingCard.tsx`, not checked). Treat as "none found", not "verified none".

## 5. Tests asserting the string
- `app/tests/ui_strings_suite.ts:41` — in-memory JSX fixture containing the literal.
- `app/tests/ui_strings_suite.ts:49` — expected extractor output `'text|same activity · new meaning'`. This is tied to the fixture at 41, not the live file, so it should not change with the live string (inferred from the test's in-memory design; not run).
- The live-tree guard (checks `RecordScreen.tsx` against `ui-strings.allow.json`) is described in `ui_strings_suite.ts` header; the exact test line was not read.
- No other test under `app/tests/` contains the slogan.

## Unverified / uncertain
- Exact enclosing condition of the RECORD Pressable at `RecordScreen.tsx:1671` (setup-only, sport-count gating). Based on CLUTTER-AUDIT.md:25 and cycle20/08, not re-read in code.
- Whether `INTERRUPTED_MSG` (117) is ever rendered on RECORD.
- The live-tree guard test's line number in `ui_strings_suite.ts` (only lines 1-60 read).
- `GLOSSARY.md` still uses "ride"/"free ride" in prose; only app visible strings were checked against the ruling.
- Whether `dist/` sourcemap is in git or rebuilt on publish (not checked).
- Nathan's exact intended punctuation: idea doc shows hyphen; app convention is `·`. Not decided here.
