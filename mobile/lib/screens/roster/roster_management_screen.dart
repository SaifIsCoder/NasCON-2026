import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Roster Management Screen - Development Placeholder for Phase 1.
class RosterManagementScreen extends StatelessWidget {
  const RosterManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Roster Management',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Squad Registry & Transfers',
            subtitle: 'Enforce transfer windows, squad caps, and loans',
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
                      label: 'Window Open',
                      type: StatusBadgeType.success,
                      icon: Icons.swap_horiz_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1 Placeholder',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Athlete Registry & Transfer Engine',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Compliant with FR-2.2: Handles athlete registration, loans with automatic return dates, permanent transfers with immutable audit logging, and maximum squad size restrictions.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Back to Clubs',
                  variant: PrimaryButtonVariant.outlined,
                  onPressed: () {
                    Navigator.of(context).maybePop();
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
