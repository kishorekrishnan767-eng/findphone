import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/di/providers.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/theme/app_theme.dart';

class _Page {
  const _Page(this.icon, this.title, this.body, [this.points = const []]);
  final IconData icon;
  final String title;
  final String body;
  final List<(IconData, String)> points;
}

const _pages = [
  _Page(
    LucideIcons.smartphone,
    'Find this phone from any browser',
    'If you lose this phone, someone you trust can open the FindPhone website, enter your number and see where it is.',
  ),
  _Page(
    LucideIcons.shieldCheck,
    "You decide when it's shared",
    'A notification stays visible while sharing is on. Pause it in one tap, or delete everything from the app.',
  ),
  _Page(
    LucideIcons.mapPin,
    'What gets shared',
    'Only the latest values are kept, never a history.',
    [
      (LucideIcons.locateFixed, 'Location and how accurate it is'),
      (LucideIcons.batteryMedium, 'Battery level'),
      (LucideIcons.smartphone, 'Phone model and your name'),
      (LucideIcons.eyeOff, 'Never shared: contacts, messages, photos, call history'),
    ],
  ),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() => ref.read(localStoreProvider).setOnboardingSeen();

  void _next() {
    if (_index == _pages.length - 1) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: context.reduceMotion ? const Duration(milliseconds: 1) : FpMotion.slow,
      curve: FpMotion.standard,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.all(FpSpace.s2),
                child: _index < _pages.length - 1
                    ? FpButton.ghost(label: 'Skip', onPressed: _finish)
                    : const SizedBox(height: FpSize.controlMd),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) => _OnboardingPage(page: _pages[i]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(FpSpace.s4),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: FpSize.contentMaxWidth),
                child: Column(
                  children: [
                    Semantics(
                      label: 'Page ${_index + 1} of ${_pages.length}',
                      excludeSemantics: true,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (var i = 0; i < _pages.length; i++)
                            AnimatedContainer(
                              duration: FpMotion.fast,
                              margin: const EdgeInsets.symmetric(horizontal: FpSpace.s1),
                              width: i == _index ? 16 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: i == _index ? c.accentDefault : c.borderDefault,
                                borderRadius: FpCorners.full,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: FpSpace.s4),
                    FpButton(label: 'Continue', onPressed: _next, expand: true),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({required this.page});
  final _Page page;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: FpSpace.s4),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: FpSize.contentMaxWidth),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: FpSpace.s10),
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: c.accentSubtle, borderRadius: FpCorners.md),
                child: Icon(page.icon, size: FpSize.iconLg, color: c.accentOnSubtle),
              ),
              const SizedBox(height: FpSpace.s6),
              Semantics(
                header: true,
                child: Text(page.title, style: FpText.display.copyWith(color: c.textPrimary)),
              ),
              const SizedBox(height: FpSpace.s3),
              Text(page.body, style: FpText.bodyLg.copyWith(color: c.textSecondary)),
              if (page.points.isNotEmpty) ...[
                const SizedBox(height: FpSpace.s6),
                for (final (icon, text) in page.points)
                  Padding(
                    padding: const EdgeInsets.only(bottom: FpSpace.s3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(icon, size: FpSize.iconMd, color: c.textSecondary),
                        ),
                        const SizedBox(width: FpSpace.s3),
                        Expanded(child: Text(text, style: FpText.bodyLg.copyWith(color: c.textPrimary))),
                      ],
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
