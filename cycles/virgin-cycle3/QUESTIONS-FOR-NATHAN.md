# virgin-cycle3 — questions that need your answer

Same convention as `virgin-cycle1`/`virgin-cycle2`'s `QUESTIONS-FOR-NATHAN.md`: type your
answer into the **Answer:** line under each question, save the file, and whoever picks up
this cycle next reads your answer straight from it.

## Open questions

### From WP-1 (multi-sport support) — none of these block Phase A; Q1 and Q3 should be answered before Phase B/C are dispatched

**Q1 — Default sport list.** The brief seeds three sports on a fresh install: **Bike, Run,
Walk** (active = Bike). Your own examples were bike / e-bike / run / walk / fast-walk. Keep the
three and let riders add the rest themselves via SETTINGS → SPORTS, or seed all five?
Answer: Lets not seed anything and let people decide. But we can write suggestions in the fill in bar to guide them.

**Q2 — E-bike vs bike.** Under this design two sports are fully separate universes: separate
ways, routes, gates, ghosts, PBs. If you would rather e-bike rides *compare against* bike routes
(same routes, separate ranking, or shared ranking), that is a different feature ("shared routes
across sports") and is deliberately NOT in WP-1. Confirm "fully separate" is what you want for
now?
Answer: No sharing between sports all separate

**Q3 — One-sport riders.** With exactly one sport defined, the RECORD sport pill row is a single
selected pill. Show it anyway (so the affordance is discoverable), or hide the row until a second
sport exists?
Answer: Hide the row until a second sport exists. And maybe add a toggle in settings to show/hide the sports pill, so people that do not switch often between sports are not bothered by it and just do it in the settings once in a while.

**Q4 — First-launch naming.** You said people can "name sports themselves upon downloading the
app for the first time". WP-1 seeds defaults silently and puts add/rename/delete in SETTINGS →
SPORTS — there is no first-launch onboarding step anywhere in the app today (the empty-state pass,
OPEN-ITEMS item 4, is unbuilt). Is SETTINGS enough for now, or do you want a first-launch
"your sports" card as a follow-up WP?
Answer: I think we can just have it in the settings, and force people to have at least one sport defined. So if the app is launched and you press record without any sports configured, it will give you a message to first setup a sport.

**Q5 — Badge wording on ROUTES / RIDES.** The brief proposes a dim header line naming the active
sport, e.g. `RUN · switch on RECORD or in SETTINGS`. Fine, or just the sport name?
Answer: Lets just add the the sport header, but dont add the "switch on record or in settings" text

### From WP-2 (RESULTS tab) — none block Phase A; Q1 and Q2 should be answered before Phase B is dispatched

**Q1 — All-time ranked board vs. the STATE.md window rule.** You asked for a "ranking tower
with all the rides". `STATE.md:99-100` says "never a global ranking, never 'of 11'". The brief
decides that rule is about *scoring* (tier colours, the ride detail's "P3 of 10") and not about a
history view: the RESULTS board lists ALL rides fastest-first with all-time positions 1..N, shows
**no tier colours** (only the purple all-time PB ●), and is captioned `ALL 27 RIDES · fastest
first` so it can't be confused with the scoring pool. The ride detail's rank line and all scoring
stay on the 9+1 window. `STATE.md` gets a one-clause amendment scoping the rule accordingly
(WP-2 §3.2). Veto if you'd rather the board also stopped at the last 10.
Answer: Not clear for me now, lets build it and refine later

**Q2 — Plot above board.** You listed map → tower → scatterplot. The brief puts the
scatterplot ABOVE the ranked board: the board grows without bound (27+ rows), the plot is a
fixed 220 px, and the plot is the thing you came for — so it should be on the first screen.
Fine, or keep your order?
Answer: agree lets put the plot first and tower second, and maybe remove the map as it is already in routes

**Q3 — Two decided defaults you may flip.** (a) Y axis: time increases upward, so the PB is the
*lowest* dot — Strava's orientation (its help doc: "the y-axis represents an effort's time",
PR as a gold dot). (b) The dotted line is the **mean** of ranked rides (what the tier model
already judges against), not the median; a ride you "Ignore in ranking" leaves the mean, which is
the existing remedy for a puncture day. Outliers never disappear: slow ones beyond the Tukey
fence are pinned to the top edge as ▲ markers instead of squashing the axis (§3.3). Say so if you
want faster-up or median instead.
Answer: lets have faster up so it makes intuitively more sense. And for now lets keep it at just the last 9 rides for the scatterplot instead of all rides, this way it mirrors the ranking tower. Fastest is a purple dot. rest of the dots are either green/yellow for if they are above or below the average. So the tower shows absolute ranking (one visualization) and the scatterplot shows it in time so that you can see how long ago the purple lap was for example and you know it will disappear in X rides.

### From WP-3 (way/route inversion) — none block writing the brief; Q3 decides WHEN it runs, Q1 changes one small step

**Q1 — Id prefixes for NEW things.** After the swap, a newly created *way* (variant) is minted
`way:<rideId>` and a newly created *route* (from→to path) `route:<rideId>` — correct under the new
words. Everything already on your phone keeps its old prefix forever (a pre-WP-3 way is `route:…`,
a pre-WP-3 route is `way:…`): those ids are referenced from your append-only ride recordings and
results, and D-023 forbids rewriting them. The code handles both prefixes. Fine — or would you
rather freeze the OLD prefixes for new ids too, so your catalog stays internally consistent at the
cost of every future install reading backwards (WP-3 §3.3 option a)?
Answer: no need to update the recorded data as well as I will probably try to reset the app to get a virgin build again.That data will then be all correct again with the updated naming.

**Q2 — Tab name.** The browse tab stays **ROUTES**. Its sections read YOUR PLACES / ROUTES (each
route row `from → to · N way(s)`); a route's detail lists its WAYS; a place's detail lists
ROUTES TO HERE. OK?
Answer: OK

**Q3 — When WP-3 runs.** The brief runs WP-3 LAST, after every phase of WP-1 and WP-2 has landed:
their briefs were written in today's words and execute as written, and WP-3's scripted identifier
swap then covers their code for free. Until then the app keeps saying "way" for the from→to path
and the coordinator translates in chat. Alternative: run WP-3 first, at the cost of re-issuing both
earlier briefs (a Plan pass each) before they can execute. Last, or first?
Answer: run WP-3 first!

**Q4 — GPX+ export.** The `<qf:pick>` element's `routeId=` / `routeIds=` attributes become
`wayId=` / `wayIds=` and the `qf` namespace moves from `…/gpx/1` to `…/gpx/2`. Do you have any
script or tool of your own that reads GPX+ files and keys on those attribute names? If yes, we emit
both old and new names for one cycle.
Answer: I dont have my own tool for reading gpx+ files. If we think this is an issue you can consider making a new branch, and calling the old branch something like "legacy-virgin". This way we still know how the previous naming was done but we can move forward with the new one.

**Q5 — RECORD copy.** The pill row for picking the variant becomes **WHICH WAY TODAY?** (today
WHICH ROUTE TODAY?). Good, or another wording?
Answer: good.
