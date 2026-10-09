import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/permission_service.dart';
import '../domain/permission_health.dart';

final permissionServiceProvider = Provider<PermissionService>((ref) => const PermissionService());

/// Current permission health, re-read whenever the app comes back to the foreground (the user
/// may have changed something in Settings).
class PermissionController extends AsyncNotifier<PermissionHealth> {
  AppLifecycleListener? _lifecycle;

  @override
  Future<PermissionHealth> build() {
    _lifecycle ??= AppLifecycleListener(onResume: refresh);
    ref.onDispose(() {
      _lifecycle?.dispose();
      _lifecycle = null;
    });
    return ref.read(permissionServiceProvider).check();
  }

  Future<void> refresh() async {
    final next = await AsyncValue.guard(() => ref.read(permissionServiceProvider).check());
    state = next;
  }

  Future<void> run(Future<Object?> Function(PermissionService s) action) async {
    await action(ref.read(permissionServiceProvider));
    await refresh();
  }
}

final permissionControllerProvider =
    AsyncNotifierProvider<PermissionController, PermissionHealth>(PermissionController.new);
