import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/theme/app_typography.dart';

enum StatusBadgeType {
  success,
  warning,
  error,
  information,
  neutral,
}

enum StatusBadgeStyle {
  tinted,
  solid,
}

/// Standardized status badge adhering to LeagueHub design rules:
/// - Success (Sports Green), Warning (Amber), Error (Red), Information (Blue), Neutral (Slate)
/// - Tinted (light background with saturated text) or Solid style
/// - Optional outlined icon or status dot
/// - Guaranteed accessible contrast
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.type = StatusBadgeType.neutral,
    this.style = StatusBadgeStyle.tinted,
    this.icon,
    this.showDot = false,
  });

  final String label;
  final StatusBadgeType type;
  final StatusBadgeStyle style;
  final IconData? icon;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color foregroundColor;
    Color borderColor;

    switch (type) {
      case StatusBadgeType.success:
        if (style == StatusBadgeStyle.tinted) {
          backgroundColor = AppColors.successBackground;
          foregroundColor = AppColors.sportsGreen;
          borderColor = AppColors.successBorder;
        } else {
          backgroundColor = AppColors.sportsGreen;
          foregroundColor = Colors.white;
          borderColor = AppColors.sportsGreen;
        }
        break;
      case StatusBadgeType.warning:
        if (style == StatusBadgeStyle.tinted) {
          backgroundColor = AppColors.warningBackground;
          foregroundColor = AppColors.warning;
          borderColor = AppColors.warningBorder;
        } else {
          backgroundColor = AppColors.warning;
          foregroundColor = Colors.white;
          borderColor = AppColors.warning;
        }
        break;
      case StatusBadgeType.error:
        if (style == StatusBadgeStyle.tinted) {
          backgroundColor = AppColors.errorBackground;
          foregroundColor = AppColors.error;
          borderColor = AppColors.errorBorder;
        } else {
          backgroundColor = AppColors.error;
          foregroundColor = Colors.white;
          borderColor = AppColors.error;
        }
        break;
      case StatusBadgeType.information:
        if (style == StatusBadgeStyle.tinted) {
          backgroundColor = AppColors.infoBackground;
          foregroundColor = AppColors.information;
          borderColor = AppColors.infoBorder;
        } else {
          backgroundColor = AppColors.information;
          foregroundColor = Colors.white;
          borderColor = AppColors.information;
        }
        break;
      case StatusBadgeType.neutral:
        if (style == StatusBadgeStyle.tinted) {
          backgroundColor = AppColors.neutralBackground;
          foregroundColor = AppColors.neutral;
          borderColor = AppColors.neutralBorder;
        } else {
          backgroundColor = AppColors.neutral;
          foregroundColor = Colors.white;
          borderColor = AppColors.neutral;
        }
        break;
    }

    return Container(
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
          if (showDot) ...[
            Container(
              width: 6.0,
              height: 6.0,
              decoration: BoxDecoration(
                color: foregroundColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
          ] else if (icon != null) ...[
            Icon(
              icon,
              size: AppSpacing.iconSizeSmall,
              color: foregroundColor,
            ),
            const SizedBox(width: AppSpacing.xxs),
          ],
          Text(
            label,
            style: AppTypography.badge.copyWith(color: foregroundColor),
          ),
        ],
      ),
    );
  }
}
