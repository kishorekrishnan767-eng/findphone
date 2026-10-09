import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/consent_record.dart';
import '../models/local_registration.dart';

/// Non-secret device state. Notifies listeners on every write so the router can re-evaluate
/// its onboarding guard.
///
/// The Android background service runs in a separate isolate with its own cached copy; it calls
/// [reload] before reading, and the UI calls [reload] when it receives a status event.
class LocalStore extends ChangeNotifier {
  LocalStore(this._prefs);

  final SharedPreferences _prefs;

  static const _onboardingSeen = 'onboarding_seen';
  static const _consentAcceptedAt = 'consent_accepted_at';
  static const _consentTermsVersion = 'consent_terms_version';
  static const _regPhone = 'reg_phone';
  static const _regName = 'reg_name';
  static const _regDeviceCode = 'reg_device_code';
  static const _regClaimHash = 'reg_claim_hash';
  static const _recoveryAcknowledged = 'recovery_code_acknowledged';
  static const _permissionsDone = 'permissions_done';
  static const _reliabilitySeen = 'reliability_seen';
  static const _sharingPaused = 'sharing_paused';
  static const _lastSyncAt = 'last_sync_at';

  Future<void> reload() => _prefs.reload();

  bool get onboardingSeen => _prefs.getBool(_onboardingSeen) ?? false;
  Future<void> setOnboardingSeen() => _setBool(_onboardingSeen, true);

  ConsentRecord? get consent {
    final at = _prefs.getInt(_consentAcceptedAt);
    final version = _prefs.getString(_consentTermsVersion);
    if (at == null || version == null) return null;
    return ConsentRecord(acceptedAt: DateTime.fromMillisecondsSinceEpoch(at), termsVersion: version);
  }

  Future<void> saveConsent(ConsentRecord consent) async {
    await _prefs.setInt(_consentAcceptedAt, consent.acceptedAt.millisecondsSinceEpoch);
    await _prefs.setString(_consentTermsVersion, consent.termsVersion);
    notifyListeners();
  }

  LocalRegistration? get registration {
    final phone = _prefs.getString(_regPhone);
    final name = _prefs.getString(_regName);
    final code = _prefs.getString(_regDeviceCode);
    final claim = _prefs.getString(_regClaimHash);
    if (phone == null || name == null || code == null || claim == null) return null;
    return LocalRegistration(phoneE164: phone, name: name, deviceCode: code, claimHash: claim);
  }

  Future<void> saveRegistration(LocalRegistration r) async {
    await _prefs.setString(_regPhone, r.phoneE164);
    await _prefs.setString(_regName, r.name);
    await _prefs.setString(_regDeviceCode, r.deviceCode);
    await _prefs.setString(_regClaimHash, r.claimHash);
    notifyListeners();
  }

  bool get recoveryCodeAcknowledged => _prefs.getBool(_recoveryAcknowledged) ?? false;
  Future<void> setRecoveryCodeAcknowledged(bool value) => _setBool(_recoveryAcknowledged, value);

  bool get permissionsDone => _prefs.getBool(_permissionsDone) ?? false;
  Future<void> setPermissionsDone() => _setBool(_permissionsDone, true);

  bool get reliabilitySeen => _prefs.getBool(_reliabilitySeen) ?? false;
  Future<void> setReliabilitySeen() => _setBool(_reliabilitySeen, true);

  bool get sharingPaused => _prefs.getBool(_sharingPaused) ?? false;
  Future<void> setSharingPaused(bool value) => _setBool(_sharingPaused, value);

  DateTime? get lastSyncAt {
    final ms = _prefs.getInt(_lastSyncAt);
    return ms == null ? null : DateTime.fromMillisecondsSinceEpoch(ms);
  }

  /// Written by whichever isolate performs the sync. Doesn't notify: the router doesn't care.
  Future<void> setLastSyncAt(DateTime at) => _prefs.setInt(_lastSyncAt, at.millisecondsSinceEpoch);

  /// Used by "Stop sharing and delete my data".
  Future<void> clearAll() async {
    await _prefs.clear();
    notifyListeners();
  }

  Future<void> _setBool(String key, bool value) async {
    await _prefs.setBool(key, value);
    notifyListeners();
  }
}
