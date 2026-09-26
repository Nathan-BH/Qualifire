/**
 * virgin-cycle14 brief 01 — pure-maths suite for the auto day/night schedule
 * model in `autoTheme.ts`. No RN involved: these are the exact minute-boundary
 * numbers `autoThemeScheduler.tsx` drives the theme switch from.
 */
import { assert, test } from './lib.ts';
import { parseHHMM, formatHHMM, themeForTime, boundariesAround } from '../src/ui/autoTheme.ts';

test('autoTheme: parseHHMM accepts valid HH:MM and lenient H:MM', () => {
  assert(parseHHMM('09:00') === 540, `expected 540, got ${parseHHMM('09:00')}`);
  assert(parseHHMM('9:00') === 540, `expected 540, got ${parseHHMM('9:00')}`);
  assert(parseHHMM('00:00') === 0, `expected 0, got ${parseHHMM('00:00')}`);
  assert(parseHHMM('23:59') === 1439, `expected 1439, got ${parseHHMM('23:59')}`);
});

test('autoTheme: parseHHMM rejects malformed strings', () => {
  for (const s of ['24:00', '09:60', '0900', '9', '', '09:00:00', ' 09:00', 'ab:cd']) {
    const got = parseHHMM(s);
    assert(got === null, `expected null for ${JSON.stringify(s)}, got ${got}`);
  }
});

test('autoTheme: formatHHMM zero-pads and round-trips', () => {
  assert(formatHHMM(0) === '00:00', `expected '00:00', got ${formatHHMM(0)}`);
  assert(formatHHMM(540) === '09:00', `expected '09:00', got ${formatHHMM(540)}`);
  assert(formatHHMM(1439) === '23:59', `expected '23:59', got ${formatHHMM(1439)}`);
  const rt = formatHHMM(parseHHMM('9:05')!);
  assert(rt === '09:05', `round-trip expected '09:05', got ${rt}`);
});

test('autoTheme: themeForTime normal window 09:00-19:00', () => {
  const cases: Array<[number, number, 'daylight' | 'night']> = [
    [8, 59, 'night'], [9, 0, 'daylight'], [12, 0, 'daylight'], [18, 59, 'daylight'],
    [19, 0, 'night'], [23, 0, 'night'], [0, 0, 'night'],
  ];
  for (const [h, m, expected] of cases) {
    const got = themeForTime(new Date(2026, 8, 25, h, m), '09:00', '19:00');
    assert(got === expected, `at ${h}:${m} expected ${expected}, got ${got}`);
  }
});

test('autoTheme: themeForTime wrap-midnight window 22:00-06:00', () => {
  const cases: Array<[number, number, 'daylight' | 'night']> = [
    [22, 0, 'daylight'], [23, 30, 'daylight'], [0, 0, 'daylight'], [5, 59, 'daylight'],
    [6, 0, 'night'], [12, 0, 'night'], [21, 59, 'night'],
  ];
  for (const [h, m, expected] of cases) {
    const got = themeForTime(new Date(2026, 8, 25, h, m), '22:00', '06:00');
    assert(got === expected, `at ${h}:${m} expected ${expected}, got ${got}`);
  }
});

test('autoTheme: themeForTime is null for equal or invalid times', () => {
  const now = new Date(2026, 8, 25, 12, 0);
  assert(themeForTime(now, '09:00', '09:00') === null, 'equal times must be null');
  assert(themeForTime(now, 'abc', '19:00') === null, 'invalid start must be null');
  assert(themeForTime(now, '09:00', '25:00') === null, 'invalid end must be null');
  assert(themeForTime(now, '', '') === null, 'empty strings must be null');
});

test('autoTheme: boundariesAround normal window 09:00-19:00', () => {
  const noon = new Date(2026, 8, 25, 12, 0);
  let b = boundariesAround(noon, '09:00', '19:00');
  assert(b !== null && b.mode === 'daylight', `noon: expected daylight, got ${b?.mode}`);
  assert(b!.prevMs === new Date(2026, 8, 25, 9, 0).getTime(), 'noon prevMs mismatch');
  assert(b!.nextMs === new Date(2026, 8, 25, 19, 0).getTime(), 'noon nextMs mismatch');

  const evening = new Date(2026, 8, 25, 20, 0);
  b = boundariesAround(evening, '09:00', '19:00');
  assert(b !== null && b.mode === 'night', `20:00: expected night, got ${b?.mode}`);
  assert(b!.prevMs === new Date(2026, 8, 25, 19, 0).getTime(), '20:00 prevMs mismatch');
  assert(b!.nextMs === new Date(2026, 8, 26, 9, 0).getTime(), '20:00 nextMs mismatch');

  const smallHours = new Date(2026, 8, 25, 3, 0);
  b = boundariesAround(smallHours, '09:00', '19:00');
  assert(b !== null && b.mode === 'night', `03:00: expected night, got ${b?.mode}`);
  assert(b!.prevMs === new Date(2026, 8, 24, 19, 0).getTime(), '03:00 prevMs mismatch');
  assert(b!.nextMs === new Date(2026, 8, 25, 9, 0).getTime(), '03:00 nextMs mismatch');

  const boundary = new Date(2026, 8, 25, 9, 0);
  b = boundariesAround(boundary, '09:00', '19:00');
  assert(b !== null && b.mode === 'daylight', `09:00 boundary: expected daylight, got ${b?.mode}`);
  assert(b!.prevMs === new Date(2026, 8, 25, 9, 0).getTime(), '09:00 boundary prevMs mismatch (prev <= now)');
  assert(b!.nextMs === new Date(2026, 8, 25, 19, 0).getTime(), '09:00 boundary nextMs mismatch');

  for (const now of [noon, evening, smallHours, boundary]) {
    const bb = boundariesAround(now, '09:00', '19:00')!;
    assert(bb.prevMs <= now.getTime(), `prevMs must be <= nowMs for ${now.toISOString()}`);
    assert(bb.nextMs > now.getTime(), `nextMs must be > nowMs for ${now.toISOString()}`);
    assert(bb.nextMs - now.getTime() <= 24 * 3600 * 1000, `nextMs - nowMs must be <= 24h for ${now.toISOString()}`);
  }
});

test('autoTheme: boundariesAround wrap-midnight window 22:00-06:00', () => {
  const now = new Date(2026, 8, 25, 23, 0);
  const b = boundariesAround(now, '22:00', '06:00');
  assert(b !== null && b.mode === 'daylight', `23:00 wrap: expected daylight, got ${b?.mode}`);
  assert(b!.prevMs === new Date(2026, 8, 25, 22, 0).getTime(), '23:00 wrap prevMs mismatch');
  assert(b!.nextMs === new Date(2026, 8, 26, 6, 0).getTime(), '23:00 wrap nextMs mismatch');
});

test('autoTheme: boundariesAround is null for invalid or equal schedule', () => {
  const now = new Date(2026, 8, 25, 12, 0);
  assert(boundariesAround(now, '09:00', '09:00') === null, 'equal times must be null');
  assert(boundariesAround(now, 'abc', '19:00') === null, 'invalid start must be null');
  assert(boundariesAround(now, '09:00', '25:00') === null, 'invalid end must be null');
});
