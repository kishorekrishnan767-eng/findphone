import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/time/time_format.dart';
import '../../../design_system/components/fp_banner.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_card.dart';
import '../../../design_system/components/fp_feedback.dart';
import '../../../design_system/components/fp_status_badge.dart';
import '../../../design_system/theme/app_theme.dart';
import '../../tracking/application/tracking_controller.dart';
import '../../tracking/domain/tracking_snapshot.dart';

/// The most important thing on Home: is this phone sharing, and when did it last sync.
class SharingStatusCard extends ConsumerStatefulWidget {
  const SharingStatusCard({super.key});

  @override
  ConsumerState<SharingStatusCard> createState() => _SharingStatusCardState();
}

class _SharingStatusCardState extends ConsumerState<SharingStatusCard> {
  late final Timer _tick;

  @override
  void initState() {
    super.initState();
    // Keeps "9 s ago" honest without rebuilding anything else.
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick.cancel();
    super.dispose();
  }

  Future<void> _toggle(bool paused) async {
    final controller = ref.read(trackingControllerProvider.notifier);
    try {
      if (paused) {
        await controller.resume();
      } else {
        await controller.pause();
        if (mounted) showFpToast(context, 'Sharing paused. Your location was removed.');
      }
    } catch (_) {
      if (mounted) showFpToast(context, "Couldn't change sharing. Try again.", isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final ui = ref.watch(trackingControllerProvider);
    final s = ui.snapshot;
    final paused = s.phase == TrackingPhase.paused;

    final (FpStatus status, String badge, String title) = switch (s.phase) {
      TrackingPhase.active => (FpStatus.live, 'Live', 'Sharing is on'),
      TrackingPhase.starting => (FpStatus.live, 'Starting', 'Sharing is on'),
      TrackingPhase.degraded => (FpStatus.stale, 'Delayed', 'Sharing is on'),
      TrackingPhase.paused => (FpStatus.paused, 'Paused', 'Sharing is paused'),
      TrackingPhase.failed => (FpStatus.error, 'Stopped', 'Sharing has stopped'),
      TrackingPhase.stopped => (FpStatus.paused, 'Off', 'Sharing is off'),
    };

    return FpCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(title, style: FpText.title.copyWith(color: c.textPrimary)),
                ),
              ),
              FpStatusBadge(status: status, label: badge),
            ],
          ),
          const SizedBox(height: FpSpace.s2),
          if (s.lastSyncAt != null)
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'Last sync ', style: FpText.body.copyWith(color: c.textSecondary)),
                  TextSpan(text: TimeFormat.clock(s.lastSyncAt!), style: FpText.mono.copyWith(color: c.textPrimary)),
                  TextSpan(
                    text: ' · ${TimeFormat.ago(s.lastSyncAt!)}',
                    style: FpText.body.copyWith(color: c.textSecondary),
                  ),
                ],
              ),
            )
          else
            Text(
              paused ? 'Nothing is being shared.' : 'Waiting for the first location.',
              style: FpText.body.copyWith(color: c.textSecondary),
            ),
          if (paused) ...[
            const SizedBox(height: FpSpace.s2),
            Text(
              'While paused, your location is removed and people looking up your number see "Sharing is paused".',
              style: FpText.caption.copyWith(color: c.textTertiary),
            ),
          ],
          if (s.failure != null && !paused) ...[
            const SizedBox(height: FpSpace.s3),
            FpBanner(
              icon: s.failure is OfflineFailure ? LucideIcons.wifiOff : LucideIcons.circleAlert,
              text: s.failure!.message,
              kind: s.phase == TrackingPhase.failed ? FpBannerKind.error : FpBannerKind.warning,
            ),
          ],
          const SizedBox(height: FpSpace.s4),
          if (s.phase != TrackingPhase.failed || s.failure is! OwnershipLostFailure)
            FpButton.secondary(
              label: paused || s.phase == TrackingPhase.stopped ? 'Resume sharing' : 'Pause sharing',
              icon: paused || s.phase == TrackingPhase.stopped ? LucideIcons.play : LucideIcons.pause,
              loading: ui.busy,
              expand: true,
              onPressed: () => _toggle(paused || s.phase == TrackingPhase.stopped),
            ),
        ],
      ),
    );
  }
}
