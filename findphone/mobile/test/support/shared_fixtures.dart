import 'dart:convert';
import 'dart:io';

/// Loads a JSON file from the repo-level `shared/` folder. `flutter test` runs with the package
/// root (mobile/) as the working directory.
Map<String, dynamic> loadShared(String name) {
  final file = File('../shared/$name');
  if (!file.existsSync()) {
    throw StateError('Missing ../shared/$name. Run tests from mobile/ inside the monorepo.');
  }
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}
