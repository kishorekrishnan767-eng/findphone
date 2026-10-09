import { type Country, countries, countryByIso } from './countries';

/**
 * Input → E.164 document id. Implements docs/architecture.md §5.5 step for step; the Dart app
 * (mobile/lib/core/phone/phone_normalizer.dart) does the same, and both must pass
 * shared/phone-vectors.json, so the same input always reaches the same document.
 */

export type PhoneError = 'empty' | 'invalid-characters' | 'unknown-country' | 'too-short' | 'too-long' | 'not-mobile';

export interface PhoneNumber {
  country: Country;
  national: string;
  e164: string;
}

export type PhoneResult = { ok: true; number: PhoneNumber } | { ok: false; error: PhoneError; country?: Country };

const ALLOWED = /^\+?[0-9\s\-.()]*$/;
const patterns = new Map(countries.map((c) => [c.iso, new RegExp(c.mobilePattern)]));

const fitsLength = (national: string, c: Country) =>
  national.length >= c.nationalLength[0] && national.length <= c.nationalLength[1];

function validate(national: string, c: Country): PhoneResult {
  if (national.length < c.nationalLength[0]) return { ok: false, error: 'too-short' };
  if (national.length > c.nationalLength[1]) return { ok: false, error: 'too-long' };
  if (!patterns.get(c.iso)!.test(national)) return { ok: false, error: 'not-mobile', country: c };
  return { ok: true, number: { country: c, national, e164: `+${c.dialCode}${national}` } };
}

function international(digits: string, preferred: Country): PhoneResult {
  if (!digits) return { ok: false, error: 'empty' };
  for (const len of [3, 2, 1]) {
    if (digits.length < len) continue;
    const prefix = digits.slice(0, len);
    const candidates = countries.filter((c) => c.dialCode === prefix);
    if (candidates.length === 0) continue;
    const country = candidates.includes(preferred) ? preferred : candidates[0]!;
    let national = digits.slice(len);
    const trunk = country.trunkPrefix;
    // "+44 (0) 7700 …": a trunk prefix written after the country code.
    if (trunk && national.startsWith(trunk) && fitsLength(national.slice(trunk.length), country)) {
      national = national.slice(trunk.length);
    }
    return validate(national, country);
  }
  return { ok: false, error: 'unknown-country' };
}

function local(digits: string, country: Country): PhoneResult {
  let national = digits;
  const trunk = country.trunkPrefix;
  if (digits.startsWith(country.dialCode) && fitsLength(digits.slice(country.dialCode.length), country)) {
    national = digits.slice(country.dialCode.length);
  } else if (trunk && digits.startsWith(trunk) && fitsLength(digits.slice(trunk.length), country)) {
    national = digits.slice(trunk.length);
  }
  return validate(national, country);
}

export function parsePhone(input: string, defaultIso: string): PhoneResult {
  const trimmed = input.trim();
  if (!ALLOWED.test(trimmed)) return { ok: false, error: 'invalid-characters' };
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return { ok: false, error: 'empty' };

  const fallback = countryByIso(defaultIso);
  if (trimmed.startsWith('+')) return international(digits, fallback);
  if (digits.startsWith('00')) return international(digits.slice(2), fallback);
  return local(digits, fallback);
}

/** Groups national digits for display, e.g. `98765 43210`. */
export function formatNational(digits: string, c: Country): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of c.groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join(' ');
}

export function phoneErrorMessage(result: Extract<PhoneResult, { ok: false }>, example: string): string {
  switch (result.error) {
    case 'empty':
      return 'Enter a mobile number.';
    case 'invalid-characters':
      return `Use digits only, for example ${example}.`;
    case 'unknown-country':
      return "That country code isn't supported yet.";
    case 'too-short':
      return 'That number is too short.';
    case 'too-long':
      return 'That number is too long.';
    case 'not-mobile':
      return result.country
        ? `That isn't a valid mobile number for ${result.country.name}.`
        : "That isn't a valid mobile number.";
  }
}
