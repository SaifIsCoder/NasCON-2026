import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Store Tab - Development Placeholder for Phase 1.
/// Official merchandise catalogue, concurrency-safe checkout, and receipts.
class StoreScreen extends StatelessWidget {
  const StoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.screenPadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Official Merchandise Store',
            subtitle: 'Club gear, official kits, and tournament memorabilia',
          ),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: const [
                    StatusBadge(
                      label: 'Phase 1 Foundation',
                      type: StatusBadgeType.information,
                      icon: Icons.storefront_outlined,
                    ),
                    StatusBadge(
                      label: 'Inventory Safe',
                      type: StatusBadgeType.success,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Merchandise & Checkout Engine',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Supports product sizing variants, scheduled discount windows, atomic stock reservations to prevent overselling, and HMAC-verified digital receipts.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'View Product Detail Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.inventory_2_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeProductDetail);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'View Cart & Checkout Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.shopping_cart_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeCartCheckout);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'View Receipt Route',
                  variant: PrimaryButtonVariant.outlined,
                  leadingIcon: const Icon(
                    Icons.receipt_long_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.primaryNavy,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppConstants.routeReceipt);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
