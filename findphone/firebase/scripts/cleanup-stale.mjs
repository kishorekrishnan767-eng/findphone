// Deletes locations/{phone} documents whose updatedAt is 7+ days old.
//
// Why this exists: Firestore's built-in TTL policy (the "proper" way to do this) requires the
// Blaze billing plan to configure, even though actual Firestore usage stays within the free
// quota. This project runs on Spark (no billing account), so TTL can't be turned on. The apps
// already hide expired records from users regardless (status.ts / deriveStatus treats a
// 7-day-old record as "No device found"), so this script is only about reclaiming storage —
// not a privacy or correctness requirement. Run it by hand occasionally, or wire it into a free
// GitHub Actions schedule if you want it automatic. See docs/firebase-setup.md.
//
// Needs a service account key (free, no billing required):
//   Firebase console > Project settings > Service accounts > Generate new private key
// Save it as firebase/service-account.json (git-ignored) or point SERVICE_ACCOUNT_PATH at it.
//
// Usage:
//   node scripts/cleanup-stale.mjs            delete stale records
//   node scripts/cleanup-stale.mjs --dry-run   count them without deleting
import { readFileSync, existsSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500; // Firestore batch write limit.
const dryRun = process.argv.includes('--dry-run');

const keyPath = process.env.SERVICE_ACCOUNT_PATH ?? new URL('../service-account.json', import.meta.url);
if (!existsSync(keyPath)) {
  console.error(
    `No service account key found at ${keyPath}.\n` +
      'Get one free (no billing needed): Firebase console > Project settings > Service accounts > ' +
      'Generate new private key, then save it as firebase/service-account.json.',
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const cutoff = Timestamp.fromMillis(Date.now() - EXPIRY_MS);
const snap = await db.collection('locations').where('updatedAt', '<', cutoff).get();

if (snap.empty) {
  console.log('Nothing stale. 0 documents older than 7 days.');
  process.exit(0);
}

console.log(`Found ${snap.size} document(s) older than 7 days.${dryRun ? ' (dry run: not deleting)' : ''}`);

if (!dryRun) {
  // The Admin SDK bypasses security rules, so this can delete documents regardless of owner.
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(doc.ref);
    await batch.commit();
  }
  console.log(`Deleted ${snap.size} document(s).`);
}
