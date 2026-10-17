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

/// Club Profile Screen - Development Placeholder for Phase 1.
class ClubProfileScreen extends StatelessWidget {
  const ClubProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Club Profile',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Organization Identity',
            subtitle: 'Home venue coordinates and coaching directory',
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
                      label: 'Verified Club',
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
                  'Multi-Sport Club Hub',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Will display stadium details, GPS coordinates, registered official kits, coaching staff, and athletic rosters with multi-tenant data boundaries.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Manage Squad Roster',
                  variant: PrimaryButtonVariant.primary,
                  leadingIcon: const Icon(
                    Icons.groups_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(
                      AppConstants.routeRosterManagement,
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
