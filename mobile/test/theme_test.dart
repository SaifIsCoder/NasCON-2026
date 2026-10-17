import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nascon_mobile/core/theme/app_colors.dart';
import 'package:nascon_mobile/core/theme/app_spacing.dart';
import 'package:nascon_mobile/core/theme/app_theme.dart';
import 'package:nascon_mobile/core/theme/app_typography.dart';

void main() {
  group('LeagueHub Theme & Color Tokens Verification', () {
    test('AppColors strict token verification', () {
      expect(AppColors.primaryNavy, const Color(0xFF10283F));
      expect(AppColors.sportsGreen, const Color(0xFF087F65));
      expect(AppColors.background, const Color(0xFFF5F7FA));
      expect(AppColors.surface, const Color(0xFFFFFFFF));
      expect(AppColors.primaryText, const Color(0xFF334155));
      expect(AppColors.secondaryText, const Color(0xFF64748B));
      expect(AppColors.border, const Color(0xFFE2E8F0));
      expect(AppColors.error, const Color(0xFFDC2626));
      expect(AppColors.warning, const Color(0xFFD97706));
      expect(AppColors.information, const Color(0xFF2563EB));
    });

    test('Zero purple verification across all color tokens', () {
      final colorTokens = [
        AppColors.primaryNavy,
        AppColors.sportsGreen,
        AppColors.background,
        AppColors.surface,
        AppColors.primaryText,
        AppColors.secondaryText,
        AppColors.mutedText,
        AppColors.border,
        AppColors.borderSubtle,
        AppColors.divider,
        AppColors.error,
        AppColors.warning,
        AppColors.information,
        AppColors.success,
        AppColors.neutral,
      ];

      for (final color in colorTokens) {
        // Deep purple / purple range check in HSL
        final hsl = HSLColor.fromColor(color);
        final hue = hsl.hue;
        final saturation = hsl.saturation;
        // Purple is around hue 270-320 with noticeable saturation
        if (saturation > 0.2) {
          final isPurple = hue >= 260 && hue <= 320;
          expect(
            isPurple,
            isFalse,
            reason: 'Token $color has hue $hue which is in purple range',
          );
        }
      }
    });

    test('AppTheme Material 3 configuration', () {
      final theme = AppTheme.lightTheme;
      expect(theme.useMaterial3, isTrue);
      expect(theme.scaffoldBackgroundColor, AppColors.background);
      expect(theme.colorScheme.primary, AppColors.primaryNavy);
      expect(theme.colorScheme.secondary, AppColors.sportsGreen);
      expect(theme.colorScheme.surface, AppColors.surface);
      expect(theme.colorScheme.onSurface, AppColors.primaryText);
      expect(theme.colorScheme.error, AppColors.error);

      // Verify flat design (zero excessive shadows)
      expect(theme.appBarTheme.elevation, 0.0);
      expect(theme.cardTheme.elevation, 0.0);
    });

    test('AppTypography specifications', () {
      expect(AppTypography.pageHeading.fontSize, 24.0);
      expect(AppTypography.pageHeading.fontWeight, FontWeight.w700);
      expect(AppTypography.sectionHeading.fontSize, 18.0);
      expect(AppTypography.sectionHeading.fontWeight, FontWeight.w600);
      expect(AppTypography.cardTitle.fontSize, 16.0);
      expect(AppTypography.cardTitle.fontWeight, FontWeight.w600);
      expect(AppTypography.bodyLarge.fontSize, 16.0);
      expect(AppTypography.bodyMedium.fontSize, 14.0);
      expect(AppTypography.bodySmall.fontSize, 13.0);
      expect(AppTypography.labelMedium.fontSize, 13.0);
      expect(AppTypography.caption.fontSize, 12.0);
    });

    test('AppSpacing 8-point metrics', () {
      expect(AppSpacing.screenHorizontal, 16.0);
      expect(AppSpacing.cardPadding, 16.0);
      expect(AppSpacing.sectionSpacing, 24.0);
      expect(AppSpacing.buttonHeight, 48.0);
      expect(AppSpacing.minTouchTarget, 48.0);
      expect(AppSpacing.radiusInput, 12.0);
      expect(AppSpacing.radiusCard, 14.0);
    });

    test('TenantBrandTheme extension support for white-labeling', () {
      const defaultTenant = TenantBrandTheme();
      expect(defaultTenant.primaryColor, AppColors.primaryNavy);
      expect(defaultTenant.accentColor, AppColors.sportsGreen);

      final customTenant = defaultTenant.copyWith(
        primaryColor: const Color(0xFF1E293B),
        tenantName: 'Tenant Alpha',
      );
      expect(customTenant.primaryColor, const Color(0xFF1E293B));
      expect(customTenant.tenantName, 'Tenant Alpha');
      expect(customTenant.accentColor, AppColors.sportsGreen);
    });
  });
}
