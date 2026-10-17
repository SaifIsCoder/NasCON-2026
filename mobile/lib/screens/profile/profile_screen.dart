import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Profile Tab - Development Placeholder for Phase 1.
/// User identity, tenant settings, and RBAC role switching entry point.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'User Profile & Settings',
            subtitle: 'RBAC role access and multi-sport preferences',
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
                      label: 'Development Mode',
                      type: StatusBadgeType.warning,
                      icon: Icons.code_outlined,
                    ),
                    StatusBadge(
                      label: 'RBAC Ready',
                      type: StatusBadgeType.information,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Five-Tier Role Architecture',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Phase 2 will integrate JWT authentication supporting Super-Admin, League Organizer, Club Manager, Player, and General Viewer roles.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Open Authentication Route',
                  variant: PrimaryButtonVariant.primary,
                  leadingIcon: const Icon(
                    Icons.lock_outline,
                    size: AppSpacing.iconSizeMedium,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeLogin);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'Open Sync Queue Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.sync_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeSyncQueue);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'Open Scoring Entry Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.sports_score_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeScoringEntry);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(
            title: 'Design System Verification',
            subtitle: 'Zero purple, zero gradients, zero emojis',
          ),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Color Token Integrity',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Navy: #10283F | Green: #087F65 | Surface: #FFFFFF | Border: #E2E8F0',
                  style: AppTypography.bodySmall,
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: const [
                    StatusBadge(label: 'Success', type: StatusBadgeType.success),
                    StatusBadge(label: 'Warning', type: StatusBadgeType.warning),
                    StatusBadge(label: 'Error', type: StatusBadgeType.error),
                    StatusBadge(label: 'Info', type: StatusBadgeType.information),
                    StatusBadge(label: 'Neutral', type: StatusBadgeType.neutral),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
