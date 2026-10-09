# Nathan's ideas — cycle28 (started 2026-10-09)

Status key: `captured` (words only) | `digested` (Haiku digest filed) | `promoted` (moved into a real cycle) | `executed, awaiting phone check` (Opus plan + Sonnet execute + Opus inspect, 2026-10-09; see OPEN-ITEMS-cycle28.md)

| # | Idea (short) | Status | Digest |
|---|--------------|--------|--------|
| 1 | Gates saving window: tapping a gate button below the map should pan/zoom the map to that gate (today the map does not move; he has to pan manually) | executed, awaiting phone check | 01-gate-buttons-pan-map-digest.md |
| 2 | Gates saving window: RELABEL/restyle the percentage nudge controls (wording + design only; behaviour and step sizes stay exactly the same). Percentages were AI-talk, not rider-friendly. Floated wordings: +/- or ++/-- buttons, or bigger outer +/- (big step) with smaller inner +/- (fine step) | executed, awaiting phone check | 02-gate-nudge-controls-digest.md |
| 3 | Rename routes/ways: places can be renamed but routes (ways) cannot; add ASAP (he got stuck because the option does not exist) | executed, awaiting phone check | 03-rename-routes-digest.md |
| 4 | RECORD tab: option to start a NEW way on a known route beforehand (e.g. 'which way today' pills incl. a 'new' pill); today he must ride the known way, is off-route most of it, gets no live route drawing, then 'save as new way' afterwards | executed, awaiting phone check | 04-record-new-way-on-known-route-digest.md |

## Ideas (verbatim-ish)

### 1 — Gates saving: gate buttons should move the map (2026-10-09)
> in the gates saving window; you can either click on gates on the map, or use the buttons below it,
> but if you click the buttons below it, it should zoom in/move the map to the selected gate.
>
> Now i have the issue is that i will use the buttons, but the map does not move and i have to
> manually go to that gate to see it get moved

### 2 — Gates saving: reword/restyle percentage controls (2026-10-09)
> i also dont like the current screen design using the percentages, it was useful for me to
> communicate with AI, but i think in practice its not good with users.
>
> We should think about how to replace it; instead of +/-1%; how about just +/- buttons or ++/--
> buttons to replace the big percentage move ??
> Or just use bigger +/- outer buttons than the inside one to signal the change will be smaller ?

### 3 — Rename routes/ways (2026-10-09)
> we can rename places but not routes/way names, it should be added asap as well.
> I had some issues with it but the option does not exist so i was stuck. ?

### 4 — RECORD: new way on a known route, chosen beforehand (2026-10-09)
> the other issue is that its not possible in the app, to from the record button, make a new way for a known route, here's an example:
> * i have a single way already for Home>>Station route and today i want to ride that route but a new way
> * currently i have to select Home and Station pills on the record tab, then start my ride, during the ride i will be off route for most of it which sucks, and at the same time i dont have the satisfaction of having the "writing history" live route drawing
> * then after finishing i select the option to save as a new way.
>
> Ideally you would like that option beforehand; so maybe we should by default have the "which way today" option shown with a "new" pill in there, in case you want a new way on a known route ??

> **Correction from Nathan (2026-10-09 00:41):** idea 2 is NOT replacing the controls. They work perfectly and must
> behave the same (same step sizes, same clamps). Only the wording and the design should change.

### 4b — Refinement of idea 4: "new" pill must never be auto-selected (2026-10-09 00:47)
> Worry: routes with only one way and no way specifier (just From >> To). A default "new" pill in WHICH WAY TODAY?
> could get auto-selected and the app would think he wants a new way when it is just the only option.
> Proposed: in that case "new" is NOT auto-selected, and tapping the pill itself toggles it on/off, so a
> mistaken press can be undone and he gets his normal route without specifier back.
>
> Coordinator note (not a ruling): agreed in direction. Suggested shape for later planning: "new" is always opt-in
> (never the default, in any route); selecting it deselects the existing way pill; tapping it again restores the
> default way (most-ridden). Open question: creating the 2nd way on a route whose 1st way has no specifier will need
> a specifier for the new one (and possibly for the old one) - see duplicate-specs rule, catalog.ts:93-113 per digest 03.

### 4c — Specifier collision on a 2nd way + why rename (idea 3) is needed (2026-10-09 00:49)
> Nathan confirms he has hit the specifier problem himself. (1) This is why route/way renaming (idea 3) is needed.
> (2) Proposed fix: when a new way is added to a route whose only way has no specifier, the OLD way automatically
> gets the default specifier "Std"; he can still change it afterwards by renaming (idea 3).
>
> Coordinator note (not a ruling): ideas 3 and 4 are linked - 4c leans on rename existing. Things to check when planned:
> the new way still needs its own specifier (typed in the naming card); historic rides store only wayId, so
> auto-labelling the old way "Std" changes display names only, no data migration (per digest 03); "Std"/"Alt" naming
> already exists from cycle 025 (unchecked in code).

### 4d — Better auto-name than "Std" for the old way (2026-10-09 00:50)
> "Std" means standard to Nathan but may not be widespread; is there a better auto-name?
>
> Coordinator note (not a ruling): candidates - "Original" (stays true forever, plain to non-native readers),
> "Classic", "Usual", "Main" (can become misleading once the new way is ridden more), "Default" (technical),
> "Std" (cryptic). Leaning "Original". Must pass rider-text rules (CLAUDE.md #9): new ui-strings.allow.json entry,
> <=40 chars, no em dash. Nathan decides.

### 4e — Decision: auto-name is "Original" (2026-10-09 00:52)
> Nathan: go with "Original" for now as it represents the idea best, although he finds it a bit long.
> Status: provisional. Revisit if it is too long where it is displayed (pills, cards). Shorter fallbacks if needed:
> "Classic", "First", "Main" (see 4d for trade-offs).
