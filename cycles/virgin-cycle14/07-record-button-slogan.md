# 07 — RECORD button: slogan instead of "arms the ride · nothing starts yet"

**Source: Nathan, idea #10 (tester feedback; tester not named).** On the RECORD screen's record
button, remove the "arms the ride..." text entirely and put the slogan in its place: `same ride
· new meaning`, with the middle dot the app already uses (not the `.` he typed in chat).

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (HEAD `4e808c4`). Executor: Sonnet,
cold, this file only. Small task: one file, one string swap, one comment line.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-09-26. If a quoted line
  is not where the brief says, **stop and report the mismatch verbatim** (file, line,
  expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete anything —
  `safe_to_delete/` is the bin.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `GLOSSARY.md`,
  `design/`, or any `cycles/virgin-cycle1..13/` doc.

## Goal

The idle RECORD button reads `● RECORD` / `same ride · new meaning`. The zero-sports variant
(`● RECORD` / `no sport selected`) and every other screen state are untouched.

## Context

All of it is in `app/src/ui/RecordScreen.tsx` (1717 lines). The "arms the ride" text has
**exactly one site** — the idle (`setup`-phase) RECORD button, lines 1495-1516:

| line | current code |
| --- | --- |
| 1487-1494 | comment block, starts `      {/* RECORD — arms the ride (Cycle 024, WP-A2, Nathan 2026-08-19): plays` and ends `          the missing sport. */}` |
| 1495-1499 | `<Pressable style={[styles.bigBtn, styles.startYellow, busy && styles.busy]} … onPress={noSport ? () => tabNav.go('settings') : onRecord}>` |
| 1500-1504 | `{noSport ? (` → `● RECORD` + `no sport selected` (cycle13 `record-no-sport-copy.md`) |
| 1511 | `            <Text style={[styles.bigBtnText, styles.startText]}>{'●'} RECORD</Text>` |
| 1512-1514 | the subtext — see below |

Lines 1512-1514, verbatim:

```tsx
            <Text style={[styles.bigBtnSub, styles.startSub]}>
              arms the ride · nothing starts yet
            </Text>
```

It does not vary by state: no helper or model function builds it, it is an inline JSX
literal, and it renders whenever `noSport` is false — start mode, sport, picked way and
`busy` (only dims the button) do not change it. `grep -rn "arms the ride\|nothing starts yet"
app/src app/App.tsx app/tests` → line 1513 only. The comment on 1487 also says "arms the
ride" — that is the developer's phrase for what the press does (plays the launch mark, then
the armed screen with START), still true, and it stays.

**Other states, all untouched:** `armed` phase shows `START` / `the clock runs from here`
(1097-1098, same `bigBtnSub`/`startSub` styles); recording shows the slim amber
RESUME/END bar; `noSport` shows `no sport selected` (1503). The slogan is never on screen
while recording — the idle button is not rendered then.

**Middle dot convention:** the app writes `·` (U+00B7) with one space each side —
`free ride · gates only` (818), `recording continues · resume or end` (1285), `demo · nothing
is recorded` (`DemoScreen.tsx:397`), and the old line itself. The file is UTF-8 (`file` →
"Unicode text, UTF-8"), no CRLF, and already holds the character; type it literally, no
escape, and do not let the editor re-encode the file (virgin-cycle12 fixed exactly that kind
of mojibake in a sibling file).

**Case convention:** every `bigBtnSub` string is lowercase, no `textTransform` on those styles
(`bigBtnSub: { color: t.textDim, fontSize: 12, letterSpacing: 1 }`, `startSub: { color:
t.onAccent, opacity: 0.75 }`, 1706-1707). Nathan typed it lowercase; it stays lowercase.

**Fit:** the button is `alignSelf: 'stretch'`, 150 px tall, content centred (`bigBtn`,
1662-1670). The new string is 23 characters against the old 34 — shorter, one line on any
phone. Same slot, same 12 px dim-on-yellow style at 0.75 opacity: a quiet caption under the
40 px `RECORD`. No style change.

**The slogan elsewhere:** nowhere in `app/`. The marketing side uses **"Same road. New
meaning."** (`marketing/website/index.html:439` `<h1>`, the brandmark teasers' tagline in
`marketing/audio-studio/brandmark/*`). Nathan wrote *ride*, not *road* — see Open questions;
the brief ships his words.

**Tests:** nothing asserts on the old string (`grep -rn "arms the ride\|nothing starts" app/tests`
→ nothing). `recordflow_suite.ts` tests `recordFlow.ts`'s pure rules, not screen copy. Counts
must be unchanged.

## Decisions (already made — do not reopen)

1. **New subtext: `same ride · new meaning`** — Nathan's words verbatim, lowercase, spaced
   middle dot per the convention above. Inline literal, no new constant: one site, one file.
2. **Only the `arms the ride` line is replaced.** The `noSport` branch keeps `no sport
   selected` (cycle13, Nathan's own wording — the subtext is the only thing flagging the
   missing sport there). START's `the clock runs from here` stays.
3. The 1487 comment keeps "arms the ride" (developer phrase, not user-visible); one line is
   added to it so the next reader knows the caption is now a slogan.

## Changes (all in `app/src/ui/RecordScreen.tsx`)

**A. Replace the string.** Line 1513 is exactly
`              arms the ride · nothing starts yet` →
`              same ride · new meaning`
(same 14-space indent; lines 1512 and 1514 unchanged).

**B. Comment.** Line 1494 is exactly `          the missing sport. */}`. Change it to
`          the missing sport. virgin-cycle14 brief 07 (Nathan #10): the caption`
and insert directly below it
`          under RECORD is the slogan now, not the arming hint. */}`.
Net +1 line; file ends at 1718. Do A before B (B shifts nothing above 1494, but keep the
order so A's anchor is exact).

## Verification (executor runs all; report the actual numbers)

```
cd app && grep -rn "arms the ride\|nothing starts yet" src App.tsx tests   # exactly one hit: the 1487 comment line
cd app && grep -n "same ride · new meaning" src/ui/RecordScreen.tsx        # exactly one hit, line 1514 (was 1513 + B's insert) — check it prints the dot, not "Â·"
cd app && grep -c "no sport selected\|the clock runs from here" src/ui/RecordScreen.tsx   # 2 — untouched
cd app && file src/ui/RecordScreen.tsx                                     # still "UTF-8"; no CRLF (grep -c $'\r' → 0)
cd app && wc -l src/ui/RecordScreen.tsx                                    # 1718
cd app && node --experimental-strip-types tests/run.ts                     # 0 FAIL
cd app && ./node_modules/.bin/tsc --noEmit                                 # clean, exit 0
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/RecordScreen.tsx        # one file, ~3 lines
```

Baseline at writing: 638 tests, 635 pass, 0 fail, 3 skip. Other parked cycle14 briefs may
have moved it — **record the actual baseline before editing**, then confirm identical counts
after. If `tsc` blows the call budget, retry once with a longer timeout, then report — never
substitute a syntax-only check.

## On-device checklist (Nathan, after OTA — not the executor)

1. RECORD tab, a sport set up, idle: yellow button reads `● RECORD` over `same ride · new
   meaning`, one line, centred, the dot rendering as a dot.
2. Zero sports (or after Reset to virgin): button still reads `● RECORD` / `no sport selected`.
3. Press RECORD: launch mark, then `START` / `the clock runs from here` — unchanged.
4. Both themes: caption is the same dim-on-yellow as before.

## Out of scope / follow-up

- `design/canonical/record_setup_*.svg` and `design/make_screens.py:1616` still carry the old
  caption — design mockups, not the app; report, do not edit.
- Any other slogan placement (launch animation, about, store listing): not asked.
- The `ride`/`road` split with marketing — Nathan's call, see below.

## Interaction with briefs 01-06

This brief edits `RecordScreen.tsx` lines 1494/1513 only. **Brief 04** also edits
`RecordScreen.tsx` (B1, line 891, a deps-array trim) — different region, no overlap; if 04
lands first this brief's line numbers do not move (891 < 1494, same line count). 01/03 edit
`settings.tsx`, 05 `wayMapView.tsx`, 06 `DemoScreen.tsx`, 02 adds `ReplayScreen.tsx` and
touches `RideDetailScreen.tsx`/models — none touch these lines. Runs in any order.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only, one file, no dependency change, so it ships to
the Preview APK via `scripts/publish-preview.cmd` (EAS Update) — no numbered build, no
reinstall. Nothing changes on the phone until it is built and published.

## Open questions / assumptions (logged, not blocking)

- **"ride" vs "road".** Marketing's tagline everywhere is "Same road. New meaning."; Nathan
  typed "same ride". Default: his words, `same ride · new meaning`. If he meant the marketing
  line, the swap is one word on the same line. Flag for Nathan.
- **Lowercase + middle dot** (not `Same ride. New meaning.`) read from the button's sibling
  captions and his own "like it is now in the app". Same line to change if he wants title case.
- **Scope = this one caption.** The zero-sports subtext and START's caption are not "the
  arms the ride text" and stay; the 1487 code comment is not user-visible and stays.
- Tester not named in the source; recorded as such.
