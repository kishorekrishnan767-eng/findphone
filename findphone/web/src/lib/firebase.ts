import { initializeApp } from 'firebase/app';
import { ReCaptchaV3Provider, initializeAppCheck } from 'firebase/app-check';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { env } from '../config/env';
import { log } from './log';

let db: Firestore | null = null;

/**
 * Firestore for anonymous, read-only lookups. No Auth SDK is loaded: the web app has no login and
 * only ever reads one document by its exact id (firestore.rules: `get` allowed, `list` denied).
 */
export function getDb(): Firestore {
  if (db) return db;

  const app = initializeApp({
    apiKey: env.firebase.apiKey || 'demo-api-key',
    projectId: env.firebase.projectId || 'demo-findphone',
    appId: env.firebase.appId || '1:000000000000:web:0000000000000000',
  });

  if (env.useEmulators) {
    db = getFirestore(app);
    connectFirestoreEmulator(db, env.emulatorHost, 8080);
    log.info('firebase.emulators');
    return db;
  }

  if (env.recaptchaSiteKey) {
    // Debug tokens are honoured only in development builds (docs/firebase-setup.md §5, step B).
    if (import.meta.env.DEV && env.appCheckDebugToken) {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = env.appCheckDebugToken;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    log.warn('firebase.app_check_disabled');
  }

  db = getFirestore(app);
  return db;
}
