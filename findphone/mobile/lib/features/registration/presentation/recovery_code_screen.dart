import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/di/providers.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_checkbox_tile.dart';
import '../../../design_system/components/fp_feedback.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/components/fp_skeleton.dart';
import '../../../design_system/theme/app_theme.dart';
import '../application/registration_providers.dart';

/// Shown until acknowledged; the router keeps returning here, so a crash or back-swipe can't
/// skip it. After acknowledgement the code is never displayed again.
class RecoveryCodeScreen extends ConsumerStatefulWidget {
  const RecoveryCodeScreen({super.key});

  @override
  ConsumerState<RecoveryCodeScreen> createState() => _RecoveryCodeScreenState();
}

class _RecoveryCodeScreenState extends ConsumerState<RecoveryCodeScreen> {
  bool _saved = false;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final code = ref.watch(recoveryCodeProvider);

    return PopScope(
      canPop: false,
      child: FpScaffold(
        bottom: FpButton(
          label: 'Continue',
          onPressed: _saved ? () => ref.read(localStoreProvider).setRecoveryCodeAcknowledged(true) : null,
          expand: true,
        ),
        children: [
          const FpHeading(
            title: 'Save your recovery code',
            body: "You'll need it to take this number back if you reinstall FindPhone or change phones. "
                "It won't be shown again.",
          ),
          const SizedBox(height: FpSpace.s6),
          Container(
            padding: const EdgeInsets.all(FpSpace.s4),
            decoration: BoxDecoration(
              color: c.bgSubtle,
              borderRadius: FpCorners.lg,
              border: Border.all(color: c.borderDefault),
            ),
            child: code.when(
              loading: () => const FpSkeleton(height: 32),
              error: (_, _) => Text(
                "The recovery code couldn't be read on this phone.",
                style: FpText.body.copyWith(color: c.destructiveText),
              ),
              data: (value) => value == null
                  ? Text('No recovery code found.', style: FpText.body.copyWith(color: c.textSecondary))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Semantics(
                          label: 'Recovery code ${value.split('').join(' ')}',
                          excludeSemantics: true,
                          child: SelectableText(
                            value,
                            style: FpText.monoDisplay.copyWith(color: c.textPrimary, fontSize: 20),
                          ),
                        ),
                        const SizedBox(height: FpSpace.s3),
                        FpButton.secondary(
                          label: 'Copy code',
                          icon: LucideIcons.copy,
                          onPressed: () async {
                            await Clipboard.setData(ClipboardData(text: value));
                            if (context.mounted) showFpToast(context, 'Recovery code copied');
                          },
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: FpSpace.s4),
          Text(
            'Store it somewhere other than this phone, such as a password manager or on paper. '
            'Anyone with this code and your number can move sharing to their phone.',
            style: FpText.body.copyWith(color: c.textSecondary),
          ),
          const SizedBox(height: FpSpace.s4),
          FpCheckboxTile(
            value: _saved,
            onChanged: (v) => setState(() => _saved = v),
            label: "I've saved it somewhere safe",
          ),
        ],
      ),
    );
  }
}
