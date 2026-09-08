# BRIEF — `product/` doc cleanup (virgin-cycle5, follow-on)

**Status: EXECUTION-READY for WP-P0 … WP-P10 (doc edits). Written 2026-09-08 by the Plan tier
(Fable) against the tree at commit `eb2e2da` (branch `virgin`). One Sonnet Execute dispatch, one
commit. The "New work packages" in §12 are NOT executed by this brief — they are proposals for
Nathan / a later brief.**

Companion: `REVIEW-product-docs.md` (the per-file findings this brief acts on). Pattern follows
`BRIEF-root-docs-cleanup.md` in this folder.

**Nathan's standing instruction (carried from the root-doc cycle):** run fully autonomously —
never stop to ask a question, never delete anything (nothing here is deleted or moved). A genuine
ambiguity is resolved from this brief, `STATE.md`'s ground rules, `GLOSSARY.md` or
`process/CONVENTIONS.md` and logged as `[ASSUMPTION]` in the report — except an **anchor mismatch**,
handled by §0.3 (skip that one edit, report verbatim).

Design stance, so the executor does not over-reach: these files are **dated design records**. The
job is to make each one *honest about its date and status* and to stop it from actively misleading
a reader of today's code — not to rewrite Nathan's design history in today's words. Only two things
are rewritten wholesale: `product/README.md` (an index that indexes deleted files) and
`product/DATA-MODEL.md` §2–§3 (a schema a developer will copy from). Everything else is a status
header, a footnote, a strike-note, or a disposition table placed *above* an untouched body.

---

## 0. Executor rules and pre-flight

### 0.1 Rules
- Only files under `product/` named in this brief are touched, plus `cycles/virgin-cycle5/` (this
  brief, the REVIEW, and a `README.md` line — §11.4). **Never edit** anything under `app/`, `Nathan/`,
  `design/`, `process/`, `scripts/`, `briefs/`, `marketing/`, nor `STATE.md`, `OPEN-ITEMS.md`,
  `GLOSSARY.md`, `README.md`, `IDEAS.md`, `CLAUDE.md`, `HOW-THE-APP-IS-BUILT.md`. If §12's New WPs
  are approved they get their own brief; this one leaves the root docs alone.
- Never delete, never `rm`, never `git rm`. Nothing in this brief moves a file.
- Every git command on this mount: prefix with `GIT_OPTIONAL_LOCKS=0`. `git add <path>` by name,
  never `-A` / `.`. If `git status` shows unrelated dirty files (at brief time:
  `scripts/OTA-TROUBLESHOOTING.md` is modified — another session's), leave them unstaged.
- Write whole-file replacements with a quoted heredoc (`cat > file <<'EOF'`) or an equivalent that
  does not expand `$`/backticks. Apply anchored edits as exact multi-line matches (§0.3).
- Do not "improve" prose you were not asked to touch. Do not fix D-/B- numbers, role names, or
  "Morning/Evening" names inside bodies — §1 (WP-P0) explains them once per file instead.

### 0.2 Pre-flight (a miss on a STOP line stops the whole brief)
```
cd "$HOME/mnt/Qualifire"
GIT_OPTIONAL_LOCKS=0 git rev-parse --short HEAD      # expect eb2e2da (a later commit is OK — note it)
GIT_OPTIONAL_LOCKS=0 git branch --show-current        # expect virgin — STOP otherwise
ls product/README.md product/CONCEPT.md product/DATA-MODEL.md product/LAYOUT.md product/BRAND.md \
   product/MAP-CONTRACT.md product/MAP-TILES.md product/PRIOR-ART.md product/proposals/README.md \
   product/proposals/COLD-START.md product/proposals/SETUP-UX.md \
   product/proposals/ROUTING-AND-SEGMENTATION.md product/brand/README.md product/brand/LOGO-RATIONALE.md   # all must exist — STOP otherwise
ls product/BACKLOG.md product/DECISIONS.md product/superseded product/proposals/TRIAGE-ideas-18-27.md 2>&1   # ALL must say "No such file" — if any exists, STOP: the premise of WP-P1 is wrong
grep -n "CATALOG_SCHEMA_VERSION = 2\|RESULT_SCHEMA_VERSION = 2" app/src/store/types.ts   # expect both
grep -n "export const MIN_HISTORY = 5" app/src/ui/colourModel.ts                          # expect 1 hit (§12 NW-1 premise; not edited here)
grep -n "styles/positron\|styles/dark" app/src/ui/wayMapView.tsx                        # expect both
wc -l product/CONCEPT.md product/DATA-MODEL.md product/LAYOUT.md product/MAP-CONTRACT.md product/MAP-TILES.md product/BRAND.md   # expect 102 / 194 / 405 / 134 / 107 / 116 (small drift OK; big drift ⇒ re-check anchors)
```

### 0.3 Anchored edits — the matching rule
Every `FIND:` block is quoted from the live file as of 2026-09-08 at `eb2e2da`. Apply as an exact
multi-line match (trailing whitespace may be ignored; nothing else). If a FIND block does not match:
**do not apply that edit, do not fix the anchor, do not guess** — continue with the rest and put the
mismatch in the report with (a) the edit id, (b) the FIND text, (c) the actual text at that spot.

---

## 1. WP-P0 — the cross-cutting "reading this on `virgin`" note (all files) — SMALL

**Mandate.** Every product doc cites `D-0xx` decisions, `B-xx` backlog rows and named roles that
exist only on `main` (deleted here by `44e24f1`), and five of them use "route"/"way" with the
pre-WP-3 meaning. Rather than scrub hundreds of citations, each file gets one standard note directly
under its title line. Two variants:

**NOTE-A** (files whose body uses route/way as data-model terms: CONCEPT, DATA-MODEL, COLD-START,
SETUP-UX, ROUTING-AND-SEGMENTATION):
```
> **Reading this on the `virgin` branch — note added 2026-09-08 (virgin-cycle5).** This is a dated
> design record from before the branch was cut (2026-08-31). `D-0xx` / `B-xx` ids and role names
> (Product Owner, Designer, Backend Dev, Race Engineer, Principal …) refer to `main`'s
> `product/DECISIONS.md`, `product/BACKLOG.md` and its named-role process — none of which exist on
> this branch. **Since 2026-09-06 (WP-3) the words "route" and "way" mean the opposite of what they
> mean below:** a *route* is now the from→to path between two landmarks (the parent) and a *way* is
> one variant of riding it (the child, which owns the line, gates, results and ghosts) — see
> `GLOSSARY.md`. Morning / Evening A / Evening B, the 624-ride archive and the Leuven landmarks are
> Nathan's own seed data; a fresh install ships none of it (empty-seed default since 2026-09-08).
```

**NOTE-B** (LAYOUT, MAP-CONTRACT, MAP-TILES, PRIOR-ART, BRAND — no data-model vocabulary at stake):
```
> **Reading this on the `virgin` branch — note added 2026-09-08 (virgin-cycle5).** Dated record from
> before the branch was cut (2026-08-31). `D-0xx` / `B-xx` ids, `cycles/cycle-0xx.md` and role names
> (Designer, Product Owner, Backend Dev …) refer to `main`'s `product/DECISIONS.md`,
> `product/BACKLOG.md`, its cycle records and its named-role process — none of which exist on this
> branch. Current status is in the block below, `STATE.md` and `cycles/virgin-cycle*/README.md`.
```

**Placement rule.** Insert the note as the *first thing after the title line* (`# …`), separated by
one blank line above and below. Where a WP below replaces the file's header/status block, the note
goes between the title and the new block. Where WP-P1 / WP-P9a replace a whole file, the note is
already in the replacement text. Anchors (each is line 1 of its file and unique):

| File | Title line (FIND, single line) | Note |
|---|---|---|
| `product/CONCEPT.md` | `# Concept` | A |
| `product/DATA-MODEL.md` | `# Data model — landmarks, ways, and the derived results store` | A |
| `product/proposals/COLD-START.md` | `# Cold start — what the app is with nothing in it` | A |
| `product/proposals/SETUP-UX.md` | `# SETUP-UX — the surfaces where a rider tells the app things` | A |
| `product/proposals/ROUTING-AND-SEGMENTATION.md` | `# Routing and segmentation — type a destination, get a raceable track` | A |
| `product/LAYOUT.md` | `# LAYOUT — Screen-by-screen design spec` | B |
| `product/MAP-CONTRACT.md` | `# MAP-CONTRACT — cycle 014, 2026-08-17` | B |
| `product/MAP-TILES.md` | `# MAP-TILES — cycle 014, Backend Dev` | B |
| `product/PRIOR-ART.md` | `# Prior Art — what is reusable, not a market overview` | B |
| `product/BRAND.md` | `# BRAND — what Qualifire is, and how the design should say it` | B |

`brand/README.md` and `brand/LOGO-RATIONALE.md` get their own one-liners in WP-P10, not this note.

---

## 2. WP-P1 — `product/README.md` whole-file replacement — SMALL

**Mandate.** The index lists eight files deleted from this branch and routes readers to roles that
don't exist. Replace the whole file. Facts below were verified on the device 2026-09-08.

----- BEGIN product/README.md -----
# product/ — what we are building

**`virgin` branch — index rewritten 2026-09-08 (virgin-cycle5).** Every file in this folder is a
design record written before the branch was cut (2026-08-31, from `main` at cycle 025). None has
been rewritten in today's words; each carries a status note at the top saying what has changed
since. The live picture is `STATE.md`; the vocabulary is `GLOSSARY.md`; what is left to build is
`OPEN-ITEMS.md`. This folder explains *why* the app is shaped the way it is.

Not on this branch (cut by `44e24f1`, still on `main`): `product/BACKLOG.md`, `product/DECISIONS.md`,
`product/superseded/` (MAPLIBRE-SPIKE, MAP-STACK-OPTIONS, BUILD-PIPELINE, GPX-PLUS-proposal) and
`product/proposals/TRIAGE-ideas-18-27.md`. The `D-0xx` / `B-xx` ids cited throughout these files are
keys into those two deleted documents.

**Vocabulary warning.** Since 2026-09-06 (WP-3) a *route* is the from→to path between two landmarks
(parent) and a *way* is one variant of riding it (child). Every file here dated before that uses the
words the other way round. Each affected file says so at the top.

## Index

| File | Status on `virgin` | What it is |
|---|---|---|
| `CONCEPT.md` | dated record (2026-08-15) + status block (2026-09-08) | The app idea, distilled — pitch, mechanic, colour model, tower, safety constraints. Body describes the paper design; the status block says what shipped differently. |
| `DATA-MODEL.md` | **§2–§3 rewritten to the v2 schema 2026-09-08**; §4–§9 dated (2026-08-16) | Landmark / Route / Way / GateSet / RideResult and the derived-results-cache argument. `app/src/store/types.ts` is the authority; this explains it. |
| `LAYOUT.md` | dated record (cycles 002–007) + status block (2026-09-08) | Screen-by-screen spec: live counter, override moment, board, tower anatomy, colour/redundant-cue table, earcon spec (§6a is still the earcon authority). Body screens ≠ today's six tabs; see the status block. |
| `BRAND.md` | current (rewritten 2026-08-24, touched 2026-09-08) | Story, tagline, paddock/race modes, P1–P4 principles, motion language, logo brief. |
| `MAP-CONTRACT.md` | **built**; contract still binding | Per-surface map behaviour (what each screen shows, allows, never does) + the on-device acceptance test (§4). |
| `MAP-TILES.md` | §1/§5/§6 built as written; §2 unverified; §3/§4 not built | OpenFreeMap style URLs, attribution strings, palette-firewall patching, offline options. |
| `PRIOR-ART.md` | reference (2026-08-14) | Strava segment matching, OpenTracks/FitoTrack/OpenPace, JS geo libraries, Expo audio/haptics. |
| `brand/` | current | Logo SVG/PNG (`logos/`), brand board (`board/`), palette trials (`palettes/`), maker scripts; `LOGO-RATIONALE.md`. |
| `proposals/COLD-START.md` | **largely built** on this branch — disposition table at top | The cold-start design the `virgin` branch executed: retroactive naming at STOP, ride-1-as-reference, empty seed. Its unbuilt remainder is the "ride n of N" honesty ladder. |
| `proposals/SETUP-UX.md` | **largely built** — disposition table at top | ROUTES-as-editor IA, first-run flow, destination pills, tap-then-nudge gate editing (built); depth strip (not built). |
| `proposals/ROUTING-AND-SEGMENTATION.md` | still a proposal (IDEAS §29, parked) | Type-a-destination via offline BRouter; §3's gate-placement rules and `GateSet.origin` shipped, the rest did not. |
| `proposals/README.md` | current | What "proposal" means here now. |

## How to read this folder

- Want the idea? `CONCEPT.md` status block, then `BRAND.md`.
- Writing store or engine code? `DATA-MODEL.md` §1–§3 — then `app/src/store/types.ts`, which wins.
- Touching a screen? `LAYOUT.md` for the rules the screens still obey (glance, no touch while
  moving, colour ladder, earcons); `cycles/virgin-cycle1..3/README.md` for what the screens are now.
- Touching the map? `MAP-CONTRACT.md` §1 and §5; `MAP-TILES.md` §1, §5, §6.
- Wondering why a blank install behaves as it does? `proposals/COLD-START.md` and
  `proposals/SETUP-UX.md`, disposition tables first.
----- END product/README.md -----

---

## 3. WP-P2 — `product/CONCEPT.md` targeted edits (C1 … C4) — MEDIUM

**Mandate.** Replace the 2026-08-24 status block with one that knows about cycles 1–4, and add three
one-line strike-notes where body headings still assert UNBUILT. Body otherwise untouched.

### C1 — replace the status block
FIND (lines 7–26, from the heading through the last bullet):
```
## Status corrections (2026-08-24, cycle 024)

The body below is kept as the original design record and is not rewritten. What has
changed since 2026-08-15:

- The app EXISTS and runs on Nathan's phone — a dev client, since 2026-08-14 — not the
  paper design this file's body describes.
- The timing tower (§ below) is BUILT, not a proposal (cycle 016, B-28).
- The catalog is now **20 routes across 13 ways** (grown from the 19/13 of cycle 019 by
  cycle 024's WP-D1), and the live engine now locks/scores **all 20** of them (WP-D2,
  cycle 024) — not just the 4 it used to (Morning, Evening A, Evening B, Morning B,
  cycle 020).
- The colour model is D-030/D-037's **last-10-rides rolling window** (purple beats the
  best of the last 10 comparable rides on that route, green beats their average), not
  the 7-day/28-day language elsewhere in this document.
- D-042 (2026-08-17) made **raw wall-clock time** the ruled scoring default — luck
  counts. Implementation is still pending (B-59); until it lands, colours and ranks
  still compare moving time as this document describes.
- This document's closing line, "No application code exists yet; every design above is
  UNBUILT," has been false since cycle 005.
```
REPLACE:
```
## Status on the `virgin` branch (2026-09-08, virgin-cycle5 — supersedes the 2026-08-24 block)

The body below is the original 2026-08-15 design record and is not rewritten. What is true today:

- **The app exists** and has run on Nathan's phone since 2026-08-14 (dev client) and as the
  standalone "Qualifire Preview" APK (build 7, 2026-09-06/07). The body's "no application code
  exists yet" and every "UNBUILT" heading in it are historical.
- **A fresh install is empty.** No sports, landmarks, routes, ways or ghosts ship (empty-seed default
  since 2026-09-08). The body's "three tracks" (Morning / Evening A / Evening B) were Nathan's own
  seed catalog; on this branch that data only appears if a developer opts in with
  `EXPO_PUBLIC_SEED_MODE=shipped`. Everything a rider races against is created by riding: a ride
  between unknown places is recorded as a free ride, and a naming card at STOP turns it into a
  route + way with that ride as the reference (built 2026-08-31).
- **Vocabulary (WP-3, 2026-09-06):** the body's "track" is today's **way** — one variant of riding a
  **route** (the from→to path between two landmarks). Ways own the line, gates, history and colours;
  colours never compare two ways. See `GLOSSARY.md`.
- **Sports (WP-1, 2026-09-06):** every landmark, route, way and ride belongs to one user-named sport;
  sports never cross-compare; none is pre-seeded — RECORD blocks until the rider names one.
- **Colour model:** the last-10-rides rolling window (purple beats the best of the previous 9
  comparable rides on that way, green beats their average, yellow = time posted), not the body's
  7-day/28-day tiers. Scoring compares **raw wall-clock time** by default (luck counts); moving time is
  opt-in (SETTINGS → Timing, built cycle2 WP-C). Nathan's D-045 ruling (2026-08-26) removed the "<5
  clean rides stay neutral" noise floor — **that half of the ruling is not yet in code** (`MIN_HISTORY
  = 5` still gates colours and ranks, `app/src/ui/colourModel.ts`); see `OPEN-ITEMS.md`.
- **Reference lap:** not the body's automatic monthly reference. The first ride saved on a new route
  is its way's reference; any later clean lap can be promoted from the RIDE detail screen.
- **Timing tower:** built (2026-08-17). The post-ride surface is now the RIDE detail screen (sector-
  coloured trail + tower) and the RESULTS tab (per-way board → ranked history + last-9-rides plot,
  cycle3 WP-2). The "ideal lap" line the body and LAYOUT §3 describe was never built.
- **Gates:** four sectors, gates at 25/50/75 % of the way's distance, nudged ≥150 m clear of where the
  reference ride stood still (a one-ride proxy for traffic signals, flagged `origin: 'geometric'`);
  adjustable tap-then-nudge on a real map; start/finish at 1 %/99 %. The body's "pending σ_s
  measurement" never happened and the shipped model does not need it.
- **Map:** MapLibre + OpenFreeMap on every screen including the live ride (heading-up, locked, no
  labels while moving) — see `MAP-CONTRACT.md`.
- **Non-goals** below still hold (single user, no accounts, sideloaded APK). "Anything that isn't the
  commute" has widened: the app is for anyone's repeated ride in any sport, not Nathan's commute.
```

### C2 — strike-note on the three-tracks paragraph
FIND (single line, line 45):
```
Three tracks, not one route (D-015): **Morning** (home→work), **Evening A** (same corridor reversed), **Evening B** (a different road home, ~2% overlap with A). Each has its own sectors, benchmarks and boards — colours never compare different physical roads (principle from D-010, applied per-track). A ride matching no track goes uncoloured.
```
REPLACE:
```
Three tracks, not one route (D-015): **Morning** (home→work), **Evening A** (same corridor reversed), **Evening B** (a different road home, ~2% overlap with A). Each has its own sectors, benchmarks and boards — colours never compare different physical roads (principle from D-010, applied per-track). A ride matching no track goes uncoloured.

*Superseded on `virgin` (2026-09-08 note): the principle — one set of sectors, benchmarks and colours per physical path, never compared across paths — is exactly today's rule, with "track" = way. The three named tracks were Nathan's seed data and do not ship.*
```

### C3 — tower heading
FIND (single line, line 66):
```
## The timing tower — ratified direction 2026-08-15, UNBUILT
```
REPLACE:
```
## The timing tower — ratified direction 2026-08-15 (BUILT 2026-08-17; heading kept as written)
```

### C4 — closing line
FIND (single line, line 102 — the paragraph under "Technical shape"):
```
React Native + Expo dev-build, TypeScript, MapLibre, Android-only, $0 pipeline (D-012). The map is cosmetic — all logic runs on the raw trace (D-002). Build order: Phase-0 PC validation harness on the GPX archive first; mobile code after the numbers are real. **No application code exists yet; every design above is UNBUILT.**
```
REPLACE:
```
React Native + Expo dev-build, TypeScript, MapLibre, Android-only, $0 pipeline (D-012). The map is cosmetic — all logic runs on the raw trace (D-002). Build order: Phase-0 PC validation harness on the GPX archive first; mobile code after the numbers are real. ~~**No application code exists yet; every design above is UNBUILT.**~~ *(False since 2026-08-14 — see the status block at the top. `HOW-THE-APP-IS-BUILT.md` describes what runs.)*
```

---

## 4. WP-P3 — `product/DATA-MODEL.md` — header + §2/§3 rewrite to v2 + historical markers — MEDIUM-LARGE

**Mandate.** This is the one product doc a developer opens while writing store code, and its §2/§3
assert the pre-WP-3 vocabulary with confidence. Fix: (a) a loud header, (b) rewrite the §2 entity
paragraphs and replace the §3 schema fences with today's `app/src/store/types.ts` verbatim, (c) mark
§5, §7 and §9 as historical, (d) leave §1, §4, §6, §8, §8a as written (their arguments still hold;
§8a's "the ridden route wins" reads correctly once the header explains the swap). The executor copies
code from `types.ts`, never retypes it.

### D1 — header line
FIND (single line, line 3):
```
**Backend Dev design proposal, 2026-08-16.** Covers B-10 (data model, OPEN since cycle 002), its generalization to §20/§21 "ways" (proposed B-33), and the store B-28's timing tower has been waiting on (STATE open-work #2). No app code is touched by this document — it is a schema proposal for a cycle to adopt.
```
REPLACE:
```
**Backend Dev design proposal, 2026-08-16 — adopted; §2–§3 refreshed to the shipped v2 schema on 2026-09-08 (virgin-cycle5).** Originally covered B-10 (data model), its generalization to §20/§21 "ways" (B-33), and the store the timing tower waited on. The schema below is what `app/src/store/types.ts` implements (`CATALOG_SCHEMA_VERSION = 2`, `RESULT_SCHEMA_VERSION = 2` since WP-3's read-side key rename; v1 files are migrated on read). **When this file and `types.ts` disagree, `types.ts` wins** — this document explains the shape, it does not define it. Sections §4–§9 are the 2026-08-16 record: §5, §7 and §9 describe Nathan's archive seeding and are marked historical.
```

### D2 — §2 entity paragraphs (Way and Route swap; GateSet and RideResult keyed by way)
FIND (three consecutive paragraphs, lines 31–35):
```
**Way** — an ordered (startLandmark, endLandmark) pair. Directional by construction, which is D-010 held at the way level rather than re-derived. Loops (start == end) are a real category, not an edge case — 78 archived rides are loops — so a way is identified by (start, end, discriminator), where the discriminator is null for ordinary ways and a route label for loops.

**Route** — one physical path realizing a way, with its reference polyline. This is the level D-015 actually operates at: home→work is one way with three routes' worth of history today (Morning / Evening A / Evening B are, in the new vocabulary, *routes* of two ways). A way has 1..n routes; the live auto-lock (D-025) picks among the routes of all candidate ways. The measurement that justifies keeping this level separate rather than collapsing it: puttestraat↔work is 237 rides at **median 97% path overlap, zero rides below 70%** — one route per direction, no A/B split — while home↔work genuinely splits. The model must express both without special-casing either.

**GateSet** — the ordered gate list for a route, **versioned**. Sector identity stays D-023's: (route, gate-pair chainage) — never GPS points.
```
REPLACE:
```
**Route** — the from→to path between two landmarks: an ordered (startLandmark, endLandmark) pair, directional by construction (D-010 held at the route level rather than re-derived). Loops (start == end) are a real category, not an edge case — 78 archived rides were loops — so a route is identified by (start, end, discriminator), where the discriminator is null for ordinary routes and a label for loops. A route is the **parent**: it lists its `wayIds` and, since WP-1 (2026-09-06), belongs to exactly one user-named `sportId`. *(In this document's original vocabulary this entity was called a "way"; WP-3 swapped the two names on 2026-09-06.)*

**Way** — one physical path realizing a route, with its own reference polyline (`refLineId`), versioned gate set (`gateSetVersion`), reference ride (`referenceRideId` — on a blank install, the first ride saved on the route) and optional `specs` (the rider's own ordered qualifiers, e.g. `['Dry','Fast']`). This is the level the live engine locks and scores at: every ride result, gate set, ghost, best and colour is keyed by way, and colours never compare two ways. A route has 1..n ways; the live auto-lock (D-025, now pick-biased) picks among the ways of all candidate routes. *(Originally called a "route" here. The archive measurement that justified keeping this level — puttestraat↔work at median 97 % path overlap, home↔work genuinely split into Evening A / Evening B — is `main`-only data, but the argument stands: some routes have one way, some several, and the model expresses both without special-casing.)*

**GateSet** — the ordered gate list for a **way**, **versioned**; since 2026-08-31 it also carries `origin: 'measured' | 'geometric'` (ROUTING-AND-SEGMENTATION §3's honesty clause — every gate set the app seeds today is `'geometric'`). Sector identity stays D-023's: (way, gate-pair chainage) — never GPS points.
```

### D3 — §2 RideResult paragraph
FIND (single line, line 37):
```
**RideResult** *(derived)* — what the offline pipeline computes for one recorded ride: which route it matched, lap time, per-sector times, and the honesty flags. Recomputable from the raw JSONL at any time; deleting the whole derived tree costs only CPU.
```
REPLACE:
```
**RideResult** *(derived)* — what the pipeline computes for one recorded ride: which **way** it matched (`wayId`, null for a free ride), lap time, per-sector times, and the honesty flags (`tripwireDemoted`, `ignoredFromRanking`). Recomputable from the raw JSONL at any time; deleting the whole derived tree costs only CPU. Persisted since main's cycle 024 (`app/src/store/resultsStore.ts`: `results/<rideId>.json` + `results/index.json`).

**Sport** *(WP-1, 2026-09-06 — not in the original proposal)* — a user-named category (`app/src/store/sports.ts`, `sports.json`). One global active sport; landmarks, routes, ways, rides and results carry a `sportId` and are filtered by it (tag-and-filter over the single stores, not per-sport storage roots). Sports never cross-compare and none is pre-seeded.
```

### D4 — §3 intro + both schema fences
FIND (single line, line 43):
```
Written in the style of `app/src/storage/types.ts` (pure types, no expo, headless-testable).
```
REPLACE:
```
Copied verbatim from `app/src/store/types.ts` on 2026-09-08 (pure types, no expo, headless-testable). If you are reading this to write code, open that file — it is the authority and carries the field-level comments.
```
Then **replace the two ```` ```ts ```` fenced blocks that follow** — the first begins
`export const CATALOG_SCHEMA_VERSION = 1;` and ends after the `Catalog` interface; the second begins
`export const RESULT_SCHEMA_VERSION = 1;` and ends after the `RideResult` interface — with **one**
```` ```ts ```` fence containing `app/src/store/types.ts` from the line
`export const CATALOG_SCHEMA_VERSION = 2;` through the closing `}` of `export interface TowerRow`
(i.e. everything after the file's leading doc-comment), copied byte-for-byte with
`sed -n '/^export const CATALOG_SCHEMA_VERSION/,$p' app/src/store/types.ts`. Do not edit the copied
text. Keep the paragraph that follows the fences ("**No tier, no colour, no rank is stored.** …") as
is — it is still true and `types.ts`'s header quotes it.

### D5 — historical markers on §5, §7, §9
Three single-line FIND/REPLACE pairs; insert one italic line directly under each heading.

FIND: `## 5. Migration from what exists today`
REPLACE:
```
## 5. Migration from what exists today

*Historical (2026-08-16). Describes migrating `main`'s three hardcoded `TrackId`s and seeding 232 + 131 archive rides. On `virgin` a fresh install has no seed; the migration that actually ran here is WP-3's v1→v2 key rename (read-side, `app/src/store/`).*
```
FIND: `## 7. What the tower needs (D-028), as a query`
REPLACE:
```
## 7. What the tower needs (D-028), as a query

*Historical. Built as `app/src/live/towerSource.ts` + `app/src/ui/colourModel.ts` over the last-10-rides window (D-045), not the 28-day window written here; ghosts are the rider's own previous rides on the way.*
```
FIND: `## 9. Open questions`
REPLACE:
```
## 9. Open questions

*Historical. Q1 and Q4 are about Nathan's archive landmarks (not on this branch). Q2: loops carry a hand label (`loopDiscriminator`). Q3 ("does a way with 4 rides get colours?") was ruled YES by D-045 (2026-08-26) — colours from ride 1 — but the code still holds the 5-ride floor; see `OPEN-ITEMS.md`.*
```

### D6 — §4 on-disk layout: add today's file names (scoped, executor fills)
Under the §4 code block (after the line `results/index.json        routeId → …`), append one line
inside the same fence:
```
catalog.user.json · refs.user.json · sports.json · results/   ← the actual file names on `virgin` (store/catalogStore.ts, live/userRefs.ts, store/sports.ts, store/resultsStore.ts)
```
Verify each name with `grep -rn "catalog.user.json\|refs.user.json\|sports.json" app/src/store app/src/live` before writing; drop any name the grep does not confirm and say so.

---

## 5. WP-P4 — `product/LAYOUT.md` targeted edits (L1 … L5) — SMALL typing, MEDIUM reading

**Mandate.** Do NOT rewrite and do NOT find-replace vocabulary — the body uses "track"/"direction",
not route/way, and is already labelled a historical design record. Replace the status block, add
three strike-notes, and give the exported-open-items list a disposition per line.

### L1 — status block (line 3, one 997-character line)
FIND (single line):
```
**Status (2026-08-24, cycle 024): this is the live screen-by-screen spec, but read it against the app as it now stands. The live counter v2, board v2 and timing tower described below are BUILT (tower landed cycle 016, B-28). The app has six tabs — record / rides / routes / result / settings / demo — with a horizontally scrolling tab bar, not §1's "five screens, one navigation stack, no tab bar" (§1 is kept below as the original design record, unedited). The tier windows described in this doc predate D-030/D-037: colour today compares against the last-10-rides window (purple beats the best of your last 10 comparable rides, green beats the recent average), not a 7-day/28-day split. D-042 (2026-08-17) made RAW time the scoring default (implementation still pending, B-59), superseding this doc's moving-time wording. The RECORD flow now follows the setup → armed → running → ending phases from the cycle-022 mockup (built cycle 024, WP-A2), not the HOME → LIVE → BOARD shape §1 describes.**
```
REPLACE:
```
**Status on `virgin` (2026-09-08, virgin-cycle5 — supersedes the 2026-08-24 block).** Read this as the design record it is; the rules it sets (one glance, zero touch targets while moving, the counter never tier-coloured while ticking, the filled/outlined/flat ladder, the earcon family in §6a) are what the shipped screens obey. What differs from the body: **six tabs** — RECORD / RIDES / ROUTES / RESULTS / SETTINGS / DEMO (`app/src/ui/tabNav.tsx`), not §1's five screens; RECORD runs setup → armed → running → ending, with the live map ribbon (`MAP-CONTRACT.md`), a sport pill row once there are two sports, and a naming card at STOP for a ride between unknown places; the post-ride surface is the **RIDE detail screen** (sector-coloured trail + tower, reached from RIDES) and the **RESULTS tab** (per-way board → all-time ranked history + last-9-rides scatterplot, cycle3 WP-2) — not §3's single board, and §3's "ideal lap" line was never built; §4's HISTORY is RIDES + RESULTS; §5's setup flow is the tap-then-nudge gate card on a real map (cycle2 WP-J) and ROUTES → detail → edit gates (WP-I/WP-K), no chainage-bar drag. **Colour window** is the last-10-rides rolling window (purple beats the best of the previous 9 comparable rides on that way, green beats their average), not 7-day/28-day. **Scoring is raw wall-clock time by default** (cycle2 WP-C; moving time opt-in in SETTINGS → Timing) — §2 rule 3's "scoring stays moving time" is superseded. Sector count is settled at four (not §7's "undecided, 3–6"). The timing tower (§3b) is built. `demos/mockup.html` (§6a) is not on this branch; the earcons are `app/assets/earcons/*.wav` from `make_earcons.py`. Screen-by-screen currency lives in `cycles/virgin-cycle1..3/README.md`.**
```

### L2 — §3b "UNBUILT"
FIND (single line, line 225):
```
A ranked column of past-self laps on this track, into which today's lap slots at the end of the run — "you will shoot up into a certain position." **Which laps populate it (window, dedup, row count, gap definition) is the Product Owner's, being settled in parallel this cycle; this section owns anatomy and motion only.** UNBUILT.
```
REPLACE:
```
A ranked column of past-self laps on this track, into which today's lap slots at the end of the run — "you will shoot up into a certain position." **Which laps populate it (window, dedup, row count, gap definition) is the Product Owner's, being settled in parallel this cycle; this section owns anatomy and motion only.** ~~UNBUILT.~~ *Built 2026-08-17 (`app/src/ui/tower.tsx`, `towerModel.ts`, `live/towerSource.ts`); population = the last-10-rides window on the way.*
```

### L3 — §6a mockup reference
FIND (single line, line 389):
```
- **Implementation:** synthesized oscillators only (expo-audio in the app per D-016; WebAudio in the mockup) — no samples, no licensing, identical offline. Audible reference implementation: `demos/mockup.html` (demo ride + test-sounds row).
```
REPLACE:
```
- **Implementation:** synthesized oscillators only (expo-audio in the app per D-016; WebAudio in the mockup) — no samples, no licensing, identical offline. ~~Audible reference implementation: `demos/mockup.html` (demo ride + test-sounds row).~~ *On `virgin`: the shipped earcons are `app/assets/earcons/{neutral,green,purple,purple_pb,lap_green,lap_purple,lap_purple_pb}.wav`, generated by `app/assets/earcons/make_earcons.py` from this table; the mockup is not on this branch.*
```

### L4 — §2 rule 3 (moving-time scoring)
FIND (single line, line 76):
```
3. **The counter is the raw wall-clock lap; scoring stays moving time (D-008).** While stationary (red light) the counter dims to ~40 % opacity and gains a ‖ suffix — at exactly the moment the rider is allowed a long look, the screen says "this raw clock is not your score". Full ink resumes on movement. `[ASSUMPTION — dim-when-stationary is this role's addition, not Nathan's ask]`
```
REPLACE:
```
3. **The counter is the raw wall-clock lap; ~~scoring stays moving time (D-008)~~ scoring is raw time too since cycle2 WP-C (moving time is the opt-in).** While stationary (red light) the counter dims to ~40 % opacity and gains a ‖ suffix — at exactly the moment the rider is allowed a long look, the screen says "this raw clock is not your score". Full ink resumes on movement. `[ASSUMPTION — dim-when-stationary is this role's addition, not Nathan's ask]` *(With raw scoring the dim now reads "you are stopped", not "this is not your score" — wording kept as the record.)*
```

### L5 — "Open items exported from this spec": append a disposition to each bullet
Anchor: the heading `## Open items exported from this spec` (unique). Under it, append ` — *disposition 2026-09-08: …*` to the END of each of the eleven bullets, in order:

1. Sector-of-the-day → `— *disposition 2026-09-08: stays dropped.*`
2. Counter semantics → `— *disposition 2026-09-08: built as ruled.*`
3. Override hold / slot-in duration → `— *disposition 2026-09-08: shipped with the values here; never formally tuned — fine.*`
4. Tower population → `— *disposition 2026-09-08: settled — last-10-rides window (D-045), estimated laps never rank.*`
5. D-006 supersession record → `— *disposition 2026-09-08: moot on this branch (no decision log); the ticking counter is the shipped rule.*`
6. Ideal-lap window → `— *disposition 2026-09-08: the ideal lap was never built; not on OPEN-ITEMS — Nathan's call whether it ever is.*`
7. Gate-move invalidation → `— *disposition 2026-09-08: settled by `gateSetVersion` (DATA-MODEL §6) and the ROUTES edit-gates reset dialog.*`
8. Numeric thresholds → `— *disposition 2026-09-08: shipped values are 25/50/75 % gates, 150 m signal clearance, ±250 m snap window, 50 m minimum gate gap (`store/gateSeeding.ts`, `ui/gateAdjustModel.ts`); B-17 traces never happened and are not needed.*`
9. Hex palette + CVD test → `— *disposition 2026-09-08: hexes live in `app/src/ui/theme.ts`; the CVD/sunlight acceptance test was never run — see OPEN-ITEMS on-device checklist.*`
10. Earcon audibility → `— *disposition 2026-09-08: still unverified on a bike; earcons shipped as specified.*`
11. Ceremony marker styling → `— *disposition 2026-09-08: the quali ceremony was never built; moot.*`

If the bullet count under that heading is not eleven, apply only to the bullets whose leading text
matches the item above and report the rest as a mismatch.

---

## 6. WP-P5 — `product/BRAND.md` targeted edits (B1 … B4) — SMALL

### B1 — "on that route" → "on that way" (two places)
FIND (lines 12–13):
```
window of your recent rides (D-030/D-037: the last 10 comparable rides on that route).
```
REPLACE:
```
window of your recent rides (D-030/D-037: the last 10 comparable rides on that way — since
WP-3, 2026-09-06, a *way* is one variant of riding a *route*; ghosts and bests are per way).
```
FIND (lines 22–23):
```
   recent average; purple when it beats the best of your last 10 rides on that route —
```
REPLACE:
```
   recent average; purple when it beats the best of your last 10 rides on that way —
```

### B2 — theme toggle location
FIND (lines 57–58, partial lines — match the two-line fragment):
```
   each mood has both a **daylight** and a **night** theme; daylight is the app default,
night is user-selectable (a toggle on the Record screen, persisted). Nathan: "happy
```
REPLACE:
```
   each mood has both a **daylight** and a **night** theme; daylight is the app default,
night is user-selectable (the ☀/☾ pill on RECORD, or SETTINGS → Theme; persisted). Nathan: "happy
```

### B3 — asset paths
FIND: `` `brand/board_12_motion.png`): **app launch** — ring draws clockwise from the start ``
REPLACE: `` `brand/board/board_12_motion.png`): **app launch** — ring draws clockwise from the start ``

FIND: `` `brand/brandboard.png` (+ `board_01..12`, regenerated by `make_brandboard.py`): ``
REPLACE: `` `brand/board/brandboard.png` (+ `board/board_01..12`, regenerated by `brand/make_brandboard.py`): ``

### B4 — "still open work" gets a pointer, not a cut
FIND (lines 96–97):
```
`launchChoreo.ts`, cycle 024 WP-A2) — Nathan asked for MORE uses of it
(`Nathan/Nathan's_notes2.md`, 2026-08-19), which is still open work. Hard rule: motion
```
REPLACE:
```
`launchChoreo.ts`, cycle 024 WP-A2) — Nathan asked for MORE uses of it
(`Nathan/Nathan's_notes2.md`, 2026-08-19); on `virgin` that wish is neither done nor on
`OPEN-ITEMS.md` (flagged 2026-09-08 for Nathan to keep or drop). Hard rule: motion
```

---

## 7. WP-P6 — `product/MAP-CONTRACT.md` targeted edits (M1 … M3) — SMALL-MEDIUM

### M1 — replace the header paragraphs (lines 3–10)
FIND:
```
UNBUILT. Written jointly: Product Owner (§1–4) + Designer (§5–7). Reads STATE.md, LAYOUT.md, BACKLOG.md,
team logs, `routeMapView.tsx` + call sites only. Ground: `RouteMapView` is called from **RecordScreen.tsx**
(live) and **DemoScreen.tsx** (shared component, same file) only. `RoutesScreen.tsx` shows a separate static
full-route `<Image>` (not `RouteMapView`, no interaction). `ResultScreen.tsx` currently has **no map at all** —
matches LAYOUT §3.6 ("No map on this screen"; a "view trace" link is specced but unbuilt).

Nathan's ruling today overrules D-033's "no map on live ride" (its reserve rules still bind) and reopens B-34.
It supersedes STATE.md's cycle-011 "map work is parked" line — Principal should correct STATE accordingly.
```
REPLACE:
```
**BUILT — status on `virgin` 2026-09-08 (virgin-cycle5).** Written 2026-08-17 as an UNBUILT contract
(Product Owner §1–4, Designer §5–7) the day Nathan overruled D-033's "no map on live ride". Since then
MapLibre + OpenFreeMap replaced every painted PNG: `app/src/ui/wayMapView.tsx` (renamed from
`routeMapView.tsx` by WP-3) is used by **RecordScreen** (pre-start / moving / stopped / finished, per
§1 and §5), **DemoScreen** (same component), **RideDetailScreen** (the sector-coloured trail — this is
what §1's "view trace" became, reached from RIDES; cycle1 WP-H), **CatalogDetailScreen** (ROUTES →
place/route detail, replacing the static `<Image>`; cycle2 WP-K) and **gateAdjustCard** / 
**GateAdjustScreen** (§1's "future gate-setup" row; cycle2 WP-I/WP-J). RESULTS deliberately has no map
(Nathan, cycle3 Q2) — consistent with §1's "nothing on the board itself". §2's verdicts and §5–§7's
rules are what the code does; §3's backlog rows are `main` bookkeeping (kept as the record). §4 is
still the best one-paragraph on-device test of the live map and has never been formally run — see
`OPEN-ITEMS.md`. Still unverified: MapLibre's ambient tile cache serving previously seen tiles with no
signal (MAP-TILES §2).
```

### M2 — §3 heading marker
FIND: `### 3. Proposed backlog rows`
REPLACE:
```
### 3. Proposed backlog rows

*Historical — `main`'s backlog. On `virgin`: B-50/B-51/B-53 done; B-57 done as the RIDE detail trail; B-52 (ambient cache offline) unverified on device; B-54/B-55/B-56 not pursued; B-58 (phone-checkable acceptance test) never folded anywhere — §4 is that test.*
```

### M3 — §1 table "PNG today" column header
FIND: `| Surface | For (one clause) | Shows | Interactions | Never | PNG today |`
REPLACE: `| Surface | For (one clause) | Shows | Interactions | Never | PNG today (2026-08-17 — all replaced by MapLibre since) |`

No other body edits. `routeMapView.tsx` / `ResultScreen.tsx` / `RoutesScreen.tsx` mentions inside
§1/§5/§6 stay — M1 explains them.

---

## 8. WP-P7 — `product/MAP-TILES.md` targeted edits (T1 … T3) — SMALL

### T1 — header
FIND (single line, line 3):
```
All UNBUILT. Corridor bbox for extract command: lon 4.60–4.72, lat 50.81–50.89 (routes.json bounds 50.8348–50.8638 / 4.6382–4.6883 + ~2 km margin per brief).
```
REPLACE:
```
~~All UNBUILT.~~ **Status on `virgin` 2026-09-08 (virgin-cycle5):** §1 is built exactly as written — `app/src/ui/wayMapView.tsx` uses `…/styles/positron` (daylight) and `…/styles/dark` (night), no key; §6's OpenFreeMap attribution string ships byte-for-byte; §5's palette firewall + label hiding is `app/src/ui/wayMapStyle.ts` (style JSON patched at load, labels hidden while moving). §2 (ambient cache serving cached tiles with no signal) is still `[UNVERIFIED]` on a real dead-zone ride. §3 (PMTiles corridor extract) is not built — parked, only if §2 proves insufficient. §4 satellite/terrain remain non-goals. The corridor bbox below is Nathan's Leuven commute (`routes.json` is `main`-only); the product itself is location-agnostic — a blank install has no corridor until someone rides one. `08_build_route_assets.py`, `MAPLIBRE-SPIKE.md` and `cycles/cycle-014.md` are `main`-only.

Corridor bbox for extract command (Nathan's seed, worked example): lon 4.60–4.72, lat 50.81–50.89 (routes.json bounds 50.8348–50.8638 / 4.6382–4.6883 + ~2 km margin per brief).
```

### T2 — §5 heading
FIND: `## 5. Palette firewall in style JSON — UNBUILT proposal`
REPLACE: `## 5. Palette firewall in style JSON — ~~UNBUILT proposal~~ built (`app/src/ui/wayMapStyle.ts`)`

### T3 — §3 "UNBUILT" line (the Android asset trap)
FIND (single line, line 57):
```
Known trap (confirmed by MAPLIBRE-SPIKE.md §3, consistent with the brief): MapLibre Android cannot read `pmtiles://asset://` (no byte-range reads on `AssetManagerFileSource`) — the .pmtiles file must be copied to `filesDir` on first run. UNBUILT.
```
REPLACE:
```
Known trap (confirmed by MAPLIBRE-SPIKE.md §3, consistent with the brief): MapLibre Android cannot read `pmtiles://asset://` (no byte-range reads on `AssetManagerFileSource`) — the .pmtiles file must be copied to `filesDir` on first run. UNBUILT (still, 2026-09-08 — parked).
```

---

## 9. WP-P8 — `product/PRIOR-ART.md` header line — SMALL

FIND (single line, line 3):
```
Written by the Mobile Developer, cycle 003 (2026-08-14), for B-18. Scope: things Qualifire can adopt, borrow or must deliberately avoid. Web-verified 2026-08-14 unless marked `[UNVERIFIED]`.
```
REPLACE:
```
Written by the Mobile Developer, cycle 003 (2026-08-14), for B-18. Scope: things Qualifire can adopt, borrow or must deliberately avoid. Web-verified 2026-08-14 unless marked `[UNVERIFIED]`.

*Status on `virgin` (2026-09-08): still the reference it was. "Phase-0 / Phase 3 / Phase-99" is `main`'s original build plan; the Strava archive ZIP is no longer on this branch (`safe_to_delete/`); "one-route scale" predates multi-way catalogs. Of §5's steal list, 1 (gate interpolation), 2 (completion-only earcons) and the expo-audio choice shipped; the audio-ducking `[UNVERIFIED]` in §4 was never closed on device.*
```

---

## 10. WP-P9 — `product/proposals/*` (a … d) — MEDIUM

### 9a — `proposals/README.md` whole-file replacement
----- BEGIN product/proposals/README.md -----
# proposals/ — designed on `main`, mostly built on `virgin`

Three design proposals from `main`'s cycle 011 (2026-08-17). They were "designed but not built"
when this folder was made; the `virgin` branch then built most of two of them. Each file now opens
with a disposition table saying what shipped, what shipped differently, and what is still open
(status 2026-09-08). Read the table first; the body is the original proposal, untouched, in its
original (pre-WP-3) vocabulary — the note at the top of each file explains the route/way swap.

- `COLD-START.md` — largely built (retroactive naming, ride-1 reference, empty seed). Open: the
  "ride n of N" honesty ladder, and the noise-floor question it depends on.
- `SETUP-UX.md` — largely built (ROUTES-as-editor, first-run, nudge pad). Open: depth strip.
- `ROUTING-AND-SEGMENTATION.md` — still a proposal (IDEAS §29, parked); its §3 gate rules shipped.
----- END product/proposals/README.md -----

### 9b — `proposals/COLD-START.md`: status line + disposition table
FIND (single line, line 3):
```
Product Owner, cycle 011. **Design lens only** (Nathan's ruling): Qualifire stays single-user, no accounts, no sync, no store, no multi-user code (D-001, D-012). "Someone else" is used here as the sharpest test of one capability the app needs anyway — the path shared by a new way with no history (§20), riding in a new city, and the day the phone is wiped. Every proposal below is **UNBUILT**.
```
REPLACE:
```
Product Owner, cycle 011. **Design lens only** (Nathan's ruling): Qualifire stays single-user, no accounts, no sync, no store, no multi-user code (D-001, D-012). "Someone else" is used here as the sharpest test of one capability the app needs anyway — the path shared by a new way with no history (§20), riding in a new city, and the day the phone is wiped. ~~Every proposal below is **UNBUILT**.~~

## Disposition on `virgin` (2026-09-08, virgin-cycle5)

This proposal is what the `virgin` branch set out to build (Nathan's notes4, 2026-08-27: "someone
else" stopped being a thought experiment). Its §6 rows, checked against the code:

| §6 row | Status | Where |
|---|---|---|
| B-32 retroactive way creation — name start/end at STOP | **BUILT** 2026-08-31 | `app/src/store/routeCreation.ts`, `app/src/ui/routeNamingCard.tsx` (post-WP-3 names: creates a Route + Way; both ends named on a free ride) |
| B-35 de-hardcode route identity; empty-seed install | **BUILT** — cycle 025 + default `'empty'` since 2026-09-08 | `app/src/store/seed.ts`, `EXPO_PUBLIC_SEED_MODE` |
| B-38 ride 1 is the reference; promote a later lap | **BUILT** — ride-1 default 2026-08-31; promotion from the RIDE detail screen | `Way.referenceRideId`, `RideDetailScreen.tsx` `onPromote` |
| B-33 provisional gates from 2 traces | **BUILT, differently** — seeded from ride 1 (not after ride 2): 25/50/75 % chainage, nudged ≥150 m clear of the reference ride's stops, flagged `origin:'geometric'`; the "replaced by measured gates at ≥10 rides" half is not built (OPEN-ITEMS Parked) | `app/src/store/gateSeeding.ts` |
| B-36 persist the comparison window across restarts | **BUILT** (main cycle 024 `resultsStore.ts`) — §4's "`recordedResults()` is memory-only" is no longer true | |
| B-37 alternatives — several ways per endpoint pair, grouped, never colour-compared | **BUILT** structurally by WP-3 (`Route.wayIds[]`) + way `specs` | `app/src/store/types.ts` |
| B-40 bug F-1 — own lap inside its own history | **FIXED** by D-045 ruling 2: the window is sliced after excluding the judged ride | `colourModel.ts` `ghostsFor` |
| B-41 reconcile 28-day vs `WINDOW_N = 10` | **RESOLVED** — last-10 everywhere | `STATE.md` ground rules |
| B-39 empty-state pass | **OPEN** | `OPEN-ITEMS.md` item 3 |
| B-31 cold-start ladder — verdict-free ride-1 board, "ride n of 5", two announcements | **NOT BUILT.** Its premise is live: `MIN_HISTORY = 5` still gates every colour and rank (`colourModel.ts:40,144`, `towerSource.ts:40`, `rideDetailModel.ts:71`) although D-045 ruling 1 (2026-08-26) deleted the floor — the 2026-08-26 "STALE" note in §1 below describes the ruling, not the code. F-4 is therefore still open. | see `OPEN-ITEMS.md` |
| B-34 sector count scales with length | **NOT BUILT**, deliberately — exactly four sectors is a ground rule | `STATE.md` |

Also true today: sports (WP-1) come before landmarks on a blank install — RECORD asks for a sport
name first; §3's step table is otherwise the shipped order. F-2 (sector colour lags lap colour
because `sectorValues` is clean-only) is still structurally true.
```

### 9c — `proposals/SETUP-UX.md`: status line + disposition table
FIND (lines 3–4):
```
**Status: PROPOSAL. Everything in this file is UNBUILT.** Owner: Designer · Cycle 011, 2026-08-17. Answers IDEAS §28 (fresh install, no seeded data) and §29 (destination entry). Binding inputs unchanged: D-006, D-008, D-011, D-030, BRAND P1–P4, LAYOUT §2/§3b/§5.
Grounded on `app/App.tsx` (six-tab bar), `RoutesScreen.tsx` (YOUR PLACES → WAYS → routes, read-only), `RecordScreen.tsx` (STARTING FROM / GOING TO pills, way derived from the pair). `product/LAYOUT.md` is deliberately **not** edited — it describes shipped surfaces; the §3.5/§5 changes proposed here are flagged, not made.
```
REPLACE:
```
**Status: ~~PROPOSAL. Everything in this file is UNBUILT.~~ Largely BUILT on `virgin` — disposition below (2026-09-08).** Owner: Designer · Cycle 011, 2026-08-17. Answers IDEAS §28 (fresh install, no seeded data) and §29 (destination entry). Binding inputs unchanged: D-006, D-008, D-011, D-030, BRAND P1–P4, LAYOUT §2/§3b/§5.
Grounded on `app/App.tsx` (six-tab bar), `RoutesScreen.tsx` (YOUR PLACES → WAYS → routes, read-only), `RecordScreen.tsx` (STARTING FROM / GOING TO pills, way derived from the pair). `product/LAYOUT.md` is deliberately **not** edited — it describes shipped surfaces; the §3.5/§5 changes proposed here are flagged, not made.

## Disposition on `virgin` (2026-09-08, virgin-cycle5)

| Section | Status | Notes |
|---|---|---|
| §1 no seventh tab; ROUTES rows → read-only detail; edit gates behind a second tap | **BUILT** (cycle2 WP-K `CatalogDetailScreen.tsx`, WP-I `GateAdjustScreen.tsx`) | RECORD keeps exactly one setup affordance, as argued |
| §2 first run — ride first, name after; arrival card; one answer creates landmark + route + way + reference + 4 gates | **BUILT** 2026-08-31 (`routeNamingCard.tsx`, save-flow gates) | Differences: a blank install first asks for a **sport** (WP-1); there is no prefilled "Home" — with no landmarks the first ride is a free ride and *both* ends are named at STOP; gates are seeded from ride 1 (25/50/75 % + stop-snap) and offered for nudging before save |
| §3 destination from your own places | **BUILT in spirit** — STARTING FROM / GOING TO pills on RECORD | Type-to-filter, recents and time-of-day ranking: not built; the pre-START sector-strip preview: not built |
| §4 select-then-nudge, ± pad, never drag | **BUILT** (cycle2 WP-J: ± buttons, long-press repeat, real zoomable map) | The START/FINISH "locked ring + laps-count confirm" was **deliberately dropped** (`gateAdjustModel.ts`: every gate nudges alike; the ROUTES entry prices every move with its own reset dialog). "Make this a new route instead": not built |
| §5 depth strip | **NOT BUILT** | Nearest thing: the RESULTS last-9-rides scatterplot. The `⚠n/5` retirement is moot once the noise floor goes (see COLD-START disposition, B-31) |
```

### 9d — `proposals/ROUTING-AND-SEGMENTATION.md`: status line
FIND (single line, line 3):
```
**Navigation Engineer design proposal, cycle 011 (2026-08-17).** Answers IDEAS §29. Everything proposed here is `UNBUILT`. No app code is touched.
```
REPLACE:
```
**Navigation Engineer design proposal, cycle 011 (2026-08-17).** Answers IDEAS §29. Everything proposed here is `UNBUILT`. No app code is touched.

*Status on `virgin` (2026-09-08): still a proposal — IDEAS §29 is the one Parked product fork on `OPEN-ITEMS.md` (needs a routing engine; no maintained Expo binding exists, §1). What did ship out of this file: §3 step 5's rules (no gate within 150 m of a controlled stop, ±250 m search window) and the `GateSet.origin: 'measured' | 'geometric'` honesty clause — both cited by name in `app/src/store/gateSeeding.ts` and `types.ts`; the stop proxy is the reference ride's own stationary points, not OSM signals. Not shipped: BRouter, geocoding, the 3–6 sector count (four is a ground rule), the overlap scan. Every input in §0 and §4 (`data/analysis/`, `activity-index.csv`, `routes.json`, the 624 rides) is `main`-only. "Route" in this file is the physical path — today's **way**.*
```

---

## 11. WP-P10 — `product/brand/*` one-liners, cycle README line — SMALL

### 10a — `brand/README.md`
FIND (lines 19–21):
```
Status: palette decision OPEN — Nathan comparing `palettes/brandboard_*.png`
(A signal = current, B vibrant gold, C two-tone, E cool-gray; D and F rejected
in the composite round). Adopted mark: concept 5 (+1 as launcher form).
```
REPLACE:
```
Status (2026-09-08, `virgin`): the palette comparison below was never ruled on;
**palette A ("signal") is what ships** — `app/src/ui/theme.ts` (`#F5C542` /
`#A667F0` / `#3ED598`) — by default of no decision, with daylight + night themes
added 2026-08-24. B vibrant gold, C two-tone and E cool-gray were never reviewed;
D and F were rejected in the composite round. Nathan's later wish (notes4, point 6)
is a different question — extra *chrome* themes (pink / light blue / green), verdict
colours fixed — and is not on `OPEN-ITEMS.md` either; both are flagged there for
him to keep or drop. Adopted mark: concept 5 (+1 as launcher form) — shipped:
`app/assets/icon/` is concept 1, the launch animation is concept 5.
```

### 10b — `brand/LOGO-RATIONALE.md`
FIND (lines 3–7):
```
Designer · 2026-08-15 · Companion to `BRAND.md` (read that first: the story the
marks must serve). Every claim here should trace to a recorded decision or a
BRAND principle; where a concept's story was weak, the design was changed, not
the story stretched.
```
REPLACE:
```
Designer · 2026-08-15 · Companion to `BRAND.md` (read that first: the story the
marks must serve). Every claim here should trace to a recorded decision or a
BRAND principle; where a concept's story was weak, the design was changed, not
the story stretched.

*Status (2026-09-08, `virgin`): the recommendation below is what shipped — concept 1
is the launcher icon (`app/assets/icon/README.md`), concept 5 is the identity and the
launch animation (`app/src/ui/launchChoreo.ts`, `marketing/`). Concepts 2–4 unused.*
```

### 10c — `cycles/virgin-cycle5/README.md`
Append under "## Known follow-ups" — replace the bullet that begins
"- **`product/` docs likely have the same leftover pattern.**" with:
```
- **`product/` docs — audited and cleaned (follow-on, same cycle).** `REVIEW-product-docs.md` has
  the per-file findings; `BRIEF-product-docs-cleanup.md` the edits. Biggest non-doc finding: the
  D-045 "no noise floor" ruling is in `STATE.md` but not in code (`MIN_HISTORY = 5` still gates
  colours and ranks) — proposed as a code WP in that brief's §12.
```
If the bullet text does not match, append the block at the end of the "Known follow-ups" list
instead and report it.

---

## 12. New work packages (NOT executed by this brief — proposals for Nathan / a later brief)

These surfaced from the audit and are not doc-text fixes. Listed in the order I would take them.

### NW-1 — Implement D-045 ruling 1: colours and ranks from ride 1 (code, MEDIUM, own brief)
**Finding.** `STATE.md` ground rule and COLD-START.md's 2026-08-26 note both say the "<5 clean rides
stay neutral" floor was deleted by Nathan's ruling: first ride on a way logs all-purple sectors; one
prior ride compares purple/yellow; two or more run the full model on the average. The code still has
the floor: `app/src/ui/colourModel.ts:40` (`MIN_HISTORY = 5`) and `:144` (`tierFor` returns
`'neutral'` below it — every sector and lap colour goes through this), `app/src/live/towerSource.ts:40`
(no live position under 5 ghosts), `app/src/ui/rideDetailModel.ts:71–75` ("too few to rank"),
`app/src/store/routeCreation.ts:24` ("scored all-purple lap is STILL deferred"). D-045 ruling 2 (the
window slice) *was* implemented; ruling 1 was not.
**Why it matters.** A stranger with the blank Preview rides the same way five times before any colour
or rank appears — the exact failure COLD-START §2 was written to prevent, on the branch whose purpose
is that stranger. It also means `STATE.md` currently states as settled something that is not built.
**Scope.** `tierFor` semantics per the ruling (n=0 → purple; n=1 → purple/yellow; n≥2 → full model);
`getLiveTowerPosition` and `rankLineFor` drop the floor (a rank of "P1 of 1" — decide whether to show
it or say "first ride"); `sectorValues` clean-only rule unchanged; `demoModel.ts` no longer needs six
pinned laps; update the `MIN_HISTORY` doc-comments; tests in `app/tests/` for n=0/1/2/10; run the 560.
Then strike the "not yet in code" sentences this brief adds to CONCEPT.md, DATA-MODEL.md §9 and
COLD-START's disposition. **Ask Nathan only one thing first:** confirm ruling 1 still stands (it is
his 2026-08-26 word; nothing since contradicts it).

### NW-2 — `OPEN-ITEMS.md` additions (doc, SMALL, one anchored edit each)
(a) Item 2's on-device checklist: add MAP-CONTRACT §4's acceptance paragraph (pre-start pannable →
moving locked/no labels → stopped identical → finished released) and MAP-TILES §2's dead-zone check
(does the ribbon still draw the last-ridden corridor with the radio off?). Never run formally.
(b) Item 3 (empty-state pass): add COLD-START F-2 — a way's lap can colour while its busiest sector
stays uncoloured (clean-only sector history); the board should say why.
(c) Parked: SETUP-UX §5 depth strip — keep parked or drop (Nathan).
(d) Parked or dropped, Nathan's call, currently on neither list: the ideal-lap line (LAYOUT §3,
CONCEPT); "more uses of the launch animation" (notes2); the brand palette B/C/E review and the
notes4 extra-chrome-themes idea (brand/README.md); MAP-TILES §3 PMTiles offline pack.
(e) Housekeeping: `app/src/ui/theme.ts` lines 16/18 still comment the tiers as "28d best" / "7d best";
`colourModel.ts` calls the floor "D-008's noise floor". Fold into NW-1's comment sweep.

### NW-3 — `design/` currency check (audit, SMALL) — carried from the cycle5 README
`design/README.md` and `make_screens.py` generate 9 screens × day/night from theme tokens; cycle2/3
changed ROUTES (detail screen), RESULTS (new tab), RECORD (sport pills, naming card). Not checked here.
`design/ChatGPT attempt at improved design/` is a screenshot/reconstruction set, not a brand input.

### NW-4 — `product/DATA-MODEL.md` §4/§6/§8a refresh (doc, SMALL) — only if WP-P3's D6 grep turns up
more store files than listed (e.g. a free-rides or unmatched-results file), or if the executor finds
§8a's pick-at-START prose contradicts the live engine's soft/verified lock in a way the header note
does not cover. Otherwise nothing.

---

## 13. Verify, commit, report

### 13.1 Sanity greps on the finished docs
```
cd "$HOME/mnt/Qualifire"
grep -c "Reading this on the \`virgin\` branch" product/CONCEPT.md product/DATA-MODEL.md product/LAYOUT.md product/BRAND.md product/MAP-CONTRACT.md product/MAP-TILES.md product/PRIOR-ART.md product/proposals/COLD-START.md product/proposals/SETUP-UX.md product/proposals/ROUTING-AND-SEGMENTATION.md   # expect 1 each
grep -n "BACKLOG.md\|DECISIONS.md\|superseded/" product/README.md      # only inside the "Not on this branch" paragraph
grep -n "CATALOG_SCHEMA_VERSION = 1\|RESULT_SCHEMA_VERSION = 1" product/DATA-MODEL.md   # expect no output
grep -n "routes/result/\|B-59" product/LAYOUT.md product/CONCEPT.md     # expect no output
grep -n "^UNBUILT\|^All UNBUILT" product/MAP-CONTRACT.md product/MAP-TILES.md   # expect no output
grep -n "Every proposal below is \*\*UNBUILT\*\*\.$" product/proposals/COLD-START.md   # expect no output (it is struck through now)
cd app && node --experimental-strip-types tests/run.ts 2>&1 | tail -1 && ./node_modules/.bin/tsc --noEmit; echo "tsc exit $?"   # 560 tests / exit 0 — nothing here touches app/, so a change means something else did
```

### 13.2 Commit
```
cd "$HOME/mnt/Qualifire"
ls .git/index.lock .git/HEAD.lock 2>/dev/null && { mv .git/index.lock .git/index_lock_stale_$(date +%s) 2>/dev/null; mv .git/HEAD.lock .git/HEAD_lock_stale_$(date +%s) 2>/dev/null; }
GIT_OPTIONAL_LOCKS=0 git add product/README.md product/CONCEPT.md product/DATA-MODEL.md product/LAYOUT.md product/BRAND.md product/MAP-CONTRACT.md product/MAP-TILES.md product/PRIOR-ART.md product/proposals/README.md product/proposals/COLD-START.md product/proposals/SETUP-UX.md product/proposals/ROUTING-AND-SEGMENTATION.md product/brand/README.md product/brand/LOGO-RATIONALE.md cycles/virgin-cycle5/
GIT_OPTIONAL_LOCKS=0 git status --short     # only the files above staged; scripts/OTA-TROUBLESHOOTING.md (other session) stays unstaged
GIT_OPTIONAL_LOCKS=0 git commit -m "virgin-cycle5: product/ doc cleanup — status headers, route/way note, DATA-MODEL v2 schema, proposals dispositions" -m "product/README.md rewritten (8 index rows pointed at files cut by 44e24f1). Every product doc gets a 'reading this on virgin' note (D-/B- ids and roles are main's; route/way swapped by WP-3). CONCEPT/LAYOUT/MAP-CONTRACT/MAP-TILES status blocks replaced; UNBUILT claims struck where built. DATA-MODEL §2-§3 refreshed to the v2 schema from store/types.ts. COLD-START and SETUP-UX get disposition tables (largely built on this branch). brand/ palette line closed. Bodies left as dated records.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P5vBtptD73TGjBLu1nXkXK"
GIT_OPTIONAL_LOCKS=0 git rev-parse --short HEAD
```

### 13.3 Report (plain text, in this order)
1. Files changed, each marked whole-file or edited.
2. Every anchored edit — C1–C4, D1–D6, L1–L5, B1–B4, M1–M3, T1–T3, the PRIOR-ART line, 9b–9d,
   10a–10c, and the ten WP-P0 note insertions — as APPLIED or MISMATCH (with FIND and actual text).
3. The D6 grep result (which store file names were confirmed).
4. Test line and tsc exit, verbatim.
5. Commit hash.
6. Every `[ASSUMPTION]`, one line each.

---

## 14. `[ASSUMPTION]` log — decisions made while writing this brief (for the Inspect pass)

- A1. Bodies of dated records are not rewritten and D-/B- citations are not stripped; one note per
  file explains them. Rationale: the root-doc cycle's artifact-vs-rule distinction, extended with a
  "record" category — these files are the *why*, and the why has a date.
- A2. LAYOUT.md gets no vocabulary find-replace: verified by reading the whole file that it uses
  "track"/"direction", never "way"/"route" as model terms. The digest's suspicion was unfounded.
- A3. DATA-MODEL §3 is replaced by copying `types.ts` rather than by hand-written prose, so the doc
  cannot drift from the code in the act of being fixed. §4/§6/§8/§8a are kept: their arguments hold
  under the header's swap explanation.
- A4. The `MIN_HISTORY` finding is recorded in the docs this brief touches (CONCEPT status block,
  DATA-MODEL §9 marker, COLD-START disposition) as "ruled, not built" rather than hidden, and proposed
  as NW-1 rather than fixed here — a code change is out of this brief's scope and needs its own tests.
- A5. `product/README.md`'s role-routing column is dropped entirely (no roles on this branch) rather
  than mapped to "Nathan / Claude".
- A6. MAP-CONTRACT §3 and MAP-TILES §3/§4 are marked historical/parked, not deleted: they explain why
  satellite/PMTiles are not there.
- A7. brand/README.md's palette line is closed as "A ships by default of no decision" — a fact from
  `theme.ts` — and the two open palette wishes are routed to Nathan via NW-2(d), not decided.
- A8. The "ideal lap" (CONCEPT, LAYOUT §3) is described as "never built, not on OPEN-ITEMS" and
  routed to Nathan (NW-2 d) rather than declared dropped — no record says he dropped it.
- A9. Verified on device, not assumed: `MIN_HISTORY` usage sites; `wayMapView.tsx` style URLs and
  attribution string; `gateSeeding.ts` constants; `gateAdjustModel.ts` end-lock removal;
  `RideDetailScreen.tsx` `onPromote`; `resultsStore.ts` persistence; screens importing `WayMapView`;
  `app/assets/icon/README.md` concept 1; `launchChoreo.ts` concept 5; absence of `demos/`,
  `data/analysis/`, `app/assets/routes/routes.json`, `ResultScreen.tsx`, `routeMapView.tsx`.
- A10. Not verified (paraphrased from `STATE.md`/GLOSSARY, which this cycle just cleaned): the exact
  RECORD copy for the zero-sport block and the naming-card wording; the RESULTS screens' shapes.
