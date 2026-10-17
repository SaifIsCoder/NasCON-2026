import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Scoring Entry Screen - Development Placeholder for Phase 1.
class ScoringEntryScreen extends StatelessWidget {
  const ScoringEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Scoring Console',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Live Match Event Logger',
            subtitle: 'Append-only signed event stream with compensating actions',
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
                      label: 'Event-Sourced',
                      type: StatusBadgeType.information,
                      icon: Icons.history_edu_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1 Placeholder',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Multi-Sport Scoring Models',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Supports 3 distinct scoring models: Event-based (Football goals/fouls), Innings-based (Cricket overs/runs/wickets), and Round-based (Combat/Gymnastics). Every action generates an append-only event or compensating correction.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Back to Match Details',
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
