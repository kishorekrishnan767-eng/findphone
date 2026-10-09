import { expect, test } from 'vitest';
import { log } from './log';

test('names, numbers and coordinates are redacted; codes and numbers pass through', () => {
  const out = log.describe({
    name: 'Asha Rao',
    phone: '+919876543210',
    coords: '12.97160, 77.59460',
    code: 'permission-denied',
    attempt: 3,
    debug: true,
  });
  expect(out).not.toMatch(/Asha|9876543210|12\.97/);
  expect(out).toContain('code=permission-denied');
  expect(out).toContain('attempt=3');
  expect(out).toContain('debug=true');
  expect(out.match(/<redacted>/g)).toHaveLength(3);
});
