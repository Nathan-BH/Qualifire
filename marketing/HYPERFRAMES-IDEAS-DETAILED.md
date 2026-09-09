# HYPERFRAMES-IDEAS-DETAILED — what each of the six videos actually shows

Expands the six-idea slate in `HYPERFRAMES-PLAN.md` into concrete, beat-by-beat descriptions
so Nathan can picture each finished video and judge whether it's the right idea. Written as a
shot list / treatment, not a spec. All timings are approximate.

This file is Nathan's to mark up: after every idea there's a feedback block — write anything
there (keep / kill / change / questions). It is **not** `IDEAS.md` (that's a different,
Nathan-owned file).

Order below = the plan's own Section 5 order: cheapest and least-blocked first.

Shared vocabulary, so the descriptions read cleanly:

* **The Gate** — the logo animation. An ink ring draws clockwise from a tick at 12 o'clock;
then a thick yellow slash cuts across it at 45°. Ring = the lap, slash = the gate, together
they read as a Q. Yellow means "time posted".
* **Tier colours** — purple (best of your last 10 on that sector), green (above your recent
average), yellow (below average — the default, most laps). Plain ink = first ride, nothing
to compare against yet. No red, ever.
* **Timing tower** — the post-ride board: your lap ranked P1–P10 among your own last rides on
that route.
* **Race mode** — the on-bike screen: near-black at night / white by day, no chrome, only
heavy numbers and colour.

\---

## Idea 2 — "Reframed" (brand teaser, \~11–12 s) — BUILT, RENDERED

**Status:** Already built (`marketing/hyperframes/teaser/index.html`) and rendered
successfully on 2026-09-09 — first-ever render, so this is the proof that the whole
HyperFrames pipeline (Chrome → FFmpeg → .mp4) works on your PC. Only leftovers: three
non-blocking lint warnings about exit tweens. Not blocked.

**What you see, in order:**

1. **0.0–2.0 s — The Gate.** Dark screen. The ring draws itself clockwise from the top tick
(about 1.4 s). Just as it closes, the yellow slash lands across it. Beat of stillness.
2. **2.0–4.0 s — Name + tagline.** The mark shrinks / slides aside, the QUALIFIRE wordmark
settles in, and beneath it the tagline: *"Same road. New meaning."*
3. **4.0–7.0 s — Four sector slots.** The wordmark exits. Four empty rectangular slots
appear in a row. They fill left to right, one every \~350 ms, each lighting its border and
time in its tier colour: **yellow, green, yellow, purple.** The purple one lands last, so
the eye ends on the rare colour.
4. **7.0–9.5 s — Timing tower.** The slots exit. A short ranked list rises: today's row
arrives with a yellow accent bar and the line **"P2 of your last 10 rides."**
5. **9.5–11.2 s — Endcard.** Cut to a full-bleed yellow card: logo mark, wordmark, hold, cut
to black.

**What you hear:** Nothing yet — silent render. Music/SFX is a separate decision (a single
low tick when the slash lands would be enough).

**What it's for:** The 10-second "what is this" clip — app store preview, social header,
the top of the landing page. It shows the *shape* of the product (gate → sectors → tower)
without needing any real footage.

**Nathan's feedback:**

* what I like first logo animation + the name and the tagline below it (steps 1-2)

  * what I dont like is the logo shrinking aside, better to fade it out and just let the name + tagline fill its place
* what I dont like is just the 4 sectors appearing like this, too much context is missing (the animations itself is great, but we will need to work on how to introduce it properly (in the end everything will be folded in one video so should be no issue))

  * step 4 timing tower same comment as above, needs more context but animation itself is fine
* The ending name and logo I also like, but just fade it in instead of bringing it from the corner.





\---

## Idea 1 — "The Gate" (logo sting, \~4–6 s)

**Status:** Not built. Not blocked — it's the first \~2 s of Idea 2 lifted into its own folder,
plus the logo SVG copied into `marketing/assets/`. Cheapest thing on the slate.

**What you see, in order:**

1. **0.0 s — Black.** Maybe a single faint tick mark at 12 o'clock, so the eye knows where
the ring starts.
2. **0.0–1.4 s — Ring draws.** A thick ink stroke draws clockwise from the tick, smooth
ease (fast in the middle, slowing as it closes). No other element on screen.
3. **1.15–1.65 s — Slash lands.** Just before the ring finishes, the yellow slash strikes
across it at 45°, same stroke weight as the ring, about a third of the ring's diameter
long. This is the "gate" and the one proprietary visual — the whole sting exists to
deliver it.
4. **1.65–3.0 s — Hold.** Nothing moves. The mark just sits there as a Q.
5. **3.0–4.5 s — Wordmark.** QUALIFIRE settles under (or beside) the mark. Optional: the
tagline in small type beneath.
6. **4.5–5.5 s — Hold, then cut to black** (or the mark fades, mirroring the real app's
launch animation which fades at 1.65–1.9 s).

**What you hear:** Silence, or one sound only: a short click/tick exactly when the slash
lands.

**What it's for:** The bumper that goes at the start or end of every other video, and the
loop you'd use as a social avatar/animated icon. It is literally the app's real launch
animation (same timings as `launchAnimation.tsx`), so it's honest by construction.

**Nathan's feedback:** seems good, this is indeed a basic animation that should pop upp in multiple places.





\---

## Idea 3 — "Qualifire, a tour" (\~45–60 s)

**Status:** Not built. Not blocked — it runs against `marketing/index.html` as committed
(Option 2 copy and the day-mode logo fix landed 2026-09-08). No phone footage needed; the
"footage" is the website itself, cut into a sequence.

**What it is:** The landing page's scroll story turned into a video. Six sections, each
becomes one shot. Cuts or short pushes between them; the text on screen is the site's own
copy, not new marketing lines.

**What you see, in order:**

1. **0–8 s — Hero.** The Gate plays (same as Idea 1). Then, in heavy type:
*"Same road. New meaning."* Below it, smaller: *"Press start. Ride. Save. Next time,
you've got something to race — the last ten versions of you."* A yellow **Start**
button. Tiny kicker above: *"A bit better every day."*
2. **8–22 s — How it works.** Three steps, one at a time, over a simple animated route
line with a dot travelling left to right and three gate marks crossing it at 25/50/75%:

   * *"Ride your normal route."* (the dot starts moving)
   * *"Invisible gates split it into sectors."* (the three perpendicular gate marks draw
in as the dot passes them; caption: lines nudged away from stop signs and crossings,
felt only when one falls behind)
   * *"Every sector is timed against your last 10."* (caption: not a lifetime PR — a
rolling window of your last ten laps on that stretch)
3. **22–32 s — Race mode.** Screen goes near-black. Headline *"Minimal interface, maximum
clarity."* Then one huge number: **2:58.9** under the label *Sector 1 · just completed*.
The number flashes purple, settles to ink. Beneath it, four sector slots fill left to
right (\~350 ms apart) in **purple, green, yellow, yellow**. Three captions punch in and
out: *"One glance, maximum. Never a stare."* / *"Zero touch targets while moving."* /
*"A buzz at every gate — never a screen you're meant to read."*
4. **32–42 s — Colour.** Headline *"How today's ride gets its colour."* Three swatches
appear, each with its one-line meaning:

   * **Purple** — beats the best of your last ten on that sector.
   * **Green** — above your recent average.
   * **Yellow** — below your recent average. Styled as "time posted", not failure. *"This
is the app's default. Most laps are yellow. That's fine."*
Closing line: first ride = plain ink; second can go purple or yellow; from the third,
green joins.
5. **42–52 s — Timing tower.** Headline *"The timing tower."* Label *Morning · home →
work.* A ranked list: P1 greyed with a ● PB dot at 14:19.4; **P2 — TODAY** highlighted
with a yellow bar at 14:24.1; P3–P5 at 14:31.8 / 14:33.0 / 14:38.6; dimmed rows down to
P10, *"Slowest of the window."* Beneath, four sector cards: S1 purple 2:58.9, S2 green
3:24.0, S3 yellow 3:41.2, S4 yellow 4:20.0.
6. **52–60 s — Philosophy.** Black. Three lines, one at a time, centred, heavy:
*"A bit better every day."* / *"A slow lap is time posted."* / *"Your only rival is the
last ten versions of you."* Then the Gate mark and wordmark. Cut.

**What you hear:** Either silent with on-screen text carrying it, or a voiceover reading
the site copy nearly verbatim. Nothing in the copy needs rewriting for VO.

**What it's for:** The "explain the whole thing in a minute" video — the one you'd link
someone who asks what the app does. Everything shown is a design mock (the site's own
mocks), not a real ride, and it doesn't pretend otherwise.

**Nathan's feedback:** I think this will be the biggest challenge but it is absolutely needed, a short explanation showing how the whole app works. Herese my feedback for each step

1. &#x20;I think you introduce some things too early such as "Below it, smaller: *"Press start. Ride. Save. Next time,
you've got something to race — the last ten versions of you."* A yellow **Start**
button. Tiny kicker above: *"A bit better every day." ">> not needed.* Lets just have the yellow start button because it is universally understandable
2. Instead of a line, lets show a real map with a blue dot following a route (new route, so nothing to see in front, but yellow line behind it "writing history". The text could be just "ride your normal route". 

   1. Everything after step2 is not how I would do it so heres my suggestion
3. I would show at the end of the route how you can save the start and end as landmarks, and that it will automatically split it into sectors. Now next time you take that route, you have something to go for!
4. Then show an example of a "second ride" (so if you take the same route for the second time") and here we can show the gates animation  so people see how it works, and at the end the ranking message so you know how you performed.
5. Then we can say that it expands the more you take the route, more to race for. (I have the idea of a ranking tower animation with more results just popping up and filling it until 10 slots are filled)
6. then closing animation.

   1. For the other things such as how colours work and more detailed stuff such as sport choice, night and day mode, and other features we can more other videos, seems fair ? 







\---

## Idea 4 — "Why purple is rare" (\~40–60 s)

**Status:** Not built. Nothing hard blocking it. Soft-blocked only in the sense that the
plan wants the script finalised after the empty-state wording pass so the on-screen words
match the app exactly — minor.

**What it is:** A faceless explainer about one thing only: what the colours mean and why
purple is a real achievement. No screenshots, no phone. Brand-true abstract visuals: a
gate, a column of past laps, today's lap landing somewhere in that column.

**What you see, in order:**

1. **0–5 s — One gate.** Dark screen. A single gate line draws in (the same 45° slash
idea, or a plain perpendicular gate mark). Caption: *"Every sector has a gate. Gates
never change colour. Only your time through them does."*
2. **5–15 s — The column.** Ten thin horizontal bars stack up, in plain ink, labelled
like times (e.g. 2:58 … 3:41). Caption: *"Your last ten rides through this sector."*
One bar is marked with a ● — the best of the ten.
3. **15–25 s — Today lands: yellow.** A new bar slides in from the bottom and settles
*below* the middle of the pack. It turns **yellow**. Caption: *"Below your recent
average. Yellow. Time posted — not a warning, not a fail. Most laps land here."*
4. **25–35 s — Today lands: green.** Reset. The new bar slides in and settles *above* the
average line (a faint dashed line drawn across the column). It turns **green**.
Caption: *"Above your recent average. Green."*
5. **35–45 s — Today lands: purple.** Reset. The new bar climbs all the way to the top,
above the ● bar. It turns **purple**. Caption: *"Faster than every one of your last ten.
Purple."* Hold on it a beat longer than the others.
6. **45–55 s — The window moves.** The oldest bar at the bottom of the column fades out;
the column shifts. Caption: *"The window rolls. Purple isn't a lifetime record — it's
the best of your last ten. It comes back into reach."* Optional second line: first ride
is plain ink, second can go purple or yellow, green from the third.
7. **55–60 s — Close.** *"Purple is rare by design."* Gate mark, wordmark, cut.

**What you hear:** Voiceover is the natural fit here — the visuals are abstract enough
that they need a voice or captions. The script above is the caption set; VO would say the
same lines.

**What it's for:** The one clip that pre-empts "why is everything yellow?" — for the app
store page, onboarding, or a reply to that exact question.

**Nathan's feedback:** *I would need to see the render of this to have a good idea if it is good or not. so lets just make it*





\---

## Idea 7 — "P2 of your last 10" (\~20–30 s)

**Status:** Not built. **Blocked on footage:** a screen recording from a real phone of a
real post-ride tower on a route with at least two rides. A from-code HTML mockup is
technically possible but the plan discourages it (stale/dishonest footing for a "this is
what really happens" piece).

**What it is:** A single moment, shown once, slowly: the ride ends and today's lap finds
its place among your past selves.

**What you see, in order:**

1. **0–4 s — Ride ends.** Race-mode screen, one big number, then STOP. (If you're using
real footage this is the actual phone screen; otherwise a black card with the label
*Morning · home → work.*)
2. **4–6 s — The board appears.** The tower: a ranked list of past rides, P1 at top with a
● PB dot, times only, plain ink. Up to 8 rows visible.
3. **6–7 s — Today enters at the bottom.** A new row appears below the last one, faint.
4. **7–8 s — It climbs.** Over \~700 ms the row travels up to its real rank; every row it
passes steps down at the same moment to make room. It stops at **P2**.
5. **8–9 s — Arrival.** The row fades to full over \~200 ms. Yellow accent bar, **TODAY**
badge. Only the *time* is coloured by tier — position, gap-to-P1 and date stay ink. No
fanfare. Caption: *"P2 of your last 10 rides."*
6. **9–20 s — Hold and read.** Let it sit. Small captions, one at a time: *"No delta plot.
Your lap slots into a ranked list of your own last rides — exactly where it landed."* /
*"This plays once, when the ride ends. It's never replayed."* / *"Arrival happens even
for last place."*
7. **20–25 s — Close.** Gate mark, wordmark, *"Same road. New meaning."* Cut.

**What you hear:** Ideally the real phone's buzz on STOP and then silence. Optional short
VO for the captions.

**What it's for:** The "reward moment" clip — the thing that makes the app feel worth
opening after a ride. Shorter and more emotional than the tour.

**Nathan's feedback:** Probably unnecessary I would include it in idea3, which is already a full lap preview.





\---

## Idea 5 — "First ride, first route" (\~30–45 s)

**Status:** Not built. **Blocked on footage that doesn't exist yet** — nothing has been
screen-recorded on a real phone since 2026-09-04, and this one only works with real
recordings (a blank install, an actual ride, the real naming prompt).

**What it is:** The honest virgin-branch story: the app goes from nothing to something in
one ride. No fabricated history, no pre-loaded routes.

**What you see, in order:**

1. **0–4 s — Blank install.** Phone screen. Empty Routes list, empty Rides list. Caption:
*"Nothing to load in beforehand."*
2. **4–8 s — START.** The yellow START slab is pressed; it collapses into the slash
striking the ring (the Gate, in-app). Screen goes to race mode: one big number, nothing
else.
3. **8–18 s — The ride.** Time-lapse or a few cuts of the race-mode screen ticking. Numbers
change; nothing else moves. Everything stays plain ink — this is the first ride, there
is no window to compare against. Caption: *"First ride on a road: plain ink. Nothing to
race yet."*
4. **18–24 s — STOP, and the offer.** STOP pressed. The app asks to name the two endpoints.
Typing: **Home** … **Work**. Caption: *"Ride a road once, name where it goes — that
ride becomes the route."*
5. **24–32 s — The route exists.** Back to the lists: Routes now shows one entry
(*Home → Work*), Rides shows one entry. Optional map view: the ride's line with the
sector gates seeded automatically at roughly 1 / 25 / 50 / 75 / 99 % along it, nudged
away from wherever the rider stopped. Caption: *"Gates placed for you. Nudge them
later if you want."*
6. **32–40 s — The promise.** Text: *"Next time, you've got something to race — the last
ten versions of you."* Then: *"Built from your own rides, not anyone else's."*
7. **40–45 s — Close.** Gate mark, wordmark, cut.

**What you hear:** Real device audio where it exists (the buzz at STOP), otherwise silent
with captions. Short VO possible.

**What it's for:** The onboarding/first-launch video — sets the expectation that the first
ride is plain and that's the point, so nobody feels the app "didn't work" on day one.

**Nathan's feedback:** We could make it separate for working on it in isolation (if its more efficient), but eventually I think it should be into idea3 ?





\---

## Summary table

|Order|Idea|Length|Built?|Blocked on|
|-|-|-|-|-|
|1|2 — Reframed (teaser)|\~11 s|Yes, rendered 2026-09-09|Nothing (3 minor lint warnings)|
|2|1 — The Gate (sting)|\~4–6 s|No|Nothing — lift from Idea 2 + copy logo SVG|
|3|3 — The tour|\~45–60 s|No|Nothing — uses the committed site|
|4|4 — Why purple is rare|\~40–60 s|No|Nothing hard; script after empty-state wording pass|
|5|7 — P2 of your last 10|\~20–30 s|No|Real phone footage of a tower with ≥2 rides|
|6|5 — First ride, first route|\~30–45 s|No|Real phone footage of a blank install + one ride|



