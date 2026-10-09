import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import 'env.dart';

/// Firebase options built from `.env` rather than a generated, committed file.
abstract final class AppFirebaseOptions {
  // Emulator mode needs syntactically valid placeholders; the demo- prefix keeps the
  // SDK from ever reaching a real project.
  static const _demoProject = 'demo-findphone';
  static const _demoAppId = '1:000000000000:android:0000000000000000';

  static FirebaseOptions get currentPlatform {
    final projectId = _or(Env.firebaseProjectId, _demoProject);
    final apiKey = _or(Env.firebaseApiKey, 'demo-api-key');
    final senderId = _or(Env.firebaseMessagingSenderId, '000000000000');
    final bucket = Env.firebaseStorageBucket.isEmpty ? null : Env.firebaseStorageBucket;

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return FirebaseOptions(
          apiKey: apiKey,
          appId: _or(Env.firebaseAndroidAppId, _demoAppId),
          messagingSenderId: senderId,
          projectId: projectId,
          storageBucket: bucket,
        );
      case TargetPlatform.iOS:
        return FirebaseOptions(
          apiKey: apiKey,
          appId: _or(Env.firebaseIosAppId, '1:000000000000:ios:0000000000000000'),
          messagingSenderId: senderId,
          projectId: projectId,
          storageBucket: bucket,
          iosBundleId: _or(Env.firebaseIosBundleId, 'com.findphone.app'),
        );
      default:
        throw UnsupportedError('FindPhone mobile supports Android and iOS only.');
    }
  }

  static String _or(String value, String fallback) =>
      value.isNotEmpty ? value : (Env.useEmulators ? fallback : value);
}
