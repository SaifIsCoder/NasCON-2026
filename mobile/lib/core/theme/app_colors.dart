import 'package:flutter/material.dart';

/// Centralized color palette for LeagueHub.
/// Strict adherence to competition design guidelines:
/// - ZERO purple
/// - ZERO gradients
/// - ZERO neon
/// - Solid, accessible colors with high contrast
class AppColors {
  AppColors._();

  // Core Brand Tokens
  static const Color primaryNavy = Color(0xFF10283F);
  static const Color sportsGreen = Color(0xFF087F65);
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);

  // Typography Tokens
  static const Color primaryText = Color(0xFF334155);
  static const Color secondaryText = Color(0xFF64748B);
  static const Color mutedText = Color(0xFF94A3B8);

  // Structural Tokens
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderSubtle = Color(0xFFF1F5F9);
  static const Color divider = Color(0xFFE2E8F0);

  // Semantic Feedback Tokens
  static const Color error = Color(0xFFDC2626);
  static const Color errorBackground = Color(0xFFFEF2F2);
  static const Color errorBorder = Color(0xFFFECACA);

  static const Color warning = Color(0xFFD97706);
  static const Color warningBackground = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  static const Color information = Color(0xFF2563EB);
  static const Color infoBackground = Color(0xFFEFF6FF);
  static const Color infoBorder = Color(0xFFBFDBFE);

  static const Color success = Color(0xFF087F65);
  static const Color successBackground = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFFBBF7D0);

  static const Color neutral = Color(0xFF64748B);
  static const Color neutralBackground = Color(0xFFF8FAFC);
  static const Color neutralBorder = Color(0xFFE2E8F0);
}

/// ThemeExtension to support future dynamic multi-tenant custom branding
/// (e.g. tenant-specific primary or accent colors) without breaking default design tokens.
@immutable
class TenantBrandTheme extends ThemeExtension<TenantBrandTheme> {
  const TenantBrandTheme({
    this.primaryColor = AppColors.primaryNavy,
    this.accentColor = AppColors.sportsGreen,
    this.tenantName = 'LeagueHub Default',
  });

  final Color primaryColor;
  final Color accentColor;
  final String tenantName;

  @override
  TenantBrandTheme copyWith({
    Color? primaryColor,
    Color? accentColor,
    String? tenantName,
  }) {
    return TenantBrandTheme(
      primaryColor: primaryColor ?? this.primaryColor,
      accentColor: accentColor ?? this.accentColor,
      tenantName: tenantName ?? this.tenantName,
    );
  }

  @override
  TenantBrandTheme lerp(ThemeExtension<TenantBrandTheme>? other, double t) {
    if (other is! TenantBrandTheme) return this;
    return TenantBrandTheme(
      primaryColor: Color.lerp(primaryColor, other.primaryColor, t) ?? primaryColor,
      accentColor: Color.lerp(accentColor, other.accentColor, t) ?? accentColor,
      tenantName: t < 0.5 ? tenantName : other.tenantName,
    );
  }
}
