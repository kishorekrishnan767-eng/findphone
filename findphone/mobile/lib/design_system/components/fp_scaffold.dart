import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Standard screen: optional back bar, scrollable content centred at ≤ 560 px with 16 px edges,
/// and a bottom action area that stays above the keyboard.
class FpScaffold extends StatelessWidget {
  const FpScaffold({
    super.key,
    required this.children,
    this.title,
    this.showBack = false,
    this.onBack,
    this.bottom,
    this.appBarActions,
  });

  final String? title;
  final bool showBack;
  final VoidCallback? onBack;
  final List<Widget> children;
  final Widget? bottom;
  final List<Widget>? appBarActions;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final hasBar = title != null || showBack || appBarActions != null;
    return Scaffold(
      appBar: hasBar
          ? AppBar(
              automaticallyImplyLeading: false,
              leading: showBack
                  ? IconButton(
                      tooltip: 'Back',
                      icon: const Icon(LucideIcons.arrowLeft, size: FpSize.iconMd),
                      onPressed: onBack ?? () => Navigator.of(context).maybePop(),
                    )
                  : null,
              title: title == null ? null : Text(title!),
              actions: appBarActions,
            )
          : null,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(FpSpace.s4, FpSpace.s4, FpSpace.s4, FpSpace.s6),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: FpSize.contentMaxWidth),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
                  ),
                ),
              ),
            ),
            if (bottom != null)
              DecoratedBox(
                decoration: BoxDecoration(
                  color: c.bgCanvas,
                  border: Border(top: BorderSide(color: c.borderSubtle)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(FpSpace.s4),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: FpSize.contentMaxWidth),
                      child: bottom,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Screen heading: `titleLg` plus an optional supporting paragraph.
class FpHeading extends StatelessWidget {
  const FpHeading({super.key, required this.title, this.body});

  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(title, style: FpText.titleLg.copyWith(color: c.textPrimary))),
        if (body != null) ...[
          const SizedBox(height: FpSpace.s2),
          Text(body!, style: FpText.bodyLg.copyWith(color: c.textSecondary)),
        ],
      ],
    );
  }
}
