# Known limitations

Audience: project reviewers and testers.
FindPhone is a demo for **consenting test users**. These are the gaps between it and a public product, stated plainly. Items marked **(go-public blocker)** must be fixed before anyone outside the test group uses it; see `before-going-public.md`.

## Identity and access

### 1. Number squatting: numbers aren't verified (go-public blocker)

There is no OTP, so the app can't confirm that whoever registers `+91 98765 43210` actually owns that SIM.

- **What can go wrong:** someone registers *your* number first. When you try to register, you're told it's already registered. Anyone who looks up your number sees **their** phone's location and name, not yours.
- **What the demo does about it:**
  - The registration screen says "Demo mode: this number isn't verified. Only register your own number."
  - The Device ID (e.g. `FP-7K3Q`) shown on the phone and on the web card lets a tester confirm by eye that the record belongs to the phone in their hand.
  - A squatted record can be removed by the project owner in the Firebase console. If the squatter's app is abandoned, it also expires after 7 days without updates.
- **What it doesn't do:** the real owner can't take the number back. Reclaim needs the squatter's recovery code, by design.
- **Fix:** Firebase Phone Auth (SMS OTP). The rules then require `request.auth.token.phone_number == phone` on create, so only the verified owner of a number can register it.

### 2. Anyone who knows the number can see the location (go-public blocker)

This is the requested behaviour, and the consent checkbox says it word for word. It still means an ex-partner, colleague or stranger who has your number can track you while sharing is on. **Fix:** a second factor for lookups, such as a per-device lookup PIN, or an owner-approved list of viewers.

### 3. Numbers can be probed one at a time

`list` is denied, so the collection can't be downloaded. A single `get` is public, though, and Indian mobile numbers are a small space (about 4 × 10⁹). App Check stops casual scripts, and the web app cools down after 10 searches a minute, but a determined attacker who passes App Check can still probe numbers. Firestore has no per-IP rate limit. **Fix:** route lookups through a Cloud Function with server-side rate limiting (needs the Blaze plan), together with item 2.

### 4. App Check and sideloaded APKs

Play Integrity vouches for apps installed from Google Play. A sideloaded test APK needs either a Play Console internal testing track or a registered debug token. Debug tokens are effectively passwords: anyone holding one passes App Check until it's revoked.

## Tracking

### 5. Background location is throttled by the operating system

- **Android:** Doze mode and manufacturer battery managers (Xiaomi, Oppo, Vivo, Realme, Samsung) can delay or kill the foreground service even with its notification showing. The "Keep tracking reliable" screen walks users through the right settings, but some phones still stop it. The 5-minute background interval is a target, not a guarantee.
- **After a reboot:** sharing restarts on its own only if location is set to "Allow all the time". Otherwise the user has to open the app once.
- **iOS (untested):** the app is suspended once swiped away and relaunched only by significant location changes, so updates can be minutes to hours apart.

### 6. The phone must be online

An offline, switched-off or flat phone can't report. The web then shows **Last seen** with the time of the last update, which may be hours old. That is the honest answer, but it isn't "find my phone even when it's off".

### 7. Accuracy varies

Indoors, in dense cities or with **approximate location** chosen, positions can be off by hundreds of metres to about 3 km. The accuracy circle shows this, and very large circles say so in the card.

### 8. Device clocks are trusted for two fields

`locatedAt` and `expireAt` come from the phone's clock. Rules bound them (`locatedAt` within the last 7 days and no more than 5 min in the future; `expireAt` 6–8 days ahead), so a badly wrong clock causes rejected writes rather than wrong data. `updatedAt` and `createdAt` always come from the server.

## Data lifecycle

### 9. Stale records aren't automatically deleted (TTL needs Blaze billing)

Firestore's TTL feature would auto-delete a record 7 days after its last update, but Google requires a Blaze (pay-as-you-go) billing account just to *configure* TTL — even though the deletes themselves would stay inside the free quota. This deployment deliberately stays on the free Spark plan, so TTL is **off**, and old records sit in the database indefinitely instead of being reclaimed.

This doesn't affect what users see: both apps already treat any record with `updatedAt` 7 or more days old as "No device found," identical to how they'd treat a deleted one. It only means storage grows slowly instead of shrinking back — harmless at this project's scale (≈600 bytes/record, well under the free 1 GiB). `firebase/scripts/cleanup-stale.mjs` deletes stale records by hand for free (a service-account script, not the billing-gated TTL API) if you ever want to reclaim the space; see docs/firebase-setup.md §4.

### 10. Paused records aren't deleted either, for the same reason

A paused phone doesn't write further updates. With real TTL it would be deleted 7 days after pausing and silently re-registered on next open; without it (see above), the paused record just sits there, invisible to lookups (`sharingEnabled: false`) but not removed, until the cleanup script is run or TTL is enabled.

### 11. Anonymous accounts accumulate

Each install creates an anonymous Firebase Auth user. Deleting your data removes the Firestore record and the anonymous account, but an uninstall without deleting first leaves an orphaned anonymous user. It holds no personal data, and on Spark there's no automatic cleanup.

## Recovery

### 12. Reclaim needs the recovery code on Android

Android wipes the app's secure storage on uninstall, so a reinstalled app can't prove ownership on its own. Users must keep the recovery code shown at registration. On iOS the Keychain usually survives a reinstall (untested). Each reclaim uses one link of a 1,000-link chain, which in practice never runs out.

### 13. One phone per number

A number maps to exactly one record. Registering the same number on a second phone means reclaiming it, which moves sharing to the new phone.

## Console features

### 16. Anyone who knows the number can ring the phone

Like viewing the location, ringing needs only the number. The rules cap it at once a minute per phone, and only while the phone is sharing. App Check blocks scripts. A person could still ring a stranger's phone once a minute. The alarm stops after 30 s, or from the app. **Fix before going public:** the same per-viewer authorisation that location lookups need.

### 17. Ring needs the phone online, sharing and (on iOS) awake

The phone hears the request through its Firestore listener, so an offline phone only rings if it reconnects within 2 minutes. On Android the listener runs in the foreground service, so it works with the app closed. On iOS (untested) it only works while the app is running. The ring has been verified in code, rules tests and unit tests, but not yet on a physical phone.

### 18. History, safe zones and alerts run in the viewer's browser

The phone shares only its latest position, by design. The movement trail is what the open page has seen. Safe-zone crossings and alerts are evaluated by the page, so they only fire while a FindPhone tab is open. Nothing is stored on a server.

### 19. Addresses, landmarks, weather and place search use free public services

Nominatim, Overpass, Open-Meteo and Photon (all OpenStreetMap-based, no keys) have fair-use limits and occasional outages. The app caches results and throttles requests (Nominatim ≤ 1 request/s), falls back between Overpass mirrors, and shows "unavailable" rather than breaking. A public launch should use a paid geocoding and places provider, or self-host.

## Operations

### 14. Free-tier quota

20,000 writes a day is roughly 13 phones left open in the foreground all day at the default 60 s heartbeat. Beyond that, writes fail until the quota resets at midnight Pacific time. The app shows a clear message and backs off; it doesn't break.

### 15. Platform coverage

Android is the tested platform. iOS configuration is included but hasn't been run on a device.
