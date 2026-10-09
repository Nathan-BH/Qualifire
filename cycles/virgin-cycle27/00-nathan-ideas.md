# Nathan's ideas — cycle27 (started 2026-10-08)

Status key: `captured` (words only) | `digested` (Haiku digest filed) | `planned` (Fable ruling proposal + executor brief written, 2026-10-08 — see 10-plan.md; nothing executed) | `briefed` (brief is FINAL and approved for execution after the 2026-10-09 Fable pass — order in 10-plan.md §15; nothing executed yet) | `researched` (feasibility note only) | `promoted` (moved into a real cycle)

| # | Idea (short) | Status | Digest |
|---|--------------|--------|--------|
| 1 | RECORD picker: smart default "going to" given "starting from" (most-used pairing), less friction | briefed (amended 2026-10-09: toggle + checkmark removed) | 01-record-smart-pairing-digest.md · 11-brief-record-pairing.md |
| 2 | Tier colours (yellow/green/purple) inconsistent between Activities map line and sector/total time text; map green + yellow too bright, purple fits neither | briefed (FINAL rewrite 2026-10-09; the 10-08 trial in the tree is replaced by the brief) | 02-tier-colours-digest.md · 11-brief-tier-colours.md |
| 3 | RECORD screen slogan reads "same activity - new meaning"; change to "same route - new meaning" | briefed | 03-record-slogan-digest.md · 11-brief-record-slogan.md |
| 4 | Smartwatch glance for runners: circular sector ring (sector colours) with current position P in centre, current sector "breathes"; no map | researched | 04-watch-glance-digest.md · 11-note-watch-glance.md |
| 5 | Phone live ride: show only position P below the map; current sector strip + label "breathe" (slow fade) instead of showing sector as text next to position | briefed | 04-watch-glance-digest.md · 11-brief-breathing-sector.md |
| 6 | Consistency: all maps edge to edge (as the ACTIVITIES maps already are) | briefed | 05-maps-edge-to-edge-digest.md · 11-brief-maps-edge-to-edge.md |
| 7 | Rename the current MAP tab to "ROUTES" - does it fit the tab design and functions? | briefed | 06-map-tab-name-digest.md · 11-brief-routes-tab-rename.md |
| 8 | Map controls: MAP tab full-screen map has different controls (no free two-finger rotate, arrows instead of ME/FIT); want only +, -, ME/FIT; retire north-arrow button on ALL maps | briefed | 07-map-controls-digest.md · 11-brief-map-tab-controls-and-dot.md |
| 9 | MAP tab: show own position as a blue dot when location is on | briefed | 08-map-tab-blue-dot-digest.md · 11-brief-map-tab-controls-and-dot.md |
| 10 | ACTIVITIES cards: no negative states. Drop "interrupted"; replace "no lap"/"missed" with blank or total time + "not ranked" | briefed | 09-activity-card-negative-states-digest.md · 11-brief-activity-card-states.md |
| 11 | Replay: add a 1x speed option next to 5x, 15x, 25x | briefed (1x on BOTH dials, one-line switch to restrict) | 14-replay-speed-digest.md · 11-brief-replay-1x.md |

## Ideas (verbatim-ish)

### 1 — RECORD tab: smart from -> to pairing (2026-10-08)
> on the RECORD tab: the order of the pills is good in most used order but the mapping between
> from and to should be better: for example if i pick starting from Home, it should auto-highlight
> my most popular destination from home which is work. What it does now, is it highlights a random
> other "going to" pill (or maybe there is an underlying logic i dont comprehend, like most recent
> or whatever).
>
> not sure if thats the fix, but just in general lets think how to make this picking smart to
> reduce friction, because most of the times i do the same routes so it would be nice to be helped
> in that, with of course still the option to change it, but just that it auto-picks correctly already.

Open questions (for later planning, not decided): what counts as "most popular" (ride count, recency,
time of day / weekday)? What if no history yet (virgin seed)? Does auto-pick also apply to route variant?

### 2 — Tier colours inconsistent (map vs times), Activities tab day mode (2026-10-08)
> Colouring: i will now talk only about the activities tab, which i am currently viewing in day mode,
> because there is where i noticed this behavior, but its outcome will of course apply more broadly in the app:
> * what i see: the tier colours (yellow,green,purple) used in the app are not always the same
> * the colours on the activities map is not always the same as the colours for the sector times or total time.
>   * i am looking specifically at green, and i see the map green is quite bright almost fluo, and fits poorly in the app. While the text green is a bit more dark, a bit more khaki colour and seems more mature and complex colour, than the saturated green of the map.
>   * So first step is conforming what i see and tell me what both colours are
> * same for the yellow, which on the map line is a bit too bright and childish while the time yellow is more dark and fits better on screen.
> * the purple also seems like a different tone, but none of the two purples i find particularly good fitting within the app, so that one would need changing anyways
>
> do you recognize these observations in the code and you think we can act on it ?

Open questions (for later planning): one single tier palette token set for map + text everywhere? New purple to pick (Nathan's call, visually).

#### 2 — Nathan's leanings after checking the app (2026-10-08 00:42, NOT final decisions)
- Colour table in 02 digest confirmed correct in the app.
- Gut pick: the darker green (#007A00) and darker yellow (#8C6900), and purple #C364FF.
- Green and purple appear nowhere else in the app except sector times / total activity time, so changing them is safe.
- Yellow needs thought: #F5C542 is the brand colour used everywhere else. Proposal: use #8C6900 ONLY to mean "yellow sector" (map or text).
- Proposal: keep the ridden reference line (and the MAP tab map) at brand #F5C542; only when the sector-colours toggle is on, yellow sectors during/after a ride draw as #8C6900.

Coordinator observations to carry into planning (from digest 02, not rulings):
- In code, brand yellow, "neutral" and the yellow tier are ONE token (colors.neutral = YELLOW_TIER = #F5C542, theme.ts:19, tierColour.ts:15). Splitting brand from tier-yellow means a new token.
- The darker greens/yellow are day-card values on a white card. Night text uses #00D000 / #F5C542 on a dark card; dark #007A00 / #8C6900 would be hard to read there, so night needs its own variants (Nathan to judge visually). Same for the map on the dark basemap.
- Day neutral text is already #B98A0A (theme.ts:74), close to #8C6900: two similar dark golds in day mode.
- Tests assert these values (ridedetail_suite.ts:266-277) and would need updating with any change.

#### 2 — Nathan's clarification (2026-10-08 00:48)
- His picks apply to BOTH day and night themes: green #007A00, yellow-tier #8C6900, purple #C364FF, in day and night, for map line and text.
- He wants to see them on his phone first (later, when this idea is promoted to a real cycle). Values can still change after seeing them.
- Not started: no code, no plan, no preview build. Parking only.

### 3 — RECORD screen slogan (2026-10-08)
> i now just see that on the record screen the record button reads "same activity - new meaning"
> which is probably due to the ride>>activity renaming. But this slogan does not sound right,
> how about updating it to "same route - new meaning" ?

### 4 — Smartwatch glance for runners (2026-10-08, not urgent)
> also had another crazy idea that is probably not urgent but can be logged already is i was thinking
> about runners for example that dont use their phone to look during running and dont have a stand like
> bikers; they might use their smartwatch:
> * so i wanted to have a quick idea of whats possible on that end, do we need to make a new app for
>   watches, or if the phone and watch is connected could we just have some things show on the watch,
>   my idea is no map on the watch as the screen is too small but sector/times/postion is possible
> * my idea would be to turn the sector strip into a circle divided by sectors. Then each sector can
>   colour itself like we have now. And in the center of the circle we can simply show the current P position ?
> * i am actually not a fan of showing like S"x" for a specific current sector as text in the center next
>   to the position, i think we can be smarter with it and have the "current sector" like "breathe" so
>   slowly fade in and out to show it is active

Open questions (for later): which watch(es) does Nathan / target users have (Wear OS, Apple Watch, Garmin)?
Feasibility of phone->watch display vs native watch app needs platform research (not answerable from the code).

### 5 — Breathing current sector on the PHONE live ride too (2026-10-08 00:55)
> the sector breathing idea i actually want apply to a normal ride on the phone app as well:
> * currently doing a ride with self racing, it shows below the map both sector and position
> * i think we should just show position and have the current sector strip+label breath in a same way, what do you think ?

Related to idea 4 (same breathing cue; the phone version is the nearer-term one). Coordinator view given in chat:
agree; keep an opacity floor for outdoor legibility, honour reduced-motion, check allowlist STALE entries if text is removed.

### 6 — All maps edge to edge (2026-10-08 01:01)
> i think for consitency, all maps should be edge to edge now, as it is already the case for the ACTIVITIES maps

### 7 — Rename MAP tab to ROUTES? (2026-10-08 01:05)
> i am thinking the current MAP tab, should maybe be renamed to "ROUTES", would this make sense with
> the current tabs design anf functions ?

Note: cycle24 turned the old ROUTES tab into the MAP tab (places + routes merged); this would partly reverse the label. See cycles/virgin-cycle24.

Coordinator view on 7 (chat, not a ruling): leans yes. Sibling tabs name their content (ACTIVITIES), MAP names a presentation;
the screen's own detail pages already say "ROUTES FROM HERE / TO HERE"; Route is the app's core noun. Cost: places become
less visible in the name; stale STATE.md / GLOSSARY.md tab lists would need fixing in the same change.

### 8 — Map controls: MAP tab vs other maps, north arrow (2026-10-08 01:08)
> also i dont know why the map control buttons for the full screen MAP tab is different:
> * the two finger controls dont work properly, i can only zoom in and out, but not rotate the map freely like other maps. Instead of the ME/FIT button there are these arrows which i dont like just remove it.
> * i think we only need three buttons, +,- and ME/FIT
> * also for all other maps, i think the "north arrow" button is unecessary and can be retired entirely; as pressing the ME/FIT button already rotates the map properly ?

### 9 — Blue dot on the MAP tab (2026-10-08 01:09)
> also to appedend to the MAP tab changes, we should see ourself as a blue dot if location is on and
> i am looking at the MAP tab, seems like a no brainer, dont know why it is not the case
(Belongs with idea 8: both are MAP tab map changes.)

Coordinator note on 8 + 9 (from digests 07 and 08, chat summary, not rulings):
- The "arrows" Nathan sees on the MAP tab are most likely the FIT glyph (a diagonal-arrows symbol); the MAP tab has no ME button at all.
- Rotate is off on the MAP tab by one explicit prop (touchRotate={false}, catalogMapView.tsx:263), set by cycle24 brief 03 with no recorded reason.
- Caveat for retiring the north arrow everywhere: FIT/ME keep a rider's manual two-finger rotation; only the up-arrow clears it (wayMapView.tsx:489-498). Without it there would be no way to reset north after a manual rotate unless FIT/ME is changed to also reset bearing.
- Blue dot: the MAP tab has no location code; the dot layer exists in WayMapView (rider-dot, colors.riderBlue); the non-prompting refreshPositionIfPermitted() exists; permission is only requested on RECORD today.

### 10 — ACTIVITIES cards: nothing negative (2026-10-08 01:17)
> i saw on one of my testers screenshot from the activities tab she had some activities with:
> * instead of the full time being shown a big "no lap" text and then next to it "missed"
> * other activity has a time showed but then "interrupted" label under the P1/1 position text
>
> I think she might have missed some gates or been paused but the app should not show either as blocking
> * interrupted should be removed, it is of no concern to the user and in general
> * and instead of showing no lop or missed; just leave it blank, or show the total activity time instead, with "not ranked" next to it, where the positions label would normally be ?
>
> these are just suggestions, you might find a better idea; but overall it follows my philosophy of
> 1) nothing is a problem and 2) lets not show user problems or anything negative; "no lap" just becomes
> a different type of card and does not feel like a big failure of the user or the app (even if the user
> did something wrong, the app showing it also stains the app's image in my opinion, so lets keep everyone
> happy and the app working fine)

Standing principle (Nathan): nothing is a problem; never show the rider's problems or anything negative. Check against qualifire-ui-and-fix-principles when planning.

#### 8 — Nathan's ruling (2026-10-08 01:19)
> lets have the fit option reset the bearing so we can retire the north arrow
- FIT resets the bearing (north up) so the north-arrow button can be retired on all maps.
- Left open for planning: what ME does with bearing on maps that have ME (heading-follow in live ride?); whether FIT's reset applies on every map that has FIT.

Coordinator note on 10 (from digest 09, chat summary, not rulings):
- The tester's screenshot matches an older build (before commit c1f46ad, 2026-10-07 "vcycle23 feed + detail redesign"). The current tree already dropped the "no lap" hero and the "estimated | missed | interrupted" sub-label. Tester's build id not verified.
- Current feed card already shows "Not ranked" instead of the time for missed/estimated laps, but the stored raw lap time is hidden. Nathan's suggestion (show total time + "not ranked" in the position slot) differs: time stays visible.
- "interrupted" = a stop inside a sector; it is still a ranked lap with real moving time.

#### 8 — Nathan's ruling, ME (2026-10-08 01:22)
> ME should function as it is now, so it should not touch the bearing and keep heading during the ride
- ME stays exactly as today: it does not touch the bearing and keeps the heading behaviour during a ride.
- Only FIT changes: it resets the bearing (north up). North-arrow button retired on all maps.
- Planning must check: which maps have FIT without ME (MAP tab: FIT only), and that no map is left without any way to reset north.

#### 8 + 9 — Nathan's ruling, MAP tab gets ME/FIT and the blue dot together (2026-10-08 01:25)
> fit button never exists in isolation i think, it is always coupled with ME: this also goes together with my
> "... we should see ourself as a blue dot if location is on and i am looking at the MAP tab ..." comment earlier
> so it makes sense to have it together on the MAP tab as well
- The MAP tab map gets the same coupled ME/FIT button as the other maps (not a lone FIT), plus the blue dot when location is on. Ideas 8 and 9 are planned together.
- MAP tab control set therefore: +, -, ME/FIT (as Nathan said earlier), two-finger rotate enabled like other maps, no north arrow.
- Planning must check how ME/FIT is coupled on other maps (one toggle button vs two states), and that the MAP tab's ME behaves sensibly without a ride (centre on position when location is on; what when location is off).

### 11 — Replay 1x speed (2026-10-08 08:31)
> one more thing i wanted to add, is in the replay features, also have a 1x option, next to the 5x,15x and 25x options.
> Just write the haiku digest for it now, so it can be added to fable planning during the night resume

Coordinator note on 11 (from digest 14, not a ruling): Nathan named 5x / 15x / 25x. The code has TWO lists: REPLAY = [5, 10, 25] default 10 (replayModel.ts:23-24) and DEMO = 5 / 15 / 25 default 25 (demoModel.ts:385). The selector is a single cycling dial (not a row of buttons), so adding 1x is a list edit plus the wrap in nextReplayRate (replayModel.ts:31-34), and replay_suite.ts:455-459 pins the cycle. OPEN QUESTION for Nathan: which screen did he mean (Replay, Demo, or both)?

#### 2 — Nathan's ruling after seeing the preview (2026-10-09 00:02)
> i think this #8C6900 colour does not fit at all in the app. and should be removed, the #B98A0A intermediate however works well i think in day mode,
> but i have not seen it as a coloured sector on a map so i woild like to check that as well
- #8C6900 REMOVED. The yellow tier is now #B98A0A (the former day "no verdict yet" text colour) for text AND map line spans, so the app has two yellows: brand #F5C542 and #B98A0A.
- Applied the same day (chore): theme.ts tierHex.yellow, pin test, comments. 956 tests, 0 fail, tsc clean. Not published yet. Nathan wants to check the map sector colour on the phone (sector colours ON, 2nd/3rd ride).

#### 2 — Nathan's day-mode rulings (2026-10-09 00:11) and night-mode next (00:12)
> i think i would like to try the third purple #7B3FA8, and also i confirm the app yellow is better than the intermediate one.
- DAY purple = #7B3FA8 (candidate 3 of colour-pngs/day_purples_brand_yellow.png). Day green stays #007A00.
- Yellow tier = BRAND yellow #F5C542 everywhere, both themes (the #B98A0A "intermediate" is dropped too; #8C6900 was dropped earlier). Known cost: brand yellow TEXT on the white day card is 1.62:1.
- Day and night get DIFFERENT palettes (Nathan 00:05). Night: Nathan asked for purple candidates (colour-pngs/night_purples.png, rows 1-8; row 1 = current #C364FF). Night keeps brand yellow and green #007A00 for now (green on night card is only 2.9:1; #00D000 shown as reference in the image).
- NOT YET APPLIED to the app: needs a per-theme palette. Findings for the planner: filled purple chips use PURPLE_INK #120521 (near-black) on colors.purple (chips.tsx:38, tower.tsx:299, PreviewScreen.tsx:481); a dark day purple needs white ink, and colors.purple/green currently alias tierHex (theme-less) so tower/preview/ghost dots follow it; tierLineColour(tier) has NO theme parameter (callers: chips.tsx, DemoScreen, RecordScreen, rideDetailModel, wayMapView) so the map line is one colour for both themes today.

#### 2 — FINAL colour ruling (2026-10-09 00:24)
> for the next try i think i want to keep both the day mode green and purple for the dark mode as well ... #007A00 green and #7B3FA8 purple (typed #73BFA8, a typo — mint, not purple; confirmed intent = day purple)
- ONE palette, both themes: purple #7B3FA8, green #007A00, yellow = brand #F5C542. No per-theme map-line colour needed. Filled chips need white ink on purple in both themes. Night text contrast is low (purple 2.4:1, green 2.9:1 on night card) — accepted by Nathan as an on-device trial; yellow carries the row.
- Nathan then asked: Fable plan the still-open digest items, then execute all briefs.
