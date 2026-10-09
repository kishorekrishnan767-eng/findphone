import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/env.dart';
import 'core/di/providers.dart';
import 'core/errors/app_failure.dart';
import 'core/firebase/firebase_init.dart';
import 'core/logging/logger.dart';
import 'design_system/components/fp_scaffold.dart';
import 'design_system/theme/app_theme.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Central error handling: everything is logged without PII; nothing crashes the UI silently.
  FlutterError.onError = (details) {
    Log.error('flutter.error', details.exception, details.stack);
    FlutterError.presentError(details);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    Log.error('platform.error', error, stack);
    return true;
  };

  if (!Env.isFirebaseConfigured) {
    runApp(const _ConfigErrorApp());
    return;
  }

  try {
    await initFirebase();
  } catch (e, st) {
    Log.error('bootstrap.firebase', e, st);
    runApp(const _ConfigErrorApp());
    return;
  }

  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(overrides: [sharedPreferencesProvider.overrideWithValue(prefs)]);

  // Sign in early but don't block launch on it: offline launches must still show the app.
  unawaited(
    container.read(authServiceProvider).ensureSignedIn().then<void>(
          (_) {},
          onError: (Object e) => Log.error('bootstrap.sign_in', e),
        ),
  );

  runApp(UncontrolledProviderScope(container: container, child: const FindPhoneApp()));
}

/// Developer-facing: shown when `.env` wasn't passed. Never reached in a correctly built app.
class _ConfigErrorApp extends StatelessWidget {
  const _ConfigErrorApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      debugShowCheckedModeBanner: false,
      home: FpScaffold(
        children: [FpHeading(title: 'Setup needed', body: const NotConfiguredFailure().message)],
      ),
    );
  }
}

