import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';

/// Material theme assembled from design tokens (shared/design-tokens.json). Components read
/// colours through `context.fp` rather than the Material ColorScheme, which only exists so
/// built-in widgets (dialogs, selection handles, scrollbars) also look right.
abstract final class AppTheme {
  static ThemeData light() => _build(Brightness.light, fpLightColors, fpLightShadows);
  static ThemeData dark() => _build(Brightness.dark, fpDarkColors, fpDarkShadows);

  static ThemeData _build(Brightness brightness, FpColors c, FpShadows s) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.accentDefault,
      onPrimary: c.textOnAccent,
      primaryContainer: c.accentSubtle,
      onPrimaryContainer: c.accentOnSubtle,
      secondary: c.accentDefault,
      onSecondary: c.textOnAccent,
      error: c.destructiveText,
      onError: c.destructiveOnDefault,
      surface: c.bgSurface,
      onSurface: c.textPrimary,
      onSurfaceVariant: c.textSecondary,
      surfaceContainerHighest: c.bgSubtle,
      outline: c.borderControl,
      outlineVariant: c.borderDefault,
      inverseSurface: c.bgInverse,
      onInverseSurface: c.textOnInverse,
      scrim: c.overlayScrim,
      shadow: const Color(0xFF000000),
    );

    final text = const TextTheme(
      displaySmall: FpText.display,
      headlineSmall: FpText.titleLg,
      titleLarge: FpText.title,
      titleMedium: FpText.titleSm,
      bodyLarge: FpText.bodyLg,
      bodyMedium: FpText.body,
      bodySmall: FpText.caption,
      labelLarge: FpText.label,
      labelMedium: FpText.labelSm,
      labelSmall: FpText.caption,
    ).apply(bodyColor: c.textPrimary, displayColor: c.textPrimary);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: 'Inter',
      textTheme: text,
      scaffoldBackgroundColor: c.bgCanvas,
      splashFactory: InkRipple.splashFactory,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      extensions: [c, s],
      appBarTheme: AppBarTheme(
        backgroundColor: c.bgCanvas,
        foregroundColor: c.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: FpText.titleSm.copyWith(color: c.textPrimary),
      ),
      dividerTheme: DividerThemeData(color: c.borderSubtle, thickness: 1, space: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.bgInverse,
        contentTextStyle: FpText.body.copyWith(color: c.textOnInverse),
        actionTextColor: c.textOnInverse,
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: FpCorners.md),
        elevation: 0,
        insetPadding: const EdgeInsets.all(FpSpace.s4),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? c.accentDefault : Colors.transparent,
        ),
        checkColor: WidgetStatePropertyAll(c.textOnAccent),
        side: BorderSide(color: c.borderControl, width: 1.5),
        shape: const RoundedRectangleBorder(borderRadius: FpCorners.xs),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.bgRaised,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: FpCorners.lg),
        titleTextStyle: FpText.titleSm.copyWith(color: c.textPrimary),
        contentTextStyle: FpText.body.copyWith(color: c.textSecondary),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.bgRaised,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: c.bgRaised,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(FpRadius.lg)),
        ),
        showDragHandle: true,
        dragHandleColor: c.borderDefault,
        dragHandleSize: const Size(32, 4),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.accentDefault),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: c.accentDefault,
        selectionHandleColor: c.accentDefault,
        selectionColor: c.accentDefault.withValues(alpha: 0.24),
      ),
      expansionTileTheme: ExpansionTileThemeData(
        iconColor: c.textSecondary,
        collapsedIconColor: c.textSecondary,
        textColor: c.textPrimary,
        collapsedTextColor: c.textPrimary,
        shape: const Border(),
        collapsedShape: const Border(),
        tilePadding: EdgeInsets.zero,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }
}

extension FpThemeContext on BuildContext {
  FpColors get fp => Theme.of(this).extension<FpColors>()!;
  FpShadows get fpShadows => Theme.of(this).extension<FpShadows>()!;

  /// True when the OS asks for reduced motion.
  bool get reduceMotion => MediaQuery.maybeDisableAnimationsOf(this) ?? false;
}
