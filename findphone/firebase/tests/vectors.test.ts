// Re-derives the shared vectors with an independent Node implementation, so a bad edit to
// claim-chain-vectors.json is caught here rather than surfacing as a confusing rules failure.
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { vectors } from './fixtures.js';

const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe.each(vectors.cases)('vector $name', (c) => {
  test('h1 is SHA-256 of the canonical code and the chain reaches the shipped h1000', () => {
    let h = sha256Hex(c.canonical);
    expect(h).toBe(c.links.h1);
    for (let i = 2; i <= vectors.spec.chainLength; i++) {
      h = sha256Hex(h);
      const shipped = c.links[`h${i}`];
      if (shipped) expect(h, `h${i}`).toBe(shipped);
    }
    expect(h).toBe(c.links.h1000);
  });

  test('every shipped link is 64 lowercase hex characters', () => {
    for (const v of Object.values(c.links)) expect(v).toMatch(/^[0-9a-f]{64}$/);
  });

  test('no mis-encoded link matches the correct h999', () => {
    for (const m of c.misencoded) expect(m.h999).not.toBe(c.links.h999);
  });

  test('display code is the canonical code in 5-5-5-5 groups', () => {
    expect(c.displayCode.replaceAll('-', '')).toBe(c.canonical);
    expect(c.displayCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
  });
});
