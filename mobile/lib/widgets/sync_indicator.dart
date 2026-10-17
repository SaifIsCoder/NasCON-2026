import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/theme/app_typography.dart';

enum SyncState {
  online,
  offline,
  syncing,
  pending,
  error,
}

/// Sync status indicator adhering to LeagueHub design rules:
/// - Text PLUS Material icon (not color alone, per accessibility guidelines)
/// - Visual states: online, offline, syncing, pending, error
/// - State is strictly supplied by parent (no fake network detection)
/// - Optional onTap to navigate to sync queue
class SyncIndicator extends StatelessWidget {
  const SyncIndicator({
    super.key,
    required this.state,
    this.customLabel,
    this.pendingCount,
    this.onTap,
  });

  final SyncState state;
  final String? customLabel;
  final int? pendingCount;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    IconData icon;
    String defaultLabel;
    Color color;
    Color backgroundColor;
    Color borderColor;

    switch (state) {
      case SyncState.online:
        icon = Icons.cloud_done_outlined;
        defaultLabel = 'Online';
        color = AppColors.sportsGreen;
        backgroundColor = AppColors.successBackground;
        borderColor = AppColors.successBorder;
        break;
      case SyncState.offline:
        icon = Icons.cloud_off_outlined;
        defaultLabel = 'Offline';
        color = AppColors.secondaryText;
        backgroundColor = AppColors.neutralBackground;
        borderColor = AppColors.neutralBorder;
        break;
      case SyncState.syncing:
        icon = Icons.sync_outlined;
        defaultLabel = 'Syncing...';
        color = AppColors.information;
        backgroundColor = AppColors.infoBackground;
        borderColor = AppColors.infoBorder;
        break;
      case SyncState.pending:
        icon = Icons.cloud_upload_outlined;
        defaultLabel = pendingCount != null
            ? '$pendingCount Pending'
            : 'Pending Sync';
        color = AppColors.warning;
        backgroundColor = AppColors.warningBackground;
        borderColor = AppColors.warningBorder;
        break;
      case SyncState.error:
        icon = Icons.error_outline;
        defaultLabel = 'Sync Failed';
        color = AppColors.error;
        backgroundColor = AppColors.errorBackground;
        borderColor = AppColors.errorBorder;
        break;
    }

    final label = customLabel ?? defaultLabel;

    Widget indicator = Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xxs,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: borderColor, width: 1.0),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: AppSpacing.iconSizeSmall,
            color: color,
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            label,
            style: AppTypography.badge.copyWith(color: color),
          ),
        ],
      ),
    );

    if (onTap != null) {
      indicator = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        child: indicator,
      );
    }

    return Semantics(
      label: 'Sync Status: $label',
      button: onTap != null,
      child: indicator,
    );
  }
}
