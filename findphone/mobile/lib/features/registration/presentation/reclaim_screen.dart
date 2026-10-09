import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/models/consent_record.dart';
import '../../../core/router/routes.dart';
import '../../../design_system/components/fp_banner.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_feedback.dart';
import '../../../design_system/components/fp_info_row.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/components/fp_text_field.dart';
import '../application/registration_providers.dart';
import 'register_screen.dart';

class ReclaimScreen extends ConsumerStatefulWidget {
  const ReclaimScreen({super.key, required this.args});
  final ReclaimArgs? args;

  @override
  ConsumerState<ReclaimScreen> createState() => _ReclaimScreenState();
}

class _ReclaimScreenState extends ConsumerState<ReclaimScreen> {
  final _code = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit(ReclaimArgs args) async {
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final consent = ref.read(localStoreProvider).consent ??
          ConsentRecord(acceptedAt: DateTime.now(), termsVersion: Env.termsVersion);
      await ref.read(registrationRepositoryProvider).reclaim(
            name: args.name.isEmpty ? 'FindPhone user' : args.name,
            phoneE164: args.phone.e164,
            recoveryCodeInput: _code.text,
            consent: consent,
          );
      if (!mounted) return;
      showFpToast(context, 'Number reclaimed. Sharing will resume on this phone.');
      context.go(Routes.home);
    } catch (e) {
      if (mounted) setState(() => _error = mapError(e).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = widget.args;
    if (args == null) {
      // Opened without a number (e.g. after process death): start from registration.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(Routes.register);
      });
      return const SizedBox.shrink();
    }

    return FpScaffold(
      showBack: true,
      bottom: FpButton(
        label: 'Reclaim number',
        onPressed: () => _submit(args),
        loading: _busy,
        expand: true,
      ),
      children: [
        const FpHeading(
          title: 'Reclaim your number',
          body: 'Enter the recovery code you saved when you first registered. Sharing moves to this phone, '
              'and the old phone stops sharing.',
        ),
        const SizedBox(height: FpSpace.s6),
        FpInfoGroup(children: [FpInfoRow(label: 'Number', value: args.phone.display, mono: true)]),
        const SizedBox(height: FpSpace.s5),
        FpTextField(
          label: 'Recovery code',
          controller: _code,
          hint: 'XXXXX-XXXXX-XXXXX-XXXXX',
          mono: true,
          error: _error,
          textCapitalization: TextCapitalization.characters,
          textInputAction: TextInputAction.done,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9A-Za-z\- ]')),
            LengthLimitingTextInputFormatter(29),
          ],
          onSubmitted: (_) => _submit(args),
        ),
        const SizedBox(height: FpSpace.s4),
        const FpBanner(
          icon: LucideIcons.info,
          text: 'Lost the code? The number can only be freed by deleting the record from the original phone, '
              'or by the project organiser.',
        ),
      ],
    );
  }
}
