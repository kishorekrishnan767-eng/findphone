import { describe, expect, test } from 'vitest';
import { type DeviceRecord, parseDevice } from './device';
import { EXPIRY_MS, deriveStatus } from './status';

const NOW = new Date('2026-10-08T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const LIVE_MS = 120_000;

function device(overrides: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    name: 'Asha Rao',
    deviceCode: 'FP-7K3Q',
    platform: 'android',
    model: 'Pixel 7a',
    position: { lat: 12.9716, lng: 77.5946, accuracy: 12 },
    battery: 64,
    locatedAt: ago(10_000),
    updatedAt: ago(5_000),
    sharingEnabled: true,
    ...overrides,
  };
}

describe('deriveStatus', () => {
  test('fresh fix → Live', () => {
    expect(deriveStatus(device(), NOW, LIVE_MS).kind).toBe('live');
  });

  test('older than the threshold → Last seen, with seenAt', () => {
    const s = deriveStatus(device({ locatedAt: ago(10 * 60_000), updatedAt: ago(10 * 60_000) }), NOW, LIVE_MS);
    expect(s).toEqual({ kind: 'stale', seenAt: ago(10 * 60_000) });
  });

  test('a fix delivered late after being offline is NOT Live (seenAt = older of the two)', () => {
    const s = deriveStatus(device({ locatedAt: ago(30 * 60_000), updatedAt: ago(2_000) }), NOW, LIVE_MS);
    expect(s.kind).toBe('stale');
    if (s.kind === 'stale') expect(s.seenAt).toEqual(ago(30 * 60_000));
  });

  test('a device clock running ahead does not extend Live', () => {
    const s = deriveStatus(device({ locatedAt: new Date(NOW.getTime() + 60_000), updatedAt: ago(5 * 60_000) }), NOW, LIVE_MS);
    expect(s.kind).toBe('stale');
  });

  test('sharing paused → Paused, regardless of age', () => {
    expect(deriveStatus(device({ sharingEnabled: false, position: null, locatedAt: null }), NOW, LIVE_MS).kind).toBe('paused');
  });

  test('registered but no fix yet → Waiting', () => {
    expect(deriveStatus(device({ position: null, locatedAt: null }), NOW, LIVE_MS).kind).toBe('waiting');
  });

  test('7 days without an update → expired (shown as "No device found"), even if TTL has not run yet', () => {
    expect(deriveStatus(device({ updatedAt: ago(EXPIRY_MS) }), NOW, LIVE_MS).kind).toBe('expired');
    expect(deriveStatus(device({ updatedAt: ago(EXPIRY_MS - 1000), locatedAt: ago(EXPIRY_MS - 1000) }), NOW, LIVE_MS).kind).toBe('stale');
  });

  test('expiry wins over paused', () => {
    expect(deriveStatus(device({ sharingEnabled: false, updatedAt: ago(EXPIRY_MS + 1) }), NOW, LIVE_MS).kind).toBe('expired');
  });
});

describe('parseDevice', () => {
  const ts = (d: Date) => ({ toDate: () => d });
  const raw = {
    schemaVersion: 1,
    name: 'Asha Rao',
    deviceCode: 'FP-7K3Q',
    ownerUid: 'uid',
    claimHash: 'a'.repeat(64),
    platform: 'android',
    model: 'Pixel 7a',
    location: { latitude: 12.9716, longitude: 77.5946 },
    accuracy: 12,
    battery: 64,
    locatedAt: ts(ago(10_000)),
    sharingEnabled: true,
    consent: { locationSharing: true },
    createdAt: ts(ago(86_400_000)),
    updatedAt: ts(ago(5_000)),
    expireAt: ts(NOW),
  };

  test('maps a valid document and drops ownership fields', () => {
    const d = parseDevice(raw);
    expect(d).not.toBeNull();
    expect(d!.position).toEqual({ lat: 12.9716, lng: 77.5946, accuracy: 12 });
    expect(Object.keys(d!)).not.toContain('ownerUid');
    expect(Object.keys(d!)).not.toContain('claimHash');
  });

  test('a paused document has no position', () => {
    expect(parseDevice({ ...raw, sharingEnabled: false, location: null, accuracy: null, locatedAt: null })!.position).toBeNull();
  });

  test.each([
    ['missing name', { name: undefined }],
    ['bad device code', { deviceCode: 'XX-0000' }],
    ['battery out of range', { battery: 140 }],
    ['location as string', { location: '12,77' }],
    ['updatedAt missing', { updatedAt: undefined }],
  ])('malformed (%s) → null, never half-rendered', (_label, patch) => {
    expect(parseDevice({ ...raw, ...patch })).toBeNull();
  });
});
