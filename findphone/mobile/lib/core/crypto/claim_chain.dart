import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

/// The reclaim hash chain (docs/architecture.md §5.4), pinned by shared/claim-chain-vectors.json
/// and verified against the Firestore rules in the emulator.
///
/// Recovery code: 20 Crockford base32 characters (100 bits). H¹ = sha256(code), Hⁱ⁺¹ = sha256(Hⁱ),
/// each over the UTF-8 bytes of the previous lowercase hex string. Register stores H¹⁰⁰⁰; each
/// reclaim reveals the link one step back.
abstract final class ClaimChain {
  static const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static const codeLength = 20;
  static const length = 1000;

  static final _separators = RegExp(r'[\s-]');

  static String generateCode([Random? random]) {
    final rng = random ?? Random.secure();
    // 32 symbols = 5 bits each, so nextInt(32) is uniform: 20 × 5 = 100 bits.
    return List.generate(codeLength, (_) => alphabet[rng.nextInt(32)]).join();
  }

  /// Uppercases, strips spaces and hyphens, maps O→0 and I/L→1. Returns null if invalid.
  static String? canonicalise(String input) {
    final s = input
        .toUpperCase()
        .replaceAll(_separators, '')
        .replaceAll('O', '0')
        .replaceAll(RegExp('[IL]'), '1');
    if (s.length != codeLength) return null;
    for (final ch in s.split('')) {
      if (!alphabet.contains(ch)) return null;
    }
    return s;
  }

  /// `XXXXX-XXXXX-XXXXX-XXXXX`
  static String display(String canonical) => [
        for (var i = 0; i < canonical.length; i += 5) canonical.substring(i, min(i + 5, canonical.length)),
      ].join('-');

  static String hash(String input) => sha256.convert(utf8.encode(input)).toString();

  /// Hⁱ for 1 ≤ i ≤ [length].
  static String link(String canonical, int i) {
    RangeError.checkValueInInterval(i, 1, length, 'i');
    var h = hash(canonical);
    for (var k = 1; k < i; k++) {
      h = hash(h);
    }
    return h;
  }

  /// The i such that Hⁱ == [stored], or null if this code didn't produce it.
  static int? indexOf(String canonical, String stored) {
    var h = hash(canonical);
    for (var i = 1; i <= length; i++) {
      if (h == stored) return i;
      h = hash(h);
    }
    return null;
  }
}
