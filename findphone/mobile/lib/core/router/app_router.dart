import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/consent/presentation/consent_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/permissions/presentation/permissions_screen.dart';
import '../../features/registration/presentation/reclaim_screen.dart';
import '../../features/registration/presentation/recovery_code_screen.dart';
import '../../features/registration/presentation/register_screen.dart';
import '../../features/reliability/presentation/reliability_screen.dart';
import '../di/providers.dart';
import '../storage/local_store.dart';
import 'routes.dart';

/// The setup step the user must complete next, or null when setup is finished.
String? requiredSetupStep(LocalStore s) {
  if (!s.onboardingSeen) return Routes.onboarding;
  if (s.consent == null) return Routes.consent;
  if (s.registration == null) return Routes.register;
  if (!s.recoveryCodeAcknowledged) return Routes.recoveryCode;
  if (!s.permissionsDone) return Routes.permissions;
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final store = ref.watch(localStoreProvider);

  return GoRouter(
    initialLocation: Routes.home,
    refreshListenable: store,
    redirect: (context, state) {
      final here = state.matchedLocation;
      final step = requiredSetupStep(store);
      if (step == null) {
        // Set up: Home plus the screens reachable from it.
        const allowed = {Routes.home, Routes.permissions, Routes.reliability};
        return allowed.contains(here) ? null : Routes.home;
      }
      // Reclaim is an alternative to registering.
      if (step == Routes.register && here == Routes.reclaim) return null;
      return here == step ? null : step;
    },
    routes: [
      GoRoute(path: Routes.onboarding, builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: Routes.consent, builder: (_, _) => const ConsentScreen()),
      GoRoute(path: Routes.register, builder: (_, _) => const RegisterScreen()),
      GoRoute(
        path: Routes.reclaim,
        builder: (_, state) => ReclaimScreen(args: state.extra is ReclaimArgs ? state.extra! as ReclaimArgs : null),
      ),
      GoRoute(path: Routes.recoveryCode, builder: (_, _) => const RecoveryCodeScreen()),
      GoRoute(path: Routes.permissions, builder: (_, _) => const PermissionsScreen()),
      GoRoute(path: Routes.reliability, builder: (_, _) => const ReliabilityScreen()),
      GoRoute(path: Routes.home, builder: (_, _) => const HomeScreen()),
    ],
  );
});
