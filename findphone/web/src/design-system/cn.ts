/** Joins class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Shared focus treatment: 2 px focus ring, offset 2 px, keyboard focus only. */
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
