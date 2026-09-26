/**
 * virgin-cycle14 brief 01: pure schedule model for the auto day/night theme.
 * No react-native/expo imports — headless-testable. Times are "HH:MM",
 * device-local. See ui/settings.tsx (the switch + fields) and
 * ui/autoThemeScheduler.tsx (the effect that applies this model).
 */
import type { ThemeMode } from './themeContext.tsx';

export const DEFAULT_DAY_START = '09:00';
export const DEFAULT_DAY_END = '19:00';

/** "9:00" | "09:00" -> minutes since midnight; null for anything else
 * (hours 0-23, minutes 00-59, exactly one colon, no seconds, no spaces). */
export function parseHHMM(s: string): number | null {
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
  if (m === null) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

/** minutes since midnight -> "HH:MM" (zero-padded). */
export function formatHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Mode at `now` (Date or epoch ms, LOCAL time) for a day window. null when either
 * time fails parseHHMM or start === end. Day iff start <= m < end; when start > end
 * the window wraps midnight: day iff m >= start || m < end. */
export function themeForTime(now: Date | number, dayStart: string, dayEnd: string): ThemeMode | null {
  const startM = parseHHMM(dayStart);
  const endM = parseHHMM(dayEnd);
  if (startM === null || endM === null || startM === endM) return null;
  const d = typeof now === 'number' ? new Date(now) : now;
  const m = d.getHours() * 60 + d.getMinutes();
  const isDay = startM < endM ? (m >= startM && m < endM) : (m >= startM || m < endM);
  return isDay ? 'daylight' : 'night';
}

/** The boundary just passed and the next one, as epoch ms in LOCAL time (built with the
 * Date(y, mo, d, h, mi) constructor — never UTC arithmetic), plus the mode right now.
 * prevMs <= nowMs < nextMs; nextMs - nowMs <= 24h. null under the same conditions as
 * themeForTime. Candidates are dayStart and dayEnd on yesterday, today and tomorrow. */
export function boundariesAround(now: Date | number, dayStart: string, dayEnd: string):
  { mode: ThemeMode; prevMs: number; nextMs: number } | null {
  const startM = parseHHMM(dayStart);
  const endM = parseHHMM(dayEnd);
  if (startM === null || endM === null || startM === endM) return null;
  const d = typeof now === 'number' ? new Date(now) : now;
  const nowMs = d.getTime();

  const atLocal = (dayOffset: number, minutesSinceMidnight: number): number => {
    const h = Math.floor(minutesSinceMidnight / 60);
    const mi = minutesSinceMidnight % 60;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, mi, 0, 0).getTime();
  };

  const candidates: number[] = [];
  for (const offset of [-1, 0, 1]) {
    candidates.push(atLocal(offset, startM));
    candidates.push(atLocal(offset, endM));
  }

  let prevMs = -Infinity;
  let nextMs = Infinity;
  for (const c of candidates) {
    if (c <= nowMs && c > prevMs) prevMs = c;
    if (c > nowMs && c < nextMs) nextMs = c;
  }

  const mode = themeForTime(now, dayStart, dayEnd);
  if (mode === null) return null;
  return { mode, prevMs, nextMs };
}
