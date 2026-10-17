import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Standings Tab - Development Placeholder for Phase 1.
/// Standings tables, tie-breakers, and playoff qualification matrices.
class StandingsScreen extends StatelessWidget {
  const StandingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Standings & Leaderboards',
            subtitle: 'Automated points calculation with configurable tie-breakers',
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
                      icon: Icons.table_chart_outlined,
                    ),
                    StatusBadge(
                      label: 'Event-Sourced',
                      type: StatusBadgeType.success,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Automated Standings Projection',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Tables and rankings will be projected directly from the backend event stream with support for head-to-head points, goal/run difference, and playoff eligibility thresholds.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                const Divider(),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Configured Tie-Breaker Priority:',
                  style: AppTypography.labelMedium,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '1. Head-to-Head Points\n2. Mini-League Goal / Run Difference\n3. Overall Differential\n4. Fair-Play Conduct Score\n5. Seeded Draw of Lots',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.secondaryText,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
