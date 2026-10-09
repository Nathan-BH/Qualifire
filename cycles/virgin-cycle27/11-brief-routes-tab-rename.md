# Brief 7 — Rename the MAP tab to ROUTES; detail page's `BACK TO MAP` → `BACK`; stale docs

Written by the Plan tier (Fable) 2026-10-08 ~01:55 UTC from `10-plan.md` §7 and digest 06; anchors re-read in the working tree. Executor: Sonnet (or the coordinator directly — it is ~8 lines). Read `EXECUTOR-RULES.md`. **Status: APPROVED — Nathan ruled 7.1 = (a) ROUTES ("routes is fine for now", 2026-10-08 08:04) and asked for execution 2026-10-09 00:24. Q7.2 = (a) BACK (default). Runs 3rd (`10-plan.md` §15).**

## 0. Rules
- ~~BLOCKED UNTIL NATHAN RULES~~ **RULED 2026-10-08: (a) ROUTES.** Q7.1 the tab name, for the record: (a) ROUTES [recommended, this brief]; (b) keep MAP (then nothing to do, close the idea); (c) PLACES; (d) EXPLORE. For (c)/(d) the coordinator substitutes the word in §2.1/§2.3; everything else is identical.
- Non-blocking Q7.2 answered (a): the detail page's back button becomes `BACK` (minimal text; it no longer has to name the tab). If Nathan wants `BACK TO ROUTES`, the coordinator says so (still < 40 chars, no `long`).
- Tab labels are single words and NOT scanned by the ui-strings guard (cycle24 D15; verified — no allow-list entry for `map`). The button text IS scanned: edit its entry in place.
- `STATE.md` is the coordinator's file: do NOT edit it; hand over the replacement line (§4). `GLOSSARY.md` has no owner: edit it (§2.4). Never touch `IDEAS.md`.
- STOP-ON-AMBIGUITY. `GIT_OPTIONAL_LOCKS=0`; no commit.

## 1. Verified anchors (2026-10-08 ~01:40 UTC)
- `app/App.tsx:55-60`: comment + `const TAB_LABEL: Record<Tab, string> = { record: 'record', rides: 'activities', routes: 'map', settings: 'settings', demo: 'demo', };` (`:58-60`); rendered uppercase by `styles.tabText` (`:298`).
- `app/src/ui/CatalogDetailScreen.tsx:179` `<Text style={[st.slimBtnText, { color: t.onAccent }]}>BACK TO MAP</Text>`.
- `app/tests/catalogmap_suite.ts:217-219` `test('catalogmap: the tab label is map', () => { assert(src('App.tsx').includes("routes: 'map'"), …); });`
- `app/tests/ui-strings.allow.json` entry `{ "file": "src/ui/CatalogDetailScreen.tsx", "kind": "text", "text": "BACK TO MAP", "reason": "virgin-cycle24 03: the ROUTES tab is now the MAP tab; same button, renamed", "since": "2026-10-07", "by": "sonnet-executor" }`.
- `GLOSSARY.md:86` `**Results board / scatterplot.** The RESULTS tab: a board of your ways, most-ridden first;` (… `:86-88`); `:106` `is the everyday browsing look (warmer, livelier) for RIDES, ROUTES, RESULTS, SETTINGS. Race`.
- `STATE.md:64-65` `… \`app/src/ui/\` (six tabs:` / `RECORD / RIDES / ROUTES / RESULTS / SETTINGS / DEMO). …` (coordinator's).
- `app/src/ui/RoutesScreen.tsx:1-18` header says "MAP tab … the file keeps its old name and the tab id 'routes'" — comment only; update one line (§2.5).

## 2. Edits
1. `App.tsx:58-60`: `routes: 'map'` → `routes: 'routes'`. Extend the comment above (`:55-57`) with one line: `// virgin-cycle27 07 (Nathan 2026-10-08): the tab is ROUTES again (was MAP in cycle24; places live inside routes).`
2. `CatalogDetailScreen.tsx:179`: `BACK TO MAP` → `BACK`.
3. `tests/catalogmap_suite.ts:217-219`: rename the test to `'catalogmap: the tab label is routes (virgin-cycle27 07)'` and assert `routes: 'routes'`; add `assert(!src('App.tsx').includes("routes: 'map'"), 'old label gone');`.
4. `GLOSSARY.md:86-88`: replace the three lines with `**Trend plot.** Inside the ROUTES tab's route sheet: a plot of your last ten activities on that way — faster is higher, each dot purple/green/yellow against the window's average (the separate RESULTS tab was removed in virgin-cycle25).`; `:106`: `for RIDES, ROUTES, RESULTS, SETTINGS` → `for ACTIVITIES, ROUTES, SETTINGS`.
5. `RoutesScreen.tsx` header: the sentence naming "MAP tab" → "ROUTES tab (MAP in cycle24; renamed back in virgin-cycle27 07)"; comment only.
6. Allow-list entry: `"text": "BACK"`, `"reason": "virgin-cycle27 07: tab renamed ROUTES; the button no longer names the tab (minimal text)"`, `"since": "2026-10-08"`, `"by": "Sonnet execute, virgin-cycle27 brief 07"`; same `file`/`kind`; re-sort.

## 3. Visible text
| file | kind | exact text | why |
|---|---|---|---|
| App.tsx (tab bar, not scanned) | label | `ROUTES` (rendered uppercase from `'routes'`) | names the content like its siblings |
| src/ui/CatalogDetailScreen.tsx | text | `BACK` | replaces `BACK TO MAP`; shorter, tab-name-free |

## 4. Hand to the coordinator (STATE.md, not yours to edit)
Replace `STATE.md:64-65`'s tab list with: `(five tabs: RECORD / ACTIVITIES / ROUTES / SETTINGS / DEMO — RESULTS removed in virgin-cycle25, the tab was called MAP during cycles 24-27)`. Also `STATE.md:46` "The browse tab is still called ROUTES." is true again — leave.

## 5. Acceptance
- Suite: 940 tests, 0 FAIL; `ui_strings` clean. `tsc` exit 0.
- `git diff --stat`: `App.tsx`, `src/ui/CatalogDetailScreen.tsx`, `src/ui/RoutesScreen.tsx` (comment), `tests/catalogmap_suite.ts`, `tests/ui-strings.allow.json` (one entry edited), `GLOSSARY.md`. Quote the allow-list hunk.
- `grep -rn "BACK TO MAP" app/src app/tests` → none. `grep -n "'map'" app/App.tsx` → none.

## 6. On Nathan's phone
The third tab reads ROUTES; the place/route detail page's bottom button reads BACK. Nothing else moves. JS-only.

## 7. Rollback
Reverse the six edits; the entry goes back to `BACK TO MAP`.
