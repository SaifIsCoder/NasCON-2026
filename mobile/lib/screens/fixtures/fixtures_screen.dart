import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Fixtures Tab - Development Placeholder for Phase 1.
/// Multi-sport tournament and match schedules (Round Robin, Swiss, Knockout).
class FixturesScreen extends StatelessWidget {
  const FixturesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'League Fixtures & Schedule',
            subtitle: 'Multi-sport tournament match scheduling',
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
                      label: 'Phase 1 Foundation',
                      type: StatusBadgeType.information,
                      icon: Icons.layers_outlined,
                    ),
                    StatusBadge(
                      label: 'Multi-Sport',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Tournament Match Engine',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'This module will support arbitrary tournament structures including round-robin, Swiss-system, single/double elimination, and conflict detection across Football, Cricket, and Basketball.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'View Sample Match Detail Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.open_in_new_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeMatchDetail);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(
            title: 'Supported Disciplines',
            subtitle: 'Configurable sport taxonomy without UI hardcoding',
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: AppConstants.supportedSports
                .map(
                  (sport) => StatusBadge(
                    label: sport,
                    type: StatusBadgeType.neutral,
                    showDot: true,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}
