/// <reference types="vite/client" />

declare global {
  // Read by the Firebase App Check SDK in development (docs/firebase-setup.md §5, step B).
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

export {};
