import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

import '../domain/permission_health.dart';

/// Reads and requests permissions. Location state comes from Geolocator (it knows about
/// approximate location and service status); notification and battery state from
/// permission_handler.
class PermissionService {
  const PermissionService();

  bool get _android => defaultTargetPlatform == TargetPlatform.android;

  Future<PermissionHealth> check() async {
    final services = await Geolocator.isLocationServiceEnabled();
    final location = _map(await Geolocator.checkPermission());
    var precise = true;
    if (location == LocationAccess.whileInUse || location == LocationAccess.always) {
      precise = await Geolocator.getLocationAccuracy() == LocationAccuracyStatus.precise;
    }
    final notifications = await ph.Permission.notification.status;
    final battery = _android ? await ph.Permission.ignoreBatteryOptimizations.status : ph.PermissionStatus.granted;
    return PermissionHealth(
      servicesEnabled: services,
      location: location,
      precise: precise,
      notifications: notifications.isGranted || notifications.isLimited || notifications.isProvisional,
      batteryUnrestricted: battery.isGranted,
    );
  }

  /// Shows the system "While using the app" prompt.
  Future<LocationAccess> requestLocation() async => _map(await Geolocator.requestPermission());

  /// Android 11+ can't prompt for "Allow all the time"; this opens the app's location settings
  /// page. iOS shows the upgrade prompt.
  Future<void> requestAlways() async {
    await ph.Permission.locationAlways.request();
  }

  Future<bool> requestNotifications() async => (await ph.Permission.notification.request()).isGranted;

  Future<bool> requestBatteryExemption() async =>
      (await ph.Permission.ignoreBatteryOptimizations.request()).isGranted;

  Future<bool> openAppSettings() => ph.openAppSettings();

  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  static LocationAccess _map(LocationPermission p) => switch (p) {
        LocationPermission.always => LocationAccess.always,
        LocationPermission.whileInUse => LocationAccess.whileInUse,
        LocationPermission.deniedForever => LocationAccess.deniedForever,
        LocationPermission.denied || LocationPermission.unableToDetermine => LocationAccess.denied,
      };
}
