import 'dart:async';
import 'dart:ui';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/firebase/firebase_init.dart';
import '../../../core/logging/logger.dart';
import '../../../core/storage/local_store.dart';
import '../domain/tracking_config.dart';
import 'service_protocol.dart';
import 'tracking_runtime.dart';

/// Entry point of the Android foreground-service isolate. Runs with its own Dart heap, so it
/// initialises Firebase and reads local state itself. It's the only writer of tracking data on
/// Android, and talks to the UI through the messages in [ServiceProtocol].
@pragma('vm:entry-point')
Future<void> backgroundMain(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await initFirebase();
  } catch (e, st) {
    Log.error('service.firebase_init', e, st);
    await service.stopSelf();
    return;
  }

  final prefs = await SharedPreferences.getInstance();
  await prefs.reload();
  final store = LocalStore(prefs);

  // Started at boot or by the watchdog when it shouldn't run: exit quietly.
  final user = FirebaseAuth.instance.currentUser ??
      await FirebaseAuth.instance.authStateChanges().first.timeout(
            const Duration(seconds: 10),
            onTimeout: () => null,
          );
  if (store.registration == null || store.sharingPaused || user == null) {
    Log.info('service.exit_not_needed');
    await service.stopSelf();
    return;
  }

  final engine = buildTrackingEngine(
    store: store,
    onSnapshot: (s) => service.invoke(ServiceProtocol.snapshot, s.toMap()),
  );

  service.on(ServiceProtocol.setMode).listen((args) {
    final foreground = args?['foreground'] == true;
    unawaited(engine.setMode(foreground ? TrackingMode.foreground : TrackingMode.background));
  });

  service.on(ServiceProtocol.ping).listen((_) {
    service.invoke(ServiceProtocol.snapshot, engine.snapshot.toMap());
  });

  service.on(ServiceProtocol.pause).listen((_) async {
    await engine.pause();
    service.invoke(ServiceProtocol.paused);
    engine.dispose();
    await service.stopSelf();
  });

  service.on(ServiceProtocol.stop).listen((_) async {
    await engine.stop();
    service.invoke(ServiceProtocol.stopped);
    engine.dispose();
    await service.stopSelf();
  });

  service.invoke(ServiceProtocol.ready);
  // Background until the UI says otherwise (the UI sends setMode right after `ready`).
  await engine.start(TrackingMode.background);
}
