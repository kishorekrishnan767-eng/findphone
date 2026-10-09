import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { GeoPoint, Timestamp, doc, setDoc } from 'firebase/firestore';
import { describe, expect, test } from 'vitest';
import {
  OWNER,
  PHONE,
  cleared,
  daysFromNow,
  link,
  minutesFromNow,
  validConsent,
  validDoc,
  vectors,
  without,
  type LocationDoc,
} from './fixtures.js';
import { useRulesEnv } from './helpers.js';

const t = useRulesEnv();
const create = (data: LocationDoc) => setDoc(doc(t.as(OWNER), 'locations', PHONE), data);
const hash = link(vectors.cases[0]!, 1000);

// Builders, not values: every test gets fresh timestamps.
const INVALID: Array<[string, () => LocationDoc]> = [
  // shape
  ['missing name', () => without(validDoc(), 'name')],
  ['missing expireAt', () => without(validDoc(), 'expireAt')],
  ['missing nullable field battery', () => without(validDoc(), 'battery')],
  ['unknown field "phone" (the number lives only in the id)', () => validDoc({ phone: PHONE })],
  ['unknown field "isAdmin"', () => validDoc({ isAdmin: true })],
  ['schemaVersion 2', () => validDoc({ schemaVersion: 2 })],
  ['schemaVersion as string', () => validDoc({ schemaVersion: '1' })],
  // name
  ['empty name', () => validDoc({ name: '' })],
  ['41-character name', () => validDoc({ name: 'a'.repeat(41) })],
  ['name with leading space', () => validDoc({ name: ' Asha' })],
  ['name with trailing space', () => validDoc({ name: 'Asha ' })],
  ['name with a line break', () => validDoc({ name: 'Asha\nRao' })],
  ['name as number', () => validDoc({ name: 42 })],
  // deviceCode
  ['deviceCode too short', () => validDoc({ deviceCode: 'FP-7K3' })],
  ['deviceCode lowercase', () => validDoc({ deviceCode: 'fp-7k3q' })],
  ['deviceCode with U (not Crockford)', () => validDoc({ deviceCode: 'FP-7K3U' })],
  ['deviceCode wrong prefix', () => validDoc({ deviceCode: 'XX-7K3Q' })],
  // claimHash
  ['claimHash uppercase hex', () => validDoc({ claimHash: hash.toUpperCase() })],
  ['claimHash 63 characters', () => validDoc({ claimHash: hash.slice(1) })],
  ['claimHash non-hex character', () => validDoc({ claimHash: 'g' + hash.slice(1) })],
  // device
  ['platform "web"', () => validDoc({ platform: 'web' })],
  ['empty model', () => validDoc({ model: '' })],
  ['61-character model', () => validDoc({ model: 'm'.repeat(61) })],
  // location block
  ['location as string', () => validDoc({ location: '12.97,77.59' })],
  ['location as map', () => validDoc({ location: { latitude: 12.97, longitude: 77.59 } })],
  ['accuracy 0', () => validDoc({ accuracy: 0 })],
  ['accuracy negative', () => validDoc({ accuracy: -5 })],
  ['accuracy 5001 m', () => validDoc({ accuracy: 5001 })],
  ['accuracy as string', () => validDoc({ accuracy: '12' })],
  ['location without accuracy', () => validDoc({ accuracy: null })],
  ['location without locatedAt', () => validDoc({ locatedAt: null })],
  ['accuracy without location', () => validDoc({ location: null, locatedAt: null })],
  ['locatedAt 1 hour in the future', () => validDoc({ locatedAt: minutesFromNow(60) })],
  ['locatedAt 8 days old', () => validDoc({ locatedAt: daysFromNow(-8) })],
  // sharing invariant
  ['sharing off but location kept', () => validDoc({ sharingEnabled: false })],
  ['sharing off, location cleared but accuracy kept', () => validDoc({ sharingEnabled: false, location: null, locatedAt: null })],
  ['sharingEnabled as string', () => validDoc({ sharingEnabled: 'true' })],
  // battery
  ['battery 101', () => validDoc({ battery: 101 })],
  ['battery -1', () => validDoc({ battery: -1 })],
  ['battery 50.5', () => validDoc({ battery: 50.5 })],
  ['battery as string', () => validDoc({ battery: '64' })],
  // consent
  ['consent not given', () => validDoc({ consent: { ...validConsent(), locationSharing: false } })],
  ['consent missing termsVersion', () => validDoc({ consent: without(validConsent(), 'termsVersion') })],
  ['consent with an extra key', () => validDoc({ consent: { ...validConsent(), marketing: true } })],
  ['consent termsVersion 17 characters', () => validDoc({ consent: { ...validConsent(), termsVersion: 'v'.repeat(17) } })],
  ['consent acceptedAt 1 hour in the future', () => validDoc({ consent: { ...validConsent(), acceptedAt: minutesFromNow(60) } })],
  ['consent as boolean', () => validDoc({ consent: true })],
  // timestamps
  ['createdAt from the client clock', () => validDoc({ createdAt: Timestamp.now() })],
  ['updatedAt from the client clock', () => validDoc({ updatedAt: Timestamp.now() })],
  ['expireAt 1 day out', () => validDoc({ expireAt: daysFromNow(1) })],
  ['expireAt 5.9 days out', () => validDoc({ expireAt: daysFromNow(5.9) })],
  ['expireAt 8.1 days out', () => validDoc({ expireAt: daysFromNow(8.1) })],
  ['expireAt 30 days out', () => validDoc({ expireAt: daysFromNow(30) })],
  ['expireAt in the past', () => validDoc({ expireAt: daysFromNow(-1) })],
  ['expireAt as string', () => validDoc({ expireAt: '2026-10-15' })],
];

const VALID: Array<[string, () => LocationDoc]> = [
  ['a complete live document', () => validDoc()],
  ['paused: sharing off, coordinates null', () => validDoc({ sharingEnabled: false, ...cleared() })],
  ['registered and waiting for the first fix', () => validDoc(cleared())],
  ['battery unknown (null)', () => validDoc({ battery: null })],
  ['battery 0 and accuracy 5000 m', () => validDoc({ battery: 0, accuracy: 5000 })],
  ['battery 100 and fractional accuracy', () => validDoc({ battery: 100, accuracy: 3.7 })],
  ['40-character name and 60-character model', () => validDoc({ name: 'a'.repeat(40), model: 'm'.repeat(60) })],
  ['single-character name', () => validDoc({ name: 'A' })],
  ['name with inner spaces', () => validDoc({ name: 'Asha  Rao' })],
  ['north pole on the antimeridian', () => validDoc({ location: new GeoPoint(90, 180) })],
  ['south pole on the antimeridian', () => validDoc({ location: new GeoPoint(-90, -180) })],
  ['iOS platform', () => validDoc({ platform: 'ios' })],
  ['locatedAt 3 days old (delivered after being offline)', () => validDoc({ locatedAt: daysFromNow(-3) })],
  ['expireAt 6.1 days out (slow device clock)', () => validDoc({ expireAt: daysFromNow(6.1) })],
  ['expireAt 7.9 days out (fast device clock)', () => validDoc({ expireAt: daysFromNow(7.9) })],
];

describe('invalid documents are denied', () => {
  test.each(INVALID)('%s', async (_label, build) => {
    await assertFails(create(build()));
  });
});

describe('valid documents are allowed', () => {
  test.each(VALID)('%s', async (_label, build) => {
    await assertSucceeds(create(build()));
  });
});

test('out-of-range coordinates cannot even be built by the SDK; the rules range check is defence in depth', () => {
  expect(() => new GeoPoint(90.0001, 0)).toThrow();
  expect(() => new GeoPoint(0, 180.0001)).toThrow();
});
