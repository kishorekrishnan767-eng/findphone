import '../../../core/errors/app_failure.dart';

enum TrackingPhase {
  /// Not running (never started, or stopped for deletion).
  stopped,

  /// Running, no confirmed write yet in this session.
  starting,

  /// Running and the last write succeeded.
  active,

  /// Running, but writes are waiting for the network or retrying.
  degraded,

  /// The owner paused sharing; coordinates were removed from the record.
  paused,

  /// Stopped because of an error that needs the user (ownership lost, permission revoked).
  failed,
}

/// Status published by the tracking engine. Serialisable because on Android it crosses from the
/// background-service isolate to the UI isolate. Contains no location or personal data.
class TrackingSnapshot {
  const TrackingSnapshot({required this.phase, this.lastSyncAt, this.failure});

  static const stopped = TrackingSnapshot(phase: TrackingPhase.stopped);

  final TrackingPhase phase;
  final DateTime? lastSyncAt;
  final AppFailure? failure;

  bool get isSharing =>
      phase == TrackingPhase.starting || phase == TrackingPhase.active || phase == TrackingPhase.degraded;

  TrackingSnapshot copyWith({TrackingPhase? phase, DateTime? lastSyncAt, AppFailure? failure, bool clearFailure = false}) =>
      TrackingSnapshot(
        phase: phase ?? this.phase,
        lastSyncAt: lastSyncAt ?? this.lastSyncAt,
        failure: clearFailure ? null : (failure ?? this.failure),
      );

  Map<String, dynamic> toMap() => {
        'phase': phase.name,
        'lastSyncAt': lastSyncAt?.millisecondsSinceEpoch,
        'failure': failure?.code,
      };

  factory TrackingSnapshot.fromMap(Map<String, dynamic> map) {
    final phase = TrackingPhase.values.asNameMap()[map['phase']] ?? TrackingPhase.stopped;
    final at = map['lastSyncAt'];
    final failure = map['failure'];
    return TrackingSnapshot(
      phase: phase,
      lastSyncAt: at is int ? DateTime.fromMillisecondsSinceEpoch(at) : null,
      failure: failure is String ? AppFailure.fromCode(failure) : null,
    );
  }
}
