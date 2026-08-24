# LAYOUT — Screen-by-screen design spec

**Status (2026-08-24, cycle 024): this is the live screen-by-screen spec, but read it against the app as it now stands. The live counter v2, board v2 and timing tower described below are BUILT (tower landed cycle 016, B-28). The app has six tabs — record / rides / routes / result / settings / demo — with a horizontally scrolling tab bar, not §1's "five screens, one navigation stack, no tab bar" (§1 is kept below as the original design record, unedited). The tier windows described in this doc predate D-030/D-037: colour today compares against the last-10-rides window (purple beats the best of your last 10 comparable rides, green beats the recent average), not a 7-day/28-day split. D-042 (2026-08-17) made RAW time the scoring default (implementation still pending, B-59), superseding this doc's moving-time wording. The RECORD flow now follows the setup → armed → running → ending phases from the cycle-022 mockup (built cycle 024, WP-A2), not the HOME → LIVE → BOARD shape §1 describes.**
Owner: Designer. Cycle 002, 2026-08-14; feedback sections amended cycle 004 per D-019 (B-23); lap scoring and Quali Day surfaces added cycle 005 per D-022 (B-26) and D-021 (B-25); live screen v2 (ticking counter), board v2 and timing tower (§3b) added cycle 007 per Nathan's 2026-08-15 rulings (IDEAS §15–16 — decision records pending with the Product Owner / Principal).
Binding inputs: D-006 (live constraints), D-007 (tiers), D-008 (windows/noise floor/flags), D-010 (per-direction), D-011 (sector states), D-019 (one buzz, three sounds — earcon spec in §6a), D-021 (Quali Day — §3a), D-022 (lap tier — §2a, §3, §6a), plus Nathan's 2026-08-15 live-counter and tower rulings (§2/§2a/§3/§3b — these supersede D-006's no-ticking clause at the visual layer; reconciliation written into §2).

Sector count is undecided (B-02). All wireframes assume 3–6 sectors `[ASSUMPTION — layouts must survive up to 8 before redesign]`.

---

## 1. App structure

*Historical (cycle 002). The shipped app is six tabs — see the status block above.*

Five screens, one navigation stack, no tab bar. A twice-a-day personal app gets a spine, not an architecture.

```
            ┌──────────┐
            │  HOME    │──────────────► HISTORY (per direction)
            │ (start)  │──────────────► ROUTE & SECTOR SETUP
            └────┬─────┘
                 │ tap START (or auto-arm, see below)
                 ▼
            ┌──────────┐   finish gate crossed
            │  LIVE    │─────────────────────────►┌────────────┐
            │  RIDE    │   (or manual end,        │ POST-RIDE  │
            └──────────┘    stationary only)      │   BOARD    │
                                                  └─────┬──────┘
                                                        │ back → HOME
                                                        ▼ tap any ride in HISTORY
                                                  (same BOARD screen, past ride)
```

- **HOME** is a launcher, nothing more: one big Start button, direction pre-selected by time of day and current location (`[ASSUMPTION — before ~12:00 near home = to-work, else from-work; overrideable with one tap]`), yesterday's board one tap away.
- **LIVE → BOARD is automatic.** Crossing the final gate ends timing and pushes the board. Nathan never touches the phone to see his result — he locks the bike and it is already there (ten-second test starts at the bike rack, not at an "end ride" button).
- **The POST-RIDE BOARD is the same screen for "just now" and "any past ride"** — one layout to learn, HISTORY is just a picker for it.
- SETUP is reached only from HOME and expected to be visited a handful of times ever.

No settings screen in v1. The few toggles that exist (elapsed-timer on live screen, sound on/off) live at the bottom of HOME. `[ASSUMPTION]`

---

## 2. LIVE ride screen — v2: the ticking lap (Nathan's ruling, 2026-08-15)

**Reconciliation with D-006 / B-15 — written, not buried.** This section previously forbade any ticking display (glanceable under one second, audio-first, screen inert while moving). Nathan's 2026-08-15 ruling supersedes that **at the visual layer**: on a flying lap the screen carries the big live **lap clock, F1-style** — ticking from the start gate to the final gate (~15 min by the end of a ride), 0.1 s precision ("12:40.7"), taking the majority of the screen. The frame this spec designs within, explicitly:

- **Audio/haptic stays the PRIMARY on-bike channel** (D-019 unchanged — buzz + earcons carry the whole story; a rider who never looks loses nothing).
- **The ticking display is what you see at a glance, or at a stop** — not a feed to watch.
- **What survives of D-006:** zero touch targets while moving; the clock counts **up** — no countdown, no target, no benchmark, no projected delta ever shares the screen with a ticking number; nothing about the upcoming sector; deltas exist only frozen, at completion.
- **What is given up:** "screen inert while moving" — digits now change at 10 Hz, and nothing else moves. The cycle-002 safety objection stands recorded in `team/designer.md`; it is not relitigated here. The job now is making the ticking clock safe, which the constraints above exist for. `[Formal D-006 amendment → decision record at cycle close.]`

```
┌─────────────────────────────────┐
│   S3  ·  sector 1:38            │  ◄── context line, small: current sector
│                                 │      label + plain sector-elapsed clock
│                                 │      (toggleable). No benchmark, no name.
│                                 │
│         12:40.7                 │  ◄── THE COUNTER: the LAP clock, ticking
│                                 │      since the start gate, m:ss.d (0.1 s
│                                 │      — per Nathan, that precision is
│                                 │      enough), the majority of the screen.
│                                 │      Ink-white, NEVER tier-coloured
│                                 │      while ticking.
│                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │  ◄── SECTOR BLOCKS: one row, equal width.
│  │S1  │ │S2 ‖│ │S3  │ │S4  │    │      Completed = tier colour + frozen
│  │3:06│ │3:29│ │    │ │    │    │      time; current = accent border only;
│  └────┘ └────┘ └────┘ └────┘    │      untraversed = empty grey.
└─────────────────────────────────┘
```

Rules:

1. **Counter semantics: the LAP clock, F1-style (Nathan's ruling, 2026-08-15)** — one clock, running from the start gate to the final gate, never resetting at sector gates, ~15:00.0 by the end of a typical ride. The earlier current-sector reading recorded here is withdrawn; as that note predicted, the design holds unchanged — the counter simply never resets, and the context line swaps roles: it now carries the small **sector-elapsed** clock (toggleable; the old HOME elapsed-timer toggle survives as its off-switch).
2. **Type scale.** Counter: m:ss.d, weight 800, tabular numerals, **sized for the widest end-of-ride figure ("15:00.0" — seven glyphs), not the six-glyph start**: ~95 pt at 390 pt screen width, still by far the largest type in the app (BRAND P3 taken to its limit). The clock must never resize or reflow when the minutes field grows to two digits mid-ride (m:ss.d → mm:ss.d at 10:00.0) — reserve the seven-glyph width from 0:00.0; a slightly smaller figure buys a rock-steady one. Context line ~15 pt. Block labels ~15 pt, frozen block times ~17 pt. Ground stays race-mode near-black (#0A0A0A `[ASSUMPTION — pending on-device sunlight test]`); the display updates at 10 Hz and nothing animates but the digits.
3. **The counter is the raw wall-clock lap; scoring stays moving time (D-008).** While stationary (red light) the counter dims to ~40 % opacity and gains a ‖ suffix — at exactly the moment the rider is allowed a long look, the screen says "this raw clock is not your score". Full ink resumes on movement. `[ASSUMPTION — dim-when-stationary is this role's addition, not Nathan's ask]`
4. **Sector blocks** (up to 6 across; 7–8 wrap to two rows, pre-existing assumption): completed blocks light up in the full §6 tier treatment (filled/outlined/flat) and keep their frozen final time in small type (m:ss — the decimal lives in the override and on the board). **Interrupted (‖):** earned tier + ‖ by the label. **Estimated (~):** dashed grey, ~time. Current block: accent border only, no numbers. Untraversed: empty grey. At any stop, the block row is the completed story so far, read left to right. Warm-up sectors (<5 clean rides) render as ordinary neutral — warm-up stays invisible live, explained only on the board.
5. **Zero touch targets while moving** (unchanged). Manual "End ride" appears only after ~20 s stationary `[ASSUMPTION — threshold pending real commute traces]`, as a full-width bottom bar (glove-sized).
6. **Standing refusal restated (unchanged):** the upcoming sector's benchmark never appears on this screen, even as a "static" number. A ticking clock beside a target *is* a countdown — the counter is only safe because no target exists anywhere on the surface.

### The override moment — a completed sector takes the big slot

At each gate the buzz + earcon fire (primary channel, unchanged, §6a) and the completed sector's **final time takes the big slot, frozen, in its earned tier colour** — Nathan's "briefly show the checkpoint time (overrides the live counter in that specific colour)":

```
│         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │   purple: filled slab behind the digits,
│         ▓   3:49.9    ▓        │   dark-purple ink — the only moment the
│         ▓   −11.1 ●   ▓        │   screen floods with colour.
│         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │   green: green digits + outlined frame.
                                     neutral: warm-toned digits, flat.
```

- **Hold: 2.5 s, then the ticking lap clock resumes the slot.** `[ASSUMPTION — value to tune on device: long enough for one glance plus the longest earcon (~0.76 s), short enough the clock is never masked beyond ~3 s]` The lap clock **keeps running underneath the whole time** — the override masks it, never pauses it, so when it resumes it reappears ~2.5 s further along, already honest. No time is lost or invented.
- The frozen delta (vs reference, one decimal, ~34 pt) renders under the time. It exists only here and on the board — never beside a ticking number (rule 6).
- **Estimated (~, colourless):** after the buzz-then-silence, the override shows `~4:07` in flat grey inside a dashed frame, delta `– –`. Same 2.5 s hold — the moment exists (a gate WAS crossed), it is just visibly colourless. Buzz-without-sound plus a grey override *is* the "recorded, not scored" signal; a colour or a chime on interpolated numbers would poison trust in every real one.
- **Interrupted (‖):** earned tier's treatment on moving time + ‖ after the label; sound is the earned tier's earcon, unchanged. The ‖ alone carries the asterisk — the override must not look like a failure; the rider hit a red light and the moving time is still real.
- **All-time PB:** ● badge beside the frozen time; grace note appended to the earcon (unchanged, D-007).

### 2a. Final-gate handover — lap result, then the tower (D-022 + Nathan 2026-08-15)

The final gate still scores **two things** — the last sector, then the whole lap (moving time vs rolling 7-day / 28-day **lap** bests, ~25 s noise-floor margin, unchanged) — and now hands over to the timing tower (§3b). Three beats, sight and sound in lock-step:

```
beat 1 · t = 0       gate: buzz + sector earcon. S4's final time takes the
                     big slot in its tier treatment — as at every gate.
beat 2 · t ≈ +1.1 s  lap earcon starts (§6a: sector earcon + 300 ms). The
                     big slot becomes the LAP RESULT: "LAP" label, lap
                     moving time (m:ss, no decimal), lap tier treatment,
                     delta vs ref. The lap clock never resumes — this is
                     its terminal state. (The result is MOVING time, so it
                     can read under the raw clock it replaces; the ‖ stop
                     count on the board's sub-line owns that gap.)
beat 3 · t ≈ +3 s    board pushes. The timing tower heads it with today's
                     row mid slot-in (§3b): the number the rider just read
                     in the big slot arrives in its ranked position —
                     same time, same tier colour, one object seen twice.
```

Rules:

1. **The final sector's override is deliberately cut short by beat 2** (~1.1 s instead of the usual 2.5 s hold): the lap must own the slot before the tower moment lands. Nothing is lost — the sector's time persists on its block and on the board's sector rows.
2. **Redundant cues, same ladder (unchanged):** the word **LAP** is the non-colour identity cue; tier is filled/outlined/flat exactly as sectors; delta vs reference always present. Lap tier vs rolling lap windows, lap delta vs the reference lap — one rule, learned once.
3. **Trust rules unchanged (D-022):** any estimated sector → the lap result renders dashed-grey, ~time, delta suppressed, **no lap sound ever**, and — new — **no tower slot-in: an estimated lap does not rank** `[ASSUMPTION — ranking semantics are the Product Owner's; visually, an unrankable lap must not shoot up a leaderboard]`. An interrupted-only lap still earns its tier on moving time (‖ stop count in the board sub-line).
4. **A neutral lap is silent** (D-022). On an unremarkable day the final gate sounds like every other gate; the lap result still appears (neutral flat) and the silence *is* the "time posted" signal. Its tower row still slots in — every clean lap has a rank.
5. No reference on this track yet (D-021): lap result shows tier + time, delta blank — same as sector rule.
6. **The board push stays ~3 s after the final gate**, played out during rolldown (the final gate sits ~160 m before the destination, past the last junction) — the ten-second test still starts at the bike rack with the board already up.

**FLAG (recorded, not silently absorbed):** worst case — purple sector + purple lap + PB grace notes — is ~1.7 s of audio at the final gate, beyond §6a's deliberate sub-1 s single-event envelope. Accepted *only* because (a) it happens at most once per ride, (b) at a gate deliberately placed past the last junction, in rolldown, and (c) the sequence is two sub-1 s events with a silence between, not one long event. If gate positions ever move the final gate upstream of a junction, this must be re-argued.

---

## 3. POST-RIDE board v2 (the ten-second-test surface)

Board order per Nathan's 2026-08-15 rulings: **tower → sectors → ideal lap → quali card (when armed)**. "Sector of the day" is **DROPPED** (Nathan: redundant — the four sectors are right below it). Working rule 5 ("a bad ride still had one great sector") is now carried by the sector rows themselves: the one green row pops out of a flat column without a banner shouting it. Dark background, tabular numerals, the same chip language as live — learned once.

```
┌───────────────────────────────────────┐
│  → WORK        Fri 15 Aug   07:52     │  header: direction + date
│                                       │
│   P1   14:31 ●   —       Tue 05 Aug   │  TIMING TOWER (§3b) heads the
│   P2   14:46    +0:15    Thu 14 Aug   │  board. Today's row, oversized,
│  ┃P3   14:52    +0:21    TODAY        │  IS the lap headline — no separate
│   P4   14:58    +0:27    Mon 28 Jul   │  lap chip on this surface any more;
│    moving · vs ref · 15:03 elap ‖ 1   │  sub-line anchored to today's row.
│                                       │
│  S1   2:58   −0.4        (flat)       │  ┐
│  S2 ‖ 4:44   +2.1        (flat)       │  │ sector rows, unchanged anatomy:
│  S3  [4:12]  −1.8        (outlined)   │  │ label · glyph · time · delta ·
│  S4  ▓4:05▓  −4.1  ●     (filled)     │  │ badge; glyphs inline:
│  S5  ~3:41    – –        (dashed)     │  │ ‖ interrupted, ~ estimated,
│  S6   3:01   −0.2  ⚠3/5   (flat)      │  ┘ ⚠n/5 warm-up
│                                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  IDEAL LAP    14:19    you: +0:33     │  quarantined: dashed rule, dashed
│  (best sectors, 28d — not a real lap) │  text, untiered — it never happened.
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ QUALI ATTEMPT … (when armed, §3a) │ │  the one decision, last.
│ └───────────────────────────────────┘ │
│  [ History ]              [ Home ]    │
└───────────────────────────────────────┘
```

Precise rules:

1. **The lap headline is the tower's today-row** (supersedes the cycle-005 board lap chip; the LAP result at the live handover, §2a beat 2, survives unchanged). Same number, same tier colour the rider just read in the big slot — one object, seen twice, learned once. The moving / vs-ref / elapsed ‖ stop-count sub-line survives, anchored in small type under today's row — surfaced, never hidden, never the headline. Lap-tier ineligibility (any estimated sector) renders today's row dashed-grey with ~time, unranked at the bottom, no slot-in (§2a.3).
2. **Row anatomy for sectors unchanged: label · glyph · time · delta · badge.** Fixed columns, tabular numerals, chip styles per §6 — scanning down the delta column works like reading the F1 tower.
3. **The ideal-lap line stays visually quarantined:** below a dashed rule, dashed styling, explicit caption "not a real lap", never tiered or chip-coloured. 28-day window `[ASSUMPTION — window choice still not a decision]`. It shows headroom; it is not to be chased.
4. **The quali choice card (when armed) renders last, below the ideal lap** (moved from "directly below the lap chip", cycle 005): the glance completes over the whole story — rank, sectors, headroom — before the one decision is offered. §3a rules otherwise unchanged.
5. **Warm-up sectors** (<5 clean rides, D-008) show ⚠n/5 where n = clean rides so far. Still the only place the warm-up state is visible.
6. **No map on this screen** (unchanged, D-002). A past-ride board reached from History gains a small "view trace" link at the bottom — off the ten-second path.
7. Board for a **diverted/partial ride:** no today-row and no slot-in — the tower renders past laps only, headed by a plain "partial ride — not ranked" line; rows for missed sectors render "– did not traverse –"; no colours anywhere on a partial. `[ASSUMPTION — divergence detection itself is Race Engineer territory]`
8. **One render path (hard rule, restated for the demo):** the board is one component; demo and real screen differ only in data. The tower slot-in is driven by a `justFinished` flag in the view model, never by which screen hosts the component — the demo sets the same flag on scripted data. Nothing in this spec may fork demo and real rendering.

---

## 3a. Quali Day surfaces (D-021) — post-ride only, never live

Two surfaces, both living on the board. **Nothing about a quali attempt changes the LIVE screen or the earcons** — tiers and sounds run unchanged underneath (D-021); the attempt is invisible until the rider is stationary at the board. This is deliberate: an armed attempt that changed the live experience would be chase-pressure by another name.

**Surface 1 — the choice card.** When an armed attempt finishes clean, the board gains one card, **last on the board, below the ideal lap** (board v2 order, §3.4 — the glance completes over the whole story before the decision is offered; was "directly below the lap chip" in cycle 005):

```
│ ┌───────────────────────────────────┐ │
│ │ QUALI ATTEMPT   14:46 vs ref 15:03│ │  the comparison, stated once
│ │ ┌───────────────┐┌──────────────┐ │ │
│ │ │ New reference ││  Reference   │ │ │  two glove-sized buttons,
│ │ │     set       ││   defended   │ │ │  equal visual weight —
│ │ └───────────────┘└──────────────┘ │ │  declining is a race outcome,
│ └───────────────────────────────────┘ │  not a failure (D-021 grace)
```

- **Equal weight is the design point.** "Reference defended" is not a grey cancel button; both options are same-size, same-contrast. No confirmation dialog either way — both outcomes are cheap and honest.
- Choosing **Reference defended** collapses the card to one quiet line ("Reference defended — 15:03 stands") and the board is an ordinary board. No attempt counters, no streaks, nothing stored to feel bad about (D-021).
- Choosing **New reference set** re-renders the board in the ceremonial frame (surface 2).
- Diverted/unmatched attempts void silently (D-021) — no card, no message. The board is just a board.
- **FLAG (recorded):** this card is the first interactive decision ever placed on the ten-second-test surface. Acceptable because it is post-ride/stationary and rare-by-design (quali is deliberate), and because it sits last on the board so the glance completes before the decision starts — but it is a precedent, and the next role that wants a button on the board gets fought.

**Surface 2 — the ceremonial REFERENCE SET frame.** Display-only, one ride only, post-ride only:

```
│ ╔═══════════════════════════════════╗ │  purple frame around the board
│ ║        R E F E R E N C E  S E T   ║ │  banner, letterspaced
│ ╚═══════════════════════════════════╝ │
│ ┃█ LAP    14:46 █┃                    │  lap chip: filled purple
│ ┃█ S1  Village exit    3:06 █┃        │  every sector chip: filled purple
│ ┃█ S2  Vaartdijk drag  3:29 █┃        │  "purple by definition" (D-021)
│   ...                                 │  DELTAS SUPPRESSED — the ride IS
│ ─ ─ ─ IDEAL LAP 14:19 ─ ─ ─           │  the new baseline; a delta of 0.0
│                                       │  against itself is noise-cosplay
```

Rules:

1. **All-purple is ceremony, not scoring.** Earned tiers were already delivered live, honestly. The frame recolours the *display* to restore Nathan's "purple by definition" moment. Guard rails so ceremony can never be mistaken for scoring: (a) the banner + full purple frame border exist on no other board state; (b) **deltas are suppressed** on every chip (nothing to misread as an earned margin); (c) it renders exactly once, at the moment of keeping — the ride's board in HISTORY shows honest earned tiers with a small "ref" marker, not the ceremony. `[ASSUMPTION — history marker styling TBD]`
2. **The ceremony is silent.** No fanfare earcon. Sounds mark gate crossings and nothing else — the purple arpeggio is earned only, ever. Spending it on a button press would devalue every future one.
3. **The tower collapses in the frame** to today's all-purple row alone, unranked — ranking a ride that has just *become* the definition against the past is noise, the same logic that suppressed comparisons here before. (Sector of the day is gone from every board state — dropped, §3.)
4. **The ideal-lap line survives the ceremony** — still dashed, still quarantined, still labelled "not a real lap" (D-022 keeps it untiered). It is the one line on the screen that never flatters, and it stays.
5. **FLAG (recorded, not absorbed):** a display state where purple ≠ "beats 28-day best" is a controlled violation of the colour-trust rule (§6). It is accepted because it is display-only, post-ride, banner-labelled, delta-free and once-per-reference — but it is the *only* permitted violation, and it must never leak to live, history strips, or earcons.

---

## 3b. Timing tower — visual language (Nathan's ruling, 2026-08-15)

A ranked column of past-self laps on this track, into which today's lap slots at the end of the run — "you will shoot up into a certain position." **Which laps populate it (window, dedup, row count, gap definition) is the Product Owner's, being settled in parallel this cycle; this section owns anatomy and motion only.** UNBUILT.

**Row anatomy (left → right): position · time · gap · date.**

```
   P1   14:31 ●    —        Tue 05 Aug     past rows ~34 pt tall, quiet ink
   P2   14:46     +0:15     Thu 14 Aug
  ┃P3   14:52     +0:21     TODAY          today: ~1.5× height, time at
   P4   14:58     +0:27     Mon 28 Jul     display size, accent left bar
```

- **Position** `P1…Pn`: fixed two-character column, letterspaced — the non-colour cue for rank (working rule 3: rank must survive with no colour at all).
- **Time** in tabular numerals; **the time alone takes tier colour/weight**, per the D-022 history language (a green/purple number in a column of plain ones; neutral stays ink, never highlighted). ● PB badge beside the time, as everywhere. Position, gap and date stay ink — the column scans like the F1 tower: mostly flat, the rare coloured number pops.
- **Gap**: one signed m:ss column; P1 shows —. `[Gap-to-leader vs gap-to-row-above is semantics → Product Owner; the visual slot is one signed column either way.]`
- **Date** identifies the past self ("Tue 05 Aug"); today's row says **TODAY** — the wording keeps the tower honest: these are all Nathan.
- **Today-highlight**: ~1.5× row height, lap time at display size (~52 pt — this row doubles as the board headline, §3.1), accent-yellow left bar. The accent is identity chrome, allowed in paddock per BRAND P2 — it marks *which row is you today*, never a tier.
- Rows visible without scroll: ≤8 `[ASSUMPTION — final count is the PO's window call]`. Today's row must always be on screen at board push, even when ranked below the fold — the tower pre-scrolls so TODAY is visible, clipping P1 above if it must. The headline outranks the leader.

**The slot-in (the moment §2a beat 3 hands to):**

1. On a freshly finished board only (`justFinished`, §3.8), today's row **enters at the bottom of the tower and travels upward** to its rank over ~700 ms, decelerating (ease-out), the rows it passes stepping down as it goes by. `[ASSUMPTION — duration to tune on device; it must be finished well before the ten-second glance settles]`
2. **Upward is the only direction.** A slow lap enters at the bottom and travels zero rows — arrival is still marked (accent bar + TODAY label fade in over ~200 ms), so an unremarkable day gets an *arrival*, never an animation of failure (working rule 6).
3. **Plays exactly once.** Never on revisit, never from HISTORY, never re-triggered by scroll — everywhere else the tower is static in final order. This is the largest animation in the app, and it lives post-ride, stationary: consistent with the BRAND motion rule (nothing moves while riding except digits).
4. Estimated lap: no row, no slot-in (§2a.3). Partial ride: past laps only, "partial ride — not ranked" (§3.7). Ceremony frame: tower collapses to today's row (§3a.3).

---

## 4. HISTORY / trends (minimal)

One screen, one direction at a time (D-010 — a toggle at top, never merged data). It is a picker for past boards plus the smallest honest trend view.

```
┌───────────────────────────────────────┐
│   [ → WORK ]   [ ← HOME ]             │  direction toggle
│                                       │
│   lap moving time, last 28 rides      │
│   24:10 ┤ ·  ·                        │
│         │   · ·· ·  ·   ·             │  dot strip, not a line chart —
│   22:00 ┤       ·  · ·· · ··          │  rides are discrete events.
│         └────────────────────────     │  Reference lap = thin dashed
│              (dashed line = ref)      │  horizontal line.
│                                       │
│   Thu 14 Aug  22:41  [▓][░][█][▓][~]  │ ┐ ride list: date, lap time,
│   Wed 13 Aug  23:05  [░][░][░][░][░]  │ │ and a mini chip-strip — the
│   Tue 12 Aug  23:58‖ [░][‖][░][░][░]  │ │ whole ride's sector story in
│   Mon 11 Aug  22:59  [░][░][█][░][░]  │ ┘ five glyphs. Tap → BOARD.
│                    ⋮                  │
└───────────────────────────────────────┘
```

- The mini chip-strip is the load-bearing idea: a month of rides scans like the F1 season graphic — mostly flat, the occasional filled purple visibly rare (D-008's intent made visible).
- **Lap tier in the list (D-022):** the lap-time number takes the lap tier's colour/weight (green/purple text; neutral stays ink-coloured, never highlighted). No extra chip — the number itself is the cue, and a rare green lap time pops out of a column of plain ones exactly like the F1 tower.
- No aggregate statistics, averages, streaks, or badges in v1. Working rule 6: the app is used 200 times a year; a streak counter turns a missed rainy Tuesday into a punishment.

---

## 5. Route & sector setup flow (one-time, may be involved)

Done once per direction (D-010: independently — no auto-reverse, because the routes and their sector logic genuinely differ; a "copy other direction as starting point" shortcut is offered but produces a fully editable copy). This is the only surface where a full map appears and where dense interaction is acceptable.

**Step 1 — Record the route.** "Ride it once with recording on." The first recorded traversal becomes the reference polyline for gate projection (D-011). Importing a GPX is the alternative path (also serves B-17).

**Step 2 — Place gates on the chainage.** The core interaction: the recorded polyline on a map, plus a horizontal chainage bar underneath. Gates are handles on the *bar* (distance-along-route), mirrored as perpendicular gate lines on the map — this matches D-011's projection model exactly: a gate IS a chainage value, the map is a preview.

```
┌───────────────────────────────────────┐
│   (map: polyline with gate lines      │
│    drawn perpendicular at each gate,  │
│    tappable to select)                │
│                                       │
│ ○━━━━━┿━━━━━━━┿━━━┿━━━━━━━━┿━━━━━━━● │
│ start G1      G2  G3       G4  finish │
│        drag handles along the bar     │
│                                       │
│  ⚠ G3 is 12 m before a junction —     │
│    move it downstream of the exit     │
│    so queues wait BEFORE the gate     │
│                                       │
│  S3 length 240 m — below minimum,     │
│    merge with S2?                     │
└───────────────────────────────────────┘
```

- **The D-011 placement constraint is enforced as a warning, not a rule:** gates near junction centres / stop lines get flagged with the move-downstream suggestion. Detection of "near a junction" comes from stop clusters in Nathan's own recorded traces `[ASSUMPTION — needs B-17 data; until then the warning can only fire on manually marked junctions]`.
- **Minimum sector length warning:** value unknown until the noise floor is measured (B-17); the UI slot exists, the number is `[ASSUMPTION — placeholder 200 m]`.
- Sector names optional, default S1…Sn. Short names ("Canal straight") appear only on the board, never on the live screen.

**Step 3 — Confirm.** Summary list of sectors with lengths; "benchmarks will start colouring after 5 clean rides" stated once here (D-008 warm-up expectation-setting — this is where Nathan learns why week one is all-neutral).

Editing gates later re-enters Step 2. Moving a gate invalidates that sector's history for benchmarks `[ASSUMPTION — retention semantics are Race Engineer's call; UI just needs a confirmation dialog]`.

---

## 6. Colour + redundant-cue spec

One table, used identically on every surface. Colour is the fast channel; **shape and number carry the full signal without colour** (working rule 3).

| State | Colour | Chip shape (redundant cue) | Number | Glyph/badge | Sound/haptic (live, D-019) |
|---|---|---|---|---|---|
| Purple — beats 28d best | Purple | **Filled** solid chip, light text on colour | delta shown | — | buzz + rising arpeggio (§6a) |
| Green — beats 7d best | Green | **Outlined** chip, colour border + colour text on dark | delta shown | — | buzz + rising fifth (§6a) |
| Neutral — time posted | F1 yellow-ish warm tone, **never grey** | **Flat**: no border, no fill, warm-toned text | delta shown | — | buzz + one soft note (§6a) |
| Interrupted (D-008/D-011) | earned tier's colour (moving time) | earned tier's shape + **‖** glyph | delta shown | ‖ | buzz + earned tier's earcon, unchanged |
| Estimated (D-011) | none — flat grey | **Dashed outline** | time as ~x:xx, delta suppressed | ~ | buzz + **silence** — no earcon ever |
| Warm-up (<5 rides) | as neutral | as neutral | delta shown if ref exists | ⚠n/5 (board only) | as neutral |
| All-time PB | (keeps tier colour) | (keeps tier shape) | — | **● badge dot**, top-right of chip | grace note appended to tier earcon |
| **Lap tier (D-022)** | same three colours | same filled/outlined/flat ladder; **LAP** label + position (below sector / heading board) is the identity cue | lap delta vs ref always shown | ‖ stop count in sub-line | lap voice of tier earcon, 300 ms after sector earcon (§6a); **neutral lap = silence** |
| Reference-set ceremony (D-021) | all purple, display-only | filled chips + banner + full frame border | **deltas suppressed** | REFERENCE SET banner | **silent — never sounded** |
| Ideal lap | none | dashed rule + dashed text, never a chip | total + gap | caption "not a real lap" | never sounded |
| **Ticking counter (§2, cycle 007)** | ink-white — never a tier colour while ticking | none — it is type, not a chip; tier treatment appears only on the frozen override | m:ss.d, counts up only, no delta beside it | ‖ + ~40 % dim while stationary | none — the clock is silent; sound belongs to gates |
| **Tower row (§3b, cycle 007)** | time takes lap-tier colour; position/gap/date stay ink | today = accent left bar + 1.5× height (identity chrome, never a tier) | time + signed gap | ● PB beside time; TODAY label | never sounded — the board is silent |

Design commitments:

- **The tier ladder is also a visual-weight ladder:** filled > outlined > flat. Squinting in sunlight, or fully colourblind, the hierarchy survives as pure contrast/ink density. This is the primary redundancy, ahead of glyphs.
- **The delta number is the second redundancy and is always present** on scored sectors (live big chip, board rows, history is exempt — chips only). Signed, one decimal, tabular numerals.
- **Red–green colourblindness:** the palette contains **no red at all** — nothing to confuse green with. Green vs purple is the risky pair for some deuteranopes; it is disambiguated by filled-vs-outlined before colour is even consulted. Exact hues to be picked against a CVD simulator at build time `[ASSUMPTION — hue values deliberately not specified in this doc; the spec is the *roles*, the hex codes are an implementation task with a contrast/CVD acceptance test: WCAG ≥7:1 for text on the dark ground, all states distinguishable at 100% simulated deuteranopia and in a 50%-washout sunlight simulation]`.
- **Neutral must feel like "lap in progress", not failure** (cycle-001 position, D-007): warm tone, full-strength text, same size as everything else. Grey is reserved exclusively for "no data" states (estimated, not-yet-ridden slots, did-not-traverse).
- **Badge dot ● (all-time PB)** never replaces or recolours the tier — it sits on top of whatever tier was earned, per D-007.
- Glyphs are ASCII-simple on purpose (‖ ~ ● ⚠): they must survive tiny sizes in the history mini-strips.

---

## 6a. Earcon spec (D-019 — one buzz, three sounds)

Per Nathan's ruling: the cycle-001 1/2/3-pulse haptic scheme is **withdrawn** — counting buzzes is decoding, which this spec's own glance rule forbids. Haptics now carry exactly one bit.

**The buzz.** One short buzz, **~70 ms, identical for every state**, fired at the gate crossing **simultaneously with the first note** of the earcon (any stagger reads as two events; they must fuse into one). It means "a sector just completed — the sound tells you how" and nothing else. It also fires on estimated sectors: the gate *was* crossed.

**The three sounds.** One family on the same root (E5), so they rank-order by ear along four redundant axes — note count, pitch reach, duration, brightness. More of each = better tier. Distinguishable in a jacket pocket without ever counting; F1 broadcast-graphic energy, not slot machine.

| Tier | Notes (freq) | Envelope/timing | Total | Character |
|---|---|---|---|---|
| **Neutral** | E5 (659 Hz), single | sine, soft 12 ms attack, 150 ms decay | **~0.15 s** | a metronome tick — "lap in progress", never failure |
| **Green** | E5 → B5 (988 Hz), rising perfect fifth | triangle, 110 ms + 130 ms, 30 ms gap | **~0.27 s** | a clear step up |
| **Purple** | E5 → G#5 → B5 → E6 (1319 Hz), rising major arpeggio | triangle, 3 × ~90 ms at 100 ms spacing, final note **held 280 ms with a +8-cent detuned shimmer** | **~0.6 s** | the only earcon with sustain — unmistakably the big one, still under 1 s |
| All-time PB | + G#6 grace note (1661 Hz, 140 ms) appended | starts ~180 ms into the held E6 | +0.14 s | badge logic per D-007 (a PB is always also purple) |
| Interrupted | earned tier's earcon, unchanged | — | — | the ‖ glyph alone carries the asterisk |
| Estimated | **none — silence** | buzz fires, then nothing | 0 s | buzz-without-sound *is* "recorded, not scored" |

**The final-gate sequence (D-022, B-26).** The final gate scores sector then lap. Sequencing decisions, made here:

1. **One buzz only.** The buzz means "gate crossed" (D-019) and one gate was crossed. It fires with the sector earcon's first note, as at every gate. The lap earcon gets **no buzz** — a second buzz would be counting again.
2. **Fixed order, sector → lap, always.** Order is the primary identity channel, exactly like F1's on-screen order (sector flashes, then the lap line). Nothing to decode: the second sound is always the lap.
3. **Gap: 300 ms of silence** between the sector earcon's end and the lap earcon's first note. Long enough that the ear segments two events (not one melody), short enough that they fuse into one "final gate report". Not longer — the rider is rolling.
4. **The lap earcon is the tier earcon in the *lap voice*: same notes, same rhythm, doubled one octave down** (E4/G#4/B4 under E5/G#5/B5, lower octave at ~half gain). Same family, instantly rank-ordered by the same four axes; the added lower octave makes it read as "the same thing, but bigger" — the whole lap. Register + order distinguish sector from lap without any new vocabulary.
5. **A neutral lap is silence** (D-022: lap sound only when green/purple). Most rides: the final gate sounds like every other gate, and that is correct — working rule 6 for the ear. Estimated-content laps: never sounded (trust rule, §2a.4).
6. All-time **lap** PB: G#6 grace note appended to the lap-purple earcon, same logic as sectors.

| Lap tier | Notes | Total | After |
|---|---|---|---|
| Lap green | E5+E4 → B5+B4, rising fifth, octave-doubled | ~0.35 s | 300 ms after sector earcon ends |
| Lap purple | E5+E4 → G#5+G#4 → B5+B4 → E6+E5 held + shimmer | ~0.6 s | 300 ms after sector earcon ends |
| Lap neutral | — silence | 0 s | — |
| Lap est./no-ref | — silence | 0 s | — |

Worst case (purple sector + PB, purple lap + PB): ~0.76 s + 0.3 s + ~0.75 s ≈ **1.8 s** — exceeds the sub-1 s envelope; flagged and accepted with conditions in §2a, not absorbed.

Design rules:

- **Non-startling is a constraint, not a preference (D-006):** soft attacks, pure sine/triangle timbres, no percussion, no noise bursts. The sound must inform a rider in traffic, never spike them.
- **660–1320 Hz on purpose:** phone speakers project this band well and wind noise (low-frequency dominated) masks it least — chosen to survive both pocket and handlebar mount. `[ASSUMPTION — needs an on-bike listen at 25 km/h before build]`
- **Purple is ceremonial, not a jackpot:** the sustain and shimmer are the celebration; there is no volume jump, no extra length beyond ~0.6 s, no melody. Rarity (D-008 noise floor) is what keeps it special.
- **The estimated rule in practice:** rider feels one buzz, hears silence, glance shows the dashed grey chip (~time, delta suppressed). Silence protects trust — any sound on interpolated numbers would poison the real ones.
- **Implementation:** synthesized oscillators only (expo-audio in the app per D-016; WebAudio in the mockup) — no samples, no licensing, identical offline. Audible reference implementation: `demos/mockup.html` (demo ride + test-sounds row).

---

## Open items exported from this spec

- Sector-of-the-day metric — **moot**: sector of the day dropped by Nathan, 2026-08-15 (§3).
- Counter semantics — **RESOLVED 2026-08-15**: Nathan ruled the lap clock, F1-style (§2 rule 1); the current-sector reading is withdrawn.
- Override hold (2.5 s, §2) and tower slot-in duration (~700 ms, §3b) → tune on device.
- Tower population semantics — window, dedup, row count, gap definition, whether estimated laps can ever rank (§3b, §2a.3) → Product Owner, in progress this cycle.
- Formal decision record for the D-006 supersession (ticking counter at the visual layer, §2 reconciliation) → Principal at cycle close.
- Ideal-lap window (28d assumed) → needs a decision.
- Gate-move history invalidation semantics → Race Engineer.
- All numeric thresholds (stationary-end delay, min sector length, junction proximity) → blocked on B-17 traces.
- Hex palette + CVD/sunlight acceptance test → build time, criteria specified in §6.
- Earcon audibility over real wind at ~25 km/h (§6a frequency-band assumption) → on-bike listen before build. **Now also covers the lap voice:** the E4-band doubling (330–494 Hz) sits below the deliberately chosen 660–1320 Hz band — phone speakers project it weakly and wind masks it more. The upper octave still carries the full signal alone, so worst case the lap earcon degrades to "sounds like the sector earcon, later" — acceptable but worth the listen.
- Ceremony marker styling on the reference ride's history entry (§3a.1) → TBD, low stakes.
