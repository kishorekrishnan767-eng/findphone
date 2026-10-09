import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { GeoPoint, Timestamp, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { describe, expect, test } from 'vitest';
import {
  OTHER,
  OWNER,
  PHONE,
  cleared,
  link,
  stamp,
  validConsent,
  validDoc,
  vectors,
} from './fixtures.js';
import { useRulesEnv } from './helpers.js';

const t = useRulesEnv();
const ref = (uid: string | null, id = PHONE) => doc(t.as(uid), 'locations', id);
const realistic = vectors.cases[0]!;

describe('create', () => {
  test('owner create with ownerUid == auth.uid is allowed', async () => {
    await assertSucceeds(setDoc(ref(OWNER), validDoc()));
  });

  test('unauthenticated create is denied', async () => {
    await assertFails(setDoc(ref(null), validDoc()));
  });

  test('create with a different ownerUid is denied', async () => {
    await assertFails(setDoc(ref(OTHER), validDoc({ ownerUid: OWNER })));
  });

  test('create with a client-side createdAt is denied', async () => {
    await assertFails(setDoc(ref(OWNER), validDoc({ createdAt: Timestamp.now() })));
  });

  test.each(['9876543210', '+0919876543210', '+91-9876543210'])('create under non-E.164 id %j is denied', async (id) => {
    await assertFails(setDoc(ref(OWNER, id), validDoc()));
  });

  test('registering a number that already exists is denied for another user', async () => {
    await t.seed(validDoc());
    await assertFails(setDoc(ref(OTHER), validDoc({ ownerUid: OTHER })));
    const snap = await getDoc(ref(null));
    expect(snap.get('ownerUid')).toBe(OWNER);
  });
});

describe('update by the owner', () => {
  test('a location update is allowed', async () => {
    await t.seed(validDoc());
    await assertSucceeds(
      updateDoc(ref(OWNER), {
        location: new GeoPoint(12.9721, 77.5933),
        accuracy: 8,
        locatedAt: Timestamp.now(),
        battery: 63,
        ...stamp(),
      }),
    );
  });

  test('pausing (sharing off, coordinates cleared) is allowed', async () => {
    await t.seed(validDoc());
    await assertSucceeds(updateDoc(ref(OWNER), { sharingEnabled: false, ...cleared(), ...stamp() }));
  });

  test('pausing while keeping the coordinates is denied', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OWNER), { sharingEnabled: false, ...stamp() }));
  });

  test('resuming without a location yet is allowed', async () => {
    await t.seed(validDoc({ sharingEnabled: false, ...cleared() }));
    await assertSucceeds(updateDoc(ref(OWNER), { sharingEnabled: true, ...stamp() }));
  });

  test('an update that does not set updatedAt to the server time is denied', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OWNER), { battery: 50 }));
  });

  test('an update with a client-clock updatedAt is denied', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OWNER), { battery: 50, ...stamp(), updatedAt: Timestamp.now() }));
  });

  const immutable: Array<[string, () => unknown]> = [
    ['ownerUid', () => OTHER],
    ['createdAt', () => Timestamp.now()],
    ['deviceCode', () => 'FP-AAAA'],
    ['claimHash', () => link(realistic, 999)],
    ['consent', () => ({ ...validConsent(), termsVersion: '1.1' })],
  ];

  test.each(immutable)('the owner cannot change immutable field %s', async (field, value) => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OWNER), { [field]: value(), ...stamp() }));
  });

  test('editable profile fields (name, model) can change', async () => {
    await t.seed(validDoc());
    await assertSucceeds(updateDoc(ref(OWNER), { name: 'Asha R', model: 'Pixel 8', ...stamp() }));
  });
});

describe('update by anyone else', () => {
  test('a signed-in non-owner update is denied', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OTHER), { battery: 10, ...stamp() }));
  });

  test('a non-owner cannot pause someone else', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OTHER), { sharingEnabled: false, ...cleared(), ...stamp() }));
  });

  test('an unauthenticated update is denied', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(null), { battery: 10, ...stamp() }));
  });
});

describe('delete', () => {
  test('the owner can delete', async () => {
    await t.seed(validDoc());
    await assertSucceeds(deleteDoc(ref(OWNER)));
  });

  test('a signed-in non-owner cannot delete', async () => {
    await t.seed(validDoc());
    await assertFails(deleteDoc(ref(OTHER)));
  });

  test('an unauthenticated delete is denied', async () => {
    await t.seed(validDoc());
    await assertFails(deleteDoc(ref(null)));
  });
});
