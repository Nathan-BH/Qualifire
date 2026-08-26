# Qualifire — where things actually stand vs. your notes2 (written 2026-08-19/20, reviewed 2026-08-25)

I read your notes, then checked every point against the project as it stands today (the status file, the backlog, the cycle-024 report, and the app tree). The headline is unusual and worth saying plainly: **you wrote these notes on the 19th and 20th, cycle 024 ran from the 20th to the 24th, and almost everything you asked for in this file was built in that cycle.** So this review is less "here are your options" and more "here is what landed, here is exactly what's left of each ask, and here is what now waits on your eye."

One small housekeeping note: your second section is dated **20250820** — a year typo for 20260820. Worth fixing in the notes file so future searches by date don't miss it.

---

## 1. "I lack control on design — give me a folder of SVG recompositions of every tab"

**What's actually going on**

- Built, as cycle 024's WP-J, in two passes. There is now a `design/` folder at the repo root: **18 canonical SVGs — day and night versions of 9 screens** — regenerated from one script (`design/make_screens.py`), plus a `design/edited/` folder that exists precisely for your workflow: you open an SVG in Inkscape, drag/move/add things, save your version into `edited/`, and the team picks it up. A "check `design/edited/` for Nathan's changes" step was written into `process/CONVENTIONS.md` as a standing start-of-cycle check, so your edits can't silently rot there.
- The second pass was deliberately run *after* the RECORD/RIDES/RESULT rebuilds landed, so the pictures mirror the screens that actually ship — including race mode's record states, which was part of your ask.
- One honesty detail you should know before you open them: the SVGs **deliberately reproduce the app's real bugs** rather than drawing an idealized version. The known example is a real contrast bug — pale purple text on a bare background in the Rides sector rows and the Record gate-colour readout (B-149). It's in the SVGs because it's in the app; the app fix itself is still open. Known SVG-side nits: the settings screens still label one row "Timing tower" where the real app now says "Rankings" (B-150), plus two cosmetic items (B-82, B-83).

**Verdict: done, and in the shape you described.** The one thing that hasn't happened yet is the loop actually being exercised — nobody has round-tripped an edit through `design/edited/` yet. The proof of this feature is your first real round-trip.

---

## 2. The Strava-inspired ideas (launch animation, record flow, fullscreen race screen)

**What's actually going on** — all three of your sub-points became cycle 024's WP-A2, and they were built to your spec:

- **Record button → animation → armed-but-not-started race screen → real START.** The Record tab is now a four-phase flow: **setup → armed → running → ending**. Pressing record plays the launch-mark animation and takes you to the race screen with the route drawn and everything set but *not* started — exactly your "still not started, then on that screen you can actually press start" description.
- **The animation at STOP, reversed.** Built too: the ending phase plays a **reversed** launch-mark animation (the cycle-022 mockup's forward/reverse choreography). Your note said "let's test it out" — that test is now yours to run on the phone. Whether the reversal reads the way you imagined (yellow line un-drawing first, then the circle) is a taste call only you can make; if it doesn't, say so and it's a small tweak, not a rebuild. One real defect is already filed against it: if the phone's reduce-motion query never resolves, the reverse overlay can hang with only tap-to-skip as an exit — needs a watchdog timeout (B-111).
- **Fullscreen race screen, footer tabs hidden.** Built in the same package. It then produced the one bug you already found yourself: with the tab bar gone, nothing absorbed the phone's bottom inset, and your 2026-08-24 device report triggered a same-day hotfix. There's one check-back on you: **B-116** asks you to confirm the overlap you saw was the real OS navigation bar and not Expo preview chrome — if it was the latter, the fix only gets partial credit and needs another look. Also filed, trivial: "fullscreen" keeps a 12dp floor so it's never literally edge-to-edge (B-115), and the padding strip's shade may read as a new cosmetic bug (B-113).
- Your observation that the fresh-launch animation "does not even happen anytime" when you reopen fast — nothing was done about the splash itself, and I'd argue nothing needs to be: your own proposal (move the animation into the record flow, where it plays every ride) is the fix, and it shipped. If you *also* want the app-open splash made reliable, that's a new, separate ask — say so explicitly.

**Verdict: built as asked; what remains is your on-device feel check.**

---

## 3. "RESULT and RIDES tabs don't make sense"

**What's actually going on** — this became WP-A3, plus the ride-history store (WP-A1) underneath it:

- **RIDES**: your exact ask — "previous rides should be clickable to expand them and look at them properly" — is the shipped design: **expandable rows showing route + date + lap time + rank**, backed by a real on-disk ride-history store (`results/index.json` + per-ride files) that finally survives restarts. GPX export didn't go away, it got *better* and quieter: the one export button now emits GPX+ with the full diagnostics block (B-68, done 2026-08-19 — your own request to fold it into the existing button rather than add a second one).
- **RESULT**: rebuilt as a **"your last ride" card plus a Personal Bests accordion across all 20 routes**. Note what happened to your open musing here: you asked "should it be clickable to see the results for all the routes, or from the last weeks (makes it similar to the RIDES tab then so maybe not)" — and you left that genuinely undecided in the notes. The team resolved the fork one way: **per-route personal bests, not a time-window view** (which avoids the RIDES-overlap problem you yourself spotted). I can't tell from your notes whether that matches your intent, because your notes didn't decide it. **This needs your call**: either the PB accordion settles it, or you still want a "recent weeks" view somewhere — one sentence from you closes it.
- The "take inspiration from my BETA-TESTERS comments" instruction happened: the panel's top findings (no ride detail, Rides as a bare fix-count list, nothing tappable) are precisely what WP-A1/A3 addressed.
- Real defects still open against these two screens, all filed: the contrast bug from theme 1 (**B-149**, the one real "needs fixing now" item here); both screens rank via a local lookalike of the store's own `ranks()` and will silently mis-colour a demoted lap the moment the tripwire rule goes live on app rides (B-117); a literal "today" label that can be wrong after time away (B-119); plus latent/cosmetic items B-118, B-120.
- Worth knowing on the honesty front: this package is also where two nasty bugs were caught *before* shipping — a backfill matcher that would have accepted false route matches nearly half the time (one fabricated 60-second "EveningA" lap would have become a permanent PB), and a crashed ride that could permanently poison a result. Both fixed and regression-locked; your comparison history is cleaner than it would have been.

**Verdict: rebuilt along the lines you asked; one open decision (RESULT's window question) is yours.**

---

## 4. "What are 'fixes' and why are they in the app?"

Straight answer: a **fix is one GPS position reading** — phone GPS jargon ("position fix"), arriving roughly once per second while recording. The counts were logged and displayed for exactly the reason you guessed: troubleshooting — confirming location updates were actually firing in the background, which was the make-or-break question in the early phases. It was never meant as a user-facing metric.

You were right that it shouldn't be in your face, and the redesign already acted accordingly: the old Rides list of "date + duration + fix count" is gone, replaced by route/lap/rank rows. Fix-level detail now lives where it belongs — in the GPX+ diagnostics export and internal logs. If you still see a raw fix count anywhere user-facing after the update, name the screen and it gets removed; I found no sign one survives, but the phone is the proof.

**Verdict: troubleshooting artifact, correctly diagnosed, already demoted from the UI.**

---

## 5. Free rides off known routes — the "new" landmark idea (your 2026-08-20 section)

**What's actually going on** — this became WP-B, "free-ride *new* mode," and it is the most fought-over package of the cycle:

- **Picking "new" at one end** — work>>new, new>>home — is built, exactly as the option under the Record tab's route pick, with directional filtering: pick work>>new and only the gates/routes leaving work stay candidates.
- **The gates-only map** is built: pick a "new" endpoint and the map switches to showing gates rather than one route, and gates are auto-picked-up as you cross them — sector times still get logged when your ride overlaps known routes, which was the whole point.
- **The separate "free rides" category** is built as an isolated store (`freeRides.ts` + its own cache file), deliberately walled off from the fixed-route comparison history. And here's the part worth your attention: it took **three inspection rounds** to close, because two successive review passes each found a path (an app relaunch, then a plain reopen) where a free ride could lose its "free" marker and **write its time into the real fixed-route history — exactly the pollution your note said must never happen.** The third round confirmed both paths plus a concurrency case are closed. Your core requirement was treated as the acceptance test.
- **What you explicitly deferred**: "new>>new" — unknown at *both* ends. You deferred it by name during the cycle (recorded as **B-139**); it currently just stays unfiltered rather than having a designed behaviour. It sits at the top of the open-work list waiting for a design pass whenever you want it.
- **Rough edges still open, all filed**: the gates-only map still uses the old circle style — transparent-fill, dark-stroke, **nearly invisible at night**, which is exactly when you'll want this mode (B-140, the most user-visible one); a pending-sectors strip renders meaninglessly above the free-sector list in free mode (B-130); after a true relaunch the map shows all routes instead of your filtered set — cosmetic, the engine's restriction itself survives correctly (B-129); the free-ride cache is one unbounded file with no pruning and no schema check (B-132, B-133); and a free ride's GPX+ export doesn't mark itself as free (B-136, closed for free by B-128's header fix).
- One open question I genuinely can't answer from the files: **where you browse past free-ride sector times afterwards.** The data is stored separately as you asked, and WP-B touched the Rides/Result screens, but I can't confirm from the records that there's a proper "look at my free rides" view rather than just the data being safe on disk. Check on the phone; if the answer is "the times are saved but there's nowhere nice to see them," that's the natural next work package, not a bug.
- Related and pleasing: your 20 Aug rides also produced false "off route" flags, and WP-E's switch to path-based off-route measurement was aimed at exactly those reports.

**Verdict: built to your spec including the anti-pollution guarantee; night-visibility of the gates-only map (B-140) is the one thing I'd fix before your next evening free ride.**

---

## What now waits on you (10 minutes of phone time, one decision)

Cycle 024 shipped a lot on your say-so descriptions; five items are explicitly parked as **NEEDS NATHAN**, and they overlap heavily with testing what your notes asked for:

1. **Ride the new RECORD flow** — record button, armed screen, START, and the reversed animation at STOP ("let's test it out" is now literally your action item).
2. **B-116** — confirm the footer overlap you reported was the real OS nav bar.
3. **B-145 / B-146** — the rider-dot blue (`#2F7DE1`, unratified, sits close to the night map's canal-water blue near Leuven) and the full both-themes map visual check.
4. **B-74** — the day-mode map remount retest.
5. **The RESULT decision** from theme 3: does the Personal-Bests accordion settle your "all routes / last weeks?" musing, or do you still want a recent-window view?

And one non-phone item: do one Inkscape round-trip through `design/edited/` so the design loop you asked for gets proven end to end.

---

## Classification of everything in notes2

**Concrete, actionable asks → already delivered in cycle 024** (verify on device, don't re-brief):
- SVG design folder with round-trip editing (WP-J, `design/`)
- Record-button → animation → armed → START flow (WP-A2)
- Reversed animation at STOP (WP-A2)
- Fullscreen race screen, tabs hidden (WP-A2 + 24 Aug hotfix)
- RIDES rows expandable with route/lap/rank (WP-A1 + WP-A3)
- Free-ride "new" mode: one-end-unknown picks, gates-only map, auto gate pickup, isolated free-ride category (WP-B)

**Concrete, actionable, still open → candidates for a work-package brief:**
- **B-140** — restyle the free-ride gates-only map's gates to the theme-aware ticks (night visibility; the one I'd do first)
- **B-149** — fix the purple-text contrast bug in `RidesScreen.tsx` / `RecordScreen.tsx`
- **B-130** — remove/replace the meaningless pending-sectors strip in free mode
- **B-111** — watchdog timeout on the reverse (ending) overlay
- **B-139** — design pass for "new>>new" (both ends unknown) — your own deferral, schedule when ready
- **Free-ride browsing view** — *conditional*: only if your phone check confirms there's no proper place to view past free-ride sector times

**Open questions needing your one-line answer:**
- RESULT tab: PB accordion enough, or also a "recent weeks" view?
- Reversed stop-animation: does the shipped reversal match your un-draw-line-then-circle vision?
- Do you also want the app-open splash animation made reliable, now that the in-flow animation exists?

**Just observations / answered — no action:**
- "What are fixes?" — answered above (GPS position readings, troubleshooting-only, already demoted from the UI).
- The launch animation being flaky on fast reopen — superseded by relocating the animation into the record flow, unless you say otherwise.
- The 20250820 date typo.

One last connective note: your notes1 complaint — "things get built and nobody tells me in plain words" — nearly repeated itself here: everything above shipped four days ago and this review is the first plain-words account of it reaching this folder. But the structural fix from notes1 also landed in the same cycle: there is now a standing **`NATHAN-STATUS.md`** at the repo root, regenerated each cycle, which is where "what just shipped, what needs you" is supposed to reach you first. If it had worked, most of this review would have been old news to you — worth glancing at it and saying whether it does its job.

---

*Prepared by a fresh-context research pass over STATE.md, product/BACKLOG.md, cycles/cycle-024.md, and the notes1 review, cross-checked against every point in Nathan's_notes2.md. No coordinates are cited in notes2, so no map links were needed.*
