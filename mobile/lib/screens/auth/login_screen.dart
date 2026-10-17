import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/status_badge.dart';

/// Authentication Screen - Architecture & UI Foundation for Phase 1.
/// Real JWT authentication & role negotiation will be wired in Phase 2.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Sign In',
      scrollable: true,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: const [
                    StatusBadge(
                      label: 'RBAC Foundation',
                      type: StatusBadgeType.information,
                      icon: Icons.security_outlined,
                    ),
                    StatusBadge(
                      label: 'Phase 1',
                      type: StatusBadgeType.warning,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'LeagueHub Operations Access',
                  style: AppTypography.pageHeading.copyWith(fontSize: 20),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Multi-tenant authentication gateway supporting Super-Admin, League Organizer, Club Manager, Player, and Viewer credentials.',
                  style: AppTypography.bodySmall,
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  controller: _emailController,
                  labelText: 'Email Address',
                  hintText: 'e.g. manager@nascon.test',
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: const Icon(
                    Icons.email_outlined,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  controller: _passwordController,
                  labelText: 'Password',
                  hintText: 'Enter your password',
                  isPassword: true,
                  prefixIcon: const Icon(
                    Icons.lock_outline,
                    size: AppSpacing.iconSizeMedium,
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(
                  text: 'Authenticate (Phase 2)',
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Backend authentication will be activated in Phase 2.',
                        ),
                        backgroundColor: AppColors.primaryNavy,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                PrimaryButton(
                  text: 'Return to League Dashboard',
                  variant: PrimaryButtonVariant.outlined,
                  onPressed: () {
                    Navigator.of(context).pushReplacementNamed(
                      AppConstants.routeRoot,
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Seeded Test Roles (Specification Section 8.3):',
            style: AppTypography.labelMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '• Platform Super-Admin: admin@nascon.test\n'
            '• League Organizer: organizer@nascon.test\n'
            '• Club Manager: manager@nascon.test\n'
            '• Player: player@nascon.test\n'
            '• General Viewer: viewer@nascon.test',
            style: AppTypography.caption.copyWith(height: 1.5),
          ),
        ],
      ),
    );
  }
}
