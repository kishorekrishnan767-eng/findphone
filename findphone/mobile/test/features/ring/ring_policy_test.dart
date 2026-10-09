import 'package:findphone/features/ring/domain/ring_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 10, 9, 12);

  bool ring({Duration age = const Duration(seconds: 3), bool acked = false, DateTime? lastHandled}) =>
      RingPolicy.shouldRing(
        requestedAt: now.subtract(age),
        acknowledged: acked,
        lastHandled: lastHandled,
        now: now,
      );

  test('a fresh, unacknowledged request rings', () => expect(ring(), isTrue));

  test('an acknowledged request does not ring again', () => expect(ring(acked: true), isFalse));

  test('a request older than 2 minutes is ignored (phone was offline)', () {
    expect(ring(age: const Duration(minutes: 1, seconds: 59)), isTrue);
    expect(ring(age: const Duration(minutes: 2)), isFalse);
  });

  test('the same request is never handled twice', () {
    final requestedAt = now.subtract(const Duration(seconds: 3));
    expect(ring(lastHandled: requestedAt), isFalse);
    expect(ring(lastHandled: requestedAt.subtract(const Duration(seconds: 1))), isTrue);
  });

  test('a device clock running behind server time still rings', () {
    expect(ring(age: const Duration(minutes: -3)), isTrue); // request appears 3 min "in the future"
    expect(ring(age: const Duration(minutes: -6)), isFalse);
  });
}
