/**
 * virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): a themed cover over a
 * native MapLibre view. `useMapCover(key, styleFailed)` keeps one cover per native mount (the
 * caller passes its <M.Map> key: a key change is a native remount and gets a fresh, opaque
 * cover); the caller wires `onStyleLoaded` into onDidFinishLoadingStyle and `onFirstFrame` into
 * BOTH onDidFinishRenderingFrame and onDidFinishRenderingFrameFully (whichever fires first lifts it;
 * the handler is idempotent). The decision is mapCoverModel.ts (pure); this file only
 * animates it: a 200 ms opacity fade on the native driver, or an instant hide when the OS
 * reduce-motion setting is on (same AccessibilityInfo pattern as chips.tsx). The element is
 * pointerEvents none and must be rendered AFTER the map and BEFORE the zoom bar / credit, so it
 * sits above the map and below every control. Blank on purpose: no text, no spinner, nothing a
 * rider could read as a state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';
import { MAP_COVER_FADE_MS, MAP_COVER_TIMEOUT_MS, mapCoverLifts } from './mapCoverModel.ts';

export interface MapCoverState {
  /** True while the cover element should be mounted (opaque or still fading). */
  covered: boolean;
  opacity: Animated.Value;
  onStyleLoaded: () => void;
  onFirstFrame: () => void;
}

export function useMapCover(key: string, styleFailed: boolean): MapCoverState {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduceMotion(v); })
      .catch(() => { /* default: animate */ });
    return () => { live = false; };
  }, []);
  // One opacity value and one set of signals per native mount (per key).
  const opacity = useMemo(() => new Animated.Value(1), [key]);
  const seen = useMemo(() => ({ styleLoaded: false, firstFrame: false, lifted: false, gone: false }), [key]);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [, bump] = useState(0);

  const lift = useCallback(() => {
    if (seen.lifted) return;
    seen.lifted = true;
    if (reduceMotion) {
      opacity.setValue(0);
      seen.gone = true;
      bump((v) => v + 1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 0, duration: MAP_COVER_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start(() => { if (keyRef.current === key) { seen.gone = true; bump((v) => v + 1); } });
  }, [key, opacity, seen, reduceMotion]);

  const decide = useCallback((timedOut: boolean) => {
    if (mapCoverLifts({ styleFailed, styleLoaded: seen.styleLoaded, firstFrame: seen.firstFrame, timedOut })) lift();
  }, [styleFailed, seen, lift]);

  useEffect(() => {
    decide(false);
    const timer = setTimeout(() => decide(true), MAP_COVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [key, decide]);

  const onStyleLoaded = useCallback(() => { seen.styleLoaded = true; decide(false); }, [seen, decide]);
  // Inspector M1 (cycle29 01): a frame reported BEFORE the style has loaded is not the frame that paints the background; ignore it.
  const onFirstFrame = useCallback(() => { if (!seen.styleLoaded) return; seen.firstFrame = true; decide(false); }, [seen, decide]);

  return { covered: !seen.gone, opacity, onStyleLoaded, onFirstFrame };
}

/** The cover itself: absolute-fill, theme map colour, no touch. Null once gone. */
export function MapCover(props: { cover: MapCoverState; color: string }) {
  if (!props.cover.covered) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: props.color, opacity: props.cover.opacity }]}
    />
  );
}
