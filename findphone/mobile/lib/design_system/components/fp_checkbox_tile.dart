import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import '../theme/app_theme.dart';

/// The whole row toggles the checkbox; at least 44 px tall.
class FpCheckboxTile extends StatelessWidget {
  const FpCheckboxTile({super.key, required this.value, required this.onChanged, required this.label});

  final bool value;
  final ValueChanged<bool> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return MergeSemantics(
      child: InkWell(
        borderRadius: FpCorners.md,
        onTap: () => onChanged(!value),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: FpSize.touchTarget),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: FpSpace.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox.square(
                  dimension: 24,
                  child: Checkbox(
                    value: value,
                    onChanged: (v) => onChanged(v ?? false),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
                const SizedBox(width: FpSpace.s3),
                Expanded(child: Text(label, style: FpText.bodyLg.copyWith(color: c.textPrimary))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
