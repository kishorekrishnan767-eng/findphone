import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/di/providers.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/phone/phone_normalizer.dart';
import '../../../design_system/components/fp_banner.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_feedback.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/theme/app_theme.dart';
import '../../account/application/account_providers.dart';
import '../widgets/device_id_card.dart';
import '../widgets/permission_health_card.dart';
import '../widgets/sharing_status_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _deleting = false;

  Future<void> _delete() async {
    final confirmed = await showFpConfirm(
      context,
      title: 'Delete your data?',
      body: 'Sharing stops and your name, number and location are permanently removed from FindPhone. '
          'Anyone who looks up your number will see "No device found".',
      confirmLabel: 'Delete everything',
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    setState(() => _deleting = true);
    try {
      await deleteMyData(ref);
      if (mounted) showFpToast(context, 'Your data has been deleted.');
      // The router guard returns to onboarding now that local state is empty.
    } catch (e) {
      if (mounted) showFpToast(context, mapError(e).message, isError: true);
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final reg = ref.watch(localStoreProvider).registration;
    final online = ref.watch(onlineProvider).value ?? true;
    if (reg == null) return const Scaffold();

    final number = switch (PhoneNormalizer.parse(reg.phoneE164, defaultIso: 'IN')) {
      PhoneValid(:final number) => number.display,
      PhoneInvalid() => reg.phoneE164,
    };

    return FpScaffold(
      children: [
        Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(color: c.accentDefault, borderRadius: FpCorners.md),
              child: Icon(LucideIcons.locateFixed, size: FpSize.iconSm, color: c.textOnAccent),
            ),
            const SizedBox(width: FpSpace.s2),
            Semantics(header: true, child: Text('FindPhone', style: FpText.titleSm.copyWith(color: c.textPrimary))),
          ],
        ),
        const SizedBox(height: FpSpace.s5),
        if (!online) ...[
          const FpBanner(
            icon: LucideIcons.wifiOff,
            text: "You're offline. Your latest location will be sent when you reconnect.",
            kind: FpBannerKind.warning,
          ),
          const SizedBox(height: FpSpace.s3),
        ],
        const SharingStatusCard(),
        const SizedBox(height: FpSpace.s6),
        DeviceIdCard(deviceCode: reg.deviceCode, numberDisplay: number),
        const SizedBox(height: FpSpace.s6),
        const PermissionHealthCard(),
        const SizedBox(height: FpSpace.s8),
        Align(
          alignment: Alignment.centerLeft,
          child: FpButton(
            label: 'Stop sharing and delete my data',
            icon: LucideIcons.trash2,
            variant: FpButtonVariant.destructiveGhost,
            loading: _deleting,
            onPressed: _delete,
          ),
        ),
      ],
    );
  }
}
