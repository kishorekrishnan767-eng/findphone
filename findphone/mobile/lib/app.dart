import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'design_system/theme/app_theme.dart';
import 'features/tracking/application/tracking_controller.dart';

class FindPhoneApp extends ConsumerWidget {
  const FindPhoneApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keep the tracking controller alive for the whole app session so it can start sharing and
    // follow foreground/background changes regardless of the visible screen.
    ref.watch(trackingControllerProvider.select((s) => s.snapshot.phase));

    return MaterialApp.router(
      title: 'FindPhone',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
