import type { DeviceRecord } from './device';

export const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export type DeviceStatus =
  /** TTL deletion can lag by about a day; treat a 7-day-old record exactly like a missing one. */
  | { kind: 'expired' }
  | { kind: 'paused' }
  | { kind: 'waiting' }
  | { kind: 'live'; seenAt: Date }
  | { kind: 'stale'; seenAt: Date };

/**
 * Status rules (architecture §4). `seenAt` is the OLDER of the server write time and the device's
 * fix time: a reading delivered late after being offline has a fresh `updatedAt` but an old
 * `locatedAt`, and must not read as Live.
 */
export function deriveStatus(d: DeviceRecord, now: Date, liveThresholdMs: number): DeviceStatus {
  if (now.getTime() - d.updatedAt.getTime() >= EXPIRY_MS) return { kind: 'expired' };
  if (!d.sharingEnabled) return { kind: 'paused' };
  if (!d.position) return { kind: 'waiting' };

  const seenAt = d.locatedAt && d.locatedAt < d.updatedAt ? d.locatedAt : d.updatedAt;
  return now.getTime() - seenAt.getTime() < liveThresholdMs ? { kind: 'live', seenAt } : { kind: 'stale', seenAt };
}
