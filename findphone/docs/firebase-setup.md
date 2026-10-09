# Firebase setup

Audience: whoever sets up the project for the first time (about 30 minutes).
Everything here stays on the free **Spark** plan and needs no billing account — rules, Auth, Firestore reads/writes/deletes, and Hosting all work on Spark. The one exception is Firestore's TTL/index-exemption configuration, which Google gates behind Blaze; §4 covers the free workaround this project uses instead.

Order matters: **emulator first, then a real project with App Check in monitor mode, and enforcement last.** Enforcing App Check before every client sends valid tokens locks your own apps out.

---

## 0. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20.19+ (24 LTS recommended) | Web app, rules tests, Firebase CLI |
| Java | 21 | Firestore emulator |
| Flutter | 3.41+ | Mobile app |
| Firebase CLI | installed as a dev dependency | `npx firebase …`; no global install needed |

Node 20 reached end of life in April 2026. The test tooling is pinned to the newest versions that still support Node 20 (`@firebase/rules-unit-testing` 5, Firebase JS SDK 12, vitest 4). After moving to Node 24, bump them to `@firebase/rules-unit-testing@6`, `firebase@13` and `vitest@5`.

```bash
npm run setup            # from the repo root: installs workspaces, flutter pub get, generates shared code
```

---

## 1. Run everything locally first (no Firebase project needed)

```bash
npm run test:rules       # 188 rules tests against the Firestore emulator
npm run emulators        # Firestore :8080, Auth :9099, Emulator UI http://localhost:4000
```

The emulator uses the demo project ID `demo-findphone`. Demo projects can't reach real Google services, so nothing you do here touches production. App Check isn't enforced by the emulators, so no tokens are needed at this stage.

- **Android emulator → host machine:** use `10.0.2.2` (set `EMULATOR_HOST=10.0.2.2` in `mobile/.env`).
- **Physical phone on the same Wi-Fi:** use your computer's LAN IP. `firebase.json` binds the emulators to `0.0.0.0`, and Windows will ask to allow Java through the firewall the first time.

---

## 2. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) › **Add project**, for example `findphone-demo`.
2. **Google Analytics: off.** It isn't needed, and it adds a data flow you would have to explain in the privacy note.
3. Stay on the **Spark** plan.

### 2.1 Firestore

1. **Build › Firestore Database › Create database.**
2. Choose **Standard edition**, the `(default)` database, and **production mode**. Our rules replace the defaults in step 4.
3. Location: **`asia-south1` (Mumbai)** if your testers are in India. **This can't be changed later.**

### 2.2 Anonymous Authentication

1. **Build › Authentication › Get started › Sign-in method.**
2. Enable **Anonymous**. Leave every other provider off.

### 2.3 Register the apps

**Project settings › General › Your apps:**

| App | What to enter | Where the values go |
|---|---|---|
| Android | Package name `com.findphone.app`. Add the **SHA-256** of your signing key: `cd mobile/android && ./gradlew signingReport` (use the debug key for testing). | `mobile/.env` (`FIREBASE_*` keys, Phase 4) |
| Web | Nickname "FindPhone web". Don't tick Firebase Hosting here; the CLI handles it. | `web/.env` (`VITE_FIREBASE_*`, Phase 5) |
| iOS (optional, untested) | Bundle ID `com.findphone.app` | `mobile/.env` |

The Firebase web config (API key and so on) is an identifier, not a secret. Access is controlled by the rules and App Check. It still lives in `.env` files, so nothing is hardcoded and each environment can point at its own project.

---

## 3. Link the CLI

```bash
cd firebase
npx firebase login
npx firebase use --add          # pick your project, alias "default"; writes .firebaserc (git-ignored)
```

---

## 4. Deploy rules — and a note on indexes/TTL and billing

```bash
npm run deploy:rules            # from the repo root: firestore.rules only
```

This is the part that matters for security, and it needs no billing account. Check it in the console:

- **Firestore › Rules** shows the FindPhone rules. Use the **Rules Playground** to try `get /locations/+919876543210` unauthenticated (allowed) and a `list` (denied).
- Or verify it directly against the live REST API, no console needed:

  ```bash
  curl -s -w '\n%{http_code}\n' "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/locations/%2B919876543210"
  # 404 NOT_FOUND = get is allowed, the document just doesn't exist yet (correct)
  curl -s -w '\n%{http_code}\n' "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/locations"
  # 403 PERMISSION_DENIED = list is correctly blocked
  ```

### Indexes and the TTL policy need Blaze — this project skips them

`firestore.indexes.json` holds two things: the single-field **index exemptions** (so writes aren't indexed on fields nothing ever queries) and the **TTL policy** on `expireAt` (automatic deletion of records 7+ days old). Both are configured through Firestore's field-management API, and as of when this was built, **that API refuses to run at all without a Blaze (pay-as-you-go) billing account attached** — even though the TTL deletes and the extra index writes it's meant to avoid would themselves have stayed inside the free quota. This is a Google platform requirement, not something in this project's control, and it's a separate thing from Firestore usage itself: ordinary reads, writes, and deletes all work fine and stay free on Spark with no billing account.

If you don't want to attach billing (reasonable for a class project), skip `npm run deploy:indexes` entirely and nothing breaks:

- **Skipping index exemptions costs nothing functionally.** Firestore auto-indexes every field by default; the exemptions only save a little write overhead, invisible at this project's scale (a handful of test phones).
- **Skipping the TTL policy means old records are never auto-deleted from the database.** This is cosmetic for users — both apps already treat a record with `updatedAt` 7+ days old as **"No device found"** regardless of whether it's actually been deleted yet (see architecture.md §4 and §5.7) — but storage will grow slowly forever instead of being reclaimed. At ~600 bytes/document this is not a real problem for a demo (Firestore's free 1 GiB covers well over a million stale records).
- **If you want actual deletion without billing**, run `npm run cleanup:stale -w firebase` by hand (or `--dry-run` to preview first). It's a small script using a free service-account key (Project settings › Service accounts › Generate new private key — no billing needed for this) that deletes 7-day-old records directly, bypassing the billing-gated TTL API entirely. See `firebase/scripts/cleanup-stale.mjs`.
- **If you ever do enable Blaze** (e.g. before a public launch), `npm run deploy:indexes -w firebase` pushes both the index exemptions and the real TTL policy in one go.

---

## 5. App Check, in this order

App Check proves a request comes from *your* app, which blocks scripts that hammer `get` to enumerate numbers. Setting it up wrong locks you out of your own project, so follow these steps in order.

### Step A: Register providers (nothing is enforced yet)

**Build › App Check › Apps:**

| App | Provider | Setup |
|---|---|---|
| Web | **reCAPTCHA v3** | Create a v3 key at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin). Domains: `YOUR_PROJECT.web.app`, `YOUR_PROJECT.firebaseapp.com` (don't add `localhost`; local development uses debug tokens). Paste the **secret key** into App Check and put the **site key** in `web/.env` as `VITE_RECAPTCHA_V3_SITE_KEY`. reCAPTCHA Enterprise also works and is what Firebase now recommends for new projects; it needs a Google Cloud API key but has a free tier. |
| Android | **Play Integrity** | Requires the SHA-256 fingerprint from §2.3. **Caveat:** Play Integrity vouches for apps installed **from Google Play**. A sideloaded APK will usually fail the app-integrity check. For the demo, either distribute through a **Play Console internal testing track** (one-time developer fee), or use **debug tokens** on the few test phones (Step B). |
| iOS (untested) | **App Attest**, with DeviceCheck as a fallback | Needs your Apple Team ID |

### Step B: Debug tokens for development

Debug tokens let a known development build pass App Check without a real attestation. **Each one is a key to your project: keep them out of git and revoke them after the demo.**

| Client | How |
|---|---|
| Web on `localhost` | Generate a UUID and register it under **App Check › Apps › (web app) › ⋮ › Manage debug tokens**. Set `VITE_APP_CHECK_DEBUG_TOKEN=<uuid>` in `web/.env.local` (git-ignored). The web app passes it to the SDK only in development builds. |
| Android debug build | Set `APP_CHECK_DEBUG_TOKEN=<uuid>` in `mobile/.env` and register the same UUID under the Android app. Debug builds use the debug provider and release builds use Play Integrity (Phase 4). |
| Emulator | Nothing to do. The emulators ignore App Check. |

### Step C: Test with App Check in monitor mode

Run each stage and check **App Check › APIs › Cloud Firestore**. The request metrics split traffic into *verified* and *unverified* (outdated client, invalid token):

1. **Emulator**: all features work (§1).
2. **Real project, debug builds**: web on `localhost` and the Android debug build. Lookups, registration, location updates, pause and delete all work, and requests show up as **verified**.
3. **Real project, release builds**: the web app deployed to Firebase Hosting (reCAPTCHA) and the Android app from internal testing (Play Integrity). Requests show up as **verified**.

Don't continue until the unverified share is about 0% for traffic you recognise as your own.

### Step D: Enforce (last)

1. **App Check › APIs › Cloud Firestore › Enforce.**
2. Allow up to about 15 minutes to take effect.
3. Check again: a lookup from the hosted web app works, and a `curl` to the Firestore REST API without a token returns `403`.

To roll back, use **Unenforce** on the same screen. Any client build without App Check stops working once enforcement is on, so enforce only after every tester has the current build.

---

## 6. Hosting (Phase 5)

```bash
npm run build -w web
npm run deploy:hosting -w firebase
```

`firebase.json` serves `../web/dist` with a single-page-app rewrite, long-term caching for hashed assets, `no-cache` on `index.html`, and security headers. Phase 5 adds a Content-Security-Policy once all the map and tile origins are confirmed.

---

## 7. Keep an eye on quota

**Firestore › Usage.** The free tier allows 20,000 writes, 50,000 reads and 20,000 deletes per day, resetting at midnight Pacific time (13:30 IST, or 12:30 during US daylight saving time). See [architecture.md §7](architecture.md) for per-device estimates and the `TRACKING_FG_HEARTBEAT_SECONDS` setting.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Could not start Firestore Emulator, port taken` | On Windows, firebase-tools leaves the Java emulator running after `emulators:exec` and sometimes after Ctrl+C. `npm run test:rules` handles this for you: `firebase/scripts/rules-test.mjs` stops a leftover *Firestore emulator* on the port before and after each run, and never touches any other program. After `npm run emulators`, or if another tool holds the port, find the process with PowerShell: `Get-NetTCPConnection -LocalPort 8080 -State Listen \| % { Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" } \| select ProcessId, CommandLine`. If the command line contains `cloud-firestore-emulator`, stop it with `Stop-Process -Id <pid>`. |
| `firebase-tools` warns about Java | Install JDK 21 and make sure `java -version` shows 21. |
| Every write is denied with `permission-denied` | Check, in order: is the user signed in (anonymous)? Is `updatedAt` a **server** timestamp? Is `expireAt` 6–8 days ahead of the server's time (check the device clock)? Are all 16 fields present? `npm run test:rules` shows a valid document in `firebase/tests/fixtures.ts`. |
| Requests fail only after enforcing App Check | That client isn't sending valid tokens: a debug token isn't registered, the reCAPTCHA domain is missing, or the APK was sideloaded and fails Play Integrity. Unenforce, fix it, and go back to Step C. |
| The TTL policy stays on *Creating* | Normal for a while on new projects. Deletions start once it says *Serving*. |
| `npm run deploy:indexes` fails with "Project ... has billing disabled" | Expected on Spark — see §4. Either leave it unrun (nothing breaks; run `npm run cleanup:stale -w firebase` by hand instead) or attach a Blaze billing account if you want real TTL. |
