import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../data/registration_repository.dart';

final registrationRepositoryProvider = Provider<RegistrationRepository>(
  (ref) => RegistrationRepository(
    db: ref.watch(firestoreProvider),
    auth: ref.watch(authServiceProvider),
    store: ref.watch(localStoreProvider),
    secure: ref.watch(secureStoreProvider),
    device: ref.watch(deviceSnapshotProvider),
  ),
);

final recoveryCodeProvider = FutureProvider.autoDispose<String?>(
  (ref) => ref.watch(registrationRepositoryProvider).recoveryCode(),
);
