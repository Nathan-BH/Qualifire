# Cycle 025 — questions that need your answer

**Processed 2026-08-26** — resolved answers baked into the cycle-025 WP files; unresolved/re-ask items moved to `QUESTIONS-FOR-NATHAN2.md`.

**Short answer to "do we have an actionable plan or is my input still needed": both.** Six of the
fifteen briefs in this folder are ready to execute as-is — nothing below blocks them. The rest
are either fully blocked (can't start until you rule) or partially blocked (some part can start,
the rest waits). This file collects every open question across all fifteen briefs in one place so
you can answer them here directly — type your answer into the **Answer:** line under each
question, save the file, and whoever picks up cycle 025 reads your answers straight from it.

Nothing in this file is a decision yet — these become `product/DECISIONS.md` entries and
`product/BACKLOG.md` items only once a real cycle runs and the Team Principal/Product Owner
process them. This is just the collection point.

---

## Ready to execute now — no answer needed

- **`WP-gps-dead-spot-fixture.md`** — closed by you already (E40 underpass). Nothing to build.
- **`WP-cycle-token-usage-rule.md`** — a two-line process-doc edit implementing your own ask.
- **`WP-stale-first-fix-cleanup.md`** — P1–P4 can be executed as written. (One sub-choice inside
  P1 — drop vs. flag pre-START GPS points — is small enough that the Team Principal can decide
  it without you; see the optional question at the very end of this file if you'd rather rule on
  it yourself.)
- **`WP-palette-draft-pass.md`** — ready to brief as-is; the only open item (which draft, if any,
  becomes a real in-app theme) is a later decision after you've seen the drafts.
- **`WP-routing-fork-plain-language.md`** — producing the plain-language write-up needs nothing
  from you. (The actual §29 navigation-fork decision comes *after* you've read it — see the last
  section of this file.)
- **`WP-sector-coloured-trail.md`** P1 (the Result/VIEW TRACE version) — additive by
  construction, ready now. P2 (the live map) has one open question below, but doesn't block P1.

---

## Questions — answer inline, one per block

### `WP-relaunch-crash-recovery-investigation.md` (2026-08-22 crash)

**Q1.** Ratify the relaunch definition: "relaunch = a fresh app launch that restores an
in-progress ride from disk." A UI-only remount where the app process never actually died would
NOT count as a relaunch under this definition. Agree?

**Answer:** I have not had issues with middle-in-the-ride crashes so maybe it was a one off ? dont think it needs immediate action unless I get this again. I could try to redo a home>>station route, if the crash reproduces it means it is something intrinsi

**Q2.** Only you have the phone. Can you pull `rides/20260822-114947-e4f5.events.jsonl` off it
(via adb, a backup, or a debug share) and check whether there's a second `lock` line around
09:57–09:59 that morning? Its presence proves the crash was a full app restart; its absence
means the app process actually survived and only the screen died.

**Answer:** Dont think I have access to any .json file, the only thing I have is the gpx export which you already have.

**Q3.** Should the crash-evidence-capture runbook (P6 — grabbing logcat/exit-reason data after
any future crash) be set up now, or only if a second unexplained crash happens?

**Answer:** Lets wait for another crash and maybe we will have more info from the gpx+ data.

---

### `WP-result-ranking-integrity.md` (RESULT tab "P10 of 11" vs "P9 of 10")

**Q4.** Should the RESULT list show your true rank among ALL your rides for that route (so
numbers can skip when a ride outside the visible last-10 window is faster), or should it drop
the "P" language entirely and just show "your position among the last 10 shown"?

**Answer:**  1) on this subject I actually want to implement a small update, and compare the rides to the previous 9 rides, so you current gets a position out of 10 instead of out of 11 (which is cleaner) 2)Not sure what you mean here. But the correct behavior is to only look at the last 9 rides and then place the current ride within them. If there is any faster ride but which is older it does not count. The idea is to use only the 9 most recent rides, not to get a global ranking. Hope this helps

**Q5.** Two-minute check: in the app right now, can you scroll or export the Morning route's ride
history past 10 entries? We're trying to confirm whether an 11th ride (before 2026-08-10, holding
a 13:36.6 personal best) genuinely exists on file.

**Answer:** 1) I dont have an option yet to export a full history of a certain route 2) on my current apps (both qualifier and qualifier preview; I have no rides that are that old, the oldest one is 16 August. Previous rides are certainly from the initial strava export ("C:\Users\natha\Claude personal projects\Qualifire\data\activities"; all the files not in the "C:\Users\natha\Claude personal projects\Qualifire\data\activities\TEST in app rides"folder)

---

### `WP-pause-screen-and-discard-ride.md` (broken pause layout, missing discard, mystery yellow line)

**Q6.** Is there a roughly 17-second "stub" ride sitting in your RIDES tab, timestamped around
15:37 on 2026-08-25? (Only checkable today if there's already some way to see very short rides in
that list.)

**Answer:** Very well could be, but i usually delete them. Sometimes i fire the app to show someone but dont actually ride and delete it. Is this behaviour problematic ? In any case, it should not be, every new ride should start fresh so the measurements are not confounded!

**Q7.** Where were you at 15:37 on 2026-08-25, and is there a catalogued route running just
south-east of that spot? (Trying to explain a yellow line on the pause-screen map that doesn't
pass through your actual position.)

**Answer:** I uploaded all of my rides to the folder so based on it I should not have been involved in any ride at that specific timepoint. So i dont know.

**Q8.** The pause menu currently says "ends & saves" next to the END button — the only warning
that ending is destructive-ish. Once a proper discard option exists, should that phrase stay
(just relocated/shrunk), or is it safe to remove?

**Answer:** Remove it. Just END is enough.

**Q9.** When you deliberately discard a ride (once that option exists), should its raw GPS
recording be deleted outright, or just hidden from the app while staying on disk?

**Answer:** Probably be really deleted because I only delete rides that I genuily did not do or should not count. If we really want we can think about having a trash folder which keeps rides for a week before deleting them for good ?

---

### `WP-maplibre-frozen-id-crash.md` (crash when riding to a newly created destination)

**Q11.** What's the name of the landmark at coordinates
[50.870719, 4.691999](https://maps.google.com/?q=50.870719,4.691999), and was it created
between your first and second ride on 2026-08-24? (Needed to reliably reproduce the crash for
testing the fix.)

**Answer:** This landmark is the Carrefour. It is actually not part of my current landmarks so that's why is set my ride as "new". I know however from my strava export that claude identified this spot as a frequent spot when I lived next to it, but it is outdated for at least a year now.

---

### `WP-live-ghost-position.md` (live position vs. your ghosts)

**Q12.** Confirm the staging: build the live position chip (updates at each gate crossing, toggle
default OFF) now, and leave the moving ghost-dots-on-the-map version for later, after the battery
work (B-47) and ideally the raw-time scoring work (B-59) land. Any objection to that order?

**Answer:** I would like to see it implemented already so we can debug it as soon as possible. I dont report any battery issues so lets just do it.

**Q13.** Toggle default for the position chip — off by default (our recommendation, so the race
screen doesn't change unless you opt in), or would you rather it default on?

**Answer:** Lets have it default on. But its a trivial change to make later. Maybe at one point I will do a cycle to define each toggle default position.

---

### `WP-sector-coloured-trail.md` (paint the route line by sector colour)

**Q14.** Once the sector-coloured trail is running on the live map (a later step — not the
Result-screen version, which needs no ruling): should it sit alongside the existing gate tick
marks, replace them, or do you want to just look at both on your phone and pick? (No need to
answer this now — it's fine to decide after seeing it on-device.)

**Answer (optional, can skip until you've seen it):** Not sure what you mean, but I think the gates should not change colours like they do now because it does not make sense, they are gates. Just the sector segments changing colour is enough.

---

### `WP-route-naming-migration.md` + `WP-comparable-variants.md` (route naming — blocks the most downstream work)

**Q15.** The A/B naming semantics for the four legacy routes. Does "A" mean "the original/
preferred one" — so `MorningB` (your rain/asphalt alternative) becomes `HomeWorkB`? Or would you
rather use a wet/dry-style name instead, like `HomeWork` / `HomeWorkWet`, matching the pattern
`StationHomeWet` already uses?

**Answer:** Yes better to use descriptive names like wet and dry. This also streamlines the current "RECORD" tab. So if I want to choose an h>>w-d route. I should pick on the record tab: home-work-dry as the three options before pressing record.

**Q16.** How far does this naming standard reach? Should `StationWorkAlt`/`StationWorkStd` and
`StationHomePreferred`/`StationHomeWet` also get folded into the same A/B scheme, or is a
descriptive suffix (like "Wet") fine for variants that aren't simple A/B pairs?
 
**Answer:**  For station>>home follow the wet dry convention (so preferred becomes dry). For station work, there is no wet or dry option really so the Std and Alt options are fine. And default should be Std if you select the first two options Leuven station-work already on the RECORD tab. Note: in the end these naming should be flexible and editable in the app directly (see the virgin build), so lets already think how to link the place were you can build and manage rides, to what the RECORD screen shows. 

**Q17.** The "way" naming collision. In notes4 you proposed a new, finer level below "route" —
small line variations that still share all 5 gates — and called it a "way". But the app's schema
already has a **Way** that means something different (an ordered landmark pair, e.g. home→work),
and that word is used everywhere (the catalog, the Routes tab, analysis docs). Do you want to
rename the existing "Way" concept to something else, or pick a different word for your new
finer-grained level — "variant", "line", "trace", or your own suggestion?

**Answer:** lets pick a different name then, go with "trace" for now. Makes me think of trace elements, which emphasizes that it is a small (change)

**Q18.** Small check that feeds into Q16: do `h>>w-w` and `h>>w-d` mean wet and dry, matching how
`StationHomeWet` is named?

**Answer:** Yes. h>>w-w is HomeWorkWet. I actually dont think "h>>w-w" naming convention is anywhere in the app, I just use it to type faster when communicating with claude. But I really like the "HomeWorkWet" type of annotation which is visually more clearer and actually contains all the info that you want to input in the RECORD tab.

---

### `WP-virgin-cold-start-epic.md` (blank-app / "let other people use this" flow)

**Q19.** Is "other people should be able to use this app from a blank install" now an actual goal
for the project (not just something to keep in mind while designing), or is it still just a
nice-to-have you might explore later? This decides how high a big, multi-part epic gets
prioritized against everything else in this folder.

**Answer:** This is an actual goal that is a top priority. First I want of course to test the virgin build myself but for that we should build It ASAP. I actually also have some questions about how "expo dev" works. And do I actually need to make a build if I want to update my "qualifire preview" standalone app, or can I just update it with the latest elements in a quicker way by scanning a QRcode? Same will be for the virgin app, do I have to make a build if I want to update my standalone app or is a build only required when addition new functionalites (such as an actual OpenMap) ?

**Q20.** Should the "ride 1 of 5 / ride 2 of 5…" countdown ladder (making a blank app feel like
it's loading rather than broken) ship as part of this same epic, or later as its own thing?

**Answer:** I have no idea what this countdown ladder idea is. Explain it further.

**Q21.** Confirm the reading of your own spec: "start and end within 1% of the ride" means the
start gate sits at about 1% of the route's distance and the end gate at about 99% — a little
inside the true endpoints, so standing still with GPS jitter doesn't start the clock. Is that
what you meant?

**Answer:** Yes exactly lets for now take exactly 1% and 99% as defaults.

**Q22.** For auto-placing gates on a newly recorded route: fixed 25/50/75% split (four sectors,
like your commute routes), or scale the number of sectors with the route's length (so a very
short or very long route someone else records doesn't get badly-sized sectors)?

**Answer:** I actually thought about it and I think we should keep only 4 sectors total and not scale. As it would break the whole app and drift away from my original idea (in F1 sectors time are different based on tracks, but you always have 4 sectors)

---

### `WP-whole-app-export-import.md` (backup/restore the whole app as one file)

**Q23.** What should a "whole app" export include — your raw ride recordings too (bigger file,
true full backup), just the catalog + ride results (smaller, faster), or a checkbox each time you
export so you choose ("include raw recordings: yes/no")? (This last option is the fallback
recommendation.)

**Answer:** Sure lets give the people the option to include raw recordings yes/no. Also give me an estimation of how big a whole app export file would be to see if it is feasible.

**Q24.** Confirm: importing a whole-app file overwrites your current data (not merges it), with a
clear "this will replace X, Y, Z" confirmation before it happens, and an automatic backup of your
current data taken right before the import runs, so a mistaken restore can be undone?

**Answer:** Yes agree to have an explicit confirmation. And I like the backup, but where would this backup live ? and if you export the app again, do you keep exporting the backups or just one time ?

---

## Optional — not blocking anything, answer only if you want to weigh in

**Q10.** For GPS points recorded just before you press START (the source of the stale-fix bug
across every ride day so far): would you rather the app simply not record those points at all,
or record them but mark/flag them so they're excluded from stats without disappearing from the
raw file? (Either is fine technically — this is your call on how strictly "raw data is never
touched" should apply here.) 

**Answer:** Lets keep them for now as the app is still in development. If later we find that it is not relevant we can remove the tracking before START.

---

## Not yet answerable — bigger decisions still waiting on other steps

- **The §29 navigation/routing fork** (`WP-routing-fork-plain-language.md`) — this is the single
  biggest open decision on the project ("should Qualifire ever let you navigate somewhere new,
  and how does that square with only racing known, ratified routes?"). We haven't written you
  the plain-language presentation yet — that's what this WP produces. Once it exists, that's the
  document to read before ruling on the fork itself; no need to decide anything here yet.
- **Which palette drafts (if any) become a real in-app theme option** (`WP-palette-draft-pass.md`)
  — decide after you've actually seen the pink/light-blue/green mockups, not before.
