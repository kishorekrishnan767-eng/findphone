import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firestore/location_doc.dart';
import '../../../core/logging/logger.dart';
import '../../../core/storage/local_store.dart';
import '../domain/location_fix.dart';
import 'device_snapshot_source.dart';

/// Every Firestore write the tracking engine makes. Only one isolate drives this at a time
/// (the Android service, or the UI isolate on iOS), so writes never race.
class LocationRepository {
  LocationRepository({
    required FirebaseFirestore db,
    required FirebaseAuth auth,
    required LocalStore store,
    required DeviceSnapshotSource device,
  })  : _db = db,
        _auth = auth,
        _store = store,
        _device = device;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final LocalStore _store;
  final DeviceSnapshotSource _device;

  DocumentReference<Map<String, dynamic>> get _doc {
    final reg = _store.registration;
    if (reg == null) throw const RecordMissingFailure();
    return LocationDoc.ref(_db, reg.phoneE164);
  }

  Future<void> writeFix(LocationFix fix, int? battery) => _doc.update(
        LocationDoc.fix(
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          locatedAt: fix.timestamp,
          battery: battery,
        ),
      );

  /// First write of a session: marks sharing on without touching coordinates.
  Future<void> markSharing() => _doc.update(LocationDoc.sharingOn());

  Future<void> pause() => _doc.update(LocationDoc.paused());

  /// The record vanished (TTL after a long pause, or deleted in the console). Recreate it from
  /// local state, continuing the claim chain from its current public head.
  Future<void> recreate() async {
    final reg = _store.registration;
    final consent = _store.consent;
    final uid = _auth.currentUser?.uid;
    if (reg == null || consent == null || uid == null) throw const RecordMissingFailure();
    final device = await _device.details();
    await LocationDoc.ref(_db, reg.phoneE164).set(
      LocationDoc.create(
        name: reg.name,
        deviceCode: reg.deviceCode,
        ownerUid: uid,
        claimHash: reg.claimHash,
        platform: device.platform,
        model: device.model,
        consent: consent,
        sharingEnabled: true,
      ),
    );
    Log.info('location.recreated');
  }
}
