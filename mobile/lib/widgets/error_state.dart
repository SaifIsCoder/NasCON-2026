import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/theme/app_typography.dart';
import 'primary_button.dart';

/// Standardized error presentation adhering to LeagueHub design rules:
/// - Material outlined error icon (zero emojis)
/// - Clear title and error message
/// - Optional retry action with PrimaryButton
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    this.title = 'An Error Occurred',
    required this.message,
    this.onRetry,
    this.retryButtonText = 'Try Again',
    this.padding = AppSpacing.cardPaddingAll,
  });

  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String retryButtonText;
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
                color: AppColors.errorBackground,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                size: 32.0,
                color: AppColors.error,
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
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                text: retryButtonText,
                onPressed: onRetry,
                isFullWidth: false,
                variant: PrimaryButtonVariant.outlined,
                leadingIcon: const Icon(
                  Icons.refresh_outlined,
                  size: AppSpacing.iconSizeMedium,
                  color: AppColors.primaryNavy,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
