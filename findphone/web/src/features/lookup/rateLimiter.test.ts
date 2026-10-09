import { expect, test } from 'vitest';
import { RateLimiter } from './rateLimiter';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test('allows 10 searches per rolling minute, then reports when the next one is allowed', () => {
  const rl = new RateLimiter(10, 60_000, memoryStorage());
  const t0 = 1_000_000;
  for (let i = 0; i < 10; i++) expect(rl.tryConsume(t0 + i * 1000).ok).toBe(true);

  const blocked = rl.tryConsume(t0 + 15_000);
  expect(blocked).toEqual({ ok: false, retryInMs: 45_000 });

  // The first search falls out of the window at t0 + 60 s.
  expect(rl.tryConsume(t0 + 60_000).ok).toBe(true);
});

test('survives a reload via storage', () => {
  const storage = memoryStorage();
  const t0 = 2_000_000;
  const a = new RateLimiter(2, 60_000, storage);
  a.tryConsume(t0);
  a.tryConsume(t0 + 1);
  const b = new RateLimiter(2, 60_000, storage);
  expect(b.tryConsume(t0 + 2).ok).toBe(false);
});

test('works without storage and ignores corrupt data', () => {
  const broken = { getItem: () => '{not json', setItem: () => {
    throw new Error('quota');
  } };
  const rl = new RateLimiter(1, 60_000, broken);
  expect(rl.tryConsume(0).ok).toBe(true);
  expect(rl.tryConsume(1).ok).toBe(false);
});
