/**
 * Runtime theme switching (Nathan 2026-08-15): DAYLIGHT default, NIGHT via
 * toggle on the Record screen. Persisted to <documents>/qualifire/settings.json
 * via expo-file-system (no AsyncStorage in the dev build). Race mode follows
 * the theme (t.race) — one toggle, two complete worlds.
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
}

const Ctx = createContext<ThemeCtx>({ t: daylight, mode: 'daylight', toggleMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('daylight');

  useEffect(() => {
    loadMode().then(setMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'daylight' ? 'night' : 'daylight';
      saveMode(next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ t: mode === 'daylight' ? daylight : night, mode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
