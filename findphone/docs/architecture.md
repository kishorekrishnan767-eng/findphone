# FindPhone — Architecture

Status: Phase 1 (architecture, monorepo structure, data model), updated in Phase 2
Audience: project reviewers and contributors

**Decisions confirmed after Phase 1:** reclaim through a one-time recovery code (works on any device; on iOS the Keychain also makes it automatic on the same device) · teal accent · Android first, with iOS configuration included but untested · web hosted on Firebase Hosting · pausing clears the coordinates.

FindPhone has two clients that share one Firebase project:

- **mobile/** is a Flutter app. It registers a phone number, gets consent and publishes the device's latest location.
- **web/** is a React dashboard. Anyone who knows a registered number can see that device's latest location on a map.

The project has no OTP, no passwords and no Cloud Functions, so it runs on the free Spark plan.

---

## 1. System overview

```mermaid
flowchart LR
  subgraph Phone["mobile/ (Flutter)"]
    UI[UI isolate<br/>Riverpod + go_router]
    SVC[Tracker<br/>Android: foreground-service isolate<br/>iOS: background location stream]
    UI <-->|commands / status| SVC
  end

  subgraph Firebase
    AUTH[Anonymous Auth]
    AC[App Check]
    FS[(Firestore<br/>locations/{phoneE164})]
    TTL[[TTL policy on expireAt]]
  end

  subgraph Browser["web/ (React + MapLibre)"]
    WEB[Lookup panel + map]
  end

  UI -->|signInAnonymously| AUTH
  SVC -->|set/update own doc| FS
  WEB -->|get + onSnapshot on ONE doc id| FS
  AC -.guards.-> FS
  TTL -.deletes stale docs.-> FS
```

| Concern | Decision |
|---|---|
| Identity (mobile) | Firebase Anonymous Auth. The `uid` is written as `ownerUid`. |
| Identity (web) | None. The web app only reads one document, using the exact ID. |
| Lookup key | Document ID = phone number in E.164 format (`+919876543210`). |
| Enumeration defence | Rules allow `get` and deny `list`, so there are no queries and no collection reads. App Check sits in front. |
| Ownership after reinstall | A hash-chain claim (§5.4). The server never stores the secret. |
| Retention | `expireAt` = last write + 7 days. A Firestore TTL policy deletes stale docs. |
| Server code | None. Rules carry all of the authorisation and validation. |
| Maps | MapLibre GL JS with OpenFreeMap for the standard style (no key). Satellite uses MapTiler and is optional. |

---

## 2. Monorepo structure

```
findphone/
├── README.md                         # one-command setup for both apps
├── package.json                      # npm workspaces: web, firebase; root scripts (setup, dev, test, gen)
├── .gitignore
├── .editorconfig
│
├── shared/                           # language-neutral contracts, the single source of truth
│   ├── countries.json                # dial codes, national-number length and mobile-prefix rules
│   ├── phone-vectors.json            # normalisation test vectors run by BOTH the Dart and TS suites
│   ├── claim-chain-vectors.json      # hash-chain vectors: run by the Dart, TS and rules suites
│   └── design-tokens.json            # colour, spacing, radius, elevation, motion, type scale
│
├── scripts/
│   ├── gen-shared.mjs                # shared/*.json -> tokens.css, tokens.g.dart, countries.g.dart (--check)
│   ├── gen-claim-vectors.mjs         # writes shared/claim-chain-vectors.json (--check)
│   └── check-contrast.mjs            # WCAG AA check of every token pairing in use
│
├── firebase/
│   ├── package.json                  # firebase-tools (pinned), @firebase/rules-unit-testing, vitest
│   ├── firebase.json                 # firestore, hosting (../web/dist), emulator ports
│   ├── .firebaserc.example
│   ├── firestore.rules
│   ├── firestore.indexes.json        # field overrides + TTL; needs Blaze to deploy (§5.7), optional
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── scripts/rules-test.mjs        # emulators:exec wrapper; clears a leftover Windows emulator
│   ├── scripts/cleanup-stale.mjs     # free, manual TTL alternative on Spark (service-account script)
│   └── tests/                        # 188 tests, run with `npm run test:rules`
│       ├── helpers.ts                # emulator lifecycle, as(uid), seed()
│       ├── fixtures.ts               # valid doc builder, shared claim-chain vectors
│       ├── read.test.ts              # get allowed (incl. unauthenticated); list, where, documentId, limit, collection-group denied
│       ├── write.test.ts             # create/update/delete ownership, immutable fields, pause invariant
│       ├── validation.test.ts        # 55 invalid + 15 valid documents: types, ranges, lengths, timestamps
│       ├── reclaim.test.ts           # shared vectors through the emulator: valid, wrong, replayed, mis-encoded links
│       └── vectors.test.ts           # independent Node re-derivation of the shared vectors
│
├── mobile/                           # Flutter app, feature-first (Riverpod 3, go_router)
│   ├── .env.example                  # consumed via --dart-define-from-file
│   ├── pubspec.yaml
│   ├── analysis_options.yaml         # strict casts, avoid_print, generated/ excluded
│   ├── assets/fonts/                 # Inter + JetBrains Mono variable fonts (OFL), licences alongside
│   ├── android/app/
│   │   ├── build.gradle.kts          # com.findphone.app, minSdk 24, optional key.properties signing
│   │   └── src/main/
│   │       ├── AndroidManifest.xml   # permissions, typed FGS, non-exported service override
│   │       ├── kotlin/com/findphone/app/MainActivity.kt   # creates the sharing notification channel
│   │       └── res/                  # notification + adaptive launcher icons, backup exclusions
│   ├── ios/Runner/Info.plist         # usage strings, UIBackgroundModes=location
│   ├── ios/Podfile                   # permission_handler macros
│   ├── lib/
│   │   ├── main.dart
│   │   ├── bootstrap.dart            # error hooks, Firebase + App Check, anonymous sign-in, ProviderScope
│   │   ├── app.dart                  # MaterialApp.router, light/dark themes
│   │   ├── core/
│   │   │   ├── config/               # env.dart (dart-defines), firebase_options.dart (from env)
│   │   │   ├── di/providers.dart     # infrastructure providers (Firestore, auth, stores, tracker)
│   │   │   ├── errors/               # app_failure.dart (sealed), error_mapper.dart
│   │   │   ├── firebase/             # firebase_init.dart (per isolate), auth_service.dart
│   │   │   ├── firestore/location_doc.dart   # field names + every write payload
│   │   │   ├── logging/logger.dart   # redacting logger: never prints PII
│   │   │   ├── models/               # consent_record, local_registration
│   │   │   ├── router/               # routes.dart, app_router.dart (setup guard)
│   │   │   ├── storage/              # local_store.dart (prefs), secure_store.dart (claim seed)
│   │   │   ├── phone/phone_normalizer.dart   # §5.5, shared vectors
│   │   │   ├── crypto/claim_chain.dart       # §5.4, shared vectors
│   │   │   ├── device/device_code.dart       # FP-XXXX
│   │   │   ├── time/time_format.dart
│   │   │   └── generated/            # tokens.g.dart, countries.g.dart (do not edit)
│   │   ├── design_system/
│   │   │   ├── theme/app_theme.dart  # ThemeData from tokens; context.fp
│   │   │   └── components/           # fp_button, fp_text_field, fp_phone_field (+ country picker),
│   │   │                             # fp_status_badge, fp_info_row, fp_card, fp_banner, fp_checkbox_tile,
│   │   │                             # fp_feedback (toast, confirm), fp_skeleton, fp_empty_state, fp_scaffold
│   │   └── features/
│   │       ├── onboarding/   presentation/
│   │       ├── consent/      presentation/
│   │       ├── registration/ data/ application/ presentation/   # register, recovery code, reclaim
│   │       ├── permissions/  data/ domain/ application/ presentation/
│   │       ├── reliability/  data/oem_guidance.dart presentation/   # "Keep tracking reliable"
│   │       ├── tracking/
│   │       │   ├── domain/        # location_fix, tracking_config, sync_policy, tracking_snapshot
│   │       │   ├── data/          # location_repository (Firestore), location_source (Geolocator),
│   │       │   │                  # device_snapshot_source (model, battery)
│   │       │   ├── engine/        # tracking_engine, sync_worker, backoff, tracker (interface),
│   │       │   │                  # android_service_tracker, background_entrypoint, service_protocol,
│   │       │   │                  # in_process_tracker (iOS), tracking_runtime
│   │       │   └── application/   # tracking_controller (UI state, lifecycle, pause/resume)
│   │       ├── home/         presentation/ widgets/
│   │       └── account/      data/ application/          # delete everything
│   └── test/                         # 100 tests
│       ├── core/                     # phone_normalizer + claim_chain (shared vectors), logger (no PII)
│       ├── features/tracking/        # sync_policy, sync_worker (fake_async), backoff
│       └── features/consent/         # opt-in gates "Agree and continue"
│
├── web/                              # React + Vite + TypeScript + Tailwind
│   ├── .env.example
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts                # @tailwindcss/vite; fs.allow ../shared
│   ├── tsconfig.json
│   ├── eslint.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css                 # @import tailwindcss + design-system/tokens.css, @font-face
│       ├── config/env.ts             # zod-validated import.meta.env
│       ├── lib/                      # firebase.ts (app, db, App Check), errors.ts, time.ts, log.ts
│       ├── shared/
│       │   ├── phone/                # normalize.ts, countries.ts, mask.ts (+ .test.ts with shared vectors)
│       │   └── hooks/                # useReducedMotion, useMediaQuery, useNow
│       ├── design-system/
│       │   ├── tokens.css            # GENERATED: CSS variables (light/dark) + Tailwind v4 @theme
│       │   └── components/           # Button, IconButton, Input, PhoneInput, StatusBadge, InfoRow,
│       │                             # Toast, Skeleton, EmptyState, Banner, BottomSheet
│       └── features/
│           ├── lookup/
│           │   ├── domain/           # device.ts (DeviceRecord + zod parser), status.ts (live/stale/paused)
│           │   ├── data/             # deviceRepository.ts (watch one doc)
│           │   ├── rateLimiter.ts    # 10 searches / rolling minute
│           │   ├── useDeviceLookup.ts# reducer-based state machine
│           │   └── components/       # SearchPanel, SearchForm, ResultCard, LookupStates
│           └── map/
│               ├── MapView.tsx
│               ├── MapControls.tsx   # zoom, recenter, standard/satellite, open in Google Maps
│               ├── mapStyles.ts
│               ├── useAnimatedMarker.ts  # rAF interpolation
│               ├── deviceMarker.ts   # marker element with pulse
│               ├── accuracyCircle.ts # GeoJSON circle source/layer
│               └── fitZoom.ts        # accuracy (m) -> zoom
│
└── docs/
    ├── architecture.md               # this file
    ├── design-system.md              # principles, tokens, components, copy deck, screens
    ├── firebase-setup.md             # project, auth, Firestore, TTL, App Check order, emulator
    ├── known-limitations.md          # incl. number squatting
    ├── privacy-and-consent.md        # consent text, purpose limitation, DPDP Act 2023 note (Phase 6)
    ├── before-going-public.md        # OTP, lookup second factor, per-user access (Phase 6)
    ├── testing-checklist.md          # (Phase 6)
    └── demo-script.md                # 5-minute review script (Phase 6)
```

### Why `shared/` exists

Dart and TypeScript can't share code, but the two apps must produce the same document ID for the same input. If they disagree, the lookup silently fails. So the contract lives in data rather than in code:

- `phone-vectors.json` holds about 40 `input + defaultCountry → expected E.164 | error` cases. Both test suites load it, so CI fails if either implementation drifts.
- `claim-chain-vectors.json` pins the exact hash-chain encoding (§5.4) for Dart, TypeScript and the Firestore rules tests.
- `countries.json` is imported directly by web. For mobile, `scripts/gen-shared.mjs` generates a const Dart table from it.
- `design-tokens.json` drives `tokens.css` (Tailwind v4 `@theme`) and `tokens.g.dart` (Flutter `ThemeExtension`s), so both apps use the same colours and spacing.
- `npm run gen -- --check` runs in `npm test` and fails if any generated file is stale.

The generator is one Node script rather than one per language. Node is already required for web and the emulator, so this avoids a second toolchain dependency.

I chose a small hand-written normaliser plus vectors over `libphonenumber` ports. The two ports ship different metadata versions, and a silent mismatch there would break lookups.

### Root scripts (planned)

| Command | Does |
|---|---|
| `npm run setup` | `npm install` (workspaces) → `flutter pub get` → `npm run gen` |
| `npm run gen` | Regenerate tokens and country tables from `shared/` (`-- --check` to verify only) |
| `npm run emulators` | Firestore + Auth emulators with rules hot-reload |
| `npm run test:rules` | Rules tests against the emulator |
| `npm run test` | Rules + web + `flutter test` |
| `npm run dev:web` | Vite dev server |
| `npm run deploy:rules` / `deploy:web` | Firebase deploy |

---

## 3. Mobile architecture

**Layering per feature:** `presentation` (widgets) → `application` (Riverpod notifiers and providers, no code generation) → `domain` (pure Dart: models and policies) → `data` (repositories over Firebase and platform plugins). Every thrown error passes through `core/errors/error_mapper.dart` and becomes a sealed `AppFailure` (`OfflineFailure`, `NumberTakenFailure`, `OwnershipLostFailure`, `QuotaExceededFailure`, `AppCheckFailure`, `RecordMissingFailure`, `InvalidRecoveryCodeFailure`, `LocationServicesOffFailure`, …), each carrying its user-facing copy. Screens switch on these types, never on raw exceptions. All diagnostics go through `core/logging/logger.dart`, which prints only codes and numbers. A unit test proves names, numbers and coordinates come out as `<redacted>`.

**Routing guard.** The `go_router` redirect derives the next required step from persisted flags (`requiredSetupStep` in `app_router.dart`):

```
onboarding seen?            ─no→ /onboarding
consent stored?             ─no→ /consent
registered?                 ─no→ /register   (/reclaim allowed as the alternative)
recovery code acknowledged? ─no→ /recovery-code   (re-shown until ticked; can't be skipped by back or a crash)
permissions step done?      ─no→ /permissions → /reliability (Android, when relevant) → /home
```

### 3.1 Tracking engine

`TrackingEngine` (`features/tracking/engine/`) is the **only writer of tracking data**. It streams positions, refreshes them on each heartbeat, and feeds the `SyncWorker`. Pause and stop also go through it, so a late in-flight write can never put coordinates back after a pause.

| | Android | iOS (untested) |
|---|---|---|
| Where the engine runs | `flutter_background_service` isolate in a foreground service (`foregroundServiceType="location"`) with a persistent "Sharing location" notification | The UI isolate, with `allowBackgroundLocationUpdates` and the blue location indicator |
| UI ↔ engine | Messages (`ServiceProtocol`): `setMode`, `pause`, `stop`, `ping` → `ready`, `snapshot`, `paused`, `stopped` | Direct calls (`InProcessTracker`) |
| Survives swipe-away | Yes, the service has its own Flutter engine | No, iOS suspends the app; relaunching resumes |
| Foreground sampling | Fused provider, 15 s interval, no distance filter | `best` accuracy, 10 m filter |
| Background sampling | 5 min interval | iOS decides; heartbeats take a fresh reading |
| Restart after reboot | Only while "Allow all the time" is granted (see below) | Not supported |

- **Why no distance filter on the stream?** A filtered stream goes silent when the phone is still, so heartbeats would resend an old fix and the web would show it as old. The stream samples on a timer instead, and the 25 m "meaningful change" rule is applied by `SyncPolicy` before anything is written. If the stream has been quiet longer than a heartbeat, the engine takes a one-off `getCurrentPosition` first.
- **Android 14+ service type.** The manifest overrides the plugin's service entry with `android:foregroundServiceType="location"` and `exported="false"`. The plugin ships it exported, which would let other apps start it. The app also declares `FOREGROUND_SERVICE_LOCATION`, and the service is only started while the app is visible, so the while-in-use permission is enough.
- **Restart on boot.** The plugin's boot receiver would start the service at boot, and Android 14+ rejects a location foreground service started there unless background location is granted. The plugin swallows that `SecurityException`, which would then crash the service. So `autoStartOnBoot` is re-set on every app start to `true` only while "Allow all the time" is granted.
- **Notification.** The channel `findphone_sharing` (low importance: visible, silent) is created in `MainActivity.kt`. That avoids a notifications plugin for one call. Tapping the notification opens the app, where pausing is one tap.
- **OEM battery killers.** Xiaomi, Oppo, Vivo, Realme and Samsung can kill foreground services despite the notification. The `reliability/` feature detects the manufacturer and checks battery optimisation, background location and notifications live, then shows that phone's settings path (design: [design-system.md §8.2](design-system.md)).
- `workmanager` isn't used: its 15-minute minimum period can't meet the 5-minute background target.

### 3.2 Sync policy (when to write)

`SyncPolicy.evaluate` (pure, unit tested) writes a reading when **any** of these is true:

1. It's the first reading of a session (start, or resume after pause, which cleared the coordinates).
2. Moved ≥ `TRACKING_DISTANCE_FILTER_METERS` (default 25 m) from the last written position.
3. Accuracy improved by ≥ 50% and by at least 20 m (a cold GPS fix becoming precise).
4. Battery changed by ≥ `TRACKING_BATTERY_DELTA` points (default 5).
5. **Heartbeat elapsed:** `TRACKING_FG_HEARTBEAT_SECONDS` in the foreground (default 60), `TRACKING_BG_INTERVAL_SECONDS` in the background (default 300).

The heartbeat matters because the web shows **Live** only for data under `VITE_LIVE_THRESHOLD_SECONDS` (default 120) old. Without it, a phone lying on a desk would show "Last seen 20 min ago". The foreground heartbeat must stay below that threshold, so values outside 30–110 s fall back to the default with a warning that contains no personal data. Every heartbeat is a Firestore write, so this setting is the main lever on quota (§7).

### 3.3 Offline and retry: single-flight, latest-wins

The Firestore SDK queues writes while offline, but it replays *every* queued write on reconnect. That wastes quota and sends a burst of stale positions to the web map. `SyncWorker` does this instead:

- It holds **one** pending reading; newer readings replace it.
- At most one write is in flight, and the next starts only after it settles. If a write takes more than 10 s (usually offline), the UI shows "offline". The worker keeps waiting for that write rather than issuing more.
- Failures (`unavailable`, `deadline-exceeded`, App Check) retry with exponential backoff and ±20% jitter: 2 s → 4 s → … capped at 5 min, and reset after a success.
- `permission-denied` **halts** without retrying: ownership was lost (the number was reclaimed elsewhere), so the UI says so.
- `resource-exhausted` (the daily free quota is used up) waits the full 5 min between attempts, and Home shows "Daily sync limit reached".
- `not-found` means TTL removed the record during a long pause. The record is recreated from local state, **continuing the claim chain from its current head** (not H¹⁰⁰⁰, which would make links already revealed valid again), and the reading is retried.
- Each write carries `locatedAt`, so a reading delivered late is shown with its true age.

All of this is covered by `sync_worker_test.dart` using `fake_async`.

### 3.4 Tracking configuration

All values come from `mobile/.env` (via `--dart-define-from-file`, so they're compiled into both isolates) and are validated in `TrackingConfig.fromEnvironment`. An out-of-range value falls back to its default.

| Key | Default | Allowed | Meaning |
|---|---|---|---|
| `TRACKING_FG_INTERVAL_SECONDS` | 15 | 5–60 | Foreground sampling interval |
| `TRACKING_FG_HEARTBEAT_SECONDS` | 60 | 30–110 | Max time between writes in the foreground, even when still |
| `TRACKING_BG_INTERVAL_SECONDS` | 300 | 120–900 | Background sampling and heartbeat interval |
| `TRACKING_DISTANCE_FILTER_METERS` | 25 | 10–200 | Movement that counts as a change |
| `TRACKING_BATTERY_DELTA` | 5 | 1–20 | Battery change (points) that triggers a write |

Web counterpart: `VITE_LIVE_THRESHOLD_SECONDS` (default 120) in `web/.env`.

### 3.5 Registration, reclaim and delete

- **Register.** Sign in anonymously → read the document **from the server**. If it's missing: generate the recovery code, store it in secure storage *before* writing (a crash can't leave an unclaimable record), and create the document with `claimHash = H¹⁰⁰⁰`. If this uid already owns it: refresh name and model. If someone else owns it: "already registered", with Reclaim offered. A race (created between the read and the write) surfaces as `permission-denied` and is reported as "already registered".
- **Recovery code.** Shown on its own screen until the user ticks "I've saved it". The router keeps returning there until then.
- **Reclaim.** Canonicalise the code → read the stored `claimHash` → find `k` locally (≤ 1000 hashes, about 1 ms) → write `Hᵏ⁻¹` together with the new `ownerUid` and fresh consent. A wrong code is rejected locally, and the rules would reject it anyway.
- **Pause.** The engine stops, drains, then writes `sharingEnabled: false` with the coordinates set to null. If the service doesn't answer within 20 s, the UI stops it and writes the pause itself.
- **Delete.** Stop tracking (no further writes) → delete the document (it must reach the server within 15 s, or the user is told to reconnect; "deleted" is never claimed while it's only queued) → wipe secure storage and preferences → delete the anonymous account.

---

## 4. Web architecture

- **Stack:** React 19, Vite, TypeScript (strict), Tailwind with CSS-variable tokens, MapLibre GL JS, `lucide-react`, `zod`, and the Firebase JS SDK (modular, Firestore + App Check only).
- **No global state library.** The lookup is a reducer-driven state machine in `useDeviceLookup`:

```
idle → invalid
     → rateLimited
     → loading → notFound
               → found(live | stale | paused | noLocation) ⟲ snapshot updates
               → error(network | blocked | unknown)
```

- **Data:** `deviceRepository.watch(phoneE164)` wraps `onSnapshot(doc(db, 'locations', id))`. The snapshot is parsed by a zod schema, and anything malformed is treated as `notFound`, so bad data never reaches the UI. Snapshots from cache while offline raise a "Reconnecting…" banner and keep the last known state.
- **Status** (`status.ts`, pure and unit tested). The checks run in this order:
  - `now − updatedAt ≥ 7 days` → **No device found**, exactly like a missing document. TTL deletion can lag by up to about a day, so the web never shows a record the system already considers expired.
  - `sharingEnabled == false` → **Paused**. No pin is shown.
  - `location == null` → **Waiting for first location**.
  - `seenAt = min(updatedAt, locatedAt)`. `now − seenAt < 2 min` → **Live**. Taking the *older* of the two means a reading delivered late after being offline (fresh `updatedAt`, old `locatedAt`) is not shown as Live. Phones refresh `locatedAt` on every heartbeat (§3.1), so a still phone stays Live.
  - Otherwise → **Last seen** with relative time and the exact `seenAt` timestamp in monospace.
- **Rate limit:** a rolling window of 10 searches per 60 s, kept in `sessionStorage`. This is a UX guard against casual abuse, **not** a security control (see §6).
- **Map:** `flyTo` with ease-out. The zoom comes from accuracy (≈ 17 for ≤ 20 m down to ≈ 13 for 1 km). The marker is interpolated with `requestAnimationFrame` over 600 ms (`motion.markerGlide`). The accuracy circle is a GeoJSON polygon. With reduced motion enabled, the map uses `jumpTo` and moves the marker instantly.
- **Layout:** a floating left panel on desktop (≥ 1024 px), a narrower floating panel on tablet, and a bottom sheet with a drag handle and two snap points on mobile.

---

## 5. Data model

### 5.1 `locations/{phoneE164}`

The document ID must match `^\+[1-9][0-9]{6,14}$`. The ID is the phone number and Firestore document IDs can't change, so the number is immutable by construction. The number is never stored as a field; a `phone` field is rejected as unknown.

| Field | Type | Constraints (enforced in rules) | Written | Notes |
|---|---|---|---|---|
| `schemaVersion` | int | `== 1` | create | Allows future migrations |
| `name` | string | 1–40 chars | create, owner update | Shown on web |
| `deviceCode` | string | `^FP-[0-9A-HJKMNP-TV-Z]{4}$` | create | Crockford base32. Immutable, and kept across reclaim |
| `ownerUid` | string | `== request.auth.uid` on create; immutable on owner update | create, reclaim | Only the reclaim path can change it |
| `claimHash` | string | 64 lowercase hex | create, reclaim | Head of the hash chain (§5.4) |
| `platform` | string | `'android' \| 'ios'` | create, owner update | |
| `model` | string | 1–60 chars | create, owner update | e.g. "Pixel 7a" |
| `location` | GeoPoint \| null | lat ∈ [−90, 90], lng ∈ [−180, 180]; null together with `accuracy` and `locatedAt` | owner update | **Must be null when `sharingEnabled` is false** |
| `accuracy` | number \| null | 0 < x ≤ 5000 (metres) | owner update | |
| `battery` | int \| null | 0–100 | owner update | null when the OS doesn't report it |
| `locatedAt` | timestamp \| null | within [`request.time` − 7 d, `request.time` + 5 min] | owner update | Device clock time of the fix |
| `sharingEnabled` | bool | false ⇒ `location`, `accuracy`, `locatedAt` are all null | owner update | Enforced in rules, not only in the app |
| `consent` | map | `{locationSharing: true, acceptedAt: ≤ now + 5 min, termsVersion: 1–16 chars}`, closed key set | create, reclaim | Immutable on owner update; re-captured when someone reclaims |
| `createdAt` | timestamp | `== request.time` on create; immutable afterwards (including reclaim) | create | |
| `updatedAt` | timestamp | `== request.time` on every write | always | Server timestamp |
| `expireAt` | timestamp | within [`updatedAt` + 6 d, `updatedAt` + 8 d] | always | TTL field. The client sends now + 7 d; ±1 d allows for device clock skew |

The field set is closed: `keys().hasOnly([...])` rejects any unknown field. A typical document is about 600 bytes.

Additions to your spec, and why:

- **`locatedAt`** means a fix delivered late after being offline doesn't show as "Live".
- **`schemaVersion`** is cheap insurance for changes after the demo.
- **`location`, `accuracy` and `locatedAt` are nullable** so that pausing *removes* the coordinates rather than only hiding them. Because `get` is public, a hidden-but-present location could still be read straight from the API.

### 5.2 Local device state (never uploaded)

| Key | Store | Purpose |
|---|---|---|
| `onboarding_seen`, `consent_accepted`, `terms_version` | shared_preferences | Router guard |
| `registered_phone`, `device_code` | shared_preferences | Home screen, re-registration if TTL removed the doc |
| `claim_seed` | flutter_secure_storage | Reclaim secret (§5.4) |
| `sharing_paused` | shared_preferences | Restores the user's choice on relaunch |

### 5.3 Access matrix

| Operation | Who | Allowed when |
|---|---|---|
| `get` | anyone (App Check required) | always, for a valid E.164 ID |
| `list` / any query | anyone | **never** |
| `create` | signed-in (anonymous) | doc doesn't exist, `ownerUid == auth.uid`, consent is true, all fields valid |
| `update` (normal) | owner | `resource.ownerUid == auth.uid`; only `name, platform, model, location, accuracy, battery, locatedAt, sharingEnabled, updatedAt, expireAt` may change; all fields valid |
| `update` (reclaim) | new anonymous uid | `sha256(new.claimHash) == old.claimHash`; `ownerUid` becomes the caller; additionally only `claimHash` and `consent` may change. `deviceCode`, `createdAt` and `schemaVersion` stay put |
| `delete` | owner | `resource.ownerUid == auth.uid` |
| everything else | anyone | denied by default |

### 5.4 Reclaim after reinstall: a hash chain, so the server never holds the secret

A reinstall creates a new anonymous `uid`, so the device must prove it is the same owner. Firestore stores whatever you write, and every document is publicly readable here. A naive "send the secret, rules compare its hash" design would therefore leave the secret sitting in a public document.

The design uses a Lamport-style hash chain instead:

```
seed            = random 100-bit value, shown to the user as a recovery code  XXXXX-XXXXX-XXXXX-XXXXX
H(x)            = lowercase hex( SHA-256( utf8(x) ) )
chain           = H¹(seed), H²(seed), … , H¹⁰⁰⁰(seed)
on register     claimHash = H¹⁰⁰⁰(seed)
on reclaim      device reads the public claimHash = Hᵏ, finds k locally, writes claimHash = Hᵏ⁻¹
rules check     hashing.sha256(new.claimHash).toHexString().lower() == old.claimHash
```

**Exact encoding.** Every implementation must match this byte for byte. It is pinned by `shared/claim-chain-vectors.json` (Phase 3).

| Step | Rule |
|---|---|
| Seed generation | 100 bits from a CSPRNG (`Random.secure()`), encoded as 20 Crockford base32 characters from the alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` |
| Display form | `XXXXX-XXXXX-XXXXX-XXXXX` (4 groups of 5) |
| Input canonicalisation | Uppercase; remove spaces and hyphens; map `O→0`, `I→1`, `L→1`; reject `U` and any other character; the length must be exactly 20 |
| H¹ | `sha256` over the **UTF-8 bytes of the 20-character canonical string** (no hyphens), output as 64 lowercase hex characters |
| Hⁱ⁺¹ | `sha256` over the **UTF-8 bytes of the 64-character lowercase hex string Hⁱ** (not the raw 32 bytes). Rules can only hash strings, so the hex form is the one every implementation uses. |
| Chain length | N = 1000. `claimHash` on create = H¹⁰⁰⁰ |
| Finding k on reclaim | Compute H¹…H¹⁰⁰⁰ once (about 1 ms) and look for the stored value. If it isn't found, the code is wrong. If k = 1, the chain is exhausted and the user has to delete and register again. |
| Rules | `hashing.sha256(request.resource.data.claimHash).toHexString().lower() == resource.data.claimHash`. **`.lower()` is required:** the emulator's `toHexString()` returns *uppercase* hex. A mutation test without it rejected every valid reclaim (15 failures), so Node and the rules really do disagree on case. |
| Replay | A link that was already revealed is the *current* `claimHash`. Hashing it gives Hᵏ⁺¹, which no longer matches, so the rules reject it. A rules test covers this. |

Each stored value is safe to publish, because moving one step back needs a SHA-256 preimage. Each reclaim uses up one link, which blocks replay, and 1,000 links is far more than the project will ever need. All of this runs on the Spark plan with no Cloud Function.

Where the seed lives, and the catch:

- **iOS:** Keychain entries survive an app reinstall, so the "same device" reclaim works automatically.
- **Android:** Keystore-backed secure storage is **wiped on uninstall**, so a purely local secret can't survive a reinstall there. The app shows the recovery code once, after registration, with a copy button. Reclaim then accepts the code on any device. Whether to keep reclaim strictly same-device instead is an open decision for Phase 4.

### 5.5 Phone normalisation (normative)

The phone number *is* the document ID, so both apps must turn the same input into the same E.164 string. This algorithm is the contract. `shared/countries.json` is the data, and `shared/phone-vectors.json` holds 48 hand-written cases that the Dart suite runs now and the TypeScript suite will run in Phase 5.

```
input, defaultCountry
1. trim. Allowed characters: digits, whitespace, - . ( ) and ONE leading +. Otherwise → invalid-characters
2. digits = all digits. No digits → empty
3. International if the input starts with "+" (digits as-is) or the digits start with "00" (drop "00"):
     country  = longest dial-code prefix match (3, 2, then 1 digits); prefer defaultCountry if it
                shares the dial code (+1 → US or CA). No match → unknown-country
     national = the rest; if it starts with the country's trunk prefix AND removing it leaves a
                length within nationalLength, remove it            ("+44 (0) 7700 900123")
4. Otherwise local, with country = defaultCountry:
     if digits start with the dial code and the rest fits nationalLength → national = rest  ("919876543210")
     else if digits start with the trunk prefix and the rest fits      → national = rest  ("098765 43210")
     else national = digits
5. Validate in this order: length < min → too-short; length > max → too-long;
   not matching mobilePattern → not-mobile
6. Result: "+" + dialCode + national
```

Prefix stripping is decided **by length only**, and the mobile pattern is checked once at the end. That's why a London landline (`020 7946 0123`) reports *not a mobile number* rather than *too long*. The vectors pinned this: the first Dart implementation stripped prefixes only when the remainder was a valid mobile, and the shared vector caught the difference.

The 20 supported countries cover India (the default), the Gulf, South and South-East Asia, the UK, US/Canada, Australia/NZ, Germany and France. Adding one means a row in `countries.json` (with an `example` that must validate, which a test enforces), then `npm run gen`.

### 5.6 Device ID

`FP-` followed by 4 Crockford base32 characters (no I, L, O or U), from a CSPRNG. That gives about 1M combinations. It is only for matching the phone screen against the web card by eye, so it is not required to be unique. It is created once and kept across reclaim.

### 5.7 Indexes and TTL

- No composite indexes, because no queries are allowed.
- `firestore.indexes.json` declares single-field index exemptions for `location`, `expireAt`, `updatedAt` and `claimHash` (nothing queries them, so skipping the index entries reduces write cost and latency), and a TTL policy on `locations.expireAt` (`"ttl": true`).
- **Deploying that file needs the Blaze billing plan** — Google gates the field-management API behind it, independent of whether usage itself would stay free. This deployment runs on Spark with no billing account, so `firestore.indexes.json` is **not deployed**; `npm run deploy:rules` pushes the rules alone. See docs/firebase-setup.md §4 for what that trades off (basically nothing functional) and the free alternative: `firebase/scripts/cleanup-stale.mjs`, a service-account script that deletes 7-day-old records directly, run by hand (`npm run cleanup:stale -w firebase`) instead of automatically.
- None of this affects correctness: §4's status logic already treats a 7-day-old `updatedAt` as "No device found" regardless of whether the document has actually been deleted, so users never see stale data either way.
- A paused device doesn't write, so (once/if TTL is enabled, or the cleanup script is run) its doc expires 7 days after the pause. When the app next opens and finds its doc missing, it re-creates it with the stored phone number, device code and claim chain.

---

## 6. Security model and residual risk

| Threat | Mitigation | Residual risk (documented in known-limitations) |
|---|---|---|
| Dump all users | `list` denied, so no queries | None at the API level |
| Enumerate numbers via `get` | App Check (Play Integrity / App Attest / reCAPTCHA v3), client cooldown | Indian mobile numbers are only ~4×10⁹ values. A determined attacker who passes App Check can still probe. Server-side rate limits need a Cloud Function proxy (Blaze plan) or OTP; see "before going public" |
| Squatting someone else's number | None; numbers are unverified | Real. The demo-mode notice says so, and OTP is item #1 on the go-public checklist |
| Overwriting another user's location | `ownerUid == auth.uid`; reclaim needs a chain preimage | None |
| Stealing the claim secret from the public doc | Only hash-chain values are stored | None |
| Malformed or oversized data | Closed field set, type, range and length checks | None |
| PII in logs | Redacting logger on mobile; `log.ts` on web strips values; lint rule bans `print` and `console.*` | Developer discipline |
| Stale data kept forever | TTL at 7 days; delete button; pause clears coordinates | TTL lag of up to ~24 h |

---

## 7. Firestore free-tier quota

The Spark plan (and the free allowance on Blaze) gives, **per day**:

| Resource | Free per day | Notes |
|---|---|---|
| Document writes | **20,000** | Every location write and heartbeat counts. This is the limit we'd hit first. |
| Document reads | **50,000** | Each web `onSnapshot` delivery is one read, plus one when the listener starts |
| Document deletes | **20,000** | User deletes + TTL deletions |
| Stored data | 1 GiB total | ~600 B per device, so effectively unlimited for this project |
| Outbound data | 10 GiB / month | |

The quota resets at **midnight Pacific time** (13:30 IST, 12:30 during US daylight saving time). On Spark, going over doesn't cost money: further operations fail with `resource-exhausted` until the reset. The app shows a clear message and backs off (§3.3).

**Writes per device per day ≈ foreground seconds ÷ FG heartbeat + background seconds ÷ BG interval + movement writes**

| FG heartbeat | Phone left open in foreground all day, stationary | Max such phones within 20k |
|---|---|---|
| 30 s | 2,880 | 6 |
| **60 s (default)** | **1,440** | **13** |
| 90 s | 960 | 20 |

| Realistic scenario | Writes/day | Reads/day |
|---|---|---|
| 1 phone, mostly in background (5 min) | ~290 | — |
| 1 phone, 1 h in foreground while moving (≤ 15 s cadence) | ≤ 240 | — |
| 1 web viewer watching a live phone for 30 min | — | ~30 + 1 per move |
| **Demo day: 15 phones + 5 viewers** | **~5k** | **~2k** |

That leaves plenty of headroom, and no billing account is needed. Lower the heartbeat for a smoother live demo, or raise it if many testers leave the app open. Usage is visible at Firebase console › Firestore › Usage.

---

## 8. Package choices

| Mobile | Purpose |
|---|---|
| `flutter_riverpod` 3 (no code generation) | State and DI |
| `go_router` | Routing + guard |
| `firebase_core`, `firebase_auth`, `cloud_firestore`, `firebase_app_check` | Backend |
| `geolocator` | Location stream, accuracy, service status |
| `permission_handler` | Background-location and notification permissions, opening settings |
| `flutter_background_service` | Android foreground-service isolate |
| `device_info_plus`, `battery_plus` | Model, battery |
| `shared_preferences`, `flutter_secure_storage` | Local state, claim seed |
| `crypto` | SHA-256 for the claim chain |
| `connectivity_plus` | Offline banner (a hint only; the sync worker is the source of truth) |
| `lucide_icons_flutter` | Same icon set as web (Lucide), matching the stroke style |
| `url_launcher` | Privacy note and dontkillmyapp.com links |

| Web | Purpose |
|---|---|
| `firebase` (firestore, app-check) | Data |
| `maplibre-gl` | Map |
| `lucide-react` | Icons |
| `zod` | Env and document validation |
| `tailwindcss` | Styling from tokens |
| `vitest`, `@testing-library/react` | Tests |

Google Maps is an optional alternative. Swap `MapView.tsx` for `@vis.gl/react-google-maps` behind the same `MapView` props, at the cost of an API key and billing account.
