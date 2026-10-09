import 'package:battery_plus/battery_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceDetails {
  const DeviceDetails({required this.platform, required this.model, required this.manufacturer});

  /// `android` or `ios` (the values the rules accept).
  final String platform;

  /// Human-readable model, ≤ 60 chars, e.g. "Pixel 7a" or "Samsung SM-S911B".
  final String model;

  /// Lowercase manufacturer, used to pick battery-optimisation guidance.
  final String manufacturer;
}

/// Platform, model and battery: the non-location fields of a write.
class DeviceSnapshotSource {
  DeviceSnapshotSource({DeviceInfoPlugin? info, Battery? battery})
      : _info = info ?? DeviceInfoPlugin(),
        _battery = battery ?? Battery();

  final DeviceInfoPlugin _info;
  final Battery _battery;
  DeviceDetails? _cached;

  Future<DeviceDetails> details() async {
    if (_cached != null) return _cached!;
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      final ios = await _info.iosInfo;
      return _cached = DeviceDetails(platform: 'ios', model: _clip(ios.modelName), manufacturer: 'apple');
    }
    final a = await _info.androidInfo;
    final brand = a.manufacturer.trim();
    final model = a.model.trim();
    final label = model.toLowerCase().startsWith(brand.toLowerCase()) || brand.isEmpty
        ? model
        : '${brand[0].toUpperCase()}${brand.substring(1)} $model';
    return _cached = DeviceDetails(
      platform: 'android',
      model: _clip(label.isEmpty ? 'Android phone' : label),
      manufacturer: brand.toLowerCase(),
    );
  }

  /// 0–100, or null where the OS doesn't report it (some emulators).
  Future<int?> batteryLevel() async {
    try {
      final level = await _battery.batteryLevel;
      return (level >= 0 && level <= 100) ? level : null;
    } catch (_) {
      return null;
    }
  }

  static String _clip(String s) => s.length <= 60 ? s : s.substring(0, 60);
}
