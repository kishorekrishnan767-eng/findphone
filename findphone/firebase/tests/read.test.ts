import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { describe, expect, test } from 'vitest';
import { OTHER, OWNER, PHONE, validDoc } from './fixtures.js';
import { useRulesEnv } from './helpers.js';

const t = useRulesEnv();

describe('get by exact id', () => {
  test('unauthenticated get of an existing number is allowed', async () => {
    await t.seed(validDoc());
    const snap = await assertSucceeds(getDoc(doc(t.as(null), 'locations', PHONE)));
    expect(snap.exists()).toBe(true);
    expect(snap.get('deviceCode')).toBe('FP-7K3Q');
  });

  test('unauthenticated get of an unregistered number is allowed and returns no document', async () => {
    const snap = await assertSucceeds(getDoc(doc(t.as(null), 'locations', '+14155550123')));
    expect(snap.exists()).toBe(false);
  });

  test('a signed-in user who is not the owner can get', async () => {
    await t.seed(validDoc());
    await assertSucceeds(getDoc(doc(t.as(OTHER), 'locations', PHONE)));
  });

  test.each(['9876543210', '+0919876543210', '+91 98765 43210', 'abc', '+1234567890123456', '+12345'])(
    'get with non-E.164 id %j is denied',
    async (id) => {
      await assertFails(getDoc(doc(t.as(null), 'locations', id)));
    },
  );
});

describe.each([
  ['unauthenticated', null],
  ['a signed-in stranger', OTHER],
  ['the owner', OWNER],
] as const)('listing and queries are denied for %s', (_label, uid) => {
  test('reading the whole collection', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(collection(t.as(uid), 'locations')));
  });

  test('where-query on a field', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(query(collection(t.as(uid), 'locations'), where('deviceCode', '==', 'FP-7K3Q'))));
  });

  test('where-query for my own documents (ownerUid)', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(query(collection(t.as(uid), 'locations'), where('ownerUid', '==', OWNER))));
  });

  test('documentId() equality query for a known number', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(query(collection(t.as(uid), 'locations'), where(documentId(), '==', PHONE))));
  });

  test('limit(1) query', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(query(collection(t.as(uid), 'locations'), limit(1))));
  });

  test('collection-group query', async () => {
    await t.seed(validDoc());
    await assertFails(getDocs(collectionGroup(t.as(uid), 'locations')));
  });
});

describe('everything outside locations/ is closed', () => {
  test('get on another collection is denied', async () => {
    await assertFails(getDoc(doc(t.as(OWNER), 'users', OWNER)));
  });

  test('write to another collection is denied', async () => {
    await assertFails(setDoc(doc(t.as(OWNER), 'users', OWNER), { name: 'x' }));
  });

  test('subcollection under a location is denied', async () => {
    await t.seed(validDoc());
    await assertFails(setDoc(doc(t.as(OWNER), 'locations', PHONE, 'history', '1'), { a: 1 }));
  });
});
