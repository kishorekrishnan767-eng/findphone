import 'package:flutter/material.dart';

import '../../core/generated/tokens.g.dart';
import 'fp_button.dart';

/// One toast at a time; a new one replaces the old. Info 4 s, errors 6 s.
void showFpToast(BuildContext context, String message, {bool isError = false}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Semantics(liveRegion: true, child: Text(message)),
        duration: Duration(seconds: isError ? 6 : 4),
      ),
    );
}

/// Title, one paragraph, Cancel (ghost) then the action. The destructive action is never the
/// default focus.
Future<bool> showFpConfirm(
  BuildContext context, {
  required String title,
  required String body,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actionsPadding: const EdgeInsets.fromLTRB(FpSpace.s4, 0, FpSpace.s4, FpSpace.s4),
      actions: [
        FpButton.ghost(label: 'Cancel', onPressed: () => Navigator.of(context).pop(false)),
        FpButton(
          label: confirmLabel,
          variant: destructive ? FpButtonVariant.destructive : FpButtonVariant.primary,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ],
    ),
  );
  return result ?? false;
}
