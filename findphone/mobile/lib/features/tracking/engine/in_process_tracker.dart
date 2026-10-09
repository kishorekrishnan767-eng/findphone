import 'dart:async';

import '../../../core/storage/local_store.dart';
import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';
import 'tracker.dart';
import 'tracking_engine.dart';
import 'tracking_runtime.dart';

/// iOS: the engine runs in the UI isolate. With background location updates enabled, iOS keeps
/// the app running while it's tracking; it's suspended once swiped away (known limitation 5).
class InProcessTracker implements Tracker {
  InProcessTracker(this._store);

  final LocalStore _store;
  final _snapshots = StreamController<TrackingSnapshot>.broadcast();
  TrackingEngine? _engine;

  @override
  Stream<TrackingSnapshot> get snapshots => _snapshots.stream;

  @override
  Future<void> configure({required bool restartOnBoot}) async {}

  @override
  Future<bool> isRunning() async => _engine != null;

  @override
  Future<void> start({required TrackingMode mode}) async {
    _engine ??= buildTrackingEngine(store: _store, onSnapshot: _snapshots.add);
    await _engine!.start(mode);
  }

  @override
  Future<void> setMode(TrackingMode mode) async => _engine?.setMode(mode);

  @override
  Future<void> pause() async {
    final engine = _engine ?? buildTrackingEngine(store: _store, onSnapshot: _snapshots.add);
    await engine.pause();
    engine.dispose();
    _engine = null;
  }

  @override
  Future<void> stop() async {
    await _engine?.stop();
    _engine?.dispose();
    _engine = null;
  }
}
