import 'package:flutter/material.dart';

/// Standard 8-point grid spacing, radii, and touch target definitions.
class AppSpacing {
  AppSpacing._();

  // Spacing Scale (8-point system)
  static const double xxxs = 2.0;
  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 40.0;
  static const double xxxl = 48.0;
  static const double huge = 64.0;

  // Specific Layout Metrics
  static const double screenHorizontal = md; // 16dp
  static const double screenVertical = md; // 16dp
  static const double cardPadding = md; // 16dp
  static const double sectionSpacing = lg; // 24dp
  static const double itemSpacing = xs; // 8dp
  static const double groupSpacing = sm; // 12dp

  // Interactive Target Dimensions
  static const double minTouchTarget = 48.0;
  static const double buttonHeight = 48.0;
  static const double inputHeight = 48.0;
  static const double iconSizeSmall = 16.0;
  static const double iconSizeMedium = 20.0;
  static const double iconSizeRegular = 24.0;
  static const double iconSizeLarge = 32.0;

  // Corner Radii
  static const double radiusXs = 4.0;
  static const double radiusSm = 8.0;
  static const double radiusInput = 12.0; // 12dp
  static const double radiusCard = 14.0; // 12–16dp range
  static const double radiusCardLg = 16.0;
  static const double radiusFull = 999.0;

  // EdgeInsets Convenience Helpers
  static const EdgeInsets screenPadding = EdgeInsets.symmetric(
    horizontal: screenHorizontal,
    vertical: screenVertical,
  );

  static const EdgeInsets screenHorizontalPadding = EdgeInsets.symmetric(
    horizontal: screenHorizontal,
  );

  static const EdgeInsets cardPaddingAll = EdgeInsets.all(cardPadding);

  static const EdgeInsets inputPadding = EdgeInsets.symmetric(
    horizontal: md,
    vertical: sm,
  );

  static const EdgeInsets buttonPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: sm,
  );

  // Border Radii
  static final BorderRadius inputBorderRadius = BorderRadius.circular(radiusInput);
  static final BorderRadius cardBorderRadius = BorderRadius.circular(radiusCard);
  static final BorderRadius cardLgBorderRadius = BorderRadius.circular(radiusCardLg);
  static final BorderRadius buttonBorderRadius = BorderRadius.circular(radiusInput);
}
