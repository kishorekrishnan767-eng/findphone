import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/generated/tokens.g.dart';
import '../../../design_system/components/fp_card.dart';
import '../../../design_system/components/fp_feedback.dart';
import '../../../design_system/theme/app_theme.dart';

class DeviceIdCard extends StatelessWidget {
  const DeviceIdCard({super.key, required this.deviceCode, required this.numberDisplay});

  final String deviceCode;
  final String numberDisplay;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return FpSection(
      title: 'Device ID',
      child: FpCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    label: 'Device ID ${deviceCode.split('').join(' ')}',
                    excludeSemantics: true,
                    child: Text(deviceCode, style: FpText.monoDisplay.copyWith(color: c.textPrimary)),
                  ),
                ),
                IconButton(
                  tooltip: 'Copy Device ID',
                  icon: Icon(LucideIcons.copy, size: FpSize.iconMd, color: c.textSecondary),
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: deviceCode));
                    if (context.mounted) showFpToast(context, 'Device ID copied');
                  },
                ),
              ],
            ),
            const SizedBox(height: FpSpace.s1),
            Text(
              'Matches the ID shown on the FindPhone website.',
              style: FpText.caption.copyWith(color: c.textTertiary),
            ),
            const SizedBox(height: FpSpace.s3),
            Text(numberDisplay, style: FpText.mono.copyWith(color: c.textSecondary)),
          ],
        ),
      ),
    );
  }
}
