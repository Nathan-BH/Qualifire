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
