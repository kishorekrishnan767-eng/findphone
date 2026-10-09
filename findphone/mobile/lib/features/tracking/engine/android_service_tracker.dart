import 'dart:async';

import 'package:flutter_background_service/flutter_background_service.dart';

import '../../../core/logging/logger.dart';
import '../data/location_repository.dart';
import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';
import 'background_entrypoint.dart';
import 'service_protocol.dart';
import 'tracker.dart';

/// UI-side handle on the Android foreground service that runs the tracking engine.
class AndroidServiceTracker implements Tracker {
  AndroidServiceTracker({required LocationRepository fallbackWriter, FlutterBackgroundService? service})
      : _service = service ?? FlutterBackgroundService(),
        _fallback = fallbackWriter;

  final FlutterBackgroundService _service;

  /// Used to write a pause when the service isn't running (or doesn't answer).
  final LocationRepository _fallback;

  @override
  Stream<TrackingSnapshot> get snapshots => _service
      .on(ServiceProtocol.snapshot)
      .where((m) => m != null)
      .map((m) => TrackingSnapshot.fromMap(m!));

  @override
  Stream<bool> get ringing =>
      _service.on(ServiceProtocol.ringing).map((m) => m?['active'] == true);

  @override
  Future<void> stopRing() async => _service.invoke(ServiceProtocol.stopRing);

  @override
  Future<void> configure({required bool restartOnBoot}) => _service.configure(
        androidConfiguration: AndroidConfiguration(
          onStart: backgroundMain,
          autoStart: false,
          autoStartOnBoot: restartOnBoot,
          isForegroundMode: true,
          notificationChannelId: ServiceProtocol.notificationChannelId,
          foregroundServiceNotificationId: ServiceProtocol.notificationId,
          initialNotificationTitle: 'Sharing location',
          initialNotificationContent: 'Anyone with your number can see this phone. Tap to open FindPhone.',
          foregroundServiceTypes: [AndroidForegroundType.location],
        ),
        iosConfiguration: IosConfiguration(autoStart: false),
      );

  @override
  Future<bool> isRunning() => _service.isRunning();

  @override
  Future<void> start({required TrackingMode mode}) async {
    if (!await _service.isRunning()) {
      final ready = _service.on(ServiceProtocol.ready).first.timeout(
            const Duration(seconds: 20),
            onTimeout: () => null,
          );
      await _service.startService();
      await ready;
    }
    await setMode(mode);
    _service.invoke(ServiceProtocol.ping);
  }

  @override
  Future<void> setMode(TrackingMode mode) async {
    _service.invoke(ServiceProtocol.setMode, {'foreground': mode == TrackingMode.foreground});
  }

  @override
  Future<void> pause() async {
    if (await _service.isRunning()) {
      final ack = _service.on(ServiceProtocol.paused).first.timeout(
            const Duration(seconds: 20),
            onTimeout: () => null,
          );
      _service.invoke(ServiceProtocol.pause);
      final answered = await ack;
      if (answered != null) return;
      Log.warn('tracker.pause_no_ack');
      _service.invoke(ServiceProtocol.stop);
    }
    // Offline, the SDK queues the write and delivers it on reconnect; don't block the UI on it.
    await _fallback.pause().timeout(const Duration(seconds: 10), onTimeout: () {});
  }

  @override
  Future<void> stop() async {
    if (!await _service.isRunning()) return;
    final ack = _service.on(ServiceProtocol.stopped).first.timeout(
          const Duration(seconds: 10),
          onTimeout: () => null,
        );
    _service.invoke(ServiceProtocol.stop);
    await ack;
  }
}
