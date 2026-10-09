import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';

/// What the UI needs from the tracking runtime, regardless of where the engine actually runs
/// (Android foreground-service isolate, or the UI isolate on iOS).
abstract interface class Tracker {
  Stream<TrackingSnapshot> get snapshots;

  /// Starts (or keeps) sharing. Safe to call repeatedly.
  Future<void> start({required TrackingMode mode});

  Future<void> setMode(TrackingMode mode);

  /// Stops sharing and clears coordinates from the public record.
  Future<void> pause();

  /// Stops sharing without writing (before deleting the record).
  Future<void> stop();

  Future<bool> isRunning();

  /// Android only: whether the service may restart itself after a reboot. Enabled only while
  /// "Allow all the time" is granted, because Android 14+ refuses a location foreground service
  /// started at boot without it.
  Future<void> configure({required bool restartOnBoot});
}
