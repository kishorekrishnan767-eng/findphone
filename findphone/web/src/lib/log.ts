/**
 * Diagnostics that cannot leak personal data (the web twin of mobile/lib/core/logging/logger.dart).
 * Only numbers, booleans and short lowercase codes are printed; any other string is redacted, so
 * a phone number, name or coordinate passed by mistake never reaches the console. Errors are
 * reduced to their name and Firebase code; Firestore messages contain document paths, i.e. phone
 * numbers. Silent in production builds. ESLint forbids `console` everywhere else.
 */
const SAFE_CODE = /^[a-z0-9_.-]{1,40}$/;

type Detail = string | number | boolean | null | undefined;

function sanitise(value: Detail): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string' && SAFE_CODE.test(value)) return value;
  return '<redacted>';
}

function describe(details: Record<string, Detail>): string {
  return Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${sanitise(v)}`)
    .join(' ');
}

const enabled = import.meta.env.DEV && import.meta.env.MODE !== 'test';

export const log = {
  info(event: string, details: Record<string, Detail> = {}) {
    if (enabled) console.info(`[FindPhone] ${event}`, describe(details));
  },
  warn(event: string, details: Record<string, Detail> = {}) {
    if (enabled) console.warn(`[FindPhone] ${event}`, describe(details));
  },
  error(event: string, error: unknown) {
    if (!enabled) return;
    const name = error instanceof Error ? error.name : typeof error;
    const code = typeof error === 'object' && error && 'code' in error ? sanitise(String(error.code)) : undefined;
    console.error(`[FindPhone] ${event}`, `type=${name}${code ? ` code=${code}` : ''}`);
  },
  /** Exposed for tests. */
  describe,
};
