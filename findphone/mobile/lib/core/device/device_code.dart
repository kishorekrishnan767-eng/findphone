import 'dart:math';

import '../crypto/claim_chain.dart';

/// Short ID shown on the phone and on the web result card so a tester can match them by eye.
/// Not unique and not secret: `FP-` + 4 Crockford base32 characters (~1M combinations).
abstract final class DeviceCode {
  static final pattern = RegExp(r'^FP-[0-9A-HJKMNP-TV-Z]{4}$');

  static String generate([Random? random]) {
    final rng = random ?? Random.secure();
    final chars = List.generate(4, (_) => ClaimChain.alphabet[rng.nextInt(32)]).join();
    return 'FP-$chars';
  }
}
