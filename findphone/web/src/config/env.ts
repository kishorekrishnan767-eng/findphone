import { z } from 'zod';

// Every value has a safe fallback, so a missing or malformed variable degrades to a default
// instead of crashing the page. Firebase values are checked separately in `isFirebaseConfigured`.
const schema = z.object({
  VITE_FIREBASE_API_KEY: z.string().catch(''),
  VITE_FIREBASE_PROJECT_ID: z.string().catch(''),
  VITE_FIREBASE_APP_ID: z.string().catch(''),
  VITE_RECAPTCHA_V3_SITE_KEY: z.string().catch(''),
  VITE_APP_CHECK_DEBUG_TOKEN: z.string().catch(''),
  VITE_USE_EMULATORS: z
    .enum(['true', 'false'])
    .catch('false')
    .transform((v) => v === 'true'),
  VITE_EMULATOR_HOST: z.string().min(1).catch('localhost'),
  VITE_LIVE_THRESHOLD_SECONDS: z.coerce.number().int().min(30).max(600).catch(120),
  VITE_SEARCH_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(60).catch(10),
  VITE_DEFAULT_COUNTRY: z.string().length(2).catch('IN'),
  VITE_MAP_STYLE_LIGHT: z.url().catch('https://tiles.openfreemap.org/styles/positron'),
  VITE_MAP_STYLE_DARK: z.url().catch('https://tiles.openfreemap.org/styles/dark'),
  VITE_MAPTILER_KEY: z.string().catch(''),
});

const raw = schema.parse(import.meta.env);

export const env = {
  firebase: {
    apiKey: raw.VITE_FIREBASE_API_KEY,
    projectId: raw.VITE_FIREBASE_PROJECT_ID,
    appId: raw.VITE_FIREBASE_APP_ID,
  },
  recaptchaSiteKey: raw.VITE_RECAPTCHA_V3_SITE_KEY,
  appCheckDebugToken: raw.VITE_APP_CHECK_DEBUG_TOKEN,
  useEmulators: raw.VITE_USE_EMULATORS,
  emulatorHost: raw.VITE_EMULATOR_HOST,
  liveThresholdMs: raw.VITE_LIVE_THRESHOLD_SECONDS * 1000,
  searchLimitPerMinute: raw.VITE_SEARCH_LIMIT_PER_MINUTE,
  defaultCountry: raw.VITE_DEFAULT_COUNTRY.toUpperCase(),
  map: {
    lightStyle: raw.VITE_MAP_STYLE_LIGHT,
    darkStyle: raw.VITE_MAP_STYLE_DARK,
    satelliteStyle: raw.VITE_MAPTILER_KEY
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(raw.VITE_MAPTILER_KEY)}`
      : null,
  },
} as const;

export const isFirebaseConfigured =
  env.useEmulators || Boolean(env.firebase.apiKey && env.firebase.projectId && env.firebase.appId);
