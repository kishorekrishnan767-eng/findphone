import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

enum FpButtonVariant { primary, secondary, ghost, destructive, destructiveGhost }

/// The one button. 44 px tall, 8 px radius, `label` type. While [loading], the leading icon is
/// replaced by a spinner, the label stays and the width doesn't change.
class FpButton extends StatelessWidget {
  const FpButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = FpButtonVariant.primary,
    this.icon,
    this.loading = false,
    this.expand = false,
  });

  const FpButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = false,
  }) : variant = FpButtonVariant.secondary;

  const FpButton.ghost({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = false,
  }) : variant = FpButtonVariant.ghost;

  final String label;
  final VoidCallback? onPressed;
  final FpButtonVariant variant;
  final IconData? icon;
  final bool loading;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final enabled = onPressed != null && !loading;

    final (Color bg, Color fg, Color hover, Color pressed, BorderSide? border) = switch (variant) {
      FpButtonVariant.primary => (c.accentDefault, c.textOnAccent, c.accentHover, c.accentPressed, null),
      FpButtonVariant.secondary => (
          c.bgSurface,
          c.textPrimary,
          c.bgHover,
          c.bgPressed,
          BorderSide(color: c.borderDefault),
        ),
      FpButtonVariant.ghost => (Colors.transparent, c.textSecondary, c.bgHover, c.bgPressed, null),
      FpButtonVariant.destructive => (
          c.destructiveDefault,
          c.destructiveOnDefault,
          c.destructiveHover,
          c.destructivePressed,
          null,
        ),
      FpButtonVariant.destructiveGhost => (
          Colors.transparent,
          c.destructiveText,
          c.destructiveSubtle,
          c.destructiveSubtle,
          null,
        ),
    };
    final solid = variant == FpButtonVariant.primary || variant == FpButtonVariant.destructive;

    final style = ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(Size(FpSize.touchTarget, FpSize.controlMd)),
      padding: WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: icon != null || loading ? FpSpace.s3 : FpSpace.s4),
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(borderRadius: FpCorners.md, side: border ?? BorderSide.none),
      ),
      textStyle: const WidgetStatePropertyAll(FpText.label),
      elevation: const WidgetStatePropertyAll(0),
      animationDuration: FpMotion.fast,
      backgroundColor: WidgetStateProperty.resolveWith((s) {
        if (s.contains(WidgetState.disabled)) return solid && !loading ? c.bgSubtle : (loading ? bg : Colors.transparent);
        if (s.contains(WidgetState.pressed)) return pressed;
        if (s.contains(WidgetState.hovered)) return hover;
        return bg;
      }),
      foregroundColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.disabled) && !loading ? c.textDisabled : fg,
      ),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      side: WidgetStateProperty.resolveWith((s) {
        if (s.contains(WidgetState.focused)) return BorderSide(color: c.focusRing, width: 2);
        return border;
      }),
    );

    final leading = loading
        ? SizedBox.square(
            dimension: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        : (icon == null ? null : Icon(icon, size: FpSize.iconMd));

    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leading != null) ...[leading, const SizedBox(width: FpSpace.s2)],
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis, maxLines: 2, textAlign: TextAlign.center)),
      ],
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: loading ? '$label, in progress' : null,
      child: SizedBox(
        width: expand ? double.infinity : null,
        child: TextButton(onPressed: enabled ? onPressed : null, style: style, child: child),
      ),
    );
  }
}
