/**
 * LAUNCH ANIMATION (BRAND.md ratified motion, Nathan 2026-08-17: "must
 * feature" — seen on the marketing hero, ratified for the app). Cold-start
 * full-screen overlay: ring draws clockwise from the 12-o'clock start tick,
 * slash lands last, then the whole overlay fades to reveal the app.
 *
 * ZERO new dependencies — no react-native-svg, no reanimated (the sandbox
 * cannot npm install; see D-041 threads). Built entirely from RN's built-in
 * `Animated`, native-driver-safe throughout (pattern precedent: tower.tsx's
 * slot-in). All timing/geometry maths live in `launchChoreo.ts`, imported
 * here, so the test suite exercises the same numbers this component uses.
 *
 * Ring, without SVG — two-hemisphere technique: a square mark box contains
 * two half-width `overflow:hidden` clip containers (left/right). Each holds
 * a full circle View whose border is coloured on two adjacent sides only
 * (a static 45deg rotation aligns that coverage with the true hemisphere
 * boundary — see HEMISPHERE_STATIC_OFFSET_DEG), driven by ONE Animated.Value
 * `p` 0->1 over RING_MS with the site's own cubic-bezier. Butt caps (square,
 * unrounded ends) are an accepted deviation from the SVG's round linecap.
 *
 * Slash lands last: a plain bar View, positioned/rotated per the SVG's own
 * geometry, grows from its inner end via scaleX + a compensating translate
 * (both native-driver-safe) starting at SLASH_DELAY_MS.
 *
 * Lifecycle: mounted by App.tsx above <Shell/> only while `booting` is true
 * (state lives in App, NOT in Shell) — plays once per cold JS start, never
 * on resume (App never remounts on resume), and is a no-op on a headless
 * relaunch (no components mount there). Tap anywhere to skip straight to the
 * fade. Reduced-motion: query AccessibilityInfo once; if on, hold the
 * completed static mark for REDUCED_MOTION_HOLD_MS then fade. Nothing starts
 * until the query resolves (sub-frame in practice); the resolved value then
 * picks the path.
 *
 * Cycle 024 (WP-A2, Nathan 2026-08-19): also plays REVERSED on END — "the
 * yellow line gets undrawn and then the circle gets undrawn as well." `p`
 * and `slash` are the SAME two Animated.Values either way (0..1); reverse
 * just mounts them at 1 (the completed mark) and animates them back down to
 * 0, tail first then ring — the existing rightRotate/leftRotate/slashOpacity
 * interpolations already read symmetrically in both directions, so no new
 * geometry is needed, only a different animation sequence and start point.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from './themeContext';
import { PaddockTheme } from './theme';
import {
  RING_MS, SLASH_DELAY_MS, SLASH_MS, FADE_MS, REDUCED_MOTION_HOLD_MS, RING_BEZIER,
  REV_SLASH_MS, REV_RING_DELAY_MS, REV_RING_MS,
  RIGHT_INPUT_RANGE, RIGHT_OUTPUT_RANGE, LEFT_INPUT_RANGE, LEFT_OUTPUT_RANGE,
  HEMISPHERE_STATIC_OFFSET_DEG, markGeometry, MarkGeometry,
} from './launchChoreo';

const MARK_SIZE = 150; // dp — matches the marketing hero's .hero-mark box

export function LaunchAnimation({ onDone, reverse = false }: { onDone: () => void; reverse?: boolean }) {
  const { t } = useTheme();
  const geo = useMemo(() => markGeometry(MARK_SIZE), []);

  // Forward starts undrawn (0) and animates up to the completed mark (1);
  // reverse starts AT the completed mark (1) and animates back down to 0.
  const p = useRef(new Animated.Value(reverse ? 1 : 0)).current; // ring sweep
  const slash = useRef(new Animated.Value(reverse ? 1 : 0)).current; // slash growth/undraw
  const fade = useRef(new Animated.Value(1)).current; // overlay opacity

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduceMotion(v); })
      .catch(() => { if (live) setReduceMotion(false); });
    return () => { live = false; };
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  useEffect(() => {
    if (reduceMotion === null) return; // still resolving — default is animating (below)
    if (reduceMotion) {
      // Forward: jump straight to the completed mark. Reverse: already
      // mounted AT the completed mark (p/slash start at 1) — hold it as-is,
      // no undraw animation, per Nathan's pre-resolved ruling (no reversed
      // motion at all under reduced-motion, only the hold + fade).
      if (!reverse) {
        p.setValue(1);
        slash.setValue(1);
      }
      const id = setTimeout(finish, REDUCED_MOTION_HOLD_MS);
      return () => clearTimeout(id);
    }
    const ringBezier = Easing.bezier(RING_BEZIER[0], RING_BEZIER[1], RING_BEZIER[2], RING_BEZIER[3]);
    const anim = reverse
      ? Animated.parallel([
          // Tail undraws first, no delay (mockup: qf-undraw-tail, ease-in).
          Animated.timing(slash, {
            toValue: 0,
            duration: REV_SLASH_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          // Ring undraw starts REV_RING_DELAY_MS later (mockup: qf-undraw-ring).
          Animated.sequence([
            Animated.delay(REV_RING_DELAY_MS),
            Animated.timing(p, {
              toValue: 0,
              duration: REV_RING_MS,
              easing: ringBezier,
              useNativeDriver: true,
            }),
          ]),
        ])
      : Animated.parallel([
          Animated.timing(p, {
            toValue: 1,
            duration: RING_MS,
            easing: ringBezier,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(SLASH_DELAY_MS),
            Animated.timing(slash, {
              toValue: 1,
              duration: SLASH_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);
    anim.start(({ finished: ok }) => { if (ok) finish(); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, reverse]);

  // Tap-to-skip: snap to this direction's END state and start the fade
  // immediately — forward's end is the completed mark (1); reverse's end is
  // the fully-undrawn mark (0).
  const skip = () => {
    p.stopAnimation();
    slash.stopAnimation();
    const end = reverse ? 0 : 1;
    p.setValue(end);
    slash.setValue(end);
    finish();
  };

  const rightRotate = p.interpolate({
    inputRange: RIGHT_INPUT_RANGE, outputRange: [`${RIGHT_OUTPUT_RANGE[0]}deg`, `${RIGHT_OUTPUT_RANGE[1]}deg`],
    extrapolate: 'clamp',
  });
  const leftRotate = p.interpolate({
    inputRange: LEFT_INPUT_RANGE, outputRange: [`${LEFT_OUTPUT_RANGE[0]}deg`, `${LEFT_OUTPUT_RANGE[1]}deg`],
    extrapolate: 'clamp',
  });
  const slashInnerTranslate = slash.interpolate({ inputRange: [0, 1], outputRange: [-geo.slashLen / 2, 0] });
  const slashOpacity = slash.interpolate({ inputRange: [0, 0.001, 1], outputRange: [0, 1, 1] });

  const s = useMemo(() => makeStyles(t, geo), [t, geo]);

  return (
    <Animated.View style={[s.overlay, { opacity: fade }]} onTouchStart={skip}>
      <View style={s.markBox}>
        <View style={s.rightClip}>
          <Animated.View
            style={[
              s.hemisphereCircle,
              s.hemisphereRight,
              { transform: [{ rotate: `${HEMISPHERE_STATIC_OFFSET_DEG}deg` }, { rotate: rightRotate }] },
            ]}
          />
        </View>
        <View style={s.leftClip}>
          <Animated.View
            style={[
              s.hemisphereCircle,
              s.hemisphereLeft,
              { transform: [{ rotate: `${HEMISPHERE_STATIC_OFFSET_DEG}deg` }, { rotate: leftRotate }] },
            ]}
          />
        </View>
        <Animated.View
          style={[
            s.slash,
            {
              opacity: slashOpacity,
              transform: [
                { translateX: geo.slashCenterX },
                { translateY: geo.slashCenterY },
                { rotate: `${geo.slashAngleDeg}deg` },
                { translateX: slashInnerTranslate },
                { scaleX: slash },
              ],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const makeStyles = (t: PaddockTheme, geo: MarkGeometry) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: t.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markBox: {
      width: geo.ringDiameter,
      height: geo.ringDiameter,
    },
    rightClip: {
      position: 'absolute',
      left: geo.ringDiameter / 2,
      top: 0,
      width: geo.ringDiameter / 2,
      height: geo.ringDiameter,
      overflow: 'hidden',
    },
    leftClip: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: geo.ringDiameter / 2,
      height: geo.ringDiameter,
      overflow: 'hidden',
    },
    hemisphereCircle: {
      position: 'absolute',
      top: 0,
      width: geo.ringDiameter,
      height: geo.ringDiameter,
      borderRadius: geo.ringDiameter / 2,
      borderWidth: geo.ringThickness,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'transparent',
    },
    // Right hemisphere lives in the right-half clip, so the circle sits
    // shifted left by half its own width to re-centre on the mark box.
    hemisphereRight: {
      left: -geo.ringDiameter / 2,
      borderTopColor: t.text,
      borderRightColor: t.text,
    },
    // Left hemisphere's clip already starts at x=0, no offset needed.
    hemisphereLeft: {
      left: 0,
      borderBottomColor: t.text,
      borderLeftColor: t.text,
    },
    slash: {
      position: 'absolute',
      top: geo.ringDiameter / 2 - geo.slashThickness / 2,
      left: geo.ringDiameter / 2 - geo.slashLen / 2,
      width: geo.slashLen,
      height: geo.slashThickness,
      backgroundColor: t.accent, // site draws the tail in yellow — keep that mapping
    },
  });
