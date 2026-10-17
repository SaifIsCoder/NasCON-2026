import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/section_header.dart';
import '../../widgets/status_badge.dart';

/// Cart & Checkout Screen - Development Placeholder for Phase 1.
class CartCheckoutScreen extends StatelessWidget {
  const CartCheckoutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Cart & Checkout',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Order Summary & Gateway',
            subtitle: 'Concurrency-safe inventory reservation',
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
                      label: 'Atomic Hold',
                      type: StatusBadgeType.warning,
                      icon: Icons.lock_clock_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1 Placeholder',
                      type: StatusBadgeType.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'High-Concurrency Checkout Gate',
                  style: AppTypography.cardTitle,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Adheres to NFR-3: When 20 simultaneous buyers attempt to purchase the last unit, exactly 1 succeeds with 0 negative inventory.',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'View Digital Receipt Route',
                  variant: PrimaryButtonVariant.primary,
                  leadingIcon: const Icon(
                    Icons.receipt_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    Navigator.of(context).pushNamed(
                      AppConstants.routeReceipt,
                    );
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
