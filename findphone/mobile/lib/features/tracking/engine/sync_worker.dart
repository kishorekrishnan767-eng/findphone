import 'dart:async';

import '../../../core/errors/app_failure.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/logging/logger.dart';
import '../domain/location_fix.dart';
import '../domain/sync_policy.dart';
import '../domain/tracking_config.dart';
import 'backoff.dart';

typedef FixWriter = Future<void> Function(LocationFix fix, int? battery);

sealed class SyncEvent {
  const SyncEvent();
}

final class Synced extends SyncEvent {
  const Synced(this.at);
  final DateTime at;
}

/// A write has been pending longer than expected (usually offline). The Firestore SDK keeps it
/// queued; we keep waiting for it rather than issuing more writes.
final class WaitingForNetwork extends SyncEvent {
  const WaitingForNetwork();
}

final class Retrying extends SyncEvent {
  const Retrying(this.failure, this.after);
  final AppFailure failure;
  final Duration after;
}

/// Not retried: needs the user (e.g. the number was reclaimed elsewhere).
final class Halted extends SyncEvent {
  const Halted(this.failure);
  final AppFailure failure;
}

/// Single-flight, latest-wins writer (architecture §3.3).
///
/// - Holds at most one pending reading; newer readings replace it.
/// - At most one write is in flight; the next starts only after it settles.
/// - Failures retry with exponential backoff; `permission-denied` halts.
class SyncWorker {
  SyncWorker({
    required this.write,
    required this.policy,
    required this.onEvent,
    this.onRecordMissing,
    DateTime Function()? clock,
    Backoff? backoff,
    this.offlineAfter = const Duration(seconds: 10),
  })  : _now = clock ?? DateTime.now,
        _backoff = backoff ?? Backoff();

  final FixWriter write;
  final SyncPolicy policy;
  final void Function(SyncEvent event) onEvent;

  /// Recreates the record (TTL removed it while paused). The pending write is then retried.
  final Future<void> Function()? onRecordMissing;
  final Duration offlineAfter;

  final DateTime Function() _now;
  final Backoff _backoff;

  TrackingMode mode = TrackingMode.foreground;

  WrittenFix? _last;
  _Candidate? _pending;
  Future<void>? _inFlight;
  Timer? _retry;
  bool _halted = false;

  WrittenFix? get lastWritten => _last;
  bool get isHalted => _halted;

  /// Makes the next reading count as the first of a session, so it's written immediately.
  /// Needed after a pause, which removed the coordinates from the record.
  void startSession() {
    _last = null;
    _halted = false;
    _backoff.reset();
  }

  /// Offers a reading; it's written only if the policy says it's meaningful.
  void offer(LocationFix fix, int? battery) {
    if (_halted) return;
    final reason = policy.evaluate(last: _last, fix: fix, battery: battery, now: _now(), mode: mode);
    if (reason == null) return;
    _pending = _Candidate(fix, battery);
    _pump();
  }

  void _pump() {
    if (_halted || _inFlight != null || _retry != null) return;
    final next = _pending;
    if (next == null) return;
    _pending = null;
    _inFlight = _attempt(next).whenComplete(() {
      _inFlight = null;
      _pump();
    });
  }

  Future<void> _attempt(_Candidate c) async {
    final slow = Timer(offlineAfter, () => onEvent(const WaitingForNetwork()));
    try {
      await write(c.fix, c.battery);
      final at = _now();
      _last = WrittenFix(fix: c.fix, battery: c.battery, writtenAt: at);
      _backoff.reset();
      onEvent(Synced(at));
    } catch (e) {
      final failure = mapError(e);
      Log.warn('sync.write_failed', {'code': failure.code, 'attempt': _backoff.attempt});
      switch (failure) {
        case OwnershipLostFailure():
          _halted = true;
          _pending = null;
          onEvent(Halted(failure));
        case RecordMissingFailure() when onRecordMissing != null:
          _pending ??= c;
          try {
            await onRecordMissing!();
            _schedule(Duration.zero, failure);
          } catch (inner) {
            _schedule(_backoff.next(), mapError(inner));
          }
        case QuotaExceededFailure():
          _pending ??= c;
          _schedule(_backoff.max, failure);
        default:
          _pending ??= c;
          _schedule(_backoff.next(), failure);
      }
    } finally {
      slow.cancel();
    }
  }

  void _schedule(Duration after, AppFailure failure) {
    _retry?.cancel();
    if (after > Duration.zero) onEvent(Retrying(failure, after));
    _retry = Timer(after, () {
      _retry = null;
      _pump();
    });
  }

  /// Stops retries, drops the pending reading and waits briefly for an in-flight write, so a
  /// following pause/stop write is queued after it (the SDK preserves write order).
  Future<void> drain({Duration timeout = const Duration(seconds: 5)}) async {
    _retry?.cancel();
    _retry = null;
    _pending = null;
    final inFlight = _inFlight;
    if (inFlight != null) {
      await inFlight.timeout(timeout, onTimeout: () {});
    }
  }

  void dispose() {
    _retry?.cancel();
    _retry = null;
    _pending = null;
    _halted = true;
  }
}

class _Candidate {
  const _Candidate(this.fix, this.battery);
  final LocationFix fix;
  final int? battery;
}
