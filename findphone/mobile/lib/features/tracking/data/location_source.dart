import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../domain/location_fix.dart';
import '../domain/tracking_config.dart';

/// Thin wrapper over Geolocator so the engine depends on an interface, not a plugin.
abstract interface class LocationSource {
  Stream<LocationFix> watch(TrackingMode mode);
  Future<LocationFix> current();
}

class GeolocatorSource implements LocationSource {
  const GeolocatorSource(this.config);

  final TrackingConfig config;

  @override
  Stream<LocationFix> watch(TrackingMode mode) =>
      Geolocator.getPositionStream(locationSettings: _settings(mode)).map(_toFix);

  @override
  Future<LocationFix> current() => Geolocator.getCurrentPosition(
        locationSettings: _settings(TrackingMode.foreground, timeLimit: const Duration(seconds: 20)),
      ).then(_toFix);

  // The stream runs without a distance filter so heartbeats always carry a fresh fix; the 25 m
  // "meaningful change" rule is applied by SyncPolicy before anything is written.
  LocationSettings _settings(TrackingMode mode, {Duration? timeLimit}) {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 0,
          intervalDuration: config.sampleInterval(mode),
          timeLimit: timeLimit,
        );
      case TargetPlatform.iOS:
        // iOS has no interval; a 10 m filter limits wake-ups and heartbeats refresh the fix.
        return AppleSettings(
          accuracy: mode == TrackingMode.foreground ? LocationAccuracy.best : LocationAccuracy.high,
          distanceFilter: 10,
          activityType: ActivityType.other,
          pauseLocationUpdatesAutomatically: false,
          allowBackgroundLocationUpdates: true,
          showBackgroundLocationIndicator: true,
          timeLimit: timeLimit,
        );
      default:
        return LocationSettings(accuracy: LocationAccuracy.high, timeLimit: timeLimit);
    }
  }

  static LocationFix _toFix(Position p) => LocationFix(
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        timestamp: p.timestamp,
      );
}
