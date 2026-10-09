import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/tracking/data/device_snapshot_source.dart';
import '../../features/tracking/data/location_repository.dart';
import '../../features/tracking/engine/android_service_tracker.dart';
import '../../features/tracking/engine/in_process_tracker.dart';
import '../../features/tracking/engine/tracker.dart';
import '../firebase/auth_service.dart';
import '../storage/local_store.dart';
import '../storage/secure_store.dart';

/// Overridden in bootstrap.dart with the instance loaded before runApp.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden'),
);

final localStoreProvider = Provider<LocalStore>((ref) => LocalStore(ref.watch(sharedPreferencesProvider)));

final secureStoreProvider = Provider<SecureStore>((ref) => SecureStore());

final firestoreProvider = Provider<FirebaseFirestore>((ref) => FirebaseFirestore.instance);

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref.watch(firebaseAuthProvider)));

final deviceSnapshotProvider = Provider<DeviceSnapshotSource>((ref) => DeviceSnapshotSource());

final deviceDetailsProvider = FutureProvider<DeviceDetails>(
  (ref) => ref.watch(deviceSnapshotProvider).details(),
);

final locationRepositoryProvider = Provider<LocationRepository>(
  (ref) => LocationRepository(
    db: ref.watch(firestoreProvider),
    auth: ref.watch(firebaseAuthProvider),
    store: ref.watch(localStoreProvider),
    device: ref.watch(deviceSnapshotProvider),
  ),
);

final trackerProvider = Provider<Tracker>((ref) {
  if (defaultTargetPlatform == TargetPlatform.android) {
    return AndroidServiceTracker(fallbackWriter: ref.watch(locationRepositoryProvider));
  }
  return InProcessTracker(ref.watch(localStoreProvider));
});

/// True while any network interface is up. A hint for the UI only; the sync worker's own
/// results are the source of truth for whether writes are getting through.
final onlineProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  bool online(List<ConnectivityResult> r) => r.any((x) => x != ConnectivityResult.none);
  yield online(await connectivity.checkConnectivity());
  yield* connectivity.onConnectivityChanged.map(online);
});
