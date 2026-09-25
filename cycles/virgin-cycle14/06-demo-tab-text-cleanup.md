# 06 — DEMO: drop the mode subtext, replace "Nothing is recorded."

**Source: Nathan, idea #9 (tester feedback; tester not named).** (a) Remove the descriptive
subtext under the ride-type choice on the DEMO tab — unnecessary. (b) Replace the line
"Nothing is recorded." with something like "Not part of final app - use only for testing
features".

**Status: brief only, parked. Nothing below is in the app.** Written 2026-09-26 by the Plan
tier (Fable) from anchor checks against the working tree (HEAD `4e808c4`). Executor: Sonnet,
cold, this file only. Small task: one file, one string swap, one block removed, one comment.

## Executor rules (binding)

- **Stop-on-ambiguity.** Every anchor was read from the tree on 2026-09-26. If a quoted line
  is not where the brief says, **stop and report the mismatch verbatim** (file, line,
  expected, found). Never guess, never patch around it.
- Do not commit unless told. If told: `GIT_OPTIONAL_LOCKS=0 git ...`; a leftover
  `.git/index.lock` gets `mv`'d aside, never deleted. Never delete anything —
  `safe_to_delete/` is the bin.
- Do not edit `README.md` in this folder, `STATE.md`, `OPEN-ITEMS.md`, `IDEAS.md`, `GLOSSARY.md`,
  or any `cycles/virgin-cycle1..13/` doc (history; they quote the old strings on purpose).

## Goal

The DEMO tab's idle chooser reads, top to bottom: `DEMO RIDE` / `Not part of the final app —
use only for testing features.` / the three pills / `RUN DEMO RIDE`. No sentence under the
pills. The full-screen run and its ending are untouched.

## Context

Everything lives in `app/src/ui/DemoScreen.tsx` (557 lines). The idle chooser is the last
`return` of the component, lines 471-508:

| line | current code |
| --- | --- |
| 473 | `      <Text style={styles.h2}>DEMO RIDE</Text>` |
| 474 | `      <Text style={styles.sub}>Nothing is recorded.</Text>` |
| 476-495 | `<View style={styles.pillRow}>` … three `Pressable` pills FIRST / SECOND / TENTH RIDE … `</View>` (line 495 is `      </View>`) |
| 496 | blank |
| 497-503 | the subtext — see below |
| 504 | blank |
| 505-507 | `<Pressable style={styles.btn} onPress={start}>` … `RUN DEMO RIDE` … `</Pressable>` |

Lines 497-503, verbatim:

```tsx
      <Text style={styles.sub}>
        {mode === 'first'
          ? "A stranger's first ride: no route, no gates, a trail growing behind the dot — then the card that names the route."
          : mode === 'second'
          ? 'Your second ride of a route: the line, the gates, the sector strip — then how it ranked, and the card.'
          : 'Your tenth ride: nine earlier rides to beat — the full timing tower climbs after STOP, then the card.'}
      </Text>
```

**What the "subtext below each type of ride" is:** the pills sit in one row (`pillRow`,
`flexDirection: 'row'`, each pill `flex: 1`); there is no per-pill caption. The subtext is
this single `<Text>` under the row whose sentence switches with the selected mode. The
strings are inline JSX literals — not fields in `demoModel.ts` (its mode type is a bare
`'first' | 'second' | 'tenth'` union; no `sub`/`desc`/`blurb` field exists). Nothing else
reads them: `grep -rn "stranger's first ride\|Your second ride of a route\|Your tenth ride"
app/src app/tests app/App.tsx` → only these three lines. Deleting the block is the whole change.

**"Nothing is recorded." (line 474)** is the only occurrence of that exact string in `app/`.
Two lower-case cousins live in the full-screen run, lines 397 and 401, and stay:

```tsx
        <Text style={styles.trackLine}>demo · nothing is recorded</Text>
            {demoStopOutcome(gatesDone) === 'ending' ? 'end the demo ride' : 'skips the demo · nothing is recorded'}
```

and the fake-save line (`demoModel.ts:170`, `… demo only, nothing saved`) still names the
outcome on the ending screen. So "a demo saves nothing" is still told to the user *inside*
the run, at the moment it matters; the idle line was a second, weaker copy of the same
fact. Nathan's literal wording therefore loses nothing significant — see Open questions.

**Punctuation convention:** user-visible strings use the em dash with spaces: `Ride saved —
${…}.` (`DemoScreen.tsx:418`, `RecordScreen.tsx:1127`), `SET UP A SPORT FIRST — GO TO SETTINGS`
(`RecordScreen.tsx:1379`), every multi-clause `hint=` in `settings.tsx` (e.g. `:565`, `:601`,
`:611`). No user string uses ` - `. Sentence case with a full stop is the `styles.sub`
style (`Nothing is recorded.`). Type the em dash as the character `—` (U+2014) — the file
is UTF-8 and already holds many; do not use a `—` escape and do not let the editor
re-encode the file (virgin-cycle12 was a mojibake fix in a sibling file).

**Tests:** `tests/demo_suite.ts` exercises `demoModel.ts` only (pure; no strings from
`DemoScreen.tsx`). `tests/virginmanifest_suite.ts:286-288` reads `DemoScreen.tsx` as text and
asserts it does **not** contain `ways.json` or the literal `'Morning'` — the new string
contains neither. No test asserts on `Nothing is recorded` or the three mode sentences
(`grep -rn "recorded\|stranger\|tenth ride" app/tests` → nothing about DemoScreen). Counts
must be unchanged.

## Decisions (already made — do not reopen)

1. **New line: `Not part of the final app — use only for testing features.`** Nathan's words,
   plus "the", an em dash for his hyphen, and a full stop — the tidy-up the convention above
   asks for. Same `styles.sub` slot, same style. Runner-up (keeps the recording fact on the
   idle screen too): `Not part of the final app — nothing is recorded, use only for testing
   features.`
2. **Delete the mode subtext block outright** (lines 497-503 plus one of the blank lines
   around it). No field removal in `demoModel.ts` — there is none. `styles.sub` stays: line
   474 still uses it.
3. The run-screen `nothing is recorded` lines (397, 401) and `demoSavedLine` stay as they are.

## Changes (all in `app/src/ui/DemoScreen.tsx`)

Order: A, B, then C — C adds a line above A/B's anchors, so doing it first shifts them by +1.

**A. Replace the line.** Line 474 is exactly
`      <Text style={styles.sub}>Nothing is recorded.</Text>` →
`      <Text style={styles.sub}>Not part of the final app — use only for testing features.</Text>`

**B. Remove the subtext.** Delete lines 496-503 (the blank line after `      </View>` on 495
and the seven-line `<Text style={styles.sub}>…</Text>` block), so the region reads:

```tsx
      </View>

      <Pressable style={styles.btn} onPress={start}>
```

i.e. pill row `</View>`, one blank line, the RUN button. Net −8 lines (557 → 549).

**C. Doc comment.** Lines 34-35 are exactly
` * The idle screen (below) is a plain chooser — pills, one description line,` /
` * RUN — and the map/pane only appear once a run starts. The run itself takes`.
Change them to
` * The idle screen (below) is a plain chooser — one caveat line, pills, RUN —` /
` * and the map/pane only appear once a run starts. The run itself takes`.
That paragraph ends at line 43 (` * (brief D); KEEP/SAVE GATES are theatre…`); line 44 is
the blank ` *`. Insert directly above line 44:
` * virgin-cycle14 brief 06 (Nathan #9): mode subtext removed, caveat line reworded.`
Net for C: +1 line; file ends at 550.

**Layout check (no code change expected):** `pillRow` has `marginTop: 12`, `btn` has
`marginTop: 16`, so without the subtext the RUN button sits 16 px under the pills — the same
gap the subtext had above it. Pills are unchanged (`paddingVertical: 10`, `flex: 1`, equal
widths). If the button looks glued to the pills on device, the only knob is `btn.marginTop`
(e.g. 20) — Nathan's call, not the executor's.

## Verification (executor runs all; report the actual numbers)

```
cd app && grep -n "Nothing is recorded\|stranger's first ride\|Your second ride of a route\|Your tenth ride" src/ui/DemoScreen.tsx   # expect: no output
cd app && grep -rn "Nothing is recorded" src App.tsx tests                                    # expect: no output
cd app && grep -n "Not part of the final app — use only for testing features\." src/ui/DemoScreen.tsx   # exactly one hit, ~line 475
cd app && grep -c "nothing is recorded" src/ui/DemoScreen.tsx                                 # 2 (lines ~398, ~402 — untouched)
cd app && wc -l src/ui/DemoScreen.tsx                                                         # 550
cd app && node --experimental-strip-types tests/run.ts                                        # 0 FAIL
cd app && ./node_modules/.bin/tsc --noEmit                                                     # clean, exit 0
GIT_OPTIONAL_LOCKS=0 git diff --stat -- app/src/ui/DemoScreen.tsx                            # one file
```

Baseline at writing (cycle13, 2026-09-24): 638 tests, 635 pass, 0 fail, 3 skip. Other
parked cycle14 briefs may have moved it — **record the actual baseline before editing**, then
confirm the counts are identical after. No test touches these strings. If `tsc` blows the call
budget, retry once with a longer timeout, then report — never substitute a syntax-only check.

## On-device checklist (Nathan, after OTA — not the executor)

1. DEMO tab idle: `DEMO RIDE`, then `Not part of the final app — use only for testing
   features.` in the dim small text, the three pills, RUN DEMO RIDE. Nothing between pills
   and button; the em dash renders as a dash, not `â€”`.
2. Tap each pill: selection still highlights, no text appears or shifts below the row.
3. RUN in any mode: the run's status line still says `DEMO · NOTHING IS RECORDED` and STOP's
   sub-line is unchanged; ending screen unchanged.
4. Both themes: the new line uses the same dim colour as before.

## Copy on the DEMO tab that overlaps the new line (report only — not changed)

- Run screen `demo · nothing is recorded` (397) and STOP `skips the demo · nothing is
  recorded` (401): now the only in-app statement that a demo saves nothing — intended.
- Ending `Ride saved.` / `Ride saved — m:ss.` (418) is theatre by design (cycle11 brief A);
  it contradicts "nothing is recorded" only on purpose, and `demoSavedLine`'s `demo only,
  nothing saved` resolves it. Unchanged.
- `GLOSSARY.md:127` says of DEMO "Nothing it shows is recorded." — still true, leave it.

## Out of scope / follow-up

- DEMO speed (`RATE = 25`), tick, modes, run/ending screens, self dots, gate-adjust card.
- Brief 02 (post-ride replay) copies DEMO's run look by value into its own screen; it does
  not read these strings. Independent.
- Whether the DEMO tab should exist in a shipped build at all (Nathan's line says it won't).

## Interaction with briefs 01-05

This brief edits `DemoScreen.tsx` only. 01/03/04 edit `settings.tsx`, 05 edits
`wayMapView.tsx`, 02 adds a new screen — none touch `DemoScreen.tsx` or `demoModel.ts`, so 06
runs in any order, alone or alongside the rest.

## What this changes on Nathan's phone

Nothing yet — parked. Once executed: JS-only, one file, no dependency change, so it ships to
the Preview APK via `scripts/publish-preview.cmd` (EAS Update) — no numbered build, no
reinstall. Nothing changes on the phone until it is built and published.

## Open questions / assumptions (logged, not blocking)

- **Wording.** Default is Nathan's literal line tidied (decision 1). The "nothing is
  recorded" meaning is not lost — the run screen still states it twice — so the fuller
  runner-up is *not* the default. If Nathan wants the fact on the idle screen too, swap in
  the runner-up string; same line, no other change. Flag for Nathan either way.
- **"the" added** ("the final app") and hyphen → em dash + full stop: read as typography, not
  a wording change. Nathan can revert to his exact text on the same line.
- **"Subtext below each type of ride"** read as the one mode-switching sentence under the
  pill row (there is no per-pill caption). If Nathan also meant the pills' own labels
  (FIRST/SECOND/TENTH RIDE) — not assumed; those are the choice itself.
- Tester not named in the source; recorded as such.
