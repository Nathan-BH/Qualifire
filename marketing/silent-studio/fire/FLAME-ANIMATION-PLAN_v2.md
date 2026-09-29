# Flame animation plan — v2

2026-09-29 (23:15). Supersedes `FLAME-ANIMATION-PLAN.md` (v1, kept as the record). Feedback that drove this: `FEEDBACK-on-animation-plan-v1.md`.
Live tests: `flame-animations_v2.html` (double-click). **Exploration only; nothing is in the app.**
Mark: `marketing/assets/qualifire_flame_layered_{night,day}.svg`.

## Ground rules (from Nathan's feedback)
1. **Every animation ends on the exact chosen 3-layer flame.** No animation may show a different flame (this is why B, "ride by ride", was dropped).
2. **Realistic motion changes the shape** of the spikes (tips, left tongue, notch), like wind. Moving or tilting a whole layer is not enough.
3. **Growth order is smallest to largest**, starting with the innermost flame.
4. C (breathe) and D (tip-whip shiver) were rated the best of round 1.

## What is in v2
| | Name | What happens | Needs |
|---|---|---|---|
| A2a | Grow outwards, seed hollows | smallest flame appears as a seed; yellow grows around it; then the outer flame; finally the seed hollows out into the core | zero-dependency |
| A2b | Grow outwards, core traced first | the smallest flame's outline is traced; yellow grows out from it; then the outer flame. Ends identical to the chosen flame | zero-dependency for the growth; the outline draw-on needs SVG or a few pre-cut frames |
| C | Breathe (unchanged) | layers swell and lean out of phase, 2.4 s loop | zero-dependency |
| D2 | Wind shiver, spikes reshape then lock | main tip, left tongue and notch each move through five gust shapes; the wind reaches the inner layers a beat later; then one small overshoot and it locks back onto the fixed flame | react-native-svg or video |
| E2 | Same shiver from pre-cut shapes | approximation of D2 using 6 pre-rendered shapes crossfaded (no overshoot). Shows the ghosting cost of the zero-dependency route | zero-dependency (6 mask PNGs) |
| F2 | Grow, shiver until ready, lock | A2b growth, then continuous gusting for as long as loading takes, then settle and lock | react-native-svg or video |

### How the D2 morph works (for whoever builds it)
- Silhouette = 6 cubic Bezier segments (19 points, 400-unit box). A gust pose is 6 numbers: lean, main-tip dx/dy, left-tip dx/dy, notch dy. Each pose displaces the control points with soft (Gaussian) weights around the two tips and the notch, and a height-weighted lean, base pinned.
- Displacement is applied to the flame BEFORE the three layers are scaled, so the layers stay nested.
- Poses are joined with smooth Hermite curves (no stop at each pose), and the end is a critically-damped spring with one overshoot to the fixed pose. The wind lags 0.04 s per layer, inward.
- Gust poses V1..V4 are hand-tuned; tune amplitude in the HTML (`V1..V4`).
- Loading use: keep a periodic gust running until the app is ready, then spring to the locked pose.

## Feasibility (revised)
### Marketing teaser (HyperFrames)
D2/F2 port directly: same morph function driven by the GSAP time, or bake pose keyframes. Reminder from memory: GSAP `fromTo()` has `immediateRender:true` by default; set it false for anything positioned later in a timeline.

### The app (React Native / Expo; no SVG library, no reanimated today)
- **Realistic (D2/F2) needs a shape morph.** Options:
  1. react-native-svg with the same path maths: best quality, but a native dependency => new build, not OTA (fingerprint-drift trap in the EAS Update notes).
  2. Pre-rendered short clip or frame strip of the D2 sequence (one for night, one for day, or a white mask tinted by the theme): no library logic, but adds an asset/playback dependency.
  3. **E2 approach, no dependency**: 6 mask PNGs (one per pose; the 3 layers are scaled copies, tintColor gives the theme colours), crossfaded with RN `Animated` opacity. Cheap, but mid-transition frames look ghostly (see E2) and there is no spring overshoot.
- Growth (A2a/A2b): zero-dependency with 3 tinted mask images animated by `scale` about the base, same technique as `launchAnimation.tsx`. The A2b outline trace needs SVG or a set of pre-cut frames; A2a needs none.
- Loading screen reality: the launch animation plays once per cold start and is tap-to-skip. A multi-second shiver only makes sense when something is really loading.
- Honour reduced motion (static locked flame).

## Recommendation
- Marketing/teaser: F2 (A2b growth, then D2 shiver, lock). Pending: is the outline trace (A2b) or the hollowing seed (A2a) closer to what Nathan pictured?
- App today: A2a as the mark reveal (zero dependency); D2 only if a new build with react-native-svg is acceptable; otherwise E2 or no shiver.

## Open questions for Nathan
- A2a or A2b for growth?
- Gust strength: more violent, or calmer?
- Should the shiver stay yellow-led (as now) or should the outer layer whip more than the inner ones?
