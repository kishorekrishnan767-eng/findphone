import 'dart:async';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';

import 'app_failure.dart';

/// Maps any thrown object to an [AppFailure]. Callers that know more context (e.g. registration,
/// where `permission-denied` means "number taken") translate the result further.
AppFailure mapError(Object error) {
  if (error is AppFailure) return error;
  if (error is SocketException || error is TimeoutException) return const OfflineFailure();

  if (error is FirebaseAuthException) {
    return switch (error.code) {
      'network-request-failed' => const OfflineFailure(),
      'too-many-requests' => const QuotaExceededFailure(),
      _ => UnknownFailure('auth-${error.code}'),
    };
  }

  if (error is FirebaseException) {
    final appCheck = error.plugin == 'firebase_app_check';
    if (appCheck) return const AppCheckFailure();
    return switch (error.code) {
      'unavailable' || 'deadline-exceeded' || 'aborted' => const OfflineFailure(),
      'resource-exhausted' => const QuotaExceededFailure(),
      'not-found' => const RecordMissingFailure(),
      'permission-denied' => const OwnershipLostFailure(),
      'unauthenticated' => const AppCheckFailure(),
      _ => UnknownFailure(error.code),
    };
  }

  return UnknownFailure(error.runtimeType.toString().toLowerCase());
}
