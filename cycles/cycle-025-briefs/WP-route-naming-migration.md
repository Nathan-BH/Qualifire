# WP — Route naming: display names only, no raw-data rewrite (Nathan ruled 2026-08-25) (cycle 025)

**Status: PROPOSAL — MECHANISM RULED, ALL NAMING RULED (round 2 landed 2026-08-26, see
NEEDS-NATHAN): questions 1–2 ruled (descriptive wet/dry names with the Dry suffix explicit;
StationWork pair keeps Std/Alt), the Evening pair confirmed wet/dry
(`WorkHomeDry`/`WorkHomeWet`), and question 3 mooted — Nathan deferred the sub-route level as
a future addition, so no third-level word is needed and VIEW TRACE keeps its name. This brief
is no longer blocked. Every item below is labelled UNBUILT; nothing
has been implemented and no app code was touched in producing it.** Prepared 2026-08-25 from the notes3 review, which
verified the id-usage inventory against the app code and data
(`Nathan/Nathan's_notes3_review.md` §8, lines 91–108, and closing italics, line 141); mechanism
ruled the same day directly by Nathan in chat (see below).

**Confidence:** the inconsistency is CONFIRMED (four legacy time-of-day ids vs. sixteen
FromToVariant ids, with two sub-patterns even among the new ones) — code-verified by the source
review. **Size: small.** Nathan's ruling below removes the medium-sized Option 2 path entirely,
so this is now display-name-field work only, no migration.

## Nathan's ruling (2026-08-25, in chat)

> "I see that the tension lies in 'So a rename means either rewriting history (forbidden for
> exports/raw data) or carrying a legacy-id alias map forever.' I think we don't have to rewrite
> raw data, but at least in app show me my updated names. Eventually I also want to try it all
> from the virgin app so this is not an issue as you decide the name in the app directly."

Read as: **Option 1 (display-name field / label-override table) is the chosen mechanism.** Raw
data, exports, and internal ids (`Morning`, `MorningB`, `EveningA`, `EveningB`, …) are never
touched. Options 2 and 3 below are struck from consideration and kept only for the record.

Second half of the ruling matters for scope: once the virgin/cold-start flow exists
(`WP-virgin-cold-start-epic.md`, cycle 025) and Nathan names each *newly created* route himself
at recording time, this retrofit problem stops recurring for new content. This WP is therefore
scoped to a **one-time display-name pass over the 20 existing catalog routes**, not a standing
naming pipeline.

## The ask, in Nathan's words (2026-08-25, notes3)

Rename the four oldest routes — `Morning`, `MorningB`, `EveningA`, `EveningB` — to
"HomeWorkA"-style names consistent with the other sixteen (`WorkStationA`, `HomeChurch`,
`StationHomeWet`, …). Resolved above as: same-looking result, achieved via a display-name
overlay rather than an actual id rename.

## Why a real rename would have been bigger than it looks (background, now moot)

**The route id IS the name today** — there is no display-name field yet; the label shown is the
id split on capital letters. The id is a key used everywhere: the engine's candidate list and
gate tables, the seed results, on-phone ride-history/free-ride caches, the GPX+ exports already
made (`track="Morning"` baked in — immutable, D-023/raw-is-truth), the analysis scripts and
workbench files, and 624 archive filenames/index rows. Nathan's ruling avoids all of this by
simply never renaming the id — the sections below (Options 2/3 and their migration notes) are
kept for the record but are **not** the path forward.

## The chosen mechanism — Option 1: display-name field / label-override table

(Small.) Ids stay `Morning` etc. internally, unconditionally. A lookup table maps each of the 20
route ids to a display name; the app (Routes tab, RESULT, RIDES, Record) renders the display
name everywhere a route label is shown. Zero data migration, zero risk to exports/caches/engine
keys. The `design/` SVGs and `demos/mockup.html` render route names — regen obligations (WP-J
convention, B-66) trigger once the actual display names are decided.

The lookup table's *content* is now fully ruled (2026-08-26, both rounds — see NEEDS-NATHAN
1–3): descriptive wet/dry names with the Dry suffix explicit; StationWork keeps Std/Alt;
`EveningA`→`WorkHomeDry`, `EveningB`→`WorkHomeWet` (round-2 confirmation: same wet/dry
derivation as the Morning pair). No residuals remain — item 3's collision check is moot (the
sub-route level is deferred).

## Options declined — kept for the record only

**Option 2 — rename the 4 legacy ids with a one-time migration.** (Medium.) Would have touched
catalog + engine refs + gates + seeds + on-phone cache migration + a permanent old→new alias for
reading historical exports. **Declined by Nathan 2026-08-25** — not worth the migration risk and
permanent alias burden for a purely cosmetic result once Option 1 exists.

**Option 3 — fix only user-facing surfaces, no internal change.** Superseded by Option 1, which
is the same idea done properly (a real lookup table, not ad-hoc per-screen patches).

## Acceptance (option 1 path)

- Full test suite green, `tsc` clean (repo rule 6).
- All 20 routes have a display name; the 4 legacy ids no longer show their raw time-of-day form
  anywhere in the UI.
- Old GPX+ exports and the analysis tooling are untouched and need no replay test — ids never
  changed, so there's nothing to prove backward-compatible.

## BLOCKING — NEEDS-NATHAN (execution must not start without these)

The mechanism is ruled; these three questions decide the table's *content* and remain open,
carried over unchanged from before this message:

1. **The exact mapping — RULED 2026-08-26: descriptive wet/dry names, with the Dry suffix
   explicit.** Nathan: "better to use descriptive names like wet and dry … on the record tab:
   home-work-dry as the three options before pressing record." So: `Morning`→**`HomeWorkDry`**,
   `MorningB`→**`HomeWorkWet`** (MorningB is the rain/asphalt alternative). The A/B scheme is
   dead for these routes. **Evening residual CONFIRMED 2026-08-26 (round 2):** `EveningA`→**`WorkHomeDry`**,
   `EveningB`→**`WorkHomeWet`** — Nathan: "The evening split should get the same rename for
   consistency as the underlaying dry/wet derivation is the same." Design note from the same answer: the RECORD tab should let
   him compose from / to / variant (e.g. home → work → dry) as the three choices before
   pressing record.
2. **How far the standard reaches — RULED 2026-08-26.** Station→home follows the wet/dry
   convention: `StationHomePreferred`→**`StationHomeDry`**; `StationHomeWet` stays as is.
   Station→work has no real wet/dry split, so **`StationWorkStd` and `StationWorkAlt` keep
   their names**, and **Std is the default selection** when the first two RECORD-tab choices
   are Leuven station → work. Forward-looking note from the same answer (feeds the virgin
   epic, not this pass): names should eventually be editable directly in the app, so the place
   where routes are built/managed must link to what the RECORD screen shows.
3. **The way/Way collision (added 2026-08-25 from notes4 — see
   `Nathan/Nathan's_notes4_review.md` §2, lines 32–53, and 123).** Notes4 proposes a new,
   finer level *below* route — small variations sharing all 5 gates, sector-comparable — and
   calls it a "way". But the schema's existing **Way** (an ordered landmark pair, e.g.
   home→work) sits one level *above* route, and the word is load-bearing in `Way`/`wayId`,
   the catalog (6 landmarks, 13 ways, 20 routes), the Routes tab, and every analysis doc.
   Ruling needed: **rename the existing Way concept everywhere, or pick a different word for
   the new fine-grained level** ("variant", "line", "trace" — Nathan's call).
   **Nathan's answer 2026-08-26: keep `Way` as is; call the new level "trace"** ("makes me
   think of trace elements, which emphasizes that it is a small change") — "for now", his
   words. **Collision check answered 2026-08-26 (round 2) by DEFERRAL, not by picking a word.
   Nathan: "This is actually not a priority feature to implement. So lets just keep it as a
   future addition but not implement it just yet. I think we have already plenty customization
   to start with by having multiple routes for a same ride." So no third catalog level is
   minted now, no word is chosen, "trace" keeps its existing meaning (a ride's recorded GPS
   line — VIEW TRACE is NOT renamed), and `WP-comparable-variants.md` keeps its "variant"
   placeholder as a deferred future brief. The naming question reopens only if/when that
   feature is picked up. This item no longer blocks this brief.** Ruled HERE, in one
   sitting with questions 1–2, so the project gets one naming convention for
   landmarks/ways/routes/variants; the mechanism itself is specced separately in
   `WP-comparable-variants.md` (cycle 025), which is blocked on this ruling and deliberately
   contains no naming question of its own. Sequencing note from the notes4 review (line 43):
   settling this before minting the third level is the cheap order — every week adds more data
   keyed to the current words.

Non-blocking letters check from notes4 (review line 127) — **CONFIRMED 2026-08-26:** h>>w-w =
HomeWorkWet, h>>w-d = dry. The shorthand exists only in Nathan's chat messages, never in the
app; he explicitly likes the `HomeWorkWet`-style annotation as the visual form carrying all
the RECORD-tab inputs.

## Already tracked nearby — cite, don't duplicate

- **`WP-comparable-variants.md`** (cycle 025) — the mechanism for the notes4 variant level;
  blocked on NEEDS-NATHAN 3 above and defers all naming to this brief.
- **`WP-virgin-cold-start-epic.md`** (cycle 025) — once live, new routes get named by Nathan at
  creation time; this brief's scope is only the 20 pre-existing catalog routes.
- **B-128** (OPEN) — header-level mode field; unaffected now that no cache migration is planned.
- **D-023** — raw/export immutability; the reason ids were never going to be rewritten regardless.
- The wry precedent already in the record: `Morning` ridden and locked at 17:50 in the evening
  (`qualifire-20260824-review.md` line 46) — the names carry meaning to Nathan that the engine
  ignores, which is exactly why display naming deserves fixing.

## What this document is not

Not a backlog edit, not a decision, not an implementation. As of 2026-08-26 (round 2) the
mechanism AND the full naming table are ruled — the brief is unblocked and ready to execute
when sequenced. An explicitly UNBUILT proposal per `process/CYCLE.md`.
