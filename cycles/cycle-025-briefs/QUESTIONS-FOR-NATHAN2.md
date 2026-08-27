# Cycle 025 — questions that need your answer (round 2)

**Processed 2026-08-26 (round 2)** — all 6 answers resolved and baked into the cycle-025 WP files. No further re-ask needed this round.

**Follow-up to `QUESTIONS-FOR-NATHAN.md` (dated 2026-08-26).** Your answers there got baked into
the cycle-025 WP files — thank you. A handful of items came back needing a sharper re-ask (you
answered a different question than the one asked, or asked us to explain further before you
could answer), and two items are genuinely new (a naming collision your own answer created, and
a residual half of a naming pair you never got to). Those six live here. Same format as before:
type your answer into the **Answer:** line under each question and save the file.

---

## Questions — answer inline, one per block

### `WP-relaunch-crash-recovery-investigation.md` (relaunch definition)

**O1.** Your first-round answer addressed whether the 2026-08-22 crash needs action, not the
definition question itself — so this is still open and blocking P5. Yes/no only: if the app's
screen reloads but the app process never died, should the "Recovered after relaunch" banner and
the relaunch counter both stay silent? (This is just a definition for counting — nothing to do
with whether the crash recurs.)

**Answer:** If I understand correctly, I would say the revored after launch banner should not be silent and should be visible so we know something happened and the recording might be corrupted.

---

### `WP-pause-screen-and-discard-ride.md` (stub-ride delete contradiction)

**O2.** You said you "usually delete" demo/stub rides — but this brief's whole P2 is built on the
premise that no delete option exists yet in the app. One of those has to be wrong, and the
executor needs to know which before touching P2. When you say you delete demo rides — where
exactly do you do that in the app? Is there already a delete button somewhere in the RIDES tab?

**Answer:** Yes the RIDES tab has a delete button next to the "Export GPX+" button

*(No action needed on the rest of your Q6 answer — your question "is this behaviour problematic?"
is already answered: no, provided every new ride starts a fresh session, which is exactly the
requirement your answer stated and exactly what this WP's fresh-start work guarantees.)*

**O3.** *(Closed, no answer needed — included for the record.)* Q7 asked where you were at 15:37
on 2026-08-25 to help identify the mystery yellow polyline on the pause screen. You weren't on
any logged ride at that time and don't know — so the investigation proceeds from code alone,
exactly as the brief's P3 already lays out. Nothing further needed from you here.

---

### `WP-route-naming-migration.md` / `WP-comparable-variants.md` ("trace" naming collision)

**O4.** Your Q17 answer picked "trace" for the new fine-grained catalog level below Route. One
catch that answer exposed and the original question didn't flag: the app already uses that word
for a ride's recorded GPS line (the VIEW TRACE button, and each variant's "reference trace" in
`WP-comparable-variants.md`). Keep "trace" anyway and rename VIEW TRACE (to e.g. VIEW RIDE), or
pick "line" or "variant" for the new catalog level instead?

**Answer:** This is actually not a priority feature to implement. So lets just keep it as a future addition but not implement it just yet. I think we have already plenty customization to start with by having multiple routes for a same ride.

---

### `WP-virgin-cold-start-epic.md` (countdown ladder / B-35)

**O5.** Your Q20 asked us to explain the countdown ladder before you could answer — here's the
explanation: new routes stay colour-silent until 5 clean rides exist (your own MIN_HISTORY rule),
so a blank app looks broken for its first week. The "ladder" is just a progress label — "ride 2
of 5: 3 more before colours unlock." Ship it inside the virgin cold-start epic, or as a later
add-on?

**Answer:** I dont remember ever agreeing on a min history rule so lets delete that rule. There is no need for 5 clean rides, from the moment you have one route you can compare the sectors and log them as either purple/yellow. If you have 2routes you can have it as purple/green/yellow using the average of the current2 routes. And also if for some reason you have already a route but no recorded rides, your first ride should log all purple sectors (instead of yellow ones now) because it makes more sense +that's how it is in F1; if youre the first one, you will have all purple sectors.

---

### `WP-route-naming-migration.md` (Evening route pair identity)

**O6.** You named the Morning pair — `HomeWorkDry` / `HomeWorkWet` — in your Q15 answer, but the
Evening pair (work→home) never got the same confirmation. Last two route names: is `EveningB`
your rain/wet work→home variant (so `EveningA`→`WorkHomeDry`, `EveningB`→`WorkHomeWet`), or is
that pair split by something other than weather?

**Answer:** The evening split should get the same rename for consistency as the underlaying dry/wet derivation is the same.

---

## Also owed to you (informational, no decision needed)

These aren't decisions — they're plain answers we owe you from questions you asked back in your
first-round answers. They'll come to you in the finished specs; listed here so nothing gets lost:

- **How "expo dev" works, and OTA vs. full rebuild** (from your Q19 answer) — whether updating
  your standalone "qualifire preview" app (and later the virgin app) needs a full build each time,
  or a QR-code/OTA update suffices, with a build only required when new native capability (e.g. an
  actual map component) is added.
- **Where the pre-import backup file lives, and whether it accumulates** (from your Q24 answer) —
  the planner's proposal: one fixed slot in the app's document directory, surfaced in settings, as
  a single rolling backup overwritten on each import (your own exports are separate files and
  never touched by this).
- **Size estimate for a full whole-app export with raw recordings included** (from your Q23
  answer) — to be computed from the current on-phone stores: catalog + results + free-ride cache
  + settings, plus the raw rides directory.
