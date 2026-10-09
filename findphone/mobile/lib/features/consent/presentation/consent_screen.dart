import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../../core/generated/tokens.g.dart';
import '../../../core/models/consent_record.dart';
import '../../../design_system/components/fp_button.dart';
import '../../../design_system/components/fp_checkbox_tile.dart';
import '../../../design_system/components/fp_scaffold.dart';
import '../../../design_system/theme/app_theme.dart';

/// Exact wording required by the brief. Changing it means bumping TERMS_VERSION.
const consentStatement =
    "Anyone who knows my mobile number can see my device's latest location while sharing is on.";

class ConsentScreen extends ConsumerStatefulWidget {
  const ConsentScreen({super.key});

  @override
  ConsumerState<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends ConsumerState<ConsentScreen> {
  bool _agreed = false;

  Future<void> _accept() => ref.read(localStoreProvider).saveConsent(
        ConsentRecord(acceptedAt: DateTime.now(), termsVersion: Env.termsVersion),
      );

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return FpScaffold(
      bottom: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FpButton(label: 'Agree and continue', onPressed: _agreed ? _accept : null, expand: true),
          const SizedBox(height: FpSpace.s2),
          Text(
            'Terms v${Env.termsVersion}. You can withdraw consent at any time by deleting your data in the app.',
            style: FpText.caption.copyWith(color: c.textTertiary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      children: [
        const FpHeading(title: 'Before you turn on sharing'),
        const SizedBox(height: FpSpace.s6),
        const _Point(
          icon: LucideIcons.mapPin,
          title: "What's shared",
          body: "This phone's latest location and its accuracy, battery level, phone model and the name you enter.",
        ),
        const _Point(
          icon: LucideIcons.search,
          title: 'Who can see it',
          body: 'Anyone who enters your mobile number on the FindPhone website, while sharing is on.',
        ),
        const _Point(
          icon: LucideIcons.clock,
          title: "How long it's kept",
          body: 'Only the latest location, never a history. Your record is deleted 7 days after its last update.',
        ),
        const _Point(
          icon: LucideIcons.pause,
          title: 'How to stop',
          body: 'Pause in one tap, which also removes your location. Or delete everything from the app.',
        ),
        if (Env.privacyUrl.isNotEmpty) ...[
          Align(
            alignment: Alignment.centerLeft,
            child: FpButton.ghost(
              label: 'Read the full privacy note',
              icon: LucideIcons.externalLink,
              onPressed: () => launchUrl(Uri.parse(Env.privacyUrl), mode: LaunchMode.externalApplication),
            ),
          ),
        ],
        const SizedBox(height: FpSpace.s4),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: _agreed ? c.accentDefault : c.borderDefault),
            borderRadius: FpCorners.md,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: FpSpace.s3),
            child: FpCheckboxTile(
              value: _agreed,
              onChanged: (v) => setState(() => _agreed = v),
              label: consentStatement,
            ),
          ),
        ),
      ],
    );
  }
}

class _Point extends StatelessWidget {
  const _Point({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final c = context.fp;
    return Padding(
      padding: const EdgeInsets.only(bottom: FpSpace.s5),
      child: MergeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(icon, size: FpSize.iconMd, color: c.textSecondary),
            ),
            const SizedBox(width: FpSpace.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: FpText.titleSm.copyWith(color: c.textPrimary)),
                  const SizedBox(height: FpSpace.s1),
                  Text(body, style: FpText.body.copyWith(color: c.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
