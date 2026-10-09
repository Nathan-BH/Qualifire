# Ruling — brief 08-9 (map-tab controls + dot) executor escalation

Fable, 2026-10-09. Input: `exec-report-map-tab-controls.md` (STOPPED), the working-tree diff of `catalogMapView.tsx`, `RoutesScreen.tsx`, `location/index.ts`, the tests and `ui-strings.allow.json`. No app source edited by this ruling.

## R1. `rider-dot` allow-list entry — APPROVED
The string is the MapLibre layer id the brief itself mandates (§4.1 item 7); it is never rendered as text. `wayMapView.tsx` carries the identical entry (`src/ui/wayMapView.tsx | literal | rider-dot`, allow.json ~:3533-3540, by "bootstrap"). The brief's Visible-text table missed it — a brief omission, not a scope question. Do NOT rename the layer id (the §5.2 test and the inspector read `rider-dot` by name, and the two maps should share the id).

Append, via the EXECUTOR-RULES python read-modify-write (`json.load` → append → `entries.sort(key=lambda e: (e['file'], e['kind'], e['text']))` → `json.dump(indent=2, ensure_ascii=False)` + `'\n'`):

```json
    {
      "file": "src/ui/catalogMapView.tsx",
      "kind": "literal",
      "text": "rider-dot",
      "reason": "virgin-cycle27 09: MapLibre layer id of the MAP tab rider dot (same id as wayMapView.tsx), never shown as text",
      "since": "2026-10-09",
      "by": "Sonnet execute, virgin-cycle27 brief 08"
    },
```

Sorted slot (code-unit order on file, kind, text): among the `src/ui/catalogMapView.tsx` / `literal` entries, AFTER `https://tiles.openfreemap.org/styles/positron` (currently ends at allow.json:1471) and BEFORE the first `text` entry `FIT` (currently :1472) — `'r'` (0x72) sorts after `'h'` (0x68). The sort call lands it there automatically; verify with `grep -n -A3 '"text": "rider-dot"' tests/ui-strings.allow.json` → two hits (catalogMapView ~:1472, wayMapView ~:3541).

Allow-list ledger for this brief is therefore: removed one (`Reset map to north up`), added THREE (`FIT`, `ME`, `rider-dot`). Report it that way; EXECUTOR-RULES' "removes one + adds two" is superseded by this ruling.

## R2. RoutesScreen comment rewording — ACCEPTED
`tests/trendpanel_suite.ts:81` pins `!rs.includes('LAST ')` on `RoutesScreen.tsx` (guards against a "LAST 10 ACTIVITIES" caption leaking into the tab). The brief's A2.2 comment text ("the phone's LAST KNOWN position") would trip it; the executor's lowercase "the phone's last known position" keeps the intent verbatim and is the correct fix. Keep as is. (The brief's "LIVE fix" capitals are fine — the pin only matches `LAST `.) The brief should have anchored that pin; noted as a Fable miss.

## R3. Expected final state
- Tests: **966 tests / 963 pass / 0 fail / 3 skip** (baseline 964/961/0/3; +2 = §5.2 catalogmap test + A3 positionretry test; the one FAIL is the ui_strings test and clears with R1). Re-run the full suite after R1 and quote the line.
- `tsc --noEmit` exit 0 (already logged `12-brief-08-tsc.log`; re-run not required unless anything but the json changes).
- Acceptance greps (§7.4-5 + A4) — I ran them on the current tree, all already pass; re-run and quote in the report:
  - `grep -n "↑\|Reset map to north up" src/ui/*.tsx` → none ✔
  - `grep -n "resetNorth" src/ui/wayMapView.tsx` → :499 definition, :1021 comment, :1024 the FIT call ✔
  - `grep -n "ensurePermissions\|requestForegroundPermissionsAsync" src/ui/RoutesScreen.tsx src/ui/catalogMapView.tsx` → none ✔
  - `grep -rn "getLastKnownPositionAsync" src` → exactly `src/location/index.ts:505` ✔
  - `grep -n "lastKnown\|here=" src/ui/activityCard.tsx src/ui/RideDetailScreen.tsx src/ui/gateAdjustCard.tsx src/ui/CatalogDetailScreen.tsx` → none ✔
  - `git diff --stat` lists: wayMapView.tsx, wayMapGeo.ts, catalogMapView.tsx, RoutesScreen.tsx, location/index.ts, waymap_suite.ts, catalogmap_suite.ts, positionretry_suite.ts, ui-strings.allow.json (RoutesScreen's header-comment hunk belongs to brief 07 rename — attribute it).
- Report file: `exec-report-map-tab-controls.md` (the folder's convention) is accepted in place of the brief's `12-brief-08-executor-report.md` name; update it from STOPPED to DONE with the three allow-list entries quoted and the counts above. Then hand to the Opus inspector (camera arithmetic, rider source mounted last, store-fix-then-OS-last-known precedence, no prompt path).
