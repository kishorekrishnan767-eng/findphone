import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Rows grouped on a subtle block, divided by hairlines.
class FpInfoGroup extends StatelessWidget {
  const FpInfoGroup({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return DecoratedBox(
      decoration: BoxDecoration(color: c.bgSubtle, borderRadius: FpCorners.md),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(height: 1, indent: FpSpace.s3, endIndent: FpSpace.s3, color: c.borderSubtle),
            children[i],
          ],
        ],
      ),
    );
  }
}

/// Label (caption, tertiary) and value (body or mono). A row with [onTap] gets a chevron and is
/// announced as a button; a [tone] of warning/error colours the value.
class FpInfoRow extends StatelessWidget {
  const FpInfoRow({
    super.key,
    required this.label,
    required this.value,
    this.mono = false,
    this.leading,
    this.trailing,
    this.onTap,
    this.tone = FpTone.neutral,
  });

  final String label;
  final String value;
  final bool mono;
  final IconData? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final FpTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final valueColor = switch (tone) {
      FpTone.neutral => c.textPrimary,
      FpTone.good => c.statusLiveFg,
      FpTone.warning => c.statusStaleFg,
      FpTone.error => c.statusDangerFg,
    };
    final valueStyle = (mono ? FpText.mono : FpText.body).copyWith(color: valueColor);

    final row = ConstrainedBox(
      constraints: const BoxConstraints(minHeight: FpSize.touchTarget),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: FpSpace.s3, vertical: FpSpace.s2),
        child: Row(
          children: [
            if (leading != null) ...[
              Icon(leading, size: FpSize.iconSm, color: c.textTertiary),
              const SizedBox(width: FpSpace.s2),
            ],
            SizedBox(
              width: 112,
              child: Text(label, style: FpText.caption.copyWith(color: c.textTertiary)),
            ),
            Expanded(child: Text(value, style: valueStyle)),
            ?trailing,
          ],
        ),
      ),
    );

    return Semantics(
      label: '$label: $value',
      button: onTap != null,
      excludeSemantics: trailing == null,
      child: onTap == null ? row : InkWell(onTap: onTap, borderRadius: FpCorners.md, child: row),
    );
  }
}

enum FpTone { neutral, good, warning, error }
