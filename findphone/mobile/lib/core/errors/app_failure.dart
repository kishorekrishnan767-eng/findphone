/// Every error the UI can show. Screens switch on these types and never on raw exceptions;
/// `message` is the user-facing copy from docs/design-system.md §9.
sealed class AppFailure implements Exception {
  const AppFailure();

  String get message;

  /// Whether retrying the same action later can succeed.
  bool get isTransient => false;

  /// Short, PII-free code for logs and for passing between isolates.
  String get code;

  static AppFailure fromCode(String code) => switch (code) {
        'offline' => const OfflineFailure(),
        'number-taken' => const NumberTakenFailure(),
        'ownership-lost' => const OwnershipLostFailure(),
        'quota' => const QuotaExceededFailure(),
        'app-check' => const AppCheckFailure(),
        'record-missing' => const RecordMissingFailure(),
        'invalid-recovery-code' => const InvalidRecoveryCodeFailure(),
        'chain-exhausted' => const ChainExhaustedFailure(),
        'location-services-off' => const LocationServicesOffFailure(),
        'location-permission' => const LocationPermissionFailure(),
        'not-configured' => const NotConfiguredFailure(),
        _ => UnknownFailure(code),
      };
}

final class OfflineFailure extends AppFailure {
  const OfflineFailure();
  @override
  String get message => "You're offline. Your latest location will be sent when you reconnect.";
  @override
  bool get isTransient => true;
  @override
  String get code => 'offline';
}

final class NumberTakenFailure extends AppFailure {
  const NumberTakenFailure();
  @override
  String get message => 'This number is already registered on another phone.';
  @override
  String get code => 'number-taken';
}

final class OwnershipLostFailure extends AppFailure {
  const OwnershipLostFailure();
  @override
  String get message => 'This number was reclaimed on another phone. Sharing has stopped here.';
  @override
  String get code => 'ownership-lost';
}

final class QuotaExceededFailure extends AppFailure {
  const QuotaExceededFailure();
  @override
  String get message =>
      'Daily sync limit reached for this demo project. Sharing resumes automatically after midnight Pacific time.';
  @override
  bool get isTransient => true;
  @override
  String get code => 'quota';
}

final class AppCheckFailure extends AppFailure {
  const AppCheckFailure();
  @override
  String get message =>
      "This copy of FindPhone couldn't be verified. Install the latest build from your test organiser.";
  @override
  bool get isTransient => true;
  @override
  String get code => 'app-check';
}

final class RecordMissingFailure extends AppFailure {
  const RecordMissingFailure();
  @override
  String get message => "This number isn't registered any more. Register it again to continue.";
  @override
  String get code => 'record-missing';
}

final class InvalidRecoveryCodeFailure extends AppFailure {
  const InvalidRecoveryCodeFailure();
  @override
  String get message => "That code doesn't match this number. Check for typos and try again.";
  @override
  String get code => 'invalid-recovery-code';
}

final class ChainExhaustedFailure extends AppFailure {
  const ChainExhaustedFailure();
  @override
  String get message =>
      'This recovery code has been used too many times. Delete the record from the other phone and register again.';
  @override
  String get code => 'chain-exhausted';
}

final class LocationServicesOffFailure extends AppFailure {
  const LocationServicesOffFailure();
  @override
  String get message => 'Location is turned off on this phone. Turn it on, then come back.';
  @override
  bool get isTransient => true;
  @override
  String get code => 'location-services-off';
}

final class LocationPermissionFailure extends AppFailure {
  const LocationPermissionFailure();
  @override
  String get message => "Location access is off. Sharing can't run without it.";
  @override
  String get code => 'location-permission';
}

final class NotConfiguredFailure extends AppFailure {
  const NotConfiguredFailure();
  @override
  String get message =>
      'FindPhone is not configured. Copy mobile/.env.example to .env, fill in the Firebase values, '
      'and run with --dart-define-from-file=.env.';
  @override
  String get code => 'not-configured';
}

final class UnknownFailure extends AppFailure {
  const UnknownFailure([this.detail = 'unknown']);
  final String detail;
  @override
  String get message => 'Something went wrong. Try again in a moment.';
  @override
  bool get isTransient => true;
  @override
  String get code => detail;
}
