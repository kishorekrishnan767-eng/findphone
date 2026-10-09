import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/storage/local_store.dart';
import '../data/device_snapshot_source.dart';
import '../data/location_repository.dart';
import '../data/location_source.dart';
import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';
import 'tracking_engine.dart';

/// Builds a [TrackingEngine] wired to Firestore, Geolocator and local storage. Shared by the
/// Android background isolate and the iOS in-process tracker so both behave identically.
TrackingEngine buildTrackingEngine({
  required LocalStore store,
  required void Function(TrackingSnapshot) onSnapshot,
}) {
  final config = TrackingConfig.fromEnvironment();
  final device = DeviceSnapshotSource();
  return TrackingEngine(
    config: config,
    locations: GeolocatorSource(config),
    repository: LocationRepository(
      db: FirebaseFirestore.instance,
      auth: FirebaseAuth.instance,
      store: store,
      device: device,
    ),
    device: device,
    onSnapshot: (s) {
      if (s.lastSyncAt != null) store.setLastSyncAt(s.lastSyncAt!);
      onSnapshot(s);
    },
  );
}
