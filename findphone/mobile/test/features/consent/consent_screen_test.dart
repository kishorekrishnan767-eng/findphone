import 'package:findphone/core/di/providers.dart';
import 'package:findphone/design_system/theme/app_theme.dart';
import 'package:findphone/features/consent/presentation/consent_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('consent requires the explicit opt-in before continuing, and stores it', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: MaterialApp(theme: AppTheme.light(), home: const ConsentScreen()),
      ),
    );

    // The exact statement from the brief is shown.
    expect(find.text(consentStatement), findsOneWidget);

    final button = find.widgetWithText(TextButton, 'Agree and continue');
    expect(tester.widget<TextButton>(button).onPressed, isNull, reason: 'disabled until ticked');

    await tester.ensureVisible(find.text(consentStatement));
    await tester.tap(find.text(consentStatement));
    await tester.pump();
    expect(tester.widget<TextButton>(button).onPressed, isNotNull);

    await tester.ensureVisible(button);
    await tester.tap(button);
    await tester.pump();
    expect(prefs.getString('consent_terms_version'), isNotNull);
    expect(prefs.getInt('consent_accepted_at'), isNotNull);
  });
}
