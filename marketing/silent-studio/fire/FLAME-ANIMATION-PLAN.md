# Flame animation plan

2026-09-29. Live tests: open `flame-animations.html` in a browser (double-click). Everything here is exploration only; **nothing is in the app**.
Chosen mark: `../../assets/qualifire_flame_layered_{night,day}.svg` (three layers: outer, yellow, core cut-out, all scaled copies anchored at the base).
Story to serve: growth from the middle outwards, every ride adds a layer, nothing earlier is erased (see `marketing/assets/fire/FIRE-LOG.md`).

## Nathan's two ideas (2026-09-29)
1. Draw it layer by layer, growing outwards.
2. A real-flame shiver side to side for some seconds, in a demo or as an in-app loading screen; think about what is feasible.

## The animations tried (all in the HTML)
| | Name | What happens | Serves | Needs |
|---|---|---|---|---|
| A | Grow outwards | yellow seed springs up, ink flame grows around it, core opens last (~2 s, once) | idea 1, launch moment | zero-dependency |
| B | Ride by ride | one seed, then each "ride" adds an outer ring while older rings shrink inward; ends at 4 layers (~6 s) | idea 1 + the growth story, best story fit | zero-dependency |
| C | Breathe | layers gently swell and lean out of phase (2.4 s loop) | idle / waiting | zero-dependency |
| D | Shiver, real wobble | base pinned, tip whips side to side, each layer at its own timing, slight vertical flicker | idea 2, best-looking | react-native-svg (or video) |
| E | Shiver, layers only | each whole layer leans (skewX) and stretches from the base; no bending | idea 2 within current app limits | zero-dependency |
| F | Ignite then shiver | A, then D until "ready", then settle over the last second | idea 2 as a loading screen | react-native-svg (or video) |

## More ideas, described only (not built)
- **Draw-on outline**: the nested-outline variant (design 01) draws itself from the base up along each contour, then the layers fill. Good for marketing.
- **Gate ignite**: the yellow Q tail sweeps across (the gate crossing) and the flame ignites from that point. Ties the flame to the Q; marketing/teaser only.
- **Theme flip**: on pressing START (day to night) the outer layer and core swap colours while the yellow middle holds still.
- **Ring count = rides** (product idea, does not exist): a route's flame gets one more ring per ride on that route. This literally is the growth story; needs a design decision, not just an animation.

## Feasibility, for a future agent
### Marketing teaser (HyperFrames, `scenes/` + `build_teaser_full.py`)
- Compositions are HTML + GSAP, 1920x1080. All of A to F are straightforward there (SVG paths, GSAP tweens, or a small time-driven warp function as in the HTML).
- Gotcha from memory: GSAP `fromTo()` defaults to `immediateRender:true` even mid-timeline, so a carried-over tween can silently write its start value early. Set `immediateRender:false` on any fromTo positioned later in the timeline.
- Build via a scene source in `scenes/<scene>/index.html`, then `build_teaser_full.py`, then `render.ps1` (see `structure.md`).

### The app (React Native / Expo)
- `app/package.json` lists **expo and react-native only**: no react-native-svg, no reanimated (checked 2026-09-29). `launchAnimation.tsx` was deliberately built with plain RN `Animated` and no dependencies, native-driver-safe. That is the precedent to follow.
- **Zero-dependency route (A, B, C, E)**: export ONE white-on-transparent PNG mask of the flame; render three `<Image>` copies stacked at the same base, each with `tintColor` (theme ink / accent / bg-of-current-theme), so night/day just works. Animate each with `Animated` transforms about the base (needs `transformOrigin` bottom-centre): `scale` for A/B/C, `skewX` + `scaleY` + small `translateX` for E. All native-driver capable. Untested on a device: confirm `skewX` looks right on both platforms.
- **D and F need the tip to bend**, which a bitmap layer cannot do. Options: (a) add react-native-svg (a native dependency: needs a **new build, not an OTA update**, and can trigger the fingerprint-drift trap noted in the EAS Update setup), (b) ship a pre-rendered short video/frame strip (adds a media dependency or asset), (c) accept E.
- **Loading screen reality check**: the launch animation plays once per cold start and is tap-to-skip; the app is not slow to load, so a multi-second shiver only makes sense while something is really loading (e.g. map/route data). If there is no real wait, use A (or B) as the launch mark and keep the shiver for marketing.
- Honour reduced motion, like `launchAnimation.tsx` does: hold the static mark instead of shivering.

## Recommendation
- Marketing/teaser: B then F (grow by rides, then shiver), rendered from the D-style warp.
- In app now, zero new dependencies: A or B for the mark reveal, E for any waiting state.
- Revisit react-native-svg only if the bent-tip shiver (D) is judged worth a new build.
