# SETUP-UX — the surfaces where a rider tells the app things

**Status: PROPOSAL. Everything in this file is UNBUILT.** Owner: Designer · Cycle 011, 2026-08-17. Answers IDEAS §28 (fresh install, no seeded data) and §29 (destination entry). Binding inputs unchanged: D-006, D-008, D-011, D-030, BRAND P1–P4, LAYOUT §2/§3b/§5.
Grounded on `app/App.tsx` (six-tab bar), `RoutesScreen.tsx` (YOUR PLACES → WAYS → routes, read-only), `RecordScreen.tsx` (STARTING FROM / GOING TO pills, way derived from the pair). `product/LAYOUT.md` is deliberately **not** edited — it describes shipped surfaces; the §3.5/§5 changes proposed here are flagged, not made.

---

## 1. Where setup lives — no seventh tab

The seventh tab is only tempting if you believe "setup" is one thing. It is two things with different lifetimes, and splitting by **frequency** instead of by subject dissolves the tab pressure entirely.

| Thing the rider tells the app | Frequency | Lives on | Why not elsewhere |
|---|---|---|---|
| Landmark: create, rename, move, radius, dormant | ~monthly | **ROUTES** → place row → detail sheet | It is already listed there, read-only, in the right hierarchy |
| Way (start→end pair): create, delete | ~monthly | **ROUTES** → `+ way` | A way is just two landmarks; it belongs where landmarks are |
| Gates / sectors on a route | rare, after a bad gate | **ROUTES** → route → EDIT GATES (full-screen, map + chainage bar, LAYOUT §5) | The only dense-interaction surface in the app; must be behind two taps |
| Which route on a way is the **reference**, and which are alternatives | rare | **ROUTES** → way detail | A stopped decision about the past. Never on RECORD |
| **Destination for this ride** | twice a day, ~5 s | **RECORD**, above START | Already there as GOING TO pills. Leaving START to say where you're going is a chore |

**The argument.** ROUTES today is a noun-list you cannot touch. Making its rows tappable turns the tab that already *shows* the catalog into the tab that *edits* it — net tab count stays six, and IDEAS §26's kill-the-DEMO-tab is still available to get to five. The cost is real: ROUTES stops being safe to poke. Mitigation is structural, not a dialog — **tapping a row never edits it**, it opens a read-only detail sheet; editing is a deliberate second tap. Destructive edits are gated again (§4). RECORD keeps exactly one setup affordance: the destination field. Everything that outlives a single ride is on ROUTES — that line is the whole IA.

---

## 2. First run — cold install to first recorded ride

**Principle: the app never asks the rider to do something it can do adequately itself, and never asks for a name before it has a thing to name.** A virgin install cannot draw a route because it has never seen one. Asking the rider to place gates on a map before their first ride is asking them to configure a measurement of a road the app has no polyline for. So the first ride is the setup.

```
COLD LAUNCH (empty catalog)                 AFTER THE RIDE (arrival card)
┌─────────────────────────────┐             ┌─────────────────────────────┐
│         (Q ring + slash)    │             │  You stopped somewhere new. │
│          Qualifire          │             │                             │
│                             │             │  ┌───────────────────────┐  │
│  STARTING FROM              │             │  │ Name this place       │  │
│  ┌───────────────────────┐  │             │  └───────────────────────┘  │
│  │ Home            ✎     │  │ ← prefilled │   51.0213, 4.4795 · 40 m    │
│  └───────────────────────┘  │   editable  │                             │
│                             │             │  ┌─────────────────────────┐│
│  First ride. Nothing to     │             │  │        SAVE             ││
│  race — this one draws the  │             │  └─────────────────────────┘│
│  line.                      │             │  Skip — keep the ride only  │
│  ┌───────────────────────┐  │             └─────────────────────────────┘
│  │        START          │  │             One answer creates: landmark #2,
│  └───────────────────────┘  │             way #1, route #1, reference
└─────────────────────────────┘             traject #1, and 4 proposed gates.
```

**Cold launch → START: 1 tap.** (2 if the rider renames the start; no typing is required.) No destination is asked for: on an empty install there is nothing to pick from, and typing an address the app cannot route to is theatre. The destination is learned from where the rider stops — asked once, at arrival, stationary, with something concrete to name. The chore is not removed, it is moved to the moment where it reads as a reward. Gates are **proposed, never requested**: after the first traversal the app places four by chainage (D-016; START ~160 m in per the shipped catalog) and says so in one line on the arrival card. `[ASSUMPTION — proposal quality is the Race Engineer's; the design only requires that some defensible proposal exists so the rider is never blocked.]`

| Ride | What the rider does | What they get back |
|---|---|---|
| 1 | 1 tap START; names the destination at arrival | A way, a route, a reference line, 4 gates |
| 2 | START (destination now offered) | First comparable lap. Depth strip goes to 2 |
| 3–5 | START | Depth strip fills; tier colours arm at 5 (D-008) |

Rides 2–5 must not read as a waiting room. §5 is the mechanism that makes them read as filling something up.

---

## 3. Destination entry, before a ride

**§29's "just type where you want to go" is the *feel* — one field, zero navigation — not a geocoder.** The app is offline by design and the destination set is tiny and repeating (six landmarks today). So: one field that filters *your own places*, not a search over the world.

| Rank | Mechanism | Verdict |
|---|---|---|
| 1 | Saved landmarks, ranked (most-likely first) | Default. Covers ~100 % of real rides |
| 2 | Type-to-filter over those same landmarks | Same field. Earns its keep past ~15 places |
| 3 | Recents (last 3 from *this* start) | The empty-field state of the list |
| 4 | Map-tap | Escape hatch only, and it exits to ROUTES — visibly a detour |

Empty-field order: the way ridden from here at this time of day `[ASSUMPTION — same time-of-day heuristic LAYOUT §1 already assumes for direction]`, then recents, then all places alphabetical.

**The state between "picked" and "START" is not a map preview.** The rider knows the road. What they do not know is *what the app is about to measure*. So the pre-START card is the live screen's own sector strip, pre-filled — one object, learned once, seen again 30 seconds later at speed.

```
 GOING TO  ┌──────────────────┐     ── many rides ──────────────────────
           │ Work          ▾  │     ┌────┐┌────┐┌────┐┌────┐  ▮▮▮▮▮▮▯▯
           └──────────────────┘     │S1  ││S2  ││S3  ││S4  │  ref 15:03
                                    │3:06││3:23││4:01││3:23│
 ── 1 ride ───────────────────      └────┘└────┘└────┘└────┘
 ┌────┐┌────┐┌────┐┌────┐  ▮▯▯▯▯▯▯▯
 │S1  ││S2  ││S3  ││S4  │  one ride ── new way, no gates yet ───────────
 │3:11││3:30││4:12││3:19│  behind    Nothing to race. This ride draws
 └────┘└────┘└────┘└────┘  these     the line; you set the gates when
 Times shown, no colours —            you arrive.        [ ▮▯▯▯▯▯▯▯ ]
 one ride is not a benchmark.
```

- **START is never blocked by this card.** Ignoring it entirely and hitting the slab always records a scored ride if a route is known, an unscored one if not (the shipped RECORD copy already says this honestly).
- **Disagreement, logged not smoothed:** Nathan asks to "set the gates and segments" *before* a completely new ride. On a way with no traversal there is no polyline, and a gate is a chainage value on a polyline (D-011, LAYOUT §5) — gates placed on nothing would be a lie drawn on a map. The requirement is met one ride later, on the arrival card, on the line just recorded. That is the earliest truthful moment. If Nathan wants it earlier, the only honest version is "import a GPX first", which LAYOUT §5 step 1 already offers.

---

## 4. Gate and landmark editing — select, then nudge

**Never drag on the map.** LAYOUT §5 already puts gates as handles on a chainage bar with the map as mirror; on a phone that is still not enough — the thumb covers the handle, and one pixel of a 4 km bar is ~8 m.

- **Coarse drag on the bar to get within ~100 m, then a nudge pad.** Tap a gate → it enlarges, its map line highlights, and a glove-sized `−50 −10 │ 1 842 m │ +10 +50` pad occupies the bottom third. The chainage number is always visible and never under the thumb.
- **Landmarks: tap-to-place, then the same pad** (8-way). Radius is a slider defaulted to the measured p90 the catalog already computes, with an overlap warning against neighbouring places. Sector-length and junction warnings render exactly as LAYOUT §5 specifies — unchanged.

**What makes it dangerous (B-20).** Moving a gate silently rewrites what past rides *mean*. The shipped ROUTES copy already states the semantics — middle-gate moves keep lap history comparable; START/FINISH moves do not — so the two classes must **look different before the move, not warn after it**:

| Gate | Handle | On select | Confirm |
|---|---|---|---|
| Middle (G1–G3) | open handle | "S2/S3 split · lap history keeps · 2 sectors reset" | none — it is cheap |
| START / FINISH | locked ring; first tap does not select | requires a deliberate `unlock` tap | dialog states **the count**: "34 laps stop being comparable" · `Move anyway` / `Keep` |

The confirmation states a number, never a colour-coded scare. No red button: red is permitted as paddock livery (BRAND P3 amendment) but this role declines it here — it would be the app's first scolding, and BRAND says there is no failure state. **Proposal to Race Engineer / PO, not a design decision:** offer the non-destructive path *first*. The data model already carries multiple routes per way; a moved finish gate is arguably a new route, not an edited one. `Make this a new route instead` as the primary button preserves all 34 laps and costs nothing.

---

## 5. The honesty surface — one mechanism: the depth strip

A route with 2 rides must not look like a route with 200. One mechanism, three sizes, no special cases.

**The depth strip is the timing tower seen edge-on.** A fixed-width slot of *n* marks — filled = rides behind this benchmark, empty slots always visible. `▮▯▯▯▯▯▯▯` is one ride and seven visible gaps: **the emptiness is the message**, which is exactly why it is a fixed slot and not a count (a count reads the same length at any n).

| Size | Where | Form |
|---|---|---|
| Full | Board, LAYOUT §3b | The tower itself — 1 ride is a one-row tower; 30 rides is 8 rows + "+22" |
| Strip | Pre-START card (§3), ROUTES rows | `▮▮▮▮▯▯▯▯` beside the number |
| Glyph | History mini-strips (LAYOUT §4) | Nothing added — depth is already the strip's length |

**The single rule that makes it a mechanism rather than decoration: wherever a tier colour can appear, the depth strip appears beside it, or the colour is suppressed.** Colour is the claim; the strip is the receipt. Because tiers do not arm below 5 clean rides (D-008), the strip and the colour tell the same story from two directions. **Net simplification, not addition:** this *retires* `⚠n/5` (LAYOUT §3.5, §6 warm-up row) — same meaning, no warning glyph, everywhere instead of board-only, and without implying a young route is malfunctioning. Flagged for LAYOUT; not edited this cycle.

**What it needs from the Product Owner's staged-honesty ladder:**

1. **One scalar** per (route, benchmark) — "clean rides behind this number" — in the view model. If sector-level and lap-level counts differ, say so explicitly and the strip renders per-row; if they silently differ, the mechanism fragments and dies.
2. **The rungs are the slots.** 8 is a placeholder. Cleanest coupling: the PO names the ladder's rungs and the strip has exactly one slot per rung — the strip *is* the ladder, drawn. A 4-rung ladder gets a 4-slot strip.
3. **What the count does when a gate moves (B-20)** — the strip must be able to go down, and the PO must define whether it drops to zero or partially.

---

## Open items exported

- Gate proposal algorithm for a first traversal (§2) → Race Engineer.
- Non-destructive "new route instead of moved gate" (§4) → Race Engineer / PO, B-20.
- Depth-strip rung count and count semantics (§5) → Product Owner.
- LAYOUT §3.5 / §6 `⚠n/5` retirement and §5 phone-nudge amendment → next cycle, once this proposal is accepted.
- Time-of-day destination ranking (§3) inherits LAYOUT §1's untested assumption; both fall together if the heuristic is wrong.
