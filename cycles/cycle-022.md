# Cycle 022 — Marketing website & mockup redesign

**Date:** 2026-08-19  
**Coordinator:** Haiku + Sonnet (no Fable)  
**Phase:** Design refinement, user feedback implementation

---

## Summary

Applied Nathan's comprehensive feedback from `Nathan's_notes1.md` and `Nathan's_notes2.md` to the marketing website and app mockup. Rewrote outdated/inaccurate copy, redesigned three app tabs to be user-centric, integrated the live mockup demo, and fixed the STOP animation.

---

## Work completed

### 1. Marketing website (`marketing/index.html`)

**Copy rewrite:**
- Hero kicker: "One rider · three tracks · zero rivals" → "A bit better every day"
  - Rationale: Original was too aggressive, specific to outdated 3-route system; new messaging emphasizes self-improvement
- Hero pitch: Removed F1 language ("Turn a repeated bike commute into an F1 qualifying session")
  - Rationale: Scares non-racers, sets wrong expectations; simplified to "Press start. Ride. Save. Next time, you've got something to race"
- "How it works" step 1: Removed "three known tracks" hard-coding; generalized to "whichever route you already ride"
  - Rationale: Now 19 routes in catalog; specificity is false
- Removed "flying start / 162 metres" detail from mechanic section
  - Rationale: 162 m is not always accurate; over-specific for marketing
- Removed triple-"no" negation pattern ("No other riders. No leaderboards. No calories.")
  - Rationale: Too strong, reads defensive; positive framing is better
- Colour section: reframed from "Colour is the scarcest resource" → "How today's ride gets its colour"
  - Rationale: Scarcity idea was Claude's proposal from BRAND.md, never Nathan's; removed entirely
- Philosophy section: replaced "No red. No streaks. No calories." with "A bit better every day."
- Footer: "One rider, three tracks, zero servers" → "Your own routes, your own history, zero servers"
- Kept "Same road. New meaning." (perfect, no change)

**Race-mode section:**
- Headline: "The screen drops to black. The colours do the talking." → "Minimal interface, maximum clarity."
- Body: Removed all "drops to black" / "near-black" / "paddock charcoal" language
  - Rationale: False now that day/night themes exist; new copy is theme-agnostic
- New copy: "Only the colour and numbers that matter — built for a glance under a second, not a stare. Chrome recedes, touch targets disappear, and the sector clock is the only thing asking for your attention. Day or night, the same rule holds: less to read, more to feel."

**New UI features:**
- **Sticky header:** Logo mark + "QUALIFIRE" wordmark + day/night toggle button + "Try it out" CTA
  - Appears on scroll when hero is ~60% off-screen
  - Smooth fade/slide transition with `requestAnimationFrame`
  - Respects `prefers-reduced-motion`
- **Day/night theme:** Full CSS variable palette for light mode
  - `:root[data-theme="light"]` with adjusted surfaces and ink values
  - Toggle button persists choice in `localStorage`, defaults to dark on first visit
  - Applied to all sections and components
- **Demo section redesign:** Replaced placeholder with live iframe embed
  - `<iframe src="../demos/mockup.html">` loads the real interactive mockup
  - Avoids CSS/JS collisions (mockup has its own bare `body{background:#000}` and class reuse)
  - Lazy-loaded; includes accessibility title and caption

**Technical:**
- Fixed smooth-scroll JS to use `querySelectorAll` (both hero and header buttons now work)
- Added `scroll-margin-top` to sections so anchor jumps aren't hidden behind sticky header
- Verified: no leftover F1 / 162 / flying / scarcest / rare-by-design / three-tracks / negation-phrases

---

### 2. App mockup (`demos/mockup.html`)

**RECORD tab redesign:**
- New three-phase flow: `setup` (default) → `armed` (ready, not started) → `running` (live ride)
- START button renamed to **RECORD** (red, dot icon; launch animation on click)
- RECORD button triggers launch mark animation (forward), then arms the RACE screen
- Armed screen shows picked route, from/to, live map (non-moving), START button to actually begin
- Running screen unchanged mechanically; button is END instead of STOP
- END saves ride, plays launch mark animation **reversed** (tail undraws first, ring undraws after), then lands on Result
- **Tabbar hidden during armed/running** (true full-screen mode; restored on ride end)
- Status line: removed raw "`N fixes`" count (Nathan: "I don't know what fixes are")
  - Now shows route + "route locked" / "gps live" only; fixes remain internal (GPX+ sidecar)

**RIDES tab redesign:**
- Rewritten from flat "fixes" list to expandable rows
- Each row: route name + date + lap time + `P{rank}/{of}` badge (e.g., "P3 of 10")
- Tap row to expand → see sector splits colour-coded against that route's ghost tower
- Export / Delete moved into detail view as secondary actions
- Removed "fixes" confusion from user interface

**RESULT tab redesign:**
- Rewritten from "just a fixed result" to "Your last ride" + Personal Bests
- Top card: last ride summary with shortcut to record another
- Personal Bests accordion: one row per route, click-to-expand into ranking (dates, never raw IDs) + best sector times
- Added MorningB tower (8 synthetic but consistent entries) + 4 matching rides so all four live routes represented

**Animation fixes:**
- Launch animation: ring draws (1.4s) + tail draws (0.5s delay 1.15s)
- Reverse animation (on END): tail un-draws (0.5s) + ring un-draws (1.4s delay 0.5s)
  - Bug fixed: ring now stays visible during delay via `animation-fill-mode: both` (was `forwards`)
  - Ring properly un-draws, visible throughout (not snapping from invisible → drawn → undrawing)
- Both animations respect `prefers-reduced-motion`

**Data & bugs fixed:**
- Added MorningB tower and matching ride entries for all four live routes (Morning, EveningA, EveningB, MorningB)
- Fixed Demo tab dispatch (was unreachable; render() fell through to settingsScreen)
- Fixed rank display: ride ending without full lap now shows "ended early — no full lap to rank" instead of nonsensical "P0 of 9"
- Fixed `rankInTower` dedup: keyed off ride identity (id/object reference) not lap-value equality
  - Prevents fragile ties when same lap time matches archive (was showing P5 vs P6 disagreement)

**Verification:**
- End-to-end Playwright testing: full RECORD→armed→running→END→RESULT/RIDES/ROUTES/SETTINGS/DEMO path
- Real-time and simulated-completion runs in both day/night themes
- Zero JS errors from app code (Leaflet CDN 403 is pre-existing sandbox limitation, unrelated to this cycle)

---

## Rationale

**Why these changes:**
1. **Marketing copy:** Nathan's feedback made clear the original was outdated (3 tracks → 19), technically false (162 m / "drops to black"), and marketing-tone wrong (F1 / negation / scarcity). Aligned copy to actual state (4 live routes, day/night themes, self-improvement framing).
2. **Sticky header:** Logo/name disappear on scroll; users couldn't download/CTA without scrolling back up. Sticky ribbon keeps brand + call-to-action always visible.
3. **Day/night theme:** App shipped theme support cycles 017+; marketing site was dark-only. Now symmetrical.
4. **Mockup tabs:** Nathan's notes identified three tabs as "not making sense" / "not appealing or useful":
   - RECORD flow was unclear (START button goes straight to race; no intermediate ready state)
   - RIDES tab showed "fixes" (internal GPS fix count), not ride history that users want
   - RESULT tab was static, not browsable
   - Rebuilt all three to be user-centric (history, expandable detail, rankings)
5. **Launch animation:** Requested reverse playback on END; was already coded but ring didn't appear during delay due to `forwards` fill mode.

---

## Files changed

- `marketing/index.html`: 902 lines (added sticky header, day/night theme, demo iframe, all copy rewrites)
- `demos/mockup.html`: 784 lines (up from 542; redesigned RECORD/RIDES/RESULT, fixed animation, day/night consistency)

---

## Next steps / blockers

- None in this cycle; marketing and mockup are now aligned with Nathan's feedback and current app state.
- Mockup ready for reference during real app tab implementation (RECORD/RIDES/RESULT flows can mirror mockup's UX).
- Marketing site live with day/night toggle; production deploy whenever ready.

---

## Testing performed

- Playwright end-to-end (mockup.html): RECORD → armed → running → END path in both themes
- Browser console: zero errors (Leaflet CDN 403 is external limitation)
- CSS verification: day/night variables applied throughout both files
- Accessibility: `prefers-reduced-motion` respected in all animations and transitions

