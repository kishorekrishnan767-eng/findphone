import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

enum FpBannerKind { neutral, warning, error }

/// Slim notice. Neutral for demo/info, warning for offline/stale, error for failures.
/// Never uses the accent colour.
class FpBanner extends StatelessWidget {
  const FpBanner({
    super.key,
    required this.icon,
    required this.text,
    this.kind = FpBannerKind.neutral,
    this.action,
  });

  final IconData icon;
  final String text;
  final FpBannerKind kind;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final (fg, bg) = switch (kind) {
      FpBannerKind.neutral => (c.statusPausedFg, c.statusPausedBg),
      FpBannerKind.warning => (c.statusStaleFg, c.statusStaleBg),
      FpBannerKind.error => (c.statusDangerFg, c.statusDangerBg),
    };
    return Semantics(
      liveRegion: kind != FpBannerKind.neutral,
      container: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 32),
        padding: const EdgeInsets.symmetric(horizontal: FpSpace.s3, vertical: FpSpace.s2),
        decoration: BoxDecoration(color: bg, borderRadius: FpCorners.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Icon(icon, size: FpSize.iconSm, color: fg),
            ),
            const SizedBox(width: FpSpace.s2),
            Expanded(child: Text(text, style: FpText.labelSm.copyWith(color: fg))),
            if (action != null) ...[const SizedBox(width: FpSpace.s2), action!],
          ],
        ),
      ),
    );
  }
}
