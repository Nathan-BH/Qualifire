/**
 * virgin-cycle14 brief 01: pure schedule model for the auto day/night theme.
 * No react-native/expo imports — headless-testable. Times are "HH:MM",
 * device-local. See ui/settings.tsx (the switch + fields) and
 * ui/autoThemeScheduler.tsx (the effect that applies this model).
 */
/** virgin-cycle15 brief 01: `pushTimeDigit`/`digitsFromText`/`displayTime`/`digitsAfterEdit` back the
 * fixed-colon field in settings.tsx. */
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

/** virgin-cycle15 brief 01: fixed-colon time entry. The field's state is a
 * left-filled buffer of 0-4 digits; the colon is display only.
 * Feed one character into the buffer. Returns the new buffer, or the same
 * string when the character is refused. Rules: first digit 3-9 is a one-digit
 * hour ("7" -> "07"); a second hour digit making 24-29 is refused; minute tens
 * 6-9 refused; a 5th digit refused; non-digits refused. */
export function pushTimeDigit(digits: string, ch: string): string {
  if (!/^[0-9]$/.test(ch)) return digits;
  if (digits.length >= 4) return digits;
  if (digits.length === 0) {
    if (ch >= '3' && ch <= '9') return '0' + ch;
    return ch;
  }
  if (digits.length === 1) {
    const hour = Number(digits + ch);
    if (hour > 23) return digits;
    return digits + ch;
  }
  if (digits.length === 2) {
    if (ch > '5') return digits;
    return digits + ch;
  }
  // digits.length === 3
  return digits + ch;
}

/** Any text the native field reports -> canonical buffer: keep only digits and
 * replay them through pushTimeDigit from empty (refused digits are skipped,
 * later ones still land -- same as typing them one by one). */
export function digitsFromText(raw: string): string {
  let digits = '';
  for (const ch of raw) {
    if (/^[0-9]$/.test(ch)) digits = pushTimeDigit(digits, ch);
  }
  return digits;
}

/** Buffer -> what the field shows: "" -> ":", "07" -> "07:", "070" -> "07:0",
 * "0700" -> "07:00". */
export function displayTime(digits: string): string {
  return digits.slice(0, 2) + ':' + digits.slice(2);
}

/** Reported native text after an edit -> new buffer, given the buffer before
 * the edit. The one special case: digits unchanged, colon gone, buffer
 * non-empty = the user backspaced over the colon -> drop the last digit.
 * Everything else is digitsFromText(raw). */
export function digitsAfterEdit(prevDigits: string, raw: string): string {
  const rawDigits = raw.replace(/[^0-9]/g, '');
  if (rawDigits === prevDigits && !raw.includes(':') && prevDigits.length > 0) {
    return prevDigits.slice(0, -1);
  }
  return digitsFromText(raw);
}
