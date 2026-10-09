import 'dart:math' as math;

/// One position reading. Pure Dart so the sync policy can be unit tested without plugins.
class LocationFix {
  const LocationFix({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.timestamp,
  });

  final double latitude;
  final double longitude;

  /// Horizontal accuracy radius in metres.
  final double accuracy;

  /// When the device took the reading (device clock).
  final DateTime timestamp;

  /// Great-circle distance in metres (haversine).
  double distanceTo(LocationFix other) {
    const earthRadius = 6371000.0;
    double rad(double deg) => deg * math.pi / 180;
    final dLat = rad(other.latitude - latitude);
    final dLng = rad(other.longitude - longitude);
    final a = math.pow(math.sin(dLat / 2), 2) +
        math.cos(rad(latitude)) * math.cos(rad(other.latitude)) * math.pow(math.sin(dLng / 2), 2);
    return 2 * earthRadius * math.asin(math.sqrt(a.toDouble()));
  }
}
