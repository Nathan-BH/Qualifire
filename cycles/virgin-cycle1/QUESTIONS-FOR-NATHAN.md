# virgin-cycle1 — questions that need your answer

Modelled on `main`'s `cycles/cycle-025-briefs/QUESTIONS-FOR-NATHAN.md` convention (now also
written up as a standing rule in `process/CONVENTIONS.md`). Type your answer into the
**Answer:** line under each question, save the file, and whoever picks up this cycle next
reads your answers straight from it — in this chat, a fresh chat tonight, or off-hours.
Nothing here is a decision until it lands in `STATE.md`/`OPEN-ITEMS.md`; this is just the
collection point.

---

## Already ruled (recorded here for completeness, not open)

- Ride-2 fix target: "recognize as unmatched/virgin and handle like ride 1," not "make the
  reverse direction lock." → shipped in WP-A.
- Route pick enforcement (was open question 3 in the review): hard lock, per your notes5
  2026-08-29 note ("what you pick should stay locked until the end") → shipped in WP-A.
- Audio/TTS (item 17): parked until the virgin path is solid, since it needs a new build
  regardless.

## Ready to execute now — no answer needed

- **WP-B** (GPX+ pick/lock-change logging), **WP-C** (drawable user routes — the biggest
  lever), **WP-D** (rider-only map), **WP-F** (post-stop reference offer), **WP-J**
  (breadcrumb trail), **WP-L** (start auto-detect suggestion) — all have execution-ready
  briefs in this folder and don't need anything from you to start.
- **WP-N** (round gate-tick line-caps) — a two-line style chore, no brief needed.

## Questions — answer inline, one per block

### Q1 — `WP-I-gate-card-map-scrub.md` (finger-scrub on the gate-adjustment card)

STATE.md's settled ground rule is "adjustment UI is tap-then-nudge with ± buttons, never
finger-dragging (thumb covers the line)." What you described — tap a gate to select it, then
slide a finger left/right *anywhere* to scrub the gate earlier/later along the ride — may not
actually be what that rule was written against (your finger isn't on the line itself). But
STATE.md is binding, so this needs your explicit re-opening before anyone plans it.
Recommendation: keep the existing ± pad (it's built and glove-friendly), add the scrub as an
alternative input on top of the same "select first, then move" model — both coexist. Agree,
or would you rather the pad go away entirely once scrub exists?

**Answer:**

### Q2 — `WP-G-specifications-route-variants.md` (route specifications/variants)

Free-text tags, a fixed condition vocabulary (Dry/Wet + a free variant name), or both? And:
are conditions per-*route* (a genuinely new Route under the Way, e.g. "HomeWorkDryLeft") or a
per-*ride* attribute that doesn't create a new Route at all? This decides whether the work is
medium or a lot larger.

**Answer:**

### Q4 — `WP-H-ride-detail-screen.md` (RESULTS tab's fate)

Keep RESULTS as a summary-statistics tab, or drop to a 4-tab layout with the new post-stop
ride-detail screen absorbing its job entirely?

**Answer:**

### Q5 — `WP-M-record-setup-layout.md` (RECORD setup pill layout)

Tight-and-grows (pills flush-left, wrap, the layout grows naturally as your catalog fills up
— our recommendation, since a fixed "final form" layout would look mostly empty for a
stranger's first week) or a fixed final-form layout with gaps reserved from day one?

**Answer:**

### Q6 — `WP-E-virgin-manifest-leak.md` (bundled gates on a virgin free ride)

Strip bundled route assets from the `virgin` EAS build profile entirely, or keep them and
filter every map rung by the runtime catalog instead (this also only fixes the related
bundled-"Morning"-in-DEMO leak if DEMO is handled as its own separate case)?

**Answer:**

### Q7 — `WP-K-sector-coloured-trail-phase2.md` (unpause the live-map sector colouring)

Already-built on Result; extending it to the live/racing map just needs a yes. (Reminder from
your own clarification during the review: this means colouring the *segments between gates*,
not the gate ticks themselves — you said the gates "should not change colour like they do now
because it does not make sense, they are gates.")

**Answer:**

---

## Optional — worth answering eventually, doesn't block anything

- **Item 16** (gate visibility at zoom, both themes) is an on-device visual re-check, not a
  code question — do it once WP-C and WP-E have landed, whenever you have your phone in hand.
- Two things the review's Plan tier deliberately flagged but did **not** design, since they're
  new product questions rather than "apply an existing ruling": (1) once WP-B lands, a
  headless mid-ride relaunch currently drops the RECORD-tab pick entirely (re-arms with no
  pick) — under the hard lock that silently turns a picked ride into an auto-detect ride
  after a crash/relaunch. Worth a small dedicated follow-up: should the pick be persisted
  across a relaunch? (2) `evaluateLockState()`'s *live* lock path (not `finalize()`, which
  WP-A already fixed) has the same class of gap on the old 4-route Leuven catalog specifically
  — starting a ride right at an existing route's own FINISH gate and riding its ~600m tail
  home can verified-lock live on that route with every sector missed. Same root cause,
  different code path, not fixed by WP-A. Want this closed as its own small WP, or is it
  low-enough-odds to leave for now (it needs a ride that starts almost exactly at a known
  route's endpoint, in the wrong direction)?

## Not yet answerable — needs a design pass, not just your ruling

- **The nav-model call inside WP-H** (does the ride-detail screen need the tab navigator to
  grow a real stack, or can it reuse the in-tab-"phase" idiom RECORD already uses for
  armed/running?) — this should be decided together with WP-F's follow-on hook, not answered
  as a standalone yes/no here.
