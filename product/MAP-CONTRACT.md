# MAP-CONTRACT — cycle 014, 2026-08-17

UNBUILT. Written jointly: Product Owner (§1–4) + Designer (§5–7). Reads STATE.md, LAYOUT.md, BACKLOG.md,
team logs, `routeMapView.tsx` + call sites only. Ground: `RouteMapView` is called from **RecordScreen.tsx**
(live) and **DemoScreen.tsx** (shared component, same file) only. `RoutesScreen.tsx` shows a separate static
full-route `<Image>` (not `RouteMapView`, no interaction). `ResultScreen.tsx` currently has **no map at all** —
matches LAYOUT §3.6 ("No map on this screen"; a "view trace" link is specced but unbuilt).

Nathan's ruling today overrules D-033's "no map on live ride" (its reserve rules still bind) and reopens B-34.
It supersedes STATE.md's cycle-011 "map work is parked" line — Principal should correct STATE accordingly.

---

## Product Owner

### 1. Per-surface contract

| Surface | For (one clause) | Shows | Interactions | Never | PNG today |
|---|---|---|---|---|---|
| **Routes overview** | recognize which way a route is, at a glance | whole route line + gate rings over real streets, no rider | pan/zoom, tap route to expand (existing) | show a rider position (no live ride here); colour an unscored gate | Static `<Image>`, not `RouteMapView`. Adequate for "which way" recognition; genuinely needs real tiles for "is this actually my street," which is Nathan's whole ask |
| **Result (post-ride)** | let a curious rider confirm the road behind a number, off the critical path | nothing on the board itself (D-002); a "view trace" link, one tap away | (on view-trace only) full pan/zoom/layer-switch — stationary, no time pressure | put a map inside the ten-second glance path; outrank the tower headline | Link is unbuilt (grep confirms). Needs real tiles day one — its only reason to exist is "which street was that" |
| **Record/live** (pre-start / moving / stopped-at-light / finished) | confirm you're on the right road without ever competing with the clock (D-027) | pre-start: full candidate route, pannable. moving: tight heading-up crop, route+dot+scored gates only, no labels. stopped-at-light: identical to moving. finished: crop released, labels return | pre-start & finished: pan/zoom. moving & stopped-at-light: zero (D-006) | pan/zoom/labels while moving or at a light; map larger than sector-block band while moving; snapped dot (D-025); tier colour on an unscored gate | This is the named surface ("I have the fake picture but I'm sure there is a better option") where D-033 was overruled today — genuinely needs real tiles, no debate |
| **Demo** | audition the live experience without a commute | identical to Record's moving state — same `RouteMapView` call | identical to Record's moving state | identical to Record's moving state | Same file, same limits, same fix. Converting Record converts Demo for free; no separate work item beyond wiring |
| **Future gate-setup/eyeball** (LAYOUT §5, B-31) | let Nathan see gate placement and say "move gate 2" with confidence | recorded polyline, gate **lines** (never dots) at true half-width, crossing-point cloud, arming window, chainage bar | full pan/zoom, tap-select a gate, drag the chainage bar — the one surface dense interaction is acceptable | let the map upstage the chainage bar — bar is truth, map is preview | N/A on-phone (unbuilt). B-31's browser prototype already uses real Leaflet+OSM tiles — already ahead; should adopt the same MapLibre stack on-device |

### 2. Strava feature verdicts

| Feature | Verdict | Reason |
|---|---|---|
| Vector streets basemap | **ADOPT** | Nathan's direct ruling, every screen; free (OpenFreeMap); replaces the PNG everywhere |
| Satellite layer (Maxar) | **LATER** | Strava's is Maxar/Mapbox-licensed, not free; needs its own free-source spike (B-54) before it's real |
| 3D terrain | **NON-GOAL** | Leuven commute is flat; terrain relief buys nothing on a handlebar screen and costs render budget — scope-protective |
| Layer switcher (stack icon) | **LATER** | Nothing to switch until a second layer ships; pairs with B-54, not before |
| "Map data sources" sheet | **ADOPT** | Already a legal obligation today (D-031/038's in-app credit); upgrades the corner strip into a real sheet, free |
| Pan/zoom | **ADOPT, scoped** | Full wherever the rider is stationary (Routes/Result/gate-setup/pre-start/finished); forbidden moving or at a light (D-006/D-033) |
| Follow-me | **ADOPT (already mandated)** | D-033's heading-up + locked zoom while moving *is* follow-me — not new, just named |
| Heading-up | **ADOPT, live-only** | Live ride only (D-033); Routes/Result stay north-up — nothing there to orient a moving body to |

### 3. Proposed backlog rows

| ID | Item | Owner role | Status |
|---|---|---|---|
| B-50 | MapLibre + OpenFreeMap vector base replacing `routeMapView.tsx`'s PNG compositor; route/gates/dot re-implemented as GeoJSON layers | Mobile Dev | OPEN — blocked on B-46 spike |
| B-51 | Wire the real map onto every screen per this contract: Record's four ride states, Demo (shared component), Result's new view-trace link, Routes overview's static-Image swap | Mobile Dev + Designer | OPEN — blocked on B-50 |
| B-52 | Ambient tile cache for no-signal riding (online-first per Nathan; short of a PMTiles rebuild) — note: that MapLibre's ambient cache serves previously seen tiles offline is [UNVERIFIED] until seen on device; it is an acceptance item of B-50's first dev-client run. | Mobile Dev + Backend Dev | OPEN — blocked on B-50 |
| B-53 | "Map data sources" attribution sheet, replacing the in-corner credit string | Designer + Mobile Dev | OPEN |
| B-54 | Free satellite-layer sourcing spike — a source with no paid Maxar/Mapbox tier, compatible with the MapLibre style spec; report cost/licence before scheduling any satellite work | Mobile Dev | OPEN — LATER |
| B-55 | Layer switcher UI (streets ⇄ satellite) | Designer | OPEN — LATER, blocked on B-54 |
| B-56 | Protomaps PMTiles offline corridor extract — only if B-52's ambient cache proves insufficient on a real dead-zone commute | Mobile Dev | OPEN — LATER |
| B-57 | Result screen "view trace" link (LAYOUT §3 rule 6) — unbuilt; now worth building since it opens onto a real map | Designer + Mobile Dev | OPEN |
| B-58 | Phone-checkable acceptance test for "the map problem is solved" (§4), folded into `app/README-dev.md`'s acceptance steps | QA + Product Owner | OPEN |

**Existing items — change status/wording (Principal sets status; flagged here, not edited):**
- **B-34** (NON-GOAL): recommend **SUPERSEDED by B-50/B-51** — Nathan reversed D-033 today; wording should record the reversal, not stay filed as a closed non-goal.
- **B-46 / B-47**: drop the "gated on §29 adoption" language. Today's ruling is a direct, independent trigger — MapLibre no longer waits on the destination-typing feature. B-46 can run now; B-47 still needs two real commutes.
- **B-32**: still OPEN, still Nathan's eye — reword from "PNG palette" to "vector style ground." The artifact is now a MapLibre style render (light vs dark), judged alongside the satellite-vs-streets choice (does dark-ground apply to satellite too, or streets only — see §5).

### 4. Acceptance test (Nathan, on his phone)

At the bike rack: Record screen shows real, recognizable streets, pannable, before he taps START. He rides: the
screen locks heading-up on his real road, no labels, no pan/zoom, the dot never teleports onto a fantasy line.
He stops at a light: the map stays exactly as tight and inert — it does not loosen just because he's stopped.
He crosses the finish: the map is allowed to grow and gain labels again. On the board, he taps "view trace" and
gets the same real streets, pannable, with a "map data sources" link that opens a real sheet. **If at any point
while moving or at a light he can pan the map, read a road name, or watch it grow past the sector-block band,
it fails.**

---

## Designer

### 5. Live-ride map spec (D-033 reserve rules + D-027/D-030)

**Size/placement.** D-027: the ticking lap clock owns most of the screen — unchanged. D-033's reserve caps the
map at "never larger than the sector-block band" (LAYOUT §2's row of equal-width blocks). Proposal: the map is
a slim ribbon directly **beneath** the sector-block row, same full width, capped at that row's height — the
~95 pt counter's budget is untouched; nothing new competes with the clock.

| State | Heading | Zoom | Labels | Interaction | Notes |
|---|---|---|---|---|---|
| Pre-start | north-up | fit-to-route | on | pan/zoom | nothing else on screen yet; orientation is the job |
| Moving | heading-up, locked | ~16, locked | all POI/road names suppressed | zero, no controls rendered (D-006) | ribbon capped at sector-block-row height |
| Stopped-at-light | identical to moving | identical | identical | identical | a light is not a finish; loosening only to snap back at green would be a distraction exactly when traffic needs attention. Dims to ~40% opacity in step with the counter's own stationary dim (LAYOUT §2 rule 3), for one visual language |
| Finished | held at last heading (no spin) | releases, may grow | return | pan/zoom/layer-switch unlocked | ribbon may expand toward a browsable panel (B-57's view-trace precedent) |

**Route/gates/dot on real tiles.** Route line: 4 pt core (#F5C542, unchanged) + 2 pt near-black casing
(#14120C) on streets; satellite gets the §7 sandwich instead. Gates: perpendicular **ring**, never a dot
(extending B-31's own rule — "a dot hides a line clipping a parallel road" — from the eyeball tool to the live
map); 12 px, unscored = casing-outline only (no fill — visible structure, silent), scored = filled in the
earned tier colour, same 12 px (colour appears only once earned, D-030). Dot: 14 px filled circle, 2 px casing
border; desaturates to `t.textDim` grey off-route (D-025 honesty, unchanged).

**OFF ROUTE / waiting for GPS.** Unchanged visual language from today's `routeMapView.tsx` — small badge,
bottom-left, translucent card chip. Same component, now sitting on real tiles instead of a painted PNG.

**Palette firewall.** Carried from B-32/Art Director's spec: nothing in the basemap style (streets or
satellite, excluding scored gate fills) may sit in HSL hue 130–165 or 260–290 at S>25% — green/purple stay
score-only. **New finding, flagged not fixed here:** the current on-route dot and fallback line both render in
`colors.neutral` (#F5C542) — this is the **yellow scored-tier** colour (`chips.tsx` `YELLOW_TIER = colors.neutral`),
not the neutral (no-verdict) tier; the `'neutral'` UiTier itself (no verdict) renders `t.accentText`, a different
colour entirely. `theme.ts` already precedents dual
use ("yellow *surfaces*… stay #F5C542 everywhere" — START/Export use it as brand accent, not score); not
reopening that here. On satellite specifically, that gold/amber sits close in hue to sunlit tan/brick/dry-grass
pixels — a legibility problem before it's a trust problem (§7's fix should resolve it; if it doesn't, the honest
move is a satellite-only route colour, not a redesign of the neutral tier).

**Light vs dark ground (B-32) — for the live map specifically: dark.** Every other element on this screen
(clock, blocks) sits on race-mode near-black (#0A0A0A, §6). A light-wash basemap under a black clock is the one
surface that would break the app's one ground colour, on the screen that most needs a half-second read. The Art
Director's stated sunlight risk is a floor-lift/brightness question inside the style's colour ramp, not a reason
to flip grounds. **Logged, not smoothed:** the Product Owner's §1 table takes no stance on light/dark for
Routes/Result/gate-setup (cosmetic there, D-002) — Designer's dark ruling is scoped to the live ribbon only;
the calmer browsing surfaces may reasonably prefer the lighter wash. B-32's acceptance should ask Nathan to look
at both, told which surface each is for.

### 6. Layer switcher

**Not adopted this cycle** (§2: LATER, paired with satellite). When it ships: lives in the same top-right corner
the current zoom bar (`st.zoomBar`) already occupies — replaces it, doesn't add to it. Offers exactly two
options, Streets / Satellite, no third. Renders only on surfaces where pan/zoom is already unlocked (Routes
overview, Result's view-trace, gate-setup, Record's pre-start/finished) — never while moving or at a light,
regardless of how many layers exist, because it is an interactive control and D-006 doesn't care what it
switches.

### 7. Sunlight legibility rule — route line on satellite

Satellite imagery has no guaranteed-contrast flat ground, unlike a designed vector style — sunlit concrete, dry
grass and rooftops drift into the same warm gold/tan band the route colour already lives in (§5 firewall
finding). **Rule, satellite layer only:** the route line renders as a three-layer sandwich, outer→inner — 1 pt
near-white halo (~70% opacity) → 3 pt near-black casing (up from 2 pt) → 4 pt route-colour core (#F5C542,
unchanged). The halo guarantees a light-value ring for dark pixels (shadow, asphalt); the widened casing
guarantees a dark-value ring for light pixels (concrete, sun-bleached grass). The streets layer keeps its plain
2 pt single casing — a flat vector ground doesn't need the sandwich. Same rule applies to gate-ring casing when
satellite is active.
