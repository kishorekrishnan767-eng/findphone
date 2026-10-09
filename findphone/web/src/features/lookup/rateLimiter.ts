type MinimalStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Rolling-window search cooldown (default 10 per minute). Kept in sessionStorage so a reload
 * doesn't reset it. A UX guard against casual abuse, NOT a security control: a script can skip
 * the page entirely, which is what App Check is for (known-limitations.md §3).
 */
export class RateLimiter {
  private memory: number[] = [];

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly storage: MinimalStorage | null = null,
    private readonly key = 'fp.searches',
  ) {}

  tryConsume(now = Date.now()): { ok: true } | { ok: false; retryInMs: number } {
    const recent = this.read().filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      const oldest = Math.min(...recent);
      this.write(recent);
      return { ok: false, retryInMs: this.windowMs - (now - oldest) };
    }
    recent.push(now);
    this.write(recent);
    return { ok: true };
  }

  private read(): number[] {
    try {
      const raw = this.storage?.getItem(this.key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((n): n is number => typeof n === 'number');
      }
    } catch {
      // Storage blocked or corrupt: fall back to memory.
    }
    return [...this.memory];
  }

  private write(times: number[]) {
    this.memory = times;
    try {
      this.storage?.setItem(this.key, JSON.stringify(times));
    } catch {
      // Private mode / blocked storage: memory is enough.
    }
  }
}

export function sessionStorageOrNull(): MinimalStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
