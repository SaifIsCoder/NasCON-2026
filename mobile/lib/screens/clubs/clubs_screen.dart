import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Clubs Tab - Development Placeholder for Phase 1.
/// Club portals, home venue details, and roster management access.
class ClubsScreen extends StatelessWidget {
  const ClubsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Clubs & Organizations',
            subtitle: 'Multi-tenant club profiles, staff, and operations',
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
                      icon: Icons.shield_outlined,
                    ),
                    StatusBadge(
                      label: 'Multi-Tenant',
                      type: StatusBadgeType.success,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Club Operations Directory',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Manage registered organizations, venues, coaching staff, and athlete rosters with tenant data isolation.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'View Club Profile Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.business_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeClubProfile);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'View Roster Management Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.groups_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeRosterManagement);
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
