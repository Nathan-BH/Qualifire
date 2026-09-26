/**
 * virgin-cycle14 brief 01: applies the auto day/night schedule. Mounted once in
 * App.tsx inside SettingsProvider (it reads settings) and inside ThemeProvider
 * (it writes the mode). Re-evaluates on: mount, settings change, a timer aimed
 * at the next boundary (+1 s slop), AppState -> 'active', and the tracker's
 * session clearing. Never switches while a ride is recording; never overrides
 * a manual pick made after the last boundary (or after auto was turned on).
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getStatus, subscribe } from '../location';
import { boundariesAround } from './autoTheme';
import { useSettings } from './settings';
import { useTheme } from './themeContext';

export function AutoThemeScheduler() {
  const { s } = useSettings();
  const { mode, manualAt, applyScheduledMode } = useTheme();
  const [tick, setTick] = useState(0);
  const enabledSince = useRef<number | null>(null);

  // Remember when auto was switched on this launch: a pick older than that is stale.
  useEffect(() => {
    enabledSince.current = s.autoTheme ? Date.now() : null;
  }, [s.autoTheme]);

  useEffect(() => {
    if (!s.autoTheme) return;
    const b = boundariesAround(Date.now(), s.dayStart, s.dayEnd);
    if (b === null) return; // invalid schedule: inert until fixed
    const recording = getStatus().session !== null;
    const threshold = Math.max(b.prevMs, enabledSince.current ?? 0);
    const overridden = manualAt !== null && manualAt >= threshold;
    if (!recording && !overridden && mode !== b.mode) applyScheduledMode(b.mode);

    const bump = () => setTick((n) => n + 1);
    const timer = setTimeout(bump, Math.max(1000, b.nextMs - Date.now() + 1000));
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') bump(); });
    let wasRecording = recording;
    const unsub = subscribe((st) => {
      const now = st.session !== null;
      if (wasRecording && !now) bump(); // ride just stopped: apply the deferred switch
      wasRecording = now;
    });
    return () => { clearTimeout(timer); app.remove(); unsub(); };
  }, [s.autoTheme, s.dayStart, s.dayEnd, mode, manualAt, tick, applyScheduledMode]);

  return null;
}
