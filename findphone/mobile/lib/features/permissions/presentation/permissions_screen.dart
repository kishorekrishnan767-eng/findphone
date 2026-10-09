import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/di/providers.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/router/routes.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/components/fp_skeleton.dart';
import '../../../design_system/theme/app_theme.dart';
import '../../reliability/data/oem_guidance.dart';
import '../../tracking/application/tracking_controller.dart';
import '../application/permission_controller.dart';
import '../domain/permission_health.dart';

enum _Step { servicesOff, locationRationale, locationBlocked, approximate, notifications, always, done }

/// One step at a time: contextual rationale first, then the system prompt. Re-evaluated whenever
/// the app resumes, so returning from Settings moves the user on automatically.
class PermissionsScreen extends ConsumerStatefulWidget {
  const PermissionsScreen({super.key});

  @override
  ConsumerState<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends ConsumerState<PermissionsScreen> {
  final _skipped = <_Step>{};
  bool _finishing = false;

  bool get _android => defaultTargetPlatform == TargetPlatform.android;

  _Step _stepFor(PermissionHealth h) {
    if (!h.servicesEnabled) return _Step.servicesOff;
    if (h.location == LocationAccess.deniedForever) return _Step.locationBlocked;
    if (!h.canTrack) return _Step.locationRationale;
    if (!h.precise && !_skipped.contains(_Step.approximate)) return _Step.approximate;
    if (_android && !h.notifications && !_skipped.contains(_Step.notifications)) return _Step.notifications;
    if (!h.hasAlways && !_skipped.contains(_Step.always)) return _Step.always;
    return _Step.done;
  }

  Future<void> _finish(PermissionHealth h) async {
    if (_finishing) return;
    _finishing = true;
    final store = ref.read(localStoreProvider);
    await store.setPermissionsDone();
    await ref.read(trackingControllerProvider.notifier).ensureRunning();
    if (!mounted) return;
    final details = await ref.read(deviceDetailsProvider.future);
    if (!mounted) return;
    final needsGuide = _android &&
        !store.reliabilitySeen &&
        (!h.batteryUnrestricted || OemGuidance.forManufacturer(details.manufacturer) != null);
    context.go(needsGuide ? Routes.reliability : Routes.home);
  }

  @override
  Widget build(BuildContext context) {
    final health = ref.watch(permissionControllerProvider);
    final controller = ref.read(permissionControllerProvider.notifier);

    return health.when(
      loading: () => const FpScaffold(children: [FpSkeleton(height: 32), SizedBox(height: FpSpace.s4), FpSkeleton(height: 64)]),
      error: (_, _) => FpScaffold(
        bottom: FpButton(label: 'Try again', onPressed: controller.refresh, expand: true),
        children: const [FpHeading(title: "Couldn't read permissions", body: 'Try again in a moment.')],
      ),
      data: (h) {
        final step = _stepFor(h);
        if (step == _Step.done) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _finish(h));
          return const FpScaffold(children: [FpSkeleton(height: 32)]);
        }
        return _buildStep(step, controller);
      },
    );
  }

  Widget _buildStep(_Step step, PermissionController controller) {
    switch (step) {
      case _Step.servicesOff:
        return _StepView(
          icon: LucideIcons.mapPinOff,
          title: 'Location is turned off on this phone',
          body: 'Turn on Location in quick settings or Settings, then come back. FindPhone continues automatically.',
          primary: FpButton(
            label: 'Open location settings',
            icon: LucideIcons.settings,
            onPressed: () => controller.run((s) => s.openLocationSettings()),
            expand: true,
          ),
        );
      case _Step.locationRationale:
        return _StepView(
          icon: LucideIcons.locateFixed,
          title: 'Allow location access',
          body: "FindPhone needs your location to show it on the map. It's only read while sharing is on, "
              'and only the latest position is kept.',
          primary: FpButton(
            label: 'Allow location',
            onPressed: () => controller.run((s) => s.requestLocation()),
            expand: true,
          ),
        );
      case _Step.locationBlocked:
        return _StepView(
          icon: LucideIcons.circleAlert,
          title: 'Location is blocked for FindPhone',
          body: 'Turn it on in Settings › Apps › FindPhone › Permissions › Location, then come back.',
          primary: FpButton(
            label: 'Open settings',
            icon: LucideIcons.settings,
            onPressed: () => controller.run((s) => s.openAppSettings()),
            expand: true,
          ),
        );
      case _Step.approximate:
        return _StepView(
          icon: LucideIcons.crosshair,
          title: 'Precise location is off',
          body: 'With approximate location, your position can be off by up to 3 km. '
              'Turn on precise location for useful results.',
          primary: FpButton(
            label: 'Open settings',
            icon: LucideIcons.settings,
            onPressed: () => controller.run((s) => s.openAppSettings()),
            expand: true,
          ),
          secondary: FpButton.ghost(
            label: 'Continue with approximate',
            onPressed: () => setState(() => _skipped.add(_Step.approximate)),
            expand: true,
          ),
        );
      case _Step.notifications:
        return _StepView(
          icon: LucideIcons.bell,
          title: 'Allow notifications',
          body: 'Android shows a notification while sharing is on, so you always know. '
              "Without this permission it's hidden in the notification drawer.",
          primary: FpButton(
            label: 'Allow notifications',
            onPressed: () async {
              await controller.run((s) => s.requestNotifications());
              if (mounted) setState(() => _skipped.add(_Step.notifications));
            },
            expand: true,
          ),
          secondary: FpButton.ghost(
            label: 'Not now',
            onPressed: () => setState(() => _skipped.add(_Step.notifications)),
            expand: true,
          ),
        );
      case _Step.always:
        return _StepView(
          icon: LucideIcons.rotateCcw,
          title: _android ? 'Keep sharing after a restart' : 'Keep sharing in the background',
          body: _android
              ? 'Choose "Allow all the time" on the next screen so sharing starts again on its own after your '
                  'phone restarts. Without it, open FindPhone once after each restart.'
              : 'Choose "Change to Always Allow" so your location can update while FindPhone is in the background.',
          primary: FpButton(
            label: _android ? 'Open location permission' : 'Allow in background',
            icon: _android ? LucideIcons.settings : null,
            onPressed: () async {
              await controller.run((s) => s.requestAlways());
              if (mounted) setState(() => _skipped.add(_Step.always));
            },
            expand: true,
          ),
          secondary: FpButton.ghost(
            label: 'Not now',
            onPressed: () => setState(() => _skipped.add(_Step.always)),
            expand: true,
          ),
        );
      case _Step.done:
        return const SizedBox.shrink();
    }
  }
}

class _StepView extends StatelessWidget {
  const _StepView({
    required this.icon,
    required this.title,
    required this.body,
    required this.primary,
    this.secondary,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget primary;
  final Widget? secondary;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return FpScaffold(
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          primary,
          if (secondary != null) ...[const SizedBox(height: FpSpace.s2), secondary!],
        ],
      ),
      children: [
        const SizedBox(height: FpSpace.s8),
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: c.accentSubtle, borderRadius: FpCorners.md),
            child: Icon(icon, size: FpSize.iconLg, color: c.accentOnSubtle),
          ),
        ),
        const SizedBox(height: FpSpace.s6),
        FpHeading(title: title, body: body),
      ],
    );
  }
}
