# Questions for Nathan — cycle 11 (DEMO tab overhaul)

**Status: answered by Nathan 2026-09-19 (inline, under each item); folded in the same day by
the Plan tier (fable).** Brief A had already landed (`8df1119`) — items 2, 3, 5, 6 confirm it as
built (item 6: the FIRST RIDE inputs are blank and the line echoes what you type; nothing was
pre-written). Items 1, 4, 8 changed `BRIEF-demo-tenth-ride-reveal.md` (B, revised in place);
item 4 and 9 changed `BRIEF-demo-self-dots.md` (C, revised in place); item 7 became a new
brief, `BRIEF-demo-gate-adjust.md` (D). Build order A → B → C → D (D may go before C). One
finding on the way: A's commit regressed `STATE.md` (test line, a deleted sentence) — B
repairs it. The original open questions below are kept as written, with your answers.

## Ruled and built — answer only if you disagree with the default

1. **TENTH RIDE's climb is clipped (the cycle11 Inspect note, now visible).** The tower shows
   at most 8 rows (`tower.tsx` `MAX_VISIBLE = 8`). With 10 rows and today landing P3, rows 9
   and 10 are cut off below; today starts from the 8th visible slot and visibly passes 5 rows,
   while the climb duration (2.0 s) is scaled for the 7 it really passes. Left exactly as the
   real app does it so you can see it. Keep as is / show all 10 rows (taller board) / scale
   the duration to the rows you can see / something else?

   **Answer:** I would show all 10 rows if possible like I have it in the render. And the "today" ride, should displace the 10 so it gets kicked off the ranking so we always stay with 10 rides. Does that answer your question ? If 10 rides cannot fit, you can always make the window scrollable so you can see all 10 rides.

2. **Where today lands.** TENTH RIDE: P3 of 10, green, +6 s, climbs 7 rows. SECOND RIDE: P1
   of 2, purple, climbs 1 row. Chosen so TENTH shows rows stepping down *and* rows that stay
   put. Want a different landing to test (P1 of 10 for the max payoff, P8 for a short climb,
   a yellow one)? It is one column in `DEMO_HISTORY`.

   **Answer:** Lets just have one P3, good enough for a visual confirmation. 

3. **SECOND RIDE is now an honest ride 2.** It used to judge the scripted lap against six
   laps (purple/green/yellow at once). A real second ride has one prior lap and can only say
   purple or yellow, so SECOND RIDE now shows purple/yellow sectors and a two-row board; the
   three-colour showcase moved to TENTH RIDE, which is the default pill. OK, or do you want
   SECOND RIDE to keep the old six-lap colouring (one number in `DEMO_PRIOR_LAPS`)?

   **Answer:** No this is correct, second ride can only be purple/yellow, while the TENTH ride has room for green as well.

4. **Map sector colours in the demo follow SETTINGS.** The demo map now obeys the same
   `sectorColours` toggle as the real screen (default OFF since cycle9 — the strip still
   shows the colours). Previously the demo always coloured the map spans. Keep it honest, or
   force the map colours on in the demo (one ternary in `DemoScreen.tsx`)?

   **Answer:** Keep the colours just in the strips. remove it from the map; but have the demo switch together with the real app settings, if the toggle changes, the demo should update accordingly; same for the "selfs" racing, the settings toggle changes should be reflected in the demo so I can test it works properly fast.

5. **Auto-STOP timing.** After the finish line the demo clock runs another 60 simulated
   seconds (~2.4 real seconds at 25×, so the slower self dots reach the line and you can read
   the neutral lap chip), then auto-STOPs into the reveal. You can also press STOP yourself
   any time after the line. Too short / too long / should it wait for your STOP only?
   (`DEMO_ROLL_OUT_S` in `demoModel.ts`.)

   **Answer:** No auto stop is fine

6. **The fake-save confirmation line** after FIRST RIDE's SAVE reads
   `Home → Work created · demo only, nothing saved` (your two names), holds ~1.8 s, then the
   reverse launch mark plays and you are back on the chooser. Wording and timing fine?

   **Answer:** Dont already write home>>work, let me fill it in, but just dont save it after I save it.

## Not built — genuine follow-ups, say if you want them

7. **FIRST RIDE's card is the both-endpoints-unknown case** (two name inputs, the true
   cold-start). The real save then continues into the **gate-adjust card** (nudge the four
   gates on the map). The demo stops at the confirmation line because the gate card needs a
   real reference line. Want a demo of the gate-adjust card too (a separate brief — it needs a
   fake `RefLine` from the demo fixture)? And do you want the other card variants reachable
   in the demo (start known / end known / loop / "new route on this way")?

   **Answer:** add the gate adjust to the demo as well, but same as the fake confirmation line. let me tweak it, but dont save It again.

8. **After the reveal in SECOND/TENTH RIDE the demo shows a DONE bar** where the real app
   would show the naming card ("new route on this way", WP-G) beneath the board. Fine for
   the demo, or should the demo show that card there too (for show, like FIRST RIDE's)?

   **Answer:**yes add everything for show to get the real experience

9. **Self dots redraw at the demo's 30 fps** (the real screen ticks them at 4 Hz because the
   real rider only moves per GPS fix). If nine dots make the demo stutter on the phone, say so
   — quantising them to 250 ms is a one-line change.

   **Answer:** I will have to check on phone first, lets keep this as an open item

## Ruled while folding in — say only if you disagree

10. **Item 4, how it was read.** "Keep the colours just in the strips. remove it from the map;
    but have the demo switch together with the real app settings" — read as: the *default*
    (toggle OFF → strip coloured, map plain) is right, and the demo must follow the SETTINGS
    toggle, live. So the demo map colours its spans **only when you switch sector colours ON
    in SETTINGS**, exactly like the real screen, and reads the toggle on every render (B R7,
    C R4). If you meant "never colour the demo map, whatever the toggle", it is one line
    (`ALL_YELLOW` unconditionally in `DemoScreen.tsx`).

11. **Item 8, which card.** A real second/tenth ride that follows the known way exactly gets
    **no card** after the reveal (the reverse mark plays straight after the hold). The card
    you said yes to is WP-G's "New way on Home → Work" — what the real screen shows when the
    ride *scored* against the way but did not follow any of its known ways. That is the one
    with something to fill in, so the demo shows it after every SECOND / TENTH reveal. The
    route name on it ("Home → Work") is fixed text because the route exists — not the
    pre-fill you objected to in item 6 (FIRST RIDE's inputs stay blank). If you would rather
    see the common no-card path, it is one flag.

12. **Item 1's real-screen consequence.** You chose "show all 10 rows"; that is now the real
    app's board too (`TOWER_MAX_VISIBLE = WINDOW_N`), not a demo-only cap — a demo board with
    ten rows over a real board with eight would have been the dishonesty we refused for map
    colours. On a very short screen the ending column scrolls (it already did).

13. **Item 7's second question** ("do you want the other card variants reachable in the demo
    — start known / end known / loop?") went unanswered. Not built; FIRST RIDE stays the
    both-endpoints-unknown case. Say if you want them.
