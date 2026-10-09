import 'package:findphone/core/generated/countries.g.dart';
import 'package:findphone/core/phone/phone_normalizer.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/shared_fixtures.dart';

void main() {
  final vectors = loadShared('phone-vectors.json');
  final cases = (vectors['cases'] as List).cast<Map<String, dynamic>>();

  group('shared/phone-vectors.json', () {
    for (final c in cases) {
      final input = c['input'] as String;
      final country = c['country'] as String;
      final expected = c['e164'] as String? ?? 'error:${c['error']}';

      test('${country.padRight(2)} ${input.isEmpty ? '(empty)' : '"$input"'} → $expected', () {
        final result = PhoneNormalizer.parse(input, defaultIso: country);
        final actual = switch (result) {
          PhoneValid(:final number) => number.e164,
          PhoneInvalid(:final error) => 'error:${error.code}',
        };
        expect(actual, expected);
      });
    }
  });

  test('every result is a valid Firestore document id per the rules regex', () {
    final rulesId = RegExp(r'^[+][1-9][0-9]{6,14}$');
    for (final c in cases.where((c) => c['e164'] != null)) {
      expect(rulesId.hasMatch(c['e164'] as String), isTrue, reason: c['input'] as String);
    }
  });

  group('country table', () {
    test('every example number is a valid mobile for its own country', () {
      for (final c in kCountries) {
        final result = PhoneNormalizer.parse(c.example, defaultIso: c.iso);
        expect(result, isA<PhoneValid>(), reason: c.iso);
      }
    });

    test('default country exists', () {
      expect(PhoneNormalizer.defaultCountry.iso, kDefaultCountryIso);
    });
  });

  group('formatting', () {
    final india = PhoneNormalizer.countryByIso('IN');

    test('groups national digits as you type', () {
      expect(PhoneNormalizer.formatNational('98765', india), '98765');
      expect(PhoneNormalizer.formatNational('987654', india), '98765 4');
      expect(PhoneNormalizer.formatNational('9876543210', india), '98765 43210');
    });

    test('display form', () {
      final r = PhoneNormalizer.parse('9876543210', defaultIso: 'IN') as PhoneValid;
      expect(r.number.display, '+91 98765 43210');
    });

    test('not-mobile message names the country', () {
      final r = PhoneNormalizer.parse('5876543210', defaultIso: 'IN') as PhoneInvalid;
      expect(r.message, "That isn't a valid mobile number for India.");
    });
  });
}
