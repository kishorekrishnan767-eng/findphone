import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// Placeholder block shaped like the content it stands in for. Opacity pulses 0.6 → 1 over
/// 1.2 s; static under reduced motion. Hidden from screen readers.
class FpSkeleton extends StatefulWidget {
  const FpSkeleton({super.key, this.width, this.height = 16});

  final double? width;
  final double height;

  @override
  State<FpSkeleton> createState() => _FpSkeletonState();
}

class _FpSkeletonState extends State<FpSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
    lowerBound: 0.6,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (context.reduceMotion) {
      _c.value = 1;
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: FadeTransition(
        opacity: _c,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(color: context.fp.bgSubtle, borderRadius: FpCorners.xs),
        ),
      ),
    );
  }
}
