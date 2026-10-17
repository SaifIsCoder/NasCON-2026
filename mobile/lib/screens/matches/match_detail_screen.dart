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

/// Match Detail Screen - Development Placeholder for Phase 1.
class MatchDetailScreen extends StatelessWidget {
  const MatchDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Match Details',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Match Summary & Events',
            subtitle: 'Event-sourced match timeline and live scoring',
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
                      label: 'Scheduled',
                      type: StatusBadgeType.information,
                      icon: Icons.event_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1 Placeholder',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Fixture Projection',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'In Phase 2, this screen will render the live match state rebuilt from the signed append-only event stream (goals, runs, points, fouls, and penalties).',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Open Scoring Console',
                  variant: PrimaryButtonVariant.primary,
                  leadingIcon: const Icon(
                    Icons.sports_score_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(
                      AppConstants.routeScoringEntry,
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
