import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

/// Diagnostics that cannot leak personal data.
///
/// Callers pass an event name plus optional details. Only numbers, booleans, enums, durations
/// and short lowercase codes (`permission-denied`, `play_integrity`) are printed; any other
/// string is redacted, so a name or phone number passed by mistake never reaches the log.
/// Errors are reduced to their runtime type and Firebase error code, because Firestore error
/// messages contain document paths and therefore phone numbers. Nothing prints in release.
abstract final class Log {
  static void info(String event, [Map<String, Object?> details = const {}]) =>
      _emit('I', event, _describe(details));

  static void warn(String event, [Map<String, Object?> details = const {}]) =>
      _emit('W', event, _describe(details));

  static void error(String event, Object error, [StackTrace? stack]) {
    final code = error is FirebaseException ? _sanitise(error.code) : null;
    // runtimeType is a class name from code, never user input.
    _emit('E', event, 'type=${error.runtimeType}${code == null ? '' : ' code=$code'}');
    if (stack != null && kDebugMode) debugPrintStack(stackTrace: stack, maxFrames: 8);
  }

  static final _safeCode = RegExp(r'^[a-z0-9_.\-]{1,40}$');

  static String _describe(Map<String, Object?> details) => details.entries
      .where((e) => e.value != null)
      .map((e) => '${e.key}=${_sanitise(e.value!)}')
      .join(' ');

  static String _sanitise(Object value) => switch (value) {
        num() || bool() => '$value',
        Enum() => value.name,
        Duration() => '${value.inMilliseconds}ms',
        String() when _safeCode.hasMatch(value) => value,
        _ => '<redacted>',
      };

  static void _emit(String level, String event, String details) {
    if (kReleaseMode) return;
    debugPrint('[FindPhone] $level $event${details.isEmpty ? '' : ' $details'}');
  }
}
