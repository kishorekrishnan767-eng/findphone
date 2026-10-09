/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // shared/countries.json and shared/phone-vectors.json live outside web/.
    fs: { allow: [repoRoot] },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1200, // MapLibre alone is ~1 MB; it is split into its own chunk below.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          return undefined;
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
