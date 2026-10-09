# Brief 3 — RECORD slogan: `same activity · new meaning` → `same route · new meaning`

Written by the Plan tier (Fable) 2026-10-08 ~01:55 UTC from `10-plan.md` §3 and digest 03; anchors re-read in the working tree. **Chore-sized (3 lines)** — the coordinator may do it directly per CLAUDE.md rule 2; the brief exists so it can ride in batch A with brief 7. **Status: APPROVED (Nathan 2026-10-09 00:24). Q3.1 = (a) middle dot (default). Runs 2nd (`10-plan.md` §15); the literal is now at `RecordScreen.tsx:1682`.**

## 0. Rules
- Non-blocking question Q3.1 answered (a): the middle dot ` · ` (the app's separator, cycle14's own convention) — Nathan typed a hyphen in chat; if he explicitly wants the hyphen, the coordinator says so and both lines below use `-` instead. STOP-ON-AMBIGUITY otherwise.
- Allow-list: edit the existing entry IN PLACE (same `file`/`kind`), do not append; the entry keeps its sorted slot since only `text` changes within the same file/kind group — re-sort with the python read-modify-write anyway (EXECUTOR-RULES).
- No other visible text changes. `GIT_OPTIONAL_LOCKS=0`; no commit.

## 1. Verified anchors (2026-10-08 ~01:40 UTC)
- `app/src/ui/RecordScreen.tsx:1681` `        {yellowSub('same activity · new meaning')}` (digest said 1671; cycle26 brief 01 shifted it).
- `app/tests/ui-strings.allow.json:855-861` the entry `{ "file": "src/ui/RecordScreen.tsx", "kind": "literal", "text": "same activity · new meaning", "reason": "bootstrap: survived the cycle20 clutter audit (CLUTTER-REVIEW.md)", "since": "2026-10-02", "by": "bootstrap" }`.
- `app/tests/ui_strings_suite.ts:41` and `:49` — an in-memory extractor fixture, NOT the live screen. **Do not edit** (it would still pass either way; it tests the extractor).

## 2. Edits
1. `RecordScreen.tsx:1681`: `'same activity · new meaning'` → `'same route · new meaning'` (24 chars, < 40, no `long` flag needed, no em dash).
2. `ui-strings.allow.json` entry: `"text": "same route · new meaning"`, `"reason": "virgin-cycle27 03 (Nathan 2026-10-08): route, not activity — the slogan is about riding the same route again"`, `"since": "2026-10-08"`, `"by": "Sonnet execute, virgin-cycle27 brief 03"`. Keep `file`/`kind`.

## 3. Visible text
| file | kind | exact text | why |
|---|---|---|---|
| src/ui/RecordScreen.tsx | literal | `same route · new meaning` | Nathan's wording; replaces the cycle20 rename's "activity" which reads wrong here |

## 4. Acceptance
- Suite: 940 tests, 0 FAIL (count unchanged); `ui_strings` suite reports no STALE/UNLISTED.
- `tsc --noEmit` exit 0.
- `git diff --stat`: exactly `src/ui/RecordScreen.tsx` (one line, plus cycle26's pre-existing hunks — attribute) and `app/tests/ui-strings.allow.json` (one entry, three fields). Quote the entry diff in the report.
- `grep -n "same activity" app/src` → no hits.

## 5. On Nathan's phone
The caption under the RECORD button (setup phase, a sport exists) reads `same route · new meaning`. Nothing else. JS-only.

## 6. Rollback
Reverse the two edits.
