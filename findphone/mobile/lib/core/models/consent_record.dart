import 'package:cloud_firestore/cloud_firestore.dart';

/// What the user agreed to on the consent screen. Mirrors `consent` in the Firestore document.
class ConsentRecord {
  const ConsentRecord({required this.acceptedAt, required this.termsVersion});

  final DateTime acceptedAt;
  final String termsVersion;

  Map<String, Object> toFirestore() => {
        'locationSharing': true,
        'acceptedAt': Timestamp.fromDate(acceptedAt),
        'termsVersion': termsVersion,
      };
}
