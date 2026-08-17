# Triage — IDEAS §18–27 (Nathan's 2026-08-16 batch)

**Product Owner pass, 2026-08-16. This is a proposal, not a ruling.** Nothing here edits BACKLOG.md, DECISIONS.md or STATE.md — adoption happens at cycle-008 kickoff, and the two items that touch settled decisions need the Principal (and in one case Nathan) before any code moves.

Purpose: STATE open-work item 5 says the batch is "too big for one cycle." It is. This pass sorts the ten ideas by what *gates* them, not by how appealing they are, and proposes a cycle-008 agenda of three.

---

## 0. Housekeeping first

**IDEAS.md has two sections numbered 18** — the HyperFrames marketing note and red-light handling. Renumber the marketing note to **§18a** (it is the earlier of the two and the least load-bearing) and leave red-light handling as §18. Referenced below as §18a / §18.

---

## 1. The finding that reorders everything

> **Correction, same day (Backend Dev, `product/DATA-MODEL.md` §1).** This section's central claim — that §19 blocks the store — is **wrong**, and D-023 is why: storage caches no benchmark seconds, so the store is a *derived results cache* of ordered lap/sector times, and all three colour models (D-007/D-008, §19, the hybrid) are read-time functions over the identical history. The schema therefore does not wait on the ruling. What §19 genuinely decides is one pure tier function plus whether D-028's tower window follows N. The paragraphs below are kept as written, with that correction applying throughout; the cycle-008 agenda in §3 is unchanged in content but items 1 and 2 are no longer ordered — they can run in parallel.

Three ideas in this batch are not independent features. **§19 (last-N average colour), §21 (window size N), and the benchmark/ride-history store already sitting at STATE open-work #2 are one decision wearing three hats.**

The store's schema is defined by what the colour model needs to retain. Under D-007/D-008 it must keep rolling 7-day and 28-day bests per sector per track. Under §19 it must keep the last N *rides* per way, in order, with the mean recomputed on write. Those are different retention rules, different invalidation rules on a gate move (B-20), and different answers to "what happens with 4 rides on a new way."

So: **§19 must be adjudicated before the store is built, or the store gets built twice.** That single ordering constraint is the main output of this triage.

Second-order: D-028 defined the tower against a 28-day window. If §19 wins, the tower and the colour system should share one comparison set (Nathan says as much in §19) — meaning D-028's window follows §19's N, and the tower is re-derived rather than rebuilt.

---

## 2. Buckets

### A — Decide before building (blocks the store)

| § | Item | Owner | Why it is first |
|---|---|---|---|
| 19 | Colour logic: last-N average (green above / yellow below / purple best-of-N) replacing 7d-best / 28d-best / neutral | Race Engineer measures, PO frames, **Principal rules** | Conflicts D-007, D-008; touches D-028's window. Defines the store schema. |
| 21 | Window size N (10? 20?) and small-set behaviour (<10 rides → still compare to mean) | Race Engineer + PO, inside the §19 ruling | Same schema. Nathan's stated reasoning — a rolling window lets a freak time expire — is itself an argument *for* §19 and should be tested, not assumed. |

The §19 case is decidable **offline, today, on the 624-ride archive** — no commute, no store, no device. Replay both models over the real per-sector times and report: how often each colour fires, what the noise floor does to "yellow", how many rides sit within GPS noise of the mean, and how a freak time behaves under each. That measurement is what turns this from taste into a ruling.

One flag for the Principal, since D-013 is in play: the current model has a **neutral** tier and deliberately no failure styling. §19 replaces neutral with **yellow = below average**, which by construction fires ~half the time. That is a real change in what the app says to Nathan on an ordinary Tuesday, and it is the part of §19 that deserves the most scrutiny — not the arithmetic.

### B — Big new capability, needs a data model first

| § | Item | Owner | Note |
|---|---|---|---|
| 20 | "Ways": generalize 3 commute tracks → many (start, end) pairs | Backend Dev + Race Engineer | This is **B-10** (data model, OPEN since the Next tier) finally coming due. |
| 21 | Landmarks (home, work, church, fosh, Leuven station, Puttestraat + archive-derived), START-time autodetection with correction, "X rides found" | Race Engineer (frequency analysis) + Mobile Dev (UI) | The frequency analysis is archive work — available now. The autodetect UI is not. |

Sequencing: **landmark frequency analysis (archive, now) → way/landmark data model (B-10) → store (built once, against §19's ruling) → autodetect UI → ghost counts.** The 4 rides in `data/activities/TEST in app rides/` are the validation fixture for autodetection; per §20 most of these trajects likely already exist in the archive and should be mined to seed each way rather than started empty.

Honesty constraint carried forward: D-015's per-track rules apply per *way*, unchanged. A way with 4 seeded archive rides and a way with 200 must not present the same confidence, and D-024's cruise-σ tripwire applies to seeded ways exactly as it does to seeded laps.

### C — Cheap, unblocked, no decision needed

| § | Item | Owner | Size |
|---|---|---|---|
| 24 | Shrink the STOP button; collapse the stacked status lines into one compact rotating slot (5–10 s cycle, not labelled "status") | Designer + Mobile Dev | Small — pure JS, ships on the dev client via Fast Refresh |

This is the only item in the batch that both costs little and directly serves **D-029's gate** ("keep iterating until a version reads as good on-device"). It also frees the screen space §19's colour change and §21's ghost count will want later.

### D — Deferred, with the reason

| § | Item | Gated by |
|---|---|---|
| 18 | Red-light handling — auto-pause toggle vs manual red-light button | Touches D-006's inert-screen rule (a button invites mid-ride interaction) and makes stopped time self-reported. Nathan already deferred it to "a proper meeting"; it belongs with **B-05** (confounder policy, OPEN) and B-20's gate-move pros/cons in one sitting, not bolted onto a build cycle. |
| 22 | Gates closer to true start/finish | Needs **Monday's app-recorded GPX** to measure real time-to-first-fix. The current ~160 m offset is a GPS-arming allowance; how far it can shrink is an empirical question the commute answers. Cheap once the data exists. |
| 23 | GPX+ diagnostic export | `product/GPX-PLUS-proposal.md` already exists — this is spec-ahead-of-need. Most valuable *after* §20–21, since half the payload Nathan lists (detected landmark, auto-guess, manual correction) does not exist yet. Revisit then. |
| 25 | Real maps | Native module → **build 3**, which D-029 holds. Automatically deferred until the dev-client surface reads well on-device. |
| 26 | Kill the Preview tab | Sound in principle, but the Preview tab is currently the enforcement mechanism for the §17 shared-render-path obligation. Removing it is a *process* change as much as a code change: the demo tab must inherit that obligation explicitly, and §26 also asks the demo to gain §20–21 start-detection — which does not exist yet. Do it *with* §20–21, not before. |
| 27 | Beta-tester agents | Cost question, and the Principal's call on team shape. If tried: 3–4 profiles against `demos/mockup.html`, one cycle, measured against whether they surface anything the cycle would not have. Ten agents on an unstable surface buys noise. |
| 18a | HyperFrames marketing tooling | No website exists; D-001 scopes this as a personal app. Park indefinitely. |

---

## 3. Proposed cycle-008 agenda (three items)

1. **Colour-model adjudication (§19 + §21's N).** Race Engineer replays both models over the 624-ride archive and reports the firing rates, noise-floor behaviour and freak-time decay; PO frames the D-007/D-008/D-013/D-028 consequences side by side; Principal rules. *Deliverable: a decision, plus the retention rules the store must honour.*
2. **Ways + landmarks data model (§20 + §21, first half).** Race Engineer's landmark frequency analysis over the archive (done, `data/analysis/landmarks_proposal.md`); Backend Dev turns it into **B-10**'s schema, generalized from tracks to ways. *Deliverable: schema + seeded way list, no UI.* — **first draft now exists: `product/DATA-MODEL.md`**, awaiting a cycle to adopt or amend it.
3. **Live-screen space fixes (§24).** Designer + Mobile Dev, shipped on the dev client. *Deliverable: a surface Nathan can judge against D-029's gate.*

Everything else stays in IDEAS.md, tagged with its gate.

Why these three: items 1 and 2 are the only work in the batch that is *unblocked right now* and *blocks something else* — both run entirely on the archive, need neither the commute nor the device, and together they let the store be built once. Item 3 is the cheap surface win that serves the one gate Nathan controls this week. Note that this agenda deliberately leaves the store itself unbuilt for one more cycle — building it before §19 is ruled on is the specific mistake this triage exists to prevent.

## 4. Proposed backlog additions (B-31 onward, on adoption)

| ID | Item | Owner role |
|---|---|---|
| B-31 | Colour-model adjudication: last-N average vs D-007/D-008, incl. window N and small-set behaviour (§19, §21) | Race Engineer + PO → Principal |
| B-32 | Landmark definition + archive frequency analysis (§21) | Race Engineer |
| B-33 | "Ways" generalization of the data model — supersedes/absorbs B-10 (§20) | Backend Dev |
| B-34 | START-time landmark autodetection + destination pick + "X rides found" ghost count (§21) | Mobile Dev + Race Engineer |
| B-35 | Live-screen space pass: STOP size, rotating status slot (§24) | Designer + Mobile Dev |
| B-36 | Gate proximity to true start/finish, measured on app data (§22) | Race Engineer |
| B-37 | Red-light / stopped-time handling — merge into B-05 rather than a new item (§18) | PO + Race Engineer |
| B-38 | Retire the Preview tab; move the §17 obligation onto the demo tab (§26) | Designer + Mobile Dev |

§23, §25, §27, §18a stay in IDEAS.md unbacklogged until their gate clears.
