import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { PHONE, type LocationDoc } from './fixtures.js';

export const PROJECT_ID = 'demo-findphone';

// The context returns a compat instance; modular functions unwrap it via getModularInstance.
const modular = (ctx: RulesTestContext) => ctx.firestore() as unknown as Firestore;

/**
 * Registers emulator lifecycle hooks for a test file and returns helpers.
 * `as(uid)` gives a Firestore client signed in as that uid; `as(null)` is unauthenticated.
 */
export function useRulesEnv() {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
    });
  });
  beforeEach(async () => {
    await env.clearFirestore();
  });
  afterAll(async () => {
    await env.cleanup();
  });

  return {
    as(uid: string | null): Firestore {
      return modular(uid === null ? env.unauthenticatedContext() : env.authenticatedContext(uid));
    },
    /** Writes the "given" state with rules bypassed. */
    async seed(data: LocationDoc, id: string = PHONE): Promise<void> {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(modular(ctx), 'locations', id), data);
      });
    },
  };
}
