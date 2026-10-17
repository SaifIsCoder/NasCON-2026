import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';

/// Standardized card container adhering to LeagueHub design rules:
/// - Flat surface with 1px border
/// - Standard 12-16dp corner radius
/// - 8-point internal padding
/// - Zero excessive shadows or glassmorphism
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = AppSpacing.cardPaddingAll,
    this.margin,
    this.onTap,
    this.borderColor,
    this.backgroundColor,
    this.borderRadius,
    this.semanticLabel,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? borderColor;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final effectiveRadius = borderRadius ?? AppSpacing.cardBorderRadius;
    final effectiveBorder = Border.all(
      color: borderColor ?? AppColors.border,
      width: 1.0,
    );

    Widget content = Container(
      padding: padding,
      child: child,
    );

    if (onTap != null) {
      content = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: effectiveRadius,
          splashColor: AppColors.sportsGreen.withValues(alpha: 0.08),
          highlightColor: AppColors.borderSubtle,
          child: content,
        ),
      );
    }

    Widget card = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.surface,
        borderRadius: effectiveRadius,
        border: effectiveBorder,
      ),
      clipBehavior: Clip.antiAlias,
      child: content,
    );

    if (semanticLabel != null) {
      card = Semantics(
        label: semanticLabel,
        button: onTap != null,
        child: card,
      );
    }

    return card;
  }
}
