import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Label above, 44 px field, helper or error below. Errors replace the helper and are announced.
class FpTextField extends StatelessWidget {
  const FpTextField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.helper,
    this.error,
    this.keyboardType,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.autofillHints,
    this.onSubmitted,
    this.onChanged,
    this.mono = false,
    this.maxLength,
    this.enabled = true,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final String? helper;
  final String? error;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final bool mono;
  final int? maxLength;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final valueStyle = (mono ? FpText.mono.copyWith(fontSize: 16) : FpText.bodyLg).copyWith(color: c.textPrimary);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ExcludeSemantics(child: Text(label, style: FpText.label.copyWith(color: c.textPrimary))),
        const SizedBox(height: FpSpace.s2),
        Semantics(
          label: label,
          hint: helper,
          textField: true,
          child: TextField(
            controller: controller,
            enabled: enabled,
            style: valueStyle,
            keyboardType: keyboardType,
            textInputAction: textInputAction,
            textCapitalization: textCapitalization,
            inputFormatters: inputFormatters,
            autofillHints: autofillHints,
            onSubmitted: onSubmitted,
            onChanged: onChanged,
            maxLength: maxLength,
            decoration: fpInputDecoration(context, hint: hint, hasError: error != null),
          ),
        ),
        FpFieldMessage(helper: helper, error: error),
      ],
    );
  }
}

/// Shared by text and phone fields so both look identical.
InputDecoration fpInputDecoration(BuildContext context, {String? hint, bool hasError = false}) {
  final c = context.fp;
  OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
        borderRadius: FpCorners.md,
        borderSide: BorderSide(color: color, width: width),
      );
  final rest = hasError ? c.destructiveText : c.borderControl;
  return InputDecoration(
    hintText: hint,
    hintStyle: FpText.bodyLg.copyWith(color: c.textTertiary),
    isDense: true,
    filled: true,
    fillColor: c.bgSurface,
    counterText: '',
    constraints: const BoxConstraints(minHeight: FpSize.controlMd),
    contentPadding: const EdgeInsets.symmetric(horizontal: FpSpace.s3, vertical: FpSpace.s3),
    enabledBorder: border(rest),
    disabledBorder: border(c.borderDefault),
    focusedBorder: border(hasError ? c.destructiveText : c.accentDefault, 2),
    errorBorder: border(c.destructiveText),
    focusedErrorBorder: border(c.destructiveText, 2),
  );
}

class FpFieldMessage extends StatelessWidget {
  const FpFieldMessage({super.key, this.helper, this.error});

  final String? helper;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    if (error != null) {
      return Padding(
        padding: const EdgeInsets.only(top: FpSpace.s2),
        child: Semantics(
          liveRegion: true,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Icon(LucideIcons.circleAlert, size: FpSize.iconSm, color: c.destructiveText),
              ),
              const SizedBox(width: FpSpace.s2),
              Expanded(child: Text(error!, style: FpText.caption.copyWith(color: c.destructiveText))),
            ],
          ),
        ),
      );
    }
    if (helper != null) {
      return Padding(
        padding: const EdgeInsets.only(top: FpSpace.s2),
        child: ExcludeSemantics(child: Text(helper!, style: FpText.caption.copyWith(color: c.textTertiary))),
      );
    }
    return const SizedBox.shrink();
  }
}
