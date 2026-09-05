# virgin-cycle2 — CONTEXT

## What this cycle is

`virgin-cycle1` closed out with every one of its 17 work packages (A–Q) landed and
independently inspected — only on-device visual checks remain from that cycle (see its
README's status line). Nathan then kept riding the virgin build as its first real user and
filed a new round of testing notes/reviews on 2026-09-03 (day 3), plus a same-day-follow-up
addendum on 2026-09-04. This cycle is the response to THAT round, same shape as cycle1: a
folder of status + execution-ready briefs, built from the primary source documents below —
**not a replacement for them.**

Unlike cycle1, **this cycle was built entirely as a planning pass — no code has been
executed yet.** Every WP below is `BRIEF WRITTEN, NOT YET EXECUTED`. Nathan's own framing for
this session: "In this new folder... write work-packages briefs for each fix to be applied.
Later i can execute all briefs when i have a bulk of work-packages in the cycle." Execution
is deliberately deferred — this folder's job right now is to have a ready backlog waiting.

## Primary source documents (read these, don't just trust this folder's summaries)

- `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-notes.md`
  — Nathan's raw notes, including the 2026-09-04 addendum that gives the exact 3-state
  acceptance spec WP-A implements.
- `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-review.md`
  — the short structured review (3 numbered issues, severities).
- `data/activities/TEST in virgin-app rides/qualifire-20260903/qualifire-20260903-review-detailed.md`
  — the full data-cross-referenced analysis (catalog/refs JSON evidence for all 3 issues).
- `data/activities/TEST in virgin-app rides/qualifire-20260904/qualifire-20260904-notes.md`
  — a second round of notes that arrived while this cycle was being built (Nathan's
  2026-09-04 evening ride, recorded after cycle1 fully landed). Source for WP-I through WP-L.
  Its catalog/refs JSON (`qualifire-catalog-20260904.json`/`qualifire-refs-20260904.json`)
  also happened to contain a second live occurrence of WP-B's bug — see WP-B's own
  "Inspect findings" section.
- `OPEN-ITEMS.md` (repo root) — the "Parked" section supplied WP-D through WP-H; the
  "Needs Nathan" section (on-device checks, battery A/B, taste calls) was deliberately NOT
  turned into briefs — those need Nathan's own eyes/judgment, not a code fix.
- `STATE.md` (repo root) — ground rules every brief in this folder respects (raw-time-default
  rule underlies WP-C; "gates should not change colour" underlies WP-E; append-only ride
  recordings and never-delete apply throughout).
- `process/CONVENTIONS.md` / `CLAUDE.md` (repo root) — the model-tier pipeline this cycle
  follows (Digest → Plan/Fable → Execute/Sonnet → Inspect/fresh-Fable — this cycle only ran
  through Plan; Execute and Inspect happen when Nathan picks a WP to actually land).

## What this cycle covers vs. deliberately left out

**In this cycle (13 WPs, A–M; H superseded/folded into J — 12 executable):**
- A, B — the two HIGH-severity bugs from the 2026-09-03 review (route-match/trail-visibility
  overlap, gate-placement scale bug), both requiring real investigation, both Plan/Fable
  briefs.
- C — raw-time scoring default, the implementation half of an already-settled STATE.md rule
  (medium size, touches ~27 call sites per WP-C's own re-count — the digest's initial "4 call
  sites" estimate was well short).
- D — GPS re-acquisition teleport-guard hole, a genuine design problem (Nathan's own "cheap:
  one field + one line" guess turned out to need a "discount by cause, not distance" redesign
  after Fable's own measurement showed a naive time-based threshold would misfire on real
  riding — see WP-D's own findings).
- E, F, G, H — four small, already-diagnosed items from OPEN-ITEMS.md's "Parked" section,
  written directly by the coordinator (no Fable dispatch — each was already fully specified by
  a prior inspection note or Nathan's own stated rule, no new design judgment needed; this
  matches the project's "Plan-tier token diet" convention of not spending Fable tokens on
  something with no real design decision left).
- I, J, K, L — four more, from the 2026-09-04 follow-up notes: editing gates on an already-
  saved route (I), a full redesign of the gate-adjust card itself (J — real interactive map,
  long-press-to-repeat nudging, start/finish gates made adjustable; absorbs and supersedes the
  original WP-H once Inspect found WP-H's fix incomplete), dedicated ROUTES-tab detail screens
  mirroring cycle1's RIDES-tab pattern (K), and stripping verbose "AI-sounding" explanatory
  text app-wide plus a tap-to-reveal help affordance for SETTINGS (L).
- M — two-finger map rotation + a compass-reset button, from Nathan's own 2026-09-05 answer
  to this cycle's Q3 (he'd raised it as an open question on 2026-09-04; his answer came with
  a full design spec, so it graduated from "question" to "brief" within the same cycle).

**Deliberately NOT turned into a WP this cycle:**
- OPEN-ITEMS.md's "contrast bug" (pale purple text on a bare background, RidesScreen sector
  rows + RecordScreen gate-colour memo) — a direct code check (grep for "purple"/"pale" across
  both files) found no matching pattern in the current repo. RidesScreen's sector rows use
  `t.text2` (theme-aware), not purple; RecordScreen's gate-colour code already documents a
  deliberate purple-marker-colour override (see WP-E's investigation). This item looks
  already resolved as a side effect of other landed work — **recommend Nathan strike it from
  OPEN-ITEMS.md**, or flag on the next on-device pass if it's still visible somewhere this
  grep missed.
- The "Free-ride new>>new design" open item — Nathan's own 2026-09-04 addendum ("If you take
  new>>new show nothing and let me write history") IS the ratified design; WP-A implements it.
  No separate WP needed.
- "Real (OSM-signal-based) 'measured' gate placement", "expo-sharing native module", "WP-G
  route-specs on the shipped seed build", "WP-I overlapping gate hit-areas on an out-and-back
  ride", and everything in OPEN-ITEMS.md's "Needs Nathan" section — all explicitly parked as
  not urgent, needing on-device confirmation, or needing Nathan's own taste call rather than a
  code fix. Left untouched, still tracked in `OPEN-ITEMS.md`.

## The model-tier pipeline as actually run this cycle

Two Digest (Haiku) dispatches split by area (record/route-match/gate-seeding code; scoring/
colour/misc code) fed four Plan (Fable) dispatches (WP-A, WP-B, WP-C, WP-D) run in parallel.
WP-E/F/G/H were written directly by the coordinator (chore-sized, already-specified fixes —
see each brief's own "Written by" line). An Inspect (fresh-context Fable) pass then
adversarially re-checked every brief's factual claims against the real repo before this
folder was called done — see `TOKEN-USAGE.md` for the full dispatch table and this README's
status-at-a-glance for what Inspect found.

## Ground rules that constrain every brief in this folder

- **Never delete** — move to `safe_to_delete/`, use `mv` not `rm`.
- **`IDEAS.md` and `Nathan/` are read-only** to any agent.
- Raw ride recordings are append-only.
- Verification, every time code lands: `cd app && node --experimental-strip-types
  tests/run.ts` (zero FAIL) and `cd app && ./node_modules/.bin/tsc --noEmit` (exit 0).
- A change is "done" only when there's a checkable artifact — not an agent's say-so. Since
  NOTHING in this cycle has been executed yet, every WP here is a brief, not a landed change.
