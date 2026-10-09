import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/di/providers.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/generated/countries.g.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/phone/phone_normalizer.dart';
import '../../../core/router/routes.dart';
import '../../../design_system/components/fp_banner.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_phone_field.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/components/fp_text_field.dart';
import '../../../design_system/theme/app_theme.dart';
import '../application/registration_providers.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  FpCountry _country = PhoneNormalizer.defaultCountry;

  String? _nameError;
  String? _phoneError;
  AppFailure? _failure;
  PhoneNumber? _takenNumber;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final name = _name.text.trim().replaceAll(RegExp(r'\s+'), ' ');
    final parsed = PhoneNormalizer.parse(_phone.text, defaultIso: _country.iso);
    setState(() {
      _nameError = name.isEmpty
          ? 'Enter your name.'
          : (name.length > 40 ? 'Use 40 characters or fewer.' : null);
      _phoneError = parsed is PhoneInvalid ? parsed.message : null;
      _failure = null;
      _takenNumber = null;
    });
    if (_nameError != null || parsed is! PhoneValid) return;

    final consent = ref.read(localStoreProvider).consent;
    if (consent == null) return; // Router guard sends the user back to consent.

    setState(() => _busy = true);
    try {
      await ref.read(registrationRepositoryProvider).register(
            name: name,
            phoneE164: parsed.number.e164,
            consent: consent,
          );
      // The router guard moves on to the recovery code (or permissions) automatically.
    } catch (e) {
      final failure = mapError(e);
      if (!mounted) return;
      setState(() {
        _failure = failure;
        if (failure is NumberTakenFailure) _takenNumber = parsed.number;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return FpScaffold(
      bottom: FpButton(label: 'Register this phone', onPressed: _submit, loading: _busy, expand: true),
      children: [
        const FpHeading(
          title: 'Your details',
          body: 'Your number is how people find this phone on the FindPhone website.',
        ),
        const SizedBox(height: FpSpace.s6),
        FpTextField(
          label: 'Name',
          controller: _name,
          hint: 'Asha Rao',
          helper: 'Shown to people who look up your number.',
          error: _nameError,
          maxLength: 40,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.name],
        ),
        const SizedBox(height: FpSpace.s5),
        FpPhoneField(
          label: 'Mobile number',
          controller: _phone,
          country: _country,
          onCountryChanged: (c) => setState(() {
            _country = c;
            _phone.clear();
          }),
          error: _phoneError,
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: FpSpace.s4),
        const FpBanner(
          icon: LucideIcons.info,
          text: "Demo mode: this number isn't verified. Only register your own number.",
        ),
        if (_failure != null) ...[
          const SizedBox(height: FpSpace.s4),
          if (_takenNumber != null)
            _TakenNotice(
              onReclaim: () => context.push(
                Routes.reclaim,
                extra: ReclaimArgs(phone: _takenNumber!, name: _name.text.trim()),
              ),
              onDifferent: () => setState(() {
                _phone.clear();
                _failure = null;
                _takenNumber = null;
              }),
            )
          else
            FpBanner(icon: LucideIcons.circleAlert, text: _failure!.message, kind: FpBannerKind.error),
        ],
        const SizedBox(height: FpSpace.s2),
        Text(
          'Already registered this number on a phone you no longer use? Choose the number above, then use your recovery code.',
          style: FpText.caption.copyWith(color: c.textTertiary),
        ),
      ],
    );
  }
}

class _TakenNotice extends StatelessWidget {
  const _TakenNotice({required this.onReclaim, required this.onDifferent});
  final VoidCallback onReclaim;
  final VoidCallback onDifferent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const FpBanner(
          icon: LucideIcons.circleAlert,
          text: 'This number is already registered on another phone.',
          kind: FpBannerKind.warning,
        ),
        const SizedBox(height: FpSpace.s3),
        FpButton.secondary(
          label: 'Reclaim with recovery code',
          icon: LucideIcons.keyRound,
          onPressed: onReclaim,
          expand: true,
        ),
        const SizedBox(height: FpSpace.s2),
        FpButton.ghost(label: 'Use a different number', onPressed: onDifferent, expand: true),
      ],
    );
  }
}

class ReclaimArgs {
  const ReclaimArgs({required this.phone, required this.name});
  final PhoneNumber phone;
  final String name;
}
