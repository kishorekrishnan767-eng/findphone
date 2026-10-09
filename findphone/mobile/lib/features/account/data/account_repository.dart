import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/auth_service.dart';
import '../../../core/firestore/location_doc.dart';
import '../../../core/logging/logger.dart';
import '../../../core/storage/local_store.dart';
import '../../../core/storage/secure_store.dart';

/// "Stop sharing and delete my data": the public record, the recovery secret, local state and
/// the anonymous account. The caller stops tracking first.
class AccountRepository {
  AccountRepository({
    required FirebaseFirestore db,
    required AuthService auth,
    required LocalStore store,
    required SecureStore secure,
  })  : _db = db,
        _auth = auth,
        _store = store,
        _secure = secure;

  final FirebaseFirestore _db;
  final AuthService _auth;
  final LocalStore _store;
  final SecureStore _secure;

  Future<void> deleteEverything() async {
    final reg = _store.registration;
    if (reg != null) {
      try {
        // Must reach the server: telling the user "deleted" while it's only queued would be false.
        await LocationDoc.ref(_db, reg.phoneE164).delete().timeout(const Duration(seconds: 15));
      } on TimeoutException {
        throw const OfflineFailure();
      } on FirebaseException catch (e) {
        // Already reclaimed by another phone: nothing of ours left to delete remotely.
        if (e.code != 'permission-denied' && e.code != 'not-found') rethrow;
      }
    }
    await _secure.clear();
    await _store.clearAll();
    await _auth.deleteAccount();
    Log.info('account.deleted');
  }
}
