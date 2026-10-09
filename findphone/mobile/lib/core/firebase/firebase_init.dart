import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../config/env.dart';
import '../config/firebase_options.dart';
import '../logging/logger.dart';

/// Initialises Firebase for the current isolate. Called by the UI isolate and again by the
/// Android background-service isolate, which has its own Dart state.
Future<void> initFirebase() async {
  await Firebase.initializeApp(options: AppFirebaseOptions.currentPlatform);

  if (Env.useEmulators) {
    FirebaseFirestore.instance.useFirestoreEmulator(Env.emulatorHost, 8080);
    await FirebaseAuth.instance.useAuthEmulator(Env.emulatorHost, 9099);
    Log.info('firebase.emulators', {'enabled': true});
    return; // The emulators don't enforce App Check.
  }

  // Debug builds with a registered token use the debug provider; everything else attests for real.
  final useDebug = !kReleaseMode && Env.appCheckDebugToken.isNotEmpty;
  await FirebaseAppCheck.instance.activate(
    providerAndroid: useDebug
        ? const AndroidDebugProvider(debugToken: Env.appCheckDebugToken)
        : const AndroidPlayIntegrityProvider(),
    providerApple: useDebug
        ? const AppleDebugProvider(debugToken: Env.appCheckDebugToken)
        : const AppleAppAttestWithDeviceCheckFallbackProvider(),
  );
  Log.info('firebase.app_check', {'debug': useDebug});
}
