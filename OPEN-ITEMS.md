# Open items — Qualifire (virgin branch)

Short and curated toward one goal: a working prototype Nathan can hand to someone else.
Rewritten 2026-08-31 replacing the 152-item historical backlog (still on `main`'s
`product/BACKLOG.md`, unabridged — nothing was deleted, just not carried forward); reconciled
against `cycles/virgin-cycle1..4/` on 2026-09-08 (virgin-cycle5). Keep this list current:
strike items as they land, add new ones as they surface, don't let it grow back into what it
replaced. Vocabulary is post-WP-3: a route is the from→to path, a way is one variant of it.

---

## Landed so far — pointers only; the narrative lives in `cycles/`

- 2026-08-31 (branch cut): empty-seed install path; retroactive route creation +
  ride-1-as-reference; save-flow gates + real reference line; debug export. Briefs in
  `briefs/` (legacy location — every later cycle keeps its briefs in `cycles/<name>/`).
- virgin-cycle1 (2026-09-04): delete/reset, sector-coloured trail, gate-card map scrub, ride
  detail screen, virgin manifest leak and more — `cycles/virgin-cycle1/README.md`.
- virgin-cycle2 (2026-09-05): 13 WPs from Nathan's 09-03/09-04 test rounds plus most of the
  old Parked list — `cycles/virgin-cycle2/README.md`.
- virgin-cycle3 (2026-09-06): way/route inversion, multi-sport, RESULTS tab —
  `cycles/virgin-cycle3/README.md`.
- virgin-cycle4 (2026-09-06/08): build7 — Preview rebuilt in place as a permanently
  blank-seed install, OTA fingerprint re-anchored; dry run clean, real EAS build run by Nathan
  and completed; seed default flipped to 'empty' (`09a0aa0`) — `cycles/virgin-cycle4/README.md`.

## The virgin-prototype path, in order

1. **Build7 — install it and confirm the blank first launch.** The EAS build completed
   (Nathan, 2026-09-06/07). Not recorded anywhere yet: the APK installed on the phone, first
   launch showing no sports / no places / no rides, and an OTA publish via
   `publish-preview.ps1` landing on it. Nathan only.
   `cycles/virgin-cycle4/BUILD7-PREVIEW-BLANK-SEED.md`.
2. **Nathan's on-device pass on the post-cycle3 app.** Nothing since the 2026-09-04 test
   round has been seen on a phone, and cycles 2 and 3 changed most screens. Checklist:
   the swapped route/way wording reads right everywhere (RECORD, ROUTES, RIDES, RESULTS, the
   naming card, both detail screens); create a sport, switch sports, the RECORD block message
   with zero sports; RESULTS board → tap a way → ranked history + scatterplot; the gate-adjust
   card on the real map (nudge, long-press repeat, start/finish gates) and gate editing on a
   saved way from ROUTES; `refs.user.json` survives an app restart; WP-B's GPX+ check on the
   WorkHomeWet/281e ride; overlapping gate tap-targets on an out-and-back ride; whether the
   old pale-purple contrast bug is really gone (cycle2's code check found no trace);
   MAP-CONTRACT §4's acceptance sequence (pre-start pannable → moving locked/no labels →
   stopped identical to moving → finished released back to pannable); MAP-TILES §2's
   dead-zone check (does the ribbon still draw the last-ridden corridor with the radio off?).
   Never run formally — added here 2026-09-08 (virgin-cycle5 NW-2). Findings go in a
   `data/activities/TEST in virgin-app rides/` notes file, as before.
3. **Empty-state pass.** "0 rides found" and no lock on the first ride of a new route — what
   the blank Preview says and shows to a stranger before any history exists. Also check
   COLD-START F-2 while here (added 2026-09-08, virgin-cycle5 NW-2): a way's lap can colour
   while its busiest sector stays uncoloured, because sector history is clean-only while lap
   history isn't — the board should say why rather than looking inconsistent.
4. **Whole-app export/import.** Still parked as described below. A smaller debug-export exists
   (2026-08-31): SETTINGS → DATA shares `catalog.user.json` and `refs.user.json`, and per-ride
   GPX+ from RIDES carries rich session diagnostics — enough for "get today's state and one
   ride's trace off the phone for feedback" without the full machinery, which stays scoped for
   when a lost/replaced phone or a friend's setup actually needs it:
   Zip the catalog, ride-history store, free-ride cache, and settings into one file; a
   checkbox for whether to include raw ride recordings (they're append-only, so this can grow
   large — get a real size estimate before promising it); import is overwrite, not merge,
   gated behind an explicit confirm listing what dies plus an automatic pre-import backup of
   current state. Version-stamp both directions — refuse or migrate an unknown schema, never
   guess. This is what makes a lost/replaced phone, or handing your exact setup to a friend,
   survivable — separate from retroactive route creation, which is what lets a total stranger
   start from nothing.

## Housekeeping (agent-side, no phone needed)

- **Record build7's fingerprint in `scripts/OTA-TROUBLESHOOTING.md`** — the last cycle4 step
  per `cycles/virgin-cycle4/TOKEN-USAGE.md`, still not done (the seed-flip tail itself landed
  as `09a0aa0`).
- ~~**STATE.md's "no noise floor" rule is not what ships.**~~ **RESOLVED 2026-09-08 (NW-1).**
  `MIN_HISTORY` is now 1 (`app/src/ui/colourModel.ts`); the way's reference ride is neutral +
  ranked on the day it's ridden, one prior ride is purple/yellow-only, 2+ unlocks green.
  STATE.md's line updated to match. `marketing/index.html`'s noise-floor copy updated too.

## Parked (scoped, not urgent)

- **`design/` empty-state mockups (D4, virgin-cycle5).** `BRIEF-design-folder-plan.md` D4 —
  one mockup each for ROUTES/RIDES/RESULTS/RECORD-setup's zero-data state, now that the
  default install is `EXPO_PUBLIC_SEED_MODE=empty`. The brief's own recommendation: only worth
  building if Nathan is actively working on first-run UX; parked here rather than built on
  spec (2026-09-08).
- **Real (OSM-signal-based) `'measured'` gate placement.** Today's sector gates snap away from
  the reference ride's own stops — a real but one-ride proxy, honestly flagged
  `origin: 'geometric'`. Getting to `'measured'` needs either a real traffic-signal data
  source (Overpass/OSM query, network + caching design) or the ≥5-clean-rides re-scoring
  `product/proposals/ROUTING-AND-SEGMENTATION.md` §3 describes. Geometric gates are usable now.
- **`expo-sharing` native module.** The debug-export share buttons work today via the existing
  SAF/share-text mechanism; a real native share sheet needs an APK rebuild to add the
  dependency. Deliberately not part of build7. Cosmetic/convenience upgrade only.
- **Overlapping gate hit-areas on an out-and-back ride.** Two gates at mirrored chainages can
  render on the same pixel; only the later-rendered tap target wins. The card has since been
  redesigned with a zoomable map (cycle2 WP-J), which may already resolve it — on the item 2
  checklist; fix only if it's still reproducible.
- **`placeDetailFor` is not sport-scoped** (`CatalogDetailScreen.tsx`): a place's detail can
  list another sport's routes/ways. Needs a product decision — split "what's listed" from
  "what's deletable" — before a code fix (cycle3 WP-1 Inspect, non-blocking).
- **GPX+ naming after WP-3.** Two event-literal renames outside WP-3's scope affect exports of
  pre-WP-3 rides; a few sub-attributes carry a minor v2 naming inconsistency (cycle3 WP-3
  Inspect, non-blocking, left as-is on purpose).
- **Gate-placement prevention (cycle2 WP-B "Part C").** The fix reads fixes in chronological
  order; nothing yet guards against a future write path reintroducing on-disk-order
  dependence.
- **Type a destination and race it (`IDEAS.md` §29).** Product fork, Nathan's call — would
  need a routing engine, and there is no maintained Expo binding for one.
