import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { GeoPoint, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { describe, expect, test } from 'vitest';
import {
  OTHER,
  OWNER,
  PHONE,
  THIRD,
  link,
  stamp,
  validConsent,
  validDoc,
  vectors,
  type ChainCase,
} from './fixtures.js';
import { useRulesEnv } from './helpers.js';

const t = useRulesEnv();
const ref = (uid: string | null) => doc(t.as(uid), 'locations', PHONE);

/** What the app sends on reclaim: take ownership, reveal the previous link, refresh timestamps. */
const reclaim = (uid: string | null, claimHash: string, extra: Record<string, unknown> = {}) =>
  updateDoc(ref(uid), { ownerUid: uid, claimHash, ...stamp(), ...extra });

const storedClaim = async () => (await getDoc(ref(null))).get('claimHash') as string;

describe.each(vectors.cases)('vector $name: emulator hashing.sha256 agrees with the shared vectors', (c: ChainCase) => {
  // Each accepted pair proves the rules' sha256(..).toHexString().lower() produces exactly the
  // next link that Node produced. None of these are assumed; each one goes through the emulator.
  test.each([
    [999, 1000],
    [998, 999],
    [997, 998],
    [2, 3],
    [1, 2],
  ])('revealing h%i while h%i is stored is accepted', async (prev, stored) => {
    await t.seed(validDoc({ claimHash: link(c, stored) }));
    await assertSucceeds(reclaim(OTHER, link(c, prev)));
    const snap = await getDoc(ref(null));
    expect(snap.get('ownerUid')).toBe(OTHER);
    expect(snap.get('claimHash')).toBe(link(c, prev));
  });

  test('a wrong link (h998, skipping one step while h1000 is stored) is rejected', async () => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));
    await assertFails(reclaim(OTHER, link(c, 998)));
  });

  test('re-sending the stored value itself is rejected', async () => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));
    await assertFails(reclaim(OTHER, link(c, 1000)));
  });

  test('a replayed link is rejected, and only the seed holder can continue the chain', async () => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));

    await assertSucceeds(reclaim(OTHER, link(c, 999)));
    expect(await storedClaim()).toBe(link(c, 999));

    // Someone who saw h999 (it is public now) replays it: rejected.
    await assertFails(reclaim(THIRD, link(c, 999)));
    await assertFails(reclaim(OWNER, link(c, 999)));
    expect(await storedClaim()).toBe(link(c, 999));

    // Whoever holds the recovery code computes the next link back and can reclaim again.
    await assertSucceeds(reclaim(OWNER, link(c, 998)));
    expect(await storedClaim()).toBe(link(c, 998));
  });

  test.each(c.misencoded)('wrong encoding "$kind" is rejected', async ({ h999 }) => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));
    await assertFails(reclaim(OTHER, h999));
  });

  test('uppercase hex of the correct link is rejected', async () => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));
    await assertFails(reclaim(OTHER, link(c, 999).toUpperCase()));
  });

  test('the recovery code itself is rejected (it is never sent to the server)', async () => {
    await t.seed(validDoc({ claimHash: link(c, 1000) }));
    await assertFails(reclaim(OTHER, c.canonical));
    await assertFails(reclaim(OTHER, c.displayCode));
  });
});

describe('reclaim constraints', () => {
  const c = vectors.cases[0]!;

  test('a valid link without taking ownership is rejected', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OTHER), { claimHash: link(c, 999), ...stamp() }));
  });

  test('ownership cannot be handed to a third uid', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OTHER), { ownerUid: THIRD, claimHash: link(c, 999), ...stamp() }));
  });

  test('an unauthenticated reclaim is rejected', async () => {
    await t.seed(validDoc());
    await assertFails(reclaim(null, link(c, 999)));
  });

  test('reclaim cannot change deviceCode', async () => {
    await t.seed(validDoc());
    await assertFails(reclaim(OTHER, link(c, 999), { deviceCode: 'FP-AAAA' }));
  });

  test('reclaim cannot change createdAt', async () => {
    await t.seed(validDoc());
    await assertFails(reclaim(OTHER, link(c, 999), { createdAt: Timestamp.now() }));
  });

  test('reclaim may re-capture consent and send a fresh location in the same write', async () => {
    await t.seed(validDoc());
    await assertSucceeds(
      reclaim(OTHER, link(c, 999), {
        consent: { ...validConsent(), termsVersion: '1.1' },
        location: new GeoPoint(12.98, 77.6),
        accuracy: 20,
        locatedAt: Timestamp.now(),
      }),
    );
  });

  test('the current owner cannot rotate its own claimHash, even with a valid link', async () => {
    await t.seed(validDoc());
    await assertFails(updateDoc(ref(OWNER), { claimHash: link(c, 999), ...stamp() }));
  });
});
