# Clutter audit — review of Nathan's answers (cycle 20)

Written 2026-10-02. Source: `CLUTTER-AUDIT.md` with Nathan's inline answers, plus a code check of every
"is this still reachable?" question (evidence from a quick Haiku read — treat the file:line anchors as
good, the "reachable" verdicts as likely but not independently inspected).

How to use this file: section 1 lists every decision as I understood it and what happens to it.
**Section 2 holds ALL open questions in one place, each with the default I'll use if you don't answer.**
Write your answers directly under each question (`Answer:` lines). The implementation brief (08) is written
on the defaults below, so it is ready to run as soon as you've glanced at section 2.

Status key: ✅ settled · ❓ open (see section 2, question number given)

---

## 1. Decisions, row by row

### RecordScreen — banners
| Item | Your decision | What I will do | Status |
|---|---|---|---|
| "Location permission was denied…" (top banner) | Remove the top banner. Show a temporary text in the yellow button sub-label instead, exactly like the GPS-off warning | Same mechanism as GPS-off (2 s hold + 400 ms fade on the RECORD/START sub-label): "Location permission not granted" | ❓ Q5 (details of how it behaves) |
| "Background location ('Allow all the time') not granted…" | Same | "Allow location all the time" in the sub-label, via the same mechanism | ❓ Q5 |

How the GPS-off warning works today (the mechanism being copied): pressing RECORD or START checks
permissions; on "services off" the sub-label under the yellow button shows "Location (GPS) is turned off" for
2 s, fades for 0.4 s, then returns to the default text. On START it also blocks starting. For "denied" the
current top banner also blocks START; for "foreground only" START still proceeds.

### RecordScreen — button sub-labels
| Item | Your decision | What I will do | Status |
|---|---|---|---|
| "the clock runs from here" | Remove | Remove | ✅ |
| "with this sport" | Remove if one sport is configured | Remove (it only appears while the first-sport form is open) | ✅ |
| "no sport yet" | Lean towards keeping a "no sport" message; unsure how a virgin launch works | **Answer to your question:** the first sport is asked right on RECORD, not in Settings: pressing RECORD with no sport opens the first-sport form inline, and pressing RECORD again saves the sport and arms. RECORD is pressable with no sport. Default: keep "no sport yet" as is | ❓ Q4 |
| "same ride · new meaning" | Stays; the slot can show temporary texts | Stays; becomes "same activity · new meaning" via brief 05 | ✅ |

### RecordScreen — live status lines (all in the running phase)
| Item | Your decision | Status |
|---|---|---|
| PAUSE sub-text "recording continues · resume or end" | Remove, keep PAUSE centred | ✅ (brief 04 already covers it) |
| "waiting for first GPS fix…" | Remove fully | ✅ |
| "last fix {N}s ago — GPS struggling?" | Remove fully | ✅ |
| "GPS live" | Keep for now (idea: alternate/replace with other texts later — nothing to implement) | ✅ |
| "writing history · not on {way} yet" / "…no known route here" | Remove fully | ✅ |
| "{way} · your pick · confirming…" / "detecting route…" | Remove fully | ✅ |
| "{way} · way locked (your pick) · verifying…" / "{way} · way locked…" | Remove fully | ✅ |

Note: after these go, the only live status line left is "GPS live". Remove the whole `wayLine`
machinery that only fed those strings, but keep the engine's internal lock logic untouched.

### RecordScreen — setup phase
| Item | Your decision | Status |
|---|---|---|
| "your pick is locked for this ride" | Remove fully | ✅ |
| "Ready to record." | Remove fully | ✅ |
| (found while checking, not in the audit) "Ride saved — 12:34. Find it in Rides." shown in the same slot after STOP | Not reviewed yet | ❓ Q9 |

### RecordScreen — alerts
| Item | Your decision | What I found | Status |
|---|---|---|---|
| "Unfinished ride found… Save what was captured?" | Remove ("app hasn't crashed lately") | **Removing the dialog alone would leave the interrupted recording stuck on disk**, offered again at every launch — so something must replace it | ❓ Q2 |
| "No sport set up — Add a sport in SETTINGS before recording." | You proposed the "no sport configured" sub-label instead | The alert is not reachable in the normal flow (RECORD opens the first-sport form instead). Default: delete the dead alert | ✅ (follows Q4) |
| "That way already exists…" | Replace with the sub-label idea (blocks the button) | Only reachable through a race condition (the naming card already disables ADD ROUTE on a duplicate). Default: delete the alert, fail silently and just return | ✅ |

### RideDetailScreen
| Item | Your decision | What I found | Status |
|---|---|---|---|
| "last {N} on this way" | "Is it a list that grows forever?" | **No — it is a rolling window of the last 10 rides on that way** (constant `WINDOW_N = 10`). It never grows | ❓ Q3 (keep or drop the header) |
| "no rides on file yet" | Remove if unreachable | Reachable only as the first ride on a way | ❓ Q1 |
| "personal best sectors" | Remove the caption AND the personal-best sector times ("no all-time records, rolling comparison only") | **It is already not all-time**: it is the best clean sector within the same rolling 10-ride window. The colours (purple/green/yellow) use a rolling 9-ride window too. Removal touches only this section + its data (`pbSectors`); colours, ghosts, rankings are separate | ❓ Q6 (confirm given this) |
| "no lap, no sectors — a free ride is not compared to anything" | Remove if unreachable | Reachable: free rides still exist (the cycle16 "free ride becomes a post-ride choice" briefs are parked, not built) | ❓ Q1 |
| "sector times not on file for this ride" | Remove if unreachable | Reachable for old rides without sector data or unmatched rides | ❓ Q1 |

### ResultsScreen / RidesScreen / RoutesScreen
| Item | Your decision | Status |
|---|---|---|
| "NO SPORT YET — ADD ONE IN SETTINGS" (RESULTS and RIDES) | Keep, but em dash → middle dot "·" | ✅ (see Q7 for scope of the em-dash rule; note the text says "in SETTINGS" while the real flow is on RECORD → Q4) |
| "NO RESULTS YET — RIDE A ROUTE FIRST" | Keep, em dash → "·" | ✅ → "NO RESULTS YET · DO A ROUTE FIRST" (brief 05 wording) |
| "matching ways…" | Remove if unreachable; if reachable remove fully | Reachable (shows while results are being matched after opening RIDES, typically seconds) | ❓ Q1 |
| "Loading…" | same | Reachable but very brief on a cold open | ❓ Q1 |
| "No rides yet. Record one on the Record tab." | Reword after the rename: "Record one first" | ✅ → "No activities yet · Record one first" |
| "no way — recorded only" | Remove if unreachable | Reachable for unmatched/free rides | ❓ Q1 |
| "No places yet." / "No routes yet." | Fine for now | ✅ keep |

### ReplayScreen
| Item | Your decision | Status |
|---|---|---|
| "loading replay…" | Remove fully | ✅ (hold a blank replay area for the sub-second load) |
| "no replay — this ride never crossed START on this way" | Remove fully (?) | ❓ Q1 (reachable; removing leaves a blank replay for such rides) |

### DemoScreen
| Item | Your decision | Status |
|---|---|---|
| "Not part of the final app — use only for testing features." | Em dash → middle dot | ✅ |
| "demo · nothing is recorded", "demo only · nothing saved" | No comment given | ❓ Q8 (default keep) |

### GateAdjustScreen
| Item | Your decision | Status |
|---|---|---|
| Long instruction ("Tap a gate on the map or below to nudge it — … old times and ranks do not survive…") | Remove fully; keep only a short sentence like "Tap on a gate to move it" | ✅ → "Tap a gate to move it" |
| "This way's gates cannot be edited — …" | Remove if unreachable | ❓ Q1 |

### Settings (help hints are the "?" rows)
| Item | Your decision | Status |
|---|---|---|
| Active sport hint | Remove, no help icon on that row | ✅ |
| "Show sport pill on RECORD" | Remove hint; rename the setting to **"Choose sport at start"** | ✅ (the setting does exist, `showSportPillOnRecord`, settings.tsx:573) |
| Theme hint, Auto-theme hint | Remove, no help icon | ✅ |
| "Live map" | Remove the setting entirely — the live dot is always on | ✅ (stored key stays harmlessly unused) |
| "Sector colours" | Update the text to "Colour sectors on live map" | ❓ Q10 (label or hint?) |
| "Ride history" | Rename setting to "Race yourself" (with *selfs* in italic, as in the teaser); hint → "Race *selfs* dots on live map" | ✅ (needs a nested italic `<Text>`; the stored key stays `selfDots`) |
| "Gate buzz" | Leave as is | ✅ |
| "Start place" | Remove the hint (setting stays) | ✅ |
| "Rankings" | Remove the setting entirely — rankings always shown | ✅ (consumers: ride detail, results detail, demo, results plot) |
| DATA: no helper text on any row | Remove all three hints | ✅ |
| DATA: merge "Export places" + "Export refs" into one "Export app"; DATA = only **Export app** and **Reset app** | The two exports are independent files today (`catalog.user.json`, `refs.user.json`), no import exists, so merging is feasible | ❓ Q11 |
| "Reset to virgin" label | Appears as "Reset app" already | ✅ |

### ResultsDetailScreen / First sport prompt
| Item | Your decision | Status |
|---|---|---|
| "not ranked" divider | Remove if unreachable | ❓ Q1 (reachable for rides barred from ranking) |
| "YOUR FIRST SPORT" modal label | Remove; "I have already decided on a different way to get people to input their first sport" | ❓ Q4 — I don't know that decision; it is not in the repo or my notes |

### Overall feedback
| Item | Your decision | Status |
|---|---|---|
| Re-run this audit before the real launch | Agreed | ✅ noted in the guardrails brief |
| Hard guardrails against future clutter | Yes | ✅ **brief 09** (below) |

---

## 2. Open questions — answer here (defaults in bold)

**Q1. Texts you believed unreachable, but the code says they can still appear.** They only show in edge cases. Default for every row: **remove the text and show nothing there** (the screen simply stays blank/shorter for that edge case). Veto any row you'd rather keep.

| Text | When it can still appear | Default if removed |
|---|---|---|
| "no rides on file yet" (ride detail) | first ride ever on a way | **remove** |
| "no lap, no sectors — a free ride is not compared to anything" | opening a free (route-less) ride | **remove** |
| "sector times not on file for this ride" | old rides before sector data existed, unmatched rides | **remove** |
| "matching ways…" (RIDES) | for a few seconds while results are matched after opening RIDES | **remove** (list just appears) |
| "Loading…" (RIDES) | split second on a cold open | **remove** |
| "no way — recorded only" (RIDES + ride detail) | rides without a matched way | **remove** (second line blank) |
| "no replay — this ride never crossed START…" | replaying a ride that never crossed START | **remove** (blank replay) — or better: **hide the Replay button for such rides** (needs a tiny extra change; tell me if you prefer that) |
| "This way's gates cannot be edited…" | EDIT GATES on a way with no reference ride | **remove the text and hide the EDIT GATES button when it can't work** |
| "not ranked" divider (results detail) | rides barred from ranking | **remove the divider only** (rows keep showing "—") |

Answer: agree with the default to remove all. Should not be a worry in my opinion

**Q2. Interrupted recording (the "Unfinished ride found" alert).** If the dialog simply disappears, a killed-mid-ride recording stays stuck on disk and is re-detected every launch. Default: **no dialog; on the next launch the app silently saves what was captured** (so no data is lost and no question is asked). Alternative: silently discard it.
Answer: Not sure what to do if this ever happen, is there a way for me to force this so I could test it out ? An idea would be to either warn that the ride is corrupted and only allow to save it as a free ride, so it does not count for any official route ?

**Q3. "last 10 on this way" header on ride detail.** It's a fixed window of 10, not a growing list. Default: **keep it** (short, and it explains the list under it; "last 10 on this way" stays as is). Or drop the header?
Answer: lets keep this for now.

**Q4. First sport / no-sport state.** You said you've already decided on a different way to get people to input their first sport — I don't have it. Until you tell me, default: **leave the first-sport flow exactly as it is** (RECORD opens the inline form), remove only the "YOUR FIRST SPORT" label and the "with this sport" sub-label, keep "no sport yet" under RECORD, and fix the text "ADD ONE IN SETTINGS" on RESULTS/RIDES to say "PRESS RECORD" (since that is where it's actually done). What is the different way you have in mind?
Answer: could we automatically bring people to the settings ? So my idea would be to show the "No sport configured yet" text for a second, then force the user to the settings tab?

**Q5. Permission warnings in the button sub-label.** A flash lasts 2 s, so it's easy to miss. Defaults: **(a)** "denied" → flash "Location permission not granted" on RECORD/START press and START stays blocked (as today); **(b)** "foreground only" → flash "Allow location all the time" on START press and recording still starts (as today); **(c)** no tap-to-open-settings (the old banner had a button; the flash won't). OK? Or should tapping the flashing text open the app settings?
Answer: If a flash is too short, lets keep it for 5seconds then. Since you are normally seeing the record button as you try to press it, the nex text should be obvious. I will test it, if it turns out not to be the case, we can still change it.

**Q6. "Personal best sectors".** It is already a rolling window (best clean sector of the last 10), not all-time. Default: **still remove it** as you said (the section and its data), colours/ghosts/rankings untouched. Confirm?
Answer: agree remove it still

**Q7. Em dashes.** There are 17 user-visible ones. You asked for "·" on 4 of them. Default: **replace the em dash with a middle dot " · " in every visible sentence-style text that survives this cleanup** (incl. the notification title "Qualifire — recording activity" → "Qualifire · recording activity"), and **leave the lone "—" placeholders** for unranked rows. Also OK for the other survivors I found: "‹ cancel — back to setup", "SET UP A SPORT FIRST — PRESS RECORD", "Sector gates — proposed", "discard nudges — keep the proposal", "{way} — ref"?
Answer: first of all I would remove the Qualifire name from the notification title, so just keep recording ride (resolves issue). secondly for the "survivors" you mention; I feel like all of them are extra clutter that this brief is exactly designed to remove ? if so, remove them all together

**Q8. Two demo texts you didn't mention.** "demo · nothing is recorded" and "demo only · nothing saved" say nearly the same thing. Default: **keep one ("demo · nothing is saved") and drop the other**. Or keep both / drop both?
Answer: dont care about demo, it is not a real feature

**Q9. Texts the audit missed that I came across.** Default for each is in bold; say which to flip.
- "Ride saved — 12:34. Find it in Rides." (setup screen after STOP) → **keep** (confirms the save; becomes "Activity saved · 12:34")
- "‹ cancel — back to setup" (armed screen) → **keep**
- "SET UP A SPORT FIRST — PRESS RECORD" → **keep** (dash → dot)
- gate-adjust card: "Sector gates — proposed", "discard nudges — keep the proposal" → **keep** (dash → dot)
Answer: agree on the first one as it is concise. The two other proposition I dont like and I think their whole text should be removed, seems like clutter

**Q10. "Sector colours" text.** Is "Colour sectors on live map" the new setting **label** (replacing "Sector colours") or the new **hint text**? Default: **the label.**
Answer:hint text

**Q11. "Export app" merge.** Today two separate files go through the share sheet. Default: **one "Export app" button that saves one combined file (`qualifire-export.json` with the catalog and the reference lines inside)**. Alternative: one tap that shares the two files as they are now (less change, still two files). Since there is no import yet, the combined file isn't restorable automatically either way.
Answer:one combined file is better

---

## 3. What comes out of this review (briefs in this folder)

| Brief | What | Depends on |
|---|---|---|
| 08 | Remove the clutter above, with the defaults in section 2 (JS only, OTA-able; the Settings/Export parts too) | 04, 05 (touches the same strings) |
| 09 | Guardrails: an automated inventory of every visible string, so a new sub-label/hint/banner fails the tests until it is explicitly approved, plus a rule in the repo conventions and the Inspect checklist | 08 (the approved list is generated after 08) |
| 06 | Start-gate lag: why the sector and the *selfs* only appear 1–2 minutes into a ride (new issue) | independent |
| 07 | Finish-gate colour: the final lap time flashes yellow before showing its real colour; plus a look at the sector-line colours you noticed working (new issue) | independent |
