# Cycle 23 — Activities tab as a feed: Nathan's decisions (2026-10-06)

Source: chat with Nathan, 2026-10-06 evening. Digests: 01-activities-tab-digest.md, 02-map-and-sport-digest.md.
Status: design settled, no brief written yet. Fable writes the brief off-peak from the digests + this file.

## Goal
Activities tab becomes a scrollable FEED: every activity shown as a pre-expanded block, newest on top (same order as now). Feels like a feed, not a library of collapsed rows.

## Decided
1. One consistent repeated card per activity. Tap card opens a REDESIGNED full-screen detail page (see 'Detail page REDESIGN' below; the old 'keep it unchanged' idea was rejected by Nathan). All current actions survive: Replay, Export GPX+, Delete, Ignore/Count, Promote, Make route, Save/Unsave free.
2. Three-dot (⋯) quick-action menu on each card. Contents: 1-2 quick actions only (suggest Delete, Ignore/Count); the rest stays in detail.
3. LIVE MAP on each card. Static SVG trail thumbnails were REJECTED by Nathan.
   - Only a few maps live at once (cards on screen / just off it); others unmount. Recent activities are what riders look at.
   - Fast-scroll delay is accepted as normal feed behaviour.
   - Offline: maps may not load for older activities; showing recent/cached ones only is accepted. Not a worry.
   - Card shows card colour + trail line immediately, before tiles arrive (suggested; Fable to confirm feasible).
   - Card map gesture mode (Nathan, 2026-10-06): TWO-FINGER ONLY is the FIRST option to try (dragPan off, touchZoom/pinch on since a pinch also pans, touchRotate off, double-tap zooms off). One finger scrolls the feed, a tap opens detail, two fingers move/zoom the map. Nathan: two-finger map movement already works in the app and is trivial, so discoverability is not a worry. Fallback if it does not feel right: fully read-only card map.
   - RISK to check on Nathan's phone (cannot be tested in sandbox): Android native map view may swallow one-finger touches even with dragPan off, which would block feed scroll AND tap-to-open. If so, fallback is a transparent overlay above the map that handles the tap and lets scroll through. Build the map mode as a prop with two settings: 'readonly' | 'twoFinger'.
   - Map must be read-only on a card in the one-finger sense (touches pass through to the feed scroll). WayMapView has NO read-only mode today (always dragPan/touchZoom/doubleTap on, zoom bar always mounted): needs a small prop. See 02 digest §1.
4. Feed is per SPORT (active sport filter already exists in RidesScreen via activeSportId()); never merge sports. Free activities appear in the same feed within that sport; the separate "FREE ACTIVITIES" section header goes away, card accent distinguishes them.
5. Variants: route activity (lap time hero, rank, quality, sector strip); free / no-way activity (trail + duration, no rank/sectors).

## Detail page REDESIGN (Nathan, 2026-10-06 22:36)
Nathan does NOT want the current detail page kept as-is; it must integrate with the feed.
- FULL-SCREEN stays (decided; bottom sheet rejected). Entered also from post-stop, Routes, Results (request.source) with different back labels: must keep. Back must restore the feed scroll position.
- Motivation to tap an activity: compare (vs other rides on this way, sectors vs average), look closely (big map), manage (ignore/delete/promote/name/save free), take out (replay/export).
- Layout direction: map FIRST, large, full-bleed; lap/rank/quality; sector rows with gap to average; ranking rows ("on this way"); one-off setup actions (promote / make route / save free) only when applicable as a plain suggestion row; Replay = single main button; Export, Ignore/Count, Delete in the same ⋯ menu as the feed card.
- Tapping a sector chip highlights that stretch on the map (suggested).

## Visual language: NO nested rounded rectangles (Nathan, 2026-10-06 22:36)
Current detail page stacks rounded boxes (map box, card box, actions with no box) which breaks flow. For feed AND detail:
- No bordered/rounded containers; content sits on the screen background. Structure from spacing, hairline dividers, type size, small-caps section headers.
- Maps run edge to edge (full-bleed, no corner radius, no border) so they are not clipped. Text padded ~16dp.
- Feed card = borderless full-width block, hairline divider between activities. The 3dp left accent bar (current free/route marker) does not fit full-bleed: replace with small label/dot by the date; lap time keeps tier colour.
- To check: Android edge swipe-back vs full-width map; contrast of text + sector colours on bare background in day and night themes.
- Visual-only change: no data/logic change.

## FIRST VERSION direction (Nathan, 2026-10-06 22:51)
After seeing the three mockups (03-preview-A/B/C): they represent his idea well. For the FIRST build use preview B: flat borderless feed (text on page background, hairline dividers) BUT the map stays clipped inside a bordered rounded rectangle, as the app does today, for consistency with the rest of the app (real tokens: radius.card 16, cardBorder day #E0D9C4 / night #41414c). Full-bleed edge-to-edge map (preview A) is DEFERRED, not rejected: revisit after the first version. Same bordered map applies to the detail page's big map (inset with margins). Preview B was updated to show this.

## Proposed card layout (from chat)
Header: route name + date/time. Hero: lap time in tier colour, rank + quality beneath. Live map ~140dp, sector-coloured trail when s.sectorColours on. Sector strip: S1/S2/S3 chips with times in tier colour. Footer right: ⋯.

## Open for Fable
- Distance / duration for free activities: duration exists (FreeRideRecord.durationS, may be null); distance would have to be derived from fixes.
- Exact number of live maps mounted at once; FlatList/SectionList windowing settings (digest 02 §7: SectionList defaults, no FlashList).
- Per-card ride-fix read (readRideFixes is async per ride) needs pacing for long lists.
- ui-strings.allow.json: any new rider-facing strings (⋯ menu items) must be added with a one-line reason; no em dashes, <=40 chars.
- First build should be small (few live-map cards) so Nathan can judge scroll smoothness on his phone; smoothness cannot be tested in the sandbox.
- This is a design, not implementation: nothing here is in the app until built.

## Feedback 2026-10-07 (first on-device test of the feed) -> brief-04-feedback-polish.md
1. Card maps: several live maps work well and load immediately. The feed maps were NOT movable at all (1 or 2 fingers; the block's outer Pressable claims the touches). Unintended, but Nathan says it is exactly right: feed maps must stay NOT movable; only tapping a card opens the movable detail map. DESIGNED behaviour now: CARD_MAP_GESTURES = 'readonly' ('twoFinger' code path kept for other uses; comments corrected).
2. Divider between cards: 1 dp is too thin -> clearly thicker (3 dp), and more air between the block's top/bottom elements and the divider (padding 14/15 -> 22/22). Card heights recomputed: route 290 -> 307, plain 256 -> 273.
3. Feed maps edge to edge: same 150 dp height, no 16 dp side margins, no border, no corner radius (like the MAP tab's full-width map); text keeps its 16 dp padding; the 'i' credit button stays tappable and inside the screen. New opt-in WayMapView prop `bleed` (default false = every other caller unchanged). The DETAIL page's big map stays exactly as it is.
4. Question, no change: the word 'interrupted' on some cards is the lap-level quality label (store/derive.ts: one interrupted sector makes the lap 'interrupted'; moving time still real), shown via feedModel.ts subLabel like the old collapsed rows did. It is not a leftover of the pause glyph removed in cycle 22 (sector-row glyph, rideHistoryModel.ts). Nathan has not decided whether to reword/hide it: left as is.

## Feedback 2 (2026-10-07 22:35) -> brief-05-not-ranked-and-lap-wording.md
Nathan, after the brief 04 build, on question 4 (the word 'interrupted') and the quality words in general:
1. Feed card: NO quality words at all ('interrupted', 'estimated', 'missed', 'ignored' all go). An interrupted lap has real moving time: ordinary ranked card (normal hero, normal strip). A ride that cannot be ranked (lap quality estimated or missed, or the rider ignored it from ranking) shows NO time, NO rank, NO '~', NO 'no lap': a dim 'Not ranked' label instead; the sector strip goes. Title (way name / From to To) stays; the ride is NOT converted into a free activity; data/storage/engine untouched (display only). "Lets not estimate anything, either a ride is good and ranked, or it is not, gets no time, no rank." 'Ignore in ranking' / 'Count in ranking' stay (the way back).
2. Detail page: same principle (no estimated time, no '~', no 'no lap', no quality word as a verdict decoration): 'Not ranked' instead of the big time/rank. Nathan did NOT say whether the detail keeps an explanatory reason line; Fable's default keeps one, reworded (brief 05 § 10).
3. Wording: "we should not call this laps anymore, this is not a formula one race, there is no lap on an activity from A to B". Rider-facing 'lap' goes from the real app screens; code identifiers (lapS, lapLabel, lapTier, ...) stay.
Fable rulings on the open points (label in the hero slot, scope of 'unranked', the three reason lines, blank sector cells, replay flash, tower LAP -> TIME, preview mockup left): brief 05 § 1 and § 10.

## Feedback 3 (2026-10-07, after the brief 05 Inspect) -> brief-06-followups-no-estimates.md
Nathan's rule, binding everywhere a rider looks: nothing is ever shown as an estimate. A ride, sector or finish either has a real time (and a rank where it applies) or shows nothing / 'Not ranked'. The word 'lap' never appears in rider-facing text. He asked to fix all four brief 05 Inspect findings:
1. GATES alert text built in store/routeFromRide.ts ("its lap comes out 'estimated'", em dashes): reworded, no 'lap', no dash, <= 20 words.
2. REPLAY of an unranked ride blanked the big clock for 2.5 s at the finish: no finish flash when there is no real time.
3. '~' estimates still flashed on RECORD (live) and REPLAY (per sector): no '~' time anywhere; a sector or finish without a real time flashes nothing and the clock keeps running.
4. RESULTS said 'NO TIME' / 'TODAY · unranked': now 'Not ranked', matching ACTIVITIES. Wording only; the RESULTS redesign stays with cycle 25.
Plan (Opus, Fable not used this round at Nathan's request) rulings and the points for Nathan to look at again: brief 06 § 1 and § 9.
