import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Left-aligned: 24 px icon in a 40 px subtle square, title, up to two lines, one action.
class FpEmptyState extends StatelessWidget {
  const FpEmptyState({super.key, required this.icon, required this.title, required this.body, this.action});

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: c.bgSubtle, borderRadius: FpCorners.md),
          child: Icon(icon, size: FpSize.iconLg, color: c.textSecondary),
        ),
        const SizedBox(height: FpSpace.s3),
        Semantics(header: true, child: Text(title, style: FpText.titleSm.copyWith(color: c.textPrimary))),
        const SizedBox(height: FpSpace.s1),
        Text(body, style: FpText.body.copyWith(color: c.textSecondary)),
        if (action != null) ...[const SizedBox(height: FpSpace.s4), action!],
      ],
    );
  }
}
