import { z } from 'zod';

/**
 * What the UI knows about a device. Deliberately excludes ownerUid, claimHash and consent:
 * they're in the public document, but the dashboard has no reason to hold them.
 */
export interface DeviceRecord {
  name: string;
  deviceCode: string;
  platform: 'android' | 'ios';
  model: string;
  position: { lat: number; lng: number; accuracy: number } | null;
  battery: number | null;
  locatedAt: Date | null;
  updatedAt: Date;
  sharingEnabled: boolean;
}

// Duck-typed so tests can use plain objects; Firestore GeoPoint/Timestamp satisfy these shapes.
const geoPoint = z.custom<{ latitude: number; longitude: number }>(
  (v) =>
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { latitude?: unknown }).latitude === 'number' &&
    typeof (v as { longitude?: unknown }).longitude === 'number',
);
const timestamp = z.custom<{ toDate(): Date }>(
  (v) => typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function',
);

const schema = z.object({
  name: z.string().min(1).max(40),
  deviceCode: z.string().regex(/^FP-[0-9A-HJKMNP-TV-Z]{4}$/),
  platform: z.enum(['android', 'ios']),
  model: z.string().min(1).max(60),
  location: geoPoint.nullable(),
  accuracy: z.number().positive().max(5000).nullable(),
  battery: z.number().int().min(0).max(100).nullable(),
  locatedAt: timestamp.nullable(),
  updatedAt: timestamp,
  sharingEnabled: z.boolean(),
});

/** Parses a raw document. Anything malformed is treated as "no device", never shown half-broken. */
export function parseDevice(data: unknown): DeviceRecord | null {
  const r = schema.safeParse(data);
  if (!r.success) return null;
  const d = r.data;
  return {
    name: d.name,
    deviceCode: d.deviceCode,
    platform: d.platform,
    model: d.model,
    position:
      d.location && d.accuracy !== null
        ? { lat: d.location.latitude, lng: d.location.longitude, accuracy: d.accuracy }
        : null,
    battery: d.battery,
    locatedAt: d.locatedAt?.toDate() ?? null,
    updatedAt: d.updatedAt.toDate(),
    sharingEnabled: d.sharingEnabled,
  };
}
