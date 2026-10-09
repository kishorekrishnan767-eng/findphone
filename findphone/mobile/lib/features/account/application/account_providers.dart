import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';
import '../../tracking/application/tracking_controller.dart';
import '../data/account_repository.dart';

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => AccountRepository(
    db: ref.watch(firestoreProvider),
    auth: ref.watch(authServiceProvider),
    store: ref.watch(localStoreProvider),
    secure: ref.watch(secureStoreProvider),
  ),
);

/// Stop tracking (no further writes), then delete everything.
Future<void> deleteMyData(WidgetRef ref) async {
  await ref.read(trackingControllerProvider.notifier).stopForDeletion();
  await ref.read(accountRepositoryProvider).deleteEverything();
  ref.invalidate(trackingControllerProvider);
}
