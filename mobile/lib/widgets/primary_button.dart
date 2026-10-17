import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../core/theme/app_typography.dart';

enum PrimaryButtonVariant {
  primary,
  secondary,
  outlined,
  destructive,
}

/// Standardized button adhering to LeagueHub design rules:
/// - 48dp minimum interactive height
/// - Accessible contrast and semantics
/// - Primary (Sports Green), Secondary (Primary Navy), Outlined (Bordered), Destructive (Error Red)
/// - Clean loading spinner and disabled state handling
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = PrimaryButtonVariant.primary,
    this.isLoading = false,
    this.isEnabled = true,
    this.leadingIcon,
    this.trailingIcon,
    this.isFullWidth = true,
    this.height = AppSpacing.buttonHeight,
    this.semanticLabel,
  });

  final String text;
  final VoidCallback? onPressed;
  final PrimaryButtonVariant variant;
  final bool isLoading;
  final bool isEnabled;
  final Widget? leadingIcon;
  final Widget? trailingIcon;
  final bool isFullWidth;
  final double height;
  final String? semanticLabel;

  bool get _isClickable => isEnabled && !isLoading && onPressed != null;

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color foregroundColor;
    BorderSide? border;

    switch (variant) {
      case PrimaryButtonVariant.primary:
        backgroundColor = AppColors.sportsGreen;
        foregroundColor = Colors.white;
        border = null;
        break;
      case PrimaryButtonVariant.secondary:
        backgroundColor = AppColors.primaryNavy;
        foregroundColor = Colors.white;
        border = null;
        break;
      case PrimaryButtonVariant.outlined:
        backgroundColor = Colors.transparent;
        foregroundColor = AppColors.primaryNavy;
        border = const BorderSide(color: AppColors.border, width: 1.5);
        break;
      case PrimaryButtonVariant.destructive:
        backgroundColor = AppColors.error;
        foregroundColor = Colors.white;
        border = null;
        break;
    }

    if (!_isClickable) {
      if (variant == PrimaryButtonVariant.outlined) {
        foregroundColor = AppColors.mutedText;
        border = const BorderSide(color: AppColors.borderSubtle, width: 1.0);
      } else {
        backgroundColor = AppColors.border;
        foregroundColor = AppColors.mutedText;
      }
    }

    final content = isLoading
        ? SizedBox(
            height: 20.0,
            width: 20.0,
            child: CircularProgressIndicator(
              strokeWidth: 2.0,
              valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
            ),
          )
        : Row(
            mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (leadingIcon != null) ...[
                leadingIcon!,
                const SizedBox(width: AppSpacing.xs),
              ],
              Flexible(
                child: Text(
                  text,
                  style: AppTypography.button.copyWith(color: foregroundColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (trailingIcon != null) ...[
                const SizedBox(width: AppSpacing.xs),
                trailingIcon!,
              ],
            ],
          );

    Widget button = Material(
      color: backgroundColor,
      borderRadius: AppSpacing.buttonBorderRadius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: _isClickable ? onPressed : null,
        borderRadius: AppSpacing.buttonBorderRadius,
        splashColor: Colors.white.withValues(alpha: 0.15),
        highlightColor: Colors.black.withValues(alpha: 0.05),
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: AppSpacing.buttonBorderRadius,
            border: border != null ? Border.fromBorderSide(border) : null,
          ),
          alignment: Alignment.center,
          child: content,
        ),
      ),
    );

    if (isFullWidth) {
      button = SizedBox(width: double.infinity, child: button);
    }

    return Semantics(
      button: true,
      enabled: _isClickable,
      label: semanticLabel ?? text,
      child: button,
    );
  }
}
