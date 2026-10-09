enum LocationAccess {
  /// Not granted yet, or denied once (the system dialog can still be shown).
  denied,

  /// "Don't ask again" / denied twice: only Settings can fix it.
  deniedForever,
  whileInUse,
  always,
}

/// Everything the app needs to know about its permissions, read fresh on every resume.
class PermissionHealth {
  const PermissionHealth({
    required this.servicesEnabled,
    required this.location,
    required this.precise,
    required this.notifications,
    required this.batteryUnrestricted,
  });

  final bool servicesEnabled;
  final LocationAccess location;

  /// False when the user chose "Approximate" (Android 12+ / iOS 14+).
  final bool precise;

  /// Android 13+: needed for the "Sharing location" notification to be visible. Always true
  /// where the OS doesn't gate notifications.
  final bool notifications;

  /// Android: FindPhone is excluded from battery optimisation.
  final bool batteryUnrestricted;

  bool get canTrack =>
      servicesEnabled && (location == LocationAccess.whileInUse || location == LocationAccess.always);

  bool get hasAlways => location == LocationAccess.always;
}
