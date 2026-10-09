import { describe, expect, test } from 'vitest';
import { parsePhone } from '../../shared/phone/normalize';
import type { DeviceRecord } from './domain/device';
import { type LookupState, lookupReducer } from './lookupState';

const r = parsePhone('9876543210', 'IN');
if (!r.ok) throw new Error('fixture');
const phone = r.number;

const device = { name: 'Asha Rao' } as DeviceRecord;
const loading: LookupState = { kind: 'loading', phone };

describe('lookupReducer', () => {
  test('a device from the server → found', () => {
    expect(lookupReducer(loading, { type: 'snapshot', device, fromCache: false })).toMatchObject({
      kind: 'found',
      reconnecting: false,
    });
  });

  test('an empty answer from the CACHE keeps waiting (it is not a "not found")', () => {
    expect(lookupReducer(loading, { type: 'snapshot', device: null, fromCache: true })).toBe(loading);
  });

  test('an empty answer from the server → not found', () => {
    expect(lookupReducer(loading, { type: 'snapshot', device: null, fromCache: false }).kind).toBe('notFound');
  });

  test('losing the connection after a result keeps the last data and flags reconnecting', () => {
    const found = lookupReducer(loading, { type: 'snapshot', device, fromCache: false });
    expect(lookupReducer(found, { type: 'snapshot', device: null, fromCache: true })).toMatchObject({
      kind: 'found',
      reconnecting: true,
    });
  });

  test('the owner deleting their data while you watch → not found', () => {
    const found = lookupReducer(loading, { type: 'snapshot', device, fromCache: false });
    expect(lookupReducer(found, { type: 'snapshot', device: null, fromCache: false }).kind).toBe('notFound');
  });

  test('errors keep the number for "Try again"', () => {
    expect(lookupReducer(loading, { type: 'error', error: 'network' })).toEqual({ kind: 'error', phone, error: 'network' });
  });

  test('a late snapshot after reset is ignored', () => {
    const idle: LookupState = { kind: 'idle' };
    expect(lookupReducer(idle, { type: 'snapshot', device, fromCache: false })).toBe(idle);
  });
});
