import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Centralized typography styles for LeagueHub.
/// Built strictly to specification:
/// - Page headings: 24sp, bold
/// - Section headings: 18sp, semibold
/// - Card titles: 16sp, semibold
/// - Body text: 14–16sp
/// - Labels: 12–13sp
/// - Captions: 12sp
/// - Consistent weights, line heights, accessible contrast
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';
  static const List<String> fontFallback = ['Roboto', 'sans-serif'];

  // Headings
  static const TextStyle pageHeading = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 24.0,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.3,
    color: AppColors.primaryText,
  );

  static const TextStyle sectionHeading = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 18.0,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.35,
    color: AppColors.primaryText,
  );

  static const TextStyle cardTitle = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 16.0,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.4,
    color: AppColors.primaryText,
  );

  // Body Text
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 16.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.0,
    height: 1.5,
    color: AppColors.primaryText,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 14.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.0,
    height: 1.45,
    color: AppColors.primaryText,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 13.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.0,
    height: 1.4,
    color: AppColors.secondaryText,
  );

  // Labels
  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 14.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.3,
    color: AppColors.primaryText,
  );

  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 13.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.3,
    color: AppColors.primaryText,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 12.0,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    height: 1.3,
    color: AppColors.secondaryText,
  );

  // Caption
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 12.0,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.1,
    height: 1.35,
    color: AppColors.secondaryText,
  );

  // Buttons & Badges
  static const TextStyle button = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 14.0,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    height: 1.2,
  );

  static const TextStyle badge = TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: fontFallback,
    fontSize: 12.0,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    height: 1.2,
  );

  /// Material 3 TextTheme mapped with the typography specification
  static TextTheme textTheme = const TextTheme(
    headlineLarge: pageHeading,
    headlineMedium: TextStyle(
      fontFamily: fontFamily,
      fontFamilyFallback: fontFallback,
      fontSize: 20.0,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
      height: 1.3,
      color: AppColors.primaryText,
    ),
    headlineSmall: sectionHeading,
    titleLarge: sectionHeading,
    titleMedium: cardTitle,
    titleSmall: TextStyle(
      fontFamily: fontFamily,
      fontFamilyFallback: fontFallback,
      fontSize: 15.0,
      fontWeight: FontWeight.w600,
      color: AppColors.primaryText,
    ),
    bodyLarge: bodyLarge,
    bodyMedium: bodyMedium,
    bodySmall: bodySmall,
    labelLarge: labelLarge,
    labelMedium: labelMedium,
    labelSmall: labelSmall,
  );
}
