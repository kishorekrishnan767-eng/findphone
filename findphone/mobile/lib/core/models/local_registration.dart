/// This phone's registration as remembered on the device. Enough to recreate the Firestore
/// record if TTL removed it while sharing was paused.
class LocalRegistration {
  const LocalRegistration({
    required this.phoneE164,
    required this.name,
    required this.deviceCode,
    required this.claimHash,
  });

  final String phoneE164;
  final String name;
  final String deviceCode;

  /// The current public head of the claim chain (architecture §5.4). Not secret: it is the
  /// value stored in the public document. Kept so a recreated record continues the chain
  /// instead of resetting it, which would make previously revealed links valid again.
  final String claimHash;

  LocalRegistration copyWith({String? name, String? claimHash}) => LocalRegistration(
        phoneE164: phoneE164,
        name: name ?? this.name,
        deviceCode: deviceCode,
        claimHash: claimHash ?? this.claimHash,
      );
}
