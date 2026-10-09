/// Build-time configuration from `flutter run --dart-define-from-file=.env`.
///
/// These are compile-time constants, so they are identical in the UI isolate and the
/// background-service isolate. See `mobile/.env.example` for every key.
abstract final class Env {
  static const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const firebaseMessagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const firebaseStorageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');
  static const firebaseAndroidAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
  static const firebaseIosBundleId = String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID');

  static const useEmulators = bool.fromEnvironment('USE_EMULATORS');
  static const emulatorHost = String.fromEnvironment('EMULATOR_HOST', defaultValue: '10.0.2.2');

  static const appCheckDebugToken = String.fromEnvironment('APP_CHECK_DEBUG_TOKEN');

  static const termsVersion = String.fromEnvironment('TERMS_VERSION', defaultValue: '1.0');
  static const privacyUrl = String.fromEnvironment('PRIVACY_URL');
  static const webLookupUrl = String.fromEnvironment('WEB_LOOKUP_URL');

  static const trackingFgIntervalSeconds = int.fromEnvironment('TRACKING_FG_INTERVAL_SECONDS', defaultValue: 15);
  static const trackingFgHeartbeatSeconds = int.fromEnvironment('TRACKING_FG_HEARTBEAT_SECONDS', defaultValue: 60);
  static const trackingBgIntervalSeconds = int.fromEnvironment('TRACKING_BG_INTERVAL_SECONDS', defaultValue: 300);
  static const trackingDistanceFilterMeters = int.fromEnvironment('TRACKING_DISTANCE_FILTER_METERS', defaultValue: 25);
  static const trackingBatteryDelta = int.fromEnvironment('TRACKING_BATTERY_DELTA', defaultValue: 5);

  /// The app can run against the emulators with no Firebase project at all.
  static bool get isFirebaseConfigured =>
      useEmulators || (firebaseProjectId.isNotEmpty && firebaseApiKey.isNotEmpty);
}
