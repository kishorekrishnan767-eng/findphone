import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import 'env.dart';

/// Firebase options built from `.env` rather than a generated, committed file.
abstract final class AppFirebaseOptions {
  // Emulator mode always uses demo placeholders, whatever .env says: it matches `npm run emulators`
  // and the demo- prefix keeps the SDK from ever reaching the real project.
  static const _demoProject = 'demo-findphone';
  static const _demoAppId = '1:000000000000:android:0000000000000000';

  static FirebaseOptions get currentPlatform {
    final projectId = _pick(Env.firebaseProjectId, _demoProject);
    final apiKey = _pick(Env.firebaseApiKey, 'demo-api-key');
    final senderId = _pick(Env.firebaseMessagingSenderId, '000000000000');
    final bucket = Env.useEmulators || Env.firebaseStorageBucket.isEmpty ? null : Env.firebaseStorageBucket;

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return FirebaseOptions(
          apiKey: apiKey,
          appId: _pick(Env.firebaseAndroidAppId, _demoAppId),
          messagingSenderId: senderId,
          projectId: projectId,
          storageBucket: bucket,
        );
      case TargetPlatform.iOS:
        return FirebaseOptions(
          apiKey: apiKey,
          appId: _pick(Env.firebaseIosAppId, '1:000000000000:ios:0000000000000000'),
          messagingSenderId: senderId,
          projectId: projectId,
          storageBucket: bucket,
          iosBundleId: _pick(Env.firebaseIosBundleId, 'com.findphone.app'),
        );
      default:
        throw UnsupportedError('FindPhone mobile supports Android and iOS only.');
    }
  }

  static String _pick(String value, String demo) => Env.useEmulators ? demo : value;
}
