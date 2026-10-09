import 'package:firebase_auth/firebase_auth.dart';

import '../logging/logger.dart';

/// Silent anonymous sign-in. The uid becomes `ownerUid`; there is no password or OTP.
class AuthService {
  AuthService(this._auth);

  final FirebaseAuth _auth;

  String? get uid => _auth.currentUser?.uid;

  Future<String> ensureSignedIn() async {
    final current = _auth.currentUser;
    if (current != null) return current.uid;
    final cred = await _auth.signInAnonymously();
    Log.info('auth.anonymous_sign_in');
    return cred.user!.uid;
  }

  /// Removes the anonymous account during "delete my data". A new one is created on next use.
  Future<void> deleteAccount() async {
    try {
      await _auth.currentUser?.delete();
    } catch (e) {
      Log.error('auth.delete_failed', e);
      await _auth.signOut();
    }
  }
}
