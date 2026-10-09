/**
 * virgin-cycle27 12 (Nathan 2026-10-09, white flash on every tab switch): a themed cover over a
 * native MapLibre view. `useMapCover(key, styleFailed)` keeps one cover per native mount (the
 * caller passes its <M.Map> key: a key change is a native remount and gets a fresh, opaque
 * cover); the caller wires `onStyleLoaded` into onDidFinishLoadingStyle and `onFrameFully` into
 * onDidFinishRenderingFrameFully. The decision is mapCoverModel.ts (pure); this file only
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
  onFrameFully: () => void;
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
  const seen = useMemo(() => ({ styleLoaded: false, frameRendered: false, lifted: false }), [key]);
  const keyRef = useRef(key);
  keyRef.current = key;
  const [goneKey, setGoneKey] = useState<string | null>(null);

  const lift = useCallback(() => {
    if (seen.lifted) return;
    seen.lifted = true;
    if (reduceMotion) {
      opacity.setValue(0);
      setGoneKey(key);
      return;
    }
    Animated.timing(opacity, {
      toValue: 0, duration: MAP_COVER_FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start(() => { if (keyRef.current === key) setGoneKey(key); });
  }, [key, opacity, seen, reduceMotion]);

  const decide = useCallback((timedOut: boolean) => {
    if (mapCoverLifts({ styleFailed, styleLoaded: seen.styleLoaded, frameRendered: seen.frameRendered, timedOut })) lift();
  }, [styleFailed, seen, lift]);

  useEffect(() => {
    decide(false);
    const timer = setTimeout(() => decide(true), MAP_COVER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [key, decide]);

  const onStyleLoaded = useCallback(() => { seen.styleLoaded = true; decide(false); }, [seen, decide]);
  const onFrameFully = useCallback(() => { seen.frameRendered = true; decide(false); }, [seen, decide]);

  return { covered: goneKey !== key, opacity, onStyleLoaded, onFrameFully };
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
