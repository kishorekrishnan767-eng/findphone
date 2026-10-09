import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/di/providers.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/router/routes.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_info_row.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/components/fp_skeleton.dart';
import '../../../design_system/theme/app_theme.dart';
import '../../permissions/application/permission_controller.dart';
import '../../permissions/domain/permission_health.dart';
import '../data/oem_guidance.dart';

/// "Keep tracking reliable": a live checklist of what the app can verify, plus manufacturer
/// steps it can't. Re-checked whenever the user returns from Settings.
class ReliabilityScreen extends ConsumerWidget {
  const ReliabilityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.fp;
    final health = ref.watch(permissionControllerProvider);
    final details = ref.watch(deviceDetailsProvider);
    final controller = ref.read(permissionControllerProvider.notifier);
    final detected = details.whenOrNull(data: (d) => OemGuidance.forManufacturer(d.manufacturer));
    final others = OemGuidance.all.where((g) => g != detected).toList();

    void done() {
      ref.read(localStoreProvider).setReliabilitySeen();
      context.go(Routes.home);
    }

    return FpScaffold(
      title: 'Keep tracking reliable',
      showBack: true,
      onBack: done,
      bottom: FpButton(label: 'Done', onPressed: done, expand: true),
      children: [
        Text(
          'Some phones stop background apps to save battery. These settings keep sharing running.',
          style: FpText.bodyLg.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: FpSpace.s5),
        health.when(
          loading: () => const FpSkeleton(height: 140),
          error: (_, _) => const SizedBox.shrink(),
          data: (h) => FpInfoGroup(
            children: [
              _check(
                ok: h.hasAlways,
                okText: 'Location: all the time',
                badText: 'Location: only while using',
                onFix: () => controller.run((s) => s.requestAlways()),
                fixLabel: 'Change',
              ),
              _check(
                ok: h.notifications,
                okText: 'Notifications allowed',
                badText: 'Notifications off',
                onFix: () => controller.run((s) => s.requestNotifications()),
                fixLabel: 'Allow',
              ),
              _check(
                ok: h.batteryUnrestricted,
                okText: 'Battery optimisation off',
                badText: 'Battery optimisation on',
                onFix: () => controller.run((s) => s.requestBatteryExemption()),
                fixLabel: 'Turn off',
              ),
            ],
          ),
        ),
        const SizedBox(height: FpSpace.s6),
        if (detected != null) ...[
          _Guide(guide: detected, heading: 'On your ${detected.brand} phone'),
          const SizedBox(height: FpSpace.s3),
          FpButton.secondary(
            label: 'Open FindPhone settings',
            icon: LucideIcons.settings,
            onPressed: () => controller.run((s) => s.openAppSettings()),
          ),
          const SizedBox(height: FpSpace.s5),
        ],
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            title: Text(
              detected == null ? 'Steps by manufacturer' : 'Other phones',
              style: FpText.titleSm.copyWith(color: c.textPrimary),
            ),
            childrenPadding: const EdgeInsets.only(bottom: FpSpace.s3),
            children: [
              for (final g in others) ...[
                _Guide(guide: g, heading: g.brand),
                const SizedBox(height: FpSpace.s4),
              ],
            ],
          ),
        ),
        const SizedBox(height: FpSpace.s3),
        Text(
          'Menu names vary by model and Android version.',
          style: FpText.caption.copyWith(color: c.textTertiary),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: FpButton.ghost(
            label: 'More phones on dontkillmyapp.com',
            icon: LucideIcons.externalLink,
            onPressed: () => launchUrl(Uri.parse('https://dontkillmyapp.com'), mode: LaunchMode.externalApplication),
          ),
        ),
      ],
    );
  }

  Widget _check({
    required bool ok,
    required String okText,
    required String badText,
    required VoidCallback onFix,
    required String fixLabel,
  }) {
    return FpInfoRow(
      label: ok ? 'Done' : 'Needs action',
      value: ok ? okText : badText,
      leading: ok ? LucideIcons.circleCheck : LucideIcons.triangleAlert,
      tone: ok ? FpTone.good : FpTone.warning,
      trailing: ok ? null : FpButton.ghost(label: fixLabel, onPressed: onFix),
    );
  }
}

class _Guide extends StatelessWidget {
  const _Guide({required this.guide, required this.heading});
  final OemGuidance guide;
  final String heading;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(heading, style: FpText.titleSm.copyWith(color: c.textPrimary))),
        const SizedBox(height: FpSpace.s2),
        for (var i = 0; i < guide.steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: FpSpace.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  child: Text('${i + 1}.', style: FpText.mono.copyWith(color: c.textTertiary)),
                ),
                Expanded(child: Text(guide.steps[i], style: FpText.body.copyWith(color: c.textPrimary))),
              ],
            ),
          ),
      ],
    );
  }
}

/// Used by Home to decide whether the permissions card shows a problem.
bool reliabilityNeedsAttention(PermissionHealth h) => !h.batteryUnrestricted || !h.hasAlways;
