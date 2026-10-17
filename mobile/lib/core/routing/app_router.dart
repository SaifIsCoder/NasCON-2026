import 'package:flutter/material.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/clubs/club_profile_screen.dart';
import '../../screens/main_navigation_shell.dart';
import '../../screens/matches/match_detail_screen.dart';
import '../../screens/roster/roster_management_screen.dart';
import '../../screens/scoring/scoring_entry_screen.dart';
import '../../screens/store/cart_checkout_screen.dart';
import '../../screens/store/product_detail_screen.dart';
import '../../screens/store/receipt_screen.dart';
import '../../screens/sync/sync_queue_screen.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/error_state.dart';
import '../constants/app_constants.dart';

/// Single source of truth for application routing.
class AppRouter {
  AppRouter._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppConstants.routeRoot:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 0),
        );

      case AppConstants.routeFixtures:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 0),
        );

      case AppConstants.routeStandings:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 1),
        );

      case AppConstants.routeClubs:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 2),
        );

      case AppConstants.routeStore:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 3),
        );

      case AppConstants.routeProfile:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MainNavigationShell(initialIndex: 4),
        );

      case AppConstants.routeLogin:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const LoginScreen(),
        );

      case AppConstants.routeMatchDetail:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const MatchDetailScreen(),
        );

      case AppConstants.routeClubProfile:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const ClubProfileScreen(),
        );

      case AppConstants.routeProductDetail:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const ProductDetailScreen(),
        );

      case AppConstants.routeCartCheckout:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const CartCheckoutScreen(),
        );

      case AppConstants.routeReceipt:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const ReceiptScreen(),
        );

      case AppConstants.routeRosterManagement:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const RosterManagementScreen(),
        );

      case AppConstants.routeScoringEntry:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const ScoringEntryScreen(),
        );

      case AppConstants.routeSyncQueue:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => const SyncQueueScreen(),
        );

      default:
        return MaterialPageRoute(
          settings: settings,
          builder: (_) => AppScaffold(
            title: 'Not Found',
            body: ErrorState(
              title: 'Route Not Found',
              message: 'No route configured for path: ${settings.name}',
              onRetry: () {},
              retryButtonText: 'Back to Home',
            ),
          ),
        );
    }
  }
}
