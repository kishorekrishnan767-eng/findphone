export type LookupErrorKind = 'network' | 'blocked' | 'quota' | 'unknown';

/** Maps Firestore/App Check errors to the few states the UI distinguishes. */
export function toLookupError(error: unknown): LookupErrorKind {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'cancelled':
      return 'network';
    // With App Check enforced, an unverified browser is refused as permission-denied.
    case 'permission-denied':
    case 'unauthenticated':
    case 'appCheck/recaptcha-error':
    case 'appCheck/fetch-status-error':
    case 'appCheck/throttled':
      return 'blocked';
    case 'resource-exhausted':
      return 'quota';
    default:
      return code.startsWith('appCheck/') ? 'blocked' : 'unknown';
  }
}

export const lookupErrorCopy: Record<LookupErrorKind, { title: string; body: string }> = {
  network: {
    title: "Can't reach FindPhone",
    body: 'Check your connection and try again.',
  },
  blocked: {
    title: "This browser couldn't be verified",
    body: 'Turn off content blockers for this site and reload the page.',
  },
  quota: {
    title: 'FindPhone is over its daily limit',
    body: 'This demo has used its free daily quota. Try again after midnight Pacific time.',
  },
  unknown: {
    title: 'Something went wrong',
    body: 'Try again in a moment.',
  },
};
