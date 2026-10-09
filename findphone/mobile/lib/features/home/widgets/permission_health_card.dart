import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/generated/tokens.g.dart';
import '../../../core/router/routes.dart';
import '../../../design_system/components/fp_card.dart';
import '../../../design_system/components/fp_info_row.dart';
import '../../../design_system/components/fp_skeleton.dart';
import '../../../design_system/theme/app_theme.dart';
import '../../permissions/application/permission_controller.dart';
import '../../permissions/domain/permission_health.dart';

/// Permission health at a glance. Problem rows turn amber and open the screen that fixes them.
class PermissionHealthCard extends ConsumerWidget {
  const PermissionHealthCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final health = ref.watch(permissionControllerProvider);
    final android = defaultTargetPlatform == TargetPlatform.android;

    return FpSection(
      title: 'Permissions',
      child: health.when(
        loading: () => const FpSkeleton(height: 132),
        error: (_, _) => const SizedBox.shrink(),
        data: (h) {
          final (String location, FpTone locationTone) = _location(h);
          return FpInfoGroup(
            children: [
              FpInfoRow(
                label: 'Location',
                value: location,
                tone: locationTone,
                leading: LucideIcons.locateFixed,
                trailing: locationTone == FpTone.neutral ? null : _chevron(context),
                onTap: locationTone == FpTone.neutral ? null : () => context.push(Routes.permissions),
              ),
              if (android)
                FpInfoRow(
                  label: 'Notifications',
                  value: h.notifications ? 'Allowed' : 'Off: the sharing notice is hidden',
                  tone: h.notifications ? FpTone.neutral : FpTone.warning,
                  leading: LucideIcons.bell,
                  trailing: h.notifications ? null : _chevron(context),
                  onTap: h.notifications ? null : () => context.push(Routes.reliability),
                ),
              if (android)
                FpInfoRow(
                  label: 'Battery',
                  value: h.batteryUnrestricted ? 'Unrestricted' : 'Restricted: may stop sharing',
                  tone: h.batteryUnrestricted ? FpTone.neutral : FpTone.warning,
                  leading: LucideIcons.batteryCharging,
                  trailing: _chevron(context),
                  onTap: () => context.push(Routes.reliability),
                ),
            ],
          );
        },
      ),
    );
  }

  static Widget _chevron(BuildContext context) =>
      Icon(LucideIcons.chevronRight, size: FpSize.iconMd, color: context.fp.textTertiary);

  static (String, FpTone) _location(PermissionHealth h) {
    if (!h.servicesEnabled) return ('Turned off on this phone', FpTone.error);
    return switch (h.location) {
      LocationAccess.denied || LocationAccess.deniedForever => ('Not allowed', FpTone.error),
      LocationAccess.whileInUse => (h.precise ? 'Precise · While using the app' : 'Approximate · While using', h.precise ? FpTone.neutral : FpTone.warning),
      LocationAccess.always => (h.precise ? 'Precise · All the time' : 'Approximate · All the time', h.precise ? FpTone.neutral : FpTone.warning),
    };
  }
}
