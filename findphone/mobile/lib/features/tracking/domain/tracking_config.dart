import '../../../core/config/env.dart';
import '../../../core/logging/logger.dart';

enum TrackingMode { foreground, background }

/// Tracking cadence (architecture §3.4). Values come from `.env`; anything outside its allowed
/// range falls back to the default, with a PII-free warning.
class TrackingConfig {
  const TrackingConfig({
    required this.foregroundInterval,
    required this.foregroundHeartbeat,
    required this.backgroundInterval,
    required this.distanceFilterMeters,
    required this.batteryDelta,
  });

  static const defaults = TrackingConfig(
    foregroundInterval: Duration(seconds: 15),
    foregroundHeartbeat: Duration(seconds: 60),
    backgroundInterval: Duration(seconds: 300),
    distanceFilterMeters: 25,
    batteryDelta: 5,
  );

  factory TrackingConfig.fromEnvironment() {
    int pick(String key, int value, int min, int max, int fallback) {
      if (value >= min && value <= max) return value;
      Log.warn('config.out_of_range', {'key': key.toLowerCase(), 'min': min, 'max': max});
      return fallback;
    }

    return TrackingConfig(
      foregroundInterval: Duration(
        seconds: pick('TRACKING_FG_INTERVAL_SECONDS', Env.trackingFgIntervalSeconds, 5, 60, 15),
      ),
      // Must stay under the web's 120 s Live window, or a still phone would read as "Last seen".
      foregroundHeartbeat: Duration(
        seconds: pick('TRACKING_FG_HEARTBEAT_SECONDS', Env.trackingFgHeartbeatSeconds, 30, 110, 60),
      ),
      backgroundInterval: Duration(
        seconds: pick('TRACKING_BG_INTERVAL_SECONDS', Env.trackingBgIntervalSeconds, 120, 900, 300),
      ),
      distanceFilterMeters: pick(
        'TRACKING_DISTANCE_FILTER_METERS',
        Env.trackingDistanceFilterMeters,
        10,
        200,
        25,
      ).toDouble(),
      batteryDelta: pick('TRACKING_BATTERY_DELTA', Env.trackingBatteryDelta, 1, 20, 5),
    );
  }

  final Duration foregroundInterval;
  final Duration foregroundHeartbeat;
  final Duration backgroundInterval;
  final double distanceFilterMeters;
  final int batteryDelta;

  Duration sampleInterval(TrackingMode mode) =>
      mode == TrackingMode.foreground ? foregroundInterval : backgroundInterval;

  Duration heartbeat(TrackingMode mode) =>
      mode == TrackingMode.foreground ? foregroundHeartbeat : backgroundInterval;
}
