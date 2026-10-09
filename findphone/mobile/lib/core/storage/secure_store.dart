import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The recovery-code seed (architecture §5.4). Keystore-backed on Android (wiped on uninstall)
/// and Keychain on iOS (usually survives reinstall, which enables same-device reclaim there).
class SecureStore {
  SecureStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  final FlutterSecureStorage _storage;

  static const _claimSeed = 'claim_seed';

  Future<String?> readClaimSeed() => _storage.read(key: _claimSeed);

  Future<void> writeClaimSeed(String canonicalCode) =>
      _storage.write(key: _claimSeed, value: canonicalCode);

  Future<void> clear() => _storage.delete(key: _claimSeed);
}
