import 'dart:async';

import 'package:geolocator/geolocator.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/logging/logger.dart';
import '../data/device_snapshot_source.dart';
import '../data/location_repository.dart';
import '../data/location_source.dart';
import '../domain/location_fix.dart';
import '../domain/sync_policy.dart';
import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';
import 'sync_worker.dart';

/// Streams positions, refreshes them on each heartbeat, and feeds the [SyncWorker]. It's the only
/// writer of tracking data: on Android it runs inside the foreground-service isolate, on iOS in
/// the UI isolate. Pause and stop go through here so no late write can resurrect coordinates.
class TrackingEngine {
  TrackingEngine({
    required this.config,
    required LocationSource locations,
    required LocationRepository repository,
    required DeviceSnapshotSource device,
    required void Function(TrackingSnapshot) onSnapshot,
  })  : _locations = locations,
        _repository = repository,
        _device = device,
        _onSnapshot = onSnapshot {
    _worker = SyncWorker(
      write: _repository.writeFix,
      policy: SyncPolicy(config),
      onEvent: _onSyncEvent,
      onRecordMissing: _repository.recreate,
    );
  }

  final TrackingConfig config;
  final LocationSource _locations;
  final LocationRepository _repository;
  final DeviceSnapshotSource _device;
  final void Function(TrackingSnapshot) _onSnapshot;
  late final SyncWorker _worker;

  TrackingMode _mode = TrackingMode.background;
  StreamSubscription<LocationFix>? _sub;
  Timer? _heartbeat;
  Timer? _restart;
  LocationFix? _lastFix;
  bool _running = false;
  TrackingSnapshot _snapshot = TrackingSnapshot.stopped;

  TrackingSnapshot get snapshot => _snapshot;

  Future<void> start(TrackingMode mode) async {
    if (_running) return setMode(mode);
    _running = true;
    _mode = mode;
    _worker
      ..mode = mode
      ..startSession();
    _emit(_snapshot.copyWith(phase: TrackingPhase.starting, clearFailure: true));
    Log.info('engine.start', {'mode': mode});

    try {
      await _repository.markSharing();
    } catch (e) {
      final failure = mapError(e);
      if (failure is RecordMissingFailure) {
        await _guard(_repository.recreate);
      } else if (failure is OwnershipLostFailure) {
        return _fail(failure);
      }
      // Offline etc.: carry on; the first fix will retry through the worker.
    }

    _listen();
    _armHeartbeat();
  }

  Future<void> setMode(TrackingMode mode) async {
    if (!_running || mode == _mode) return;
    _mode = mode;
    _worker.mode = mode;
    Log.info('engine.mode', {'mode': mode});
    _listen();
    _armHeartbeat();
  }

  /// Stops tracking and removes coordinates from the public record.
  Future<void> pause() async {
    await _halt();
    try {
      await _repository.pause().timeout(const Duration(seconds: 10));
    } on TimeoutException {
      // Queued by the Firestore SDK; it is delivered on reconnect, after any earlier write.
    } catch (e) {
      Log.error('engine.pause_failed', e);
    }
    _emit(_snapshot.copyWith(phase: TrackingPhase.paused, clearFailure: true));
  }

  /// Stops tracking without writing (used before deleting the record).
  Future<void> stop() async {
    await _halt();
    _emit(_snapshot.copyWith(phase: TrackingPhase.stopped, clearFailure: true));
  }

  Future<void> _halt() async {
    _running = false;
    _heartbeat?.cancel();
    _restart?.cancel();
    await _sub?.cancel();
    _sub = null;
    await _worker.drain();
  }

  void _listen() {
    _sub?.cancel();
    _sub = _locations.watch(_mode).listen(_onFix, onError: _onLocationError);
  }

  void _armHeartbeat() {
    _heartbeat?.cancel();
    // Tick at the sampling interval; the policy decides whether a write is due.
    _heartbeat = Timer.periodic(config.sampleInterval(_mode), (_) => _onHeartbeat());
  }

  Future<void> _onFix(LocationFix fix) async {
    _lastFix = fix;
    _worker.offer(fix, await _device.batteryLevel());
  }

  Future<void> _onHeartbeat() async {
    if (!_running) return;
    var fix = _lastFix;
    // If the stream has been quiet (still phone, OS batching), take a fresh reading so the
    // heartbeat reports a current position rather than an old one.
    final staleAfter = config.heartbeat(_mode) - const Duration(seconds: 5);
    if (fix == null || DateTime.now().difference(fix.timestamp) > staleAfter) {
      try {
        fix = await _locations.current();
        _lastFix = fix;
      } catch (_) {
        // Keep the last fix; the stream's error handler reports persistent problems.
      }
    }
    if (fix != null) _worker.offer(fix, await _device.batteryLevel());
  }

  void _onLocationError(Object error) {
    final failure = switch (error) {
      LocationServiceDisabledException() => const LocationServicesOffFailure(),
      PermissionDeniedException() => const LocationPermissionFailure(),
      _ => mapError(error),
    };
    Log.warn('engine.location_error', {'code': failure.code});
    if (failure is LocationPermissionFailure) {
      unawaited(_halt().then((_) => _fail(failure)));
      return;
    }
    // Location switched off or a transient error: report it and try again shortly.
    _emit(_snapshot.copyWith(phase: TrackingPhase.degraded, failure: failure));
    _sub?.cancel();
    _restart?.cancel();
    _restart = Timer(const Duration(seconds: 30), () {
      if (_running) _listen();
    });
  }

  void _onSyncEvent(SyncEvent event) {
    switch (event) {
      case Synced(:final at):
        _emit(TrackingSnapshot(phase: TrackingPhase.active, lastSyncAt: at));
      case WaitingForNetwork():
        _emit(_snapshot.copyWith(phase: TrackingPhase.degraded, failure: const OfflineFailure()));
      case Retrying(:final failure):
        _emit(_snapshot.copyWith(phase: TrackingPhase.degraded, failure: failure));
      case Halted(:final failure):
        unawaited(_halt().then((_) => _fail(failure)));
    }
  }

  void _fail(AppFailure failure) {
    _running = false;
    _emit(_snapshot.copyWith(phase: TrackingPhase.failed, failure: failure));
  }

  Future<void> _guard(Future<void> Function() action) async {
    try {
      await action();
    } catch (e) {
      Log.error('engine.guard', e);
    }
  }

  void _emit(TrackingSnapshot s) {
    _snapshot = s;
    _onSnapshot(s);
  }

  void dispose() {
    _worker.dispose();
    _heartbeat?.cancel();
    _restart?.cancel();
    _sub?.cancel();
  }
}
