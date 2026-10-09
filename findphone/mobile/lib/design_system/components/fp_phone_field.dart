import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/generated/countries.g.dart';
import '../../core/generated/tokens.g.dart';
import '../../core/phone/phone_normalizer.dart';
import '../theme/app_theme.dart';
import 'fp_text_field.dart';

/// One visual field: country segment (`+91 ▾`, mono) | national number grouped as you type.
/// No flags; the country picker lists name + dial code.
class FpPhoneField extends StatelessWidget {
  const FpPhoneField({
    super.key,
    required this.label,
    required this.controller,
    required this.country,
    required this.onCountryChanged,
    this.helper,
    this.error,
    this.onSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final FpCountry country;
  final ValueChanged<FpCountry> onCountryChanged;
  final String? helper;
  final String? error;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ExcludeSemantics(child: Text(label, style: FpText.label.copyWith(color: c.textPrimary))),
        const SizedBox(height: FpSpace.s2),
        Semantics(
          label: label,
          textField: true,
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.telephoneNumberNational],
            inputFormatters: [_GroupingFormatter(country)],
            style: FpText.mono.copyWith(fontSize: 16, color: c.textPrimary),
            onSubmitted: onSubmitted,
            decoration: fpInputDecoration(
              context,
              hint: PhoneNormalizer.formatNational(country.example, country),
              hasError: error != null,
            ).copyWith(
              hintStyle: FpText.mono.copyWith(fontSize: 16, color: c.textTertiary),
              prefixIcon: _CountryButton(country: country, onChanged: onCountryChanged),
              prefixIconConstraints: const BoxConstraints(minHeight: FpSize.controlMd),
            ),
          ),
        ),
        FpFieldMessage(helper: helper, error: error),
      ],
    );
  }
}

class _CountryButton extends StatelessWidget {
  const _CountryButton({required this.country, required this.onChanged});

  final FpCountry country;
  final ValueChanged<FpCountry> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Semantics(
      button: true,
      label: 'Country code ${country.name}, plus ${country.dialCode}. Change country',
      excludeSemantics: true,
      child: InkWell(
        borderRadius: const BorderRadius.horizontal(left: Radius.circular(FpRadius.md)),
        onTap: () async {
          final picked = await showCountryPicker(context, selected: country);
          if (picked != null) onChanged(picked);
        },
        child: Container(
          constraints: const BoxConstraints(minHeight: FpSize.controlMd, minWidth: FpSize.touchTarget),
          padding: const EdgeInsets.only(left: FpSpace.s3, right: FpSpace.s2),
          margin: const EdgeInsets.only(right: FpSpace.s3),
          decoration: BoxDecoration(border: Border(right: BorderSide(color: c.borderDefault))),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('+${country.dialCode}', style: FpText.mono.copyWith(fontSize: 16, color: c.textPrimary)),
              const SizedBox(width: FpSpace.s1),
              Icon(LucideIcons.chevronDown, size: FpSize.iconSm, color: c.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

/// Searchable list of supported countries.
Future<FpCountry?> showCountryPicker(BuildContext context, {required FpCountry selected}) {
  return showModalBottomSheet<FpCountry>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _CountryPicker(selected: selected),
  );
}

class _CountryPicker extends StatefulWidget {
  const _CountryPicker({required this.selected});
  final FpCountry selected;

  @override
  State<_CountryPicker> createState() => _CountryPickerState();
}

class _CountryPickerState extends State<_CountryPicker> {
  final _query = TextEditingController();

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final q = _query.text.trim().toLowerCase().replaceAll('+', '');
    final items = kCountries
        .where((x) => q.isEmpty || x.name.toLowerCase().contains(q) || x.dialCode.startsWith(q))
        .toList();

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.7,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(FpSpace.s4, 0, FpSpace.s4, FpSpace.s3),
              child: Text('Country', style: FpText.titleSm.copyWith(color: c.textPrimary)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: FpSpace.s4),
              child: Semantics(
                label: 'Search countries',
                textField: true,
                child: TextField(
                  controller: _query,
                  autofocus: false,
                  onChanged: (_) => setState(() {}),
                  style: FpText.bodyLg.copyWith(color: c.textPrimary),
                  decoration: fpInputDecoration(context, hint: 'Search by name or code').copyWith(
                    prefixIcon: Icon(LucideIcons.search, size: FpSize.iconMd, color: c.textTertiary),
                  ),
                ),
              ),
            ),
            const SizedBox(height: FpSpace.s2),
            Expanded(
              child: ListView.builder(
                itemCount: items.length,
                itemBuilder: (context, i) {
                  final item = items[i];
                  final isSelected = item.iso == widget.selected.iso;
                  return ListTile(
                    minTileHeight: FpSize.touchTarget,
                    contentPadding: const EdgeInsets.symmetric(horizontal: FpSpace.s4),
                    selected: isSelected,
                    selectedTileColor: c.accentSubtle,
                    title: Text(item.name, style: FpText.bodyLg.copyWith(color: c.textPrimary)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('+${item.dialCode}', style: FpText.mono.copyWith(color: c.textSecondary)),
                        if (isSelected) ...[
                          const SizedBox(width: FpSpace.s2),
                          Icon(LucideIcons.check, size: FpSize.iconMd, color: c.accentOnSubtle),
                        ],
                      ],
                    ),
                    onTap: () => Navigator.of(context).pop(item),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Keeps digits only (a leading + is allowed for pasted international numbers) and groups them
/// per the selected country while typing.
class _GroupingFormatter extends TextInputFormatter {
  _GroupingFormatter(this.country);
  final FpCountry country;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final raw = newValue.text;
    // Pasted international or formatted numbers are left as typed; normalisation handles them.
    if (raw.startsWith('+') || raw.startsWith('00')) return newValue;
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > country.maxLength + 1) return newValue;
    final formatted = PhoneNormalizer.formatNational(digits, country);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
