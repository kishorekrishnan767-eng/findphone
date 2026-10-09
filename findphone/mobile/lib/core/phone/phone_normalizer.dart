import '../generated/countries.g.dart';

/// Turns user input into an E.164 document id. The algorithm is specified in
/// docs/architecture.md §5.5 and pinned by shared/phone-vectors.json; the web app implements the
/// same steps, so both produce the same id for the same input.
abstract final class PhoneNormalizer {
  static final _allowed = RegExp(r'^\+?[0-9\s\-.()]*$');
  static final _nonDigits = RegExp(r'[^0-9]');
  static final Map<String, RegExp> _patterns = {
    for (final c in kCountries) c.iso: RegExp(c.mobilePattern),
  };

  static FpCountry countryByIso(String iso) =>
      kCountries.firstWhere((c) => c.iso == iso, orElse: () => defaultCountry);

  static FpCountry get defaultCountry => kCountries.firstWhere((c) => c.iso == kDefaultCountryIso);

  static PhoneParseResult parse(String input, {required String defaultIso}) {
    final trimmed = input.trim();
    if (!_allowed.hasMatch(trimmed)) return const PhoneInvalid(PhoneError.invalidCharacters);

    final digits = trimmed.replaceAll(_nonDigits, '');
    if (digits.isEmpty) return const PhoneInvalid(PhoneError.empty);

    final fallback = countryByIso(defaultIso);
    if (trimmed.startsWith('+')) return _international(digits, fallback);
    if (digits.startsWith('00')) return _international(digits.substring(2), fallback);
    return _local(digits, fallback);
  }

  static PhoneParseResult _international(String digits, FpCountry preferred) {
    if (digits.isEmpty) return const PhoneInvalid(PhoneError.empty);
    for (final len in const [3, 2, 1]) {
      if (digits.length < len) continue;
      final prefix = digits.substring(0, len);
      final candidates = kCountries.where((c) => c.dialCode == prefix).toList();
      if (candidates.isEmpty) continue;
      final country = candidates.contains(preferred) ? preferred : candidates.first;
      var national = digits.substring(len);
      // "+44 (0) 7700 …": a trunk prefix written after the country code.
      final trunk = country.trunkPrefix;
      if (trunk != null && national.startsWith(trunk) && _fitsLength(national.substring(trunk.length), country)) {
        national = national.substring(trunk.length);
      }
      return _validate(national, country);
    }
    return const PhoneInvalid(PhoneError.unknownCountry);
  }

  static PhoneParseResult _local(String digits, FpCountry country) {
    var national = digits;
    final trunk = country.trunkPrefix;
    if (digits.startsWith(country.dialCode) && _fitsLength(digits.substring(country.dialCode.length), country)) {
      national = digits.substring(country.dialCode.length);
    } else if (trunk != null && digits.startsWith(trunk) && _fitsLength(digits.substring(trunk.length), country)) {
      national = digits.substring(trunk.length);
    }
    return _validate(national, country);
  }

  // Prefix stripping is decided by length alone; the mobile pattern is checked once, at the end,
  // so a landline like 020 7946 0123 reports "not a mobile" rather than "too long".
  static bool _fitsLength(String national, FpCountry c) =>
      national.length >= c.minLength && national.length <= c.maxLength;

  static PhoneParseResult _validate(String national, FpCountry c) {
    if (national.length < c.minLength) return const PhoneInvalid(PhoneError.tooShort);
    if (national.length > c.maxLength) return const PhoneInvalid(PhoneError.tooLong);
    if (!_patterns[c.iso]!.hasMatch(national)) return PhoneInvalid(PhoneError.notMobile, country: c);
    return PhoneValid(PhoneNumber(country: c, national: national));
  }

  /// Groups digits for display and as-you-type formatting, e.g. `98765 43210`.
  static String formatNational(String digits, FpCountry c) {
    final out = StringBuffer();
    var i = 0;
    for (final size in c.groups) {
      if (i >= digits.length) break;
      if (out.isNotEmpty) out.write(' ');
      final end = (i + size).clamp(0, digits.length);
      out.write(digits.substring(i, end));
      i = end;
    }
    if (i < digits.length) out.write(digits.substring(i));
    return out.toString();
  }
}

class PhoneNumber {
  const PhoneNumber({required this.country, required this.national});

  final FpCountry country;
  final String national;

  String get e164 => '+${country.dialCode}$national';

  /// `+91 98765 43210`
  String get display => '+${country.dialCode} ${PhoneNormalizer.formatNational(national, country)}';
}

enum PhoneError {
  empty('empty'),
  invalidCharacters('invalid-characters'),
  unknownCountry('unknown-country'),
  tooShort('too-short'),
  tooLong('too-long'),
  notMobile('not-mobile');

  const PhoneError(this.code);

  /// Matches the error codes in shared/phone-vectors.json.
  final String code;
}

sealed class PhoneParseResult {
  const PhoneParseResult();
}

final class PhoneValid extends PhoneParseResult {
  const PhoneValid(this.number);
  final PhoneNumber number;
}

final class PhoneInvalid extends PhoneParseResult {
  const PhoneInvalid(this.error, {this.country});
  final PhoneError error;
  final FpCountry? country;

  /// Inline error copy (design-system.md §9).
  String get message => switch (error) {
        PhoneError.empty => 'Enter your mobile number.',
        PhoneError.invalidCharacters => 'Use digits only, for example 98765 43210.',
        PhoneError.unknownCountry => "That country code isn't supported yet.",
        PhoneError.tooShort => 'That number is too short.',
        PhoneError.tooLong => 'That number is too long.',
        PhoneError.notMobile => country == null
            ? "That isn't a valid mobile number."
            : "That isn't a valid mobile number for ${country!.name}.",
      };
}
