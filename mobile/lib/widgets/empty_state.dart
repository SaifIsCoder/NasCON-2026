import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/theme/app_typography.dart';
import 'primary_button.dart';

/// Standardized empty state presentation adhering to LeagueHub design rules:
/// - Material outlined icon (zero emojis)
/// - Clear title and contextual explanation
/// - Optional primary action button
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.actionText,
    this.onAction,
    this.padding = AppSpacing.cardPaddingAll,
  });

  final String title;
  final String message;
  final IconData icon;
  final String? actionText;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 56.0,
              height: 56.0,
              decoration: const BoxDecoration(
                color: AppColors.neutralBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 32.0,
                color: AppColors.secondaryText,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: AppTypography.cardTitle.copyWith(
                color: AppColors.primaryText,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Text(
                message,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.secondaryText,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                text: actionText!,
                onPressed: onAction,
                isFullWidth: false,
                variant: PrimaryButtonVariant.primary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
