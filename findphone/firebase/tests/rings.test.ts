import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { describe, test } from 'vitest';
import { OTHER, OWNER, PHONE, cleared, validDoc } from './fixtures.js';
import { useRulesEnv } from './helpers.js';

const t = useRulesEnv();
const ring = (uid: string | null) => doc(t.as(uid), 'rings', PHONE);
const request = () => ({ requestedAt: serverTimestamp(), ackAt: null });
const minutesAgo = (m: number) => Timestamp.fromMillis(Date.now() - m * 60_000);

/** Seeds an existing ring document, bypassing rules. */
async function seedRing(data: Record<string, unknown>) {
  await t.seed(data, PHONE, 'rings');
}

describe('requesting a ring (the web app, no login)', () => {
  test('anyone can ring a device that is sharing', async () => {
    await t.seed(validDoc());
    await assertSucceeds(setDoc(ring(null), request()));
  });

  test('a paused device cannot be rung', async () => {
    await t.seed(validDoc({ sharingEnabled: false, ...cleared() }));
    await assertFails(setDoc(ring(null), request()));
  });

  test('an unregistered number cannot be rung', async () => {
    await assertFails(setDoc(ring(null), request()));
  });

  test('a client-clock requestedAt is rejected', async () => {
    await t.seed(validDoc());
    await assertFails(setDoc(ring(null), { requestedAt: Timestamp.now(), ackAt: null }));
  });

  test('extra fields are rejected', async () => {
    await t.seed(validDoc());
    await assertFails(setDoc(ring(null), { ...request(), message: 'hi' }));
  });

  test('a request cannot arrive pre-acknowledged', async () => {
    await t.seed(validDoc());
    await assertFails(setDoc(ring(null), { requestedAt: serverTimestamp(), ackAt: serverTimestamp() }));
  });

  test('a second request within 60 s is rejected', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: Timestamp.fromMillis(Date.now() - 20_000), ackAt: null });
    await assertFails(setDoc(ring(null), request()));
  });

  test('a request after the cooldown is allowed and clears the previous ack', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(2), ackAt: minutesAgo(2) });
    await assertSucceeds(setDoc(ring(null), request()));
  });

  test('after the cooldown, a paused device still cannot be rung', async () => {
    await t.seed(validDoc({ sharingEnabled: false, ...cleared() }));
    await seedRing({ requestedAt: minutesAgo(5), ackAt: null });
    await assertFails(setDoc(ring(null), request()));
  });
});

describe('reading ring status', () => {
  test('anyone can get it', async () => {
    await seedRing({ requestedAt: minutesAgo(1), ackAt: null });
    await assertSucceeds(getDoc(ring(null)));
  });

  test('listing is denied', async () => {
    await seedRing({ requestedAt: minutesAgo(1), ackAt: null });
    await assertFails(getDocs(collection(t.as(null), 'rings')));
  });
});

describe('acknowledging (the owner phone)', () => {
  test('the owner can stamp ackAt with server time', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(0.2), ackAt: null });
    await assertSucceeds(updateDoc(ring(OWNER), { ackAt: serverTimestamp() }));
  });

  test('a stranger cannot acknowledge', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(0.2), ackAt: null });
    await assertFails(updateDoc(ring(OTHER), { ackAt: serverTimestamp() }));
  });

  test('an unauthenticated caller cannot acknowledge', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(0.2), ackAt: null });
    await assertFails(updateDoc(ring(null), { ackAt: serverTimestamp() }));
  });

  test('the ack cannot use a client timestamp', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(0.2), ackAt: null });
    await assertFails(updateDoc(ring(OWNER), { ackAt: Timestamp.now() }));
  });

  test('the ack cannot move requestedAt', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(0.2), ackAt: null });
    await assertFails(updateDoc(ring(OWNER), { ackAt: serverTimestamp(), requestedAt: minutesAgo(10) }));
  });
});

describe('deleting', () => {
  test('the owner can delete', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(1), ackAt: null });
    await assertSucceeds(deleteDoc(ring(OWNER)));
  });

  test('a stranger cannot delete', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(1), ackAt: null });
    await assertFails(deleteDoc(ring(OTHER)));
  });

  test('nobody unauthenticated can delete', async () => {
    await t.seed(validDoc());
    await seedRing({ requestedAt: minutesAgo(1), ackAt: null });
    await assertFails(deleteDoc(ring(null)));
  });
});
