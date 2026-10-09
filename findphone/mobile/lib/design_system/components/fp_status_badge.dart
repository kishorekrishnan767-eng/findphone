import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

enum FpStatus { live, stale, paused, error }

/// Dot + words, never colour alone. The live dot pulses unless reduced motion is on.
class FpStatusBadge extends StatelessWidget {
  const FpStatusBadge({super.key, required this.status, required this.label});

  final FpStatus status;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    final (fg, bg, dot) = switch (status) {
      FpStatus.live => (c.statusLiveFg, c.statusLiveBg, c.statusLiveDot),
      FpStatus.stale => (c.statusStaleFg, c.statusStaleBg, c.statusStaleDot),
      FpStatus.paused => (c.statusPausedFg, c.statusPausedBg, c.statusPausedDot),
      FpStatus.error => (c.statusDangerFg, c.statusDangerBg, c.statusDangerDot),
    };

    return Semantics(
      label: label,
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: FpMotion.fast,
        curve: FpMotion.standard,
        height: 24,
        padding: const EdgeInsets.symmetric(horizontal: FpSpace.s2),
        decoration: BoxDecoration(color: bg, borderRadius: FpCorners.xs),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Dot(color: dot, pulse: status == FpStatus.live && !context.reduceMotion),
            const SizedBox(width: FpSpace.s2),
            Text(label, style: FpText.labelSm.copyWith(color: fg)),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatefulWidget {
  const _Dot({required this.color, required this.pulse});
  final Color color;
  final bool pulse;

  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: FpMotion.pulse);

  @override
  void initState() {
    super.initState();
    if (widget.pulse) _c.repeat();
  }

  @override
  void didUpdateWidget(_Dot old) {
    super.didUpdateWidget(old);
    if (widget.pulse && !_c.isAnimating) _c.repeat();
    if (!widget.pulse && _c.isAnimating) _c.reset();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 8,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => CustomPaint(painter: _DotPainter(widget.color, widget.pulse ? _c.value : 0)),
      ),
    );
  }
}

class _DotPainter extends CustomPainter {
  _DotPainter(this.color, this.t);
  final Color color;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    if (t > 0) {
      canvas.drawCircle(
        center,
        4 + 4 * t,
        Paint()..color = color.withValues(alpha: 0.35 * (1 - t)),
      );
    }
    canvas.drawCircle(center, 4, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_DotPainter old) => old.t != t || old.color != color;
}
