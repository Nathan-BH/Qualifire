# Nathan's rulings after the Fable plan (2026-10-08 08:04)

Answers to the question menus in 10-plan.md §14. Nathan's words are in quotes. The briefs 11-brief-*.md were written BEFORE these
rulings; briefs marked AMENDMENT NEEDED must be revised (by a Fable pass, not by the executor) before execution.

| Q | Nathan's answer | Effect on briefs |
|---|-----------------|------------------|
| 1.2 | "remove the auto start option toggle as well as the little checkmark of it in the pill, and just have our app be smart ... least friction by auto selecting correct pills (of course still always changeable by click)" | AMENDMENT NEEDED: 11-brief-record-pairing. Auto-start becomes always-on smart behaviour; remove the Settings toggle and the pill checkmark. Digest 12 lists what exists. |
| 6.1 | yes (detail map bleeds, reverses the cycle23 decision) | 11-brief-maps-edge-to-edge: option A confirmed |
| 6.2 | yes (gate editor bleeds too) | 11-brief-maps-edge-to-edge: option B confirmed (reverses the plan's recommendation A) -> AMENDMENT NEEDED |
| 7.1 | "routes is fine for now" | 11-brief-routes-tab-rename: option A (ROUTES) confirmed |
| 8.1 | "possible to just have it zoom in on the last known location ... I think thats what google maps does" (today ME with no location goes to the middle of the route line, tested on RECORD) | AMENDMENT NEEDED: 11-brief-map-tab-controls-and-dot. ME with no live position zooms to the last known location if the app has one. Digest 12 says what the app remembers. Applies to RECORD map too if it behaves the same. |
| 8.2 | option A (dot refreshed on tab open and ME tap), plus: ACTIVITIES cards must NOT show a ME/blue dot | 11-brief-map-tab-controls-and-dot: A confirmed; add explicit "no dot on activity card/detail maps" |
| 4 | no watch owned; was only an idea; save as product/proposals/watch.md | done (see NOTES.md) |

## Still unanswered (plan recommendation stays the default until Nathan rules)
1.1 pairing metric (A count + recency tie-break) | 1.3 no history (A unchanged) | 2.1 night variants (A same hexes) | 2.2 contrast test (A 2.8 preview floor)
3.1 slogan dot vs hyphen (A dot) | 5.1 breathing numbers (A 0.55 / 2.4 s) | 5.2 notification keeps "· S2" (A keep) | 7.2 back label (A BACK)
8.3 FIT on finished map drops held course-up (A accept) | 10.1 unranked card (A duration + "Not ranked") | 10.2 leave too-few/no-rank lines (A)

## Idea 4 done (2026-10-08 08:2x)
product/proposals/watch.md written (name as Nathan asked, lowercase; the folder's other files are UPPER-KEBAB) and indexed in product/proposals/README.md.
Folder cleanup: digest 13 found no OUTDATED or IRRELEVANT file (COLD-START, SETUP-UX, ROUTING-AND-SEGMENTATION, README all kept); nothing moved.
Dangling reference left untouched: product/README.md:11 and :33 cite proposals/TRIAGE-ideas-18-27.md, which was removed from git in 44e24f1.

## 8.1 follow-up (Nathan, 2026-10-08 08:18)
> location permission is always granted so if the best option is to ask the phone last-known position, thats definitely possible.
> We can have fable rule on that vs saving a last fix?
- Fable to RULE between: (A) ask the OS for its last-known position (non-prompting, permission is always granted for Nathan), (B) save the app's own last fix to storage, (C) both with a fallback order. Nathan accepts A.
- Scheduled: Fable amendment pass tonight 2026-10-08 23:55 Brussels (21:55 UTC).

## ACTION FOR THE NIGHT FABLE PASS (23:55): ALSO PLAN IDEA 11 (added 2026-10-08 08:31)
Nathan added idea 11 (replay gets a 1x speed next to 5x / 15x / 25x) after the pass was scheduled and asked that its Haiku digest be added to the night planning.
In the same pass: read 14-replay-speed-digest.md and 00-nathan-ideas.md idea 11, then add to 10-plan.md a ruling proposal + size class + execution-order slot for idea 11,
and write 11-brief-replay-1x.md (chore/small expected). Update the idea 11 status cell to 'planned'. Do not execute.
Idea 11 digest landed (14-replay-speed-digest.md). Open menu for Nathan: add 1x to (a) DEMO's 5/15/25 (matches what he typed), (b) REPLAY's 5/10/25, (c) both. Fable: write the brief for (c) with a BLOCKED-UNTIL-NATHAN-RULES marker on the screen choice, recommend (a)/(c) after reading the digest.

## DONE — Fable pass 2026-10-09 ~23:05 UTC
All of the above is folded in: `11-brief-tier-colours.md` rewritten for the FINAL palette; amendments appended to `11-brief-record-pairing.md` (1.2), `11-brief-maps-edge-to-edge.md` (6.1 + 6.2), `11-brief-map-tab-controls-and-dot.md` (8.1 last-known location = Fable ruling C: live store fix → OS last-known → none, nothing persisted, MAP tab only; 8.2 + no dot on activity maps); `11-brief-replay-1x.md` written for option (c) both dials with a one-line switch; the five other briefs' status lines changed to APPROVED with the defaults above; `10-plan.md` §15 = final sequential order + file-overlap table + test counts; `00-nathan-ideas.md` statuses = briefed. Nothing executed by this pass.
