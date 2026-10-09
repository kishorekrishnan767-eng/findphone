import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/logging/logger.dart';
import '../../permissions/application/permission_controller.dart';
import '../domain/tracking_config.dart';
import '../domain/tracking_snapshot.dart';

class TrackingUiState {
  const TrackingUiState({required this.snapshot, this.busy = false});

  final TrackingSnapshot snapshot;

  /// A pause/resume is in progress.
  final bool busy;

  TrackingUiState copyWith({TrackingSnapshot? snapshot, bool? busy}) =>
      TrackingUiState(snapshot: snapshot ?? this.snapshot, busy: busy ?? this.busy);
}

/// UI-side owner of sharing: starts the tracker when everything is in place, forwards
/// foreground/background changes, and handles pause and resume.
class TrackingController extends Notifier<TrackingUiState> {
  StreamSubscription<TrackingSnapshot>? _sub;
  AppLifecycleListener? _lifecycle;

  @override
  TrackingUiState build() {
    final tracker = ref.watch(trackerProvider);
    final store = ref.watch(localStoreProvider);

    _sub = tracker.snapshots.listen((s) {
      state = state.copyWith(snapshot: s);
    });
    _lifecycle = AppLifecycleListener(
      onStateChange: (s) {
        if (s == AppLifecycleState.resumed) unawaited(_setMode(TrackingMode.foreground));
        if (s == AppLifecycleState.paused || s == AppLifecycleState.hidden) {
          unawaited(_setMode(TrackingMode.background));
        }
      },
    );
    ref.onDispose(() {
      _sub?.cancel();
      _lifecycle?.dispose();
    });

    Future.microtask(ensureRunning);

    return TrackingUiState(
      snapshot: TrackingSnapshot(
        phase: store.sharingPaused ? TrackingPhase.paused : TrackingPhase.stopped,
        lastSyncAt: store.lastSyncAt,
      ),
    );
  }

  /// Starts sharing if the phone is registered, set up and not paused. Safe to call often.
  Future<void> ensureRunning() async {
    final store = ref.read(localStoreProvider);
    if (store.registration == null || !store.permissionsDone || store.sharingPaused) return;

    final health = await ref.read(permissionServiceProvider).check();
    final tracker = ref.read(trackerProvider);
    if (!health.canTrack) {
      final AppFailure failure =
          health.servicesEnabled ? const LocationPermissionFailure() : const LocationServicesOffFailure();
      state = state.copyWith(snapshot: state.snapshot.copyWith(phase: TrackingPhase.failed, failure: failure));
      return;
    }
    try {
      await tracker.configure(restartOnBoot: health.hasAlways);
      await tracker.start(mode: _currentMode());
    } catch (e, st) {
      Log.error('tracking.start_failed', e, st);
      state = state.copyWith(snapshot: state.snapshot.copyWith(phase: TrackingPhase.failed, failure: mapError(e)));
    }
  }

  Future<void> pause() async {
    state = state.copyWith(busy: true);
    try {
      await ref.read(trackerProvider).pause();
      await ref.read(localStoreProvider).setSharingPaused(true);
      state = TrackingUiState(snapshot: state.snapshot.copyWith(phase: TrackingPhase.paused, clearFailure: true));
    } catch (e) {
      state = state.copyWith(busy: false, snapshot: state.snapshot.copyWith(failure: mapError(e)));
      rethrow;
    }
  }

  Future<void> resume() async {
    state = state.copyWith(busy: true);
    await ref.read(localStoreProvider).setSharingPaused(false);
    state = TrackingUiState(snapshot: state.snapshot.copyWith(phase: TrackingPhase.starting, clearFailure: true));
    await ensureRunning();
  }

  /// Before deleting the record: stop without writing anything.
  Future<void> stopForDeletion() => ref.read(trackerProvider).stop();

  Future<void> _setMode(TrackingMode mode) async {
    final tracker = ref.read(trackerProvider);
    if (await tracker.isRunning()) await tracker.setMode(mode);
  }

  TrackingMode _currentMode() =>
      WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed || WidgetsBinding.instance.lifecycleState == null
          ? TrackingMode.foreground
          : TrackingMode.background;
}

final trackingControllerProvider =
    NotifierProvider<TrackingController, TrackingUiState>(TrackingController.new);
