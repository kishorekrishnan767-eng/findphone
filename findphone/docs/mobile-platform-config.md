# Mobile platform configuration

Audience: whoever builds the Flutter app and reviews its permissions.
Everything below is already in the repo. This page explains each entry and why it's there.

---

## Android

Files: `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/android/app/build.gradle.kts`, `mobile/android/app/src/main/kotlin/com/findphone/app/MainActivity.kt`

### Identity

| Setting | Value |
|---|---|
| `applicationId` / `namespace` | `com.findphone.app` (register this in Firebase) |
| `minSdk` | 24 (Firebase needs 23+) |
| `targetSdk` / `compileSdk` | Flutter defaults (API 36 at the time of writing) |
| Release signing | `android/key.properties` if present (git-ignored); otherwise the debug key, which is fine for sideloaded tests |

### Permissions

| Permission | Why | When it's requested |
|---|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | Firestore; offline banner | Install time |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | The location itself. Both are declared so Android 12+ can offer "Approximate"; the app warns that approximate can be off by up to 3 km | Permissions screen, after the rationale |
| `ACCESS_BACKGROUND_LOCATION` | **Optional.** Only needed so sharing restarts on its own after a reboot (Android 14+ refuses a location foreground service started at boot without it). Sharing works without it | "Keep sharing after a restart" step, which opens Settings (Android 11+ has no in-app prompt) |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` | The sharing service runs as a foreground service of type `location`. The typed permission is mandatory on Android 14+ | Install time |
| `POST_NOTIFICATIONS` | Android 13+: without it, the "Sharing location" notification is hidden in the drawer | Permissions screen, skippable |
| `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` | Used by `flutter_background_service` for its watchdog and restart-after-boot | Install time |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | The "Turn off" button on *Keep tracking reliable*. Google Play only allows this for certain app categories, so remove it for a Play release and keep the manual steps | When the user taps "Turn off" |

### Foreground service (Android 14+)

```xml
<service
    android:name="id.flutter.flutter_background_service.BackgroundService"
    android:foregroundServiceType="location"
    android:exported="false"
    tools:replace="android:exported" />
<receiver
    android:name="id.flutter.flutter_background_service.WatchdogReceiver"
    android:exported="false"
    tools:replace="android:exported" />
```

- **Typed service.** Android 14 throws `MissingForegroundServiceTypeException` for an untyped location service. The Dart side also passes `foregroundServiceTypes: [AndroidForegroundType.location]`.
- **Not exported.** The plugin's own manifest marks the service and watchdog `exported="true"`, which would let any app on the phone start them. The override closes that.
- **Notification channel.** `findphone_sharing` ("Location sharing", low importance: visible, silent) is created in `MainActivity.onCreate`. That avoids a whole notifications plugin for one call. Channels persist, so the channel exists for boot restarts too.
- **Notification copy.** "Sharing location — Anyone with your number can see this phone. Tap to open FindPhone." Tapping it opens the app, where pausing is one tap. The status-bar icon is `res/drawable/ic_bg_service_small.xml` (Lucide "locate-fixed"), which overrides the plugin's default icon.
- **Restart on boot.** This is enabled **only while "Allow all the time" is granted**, and re-evaluated on every app start. Without that permission Android 14+ would reject the boot-time start.

### Backups

`allowBackup="false"` and `data_extraction_rules.xml` exclude everything from cloud backup and device transfer. The recovery secret is in Keystore-encrypted storage, which can't be restored on another device anyway, and a registration shouldn't silently reappear on another phone.

### Launcher icon

The adaptive icon (`mipmap-anydpi-v26/ic_launcher.xml`) uses a teal (`#0F766E`) background and the white "locate-fixed" glyph, with a monochrome layer for Android 13 themed icons. Android 7.x (API 24–25) falls back to the PNG mipmaps.

---

## iOS (included, untested)

Files: `mobile/ios/Runner/Info.plist`, `mobile/ios/Podfile`

| Key | Value / purpose |
|---|---|
| `CFBundleDisplayName` | FindPhone |
| Bundle ID | `com.findphone.app` |
| `NSLocationWhenInUseUsageDescription` | "FindPhone shares this iPhone's latest location with anyone who knows your number, while sharing is on." |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "Allow Always so your location keeps updating while FindPhone is in the background. You can pause sharing at any time." |
| `UIBackgroundModes` | `location`. Keeps updates running in the background; iOS shows the blue location indicator (`showBackgroundLocationIndicator: true`) |
| `LSApplicationQueriesSchemes` | `https` (privacy note link) |
| Podfile macros | `PERMISSION_LOCATION=1`, `PERMISSION_NOTIFICATIONS=1`; everything else in `permission_handler` is compiled out |
| Deployment target | iOS 15 |

Manual steps on a Mac:

1. `cd mobile/ios && pod install`.
2. Open `Runner.xcworkspace`, then **Signing & Capabilities**: choose your team, and add **App Attest** (needed for App Check in release builds).
3. Register the iOS app in Firebase with bundle ID `com.findphone.app`, and copy its app ID into `mobile/.env` (`FIREBASE_IOS_APP_ID`).
4. While-in-use → Always: iOS shows the "Change to Always Allow" prompt itself, some time after the first grant.

---

## Running

```bash
cd mobile
cp .env.example .env                     # fill in Firebase values, or set USE_EMULATORS=true
flutter run --dart-define-from-file=.env
```

`--dart-define-from-file` compiles the values in, so they're available in the background-service isolate too. No Firebase config file is committed: `lib/core/config/firebase_options.dart` reads the values from `.env`.
