/// Settings paths that stop aggressive battery managers from killing the sharing service
/// (design-system.md §8.2). Menu names vary by model and OS version, so these are steps the
/// user follows, never claims the app can verify.
class OemGuidance {
  const OemGuidance({required this.brand, required this.matches, required this.steps});

  /// Shown as "On your {brand} phone".
  final String brand;

  /// Lowercase manufacturer strings from `Build.MANUFACTURER`.
  final List<String> matches;
  final List<String> steps;

  static const all = <OemGuidance>[
    OemGuidance(
      brand: 'Samsung',
      matches: ['samsung'],
      steps: [
        'Settings › Apps › FindPhone › Battery › Unrestricted.',
        'Settings › Battery › Background usage limits › Never sleeping apps › add FindPhone.',
        "Check that FindPhone isn't in Sleeping apps or Deep sleeping apps.",
      ],
    ),
    OemGuidance(
      brand: 'Xiaomi',
      matches: ['xiaomi', 'redmi', 'poco'],
      steps: [
        'Settings › Apps › Manage apps › FindPhone › Autostart › turn on.',
        'Same screen › Battery saver › No restrictions.',
        'Open Recents, long-press FindPhone and tap the lock icon.',
      ],
    ),
    OemGuidance(
      brand: 'Oppo',
      matches: ['oppo', 'oneplus'],
      steps: [
        'Settings › Apps › App management › FindPhone › Battery usage › turn on Allow background activity and Allow auto launch.',
        'Open Recents, tap the menu on FindPhone and choose Lock.',
      ],
    ),
    OemGuidance(
      brand: 'Realme',
      matches: ['realme'],
      steps: [
        'Settings › Apps › App management › FindPhone › Battery usage › turn on Allow background activity and Allow auto launch.',
        'Open Recents, tap the menu on FindPhone and choose Lock.',
      ],
    ),
    OemGuidance(
      brand: 'Vivo',
      matches: ['vivo', 'iqoo'],
      steps: [
        'Settings › Battery › Background power consumption management › FindPhone › Allow.',
        'Settings › Apps › Autostart › turn on FindPhone (older models: i Manager › App manager › Autostart).',
        'Lock FindPhone in Recents.',
      ],
    ),
  ];

  static OemGuidance? forManufacturer(String manufacturer) {
    final m = manufacturer.toLowerCase();
    for (final g in all) {
      if (g.matches.any(m.contains)) return g;
    }
    return null;
  }
}
