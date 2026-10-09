import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Plain surface: 12 px radius, hairline border, e1. No gradients, no tint.
class FpCard extends StatelessWidget {
  const FpCard({super.key, required this.child, this.padding = const EdgeInsets.all(FpSpace.s4)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: c.bgSurface,
        borderRadius: FpCorners.lg,
        border: Border.all(color: c.borderDefault),
        boxShadow: context.fpShadows.e1,
      ),
      child: child,
    );
  }
}

/// A titled group on a screen: `titleSm` heading, 8 px, then content.
class FpSection extends StatelessWidget {
  const FpSection({super.key, required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(title, style: FpText.titleSm.copyWith(color: context.fp.textPrimary)),
        ),
        const SizedBox(height: FpSpace.s2),
        child,
      ],
    );
  }
}
