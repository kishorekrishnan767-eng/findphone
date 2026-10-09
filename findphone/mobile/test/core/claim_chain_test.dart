import 'dart:math';

import 'package:findphone/core/crypto/claim_chain.dart';
import 'package:findphone/core/device/device_code.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/shared_fixtures.dart';

void main() {
  final vectors = loadShared('claim-chain-vectors.json');
  final cases = (vectors['cases'] as List).cast<Map<String, dynamic>>();
  final invalid = (vectors['invalidInputs'] as List).cast<Map<String, dynamic>>();

  group('shared/claim-chain-vectors.json', () {
    for (final c in cases) {
      final name = c['name'] as String;
      final canonical = c['canonical'] as String;
      final links = (c['links'] as Map).cast<String, String>();

      test('$name: input variants canonicalise', () {
        for (final v in (c['inputVariants'] as List).cast<String>()) {
          expect(ClaimChain.canonicalise(v), canonical, reason: v);
        }
      });

      test('$name: display form', () {
        expect(ClaimChain.display(canonical), c['displayCode']);
      });

      test('$name: every shipped link matches', () {
        for (final entry in links.entries) {
          final i = int.parse(entry.key.substring(1));
          expect(ClaimChain.link(canonical, i), entry.value, reason: entry.key);
        }
      });

      test('$name: indexOf finds the stored head and the next reclaim link', () {
        expect(ClaimChain.indexOf(canonical, links['h1000']!), 1000);
        expect(ClaimChain.indexOf(canonical, links['h999']!), 999);
        expect(ClaimChain.indexOf(canonical, links['h1']!), 1);
      });

      test('$name: mis-encoded links are not on the chain', () {
        for (final m in (c['misencoded'] as List).cast<Map<String, dynamic>>()) {
          expect(ClaimChain.indexOf(canonical, m['h999'] as String), isNull, reason: m['kind'] as String);
        }
      });
    }

    for (final bad in invalid) {
      test('rejects "${bad['input']}" (${bad['reason']})', () {
        expect(ClaimChain.canonicalise(bad['input'] as String), isNull);
      });
    }
  });

  test('a different code does not match another code\'s chain', () {
    final a = cases[0]['canonical'] as String;
    final bHead = (cases[1]['links'] as Map)['h1000'] as String;
    expect(ClaimChain.indexOf(a, bHead), isNull);
  });

  test('generated codes are canonical and use the Crockford alphabet', () {
    final rng = Random(42);
    for (var i = 0; i < 200; i++) {
      final code = ClaimChain.generateCode(rng);
      expect(code.length, 20);
      expect(ClaimChain.canonicalise(code), code);
    }
  });

  test('device codes match the rules pattern', () {
    final rng = Random(7);
    final rules = RegExp(r'^FP-[0-9A-HJKMNP-TV-Z]{4}$');
    for (var i = 0; i < 200; i++) {
      expect(rules.hasMatch(DeviceCode.generate(rng)), isTrue);
    }
  });
}
