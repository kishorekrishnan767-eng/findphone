import 'package:findphone/features/tracking/domain/location_fix.dart';
import 'package:findphone/features/tracking/domain/sync_policy.dart';
import 'package:findphone/features/tracking/domain/tracking_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const policy = SyncPolicy(TrackingConfig.defaults);
  final t0 = DateTime(2026, 10, 8, 12);

  LocationFix fix({double lat = 12.9716, double lng = 77.5946, double accuracy = 12, Duration after = Duration.zero}) =>
      LocationFix(latitude: lat, longitude: lng, accuracy: accuracy, timestamp: t0.add(after));

  WrittenFix written({int? battery = 60}) => WrittenFix(fix: fix(), battery: battery, writtenAt: t0);

  WriteReason? eval(LocationFix f, {int? battery = 60, Duration after = const Duration(seconds: 15), TrackingMode mode = TrackingMode.foreground, WrittenFix? last}) =>
      policy.evaluate(last: last ?? written(), fix: f, battery: battery, now: t0.add(after), mode: mode);

  test('first reading of a session is always written', () {
    expect(policy.evaluate(last: null, fix: fix(), battery: 50, now: t0, mode: TrackingMode.foreground), WriteReason.first);
  });

  test('staying put within the heartbeat is skipped', () {
    expect(eval(fix(lat: 12.97161)), isNull); // ~1 m
  });

  test('moving 25 m or more is written', () {
    expect(eval(fix(lat: 12.9716 + 0.00025)), WriteReason.moved); // ~28 m north
    expect(eval(fix(lat: 12.9716 + 0.00020)), isNull); // ~22 m
  });

  test('a much better accuracy is written', () {
    final coarse = WrittenFix(fix: fix(accuracy: 80), battery: 60, writtenAt: t0);
    expect(eval(fix(accuracy: 10), last: coarse), WriteReason.accuracyImproved);
    // Halved but by less than 20 m: not worth a write.
    expect(eval(fix(accuracy: 8), last: WrittenFix(fix: fix(accuracy: 20), battery: 60, writtenAt: t0)), isNull);
  });

  test('a battery change of 5 points is written', () {
    expect(eval(fix(), battery: 55), WriteReason.battery);
    expect(eval(fix(), battery: 57), isNull);
    expect(eval(fix(), battery: null), isNull);
  });

  test('heartbeat: 60 s in the foreground, 300 s in the background', () {
    expect(eval(fix(), after: const Duration(seconds: 59)), isNull);
    expect(eval(fix(), after: const Duration(seconds: 60)), WriteReason.heartbeat);
    expect(eval(fix(), after: const Duration(seconds: 120), mode: TrackingMode.background), isNull);
    expect(eval(fix(), after: const Duration(seconds: 300), mode: TrackingMode.background), WriteReason.heartbeat);
  });

  test('foreground heartbeat stays inside the 120 s Live window', () {
    expect(TrackingConfig.defaults.foregroundHeartbeat, lessThan(const Duration(seconds: 120)));
  });

  test('haversine distance is in metres', () {
    final a = fix();
    final b = fix(lat: 12.9716 + 0.001); // ~111 m
    expect(a.distanceTo(b), closeTo(111.2, 0.5));
  });
}
