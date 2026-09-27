/**
 * virgin-cycle14 brief 01 — pure-maths suite for the auto day/night schedule
 * model in `autoTheme.ts`. No RN involved: these are the exact minute-boundary
 * numbers `autoThemeScheduler.tsx` drives the theme switch from.
 */
import { assert, test } from './lib.ts';
import { parseHHMM, formatHHMM, themeForTime, boundariesAround, pushTimeDigit, digitsFromText, displayTime, digitsAfterEdit } from '../src/ui/autoTheme.ts';

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

test('autoTheme: pushTimeDigit first digit', () => {
  assert(pushTimeDigit('', '7') === '07', `expected 07, got ${pushTimeDigit('', '7')}`);
  assert(pushTimeDigit('', '9') === '09', `expected 09, got ${pushTimeDigit('', '9')}`);
  assert(pushTimeDigit('', '3') === '03', `expected 03, got ${pushTimeDigit('', '3')}`);
  assert(pushTimeDigit('', '0') === '0', `expected 0, got ${pushTimeDigit('', '0')}`);
  assert(pushTimeDigit('', '1') === '1', `expected 1, got ${pushTimeDigit('', '1')}`);
  assert(pushTimeDigit('', '2') === '2', `expected 2, got ${pushTimeDigit('', '2')}`);
});

test('autoTheme: pushTimeDigit second hour digit', () => {
  assert(pushTimeDigit('1', '9') === '19', `expected 19, got ${pushTimeDigit('1', '9')}`);
  assert(pushTimeDigit('2', '3') === '23', `expected 23, got ${pushTimeDigit('2', '3')}`);
  assert(pushTimeDigit('0', '0') === '00', `expected 00, got ${pushTimeDigit('0', '0')}`);
  assert(pushTimeDigit('2', '4') === '2', `expected 2 (refused), got ${pushTimeDigit('2', '4')}`);
  assert(pushTimeDigit('2', '9') === '2', `expected 2 (refused), got ${pushTimeDigit('2', '9')}`);
});

test('autoTheme: pushTimeDigit minutes', () => {
  assert(pushTimeDigit('19', '5') === '195', `expected 195, got ${pushTimeDigit('19', '5')}`);
  assert(pushTimeDigit('19', '0') === '190', `expected 190, got ${pushTimeDigit('19', '0')}`);
  assert(pushTimeDigit('19', '6') === '19', `expected 19 (refused), got ${pushTimeDigit('19', '6')}`);
  assert(pushTimeDigit('19', '9') === '19', `expected 19 (refused), got ${pushTimeDigit('19', '9')}`);
  assert(pushTimeDigit('195', '9') === '1959', `expected 1959, got ${pushTimeDigit('195', '9')}`);
  assert(pushTimeDigit('070', '0') === '0700', `expected 0700, got ${pushTimeDigit('070', '0')}`);
});

test('autoTheme: pushTimeDigit full buffer and junk input', () => {
  assert(pushTimeDigit('1959', '0') === '1959', `expected 1959 (full), got ${pushTimeDigit('1959', '0')}`);
  assert(pushTimeDigit('', 'a') === '', `expected '' (non-digit), got ${pushTimeDigit('', 'a')}`);
  assert(pushTimeDigit('07', ':') === '07', `expected 07 (non-digit), got ${pushTimeDigit('07', ':')}`);
  assert(pushTimeDigit('07', ' ') === '07', `expected 07 (non-digit), got ${pushTimeDigit('07', ' ')}`);
});

test('autoTheme: digitsFromText', () => {
  assert(digitsFromText('07:00') === '0700', `expected 0700, got ${digitsFromText('07:00')}`);
  assert(digitsFromText('9:00') === '0900', `expected 0900, got ${digitsFromText('9:00')}`);
  assert(digitsFromText('7') === '07', `expected 07, got ${digitsFromText('7')}`);
  assert(digitsFromText('7000') === '0700', `expected 0700 (4th 0 dropped), got ${digitsFromText('7000')}`);
  assert(digitsFromText('0700') === '0700', `expected 0700, got ${digitsFromText('0700')}`);
  assert(digitsFromText('') === '', `expected '', got ${digitsFromText('')}`);
  assert(digitsFromText(':') === '', `expected '', got ${digitsFromText(':')}`);
  assert(digitsFromText('07:') === '07', `expected 07, got ${digitsFromText('07:')}`);
  assert(digitsFromText('25:00') === '200', `expected 200 (5 skipped), got ${digitsFromText('25:00')}`);
  assert(digitsFromText('07:0a') === '070', `expected 070, got ${digitsFromText('07:0a')}`);
  assert(digitsFromText('1959') === '1959', `expected 1959, got ${digitsFromText('1959')}`);
});

test('autoTheme: displayTime', () => {
  assert(displayTime('') === ':', `expected ':', got ${displayTime('')}`);
  assert(displayTime('0') === '0:', `expected '0:', got ${displayTime('0')}`);
  assert(displayTime('07') === '07:', `expected '07:', got ${displayTime('07')}`);
  assert(displayTime('070') === '07:0', `expected '07:0', got ${displayTime('070')}`);
  assert(displayTime('0700') === '07:00', `expected '07:00', got ${displayTime('0700')}`);
  assert(displayTime('1959') === '19:59', `expected '19:59', got ${displayTime('1959')}`);
});

test('autoTheme: displayTime/digitsFromText round trip', () => {
  for (const s of ['00:00', '07:00', '09:05', '19:00', '23:59']) {
    const d = digitsFromText(s);
    assert(displayTime(d) === s, `round trip mismatch for ${s}: got ${displayTime(d)}`);
    const parsed = parseHHMM(displayTime(d));
    assert(parsed !== null && formatHHMM(parsed) === s, `parse round trip mismatch for ${s}`);
  }
});

test('autoTheme: every full buffer parses (1440 iterations)', () => {
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      const hhmm = formatHHMM(h * 60 + m);
      let digits = '';
      for (const ch of hhmm) {
        if (ch === ':') continue;
        digits = pushTimeDigit(digits, ch);
      }
      assert(digits.length === 4, `did not fill 4 digits for ${hhmm}, got '${digits}'`);
      const parsed = parseHHMM(displayTime(digits));
      assert(parsed === h * 60 + m, `round trip mismatch for ${hhmm}: got ${parsed}`);
    }
  }
});

test('autoTheme: digitsAfterEdit backspace-over-colon rule', () => {
  assert(digitsAfterEdit('07', '07') === '0', `expected 0, got ${digitsAfterEdit('07', '07')}`);
  assert(digitsAfterEdit('0', '0') === '', `expected '', got ${digitsAfterEdit('0', '0')}`);
  assert(digitsAfterEdit('', '') === '', `expected '', got ${digitsAfterEdit('', '')}`);
});

test('autoTheme: digitsAfterEdit ordinary path', () => {
  assert(digitsAfterEdit('0700', '07:0') === '070', `expected 070, got ${digitsAfterEdit('0700', '07:0')}`);
  assert(digitsAfterEdit('070', '07:00') === '0700', `expected 0700, got ${digitsAfterEdit('070', '07:00')}`);
  assert(digitsAfterEdit('07', '07:') === '07', `expected 07 (no change), got ${digitsAfterEdit('07', '07:')}`);
  assert(digitsAfterEdit('0700', '0700') === '070', `expected 070 (colon deleted mid-string), got ${digitsAfterEdit('0700', '0700')}`);
  assert(digitsAfterEdit('0700', '0:00') === '000', `expected 000 (re-flow), got ${digitsAfterEdit('0700', '0:00')}`);
  assert(digitsAfterEdit('', '7') === '07', `expected 07, got ${digitsAfterEdit('', '7')}`);
  assert(digitsAfterEdit('07', '07:0a') === '070', `expected 070, got ${digitsAfterEdit('07', '07:0a')}`);
});
