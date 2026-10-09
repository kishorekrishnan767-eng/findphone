import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/crypto/claim_chain.dart';
import '../../../core/device/device_code.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/firebase/auth_service.dart';
import '../../../core/firestore/location_doc.dart';
import '../../../core/logging/logger.dart';
import '../../../core/models/consent_record.dart';
import '../../../core/models/local_registration.dart';
import '../../../core/storage/local_store.dart';
import '../../../core/storage/secure_store.dart';
import '../../tracking/data/device_snapshot_source.dart';

sealed class RegistrationOutcome {
  const RegistrationOutcome();
}

/// New record. The recovery code is stored and shown once on the next screen.
final class Registered extends RegistrationOutcome {
  const Registered();
}

/// This uid already owned the number (e.g. registration retried); details were refreshed.
final class AlreadyOwned extends RegistrationOutcome {
  const AlreadyOwned();
}

class RegistrationRepository {
  RegistrationRepository({
    required FirebaseFirestore db,
    required AuthService auth,
    required LocalStore store,
    required SecureStore secure,
    required DeviceSnapshotSource device,
  })  : _db = db,
        _auth = auth,
        _store = store,
        _secure = secure,
        _device = device;

  final FirebaseFirestore _db;
  final AuthService _auth;
  final LocalStore _store;
  final SecureStore _secure;
  final DeviceSnapshotSource _device;

  Future<RegistrationOutcome> register({
    required String name,
    required String phoneE164,
    required ConsentRecord consent,
  }) async {
    try {
      final uid = await _auth.ensureSignedIn();
      final ref = LocationDoc.ref(_db, phoneE164);
      final device = await _device.details();
      // Ask the server, not the cache: a stale "doesn't exist" would turn into a confusing denial.
      final snap = await ref.get(const GetOptions(source: Source.server));

      if (snap.exists) {
        final data = snap.data()!;
        if (data['ownerUid'] != uid) throw const NumberTakenFailure();
        await ref.update({'name': name, 'platform': device.platform, 'model': device.model, ...LocationDoc.stamps()});
        await _store.saveRegistration(
          LocalRegistration(
            phoneE164: phoneE164,
            name: name,
            deviceCode: data['deviceCode'] as String,
            claimHash: data['claimHash'] as String,
          ),
        );
        return const AlreadyOwned();
      }

      final code = ClaimChain.generateCode();
      final head = ClaimChain.link(code, ClaimChain.length);
      final deviceCode = DeviceCode.generate();
      // Persist the secret before the record exists, so a crash can't leave an unclaimable record.
      await _secure.writeClaimSeed(code);
      await ref.set(
        LocationDoc.create(
          name: name,
          deviceCode: deviceCode,
          ownerUid: uid,
          claimHash: head,
          platform: device.platform,
          model: device.model,
          consent: consent,
          sharingEnabled: true,
        ),
      );
      await _store.setRecoveryCodeAcknowledged(false);
      await _store.saveRegistration(
        LocalRegistration(phoneE164: phoneE164, name: name, deviceCode: deviceCode, claimHash: head),
      );
      Log.info('registration.created');
      return const Registered();
    } catch (e) {
      final failure = mapError(e);
      // Someone registered the number between our read and write: the set became an update.
      if (failure is OwnershipLostFailure) throw const NumberTakenFailure();
      throw failure;
    }
  }

  /// Takes the number over on this phone by revealing the previous link of the owner's chain.
  Future<void> reclaim({
    required String name,
    required String phoneE164,
    required String recoveryCodeInput,
    required ConsentRecord consent,
  }) async {
    final code = ClaimChain.canonicalise(recoveryCodeInput);
    if (code == null) throw const InvalidRecoveryCodeFailure();
    try {
      final uid = await _auth.ensureSignedIn();
      final ref = LocationDoc.ref(_db, phoneE164);
      final snap = await ref.get(const GetOptions(source: Source.server));
      if (!snap.exists) throw const RecordMissingFailure();
      final data = snap.data()!;

      final k = ClaimChain.indexOf(code, data['claimHash'] as String);
      if (k == null) throw const InvalidRecoveryCodeFailure();
      if (k <= 1) throw const ChainExhaustedFailure();
      final revealed = ClaimChain.link(code, k - 1);

      final device = await _device.details();
      await ref.update({
        'ownerUid': uid,
        'claimHash': revealed,
        'consent': consent.toFirestore(),
        'name': name,
        'platform': device.platform,
        'model': device.model,
        'sharingEnabled': true,
        ...LocationDoc.stamps(),
      });

      await _secure.writeClaimSeed(code);
      await _store.saveRegistration(
        LocalRegistration(
          phoneE164: phoneE164,
          name: name,
          deviceCode: data['deviceCode'] as String,
          claimHash: revealed,
        ),
      );
      // They already hold the code, so there's nothing new to show.
      await _store.setRecoveryCodeAcknowledged(true);
      await _store.setSharingPaused(false);
      Log.info('registration.reclaimed', {'remaining_links': k - 1});
    } catch (e) {
      final failure = mapError(e);
      // A wrong link is rejected by the rules as permission-denied.
      if (failure is OwnershipLostFailure) throw const InvalidRecoveryCodeFailure();
      throw failure;
    }
  }

  Future<String?> recoveryCode() async {
    final seed = await _secure.readClaimSeed();
    return seed == null ? null : ClaimChain.display(seed);
  }
}
