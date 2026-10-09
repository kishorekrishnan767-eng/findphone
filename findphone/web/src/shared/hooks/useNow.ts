import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs` so relative times and Live → Last seen transitions stay true
 * even when no new snapshot arrives. */
export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
