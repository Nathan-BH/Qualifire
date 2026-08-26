# WP — The maplibre `id cannot be changed` crash on new-landmark rides, and making the flight recorder crash-proof (cycle 025)

**Status: PROPOSAL / INVESTIGATION ONLY. Every item below is labelled UNBUILT — nothing has
been implemented, and no app code was touched or read in producing it.** Prepared 2026-08-25
from the 2026-08-24 and 2026-08-25 ride-day reviews. The crash mechanism below is the 24th
review's hypothesis from the visible screenshot source — that review explicitly did not read
`routeMapView.tsx` (its closing italics, line 111) — so every code-level claim here needs
verification at HEAD before the fix is written.

**Confidence:** the crash itself is CONFIRMED (Nathan's quoted error + screenshot + two GPX+
files bearing its fingerprints, 2-for-2 on new-landmark rides; and the 25th's crash-free pure
catalog ride narrows the trigger — evidence *for* the hypothesis, not proof). The mechanism
(`useFrozenId` tripping on a changed map-child id) is a MEDIUM-HIGH-confidence, narrow,
checkable hypothesis. The diagnostics-amputation correlation is CONFIRMED; its mechanism
(collection living in/near the crashed component) is a hypothesis. **Size: P1 small-to-medium,
P2 medium, P3 small.**

**Not to be confused with:** the 2026-08-22 crash investigated in
`cycles/cycle-025-briefs/WP-relaunch-crash-recovery-investigation.md` — that crash's cause is
explicitly UNRESOLVED (its P6) and it hit a pure catalog ride. This WP is a *different,
diagnosed-to-hypothesis-level* crash with a reproducible trigger (rides involving a newly
created landmark). Do not fold them together; do not let this WP's fix claim credit for the
22nd's crash.

## The evidence — exact citations

- `qualifire-20260824-review.md`, notes point 1 (line 82): React Native Render Error
  `` `id` cannot be changed ``, thrown from `useFrozenId.js:12` in
  `@maplibre/maplibre-react-native`, surfacing at **`routeMapView.tsx:211`**. Mechanism from
  the library source visible in the capture: maplibre freezes a map child's `id` prop on first
  render and throws if a later render passes a different one. Fits Nathan's own observation
  ("on the rides where one of the landmarks was 'new'") precisely: an entity rendered once
  under a provisional id and re-rendered under its real one trips exactly this check. Fatal to
  the whole map component tree — map, blue dot, live following, all gone in one thrown render.
- `qualifire-20260824-review.md`, anomaly 2 (line 12): both crash rides are missing
  `routeMatchDiagnostics` **entirely** — not even the anchor attempts that fire within seconds
  of START — while every non-crash GPX+ file to date carries a full log. "The correlation is
  exact: map view crashed ⇔ diagnostics absent." Working hypothesis: diagnostics (and possibly
  ride 3's lock event) are collected in or near the crashed component; recorder and gate
  detector live elsewhere and survived.
- `qualifire-20260824-review.md`, anomaly 1 (line 11): crash ride 3 fired five real gates
  (`estimated="false"`) with `routeLock="none"` — the session block contradicts itself; either
  gates legitimately fire on a leading candidate lock-free (then the export should say which
  candidate) or a lock happened and its event was lost, plausibly to the same crash.
- `qualifire-20260825-review.md` (line 21): the crash-free day as evidence — pure catalog ride,
  everything the crash amputated present and whole; "the `useFrozenId` hypothesis … survives
  today intact: no new landmark, no crash. The fix brief for `routeMapView.tsx:211` is still
  worth filing; today just narrows the trigger further." Re-endorsed in that review's suggested
  picks (line 104, pick 4).

## Proposals — all UNBUILT

**P1 — UNBUILT — The crash fix: stabilize maplibre child ids across the landmark-creation
flow.** (Small-to-medium.) A code pass reading `routeMapView.tsx` (around line 211 at the
crash bundle's version — re-anchor at HEAD) side by side with the landmark/route creation flow,
to find which source/layer id changes between renders when a landmark is newly created. Fix
shape per the review: never rebind an existing maplibre source/layer to a new id — remount
under a React `key` instead (the repo has prior art: the Phase-0 `key={styleUrl}` remount,
B-70/B-71 territory). Acceptance: a ride to a freshly created landmark renders without the
error — plus, if feasible, a headless render test simulating the id transition. Until this
lands, every ride to a newly created destination is a blind ride — this is the highest-severity
item in the four reviews.

**P2 — UNBUILT — Move GPX+ diagnostics collection somewhere crash-proof.** (Medium;
investigation first.) Verify where `routeMatchDiagnostics` events are captured and written. If
the capture path runs through (or is subscribed from) the map component tree, move it to the
location-layer/engine subscription path that demonstrably survived both crashes (the recorder
and gate detector kept working; `storageErrors 0`, clean END on both crash rides). "The whole
point of a flight recorder is to survive the crash" — the 24th's words. If investigation shows
collection is *already* elsewhere and the amputation has a different cause (e.g. events
buffered but never flushed when the tree throws), fix that instead — the acceptance is the
same: a future map crash must leave the diagnostics intact.

**P3 — UNBUILT — Pin the gates-without-lock semantics.** (Small; spec + possibly one exporter
change.) Decide and write down what `routeLock="none"` plus five real gates *means*: if the
engine fires gates on a leading unlocked candidate, the export should name that candidate; if
the lock event was lost, P2's fix is the cure and the spec says so. Coordinate with the
relaunch brief's P3 (export every lock event, `evs.find` → all) — same exporter territory, one
pass should do both; cite it, don't re-implement it.

## Already tracked nearby — cite, don't duplicate

- **B-47** (OPEN) — battery/stability A/B with the live map; the 22nd's unexplained crash sits
  in its risk bucket (per the relaunch brief P6), and any new live-map work (ghost dots WP)
  queues behind it. This WP's P1 is a correctness fix, not new map load — it does not wait for
  B-47.
- **B-70 / B-71** (OPEN) — the existing remount-key precedent and its known camera-state cost;
  P1's fix should reuse that pattern's lessons.
- `WP-relaunch-crash-recovery-investigation.md` — P2/P3 here deliberately dovetail with its
  P3 (all lock events) and P6 (crash-evidence capture runbook). Its P6 runbook, if adopted,
  applies to THIS crash class too.

## NEEDS-NATHAN

1. ~~The name of the new destination landmark~~ — **ANSWERED 2026-08-26: the Carrefour**
   (50.870719, 4.691999). Key detail for the repro: it is NOT in Nathan's current landmark
   catalog — that is exactly why the ride was set up as "new". (A Strava-export analysis had
   once flagged the spot as a frequent one from when he lived nearby, but that is outdated by
   over a year.) Whether it was created between ride 1 and ride 2 on 2026-08-24 was not
   explicitly confirmed; the repro recipe stands regardless: create a fresh landmark at a
   not-in-catalog location and ride to it.
2. After P1 lands: one deliberate ride (or simulated recording) to a newly created landmark on
   the dev build — the only true acceptance test.

## What this document is not

Not a backlog edit, not a decision, not an implementation, and not a claim to explain the
2026-08-22 crash (see the relaunch brief). An explicitly UNBUILT proposal set per
`process/CYCLE.md`.
