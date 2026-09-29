# Qualifire flame / fire pictogram — running log

Folder: `marketing/assets/fire/`. Generator: `make_fire.py` (writes SVG + PNG per design, night + day, plus contact sheet and small-size strip).
Entries are dated and appended; nothing is rewritten.

---

## 2026-09-29 — Round 1: brief and first designs

### Nathan's brief
- Some people would like a fire logo or pictogram to appear somewhere, since the name is Qualifire.
- Constraint: no new colour (no orange). Base is black + yellow; the full palette (night + day) also includes greys and beige, so those are allowed.
- Idea to explore: a layered approach, or several lines next to each other, outlining a flame in an interesting way using the app theme colours.
- Work here, new folder `fire`, PNG is fine for quick viewing.

### Palette used (from `app/src/ui/theme.ts`, all existing tokens)
| Role | Night | Day |
|---|---|---|
| Ground | `#17171b` | `#FAF7EE` |
| Ink | `#F4F2EC` | `#201F24` |
| Structural yellow | `#F5C542` | `#F5C542` |
| Dim grey | `#9a978f` | `#8A8577` |
| Extras available | `#41414c` card border, `#b5b3ac` text2 | `#B98A0A` gold, `#E0D9C4` beige |

Logo geometry reference: `qualifire_logo_5_monogram_only.svg` — Q ring r=118, stroke 30, round caps, yellow tail.

### Designs made (each in `_night` and `_day`, PNG + SVG)
1. `01-nested-outlines` — four concentric flame outlines, alternating ink/yellow, round caps like the Q ring.
2. `02-layered-fill` — solid ink flame, yellow flame inside, ground-coloured core inside that. Most iconic, most legible small.
3. `03-vertical-bars` — bars side by side whose tops trace the flame. Weakest: reads as waveform/droplet.
4. `04-open-contours` — nested contours with a gap at the base, like the gap in the Q.
5. `05-flame-in-Q` — small two-line flame inside the Q ring, yellow tail kept. Only one tied into the logo; flame gets small.
6. `06-timing-lines` — horizontal timing lines whose lengths form a flame, yellow tip to ink to grey base. Reads a bit like a droplet.

Also: `00-contact-sheet.png` (night top, day bottom), `00-small-sizes.png` (96/48/32 px legibility).

Construction note: one flame silhouette (400-unit box, small left tongue + main tongue), inner layers are scaled copies anchored at the base point (200, 382).

### Risks flagged by me
- Flame icons often read as "streak / trending".
- Yellow flame is close to the amber used for warnings — keep off warning surfaces.
- The core cut-out gets small at 32 px.

---

## 2026-09-29 — Round 2: Nathan picks design 02, asks for the story

**Nathan:** favourite is the second design (layered, three layers inside one another). Asked me to talk about it as a contracted freelance designer: how I came to it, what it means, how it fits the app.

**Me (v1 story):** flame layers map to real fire (outer / bright middle / hollow core); yellow = the gate-crossing colour from the Q; core = the ground showing through; fits the day→night flip; secondary pictogram beside the Q monogram; only a PNG, nothing in the app yet.

**Nathan:** wants me to *invent depth* — "that's what sells; if you make a story believable enough people will get on board."

**Me (v2 story):** "three layers of a fast ride" — outer = the road/effort in ink, yellow = the crossing, hollow core = the quiet/flow. Tagline options. Caution given: keep the story about *meaning*, not fabricated origin claims ("born from a real night ride") since those can be checked and disproved.

**Nathan's refinement (important):** the colour argument is refuted because the night and day renders are flipped (outer layer is cream at night, near-black in day). Colour can't carry the story. Wants the story on the **layering, inside vs outside**, maybe **growing / shrinking**.

**Me (v3 story — structure, not colour):**
- Same flame shape at three scales, all anchored at the same base.
- Read *inward* = refinement (shrinking): same ride, slack taken out; core = the ride not yet ridden.
- Read *outward* = growth: tree rings; each ride adds a layer.
- Inside vs outside = the visible result vs the private ride.
- The only constant across day/night is the yellow middle, between outer flame and empty core.
- Lines offered: "Tighter every time." / "Every ride adds a layer." / "Same flame. Less waste." / "The outside is the result. The inside is the ride."
- Design follow-up proposed: test a four-layer version; check even size steps between layers.

---

## 2026-09-29 — DECISION: lean on the growth reading

**Nathan chose this as the idea to lean on:**

> Read outward and it's growth. Like tree rings, a flame like this can only be built from the middle outwards. Every ride adds a layer around the ones before it, and nothing you rode earlier gets erased. It sits inside the newer ones and holds them up. The mark is the shape of someone who keeps showing up, with the outside representing the sum of everything before.

Why it works (mine): it is purely structural, so it survives the night/day colour flip; it matches how the mark is actually drawn (concentric, same base); it tells a story about the *person* (keeps showing up), not about product features, so it can't be fact-checked and found false.

Story principles agreed so far:
1. Don't hang meaning on colour (outer/core swap with the theme). The only stable colour fact is the yellow middle layer.
2. Meaning lives in nesting, scale and growth.
3. Keep claims about *meaning*, never invented origin events.
4. Nothing is in the app yet — this is a PNG exploration only.

## Open items / next candidates
- Four-layer variant (more "rings", stronger growth read); check even scale steps.
- Single-colour version for tiny sizes (favicon / avatar).
- Flame as the Q's tail, or inside the ring (design 05 was too small).
- Mock the flame on splash screen / social post with a growth-story line.
- Optional one-page brand note built on the growth story.
- Decide where the flame lives: secondary pictogram beside the Q vs. anywhere in the app UI (avoid warning surfaces; amber is warnings).

---

## 2026-09-29 — Design agreed, exported, animation round

- Nathan agreed on design 02 (layered fill). Exported as `marketing/assets/qualifire_flame_layered_{night,day}.{png,svg}` (with theme background) for a future agent to integrate.
- Created `marketing/silent-studio/fire/`.
- **Nathan's animation ideas:** (1) draw it layer by layer growing outwards; (2) a real-flame shiver side to side for some seconds, as a demo or an in-app loading screen; asked what is feasible. Wanted to *see* them without rendering MP4s tonight, so: an HTML page with live animations.
- Built `silent-studio/fire/flame-animations.html` (A grow outwards, B ride by ride, C breathe, D shiver-real-wobble, E shiver-layers-only, F ignite then shiver) and `FLAME-ANIMATION-PLAN.md` (feasibility).
- Key finding: the app has no SVG library and no reanimated; `launchAnimation.tsx` uses plain RN Animated. Zero-dependency route = one alpha-mask PNG x3 tinted images animated with Animated transforms (A, B, C, E). D/F (bending tip) need react-native-svg (new native build, not OTA) or video.

---

## 2026-09-29 (23:13-23:15) — Feedback on animation iteration 1, and v2

Nathan's feedback (full text in `silent-studio/fire/FEEDBACK-on-animation-plan-v1.md`):
- Realistic shiver should **change the shape of the spikes** like a flame in wind, as a transition that changes then **locks back into the fixed configuration**.
- A grow-outwards animation should **start with the smallest flame of the tree** and grow in the correct order.
- **Animation B is a no**: it is a different flame altogether. Rule: every animation ends on the exact chosen flame.
- After a second brief look: **C (breathe) and D (shiver, real flame wobble) are the best of the first set.**

Done: `silent-studio/fire/flame-animations_v2.html` and `FLAME-ANIMATION-PLAN_v2.md` (A2a, A2b, C, D2, E2, F2). v1 files left untouched for the record. Open: A2a vs A2b, gust strength.

---

## 2026-09-29 (23:24) — Round 2: open the core flame to the ground

- Housekeeping: all round-1 files (designs, contact sheets, `make_fire.py`) moved into `round1/`. `FIRE-LOG.md` stays at the top level because it is the running log across rounds. Round-2 work lives in `round2/`.
- **Nathan's idea:** the innermost flame should not be closed off inside the yellow. Let its bottom touch/merge with the outside ground (black at night, cream in day), either by lowering the core flame so it merges with the background, or by hollowing the bottom of the other flames. That should make it clearer that the smallest flame IS the background rather than something drawn inside, and may look more lively.
- **Built** (`round2/`, night + day, PNG + SVG, plus `make_round2.py` and a contact sheet with the round-1 pick in column 0): 01 lowered 20, 02 lowered 34, 03 lowered 48 (core shape shifted down, cutting through the yellow and outer flames' bases); 04 stretched 34, 05 stretched 52 (core tip stays where it was, its base drops, so the whole core flame grows taller).
- A "straight-sided channel" hollowing (core plus a vertical opening to the base) was tried and dropped: awkward stub corners.
- My read: 04 (stretched 34) keeps both spikes of the core and looks liveliest; 03 starts to eat the yellow.

---

## 2026-09-29 (23:31) — DECISION: core-opening preference locked in; original stays for now

- **Nathan's preference (locked):** the core flame should open to the ground by an amount **between the original (closed) and `04-stretched-34`**, i.e. a milder opening than 04. (Suggested value to try next: stretched ~15-20, between the original 0 and 34.)
- **Current asset stays the ORIGINAL closed design** (`marketing/assets/qualifire_flame_layered_{night,day}.*`, round1 `02-layered-fill`). Do not swap the asset yet; the milder-opening version is the pending refinement.
- Round-2 variants remain in `round2/` for reference.
