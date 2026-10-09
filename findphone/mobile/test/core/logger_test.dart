import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:findphone/core/logging/logger.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late List<String> lines;
  late DebugPrintCallback original;

  setUp(() {
    lines = [];
    original = debugPrint;
    debugPrint = (String? message, {int? wrapWidth}) => lines.add(message ?? '');
  });
  tearDown(() => debugPrint = original);

  test('names, numbers and coordinates are never printed', () {
    Log.info('test.pii', {
      'name': 'Asha Rao',
      'phone': '+919876543210',
      'location': const GeoPoint(12.9716, 77.5946),
      'note': 'lives at 12 MG Road',
    });
    final out = lines.join('\n');
    expect(out, isNot(contains('Asha')));
    expect(out, isNot(contains('9876543210')));
    expect(out, isNot(contains('12.97')));
    expect(out, isNot(contains('MG Road')));
    expect('<redacted>'.allMatches(out).length, 4);
  });

  test('codes, numbers, booleans and durations are printed', () {
    Log.info('test.safe', {'code': 'permission-denied', 'attempt': 3, 'debug': true, 'wait': const Duration(seconds: 2)});
    expect(lines.single, contains('code=permission-denied'));
    expect(lines.single, contains('attempt=3'));
    expect(lines.single, contains('debug=true'));
    expect(lines.single, contains('wait=2000ms'));
  });

  test('Firestore errors log type and code only, never the message (it contains the document path)', () {
    Log.error(
      'test.error',
      FirebaseException(
        plugin: 'cloud_firestore',
        code: 'not-found',
        message: 'No document to update: projects/p/databases/(default)/documents/locations/+919876543210',
      ),
    );
    expect(lines.single, contains('code=not-found'));
    expect(lines.single, isNot(contains('9876543210')));
  });
}
