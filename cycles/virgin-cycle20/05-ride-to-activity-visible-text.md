# 05 — "ride" → "activity" in every user-visible string (walking and running are activities too)

**Source: Nathan, 2026-09-30** — the app says "ride" everywhere, but it also serves walking and
running. Ruling: every string a user can **see** says **activity / activities** instead of
ride / rides (casing follows the context: the RIDES tab becomes ACTIVITIES in the tab's own
uppercase style; sentence text says "activity"; "a ride" becomes "**an** activity"). Everything
hidden stays "ride": function/variable/type names, file names, storage paths (`rides/<id>.jsonl`),
`rideId`, route/way/result ids, test names, comments, log lines, the native module name, asset
filenames, `STATE.md` / docs. **No data migration, no storage change.**

**Status: brief only. Nothing below is in the app.** Written 2026-09-30 by the Plan tier (Fable)
against the working tree (branch `virgin`, HEAD `ae911bb`, clean; 784 tests / 781 pass / 0 fail /
3 skip). Executor: Sonnet, cold, this file only. **Sequence: after briefs 01, 03 and 04 of this
folder** (01 + 03 edit the same `foregroundService` block in `src/location/index.ts` and the same
`ridenotification_suite.ts` pin; 04 removes two lines from `RecordScreen.tsx`). Every anchor below
is therefore a **text anchor** — line numbers are HEAD `ae911bb` values, given for orientation only;
find the quoted text, never count lines.

## What this changes on the phone — and what it does not

- **Changes:** the bottom tab reads `ACTIVITIES` (was `RIDES`); the list screen is titled
  `ACTIVITIES`; the detail overlay is titled `ACTIVITY`; every sentence, alert, hint, section head,
  button, pill and accessibility label that said ride(s) says activity / activities; the running
  notification title reads `Qualifire — recording activity`.
- **Stays:** every behaviour, every id, every file on disk, every export's content, the storage
  layout, the demo fixtures, the sport labels (sports are free-text — "Bike", "Run" — there is **no
  per-sport vocabulary table** in `src/store/sports.ts`; the only string there is a
  delete-refusal message). No i18n exists (no locale files, no i18n dependency in `package.json`,
  no Dutch/French strings anywhere) — the app is English-only, so this is one set of literals.
- **Two shipping groups:**
  - **(A) JS-only → OTA-able**: everything under `App.tsx`, `src/ui/`, `src/store/`, `src/location/index.ts`
    (the notification title is a JS option of `startLocationUpdatesAsync`), `tests/`.
  - **(B) native/build-affecting**: `app.json` permission rationale. Any `app.json` edit moves the
    `@expo/fingerprint` hash → **it goes into build 8 with 01 + 03, never into an OTA on build 7.**
    See Decision 8: on Android that string is not shown at all.
  - Because 01 + 03 already force build 8, the practical answer is: **ship (A)+(B) together in
    build 8**; (A) alone would also be a valid OTA onto build 7 (not planned).

## Evidence (read 2026-09-30, HEAD `ae911bb`)

### Where the visible strings come from

- **Tab bar** — `App.tsx` line 245-252: the labels are the `Tab` ids themselves, uppercased by
  style:
  ```tsx
            {(['record', 'rides', 'routes', 'results', 'settings', 'demo'] as const).map((tb) => (
              <Pressable
                key={tb}
                style={[styles.tab, tab === tb && styles.tabActiveBar]}
                onPress={() => setTab(tb)}
              >
                <Text style={[styles.tabText, tab === tb && styles.tabActive]}>{tb}</Text>
              </Pressable>
            ))}
  ```
  Styles lines 300-315: `tab: { minWidth: 92, flex: 1, alignItems: 'center', paddingVertical: 14, … }`,
  `tabText: { … fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }`. The
  bar is a horizontal `ScrollView` (`contentContainerStyle={styles.tabBarContent}` =
  `{ flexDirection: 'row', alignItems: 'stretch' }`, comment line 234: "Six tabs … still scroll
  sideways rather than shrinking"). No `maxWidth`, no `numberOfLines` → a longer label widens its
  tab and the bar scrolls; nothing truncates. `Tab` type (`src/ui/tabNav.tsx` line 23) and the
  `'rides'` id stay — only the rendered label changes.
- **No React Navigation.** Screens are switched by `tab === 'rides' ? <RidesScreen />` (App.tsx
  line 229) and full-screen overlays; there are no `options={{ title }}` headers. Screen titles
  are plain `<Text>`: `RidesScreen.tsx` line 175 `<Text style={styles.title}>Rides</Text>`
  (style line 229-235: `fontSize: 26 … textTransform: 'uppercase'` → renders `RIDES`),
  `RideDetailScreen.tsx` line 479 `<Text style={[styles.topTitle, { color: t.text }]}>RIDE</Text>`.
- **Notification title** — `src/location/index.ts` line 397 (inside `foregroundService: {`):
  `notificationTitle: 'Qualifire — recording ride',`. Pinned by `tests/ridenotification_suite.ts`
  line 142 `assert(fgOpts.includes("notificationTitle: 'Qualifire — recording ride'"), 'expo-location options must be untouched');`
  — brief 03 rewrites that assertion's message to `'expo-location title must be untouched'` and
  keeps the same substring. Body / sub-text / chronometer are the module's (briefs 01, 03) and
  contain no "ride".
- **`FREE_RIDE_ROW_NAME`** — `src/ui/rideHistoryModel.ts` line 63 `export const FREE_RIDE_ROW_NAME = 'Free ride';`
  is the **visible** row title of an unnamed free record on the ACTIVITIES list (`wayName`,
  `RidesScreen.tsx` line 204 `{item.wayName ?? 'no way — recorded only'}`) and the partition key
  (`RidesScreen.tsx` lines 164-165). Pinned by `tests/ridehistory_suite.ts` line 212
  `assert(rows[0].wayName === 'Free ride', …)` and line 254 `assert(FREE_RIDE_ROW_NAME === 'Free ride', 'the literal is pinned — RidesScreen partitions on it');`.
- **Captions built in models** — `src/ui/resultsListModel.ts` lines 259-268:
  ```ts
  export function boardCaption(total: number, rankingsOn: boolean): string {
    const noun = total === 1 ? 'RIDE' : 'RIDES';
    return rankingsOn
      ? `ALL ${total} ${noun} · fastest first`
      : `ALL ${total} ${noun} · rankings off in SETTINGS`;
  }

  export function windowCaption(n: number): string {
    return `LAST ${n} ${n === 1 ? 'RIDE' : 'RIDES'}`;
  }
  ```
  Pinned by `tests/resultsmodel_suite.ts` lines 286-290 (`'ALL 27 RIDES · fastest first'`,
  `'ALL 1 RIDE · fastest first'`, `'ALL 27 RIDES · rankings off in SETTINGS'`, `'LAST 9 RIDES'`,
  `'LAST 1 RIDE'`) and `tests/demo_suite.ts` lines 753-755 (`'LAST 9 RIDES'`, `'LAST 2 RIDES'`,
  `'LAST 1 RIDE'` via `demoPlotCaption`).
- `src/ui/rideDetailModel.ts` line 68 `if (r.ignored) return 'not ranked — you excluded this ride from ranking';`
  — pinned by `tests/ridedetail_suite.ts` line 134
  `assert(line === 'not ranked — you excluded this ride from ranking', …)`. Line 83
  `` return `${hist.length} rides of history — too few to rank`; `` — not pinned (grepped).
- **Alert bodies built in `src/store/`** reach the screen via `Alert.alert('Could not …', out.errors.join('\n'))`
  (`RideDetailScreen.tsx` 287/344/428, `GateAdjustScreen.tsx` 75, `RecordScreen.tsx` 822/865,
  `CatalogDetailScreen.tsx` 121/133) and via `Alert.alert('Cannot delete', candidate.join('; '))`
  (`settings.tsx` line 437). So `routeFromRide.ts` errors and `sports.ts` `deleteSport` messages
  are user-visible. The GateSet `note` strings in `src/store/routeCreation.ts` lines 404-413 are
  stored data never rendered (`grep -n "\.note\b" src/ui/*.tsx` → nothing) → **not touched**.
- **GPX export** — `src/storage/gpxExport.ts` line 60 and `gpxPlusExport.ts` line 551 write
  `<type>ebikeride</type>` into the exported file: file content read by other software, not app
  UI → **not touched** (see Out of scope). `saveGpx.ts` has no visible "ride" text.
- **`app.json`** line 35:
  `"locationAlwaysAndWhenInUsePermission": "Qualifire keeps recording your ride while the app is in the background or the screen is off.",`
  (line 34 `locationWhenInUsePermission` says "commute sectors", no "ride"). `app.config.js` and
  `plugins/withShowWhenLocked.js` contain "ride" only in comments.
- **"rider"** — no user-visible string contains "rider"/"riding"/"ridden" (grepped every file
  under `src/ui`, `src/store`, `src/location`, `src/storage`, `src/live`, `App.tsx`). The matches
  are identifiers (`rider` state in `ReplayScreen.tsx`, MapLibre layer ids `rider` / `rider-dot` /
  `ride-trace` in `wayMapView.tsx`, `riderBlue` in `theme.ts`) and comments. Nothing to rename;
  see Open call A.
- **Tests that read screens as text**: `recordflow_suite.ts` (after brief 04) reads
  `RecordScreen.tsx`; `ridenotification_suite.ts` reads `index.ts`. Neither pins a "ride" string
  other than the notification title.

### Exhaustive inventory of visible strings (HEAD `ae911bb` lines; text is the anchor)

Casing rule used throughout: keep the casing/shape of the word being replaced. `ride` → `activity`,
`rides` → `activities`, `Ride` → `Activity`, `RIDE` → `ACTIVITY`, `RIDES` → `ACTIVITIES`,
`a ride` → `an activity`, `ride${… 's'}` → `activit${… ? 'y' : 'ies'}` (see Decision 3).

**`App.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| A1 | 251 | `{tb}` (renders `RIDES` for `'rides'`) | `{TAB_LABEL[tb]}` — see Files §1 |

**`src/ui/RidesScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| R1 | 57 | `Alert.alert('Could not load rides', …` | `'Could not load activities'` |
| R2 | 168 | `title: 'FREE RIDES'` | `'FREE ACTIVITIES'` |
| R3 | 175 | `<Text style={styles.title}>Rides</Text>` | `Activities` |
| R4 | 188 | `No rides yet. Record one on the Record tab.` | `No activities yet. Record one on the Record tab.` |

**`src/ui/rideHistoryModel.ts`**
| # | Line | Before | After |
|---|---|---|---|
| H1 | 63 | `export const FREE_RIDE_ROW_NAME = 'Free ride';` | `= 'Free activity';` (constant name stays) |

**`src/ui/RideDetailScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| D1 | 116 | `no rides on file yet` | `no activities on file yet` |
| D2 | 394 | `'Delete ride?'` | `'Delete activity?'` |
| D3 | 456 | `…rebuilt from this ride (${…}). ${ghosts} Ride recordings are kept.` | `…rebuilt from this activity (${…}). ${ghosts} Activity recordings are kept.` |
| D4 | 464 | `'BACK TO RIDES'` | `'BACK TO ACTIVITIES'` |
| D5 | 479 | `>RIDE</Text>` | `>ACTIVITY</Text>` |
| D6 | 490 | `reference ride of {wayLabelIn(…)}` | `reference activity of {…}` |
| D7 | 549 | `this ride is the reference for this way — no lap time on file for it` | `this activity is the reference …` |
| D8 | 566 | `>FREE RIDE</Text>` | `>FREE ACTIVITY</Text>` |
| D9 | 568 | `'saved as a free ride'` | `'saved as a free activity'` |
| D10 | 570 | `no lap, no sectors — a free ride is not compared to anything` | `… a free activity is not compared to anything` |
| D11 | 591 | `sector times not on file for this ride` | `… for this activity` |
| D12 | 655 | `>Save as free ride</Text>` | `>Save as free activity</Text>` |
| D13 | 664 | `>Not a free ride</Text>` | `>Not a free activity</Text>` |

**`src/ui/rideDetailModel.ts`**
| # | Line | Before | After |
|---|---|---|---|
| M1 | 68 | `'not ranked — you excluded this ride from ranking'` | `'not ranked — you excluded this activity from ranking'` |
| M2 | 83 | `` `${hist.length} rides of history — too few to rank` `` | `` `${hist.length} activities of history — too few to rank` `` |

**`src/ui/resultsListModel.ts`**
| # | Line | Before | After |
|---|---|---|---|
| L1 | 260 | `const noun = total === 1 ? 'RIDE' : 'RIDES';` | `? 'ACTIVITY' : 'ACTIVITIES'` |
| L2 | 267 | `` `LAST ${n} ${n === 1 ? 'RIDE' : 'RIDES'}` `` | `` `LAST ${n} ${n === 1 ? 'ACTIVITY' : 'ACTIVITIES'}` `` |

**`src/ui/ResultsScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| S1 | 117 | `NO RESULTS YET — RIDE A ROUTE FIRST` | `NO RESULTS YET — DO A ROUTE FIRST` (verb, not noun — Decision 4) |
| S2 | 135 | `{route.rideCount} ride{route.rideCount === 1 ? '' : 's'}` | `{route.rideCount} activit{route.rideCount === 1 ? 'y' : 'ies'}` |
| S3 | 146 | `>FREE RIDES</Text>` | `>FREE ACTIVITIES</Text>` |
| S4 | 161 | `` · free ride</Text> `` | `` · free activity</Text> `` |

**`src/ui/resultsWayList.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| W1 | 47 | `{item.rideCount} ride{item.rideCount === 1 ? '' : 's'}` | `{item.rideCount} activit{item.rideCount === 1 ? 'y' : 'ies'}` (style key `styles.rides` stays) |

**`src/ui/ResultsDetailScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| X1 | 83 | `{board.total} ride{board.total === 1 ? '' : 's'}` | `{board.total} activit{board.total === 1 ? 'y' : 'ies'}` |

**`src/ui/resultsPlot.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| P1 | 104 | `no ranked rides yet` | `no ranked activities yet` |
| P2 | 234 | `'tap a point for that ride'` | `'tap a point for that activity'` |

**`src/ui/ReplayScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| Y1 | 216 | `no replay — this ride never crossed START on this way` | `no replay — this activity never crossed START on this way` |

**`src/ui/RecordScreen.tsx`** (after brief 04, lines ≥1454 are one lower; anchor on text)
| # | Line | Before | After |
|---|---|---|---|
| C1 | 418 | `'Unfinished ride found',` | `'Unfinished activity found',` |
| C2 | 419 | `'The app was closed while a ride was recording and tracking has stopped. Save what was captured?',` | `'The app was closed while an activity was recording …'` |
| C3 | 422 | `text: 'Save ride',` | `text: 'Save activity',` |
| C4 | 897 | `'Discard ride?',` | `'Discard activity?',` |
| C5 | 946 | `` \nThe ride was ended and kept instead — you can delete it from RIDES.` `` | `` \nThe activity was ended and kept instead — you can delete it from ACTIVITIES.` `` |
| C6 | 1287 | `? 'Ride saved.' // virgin-cycle11 R2: …` | `? 'Activity saved.' // …` (comment stays) |
| C7 | 1288 | `` : lastSummary ? `Ride saved — ${fmtElapsed(…)}.` : 'Ride saved.'} `` | both `Ride saved` → `Activity saved` |
| C8 | 1344 | `accessibilityLabel="This ride was a different way"` | `"This activity was a different way"` |
| C9 | 1478 | `>Discard ride</Text>` | `>Discard activity</Text>` |
| C10 | 1643 | `your pick is locked for this ride` | `your pick is locked for this activity` |
| C11 | 1650 | `Ride saved — {fmtElapsed(…)}. Find it in Rides.` | `Activity saved — {…}. Find it in Activities.` |
| C12 | 1690 | `{yellowSub('same ride · new meaning')}` | `{yellowSub('same activity · new meaning')}` |

**`src/ui/routeNamingCard.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| N1 | 194 | `…but this ride did not follow any of its ways. … — this ride becomes its reference.` | both → `this activity` |
| N2 | 197 | `` `This ride looped from and back to ${startLabel}.` `` | `This activity looped …` |
| N3 | 198 | `'This ride looped from and back to one new place.'` | `This activity looped …` |
| N4 | 200 | `…Name them to make this a way of its own — this ride becomes its reference.` | `this activity becomes its reference` |
| N5 | 201 | `'This ride does not match any route you have. … — this ride becomes its reference.'` | both → `This activity` / `this activity` |
| N6 | 393 | `>SAVE AS FREE RIDE</Text>` | `>SAVE AS FREE ACTIVITY</Text>` |

**`src/ui/gateAdjustCard.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| G1 | 143 | `'Seeded at 1/25/50/75/99 % of your ride, nudged clear of where you stopped. … or keep it and refine after a few rides.'` | `of your activity` … `after a few activities` |

**`src/ui/GateAdjustScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| E1 | 58 | `'There are no timed rides on this way yet.'` | `'There are no timed activities on this way yet.'` |
| E2 | 59 | `` `Its ${n} timed ride${n === 1 ? ' is' : 's are'} re-timed … — old times and ranks do not survive, the rides do.` `` | `` `Its ${n} timed activit${n === 1 ? 'y is' : 'ies are'} re-timed … the activities do.` `` |
| E3 | 62 | `` `${ghosts} The reference ride is kept and re-timed too, so it still races you as a dot. …` `` | `The reference activity is kept …` |
| E4 | 90 | `'The gates are saved, but this way\'s reference ride could not be timed against them …'` | `reference activity` |
| E5 | 113 | `This way's gates cannot be edited — it has no reference ride or gate set on file.` | `no reference activity or gate set` |
| E6 | 125 | `subtitle="… Saving moved gates re-times this way's rides — the reference ride included — … recordings and rides do."` | `this way's activities — the reference activity included — … recordings and activities do.` |

**`src/ui/CatalogDetailScreen.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| K1 | 414 | `<FactRow label="rides on file" …` | `label="activities on file"` |
| K2 | 418 | `>reference ride</Text>` | `>reference activity</Text>` |
| K3 | 422 | `<FactRow label="reference ride" value="on file, not scored" …` | `label="reference activity"` |

**`src/ui/catalogDeleteActions.ts`**
| # | Line | Before | After |
|---|---|---|---|
| Q1 | 65 | `` ${n} scored ride${n === 1 ? '' : 's'} on this way will be re-matched …; the ride recordings themselves are kept. `` | `` ${n} scored activit${n === 1 ? 'y' : 'ies'} on this way … ; the activity recordings themselves are kept. `` |
| Q2 | 79 | `` ${n} scored ride${n === 1 ? '' : 's'} will be re-matched …; the ride recordings themselves are kept. `` | same treatment as Q1 |

**`src/ui/settings.tsx`**
| # | Line | Before | After |
|---|---|---|---|
| T1 | 339 | `Alert.alert('A ride is being recorded', 'Stop it on the RECORD tab first.');` | `'An activity is being recorded'` |
| T2 | 350 | `` `${r} ride${r === 1 ? '' : 's'}, ${p} place… (RIDES → Export GPX+, or the two export buttons above).` `` | `` `${r} activit${r === 1 ? 'y' : 'ies'}, … (ACTIVITIES → Export GPX+, …)` `` |
| T3 | 474 | `hint="Everything on RECORD, ROUTES and RIDES is scoped to this one."` | `RECORD, ROUTES and ACTIVITIES` |
| T4 | 509 | `{usage.rides} ride{usage.rides === 1 ? '' : 's'}` | `{usage.rides} activit{usage.rides === 1 ? 'y' : 'ies'}` |
| T5 | 540 | `` ${usage.rides} ride${usage.rides === 1 ? '' : 's'} — delete those first `` | `` ${usage.rides} activit${usage.rides === 1 ? 'y' : 'ies'} — delete those first `` |
| T6 | 603 | `hint="… Never switches mid-ride — it waits for STOP."` | `Never switches mid-activity — it waits for STOP.` |
| T7 | 634 | `<Row label="Race your past rides"` | `label="Race your past activities"` |
| T8 | 635 | `hint="Your previous rides of this route move along the map …"` | `Your previous activities of this route …` |
| T9 | 643 | `>STARTING A RIDE</Text>` | `>STARTING AN ACTIVITY</Text>` |
| T10 | 645 | `hint="Detect where you are when a ride starts, or choose the place yourself."` | `when an activity starts` |
| T11 | 659 | `hint="Show where each ride placed against your others on that way — in the ride detail and on RESULTS."` | `each activity placed … in the activity detail and on RESULTS.` |
| T12 | 675 | `<Row label="Reference rides"` | `label="Reference activities"` |
| T13 | 676 | `hint="Export refs.user.json — the line of each way, built from its reference ride. Per-ride GPX+ export lives on RIDES."` | `built from its reference activity. Per-activity GPX+ export lives on ACTIVITIES.` |
| T14 | 692 | `hint="Moves every ride, result, sport, place, route and way aside …"` | `Moves every activity, result, sport, …` |

**`src/store/sports.ts`** (reaches the screen through `Alert.alert('Cannot delete', …)`)
| # | Line | Before | After |
|---|---|---|---|
| U1 | 216 | `` return [`sport "${id}" has ${usage.routes} routes · ${usage.rides} rides — delete those first`]; `` | `` … · ${usage.rides} activities — delete those first`] `` |

**`src/store/routeFromRide.ts`** (reach the screen through `out.errors.join('\n')`)
| # | Line | Before | After |
|---|---|---|---|
| V1 | 104 | `errors: ['this ride is already the reference of that way']` | `'this activity is already the reference of that way'` |
| V2 | 109 | `errors: ['no reference line can be built from this ride (recording unreadable, or under 200 m)']` | `from this activity` |
| V3 | 378 | `` reason: `the reference ride cannot be timed against these gates: ${which}` `` | `the reference activity cannot be timed …` |
| V4 | 514 | `` errors: [`${next.reason} — move that gate somewhere the reference ride actually passed`] `` | `the reference activity actually passed` |

**`src/ui/DemoScreen.tsx`** (Settings › demo section; "Not part of the final app" — still visible)
| # | Line | Before | After |
|---|---|---|---|
| Z1 | 719 | `{reveal !== null ? 'Ride saved.' : `Ride saved — ${demoFmtMS(clockS)}.`}` | both → `Activity saved` |
| Z2 | 776 | `accessibilityLabel="This ride was a different way"` | `"This activity was a different way"` |
| Z3 | 810 | `>DEMO RIDE</Text>` | `>DEMO ACTIVITY</Text>` |
| Z4 | 818 | `>FIRST RIDE</Text>` | `>FIRST</Text>` (Decision 5) |
| Z5 | 824 | `>SECOND RIDE</Text>` | `>SECOND</Text>` |
| Z6 | 830 | `>TENTH RIDE</Text>` | `>TENTH</Text>` |
| Z7 | 835 | `>RUN DEMO RIDE</Text>` | `>RUN DEMO ACTIVITY</Text>` |

**`src/location/index.ts`** (group A — JS option; edit after 01 and 03)
| # | Line | Before | After |
|---|---|---|---|
| F1 | 397 | `notificationTitle: 'Qualifire — recording ride',` | `notificationTitle: 'Qualifire — recording activity',` |

**`app.json`** (group B — build 8 only)
| # | Line | Before | After |
|---|---|---|---|
| B1 | 35 | `"locationAlwaysAndWhenInUsePermission": "Qualifire keeps recording your ride while the app is in the background or the screen is off.",` | `"… recording your activity while …"` |

**Tests to re-pin** (`app/tests/`)
| # | File:line | Before | After |
|---|---|---|---|
| P1 | `ridenotification_suite.ts:142` (message text may already be 03's) | `fgOpts.includes("notificationTitle: 'Qualifire — recording ride'")` | `"notificationTitle: 'Qualifire — recording activity'"` (keep the assertion's message) |
| P2 | `ridehistory_suite.ts:212` | `rows[0].wayName === 'Free ride', `expected "Free ride", got …`` | `'Free activity'` (both the value and the message) |
| P3 | `ridehistory_suite.ts:254` | `FREE_RIDE_ROW_NAME === 'Free ride'` | `=== 'Free activity'` |
| P4 | `resultsmodel_suite.ts:286-290` | `'ALL 27 RIDES · fastest first'`, `'ALL 1 RIDE · fastest first'`, `'ALL 27 RIDES · rankings off in SETTINGS'`, `'LAST 9 RIDES'`, `'LAST 1 RIDE'` | `ACTIVITIES` / `ACTIVITY` in each |
| P5 | `demo_suite.ts:753-755` | `'LAST 9 RIDES'`, `'LAST 2 RIDES'`, `'LAST 1 RIDE'` (value and message) | `'LAST 9 ACTIVITIES'`, `'LAST 2 ACTIVITIES'`, `'LAST 1 ACTIVITY'` |
| P6 | `ridedetail_suite.ts:134` | `line === 'not ranked — you excluded this ride from ranking'` | `… this activity from ranking'` |
| P7 | `ridehistory_suite.ts:204` test **name** says `reads "Free ride"` | leave (test names are not user-visible) — or update the quoted literal in the name for accuracy; either is fine, not pinned |

Test **names** and assertion **messages** that merely mention rides (e.g. `'a free ride must never enter …'`)
stay — they are not user-visible.

## Executor rules (binding)

- **Stop-on-ambiguity.** Anchors are the quoted **text** — if a quoted string is not found
  verbatim in the named file (allowing for briefs 01/03/04 having moved lines), or is found more
  than once where the brief expects one, stop and report (file, expected, what grep found). Never
  guess, never widen the rename to identifiers.
- **Rename only inside string literals, JSX text, and JSX attribute strings.** Never touch:
  identifiers (`rides`, `rideId`, `rideCount`, `usage.rides`, `styles.rides`, `FREE_RIDE_ROW_NAME`,
  `openRide`, `RideMeta`, `'rides'` tab id / `source: 'rides'`), object keys, storage paths
  (`rides/…`), ids (`demo:second-ride`, `demo:first-ride`, `qualifire-ride-tracking`,
  `qualifire-active-ride.json`, `free-rides-cache.json`, `lm:…`, `ride:…`), MapLibre layer ids
  (`rider`, `rider-dot`, `ride-trace`), comments, log/`Error(...)` messages in `src/storage/core.ts`,
  test names, `STATE.md` / `OPEN-ITEMS.md` / `IDEAS.md` / docs, `README`s, the Kotlin module, GPX
  `<type>ebikeride</type>`, GateSet `note` strings in `routeCreation.ts` **and `routeFromRide.ts:120`**
  (stored metadata, never rendered — Ruling 2026-10-03).
- No commit unless told (`GIT_OPTIONAL_LOCKS=0 git …`; a stray `.git/index.lock` is `mv`'d
  aside). Nothing is deleted or moved. No `npm install`, `npx`, `eas`.
- **Files touched — exactly these (A = JS/OTA, B = build):**
  - A EDIT `app/App.tsx`
  - A EDIT `app/src/ui/RidesScreen.tsx`, `rideHistoryModel.ts`, `RideDetailScreen.tsx`,
    `rideDetailModel.ts`, `resultsListModel.ts`, `ResultsScreen.tsx`, `resultsWayList.tsx`,
    `ResultsDetailScreen.tsx`, `resultsPlot.tsx`, `ReplayScreen.tsx`, `RecordScreen.tsx`,
    `routeNamingCard.tsx`, `gateAdjustCard.tsx`, `GateAdjustScreen.tsx`, `CatalogDetailScreen.tsx`,
    `catalogDeleteActions.ts`, `settings.tsx`, `DemoScreen.tsx`
  - A EDIT `app/src/store/sports.ts`, `app/src/store/routeFromRide.ts`
  - A EDIT `app/src/location/index.ts` (one string)
  - A EDIT `app/tests/ridenotification_suite.ts`, `ridehistory_suite.ts`, `resultsmodel_suite.ts`,
    `demo_suite.ts`, `ridedetail_suite.ts`, and **one new test** appended to `app/tests/recordflow_suite.ts`
  - B EDIT `app/app.json` (one string)
- Do **not** touch anything else — in particular `src/ui/tabNav.tsx`, `src/storage/*`,
  `src/live/*`, `modules/`, `plugins/`, `app.config.js`, `eas.json`, `tests/run.ts`, `tests/lib.ts`.

## Goal

Every string in the inventory reads activity / activities; the tab bar shows `ACTIVITIES`; the
notification title is `Qualifire — recording activity`; all re-pinned tests pass; a new
`recordflow_suite.ts` test greps the UI sources and fails on any visible "ride" regression; tests
0 FAIL, `tsc` clean; the targeted grep in Verification 4 shows only the allowed identifier /
comment / path matches.

## Decisions

1. **Tab label via a tiny lookup in `App.tsx`, `Tab` id unchanged.** `TAB_LABEL: Record<Tab, string>`
   maps `rides → 'activities'` and every other id to itself; the existing `textTransform:
   'uppercase'` produces `ACTIVITIES`. No change to `tabNav.tsx` (`Tab` is a storage-free UI id
   but it is referenced across screens as `'rides'` — renaming it would be an identifier churn with
   zero user benefit).
2. **Width:** `ACTIVITIES` (10 glyphs at 13 px / letterSpacing 2 ≈ 100-110 px + padding) exceeds
   `minWidth: 92`, which is a *minimum*: inside the horizontal `ScrollView` the tab grows to its
   content and the bar scrolls (it already does for six tabs — App.tsx comment line 234). No
   truncation risk; no `numberOfLines` added. Other longer strings and their containers, checked:
   - `RideDetailScreen` primary button `BACK TO ACTIVITIES` (`slimBtnText` 12.5 px, full-width
     `slimBtn`) — fits.
   - `routeNamingCard` `SAVE AS FREE ACTIVITY` (`freeBtn` full width, `freeText` 15 px) — fits.
   - `RecordScreen` `Discard activity` (`discardBar` full width, 13 px) — fits.
   - `RidesScreen` title `ACTIVITIES` at 26 px/800 with a `Refresh` button beside it in
     `styles.header` — ~190 px + button; fits on 360 px-wide screens; **on-device check item 2**.
   - `DemoScreen` pills: three `flex: 1` pills in one row at 13 px/800 — `FIRST ACTIVITY` /
     `SECOND ACTIVITY` / `TENTH ACTIVITY` (14-15 glyphs each) would **not** fit three-up on a
     360 px screen → Decision 5.
   - `resultsWayList` `styles.rides` (15 px, tabular-nums) shows `12 activities` where it showed
     `12 rides` in a row beside the way label — flex row, wraps if needed; **on-device check item 5**.
3. **Plural grammar:** the `ride${n === 1 ? '' : 's'}` pattern becomes
   `activit${n === 1 ? 'y' : 'ies'}` (RS S2, W1, X1, T2, T4, T5, Q1, Q2). GateAdjust E2's
   `ride${n === 1 ? ' is' : 's are'}` becomes `activit${n === 1 ? 'y is' : 'ies are'}`. Articles:
   `a ride` → `an activity` (C2, T1, T10); `A ride` → `An activity` (T1); `STARTING A RIDE` →
   `STARTING AN ACTIVITY` (T9). No other article precedes "ride" in the inventory (verified —
   every "this ride", "the ride", "free ride", "reference ride", "your ride", "mid-ride",
   "per-ride" swaps 1:1).
4. **`RIDE A ROUTE FIRST` (S1)** uses "ride" as a verb. "ACTIVITY A ROUTE" is not English;
   chosen wording: `NO RESULTS YET — DO A ROUTE FIRST` (shortest neutral verb; matches the
   minimal-text rule). Alternative `RECORD A ROUTE FIRST` is equally acceptable; executor uses
   `DO`.
5. **Demo mode pills lose the noun: `FIRST` / `SECOND` / `TENTH`.** The section head directly
   above says `DEMO ACTIVITY` and the button below says `RUN DEMO ACTIVITY`, so the pills carry
   the ordinal only. This is the only place the brief removes a word rather than swapping it;
   reason: three `flex: 1` pills cannot hold `SECOND ACTIVITY` at 13 px/letterSpacing 1 on a
   360 px-wide phone without wrapping, and Nathan's standing rule is minimal text, never wrapped
   or shrunk labels. (Reversible: put the noun back and add `numberOfLines={1}
   adjustsFontSizeToFit` if he prefers.)
6. **`FREE_RIDE_ROW_NAME` value changes, name does not.** The constant is the partition key and
   the visible row title at once; `RidesScreen` compares against the constant, not the literal,
   so only the literal and its two test pins move. No stored data carries this string (it is
   computed per row by `buildRideRows`) — verified: `grep -rn "Free ride" src/` matches only
   line 63.
7. **Notification title changes in `index.ts` only** (a JS option; the Kotlin module recovers
   the title from the live notification and never sets it). Executed after 01 and 03: the block
   then reads `notificationTitle:` followed by 01's comment lines and (per 03) no
   `notificationBody`; only the one string changes. The suite pin (P1) keeps its message text
   whatever 03 left it as.
8. **`app.json` (B1) is edited, but flagged.** `expo-location`'s config plugin writes
   `locationAlwaysAndWhenInUsePermission` into the **iOS** `Info.plist`
   (`NSLocationAlwaysAndWhenInUseUsageDescription`); Android's runtime permission dialog shows
   no app-supplied rationale, and this app ships Android only. So the string is invisible on
   every phone Nathan has — it is changed for consistency, it is the only group-B item, and it
   is harmless to build 8 (which 01 + 03 require anyway). **It must not be pushed as an OTA on
   build 7**: an `app.json` change moves the fingerprint and the OTA would not apply. If the
   coordinator wants a build-7 OTA of group A before build 8, B1 is left out of that commit.
9. **Regression pin: one new text-level test** in `recordflow_suite.ts` (already `fs`-enabled by
   brief 04) that reads the UI files listed in the inventory and asserts no visible "ride"
   remains, using an allowlist for identifiers (Files §5). This is what makes the change
   checkable without a phone. Test count +1.
10. **Tests** that only *mention* rides in their names / assertion messages are untouched; the
    five re-pins (P1-P6) are value pins and must move with the strings.

## Files to touch

### 1. EDIT `app/App.tsx`

(a) After the existing imports (below the last `import … from` line at the top of the file —
find `import { … type Tab … } from './src/ui/tabNav'` or the line that imports `Tab`; if `Tab`
is not imported in `App.tsx`, stop and report), add:
```ts
// virgin-cycle20 brief 05 (Nathan, 2026-09-30): the app serves walking and
// running too, so the user sees "activities"; the tab ID stays 'rides' (it is
// referenced across screens and never shown).
const TAB_LABEL: Record<Tab, string> = {
  record: 'record', rides: 'activities', routes: 'routes', results: 'results', settings: 'settings', demo: 'demo',
};
```
(b) Line 251 — before:
```tsx
                <Text style={[styles.tabText, tab === tb && styles.tabActive]}>{tb}</Text>
```
after:
```tsx
                <Text style={[styles.tabText, tab === tb && styles.tabActive]}>{TAB_LABEL[tb]}</Text>
```
Nothing else in `App.tsx` changes.

### 2. EDIT the UI / store / location files — apply the inventory tables verbatim

For each row in the inventory (R, H, D, M, L, S, W, X, P, Y, C, N, G, E, K, Q, T, U, V, Z, F):
locate the **Before** text in the named file, confirm it occurs exactly once (or, where a row
names two occurrences on one line, exactly that line), and replace with **After**. Work file by
file in inventory order and tick each row in the report. Example patterns:

- `ride${n === 1 ? '' : 's'}` → `activit${n === 1 ? 'y' : 'ies'}` (keep the variable names —
  `n`, `r`, `usage.rides`, `route.rideCount`, `item.rideCount`, `board.total` — exactly as found).
- `'FREE RIDES'` → `'FREE ACTIVITIES'`; `FREE RIDE</Text>` → `FREE ACTIVITY</Text>`.
- `a ride` → `an activity`; `A ride` → `An activity`; `STARTING A RIDE` → `STARTING AN ACTIVITY`.

Sanity per file after editing: `grep -n -w -i "ride\|rides" <file>` must show only comments,
identifiers (`rideId`, `.rides`, `rideCount`, `usage.rides`, `styles.rides`, `openRide`,
`FREE_RIDE_ROW_NAME`, `'rides'` ids, `rides/` paths) — never a quoted or JSX-text noun.

### 3. EDIT `app/src/location/index.ts` (F1)

Inside `foregroundService: {` — before:
```ts
        notificationTitle: 'Qualifire — recording ride',
```
after:
```ts
        notificationTitle: 'Qualifire — recording activity',
```
(01's comment lines and 03's removal of `notificationBody` are already there; leave them.)

### 4. EDIT `app/app.json` (B1, group B)

Line 35 — before:
```json
          "locationAlwaysAndWhenInUsePermission": "Qualifire keeps recording your ride while the app is in the background or the screen is off.",
```
after:
```json
          "locationAlwaysAndWhenInUsePermission": "Qualifire keeps recording your activity while the app is in the background or the screen is off.",
```

### 5. EDIT the tests

(a) `tests/ridenotification_suite.ts` — the line containing
`fgOpts.includes("notificationTitle: 'Qualifire — recording ride'")` → replace the substring
`recording ride` with `recording activity`; keep the assertion message as found (`'expo-location
options must be untouched'` at HEAD, `'expo-location title must be untouched'` after 03). If the
line occurs twice (03 not yet reconciled), stop and report.

(b) `tests/ridehistory_suite.ts` line 212 — before:
```ts
  assert(rows[0].wayName === 'Free ride', `expected "Free ride", got ${rows[0].wayName}`);
```
after:
```ts
  assert(rows[0].wayName === 'Free activity', `expected "Free activity", got ${rows[0].wayName}`);
```
line 254 — before:
```ts
  assert(FREE_RIDE_ROW_NAME === 'Free ride', 'the literal is pinned — RidesScreen partitions on it');
```
after:
```ts
  assert(FREE_RIDE_ROW_NAME === 'Free activity', 'the literal is pinned — RidesScreen partitions on it (virgin-cycle20 05: activity wording)');
```

(c) `tests/resultsmodel_suite.ts` lines 286-290 — before:
```ts
  assert(boardCaption(27, true) === 'ALL 27 RIDES · fastest first', boardCaption(27, true));
  assert(boardCaption(1, true) === 'ALL 1 RIDE · fastest first', boardCaption(1, true));
  assert(boardCaption(27, false) === 'ALL 27 RIDES · rankings off in SETTINGS', boardCaption(27, false));
  assert(windowCaption(9) === 'LAST 9 RIDES', windowCaption(9));
  assert(windowCaption(1) === 'LAST 1 RIDE', windowCaption(1));
```
after:
```ts
  assert(boardCaption(27, true) === 'ALL 27 ACTIVITIES · fastest first', boardCaption(27, true));
  assert(boardCaption(1, true) === 'ALL 1 ACTIVITY · fastest first', boardCaption(1, true));
  assert(boardCaption(27, false) === 'ALL 27 ACTIVITIES · rankings off in SETTINGS', boardCaption(27, false));
  assert(windowCaption(9) === 'LAST 9 ACTIVITIES', windowCaption(9));
  assert(windowCaption(1) === 'LAST 1 ACTIVITY', windowCaption(1));
```

(d) `tests/demo_suite.ts` lines 753-755 — replace `'LAST 9 RIDES'` → `'LAST 9 ACTIVITIES'`,
`'LAST 2 RIDES'` → `'LAST 2 ACTIVITIES'`, `'LAST 1 RIDE'` → `'LAST 1 ACTIVITY'` in **both** the
compared value and the template message on each line (six substitutions, three lines).

(e) `tests/ridedetail_suite.ts` line 134 — before:
```ts
  assert(line === 'not ranked — you excluded this ride from ranking', `expected the ignored line, got "${line}"`);
```
after:
```ts
  assert(line === 'not ranked — you excluded this activity from ranking', `expected the ignored line, got "${line}"`);
```

(f) Append to `tests/recordflow_suite.ts` (after brief 04 it imports `fs`, `path`, `TESTS_DIR`;
if it does not — 04 not landed — stop and report):
```ts
test('virgin-cycle20 05: no user-visible "ride" wording left in the UI sources (activity instead)', () => {
  // Visible = inside a quoted string or JSX text. Identifiers, ids, paths and comments are
  // allowed to keep "ride". The allowlist is deliberately narrow; extend it only for a new
  // identifier, never for a new string.
  const UI = path.resolve(TESTS_DIR, '..', 'src', 'ui');
  const files = [
    ...fs.readdirSync(UI).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(UI, f)),
    path.resolve(TESTS_DIR, '..', 'App.tsx'),
    path.resolve(TESTS_DIR, '..', 'src', 'store', 'sports.ts'),
    path.resolve(TESTS_DIR, '..', 'src', 'store', 'routeFromRide.ts'),
    path.resolve(TESTS_DIR, '..', 'src', 'location', 'index.ts'),
  ];
  const offenders: string[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let inBlockComment = false;
    lines.forEach((raw, i) => {
      let line = raw;
      // strip block comments (single- and multi-line) and line comments
      if (inBlockComment) { const e = line.indexOf('*/'); if (e < 0) return; line = line.slice(e + 2); inBlockComment = false; }
      line = line.replace(/\/\*[\s\S]*?\*\//g, '');
      const bs = line.indexOf('/*'); if (bs >= 0) { line = line.slice(0, bs); inBlockComment = true; }
      line = line.replace(/\{\/\*[\s\S]*$/, '');
      const ls = line.indexOf('// '); if (ls >= 0) line = line.slice(0, ls);
      // (1) quoted strings and template literals
      const strings = line.match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
      // (2) JSX text between > and < on one line
      const jsx = line.match(/>[^<>{}]*[A-Za-z][^<>{}]*</g) ?? [];
      // (3) bare JSX text lines (multi-line <Text> children): after dropping {…}
      // expressions, a line with two or more words and no code punctuation
      const bare = line.replace(/\{[^{}]*\}/g, '').trim();
      const bareText = /[A-Za-z]\s+[A-Za-z]/.test(bare) && !/[=;<>()[\]`'"]/.test(bare) ? [bare] : [];
      for (const raw of [...strings, ...jsx, ...bareText]) {
        // `${…}` bodies are code, not text (e.g. `${usage.rides}`): blank them so only the
        // literal characters of a template are tested (ruling 2026-10-03, executor escalation).
        const s = raw.replace(/\$\{[^{}]*\}/g, '${}');
        if (!/\b(ride|rides|Ride|Rides|RIDE|RIDES)\b/.test(s)) continue;
        // allowed: tab / source ids, MapLibre layer ids, storage paths and keys, id prefixes
        if (/^["'](rides|ride|rider|rider-dot|ride-trace|ride-trace-core)["']$/.test(s)) continue;
        if (/rides\//.test(s) || /demo:(first|second)-ride/.test(s) || /qualifire-(ride-tracking|active-ride)/.test(s)) continue;
        if (/free-rides-cache/.test(s) || /^`ride:/.test(s) || /lm:\$\{/.test(s)) continue;
        // allowed: GateSet `note` written by routeFromRide.ts — stored metadata, never rendered
        // (no `.note` read anywhere in src/ui; same carve-out the brief gives routeCreation.ts).
        // Anchored to the file and the literal's opening words so any other string still fails.
        if (path.basename(file) === 'routeFromRide.ts' && /^`re-seeded when ride \$\{\} became the reference/.test(s)) continue;
        offenders.push(`${path.basename(file)}:${i + 1}: ${s.trim()}`);
      }
    });
  }
  assert(offenders.length === 0, `visible "ride" wording remains:\n${offenders.join('\n')}`);
});
```
The executor runs this test **before** step 2 and reports its FAIL output (the offenders list is
the "failed before" artifact — it must list, at minimum, every inventory row above in `src/ui`,
`App.tsx`, `sports.ts`, `routeFromRide.ts`, `index.ts`). If the test's allowlist flags a
literal that is a genuine identifier/id not listed here (e.g. a MapLibre layer id the brief
missed), add that exact id to the allowlist regex **and report it**; if it flags a genuine
visible string the inventory missed, **apply the same wording rule and report it** as an
inventory addition — do not silently allowlist it.

## Verification plan

1. **Failed-before artifact:** add the test in §5(f) first, run
   `cd app && node --experimental-strip-types tests/run.ts 2>&1 | grep -A80 "virgin-cycle20 05"` →
   FAIL with the offenders list; paste it in the report.
2. Apply §1-§5(a-e). `cd app && node --experimental-strip-types tests/run.ts` → **0 FAIL**, total
   = previous total + 1 (784 → 785 on a bare `ae911bb`; 01/03/04 each add their own — report the
   summary line). The five re-pins pass; nothing else changes count.
3. `cd app && ./node_modules/.bin/tsc --noEmit` → clean, exit 0 (`TAB_LABEL` typed as
   `Record<Tab, string>` fails typecheck if any tab id is missing — that is intended).
4. **Targeted grep** (never the whole repo, never `node_modules`):
   ```
   cd app && timeout 40 grep -n -w -i -E "ride|rides" src/ui/*.tsx src/ui/*.ts App.tsx src/store/sports.ts src/store/routeFromRide.ts src/location/index.ts app.json | grep -E "['\"\`>]" | grep -v -E ":[0-9]+:\s*(//|\*|/\*|\{/\*)"
   ```
   Expected remaining matches — **all identifiers / ids / paths / comments, none a visible noun**:
   `'rides'` (Tab id, `source: 'rides'`, `tabNav.go('rides')`), `rides/${…}` read paths
   (`RidesScreen.tsx`, `RideDetailScreen.tsx`, `selfRaceModel.ts`, `replayModel.ts`),
   `key="ride-trace"` / `id="ride-trace…"` / `id="rider"` / `id="rider-dot"` (`wayMapView.tsx`),
   `'demo:first-ride'` / `'demo:second-ride'` (`DemoScreen.tsx`, `demoWayFixture.ts`),
   `'qualifire-ride-tracking'` (`index.ts`), `` `ride:${…}` `` (`wayAssetRuntime.ts`),
   `FREE_RIDE_ROW_NAME` references, `styles.rides` / `rides:` style key (`resultsWayList.tsx`),
   `.rides` / `rides ==` / `rides.length` / `[rides]` deps (`RidesScreen.tsx`, `settings.tsx`),
   `.filter((r) => …)` on `rideIndex.rides` (`lastRide.ts`), `${usage.rides}` expression bodies
   inside otherwise-correct templates (`settings.tsx:540`, `sports.ts:216`), the GateSet `note`
   literal `re-seeded when ride ${rideId} became the reference` (`routeFromRide.ts:120` — stored,
   never rendered), and lines whose only match is inside a `//` trailing comment. Anything else →
   not done.
   Also: `grep -n "recording ride" src/location/index.ts tests/ridenotification_suite.ts` → no
   output; `grep -rn "Free ride" src tests` → no output; `grep -n "RIDE" src/ui/resultsListModel.ts` → no output.
5. `GIT_OPTIONAL_LOCKS=0 git status --porcelain` → exactly the files in "Files touched" (plus
   whatever 01/03/04 left). `git diff --stat` shows no file outside that list.
6. Inspect (fresh Opus): reruns 1-5; additionally reads every hunk of the diff and confirms (i)
   no identifier, key, path or id changed (`git diff | grep '^[-+]' | grep -v -E "^(\+\+\+|---)"`
   — every `-` line's non-string tokens reappear unchanged in its `+` line), (ii) every article
   before "activity" is "an" / "An", (iii) every plural form is `activit${… ? 'y' : 'ies'}` or a
   literal `activities`, (iv) `Tab` type untouched, (v) `app.json` diff is the single string.

## On-device checklist — Nathan (after build 8; group A alone would show on an OTA)

Screens to open, what to read — every item should say activity/activities, never ride:
1. **Tab bar**: `RECORD · ACTIVITIES · ROUTES · RESULTS · SETTINGS · DEMO`; the bar still scrolls
   sideways and `ACTIVITIES` is neither clipped nor wrapped (Samsung and Honor).
2. **ACTIVITIES tab**: title `ACTIVITIES` with `Refresh` beside it on one line; sport badge;
   empty state `No activities yet…` (on a virgin install) or the list; a free record's row reads
   `Free activity`; section head `FREE ACTIVITIES`; pull-down `Could not load activities` is
   not expected (only on a read error).
3. **Activity detail** (tap a row): top title `ACTIVITY`; `reference activity of …` on a
   reference; `FREE ACTIVITY` card / `saved as a free activity` / `no lap, no sectors — a free
   activity …`; bottom button `BACK TO ACTIVITIES`; `Delete activity?` alert; the
   `Save as free activity` / `Not a free activity` buttons; ranking line `… excluded this
   activity from ranking` when excluded; `N activities of history — too few to rank` on a way
   with 1-2 activities.
4. **Replay** from a free record: `no replay — this activity never crossed START on this way`.
5. **RESULTS**: `… · 3 activities` under a route card; `FREE ACTIVITIES` section; `… · free
   activity` rows; empty state `NO RESULTS YET — DO A ROUTE FIRST` (virgin install); way list
   count `12 activities` sits on one line next to the way label; detail: `ALL 27 ACTIVITIES ·
   fastest first` / `LAST 9 ACTIVITIES` captions, `27 activities` under the date.
6. **RECORD**: after STOP `Activity saved — 12:34.` / `Find it in Activities.`; `Discard
   activity` under PAUSE › RESUME|END; `Discard activity?` alert; the yellow sub-label `same
   activity · new meaning`; naming card sentences `This activity …`, button `SAVE AS FREE
   ACTIVITY`; gate card `… of your activity … after a few activities`; `your pick is locked for
   this activity`. Force-kill during a recording and reopen: `Unfinished activity found` /
   `Save activity`.
7. **Notification** while recording: `Qualifire — recording activity` (title), timer body from
   03, plain card from 01.
8. **ROUTES › way detail**: `activities on file`, `reference activity` row; delete a way:
   `… scored activities on this way … the activity recordings themselves are kept.`; EDIT
   GATES: `… Its N timed activities are re-timed … the activities do.`, subtitle `… this way's
   activities — the reference activity included …`.
9. **SETTINGS**: sport rows `2 routes · 5 activities`; `… — delete those first`; `Race your past
   activities`; `STARTING AN ACTIVITY`; `Reference activities`; Reset app confirm text `N
   activities, …(ACTIVITIES → Export GPX+ …)`; press Reset while recording → `An activity is
   being recorded`; help hints (`?`) under Active sport / Auto theme / Race your past
   activities / Start place / Rankings / Reference activities / Reset app.
10. **DEMO** section: `DEMO ACTIVITY`, pills `FIRST · SECOND · TENTH` on one row, `RUN DEMO
    ACTIVITY`; after the demo: `Activity saved — …`.
Paste screenshots of 1, 2, 5 and 10 into this folder's `PROGRESS.md`.

## Out of scope

- The verb "ride" anywhere else in prose (none found besides S1), identifiers, ids, paths, test
  names, comments, `STATE.md`, `OPEN-ITEMS.md`, cycle docs, `README`s — the coordinator notes in
  `STATE.md` that the user-facing noun is now "activity" while the code noun stays "ride".
- GPX `<type>ebikeride</type>` in both exporters — a track-type token read by other software, not
  app text; changing it could alter how importers classify the file. Listed for Nathan under Open
  call B.
- `expo-location`'s notification **channel name** (Android shows it in the app's notification
  settings) — expo-location's own default, not a Qualifire string.
- A per-sport vocabulary ("ride" for Bike, "run" for Run…): there is no label table today
  (`sports.ts` holds free-text sport labels only); building one is a design task, not this brief.
- Any layout change beyond the pill wording (Decision 5).

## Open calls for Nathan (executor does NOT act on these)

- **A. "rider".** No user-visible string says rider / riding / ridden — the word exists only in
  identifiers (`rider` replay state, MapLibre layer ids `rider` / `rider-dot`, `theme.riderBlue`)
  and comments. Nothing to decide for the screen today; if a future string needs the person,
  proposed neutral wording is **"you"** (matches the existing `so it still races you as a dot`).
- **B. GPX `<type>ebikeride</type>`** stays. If Nathan wants exports to say something
  sport-neutral, that is a separate ruling (it touches both exporters and gpxplus fixtures).
- **C. `NO RESULTS YET — DO A ROUTE FIRST`** (Decision 4) — if he prefers `RECORD A ROUTE FIRST`,
  it is a one-line follow-up.
- **D. Demo pills** `FIRST / SECOND / TENTH` (Decision 5) — noun dropped for width; if he wants
  the noun back it needs `numberOfLines={1} adjustsFontSizeToFit` on `pillText`.

## Report back

- Verification 1's FAIL offenders list (before), the final summary line (after), `tsc` exit code.
- The Verification 4 grep output in full, each remaining line classified (id / path / comment /
  style key), and the three targeted greps (empty).
- `git status --porcelain` and `git diff --stat`.
- The inventory rows ticked, plus any row whose Before text was not found verbatim or was found
  more than once — **verbatim, and stop there**.
- Any string the new test flagged that is not in the inventory (added or allowlisted, with the
  file:line).
- Reminder line for the coordinator: "group A is OTA-able; app.json (B1) needs build 8 — ship
  together with 01 + 03 in build 8; do not OTA app.json".

## Ruling (Fable, 2026-10-03) — executor escalation on the §5f test

Executor applied the whole brief; the §5f test still failed on 3 lines. Ruled and applied in
`tests/recordflow_suite.ts` only:
1. `settings.tsx:540`, `sports.ts:216` — **false positives**: the template literals are correct,
   the regex hit the identifier `usage.rides` inside `${…}`. Fix: blank `${…}` expression bodies
   (`raw.replace(/\$\{[^{}]*\}/g, '${}')`) before matching, so only a template's literal
   characters are tested. No allowlisting of `usage.rides`.
2. `routeFromRide.ts:120` GateSet `note: \`re-seeded when ride ${rideId} became the reference …\``
   — not in the inventory; it is stored metadata never rendered (`grep "\.note\b" src/ui` → none),
   the same class the brief already carves out for `routeCreation.ts`. Fix: one allowlist line
   anchored to **that file and the literal's opening words**, not a generic `note` or `ride`
   exemption. Executor rule list updated to name it.
Negative check: re-introducing `ride${…}` at settings.tsx:540 and rewording the note to
`re-seeded when the ride …` both FAIL the test; restored → 791 tests, 788 pass, 0 fail, 3 skip;
`tsc --noEmit` exit 0. Verification 4's expected-remaining list now names these three lines.

