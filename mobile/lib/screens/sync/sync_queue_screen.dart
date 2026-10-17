import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/sync_indicator.dart';

/// Sync Queue Screen - Development Placeholder for Phase 1.
/// Displays offline mutation queue and sync engine state.
class SyncQueueScreen extends StatelessWidget {
  const SyncQueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Sync Queue & Offline State',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Offline Sync Engine',
            subtitle: 'Local mutation queue with deterministic replay',
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
                    SyncIndicator(state: SyncState.online),
                    StatusBadge(
                      label: 'NFR-4 Ready',
                      type: StatusBadgeType.success,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Deterministic Conflict Resolution',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Offline-first architecture buffers match events, scoring adjustments, and roster transactions into a local SQLite queue and replays them atomically upon network re-connection.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          const SectionHeader(
            title: 'Queued Actions',
            subtitle: 'Zero pending mutations in current baseline state',
          ),
          const SizedBox(height: AppSpacing.md),
          const EmptyState(
            icon: Icons.cloud_done_outlined,
            title: 'Queue Synchronized',
            message: 'All local changes have been synchronized with the LeagueHub backend cluster.',
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            text: 'Return to Operations Dashboard',
            variant: PrimaryButtonVariant.outlined,
            onPressed: () {
              Navigator.of(context).maybePop();
            },
          ),
        ],
      ),
    );
  }
}
