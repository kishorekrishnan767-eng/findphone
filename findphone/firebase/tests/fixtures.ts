import { readFileSync } from 'node:fs';
import { GeoPoint, Timestamp, serverTimestamp } from 'firebase/firestore';

export interface ChainCase {
  name: string;
  displayCode: string;
  canonical: string;
  inputVariants: string[];
  links: Record<string, string>;
  misencoded: Array<{ kind: string; note: string; h999: string }>;
}

export interface ClaimChainVectors {
  spec: { chainLength: number; alphabet: string; codeLength: number };
  cases: ChainCase[];
  invalidInputs: Array<{ input: string; reason: string }>;
}

export const vectors = JSON.parse(
  readFileSync(new URL('../../shared/claim-chain-vectors.json', import.meta.url), 'utf8'),
) as ClaimChainVectors;

/** Hⁱ for a vector case; throws if the vectors file doesn't ship that link. */
export function link(c: ChainCase, i: number): string {
  const value = c.links[`h${i}`];
  if (!value) throw new Error(`Vector "${c.name}" has no h${i}`);
  return value;
}

export const PHONE = '+919876543210';
export const OWNER = 'owner-uid';
export const OTHER = 'other-uid';
export const THIRD = 'third-uid';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export const minutesFromNow = (m: number) => Timestamp.fromMillis(Date.now() + m * MINUTE_MS);
export const daysFromNow = (d: number) => Timestamp.fromMillis(Date.now() + d * DAY_MS);

export type LocationDoc = Record<string, unknown>;

export const validConsent = () => ({
  locationSharing: true,
  acceptedAt: Timestamp.now(),
  termsVersion: '1.0',
});

/** A complete, valid, live document owned by OWNER, as the mobile app writes it on register. */
export function validDoc(overrides: LocationDoc = {}): LocationDoc {
  const realistic = vectors.cases[0];
  if (!realistic) throw new Error('claim-chain-vectors.json has no cases');
  return {
    schemaVersion: 1,
    name: 'Asha Rao',
    deviceCode: 'FP-7K3Q',
    ownerUid: OWNER,
    claimHash: link(realistic, 1000),
    platform: 'android',
    model: 'Pixel 7a',
    location: new GeoPoint(12.9716, 77.5946),
    accuracy: 12,
    battery: 64,
    locatedAt: Timestamp.now(),
    sharingEnabled: true,
    consent: validConsent(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: daysFromNow(7),
    ...overrides,
  };
}

/** The two fields every write must refresh. */
export const stamp = () => ({ updatedAt: serverTimestamp(), expireAt: daysFromNow(7) });

/** Pausing: sharing off and the coordinates removed. */
export const cleared = () => ({ location: null, accuracy: null, locatedAt: null });

export function without(d: LocationDoc, ...keys: string[]): LocationDoc {
  const copy = { ...d };
  for (const k of keys) delete copy[k];
  return copy;
}
