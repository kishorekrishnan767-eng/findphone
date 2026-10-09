import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // All files share one emulator and clear it between tests, so they must not run concurrently.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
