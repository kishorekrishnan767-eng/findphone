import 'location_fix.dart';
import 'tracking_config.dart';

/// What was last confirmed written to Firestore.
class WrittenFix {
  const WrittenFix({required this.fix, required this.battery, required this.writtenAt});

  final LocationFix fix;
  final int? battery;
  final DateTime writtenAt;
}

enum WriteReason { first, moved, accuracyImproved, battery, heartbeat }

/// Decides whether a new reading is worth a Firestore write (architecture §3.2). Writes cost
/// free-tier quota, so only meaningful changes and the Live-keeping heartbeat get through.
class SyncPolicy {
  const SyncPolicy(this.config);

  final TrackingConfig config;

  /// Returns why the reading should be written, or null to skip it.
  WriteReason? evaluate({
    required WrittenFix? last,
    required LocationFix fix,
    required int? battery,
    required DateTime now,
    required TrackingMode mode,
  }) {
    if (last == null) return WriteReason.first;

    if (fix.distanceTo(last.fix) >= config.distanceFilterMeters) return WriteReason.moved;

    final previous = last.fix.accuracy;
    if (fix.accuracy <= previous * 0.5 && previous - fix.accuracy >= 20) {
      return WriteReason.accuracyImproved;
    }

    if (battery != null && last.battery != null && (battery - last.battery!).abs() >= config.batteryDelta) {
      return WriteReason.battery;
    }

    if (now.difference(last.writtenAt) >= config.heartbeat(mode)) return WriteReason.heartbeat;

    return null;
  }
}
