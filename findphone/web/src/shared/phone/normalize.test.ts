import { describe, expect, test } from 'vitest';
import vectors from '../../../../shared/phone-vectors.json';
import { countries } from './countries';
import { maskNumber } from './mask';
import { formatNational, parsePhone } from './normalize';

describe('shared/phone-vectors.json (same cases as the Dart suite)', () => {
  test.each(vectors.cases)('$country "$input"', (c) => {
    const r = parsePhone(c.input, c.country);
    const actual = r.ok ? r.number.e164 : `error:${r.error}`;
    const expected = 'e164' in c && c.e164 ? c.e164 : `error:${(c as { error: string }).error}`;
    expect(actual).toBe(expected);
  });
});

test('every result is a valid document id under the rules regex', () => {
  for (const c of vectors.cases) {
    if ('e164' in c && c.e164) expect(c.e164).toMatch(/^[+][1-9][0-9]{6,14}$/);
  }
});

test('every country example validates for its own country', () => {
  for (const c of countries) {
    expect(parsePhone(c.example, c.iso).ok, c.iso).toBe(true);
  }
});

test('formatting and masking', () => {
  const r = parsePhone('9876543210', 'IN');
  if (!r.ok) throw new Error('expected valid');
  expect(formatNational(r.number.national, r.number.country)).toBe('98765 43210');
  expect(maskNumber(r.number)).toBe('+91 98••• ••210');

  const us = parsePhone('2015550123', 'US');
  if (!us.ok) throw new Error('expected valid');
  expect(maskNumber(us.number)).toBe('+1 20• ••• •123');
});
