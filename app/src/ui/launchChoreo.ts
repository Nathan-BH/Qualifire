/**
 * LAUNCH ANIMATION — pure choreography (Nathan 2026-08-17 / BRAND.md ratified motion,
 * Nathan 2026-08-17: "must feature"). Ported from the marketing hero's CSS
 * keyframes (`marketing/index.html` ~L88-107) and the mark's own SVG geometry
 * (`marketing/assets/qualifire_logo_5_monogram_wordmark.svg`): ring draws
 * clockwise from the 12-o'clock start tick, slash lands last.
 *
 * ZERO dependencies — no react-native-svg, no reanimated (sandbox cannot
 * npm install). This module has no RN imports at all: everything here is
 * plain arithmetic so it can run under the headless test runner AND drive
 * `launchAnimation.tsx`'s `Animated` values. The component consumes these
 * constants/functions directly so the tests below exercise the real maths,
 * not a duplicate.
 *
 * Timeline (ms, all measured from mount):
 *   0 ------------------ 1150 ---- 1400 -- 1650 ---- 1900
 *   |--------ring draws--------|         |
 *                    |----slash draws----|
 *                                        |--fade out--|
 */

// ---------------------------------------------------------------- timing

export const RING_MS = 1400;
export const SLASH_DELAY_MS = 1150;
export const SLASH_MS = 500;
export const FADE_MS = 250;
/** Ring + slash choreography, before the overlay starts fading (site: 1.65s). */
export const TOTAL_BEFORE_FADE_MS = SLASH_DELAY_MS + SLASH_MS; // 1650
/** Full boot-overlay lifetime including the fade (site's 1.65s + our 250ms). */
export const TOTAL_MS = TOTAL_BEFORE_FADE_MS + FADE_MS; // 1900
/** Site's ring easing: cubic-bezier(.2,.7,.2,1) — matches Easing.bezier args. */
export const RING_BEZIER: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
/** Reduced-motion path (§5): show the completed static mark, hold, then fade. */
export const REDUCED_MOTION_HOLD_MS = 300;

// ------------------------------------------------------- ring sweep (0-360)

/** Overall sweep of the ring in degrees, clockwise from 12 o'clock. `p` is the
 * already-eased 0..1 progress of the RING_MS animation (Easing.bezier is
 * applied by the Animated.Value driving this, not here) — monotonic 0->360. */
export function ringSweepDeg(p: number): number {
  const clamped = Math.max(0, Math.min(1, p));
  return clamped * 360;
}

// ---------------------------------------------------- two-hemisphere sweep

/** Right hemisphere (12 o'clock -> 6 o'clock, clockwise) draws across the
 * first half of `p`; left hemisphere (6 o'clock -> 12 o'clock) across the
 * second half. Both ranges are clamped outside their active window so the
 * handoff at p=0.5 is exact: right finishes there, left starts there. */
export const RIGHT_INPUT_RANGE: [number, number] = [0, 0.5];
export const RIGHT_OUTPUT_RANGE: [number, number] = [-180, 0];
export const LEFT_INPUT_RANGE: [number, number] = [0.5, 1];
export const LEFT_OUTPUT_RANGE: [number, number] = [-180, 0];

/** Static rotation baked into each hemisphere's half-coloured circle so its
 * border-side coverage (which lands on a -45..135deg local arc for adjacent
 * border sides on a true circle) lines up with the true 0/180deg hemisphere
 * boundary once the dynamic sweep above is added on top. Component detail,
 * exported so both the component and a future visual check share one number. */
export const HEMISPHERE_STATIC_OFFSET_DEG = 45;

function clampInterp(p: number, x0: number, x1: number, y0: number, y1: number): number {
  if (p <= x0) return y0;
  if (p >= x1) return y1;
  return y0 + ((y1 - y0) * (p - x0)) / (x1 - x0);
}

export function hemisphereAngles(p: number): { rightDeg: number; leftDeg: number } {
  return {
    rightDeg: clampInterp(p, RIGHT_INPUT_RANGE[0], RIGHT_INPUT_RANGE[1], RIGHT_OUTPUT_RANGE[0], RIGHT_OUTPUT_RANGE[1]),
    leftDeg: clampInterp(p, LEFT_INPUT_RANGE[0], LEFT_INPUT_RANGE[1], LEFT_OUTPUT_RANGE[0], LEFT_OUTPUT_RANGE[1]),
  };
}

// ------------------------------------------------------------ slash timing

/** Ease-out cubic, matching RN's Easing.out(Easing.cubic) — duplicated here
 * (not imported from 'react-native') so this module stays dependency-free
 * and runs under the plain-node test runner. */
function easeOutCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - c, 3);
}

/** 0 before SLASH_DELAY_MS, eased 0->1 across SLASH_MS, 1 from 1650ms on —
 * "slash lands last" (BRAND.md). `tMs` is elapsed time since mount. */
export function slashProgress(tMs: number): number {
  if (tMs <= SLASH_DELAY_MS) return 0;
  if (tMs >= SLASH_DELAY_MS + SLASH_MS) return 1;
  return easeOutCubic((tMs - SLASH_DELAY_MS) / SLASH_MS);
}

// -------------------------------------------------------------- geometry

// Exact numbers from marketing/assets/qualifire_logo_5_monogram_wordmark.svg
// (512 viewBox; ring cx=256 cy=218 r=118 stroke-width=30; slash line endpoints).
const SVG_R = 118;
const SVG_STROKE = 30;
const SVG_DIAMETER = 2 * SVG_R + SVG_STROKE; // 266 — ring OUTER diameter incl. stroke
const SVG_CX = 256;
const SVG_CY = 218;
const SVG_SLASH_X1 = 291.355;
const SVG_SLASH_Y1 = 253.355;
const SVG_SLASH_X2 = 387.5206;
const SVG_SLASH_Y2 = 349.5206;
const SVG_SLASH_DX = SVG_SLASH_X2 - SVG_SLASH_X1;
const SVG_SLASH_DY = SVG_SLASH_Y2 - SVG_SLASH_Y1;
const SVG_SLASH_LEN = Math.hypot(SVG_SLASH_DX, SVG_SLASH_DY);

/** Ratio constants exposed for tests, independent of any chosen container size. */
export const RING_THICKNESS_RATIO = SVG_STROKE / SVG_DIAMETER; // ~0.1128 (30/266)
export const SLASH_LEN_RATIO = SVG_SLASH_LEN / SVG_DIAMETER; // ~0.511
/** Direction of the slash: exact 45deg down-right (dx===dy, both positive —
 * screen coords, y grows downward — so this crosses the rim lower-right). */
export const SLASH_ANGLE_DEG = (Math.atan2(SVG_SLASH_DY, SVG_SLASH_DX) * 180) / Math.PI;

export interface MarkGeometry {
  /** The square container's side — the ring's own outer diameter fills it. */
  ringDiameter: number;
  ringThickness: number;
  slashLen: number;
  slashThickness: number;
  slashAngleDeg: number;
  /** Slash midpoint, offset from the ring's centre — where to translate the
   * (still-unrotated) slash bar to before rotating it 45deg and growing it. */
  slashCenterX: number;
  slashCenterY: number;
}

/** Proportional mark geometry for a container of side `size` (dp) — the ring
 * fills the container, everything else scales off the SVG's own ratios. */
export function markGeometry(size: number): MarkGeometry {
  const scale = size / SVG_DIAMETER;
  const midX = (SVG_SLASH_X1 + SVG_SLASH_X2) / 2 - SVG_CX;
  const midY = (SVG_SLASH_Y1 + SVG_SLASH_Y2) / 2 - SVG_CY;
  return {
    ringDiameter: size,
    ringThickness: SVG_STROKE * scale,
    slashLen: SVG_SLASH_LEN * scale,
    slashThickness: SVG_STROKE * scale,
    slashAngleDeg: SLASH_ANGLE_DEG,
    slashCenterX: midX * scale,
    slashCenterY: midY * scale,
  };
}
