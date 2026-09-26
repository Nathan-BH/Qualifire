/**
 * Runtime theme switching (Nathan 2026-08-15): DAYLIGHT default, NIGHT via
 * toggle on the Record screen. Persisted to <documents>/qualifire/settings.json
 * via expo-file-system (no AsyncStorage in the dev build). Race mode follows
 * the theme (t.race) — one toggle, two complete worlds.
 * virgin-cycle14 brief 01: `pickMode`/`applyScheduledMode`/`manualAt` for the
 * auto day/night schedule (schedule itself lives in settings.tsx +
 * autoThemeScheduler.tsx).
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { PaddockTheme, daylight, night } from './theme';

export type ThemeMode = 'daylight' | 'night';

function settingsFile(): File {
  return new File(new Directory(Paths.document, 'qualifire'), 'settings.json');
}

async function loadMode(): Promise<ThemeMode> {
  try {
    const f = settingsFile();
    if (f.exists) {
      const parsed = JSON.parse(await f.text()) as { themeMode?: string };
      if (parsed.themeMode === 'night') return 'night';
    }
  } catch {
    // unreadable settings — fall through to default
  }
  return 'daylight';
}

function saveMode(mode: ThemeMode): void {
  try {
    const dir = new Directory(Paths.document, 'qualifire');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const f = settingsFile();
    if (!f.exists) f.create({ intermediates: true });
    f.write(JSON.stringify({ themeMode: mode }));
  } catch {
    // persistence is best-effort; the session keeps the in-memory choice
  }
}

interface ThemeCtx {
  t: PaddockTheme;
  mode: ThemeMode;
  toggleMode: () => void;
  /** User's explicit pick (Seg row / RECORD pill). Records manualAt. */
  pickMode: (m: ThemeMode) => void;
  /** The auto-schedule's write: same as pickMode but does NOT touch manualAt. */
  applyScheduledMode: (m: ThemeMode) => void;
  /** Date.now() of the last user pick this JS launch; null if none. In-memory only. */
  manualAt: number | null;
}

const Ctx = createContext<ThemeCtx>({
  t: daylight,
  mode: 'daylight',
  toggleMode: () => {},
  pickMode: () => {},
  applyScheduledMode: () => {},
  manualAt: null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('daylight');
  const [manualAt, setManualAt] = useState<number | null>(null);

  useEffect(() => {
    loadMode().then(setMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'daylight' ? 'night' : 'daylight';
      saveMode(next);
      return next;
    });
    setManualAt(Date.now());
  }, []);

  const pickMode = useCallback((m: ThemeMode) => {
    saveMode(m);
    setMode(m);
    setManualAt(Date.now());
  }, []);

  const applyScheduledMode = useCallback((m: ThemeMode) => {
    saveMode(m);
    setMode(m);
  }, []);

  return (
    <Ctx.Provider value={{ t: mode === 'daylight' ? daylight : night, mode, toggleMode, pickMode, applyScheduledMode, manualAt }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
