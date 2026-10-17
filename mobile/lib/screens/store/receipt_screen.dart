import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Receipt Screen - Development Placeholder for Phase 1.
class ReceiptScreen extends StatelessWidget {
  const ReceiptScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Digital Order Receipt',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Cryptographic Order Proof',
            subtitle: 'HMAC-SHA256 digitally signed receipts',
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: const [
                    StatusBadge(
                      label: 'Verified Signature',
                      type: StatusBadgeType.success,
                      icon: Icons.verified_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1 Placeholder',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Digital Receipt Verification',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'In Phase 2, this view will render generated PDF receipts signed with DAY1_SALT HMAC verification for auditability.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Return to Store',
                  variant: PrimaryButtonVariant.outlined,
                  onPressed: () {
                    Navigator.of(context).popUntil(
                      (route) => route.settings.name == AppConstants.routeRoot || route.isFirst,
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
