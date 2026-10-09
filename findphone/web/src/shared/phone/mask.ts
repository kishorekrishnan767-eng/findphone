import { type PhoneNumber, formatNational } from './normalize';

/**
 * `+91 98••• ••210`: enough to confirm you typed the right number, not enough for a shoulder-
 * surfer to read it. Keeps the first 2 and last 3 national digits.
 */
export function maskNumber(n: PhoneNumber): string {
  const d = n.national;
  const keepHead = Math.min(2, d.length);
  const keepTail = Math.min(3, Math.max(0, d.length - keepHead));
  const masked = d.slice(0, keepHead) + '•'.repeat(d.length - keepHead - keepTail) + d.slice(d.length - keepTail);
  return `+${n.country.dialCode} ${formatNational(masked, n.country)}`;
}
