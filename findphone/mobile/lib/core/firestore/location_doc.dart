import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/consent_record.dart';

/// Field names and write payloads for `locations/{phoneE164}`. Every write here satisfies
/// firebase/firestore.rules: `updatedAt` is the server time and `expireAt` is ~7 days ahead.
abstract final class LocationDoc {
  static const collection = 'locations';
  static const ringsCollection = 'rings';
  static const schemaVersion = 1;
  static const ttl = Duration(days: 7);

  static DocumentReference<Map<String, dynamic>> ref(FirebaseFirestore db, String phoneE164) =>
      db.collection(collection).doc(phoneE164);

  static Map<String, Object> stamps({DateTime? now}) => {
        'updatedAt': FieldValue.serverTimestamp(),
        'expireAt': Timestamp.fromDate((now ?? DateTime.now()).add(ttl)),
      };

  /// The full document for a new registration. Coordinates start empty ("waiting for first fix").
  static Map<String, Object?> create({
    required String name,
    required String deviceCode,
    required String ownerUid,
    required String claimHash,
    required String platform,
    required String model,
    required ConsentRecord consent,
    required bool sharingEnabled,
  }) =>
      {
        'schemaVersion': schemaVersion,
        'name': name,
        'deviceCode': deviceCode,
        'ownerUid': ownerUid,
        'claimHash': claimHash,
        'platform': platform,
        'model': model,
        'location': null,
        'accuracy': null,
        'battery': null,
        'locatedAt': null,
        'sharingEnabled': sharingEnabled,
        'consent': consent.toFirestore(),
        'createdAt': FieldValue.serverTimestamp(),
        ...stamps(),
      };

  static Map<String, Object?> fix({
    required double latitude,
    required double longitude,
    required double accuracy,
    required DateTime locatedAt,
    required int? battery,
  }) =>
      {
        'location': GeoPoint(latitude, longitude),
        // Rules require 0 < accuracy ≤ 5000; GPS can report 0 on some emulators.
        'accuracy': accuracy.clamp(0.1, 5000.0),
        'locatedAt': Timestamp.fromDate(locatedAt),
        'battery': battery,
        'sharingEnabled': true,
        ...stamps(),
      };

  static Map<String, Object?> sharingOn() => {'sharingEnabled': true, ...stamps()};

  /// Pausing removes the coordinates from the public document, not just hides them.
  static Map<String, Object?> paused() => {
        'sharingEnabled': false,
        'location': null,
        'accuracy': null,
        'locatedAt': null,
        ...stamps(),
      };
}
