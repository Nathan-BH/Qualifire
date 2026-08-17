# Cycle 008 — 2026-08-16

Trigger: Nathan installed the build-3 preview APK and found the old three-tab app. The five-tab design existed only in `demos/mockup.html` and had never been implemented — my framing, not a build failure, but the expectation was mine to set. He asked for all seven gaps closed and for the cycle log to resume. Members: Designer, Race Engineer, Mobile Dev, Backend Dev, QA.

## Agenda

All seven gaps between `demos/mockup.html` and the app, in one pass, as pure JavaScript so it reaches the phone over Fast Refresh and costs no build.

## What shipped

| # | Gap | Owner | Result |
|---|---|---|---|
| 1 | Start flow | Mobile Dev | Landmark and destination pills on the idle Record screen from the ratified catalog, plus the ghost count for the locked route. Detected-vs-choose follows the Settings switch. |
| 2 | Live colours | Race Engineer + Designer | `viewModelFromEngine` takes a `TierSource`; RecordScreen supplies one from the colour model and the ghost history. Sectors, the flash and the lap now colour in real time. |
| 3 | Position chip | Race Engineer | `getLiveTowerPosition` is BUILT — ranks the live lap among the route's ghosts. B-28's stub is retired. |
| 4 | Result from a real ride | Mobile Dev | STOP hands the finished live state to `lastRide.ts`; the Result tab shows it, falling back to a labelled ghost when no ride has finished. |
| 5 | Gates on the live map | Designer + Mobile Dev | `RouteMapView` draws the five measured gates and fills each one with the colour its sector earned as you cross it. |
| 6 | Earcons | Mobile Dev | One buzz per gate fire via `Vibration`, respecting the Settings toggle. |
| 7 | Settings persistence | Backend Dev | Written to `settings.json` via expo-file-system and restored on launch. |

## Decisions and judgements recorded

- **A yellow tier now exists** (`chips.tsx`, `YELLOW_TIER = #8A8A2C`). §19's average model needs a "below average" state, and D-013 forbids failure styling — so it is muted, reading as "slower than usual" rather than a red flag. Provisional: it becomes real only if the average model is ratified.
- **Colour is a read-time function, never stored** (DATA-MODEL §1). The live path gets an injected `TierSource` rather than a benchmark, which is why switching models in Settings recolours everything with no migration and no rebuild.
- **Nothing is coloured on thin history.** D-008's <5-clean-rides rule is enforced inside `tierFor`, for every model. Before the route locks, everything stays neutral — there is nothing honest to compare against yet (D-025).
- **Estimated laps still never rank** (D-028), even when they are the fastest number on screen. QA locks this explicitly.
- **The buzz is real; the tones are not.** `expo-audio` is installed but there are no audio assets, so gates buzz and stay silent rather than pretending. B-27 (audibility in wind) is untouched.
- **`lastRide` is display state, not a record.** The raw JSONL remains the only truth (D-023); a proper Result screen will one day read a derived `RideResult` from disk rather than this hand-off.

## Tests

**93 tests, 90 pass / 0 fail / 3 skip** (was 88/85). New `live_colour_suite.ts` locks the two places where a wrong answer would be invisible on the bike: the tier boundaries for all three colour models, the <5-rides silence rule, and the position source refusing to invent a rank (no lock, no lap, estimated lap, unknown route). `tsc` clean.

QA note: app code imports the seed as a bare `.json`, which Metro bundles directly but Node will not load without an import attribute the app cannot carry. The suite loads it through a hook and pulls the modules under test in dynamically — static imports link before any module body runs, so the hook has to exist first.

## Open after this cycle

- **On-device verification of all seven** — none of this has been seen on hardware; the dev client will show it over Fast Refresh.
- **The preview APK is stale**: it froze the JS at build time and shows none of this. A build 4 bakes it in, whenever the design is settled.
- Start flow is cosmetic so far — the pick does not yet constrain route matching (§8a says it should be intent, with the ridden road winning).
- Audio assets for the tier tones; B-27 unchanged.
- Colour model still unratified — the app now makes the three comparable on real data, which is what the ruling needed.

## Process

The miss that triggered this cycle is recorded in `process/CONVENTIONS.md`: prototype / in-codebase / on-device are three different tiers, and any build talk must state what will and will not change on the phone.

---

## Cycle 008, second pass — same day, Nathan's review

Three rulings after seeing it on the dev client.

**D-030 — the colour model is SETTLED.** One model, IDEAS §19's: purple beats every ghost in the window, green is above the recent average, yellow is an ordinary lap. The 'best' and 'hybrid' candidates are deleted, the Settings row is gone, and `tierFor()` lost its model argument. Yellow is now the brand's own F1 yellow rather than the muted olive I first used — in F1 yellow is the DEFAULT colour of a time, not a warning, which is exactly D-013's point about never styling ordinary as failure. Supersedes D-007/D-008's tier definitions; the rolling-window and noise-floor discipline survives (<5 clean rides ⇒ no verdict at all, rendered as plain ink, never as yellow).

**Demo tab reduced to one thing.** `DemoScreen` replaces the old five-scenario Preview: an archived Morning lap replayed at 25x through the SAME pane and map the Record screen uses (§17), so the buzz, the tier colours and the live map can be exercised without waiting for a commute. Nothing it does is recorded. It is where the tier tones will land first when audio assets exist.

**Tab bar scrolls sideways.** Six tabs would not fit at a readable size; shrinking the labels was the alternative and readability won. Each tab keeps a 92 px minimum and the bar scrolls horizontally.

**Logo corrected.** The Record-screen mark was drawn from a description and was wrong — too long and too thick a slash. It is now measured off `product/brand/logos/qualifire_logo_1_gate_q.png`: on a 512 canvas the ring is 309 px across with a 34 px stroke, and the slash is a 238 px diagonal 36 px thick starting at the ring's centre. A Q's tail, not a bar through the whole mark. Same measurements produced the launcher icon.

Tests unchanged in count but rewritten for the ruling: the three-tier boundary test replaces the model-comparison test. **93 tests, 90 pass / 0 fail / 3 skip.**
